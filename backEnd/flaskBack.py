from flask import Flask, request, jsonify, send_from_directory, url_for
from flask_cors import CORS
from demucsRunner import runSeparation
from celery import Celery, Task
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

    print(filePath)
    result = {
        'message': "What is guddy gang"
    }

    return jsonify(result)
    #you need to take in the value, run it through spleeter
    #return the audios back to the top
if __name__ == "__main__":
    app.run(debug=True, port=8080)


