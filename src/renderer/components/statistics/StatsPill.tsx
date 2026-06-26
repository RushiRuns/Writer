import React, { useState } from 'react';
import { NoteEntry, VaultIndex } from '../../../shared/ipc-types';
import styles from './StatsPill.module.css';

interface StatsPillProps {
  content: string;
  index: VaultIndex;
}

export function calculateStreak(notes: NoteEntry[]): number {
  const journalDates = notes
    .filter(n => n.section === 'journal')
    .map(n => n.title) // YYYY-MM-DD
    .filter(t => /^\d{4}-\d{2}-\d{2}$/.test(t))
    .sort();

  if (journalDates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkDate = new Date(today);
  const formatDate = (d: Date) => {
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${dy}`;
  };

  let streak = 0;
  
  if (journalDates.includes(formatDate(checkDate))) {
    streak = 1;
    checkDate.setDate(checkDate.getDate() - 1);
    while (journalDates.includes(formatDate(checkDate))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  } else {
    // Check if streak is alive from yesterday
    checkDate.setDate(checkDate.getDate() - 1);
    if (journalDates.includes(formatDate(checkDate))) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
      while (journalDates.includes(formatDate(checkDate))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }
  }

  return streak;
}

export default function StatsPill({ content, index }: StatsPillProps) {
  const [showModal, setShowModal] = useState(false);

  // Live counts for active note content
  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const totalNotes = index.notes.length;
  const streak = calculateStreak(index.notes);

  // Stats Modal Calculations
  const getContributionGridData = () => {
    const grid = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Last 12 weeks (84 days)
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const dy = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yr}-${mo}-${dy}`;
      
      const hasJournal = index.notes.some(n => n.section === 'journal' && n.title === dateStr);
      grid.push({ dateStr, hasJournal });
    }
    return grid;
  };

  const getWordCountHistory = () => {
    const history = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const startOfDay = d.getTime();
      const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

      // Sum word counts of notes modified on this day
      const words = index.notes
        .filter(n => {
          const modTime = new Date(n.modified).getTime();
          return modTime >= startOfDay && modTime < endOfDay;
        })
        .reduce((sum, n) => sum + n.wordCount, 0);

      history.push({
        label: d.toLocaleDateString(undefined, { weekday: 'short' }),
        words
      });
    }
    return history;
  };

  return (
    <>
      {/* Statistics floating pill */}
      <div 
        onClick={() => setShowModal(true)}
        className={styles.pill}
      >
        <span>✍ {wordCount} words</span>
        <span className={styles.dot}>·</span>
        <span>Ω {charCount} chars</span>
        <span className={styles.dot}>·</span>
        <span>📄 {totalNotes} notes</span>
        {streak > 0 && (
          <>
            <span className={styles.dot}>·</span>
            <span className={styles.streakText}>🔥 {streak} day streak</span>
          </>
        )}
      </div>

      {/* Expanded Statistics Modal */}
      {showModal && (
        <div className={`${styles.backdrop} animate-fade-in`}>
          <div className={styles.modal}>
            
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className={styles.closeBtn}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className={styles.modalTitle}>
              📊 Writing Insights
            </h2>

            {/* Summary Row */}
            <div className={styles.statsGrid}>
              <div className={styles.gridBlock}>
                <span className={styles.blockLabel}>Total Notes</span>
                <span className={styles.blockVal}>{totalNotes}</span>
              </div>
              <div className={styles.gridBlock}>
                <span className={styles.blockLabel}>Writing Streak</span>
                <span className={`${styles.blockVal} ${styles.streakText}`}>🔥 {streak} Days</span>
              </div>
              <div className={styles.gridBlock}>
                <span className={styles.blockLabel}>Drawings</span>
                <span className={styles.blockVal}>{index.drawings.length}</span>
              </div>
            </div>

            {/* Word Count History Chart (7 Days) */}
            <div className="mb-6">
              <h3 className={styles.sectionHeader}>Words Written (Last 7 Days)</h3>
              <div className={styles.chartWrapper}>
                {getWordCountHistory().map((item, idx) => {
                  const maxWords = Math.max(...getWordCountHistory().map(h => h.words), 100);
                  const barHeightPercent = Math.max(8, Math.min(100, (item.words / maxWords) * 100));
                  return (
                    <div key={idx} className={styles.chartCol}>
                      <span className={styles.chartVal}>{item.words}</span>
                      <div 
                        style={{ height: `${barHeightPercent}px` }} 
                        className={styles.chartBar}
                      />
                      <span className={styles.chartLabel}>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Contribution Grid (12 Weeks) */}
            <div>
              <h3 className={styles.sectionHeader}>Journal Activity (Last 12 Weeks)</h3>
              <div className={styles.contribGrid}>
                {getContributionGridData().map((day, idx) => (
                  <div
                    key={idx}
                    title={`${day.dateStr}${day.hasJournal ? ' (Written)' : ' (No entry)'}`}
                    className={`${styles.contribSquare} ${day.hasJournal ? styles.active : ''}`}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
