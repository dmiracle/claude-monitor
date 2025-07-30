const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Process monitoring
  getClaudeInstances: () => ipcRenderer.invoke('get-claude-instances'),
  getInstanceDetails: (pid, workingDirectory) => ipcRenderer.invoke('get-instance-details', pid, workingDirectory),
  
  // Window management
  activateWindow: (pid, tty, workingDirectory) => ipcRenderer.invoke('activate-window', pid, tty, workingDirectory),
  toggleWindowSize: (minimize) => ipcRenderer.invoke('toggle-window-size', minimize),
  updateWindowHeight: (instanceCount) => ipcRenderer.invoke('update-window-height', instanceCount)
});