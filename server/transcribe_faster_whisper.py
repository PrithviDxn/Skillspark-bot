import sys
import json
import logging
from faster_whisper import WhisperModel

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def transcribe_audio(audio_path):
    try:
        logger.info(f"Starting transcription of {audio_path}")
        
        # Load the model
        logger.info("Loading Whisper model...")
        model = WhisperModel("base", device="cpu", compute_type="int8")
        logger.info("Model loaded successfully")
        
        # Transcribe the audio
        logger.info("Starting transcription...")
        segments, info = model.transcribe(audio_path, beam_size=5)
        logger.info("Transcription completed")
        
        # Collect all segments
        transcriptions = []
        for segment in segments:
            transcriptions.append({
                "text": segment.text,
                "start": segment.start,
                "end": segment.end
            })
        
        # Return the results
        result = {
            "success": True,
            "language": info.language,
            "language_probability": info.language_probability,
            "segments": transcriptions
        }
        
        logger.info("Transcription successful")
        print(json.dumps(result))
        return 0
        
    except Exception as e:
        logger.error(f"Transcription failed: {str(e)}")
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result))
        return 1

if __name__ == "__main__":
    if len(sys.argv) != 2:
        logger.error("Invalid number of arguments")
        print(json.dumps({"success": False, "error": "Usage: python transcribe_faster_whisper.py <audio_file_path>"}))
        sys.exit(1)
        
    audio_path = sys.argv[1]
    logger.info(f"Script started with audio path: {audio_path}")
    sys.exit(transcribe_audio(audio_path)) 