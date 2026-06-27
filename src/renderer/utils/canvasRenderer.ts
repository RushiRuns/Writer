import { Stroke } from '../../shared/ipc-types';

const imageCache = new Map<string, HTMLImageElement>();

/**
 * Renders a single Stroke structure onto a given canvas 2D context.
 * Can render custom brushes (pen, marker, highlighter, eraser),
 * shapes (line, arrow, rect, circle), text, and filled shapes.
 * 
 * Supports drawing up to a specific point index (useful for playback or drag previews).
 */
export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  upToPointIndex?: number
) {
  const points = stroke.points;
  if (!points || points.length === 0) return;

  const maxIdx = upToPointIndex !== undefined ? Math.min(points.length - 1, upToPointIndex) : points.length - 1;
  if (maxIdx < 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Apply composite operation and color/styling details
  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.fillStyle = 'rgba(0,0,0,1)';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.globalAlpha = stroke.opacity;
  }

  const start = points[0];
  const end = points[maxIdx];

  // Draw depending on the tool selected
  if (stroke.tool === 'pen' || stroke.tool === 'marker' || stroke.tool === 'highlighter' || stroke.tool === 'eraser') {
    // Standard brush/freehand line drawing
    if (maxIdx === 0) {
      ctx.beginPath();
      ctx.arc(start.x, start.y, (stroke.width * (0.2 + start.pressure * 0.8)) / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (let i = 1; i <= maxIdx; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        const segmentPressure = (p1.pressure + p2.pressure) / 2;
        ctx.lineWidth = stroke.width * (0.2 + segmentPressure * 0.8);
        ctx.stroke();
      }
    }
  } else if (stroke.tool === 'line') {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.lineWidth = stroke.width;
    ctx.stroke();
  } else if (stroke.tool === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.lineWidth = stroke.width;
    ctx.stroke();

    // Draw Arrowhead
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const headLength = Math.max(12, stroke.width * 2.5);
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  } else if (stroke.tool === 'rect') {
    ctx.beginPath();
    const w = end.x - start.x;
    const h = end.y - start.y;
    ctx.rect(start.x, start.y, w, h);
    ctx.lineWidth = stroke.width;
    if (stroke.filled) {
      ctx.fill();
    }
    ctx.stroke();
  } else if (stroke.tool === 'circle') {
    ctx.beginPath();
    const radiusX = Math.abs(end.x - start.x) / 2;
    const radiusY = Math.abs(end.y - start.y) / 2;
    const centerX = Math.min(start.x, end.x) + radiusX;
    const centerY = Math.min(start.y, end.y) + radiusY;
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.lineWidth = stroke.width;
    if (stroke.filled) {
      ctx.fill();
    }
    ctx.stroke();
  } else if (stroke.tool === 'text') {
    if (stroke.text) {
      const fontSize = Math.max(12, stroke.width * 3 + 12);
      ctx.font = `500 ${fontSize}px sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(stroke.text, start.x, start.y);
    }
  } else if (stroke.tool === 'image') {
    const imgSource = stroke.image;
    if (imgSource) {
      const cached = imageCache.get(imgSource);
      if (cached) {
        ctx.drawImage(cached, start.x, start.y, end.x - start.x, end.y - start.y);
      } else {
        const img = new Image();
        img.src = imgSource;
        img.onload = () => {
          imageCache.set(imgSource, img);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('canvas-image-loaded'));
          }
        };
      }
    }
  } else if (stroke.tool === 'lasso') {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    for (let i = 1; i <= maxIdx; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#9ca3af'; // Brand amber selection color
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash
  }

  ctx.restore();
}
