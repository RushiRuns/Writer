import React from 'react';
import { createPortal } from 'react-dom';
import { useTimer } from '../../contexts/TimerContext';
import { Coffee, SkipForward } from 'lucide-react';

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
    <div className="fixed inset-0 w-screen h-screen z-[9999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md select-none animate-fade-in">
      {/* Glow aura in background */}
      <div className="absolute w-[350px] h-[350px] rounded-full bg-brand-amber/5 blur-[80px] pointer-events-none" />

      <div className="relative flex flex-col items-center max-w-md text-center px-8 z-10">
        {/* Animated breathing icon */}
        <div className="w-16 h-16 rounded-full bg-neutral-900 border border-brand-amber/30 flex items-center justify-center mb-6 shadow-lg shadow-brand-amber/5 animate-pulse">
          {config.icon}
        </div>

        <h2 className="text-xs uppercase tracking-widest font-mono text-brand-amber/80 font-bold mb-1">
          {config.title}
        </h2>
        
        {/* Giant Timer countdown */}
        <div className="text-6xl font-bold font-mono text-neutral-100 tracking-tight mb-4 select-all drop-shadow-[0_0_15px_rgba(232,164,75,0.15)]">
          {formatTime(timeLeft)}
        </div>

        <p className="text-sm text-neutral-400 font-sans leading-relaxed mb-8 max-w-xs">
          {config.message}
        </p>

        {/* Skip button */}
        <button
          onClick={skip}
          className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white px-5 py-2.5 rounded-lg border border-white/10 hover:border-brand-amber/40 transition-all text-xs font-semibold font-ui shadow"
        >
          <SkipForward size={14} />
          <span>Skip Break</span>
        </button>
      </div>
    </div>,
    document.body
  );
}
