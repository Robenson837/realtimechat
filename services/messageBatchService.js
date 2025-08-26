// Ultra-Fast Message Batching Service for Lightning Speed Delivery
// Optimizes message processing for instantaneous delivery like WhatsApp/Messenger

class MessageBatchService {
    constructor() {
        this.messageQueue = new Map(); // recipientId -> messages[]
        this.batchTimeout = 10; // 10ms ultra-fast batching
        this.maxBatchSize = 50; // Maximum messages per batch
        this.deliveryQueue = new Set();
        this.processingLock = new Map();
        
        // Performance metrics
        this.metrics = {
            totalMessages: 0,
            batchedMessages: 0,
            averageLatency: 0,
            ultraFastDeliveries: 0 // < 50ms
        };
        
        this.startBatchProcessor();
    }
    
    // Add message to ultra-fast batch processing
    addMessage(recipientId, messageData, deliveryCallback) {
        const batchKey = recipientId;
        
        // Initialize recipient queue if not exists
        if (!this.messageQueue.has(batchKey)) {
            this.messageQueue.set(batchKey, []);
        }
        
        // Add message with metadata
        const queueItem = {
            ...messageData,
            timestamp: Date.now(),
            deliveryCallback,
            batchKey
        };
        
        this.messageQueue.get(batchKey).push(queueItem);
        this.metrics.totalMessages++;
        
        // Trigger immediate processing for ultra-fast delivery
        this.triggerBatchDelivery(batchKey);
        
        return queueItem;
    }
    
    // Trigger ultra-fast batch delivery
    triggerBatchDelivery(batchKey) {
        if (this.processingLock.has(batchKey)) {
            return; // Already processing this recipient
        }
        
        // Use immediate processing for lightning speed
        setImmediate(() => this.processBatch(batchKey));
    }
    
    // Process message batch with lightning speed
    async processBatch(batchKey) {
        if (this.processingLock.has(batchKey)) {
            return;
        }
        
        this.processingLock.set(batchKey, true);
        
        try {
            const messages = this.messageQueue.get(batchKey);
            if (!messages || messages.length === 0) {
                return;
            }
            
            const startTime = Date.now();
            
            // Extract messages to process (up to maxBatchSize)
            const messagesToProcess = messages.splice(0, this.maxBatchSize);
            
            if (messagesToProcess.length === 0) {
                return;
            }
            
            // Group by type for optimized processing
            const textMessages = messagesToProcess.filter(m => m.type === 'text');
            const otherMessages = messagesToProcess.filter(m => m.type !== 'text');
            
            // Ultra-fast parallel processing
            const processingPromises = [];
            
            if (textMessages.length > 0) {
                processingPromises.push(this.processBatchedTextMessages(textMessages));
            }
            
            if (otherMessages.length > 0) {
                processingPromises.push(this.processIndividualMessages(otherMessages));
            }
            
            // Wait for all processing to complete
            const results = await Promise.allSettled(processingPromises);
            
            // Calculate performance metrics
            const processingTime = Date.now() - startTime;
            this.updateMetrics(messagesToProcess.length, processingTime);
            
            // Execute delivery callbacks instantly
            messagesToProcess.forEach(msg => {
                if (msg.deliveryCallback) {
                    setImmediate(() => msg.deliveryCallback({
                        success: true,
                        processingTime,
                        batchSize: messagesToProcess.length
                    }));
                }
            });
            
            console.log(`⚡ ULTRA-FAST batch processed: ${messagesToProcess.length} messages in ${processingTime}ms`);
            
        } catch (error) {
            console.error('Batch processing error:', error);
        } finally {
            this.processingLock.delete(batchKey);
            
            // Check if more messages were queued during processing
            const remainingMessages = this.messageQueue.get(batchKey);
            if (remainingMessages && remainingMessages.length > 0) {
                setImmediate(() => this.processBatch(batchKey));
            }
        }
    }
    
    // Process batched text messages with optimized DB operations
    async processBatchedTextMessages(messages) {
        const Message = require('../models/Message');
        const User = require('../models/User');
        
        try {
            // Prepare bulk operations for maximum speed
            const bulkOps = messages.map(msg => ({
                insertOne: {
                    document: {
                        sender: msg.sender,
                        recipient: msg.recipient,
                        content: msg.content,
                        type: msg.type || 'text',
                        status: 'sent',
                        clientId: msg.clientId,
                        attachments: msg.attachments || [],
                        replyTo: msg.replyToId,
                        forwarded: msg.forwarded || { isForwarded: false },
                        createdAt: new Date()
                    }
                }
            }));
            
            // Ultra-fast bulk insert
            const bulkResult = await Message.bulkWrite(bulkOps, {
                ordered: false, // Allow parallel processing
                w: 1, // Fast write concern
                j: false // Skip journal for speed
            });
            
            console.log(`📦 BULK INSERT: ${bulkResult.insertedCount} messages in batch`);
            
            return {
                success: true,
                insertedCount: bulkResult.insertedCount,
                method: 'bulk'
            };
            
        } catch (error) {
            console.error('Bulk text message processing failed:', error);
            
            // Fallback to individual processing
            return this.processIndividualMessages(messages);
        }
    }
    
    // Process individual messages (fallback or special types)
    async processIndividualMessages(messages) {
        const Message = require('../models/Message');
        const results = [];
        
        // Process in parallel for maximum speed
        const processingPromises = messages.map(async (msg) => {
            try {
                const newMessage = new Message({
                    sender: msg.sender,
                    recipient: msg.recipient,
                    content: msg.content,
                    type: msg.type || 'text',
                    status: 'sent',
                    clientId: msg.clientId,
                    attachments: msg.attachments || [],
                    replyTo: msg.replyToId,
                    forwarded: msg.forwarded || { isForwarded: false },
                    createdAt: new Date()
                });
                
                const savedMessage = await newMessage.save();
                return { success: true, messageId: savedMessage._id };
            } catch (error) {
                console.error('Individual message processing failed:', error);
                return { success: false, error: error.message };
            }
        });
        
        const results_resolved = await Promise.allSettled(processingPromises);
        
        return {
            success: true,
            results: results_resolved,
            method: 'individual'
        };
    }
    
    // Start the batch processor with ultra-fast intervals
    startBatchProcessor() {
        // Ultra-fast continuous processing
        setInterval(() => {
            for (const [batchKey, messages] of this.messageQueue.entries()) {
                if (messages.length > 0 && !this.processingLock.has(batchKey)) {
                    this.triggerBatchDelivery(batchKey);
                }
            }
        }, 5); // 5ms interval for maximum responsiveness
        
        console.log('🚀 Ultra-Fast Message Batch Processor started');
    }
    
    // Update performance metrics
    updateMetrics(messageCount, processingTime) {
        this.metrics.batchedMessages += messageCount;
        
        // Calculate average latency
        const currentAvg = this.metrics.averageLatency;
        const totalProcessed = this.metrics.batchedMessages;
        this.metrics.averageLatency = ((currentAvg * (totalProcessed - messageCount)) + processingTime) / totalProcessed;
        
        // Track ultra-fast deliveries
        if (processingTime < 50) {
            this.metrics.ultraFastDeliveries += messageCount;
        }
    }
    
    // Get performance metrics
    getMetrics() {
        const ultraFastPercentage = this.metrics.totalMessages > 0 
            ? (this.metrics.ultraFastDeliveries / this.metrics.totalMessages * 100).toFixed(2)
            : 0;
            
        return {
            ...this.metrics,
            ultraFastPercentage: `${ultraFastPercentage}%`,
            averageLatency: Math.round(this.metrics.averageLatency)
        };
    }
    
    // Clear old queues (cleanup)
    cleanup() {
        const now = Date.now();
        const maxAge = 30000; // 30 seconds
        
        for (const [batchKey, messages] of this.messageQueue.entries()) {
            const filteredMessages = messages.filter(msg => (now - msg.timestamp) < maxAge);
            
            if (filteredMessages.length === 0) {
                this.messageQueue.delete(batchKey);
            } else if (filteredMessages.length !== messages.length) {
                this.messageQueue.set(batchKey, filteredMessages);
            }
        }
    }
    
    // Force immediate processing of all queued messages
    flushAll() {
        const promises = [];
        
        for (const batchKey of this.messageQueue.keys()) {
            promises.push(this.processBatch(batchKey));
        }
        
        return Promise.allSettled(promises);
    }
}

// Export singleton instance
module.exports = new MessageBatchService();