import React, { useState } from 'react';
import { VaultIndex } from '../../../shared/ipc-types';
import RoutingToolbar from './RoutingToolbar';
import { Plus, ArrowUp } from 'lucide-react';
import styles from './InboxView.module.css';

interface InboxViewProps {
  index: VaultIndex;
  vaultPath: string;
}

export default function InboxView({ index, vaultPath }: InboxViewProps) {
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
    setAnimatingOutPath(null);
  };

  return (
    <div className={`flex-grow flex flex-col h-full relative ${styles.container}`}>
      {/* Scrollable list of Inbox notes */}
      <div className={styles.listArea}>
        <h1 className={styles.viewTitle}>Inbox</h1>
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
              const isAnimatingOut = animatingOutPath === note.path;

              return (
                <div
                  key={note.path}
                  style={{ transitionProperty: 'max-height, opacity, padding, margin, border' }}
                  className={`${styles.noteCard} ${
                    isAnimatingOut ? styles.animatingOut : styles.normal
                  }`}
                >
                  <div className="flex flex-col relative h-full">
                    <div className={styles.noteHeader}>
                      <span className={styles.noteTitle}>{note.title}</span>
                      <div className={styles.toolbarWrapper} onClick={(e) => e.stopPropagation()}>
                        <RoutingToolbar
                          note={note}
                          index={index}
                          vaultPath={vaultPath}
                          onActionStart={() => handleActionStart(note.path)}
                          onActionComplete={handleActionComplete}
                        />
                      </div>
                    </div>
                    {/* Small preview block if exists */}
                    {note.preview && (
                      <p className={styles.notePreview}>
                        "{note.preview}"
                      </p>
                    )}
                  </div>
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
            <Plus size={16} className={styles.plusIcon} />
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
              <ArrowUp size={16} />
            </button>
          </div>
          <div className={styles.helperText}>Press Enter to save</div>
        </form>
      </div>
    </div>
  );
}

