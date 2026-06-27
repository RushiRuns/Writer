import React, { useState } from 'react';
import { VaultIndex } from '../../../shared/ipc-types';
import RoutingToolbar from './RoutingToolbar';
import styles from './InboxView.module.css';

interface InboxViewProps {
  header: React.ReactNode;
  index: VaultIndex;
  vaultPath: string;
}

export default function InboxView({ header, index, vaultPath }: InboxViewProps) {
  const [selectedNotePath, setSelectedNotePath] = useState<string | null>(null);
  const [animatingOutPath, setAnimatingOutPath] = useState<string | null>(null);
  const [quickCaptureText, setQuickCaptureText] = useState('');

  // Filter notes that belong to the inbox section, sorted by creation date (newest first)
  const inboxNotes = index.notes
    .filter(n => n.section === 'inbox')
    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

  const handleQuickCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = quickCaptureText.trim();
    if (!text) return;

    try {
      // In US2 Quick Capture, pressing enter creates a new note in /Inbox
      // with the sanitized typed text as the title, and the content as empty (or body empty).
      // Let's create it.
      await (window as any).wrriter.createNote('Inbox', text);
      setQuickCaptureText('');
    } catch (err) {
      console.error('Failed to create quick capture note:', err);
    }
  };

  const handleActionStart = (notePath: string) => {
    setAnimatingOutPath(notePath);
  };

  const handleActionComplete = () => {
    setSelectedNotePath(null);
    setAnimatingOutPath(null);
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className={`flex-grow flex flex-col h-full relative ${styles.container}`}>
      {header}
      {/* Scrollable list of Inbox notes */}
      <div className={styles.listArea}>
        {inboxNotes.length === 0 ? (
          <div className={`${styles.emptyState} animate-fade-in`}>
            <div className={styles.emptyIcon}>
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className={styles.emptyTitle}>All clear ✓</h3>
            <p className={styles.emptyDesc}>
              Your inbox is empty. Capture any fleeting thoughts below to process them later.
            </p>
          </div>
        ) : (
          <div className={styles.notesList}>
            {inboxNotes.map((note) => {
              const isSelected = selectedNotePath === note.path;
              const isAnimatingOut = animatingOutPath === note.path;

              return (
                <div
                  key={note.path}
                  style={{ transitionProperty: 'max-height, opacity, padding, margin, border' }}
                  className={`${styles.noteCard} ${
                    isAnimatingOut ? styles.animatingOut : styles.normal
                  } ${isSelected ? styles.selected : ''}`}
                >
                  <div 
                    onClick={() => {
                      if (!isAnimatingOut) {
                        setSelectedNotePath(isSelected ? null : note.path);
                      }
                    }}
                    className="cursor-pointer flex flex-col"
                  >
                    <div className={styles.noteHeader}>
                      <span className={styles.noteTitle}>{note.title}</span>
                      <span className={styles.noteDate}>{formatTimestamp(note.created)}</span>
                    </div>
                    {/* Small preview block if exists */}
                    {note.preview && (
                      <p className={styles.notePreview}>
                        "{note.preview}"
                      </p>
                    )}
                  </div>

                  {/* Render the Routing Toolbar below if selected */}
                  {isSelected && !isAnimatingOut && (
                    <RoutingToolbar
                      note={note}
                      index={index}
                      vaultPath={vaultPath}
                      onActionStart={() => handleActionStart(note.path)}
                      onActionComplete={handleActionComplete}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Capture bottom box */}
      <div className={styles.quickCaptureContainer}>
        <form onSubmit={handleQuickCaptureSubmit} className={styles.quickCaptureForm}>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              value={quickCaptureText}
              onChange={(e) => setQuickCaptureText(e.target.value)}
              placeholder="Dump your thoughts..."
              className={styles.quickCaptureInput}
            />
            <button
              type="submit"
              disabled={!quickCaptureText.trim()}
              className={styles.submitBtn}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

