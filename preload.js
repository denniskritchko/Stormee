const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  testCommand: (command) => ipcRenderer.invoke('test-command', command),
  getStatus: () => ipcRenderer.invoke('get-status'),
  
  // Event listeners
  onStatusUpdate: (callback) => {
    // You can add event listeners here if needed
  }
});
