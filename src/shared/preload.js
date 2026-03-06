const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getScripts: () => ipcRenderer.invoke('get-scripts'),
  getActiveScriptId: () => ipcRenderer.invoke('get-active-script-id'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveScripts: (scripts) => ipcRenderer.invoke('save-scripts', scripts),
  setActiveScript: (id) => ipcRenderer.invoke('set-active-script', id),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  openPrompter: () => ipcRenderer.invoke('open-prompter'),
  closePrompter: () => ipcRenderer.invoke('close-prompter'),
  resetPrompterPosition: () => ipcRenderer.invoke('reset-prompter-position'),
  sendToPrompter: (data) => ipcRenderer.invoke('send-to-prompter', data),
  prompterControl: (action) => ipcRenderer.invoke('prompter-control', action),
  notifyMain: (data) => ipcRenderer.invoke('notify-main', data),

  // Listeners
  onSettingsUpdated: (cb) => ipcRenderer.on('settings-updated', (_, data) => cb(data)),
  onPrompterData: (cb) => ipcRenderer.on('prompter-data', (_, data) => cb(data)),
  onPrompterControl: (cb) => ipcRenderer.on('prompter-control', (_, action) => cb(action)),
  onPrompterClosed: (cb) => ipcRenderer.on('prompter-closed', () => cb()),
  onFromPrompter: (cb) => ipcRenderer.on('from-prompter', (_, data) => cb(data))
});
