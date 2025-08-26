/**
 * Progressive Scroll - Fixed Version
 * Simple, working implementation focused on #messages-scroll
 */

class ProgressiveScrollFixed {
    constructor() {
        this.isLoading = false;
        this.hasMoreMessages = true;
        this.currentConversationId = null;
        this.firstMessageCursor = null;
        this.batchSize = 30;
        this.scrollThreshold = 150;
        this.messagesContainer = null;
        
        this.init();
    }
    
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }
    
    setup() {
        // Find the ACTUAL messages container
        this.messagesContainer = document.getElementById('messages-scroll');
        
        if (!this.messagesContainer) {
            console.error('CRITICAL: #messages-scroll not found');
            return;
        }
        
        // Attach scroll listener
        this.attachScrollListener();
        this.setupLoadingIndicator();
    }
    
    attachScrollListener() {
        if (!this.messagesContainer) return;
        
        // Debounced scroll handler
        let scrollTimeout;
        this.messagesContainer.addEventListener('scroll', (e) => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.handleScroll(e);
            }, 100);
        }, { passive: true });
    }
    
    handleScroll(event) {
        const container = event.target;
        const scrollTop = container.scrollTop;
        
        // Check if near top and conditions are met
        if (scrollTop <= this.scrollThreshold && 
            !this.isLoading && 
            this.hasMoreMessages && 
            this.currentConversationId) {
            
            this.loadOlderMessages();
        }
    }
    
    async loadOlderMessages() {
        if (this.isLoading || !this.hasMoreMessages || !this.currentConversationId) {
            return;
        }
        
        this.isLoading = true;
        this.showLoadingIndicator();
        
        try {
            const params = new URLSearchParams({
                limit: this.batchSize,
                direction: 'before'
            });
            
            if (this.firstMessageCursor) {
                params.set('before', this.firstMessageCursor);
            }
            
            const response = await fetch(
                `/api/messages/conversation/${this.currentConversationId}/paginated?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.data.messages.length > 0) {
                await this.prependMessages(data.data.messages);
                this.firstMessageCursor = data.data.messages[0].createdAt;
                this.hasMoreMessages = data.data.hasMore;
            } else {
                this.hasMoreMessages = false;
            }
            
        } catch (error) {
            console.error('Error loading older messages:', error);
            this.showErrorMessage();
        } finally {
            this.isLoading = false;
            this.hideLoadingIndicator();
        }
    }
    
    async prependMessages(messages) {
        const container = this.messagesContainer;
        if (!container) return;
        
        // Save current scroll position
        const oldScrollHeight = container.scrollHeight;
        const oldScrollTop = container.scrollTop;
        
        // Create messages elements
        const fragment = document.createDocumentFragment();
        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            if (messageElement) {
                fragment.appendChild(messageElement);
            }
        });
        
        // Insert at the beginning
        container.insertBefore(fragment, container.firstChild);
        
        // Maintain scroll position
        await new Promise(resolve => requestAnimationFrame(resolve));
        const newScrollHeight = container.scrollHeight;
        const scrollDifference = newScrollHeight - oldScrollHeight;
        container.scrollTop = oldScrollTop + scrollDifference;
    }
    
    createMessageElement(message) {
        // Use existing message creation if available
        if (window.chatManager && window.chatManager.createMessageElement) {
            return window.chatManager.createMessageElement(message);
        }
        
        // Basic fallback
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sender._id === window.currentUserId ? 'sent' : 'received'}`;
        messageDiv.setAttribute('data-message-id', message._id);
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">${this.escapeHtml(message.content.text)}</div>
                <div class="message-time">${new Date(message.createdAt).toLocaleTimeString()}</div>
            </div>
        `;
        return messageDiv;
    }
    
    setupLoadingIndicator() {
        const existing = document.getElementById('loading-older-messages');
        if (existing) {
            this.loadingIndicator = existing;
            return;
        }
        
        const indicator = document.createElement('div');
        indicator.id = 'loading-older-messages';
        indicator.className = 'loading-older-messages';
        indicator.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <span class="loading-text">Cargando mensajes anteriores...</span>
            </div>
        `;
        indicator.style.display = 'none';
        
        if (this.messagesContainer) {
            this.messagesContainer.insertBefore(indicator, this.messagesContainer.firstChild);
        }
        
        this.loadingIndicator = indicator;
    }
    
    showLoadingIndicator() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'flex';
        }
    }
    
    hideLoadingIndicator() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'none';
        }
    }
    
    showErrorMessage() {
        if (this.loadingIndicator) {
            const text = this.loadingIndicator.querySelector('.loading-text');
            if (text) {
                text.textContent = 'Error al cargar mensajes';
                text.style.color = '#ef4444';
            }
        }
    }
    
    // Public API
    setConversation(conversationId, initialMessages = []) {
        this.currentConversationId = conversationId;
        this.hasMoreMessages = true;
        this.isLoading = false;
        
        if (initialMessages.length > 0) {
            this.firstMessageCursor = initialMessages[0].createdAt;
        } else {
            this.firstMessageCursor = null;
        }
        
        // Reset error state
        if (this.loadingIndicator) {
            const text = this.loadingIndicator.querySelector('.loading-text');
            if (text) {
                text.textContent = 'Cargando mensajes anteriores...';
                text.style.color = '';
            }
        }
    }
    
    reset() {
        this.currentConversationId = null;
        this.hasMoreMessages = true;
        this.isLoading = false;
        this.firstMessageCursor = null;
        this.hideLoadingIndicator();
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
    
    // Debug method
    getStatus() {
        return {
            isLoading: this.isLoading,
            hasMoreMessages: this.hasMoreMessages,
            currentConversationId: this.currentConversationId,
            firstMessageCursor: this.firstMessageCursor,
            containerFound: !!this.messagesContainer,
            containerElement: this.messagesContainer?.id
        };
    }
}

// Initialize
const progressiveScrollFixed = new ProgressiveScrollFixed();
window.progressiveScrollFixed = progressiveScrollFixed;

// Test function
window.testProgressiveScrollFixed = function() {
    const status = progressiveScrollFixed.getStatus();
    console.log('Progressive Scroll Fixed Status:', status);
    
    if (status.currentConversationId) {
        progressiveScrollFixed.loadOlderMessages();
    } else {
        console.log('No active conversation set');
    }
};