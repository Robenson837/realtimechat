const express = require('express');
const router = express.Router();

// Fallback routes for messages (in-memory storage)
let messages = [];

// @route   GET /api/messages/:conversationId
// @desc    Get messages for a conversation
// @access  Private
router.get('/:conversationId', (req, res) => {
    const { conversationId } = req.params;
    const conversationMessages = messages.filter(msg => msg.conversationId === conversationId);
    
    res.json({
        success: true,
        data: conversationMessages
    });
});

// @route   POST /api/messages
// @desc    Send a new message
// @access  Private
router.post('/', (req, res) => {
    const { conversationId, content, type = 'text' } = req.body;
    
    const newMessage = {
        id: Date.now().toString(),
        conversationId,
        senderId: req.user?.id || '1',
        content,
        type,
        timestamp: new Date(),
        status: 'sent'
    };
    
    messages.push(newMessage);
    
    res.status(201).json({
        success: true,
        data: newMessage
    });
});

module.exports = router;