/**
 * Progressive Scroll Manager - WhatsApp/Messenger Style
 * Ultra-optimized scroll management with cursor-based pagination
 */

class ProgressiveScrollManager {
    constructor(options = {}) {
        // Use the correct container structure from your HTML
        this.container = options.container || document.getElementById('messages-scroll');
        this.messagesContainer = options.messagesContainer || this.container;
        this.conversationId = options.conversationId || null;
        
        // Configuration
        this.config = {
            batchSize: options.batchSize || 30,
            threshold: options.threshold || 200, // pixels from top to trigger load
            loadingThreshold: options.loadingThreshold || 100,
            maxCacheSize: options.maxCacheSize || 1000,
            debounceDelay: options.debounceDelay || 150,
            scrollBufferSize: options.scrollBufferSize || 5,
            ...options.config
        };
        
        // State management
        this.state = {
            isLoading: false,
            hasMoreBefore: true,
            hasMoreAfter: false,
            currentCursor: {
                before: null,
                after: null
            },
            totalMessages: 0,
            loadedMessages: new Map(),
            scrollPosition: 0,
            isAtBottom: true,
            isAtTop: false,
            lastScrollDirection: 'down',
            scrollLocked: false,
            pendingMessages: [],
            messageCache: new Map()
        };
        
        // Performance optimizations
        this.intersectionObserver = null;
        this.resizeObserver = null;
        this.scrollDebounced = this.debounce(this.handleScroll.bind(this), this.config.debounceDelay);
        this.loadDebounced = this.debounce(this.loadMoreMessages.bind(this), 100);
        
        // Event listeners
        this.listeners = new Map();
        
        // Initialize
        this.init();
    }
    
    init() {
        // Find the exact container from your HTML structure
        if (!this.container) {
            this.container = document.getElementById('messages-scroll');
        }
        
        if (!this.container) {
            console.warn('Progressive Scroll: messages-scroll container not found');
            return;
        }
        
        // Remove smooth scroll behavior
        this.container.style.scrollBehavior = 'auto';
        
        // Set messagesContainer as the actual messages container (same as container in your case)  
        this.messagesContainer = this.container;
        
        this.setupScrollListeners();
        this.setupIntersectionObserver();
        this.createLoadingIndicators();
        
        console.log('Progressive Scroll Manager initialized for messages-scroll');
    }
    
    
    setupScrollListeners() {
        // Use passive listeners for better performance
        this.container.addEventListener('scroll', this.scrollDebounced, { passive: true });
        
        // Track scroll direction
        let lastScrollTop = 0;
        this.container.addEventListener('scroll', (e) => {
            const scrollTop = e.target.scrollTop;
            this.state.lastScrollDirection = scrollTop > lastScrollTop ? 'down' : 'up';
            lastScrollTop = scrollTop;
            
            // Update scroll state
            this.updateScrollState();
        }, { passive: true });
    }
    
    setupIntersectionObserver() {
        if (!('IntersectionObserver' in window)) {
            console.warn('IntersectionObserver not supported, falling back to scroll events');
            return;
        }
        
        // Top trigger for loading older messages
        this.topTrigger = this.createTriggerElement('top');
        this.bottomTrigger = this.createTriggerElement('bottom');
        
        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                
                const triggerType = entry.target.dataset.trigger;
                
                if (triggerType === 'top' && this.state.hasMoreBefore && !this.state.isLoading) {
                    this.loadOlderMessages();
                } else if (triggerType === 'bottom' && this.state.hasMoreAfter && !this.state.isLoading) {
                    this.loadNewerMessages();
                }
            });
        }, {
            root: this.container,
            rootMargin: `${this.config.threshold}px 0px`,
            threshold: 0.1
        });
        
        // Add triggers to container
        if (this.messagesContainer.firstChild) {
            this.messagesContainer.insertBefore(this.topTrigger, this.messagesContainer.firstChild);
        } else {
            this.messagesContainer.appendChild(this.topTrigger);
        }
        this.messagesContainer.appendChild(this.bottomTrigger);
        
        // Observe triggers
        this.intersectionObserver.observe(this.topTrigger);
        this.intersectionObserver.observe(this.bottomTrigger);
    }
    
    setupResizeObserver() {
        if (!('ResizeObserver' in window)) return;
        
        this.resizeObserver = new ResizeObserver((entries) => {
            // Handle container resize
            this.updateScrollState();
        });
        
        this.resizeObserver.observe(this.container);
    }
    
    createTriggerElement(type) {
        const trigger = document.createElement('div');
        trigger.className = `scroll-trigger scroll-trigger-${type}`;
        trigger.dataset.trigger = type;
        trigger.style.cssText = `
            height: 1px;
            width: 100%;
            position: relative;
            pointer-events: none;
            opacity: 0;
        `;
        return trigger;
    }
    
    createLoadingIndicators() {
        // Top loading indicator
        this.topLoader = document.createElement('div');
        this.topLoader.className = 'progressive-loader progressive-loader-top hidden';
        this.topLoader.innerHTML = `
            <div class="loader-content">
                <div class="loader-spinner"></div>
                <span class="loader-text">Cargando mensajes anteriores...</span>
            </div>
        `;
        
        // Bottom loading indicator
        this.bottomLoader = document.createElement('div');
        this.bottomLoader.className = 'progressive-loader progressive-loader-bottom hidden';
        this.bottomLoader.innerHTML = `
            <div class="loader-content">
                <div class="loader-spinner"></div>
                <span class="loader-text">Cargando mensajes...</span>
            </div>
        `;
        
        // Insert loaders
        if (this.messagesContainer.firstChild) {
            this.messagesContainer.insertBefore(this.topLoader, this.messagesContainer.firstChild);
        } else {
            this.messagesContainer.appendChild(this.topLoader);
        }
        this.messagesContainer.appendChild(this.bottomLoader);
    }
    
    handleScroll(e) {
        if (this.state.scrollLocked) return;
        
        const scrollTop = e.target.scrollTop;
        const scrollHeight = e.target.scrollHeight;
        const clientHeight = e.target.clientHeight;
        
        // Update scroll position
        this.state.scrollPosition = scrollTop;
        
        // More precise threshold checking
        const topThreshold = 100; // pixels from top
        const bottomThreshold = 100; // pixels from bottom
        
        // Check if at top or bottom with stricter thresholds
        this.state.isAtTop = scrollTop <= topThreshold;
        this.state.isAtBottom = (scrollTop + clientHeight) >= (scrollHeight - bottomThreshold);
        
        // Only trigger loading if user is actually scrolling near the boundaries
        // AND we have more messages AND we're not currently loading
        if (this.state.isAtTop && 
            this.state.hasMoreBefore && 
            !this.state.isLoading &&
            this.state.lastScrollDirection === 'up') {
            
            console.log('Loading older messages (progressive scroll)');
            this.loadDebounced('before');
        }
        
        // Emit scroll events
        this.emit('scroll', {
            scrollTop,
            scrollHeight,
            clientHeight,
            isAtTop: this.state.isAtTop,
            isAtBottom: this.state.isAtBottom,
            direction: this.state.lastScrollDirection,
            // Add percentage for debugging
            scrollPercentage: Math.round((scrollTop / (scrollHeight - clientHeight)) * 100)
        });
    }
    
    updateScrollState() {
        if (!this.container) return;
        
        const scrollTop = this.container.scrollTop;
        const scrollHeight = this.container.scrollHeight;
        const clientHeight = this.container.clientHeight;
        
        this.state.isAtTop = scrollTop <= this.config.loadingThreshold;
        this.state.isAtBottom = (scrollTop + clientHeight) >= (scrollHeight - this.config.loadingThreshold);
        this.state.scrollPosition = scrollTop;
    }
    
    async loadInitialMessages() {
        if (this.state.isLoading || !this.conversationId) return;
        
        this.state.isLoading = true;
        this.showLoader('bottom');
        
        try {
            const response = await fetch(`/api/messages/latest/${this.conversationId}?limit=${this.config.batchSize}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Failed to load initial messages');
            
            const data = await response.json();
            
            if (data.success) {
                const { messages, hasMore, totalCount, cursor } = data.data;
                
                // Update state
                this.state.hasMoreBefore = hasMore;
                this.state.hasMoreAfter = false;
                this.state.totalMessages = totalCount;
                this.state.currentCursor = cursor;
                
                // Render messages
                this.renderMessages(messages, 'replace');
                
                // Scroll to bottom
                this.scrollToBottom(false);
                
                this.emit('messagesLoaded', { messages, type: 'initial', totalCount });
            }
        } catch (error) {
            console.error('Failed to load initial messages:', error);
            this.emit('loadError', error);
        } finally {
            this.state.isLoading = false;
            this.hideLoader('bottom');
        }
    }
    
    async loadOlderMessages() {
        return this.loadMoreMessages('before');
    }
    
    async loadNewerMessages() {
        return this.loadMoreMessages('after');
    }
    
    async loadMoreMessages(direction = 'before') {
        if (this.state.isLoading || !this.conversationId) return;
        
        // Check if there are more messages in the requested direction
        if (direction === 'before' && !this.state.hasMoreBefore) return;
        if (direction === 'after' && !this.state.hasMoreAfter) return;
        
        this.state.isLoading = true;
        this.showLoader(direction === 'before' ? 'top' : 'bottom');
        
        // Store current scroll position for restoration
        const scrollRestoreInfo = this.prepareScrollRestore();
        
        try {
            const cursor = direction === 'before' ? this.state.currentCursor.before : this.state.currentCursor.after;
            const params = new URLSearchParams({
                [direction]: cursor || '',
                limit: this.config.batchSize,
                direction
            });
            
            const response = await fetch(`/api/messages/progressive/${this.conversationId}?${params}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error(`Failed to load ${direction} messages`);
            
            const data = await response.json();
            
            if (data.success) {
                const { messages, hasMore, cursor, stats, performance } = data.data;
                
                // Update state
                if (direction === 'before') {
                    this.state.hasMoreBefore = hasMore;
                    if (cursor.before) this.state.currentCursor.before = cursor.before;
                } else {
                    this.state.hasMoreAfter = hasMore;
                    if (cursor.after) this.state.currentCursor.after = cursor.after;
                }
                
                // Update statistics
                if (stats) {
                    this.state.totalMessages = stats.totalMessages || this.state.totalMessages;
                }
                
                // Render messages
                this.renderMessages(messages, direction === 'before' ? 'prepend' : 'append');
                
                // Restore scroll position for older messages
                if (direction === 'before' && messages.length > 0) {
                    this.restoreScrollPosition(scrollRestoreInfo);
                }
                
                this.emit('messagesLoaded', { 
                    messages, 
                    type: direction, 
                    performance,
                    hasMore,
                    totalMessages: this.state.totalMessages 
                });
            }
        } catch (error) {
            console.error(`Failed to load ${direction} messages:`, error);
            this.emit('loadError', error);
        } finally {
            this.state.isLoading = false;
            this.hideLoader(direction === 'before' ? 'top' : 'bottom');
        }
    }
    
    prepareScrollRestore() {
        const container = this.container;
        return {
            scrollTop: container.scrollTop,
            scrollHeight: container.scrollHeight,
            clientHeight: container.clientHeight
        };
    }
    
    restoreScrollPosition(restoreInfo) {
        // Calculate new scroll position to maintain user's view
        const container = this.container;
        const heightDifference = container.scrollHeight - restoreInfo.scrollHeight;
        
        if (heightDifference > 0) {
            // Set new scroll position
            container.scrollTop = restoreInfo.scrollTop + heightDifference;
        }
    }
    
    renderMessages(messages, mode = 'append') {
        if (!messages || messages.length === 0) return;
        
        // Cache messages for performance
        messages.forEach(msg => {
            this.state.messageCache.set(msg._id, msg);
        });
        
        // Emit render event for external handling
        this.emit('renderMessages', { messages, mode });
    }
    
    addMessage(message, options = {}) {
        if (!message) return;
        
        // Cache message
        this.state.messageCache.set(message._id, message);
        
        // Update cursor if this is the latest message
        if (options.isLatest) {
            this.state.currentCursor.after = message.createdAt;
        }
        
        // Emit add message event
        this.emit('addMessage', { message, options });
        
        // Auto-scroll to bottom if user is at bottom
        if (this.state.isAtBottom && options.autoScroll !== false) {
            this.scrollToBottom(options.smooth !== false);
        }
    }
    
    scrollToBottom(smooth = true) {
        if (!this.container) return;
        
        const scrollOptions = {
            top: this.container.scrollHeight,
            behavior: smooth ? 'smooth' : 'instant'
        };
        
        this.container.scrollTo(scrollOptions);
        this.state.isAtBottom = true;
    }
    
    scrollToTop(smooth = true) {
        if (!this.container) return;
        
        const scrollOptions = {
            top: 0,
            behavior: smooth ? 'smooth' : 'instant'
        };
        
        this.container.scrollTo(scrollOptions);
        this.state.isAtTop = true;
    }
    
    scrollToMessage(messageId, highlight = true) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageElement) return false;
        
        messageElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        
        if (highlight) {
            messageElement.classList.add('message-highlighted');
            setTimeout(() => {
                messageElement.classList.remove('message-highlighted');
            }, 2000);
        }
        
        return true;
    }
    
    showLoader(position = 'top') {
        const loader = position === 'top' ? this.topLoader : this.bottomLoader;
        if (loader) {
            loader.classList.remove('hidden');
        }
    }
    
    hideLoader(position = 'top') {
        const loader = position === 'top' ? this.topLoader : this.bottomLoader;
        if (loader) {
            loader.classList.add('hidden');
        }
    }
    
    setConversation(conversationId) {
        if (this.conversationId === conversationId) return;
        
        // Clear state for new conversation
        this.conversationId = conversationId;
        this.state = {
            ...this.state,
            hasMoreBefore: true,
            hasMoreAfter: false,
            currentCursor: { before: null, after: null },
            totalMessages: 0,
            messageCache: new Map(),
            isAtBottom: true,
            isAtTop: false
        };
        
        // Load initial messages
        this.loadInitialMessages();
    }
    
    refresh() {
        // Clear cache and reload
        this.state.messageCache.clear();
        this.state.currentCursor = { before: null, after: null };
        this.state.hasMoreBefore = true;
        this.state.hasMoreAfter = false;
        
        this.loadInitialMessages();
    }
    
    // Event system
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }
    
    emit(event, data) {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event callback for ${event}:`, error);
            }
        });
    }
    
    // Utility functions
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Cleanup
    destroy() {
        // Remove event listeners
        if (this.container) {
            this.container.removeEventListener('scroll', this.scrollDebounced);
        }
        
        // Disconnect observers
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        // Clear listeners
        this.listeners.clear();
        
        // Clear cache
        this.state.messageCache.clear();
        
        console.log('Progressive Scroll Manager destroyed');
    }
    
    // Debug helpers
    getState() {
        return { ...this.state };
    }
    
    getConfig() {
        return { ...this.config };
    }
    
    getStats() {
        return {
            cachedMessages: this.state.messageCache.size,
            totalMessages: this.state.totalMessages,
            isLoading: this.state.isLoading,
            hasMoreBefore: this.state.hasMoreBefore,
            hasMoreAfter: this.state.hasMoreAfter,
            scrollPosition: this.state.scrollPosition,
            isAtTop: this.state.isAtTop,
            isAtBottom: this.state.isAtBottom
        };
    }
}

// Export for use
window.ProgressiveScrollManager = ProgressiveScrollManager;

// Simple initialization function
window.initProgressiveScrollNow = function() {
    const container = document.getElementById('messages-scroll');
    if (!container) {
        console.log('messages-scroll container not found');
        return false;
    }
    
    if (window.progressiveScrollManager) {
        window.progressiveScrollManager.destroy();
    }
    
    window.progressiveScrollManager = new ProgressiveScrollManager({
        container: container
    });
    
    return true;
};

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('messages-scroll');
    if (container && !window.progressiveScrollManager) {
        console.log('Auto-initializing Progressive Scroll Manager');
        window.progressiveScrollManager = new ProgressiveScrollManager();
    }
});