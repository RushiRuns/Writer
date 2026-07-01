import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor as TiptapEditor } from '@tiptap/core';
import { Editor as TiptapEditorClass } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import { WikiLink } from './WikiLink';
import { SlashCommands } from './SlashCommands';
import { WikiLinkAutocomplete } from './wikiLinkAutocomplete';
import FloatingToolbar from './FloatingToolbar';

// New extensions for advanced text tools
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { CustomImage } from './CustomImage';
import { CustomBlockquote } from './CustomBlockquote';

const lowlight = createLowlight(common);

import { NoteEntry, VaultIndex } from '../../../shared/ipc-types';

interface TiptapEditorWrapperProps {
  note: NoteEntry;
  index: VaultIndex;
  onContentChange: (content: string, isInitial?: boolean) => void;
  onNoteSelect: (note: NoteEntry | null) => void;
  onBlur: () => void;
  onEditorInit?: (editor: TiptapEditor | null) => void;
}

function TiptapEditorWrapper({
  note,
  index,
  onContentChange,
  onNoteSelect,
  onBlur,
  onEditorInit,
}: TiptapEditorWrapperProps) {
  const [initialContent, setInitialContent] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadContent = async () => {
      try {
        const res = await (window as any).wrriter.readNote(note.path);
        if (!active) return;
        let displayContent = res.content;
        if (!displayContent.trim().startsWith('# ')) {
          displayContent = `# ${note.title}\n\n${displayContent.trim()}`;
        }
        
        // Translate relative Attachment paths to wrriter-file:// protocol
        const translatedContent = displayContent
          .replace(/(!\[.*?\]\()Attachments\/([^)]+)\)/g, '$1wrriter-file://Attachments/$2)')
          .replace(/(<img\s+[^>]*src=")Attachments\/([^"]+)("[^>]*>)/g, '$1wrriter-file://Attachments/$2$3');

        setInitialContent(translatedContent);
        onContentChange(translatedContent, true);
      } catch (err) {
        console.error('Failed to load note content in wrapper:', err);
      }
    };
    loadContent();
    return () => {
      active = false;
    };
  }, [note.path]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
        underline: false,
        blockquote: false, // Use CustomBlockquote
        codeBlock: false,  // Use CodeBlockLowlight
      }),
      Markdown.configure({
        markedOptions: {
          gfm: true,
        },
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle as any,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: false,
      }),
      WikiLink.configure({
        onClick: (title) => {
          const targetNote = index.notes.find(
            n => n.title.toLowerCase() === title.toLowerCase()
          );
          if (targetNote) {
            onNoteSelect(targetNote);
          }
        },
      }),
      SlashCommands,
      WikiLinkAutocomplete.configure({
        notes: index.notes,
      }),
      // Custom and new extensions
      CustomImage,
      CustomBlockquote,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      onContentChange(editor.getMarkdown());
    },
    onBlur,
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      onEditorInit?.(editor);
    }
    return () => {
      onEditorInit?.(null);
    };
  }, [editor, onEditorInit]);

  useEffect(() => {
    if (editor && initialContent !== null) {
      editor.commands.setContent(initialContent, { emitUpdate: false, contentType: 'markdown' });
      editor.commands.focus('end');
    }
  }, [editor, initialContent]);

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const autocompleteExtension = editor.extensionManager.extensions.find(
        e => e.name === 'wikiLinkAutocomplete'
      );
      if (autocompleteExtension) {
        autocompleteExtension.options.notes = index.notes;
      }
    }
  }, [index.notes, editor]);

  const handleEditorClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor) {
      event.preventDefault();
      event.stopPropagation();
      
      const href = anchor.getAttribute('href');
      if (href) {
        let targetUrl = href.trim();
        // If the URL doesn't have a protocol, prepend https://
        if (!/^[a-z]+:\/\//i.test(targetUrl)) {
          targetUrl = `https://${targetUrl}`;
        }
        
        if ((window as any).wrriter?.openLink) {
          (window as any).wrriter.openLink(targetUrl);
        } else {
          window.open(targetUrl, '_blank');
        }
      }
    }
  };

  if (initialContent === null) {
    return <div className={styles.loadingSpinner}>Loading...</div>;
  }

  return (
    <div className={styles.tiptapEditorContainer} onClick={handleEditorClick}>
      {editor && <FloatingToolbar editor={editor} />}
      <EditorContent editor={editor} className={styles.editorAreaInner} />
    </div>
  );
}
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
  Calendar,
  Target,
  Maximize2,
  Minimize2,
  List,
  Tag
} from 'lucide-react';
import ConfirmationModal from '../ui/ConfirmationModal';
import DatePicker from '../ui/DatePicker';
import TimePicker from '../ui/TimePicker';
import styles from './Editor.module.css';

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

interface EditorProps {
  note: NoteEntry;
  index: VaultIndex;
  onNoteSelect: (note: NoteEntry | null) => void;
  onClose?: () => void;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
}

export default function Editor({ 
  note, 
  index, 
  onNoteSelect, 
  onClose,
  isZenMode = false,
  onToggleZenMode
}: EditorProps) {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [reminder, setReminder] = useState<string | null>(null);
  const [goal, setGoal] = useState<number>(0);
  const [goalType, setGoalType] = useState<'note' | 'session' | 'daily'>('note');
  const [dailyGoal, setDailyGoal] = useState<number>(0);
  const [celebrated, setCelebrated] = useState(false);
  const [confetti, setConfetti] = useState<{ id: number; x: number; y: number; color: string; size: number }[]>([]);
  const initialWordCount = useRef<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Inspector panel UI states
  const [editorInstance, setEditorInstance] = useState<TiptapEditor | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newTagText, setNewTagText] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'outline' | 'meta'>('outline');
  const [activeHeadingPos, setActiveHeadingPos] = useState<number>(-1);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    tags: true,
    outline: true,
    backlinks: false,
    links: false,
    footnotes: false
  });

  // Bottom popover visibility states
  const [showGoalPopover, setShowGoalPopover] = useState(false);
  const [showReminderPopover, setShowReminderPopover] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [tempReminderDate, setTempReminderDate] = useState<string>('');
  const [tempReminderTime, setTempReminderTime] = useState<string>('');

  // Close popovers and reset confetti on note path change
  useEffect(() => {
    setShowGoalPopover(false);
    setShowReminderPopover(false);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setTempReminderDate('');
    setTempReminderTime('');
    setCelebrated(false);
    setConfetti([]);
  }, [note.path]);

  const triggerConfetti = () => {
    const colors = ['#10b981', '#e8a44b', '#3b82f6', '#ec4899', '#f59e0b'];
    const newParticles = Array.from({ length: 40 }).map((_, i) => ({
      id: Date.now() + i,
      x: 35 + Math.random() * 30, // center around the target icon region (approx 35% - 65% from left)
      y: 75 + Math.random() * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 6
    }));
    setConfetti(newParticles);
    setTimeout(() => {
      setConfetti([]);
    }, 2500);
  };



  // Stats Modal Calculations
  const getContributionGridData = () => {
    const grid = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Last 12 weeks (84 days)
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const startOfDay = d.getTime();
      const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const dy = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yr}-${mo}-${dy}`;

      // Sum word counts from ALL notes modified on this day (same logic as bar chart)
      const dayWordCount = index.notes
        .filter(n => {
          const modTime = new Date(n.modified).getTime();
          return modTime >= startOfDay && modTime < endOfDay;
        })
        .reduce((sum, n) => sum + n.wordCount, 0);

      grid.push({ dateStr, wordCount: dayWordCount });
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
    currentGoal = goal,
    currentGoalType: 'note' | 'session' | 'daily' = goalType
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
        goal: currentGoal,
        goal_type: currentGoalType
      };

      // Translate wrriter-file:// protocol back to relative Attachment paths before writing to disk
      const cleanBodyText = bodyText
        .replace(/(!\[.*?\]\()wrriter-file:\/\/Attachments\/([^)]+)\)/g, '$1Attachments/$2)')
        .replace(/(<img\s+[^>]*src=")wrriter-file:\/\/Attachments\/([^"]+)("[^>]*>)/g, '$1Attachments/$2$3');

      if (parsedTitle && parsedTitle !== note.title && note.section !== 'journal') {
        // Trigger rename
        const res = await (window as any).wrriter.writeNote(note.path, cleanBodyText, nextFrontmatter, parsedTitle);
        if (res.success) {
          // Keep selection synchronized with new path
          const fresh = index.notes.find(n => n.path === res.path);
          if (fresh) {
            onNoteSelect(fresh);
          }
        }
      } else {
        await (window as any).wrriter.writeNote(note.path, cleanBodyText, nextFrontmatter);
      }
    } catch (err) {
      console.error('Failed to auto-save note:', err);
    }
  };

  // Debounced auto-save hook
  const { forceSave, resetSavedRef } = useAutoSave(
    content,
    async (nextText) => {
      saveNote(nextText, tags, reminder, goal, goalType);
    },
    2000
  );

  const handleContentChange = (nextContent: string, isInitial = false) => {
    setContent(nextContent);
    if (isInitial) {
      resetSavedRef(nextContent);
    }
  };

  // Load settings on note path change
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await (window as any).wrriter.readNote(note.path);
        setTags(res.frontmatter.tags || []);
        setReminder(res.frontmatter.reminder || null);
        setGoal(res.frontmatter.goal || 0);

        let currentDailyGoal = 0;
        try {
          const settings = await (window as any).wrriter.getSettings();
          currentDailyGoal = settings?.dailyGoal || 0;
          setDailyGoal(currentDailyGoal);
        } catch (e) {
          console.error('Failed to load settings:', e);
        }

        const noteGoal = res.frontmatter.goal || 0;
        const noteGoalType = res.frontmatter.goal_type || 'note';
        if (noteGoal > 0) {
          setGoalType(noteGoalType);
        } else if (currentDailyGoal > 0) {
          setGoalType('daily');
        } else {
          setGoalType(noteGoalType);
        }

        let displayContent = res.content;
        if (!displayContent.trim().startsWith('# ')) {
          displayContent = `# ${note.title}\n\n${displayContent.trim()}`;
        }
        const startingWords = displayContent.trim() ? displayContent.trim().split(/\s+/).length : 0;
        initialWordCount.current = startingWords;
      } catch (err) {
        console.error('Failed to load note settings:', err);
      }
    };
    loadSettings();
  }, [note.path]);

  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags);
    saveNote(content, newTags, reminder, goal, goalType);
  };

  const handleReminderChange = (newReminder: string | null) => {
    setReminder(newReminder);
    saveNote(content, tags, newReminder, goal, goalType);
  };

  const handleGoalChange = (newGoal: number) => {
    setGoal(newGoal);
    saveNote(content, tags, reminder, newGoal, goalType);
  };

  const handleGoalTypeChange = (newType: 'note' | 'session' | 'daily') => {
    setGoalType(newType);
    if (newType !== 'daily') {
      saveNote(content, tags, reminder, goal, newType);
    }
  };

  const handleDailyGoalChange = async (newGoal: number) => {
    setDailyGoal(newGoal);
    try {
      await (window as any).wrriter.setSettings({ dailyGoal: newGoal });
    } catch (err) {
      console.error('Failed to save daily goal setting:', err);
    }
  };

  const handleEditorBlur = () => {
    forceSave();
  };

  // Tag suggestions calculation
  useEffect(() => {
    if (!newTagText.trim()) {
      setTagSuggestions([]);
      return;
    }
    const query = newTagText.trim().toLowerCase().replace(/#/g, '');
    const allTags = Object.keys(index.tagMap || {});
    const filtered = allTags.filter(t => t.startsWith(query) && !tags.includes(t));
    setTagSuggestions(filtered);
    setSelectedSuggestionIndex(0);
  }, [newTagText, index.tagMap, tags]);

  const handleSelectSuggestion = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      handleTagsChange([...tags, tag]);
    }
    setNewTagText('');
    setShowAddTag(false);
    setTagSuggestions([]);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (tagSuggestions.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => (prev + 1) % tagSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => (prev - 1 + tagSuggestions.length) % tagSuggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = tagSuggestions[selectedSuggestionIndex];
      if (selected) {
        handleSelectSuggestion(selected);
      }
    } else if (e.key === 'Escape') {
      setShowAddTag(false);
    }
  };

  // Tag Management Handlers
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (tagSuggestions.length > 0 && selectedSuggestionIndex < tagSuggestions.length) {
      const selected = tagSuggestions[selectedSuggestionIndex];
      handleSelectSuggestion(selected);
      return;
    }
    const cleanTag = newTagText.trim().toLowerCase().replace(/#/g, '');
    if (cleanTag && !tags.includes(cleanTag)) {
      handleTagsChange([...tags, cleanTag]);
    }
    setNewTagText('');
    setShowAddTag(false);
    setTagSuggestions([]);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleTagsChange(tags.filter(t => t !== tagToRemove));
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

  const handleDeleteNote = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteNote = async () => {
    try {
      await (window as any).wrriter.deleteNote(note.path);
      onNoteSelect(null);
    } catch (err) {
      console.error('Failed to delete note:', err);
    } finally {
      setShowDeleteConfirm(false);
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
  
  // Calculate daily words written across all notes modified today
  const getWordsWrittenToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = today.getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    return index.notes
      .filter(n => {
        const modTime = new Date(n.modified).getTime();
        return modTime >= startOfDay && modTime < endOfDay;
      })
      .reduce((sum, n) => sum + n.wordCount, 0);
  };

  const wordsWrittenToday = getWordsWrittenToday();
  const sessionWords = Math.max(0, wordCount - (initialWordCount.current ?? wordCount));
  
  const currentGoalProgressValue = 
    goalType === 'daily' ? wordsWrittenToday :
    goalType === 'session' ? sessionWords : 
    wordCount;

  const currentGoalValue = goalType === 'daily' ? dailyGoal : goal;
  const goalProgress = currentGoalValue > 0 ? Math.min(100, Math.round((currentGoalProgressValue / currentGoalValue) * 100)) : 0;

  // 1. Reactive Outline Extraction
  const outline = React.useMemo(() => {
    if (!editorInstance) return [];
    const headings: { text: string; level: number; pos: number }[] = [];
    editorInstance.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        headings.push({
          text: node.textContent,
          level: node.attrs.level,
          pos,
        });
      }
    });
    return headings;
  }, [editorInstance, content]);

  // Smooth scroll to heading position in editor
  const scrollToHeading = (pos: number) => {
    if (!editorInstance) return;
    editorInstance.commands.focus();
    try {
      const dom = editorInstance.view.nodeDOM(pos) as HTMLElement;
      if (dom) {
        dom.scrollIntoView({ behavior: 'smooth', block: 'start' });
        editorInstance.commands.setTextSelection(pos);
      }
    } catch (err) {
      console.warn('Failed to scroll using nodeDOM, using coordsAtPos:', err);
      const coords = editorInstance.view.coordsAtPos(pos);
      const editorDom = editorInstance.view.dom;
      const editorContainer = editorDom.parentElement;
      if (editorContainer) {
        const top = coords.top - editorContainer.getBoundingClientRect().top + editorContainer.scrollTop - 40;
        editorContainer.scrollTo({ top, behavior: 'smooth' });
      }
    }
  };

  // 2. Reactive Outgoing Links Extraction from content body
  const outgoingLinks = React.useMemo(() => {
    const matches = content.matchAll(/\[\[([^\]]+)\]\]/g);
    const links = new Set<string>();
    for (const match of matches) {
      links.add(match[1].trim());
    }
    return Array.from(links);
  }, [content]);

  // 3. Backlinks filtering from Vault Index
  const backlinks = React.useMemo(() => {
    const currentTitle = note.title.toLowerCase();
    return index.notes.filter(n => {
      if (n.path === note.path) return false;
      const links = n.links || [];
      return links.some(l => l.toLowerCase() === currentTitle);
    });
  }, [index.notes, note.title, note.path]);

  // 4. Reactive Footnotes Extraction from content body
  const footnotes = React.useMemo(() => {
    const matches = content.matchAll(/^\[\^([a-zA-Z0-9_-]+)\]:\s+(.+)$/gm);
    const result = [];
    for (const match of matches) {
      result.push({
        id: match[1],
        content: match[2].trim(),
      });
    }
    return result;
  }, [content]);

  const totalNotes = index.notes.length;
  const streak = calculateStreak(index.notes);

  // Synchronize active heading position on selection or update
  useEffect(() => {
    if (!editorInstance) return;

    const updateActiveHeading = () => {
      const { from } = editorInstance.state.selection;
      let closestHeadingPos = -1;
      editorInstance.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          if (from >= pos) {
            closestHeadingPos = pos;
          }
        }
      });
      setActiveHeadingPos(closestHeadingPos);
    };

    updateActiveHeading();

    editorInstance.on('update', updateActiveHeading);
    editorInstance.on('selectionUpdate', updateActiveHeading);

    return () => {
      editorInstance.off('update', updateActiveHeading);
      editorInstance.off('selectionUpdate', updateActiveHeading);
    };
  }, [editorInstance, content]);

  // Trigger celebration on crossing 100% threshold
  useEffect(() => {
    if (currentGoalValue > 0 && goalProgress >= 100) {
      if (!celebrated) {
        setCelebrated(true);
        triggerConfetti();
      }
    } else {
      setCelebrated(false);
    }
  }, [goalProgress, currentGoalValue, celebrated]);

  const formatTimerTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`${styles.container} animate-fade-in`}>
      <div className={styles.mainWorkspace}>
        {/* Tiptap Workspace Container */}
        <div className={styles.editorArea}>
          <TiptapEditorWrapper
            key={note.path}
            note={note}
            index={index}
            onContentChange={handleContentChange}
            onNoteSelect={onNoteSelect}
            onBlur={handleEditorBlur}
            onEditorInit={setEditorInstance}
          />
        </div>

        {/* Writing Goal Popover */}
        {showGoalPopover && (
          <div className={styles.bottomPopover} style={{ right: '144px' }}>
            <div className={styles.popoverHeader}>
              <span>Writing Goal</span>
              <button onClick={() => setShowGoalPopover(false)}><X size={10} /></button>
            </div>
            <div className={styles.popoverBody}>
              {/* Goal Type Toggles */}
              <div className={styles.goalTypeTabs}>
                <button
                  onClick={() => handleGoalTypeChange('note')}
                  className={`${styles.goalTypeTab} ${goalType === 'note' ? styles.activeTab : ''}`}
                >
                  Doc
                </button>
                <button
                  onClick={() => handleGoalTypeChange('session')}
                  className={`${styles.goalTypeTab} ${goalType === 'session' ? styles.activeTab : ''}`}
                >
                  Session
                </button>
                <button
                  onClick={() => handleGoalTypeChange('daily')}
                  className={`${styles.goalTypeTab} ${goalType === 'daily' ? styles.activeTab : ''}`}
                >
                  Daily
                </button>
              </div>

              <div className={styles.goalInputWrapper}>
                <input
                  type="number"
                  min="0"
                  value={goalType === 'daily' ? (dailyGoal || '') : (goal || '')}
                  placeholder="target words..."
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value) || 0);
                    if (goalType === 'daily') {
                      handleDailyGoalChange(val);
                    } else {
                      handleGoalChange(val);
                    }
                  }}
                  className={styles.goalInput}
                  autoFocus
                />
                <span className={styles.goalInputLabel}>words</span>
              </div>
              {currentGoalValue > 0 && (
                <div className={styles.goalProgressWrapper}>
                  <div className={styles.goalProgressBar}>
                    <div 
                      className={`${styles.goalProgressFill} ${goalProgress >= 100 ? styles.success : ''}`} 
                      style={{ width: `${goalProgress}%` }} 
                    />
                  </div>
                  <div className={styles.goalProgressText}>
                    <span>
                      {goalType === 'daily'
                        ? `${wordsWrittenToday} / ${dailyGoal} words (daily total)`
                        : goalType === 'session' 
                          ? `${sessionWords} / ${goal} words (session)` 
                          : `${wordCount} / ${goal} words (document)`
                      }
                    </span>
                    <span>{goalProgress}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reminder Popover */}
        {showReminderPopover && (
          <div className={styles.bottomPopover} style={{ right: '96px' }}>
            <div className={styles.popoverHeader}>
              <span>Set Reminder</span>
              <button onClick={() => setShowReminderPopover(false)}><X size={10} /></button>
            </div>
            <div className={styles.popoverBody}>
              {reminder ? (
                <div className={styles.popoverReminderActive}>
                  <span>Active: {formatReminderDate(reminder)}</span>
                  <button type="button" onClick={() => handleReminderChange(null)} className={styles.popoverClearBtn}>
                    Clear Reminder
                  </button>
                </div>
              ) : (
                <div className={styles.reminderPickerWrapper}>
                  <div className={styles.pickerButtons}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDatePicker(true);
                        setShowTimePicker(false);
                      }}
                      className={`${styles.pickerBtn} ${tempReminderDate ? styles.hasValue : ''}`}
                    >
                      <Calendar size={12} />
                      <span>{tempReminderDate || 'Select Date'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTimePicker(true);
                        setShowDatePicker(false);
                      }}
                      className={`${styles.pickerBtn} ${tempReminderTime ? styles.hasValue : ''}`}
                    >
                      <Clock size={12} />
                      <span>{tempReminderTime || 'Select Time'}</span>
                    </button>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => {
                      if (tempReminderDate && tempReminderTime) {
                        const combinedDateTime = `${tempReminderDate}T${tempReminderTime}`;
                        handleReminderChange(new Date(combinedDateTime).toISOString());
                        setShowReminderPopover(false);
                      }
                    }}
                    className={styles.addReminderBtn}
                    disabled={!tempReminderDate || !tempReminderTime}
                  >
                    <Bell size={12} className={styles.reminderIcon} />
                    <span>Set reminder</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom Date Picker */}
        {showDatePicker && (
          <div 
            className={styles.pickerOverlay}
            style={{ 
              right: '96px',
              bottom: showReminderPopover ? '200px' : '38px'
            }}
          >
            <DatePicker
              value={tempReminderDate}
              onChange={(date) => {
                setTempReminderDate(date);
                setShowDatePicker(false);
              }}
              onClose={() => setShowDatePicker(false)}
            />
          </div>
        )}

        {/* Custom Time Picker */}
        {showTimePicker && (
          <div 
            className={styles.pickerOverlay}
            style={{ 
              right: '96px',
              bottom: showReminderPopover ? '200px' : '38px'
            }}
          >
            <TimePicker
              value={tempReminderTime}
              onChange={(time) => {
                setTempReminderTime(time);
                setShowTimePicker(false);
              }}
              onClose={() => setShowTimePicker(false)}
            />
          </div>
        )}

        {/* Bottom Status Bar */}
        <div className={styles.bottomBar}>
          {/* Left Side: Statistics (Words and Characters) */}
          <div 
            onClick={() => setShowStatsModal(true)}
            className={styles.bottomBarLeft}
            style={{ cursor: 'pointer' }}
            title="Click to view detailed Writing Insights"
          >
            <span>{wordCount} words {charCount} characters</span>
          </div>

          {/* Right Side: Quick Action Icons */}
          <div className={styles.bottomBarRight}>
            {/* Ambient Sounds */}
            <div className={styles.bottomBarItem}>
              <AudioManager direction="up" />
            </div>

            {/* Random Note */}
            <div className={styles.bottomBarItem}>
              <button 
                onClick={handleRandomNote} 
                className={styles.bottomBarBtn}
                title="Random Note"
              >
                <Shuffle size={13} />
              </button>
            </div>

            {/* Copy Note */}
            <div className={styles.bottomBarItem}>
              <button 
                onClick={handleCopyNote} 
                className={styles.bottomBarBtn}
                title="Copy Markdown"
              >
                <Copy size={13} />
              </button>
            </div>

            {/* Writing Goal */}
            {/* Confetti Explosion Particles */}
            {confetti.map(p => (
              <div
                key={p.id}
                className={styles.particle}
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  backgroundColor: p.color,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  '--dx': `${(Math.random() - 0.5) * 300}px`,
                  '--dy': `${-100 - Math.random() * 200}px`,
                } as React.CSSProperties}
              />
            ))}

            <div className={styles.bottomBarGroup}>
              <button 
                onClick={() => {
                  setShowGoalPopover(!showGoalPopover);
                  setShowReminderPopover(false);
                }} 
                className={`${styles.bottomBarBtn} ${showGoalPopover ? styles.activeBtn : ''} ${currentGoalValue > 0 ? styles.hasGoalBtn : ''} ${goalProgress >= 100 ? styles.goalAchieved : ''}`}
                title="Writing Goal"
              >
                <Target size={13} />
              </button>
              {currentGoalValue > 0 && (
                <span className={`${styles.bottomBarText} ${goalProgress >= 100 ? styles.goalAchievedText : ''}`}>
                  {goalType === 'daily'
                    ? `D:${goalProgress}%`
                    : goalType === 'session'
                      ? `+${goalProgress}%`
                      : `${goalProgress}%`
                  }
                </span>
              )}
            </div>

            {/* Focus Timer */}
            <div className={styles.bottomBarGroup}>
              <button 
                onClick={isTimerActive ? pauseTimer : startTimer}
                className={`${styles.bottomBarBtn} ${isTimerActive ? styles.activeTimerBtn : ''}`}
                title={isTimerActive ? "Pause Timer" : "Start Focus Timer"}
              >
                {isTimerActive ? <Pause size={13} /> : <Clock size={13} />}
              </button>
              <span className={`${styles.bottomBarText} ${isTimerActive ? styles.activeTimerText : ''}`}>
                {formatTimerTime(timeLeft)}
              </span>
            </div>

            {/* Reminder */}
            <div className={styles.bottomBarGroup}>
              <button 
                onClick={() => {
                  setShowReminderPopover(!showReminderPopover);
                  setShowGoalPopover(false);
                  setShowDatePicker(false);
                  setShowTimePicker(false);
                  if (!showReminderPopover && reminder) {
                    // Split existing reminder into date and time components
                    const reminderDate = new Date(reminder);
                    const dateStr = reminderDate.toISOString().split('T')[0];
                    const timeStr = reminderDate.toTimeString().slice(0, 5);
                    setTempReminderDate(dateStr);
                    setTempReminderTime(timeStr);
                  } else if (!showReminderPopover && !reminder) {
                    // Initialize with current date and time
                    const now = new Date();
                    const dateStr = now.toISOString().split('T')[0];
                    const timeStr = now.toTimeString().slice(0, 5);
                    setTempReminderDate(dateStr);
                    setTempReminderTime(timeStr);
                  }
                }} 
                className={`${styles.bottomBarBtn} ${showReminderPopover ? styles.activeBtn : ''} ${reminder ? styles.hasReminderBtn : ''}`}
                title="Reminder"
              >
                <Bell size={13} />
              </button>
              {reminder && (
                <span className={styles.bottomBarText}>
                  {formatReminderDate(reminder).split(',')[0]}
                </span>
              )}
            </div>

            {/* Zen Mode */}
            {onToggleZenMode && (
              <div className={styles.bottomBarItem}>
                <button 
                  onClick={onToggleZenMode} 
                  className={`${styles.bottomBarBtn} ${isZenMode ? styles.activeBtn : ''}`}
                  title={isZenMode ? "Exit Zen Mode" : "Enter Zen Mode (Distraction-Free)"}
                >
                  {isZenMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Hover right-edge squeeze toggle button */}
        <div 
          className={`${styles.edgeToggleWrapper} ${showSidebar ? styles.sidebarOpen : ''}`}
          onClick={() => setShowSidebar(!showSidebar)}
        >
          <button className={styles.edgeToggleBtn} title={showSidebar ? "Close inspector" : "Open inspector"}>
            {showSidebar ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>
      </div>

      {/* Inspector Sidebar Pane */}
      {showSidebar && (
        <div className={styles.inspectorSidebar}>
          {/* Header */}
          <div className={styles.sidebarHeader}>
            <div className={styles.headerLeftPlaceholder} />
            
            {/* Tab Toggle Group */}
            <div className={styles.tabToggleGroup}>
              <button 
                onClick={() => setActiveTab('outline')}
                className={`${styles.tabToggleBtn} ${activeTab === 'outline' ? styles.activeTabToggle : ''}`}
                title="Document Outline"
              >
                <List size={14} />
              </button>
              <button 
                onClick={() => setActiveTab('meta')}
                className={`${styles.tabToggleBtn} ${activeTab === 'meta' ? styles.activeTabToggle : ''}`}
                title="Metadata & Connections"
              >
                <Tag size={14} />
              </button>
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
            {activeTab === 'outline' ? (
              <div className={styles.outlineTabContent}>
                {outline.length === 0 ? (
                  <div className={styles.sidebarEmptyState}>No headings found</div>
                ) : (
                  <div className={styles.outlineList}>
                    {outline.map((h, i) => {
                      const isActive = activeHeadingPos === h.pos;
                      return (
                        <button
                          key={i}
                          onClick={() => scrollToHeading(h.pos)}
                          className={`${styles.outlineItem} ${styles[`outlineLevel${h.level}`]} ${isActive ? styles.activeOutlineItem : ''}`}
                          title={`Scroll to: ${h.text}`}
                        >
                          {h.text}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.metaTabContent}>
                {/* ACCORDION 1: TAGS */}
                <div className={styles.accordionSection}>
                  <button onClick={() => toggleSection('tags')} className={styles.accordionHeader}>
                    <span className={styles.accordionTitle}>Tags</span>
                    {openSections.tags ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {openSections.tags && (
                    <div className={styles.accordionBody}>
                      <div className={styles.tagsBoxContainer}>
                        {tags.map(tag => (
                          <span key={tag} className={styles.tagPill}>
                            #{tag}
                            <button onClick={() => handleRemoveTag(tag)} className={styles.removeTagBtn} title="Remove tag">
                              <X size={10} />
                            </button>
                          </span>
                        ))}

                        {showAddTag ? (
                          <form onSubmit={handleAddTag} className={styles.addTagForm} style={{ position: 'relative' }}>
                            <input
                              type="text"
                              value={newTagText}
                              onChange={(e) => setNewTagText(e.target.value)}
                              placeholder="new tag..."
                              autoFocus
                              onBlur={() => setTimeout(() => setShowAddTag(false), 200)}
                              className={styles.newTagInput}
                              onKeyDown={handleTagInputKeyDown}
                            />
                            {tagSuggestions.length > 0 && (
                              <div className={styles.tagSuggestionsDropdown}>
                                {tagSuggestions.map((sug, idx) => (
                                  <div
                                    key={sug}
                                    className={`${styles.tagSuggestionItem} ${idx === selectedSuggestionIndex ? styles.tagSuggestionItemActive : ''}`}
                                    onClick={() => handleSelectSuggestion(sug)}
                                    onMouseDown={(e) => e.preventDefault()}
                                  >
                                    #{sug}
                                  </div>
                                ))}
                              </div>
                            )}
                          </form>
                        ) : (
                          <button onClick={() => setShowAddTag(true)} className={styles.addTagBtn} title="Add Tag">
                            <Plus size={10} />
                            <span>Add Tag</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ACCORDION 2: BACKLINKS */}
                <div className={styles.accordionSection}>
                  <button onClick={() => toggleSection('backlinks')} className={styles.accordionHeader}>
                    <span className={styles.accordionTitle}>Backlinks</span>
                    {openSections.backlinks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {openSections.backlinks && (
                    <div className={styles.accordionBody}>
                      {backlinks.length === 0 ? (
                        <div className={styles.sidebarEmptyState}>No backlinks found</div>
                      ) : (
                        <div className={styles.backlinksList}>
                          {backlinks.map((bl, i) => (
                            <div
                              key={i}
                              onClick={() => onNoteSelect(bl)}
                              className={styles.backlinkItem}
                              title={`Open: ${bl.title}`}
                            >
                              <div className={styles.backlinkTitle}>
                                <span className={styles.backlinkIcon}>📝</span>
                                <span>{bl.title}</span>
                              </div>
                              {bl.preview && (
                                <div className={styles.backlinkPreview}>
                                  {bl.preview}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ACCORDION 3: LINKS */}
                <div className={styles.accordionSection}>
                  <button onClick={() => toggleSection('links')} className={styles.accordionHeader}>
                    <span className={styles.accordionTitle}>Links</span>
                    {openSections.links ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {openSections.links && (
                    <div className={styles.accordionBody}>
                      {outgoingLinks.length === 0 ? (
                        <div className={styles.sidebarEmptyState}>No links found</div>
                      ) : (
                        <div className={styles.linksList}>
                          {outgoingLinks.map((linkName, i) => {
                            const targetNote = index.notes.find(
                              n => n.title.toLowerCase() === linkName.toLowerCase()
                            );
                            const exists = !!targetNote;
                            return (
                              <div
                                key={i}
                                onClick={() => targetNote ? onNoteSelect(targetNote) : null}
                                className={`${styles.outgoingLinkItem} ${exists ? styles.linkExists : styles.linkMissing}`}
                                title={exists ? `Open: ${linkName}` : `Note "${linkName}" does not exist yet`}
                              >
                                <span className={styles.outgoingLinkIcon}>🔗</span>
                                <span className={styles.outgoingLinkName}>{linkName}</span>
                                {!exists && <span className={styles.newBadge}>new</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ACCORDION 4: FOOTNOTES */}
                <div className={styles.accordionSection}>
                  <button onClick={() => toggleSection('footnotes')} className={styles.accordionHeader}>
                    <span className={styles.accordionTitle}>Footnotes</span>
                    {openSections.footnotes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {openSections.footnotes && (
                    <div className={styles.accordionBody}>
                      {footnotes.length === 0 ? (
                        <div className={styles.sidebarEmptyState}>No footnotes found</div>
                      ) : (
                        <div className={styles.footnotesList}>
                          {footnotes.map((fn, i) => (
                            <div key={i} className={styles.footnoteItem}>
                              <span className={styles.footnoteMarker}>[{fn.id}]</span>
                              <span className={styles.footnoteContent}>{fn.content}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expanded Statistics Modal */}
      {showStatsModal && (
        <div 
          onClick={() => setShowStatsModal(false)}
          className={`${styles.backdrop} animate-fade-in`}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={styles.modal}
          >
            
            {/* Close Button */}
            <button
              onClick={() => setShowStatsModal(false)}
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
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 className={styles.sectionHeader}>Words Written (Last 7 Days)</h3>
              <div className={styles.chartWrapper}>
                {getWordCountHistory().map((item, idx) => {
                  const maxWords = Math.max(...getWordCountHistory().map(h => h.words), 100);
                  const barHeightPx = Math.max(8, Math.min(60, (item.words / maxWords) * 60));
                  return (
                    <div key={idx} className={styles.chartCol}>
                      <span className={styles.chartVal}>{item.words}</span>
                      <div 
                        style={{ height: `${barHeightPx}px` }} 
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
                {getContributionGridData().map((day, idx) => {
                  // Heat opacity scale: more words = brighter amber
                  let opacity = 0;
                  if (day.wordCount > 0) {
                    if (day.wordCount <= 50) opacity = 0.25;
                    else if (day.wordCount <= 150) opacity = 0.5;
                    else if (day.wordCount <= 300) opacity = 0.75;
                    else opacity = 1.0;
                  }

                  return (
                    <div
                      key={idx}
                      title={`${day.dateStr}: ${day.wordCount} words`}
                      className={styles.contribSquare}
                      style={day.wordCount > 0 ? { 
                        backgroundColor: `rgba(232, 164, 75, ${opacity})`,
                        boxShadow: `0 0 4px rgba(232, 164, 75, ${opacity * 0.4})`
                      } : undefined}
                    />
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Delete Note Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Note"
        message={`Are you sure you want to delete note "${note.title}"? This will move it to the system trash.`}
        confirmText="Delete Note"
        cancelText="Cancel"
        onConfirm={confirmDeleteNote}
        onCancel={() => setShowDeleteConfirm(false)}
        isDangerous={true}
      />
    </div>
  );
}


