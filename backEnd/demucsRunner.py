import torch, subprocess, os, shlex
from pathlib import Path
from demucs.api import Separator, save_audio
from celery_config import celery_app

def get_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"

@celery_app.task(name="demucs.runSeparation", bind=True)
def runSeparation(self, audio_file_path: str):
    try:
        print("BEGAN SEPARATION:", audio_file_path)
        separator = Separator(model="htdemucs", device=get_device(), progress=True)

        _, stems = separator.separate_audio_file(audio_file_path)

        song_name = Path(audio_file_path).stem
        out_dir   = Path("output") / song_name
        out_dir.mkdir(parents=True, exist_ok=True)

        url_map: dict[str, str] = {}

        for stem, wav in stems.items():
            wav_path = out_dir / f"{stem}.wav"
            mp3_path = out_dir / f"{stem}.mp3"

            save_audio(wav, wav_path, separator.samplerate)

            # --- ffmpeg transcode -------------------------------------------------
            cmd = ["ffmpeg", "-y", "-i", str(wav_path), str(mp3_path)]
            ret = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE).returncode

            if ret == 0 and mp3_path.exists():
                url_map[stem] = f"/API/output/{song_name}/{stem}.mp3"
            else:
                # Keep the WAV if MP3 failed
                print(f"[ffmpeg ERROR] Could not create {mp3_path.name}; keeping WAV")
                url_map[stem] = f"/API/output/{song_name}/{stem}.wav"

        print("FINISHED SEPARATION:", audio_file_path)
        return {"status": "SUCCESS", "result": url_map}


    except Exception as e:
        print("SEPARATION FAILED:", e)
        return {"status": "FAILURE", "error": str(e)}
