import React, { useState, useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { autocompletion } from '@codemirror/autocomplete';
import { MoreHorizontal } from 'lucide-react';
import { NoteEntry, VaultIndex } from '../../../shared/ipc-types';
import MetadataBar from './MetadataBar';
import StatsPill from '../statistics/StatsPill';
import { hideMarkdownPlugin, hideMarkdownStyles } from './hideMarkdown';
import { createWikiLinkAutocomplete } from './wikiLinkAutocomplete';
import { useAutoSave } from './useAutoSave';
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

  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

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
  const saveNote = async (text: string, currentTags: string[], currentReminder: string | null) => {
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
        completed_at: note.completedAt
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
      saveNote(nextText, tags, reminder);
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
            EditorView.theme({
              '&': { height: '100%', fontSize: '15px', fontFamily: 'var(--font-ui)', lineHeight: '1.75' },
              '.cm-scroller': { overflow: 'auto' },
              '.cm-content': { padding: '30px 0 60px 0', maxWidth: '720px', margin: '0 auto', color: '#E0E0E0', caretColor: '#E8A44B' },
              '&.cm-focused': { outline: 'none' },
              '.cm-cursor, .cm-dropCursor': { borderLeftWidth: '2px', borderLeftStyle: 'solid', borderLeftColor: '#E8A44B' }
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
    saveNote(content, newTags, reminder);
  };

  const handleReminderChange = (newReminder: string | null) => {
    setReminder(newReminder);
    saveNote(content, tags, newReminder);
  };

  const handleEditorBlur = () => {
    forceSave();
  };

  const renderBreadcrumb = () => {
    const parts = ['Notes'];
    if (note.folder && note.folder !== '.') {
      parts.push(...note.folder.split(/[/\\]/));
    }
    parts.push(note.title);

    return (
      <div className={styles.breadcrumb}>
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className={styles.breadcrumbSeparator}>&gt;</span>}
            <span className={index === parts.length - 1 ? styles.breadcrumbActive : styles.breadcrumbInactive}>
              {part}
            </span>
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className={`${styles.container} animate-fade-in`}>
      {/* Editor Header Breadcrumbs */}
      <div className={styles.header}>
        {renderBreadcrumb()}
        <div className={styles.actions}>
          <div className={styles.saveDot} title="All changes auto-saved" />
          <button className={styles.ellipsisBtn} title="More actions">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Metadata Bar */}
      <MetadataBar
        tags={tags}
        reminder={reminder}
        onTagsChange={handleTagsChange}
        onReminderChange={handleReminderChange}
      />

      {/* CodeMirror Workspace container */}
      <div 
        ref={editorRef} 
        onBlur={handleEditorBlur}
        className={styles.editorArea}
      />

      {/* Live Statistics Pill Overlay */}
      <StatsPill content={content} index={index} />
    </div>
  );
}

