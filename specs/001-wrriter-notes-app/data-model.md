# Data Model: Wrriter

## Entities

### 1. Note

Represents a single Markdown file in the vault.

```typescript
interface Note {
  path: string;            // Absolute filesystem path to the .md file
  vaultPath: string;       // Path relative to the vault root (e.g., 'Inbox/note.md')
  title: string;           // Note title (filename without extension, or first H1)
  folder: string;          // Subfolder path relative to vault root (e.g., 'Notes/brain')
  section: NoteSection;    // 'inbox' | 'later' | 'read' | 'shop' | 'watch' | 'tasks' | 'journal' | 'archive' | 'notes'
  tags: string[];          // Merged list of inline tags (#tag) and frontmatter tags
  reminder: string | null; // ISO-8601 string of scheduled reminder (e.g., '2026-06-30T09:00:00Z') or null
  completed: boolean;      // True if checklist item is checked (stored in frontmatter)
  completedAt: string | null; // ISO-8601 string of completion time (stored in frontmatter)
  preview: string;         // First 100 characters of note content
  modifiedAt: number;      // File modification timestamp (milliseconds)
  wordCount: number;       // Note body word count
  charCount: number;       // Note body character count
}

type NoteSection =
  | 'inbox'
  | 'later'
  | 'read'
  | 'shop'
  | 'watch'
  | 'tasks'
  | 'journal'
  | 'archive'
  | 'notes';
```

### 2. Folder

Represents a directory under the vault root (excluding system folders).

```typescript
interface Folder {
  name: string;            // Directory name
  vaultPath: string;       // Relative path from vault root
  absolutePath: string;    // Absolute directory path
  children: Folder[];      // Nested subdirectories
  noteCount: number;       // Count of direct child .md files
}
```

### 3. Drawing

Represents a sketch asset consisting of a PNG render and a JSON stroke log.

```typescript
interface Drawing {
  name: string;            // Name of the drawing (e.g., 'sketch-2026-06-26-10-14')
  pngPath: string;         // Absolute path to PNG file in /Attachments
  jsonPath: string;        // Absolute path to JSON stroke file in /Attachments
  strokes: Stroke[];       // Deserialized stroke history for canvas reconstruction
}

interface Stroke {
  tool: 'pen' | 'marker' | 'highlighter' | 'eraser';
  color: string;           // Hex value
  width: number;           // Pixels (2px to 40px)
  points: Point[];         // Interactive draw points
}

interface Point {
  x: number;
  y: number;
}
```

### 4. AppConfig

Configuration data stored globally in `%APPDATA%/wrriter/config.json`.

```typescript
interface AppConfig {
  vaultPath: string | null;     // Configured vault root folder
  syncthingUrl: string;         // E.g., 'http://localhost:8384'
  syncthingApiKey: string | null; // Encrypted Syncthing API key
  theme: 'oled' | 'dark' | 'light';
  fontFamily: 'Inter' | 'Roboto' | 'Outfit' | 'JetBrains Mono';
  accentColor: string;          // Defaults to '#E8A44B'
  tabSize: 2 | 4;
  spellcheck: boolean;
  activeSounds: {
    [soundId: string]: number;  // Map of sound ID to volume (0.0 to 1.0)
  };
}
```
