// Test script for voice commands
const VoicePipeline = require('./src/voice/VoicePipeline');

async function testVoiceCommands() {
  console.log('🧪 Testing voice command system...');
  
  const voicePipeline = new VoicePipeline();
  
  try {
    // Initialize the pipeline
    await voicePipeline.initialize();
    console.log('✅ Voice pipeline initialized');
    
    // Test manual commands
    const testCommands = [
      'open chrome',
      'take a screenshot', 
      'what time is it',
      'compose an email',
      'open notepad'
    ];
    
    console.log('🎤 Testing manual commands...');
    for (const command of testCommands) {
      console.log(`\n📝 Testing: "${command}"`);
      try {
        await voicePipeline.manualTrigger(command);
        console.log('✅ Command processed successfully');
      } catch (error) {
        console.error('❌ Command failed:', error.message);
      }
      
      // Wait between commands
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n🎉 Voice command testing completed!');
    
  } catch (error) {
    console.error('❌ Voice pipeline initialization failed:', error);
  }
}

// Run the test
testVoiceCommands().catch(console.error);
