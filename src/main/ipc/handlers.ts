import { ipcMain, dialog, BrowserWindow } from 'electron';
import { configStore, settingsStore, hotkeysStore, bootstrapVaultDirectories, verifyVaultPath } from '../vault/file-ops';

export function setupIpcHandlers(mainWindow: BrowserWindow) {
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

  // Hotkey Handlers
  ipcMain.handle('hotkeys:get', () => {
    return hotkeysStore.store;
  });

  ipcMain.handle('hotkeys:set', (_event, newHotkeys) => {
    hotkeysStore.set(newHotkeys);
    return { success: true };
  });

  // Placeholder hooks for note features (to be fleshed out in subsequent implementation phases)
  ipcMain.handle('vault:getIndex', () => {
    return { notes: [], tagMap: {}, drawings: [], reminders: [] };
  });

  ipcMain.handle('note:read', async (_event, _path) => {
    return { content: '', frontmatter: {} };
  });

  ipcMain.handle('note:write', async (_event, _payload) => {
    return { success: true };
  });

  ipcMain.handle('note:delete', async (_event, _path) => {
    return { success: true };
  });

  ipcMain.handle('note:move', async (_event, _payload) => {
    return { success: true };
  });

  ipcMain.handle('note:create', async (_event, _payload) => {
    return { success: true };
  });

  ipcMain.handle('folder:create', async (_event, _payload) => {
    return { success: true };
  });

  ipcMain.handle('folder:rename', async (_event, _payload) => {
    return { success: true };
  });

  ipcMain.handle('folder:delete', async (_event, _path) => {
    return { success: true };
  });

  ipcMain.handle('drawing:save', async (_event, _payload) => {
    return { success: true };
  });

  ipcMain.handle('drawing:load', async (_event, _name) => {
    return { strokes: [] };
  });

  ipcMain.handle('syncthing:getStatus', () => {
    return { status: 'disconnected', connectedDevices: 0 };
  });

  ipcMain.handle('syncthing:scan', () => {
    return { success: true };
  });

  ipcMain.handle('syncthing:test', (_event, _payload) => {
    return { success: true };
  });

  ipcMain.handle('export:note', (_event, _path) => {
    return { success: true };
  });

  ipcMain.handle('export:vault', () => {
    return { success: true };
  });

  ipcMain.handle('import:files', () => {
    return { success: true };
  });
}
