const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
require('dotenv').config();

// Import Storme components
const VoicePipeline = require('./src/voice/VoicePipeline');

let mainWindow;
let voicePipeline;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true
  });

  mainWindow.loadFile('index.html');

  // Initialize Storme voice pipeline
  initializeStorme();
}

async function initializeStorme() {
  try {
    console.log('🚀 Initializing Storme AI Assistant...');
    
    voicePipeline = new VoicePipeline();
    await voicePipeline.initialize();
    
    // Start voice pipeline
    voicePipeline.start();
    
    console.log('✅ Storme is ready and listening!');
    console.log('🎤 Say "Hey Storme" to activate');
    
  } catch (error) {
    console.error('❌ Failed to initialize Storme:', error);
    
    // Fallback: show error in UI
    mainWindow.webContents.executeJavaScript(`
      document.body.innerHTML = '<div style="padding: 20px; color: red;">Failed to initialize Storme: ${error.message}</div>';
    `);
  }
}

// IPC handlers for manual testing
ipcMain.handle('test-command', async (event, command) => {
  try {
    if (voicePipeline) {
      await voicePipeline.manualTrigger(command);
      return { success: true, message: 'Command processed' };
    } else {
      return { success: false, message: 'Voice pipeline not initialized' };
    }
  } catch (error) {
    console.error('❌ Test command error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('get-status', async () => {
  return {
    initialized: !!voicePipeline,
    listening: voicePipeline?.isActive || false,
    platform: process.platform
  };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (voicePipeline) {
    voicePipeline.stop();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle app termination
app.on('before-quit', () => {
  if (voicePipeline) {
    voicePipeline.stop();
  }
});