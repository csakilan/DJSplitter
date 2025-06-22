
![MusicSplitterImage](https://github.com/user-attachments/assets/4913ac65-e6bb-422b-b7c3-38f3de24c46d)

# MUSIC SPLITTER

React • Flask • Demucs • Celery/Redis • Tone.js • WaveSurfer.js • Librosa

**A playground to test out different music combinations!**

**Separate songs into their different parts, and control the volume, pitch, and tempo to mix and mash together two different songs to create a masterpiece!**

**YouTube → stems → real-time web mixer** with independent pitch/tempo controls and draggable wave-forms.

---

##  What it does

| Layer          | Tech                                                | Role                                                                                                                                                                                                                  |
| -------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Front-end**  | React + TypeScript · Vite · WaveSurfer.js · Tone.js | • Renders draggable, scrolling wave-forms for each song<br>• Mixes isolated stems in the browser with per-stem volume & global pitch/tempo<br>• “Master Controller” syncs multiple songs (tempo + tonic) in one click |
| **Back-end**   | Flask (REST)                                        | • `/API/generate` → downloads YouTube audio (yt-dlp) → converts to MP3 → enqueues Demucs<br>• Streams separated stems **and** the full-mix MP3<br>• `/API/pitch` returns key / tempo JSON                             |
| **Separation** | Demucs v4                                           | Splits MP3 into `vocals / drums / bass / other`                                                                                                                                                                       |
| **Long jobs**  | Celery + Redis                                      | Runs Demucs without blocking Flask since some demucs calls might take more than 30 secs causing frontend to timeout; workers speed up on **CUDA** GPUs or Apple **Metal (MPS)**                                                                                                                        |
| **Music meta** | `librosa` + `key_detect.py`                         | • `beat_track` → tempo (BPM)<br>• Krumhansl key estimation → tonic/key                                                                                                                                                |

---

##  Directory layout

```
repo/
│
├─ backend/
│   ├─ flaskBack.py           ← main Flask app
│   ├─ demucsRunner.py        ← Celery task wrapper
│   ├─ celery_config.py
│   ├─ key_detect.py          ← tempo + key detection helpers
│   └─ ...
│
└─ frontend/
    ├─ src/
    │   ├─ components/
    │   ├─ hooks/
    │   └─ context/
    └─ package.json
```

---

## 🚀 Quick start (dev)





**Prereqs**  Python ≥ 3.9 · Node ≥ 18 · Redis running locally
*(Optional) CUDA 11 **or** Apple Silicon for Metal-MPS acceleration*

1. **Install Python Requirements**

   ```bash
   python -m venv venv && source venv/bin/activate
   pip install -r requirements.txt
   brew install redis      
   ```
1a. **Configure YouTube Data API v3 key**  
   - Go to Google Cloud Console → Enable **YouTube Data API v3**  
   - Under **Credentials**, create an **API key**  
   - In your backend folder, create (and git-ignore) a file `backend/.env` with:
     ```env
     YT_API_KEY=YOUR_YOUTUBE_API_KEY_HERE
     ```


2. **Flask API**

   ```bash
   cd backend
   python flaskBack.py          # http://127.0.0.1:8080
   ```

3. **React / Vite dev server**

   ```bash
   cd frontend
   npm install
   npm run dev                  # http://localhost:5173
   ```

4. **Celery worker with auto-reload**

   ```bash
   cd backend
   watchmedo auto-restart \
     --patterns="*.py" \
     -- celery -A celery_config.celery_app worker \
               --pool=threads --concurrency=4 --loglevel=info
   ```

   *Tip –* set `CUDA_VISIBLE_DEVICES=0` to force GPU use on CUDA machines.
   Demucs detects **Metal / MPS** automatically on Apple Silicon.

---

## 🛠 Environment variables

| Variable       | Default                    | Purpose                          |
| -------------- | -------------------------- | -------------------------------- |
| `REDIS_URL`    | `redis://localhost:6379/0` | Celery broker / result backend   |
| `YDL_BINARY`   | `yt-dlp`                   | Override if yt-dlp isn’t on PATH |
| `DEMUCS_MODEL` | `htdemucs`                 | Change stem model (e.g. `mdx`)   |

Create a `.env` in **backend/** to override.




