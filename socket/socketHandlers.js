const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Session = require('../models/Session');
const CryptoJS = require('crypto-js');
const { v4: uuidv4 } = require('uuid');
const messageBatchService = require('../services/messageBatchService');

// Store active connections with session management
const activeUsers = new Map();
const userSessions = new Map(); // userId -> Set of sessionIds
const sessionData = new Map(); // sessionId -> session info

// Buffer system for presence updates - wait 2 minutes before marking offline (improved from 5 minutes)
const offlineBuffers = new Map(); // userId -> timeout ID
const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutes for inactivity

// Get user presence from active sessions (MongoDB + Memory)
const getUserPresence = async (userId) => {
    try {
        // First check memory (fastest)
        const memoryUser = activeUsers.get(userId);
        if (memoryUser && memoryUser.connectionCount > 0) {
            return {
                status: 'online',
                lastSeen: memoryUser.lastActivity,
                sessionCount: memoryUser.connectionCount
            };
        }
        
        // Check MongoDB sessions
        const activeSessions = await Session.findActiveSessions(userId);
        if (activeSessions.length > 0) {
            const mostRecentSession = activeSessions[0]; // Sorted by lastActivity desc
            const lastActivity = mostRecentSession.lastActivity;
            const timeDiff = Date.now() - lastActivity.getTime();
            
            // Si la última actividad fue hace menos de 2 minutos, considerar como online
            if (timeDiff < INACTIVITY_TIMEOUT) {
                return {
                    status: 'online',
                    lastSeen: lastActivity,
                    sessionCount: activeSessions.length
                };
            } else {
                return {
                    status: 'offline',
                    lastSeen: lastActivity,
                    sessionCount: 0
                };
            }
        }
        
        // Fallback to User model
        const user = await User.findById(userId);
        if (user) {
            return {
                status: user.status || 'offline',
                lastSeen: user.lastSeen || user.updatedAt,
                sessionCount: 0
            };
        }
        
        return {
            status: 'offline',
            lastSeen: null,
            sessionCount: 0
        };
        
    } catch (error) {
        console.error('Error getting user presence:', error);
        return {
            status: 'offline',
            lastSeen: null,
            sessionCount: 0
        };
    }
};

// Schedule offline update with 5-minute buffer
const scheduleOfflineUpdate = (userId, io) => {
    // Cancel any existing buffer for this user
    const existingTimeout = offlineBuffers.get(userId);
    if (existingTimeout) {
        clearTimeout(existingTimeout);
    }
    
    console.log(`⏱️ Iniciando buffer de 2 minutos para marcar offline a usuario ${userId}`);
    
    // Set 2-minute buffer before marking offline (improved from 5 minutes)
    const timeoutId = setTimeout(async () => {
        try {
            // Double-check user still has no active connections
            const userConnectionsSet = userSessions.get(userId);
            if (!userConnectionsSet || userConnectionsSet.size === 0) {
                // Update database
                await User.findByIdAndUpdate(userId, {
                    status: 'offline',
                    lastSeen: new Date()
                });

                // Broadcast offline status
                broadcastUserStatus(userId, 'offline');
                
                console.log(`❌ Usuario ${userId} marcado como OFFLINE después del buffer de 2 minutos`);
            } else {
                console.log(`✅ Usuario ${userId} se reconectó durante el buffer, mantiene status online`);
            }
            
            // Remove from buffer tracking
            offlineBuffers.delete(userId);
        } catch (error) {
            console.error('Error in offline buffer update:', error);
            offlineBuffers.delete(userId);
        }
    }, INACTIVITY_TIMEOUT); // 2 minutes
    
    // Store timeout ID for potential cancellation
    offlineBuffers.set(userId, timeoutId);
};

// Cancel offline buffer when user reconnects
const cancelOfflineBuffer = (userId) => {
    const existingTimeout = offlineBuffers.get(userId);
    if (existingTimeout) {
        clearTimeout(existingTimeout);
        offlineBuffers.delete(userId);
        console.log(`🔄 Buffer de offline cancelado para usuario ${userId} (reconexión)`);
        return true;
    }
    return false;
};

// Immediate offline update for logout/close-session (no buffer)
const setImmediateOffline = async (userId, io) => {
    try {
        // Cancel any existing buffer
        cancelOfflineBuffer(userId);
        
        // Update database immediately
        await User.findByIdAndUpdate(userId, {
            status: 'offline',
            lastSeen: new Date()
        });

        // Broadcast offline status immediately
        broadcastUserStatus(userId, 'offline');
        
        console.log(`Usuario ${userId} marcado como OFFLINE inmediatamente (logout/close-session)`);
        
        return true;
    } catch (error) {
        console.error('Error setting immediate offline:', error);
        return false;
    }
};

const initializeSocketHandlers = (io) => {
    // Connection handling with error management
    io.engine.on("connection_error", (err) => {
        console.log('Socket connection error:', err.req);
        console.log('Error code:', err.code);
        console.log('Error message:', err.message);
        console.log('Error context:', err.context);
    });

    io.on('connection', async (socket) => {
        // Validate user data
        if (!socket.user || !socket.userId) {
            socket.disconnect(true);
            return;
        }
        
        console.log(`🔌 User ${socket.user.fullName} (${socket.userId}) connecting...`);
        
        try {
            // Crear o actualizar sesión en MongoDB
            const deviceInfo = Session.parseUserAgent(socket.handshake.headers['user-agent'] || 'Unknown');
            const clientIP = socket.handshake.address || 'unknown';
            const fingerprint = Session.generateFingerprint(
                socket.handshake.headers['user-agent'] || 'Unknown',
                clientIP
            );
            
            // Buscar sesión existente o crear nueva
            let dbSession = await Session.findOne({
                userId: socket.userId,
                'deviceInfo.fingerprint': fingerprint,
                status: 'active'
            });
            
            if (!dbSession) {
                // Crear nueva sesión en BD
                const sessionToken = Session.generateSessionToken();
                const refreshToken = Session.generateRefreshToken();
                
                dbSession = new Session({
                    userId: socket.userId,
                    sessionToken,
                    refreshToken,
                    deviceInfo: {
                        userAgent: socket.handshake.headers['user-agent'] || 'Unknown',
                        ...deviceInfo,
                        fingerprint
                    },
                    location: {
                        ip: clientIP
                    },
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
                    refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
                    lastActivity: new Date()
                });
                
                await dbSession.save();
                console.log(`💾 Nueva sesión creada en BD para ${socket.user.fullName}`);
            } else {
                // Actualizar sesión existente
                dbSession.lastActivity = new Date();
                dbSession.metadata.activityCount += 1;
                await dbSession.save();
                console.log(`🔄 Sesión actualizada en BD para ${socket.user.fullName}`);
            }
            
            // Usar el ID de sesión de MongoDB
            socket.sessionId = dbSession._id.toString();
            socket.dbSessionId = dbSession._id;
            socket.lastActivity = new Date();
            socket.sessionStartTime = new Date();
            
            // Store session data in memory for fast access
            const sharedSessionId = dbSession._id.toString();
            if (!sessionData.has(sharedSessionId)) {
                sessionData.set(sharedSessionId, {
                    userId: socket.userId,
                    user: socket.user,
                    connectedAt: new Date(),
                    lastActivity: new Date(),
                    isActive: true,
                    socketIds: new Set(),
                    warningShown: false,
                    dbSession: dbSession
                });
            }
            
            // Update session with current socket
            const sharedSession = sessionData.get(sharedSessionId);
            sharedSession.socketIds.add(socket.id);
            sharedSession.lastActivity = new Date();
            sharedSession.isActive = true;
            
            // Handle multiple connections per user
            if (!userSessions.has(socket.userId)) {
                userSessions.set(socket.userId, new Set());
            }
            
            userSessions.get(socket.userId).add(socket.id);
            
            // Update active users with connection info
            const userConnectionsSet = userSessions.get(socket.userId);
            const connectionCount = userConnectionsSet.size;
            
            // Store all socket IDs for this user for broadcasting
            const existingUser = activeUsers.get(socket.userId);
            activeUsers.set(socket.userId, {
                socketIds: Array.from(userConnectionsSet),
                primarySocketId: socket.id,
                user: socket.user,
                lastActivity: new Date(),
                connectedAt: existingUser?.connectedAt || new Date(),
                connectionCount: connectionCount,
                sharedSessionId: sharedSessionId,
                dbSession: dbSession
            });

            // Cancel any pending offline buffer for this user
            const wasBuffering = cancelOfflineBuffer(socket.userId);
            
            // Verificar si es la primera conexión de este usuario
            const activeSessions = await Session.findActiveSessions(socket.userId);
            const isFirstSession = connectionCount === 1;
            
            if (isFirstSession || wasBuffering) {
                // Actualizar estado del usuario en BD
                await User.findByIdAndUpdate(socket.userId, {
                    status: 'online',
                    lastSeen: new Date()
                });

                console.log(`✅ Usuario ${socket.user.fullName} ahora está EN LÍNEA ${wasBuffering ? '(canceló buffer offline)' : ''}`);
                
                // Broadcast user status to contacts
                broadcastUserStatus(socket.userId, 'online');
            }
            
            // Send connection info to client
            socket.emit('session-established', {
                sessionId: sharedSessionId,
                sessionCount: activeSessions.length,
                isFirstSession: isFirstSession
            });
            
        } catch (error) {
            console.error('Error setting up session:', error);
            socket.disconnect(true);
            return;
        }

        // Join user to their personal room for private messages
        socket.join(socket.userId);

        // Handle joining conversation rooms
        socket.on('join-conversation', async (conversationId) => {
            try {
                const conversation = await Conversation.findById(conversationId);
                if (conversation && conversation.participants.includes(socket.userId)) {
                    socket.join(`conversation-${conversationId}`);
                }
            } catch (error) {
                console.error('Error joining conversation:', error);
            }
        });

        // Handle leaving conversation rooms
        socket.on('leave-conversation', (conversationId) => {
            socket.leave(`conversation-${conversationId}`);
        });

        // Handle sending messages with ultra-fast delivery
        socket.on('send-message', async (data, callback) => {
            const processingStart = Date.now(); // Start timing immediately
            console.log('📥 Received send-message event:', {
                userId: socket.userId,
                dataKeys: Object.keys(data),
                content: data.content,
                recipientId: data.recipientId,
                clientId: data.clientId,
                type: data.type,
                attachments: data.attachments,
                hasContent: !!(data.content && data.content.trim()),
                hasAttachments: !!(data.attachments && data.attachments.length > 0)
            });
            
            try {
                const { recipientId, content, type = 'text', replyToId, attachments = [], timestamp, clientId } = data;
                
                // ULTRA-FAST VALIDATION - Allow messages with attachments or text
                const hasContent = content && content.trim();
                const hasAttachments = attachments && attachments.length > 0;
                
                if (!recipientId || !clientId) {
                    const error = { 
                        message: 'Invalid message data - missing required fields', 
                        clientId,
                        code: 'INVALID_DATA'
                    };
                    if (callback) callback({ success: false, error });
                    socket.emit('message-error', error);
                    return;
                }
                
                // Must have either content or attachments
                if (!hasContent && !hasAttachments) {
                    const error = { 
                        message: 'Message must have content or attachments', 
                        clientId,
                        code: 'EMPTY_MESSAGE'
                    };
                    if (callback) callback({ success: false, error });
                    socket.emit('message-error', error);
                    return;
                }
                
                // INSTANT ACKNOWLEDGMENT - Send immediately for green checkmark
                const callbackLatency = Date.now() - processingStart;
                if (callback) {
                    callback({ 
                        success: true, 
                        messageId: 'processing', // Temporary ID
                        timestamp: processingStart,
                        processingTime: callbackLatency,
                        clientId,
                        status: 'sent' // Tell client to show green checkmark immediately
                    });
                    console.log(`INSTANT callback sent in ${callbackLatency}ms for ${clientId}`);
                }

                // Input already validated above - removed duplicate validation

                // Ultra-fast parallel validation and creation with optimizations
                const [recipient, conversation] = await Promise.all([
                    User.findById(recipientId).select('isActive _id').lean(), // Minimal fields for speed
                    Conversation.findOrCreatePrivate(socket.userId, recipientId)
                ]);

                // Debug recipient data
                console.log('🔍 RECIPIENT DEBUG:', {
                    recipientId,
                    recipientExists: !!recipient,
                    recipientData: recipient,
                    isActive: recipient ? recipient.isActive : 'N/A'
                });

                if (!recipient) {
                    const error = { 
                        message: 'Recipient not found', 
                        clientId,
                        code: 'RECIPIENT_UNAVAILABLE'
                    };
                    console.log('❌ RECIPIENT ERROR:', error);
                    socket.emit('message-error', error);
                    return;
                }
                
                // Temporarily skip isActive check - re-enable if needed
                // if (!recipient.isActive) {
                //     console.log('⚠️ WARNING: Recipient inactive but allowing message:', recipientId);
                // }

                // Prepare message content (minimal processing)
                let messageContent = { text: content ? content.trim() : '', encrypted: false };
                if (conversation.encryptionKey && content && content.trim()) {
                    try {
                        messageContent = {
                            text: CryptoJS.AES.encrypt(content.trim(), conversation.encryptionKey).toString(),
                            encrypted: true
                        };
                    } catch (encError) {
                        console.warn('Encryption failed, sending unencrypted:', encError);
                        messageContent = { text: content.trim(), encrypted: false };
                    }
                }

                // Create and save message with minimal fields for speed
                const newMessage = new Message({
                    sender: socket.userId,
                    recipient: recipientId,
                    content: messageContent,
                    type,
                    status: 'sent', // Instantly mark as sent
                    attachments,
                    replyTo: replyToId,
                    clientId: clientId,
                    forwarded: data.forwarded || { isForwarded: false },
                    createdAt: new Date()
                });

                // Set forwardedBy to current user if this is a forwarded message
                if (data.forwarded && data.forwarded.isForwarded) {
                    newMessage.forwarded.forwardedBy = socket.userId;
                }

                // OPTIMIZED: Use cached user info and save in parallel
                const senderInfo = {
                    _id: socket.userId,
                    username: socket.user.username,
                    fullName: socket.user.fullName,
                    avatar: socket.user.avatar
                };
                
                // Save message (single operation, sender info from socket)
                const savedMessage = await newMessage.save();
                
                // Populate sender info manually for speed
                savedMessage.sender = senderInfo;

                // Decrypt content for transmission
                const messageToSend = savedMessage.toObject();
                if (messageContent.encrypted && conversation.encryptionKey) {
                    try {
                        messageToSend.content.text = CryptoJS.AES.decrypt(
                            messageToSend.content.text, 
                            conversation.encryptionKey
                        ).toString(CryptoJS.enc.Utf8);
                        messageToSend.content.encrypted = false; // Mark as decrypted for display
                    } catch (decError) {
                        console.warn('Decryption failed for display:', decError);
                    }
                }

                // Add metadata
                const serverProcessingTime = Date.now() - processingStart;
                messageToSend.serverProcessingTime = serverProcessingTime;
                messageToSend.clientId = clientId;

                // INSTANT CONFIRMATION to sender (priority #1) - Real message saved
                const confirmationData = {
                    ...messageToSend,
                    messageId: savedMessage._id,
                    clientId: clientId,
                    processingTime: serverProcessingTime,
                    timestamp: savedMessage.createdAt,
                    saved: true, // Confirm it's actually saved in DB
                    realMessageId: savedMessage._id
                };
                
                // Send confirmation that message is actually saved
                socket.emit('message-sent', confirmationData);
                console.log(`REAL MESSAGE SAVED & CONFIRMED: ${savedMessage._id} (${serverProcessingTime}ms)`);

                // ULTRA-FAST DELIVERY to recipient (priority #2) - Instant multi-device delivery
                const recipientConnection = activeUsers.get(recipientId);
                if (recipientConnection) {
                    // Send to all recipient connections INSTANTLY
                    const deliveryTargets = recipientConnection.socketIds?.length > 0 
                        ? Array.from(recipientConnection.socketIds)
                        : [recipientConnection.primarySocketId];

                    let deliveredCount = 0;
                    
                    // ULTRA-FAST parallel delivery to all recipient devices
                    const deliveryPromises = deliveryTargets.map(socketId => {
                        if (socketId) {
                            io.to(socketId).emit('message-received', messageToSend);
                            deliveredCount++;
                            return true;
                        }
                        return false;
                    });
                    
                    console.log(`INSTANT delivery to ${deliveredCount} recipient devices for message ${savedMessage._id}`);

                    // Mark as delivered immediately if any connection received it
                    if (deliveredCount > 0) {
                        // Delivery confirmation with small delay to ensure message is updated
                        setTimeout(async () => {
                            try {
                                await savedMessage.markAsDelivered();
                                console.log('Emitting message-delivered event:', {
                                    messageId: savedMessage._id,
                                    clientId: clientId,
                                    deliveredAt: Date.now(),
                                    recipientConnectionCount: deliveredCount
                                });
                                socket.emit('message-delivered', { 
                                    messageId: savedMessage._id,
                                    clientId: clientId,
                                    deliveredAt: Date.now(),
                                    recipientConnectionCount: deliveredCount
                                });
                            } catch (err) {
                                console.error('Non-critical delivery marking error:', err);
                            }
                        }, 200); // Small delay to ensure message-sent event is processed first
                    }
                } else {
                    // Offline notification (non-blocking)
                    process.nextTick(() => {
                        sendPushNotification(recipient, socket.user, messageToSend)
                            .catch(err => console.error('Push notification error:', err));
                    });
                }

                // Update conversation activity (non-blocking)
                process.nextTick(() => {
                    conversation.updateLastActivity(savedMessage._id)
                        .catch(err => console.error('Conversation update error:', err));
                });

                // Performance logging
                const totalTime = Date.now() - processingStart;
                if (totalTime < 50) {
                    console.log(`ULTRA-FAST message: ${totalTime}ms (${clientId})`);
                } else if (totalTime < 100) {
                    console.log(`Fast message: ${totalTime}ms (${clientId})`);
                } else {
                    console.log(`Message processed: ${totalTime}ms (${clientId})`);
                }

            } catch (error) {
                console.error('Critical message error:', error);
                const errorResponse = { 
                    message: 'Failed to send message', 
                    clientId,
                    error: error.message,
                    code: 'SEND_FAILED',
                    timestamp: Date.now(),
                    processingTime: Date.now() - processingStart
                };
                
                // Send error via callback if available
                if (callback) {
                    callback({ 
                        success: false, 
                        error: errorResponse 
                    });
                }
                
                socket.emit('message-error', errorResponse);
            }
        });

        // Handle ping test for connection speed measurement
        socket.on('ping-test', (data, callback) => {
            const { timestamp } = data;
            const serverTime = Date.now();
            
            // Immediate response for fastest ping measurement
            if (callback) {
                callback({
                    clientTimestamp: timestamp,
                    serverTimestamp: serverTime,
                    serverProcessingTime: 0 // Minimal processing
                });
            }
        });

        // Handle message read receipts
        socket.on('mark-as-read', async (data) => {
            try {
                const { messageId, conversationId } = data;
                
                if (messageId) {
                    // Mark single message as read
                    const message = await Message.findById(messageId);
                    if (message && message.recipient.toString() === socket.userId) {
                        await message.markAsRead();
                        
                        // Notify sender
                        const senderConnection = activeUsers.get(message.sender.toString());
                        if (senderConnection) {
                            // Send to all socket connections for this sender
                            if (senderConnection.socketIds && senderConnection.socketIds.length > 0) {
                                senderConnection.socketIds.forEach(socketId => {
                                    io.to(socketId).emit('message-read', {
                                        messageId: message._id,
                                        readAt: message.readAt
                                    });
                                });
                            } else {
                                // Fallback to primary socket
                                io.to(senderConnection.primarySocketId).emit('message-read', {
                                    messageId: message._id,
                                    readAt: message.readAt
                                });
                            }
                        }
                    }
                } else if (conversationId) {
                    // Skip temporary conversation IDs (they start with "temp_")
                    if (conversationId.startsWith('temp_')) {
                        console.log('Skipping temporary conversation ID:', conversationId);
                        return;
                    }
                    
                    // Mark all messages in conversation as read
                    const conversation = await Conversation.findById(conversationId);
                    if (conversation && conversation.participants.includes(socket.userId)) {
                        const otherParticipant = conversation.participants.find(p => 
                            p.toString() !== socket.userId
                        );
                        
                        if (otherParticipant) {
                            await Message.markConversationAsRead(otherParticipant, socket.userId);
                            
                            // Notify sender
                            const senderConnection = activeUsers.get(otherParticipant.toString());
                            if (senderConnection) {
                                // Send to all socket connections for this sender
                                if (senderConnection.socketIds && senderConnection.socketIds.length > 0) {
                                    senderConnection.socketIds.forEach(socketId => {
                                        io.to(socketId).emit('conversation-read', {
                                            conversationId,
                                            readBy: socket.userId
                                        });
                                    });
                                } else {
                                    // Fallback to primary socket
                                    io.to(senderConnection.primarySocketId).emit('conversation-read', {
                                        conversationId,
                                        readBy: socket.userId
                                    });
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error marking message as read:', error);
            }
        });

        // Handle typing indicators
        socket.on('typing-start', async (data) => {
            try {
                const { recipientId, conversationId } = data;
                
                if (recipientId) {
                    const recipientConnection = activeUsers.get(recipientId);
                    if (recipientConnection) {
                        // Send to all socket connections for this recipient
                        if (recipientConnection.socketIds && recipientConnection.socketIds.length > 0) {
                            recipientConnection.socketIds.forEach(socketId => {
                                io.to(socketId).emit('user-typing', {
                                    userId: socket.userId,
                                    username: socket.user.username,
                                    conversationId
                                });
                            });
                        } else {
                            // Fallback to primary socket
                            io.to(recipientConnection.primarySocketId).emit('user-typing', {
                                userId: socket.userId,
                                username: socket.user.username,
                                conversationId
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Error handling typing start:', error);
            }
        });

        socket.on('typing-stop', async (data) => {
            try {
                const { recipientId, conversationId } = data;
                
                if (recipientId) {
                    const recipientConnection = activeUsers.get(recipientId);
                    if (recipientConnection) {
                        // Send to all socket connections for this recipient
                        if (recipientConnection.socketIds && recipientConnection.socketIds.length > 0) {
                            recipientConnection.socketIds.forEach(socketId => {
                                io.to(socketId).emit('user-stopped-typing', {
                                    userId: socket.userId,
                                    conversationId
                                });
                            });
                        } else {
                            // Fallback to primary socket
                            io.to(recipientConnection.primarySocketId).emit('user-stopped-typing', {
                                userId: socket.userId,
                                conversationId
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Error handling typing stop:', error);
            }
        });

        // Handle message reactions
        socket.on('add-reaction', async (data) => {
            try {
                const { messageId, emoji } = data;
                
                const message = await Message.findById(messageId);
                if (message) {
                    await message.addReaction(socket.userId, emoji);
                    
                    // Notify participants
                    const participants = [message.sender.toString(), message.recipient.toString()];
                    participants.forEach(participantId => {
                        const connection = activeUsers.get(participantId);
                        if (connection) {
                            io.to(connection.socketId).emit('reaction-added', {
                                messageId,
                                userId: socket.userId,
                                emoji,
                                reactions: message.reactions
                            });
                        }
                    });
                }
            } catch (error) {
                console.error('Error adding reaction:', error);
            }
        });

        // Handle message editing
        socket.on('edit-message', async (data) => {
            try {
                const { messageId, newContent } = data;
                
                const message = await Message.findById(messageId);
                if (message && message.sender.toString() === socket.userId) {
                    await message.editMessage(newContent);
                    
                    // Notify recipient
                    const recipientConnection = activeUsers.get(message.recipient.toString());
                    if (recipientConnection) {
                        io.to(recipientConnection.socketId).emit('message-edited', {
                            messageId,
                            newContent,
                            editedAt: message.edited.editedAt
                        });
                    }
                }
            } catch (error) {
                console.error('Error editing message:', error);
            }
        });

        // Handle message deletion
        socket.on('delete-message', async (data) => {
            try {
                const { messageId, deleteForEveryone } = data;
                
                const message = await Message.findById(messageId);
                if (message && message.sender.toString() === socket.userId) {
                    if (deleteForEveryone) {
                        await message.deleteForEveryone(socket.userId);
                    } else {
                        await message.deleteForUser(socket.userId);
                    }
                    
                    // Get user info for notification
                    const currentUser = await User.findById(socket.userId).select('fullName username');
                    const deletedByName = currentUser.fullName || currentUser.username || 'Usuario';
                    
                    // Notify recipient
                    const recipientConnection = activeUsers.get(message.recipient.toString());
                    if (recipientConnection) {
                        io.to(recipientConnection.socketId).emit('message-deleted', {
                            messageId,
                            deletedBy: socket.userId,
                            deletedByName,
                            deletedForEveryone: deleteForEveryone || false
                        });
                    }
                }
            } catch (error) {
                console.error('Error deleting message:', error);
            }
        });

        // Handle user status changes
        socket.on('change-status', async (data) => {
            try {
                const { status, statusMessage } = data;
                
                await User.findByIdAndUpdate(socket.userId, {
                    status,
                    statusMessage: statusMessage || '',
                    lastSeen: new Date()
                });

                // Update active users
                const userConnection = activeUsers.get(socket.userId);
                if (userConnection) {
                    userConnection.user.status = status;
                    userConnection.user.statusMessage = statusMessage || '';
                }

                // Broadcast status change to contacts
                broadcastUserStatus(socket.userId, status, statusMessage);
                
            } catch (error) {
                console.error('Error changing status:', error);
            }
        });

        // Handle sending contact request
        socket.on('sendContactRequest', async (data) => {
            try {
                const { to, message } = data;
                const senderUser = await User.findById(socket.userId).select('username fullName avatar status');
                
                // Emit to the target user if they're online
                socket.to(to).emit('contactRequest', {
                    from: senderUser,
                    message,
                    sentAt: new Date()
                });
                
            } catch (error) {
                console.error('Error sending contact request notification:', error);
            }
        });

        // Handle contact request response (accept/reject)
        socket.on('contactRequestResponse', async (data) => {
            try {
                const { requestId, action } = data;
                
                // Find the request to get requester info
                const currentUser = await User.findById(socket.userId).select('username fullName avatar');
                const request = currentUser.contactRequests.id(requestId);
                
                if (request) {
                    const requesterId = request.from;
                    
                    // Emit response to the original requester
                    socket.to(requesterId.toString()).emit('contactRequestResponse', {
                        action,
                        user: currentUser
                    });
                }
                
            } catch (error) {
                console.error('Error sending contact request response:', error);
            }
        });

        // Handle manual session close (from logout button)
        socket.on('close-session', async (data = {}) => {
            const { sessionId: requestedSessionId } = data;
            const sessionIdToClose = requestedSessionId || socket.sessionId;
            
            // Close specific session
            await closeUserSession(socket.userId, sessionIdToClose, io, true); // true = isManualLogout
            
            // Disconnect this socket
            socket.disconnect(true);
        });

        
        // Handle user activity (DOM events like mouse, keyboard, etc.)
        socket.on('user-activity', async (data = {}) => {
            const { sessionId: activitySessionId, timestamp } = data;
            const sessionIdToUpdate = activitySessionId || socket.sessionId;
            
            // Update session activity
            const session = sessionData.get(sessionIdToUpdate);
            if (session) {
                session.lastActivity = new Date();
                session.warningShown = false; // Reset warning if it was shown
            }
            
            // Update socket activity
            socket.lastActivity = new Date();
        });

        // Handle keep session active (from inactivity warning)
        socket.on('keep-session-active', async (data = {}) => {
            const { sessionId: requestedSessionId } = data;
            const sessionIdToKeep = requestedSessionId || socket.sessionId;
            
            // Update session activity
            const session = sessionData.get(sessionIdToKeep);
            if (session) {
                session.lastActivity = new Date();
                session.warningShown = false;
            }
            
            // Update socket activity
            socket.lastActivity = new Date();
        });

        // NUEVO: Heartbeat robusto para presencia persistente
        socket.on('presence-heartbeat', async () => {
            try {
                // Update all activity timestamps
                socket.lastActivity = new Date();
                
                // Update session data in memory
                const session = sessionData.get(socket.sessionId);
                if (session) {
                    session.lastActivity = new Date();
                }
                
                // Update active user data
                const activeUser = activeUsers.get(socket.userId);
                if (activeUser) {
                    activeUser.lastActivity = new Date();
                }
                
                // Update database session
                if (socket.dbSessionId) {
                    await Session.findByIdAndUpdate(socket.dbSessionId, {
                        lastActivity: new Date()
                    });
                }
                
                // Ensure user is marked as online
                await User.findByIdAndUpdate(socket.userId, {
                    status: 'online',
                    lastSeen: new Date()
                });
                
                // Send heartbeat response
                socket.emit('presence-heartbeat-ack', {
                    timestamp: new Date(),
                    status: 'online'
                });
                
            } catch (error) {
                console.error('Error handling presence heartbeat:', error);
            }
        });
        
        // Verificar disponibilidad de usuario para llamadas
        socket.on('check-call-availability', async (data) => {
            try {
                const { userId } = data;
                console.log(`🔍 Checking call availability for user: ${userId}`);
                
                let isAvailable = false;
                let status = 'offline';
                let responseInfo = {};
                
                // 1. Verificar en activeUsers
                const activeConnection = activeUsers.get(userId);
                if (activeConnection) {
                    isAvailable = true;
                    status = 'online';
                    responseInfo.source = 'activeUsers';
                    responseInfo.connectionCount = activeConnection.connectionCount;
                    console.log(`✅ User ${userId} found in activeUsers with ${activeConnection.connectionCount} connections`);
                }
                
                // 2. Si no está en activeUsers, buscar en sockets conectados
                if (!isAvailable) {
                    for (const [socketId, connectedSocket] of io.sockets.sockets) {
                        if (connectedSocket.userId === userId) {
                            isAvailable = true;
                            status = 'online';
                            responseInfo.source = 'activeSockets';
                            responseInfo.socketId = socketId;
                            console.log(`✅ User ${userId} found in active sockets: ${socketId}`);
                            break;
                        }
                    }
                }
                
                // 3. Si aún no lo encuentra, verificar sesiones recientes en BD
                if (!isAvailable) {
                    const activeSessions = await Session.findActiveSessions(userId);
                    const recentSessions = activeSessions.filter(session => {
                        const timeDiff = Date.now() - session.lastActivity.getTime();
                        return timeDiff < 30000; // Menos de 30 segundos
                    });
                    
                    if (recentSessions.length > 0) {
                        status = 'recently-active';
                        responseInfo.source = 'recentSessions';
                        responseInfo.sessionCount = recentSessions.length;
                        responseInfo.lastActivity = recentSessions[0].lastActivity;
                        console.log(`⏰ User ${userId} has ${recentSessions.length} recent sessions`);
                    }
                }
                
                // Responder con el estado
                socket.emit('call-availability-response', {
                    userId,
                    isAvailable,
                    status,
                    timestamp: Date.now(),
                    ...responseInfo
                });
                
            } catch (error) {
                console.error('Error checking call availability:', error);
                socket.emit('call-availability-response', {
                    userId: data.userId,
                    isAvailable: false,
                    status: 'error',
                    error: error.message
                });
            }
        });

        // ============= SISTEMA DE LLAMADAS WEBRTC =============
        
        // Iniciar llamada
        socket.on('call:initiate', async (data) => {
            try {
                const { callId, to, type, offer, from } = data;
                
                console.log(`CALL: Call initiated: ${callId} from ${from?.userId || socket.userId} to ${to}`);
                
                // Obtener información completa del usuario emisor si no está disponible
                let callerInfo = from;
                if (!callerInfo || !callerInfo.name || callerInfo.name === 'Usuario') {
                    try {
                        const User = require('../models/User');
                        const caller = await User.findById(socket.userId);
                        if (caller) {
                            callerInfo = {
                                userId: socket.userId,
                                name: caller.fullName || caller.username,
                                profilePhoto: caller.avatar,
                                username: caller.username
                            };
                            console.log(`SUCCESS: Loaded caller info from DB:`, callerInfo);
                        }
                    } catch (error) {
                        console.error('ERROR: Failed to load caller info:', error);
                        callerInfo = {
                            userId: socket.userId,
                            name: socket.user?.fullName || socket.user?.username || 'Usuario',
                            profilePhoto: socket.user?.avatar
                        };
                    }
                }
                
                // Verificar que el destinatario está en línea
                const recipientConnection = activeUsers.get(to);
                
                if (!recipientConnection) {
                    console.log(`WARN: User ${to} not in activeUsers, searching all connected sockets...`);
                    
                    // Buscar socket por userId en todas las conexiones activas
                    let foundSocket = false;
                    let foundSocketInfo = null;
                    
                    for (const [socketId, connectedSocket] of io.sockets.sockets) {
                        if (connectedSocket.userId === to) {
                            console.log(`SUCCESS: Found active socket for user ${to}: ${socketId}`);
                            foundSocket = true;
                            foundSocketInfo = connectedSocket;
                            
                            // Enviar llamada inmediatamente
                            connectedSocket.emit('call:incoming', {
                                callId,
                                type,
                                offer,
                                from: callerInfo
                            });
                            console.log(`CALL: Incoming call sent to active socket ${socketId}`);
                            break;
                        }
                    }
                    
                    if (!foundSocket) {
                        // Verificar en la base de datos si hay sesiones activas recientes
                        console.log(`🔍 No active socket found, checking database sessions for user ${to}...`);
                        
                        try {
                            const activeSessions = await Session.findActiveSessions(to);
                            const recentSessions = activeSessions.filter(session => {
                                const timeDiff = Date.now() - session.lastActivity.getTime();
                                return timeDiff < 60000; // Menos de 1 minuto
                            });
                            
                            if (recentSessions.length > 0) {
                                console.log(`⏰ User ${to} has ${recentSessions.length} recent sessions, waiting for reconnection...`);
                                
                                // Dar 5 segundos para que se reconecte
                                let attemptCount = 0;
                                const maxAttempts = 5;
                                
                                const retryInterval = setInterval(() => {
                                    attemptCount++;
                                    
                                    // Buscar nuevamente
                                    for (const [socketId, connectedSocket] of io.sockets.sockets) {
                                        if (connectedSocket.userId === to) {
                                            console.log(`🔄 User ${to} reconnected on attempt ${attemptCount}, sending call`);
                                            
                                            connectedSocket.emit('call:incoming', {
                                                callId,
                                                type,
                                                offer,
                                                from: from || {
                                                    userId: socket.userId,
                                                    name: socket.user?.fullName || socket.user?.username,
                                                    profilePhoto: socket.user?.avatar
                                                }
                                            });
                                            
                                            clearInterval(retryInterval);
                                            return;
                                        }
                                    }
                                    
                                    if (attemptCount >= maxAttempts) {
                                        clearInterval(retryInterval);
                                        console.log(`❌ Max attempts reached, user ${to} not available`);
                                        socket.emit('call:failed', {
                                            callId,
                                            reason: 'user-offline',
                                            message: 'El usuario no está disponible'
                                        });
                                    }
                                }, 1000); // Intentar cada segundo
                                
                                return; // No enviar falla inmediatamente
                            }
                        } catch (error) {
                            console.error('Error checking database sessions:', error);
                        }
                        
                        // Usuario realmente offline
                        socket.emit('call:failed', {
                            callId,
                            reason: 'user-offline',
                            message: 'El usuario no está disponible'
                        });
                        console.log(`❌ Call failed - recipient ${to} is definitely offline`);
                        return;
                    }
                } else {
                    // Usuario en línea, proceder normalmente
                    const targetSocketIds = recipientConnection.socketIds || [recipientConnection.primarySocketId];
                    
                    console.log(`📞 Sending call to recipient ${to}:`, {
                        recipientConnection: {
                            socketIds: recipientConnection.socketIds,
                            primarySocketId: recipientConnection.primarySocketId,
                            connectionCount: recipientConnection.connectionCount
                        },
                        targetSocketIds,
                        callId,
                        type
                    });
                    
                    let sentCount = 0;
                    targetSocketIds.forEach(socketId => {
                        if (socketId && socketId !== socket.id) {
                            const callData = {
                                callId,
                                type,
                                offer,
                                from: callerInfo
                            };
                            
                            console.log(`📞 Emitting call:incoming to socket ${socketId}:`, {
                                callId,
                                fromUserId: callData.from.userId,
                                fromName: callData.from.name,
                                type
                            });
                            
                            io.to(socketId).emit('call:incoming', callData);
                            sentCount++;
                            console.log(`✅ Call:incoming emitted to socket ${socketId}`);
                        } else {
                            console.log(`⚠️ Skipping socket ${socketId} (same as sender: ${socket.id})`);
                        }
                    });
                    
                    console.log(`📊 Call sent to ${sentCount} recipient sockets`);
                }
                
                // Confirmar al iniciador que la llamada fue enviada
                socket.emit('call:initiated', {
                    callId,
                    recipientId: to,
                    timestamp: Date.now()
                });
                
            } catch (error) {
                console.error('Error handling call initiation:', error);
                socket.emit('call:failed', {
                    callId: data.callId,
                    reason: 'server-error',
                    message: 'Error del servidor al iniciar la llamada'
                });
            }
        });
        
        // Aceptar llamada
        socket.on('call:accept', async (data) => {
            try {
                const { callId, to, answer } = data;
                
                console.log(`SUCCESS: Call accepted: ${callId} by ${socket.userId}`);
                
                // Notificar al iniciador de la llamada
                const initiatorConnection = activeUsers.get(to);
                
                if (initiatorConnection) {
                    const targetSocketIds = initiatorConnection.socketIds || [initiatorConnection.primarySocketId];
                    
                    targetSocketIds.forEach(socketId => {
                        if (socketId) {
                            io.to(socketId).emit('call:accepted', {
                                callId,
                                answer,
                                acceptedBy: socket.userId
                            });
                        }
                    });
                    
                    console.log(`SUCCESS: Call acceptance sent to initiator ${to}`);
                }
                
            } catch (error) {
                console.error('Error handling call acceptance:', error);
            }
        });
        
        // Rechazar llamada
        socket.on('call:decline', async (data) => {
            try {
                const { callId, to, reason = 'declined' } = data;
                
                console.log(`❌ Call declined: ${callId} by ${socket.userId}, reason: ${reason}`);
                
                // Notificar al iniciador
                const initiatorConnection = activeUsers.get(to);
                
                if (initiatorConnection) {
                    const targetSocketIds = initiatorConnection.socketIds || [initiatorConnection.primarySocketId];
                    
                    targetSocketIds.forEach(socketId => {
                        if (socketId) {
                            io.to(socketId).emit('call:declined', {
                                callId,
                                reason,
                                declinedBy: socket.userId
                            });
                        }
                    });
                    
                    console.log(`❌ Call decline sent to initiator ${to}`);
                }
                
            } catch (error) {
                console.error('Error handling call decline:', error);
            }
        });
        
        // Usuario ocupado
        socket.on('call:busy', async (data) => {
            try {
                const { callId, to } = data;
                
                console.log(`📞 Call busy signal: ${callId} from ${socket.userId}`);
                
                // Notificar al iniciador que el usuario está ocupado
                const initiatorConnection = activeUsers.get(to);
                
                if (initiatorConnection) {
                    const targetSocketIds = initiatorConnection.socketIds || [initiatorConnection.primarySocketId];
                    
                    targetSocketIds.forEach(socketId => {
                        if (socketId) {
                            io.to(socketId).emit('call:busy', {
                                callId,
                                busyUser: socket.userId
                            });
                        }
                    });
                }
                
            } catch (error) {
                console.error('Error handling call busy:', error);
            }
        });
        
        // ICE candidates para conectividad WebRTC
        socket.on('call:ice-candidate', async (data) => {
            try {
                const { callId, to, candidate } = data;
                
                console.log('DEBUG: ICE candidate received:', { 
                    callId, 
                    to, 
                    hasCandidate: !!candidate,
                    candidateType: typeof candidate 
                });
                
                if (!candidate || !to) {
                    console.warn('Invalid ICE candidate data received:', { candidate, to });
                    return;
                }
                
                // Reenviar candidato ICE al destinatario
                const targetConnection = activeUsers.get(to);
                
                if (targetConnection) {
                    const targetSocketIds = targetConnection.socketIds || [targetConnection.primarySocketId];
                    
                    targetSocketIds.forEach(socketId => {
                        if (socketId && socketId !== socket.id) {
                            io.to(socketId).emit('call:ice-candidate', {
                                callId,
                                candidate,
                                from: socket.userId
                            });
                        }
                    });
                    
                    // Solo logear ocasionalmente para evitar spam
                    if (Math.random() < 0.1) {
                        console.log(`🧊 ICE candidate relayed for call ${callId}`);
                    }
                }
                
            } catch (error) {
                console.error('Error handling ICE candidate:', error);
            }
        });
        
        // Finalizar llamada
        socket.on('call:end', async (data) => {
            try {
                const { callId, to, reason = 'ended' } = data;
                
                console.log(`📞 Call ended: ${callId} by ${socket.userId}, reason: ${reason}`);
                
                // Notificar al otro participante
                const targetConnection = activeUsers.get(to);
                
                if (targetConnection) {
                    const targetSocketIds = targetConnection.socketIds || [targetConnection.primarySocketId];
                    
                    targetSocketIds.forEach(socketId => {
                        if (socketId) {
                            io.to(socketId).emit('call:ended', {
                                callId,
                                reason,
                                endedBy: socket.userId
                            });
                        }
                    });
                    
                    console.log(`📞 Call end notification sent to ${to}`);
                }
                
            } catch (error) {
                console.error('Error handling call end:', error);
            }
        });
        
        // Llamada perdida (timeout)
        socket.on('call:missed', async (data) => {
            try {
                const { callId, to } = data;
                
                console.log(`📞 Call missed: ${callId} - notifying ${to}`);
                
                // Notificar al iniciador que la llamada fue perdida
                const initiatorConnection = activeUsers.get(to);
                
                if (initiatorConnection) {
                    const targetSocketIds = initiatorConnection.socketIds || [initiatorConnection.primarySocketId];
                    
                    targetSocketIds.forEach(socketId => {
                        if (socketId) {
                            io.to(socketId).emit('call:missed', {
                                callId,
                                missedBy: socket.userId
                            });
                        }
                    });
                }
                
            } catch (error) {
                console.error('Error handling call missed:', error);
            }
        });
        
        // Control de audio durante la llamada
        socket.on('call:audio-toggle', async (data) => {
            try {
                const { callId, to, enabled } = data;
                
                const targetConnection = activeUsers.get(to);
                
                if (targetConnection) {
                    const targetSocketIds = targetConnection.socketIds || [targetConnection.primarySocketId];
                    
                    targetSocketIds.forEach(socketId => {
                        if (socketId) {
                            io.to(socketId).emit('call:remote-audio-toggle', {
                                callId,
                                enabled,
                                userId: socket.userId
                            });
                        }
                    });
                }
                
            } catch (error) {
                console.error('Error handling audio toggle:', error);
            }
        });
        
        // Control de video durante la llamada
        socket.on('call:video-toggle', async (data) => {
            try {
                const { callId, to, enabled } = data;
                
                const targetConnection = activeUsers.get(to);
                
                if (targetConnection) {
                    const targetSocketIds = targetConnection.socketIds || [targetConnection.primarySocketId];
                    
                    targetSocketIds.forEach(socketId => {
                        if (socketId) {
                            io.to(socketId).emit('call:remote-video-toggle', {
                                callId,
                                enabled,
                                userId: socket.userId
                            });
                        }
                    });
                }
                
            } catch (error) {
                console.error('Error handling video toggle:', error);
            }
        });
        
        // ============= UBICACIÓN EN TIEMPO REAL =============
        
        // Iniciar compartir ubicación en tiempo real
        socket.on('start-sharing-location', async (data) => {
            try {
                const { targetUserId, duration, roomId } = data;
                console.log(`📍 User ${socket.userId} starting to share location with ${targetUserId}`);
                
                // Validar datos
                if (!targetUserId || !duration || !roomId) {
                    socket.emit('error', { message: 'Datos de ubicación incompletos' });
                    return;
                }
                
                // Unir a la sala de ubicación
                await socket.join(roomId);
                
                // Notificar al destinatario
                const targetUserSocket = Array.from(io.sockets.sockets.values())
                    .find(s => s.userId === targetUserId);
                
                if (targetUserSocket) {
                    targetUserSocket.emit('location-share-started', {
                        from: socket.userId,
                        fromName: socket.user?.fullName || 'Usuario',
                        roomId,
                        duration
                    });
                }
                
                // Confirmar al emisor
                socket.emit('sharing-started', { roomId, duration });
                
                console.log(`✅ Location sharing started: ${roomId}`);
                
            } catch (error) {
                console.error('Error starting location sharing:', error);
                socket.emit('error', { message: 'Error al iniciar compartir ubicación' });
            }
        });
        
        // Actualizar ubicación en tiempo real
        socket.on('update-location', async (data) => {
            try {
                const { roomId, latitude, longitude, accuracy, address, timestamp } = data;
                
                if (!roomId || !latitude || !longitude) {
                    return;
                }
                
                const locationUpdate = {
                    userId: socket.userId,
                    userName: socket.user?.fullName || 'Usuario',
                    latitude,
                    longitude,
                    accuracy,
                    address,
                    timestamp: timestamp || Date.now()
                };
                
                // Enviar actualización a todos en la sala excepto al emisor
                socket.to(roomId).emit('location-update', locationUpdate);
                
                console.log(`📍 Location updated for room ${roomId}: ${address}`);
                
            } catch (error) {
                console.error('Error updating location:', error);
            }
        });
        
        // Detener compartir ubicación
        socket.on('stop-sharing-location', async (roomId) => {
            try {
                if (!roomId) return;
                
                console.log(`🛑 User ${socket.userId} stopped sharing location in ${roomId}`);
                
                // Salir de la sala
                await socket.leave(roomId);
                
                // Notificar a otros en la sala
                socket.to(roomId).emit('location-sharing-stopped', {
                    userId: socket.userId,
                    userName: socket.user?.fullName || 'Usuario'
                });
                
            } catch (error) {
                console.error('Error stopping location sharing:', error);
            }
        });

        // Manejar desconexión durante llamadas
        socket.on('call:connection-lost', async (data) => {
            try {
                const { callId, to } = data;
                
                console.log(`📞 Call connection lost: ${callId} for user ${socket.userId}`);
                
                // Notificar al otro participante sobre la pérdida de conexión
                const targetConnection = activeUsers.get(to);
                
                if (targetConnection) {
                    const targetSocketIds = targetConnection.socketIds || [targetConnection.primarySocketId];
                    
                    targetSocketIds.forEach(socketId => {
                        if (socketId) {
                            io.to(socketId).emit('call:connection-lost', {
                                callId,
                                lostUser: socket.userId
                            });
                        }
                    });
                }
                
            } catch (error) {
                console.error('Error handling call connection lost:', error);
            }
        });
        
        // Handle disconnection (page refresh, network issues, etc.)
        socket.on('disconnect', async (reason) => {
            const sessionId = socket.sessionId;
            if (!sessionId) return;
            
            console.log(`🔌 User ${socket.user?.fullName} (${socket.userId}) disconnecting... Reason: ${reason}`);
            
            try {
                // Update session in MongoDB
                if (socket.dbSessionId) {
                    await Session.findByIdAndUpdate(socket.dbSessionId, {
                        lastActivity: new Date()
                    });
                    console.log(`💾 Sesión actualizada en BD para ${socket.user?.fullName}`);
                }
                
                // Remove this specific socket from user connections
                const userConnectionsSet = userSessions.get(socket.userId);
                if (userConnectionsSet) {
                    userConnectionsSet.delete(socket.id);
                    
                    // Update active users info
                    const activeUser = activeUsers.get(socket.userId);
                    if (activeUser) {
                        activeUser.socketIds = Array.from(userConnectionsSet);
                        activeUser.connectionCount = userConnectionsSet.size;
                        activeUser.lastActivity = new Date();
                        
                        // If still have connections, update primary socket
                        if (userConnectionsSet.size > 0) {
                            const remainingSockets = Array.from(userConnectionsSet);
                            activeUser.primarySocketId = remainingSockets[remainingSockets.length - 1];
                            console.log(`🔄 Usuario ${socket.user?.fullName} sigue conectado en ${userConnectionsSet.size} sesiones`);
                        } else {
                            console.log(`⏰ Usuario ${socket.user?.fullName} sin conexiones activas, iniciando buffer de 2 minutos...`);
                            // Buffer robusto: mantener "en línea" por 2 minutos
                            setTimeout(async () => {
                                await cleanupInactiveSession(socket.userId, sessionId, io);
                            }, INACTIVITY_TIMEOUT); // 2 minutos buffer robusto
                        }
                    }
                }
                
                // Update last activity in User model
                await User.findByIdAndUpdate(socket.userId, {
                    lastSeen: new Date()
                });
                
            } catch (error) {
                console.error('Error during disconnect:', error);
            }
        });
    });

    // Broadcast user status to their contacts with improved data
    const broadcastUserStatus = async (userId, status, statusMessage = '') => {
        try {
            const user = await User.findById(userId).populate('contacts.user');
            if (user) {
                const broadcastData = {
                    userId,
                    status,
                    statusMessage,
                    lastSeen: new Date(),
                    timestamp: Date.now(), // Add timestamp for immediate processing
                    isInstant: status === 'offline' // Flag for immediate offline updates
                };

                console.log(`Broadcasting status ${status} for user ${userId} to ${user.contacts.length} contacts`);

                user.contacts.forEach(contact => {
                    if (!contact.user) return; // Skip if contact user doesn't exist
                    const contactId = contact.user._id.toString();
                    const contactConnection = activeUsers.get(contactId);
                    
                    if (contactConnection) {
                        // Send to all socket connections for this contact
                        if (contactConnection.socketIds && contactConnection.socketIds.length > 0) {
                            contactConnection.socketIds.forEach(socketId => {
                                io.to(socketId).emit('contact-status-changed', broadcastData);
                                console.log(`  Sent to contact ${contactId} via socket ${socketId}`);
                            });
                        } else {
                            // Fallback to primary socket
                            io.to(contactConnection.primarySocketId).emit('contact-status-changed', broadcastData);
                            console.log(`  Sent to contact ${contactId} via primary socket`);
                        }
                    } else {
                        console.log(`  Contact ${contactId} not connected`);
                    }
                });
                
                console.log(`Status broadcast complete for user ${userId}`);
            }
        } catch (error) {
            console.error('Error broadcasting user status:', error);
        }
    };

    // Send push notification (placeholder - integrate with your push service)
    const sendPushNotification = async (recipient, sender, message) => {
        // Integrate with Firebase Cloud Messaging, Apple Push Notifications, etc.
        console.log(`Sending push notification to ${recipient.username} from ${sender.username}`);
    };

    // Close a specific user session
    const closeUserSession = async (userId, sessionId, io, isManualLogout = false) => {
        try {
            // Remove from session data
            const session = sessionData.get(sessionId);
            if (session) {
                sessionData.delete(sessionId);
            }

            // Remove from user sessions (now tracking socket IDs instead of session IDs)
            const userConnectionsSet = userSessions.get(userId);
            if (userConnectionsSet) {
                // Find the socket ID that matches this session
                const socketIdToRemove = Array.from(userConnectionsSet).find(socketId => {
                    const connectedSocket = Array.from(io.sockets.sockets.values()).find(s => s.id === socketId);
                    return connectedSocket && connectedSocket.sessionId === sessionId;
                });
                
                if (socketIdToRemove) {
                    userConnectionsSet.delete(socketIdToRemove);
                }
                
                // If no more connections, handle based on logout type
                if (userConnectionsSet.size === 0) {
                    userSessions.delete(userId);
                    activeUsers.delete(userId);
                    
                    if (isManualLogout) {
                        // Manual logout: immediate offline
                        await setImmediateOffline(userId, io);
                    } else {
                        // Network disconnect: 2-minute buffer before marking offline
                        scheduleOfflineUpdate(userId, io);
                    }
                } else {
                    // Update connection info in active users
                    const activeUser = activeUsers.get(userId);
                    if (activeUser) {
                        activeUser.connectionCount = userConnectionsSet.size;
                        activeUser.socketIds = Array.from(userConnectionsSet);
                        // Update primary socket to most recent one
                        const remainingSockets = Array.from(userConnectionsSet);
                        activeUser.primarySocketId = remainingSockets[remainingSockets.length - 1];
                    }
                }
            }
        } catch (error) {
            console.error('Error closing user session:', error);
        }
    };

    // Clean up inactive session after timeout
    const cleanupInactiveSession = async (userId, sessionId, io) => {
        try {
            console.log(`🧹 Cleaning up session for user ${userId}`);
            
            // Verificar si el usuario sigue sin conexiones activas
            const userConnectionsSet = userSessions.get(userId);
            if (userConnectionsSet && userConnectionsSet.size > 0) {
                console.log(`⚠️ Usuario ${userId} se reconectó, cancelando cleanup`);
                return; // Usuario se reconectó
            }
            
            // Verificar sesiones activas en BD
            const activeSessions = await Session.findActiveSessions(userId);
            if (activeSessions.length === 0) {
                console.log(`📴 Usuario ${userId} no tiene sesiones activas en BD`);
                
                // Use buffer system instead of immediate offline
                scheduleOfflineUpdate(userId, io);
                
                // Limpiar de memoria
                activeUsers.delete(userId);
                userSessions.delete(userId);
                
                console.log(`⏱️ Buffer de 5 minutos iniciado para usuario ${userId}`);
            } else {
                console.log(`✅ Usuario ${userId} tiene ${activeSessions.length} sesiones activas en BD`);
            }
            
        } catch (error) {
            console.error('Error cleaning up inactive session:', error);
        }
    };

    // Inactivity monitoring system
    const startInactivityMonitoring = (io) => {
        // Check for inactive sessions every few seconds
        setInterval(() => {
            const now = new Date();
            
            // Tiempos de producción
            const inactivityTimeout = 15 * 60 * 1000; // 15 minutos
            const warningTimeout = 60 * 1000; // 60 segundos warning

            for (const [sessionId, session] of sessionData.entries()) {
                if (!session.isActive) {
                    continue;
                }

                const timeSinceActivity = now - session.lastActivity;
                const timeUntilTimeout = inactivityTimeout - timeSinceActivity;

                // Send warning at 1 minute before timeout
                if (timeUntilTimeout <= warningTimeout && timeUntilTimeout > 0 && !session.warningShown) {
                    session.warningShown = true;
                    
                    // Find socket and send warning
                    const socket = Array.from(io.sockets.sockets.values())
                        .find(s => s.sessionId === sessionId);
                    
                    if (socket) {
                        socket.emit('inactivity-warning', {
                            sessionId: sessionId,
                            timeoutSeconds: Math.ceil(timeUntilTimeout / 1000)
                        });
                    }
                }
                
                // Close session after timeout
                if (timeSinceActivity >= inactivityTimeout) {
                    // Find socket and disconnect
                    const socket = Array.from(io.sockets.sockets.values())
                        .find(s => s.sessionId === sessionId);
                    
                    if (socket) {
                        socket.emit('session-timeout', {
                            sessionId: sessionId,
                            reason: 'inactivity'
                        });
                        
                        setTimeout(() => {
                            socket.disconnect(true);
                        }, 1000);
                    }
                    
                    closeUserSession(session.userId, sessionId, io);
                }
            }
        }, 60000); // Check every minute
    };

    // Start inactivity monitoring
    startInactivityMonitoring(io);

    // Add activity tracking to all socket events
    const originalEmit = io.emit;
    io.sockets.on('connection', (socket) => {
        // Track activity on any socket event from client
        const trackActivity = () => {
            if (socket.sessionId) {
                const session = sessionData.get(socket.sessionId);
                if (session) {
                    session.lastActivity = new Date();
                    session.warningShown = false; // Reset warning flag
                }
                socket.lastActivity = new Date();
            }
        };

        // Override socket event handling to track activity
        const originalOn = socket.on;
        socket.on = function(event, handler) {
            return originalOn.call(this, event, (...args) => {
                trackActivity();
                return handler.apply(this, args);
            });
        };
    });
};

module.exports = { initializeSocketHandlers, activeUsers, getUserPresence };