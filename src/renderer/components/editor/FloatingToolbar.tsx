import React, { useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import { Bold, Italic, Strikethrough, Code } from 'lucide-react';
import styles from './Editor.module.css';

interface FloatingToolbarProps {
  editor: Editor;
}

export default function FloatingToolbar({ editor }: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const update = () => {
      const { selection, doc } = editor.state;
      const { from, to, empty } = selection;

      if (empty || from === to) {
        setVisible(false);
        return;
      }

      // Make sure there is actual text selected
      const text = doc.textBetween(from, to, ' ');
      if (!text.trim()) {
        setVisible(false);
        return;
      }

      const domSelection = window.getSelection();
      if (!domSelection || domSelection.rangeCount === 0) {
        setVisible(false);
        return;
      }

      const range = domSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (!rect.width && !rect.height) {
        setVisible(false);
        return;
      }

      const toolbar = toolbarRef.current;
      const toolbarWidth = toolbar?.offsetWidth ?? 160;

      // Position above the selection, centred
      const top = rect.top + window.scrollY - 44;
      const left = rect.left + window.scrollX + rect.width / 2 - toolbarWidth / 2;

      setPosition({ top, left });
      setVisible(true);
    };

    editor.on('selectionUpdate', update);
    editor.on('transaction', update);

    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  if (!visible) return null;

  return (
    <div
      ref={toolbarRef}
      className={styles.bubbleMenu}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
      // Prevent mousedown from collapsing the selection
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`${styles.bubbleMenuBtn}${editor.isActive('bold') ? ` ${styles.active}` : ''}`}
        title="Bold"
      >
        <Bold size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${styles.bubbleMenuBtn}${editor.isActive('italic') ? ` ${styles.active}` : ''}`}
        title="Italic"
      >
        <Italic size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`${styles.bubbleMenuBtn}${editor.isActive('strike') ? ` ${styles.active}` : ''}`}
        title="Strikethrough"
      >
        <Strikethrough size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`${styles.bubbleMenuBtn}${editor.isActive('code') ? ` ${styles.active}` : ''}`}
        title="Inline Code"
      >
        <Code size={14} />
      </button>
    </div>
  );
}
