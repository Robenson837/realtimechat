const express = require('express');
const router = express.Router();

// Fallback routes for contacts (in-memory storage)
let contacts = [];

// @route   GET /api/contacts
// @desc    Get user contacts
// @access  Private
router.get('/', (req, res) => {
    res.json({
        success: true,
        data: contacts
    });
});

// @route   POST /api/contacts
// @desc    Add new contact
// @access  Private
router.post('/', (req, res) => {
    const { username, message } = req.body;
    
    const newContact = {
        id: Date.now().toString(),
        username,
        message,
        status: 'pending',
        createdAt: new Date()
    };
    
    contacts.push(newContact);
    
    res.status(201).json({
        success: true,
        data: newContact
    });
});

module.exports = router;