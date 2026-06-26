import { app, BrowserWindow, Tray, Menu } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { setupIpcHandlers } from './main/ipc/handlers';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
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
        }
      },
      {
        label: 'New Quick Note',
        click: () => {
          mainWindow?.show();
          // Will toggle floating window in US8
        }
      },
      {
        label: 'Open Command Palette',
        click: () => {
          mainWindow?.show();
          // Will toggle palette overlay in US8
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
    });
  }
};

// Start setup when ready
app.on('ready', () => {
  createWindow();
  createTray();
});

// Capture quit flags
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
  }
});
