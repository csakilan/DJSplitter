from yt_dlp import YoutubeDL
import os

def returnMP3File(url):
    # Define output directory
    output_directory = "musicFiles"
    if not os.path.exists(output_directory):
        os.makedirs(output_directory)  # Create directory if it doesn't exist

    # Set the output file path and other options
    ydl_opts = {
        'format': 'bestaudio/best',  # Download the best available audio
        'outtmpl': os.path.join(output_directory, '%(title)s.%(ext)s'),  # Output file name template
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
    }

    try:
        # Download and convert to MP3
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)  # Extract info and download
            file_name = ydl.prepare_filename(info).replace(info['ext'], 'mp3')  # Adjust to mp3 extension

        print("Download and conversion to MP3 completed successfully.")
        return file_name  # Return the path to the MP3 file

    except Exception as e:
        print(f"An error occurred: {e}")
        return None
