import React, { useState } from 'react';
import { VaultIndex } from '../../../shared/ipc-types';
import RoutingToolbar from './RoutingToolbar';

interface InboxViewProps {
  index: VaultIndex;
  vaultPath: string;
}

export default function InboxView({ index, vaultPath }: InboxViewProps) {
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
    <div className="flex-grow flex flex-col h-full bg-black relative">
      {/* Scrollable list of Inbox notes */}
      <div className="flex-grow overflow-y-auto px-6 py-4 pb-24">
        {inboxNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 animate-fade-in">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-neutral-900 border border-brand-amber/20 text-brand-amber mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-200">All clear ✓</h3>
            <p className="text-sm text-neutral-500 max-w-xs mt-1">
              Your inbox is empty. Capture any fleeting thoughts below to process them later.
            </p>
          </div>
        ) : (
          <div className="flex flex-col max-w-2xl mx-auto gap-2">
            {inboxNotes.map((note) => {
              const isSelected = selectedNotePath === note.path;
              const isAnimatingOut = animatingOutPath === note.path;

              return (
                <div
                  key={note.path}
                  style={{ transitionProperty: 'max-height, opacity, padding, margin, border' }}
                  className={`transition-all duration-300 ease-out overflow-hidden border border-white/5 rounded-md ${
                    isAnimatingOut 
                      ? 'max-h-0 opacity-0 py-0 my-0 border-none pointer-events-none' 
                      : 'max-h-48 opacity-100 p-4'
                  } ${
                    isSelected 
                      ? 'border-brand-amber/40 bg-neutral-900/40 shadow-md shadow-brand-amber/5' 
                      : 'bg-neutral-950 hover:bg-neutral-900/60'
                  }`}
                >
                  <div 
                    onClick={() => {
                      if (!isAnimatingOut) {
                        setSelectedNotePath(isSelected ? null : note.path);
                      }
                    }}
                    className="cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-semibold text-neutral-200 text-base">{note.title}</span>
                      <span className="text-xs text-neutral-500 font-mono">{formatTimestamp(note.created)}</span>
                    </div>
                    {/* Small preview block if exists */}
                    {note.preview && (
                      <p className="text-xs text-neutral-400 mt-1 truncate max-w-xl italic">
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
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black to-transparent pt-6 pb-6 px-6">
        <form onSubmit={handleQuickCaptureSubmit} className="max-w-2xl mx-auto">
          <div className="relative flex items-center bg-neutral-900 border border-white/10 focus-within:border-brand-amber/50 rounded-full px-4 py-2.5 transition-all duration-200">
            <input
              type="text"
              value={quickCaptureText}
              onChange={(e) => setQuickCaptureText(e.target.value)}
              placeholder="Dump your thoughts..."
              className="flex-grow bg-transparent text-sm text-neutral-100 outline-none border-none placeholder-neutral-500 mr-2"
            />
            <button
              type="submit"
              disabled={!quickCaptureText.trim()}
              className="flex-shrink-0 text-brand-amber disabled:text-neutral-600 transition-colors p-1"
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
