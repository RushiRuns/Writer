import React, { useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  Code, 
  Highlighter, 
  Palette, 
  AlignLeft, 
  AlignCenter, 
  AlignRight 
} from 'lucide-react';
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
      const toolbarWidth = toolbar?.offsetWidth ?? 320;

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
      {/* Inline styles */}
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
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`${styles.bubbleMenuBtn}${editor.isActive('underline') ? ` ${styles.active}` : ''}`}
        title="Underline"
      >
        <UnderlineIcon size={14} />
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

      <span className={styles.toolbarDivider} />

      {/* Highlighter and Text Color */}
      <button
        onClick={() => editor.chain().focus().toggleHighlight({ color: '#e8a44b' }).run()}
        className={`${styles.bubbleMenuBtn}${editor.isActive('highlight', { color: '#e8a44b' }) ? ` ${styles.active}` : ''}`}
        title="Highlight"
      >
        <Highlighter size={14} />
      </button>
      <button
        onClick={() => {
          if (editor.isActive('textStyle', { color: '#e8a44b' })) {
            editor.chain().focus().unsetColor().run();
          } else {
            editor.chain().focus().setColor('#e8a44b').run();
          }
        }}
        className={`${styles.bubbleMenuBtn}${editor.isActive('textStyle', { color: '#e8a44b' }) ? ` ${styles.active}` : ''}`}
        title="Text Color"
      >
        <Palette size={14} />
      </button>

      <span className={styles.toolbarDivider} />

      {/* Text Alignment */}
      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`${styles.bubbleMenuBtn}${editor.isActive({ textAlign: 'left' }) ? ` ${styles.active}` : ''}`}
        title="Align Left"
      >
        <AlignLeft size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`${styles.bubbleMenuBtn}${editor.isActive({ textAlign: 'center' }) ? ` ${styles.active}` : ''}`}
        title="Align Center"
      >
        <AlignCenter size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`${styles.bubbleMenuBtn}${editor.isActive({ textAlign: 'right' }) ? ` ${styles.active}` : ''}`}
        title="Align Right"
      >
        <AlignRight size={14} />
      </button>
    </div>
  );
}
