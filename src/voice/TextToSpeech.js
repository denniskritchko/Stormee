const { ElevenLabs } = require('elevenlabs-node');

class TextToSpeech {
  constructor() {
    this.elevenlabs = new ElevenLabs({
      apiKey: process.env.ELEVENLABS_API_KEY
    });
    this.voiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'; // Default Adam voice
    this.speaker = null;
  }

  async speak(text, options = {}) {
    try {
      console.log('🔊 Speaking:', text);
      
      const audioStream = await this.elevenlabs.generate({
        voice: options.voiceId || this.voiceId,
        text: text,
        model_id: options.model || 'eleven_monolingual_v1',
        voice_settings: {
          stability: options.stability || 0.5,
          similarity_boost: options.similarity_boost || 0.5
        }
      });

      // For demo purposes, we'll just log the response
      // In production, you'd pipe this to speakers
      console.log('🔊 TTS generated audio for:', text);
      
      return audioStream;
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
