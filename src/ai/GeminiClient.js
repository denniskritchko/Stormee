const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiClient {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async processUserIntent(userMessage, conversationHistory = []) {
    try {
      console.log('🧠 Processing with Gemini:', userMessage);
      
      const prompt = this.buildPrompt(userMessage, conversationHistory);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('🤖 Gemini response:', text);
      
      try {
        // Clean the response to extract JSON from markdown code blocks
        let cleanText = text.trim();
        
        // Remove markdown code blocks if present
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        console.log('🧹 Cleaned JSON:', cleanText);
        return JSON.parse(cleanText);
      } catch (parseError) {
        console.warn('⚠️ Failed to parse JSON response, using fallback');
        console.warn('Raw response:', text);
        console.warn('Parse error:', parseError.message);
        return this.createFallbackResponse(userMessage, text);
      }
    } catch (error) {
      console.error('❌ Gemini processing error:', error);
      return this.createErrorResponse(error.message);
    }
  }

  buildPrompt(userMessage, conversationHistory) {
    const historyContext = conversationHistory.length > 0 
      ? `\n\nConversation History:\n${conversationHistory.map(h => `${h.role}: ${h.content}`).join('\n')}`
      : '';

    return `You are Storme, an AI computer assistant that can control the user's computer through voice commands. You can:

1. Open applications and websites
2. Send emails and manage calendar
3. Take screenshots and manage files
4. Control browser and system operations
5. Provide information and assistance

${historyContext}

User's voice command: "${userMessage}"

Analyze the user's intent and respond with a JSON object containing:
- "action": the system action to perform (app, system, email, calendar, document, browser, time, or none)
- "parameters": object with action-specific parameters
- "response": natural language response to the user
- "requiresConfirmation": boolean if the action needs user confirmation
- "confidence": 0-1 confidence score

Available actions:
- "app": { "name": "application name" }
- "system": { "command": "screenshot", "path": "optional path" }
- "email": { "operation": "compose|read|send", "to": "email", "subject": "subject", "body": "body" }
- "calendar": { "operation": "check|create", "title": "event title", "date": "date" }
- "document": { "operation": "open|search", "path": "file path", "query": "search query" }
- "browser": { "operation": "navigate|search", "url": "website", "query": "search term" }
- "time": {} (get current time)

Respond with valid JSON only:`;
  }

  createFallbackResponse(userMessage, geminiText) {
    // Enhanced keyword-based fallback with more flexibility
    const lowerMessage = userMessage.toLowerCase();
    
    // Screenshot detection
    if (lowerMessage.includes('screenshot') || lowerMessage.includes('picture') || lowerMessage.includes('capture')) {
      return {
        action: 'system',
        parameters: { command: 'screenshot' },
        response: 'Taking a screenshot now.',
        requiresConfirmation: false
      };
    }
    
    // Email detection - much more flexible
    if (lowerMessage.includes('email') || lowerMessage.includes('send') || lowerMessage.includes('compose') || 
        lowerMessage.includes('write') || lowerMessage.includes('message') || lowerMessage.includes('mail')) {
      // Extract email details from the message
      const emailMatch = userMessage.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const to = emailMatch ? emailMatch[1] : '';
      const subject = this.extractSubject(userMessage);
      const body = this.extractBody(userMessage);
      
      return {
        action: 'email',
        parameters: { 
          operation: 'compose',
          to: to,
          subject: subject,
          body: body
        },
        response: `I'll help you with the email${to ? ` to ${to}` : ''}${subject ? ` about ${subject}` : ''}${body ? ` with content: ${body}` : ''}.`,
        requiresConfirmation: false
      };
    }
    
    // App detection - much more flexible
    if (lowerMessage.includes('open') || lowerMessage.includes('launch') || lowerMessage.includes('start')) {
      const app = this.extractAppName(userMessage);
      return {
        action: 'app',
        parameters: { app: app || 'notepad' },
        response: `Opening ${app || 'application'}.`,
        requiresConfirmation: false
      };
    }
    
    // Time detection
    if (lowerMessage.includes('time') || lowerMessage.includes('clock') || lowerMessage.includes('hour')) {
      return {
        action: 'time',
        parameters: {},
        response: 'Let me check the current time for you.',
        requiresConfirmation: false
      };
    }
    
    // Document detection
    if (lowerMessage.includes('document') || lowerMessage.includes('file') || lowerMessage.includes('create')) {
      return {
        action: 'document',
        parameters: { operation: 'create' },
        response: 'I\'ll help you create a document.',
        requiresConfirmation: false
      };
    }
    
    return {
      action: 'none',
      parameters: {},
      response: "I didn't understand that. Could you please rephrase?",
      requiresConfirmation: false
    };
  }

  extractSubject(message) {
    // Try to extract subject from common patterns
    const patterns = [
      /about\s+(.+)/i,
      /subject\s+(.+)/i,
      /regarding\s+(.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return '';
  }

  extractBody(message) {
    // Try to extract body content from common patterns
    const patterns = [
      /write\s+(.+)/i,
      /say\s+(.+)/i,
      /content\s+(.+)/i,
      /body\s+(.+)/i,
      /message\s+(.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return '';
  }

  extractAppName(message) {
    const lowerMessage = message.toLowerCase();
    
    // More comprehensive app detection
    const appMappings = {
      'chrome': ['chrome', 'google chrome', 'browser'],
      'firefox': ['firefox', 'mozilla'],
      'notepad': ['notepad', 'text editor', 'editor'],
      'calculator': ['calculator', 'calc'],
      'word': ['word', 'microsoft word', 'document'],
      'excel': ['excel', 'spreadsheet'],
      'gmail': ['gmail', 'google mail'],
      'outlook': ['outlook', 'microsoft outlook'],
      'email': ['email', 'mail'],
      'explorer': ['explorer', 'file explorer', 'files']
    };
    
    for (const [app, keywords] of Object.entries(appMappings)) {
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          return app;
        }
      }
    }
    
    return null;
  }

  createErrorResponse(errorMessage) {
    return {
      action: 'none',
      parameters: {},
      response: `I'm having trouble processing your request: ${errorMessage}`,
      requiresConfirmation: false
    };
  }
}

module.exports = GeminiClient;
