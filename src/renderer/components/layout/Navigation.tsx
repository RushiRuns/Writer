import React from 'react';
import { VaultIndex } from '../../../shared/ipc-types';
import styles from './Navigation.module.css';

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
    <aside className={styles.sidebar}>
      <div className={styles.logoWrapper}>
        <div className={styles.logoIcon}>
          W
        </div>
        <span className={styles.logoText}>Wrriter</span>
      </div>

      <nav className={styles.navList}>
        <div className={styles.navHeader}>Note Sections</div>
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          const count = item.hasBadge ? getSectionCount(item.id) : 0;
          return (
            <button
              key={item.id}
              onClick={() => onSectionSelect(item.id)}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <span>{item.label}</span>
              {item.hasBadge && count > 0 && (
                <span className={`${styles.navBadge} ${isActive ? styles.active : ''}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <button
          onClick={() => onSectionSelect('search')}
          className={`${styles.navItem} ${activeSection === 'search' ? styles.active : ''}`}
        >
          <span>Search</span>
        </button>
        <button
          onClick={() => onSectionSelect('settings')}
          className={`${styles.navItem} ${activeSection === 'settings' ? styles.active : ''}`}
        >
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}

