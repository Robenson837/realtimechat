const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        text: String,
        encrypted: Boolean // For end-to-end encryption
    },
    type: {
        type: String,
        enum: ['text', 'image', 'file', 'voice', 'video', 'location', 'contact'],
        default: 'text'
    },
    attachments: [{
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        path: String,
        thumbnail: String // For images/videos
    }],
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    },
    deliveredAt: Date,
    readAt: Date,
    edited: {
        isEdited: { type: Boolean, default: false },
        editedAt: Date,
        originalContent: String
    },
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    forwarded: {
        isForwarded: { type: Boolean, default: false },
        originalMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message'
        },
        originalSender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        forwardedAt: Date,
        forwardedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    reactions: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        emoji: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    metadata: {
        location: {
            latitude: Number,
            longitude: Number,
            address: String
        },
        contact: {
            name: String,
            phone: String,
            email: String
        }
    },
    deleted: {
        isDeleted: { type: Boolean, default: false },
        deletedAt: Date,
        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        deletedForEveryone: { type: Boolean, default: false },
        deletedForUsers: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            deletedAt: Date
        }]
    },
    clientId: {
        type: String,
        index: true // Para búsqueda rápida
    }
}, {
    timestamps: true
});

// ULTRA-FAST PERFORMANCE INDEXES
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 }); // Conversation queries
messageSchema.index({ recipient: 1, status: 1, createdAt: -1 }); // Unread messages with time order
messageSchema.index({ createdAt: -1 }); // Time-based queries
messageSchema.index({ 'deleted.isDeleted': 1, createdAt: -1 }); // Non-deleted messages
messageSchema.index({ clientId: 1 }); // Client ID lookup (ultra-fast)

// COMPOUND INDEXES FOR LIGHTNING-FAST QUERIES
messageSchema.index({ 
    sender: 1, 
    recipient: 1, 
    'deleted.isDeleted': 1, 
    createdAt: -1 
}, { name: 'conversation_fast_idx' }); // Conversation queries with delete check

// PROGRESSIVE SCROLL OPTIMIZED INDEXES
messageSchema.index({
    createdAt: -1,
    'deleted.isDeleted': 1
}, { name: 'progressive_scroll_idx' }); // Time-based pagination

messageSchema.index({
    sender: 1,
    recipient: 1,
    createdAt: -1
}, { name: 'conversation_time_idx' }); // Conversation with time ordering

// Enhanced index for better performance with user-specific deletions
messageSchema.index({
    sender: 1,
    recipient: 1,
    'deleted.isDeleted': 1,
    'deleted.deletedForUsers.user': 1,
    createdAt: -1
}, { 
    name: 'conversation_user_delete_idx',
    background: true
}); // User-specific deletion filtering

// Index for message counting operations
messageSchema.index({
    sender: 1,
    recipient: 1,
    'deleted.isDeleted': 1
}, { 
    name: 'conversation_count_idx',
    background: true
}); // Fast counting

messageSchema.index({ 
    recipient: 1, 
    status: 1, 
    'deleted.isDeleted': 1 
}, { name: 'unread_fast_idx' }); // Unread count queries

// SPARSE INDEXES FOR OPTIONAL FIELDS (MEMORY EFFICIENT)
messageSchema.index({ replyTo: 1 }, { sparse: true }); // Reply lookups
messageSchema.index({ 'forwarded.originalMessage': 1 }, { sparse: true }); // Forward lookups
messageSchema.index({ 'reactions.user': 1 }, { sparse: true }); // Reaction queries

// TEXT INDEX FOR SEARCH (if needed)
messageSchema.index({ 'content.text': 'text' }, { 
    sparse: true, 
    name: 'message_search_idx' 
});

// Method to mark as delivered
messageSchema.methods.markAsDelivered = function() {
    if (this.status === 'sent') {
        this.status = 'delivered';
        this.deliveredAt = new Date();
        return this.save();
    }
    return Promise.resolve(this);
};

// Method to mark as read
messageSchema.methods.markAsRead = function() {
    if (this.status !== 'read') {
        this.status = 'read';
        this.readAt = new Date();
        return this.save();
    }
    return Promise.resolve(this);
};

// Method to add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
    const existingReaction = this.reactions.find(r => 
        r.user.toString() === userId.toString()
    );
    
    if (existingReaction) {
        if (existingReaction.emoji === emoji) {
            // Remove reaction if same emoji
            this.reactions = this.reactions.filter(r => 
                r.user.toString() !== userId.toString()
            );
        } else {
            // Update reaction
            existingReaction.emoji = emoji;
            existingReaction.timestamp = new Date();
        }
    } else {
        // Add new reaction
        this.reactions.push({
            user: userId,
            emoji: emoji
        });
    }
    
    return this.save();
};

// Method to edit message
messageSchema.methods.editMessage = function(newContent) {
    this.edited.originalContent = this.content.text;
    this.content.text = newContent;
    this.edited.isEdited = true;
    this.edited.editedAt = new Date();
    return this.save();
};

// Method to soft delete message
messageSchema.methods.softDelete = function(deletedBy) {
    this.deleted.isDeleted = true;
    this.deleted.deletedAt = new Date();
    this.deleted.deletedBy = deletedBy;
    return this.save();
};

// Method to delete for specific user only
messageSchema.methods.deleteForUser = function(userId) {
    // Check if already deleted for this user
    const existingDeletion = this.deleted.deletedForUsers.find(d => 
        d.user.toString() === userId.toString()
    );
    
    if (!existingDeletion) {
        this.deleted.deletedForUsers.push({
            user: userId,
            deletedAt: new Date()
        });
    }
    
    return this.save();
};

// Method to delete for everyone
messageSchema.methods.deleteForEveryone = function(deletedBy) {
    this.deleted.isDeleted = true;
    this.deleted.deletedForEveryone = true;
    this.deleted.deletedAt = new Date();
    this.deleted.deletedBy = deletedBy;
    this.content.text = 'Este mensaje fue eliminado';
    return this.save();
};

// ULTRA-FAST STATIC METHOD: Get conversation with optimized query
messageSchema.statics.getConversation = function(userId1, userId2, limit = 50, skip = 0) {
    return this.find({
        $or: [
            { sender: userId1, recipient: userId2 },
            { sender: userId2, recipient: userId1 }
        ],
        $and: [
            {
                $or: [
                    { 'deleted.isDeleted': false },
                    { 'deleted.deletedForEveryone': false }
                ]
            },
            {
                'deleted.deletedForUsers.user': { $ne: userId1 }
            }
        ]
    })
    .populate('sender', 'username fullName avatar')
    .populate('recipient', 'username fullName avatar')
    .populate('replyTo')
    .populate('forwarded.originalSender', 'username fullName avatar')
    .populate('forwarded.originalMessage')
    .populate('forwarded.forwardedBy', 'username fullName avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .hint('conversation_fast_idx') // Force use of optimized index
    .lean(); // Return plain objects for speed
};

// ULTRA-FAST CONVERSATION QUERY (minimal data for instant loading)
messageSchema.statics.getConversationFast = function(userId1, userId2, limit = 50, skip = 0) {
    return this.find({
        $or: [
            { sender: userId1, recipient: userId2 },
            { sender: userId2, recipient: userId1 }
        ],
        'deleted.isDeleted': false
    }, 
    // SELECT ONLY ESSENTIAL FIELDS FOR SPEED
    'sender recipient content type status createdAt clientId replyTo'
    )
    .populate('sender', 'username fullName avatar', null, { lean: true })
    .populate('recipient', 'username fullName avatar', null, { lean: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .hint('conversation_fast_idx')
    .lean();
};

// PROGRESSIVE SCROLL: Get messages with cursor-based pagination
messageSchema.statics.getConversationPaginated = function(userId1, userId2, options = {}) {
    const {
        limit = 30,
        before = null,
        after = null,
        direction = 'before'
    } = options;
    
    // Base query
    let query = {
        $or: [
            { sender: userId1, recipient: userId2 },
            { sender: userId2, recipient: userId1 }
        ],
        $and: [
            {
                $or: [
                    { 'deleted.isDeleted': false },
                    { 'deleted.deletedForEveryone': false }
                ]
            },
            {
                'deleted.deletedForUsers.user': { $ne: userId1 }
            }
        ]
    };
    
    // Add cursor-based filters
    if (before) {
        query.createdAt = { $lt: new Date(before) };
    } else if (after) {
        query.createdAt = { $gt: new Date(after) };
    }
    
    return this.find(query)
        .populate('sender', 'username fullName avatar')
        .populate('recipient', 'username fullName avatar')
        .populate('replyTo', 'content sender createdAt')
        .sort({ createdAt: direction === 'before' ? -1 : 1 })
        .limit(limit)
        .hint('conversation_fast_idx');
};

// PROGRESSIVE SCROLL: Enhanced message count with user-specific filtering
messageSchema.statics.getConversationMessageCount = function(userId1, userId2) {
    return this.countDocuments({
        $or: [
            { sender: userId1, recipient: userId2 },
            { sender: userId2, recipient: userId1 }
        ],
        'deleted.isDeleted': false,
        'deleted.deletedForUsers.user': { $ne: userId1 }
    }).hint('conversation_count_idx');
};

// PROGRESSIVE SCROLL: Get conversation statistics for UI optimization
messageSchema.statics.getConversationStats = function(userId1, userId2) {
    return this.aggregate([
        {
            $match: {
                $or: [
                    { sender: userId1, recipient: userId2 },
                    { sender: userId2, recipient: userId1 }
                ],
                'deleted.isDeleted': false,
                'deleted.deletedForUsers.user': { $ne: userId1 }
            }
        },
        {
            $group: {
                _id: null,
                totalMessages: { $sum: 1 },
                oldestMessage: { $min: '$createdAt' },
                newestMessage: { $max: '$createdAt' },
                avgMessageSize: { $avg: { $strLenCP: '$content.text' } }
            }
        }
    ]).hint('conversation_count_idx');
};

// PROGRESSIVE SCROLL: Enhanced latest messages with performance optimization
messageSchema.statics.getLatestMessages = function(userId1, userId2, limit = 30) {
    return this.find({
        $or: [
            { sender: userId1, recipient: userId2 },
            { sender: userId2, recipient: userId1 }
        ],
        'deleted.isDeleted': false,
        'deleted.deletedForUsers.user': { $ne: userId1 }
    }, {
        // Select only essential fields for performance
        sender: 1,
        recipient: 1,
        content: 1,
        type: 1,
        status: 1,
        createdAt: 1,
        replyTo: 1,
        attachments: 1,
        reactions: 1
    })
    .populate('sender', 'username fullName avatar', null, { lean: true })
    .populate('recipient', 'username fullName avatar', null, { lean: true })
    .populate('replyTo', 'content sender createdAt', null, { lean: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .hint('conversation_fast_idx')
    .lean();
};

// PROGRESSIVE SCROLL: Optimized batch message loading
messageSchema.statics.getBatchMessages = function(userId1, userId2, options = {}) {
    const {
        before = null,
        after = null,
        limit = 30,
        includeDeleted = false
    } = options;
    
    let query = {
        $or: [
            { sender: userId1, recipient: userId2 },
            { sender: userId2, recipient: userId1 }
        ]
    };
    
    if (!includeDeleted) {
        query['deleted.isDeleted'] = false;
        query['deleted.deletedForUsers.user'] = { $ne: userId1 };
    }
    
    if (before) {
        query.createdAt = { $lt: new Date(before) };
    } else if (after) {
        query.createdAt = { $gt: new Date(after) };
    }
    
    return this.find(query, {
        sender: 1,
        recipient: 1,
        content: 1,
        type: 1,
        status: 1,
        createdAt: 1,
        replyTo: 1,
        attachments: 1
    })
    .sort({ createdAt: -1 })
    .limit(limit + 1) // Load extra for hasMore detection
    .hint('conversation_user_delete_idx')
    .lean();
};

// ULTRA-FAST RECENT MESSAGES (for previews)
messageSchema.statics.getRecentMessages = function(userId, limit = 20) {
    return this.find({
        $or: [{ sender: userId }, { recipient: userId }],
        'deleted.isDeleted': false
    },
    'sender recipient content type createdAt'
    )
    .populate('sender', 'username fullName', null, { lean: true })
    .populate('recipient', 'username fullName', null, { lean: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .hint('conversation_fast_idx')
    .lean();
};

// ULTRA-FAST BULK MESSAGE INSERT
messageSchema.statics.insertManyFast = function(messages) {
    return this.insertMany(messages, {
        ordered: false, // Parallel processing
        rawResult: true, // Faster result processing
        lean: true
    });
};

// ULTRA-FAST UNREAD COUNT QUERY
messageSchema.statics.getUnreadCount = function(userId) {
    return this.countDocuments({
        recipient: userId,
        status: { $ne: 'read' },
        'deleted.isDeleted': false
    })
    .hint('unread_fast_idx'); // Use optimized index
};

// LIGHTNING-FAST UNREAD COUNT (using aggregation for even better performance)
messageSchema.statics.getUnreadCountFast = function(userId) {
    return this.aggregate([
        {
            $match: {
                recipient: userId,
                status: { $ne: 'read' },
                'deleted.isDeleted': false
            }
        },
        {
            $count: "unreadCount"
        }
    ]).hint('unread_fast_idx');
};

// ULTRA-FAST BATCH UNREAD COUNTS (for multiple conversations)
messageSchema.statics.getBatchUnreadCounts = function(userId, conversationPartners) {
    return this.aggregate([
        {
            $match: {
                recipient: userId,
                status: { $ne: 'read' },
                'deleted.isDeleted': false,
                sender: { $in: conversationPartners }
            }
        },
        {
            $group: {
                _id: '$sender',
                unreadCount: { $sum: 1 }
            }
        }
    ]).hint('unread_fast_idx');
};

// Static method to mark all messages as read in a conversation
messageSchema.statics.markConversationAsRead = function(senderId, recipientId) {
    return this.updateMany({
        sender: senderId,
        recipient: recipientId,
        status: { $ne: 'read' }
    }, {
        status: 'read',
        readAt: new Date()
    });
};

// Transform function to handle deleted messages based on context
messageSchema.methods.toJSONForUser = function(userId) {
    const message = this.toObject();
    
    // Check if deleted for this specific user
    const deletedForUser = message.deleted.deletedForUsers.find(d => 
        d.user.toString() === userId.toString()
    );
    
    if (deletedForUser) {
        // Message deleted for this user - completely hide it
        return null;
    }
    
    // Check if deleted for everyone
    if (message.deleted && message.deleted.deletedForEveryone) {
        // Show watermark only if user is NOT the one who deleted it
        if (message.deleted.deletedBy.toString() !== userId.toString()) {
            message.content.text = 'Este mensaje fue eliminado';
            message.attachments = [];
            message.showDeletionWatermark = true;
        } else {
            // For the deleter, hide completely
            return null;
        }
    }
    
    return message;
};

// Keep original toJSON for backward compatibility
messageSchema.methods.toJSON = function() {
    const message = this.toObject();
    
    if (message.deleted && message.deleted.isDeleted) {
        message.content.text = 'Este mensaje fue eliminado';
        message.attachments = [];
    }
    
    return message;
};

module.exports = mongoose.model('Message', messageSchema);