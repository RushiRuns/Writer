import React, { useState, useEffect } from 'react';
import { NoteEntry, VaultIndex } from '../../../shared/ipc-types';
import ResizablePanels from '../layout/ResizablePanels';
import FolderTree from './FolderTree';
import NoteList from './NoteList';
import Editor from '../editor/Editor';
import { X, Columns } from 'lucide-react';
import styles from './NotesView.module.css';

interface NotesViewProps {
  index: VaultIndex;
  _vaultPath: string;
  onBreadcrumbChange?: (path: string) => void;
  onNoteSelected?: (notePath: string | null) => void;
  targetNotePath?: string | null;
  onClearTargetNotePath?: () => void;
}

interface TabItem {
  path: string;
  title: string;
}

interface PaneState {
  id: string; // 'left' or 'right'
  tabs: TabItem[];
  activeTabPath: string | null;
}

export default function NotesView({ 
  index, 
  _vaultPath, 
  onBreadcrumbChange,
  onNoteSelected,
  targetNotePath,
  onClearTargetNotePath
}: NotesViewProps) {
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [targetSelectedPath, setTargetSelectedPath] = useState<string | null>(null);

  // Split tabs/editor panes state
  const [panes, setPanes] = useState<PaneState[]>([
    { id: 'left', tabs: [], activeTabPath: null }
  ]);
  const [activePaneId, setActivePaneId] = useState<string>('left');

  // Column width states
  const [pane2Width, setPane2Width] = useState(200);
  const [pane3Width, setPane3Width] = useState(240);

  // Selected note derived from active tab in active pane
  const activePane = panes.find(p => p.id === activePaneId);
  const selectedNote = index.notes.find(n => n.path === activePane?.activeTabPath) || null;

  // Reset note selection when folder changes (we don't reset tabs, just folder view)
  const handleFolderSelect = (folderPath: string) => {
    setActiveFolder(folderPath);
  };

  // Synchronize tab lists: close tabs for notes that were deleted from the filesystem
  useEffect(() => {
    setPanes(prev => prev.map(pane => {
      const validTabs = pane.tabs.filter(tab => index.notes.some(n => n.path === tab.path));
      let nextActivePath = pane.activeTabPath;
      if (pane.activeTabPath && !index.notes.some(n => n.path === pane.activeTabPath)) {
        nextActivePath = validTabs.length > 0 ? validTabs[validTabs.length - 1].path : null;
      }
      return {
        ...pane,
        tabs: validTabs,
        activeTabPath: nextActivePath
      };
    }));
  }, [index.notes]);

  // Handle external or async tab triggers (e.g. search, command palette, double click)
  useEffect(() => {
    if (targetSelectedPath) {
      const found = index.notes.find(n => n.path === targetSelectedPath);
      if (found) {
        setPanes(prev => prev.map(pane => {
          if (pane.id === activePaneId) {
            const exists = pane.tabs.some(t => t.path === found.path);
            const newTabs = exists 
              ? pane.tabs 
              : [...pane.tabs, { path: found.path, title: found.title }];
            return {
              ...pane,
              tabs: newTabs,
              activeTabPath: found.path
            };
          }
          return pane;
        }));
        setTargetSelectedPath(null);
      }
    }
  }, [index.notes, targetSelectedPath, activePaneId]);

  useEffect(() => {
    if (targetNotePath) {
      const note = index.notes.find(n => n.path === targetNotePath);
      if (note) {
        setActiveFolder(note.folder || '.');
      }
      setTargetSelectedPath(targetNotePath);
      onClearTargetNotePath?.();
    }
  }, [targetNotePath, index.notes]);

  // Synchronize top breadcrumbs with the active tab note
  useEffect(() => {
    if (onBreadcrumbChange) {
      if (selectedNote) {
        const parts = ['Notes'];
        if (selectedNote.folder && selectedNote.folder !== '.') {
          parts.push(...selectedNote.folder.split(/[/\\]/));
        }
        parts.push(selectedNote.title);
        onBreadcrumbChange(parts.join(' > '));
      } else {
        onBreadcrumbChange(!activeFolder || activeFolder === '.' ? 'Notes' : `Notes > ${activeFolder.replace(/[/\\]/g, ' > ')}`);
      }
    }
    // Report active note path to App-level for export support
    if (onNoteSelected) {
      onNoteSelected(selectedNote?.path ?? null);
    }
  }, [selectedNote, activeFolder, onBreadcrumbChange, onNoteSelected]);

  // Select note from note list
  const handleNoteSelect = (note: NoteEntry | null) => {
    if (!note) return;
    setPanes(prev => prev.map(pane => {
      if (pane.id === activePaneId) {
        const exists = pane.tabs.some(t => t.path === note.path);
        const newTabs = exists 
          ? pane.tabs 
          : [...pane.tabs, { path: note.path, title: note.title }];
        return {
          ...pane,
          tabs: newTabs,
          activeTabPath: note.path
        };
      }
      return pane;
    }));
  };

  // Switch tab in a specific pane
  const handleSwitchTab = (paneId: string, tabPath: string) => {
    setPanes(prev => prev.map(pane => {
      if (pane.id === paneId) {
        return { ...pane, activeTabPath: tabPath };
      }
      return pane;
    }));
  };

  // Close tab in a specific pane
  const handleCloseTab = (paneId: string, tabPath: string) => {
    setPanes(prev => prev.map(pane => {
      if (pane.id === paneId) {
        const remainingTabs = pane.tabs.filter(t => t.path !== tabPath);
        let nextActivePath = pane.activeTabPath;
        if (pane.activeTabPath === tabPath) {
          nextActivePath = remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1].path : null;
        }
        return {
          ...pane,
          tabs: remainingTabs,
          activeTabPath: nextActivePath
        };
      }
      return pane;
    }));
  };

  // Split active pane
  const handleSplitPane = () => {
    const activePane = panes.find(p => p.id === activePaneId);
    const activeTab = activePane?.tabs.find(t => t.path === activePane.activeTabPath);

    const newPaneId = activePaneId === 'left' ? 'right' : 'left';
    
    // Check if new pane already exists (cannot split more than 2 panes side-by-side)
    if (panes.some(p => p.id === newPaneId)) return;

    const newPane: PaneState = {
      id: newPaneId,
      tabs: activeTab ? [{ ...activeTab }] : [],
      activeTabPath: activeTab ? activeTab.path : null
    };

    setPanes(prev => {
      const next = [...prev];
      // Insert in logical order (left first, then right)
      if (newPaneId === 'right') {
        next.push(newPane);
      } else {
        next.unshift(newPane);
      }
      return next;
    });
    setActivePaneId(newPaneId);
  };

  // Close split pane
  const handleClosePane = (paneId: string) => {
    setPanes(prev => prev.filter(p => p.id !== paneId));
    const remaining = panes.find(p => p.id !== paneId);
    if (remaining) {
      setActivePaneId(remaining.id);
    }
  };

  // Sync renames from inside the editor
  const handleNoteSelectFromEditor = (paneId: string, oldPath: string, freshNote: NoteEntry | null) => {
    if (!freshNote) return;
    setPanes(prev => prev.map(pane => {
      if (pane.id === paneId) {
        return {
          ...pane,
          tabs: pane.tabs.map(t => t.path === oldPath ? { path: freshNote.path, title: freshNote.title } : t),
          activeTabPath: pane.activeTabPath === oldPath ? freshNote.path : pane.activeTabPath
        };
      }
      return pane;
    }));
  };

  // Handle New Note creation
  const handleNewNote = async (folderPath: string) => {
    try {
      const folder = folderPath === '.' ? '' : folderPath;
      const res = await (window as any).wrriter.createNote(folder, 'Untitled');
      if (res.success) {
        setTargetSelectedPath(res.path);
      }
    } catch (err) {
      console.error('Failed to create new note:', err);
    }
  };

  // Pane Render Functions
  const renderPane2 = () => (
    <FolderTree
      index={index}
      activeFolder={activeFolder}
      onFolderSelect={handleFolderSelect}
      onNewNote={handleNewNote}
    />
  );

  const renderPane3 = () => (
    <NoteList
      index={index}
      activeFolder={activeFolder!}
      selectedNote={selectedNote}
      onNoteSelect={handleNoteSelect}
      onNewNote={handleNewNote}
    />
  );

  const renderPane4 = () => {
    return (
      <div className={styles.workspaceContainer}>
        {panes.map((pane) => {
          const isActivePane = activePaneId === pane.id;
          const activeNote = index.notes.find(n => n.path === pane.activeTabPath);

          return (
            <div 
              key={pane.id}
              onClickCapture={() => setActivePaneId(pane.id)}
              className={`${styles.paneContainer} ${isActivePane ? styles.paneActive : ''}`}
            >
              {/* Tab Bar Header */}
              <div className={styles.tabBar}>
                <div className={styles.tabsList}>
                  {pane.tabs.map((tab) => {
                    const isActiveTab = pane.activeTabPath === tab.path;
                    return (
                      <div 
                        key={tab.path}
                        className={`${styles.tabItem} ${isActiveTab ? styles.tabActive : ''}`}
                        onClick={() => handleSwitchTab(pane.id, tab.path)}
                      >
                        <span className={styles.tabTitle}>{tab.title}</span>
                        <button 
                          className={styles.tabCloseBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseTab(pane.id, tab.path);
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Pane Split/Close Controls */}
                <div className={styles.paneControls}>
                  {panes.length === 1 ? (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSplitPane();
                      }}
                      className={styles.controlBtn}
                      title="Split Vertically"
                    >
                      <Columns size={14} />
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClosePane(pane.id);
                      }}
                      className={styles.controlBtn}
                      title="Close Pane"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Editor Workspace */}
              <div className={styles.paneContent}>
                {activeNote ? (
                  <Editor
                    key={activeNote.path} // Force re-mount on tab switch to reset editor instance
                    note={activeNote}
                    index={index}
                    onNoteSelect={(fresh) => handleNoteSelectFromEditor(pane.id, activeNote.path, fresh)}
                  />
                ) : (
                  <div className={styles.panePlaceholder}>
                    Select a note from the list or double-click to create
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <ResizablePanels
        pane2={renderPane2()}
        pane3={activeFolder !== null ? renderPane3() : undefined}
        pane4={activeFolder !== null ? renderPane4() : undefined}
        pane2Width={pane2Width}
        setPane2Width={setPane2Width}
        pane3Width={pane3Width}
        setPane3Width={setPane3Width}
      />
    </div>
  );
}
