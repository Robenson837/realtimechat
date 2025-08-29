// WebSocket manager for real-time communication

class SocketManager {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.reconnectDelay = 2000;
        this.maxReconnectDelay = 60000;
        this.isConnected = false;
        this.messageQueue = [];
        this.typingTimeouts = new Map();
        this.connectionHealthCheck = null;
        this.lastPingTime = Date.now();
        this.connectionQuality = 'excellent';
        this.heartbeatInterval = null;
        this.reconnectTimeoutId = null;
        this.lastConnectionTime = 0;
        this.lastErrorTime = 0;
        this.preventReconnectUntil = 0;
        
        // Circuit breaker for parse errors
        this.parseErrorCount = 0;
        this.maxParseErrors = 5;
        this.parseErrorResetTime = 30000; // 30 seconds
        this.lastParseErrorTime = 0;
        this.circuitBreakerOpen = false;
        
        // Session management
        this.sessionId = null;
        this.sessionCount = 0;
        this.isFirstSession = false;
        this.inactivityWarningModal = null;
        this.inactivityTimer = null;
        this.lastActivity = new Date();
        
        // ENHANCED PRESENCE SYSTEM - Robusto y persistente
        this.presenceHeartbeatInterval = null;
        this.presenceHeartbeatFrequency = 30000; // Cada 30 segundos para robustez
        this.userPresenceStatus = 'offline';
        this.lastSeenTimestamp = null;
        this.presenceCache = new Map(); // userId -> { status, lastSeen, lastUpdate }
        this.typingUsers = new Map(); // conversationId -> Set of userIds
        this.typingTimeouts = new Map(); // userId -> timeoutId
        this.activeUsers = new Map(); // userId -> activeUser info (for chat status tracking)
        
        // Sistema de heartbeat robusto
        this.lastHeartbeatTime = null;
        this.heartbeatFailureCount = 0;
        this.maxHeartbeatFailures = 3;
        
        this.setupEventHandlers();
        this.startConnectionHealthCheck();
        this.setupActivityTracking();
        this.setupPresenceSystem();
        this.setupCallSignaling();
    }
    
    // Setup WebRTC call signaling listeners
    setupCallSignaling() {
        console.log('CALL: Setting up call signaling listeners...');
        
        // We'll add listeners after socket connection is established
        // in the connect() method's success handler
    }
    
    // Setup call signaling listeners after socket connection
    setupCallSignalingListeners() {
        if (!this.socket) return;
        
        console.log('CALL: Adding call signaling event listeners...');
        
        // Incoming call request
        this.socket.on('call_request', (data) => {
            console.log('CALL: Incoming call request received:', data);
            console.log('SIGNAL: Call request details:', {
                from: data.from,
                to: data.to,
                type: data.type,
                hasOffer: !!data.offer
            });
            
            if (window.callManager) {
                window.callManager.handleIncomingCall(data);
            } else {
                console.error('ERROR: CallManager not available to handle incoming call');
            }
        });
        
        // Call answer received
        this.socket.on('call_answer', (data) => {
            console.log('CALL: Call answer received:', data);
            if (window.callManager) {
                window.callManager.handleCallAnswer(data);
            }
        });
        
        // Call offer received
        this.socket.on('call_offer', (data) => {
            console.log('CALL: Call offer received:', data);
            if (window.callManager) {
                window.callManager.handleCallOffer(data);
            }
        });
        
        // ICE candidate received
        this.socket.on('ice_candidate', (data) => {
            console.log('SIGNAL: ICE candidate received:', data);
            if (window.callManager) {
                window.callManager.handleIceCandidate(data);
            }
        });
        
        // Call ended by remote peer
        this.socket.on('call_ended', (data) => {
            console.log('CALL: Call ended by remote peer:', data);
            if (window.callManager) {
                window.callManager.handleCallEnded(data);
            }
        });
        
        // Audio toggle notification
        this.socket.on('audio_toggle', (data) => {
            console.log('MUTE: Audio toggle received:', data);
            // Handle remote audio toggle if needed
        });
        
        // Video toggle notification
        this.socket.on('video_toggle', (data) => {
            console.log('📹 Video toggle received:', data);
            // Handle remote video toggle if needed
        });
        
        // Call accepted notification
        this.socket.on('call_accepted', (data) => {
            console.log('SUCCESS: Call accepted:', data);
            if (window.callManager) {
                // Stop outgoing sound and start connected sound
                window.callManager.stopCallSound('outgoing');
                window.callManager.playCallSound('connected');
                window.callManager.updateCallInterface('connected');
            }
        });
        
        // Call declined notification
        this.socket.on('call_declined', (data) => {
            console.log('ERROR: Call declined:', data);
            if (window.callManager) {
                window.callManager.stopCallSound('outgoing');
                window.callManager.playCallSound('ended');
                window.callManager.updateCallStatus('Llamada rechazada');
                
                // End call after showing message
                setTimeout(() => {
                    window.callManager.endCall();
                }, 2000);
            }
        });
        
        // Call message delivery (for real-time call history)
        this.socket.on('call_message', (data) => {
            console.log('📞 Call message received:', data);
            if (data.message && window.Chat && window.Chat.handleIncomingMessage) {
                // Deliver call message just like regular messages
                window.Chat.handleIncomingMessage(data.message);
            }
        });
        
        console.log('SUCCESS: Call signaling listeners configured');
    }

    connect() {
        // Check circuit breaker
        if (this.circuitBreakerOpen) {
            const now = Date.now();
            if (now - this.lastParseErrorTime < this.parseErrorResetTime) {
                console.log('Circuit breaker open - connection blocked due to repeated parse errors');
                this.showConnectionError('Problemas de conexión detectados. Intentando reconectar en 30 segundos...');
                return;
            } else {
                // Reset circuit breaker after timeout
                this.resetCircuitBreaker();
            }
        }

        // Prevent multiple simultaneous connections
        if (this.socket && this.isConnected) {
            console.log('Already connected, skipping connection attempt');
            return;
        }

        // Prevent rapid reconnection attempts (only for non-initial connections)
        const now = Date.now();
        if (now < this.preventReconnectUntil && this.reconnectAttempts > 0) {
            console.log('Connection prevented due to cooldown');
            return;
        }

        const token = Utils.Storage.get('authToken');
        if (!token) {
            console.error('No auth token found');
            return;
        }

        // Clean disconnect existing socket if it exists
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }

        console.log('Connecting to WebSocket server...');

        this.socket = io({
            auth: {
                token: token
            },
            // SIMPLE, STABLE CONNECTION SETTINGS
            reconnection: false,           // Disable automatic reconnection to prevent loops
            timeout: 10000,               // 10 seconds timeout
            transports: ['polling', 'websocket'], // Allow both transports
            upgrade: true,               // Allow transport upgrades
            rememberUpgrade: false,      // Don't remember upgrades
            autoConnect: true,           // Connect immediately
            forceNew: true,              // Force new connection to avoid conflicts
        });

        this.setupSocketEvents();
    }

    setupSocketEvents() {
        // Connection events
        this.socket.on('connect', () => {
            console.log('Connected to server');
            
            // Prevent multiple connections
            if (this.isConnected) {
                console.log('Already connected, ignoring duplicate connection');
                return;
            }
            
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.lastPingTime = Date.now();
            this.lastConnectionTime = Date.now();
            this.connectionQuality = 'excellent';
            this.lastActivity = new Date();
            
            // Clear any pending reconnection attempts
            if (this.reconnectTimeoutId) {
                clearTimeout(this.reconnectTimeoutId);
                this.reconnectTimeoutId = null;
            }
            
            // Start heartbeat monitoring
            this.startHeartbeat();
            
            // Process queued messages with automatic retry
            this.processMessageQueue();
            
            // Retry any messages that were marked as error due to connection issues
            this.retryFailedMessages();
            
            // Update UI - don't show disconnect/reconnect status on page refresh
            this.updateConnectionStatus(true, true); // true for skipAnimation
            
            // Ensure current user always shows as online
            setTimeout(() => this.ensureCurrentUserOnlineDisplay(), 100);
            
            // INITIALIZE PRESENCE SYSTEM - Ultra-instantaneous with recovery
            console.log('Initializing presence system on connection');
            this.recoverPresenceState();
            this.startPresenceHeartbeat();
            
            // Only show connection sound and notification for first connection
            if (!this.wasRecentlyConnected()) {
                Utils.Sound.beep(800, 150);
                Utils.Notifications.success('Conexión establecida correctamente');
            }
            
            // Process any queued messages from Chat
            if (window.Chat && typeof window.Chat.processQueuedMessages === 'function') {
                window.Chat.processQueuedMessages();
            }
            
            // Measure connection speed immediately after connecting
            setTimeout(() => {
                this.measureConnectionSpeed();
            }, 1000);
            
            // Setup call signaling after successful connection
            this.setupCallSignalingListeners();
        });

        // Session established event
        this.socket.on('session-established', (data) => {
            console.log('Session established:', data);
            this.sessionId = data.sessionId;
            this.sessionCount = data.sessionCount;
            this.isFirstSession = data.isFirstSession;
            
            // Don't show session count notifications anymore since we only have one auth session
            // Multiple socket connections may exist but they share the same auth session
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
            this.isConnected = false;
            
            // PRESENCE SYSTEM - Mark as offline on disconnect
            console.log('Disconnected - marking as offline');
            this.setUserPresence('offline');
            this.stopPresenceHeartbeat();
            
            // Don't update UI status on page refresh - keep showing as connected
            // Only update if it's a real disconnection (not page refresh)
            if (reason !== 'transport close' && reason !== 'transport error') {
                this.updateConnectionStatus(false);
            }
            
            // Check if disconnect is due to explicit session termination
            if (reason === 'io server disconnect') {
                console.log('Session terminated by server, handling...');
                return; // Don't attempt reconnection
            }
            
            // Handle parse errors specifically with circuit breaker
            if (reason === 'parse error') {
                this.handleParseError();
                return; // Don't attempt reconnection for parse errors
            }
            
            // For page refresh and normal disconnections, attempt reconnection
            if (reason !== 'io client disconnect') {
                console.log(`Disconnect reason: ${reason} - will attempt reconnection`);
                
                // Different timing based on disconnect reason
                if (reason === 'transport close' || reason === 'transport error') {
                    // Page refresh scenario - quick reconnection
                    setTimeout(() => {
                        this.scheduleReconnect();
                    }, 1000); // 1 second for page refresh
                } else {
                    // Other disconnections - standard delay
                    setTimeout(() => {
                        this.scheduleReconnect();
                    }, 5000); // 5 seconds for stability
                }
            }
        });

        // Inactivity warning event
        this.socket.on('inactivity-warning', (data) => {
            console.log('Inactivity warning received from server:', data);
            console.log('Showing warning modal with', data.timeoutSeconds, 'seconds');
            this.showInactivityWarning(data.timeoutSeconds);
        });

        // Session timeout event
        this.socket.on('session-timeout', (data) => {
            console.log('Session timeout:', data);
            this.handleSessionTimeout(data);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.isConnected = false;
            
            if (error.message.includes('Authentication error') || 
                error.message.includes('jwt expired') ||
                error.message.includes('invalid token') ||
                error.message.includes('unauthorized')) {
                console.log('Authentication error detected, logging out...');
                this.handleSessionTermination();
                return;
            }
            
            this.scheduleReconnect();
        });

        // Message events with ultra-fast handling
        this.socket.on('message-received', (data) => {
            const receiveTime = Date.now();
            console.log(`Message received at: ${receiveTime}`, data);
            
            // Calculate delivery latency if timestamp is available
            if (data.timestamp) {
                const latency = receiveTime - data.timestamp;
                console.log(`Message delivery latency: ${latency}ms`);
                
                // Update connection quality based on latency
                this.updateConnectionQualityFromLatency(latency);
            }
            
            // Handle message immediately with highest priority
            window.Chat.handleIncomingMessage(data);
            Utils.Sound.messageReceived();
            
            // Update global unread counter in real-time
            if (window.chatManager && typeof window.chatManager.updateGlobalUnreadCounter === 'function') {
                setTimeout(() => {
                    window.chatManager.updateGlobalUnreadCounter();
                }, 100);
            }
        });

        this.socket.on('message-sent', (data) => {
            const confirmTime = Date.now();
            console.log(`REAL MESSAGE SAVED confirmation:`, data);
            
            // Calculate round-trip time for performance monitoring
            if (data.timestamp) {
                const roundTripTime = confirmTime - data.timestamp;
                console.log(`Total processing time: ${roundTripTime}ms`);
                
                // Update connection quality based on performance
                this.updateConnectionQualityFromLatency(roundTripTime);
                
                // Log performance level
                if (roundTripTime < 50) {
                    console.log(`ULTRA-FAST real save: ${roundTripTime}ms`);
                } else if (roundTripTime < 100) {
                    console.log(`Fast real save: ${roundTripTime}ms`);
                } else if (roundTripTime < 200) {
                    console.log(`Good real save: ${roundTripTime}ms`);
                }
            }
            
            // CONFIRM REAL SAVE - Message is actually in database
            if (data.clientId) {
                // Update the message element with real message ID
                const messageEl = document.querySelector(`[data-client-id="${data.clientId}"]`);
                if (messageEl && data.realMessageId) {
                    messageEl.setAttribute('data-message-id', data.realMessageId);
                    console.log(`Updated message element with real ID: ${data.realMessageId}`);
                }
                
                // Keep the green checkmark (already showing) but confirm it's real
                console.log(`CONFIRMED: Mensaje ${data.clientId} REALMENTE guardado en DB con ID ${data.realMessageId}`);
                
                // Show brief success indicator for very fast messages
                if (data.processingTime < 100) {
                    const statusEl = messageEl?.querySelector('.message-status');
                    if (statusEl) {
                        const indicator = document.createElement('span');
                        indicator.textContent = data.processingTime < 50 ? '⚡' : '🚀';
                        indicator.style.cssText = 'margin-left: 3px; opacity: 0.7; font-size: 10px;';
                        statusEl.appendChild(indicator);
                        setTimeout(() => indicator.remove(), 2000);
                    }
                }
            }
            
            // Call Chat handler if available
            if (window.Chat && window.Chat.handleMessageSent) {
                window.Chat.handleMessageSent(data);
            }
        });

        this.socket.on('message-delivered', (data) => {
            console.log(`[SOCKET] Message delivered event received:`, data);
            
            // Update UI to show delivered status
            const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
            console.log(`[SOCKET] Looking for message element with ID:`, data.messageId, 'Found:', !!messageElement);
            
            if (messageElement) {
                const clientId = messageElement.getAttribute('data-client-id');
                console.log(`[SOCKET] Found clientId:`, clientId);
                if (clientId) {
                    this.updateMessageStatus(clientId, 'delivered', {
                        deliveredAt: data.deliveredAt
                    });
                }
            } else {
                // Try to find by clientId as fallback
                const messageElementByClientId = document.querySelector(`[data-client-id="${data.clientId}"]`);
                console.log(`[SOCKET] Fallback search by clientId:`, data.clientId, 'Found:', !!messageElementByClientId);
                
                if (messageElementByClientId) {
                    this.updateMessageStatus(data.clientId, 'delivered', {
                        deliveredAt: data.deliveredAt
                    });
                }
            }
            
            // Call Chat handler if available
            if (window.Chat && window.Chat.handleMessageDelivered) {
                console.log(`[SOCKET] Calling Chat.handleMessageDelivered`);
                window.Chat.handleMessageDelivered(data);
            } else {
                console.log(`[SOCKET] Chat.handleMessageDelivered not available`);
            }
        });

        this.socket.on('message-read', (data) => {
            console.log('Message read:', data);
            window.Chat.handleMessageRead(data);
        });

        this.socket.on('conversation-read', (data) => {
            console.log('Conversation read:', data);
            window.Chat.handleConversationRead(data);
            
            // Update global unread counter in real-time when conversation is read
            if (window.chatManager && typeof window.chatManager.updateGlobalUnreadCounter === 'function') {
                setTimeout(() => {
                    window.chatManager.updateGlobalUnreadCounter();
                }, 100);
            }
        });

        // Typing events
        this.socket.on('user-typing', (data) => {
            window.Chat.handleUserTyping(data);
        });

        this.socket.on('user-stopped-typing', (data) => {
            window.Chat.handleUserStoppedTyping(data);
        });

        // PRESENCE SYSTEM EVENTS - Ultra-instantaneous updates
        this.socket.on('presence-update', (data) => {
            console.log('Received presence update:', data);
            const { userId, status, lastSeen } = data;
            this.updatePresenceCache(userId, { status, lastSeen });
        });

        this.socket.on('user-online', (data) => {
            console.log('User came online:', data);
            const { userId, timestamp } = data;
            this.updatePresenceCache(userId, { status: 'online', lastSeen: null, timestamp });
            
            // Auto-mark sent messages to this user as delivered
            this.markMessagesToUserAsDelivered(userId);
        });

        this.socket.on('user-offline', (data) => {
            console.log('User went offline:', data);
            const { userId, lastSeen } = data;
            this.updatePresenceCache(userId, { status: 'offline', lastSeen });
        });

        this.socket.on('user-away', (data) => {
            console.log('User is away:', data);
            const { userId, lastSeen } = data;
            this.updatePresenceCache(userId, { status: 'away', lastSeen });
        });

        // TYPING EVENTS - Enhanced with real-time updates
        this.socket.on('user-typing', (data) => {
            console.log('User typing event:', data);
            const { userId, conversationId } = data;
            this.handleUserTyping(userId, conversationId);
        });

        this.socket.on('user-stopped-typing', (data) => {
            console.log('User stopped typing event:', data);
            const { userId, conversationId } = data;
            this.handleUserStoppedTyping(userId, conversationId);
        });

        // Message actions
        this.socket.on('message-edited', (data) => {
            console.log('Message edited:', data);
            window.Chat.handleMessageEdited(data);
        });

        this.socket.on('message-deleted', (data) => {
            console.log('Message deleted:', data);
            window.Chat.handleMessageDeleted(data);
        });

        this.socket.on('reaction-added', (data) => {
            console.log('Reaction added:', data);
            window.Chat.handleReactionAdded(data);
        });

        // Contact status events - enhanced for immediate updates
        this.socket.on('contact-status-changed', (data) => {
            console.log('Contact status changed:', data);
            
            // Update local activeUsers immediately based on status
            if (data.status === 'online') {
                this.activeUsers.set(data.userId, {
                    user: { status: data.status, lastSeen: data.lastSeen },
                    lastActivity: new Date(data.lastSeen || Date.now()),
                    status: data.status,
                    timestamp: data.timestamp || Date.now()
                });
                console.log(`User ${data.userId} marked as ONLINE in activeUsers`);
            } else if (data.status === 'offline') {
                // For instant offline (logout), remove immediately
                if (data.isInstant) {
                    this.activeUsers.delete(data.userId);
                    console.log(`User ${data.userId} removed from activeUsers IMMEDIATELY (logout)`);
                } else {
                    // For network disconnect, schedule removal after 2 minutes
                    setTimeout(() => {
                        this.activeUsers.delete(data.userId);
                        console.log(`User ${data.userId} removed from activeUsers after 2min timeout`);
                    }, 2 * 60 * 1000);
                }
            }
            
            // Forward to chat handler for UI updates
            if (window.Chat && window.Chat.handleContactStatusChanged) {
                window.Chat.handleContactStatusChanged(data);
            }
        });

        // Contact request events
        this.socket.on('contact-request-received', (data) => {
            console.log('Contact request received:', data);
            Utils.Notifications.info(`Nueva solicitud de contacto de ${data.sender.fullName}`);
            
            // Refresh contact requests if contacts manager exists
            if (window.contactsManager) {
                window.contactsManager.loadContactRequests();
            }
            
            // Play notification sound
            Utils.Sound.notification();
        });

        this.socket.on('contact-request-accepted', (data) => {
            console.log('Contact request accepted:', data);
            Utils.Notifications.success(`${data.contact.fullName} aceptó tu solicitud de contacto`);
            
            // Refresh contacts
            if (window.contactsManager) {
                window.contactsManager.loadContacts();
                window.contactsManager.loadContactRequests();
            }
            
            // Play success sound
            Utils.Sound.messageSent();
        });

        // Error events
        this.socket.on('message-error', (error) => {
            console.error('Message error:', error);
            Utils.Notifications.error(error.message || 'Error enviando mensaje');
        });

        // Session management events
        this.socket.on('session-expired', () => {
            console.log('Session expired event received');
            this.handleSessionTermination();
        });

        this.socket.on('force-logout', (data) => {
            console.log('Force logout event received:', data);
            Utils.Notifications.warning(data.message || 'Su sesión ha sido cerrada por el administrador.', 4500);
            this.handleSessionTermination();
        });

        // Handle heartbeat acknowledgments para robustez
        this.socket.on('presence-heartbeat-ack', (data) => {
            this.lastHeartbeatTime = Date.now();
            this.heartbeatFailureCount = 0;
            
            // Confirmar que el usuario está online en el servidor
            if (data.status === 'online') {
                this.userPresenceStatus = 'online';
            }
        });
    }

    setupEventHandlers() {
        // Handle online/offline events
        window.addEventListener('online', () => {
            console.log('Back online');
            // Only show if socket is not already connected to avoid duplicate notifications
            if (!this.isConnected) {
                Utils.Notifications.success('Conexión restaurada');
            }
            this.handleNetworkChange();
        });

        window.addEventListener('offline', () => {
            console.log('Gone offline');
            // Only show if we haven't shown a connection error recently
            if (!this.hasRecentConnectionError()) {
                Utils.Notifications.warning('Sin conexión a internet');
            }
            this.handleNetworkChange();
        });

        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Tab/window is hidden
                this.updateUserStatus('away');
            } else {
                // Tab/window is visible
                this.updateUserStatus('online');
                
                // Mark current conversation messages as read
                const currentConversation = window.Chat?.getCurrentConversation();
                if (currentConversation) {
                    this.markConversationAsRead(currentConversation._id);
                }
            }
        });
    }

    scheduleReconnect() {
        // Clear any existing reconnection timeout
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached');
            Utils.Notifications.error('No se pudo conectar al servidor. Reintentando en 60 segundos...');
            
            // Reset attempts and try again after a longer pause
            this.reconnectTimeoutId = setTimeout(() => {
                this.reconnectAttempts = 0;
                this.scheduleReconnect();
            }, 60000);
            return;
        }

        this.reconnectAttempts++;
        
        // More conservative exponential backoff
        const baseDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        const jitter = Math.random() * 2000; // Add more randomness
        const delay = Math.min(baseDelay + jitter, this.maxReconnectDelay);

        // Update connection quality based on attempts
        if (this.reconnectAttempts <= 2) {
            this.connectionQuality = 'good';
        } else if (this.reconnectAttempts <= 5) {
            this.connectionQuality = 'poor';
        } else {
            this.connectionQuality = 'critical';
        }

        console.log(`Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) - Quality: ${this.connectionQuality}`);
        
        // Only show notification after first few attempts  
        if (this.reconnectAttempts > 2) {
            Utils.Notifications.warning(`Reconectando... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        }

        this.reconnectTimeoutId = setTimeout(() => {
            this.reconnectTimeoutId = null; // Clear the timeout ID
            if (!this.isConnected) {
                console.log('Attempting to reconnect...');
                this.connect();
            }
        }, delay);
    }

    updateConnectionStatus(connected) {
        const statusElement = Utils.$('#connection-status');
        if (statusElement) {
            statusElement.textContent = connected ? 'Conectado' : 'Desconectado';
            statusElement.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
        }
    }

    // Send message with ultra-fast delivery and instant feedback
    sendMessage(recipientId, content, type = 'text', replyToId = null, attachments = [], clientId = null) {
        const sendTime = Date.now();
        const messageData = {
            recipientId,
            content,
            type,
            replyToId,
            attachments,
            timestamp: sendTime,
            clientId: clientId || `msg_${sendTime}_${Math.random().toString(36).substr(2, 9)}`
        };

        if (this.isConnected) {
            console.log(`📤 Enviando mensaje INSTANTÁNEO con clientId: ${messageData.clientId}`);
            
            // INSTANTANEOUS: Update to 'sent' immediately while sending
            setTimeout(() => {
                this.updateMessageStatus(messageData.clientId, 'sent', {
                    serverProcessingTime: 0,
                    messageId: 'sending'
                });
            }, 10); // Almost instant visual feedback
            
            // Ultra-fast socket emission with immediate acknowledgment
            this.socket.emit('send-message', messageData, (acknowledgment) => {
                const ackTime = Date.now();
                const ackLatency = ackTime - sendTime;
                
                console.log(`📤 Send ACK received in ${ackLatency}ms for clientId: ${messageData.clientId}`);
                
                if (acknowledgment && acknowledgment.success) {
                    // Confirm server accepted message - already shows as sent
                    console.log(`OK Mensaje confirmado por servidor: ${messageData.clientId}`);
                } else {
                    // Server rejected message - revert to error
                    const errorMsg = acknowledgment?.error || acknowledgment?.message || 'Send failed';
                    this.updateMessageStatus(messageData.clientId, 'error', {
                        error: errorMsg
                    });
                    console.error(`ERROR Mensaje rechazado por servidor: ${errorMsg}`, acknowledgment);
                }
            });
            
        } else {
            // Queue message for when connection is restored
            this.messageQueue.push({
                event: 'send-message',
                data: messageData,
                retryCount: 0,
                maxRetries: 3
            });
            
            // Mark as queued and show warning
            this.updateMessageStatus(messageData.clientId, 'queued');
            Utils.Notifications.warning('Sin conexión. El mensaje se enviará automáticamente cuando se restaure la conexión.');
            
            // Try to reconnect immediately
            setTimeout(() => this.scheduleReconnect(), 100);
        }
        
        return messageData.clientId; // Return client ID for tracking
    }

    // Send forwarded message with enhanced structure
    sendForwardedMessage(recipientId, newContent, forwardData, clientId = null) {
        // Validate input data
        if (!recipientId) {
            console.error('Invalid recipient ID for forward');
            return null;
        }
        
        if (!forwardData || !forwardData.originalContent) {
            console.error('Invalid forward data');
            return null;
        }
        
        const sendTime = Date.now();
        
        // Create message content - combine original content with additional text
        let messageContent = forwardData.originalContent;
        if (newContent && newContent.trim()) {
            messageContent = `${newContent.trim()}\n\n[Mensaje reenviado]\n${forwardData.originalContent}`;
        } else {
            messageContent = `[Mensaje reenviado]\n${forwardData.originalContent}`;
        }
        
        const messageData = {
            recipientId,
            content: messageContent,
            type: forwardData.originalType || 'text',
            timestamp: sendTime,
            clientId: clientId || `msg_${sendTime}_${Math.random().toString(36).substr(2, 9)}`,
            attachments: forwardData.originalAttachments || [], // Include original attachments
            forwarded: {
                isForwarded: true,
                originalMessage: forwardData.originalMessage,
                originalSender: forwardData.originalSender,
                originalContent: forwardData.originalContent,
                originalType: forwardData.originalType || 'text',
                originalAttachments: forwardData.originalAttachments || [],
                additionalText: newContent && newContent.trim() ? newContent.trim() : null,
                forwardedAt: new Date().toISOString(),
                forwardedBy: null // Will be set by server to current user
            }
        };

        if (this.isConnected) {
            console.log(`📤 Enviando mensaje REENVIADO con clientId: ${messageData.clientId}`);
            
            // Don't try to update message status for forwarded messages 
            // since they don't have DOM elements in most conversations
            
            // Send via socket
            this.socket.emit('send-message', messageData, (acknowledgment) => {
                try {
                    const ackTime = Date.now();
                    const ackLatency = ackTime - sendTime;
                    
                    console.log(`📤 Forward ACK received in ${ackLatency}ms for clientId: ${messageData.clientId}`);
                    
                    // Handle null or undefined acknowledgment
                    if (!acknowledgment) {
                        console.error(`ERROR Reenvío sin respuesta del servidor: ${messageData.clientId}`);
                        return;
                    }
                    
                    // Debug acknowledgment structure
                    console.log(`🔍 Estructura del acknowledgment:`, acknowledgment);
                    
                    // Check different possible acknowledgment formats
                    if (acknowledgment.success || acknowledgment._id || (acknowledgment.sender && acknowledgment.recipient)) {
                        console.log(`OK Mensaje reenviado confirmado: ${messageData.clientId}`);
                    } else if (acknowledgment.error || acknowledgment.success === false) {
                        const errorMsg = acknowledgment?.error || acknowledgment?.message || 'Forward failed';
                        console.error(`ERROR Reenvío rechazado: ${errorMsg}`, acknowledgment);
                    } else {
                        console.log(`OK Mensaje reenviado recibido: ${messageData.clientId}`, acknowledgment);
                    }
                } catch (error) {
                    console.error('Error in forward acknowledgment callback:', error);
                }
            });
            
        } else {
            // Queue forwarded message
            this.messageQueue.push({
                event: 'send-message',
                data: messageData,
                retryCount: 0,
                maxRetries: 3
            });
            
            console.log('🔄 Mensaje reenviado agregado a la cola - se enviará al reconectar');
            setTimeout(() => this.scheduleReconnect(), 100);
        }
        
        return messageData.clientId;
    }

    // Instantly add message to UI before server confirmation
    addMessageToUIInstantly(messageData, status = 'sending') {
        // This method is not needed since we handle UI updates in chat.js
        // The message UI is handled by sendCurrentMessage() in ChatManager
        console.log('🔄 UI ya actualizada por ChatManager, status:', status);
        return null;
    }

    // Update message status with ultra-fast visual feedback
    updateMessageStatus(clientId, status, metadata = {}) {
        const messageElement = document.querySelector(`[data-client-id="${clientId}"]`);
        if (!messageElement) {
            // Only log warning for errors, not for forwarded messages
            if (status === 'error') {
                console.log('WARNING No se encontró elemento con clientId para error:', clientId);
            }
            return;
        }

        console.log(`🔄 Actualizando status de mensaje ${clientId} a: ${status}`);

        // Remove all status classes
        messageElement.classList.remove('sending', 'sent', 'delivered', 'read', 'error', 'queued');
        
        // Add new status
        messageElement.classList.add(status);
        
        // Update status icon - Usar el contenedor .message-status en lugar de solo el icono
        const statusContainer = messageElement.querySelector('.message-status');
        if (statusContainer) {
            switch (status) {
                case 'sending':
                    statusContainer.innerHTML = '<i class="fas fa-clock" style="color: #9ca3af;" title="Enviando..."></i>';
                    break;
                case 'sent':
                    statusContainer.innerHTML = '<span class="checkmark single" style="color: #9ca3af !important;" title="Enviado">✓</span>';
                    console.log('OK Mensaje marcado como enviado con check mark');
                    break;
                case 'delivered':
                    statusContainer.innerHTML = '<span class="checkmark double" style="color: #9ca3af !important;" title="Entregado">✓✓</span>';
                    console.log('OK Mensaje marcado como entregado con double check mark');
                    break;
                case 'read':
                    statusContainer.innerHTML = '<span class="checkmark double read" style="color: #00bfff !important;" title="Leído">✓✓</span>';
                    console.log('OK Mensaje marcado como leído con blue double check mark');
                    break;
                case 'error':
                    statusContainer.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #ef4444;" title="Error al enviar"></i>';
                    break;
                case 'queued':
                    statusContainer.innerHTML = '<i class="fas fa-pause" style="color: #f59e0b;" title="En cola"></i>';
                    break;
            }
        }

        // Add performance indicator for fast messages
        if (metadata.serverProcessingTime && metadata.serverProcessingTime < 100) {
            const perfIndicator = messageElement.querySelector('.perf-indicator') || document.createElement('div');
            perfIndicator.className = 'perf-indicator';
            perfIndicator.innerHTML = metadata.serverProcessingTime < 50 ? '⚡' : '🚀';
            perfIndicator.title = `Procesado en ${metadata.serverProcessingTime}ms`;
            
            if (!messageElement.querySelector('.perf-indicator')) {
                messageElement.appendChild(perfIndicator);
            }
            
            // Remove indicator after 3 seconds
            setTimeout(() => perfIndicator.remove(), 3000);
        }

        // Store message ID if provided
        if (metadata.messageId && metadata.messageId !== 'pending') {
            messageElement.setAttribute('data-message-id', metadata.messageId);
        }
    }

    // Mark message as read - ENHANCED with logging and validation
    markMessageAsRead(messageId, conversationId = null) {
        if (!messageId) {
            console.error('ERROR Cannot mark message as read - no messageId provided');
            return;
        }

        if (this.isConnected) {
            console.log('👁️ Marking message as read via socket:', { messageId, conversationId });
            this.socket.emit('mark-as-read', { messageId, conversationId }, (acknowledgment) => {
                if (acknowledgment && acknowledgment.success) {
                    console.log('OK Message marked as read on server:', messageId);
                } else {
                    console.error('ERROR Failed to mark message as read:', acknowledgment?.error || 'No acknowledgment');
                }
            });
        } else {
            console.warn('WARNING  Cannot mark message as read - socket not connected');
        }
    }

    // Mark entire conversation as read - ENHANCED with logging and validation
    markConversationAsRead(conversationId) {
        if (!conversationId) {
            console.error('ERROR Cannot mark conversation as read - no conversationId provided');
            return;
        }

        // Skip temporary conversation IDs (they start with "temp_")
        if (conversationId.startsWith('temp_')) {
            console.log('🟡 Skipping temporary conversation ID for socket read marking:', conversationId);
            return;
        }
        
        if (this.isConnected) {
            console.log('👁️ Marking entire conversation as read via socket:', conversationId);
            this.socket.emit('mark-as-read', { conversationId }, (acknowledgment) => {
                if (acknowledgment && acknowledgment.success) {
                    console.log('OK Conversation marked as read on server:', conversationId);
                } else {
                    console.error('ERROR Failed to mark conversation as read:', acknowledgment?.error || 'No acknowledgment');
                }
            });
        } else {
            console.warn('WARNING  Cannot mark conversation as read - socket not connected');
        }
    }

    // Typing indicators
    // ULTRA-INSTANTANEOUS TYPING INDICATORS
    startTyping(recipientId, conversationId = null) {
        if (!this.isConnected || !conversationId) return;
        
        console.log(`TYPING Starting typing indicator for conversation: ${conversationId}`);
        
        this.sendTypingIndicator(conversationId, true);
        
        // Clear any existing timeout for this conversation
        const timeoutKey = `typing-${conversationId}`;
        if (this.typingTimeouts.has(timeoutKey)) {
            clearTimeout(this.typingTimeouts.get(timeoutKey));
        }
        
        // Stop typing automatically after 3 seconds of inactivity
        const timeout = setTimeout(() => {
            this.stopTyping(recipientId, conversationId);
        }, 3000);
        
        this.typingTimeouts.set(timeoutKey, timeout);
    }

    stopTyping(recipientId, conversationId = null) {
        if (!this.isConnected || !conversationId) return;
        
        console.log(`TYPING Stopping typing indicator for conversation: ${conversationId}`);
        
        this.sendTypingIndicator(conversationId, false);
        
        // Clear timeout
        const timeoutKey = `typing-${conversationId}`;
        if (this.typingTimeouts.has(timeoutKey)) {
            clearTimeout(this.typingTimeouts.get(timeoutKey));
            this.typingTimeouts.delete(timeoutKey);
        }
    }

    // Message reactions
    addReaction(messageId, emoji) {
        if (this.isConnected) {
            this.socket.emit('add-reaction', { messageId, emoji });
        }
    }

    // Edit message
    editMessage(messageId, newContent) {
        if (this.isConnected) {
            this.socket.emit('edit-message', { messageId, newContent });
        }
    }

    // Delete message
    deleteMessage(messageId) {
        if (this.isConnected) {
            this.socket.emit('delete-message', { messageId });
        }
    }

    // Update user status
    updateUserStatus(status, statusMessage = '') {
        if (this.isConnected) {
            this.socket.emit('change-status', { status, statusMessage });
        }
        // Keep current user display always as "En línea" regardless of actual status
        this.ensureCurrentUserOnlineDisplay();
    }
    
    // Ensure current user always shows as online in the UI
    ensureCurrentUserOnlineDisplay() {
        // User online status is now handled through the presence system and main menu
        // No sidebar status elements to update since we removed the user profile section
        console.log('Current user online display ensured through presence system');
    }

    // Join conversation room
    joinConversation(conversationId) {
        if (this.isConnected) {
            this.socket.emit('join-conversation', conversationId);
        }
    }

    // Leave conversation room
    leaveConversation(conversationId) {
        if (this.isConnected) {
            this.socket.emit('leave-conversation', conversationId);
        }
    }

    // Process queued messages with retry logic
    processMessageQueue() {
        console.log(`🔄 Procesando cola de mensajes: ${this.messageQueue.length} mensajes`);
        
        while (this.messageQueue.length > 0) {
            const queueItem = this.messageQueue.shift();
            const { event, data, retryCount = 0, maxRetries = 3 } = queueItem;
            
            console.log(`📤 Enviando mensaje en cola (intento ${retryCount + 1}/${maxRetries + 1}): ${data.clientId}`);
            
            // Update status to sending
            this.updateMessageStatus(data.clientId, 'sending');
            
            // Send with retry logic
            this.socket.emit(event, data, (acknowledgment) => {
                if (acknowledgment && acknowledgment.success) {
                    console.log(`OK Mensaje de cola enviado exitosamente: ${data.clientId}`);
                    this.updateMessageStatus(data.clientId, 'sent', {
                        messageId: acknowledgment.messageId
                    });
                } else {
                    console.error(`ERROR Error enviando mensaje de cola: ${data.clientId}`, acknowledgment?.error);
                    
                    // Retry if we haven't exceeded max retries
                    if (retryCount < maxRetries) {
                        console.log(`🔄 Reintentando mensaje ${data.clientId} (${retryCount + 1}/${maxRetries})`);
                        
                        // Re-queue with incremented retry count
                        this.messageQueue.push({
                            event,
                            data,
                            retryCount: retryCount + 1,
                            maxRetries
                        });
                        
                        // Update status to queued
                        this.updateMessageStatus(data.clientId, 'queued');
                    } else {
                        console.error(`ERROR Máximo de reintentos alcanzado para mensaje: ${data.clientId}`);
                        this.updateMessageStatus(data.clientId, 'error', {
                            error: 'Máximo de reintentos alcanzado'
                        });
                    }
                }
            });
        }
    }

    // Retry failed messages after reconnection
    retryFailedMessages() {
        if (!this.isConnected) return;
        
        const failedMessages = document.querySelectorAll('.message.error[data-client-id]');
        console.log(`🔄 Reintentando ${failedMessages.length} mensajes fallidos después de reconexión`);
        
        failedMessages.forEach(messageEl => {
            const clientId = messageEl.getAttribute('data-client-id');
            const messageText = messageEl.querySelector('.message-text')?.textContent?.trim();
            
            if (clientId && messageText) {
                console.log(`🔄 Reintentando mensaje fallido: ${clientId}`);
                
                // Extract recipient info from current conversation
                const recipientId = window.Chat?.getRecipientId();
                if (recipientId) {
                    // Update status to sending
                    this.updateMessageStatus(clientId, 'sending');
                    
                    // Resend message
                    const retryData = {
                        recipientId,
                        content: messageText,
                        type: 'text',
                        replyToId: null,
                        attachments: [],
                        timestamp: Date.now(),
                        clientId: clientId
                    };
                    
                    this.socket.emit('send-message', retryData, (acknowledgment) => {
                        if (acknowledgment && acknowledgment.success) {
                            this.updateMessageStatus(clientId, 'sent', {
                                messageId: acknowledgment.messageId
                            });
                            console.log(`OK Mensaje reintentado exitosamente: ${clientId}`);
                        } else {
                            this.updateMessageStatus(clientId, 'error', {
                                error: acknowledgment?.error || 'Retry failed'
                            });
                            console.error(`ERROR Reintento falló para mensaje: ${clientId}`);
                        }
                    });
                }
            }
        });
    }

    // Disconnect
    disconnect() {
        // Stop all monitoring
        this.stopMonitoring();
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
        
        // Clear message queue
        this.messageQueue = [];
        
        // Clear typing timeouts
        for (const timeout of this.typingTimeouts.values()) {
            clearTimeout(timeout);
        }
        this.typingTimeouts.clear();
        
        this.updateConnectionStatus(false);
    }

    // Update connection quality based on latency
    updateConnectionQualityFromLatency(latency) {
        let newQuality = this.connectionQuality;
        
        if (latency < 100) {
            newQuality = 'excellent';
        } else if (latency < 300) {
            newQuality = 'good';
        } else if (latency < 800) {
            newQuality = 'poor';
        } else {
            newQuality = 'critical';
        }
        
        // Only update if quality changed
        if (newQuality !== this.connectionQuality) {
            this.connectionQuality = newQuality;
            console.log(`Connection quality updated to: ${newQuality} (latency: ${latency}ms)`);
            this.updateConnectionStatus(this.isConnected);
        }
    }

    // Get connection status with latency info
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            queuedMessages: this.messageQueue.length,
            connectionQuality: this.connectionQuality,
            lastPingTime: this.lastPingTime
        };
    }

    // Ping test for connection speed measurement
    measureConnectionSpeed() {
        if (!this.isConnected) return;
        
        const pingStart = Date.now();
        this.socket.emit('ping-test', { timestamp: pingStart }, (response) => {
            const pingEnd = Date.now();
            const latency = pingEnd - pingStart;
            
            console.log(`Ping test result: ${latency}ms`);
            this.updateConnectionQualityFromLatency(latency);
            
            return latency;
        });
    }

    // Send custom event
    emit(event, data) {
        if (this.isConnected) {
            this.socket.emit(event, data);
        }
    }

    // Listen for custom event
    on(event, callback) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    // Remove event listener
    off(event, callback) {
        if (this.socket) {
            this.socket.off(event, callback);
        }
    }

    // Connection health monitoring
    startConnectionHealthCheck() {
        this.connectionHealthCheck = setInterval(() => {
            if (this.isConnected) {
                const timeSinceLastPing = Date.now() - this.lastPingTime;
                
                // Check if connection is stale (no ping for more than 5 minutes)
                if (timeSinceLastPing > 300000) {
                    console.warn('Connection appears stale, forcing reconnect');
                    this.isConnected = false;
                    this.socket?.disconnect();
                    this.scheduleReconnect();
                }
            }
        }, 30000); // Check every 30 seconds (less frequent)
    }

    // Start heartbeat monitoring
    startHeartbeat() {
        // Clear existing heartbeat
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected && this.socket) {
                // Just update the ping time, let Socket.IO handle the actual pings
                this.lastPingTime = Date.now();
            }
        }, 120000); // Check every 2 minutes
    }

    // Stop all monitoring
    stopMonitoring() {
        if (this.connectionHealthCheck) {
            clearInterval(this.connectionHealthCheck);
            this.connectionHealthCheck = null;
        }
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
        }
    }

    // Enhanced connection status update
    updateConnectionStatus(connected) {
        const statusElement = Utils.$('#connection-status');
        const qualityElement = Utils.$('#connection-quality');
        
        if (statusElement) {
            statusElement.textContent = connected ? 'Conectado' : 'Desconectado';
            statusElement.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
            
            if (connected) {
                statusElement.className += ` quality-${this.connectionQuality}`;
            }
        }

        if (qualityElement) {
            if (connected) {
                const qualityTexts = {
                    excellent: 'Excelente',
                    good: 'Buena',
                    poor: 'Regular',
                    critical: 'Crítica'
                };
                
                qualityElement.textContent = qualityTexts[this.connectionQuality];
                qualityElement.className = `connection-quality quality-${this.connectionQuality}`;
                qualityElement.style.display = 'inline';
            } else {
                qualityElement.style.display = 'none';
            }
        }
    }

    // Helper methods for notification control
    wasRecentlyConnected() {
        const now = Date.now();
        return (now - this.lastConnectionTime) < 2000; // 2 seconds
    }

    hasRecentConnectionError() {
        const now = Date.now();
        if ((now - this.lastErrorTime) < 3000) { // 3 seconds
            return true;
        }
        this.lastErrorTime = now;
        return false;
    }

    // Force reconnect method
    forceReconnect() {
        console.log('Forcing clean reconnection...');
        this.reconnectAttempts = 0;
        this.isConnected = false;
        
        // Set prevention period
        this.preventReconnectUntil = Date.now() + 2000; // 2 second prevention
        
        // Clear all monitoring
        this.stopMonitoring();
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        // Give a moment for cleanup
        setTimeout(() => {
            this.connect();
        }, 2000);
    }

    // Network change detection
    handleNetworkChange() {
        if (navigator.onLine) {
            console.log('Network is back online');
            if (!this.isConnected) {
                // Reset reconnection attempts on network recovery
                this.reconnectAttempts = Math.max(0, this.reconnectAttempts - 3);
                this.forceReconnect();
            }
        } else {
            console.log('Network went offline');
            this.connectionQuality = 'critical';
            this.updateConnectionStatus(false);
        }
    }

    // Close session (called from logout button)
    closeSession() {
        if (this.socket && this.isConnected && this.sessionId) {
            // Send close session event to server
            this.socket.emit('close-session', {
                sessionId: this.sessionId
            });
            
            // Wait briefly for server to process then proceed with logout
            setTimeout(() => {
                this.completeLogout();
            }, 500);
        } else {
            // No active socket, proceed directly with logout
            this.completeLogout();
        }
        
        // Cleanup local state
        this.cleanup();
    }
    
    // Complete the logout process
    completeLogout() {
        // Use AuthManager logout if available
        if (window.AuthManager) {
            window.AuthManager.logout();
        } else if (window.API && window.API.Auth) {
            // Fallback to API logout
            window.API.Auth.logout();
            window.location.reload();
        } else {
            // Manual logout as last resort
            localStorage.removeItem('token');
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            window.location.reload();
        }
    }

    // Setup activity tracking
    setupActivityTracking() {
        // Track user activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        let lastActivitySent = 0;
        
        const updateActivity = () => {
            this.lastActivity = new Date();
            
            // Solo enviar al servidor cada 5 segundos para evitar spam
            const now = Date.now();
            if (now - lastActivitySent > 5000) {
                lastActivitySent = now;
                
                if (this.socket && this.isConnected && this.sessionId) {
                    this.socket.emit('user-activity', {
                        sessionId: this.sessionId,
                        timestamp: new Date()
                    });
                }
            }
        };

        events.forEach(event => {
            document.addEventListener(event, updateActivity, true);
        });

        // Track window focus/blur
        window.addEventListener('focus', () => {
            this.lastActivity = new Date();
            if (this.socket && this.isConnected) {
                this.updateUserStatus('online');
            }
        });

        window.addEventListener('blur', () => {
            if (this.socket && this.isConnected) {
                this.updateUserStatus('away');
            }
        });
    }

    // Show inactivity warning modal
    showInactivityWarning(timeoutSeconds) {
        // Remove existing modal if any
        this.hideInactivityWarning();
        
        // Create warning modal
        this.inactivityWarningModal = document.createElement('div');
        this.inactivityWarningModal.className = 'inactivity-warning-modal';
        this.inactivityWarningModal.innerHTML = `
            <div class="inactivity-warning-overlay"></div>
            <div class="inactivity-warning-content">
                <div class="inactivity-warning-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <h3>Sesión por expirar</h3>
                <p>Su sesión se cerrará por inactividad en <span class="countdown">${timeoutSeconds}</span> segundos</p>
                <div class="inactivity-warning-actions">
                    <button class="btn-keep-session">Mantener sesión activa</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.inactivityWarningModal);
        
        // Start countdown
        let remainingSeconds = timeoutSeconds;
        const countdownElement = this.inactivityWarningModal.querySelector('.countdown');
        
        this.inactivityTimer = setInterval(() => {
            remainingSeconds--;
            if (countdownElement) {
                countdownElement.textContent = remainingSeconds;
            }
            
            if (remainingSeconds <= 0) {
                clearInterval(this.inactivityTimer);
                this.hideInactivityWarning();
            }
        }, 1000);
        
        // Handle keep session button
        const keepSessionBtn = this.inactivityWarningModal.querySelector('.btn-keep-session');
        keepSessionBtn.addEventListener('click', () => {
            this.keepSessionActive();
        });
        
        // Show modal with animation
        setTimeout(() => {
            this.inactivityWarningModal.classList.add('show');
        }, 10);
    }

    // Hide inactivity warning
    hideInactivityWarning() {
        if (this.inactivityTimer) {
            clearInterval(this.inactivityTimer);
            this.inactivityTimer = null;
        }
        
        if (this.inactivityWarningModal) {
            this.inactivityWarningModal.classList.remove('show');
            setTimeout(() => {
                if (this.inactivityWarningModal && this.inactivityWarningModal.parentNode) {
                    this.inactivityWarningModal.parentNode.removeChild(this.inactivityWarningModal);
                }
                this.inactivityWarningModal = null;
            }, 300);
        }
    }

    // Keep session active
    keepSessionActive() {
        this.lastActivity = new Date();
        this.hideInactivityWarning();
        
        // Send activity update to server
        if (this.socket && this.isConnected) {
            this.socket.emit('keep-session-active', {
                sessionId: this.sessionId
            });
        }
        
        Utils.Notifications.success('Sesión mantenida activa', 3000);
    }

    // Handle session timeout
    handleSessionTimeout(data) {
        this.hideInactivityWarning();
        
        Utils.Notifications.warning('Sesión cerrada por inactividad. Redirigiendo al login...', 4500);
        
        // Logout after showing message
        setTimeout(async () => {
            await this.handleLogout();
        }, 1000);
    }

    // Handle logout (redirect to login)
    async handleLogout() {
        // Cleanup
        this.cleanup();
        
        // Use AuthManager if available
        if (window.AuthManager) {
            await window.AuthManager.logout();
        } else if (window.API && window.API.Auth) {
            await window.API.Auth.logout();
            window.location.reload();
        } else {
            // Manual logout
            localStorage.removeItem('token');
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            window.location.reload();
        }
    }

    // Cleanup method
    cleanup() {
        // Stop all monitoring
        this.stopMonitoring();
        
        // Clear message queue
        this.messageQueue = [];
        
        // Clear typing timeouts
        for (const timeout of this.typingTimeouts.values()) {
            clearTimeout(timeout);
        }
        this.typingTimeouts.clear();
        
        // Hide inactivity warning
        this.hideInactivityWarning();
        
        // Disconnect socket
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.isConnected = false;
        this.sessionId = null;
        this.sessionCount = 0;
    }

    // Handle session termination
    handleSessionTermination() {
        // Show notification about session termination
        Utils.Notifications.warning('Su sesión ha expirado o ha sido cerrada. Redirigiendo al login...', 4500);
        
        // Logout user and redirect to login
        setTimeout(() => {
            this.handleLogout();
        }, 1000);
    }

    // Handle parse errors with circuit breaker
    handleParseError() {
        const now = Date.now();
        this.parseErrorCount++;
        this.lastParseErrorTime = now;
        
        console.log(`Parse error #${this.parseErrorCount} detected`);
        
        if (this.parseErrorCount >= this.maxParseErrors) {
            this.circuitBreakerOpen = true;
            console.log('Circuit breaker opened - too many parse errors');
            this.showConnectionError('Problemas de conexión detectados. Se reintentará automáticamente en 30 segundos.');
            
            // Schedule automatic retry after circuit breaker timeout
            setTimeout(() => {
                this.resetCircuitBreaker();
                this.forceReconnect();
            }, this.parseErrorResetTime);
        }
    }

    // Reset circuit breaker
    resetCircuitBreaker() {
        this.parseErrorCount = 0;
        this.circuitBreakerOpen = false;
        console.log('Circuit breaker reset');
    }

    // Show connection error to user
    showConnectionError(message) {
        if (window.Utils && Utils.Notifications) {
            Utils.Notifications.error(message, 5000);
        }
        
        // Update connection status in UI
        this.updateConnectionStatus(false);
        
        // Show in console for debugging
        console.warn('Connection Error:', message);
    }
    // ULTRA-INSTANTANEOUS PRESENCE SYSTEM
    setupPresenceSystem() {
        console.log('🟢 Setting up ultra-instantaneous presence system');
        
        // Setup window focus/blur events for precise presence tracking
        window.addEventListener('focus', () => {
            console.log('🔍 Window focused - marking as active');
            this.setUserPresence('online');
            this.startPresenceHeartbeat();
        });
        
        window.addEventListener('blur', () => {
            console.log('💤 Window blurred - marking as away after delay');
            // Small delay to avoid flickering when switching tabs quickly
            setTimeout(() => {
                if (document.hidden) {
                    this.setUserPresence('away');
                }
            }, 2000);
        });
        
        // Setup visibility change events
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('👁️ Page hidden - setting away status');
                this.setUserPresence('away');
            } else {
                console.log('👁️ Page visible - setting online status');
                this.setUserPresence('online');
                this.startPresenceHeartbeat();
            }
        });
        
        // Setup beforeunload to mark offline
        window.addEventListener('beforeunload', () => {
            console.log('🚪 User leaving - marking offline');
            this.setUserPresence('offline');
            this.stopPresenceHeartbeat();
        });
    }
    
    // Start ultra-fast heartbeat system (every 3 seconds)
    startPresenceHeartbeat() {
        this.stopPresenceHeartbeat(); // Clear any existing interval
        
        if (!this.isConnected) {
            console.log('Cannot start presence heartbeat - not connected');
            return;
        }
        
        console.log(`Starting robust presence heartbeat (every ${this.presenceHeartbeatFrequency/1000}s)`);
        this.presenceHeartbeatInterval = setInterval(() => {
            this.sendPresenceHeartbeat();
        }, this.presenceHeartbeatFrequency);
        
        // Send immediate heartbeat
        this.sendPresenceHeartbeat();
    }
    
    stopPresenceHeartbeat() {
        if (this.presenceHeartbeatInterval) {
            console.log('Stopping presence heartbeat');
            clearInterval(this.presenceHeartbeatInterval);
            this.presenceHeartbeatInterval = null;
        }
    }
    
    // Send heartbeat robusto con manejo de errores
    sendPresenceHeartbeat() {
        if (!this.isConnected || !this.socket) {
            this.heartbeatFailureCount++;
            console.log(`Cannot send heartbeat - not connected (failures: ${this.heartbeatFailureCount})`);
            
            if (this.heartbeatFailureCount >= this.maxHeartbeatFailures) {
                this.stopPresenceHeartbeat();
                this.attemptReconnection();
            }
            return;
        }
        
        const heartbeatData = {
            status: 'online', // Siempre online mientras enviamos heartbeat
            timestamp: Date.now(),
            lastActivity: this.lastActivity.getTime()
        };
        
        // Send heartbeat sin callback para mejor rendimiento
        this.socket.emit('presence-heartbeat', heartbeatData);
        this.lastHeartbeatTime = Date.now();
        
        // Reset failure count on successful send
        this.heartbeatFailureCount = 0;
    }
    
    
    // Get user presence from cache or default
    getUserPresence(userId) {
        const cached = this.presenceCache.get(userId);
        if (cached) {
            // Check if data is fresh (less than 10 seconds old)
            const now = Date.now();
            const age = now - cached.lastUpdate;
            if (age < 10000) {
                console.log(`💡 Presence cache HIT for ${userId} (age: ${age}ms)`);
                return cached;
            } else {
                console.log(`⏰ Presence cache EXPIRED for ${userId} (age: ${age}ms)`);
            }
        } else {
            console.log(`ERROR: Presence cache MISS for ${userId} - not in cache`);
        }
        
        // Try to get lastSeen from contact data if available
        let lastSeen = null;
        
        // Check contacts manager first
        if (window.contactsManager?.contacts) {
            const contact = window.contactsManager.contacts.get(userId);
            if (contact && contact.lastSeen) {
                lastSeen = contact.lastSeen;
                console.log(`📞 getUserPresence: Found lastSeen in contacts for ${userId}:`, lastSeen);
            }
        }
        
        // Fallback to active users if no contact data
        if (!lastSeen && this.activeUsers?.has(userId)) {
            const activeUser = this.activeUsers.get(userId);
            if (activeUser?.user?.lastSeen) {
                lastSeen = activeUser.user.lastSeen;
                console.log(`👥 getUserPresence: Found lastSeen in activeUsers for ${userId}:`, lastSeen);
            } else if (activeUser?.lastActivity) {
                lastSeen = activeUser.lastActivity;
                console.log(`⚡ getUserPresence: Using lastActivity for ${userId}:`, lastSeen);
            }
        }
        
        const presenceData = { status: 'offline', lastSeen, lastUpdate: 0 };
        console.log(`🔍 getUserPresence fallback for ${userId}:`, presenceData);
        
        return presenceData;
    }
    
    // Update presence cache when receiving updates from server - INSTANT
    updatePresenceCache(userId, presenceData) {
        const now = Date.now();
        const oldPresence = this.presenceCache.get(userId);
        const updated = {
            ...presenceData,
            lastUpdate: now
        };
        
        this.presenceCache.set(userId, updated);
        console.log(`💾 Presence cache SET for ${userId}:`, { status: updated.status, lastSeen: updated.lastSeen });
        console.log(`⚡ INSTANT presence update for ${userId}:`, updated);
        
        // Check if this is a significant status change
        const statusChanged = !oldPresence || oldPresence.status !== updated.status;
        
        if (statusChanged) {
            console.log(`🔄 Status changed from ${oldPresence?.status || 'unknown'} to ${updated.status}`);
            
            // Immediately update all UI instances
            this.updatePresenceInAllViews(userId, updated);
        }
        
        // Notify Chat of presence change with priority flag
        if (window.Chat) {
            window.Chat.handlePresenceUpdate(userId, updated, statusChanged);
        }
    }
    
    // Update presence across all UI views instantly
    updatePresenceInAllViews(userId, presenceData) {
        // Update contact list indicators
        this.updateContactPresenceIndicator(userId, presenceData);
        
        // Update conversation list indicators
        this.updateConversationPresenceIndicator(userId, presenceData);
        
        // Update chat header if this is the active conversation
        this.updateChatHeaderPresence(userId, presenceData);
    }
    
    // Instant contact presence update
    updateContactPresenceIndicator(userId, presenceData) {
        const contactItem = document.querySelector(`[data-user-id="${userId}"]`);
        if (!contactItem) return;
        
        const statusIndicator = contactItem.querySelector('.status-indicator');
        if (!statusIndicator) return;
        
        // Add update animation
        statusIndicator.classList.add('status-updating');
        
        // Update status class with animation
        requestAnimationFrame(() => {
            // Remove old status classes
            statusIndicator.classList.remove('online', 'offline', 'away', 'busy');
            
            // Add new status class
            statusIndicator.classList.add(presenceData.status);
            
            // Remove update animation after a short delay
            setTimeout(() => {
                statusIndicator.classList.remove('status-updating');
            }, 150);
        });
        
        console.log(`SUCCESS: Updated contact ${userId} status to ${presenceData.status}`);
    }
    
    // Instant conversation presence update
    updateConversationPresenceIndicator(userId, presenceData) {
        // Find conversations with this user
        const conversationItems = document.querySelectorAll('[data-conversation-id]');
        
        conversationItems.forEach(item => {
            const conversationId = item.dataset.conversationId;
            
            // Check if this conversation involves the user (simple check)
            const statusIndicator = item.querySelector('.status-indicator');
            if (!statusIndicator) return;
            
            // Update with same logic as contact
            statusIndicator.classList.add('status-updating');
            
            requestAnimationFrame(() => {
                statusIndicator.classList.remove('online', 'offline', 'away', 'busy');
                statusIndicator.classList.add(presenceData.status);
                
                setTimeout(() => {
                    statusIndicator.classList.remove('status-updating');
                }, 150);
            });
        });
    }
    
    // Update chat header presence
    updateChatHeaderPresence(userId, presenceData) {
        console.log(`📱 Socket: Updating chat header presence for ${userId}:`, presenceData);
        
        // Debug current state
        const hasChat = !!window.Chat;
        const hasConversation = !!(window.Chat && window.Chat.currentConversation);
        const recipientId = hasConversation ? window.Chat.getRecipientId() : null;
        
        console.log(`🔍 Socket DEBUG:`, {
            hasChat,
            hasConversation,
            recipientId,
            targetUserId: userId,
            isMatch: recipientId === userId,
            presenceStatus: presenceData.status
        });
        
        // Delegate to Chat manager if available and this is the active conversation
        if (window.Chat && window.Chat.currentConversation) {
            if (recipientId === userId) {
                console.log(`SUCCESS: Socket: Updating active conversation header for ${userId} - status: ${presenceData.status}`);
                // Use the vigichat-style instant status update
                window.Chat.updateConversationHeaderStatusInstant(presenceData);
            } else {
                console.log(`⚠️ Socket: User ${userId} not in active conversation (current: ${recipientId})`);
            }
        } else {
            console.log(`⚠️ Socket: No active conversation to update header for ${userId}`);
        }
    }
    
    // Handle typing indicators with automatic timeout
    handleUserTyping(userId, conversationId) {
        console.log(`TYPING User ${userId} is typing in ${conversationId}`);
        
        // Add to typing users
        if (!this.typingUsers.has(conversationId)) {
            this.typingUsers.set(conversationId, new Set());
        }
        this.typingUsers.get(conversationId).add(userId);
        
        // Clear existing timeout
        const timeoutKey = `${userId}-${conversationId}`;
        if (this.typingTimeouts.has(timeoutKey)) {
            clearTimeout(this.typingTimeouts.get(timeoutKey));
        }
        
        // Set new timeout (3 seconds - faster like vigichat)
        const timeout = setTimeout(() => {
            this.handleUserStoppedTyping(userId, conversationId);
        }, 3000);
        
        this.typingTimeouts.set(timeoutKey, timeout);
        
        // Notify UI
        if (window.Chat) {
            window.Chat.handleUserTyping({ userId, conversationId });
        }
    }
    
    handleUserStoppedTyping(userId, conversationId) {
        console.log(`TYPING User ${userId} stopped typing in ${conversationId}`);
        
        // Remove from typing users
        if (this.typingUsers.has(conversationId)) {
            this.typingUsers.get(conversationId).delete(userId);
            if (this.typingUsers.get(conversationId).size === 0) {
                this.typingUsers.delete(conversationId);
            }
        }
        
        // Clear timeout
        const timeoutKey = `${userId}-${conversationId}`;
        if (this.typingTimeouts.has(timeoutKey)) {
            clearTimeout(this.typingTimeouts.get(timeoutKey));
            this.typingTimeouts.delete(timeoutKey);
        }
        
        // Notify UI
        if (window.Chat) {
            window.Chat.handleUserStoppedTyping({ userId, conversationId });
        }
    }
    
    // Send typing indicator
    sendTypingIndicator(conversationId, isTyping = true) {
        if (!this.isConnected || !this.socket) return;
        
        const eventName = isTyping ? 'user-typing' : 'user-stopped-typing';
        const data = { conversationId, timestamp: Date.now() };
        
        console.log(`TYPING Sending typing indicator: ${eventName}`, data);
        this.socket.emit(eventName, data);
    }
    
    // PRESENCE RECOVERY AND OPTIMIZATION SYSTEM
    recoverPresenceState() {
        // Recover previous presence state from localStorage or determine current state
        const savedStatus = localStorage.getItem('userPresenceStatus');
        const wasRecentlyActive = this.wasRecentlyActive();
        
        let initialStatus = 'online';
        
        // Smart presence detection based on page state and previous status
        if (document.hidden) {
            initialStatus = 'away';
        } else if (savedStatus && wasRecentlyActive) {
            initialStatus = savedStatus;
        }
        
        console.log(`🔄 Recovering presence state: ${initialStatus}`);
        this.setUserPresence(initialStatus);
        
        // Request presence updates for all cached users to refresh stale data
        this.requestPresenceUpdates();
    }
    
    wasRecentlyActive() {
        const lastActivity = localStorage.getItem('lastActivity');
        if (!lastActivity) return false;
        
        const timeDiff = Date.now() - parseInt(lastActivity);
        return timeDiff < 30000; // 30 seconds
    }
    
    requestPresenceUpdates() {
        if (!this.isConnected || !this.socket) return;
        
        console.log('📡 Requesting presence updates for cached users');
        
        // Get all cached user IDs and request fresh presence data
        const cachedUserIds = Array.from(this.presenceCache.keys());
        if (cachedUserIds.length > 0) {
            this.socket.emit('request-presence-updates', { userIds: cachedUserIds }, (response) => {
                if (response?.success && response?.presenceData) {
                    console.log(`OK Received ${response.presenceData.length} presence updates`);
                    response.presenceData.forEach(update => {
                        this.updatePresenceCache(update.userId, {
                            status: update.status,
                            lastSeen: update.lastSeen
                        });
                    });
                }
            });
        }
    }
    
    // Enhanced presence setting with persistence
    setUserPresence(status) {
        if (this.userPresenceStatus === status) {
            return; // No change needed
        }
        
        const oldStatus = this.userPresenceStatus;
        this.userPresenceStatus = status;
        
        // Persist status to localStorage
        localStorage.setItem('userPresenceStatus', status);
        localStorage.setItem('lastActivity', Date.now().toString());
        
        console.log(`🔄 Presence changed: ${oldStatus} → ${status}`);
        
        // Update last seen timestamp
        if (status === 'offline' || status === 'away') {
            this.lastSeenTimestamp = Date.now();
            localStorage.setItem('lastSeenTimestamp', this.lastSeenTimestamp.toString());
        }
        
        // Immediately notify server of status change with retry mechanism
        this.sendPresenceUpdateWithRetry(status);
    }
    
    sendPresenceUpdateWithRetry(status, retryCount = 0) {
        if (!this.isConnected || !this.socket) {
            if (retryCount < 3) {
                console.log(`WARNING Not connected, will retry presence update in 1s (attempt ${retryCount + 1}/3)`);
                setTimeout(() => {
                    this.sendPresenceUpdateWithRetry(status, retryCount + 1);
                }, 1000);
            }
            return;
        }
        
        const presenceData = {
            status,
            timestamp: Date.now(),
            lastSeen: this.lastSeenTimestamp,
            quality: this.connectionQuality
        };
        
        console.log('🚀 Sending instant presence update with retry mechanism:', presenceData);
        this.socket.emit('presence-update', presenceData, (response) => {
            if (response?.success) {
                console.log('OK Presence update acknowledged by server');
            } else {
                console.log('WARNING Presence update failed, retrying...');
                if (retryCount < 2) {
                    setTimeout(() => {
                        this.sendPresenceUpdateWithRetry(status, retryCount + 1);
                    }, 500);
                }
            }
        });
    }
    
    // Batch presence updates for better performance
    batchUpdatePresence(updates) {
        if (!Array.isArray(updates) || updates.length === 0) return;
        
        console.log(`📦 Processing batch presence updates: ${updates.length} users`);
        
        // Group updates by status for efficient processing
        const statusGroups = {
            online: [],
            away: [],
            offline: []
        };
        
        updates.forEach(update => {
            const { userId, status, lastSeen } = update;
            if (statusGroups[status]) {
                statusGroups[status].push({ userId, lastSeen });
            }
            
            // Update cache immediately
            this.updatePresenceCache(userId, { status, lastSeen });
        });
        
        // Batch UI updates for better performance
        this.batchUIUpdates(statusGroups);
    }
    
    batchUIUpdates(statusGroups) {
        // Use requestAnimationFrame for smooth UI updates
        requestAnimationFrame(() => {
            Object.entries(statusGroups).forEach(([status, users]) => {
                if (users.length > 0) {
                    console.log(`🎨 Batch updating ${users.length} users to ${status}`);
                    users.forEach(({ userId, lastSeen }) => {
                        if (window.Chat) {
                            window.Chat.handlePresenceUpdate(userId, { status, lastSeen });
                        }
                    });
                }
            });
        });
    }
    
    // Enhanced heartbeat with connection quality monitoring
    sendPresenceHeartbeat() {
        if (!this.isConnected || !this.socket) {
            console.log('ERROR Cannot send presence heartbeat - not connected');
            return;
        }
        
        const heartbeatStart = Date.now();
        const heartbeatData = {
            status: this.userPresenceStatus,
            timestamp: heartbeatStart,
            lastActivity: this.lastActivity.getTime(),
            quality: this.connectionQuality,
            clientInfo: {
                userAgent: navigator.userAgent.substring(0, 100),
                platform: navigator.platform,
                language: navigator.language
            }
        };
        
        console.log('HEARTBEAT Sending enhanced presence heartbeat:', heartbeatData);
        this.socket.emit('presence-heartbeat', heartbeatData, (response) => {
            const heartbeatEnd = Date.now();
            const latency = heartbeatEnd - heartbeatStart;
            
            if (response?.success) {
                console.log(`OK Presence heartbeat acknowledged (${latency}ms latency)`);
                this.updateConnectionQuality(latency);
                
                // Update UI connection quality indicator
                if (window.Chat && window.Chat.updateConnectionQualityIndicator) {
                    window.Chat.updateConnectionQualityIndicator(this.connectionQuality, latency);
                }
                
                // Handle server-sent presence updates in response
                if (response.presenceUpdates && response.presenceUpdates.length > 0) {
                    this.batchUpdatePresence(response.presenceUpdates);
                }
                
                // Ensure current user always shows online when active
                if (window.Chat && typeof window.Chat.ensureCurrentUserOnlineDisplay === 'function') {
                    window.Chat.ensureCurrentUserOnlineDisplay();
                }
            } else {
                console.log('WARNING Presence heartbeat not acknowledged');
                this.handleHeartbeatFailure();
            }
        });
    }
    
    handleHeartbeatFailure() {
        console.log('💔 Heartbeat failed, checking connection...');
        
        // If heartbeat fails, check connection quality
        this.connectionQuality = 'poor';
        
        // Attempt to recover presence state
        setTimeout(() => {
            if (this.isConnected) {
                console.log('🔄 Attempting to recover presence state after heartbeat failure');
                this.recoverPresenceState();
            }
        }, 1000);
    }
    
    // Ultra-responsive typing like vigichat - reduced throttling
    sendTypingIndicatorThrottled(conversationId, isTyping = true) {
        const now = Date.now();
        const throttleKey = `${conversationId}-${isTyping}`;
        const lastSent = this.typingThrottleCache?.get(throttleKey) || 0;
        
        // More responsive throttling - vigichat-style
        const throttleMs = isTyping ? 300 : 100; // Faster for stopping, slower for starting
        
        if (now - lastSent < throttleMs) {
            console.log(`⌨️ Typing indicator throttled (${throttleMs}ms)`);
            return;
        }
        
        if (!this.typingThrottleCache) {
            this.typingThrottleCache = new Map();
        }
        
        this.typingThrottleCache.set(throttleKey, now);
        
        // Send with higher priority for immediate feedback
        if (isTyping) {
            console.log(`⌨️ SENDING typing indicator for ${conversationId}`);
        } else {
            console.log(`⌨️ STOPPING typing indicator for ${conversationId}`);
        }
        
        this.sendTypingIndicator(conversationId, isTyping);
        
        // Clean up old throttle entries more aggressively
        setTimeout(() => {
            this.typingThrottleCache.delete(throttleKey);
        }, 2000);
    }

    // Auto-mark sent messages to a user as delivered when they come online
    markMessagesToUserAsDelivered(userId) {
        if (!window.Chat) return;
        
        console.log(`Auto-marking messages to ${userId} as delivered (user came online)`);
        
        // Find all sent messages to this user in the current conversation
        const messageElements = document.querySelectorAll('.message.sent[data-status="sent"]');
        
        messageElements.forEach(messageEl => {
            const messageRecipient = messageEl.getAttribute('data-recipient');
            const messageId = messageEl.getAttribute('data-message-id');
            const clientId = messageEl.getAttribute('data-client-id');
            
            // Check if this message is for the user who came online
            if (messageRecipient === userId || 
                (window.Chat.currentConversation && 
                 window.Chat.currentConversation.participants && 
                 window.Chat.currentConversation.participants.includes(userId))) {
                
                console.log(`Marking message ${messageId || clientId} as delivered to ${userId}`);
                
                // Update message status to delivered
                if (window.Chat.updateMessageStatus) {
                    window.Chat.updateMessageStatus(messageEl, 'delivered', Date.now());
                }
                
                // Also update in socket status tracking
                if (clientId) {
                    this.updateMessageStatus(clientId, 'delivered', {
                        deliveredAt: Date.now()
                    });
                }
            }
        });
    }

    // Auto-mark delivered messages as read when user views conversation
    markMessagesAsReadWhenViewed() {
        if (!window.Chat || !window.Chat.currentConversation) return;
        
        // Find all delivered messages in current conversation
        const messageElements = document.querySelectorAll('.message.sent[data-status="delivered"]');
        
        messageElements.forEach(messageEl => {
            const messageId = messageEl.getAttribute('data-message-id');
            const clientId = messageEl.getAttribute('data-client-id');
            
            // Delay the read status to simulate realistic reading time
            setTimeout(() => {
                console.log(`Auto-marking message ${messageId || clientId} as read (conversation viewed)`);
                
                if (window.Chat.updateMessageStatus) {
                    window.Chat.updateMessageStatus(messageEl, 'read', Date.now());
                }
                
                if (clientId) {
                    this.updateMessageStatus(clientId, 'read', {
                        readAt: Date.now()
                    });
                }
            }, 1000 + Math.random() * 2000); // Random delay 1-3 seconds
        });
    }
}

// Create socket manager instance when Utils is available
const initSocketManager = () => {
    if (typeof Utils !== 'undefined') {
        window.SocketManager = new SocketManager();
    } else {
        setTimeout(initSocketManager, 10);
    }
};

initSocketManager();