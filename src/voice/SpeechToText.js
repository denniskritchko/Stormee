const { createClient } = require('@deepgram/sdk');

class SpeechToText {
  constructor() {
    this.deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    this.connection = null;
  }

  async transcribeAudio(audioBuffer) {
    try {
      console.log('🎤 Transcribing audio...');
      
      const response = await this.deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: 'nova-2',
          smart_format: true,
          language: 'en-US',
          punctuate: true,
          diarize: false
        }
      );

      const transcript = response.results?.channels[0]?.alternatives[0]?.transcript || '';
      console.log('📝 Transcript:', transcript);
      
      return {
        transcript,
        confidence: response.results?.channels[0]?.alternatives[0]?.confidence || 0
      };
    } catch (error) {
      console.error('❌ Speech-to-text error:', error);
      throw error;
    }
  }

  startLiveTranscription(onTranscript, onError) {
    try {
      console.log('🎤 Starting live transcription...');
      console.log('⚠️ Note: Real microphone access requires additional system setup');
      console.log('🎤 For now, use the text input to test AI commands');
      
      // Create a mock connection for demo purposes
      this.connection = {
        getReadyState: () => 1,
        finish: () => {
          console.log('🔇 Demo connection finished');
        }
      };

      console.log('🎤 Demo mode: Voice input simulation active');
      console.log('🎤 Use the text input field to test AI commands');
      
      return this.connection;
    } catch (error) {
      console.error('❌ Failed to start live transcription:', error);
      throw error;
    }
  }

  stopLiveTranscription() {
    if (this.connection) {
      this.connection.finish();
      this.connection = null;
      console.log('🔇 Live transcription stopped');
    }
  }
}

module.exports = SpeechToText;
