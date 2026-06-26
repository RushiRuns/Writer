import React, { useState } from 'react';
import { NoteEntry, VaultIndex } from '../../../shared/ipc-types';

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
        className="fixed bottom-4 right-4 z-40 pill-shape bg-[#242424] border border-white/10 hover:bg-[#2E2E2E] hover:border-brand-amber/30 text-neutral-300 rounded-full px-4 py-2 text-xs flex items-center gap-3 cursor-pointer transition-all shadow-lg select-none"
      >
        <span>✍ {wordCount} words</span>
        <span className="text-white/15">·</span>
        <span>Ω {charCount} chars</span>
        <span className="text-white/15">·</span>
        <span>📄 {totalNotes} notes</span>
        {streak > 0 && (
          <>
            <span className="text-white/15">·</span>
            <span className="text-brand-amber font-medium">🔥 {streak} day streak</span>
          </>
        )}
      </div>

      {/* Expanded Statistics Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-950 border border-white/10 rounded-lg p-6 max-w-lg w-full shadow-2xl relative">
            
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-semibold text-neutral-100 mb-4 flex items-center gap-2">
              📊 Writing Insights
            </h2>

            {/* Summary Row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-neutral-900 border border-white/5 p-3 rounded text-center">
                <span className="text-xs text-neutral-500 block">Total Notes</span>
                <span className="text-lg font-mono font-bold text-neutral-200">{totalNotes}</span>
              </div>
              <div className="bg-neutral-900 border border-white/5 p-3 rounded text-center">
                <span className="text-xs text-neutral-500 block">Writing Streak</span>
                <span className="text-lg font-mono font-bold text-brand-amber">🔥 {streak} Days</span>
              </div>
              <div className="bg-neutral-900 border border-white/5 p-3 rounded text-center">
                <span className="text-xs text-neutral-500 block">Drawings</span>
                <span className="text-lg font-mono font-bold text-neutral-200">{index.drawings.length}</span>
              </div>
            </div>

            {/* Word Count History Chart (7 Days) */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Words Written (Last 7 Days)</h3>
              <div className="bg-neutral-900/50 border border-white/5 rounded p-4 h-32 flex items-end justify-between">
                {getWordCountHistory().map((item, idx) => {
                  const maxWords = Math.max(...getWordCountHistory().map(h => h.words), 100);
                  const barHeightPercent = Math.max(8, Math.min(100, (item.words / maxWords) * 100));
                  return (
                    <div key={idx} className="flex flex-col items-center flex-grow">
                      <span className="text-[10px] text-neutral-400 font-mono mb-1">{item.words}</span>
                      <div 
                        style={{ height: `${barHeightPercent}px` }} 
                        className="w-4 bg-gradient-to-t from-brand-amber/40 to-brand-amber rounded-t transition-all duration-500 shadow-md shadow-brand-amber/10"
                      />
                      <span className="text-[10px] text-neutral-500 font-mono mt-1.5">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Contribution Grid (12 Weeks) */}
            <div>
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Journal Activity (Last 12 Weeks)</h3>
              <div className="bg-neutral-900/50 border border-white/5 rounded p-4 flex flex-wrap gap-1 justify-center">
                {getContributionGridData().map((day, idx) => (
                  <div
                    key={idx}
                    title={`${day.dateStr}${day.hasJournal ? ' (Written)' : ' (No entry)'}`}
                    className={`w-3.5 h-3.5 rounded-sm transition-colors duration-200 ${
                      day.hasJournal 
                        ? 'bg-brand-amber shadow shadow-brand-amber/40' 
                        : 'bg-neutral-800 hover:bg-neutral-700'
                    }`}
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
