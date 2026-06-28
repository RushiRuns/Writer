import React, { useState, useEffect } from 'react';
import { Palette, Type, Pilcrow, ToggleLeft, ToggleRight } from 'lucide-react';
import styles from './EditorSettings.module.css';

type Texture = 'none' | 'grid' | 'dots' | 'ruled' | 'paper';
type FontFamily = 'Inter' | 'Outfit' | 'JetBrains Mono' | 'Playfair Display' | 'System Default';

const TEXTURE_OPTIONS: { value: Texture; label: string; preview: string }[] = [
  { value: 'none', label: 'None', preview: 'none' },
  { value: 'grid', label: 'Grid', preview: 'grid' },
  { value: 'dots', label: 'Dots', preview: 'dots' },
  { value: 'ruled', label: 'Ruled', preview: 'ruled' },
  { value: 'paper', label: 'Paper', preview: 'paper' },
];

const FONT_OPTIONS: { value: FontFamily; css: string }[] = [
  { value: 'Inter', css: '"Inter", sans-serif' },
  { value: 'Outfit', css: '"Outfit", sans-serif' },
  { value: 'JetBrains Mono', css: '"JetBrains Mono", monospace' },
  { value: 'Playfair Display', css: '"Playfair Display", serif' },
  { value: 'System Default', css: '-apple-system, BlinkMacSystemFont, sans-serif' },
];

export default function EditorSettings() {
  const [texture, setTexture] = useState<Texture>('none');
  const [tabSize, setTabSize] = useState<2 | 4>(2);
  const [spellcheck, setSpellcheck] = useState(true);
  const [fontFamily, setFontFamily] = useState<FontFamily>('Inter');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await (window as any).wrriter.getSettings();
        if (s) {
          setTexture(s.texture ?? 'none');
          setTabSize(s.tabSize ?? 2);
          setSpellcheck(s.spellcheck ?? true);
          setFontFamily(s.fontFamily ?? 'Inter');
          // Apply persisted texture on mount
          document.documentElement.setAttribute('data-texture', s.texture ?? 'none');
        }
      } catch (err) {
        console.error('Failed to load editor settings:', err);
      }
    };
    load();
  }, []);

  const save = async (patch: Record<string, unknown>, msg = 'Saved ✓') => {
    try {
      await (window as any).wrriter.setSettings(patch);
      setFeedback(msg);
      setTimeout(() => setFeedback(null), 2000);
    } catch (err) {
      setFeedback('Error saving settings');
    }
  };

  const handleTexture = (t: Texture) => {
    setTexture(t);
    document.documentElement.setAttribute('data-texture', t);
    save({ texture: t });
  };

  const handleTabSize = (s: 2 | 4) => {
    setTabSize(s);
    save({ tabSize: s });
  };

  const handleSpellcheck = () => {
    const next = !spellcheck;
    setSpellcheck(next);
    save({ spellcheck: next });
  };

  const handleFont = (f: FontFamily) => {
    setFontFamily(f);
    const matched = FONT_OPTIONS.find(o => o.value === f);
    if (matched) {
      document.documentElement.style.setProperty('--font-editor-override', matched.css);
    }
    save({ fontFamily: f });
  };

  return (
    <div className={styles.card}>
      {/* Texture */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Palette size={13} className={styles.sectionIcon} />
          <span className={styles.sectionTitle}>Editor Texture</span>
        </div>
        <p className={styles.sectionDesc}>
          Applies a subtle background pattern to the editor pane.
        </p>
        <div className={styles.textureGrid}>
          {TEXTURE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`${styles.textureSwatch} ${texture === opt.value ? styles.textureSwatchActive : ''}`}
              onClick={() => handleTexture(opt.value)}
              title={opt.label}
            >
              <div className={`${styles.swatchPreview} ${styles[`preview_${opt.preview}`]}`} />
              <span className={styles.swatchLabel}>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.divider} />

      {/* Font Family */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Type size={13} className={styles.sectionIcon} />
          <span className={styles.sectionTitle}>Editor Font</span>
        </div>
        <p className={styles.sectionDesc}>
          Sets the typeface used inside the editor pane.
        </p>
        <div className={styles.fontGrid}>
          {FONT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`${styles.fontBtn} ${fontFamily === opt.value ? styles.fontBtnActive : ''}`}
              style={{ fontFamily: opt.css }}
              onClick={() => handleFont(opt.value)}
            >
              {opt.value}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.divider} />

      {/* Tab Size */}
      <div className={styles.section}>
        <div className={styles.row}>
          <div className={styles.rowText}>
            <div className={styles.sectionHeader}>
              <Pilcrow size={13} className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>Tab Indentation</span>
            </div>
            <p className={styles.sectionDesc}>Number of spaces inserted per Tab key press.</p>
          </div>
          <div className={styles.segmented}>
            <button
              className={`${styles.segBtn} ${tabSize === 2 ? styles.segBtnActive : ''}`}
              onClick={() => handleTabSize(2)}
            >
              2 spaces
            </button>
            <button
              className={`${styles.segBtn} ${tabSize === 4 ? styles.segBtnActive : ''}`}
              onClick={() => handleTabSize(4)}
            >
              4 spaces
            </button>
          </div>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Spellcheck */}
      <div className={styles.section}>
        <div className={styles.row}>
          <div className={styles.rowText}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Spell Check</span>
            </div>
            <p className={styles.sectionDesc}>Underline misspelled words in the editor.</p>
          </div>
          <button className={styles.toggleBtn} onClick={handleSpellcheck}>
            {spellcheck
              ? <ToggleRight size={28} className={styles.toggleOn} />
              : <ToggleLeft size={28} className={styles.toggleOff} />}
          </button>
        </div>
      </div>

      {feedback && <p className={styles.feedback}>{feedback}</p>}
    </div>
  );
}
