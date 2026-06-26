import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

interface TimerSettings {
  focusTime: number;       // in minutes
  shortBreakTime: number;  // in minutes
  longBreakTime: number;   // in minutes
  sessionsBeforeLong: number;
}

interface TimerContextType {
  timeLeft: number;        // in seconds
  isActive: boolean;
  mode: TimerMode;
  sessionsCompleted: number;
  settings: TimerSettings;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>; // For debugging/testing
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<TimerSettings>({
    focusTime: 25,
    shortBreakTime: 5,
    longBreakTime: 15,
    sessionsBeforeLong: 4
  });

  const [mode, setMode] = useState<TimerMode>('focus');
  const [isActive, setIsActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25 * 60);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load settings from electron-store via preload IPC
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const storeSettings = await (window as any).wrriter.getSettings();
        if (storeSettings) {
          const loadedSettings = {
            focusTime: storeSettings.timerFocus ?? 25,
            shortBreakTime: storeSettings.timerShortBreak ?? 5,
            longBreakTime: storeSettings.timerLongBreak ?? 15,
            sessionsBeforeLong: storeSettings.timerSessionsBeforeLong ?? 4
          };
          setSettings(loadedSettings);
          
          // Initialize timer based on loaded focusTime
          setTimeLeft(loadedSettings.focusTime * 60);
        }
      } catch (err) {
        console.error('Failed to load timer settings from store:', err);
      }
    };
    fetchSettings();
  }, []);

  // Request browser Notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const sendSystemNotification = useCallback((title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, silent: false });
    }
  }, []);

  // Helper to get time duration for a specific mode
  const getModeDuration = useCallback((targetMode: TimerMode, customSettings = settings) => {
    switch (targetMode) {
      case 'shortBreak':
        return customSettings.shortBreakTime * 60;
      case 'longBreak':
        return customSettings.longBreakTime * 60;
      case 'focus':
      default:
        return customSettings.focusTime * 60;
    }
  }, [settings]);

  // Transition modes when timer ends
  const handleTimerComplete = useCallback(() => {
    setIsActive(false);
    
    if (mode === 'focus') {
      const nextSessionCount = sessionsCompleted + 1;
      setSessionsCompleted(nextSessionCount);
      
      const isLongBreak = nextSessionCount > 0 && nextSessionCount % settings.sessionsBeforeLong === 0;
      const nextMode = isLongBreak ? 'longBreak' : 'shortBreak';
      
      setMode(nextMode);
      setTimeLeft(getModeDuration(nextMode));
      sendSystemNotification(
        isLongBreak ? 'Time for a Long Break!' : 'Focus Session Complete!',
        isLongBreak ? `Great job! Take a ${settings.longBreakTime}-minute break.` : `Time to rest for ${settings.shortBreakTime} minutes.`
      );
    } else {
      // Break over, transition to focus
      setMode('focus');
      setTimeLeft(getModeDuration('focus'));
      sendSystemNotification('Break is Over!', 'Ready to focus? Let\'s start writing.');
    }
  }, [mode, sessionsCompleted, settings, getModeDuration, sendSystemNotification]);

  // Main countdown timer interval loop
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, handleTimerComplete]);

  // Control operations
  const start = useCallback(() => setIsActive(true), []);
  const pause = useCallback(() => setIsActive(false), []);
  
  const reset = useCallback(() => {
    setIsActive(false);
    setTimeLeft(getModeDuration(mode));
  }, [mode, getModeDuration]);

  const skip = useCallback(() => {
    setIsActive(false);
    handleTimerComplete();
  }, [handleTimerComplete]);

  return (
    <TimerContext.Provider
      value={{
        timeLeft,
        isActive,
        mode,
        sessionsCompleted,
        settings,
        start,
        pause,
        reset,
        skip,
        setTimeLeft
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}
