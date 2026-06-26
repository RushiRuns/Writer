import { app, BrowserWindow, Tray, Menu, globalShortcut } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { setupIpcHandlers } from './main/ipc/handlers';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let paletteWindow: BrowserWindow | null = null;
let floatingWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const createWindow = () => {
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
  setupIpcHandlers(mainWindow);
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
app.on('ready', () => {
  createWindow();
  createTray();

  // Register global hotkeys
  globalShortcut.register('Ctrl+Shift+Space', () => {
    toggleCommandPalette();
  });

  globalShortcut.register('Ctrl+Shift+W', () => {
    toggleFloatingWindow();
  });
});

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

