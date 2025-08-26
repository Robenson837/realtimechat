const express = require('express');
const { body, validationResult } = require('express-validator');
const { getModels } = require('../models');
const { auth } = require('../middleware/auth');
const { getUserPresence } = require('../socket/socketHandlers');

const router = express.Router();

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        res.json({
            success: true,
            data: req.user
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   PUT /api/users/me
// @desc    Update current user profile
// @access  Private
router.put('/me', auth, [
    body('fullName')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters')
        .trim(),
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('username')
        .optional()
        .isLength({ min: 3, max: 30 })
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
    body('statusMessage')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Status message must be less than 100 characters')
        .trim(),
    body('bio')
        .optional()
        .isLength({ max: 300 })
        .withMessage('Bio must be less than 300 characters')
        .trim()
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

        const updates = {};
        const allowedUpdates = ['fullName', 'email', 'username', 'statusMessage', 'avatar', 'bio'];
        
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key) && req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        });

        const { User } = getModels();
        
        // Check for email uniqueness if email is being updated
        if (updates.email) {
            const existingEmailUser = await User.findOne({ 
                email: updates.email, 
                _id: { $ne: req.user._id } 
            });
            if (existingEmailUser) {
                return res.status(409).json({
                    success: false,
                    message: 'Email already in use by another user',
                    field: 'email'
                });
            }
        }
        
        // Check for username uniqueness if username is being updated
        if (updates.username) {
            const existingUsernameUser = await User.findOne({ 
                username: updates.username, 
                _id: { $ne: req.user._id } 
            });
            if (existingUsernameUser) {
                return res.status(409).json({
                    success: false,
                    message: 'Username already taken by another user',
                    field: 'username'
                });
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating profile'
        });
    }
});

// @route   PUT /api/users/settings
// @desc    Update user settings
// @access  Private
router.put('/settings', auth, async (req, res) => {
    try {
        const { notifications, privacy, theme } = req.body;
        
        const updates = {};
        if (notifications) updates['settings.notifications'] = notifications;
        if (privacy) updates['settings.privacy'] = privacy;
        if (theme) updates['settings.theme'] = theme;

        const { User } = getModels();
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Settings updated successfully',
            data: user.settings
        });

    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating settings'
        });
    }
});

// @route   GET /api/users/search
// @desc    Search users by username or email
// @access  Private
router.get('/search', auth, async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;
        
        if (!q || q.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters'
            });
        }

        const { User } = getModels();
        
        // Get current user's blocked users list
        const currentUser = await User.findById(req.user._id);
        const blockedByCurrentUser = (currentUser.blockedUsers || []).map(blocked => blocked.user.toString());
        
        // Find users who have blocked the current user
        const usersWhoBlockedCurrent = await User.find({
            'blockedUsers.user': req.user._id,
            isActive: true
        }).select('_id');
        const blockedCurrentUserIds = usersWhoBlockedCurrent.map(user => user._id.toString());
        
        // Combine both blocked lists
        const allBlockedIds = [...blockedByCurrentUser, ...blockedCurrentUserIds];
        
        const users = await User.find({
            $and: [
                { _id: { $ne: req.user._id } }, // Exclude current user
                { _id: { $nin: allBlockedIds } }, // Exclude all blocked users (both ways)
                { isActive: true },
                {
                    $or: [
                        { username: { $regex: q, $options: 'i' } },
                        { fullName: { $regex: q, $options: 'i' } },
                        { email: { $regex: q, $options: 'i' } }
                    ]
                }
            ]
        })
        .select('username fullName avatar status lastSeen bio createdAt')
        .limit(parseInt(limit));

        res.json({
            success: true,
            data: users
        });

    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error searching users'
        });
    }
});

// @route   GET /api/users/:id
// @desc    Get user profile by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const { User } = getModels();
        const user = await User.findById(req.params.id)
            .select('username fullName email avatar status statusMessage lastSeen isActive bio createdAt');


        if (!user || !user.isActive) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Always show email for contacts - no privacy restrictions on email for contacts
        const isContact = req.user.contacts.some(contact => 
            contact.user.toString() === req.params.id
        );
        


        const profile = user.getPublicProfile();
        
        // Apply privacy filters based on contact relationship
        if (user.settings?.privacy) {
            // Handle email privacy - default is 'contacts' (show to contacts only)
            const emailPrivacy = user.settings.privacy.email || 'contacts';
            
            // Email visibility logic:
            // - 'everyone': show to all users
            // - 'contacts': show only to contacts 
            // - 'nobody': show to no one
            if (emailPrivacy === 'nobody') {
                delete profile.email;
            } else if (emailPrivacy === 'contacts' && !isContact) {
                delete profile.email;
            }
            
            // Handle other privacy settings (only for non-contacts)
            if (!isContact) {
                if (user.settings.privacy.lastSeen !== 'everyone') {
                    delete profile.lastSeen;
                }
                if (user.settings.privacy.status !== 'everyone') {
                    delete profile.statusMessage;
                }
                if (user.settings.privacy.profilePhoto !== 'everyone') {
                    delete profile.avatar;
                }
            }
        }
        
        // FORCE: Always ensure email is available for contacts
        if (isContact && !profile.email && user.email) {
            profile.email = user.email;
        }


        res.json({
            success: true,
            data: profile
        });

    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   PUT /api/users/status
// @desc    Update user status
// @access  Private
router.put('/status', auth, [
    body('status')
        .isIn(['online', 'offline', 'away', 'busy'])
        .withMessage('Invalid status'),
    body('statusMessage')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Status message must be less than 100 characters')
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

        const { status, statusMessage = '' } = req.body;

        const { User } = getModels();
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { 
                status, 
                statusMessage,
                lastSeen: new Date()
            },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Status updated successfully',
            data: {
                status: user.status,
                statusMessage: user.statusMessage,
                lastSeen: user.lastSeen
            }
        });

    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating status'
        });
    }
});

// @route   DELETE /api/users/me
// @desc    Deactivate user account
// @access  Private
router.delete('/me', auth, async (req, res) => {
    try {
        const { User } = getModels();
        await User.findByIdAndUpdate(req.user._id, {
            isActive: false,
            status: 'offline'
        });

        res.json({
            success: true,
            message: 'Account deactivated successfully'
        });

    } catch (error) {
        console.error('Deactivate account error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deactivating account'
        });
    }
});

// Configure multer for avatar uploads
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const avatarStorage = multer.memoryStorage();
const avatarUpload = multer({
    storage: avatarStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB máximo
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen'), false);
        }
    }
});

// @route   POST /api/users/avatar
// @desc    Upload user avatar
// @access  Private
router.post('/avatar', auth, avatarUpload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Crear directorio de avatares si no existe
        const avatarDir = path.join(__dirname, '../uploads/avatars');
        try {
            await fs.access(avatarDir);
        } catch {
            await fs.mkdir(avatarDir, { recursive: true });
        }

        // Generar nombre único para el archivo
        const fileExtension = path.extname(req.file.originalname) || '.jpg';
        const fileName = `${req.user._id}_${Date.now()}${fileExtension}`;
        const filePath = path.join(avatarDir, fileName);

        // Guardar archivo
        await fs.writeFile(filePath, req.file.buffer);

        // Actualizar usuario en la base de datos
        const { User } = getModels();
        const avatarUrl = `/uploads/avatars/${fileName}`;
        
        // Eliminar avatar anterior si existe
        const currentUser = await User.findById(req.user._id);
        if (currentUser.avatar && (currentUser.avatar.startsWith('/avatars/') || currentUser.avatar.startsWith('/uploads/avatars/'))) {
            const oldAvatarPath = currentUser.avatar.startsWith('/uploads/') 
                ? path.join(__dirname, '..', currentUser.avatar)
                : path.join(__dirname, '../public', currentUser.avatar);
            try {
                await fs.unlink(oldAvatarPath);
            } catch (error) {
                console.log('Could not delete old avatar:', error.message);
            }
        }

        // Actualizar avatar en la base de datos
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { avatar: avatarUrl },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Avatar uploaded successfully',
            avatarUrl: avatarUrl,
            user: updatedUser
        });

    } catch (error) {
        console.error('Upload avatar error:', error);
        
        // Handle multer errors specifically
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'Archivo demasiado grande. Máximo 5MB'
                });
            }
            if (error.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({
                    success: false,
                    message: 'Tipo de archivo no permitido'
                });
            }
        }
        
        res.status(500).json({
            success: false,
            message: error.message || 'Server error uploading avatar'
        });
    }
});

// @route   DELETE /api/users/avatar
// @desc    Delete user avatar
// @access  Private
router.delete('/avatar', auth, async (req, res) => {
    try {
        const { User } = getModels();
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Eliminar archivo físico si existe
        if (user.avatar && (user.avatar.startsWith('/avatars/') || user.avatar.startsWith('/uploads/avatars/'))) {
            const path = require('path');
            const fs = require('fs').promises;
            const avatarPath = user.avatar.startsWith('/uploads/') 
                ? path.join(__dirname, '..', user.avatar)
                : path.join(__dirname, '../public', user.avatar);
            
            try {
                await fs.unlink(avatarPath);
            } catch (error) {
                console.log('Could not delete avatar file:', error.message);
            }
        }

        // Actualizar usuario en la base de datos (avatar por defecto)
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { avatar: null },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Avatar deleted successfully',
            user: updatedUser
        });

    } catch (error) {
        console.error('Delete avatar error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting avatar'
        });
    }
});

// @route   GET /api/users/:id/presence
// @desc    Get user presence status (online/offline/lastSeen)
// @access  Private
router.get('/:id/presence', auth, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Get presence from sessions system
        const presenceData = await getUserPresence(userId);
        
        res.json({
            success: true,
            data: {
                userId,
                status: presenceData.status,
                lastSeen: presenceData.lastSeen,
                sessionCount: presenceData.sessionCount,
                isOnline: presenceData.status === 'online'
            }
        });
        
    } catch (error) {
        console.error('Get presence error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting user presence'
        });
    }
});

// @route   POST /api/users/presence/batch
// @desc    Get presence for multiple users
// @access  Private
router.post('/presence/batch', auth, async (req, res) => {
    try {
        const { userIds } = req.body;
        
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'userIds must be a non-empty array'
            });
        }
        
        const presenceData = {};
        
        // Get presence for each user
        for (const userId of userIds) {
            try {
                const presence = await getUserPresence(userId);
                presenceData[userId] = {
                    status: presence.status,
                    lastSeen: presence.lastSeen,
                    sessionCount: presence.sessionCount,
                    isOnline: presence.status === 'online'
                };
            } catch (error) {
                console.error(`Error getting presence for user ${userId}:`, error);
                presenceData[userId] = {
                    status: 'offline',
                    lastSeen: null,
                    sessionCount: 0,
                    isOnline: false
                };
            }
        }
        
        res.json({
            success: true,
            data: presenceData
        });
        
    } catch (error) {
        console.error('Batch presence error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting batch presence'
        });
    }
});

module.exports = router;