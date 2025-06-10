from flask import Flask, request, jsonify, send_from_directory, url_for
from flask_cors import CORS
from demucsRunner import runSeparation
from celery.result import AsyncResult   
from celery_config import celery_app
import ytToMP3
from pathlib import Path 

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

@app.get("/API/output/<song>/<stem>.wav")
def get_stem(song, stem):
    return send_from_directory("output" / song, f"{stem}.wav", as_attachment=True)

@app.get("/status/<task_id>")
def check_status(task_id):
    res: AsyncResult = AsyncResult(task_id, app=celery_app)

    if res.state == "PENDING":
        return jsonify({"state": res.state}), 202
    if res.state == "FAILURE":
        return jsonify({"state": res.state, "error": str(res.result)}), 500
    return jsonify({"state": res.state, "result": res.result}), 200



if __name__ == "__main__":
    app.run(debug=True, port=8080)


