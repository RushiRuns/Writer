import React, { useState, useEffect, useRef } from 'react';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { VaultIndex, DrawingEntry } from '../../../shared/ipc-types';
import DrawingContextMenu from './DrawingContextMenu';
import ConfirmationModal from '../ui/ConfirmationModal';
import styles from './DrawingView.module.css';
import { 
  Plus, 
  Search, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Save,
  Download,
  AlertTriangle
} from 'lucide-react';

interface DrawingViewProps {
  index: VaultIndex;
  _vaultPath: string;
}

export default function DrawingView({ index, _vaultPath }: DrawingViewProps) {
  const [selectedDrawing, setSelectedDrawing] = useState<DrawingEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [drawingName, setDrawingName] = useState('');
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [initialData, setInitialData] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showOldStrokesWarning, setShowOldStrokesWarning] = useState(false);

  // Context Menu and Rename/Delete states
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; drawing: DrawingEntry } | null>(null);
  const [renamingDrawing, setRenamingDrawing] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [drawingToDelete, setDrawingToDelete] = useState<DrawingEntry | null>(null);

  // Save feedback state
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | 'saving' | null; message: string }>({
    type: null,
    message: ''
  });

  const lastSavedElementsRef = useRef<string>('');
  const lastSavedNameRef = useRef<string>('');
  const currentSceneRef = useRef<{ elements: any[]; appState: any; files: any }>({ elements: [], appState: {}, files: {} });
  const autoSaveTimerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to serialize key properties of elements for structural change detection
  const serializeElements = (elements: readonly any[]) => {
    if (!elements) return '';
    return JSON.stringify(
      elements
        .filter(el => !el.isDeleted)
        .map(el => ({
          id: el.id,
          version: el.version,
          type: el.type,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          angle: el.angle,
          strokeColor: el.strokeColor,
          backgroundColor: el.backgroundColor,
          fillStyle: el.fillStyle,
          strokeWidth: el.strokeWidth,
          strokeStyle: el.strokeStyle,
          roughness: el.roughness,
          opacity: el.opacity,
          text: el.text,
          fontSize: el.fontSize,
          fontFamily: el.fontFamily,
          textAlign: el.textAlign,
          verticalAlign: el.verticalAlign,
          points: el.points
        }))
    );
  };

  // Load custom libraries on startup/API initialization
  useEffect(() => {
    if (!excalidrawAPI) return;
    const loadLibraries = async () => {
      try {
        const libs = await (window as any).wrriter.getLibraries();
        if (libs && libs.length > 0) {
          excalidrawAPI.updateLibrary({
            libraryItems: libs,
            merge: true
          });
        }
      } catch (err) {
        console.error('Failed to load Excalidraw libraries:', err);
      }
    };
    loadLibraries();
  }, [excalidrawAPI]);

  // Handle library changes in Excalidraw
  const handleLibraryChange = async (items: any[]) => {
    try {
      await (window as any).wrriter.saveLibraries(items);
    } catch (err) {
      console.error('Failed to persist library items:', err);
    }
  };

  // Trigger library file import dialog
  const handleLibraryImportClick = () => {
    fileInputRef.current?.click();
  };

  // Import community libraries from file
  const handleLibraryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result as string);
        const libraryItems = json.library || json.libraryItems || json;
        if (Array.isArray(libraryItems) && excalidrawAPI) {
          excalidrawAPI.updateLibrary({
            libraryItems,
            merge: true,
            prompt: true
          });
        } else {
          alert('Invalid Excalidraw library format.');
        }
      } catch (err) {
        console.error('Failed to parse Excalidraw library:', err);
        alert('Failed to parse the library file. Ensure it is a valid .excalidrawlib JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // Handle selected drawing changes - load elements from JSON file
  useEffect(() => {
    if (selectedDrawing) {
      const loadDrawingData = async () => {
        try {
          setIsLoaded(false);
          setShowOldStrokesWarning(false);
          setSaveStatus({ type: 'saving', message: 'Loading drawing...' });
          const res = await (window as any).wrriter.loadDrawing(selectedDrawing.name);
          setSaveStatus({ type: null, message: '' });
          
          if (res) {
            setDrawingName(selectedDrawing.name);
            
            let loadedElements = res.elements || [];
            let loadedAppState = { ...res.appState } || {};
            let loadedFiles = res.files || {};
            
            if (res.isOldStrokes) {
              setShowOldStrokesWarning(true);
              loadedElements = [];
              loadedAppState = {};
              loadedFiles = {};
            }
            
            // Delete collaborators which gets serialized as plain object {} and crashes Excalidraw
            if (loadedAppState.collaborators) {
              delete loadedAppState.collaborators;
            }
            
            currentSceneRef.current = {
              elements: loadedElements,
              appState: loadedAppState,
              files: loadedFiles
            };
            
            const elementsStr = serializeElements(loadedElements);
            lastSavedElementsRef.current = elementsStr;
            lastSavedNameRef.current = selectedDrawing.name;
            
            setInitialData({
              elements: loadedElements,
              appState: {
                ...loadedAppState,
                theme: 'dark'
              },
              files: loadedFiles
            });
          } else {
            setDrawingName(selectedDrawing.name);
            currentSceneRef.current = { elements: [], appState: {}, files: {} };
            lastSavedElementsRef.current = '';
            lastSavedNameRef.current = selectedDrawing.name;
            setInitialData({ elements: [], appState: { theme: 'dark' }, files: {} });
          }
          setIsLoaded(true);
        } catch (err) {
          console.error('Failed to load drawing:', err);
          setSaveStatus({ type: 'error', message: 'Failed to load drawing data' });
          setDrawingName(selectedDrawing.name);
          setInitialData({ elements: [], appState: { theme: 'dark' }, files: {} });
          setIsLoaded(true);
        }
      };
      loadDrawingData();
    } else {
      setDrawingName('');
      currentSceneRef.current = { elements: [], appState: {}, files: {} };
      lastSavedElementsRef.current = '';
      lastSavedNameRef.current = '';
      setInitialData({ elements: [], appState: { theme: 'dark' }, files: {} });
      setIsLoaded(true);
      setShowOldStrokesWarning(false);
    }
  }, [selectedDrawing]);

  // Excalidraw change handler
  const handleSceneChange = (elements: readonly any[], appState: any, files: any) => {
    currentSceneRef.current = {
      elements: [...elements],
      appState,
      files
    };
    triggerAutoSave();
  };

  // Debounced auto-save triggering
  const triggerAutoSave = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      autoSave();
    }, 2000);
  };

  // Auto-save logic
  const autoSave = async () => {
    const scene = currentSceneRef.current;
    if (!scene || !scene.elements) return;
    
    const elementsStr = serializeElements(scene.elements);
    const nameToSave = drawingName.trim() || 'Untitled Sketch';
    
    if (elementsStr === lastSavedElementsRef.current && nameToSave === lastSavedNameRef.current) {
      return;
    }
    
    await saveDrawing(nameToSave, scene.elements, scene.appState, scene.files, elementsStr);
  };

  // Core drawing saving routine (saves PNG + JSON toAttachments)
  const saveDrawing = async (nameToSave: string, elements: any[], appState: any, files: any, elementsStr: string) => {
    try {
      setSaveStatus({ type: 'saving', message: 'Saving...' });
      
      const cleanAppState = { ...appState };
      if (cleanAppState.collaborators) {
        delete cleanAppState.collaborators;
      }
      
      const blob = await exportToBlob({
        elements: elements.filter(el => !el.isDeleted),
        appState: {
          ...cleanAppState,
          exportWithDarkMode: true
        },
        files,
        mimeType: 'image/png'
      });
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const pngBase64 = reader.result as string;
        const res = await (window as any).wrriter.saveDrawing(nameToSave, elements, cleanAppState, files, pngBase64);
        if (res.success) {
          lastSavedElementsRef.current = elementsStr;
          lastSavedNameRef.current = nameToSave;
          setSaveStatus({ type: 'success', message: 'Auto-saved' });
          setTimeout(() => {
            setSaveStatus(prev => prev.message === 'Auto-saved' ? { type: null, message: '' } : prev);
          }, 2000);
        } else {
          setSaveStatus({ type: 'error', message: res.error || 'Save failed' });
        }
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus({ type: 'error', message: String(err) });
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDrawingName(e.target.value);
    triggerAutoSave();
  };

  const handleNewDrawing = () => {
    setSelectedDrawing(null);
    setDrawingName('Untitled Sketch');
    currentSceneRef.current = { elements: [], appState: {}, files: {} };
    lastSavedElementsRef.current = '';
    lastSavedNameRef.current = 'Untitled Sketch';
    setInitialData({ elements: [], appState: { theme: 'dark' }, files: {} });
    setSaveStatus({ type: null, message: '' });
    setShowOldStrokesWarning(false);
  };

  const handleSaveDrawing = async () => {
    const scene = currentSceneRef.current;
    if (!scene || !scene.elements) return;
    const nameToSave = drawingName.trim() || 'Untitled Sketch';
    const elementsStr = serializeElements(scene.elements);
    await saveDrawing(nameToSave, scene.elements, scene.appState, scene.files, elementsStr);
  };

  const handleRenameSubmit = async (oldName: string) => {
    const newName = renameText.trim();
    if (!newName || newName === oldName) {
      setRenamingDrawing(null);
      return;
    }

    try {
      const res = await (window as any).wrriter.renameDrawing(oldName, newName);
      if (res.success) {
        if (selectedDrawing && selectedDrawing.name === oldName) {
          setSelectedDrawing({
            ...selectedDrawing,
            name: newName
          });
        }
      } else {
        alert(res.error || 'Failed to rename sketch');
      }
    } catch (err) {
      console.error('Failed to rename drawing:', err);
    } finally {
      setRenamingDrawing(null);
    }
  };

  const handleDuplicateDrawing = async (drawing: DrawingEntry) => {
    try {
      const res = await (window as any).wrriter.duplicateDrawing(drawing.name);
      if (!res.success) {
        alert(res.error || 'Failed to duplicate sketch');
      }
    } catch (err) {
      console.error('Failed to duplicate drawing:', err);
    }
  };

  const handleConfirmDeleteDrawing = async () => {
    if (!drawingToDelete) return;
    try {
      const res = await (window as any).wrriter.deleteDrawing(drawingToDelete.name);
      if (res.success) {
        if (selectedDrawing && selectedDrawing.name === drawingToDelete.name) {
          setSelectedDrawing(null);
        }
      } else {
        alert(res.error || 'Failed to delete sketch');
      }
    } catch (err) {
      console.error('Failed to delete drawing:', err);
    } finally {
      setDrawingToDelete(null);
    }
  };

  // Filter drawings list by search query
  const filteredDrawings = index.drawings.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className={styles.container}>
      {/* Drawings List Sidebar */}
      <div className={styles.sidebar}>
        {/* Header Actions */}
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>Drawings</span>
          <div className={styles.sidebarActions}>
            <button
              onClick={handleLibraryImportClick}
              className={styles.importLibraryBtn}
              title="Import Excalidraw Library (.excalidrawlib)"
            >
              <Download size={14} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".excalidrawlib"
              onChange={handleLibraryFileChange}
              style={{ display: 'none' }}
            />
            <button
              onClick={handleNewDrawing}
              className={styles.newSketchBtn}
              title="New Sketch"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className={styles.searchContainer}>
          <div className={styles.searchInputWrapper}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search drawings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Drawings Scrollable List */}
        <div className={styles.drawingsList}>
          {filteredDrawings.length === 0 ? (
            <div className={styles.emptyState}>
              No sketches found
            </div>
          ) : (
            filteredDrawings.map((drawing) => {
              const isSelected = selectedDrawing?.name === drawing.name;
              return (
                <div
                  key={drawing.name}
                  onClick={() => setSelectedDrawing(drawing)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      drawing
                    });
                  }}
                  className={`${styles.drawingItem} ${isSelected ? styles.drawingItemActive : ''}`}
                >
                  <div className={styles.drawingIcon}>
                    <ImageIcon size={14} />
                  </div>
                  {renamingDrawing === drawing.name ? (
                    <input
                      type="text"
                      value={renameText}
                      onChange={(e) => setRenameText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit(drawing.name);
                        if (e.key === 'Escape') setRenamingDrawing(null);
                      }}
                      onBlur={() => handleRenameSubmit(drawing.name)}
                      className={styles.renameInput}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className={`${styles.drawingName} ${isSelected ? styles.drawingNameActive : ''}`}>
                      {drawing.name}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Drawing Pad Workspace */}
      <div className={styles.mainWorkspace}>
        <div className={styles.canvasEditor}>
          {/* Header Controls Bar */}
          <div className={styles.editorHeader}>
            <div className={styles.titleInputWrapper}>
              <input
                type="text"
                placeholder="Sketch Name"
                value={drawingName}
                onChange={handleNameChange}
                className={styles.titleInput}
              />
              {showOldStrokesWarning && (
                <div 
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-brand-amber)', fontSize: '0.75rem', fontWeight: 500 }}
                  title="This is an old format drawing and cannot be loaded as editable shapes. Re-draw or preserve it as is."
                >
                  <AlertTriangle size={14} />
                  <span>Legacy drawing (Read-Only preview remains)</span>
                </div>
              )}
            </div>

            {/* Status indicators */}
            <div className={styles.statusContainer}>
              {saveStatus.type === 'saving' && (
                <span className={styles.savingText}>Saving...</span>
              )}
              {saveStatus.type === 'success' && (
                <div className={styles.successText}>
                  <CheckCircle2 size={12} />
                  <span>Saved</span>
                </div>
              )}
              {saveStatus.type === 'error' && (
                <div className={styles.errorText} title={saveStatus.message}>
                  <AlertCircle size={12} />
                  <span>Error</span>
                </div>
              )}

              <button
                onClick={handleSaveDrawing}
                disabled={!drawingName.trim()}
                className={styles.saveButton}
              >
                <Save size={13} />
                <span>Save Sketch</span>
              </button>
            </div>
          </div>

          {/* Excalidraw Area */}
          {isLoaded && (
            <div className={styles.excalidrawContainer}>
              <Excalidraw
                key={selectedDrawing?.name ?? 'new'}
                excalidrawAPI={(api) => setExcalidrawAPI(api)}
                initialData={initialData ?? { elements: [], appState: { theme: 'dark' }, files: {} }}
                onChange={handleSceneChange}
                onLibraryChange={handleLibraryChange}
                theme="dark"
                UIOptions={{
                  canvasActions: {
                    saveToActiveFile: false,
                    export: false,
                    loadScene: false,
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Drawing List Context Menu */}
      {contextMenu && (
        <DrawingContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onRename={() => {
            setRenamingDrawing(contextMenu.drawing.name);
            setRenameText(contextMenu.drawing.name);
          }}
          onDuplicate={() => handleDuplicateDrawing(contextMenu.drawing)}
          onDelete={() => setDrawingToDelete(contextMenu.drawing)}
        />
      )}

      {/* Delete Drawing Confirmation Modal */}
      <ConfirmationModal
        isOpen={drawingToDelete !== null}
        title="Delete Sketch"
        message={`Are you sure you want to delete the sketch "${drawingToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Sketch"
        cancelText="Cancel"
        onConfirm={handleConfirmDeleteDrawing}
        onCancel={() => setDrawingToDelete(null)}
        isDangerous={true}
      />
    </div>
  );
}
