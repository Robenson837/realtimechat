//archivo utils/cleanup.js
const Message = require('../models/Message');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const fs = require('fs').promises;
const path = require('path');

// Clean up old messages (older than 30 days)
const cleanupOldMessages = async () => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        // Find messages to delete
        const messagesToDelete = await Message.find({
            createdAt: { $lt: thirtyDaysAgo },
            'deleted.isDeleted': true
        });

        console.log(`Found ${messagesToDelete.length} old deleted messages to cleanup`);

        // Delete associated files
        for (const message of messagesToDelete) {
            if (message.attachments && message.attachments.length > 0) {
                for (const attachment of message.attachments) {
                    try {
                        const filePath = path.join(__dirname, '..', attachment.path);
                        await fs.unlink(filePath);
                        
                        // Also delete thumbnail if exists
                        if (attachment.thumbnail) {
                            const thumbnailPath = path.join(__dirname, '..', attachment.thumbnail);
                            await fs.unlink(thumbnailPath).catch(() => {});
                        }
                    } catch (error) {
                        console.warn(`Could not delete file ${attachment.path}:`, error.message);
                    }
                }
            }
        }

        // Delete messages from database
        const deleteResult = await Message.deleteMany({
            createdAt: { $lt: thirtyDaysAgo },
            'deleted.isDeleted': true
        });

        console.log(`Deleted ${deleteResult.deletedCount} old messages`);
        
    } catch (error) {
        console.error('Error during message cleanup:', error);
    }
};

// Clean up inactive users (haven't logged in for 90 days)
const cleanupInactiveUsers = async () => {
    try {
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        
        // Find inactive users
        const inactiveUsers = await User.find({
            lastSeen: { $lt: ninetyDaysAgo },
            isActive: true
        });

        console.log(`Found ${inactiveUsers.length} inactive users`);

        for (const user of inactiveUsers) {
            // Mark user as inactive
            user.isActive = false;
            user.status = 'offline';
            await user.save();

            // Clean up user avatar if exists
            if (user.avatar && user.avatar.startsWith('/uploads/')) {
                try {
                    const avatarPath = path.join(__dirname, '..', user.avatar);
                    await fs.unlink(avatarPath);
                } catch (error) {
                    console.warn(`Could not delete avatar ${user.avatar}:`, error.message);
                }
            }
        }

        console.log(`Marked ${inactiveUsers.length} users as inactive`);
        
    } catch (error) {
        console.error('Error during user cleanup:', error);
    }
};

// Clean up orphaned files
const cleanupOrphanedFiles = async () => {
    try {
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const subdirs = ['avatars', 'images', 'files'];

        for (const subdir of subdirs) {
            const dirPath = path.join(uploadsDir, subdir);
            
            try {
                const files = await fs.readdir(dirPath);
                console.log(`Checking ${files.length} files in ${subdir}`);

                for (const file of files) {
                    const filePath = path.join(dirPath, file);
                    const stats = await fs.stat(filePath);
                    
                    // Skip directories and thumbnails
                    if (stats.isDirectory() || file.startsWith('thumb-')) {
                        continue;
                    }

                    const fileUrl = `/uploads/${subdir}/${file}`;
                    let isOrphaned = true;

                    if (subdir === 'avatars') {
                        // Check if avatar is used by any user
                        const userExists = await User.exists({ avatar: fileUrl });
                        isOrphaned = !userExists;
                    } else {
                        // Check if file is used in any message
                        const messageExists = await Message.exists({
                            'attachments.path': fileUrl
                        });
                        isOrphaned = !messageExists;
                    }

                    if (isOrphaned) {
                        // Check if file is older than 1 day before deleting
                        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                        if (stats.mtime < oneDayAgo) {
                            await fs.unlink(filePath);
                            
                            // Also delete thumbnail if exists
                            const thumbnailPath = path.join(dirPath, `thumb-${file}`);
                            await fs.unlink(thumbnailPath).catch(() => {});
                            
                            console.log(`Deleted orphaned file: ${fileUrl}`);
                        }
                    }
                }
            } catch (error) {
                console.warn(`Error processing directory ${subdir}:`, error.message);
            }
        }
    } catch (error) {
        console.error('Error during file cleanup:', error);
    }
};

// Clean up empty conversations
const cleanupEmptyConversations = async () => {
    try {
        // Find conversations with no recent messages
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        const emptyConversations = await Conversation.find({
            lastActivity: { $lt: thirtyDaysAgo },
            lastMessage: { $exists: false }
        });

        console.log(`Found ${emptyConversations.length} empty conversations`);

        for (const conversation of emptyConversations) {
            // Check if conversation actually has any messages
            const messageCount = await Message.countDocuments({
                $or: [
                    { sender: conversation.participants[0], recipient: conversation.participants[1] },
                    { sender: conversation.participants[1], recipient: conversation.participants[0] }
                ]
            });

            if (messageCount === 0) {
                await conversation.deleteOne();
                console.log(`Deleted empty conversation: ${conversation._id}`);
            }
        }
    } catch (error) {
        console.error('Error during conversation cleanup:', error);
    }
};

// Generate usage statistics
const generateUsageStats = async () => {
    try {
        const stats = {
            timestamp: new Date(),
            users: {
                total: await User.countDocuments(),
                active: await User.countDocuments({ isActive: true }),
                online: await User.countDocuments({ status: 'online' })
            },
            messages: {
                total: await Message.countDocuments(),
                today: await Message.countDocuments({
                    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                }),
                thisWeek: await Message.countDocuments({
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                })
            },
            conversations: {
                total: await Conversation.countDocuments(),
                active: await Conversation.countDocuments({
                    lastActivity: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                })
            }
        };

        console.log('📊 Usage Statistics:', JSON.stringify(stats, null, 2));
        
        // Here you could save stats to a file or send to analytics service
        
    } catch (error) {
        console.error('Error generating usage stats:', error);
    }
};

// Main cleanup function
const runCleanup = async () => {
    console.log('🧹 Starting cleanup tasks...');
    const startTime = Date.now();

    await Promise.all([
        cleanupOldMessages(),
        cleanupOrphanedFiles(),
        cleanupEmptyConversations()
    ]);

    // Run less frequent cleanups
    const now = new Date();
    if (now.getDay() === 0) { // Run on Sundays
        await cleanupInactiveUsers();
    }

    await generateUsageStats();

    const duration = Date.now() - startTime;
    console.log(`✅ Cleanup completed in ${duration}ms`);
};

module.exports = {
    cleanupOldMessages,
    cleanupInactiveUsers,
    cleanupOrphanedFiles,
    cleanupEmptyConversations,
    generateUsageStats,
    runCleanup
};