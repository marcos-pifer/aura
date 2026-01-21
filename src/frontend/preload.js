// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer, webUtils, app } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectAudioFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveSession: (data) => ipcRenderer.invoke('data:saveSession', data),
  saveSettings: (settings) => ipcRenderer.invoke('data:saveSettings', settings),
  loadSessions: () => ipcRenderer.invoke('data:loadSessions'),
  getSettings: () => ipcRenderer.invoke('data:getSettings'),
  deleteSession: (id) => ipcRenderer.invoke('data:deleteSession', id),
  processAudio: (data) => ipcRenderer.invoke('ai:processAudio', data),
  onServerLog: (callback) => ipcRenderer.on('server-log', (event, value) => callback(value)),
  onServerStatus: (callback) => ipcRenderer.on('server-status', (event, value) => callback(value)),
  onServerReady: (callback) => ipcRenderer.on('server-ready', (event) => callback()),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  openExternal: (url) => ipcRenderer.invoke('system:openExternal', url),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  testConnection: (settings) => ipcRenderer.invoke('ai:testConnection', settings),
  onAnalysisEvent: (callback) => ipcRenderer.on('analysis-event', (event, value) => callback(value)),
  chat: (payload) => ipcRenderer.invoke('ai:chat', payload),
  generate: (payload) => ipcRenderer.invoke('ai:generate', payload),
});