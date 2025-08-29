// Ultra-Fast Message Cache for Lightning-Speed Delivery
// Provides instant message access and optimistic updates like vigichat/Messenger

class MessageCache {
    constructor() {
        this.conversations = new Map(); // conversationId -> messages[]
        this.users = new Map(); // userId -> user data
        this.messageIndex = new Map(); // messageId -> message reference
        this.clientIdIndex = new Map(); // clientId -> message reference
        this.maxCacheSize = 10000; // Maximum messages to cache
        this.maxConversationCache = 500; // Max messages per conversation
        
        // Performance optimization flags
        this.enableOptimisticUpdates = true;
        this.enableInstantDelivery = true;
        this.enablePreemptiveLoading = true;
        
        // Metrics
        this.metrics = {
            cacheHits: 0,
            cacheMisses: 0,
            optimisticUpdates: 0,
            instantDeliveries: 0
        };
        
        this.initializeCache();
    }
    
    initializeCache() {
        console.log('🚀 Ultra-Fast Message Cache initialized');
        
        // Auto-cleanup every 5 minutes
        setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
        
        // Performance reporting every 30 seconds
        setInterval(() => this.logPerformanceMetrics(), 30 * 1000);
    }
    
    // INSTANT MESSAGE ADDITION - Add message immediately for ultra-fast UI updates
    addMessageInstantly(conversationId, messageData, status = 'sending') {
        const processedMessage = this.processMessage(messageData, status);
        
        // Initialize conversation cache if needed
        if (!this.conversations.has(conversationId)) {
            this.conversations.set(conversationId, []);
        }
        
        const conversationMessages = this.conversations.get(conversationId);
        
        // Add to conversation (maintain chronological order)
        this.insertMessageChronologically(conversationMessages, processedMessage);
        
        // Index for instant lookups
        if (processedMessage._id) {
            this.messageIndex.set(processedMessage._id, processedMessage);
        }
        if (processedMessage.clientId) {
            this.clientIdIndex.set(processedMessage.clientId, processedMessage);
        }
        
        // Keep conversation cache size manageable
        this.trimConversationCache(conversationId);
        
        this.metrics.instantDeliveries++;
        
        console.log(`⚡ INSTANT message cached: ${processedMessage.clientId || processedMessage._id}`);
        
        return processedMessage;
    }
    
    // OPTIMISTIC UPDATE - Update message status instantly before server confirmation
    updateMessageStatusOptimistically(clientId, status, metadata = {}) {
        const message = this.clientIdIndex.get(clientId);
        
        if (message) {
            // Store previous status for potential rollback
            message._previousStatus = message.status;
            
            // Update status optimistically
            message.status = status;
            message.updatedAt = new Date();
            
            // Add metadata
            Object.assign(message, metadata);
            
            this.metrics.optimisticUpdates++;
            
            console.log(`🔄 OPTIMISTIC update: ${clientId} -> ${status}`);
            
            return message;
        }
        
        console.log(`⚠️ Message not found for optimistic update: ${clientId}`);
        return null;
    }
    
    // INSTANT MESSAGE RETRIEVAL - Get messages with zero latency
    getConversationMessages(conversationId, limit = 50, offset = 0) {
        const startTime = performance.now();
        
        const messages = this.conversations.get(conversationId);
        
        if (messages) {
            this.metrics.cacheHits++;
            
            // Return slice with newest messages first
            const result = messages
                .slice(-limit - offset, messages.length - offset)
                .reverse();
            
            const retrievalTime = performance.now() - startTime;
            console.log(`⚡ CACHE HIT: ${result.length} messages retrieved in ${retrievalTime.toFixed(2)}ms`);
            
            return result;
        }
        
        this.metrics.cacheMisses++;
        console.log(`❌ CACHE MISS: ${conversationId}`);
        return [];
    }
    
    // INSTANT MESSAGE LOOKUP by ID or clientId
    getMessage(identifier) {
        const startTime = performance.now();
        
        // Try message ID first
        let message = this.messageIndex.get(identifier);
        
        // Try clientId if not found
        if (!message) {
            message = this.clientIdIndex.get(identifier);
        }
        
        if (message) {
            this.metrics.cacheHits++;
            const lookupTime = performance.now() - startTime;
            console.log(`⚡ MESSAGE FOUND in ${lookupTime.toFixed(2)}ms: ${identifier}`);
        } else {
            this.metrics.cacheMisses++;
            console.log(`❌ MESSAGE NOT CACHED: ${identifier}`);
        }
        
        return message;
    }
    
    // BULK MESSAGE CACHING - Cache multiple messages efficiently
    addMessagesBulk(conversationId, messages, shouldSort = true) {
        const startTime = performance.now();
        
        if (!this.conversations.has(conversationId)) {
            this.conversations.set(conversationId, []);
        }
        
        const conversationMessages = this.conversations.get(conversationId);
        const processedMessages = [];
        
        // Process and add all messages
        messages.forEach(messageData => {
            const processed = this.processMessage(messageData);
            processedMessages.push(processed);
            
            // Index for lookups
            if (processed._id) {
                this.messageIndex.set(processed._id, processed);
            }
            if (processed.clientId) {
                this.clientIdIndex.set(processed.clientId, processed);
            }
        });
        
        // Add to conversation
        conversationMessages.push(...processedMessages);
        
        // Sort chronologically if needed
        if (shouldSort) {
            conversationMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        }
        
        // Trim cache
        this.trimConversationCache(conversationId);
        
        const processingTime = performance.now() - startTime;
        console.log(`📦 BULK CACHED: ${messages.length} messages in ${processingTime.toFixed(2)}ms`);
        
        return processedMessages;
    }
    
    // PREEMPTIVE LOADING - Load adjacent conversations for instant switching
    preloadAdjacentConversations(currentConversationId, adjacentIds) {
        if (!this.enablePreemptiveLoading) return;
        
        adjacentIds.forEach(conversationId => {
            if (!this.conversations.has(conversationId)) {
                // Trigger background loading
                this.requestConversationData(conversationId);
            }
        });
        
        console.log(`🔮 PRELOADING ${adjacentIds.length} adjacent conversations`);
    }
    
    // USER CACHING for instant contact info
    cacheUser(userData) {
        this.users.set(userData._id, {
            ...userData,
            cachedAt: new Date()
        });
        
        console.log(`👤 USER CACHED: ${userData.username}`);
    }
    
    getUser(userId) {
        const user = this.users.get(userId);
        
        if (user) {
            this.metrics.cacheHits++;
            return user;
        }
        
        this.metrics.cacheMisses++;
        return null;
    }
    
    // CONVERSATION STATUS CACHING
    updateConversationStatus(conversationId, status) {
        const messages = this.conversations.get(conversationId);
        
        if (messages) {
            // Update last message status optimistically
            const lastMessage = messages[messages.length - 1];
            if (lastMessage) {
                this.updateMessageStatusOptimistically(
                    lastMessage.clientId || lastMessage._id, 
                    status
                );
            }
        }
    }
    
    // UTILITY METHODS
    
    processMessage(messageData, status = 'sent') {
        return {
            ...messageData,
            _id: messageData._id || messageData.messageId,
            clientId: messageData.clientId || `cache_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            status: status,
            cachedAt: new Date(),
            createdAt: messageData.createdAt || new Date(),
            updatedAt: new Date()
        };
    }
    
    insertMessageChronologically(messages, newMessage) {
        const newTime = new Date(newMessage.createdAt);
        
        // Find insertion point (binary search for efficiency)
        let left = 0;
        let right = messages.length;
        
        while (left < right) {
            const mid = Math.floor((left + right) / 2);
            const midTime = new Date(messages[mid].createdAt);
            
            if (midTime <= newTime) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        
        // Insert at correct position
        messages.splice(left, 0, newMessage);
    }
    
    trimConversationCache(conversationId) {
        const messages = this.conversations.get(conversationId);
        
        if (messages && messages.length > this.maxConversationCache) {
            const removed = messages.splice(0, messages.length - this.maxConversationCache);
            
            // Remove from indices
            removed.forEach(msg => {
                if (msg._id) this.messageIndex.delete(msg._id);
                if (msg.clientId) this.clientIdIndex.delete(msg.clientId);
            });
            
            console.log(`🧹 Trimmed ${removed.length} old messages from ${conversationId}`);
        }
    }
    
    cleanupCache() {
        const now = new Date();
        const maxAge = 30 * 60 * 1000; // 30 minutes
        let cleanedMessages = 0;
        
        // Clean old messages
        for (const [conversationId, messages] of this.conversations.entries()) {
            const initialLength = messages.length;
            
            // Keep recent messages
            const recentMessages = messages.filter(msg => 
                (now - new Date(msg.cachedAt)) < maxAge
            );
            
            if (recentMessages.length < messages.length) {
                // Remove old messages from indices
                messages.slice(recentMessages.length).forEach(msg => {
                    if (msg._id) this.messageIndex.delete(msg._id);
                    if (msg.clientId) this.clientIdIndex.delete(msg.clientId);
                });
                
                this.conversations.set(conversationId, recentMessages);
                cleanedMessages += (initialLength - recentMessages.length);
            }
        }
        
        // Clean old users
        for (const [userId, user] of this.users.entries()) {
            if ((now - new Date(user.cachedAt)) > maxAge) {
                this.users.delete(userId);
            }
        }
        
        if (cleanedMessages > 0) {
            console.log(`🧹 Cache cleanup: removed ${cleanedMessages} old messages`);
        }
    }
    
    // Request data from server (placeholder for integration)
    async requestConversationData(conversationId) {
        // This would integrate with your API service
        if (window.API && window.API.Messages) {
            try {
                const messages = await window.API.Messages.getConversationMessages(conversationId);
                this.addMessagesBulk(conversationId, messages);
            } catch (error) {
                console.error('Failed to preload conversation:', error);
            }
        }
    }
    
    // PERFORMANCE MONITORING
    
    logPerformanceMetrics() {
        const { cacheHits, cacheMisses, optimisticUpdates, instantDeliveries } = this.metrics;
        const hitRate = cacheHits + cacheMisses > 0 ? (cacheHits / (cacheHits + cacheMisses) * 100).toFixed(2) : 0;
        
        console.log(`📊 CACHE PERFORMANCE: ${hitRate}% hit rate | ${optimisticUpdates} optimistic | ${instantDeliveries} instant`);
    }
    
    getPerformanceMetrics() {
        const { cacheHits, cacheMisses } = this.metrics;
        const hitRate = cacheHits + cacheMisses > 0 ? (cacheHits / (cacheHits + cacheMisses) * 100).toFixed(2) : 0;
        
        return {
            ...this.metrics,
            hitRate: `${hitRate}%`,
            cachedConversations: this.conversations.size,
            cachedMessages: this.messageIndex.size,
            cachedUsers: this.users.size
        };
    }
    
    // CACHE MANAGEMENT
    
    clearConversation(conversationId) {
        const messages = this.conversations.get(conversationId);
        
        if (messages) {
            // Remove from indices
            messages.forEach(msg => {
                if (msg._id) this.messageIndex.delete(msg._id);
                if (msg.clientId) this.clientIdIndex.delete(msg.clientId);
            });
            
            this.conversations.delete(conversationId);
            console.log(`🗑️ Cleared conversation cache: ${conversationId}`);
        }
    }
    
    clearAllCache() {
        this.conversations.clear();
        this.users.clear();
        this.messageIndex.clear();
        this.clientIdIndex.clear();
        
        // Reset metrics
        this.metrics = {
            cacheHits: 0,
            cacheMisses: 0,
            optimisticUpdates: 0,
            instantDeliveries: 0
        };
        
        console.log('🗑️ All caches cleared');
    }
    
    // SYNCHRONIZATION METHODS
    
    synchronizeWithServer(serverMessage) {
        const cachedMessage = this.getMessage(serverMessage.clientId || serverMessage._id);
        
        if (cachedMessage) {
            // Update with server data
            Object.assign(cachedMessage, serverMessage);
            cachedMessage.synchronized = true;
            
            console.log(`🔄 SYNCHRONIZED: ${cachedMessage.clientId} with server`);
        }
        
        return cachedMessage;
    }
}

// Initialize and expose globally
window.MessageCache = new MessageCache();

console.log('⚡ Ultra-Fast Message Cache ready for lightning-speed messaging!');