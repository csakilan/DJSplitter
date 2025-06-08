import torch
from demucs.api import Separator, save_audio
import os
from celery import Celery

# --- Celery Configuration ---
# Initialize Celery, pointing to Redis as the message broker.
# The broker URL specifies Redis running on localhost at the default port.
celery_app = Celery(
    'tasks',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

# --- Helper Functions ---
# This function automatically selects the best available device.
def get_device():
    if torch.cuda.is_available():
        print("CUDA (NVIDIA GPU) is available. Using CUDA.")
        return "cuda"
    elif torch.backends.mps.is_available():
        print("MPS (Apple Silicon GPU) is available. Using MPS.")
        return "mps"
    else:
        print("No GPU acceleration available. Using CPU.")
        return "cpu"

# --- Main Celery Task ---
# The @celery_app.task decorator registers this function as a Celery task.
# This is the function that will run in the background on the worker.
@celery_app.task
def runSeparation(audio_file_path):
    try:
        separator = Separator(
            model='htdemucs',
            device=get_device(),
            progress=True
        )

        print(f"Worker processing: {audio_file_path}")
        original_wav, separated_stems = separator.separate_audio_file(audio_file_path)

        # --- Save the separated stems ---
        fileName = os.path.basename(audio_file_path)
        song_name_without_extension = os.path.splitext(fileName)[0]
        output_dir = os.path.join("output", song_name_without_extension)
        os.makedirs(output_dir, exist_ok=True)

        output_paths = {}
        for stem_name, stem_wav in separated_stems.items():
            save_path = os.path.join(output_dir, f"{stem_name}.wav")
            save_audio(stem_wav, save_path, separator.samplerate)
            # Store a web-accessible path for the Flask app to return
            output_paths[stem_name] = f"/output/{song_name_without_extension}/{stem_name}.wav"
        
        print(f"Worker finished processing: {audio_file_path}")
        # The dictionary returned here is stored in the Celery result backend (Redis).
        return {'status': 'SUCCESS', 'result': output_paths}

    except Exception as e:
        # If an error occurs, it will be stored in the result backend.
        return {'status': 'FAILURE', 'error': str(e)}