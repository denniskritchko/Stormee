const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const screenshot = require('screenshot-desktop');

const execAsync = promisify(exec);

class WindowsAdapter {
  constructor() {
    this.platform = 'windows';
    console.log('🪟 Windows adapter initialized');
  }

  async openApp(appName) {
    try {
      console.log(`🚀 Opening ${appName} on Windows`);
      
      // Check if it's a Chrome command with URL
      if (appName.includes('chrome --new-window')) {
        console.log(`🌐 Opening Chrome with URL: ${appName}`);
        await execAsync(appName);
        console.log(`✅ Successfully opened Chrome with URL`);
        return;
      }
      
      // Common Windows app mappings
      const appMappings = {
        'chrome': 'chrome',
        'firefox': 'firefox',
        'notepad': 'notepad',
        'calculator': 'calc',
        'word': 'winword',
        'excel': 'excel',
        'powerpoint': 'powerpnt',
        'outlook': 'outlook',
        'explorer': 'explorer'
      };

      const command = appMappings[appName.toLowerCase()] || appName;
      
      // Try different methods to open the app
      try {
        await execAsync(`start "" "${command}"`);
      } catch (error) {
        // Fallback to direct command
        await execAsync(`"${command}.exe"`);
      }
      
      console.log(`✅ Successfully opened ${appName}`);
    } catch (error) {
      console.error(`❌ Failed to open ${appName}:`, error);
      throw error;
    }
  }

  async takeScreenshot() {
    try {
      console.log('📸 Taking real screenshot on Windows');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}.png`;
      const filepath = path.join(process.cwd(), 'screenshots', filename);
      
      // Create screenshots directory if it doesn't exist
      const screenshotsDir = path.dirname(filepath);
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      
      // Take actual screenshot using screenshot-desktop
      const img = await screenshot({ format: 'png' });
      fs.writeFileSync(filepath, img);
      
      console.log(`✅ Real screenshot saved: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('❌ Failed to take screenshot:', error);
      
      // Fallback to mock screenshot if real one fails
      console.log('⚠️ Falling back to mock screenshot');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}.txt`;
      const filepath = path.join(process.cwd(), 'screenshots', filename);
      
      const screenshotsDir = path.dirname(filepath);
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      
      const mockScreenshot = `Screenshot taken at ${new Date().toISOString()}\nWindow: ${await this.getActiveWindow()}\nNote: Real screenshot failed, using mock data`;
      fs.writeFileSync(filepath, mockScreenshot);
      
      console.log(`✅ Mock screenshot saved: ${filepath}`);
      return filepath;
    }
  }

  async getActiveWindow() {
    try {
      const { stdout } = await execAsync(
        'powershell "Get-Process | Where-Object {$_.MainWindowTitle -ne \'\'} | Select-Object -First 1 MainWindowTitle"'
      );
      return stdout.trim();
    } catch (error) {
      console.error('❌ Failed to get active window:', error);
      return 'Unknown window';
    }
  }

  async sendKeys(keys) {
    try {
      console.log(`⌨️ Typing: ${keys}`);
      // For demo purposes, just log the keys
      console.log('✅ Keys logged (demo mode)');
    } catch (error) {
      console.error('❌ Failed to send keys:', error);
      throw error;
    }
  }

  async clickElement(x, y) {
    try {
      console.log(`🖱️ Clicking at position (${x}, ${y})`);
      // For demo purposes, just log the click
      console.log('✅ Click logged (demo mode)');
    } catch (error) {
      console.error('❌ Failed to click element:', error);
      throw error;
    }
  }

  async manageWindows() {
    try {
      console.log('🪟 Managing Windows...');
      
      // Get all windows
      const { stdout } = await execAsync(
        'powershell "Get-Process | Where-Object {$_.MainWindowTitle -ne \'\'} | Select-Object ProcessName, MainWindowTitle"'
      );
      
      console.log('📋 Current windows:', stdout);
      return stdout;
    } catch (error) {
      console.error('❌ Failed to manage windows:', error);
      throw error;
    }
  }

  async fileOperations() {
    try {
      console.log('📁 Performing file operations...');
      
      // List files in current directory
      const { stdout } = await execAsync('dir /b');
      console.log('📋 Files in current directory:', stdout);
      
      return stdout;
    } catch (error) {
      console.error('❌ Failed to perform file operations:', error);
      throw error;
    }
  }
}

module.exports = WindowsAdapter;
