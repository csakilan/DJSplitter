from flask import Flask, request, jsonify, send_from_directory, url_for
from flask_cors import CORS
from demucsRunner import runSeparation
from celery.result import AsyncResult   
from celery_config import celery_app
import ytToMP3
from pathlib import Path 
import shutil, atexit


BASE_DIR   = Path(__file__).parent
MUSIC_DIR  = BASE_DIR / "musicFiles"
OUTPUT_DIR = BASE_DIR / "output"

MUSIC_DIR.mkdir(parents=True, exist_ok=True)    # ← NEW
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)   # ← NEW

app = Flask(__name__)
CORS(app, origins = "*")


@app.route("/API")
def hello():
    return {"members": ["Member1", "Member2", "Member3"] }

@app.route("/API/generate", methods=['POST'])    
def generate_stems():
    
    data = request.get_json()
    url1 = data.get('url1')
    filePath = ytToMP3.returnMP3File(url1)
    task = runSeparation.delay(filePath)
    # return jsonify(result)
    return {
        "task_id": task.id,
        "status_url": url_for("check_status", task_id=task.id, _external=True),
    }, 202

@app.get("/API/output/<song>/<stem>.mp3")
def get_stem(song, stem):
    return send_from_directory(OUTPUT_DIR / song,
                               f"{stem}.mp3",
                               as_attachment=True,
                               mimetype="audio/mpeg")


    
@app.get("/status/<task_id>")
def check_status(task_id):
    res = AsyncResult(task_id, app=celery_app)

    if res.state == "SUCCESS":
        raw = res.result
        stem_map = raw["result"] if isinstance(raw, dict) and "result" in raw else raw
        return jsonify({"state": "SUCCESS", "stems": stem_map}), 200
    elif res.state == "FAILURE":
        return jsonify({"state": "FAILURE", "error": str(res.result)}), 500
    else:
        return jsonify({"state": res.state}), 202

@atexit.register
def cleanup_dirs():
    """Remove the entire musicFiles/ and output/ trees when Flask shuts down."""
    shutil.rmtree(MUSIC_DIR,  ignore_errors=True)
    shutil.rmtree(OUTPUT_DIR, ignore_errors=True)



if __name__ == "__main__":
    app.run(debug=True, port=8080)


