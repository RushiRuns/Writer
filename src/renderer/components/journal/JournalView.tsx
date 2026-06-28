import React, { useState, useEffect } from 'react';
import { NoteEntry, VaultIndex } from '../../../shared/ipc-types';
import Editor from '../editor/Editor';
import { Plus, Calendar } from 'lucide-react';
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

  const handleCreateTodayEntry = async () => {
    const todayStr = getTodayStr();
    const todayExists = journalNotes.some(n => n.title === todayStr);

    if (todayExists) {
      const existing = journalNotes.find(n => n.title === todayStr);
      if (existing) setSelectedNote(existing);
      return;
    }

    try {
      setIsCreatingToday(true);
      const res = await (window as any).wrriter.createNote('Journal', todayStr);
      if (res.success && res.path) {
        setTargetSelectedPath(res.path);
      }
    } catch (err) {
      console.error("Failed to create today's journal note:", err);
    } finally {
      setIsCreatingToday(false);
    }
  };

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState('');

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

  const handleDatePickerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value; // Format is YYYY-MM-DD
    if (!selectedDate) return;

    const dateExists = journalNotes.some(n => n.title === selectedDate);
    if (dateExists) {
      const existing = journalNotes.find(n => n.title === selectedDate);
      if (existing) setSelectedNote(existing);
      setShowDatePicker(false);
      return;
    }

    try {
      const res = await (window as any).wrriter.createNote('Journal', selectedDate);
      if (res.success && res.path) {
        setTargetSelectedPath(res.path);
      }
    } catch (err) {
      console.error('Failed to create journal note:', err);
    } finally {
      setShowDatePicker(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Date List Sidebar (Pane 2) */}
      <div className={styles.sidebar}>
        <div className={styles.header}>
          <button
            onClick={handleCreateTodayEntry}
            disabled={isCreatingToday}
            className={styles.addTodayBtn}
            title="Create today's journal entry"
          >
            <Plus size={14} />
            <span>Add Today's Entry</span>
          </button>
          
          <button 
            onClick={() => {
              setShowDatePicker(!showDatePicker);
              if (!showDatePicker) {
                setDatePickerValue(getTodayStr());
              }
            }} 
            className={styles.customDateBtn} 
            title="Create entry for custom date"
          >
            <Calendar size={14} />
          </button>
        </div>

        <div className={styles.scrollArea}>
          {showDatePicker && (
            <div className={styles.datePickerWrapper}>
              <input
                type="date"
                value={datePickerValue}
                onChange={handleDatePickerChange}
                onBlur={() => setShowDatePicker(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowDatePicker(false);
                }}
                autoFocus
                className={styles.datePickerInput}
              />
            </div>
          )}

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
