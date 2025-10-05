const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const screen = electron.screen;
const globalShortcut = electron.globalShortcut;
const path = require('path');

function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  
  const windowWidth = 300;
  const windowHeight = 300;
  
  const mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: screenWidth - windowWidth,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
  
  // Send global cursor position to renderer every frame
  setInterval(() => {
    const cursorPos = screen.getCursorScreenPoint();
    const windowBounds = mainWindow.getBounds();
    const display = screen.getPrimaryDisplay();
    const screenSize = display.workAreaSize;
    
    // Calculate window center position
    const windowCenterX = windowBounds.x + (windowBounds.width / 2);
    const windowCenterY = windowBounds.y + (windowBounds.height / 2);
    
    // Calculate cursor position relative to window center
    const relativeX = cursorPos.x - windowCenterX;
    const relativeY = cursorPos.y - windowCenterY;
    
    // Normalize relative to screen size
    const normalizedX = relativeX / screenSize.width;
    const normalizedY = relativeY / screenSize.height;
    
    mainWindow.webContents.send('cursor-position', {
      x: normalizedX,
      y: normalizedY
    });
  }, 16); // ~60fps
  
  return mainWindow;
}

app.whenReady().then(() => {
  const mainWindow = createWindow();

  // Register global shortcut for Cmd+Shift+S to toggle visibility
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        // Trigger pop animation when showing
        mainWindow.webContents.send('trigger-pop-animation');
      }
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});

