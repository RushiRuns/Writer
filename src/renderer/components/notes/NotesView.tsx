import React, { useState, useEffect, useRef } from 'react';
import { NoteEntry, VaultIndex } from '../../../shared/ipc-types';
import ResizablePanels from '../layout/ResizablePanels';
import FolderTree from './FolderTree';
import NoteList from './NoteList';

interface NotesViewProps {
  index: VaultIndex;
  _vaultPath: string;
}

export default function NotesView({ index, _vaultPath }: NotesViewProps) {
  const [activeFolder, setActiveFolder] = useState<string>('.');
  const [selectedNote, setSelectedNote] = useState<NoteEntry | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [createdFolders, setCreatedFolders] = useState<string[]>([]);
  const [targetSelectedPath, setTargetSelectedPath] = useState<string | null>(null);

  // Column width states
  const [pane2Width, setPane2Width] = useState(200);
  const [pane3Width, setPane3Width] = useState(240);

  // Debouncing refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset note selection when folder changes
  const handleFolderSelect = (folderPath: string) => {
    setActiveFolder(folderPath);
    setSelectedNote(null);
  };

  // Asynchronous note select mapping from file watcher updates
  useEffect(() => {
    if (targetSelectedPath) {
      const found = index.notes.find(n => n.path === targetSelectedPath);
      if (found) {
        setSelectedNote(found);
        setTargetSelectedPath(null);
      }
    } else if (selectedNote) {
      // Keep selected note reference fresh when index updates
      const fresh = index.notes.find(n => n.path === selectedNote.path);
      if (fresh) {
        setSelectedNote(fresh);
      } else {
        setSelectedNote(null);
      }
    }
  }, [index.notes, targetSelectedPath]);

  // Load note content when selected note changes
  useEffect(() => {
    if (selectedNote) {
      const readContent = async () => {
        try {
          const res = await (window as any).wrriter.readNote(selectedNote.path);
          let displayContent = res.content;
          
          // Prepend H1 header if it's missing on disk
          if (!displayContent.trim().startsWith('# ')) {
            displayContent = `# ${selectedNote.title}\n\n${displayContent.trim()}`;
          }
          
          setEditorContent(displayContent);
        } catch (err) {
          console.error('Failed to load note content:', err);
        }
      };
      readContent();
    }
  }, [selectedNote?.path]);

  // Handle New Note creation
  const handleNewNote = async (folderPath: string) => {
    try {
      const folder = folderPath === '.' ? '' : folderPath;
      const res = await (window as any).wrriter.createNote(folder, 'Untitled');
      if (res.success) {
        setTargetSelectedPath(res.path);
      }
    } catch (err) {
      console.error('Failed to create new note:', err);
    }
  };

  // Perform Save operation parsing H1 for renaming if required
  const performSave = async (content: string) => {
    if (!selectedNote) return;

    try {
      const lines = content.split('\n');
      const firstLine = lines[0] || '';
      
      let parsedTitle = '';
      let bodyText = content;

      if (firstLine.startsWith('# ')) {
        parsedTitle = firstLine.slice(2).trim();
        bodyText = lines.slice(1).join('\n');
      }

      const resNote = await (window as any).wrriter.readNote(selectedNote.path);

      if (parsedTitle && parsedTitle !== selectedNote.title) {
        // Trigger Rename transaction
        const res = await (window as any).wrriter.writeNote(
          selectedNote.path,
          bodyText,
          resNote.frontmatter,
          parsedTitle
        );
        if (res.success) {
          setTargetSelectedPath(res.path);
        }
      } else {
        // Regular write save
        await (window as any).wrriter.writeNote(
          selectedNote.path,
          bodyText,
          resNote.frontmatter
        );
      }
    } catch (err) {
      console.error('Failed to auto-save note:', err);
    }
  };

  // Debounced auto-save hook
  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    setEditorContent(nextVal);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Auto-save debounced 2 seconds after user stops typing
    saveTimeoutRef.current = setTimeout(() => {
      performSave(nextVal);
    }, 2000);
  };

  // Force save on blur
  const handleEditorBlur = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    performSave(editorContent);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const getBreadcrumbPath = () => {
    if (!selectedNote) return '';
    const parts = ['Notes'];
    if (selectedNote.folder && selectedNote.folder !== '.') {
      parts.push(...selectedNote.folder.split(/[/\\]/));
    }
    parts.push(selectedNote.title);
    return parts.join(' / ');
  };

  // Pane Render Functions
  const renderPane2 = () => (
    <FolderTree
      index={index}
      activeFolder={activeFolder}
      onFolderSelect={handleFolderSelect}
      onNewNote={handleNewNote}
      createdFolders={createdFolders}
      setCreatedFolders={setCreatedFolders}
    />
  );

  const renderPane3 = () => (
    <NoteList
      index={index}
      activeFolder={activeFolder}
      selectedNote={selectedNote}
      onNoteSelect={setSelectedNote}
    />
  );

  const renderPane4 = () => {
    if (!selectedNote) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-xs text-neutral-600 italic bg-[#1c1c1c]">
          Select or create a note in the list to start writing
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full bg-[#1c1c1c] animate-fade-in">
        {/* Editor Breadcrumb Header */}
        <div className="h-[44px] border-b border-white/5 px-6 flex items-center justify-between bg-neutral-900/30 flex-shrink-0">
          <span className="text-xs text-neutral-400 font-mono truncate">
            {getBreadcrumbPath()}
          </span>
          <span className="text-[10px] text-neutral-500 font-mono uppercase bg-neutral-900 px-2 py-0.5 rounded border border-white/5 select-none">
            Saved
          </span>
        </div>

        {/* Text Area workspace */}
        <div className="flex-grow p-8 flex flex-col overflow-y-auto">
          <textarea
            value={editorContent}
            onChange={handleEditorChange}
            onBlur={handleEditorBlur}
            placeholder="# Note Title&#10;&#10;Start writing..."
            className="flex-grow w-full max-w-2xl mx-auto bg-transparent border-none outline-none resize-none text-neutral-200 text-sm font-mono leading-relaxed placeholder-neutral-600"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex-grow h-full overflow-hidden bg-black">
      <ResizablePanels
        pane2={renderPane2()}
        pane3={renderPane3()}
        pane4={renderPane4()}
        pane2Width={pane2Width}
        setPane2Width={setPane2Width}
        pane3Width={pane3Width}
        setPane3Width={setPane3Width}
      />
    </div>
  );
}
