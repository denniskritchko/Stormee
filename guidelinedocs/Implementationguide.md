# Storme MVP Implementation Guide
## Step-by-Step Development Plan for AI Computer Assistant

### Overview
This guide will help you implement Storme - an always-listening AI assistant that controls your computer through natural conversation using ElevenLabs TTS and Gemini AI.

---

## Phase 1: Core Voice Pipeline Setup (Week 1-2)

### Step 1: Install Voice & AI Dependencies

Add these packages to your `package.json`:

```bash
npm install @picovoice/porcupine-node @deepgram/sdk google-generativeai elevenlabs-node
npm install --save-dev @types/node
```

**Updated package.json dependencies:**
```json
{
  "dependencies": {
    "@picovoice/porcupine-node": "^3.0.2",
    "@deepgram/sdk": "^3.0.0", 
    "google-generativeai": "^0.2.1",
    "elevenlabs-node": "^1.3.0",
    "robotjs": "^0.6.0",
    "screenshot-desktop": "^1.15.0",
    "@microsoft/microsoft-graph-client": "^3.0.7",
    "googleapis": "^128.0.0"
  }
}
```

### Step 2: Environment Configuration

Create `.env` file in your project root:
```env
# AI APIs
GEMINI_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# Voice Settings
PORCUPINE_ACCESS_KEY=your_picovoice_access_key_here
ELEVENLABS_VOICE_ID=your_adam_voice_id_here

# Email/Calendar (optional for MVP)
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
```

### Step 3: Create Voice Pipeline Structure

Create the voice processing modules:

```
src/
├── voice/
│   ├── WakeWordDetector.ts
│   ├── SpeechToText.ts
│   ├── TextToSpeech.ts
│   └── VoicePipeline.ts
├── ai/
│   ├── GeminiClient.ts
│   └── TaskProcessor.ts
├── controllers/
│   ├── SystemController.ts
│   ├── EmailController.ts
│   ├── CalendarController.ts
│   └── BrowserController.ts
└── adapters/
    ├── WindowsAdapter.ts
    ├── MacAdapter.ts
    └── SystemAdapter.ts
```

---

## Phase 2: Voice Pipeline Implementation (Week 2-3)

### Step 4: Wake Word Detection

Create `src/voice/WakeWordDetector.ts`:
```typescript
import { Porcupine } from '@picovoice/porcupine-node';
import { EventEmitter } from 'events';

export class WakeWordDetector extends EventEmitter {
  private porcupine: Porcupine;
  private isListening: boolean = false;

  constructor() {
    super();
    this.porcupine = new Porcupine(
      process.env.PORCUPINE_ACCESS_KEY!,
      ['hey storme'] // Wake word phrase
    );
  }

  startListening() {
    if (this.isListening) return;
    
    this.isListening = true;
    this.porcupine.on('wakeword', () => {
      this.emit('wakeword');
    });
    
    console.log('🎤 Wake word detection active - say "Hey Storme"');
  }

  stopListening() {
    this.isListening = false;
    this.porcupine.release();
  }
}
```

### Step 5: Speech-to-Text Integration

Create `src/voice/SpeechToText.ts`:
```typescript
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

export class SpeechToText {
  private deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    const response = await this.deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: 'nova-2',
        smart_format: true,
        language: 'en-US'
      }
    );
    
    return response.results?.channels[0]?.alternatives[0]?.transcript || '';
  }

  startLiveTranscription(onTranscript: (text: string) => void) {
    const connection = this.deepgram.listen.live({
      model: 'nova-2',
      smart_format: true,
      language: 'en-US'
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel.alternatives[0].transcript;
      if (transcript) {
        onTranscript(transcript);
      }
    });

    return connection;
  }
}
```

### Step 6: Text-to-Speech with ElevenLabs

Create `src/voice/TextToSpeech.ts`:
```typescript
import { ElevenLabs } from 'elevenlabs-node';

export class TextToSpeech {
  private elevenlabs: ElevenLabs;

  constructor() {
    this.elevenlabs = new ElevenLabs({
      apiKey: process.env.ELEVENLABS_API_KEY!
    });
  }

  async speak(text: string, voiceId?: string): Promise<void> {
    const voice = voiceId || process.env.ELEVENLABS_VOICE_ID;
    
    try {
      const audioStream = await this.elevenlabs.generate({
        voice: voice,
        text: text,
        model_id: 'eleven_monolingual_v1'
      });

      // Play audio through system speakers
      // You'll need to implement audio playback here
      console.log(`🔊 Speaking: ${text}`);
    } catch (error) {
      console.error('TTS Error:', error);
    }
  }
}
```

### Step 7: Gemini AI Integration

Create `src/ai/GeminiClient.ts`:
```typescript
import { GoogleGenerativeAI } from 'google-generativeai';

export class GeminiClient {
  private model: any;

  constructor() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async processUserIntent(userMessage: string): Promise<{
    action: string;
    parameters: any;
    response: string;
  }> {
    const prompt = `
    You are Storme, an AI assistant that can control computers through voice commands.
    
    User said: "${userMessage}"
    
    Determine what action they want and return a JSON response with:
    - action: "email", "calendar", "browser", "app", "system", "search", "none"
    - parameters: relevant data for the action
    - response: natural response to confirm what you'll do
    
    Examples:
    - "Send an email to John about the meeting" → {"action": "email", "parameters": {"to": "john", "subject": "Meeting", "body": "about the meeting"}, "response": "I'll send an email to John about the meeting."}
    - "Open Chrome" → {"action": "app", "parameters": {"app": "Chrome"}, "response": "Opening Chrome browser."}
    - "Take a screenshot" → {"action": "system", "parameters": {"command": "screenshot"}, "response": "Taking a screenshot now."}
    
    Respond ONLY with valid JSON.
    `;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      return JSON.parse(text);
    } catch (error) {
      return {
        action: 'none',
        parameters: {},
        response: "I didn't understand that. Could you please rephrase?"
      };
    }
  }
}
```

---

## Phase 3: System Control Implementation (Week 3-4)

### Step 8: System Control Adapters

Create `src/adapters/SystemAdapter.ts`:
```typescript
export interface SystemAdapter {
  openApp(appName: string): Promise<void>;
  takeScreenshot(): Promise<string>;
  getActiveWindow(): Promise<string>;
  sendKeys(keys: string): Promise<void>;
  clickElement(x: number, y: number): Promise<void>;
}
```

Create `src/adapters/WindowsAdapter.ts`:
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import * as robot from 'robotjs';
import { SystemAdapter } from './SystemAdapter';

const execAsync = promisify(exec);

export class WindowsAdapter implements SystemAdapter {
  async openApp(appName: string): Promise<void> {
    const command = `start "" "${appName}"`;
    await execAsync(command);
  }

  async takeScreenshot(): Promise<string> {
    const screenshot = robot.screen.capture();
    // Save screenshot and return path
    return 'screenshot.png';
  }

  async getActiveWindow(): Promise<string> {
    // Windows-specific window detection
    const { stdout } = await execAsync('powershell "Get-Process | Where-Object {$_.MainWindowTitle -ne \'\'} | Select-Object MainWindowTitle"');
    return stdout.trim();
  }

  async sendKeys(keys: string): Promise<void> {
    robot.typeString(keys);
  }

  async clickElement(x: number, y: number): Promise<void> {
    robot.moveMouse(x, y);
    robot.mouseClick();
  }
}
```

### Step 9: Core Controllers

Create `src/controllers/SystemController.ts`:
```typescript
import { WindowsAdapter } from '../adapters/WindowsAdapter';
import { MacAdapter } from '../adapters/MacAdapter';
import { SystemAdapter } from '../adapters/SystemAdapter';

export class SystemController {
  private adapter: SystemAdapter;

  constructor() {
    this.adapter = process.platform === 'win32' 
      ? new WindowsAdapter() 
      : new MacAdapter();
  }

  async executeAction(action: string, parameters: any): Promise<string> {
    switch (action) {
      case 'app':
        await this.adapter.openApp(parameters.app);
        return `Opened ${parameters.app}`;
      
      case 'system':
        if (parameters.command === 'screenshot') {
          const path = await this.adapter.takeScreenshot();
          return `Screenshot saved to ${path}`;
        }
        break;
      
      case 'keys':
        await this.adapter.sendKeys(parameters.text);
        return `Typed: ${parameters.text}`;
      
      default:
        return 'Action not implemented yet';
    }
  }
}
```

---

## Phase 4: Main Voice Pipeline Integration (Week 4)

### Step 10: Complete Voice Pipeline

Create `src/voice/VoicePipeline.ts`:
```typescript
import { WakeWordDetector } from './WakeWordDetector';
import { SpeechToText } from './SpeechToText';
import { TextToSpeech } from './TextToSpeech';
import { GeminiClient } from '../ai/GeminiClient';
import { SystemController } from '../controllers/SystemController';

export class VoicePipeline {
  private wakeDetector: WakeWordDetector;
  private stt: SpeechToText;
  private tts: TextToSpeech;
  private gemini: GeminiClient;
  private systemController: SystemController;
  private isActive: boolean = false;

  constructor() {
    this.wakeDetector = new WakeWordDetector();
    this.stt = new SpeechToText();
    this.tts = new TextToSpeech();
    this.gemini = new GeminiClient();
    this.systemController = new SystemController();

    this.setupWakeWordListener();
  }

  private setupWakeWordListener() {
    this.wakeDetector.on('wakeword', () => {
      this.handleWakeWord();
    });
  }

  private async handleWakeWord() {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('👂 Listening for command...');
    
    // Play activation sound
    await this.tts.speak('Yes?');
    
    // Start listening for command
    const connection = this.stt.startLiveTranscription(async (transcript) => {
      if (transcript.toLowerCase().includes('never mind') || 
          transcript.toLowerCase().includes('cancel')) {
        this.isActive = false;
        connection.finish();
        await this.tts.speak('Okay, standing by.');
        return;
      }

      // Process with Gemini
      const intent = await this.gemini.processUserIntent(transcript);
      
      // Respond to user
      await this.tts.speak(intent.response);
      
      // Execute action
      if (intent.action !== 'none') {
        const result = await this.systemController.executeAction(
          intent.action, 
          intent.parameters
        );
        console.log('✅ Action completed:', result);
      }
      
      this.isActive = false;
      connection.finish();
    });
  }

  start() {
    console.log('🚀 Storme voice pipeline starting...');
    this.wakeDetector.startListening();
  }

  stop() {
    this.wakeDetector.stopListening();
  }
}
```

### Step 11: Electron Main Process Integration

Update `electron/main.ts`:
```typescript
import { app, BrowserWindow, ipcMain } from 'electron';
import { VoicePipeline } from '../src/voice/VoicePipeline';

let mainWindow: BrowserWindow;
let voicePipeline: VoicePipeline;

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
    alwaysOnTop: true
  });

  // Initialize voice pipeline
  voicePipeline = new VoicePipeline();
  voicePipeline.start();

  mainWindow.loadURL('http://localhost:5173');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (voicePipeline) {
    voicePipeline.stop();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

---

## Phase 5: Testing & Refinement (Week 5)

### Step 12: Basic Testing Commands

Test these voice commands:
- "Hey Storme, open Chrome"
- "Hey Storme, take a screenshot" 
- "Hey Storme, type hello world"
- "Hey Storme, what's the weather?" (for future web integration)

### Step 13: Error Handling & Logging

Add comprehensive error handling and logging throughout the pipeline.

### Step 14: UI Status Indicators

Update your React UI to show:
- Wake word detection status
- Current listening state
- Last command executed
- System status

---

## API Keys Setup Guide

### 1. Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create new API key
3. Copy to `.env` file

### 2. ElevenLabs API Key
1. Sign up at [ElevenLabs](https://elevenlabs.io)
2. Go to Profile → API Key
3. Copy to `.env` file
4. Get "Adam" voice ID from voice library

### 3. Deepgram API Key
1. Sign up at [Deepgram](https://deepgram.com)
2. Create new API key
3. Copy to `.env` file

### 4. Picovoice Access Key
1. Sign up at [Picovoice](https://picovoice.ai)
2. Get free access key
3. Copy to `.env` file

---

## Next Steps After MVP

1. **Email Integration**: Microsoft Graph API or Gmail API
2. **Calendar Integration**: Same APIs as email
3. **Browser Control**: Puppeteer for web automation
4. **File Operations**: Advanced file search and manipulation
5. **Learning System**: Remember user preferences
6. **Mobile App**: React Native companion app

---

## Troubleshooting

### Common Issues:
- **Audio permissions**: Ensure microphone access is granted
- **API rate limits**: Implement proper rate limiting
- **Wake word false positives**: Adjust sensitivity settings
- **Cross-platform compatibility**: Test on both Windows and macOS

### Performance Tips:
- Use local wake word detection to save API calls
- Cache frequent responses from Gemini
- Implement audio buffering for better STT accuracy
- Use connection pooling for API calls

---

This implementation guide provides a solid foundation for building Storme. Start with Phase 1 and work through each phase systematically. The modular design allows you to test each component independently before integrating everything together.