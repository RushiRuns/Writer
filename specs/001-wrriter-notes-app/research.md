# Research and Technical Decisions: Wrriter

## 1. Architectural Patterns

### Decision: Main-Renderer IPC Architecture
- **Choice**: The Electron main process handles vault directory scanning, file system watching (`chokidar`), YAML frontmatter parsing (`gray-matter`), OS tray persistence, reminders scheduler, and local configuration. The renderer process (React) is purely presentational, communicating with the main process via typed, secure IPC channels exposed via a context-isolated preload script.
- **Rationale**: Security best practices for Electron mandate disabling direct Node integration in the renderer. Furthermore, keeping the index and reminders in the main process allows them to stay active when the main window is hidden to the system tray.
- **Alternatives Considered**: Direct Node integration in the renderer (unsafe, no tray persistence for index).

### Decision: In-Memory Only Indexing
- **Choice**: Rebuild the metadata index in memory on startup and keep it updated in real-time via file watcher events.
- **Rationale**: Placing a cache file like `.wrriter-cache.json` inside the vault would cause redundant syncs across devices via Syncthing. Keeping it in memory ensures the vault remains 100% clean and portable.
- **Alternatives Considered**: Disk-cached index inside the vault (violates vault portability principles).

---

## 2. Technology & Libraries Selection

### Decision: CodeMirror 6 for Inline Editing
- **Choice**: CodeMirror 6 with custom extensions for inline markdown styling (hiding syntax characters when the cursor is off-line) and WikiLinks fuzzy autocomplete.
- **Rationale**: CodeMirror 6 is built to be highly modular and customizable. It supports robust state extensions, transaction interception, and tooltip decorations, which are required for Obsidian-style inline editing.
- **Alternatives Considered**: Draft.js, Slate.js (heavy, React-only, hard to customize for inline markdown parsing), standard textareas (incapable of custom styling).

### Decision: Howler.js for Audio Mixing
- **Choice**: Howler.js library for looping and mixing 12 local ambient sounds.
- **Rationale**: Offers cross-browser compatibility, group volume adjustments, and seamless looping out of the box, making it easy to create a multi-layer focus environment.
- **Alternatives Considered**: Native HTML5 Audio elements (notoriously buggy with gapless looping and volume control on different platforms).

### Decision: Chokidar for Vault Watching
- **Choice**: Chokidar file watcher library in the main process.
- **Rationale**: Native Node.js `fs.watch` is unreliable on Windows/macOS and does not support recursive directories easily. Chokidar handles recursive watching, file locking, and provides reliable add/change/unlink events.
- **Alternatives Considered**: Node.js `fs.watch` (unreliable, crashes on deleted directories).
