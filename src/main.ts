import { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, protocol, net, shell } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import started from 'electron-squirrel-startup';
import { setupIpcHandlers } from './main/ipc/handlers';
import { hotkeysStore, configStore } from './main/vault/file-ops';
import { initializeScheduler } from './main/reminders/scheduler';

// Register custom protocol before ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'wrriter-file',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let paletteWindow: BrowserWindow | null = null;
let floatingWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const registerDevToolsShortcut = (win: BrowserWindow) => {
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      const isDevToolsKey = 
        input.key === 'F12' || 
        (input.control && input.shift && input.key.toLowerCase() === 'i');
      if (isDevToolsKey) {
        win.webContents.toggleDevTools();
        event.preventDefault();
      }
    }
  });
};

const createWindow = async () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Intercept links and open in system default browser
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  registerDevToolsShortcut(mainWindow);
  mainWindow.setMenu(null);

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Intercept close event to hide window instead of exiting process
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // Setup main process IPC listener bindings
  setupIpcHandlers(mainWindow, registerGlobalShortcuts);
  await initializeScheduler(mainWindow);

  // Register renderer toggle floating window command
  ipcMain.handle('window:toggle-floating', () => {
    toggleFloatingWindow();
    return { success: true };
  });
};

// Toggle frameless transparent Command Palette Window
const toggleCommandPalette = () => {
  if (paletteWindow && !paletteWindow.isDestroyed()) {
    paletteWindow.close();
    return;
  }

  paletteWindow = new BrowserWindow({
    width: 600,
    height: 350,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  registerDevToolsShortcut(paletteWindow);

  const url = MAIN_WINDOW_VITE_DEV_SERVER_URL
    ? `${MAIN_WINDOW_VITE_DEV_SERVER_URL}?mode=palette`
    : `file://${path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)}?mode=palette`;

  paletteWindow.loadURL(url);
  paletteWindow.once('ready-to-show', () => {
    paletteWindow?.show();
    paletteWindow?.focus();
  });

  paletteWindow.on('blur', () => {
    paletteWindow?.close();
  });

  paletteWindow.on('closed', () => {
    paletteWindow = null;
  });
};

// Toggle frameless transparent Quick Write Floating Window
const toggleFloatingWindow = () => {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.close();
    return;
  }

  floatingWindow = new BrowserWindow({
    width: 500,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  registerDevToolsShortcut(floatingWindow);

  const url = MAIN_WINDOW_VITE_DEV_SERVER_URL
    ? `${MAIN_WINDOW_VITE_DEV_SERVER_URL}?mode=floating`
    : `file://${path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)}?mode=floating`;

  floatingWindow.loadURL(url);
  floatingWindow.once('ready-to-show', () => {
    floatingWindow?.show();
    floatingWindow?.focus();
  });

  floatingWindow.on('blur', () => {
    floatingWindow?.close();
  });

  floatingWindow.on('closed', () => {
    floatingWindow = null;
  });
};

const createTray = () => {
  // Bundled tray icon path fallback config
  const iconPath = path.join(__dirname, '../../resources/tray-icon.png');
  
  try {
    tray = new Tray(iconPath);
  } catch (err) {
    // Graceful fallback for local development without icon file
    console.warn("Tray icon not loaded, using placeholder logic");
  }

  if (tray) {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Wrriter',
        click: () => {
          mainWindow?.show();
          mainWindow?.focus();
        }
      },
      {
        label: 'New Quick Note',
        click: () => {
          toggleFloatingWindow();
        }
      },
      {
        label: 'Open Command Palette',
        click: () => {
          toggleCommandPalette();
        }
      },
      { type: 'separator' },
      {
        label: 'Quit Wrriter',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setToolTip('Wrriter Desktop Notes');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
      mainWindow?.show();
      mainWindow?.focus();
    });
  }
};

// Start setup when ready
app.on('ready', async () => {
  if (process.platform === 'win32') {
    app.setAppUserModelId(app.name);
  }
  await createWindow();
  createTray();

  // Register global hotkeys
  registerGlobalShortcuts();

  // Handle wrriter-file custom protocol
  protocol.handle('wrriter-file', (request) => {
    try {
      const filePath = request.url.slice('wrriter-file://'.length);
      const vaultPath = configStore.get('vaultPath') as string;
      if (!vaultPath) {
        return new Response('Vault path not configured', { status: 400 });
      }
      // Decode URL to handle spaces and special characters in file names
      const decodedPath = decodeURIComponent(filePath);
      const absolutePath = path.isAbsolute(decodedPath)
        ? decodedPath
        : path.join(vaultPath, decodedPath);

      // Verify that the requested file path lies within the vault path to prevent path traversal
      const relative = path.relative(vaultPath, absolutePath);
      const isSafe = !relative.startsWith('..') && !path.isAbsolute(relative);
      
      if (!isSafe) {
        return new Response('Forbidden', { status: 403 });
      }

      return net.fetch(pathToFileURL(absolutePath).toString(), {
        bypassCustomProtocolHandlers: true
      });
    } catch (err) {
      console.error('Failed to resolve wrriter-file protocol:', err);
      return new Response('Internal Server Error', { status: 500 });
    }
  });
});

// Helper to register dynamic global hotkeys loaded from settings store
function registerGlobalShortcuts() {
  globalShortcut.unregisterAll();
  const hotkeys = hotkeysStore.store;

  if (hotkeys && hotkeys.commandPalette) {
    try {
      globalShortcut.register(hotkeys.commandPalette, () => {
        toggleCommandPalette();
      });
    } catch (err) {
      console.error('Failed to register global shortcut commandPalette:', err);
    }
  }

  if (hotkeys && hotkeys.floatingWindow) {
    try {
      globalShortcut.register(hotkeys.floatingWindow, () => {
        toggleFloatingWindow();
      });
    } catch (err) {
      console.error('Failed to register global shortcut floatingWindow:', err);
    }
  }
}



// Capture quit flags and unregister global hotkeys
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('before-quit', () => {
  isQuitting = true;
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow?.show();
    mainWindow?.focus();
  }
});

