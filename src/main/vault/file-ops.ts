import Store from 'electron-store';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AppConfig, AppSettings, HotkeyBindings } from '../../shared/ipc-types';
import { parseFrontmatter, stringifyFrontmatter } from './frontmatter';

// Setup store configurations
export const configStore = new Store<AppConfig>({
  name: 'config',
  encryptionKey: 'wrriter-secure-key-static-encryption-321', // Enforces encryption for syncthing API keys
  defaults: {
    vaultPath: null,
    windowBounds: { x: 0, y: 0, width: 1280, height: 800 },
    floatingWindowPosition: { x: 100, y: 100 },
    lastOpenedNote: null,
    syncthing: {
      url: 'http://localhost:8384',
      apiKey: '',
      folderId: null
    }
  }
});

export const settingsStore = new Store<AppSettings>({
  name: 'settings',
  defaults: {
    theme: 'dark',
    accentColor: '#E8A44B',
    font: 'Inter',
    fontSize: 14,
    texture: 'none',
    tabSize: 2,
    spellcheck: true,
    autoSaveInterval: 2,
    lineHeight: 1.6,
    remindersEnabled: true,
    timerFocus: 25,
    timerShortBreak: 5,
    timerLongBreak: 15,
    timerSessionsBeforeLong: 4,
    sounds: {}
  }
});

export const hotkeysStore = new Store<HotkeyBindings>({
  name: 'hotkeys',
  defaults: {
    newNote: 'Ctrl+N',
    search: 'Ctrl+K',
    commandPalette: 'Ctrl+Shift+Space',
    floatingWindow: 'Ctrl+Shift+W',
    toggleTheme: 'Ctrl+Shift+T',
    randomNote: 'Ctrl+Shift+R',
    bold: 'Ctrl+B',
    italic: 'Ctrl+I',
    switchToInbox: 'Ctrl+1',
    switchToJournal: 'Ctrl+2',
    switchToNotes: 'Ctrl+3'
  }
});

// Atomic write helper
export async function writeAtomic(filePath: string, content: string): Promise<void> {
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, content, 'utf8');
  await fs.rename(tmpPath, filePath);
}

// Filename sanitization helper
export function sanitizeFilename(filename: string): string {
  // Strip invalid characters on Windows: \ / : * ? " < > |
  const sanitized = filename.replace(/[\\/:*?"<>|]/g, '').trim();
  return sanitized.slice(0, 200);
}

// Filename conflict resolution helper
export async function resolveConflictPath(destPath: string): Promise<string> {
  try {
    await fs.access(destPath);
    // File exists, append timestamp suffix
    const parsed = path.parse(destPath);
    const timestamp = Date.now();
    const newName = `${parsed.name} - ${timestamp}${parsed.ext}`;
    return path.join(parsed.dir, newName);
  } catch {
    // File does not exist, return original path
    return destPath;
  }
}

// System folders list
export const systemFolders = [
  'Inbox',
  'Later',
  'Read',
  'Shop',
  'Watch',
  'Tasks',
  'Journal',
  'Archive',
  'Attachments'
];

// Bootstrap system folders recursively
export async function bootstrapVaultDirectories(vaultPath: string): Promise<void> {
  for (const folder of systemFolders) {
    const fullPath = path.join(vaultPath, folder);
    await fs.mkdir(fullPath, { recursive: true });
  }
}

// Verify that a given vault path exists
export async function verifyVaultPath(vaultPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(vaultPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

// Write the completed state of a note directly in its YAML frontmatter
export async function setNoteCompletedState(filePath: string, completed: boolean): Promise<void> {
  const fileContent = await fs.readFile(filePath, 'utf8');
  const parsed = parseFrontmatter(fileContent);
  parsed.data.completed = completed;
  parsed.data.completed_at = completed ? new Date().toISOString() : null;
  const newContent = stringifyFrontmatter(parsed.content, parsed.data);
  await writeAtomic(filePath, newContent);
}

// Save drawing PNG + JSON to Attachments directory inside the vault
export async function saveDrawingFiles(
  vaultPath: string,
  name: string,
  strokes: any[],
  pngBase64: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const sanitized = sanitizeFilename(name);
    if (!sanitized) {
      return { success: false, error: 'Invalid file name' };
    }
    const attachmentsDir = path.join(vaultPath, 'Attachments');
    await fs.mkdir(attachmentsDir, { recursive: true });

    const pngPath = path.join(attachmentsDir, `${sanitized}.png`);
    const jsonPath = path.join(attachmentsDir, `${sanitized}.json`);

    // Write PNG atomically
    const base64Data = pngBase64.replace(/^data:image\/png;base64,/, '');
    const tmpPngPath = `${pngPath}.tmp`;
    await fs.writeFile(tmpPngPath, Buffer.from(base64Data, 'base64'));
    await fs.rename(tmpPngPath, pngPath);

    // Write JSON atomically
    const jsonContent = JSON.stringify(strokes, null, 2);
    await writeAtomic(jsonPath, jsonContent);

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

