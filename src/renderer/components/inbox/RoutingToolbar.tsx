import React, { useState } from 'react';
import { NoteEntry, VaultIndex } from '../../../shared/ipc-types';
import styles from './RoutingToolbar.module.css';

interface RoutingToolbarProps {
  note: NoteEntry;
  index: VaultIndex;
  vaultPath: string;
  onActionComplete: (notePath: string) => void;
  onActionStart: () => void;
}

export default function RoutingToolbar({ 
  note, 
  index, 
  vaultPath, 
  onActionComplete,
  onActionStart 
}: RoutingToolbarProps) {
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);

  // Extract user-created folders (excluding system directories)
  const systemFoldersSet = new Set([
    'inbox', 'later', 'read', 'shop', 'watch', 'tasks', 'journal', 'archive', 'attachments', '.'
  ]);
  const userFolders = Array.from(new Set(
    index.notes
      .map(n => n.folder)
      .filter(f => f && !systemFoldersSet.has(f.split(/[/\\]/)[0].toLowerCase()))
  )).sort();

  const handleRoute = async (section: 'later' | 'read' | 'watch' | 'shop' | 'tasks' | 'archive') => {
    onActionStart();
    try {
      // Moves file to corresponding system folder
      const destinationFolder = section.charAt(0).toUpperCase() + section.slice(1);
      const res = await (window as any).wrriter.moveNote(note.path, destinationFolder);
      if (res.success) {
        onActionComplete(note.path);
      }
    } catch (err) {
      console.error(`Failed to route note to ${section}:`, err);
    }
  };

  const handleJournalRoute = async () => {
    onActionStart();
    try {
      const todayStr = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
      const journalFolder = 'Journal';
      
      // Find if today's journal note exists
      const todayJournal = index.notes.find(
        n => n.section === 'journal' && n.title === todayStr
      );
      
      const inboxNoteData = await (window as any).wrriter.readNote(note.path);
      
      let journalPath = '';
      let journalContent = '';
      let journalFrontmatter: any = { 
        title: todayStr, 
        created: new Date().toISOString(), 
        type: 'journal' 
      };
      
      if (todayJournal) {
        journalPath = todayJournal.path;
        const todayJournalData = await (window as any).wrriter.readNote(todayJournal.path);
        journalContent = todayJournalData.content;
        journalFrontmatter = todayJournalData.frontmatter;
      } else {
        const createResult = await (window as any).wrriter.createNote(journalFolder, todayStr);
        if (createResult.success) {
          journalPath = createResult.path;
        } else {
          throw new Error('Failed to create journal note');
        }
      }
      
      // Append title + content
      const appendText = `\n\n---\n## ${note.title}\n${inboxNoteData.content}`;
      const newJournalContent = journalContent 
        ? (journalContent.trim() + appendText) 
        : `## ${note.title}\n${inboxNoteData.content}`;
      
      await (window as any).wrriter.writeNote(journalPath, newJournalContent, journalFrontmatter);
      await (window as any).wrriter.deleteNote(note.path);
      
      onActionComplete(note.path);
    } catch (err) {
      console.error('Failed to route note to Journal:', err);
    }
  };

  const handleMoveToFolder = async (folder: string) => {
    onActionStart();
    setShowFolderDropdown(false);
    try {
      const res = await (window as any).wrriter.moveNote(note.path, folder);
      if (res.success) {
        onActionComplete(note.path);
      }
    } catch (err) {
      console.error(`Failed to move note to ${folder}:`, err);
    }
  };

  return (
    <div className={`${styles.container} ${styles.slideUp}`}>
      <div className={styles.toolbar}>
        
        {/* FOLDER MOVER */}
        <div className="relative">
          <button 
            onClick={() => setShowFolderDropdown(!showFolderDropdown)}
            title="Move to User Folder"
            className={`${styles.btn} ${showFolderDropdown ? styles.active : ''}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </button>
          
          {showFolderDropdown && (
            <div className={`${styles.dropdown} animate-fade-in`}>
              <div className={styles.dropdownHeader}>Notes Folders</div>
              {userFolders.length === 0 ? (
                <div className={styles.dropdownEmpty}>No custom folders. Create one in Notes view.</div>
              ) : (
                userFolders.map(folder => (
                  <button
                    key={folder}
                    onClick={() => handleMoveToFolder(folder)}
                    className={styles.dropdownItem}
                  >
                    {folder}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* JOURNAL */}
        <button 
          onClick={handleJournalRoute}
          title="Send to Journal"
          className={styles.btn}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </button>

        <div className={styles.divider} />

        {/* LATER */}
        <button 
          onClick={() => handleRoute('later')}
          title="Move to Later"
          className={styles.btn}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* READ */}
        <button 
          onClick={() => handleRoute('read')}
          title="Move to Read"
          className={styles.btn}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" />
          </svg>
        </button>

        {/* WATCH */}
        <button 
          onClick={() => handleRoute('watch')}
          title="Move to Watch"
          className={styles.btn}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>

        {/* SHOP */}
        <button 
          onClick={() => handleRoute('shop')}
          title="Move to Shop"
          className={styles.btn}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>

        {/* TASKS */}
        <button 
          onClick={() => handleRoute('tasks')}
          title="Move to Tasks"
          className={styles.btn}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </button>

        {/* ARCHIVE */}
        <button 
          onClick={() => handleRoute('archive')}
          title="Archive Note"
          className={styles.btn}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </button>

      </div>
    </div>
  );
}
