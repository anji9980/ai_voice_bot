from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import os
import logging
from dotenv import load_dotenv
import httpx
import json
from datetime import datetime

# Load environment variables from .env
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Directory structure
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")
STATIC_DIR = os.path.join(FRONTEND_DIR, "static")
LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")

# Ensure directories exist
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(LOG_DIR, exist_ok=True)

# Your profile data
ANJI_PROFILE = """
I am Anji Rontala, a Graduate AI Engineer with strong expertise in backend development, AI/ML, and cloud technologies.

BACKGROUND:
- B.Tech in Engineering Science from IIT Hyderabad (2020–2024) with 7.68 grade
- Currently working as Graduate AI Engineer at Turium.ai (June 2024 – April 2025)
- Previously interned as Java Backend Developer at Clouddefense.ai (Feb–May 2024)

TECHNICAL EXPERTISE:
- Languages: Java, Python, JavaScript, C++, SQL
- Backend: Spring Boot, Microservices, REST APIs, Flask
- Databases: PostgreSQL, MySQL, ClickHouse, Kafka
- Cloud & DevOps: AWS EC2, Docker, Git, Keycloak
- Security: OAuth2, OpenID Connect, SSO, RBAC
- AI/ML: Deep Learning, OpenAI API, Feature Engineering, Data Visualization

KEY ACHIEVEMENTS:
- Implemented security policies for ClickHouse reducing downtime by 30%
- Enhanced analytics with AI-powered chart summarization, cutting interpretation time by 40%
- Built enterprise data transformation tool reducing errors by 65%
- Automated unit tests increasing coverage by 35%
- Created real estate price prediction model with 85% accuracy

NOTABLE PROJECTS:
1. Journal Management App – Full-stack with Spring Boot, MongoDB, React
2. Scientific Research Papers Database – Processed 600K entries
3. PropWorth AI – Real estate valuator with ML models

CHILDHOOD, ADDRESS and HOBBIES:
- Hails from village called Kandugula from Karimnagar district Telangana. Now lives in Hyderabad.
- Completed my schooling from Jawahar Navodaya Vidyalaya at Karimnagar.
- Completed +2 level at Narayana Junior College Hyderabad
- Lost parents in my childhood, was brought up by my uncle till my +2 and from B.Tech I started Living on my own
- Hobbies are to play cricket and listening music. Represented National Level Cricket Team in School across all JNVs. 
- Passonate, Hopeful, playful and Adventerous. 
"""

def log_conversation(user_message, ai_response):
    """Log conversations to file for analysis"""
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_file = os.path.join(LOG_DIR, f"conversation_log_{datetime.now().strftime('%Y%m%d')}.json")
        
        log_entry = {
            "timestamp": timestamp,
            "user_message": user_message,
            "ai_response": ai_response
        }
        
        # Append to existing log or create new file
        try:
            with open(log_file, 'r+') as f:
                try:
                    logs = json.load(f)
                    logs.append(log_entry)
                    f.seek(0)
                    json.dump(logs, f, indent=2)
                except json.JSONDecodeError:
                    # File exists but is empty or invalid
                    f.seek(0)
                    json.dump([log_entry], f, indent=2)
        except FileNotFoundError:
            # Create new file
            with open(log_file, 'w') as f:
                json.dump([log_entry], f, indent=2)
                
    except Exception as e:
        logger.error(f"Error logging conversation: {str(e)}")

def get_ai_response(user_message):
    """Generate AI response using OpenRouter API"""
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        
        if not api_key:
            logger.error("API key not found in environment variables")
            return "I'm sorry, but I'm unable to process your request due to a configuration issue. Please try again later."

        api_base = 'https://openrouter.ai/api/v1'
        model = "openai/gpt-3.5-turbo"

        logger.info(f"Using API base: {api_base}")
        logger.info(f"API Key: {api_key[:5]}...")
        logger.info(f"Model: {model}")

        system_prompt = f"""You are Anji Rontala being interviewed for the AI Agent Team position at Home.LLC.

Here's your background: {ANJI_PROFILE}

Answer questions as Anji would, using first person. Be conversational, confident, and enthusiastic about the role.
Highlight relevant experience from your background. Keep responses under 100 words and natural for voice conversation.

For common interview questions, respond authentically:
- Life story: Mention IIT Hyderabad, current role at Turium.ai, passion for AI
- Superpower: Problem-solving and building scalable systems
- Growth areas: Always learning new AI technologies, improving leadership skills
- Misconceptions: People might think you're only technical, but you understand business impact
- Pushing boundaries: Taking on complex projects like real-time data sync, learning new technologies
- Childhood, address and hobbies
"""

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            "temperature": 0.7,
            "max_tokens": 150
        }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        response = httpx.post(f"{api_base}/chat/completions", headers=headers, json=payload, timeout=30.0)
        response.raise_for_status()
        
        ai_response = response.json()["choices"][0]["message"]["content"].strip()
        
        # Log the conversation
        log_conversation(user_message, ai_response)
        
        return ai_response

    except httpx.HTTPStatusError as http_err:
        logger.error(f"OpenRouter API error: {http_err.response.text}")
        return "Sorry, I'm unable to process your request at the moment due to an authorization issue."

    except Exception as e:
        logger.error(f"General error: {str(e)}")
        return "Something went wrong. Please try again later."

@app.route('/')
def serve_frontend():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    # Check if it's a directory traversal attempt
    if '..' in path:
        return "Access denied", 403
        
    # Try to serve from frontend directory first
    frontend_path = os.path.join(FRONTEND_DIR, path)
    if os.path.exists(frontend_path) and os.path.isfile(frontend_path):
        return send_file(frontend_path)
        
    # Then try from static directory
    static_path = os.path.join(STATIC_DIR, path)
    if os.path.exists(static_path) and os.path.isfile(static_path):
        return send_file(static_path)
        
    # Default fallback for favicon and common files
    if path == 'favicon.ico':
        return send_from_directory(STATIC_DIR, 'favicon.ico')
    
    return "File not found", 404

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()

        if not user_message:
            return jsonify({'error': 'Message is required'}), 400

        ai_response = get_ai_response(user_message)

        return jsonify({
            'response': ai_response,
            'status': 'success'
        })

    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring"""
    return jsonify({
        'status': 'healthy', 
        'service': 'Voice Chatbot API',
        'time': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'version': '1.1.0'
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug_mode = os.environ.get('DEBUG', 'False').lower() == 'true'
    logger.info(f"Starting server on port {port}, debug mode: {debug_mode}")
    app.run(host='0.0.0.0', port=port, debug=debug_mode)