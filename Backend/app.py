from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

# Path to the user preferences file
PREFS_FILE = 'user_preferences.json'

def load_preferences():
    if os.path.exists(PREFS_FILE):
        with open(PREFS_FILE, 'r') as f:
            return json.load(f)
    return {'theme': 'light'}  # Default preferences

def save_preferences(preferences):
    with open(PREFS_FILE, 'w') as f:
        json.dump(preferences, f)

@app.route('/api/theme', methods=['GET'])
def get_theme():
    preferences = load_preferences()
    return jsonify({'theme': preferences['theme']})

@app.route('/api/theme', methods=['POST'])
def set_theme():
    data = request.get_json()
    theme = data.get('theme')
    
    if theme not in ['light', 'dark']:
        return jsonify({'error': 'Invalid theme value'}), 400
    
    preferences = load_preferences()
    preferences['theme'] = theme
    save_preferences(preferences)
    
    return jsonify({'theme': theme})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
