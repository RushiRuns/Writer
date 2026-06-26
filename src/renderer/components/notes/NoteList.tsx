import React, { useState } from 'react';
import { NoteEntry, VaultIndex } from '../../../shared/ipc-types';
import ChecklistContextMenu from '../checklist/ChecklistContextMenu';

interface NoteListProps {
  index: VaultIndex;
  activeFolder: string;
  selectedNote: NoteEntry | null;
  onNoteSelect: (note: NoteEntry | null) => void;
}

export default function NoteList({
  index,
  activeFolder,
  selectedNote,
  onNoteSelect
}: NoteListProps) {
  const [renamingNotePath, setRenamingNotePath] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    note: NoteEntry;
  } | null>(null);

  // Filter notes that belong to the current selected folder under notes section
  const folderNotes = index.notes.filter(
    n => n.section === 'notes' && n.folder === activeFolder
  ).sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

  const getFolderName = () => {
    if (activeFolder === '.') return 'Notes Root';
    return activeFolder.split(/[/\\]/).pop() || activeFolder;
  };

  const formatModifyDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const handleRenameSubmit = async (note: NoteEntry) => {
    const nextTitle = renameText.trim();
    if (nextTitle && nextTitle !== note.title) {
      try {
        const data = await (window as any).wrriter.readNote(note.path);
        const res = await (window as any).wrriter.writeNote(note.path, data.content, data.frontmatter, nextTitle);
        if (res.success && selectedNote?.path === note.path) {
          // Update selected note reference
          onNoteSelect({
            ...note,
            path: res.path,
            title: nextTitle
          });
        }
      } catch (err) {
        console.error('Failed to rename note:', err);
      }
    }
    setRenamingNotePath(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#161616] overflow-hidden text-neutral-300 border-r border-white/5">
      {/* Pane 3 Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
        <span className="font-semibold text-sm text-neutral-200 truncate select-none pr-2">
          {getFolderName()}
        </span>
        <span className="text-xs text-neutral-500 font-mono flex-shrink-0">
          {folderNotes.length} {folderNotes.length === 1 ? 'note' : 'notes'}
        </span>
      </div>

      {/* Note List Scroll Area */}
      <div className="flex-grow overflow-y-auto p-2 flex flex-col gap-1">
        {folderNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-xs text-neutral-600 italic">
            No notes here. Click [+] to create one.
          </div>
        ) : (
          folderNotes.map((note) => {
            const isSelected = selectedNote?.path === note.path;
            const isRenaming = renamingNotePath === note.path;

            return (
              <div
                key={note.path}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    note
                  });
                }}
                onClick={() => {
                  if (!isRenaming) onNoteSelect(note);
                }}
                className={`group relative p-3 rounded cursor-pointer border transition-all duration-150 ${
                  isSelected
                    ? 'border-brand-amber/40 bg-neutral-900/40 shadow-md shadow-brand-amber/5'
                    : 'border-transparent bg-neutral-950/40 hover:bg-neutral-900/30'
                }`}
              >
                <div className="flex flex-col gap-1">
                  {/* Title or Input */}
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
                      onClick={(e) => e.stopPropagation()}
                      className="bg-neutral-900 border border-brand-amber/50 rounded text-xs text-neutral-100 px-2 py-0.5 outline-none font-sans"
                    />
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium truncate flex-grow pr-2 ${
                        isSelected ? 'text-brand-amber' : 'text-neutral-200'
                      }`}>
                        {note.title}
                      </span>
                      <span className="text-xs text-neutral-500 flex-shrink-0 font-mono">
                        {formatModifyDate(note.modified)}
                      </span>
                    </div>
                  )}

                  {/* Body Preview */}
                  {!isRenaming && note.preview && (
                    <span className="text-xs text-neutral-400 truncate max-w-[220px]">
                      {note.preview}
                    </span>
                  )}

                  {/* Inline Tags */}
                  {!isRenaming && note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {note.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.5 rounded border border-brand-amber/20 bg-brand-amber/5 text-brand-amber/70 font-mono"
                        >
                          #{tag}
                        </span>
                      ))}
                      {note.tags.length > 3 && (
                        <span className="text-[9px] text-neutral-500 font-mono pl-0.5">
                          +{note.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right click float menu button indicator for users */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      note
                    });
                  }}
                  className="absolute bottom-2.5 right-2 opacity-0 group-hover:opacity-100 p-0.5 hover:bg-neutral-800 rounded transition-all text-neutral-500 hover:text-neutral-200"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Note Context Menu */}
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
              if (selectedNote?.path === contextMenu.note.path) {
                onNoteSelect(null);
              }
            } catch (err) {
              console.error('Failed to move note to Inbox:', err);
            }
          }}
          onDelete={async () => {
            try {
              await (window as any).wrriter.deleteNote(contextMenu.note.path);
              if (selectedNote?.path === contextMenu.note.path) {
                onNoteSelect(null);
              }
            } catch (err) {
              console.error('Failed to delete note:', err);
            }
          }}
          onCopy={async () => {
            try {
              await navigator.clipboard.writeText(contextMenu.note.title);
            } catch (err) {
              console.error('Failed to copy title:', err);
            }
          }}
        />
      )}
    </div>
  );
}
