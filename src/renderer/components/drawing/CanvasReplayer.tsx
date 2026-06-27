import React, { useEffect, useRef } from 'react';
import { Stroke } from '../../../shared/ipc-types';
import { Play, SkipForward } from 'lucide-react';
import { drawStroke } from '../../utils/canvasRenderer';
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
    
    // Calculate points to draw per frame so the total replay time is ~2-3 seconds max
    const pointsPerFrame = Math.max(1, Math.ceil(replayPoints.length / 150));

    const animate = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const limit = Math.min(currentIndex + pointsPerFrame, replayPoints.length);
      const pt = replayPoints[limit - 1];

      if (pt) {
        ctx.clearRect(0, 0, width, height);

        // Draw all completed strokes prior to current stroke
        for (let sIdx = 0; sIdx < pt.strokeIndex; sIdx++) {
          drawStroke(ctx, strokes[sIdx]);
        }

        // Draw currently animating stroke up to current point index
        drawStroke(ctx, pt.stroke, pt.pointIndex);
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
