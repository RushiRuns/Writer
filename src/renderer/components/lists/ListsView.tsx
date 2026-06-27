import React from 'react';
import { VaultIndex } from '../../../shared/ipc-types';
import ChecklistView from '../checklist/ChecklistView';
import { Clock, BookOpen, ShoppingBag, Eye } from 'lucide-react';
import styles from './ListsView.module.css';

interface ListsViewProps {
  activeList: string;
  onSelectList: (list: string) => void;
  index: VaultIndex;
  vaultPath: string;
}

export default function ListsView({ activeList, onSelectList, index, vaultPath }: ListsViewProps) {
  
  // Checklist categories sub-navigation configuration
  const listCategories = [
    { id: 'later', label: 'Later', icon: Clock },
    { id: 'read', label: 'Read', icon: BookOpen },
    { id: 'shop', label: 'Shop', icon: ShoppingBag },
    { id: 'watch', label: 'Watch', icon: Eye }
  ];

  return (
    <div className={styles.container}>
      {/* Sub-Navigation Sidebar (Pane 2 layout) */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>Lists</span>
        </div>
        
        <div className={styles.categoriesList}>
          {listCategories.map((category) => {
            const isSelected = activeList === category.id;
            const Icon = category.icon;
            return (
              <div
                key={category.id}
                onClick={() => onSelectList(category.id)}
                className={`${styles.categoryItem} ${isSelected ? styles.categoryItemActive : ''}`}
              >
                <div className={`${styles.categoryIcon} ${isSelected ? styles.categoryIconActive : ''}`}>
                  <Icon size={14} />
                </div>
                <span className={`${styles.categoryName} ${isSelected ? styles.categoryNameActive : ''}`}>
                  {category.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Content Display Area */}
      <div className={styles.contentArea}>
        <ChecklistView
          key={activeList} // Forces re-mount to refresh states correctly
          sectionId={activeList as any}
          index={index}
          _vaultPath={vaultPath}
        />
      </div>
    </div>
  );
}
