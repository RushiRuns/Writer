import React, { useState, useEffect, useRef } from 'react';
import { 
  Search,
  ChevronRight,
  BookOpen,
  Calendar,
  Settings,
  Edit3,
  Moon,
  Inbox,
  Clock,
  CheckSquare,
  Tag,
  Archive,
  Image as ImageIcon
} from 'lucide-react';
import styles from './CommandPalette.module.css';

interface CommandItem {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ReactNode;
}

export default function CommandPalette() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    { id: 'new-note', name: 'Create New Note', category: 'Actions', description: 'Create a new untitled markdown note in the notes root', icon: <Edit3 size={15} /> },
    { id: 'toggle-theme', name: 'Toggle Dark/Light Theme', category: 'Settings', description: 'Switch application color theme', icon: <Moon size={15} /> },
    
    { id: 'switch-inbox', name: 'Go to Inbox', category: 'Navigation', description: 'Switch to Inbox section', icon: <Inbox size={15} /> },
    { id: 'switch-later', name: 'Go to Later', category: 'Navigation', description: 'Switch to Later checklist section', icon: <Clock size={15} /> },
    { id: 'switch-read', name: 'Go to Read', category: 'Navigation', description: 'Switch to Read list', icon: <BookOpen size={15} /> },
    { id: 'switch-shop', name: 'Go to Shop', category: 'Navigation', description: 'Switch to Shop list', icon: <ChevronRight size={15} /> },
    { id: 'switch-watch', name: 'Go to Watch', category: 'Navigation', description: 'Switch to Watch list', icon: <ChevronRight size={15} /> },
    { id: 'switch-tasks', name: 'Go to Tasks', category: 'Navigation', description: 'Switch to Tasks list', icon: <CheckSquare size={15} /> },
    { id: 'switch-journal', name: 'Go to Journal', category: 'Navigation', description: 'Switch to Journal view', icon: <Calendar size={15} /> },
    { id: 'switch-notes', name: 'Go to Notes Explorer', category: 'Navigation', description: 'Switch to standard Notes list explorer', icon: <BookOpen size={15} /> },
    { id: 'switch-drawing', name: 'Go to Drawing Pad', category: 'Navigation', description: 'Switch to HTML5 drawing pad canvas', icon: <ImageIcon size={15} /> },
    { id: 'switch-tags', name: 'Go to Tags Browser', category: 'Navigation', description: 'Switch to Tags section', icon: <Tag size={15} /> },
    { id: 'switch-archive', name: 'Go to Archive', category: 'Navigation', description: 'Switch to Archive list', icon: <Archive size={15} /> },
    
    { id: 'switch-settings', name: 'Open Settings', category: 'Settings', description: 'Switch to Settings panel', icon: <Settings size={15} /> }
  ];

  // Filter commands by search query fuzzy/simple match
  const filteredCommands = commands.filter(cmd => 
    cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Handle keyboard navigation inside the list
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex].id);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        (window as any).wrriter.closeWindow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredCommands]);

  // Scroll active item into view
  useEffect(() => {
    const activeEl = listRef.current?.children[selectedIndex] as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const executeCommand = async (commandId: string) => {
    try {
      await (window as any).wrriter.triggerPaletteAction(commandId);
    } catch (err) {
      console.error('Failed to trigger palette action:', err);
    }
  };

  return (
    <div className={`${styles.container} animate-fade-in`}>
      {/* Search Input bar */}
      <div className={styles.searchWrapper}>
        <Search size={16} className={styles.searchIcon} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search commands..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        <div className={styles.escWrapper}>
          <span className={styles.escBadge}>
            ESC
          </span>
        </div>
      </div>

      {/* Commands List Scroll Area */}
      <div 
        ref={listRef}
        className={styles.listArea}
      >
        {filteredCommands.length === 0 ? (
          <div className={styles.emptyState}>
            No commands matched your query
          </div>
        ) : (
          filteredCommands.map((cmd, idx) => {
            const isSelected = selectedIndex === idx;
            return (
              <div
                key={cmd.id}
                onClick={() => executeCommand(cmd.id)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`${styles.row} ${isSelected ? styles.selected : ''}`}
              >
                {/* Icon wrapper */}
                <div className={`${styles.iconWrapper} ${isSelected ? styles.selected : ''}`}>
                  {cmd.icon}
                </div>

                {/* Info */}
                <div className={styles.info}>
                  <div className={styles.titleRow}>
                    <span className={`${styles.name} ${isSelected ? styles.selected : ''}`}>
                      {cmd.name}
                    </span>
                    <span className={styles.category}>
                      {cmd.category}
                    </span>
                  </div>
                  <span className={`${styles.description} ${isSelected ? styles.selected : ''}`}>
                    {cmd.description}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

