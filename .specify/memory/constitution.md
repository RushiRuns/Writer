<!--
Version change: 1.0.0 -> 1.1.0
List of modified principles:
- Code Quality: Added pure functions, atomic swap, and graceful degradation rules.
- Architecture: Defined database-free, in-memory index, config storage locations, and process separation.
- Cross-Platform Vault Compatibility: Standardized frontmatter keys, folder layout, and disallowed desktop metadata in vault.
- User Experience: Prescribed MD2 OLED, inline markdown hiding, YAML hiding, undo toasts, tray process, and responsive animation parameters.
- Performance: Set target budgets for startup indexing, search queries, and typing debounces.
- Security & Privacy: Enforced local-only operations, API key encryption, minimal permissions, and renderer process sandboxing.
- Consistency: Standardized spacing, border radii, typography, pane layout, and color usage.
Added sections:
- None
Removed sections:
- None
Templates requiring updates:
- ✅ updated: .specify/templates/plan-template.md
- ✅ updated: .specify/templates/spec-template.md
- ✅ updated: .specify/templates/tasks-template.md
Follow-up TODOs:
- None
-->

# Wrriter Constitution

## Core Principles

### I. Code Quality
- **Pure Business Logic**: All business logic (vault indexing, YAML frontmatter parsing, file move operations, reminder scheduling, WikiLink resolution, tag extraction) MUST be written in pure functions that are unit-testable in isolation from Electron and the file system.
- **Injected Side Effects**: Side effects (disk I/O, IPC, timers) MUST be injected rather than hardcoded, so they can be easily swapped in tests.
- **Atomic File Writes**: File write operations MUST use a write-then-rename (atomic swap) pattern: write to a `.tmp` file first, then rename it to the final path. This prevents partial writes from corrupting the vault, especially during Syncthing sync or unexpected process termination.
- **Graceful Degradation**: Every feature that depends on an optional external service (Syncthing, system notifications, global hotkeys) MUST fail gracefully and silently when that service is unavailable, without error dialogs or crashes. The core note-taking experience must work entirely without those services.

### II. Architecture
- **Database-Free Storage**: The app is strictly database-free. All notes are stored as `.md` files with YAML frontmatter. No SQLite, no IndexedDB, no hidden cache files inside the vault. The file system is the database.
- **In-Memory Live Index**: The in-memory index is the only runtime data structure. It is rebuilt completely each time a vault is opened and updated in real time via `chokidar` file watching. It is never persisted to disk. No `.wrriter-index` or `.wrriter-cache` files may be written inside the vault.
- **External App Config**: App config lives outside the vault, in `%APPDATA%/wrriter/` (Windows) or the platform equivalent:
  - `config.json` — vault path, Syncthing URL + encrypted API key, window state
  - `settings.json` — theme, font, texture, tab size, spellcheck, auto-save interval
  - `hotkeys.json` — user-defined key bindings
  - `reminders.json` — cached reminder schedule (rebuilt from vault frontmatter on each launch)
- **Process Boundaries**: The Electron main process owns: file system access, file watcher, IPC handlers, system tray, global hotkeys, OS notifications, Syncthing API calls, and the reminder scheduler. The renderer process owns: all React UI, the CodeMirror editor, the drawing canvas, audio playback. These two processes communicate exclusively via typed IPC channels — the renderer never touches Node.js APIs directly.

### III. Cross-Platform Vault Compatibility
- **Android Portability**: The vault file format must be fully compatible with the Android companion app. Every `.md` file written by the desktop app must be parseable by the Android app without modification.
- **Shared Frontmatter Schema**: YAML frontmatter key names are fixed and shared across both platforms:
  - `title` — note display name (optional, falls back to filename)
  - `created` — ISO 8601 timestamp
  - `tags` — array of strings (flat, no nesting)
  - `reminder` — ISO 8601 datetime or absent
  - `completed` — boolean (for checklist views) or absent
  - `completed_at` — ISO 8601 timestamp or absent
  - `type` — `journal` for journal entries, absent for regular notes
- **Zero Local Metadata Pollution**: No desktop-only metadata keys may be written into `.md` frontmatter. Any desktop-specific state (e.g., window scroll position, last-opened note) must be stored in the app config directory, not in the vault.
- **Shared Directory Structure**: The vault folder structure is fixed and shared:
  - `/Inbox`
  - `/Later`
  - `/Read`
  - `/Shop`
  - `/Watch`
  - `/Tasks`
  - `/Journal`
  - `/Archive`
  - `/Attachments`
  - `/[UserCreatedFolders...]`
- **Reserved Names**: System folder names are reserved. The user may not create a folder with the same name as a system folder.

### IV. User Experience
- **Visual Design**: The UI must implement Material Design 2 with OLED Dark (`#000000` background) as the default theme. The amber accent `#E8A44B` is the single primary accent color throughout the app.
- **WYSIWYG Markdown Editing**: Raw markdown syntax must never be visible to the user when their cursor is not on that line. The CodeMirror editor hides formatting characters (`**`, `#`, `[[`, `#tag`) as soon as the cursor moves away, rendering them as styled inline elements.
- **Parsed Frontmatter Bar**: YAML frontmatter must never appear as raw text. The frontmatter block is parsed silently on file open and rendered as UI elements in the metadata bar (tag pills, reminder chip).
- **Safety & Reversibility**: Every destructive action — deleting a note, clearing the drawing canvas, permanently removing a tag — must either be reversible (undo within 5 seconds via toast) or require explicit confirmation. Notes deleted from within the app go to the OS system trash, not permanent deletion.
- **Persistent Tray Process**: The system tray process must always remain alive when the main window is closed. Closing the window hides it; only "Quit Wrriter" from the tray menu terminates the process. This ensures reminders fire, global hotkeys remain active, and the command palette is accessible at all times.
- **Purposeful Animations**: Animations must feel responsive, not decorative. Target timings: entrance animations 150–180ms, exit animations 100–120ms, theme cross-fade 300ms, no animation longer than 400ms. All transitions use ease-out easing. No spring physics, no bounces.

### V. Performance
- **Asynchronous Indexing**: The vault index must be built asynchronously without blocking the UI. The app must render the last-used view within 2 seconds of launch for vaults up to 1,000 notes, and within 5 seconds for vaults up to 10,000 notes. A subtle loading indicator in the status area shows index progress without blocking interaction.
- **No-Lag Typing**: The editor must never lag during typing. CodeMirror extensions must debounce file writes and index updates — they must never run synchronously on each keystroke. Auto-save is debounced at 2 seconds after last keystroke.
- **Fuzzy Search Budget**: Search results must appear within 300ms of the user stopping typing (200ms debounce + 100ms rendering budget). Full-text content search reads files on demand from the file system — it does not pre-cache full note bodies in the index.
- **Non-Blocking I/O**: File write operations must never block the renderer. All disk I/O runs in the main process and returns results to the renderer via IPC. The renderer never awaits a file operation synchronously.

### VI. Security & Privacy
- **100% Offline-First**: All user data stays on-device. The app must not make any network requests except to the locally-running Syncthing daemon (`localhost:8384` by default). No analytics, no crash reporting, no update checks, no telemetry of any kind.
- **Keychain Encryption**: The Syncthing API key must be stored encrypted using the platform keychain (via `keytar` or `electron-store` with encryption). It must never appear in plaintext in any config file, log, or IPC message.
- **Minimal Permissions**: The app must never request system permissions beyond what is strictly necessary for its features:
  - File system read/write access to the user-selected vault folder
  - System tray icon
  - OS notifications
  - Global keyboard shortcut registration
  - Window overlay (for the floating quick-write window)
- **Sandboxed Renderer**: The renderer process must run with `contextIsolation: true` and `nodeIntegration: false`. All Node.js access is proxied through the preload script's context bridge.

### VII. Consistency
- **Design Metrics**: Every screen, component, and interaction must follow the design system:
  - Spacing: 8px base unit throughout
  - Border radius: 4px for list items and inputs, 8px for cards and modals, 2px for tag pills
  - Typography: Inter for all UI text; JetBrains Mono for the editor and timer display
  - Icon size: 20px for toolbar icons, 18px for nav icons
  - Pane structure: Pane 1 fixed 220px, Pane 2 default 240px (resizable), Pane 3 default 260px (resizable), Editor fills remaining width
- **Reactive Settings**: Settings changes (theme, font, texture, spellcheck, tab size) must apply immediately across all open surfaces without requiring a restart (except font changes, which may require a reload).
- **Amber Exclusivity**: The amber accent (`#E8A44B`) is used exclusively for: active nav items, selected states, primary buttons, inline tag pills, WikiLink pills, and progress arcs. No other accent color may be introduced outside of Syncthing status colors (green/yellow/red) and the error/danger color (`#CF6679`).

## Governance
All code changes and pull requests must verify compliance with the core principles. Version updates to the constitution require version incrementing and amendment justification.

**Version**: 1.1.0 | **Ratified**: 2026-06-26 | **Last Amended**: 2026-06-26
