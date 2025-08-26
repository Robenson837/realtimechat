const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    type: {
        type: String,
        enum: ['private', 'group'],
        default: 'private'
    },
    name: String, // For group chats
    description: String, // For group chats
    avatar: String, // For group chats
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    // Group specific fields
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    settings: {
        allowMembersToAddOthers: {
            type: Boolean,
            default: false
        },
        onlyAdminCanSend: {
            type: Boolean,
            default: false
        }
    },
    // Archive/mute settings per participant
    participantSettings: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        archived: {
            type: Boolean,
            default: false
        },
        muted: {
            type: Boolean,
            default: false
        },
        mutedUntil: Date,
        pinned: {
            type: Boolean,
            default: false
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        leftAt: Date
    }],
    // Message encryption key for the conversation
    encryptionKey: String
}, {
    timestamps: true
});

// Indexes
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastActivity: -1 });
conversationSchema.index({ 'participantSettings.user': 1 });

// Static method to find or create private conversation
conversationSchema.statics.findOrCreatePrivate = async function(userId1, userId2) {
    let conversation = await this.findOne({
        type: 'private',
        participants: { $all: [userId1, userId2], $size: 2 }
    }).populate('participants', 'username fullName avatar status lastSeen')
      .populate('lastMessage');

    if (!conversation) {
        conversation = new this({
            participants: [userId1, userId2],
            type: 'private',
            participantSettings: [
                { user: userId1 },
                { user: userId2 }
            ]
        });
        await conversation.save();
        conversation = await conversation.populate('participants', 'username fullName avatar status lastSeen');
    }

    return conversation;
};

// Static method to get user conversations
conversationSchema.statics.getUserConversations = function(userId) {
    return this.find({
        participants: userId,
        'participantSettings': {
            $elemMatch: {
                user: userId,
                leftAt: { $exists: false }
            }
        }
    })
    .populate('participants', 'username fullName avatar status lastSeen')
    .populate({
        path: 'lastMessage',
        select: 'sender recipient content type status createdAt timestamp',
        populate: {
            path: 'sender',
            select: 'username fullName'
        }
    })
    .sort({ lastActivity: -1 });
};

// Method to add participant (for group chats)
conversationSchema.methods.addParticipant = function(userId, addedBy) {
    if (!this.participants.includes(userId)) {
        this.participants.push(userId);
        this.participantSettings.push({
            user: userId,
            joinedAt: new Date()
        });
        return this.save();
    }
    return Promise.resolve(this);
};

// Method to remove participant
conversationSchema.methods.removeParticipant = function(userId) {
    this.participants = this.participants.filter(p => p.toString() !== userId.toString());
    
    const participantSetting = this.participantSettings.find(ps => 
        ps.user.toString() === userId.toString()
    );
    
    if (participantSetting) {
        participantSetting.leftAt = new Date();
    }
    
    return this.save();
};

// Method to update last activity
conversationSchema.methods.updateLastActivity = function(messageId) {
    this.lastMessage = messageId;
    this.lastActivity = new Date();
    return this.save();
};

// Method to get participant settings
conversationSchema.methods.getParticipantSettings = function(userId) {
    return this.participantSettings.find(ps => 
        ps.user.toString() === userId.toString()
    );
};

// Method to update participant settings
conversationSchema.methods.updateParticipantSettings = function(userId, settings) {
    const participantSetting = this.participantSettings.find(ps => 
        ps.user.toString() === userId.toString()
    );
    
    if (participantSetting) {
        Object.assign(participantSetting, settings);
        return this.save();
    }
    
    return Promise.resolve(this);
};

// Method to archive/unarchive conversation for user
conversationSchema.methods.archiveForUser = function(userId, archived = true) {
    return this.updateParticipantSettings(userId, { archived });
};

// Method to mute/unmute conversation for user
conversationSchema.methods.muteForUser = function(userId, muted = true, mutedUntil = null) {
    return this.updateParticipantSettings(userId, { muted, mutedUntil });
};

// Method to pin/unpin conversation for user
conversationSchema.methods.pinForUser = function(userId, pinned = true) {
    return this.updateParticipantSettings(userId, { pinned });
};

// Get conversation name for display
conversationSchema.methods.getDisplayName = function(forUserId) {
    if (this.type === 'group') {
        return this.name || 'Grupo sin nombre';
    }
    
    // For private chats, return the other participant's name
    const otherParticipant = this.participants.find(p => 
        p._id.toString() !== forUserId.toString()
    );
    
    return otherParticipant ? otherParticipant.fullName : 'Usuario';
};

// Get conversation avatar
conversationSchema.methods.getDisplayAvatar = function(forUserId) {
    if (this.type === 'group') {
        return this.avatar;
    }
    
    // For private chats, return the other participant's avatar
    const otherParticipant = this.participants.find(p => 
        p._id.toString() !== forUserId.toString()
    );
    
    return otherParticipant ? otherParticipant.avatar : null;
};

module.exports = mongoose.model('Conversation', conversationSchema);