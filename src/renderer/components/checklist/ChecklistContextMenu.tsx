import React, { useEffect, useRef } from 'react';

interface ChecklistContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onRename: () => void;
  onMoveToInbox: () => void;
  onDelete: () => void;
  onCopy: () => void;
}

export default function ChecklistContextMenu({
  x,
  y,
  onClose,
  onRename,
  onMoveToInbox,
  onDelete,
  onCopy
}: ChecklistContextMenuProps) {
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

  // Adjust menu position if it overflows screen boundaries
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const menuWidth = 180;
  const menuHeight = 150;

  const left = x + menuWidth > windowWidth ? windowWidth - menuWidth - 8 : x;
  const top = y + menuHeight > windowHeight ? windowHeight - menuHeight - 8 : y;

  return (
    <div
      ref={menuRef}
      style={{ top: `${top}px`, left: `${left}px` }}
      className="fixed z-50 w-44 bg-neutral-950 border border-white/10 rounded-md shadow-2xl py-1 text-xs animate-fade-in font-ui text-neutral-300"
    >
      <button
        onClick={() => {
          onRename();
          onClose();
        }}
        className="w-full text-left px-3 py-2 hover:bg-brand-amber hover:text-black transition-colors flex items-center gap-2"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        Rename Item
      </button>
      <button
        onClick={() => {
          onMoveToInbox();
          onClose();
        }}
        className="w-full text-left px-3 py-2 hover:bg-brand-amber hover:text-black transition-colors flex items-center gap-2"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        Move to Inbox
      </button>
      <button
        onClick={() => {
          onCopy();
          onClose();
        }}
        className="w-full text-left px-3 py-2 hover:bg-brand-amber hover:text-black transition-colors flex items-center gap-2"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-5 4h5m-5 4h5m-5 4h3" />
        </svg>
        Copy Title
      </button>
      <div className="h-[1px] bg-white/5 my-1" />
      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full text-left px-3 py-2 hover:bg-red-600 hover:text-white text-red-400 transition-colors flex items-center gap-2"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete Item
      </button>
    </div>
  );
}
