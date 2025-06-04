import sys
import json
import time
from faster_whisper import WhisperModel
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def send_progress(message):
    """Send progress message to stdout"""
    print(json.dumps({
        "type": "progress",
        "message": message
    }), flush=True)

def transcribe_audio(audio_path):
    try:
        send_progress("Loading Whisper model...")
        # Load the model (small model for faster processing)
        model = WhisperModel("small", device="cpu", compute_type="int8")
        
        send_progress("Starting transcription...")
        # Transcribe the audio
        segments, info = model.transcribe(
            audio_path,
            beam_size=5,
            word_timestamps=True,
            language="en"
        )
        
        send_progress("Processing segments...")
        # Process segments
        processed_segments = []
        full_text = ""
        last_progress_time = time.time()
        
        for i, segment in enumerate(segments):
            # Send progress every 2 seconds
            current_time = time.time()
            if current_time - last_progress_time >= 2:
                send_progress(f"Processing segment {i+1}...")
                last_progress_time = current_time
                
            segment_text = segment.text.strip()
            if segment_text:
                full_text += segment_text + " "
                processed_segments.append({
                    "text": segment_text,
                    "start": segment.start,
                    "end": segment.end,
                    "words": [
                        {
                            "word": word.word,
                            "start": word.start,
                            "end": word.end,
                            "confidence": word.probability
                        }
                        for word in segment.words
                    ] if segment.words else []
                })
        
        send_progress("Transcription completed")
        # Return success response
        print(json.dumps({
            "success": True,
            "text": full_text.strip(),
            "segments": processed_segments,
            "language": info.language
        }), flush=True)
        
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}", exc_info=True)
        # Return error response
        print(json.dumps({
            "success": False,
            "error": str(e)
        }), flush=True)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({
            "success": False,
            "error": "Please provide an audio file path"
        }), flush=True)
        sys.exit(1)
        
    audio_path = sys.argv[1]
    logger.info(f"Starting transcription of {audio_path}")
    transcribe_audio(audio_path) 