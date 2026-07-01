import React, { useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
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
  AlignRight,
  Link as LinkIcon,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Minus,
  Trash2,
  TableCellsMerge,
  TableCellsSplit,
  Table as TableIcon,
  Image as ImageIcon
} from 'lucide-react';
import styles from './Editor.module.css';

interface FloatingToolbarProps {
  editor: Editor;
}

const colors = [
  { name: 'Amber', color: '#e8a44b', hex: '#e8a44b' },
  { name: 'Red', color: '#ef4444', hex: '#ef4444' },
  { name: 'Blue', color: '#3b82f6', hex: '#3b82f6' },
  { name: 'Green', color: '#10b981', hex: '#10b981' },
  { name: 'Gray', color: '#6b7280', hex: '#6b7280' },
  { name: 'Default', color: 'reset', hex: '#ffffff' },
];

const highlights = [
  { name: 'Amber', color: '#e8a44b', hex: 'rgba(232, 164, 75, 0.3)' },
  { name: 'Red', color: '#ef4444', hex: 'rgba(239, 68, 68, 0.3)' },
  { name: 'Blue', color: '#3b82f6', hex: 'rgba(59, 130, 246, 0.3)' },
  { name: 'Green', color: '#10b981', hex: 'rgba(16, 185, 129, 0.3)' },
  { name: 'Default', color: 'reset', hex: '#ffffff' },
];

export default function FloatingToolbar({ editor }: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [activePopover, setActivePopover] = useState<'link' | 'color' | 'highlight' | null>(null);
  const [linkUrl, setLinkUrl] = useState('');

  // Auto-close popovers when toolbar becomes invisible
  useEffect(() => {
    if (!visible) {
      setActivePopover(null);
    }
  }, [visible]);

  useEffect(() => {
    const update = () => {
      const { selection, doc } = editor.state;
      const { from, to, empty } = selection;

      const isImage = editor.isActive('image');
      const isTable = editor.isActive('table');
      const hasTextSelection = !empty && doc.textBetween(from, to, ' ').trim().length > 0;

      if (!isImage && !isTable && !hasTextSelection) {
        setVisible(false);
        return;
      }

      // Find selection bounding rect
      const domSelection = window.getSelection();
      let rect: DOMRect | null = null;

      if (isImage) {
        // Node selection for image
        const imgNode = document.querySelector('.ProseMirror-selectednode');
        if (imgNode) {
          rect = imgNode.getBoundingClientRect();
        }
      } else if (domSelection && domSelection.rangeCount > 0) {
        const range = domSelection.getRangeAt(0);
        rect = range.getBoundingClientRect();
      }

      if (!rect || (!rect.width && !rect.height)) {
        setVisible(false);
        return;
      }

      const toolbar = toolbarRef.current;
      if (!toolbar) return;
      
      const container = toolbar.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const toolbarWidth = toolbar.offsetWidth || 340; // slightly wider for custom tools

      const TOOLBAR_HEIGHT = 44;
      const MARGIN = 8;

      const topAbove = rect.top - containerRect.top + container.scrollTop - TOOLBAR_HEIGHT - MARGIN;
      const topBelow = rect.bottom - containerRect.top + container.scrollTop + MARGIN;

      const isSelectionVisible = (
        rect.bottom >= containerRect.top &&
        rect.top <= containerRect.bottom
      );

      if (!isSelectionVisible) {
        setVisible(false);
        return;
      }

      const top = (rect.top - containerRect.top - TOOLBAR_HEIGHT - MARGIN) >= 0 ? topAbove : topBelow;

      const rawLeft = rect.left - containerRect.left + container.scrollLeft + rect.width / 2 - toolbarWidth / 2;
      const minLeft = MARGIN + container.scrollLeft;
      const maxLeft = containerRect.width - toolbarWidth - MARGIN + container.scrollLeft;
      const left = Math.max(minLeft, Math.min(rawLeft, maxLeft));

      setPosition({ top, left });
      setVisible(true);
    };

    editor.on('selectionUpdate', update);
    editor.on('transaction', update);

    const container = toolbarRef.current?.parentElement;
    if (container) {
      container.addEventListener('scroll', update, { passive: true });
    }

    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
      if (container) {
        container.removeEventListener('scroll', update);
      }
    };
  }, [editor]);

  const handleApplyLink = () => {
    if (!linkUrl) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    }
    setActivePopover(null);
    setLinkUrl('');
  };

  const handleUnlink = () => {
    editor.chain().focus().unsetLink().run();
    setActivePopover(null);
    setLinkUrl('');
  };

  const isImage = editor.isActive('image');
  const isTable = editor.isActive('table');

  return (
    <div
      ref={toolbarRef}
      className={styles.bubbleMenu}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 9999,
        pointerEvents: visible ? 'auto' : 'none',
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(4px)',
        transition: 'opacity 0.15s cubic-bezier(0.16, 1, 0.3, 1), transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* 1. Link Popover View */}
      {activePopover === 'link' && (
        <div className={styles.popoverLink}>
          <input
            type="text"
            className={styles.popoverInput}
            placeholder="Paste URL..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleApplyLink();
              if (e.key === 'Escape') setActivePopover(null);
            }}
            autoFocus
          />
          <button onClick={handleApplyLink} className={styles.popoverBtnApply}>Apply</button>
          {editor.isActive('link') && (
            <button onClick={handleUnlink} className={styles.popoverBtnUnlink}>Unlink</button>
          )}
          <button onClick={() => setActivePopover(null)} className={styles.popoverBtnCancel}>Cancel</button>
        </div>
      )}

      {/* 2. Color Popover View */}
      {activePopover === 'color' && (
        <div className={styles.popoverColors}>
          {colors.map((c) => (
            <button
              key={c.color}
              onClick={() => {
                if (c.color === 'reset') {
                  editor.chain().focus().unsetColor().run();
                } else {
                  editor.chain().focus().setColor(c.color).run();
                }
                setActivePopover(null);
              }}
              className={styles.colorSwatch}
              style={{ backgroundColor: c.hex }}
              title={c.name}
            />
          ))}
          <button onClick={() => setActivePopover(null)} className={styles.popoverColorsCancel}>Cancel</button>
        </div>
      )}

      {/* 3. Highlight Popover View */}
      {activePopover === 'highlight' && (
        <div className={styles.popoverColors}>
          {highlights.map((c) => (
            <button
              key={c.color}
              onClick={() => {
                if (c.color === 'reset') {
                  editor.chain().focus().unsetHighlight().run();
                } else {
                  editor.chain().focus().toggleHighlight({ color: c.color }).run();
                }
                setActivePopover(null);
              }}
              className={styles.colorSwatch}
              style={{ backgroundColor: c.hex }}
              title={c.name}
            />
          ))}
          <button onClick={() => setActivePopover(null)} className={styles.popoverColorsCancel}>Cancel</button>
        </div>
      )}

      {/* Main Toolbar buttons (hidden if any popover is active) */}
      {!activePopover && (() => {
        if (isImage) {
          // IMAGE CONTROLS
          return (
            <>
              {/* Width badges */}
              <button
                onClick={() => editor.chain().focus().updateAttributes('image', { width: '25%' }).run()}
                className={`${styles.bubbleMenuBtn} ${styles.badgeBtn}`}
                title="Size 25%"
              >
                25%
              </button>
              <button
                onClick={() => editor.chain().focus().updateAttributes('image', { width: '50%' }).run()}
                className={`${styles.bubbleMenuBtn} ${styles.badgeBtn}`}
                title="Size 50%"
              >
                50%
              </button>
              <button
                onClick={() => editor.chain().focus().updateAttributes('image', { width: '75%' }).run()}
                className={`${styles.bubbleMenuBtn} ${styles.badgeBtn}`}
                title="Size 75%"
              >
                75%
              </button>
              <button
                onClick={() => editor.chain().focus().updateAttributes('image', { width: '100%' }).run()}
                className={`${styles.bubbleMenuBtn} ${styles.badgeBtn}`}
                title="Full width (100%)"
              >
                100%
              </button>
              
              <span className={styles.toolbarDivider} />
              
              {/* Image alignment */}
              <button
                onClick={() => editor.chain().focus().updateAttributes('image', { align: 'left' }).run()}
                className={styles.bubbleMenuBtn}
                title="Align Left"
              >
                <AlignLeft size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().updateAttributes('image', { align: 'center' }).run()}
                className={styles.bubbleMenuBtn}
                title="Align Center"
              >
                <AlignCenter size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().updateAttributes('image', { align: 'right' }).run()}
                className={styles.bubbleMenuBtn}
                title="Align Right"
              >
                <AlignRight size={14} />
              </button>
              
              <span className={styles.toolbarDivider} />

              <button
                onClick={() => editor.chain().focus().deleteSelection().run()}
                className={`${styles.bubbleMenuBtn} ${styles.btnDanger}`}
                title="Delete Image"
              >
                <Trash2 size={14} />
              </button>
            </>
          );
        }

        if (isTable) {
          // TABLE CONTROLS
          return (
            <>
              {/* Row modifiers */}
              <button
                onClick={() => editor.chain().focus().addRowBefore().run()}
                className={styles.bubbleMenuBtn}
                title="Add Row Above"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className={styles.bubbleMenuBtn}
                title="Add Row Below"
              >
                <ChevronDown size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().deleteRow().run()}
                className={styles.bubbleMenuBtn}
                title="Delete Row"
              >
                <Minus size={14} />
              </button>
              
              <span className={styles.toolbarDivider} />
              
              {/* Column modifiers */}
              <button
                onClick={() => editor.chain().focus().addColumnBefore().run()}
                className={styles.bubbleMenuBtn}
                title="Add Column Before"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className={styles.bubbleMenuBtn}
                title="Add Column After"
              >
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().deleteColumn().run()}
                className={styles.bubbleMenuBtn}
                title="Delete Column"
              >
                <MinusCircleIcon size={14} />
              </button>
              
              <span className={styles.toolbarDivider} />

              {/* Merge & split cells */}
              <button
                onClick={() => editor.chain().focus().mergeCells().run()}
                className={styles.bubbleMenuBtn}
                title="Merge Cells"
              >
                <TableCellsMerge size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().splitCell().run()}
                className={styles.bubbleMenuBtn}
                title="Split Cell"
              >
                <TableCellsSplit size={14} />
              </button>

              <span className={styles.toolbarDivider} />

              <button
                onClick={() => editor.chain().focus().deleteTable().run()}
                className={`${styles.bubbleMenuBtn} ${styles.btnDanger}`}
                title="Delete Table"
              >
                <Trash2 size={14} />
              </button>
            </>
          );
        }

        // STANDARD TEXT FORMATTING CONTROLS
        return (
          <>
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

            {/* Colors and links triggers */}
            <button
              onClick={() => setActivePopover('highlight')}
              className={`${styles.bubbleMenuBtn}${editor.isActive('highlight') ? ` ${styles.active}` : ''}`}
              title="Text Background Highlight"
            >
              <Highlighter size={14} />
            </button>
            <button
              onClick={() => setActivePopover('color')}
              className={`${styles.bubbleMenuBtn}${editor.isActive('textStyle', { color: '#e8a44b' }) ? ` ${styles.active}` : ''}`}
              title="Text Color Palette"
            >
              <Palette size={14} />
            </button>
            <button
              onClick={() => {
                setLinkUrl(editor.getAttributes('link').href || '');
                setActivePopover('link');
              }}
              className={`${styles.bubbleMenuBtn}${editor.isActive('link') ? ` ${styles.active}` : ''}`}
              title="Hyperlink"
            >
              <LinkIcon size={14} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={`${styles.bubbleMenuBtn}${editor.isActive('taskList') ? ` ${styles.active}` : ''}`}
              title="Convert to Todo List"
            >
              <CheckSquare size={14} />
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
          </>
        );
      })()}
    </div>
  );
}

// Small helper inline component
const MinusCircleIcon = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);
