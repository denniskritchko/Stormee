const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
require('dotenv').config();

// Import Storme components
const GeminiClient = require('./src/ai/GeminiClient');
const SystemController = require('./src/controllers/SystemController');
const VoicePipeline = require('./src/voice/VoicePipeline');

let mainWindow;
let geminiClient;
let systemController;
let voicePipeline;

function createWindow() {
  console.log('🔧 Creating window...');
  
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

  // Request microphone permissions
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'microphone') {
      console.log('🎤 Microphone permission requested - granting access');
      callback(true);
    } else {
      callback(false);
    }
  });

  mainWindow.loadFile('index.html');

  console.log('✅ Storme app started successfully!');
  console.log('🎤 Ready for demo - use the UI to test commands');
  
  // Initialize AI and system components
  initializeStorme();
}

async function initializeStorme() {
  try {
    console.log('🚀 Initializing Storme AI components...');
    
    // Initialize Gemini AI client
    geminiClient = new GeminiClient();
    console.log('✅ Gemini AI client initialized');
    
    // Initialize system controller
    systemController = new SystemController();
    console.log('✅ System controller initialized');
    
    // Initialize voice pipeline
    console.log('🔧 Creating VoicePipeline instance...');
    voicePipeline = new VoicePipeline();
    console.log('✅ VoicePipeline instance created');
    
    console.log('🔧 Initializing voice pipeline...');
    await voicePipeline.initialize();
    console.log('✅ Voice pipeline initialized');
    
    console.log('🔧 Starting voice pipeline...');
    voicePipeline.start();
    console.log('✅ Voice pipeline started');
    
    console.log('🧠 Storme AI is ready for intelligent command processing!');
    console.log('🎤 Continuous listening mode: Just speak any command!');
    
  } catch (error) {
    console.error('❌ Failed to initialize Storme AI:', error);
    console.error('❌ Error details:', error.stack);
    
    // Fallback: show error in UI
    mainWindow.webContents.executeJavaScript(`
      document.body.innerHTML = '<div style="padding: 20px; color: red;">Failed to initialize Storme AI: ${error.message}</div>';
    `);
  }
}

// IPC handlers for UI communication
ipcMain.handle('test-command', async (event, command) => {
  try {
    console.log('🧠 Processing command with Gemini AI:', command);
    
    if (!geminiClient || !systemController) {
      return {
        success: false,
        message: 'Storme AI components not initialized yet. Please wait...'
      };
    }
    
    // Process with Gemini AI
    const intent = await geminiClient.processUserIntent(command);
    console.log('🤖 Gemini AI response:', intent);
    
    // Execute the action if needed
    let executionResult = null;
    if (intent.action && intent.action !== 'none') {
      console.log('🎯 Executing action:', intent.action, intent.parameters);
      executionResult = await systemController.executeAction(intent.action, intent.parameters);
      console.log('✅ Action executed:', executionResult);
    }
    
    // Prepare response
    const response = {
      success: true,
      message: intent.response,
      data: {
        command,
        intent: intent.action,
        parameters: intent.parameters,
        executionResult,
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('✅ Command processed successfully:', response);
    return response;
    
  } catch (error) {
    console.error('❌ Command processing error:', error);
    return { 
      success: false, 
      message: `Error processing command: ${error.message}`,
      data: { command, error: error.message }
    };
  }
});

ipcMain.handle('get-status', async () => {
  try {
    const status = {
      initialized: !!(geminiClient && systemController),
      listening: voicePipeline?.isListening() || false,
      platform: process.platform,
      mode: 'ai-enhanced',
      aiReady: !!geminiClient,
      systemReady: !!systemController
    };
    
    console.log('📊 Status requested:', status);
    return status;
  } catch (error) {
    console.error('❌ Status error:', error);
    return {
      initialized: false,
      listening: false,
      platform: process.platform,
      error: error.message
    };
  }
});

ipcMain.handle('start-voice-listening', async () => {
  try {
    if (!voicePipeline) {
      console.log('🔧 Voice pipeline not initialized, creating...');
      await initializeStorme();
    }
    
    if (voicePipeline && !voicePipeline.isListening()) {
      console.log('🔧 Starting voice listening...');
      voicePipeline.start();
      return { success: true, message: 'Voice listening started' };
    } else if (voicePipeline && voicePipeline.isListening()) {
      return { success: true, message: 'Voice listening already active' };
    } else {
      return { success: false, message: 'Failed to initialize voice pipeline' };
    }
  } catch (error) {
    console.error('❌ Start voice listening error:', error);
    return { success: false, message: error.message };
  }
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
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});