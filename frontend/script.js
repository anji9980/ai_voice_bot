{/* <script> */}
class VoiceChatbot {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isSpeaking = false;
        this.apiEndpoint = window.location.origin + '/api/chat';
        
        this.initializeElements();
        this.initializeSpeechRecognition();
        this.setupEventListeners();
    }

    initializeElements() {
        this.chatContainer = document.getElementById('chatContainer');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.status = document.getElementById('status');
    }

    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
        } else {
            this.showStatus('Speech recognition not supported in this browser. Please use Chrome or Edge.', 'error');
            this.startBtn.disabled = true;
            return;
        }

        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.showStatus('🎤 Listening... Ask me anything!', 'listening');
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.startBtn.classList.add('pulse');
        };

        this.recognition.onresult = (event) => {
            const finalTranscript = event.results[0][0].transcript;
            if (finalTranscript.trim()) {
                this.handleUserInput(finalTranscript);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.showStatus(`Speech recognition error: ${event.error}`, 'error');
            this.stopListening();
        };

        this.recognition.onend = () => {
            this.stopListening();
        };
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startListening());
        this.stopBtn.addEventListener('click', () => this.stopListening());
        this.clearBtn.addEventListener('click', () => this.clearChat());
    }

    startListening() {
        if (this.recognition && !this.isListening && !this.isSpeaking) {
            this.recognition.start();
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
        
        this.isListening = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.startBtn.classList.remove('pulse');
        this.hideStatus();
    }

    async handleUserInput(text) {
        this.addMessage(text, 'user');
        this.showStatus('🤔 Thinking...', 'processing');
        
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: text })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.response) {
                this.addMessage(data.response, 'bot');
                this.speakText(data.response);
            } else {
                throw new Error('No response from server');
            }
        } catch (error) {
            console.error('Error getting AI response:', error);
            const errorMessage = "I apologize, but I'm having trouble connecting to the server. Please try again in a moment.";
            this.addMessage(errorMessage, 'bot');
            this.showStatus('Connection error - please try again', 'error');
            setTimeout(() => this.hideStatus(), 3000);
        }
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.textContent = text;
        
        this.chatContainer.appendChild(messageDiv);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    speakText(text) {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        utterance.volume = 0.8;

        // Try to use a more natural voice
        const voices = this.synthesis.getVoices();
        const preferredVoice = voices.find(voice => 
            voice.name.includes('Google') || 
            voice.name.includes('Microsoft') ||
            voice.name.includes('Alex') ||
            voice.name.includes('Samantha')
        );
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.onstart = () => {
            this.isSpeaking = true;
            this.showStatus('🔊 Speaking...', 'speaking');
        };

        utterance.onend = () => {
            this.isSpeaking = false;
            this.hideStatus();
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            this.isSpeaking = false;
            this.hideStatus();
        };

        this.synthesis.speak(utterance);
    }

    showStatus(message, type) {
        this.status.textContent = message;
        this.status.className = `status ${type}`;
        this.status.classList.remove('hidden');
    }

    hideStatus() {
        this.status.classList.add('hidden');
    }

    clearChat() {
        this.chatContainer.innerHTML = `
            <div class="message bot-message">
                👋 Hi! I'm Anji Rontala. I'm ready to discuss my experience and background for the AI Agent Team position at Home.LLC. 
                What would you like to know about me?
            </div>
        `;
    }
}

// Global function for question cards
function askQuestion(question) {
    const chatbot = window.chatbotInstance;
    if (chatbot && !chatbot.isListening && !chatbot.isSpeaking) {
        chatbot.handleUserInput(question);
    }
}

// Initialize the chatbot when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatbotInstance = new VoiceChatbot();
    
    // Load voices when they become available
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {
            // Voices are now loaded
        };
    }
});
// </script>