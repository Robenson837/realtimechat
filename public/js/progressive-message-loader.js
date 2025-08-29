/**
 * Progressive Message Loader - Carga incremental de mensajes para scroll infinito
 * Compatible con vigichat/Messenger behavior
 */

class ProgressiveMessageLoader {
    constructor() {
        this.isLoading = false;
        this.hasMoreMessages = true;
        this.currentConversationId = null;
        this.messageCache = new Map();
        this.lastLoadedCursor = null;
        this.firstMessageCursor = null;
        this.scrollThreshold = this.getOptimalScrollThreshold();
        this.messagesContainer = null;
        this.loadingIndicator = null;
        this.batchSize = this.getOptimalBatchSize();
        this.loadQueue = [];
        this.performanceMetrics = new Map();
        this.retryAttempts = 0;
        this.maxRetries = 3;
        this.loadingStartTime = null;
        this.totalMessages = 0;
        this.loadedMessages = 0;
        
        // Device-specific optimizations
        this.isMobile = /Mobi|Android/i.test(navigator.userAgent);
        this.isLowEndDevice = this.detectLowEndDevice();
        this.connectionSpeed = this.detectConnectionSpeed();
        
        // Referencias a otros managers
        this.progressiveScroll = window.progressiveScroll;
        this.messageCache = window.messageCache;
        
        // Performance optimization
        this.debouncedScroll = this.debounce(this.handleScroll.bind(this), 100);
        this.throttledLoad = this.throttle(this.loadOlderMessages.bind(this), 500);
        
        this.init();
    }
    
    getOptimalScrollThreshold() {
        // Adjust based on device and viewport
        const viewport = window.innerHeight;
        if (this.isMobile) {
            return Math.min(viewport * 0.15, 150); // 15% of viewport or 150px max
        }
        return Math.min(viewport * 0.2, 200); // 20% of viewport or 200px max
    }
    
    getOptimalBatchSize() {
        // Adjust batch size based on device capabilities
        if (this.isLowEndDevice) return 20;
        if (this.isMobile) return 25;
        return 30;
    }
    
    detectLowEndDevice() {
        // Detect low-end devices for performance optimization
        return navigator.hardwareConcurrency <= 2 || navigator.deviceMemory <= 2;
    }
    
    detectConnectionSpeed() {
        // Estimate connection speed for adaptive loading
        if (navigator.connection) {
            const conn = navigator.connection;
            return {
                effectiveType: conn.effectiveType,
                downlink: conn.downlink,
                rtt: conn.rtt
            };
        }
        return { effectiveType: '4g', downlink: 10, rtt: 50 }; // Default
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
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
        }
    }
    
    init() {
        this.setupLoadingIndicator();
        this.attachScrollListener();
        console.log('✅ Progressive Message Loader initialized');
    }
    
    setupLoadingIndicator() {
        // Crear indicador de carga si no existe
        this.loadingIndicator = document.getElementById('loading-older-messages');
        if (!this.loadingIndicator) {
            this.loadingIndicator = this.createLoadingIndicator();
        }
    }
    
    createLoadingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'loading-older-messages';
        indicator.className = 'loading-older-messages';
        indicator.setAttribute('role', 'status');
        indicator.setAttribute('aria-live', 'polite');
        
        indicator.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner" aria-hidden="true"></div>
                <span class="loading-text">Cargando mensajes anteriores...</span>
                <span class="loading-progress" aria-live="polite"></span>
                <div class="loading-progress-bar">
                    <div class="loading-progress-fill"></div>
                </div>
            </div>
        `;
        indicator.style.display = 'none';
        
        // Enhanced positioning with scroll consideration
        const messagesContainer = this.getMessagesContainer();
        if (messagesContainer) {
            // Create a wrapper for better positioning
            const wrapper = document.createElement('div');
            wrapper.className = 'loading-indicator-wrapper';
            wrapper.appendChild(indicator);
            
            messagesContainer.insertBefore(wrapper, messagesContainer.firstChild);
        }
        
        return indicator;
    }
    
    getMessagesContainer() {
        if (!this.messagesContainer) {
            this.messagesContainer = document.querySelector('#messages-scroll') ||
                                   document.querySelector('.messages-container') ||
                                   document.querySelector('.messages-scroll');
        }
        return this.messagesContainer;
    }
    
    attachScrollListener() {
        const container = this.getMessagesContainer();
        if (!container) return;
        
        // Enhanced scroll listener with performance optimizations
        container.addEventListener('scroll', this.debouncedScroll, { passive: true });
        
        // Add intersection observer for more accurate detection
        if ('IntersectionObserver' in window) {
            this.setupIntersectionObserver(container);
        }
        
        // Add resize listener for responsive adjustments
        window.addEventListener('resize', this.debounce(() => {
            this.scrollThreshold = this.getOptimalScrollThreshold();
        }, 250), { passive: true });
        
        console.log('Enhanced progressive scroll listener attached');
    }
    
    setupIntersectionObserver(container) {
        // Create sentinel element at the top for precise load triggering
        const sentinel = document.createElement('div');
        sentinel.className = 'scroll-sentinel';
        sentinel.style.height = '1px';
        sentinel.style.position = 'absolute';
        sentinel.style.top = '0';
        sentinel.style.visibility = 'hidden';
        
        container.insertBefore(sentinel, container.firstChild);
        
        this.intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !this.isLoading && this.hasMoreMessages) {
                        this.throttledLoad();
                    }
                });
            },
            {
                root: container,
                rootMargin: `${this.scrollThreshold}px 0px 0px 0px`,
                threshold: 0
            }
        );
        
        this.intersectionObserver.observe(sentinel);
        this.scrollSentinel = sentinel;
    }
    
    handleScroll(event) {
        const container = event.target;
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        
        // Enhanced scroll detection with momentum consideration
        const isNearTop = scrollTop <= this.scrollThreshold;
        const scrollDirection = this.getScrollDirection(scrollTop);
        
        // Update performance metrics
        this.updateScrollMetrics(scrollTop, scrollHeight, clientHeight);
        
        // Load older messages with enhanced conditions
        if (isNearTop && 
            !this.isLoading && 
            this.hasMoreMessages && 
            this.currentConversationId &&
            scrollDirection === 'up') {
            
            this.throttledLoad();
        }
        
        // Update scroll position for direction detection
        this.lastScrollTop = scrollTop;
    }
    
    getScrollDirection(currentScrollTop) {
        if (!this.lastScrollTop) {
            this.lastScrollTop = currentScrollTop;
            return 'neutral';
        }
        
        const direction = currentScrollTop < this.lastScrollTop ? 'up' : 'down';
        return direction;
    }
    
    updateScrollMetrics(scrollTop, scrollHeight, clientHeight) {
        const scrollPercentage = scrollTop / (scrollHeight - clientHeight) * 100;
        this.performanceMetrics.set('scrollPercentage', scrollPercentage);
        this.performanceMetrics.set('lastScrollUpdate', Date.now());
    }
    
    async loadOlderMessages() {
        if (this.isLoading || !this.hasMoreMessages || !this.currentConversationId) {
            return;
        }
        
        this.isLoading = true;
        this.loadingStartTime = performance.now();
        this.showLoadingIndicator();
        
        try {
            const loadParams = this.buildLoadParams();
            
            console.log('Loading older messages with enhanced params:', loadParams);
            
            const response = await this.fetchWithRetry(
                `/api/messages/conversation/${this.currentConversationId}/paginated?${loadParams}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json',
                        'X-Request-Source': 'progressive-loader',
                        'X-Device-Type': this.isMobile ? 'mobile' : 'desktop',
                        'X-Connection-Type': this.connectionSpeed.effectiveType
                    }
                }
            );
            
            const data = await response.json();
            
            if (data.success) {
                await this.handleSuccessfulLoad(data);
            } else {
                throw new Error(data.message || 'Failed to load messages');
            }
            
        } catch (error) {
            await this.handleLoadError(error);
        } finally {
            this.isLoading = false;
            this.hideLoadingIndicator();
            this.recordLoadMetrics();
        }
    }
    
    buildLoadParams() {
        const params = new URLSearchParams({
            limit: this.batchSize,
            direction: 'before'
        });
        
        if (this.firstMessageCursor) {
            params.set('before', this.firstMessageCursor);
        }
        
        // Add performance hints
        if (this.isLowEndDevice) {
            params.set('optimize', 'low-end');
        }
        
        return params.toString();
    }
    
    async fetchWithRetry(url, options, attempt = 1) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            this.retryAttempts = 0; // Reset on success
            return response;
        } catch (error) {
            if (attempt < this.maxRetries && this.shouldRetry(error)) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
                console.log(`Retrying load in ${delay}ms (attempt ${attempt + 1})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchWithRetry(url, options, attempt + 1);
            }
            throw error;
        }
    }
    
    shouldRetry(error) {
        // Retry on network errors or temporary server errors
        return error.message.includes('fetch') || 
               error.message.includes('500') || 
               error.message.includes('502') || 
               error.message.includes('503');
    }
    
    async handleSuccessfulLoad(data) {
        const { messages, hasMore, pagination, conversationMeta } = data.data;
        
        if (messages.length > 0) {
            await this.prependMessages(messages);
            this.firstMessageCursor = messages[0].createdAt;
            this.hasMoreMessages = hasMore;
            this.loadedMessages += messages.length;
            
            // Update total messages estimate
            if (conversationMeta && conversationMeta.totalEstimate) {
                this.totalMessages = conversationMeta.totalEstimate === 'more' 
                    ? this.loadedMessages + 50 // Estimate more
                    : conversationMeta.totalEstimate;
            }
            
            // Enhanced cache update
            this.updateMessageCache(messages, pagination);
            
            // Update progress indicator
            this.updateProgress();
            
            console.log('Successfully loaded batch:', {
                count: messages.length,
                hasMore,
                totalLoaded: this.loadedMessages,
                totalEstimate: this.totalMessages
            });
        } else {
            this.hasMoreMessages = false;
        }
    }
    
    async handleLoadError(error) {
        console.error('Error loading older messages:', error);
        this.retryAttempts++;
        
        if (this.retryAttempts < this.maxRetries) {
            this.showRetryMessage(`Error al cargar mensajes. Reintentando... (${this.retryAttempts}/${this.maxRetries})`);
        } else {
            this.showErrorMessage('Error al cargar mensajes anteriores. Por favor, recarga la página.');
        }
    }
    
    updateMessageCache(messages, pagination) {
        if (this.messageCache && this.messageCache.addMessages) {
            this.messageCache.addMessages(this.currentConversationId, messages, {
                cursor: pagination.nextCursor,
                hasMore: pagination.hasMore,
                timestamp: Date.now()
            });
        }
    }
    
    recordLoadMetrics() {
        if (this.loadingStartTime) {
            const loadTime = performance.now() - this.loadingStartTime;
            this.performanceMetrics.set('lastLoadTime', loadTime);
            this.performanceMetrics.set('averageLoadTime', 
                (this.performanceMetrics.get('averageLoadTime') || 0 + loadTime) / 2
            );
        }
    }
    
    async prependMessages(messages) {
        const container = this.getMessagesContainer();
        if (!container) return;
        
        // Guardar posición actual para mantener scroll
        const currentScrollHeight = container.scrollHeight;
        const currentScrollTop = container.scrollTop;
        
        // Crear fragmento para mejorar rendimiento
        const fragment = document.createDocumentFragment();
        
        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            if (messageElement) {
                fragment.appendChild(messageElement);
            }
        });
        
        // Insertar después del loading indicator
        const firstMessage = container.querySelector('.message');
        if (firstMessage) {
            container.insertBefore(fragment, firstMessage);
        } else {
            container.appendChild(fragment);
        }
        
        // Mantener posición de scroll relativa
        await this.maintainScrollPosition(currentScrollHeight, currentScrollTop);
        
        // Aplicar animación sutil
        this.animateNewMessages();
        
        console.log('✅ Prepended messages and maintained scroll position');
    }
    
    async maintainScrollPosition(oldScrollHeight, oldScrollTop) {
        const container = this.getMessagesContainer();
        if (!container) return;
        
        // Enhanced scroll position maintenance with smooth transition
        await new Promise(resolve => requestAnimationFrame(() => {
            requestAnimationFrame(resolve); // Double RAF for better DOM update
        }));
        
        const newScrollHeight = container.scrollHeight;
        const scrollDifference = newScrollHeight - oldScrollHeight;
        const newScrollTop = oldScrollTop + scrollDifference;
        
        // Smooth scroll position adjustment
        if (this.isMobile || this.isLowEndDevice) {
            // Instant for mobile/low-end devices
            container.scrollTop = newScrollTop;
        } else {
            // Smooth adjustment for desktop
            container.scrollTo({
                top: newScrollTop,
                behavior: 'auto' // Use auto for precise positioning
            });
        }
        
        // Update sentinel position if using intersection observer
        if (this.scrollSentinel) {
            this.updateSentinelPosition();
        }
        
        console.log('Enhanced scroll position maintained:', {
            oldHeight: oldScrollHeight,
            newHeight: newScrollHeight,
            difference: scrollDifference,
            newScrollTop,
            device: this.isMobile ? 'mobile' : 'desktop'
        });
    }
    
    updateSentinelPosition() {
        if (this.scrollSentinel) {
            // Ensure sentinel is at the correct position after new messages
            const container = this.getMessagesContainer();
            if (container.firstElementChild !== this.scrollSentinel.parentElement) {
                container.insertBefore(this.scrollSentinel.parentElement, container.firstElementChild);
            }
        }
    }
    
    createMessageElement(message) {
        // Usar el sistema existente para crear mensajes
        if (window.createMessageElement) {
            return window.createMessageElement(message);
        }
        
        // Fallback básico
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sender._id === window.currentUserId ? 'sent' : 'received'}`;
        messageDiv.setAttribute('data-message-id', message._id);
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">${this.escapeHtml(message.content.text)}</div>
                <div class="message-time">${this.formatTime(message.createdAt)}</div>
            </div>
        `;
        return messageDiv;
    }
    
    animateNewMessages() {
        const container = this.getMessagesContainer();
        if (!container) return;
        
        const newMessages = container.querySelectorAll('.message:not(.animated)');
        newMessages.forEach((message, index) => {
            message.classList.add('animated', 'fade-in-up');
            message.style.animationDelay = `${index * 50}ms`;
        });
    }
    
    showLoadingIndicator() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'flex';
            this.loadingIndicator.classList.add('visible');
            
            // Add progress indication if available
            const progressText = this.loadingIndicator.querySelector('.loading-progress');
            if (progressText && this.totalMessages > 0) {
                const percentage = Math.min((this.loadedMessages / this.totalMessages) * 100, 100);
                progressText.textContent = `Cargando mensajes... ${Math.round(percentage)}%`;
            }
        }
    }
    
    showRetryMessage(message) {
        if (this.loadingIndicator) {
            const loadingText = this.loadingIndicator.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = message;
                loadingText.className = 'loading-text retry';
            }
        }
    }
    
    updateProgress() {
        // Update any progress indicators in the UI
        const progressIndicator = document.querySelector('.conversation-progress');
        if (progressIndicator && this.totalMessages > 0) {
            const percentage = (this.loadedMessages / this.totalMessages) * 100;
            progressIndicator.style.width = `${percentage}%`;
            progressIndicator.setAttribute('aria-valuenow', percentage.toFixed(1));
        }
    }
    
    hideLoadingIndicator() {
        if (this.loadingIndicator) {
            this.loadingIndicator.classList.remove('visible');
            setTimeout(() => {
                if (this.loadingIndicator) {
                    this.loadingIndicator.style.display = 'none';
                }
            }, 300);
        }
    }
    
    showErrorMessage(message) {
        // Mostrar toast de error
        if (window.showNotification) {
            window.showNotification(message, 'error');
        } else {
            console.error('Error:', message);
        }
    }
    
    // Enhanced API with conversation analytics
    async setConversation(conversationId, initialMessages = []) {
        console.log('Setting conversation with enhanced loader:', conversationId);
        
        // Reset state
        this.currentConversationId = conversationId;
        this.hasMoreMessages = true;
        this.isLoading = false;
        this.lastLoadedCursor = null;
        this.messagesContainer = null;
        this.loadedMessages = initialMessages.length;
        this.totalMessages = 0;
        this.retryAttempts = 0;
        
        // Set initial cursor
        if (initialMessages.length > 0) {
            this.firstMessageCursor = initialMessages[0].createdAt;
        } else {
            this.firstMessageCursor = null;
        }
        
        // Load conversation metadata for better UX
        try {
            await this.loadConversationMetadata(conversationId);
        } catch (error) {
            console.log('Could not load conversation metadata:', error.message);
        }
        
        // Enhanced container setup with performance monitoring
        await new Promise(resolve => {
            const setupContainer = () => {
                this.attachScrollListener();
                this.setupPerformanceMonitoring();
                resolve();
            };
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', setupContainer);
            } else {
                setTimeout(setupContainer, 100);
            }
        });
        
        console.log('Enhanced progressive loader configured:', {
            conversationId,
            initialMessages: initialMessages.length,
            totalEstimate: this.totalMessages,
            batchSize: this.batchSize,
            threshold: this.scrollThreshold
        });
    }
    
    async loadConversationMetadata(conversationId) {
        try {
            const response = await fetch(`/api/messages/conversation/${conversationId}/count`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.totalMessages = data.data.totalMessages;
                    console.log(`Conversation has approximately ${this.totalMessages} total messages`);
                }
            }
        } catch (error) {
            console.log('Metadata load failed, will estimate during loading:', error.message);
        }
    }
    
    setupPerformanceMonitoring() {
        // Monitor scroll performance
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        if (entry.name.includes('progressive-loader')) {
                            this.performanceMetrics.set(entry.name, entry.duration);
                        }
                    });
                });
                observer.observe({ entryTypes: ['measure'] });
                this.performanceObserver = observer;
            } catch (error) {
                console.log('Performance monitoring not available:', error.message);
            }
        }
    }
    
    reset() {
        // Enhanced reset with cleanup
        this.currentConversationId = null;
        this.hasMoreMessages = true;
        this.isLoading = false;
        this.firstMessageCursor = null;
        this.lastLoadedCursor = null;
        this.loadedMessages = 0;
        this.totalMessages = 0;
        this.retryAttempts = 0;
        
        // Clean up observers
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }
        
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
            this.performanceObserver = null;
        }
        
        // Clean up sentinel
        if (this.scrollSentinel && this.scrollSentinel.parentElement) {
            this.scrollSentinel.parentElement.remove();
            this.scrollSentinel = null;
        }
        
        // Clear metrics
        this.performanceMetrics.clear();
        
        this.hideLoadingIndicator();
        
        console.log('Progressive loader reset and cleaned up');
    }
    
    // Preload siguiente batch (opcional, para mejor UX)
    async preloadNextBatch() {
        if (this.isLoading || !this.hasMoreMessages) return;
        
        // Solo precargar si el usuario está cerca del top
        const container = this.getMessagesContainer();
        if (container && container.scrollTop <= this.scrollThreshold * 2) {
            this.loadOlderMessages();
        }
    }
    
    // Utility methods
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    // Enhanced debug and analytics helpers
    getStatus() {
        return {
            isLoading: this.isLoading,
            hasMoreMessages: this.hasMoreMessages,
            currentConversationId: this.currentConversationId,
            firstMessageCursor: this.firstMessageCursor,
            scrollThreshold: this.scrollThreshold,
            batchSize: this.batchSize,
            loadedMessages: this.loadedMessages,
            totalMessages: this.totalMessages,
            retryAttempts: this.retryAttempts,
            device: {
                isMobile: this.isMobile,
                isLowEnd: this.isLowEndDevice,
                connection: this.connectionSpeed
            },
            performance: Object.fromEntries(this.performanceMetrics),
            observers: {
                intersection: !!this.intersectionObserver,
                performance: !!this.performanceObserver,
                sentinel: !!this.scrollSentinel
            }
        };
    }
    
    getPerformanceReport() {
        const status = this.getStatus();
        const avgLoadTime = this.performanceMetrics.get('averageLoadTime') || 0;
        const scrollPercentage = this.performanceMetrics.get('scrollPercentage') || 0;
        
        return {
            summary: {
                totalMessages: this.totalMessages,
                loadedMessages: this.loadedMessages,
                loadProgress: this.totalMessages > 0 ? 
                    ((this.loadedMessages / this.totalMessages) * 100).toFixed(1) + '%' : 'Unknown',
                averageLoadTime: avgLoadTime.toFixed(2) + 'ms',
                scrollPosition: scrollPercentage.toFixed(1) + '%'
            },
            device: status.device,
            performance: status.performance,
            technical: {
                batchSize: this.batchSize,
                threshold: this.scrollThreshold,
                retries: this.retryAttempts,
                hasIntersectionObserver: status.observers.intersection
            }
        };
    }
}

// Initialize and export
const progressiveMessageLoader = new ProgressiveMessageLoader();
window.ProgressiveMessageLoader = ProgressiveMessageLoader;
window.progressiveMessageLoader = progressiveMessageLoader;

// Enhanced test and debug functions
window.testProgressiveLoader = function() {
    const status = progressiveMessageLoader.getStatus();
    const report = progressiveMessageLoader.getPerformanceReport();
    
    console.log('Enhanced Progressive Message Loader Status:');
    console.table(status);
    console.log('\nPerformance Report:');
    console.table(report.summary);
    console.log('\nDevice Info:');
    console.table(report.device);
    
    if (progressiveMessageLoader.currentConversationId) {
        console.log('Manually triggering enhanced load...');
        progressiveMessageLoader.loadOlderMessages();
    } else {
        console.log('No active conversation set');
    }
};

window.analyzeScrollPerformance = function() {
    const report = progressiveMessageLoader.getPerformanceReport();
    
    console.log('=== SCROLL PERFORMANCE ANALYSIS ===');
    console.log('Load Progress:', report.summary.loadProgress);
    console.log('Average Load Time:', report.summary.averageLoadTime);
    console.log('Current Scroll Position:', report.summary.scrollPosition);
    console.log('Device Type:', report.device.isMobile ? 'Mobile' : 'Desktop');
    console.log('Connection Speed:', report.device.connection.effectiveType);
    console.log('Low-End Device:', report.device.isLowEnd ? 'Yes' : 'No');
    console.log('Batch Size:', report.technical.batchSize);
    console.log('Scroll Threshold:', report.technical.threshold + 'px');
    console.log('Retry Attempts:', report.technical.retries);
    console.log('Uses Intersection Observer:', report.technical.hasIntersectionObserver);
    
    // Performance recommendations
    const recommendations = [];
    if (parseFloat(report.summary.averageLoadTime) > 1000) {
        recommendations.push('Consider reducing batch size for faster loads');
    }
    if (report.device.isLowEnd && report.technical.batchSize > 20) {
        recommendations.push('Reduce batch size for low-end device');
    }
    if (!report.technical.hasIntersectionObserver) {
        recommendations.push('Intersection Observer not available, using fallback scroll detection');
    }
    
    if (recommendations.length > 0) {
        console.log('\n=== RECOMMENDATIONS ===');
        recommendations.forEach(rec => console.log('•', rec));
    }
    
    return report;
};

window.optimizeProgressiveLoader = function() {
    const report = progressiveMessageLoader.getPerformanceReport();
    
    // Auto-optimize based on performance data
    if (parseFloat(report.summary.averageLoadTime) > 1500) {
        progressiveMessageLoader.batchSize = Math.max(15, progressiveMessageLoader.batchSize - 5);
        console.log('Reduced batch size to', progressiveMessageLoader.batchSize, 'for better performance');
    }
    
    if (report.device.connection.effectiveType === '2g' || report.device.connection.effectiveType === 'slow-2g') {
        progressiveMessageLoader.batchSize = 10;
        progressiveMessageLoader.scrollThreshold = progressiveMessageLoader.scrollThreshold * 1.5;
        console.log('Optimized for slow connection: batch size =', progressiveMessageLoader.batchSize);
    }
    
    console.log('Progressive loader optimized based on current conditions');
};

console.log('Enhanced Progressive Message Loader loaded and ready');
console.log('Device optimizations:', {
    isMobile: progressiveMessageLoader.isMobile,
    isLowEnd: progressiveMessageLoader.isLowEndDevice,
    batchSize: progressiveMessageLoader.batchSize,
    threshold: progressiveMessageLoader.scrollThreshold,
    connection: progressiveMessageLoader.connectionSpeed
});