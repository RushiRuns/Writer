import React, { useState, useEffect } from 'react';
import { VaultIndex, DrawingEntry, Stroke } from '../../../shared/ipc-types';
import { useCanvas } from '../../hooks/useCanvas';
import CanvasReplayer from './CanvasReplayer';
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
    <div className="flex h-full w-full bg-black text-neutral-300 overflow-hidden font-ui">
      {/* Drawings List Sidebar (Pane 3 layout equivalent) */}
      <div className="w-[240px] flex-shrink-0 bg-[#161616] border-r border-white/5 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <span className="font-semibold text-sm text-neutral-200 select-none">Drawings</span>
          <button
            onClick={handleNewDrawing}
            className="p-1 hover:bg-neutral-800 rounded border border-white/10 hover:border-brand-amber/40 text-neutral-400 hover:text-brand-amber transition-all"
            title="New Sketch"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="p-2 border-b border-white/5 flex-shrink-0">
          <div className="relative flex items-center bg-neutral-950 rounded px-2.5 py-1 border border-white/5 focus-within:border-brand-amber/50">
            <Search size={14} className="text-neutral-500 mr-2" />
            <input
              type="text"
              placeholder="Search drawings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-xs text-neutral-200 outline-none w-full font-sans"
            />
          </div>
        </div>

        {/* Drawings List Scroll Area */}
        <div className="flex-grow overflow-y-auto p-2 flex flex-col gap-1">
          {filteredDrawings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-xs text-neutral-600 italic">
              No sketches found
            </div>
          ) : (
            filteredDrawings.map((drawing) => {
              const isSelected = selectedDrawing?.name === drawing.name;
              return (
                <div
                  key={drawing.name}
                  onClick={() => setSelectedDrawing(drawing)}
                  className={`group flex items-center gap-3 p-3 rounded cursor-pointer border transition-all duration-150 ${
                    isSelected
                      ? 'border-brand-amber/40 bg-neutral-900/40 shadow-md shadow-brand-amber/5'
                      : 'border-transparent bg-neutral-950/40 hover:bg-neutral-900/30'
                  }`}
                >
                  <div className="p-1.5 rounded bg-neutral-900 border border-white/5 text-neutral-400 group-hover:text-brand-amber group-hover:border-brand-amber/30 transition-colors">
                    <ImageIcon size={14} />
                  </div>
                  <span className={`text-xs font-medium truncate flex-grow ${
                    isSelected ? 'text-brand-amber' : 'text-neutral-200'
                  }`}>
                    {drawing.name}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Workspace (Pane 4 layout equivalent) */}
      <div className="flex-grow flex flex-col bg-[#1c1c1c] h-full overflow-hidden">
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
          <div className="flex-grow flex flex-col overflow-hidden h-full">
            {/* Header controls bar */}
            <div className="px-6 py-3 border-b border-white/5 bg-[#141414] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-4 flex-grow max-w-md">
                <input
                  type="text"
                  placeholder="Sketch Name"
                  value={drawingName}
                  onChange={handleNameChange}
                  className="bg-transparent border-b border-transparent hover:border-white/10 focus:border-brand-amber/50 text-sm font-semibold text-neutral-200 py-1 outline-none w-full font-sans transition-all"
                />
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                {saveStatus.type === 'saving' && (
                  <span className="text-xs text-neutral-500 font-mono animate-pulse">Saving...</span>
                )}
                {saveStatus.type === 'success' && (
                  <div className="flex items-center gap-1 text-xs text-green-500 font-mono">
                    <CheckCircle2 size={12} />
                    <span>Saved</span>
                  </div>
                )}
                {saveStatus.type === 'error' && (
                  <div className="flex items-center gap-1 text-xs text-red-500 font-mono" title={saveStatus.message}>
                    <AlertCircle size={12} />
                    <span>Error</span>
                  </div>
                )}

                <button
                  onClick={handleSaveDrawing}
                  disabled={!drawingName.trim()}
                  className="flex items-center gap-1.5 bg-brand-amber hover:bg-amber-600 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:border-transparent text-black px-3.5 py-1.5 rounded text-xs font-semibold font-ui shadow transition-all border border-brand-amber/20 hover:border-amber-500/20"
                >
                  <Save size={13} />
                  <span>Save Sketch</span>
                </button>
              </div>
            </div>

            {/* Canvas Area Container */}
            <div className="flex-grow flex items-center justify-center overflow-auto p-6 bg-[#161616]">
              <div className="relative border border-white/10 rounded-lg bg-[#050505] shadow-2xl overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={width}
                  height={height}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={endDrawing}
                  className="bg-[#050505] block cursor-crosshair touch-none shadow-inner"
                  style={{ width: `${width}px`, height: `${height}px` }}
                />

                {/* 5-second Undo Clear Notification */}
                {showClearUndoBanner && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-neutral-900 border border-brand-amber/40 text-neutral-200 px-4 py-2 rounded-lg text-xs font-medium font-ui shadow-2xl z-20 animate-fade-in">
                    <span>Canvas cleared.</span>
                    <button
                      onClick={undoClear}
                      className="text-brand-amber hover:text-amber-400 font-bold uppercase tracking-wider text-[11px] px-1 py-0.5"
                    >
                      Undo
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Tools Toolbar */}
            <div className="px-6 py-4 border-t border-white/5 bg-[#141414] flex items-center justify-between flex-shrink-0">
              {/* Tool Selection */}
              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-white/5">
                <button
                  onClick={() => setTool('pen')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium font-ui transition-all ${
                    tool === 'pen'
                      ? 'bg-neutral-900 text-brand-amber border border-white/10 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/55'
                  }`}
                  title="Fine Pen"
                >
                  <PenTool size={13} />
                  <span>Pen</span>
                </button>
                <button
                  onClick={() => setTool('marker')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium font-ui transition-all ${
                    tool === 'marker'
                      ? 'bg-neutral-900 text-brand-amber border border-white/10 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/55'
                  }`}
                  title="Medium Marker"
                >
                  <Paintbrush size={13} />
                  <span>Marker</span>
                </button>
                <button
                  onClick={() => setTool('highlighter')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium font-ui transition-all ${
                    tool === 'highlighter'
                      ? 'bg-neutral-900 text-brand-amber border border-white/10 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/55'
                  }`}
                  title="Translucent Highlighter"
                >
                  <Highlighter size={13} />
                  <span>Highlighter</span>
                </button>
                <button
                  onClick={() => setTool('eraser')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium font-ui transition-all ${
                    tool === 'eraser'
                      ? 'bg-neutral-900 text-brand-amber border border-white/10 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/55'
                  }`}
                  title="Eraser"
                >
                  <Eraser size={13} />
                  <span>Eraser</span>
                </button>
              </div>

              {/* Color Selection (hidden if tool is eraser) */}
              <div className={`flex items-center gap-1.5 transition-opacity duration-200 ${tool === 'eraser' ? 'opacity-20 pointer-events-none' : ''}`}>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mr-2 font-mono">Colors</span>
                <div className="flex items-center gap-2 bg-neutral-950 px-2 py-1 rounded-lg border border-white/5 h-[36px]">
                  {colors.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setColor(c.value)}
                      className={`w-[20px] h-[20px] rounded-full border transition-all duration-150 relative ${
                        color === c.value
                          ? 'border-white scale-110 shadow shadow-white/30'
                          : 'border-white/20 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    >
                      {color === c.value && (
                        <span className="absolute inset-0.5 rounded-full border border-black/50" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size slider info */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold font-mono">Brush Size</span>
                <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-lg border border-white/5 h-[36px]">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={brushWidth}
                    onChange={(e) => setBrushWidth(Number(e.target.value))}
                    className="w-20 accent-brand-amber bg-neutral-900 h-1 rounded-lg cursor-pointer"
                  />
                  <span className="text-xs text-neutral-400 font-mono w-4 text-right">{brushWidth}px</span>
                </div>
              </div>

              {/* Action Operations (Undo / Redo / Clear / Replay) */}
              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-white/5">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="p-1.5 text-neutral-400 hover:text-brand-amber disabled:text-neutral-700 disabled:hover:bg-transparent hover:bg-neutral-900 rounded transition-colors"
                  title="Undo last stroke"
                >
                  <Undo2 size={15} />
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="p-1.5 text-neutral-400 hover:text-brand-amber disabled:text-neutral-700 disabled:hover:bg-transparent hover:bg-neutral-900 rounded transition-colors"
                  title="Redo stroke"
                >
                  <Redo2 size={15} />
                </button>
                <button
                  onClick={clearCanvas}
                  disabled={strokes.length === 0}
                  className="p-1.5 text-neutral-400 hover:text-red-500 disabled:text-neutral-700 disabled:hover:bg-transparent hover:bg-neutral-900 rounded transition-colors"
                  title="Clear canvas (undone within 5s)"
                >
                  <RotateCcw size={15} />
                </button>
                <div className="w-[1px] h-4 bg-white/10 mx-1" />
                <button
                  onClick={() => setReplayingStrokes(strokes)}
                  disabled={strokes.length === 0}
                  className="p-1.5 text-neutral-400 hover:text-brand-amber disabled:text-neutral-700 disabled:hover:bg-transparent hover:bg-neutral-900 rounded transition-colors"
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
