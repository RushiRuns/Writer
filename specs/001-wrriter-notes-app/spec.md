# Feature Specification: Wrriter Desktop Notes App

**Feature Branch**: `001-wrriter-notes-app`

**Created**: 2026-06-26

**Status**: Approved

**Input**: User description: "Build Wrriter, a local-first, offline-only desktop note-taking application. All notes are stored as plain Markdown (.md) files in a user-selected folder on disk called the vault. The app is entirely database-free — YAML frontmatter inside each .md file stores metadata (tags, status, reminders, dates). The vault is shared with a companion Android app via Syncthing, so file formats must be fully compatible across both platforms..."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Onboarding and Vault Creation (Priority: P1)
As a user starting Wrriter for the first time, I want to create a new vault or select an existing one, so that the app initializes the workspace automatically and securely stores configuration state in APPDATA.

**Why this priority**: Core initialization gate. Without the vault root folder, no read/write actions can take place.

**Independent Test**: Remove `%APPDATA%/wrriter/config.json`, start the application, select or create a directory in the dialog, and verify that the system folders are auto-created and the app moves to the Inbox dashboard.

**Acceptance Scenarios**:
1. **Given** no vault folder is set, **When** the app launches, **Then** an onboarding page is displayed with "Create New Vault" and "Open Existing Vault".
2. **Given** the user selects a directory path, **When** onboarding finishes, **Then** the folders `/Inbox`, `/Later`, `/Read`, `/Shop`, `/Watch`, `/Tasks`, `/Journal`, `/Archive`, and `/Attachments` are automatically created if they are missing, and the layout loads.

---

### User Story 2 - Quick Capture and Inbox processing (Priority: P1)
As a user, I want to type messages in a quick-capture box and process them using a floating toolbar so I can route notes to their destination folder.

**Why this priority**: Primary workflow for note capturing and routing.

**Independent Test**: In the Inbox view, type a title and press Enter. Verify a file is added to the `/Inbox` list. Click the item and verify that selecting an action in the floating toolbar physically moves the note to its destination folder.

**Acceptance Scenarios**:
1. **Given** the Inbox view is open, **When** I type "Shopping list item" in the bottom input and press Enter, **Then** a file `/Inbox/shopping list item.md` is created and slides into the list.
2. **Given** a note is selected in the Inbox list, **When** I click the "Move to Later" icon on the floating toolbar, **Then** the file is physically moved to `/Later/shopping list item.md` and fades out of the Inbox.

---

### User Story 3 - Checklist Views (Priority: P1)
As a task-oriented user, I want to view my Later, Read, Shop, Watch, and Tasks folders as checklists, check them off as done, and click titles to view details, so that I can manage lists easily.

**Why this priority**: Core workflow for the checklist views.

**Independent Test**: Navigate to the Read view, check an item, verify it gains strikethrough, dims, and moves to the bottom. Open the file on disk and verify `completed: true` is added to frontmatter.

**Acceptance Scenarios**:
1. **Given** a checklist view is active, **When** I check a row checkbox, **Then** the title gains a strikethrough and dims to 50% opacity, and reorders to the bottom after 500ms.
2. **Given** a checked item, **When** the file is saved, **Then** the frontmatter is updated with `completed: true` and `completed_at: <timestamp>`.
3. **Given** a checklist item title, **When** I click it, **Then** the right editor pane opens, displaying the item's markdown content.

---

### User Story 4 - Notes Folder Tree & Pane Navigation (Priority: P1)
As a knowledge base editor, I want to browse my custom folders in a tree and view notes inside them, so that I can organize my files hierarchically.

**Why this priority**: Required for structured knowledge organization.

**Independent Test**: Select Notes in Pane 1. Select folder tree in Pane 2. Verify subfolders list direct child notes in Pane 3. Verify editing H1 renames the `.md` file.

**Acceptance Scenarios**:
1. **Given** the Notes view is active, **When** I click "Folders" in Pane 1, **Then** Pane 2 renders a collapsible tree of non-system folders.
2. **Given** a folder is selected in Pane 2, **When** I view Pane 3, **Then** only direct notes in that folder are listed, excluding notes in subfolders.
3. **Given** a note is open in the editor, **When** I edit the H1 heading at the top, **Then** the note's `.md` file name on disk is renamed accordingly.

---

### User Story 5 - Markdown Editor and WikiLinks (Priority: P1)
As a writer, I want to edit files with inline markdown rendering that hides formatting symbols on idle lines, and autocomplete note links when typing `[[`, so that I can write in a distraction-free WYSIWYG editor.

**Why this priority**: Core editor experience.

**Independent Test**: Open the editor, write `**bold text**` and move cursor. Verify asterisks disappear and text remains bold. Write `[[` and verify a fuzzy autocomplete dropdown appears with note list.

**Acceptance Scenarios**:
1. **Given** a line with formatted markdown, **When** the editor cursor leaves that line, **Then** syntax marks like `**`, `#`, `[[`, and `#tag` are hidden.
2. **Given** the cursor is inside the line, **When** I edit, **Then** the raw markdown syntax characters reappear.
3. **Given** the user types `[[` in the editor, **When** 150ms passes, **Then** an autocomplete dropdown lists matching note titles (max 8), and selecting one inserts `[[note-title]]`.

---

### User Story 6 - Canvas Sketching and Replaying (Priority: P2)
As a visual note-taker, I want to draw on a canvas and save it as PNG + JSON, so that I can embed sketches in my notes and re-edit them later.

**Why this priority**: Required for drawing pad features.

**Independent Test**: Open Drawing Pad, draw some strokes, click save. Verify PNG and JSON are in `/Attachments`. Re-open, select drawing, verify strokes replay and undo remains functional.

**Acceptance Scenarios**:
1. **Given** the drawing canvas is active, **When** I save a drawing, **Then** a `.png` file and a matching `.json` file containing coordinates are written to `/Attachments/`.
2. **Given** an existing drawing is opened, **When** loaded, **Then** the `.json` stroke log is replayed on the canvas, restoring stroke-level undo/redo.

---

### User Story 7 - Ambient Sounds and Focus Timer (Priority: P2)
As a writer seeking deep focus, I want to play loop ambient sounds and run a focus timer that locks the screen during break intervals.

**Why this priority**: High value for focus tools.

**Independent Test**: Click ambient sounds in the top bar, play loops. Start the Pomodoro timer, wait for focus end, and check that a system notification triggers and a full-screen card overlays the editor.

**Acceptance Scenarios**:
1. **Given** the app is open, **When** I play sound tracks, **Then** they mix and loop offline.
2. **Given** the focus timer reaches 00:00, **When** triggered, **Then** an OS notification alerts the user, and a full-screen break overlay blocks editor interactions until the user starts or skips the break.

---

### User Story 8 - Global Command Palette (Priority: P2)
As a keyboard-first user, I want to open a command palette globally to trigger app actions, even when the window is closed/minimized.

**Why this priority**: Accessibility and utility.

**Independent Test**: Press `Ctrl+Shift+Space` when the window is closed, verify the palette appears. Search for an action, select it, and check that the main window re-opens to that view.

**Acceptance Scenarios**:
1. **Given** the tray process is running, **When** I press `Ctrl+Shift+Space`, **Then** an always-on-top command palette overlay appears.
2. **Given** the palette is active, **When** I search and execute "New Note", **Then** the main window is restored and focus is given to a new note editor.

---

### User Story 9 - Syncthing Integration Status (Priority: P3)
As a multi-device sync user, I want to view Syncthing sync status in the top bar to know if sync is online.

**Why this priority**: Auxiliary connectivity feature.

**Independent Test**: Watch the top bar Syncthing dot, hover to check connected devices, and verify manual scan triggers.

**Acceptance Scenarios**:
1. **Given** the local Syncthing daemon is running, **When** queried, **Then** the status dot shows green/yellow/red, and hover displays device detail tooltips.

---

### Edge Cases
- **Folder Name Collision**: If an imported folder or a new folder shares a reserved name (e.g., `Later` or `Inbox`), the app warns the user and rejects creation/overwrite.
- **Unavailable Daemon**: If Syncthing is unreachable, the app functions normally without errors or blocking prompts.
- **Broken WikiLinks**: If `[[linked note]]` references a note that doesn't exist, it displays in red with a warning icon; the app does not auto-create files.
- **Destructive Deletes**: Notes deleted in lists or tree view go to the OS trash.canvas resets can be undone within 5 seconds.

## Requirements *(mandatory)*

### Functional Requirements

#### 1. Onboarding & Vault Management
- **FR-001 (Setup)**: The app MUST allow selecting a vault root directory on launch, caching this path outside the vault.
- **FR-002 (Init)**: The app MUST silently initialize folders (`/Inbox`, `/Later`, `/Read`, `/Shop`, `/Watch`, `/Tasks`, `/Journal`, `/Archive`, `/Attachments`) inside the vault root if missing.
- **FR-003 (Clean Vault)**: The app MUST NOT store caching, indexing, or database files inside the vault.

#### 2. Layout & Sidebar
- **FR-004 (Panes)**: The app MUST feature a three-pane navigation shell, with dividers resizable by dragging.
- **FR-005 (Active States)**: The active sidebar view MUST be marked with an amber left-border indicator.
- **FR-006 (Top Bar)**: The persistent top bar MUST display a logo (home button), breadcrumbs, Syncthing dot, sound mixer icon, timer icon, random dice, and quick-write floating window toggle.

#### 3. Inbox View
- **FR-007 (Sorting)**: The Inbox list MUST display unprocessed `.md` notes from `/Inbox` sorted newest first.
- **FR-008 (Quick Capture)**: The bottom input box MUST create a note file immediately on `Enter`, inserting it at the top of the Inbox list.
- **FR-009 (Routing)**: The Inbox selected note MUST show a floating toolbar offering 8 actions: Move to Folder (picker), Send to Journal, Later, Read, Watch, Shop, Tasks, and Archive. Selecting an action MUST physically move the note.

#### 4. Checklist Folders
- **FR-010 (Checklist)**: Folder files inside `/Later`, `/Read`, `/Shop`, `/Watch`, and `/Tasks` MUST render as checklists.
- **FR-011 (State)**: Clicking a checkbox MUST add `completed: true` and `completed_at: <timestamp>` to YAML frontmatter, strikethrough the item, and animate it to the bottom.

#### 5. Daily Journal
- **FR-012 (Date Naming)**: Journal notes MUST be created inside `/Journal` as `YYYY-MM-DD.md` files.
- **FR-013 (Today auto-creation)**: Opening the Journal MUST automatically load or create today's date entry.
- **FR-014 (Append logic)**: Sending a note "To Journal" from the Inbox MUST append its content to today's journal entry, separated by a horizontal rule (`---`).

#### 6. Notes Tree
- **FR-015 (Tree View)**: Notes view Pane 2 MUST display user directories as a collapsible tree (excluding system folders).
- **FR-016 (File Rename)**: Editing the first H1 heading (`#`) of a note MUST rename the file on disk.

#### 7. Tags System
- **FR-017 (Tag extraction)**: The app MUST parse inline tags `#tagname` and synchronize them with the frontmatter `tags: []` list.
- **FR-018 (Tags view)**: Clicking a tag in Pane 2 MUST display all notes containing that tag in Pane 3.

#### 8. Drawing Pad
- **FR-019 (Assets)**: Drawing pad MUST save sketches in `/Attachments` as a `.png` file (for note embedding) and a `.json` file (coordinates for re-editing).
- **FR-020 (Canvas tools)**: Canvas MUST support Pen, Marker, Highlighter, Eraser, stroke-level undo/redo, and color selector.

#### 9. Markdown Editor
- **FR-021 (Inline Rendering)**: The editor MUST support Obsidian-style formatting concealment on non-focused lines.
- **FR-022 (WikiLinks)**: Typing `[[` MUST trigger an autocomplete popup showing note titles, and clicking resolved links MUST open the note.
- **FR-023 (Metadata Bar)**: Above the editor, the app MUST render YAML frontmatter metadata as interactive pills (tags, reminders).
- **FR-024 (Auto-save)**: Note content MUST auto-save 2 seconds after typing stops or on window blur.
- **FR-025 (Pill Stats)**: The editor bottom-right corner MUST display real-time statistics (word count, character count, total note count, journal streak).

#### 10. Focus & Sound Tools
- **FR-026 (Sounds)**: The sound panel MUST mix and loop 12 local focus audio tracks offline.
- **FR-027 (Timer)**: The Pomodoro timer MUST notify the user and lock the editor with a full-screen card overlay when time expires.

#### 11. System Services
- **FR-028 (Tray)**: Closing the main window MUST hide the window to the system tray, keeping reminders, global hotkeys, and notifications alive.
- **FR-029 (Search)**: Centered `Ctrl+K` search modal MUST query the in-memory index fuzzily and highlight matching snippets.
- **FR-030 (Command Palette)**: `Ctrl+Shift+Space` MUST open the command palette overlay window.
- **FR-031 (Floating Window)**: `Ctrl+Shift+W` MUST open the always-on-top quick-write notepad.
- **FR-032 (Export/Import)**: Notes/folders MUST support exporting as `.md`/`ZIP`, and importing files/folders.

### Key Entities

- **Note**: A Markdown file (`.md`) containing content and metadata frontmatter.
- **Folder**: Physical disk folder representing a user or system directory in the vault.
- **Drawing**: A twin-file asset in `/Attachments` (PNG render + JSON coordinate list).
- **Tag**: An inline hashtag (`#name`) synced to note metadata.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On vault load, scanning 1,000 files and building the in-memory index MUST finish in under 500ms.
- **SC-002**: Changes to the file system (external modifications or Syncthing syncs) MUST update the in-memory index and render in the UI within 200ms.
- **SC-003**: Fuzzy search query responses MUST display inside the search panel within 300ms.
- **SC-004**: The application idle memory consumption MUST NOT exceed 150MB of RAM.

## Assumptions

- Electron 42 is supported by the target host OS.
- Syncthing daemon is configured and running on `localhost:8384`.
- The system supports native notifications and system tray features.
