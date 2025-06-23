import os
from dotenv import load_dotenv

# Load the .env file from the project root directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

class Config:
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '').strip()
    OPENAI_API_BASE = os.getenv('OPENAI_API_BASE', 'https://api.openai.com/v1').strip()
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-here')
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    PORT = int(os.getenv('PORT', 5000))

# Debug print to confirm API key is loaded
print("✅ Loaded API KEY prefix:", Config.OPENAI_API_KEY[:10] + "...")
print("🌐 API BASE:", Config.OPENAI_API_BASE)
