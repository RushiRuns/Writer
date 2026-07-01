import React, { forwardRef, useEffect, useImperativeHandle, useState, useRef } from 'react';
import { 
  Heading1, Heading2, Heading3, Type, List, ListOrdered, Quote, 
  Bold, Italic, Underline, Strikethrough, Code, Highlighter, Palette, 
  AlignLeft, AlignCenter, AlignRight, Table, Image, CheckSquare, 
  AlertCircle, FileCode, Calendar, Clock
} from 'lucide-react';
import styles from './Editor.module.css';

interface CommandListItem {
  title: string;
  description: string;
  group?: string;
  iconName?: string;
  command: (props: { editor: any; range: any }) => void;
}

interface CommandListProps {
  items: CommandListItem[];
  command: (item: CommandListItem) => void;
}

const iconMap: Record<string, any> = {
  'heading1': Heading1,
  'heading2': Heading2,
  'heading3': Heading3,
  'paragraph': Type,
  'bulletList': List,
  'orderedList': ListOrdered,
  'blockquote': Quote,
  'codeBlock': FileCode,
  'bold': Bold,
  'italic': Italic,
  'underline': Underline,
  'strike': Strikethrough,
  'code': Code,
  'highlight': Highlighter,
  'color': Palette,
  'alignLeft': AlignLeft,
  'alignCenter': AlignCenter,
  'alignRight': AlignRight,
  'table': Table,
  'image': Image,
  'todo': CheckSquare,
  'callout': AlertCircle,
  'date': Calendar,
  'time': Clock,
  'datetime': Clock,
};

export const CommandList = forwardRef<any, CommandListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.querySelector(`.${styles.slashMenuItemActive}`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (props.items.length === 0) return false;

      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }

      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }

      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }

      return false;
    },
  }));

  if (props.items.length === 0) {
    return null;
  }

  // Pre-calculate where headers should appear
  let currentGroup = '';

  return (
    <div ref={containerRef} className={styles.slashMenu}>
      {props.items.map((item, index) => {
        const showHeader = item.group && item.group !== currentGroup;
        if (showHeader) {
          currentGroup = item.group!;
        }

        const IconComponent = item.iconName ? iconMap[item.iconName] : null;

        return (
          <React.Fragment key={index}>
            {showHeader && (
              <div className={styles.slashMenuHeader}>{item.group}</div>
            )}
            <button
              className={`${styles.slashMenuItem} ${index === selectedIndex ? styles.slashMenuItemActive : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectItem(index)}
            >
              <div className={styles.slashMenuItemContent}>
                {IconComponent && <IconComponent size={14} className={styles.slashMenuItemIcon} />}
                <div className={styles.slashMenuItemText}>
                  <div className={styles.slashMenuItemTitle}>{item.title}</div>
                  <div className={styles.slashMenuItemDesc}>{item.description}</div>
                </div>
              </div>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
});

CommandList.displayName = 'CommandList';
export default CommandList;
