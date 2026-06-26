# Implementation Plan: Wrriter Desktop Notes App

**Branch**: `001-wrriter-notes-app` | **Date**: 2026-06-26 | **Spec**: [spec.md](file:///c:/Dev/Wrriter/specs/001-wrriter-notes-app/spec.md)

**Input**: Feature specification from `/specs/001-wrriter-notes-app/spec.md`

## Summary
The goal of this implementation is to build the desktop version of **Wrriter**, a portable markdown-based note-taking application designed to work with a companion Android app syncing via Syncthing. The desktop application is built on Electron, Vite, React 18, and TypeScript. All notes are stored as plain Markdown `.md` files with YAML frontmatter. Caching/indexing is completely in-memory, built by scanning the filesystem on start and watched using `chokidar`. Editing is powered by CodeMirror 6 with custom extensions. Audio mixing is handled via Howler.js.

## Technical Context

**Language/Version**: TypeScript (strict: true), Node.js 18+, Electron 28+, Chromium 120+, React 18

**Primary Dependencies**:
- Electron core (tray, menu, globalShortcut, notifications, windows)
- `electron-vite` (coordination)
- `electron-builder` (packaging)
- `electron-store` (config persistence with API key encryption)
- `@codemirror/view`, `@codemirror/state`, `@codemirror/lang-markdown`
- `gray-matter` (YAML parsing)
- `chokidar` (recursive file system watch)
- `howler` (audio looping)
- `archiver` (ZIP exports)
- `lucide-react` (icons)
- `tailwindcss` (utility styling)
- `fuse.js` (fuzzy autocomplete autocomplete search)

**Storage**: Database-free. Plain Markdown (`.md`) files and sketches (`.png` + `.json` side-by-side) stored directly on disk in a vault root folder.

**Testing**: Jest or Vitest for pure business logic functions; manual UI walkthrough scripts.

**Target Platform**: Desktop (Windows primary, macOS, Linux)

**Project Type**: Desktop Application (Electron)

**Performance Goals**:
- Build in-memory vault index for 1,000 files in under 500ms (chunked walk, batch size 50).
- Render last-used view within 2 seconds of launch (10k notes within 5s).
- Fuzzy search and autocomplete responses in under 300ms.
- Maintain idle memory usage below 150MB.

**Constraints**:
- Vault must remain 100% clean (no hidden `.wrriter-cache` files inside the vault).
- Configuration/hotkeys/logs stored strictly in `%APPDATA%/wrriter/`.
- OLED Black dark theme default (`#000000`) with amber `#E8A44B` accent exclusivity.
- Atomic file write pattern (write to `<path>.tmp` first, then rename).
- Decoupled pure business logic from Electron APIs for unit testability.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality**: ✅ Passed. Pure business logic is isolated; file writes utilize write-then-rename; optional services degrade gracefully.
- **II. Architecture**: ✅ Passed. Strictly database-free files-as-db storage; in-memory index only; configuration resides in `%APPDATA%/wrriter/`; main-renderer process boundary isolated.
- **III. Cross-Platform Vault Compatibility**: ✅ Passed. Shared schema and folders; no desktop-only keys written inside note frontmatter.
- **IV. User Experience**: ✅ Passed. MD2 styling with `#000000` dark theme and `#E8A44B` accent; CodeMirror inline formatting toggle; custom YAML bar; undo within 5s; tray persistence.
- **V. Performance**: ✅ Passed. Async indexing loading state; lag-free typing debouncing; 300ms search latency limit; async I/O.
- **VI. Security & Privacy**: ✅ Passed. Offline-only; local Syncthing REST daemon; encrypted API credentials; context isolated renderer.
- **VII. Consistency**: ✅ Passed. 8px grid alignment; predefined card and input borders; typography rules; fixed/resizable pane structures.

## Project Structure

### Documentation
```text
specs/001-wrriter-notes-app/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technology choices and research findings
├── data-model.md        # Data entities and types
├── quickstart.md        # Validation scenarios
└── checklists/
    └── requirements.md  # Requirements completeness checklist
```

### Source Code Directory Layout
```text
wrriter/
├── src/
│   ├── main/
│   │   ├── index.ts          ← Electron main entry (lifecycle, tray, menu)
│   │   ├── vault/
│   │   │   ├── index-builder.ts  ← walk vault files, build in-memory snapshot
│   │   │   ├── file-watcher.ts   ← chokidar listener with 100ms sync debouncer
│   │   │   ├── file-ops.ts       ← atomic write helper (.tmp then rename), delete, move
│   │   │   └── frontmatter.ts    ← gray-matter YAML parse / stringify wrappers
│   │   ├── ipc/
│   │   │   └── handlers.ts       ← register ipcMain.handle endpoints
│   │   ├── syncthing/
│   │   │   └── client.ts         ← ping, poll system/status, POST scans, discovery folderId
│   │   ├── reminders/
│   │   │   └── scheduler.ts      ← setTimeout queue, logs logged reminders to reminders.json
│   │   └── tray/
│   │       └── tray.ts           ← tray icon build, hide-to-tray logic
│   ├── preload/
│   │   └── index.ts          ← typed contextBridge.exposeInMainWorld
│   ├── renderer/
│   │   ├── main.tsx          ← React root bootstrap
│   │   ├── App.tsx           ← route layout logic based on mode query parameter
│   │   ├── index.css         ← Tailwind stylesheet + custom MD2 variables
│   │   ├── components/
│   │   │   ├── layout/       ← resizable Pane dividers, sidebar column navigation
│   │   │   ├── inbox/        ← quick capture bottom input, processing toolbar
│   │   │   ├── checklist/    ← checkbox lists (Later, Read, Shop, Watch, Tasks)
│   │   │   ├── journal/      ← date grouping sidebar, non-editable date header
│   │   │   ├── notes/        ← collapsible folder tree tree, note lists
│   │   │   ├── tags/         ← alphabetical tags browser list
│   │   │   ├── drawing/      ← HTML5 canvas drawing pads, pressure stroke logs
│   │   │   ├── archive/      ← archived notes display
│   │   │   ├── editor/       ← CodeMirror editor core + custom extensions
│   │   │   ├── search/       ← Ctrl+K centered fuzzy full-text overlay
│   │   │   ├── command-palette/ ← Ctrl+Shift+Space frameless overlay window
│   │   │   ├── floating-window/ ← Ctrl+Shift+W always-on-top quick write window
│   │   │   ├── ambient-sounds/  ← Howler audio loop controls panel
│   │   │   ├── timer/        ← Pomodoro contexts, full-screen Portal overlays
│   │   │   ├── settings/     ← appearance and config fields panels
│   │   │   └── statistics/   ← live typing stats pill + modal metrics charts
│   │   ├── hooks/
│   │   │   └── useCanvas.ts  ← stroke tracking canvas hook
│   │   └── contexts/
│   │       └── TimerContext.tsx ← useReducer countdown focus context
│   └── shared/
│       └── ipc-types.ts      ← shared TypeScript IPC channel types
├── resources/
│   ├── sounds/               ← bundled ogg loops
│   ├── tray-icon.png
│   └── icon.png
├── electron.vite.config.ts
├── electron-builder.yml
└── package.json
```

## Complexity Tracking
- **CodeMirror 6 Custom Extensions**: We must design custom extensions for markdown concealment and inline widgets. To prevent performance lag, updates are debounced and only parsed when necessary.
- **Reminders delta management**: Due to Node's 32-bit limit on setTimeouts (~24.8 days), the main scheduler uses recursive 24-day checks for distant reminders before scheduling the final setTimeout.

## Verification Plan

### Automated Tests
- Build verification: `npm run package` (ensures compilation and bundling succeeds without TypeScript errors).
- Unit tests: Run Jest/Vitest for `src/main/vault/frontmatter.ts`, `src/main/vault/index-builder.ts`, and core routing business functions.

### Manual Verification
- Execute all manual validation scenarios listed in [quickstart.md](file:///c:/Dev/Wrriter/specs/001-wrriter-notes-app/quickstart.md) inside the local development environment.
