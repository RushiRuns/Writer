import chokidar from 'chokidar';
import { BrowserWindow } from 'electron';
import { buildVaultIndex } from './index-builder';
import { VaultIndex } from '../../shared/ipc-types';

let watcher: chokidar.FSWatcher | null = null;
let activeIndex: VaultIndex | null = null;
let debounceTimeout: NodeJS.Timeout | null = null;

export function setupFileWatcher(vaultPath: string, mainWindow: BrowserWindow): chokidar.FSWatcher {
  if (watcher) {
    watcher.close();
  }

  // Ignore dotfiles, attachments JSON stroke logs, and tmp files
  watcher = chokidar.watch(vaultPath, {
    ignored: [
      /(^|[/\\])\../,                      // dotfiles
      /[/\\]Attachments[/\\].*\.json$/,    // drawing strokes JSON files
      /\.tmp$/                             // temp files
    ],
    persistent: true,
    ignoreInitial: true
  });

  const triggerUpdate = () => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    debounceTimeout = setTimeout(async () => {
      try {
        const newIndex = await buildVaultIndex(vaultPath);
        activeIndex = newIndex;
        // Push updated index to renderer process
        mainWindow.webContents.send('index:update', newIndex);
        mainWindow.webContents.send('vault:onChange', { event: 'update', noteIndex: newIndex });
      } catch (err) {
        console.error('Failed to rebuild vault index on file watcher trigger:', err);
      }
    }, 100);
  };

  watcher
    .on('add', triggerUpdate)
    .on('change', triggerUpdate)
    .on('unlink', triggerUpdate)
    .on('addDir', triggerUpdate)
    .on('unlinkDir', triggerUpdate);

  return watcher;
}

export function getActiveIndex(): VaultIndex | null {
  return activeIndex;
}

export function setActiveIndex(index: VaultIndex) {
  activeIndex = index;
}
