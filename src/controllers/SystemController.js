const WindowsAdapter = require('../adapters/WindowsAdapter');
const MacAdapter = require('../adapters/MacAdapter');

class SystemController {
  constructor() {
    this.adapter = process.platform === 'win32' 
      ? new WindowsAdapter() 
      : new MacAdapter();
    
    // Email context for conversational composition
    this.emailContext = {
      isComposing: false,
      to: null,
      subject: null,
      body: null,
      lastComposeUrl: null
    };
  }

  async executeAction(action, parameters = {}) {
    try {
      console.log(`🎯 Executing action: ${action}`, parameters);
      
      switch (action) {
        case 'app':
          return await this.handleAppLaunch(parameters);
        
        case 'system':
          return await this.handleSystemCommand(parameters);
        
        case 'time':
          return await this.getCurrentTime();
        
        case 'email':
          return await this.handleEmailOperation(parameters);
        
        case 'calendar':
          return await this.handleCalendarOperation(parameters);
        
        case 'document':
          return await this.handleDocumentOperation(parameters);
        
        case 'browser':
          return await this.handleBrowserOperation(parameters);
        
        default:
          return {
            success: false,
            error: `Unknown action: ${action}`,
            message: `I don't know how to handle ${action}`
          };
      }
    } catch (error) {
      console.error(`❌ Error executing action ${action}:`, error);
      return {
        success: false,
        error: error.message,
        message: `Failed to execute ${action}`
      };
    }
  }

  async handleAppLaunch(parameters) {
    const appName = parameters.app;
    if (!appName) {
      return {
        success: false,
        error: 'No app specified',
        message: 'Please specify which application to open'
      };
    }

    await this.adapter.openApp(appName);
    return {
      success: true,
      message: `Opened ${appName}`,
      data: { app: appName }
    };
  }

  async handleSystemCommand(parameters) {
    const command = parameters.command;
    
    switch (command) {
      case 'screenshot':
        const screenshotPath = await this.adapter.takeScreenshot();
        return {
          success: true,
          message: `Screenshot saved to ${screenshotPath}`,
          data: { path: screenshotPath }
        };
      
      case 'type':
        const text = parameters.text;
        await this.adapter.sendKeys(text);
        return {
          success: true,
          message: `Typed: ${text}`,
          data: { text }
        };
      
      case 'click':
        const { x, y } = parameters;
        await this.adapter.clickElement(x, y);
        return {
          success: true,
          message: `Clicked at position (${x}, ${y})`,
          data: { x, y }
        };
      
      default:
        return {
          success: false,
          error: `Unknown system command: ${command}`,
          message: `I don't know how to execute ${command}`
        };
    }
  }

  async getCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const dateString = now.toLocaleDateString();
    
    return {
      success: true,
      message: `Current time: ${timeString}, Date: ${dateString}`,
      data: {
        time: timeString,
        date: dateString,
        timestamp: now.toISOString()
      }
    };
  }

  async handleEmailOperation(parameters) {
    try {
      console.log('📧 Email operation requested:', parameters);
      
      const operation = parameters.operation;
      const to = parameters.to;
      const subject = parameters.subject;
      const body = parameters.body;
      const searchQuery = parameters.searchQuery;
      
      // Handle conversational email composition
      if (operation === 'compose') {
        return await this.handleConversationalEmail(to, subject, body);
      }
      
      switch (operation) {
        case 'send':
          return await this.sendEmail(to, subject, body);
        
        case 'read':
          return await this.readEmails(searchQuery);
        
        case 'search':
          return await this.searchEmails(searchQuery);
        
        case 'reply':
          return await this.replyToEmail(parameters.messageId, body);
        
        case 'draft':
          return await this.createDraft(to, subject, body);
        
        case 'open':
          // Handle "open email" as compose
          return await this.handleConversationalEmail(to, subject, body);
        
        default:
          return {
            success: false,
            message: `Unknown email operation: ${operation}`,
            data: parameters
          };
      }
    } catch (error) {
      console.error('❌ Email operation error:', error);
      return {
        success: false,
        message: `Email operation failed: ${error.message}`,
        data: parameters
      };
    }
  }

  async handleConversationalEmail(to, subject, body) {
    try {
      console.log('💬 Handling conversational email composition');
      
      // Update email context with new information
      if (to) this.emailContext.to = to;
      if (subject) this.emailContext.subject = subject;
      if (body) this.emailContext.body = body;
      
      // If this is the first time (no context), open Gmail immediately
      if (!this.emailContext.isComposing) {
        console.log('📧 Opening Gmail compose for new email...');
        this.emailContext.isComposing = true;
        
        // Open Gmail with whatever details we have
        const result = await this.openGmailCompose(
          this.emailContext.to, 
          this.emailContext.subject, 
          this.emailContext.body
        );
        
        // Ask for missing details
        const prompt = this.getEmailPrompt();
        return {
          success: true,
          message: `${result.message} ${prompt}`,
          data: { 
            to: this.emailContext.to,
            subject: this.emailContext.subject,
            body: this.emailContext.body,
            status: 'gmail_opened',
            gmailResult: result.data
          }
        };
      }
      
      // If we're already composing, check if we have enough info
      const hasRecipient = this.emailContext.to && this.emailContext.to.trim() !== '';
      const hasSubject = this.emailContext.subject && this.emailContext.subject.trim() !== '';
      
      if (hasRecipient && hasSubject) {
        // We have enough info, update Gmail
        console.log('✅ Email details complete, updating Gmail...');
        return await this.openGmailCompose(
          this.emailContext.to, 
          this.emailContext.subject, 
          this.emailContext.body
        );
      }
      
      // Still need more details
      return {
        success: true,
        message: this.getEmailPrompt(),
        data: { 
          to: this.emailContext.to,
          subject: this.emailContext.subject,
          body: this.emailContext.body,
          status: 'waiting_for_details'
        }
      };
    } catch (error) {
      console.error('❌ Conversational email error:', error);
      return {
        success: false,
        message: `Email composition failed: ${error.message}`,
        data: { to, subject, body }
      };
    }
  }

  getEmailPrompt() {
    const hasRecipient = this.emailContext.to && this.emailContext.to.trim() !== '';
    const hasSubject = this.emailContext.subject && this.emailContext.subject.trim() !== '';
    
    if (hasRecipient && hasSubject) {
      return "Email details complete!";
    }
    
    // More conversational prompts based on what we have
    if (!hasRecipient && !hasSubject) {
      return "Now, who should I send this email to, and what's the subject?";
    } else if (!hasRecipient && hasSubject) {
      return `Great! The subject is "${this.emailContext.subject}". Who should I send this email to?`;
    } else if (hasRecipient && !hasSubject) {
      return `Perfect! I'll send it to ${this.emailContext.to}. What should the subject be?`;
    }
    
    return "I need more details for the email. Please provide the missing information.";
  }

  resetEmailContext() {
    this.emailContext = {
      isComposing: false,
      to: null,
      subject: null,
      body: null,
      lastComposeUrl: null
    };
    console.log('🔄 Email context reset');
  }

  async composeEmail(to, subject, body) {
    try {
      console.log(`📝 Starting interactive email composition`);
      
      // Ask user which email service to use
      const emailService = await this.askEmailService();
      
      if (emailService === 'gmail') {
        return await this.openGmailCompose(to, subject, body);
      } else if (emailService === 'outlook') {
        return await this.openOutlookCompose(to, subject, body);
      } else {
        return {
          success: false,
          message: 'Email service selection cancelled',
          data: { to, subject, body }
        };
      }
    } catch (error) {
      console.error('❌ Failed to compose email:', error);
      return {
        success: false,
        message: `Failed to compose email: ${error.message}`,
        data: { to, subject }
      };
    }
  }

  async askEmailService() {
    // For now, default to Gmail
    // In a full implementation, this would show a UI dialog
    console.log('📧 Which email service would you like to use?');
    console.log('1. Gmail (gmail.com)');
    console.log('2. Outlook (outlook.com)');
    console.log('Defaulting to Gmail for demo...');
    return 'gmail';
  }

  async openGmailCompose(to, subject, body) {
    try {
      console.log(`📧 Opening Gmail compose in Chrome`);
      
      // Open Chrome with Gmail compose URL
      const composeUrl = this.buildGmailComposeUrl(to, subject, body);
      console.log(`🌐 Gmail URL: ${composeUrl}`);
      
      // Use start command to open Chrome with URL
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      await execAsync(`start chrome "${composeUrl}"`);
      
      return {
        success: true,
        message: `Opening Gmail compose in Chrome. To: ${to}, Subject: ${subject}`,
        data: { 
          to, 
          subject, 
          body, 
          service: 'gmail',
          url: composeUrl,
          status: 'opening_browser'
        }
      };
    } catch (error) {
      console.error('❌ Failed to open Gmail:', error);
      return {
        success: false,
        message: `Failed to open Gmail: ${error.message}`,
        data: { to, subject }
      };
    }
  }

  async openOutlookCompose(to, subject, body) {
    try {
      console.log(`📧 Opening Outlook compose in Chrome`);
      
      // Open Chrome with Outlook compose URL
      const composeUrl = this.buildOutlookComposeUrl(to, subject, body);
      await this.adapter.openApp(`chrome --new-window "${composeUrl}"`);
      
      return {
        success: true,
        message: `Opening Outlook compose in Chrome. To: ${to}, Subject: ${subject}`,
        data: { 
          to, 
          subject, 
          body, 
          service: 'outlook',
          url: composeUrl,
          status: 'opening_browser'
        }
      };
    } catch (error) {
      console.error('❌ Failed to open Outlook:', error);
      return {
        success: false,
        message: `Failed to open Outlook: ${error.message}`,
        data: { to, subject }
      };
    }
  }

  buildGmailComposeUrl(to, subject, body) {
    const params = new URLSearchParams();
    if (to) params.append('to', to);
    if (subject) params.append('subject', subject);
    if (body) params.append('body', body);
    
    return `https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`;
  }

  buildOutlookComposeUrl(to, subject, body) {
    const params = new URLSearchParams();
    if (to) params.append('to', to);
    if (subject) params.append('subject', subject);
    if (body) params.append('body', body);
    
    return `https://outlook.live.com/mail/0/deeplink/compose?${params.toString()}`;
  }

  async sendEmail(to, subject, body) {
    try {
      console.log(`📤 Starting interactive email sending`);
      
      // Use the same interactive compose flow
      return await this.composeEmail(to, subject, body);
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return {
        success: false,
        message: `Failed to send email: ${error.message}`,
        data: { to, subject }
      };
    }
  }

  async readEmails(searchQuery = '') {
    try {
      console.log(`📖 Reading emails${searchQuery ? ` with query: ${searchQuery}` : ''}`);
      
      // For now, return a success message
      // In a full implementation, this would use Gmail API
      return {
        success: true,
        message: `Read emails${searchQuery ? ` matching: ${searchQuery}` : ''}`,
        data: { 
          searchQuery, 
          emails: [
            { from: 'example@email.com', subject: 'Sample Email', date: new Date().toISOString() }
          ],
          totalCount: 1
        }
      };
    } catch (error) {
      console.error('❌ Failed to read emails:', error);
      return {
        success: false,
        message: `Failed to read emails: ${error.message}`,
        data: { searchQuery }
      };
    }
  }

  async searchEmails(searchQuery) {
    try {
      console.log(`🔍 Searching emails: ${searchQuery}`);
      
      // For now, return a success message
      // In a full implementation, this would use Gmail API
      return {
        success: true,
        message: `Found emails matching: ${searchQuery}`,
        data: { 
          searchQuery, 
          results: [
            { from: 'example@email.com', subject: 'Matching Email', date: new Date().toISOString() }
          ],
          totalFound: 1
        }
      };
    } catch (error) {
      console.error('❌ Failed to search emails:', error);
      return {
        success: false,
        message: `Failed to search emails: ${error.message}`,
        data: { searchQuery }
      };
    }
  }

  async replyToEmail(messageId, body) {
    try {
      console.log(`↩️ Replying to email: ${messageId}`);
      
      // For now, return a success message
      // In a full implementation, this would use Gmail API
      return {
        success: true,
        message: `Reply sent to email: ${messageId}`,
        data: { messageId, body, status: 'replied' }
      };
    } catch (error) {
      console.error('❌ Failed to reply to email:', error);
      return {
        success: false,
        message: `Failed to reply to email: ${error.message}`,
        data: { messageId, body }
      };
    }
  }

  async createDraft(to, subject, body) {
    try {
      console.log(`📝 Creating email draft to: ${to}`);
      
      // For now, return a success message
      // In a full implementation, this would use Gmail API
      return {
        success: true,
        message: `Email draft created for: ${to}`,
        data: { to, subject, body, status: 'draft' }
      };
    } catch (error) {
      console.error('❌ Failed to create draft:', error);
      return {
        success: false,
        message: `Failed to create draft: ${error.message}`,
        data: { to, subject }
      };
    }
  }

  async handleCalendarOperation(parameters) {
    // Placeholder for calendar operations
    // This would integrate with Microsoft Graph API or Google Calendar API
    console.log('📅 Calendar operation requested:', parameters);
    
    return {
      success: true,
      message: 'Calendar functionality will be implemented with Microsoft Graph API',
      data: parameters
    };
  }

  async handleDocumentOperation(parameters) {
    try {
      console.log('📄 Document operation requested:', parameters);
      
      const operation = parameters.operation;
      const filePath = parameters.filePath;
      const searchTerm = parameters.searchTerm;
      const content = parameters.content;
      
      switch (operation) {
        case 'open':
          return await this.openDocument(filePath);
        
        case 'search':
          return await this.searchFiles(searchTerm);
        
        case 'create':
          return await this.createDocument(filePath, content);
        
        case 'list':
          return await this.listFiles(parameters.directory || process.cwd());
        
        case 'delete':
          return await this.deleteFile(filePath);
        
        case 'copy':
          return await this.copyFile(filePath, parameters.destination);
        
        case 'move':
          return await this.moveFile(filePath, parameters.destination);
        
        default:
          return {
            success: false,
            message: `Unknown document operation: ${operation}`,
            data: parameters
          };
      }
    } catch (error) {
      console.error('❌ Document operation error:', error);
      return {
        success: false,
        message: `Document operation failed: ${error.message}`,
        data: parameters
      };
    }
  }

  async openDocument(filePath) {
    try {
      console.log(`📂 Opening document: ${filePath}`);
      
      // Use Windows adapter to open the file
      await this.adapter.openApp(filePath);
      
      return {
        success: true,
        message: `Opened document: ${filePath}`,
        data: { filePath }
      };
    } catch (error) {
      console.error('❌ Failed to open document:', error);
      return {
        success: false,
        message: `Failed to open document: ${error.message}`,
        data: { filePath }
      };
    }
  }

  async searchFiles(searchTerm) {
    try {
      console.log(`🔍 Searching for files: ${searchTerm}`);
      
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      // Use Windows dir command to search for files
      const { stdout } = await execAsync(`dir /s /b *${searchTerm}*`);
      const files = stdout.split('\n').filter(line => line.trim());
      
      return {
        success: true,
        message: `Found ${files.length} files matching "${searchTerm}"`,
        data: { 
          searchTerm, 
          files: files.slice(0, 20), // Limit to first 20 results
          totalFound: files.length
        }
      };
    } catch (error) {
      console.error('❌ File search error:', error);
      return {
        success: false,
        message: `File search failed: ${error.message}`,
        data: { searchTerm }
      };
    }
  }

  async createDocument(filePath, content = '') {
    try {
      console.log(`📝 Creating document: ${filePath}`);
      
      const fs = require('fs');
      const path = require('path');
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Create the file with content
      fs.writeFileSync(filePath, content);
      
      return {
        success: true,
        message: `Created document: ${filePath}`,
        data: { filePath, content }
      };
    } catch (error) {
      console.error('❌ Failed to create document:', error);
      return {
        success: false,
        message: `Failed to create document: ${error.message}`,
        data: { filePath }
      };
    }
  }

  async listFiles(directory) {
    try {
      console.log(`📁 Listing files in: ${directory}`);
      
      const fs = require('fs');
      const files = fs.readdirSync(directory);
      
      return {
        success: true,
        message: `Found ${files.length} items in ${directory}`,
        data: { 
          directory, 
          files: files.slice(0, 50), // Limit to first 50 items
          totalItems: files.length
        }
      };
    } catch (error) {
      console.error('❌ Failed to list files:', error);
      return {
        success: false,
        message: `Failed to list files: ${error.message}`,
        data: { directory }
      };
    }
  }

  async deleteFile(filePath) {
    try {
      console.log(`🗑️ Deleting file: ${filePath}`);
      
      const fs = require('fs');
      fs.unlinkSync(filePath);
      
      return {
        success: true,
        message: `Deleted file: ${filePath}`,
        data: { filePath }
      };
    } catch (error) {
      console.error('❌ Failed to delete file:', error);
      return {
        success: false,
        message: `Failed to delete file: ${error.message}`,
        data: { filePath }
      };
    }
  }

  async copyFile(source, destination) {
    try {
      console.log(`📋 Copying file: ${source} → ${destination}`);
      
      const fs = require('fs');
      fs.copyFileSync(source, destination);
      
      return {
        success: true,
        message: `Copied file: ${source} → ${destination}`,
        data: { source, destination }
      };
    } catch (error) {
      console.error('❌ Failed to copy file:', error);
      return {
        success: false,
        message: `Failed to copy file: ${error.message}`,
        data: { source, destination }
      };
    }
  }

  async moveFile(source, destination) {
    try {
      console.log(`📦 Moving file: ${source} → ${destination}`);
      
      const fs = require('fs');
      fs.renameSync(source, destination);
      
      return {
        success: true,
        message: `Moved file: ${source} → ${destination}`,
        data: { source, destination }
      };
    } catch (error) {
      console.error('❌ Failed to move file:', error);
      return {
        success: false,
        message: `Failed to move file: ${error.message}`,
        data: { source, destination }
      };
    }
  }

  async handleBrowserOperation(parameters) {
    // Placeholder for browser operations
    // This would use Puppeteer for web automation
    console.log('🌐 Browser operation requested:', parameters);
    
    return {
      success: true,
      message: 'Browser functionality will be implemented with Puppeteer',
      data: parameters
    };
  }
}

module.exports = SystemController;
