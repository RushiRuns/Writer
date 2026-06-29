import React, { useState, useEffect } from 'react';
import { NoteEntry, VaultIndex } from '../../../shared/ipc-types';
import ChecklistContextMenu from './ChecklistContextMenu';
import Editor from '../editor/Editor';
import { Plus, ArrowUp } from 'lucide-react';
import styles from './ChecklistView.module.css';

interface ChecklistViewProps {
  sectionId: 'later' | 'read' | 'shop' | 'watch' | 'tasks';
  index: VaultIndex;
  _vaultPath: string;
}

export default function ChecklistView({ sectionId, index, _vaultPath }: ChecklistViewProps) {
  const [selectedNoteForEdit, setSelectedNoteForEdit] = useState<NoteEntry | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [renamingNotePath, setRenamingNotePath] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  // Local completed states to manage the 500ms reorder delay
  const [localCompleted, setLocalCompleted] = useState<Record<string, boolean>>({});
  const [pendingToggles, setPendingToggles] = useState<Record<string, NodeJS.Timeout>>({});

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    note: NoteEntry;
  } | null>(null);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(pendingToggles).forEach(clearTimeout);
    };
  }, [pendingToggles]);

  // Filter and sort items: uncompleted first, then completed. Sorted by creation date.
  const checklistNotes = index.notes.filter(n => n.section === sectionId);

  const getIsCompleted = (note: NoteEntry) => {
    if (localCompleted[note.path] !== undefined) {
      return localCompleted[note.path];
    }
    return note.completed;
  };

  const sortedNotes = [...checklistNotes].sort((a, b) => {
    const aComp = getIsCompleted(a);
    const bComp = getIsCompleted(b);
    if (aComp !== bComp) {
      return aComp ? 1 : -1;
    }
    return new Date(b.created).getTime() - new Date(a.created).getTime();
  });

  const handleToggleComplete = (note: NoteEntry) => {
    const currentVal = getIsCompleted(note);
    const nextVal = !currentVal;

    // Update local state immediately for visual feedback
    setLocalCompleted(prev => ({ ...prev, [note.path]: nextVal }));

    // Cancel existing pending toggle for this note
    if (pendingToggles[note.path]) {
      clearTimeout(pendingToggles[note.path]);
    }

    // Delay IPC call by 500ms to allow strikethrough animation to sit in place before reordering
    const timer = setTimeout(async () => {
      try {
        await (window as any).wrriter.toggleNoteComplete(note.path, nextVal);
        // Clear local override once main process updates index
        setLocalCompleted(prev => {
          const updated = { ...prev };
          delete updated[note.path];
          return updated;
        });
      } catch (err) {
        console.error('Failed to toggle completion:', err);
      }
    }, 500);

    setPendingToggles(prev => ({ ...prev, [note.path]: timer }));
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newItemText.trim();
    if (!title) return;

    try {
      // Maps to folder name YYYY-MM-DD/etc or System Folders
      const folderName = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
      await (window as any).wrriter.createNote(folderName, title);
      setNewItemText('');
    } catch (err) {
      console.error('Failed to add checklist item:', err);
    }
  };

  const handleRenameSubmit = async (note: NoteEntry) => {
    const nextTitle = renameText.trim();
    if (nextTitle && nextTitle !== note.title) {
      try {
        // Read full data first
        const data = await (window as any).wrriter.readNote(note.path);
        // Write back with new title
        await (window as any).wrriter.writeNote(note.path, data.content, data.frontmatter, nextTitle);
      } catch (err) {
        console.error('Failed to rename note:', err);
      }
    }
    setRenamingNotePath(null);
  };

  // Section icons helper
  const renderSectionIcon = () => {
    const iconClass = styles.sectionIcon;
    switch (sectionId) {
      case 'later':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'read':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" />
          </svg>
        );
      case 'watch':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        );
      case 'shop':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'tasks':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
    }
  };

  const getSectionTitle = () => {
    return sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
  };

  return (
    <div className={`flex-grow flex h-full overflow-hidden ${styles.container}`}>
      
      {/* Checklist list pane */}
      <div className={`${styles.listPane} ${selectedNoteForEdit ? styles.selected : styles.idle}`}>
        
        {/* Notes Items List */}
        <div className={styles.itemsScroll}>
          {/* Title */}
          <h1 className={styles.viewTitle}>{getSectionTitle()}</h1>

          {sortedNotes.length === 0 ? (
            <div className={`${styles.emptyState} animate-fade-in`}>
              {renderSectionIcon()}
              <p className={styles.emptyText}>Nothing here yet</p>
            </div>
          ) : (
            <div className={styles.itemsList}>
              {sortedNotes.map((note) => {
                const isCompleted = getIsCompleted(note);
                const isRenaming = renamingNotePath === note.path;
                const isEditing = selectedNoteForEdit?.path === note.path;

                return (
                  <div
                    key={note.path}
                    className={`group ${styles.row} ${isEditing ? styles.editing : ''}`}
                  >
                    <div className={styles.rowLeft}>
                      {/* Checkbox item */}
                      <button
                        onClick={() => handleToggleComplete(note)}
                        className={`${styles.checkbox} ${isCompleted ? styles.completed : ''}`}
                      >
                        {isCompleted && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      {/* Rename Mode or Title */}
                      {isRenaming ? (
                        <input
                          type="text"
                          value={renameText}
                          onChange={(e) => setRenameText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSubmit(note);
                            if (e.key === 'Escape') setRenamingNotePath(null);
                          }}
                          onBlur={() => handleRenameSubmit(note)}
                          autoFocus
                          className={styles.renameInput}
                        />
                      ) : (
                        <span
                          onClick={() => setSelectedNoteForEdit(isEditing ? null : note)}
                          className={`${styles.itemTitle} ${isCompleted ? styles.completed : ''}`}
                        >
                          {note.title}
                        </span>
                      )}
                    </div>

                    {/* Three dots actions menu */}
                    <div className={styles.rowRight}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            note
                          });
                        }}
                        className={styles.actionsBtn}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Input box to add new item directly */}
        <div className={styles.quickCaptureContainer}>
          <form onSubmit={handleAddItem} className={styles.quickCaptureForm}>
            <div className={styles.inputWrapper}>
              <Plus size={16} className={styles.plusIcon} />
              <input
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder={`Add item to ${getSectionTitle()}...`}
                className={styles.quickCaptureInput}
              />
              <button
                type="submit"
                disabled={!newItemText.trim()}
                className={styles.submitBtn}
              >
                <ArrowUp size={16} />
              </button>
            </div>
            <div className={styles.helperText}>Press Enter to save</div>
          </form>
        </div>
      </div>

      {/* Editor Column Area */}
      {selectedNoteForEdit && (
        <div className={`${styles.editorCol} animate-fade-in`}>
          <Editor
            key={selectedNoteForEdit.path}
            note={selectedNoteForEdit}
            index={index}
            onNoteSelect={setSelectedNoteForEdit}
            onClose={() => setSelectedNoteForEdit(null)}
          />
        </div>
      )}

      {/* Context Menu Overlay */}
      {contextMenu && (
        <ChecklistContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onRename={() => {
            setRenameText(contextMenu.note.title);
            setRenamingNotePath(contextMenu.note.path);
          }}
          onMoveToInbox={async () => {
            try {
              await (window as any).wrriter.moveNote(contextMenu.note.path, 'Inbox');
              if (selectedNoteForEdit?.path === contextMenu.note.path) {
                setSelectedNoteForEdit(null);
              }
            } catch (err) {
              console.error('Failed to move note back to Inbox:', err);
            }
          }}
          onDelete={async () => {
            try {
              await (window as any).wrriter.deleteNote(contextMenu.note.path);
              if (selectedNoteForEdit?.path === contextMenu.note.path) {
                setSelectedNoteForEdit(null);
              }
            } catch (err) {
              console.error('Failed to delete note:', err);
            }
          }}
          onCopy={async () => {
            try {
              await navigator.clipboard.writeText(contextMenu.note.title);
              // Simple native toast alert or visual effect
            } catch (err) {
              console.error('Failed to copy to clipboard:', err);
            }
          }}
        />
      )}
    </div>
  );
}

