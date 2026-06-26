# Tasks: Wrriter Desktop Notes App

**Input**: Design documents from `/specs/001-wrriter-notes-app/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/ipc-channels.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create source directories (`src/main/vault/`, `src/main/ipc/`, `src/renderer/components/layout/`, `src/shared/`) per implementation plan
- [x] T002 Configure strict TypeScript settings in `tsconfig.json` and adjust project packaging options in `electron-builder.yml`
- [x] T003 [P] Configure Tailwind CSS utility variables and MD2 OLED colors in `src/renderer/index.css`
- [x] T004 Define end-to-end typed IPC channel contracts in `src/shared/ipc-types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [ ] T005 Implement `electron-store` settings schemas and configuration load/save APIs in `src/main/vault/file-ops.ts`
- [ ] T006 [P] Implement core IPC preload context bridge exposure methods in `src/preload/index.ts`
- [ ] T007 [P] Create main process IPC listeners routing registry in `src/main/ipc/handlers.ts`
- [ ] T008 [P] Initialize system tray context menu and application close-to-hide triggers in `src/main/index.ts`
- [ ] T009 Implement atomic write helper (write to `.tmp` then rename) in `src/main/vault/file-ops.ts`
- [ ] T010 Implement `gray-matter` YAML parse and stringify wrappers in `src/main/vault/frontmatter.ts`

---

## Phase 3: User Story 1 - Onboarding and Vault Creation (Priority: P1) 🎯 MVP

**Goal**: Setup onboarding screen, choose vault, initialize vault system folders.

**Independent Test**: Clear electron-store config, launch app, confirm onboarding screen renders. Choose a folder, check that the 9 system subfolders are created recursively, and config is written.

- [ ] T011 [US1] Implement onboarding storage verification checks in `src/main/vault/file-ops.ts`
- [ ] T012 [US1] Create directory bootstrap utility recursively creating folders in `src/main/vault/file-ops.ts`
- [ ] T013 [P] [US1] Create onboarding panel page component in `src/renderer/components/settings/Onboarding.tsx`
- [ ] T014 [US1] Integrate onboarding page redirection checks in `src/renderer/App.tsx` and bootstrap main panels on completion

---

## Phase 4: User Story 2 - Quick Capture and Inbox Processing (Priority: P1)

**Goal**: Display unprocessed notes, capture thoughts via bottom input, route notes via floating toolbar.

**Independent Test**: Create text file in `/Inbox` manually, confirm it shows in Inbox queue. Type inside bottom input and verify it writes to `/Inbox/`. Click note and route to Later, verify it moves folder.

- [ ] T015 [US2] Implement vault in-memory index builder recursively scanning files in `src/main/vault/index-builder.ts`
- [ ] T016 [US2] Setup `chokidar` file watcher pushing live index updates to renderer in `src/main/vault/file-watcher.ts`
- [ ] T017 [P] [US2] Create Quick-Capture text box and notes list views in `src/renderer/components/inbox/InboxView.tsx`
- [ ] T018 [US2] Create floating routing action toolbar overlay in `src/renderer/components/inbox/RoutingToolbar.tsx`
- [ ] T019 [US2] Connect file move operations and Pane 1 sidebar count badges in `src/renderer/components/layout/Navigation.tsx`

---

## Phase 5: User Story 3 - Checklist Views (Priority: P1)

**Goal**: Render checklist interfaces for lists, complete items (YAML status), context menu options.

**Independent Test**: Select Later in sidebar, confirm checklist renders. Toggle item, check strikethrough, check disk note for completed frontmatter. Right click for context menu actions.

- [ ] T020 [US3] Create checklist rendering page template in `src/renderer/components/checklist/ChecklistView.tsx`
- [ ] T021 [US3] Implement YAML completed state write operations in `src/main/vault/file-ops.ts`
- [ ] T022 [P] [US3] Create checklist item context menu (Rename, Move to Inbox, Delete, Copy) in `src/renderer/components/checklist/ChecklistContextMenu.tsx`

---

## Phase 6: User Story 4 - Notes Folder Tree & Pane Navigation (Priority: P1)

**Goal**: Collapsible folder tree (Pane 2), note list (Pane 3), resizable panels, and edit H1 to rename file.

**Independent Test**: Browse folders tree, select notes list. Drag divider handles to resize. Create note, edit heading line 1, verify `.md` file renames.

- [ ] T023 [US4] Implement collapsible folder tree rendering in `src/renderer/components/notes/FolderTree.tsx`
- [ ] T024 [P] [US4] Create note cards listing column in `src/renderer/components/notes/NoteList.tsx`
- [ ] T025 [US4] Integrate resizable pane grid columns in `src/renderer/components/layout/ResizablePanels.tsx`
- [ ] T026 [US4] Implement rename note via heading transaction in `src/main/vault/file-ops.ts`

---

## Phase 7: User Story 5 - Markdown Editor and WikiLinks (Priority: P1)

**Goal**: CodeMirror 6 setup, formatting hide ViewPlugin, WikiLinks autocomplete, YAML metadata bar, stats pill.

**Independent Test**: Write styled text, verify symbols hide when cursor exits line. Type `[[` and verify dropdown fuzzy searches note index. Add tags via metadata bar, check stats pill.

- [ ] T027 [US5] Initialize CodeMirror 6 markdown editor core in `src/renderer/components/editor/Editor.tsx`
- [ ] T028 [US5] Implement ViewPlugin to hide markdown syntax characters on idle lines in `src/renderer/components/editor/hideMarkdown.ts`
- [ ] T029 [P] [US5] Implement custom autocomplete dropdown menu for `[[` WikiLinks in `src/renderer/components/editor/wikiLinkAutocomplete.ts`
- [ ] T030 [P] [US5] Create frontmatter metadata editor bar component in `src/renderer/components/editor/MetadataBar.tsx`
- [ ] T031 [US5] Implement debounced auto-save hook writing to main in `src/renderer/components/editor/useAutoSave.ts`
- [ ] T032 [P] [US5] Implement statistics calculations pill overlay in `src/renderer/components/statistics/StatsPill.tsx`

---

## Phase 8: User Story 6 - Canvas Sketching and Replaying (Priority: P2)

**Goal**: Canvas canvas controls, save PNG + stroke JSON, replay stroke coordinate history, undo/redo.

**Independent Test**: Open canvas, draw lines. Save note. Check attachments directory for PNG/JSON pairs. Open canvas again, select drawing, verify strokes replay and undo operates.

- [ ] T033 [US6] Create drawing pad HTML5 canvas layout in `src/renderer/components/drawing/DrawingView.tsx`
- [ ] T034 [US6] Implement stroke coordinate collection logic in hook `src/renderer/hooks/useCanvas.ts`
- [ ] T035 [P] [US6] Create drawings save IPC endpoint (writing PNG + JSON) in `src/main/vault/file-ops.ts`
- [ ] T036 [US6] Implement requestAnimationFrame drawing history replayer in `src/renderer/components/drawing/CanvasReplayer.tsx`

---

## Phase 9: User Story 7 - Ambient Sounds and Focus Timer (Priority: P2)

**Goal**: Howler loops audio playback loop, Pomodoro focus countdown context, full-screen Portal overlays.

**Independent Test**: Click headset, select sounds and mix volumes, verify loop. Start timer, check that focus end fires notification and opens full-screen cover locking edit.

- [ ] T037 [US7] Implement multi-channel audio loop mixing using Howler.js in `src/renderer/components/ambient-sounds/AudioManager.tsx`
- [ ] T038 [US7] Implement Pomodoro timer reduction context in `src/renderer/contexts/TimerContext.tsx`
- [ ] T039 [P] [US7] Create React Portal full-screen break overlay lock in `src/renderer/components/timer/TimerOverlay.tsx`

---

## Phase 10: User Story 8 - Global Command Palette (Priority: P2)

**Goal**: Command palette window, fuzzy action searching, always-on-top quick write window.

**Independent Test**: Close app window. Press global hotkeys. Check palette modal opens and launches window on selection. Check floating quick write saves note on Save click.

- [ ] T040 [US8] Create frameless command palette window loader in `src/main/index.ts`
- [ ] T041 [US8] Create fuzzy commands list and selection handler in `src/renderer/components/command-palette/CommandPalette.tsx`
- [ ] T042 [P] [US8] Initialize floating window BrowserWindow container in `src/main/index.ts` and view interface in `src/renderer/components/floating-window/FloatingWindow.tsx`

---

## Phase 11: User Story 9 - Syncthing Integration Status (Priority: P3)

**Goal**: Syncthing REST status dot polling, scan directory trigger, connected devices layout.

**Independent Test**: Check top bar status indicator color. Hover to read tooltip. Open Settings and trigger connection tests and POST directory scans.

- [ ] T043 [US9] Implement Syncthing API REST client in `src/main/syncthing/client.ts`
- [ ] T044 [P] [US9] Create top-bar status dot UI element with hover tooltips in `src/renderer/components/layout/TopBar.tsx`
- [ ] T045 [US9] Create Syncthing credentials setup panel in `src/renderer/components/settings/SyncthingSettings.tsx`

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Testing, optimization, and validation

- [ ] T046 Write Jest/Vitest unit test suites for `src/main/vault/frontmatter.ts` and index builders
- [ ] T047 Refactor visual transitions to use easing-out CSS animations under 400ms
- [ ] T048 Verify all manual walkthrough scenarios build, run, and package successfully

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion. BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
- **Polish (Final Phase)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories.
- **User Story 2 (P2)**: Depends on US1 (Vault folders).
- **User Story 3 (P3)**: Depends on US2 (File movement and indexing).
- **User Story 4 (P4)**: Depends on US2 (Folder trees).
- **User Story 5 (P5)**: Depends on US2 (Editor notes loading).
- **User Story 6 (P6)**: Can start after US2.
- **User Story 7 (P7)**: Can start after US5.
- **User Story 8 (P8)**: Depends on US2 and US5 (Note creation and routing).
- **User Story 9 (P9)**: Can start after US1.

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel.
- All Foundational tasks marked [P] can run in parallel.
- Once Foundational phase completes:
  - Developer A: Implement US1 and US2 (Onboarding & Indexing).
  - Developer B: Implement US7 (Timer and Audio).
  - Developer C: Implement US9 (Syncthing status client).

---

## Parallel Example: User Story 1

```bash
# Launch Setup infrastructure:
Task: "Configure Tailwind CSS utility variables and MD2 OLED colors in src/renderer/index.css"
Task: "Define end-to-end typed IPC channel contracts in src/shared/ipc-types.ts"

# Launch Foundational components:
Task: "Implement core IPC preload context bridge exposure methods in src/preload/index.ts"
Task: "Create main process IPC listeners routing registry in src/main/ipc/handlers.ts"
Task: "Initialize system tray context menu and application close-to-hide triggers in src/main/index.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories).
3. Complete Phase 3: User Story 1 (Onboarding).
4. Complete Phase 4: User Story 2 (Inbox).
5. Complete Phase 5: User Story 3 (Checklist completion).
6. **STOP and VALIDATE**: Run manual verification scripts.

### Incremental Delivery

1. Complete MVP (US1-3) → Vault folders and routing are fully functional.
2. Add User Story 4 (Folder trees) → Test directories hierarchy.
3. Add User Story 5 (CodeMirror 6 Editor) → Test formatting conceal and WikiLinks.
4. Add User Story 6 (Drawing canvas) → Test sketching files.
5. Add remaining overlays (command palette, ambient sounds, Pomodoro overlays).
6. Perform final polish, packaging, and unit tests.
