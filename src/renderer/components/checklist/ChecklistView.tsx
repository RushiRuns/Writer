import React, { useState, useEffect } from 'react';
import { NoteEntry, VaultIndex } from '../../../shared/ipc-types';
import ChecklistContextMenu from './ChecklistContextMenu';

interface ChecklistViewProps {
  sectionId: 'later' | 'read' | 'shop' | 'watch' | 'tasks';
  index: VaultIndex;
  _vaultPath: string;
}

export default function ChecklistView({ sectionId, index, _vaultPath }: ChecklistViewProps) {
  const [selectedNoteForEdit, setSelectedNoteForEdit] = useState<NoteEntry | null>(null);
  const [editorContent, setEditorContent] = useState('');
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

  // Read currently active note content if editor opens
  useEffect(() => {
    if (selectedNoteForEdit) {
      const readContent = async () => {
        try {
          const res = await (window as any).wrriter.readNote(selectedNoteForEdit.path);
          setEditorContent(res.content);
        } catch (err) {
          console.error('Failed to read note:', err);
        }
      };
      readContent();
    }
  }, [selectedNoteForEdit?.path]);

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

  const handleSaveEditorContent = async () => {
    if (!selectedNoteForEdit) return;
    try {
      const data = await (window as any).wrriter.readNote(selectedNoteForEdit.path);
      await (window as any).wrriter.writeNote(selectedNoteForEdit.path, editorContent, data.frontmatter);
    } catch (err) {
      console.error('Failed to auto-save note content:', err);
    }
  };

  // Auto-save on editor blur
  const handleEditorBlur = () => {
    handleSaveEditorContent();
  };

  // Section icons helper
  const renderSectionIcon = () => {
    const iconClass = "w-16 h-16 text-neutral-700 mb-4";
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
    <div className="flex-grow flex h-full bg-black overflow-hidden font-ui">
      
      {/* Checklist list pane */}
      <div className={`flex flex-col h-full bg-neutral-950 border-r border-white/5 transition-all duration-300 ${selectedNoteForEdit ? 'w-[320px] flex-shrink-0' : 'flex-grow'}`}>
        
        {/* Header Title */}
        <div className="p-6 pb-4">
          <h1 className="text-3xl font-semibold text-neutral-100">{getSectionTitle()}</h1>
          <p className="text-xs text-neutral-500 font-mono mt-1">
            {checklistNotes.length} {checklistNotes.length === 1 ? 'item' : 'items'}
          </p>
        </div>

        {/* Notes Items List */}
        <div className="flex-grow overflow-y-auto px-6 py-2">
          {sortedNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60%] text-center py-12 animate-fade-in">
              {renderSectionIcon()}
              <p className="text-sm text-neutral-600 italic">Nothing here yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {sortedNotes.map((note) => {
                const isCompleted = getIsCompleted(note);
                const isRenaming = renamingNotePath === note.path;
                const isEditing = selectedNoteForEdit?.path === note.path;

                return (
                  <div
                    key={note.path}
                    className={`group relative flex items-center justify-between py-2 border-b border-white/5 ${
                      isEditing ? 'bg-neutral-900/40 border-l-2 border-brand-amber pl-2' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-grow mr-2 overflow-hidden">
                      {/* Checkbox item */}
                      <button
                        onClick={() => handleToggleComplete(note)}
                        className={`w-4 h-4 flex-shrink-0 rounded border transition-all duration-200 flex items-center justify-center ${
                          isCompleted
                            ? 'bg-brand-amber border-brand-amber text-black'
                            : 'border-neutral-600 hover:border-brand-amber'
                        }`}
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
                          className="flex-grow bg-neutral-900 text-sm text-neutral-100 border border-brand-amber/50 rounded px-2 py-0.5 outline-none font-sans"
                        />
                      ) : (
                        <span
                          onClick={() => setSelectedNoteForEdit(isEditing ? null : note)}
                          className={`text-sm cursor-pointer select-none truncate flex-grow ${
                            isCompleted ? 'line-through text-neutral-600 transition-all duration-300' : 'text-neutral-200'
                          }`}
                        >
                          {note.title}
                        </span>
                      )}
                    </div>

                    {/* Three dots actions menu */}
                    <div className="flex items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            note
                          });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-800 rounded transition-all text-neutral-500 hover:text-neutral-200"
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
        <form onSubmit={handleAddItem} className="p-4 bg-neutral-950 border-t border-white/5">
          <div className="relative flex items-center bg-neutral-900 border border-white/10 focus-within:border-brand-amber/50 rounded px-3 py-1.5 transition-all">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder={`Add item to ${getSectionTitle()}...`}
              className="flex-grow bg-transparent text-xs text-neutral-100 outline-none placeholder-neutral-500 mr-2"
            />
            <button
              type="submit"
              disabled={!newItemText.trim()}
              className="text-brand-amber disabled:text-neutral-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* Editor Column Area */}
      {selectedNoteForEdit && (
        <div className="flex-grow flex flex-col h-full bg-[#161616] animate-fade-in relative">
          {/* Header */}
          <div className="h-[48px] border-b border-white/5 px-6 flex items-center justify-between bg-neutral-900/30">
            <span className="text-xs text-neutral-400 font-mono truncate">
              Editing: {selectedNoteForEdit.title}
            </span>
            <button
              onClick={() => {
                handleSaveEditorContent();
                setSelectedNoteForEdit(null);
              }}
              className="text-xs text-neutral-500 hover:text-white px-2 py-1 rounded bg-neutral-800 border border-white/5 hover:border-white/20 transition-all"
            >
              Close Editor
            </button>
          </div>

          {/* Simple editor body (autoresizing container, rich styled textarea for now) */}
          <div className="flex-grow p-6 flex flex-col overflow-y-auto">
            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              onBlur={handleEditorBlur}
              placeholder="Add details, markdown, links, lists..."
              className="flex-grow w-full max-w-2xl mx-auto bg-transparent border-none outline-none resize-none text-neutral-200 text-sm font-mono leading-relaxed placeholder-neutral-600"
            />
          </div>
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
