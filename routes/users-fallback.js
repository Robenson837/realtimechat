const express = require('express');
const router = express.Router();

// Fallback routes for users (in-memory storage)

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', (req, res) => {
    res.json({
        success: true,
        data: {
            id: req.user?.id || '1',
            username: req.user?.username || 'user',
            email: req.user?.email || 'user@example.com',
            fullName: req.user?.fullName || 'Usuario',
            avatar: null,
            status: 'online'
        }
    });
});

// @route   GET /api/users
// @desc    Get all users
// @access  Private
router.get('/', (req, res) => {
    res.json({
        success: true,
        data: []
    });
});

module.exports = router;