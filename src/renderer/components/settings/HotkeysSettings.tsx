import React, { useState, useEffect, useRef } from 'react';
import { Keyboard } from 'lucide-react';
import styles from './HotkeysSettings.module.css';

export default function HotkeysSettings() {
  const [hotkeys, setHotkeys] = useState<{ commandPalette: string; floatingWindow: string }>({
    commandPalette: '',
    floatingWindow: ''
  });
  const [recordingField, setRecordingField] = useState<'commandPalette' | 'floatingWindow' | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  
  // Guard to prevent auto-saving during initial mount load
  const isLoadedRef = useRef(false);

  useEffect(() => {
    const loadHotkeys = async () => {
      try {
        const keys = await (window as any).wrriter.getHotkeys();
        if (keys) {
          setHotkeys({
            commandPalette: keys.commandPalette || 'Ctrl+Shift+Space',
            floatingWindow: keys.floatingWindow || 'Ctrl+Shift+W'
          });
        }
        // Set loaded ref to true so subsequent changes trigger auto-save
        isLoadedRef.current = true;
      } catch (err) {
        console.error('Failed to load hotkeys:', err);
      }
    };
    loadHotkeys();
  }, []);

  // Listen and record key combinations when focused
  useEffect(() => {
    if (!recordingField) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Do not bind lone modifier keys
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

      const keys: string[] = [];
      if (e.ctrlKey) keys.push('Ctrl');
      if (e.shiftKey) keys.push('Shift');
      if (e.altKey) keys.push('Alt');
      if (e.metaKey) keys.push('Meta');

      // Format key name to Electron globalShortcut specifications
      let keyName = e.key;
      if (keyName === ' ') keyName = 'Space';
      if (keyName.length === 1) keyName = keyName.toUpperCase();

      keys.push(keyName);
      const hotkeyStr = keys.join('+');

      setHotkeys(prev => ({
        ...prev,
        [recordingField]: hotkeyStr
      }));
      setRecordingField(null);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recordingField]);

  // Auto-save hotkey changes to disk immediately
  useEffect(() => {
    if (!isLoadedRef.current) return;

    const autoSave = async () => {
      try {
        setFeedback('Saving shortcut...');
        await (window as any).wrriter.setHotkeys(hotkeys);
        setFeedback('Shortcut saved automatically!');
        setTimeout(() => setFeedback(null), 2500);
      } catch (err) {
        setFeedback('Error auto-saving shortcut: ' + err);
      }
    };
    autoSave();
  }, [hotkeys]);

  return (
    <div className={styles.settingsCard}>
      <div className={styles.settingsCardHeader}>
        <Keyboard size={15} className={styles.headerIcon} />
        <h3 className={styles.settingsCardTitle}>Shortcuts</h3>
      </div>
      <div className={styles.fieldsList}>
        <div className={styles.fieldWrapper}>
          <div className={styles.labelTextGroup}>
            <span className={styles.label}>Command Palette</span>
            <span className={styles.description}>Global hotkey to toggle search and commands palette</span>
          </div>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              readOnly
              value={recordingField === 'commandPalette' ? 'Press Keys...' : hotkeys.commandPalette}
              onClick={() => setRecordingField('commandPalette')}
              className={`${styles.input} ${recordingField === 'commandPalette' ? styles.recording : ''}`}
            />
            <button 
              className={styles.recordBtn}
              onClick={() => setRecordingField('commandPalette')}
            >
              {recordingField === 'commandPalette' ? 'Listening...' : 'Record'}
            </button>
          </div>
        </div>

        <div className={styles.fieldWrapper}>
          <div className={styles.labelTextGroup}>
            <span className={styles.label}>Quick Capture Window</span>
            <span className={styles.description}>Global hotkey to open the quick entry popover</span>
          </div>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              readOnly
              value={recordingField === 'floatingWindow' ? 'Press Keys...' : hotkeys.floatingWindow}
              onClick={() => setRecordingField('floatingWindow')}
              className={`${styles.input} ${recordingField === 'floatingWindow' ? styles.recording : ''}`}
            />
            <button 
              className={styles.recordBtn}
              onClick={() => setRecordingField('floatingWindow')}
            >
              {recordingField === 'floatingWindow' ? 'Listening...' : 'Record'}
            </button>
          </div>
        </div>

        {feedback && (
          <div className={styles.footerRow}>
            <span className={styles.feedbackText}>{feedback}</span>
          </div>
        )}
      </div>
    </div>
  );
}
