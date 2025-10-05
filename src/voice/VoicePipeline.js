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
      console.log('🔧 Setting up continuous listening mode...');
      
      // Skip wake word detector for continuous listening
      console.log('✅ Continuous listening mode configured');
      
      console.log('✅ Voice pipeline initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize voice pipeline:', error);
      console.error('❌ Error details:', error.stack);
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
        console.log('🎯 Executing action:', intent.action, intent.parameters);
        
        if (intent.requiresConfirmation) {
          await this.tts.speak(`I'm about to ${intent.action}. Should I proceed?`);
          // For now, auto-confirm after a short delay
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        const result = await this.systemController.executeAction(intent.action, intent.parameters);
        console.log('✅ Action completed:', result);
        
        if (result.success) {
          await this.tts.speak(result.message || 'Task completed successfully');
        } else {
          await this.tts.speak(result.error || 'Failed to complete the task');
        }
      }
      
      this.isActive = false;
      this.stopListening();
    } catch (error) {
      console.error('❌ Error processing command:', error);
      this.isActive = false;
      this.stopListening();
      await this.tts.speak('Sorry, I encountered an error processing your command');
    }
  }

  stopListening() {
    if (this.currentConnection) {
      this.stt.stopLiveTranscription();
      this.currentConnection = null;
    }
  }

  startContinuousListening() {
    try {
      console.log('🎤 Starting continuous listening...');
      
      this.currentConnection = this.stt.startLiveTranscription(
        async (transcript, isFinal) => {
          console.log('🎤 Raw transcript received:', transcript, 'isFinal:', isFinal);
          if (isFinal && transcript.trim()) {
            console.log('🎤 Processing final command:', transcript);
            await this.processCommand(transcript);
          } else if (transcript.trim()) {
            console.log('🎤 Interim transcript:', transcript);
          }
        },
        (error) => {
          console.error('❌ Continuous listening error:', error);
          // Restart listening after a short delay
          setTimeout(() => {
            if (!this.isActive) {
              console.log('🔄 Restarting continuous listening...');
              this.startContinuousListening();
            }
          }, 2000);
        }
      );
      
      console.log('✅ Continuous listening started - speak any command!');
      console.log('🎤 Debug: If you speak and see no "Raw transcript received" messages, there may be a microphone access issue');
    } catch (error) {
      console.error('❌ Failed to start continuous listening:', error);
    }
  }

  start() {
    console.log('🚀 Starting Storme voice pipeline...');
    this.startContinuousListening();
  }

  stop() {
    console.log('🔇 Stopping Storme voice pipeline...');
    this.stopListening();
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

  // Check if actively listening
  isListening() {
    return !!this.currentConnection;
  }
}

module.exports = VoicePipeline;
