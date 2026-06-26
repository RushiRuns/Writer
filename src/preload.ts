import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('wrriter', {
  selectVault: () => ipcRenderer.invoke('vault:open'),
  getVaultStatus: () => ipcRenderer.invoke('vault:get-status'),
  getVaultIndex: () => ipcRenderer.invoke('vault:getIndex'),
  readNote: (path: string) => ipcRenderer.invoke('note:read', path),
  writeNote: (path: string, content: string, frontmatter: any, newTitle?: string) => 
    ipcRenderer.invoke('note:write', { path, content, frontmatter, newTitle }),
  deleteNote: (path: string) => ipcRenderer.invoke('note:delete', path),
  toggleNoteComplete: (path: string, completed: boolean) => 
    ipcRenderer.invoke('note:toggle-complete', { path, completed }),
  moveNote: (path: string, destinationFolder: string) => 
    ipcRenderer.invoke('note:move', { path, destinationFolder }),
  createNote: (folder: string, title: string) => 
    ipcRenderer.invoke('note:create', { folder, title }),
  createFolder: (parentPath: string, folderName: string) => 
    ipcRenderer.invoke('folder:create', { parentPath, folderName }),
  renameFolder: (path: string, newName: string) => 
    ipcRenderer.invoke('folder:rename', { path, newName }),
  deleteFolder: (path: string) => ipcRenderer.invoke('folder:delete', path),
  saveDrawing: (name: string, strokes: any[], pngBase64: string) => 
    ipcRenderer.invoke('drawing:save', { name, strokes, pngBase64 }),
  loadDrawing: (name: string) => ipcRenderer.invoke('drawing:load', name),
  getSyncthingStatus: () => ipcRenderer.invoke('syncthing:getStatus'),
  triggerSyncthingScan: () => ipcRenderer.invoke('syncthing:scan'),
  testSyncthingConnection: (url: string, apiKey: string) => 
    ipcRenderer.invoke('syncthing:test', { url, apiKey }),
  getSyncthingConfig: () => ipcRenderer.invoke('config:get-syncthing'),
  setSyncthingConfig: (config: any) => ipcRenderer.invoke('config:set-syncthing', config),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: any) => ipcRenderer.invoke('settings:set', settings),
  getHotkeys: () => ipcRenderer.invoke('hotkeys:get'),
  setHotkeys: (hotkeys: any) => ipcRenderer.invoke('hotkeys:set', hotkeys),
  exportNote: (path: string) => ipcRenderer.invoke('export:note', path),
  exportVault: () => ipcRenderer.invoke('export:vault'),
  importFiles: () => ipcRenderer.invoke('import:files'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  triggerPaletteAction: (action: string) => ipcRenderer.invoke('palette:action', action),
  
  // Listeners (Main -> Renderer IPC callbacks)
  onVaultChange: (callback: (event: any, data: any) => void) => {
    const subscription = (event: any, data: any) => callback(event, data);
    ipcRenderer.on('vault:onChange', subscription);
    return () => ipcRenderer.off('vault:onChange', subscription);
  },
  onNavigateNote: (callback: (event: any, path: string) => void) => {
    const subscription = (event: any, path: string) => callback(event, path);
    ipcRenderer.on('navigate:note', subscription);
    return () => ipcRenderer.off('navigate:note', subscription);
  },
  onIndexUpdate: (callback: (event: any, index: any) => void) => {
    const subscription = (event: any, index: any) => callback(event, index);
    ipcRenderer.on('index:update', subscription);
    return () => ipcRenderer.off('index:update', subscription);
  }
});
