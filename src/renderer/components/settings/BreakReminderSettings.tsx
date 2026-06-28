import React, { useState, useEffect, useCallback } from 'react';
import { Timer, Coffee, Moon, Repeat } from 'lucide-react';
import styles from './BreakReminderSettings.module.css';

interface BreakSettings {
  timerFocus: number;
  timerShortBreak: number;
  timerLongBreak: number;
  timerSessionsBeforeLong: number;
  breakRemindersEnabled: boolean;
}

export default function BreakReminderSettings() {
  const [settings, setSettings] = useState<BreakSettings>({
    timerFocus: 25,
    timerShortBreak: 5,
    timerLongBreak: 15,
    timerSessionsBeforeLong: 4,
    breakRemindersEnabled: true,
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await (window as any).wrriter.getSettings();
        if (s) {
          setSettings({
            timerFocus: s.timerFocus ?? 25,
            timerShortBreak: s.timerShortBreak ?? 5,
            timerLongBreak: s.timerLongBreak ?? 15,
            timerSessionsBeforeLong: s.timerSessionsBeforeLong ?? 4,
            breakRemindersEnabled: s.breakRemindersEnabled ?? true,
          });
        }
      } catch (err) {
        console.error('Failed to load break reminder settings:', err);
      }
    };
    load();
  }, []);

  // Debounced auto-save
  const scheduleSave = useCallback((patch: Partial<BreakSettings>) => {
    if (saveTimer) clearTimeout(saveTimer);
    const t = setTimeout(async () => {
      try {
        await (window as any).wrriter.setSettings(patch);
        setFeedback('Saved ✓');
        setTimeout(() => setFeedback(null), 2000);
      } catch (err) {
        setFeedback('Error saving');
      }
    }, 500);
    setSaveTimer(t);
  }, [saveTimer]);

  const update = (key: keyof BreakSettings, value: number | boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    scheduleSave({ [key]: value });
  };

  return (
    <div className={styles.card}>
      <div className={styles.sectionHeader}>
        <Timer size={13} className={styles.sectionIcon} />
        <span className={styles.sectionTitle}>Break Reminders</span>
      </div>
      <p className={styles.sectionDesc}>
        Configure your Pomodoro focus and break durations. Changes apply at the start of the next session.
      </p>

      {/* Enable toggle */}
      <div className={styles.toggleRow}>
        <div className={styles.rowText}>
          <span className={styles.rowLabel}>Enable Break Reminders</span>
          <span className={styles.rowDesc}>Show break prompt overlays during Pomodoro sessions</span>
        </div>
        <label className={styles.switchLabel}>
          <input
            type="checkbox"
            checked={settings.breakRemindersEnabled}
            onChange={e => update('breakRemindersEnabled', e.target.checked)}
            className={styles.switchInput}
          />
          <span className={styles.switchSlider} />
        </label>
      </div>

      <div className={styles.divider} />

      {/* Timer fields */}
      <div className={styles.fieldsGrid}>
        <div className={styles.field}>
          <div className={styles.fieldHeader}>
            <Timer size={12} className={styles.fieldIcon} />
            <span className={styles.fieldLabel}>Focus</span>
          </div>
          <div className={styles.inputRow}>
            <input
              type="number"
              min={1} max={120}
              value={settings.timerFocus}
              onChange={e => update('timerFocus', Math.min(120, Math.max(1, Number(e.target.value))))}
              className={styles.numberInput}
            />
            <span className={styles.unit}>min</span>
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.fieldHeader}>
            <Coffee size={12} className={styles.fieldIcon} />
            <span className={styles.fieldLabel}>Short Break</span>
          </div>
          <div className={styles.inputRow}>
            <input
              type="number"
              min={1} max={30}
              value={settings.timerShortBreak}
              onChange={e => update('timerShortBreak', Math.min(30, Math.max(1, Number(e.target.value))))}
              className={styles.numberInput}
            />
            <span className={styles.unit}>min</span>
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.fieldHeader}>
            <Moon size={12} className={styles.fieldIcon} />
            <span className={styles.fieldLabel}>Long Break</span>
          </div>
          <div className={styles.inputRow}>
            <input
              type="number"
              min={1} max={60}
              value={settings.timerLongBreak}
              onChange={e => update('timerLongBreak', Math.min(60, Math.max(1, Number(e.target.value))))}
              className={styles.numberInput}
            />
            <span className={styles.unit}>min</span>
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.fieldHeader}>
            <Repeat size={12} className={styles.fieldIcon} />
            <span className={styles.fieldLabel}>Sessions → Long</span>
          </div>
          <div className={styles.inputRow}>
            <input
              type="number"
              min={1} max={10}
              value={settings.timerSessionsBeforeLong}
              onChange={e => update('timerSessionsBeforeLong', Math.min(10, Math.max(1, Number(e.target.value))))}
              className={styles.numberInput}
            />
            <span className={styles.unit}>sessions</span>
          </div>
        </div>
      </div>

      {feedback && <p className={styles.feedback}>{feedback}</p>}
    </div>
  );
}
