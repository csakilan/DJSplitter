from flask import Flask, request, jsonify, send_from_directory, url_for
from flask_cors import CORS
from demucsRunner import runSeparation, celery_app
from celery.result import AsyncResult
import uuid
import ytToMP3
import os

# --- Configuration ---
# Your folder for the downloaded YouTube MP3s


app = Flask(__name__)
CORS(app, origins = "*")


# --- Configuration ---
# Your folder for the downloaded YouTube MP3s
MUSIC_FOLDER = 'musicFiles' 
OUTPUT_FOLDER = 'output'
app.config['MUSIC_FOLDER'] = MUSIC_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER


@app.route("/API")
def hello():
    return {"members": ["Member1", "Member2", "Member3"] }

@app.route("/API/generate", methods=['POST'])    
def generate_stems():
    
    data = request.get_json()
    url1 = data.get('url1')
    print(url1)
    filePath = ytToMP3.returnMP3File(url1)

    task = runSeparation(filePath)

    return jsonify({
        'message': 'Audio file is now being processed',        
        'task_id': task.id,
        'status_url': url_for('task_status', task_id=task.id, _external=True)
    })
    print(filePath)
    result = {
        'message': "What is guddy gang"
    }

    return jsonify(result)
    #you need to take in the value, run it through spleeter
    #return the audios back to the top
    
@app.route('/status/<task_id>')
def task_status(task_id):
    """
    Endpoint for the frontend to poll to check the status of a task.
    """
    task = AsyncResult(task_id, app=celery_app)
    
    if task.state == 'PENDING':
        # Job is waiting in the queue or is currently being processed
        response = {'state': task.state, 'status': 'Processing...'}
    elif task.state != 'FAILURE':
        # Job completed successfully
        response = {'state': task.state, 'status': task.info.get('status', ''), 'result': task.info.get('result', {})}
    else:
        # Something went wrong in the background job
        response = {'state': task.state, 'status': 'FAILURE', 'error': str(task.info)}
        
    return jsonify(response)


@app.route('/output/<path:path>')
def send_output_file(path):
    """
    Serves the final separated audio files.
    """
    return send_from_directory(app.config['OUTPUT_FOLDER'], path)

if __name__ == "__main__":
    app.run(debug=True, port=8080)


