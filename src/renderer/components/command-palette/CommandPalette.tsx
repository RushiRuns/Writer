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
    <div className="w-full h-full bg-[#0a0a0a]/95 border border-brand-amber/30 rounded-xl overflow-hidden flex flex-col font-ui shadow-2xl backdrop-blur-xl animate-fade-in select-none">
      {/* Search Input bar */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 bg-[#0f0f0f]/80">
        <Search size={16} className="text-neutral-500 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search commands..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none text-sm text-neutral-200 outline-none w-full font-sans"
        />
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 bg-neutral-900 text-neutral-500 font-mono">
            ESC
          </span>
        </div>
      </div>

      {/* Commands List Scroll Area */}
      <div 
        ref={listRef}
        className="flex-grow overflow-y-auto p-2 flex flex-col gap-0.5 max-h-[290px]"
      >
        {filteredCommands.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-xs text-neutral-600 italic">
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
                className={`flex items-center gap-3.5 px-4 py-3 rounded cursor-pointer transition-all duration-100 ${
                  isSelected
                    ? 'bg-brand-amber/10 border-l-[3px] border-brand-amber text-neutral-100'
                    : 'bg-transparent border-l-[3px] border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {/* Icon wrapper */}
                <div className={`p-1.5 rounded-md border transition-colors ${
                  isSelected 
                    ? 'bg-brand-amber/20 border-brand-amber/35 text-brand-amber' 
                    : 'bg-neutral-900 border-white/5 text-neutral-500'
                }`}>
                  {cmd.icon}
                </div>

                {/* Info */}
                <div className="flex-grow flex flex-col min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-[12px] font-semibold truncate ${
                      isSelected ? 'text-neutral-100' : 'text-neutral-300'
                    }`}>
                      {cmd.name}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-neutral-600 font-bold font-mono">
                      {cmd.category}
                    </span>
                  </div>
                  <span className={`text-[10px] truncate mt-0.5 ${
                    isSelected ? 'text-neutral-400' : 'text-neutral-500'
                  }`}>
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
