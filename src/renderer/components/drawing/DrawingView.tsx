import React, { useState, useEffect } from 'react';
import { VaultIndex, DrawingEntry, Stroke } from '../../../shared/ipc-types';
import { useCanvas } from '../../hooks/useCanvas';
import CanvasReplayer from './CanvasReplayer';
import styles from './DrawingView.module.css';
import { 
  PenTool, 
  Paintbrush, 
  Highlighter, 
  Eraser, 
  Undo2, 
  Redo2, 
  RotateCcw, 
  Play, 
  Save, 
  Plus, 
  Search, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface DrawingViewProps {
  index: VaultIndex;
  _vaultPath: string;
}

export default function DrawingView({ index, _vaultPath }: DrawingViewProps) {
  const [selectedDrawing, setSelectedDrawing] = useState<DrawingEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [drawingName, setDrawingName] = useState('');
  
  // Replay animation state
  const [replayingStrokes, setReplayingStrokes] = useState<Stroke[] | null>(null);
  
  // Canvas configuration
  const width = 800;
  const height = 600;
  
  const {
    canvasRef,
    strokes,
    setStrokes,
    undo,
    redo,
    clearCanvas,
    undoClear,
    showClearUndoBanner,
    canUndo,
    canRedo,
    tool,
    setTool,
    color,
    setColor,
    brushWidth,
    setBrushWidth,
    startDrawing,
    draw,
    endDrawing
  } = useCanvas({ width, height });

  // Save feedback state
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | 'saving' | null; message: string }>({
    type: null,
    message: ''
  });

  // Handle selected drawing changes - load strokes and trigger replay
  useEffect(() => {
    if (selectedDrawing) {
      const loadDrawingStrokes = async () => {
        try {
          setSaveStatus({ type: 'saving', message: 'Loading drawing...' });
          const res = await (window as any).wrriter.loadDrawing(selectedDrawing.name);
          setSaveStatus({ type: null, message: '' });
          
          if (res && res.strokes) {
            setDrawingName(selectedDrawing.name);
            // Trigger replay animation
            setReplayingStrokes(res.strokes);
          } else {
            setDrawingName(selectedDrawing.name);
            setStrokes([]);
            setReplayingStrokes(null);
          }
        } catch (err) {
          console.error('Failed to load drawing:', err);
          setSaveStatus({ type: 'error', message: 'Failed to load drawing data' });
          setDrawingName(selectedDrawing.name);
          setStrokes([]);
          setReplayingStrokes(null);
        }
      };
      loadDrawingStrokes();
    } else {
      setDrawingName('');
      setStrokes([]);
      setReplayingStrokes(null);
    }
  }, [selectedDrawing, setStrokes]);

  // Handle drawing name input changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDrawingName(e.target.value);
  };

  // Create new blank drawing
  const handleNewDrawing = () => {
    setSelectedDrawing(null);
    setDrawingName('Untitled Sketch');
    setStrokes([]);
    setReplayingStrokes(null);
    setSaveStatus({ type: null, message: '' });
  };

  // Save the drawing (writes PNG and JSON to Attachments/)
  const handleSaveDrawing = async () => {
    const nameToSave = drawingName.trim() || 'Untitled Sketch';
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setSaveStatus({ type: 'saving', message: 'Saving sketch...' });
      
      // Get base64 PNG data URL
      const pngBase64 = canvas.toDataURL('image/png');
      
      const res = await (window as any).wrriter.saveDrawing(nameToSave, strokes, pngBase64);
      
      if (res.success) {
        setSaveStatus({ type: 'success', message: `Saved "${nameToSave}" successfully!` });
        
        // Find or set selected drawing to keep reference
        setTimeout(() => {
          setSaveStatus({ type: null, message: '' });
        }, 3000);
      } else {
        setSaveStatus({ type: 'error', message: res.error || 'Failed to save sketch' });
      }
    } catch (err) {
      console.error('Failed to save drawing:', err);
      setSaveStatus({ type: 'error', message: String(err) });
    }
  };

  // Color Palette Selection
  const colors = [
    { name: 'Amber', value: '#E8A44B' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'White', value: '#FFFFFF' },
    { name: 'Gray', value: '#6B7280' }
  ];

  // Filter drawings list by search
  const filteredDrawings = index.drawings.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Switch from replayer to drawing editor
  const handleReplayComplete = (completedStrokes: Stroke[]) => {
    setStrokes(completedStrokes);
    setReplayingStrokes(null);
  };

  return (
    <div className={styles.container}>
      {/* Drawings List Sidebar (Pane 3 layout equivalent) */}
      <div className={styles.sidebar}>
        {/* Header */}
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>Drawings</span>
          <button
            onClick={handleNewDrawing}
            className={styles.newSketchBtn}
            title="New Sketch"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchContainer}>
          <div className={styles.searchInputWrapper}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search drawings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Drawings List Scroll Area */}
        <div className={styles.drawingsList}>
          {filteredDrawings.length === 0 ? (
            <div className={styles.emptyState}>
              No sketches found
            </div>
          ) : (
            filteredDrawings.map((drawing) => {
              const isSelected = selectedDrawing?.name === drawing.name;
              return (
                <div
                  key={drawing.name}
                  onClick={() => setSelectedDrawing(drawing)}
                  className={`${styles.drawingItem} ${isSelected ? styles.drawingItemActive : ''}`}
                >
                  <div className={styles.drawingIcon}>
                    <ImageIcon size={14} />
                  </div>
                  <span className={`${styles.drawingName} ${isSelected ? styles.drawingNameActive : ''}`}>
                    {drawing.name}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Workspace (Pane 4 layout equivalent) */}
      <div className={styles.mainWorkspace}>
        {replayingStrokes ? (
          // Replayer view
          <CanvasReplayer
            strokes={replayingStrokes}
            width={width}
            height={height}
            onComplete={() => handleReplayComplete(replayingStrokes)}
          />
        ) : (
          // Interactive Canvas editor
          <div className={styles.canvasEditor}>
            {/* Header controls bar */}
            <div className={styles.editorHeader}>
              <div className={styles.titleInputWrapper}>
                <input
                  type="text"
                  placeholder="Sketch Name"
                  value={drawingName}
                  onChange={handleNameChange}
                  className={styles.titleInput}
                />
              </div>

              {/* Status Indicator */}
              <div className={styles.statusContainer}>
                {saveStatus.type === 'saving' && (
                  <span className={styles.savingText}>Saving...</span>
                )}
                {saveStatus.type === 'success' && (
                  <div className={styles.successText}>
                    <CheckCircle2 size={12} />
                    <span>Saved</span>
                  </div>
                )}
                {saveStatus.type === 'error' && (
                  <div className={styles.errorText} title={saveStatus.message}>
                    <AlertCircle size={12} />
                    <span>Error</span>
                  </div>
                )}

                <button
                  onClick={handleSaveDrawing}
                  disabled={!drawingName.trim()}
                  className={styles.saveButton}
                >
                  <Save size={13} />
                  <span>Save Sketch</span>
                </button>
              </div>
            </div>

            {/* Canvas Area Container */}
            <div className={styles.canvasWrapper}>
              <div className={styles.canvasBorder}>
                <canvas
                  ref={canvasRef}
                  width={width}
                  height={height}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={endDrawing}
                  className={styles.canvas}
                  style={{ width: `${width}px`, height: `${height}px` }}
                />

                {/* 5-second Undo Clear Notification */}
                {showClearUndoBanner && (
                  <div className={styles.undoBanner}>
                    <span>Canvas cleared.</span>
                    <button
                      onClick={undoClear}
                      className={styles.undoButton}
                    >
                      Undo
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Tools Toolbar */}
            <div className={styles.toolbar}>
              {/* Tool Selection */}
              <div className={styles.toolsContainer}>
                <button
                  onClick={() => setTool('pen')}
                  className={`${styles.toolButton} ${tool === 'pen' ? styles.toolButtonActive : ''}`}
                  title="Fine Pen"
                >
                  <PenTool size={13} />
                  <span>Pen</span>
                </button>
                <button
                  onClick={() => setTool('marker')}
                  className={`${styles.toolButton} ${tool === 'marker' ? styles.toolButtonActive : ''}`}
                  title="Medium Marker"
                >
                  <Paintbrush size={13} />
                  <span>Marker</span>
                </button>
                <button
                  onClick={() => setTool('highlighter')}
                  className={`${styles.toolButton} ${tool === 'highlighter' ? styles.toolButtonActive : ''}`}
                  title="Translucent Highlighter"
                >
                  <Highlighter size={13} />
                  <span>Highlighter</span>
                </button>
                <button
                  onClick={() => setTool('eraser')}
                  className={`${styles.toolButton} ${tool === 'eraser' ? styles.toolButtonActive : ''}`}
                  title="Eraser"
                >
                  <Eraser size={13} />
                  <span>Eraser</span>
                </button>
              </div>

              {/* Color Selection (hidden if tool is eraser) */}
              <div className={`${styles.colorsWrapper} ${tool === 'eraser' ? styles.colorsDisabled : ''}`}>
                <span className={styles.colorsLabel}>Colors</span>
                <div className={styles.colorsContainer}>
                  {colors.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setColor(c.value)}
                      className={`${styles.colorBtn} ${color === c.value ? styles.colorBtnActive : ''}`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    >
                      {color === c.value && (
                        <span className={styles.colorBtnInner} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size slider info */}
              <div className={styles.sizeWrapper}>
                <span className={styles.sizeLabel}>Brush Size</span>
                <div className={styles.sizeContainer}>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={brushWidth}
                    onChange={(e) => setBrushWidth(Number(e.target.value))}
                    className={styles.sizeSlider}
                  />
                  <span className={styles.sizeText}>{brushWidth}px</span>
                </div>
              </div>

              {/* Action Operations (Undo / Redo / Clear / Replay) */}
              <div className={styles.actionsContainer}>
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className={styles.actionBtn}
                  title="Undo last stroke"
                >
                  <Undo2 size={15} />
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className={styles.actionBtn}
                  title="Redo stroke"
                >
                  <Redo2 size={15} />
                </button>
                <button
                  onClick={clearCanvas}
                  disabled={strokes.length === 0}
                  className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                  title="Clear canvas (undone within 5s)"
                >
                  <RotateCcw size={15} />
                </button>
                <div className={styles.divider} />
                <button
                  onClick={() => setReplayingStrokes(strokes)}
                  disabled={strokes.length === 0}
                  className={styles.actionBtn}
                  title="Replay drawing animation"
                >
                  <Play size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

}
