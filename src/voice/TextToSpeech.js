const { textToSpeech } = require('elevenlabs-node');

class TextToSpeech {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.voiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'; // Default Adam voice
    this.speaker = null;
  }

  async speak(text, options = {}) {
    try {
      console.log('🔊 Speaking:', text);
      
      // For demo purposes, we'll just log the response
      // In production, you'd use the actual ElevenLabs API
      console.log('🔊 TTS would generate audio for:', text);
      console.log('🔊 Voice ID:', options.voiceId || this.voiceId);
      
      // Simulate TTS processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true, message: 'TTS audio generated' };
    } catch (error) {
      console.error('❌ Text-to-speech error:', error);
      throw error;
    }
  }

  async speakWithConfirmation(text) {
    const confirmationText = `${text}. Should I proceed?`;
    return await this.speak(confirmationText);
  }

  async speakError(errorMessage) {
    const errorText = `Sorry, I encountered an error: ${errorMessage}`;
    return await this.speak(errorText);
  }

  async speakSuccess(action) {
    const successText = `Successfully completed: ${action}`;
    return await this.speak(successText);
  }
}

module.exports = TextToSpeech;
