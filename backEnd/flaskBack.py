from flask import Flask, request, jsonify, send_from_directory, url_for, send_file, abort
from flask_cors import CORS
from demucsRunner import runSeparation
from celery.result import AsyncResult
from celery_config import celery_app
import ytToMP3, shutil, atexit
from pathlib import Path
from key_detect import analyze_audio  # ← NEW

BASE = Path(__file__).parent
MUSIC_DIR, OUTPUT_DIR = BASE/"musicFiles", BASE/"output"
MUSIC_DIR.mkdir(exist_ok=True), OUTPUT_DIR.mkdir(exist_ok=True)

app = Flask(__name__)
CORS(app, origins="*")

@app.route("/API")
def hello(): return {"members":["Member1","Member2","Member3"]}

@app.post("/API/generate")
def generate():
    url = request.get_json(force=True)["url1"]
    task = runSeparation.delay(ytToMP3.returnMP3File(url))
    return {"task_id":task.id,
            "status_url":url_for("check_status",task_id=task.id,_external=True)},202

@app.get("/API/output/<song>/<stem>.mp3")
def get_stem(song, stem):
    """Stream a stem mp3 without pre-sending Content-Length."""
    file_path = OUTPUT_DIR / song / f"{stem}.mp3"
    if not file_path.exists():
        abort(404)
    return send_file(
        file_path,
        mimetype="audio/mpeg",
        as_attachment=False,    # let browser stream-play
        conditional=True        # chunked transfer → no length mismatch
    )

@app.get("/status/<task_id>")
def check_status(task_id):
    res = AsyncResult(task_id, app=celery_app)
    if res.state=="SUCCESS":
        raw = res.result
        stems = raw["result"] if isinstance(raw,dict) and "result" in raw else raw
        return jsonify({"state":"SUCCESS","stems":stems})
    if res.state=="FAILURE":
        return jsonify({"state":"FAILURE","error":str(res.result)}),500
    return jsonify({"state":res.state}),202

# NEW ─────────────────────────────────────────────────────────────
@app.post("/API/pitch")
def pitch():
    url = request.get_json(force=True)["url"]
    mp3 = ytToMP3.returnMP3File(url)
    return jsonify(analyze_audio(mp3))
# ─────────────────────────────────────────────────────────────────

@atexit.register
def _cleanup():
    shutil.rmtree(MUSIC_DIR, ignore_errors=True)
    shutil.rmtree(OUTPUT_DIR, ignore_errors=True)

if __name__=="__main__":
    app.run(debug=True, port=8080)
