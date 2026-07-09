import React, { useEffect, useRef } from 'react';
import { Edit2, Copy, Trash2 } from 'lucide-react';
import styles from './DrawingContextMenu.module.css';

interface DrawingContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export default function DrawingContextMenu({
  x,
  y,
  onClose,
  onRename,
  onDuplicate,
  onDelete
}: DrawingContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Adjust menu position to keep it inside viewport boundaries
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const menuWidth = 160;
  const menuHeight = 140;

  const left = x + menuWidth > windowWidth ? windowWidth - menuWidth - 8 : x;
  const top = y + menuHeight > windowHeight ? windowHeight - menuHeight - 8 : y;

  return (
    <div
      ref={menuRef}
      style={{ top: `${top}px`, left: `${left}px` }}
      className={`${styles.menu} animate-fade-in`}
    >
      <button
        onClick={() => {
          onRename();
          onClose();
        }}
        className={styles.btn}
      >
        <Edit2 size={13} className={styles.icon} />
        <span>Rename Sketch</span>
      </button>

      <button
        onClick={() => {
          onDuplicate();
          onClose();
        }}
        className={styles.btn}
      >
        <Copy size={13} className={styles.icon} />
        <span>Duplicate Sketch</span>
      </button>

      <div className={styles.divider} />

      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className={styles.deleteBtn}
      >
        <Trash2 size={13} className={styles.icon} />
        <span>Delete Sketch</span>
      </button>
    </div>
  );
}
