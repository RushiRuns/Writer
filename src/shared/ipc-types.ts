export interface NoteEntry {
  path: string;           // absolute path
  title: string;          // filename without extension
  folder: string;         // relative path from vault root
  section: 'inbox' | 'later' | 'read' | 'shop' | 'watch' | 'tasks' | 'journal' | 'archive' | 'notes';
  tags: string[];
  reminder: string | null;   // ISO 8601 or null
  completed: boolean;
  completedAt: string | null;
  preview: string;        // first 120 chars of body (no frontmatter)
  created: string;        // ISO 8601
  modified: string;       // ISO 8601 (file mtime)
  wordCount: number;
}

export interface DrawingEntry {
  name: string;
  pngPath: string;
  jsonPath: string;
}

export interface VaultIndex {
  notes: NoteEntry[];
  tagMap: Record<string, string[]>;  // tag → [note paths]
  drawings: DrawingEntry[];
  reminders: NoteEntry[];            // subset with non-null reminder
  folders: string[];                 // relative paths of all note-section subdirs (including empty)
}

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
}

export interface Stroke {
  tool: 'pen' | 'marker' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle' | 'arrow' | 'text' | 'image' | 'vectorEraser' | 'lasso';
  color: string;
  width: number;
  opacity: number;
  points: StrokePoint[];
  text?: string;
  filled?: boolean;
  image?: string;
}

export interface AppConfig {
  vaultPath: string | null;
  windowBounds: { x: number; y: number; width: number; height: number };
  floatingWindowPosition: { x: number; y: number };
  lastOpenedNote: string | null;
  syncthing: {
    url: string;          // default: 'http://localhost:8384'
    apiKey: string;       // encrypted by electron-store
    folderId: string | null;
  };
}

export interface AppSettings {
  theme: 'dark' | 'light';
  accentColor: string;             // default: '#9ca3af'
  font: string;                    // legacy, kept for compatibility
  fontFamily: string;              // editor font family, default: 'Inter'
  fontSize: number;                // default: 14
  texture: 'none' | 'grid' | 'dots' | 'ruled' | 'paper';
  tabSize: 2 | 4;
  spellcheck: boolean;
  autoSaveInterval: number;        // seconds, default: 2
  lineHeight: number;              // default: 1.6
  remindersEnabled: boolean;       // note reminders
  breakRemindersEnabled: boolean;  // pomodoro break reminders
  timerFocus: number;              // minutes, default: 25
  timerShortBreak: number;         // default: 5
  timerLongBreak: number;          // default: 15
  timerSessionsBeforeLong: number; // default: 4
  sounds: Record<string, { active: boolean; volume: number }>;
}

export interface HotkeyBindings {
  newNote: string;
  search: string;
  commandPalette: string;
  floatingWindow: string;
  toggleTheme: string;
  randomNote: string;
  bold: string;
  italic: string;
  switchToInbox: string;
  switchToJournal: string;
  switchToNotes: string;
}
