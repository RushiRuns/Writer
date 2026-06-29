import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './DatePicker.module.css';

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  onClose?: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function DatePicker({ value, onChange, onClose }: DatePickerProps) {
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      return new Date(value + 'T00:00:00');
    }
    return new Date();
  });

  const selectedDate = value ? new Date(value + 'T00:00:00') : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const dateString = formatDateString(newDate);
    onChange(dateString);
    onClose?.();
  };

  const handleMonthChange = (direction: number) => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const handleYearChange = (direction: number) => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setFullYear(prev.getFullYear() + direction);
      return newDate;
    });
  };

  const handleTodayClick = () => {
    const todayString = formatDateString(today);
    onChange(todayString);
    onClose?.();
  };

  const handleClearClick = () => {
    onChange('');
    onClose?.();
  };

  // Generate calendar grid
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const lastDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Previous month's trailing days
  const prevMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 0);
  const prevMonthDays = prevMonth.getDate();
  const leadingDays = [];
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    leadingDays.push(prevMonthDays - i);
  }

  // Current month days
  const currentMonthDays = [];
  for (let day = 1; day <= daysInMonth; day++) {
    currentMonthDays.push(day);
  }

  // Next month's leading days
  const totalCells = 42; // 6 rows × 7 days
  const remainingCells = totalCells - leadingDays.length - currentMonthDays.length;
  const trailingDays = [];
  for (let day = 1; day <= remainingCells; day++) {
    trailingDays.push(day);
  }

  return (
    <div className={styles.datePicker}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.monthYear}>
          <button 
            className={styles.monthYearBtn}
            onClick={() => handleMonthChange(-1)}
          >
            <ChevronLeft size={14} />
          </button>
          
          <div className={styles.monthYearDisplay}>
            <span className={styles.monthName}>
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <div className={styles.yearControls}>
              <button 
                className={styles.yearBtn}
                onClick={() => handleYearChange(-1)}
                title="Previous year"
              >
                ↑
              </button>
              <button 
                className={styles.yearBtn}
                onClick={() => handleYearChange(1)}
                title="Next year"
              >
                ↓
              </button>
            </div>
          </div>

          <button 
            className={styles.monthYearBtn}
            onClick={() => handleMonthChange(1)}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className={styles.weekdays}>
        {WEEKDAYS.map(day => (
          <div key={day} className={styles.weekday}>{day}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={styles.calendar}>
        {/* Previous month trailing days */}
        {leadingDays.map((day) => (
          <button
            key={`prev-${day}`}
            className={`${styles.day} ${styles.otherMonth}`}
            onClick={() => {
              const prevMonthDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, day);
              const dateString = formatDateString(prevMonthDate);
              onChange(dateString);
              onClose?.();
            }}
          >
            {day}
          </button>
        ))}

        {/* Current month days */}
        {currentMonthDays.map(day => {
          const dayDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
          const dayString = formatDateString(dayDate);
          const isSelected = selectedDate && dayString === value;
          const isToday = dayString === formatDateString(today);
          
          return (
            <button
              key={day}
              className={`${styles.day} ${isSelected ? styles.selected : ''} ${isToday ? styles.today : ''}`}
              onClick={() => handleDateClick(day)}
            >
              {day}
            </button>
          );
        })}

        {/* Next month leading days */}
        {trailingDays.map((day) => (
          <button
            key={`next-${day}`}
            className={`${styles.day} ${styles.otherMonth}`}
            onClick={() => {
              const nextMonthDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, day);
              const dateString = formatDateString(nextMonthDate);
              onChange(dateString);
              onClose?.();
            }}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <button className={styles.footerBtn} onClick={handleClearClick}>
          Clear
        </button>
        <button className={styles.footerBtn} onClick={handleTodayClick}>
          Today
        </button>
      </div>
    </div>
  );
}