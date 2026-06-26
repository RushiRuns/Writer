import React, { useState, useEffect, useRef } from 'react';
import { Save, X, Edit3 } from 'lucide-react';
import styles from './FloatingWindow.module.css';

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
    <div className={`${styles.container} animate-fade-in`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Edit3 size={15} />
          <span className={styles.headerText}>
            Quick Capture Note
          </span>
        </div>
        <button
          onClick={handleCancel}
          className={styles.closeBtn}
          title="Close (ESC)"
        >
          <X size={14} />
        </button>
      </div>

      {/* Fields */}
      <div className={styles.fields}>
        <input
          ref={titleRef}
          type="text"
          placeholder="Note Title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSaving}
          className={styles.input}
        />

        <textarea
          placeholder="Write your thoughts here... (Ctrl+Enter to Save)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isSaving}
          className={styles.textarea}
        />
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className={styles.cancelBtn}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={styles.saveBtn}
        >
          <Save size={13} />
          <span>{isSaving ? 'Saving...' : 'Save Note'}</span>
        </button>
      </div>
    </div>
  );
}
