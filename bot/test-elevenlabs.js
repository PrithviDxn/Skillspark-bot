const axios = require('axios');

const ELEVENLABS_API_KEY = 'sk_32200d3d68af1f63723f878383d41eb63d76108c0db57894'; // <-- your key

async function testTTS() {
  try {
    const response = await axios.post(
      'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
      { text: 'Hello world' },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );
    if (response.data && response.data.length > 100) {
      console.log('Success! Received audio data from ElevenLabs.');
    } else {
      console.log('No audio data received.');
    }
  } catch (err) {
    console.log('Error:', err.response?.status, err.response?.data || err.message);
  }
}

testTTS(); 