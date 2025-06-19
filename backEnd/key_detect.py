"""
Detect global key + tempo for an audio file.
pip install librosa soundfile numpy
"""
import numpy as np, librosa

KH_MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09,
                     2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
KH_MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53,
                     2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
NOTE = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]

def _best(profile, chroma):
    scores = [np.corrcoef(np.roll(profile,i), chroma)[0,1] for i in range(12)]
    idx = int(np.argmax(scores))
    return idx, scores[idx]

def detect_key(path:str):
    y,sr = librosa.load(path, mono=True)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr).mean(axis=1)
    maj_i, maj_c = _best(KH_MAJOR, chroma)
    min_i, min_c = _best(KH_MINOR, chroma)
    if maj_c >= min_c:
        return maj_i, "major"
    return min_i, "minor"

def detect_tempo(path:str):
    y,sr = librosa.load(path, mono=True)
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    return float(tempo)

def analyze_audio(path:str):
    tonic, mode = detect_key(path)
    tempo       = detect_tempo(path)
    return {
        "key"  : f"{NOTE[tonic]}{'' if mode=='major' else 'm'}",
        "tonic": tonic,
        "mode" : mode,
        "tempo": tempo
    }
