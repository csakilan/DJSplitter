from flask import Flask, request, jsonify, send_from_directory, url_for
from flask_cors import CORS
from demucsRunner import runSeparation
from celery.result import AsyncResult
from celery_config import celery_app
import ytToMP3



app = Flask(__name__)
CORS(app, origins = "*")


@app.route("/API")
def hello():
    return {"members": ["Member1", "Member2", "Member3"] }

@app.route("/API/generate", methods=['POST'])    
def generate_stems():
    
    data = request.get_json()
    url1 = data.get('url1')
    print(url1)
    filePath = ytToMP3.returnMP3File(url1)

    task = runSeparation.delay(filePath)
    result = {
        'message': "What is guddy gang"
    }

    # return jsonify(result)
    return {
        "task_id": task.id,
        "status_url": url_for("check_status", task_id=task.id, _external=True),
    }, 202
    # return jsonify({
    #     "message": "ML Task has been submitted and is running in the background.",
    #     "task_id": task.id,
    #     "status_url": url_for('task_status', task_id=task.id)
    # }), 202 # 202 Accepted

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


