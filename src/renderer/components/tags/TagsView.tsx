import React, { useState, useEffect } from 'react';
import { NoteEntry, VaultIndex } from '../../../shared/ipc-types';
import ResizablePanels from '../layout/ResizablePanels';
import Editor from '../editor/Editor';
import styles from './TagsView.module.css';

interface TagsViewProps {
  index: VaultIndex;
  vaultPath: string;
}

export default function TagsView({ index, vaultPath }: TagsViewProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<NoteEntry | null>(null);
  
  // Panel width states
  const [pane2Width, setPane2Width] = useState(200);
  const [pane3Width, setPane3Width] = useState(240);

  // Extract unique alphabetical tags
  const tagsList = Object.keys(index.tagMap).sort((a, b) => a.localeCompare(b));

  // Sync selected note with index updates
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

  // Handle active tag selection change
  const handleTagSelect = (tag: string) => {
    setActiveTag(tag);
    setSelectedNote(null);
  };

  // Get notes for active tag
  const taggedNotes = activeTag
    ? index.notes.filter(note => note.tags.includes(activeTag))
    : [];

  // Pane 2: Tags list browser
  const renderPane2 = () => (
    <div className={styles.tagsPanel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Tags</h2>
      </div>
      <div className={styles.scrollArea}>
        {tagsList.length === 0 ? (
          <div className={styles.emptyState}>No tags found</div>
        ) : (
          <div className={styles.tagsList}>
            {tagsList.map(tag => {
              const count = index.tagMap[tag]?.length || 0;
              const isActive = activeTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => handleTagSelect(tag)}
                  className={`${styles.tagRow} ${isActive ? styles.active : ''}`}
                >
                  <span className={styles.tagLabel}>#{tag}</span>
                  <span className={styles.tagBadge}>{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // Pane 3: Tagged notes list
  const renderPane3 = () => (
    <div className={styles.notesPanel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>
          {activeTag ? `#${activeTag}` : 'Notes'}
        </h2>
        <span className={styles.countBadge}>{taggedNotes.length}</span>
      </div>
      <div className={styles.scrollArea}>
        {!activeTag ? (
          <div className={styles.emptyState}>Select a tag to view notes</div>
        ) : taggedNotes.length === 0 ? (
          <div className={styles.emptyState}>No notes tagged with #{activeTag}</div>
        ) : (
          <div className={styles.notesList}>
            {taggedNotes.map(note => {
              const isSelected = selectedNote?.path === note.path;
              const modifiedDate = new Date(note.modified).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric'
              });

              return (
                <button
                  key={note.path}
                  onClick={() => setSelectedNote(note)}
                  className={`${styles.noteCard} ${isSelected ? styles.selected : ''}`}
                >
                  <div className={styles.noteCardHeader}>
                    <h3 className={styles.noteTitle}>{note.title}</h3>
                    <span className={styles.noteDate}>{modifiedDate}</span>
                  </div>
                  <p className={styles.notePreview}>
                    {note.preview || 'No content'}
                  </p>
                  {note.tags.length > 0 && (
                    <div className={styles.cardTags}>
                      {note.tags.slice(0, 3).map(t => (
                        <span key={t} className={styles.cardTagPill}>
                          #{t}
                        </span>
                      ))}
                      {note.tags.length > 3 && (
                        <span className={styles.cardTagMore}>
                          +{note.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // Pane 4: Editor panel
  const renderPane4 = () => {
    if (!selectedNote) {
      return (
        <div className={styles.placeholder}>
          Select a note to view or edit
        </div>
      );
    }
    return (
      <Editor
        note={selectedNote}
        index={index}
        onNoteSelect={setSelectedNote}
      />
    );
  };

  return (
    <div className={styles.container}>
      <ResizablePanels
        pane2={renderPane2()}
        pane3={renderPane3()}
        pane4={renderPane4()}
        pane2Width={pane2Width}
        setPane2Width={setPane2Width}
        pane3Width={pane3Width}
        setPane3Width={setPane3Width}
      />
    </div>
  );
}
