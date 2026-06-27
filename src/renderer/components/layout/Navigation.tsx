import React from 'react';
import { 
  Inbox, 
  FileText,
  List,
  CheckSquare, 
  Calendar, 
  Hash, 
  Palette, 
  Archive, 
  Search, 
  Settings
} from 'lucide-react';
import styles from './Navigation.module.css';

interface NavigationProps {
  activeSection: string;
  onSectionSelect: (section: string) => void;
}

export default function Navigation({ activeSection, onSectionSelect }: NavigationProps) {

  // First Pane Navigation Items Configuration
  // 1. Move Notes right below Inbox
  // 2. Consolidate checklist items (later, read, shop, watch) into 'lists'
  const navItems = [
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'lists', label: 'Lists', icon: List },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'journal', label: 'Journal', icon: Calendar },
    { id: 'tags', label: 'Tags', icon: Hash },
    { id: 'drawing', label: 'Drawing Pad', icon: Palette },
    { id: 'archive', label: 'Archive', icon: Archive },
  ];

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.navList}>
        {navItems.map((item) => {
          // Highlight Lists icon if activeSection is lists, later, read, shop, or watch
          const isActive = activeSection === item.id || 
            (item.id === 'lists' && ['later', 'read', 'shop', 'watch'].includes(activeSection));
          
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'lists') {
                  // Default to 'later' if lists is clicked
                  onSectionSelect('later');
                } else {
                  onSectionSelect(item.id);
                }
              }}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              title={item.label}
            >
              <IconComponent size={18} className={styles.navIcon} />
            </button>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <button
          onClick={() => onSectionSelect('search')}
          className={`${styles.navItem} ${activeSection === 'search' ? styles.active : ''}`}
          title="Search"
        >
          <Search size={18} className={styles.navIcon} />
        </button>
        <button
          onClick={() => onSectionSelect('settings')}
          className={`${styles.navItem} ${activeSection === 'settings' ? styles.active : ''}`}
          title="Settings"
        >
          <Settings size={18} className={styles.navIcon} />
        </button>
      </div>
    </aside>
  );
}
