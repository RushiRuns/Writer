import React, { useState, useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { autocompletion } from '@codemirror/autocomplete';

import { NoteEntry, VaultIndex } from '../../../shared/ipc-types';
import StatsPill from '../statistics/StatsPill';
import { hideMarkdownPlugin, hideMarkdownStyles } from './hideMarkdown';
import { createWikiLinkAutocomplete } from './wikiLinkAutocomplete';
import { useAutoSave } from './useAutoSave';
import { useTimer } from '../../contexts/TimerContext';
import AudioManager from '../ambient-sounds/AudioManager';
import { 
  X, 
  Plus, 
  Bell, 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  Shuffle,
  Trash2,
  Calendar
} from 'lucide-react';
import styles from './Editor.module.css';

interface EditorProps {
  note: NoteEntry;
  index: VaultIndex;
  onNoteSelect: (note: NoteEntry | null) => void;
  onClose?: () => void;
}

export default function Editor({ note, index, onNoteSelect, onClose }: EditorProps) {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [reminder, setReminder] = useState<string | null>(null);
  const [goal, setGoal] = useState<number>(0);

  // Inspector panel UI states
  const [showSidebar, setShowSidebar] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newTagText, setNewTagText] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    metadata: true,
    session: true,
    stats: true,
    actions: true
  });

  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Timer Context
  const {
    timeLeft,
    isActive: isTimerActive,
    mode: timerMode,
    sessionsCompleted,
    start: startTimer,
    pause: pauseTimer,
    reset: resetTimer,
    skip: skipTimer
  } = useTimer();

  // Extract inline #tagname tags from content body
  const extractInlineTags = (text: string): string[] => {
    const matches = text.matchAll(/#([a-zA-Z0-9_-]+)/g);
    const resultTags = new Set<string>();
    for (const match of matches) {
      resultTags.add(match[1].toLowerCase());
    }
    return Array.from(resultTags);
  };

  // Perform full write-save operation, checking if H1 heading title requires filename renaming
  const saveNote = async (
    text: string, 
    currentTags: string[], 
    currentReminder: string | null, 
    currentGoal = goal
  ) => {
    try {
      const lines = text.split('\n');
      const firstLine = lines[0] || '';
      
      let parsedTitle = '';
      let bodyText = text;

      if (firstLine.startsWith('# ')) {
        parsedTitle = firstLine.slice(2).trim();
        bodyText = lines.slice(1).join('\n');
      }

      // Sync inline hashtags from body with frontmatter tags
      const inlineTags = extractInlineTags(bodyText);
      const mergedTags = Array.from(new Set([...currentTags, ...inlineTags]));

      const nextFrontmatter = {
        title: note.section === 'journal' ? note.title : (parsedTitle || note.title),
        created: note.created,
        tags: mergedTags,
        reminder: currentReminder,
        completed: note.completed,
        completed_at: note.completedAt,
        goal: currentGoal
      };

      if (parsedTitle && parsedTitle !== note.title && note.section !== 'journal') {
        // Trigger rename
        const res = await (window as any).wrriter.writeNote(note.path, bodyText, nextFrontmatter, parsedTitle);
        if (res.success) {
          // Keep selection synchronized with new path
          const fresh = index.notes.find(n => n.path === res.path);
          if (fresh) {
            onNoteSelect(fresh);
          }
        }
      } else {
        await (window as any).wrriter.writeNote(note.path, bodyText, nextFrontmatter);
      }
    } catch (err) {
      console.error('Failed to auto-save note:', err);
    }
  };

  // Debounced auto-save hook
  const { forceSave } = useAutoSave(
    content,
    (nextText) => {
      saveNote(nextText, tags, reminder, goal);
    },
    2000
  );

  // Initialize CodeMirror once per note path
  useEffect(() => {
    const container = editorRef.current;
    if (!container) return;

    const initEditor = async () => {
      try {
        const res = await (window as any).wrriter.readNote(note.path);
        let displayContent = res.content;
        
        // Prepend H1 header if it's missing on disk
        if (!displayContent.trim().startsWith('# ')) {
          displayContent = `# ${note.title}\n\n${displayContent.trim()}`;
        }
        
        setContent(displayContent);
        setTags(res.frontmatter.tags || []);
        setReminder(res.frontmatter.reminder || null);
        setGoal(res.frontmatter.goal || 0);

        if (viewRef.current) {
          viewRef.current.destroy();
        }

        const state = EditorState.create({
          doc: displayContent,
          extensions: [
            markdown(),
            autocompletion({ override: [createWikiLinkAutocomplete(index.notes)] }),
            hideMarkdownPlugin,
            hideMarkdownStyles,
            EditorView.lineWrapping,
            EditorView.theme({
              '&': { height: '100%', fontSize: '15px', fontFamily: 'var(--font-ui)', lineHeight: '1.75' },
              '.cm-scroller': { overflow: 'auto', display: 'flex', flexDirection: 'column' },
              '.cm-content': { 
                padding: '2rem 6rem 60px 6rem', 
                maxWidth: 'none', 
                color: 'var(--text-primary)', 
                caretColor: 'var(--accent-primary)',
                minHeight: '100%',
                boxSizing: 'border-box'
              },
              '&.cm-focused': { outline: 'none' },
              '.cm-cursor, .cm-dropCursor': { borderLeftWidth: '2px', borderLeftStyle: 'solid', borderLeftColor: 'var(--accent-primary)' }
            }),
            EditorView.updateListener.of((update) => {
              if (update.docChanged) {
                const nextText = update.state.doc.toString();
                setContent(nextText);
              }
            }),
            EditorView.domEventHandlers({
              click(event) {
                const target = event.target as HTMLElement;
                if (target.classList.contains('cm-wikilink-pill')) {
                  const linkTitle = target.innerText.trim();
                  const targetNote = index.notes.find(
                    n => n.title.toLowerCase() === linkTitle.toLowerCase()
                  );
                  if (targetNote) {
                    onNoteSelect(targetNote);
                  }
                }
              }
            })
          ]
        });

        const view = new EditorView({
          state,
          parent: container
        });
        viewRef.current = view;
      } catch (err) {
        console.error('Failed to load note content:', err);
      }
    };

    initEditor();

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [note.path]);

  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags);
    saveNote(content, newTags, reminder, goal);
  };

  const handleReminderChange = (newReminder: string | null) => {
    setReminder(newReminder);
    saveNote(content, tags, newReminder, goal);
  };

  const handleGoalChange = (newGoal: number) => {
    setGoal(newGoal);
    saveNote(content, tags, reminder, newGoal);
  };

  const handleEditorBlur = () => {
    forceSave();
  };

  // Tag Management Handlers
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = newTagText.trim().toLowerCase().replace(/#/g, '');
    if (cleanTag && !tags.includes(cleanTag)) {
      handleTagsChange([...tags, cleanTag]);
      setNewTagText('');
      setShowAddTag(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleTagsChange(tags.filter(t => t !== tagToRemove));
  };

  // Reminder Date Handlers
  const handleReminderDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    handleReminderChange(val ? new Date(val).toISOString() : null);
  };

  const formatReminderDate = (isoString: string | null) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      
      if (date.toDateString() === today.toDateString()) {
        return `Today, ${timeStr}`;
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow, ${timeStr}`;
      } else {
        return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${timeStr}`;
      }
    } catch {
      return '';
    }
  };

  // Quick Actions Handlers
  const handleCopyNote = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy note content:', err);
    }
  };

  const handleRandomNote = () => {
    const validNotes = index.notes.filter(n => n.path !== note.path);
    if (validNotes.length > 0) {
      const random = validNotes[Math.floor(Math.random() * validNotes.length)];
      onNoteSelect(random);
    }
  };

  const handleDeleteNote = async () => {
    if (confirm(`Are you sure you want to delete note "${note.title}"?`)) {
      try {
        await (window as any).wrriter.deleteNote(note.path);
        onNoteSelect(null);
      } catch (err) {
        console.error('Failed to delete note:', err);
      }
    }
  };

  const toggleSection = (sect: string) => {
    setOpenSections(prev => ({ ...prev, [sect]: !prev[sect] }));
  };

  // Live Stats calculations
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const lineCount = content.split('\n').filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200)); // 200 wpm
  const goalProgress = goal > 0 ? Math.min(100, Math.round((wordCount / goal) * 100)) : 0;

  const formatTimerTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`${styles.container} animate-fade-in`}>
      <div className={styles.mainWorkspace}>
        {/* CodeMirror Workspace container */}
        <div 
          ref={editorRef} 
          onBlur={handleEditorBlur}
          className={styles.editorArea}
        />

        {/* Hover right-edge squeeze toggle button */}
        <div 
          className={`${styles.edgeToggleWrapper} ${showSidebar ? styles.sidebarOpen : ''}`}
          onClick={() => setShowSidebar(!showSidebar)}
        >
          <button className={styles.edgeToggleBtn} title={showSidebar ? "Close inspector" : "Open inspector"}>
            {showSidebar ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>

        {/* Live Statistics Pill Overlay (only visible when sidebar is closed) */}
        {!showSidebar && (
          <StatsPill content={content} index={index} />
        )}
      </div>

      {/* Inspector Sidebar Pane */}
      {showSidebar && (
        <div className={styles.inspectorSidebar}>
          {/* Header */}
          <div className={styles.sidebarHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span className={styles.sidebarTitle}>Inspector</span>
              <AudioManager />
            </div>
            <button 
              onClick={() => setShowSidebar(false)} 
              className={styles.sidebarCloseBtn}
              title="Close inspector"
            >
              <X size={14} />
            </button>
          </div>

          <div className={styles.sidebarContent}>
            {/* ACCORDION 1: METADATA (TAGS & REMINDERS) */}
            <div className={styles.accordionSection}>
              <button onClick={() => toggleSection('metadata')} className={styles.accordionHeader}>
                <span className={styles.accordionTitle}>Note Info</span>
                {openSections.metadata ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {openSections.metadata && (
                <div className={styles.accordionBody}>
                  {/* Note Folder Info */}
                  <div className={styles.sidebarSectionGroup}>
                    <label className={styles.sidebarLabel}>Folder</label>
                    <span className={styles.folderNameText}>
                      {note.folder === '.' ? 'Notes Root' : note.folder}
                    </span>
                  </div>

                  {/* Tags Manager */}
                  <div className={styles.sidebarSectionGroup}>
                    <label className={styles.sidebarLabel}>Tags</label>
                    <div className={styles.tagsContainer}>
                      {tags.map(tag => (
                        <span key={tag} className={styles.tagPill}>
                          #{tag}
                          <button onClick={() => handleRemoveTag(tag)} className={styles.removeTagBtn} title="Remove tag">
                            <X size={10} />
                          </button>
                        </span>
                      ))}

                      {showAddTag ? (
                        <form onSubmit={handleAddTag} className={styles.addTagForm}>
                          <input
                            type="text"
                            value={newTagText}
                            onChange={(e) => setNewTagText(e.target.value)}
                            placeholder="new tag..."
                            autoFocus
                            onBlur={() => setShowAddTag(false)}
                            className={styles.newTagInput}
                          />
                        </form>
                      ) : (
                        <button onClick={() => setShowAddTag(true)} className={styles.addTagBtn} title="Add Tag">
                          <Plus size={10} />
                          <span>Add Tag</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Reminder picker */}
                  <div className={styles.sidebarSectionGroup}>
                    <label className={styles.sidebarLabel}>Reminder</label>
                    {reminder ? (
                      <div className={styles.reminderPill}>
                        <Bell size={12} className={styles.reminderIcon} />
                        <span className={styles.reminderText}>{formatReminderDate(reminder)}</span>
                        <button onClick={() => handleReminderChange(null)} className={styles.clearReminderBtn} title="Clear reminder">
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className={styles.reminderPickerWrapper}>
                        <input
                          type="datetime-local"
                          onChange={handleReminderDateChange}
                          className={styles.reminderInput}
                        />
                        <button className={styles.addReminderBtn}>
                          <Calendar size={12} className={styles.reminderIcon} />
                          <span>Set reminder</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ACCORDION 2: SESSION TOOLS (GOAL, TIMER) */}
            <div className={styles.accordionSection}>
              <button onClick={() => toggleSection('session')} className={styles.accordionHeader}>
                <span className={styles.accordionTitle}>Session Tools</span>
                {openSections.session ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {openSections.session && (
                <div className={styles.accordionBody}>
                  {/* Focus Timer */}
                  <div className={styles.sidebarSectionGroup}>
                    <div className={styles.timerHeader}>
                      <label className={styles.sidebarLabel}>Focus Timer</label>
                      <span className={styles.sessionCount}>
                        {timerMode === 'focus' ? 'Writing' : 'Break'} (#{sessionsCompleted + 1})
                      </span>
                    </div>

                    <div className={styles.timerDisplay}>
                      <span className={`${styles.timeText} ${isTimerActive ? styles.timeActive : ''}`}>
                        {formatTimerTime(timeLeft)}
                      </span>
                      <div className={styles.timerControls}>
                        {isTimerActive ? (
                          <button onClick={pauseTimer} className={styles.timerBtn} title="Pause timer">
                            <Pause size={13} />
                          </button>
                        ) : (
                          <button onClick={startTimer} className={`${styles.timerBtn} ${styles.timerBtnPrimary}`} title="Start timer">
                            <Play size={13} />
                          </button>
                        )}
                        <button onClick={resetTimer} className={styles.timerBtn} title="Reset session">
                          <RotateCcw size={13} />
                        </button>
                        <button onClick={skipTimer} className={styles.timerBtn} title="Skip session">
                          <SkipForward size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Writing Goal */}
                  <div className={styles.sidebarSectionGroup}>
                    <label className={styles.sidebarLabel}>Word Goal</label>
                    <div className={styles.goalInputWrapper}>
                      <input
                        type="number"
                        min="0"
                        value={goal || ''}
                        placeholder="words target..."
                        onChange={(e) => handleGoalChange(Math.max(0, parseInt(e.target.value) || 0))}
                        className={styles.goalInput}
                      />
                      <span className={styles.goalInputLabel}>words</span>
                    </div>

                    {goal > 0 && (
                      <div className={styles.goalProgressWrapper}>
                        <div className={styles.goalProgressBar}>
                          <div 
                            className={styles.goalProgressFill} 
                            style={{ width: `${goalProgress}%` }} 
                          />
                        </div>
                        <div className={styles.goalProgressText}>
                          <span>{wordCount} / {goal} words</span>
                          <span>{goalProgress}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ACCORDION 3: STATISTICS */}
            <div className={styles.accordionSection}>
              <button onClick={() => toggleSection('stats')} className={styles.accordionHeader}>
                <span className={styles.accordionTitle}>Statistics</span>
                {openSections.stats ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {openSections.stats && (
                <div className={styles.accordionBody}>
                  <div className={styles.statsList}>
                    <div className={styles.statsRow}>
                      <span className={styles.statsLabel}>Words</span>
                      <span className={styles.statsValue}>{wordCount}</span>
                    </div>
                    <div className={styles.statsRow}>
                      <span className={styles.statsLabel}>Characters</span>
                      <span className={styles.statsValue}>{charCount}</span>
                    </div>
                    <div className={styles.statsRow}>
                      <span className={styles.statsLabel}>Lines</span>
                      <span className={styles.statsValue}>{lineCount}</span>
                    </div>
                    <div className={styles.statsRow}>
                      <span className={styles.statsLabel}>Reading Time</span>
                      <span className={styles.statsValue}>{readingTime} min</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ACCORDION 4: ACTIONS */}
            <div className={styles.accordionSection}>
              <button onClick={() => toggleSection('actions')} className={styles.accordionHeader}>
                <span className={styles.accordionTitle}>Actions</span>
                {openSections.actions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {openSections.actions && (
                <div className={styles.accordionBody}>
                  <div className={styles.actionsList}>
                    <button onClick={handleCopyNote} className={styles.actionBtn}>
                      <Copy size={13} />
                      <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
                    </button>
                    <button onClick={handleRandomNote} className={styles.actionBtn}>
                      <Shuffle size={13} />
                      <span>Random Note</span>
                    </button>
                    <button onClick={handleDeleteNote} className={`${styles.actionBtn} ${styles.actionBtnDanger}`}>
                      <Trash2 size={13} />
                      <span>Delete Note</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


