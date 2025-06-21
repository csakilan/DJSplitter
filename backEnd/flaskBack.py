"""
Simple Demucs-powered audio API
────────────────────────────────
Exposes endpoints to

• download a YouTube track ➞ separate stems (Celery)
• stream any separated stem  (bass.mp3, drums.mp3 …)
• stream the *original* full-mix MP3        ← NEW
• analyse pitch / key (optional utility)
"""

from pathlib import Path
import shutil
import atexit

from flask import (
    Flask,
    request,
    jsonify,
    url_for,
    send_file,
    abort,
)
from flask_cors import CORS
from celery.result import AsyncResult

from demucsRunner import runSeparation
from celery_config import celery_app
import ytToMP3
from key_detect import analyze_audio      # ← optional

# ── paths ─────────────────────────────────────────────────────────
BASE = Path(__file__).parent
MUSIC_DIR  = BASE / "musicFiles"
OUTPUT_DIR = BASE / "output"

MUSIC_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# ── flask app ─────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, origins="*")

@app.route("/API")
def hello():
    """Tiny smoke test."""
    return {"members": ["Member1", "Member2", "Member3"]}

# ──────────────────────────────────────────────────────────────────
#  (1)  START STEM-GENERATION JOB
# ──────────────────────────────────────────────────────────────────
@app.post("/API/generate")
def generate():
    """
    Body: { "url1": "<YouTube URL>" }

    • downloads the MP3
    • queues Demucs separation in Celery
    • returns 202 + links to poll status *and* original mp3
    """
    url = request.get_json(force=True)["url1"]

    # 1️⃣ grab mp3 → musicFiles/<videoid>.mp3
    mp3_path = Path(ytToMP3.returnMP3File(url))
    song_id  = mp3_path.stem            # 'zYx123' (without .mp3)

    # 2️⃣ queue separation
    task = runSeparation.delay(str(mp3_path))

    return {
        "task_id"     : task.id,
        "status_url"  : url_for("check_status",
                                task_id=task.id, _external=True),
        "original_url": url_for("get_music",
                                song=song_id, _external=True)
    }, 202

# ──────────────────────────────────────────────────────────────────
#  (2)  STREAM FULL ORIGINAL MP3  ← NEW
# ──────────────────────────────────────────────────────────────────
@app.get("/API/music/<song>.mp3")
def get_music(song: str):
    """
    Send the un-separated track so the front-end can draw a waveform.
    """
    file_path = MUSIC_DIR / f"{song}.mp3"
    if not file_path.exists():
        abort(404)                    # guard against bad names
    return send_file(
        file_path,
        mimetype       ="audio/mpeg",
        as_attachment  =False,        # allow HTML5 audio streaming
        conditional    =True,         # chunked transfer – no size header
    )

# ──────────────────────────────────────────────────────────────────
#  (3)  STREAM ANY STEM (unchanged)
# ──────────────────────────────────────────────────────────────────
@app.get("/API/output/<song>/<stem>.mp3")
def get_stem(song: str, stem: str):
    """
    Send a single separated stem (bass / drums / …).
    """
    file_path = OUTPUT_DIR / song / f"{stem}.mp3"
    if not file_path.exists():
        abort(404)
    return send_file(
        file_path,
        mimetype      ="audio/mpeg",
        as_attachment =False,
        conditional   =True,
    )

# ──────────────────────────────────────────────────────────────────
#  (4)  POLL TASK STATUS
# ──────────────────────────────────────────────────────────────────
@app.get("/status/<task_id>")
def check_status(task_id: str):
    """
    SUCCESS → { state: "SUCCESS", stems: {bass: "...", ...},
                original_url: ".../music/<song>.mp3" }
    """
    res = AsyncResult(task_id, app=celery_app)

    if res.state == "SUCCESS":
        raw   = res.result
        stems = raw["result"] if isinstance(raw, dict) and "result" in raw else raw

        # infer song name from any stem path (bass/drums etc.)
        first_stem_path = next(iter(stems.values()))
        song_id         = Path(first_stem_path).parent.name

        return jsonify({
            "state"       : "SUCCESS",
            "stems"       : stems,
            "original_url": url_for("get_music",
                                    song=song_id, _external=True)
        })

    if res.state == "FAILURE":
        return jsonify({"state": "FAILURE",
                        "error": str(res.result)}), 500

    # PENDING / STARTED / RETRY
    return jsonify({"state": res.state}), 202

# ──────────────────────────────────────────────────────────────────
#  (5)  OPTIONAL PITCH/KEY ANALYSIS
# ──────────────────────────────────────────────────────────────────
@app.post("/API/pitch")
def pitch():
    """
    Body: { "url": "<YouTube URL>" }
    Returns whatever `analyze_audio()` gives you.
    """
    url  = request.get_json(force=True)["url"]
    mp3  = ytToMP3.returnMP3File(url)
    data = analyze_audio(mp3)
    return jsonify(data)

# ──────────────────────────────────────────────────────────────────
#  (6)  CLEAN-UP ON EXIT
# ──────────────────────────────────────────────────────────────────
@atexit.register
def _cleanup():
    shutil.rmtree(MUSIC_DIR,  ignore_errors=True)
    shutil.rmtree(OUTPUT_DIR, ignore_errors=True)

# ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, port=8080)
