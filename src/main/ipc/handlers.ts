import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
import * as fs from 'fs/promises';
import * as fsCb from 'fs';
import * as path from 'path';
import { ZipArchive } from 'archiver';
import { 
  configStore, 
  settingsStore, 
  hotkeysStore, 
  libraryStore,
  bootstrapVaultDirectories, 
  verifyVaultPath, 
  writeAtomic, 
  sanitizeFilename, 
  resolveConflictPath,
  setNoteCompletedState,
  saveDrawingFiles
} from '../vault/file-ops';
import { buildVaultIndex } from '../vault/index-builder';
import { setupFileWatcher, getActiveIndex, setActiveIndex } from '../vault/file-watcher';
import { parseFrontmatter, stringifyFrontmatter } from '../vault/frontmatter';
import { 
  getSyncthingStatus, 
  triggerSyncthingScan, 
  testSyncthingConnection 
} from '../syncthing/client';
import { updateSchedulerReminders } from '../reminders/scheduler';

export function setupIpcHandlers(mainWindow: BrowserWindow, onHotkeyChange?: () => void) {
  // Start file watcher if vault path is configured on startup
  const initialVaultPath = configStore.get('vaultPath');
  if (initialVaultPath) {
    verifyVaultPath(initialVaultPath).then(async (isValid) => {
      if (isValid) {
        await bootstrapVaultDirectories(initialVaultPath);
        setupFileWatcher(initialVaultPath, mainWindow);
        try {
          const idx = await buildVaultIndex(initialVaultPath);
          setActiveIndex(idx);
          updateSchedulerReminders(idx.reminders);
        } catch (err) {
          console.error('Failed to build initial vault index:', err);
        }
      }
    });
  }

  // Config & Status Handlers
  ipcMain.handle('vault:get-status', async () => {
    const vaultPath = configStore.get('vaultPath');
    if (vaultPath) {
      const isValid = await verifyVaultPath(vaultPath);
      if (isValid) {
        await bootstrapVaultDirectories(vaultPath);
        return { isLoaded: true, path: vaultPath };
      }
    }
    return { isLoaded: false, path: null };
  });

  ipcMain.handle('vault:open', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    if (result.canceled) {
      return { success: false };
    }
    const vaultPath = result.filePaths[0];
    
    const isValid = await verifyVaultPath(vaultPath);
    if (!isValid) {
      return { success: false, error: 'Selected path is not a valid directory.' };
    }

    await bootstrapVaultDirectories(vaultPath);
    configStore.set('vaultPath', vaultPath);
    
    // Start watcher and build index
    setupFileWatcher(vaultPath, mainWindow);
    try {
      const idx = await buildVaultIndex(vaultPath);
      setActiveIndex(idx);
      updateSchedulerReminders(idx.reminders);
    } catch (err) {
      console.error('Failed to build vault index on open:', err);
    }
    
    return { success: true, path: vaultPath };
  });

  // Settings Handlers
  ipcMain.handle('settings:get', () => {
    return settingsStore.store;
  });

  ipcMain.handle('settings:set', (_event, newSettings) => {
    settingsStore.set(newSettings);
    return { success: true };
  });

  ipcMain.handle('config:get-syncthing', () => {
    return configStore.get('syncthing');
  });

  ipcMain.handle('config:set-syncthing', (_event, syncthingConfig) => {
    configStore.set('syncthing', syncthingConfig);
    return { success: true };
  });

  // Hotkey Handlers
  ipcMain.handle('hotkeys:get', () => {
    return hotkeysStore.store;
  });

  ipcMain.handle('hotkeys:set', (_event, newHotkeys) => {
    for (const key of Object.keys(newHotkeys)) {
      hotkeysStore.set(key, newHotkeys[key]);
    }
    if (onHotkeyChange) {
      onHotkeyChange();
    }
    return { success: true };
  });

  // Note features implementation
  ipcMain.handle('vault:getIndex', async () => {
    const vaultPath = configStore.get('vaultPath');
    if (!vaultPath) {
      return { notes: [], tagMap: {}, drawings: [], reminders: [], folders: [] };
    }
    let idx = getActiveIndex();
    if (!idx) {
      try {
        idx = await buildVaultIndex(vaultPath);
        setActiveIndex(idx);
      } catch (err) {
        console.error('Failed to retrieve vault index:', err);
        return { notes: [], tagMap: {}, drawings: [], reminders: [], folders: [] };
      }
    }
    return idx;
  });

  ipcMain.handle('note:read', async (_event, notePath) => {
    try {
      const fileContent = await fs.readFile(notePath, 'utf8');
      const parsed = parseFrontmatter(fileContent);
      return { content: parsed.content, frontmatter: parsed.data };
    } catch (err) {
      console.error(`Failed to read note at ${notePath}:`, err);
      return { content: '', frontmatter: {} };
    }
  });

  ipcMain.handle('note:write', async (_event, { path: notePath, content, frontmatter, newTitle }) => {
    try {
      const fileContent = stringifyFrontmatter(content, frontmatter);
      if (newTitle) {
        const sanitizedTitle = sanitizeFilename(newTitle);
        const newPath = path.join(path.dirname(notePath), sanitizedTitle + '.md');
        if (newPath !== notePath) {
          const finalPath = await resolveConflictPath(newPath);
          await writeAtomic(finalPath, fileContent);
          await fs.unlink(notePath);
          return { success: true, path: finalPath };
        }
      }
      await writeAtomic(notePath, fileContent);
      return { success: true, path: notePath };
    } catch (err) {
      console.error('Failed to write note:', err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('note:delete', async (_event, notePath) => {
    try {
      await shell.trashItem(notePath);
      return { success: true };
    } catch (err) {
      console.error('Failed to delete note:', err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('note:toggle-complete', async (_event, { path: notePath, completed }) => {
    try {
      await setNoteCompletedState(notePath, completed);
      return { success: true };
    } catch (err) {
      console.error('Failed to toggle note complete state:', err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('note:move', async (_event, { path: notePath, destinationFolder }) => {
    try {
      const vaultPath = configStore.get('vaultPath');
      if (!vaultPath) {
        return { success: false, error: 'Vault path is not configured' };
      }
      const targetDir = path.isAbsolute(destinationFolder)
        ? destinationFolder
        : path.join(vaultPath, destinationFolder);
      
      await fs.mkdir(targetDir, { recursive: true });
      const finalPath = await resolveConflictPath(path.join(targetDir, path.basename(notePath)));
      await fs.rename(notePath, finalPath);
      return { success: true, path: finalPath };
    } catch (err) {
      console.error('Failed to move note:', err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('note:create', async (_event, { folder, title }) => {
    try {
      const vaultPath = configStore.get('vaultPath');
      if (!vaultPath) {
        return { success: false, error: 'Vault path is not configured' };
      }
      const targetDir = path.isAbsolute(folder)
        ? folder
        : path.join(vaultPath, folder);
      
      await fs.mkdir(targetDir, { recursive: true });
      const filename = sanitizeFilename(title || 'Untitled') + '.md';
      const initialPath = path.join(targetDir, filename);
      const finalPath = await resolveConflictPath(initialPath);
      
      const createdDate = new Date().toISOString();
      const actualTitle = path.parse(finalPath).name;
      const fileContent = stringifyFrontmatter('', {
        title: actualTitle,
        created: createdDate,
        tags: [],
        reminder: null,
        completed: false,
        completed_at: null
      });
      
      await writeAtomic(finalPath, fileContent);
      return { success: true, path: finalPath };
    } catch (err) {
      console.error('Failed to create note:', err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('folder:create', async (_event, { parentPath, folderName }) => {
    try {
      const vaultPath = configStore.get('vaultPath');
      if (!vaultPath) return { success: false, error: 'Vault path not configured' };
      const baseDir = parentPath ? (path.isAbsolute(parentPath) ? parentPath : path.join(vaultPath, parentPath)) : vaultPath;
      const newFolderPath = path.join(baseDir, sanitizeFilename(folderName));
      await fs.mkdir(newFolderPath, { recursive: true });

      // Rebuild index and push update to renderer process immediately
      const newIndex = await buildVaultIndex(vaultPath);
      setActiveIndex(newIndex);
      mainWindow.webContents.send('index:update', newIndex);
      mainWindow.webContents.send('vault:onChange', { event: 'update', noteIndex: newIndex });

      return { success: true, path: newFolderPath };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('folder:rename', async (_event, { path: folderPath, newName }) => {
    try {
      const vaultPath = configStore.get('vaultPath');
      if (!vaultPath) return { success: false, error: 'Vault path not configured' };
      const absFolderPath = path.isAbsolute(folderPath) ? folderPath : path.join(vaultPath, folderPath);
      const parentDir = path.dirname(absFolderPath);
      const newFolderPath = path.join(parentDir, sanitizeFilename(newName));
      await fs.rename(absFolderPath, newFolderPath);
      const relativePath = path.relative(vaultPath, newFolderPath).replace(/\\/g, '/');

      // Rebuild index and push update to renderer process immediately
      const newIndex = await buildVaultIndex(vaultPath);
      setActiveIndex(newIndex);
      mainWindow.webContents.send('index:update', newIndex);
      mainWindow.webContents.send('vault:onChange', { event: 'update', noteIndex: newIndex });

      return { success: true, path: relativePath };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('folder:delete', async (_event, folderPath) => {
    try {
      const vaultPath = configStore.get('vaultPath');
      if (!vaultPath) return { success: false, error: 'Vault path not configured' };
      const absFolderPath = path.isAbsolute(folderPath) ? folderPath : path.join(vaultPath, folderPath);
      await shell.trashItem(absFolderPath);

      // Rebuild index and push update to renderer process immediately
      const newIndex = await buildVaultIndex(vaultPath);
      setActiveIndex(newIndex);
      mainWindow.webContents.send('index:update', newIndex);
      mainWindow.webContents.send('vault:onChange', { event: 'update', noteIndex: newIndex });

      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('drawing:save', async (_event, { name, elements, appState, files, pngBase64 }) => {
    const vaultPath = configStore.get('vaultPath');
    if (!vaultPath) {
      return { success: false, error: 'Vault path not configured' };
    }
    return await saveDrawingFiles(vaultPath, name, { elements, appState, files }, pngBase64);
  });

  ipcMain.handle('drawing:load', async (_event, name) => {
    try {
      const vaultPath = configStore.get('vaultPath');
      if (!vaultPath) {
        return { elements: [], appState: {}, files: {} };
      }
      const sanitized = sanitizeFilename(name);
      const jsonPath = path.join(vaultPath, 'Attachments', `${sanitized}.json`);
      const content = await fs.readFile(jsonPath, 'utf8');
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        return { elements: [], appState: {}, files: {}, isOldStrokes: true };
      }
      return data;
    } catch (err) {
      console.error(`Failed to load drawing ${name}:`, err);
      return { elements: [], appState: {}, files: {} };
    }
  });

  ipcMain.handle('drawing:getLibraries', async () => {
    return libraryStore.get('items');
  });

  ipcMain.handle('drawing:saveLibraries', async (_event, items: any[]) => {
    libraryStore.set('items', items);
    return { success: true };
  });

  ipcMain.handle('drawing:delete', async (_event, name) => {
    try {
      const vaultPath = configStore.get('vaultPath');
      if (!vaultPath) return { success: false, error: 'Vault path not configured' };
      const sanitized = sanitizeFilename(name);
      const attachmentsDir = path.join(vaultPath, 'Attachments');
      const pngPath = path.join(attachmentsDir, `${sanitized}.png`);
      const jsonPath = path.join(attachmentsDir, `${sanitized}.json`);
      
      await fs.unlink(pngPath).catch(() => {});
      await fs.unlink(jsonPath).catch(() => {});
      return { success: true };
    } catch (err) {
      console.error('Failed to delete drawing:', err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('drawing:rename', async (_event, { oldName, newName }) => {
    try {
      const vaultPath = configStore.get('vaultPath');
      if (!vaultPath) return { success: false, error: 'Vault path not configured' };
      const oldSanitized = sanitizeFilename(oldName);
      const newSanitized = sanitizeFilename(newName);
      if (!newSanitized) return { success: false, error: 'Invalid new name' };
      
      const attachmentsDir = path.join(vaultPath, 'Attachments');
      const oldPng = path.join(attachmentsDir, `${oldSanitized}.png`);
      const newPng = path.join(attachmentsDir, `${newSanitized}.png`);
      const oldJson = path.join(attachmentsDir, `${oldSanitized}.json`);
      const newJson = path.join(attachmentsDir, `${newSanitized}.json`);
      
      await fs.rename(oldPng, newPng).catch(() => {});
      await fs.rename(oldJson, newJson).catch(() => {});
      return { success: true };
    } catch (err) {
      console.error('Failed to rename drawing:', err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('drawing:duplicate', async (_event, name) => {
    try {
      const vaultPath = configStore.get('vaultPath');
      if (!vaultPath) return { success: false, error: 'Vault path not configured' };
      const sanitized = sanitizeFilename(name);
      
      const attachmentsDir = path.join(vaultPath, 'Attachments');
      const sourcePng = path.join(attachmentsDir, `${sanitized}.png`);
      const sourceJson = path.join(attachmentsDir, `${sanitized}.json`);
      
      let copyName = `${name} copy`;
      let copySanitized = sanitizeFilename(copyName);
      let destPng = path.join(attachmentsDir, `${copySanitized}.png`);
      let destJson = path.join(attachmentsDir, `${copySanitized}.json`);
      
      let counter = 1;
      while (await fs.access(destPng).then(() => true).catch(() => false)) {
        copyName = `${name} copy ${counter}`;
        copySanitized = sanitizeFilename(copyName);
        destPng = path.join(attachmentsDir, `${copySanitized}.png`);
        destJson = path.join(attachmentsDir, `${copySanitized}.json`);
        counter++;
      }
      
      await fs.copyFile(sourcePng, destPng).catch(() => {});
      await fs.copyFile(sourceJson, destJson).catch(() => {});
      return { success: true };
    } catch (err) {
      console.error('Failed to duplicate drawing:', err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('syncthing:getStatus', async () => {
    return await getSyncthingStatus();
  });

  ipcMain.handle('syncthing:scan', async () => {
    return await triggerSyncthingScan();
  });

  ipcMain.handle('syncthing:test', async (_event, { url, apiKey }) => {
    return await testSyncthingConnection(url, apiKey);
  });

  // Export a single note as a Markdown file
  ipcMain.handle('export:note', async (_event, notePath) => {
    if (!notePath) return { success: false, error: 'No note path provided' };
    try {
      const basename = path.basename(notePath);
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Note',
        defaultPath: basename,
        filters: [{ name: 'Markdown', extensions: ['md'] }]
      });
      if (result.canceled || !result.filePath) return { success: false };
      await fs.copyFile(notePath, result.filePath);
      return { success: true, path: result.filePath };
    } catch (err) {
      console.error('Failed to export note:', err);
      return { success: false, error: String(err) };
    }
  });

  // Export the entire vault as a ZIP archive
  ipcMain.handle('export:vault', async () => {
    const vaultPath = configStore.get('vaultPath');
    if (!vaultPath) return { success: false, error: 'No vault configured' };
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Vault as ZIP',
        defaultPath: 'wrriter-vault.zip',
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
      });
      if (result.canceled || !result.filePath) return { success: false };

      await new Promise<void>((resolve, reject) => {
        const output = fsCb.createWriteStream(result.filePath!);
        const archive = new ZipArchive({ zlib: { level: 9 } });
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        archive.directory(vaultPath, false);
        archive.finalize();
      });

      return { success: true, path: result.filePath };
    } catch (err) {
      console.error('Failed to export vault:', err);
      return { success: false, error: String(err) };
    }
  });

  // Import Markdown files into the vault Inbox
  ipcMain.handle('import:files', async () => {
    const vaultPath = configStore.get('vaultPath');
    if (!vaultPath) return { success: false, error: 'No vault configured' };
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Import Markdown Files',
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Markdown', extensions: ['md'] }]
      });
      if (result.canceled || result.filePaths.length === 0) return { success: false };

      const inboxDir = path.join(vaultPath, 'Inbox');
      await fs.mkdir(inboxDir, { recursive: true });

      let imported = 0;
      const errors: string[] = [];
      for (const srcPath of result.filePaths) {
        try {
          const destPath = await resolveConflictPath(path.join(inboxDir, path.basename(srcPath)));
          await fs.copyFile(srcPath, destPath);
          imported++;
        } catch (err) {
          errors.push(String(err));
        }
      }

      return { success: true, imported, errors };
    } catch (err) {
      console.error('Failed to import files:', err);
      return { success: false, error: String(err) };
    }
  });

  // Change the vault directory
  ipcMain.handle('settings:change-vault', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select New Vault Directory',
        properties: ['openDirectory']
      });
      if (result.canceled || !result.filePaths[0]) return { success: false };

      const newVaultPath = result.filePaths[0];
      const isValid = await verifyVaultPath(newVaultPath);
      if (!isValid) return { success: false, error: 'Selected path is not a valid directory.' };

      await bootstrapVaultDirectories(newVaultPath);
      configStore.set('vaultPath', newVaultPath);
      setupFileWatcher(newVaultPath, mainWindow);

      try {
        const idx = await buildVaultIndex(newVaultPath);
        setActiveIndex(idx);
        mainWindow.webContents.send('index:update', idx);
        updateSchedulerReminders(idx.reminders);
      } catch (err) {
        console.error('Failed to build vault index after vault change:', err);
      }

      return { success: true, path: newVaultPath };
    } catch (err) {
      console.error('Failed to change vault:', err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.close();
    }
    return { success: true };
  });

  ipcMain.handle('palette:action', (_event, action) => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('navigate:note', action);
    }
    const paletteWin = BrowserWindow.fromWebContents(_event.sender);
    if (paletteWin) {
      paletteWin.close();
    }
    return { success: true };
  });

  ipcMain.handle('image:upload', async () => {
    try {
      const vaultPath = configStore.get('vaultPath');
      if (!vaultPath) {
        return { success: false, error: 'Vault path not configured' };
      }
      
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Image to Upload',
        filters: [
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false };
      }

      const sourcePath = result.filePaths[0];
      const filename = path.basename(sourcePath);
      const sanitizedFilename = sanitizeFilename(filename);

      const attachmentsDir = path.join(vaultPath, 'Attachments');
      await fs.mkdir(attachmentsDir, { recursive: true });

      // Generate a unique name if a file with the same name already exists
      const ext = path.extname(sanitizedFilename);
      const base = path.basename(sanitizedFilename, ext);
      let destFilename = sanitizedFilename;
      let destPath = path.join(attachmentsDir, destFilename);
      let counter = 1;

      while (await fs.access(destPath).then(() => true).catch(() => false)) {
        destFilename = `${base}_${counter}${ext}`;
        destPath = path.join(attachmentsDir, destFilename);
        counter++;
      }

      await fs.copyFile(sourcePath, destPath);

      // Return the relative path for serialization
      return { 
        success: true, 
        path: `Attachments/${destFilename}`
      };
    } catch (err) {
      console.error('Failed to upload image:', err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('link:open', async (_event, url: string) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (err) {
      console.error('Failed to open external link:', err);
      return { success: false, error: String(err) };
    }
  });
}
