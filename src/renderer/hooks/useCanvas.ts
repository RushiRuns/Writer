import { useState, useRef, useEffect, useCallback } from 'react';
import { Stroke, StrokePoint } from '../../shared/ipc-types';

export interface UseCanvasOptions {
  width: number;
  height: number;
  initialStrokes?: Stroke[];
}

export function useCanvas({ width, height, initialStrokes = [] }: UseCanvasOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
  const [undoStack, setUndoStack] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);
  
  const [tool, setTool] = useState<'pen' | 'marker' | 'highlighter' | 'eraser'>('pen');
  const [color, setColor] = useState<string>('#E8A44B'); // default brand amber
  const [brushWidth, setBrushWidth] = useState<number>(4);
  const [opacity, setOpacity] = useState<number>(1);
  
  const isDrawingRef = useRef<boolean>(false);
  const currentPointsRef = useRef<StrokePoint[]>([]);

  // Keep track of parameters and sync automatically based on tools
  useEffect(() => {
    if (tool === 'highlighter') {
      setOpacity(0.4);
      setBrushWidth(12);
    } else if (tool === 'marker') {
      setOpacity(1);
      setBrushWidth(8);
    } else if (tool === 'pen') {
      setOpacity(1);
      setBrushWidth(4);
    } else if (tool === 'eraser') {
      setOpacity(1);
      setBrushWidth(20);
    }
  }, [tool]);

  // Redraw helper function
  const redraw = useCallback((strokesToDraw: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, width, height);
    
    strokesToDraw.forEach(stroke => {
      if (stroke.points.length === 0) return;
      
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = stroke.opacity;
      }
      
      if (stroke.points.length === 1) {
        const pt = stroke.points[0];
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, (stroke.width * (0.2 + pt.pressure * 0.8)) / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.tool === 'eraser' ? 'rgba(0,0,0,1)' : stroke.color;
        ctx.fill();
      } else {
        for (let i = 1; i < stroke.points.length; i++) {
          const p1 = stroke.points[i - 1];
          const p2 = stroke.points[i];
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          const segmentPressure = (p1.pressure + p2.pressure) / 2;
          ctx.lineWidth = stroke.width * (0.2 + segmentPressure * 0.8);
          ctx.stroke();
        }
      }
      ctx.restore();
    });
  }, [width, height]);

  // Redraw when strokes list updates
  useEffect(() => {
    redraw(strokes);
  }, [strokes, redraw]);

  const startDrawing = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set pointer capture to lock events
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn('Pointer capture failed:', err);
    }
    
    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    
    // Convert coordinate scaling
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;
    
    // Collect pressure if styling/pressure is supported
    const pressure = e.pressure !== undefined && e.pressure !== 0 ? e.pressure : 0.5;
    
    currentPointsRef.current = [{ x, y, pressure }];
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.globalAlpha = opacity;
      }
      ctx.beginPath();
      ctx.arc(x, y, (brushWidth * (0.2 + pressure * 0.8)) / 2, 0, Math.PI * 2);
      ctx.fillStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : color;
      ctx.fill();
      ctx.restore();
    }
  }, [width, height, tool, color, brushWidth, opacity]);

  const draw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;
    const pressure = e.pressure !== undefined && e.pressure !== 0 ? e.pressure : 0.5;
    
    const points = currentPointsRef.current;
    const lastPoint = points[points.length - 1];
    
    if (lastPoint && Math.abs(lastPoint.x - x) < 0.1 && Math.abs(lastPoint.y - y) < 0.1) {
      return;
    }
    
    points.push({ x, y, pressure });
    
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.globalAlpha = opacity;
    }
    
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(x, y);
    const segmentPressure = (lastPoint.pressure + pressure) / 2;
    ctx.lineWidth = brushWidth * (0.2 + segmentPressure * 0.8);
    ctx.stroke();
    ctx.restore();
  }, [width, height, tool, color, brushWidth, opacity]);

  const endDrawing = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignore
      }
    }
    
    if (currentPointsRef.current.length > 0) {
      const newStroke: Stroke = {
        tool,
        color,
        width: brushWidth,
        opacity,
        points: [...currentPointsRef.current]
      };
      
      setUndoStack(prev => [...prev, strokes]);
      setRedoStack([]);
      setStrokes(prev => [...prev, newStroke]);
    }
    
    currentPointsRef.current = [];
  }, [strokes, tool, color, brushWidth, opacity]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, strokes]);
    setStrokes(previous);
  }, [strokes, undoStack]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, strokes]);
    setStrokes(next);
  }, [strokes, redoStack]);

  // Toast banner support for clearing canvas
  const [showClearUndoBanner, setShowClearUndoBanner] = useState(false);
  const clearedStrokesRef = useRef<Stroke[]>([]);
  const clearTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearCanvas = useCallback(() => {
    if (strokes.length === 0) return;
    
    setUndoStack(prev => [...prev, strokes]);
    setRedoStack([]);
    clearedStrokesRef.current = strokes;
    setStrokes([]);
    
    setShowClearUndoBanner(true);
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }
    clearTimerRef.current = setTimeout(() => {
      setShowClearUndoBanner(false);
      clearedStrokesRef.current = [];
    }, 5000);
  }, [strokes]);

  const undoClear = useCallback(() => {
    if (clearedStrokesRef.current.length > 0) {
      setStrokes(clearedStrokesRef.current);
      clearedStrokesRef.current = [];
      setShowClearUndoBanner(false);
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
    }
  }, []);

  return {
    canvasRef,
    strokes,
    setStrokes,
    undo,
    redo,
    clearCanvas,
    undoClear,
    showClearUndoBanner,
    canUndo: undoStack.length > 0 || showClearUndoBanner,
    canRedo: redoStack.length > 0,
    tool,
    setTool,
    color,
    setColor,
    brushWidth,
    setBrushWidth,
    startDrawing,
    draw,
    endDrawing
  };
}
