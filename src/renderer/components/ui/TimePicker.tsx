import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import styles from './TimePicker.module.css';

interface TimePickerProps {
  value: string; // HH:MM format
  onChange: (time: string) => void;
  onClose?: () => void;
}

export default function TimePicker({ value, onChange, onClose }: TimePickerProps) {
  const [hours, setHours] = useState(() => {
    if (value) {
      return parseInt(value.split(':')[0], 10);
    }
    return new Date().getHours();
  });

  const [minutes, setMinutes] = useState(() => {
    if (value) {
      return parseInt(value.split(':')[1], 10);
    }
    return Math.round(new Date().getMinutes() / 5) * 5; // Round to nearest 5
  });

  const [is24Hour, setIs24Hour] = useState(true);
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);

  const formatTime = (h: number, m: number) => {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const handleHourChange = (newHour: number) => {
    if (newHour < 0) newHour = 23;
    if (newHour > 23) newHour = 0;
    setHours(newHour);
    onChange(formatTime(newHour, minutes));
  };

  const handleMinuteChange = (newMinute: number) => {
    if (newMinute < 0) newMinute = 55;
    if (newMinute > 59) newMinute = 0;
    setMinutes(newMinute);
    onChange(formatTime(hours, newMinute));
  };

  const handleHourClick = (hour: number) => {
    setHours(hour);
    onChange(formatTime(hour, minutes));
  };

  const handleMinuteClick = (minute: number) => {
    setMinutes(minute);
    onChange(formatTime(hours, minute));
  };

  const handleNowClick = () => {
    const now = new Date();
    const nowHours = now.getHours();
    const nowMinutes = Math.round(now.getMinutes() / 5) * 5;
    setHours(nowHours);
    setMinutes(nowMinutes);
    onChange(formatTime(nowHours, nowMinutes));
  };

  const handleClearClick = () => {
    onChange('');
    onClose?.();
  };

  // Generate hour options
  const hourOptions = [];
  for (let h = 0; h < 24; h++) {
    hourOptions.push(h);
  }

  // Generate minute options (in 5-minute increments)
  const minuteOptions = [];
  for (let m = 0; m < 60; m += 5) {
    minuteOptions.push(m);
  }

  const formatDisplayHour = (hour: number) => {
    if (is24Hour) {
      return String(hour).padStart(2, '0');
    } else {
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return String(displayHour).padStart(2, '0');
    }
  };

  const getAmPm = (hour: number) => {
    return hour < 12 ? 'AM' : 'PM';
  };

  // Scroll to selected items on mount
  useEffect(() => {
    if (hourScrollRef.current) {
      const hourIndex = hourOptions.indexOf(hours);
      const scrollTop = hourIndex * 32 - 96; // Center the selected item
      hourScrollRef.current.scrollTop = Math.max(0, scrollTop);
    }
    
    if (minuteScrollRef.current) {
      const minuteIndex = minuteOptions.indexOf(minutes);
      const scrollTop = minuteIndex * 32 - 96;
      minuteScrollRef.current.scrollTop = Math.max(0, scrollTop);
    }
  }, []);

  return (
    <div className={styles.timePicker}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.timeDisplay}>
          <span className={styles.timeText}>
            {formatDisplayHour(hours)}:{String(minutes).padStart(2, '0')}
          </span>
          {!is24Hour && (
            <span className={styles.ampmText}>
              {getAmPm(hours)}
            </span>
          )}
        </div>
        
        <button 
          className={styles.formatToggle}
          onClick={() => setIs24Hour(!is24Hour)}
          title={`Switch to ${is24Hour ? '12' : '24'}-hour format`}
        >
          {is24Hour ? '24H' : '12H'}
        </button>
      </div>

      {/* Time selectors */}
      <div className={styles.timeSelectors}>
        {/* Hours column */}
        <div className={styles.timeColumn}>
          <div className={styles.columnHeader}>
            <button 
              className={styles.stepBtn}
              onClick={() => handleHourChange(hours - 1)}
            >
              <ChevronUp size={14} />
            </button>
            <span className={styles.columnLabel}>Hour</span>
            <button 
              className={styles.stepBtn}
              onClick={() => handleHourChange(hours + 1)}
            >
              <ChevronDown size={14} />
            </button>
          </div>
          
          <div className={styles.scrollContainer} ref={hourScrollRef}>
            <div className={styles.scrollPadding} />
            {hourOptions.map(hour => (
              <button
                key={hour}
                className={`${styles.timeOption} ${hour === hours ? styles.selected : ''}`}
                onClick={() => handleHourClick(hour)}
              >
                <span className={styles.timeValue}>
                  {formatDisplayHour(hour)}
                </span>
                {!is24Hour && (
                  <span className={styles.optionAmPm}>
                    {getAmPm(hour)}
                  </span>
                )}
              </button>
            ))}
            <div className={styles.scrollPadding} />
          </div>
        </div>

        <div className={styles.timeSeparator}>:</div>

        {/* Minutes column */}
        <div className={styles.timeColumn}>
          <div className={styles.columnHeader}>
            <button 
              className={styles.stepBtn}
              onClick={() => handleMinuteChange(minutes - 5)}
            >
              <ChevronUp size={14} />
            </button>
            <span className={styles.columnLabel}>Min</span>
            <button 
              className={styles.stepBtn}
              onClick={() => handleMinuteChange(minutes + 5)}
            >
              <ChevronDown size={14} />
            </button>
          </div>
          
          <div className={styles.scrollContainer} ref={minuteScrollRef}>
            <div className={styles.scrollPadding} />
            {minuteOptions.map(minute => (
              <button
                key={minute}
                className={`${styles.timeOption} ${minute === minutes ? styles.selected : ''}`}
                onClick={() => handleMinuteClick(minute)}
              >
                <span className={styles.timeValue}>
                  {String(minute).padStart(2, '0')}
                </span>
              </button>
            ))}
            <div className={styles.scrollPadding} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <button className={styles.footerBtn} onClick={handleClearClick}>
          Clear
        </button>
        <button className={styles.footerBtn} onClick={handleNowClick}>
          Now
        </button>
      </div>
    </div>
  );
}