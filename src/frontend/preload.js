// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectAudioFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveSession: (data) => ipcRenderer.invoke('data:saveSession', data),
  saveSettings: (settings) => ipcRenderer.invoke('data:saveSettings', settings),
  loadSessions: () => ipcRenderer.invoke('data:loadSessions'),
  deleteSession: (id) => ipcRenderer.invoke('data:deleteSession', id),
  processAudio: (data) => ipcRenderer.invoke('ai:processAudio', data),
});