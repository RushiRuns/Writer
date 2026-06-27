import React, { useState, useEffect } from 'react';
import { NoteEntry, VaultIndex } from '../../../shared/ipc-types';
import Editor from '../editor/Editor';
import styles from './JournalView.module.css';

interface JournalViewProps {
  index: VaultIndex;
  vaultPath: string;
}

interface JournalGroup {
  monthYearLabel: string;
  notes: NoteEntry[];
}

export default function JournalView({ index, vaultPath }: JournalViewProps) {
  const [selectedNote, setSelectedNote] = useState<NoteEntry | null>(null);
  const [targetSelectedPath, setTargetSelectedPath] = useState<string | null>(null);
  const [isCreatingToday, setIsCreatingToday] = useState(false);

  // Filter only journal notes
  const journalNotes = index.notes.filter(n => n.section === 'journal');

  // Swedish Date string helper (YYYY-MM-DD)
  const getTodayStr = () => {
    return new Date().toLocaleDateString('sv-SE');
  };

  // Helper to safely parse YYYY-MM-DD into a local Date object
  const parseLocalDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00');
  };

  // Auto-create today's note on mount if it doesn't exist
  useEffect(() => {
    const todayStr = getTodayStr();
    const todayExists = journalNotes.some(n => n.title === todayStr);

    if (!todayExists && !isCreatingToday && !targetSelectedPath) {
      setIsCreatingToday(true);
      const createToday = async () => {
        try {
          const res = await (window as any).wrriter.createNote('Journal', todayStr);
          if (res.success && res.path) {
            setTargetSelectedPath(res.path);
          }
        } catch (err) {
          console.error('Failed to auto-create today\'s journal note:', err);
        } finally {
          setIsCreatingToday(false);
        }
      };
      createToday();
    }
  }, [journalNotes, isCreatingToday, targetSelectedPath]);

  // Keep selection synchronized with vault index updates
  useEffect(() => {
    if (targetSelectedPath) {
      const found = index.notes.find(n => n.path === targetSelectedPath);
      if (found) {
        setSelectedNote(found);
        setTargetSelectedPath(null);
      }
    } else if (selectedNote) {
      const fresh = index.notes.find(n => n.path === selectedNote.path);
      if (fresh) {
        setSelectedNote(fresh);
      } else {
        setSelectedNote(null);
      }
    } else {
      // If nothing selected, default to today's note if it exists in the index
      const todayStr = getTodayStr();
      const todayNote = index.notes.find(n => n.section === 'journal' && n.title === todayStr);
      if (todayNote) {
        setSelectedNote(todayNote);
      } else if (journalNotes.length > 0) {
        // Fallback to the latest journal note
        const sorted = [...journalNotes].sort((a, b) => b.title.localeCompare(a.title));
        setSelectedNote(sorted[0]);
      }
    }
  }, [index.notes, targetSelectedPath]);

  // Group journal notes by Month Year (e.g. "June 2026")
  const getGroupedNotes = (): JournalGroup[] => {
    const groupsMap: Record<string, NoteEntry[]> = {};

    // Sort notes newest date first (Swedish string sorting matches chronological)
    const sortedNotes = [...journalNotes].sort((a, b) => b.title.localeCompare(a.title));

    sortedNotes.forEach(note => {
      try {
        const dateObj = parseLocalDate(note.title);
        if (isNaN(dateObj.getTime())) return;
        
        const monthLabel = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (!groupsMap[monthLabel]) {
          groupsMap[monthLabel] = [];
        }
        groupsMap[monthLabel].push(note);
      } catch (err) {
        console.error('Failed to parse date for grouping:', note.title, err);
      }
    });

    return Object.entries(groupsMap).map(([monthYearLabel, notes]) => ({
      monthYearLabel,
      notes
    }));
  };

  const groupedNotes = getGroupedNotes();

  const handleCreateCustomDate = async () => {
    const dateInput = prompt('Enter date (YYYY-MM-DD):', getTodayStr());
    if (!dateInput) return;

    // Validate format
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      alert('Please use YYYY-MM-DD format');
      return;
    }

    const dateExists = journalNotes.some(n => n.title === dateInput);
    if (dateExists) {
      const existing = journalNotes.find(n => n.title === dateInput);
      if (existing) setSelectedNote(existing);
      return;
    }

    try {
      const res = await (window as any).wrriter.createNote('Journal', dateInput);
      if (res.success && res.path) {
        setTargetSelectedPath(res.path);
      }
    } catch (err) {
      console.error('Failed to create journal note:', err);
    }
  };

  return (
    <div className={styles.container}>
      {/* Date List Sidebar (Pane 2) */}
      <div className={styles.sidebar}>
        <div className={styles.header}>
          <h1 className={styles.title}>Journal</h1>
          <button 
            onClick={handleCreateCustomDate} 
            className={styles.newBtn} 
            title="Create entry for custom date"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <div className={styles.scrollArea}>
          {groupedNotes.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No journal entries yet</p>
            </div>
          ) : (
            groupedNotes.map(group => (
              <div key={group.monthYearLabel} className={styles.group}>
                <h3 className={styles.groupHeader}>{group.monthYearLabel}</h3>
                <div className={styles.groupList}>
                  {group.notes.map(note => {
                    const isSelected = selectedNote?.path === note.path;
                    const dateObj = parseLocalDate(note.title);
                    const dayNum = dateObj.getDate();
                    const dayName = dateObj.toLocaleString('default', { weekday: 'short' });
                    
                    return (
                      <button
                        key={note.path}
                        onClick={() => setSelectedNote(note)}
                        className={`${styles.noteRow} ${isSelected ? styles.selected : ''}`}
                      >
                        <div className={styles.dateBadge}>
                          <span className={styles.dayNum}>{dayNum}</span>
                          <span className={styles.dayName}>{dayName}</span>
                        </div>
                        <div className={styles.noteMeta}>
                          <span className={styles.noteTitle}>{note.title}</span>
                          <span className={styles.previewText}>
                            {note.preview || 'No content yet'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor Main Pane (Pane 4) */}
      <div className={styles.editorPane}>
        {selectedNote ? (
          <Editor
            note={selectedNote}
            index={index}
            onNoteSelect={setSelectedNote}
          />
        ) : (
          <div className={styles.placeholder}>
            Select a journal entry or create one to start writing
          </div>
        )}
      </div>
    </div>
  );
}
