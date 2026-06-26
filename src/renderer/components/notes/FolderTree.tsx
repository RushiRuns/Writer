import React, { useState } from 'react';
import { NoteEntry, VaultIndex } from '../../../shared/ipc-types';
import styles from './FolderTree.module.css';

export interface TreeNode {
  name: string;
  path: string; // relative path from vault root
  children: TreeNode[];
  noteCount: number;
}

interface FolderTreeProps {
  index: VaultIndex;
  activeFolder: string;
  onFolderSelect: (folderPath: string) => void;
  onNewNote: (folderPath: string) => void;
  createdFolders: string[];
  setCreatedFolders: React.Dispatch<React.SetStateAction<string[]>>;
}

export function buildFolderTree(notes: NoteEntry[], createdFolders: string[]): TreeNode[] {
  const root: TreeNode = { name: 'Root', path: '', children: [], noteCount: 0 };
  const notesNotes = notes.filter(n => n.section === 'notes');

  // Count notes directly in each folder
  const noteCounts: Record<string, number> = {};
  notesNotes.forEach(n => {
    const fPath = n.folder === '.' ? '' : n.folder;
    noteCounts[fPath] = (noteCounts[fPath] || 0) + 1;
  });

  // Collect all folder paths
  const folderPathsSet = new Set<string>();
  notesNotes.forEach(n => {
    if (n.folder && n.folder !== '.') {
      folderPathsSet.add(n.folder);
    }
  });
  createdFolders.forEach(f => folderPathsSet.add(f));

  const folderPaths = Array.from(folderPathsSet);

  // Build nested tree structure
  folderPaths.forEach(fPath => {
    const parts = fPath.split(/[/\\]/);
    let current = root;
    let currentPath = '';

    parts.forEach((part) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      let node = current.children.find(c => c.name === part);
      if (!node) {
        node = {
          name: part,
          path: currentPath,
          children: [],
          noteCount: 0
        };
        current.children.push(node);
      }
      current = node;
    });
  });

  // Calculate counts for direct children only per spec
  const populateCounts = (node: TreeNode) => {
    node.noteCount = noteCounts[node.path] || 0;
    node.children.forEach(populateCounts);
  };
  root.children.forEach(populateCounts);

  return root.children;
}

export default function FolderTree({
  index,
  activeFolder,
  onFolderSelect,
  onNewNote,
  createdFolders,
  setCreatedFolders
}: FolderTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    // Keep root expanded by default
    '': true
  });
  const [creatingInPath, setCreatingInPath] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  const tree = buildFolderTree(index.notes, createdFolders);

  const toggleExpand = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const handleCreateFolderSubmit = async (parentPath: string) => {
    const name = newFolderName.trim();
    if (!name) {
      setCreatingInPath(null);
      return;
    }

    try {
      const parentDir = parentPath === '.' ? '' : parentPath;
      const res = await (window as any).wrriter.createFolder(parentDir, name);
      if (res.success) {
        const relativeNewPath = parentDir ? `${parentDir}/${name}` : name;
        setCreatedFolders(prev => [...prev, relativeNewPath]);
        setExpanded(prev => ({ ...prev, [parentPath]: true }));
      }
    } catch (err) {
      console.error('Failed to create folder:', err);
    } finally {
      setCreatingInPath(null);
      setNewFolderName('');
    }
  };

  const renderNode = (node: TreeNode, depth = 0) => {
    const isExpanded = !!expanded[node.path];
    const isActive = activeFolder === node.path;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.path} className={styles.nodeWrapper}>
        {/* Folder row */}
        <div
          onClick={() => onFolderSelect(node.path)}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          className={`group ${styles.row} ${isActive ? styles.active : ''}`}
        >
          {/* Chevron */}
          <button
            onClick={(e) => toggleExpand(node.path, e)}
            className={styles.chevronBtn}
            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', visibility: hasChildren ? 'visible' : 'hidden' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Folder Icon */}
          <svg className={styles.folderIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>

          {/* Folder Name */}
          <span className="truncate flex-grow select-none">{node.name}</span>

          {/* Note count badge */}
          {node.noteCount > 0 && (
            <span className={styles.badgeCount}>
              [{node.noteCount}]
            </span>
          )}

          {/* Actions */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCreatingInPath(node.path);
            }}
            title="New Subfolder"
            className={styles.actionsBtn}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </button>
        </div>

        {/* Inline Folder Creation Input */}
        {creatingInPath === node.path && (
          <div style={{ paddingLeft: `${(depth + 1) * 12 + 12}px` }} className={styles.inlineInputWrapper}>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolderSubmit(node.path);
                if (e.key === 'Escape') setCreatingInPath(null);
              }}
              onBlur={() => handleCreateFolderSubmit(node.path)}
              placeholder="Folder name..."
              autoFocus
              className={styles.inlineInput}
            />
          </div>
        )}

        {/* Render children */}
        {isExpanded && node.children.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Pane 2 Header */}
      <div className={styles.header}>
        <span className={`${styles.headerTitle} select-none`}>Folders</span>
        <div className={styles.headerButtons}>
          {/* New Folder in Root */}
          <button
            onClick={() => setCreatingInPath('.')}
            title="New Folder in Root"
            className={styles.headerBtn}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </button>
          
          {/* New Note */}
          <button
            onClick={() => onNewNote(activeFolder)}
            title="New Note in selected folder"
            className={styles.headerBtn}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Folders List Container */}
      <div className={styles.listArea}>
        {/* Root Node Selector */}
        <div
          onClick={() => onFolderSelect('.')}
          className={`${styles.row} ${activeFolder === '.' ? styles.active : ''}`}
        >
          <svg className={`${styles.folderIcon} mr-2`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="truncate select-none">Notes Root</span>
        </div>

        {/* Inline Root Folder Creation Input */}
        {creatingInPath === '.' && (
          <div style={{ paddingLeft: '24px' }} className={styles.inlineInputWrapper}>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolderSubmit('.');
                if (e.key === 'Escape') setCreatingInPath(null);
              }}
              onBlur={() => handleCreateFolderSubmit('.')}
              placeholder="Folder name..."
              autoFocus
              className={styles.inlineInput}
            />
          </div>
        )}

        {/* Render child folders recursively */}
        {tree.map(node => renderNode(node, 0))}
      </div>
    </div>
  );
}

