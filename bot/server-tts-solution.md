# Server-Side TTS Solution for Full Automation

## Why Server-Side TTS?

Browser TTS has limitations:
- Requires user interaction to activate audio context
- Can be blocked by autoplay policies
- Inconsistent across browsers
- Not suitable for automated bots

## Server-Side TTS Options

### 1. **OpenAI TTS API** (Recommended)
```javascript
// In bot backend
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateTTS(text) {
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "alloy",
    input: text,
  });
  
  const buffer = Buffer.from(await mp3.arrayBuffer());
  return buffer;
}
```

### 2. **Google Cloud Text-to-Speech**
```javascript
const textToSpeech = require('@google-cloud/text-to-speech');

async function generateTTS(text) {
  const client = new textToSpeech.TextToSpeechClient();
  const request = {
    input: { text: text },
    voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
    audioConfig: { audioEncoding: 'MP3' },
  };
  
  const [response] = await client.synthesizeSpeech(request);
  return response.audioContent;
}
```

### 3. **Azure Cognitive Services**
```javascript
const sdk = require('microsoft-cognitiveservices-speech-sdk');

async function generateTTS(text) {
  const speechConfig = sdk.SpeechConfig.fromSubscription(
    process.env.AZURE_SPEECH_KEY, 
    process.env.AZURE_SPEECH_REGION
  );
  
  const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
  const result = await synthesizer.speakTextAsync(text);
  return result.audioData;
}
```

## Implementation Steps

### 1. **Update Bot Backend**
```javascript
// Add TTS generation endpoint
app.post('/api/bot/:sessionId/tts', async (req, res) => {
  const { text } = req.body;
  const audioBuffer = await generateTTS(text);
  
  // Send audio buffer to avatar
  broadcast(sessionId, { 
    type: 'TTS_AUDIO', 
    audioData: audioBuffer.toString('base64') 
  });
  
  res.json({ success: true });
});
```

### 2. **Update Avatar Frontend**
```javascript
// Remove browser TTS, use server audio
ws.onmessage = async (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'TTS_AUDIO') {
    // Play server-generated audio
    const audioBlob = new Blob([
      Uint8Array.from(atob(data.audioData), c => c.charCodeAt(0))
    ], { type: 'audio/mp3' });
    
    const audio = new Audio(URL.createObjectURL(audioBlob));
    audio.play();
    
    // Route to Twilio
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(audio.captureStream());
    source.connect(audioContext.destination);
  }
};
```

## Benefits of Server-Side TTS

✅ **Fully Automated**: No user interaction required
✅ **Consistent Quality**: Same voice across all sessions
✅ **No Browser Limitations**: Works regardless of browser policies
✅ **Better Control**: Can adjust speed, pitch, voice type
✅ **Scalable**: Can handle multiple bots simultaneously

## Cost Considerations

- **OpenAI TTS**: ~$0.015 per 1K characters
- **Google Cloud TTS**: ~$0.004 per 1K characters  
- **Azure TTS**: ~$0.016 per 1K characters

For interview questions (~100-200 characters each), cost is minimal.

## Migration Path

1. **Phase 1**: Keep current system, add server TTS as fallback
2. **Phase 2**: Switch to server TTS for all questions
3. **Phase 3**: Remove browser TTS entirely

This approach will make your bot fully automated and professional! 