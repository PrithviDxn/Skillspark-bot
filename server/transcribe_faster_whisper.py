import sys
import json
from faster_whisper import WhisperModel

def transcribe_audio(audio_path):
    try:
        # Load the model
        model = WhisperModel("base", device="cpu", compute_type="int8")
        
        # Transcribe the audio
        segments, info = model.transcribe(audio_path, beam_size=5)
        
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
        
        print(json.dumps(result))
        return 0
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result))
        return 1

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"success": False, "error": "Usage: python transcribe_faster_whisper.py <audio_file_path>"}))
        sys.exit(1)
        
    audio_path = sys.argv[1]
    sys.exit(transcribe_audio(audio_path)) 