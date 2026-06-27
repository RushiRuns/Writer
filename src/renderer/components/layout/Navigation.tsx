import React from 'react';
import { VaultIndex } from '../../../shared/ipc-types';
import { 
  Inbox, 
  Clock, 
  BookOpen, 
  ShoppingBag, 
  Eye, 
  CheckSquare, 
  Calendar, 
  FileText, 
  Hash, 
  Palette, 
  Archive, 
  Search, 
  Settings, 
  SunMoon
} from 'lucide-react';
import styles from './Navigation.module.css';

interface NavigationProps {
  activeSection: string;
  onSectionSelect: (section: string) => void;
  index: VaultIndex;
  vaultPath: string;
}

export default function Navigation({ activeSection, onSectionSelect, index: _index, vaultPath: _vaultPath }: NavigationProps) {

  const navItems = [
    { id: 'inbox', label: 'Inbox', hasBadge: true, icon: Inbox },
    { id: 'later', label: 'Later', hasBadge: true, icon: Clock },
    { id: 'read', label: 'Read', hasBadge: true, icon: BookOpen },
    { id: 'shop', label: 'Shop', hasBadge: true, icon: ShoppingBag },
    { id: 'watch', label: 'Watch', hasBadge: true, icon: Eye },
    { id: 'tasks', label: 'Tasks', hasBadge: true, icon: CheckSquare },
    { id: 'journal', label: 'Journal', hasBadge: false, icon: Calendar },
    { id: 'notes', label: 'Notes', hasBadge: false, icon: FileText },
    { id: 'tags', label: 'Tags', hasBadge: false, icon: Hash },
    { id: 'drawing', label: 'Drawing Pad', hasBadge: true, icon: Palette },
    { id: 'archive', label: 'Archive', hasBadge: false, icon: Archive },
  ];

  const handleToggleTheme = async () => {
    try {
      const settings = await (window as any).wrriter.getSettings();
      const nextTheme = settings.theme === 'light' ? 'dark' : 'light';
      await (window as any).wrriter.setSettings({ theme: nextTheme });
      document.documentElement.setAttribute('data-theme', nextTheme);
    } catch (err) {
      console.error('Failed to toggle theme:', err);
    }
  };

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.navList}>
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSectionSelect(item.id)}
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
        <button
          onClick={handleToggleTheme}
          className={styles.navItem}
          title="Theme"
        >
          <SunMoon size={18} className={styles.navIcon} />
        </button>
      </div>
    </aside>
  );
}

