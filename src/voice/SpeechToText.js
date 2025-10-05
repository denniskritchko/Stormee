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
      
      this.connection = this.deepgram.listen.live({
        model: 'nova-2',
        smart_format: true,
        language: 'en-US',
        punctuate: true,
        interim_results: true
      });

      this.connection.on('Transcript', (data) => {
        const transcript = data.channel.alternatives[0].transcript;
        if (transcript && transcript.trim()) {
          onTranscript(transcript, data.is_final);
        }
      });

      this.connection.on('error', (error) => {
        console.error('❌ Live transcription error:', error);
        if (onError) onError(error);
      });

      this.connection.on('close', () => {
        console.log('🔇 Live transcription closed');
      });

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
