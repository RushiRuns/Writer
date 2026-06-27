import { useState, useRef, useEffect, useCallback } from 'react';
import { Stroke, StrokePoint } from '../../shared/ipc-types';
import { drawStroke } from '../utils/canvasRenderer';

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
  
  const [tool, setTool] = useState<'pen' | 'marker' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle' | 'arrow' | 'text'>('pen');
  const [color, setColor] = useState<string>('#E8A44B'); // default brand amber
  const [brushWidth, setBrushWidth] = useState<number>(4);
  const [opacity, setOpacity] = useState<number>(1);
  const [filled, setFilled] = useState<boolean>(false);
  
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
    } else if (['line', 'rect', 'circle', 'arrow'].includes(tool)) {
      setOpacity(1);
      setBrushWidth(4);
    } else if (tool === 'text') {
      setOpacity(1);
      setBrushWidth(4); // Use width to determine text size scale (e.g. 4 * 3 + 12 = 24px)
    }
  }, [tool]);

  // Redraw helper function using shared renderer
  const redraw = useCallback((strokesToDraw: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, width, height);
    
    strokesToDraw.forEach(stroke => {
      drawStroke(ctx, stroke);
    });
  }, [width, height]);

  // Redraw when strokes list updates
  useEffect(() => {
    redraw(strokes);
  }, [strokes, redraw]);

  const startDrawing = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'text') return; // Text tool logic is handled externally on click

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
      // Redraw all strokes plus current dot preview
      ctx.clearRect(0, 0, width, height);
      strokes.forEach(s => drawStroke(ctx, s));

      const activeStroke: Stroke = {
        tool,
        color,
        width: brushWidth,
        opacity,
        points: currentPointsRef.current,
        filled
      };
      drawStroke(ctx, activeStroke);
    }
  }, [width, height, tool, color, brushWidth, opacity, strokes, filled]);

  const draw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || tool === 'text') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;
    const pressure = e.pressure !== undefined && e.pressure !== 0 ? e.pressure : 0.5;
    
    const points = currentPointsRef.current;
    
    if (['line', 'rect', 'circle', 'arrow'].includes(tool)) {
      // For shapes, we only need start (points[0]) and current points (points[1])
      currentPointsRef.current = [points[0], { x, y, pressure }];
    } else {
      const lastPoint = points[points.length - 1];
      if (lastPoint && Math.abs(lastPoint.x - x) < 0.1 && Math.abs(lastPoint.y - y) < 0.1) {
        return;
      }
      points.push({ x, y, pressure });
    }
    
    // Redraw entire canvas with current preview stroke
    ctx.clearRect(0, 0, width, height);
    strokes.forEach(s => drawStroke(ctx, s));

    const activeStroke: Stroke = {
      tool,
      color,
      width: brushWidth,
      opacity,
      points: currentPointsRef.current,
      filled
    };
    drawStroke(ctx, activeStroke);
  }, [width, height, tool, color, brushWidth, opacity, strokes, filled]);

  const endDrawing = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || tool === 'text') return;
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
      const finalPoints = [...currentPointsRef.current];
      if (['line', 'rect', 'circle', 'arrow'].includes(tool) && finalPoints.length === 1) {
        // If it's a shape tool and they clicked/released without dragging, add a tiny offset so shape displays
        finalPoints.push({ ...finalPoints[0], x: finalPoints[0].x + 1, y: finalPoints[0].y + 1 });
      }

      const newStroke: Stroke = {
        tool,
        color,
        width: brushWidth,
        opacity,
        points: finalPoints,
        filled: ['rect', 'circle'].includes(tool) ? filled : undefined
      };
      
      setUndoStack(prev => [...prev, strokes]);
      setRedoStack([]);
      setStrokes(prev => [...prev, newStroke]);
    }
    
    currentPointsRef.current = [];
  }, [strokes, tool, color, brushWidth, opacity, filled]);

  // Expose text stroke creation helper
  const addTextStroke = useCallback((text: string, x: number, y: number) => {
    const newStroke: Stroke = {
      tool: 'text',
      color,
      width: brushWidth,
      opacity: 1,
      points: [{ x, y, pressure: 0.5 }],
      text
    };
    setUndoStack(prev => [...prev, strokes]);
    setRedoStack([]);
    setStrokes(prev => [...prev, newStroke]);
  }, [strokes, color, brushWidth]);

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
    filled,
    setFilled,
    startDrawing,
    draw,
    endDrawing,
    addTextStroke
  };
}
