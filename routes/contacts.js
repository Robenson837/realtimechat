const express = require('express');
const { body, validationResult } = require('express-validator');
const { getModels } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/contacts/search
// @desc    Search users for adding contacts
// @access  Private
router.get('/search', auth, async (req, res) => {
    try {
        console.log('Search endpoint hit with query:', req.query, 'User:', req.user?.username);
        const { q } = req.query;
        const { User } = getModels();

        // Require at least 3 characters
        if (!q || q.length < 3) {
            return res.json({
                success: true,
                data: [],
                message: 'Ingresa al menos 3 caracteres para buscar'
            });
        }

        const currentUserId = req.user._id;
        
        // Get current user's contacts and sent requests for status indicators
        const currentUser = await User.findById(currentUserId);
        const contactIds = currentUser.contacts.map(c => c.user.toString());
        const sentRequestIds = currentUser.sentRequests?.map(r => r.to?.toString()) || [];
        const receivedRequestIds = currentUser.contactRequests?.map(r => r.from?.toString()) || [];
        const blockedByCurrentUser = (currentUser.blockedUsers || []).map(blocked => blocked.user.toString());
        
        // Find users who have blocked the current user
        const usersWhoBlockedCurrent = await User.find({
            'blockedUsers.user': currentUserId,
            isActive: true
        }).select('_id');
        const blockedCurrentUserIds = usersWhoBlockedCurrent.map(user => user._id.toString());
        
        // Combine both blocked lists
        const allBlockedIds = [...blockedByCurrentUser, ...blockedCurrentUserIds];
        
        // Enhanced search - by username, fullName or email with better matching
        const searchRegex = new RegExp(q.trim(), 'i');
        const users = await User.find({
            $and: [
                { _id: { $ne: currentUserId } }, // Exclude current user
                { _id: { $nin: allBlockedIds } }, // Exclude all blocked users (both ways)
                { isActive: true }, // Only active users
                {
                    $or: [
                        { username: searchRegex },
                        { fullName: searchRegex },
                        { email: searchRegex }
                    ]
                }
            ]
        })
        .select('username fullName email avatar status lastSeen bio createdAt')
        .limit(15)
        .sort({ 
            // Sort by relevance - exact matches first, then partial
            fullName: 1,
            username: 1 
        });

        console.log(`Found ${users.length} users for query "${q}"`);

        // Add relationship status to each user
        const usersWithStatus = users.map(user => {
            const userId = user._id.toString();
            let relationshipStatus = 'none'; // none, contact, sent, received
            
            if (contactIds.includes(userId)) {
                relationshipStatus = 'contact';
            } else if (sentRequestIds.includes(userId)) {
                relationshipStatus = 'sent';
            } else if (receivedRequestIds.includes(userId)) {
                relationshipStatus = 'received';
            }
            
            return {
                ...user.toObject(),
                relationshipStatus
            };
        });

        res.json({
            success: true,
            data: usersWithStatus,
            message: users.length > 0 ? `${users.length} usuarios encontrados` : `No se encontraron usuarios con "${q}"`
        });

    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al buscar usuarios',
            error: error.message
        });
    }
});

// @route   GET /api/contacts
// @desc    Get user contacts with real-time status
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { User } = getModels();
        const user = await User.findById(req.user._id)
            .populate({
                path: 'contacts.user',
                select: 'username fullName avatar status statusMessage lastSeen isActive bio createdAt',
                match: { isActive: true }
            });

        // Get active users from socket (real-time connected users)
        const io = req.app.get('io');
        const activeUsers = req.app.get('activeUsers') || new Map();

        const contacts = user.contacts
            .filter(contact => contact.user) // Remove contacts where user is null (deactivated accounts)
            .map(contact => {
                const contactData = contact.user.toObject();
                const userId = contactData._id.toString();
                
                // Check if user is actually connected in real-time
                const isReallyOnline = activeUsers.has(userId);
                
                // Update status based on real connection
                if (isReallyOnline) {
                    const activeUser = activeUsers.get(userId);
                    contactData.status = activeUser.user.status || 'online';
                    contactData.lastSeen = activeUser.lastActivity || contactData.lastSeen;
                } else {
                    // User is not connected, ensure status is offline
                    contactData.status = 'offline';
                    // Keep the lastSeen from database as it represents when they were last online
                }
                
                return {
                    ...contactData,
                    addedAt: contact.addedAt,
                    blocked: contact.blocked,
                    isReallyOnline: isReallyOnline // Add flag for debugging
                };
            })
            .sort((a, b) => a.fullName.localeCompare(b.fullName));

        res.json({
            success: true,
            data: contacts
        });

    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching contacts'
        });
    }
});

// @route   POST /api/contacts/request
// @desc    Send contact request
// @access  Private
router.post('/request', auth, [
    body('userId')
        .notEmpty()
        .withMessage('User ID is required')
        .isMongoId()
        .withMessage('Invalid user ID'),
    body('message')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Message must be less than 200 characters')
], async (req, res) => {
    try {
        const { User } = getModels();
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { userId, message = '' } = req.body;

        // Check if trying to add yourself
        if (userId === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot add yourself as contact'
            });
        }

        // Check if target user exists
        const targetUser = await User.findById(userId);
        if (!targetUser || !targetUser.isActive) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if already a contact
        const currentUser = await User.findById(req.user._id);
        const isAlreadyContact = currentUser.contacts.some(contact =>
            contact.user.toString() === userId
        );

        if (isAlreadyContact) {
            return res.status(400).json({
                success: false,
                message: 'User is already in your contacts'
            });
        }

        // Check if request already sent
        const existingRequest = targetUser.contactRequests.find(request =>
            request.from.toString() === req.user._id.toString()
        );

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                message: 'Contact request already sent'
            });
        }

        // Add contact request to target user
        targetUser.contactRequests.push({
            from: req.user._id,
            message
        });

        // Add sent request to current user
        currentUser.sentRequests = currentUser.sentRequests || [];
        currentUser.sentRequests.push({
            to: userId,
            message
        });

        await targetUser.save();
        await currentUser.save();

        res.json({
            success: true,
            message: 'Contact request sent successfully'
        });

    } catch (error) {
        console.error('Send contact request error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error sending contact request'
        });
    }
});

// @route   GET /api/contacts/requests
// @desc    Get pending contact requests
// @access  Private
router.get('/requests', auth, async (req, res) => {
    try {
        const { User } = getModels();
        const user = await User.findById(req.user._id)
            .populate({
                path: 'contactRequests.from',
                select: 'username fullName avatar status bio createdAt'
            });

        const requests = user.contactRequests.map(request => ({
            _id: request._id,
            from: request.from,
            message: request.message,
            sentAt: request.sentAt
        }));

        res.json({
            success: true,
            data: requests
        });

    } catch (error) {
        console.error('Get contact requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching contact requests'
        });
    }
});

// @route   POST /api/contacts/requests/:requestId/accept
// @desc    Accept contact request
// @access  Private
router.post('/requests/:requestId/accept', auth, async (req, res) => {
    try {
        const { User } = getModels();
        const user = await User.findById(req.user._id);
        const request = user.contactRequests.id(req.params.requestId);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Contact request not found'
            });
        }

        const requesterId = request.from;

        // Add to contacts (both users)
        await user.addContact(requesterId);
        
        const requester = await User.findById(requesterId);
        if (requester) {
            await requester.addContact(req.user._id);
        }

        // Remove the request from receiver
        user.contactRequests.pull({ _id: req.params.requestId });
        await user.save();

        // Remove sent request from requester
        if (requester) {
            const sentRequestIndex = requester.sentRequests.findIndex(
                req => req.to.toString() === user._id.toString()
            );
            if (sentRequestIndex > -1) {
                requester.sentRequests.splice(sentRequestIndex, 1);
                await requester.save();
            }
        }

        res.json({
            success: true,
            message: 'Contact request accepted'
        });

    } catch (error) {
        console.error('Accept contact request error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error accepting contact request'
        });
    }
});

// @route   POST /api/contacts/requests/:requestId/reject
// @desc    Reject contact request
// @access  Private
router.post('/requests/:requestId/reject', auth, async (req, res) => {
    try {
        const { User } = getModels();
        const user = await User.findById(req.user._id);
        const request = user.contactRequests.id(req.params.requestId);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Contact request not found'
            });
        }

        const requesterId = request.from;
        
        // Remove the request from receiver
        user.contactRequests.pull({ _id: req.params.requestId });
        await user.save();

        // Remove sent request from requester
        const requester = await User.findById(requesterId);
        if (requester) {
            const sentRequestIndex = requester.sentRequests.findIndex(
                req => req.to.toString() === user._id.toString()
            );
            if (sentRequestIndex > -1) {
                requester.sentRequests.splice(sentRequestIndex, 1);
                await requester.save();
            }
        }

        res.json({
            success: true,
            message: 'Contact request rejected'
        });

    } catch (error) {
        console.error('Decline contact request error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error declining contact request'
        });
    }
});

// @route   DELETE /api/contacts/:contactId
// @desc    Remove contact (unfriend)
// @access  Private
router.delete('/:contactId', auth, async (req, res) => {
    try {
        const { User } = getModels();
        const user = await User.findById(req.user._id);
        const contact = await User.findById(req.params.contactId);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        // Check if they are actually contacts
        const isContact = user.contacts.some(c => c.user.toString() === req.params.contactId);
        if (!isContact) {
            return res.status(400).json({
                success: false,
                message: 'User is not in your contacts'
            });
        }

        // Remove from both users' contacts
        await user.removeContact(req.params.contactId);
        await contact.removeContact(req.user._id);

        res.json({
            success: true,
            message: 'Contact removed successfully'
        });

    } catch (error) {
        console.error('Remove contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error removing contact'
        });
    }
});

// @route   POST /api/contacts/:contactId/block
// @desc    Block contact (automatically unfriends if needed)
// @access  Private
router.post('/:contactId/block', auth, async (req, res) => {
    try {
        const { User } = getModels();
        const user = await User.findById(req.user._id);
        const targetUser = await User.findById(req.params.contactId);

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if trying to block yourself
        if (req.params.contactId === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot block yourself'
            });
        }

        // Check if user is already blocked
        const isAlreadyBlocked = user.blockedUsers && user.blockedUsers.some(blocked => blocked.user.toString() === req.params.contactId);
        if (isAlreadyBlocked) {
            return res.status(400).json({
                success: false,
                message: 'User is already blocked'
            });
        }

        // If they are contacts, remove the friendship first
        const isContact = user.contacts.some(c => c.user.toString() === req.params.contactId);
        if (isContact) {
            await user.removeContact(req.params.contactId);
            await targetUser.removeContact(req.user._id);
        }

        // Add to blocked users list with timestamp
        if (!user.blockedUsers) {
            user.blockedUsers = [];
        }
        user.blockedUsers.push({
            user: req.params.contactId,
            blockedAt: new Date()
        });
        await user.save();

        res.json({
            success: true,
            message: 'User blocked successfully'
        });

    } catch (error) {
        console.error('Block contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error blocking contact'
        });
    }
});

// @route   POST /api/contacts/:contactId/unblock
// @desc    Unblock contact
// @access  Private
router.post('/:contactId/unblock', auth, async (req, res) => {
    try {
        const { User } = getModels();
        const user = await User.findById(req.user._id);

        const blockedIndex = user.blockedUsers ? user.blockedUsers.findIndex(blocked => blocked.user.toString() === req.params.contactId) : -1;
        if (blockedIndex === -1) {
            return res.status(400).json({
                success: false,
                message: 'User is not blocked'
            });
        }

        // Remove from blocked users list
        user.blockedUsers.splice(blockedIndex, 1);
        await user.save();

        res.json({
            success: true,
            message: 'User unblocked successfully'
        });

    } catch (error) {
        console.error('Unblock contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error unblocking contact'
        });
    }
});

// @route   GET /api/contacts/blocked
// @desc    Get blocked contacts
// @access  Private
router.get('/blocked', auth, async (req, res) => {
    try {
        const { User } = getModels();
        const user = await User.findById(req.user._id)
            .populate({
                path: 'blockedUsers.user',
                select: 'username fullName avatar bio createdAt',
                match: { isActive: true }
            });

        const blockedContacts = user.blockedUsers || [];

        res.json({
            success: true,
            data: blockedContacts
                .filter(blockedItem => blockedItem.user !== null)
                .map(blockedItem => ({
                    ...blockedItem.user.toObject(),
                    blockedAt: blockedItem.blockedAt // Fecha real de bloqueo
                }))
        });

    } catch (error) {
        console.error('Get blocked contacts error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching blocked contacts'
        });
    }
});

module.exports = router;