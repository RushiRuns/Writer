import React, { useState, useEffect, useRef } from 'react';
import { Save, X, Edit3 } from 'lucide-react';

export default function FloatingWindow() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Focus title input on mount
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const handleCancel = async () => {
    try {
      await (window as any).wrriter.closeWindow();
    } catch (err) {
      console.error('Failed to close floating window:', err);
    }
  };

  const handleSave = async () => {
    const titleToSave = title.trim() || 'Quick Note';
    setIsSaving(true);

    try {
      // 1. Create a blank note inside the Inbox folder
      const res = await (window as any).wrriter.createNote('Inbox', titleToSave);
      
      if (res.success && res.path) {
        // 2. Write the typed content and standard frontmatter into it
        await (window as any).wrriter.writeNote(res.path, content, {
          title: titleToSave,
          created: new Date().toISOString(),
          tags: [],
          reminder: null,
          completed: false,
          completed_at: null
        });
      }
      
      // 3. Close the floating window on completion
      await (window as any).wrriter.closeWindow();
    } catch (err) {
      console.error('Failed to save quick note:', err);
      setIsSaving(false);
    }
  };

  // Keyboard shortcut listener inside the floating window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter saves the note
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [title, content]);

  return (
    <div className="w-full h-full bg-[#0a0a0a]/95 border border-brand-amber/35 rounded-xl p-4 flex flex-col font-ui shadow-2xl backdrop-blur-xl animate-fade-in select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
        <div className="flex items-center gap-2 text-brand-amber">
          <Edit3 size={15} />
          <span className="text-xs font-semibold uppercase tracking-wider font-mono">
            Quick Capture Note
          </span>
        </div>
        <button
          onClick={handleCancel}
          className="text-neutral-500 hover:text-neutral-300 p-0.5 rounded transition-colors"
          title="Close (ESC)"
        >
          <X size={14} />
        </button>
      </div>

      {/* Fields */}
      <div className="flex-grow flex flex-col gap-3">
        <input
          ref={titleRef}
          type="text"
          placeholder="Note Title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSaving}
          className="bg-[#121212] border border-white/5 focus:border-brand-amber/50 rounded-lg px-3 py-2 text-xs text-neutral-200 outline-none w-full font-sans transition-all"
        />

        <textarea
          placeholder="Write your thoughts here... (Ctrl+Enter to Save)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isSaving}
          className="flex-grow bg-[#121212] border border-white/5 focus:border-brand-amber/50 rounded-lg px-3 py-2 text-xs text-neutral-200 outline-none w-full font-sans resize-none min-h-[120px] transition-all"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2.5 mt-4 pt-2.5 border-t border-white/5">
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="text-neutral-400 hover:text-neutral-200 px-3.5 py-1.5 rounded-lg text-xs font-medium font-ui transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 bg-brand-amber hover:bg-amber-600 disabled:bg-neutral-800 disabled:text-neutral-600 text-black px-4 py-1.5 rounded-lg text-xs font-semibold font-ui shadow transition-all border border-brand-amber/20"
        >
          <Save size={13} />
          <span>{isSaving ? 'Saving...' : 'Save Note'}</span>
        </button>
      </div>
    </div>
  );
}
