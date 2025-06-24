class VoiceChatbot {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isSpeaking = false;
        this.apiEndpoint = window.location.origin + '/api/chat';
        
        this.initializeElements();
        this.initializeTheme();
        this.initializeSpeechRecognition();
        this.setupEventListeners();
        this.loadChatHistory();
    }

    initializeElements() {
        this.chatContainer = document.getElementById('chatContainer');
        this.textInput = document.getElementById('textInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.status = document.getElementById('status');
        this.themeToggle = document.getElementById('themeToggle');
        this.profileImage = document.getElementById('profileImage');
        this.botAvatar = document.getElementById('botAvatar');
    }
    
    initializeTheme() {
        // Set default profile images
        this.profileImage.onerror = () => {
            this.profileImage.src = 'https://via.placeholder.com/100';
        };
        this.botAvatar.onerror = () => {
            this.botAvatar.src = 'https://via.placeholder.com/40';
        };
        
        // Check for saved theme preference or respect OS setting
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
            this.updateThemeIcon('dark');
        }
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
        this.sendBtn.addEventListener('click', () => this.sendTextMessage());
        this.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendTextMessage();
            }
        });
        
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        this.updateThemeIcon(newTheme);
    }
    
    updateThemeIcon(theme) {
        const themeIcon = this.themeToggle.querySelector('i');
        if (theme === 'dark') {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
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

    sendTextMessage() {
        const text = this.textInput.value.trim();
        if (text) {
            this.handleUserInput(text);
            this.textInput.value = '';
        }
    }

    async handleUserInput(text) {
        this.addMessage(text, 'user');
        this.saveChatHistory();
        
        // Add typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message bot-message typing';
        typingIndicator.id = 'typingIndicator';
        
        const avatar = document.createElement('img');
        avatar.src = this.botAvatar.src;
        avatar.className = 'bot-avatar';
        avatar.alt = 'Anji';
        
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.innerHTML = '<span></span><span></span><span></span>';
        
        typingIndicator.appendChild(avatar);
        typingIndicator.appendChild(indicator);
        this.chatContainer.appendChild(typingIndicator);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        
        this.showStatus('🤔 Thinking...', 'processing');
        
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: text })
            });

            // Remove typing indicator
            const indicator = document.getElementById('typingIndicator');
            if (indicator) {
                indicator.remove();
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.response) {
                this.addMessage(data.response, 'bot');
                this.saveChatHistory();
                this.speakText(data.response);
            } else {
                throw new Error('No response from server');
            }
        } catch (error) {
            console.error('Error getting AI response:', error);
            const errorMessage = "I apologize, but I'm having trouble connecting to the server. Please try again in a moment.";
            
            // Remove typing indicator if it exists
            const indicator = document.getElementById('typingIndicator');
            if (indicator) {
                indicator.remove();
            }
            
            this.addMessage(errorMessage, 'bot');
            this.saveChatHistory();
            this.showStatus('Connection error - please try again', 'error');
            setTimeout(() => this.hideStatus(), 3000);
        }
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        if (sender === 'bot') {
            const avatar = document.createElement('img');
            avatar.src = this.botAvatar.src;
            avatar.className = 'bot-avatar';
            avatar.alt = 'Anji';
            messageDiv.appendChild(avatar);
        }
        
        messageDiv.appendChild(document.createTextNode(text));
        
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
        this.chatContainer.innerHTML = '';
        const welcomeMessage = `
            <div class="message bot-message">
                <img src="${this.botAvatar.src}" alt="Anji" class="bot-avatar">
                👋 Hi! I'm Anji Rontala. I'm excited to talk with you about the AI Agent Team position at Home.LLC. 
                I have experience building AI systems, backend services, and working with enterprise applications. 
                Feel free to type a question or click "Start Asking" to begin our conversation!
            </div>
        `;
        this.chatContainer.innerHTML = welcomeMessage;
        
        // Clear saved chat
        localStorage.removeItem('anji_interview_chat');
    }
    
    saveChatHistory() {
        const messages = [];
        const messageElements = this.chatContainer.querySelectorAll('.message');
        
        messageElements.forEach(el => {
            if (el.id === 'typingIndicator') return; // Skip typing indicator
            
            const type = el.classList.contains('user-message') ? 'user' : 'bot';
            // Clone the node to work with it
            const elClone = el.cloneNode(true);
            
            // Remove the avatar from the clone if it exists
            const avatar = elClone.querySelector('.bot-avatar');
            if (avatar) {
                elClone.removeChild(avatar);
            }
            
            messages.push({
                type,
                text: elClone.textContent.trim()
            });
        });
        
        localStorage.setItem('anji_interview_chat', JSON.stringify(messages));
    }
    
    loadChatHistory() {
        const savedChat = localStorage.getItem('anji_interview_chat');
        
        if (savedChat) {
            try {
                const messages = JSON.parse(savedChat);
                
                // Clear default message
                this.chatContainer.innerHTML = '';
                
                // Add saved messages
                messages.forEach(msg => {
                    this.addMessage(msg.text, msg.type);
                });
                
            } catch (e) {
                console.error('Error loading chat history:', e);
                // If error, don't change the default welcome message
            }
        }
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
