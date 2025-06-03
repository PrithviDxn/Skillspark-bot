import sys
from faster_whisper import WhisperModel

def main(audio_path):
    model_size = "base"  # or "tiny" for less RAM, or "small"/"medium" for more accuracy
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    segments, info = model.transcribe(audio_path)
    transcript = ""
    for segment in segments:
        transcript += segment.text + " "
    print(transcript.strip())

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python transcribe_faster_whisper.py <audio_file>")
        sys.exit(1)
    main(sys.argv[1])