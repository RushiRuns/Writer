import React, { useState, useEffect } from 'react';
import { NoteEntry, VaultIndex } from '../../../shared/ipc-types';
import ResizablePanels from '../layout/ResizablePanels';
import FolderTree from './FolderTree';
import NoteList from './NoteList';
import Editor from '../editor/Editor';
import styles from './NotesView.module.css';

interface NotesViewProps {
  index: VaultIndex;
  _vaultPath: string;
  onBreadcrumbChange?: (path: string) => void;
}

export default function NotesView({ index, _vaultPath, onBreadcrumbChange }: NotesViewProps) {
  const [activeFolder, setActiveFolder] = useState<string>('.');
  const [selectedNote, setSelectedNote] = useState<NoteEntry | null>(null);
  const [createdFolders, setCreatedFolders] = useState<string[]>([]);
  const [targetSelectedPath, setTargetSelectedPath] = useState<string | null>(null);

  // Column width states
  const [pane2Width, setPane2Width] = useState(200);
  const [pane3Width, setPane3Width] = useState(240);

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

  useEffect(() => {
    if (onBreadcrumbChange) {
      if (selectedNote) {
        const parts = ['Notes'];
        if (selectedNote.folder && selectedNote.folder !== '.') {
          parts.push(...selectedNote.folder.split(/[/\\]/));
        }
        parts.push(selectedNote.title);
        onBreadcrumbChange(parts.join(' > '));
      } else {
        onBreadcrumbChange(activeFolder === '.' ? 'Notes' : `Notes > ${activeFolder.replace(/[/\\]/g, ' > ')}`);
      }
    }
  }, [selectedNote, activeFolder, onBreadcrumbChange]);

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
        <div className={styles.placeholder}>
          Select or create a note in the list to start writing
        </div>
      );
    }

    return (
      <Editor
        note={selectedNote}
        index={index}
        onNoteSelect={setSelectedNote}
      />
    );
  };

  return (
    <div className={styles.container}>
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

