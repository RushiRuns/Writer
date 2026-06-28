import React, { useState, useEffect } from 'react';
import { Bell, BellOff, CalendarClock, ArrowRight, ToggleLeft, ToggleRight } from 'lucide-react';
import { VaultIndex, NoteEntry } from '../../../shared/ipc-types';
import styles from './NoteReminderSettings.module.css';

interface Props {
  index: VaultIndex;
  onNavigateNote: (path: string) => void;
}

function formatRelative(isoDate: string): string {
  const now = Date.now();
  const target = new Date(isoDate).getTime();
  const diffMs = target - now;
  const diffMin = Math.round(diffMs / 60000);
  const diffHrs = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (diffMs < 0) {
    const past = Math.abs(diffDays);
    return past === 0 ? 'Today (overdue)' : `${past}d ago (overdue)`;
  }
  if (diffMin < 60) return `in ${diffMin} min`;
  if (diffHrs < 24) return `in ${diffHrs} hr`;
  if (diffDays === 1) return 'tomorrow';
  if (diffDays < 7) return `in ${diffDays} days`;
  const weeks = Math.round(diffDays / 7);
  return `in ${weeks} wk`;
}

function isOverdue(isoDate: string): boolean {
  return new Date(isoDate).getTime() < Date.now();
}

export default function NoteReminderSettings({ index, onNavigateNote }: Props) {
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await (window as any).wrriter.getSettings();
        if (s) setRemindersEnabled(s.remindersEnabled ?? true);
      } catch (err) {
        console.error('Failed to load reminder settings:', err);
      }
    };
    load();
  }, []);

  const handleToggle = async () => {
    const next = !remindersEnabled;
    setRemindersEnabled(next);
    try {
      await (window as any).wrriter.setSettings({ remindersEnabled: next });
      setFeedback('Saved ✓');
      setTimeout(() => setFeedback(null), 2000);
    } catch (err) {
      setFeedback('Error saving');
    }
  };

  // Sort reminders: overdue first, then by date ascending
  const reminders: NoteEntry[] = [...index.reminders].sort((a, b) => {
    const aDate = new Date(a.reminder!).getTime();
    const bDate = new Date(b.reminder!).getTime();
    return aDate - bDate;
  });

  return (
    <div className={styles.card}>
      {/* Global toggle */}
      <div className={styles.toggleRow}>
        <div className={styles.rowLeft}>
          <div className={styles.rowHeader}>
            {remindersEnabled
              ? <Bell size={13} className={styles.bellIcon} />
              : <BellOff size={13} className={styles.bellIconOff} />}
            <span className={styles.rowTitle}>Note Reminders</span>
          </div>
          <p className={styles.rowDesc}>
            Fire desktop notifications at the time set in a note's <code>reminder:</code> frontmatter field.
          </p>
        </div>
        <button className={styles.toggleBtn} onClick={handleToggle}>
          {remindersEnabled
            ? <ToggleRight size={28} className={styles.toggleOn} />
            : <ToggleLeft size={28} className={styles.toggleOff} />}
        </button>
      </div>

      {feedback && <p className={styles.feedback}>{feedback}</p>}

      <div className={styles.divider} />

      {/* Upcoming reminders list */}
      <div className={styles.listHeader}>
        <CalendarClock size={13} className={styles.listHeaderIcon} />
        <span className={styles.listHeaderTitle}>Upcoming Reminders</span>
        <span className={styles.listHeaderCount}>{reminders.length}</span>
      </div>

      {reminders.length === 0 ? (
        <div className={styles.emptyState}>
          <Bell size={24} className={styles.emptyIcon} />
          <p className={styles.emptyText}>No reminders set</p>
          <p className={styles.emptyHint}>
            Add a <code>reminder: 2026-06-30T09:00:00Z</code> field to any note's frontmatter.
          </p>
        </div>
      ) : (
        <ul className={styles.reminderList}>
          {reminders.map((note) => (
            <li
              key={note.path}
              className={`${styles.reminderItem} ${isOverdue(note.reminder!) ? styles.reminderOverdue : ''}`}
            >
              <div className={styles.reminderInfo}>
                <span className={styles.reminderTitle}>{note.title}</span>
                <span className={styles.reminderDate}>{formatRelative(note.reminder!)}</span>
              </div>
              <button
                className={styles.jumpBtn}
                title="Jump to note"
                onClick={() => onNavigateNote(note.path)}
              >
                <ArrowRight size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
