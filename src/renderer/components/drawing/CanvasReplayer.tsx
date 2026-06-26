import React, { useEffect, useRef } from 'react';
import { Stroke } from '../../../shared/ipc-types';
import { Play, SkipForward } from 'lucide-react';
import styles from './CanvasReplayer.module.css';

interface CanvasReplayerProps {
  strokes: Stroke[];
  width: number;
  height: number;
  onComplete: () => void;
}

export default function CanvasReplayer({ strokes, width, height, onComplete }: CanvasReplayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas first
    ctx.clearRect(0, 0, width, height);

    // Flatten all points with their stroke parameters so we can replay them sequentially
    interface ReplayPoint {
      x: number;
      y: number;
      pressure: number;
      strokeIndex: number;
      pointIndex: number;
      stroke: Stroke;
    }

    const replayPoints: ReplayPoint[] = [];
    strokes.forEach((stroke, strokeIndex) => {
      stroke.points.forEach((point, pointIndex) => {
        replayPoints.push({
          ...point,
          strokeIndex,
          pointIndex,
          stroke
        });
      });
    });

    if (replayPoints.length === 0) {
      onComplete();
      return;
    }

    let currentIndex = 0;
    
    // Calculate points to draw per frame so the total replay time is ~2-3 seconds max,
    // avoiding extremely long waits on large drawings, but still showing the sequence.
    const pointsPerFrame = Math.max(1, Math.ceil(replayPoints.length / 150));

    const animate = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const limit = Math.min(currentIndex + pointsPerFrame, replayPoints.length);

      for (let i = currentIndex; i < limit; i++) {
        const pt = replayPoints[i];
        const stroke = pt.stroke;

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

        if (pt.pointIndex === 0) {
          // Draw start of stroke
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, (stroke.width * (0.2 + pt.pressure * 0.8)) / 2, 0, Math.PI * 2);
          ctx.fillStyle = stroke.tool === 'eraser' ? 'rgba(0,0,0,1)' : stroke.color;
          ctx.fill();
        } else {
          // Draw line from previous point in the same stroke
          const prevPt = stroke.points[pt.pointIndex - 1];
          ctx.beginPath();
          ctx.moveTo(prevPt.x, prevPt.y);
          ctx.lineTo(pt.x, pt.y);
          const segmentPressure = (prevPt.pressure + pt.pressure) / 2;
          ctx.lineWidth = stroke.width * (0.2 + segmentPressure * 0.8);
          ctx.stroke();
        }

        ctx.restore();
      }

      currentIndex = limit;

      if (currentIndex < replayPoints.length) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Wait a tiny bit and complete
        setTimeout(onComplete, 200);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [strokes, width, height, onComplete]);

  return (
    <div className={styles.container}>
      <div className={styles.indicator}>
        <Play size={14} fill="currentColor" />
        <span>Replaying drawing history...</span>
      </div>

      <button
        onClick={onComplete}
        className={styles.skipBtn}
      >
        <SkipForward size={14} />
        <span>Skip Replay</span>
      </button>

      <div className={styles.canvasBorder}>
        {/* Canvas background noise/grid style matching settings default */}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={styles.canvas}
        />
      </div>
    </div>
  );
}
