import React, { forwardRef, useEffect, useImperativeHandle, useState, useRef } from 'react';
import styles from './Editor.module.css';

interface CommandListItem {
  title: string;
  description: string;
  command: (props: { editor: any; range: any }) => void;
}

interface CommandListProps {
  items: CommandListItem[];
  command: (item: CommandListItem) => void;
}

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

  return (
    <div ref={containerRef} className={styles.slashMenu}>
      {props.items.map((item, index) => (
        <button
          key={index}
          className={`${styles.slashMenuItem} ${index === selectedIndex ? styles.slashMenuItemActive : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => selectItem(index)}
        >
          <div className={styles.slashMenuItemTitle}>{item.title}</div>
          <div className={styles.slashMenuItemDesc}>{item.description}</div>
        </button>
      ))}
    </div>
  );
});

CommandList.displayName = 'CommandList';
export default CommandList;
