// UI utility functions for VigiChat
class UIManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeComponents();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.querySelector('.search-container input');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearch.bind(this));
            
            // Update placeholder based on active tab
            this.updateSearchPlaceholder();
        }

        // Contacts search functionality
        const contactsSearchInput = document.getElementById('contacts-search');
        if (contactsSearchInput) {
            contactsSearchInput.addEventListener('input', (event) => {
                const query = event.target.value.toLowerCase();
                this.searchContacts(query);
            });
        }

        // Setup robust tab change detection
        this.setupTabChangeDetection();

        // Chat item selection
        const chatItems = document.querySelectorAll('.chat-item');
        chatItems.forEach(item => {
            item.addEventListener('click', this.selectChat.bind(this));
        });

        // Message input
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('keypress', this.handleMessageInput.bind(this));
            
        }


        // Send button
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', this.sendMessage.bind(this));
        }
    }

    initializeComponents() {
        this.updateOnlineStatus();
        this.scrollToBottom();
        this.updateSearchVisibility();
    }

    handleSearch(event) {
        const query = event.target.value.toLowerCase();
        const activeTab = this.getActiveTab();
        
        if (activeTab === 'chats') {
            this.searchChats(query);
        } else if (activeTab === 'contacts') {
            this.searchContacts(query);
        }
    }

    searchChats(query) {
        const chatItems = document.querySelectorAll('.chat-item');
        
        chatItems.forEach(item => {
            const name = item.querySelector('.chat-name')?.textContent.toLowerCase() || '';
            const message = item.querySelector('.chat-last-msg')?.textContent.toLowerCase() || '';
            
            if (name.includes(query) || message.includes(query)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    searchContacts(query) {
        const contactItems = document.querySelectorAll('.contact-item');
        
        contactItems.forEach(item => {
            const name = item.querySelector('.contact-name')?.textContent.toLowerCase() || '';
            const username = item.querySelector('.contact-username')?.textContent.toLowerCase() || '';
            const email = item.querySelector('.contact-email')?.textContent.toLowerCase() || '';
            
            if (name.includes(query) || username.includes(query) || email.includes(query)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    selectChat(event) {
        const chatItems = document.querySelectorAll('.chat-item');
        chatItems.forEach(item => item.classList.remove('active'));
        
        event.currentTarget.classList.add('active');
        
        // Update chat header
        const chatName = event.currentTarget.querySelector('.chat-name').textContent;
        const chatImg = event.currentTarget.querySelector('.chat-img').src;
        
        const headerName = document.querySelector('.chat-header h3');
        const headerImg = document.querySelector('.chat-header .chat-img');
        
        if (headerName) headerName.textContent = chatName;
        if (headerImg) headerImg.src = chatImg;
    }

    handleMessageInput(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
        // Shift+Enter permite nueva línea (comportamiento de WhatsApp)
    }

    sendMessage() {
        const messageInput = document.getElementById('message-input');
        const message = messageInput && messageInput.value ? messageInput.value.trim() : '';
        
        if (message) {
            // Check if we have Chat/ChatManager for real messaging
            const chatManager = window.Chat || window.ChatManager || window.chatManager;
            if (chatManager && chatManager.currentConversation) {
                // Use the real chat system to send message
                chatManager.sendMessage(message.trim());
            } else {
                // Fallback for demo mode - just add locally
                this.addMessage(message, true);
            }
            
            messageInput.value = '';
            this.scrollToBottom();
        }
    }

    addMessage(text, isSent = false) {
        const messagesContainer = document.querySelector('.messages-container');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        if (isSent) {
            messageDiv.innerHTML = `
                <div class="message-content">
                    <div class="message-text">${text}</div>
                    <span class="message-time">${timeStr}</span>
                    <span class="message-status">
                        <i class="fas fa-check-double"></i>
                    </span>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <img src="/images/user-placeholder-32.svg" alt="Contact" class="message-avatar">
                <div class="message-content">
                    <div class="message-text">${text}</div>
                    <span class="message-time">${timeStr}</span>
                </div>
            `;
        }
        
        // Remove typing indicator
        const typingIndicator = document.querySelector('.message.typing');
        if (typingIndicator) {
            typingIndicator.remove();
        }
        
        messagesContainer.appendChild(messageDiv);
    }

    scrollToBottom() {
        const messagesContainer = document.querySelector('.messages-container');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    updateOnlineStatus() {
        const onlineIndicator = document.querySelector('.online-indicator');
        if (onlineIndicator) {
            onlineIndicator.classList.add('online');
        }
    }

    showTypingIndicator() {
        const messagesContainer = document.querySelector('.messages-container');
        const existingTyping = document.querySelector('.message.typing');
        
        if (!existingTyping) {
            const typingDiv = document.createElement('div');
            typingDiv.className = 'message received typing';
            typingDiv.innerHTML = `
                <img src="/images/user-placeholder-32.svg" alt="Contact" class="message-avatar">
                <div class="message-content">
                    <div class="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            `;
            messagesContainer.appendChild(typingDiv);
            this.scrollToBottom();
        }
    }

    hideTypingIndicator() {
        const typingIndicator = document.querySelector('.message.typing');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    getActiveTab() {
        const activeTabButton = document.querySelector('.tab-button.active');
        return activeTabButton ? activeTabButton.dataset.tab : 'chats';
    }

    updateSearchPlaceholder() {
        const searchInput = document.querySelector('.search-container input');
        if (!searchInput) return;

        const activeTab = this.getActiveTab();
        
        switch (activeTab) {
            case 'chats':
                searchInput.placeholder = 'Buscar chats...';
                break;
            case 'contacts':
                searchInput.placeholder = 'Buscar en contactos...';
                break;
            case 'requests':
                searchInput.placeholder = 'Buscar solicitudes...';
                break;
            default:
                searchInput.placeholder = 'Buscar...';
        }
    }

    updateSearchVisibility() {
        const searchContainer = document.querySelector('.search-container');
        if (!searchContainer) return;

        const activeTab = this.getActiveTab();
        
        // Clear search input when switching tabs
        const searchInput = searchContainer.querySelector('input');
        if (searchInput) {
            searchInput.value = '';
        }
        
        if (activeTab === 'contacts' || activeTab === 'requests' || activeTab === 'calls') {
            // Hide search input for contacts, requests and calls tabs
            searchContainer.classList.add('hiding');
            searchContainer.classList.remove('showing');
            
            // After animation completes, hide completely
            setTimeout(() => {
                if (searchContainer.classList.contains('hiding')) {
                    searchContainer.style.display = 'none';
                }
            }, 300);
        } else {
            // Show immediately and start show animation
            searchContainer.style.display = 'flex';
            searchContainer.classList.remove('hiding');
            
            // Force reflow then add showing class
            requestAnimationFrame(() => {
                searchContainer.classList.add('showing');
            });
        }
        
        // Reset all items visibility after clearing search
        if (searchInput) {
            this.handleSearch({ target: searchInput });
        }
    }

    setupTabChangeDetection() {
        // Store current active tab to detect changes
        this.currentActiveTab = this.getActiveTab();
        
        // Method 1: Direct click event on tab buttons
        document.querySelectorAll('.tab-button').forEach(tabButton => {
            tabButton.addEventListener('click', (e) => {
                // Immediate update before any other processing
                const newTab = tabButton.dataset.tab;
                if (newTab !== this.currentActiveTab) {
                    this.currentActiveTab = newTab;
                    // Use requestAnimationFrame for smooth timing
                    requestAnimationFrame(() => {
                        this.updateSearchPlaceholder();
                        this.updateSearchVisibility();
                    });
                }
            });
        });

        // Method 2: MutationObserver to detect class changes on tab buttons
        const tabObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList.contains('tab-button') && target.classList.contains('active')) {
                        const newTab = target.dataset.tab;
                        if (newTab !== this.currentActiveTab) {
                            this.currentActiveTab = newTab;
                            requestAnimationFrame(() => {
                                this.updateSearchPlaceholder();
                                this.updateSearchVisibility();
                            });
                        }
                    }
                }
            });
        });

        // Observe all tab buttons
        document.querySelectorAll('.tab-button').forEach(tabButton => {
            tabObserver.observe(tabButton, { 
                attributes: true, 
                attributeFilter: ['class'] 
            });
        });

        // Method 3: Listen to custom tab change events (if app.js fires them)
        document.addEventListener('tab:changed', (e) => {
            const newTab = e.detail?.tabName || this.getActiveTab();
            if (newTab !== this.currentActiveTab) {
                this.currentActiveTab = newTab;
                this.updateSearchPlaceholder();
                this.updateSearchVisibility();
            }
        });

        // Method 4: Periodic check as fallback (lightweight)
        this.tabCheckInterval = setInterval(() => {
            const currentTab = this.getActiveTab();
            if (currentTab !== this.currentActiveTab) {
                this.currentActiveTab = currentTab;
                this.updateSearchPlaceholder();
                this.updateSearchVisibility();
            }
        }, 200);
    }

    // Check if we're in mobile view
    isMobileView() {
        return window.innerWidth <= 768;
    }

    // Cleanup method
    destroy() {
        if (this.tabCheckInterval) {
            clearInterval(this.tabCheckInterval);
        }
    }
}

// Initialize UI Manager when DOM is loaded and Utils is available
const initUIManager = () => {
    if (typeof Utils !== 'undefined') {
        window.uiManager = new UIManager();
    } else {
        setTimeout(initUIManager, 10);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUIManager);
} else {
    initUIManager();
}