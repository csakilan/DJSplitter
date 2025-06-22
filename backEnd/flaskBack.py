"""
Simple Demucs-powered audio API
────────────────────────────────
Exposes endpoints to

• download a YouTube track ➞ separate stems (Celery)
• stream any separated stem  (bass.mp3, drums.mp3 …)
• stream the *original* full-mix MP3        ← NEW
• analyse pitch / key (optional utility)
"""

import os
import shutil
import atexit
from pathlib import Path

from flask import Flask, request, jsonify, url_for, send_file, abort
from flask_cors import CORS
from celery.result import AsyncResult
from dotenv import load_dotenv
import requests

from demucsRunner import runSeparation
from celery_config import celery_app
import ytToMP3
from key_detect import analyze_audio      # ← optional

# ── load secrets ─────────────────────────────────────────────────
#CHANGE THIS TO BE YOUR API KEY FROM GOOGLE APIS!!!!!!!
load_dotenv()  # reads backend/.env
YT_API_KEY = os.getenv("YT_API_KEY")
YT_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

# ── paths ─────────────────────────────────────────────────────────
BASE       = Path(__file__).parent
MUSIC_DIR  = BASE / "musicFiles"
OUTPUT_DIR = BASE / "output"

MUSIC_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# ── flask app ─────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, origins="*")

@app.route("/API")
def hello():
    return {"members": ["Member1", "Member2", "Member3"]}

@app.get("/API/search")
def youtube_search():
    """
    Proxy for YouTube Data API v3.
    Query string: ?q=search+terms
    """
    q = request.args.get("q", "")
    if not q:
        return jsonify({"error": "Missing q parameter"}), 400

    resp = requests.get(
        YT_SEARCH_URL,
        params={
            "part": "snippet",
            "q": q,
            "maxResults": 1,
            "type": "video",
            "key": YT_API_KEY,
        },
        timeout=5,
    )
    resp.raise_for_status()
    return jsonify(resp.json())


@app.post("/API/generate")
def generate():
    url = request.get_json(force=True)["url1"]
    mp3_path = Path(ytToMP3.returnMP3File(url))
    song_id  = mp3_path.stem

    task = runSeparation.delay(str(mp3_path))
    return {
        "task_id": task.id,
        "status_url": url_for("check_status", task_id=task.id, _external=True),
        "original_url": url_for("get_music", song=song_id, _external=True),
    }, 202



@app.get("/API/music/<song>.mp3")
def get_music(song: str):
    file_path = MUSIC_DIR / f"{song}.mp3"
    if not file_path.exists():
        abort(404)
    return send_file(
        file_path,
        mimetype="audio/mpeg",
        as_attachment=False,
        conditional=True,
    )



@app.get("/API/output/<song>/<stem>.mp3")
def get_stem(song: str, stem: str):
    file_path = OUTPUT_DIR / song / f"{stem}.mp3"
    if not file_path.exists():
        abort(404)
    return send_file(
        file_path,
        mimetype="audio/mpeg",
        as_attachment=False,
        conditional=True,
    )



@app.get("/status/<task_id>")
def check_status(task_id: str):
    res = AsyncResult(task_id, app=celery_app)

    if res.state == "SUCCESS":
        raw   = res.result
        stems = raw["result"] if isinstance(raw, dict) and "result" in raw else raw
        first = next(iter(stems.values()))
        song_id = Path(first).parent.name

        return jsonify({
            "state": "SUCCESS",
            "stems": stems,
            "original_url": url_for("get_music", song=song_id, _external=True),
        })

    if res.state == "FAILURE":
        return jsonify({"state": "FAILURE", "error": str(res.result)}), 500

    return jsonify({"state": res.state}), 202



@app.post("/API/pitch")
def pitch():
    url  = request.get_json(force=True)["url"]
    mp3  = ytToMP3.returnMP3File(url)
    data = analyze_audio(mp3)
    return jsonify(data)



@atexit.register
def _cleanup():
    shutil.rmtree(MUSIC_DIR, ignore_errors=True)
    shutil.rmtree(OUTPUT_DIR, ignore_errors=True)


if __name__ == "__main__":
    app.run(debug=True, port=8080)
