from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import logging
from dotenv import load_dotenv
import httpx

# Load environment variables from .env
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

AI RELATED WORK:
- Done AI related courses like Deep Learning, Foundations of Machine learning Maths courses like Vector Calculus, Convex Optimization, PCA & Dimensionality reduction techniques
- Build Neural Networks form scratch as a part of Deep Learning course had hands on DNN, CNN, RNN and Generative Models like Transformers and GANS

CHILDHOOD, ADDRESS and HOBBIES:
- Hails from village called Kandugula from Karimnagar district Telangana. Now lives in Hyderabad.
- Completed my schooling from Jawahar Navodaya Vidyalaya at Karimnagar.
- Completed +2 level at Narayana Junior College Hyderabad
- Lost parents in my childhood, was brought up by my uncle till my +2 and from B.Tech I started Living on my own
- Hobbies are to play cricket and listening music. Represented National Level Cricket Team in School across all JNVs. 
- Passonate, Hopeful, playful and Adventerous. 
"""

def get_ai_response(user_message):
    """Generate AI response using OpenRouter API"""
    try:
        api_key = os.getenv("OPENAI_API_KEY")

        print("🔍 Loaded from .env:  ", repr(api_key))

        api_base = 'https://openrouter.ai/api/v1'
        model = "openai/gpt-3.5-turbo"

        print("🔍 Using API base:", api_base)
        print("🔑 API Key:", api_key[:10] + "...")
        print("🎯 Model:", model)

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
- Please Answer properly about hobbies, address, and all other generic questions
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

        response = httpx.post(f"{api_base}/chat/completions", headers=headers, json=payload)
        response.raise_for_status()

        return response.json()["choices"][0]["message"]["content"].strip()

    except httpx.HTTPStatusError as http_err:
        logger.error(f"🔴 OpenRouter API error: {http_err.response.text}")
        return "Sorry, I'm unable to process your request at the moment due to an authorization issue."

    except Exception as e:
        logger.error(f"⚠️ General error: {str(e)}")
        return "Something went wrong. Please try again later."

@app.route('/')
def serve_frontend():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('../frontend', path)

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
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'Voice Chatbot API'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
