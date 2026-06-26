import React from 'react';
import { createPortal } from 'react-dom';
import { useTimer } from '../../contexts/TimerContext';
import { Coffee, SkipForward } from 'lucide-react';
import styles from './TimerOverlay.module.css';

export default function TimerOverlay() {
  const { timeLeft, mode, skip } = useTimer();

  // Only render during break modes
  if (mode === 'focus') {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getOverlayConfig = () => {
    switch (mode) {
      case 'longBreak':
        return {
          title: 'Long Break',
          message: 'Excellent session! Rest your mind, stretch your body, and get a cup of water.',
          icon: <Coffee size={28} className="text-brand-amber" />
        };
      case 'shortBreak':
      default:
        return {
          title: 'Short Break',
          message: 'Take a quick breather. Stand up, roll your shoulders, or look out the window.',
          icon: <Coffee size={28} className="text-brand-amber" />
        };
    }
  };

  const config = getOverlayConfig();

  // Portal to render at the end of document.body
  return createPortal(
    <div className={`${styles.overlay} animate-fade-in`}>
      {/* Glow aura in background */}
      <div className={styles.glowAura} />

      <div className={styles.content}>
        {/* Animated breathing icon */}
        <div className={`${styles.iconContainer} ${styles.pulse}`}>
          {config.icon}
        </div>

        <h2 className={styles.title}>
          {config.title}
        </h2>
        
        {/* Giant Timer countdown */}
        <div className={styles.timerText}>
          {formatTime(timeLeft)}
        </div>

        <p className={styles.message}>
          {config.message}
        </p>

        {/* Skip button */}
        <button
          onClick={skip}
          className={styles.skipBtn}
        >
          <SkipForward size={14} />
          <span>Skip Break</span>
        </button>
      </div>
    </div>,
    document.body
  );
}

