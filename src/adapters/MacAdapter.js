const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs-extra');
const path = require('path');

// Conditional robotjs import for macOS only
let robot = null;
if (process.platform === 'darwin') {
  try {
    robot = require('robotjs');
  } catch (error) {
    console.warn('⚠️ robotjs not available, using fallback methods');
  }
}

const execAsync = promisify(exec);

class MacAdapter {
  constructor() {
    this.platform = 'macos';
    console.log('🍎 macOS adapter initialized');
  }

  async openApp(appName) {
    try {
      console.log(`🚀 Opening ${appName} on macOS`);
      
      // Common macOS app mappings
      const appMappings = {
        'chrome': 'Google Chrome',
        'firefox': 'Firefox',
        'safari': 'Safari',
        'calculator': 'Calculator',
        'textedit': 'TextEdit',
        'finder': 'Finder',
        'terminal': 'Terminal',
        'mail': 'Mail',
        'calendar': 'Calendar',
        'notes': 'Notes'
      };

      const app = appMappings[appName.toLowerCase()] || appName;
      
      await execAsync(`open -a "${app}"`);
      
      console.log(`✅ Successfully opened ${appName}`);
    } catch (error) {
      console.error(`❌ Failed to open ${appName}:`, error);
      throw error;
    }
  }

  async takeScreenshot() {
    try {
      console.log('📸 Taking screenshot on macOS');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}.png`;
      const filepath = path.join(process.cwd(), 'screenshots', filename);
      
      // Ensure screenshots directory exists
      await fs.ensureDir(path.dirname(filepath));
      
      // Use macOS built-in screenshot command
      await execAsync(`screencapture "${filepath}"`);
      
      console.log(`✅ Screenshot saved: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('❌ Failed to take screenshot:', error);
      throw error;
    }
  }

  async getActiveWindow() {
    try {
      const { stdout } = await execAsync(
        'osascript -e "tell application \\"System Events\\" to get name of first application process whose frontmost is true"'
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
      if (robot) {
        robot.typeString(keys);
        console.log('✅ Keys sent successfully');
      } else {
        console.log('⚠️ robotjs not available, using fallback method');
        // Fallback: use AppleScript for typing
        await execAsync(`osascript -e 'tell application "System Events" to keystroke "${keys}"'`);
        console.log('✅ Keys sent via AppleScript');
      }
    } catch (error) {
      console.error('❌ Failed to send keys:', error);
      throw error;
    }
  }

  async clickElement(x, y) {
    try {
      console.log(`🖱️ Clicking at position (${x}, ${y})`);
      if (robot) {
        robot.moveMouse(x, y);
        robot.mouseClick();
        console.log('✅ Click executed successfully');
      } else {
        console.log('⚠️ robotjs not available, using fallback method');
        // Fallback: use AppleScript for clicking
        await execAsync(`osascript -e 'tell application "System Events" to click at {${x}, ${y}}'`);
        console.log('✅ Click executed via AppleScript');
      }
    } catch (error) {
      console.error('❌ Failed to click element:', error);
      throw error;
    }
  }

  async manageWindows() {
    try {
      console.log('🪟 Managing macOS windows...');
      
      // Get all applications
      const { stdout } = await execAsync(
        'osascript -e "tell application \\"System Events\\" to get name of every application process whose background only is false"'
      );
      
      console.log('📋 Current applications:', stdout);
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
      const { stdout } = await execAsync('ls -la');
      console.log('📋 Files in current directory:', stdout);
      
      return stdout;
    } catch (error) {
      console.error('❌ Failed to perform file operations:', error);
      throw error;
    }
  }
}

module.exports = MacAdapter;
