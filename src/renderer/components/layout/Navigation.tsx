import React from 'react';
import { VaultIndex } from '../../../shared/ipc-types';

interface NavigationProps {
  activeSection: string;
  onSectionSelect: (section: string) => void;
  index: VaultIndex;
  vaultPath: string;
}

export default function Navigation({ activeSection, onSectionSelect, index, vaultPath }: NavigationProps) {
  const getSectionCount = (sectionId: string) => {
    // map logical section names to VaultIndex note section
    const secName = sectionId === 'drawing' ? 'notes' : sectionId; 
    if (sectionId === 'drawing') {
      return index.drawings.length;
    }
    return index.notes.filter(n => n.section === secName).length;
  };

  const navItems = [
    { id: 'inbox', label: 'Inbox', hasBadge: true },
    { id: 'later', label: 'Later', hasBadge: true },
    { id: 'read', label: 'Read', hasBadge: true },
    { id: 'shop', label: 'Shop', hasBadge: true },
    { id: 'watch', label: 'Watch', hasBadge: true },
    { id: 'tasks', label: 'Tasks', hasBadge: true },
    { id: 'journal', label: 'Journal', hasBadge: false },
    { id: 'notes', label: 'Notes', hasBadge: false },
    { id: 'tags', label: 'Tags', hasBadge: false },
    { id: 'drawing', label: 'Drawing Pad', hasBadge: true },
    { id: 'archive', label: 'Archive', hasBadge: false },
  ];

  return (
    <aside className="w-[220px] flex-shrink-0 border-r border-white/10 bg-neutral-950 flex flex-col p-4">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center justify-center w-8 h-8 rounded bg-neutral-900 border border-brand-amber text-brand-amber font-mono font-bold text-sm">
          W
        </div>
        <span className="font-bold text-lg tracking-tight">Wrriter</span>
      </div>

      <nav className="flex-grow flex flex-col gap-1 overflow-y-auto">
        <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Note Sections</div>
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          const count = item.hasBadge ? getSectionCount(item.id) : 0;
          return (
            <button
              key={item.id}
              onClick={() => onSectionSelect(item.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-all duration-200 text-left w-full ${
                isActive
                  ? 'bg-neutral-900 text-brand-amber border-l-2 border-brand-amber font-medium'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <span>{item.label}</span>
              {item.hasBadge && count > 0 && (
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-brand-amber/20 text-brand-amber' : 'bg-neutral-800 text-neutral-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1 border-t border-white/5 pt-4 mt-auto">
        <button
          onClick={() => onSectionSelect('search')}
          className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-all duration-200 text-left w-full ${
            activeSection === 'search' ? 'bg-neutral-900 text-brand-amber font-medium' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <span>Search</span>
        </button>
        <button
          onClick={() => onSectionSelect('settings')}
          className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-all duration-200 text-left w-full ${
            activeSection === 'settings' ? 'bg-neutral-900 text-brand-amber font-medium' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
