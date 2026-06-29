import React, { useState, useEffect } from 'react';
import { NoteEntry, VaultIndex } from '../../../shared/ipc-types';
import Editor from '../editor/Editor';
import ConfirmationModal from '../ui/ConfirmationModal';
import styles from './ArchiveView.module.css';

interface ArchiveViewProps {
  index: VaultIndex;
  vaultPath: string;
}

export default function ArchiveView({ index, vaultPath }: ArchiveViewProps) {
  const [selectedNote, setSelectedNote] = useState<NoteEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Get notes in the archive folder
  const archivedNotes = index.notes.filter(n => n.section === 'archive');

  // Sort by modified date newest first
  const sortedNotes = [...archivedNotes].sort(
    (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()
  );

  // Filter notes by search query
  const filteredNotes = sortedNotes.filter(
    note =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sync selected note selection with index updates
  useEffect(() => {
    if (selectedNote) {
      const fresh = index.notes.find(n => n.path === selectedNote.path);
      if (fresh) {
        setSelectedNote(fresh);
      } else {
        setSelectedNote(null);
      }
    }
  }, [index.notes]);

  const handleRestore = async (e: React.MouseEvent, note: NoteEntry) => {
    e.stopPropagation();
    try {
      // Restore note to Inbox folder
      await (window as any).wrriter.moveNote(note.path, 'Inbox');
      if (selectedNote?.path === note.path) {
        setSelectedNote(null);
      }
    } catch (err) {
      console.error('Failed to restore note from archive:', err);
    }
  };

  const [noteToDelete, setNoteToDelete] = useState<NoteEntry | null>(null);

  const handleDeletePermanently = (e: React.MouseEvent, note: NoteEntry) => {
    e.stopPropagation();
    setNoteToDelete(note);
  };

  const confirmDeletePermanently = async () => {
    if (!noteToDelete) return;
    try {
      await (window as any).wrriter.deleteNote(noteToDelete.path);
      if (selectedNote?.path === noteToDelete.path) {
        setSelectedNote(null);
      }
    } catch (err) {
      console.error('Failed to permanently delete note:', err);
    } finally {
      setNoteToDelete(null);
    }
  };

  return (
    <div className={styles.container}>
      {/* Archive Notes List (Left Column) */}
      <div className={styles.listPane}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <h1 className={styles.title}>Archive</h1>
            <span className={styles.badge}>{archivedNotes.length}</span>
          </div>
          
          <div className={styles.searchWrapper}>
            <svg className={styles.searchIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search archive..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        <div className={styles.scrollArea}>
          {filteredNotes.length === 0 ? (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p>{searchQuery ? 'No matching archived notes' : 'Archive is empty'}</p>
            </div>
          ) : (
            <div className={styles.notesList}>
              {filteredNotes.map(note => {
                const isSelected = selectedNote?.path === note.path;
                const dateStr = new Date(note.modified).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric'
                });

                return (
                  <div
                    key={note.path}
                    onClick={() => setSelectedNote(note)}
                    className={`${styles.noteCard} ${isSelected ? styles.selected : ''}`}
                  >
                    <div className={styles.cardHeader}>
                      <span className={styles.noteTitle}>{note.title}</span>
                      <span className={styles.noteDate}>{dateStr}</span>
                    </div>
                    <p className={styles.notePreview}>
                      {note.preview || 'No content'}
                    </p>
                    <div className={styles.actions}>
                      <button
                        onClick={(e) => handleRestore(e, note)}
                        className={styles.actionBtn}
                        title="Restore to Inbox"
                      >
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        Restore
                      </button>
                      <button
                        onClick={(e) => handleDeletePermanently(e, note)}
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        title="Delete Permanently"
                      >
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Note Editor Area (Right Column) */}
      <div className={styles.editorPane}>
        {selectedNote ? (
          <div className="h-full w-full relative flex flex-col">
            <div className={styles.archiveBanner}>
              <svg className="w-4 h-4 mr-1.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>This note is archived. You can edit it here or restore it to your active lists.</span>
            </div>
            <div className="flex-grow overflow-hidden">
              <Editor
                key={selectedNote.path}
                note={selectedNote}
                index={index}
                onNoteSelect={setSelectedNote}
              />
            </div>
          </div>
        ) : (
          <div className={styles.placeholder}>
            Select an archived note to view or edit
          </div>
        )}
      </div>

      {/* Delete Permanently Confirmation Modal */}
      <ConfirmationModal
        isOpen={noteToDelete !== null}
        title="Permanently Delete Note"
        message={`Are you sure you want to permanently delete "${noteToDelete?.title}"? This action cannot be undone and will move it to the system trash.`}
        confirmText="Delete Permanently"
        cancelText="Cancel"
        onConfirm={confirmDeletePermanently}
        onCancel={() => setNoteToDelete(null)}
        isDangerous={true}
      />
    </div>
  );
}
