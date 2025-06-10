import torch
from demucs.api import Separator, save_audio
import os
from celery_config import celery_app
from pathlib import Path
import subprocess


# STEMS_DIR = Path(__file__).parent / "output"
# STEMS_DIR.mkdir(parents=True, exist_ok=True) 
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


@celery_app.task(name = "demucs.runSeparation", bind = True)
def runSeparation(self, audio_file_path):
    print("BEGAN SEPARATION")
    try:
        separator = Separator(
            model='htdemucs',
            device=get_device(),
            progress=True
        )

        print(f"Worker processing: {audio_file_path}")
        original_wav, separated_stems = separator.separate_audio_file(audio_file_path)

        fileName = os.path.basename(audio_file_path)
        song_name_without_extension = os.path.splitext(fileName)[0]
        output_dir = os.path.join("output", song_name_without_extension)
        os.makedirs(output_dir, exist_ok=True)

        output_paths = {}
        for stem_name, stem_wav in separated_stems.items():
            save_path = os.path.join(output_dir, f"{stem_name}.wav")
            save_audio(stem_wav, save_path, separator.samplerate)
            output_paths[stem_name] = f"/output/{song_name_without_extension}/{stem_name}.wav"
        
        print(f"Worker finished processing: {audio_file_path}")
        return {'status': 'SUCCESS', 'result': output_paths}

    except Exception as e:
        return {'status': 'FAILURE', 'error': str(e)}