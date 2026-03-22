const { app, BrowserWindow, screen, ipcMain, globalShortcut, session, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store({
  defaults: {
    scripts: [
      {
        id: 'welcome-glance',
        title: 'Welcome to Glance',
        content: `Welcome to Glance

Your smart teleprompter that follows your voice naturally.

Right now you are reading this text on the prompter.
If Voice Follow is enabled, each word highlights as you speak, tracking exactly where you are.

Try pausing for a moment.
Notice how it waits for you.

Now try reading a bit faster and watch the prompter keep up with your pace.

You can even go back.
Try re-reading the previous sentence again.
The prompter followed you back.

Getting Started

Write or paste your script in the editor on the left.
Click Start to launch the prompter with a countdown.
Enable Voice Follow for hands-free scrolling.
You will need a free Groq API key from console.groq.com.

Tips for Best Results

Speak clearly at a natural pace.
A quiet environment works best.
You can resize and drag the prompter window anywhere on screen.

Keyboard Shortcuts

Ctrl P or Command P to play or pause.
Ctrl R or Command R to reset to the beginning.
Arrow keys to adjust scroll speed.
Ctrl Shift P or Command Shift P to toggle the prompter window.

That is everything you need to know.
Delete this script and create your first one.

Happy presenting.`
      }
    ],
    activeScriptId: 'welcome-glance',
    settings: {
      fontSize: 32,
      textColor: '#FFFFFF',
      bgOpacity: 0.85,
      fontWeight: 'bold',
      lineSpacing: 1.6,
      mirror: false,
      padding: 20,
      scrollSpeed: 1.0,
      countdownDuration: 3,
      voiceFollow: false,
      groqApiKey: ''
    },
    prompterBounds: null,
    mainBounds: null
  }
});

let mainWindow = null;
let prompterWindow = null;
let tray = null;

function getNotchPosition() {
  const display = screen.getPrimaryDisplay();
  const { width } = display.bounds;
  const prompterWidth = 380;
  const prompterHeight = 180;
  const x = Math.round((width - prompterWidth) / 2);
  const y = 25; // Below macOS menu bar
  return { x, y, width: prompterWidth, height: prompterHeight };
}

function createMainWindow() {
  const savedBounds = store.get('mainBounds');
  mainWindow = new BrowserWindow({
    width: savedBounds?.width || 900,
    height: savedBounds?.height || 650,
    x: savedBounds?.x,
    y: savedBounds?.y,
    minWidth: 600,
    minHeight: 400,
    title: 'Glance',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: path.join(__dirname, '..', 'shared', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'editor', 'index.html'));

  mainWindow.on('close', (e) => {
    store.set('mainBounds', mainWindow.getBounds());
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (prompterWindow) {
      prompterWindow.close();
    }
    app.quit();
  });
}

function createPrompterWindow() {
  if (prompterWindow) {
    prompterWindow.focus();
    return;
  }

  const savedBounds = store.get('prompterBounds');
  const defaultBounds = getNotchPosition();
  const bounds = savedBounds || defaultBounds;

  prompterWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'shared', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  prompterWindow.setContentProtection(true);
  prompterWindow.setAlwaysOnTop(true, 'floating');
  prompterWindow.setVisibleOnAllWorkspaces(true);
  prompterWindow.loadFile(path.join(__dirname, '..', 'renderer', 'prompter', 'index.html'));

  prompterWindow.on('moved', () => {
    if (prompterWindow) {
      store.set('prompterBounds', prompterWindow.getBounds());
    }
  });

  prompterWindow.on('resized', () => {
    if (prompterWindow) {
      store.set('prompterBounds', prompterWindow.getBounds());
    }
  });

  prompterWindow.on('closed', () => {
    prompterWindow = null;
    if (mainWindow) {
      mainWindow.webContents.send('prompter-closed');
    }
  });
}

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+P', () => {
    if (prompterWindow) {
      prompterWindow.close();
    } else {
      createPrompterWindow();
    }
  });

  globalShortcut.register('CommandOrControl+Shift+N', () => {
    if (prompterWindow) {
      const pos = getNotchPosition();
      prompterWindow.setBounds(pos);
      store.set('prompterBounds', pos);
    }
  });
}

// IPC Handlers
ipcMain.handle('get-scripts', () => store.get('scripts'));
ipcMain.handle('get-active-script-id', () => store.get('activeScriptId'));
ipcMain.handle('get-settings', () => store.get('settings'));

ipcMain.handle('save-scripts', (_, scripts) => {
  store.set('scripts', scripts);
});

ipcMain.handle('set-active-script', (_, id) => {
  store.set('activeScriptId', id);
});

ipcMain.handle('save-settings', (_, settings) => {
  store.set('settings', settings);
  if (prompterWindow) {
    prompterWindow.webContents.send('settings-updated', settings);
  }
});

ipcMain.handle('open-prompter', () => {
  createPrompterWindow();
});

ipcMain.handle('close-prompter', () => {
  if (prompterWindow) prompterWindow.close();
});

ipcMain.handle('reset-prompter-position', () => {
  if (prompterWindow) {
    const pos = getNotchPosition();
    prompterWindow.setBounds(pos);
    store.set('prompterBounds', pos);
  }
});

ipcMain.handle('send-to-prompter', (_, data) => {
  if (prompterWindow) {
    prompterWindow.webContents.send('prompter-data', data);
  }
});

ipcMain.handle('prompter-control', (_, action) => {
  if (prompterWindow) {
    prompterWindow.webContents.send('prompter-control', action);
  }
});

ipcMain.handle('notify-main', (_, data) => {
  if (mainWindow) {
    mainWindow.webContents.send('from-prompter', data);
  }
});

app.whenReady().then(() => {
  // Allow microphone access for voice follow feature
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
      return;
    }
    callback(true);
  });

  createMainWindow();
  registerShortcuts();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createMainWindow();
});
