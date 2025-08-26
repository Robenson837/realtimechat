const express = require('express');
const router = express.Router();

// Fallback routes for upload (in-memory storage)

// @route   POST /api/upload/avatar
// @desc    Upload user avatar
// @access  Private
router.post('/avatar', (req, res) => {
    // Simulate successful upload
    res.json({
        success: true,
        message: 'Avatar uploaded successfully (fallback mode)',
        data: {
            filename: 'avatar.png',
            url: '/uploads/avatars/avatar.png'
        }
    });
});

// @route   POST /api/upload/file
// @desc    Upload file
// @access  Private
router.post('/file', (req, res) => {
    // Simulate successful upload
    res.json({
        success: true,
        message: 'File uploaded successfully (fallback mode)',
        data: {
            filename: 'file.txt',
            url: '/uploads/files/file.txt'
        }
    });
});

module.exports = router;