const WakeWordDetector = require('./WakeWordDetector');
const SpeechToText = require('./SpeechToText');
const TextToSpeech = require('./TextToSpeech');
const GeminiClient = require('../ai/GeminiClient');
const SystemController = require('../controllers/SystemController');

class VoicePipeline {
  constructor() {
    this.wakeDetector = new WakeWordDetector();
    this.stt = new SpeechToText();
    this.tts = new TextToSpeech();
    this.gemini = new GeminiClient();
    this.systemController = new SystemController();
    
    this.isActive = false;
    this.conversationHistory = [];
    this.currentConnection = null;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Storme voice pipeline...');
      
      await this.wakeDetector.initialize();
      this.setupWakeWordListener();
      
      console.log('✅ Voice pipeline initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize voice pipeline:', error);
      throw error;
    }
  }

  setupWakeWordListener() {
    this.wakeDetector.on('wakeword', () => {
      if (this.isActive) {
        console.log('⚠️ Already processing a command');
        return;
      }
      this.handleWakeWord();
    });
  }

  async handleWakeWord() {
    try {
      this.isActive = true;
      console.log('👂 Wake word detected - listening for command...');
      
      // Acknowledge wake word
      await this.tts.speak('Yes?');
      
      // Start listening for command
      this.currentConnection = this.stt.startLiveTranscription(
        async (transcript, isFinal) => {
          if (isFinal && transcript.toLowerCase().includes('never mind')) {
            this.isActive = false;
            this.stopListening();
            await this.tts.speak('Okay, standing by.');
            return;
          }

          if (isFinal && transcript.trim()) {
            await this.processCommand(transcript);
          }
        },
        (error) => {
          console.error('❌ Transcription error:', error);
          this.isActive = false;
          this.stopListening();
        }
      );
    } catch (error) {
      console.error('❌ Error handling wake word:', error);
      this.isActive = false;
      await this.tts.speakError('Failed to process wake word');
    }
  }

  async processCommand(transcript) {
    try {
      console.log('🧠 Processing command:', transcript);
      
      // Add to conversation history
      this.conversationHistory.push({ role: 'user', content: transcript });
      
      // Process with Gemini
      const intent = await this.gemini.processUserIntent(transcript, this.conversationHistory);
      
      // Add AI response to history
      this.conversationHistory.push({ role: 'assistant', content: intent.response });
      
      // Respond to user
      await this.tts.speak(intent.response);
      
      // Execute action if needed
      if (intent.action && intent.action !== 'none') {
        if (intent.requiresConfirmation) {
          await this.tts.speakWithConfirmation(`I'm about to ${intent.action}. Should I proceed?`);
          // In a real implementation, you'd wait for confirmation here
        }
        
        const result = await this.systemController.executeAction(intent.action, intent.parameters);
        console.log('✅ Action completed:', result);
        
        if (result.success) {
          await this.tts.speakSuccess(result.message);
        } else {
          await this.tts.speakError(result.error);
        }
      }
      
      this.isActive = false;
      this.stopListening();
    } catch (error) {
      console.error('❌ Error processing command:', error);
      this.isActive = false;
      this.stopListening();
      await this.tts.speakError('Failed to process your command');
    }
  }

  stopListening() {
    if (this.currentConnection) {
      this.stt.stopLiveTranscription();
      this.currentConnection = null;
    }
  }

  start() {
    console.log('🚀 Starting Storme voice pipeline...');
    this.wakeDetector.startListening();
  }

  stop() {
    console.log('🔇 Stopping Storme voice pipeline...');
    this.wakeDetector.stopListening();
    this.stopListening();
    this.wakeDetector.release();
  }

  // Manual trigger for testing
  async manualTrigger(command) {
    if (this.isActive) {
      console.log('⚠️ Already processing a command');
      return;
    }
    
    this.isActive = true;
    await this.processCommand(command);
  }
}

module.exports = VoicePipeline;
