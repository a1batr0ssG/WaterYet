const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('waterApi', {
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  dragWindowBy: (dx, dy) => {
    ipcRenderer.send('drag-window-move', { dx, dy });
  },
  onApplySettings: (cb) => {
    ipcRenderer.on('apply-settings', (_e, data) => cb && cb(data));
  },
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (partial) => ipcRenderer.invoke('settings:set', partial),
  openSettings: () => ipcRenderer.send('settings:open'),
  resetCounter: () => ipcRenderer.send('counter:reset'),
  onResetCount: (cb) => ipcRenderer.on('reset-count', () => cb && cb()),
  listPresets: () => ipcRenderer.invoke('presets:list')
  ,getAutoLaunch: () => ipcRenderer.invoke('autolaunch:get')
  ,setAutoLaunch: (enabled) => ipcRenderer.invoke('autolaunch:set', enabled)
});


