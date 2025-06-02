import os
import time
import torch
import numpy as np
from scipy.io.wavfile import write
from scipy import signal
from transformers import pipeline, AutoModelForSpeechSeq2Seq, AutoProcessor
import librosa
from datetime import datetime
import argparse

# Use environment variables for paths
OUTPUT_FOLDER = os.getenv("OUTPUT_FOLDER", "temp")
SAMPLE_RATE = 16000  # Hz
NOTEPAD_FILE = os.path.join(OUTPUT_FOLDER, "transcriptions.txt")  # Main notepad file

# Debug mode - set to False by default, change to True for troubleshooting
DEBUG = True  # Enable debug mode for troubleshooting

# Default to a smaller model for better performance
MODEL_ID = "openai/whisper-base"  # Can also use "openai/whisper-base", "openai/whisper-medium", or "openai/whisper-large-v3-turbo"
FALLBACK_MODEL_ID = "openai/whisper-base"  # Smaller model to try if small fails

# Enable audio enhancements
APPLY_NOISE_REDUCTION = True
REMOVE_SILENCE = True

# Ensure output directory exists
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

def debug_print(message):
    """Print debug messages if DEBUG is enabled"""
    if DEBUG:
        print(f"[DEBUG] {message}")

def reduce_noise(audio_data):
    """Apply simple noise reduction to audio data"""
    if not APPLY_NOISE_REDUCTION:
        return audio_data
    
    try:
        debug_print("Applying noise reduction...")
        
        # Calculate noise profile from first 0.5 seconds (assumed to be background noise)
        noise_sample_length = int(SAMPLE_RATE * 0.5)
        if noise_sample_length < len(audio_data):
            noise_sample = audio_data[:noise_sample_length]
            # Calculate noise power
            noise_power = np.mean(noise_sample**2)
            debug_print(f"Estimated noise power: {noise_power:.8f}")
            
            # Apply simple spectral subtraction if noise is present
            if noise_power > 0 and noise_power < 0.001:  # Only if noise is detected but not too strong
                # Simple high-pass filter to reduce low-frequency noise
                b, a = signal.butter(4, 80/(SAMPLE_RATE/2), 'highpass')
                filtered_audio = signal.filtfilt(b, a, audio_data)
                
                # Ensure we didn't lose too much signal
                if np.max(np.abs(filtered_audio)) > 0.01:
                    debug_print("Noise reduction applied successfully")
                    return filtered_audio
                else:
                    debug_print("Noise reduction resulted in weak signal, using original audio")
                    return audio_data
            else:
                debug_print("Noise level not suitable for reduction")
                return audio_data
        else:
            debug_print("Audio too short for noise analysis")
            return audio_data
    except Exception as e:
        debug_print(f"Error in noise reduction: {str(e)}")
        return audio_data

def remove_silence(audio_data):
    """Remove silence from the beginning and end of the audio"""
    if not REMOVE_SILENCE or audio_data is None:
        return audio_data
    
    try:
        debug_print("Removing silence...")
        
        # Calculate energy profile
        energy = librosa.feature.rms(y=audio_data)[0]
        
        # Set threshold based on mean energy
        threshold = 0.5 * np.mean(energy) + 0.1 * np.max(energy)
        debug_print(f"Silence threshold: {threshold:.8f}")
        
        # Find non-silent parts
        non_silent = energy > threshold
        
        if np.any(non_silent):
            # Find first and last non-silent frame
            first_frame = np.where(non_silent)[0][0]
            last_frame = np.where(non_silent)[0][-1]
            
            # Convert frames to samples (each frame is a window)
            hop_length = 512  # Default hop length in librosa
            first_sample = max(0, first_frame * hop_length - hop_length)
            last_sample = min(len(audio_data), (last_frame + 1) * hop_length + hop_length)
            
            # Trim audio
            trimmed_audio = audio_data[first_sample:last_sample]
            debug_print(f"Trimmed audio from {len(audio_data)} to {len(trimmed_audio)} samples")
            
            # Add small padding
            padding = int(0.1 * SAMPLE_RATE)  # 100ms padding
            padded_start = max(0, first_sample - padding)
            padded_end = min(len(audio_data), last_sample + padding)
            padded_audio = audio_data[padded_start:padded_end]
            
            return padded_audio
        else:
            debug_print("No non-silent frames found")
            return audio_data
    except Exception as e:
        debug_print(f"Error removing silence: {str(e)}")
        return audio_data

def load_whisper_model(model_id=None):
    """Load the Whisper model"""
    if model_id is None:
        model_id = MODEL_ID
        
    print(f"\nLoading Whisper model '{model_id}'. This may take a moment...")
    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
        debug_print(f"Using device for Whisper: {device}, dtype: {torch_dtype}")
        
        # Load model and processor
        model = AutoModelForSpeechSeq2Seq.from_pretrained(
            model_id, 
            torch_dtype=torch_dtype,
            low_cpu_mem_usage=True,
            use_safetensors=True
        )
        model.to(device)
        
        processor = AutoProcessor.from_pretrained(model_id)
        
        # Create pipeline with task-specific parameters
        pipe = pipeline(
            "automatic-speech-recognition",
            model=model,
            tokenizer=processor.tokenizer,
            feature_extractor=processor.feature_extractor,
            max_new_tokens=128,
            chunk_length_s=30,
            batch_size=16,
            return_timestamps=False,
            device=device,
        )
        
        print("Model loaded successfully!")
        return pipe
    except Exception as e:
        print(f"ERROR loading model: {str(e)}")
        return None

def transcribe_audio(audio_file, whisper_pipeline, language="en"):
    """Transcribe audio using Whisper"""
    print("Transcribing audio...")
    start_time = time.time()
    
    try:
        # Verify file exists
        if not os.path.exists(audio_file):
            print(f"ERROR: Audio file not found: {audio_file}")
            return ""
        
        debug_print(f"Audio file size: {os.path.getsize(audio_file)} bytes")
        
        # Set up generation parameters with explicit prompts
        generate_kwargs = {
            "task": "transcribe",
            "language": language
        }
        
        # Load audio with librosa for better processing
        try:
            debug_print(f"Loading audio with librosa: {audio_file}")
            audio_array, sr = librosa.load(audio_file, sr=SAMPLE_RATE, mono=True)
            debug_print(f"Loaded audio shape: {audio_array.shape}, sr: {sr}")
            
            # Check for silence
            audio_max = np.max(np.abs(audio_array))
            debug_print(f"Audio max level after loading: {audio_max}")
            
            if audio_max < 0.01:
                print("WARNING: Audio appears to be silent or very quiet")
            
            # Apply enhancements if not already applied during recording
            if not APPLY_NOISE_REDUCTION and not REMOVE_SILENCE:
                # Only apply enhancements here if not applied during recording
                if APPLY_NOISE_REDUCTION:
                    audio_array = reduce_noise(audio_array)
                if REMOVE_SILENCE:
                    audio_array = remove_silence(audio_array)
            
            # Try to transcribe with explicit parameters
            debug_print("Sending audio to Whisper model...")
            result = whisper_pipeline(audio_array, generate_kwargs=generate_kwargs)
            debug_print(f"Raw transcription result: {result}")
        except Exception as e:
            debug_print(f"Librosa loading failed: {str(e)}, falling back to direct file path")
            # Fall back to direct file path
            result = whisper_pipeline(audio_file, generate_kwargs=generate_kwargs)
            debug_print(f"Raw transcription result from file: {result}")
        
        # Extract text from result - improved handling
        transcription = ""
        if isinstance(result, dict):
            if "text" in result:
                transcription = result["text"].strip()
            elif "transcription" in result:
                transcription = result["transcription"].strip()
        elif isinstance(result, list) and len(result) > 0:
            if isinstance(result[0], dict) and "text" in result[0]:
                transcription = result[0]["text"].strip()
        else:
            # Last resort - convert whatever we got to string
            transcription = str(result).strip()
            
            # Try to extract text from the string if it looks like JSON
            if '{' in transcription and '}' in transcription:
                import json
                try:
                    json_obj = json.loads(transcription.replace("'", "\""))
                    if "text" in json_obj:
                        transcription = json_obj["text"].strip()
                except:
                    pass
        
        # If we still have nothing or generic response, try alternatives
        if not transcription or transcription.lower() in ["thank you", "thanks"]:
            debug_print(f"Model returned generic response: '{transcription}'")
            
            # Try with stronger prompt
            debug_print("Trying with stronger prompt...")
            stronger_kwargs = {
                "task": "transcribe", 
                "language": language,
                "prompt": "Please transcribe the following audio accurately:"
            }
            
            try:
                result = whisper_pipeline(audio_file, generate_kwargs=stronger_kwargs)
                if isinstance(result, dict) and "text" in result:
                    new_transcription = result["text"].strip()
                    if new_transcription and new_transcription.lower() not in ["thank you", "thanks"]:
                        transcription = new_transcription
                        debug_print(f"Stronger prompt succeeded with: {transcription}")
                        elapsed_time = time.time() - start_time
                        print(f"Transcription completed in {elapsed_time:.2f} seconds")
                        return transcription
            except Exception as e:
                debug_print(f"Stronger prompt attempt failed: {str(e)}")
            
            # Try fallback model
            debug_print(f"Trying fallback model: {FALLBACK_MODEL_ID}")
            try:
                # Load fallback model
                fallback_pipe = load_whisper_model(FALLBACK_MODEL_ID)
                if fallback_pipe:
                    result = fallback_pipe(audio_file, generate_kwargs=generate_kwargs)
                    if isinstance(result, dict) and "text" in result:
                        new_transcription = result["text"].strip()
                        if new_transcription and new_transcription.lower() not in ["thank you", "thanks"]:
                            transcription = new_transcription
                            debug_print(f"Fallback model succeeded with: {transcription}")
            except Exception as e:
                debug_print(f"Fallback model attempt failed: {str(e)}")
        
        elapsed_time = time.time() - start_time
        print(f"Transcription completed in {elapsed_time:.2f} seconds")
        
        return transcription
    except Exception as e:
        print(f"ERROR during transcription: {str(e)}")
        import traceback
        traceback.print_exc()
        return ""

def main():
    parser = argparse.ArgumentParser(description='Transcribe audio file using Whisper')
    parser.add_argument('--file', required=True, help='Path to the audio file to transcribe')
    args = parser.parse_args()

    print("==== Whisper Voice-to-Text ====")
    print(f"Using model: {MODEL_ID}")
    if APPLY_NOISE_REDUCTION:
        print("Noise reduction: ENABLED")
    if REMOVE_SILENCE:
        print("Silence removal: ENABLED")
    
    # Load the Whisper model
    pipe = load_whisper_model()
    if pipe is None:
        print("Failed to load Whisper model. Exiting.")
        return
    
    # Transcribe the audio file
    transcription = transcribe_audio(args.file, pipe)
    if transcription:
        print("\nTranscription:")
        print(transcription)
    else:
        print("Failed to transcribe audio file.")

if __name__ == "__main__":
    main() 