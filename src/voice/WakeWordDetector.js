const EventEmitter = require('events');

class WakeWordDetector extends EventEmitter {
  constructor() {
    super();
    this.isListening = false;
    this.mockInterval = null;
  }

  async initialize() {
    try {
      console.log('🔧 Initializing wake word detector...');
      console.log('✅ Mock wake word detector initialized (demo mode)');
      console.log('🎤 For demo: Press Ctrl+Shift+W to simulate wake word');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize wake word detector:', error);
      throw error;
    }
  }

  startListening() {
    if (this.isListening) {
      console.log('⚠️ Already listening for wake word');
      return;
    }
    
    this.isListening = true;
    console.log('🎤 Wake word detection active');
    console.log('🎤 Demo mode: Wake word will be simulated every 30 seconds');
    console.log('🎤 Manual trigger: Press Ctrl+Shift+W to simulate "Hey Storme"');
    
    // For demo: simulate wake word every 30 seconds
    this.mockInterval = setInterval(() => {
      if (this.isListening) {
        console.log('🎤 Mock wake word detected: "Hey Storme"');
        this.emit('wakeword');
      }
    }, 30000);
  }

  stopListening() {
    this.isListening = false;
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
    console.log('🔇 Wake word detection stopped');
  }

  release() {
    this.stopListening();
  }
}

module.exports = WakeWordDetector;
