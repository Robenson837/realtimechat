const express = require('express');
const { body, validationResult } = require('express-validator');
const { getModels } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/messages/conversations
// @desc    Get user conversations
// @access  Private
router.get('/conversations', auth, async (req, res) => {
    try {
        const { Conversation, Message } = getModels();
        const conversations = await Conversation.getUserConversations(req.user._id);
        
        // Format conversations for frontend with unread counts
        const formattedConversations = await Promise.all(conversations.map(async conversation => {
            const participantSettings = conversation.getParticipantSettings(req.user._id);
            
            // Calculate unread count for this conversation
            const otherParticipantId = conversation.participants.find(p => 
                p._id.toString() !== req.user._id.toString()
            )?._id;
            
            let unreadCount = 0;
            if (otherParticipantId) {
                unreadCount = await Message.countDocuments({
                    sender: otherParticipantId,
                    recipient: req.user._id,
                    status: { $ne: 'read' },
                    'deleted.isDeleted': false
                });
            }
            
            return {
                _id: conversation._id,
                type: conversation.type,
                name: conversation.getDisplayName(req.user._id),
                avatar: conversation.getDisplayAvatar(req.user._id),
                lastMessage: conversation.lastMessage,
                lastActivity: conversation.lastActivity,
                participants: conversation.participants,
                unreadCount: unreadCount,
                settings: {
                    archived: participantSettings?.archived || false,
                    muted: participantSettings?.muted || false,
                    pinned: participantSettings?.pinned || false
                }
            };
        }));

        res.json({
            success: true,
            data: formattedConversations
        });

    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching conversations'
        });
    }
});

// @route   GET /api/messages/conversation/:conversationId
// @desc    Get messages from a conversation
// @access  Private
router.get('/conversation/:conversationId', auth, async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const skip = (page - 1) * limit;
        const { Conversation, Message } = getModels();

        // Verify user is part of conversation
        const conversation = await Conversation.findById(req.params.conversationId);
        if (!conversation || !conversation.participants.includes(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get messages for private conversation
        let messages;
        if (conversation.type === 'private') {
            const otherParticipant = conversation.participants.find(p => 
                p.toString() !== req.user._id.toString()
            );
            
            // Use the fast method without lean() for compatibility with toJSONForUser
            messages = await Message.find({
                $or: [
                    { sender: req.user._id, recipient: otherParticipant },
                    { sender: otherParticipant, recipient: req.user._id }
                ],
                $and: [
                    {
                        $or: [
                            { 'deleted.isDeleted': false },
                            { 'deleted.deletedForEveryone': false }
                        ]
                    },
                    {
                        'deleted.deletedForUsers.user': { $ne: req.user._id }
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
            .limit(parseInt(limit))
            .skip(skip)
            // Remove .hint() temporarily to avoid index issues
            ;
            
            // Filter messages using the new user-specific logic
            messages = messages.map(message => {
                const userSpecificMessage = message.toJSONForUser ? message.toJSONForUser(req.user._id) : message.toObject();
                return userSpecificMessage;
            }).filter(message => message !== null); // Remove null entries (deleted for user)
        } else {
            // For group conversations - implement later
            messages = [];
        }

        // Reverse to show oldest first
        messages.reverse();

        res.json({
            success: true,
            data: {
                messages,
                hasMore: messages.length === parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get conversation messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching messages'
        });
    }
});

// @route   POST /api/messages/send
// @desc    Send a message (HTTP fallback for socket.io)
// @access  Private
router.post('/send', auth, [
    body('recipientId')
        .notEmpty()
        .withMessage('Recipient ID is required')
        .isMongoId()
        .withMessage('Invalid recipient ID'),
    body('content')
        .notEmpty()
        .withMessage('Message content is required')
        .isLength({ max: 4096 })
        .withMessage('Message too long (max 4096 characters)'),
    body('type')
        .optional()
        .isIn(['text', 'image', 'file', 'voice', 'video'])
        .withMessage('Invalid message type')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { recipientId, content, type = 'text', replyToId } = req.body;
        const { User, Message, Conversation } = getModels();

        // Validate recipient
        const recipient = await User.findById(recipientId);
        if (!recipient || !recipient.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Recipient not found'
            });
        }

        // Check if recipient has blocked sender
        const recipientUser = await User.findById(recipientId);
        const isBlocked = recipientUser.contacts.some(contact => 
            contact.user.toString() === req.user._id.toString() && contact.blocked
        );

        if (isBlocked) {
            return res.status(403).json({
                success: false,
                message: 'Cannot send message to this user'
            });
        }

        // Find or create conversation
        const conversation = await Conversation.findOrCreatePrivate(req.user._id, recipientId);

        // Create message with WhatsApp-style immediate delivery status
        const newMessage = new Message({
            sender: req.user._id,
            recipient: recipientId,
            content: { text: content.trim(), encrypted: false },
            type,
            status: 'sent', // WhatsApp behavior: immediately mark as sent
            replyTo: replyToId,
            timestamp: new Date()
        });

        await newMessage.save();
        await newMessage.populate('sender', 'username fullName avatar');
        
        if (replyToId) {
            await newMessage.populate('replyTo');
        }

        // Update conversation
        await conversation.updateLastActivity(newMessage._id);

        // Immediate response (WhatsApp behavior)
        res.status(201).json({
            success: true,
            data: newMessage
        });

        // Emit socket event asynchronously (non-blocking)
        process.nextTick(() => {
            const io = req.app.get('io');
            const activeUsers = req.app.get('activeUsers');
            
            if (io && activeUsers && activeUsers.has(recipientId)) {
                const recipientSocketId = activeUsers.get(recipientId);
                io.to(recipientSocketId).emit('new_message', {
                    message: newMessage,
                    conversation: conversation
                });
            }
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error sending message'
        });
    }
});

// @route   PUT /api/messages/:messageId/read
// @desc    Mark message as read
// @access  Private
router.put('/:messageId/read', auth, async (req, res) => {
    try {
        const { Message } = getModels();
        const message = await Message.findById(req.params.messageId);
        
        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        // Only recipient can mark as read
        if (message.recipient.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await message.markAsRead();

        res.json({
            success: true,
            message: 'Message marked as read',
            data: {
                messageId: message._id,
                readAt: message.readAt
            }
        });

    } catch (error) {
        console.error('Mark message as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error marking message as read'
        });
    }
});

// @route   PUT /api/messages/:messageId/edit
// @desc    Edit message
// @access  Private
router.put('/:messageId/edit', auth, [
    body('content')
        .notEmpty()
        .withMessage('Message content is required')
        .isLength({ max: 1000 })
        .withMessage('Message too long')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { content } = req.body;
        const { Message } = getModels();
        const message = await Message.findById(req.params.messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        // Only sender can edit
        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Check if message is too old to edit (24 hours)
        const hoursSinceCreation = (Date.now() - message.createdAt) / (1000 * 60 * 60);
        if (hoursSinceCreation > 24) {
            return res.status(400).json({
                success: false,
                message: 'Message too old to edit'
            });
        }

        await message.editMessage(content);

        res.json({
            success: true,
            message: 'Message edited successfully',
            data: message
        });

    } catch (error) {
        console.error('Edit message error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error editing message'
        });
    }
});

// @route   DELETE /api/messages/:messageId
// @desc    Delete message
// @access  Private
router.delete('/:messageId', auth, async (req, res) => {
    try {
        const { Message, Conversation, User } = getModels();
        
        // Find message without any populate to avoid schema issues
        const message = await Message.findById(req.params.messageId).lean();

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        // Only sender can delete
        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get deleteForEveryone option from request body
        const { deleteForEveryone } = req.body;
        
        console.log('🗑️ Delete message request:', {
            messageId: req.params.messageId,
            deleteForEveryone,
            userId: req.user._id,
            messageAge: Date.now() - new Date(message.createdAt).getTime()
        });

        // Check time restriction for "delete for everyone" (24 hours)
        const messageAge = Date.now() - new Date(message.createdAt).getTime();
        const maxDeleteTime = 24 * 60 * 60 * 1000;

        if (deleteForEveryone && messageAge > maxDeleteTime) {
            return res.status(400).json({
                success: false,
                message: 'Message too old to delete for everyone (max 24 hours)'
            });
        }

        if (deleteForEveryone) {
            // Find the actual message document to use the new method
            const messageDoc = await Message.findById(req.params.messageId);
            
            if (!messageDoc) {
                return res.status(404).json({
                    success: false,
                    message: 'Message not found'
                });
            }
            
            // Use the new deleteForEveryone method
            await messageDoc.deleteForEveryone(req.user._id);
            
            // Find conversation for notification
            const conversation = await Conversation.findOne({
                participants: { $all: [message.sender, message.recipient] },
                type: 'private'
            }).lean();
            
            // Get user info for notification
            const currentUser = await User.findById(req.user._id).select('fullName username').lean();
            const deletedByName = currentUser.fullName || currentUser.username || 'Usuario';
            
            // Notify other participants via socket
            if (conversation) {
                const otherParticipants = conversation.participants.filter(p => 
                    p.toString() !== req.user._id.toString()
                );
                
                const io = req.app.get('io');
                if (io) {
                    otherParticipants.forEach(participantId => {
                        io.to(`user_${participantId}`).emit('messageDeleted', {
                            messageId: req.params.messageId,
                            deletedBy: req.user._id,
                            deletedByName,
                            deletedForEveryone: true
                        });
                    });
                }
            }
            
            res.json({
                success: true,
                message: 'Message deleted for everyone',
                data: {
                    deletedForEveryone: true,
                    messageId: req.params.messageId,
                    deletedByName
                }
            });
        } else {
            // Delete for current user only using the new method
            const messageDoc = await Message.findById(req.params.messageId);
            
            if (!messageDoc) {
                return res.status(404).json({
                    success: false,
                    message: 'Message not found'
                });
            }
            
            await messageDoc.deleteForUser(req.user._id);
            
            res.json({
                success: true,
                message: 'Message deleted for you',
                data: {
                    deletedForEveryone: false,
                    messageId: req.params.messageId
                }
            });
        }

    } catch (error) {
        console.error('Delete message error:', {
            messageId: req.params.messageId,
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: 'Server error deleting message',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   POST /api/messages/:messageId/react
// @desc    Add reaction to message
// @access  Private
router.post('/:messageId/react', auth, [
    body('emoji')
        .notEmpty()
        .withMessage('Emoji is required')
        .isLength({ min: 1, max: 10 })
        .withMessage('Invalid emoji')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { emoji } = req.body;
        const { Message } = getModels();
        const message = await Message.findById(req.params.messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        // Check if user is involved in the message
        const isInvolved = message.sender.toString() === req.user._id.toString() ||
                          message.recipient.toString() === req.user._id.toString();

        if (!isInvolved) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await message.addReaction(req.user._id, emoji);

        res.json({
            success: true,
            message: 'Reaction added successfully',
            data: {
                reactions: message.reactions
            }
        });

    } catch (error) {
        console.error('Add reaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error adding reaction'
        });
    }
});

// @route   GET /api/messages/unread-count
// @desc    Get unread messages count
// @access  Private
router.get('/unread-count', auth, async (req, res) => {
    try {
        const { Message } = getModels();
        const count = await Message.getUnreadCount(req.user._id);

        res.json({
            success: true,
            data: { unreadCount: count }
        });

    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting unread count'
        });
    }
});

// @route   POST /api/messages/mark-conversation-read
// @desc    Mark all messages in a conversation as read
// @access  Private
router.post('/mark-conversation-read', auth, async (req, res) => {
    try {
        const { conversationId } = req.body;
        
        if (!conversationId) {
            return res.status(400).json({
                success: false,
                message: 'Conversation ID is required'
            });
        }

        // Skip temporary conversation IDs (they start with "temp_")
        if (conversationId.startsWith('temp_')) {
            console.log('🟡 Skipping temporary conversation ID in API:', conversationId);
            return res.json({
                success: true,
                message: 'Temporary conversation, no action needed'
            });
        }

        const { Conversation, Message } = getModels();
        
        // Verify user is part of this conversation
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.includes(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this conversation'
            });
        }

        // Get the other participant to mark their messages as read
        const otherParticipantId = conversation.participants.find(p => 
            p.toString() !== req.user._id.toString()
        );

        if (otherParticipantId) {
            // Mark all unread messages from other participant as read
            await Message.updateMany({
                sender: otherParticipantId,
                recipient: req.user._id,
                status: { $ne: 'read' },
                'deleted.isDeleted': false
            }, {
                $set: {
                    status: 'read',
                    readAt: new Date()
                }
            });
        }

        res.json({
            success: true,
            message: 'Conversation marked as read'
        });

    } catch (error) {
        console.error('Mark conversation as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error marking conversation as read'
        });
    }
});

// @route   DELETE /api/messages/conversation/:conversationId/clear
// @desc    Clear all messages in a conversation
// @access  Private
router.delete('/conversation/:conversationId/clear', auth, async (req, res) => {
    try {
        const { Conversation, Message } = getModels();
        const conversation = await Conversation.findById(req.params.conversationId);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }

        // Check if user is participant in conversation
        const isParticipant = conversation.participants.some(p => 
            p.toString() === req.user._id.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get deleteForBoth option from request body
        const { deleteForBoth } = req.body;
        
        console.log('🗑️ Clear conversation request:', {
            conversationId: req.params.conversationId,
            deleteForBoth,
            userId: req.user._id,
            participants: conversation.participants
        });
        
        let deleteQuery;
        
        if (deleteForBoth) {
            // Delete only messages sent by the current user (for both users)
            deleteQuery = {
                sender: req.user._id,
                $and: [
                    { sender: { $in: conversation.participants } },
                    { recipient: { $in: conversation.participants } }
                ]
            };
        } else {
            // Delete all messages this user can see in this conversation (only for current user)
            // In a real implementation, this would be a soft delete or mark as deleted for this user
            deleteQuery = {
                $and: [
                    { 
                        $or: [
                            { sender: req.user._id },
                            { recipient: req.user._id }
                        ]
                    },
                    {
                        $and: [
                            { sender: { $in: conversation.participants } },
                            { recipient: { $in: conversation.participants } }
                        ]
                    }
                ]
            };
        }
        
        console.log('🔍 Delete query:', JSON.stringify(deleteQuery, null, 2));
        
        const deleteResult = await Message.deleteMany(deleteQuery);
        
        console.log('✅ Delete result:', {
            deletedCount: deleteResult.deletedCount,
            acknowledged: deleteResult.acknowledged
        });

        // Update conversation's last message to the most recent remaining message
        const remainingMessages = await Message.findOne({
            $and: [
                { sender: { $in: conversation.participants } },
                { recipient: { $in: conversation.participants } }
            ]
        }).sort({ createdAt: -1 });
        
        if (remainingMessages) {
            conversation.lastMessage = remainingMessages._id;
            conversation.lastActivity = remainingMessages.createdAt;
        } else {
            // No messages left in conversation
            conversation.lastMessage = null;
            conversation.lastActivity = new Date();
        }
        
        await conversation.save();

        // Get the count of deleted messages
        const messagesDeleted = deleteResult.deletedCount;

        // Notify other participants if messages were deleted for both users
        if (deleteForBoth && messagesDeleted > 0) {
            const otherParticipants = conversation.participants.filter(p => 
                p.toString() !== req.user._id.toString()
            );
            
            // Get current user's display name
            const { User } = getModels();
            const currentUser = await User.findById(req.user._id).select('fullName username');
            const clearedByName = currentUser.fullName || currentUser.username || 'Usuario';
            
            // Emit socket event to other participants
            const io = req.app.get('io');
            if (io) {
                otherParticipants.forEach(participantId => {
                    io.to(`user_${participantId}`).emit('messagesCleared', {
                        conversationId: conversation._id,
                        clearedBy: req.user._id,
                        clearedByName,
                        messagesDeleted,
                        type: 'bothUsers'
                    });
                });
            }
        }
        const actionDescription = deleteForBoth ? 
            `${messagesDeleted} mensajes tuyos eliminados para ambos usuarios` : 
            `${messagesDeleted} mensajes eliminados de tu vista`;
            
        res.json({
            success: true,
            message: 'Conversation cleared successfully',
            data: {
                messagesDeleted,
                deleteForBoth,
                description: actionDescription
            }
        });

    } catch (error) {
        console.error('Clear conversation error:', {
            message: error.message,
            stack: error.stack,
            conversationId: req.params.conversationId,
            userId: req.user._id
        });
        res.status(500).json({
            success: false,
            message: 'Server error clearing conversation',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   DELETE /api/messages/conversation/:conversationId
// @desc    Delete conversation for current user only
// @access  Private
router.delete('/conversation/:conversationId', auth, async (req, res) => {
    try {
        const { Conversation, Message } = getModels();
        const conversation = await Conversation.findById(req.params.conversationId);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }

        // Check if user is participant in conversation
        const isParticipant = conversation.participants.some(p => 
            p.toString() === req.user._id.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Remove user from conversation participants (soft delete for this user)
        conversation.participants = conversation.participants.filter(p => 
            p.toString() !== req.user._id.toString()
        );

        // If no participants left, delete the conversation completely
        if (conversation.participants.length === 0) {
            await Message.deleteMany({
                $and: [
                    { sender: { $in: conversation.participants } },
                    { recipient: { $in: conversation.participants } }
                ]
            });
            await Conversation.findByIdAndDelete(conversation._id);
        } else {
            // Save conversation without this user
            await conversation.save();
        }

        res.json({
            success: true,
            message: 'Conversation deleted for current user',
            data: {
                conversationId: req.params.conversationId,
                deletedForUser: req.user._id,
                conversationCompletelyDeleted: conversation.participants.length === 0
            }
        });

    } catch (error) {
        console.error('Delete conversation error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting conversation'
        });
    }
});

module.exports = router;