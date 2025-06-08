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


# import os
# from flask import Flask, request, jsonify, send_from_directory, url_for
# from flask_cors import CORS
# from demucsRunner import runSeparation, celery_app # Import the task and celery app instance
# from celery.result import AsyncResult
# import ytToMP3 # Assuming this is your YouTube to MP3 downloader module
# import uuid

# app = Flask(__name__)
# CORS(app)

# # --- Configuration ---
# # Your folder for the downloaded YouTube MP3s
# MUSIC_FOLDER = 'musicFiles' 
# OUTPUT_FOLDER = 'output'
# app.config['MUSIC_FOLDER'] = MUSIC_FOLDER
# app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER

# # --- Ensure directories exist ---
# os.makedirs(MUSIC_FOLDER, exist_ok=True)
# os.makedirs(OUTPUT_FOLDER, exist_ok=True)


# @app.route('/API/generate', methods=['POST'])
# def generate_stems():
#     """
#     Endpoint that receives a YouTube URL, downloads it as an MP3,
#     and then queues it for separation.
#     """
#     data = request.get_json()
#     if not data or 'url' not in data: # FIX: Changed from 'url1' to 'url'
#         return jsonify({'error': 'Missing "url" in request body'}), 400

#     youtube_url = data.get('url')

#     try:
#         # 1. Download the YouTube video as an MP3 and get its local path
#         print(f"Downloading from URL: {youtube_url}")
#         filepath = ytToMP3.returnMP3File(youtube_url)
#         print(f"MP3 saved to: {filepath}")
#     except Exception as e:
#         print(f"Error during download: {e}")
#         return jsonify({'error': 'Failed to download or convert the YouTube video.'}), 500

#     # 2. Basic security and existence check on the newly created file
#     if not os.path.abspath(filepath).startswith(os.path.abspath(app.config['MUSIC_FOLDER'])):
#          return jsonify({'error': 'File was saved outside the designated musicFiles directory.'}), 500

#     if not os.path.exists(filepath):
#         return jsonify({'error': f'Downloaded file could not be found at path: {filepath}'}), 404

#     # 3. Queue the Demucs task with the new file path
#     task = runSeparation.delay(filepath)

#     # 4. Return a response immediately with the task ID
#     return jsonify({
#         'message': 'Audio file processing task started.',
#         'task_id': task.id,
#         'status_url': url_for('task_status', task_id=task.id, _external=True)
#     }), 202  # 202 Accepted


# @app.route('/status/<task_id>')
# def task_status(task_id):
#     """
#     Endpoint for the frontend to poll to check the status of a task.
#     """
#     task = AsyncResult(task_id, app=celery_app)
    
#     if task.state == 'PENDING':
#         # Job is waiting in the queue or is currently being processed
#         response = {'state': task.state, 'status': 'Processing...'}
#     elif task.state != 'FAILURE':
#         # Job completed successfully
#         response = {'state': task.state, 'status': task.info.get('status', ''), 'result': task.info.get('result', {})}
#     else:
#         # Something went wrong in the background job
#         response = {'state': task.state, 'status': 'FAILURE', 'error': str(task.info)}
        
#     return jsonify(response)


# @app.route('/output/<path:path>')
# def send_output_file(path):
#     """
#     Serves the final separated audio files.
#     """
#     return send_from_directory(app.config['OUTPUT_FOLDER'], path)


# if __name__ == '__main__':
#     # Changed port to 8080 to match your frontend's API call
#     app.run(debug=True, port=8080)
