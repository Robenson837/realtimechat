// Welcome Screen Manager - Controls when to show/hide welcome screen
class WelcomeScreenManager {
    constructor() {
        this.isFirstLoad = true;
        this.hasActiveConversation = false;
        this.welcomeScreen = null;
        this.chatComponents = {
            header: null,
            messagesContainer: null,
            messageInputContainer: null
        };
        
        this.init();
    }
    
    init() {
        // Force initial state immediately, regardless of DOM state
        this.forceInitialStateImmediate();
        
        // Then setup elements when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupElements());
        } else {
            this.setupElements();
        }
    }
    
    // Force initial state immediately - executed as soon as script loads
    forceInitialStateImmediate() {
        // Force welcome screen state immediately
        setTimeout(() => {
            this.forceInitialWelcomeState();
        }, 0);
    }
    
    setupElements() {
        this.welcomeScreen = document.getElementById('welcome-screen');
        this.chatComponents.header = document.getElementById('chat-header');
        this.chatComponents.messagesContainer = document.getElementById('messages-container');
        this.chatComponents.messageInputContainer = document.getElementById('message-input-container');
        
        // Force initial state to always show welcome screen
        this.forceInitialWelcomeState();
        
        console.log('WelcomeScreenManager initialized - welcome screen forced to show');
    }
    
    // Force initial welcome state - ensures welcome screen is visible on app start
    forceInitialWelcomeState() {
        // Force welcome screen to be visible
        if (this.welcomeScreen) {
            this.welcomeScreen.classList.remove('hidden');
        }
        
        // Force all chat components to be hidden
        Object.values(this.chatComponents).forEach(element => {
            if (element) {
                element.classList.add('hidden');
            }
        });
        
        // Reset state flags
        this.hasActiveConversation = false;
        this.isFirstLoad = true;
        
        console.log('🏠 Initial welcome state forced - all chat components hidden');
    }
    
    showWelcomeScreen() {
        if (!this.welcomeScreen) return;
        
        // Show welcome screen
        this.welcomeScreen.classList.remove('hidden');
        
        // Hide all chat components
        Object.values(this.chatComponents).forEach(element => {
            if (element) {
                element.classList.add('hidden');
            }
        });
        
        this.hasActiveConversation = false;
        console.log('Welcome screen displayed');
    }
    
    hideWelcomeScreen() {
        if (!this.welcomeScreen) return;
        
        // Only hide if there's an active conversation
        if (!this.hasActiveConversation) {
            console.log('No active conversation - keeping welcome screen visible');
            return;
        }
        
        // Hide welcome screen
        this.welcomeScreen.classList.add('hidden');
        
        // Show chat components
        Object.values(this.chatComponents).forEach(element => {
            if (element) {
                element.classList.remove('hidden');
            }
        });
        
        this.isFirstLoad = false;
        console.log('Welcome screen hidden - chat components visible');
    }
    
    setActiveConversation(hasConversation) {
        this.hasActiveConversation = hasConversation;
        
        if (hasConversation) {
            this.hideWelcomeScreen();
        } else {
            // If no conversation, show welcome screen (but only if not first load)
            if (!this.isFirstLoad) {
                this.showWelcomeScreen();
            }
        }
    }
    
    // Method to force show welcome screen (for closing conversations)
    forceShowWelcomeScreen() {
        this.hasActiveConversation = false;
        this.showWelcomeScreen();
    }
    
    // Check if welcome screen should be visible
    shouldShowWelcomeScreen() {
        return this.isFirstLoad || !this.hasActiveConversation;
    }
    
    // Get current state
    getState() {
        return {
            isFirstLoad: this.isFirstLoad,
            hasActiveConversation: this.hasActiveConversation,
            welcomeScreenVisible: this.welcomeScreen && !this.welcomeScreen.classList.contains('hidden')
        };
    }
}

// Create global instance
window.welcomeScreenManager = new WelcomeScreenManager();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WelcomeScreenManager;
}