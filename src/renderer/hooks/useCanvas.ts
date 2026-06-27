import { useState, useRef, useEffect, useCallback } from 'react';
import { Stroke, StrokePoint } from '../../shared/ipc-types';
import { drawStroke } from '../utils/canvasRenderer';

export interface UseCanvasOptions {
  width: number;
  height: number;
  initialStrokes?: Stroke[];
}

// Perpendicular distance math helper for polyline simplification
function perpendicularDistance(p: StrokePoint, a: StrokePoint, b: StrokePoint) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) {
    return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  }
  const num = Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x);
  const den = Math.sqrt(dx * dx + dy * dy);
  return num / den;
}

// Ramer-Douglas-Peucker polyline simplification algorithm
function simplifyPath(points: StrokePoint[], epsilon: number): StrokePoint[] {
  if (points.length <= 2) return points;
  let dmax = 0;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }
  if (dmax > epsilon) {
    const recResults1 = simplifyPath(points.slice(0, index + 1), epsilon);
    const recResults2 = simplifyPath(points.slice(index), epsilon);
    return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
  }
  return [points[0], points[end]];
}

// Detect and correct wobbly shapes to lines, circles/ellipses, and rectangles
function detectCorrectedShape(stroke: Stroke): Stroke | null {
  const points = stroke.points;
  if (points.length < 8) return null; // too short to classify

  const simplified = simplifyPath(points, 12);
  const start = points[0];
  const end = points[points.length - 1];

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  points.forEach(pt => {
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  });
  const w = maxX - minX;
  const h = maxY - minY;

  // Start to end distance
  const seDist = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);

  // Total path length
  let pathLength = 0;
  for (let i = 1; i < points.length; i++) {
    pathLength += Math.sqrt((points[i].x - points[i - 1].x) ** 2 + (points[i].y - points[i - 1].y) ** 2);
  }

  // 1. Line check: if path is straight
  if (pathLength / (seDist || 1) < 1.15) {
    return {
      ...stroke,
      tool: 'line',
      points: [start, end]
    };
  }

  // 2. Closed shape checks (start and end points are near each other)
  const isClosed = seDist < 45 || seDist < pathLength * 0.25;
  if (isClosed) {
    // Is it a Circle?
    const cx = minX + w / 2;
    const cy = minY + h / 2;
    let rSum = 0;
    points.forEach(pt => {
      rSum += Math.sqrt((pt.x - cx) ** 2 + (pt.y - cy) ** 2);
    });
    const rAvg = rSum / points.length;

    let variance = 0;
    points.forEach(pt => {
      const r = Math.sqrt((pt.x - cx) ** 2 + (pt.y - cy) ** 2);
      variance += (r - rAvg) ** 2;
    });
    const stdDev = Math.sqrt(variance / points.length);

    if (stdDev / (rAvg || 1) < 0.12) {
      return {
        ...stroke,
        tool: 'circle',
        points: [
          { x: minX, y: minY, pressure: 0.5 },
          { x: maxX, y: maxY, pressure: 0.5 }
        ]
      };
    }

    // Is it a Rectangle?
    if (simplified.length >= 3 && simplified.length <= 6) {
      return {
        ...stroke,
        tool: 'rect',
        points: [
          { x: minX, y: minY, pressure: 0.5 },
          { x: maxX, y: maxY, pressure: 0.5 }
        ]
      };
    }
  }

  return null;
}

// Ray-casting point-in-polygon math helper
function isPointInPolygon(px: number, py: number, polygon: Array<{ x: number; y: number }>) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    const intersect = ((yi > py) !== (yj > py))
        && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function useCanvas({ width, height, initialStrokes = [] }: UseCanvasOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
  const [undoStack, setUndoStack] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);
  
  const [tool, setTool] = useState<'pen' | 'marker' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle' | 'arrow' | 'text' | 'image' | 'vectorEraser' | 'lasso' | 'pan'>('pen');
  const [color, setColor] = useState<string>('#E8A44B'); // default brand amber
  const [brushWidth, setBrushWidth] = useState<number>(4);
  const [opacity, setOpacity] = useState<number>(1);
  const [filled, setFilled] = useState<boolean>(false);

  // Zoom & Pan states
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);
  const [autoCorrect, setAutoCorrect] = useState<boolean>(false);

  // Panning operational states
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const panInitRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Lasso Selection & Transforming states
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const isTransformingRef = useRef<boolean>(false);
  const isResizingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const originalStrokesRef = useRef<Stroke[]>([]);
  
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
    } else if (['line', 'rect', 'circle', 'arrow', 'lasso', 'pan'].includes(tool)) {
      setOpacity(1);
      setBrushWidth(4);
    } else if (tool === 'text') {
      setOpacity(1);
      setBrushWidth(4);
    } else if (tool === 'vectorEraser') {
      setOpacity(1);
      setBrushWidth(12);
    }
  }, [tool]);

  // Redraw helper function incorporating scaling translation matrices
  const redraw = useCallback((strokesToDraw: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, width, height);
    
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
    strokesToDraw.forEach(stroke => {
      drawStroke(ctx, stroke);
    });
    
    ctx.restore();
  }, [width, height, zoom, pan]);

  // Redraw when strokes list updates or pan/zoom values shift
  useEffect(() => {
    redraw(strokes);
  }, [strokes, redraw, zoom, pan]);

  // Redraw handler trigger for asynchronous image loads
  useEffect(() => {
    const handleImageLoaded = () => {
      redraw(strokes);
    };
    window.addEventListener('canvas-image-loaded', handleImageLoaded);
    return () => {
      window.removeEventListener('canvas-image-loaded', handleImageLoaded);
    };
  }, [strokes, redraw]);

  // Helper to detect if a coordinate hits a stroke point
  const findClickedStrokeIndex = useCallback((x: number, y: number): number => {
    for (let i = strokes.length - 1; i >= 0; i--) {
      const stroke = strokes[i];
      if (!stroke) continue;
      for (const pt of stroke.points) {
        const dx = pt.x - x;
        const dy = pt.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const threshold = Math.max(15, stroke.width / 2 + 12);
        if (distance <= threshold) {
          return i;
        }
      }
    }
    return -1;
  }, [strokes]);

  // Expose resizing handle start hook
  const startResizingSelection = useCallback((x: number, y: number) => {
    isResizingRef.current = true;
    dragStartRef.current = { x, y };
    originalStrokesRef.current = JSON.parse(JSON.stringify(strokes));
    setUndoStack(prev => [...prev, strokes]);
    setRedoStack([]);
  }, [strokes]);

  const startDrawing = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'text') return; // Handled inline by text input fields

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Check for Hand/Pan Mode drag
    if (tool === 'pan') {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      panInitRef.current = { ...pan };
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (err) {
        // Ignore
      }
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const canvasX = ((e.clientX - rect.left) / rect.width) * width;
    const canvasY = ((e.clientY - rect.top) / rect.height) * height;
    
    // Map coordinate through zoom/pan matrices
    let x = (canvasX - pan.x) / zoom;
    let y = (canvasY - pan.y) / zoom;
    const pressure = e.pressure !== undefined && e.pressure !== 0 ? e.pressure : 0.5;

    // Apply snap-to-grid alignment (20px coordinates)
    const snapEligibleTools = ['line', 'rect', 'circle', 'arrow', 'text'];
    if (snapToGrid && snapEligibleTools.includes(tool)) {
      x = Math.round(x / 20) * 20;
      y = Math.round(y / 20) * 20;
    }

    // Vector (Stroke) Eraser Mode click
    if (tool === 'vectorEraser') {
      isDrawingRef.current = true; // allow dragging to erase multiple strokes
      const clickedIdx = findClickedStrokeIndex(x, y);
      if (clickedIdx !== -1) {
        setUndoStack(prev => [...prev, strokes]);
        setRedoStack([]);
        setStrokes(prev => prev.filter((_, idx) => idx !== clickedIdx));
        setSelectedIndices(prev => prev.filter(idx => idx !== clickedIdx).map(idx => idx > clickedIdx ? idx - 1 : idx));
      }
      return;
    }

    // Lasso Selection Mode click
    if (tool === 'lasso') {
      let clickedInsideSelection = false;
      if (selectedIndices.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        selectedIndices.forEach(idx => {
          const stroke = strokes[idx];
          if (!stroke) return;
          stroke.points.forEach(pt => {
            if (pt.x < minX) minX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y > maxY) maxY = pt.y;
          });
        });

        // Add padding threshold for grabbing bounding boxes
        if (x >= minX - 15 && x <= maxX + 15 && y >= minY - 15 && y <= maxY + 15) {
          clickedInsideSelection = true;
        }
      }

      if (clickedInsideSelection) {
        // Drag select transformation
        isTransformingRef.current = true;
        dragStartRef.current = { x, y };
        originalStrokesRef.current = JSON.parse(JSON.stringify(strokes));
        setUndoStack(prev => [...prev, strokes]);
        setRedoStack([]);
        return;
      } else {
        // Clicked outside, reset selection bounding boxes
        setSelectedIndices([]);
      }
    }

    // Set pointer capture to lock events
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn('Pointer capture failed:', err);
    }
    
    isDrawingRef.current = true;
    currentPointsRef.current = [{ x, y, pressure }];
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);
      
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
      ctx.restore();
    }
  }, [width, height, tool, color, brushWidth, opacity, strokes, filled, selectedIndices, findClickedStrokeIndex, zoom, pan, snapToGrid]);

  const draw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle Pan Dragging operations
    if (isPanningRef.current && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPan({
        x: panInitRef.current.x + dx,
        y: panInitRef.current.y + dy
      });
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const canvasX = ((e.clientX - rect.left) / rect.width) * width;
    const canvasY = ((e.clientY - rect.top) / rect.height) * height;
    
    // Map coordinate through zoom/pan matrices
    let x = (canvasX - pan.x) / zoom;
    let y = (canvasY - pan.y) / zoom;
    const pressure = e.pressure !== undefined && e.pressure !== 0 ? e.pressure : 0.5;

    // Apply grid snap coordinates alignment
    const snapEligibleTools = ['line', 'rect', 'circle', 'arrow', 'text'];
    if (snapToGrid && (snapEligibleTools.includes(tool) || isResizingRef.current)) {
      x = Math.round(x / 20) * 20;
      y = Math.round(y / 20) * 20;
    }

    // Vector Eraser Dragging
    if (isDrawingRef.current && tool === 'vectorEraser') {
      const clickedIdx = findClickedStrokeIndex(x, y);
      if (clickedIdx !== -1) {
        setUndoStack(prev => [...prev, strokes]);
        setRedoStack([]);
        setStrokes(prev => prev.filter((_, idx) => idx !== clickedIdx));
        setSelectedIndices(prev => prev.filter(idx => idx !== clickedIdx).map(idx => idx > clickedIdx ? idx - 1 : idx));
      }
      return;
    }

    // Lasso transforming (resizing selection)
    if (isResizingRef.current && dragStartRef.current && originalStrokesRef.current.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      selectedIndices.forEach(idx => {
        const stroke = originalStrokesRef.current[idx];
        if (!stroke) return;
        stroke.points.forEach(pt => {
          if (pt.x < minX) minX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y > maxY) maxY = pt.y;
        });
      });

      if (minX !== Infinity) {
        const origWidth = maxX - minX;
        const origHeight = maxY - minY;
        
        const newWidth = Math.max(10, x - minX);
        const newHeight = Math.max(10, y - minY);
        
        const sx = origWidth > 0 ? newWidth / origWidth : 1;
        const sy = origHeight > 0 ? newHeight / origHeight : 1;

        setStrokes(prev => {
          const next = [...prev];
          selectedIndices.forEach(sIdx => {
            const origStroke = originalStrokesRef.current[sIdx];
            if (!origStroke) return;
            next[sIdx] = {
              ...origStroke,
              points: origStroke.points.map(pt => ({
                ...pt,
                x: minX + (pt.x - minX) * sx,
                y: minY + (pt.y - minY) * sy
              }))
            };
          });
          return next;
        });
      }
      return;
    }

    // Lasso transforming (dragging selection)
    if (isTransformingRef.current && dragStartRef.current && originalStrokesRef.current.length > 0) {
      const dx = x - dragStartRef.current.x;
      const dy = y - dragStartRef.current.y;

      setStrokes(prev => {
        const next = [...prev];
        selectedIndices.forEach(sIdx => {
          const origStroke = originalStrokesRef.current[sIdx];
          if (!origStroke) return;
          next[sIdx] = {
            ...origStroke,
            points: origStroke.points.map(pt => ({
              ...pt,
              x: pt.x + dx,
              y: pt.y + dy
            }))
          };
        });
        return next;
      });
      return;
    }

    if (!isDrawingRef.current || tool === 'text') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const points = currentPointsRef.current;
    
    if (['line', 'rect', 'circle', 'arrow'].includes(tool)) {
      currentPointsRef.current = [points[0], { x, y, pressure }];
    } else {
      const lastPoint = points[points.length - 1];
      if (lastPoint && Math.abs(lastPoint.x - x) < 0.1 && Math.abs(lastPoint.y - y) < 0.1) {
        return;
      }
      points.push({ x, y, pressure });
    }
    
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
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
    ctx.restore();
  }, [width, height, tool, color, brushWidth, opacity, strokes, filled, selectedIndices, findClickedStrokeIndex, zoom, pan, snapToGrid]);

  const endDrawing = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'pan') {
      isPanningRef.current = false;
      panStartRef.current = null;
      return;
    }

    if (tool === 'vectorEraser') {
      isDrawingRef.current = false;
      return;
    }

    if (isResizingRef.current) {
      isResizingRef.current = false;
      dragStartRef.current = null;
      return;
    }

    if (isTransformingRef.current) {
      isTransformingRef.current = false;
      dragStartRef.current = null;
      return;
    }

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
      if (tool === 'lasso') {
        // Enclosure boundary selection math
        const polygon = [...currentPointsRef.current];
        if (polygon.length >= 3) {
          const selected: number[] = [];
          strokes.forEach((stroke, strokeIdx) => {
            if (!stroke) return;
            const isEnclosed = stroke.points.some(pt => isPointInPolygon(pt.x, pt.y, polygon));
            if (isEnclosed) {
              selected.push(strokeIdx);
            }
          });
          setSelectedIndices(selected);
        }
        
        // Redraw to remove lasso dotted outline path from render buffer
        const ctx = canvas?.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          ctx.save();
          ctx.translate(pan.x, pan.y);
          ctx.scale(zoom, zoom);
          strokes.forEach(s => drawStroke(ctx, s));
          ctx.restore();
        }
      } else {
        const finalPoints = [...currentPointsRef.current];
        if (['line', 'rect', 'circle', 'arrow'].includes(tool) && finalPoints.length === 1) {
          finalPoints.push({ ...finalPoints[0], x: finalPoints[0].x + 1, y: finalPoints[0].y + 1 });
        }

        let newStroke: Stroke = {
          tool,
          color,
          width: brushWidth,
          opacity,
          points: finalPoints,
          filled: ['rect', 'circle'].includes(tool) ? filled : undefined
        };

        // Smart Shape Auto-Correction
        const brushes = ['pen', 'marker', 'highlighter'];
        if (autoCorrect && brushes.includes(tool)) {
          const corrected = detectCorrectedShape(newStroke);
          if (corrected) {
            newStroke = corrected;
          }
        }
        
        setUndoStack(prev => [...prev, strokes]);
        setRedoStack([]);
        setStrokes(prev => [...prev, newStroke]);
      }
    }
    
    currentPointsRef.current = [];
  }, [strokes, tool, color, brushWidth, opacity, filled, autoCorrect, zoom, pan]);

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

  // Expose image stroke creation helper
  const addImageStroke = useCallback((base64: string) => {
    // Default size 400x300 centered on canvas relative to current zoom/pan center
    const imgW = 400;
    const imgH = 300;
    
    // Position image centered inside the visible workspace
    const visualCenterX = (width / 2 - pan.x) / zoom;
    const visualCenterY = (height / 2 - pan.y) / zoom;
    
    const x1 = visualCenterX - imgW / 2;
    const y1 = visualCenterY - imgH / 2;
    const x2 = x1 + imgW;
    const y2 = y1 + imgH;

    const newStroke: Stroke = {
      tool: 'image',
      color: '#FFFFFF',
      width: 1,
      opacity: 1,
      points: [
        { x: x1, y: y1, pressure: 0.5 },
        { x: x2, y: y2, pressure: 0.5 }
      ],
      image: base64
    };

    setUndoStack(prev => [...prev, strokes]);
    setRedoStack([]);
    setStrokes(prev => [...prev, newStroke]);
    
    setSelectedIndices([strokes.length]);
    setTool('lasso');
  }, [strokes, width, height, zoom, pan]);

  // Expose selection deletion helper
  const deleteSelectedStrokes = useCallback(() => {
    if (selectedIndices.length === 0) return;
    setUndoStack(prev => [...prev, strokes]);
    setRedoStack([]);
    setStrokes(prev => prev.filter((_, idx) => !selectedIndices.includes(idx)));
    setSelectedIndices([]);
  }, [strokes, selectedIndices]);

  const clearSelection = useCallback(() => {
    setSelectedIndices([]);
  }, []);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, strokes]);
    setStrokes(previous);
    setSelectedIndices([]);
  }, [strokes, undoStack]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, strokes]);
    setStrokes(next);
    setSelectedIndices([]);
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
    setSelectedIndices([]);
    
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
    addTextStroke,
    addImageStroke,
    selectedIndices,
    setSelectedIndices,
    deleteSelectedStrokes,
    clearSelection,
    startResizingSelection,
    zoom,
    setZoom,
    pan,
    setPan,
    snapToGrid,
    setSnapToGrid,
    autoCorrect,
    setAutoCorrect
  };
}
