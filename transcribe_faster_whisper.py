import sys
from faster_whisper import WhisperModel

def transcribe_audio(audio_path):
    # Run on CPU with int8
    model = WhisperModel("base", device="cpu", compute_type="int8")
    
    # Transcribe audio
    segments, info = model.transcribe(audio_path, beam_size=5)
    
    # Print transcription
    for segment in segments:
        print(segment.text)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python transcribe_faster_whisper.py <audio_file_path>")
        sys.exit(1)
    
    audio_path = sys.argv[1]
    transcribe_audio(audio_path)