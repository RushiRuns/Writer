# IPC Channel Contracts

The following IPC channels are defined for communication between the Electron main process (Node.js) and the renderer process (React / Vite).

## 1. Vault Management

### `vault:select` (Invoke)
- **Description**: Opens the native OS directory selector dialog for the user to choose a vault folder.
- **Request**: None
- **Response**: `{ success: boolean; path?: string; error?: string }`

### `vault:get-status` (Invoke)
- **Description**: Returns the current state of the vault.
- **Request**: None
- **Response**: `{ isLoaded: boolean; path: string | null }`

### `vault:get-index` (Invoke)
- **Description**: Returns the full in-memory note index and folder hierarchy.
- **Request**: None
- **Response**: `{ notes: Note[]; folders: Folder[]; tagMap: Record<string, string[]>; drawings: string[] }`

### `vault:read-note` (Invoke)
- **Description**: Reads the text content of a note from disk.
- **Request**: `{ path: string }`
- **Response**: `{ content: string; frontmatter: Record<string, any> }`

### `vault:write-note` (Invoke)
- **Description**: Overwrites or creates a note. If title changes, renames the file.
- **Request**: `{ path: string; content: string; frontmatter: Record<string, any>; newTitle?: string }`
- **Response**: `{ success: boolean; newPath?: string; error?: string }`

### `vault:delete-note` (Invoke)
- **Description**: Moves a note to the OS trash folder.
- **Request**: `{ path: string }`
- **Response**: `{ success: boolean; error?: string }`

### `vault:move-note` (Invoke)
- **Description**: Moves a note file to a different folder.
- **Request**: `{ path: string; destinationFolder: string }`
- **Response**: `{ success: boolean; newPath?: string; error?: string }`

### `vault:create-folder` (Invoke)
- **Description**: Creates a directory under the vault root.
- **Request**: `{ parentPath: string; folderName: string }`
- **Response**: `{ success: boolean; path?: string; error?: string }`

### `vault:on-change` (Send/Subscribe)
- **Description**: Emitted by Main when `chokidar` detects external additions, edits, renames, or deletions.
- **Response**: `{ event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'; path: string; noteIndex: any }`

---

## 2. Drawing Operations

### `drawing:save` (Invoke)
- **Description**: Saves drawing strokes as JSON and the canvas image as PNG in `/Attachments/`.
- **Request**: `{ name: string; strokes: Stroke[]; pngBase64: string }`
- **Response**: `{ success: boolean; error?: string }`

### `drawing:read` (Invoke)
- **Description**: Loads the stroke JSON history of a drawing for re-editing.
- **Request**: `{ name: string }`
- **Response**: `{ strokes: Stroke[] }`

---

## 3. Syncthing & External Services

### `syncthing:get-status` (Invoke)
- **Description**: Queries local Syncthing daemon API (`http://localhost:8384`) for sync state, devices, and connection issues.
- **Request**: None
- **Response**: `{ status: 'synced' | 'syncing' | 'error' | 'disconnected'; connectedDevices: number; errorMsg?: string }`

### `syncthing:scan` (Invoke)
- **Description**: Calls the Syncthing REST API scan command (`/rest/db/scan`) to force update the daemon index.
- **Request**: None
- **Response**: `{ success: boolean }`

---

## 4. Application Window & Core Control

### `window:control` (Send)
- **Description**: Controls the window states.
- **Request**: `{ action: 'minimize' | 'maximize' | 'close' | 'quit' | 'floating' }`

### `settings:save` (Invoke)
- **Description**: Persists user settings.
- **Request**: `AppConfig`
- **Response**: `{ success: boolean }`

### `settings:load` (Invoke)
- **Description**: Loads user settings.
- **Request**: None
- **Response**: `AppConfig`
