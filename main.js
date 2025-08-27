const { app, BrowserWindow, Tray, nativeImage, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { readdirSync } = fs;
const { pathToFileURL } = require('url');

let mainWindow = null;
let settingsWindow = null;

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings() {
  try {
    const p = getSettingsPath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      const data = JSON.parse(raw);
      return {
        cupImageDataUrl: typeof data.cupImageDataUrl === 'string' ? data.cupImageDataUrl : null,
        numberColor: typeof data.numberColor === 'string' ? data.numberColor : '#1a1a1a',
        autoLaunch: typeof data.autoLaunch === 'boolean' ? data.autoLaunch : false
      };
    }
  } catch (_) {
    // ignore
  }
  return { cupImageDataUrl: null, numberColor: '#1a1a1a', autoLaunch: false };
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(settings || {}, null, 2), 'utf8');
  } catch (_) {
    // ignore
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 160,
    height: 160,
    frame: false,
    transparent: true,
    resizable: false,
    fullscreenable: false,
    hasShadow: false,
    alwaysOnTop: true,
    acceptFirstMouse: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  });

  // Keep app visible in Dock so macOS menu bar is available

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Optional: open devtools when in development
  if (!app.isPackaged) {
    // win.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow = win;
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return settingsWindow;
  }
  settingsWindow = new BrowserWindow({
    width: 560,
    height: 520,
    resizable: true,
    fullscreenable: true,
    title: '设置',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  });
  settingsWindow.removeMenu?.();
  settingsWindow.loadFile(path.join(__dirname, 'settings', 'index.html'));
  settingsWindow.on('closed', () => { settingsWindow = null; });
  return settingsWindow;
}

function buildAppMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { label: '关于 ' + app.name, role: 'about' },
            { type: 'separator' },
            {
              label: '偏好设置…',
              accelerator: 'CmdOrCtrl+,',
              click: () => createSettingsWindow()
            },
            { type: 'separator' },
            {
              label: '清零今日计数',
              accelerator: 'CmdOrCtrl+Backspace',
              click: () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('reset-count');
                }
              }
            },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideothers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
          ]
        }]
      : []),
    {
      label: '编辑',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [{ role: 'pasteAndMatchStyle' }, { role: 'selectAll' }] : [{ role: 'selectAll' }])
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'togglefullscreen' }
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: '项目主页',
          click: async () => {
            await shell.openExternal('https://example.com');
          }
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();
  buildAppMenu();
  // Send initial settings to main window after it is ready
  const settings = loadSettings();
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.send('apply-settings', settings);
  });
  // apply autolaunch preference on startup
  try {
    app.setLoginItemSettings({ openAtLogin: !!settings.autoLaunch });
  } catch (_) {}
  if (process.platform === 'darwin') {
    try { app.dock.show(); } catch (_) {}
  }
  mainWindow.show();
  mainWindow.focus();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Keep app running headless on mac, or quit on other platforms
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Forward midnight reset events if needed later
ipcMain.on('request-app-quit', () => {
  app.quit();
});

// Custom drag handling from renderer: move window by deltas
ipcMain.on('drag-window-move', (event, delta) => {
  if (!mainWindow || !delta || typeof delta.dx !== 'number' || typeof delta.dy !== 'number') {
    return;
  }
  const [x, y] = mainWindow.getPosition();
  mainWindow.setPosition(Math.round(x + delta.dx), Math.round(y + delta.dy));
});

// Settings IPC
ipcMain.handle('settings:get', () => {
  return loadSettings();
});

ipcMain.handle('settings:set', (e, partial) => {
  const merged = Object.assign({}, loadSettings(), partial || {});
  saveSettings(merged);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('apply-settings', merged);
  }
  return merged;
});

ipcMain.on('settings:open', () => {
  createSettingsWindow();
});

ipcMain.on('counter:reset', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('reset-count');
  }
});

// List preset SVGs from images_default folder
ipcMain.handle('presets:list', async () => {
  try {
    const dir = path.join(__dirname, 'images_default');
    const files = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile() && /\.svg$/i.test(d.name))
      .map((d) => pathToFileURL(path.join(dir, d.name)).toString());
    return files;
  } catch (_) {
    return [];
  }
});

// Auto-launch controls
ipcMain.handle('autolaunch:get', () => {
  try {
    const { openAtLogin } = app.getLoginItemSettings();
    return !!openAtLogin;
  } catch (_) {
    return false;
  }
});

ipcMain.handle('autolaunch:set', (e, enabled) => {
  try {
    app.setLoginItemSettings({ openAtLogin: !!enabled });
  } catch (_) {}
  // persist to settings.json too
  const merged = Object.assign({}, loadSettings(), { autoLaunch: !!enabled });
  saveSettings(merged);
  return !!enabled;
});


