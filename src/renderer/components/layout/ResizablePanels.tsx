import React, { useRef } from 'react';
import styles from './ResizablePanels.module.css';

interface ResizablePanelsProps {
  pane2: React.ReactNode;
  pane3?: React.ReactNode;
  pane4?: React.ReactNode;
  pane2Width: number;
  setPane2Width: (width: number) => void;
  pane3Width: number;
  setPane3Width: (width: number) => void;
}

export default function ResizablePanels({
  pane2,
  pane3,
  pane4,
  pane2Width,
  setPane2Width,
  pane3Width,
  setPane3Width
}: ResizablePanelsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const startDragPane2 = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = pane2Width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      // Impose boundaries: min 160px, max 400px
      const newWidth = Math.max(160, Math.min(400, startWidth + deltaX));
      setPane2Width(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const startDragPane3 = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = pane3Width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      // Impose boundaries: min 180px, max 500px
      const newWidth = Math.max(180, Math.min(500, startWidth + deltaX));
      setPane3Width(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const showPane3And4 = !!pane3 && !!pane4;

  return (
    <div ref={containerRef} className={`flex h-full w-full overflow-hidden ${styles.container}`}>
      {/* Folder Tree Pane (Pane 2) */}
      <div style={{ width: `${pane2Width}px` }} className={styles.pane}>
        {pane2}
      </div>

      {showPane3And4 ? (
        <>
          {/* Draggable Divider 1 */}
          <div
            onMouseDown={startDragPane2}
            className={styles.divider}
          />

          {/* Note List Pane (Pane 3) */}
          <div style={{ width: `${pane3Width}px` }} className={styles.pane}>
            {pane3}
          </div>

          {/* Draggable Divider 2 */}
          <div
            onMouseDown={startDragPane3}
            className={styles.divider}
          />

          {/* Editor Pane (Pane 4) */}
          <div className={styles.editorPane}>
            {pane4}
          </div>
        </>
      ) : (
        /* Empty placeholder for the remaining workspace area */
        <div className="flex-grow h-full" style={{ backgroundColor: 'var(--bg-pane-editor)' }} />
      )}
    </div>
  );

}

