// Simple test script for bot controls
const axios = require('axios');

const BOT_URL = 'http://localhost:5001';
const SESSION_ID = 'test-interview-' + Date.now();

async function testBotControls() {
    console.log('🤖 Testing Bot Controls and Answer Capture');
    console.log('==========================================');
    console.log(`Session ID: ${SESSION_ID}`);
    
    try {
        // 1. Set tech stack and load questions
        console.log('\n1. Loading questions for tech stack...');
        const techStackResponse = await axios.post(`${BOT_URL}/api/bot/${SESSION_ID}/set-techstack`, {
            techStackId: '65f1a2b3c4d5e6f7g8h9i0j1' // Replace with actual tech stack ID
        });
        console.log('✅ Questions loaded:', techStackResponse.data.count);
        
        // 2. Check session status
        console.log('\n2. Checking session status...');
        const statusResponse = await axios.get(`${BOT_URL}/api/bot/${SESSION_ID}/status`);
        console.log('✅ Session status:', statusResponse.data);
        
        // 3. Start the interview
        console.log('\n3. Starting interview...');
        const startResponse = await axios.post(`${BOT_URL}/api/bot/${SESSION_ID}/start`);
        console.log('✅ Interview started - Bot should speak first question');
        
        // 4. Wait for potential answer capture
        console.log('\n4. Waiting 10 seconds for potential answer capture...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // 5. Check for captured answers
        console.log('\n5. Checking for captured answers...');
        const answersResponse = await axios.get(`${BOT_URL}/api/bot/${SESSION_ID}/answers`);
        console.log('✅ Answers captured:', answersResponse.data.totalAnswers);
        
        if (answersResponse.data.answers.length > 0) {
            answersResponse.data.answers.forEach((answer, index) => {
                console.log(`   Answer ${index + 1}:`);
                console.log(`     Question: ${answer.question}`);
                console.log(`     Transcript: ${answer.transcript}`);
                console.log(`     Participant: ${answer.participantId}`);
                console.log(`     Time: ${answer.timestamp}`);
            });
        } else {
            console.log('   No answers captured yet (this is normal if no one spoke)');
        }
        
        // 6. Go to next question
        console.log('\n6. Moving to next question...');
        const nextResponse = await axios.post(`${BOT_URL}/api/bot/${SESSION_ID}/next`);
        if (nextResponse.data.success) {
            console.log('✅ Next question:', nextResponse.data.question);
        } else {
            console.log('ℹ️ No more questions');
        }
        
        // 7. Stop the interview
        console.log('\n7. Stopping interview...');
        await axios.post(`${BOT_URL}/api/bot/${SESSION_ID}/stop`);
        console.log('✅ Interview stopped');
        
        console.log('\n🎉 Test completed!');
        console.log('\nTo test answer capture:');
        console.log('1. Open the avatar URL in a browser');
        console.log('2. Join the same Twilio room from another browser/tab');
        console.log('3. Speak when the bot asks questions');
        console.log('4. Check the answers endpoint again');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        console.log('\nTroubleshooting:');
        console.log('1. Make sure bot backend is running on port 5001');
        console.log('2. Check environment variables in bot/.env');
        console.log('3. Ensure main API is running on port 5000');
    }
}

// Run the test
testBotControls(); 