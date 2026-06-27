import React, { useState, useEffect, useRef } from 'react';
import { VaultIndex, DrawingEntry, Stroke } from '../../../shared/ipc-types';
import { useCanvas } from '../../hooks/useCanvas';
import CanvasReplayer from './CanvasReplayer';
import styles from './DrawingView.module.css';
import { 
  PenTool, 
  Paintbrush, 
  Highlighter, 
  Eraser, 
  Undo2, 
  Redo2, 
  RotateCcw, 
  Play, 
  Save, 
  Plus, 
  Search, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Type,
  Minus,
  ArrowRight,
  Square,
  Circle,
  Scissors,
  MousePointer,
  Trash2,
  X,
  Upload,
  Hand,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid
} from 'lucide-react';

interface DrawingViewProps {
  index: VaultIndex;
  _vaultPath: string;
}

export default function DrawingView({ index, _vaultPath }: DrawingViewProps) {
  const [selectedDrawing, setSelectedDrawing] = useState<DrawingEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [drawingName, setDrawingName] = useState('');
  
  // Replay animation state
  const [replayingStrokes, setReplayingStrokes] = useState<Stroke[] | null>(null);
  
  // Guideline pattern state
  const [guidePattern, setGuidePattern] = useState<'blank' | 'grid' | 'dots' | 'lines' | 'cornell' | 'music' | 'isometric'>('blank');
  
  // Inline text input positioning state
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = useState('');

  // Canvas configuration
  const width = 1200;
  const height = 600;
  
  const {
    canvasRef,
    strokes,
    setStrokes,
    undo,
    redo,
    clearCanvas,
    undoClear,
    showClearUndoBanner,
    canUndo,
    canRedo,
    tool,
    setTool,
    color,
    setColor,
    brushWidth,
    setBrushWidth,
    filled,
    setFilled,
    startDrawing,
    draw,
    endDrawing,
    addTextStroke,
    addImageStroke,
    selectedIndices,
    deleteSelectedStrokes,
    clearSelection,
    startResizingSelection,
    zoom,
    setZoom,
    pan,
    setPan,
    snapToGrid,
    setSnapToGrid,
    autoCorrect,
    setAutoCorrect
  } = useCanvas({ width, height });

  // Save feedback state
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | 'saving' | null; message: string }>({
    type: null,
    message: ''
  });

  const lastSavedStrokesRef = useRef<string>('[]');
  const prevToolRef = useRef<'pen' | 'marker' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle' | 'arrow' | 'text' | 'image' | 'vectorEraser' | 'lasso' | 'pan'>('pen');

  // Spacebar Panning Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      if (e.key === ' ' && tool !== 'pan') {
        e.preventDefault();
        prevToolRef.current = tool;
        setTool('pan');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' && tool === 'pan') {
        e.preventDefault();
        setTool(prevToolRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [tool, setTool]);

  // Keyboard Shortcuts: Ctrl+Z for undo, Ctrl+Y for redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo]);

  // Auto-save effect
  useEffect(() => {
    const strokesStr = JSON.stringify(strokes);
    if (strokesStr === lastSavedStrokesRef.current) return;

    const timer = setTimeout(async () => {
      const nameToSave = drawingName.trim() || 'Untitled Sketch';
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        setSaveStatus({ type: 'saving', message: 'Saving...' });
        const pngBase64 = canvas.toDataURL('image/png');
        const res = await (window as any).wrriter.saveDrawing(nameToSave, strokes, pngBase64);
        if (res.success) {
          lastSavedStrokesRef.current = strokesStr;
          setSaveStatus({ type: 'success', message: 'Auto-saved' });
          setTimeout(() => {
            setSaveStatus(prev => prev.message === 'Auto-saved' ? { type: null, message: '' } : prev);
          }, 2000);
        } else {
          setSaveStatus({ type: 'error', message: res.error || 'Auto-save failed' });
        }
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus({ type: 'error', message: String(err) });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [strokes, drawingName]);

  // Handle selected drawing changes - load strokes and trigger replay
  useEffect(() => {
    if (selectedDrawing) {
      const loadDrawingStrokes = async () => {
        try {
          setSaveStatus({ type: 'saving', message: 'Loading drawing...' });
          const res = await (window as any).wrriter.loadDrawing(selectedDrawing.name);
          setSaveStatus({ type: null, message: '' });
          
          if (res && res.strokes) {
            setDrawingName(selectedDrawing.name);
            lastSavedStrokesRef.current = JSON.stringify(res.strokes);
            // Trigger replay animation
            setReplayingStrokes(res.strokes);
          } else {
            setDrawingName(selectedDrawing.name);
            lastSavedStrokesRef.current = '[]';
            setStrokes([]);
            setReplayingStrokes(null);
          }
        } catch (err) {
          console.error('Failed to load drawing:', err);
          setSaveStatus({ type: 'error', message: 'Failed to load drawing data' });
          setDrawingName(selectedDrawing.name);
          lastSavedStrokesRef.current = '[]';
          setStrokes([]);
          setReplayingStrokes(null);
        }
      };
      loadDrawingStrokes();
    } else {
      setDrawingName('');
      lastSavedStrokesRef.current = '[]';
      setStrokes([]);
      setReplayingStrokes(null);
    }
  }, [selectedDrawing, setStrokes]);

  // Handle drawing name input changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDrawingName(e.target.value);
  };

  // Create new blank drawing
  const handleNewDrawing = () => {
    setSelectedDrawing(null);
    setDrawingName('Untitled Sketch');
    lastSavedStrokesRef.current = '[]';
    setStrokes([]);
    setReplayingStrokes(null);
    setSaveStatus({ type: null, message: '' });
  };

  // Save the drawing (writes PNG and JSON to Attachments/)
  const handleSaveDrawing = async () => {
    const nameToSave = drawingName.trim() || 'Untitled Sketch';
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setSaveStatus({ type: 'saving', message: 'Saving sketch...' });
      
      // Get base64 PNG data URL
      const pngBase64 = canvas.toDataURL('image/png');
      
      const res = await (window as any).wrriter.saveDrawing(nameToSave, strokes, pngBase64);
      
      if (res.success) {
        lastSavedStrokesRef.current = JSON.stringify(strokes);
        setSaveStatus({ type: 'success', message: `Saved "${nameToSave}" successfully!` });
        
        // Find or set selected drawing to keep reference
        setTimeout(() => {
          setSaveStatus(prev => prev.message.includes('successfully') ? { type: null, message: '' } : prev);
        }, 3000);
      } else {
        setSaveStatus({ type: 'error', message: res.error || 'Failed to save sketch' });
      }
    } catch (err) {
      console.error('Failed to save drawing:', err);
      setSaveStatus({ type: 'error', message: String(err) });
    }
  };

  // Handle local image file import
  const handleImageImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        addImageStroke(reader.result);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value so same file can be selected again
    e.target.value = '';
  };

  // Trigger selection resizing via coordinates mapping
  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const canvasX = ((e.clientX - rect.left) / rect.width) * width;
    const canvasY = ((e.clientY - rect.top) / rect.height) * height;

    const mappedX = (canvasX - pan.x) / zoom;
    const mappedY = (canvasY - pan.y) / zoom;

    startResizingSelection(mappedX, mappedY);

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn('Pointer capture failed:', err);
    }
  };

  // Color Palette Selection
  const colors = [
    { name: 'Amber', value: '#9ca3af' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'White', value: '#FFFFFF' },
    { name: 'Gray', value: '#6B7280' }
  ];

  // Handle canvas click specifically for Text Input
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'text') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const canvasX = ((e.clientX - rect.left) / rect.width) * width;
    const canvasY = ((e.clientY - rect.top) / rect.height) * height;

    const mappedX = (canvasX - pan.x) / zoom;
    const mappedY = (canvasY - pan.y) / zoom;

    setTextInputPos({
      x: mappedX,
      y: mappedY
    });
    setTextValue('');
  };

  // Commit text input overlay changes to stroke list
  const commitText = () => {
    if (!textInputPos) return;
    const trimmedValue = textValue.trim();
    if (trimmedValue) {
      addTextStroke(trimmedValue, textInputPos.x, textInputPos.y);
    }
    setTextInputPos(null);
  };

  // Filter drawings list by search
  const filteredDrawings = index.drawings.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Switch from replayer to drawing editor
  const handleReplayComplete = (completedStrokes: Stroke[]) => {
    setStrokes(completedStrokes);
    setReplayingStrokes(null);
  };

  // Calculate selection bounding box mapped through Zoom/Pan translations
  let selectionBox: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
  if (selectedIndices.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedIndices.forEach(idx => {
      const stroke = strokes[idx];
      if (!stroke) return;
      stroke.points.forEach(pt => {
        if (pt.x < minX) minX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
      });
    });

    if (minX !== Infinity) {
      selectionBox = { minX, minY, maxX, maxY };
    }
  }

  // Calculate text input overlays position relative to parent DOM bounding rects
  let textInputLeft = 0;
  let textInputTop = 0;
  if (textInputPos && canvasRef.current) {
    const rect = canvasRef.current.getBoundingClientRect();
    textInputLeft = ((textInputPos.x * zoom + pan.x) / width) * rect.width;
    textInputTop = ((textInputPos.y * zoom + pan.y) / height) * rect.height;
  }

  return (
    <div className={styles.container}>
      {/* Drawings List Sidebar */}
      <div className={styles.sidebar}>
        {/* Header */}
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>Drawings</span>
          <button
            onClick={handleNewDrawing}
            className={styles.newSketchBtn}
            title="New Sketch"
          >
            <Plus size={16} />
          </button>
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

        {/* Drawings List Scroll Area */}
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
                  className={`${styles.drawingItem} ${isSelected ? styles.drawingItemActive : ''}`}
                >
                  <div className={styles.drawingIcon}>
                    <ImageIcon size={14} />
                  </div>
                  <span className={`${styles.drawingName} ${isSelected ? styles.drawingNameActive : ''}`}>
                    {drawing.name}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Workspace */}
      <div className={styles.mainWorkspace}>
        {replayingStrokes ? (
          // Replayer view
          <CanvasReplayer
            strokes={replayingStrokes}
            width={width}
            height={height}
            onComplete={() => handleReplayComplete(replayingStrokes)}
          />
        ) : (
          // Interactive Canvas editor
          <div className={styles.canvasEditor}>
            {/* Header controls bar */}
            <div className={styles.editorHeader}>
              <div className={styles.titleInputWrapper}>
                <input
                  type="text"
                  placeholder="Sketch Name"
                  value={drawingName}
                  onChange={handleNameChange}
                  className={styles.titleInput}
                />
              </div>

              {/* Status Indicator */}
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

            {/* Canvas Area Container */}
            <div className={styles.canvasWrapper}>
              <div className={`${styles.canvasBorder} ${styles[`guide_${guidePattern}`]}`}>
                <canvas
                  ref={canvasRef}
                  width={width}
                  height={height}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={endDrawing}
                  onClick={handleCanvasClick}
                  className={`${styles.canvas} ${tool === 'pan' ? styles.canvasPanMode : ''}`}
                  style={{ width: '100%', height: '100%' }}
                />

                {/* Selection Box Overlay (Dotted border, transform panel, mapped to zoom/pan matrix) */}
                {selectionBox && (
                  <div 
                    className={styles.selectionOverlay}
                    style={{
                      left: `${((selectionBox.minX * zoom + pan.x) / width) * 100}%`,
                      top: `${((selectionBox.minY * zoom + pan.y) / height) * 100}%`,
                      width: `${(((selectionBox.maxX - selectionBox.minX) * zoom) / width) * 100}%`,
                      height: `${(((selectionBox.maxY - selectionBox.minY) * zoom) / height) * 100}%`
                    }}
                  >
                    {/* Bounding Box Resize Handle */}
                    <div 
                      className={styles.resizeHandle}
                      onPointerDown={handleResizePointerDown}
                      title="Drag to resize selection"
                    />

                    <div className={styles.selectionToolbar}>
                      <button
                        onClick={deleteSelectedStrokes}
                        className={styles.selectionToolbarBtnDanger}
                        title="Delete Selected Strokes"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                      <div className={styles.selectionToolbarDivider} />
                      <button
                        onClick={clearSelection}
                        className={styles.selectionToolbarBtn}
                        title="Clear Selection"
                      >
                        <X size={12} />
                        <span>Deselect</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Text Input Overlay (Correctly translated via zoom/pan) */}
                {textInputPos && (
                  <div 
                    className={styles.textInputOverlay}
                    style={{
                      left: `${textInputLeft}px`,
                      top: `${textInputTop}px`
                    }}
                  >
                    <input
                      type="text"
                      autoFocus
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          commitText();
                        } else if (e.key === 'Escape') {
                          setTextInputPos(null);
                        }
                      }}
                      onBlur={commitText}
                      className={styles.textOverlayInput}
                      style={{
                        color: color,
                        fontSize: `${Math.max(12, brushWidth * 3 + 12) * zoom}px`,
                      }}
                      placeholder="Type text..."
                    />
                  </div>
                )}

                {/* 5-second Undo Clear Notification */}
                {showClearUndoBanner && (
                  <div className={styles.undoBanner}>
                    <span>Canvas cleared.</span>
                    <button
                      onClick={undoClear}
                      className={styles.undoButton}
                    >
                      Undo
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Tools Toolbar (Premium layout using double row spacing) */}
            <div className={styles.toolbar}>
              {/* Row 1: Tools selection and configurations */}
              <div className={styles.toolbarRow}>
                <div className={styles.toolsContainer}>
                  <button
                    onClick={() => setTool('pen')}
                    className={`${styles.toolButton} ${tool === 'pen' ? styles.toolButtonActive : ''}`}
                    title="Fine Pen"
                  >
                    <PenTool size={13} />
                    <span>Pen</span>
                  </button>
                  <button
                    onClick={() => setTool('marker')}
                    className={`${styles.toolButton} ${tool === 'marker' ? styles.toolButtonActive : ''}`}
                    title="Medium Marker"
                  >
                    <Paintbrush size={13} />
                    <span>Marker</span>
                  </button>
                  <button
                    onClick={() => setTool('highlighter')}
                    className={`${styles.toolButton} ${tool === 'highlighter' ? styles.toolButtonActive : ''}`}
                    title="Translucent Highlighter"
                  >
                    <Highlighter size={13} />
                    <span>Highlighter</span>
                  </button>
                  <button
                    onClick={() => setTool('eraser')}
                    className={`${styles.toolButton} ${tool === 'eraser' ? styles.toolButtonActive : ''}`}
                    title="Eraser"
                  >
                    <Eraser size={13} />
                    <span>Eraser</span>
                  </button>
                  
                  {/* Hand Tool button */}
                  <button
                    onClick={() => setTool('pan')}
                    className={`${styles.toolButton} ${tool === 'pan' ? styles.toolButtonActive : ''}`}
                    title="Hand Tool (Pan canvas - hold Spacebar to toggle)"
                  >
                    <Hand size={13} />
                    <span>Pan</span>
                  </button>

                  <div className={styles.divider} />

                  <button
                    onClick={() => setTool('vectorEraser')}
                    className={`${styles.toolButton} ${tool === 'vectorEraser' ? styles.toolButtonActive : ''}`}
                    title="Vector Eraser (Tap/drag to delete whole strokes)"
                  >
                    <Scissors size={13} />
                    <span>Vector Eraser</span>
                  </button>
                  <button
                    onClick={() => setTool('lasso')}
                    className={`${styles.toolButton} ${tool === 'lasso' ? styles.toolButtonActive : ''}`}
                    title="Lasso Selection (Draw boundary to move strokes)"
                  >
                    <MousePointer size={13} />
                    <span>Lasso Select</span>
                  </button>

                  <div className={styles.divider} />

                  <label className={styles.imageImportLabel} title="Import image from local computer">
                    <Upload size={13} />
                    <span>Import Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageImport}
                      className={styles.imageImportInput}
                    />
                  </label>

                  <div className={styles.divider} />

                  <button
                    onClick={() => setTool('line')}
                    className={`${styles.toolButton} ${tool === 'line' ? styles.toolButtonActive : ''}`}
                    title="Line Tool"
                  >
                    <Minus size={13} style={{ transform: 'rotate(-45deg)' }} />
                    <span>Line</span>
                  </button>
                  <button
                    onClick={() => setTool('arrow')}
                    className={`${styles.toolButton} ${tool === 'arrow' ? styles.toolButtonActive : ''}`}
                    title="Arrow Tool"
                  >
                    <ArrowRight size={13} style={{ transform: 'rotate(-45deg)' }} />
                    <span>Arrow</span>
                  </button>
                  <button
                    onClick={() => setTool('rect')}
                    className={`${styles.toolButton} ${tool === 'rect' ? styles.toolButtonActive : ''}`}
                    title="Rectangle Tool"
                  >
                    <Square size={13} />
                    <span>Rect</span>
                  </button>
                  <button
                    onClick={() => setTool('circle')}
                    className={`${styles.toolButton} ${tool === 'circle' ? styles.toolButtonActive : ''}`}
                    title="Circle Tool"
                  >
                    <Circle size={13} />
                    <span>Circle</span>
                  </button>
                  <button
                    onClick={() => setTool('text')}
                    className={`${styles.toolButton} ${tool === 'text' ? styles.toolButtonActive : ''}`}
                    title="Text Tool"
                  >
                    <Type size={13} />
                    <span>Text</span>
                  </button>
                </div>

                {/* Optional Shape Fill Toggle */}
                {(tool === 'rect' || tool === 'circle') && (
                  <div className={styles.fillToggleWrapper}>
                    <label className={styles.fillLabel}>
                      <input
                        type="checkbox"
                        checked={filled}
                        onChange={(e) => setFilled(e.target.checked)}
                        className={styles.fillCheckbox}
                      />
                      <span>Fill Shape</span>
                    </label>
                  </div>
                )}

                {/* Auto-shape Correction Toggle */}
                <button
                  onClick={() => setAutoCorrect(prev => !prev)}
                  className={`${styles.toggleButton} ${autoCorrect ? styles.toggleButtonActive : ''}`}
                  title="Auto Shape Correction (Smooth wobbly hand-drawn lines, circles, and boxes)"
                >
                  <Sparkles size={13} />
                  <span>Auto-Shape</span>
                </button>

                {/* Coordinate Snap to Grid Toggle */}
                <button
                  onClick={() => setSnapToGrid(prev => !prev)}
                  className={`${styles.toggleButton} ${snapToGrid ? styles.toggleButtonActive : ''}`}
                  title="Coordinate Snap-to-Grid (Snaps shapes and selections to grid dots)"
                >
                  <Grid size={13} />
                  <span>Grid Snap</span>
                </button>

                {/* Guidelines Toggle */}
                <div className={styles.guidesWrapper}>
                  <span className={styles.guidesLabel}>Guides</span>
                  <div className={styles.guidesContainer}>
                    {(['blank', 'grid', 'dots', 'lines', 'cornell', 'music', 'isometric'] as const).map((pattern) => (
                      <button
                        key={pattern}
                        onClick={() => setGuidePattern(pattern)}
                        className={`${styles.guideBtn} ${guidePattern === pattern ? styles.guideBtnActive : ''}`}
                        title={`${pattern.charAt(0).toUpperCase() + pattern.slice(1)} Template`}
                      >
                        {pattern === 'blank' 
                          ? 'None' 
                          : pattern === 'cornell'
                            ? 'Cornell'
                            : pattern === 'music'
                              ? 'Music'
                              : pattern === 'isometric'
                                ? '3D Dots'
                                : pattern.charAt(0).toUpperCase() + pattern.slice(1)
                        }
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Brush properties (colors/size) and operations */}
              <div className={styles.toolbarRow}>
                {/* Color Selection (hidden if tool is eraser or vectorEraser) */}
                <div className={`${styles.colorsWrapper} ${(tool === 'eraser' || tool === 'vectorEraser' || tool === 'lasso' || tool === 'pan') ? styles.colorsDisabled : ''}`}>
                  <span className={styles.colorsLabel}>Colors</span>
                  <div className={styles.colorsContainer}>
                    {colors.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setColor(c.value)}
                        className={`${styles.colorBtn} ${color === c.value ? styles.colorBtnActive : ''}`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      >
                        {color === c.value && (
                          <span className={styles.colorBtnInner} />
                        )}
                      </button>
                    ))}
                    
                    {/* Custom Color Spectrum Picker Button */}
                    <div className={styles.customColorPickerWrapper} title="Pick custom color">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className={styles.customColorInput}
                      />
                      <span className={styles.customColorBtnInner} />
                    </div>
                  </div>
                </div>

                {/* Size slider info */}
                <div className={styles.sizeWrapper}>
                  <span className={styles.sizeLabel}>
                    {tool === 'text' ? 'Font Size' : 'Brush Size'}
                  </span>
                  <div className={styles.sizeContainer}>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={brushWidth}
                      onChange={(e) => setBrushWidth(Number(e.target.value))}
                      className={styles.sizeSlider}
                    />
                    <span className={styles.sizeText}>{brushWidth}px</span>
                  </div>
                </div>

                {/* Zoom Control Pill (Toolbar Zoom/Pan triggers) */}
                <div className={styles.zoomContainer}>
                  <button
                    onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}
                    className={styles.zoomBtn}
                    title="Zoom Out"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span className={styles.zoomText}>{Math.round(zoom * 100)}%</span>
                  <button
                    onClick={() => setZoom(z => Math.min(5, z + 0.1))}
                    className={styles.zoomBtn}
                    title="Zoom In"
                  >
                    <ZoomIn size={13} />
                  </button>
                  <button
                    onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                    className={styles.zoomResetBtn}
                    title="Reset Zoom & Pan"
                  >
                    <Maximize2 size={13} />
                  </button>
                </div>

                {/* Action Operations (Undo / Redo / Clear / Replay) */}
                <div className={styles.actionsContainer}>
                  <button
                    onClick={undo}
                    disabled={!canUndo}
                    className={styles.actionBtn}
                    title="Undo last stroke"
                  >
                    <Undo2 size={15} />
                  </button>
                  <button
                    onClick={redo}
                    disabled={!canRedo}
                    className={styles.actionBtn}
                    title="Redo stroke"
                  >
                    <Redo2 size={15} />
                  </button>
                  <button
                    onClick={clearCanvas}
                    disabled={strokes.length === 0}
                    className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                    title="Clear canvas (undone within 5s)"
                  >
                    <RotateCcw size={15} />
                  </button>
                  <div className={styles.divider} />
                  <button
                    onClick={() => setReplayingStrokes(strokes)}
                    disabled={strokes.length === 0}
                    className={styles.actionBtn}
                    title="Replay drawing animation"
                  >
                    <Play size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
