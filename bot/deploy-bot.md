# Bot Deployment Guide

## Issues Fixed

1. **Audio not being heard**: The bot now creates a proper audio track that routes synthesized tones to Twilio when speaking
2. **Eyes stop blinking**: Improved WebSocket connection stability with reconnection logic and page visibility handling
3. **"object Object" instead of question text**: Fixed question data structure consistency between START_INTERVIEW and NEXT_QUESTION
4. **Face stops animating when switching pages**: Added fallback animation system using setInterval for when page is not focused

## Key Changes

### Audio Fixes
- Created a proper `createAudioTrack()` function that sets up a Web Audio API stream
- Added audio synthesis that generates tones for each word when the bot speaks
- Implemented gain control for proper volume levels
- Added test buttons to manually verify audio functionality

### Connection Stability
- Added exponential backoff reconnection logic
- Implemented page visibility API handling
- Added ping/pong keep-alive mechanism
- Improved error handling and logging

### Question Text Fix
- Fixed inconsistency in how questions are sent from backend
- Both START_INTERVIEW and NEXT_QUESTION now send question text directly
- Improved logging to debug question data structure

### Animation Stability
- Added fallback animation system using setInterval
- Animation continues even when page is not focused
- Automatic switching between requestAnimationFrame and setInterval based on page visibility
- Time-based animation for better performance

## Testing the Bot

1. **Deploy the updated bot backend** to your hosting platform (Render, Railway, etc.)
2. **Deploy the avatar frontend** to Netlify or similar
3. **Test the audio**:
   - Open the bot avatar page
   - Click "Test Audio" to hear a 1-second tone
   - Click "Test TTS" to hear synthesized speech
   - Join a Twilio room and verify the bot can be heard
4. **Test the questions**:
   - Start an interview and verify the bot speaks the actual question text
   - Check that the face continues animating when switching to the Twilio room

## Environment Variables

Make sure your bot backend has these environment variables:

```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_API_KEY_SID=your_api_key_sid
TWILIO_API_KEY_SECRET=your_api_key_secret
QUESTION_API_URL=https://your-main-api.com/api/v1/questions
MAIN_API_URL=https://your-main-api.com/api/v1
```

## Troubleshooting

### Bot not heard in room
1. Check browser console for audio errors
2. Verify microphone permissions are granted
3. Test with the "Test Audio" button
4. Check Twilio room logs for audio track issues

### Eyes not blinking
1. Check WebSocket connection status
2. Verify the page isn't being throttled by the browser
3. Check for JavaScript errors in console
4. Ensure the bot avatar page stays active
5. Check logs for "fallback animation" messages

### Bot says "object Object"
1. Check that questions are properly loaded in the session
2. Verify the question API is returning the correct data structure
3. Check browser console for question data logging

### WebSocket disconnections
1. Check network connectivity
2. Verify the bot backend is running
3. Check for CORS issues
4. Review server logs for connection errors

## Next Steps

1. Test the bot in a real interview scenario
2. Monitor audio quality and adjust gain levels if needed
3. Consider implementing voice activity detection for better audio capture
4. Add more sophisticated TTS with better audio routing if needed 