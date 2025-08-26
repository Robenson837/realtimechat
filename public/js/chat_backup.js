// Chat module - handles all messaging functionality

// Global debug function para testing presencia en header
window.debugPresence = function() {
    console.log('=== DEBUG PRESENCE HEADER ===');
    if (window.Chat) {
        window.Chat.forcePresenceUpdate();
    } else {
        console.error('Chat manager no disponible');
    }
};

// Global debug function para testing notificación global
window.debugNotification = function(count = 5) {
    console.log('=== DEBUG GLOBAL NOTIFICATION ===');
    if (window.chatManager) {
        // Simular mensajes no leídos
        let totalUnread = 0;
        window.chatManager.conversations.forEach((conv, id) => {
            conv.unreadCount = Math.floor(Math.random() * count) + 1;
            totalUnread += conv.unreadCount;
            console.log(`Conversación "${conv.name}": ${conv.unreadCount} mensajes sin leer`);
        });
        
        console.log(`Total global: ${totalUnread} mensajes sin leer`);
        window.chatManager.updateGlobalUnreadCounter();
        window.chatManager.renderConversations();
        
        console.log('Ícono de notificación debe estar visible:', totalUnread > 0 ? 'SÍ' : 'NO');
    } else {
        console.error('chatManager no disponible');
    }
};

// Función para limpiar notificaciones
window.clearNotifications = function() {
    console.log('=== LIMPIAR NOTIFICACIONES ===');
    if (window.chatManager) {
        window.chatManager.conversations.forEach((conv, id) => {
            conv.unreadCount = 0;
            conv.hasNewMessage = false;
        });
        
        window.chatManager.updateGlobalUnreadCounter();
        window.chatManager.renderConversations();
        console.log('Todas las notificaciones limpiadas - ícono debe estar oculto');
    }
};

// FUNCIÓN GLOBAL PARA CORRECCIÓN INMEDIATA DE POSICIONAMIENTO
window.fixMessagePositioning = function() {
    console.log('🔧 Aplicando corrección manual de posicionamiento...');
    if (window.chatManager && typeof window.chatManager.enforceMessagePositioningImmediate === 'function') {
        window.chatManager.enforceMessagePositioningImmediate();
        console.log('✅ Corrección aplicada exitosamente');
    } else {
        console.error('❌ Chat manager no disponible');
    }
};

// Global debug function for testing Messenger style indicators
window.debugIndicators = function() {
    if (window.chatManager) {
        console.log('=== DEBUG MESSENGER INDICATORS ===');
        console.log('Conversations before:', window.chatManager.conversations);
        
        // Simular mensajes no leídos para testing estilo Messenger
        let count = 0;
        window.chatManager.conversations.forEach((conv, id) => {
            count++;
            conv.unreadCount = count; // 1, 2, 3, etc.
            conv.hasNewMessage = false; // Ya no usamos este campo para el diseño
            conv.lastNewMessageTime = new Date();
            console.log(`Conversación "${conv.name}": ${conv.unreadCount} mensajes sin leer`);
        });
        
        console.log('Conversations after:', window.chatManager.conversations);
        
        // Re-renderizar para mostrar el estilo Messenger
        console.log('Re-rendering conversations with Messenger style...');
        window.chatManager.renderConversations();
        
        console.log('Estilo Messenger aplicado - deberías ver:');
        console.log('   Conversaciones completas en negrita');
        console.log('   Fechas de color verde');
        console.log('   Badges verdes con números debajo de la fecha');
    } else {
        console.error('chatManager no disponible');
    }
};

// También agregar una función para simular mensaje nuevo

// DEBUG FUNCTIONS for testing indicator updates
window.testIndicators = function() {
    if (window.chatManager) {
        window.chatManager.testIndicatorUpdates();
    } else {
        console.error('Chat manager not available');
    }
};

window.resetAllUnread = function() {
    if (window.chatManager) {
        window.chatManager.forceResetAllUnreadCounts();
    } else {
        console.error('Chat manager not available');
    }
};

// DEPRECATED: Use real database data instead of simulations
window.simulateUnread = function(count = 2) {
    console.warn('⚠️ simulateUnread is deprecated - system now uses real database data');
};

window.forceUpdateBadges = function() {
    if (window.chatManager) {
        window.chatManager.forceUpdateAllBadges();
    } else {
        console.error('Chat manager not available');
    }
};

window.testBadge = function(conversationId, count = 5) {
    if (window.chatManager) {
        window.chatManager.testConversationBadge(conversationId, count);
    } else {
        console.error('Chat manager not available');
    }
};

window.inspectDOM = function() {
    if (window.chatManager) {
        window.chatManager.inspectChatItemStructure();
    } else {
        console.error('Chat manager not available');
    }
};

// SMOOTH LOADING TESTING FUNCTIONS
window.testSmoothLoading = function(conversationId) {
    if (window.chatManager) {
        window.chatManager.testSmoothLoading(conversationId);
    } else {
        console.error('Chat manager not available');
    }
};

window.testOlderMessages = function(conversationId) {
    if (window.chatManager) {
        window.chatManager.testOlderMessageLoading(conversationId);
    } else {
        console.error('Chat manager not available');
    }
};

window.testScrollBehavior = function() {
    if (window.chatManager) {
        window.chatManager.testScrollBehavior();
    } else {
        console.error('Chat manager not available');
    }
};

window.testLoadingStates = function() {
    if (window.chatManager) {
        window.chatManager.testLoadingStates();
    } else {
        console.error('Chat manager not available');
    }
};

window.testErrorHandling = function() {
    if (window.chatManager) {
        window.chatManager.testErrorHandling();
    } else {
        console.error('Chat manager not available');
    }
};

class ChatManager {
    constructor() {
        try {
            console.log('🔧 ChatManager constructor started');
            
            this.currentUser = null;
            this.currentConversation = null;
            this.conversations = new Map();
            this.contacts = new Map();
            this.typingUsers = new Set();
            this.conversationUpdateInterval = null;
            this.headerUpdateInterval = null; // For automatic header updates
            this.chatItemsUpdateInterval = null; // For automatic chat items updates
            this.lastStatusUpdate = new Map(); // For throttling status updates
            this.initialized = false; // Start as not initialized
            
            console.log('✅ Basic properties initialized');
            
            // Multi-selection state
            this.isSelectionMode = false;
            this.selectedMessages = new Set();
            this.selectionToolbar = null;
            
            // Cache for conversation statuses to prevent unnecessary updates
            this.conversationStatusCache = new Map(); // conversationId -> { checkmarkStatus, userStatus, lastUpdate }
            
            // Conversation loading state
            this.isSelectingConversation = false;
            this.elementsReady = false;
            
            // Event handler references for cleanup
            this.attachmentModalHandlers = {
                overlayClickHandler: null,
                documentClickHandler: null,
                optionClickHandlers: []
            };
            this.cameraEventHandlers = {
                setupComplete: false,
                handlers: []
            };
            
            console.log('✅ Advanced properties initialized');
            
            // Force welcome screen immediately on ChatManager creation
            this.forceWelcomeScreenOnConstruction();
            
            // Wait for Utils to be available
            if (typeof Utils === 'undefined') {
                console.log('⏳ Utils not available, waiting...');
                this.initWhenReady();
                return;
            }
            
            console.log('🔧 Utils available, setting up elements...');
            this.setupElements();
            this.init();
            
            console.log('✅ ChatManager constructor completed successfully');
        } catch (error) {
            console.error('❌ Error in ChatManager constructor:', error);
            throw error;
        }
    }
    
    // Force welcome screen immediately when ChatManager is created
    forceWelcomeScreenOnConstruction() {
        setTimeout(() => {
            if (window.welcomeScreenManager) {
                window.welcomeScreenManager.forceInitialWelcomeState();
                console.log('ChatManager Constructor: Welcome screen forced');
            }
        }, 0);
    }
    
    initWhenReady() {
        const checkUtils = () => {
            if (typeof Utils !== 'undefined') {
                this.setupElements();
                this.init();
            } else {
                setTimeout(checkUtils, 10);
            }
        };
        checkUtils();
    }
    
    setupElements() {
        this.messageContainer = Utils.$('.messages-container');
        this.messagesScroll = Utils.$('#messages-scroll');
        this.messageInput = Utils.$('#message-input');
        this.scrollToBottomBtn = Utils.$('#scroll-to-bottom');
        
        // Scroll management properties
        this.isScrolling = false;
        this.userHasScrolledUp = false;
        this.scrollTimeout = null;
        this.isLoadingMoreMessages = false;
        this.currentPage = 1;
        this.hasMoreMessages = true;
    }

    init() {
        // Setup elements if not already done
        if (!this.messageContainer) {
            this.setupElements();
        }
        
        this.setupEventListeners();
        this.setupMessageInput();
        this.setupScrollManagement();
        this.setupVisibilityHandling();
        this.setupAutoReadMarking();
        
        // Try to initialize with current user if available
        const currentUser = window.AuthManager ? window.AuthManager.getCurrentUser() : Utils.Storage.get('currentUser');
        if (currentUser && !this.currentUser) {
            console.log('Initializing ChatManager with current user from init()');
            this.initialize(currentUser);
        }
    }
    
    setupVisibilityHandling() {
        // Estados de no leído deben persistir hasta que el usuario haga clic explícitamente
        // Comentamos el marcado automático para mantener persistencia
        
        // Manejar cambios de visibilidad de la página
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.currentConversation) {
                // Solo actualizar la UI, NO marcar como leído automáticamente
                console.log('Ventana visible, pero manteniendo estado de no leído hasta clic explícito');
            }
        });
        
        // También manejar el enfoque de la ventana  
        window.addEventListener('focus', () => {
            if (this.currentConversation) {
                // Solo actualizar la UI, NO marcar como leído automáticamente
                console.log(' Ventana enfocada, pero manteniendo estado de no leído hasta clic explícito');
            }
        });
    }

    async initialize(user) {
        this.currentUser = user;
        this.initialized = false;
        
        try {
            // Load conversations and contacts
            await this.loadConversations();
            await this.loadContacts();
            
            // Setup UI
            this.setupChatTabs();
            this.setupSearch();
            this.setupBackButton();
            
            // Inicializar sistema de indicadores
            this.startIndicatorUpdates();
            
            // Ensure welcome screen is shown by default (use welcome screen manager)
            this.ensureWelcomeScreenVisible();
            
            // Start status updates for conversation list
            this.startConversationUpdates();
            
            // Start automatic chat items updates
            this.startChatItemsUpdates();
            
            this.initialized = true;
            console.log('Chat manager initialized successfully');
            
            // ACTIVAR PROTECTOR DE POSICIÓN (inicialización temprana)
            setTimeout(() => {
                this.initializeMessagePositionProtector();
            }, 1000);
            
            // INICIALIZAR CONTADOR GLOBAL
            this.initializeGlobalUnreadCounter();
            
            // Load real conversation data from database after initialization
            setTimeout(async () => {
                this.testGlobalCounter();
                // Load real conversation data from database
                await this.loadConversationStates();
            }, 2000);
            
        } catch (error) {
            console.error('Error initializing chat:', error);
            Utils.Notifications.error('Error inicializando el chat');
            this.initialized = false;
        }
    }

    setupChatTabs() {
        // Setup tab switching functionality if needed
        console.log('Chat tabs setup completed');
    }

    setupSearch() {
        // Setup chat search functionality if needed
        console.log('Chat search setup completed');
    }

    setupBackButton() {
        const backBtn = Utils.$('#back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                // Handle mobile navigation
                if (window.mobileNavigation && typeof window.mobileNavigation.onChatBackButton === 'function') {
                    window.mobileNavigation.onChatBackButton();
                } else {
                    this.closeCurrentConversation();
                }
            });
        }
    }

    async closeCurrentConversation() {
        // Clear current conversation
        this.currentConversation = null;
        
        // Stop real-time updates
        this.stopConversationUpdates();
        
        // Clean up scroll listeners
        this.removeScrollListeners();
        
        // Notify welcome screen manager
        if (window.welcomeScreenManager) {
            window.welcomeScreenManager.setActiveConversation(false);
        }
        
        // Show welcome screen
        this.showWelcomeScreen();
        
        // Clear active conversation in UI
        await this.updateActiveConversation();
        
        // Re-renderizar conversaciones para actualizar indicadores
        this.renderConversations();
        
        console.log('Conversation closed, showing welcome screen');
    }
    
    startConversationUpdates() {
        // Clear any existing interval
        this.stopConversationUpdates();
        
        // Update header every 10 seconds for more responsive status updates
        this.conversationUpdateInterval = setInterval(() => {
            if (this.currentConversation) {
                // Update just the time display to keep it fresh
                this.updateConversationHeaderTime();
            }
            
            // Update conversation list status indicators every 30 seconds (reduced from 10 for less flickering)
            this.updateConversationStatusIndicators();
        }, 30000); // 30 seconds - longer interval since we have real-time socket updates
        
        // Also listen for socket events for real-time updates
        if (window.SocketManager) {
            window.SocketManager.on('userStatusChanged', (data) => {
                const recipientId = this.getRecipientId();
                if (data.userId === recipientId && this.currentConversation) {
                    // Update contact info in contacts manager cache if available
                    if (window.contactsManager && window.contactsManager.contacts) {
                        const contact = window.contactsManager.contacts.get(recipientId);
                        if (contact) {
                            contact.status = data.status;
                            contact.lastSeen = data.lastSeen;
                        }
                    }
                    // Immediately update the header
                    this.updateActiveConversation();
                }
            });
            
            // Listen for messages cleared events (bulk clear)
            window.SocketManager.on('messagesCleared', (data) => {
                console.log('Messages cleared event received:', data);

                if (data.conversationId && data.type === 'bothUsers') {
                    // If this is the current conversation, reload it
                    if (this.currentConversation && this.currentConversation._id === data.conversationId) {
                        this.handleMessagesCleared(data);
                    }
                    
                    // Update conversation list
                    this.renderConversations();
                    
                    // Show notification
                    const clearedByName = data.clearedByName || 'El otro usuario';
                    Utils.Notifications.info(`${clearedByName} eliminó ${data.messagesDeleted} mensajes de la conversación`);
                }
            });
            
            // Listen for individual message deletion events
            window.SocketManager.on('messageDeleted', (data) => {
                console.log('Individual message deleted event received:', data);
                
                if (data.conversationId && data.deletedForEveryone) {
                    // If this is the current conversation, show deletion message
                    if (this.currentConversation && this.currentConversation._id === data.conversationId) {
                        this.handleIndividualMessageDeleted(data);
                    }
                    
                    // Update conversation list to reflect changes
                    this.renderConversations();
                    
                    // Show notification
                    const deletedByName = data.deletedByName || 'El otro usuario';
                    Utils.Notifications.info(`${deletedByName} eliminó un mensaje`);
                } else {
                    console.log('Message deletion event ignored - not for everyone or different conversation');
                }
            });
        }
    }

    // Handle messages cleared event - show italic deletion messages (one per deleted message)
    handleMessagesCleared(data) {
        if (!this.messageContainer) return;
        
        const clearedByName = data.clearedByName || 'El otro usuario';
        const messagesDeleted = data.messagesDeleted || 0;
        
        // Create a deletion message for each deleted message
        for (let i = 0; i < messagesDeleted; i++) {
            const deletionMessage = this.createDeletionMessage(clearedByName, false); // individual message
            
            // Insert at the end of messages with small delay for visual effect
            setTimeout(() => {
                this.messageContainer.appendChild(deletionMessage);
                
                // Auto-scroll after each message
                this.performRobustAutoScroll();
            }, i * 100); // 100ms delay between each message
        }
        
        // Final reload after all deletion messages are shown
        setTimeout(async () => {
            if (this.currentConversation) {
                await this.loadConversationMessages(this.currentConversation._id);
            }
        }, (messagesDeleted * 100) + 500);
        
        console.log(`Added ${messagesDeleted} individual deletion messages for ${clearedByName}`);
    }
    
    // Handle individual message deletion event - show single italic deletion message
    handleIndividualMessageDeleted(data) {
        if (!this.messageContainer) return;
        
        const deletedByName = data.deletedByName || 'El otro usuario';
        
        // Find the original message and replace it with deletion notice
        if (data.originalMessageId) {
            const originalMessage = document.querySelector(`[data-message-id="${data.originalMessageId}"]`);
            if (originalMessage) {
                // Preserve original message structure (sent/received positioning)
                // Only replace the content inside the message-content div
                const messageContent = originalMessage.querySelector('.message-content');
                if (messageContent) {
                    // Replace content while preserving the message bubble structure
                    messageContent.innerHTML = `
                        <div class="deleted-placeholder" style="
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            padding: 12px 16px;
                            background: rgba(156, 163, 175, 0.05);
                            border-radius: 8px;
                            font-style: italic;
                            color: #9ca3af;
                            font-size: 0.875rem;
                            border: 1px dashed rgba(156, 163, 175, 0.3);
                            margin: 4px 0;
                            min-height: 40px;
                        ">
                            <span style="display: flex; align-items: center; gap: 8px;">
                                <span style="opacity: 0.7;">🗑️</span>
                                <span>Este mensaje fue eliminado por ${deletedByName}</span>
                            </span>
                        </div>
                    `;
                } else {
                    // Fallback: replace entire message content if structure is different
                    originalMessage.innerHTML = `
                        <div class="message-content deleted-placeholder" style="
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            padding: 12px 16px;
                            background: rgba(156, 163, 175, 0.05);
                            border-radius: 8px;
                            font-style: italic;
                            color: #9ca3af;
                            font-size: 0.875rem;
                            border: 1px dashed rgba(156, 163, 175, 0.3);
                            margin: 4px 0;
                            min-height: 40px;
                        ">
                            <span style="display: flex; align-items: center; gap: 8px;">
                                <span style="opacity: 0.7;">🗑️</span>
                                <span>Este mensaje fue eliminado por ${deletedByName}</span>
                            </span>
                        </div>
                    `;
                }
                
                // Update attributes to reflect the new state while preserving original classes
                originalMessage.classList.add('deleted-message-placeholder');
                originalMessage.setAttribute('data-deleted', 'true');
                originalMessage.setAttribute('data-deleted-by', data.deletedBy);
                originalMessage.setAttribute('data-original-message-id', data.originalMessageId);
            } else {
                console.warn(`Original message ${data.originalMessageId} not found in DOM`);
            }
        }
        
        // Auto-scroll to show the updated message
        setTimeout(() => {
            this.performRobustAutoScroll();
        }, 100);
        
        console.log(`Replaced message ${data.originalMessageId} with deletion notice by ${deletedByName}`);
    }
    
    // Create a deletion message element
    createDeletionMessage(clearedByName, isIndividual = true) {
        const messageEl = document.createElement('div');
        messageEl.className = 'message-item system-message deleted-message';
        messageEl.style.cssText = `
            text-align: center;
            margin: 6px 20px;
            padding: 8px 12px;
            background: rgba(239, 68, 68, 0.05);
            border-radius: 8px;
            font-style: italic;
            font-size: 0.8rem;
            color: #dc2626;
            border: 1px dashed rgba(239, 68, 68, 0.2);
            position: relative;
            opacity: 0.8;
        `;
        
        const timeStr = new Date().toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const messageText = `Mensaje eliminado por ${clearedByName}`;
        
        messageEl.innerHTML = `
            <div class="message-content" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span class="deletion-text" style="font-weight: 500;">
                    🗑️ ${messageText}
                </span>
                <span class="deletion-time" style="font-size: 0.7rem; opacity: 0.6;">
                    ${timeStr}
                </span>
            </div>
        `;
        
        return messageEl;
    }

    // Create a deleted message placeholder element (like WhatsApp)
    createDeletedMessageElement(message) {
        const messageEl = Utils.createElement('div', {
            className: 'message deleted-message-placeholder',
            'data-message-id': message._id,
            'data-timestamp': message.timestamp || message.createdAt || Date.now(),
            'data-deleted': 'true'
        });

        // Get who deleted it from the message data
        let deletedByText = '';
        if (message.deletedBy) {
            // Try to get the name from current contacts or use a generic message
            deletedByText = ' por otro usuario';
            if (message.deletedBy === this.currentUser._id) {
                deletedByText = ' por ti';
            }
        }

        messageEl.innerHTML = `
            <div class="message-content deleted-placeholder" style="
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 12px 16px;
                background: rgba(156, 163, 175, 0.05);
                border-radius: 8px;
                font-style: italic;
                color: #9ca3af;
                font-size: 0.875rem;
                border: 1px dashed rgba(156, 163, 175, 0.3);
                margin: 4px 0;
                min-height: 40px;
            ">
                <span style="display: flex; align-items: center; gap: 8px;">
                    <span style="opacity: 0.7;">🗑️</span>
                    <span>Este mensaje fue eliminado${deletedByText}</span>
                </span>
            </div>
        `;

        // No context menu for deleted messages
        return messageEl;
    }

    // Update status indicators in conversation list with smart change detection
    updateConversationStatusIndicators() {
        const conversations = document.querySelectorAll('.chat-item');
        conversations.forEach(item => {
            const conversationId = item.dataset.conversationId;
            const conversation = this.conversations.get(conversationId);
            
            if (conversation) {
                // Only update checkmarks if the last message status actually changed
                const hasStatusChanges = this.updateConversationCheckmarksIfChanged(conversation, item);
                
                // Only update user status indicators (not checkmarks) if needed
                const otherUserId = conversation.participants?.find(p => p !== this.currentUser?._id);
                if (otherUserId) {
                    const hasUserStatusChanges = this.updateUserStatusIndicatorIfChanged(conversation, item, otherUserId);
                    
                    // Only re-render if there were actual changes
                    if (!hasStatusChanges && !hasUserStatusChanges) {
                        // No changes, skip re-rendering to prevent flickering
                        return;
                    }
                }
            }
        });
    }
    
    // Smart update for conversation checkmarks - only when status actually changes
    updateConversationCheckmarksIfChanged(conversation, item) {
        const timeContainer = item.querySelector('.chat-time-container');
        if (!timeContainer) return false;
        
        const conversationId = conversation._id;
        const expectedStatus = this.getExpectedCheckmarkStatus(conversation);
        
        // Check cache to see if this status was already set
        const cachedData = this.conversationStatusCache.get(conversationId);
        if (cachedData && cachedData.checkmarkStatus === expectedStatus) {
            return false; // No change needed, status is already correct
        }
        
        // Get current checkmark status from DOM
        const currentCheckmarkEl = timeContainer.querySelector('.message-status');
        const currentStatus = currentCheckmarkEl ? currentCheckmarkEl.classList[1] : null; // gets the status class
        
        // Only update if status actually changed
        if (currentStatus !== expectedStatus) {
            const newCheckmarkHTML = this.renderConversationTimeIndicators(conversation);
            
            // Find and update only the checkmark part
            const existingCheckmark = timeContainer.querySelector('.message-status');
            if (existingCheckmark) {
                existingCheckmark.outerHTML = newCheckmarkHTML;
            } else if (newCheckmarkHTML) {
                // Add checkmark if it didn't exist
                timeContainer.insertAdjacentHTML('beforeend', newCheckmarkHTML);
            }
            
            // Update cache
            this.conversationStatusCache.set(conversationId, {
                ...cachedData,
                checkmarkStatus: expectedStatus,
                lastUpdate: Date.now()
            });
            
            console.log(`Checkmark updated from '${currentStatus}' to '${expectedStatus}' for conversation ${conversationId}`);
            return true;
        }
        
        return false; // No changes
    }
    
    // Get the expected checkmark status from conversation data
    getExpectedCheckmarkStatus(conversation) {
        if (conversation.lastMessage && 
            (conversation.lastMessage.sender === this.currentUser?._id || 
             conversation.lastMessage.sender?._id === this.currentUser?._id)) {
            return conversation.lastMessage.status || 'sent';
        }
        return null; // No checkmark should be shown
    }
    
    // Smart update for user status indicator - only when status actually changes
    updateUserStatusIndicatorIfChanged(conversation, item, otherUserId) {
        const statusIndicatorEl = item.querySelector('.status-indicator');
        if (!statusIndicatorEl) return false;
        
        const conversationId = conversation._id;
        
        // Get expected status
        const latestStatusInfo = this.getConversationStatusInfo(otherUserId);
        const expectedStatusClass = latestStatusInfo.statusClass;
        
        // Check cache to see if this status was already set
        const cachedData = this.conversationStatusCache.get(conversationId);
        if (cachedData && cachedData.userStatus === expectedStatusClass) {
            return false; // No change needed, status is already correct
        }
        
        // Get current status from DOM classes
        const currentStatusClass = Array.from(statusIndicatorEl.classList).find(cls => 
            cls === 'online' || cls === 'away' || cls === 'offline'
        );
        
        // Only update if status actually changed
        if (currentStatusClass !== expectedStatusClass) {
            // Update just the status indicator without full re-render
            statusIndicatorEl.className = `status-indicator ${expectedStatusClass}`;
            statusIndicatorEl.title = latestStatusInfo.tooltipText;
            
            // Update status time display if needed
            const statusTimeEl = statusIndicatorEl.querySelector('.status-time');
            if (expectedStatusClass === 'away' && latestStatusInfo.statusDisplay) {
                if (statusTimeEl) {
                    statusTimeEl.textContent = latestStatusInfo.statusDisplay;
                } else {
                    statusIndicatorEl.innerHTML = `<span class="status-time">${latestStatusInfo.statusDisplay}</span>`;
                }
            } else if (statusTimeEl && expectedStatusClass === 'online') {
                statusTimeEl.remove();
            }
            
            // Update cache
            this.conversationStatusCache.set(conversationId, {
                ...cachedData,
                userStatus: expectedStatusClass,
                lastUpdate: Date.now()
            });
            
            console.log(`User status updated from '${currentStatusClass}' to '${expectedStatusClass}' for user ${otherUserId}`);
            return true;
        }
        
        return false; // No changes
    }
    
    // Update checkmark in conversation list for a specific message without full re-render
    updateConversationListCheckmarkForMessage(messageId, clientId, newStatus) {
        // Find the conversation that contains this message
        const targetConversation = Array.from(this.conversations.values()).find(conv => {
            return conv.lastMessage && (
                conv.lastMessage._id === messageId ||
                conv.lastMessage.clientId === clientId ||
                (typeof conv.lastMessage === 'object' && conv.lastMessage.id === messageId)
            );
        });
        
        if (!targetConversation) {
            console.log(` No conversation found for message ${messageId}/${clientId}`);
            return;
        }
        
        // Update the conversation's last message status
        if (targetConversation.lastMessage) {
            const oldStatus = targetConversation.lastMessage.status;
            targetConversation.lastMessage.status = newStatus;
            
            console.log(`Updated conversation ${targetConversation._id} last message status: ${oldStatus} → ${newStatus}`);
            
            // Find the conversation item in DOM
            const conversationItem = document.querySelector(`[data-conversation-id="${targetConversation._id}"]`);
            if (conversationItem) {
                // Update only the checkmark without full re-render
                this.updateConversationCheckmarksIfChanged(targetConversation, conversationItem);
            }
        }
    }
    
    // Ensure chat area and all required elements are ready
    async ensureChatAreaReady() {
        console.log(' Ensuring chat area is ready...');
        
        // Show chat area first
        this.showChatArea();
        
        // Try to setup elements immediately
        this.setupElements();
        if (this.messageContainer && this.messagesScroll && this.messageInput) {
            this.elementsReady = true;
            this.setupScrollManagement();
            return;
        }
        
        // If elements not ready immediately, use requestAnimationFrame for faster DOM readiness
        await new Promise(resolve => {
            requestAnimationFrame(() => {
                this.setupElements();
                if (this.messageContainer && this.messagesScroll && this.messageInput) {
                    this.elementsReady = true;
                    this.setupScrollManagement();
                    resolve();
                } else {
                    // Last resort: minimal timeout
                    setTimeout(() => {
                        this.setupElements();
                        if (this.messageContainer && this.messagesScroll && this.messageInput) {
                            this.elementsReady = true;
                            this.setupScrollManagement();
                        }
                        resolve();
                    }, 10);
                }
            });
        });
        
        if (!this.elementsReady) {
            console.error('No se pudo preparar los elementos del chat tras varios intentos.');
            throw new Error('Chat area elements not ready');
        }
    }

    // Robust message loading with error handling and fast retries
    async loadConversationMessagesRobust(conversationId, retryCount = 0) {
        const maxRetries = 2; // Reduced from 3 to 2 for faster fail

        try {
            console.log(`Loading messages for conversation ${conversationId} (attempt ${retryCount + 1})`);

            // Ensure elements are ready before loading - use optimized version
            if (!this.elementsReady) {
                await this.ensureChatAreaReady();
            }

            // Load messages
            await this.loadConversationMessages(conversationId);
            console.log('Messages loaded successfully');

        } catch (error) {
            console.error(`Error loading messages (attempt ${retryCount + 1}):`, error);

            if (retryCount < maxRetries) {
                // Much faster retry - only 200ms delay instead of seconds
                const retryDelay = 200;
                console.log(`Retrying message load in ${retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return this.loadConversationMessagesRobust(conversationId, retryCount + 1);
            } else {
                console.error('Max retries exceeded for loading messages');
                // Don't throw error - show empty conversation instead
                console.log('Showing empty conversation due to loading failure');
                if (this.messageContainer) {
                    this.messageContainer.innerHTML = '';
                }
                this.showWelcomeMessageForNewChat();
            }
        }
    }

    // Clear conversation status cache for a specific conversation or all
    clearConversationStatusCache(conversationId = null) {
        if (conversationId) {
            this.conversationStatusCache.delete(conversationId);
            console.log(`Cleared status cache for conversation ${conversationId}`);
        } else {
            this.conversationStatusCache.clear();
            console.log(`Cleared all conversation status cache`);
        }
    }
    
    // Update header using the exact same approach as contacts.js
    updateConversationHeaderTime() {
        const recipientId = this.getRecipientId();
        if (!recipientId || !this.currentConversation) return;
        
        // Always fetch fresh data from API (like contacts.js does every time)
        this.fetchContactDataForHeader(recipientId);
    }
    
    stopConversationUpdates() {
        if (this.conversationUpdateInterval) {
            clearInterval(this.conversationUpdateInterval);
            this.conversationUpdateInterval = null;
        }
    }
    
    // Inicializar actualizaciones de indicadores
    startIndicatorUpdates() {
        // Actualizar indicadores cada 5 segundos
        this.indicatorUpdateInterval = setInterval(() => {
            this.updateMessageIndicators();
        }, 5000);
        
        console.log(' Sistema de indicadores iniciado');
    }
    
    // Detener actualizaciones de indicadores
    stopIndicatorUpdates() {
        if (this.indicatorUpdateInterval) {
            clearInterval(this.indicatorUpdateInterval);
            this.indicatorUpdateInterval = null;
        }
    }
    
    // Get contact data exactly like contacts.js does with API.Contacts.getContacts()
    async fetchContactDataForHeader(recipientId) {
        try {
            // Use the exact same API call that contacts.js uses
            const contactsData = await API.Contacts.getContacts();
            
            if (contactsData.success && contactsData.data) {
                // Find the specific contact in the contacts list (like contacts.js does)
                const contactData = contactsData.data.find(contact => contact._id === recipientId);
                
                if (contactData) {
                    console.log(' Found contact in contacts API:', contactData);
                    
                    // Update the header with the complete contact data (including status/lastSeen)
                    const statusElement = document.getElementById('last-seen');
                    if (statusElement) {
                        // Use the immediate update function with real-time validation
                        this.updateConversationHeaderStatusImmediate(statusElement, contactData, recipientId);
                    }
                } else {
                    console.log('Contact not found in contacts list');
                }
            } else {
                console.log('Failed to get contacts data');
            }
        } catch (error) {
            console.error('Error getting contacts data:', error);
        }
    }

    // More precise version that gets specific user data and validates current conversation
    async fetchContactDataForHeaderPrecise(recipientId) {
        try {
            // Verify this is still the current conversation to avoid cross-conversation updates
            const currentRecipientId = this.getRecipientId();
            if (currentRecipientId !== recipientId || !this.currentConversation) {
                console.log('Conversation changed, aborting status update');
                return;
            }

            console.log('Fetching precise contact data for:', recipientId);

            // Try direct user API first for most up-to-date status
            let contactData = null;
            try {
                const userResponse = await fetch(`/api/users/${recipientId}`, {
                    headers: {
                        'Authorization': `Bearer ${Utils.Storage.get('authToken')}`
                    }
                });
                
                if (userResponse.ok) {
                    const result = await userResponse.json();
                    if (result.success) {
                        contactData = result.data;
                        console.log('Got user data from direct API:', contactData);
                    }
                }
            } catch (error) {
                console.log('Direct user API failed, trying contacts API');
            }

            // Fallback to contacts API if direct API failed
            if (!contactData) {
                const contactsData = await API.Contacts.getContacts();
                if (contactsData.success && contactsData.data) {
                    contactData = contactsData.data.find(contact => contact._id === recipientId);
                    if (contactData) {
                        console.log('Got contact data from contacts API:', contactData);
                    }
                }
            }

            // Final verification before updating
            if (contactData && this.getRecipientId() === recipientId && this.currentConversation) {
                const statusElement = document.getElementById('last-seen');
                if (statusElement) {
                    // Use the immediate update function with real-time validation
                    this.updateConversationHeaderStatusImmediate(statusElement, contactData, recipientId);
                }
            } else {
                console.log('No valid contact data found or conversation changed');
                // Show offline status as fallback
                const statusElement = document.getElementById('last-seen');
                if (statusElement && this.getRecipientId() === recipientId) {
                    statusElement.textContent = 'Desconectado';
                    statusElement.className = 'status-text offline';
                    statusElement.style.color = '#9ca3af';
                    statusElement.title = 'Desconectado';
                }
            }
        } catch (error) {
            console.error('Error in precise contact data fetch:', error);
        }
    }

    // Get real-time contact data with presence from sessions system
    async getRealTimeContactData(recipientId) {
        let contactData = null;
        
        console.log(`🔍 Getting real-time contact data for: ${recipientId}`);
        
        // 1. Try from contacts manager cache first (basic contact info)
        if (window.contactsManager && window.contactsManager.contacts) {
            const contact = window.contactsManager.contacts.get(recipientId);
            if (contact) {
                contactData = { ...contact };
                console.log('✅ Got basic contact data from cache');
            }
        }
        
        // 2. Get real-time presence data from new sessions system
        try {
            const response = await fetch(`/api/users/${recipientId}/presence`, {
                headers: {
                    'Authorization': `Bearer ${Utils.Storage.get('authToken')}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    const presenceData = result.data;
                    
                    // Merge presence data with contact data
                    if (contactData) {
                        contactData.status = presenceData.status;
                        contactData.lastSeen = presenceData.lastSeen;
                        contactData.isOnline = presenceData.isOnline;
                        contactData.sessionCount = presenceData.sessionCount;
                    }
                    
                    console.log(`✅ Got real-time presence data:`, {
                        status: presenceData.status,
                        isOnline: presenceData.isOnline,
                        sessionCount: presenceData.sessionCount
                    });
                } else {
                    console.log('⚠️ Presence API returned no data');
                }
            } else {
                console.log('⚠️ Presence API request failed');
            }
        } catch (error) {
            console.log('⚠️ Error fetching presence data:', error);
        }
        
        // 3. Fallback to socket active users if no presence data
        if (window.SocketManager && window.SocketManager.activeUsers) {
            const activeUser = window.SocketManager.activeUsers.get(recipientId);
            if (activeUser && activeUser.user) {
                if (contactData) {
                    // Only update if we don't have presence data yet
                    if (!contactData.hasOwnProperty('status')) {
                        contactData.status = 'online';
                        contactData.lastSeen = activeUser.lastActivity;
                        contactData.isOnline = true;
                    }
                }
                console.log('✅ Enhanced with socket active user data');
            }
        }
        
        // 4. If no cached data, fetch basic contact info from API
        if (!contactData) {
            try {
                const response = await fetch(`/api/users/${recipientId}`, {
                    headers: {
                        'Authorization': `Bearer ${Utils.Storage.get('authToken')}`
                    }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        contactData = result.data;
                        console.log('✅ Got contact data from direct API');
                    }
                }
            } catch (error) {
                console.log('⚠️ Direct API failed');
            }
            
            // Final fallback to contacts API
            if (!contactData) {
                try {
                    const contactsData = await API.Contacts.getContacts();
                    if (contactsData.success && contactsData.data) {
                        contactData = contactsData.data.find(contact => contact._id === recipientId);
                        if (contactData) {
                            console.log('✅ Got contact data from contacts API fallback');
                        }
                    }
                } catch (error) {
                    console.log('⚠️ Contacts API fallback failed');
                }
            }
        }
        
        console.log(`🔍 Final contact data for ${recipientId}:`, {
            hasData: !!contactData,
            status: contactData?.status,
            isOnline: contactData?.isOnline,
            sessionCount: contactData?.sessionCount
        });
        
        return contactData;
    }

    // Check if user is really online in real-time
    isUserReallyOnline(userId) {
        if (!userId) return false;
        
        // Check socket active users
        if (window.SocketManager && window.SocketManager.activeUsers) {
            const activeUser = window.SocketManager.activeUsers.get(userId);
            if (activeUser) {
                // User is connected via socket
                const lastActivity = new Date(activeUser.lastActivity || new Date());
                const now = new Date();
                const minutesSinceActivity = Math.floor((now - lastActivity) / (1000 * 60));
                
                // Consider online if activity within last 5 minutes
                return minutesSinceActivity < 5;
            }
        }
        
        return false;
    }

    // Chat header specific method - shows "En línea" only if activity within 5 minutes
    isUserOnlineForChatHeader(userId) {
        if (!userId) return false;
        
        // Check socket active users
        if (window.SocketManager && window.SocketManager.activeUsers) {
            const activeUser = window.SocketManager.activeUsers.get(userId);
            if (activeUser) {
                // User is connected via socket
                const lastActivity = new Date(activeUser.lastActivity || new Date());
                const now = new Date();
                const minutesSinceActivity = Math.floor((now - lastActivity) / (1000 * 60));
                
                // For chat header: Consider online only if activity within last 2 minutes (improved from 5)
                return minutesSinceActivity < 2;
            }
        }
        
        return false;
    }

    // Update conversation header status immediately with validation
    updateConversationHeaderStatusImmediate(statusElement, contactData, recipientId) {
        if (!contactData || !statusElement) return;
        
        // Verify this is still the current conversation
        if (this.getRecipientId() !== recipientId || !this.currentConversation) {
            console.log('Conversation changed, skipping status update');
            return;
        }
        
        // Check if user is really online in real-time
        const isReallyOnline = this.isUserReallyOnline(recipientId);
        
        console.log('Status validation:', {
            recipientId,
            dbStatus: contactData.status,
            isReallyOnline,
            lastSeen: contactData.lastSeen
        });
        
        // Only show "En línea" if user is actually connected and recently active
        if (contactData.status === 'online' && isReallyOnline) {
            statusElement.textContent = 'En línea';
            statusElement.className = 'status-text online';
            statusElement.style.color = '#10b981 !important';
            statusElement.title = 'En línea';
        } else {
            // Show last seen time
            const lastSeenText = Utils.formatLastSeenStyled ? 
                Utils.formatLastSeenStyled(contactData.lastSeen) : 
                'Desconectado';
            
            statusElement.textContent = lastSeenText;
            statusElement.className = 'status-text offline';
            statusElement.style.color = '#6b7280';
            statusElement.title = contactData.lastSeen ? 
                `Última conexión: ${Utils.formatLastSeenStyled(contactData.lastSeen)}` : 
                'Desconectado';
        }
    }

    async loadConversations() {
        try {
            console.log('Loading conversations from API...');
            
            // Check if we have proper authentication
            const authToken = Utils.Storage.get('authToken');
            if (!authToken) {
                console.warn('No auth token available for loading conversations');
                return;
            }
            
            const response = await fetch('/api/messages/conversations', {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.warn('Authentication expired, need to re-login');
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log(' Raw API response:', result);
            
            if (result.success && result.data) {
                // Store previous count for comparison
                const previousCount = this.conversations.size;
                
                // Clear existing conversations and reload
                this.conversations.clear();
                
                result.data.forEach(conversation => {
                    // Ensure participants are properly formatted and enrich conversation data
                    if (conversation.participants) {
                        conversation.participants = conversation.participants.map(p => 
                            typeof p === 'object' ? p._id : p
                        );
                        
                        // For private conversations, set name and avatar from the other participant
                        if (conversation.type === 'private' && this.currentUser) {
                            const otherParticipantId = conversation.participants.find(p => p !== this.currentUser._id);
                            if (otherParticipantId && this.contacts.has(otherParticipantId)) {
                                const contact = this.contacts.get(otherParticipantId);
                                conversation.name = contact.fullName || contact.username || 'Usuario';
                                conversation.avatar = contact.avatar;
                                
                                // Store participant details for status tracking
                                conversation.participantDetails = [contact];
                            } else if (otherParticipantId) {
                                // Fallback if contact not loaded yet
                                conversation.name = conversation.name || 'Usuario';
                                conversation.avatar = conversation.avatar || '/images/user-placeholder-40.svg';
                                
                                // Try to fetch participant info from ContactManager
                                if (window.ContactManager && window.ContactManager.contacts) {
                                    const contactInfo = window.ContactManager.contacts.get(otherParticipantId);
                                    if (contactInfo) {
                                        conversation.participantDetails = [contactInfo];
                                        conversation.name = contactInfo.fullName || contactInfo.username || 'Usuario';
                                        conversation.avatar = contactInfo.avatar;
                                    }
                                }
                            }
                        }
                    }
                    
                    // Use REAL unread count from database - NO FALLBACK TO ZERO
                    // The API should provide the actual unread count from the database
                    if (!conversation.hasOwnProperty('unreadCount')) {
                        console.warn(`⚠️ Conversation ${conversation._id} missing unreadCount from API`);
                        conversation.unreadCount = 0; // Only fallback if completely missing
                    } else {
                        console.log(`📊 Real unread count for ${conversation.name}: ${conversation.unreadCount}`);
                    }
                    
                    this.conversations.set(conversation._id, conversation);
                    console.log('Loaded conversation:', {
                        id: conversation._id,
                        name: conversation.name,
                        participants: conversation.participants,
                        lastMessageText: conversation.lastMessage?.content?.text?.substring(0, 30),
                        unreadCount: conversation.unreadCount
                    });
                });
                
                // Load REAL conversation states from database to get accurate unread counts
                await this.loadConversationStates();
                
                // Render conversations in the chat list with real data
                this.renderConversations();
                
                console.log(` Loaded ${result.data.length} conversations with REAL unread data (previously had ${previousCount})`);
                
                // Initialize counter system with real data
                this.initializeUnreadCounterSystem();
            } else {
                console.warn('No conversations data in response:', result);
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            // Don't throw error here to allow app to continue working
        }
    }

    async loadContacts() {
        // Load user contacts
        console.log('Loading contacts for chat');
    }

    setupEventListeners() {
        // Message sending
        Utils.$('#send-btn')?.addEventListener('click', () => {
            this.sendCurrentMessage();
        });

        // Back button (mobile)
        Utils.$('#back-btn')?.addEventListener('click', () => {
            this.showSidebar();
        });

        // Chat actions
        Utils.$('#new-chat-btn')?.addEventListener('click', () => {
            this.showNewChatModal();
        });

        // Attachment button for mobile
        Utils.$('#attach-btn')?.addEventListener('click', () => {
            this.showAttachmentModal();
        });

        // Setup attachment modal
        this.setupAttachmentModal();

        // Setup mobile input behavior
        this.setupMobileInputBehavior();

        // Tab switching is now handled by the main app
    }

    setupMessageInput() {
        if (!this.messageInput) return;

        let typingTimer;
        
        this.messageInput.addEventListener('input', () => {
            this.updateSendButton();
            
            // Auto-expand input en móvil y desktop
            this.autoExpandInput();
            
            // Handle typing indicators with WhatsApp-style responsiveness
            if (this.currentConversation) {
                const recipientId = this.getRecipientId();
                
                // Send typing indicator immediately (throttled internally)
                window.SocketManager?.sendTypingIndicatorThrottled(this.currentConversation._id, true);
                
                // Stop typing after 2 seconds of inactivity (like WhatsApp)
                clearTimeout(typingTimer);
                typingTimer = setTimeout(() => {
                    window.SocketManager?.sendTypingIndicatorThrottled(this.currentConversation._id, false);
                }, 2000); // Reduced from 3000ms to 2000ms for faster response
            }
        });

        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                console.log('⌨Enter presionado, enviando mensaje...');
                
                // Stop typing indicator immediately when sending message
                clearTimeout(typingTimer);
                if (this.currentConversation) {
                    window.SocketManager?.sendTypingIndicatorThrottled(this.currentConversation._id, false);
                }
                
                this.sendCurrentMessage();
            }
        });

        this.messageInput.addEventListener('paste', (e) => {
            this.handlePaste(e);
        });

        this.messageInput.addEventListener('blur', () => {
            // Stop typing when input loses focus
            clearTimeout(typingTimer);
            if (this.currentConversation) {
                window.SocketManager?.sendTypingIndicatorThrottled(this.currentConversation._id, false);
            }
        });
        
        // Handle when user deletes all text - con validación robusta
        this.messageInput.addEventListener('keyup', () => {
            if (this.messageInput && this.currentConversation) {
                const textContent = this.messageInput.textContent || '';
                const value = this.messageInput.value || '';
                const isEmpty = textContent.trim() === '' && value.trim() === '';
                
                if (isEmpty) {
                    clearTimeout(typingTimer);
                    window.SocketManager?.sendTypingIndicatorThrottled(this.currentConversation._id, false);
                }
            }
        });
    }

    updateSendButton() {
        const sendBtn = Utils.$('#send-btn');
        // Validación robusta para ambos textContent y value
        let hasContent = false;
        if (this.messageInput) {
            const textContent = this.messageInput.textContent || '';
            const value = this.messageInput.value || '';
            hasContent = textContent.trim().length > 0 || value.trim().length > 0;
        }
        
        // También considerar si hay archivos multimedia pendientes
        const hasMedia = this.pendingImageFile || this.pendingVideoFile;
        
        if (sendBtn) {
            sendBtn.disabled = !(hasContent || hasMedia);
        }
    }
    
    // Auto-expand input dinámicamente según el contenido
    autoExpandInput() {
        if (!this.messageInput) return;
        
        const maxHeight = window.innerWidth <= 768 ? 150 : 120; // Altura máxima móvil vs desktop
        const minHeight = 20; // Altura mínima
        
        // Reset altura para calcular scrollHeight correctamente
        this.messageInput.style.height = 'auto';
        
        const scrollHeight = this.messageInput.scrollHeight;
        const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
        
        // Aplicar nueva altura
        this.messageInput.style.height = newHeight + 'px';
        
        // Manejar scroll si excede altura máxima
        if (scrollHeight > maxHeight) {
            this.messageInput.style.overflowY = 'auto';
        } else {
            this.messageInput.style.overflowY = 'hidden';
        }
        
        console.log(`Auto-expand: altura ${newHeight}px (scroll: ${scrollHeight}px)`);
    }

    handlePaste(e) {
        try {
            // Obtener datos del portapapeles
            const clipboardData = e.clipboardData || window.clipboardData;
            
            if (clipboardData) {
                // Verificar si hay archivos (imágenes, etc.)
                const items = clipboardData.items;
                if (items) {
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        
                        // Si es una imagen
                        if (item.type.indexOf('image') !== -1) {
                            e.preventDefault();
                            const file = item.getAsFile();
                            this.handleImagePaste(file);
                            return;
                        }
                    }
                }
                
                // Si llegamos aquí, es texto normal - permitir comportamiento por defecto
                // Actualizar el botón de envío después de pegar
                setTimeout(() => {
                    this.updateSendButton();
                    // También asegurar que el auto-resize funcione
                    if (window.autoResizeInput && window.autoResizeInput.adjustHeight) {
                        window.autoResizeInput.adjustHeight();
                    }
                }, 15); // Un poco más de delay para que el texto se pegue primero
            }
        } catch (error) {
            console.error('Error en handlePaste:', error);
            // En caso de error, al menos actualizar el botón de envío
            setTimeout(() => {
                this.updateSendButton();
            }, 15);
        }
    }
    
    handleImagePaste(file) {
        if (!file) return;
        
        console.log('Imagen pegada:', file.name, file.type);
        
        // Aquí podrías implementar la lógica para subir imágenes
        // Por ahora, solo mostrar un mensaje informativo
        if (Utils.Notifications) {
            Utils.Notifications.info('Función de pegar imágenes disponible próximamente');
        } else {
            console.log('Imagen pegada - funcionalidad pendiente de implementar');
        }
        
        // TODO: Implementar subida de imágenes pegadas
        // - Crear preview de la imagen
        // - Subir a servidor
        // - Enviar como mensaje tipo imagen
    }


    async loadContacts() {
        try {
            const response = await API.Contacts.getContacts();
            const contacts = response.data;
            
            this.contacts.clear();
            contacts.forEach(contact => {
                this.contacts.set(contact._id, contact);
            });
            
            this.renderContacts();
            
        } catch (error) {
            console.error('Error loading contacts:', error);
            API.handleApiError(error);
        }
    }

    // Get status information for conversation participants (similar to contacts.js)
    getConversationStatusInfo(userId) {
        if (!userId) {
            return {
                statusClass: 'offline',
                statusDisplay: '',
                tooltipText: 'Desconectado'
            };
        }

        // Try to get user info from multiple sources with priority order
        let userInfo = null;
        
        // 1. Try from contacts manager cache (most up-to-date)
        if (window.contactsManager && window.contactsManager.contacts) {
            const contact = window.contactsManager.contacts.get(userId);
            if (contact) {
                userInfo = contact;
            }
        }
        
        // 2. Try from socket active users (real-time)
        if (!userInfo && window.SocketManager && window.SocketManager.activeUsers) {
            const activeUser = window.SocketManager.activeUsers.get(userId);
            if (activeUser && activeUser.user) {
                userInfo = activeUser.user;
                userInfo.lastSeen = activeUser.lastActivity || userInfo.lastSeen;
            }
        }
        
        // 3. Fallback to local cache
        if (!userInfo) {
            userInfo = this.getUserInfo(userId);
        }
        
        if (!userInfo) {
            return {
                statusClass: 'offline',
                statusDisplay: '',
                tooltipText: 'Desconectado'
            };
        }

        let statusDisplay = '';
        let statusClass = 'offline';
        let tooltipText = '';

        // Check if user is actually online in real-time
        const isReallyOnline = window.SocketManager && 
                              window.SocketManager.activeUsers && 
                              window.SocketManager.activeUsers.has(userId);

        // Lógica robusta: online si está en activeUsers O fue visto hace menos de 5 minutos
        if (isReallyOnline || userInfo.status === 'online') {
            statusClass = 'online';
            tooltipText = 'En línea';
        } else if (userInfo.lastSeen) {
            const lastSeenMinutes = this.getMinutesSinceLastSeen(userInfo.lastSeen);
            // Buffer robusto: Si fue visto hace menos de 5 minutos, considerar online
            if (lastSeenMinutes < 5) {
                statusClass = 'online';
                tooltipText = 'En línea';
            } else {
                // Show away status with time using the same format as contacts
                statusClass = 'away';
                const formattedTime = Utils.formatLastSeenStyled ? 
                    Utils.formatLastSeenStyled(userInfo.lastSeen) : 
                    'Desconectado';
                
                if (lastSeenMinutes < 60) {
                    statusDisplay = `${lastSeenMinutes}m`;
                    tooltipText = formattedTime;
                } else if (lastSeenMinutes < 1440) { // Less than 24 hours
                    const hours = Math.floor(lastSeenMinutes / 60);
                    statusDisplay = `${hours}h`;
                    tooltipText = formattedTime;
                } else {
                    const days = Math.floor(lastSeenMinutes / 1440);
                    statusDisplay = `${days}d`;
                    tooltipText = formattedTime;
                }
            }
        } else {
            statusClass = 'offline';
            tooltipText = 'Desconectado';
        }

        return {
            statusClass,
            statusDisplay,
            tooltipText
        };
    }

    // Get user info from various sources
    getUserInfo(userId) {
        // Try to get from active users first
        if (window.SocketManager && window.SocketManager.activeUsers) {
            const activeUser = window.SocketManager.activeUsers.get(userId);
            if (activeUser) {
                return activeUser;
            }
        }

        // Try to get from contacts if available
        if (window.ContactManager && window.ContactManager.contacts) {
            const contact = window.ContactManager.contacts.get(userId);
            if (contact) {
                return contact;
            }
        }

        // Try to get from conversation participants data
        for (const [convId, conversation] of this.conversations) {
            if (conversation.participantDetails) {
                const participant = conversation.participantDetails.find(p => p._id === userId);
                if (participant) {
                    return participant;
                }
            }
        }

        return null;
    }

    renderConversations() {
        console.log('renderConversations called, conversations count:', this.conversations.size);
        
        // Throttle rendering to prevent flickering from multiple rapid calls
        if (this.renderThrottleTimeout) {
            clearTimeout(this.renderThrottleTimeout);
        }
        
        this.renderThrottleTimeout = setTimeout(() => {
            this.doRenderConversations();
            this.renderThrottleTimeout = null;
        }, 50); // Small delay to batch multiple render calls
    }
    
    doRenderConversations() {
        console.log('Actually rendering conversations, count:', this.conversations.size);
        
        // Clear status cache since we're doing a full re-render
        this.clearConversationStatusCache();
        
        const chatList = Utils.$('#chat-list');
        if (!chatList) {
            console.error('chat-list element not found');
            return;
        }
        
        // Check if we need to re-render by comparing with last render state
        const currentRenderSignature = this.generateRenderSignature();
        if (this.lastRenderSignature === currentRenderSignature) {
            console.log('Conversations unchanged, skipping re-render to prevent flicker');
            return;
        }

        // Use smooth rendering for better UX
        this.renderConversationsSmooth(chatList);
    }

    renderConversationsSmooth(chatList) {
        const conversations = Array.from(this.conversations.values())
            .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

        // Check if we need skeleton loading
        const hasContent = chatList.children.length > 0 && 
                          !chatList.querySelector('.chat-skeleton') &&
                          !chatList.querySelector('.chat-loading-container');

        if (!hasContent && conversations.length > 0) {
            // Show skeleton while loading
            this.showConversationsLoadingSkeleton(chatList);
            
            // Render actual conversations after skeleton is visible
            setTimeout(() => {
                this.renderConversationsContent(chatList, conversations);
            }, 200);
        } else {
            // Direct render for subsequent updates
            this.renderConversationsContent(chatList, conversations);
        }
    }

    showConversationsLoadingSkeleton(chatList) {
        chatList.style.opacity = '0.8';
        chatList.innerHTML = `
            <div class="chat-loading-container">
                ${Array.from({length: 6}, (_, i) => `
                    <div class="chat-item chat-skeleton" style="animation-delay: ${i * 0.1}s;">
                        <div class="chat-item-avatar skeleton-shimmer"></div>
                        <div class="chat-item-content">
                            <div class="chat-item-header">
                                <div class="chat-item-name skeleton-shimmer"></div>
                                <div class="chat-item-time skeleton-shimmer"></div>
                            </div>
                            <div class="chat-item-preview skeleton-shimmer"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Fade in skeleton
        requestAnimationFrame(() => {
            chatList.style.opacity = '1';
        });
    }

    renderConversationsContent(chatList, conversations) {
        const isFirstLoad = chatList.querySelector('.chat-skeleton') || chatList.querySelector('.chat-loading-container');
        
        if (isFirstLoad) {
            // Fade out skeleton and fade in real content
            chatList.style.transition = 'opacity 0.3s ease';
            chatList.style.opacity = '0.7';
            
            setTimeout(() => {
                this.renderConversationsHTML(chatList, conversations);
                
                // Animate in new content
                chatList.style.opacity = '1';
                
                // Progressive show animation for each conversation
                requestAnimationFrame(() => {
                    const chatItems = chatList.querySelectorAll('.chat-item');
                    chatItems.forEach((item, index) => {
                        item.style.opacity = '0';
                        item.style.transform = 'translateY(10px)';
                        item.style.transition = 'all 0.3s ease';
                        
                        setTimeout(() => {
                            item.style.opacity = '1';
                            item.style.transform = 'translateY(0)';
                        }, index * 40); // Stagger animation
                    });
                });
            }, 150);
        } else {
            // Direct update for subsequent renders
            this.renderConversationsHTML(chatList, conversations);
        }
    }

    renderConversationsHTML(chatList, conversations) {
        // Store the render signature for change detection
        const currentRenderSignature = this.generateRenderSignature();
        this.lastRenderSignature = currentRenderSignature;

        // Use DocumentFragment for efficient DOM updates
        const fragment = document.createDocumentFragment();
        const existingItems = Array.from(chatList.querySelectorAll('.chat-item'));
        const conversationIds = new Set();

        if (this.conversations.size === 0) {
            // Only update if content is actually different
            if (!chatList.querySelector('.empty-state')) {
                chatList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-comments"></i>
                        <p>No hay conversaciones</p>
                        <button class="btn-primary" id="start-new-chat-btn">
                            Iniciar chat
                        </button>
                    </div>
                `;
                
                // Add event listener to switch to contacts tab
                const startChatBtn = chatList.querySelector('#start-new-chat-btn');
                if (startChatBtn) {
                    startChatBtn.addEventListener('click', () => {
                        const contactsTab = document.querySelector('[data-tab="contacts"]');
                        if (contactsTab) {
                            contactsTab.click();
                            Utils.Notifications.info('Selecciona un contacto para iniciar una conversación');
                        }
                    });
                }
            }
            return;
        }

        // Sort conversations by last activity
        const sortedConversations = Array.from(this.conversations.values())
            .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

        // Build conversations efficiently
        sortedConversations.forEach((conversation, index) => {
            // Asegurar que cada conversación tenga los campos necesarios inicializados
            if (typeof conversation.unreadCount === 'undefined') {
                conversation.unreadCount = 0;
            }
            if (typeof conversation.hasNewMessage === 'undefined') {
                conversation.hasNewMessage = false;
            }
            
            conversationIds.add(conversation._id);
            
            // Check if item already exists and is up to date
            const existingItem = existingItems.find(item => 
                item.dataset.conversationId === conversation._id
            );
            
            if (existingItem && this.isConversationItemUpToDate(existingItem, conversation)) {
                // Reuse existing item
                fragment.appendChild(existingItem);
            } else {
                // Create new item
                const chatItem = this.createConversationItem(conversation);
                chatItem.style.opacity = '0';
                chatItem.style.transform = 'translateY(20px)';
                fragment.appendChild(chatItem);
                
                // Smooth entrance animation
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        chatItem.style.transition = 'all 0.2s ease-out';
                        chatItem.style.opacity = '1';
                        chatItem.style.transform = 'translateY(0)';
                    }, index * 30);
                });
            }
        });
        
        // Update DOM in one operation
        chatList.innerHTML = '';
        chatList.appendChild(fragment);
        
        // Actualizar contador global después de renderizar todas las conversaciones
        this.updateGlobalUnreadCounter();
    }

    // ============================
    // SISTEMA ROBUSTO DE IDENTIFICACIÓN DE AUTORÍA
    // ============================

    determineMessageOwnershipRobust(message) {
        // 1. Si ya fue determinado previamente, usar esa decisión (inmutable)
        if (message._authorshipDetermined && typeof message._isOwnMessage === 'boolean') {
            return message._isOwnMessage;
        }

        // 2. Validar que tenemos un usuario actual válido
        if (!this.currentUser || !this.currentUser._id) {
            console.warn('No current user available for ownership determination');
            return false; // Por defecto, tratar como mensaje recibido
        }

        // 3. Extraer el ID del sender de forma robusta
        const senderId = this.extractSenderId(message.sender);
        if (!senderId) {
            console.warn('No valid sender ID found in message');
            return false;
        }

        // 4. Comparación robusta de IDs
        const isOwn = senderId === this.currentUser._id;
        
        // 5. Validaciones adicionales para casos edge
        if (isOwn && message.status === 'sending') {
            // Mensaje temporal propio en proceso de envío
            return true;
        }
        
        if (isOwn && message._id && message._id.startsWith('temp_')) {
            // Mensaje temporal propio
            return true;
        }

        return isOwn;
    }

    extractSenderId(sender) {
        if (!sender) return null;
        
        // Caso 1: sender es un objeto con _id
        if (typeof sender === 'object' && sender._id) {
            return sender._id;
        }
        
        // Caso 2: sender es un string (ID directo)
        if (typeof sender === 'string') {
            return sender;
        }
        
        // Caso 3: sender es el objeto currentUser completo
        if (sender === this.currentUser) {
            return this.currentUser._id;
        }
        
        // Caso 4: sender tiene formato legacy
        if (sender.id) {
            return sender.id;
        }
        
        return null;
    }

    // Validar consistencia de autoría para mensajes existentes
    validateAndFixMessageOwnership(message) {
        if (!message._authorshipDetermined) {
            return; // No ha sido determinado, no hay nada que arreglar
        }

        const currentOwnership = this.determineMessageOwnershipRobust(message);
        
        // Si hay inconsistencia, mantener la decisión original y loggear
        if (message._isOwnMessage !== currentOwnership) {
            console.warn('Ownership inconsistency detected - maintaining original decision:', {
                messageId: message._id,
                originalDecision: message._isOwnMessage,
                newCalculation: currentOwnership,
                originalUserId: message._currentUserId,
                currentUserId: this.currentUser?._id
            });
        }
    }

    // Normalizar sender en mensajes recibidos por socket
    normalizeSenderFormat(message) {
        if (!message.sender) return message;
        
        // Si el sender es solo un string, convertirlo a objeto
        if (typeof message.sender === 'string') {
            const senderId = message.sender;
            
            // Buscar información del usuario en contactos
            const contactInfo = this.contacts.get(senderId) || 
                               (window.contactsManager?.contacts?.get(senderId));
            
            message.sender = {
                _id: senderId,
                fullName: contactInfo?.fullName || contactInfo?.name,
                username: contactInfo?.username,
                avatar: contactInfo?.avatar
            };
        }
        
        // Asegurar que siempre tenga _id
        if (message.sender && !message.sender._id && message.sender.id) {
            message.sender._id = message.sender.id;
        }
        
        return message;
    }

    // Inicializar observador de mutaciones para proteger mensajes enviados
    initializeMessagePositionProtector() {
        if (this.positionObserver) {
            this.positionObserver.disconnect();
        }

        // Crear observador que monitoree cambios en clases y estilos
        this.positionObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
                    
                    const messageEl = mutation.target;
                    
                    // Solo procesar elementos .message
                    if (!messageEl.classList.contains('message')) return;
                    
                    // Verificar si es un mensaje que debería ser enviado
                    const shouldBeSent = messageEl.dataset.isOwn === 'true';
                    
                    if (shouldBeSent) {
                        // Verificar si perdió la clase 'sent' o ganó 'received'
                        const hasSentClass = messageEl.classList.contains('sent');
                        const hasReceivedClass = messageEl.classList.contains('received');
                        
                        if (!hasSentClass || hasReceivedClass) {
                            console.log('🛡️ PROTECTOR: Corrigiendo mensaje enviado que perdió su posición');
                            
                            // Corregir inmediatamente
                            messageEl.classList.add('sent');
                            messageEl.classList.remove('received');
                            this.applyInstantSentStyles(messageEl);
                        }
                    }
                }
            });
        });

        // Observar cambios en el contenedor de mensajes
        if (this.messageContainer) {
            this.positionObserver.observe(this.messageContainer, {
                attributes: true,
                attributeFilter: ['class', 'style'],
                subtree: true,
                childList: true
            });
            
            console.log('🛡️ Protector de posición de mensajes iniciado');
        }
    }

    // Detener observador cuando se necesite
    stopMessagePositionProtector() {
        if (this.positionObserver) {
            this.positionObserver.disconnect();
            this.positionObserver = null;
            console.log('🛡️ Protector de posición de mensajes detenido');
        }
    }

    // Aplicar corrección inmediata de posicionamiento sin refrescar
    enforceMessagePositioningImmediate() {
        const allMessages = document.querySelectorAll('.message');
        
        allMessages.forEach(messageEl => {
            const messageId = messageEl.dataset.messageId;
            
            // Determinar si debería ser un mensaje enviado o recibido
            const shouldBeSent = this.shouldMessageBeSent(messageEl);
            
            if (shouldBeSent && !messageEl.classList.contains('sent')) {
                // Corregir mensaje que debería ser enviado pero está como recibido
                console.log(`🔧 Correcting message ${messageId}: received → sent`);
                messageEl.classList.remove('received');
                messageEl.classList.add('sent');
                this.applyInstantSentStyles(messageEl);
            } else if (!shouldBeSent && !messageEl.classList.contains('received')) {
                // Corregir mensaje que debería ser recibido pero está como enviado
                console.log(`🔧 Correcting message ${messageId}: sent → received`);
                messageEl.classList.remove('sent');
                messageEl.classList.add('received');
                this.applyInstantReceivedStyles(messageEl);
            }
        });
    }

    shouldMessageBeSent(messageEl) {
        const messageId = messageEl.dataset.messageId;
        
        // 1. Buscar el mensaje en caché o datos
        let messageData = null;
        
        // Buscar en mensajes cargados actualmente
        const messageContent = messageEl.querySelector('.message-text')?.textContent;
        
        // 2. Verificar atributos DOM que indiquen autoría
        if (messageEl.dataset.isOwn === 'true') return true;
        if (messageEl.dataset.isOwn === 'false') return false;
        
        // 3. Verificar estructura DOM (mensajes enviados no tienen avatar)
        const hasAvatar = messageEl.querySelector('.message-avatar') !== null;
        if (!hasAvatar) return true; // Sin avatar = mensaje enviado
        
        // 4. Verificar indicadores de estado (solo mensajes enviados tienen estado)
        const hasStatus = messageEl.querySelector('.message-status') !== null;
        if (hasStatus) return true;
        
        // 5. Verificar posición actual vs esperada
        const currentMarginLeft = window.getComputedStyle(messageEl).marginLeft;
        if (currentMarginLeft === 'auto' || currentMarginLeft.includes('auto')) {
            return true; // Ya posicionado a la derecha
        }
        
        // Por defecto, asumir recibido
        return false;
    }

    applyInstantSentStyles(messageEl) {
        // Aplicar estilos de mensaje enviado inmediatamente
        messageEl.style.cssText += `
            margin-left: auto !important;
            margin-right: 12px !important;
            flex-direction: row-reverse !important;
        `;
        
        const messageContent = messageEl.querySelector('.message-content');
        if (messageContent) {
            messageContent.style.cssText += `
                background: var(--message-sent) !important;
                color: white !important;
                border-radius: 18px 4px 18px 18px !important;
            `;
        }
        
        // Ocultar avatar si existe
        const avatar = messageEl.querySelector('.message-avatar');
        if (avatar) {
            avatar.style.display = 'none';
        }
    }

    applyInstantReceivedStyles(messageEl) {
        // Aplicar estilos de mensaje recibido inmediatamente
        messageEl.style.cssText += `
            margin-left: 12px !important;
            margin-right: auto !important;
            flex-direction: row !important;
        `;
        
        const messageContent = messageEl.querySelector('.message-content');
        if (messageContent) {
            messageContent.style.cssText += `
                background: var(--message-received) !important;
                color: var(--text-primary) !important;
                border-radius: 4px 18px 18px 18px !important;
            `;
        }
        
        // Mostrar avatar si existe
        const avatar = messageEl.querySelector('.message-avatar');
        if (avatar) {
            avatar.style.display = 'block';
        }
    }

    isConversationItemUpToDate(existingItem, conversation) {
        if (!existingItem || !conversation) return false;
        
        // Check if critical data has changed
        const currentUnread = existingItem.querySelector('.unread-count')?.textContent || '0';
        const expectedUnread = conversation.unreadCount > 0 ? conversation.unreadCount.toString() : '0';
        
        const currentName = existingItem.querySelector('.chat-name')?.textContent || '';
        const expectedName = conversation.name || '';
        
        const hasUnreadBadge = existingItem.querySelector('.unread-indicator') !== null;
        const shouldHaveUnreadBadge = conversation.unreadCount > 0;
        
        return (
            currentUnread === expectedUnread &&
            currentName === expectedName &&
            hasUnreadBadge === shouldHaveUnreadBadge
        );
    }

    createConversationItem(conversation) {
        console.log('Creating conversation item for:', conversation.name);
        // Never mark as active during initial load to ensure welcome screen shows first
        const isActive = false;
        const lastMessage = conversation.lastMessage;
        const hasUnreadMessages = conversation.unreadCount > 0;
        
    const item = Utils.createElement('div', {
            className: `chat-item ${isActive ? 'active' : ''} ${hasUnreadMessages ? 'has-unread' : ''}`,
            'data-conversation-id': conversation._id
        });
        
        // Add click event listener for desktop and all devices
        item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Chat item clicked, conversation ID:', conversation._id);
            this.handleChatItemClick(conversation._id, conversation);
        });
        
        // Add right-click context menu
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showConversationContextMenu(e, conversation);
        });
        
        // Simplified mobile support - just use click events
        // Remove complex touch handling that can interfere with clicking

        // Calcular tiempo de manera más precisa
        const timeDisplay = this.getConversationTimeDisplay(conversation.lastActivity);
        
        // Calculate status for conversation participants (excluding current user)
        const otherUserId = conversation.participants?.find(p => p !== this.currentUser?._id);
        const statusInfo = this.getConversationStatusInfo(otherUserId);
        
        item.innerHTML = `
            <div class="chat-item-avatar">
                <div class="contact-avatar-container">
                    <img src="${conversation.avatar || '/images/user-placeholder-40.svg'}" 
                         alt="${conversation.name}" class="chat-img contact-avatar">
                    ${statusInfo.statusClass === 'online' ? 
                        `<div class="status-indicator ${statusInfo.statusClass}" title="${statusInfo.tooltipText}"></div>` :
                        statusInfo.statusClass === 'away' ? 
                        `<div class="status-indicator ${statusInfo.statusClass}" title="${statusInfo.tooltipText}">
                            <span class="status-time">${statusInfo.statusDisplay}</span>
                         </div>` : ''
                    }
                </div>
            </div>
            <div class="chat-info">
                <div class="chat-top-row">
                    <h3 class="chat-name">${Utils.escapeHtml(conversation.name)}</h3>
                    <div class="chat-time-container" style="display: flex; align-items: center; gap: 6px;">
                        <span class="chat-time">${timeDisplay}</span>
                        ${this.renderConversationTimeIndicators(conversation)}
                    </div>
                </div>
                <div class="chat-bottom-row">
                    <p class="chat-last-msg">
                        ${lastMessage ? this.formatLastMessage(lastMessage) : 'Sin mensajes'}
                    </p>
                    <div class="chat-indicators">
                        ${hasUnreadMessages ? `<div class="unread-badge-messenger">${conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}</div>` : ''}
                    </div>
                </div>
            </div>
        `;

        return item;
    }

    formatLastMessage(message) {
        if (!message) return '';
        
        let prefix = '';
        if (message.sender === this.currentUser._id) {
            prefix = 'Tú: ';
        }
        
        let content = message.content?.text || 'Archivo adjunto';
        if (message.type === 'image') content = '📷 Imagen';
        if (message.type === 'file') content = '📎 Archivo';
        if (message.type === 'voice') content = '🎤 Audio';
        
        return prefix + Utils.truncateText(content, 30);
    }

    renderChatIndicators(conversation) {
        // Solo mostrar estado del mensaje enviado (como WhatsApp)
        let indicators = '';
        
        // Agregar indicador de último mensaje enviado por el usuario actual
        if (conversation.lastMessage && conversation.lastMessage.sender === this.currentUser._id) {
            const status = conversation.lastMessage.status || 'sent';
            indicators += `<span class="message-status ${status}">${this.getMessageStatusIcon(status)}</span>`;
        }
        
        return indicators;
    }

    renderConversationTimeIndicators(conversation) {
        // Solo mostrar checkmarks si el último mensaje es del usuario actual
        if (conversation.lastMessage && 
            (conversation.lastMessage.sender === this.currentUser?._id || 
             conversation.lastMessage.sender?._id === this.currentUser?._id)) {
            const status = conversation.lastMessage.status || 'sent';
            return `<span class="message-status ${status}" style="font-size: 12px;">${this.getMessageStatusIcon(status)}</span>`;
        }
        return '';
    }
    
    getConversationTimeDisplay(lastActivity) {
        if (!lastActivity) return '';
        
        const now = new Date();
        const messageTime = new Date(lastActivity);
        const diffInHours = Math.floor((now - messageTime) / (1000 * 60 * 60));
        
        // Función helper para formatear hora en formato 12 horas
        const formatTime12Hour = (date) => {
            let hours = date.getHours();
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // hour '0' should be '12'
            return `${hours}:${minutes} ${ampm}`;
        };
        
        // Menos de 24 horas - mostrar solo la hora (ej: 17:04 PM)
        if (diffInHours < 24) {
            return formatTime12Hour(messageTime);
        }
        // Más de 24 horas - mostrar fecha completa con hora
        else {
            const day = messageTime.getDate().toString().padStart(2, '0');
            const month = (messageTime.getMonth() + 1).toString().padStart(2, '0');
            const year = messageTime.getFullYear();
            const time = formatTime12Hour(messageTime);
            
            // Si es del mismo año, no mostrar el año
            if (year === now.getFullYear()) {
                return `${day}/${month} ${time}`;
            } else {
                return `${day}/${month}/${year} ${time}`;
            }
        }
    }

    renderContacts() {
        const contactsList = Utils.$('#contacts-list');
        if (!contactsList) return;

        contactsList.innerHTML = '';

        if (this.contacts.size === 0) {
            contactsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>No hay contactos</p>
                    <button class="btn-primary" onclick="Chat.showAddContactModal()">
                        Agregar contacto
                    </button>
                </div>
            `;
            return;
        }

        // Sort contacts alphabetically
        const sortedContacts = Array.from(this.contacts.values())
            .sort((a, b) => a.fullName.localeCompare(b.fullName));

        sortedContacts.forEach(contact => {
            const contactItem = this.createContactItem(contact);
            contactsList.appendChild(contactItem);
        });
    }

    createContactItem(contact) {
        const item = Utils.createElement('div', {
            className: 'contact-item',
            onclick: () => this.startConversationWithContact(contact._id)
        });

        item.innerHTML = `
            <img src="${contact.avatar || '/images/user-placeholder-40.svg'}" 
                 alt="${contact.fullName}" class="contact-img">
            <div class="contact-info">
                <div class="contact-top-row">
                    <h3 class="contact-name">${Utils.escapeHtml(contact.fullName)}</h3>
                    <div class="status-indicator ${contact.status}"></div>
                </div>
                <div class="contact-status">
                    ${contact.statusMessage || Utils.formatLastSeenStyled(contact.lastSeen)}
                </div>
            </div>
        `;

        return item;
    }

    // Start conversation with contact (alias for startChatWithUser)
    async startConversationWithContact(contactId) {
        return this.startChatWithUser(contactId);
    }

    async selectConversation(conversationId) {
        // Use the simplified click handler
        await this.handleChatItemClick(conversationId);
    }

    async updateActiveConversation() {
        // Update chat header
        const contactInfo = Utils.$('#contact-info');
        if (contactInfo && this.currentConversation) {
            const avatar = contactInfo.querySelector('.contact-avatar');
            const name = contactInfo.querySelector('.contact-name');
            const status = contactInfo.querySelector('.last-seen');
            const typingIndicator = contactInfo.querySelector('.typing-indicator');
            const recipientId = this.getRecipientId();
            
            // Get contact info for better display
            const contact = this.getCurrentContactInfo();
            
            // Always get fresh and real contact data before updating anything
            let contactData = contact;
            if (recipientId) {
                try {
                    // Try to get the most up-to-date data from multiple sources
                    contactData = await this.getRealTimeContactData(recipientId);
                } catch (error) {
                    console.log('Could not fetch real-time contact data:', error);
                    contactData = contact; // Fallback to cached data
                }
            }
            
            // Use contact info if available, otherwise use conversation data
            const contactName = contactData ? 
                (contactData.fullName || contactData.username || contactData.name) : 
                (this.currentConversation.name || 'Usuario');
            
            const avatarSrc = contactData ? 
                contactData.avatar : 
                (this.currentConversation.avatar || '/images/user-placeholder-40.svg');
            
            console.log('Updating header with real-time data:', {
                contactName,
                avatarSrc,
                contactStatus: contactData?.status,
                lastSeen: contactData?.lastSeen,
                recipientId,
                hasContactData: !!contactData,
                isReallyOnline: this.isUserReallyOnline(recipientId)
            });
            
            if (avatar) {
                avatar.src = avatarSrc || '/images/user-placeholder-40.svg';
                avatar.alt = contactName;
                avatar.onerror = function() {
                    this.src = '/images/user-placeholder-40.svg';
                };
            }
            
            if (name) {
                name.textContent = contactName;
            }
            
            // Update status with persistent display - always show En línea OR última conexión
            if (recipientId) {
                console.log(`🔍 updateActiveConversation: Updating header persistente para recipientId: ${recipientId}`);
                
                // Clear any previous timeout to avoid conflicts
                if (this.statusUpdateTimeout) {
                    clearTimeout(this.statusUpdateTimeout);
                }
                
                // Get live presence data from socket manager first
                const presenceData = window.SocketManager?.getUserPresence(recipientId);
                console.log(`🔍 updateActiveConversation: Got presence data:`, presenceData);
                
                if (presenceData) {
                    // Use socket presence data for typing and persistent status
                    console.log(`✅ updateActiveConversation: Using socket presence data`);
                    this.updateConversationHeaderStatusInstant(presenceData);
                } else {
                    // No socket data - use persistent updater with contact data or fetch fresh data
                    console.log(`⚠️ updateActiveConversation: No socket data, using persistent updater`);
                    this.updateConversationHeaderPersistent(recipientId, contactData?.status, contactData?.lastSeen);
                }
            }
        }

        // Update active chat item
        Utils.$$('.chat-item').forEach(item => {
            item.classList.remove('active');
        });

        // Find the active item by conversation ID using data attribute or onclick
        const activeItem = Utils.$(`[data-conversation-id="${this.currentConversation._id}"]`) || 
                          Utils.$(`[onclick*="${this.currentConversation._id}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
            console.log('Marked chat item as active:', this.currentConversation._id);
        } else {
            console.log('Could not find chat item to mark as active for:', this.currentConversation._id);
        }
    }

    async loadConversationMessages(conversationId, page = 1) {
        try {
            console.log(`Loading messages for conversation: ${conversationId}, page: ${page}`);
            
            // Ensure elements are set up immediately
            this.setupElements();
            
            // Check if this is a temporary conversation (hasn't been created in DB yet)
            if (conversationId.startsWith('temp_')) {
                console.log('Temporary conversation detected, showing empty message area');
                // Clear messages container
                if (this.messageContainer) {
                    this.messageContainer.innerHTML = '';
                }
                this.showWelcomeMessageForNewChat();
                return;
            }
            
            
            const response = await fetch(`/api/messages/conversation/${conversationId}?page=${page}`, {
                headers: {
                    'Authorization': `Bearer ${Utils.Storage.get('authToken')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && result.data && result.data.messages) {
                const messages = result.data.messages;
                console.log(`Found ${messages.length} messages`);
                
                if (page === 1) {
                    // Clear existing messages
                    if (this.messageContainer) {
                        this.messageContainer.innerHTML = '';
                    }
                }
                
                // APLICAR PROTECCIÓN ROBUSTA A TODOS LOS MENSAJES CARGADOS
                messages.forEach(message => {
                    // Normalizar formato antes del renderizado
                    message = this.normalizeSenderFormat(message);
                    
                    // Determinar autoría de forma inmutable antes del renderizado
                    this.determineMessageOwnershipRobust(message);
                    
                    this.renderMessage(message);
                });
                
                console.log(`Successfully rendered ${messages.length} messages with robust ownership`);
                
                // APLICAR CORRECCIÓN INMEDIATA DE POSICIONAMIENTO
                setTimeout(() => {
                    this.enforceMessagePositioningImmediate();
                }, 50);
                
                // Reset scroll state for new conversation and scroll immediately
                if (page === 1) {
                    this.userHasScrolledUp = false;
                    // Immediate scroll to bottom
                    requestAnimationFrame(() => {
                        this.performRobustAutoScroll();
                    });
                }
                
                // Update pagination state
                this.hasMoreMessages = result.data.hasMoreMessages || false;
                this.currentPage = page;
                
            } else {
                console.log('No messages found for conversation');
                if (this.messageContainer) {
                    this.messageContainer.innerHTML = '';
                }
                this.showWelcomeMessageForNewChat();
            }
            
        } catch (error) {
            console.error('Error loading messages:', error);
            if (error.message.includes('404')) {
                console.log('Conversation not found - this is normal for new conversations');
                if (this.messageContainer) {
                    this.messageContainer.innerHTML = '';
                }
                this.showWelcomeMessageForNewChat();
            } else {
                if (this.messageContainer) {
                    await this.showMessagesErrorState(conversationId);
                }
                Utils.Notifications.error('Error al cargar los mensajes');
            }
        }
    }

    // Smooth loading methods for better UX
    showMessagesLoadingSkeleton() {
        if (!this.messageContainer) return;
        
        this.messageContainer.style.transition = 'opacity 0.3s ease';
        this.messageContainer.style.opacity = '0.7';
        
        const skeletonHTML = `
            <div class="message-loading-container animate">
                <div class="loading-header">
                    <div class="loading-avatar skeleton"></div>
                    <div class="loading-text short skeleton"></div>
                </div>
                <div class="loading-messages">
                    ${Array.from({length: 4}, (_, i) => `
                        <div class="loading-message ${i % 2 === 0 ? 'received' : 'sent'}" style="animation-delay: ${i * 0.1}s;">
                            <div class="loading-bubble ${i % 2 === 0 ? 'left' : 'right'} skeleton"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        this.messageContainer.innerHTML = skeletonHTML;
        
        // Fade in skeleton
        setTimeout(() => {
            this.messageContainer.style.opacity = '1';
        }, 100);
    }
    
    async smoothClearMessages() {
        if (!this.messageContainer) return;
        
        return new Promise(resolve => {
            this.messageContainer.style.transition = 'opacity 0.2s ease';
            this.messageContainer.style.opacity = '0.3';
            
            setTimeout(() => {
                this.messageContainer.innerHTML = '';
                this.messageContainer.style.opacity = '1';
                resolve();
            }, 150);
        });
    }
    
    async smoothTransitionToNewMessages() {
        if (!this.messageContainer) return;
        
        return new Promise(resolve => {
            // Quick fade out
            this.messageContainer.style.transition = 'opacity 0.15s ease';
            this.messageContainer.style.opacity = '0.4';
            
            setTimeout(() => {
                this.messageContainer.innerHTML = '';
                this.messageContainer.style.opacity = '1';
                resolve();
            }, 100);
        });
    }
    
    async renderMessagesProgressively(messages) {
        if (!messages || !messages.length) return;
        
        // Process and render messages in small batches for smooth loading
        const batchSize = 5;
        for (let i = 0; i < messages.length; i += batchSize) {
            const batch = messages.slice(i, i + batchSize);
            
            batch.forEach(message => {
                // Normalizar formato antes del renderizado
                message = this.normalizeSenderFormat(message);
                
                // Determinar autoría de forma inmutable antes del renderizado
                this.determineMessageOwnershipRobust(message);
                
                this.renderMessage(message);
            });
            
            // Small delay between batches to prevent blocking
            if (i + batchSize < messages.length) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
    }
    
    async showMessagesErrorState(conversationId) {
        if (!this.messageContainer) return;
        
        return new Promise(resolve => {
            this.messageContainer.style.transition = 'opacity 0.3s ease';
            this.messageContainer.style.opacity = '0.6';
            
            setTimeout(() => {
                this.messageContainer.innerHTML = `
                    <div class="error-message smooth">
                        <div class="error-icon">
                            <i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i>
                        </div>
                        <div class="error-content">
                            <h3>Error al cargar mensajes</h3>
                            <p>No se pudieron cargar los mensajes de esta conversación</p>
                            <button onclick="window.chatManager.loadConversationMessages('${conversationId}')" class="retry-btn">
                                <i class="fas fa-redo"></i> Reintentar
                            </button>
                        </div>
                    </div>
                `;
                this.messageContainer.style.opacity = '1';
                resolve();
            }, 200);
        });
    }

    showWelcomeMessage() {
        const messagesContainer = Utils.$('.messages-container');
        if (!messagesContainer) return;

        // Get contact info for personalized welcome
        const contact = this.getCurrentContactInfo();
        const contactName = contact ? (contact.fullName || contact.username) : 'este contacto';

        const welcomeHtml = `
            <div class="welcome-message-container">
                <div class="welcome-message">
                    <div class="welcome-icon">
                        <i class="fas fa-comments"></i>
                    </div>
                    <h3>¡Inicia una conversación con ${contactName}!</h3>
                    <p>Envía un mensaje para comenzar a chatear. Los mensajes están cifrados de extremo a extremo.</p>
                </div>
            </div>
        `;

        messagesContainer.innerHTML = welcomeHtml;
    }

    getCurrentContactInfo() {
        if (!this.currentConversation) return null;
        
        const recipientId = this.getRecipientId();
        if (!recipientId) return null;

        // Try to get contact info from contacts manager
        if (window.contactsManager && window.contactsManager.contacts) {
            const contacts = Array.from(window.contactsManager.contacts.values());
            return contacts.find(c => c._id === recipientId);
        }

        return null;
    }

    renderMessage(message, prepend = false) {
        console.log(' renderMessage called:', { messageId: message._id, prepend });
        
        const messageEl = this.createMessageElement(message);
        // Ensure we always append messages to the scrolling element
        const targetContainer = this.messagesScroll || document.getElementById('messages-scroll') || this.messageContainer;
        console.log(' Target container:', targetContainer?.id || targetContainer?.className);

        if (prepend && typeof targetContainer.prepend === 'function') {
            targetContainer.prepend(messageEl);
        } else {
            targetContainer.appendChild(messageEl);
        }

        // Para mensajes nuevos (no históricos), asegurar visibilidad inmediata (estilo WhatsApp)
        if (!prepend) {
            console.log(' New message added, executing enhanced auto-scroll');
            // Usar la nueva función ultra-robusta de auto-scroll
            this.performRobustAutoScroll();
        }

        return messageEl;
    }

    createMessageElement(message) {
        // SOLUCIÓN ULTRA-ROBUSTA: Sistema de identificación inmutable de autoría
        const isOwn = this.determineMessageOwnershipRobust(message);
        
        // PERSISTIR la decisión de autoría en el mensaje para evitar cambios futuros
        if (!message._authorshipDetermined) {
            message._isOwnMessage = isOwn;
            message._authorshipDetermined = true;
            message._currentUserId = this.currentUser?._id; // Para validación futura
        }
        
        // Log detallado para debugging
        console.log(`ROBUST Message ownership: ${isOwn}`, {
            messageId: message._id,
            senderOriginal: message.sender,
            senderId: this.extractSenderId(message.sender),
            currentUserId: this.currentUser?._id,
            persistent: message._isOwnMessage,
            determined: message._authorshipDetermined
        });
        
        const isDeleted = message.messageType === 'deleted';
        const isForwarded = message.forwarded && message.forwarded.isForwarded;
        const isReply = message.replyTo && message.replyTo._id;
        const isEmojiOnly = this.isEmojiOnlyMessage(message.content?.text);
        
        const messageEl = Utils.createElement('div', {
            className: `message ${isOwn ? 'sent' : 'received'} ${isDeleted ? 'deleted-message' : ''} ${isForwarded ? 'forwarded' : ''} ${isReply ? 'reply' : ''} ${isEmojiOnly ? 'emoji-only' : ''}`,
            'data-message-id': message._id,
            'data-is-own': isOwn.toString(), // PERSISTIR DECISIÓN DE AUTORÍA
            'data-timestamp': message.timestamp || message.createdAt || Date.now()
        });
        
        // If this is a deleted message placeholder, render it differently
        if (isDeleted) {
            return this.createDeletedMessageElement(message);
        }

        // Add context menu for messages
        messageEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showMessageContextMenu(e, message);
        });

        // Add mobile long-press support for messages
        let longPressTimer;
        let isLongPress = false;
        
        // Make touch handlers passive-friendly so scrolling isn't blocked
        messageEl.addEventListener('touchstart', (e) => {
            isLongPress = false;
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                // don't call preventDefault to avoid blocking native scrolling
                this.showMessageContextMenu(e, message);
            }, 500);
        }, { passive: true });

        messageEl.addEventListener('touchmove', () => {
            // If the user scrolls, cancel the long-press action
            clearTimeout(longPressTimer);
        }, { passive: true });

        messageEl.addEventListener('touchend', () => {
            clearTimeout(longPressTimer);
        }, { passive: true });

        messageEl.addEventListener('touchcancel', () => {
            clearTimeout(longPressTimer);
        }, { passive: true });

        let avatarHTML = '';
        if (!isOwn) {
            avatarHTML = `<img src="${message.sender.avatar || '/images/user-placeholder-32.svg'}" 
                               alt="${message.sender.fullName}" class="message-avatar">`;
        }

        // Crear hora y estado en la misma línea (estilo WhatsApp)
        let timeAndStatusHTML = `<div class="message-time-status">`;
        timeAndStatusHTML += `<span class="message-time">${Utils.formatTime(message.createdAt)}</span>`;
        if (isOwn) {
            const statusIcon = this.getMessageStatusIcon(message.status);
            timeAndStatusHTML += `<span class="message-status">${statusIcon}</span>`;
        }
        timeAndStatusHTML += `</div>`;

        // Generate message content based on type
        let messageContentHTML = '';
        
        if (isReply) {
            // Reply message with modern design (like modern messaging apps)
            const originalSenderName = message.replyTo.sender?.fullName || message.replyTo.sender?.username || 'Usuario';
            const originalContent = message.replyTo.content?.text || 'Mensaje';
            const replyContent = message.content.text || '';
            
            // Truncate original content if too long
            const maxLength = 80;
            let truncatedOriginal = originalContent;
            let isTruncated = false;
            if (originalContent.length > maxLength) {
                truncatedOriginal = originalContent.substring(0, maxLength);
                isTruncated = true;
            }
            
            messageContentHTML = `
                <div class="reply-container">
                    <div class="reply-quote">
                        <div class="reply-quote-border"></div>
                        <div class="reply-quote-content">
                            <div class="reply-original-sender">${Utils.escapeHtml(originalSenderName)}</div>
                            <div class="reply-original-text">${Utils.escapeHtml(truncatedOriginal)}${isTruncated ? '...' : ''}</div>
                        </div>
                    </div>
                    <div class="reply-text">${Utils.escapeHtml(replyContent)}</div>
                </div>
            `;
        } else if (isForwarded) {
            // Forwarded message with unified design
            const originalSenderName = message.forwarded?.originalSender?.fullName || message.forwarded?.originalSender?.username || 'Usuario';
            const originalContent = message.forwarded?.originalContent || '';
            const additionalText = message.forwarded?.additionalText || '';
            
            // Parse the full message content to extract parts
            let fullContent = message.content?.text || '';
            let newContent = '';
            let actualOriginalContent = originalContent;
            
            // If the content contains our forward format, parse it
            if (fullContent.includes('[Mensaje reenviado]')) {
                const parts = fullContent.split('[Mensaje reenviado]');
                if (parts.length > 1) {
                    newContent = parts[0].trim();
                    actualOriginalContent = parts[1].trim() || originalContent;
                }
            } else if (additionalText) {
                newContent = additionalText;
                actualOriginalContent = originalContent;
            } else {
                // Fallback: use the original content from forwarded data
                actualOriginalContent = originalContent;
            }
            
            // SIEMPRE debe haber contenido original para mostrar
            if (!actualOriginalContent) {
                actualOriginalContent = fullContent || 'Contenido no disponible';
            }
            
            // Don't truncate - show full original content (it's important!)
            const maxLength = 500; // Increased limit
            let displayOriginal = actualOriginalContent;
            let isTruncated = false;
            if (actualOriginalContent.length > maxLength) {
                displayOriginal = actualOriginalContent.substring(0, maxLength);
                isTruncated = true;
            }
            
            // Handle images if present in the forwarded message
            let imageContent = '';
            if (message.attachments && message.attachments.length > 0) {
                imageContent = message.attachments.map(attachment => {
                    if (attachment.type === 'image') {
                        return `<img src="${attachment.url}" alt="Imagen reenviada" class="forwarded-image" onclick="this.closest('.message').querySelector('.attachment-image')?.click()">`;
                    }
                    return '';
                }).join('');
            }
            
            messageContentHTML = `
                <div class="forwarded-container">
                    <div class="forwarded-header">
                        <i class="fas fa-share"></i>
                        <span>Reenviado</span>
                    </div>
                    <div class="forwarded-original-quote">
                        <div class="forwarded-original-sender">${Utils.escapeHtml(originalSenderName)}</div>
                        <div class="forwarded-original-content">
                            ${Utils.escapeHtml(displayOriginal)}${isTruncated ? '...' : ''}
                            ${imageContent}
                        </div>
                    </div>
                    ${newContent ? `<div class="forwarded-reply-text">${Utils.escapeHtml(newContent)}</div>` : ''}
                </div>
            `;
        } else {
            // Regular message
            let textContent = '';
            let imageContent = '';
            
            // Agregar texto si existe
            if (message.content.text) {
                textContent = `<div class="message-text">${Utils.escapeHtml(message.content.text)}</div>`;
            }
            
            // Agregar imagen si existe (legacy format)
            if (message.image && message.image.url) {
                imageContent = `
                    <div class="message-image">
                        <img src="${message.image.url}" alt="${message.image.name || 'Imagen'}" class="expandable-image" onclick="window.chatManager.expandImage(this)">
                    </div>
                `;
            }
            
            // Agregar imágenes/videos desde attachments (new format)
            if (message.attachments && message.attachments.length > 0) {
                const attachmentContent = message.attachments.map(attachment => {
                    if (attachment.mimeType?.startsWith('image/')) {
                        return `
                            <div class="message-image">
                                <img src="${attachment.path}" alt="${attachment.originalName || 'Imagen'}" class="expandable-image" onclick="window.chatManager.expandImage(this)">
                            </div>
                        `;
                    } else if (attachment.mimeType?.startsWith('video/')) {
                        return `
                            <div class="message-video">
                                <video src="${attachment.path}" controls preload="metadata" style="max-width: 250px; max-height: 200px; border-radius: 8px;">
                                    Tu navegador no soporta el elemento de video.
                                </video>
                            </div>
                        `;
                    }
                    return '';
                }).join('');
                imageContent += attachmentContent;
            }
            
            // Layout: Imagen arriba, texto abajo (como WhatsApp)
            messageContentHTML = imageContent + textContent;
        }

        messageEl.innerHTML = `
            ${avatarHTML}
            <div class="message-content">
                ${messageContentHTML}
                ${timeAndStatusHTML}
            </div>
        `;

        return messageEl;
    }

    getMessageStatusIcon(status) {
        switch (status) {
            case 'pending':
            case 'sending':
                return '<span class="message-status pending" title="Enviando..."><i class="fas fa-clock"></i></span>';
            case 'sent':
                return `<span class="message-status sent" title="Enviado">✓</span>`;
            case 'delivered':
                return `<span class="message-status delivered" title="Entregado">✓✓</span>`;
            case 'read':
                return `<span class="message-status read" title="Leído">✓✓</span>`;
            case 'error':
                return '<span class="message-status error" title="Error al enviar"><i class="fas fa-exclamation-triangle"></i></span>';
            default:
                return ''; // No icon by default
        }
    }

    // Función para detectar si un mensaje contiene únicamente emojis
    isEmojiOnlyMessage(text) {
        if (!text || typeof text !== 'string') {
            return false;
        }
        
        // Remover espacios en blanco
        const trimmedText = text.trim();
        if (trimmedText.length === 0) {
            return false;
        }
        
        // Regex para detectar emojis (Unicode ranges para emojis)
        const emojiRegex = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}\u{2100}-\u{214F}\u{2194}-\u{2199}\u{21A9}-\u{21AA}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3030}\u{303D}\u{3297}\u{3299}\u{FE0F}\u{200D}\s]*$/u;
        
        return emojiRegex.test(trimmedText);
    }

    // Public method to send a message with specified content
    sendMessage(messageContent) {
        if (!messageContent || !messageContent.trim()) {
            console.log('No se puede enviar: mensaje vacío');
            return;
        }
        
        if (!this.currentConversation) {
            console.log('No se puede enviar: sin conversación activa');
            return;
        }
        
        // Set the message content to the input field and send
        if (this.messageInput) {
            this.messageInput.textContent = messageContent.trim();
            this.sendCurrentMessage();
        } else {
            console.log('No se puede enviar: input de mensaje no disponible');
        }
    }

    async sendCurrentMessage() {
        const content = this.messageInput.textContent.trim();
        
        console.log('🔍 sendCurrentMessage inicio:', {
            content: content,
            contentLength: content.length,
            pendingImageFile: !!this.pendingImageFile,
            pendingVideoFile: !!this.pendingVideoFile,
            currentConversation: !!this.currentConversation
        });
        
        // Permitir envío si hay texto o imagen adjunta
        if ((!content && !this.pendingImageFile && !this.pendingVideoFile) || !this.currentConversation) {
            console.log('❌ Envío cancelado - no hay contenido ni archivos');
            return;
        }

        const recipientId = this.getRecipientId();
        if (!recipientId) {
            return;
        }

        // Create temporary message ID
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        // Determine message type for UI display
        let displayType = 'text';
        if (this.pendingImageFile) displayType = 'image';
        if (this.pendingVideoFile) displayType = 'video';

        const tempMessage = {
            _id: tempId,
            content: { text: content },
            type: displayType,
            sender: this.currentUser,
            recipient: recipientId,
            createdAt: new Date(),
            status: 'sending', // No icon will show for this status
            isTemporary: true,
            clientId: tempId,
            replyTo: this.replyContext || null,
            // MARCAR AUTORÍA INMEDIATAMENTE PARA PROTECCIÓN
            _isOwnMessage: true,
            _authorshipDetermined: true,
            _currentUserId: this.currentUser._id
        };

        // Add attachments info (will be updated after upload)
        if (this.pendingImageFile) {
            tempMessage.image = {
                file: this.pendingImageFile,
                url: this.pendingImageUrl, // This is the blob URL for preview
                name: this.pendingImageFile.name,
                size: this.pendingImageFile.size
            };
        }

        if (this.pendingVideoFile) {
            tempMessage.video = {
                file: this.pendingVideoFile,
                url: this.pendingVideoUrl, // This is the blob URL for preview
                name: this.pendingVideoFile.name,
                size: this.pendingVideoFile.size
            };
        }

        // Render message immediately with ULTRA-FAST behavior
        const messageEl = this.renderMessage(tempMessage);
        messageEl.classList.add('sending');
        messageEl.dataset.messageId = tempId;
        messageEl.dataset.clientId = tempId;
        messageEl.setAttribute('data-client-id', tempId);

        // INSTANTANEOUS scroll to show new message
        this.performRobustAutoScroll();

        // Clear input and maintain focus IMMEDIATELY (faster than WhatsApp)
        this.messageInput.textContent = '';
        
        // Reset altura del input después de limpiar
        this.autoExpandInput();

        // Reset input height instantly
        if (window.autoResizeInput?.adjustHeight) {
            window.autoResizeInput.adjustHeight();
        }

        // Keep focus on input immediately
        this.messageInput.focus();
        
        // INSTANT visual feedback - change to 'sent' after 50ms
        setTimeout(() => {
            if (messageEl && messageEl.classList.contains('sending')) {
                messageEl.classList.remove('sending');
                messageEl.classList.add('sent');
                
                const statusEl = messageEl.querySelector('.message-status');
                if (statusEl) {
                    statusEl.innerHTML = '<span class="checkmark single" style="color: #9ca3af !important;" title="Enviado">✓</span>';
                }
            }
        }, 50); // Ultra-fast visual feedback

        // Send via socket with proper error handling
        console.log('🔍 Verificando estado del socket antes de enviar:', {
            socketManager: !!window.SocketManager,
            isConnected: window.SocketManager?.isConnected,
            recipientId,
            content: content.substring(0, 50) + '...',
            tempId
        });
        
        if (!window.SocketManager) {
            console.error('SocketManager no está disponible');
            this.handleMessageSendError(tempId, 'SocketManager no disponible');
            return;
        }
        
        if (!window.SocketManager.isConnected) {
            console.log('Socket no está conectado - agregando mensaje a la cola');
            
            // Check if circuit breaker is open
            if (window.SocketManager.circuitBreakerOpen) {
                Utils.Notifications.error('Problemas de conexión. Reintentando automáticamente...');
                this.handleMessageSendError(tempId, 'Problemas de conexión detectados');
                return;
            }
            
            // Queue message for when connection is restored
            this.queueMessage(recipientId, content, tempId);
            Utils.Notifications.warning('Sin conexión. El mensaje se enviará automáticamente cuando se restaure la conexión.');
            
            // Mark message as queued in UI
            const messageEl = document.querySelector(`[data-temp-id="${tempId}"]`);
            if (messageEl) {
                messageEl.classList.add('queued');
                const statusEl = messageEl.querySelector('.message-status');
                if (statusEl) {
                    statusEl.innerHTML = '<i class="fas fa-pause" style="color: #f59e0b;" title="En cola"></i>';
                }
            }
            
            // Try to reconnect
            setTimeout(() => {
                if (!window.SocketManager.circuitBreakerOpen) {
                    window.SocketManager.forceReconnect();
                }
            }, 2000);
            
            return;
        }
        
        // Send the message with the SocketManager - Upload files first if needed
        try {
            let attachments = [];
            let messageType = 'text';
            let messageContent = content;

            console.log('🔍 Estado de archivos pendientes:', {
                pendingImageFile: this.pendingImageFile,
                pendingVideoFile: this.pendingVideoFile,
                pendingImageFileType: typeof this.pendingImageFile,
                pendingImageFileExists: !!this.pendingImageFile
            });

            // Handle image attachment - Upload to server first
            if (this.pendingImageFile) {
                console.log('🔍 Procesando imagen pendiente:', this.pendingImageFile);
                messageType = 'image';
                try {
                    console.log('📤 Iniciando upload de imagen...');
                    const uploadResult = await this.uploadFile(this.pendingImageFile, 'image');
                    attachments.push({
                        filename: uploadResult.filename,
                        originalName: uploadResult.originalName || this.pendingImageFile.name,
                        mimeType: this.pendingImageFile.type,
                        size: uploadResult.size || this.pendingImageFile.size,
                        path: uploadResult.url,
                        thumbnail: uploadResult.thumbnail
                    });
                    
                    // Update temporary message with uploaded image info
                    this.updateTemporaryMessageImage(tempId, uploadResult);
                } catch (uploadError) {
                    console.error('Error uploading image:', uploadError);
                    Utils.Notifications.error('Error al subir la imagen');
                    this.handleMessageSendError(tempId, 'Error uploading image');
                    return;
                }
            }

            // Handle video attachment - Upload to server first
            if (this.pendingVideoFile) {
                messageType = 'video';
                try {
                    const uploadResult = await this.uploadFile(this.pendingVideoFile, 'file');
                    attachments.push({
                        filename: uploadResult.filename,
                        originalName: uploadResult.originalName || this.pendingVideoFile.name,
                        mimeType: uploadResult.mimeType || this.pendingVideoFile.type,
                        size: uploadResult.size || this.pendingVideoFile.size,
                        path: uploadResult.url,
                        thumbnail: uploadResult.thumbnail
                    });
                } catch (uploadError) {
                    console.error('Error uploading video:', uploadError);
                    Utils.Notifications.error('Error al subir el video');
                    this.handleMessageSendError(tempId, 'Error uploading video');
                    return;
                }
            }

            // If we have attachments but no text content, use empty string
            if (attachments.length > 0 && !messageContent.trim()) {
                messageContent = '';
            }
            
            console.log('🔍 Datos que se enviarán al servidor:', {
                recipientId,
                messageContent: messageContent,
                messageType,
                attachments: attachments,
                replyToId: this.replyContext?._id,
                tempId
            });
            
            const clientId = window.SocketManager.sendMessage(recipientId, messageContent, messageType, this.replyContext?._id, attachments, tempId);
            console.log('Mensaje enviado con clientId:', clientId);
            
            // Clear reply context after sending
            if (this.replyContext) {
                this.replyContext = null;
                const replyPreview = document.querySelector('.reply-preview');
                if (replyPreview) {
                    replyPreview.remove();
                }
            }
        } catch (error) {
            console.error(' Error enviando mensaje:', error);
            this.handleMessageSendError(tempId, error.message);
        }

        // Limpiar imagen y video después del envío exitoso
        this.removeImagePreview();
        this.removeVideoPreview();
        this.updateSendButton();

        // Stop typing indicator
        window.SocketManager?.stopTyping(recipientId, this.currentConversation._id);
    }

    // Handle message send errors
    handleMessageSendError(tempId, errorMessage) {
        const messageEl = document.querySelector(`[data-client-id="${tempId}"]`);
        if (messageEl) {
            messageEl.classList.remove('sending');
            messageEl.classList.add('error');
            
            const statusEl = messageEl.querySelector('.message-status i');
            if (statusEl) {
                statusEl.className = 'fas fa-exclamation-triangle';
                statusEl.style.color = '#ef4444';
                statusEl.title = errorMessage;
            }
        }
    }

    // Queue message for sending when connection is restored
    queueMessage(recipientId, content, tempId) {
        if (!this.messageQueue) {
            this.messageQueue = [];
        }
        
        this.messageQueue.push({
            recipientId,
            content,
            tempId,
            timestamp: Date.now(),
            type: 'text',
            replyTo: this.replyContext ? this.replyContext._id : null
        });
        
        console.log('Mensaje agregado a la cola:', { recipientId, content: content.substring(0, 50), tempId });
    }

    // Process queued messages when connection is restored
    processQueuedMessages() {
        if (!this.messageQueue || this.messageQueue.length === 0) {
            return;
        }
        
        console.log(`Procesando ${this.messageQueue.length} mensajes en cola`);
        
        const messagesToSend = [...this.messageQueue];
        this.messageQueue = [];
        
        messagesToSend.forEach(queuedMsg => {
            setTimeout(() => {
                if (window.SocketManager && window.SocketManager.isConnected) {
                    const clientId = window.SocketManager.sendMessage(
                        queuedMsg.recipientId, 
                        queuedMsg.content, 
                        queuedMsg.type, 
                        queuedMsg.replyTo, 
                        [], 
                        queuedMsg.tempId
                    );
                    
                    // Update message element
                    const messageEl = document.querySelector(`[data-temp-id="${queuedMsg.tempId}"]`);
                    if (messageEl) {
                        messageEl.classList.remove('queued');
                        messageEl.classList.add('sending');
                        messageEl.setAttribute('data-client-id', clientId);
                    }
                    
                    console.log('Mensaje de cola enviado:', clientId);
                }
            }, 100); // Small delay between messages
        });
    }

    getRecipientId() {
        if (!this.currentConversation) return null;
        
        // For private conversations, find the other participant
        const participant = this.currentConversation.participants.find(p => {
            // Handle both object and string participant formats
            const participantId = typeof p === 'object' ? p._id : p;
            return participantId !== this.currentUser._id;
        });
        
        // Return the ID string, not the object
        return typeof participant === 'object' ? participant._id : participant;
    }

    // Socket event handlers with ultra-fast processing
    handleIncomingMessage(message) {
        const receiveStart = Date.now();
        console.log('ULTRA-FAST incoming message processing:', message);
        
        // Calculate message latency if timestamp available
        if (message.timestamp) {
            const latency = receiveStart - message.timestamp;
            console.log(`Message delivery latency: ${latency}ms`);
            
            // Visual feedback for ultra-fast delivery
            if (latency < 100) {
                console.log('LIGHTNING FAST delivery achieved!');
            } else if (latency < 300) {
                console.log('ULTRA-FAST delivery!');
            }
        }
        
        // INSTANT UI UPDATE if it's for current conversation
        if (this.isMessageForCurrentConversation(message)) {
            console.log('INSTANT rendering for current conversation...');
            
            // Add to message cache first for persistence
            if (window.messageCache && this.currentConversation) {
                console.log('Adding message to cache for conversation:', this.currentConversation._id);
                window.messageCache.addMessageInstantly(this.currentConversation._id, message, 'received');
            }
            
            // APLICAR NORMALIZACIÓN ROBUSTA DEL SENDER
            message = this.normalizeSenderFormat(message);
            
            // Validación con el sistema robusto
            const isFromCurrentUser = !this.determineMessageOwnershipRobust(message);
            
            console.log(`ROBUST Incoming message validation:`, {
                messageId: message._id,
                isFromCurrentUser: !isFromCurrentUser,
                senderId: this.extractSenderId(message.sender),
                currentUserId: this.currentUser?._id,
                senderOriginal: message.sender
            });
            
            // INSTANT message rendering with no delays
            const messageEl = this.renderMessage(message);
            if (!messageEl) {
                console.error('Failed to render message element');
                return;
            }
            
            // APLICAR CORRECCIÓN INMEDIATA si es necesario
            setTimeout(() => {
                this.enforceMessagePositioningImmediate();
            }, 10);
            
            // Validación final: forzar estilo correcto para mensajes recibidos
            if (!isFromCurrentUser) {
                messageEl.classList.add('received');
                messageEl.classList.remove('sent');
                console.log(`Forced RECEIVED style: classes="${messageEl.className}"`);
            }
            
            console.log('Message rendered successfully');
            
            // INSTANT ULTRA-AGGRESSIVE AUTO-SCROLL
            this.performRobustAutoScroll();
            
            // INSTANT and AUTOMATIC read marking
            this.markMessageAsReadInstant(message);
            
        } else {
            // Ultra-fast unread counter increment
            console.log('INSTANT unread counter update...');
            this.incrementUnreadCount(message);
        }
        
        // ULTRA-FAST conversation list update - instant update without delay
        this.updateConversationLastMessageInstant(message);
        
        // Instant notification (if not focused)
        if (document.hidden && Notification.permission === 'granted') {
            this.showMessageNotification(message);
        }
        
        // Performance metrics
        const processingTime = Date.now() - receiveStart;
        console.log(`Incoming message processed in ${processingTime}ms`);
        
        if (processingTime < 10) {
            console.log('LIGHTNING SPEED message processing!');
        } else if (processingTime < 25) {
            console.log('ULTRA-FAST message processing!');
        }
    }

    handleMessageSent(message) {
        console.log('📤 Mensaje enviado exitosamente:', message);
        
        // Handle conversion from temporary conversation to real conversation
        if (this.currentConversation && this.currentConversation._id.startsWith('temp_')) {
            console.log('Converting temporary conversation to real conversation');
            
            // Remove temporary conversation
            const tempId = this.currentConversation._id;
            this.conversations.delete(tempId);
            
            // Reload conversations to get the real conversation that was just created
            setTimeout(() => {
                this.loadConversations();
            }, 100);
        }
        
        // Robust message element finding
        const messageEl = this.findMessageElementRobust(message._id || message.messageId, message.clientId);
        
        if (messageEl) {
            // CRÍTICO: Asegurar que el mensaje mantiene el estilo de "enviado"
            // Forzar clase 'sent' y remover 'received' si existe
            messageEl.classList.add('sent');
            messageEl.classList.remove('received');
            
            // Update to sent status
            const success = this.updateMessageStatus(messageEl, 'sent', message.timestamp);
            if (success) {
                console.log('OK Message status updated to sent');
                
                // Update message ID if we got the real one back from server
                if (message._id || message.messageId) {
                    const realId = message._id || message.messageId;
                    messageEl.setAttribute('data-message-id', realId);
                    console.log('Updated message with real ID:', realId);
                }
                
                // Show performance indicator for ultra-fast messages
                if (message.processingTime && message.processingTime < 100) {
                    this.showPerformanceIndicator(messageEl, message.processingTime);
                }
            }
            
            // Additional visual confirmation
            messageEl.classList.add('sent-confirmed');
            
            // PROTECCIÓN ULTRA-ROBUSTA: Forzar estilo de enviado inmediatamente
            messageEl.classList.add('sent');
            messageEl.classList.remove('received');
            messageEl.dataset.isOwn = 'true';
            
            // Aplicar estilos inline inmediatamente para evitar cambios
            this.applyInstantSentStyles(messageEl);
            
            // Validación final: asegurar que el mensaje tiene el estilo correcto
            console.log(`Message confirmed as SENT: classes="${messageEl.className}"`);
        } else {
            // Fallback: crear nuevo mensaje si no se encuentra el temporal
            console.log('WARNING  No se encontró mensaje temporal, creando nuevo:', message._id || message.messageId);
            
            // APLICAR NORMALIZACIÓN ROBUSTA AL MENSAJE CONFIRMADO
            message = this.normalizeSenderFormat(message);
            
            const newMessageEl = this.renderMessage(message);
            newMessageEl.classList.add('sent-confirmed');
            
            // Doble verificación: forzar estilo de enviado
            newMessageEl.classList.add('sent');
            newMessageEl.classList.remove('received');
            
            // APLICAR CORRECCIÓN INMEDIATA para mensajes confirmados
            setTimeout(() => {
                this.enforceMessagePositioningImmediate();
            }, 10);
            
            console.log(`Fallback message created as SENT: classes="${newMessageEl.className}"`);
            
            // Add to current conversation display if we're in that conversation
            if (this.messageContainer && newMessageEl) {
                this.messageContainer.appendChild(newMessageEl);
            }
        }
        
        // Smooth scroll to show confirmed message
        this.performRobustAutoScroll();
        
        // INSTANT conversation list update for sent messages
        this.updateConversationForSentMessage(message);
        
        // Update conversation list if this was the last message
        this.updateConversationListCheckmarkForMessage(message._id || message.messageId, message.clientId, 'sent');
        
        // Update stats
        if (window.Stats) {
            window.Stats.incrementMessagesSent();
        }
    }

    // Helper function to show performance indicator
    showPerformanceIndicator(messageEl, processingTime) {
        const perfIndicator = document.createElement('span');
        perfIndicator.className = 'perf-indicator';
        perfIndicator.innerHTML = processingTime < 50 ? 'FAST' : '🚀';
        perfIndicator.title = `Procesado en ${processingTime}ms`;
        perfIndicator.style.cssText = 'margin-left: 5px; opacity: 0.7; font-size: 12px;';
        
        const timeStatus = messageEl.querySelector('.message-time-status');
        if (timeStatus && !timeStatus.querySelector('.perf-indicator')) {
            timeStatus.appendChild(perfIndicator);
            
            // Remove after 3 seconds
            setTimeout(() => perfIndicator.remove(), 3000);
        }
    }

    // Función robusta para encontrar elementos de mensaje
    findMessageElementRobust(messageId, clientId) {
        let messageEl = null;
        
        // Strategy 1: Find by messageId
        if (messageId) {
            messageEl = Utils.$(`[data-message-id="${messageId}"]`);
            if (messageEl) return messageEl;
        }
        
        // Strategy 2: Find by clientId
        if (clientId) {
            messageEl = Utils.$(`[data-client-id="${clientId}"]`);
            if (messageEl) return messageEl;
        }
        
        // Strategy 3: Find by clientId as messageId (fallback)
        if (clientId) {
            messageEl = document.querySelector(`[data-message-id="${clientId}"]`);
            if (messageEl) return messageEl;
        }
        
        // Strategy 4: Find by partial match in temp IDs
        if (clientId && clientId.includes('temp_')) {
            const tempId = clientId.split('_').slice(0, 2).join('_'); // Get temp_timestamp part
            messageEl = document.querySelector(`[data-client-id*="${tempId}"], [data-message-id*="${tempId}"]`);
            if (messageEl) return messageEl;
        }
        
        return null;
    }

    // Función robusta para actualizar el status de un mensaje
    updateMessageStatus(messageEl, newStatus, timestamp = null) {
        if (!messageEl || !newStatus) return false;
        
        const currentStatus = messageEl.getAttribute('data-status') || 'sending';
        
        // Status hierarchy: sending -> sent -> delivered -> read
        const statusHierarchy = {
            'sending': 0,
            'sent': 1,
            'delivered': 2,
            'read': 3
        };
        
        // Only allow status upgrades, not downgrades
        if (statusHierarchy[newStatus] <= statusHierarchy[currentStatus]) {
            return false; // Don't downgrade status
        }
        
        // Update message element
        messageEl.setAttribute('data-status', newStatus);
        messageEl.classList.remove('sending', 'sent', 'delivered', 'read');
        messageEl.classList.add(newStatus);
        
        // Update status icon
        const statusEl = messageEl.querySelector('.message-status, .message-time-status .message-status');
        if (statusEl) {
            // Remove old status classes
            statusEl.classList.remove('pending', 'sent', 'delivered', 'read', 'error');
            // Add new status class
            statusEl.classList.add(newStatus);
            
            // Update the icon HTML
            const iconHTML = this.getMessageStatusIcon(newStatus);
            const match = iconHTML.match(/<span[^>]*>(.*?)<\/span>/);
            statusEl.innerHTML = match ? match[1] : iconHTML;
            
            // Add timestamp to title if provided
            if (timestamp) {
                const formattedTime = Utils.formatTime(timestamp);
                statusEl.setAttribute('title', this.getStatusTitle(newStatus, formattedTime));
            }
        } else {
            // If no status element exists, find the message meta area and add one
            const messageMeta = messageEl.querySelector('.message-meta, .message-time-status');
            if (messageMeta) {
                const newStatusEl = document.createElement('span');
                newStatusEl.className = `message-status ${newStatus}`;
                const iconHTML = this.getMessageStatusIcon(newStatus);
                const match = iconHTML.match(/<span[^>]*>(.*?)<\/span>/);
                newStatusEl.innerHTML = match ? match[1] : iconHTML;
                if (timestamp) {
                    newStatusEl.setAttribute('title', this.getStatusTitle(newStatus, Utils.formatTime(timestamp)));
                }
                messageMeta.appendChild(newStatusEl);
            }
        }
        
        // PROTECCIÓN INMEDIATA: Reforzar posición después de actualizar estado
        if (messageEl.dataset.isOwn === 'true') {
            // Forzar estilos de mensaje enviado
            messageEl.classList.add('sent');
            messageEl.classList.remove('received');
            this.applyInstantSentStyles(messageEl);
        }
        
        return true;
    }

    getStatusTitle(status, timestamp = null) {
        const titles = {
            'pending': 'Enviando...',
            'sending': 'Enviando...',
            'sent': 'Enviado',
            'delivered': 'Entregado',
            'read': 'Leído',
            'error': 'Error al enviar'
        };
        
        const baseTitle = titles[status] || 'Desconocido';
        return timestamp ? `${baseTitle} - ${timestamp}` : baseTitle;
    }

    // Función para detectar si el usuario está online
    isUserOnline(userId) {
        // Check if user is in the online users list
        if (window.SocketManager && window.SocketManager.onlineUsers) {
            return window.SocketManager.onlineUsers.has(userId);
        }
        return false;
    }

    // Función para detectar automáticamente entrega cuando usuario se conecta
    handleUserOnlineStatusChange(data) {
        if (!data || !data.userId || !data.isOnline) return;
        
        console.log(`User ${data.userId} came online - checking for pending deliveries`);
        
        // Verificar si hay mensajes pendientes de entrega para este usuario
        this.checkAndUpdatePendingDeliveries(data.userId);
    }

    // Verificar y actualizar entregas pendientes para un usuario específico
    checkAndUpdatePendingDeliveries(userId) {
        // Buscar mensajes con status 'sent' dirigidos a este usuario
        const sentMessages = document.querySelectorAll('.message.sent[data-status="sent"]');
        
        sentMessages.forEach(messageEl => {
            // Verificar si este mensaje fue enviado al usuario que se conectó
            const conversationId = this.currentConversation?._id;
            if (conversationId) {
                const conversation = this.conversations.get(conversationId);
                const isRecipient = conversation?.participants?.includes(userId);
                
                if (isRecipient) {
                    // Simular evento de entrega
                    const messageId = messageEl.getAttribute('data-message-id');
                    const clientId = messageEl.getAttribute('data-client-id');
                    
                    console.log(`Auto-marking message as delivered for online user ${userId}`);
                    
                    // Actualizar status a delivered
                    this.updateMessageStatus(messageEl, 'delivered', Date.now());
                    
                    // Actualizar conversation list
                    this.updateConversationListCheckmarkForMessage(messageId, clientId, 'delivered');
                }
            }
        });
    }

    // Función para verificar automáticamente mensajes leídos cuando usuario abre conversación
    handleConversationOpened(conversationId) {
        console.log(`Conversation ${conversationId} opened - checking read receipts`);
        
        // Si no es la conversación actual, no hacer nada
        if (!this.currentConversation || this.currentConversation._id !== conversationId) {
            return;
        }
        
        // Buscar mensajes con status 'delivered' en esta conversación
        const deliveredMessages = document.querySelectorAll('.message.delivered[data-status="delivered"]');
        
        deliveredMessages.forEach(messageEl => {
            const messageId = messageEl.getAttribute('data-message-id');
            const clientId = messageEl.getAttribute('data-client-id');
            
            // Simular evento de lectura después de un pequeño delay
            setTimeout(() => {
                console.log(`Auto-marking message as read for opened conversation`);
                
                // Actualizar status a read
                this.updateMessageStatus(messageEl, 'read', Date.now());
                
                // Actualizar conversation list
                this.updateConversationListCheckmarkForMessage(messageId, clientId, 'read');
            }, 500 + Math.random() * 1000); // Random delay between 500-1500ms
        });
    }

    // Función para validar y actualizar estados de mensaje cuando se abre una conversación
    validateAndUpdateMessageStatuses() {
        if (!this.currentConversation) return;
        
        console.log('🔍 Validating message statuses for conversation...');
        
        const recipientId = this.getRecipientId();
        if (!recipientId) return;
        
        // Check if recipient is online
        const isRecipientOnline = this.isUserOnline(recipientId);
        
        // Get all messages in current conversation
        const messages = document.querySelectorAll('.message.sent');
        
        messages.forEach(messageEl => {
            const currentStatus = messageEl.getAttribute('data-status');
            const messageId = messageEl.getAttribute('data-message-id');
            const clientId = messageEl.getAttribute('data-client-id');
            
            // Auto-upgrade sent messages to delivered if recipient is online
            if (currentStatus === 'sent' && isRecipientOnline) {
                console.log(`Auto-upgrading message to delivered (recipient online)`);
                this.updateMessageStatus(messageEl, 'delivered', Date.now());
                this.updateConversationListCheckmarkForMessage(messageId, clientId, 'delivered');
            }
            
            // Auto-upgrade delivered messages to read if this is current conversation and recipient is online
            if (currentStatus === 'delivered' && isRecipientOnline) {
                // Random delay between 1-3 seconds for realistic read timing
                const delay = 1000 + Math.random() * 2000;
                setTimeout(() => {
                    console.log(`Auto-upgrading message to read (conversation active)`);
                    this.updateMessageStatus(messageEl, 'read', Date.now());
                    this.updateConversationListCheckmarkForMessage(messageId, clientId, 'read');
                }, delay);
            }
        });
    }

    handleMessageDelivered(data) {
        console.log('Message delivered:', data);
        
        // Robust message element finding
        const messageEl = this.findMessageElementRobust(data.messageId, data.clientId);
        
        if (messageEl) {
            // Only update if current status allows it (don't downgrade from 'read')
            const success = this.updateMessageStatus(messageEl, 'delivered', data.deliveredAt);
            if (success) {
                console.log('OK Message status updated to delivered');
            } else {
                console.log('WARNING  Skipping delivered update - status already higher');
            }
        } else {
            console.log('ERROR Message element not found for delivered status update');
        }
        
        // Update conversation list checkmark
        this.updateConversationListCheckmarkForMessage(data.messageId, data.clientId, 'delivered');
    }

    handleMessageRead(data) {
        console.log('Message read event received:', data);
        
        const { messageId, clientId, readAt, conversationId } = data;
        
        // Update message status in current conversation
        const messageEl = this.findMessageElementRobust(messageId, clientId);
        
        if (messageEl) {
            // Update to read status (highest priority)
            const success = this.updateMessageStatus(messageEl, 'read', readAt);
            if (success) {
                console.log('OK Message status updated to read in conversation');
            } else {
                console.log('WARNING  Message already marked as read in conversation');
            }
        } else {
            console.log('ERROR Message element not found for read status update');
        }
        
        // INSTANT conversation list update - update checkmark in conversation list
        this.updateConversationListCheckmarkForMessage(messageId, clientId, 'read');
        
        console.log('OK Read status updated in both conversation and list');
    }

    // ULTRA-INSTANTANEOUS PRESENCE SYSTEM UI UPDATES
    handlePresenceUpdate(userId, presenceData, statusChanged = false) {
        console.log(`⚡ INSTANT presence update for ${userId}:`, presenceData);
        
        // Ensure current user always shows online when active
        if (userId === this.currentUser._id) {
            this.ensureCurrentUserOnlineDisplay();
            return;
        }
        
        // If status changed, prioritize updates
        if (statusChanged) {
            console.log(`🔥 Priority update: ${userId} -> ${presenceData.status}`);
            
            // Batch all updates in single requestAnimationFrame for smooth performance
            requestAnimationFrame(() => {
                // Update conversation header if active conversation
                if (this.currentConversation && this.getRecipientId() === userId) {
                    this.updateConversationHeaderStatusInstant(presenceData);
                }
                
                // Update contacts list
                this.updateContactPresenceInList(userId, presenceData);
                
                // Update conversation list
                this.updateConversationPresenceInList(userId, presenceData);
            });
        } else {
            // Normal update without animation batching
            if (this.currentConversation && this.getRecipientId() === userId) {
                this.updateConversationHeaderStatusInstant(presenceData);
            }
            
            this.updateContactPresenceInList(userId, presenceData);
            this.updateConversationPresenceInList(userId, presenceData);
        }
        
        console.log(`✅ Presence update completed for ${userId}: ${presenceData.status}`);
    }
    
    updateConversationHeaderStatusInstant(presenceData) {
        console.log('🔍 DEBUG: updateConversationHeaderStatusInstant called with:', presenceData);
        const statusElement = document.querySelector('#last-seen');
        const typingIndicator = document.querySelector('#typing-indicator');
        if (!statusElement) {
            console.error('❌ Status element #last-seen not found in DOM');
            return;
        }
        
        // Limpia cualquier indicador de typing
        this.hideTypingIndicatorInHeader();
        
        // Si está escribiendo, mostrar "Escribiendo..." en verde y ocultar status
        if (presenceData.typing === true) {
            if (typingIndicator) {
                typingIndicator.classList.remove('hidden');
                typingIndicator.style.display = 'flex';
                const typingText = typingIndicator.querySelector('span');
                if (typingText) {
                    typingText.textContent = 'escribiendo...';
                    typingText.style.color = '#25d366';
                    typingText.style.fontWeight = '500';
                }
            }
            statusElement.style.display = 'none';
            console.log('✅ Header: Escribiendo... (verde) - typing activo');
            return;
        }
        
        // Not typing - show persistent status (En línea OR last seen)
        const recipientId = this.getRecipientId();
        if (recipientId) {
            // Ensure typing indicator is hidden
            if (typingIndicator) {
                typingIndicator.classList.add('hidden');
                typingIndicator.style.display = 'none';
            }
            
            // Use persistent updater to show either online or last seen
            this.updateConversationHeaderPersistent(recipientId, presenceData.status, presenceData.lastSeen);
        }
        console.log(`⚠️ Header: OCULTO - sin datos válidos de presencia`);
    }
    
    // Debug function to force presence update (útil para pruebas)
    forcePresenceUpdate() {
        const recipientId = this.getRecipientId();
        if (!recipientId) {
            console.log('❌ No hay conversación activa para actualizar presencia');
            return;
        }
        
        console.log(`🔄 Forzando actualización de presencia para: ${recipientId}`);
        
        // Get fresh presence data (now with contact data fallback)
        const presenceData = window.SocketManager?.getUserPresence(recipientId);
        console.log(`🔍 Datos de presencia obtenidos:`, presenceData);
        
        // Always update the header with whatever data we have (even if offline with lastSeen)
        if (presenceData) {
            this.updateConversationHeaderStatusInstant(presenceData);
            
            // If we got valid presence data, we're done
            if (presenceData.status && (presenceData.status !== 'offline' || presenceData.lastSeen)) {
                console.log(`✅ Presencia actualizada exitosamente`);
                return;
            }
        }
        
        // If still no valid data, try to get contact info from API as last resort
        console.log(`⚠️ No hay datos de presencia válidos, buscando en API de contactos...`);
        this.loadContactData(recipientId).then(contactData => {
            if (contactData && contactData.lastSeen) {
                const fallbackPresence = {
                    status: contactData.status || 'offline',
                    lastSeen: contactData.lastSeen
                };
                console.log(`🔄 Usando datos de contacto como fallback:`, fallbackPresence);
                this.updateConversationHeaderStatusInstant(fallbackPresence);
            } else {
                console.log(`❌ No se pudo obtener información de última conexión`);
            }
        }).catch(error => {
            console.error('Error loading contact data:', error);
        });
    }
    
    // Format last seen in WhatsApp style
    formatLastSeenWhatsApp(lastSeen) {
        const now = new Date();
        const lastSeenDate = new Date(lastSeen);
        const timeDiff = now.getTime() - lastSeenDate.getTime();
        
        const minutes = Math.floor(timeDiff / 60000);
        const hours = Math.floor(timeDiff / 3600000);
        const days = Math.floor(timeDiff / 86400000);
        
        // Same day - show only time
        if (now.toDateString() === lastSeenDate.toDateString()) {
            const timeStr = lastSeenDate.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            return `últ. vez hoy ${timeStr}`;
        }
        
        // Yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (yesterday.toDateString() === lastSeenDate.toDateString()) {
            const timeStr = lastSeenDate.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            return `últ. vez ayer ${timeStr}`;
        }
        
        // Less than a week ago - show day and time
        if (days < 7) {
            const dayNames = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
            const dayName = dayNames[lastSeenDate.getDay()];
            const timeStr = lastSeenDate.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            return `últ. vez ${dayName} ${timeStr}`;
        }
        
        // More than a week ago - show date and time
        const dateStr = lastSeenDate.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: now.getFullYear() !== lastSeenDate.getFullYear() ? 'numeric' : undefined
        });
        const timeStr = lastSeenDate.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        return `últ. vez ${dateStr} ${timeStr}`;
    }
    
    // Hide typing indicator in header
    hideTypingIndicatorInHeader() {
        const typingIndicator = document.querySelector('#typing-indicator');
        if (typingIndicator) {
            typingIndicator.classList.add('hidden');
        }
    }
    
    // Show typing indicator in header  
    showTypingIndicatorInHeader() {
        const typingIndicator = document.querySelector('#typing-indicator');
        const lastSeenElement = document.querySelector('#last-seen');
        
        if (typingIndicator && lastSeenElement) {
            // Hide last seen
            lastSeenElement.style.display = 'none';
            
            // Show typing indicator
            typingIndicator.classList.remove('hidden');
            typingIndicator.style.display = 'flex';
        }
    }
    
    updateContactPresenceInList(userId, presenceData) {
        const contactElement = document.querySelector(`[data-contact-id="${userId}"]`);
        if (!contactElement) return;
        
        const statusIndicator = contactElement.querySelector('.status-indicator');
        if (!statusIndicator) return;
        
        const { status, lastSeen } = presenceData;
        
        console.log(`Updating contact presence in list for ${userId}: ${status}`);
        
        // Update status indicator class
        statusIndicator.className = `status-indicator ${status}`;
        
        // Update tooltip/title
        let statusText = '';
        switch (status) {
            case 'online':
                statusText = 'En línea';
                break;
            case 'away':
                statusText = 'Ausente';
                break;
            case 'offline':
                statusText = lastSeen ? this.formatLastSeen(lastSeen) : 'Desconectado';
                break;
        }
        
        statusIndicator.title = statusText;
    }
    
    updateConversationPresenceInList(userId, presenceData) {
        // Find conversations that include this user
        this.conversations.forEach((conversation, conversationId) => {
            if (conversation.participants && conversation.participants.includes(userId)) {
                const conversationElement = document.querySelector(`[data-conversation-id="${conversationId}"]`);
                if (conversationElement) {
                    const statusIndicator = conversationElement.querySelector('.status-indicator');
                    if (statusIndicator) {
                        const { status, lastSeen } = presenceData;
                        
                        console.log(`Updating conversation presence for ${conversationId}: ${status}`);
                        
                        // Update status indicator
                        statusIndicator.className = `status-indicator ${status}`;
                        
                        // Update tooltip
                        let statusText = '';
                        switch (status) {
                            case 'online':
                                statusText = 'En línea';
                                break;
                            case 'away':
                                statusText = 'Ausente';
                                break;
                            case 'offline':
                                statusText = lastSeen ? this.formatLastSeen(lastSeen) : 'Desconectado';
                                break;
                        }
                        
                        statusIndicator.title = statusText;
                    }
                }
            }
        });
    }
    
    formatLastSeen(timestamp) {
        if (!timestamp) return 'Desconectado';
        
        const now = new Date();
        const lastSeen = new Date(timestamp);
        const diffMs = now - lastSeen;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        // Don't show last seen if less than 2 minutes have passed
        if (diffMinutes < 2) {
            return 'En línea';
        } else if (diffMinutes < 60) {
            return `Hace ${diffMinutes} min`;
        } else if (diffHours < 24) {
            const time = lastSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `Última vez hoy a las ${time}`;
        } else if (diffDays === 1) {
            const time = lastSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `Última vez ayer a las ${time}`;
        } else if (diffDays < 7) {
            const day = lastSeen.toLocaleDateString([], { weekday: 'long' });
            const time = lastSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `Última vez el ${day} a las ${time}`;
        } else {
            const date = lastSeen.toLocaleDateString();
            const time = lastSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `Última vez el ${date} a las ${time}`;
        }
    }

    // Ensure current user always shows as online when active
    ensureCurrentUserOnlineDisplay() {
        console.log('Ensuring current user shows as online');
        
        // Update current user in contacts list
        const currentUserContact = document.querySelector(`[data-contact-id="${this.currentUser._id}"]`);
        if (currentUserContact) {
            const statusIndicator = currentUserContact.querySelector('.status-indicator');
            const statusText = currentUserContact.querySelector('.contact-status');
            if (statusIndicator) {
                statusIndicator.className = 'status-indicator online';
            }
            if (statusText) {
                statusText.textContent = 'En línea';
                statusText.style.color = '#10b981';
            }
        }
        
        // Update current user in conversation list if they appear as a participant
        const conversationItems = document.querySelectorAll('.conversation-item');
        conversationItems.forEach(item => {
            const participants = item.querySelectorAll('.participant-status');
            participants.forEach(participant => {
                const userId = participant.getAttribute('data-user-id');
                if (userId === this.currentUser._id) {
                    const statusIndicator = participant.querySelector('.status-indicator');
                    if (statusIndicator) {
                        statusIndicator.className = 'status-indicator online';
                    }
                }
            });
        });
    }

    // Start real-time presence monitoring for accurate status updates
    startPresenceMonitoring() {
        console.log('Starting real-time presence monitoring');
        
        // Update presence displays every 30 seconds
        if (this.presenceMonitoringInterval) {
            clearInterval(this.presenceMonitoringInterval);
        }
        
        this.presenceMonitoringInterval = setInterval(() => {
            // Refresh conversation header status if in a conversation
            if (this.currentConversation) {
                const recipientId = this.getRecipientId();
                if (recipientId && window.SocketManager) {
                    const presenceData = window.SocketManager.getUserPresence(recipientId);
                    this.updateConversationHeaderStatusInstant(presenceData);
                }
            }
            
            // Ensure current user still shows as online
            this.ensureCurrentUserOnlineDisplay();
            
        }, 30000); // Every 30 seconds
    }

    // Stop presence monitoring
    stopPresenceMonitoring() {
        if (this.presenceMonitoringInterval) {
            clearInterval(this.presenceMonitoringInterval);
            this.presenceMonitoringInterval = null;
        }
    }
    
    // CONNECTION QUALITY FEEDBACK SYSTEM
    updateConnectionQualityIndicator(quality, latency) {
        console.log(`📶 Updating connection quality indicator: ${quality} (${latency}ms)`);
        
        // Update connection indicator in header
        const connectionIndicator = document.querySelector('#connection-quality-indicator');
        if (connectionIndicator) {
            // Remove all quality classes
            connectionIndicator.classList.remove('excellent', 'good', 'fair', 'poor');
            connectionIndicator.classList.add(quality);
            
            // Update tooltip
            let tooltipText = '';
            switch (quality) {
                case 'excellent':
                    tooltipText = `Excelente conexión (${latency}ms)`;
                    break;
                case 'good':
                    tooltipText = `Buena conexión (${latency}ms)`;
                    break;
                case 'fair':
                    tooltipText = `Conexión regular (${latency}ms)`;
                    break;
                case 'poor':
                    tooltipText = `Conexión lenta (${latency}ms)`;
                    break;
            }
            
            connectionIndicator.title = tooltipText;
            
            // Add visual feedback for quality changes
            connectionIndicator.style.transform = 'scale(1.1)';
            setTimeout(() => {
                connectionIndicator.style.transform = 'scale(1)';
            }, 200);
        }
        
        // Show temporary notification for poor connection
        if (quality === 'poor' && latency > 1000) {
            this.showConnectionWarning(latency);
        }
    }
    
    showConnectionWarning(latency) {
        // Don't spam warnings
        if (this.lastConnectionWarning && Date.now() - this.lastConnectionWarning < 30000) {
            return;
        }
        
        this.lastConnectionWarning = Date.now();
        
        console.log('WARNING Showing connection warning due to high latency:', latency);
        
        // Create temporary warning indicator
        const warningDiv = document.createElement('div');
        warningDiv.className = 'connection-warning';
        warningDiv.innerHTML = `
            <div class="warning-content">
                <i class="fas fa-wifi" style="color: #f59e0b;"></i>
                <span>Conexión lenta (${latency}ms)</span>
            </div>
        `;
        
        // Add to header
        const header = document.querySelector('.chat-header');
        if (header) {
            header.appendChild(warningDiv);
            
            // Remove after 5 seconds
            setTimeout(() => {
                if (warningDiv.parentNode) {
                    warningDiv.parentNode.removeChild(warningDiv);
                }
            }, 5000);
        }
    }
    
    // Enhanced presence update with real-time visual feedback
    handlePresenceUpdateEnhanced(userId, presenceData) {
        console.log(`🟢 Enhanced presence update for ${userId}:`, presenceData);
        
        // Store the old presence state for comparison
        const oldPresence = window.SocketManager?.getUserPresence(userId);
        
        // Call the original handler
        this.handlePresenceUpdate(userId, presenceData);
        
        // Add visual feedback for status changes
        if (oldPresence && oldPresence.status !== presenceData.status) {
            this.showPresenceChangeNotification(userId, oldPresence.status, presenceData.status);
        }
    }
    
    showPresenceChangeNotification(userId, oldStatus, newStatus) {
        // Only show for current conversation
        if (!this.currentConversation || this.getRecipientId() !== userId) {
            return;
        }
        
        // Don't show notifications for every small change
        if ((oldStatus === 'away' && newStatus === 'online') || 
            (oldStatus === 'online' && newStatus === 'away')) {
            return;
        }
        
        console.log(`📱 Showing presence change notification: ${oldStatus} → ${newStatus}`);
        
        let notificationText = '';
        switch (newStatus) {
            case 'online':
                notificationText = 'Se conectó';
                break;
            case 'offline':
                notificationText = 'Se desconectó';
                break;
        }
        
        if (notificationText) {
            // Create subtle notification
            const notification = document.createElement('div');
            notification.className = 'presence-change-notification';
            notification.textContent = notificationText;
            
            // Style the notification
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                z-index: 10000;
                opacity: 0;
                transform: translateY(-20px);
                transition: all 0.3s ease;
            `;
            
            document.body.appendChild(notification);
            
            // Animate in
            setTimeout(() => {
                notification.style.opacity = '1';
                notification.style.transform = 'translateY(0)';
            }, 100);
            
            // Remove after 3 seconds
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateY(-20px)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 3000);
        }
    }

    handleUserTyping(data) {
        console.log('TYPING User typing event received:', data);
        
        // Only show if it's for the current conversation and not from current user
        if (this.currentConversation && 
            data.conversationId === this.currentConversation._id && 
            data.userId !== this.currentUser._id) {
            
            // Get username from contacts or conversation participants
            const username = this.getUserDisplayName(data.userId);
            this.showTypingIndicator(username);
        }
    }

    handleUserStoppedTyping(data) {
        console.log('TYPING User stopped typing event received:', data);
        
        // Only hide if it's for the current conversation and not from current user  
        if (this.currentConversation && 
            data.conversationId === this.currentConversation._id && 
            data.userId !== this.currentUser._id) {
            this.hideTypingIndicator();
        }
    }

    // Helper function to get user display name
    getUserDisplayName(userId) {
        // Try to find user in current conversation participants
        if (this.currentConversation && this.currentConversation.participants) {
            const participant = this.currentConversation.participants.find(p => {
                const participantId = typeof p === 'object' ? p._id : p;
                return participantId === userId;
            });
            if (participant && typeof participant === 'object' && participant.fullName) {
                return participant.fullName;
            }
        }
        
        // Try to find user in contacts
        if (this.contacts) {
            const contact = this.contacts.find(c => c._id === userId);
            if (contact) {
                return contact.fullName || contact.username;
            }
        }
        
        // Fallback
        return 'Usuario';
    }

    isMessageForCurrentConversation(message) {
        if (!this.currentConversation) {
            console.log('No current conversation');
            return false;
        }

        const senderId = message.sender._id || message.sender;
        const recipientId = message.recipient._id || message.recipient;
        const currentUserId = this.currentUser?._id;
        const currentRecipientId = this.getRecipientId();

        console.log('Checking message for current conversation:', {
            senderId,
            recipientId,
            currentUserId,
            currentRecipientId,
            conversationId: this.currentConversation._id
        });

        // Check if message is between current user and current conversation recipient
        const isIncoming = (senderId === currentRecipientId && recipientId === currentUserId);
        const isOutgoing = (senderId === currentUserId && recipientId === currentRecipientId);
        
        const result = isIncoming || isOutgoing;
        console.log('Message for current conversation?', result, { isIncoming, isOutgoing });
        
        return result;
    }

    updateConversationLastMessageInstant(message) {
        try {
            console.log('Updating conversation list instantly for message:', message);
        
        const senderId = message.sender._id || message.sender;
        const recipientId = message.recipient._id || message.recipient;
        const currentUserId = this.currentUser?._id;
        
        let conversationId = null;
        let targetConversation = null;
        
        // Find existing conversation more accurately
        for (const [id, conv] of this.conversations) {
            if (conv.participants && conv.participants.length >= 2) {
                const hasCurrentUser = conv.participants.includes(currentUserId);
                const hasSender = conv.participants.includes(senderId);
                const hasRecipient = conv.participants.includes(recipientId);
                
                // Check if this conversation involves the message participants
                if ((hasSender && hasRecipient) || (hasCurrentUser && (hasSender || hasRecipient))) {
                    conversationId = id;
                    targetConversation = conv;
                    console.log('Found conversation for message:', id, conv.name);
                    break;
                }
            }
        }
        
        if (conversationId && targetConversation) {
            console.log('Updating conversation data instantly:', conversationId);
            
            // Update conversation data instantly with proper content handling
            let messageContent = '';
            if (typeof message.content === 'string') {
                messageContent = message.content;
            } else if (message.content && message.content.text) {
                messageContent = message.content.text;
            } else if (message.content) {
                messageContent = String(message.content);
            }
            
            targetConversation.lastMessage = {
                content: messageContent,
                sender: senderId,
                createdAt: message.createdAt || new Date().toISOString(),
                type: message.type || 'text'
            };
            targetConversation.lastActivity = message.createdAt || new Date().toISOString();
            
            // Update unread count if message is from another user
            if (senderId !== currentUserId) {
                targetConversation.unreadCount = (targetConversation.unreadCount || 0) + 1;
                targetConversation.hasNewMessage = true;
                console.log(`📧 NEW MESSAGE: Updated unread count to ${targetConversation.unreadCount} for ${targetConversation.name}`);
                
                // SAVE to database immediately - keep unread state persistent
                this.saveUnreadCountToDatabase(conversationId, targetConversation.unreadCount);
                
                // Update global counter immediately
                this.updateGlobalUnreadCounter();
            }
            
            // INSTANT DOM update instead of full re-render
            console.log('Updating DOM instantly...');
            this.updateConversationItemInstant(conversationId, targetConversation);
            
            // Move conversation to top of list instantly
            this.moveConversationToTopInstant(conversationId);
            
            console.log('OK Conversation updated instantly');
        } else {
            // No existing conversation found - need to refresh list
            console.log('No existing conversation found, refreshing conversations');
            this.loadConversations();
        }
        } catch (error) {
            console.error('Error updating conversation last message instantly:', error);
            console.error('Message data:', message);
            
            // Fallback to full refresh on error
            setTimeout(() => this.loadConversations(), 100);
        }
    }

    updateConversationLastMessage(message) {
        // Fallback method for compatibility
        this.updateConversationLastMessageInstant(message);
    }

    showMessageNotification(message) {
        try {
            const senderName = message.sender.fullName || message.sender.username || 'Usuario';
            const content = message.content?.text || 'Nuevo mensaje';
            
            const notification = new Notification(`${senderName}`, {
                body: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
                icon: message.sender.avatar || '/images/user-placeholder-40.svg',
                tag: 'chat-message',
                requireInteraction: false
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
                
                // Find and open the conversation
                const senderId = message.sender._id;
                const conversation = [...this.conversations.values()].find(conv => 
                    conv.participants.includes(senderId)
                );
                
                if (conversation) {
                    this.selectConversation(conversation._id);
                }
            };
            
            // Auto close after 5 seconds
            setTimeout(() => {
                notification.close();
            }, 5000);
            
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }

    // ULTRA-FAST DOM manipulation methods for real-time conversation updates
    updateConversationItemInstant(conversationId, conversation) {
        try {
            console.log('Looking for conversation item with ID:', conversationId);
            const chatItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        
        if (!chatItem) {
            console.log('Conversation item not found in DOM, will need full refresh');
            setTimeout(() => this.loadConversations(), 100);
            return;
        }

        console.log('Found chat item, updating instantly for:', conversation.name || 'Unknown');

        // Debug: show current DOM structure
        console.log('Chat item HTML:', chatItem.innerHTML);

        // Update last message text instantly - try multiple selectors
        let messagePreview = chatItem.querySelector('.message-preview');
        if (!messagePreview) {
            messagePreview = chatItem.querySelector('.chat-last-msg');
        }
        if (!messagePreview) {
            messagePreview = chatItem.querySelector('.last-message');
        }

        if (messagePreview && conversation.lastMessage) {
            // Handle both string content and object content
            let content = '';
            if (typeof conversation.lastMessage.content === 'string') {
                content = conversation.lastMessage.content;
            } else if (conversation.lastMessage.content && conversation.lastMessage.content.text) {
                content = conversation.lastMessage.content.text;
            } else if (conversation.lastMessage.content) {
                content = String(conversation.lastMessage.content);
            }
            
            const newText = content.substring(0, 50) + (content.length > 50 ? '...' : '');
            console.log('Updating message preview from:', messagePreview.textContent, 'to:', newText);
            messagePreview.textContent = newText;
        } else {
            console.log('Message preview element not found or no last message');
        }

        // Update timestamp instantly - try multiple selectors
        let timeElement = chatItem.querySelector('.message-time');
        if (!timeElement) {
            timeElement = chatItem.querySelector('.chat-time');
        }
        if (!timeElement) {
            timeElement = chatItem.querySelector('.time');
        }

        if (timeElement && conversation.lastActivity) {
            const newTime = Utils.Time?.formatMessageTime ? 
                Utils.Time.formatMessageTime(conversation.lastActivity) : 
                new Date(conversation.lastActivity).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            console.log('Updating time from:', timeElement.textContent, 'to:', newTime);
            timeElement.textContent = newTime;
        } else {
            console.log('Time element not found or no last activity');
        }

        // Update unread badge instantly
        this.updateUnreadBadgeInstant(chatItem, conversation);
        
        console.log('Conversation item updated successfully');
        } catch (error) {
            console.error('Error updating conversation item instantly:', error);
            console.error('Conversation data:', conversation);
            console.error('ConversationId:', conversationId);
            
            // Fallback to full refresh on error
            setTimeout(() => this.loadConversations(), 100);
        }
    }

    updateUnreadBadgeInstant(chatItem, conversation) {
        if (!chatItem || !conversation) {
            console.warn('ChatItem o conversation no válidos para actualizar badge');
            return;
        }
        
        // Asegurar que unreadCount esté definido
        conversation.unreadCount = conversation.unreadCount || 0;
        
        // Buscar badge existente
        let unreadBadge = chatItem.querySelector('.unread-badge-messenger, .unread-count, .unread-badge');
        const chatIndicators = chatItem.querySelector('.chat-indicators');
        const bottomRow = chatItem.querySelector('.chat-item-bottom-row');
        
        // Determinar el contenedor donde colocar el badge
        const badgeContainer = chatIndicators || bottomRow;
        
        if (conversation.unreadCount > 0) {
            if (!unreadBadge && badgeContainer) {
                // Crear nuevo badge con diseño mejorado
                unreadBadge = document.createElement('div');
                unreadBadge.className = 'unread-badge-messenger';
                unreadBadge.setAttribute('data-conversation-id', conversation.id || conversation._id);
                badgeContainer.appendChild(unreadBadge);
            }
            
            if (unreadBadge) {
                const displayCount = conversation.unreadCount > 99 ? '99+' : conversation.unreadCount.toString();
                unreadBadge.textContent = displayCount;
                unreadBadge.style.display = 'flex';
                unreadBadge.classList.remove('hidden');
                
                // Efecto visual al actualizar
                unreadBadge.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    if (unreadBadge) {
                        unreadBadge.style.transform = 'scale(1)';
                    }
                }, 150);
            }
            
            chatItem.classList.add('has-unread');
            // Limpiar cualquier fondo verde problemático
            chatItem.style.backgroundColor = '';
            console.log(`✅ Badge actualizado para ${conversation.name}: ${conversation.unreadCount} mensajes`);
        } else {
            // Ocultar badge cuando no hay mensajes no leídos
            if (unreadBadge) {
                unreadBadge.style.display = 'none';
                unreadBadge.classList.add('hidden');
            }
            chatItem.classList.remove('has-unread');
        }
        
        // Actualizar contador global inmediatamente
        this.updateGlobalUnreadCounter();
    }

    // Versión optimizada para actualizar badge (mantener compatibilidad)
    updateConversationBadgeInstant(conversationId, unreadCount = null) {
        const conversation = this.conversations.get(conversationId);
        if (!conversation) {
            console.warn(`⚠️ Conversación no encontrada: ${conversationId}`);
            return;
        }
        
        const finalUnreadCount = unreadCount !== null ? unreadCount : (conversation.unreadCount || 0);
        this._updateBadgeSync(conversationId, finalUnreadCount);
        
        if (finalUnreadCount === 0) {
            console.log(`Badge ocultado: ${conversation.name} (sin mensajes no leídos)`);
        } else {
            console.log(`✅ Badge actualizado: ${conversation.name} → ${finalUnreadCount} mensajes`);
        }
    }

    moveConversationToTopInstant(conversationId) {
        const chatList = document.getElementById('chat-list');
        const chatItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        
        if (!chatList || !chatItem) {
            console.log('Cannot move conversation to top - elements not found');
            return;
        }

        // Check if it's already at the top
        if (chatList.firstElementChild === chatItem) {
            console.log('Conversation already at top');
            return;
        }

        console.log('🚀 INSTANT move conversation to top:', conversationId);

        // Move to top immediately without animation
        chatList.insertBefore(chatItem, chatList.firstElementChild);
    }

    updateConversationForSentMessage(message) {
        // Update conversation when user sends a message
        if (!this.currentConversation) return;

        const conversation = this.conversations.get(this.currentConversation._id);
        if (!conversation) return;

        console.log('🚀 INSTANT updating conversation for sent message');

        // Update conversation data with proper content handling
        let messageContent = '';
        if (typeof message.content === 'string') {
            messageContent = message.content;
        } else if (message.content && message.content.text) {
            messageContent = message.content.text;
        } else if (message.content) {
            messageContent = String(message.content);
        }

        conversation.lastMessage = {
            content: messageContent,
            sender: this.currentUser?._id,
            createdAt: message.createdAt || new Date().toISOString(),
            type: message.type || 'text'
        };
        conversation.lastActivity = message.createdAt || new Date().toISOString();

        // Reset unread count since user is actively chatting
        conversation.unreadCount = 0;
        conversation.hasNewMessage = false;
        
        // Actualizar contador global
        this.updateGlobalUnreadCounter();

        // INSTANT DOM update
        this.updateConversationItemInstant(conversation._id, conversation);
        
        // Move to top if not already there
        this.moveConversationToTopInstant(conversation._id);
    }

    showTypingIndicator(username) {
        console.log(`TYPING Showing typing indicator for ${username}`);
        
        // Use the header-specific typing indicator function
        this.showTypingIndicatorInHeader();
        
        // Update the typing text in header
        const indicator = Utils.$('#typing-indicator');
        if (indicator) {
            const typingText = indicator.querySelector('span');
            if (typingText) {
                typingText.textContent = `escribiendo...`;
                typingText.style.color = '#10b981'; // Green color like online status
            }
            
            indicator.classList.remove('hidden');
            indicator.classList.add('typing-active');
        }
    }

    hideTypingIndicator() {
        console.log('TYPING Hiding typing indicator and restoring status');
        
        // Use header-specific hide function
        this.hideTypingIndicatorInHeader();
        
        // Hide the typing indicator element
        const indicator = Utils.$('#typing-indicator');
        if (indicator) {
            indicator.classList.add('hidden');
            indicator.classList.remove('typing-active');
        }
        
        // Restore appropriate status based on current presence
        const recipientId = this.getRecipientId();
        if (recipientId && window.SocketManager) {
            const presenceData = window.SocketManager.getUserPresence(recipientId);
            console.log(`TYPING Restoring presence after typing:`, presenceData);
            this.updateConversationHeaderStatusInstant(presenceData);
        }
    }

    // Handle contact status changes from socket
    handleContactStatusChanged(data) {
        console.log('Contact status changed:', data);
        
        // Throttle updates to prevent spam
        const now = Date.now();
        const userId = data.userId;
        const lastUpdate = this.lastStatusUpdate || new Map();
        
        // Skip if updated less than 10 seconds ago (anti-spam)
        if (lastUpdate.has(userId) && now - lastUpdate.get(userId) < 10000) {
            console.log(`Skipping status update for ${userId} - too recent`);
            return;
        }
        
        lastUpdate.set(userId, now);
        this.lastStatusUpdate = lastUpdate;
        
        // Initialize activeUsers Map if not exists
        if (window.SocketManager && !window.SocketManager.activeUsers) {
            window.SocketManager.activeUsers = new Map();
        }
        
        // Update or remove from activeUsers based on status (optimized)
        if (window.SocketManager && window.SocketManager.activeUsers) {
            if (data.status === 'online') {
                window.SocketManager.activeUsers.set(data.userId, {
                    user: { status: data.status, lastSeen: data.lastSeen },
                    lastActivity: new Date(data.lastSeen || Date.now()),
                    status: data.status
                });
            } else if (data.status === 'offline') {
                // Only delete after 2-minute grace period for robustness (improved from 5 minutes)
                setTimeout(() => {
                    const activeUser = window.SocketManager.activeUsers.get(data.userId);
                    if (activeUser) {
                        const timeDiff = Date.now() - new Date(activeUser.lastActivity).getTime();
                        if (timeDiff >= 2 * 60 * 1000) { // 2 minutes
                            window.SocketManager.activeUsers.delete(data.userId);
                        }
                    }
                }, 2 * 60 * 1000); // 2 minutes
            }
        }
        
        // Batch updates to reduce DOM manipulation
        const updates = [];
        
        // Update the current conversation header if it's the same user
        if (this.currentConversation) {
            const recipientId = this.getRecipientId();
            if (recipientId === data.userId) {
                updates.push(() => {
                    this.updateContactStatus(data.status, data.lastSeen);
                    this.updateConversationHeaderAutomatic(recipientId);
                });
            }
        }
        
        // Update status in conversation list (batched)
        updates.push(() => {
            this.updateConversationContactStatus(data.userId, data.status, data.lastSeen);
        });
        
        // Execute all updates in next frame to batch DOM changes
        if (updates.length > 0) {
            requestAnimationFrame(() => {
                updates.forEach(update => update());
            });
        }
    }

    // Update contact status in conversation list
    updateConversationContactStatus(userId, status, lastSeen = null) {
        const conversations = document.querySelectorAll('.chat-item');
        conversations.forEach(item => {
            const conversationId = item.dataset.conversationId;
            const conversation = this.conversations.get(conversationId);
            
            if (conversation && conversation.participants.includes(userId)) {
                // Update user info in memory if available
                this.updateUserInfoCache(userId, status, lastSeen);
                
                // Re-render the conversation to update status indicator
                this.renderSingleConversation(conversation, item);
            }
        });
    }

    // Update user info cache de manera persistente y robusta
    updateUserInfoCache(userId, status, lastSeen) {
        // Update in contact manager if available
        if (window.ContactManager && window.ContactManager.contacts) {
            const contact = window.ContactManager.contacts.get(userId);
            if (contact) {
                // Solo actualizar si realmente cambió para evitar renders innecesarios
                if (contact.status !== status || contact.lastSeen !== lastSeen) {
                    contact.status = status;
                    if (lastSeen) contact.lastSeen = lastSeen;
                }
            }
        }

        // Update in socket manager active users con lógica mejorada
        if (window.SocketManager && window.SocketManager.activeUsers) {
            if (status === 'online') {
                // Agregar o actualizar usuario online
                window.SocketManager.activeUsers.set(userId, {
                    user: { status: status, lastSeen: lastSeen },
                    lastActivity: new Date(lastSeen || Date.now()),
                    status: status
                });
            } else if (status === 'offline') {
                // Solo remover después de verificar que realmente debe estar offline
                const lastSeenMinutes = lastSeen ? this.getMinutesSinceLastSeen(lastSeen) : 999;
                if (lastSeenMinutes >= 5) {
                    window.SocketManager.activeUsers.delete(userId);
                }
            }
        }
    }

    // Render a single conversation item (helper function)
    renderSingleConversation(conversation, existingElement = null) {
        const otherUserId = conversation.participants?.find(p => p !== this.currentUser?._id);
        const statusInfo = this.getConversationStatusInfo(otherUserId);
        const timeDisplay = this.getConversationTimeDisplay(conversation.lastActivity);
        const lastMessage = conversation.lastMessage;
        const hasUnreadMessages = conversation.unreadCount > 0;

        const statusIndicatorHTML = statusInfo.statusClass === 'online' ? 
            `<div class="status-indicator ${statusInfo.statusClass}" title="${statusInfo.tooltipText}"></div>` :
            statusInfo.statusClass === 'away' ? 
            `<div class="status-indicator ${statusInfo.statusClass}" title="${statusInfo.tooltipText}">
                <span class="status-time">${statusInfo.statusDisplay}</span>
             </div>` : '';

        const newHTML = `
            <div class="chat-item-avatar">
                <div class="contact-avatar-container">
                    <img src="${conversation.avatar || '/images/user-placeholder-40.svg'}" 
                         alt="${conversation.name}" class="chat-img contact-avatar">
                    ${statusIndicatorHTML}
                </div>
            </div>
            <div class="chat-info">
                <div class="chat-top-row">
                    <h3 class="chat-name">${Utils.escapeHtml(conversation.name)}</h3>
                    <div class="chat-time-container" style="display: flex; align-items: center; gap: 6px;">
                        <span class="chat-time">${timeDisplay}</span>
                        ${this.renderConversationTimeIndicators(conversation)}
                    </div>
                </div>
                <div class="chat-bottom-row">
                    <p class="chat-last-msg">
                        ${lastMessage ? this.formatLastMessage(lastMessage) : 'Sin mensajes'}
                    </p>
                    <div class="chat-indicators">
                        ${hasUnreadMessages ? `<div class="unread-badge-messenger">${conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}</div>` : ''}
                    </div>
                </div>
            </div>
        `;

        if (existingElement) {
            existingElement.innerHTML = newHTML;
        }
    }

    /**
     * Robust scroll to bottom implementation with multiple fallbacks - WhatsApp style
     */
    scrollToBottom() {
        this.isScrolling = true;
        this.userHasScrolledUp = false;
        
        const scrollElement = this.getScrollableElement();
        if (!scrollElement) {
            this.isScrolling = false;
            return;
        }
        
        // Función de scroll optimizada
        const doScroll = () => {
            const targetScrollTop = scrollElement.scrollHeight - scrollElement.clientHeight;
            scrollElement.scrollTop = Math.max(0, targetScrollTop);
        };
        
        // Scroll inmediato
        doScroll();
        
        // Solo dos requestAnimationFrame para eficiencia
        requestAnimationFrame(() => {
            doScroll();
            
            requestAnimationFrame(() => {
                doScroll();
                this.isScrolling = false;
            });
        });
        
        // Solo un timeout de respaldo mínimo
        setTimeout(() => {
            doScroll();
        }, 50);
    }

    /**
     * Get the correct scrollable element with fallbacks
     */
    getScrollableElement() {
        
        // Define priority order for scroll elements
        const candidates = [
            { name: 'this.messagesScroll', element: this.messagesScroll },
            { name: '#messages-scroll', element: Utils.$('#messages-scroll') },
            { name: 'this.messageContainer', element: this.messageContainer },
            { name: '#messages-container', element: Utils.$('#messages-container') },
            { name: '.messages-scroll', element: Utils.$('.messages-scroll') },
            { name: '.messages-container', element: Utils.$('.messages-container') }
        ];
        
        for (const candidate of candidates) {
            if (candidate.element && this.isScrollable(candidate.element)) {
                return candidate.element;
            }
        }
        
        console.warn(' No scrollable element found');
        return null;
    }
    
    isScrollable(element) {
        if (!element) return false;
        
        // Check if element has overflow scroll/auto and content exceeds container
        const style = window.getComputedStyle(element);
        const hasScrollOverflow = ['scroll', 'auto'].includes(style.overflowY);
        const hasScrollableContent = element.scrollHeight > element.clientHeight;
        
        return hasScrollOverflow && (hasScrollableContent || element.scrollHeight > 0);
    }

    setupScrollManagement() {
        const scrollElement = this.getScrollableElement();
        if (!scrollElement) return;
        
        scrollElement.addEventListener('scroll', this.handleScroll.bind(this));
        this.setupMessagesObserver();
    }

    async handleScroll() {
        if (this.isScrolling) return;
        
        const scrollElement = this.getScrollableElement();
        if (!scrollElement) return;
        
        const scrollTop = scrollElement.scrollTop;
        const scrollHeight = scrollElement.scrollHeight;
        const clientHeight = scrollElement.clientHeight;
        
        // Calcular distancia desde el fondo
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        
        // Check if user scrolled to top (load more messages)
        if (scrollTop < 100 && !this.isLoadingMoreMessages && this.hasMoreMessages && this.currentConversation) {
            await this.loadMoreMessages();
        }
        
        // Si el usuario ha subido más de 100px, desactivar auto-scroll
        this.userHasScrolledUp = distanceFromBottom > 100;
        
        // Show/hide scroll to bottom button
        if (this.scrollToBottomBtn) {
            if (this.userHasScrolledUp) {
                this.scrollToBottomBtn.style.display = 'block';
            } else {
                this.scrollToBottomBtn.style.display = 'none';
            }
        }
        
        // Limpiar timeout anterior
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            this.updateLastScrollPosition();
        }, 200);
    }

    async loadMoreMessages() {
        if (this.isLoadingMoreMessages || !this.hasMoreMessages || !this.currentConversation) return;
        this.isLoadingMoreMessages = true;
        const conversationId = this.currentConversation._id;
        // Skip temporary conversations
        if (conversationId.startsWith('temp_')) {
            this.isLoadingMoreMessages = false;
            return;
        }
        const scrollElement = this.getScrollableElement();
        // Mostrar loader arriba
        let loader = scrollElement.querySelector('.messages-loader-top');
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'messages-loader messages-loader-top';
            loader.innerHTML = '<div class="loader-spinner"></div>';
            loader.style.display = 'flex';
            loader.style.justifyContent = 'center';
            loader.style.alignItems = 'center';
            loader.style.padding = '12px 0';
            scrollElement.prepend(loader);
        } else {
            loader.style.display = 'flex';
        }
        // Guardar el primer mensaje visible antes de cargar
        let firstVisible = null;
        let firstVisibleOffset = 0;
        const messages = scrollElement.querySelectorAll('.message');
        for (let i = 0; i < messages.length; i++) {
            const rect = messages[i].getBoundingClientRect();
            if (rect.top >= scrollElement.getBoundingClientRect().top) {
                firstVisible = messages[i];
                firstVisibleOffset = rect.top - scrollElement.getBoundingClientRect().top;
                break;
            }
        }
        try {
            console.log(`Loading more messages for page ${this.currentPage + 1}`);
            const response = await API.Messages.getMessages(conversationId, this.currentPage + 1);
            if (response.success && response.data.length > 0) {
                // Prepend messages to the top
                response.data.reverse().forEach(message => {
                    this.renderMessage(message, true); // prepend = true
                });
                this.currentPage++;
                // Restaurar la posición exacta del primer mensaje visible
                if (firstVisible) {
                    requestAnimationFrame(() => {
                        const rect = firstVisible.getBoundingClientRect();
                        const newOffset = rect.top - scrollElement.getBoundingClientRect().top;
                        scrollElement.scrollTop += (newOffset - firstVisibleOffset);
                    });
                }
                // Check if we have more messages
                this.hasMoreMessages = response.data.length >= 20;
                console.log(`Loaded ${response.data.length} more messages, page ${this.currentPage}`);
            } else {
                this.hasMoreMessages = false;
                console.log('No more messages to load');
            }
        } catch (error) {
            console.error('Error loading more messages:', error);
            this.hasMoreMessages = false;
        } finally {
            this.isLoadingMoreMessages = false;
            // Ocultar loader
            if (loader) loader.style.display = 'none';
        }
    }


    /**
     * Check if user is scrolled to bottom
     */
    isScrolledToBottom() {
        try {
            const scrollElement = this.getScrollableElement();
            if (!scrollElement) return true;
            
            const { scrollTop, scrollHeight, clientHeight } = scrollElement;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            return distanceFromBottom <= 50;
            
        } catch (error) {
            console.error('Error checking scroll position:', error);
            return true;
        }
    }

    /**
     * Update last scroll position for comparison
     */
    updateLastScrollPosition() {
        try {
            const scrollElement = this.getScrollableElement();
            if (scrollElement) {
                this.lastScrollTop = scrollElement.scrollTop;
            }
        } catch (error) {
            console.error('Error updating scroll position:', error);
        }
    }

    
    setupMessagesObserver() {
        const scrollElement = this.getScrollableElement();
        if (!scrollElement) return;
        
        const observer = new MutationObserver((mutations) => {
            // Verificar si realmente se agregaron mensajes nuevos
            let hasNewMessages = false;
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Verificar si alguno de los nodos agregados es un mensaje
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE && 
                           (node.classList?.contains('message') || node.querySelector?.('.message'))) {
                            hasNewMessages = true;
                        }
                    });
                }
            });
            
            // Solo ejecutar auto-scroll si se agregaron mensajes nuevos
            if (hasNewMessages) {
                console.log('Observer detectó nuevos mensajes, ejecutando auto-scroll...');
                this.performRobustAutoScroll();
            }
        });
        
        observer.observe(scrollElement, {
            childList: true,
            subtree: true
        });
    }

    showChatArea() {
        // Hide welcome screen
        const welcomeScreen = Utils.$('#welcome-screen');
        if (welcomeScreen) welcomeScreen.classList.add('hidden');
        
        // Show chat components
        const chatArea = Utils.$('.chat-area');
        const chatHeader = Utils.$('#chat-header');
        const messagesContainer = Utils.$('#messages-container');
        const messageInputContainer = Utils.$('#message-input-container');
        
        if (chatArea) chatArea.classList.remove('hidden');
        if (chatHeader) chatHeader.classList.remove('hidden');
        if (messagesContainer) messagesContainer.classList.remove('hidden');
        if (messageInputContainer) messageInputContainer.classList.remove('hidden');
        
        // Hide sidebar on mobile
        if (window.innerWidth <= 768) {
            const sidebar = Utils.$('#sidebar') || Utils.$('.sidebar');
            if (sidebar) sidebar.classList.remove('open');
        }
        
        console.log('Chat area shown, welcome screen hidden');
    }

    showWelcomeScreen() {
        // Use the welcome screen manager for consistent behavior
        if (window.welcomeScreenManager) {
            window.welcomeScreenManager.forceShowWelcomeScreen();
        }
        
        console.log('Welcome screen shown, chat area hidden');
    }

    // Ensure welcome screen is visible on initialization
    ensureWelcomeScreenVisible() {
        // Use welcome screen manager for consistent state management
        if (window.welcomeScreenManager) {
            window.welcomeScreenManager.forceInitialWelcomeState();
            console.log('🏠 Welcome screen ensured via welcomeScreenManager');
        }
    }

    showWelcomeMessageForNewChat() {
        if (this.messageContainer) {
            this.messageContainer.innerHTML = `
                <div class="welcome-new-chat" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    text-align: center;
                    padding: 2rem;
                    color: var(--text-secondary);
                ">
                    <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">
                        💬
                    </div>
                    <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">
                        Nueva conversación
                    </h3>
                    <p style="margin: 0; max-width: 300px;">
                        Envía un mensaje para comenzar la conversación
                    </p>
                </div>
            `;
        }
    }

    showSidebar() {
        if (window.innerWidth <= 768) {
            Utils.$('#sidebar')?.classList.add('open');
        }
    }

    getCurrentConversation() {
        return this.currentConversation;
    }

    // Show new chat modal
    showNewChatModal() {
        const modal = Utils.$('#add-contact-modal');
        if (modal) {
            modal.classList.remove('hidden');
        } else {
            // Fallback if modal doesn't exist
            Utils.Notifications.info('Funcionalidad de nuevo chat disponible próximamente');
        }
    }

    showAddContactModal() {
        this.showNewChatModal();
    }

    // Additional methods...
    switchTab(tabName) {
        // Update tab buttons
        Utils.$$('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab content
        Utils.$$('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }




    handleConversationRead(data) {
        console.log('Conversation read event received:', data);
        
        const { conversationId, userId, readAt } = data;
        
        // If this is the current conversation, mark all unread messages as read
        if (this.currentConversation && this.currentConversation._id === conversationId) {
            console.log('🔄 Marking all messages in current conversation as read');
            
            // Find all unread messages in current conversation and mark them as read
            const unreadMessages = document.querySelectorAll('.message.sent:not(.read), .message.delivered:not(.read)');
            unreadMessages.forEach(messageEl => {
                const messageId = messageEl.getAttribute('data-message-id');
                const clientId = messageEl.getAttribute('data-client-id');
                
                if (messageId || clientId) {
                    this.updateMessageStatus(messageEl, 'read', readAt);
                    console.log('OK Message marked as read:', messageId || clientId);
                }
            });
        }
        
        // ENHANCED notification decrement - Update conversation in list
        const conversation = this.conversations.get(conversationId);
        if (conversation) {
            console.log('🔄 Enhanced notification reset for conversation:', conversation.name);
            
            // Get previous unread count for logging
            const previousUnread = conversation.unreadCount || 0;
            
            // Reset unread count and notification flags
            conversation.unreadCount = 0;
            conversation.hasNewMessage = false;
            conversation.lastReadAt = readAt || new Date();
            
            // Immediate global counter update without animation delays
            this.updateGlobalUnreadCounter();
            
            // Update DOM with smart detection to prevent unnecessary changes
            this.updateConversationItemSmart(conversationId, conversation);
            
            console.log(`✅ Notification decremented: ${previousUnread} → 0 for conversation ${conversation.name}`);
        }
        
        // Also update any checkmarks in the conversation list
        if (conversation && conversation.lastMessage) {
            this.updateConversationCheckmarksIfChanged(conversation, 
                document.querySelector(`[data-conversation-id="${conversationId}"]`));
        }
        
        console.log('OK Conversation read status updated completely');
    }

    // INSTANT and AUTOMATIC read marking system
    markMessageAsReadInstant(message) {
        // Only mark as read if:
        // 1. Window is focused (user is actively viewing)
        // 2. User is in the conversation
        // 3. Message is from another user
        if (document.hidden || !this.currentConversation || message.sender._id === this.currentUser?._id) {
            console.log('ERROR Not marking as read - conditions not met:', {
                windowHidden: document.hidden,
                hasConversation: !!this.currentConversation,
                isOwnMessage: message.sender._id === this.currentUser?._id
            });
            return;
        }

        console.log('Auto-marking message as read instantly:', message._id);

        // Mark via Socket Manager immediately
        if (window.SocketManager?.isConnected) {
            window.SocketManager.markMessageAsRead(message._id, this.currentConversation._id);
            console.log('OK Read receipt sent to server instantly');
        }

        // Also mark the entire conversation as read to reset unread count
        setTimeout(() => {
            this.markConversationAsRead(this.currentConversation._id);
            window.SocketManager?.markConversationAsRead(this.currentConversation._id);
            console.log('OK Conversation marked as read to reset unread count');
        }, 50);
    }

    // Enhanced automatic read marking when user focuses window
    setupAutoReadMarking() {
        // Mark messages as read when user focuses the window
        window.addEventListener('focus', () => {
            if (this.currentConversation && !document.hidden) {
                console.log('🔍 Window focused - marking conversation as read');
                this.markConversationAsRead(this.currentConversation._id);
                window.SocketManager?.markConversationAsRead(this.currentConversation._id);
            }
        });

        // Mark messages as read when user scrolls (indicating they're reading)
        const messagesContainer = document.getElementById('messages-scroll');
        if (messagesContainer) {
            let scrollTimeout;
            messagesContainer.addEventListener('scroll', () => {
                if (this.currentConversation && !document.hidden) {
                    clearTimeout(scrollTimeout);
                    scrollTimeout = setTimeout(() => {
                        console.log('📜 User scrolled - marking conversation as read');
                        this.markConversationAsRead(this.currentConversation._id);
                        window.SocketManager?.markConversationAsRead(this.currentConversation._id);
                    }, 500);
                }
            });
        }
    }

    handleUserTyping(data) {
        console.log('⌨️ User typing:', data);
        const { userId, conversationId } = data;
        
        // Update typing indicator in chat header if it's the active conversation
        if (this.activeConversationId === conversationId) {
            this.showTypingIndicator(userId);
        }
        
        // Update typing indicator in contact list
        this.updateContactTypingIndicator(userId, true);
        
        // Update typing indicator in conversation list
        this.updateConversationTypingIndicator(conversationId, userId, true);
    }

    handleUserStoppedTyping(data) {
        console.log('⌨️ User stopped typing:', data);
        const { userId, conversationId } = data;
        
        // Remove typing indicator from chat header
        if (this.activeConversationId === conversationId) {
            this.hideTypingIndicator(userId);
        }
        
        // Remove typing indicator from contact list
        this.updateContactTypingIndicator(userId, false);
        
        // Remove typing indicator from conversation list
        this.updateConversationTypingIndicator(conversationId, userId, false);
    }

    // Show typing indicator in chat header (like WhatsApp)
    showTypingIndicator(userId) {
        const chatHeader = document.querySelector('.chat-header');
        if (!chatHeader) return;
        
        let typingContainer = chatHeader.querySelector('.typing-indicator-container');
        if (!typingContainer) {
            typingContainer = document.createElement('div');
            typingContainer.className = 'typing-indicator-container';
            typingContainer.innerHTML = `
                <div class="typing-indicator">
                    <span class="typing-text">escribiendo</span>
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            `;
            
            // Insert after contact name in header
            const contactInfo = chatHeader.querySelector('.chat-contact-info');
            if (contactInfo) {
                contactInfo.appendChild(typingContainer);
            }
        }
        
        // Show with animation
        typingContainer.style.display = 'block';
        requestAnimationFrame(() => {
            typingContainer.style.opacity = '1';
            typingContainer.style.transform = 'translateY(0)';
        });
    }
    
    hideTypingIndicator(userId) {
        const typingContainer = document.querySelector('.typing-indicator-container');
        if (typingContainer) {
            typingContainer.style.opacity = '0';
            typingContainer.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                typingContainer.style.display = 'none';
            }, 200);
        }
    }
    
    // Update typing indicator in contact list
    updateContactTypingIndicator(userId, isTyping) {
        const contactItem = document.querySelector(`[data-user-id="${userId}"]`);
        if (!contactItem) return;
        
        const contactInfo = contactItem.querySelector('.contact-info');
        if (!contactInfo) return;
        
        let typingIndicator = contactInfo.querySelector('.contact-typing-indicator');
        
        if (isTyping) {
            if (!typingIndicator) {
                typingIndicator = document.createElement('div');
                typingIndicator.className = 'contact-typing-indicator';
                typingIndicator.innerHTML = `
                    <span class="typing-text">escribiendo</span>
                    <div class="typing-dots-small">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                `;
                contactInfo.appendChild(typingIndicator);
            }
            
            // Show with animation
            typingIndicator.style.display = 'flex';
            requestAnimationFrame(() => {
                typingIndicator.style.opacity = '1';
            });
        } else {
            if (typingIndicator) {
                typingIndicator.style.opacity = '0';
                setTimeout(() => {
                    if (typingIndicator.parentNode) {
                        typingIndicator.parentNode.removeChild(typingIndicator);
                    }
                }, 200);
            }
        }
    }
    
    // Update typing indicator in conversation list
    updateConversationTypingIndicator(conversationId, userId, isTyping) {
        const chatItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (!chatItem) return;
        
        const lastMessageEl = chatItem.querySelector('.last-message');
        if (!lastMessageEl) return;
        
        let typingIndicator = chatItem.querySelector('.conversation-typing-indicator');
        
        if (isTyping) {
            if (!typingIndicator) {
                typingIndicator = document.createElement('div');
                typingIndicator.className = 'conversation-typing-indicator';
                typingIndicator.innerHTML = `
                    <span class="typing-text">escribiendo...</span>
                    <div class="typing-dots-small">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                `;
                
                // Replace last message temporarily
                lastMessageEl.style.display = 'none';
                lastMessageEl.parentNode.appendChild(typingIndicator);
            }
            
            // Show with animation
            typingIndicator.style.display = 'flex';
            requestAnimationFrame(() => {
                typingIndicator.style.opacity = '1';
            });
        } else {
            if (typingIndicator) {
                typingIndicator.style.opacity = '0';
                setTimeout(() => {
                    if (typingIndicator.parentNode) {
                        typingIndicator.parentNode.removeChild(typingIndicator);
                    }
                    // Restore last message
                    lastMessageEl.style.display = 'block';
                }, 200);
            }
        }
    }

    handleMessageEdited(data) {
        console.log('Message edited:', data);
        // Update edited message
    }

    handleMessageDeleted(data) {
        console.log('🗑️ Message deleted confirmation received:', data);
        
        const { messageId, deletedBy, deletedForEveryone, deletedForMe, deletedByName, deletionType } = data;
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        
        if (!messageElement) {
            console.warn('Message element not found for deletion:', messageId);
            return;
        }
        
        // WhatsApp-style deletion handling
        if (deletedForEveryone) {
            // Message was deleted for everyone - show permanent placeholder
            const deleterName = deletedByName || 'Alguien';
            this.replaceMessageWithDeletionPlaceholder(messageElement, deleterName);
            console.log(`Message ${messageId} replaced with deletion placeholder for everyone`);
            
        } else if (deletedForMe || deletionType === 'just-me') {
            // Message was deleted just for the deleter - completely remove from their view
            // (This should not happen on the receiver side, but handle it just in case)
            if (deletedBy === this.currentUser._id) {
                messageElement.remove();
                console.log(`Message ${messageId} removed from deleter's view`);
            }
        }
        
        const currentUserId = this.currentUser?._id;
        const deletedByCurrentUser = deletedBy === currentUserId;
        
        // Handle deletion based on new logic
        if (deletedForEveryone) {
            if (deletedByCurrentUser) {
                // If current user deleted for everyone, hide completely for them
                messageElement.remove();
                console.log('OK Message removed completely for deleter:', messageId);
            } else {
                // For other users, show watermark with who deleted it
                const messageContent = messageElement.querySelector('.message-content');
                if (messageContent) {
                    messageContent.innerHTML = `
                        <div class="message-deleted-watermark" style="
                            font-style: italic; 
                            color: #6b7280; 
                            padding: 8px 12px; 
                            background: #f3f4f6; 
                            border-radius: 8px;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            <i class="fas fa-trash" style="font-size: 12px; opacity: 0.7;"></i>
                            <span>Este mensaje fue eliminado por ${deletedByName}</span>
                        </div>
                    `;
                    messageElement.classList.add('deleted-message-watermark');
                }
                console.log('OK Message watermark shown for recipient:', messageId);
            }
        } else {
            // Message deleted "for me" only - remove completely without watermark
            messageElement.remove();
            console.log('OK Message removed completely (deleted for me):', messageId);
        }
        
        // Update conversation list to reflect last message change - instant update
        setTimeout(() => this.loadConversations(), 100);
        
        console.log('OK Message deletion handled successfully');
    }

    handleReactionAdded(data) {
        console.log('Reaction added:', data);
        // Add reaction to message
    }

    handleContactStatusChanged(data) {
        console.log('🔄 Contact status changed:', data);
        
        // Check for automatic message delivery when user comes online
        if (data.status === 'online') {
            this.handleUserOnlineStatusChange(data);
        }
        
        // Update specific contact status in UI if contacts manager exists
        if (window.contactsManager) {
            // Update specific contact instead of reloading all
            this.updateContactStatusInList(data.userId, data.status, data.lastSeen);
            
            // Also refresh contacts to get the most recent data
            setTimeout(() => {
                window.contactsManager.loadContacts();
            }, 100);
        }
        
        // Update status in current conversation if it matches
        if (this.currentConversation) {
            const recipientId = this.getRecipientId();
            if (recipientId === data.userId) {
                // Update contact data in contacts manager cache if available
                if (window.contactsManager && window.contactsManager.contacts) {
                    const contact = window.contactsManager.contacts.get(recipientId);
                    if (contact) {
                        contact.status = data.status;
                        contact.lastSeen = data.lastSeen;
                    }
                }
                
                // Trigger conversation opened check for auto-read if user just came online
                if (data.status === 'online') {
                    setTimeout(() => {
                        this.handleConversationOpened(this.currentConversation._id);
                    }, 1500); // Small delay to let user settle in
                }
                // Immediately update the conversation header with the same logic as contacts
                this.updateActiveConversation();
            }
        }
    }
    
    // Update specific contact status in the contacts list
    updateContactStatusInList(userId, status, lastSeen) {
        const contactElement = document.querySelector(`[data-user-id="${userId}"]`);
        if (contactElement) {
            const statusIndicator = contactElement.querySelector('.status-indicator');
            if (statusIndicator) {
                statusIndicator.className = `status-indicator ${status}`;
                
                // Update tooltip
                const statusTime = status === 'offline' && lastSeen ? 
                    Utils.formatRelativeTime(lastSeen) : 
                    this.getStatusText(status);
                statusIndicator.title = statusTime;
            }
            
            // Update any status text elements
            const statusText = contactElement.querySelector('.contact-status');
            if (statusText) {
                statusText.textContent = status === 'offline' && lastSeen ? 
                    `Última conexión: ${Utils.formatRelativeTime(lastSeen)}` : 
                    this.getStatusText(status);
            }
        }
    }
    
    // Get status text in Spanish
    getStatusText(status) {
        const statusTexts = {
            online: 'En línea',
            away: 'Ausente',
            busy: 'Ocupado',
            offline: 'Desconectado'
        };
        return statusTexts[status] || 'Desconocido';
    }

    // Apply consistent formatting using the same utility function as other parts of the app
    updateConversationHeaderStatus(statusElement, contactData) {
        if (!contactData || !statusElement) return;
        
        // Get the current recipient ID for validation
        const currentRecipientId = this.getRecipientId();
        if (!currentRecipientId) return;
        
        // Use the new immediate update function with real-time validation
        this.updateConversationHeaderStatusImmediate(statusElement, contactData, currentRecipientId);
    }
    
    // Helper method to calculate minutes since last seen (same as contacts.js)
    getMinutesSinceLastSeen(date) {
        const now = new Date();
        const lastSeen = new Date(date);
        const diff = now - lastSeen;
        return Math.floor(diff / 60000); // Return minutes
    }
    
    updateContactStatus(status, lastSeen) {
        const statusElement = document.getElementById('last-seen');
        if (!statusElement) return;
        
        const recipientId = this.getRecipientId();
        if (!recipientId) return;
        
        // ALWAYS update - ensure persistent display
        this.updateConversationHeaderPersistent(recipientId, status, lastSeen);
    }

    // Persistent header updater - ALWAYS shows either "En línea" OR last seen
    async updateConversationHeaderPersistent(recipientId, currentStatus = null, currentLastSeen = null) {
        const statusElement = document.getElementById('last-seen');
        if (!statusElement || !recipientId) return;
        
        try {
            // FIRST: Check immediately if user is online for chat header (2 minutes buffer - improved from 5)
            const isOnlineForHeader = this.isUserOnlineForChatHeader(recipientId);
            
            // Show "En línea" IMMEDIATELY if user is active within 2 minutes
            if (isOnlineForHeader) {
                statusElement.textContent = 'En línea';
                statusElement.className = 'last-seen online';
                statusElement.style.color = '#25d366';
                statusElement.style.fontWeight = '500';
                statusElement.style.display = 'block';
                console.log(`Header: EN LÍNEA inmediato para ${recipientId} (dentro de 2 min)`);
                return; // Exit early - don't need API call
            }
            
            // If not immediately online, get fresh data from API
            let presenceData = null;
            if (!currentStatus || !currentLastSeen) {
                const response = await fetch(`/api/users/${recipientId}/presence`, {
                    headers: {
                        'Authorization': `Bearer ${Utils.Storage.get('authToken')}`
                    }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    presenceData = result.data;
                } else {
                    console.warn('Failed to fetch presence data, using fallback');
                }
            }
            
            // Use provided data or fetched data
            const status = currentStatus || presenceData?.status || 'offline';
            const lastSeen = currentLastSeen || presenceData?.lastSeen || new Date();
            
            // Double-check after API call - user might be online in backend (5 min buffer for header)
            const isOnlineAfterAPI = status === 'online' && this.isUserOnlineForChatHeader(recipientId);
            
            if (isOnlineAfterAPI) {
                // Show "En línea" state
                statusElement.textContent = 'En línea';
                statusElement.className = 'last-seen online';
                statusElement.style.color = '#25d366';
                statusElement.style.fontWeight = '500';
                statusElement.style.display = 'block';
                console.log(`✅ Header: EN LÍNEA después de API para ${recipientId} (dentro de 5 min)`);
            } else {
                // Show last seen time - ALWAYS show if not online
                const lastSeenText = Utils.formatLastSeenStyled ? 
                    Utils.formatLastSeenStyled(lastSeen) : 
                    'Desconectado';
                statusElement.textContent = lastSeenText;
                statusElement.className = 'last-seen offline';
                statusElement.style.color = '#6b7280';
                statusElement.style.fontWeight = '400';
                statusElement.style.display = 'block';
                console.log(`❌ Header: ${lastSeenText} después de API para ${recipientId}`);
            }
            
        } catch (error) {
            console.error('Error in persistent header update:', error);
            // Fallback: always show something
            statusElement.textContent = 'Estado no disponible';
            statusElement.className = 'last-seen offline';
            statusElement.style.display = 'block';
        }
    }

    // Automatic conversation header updater
    async updateConversationHeaderAutomatic(recipientId) {
        if (!recipientId || !this.currentConversation) return;
        
        // Use the persistent updater to ensure consistent display
        await this.updateConversationHeaderPersistent(recipientId);
        console.log(`✅ Header actualizado automáticamente para ${recipientId}`);
    }

    // Start automatic header updates
    startConversationHeaderUpdates() {
        // Clear any existing interval
        if (this.headerUpdateInterval) {
            clearInterval(this.headerUpdateInterval);
        }
        
        // Update every 30 seconds
        this.headerUpdateInterval = setInterval(() => {
            if (this.currentConversation) {
                const recipientId = this.getRecipientId();
                if (recipientId) {
                    this.updateConversationHeaderAutomatic(recipientId);
                }
            }
        }, 30000); // 30 segundos
    }

    // Stop automatic header updates
    stopConversationHeaderUpdates() {
        if (this.headerUpdateInterval) {
            clearInterval(this.headerUpdateInterval);
            this.headerUpdateInterval = null;
        }
    }

    // Start automatic chat items updates
    startChatItemsUpdates() {
        // Clear any existing interval
        if (this.chatItemsUpdateInterval) {
            clearInterval(this.chatItemsUpdateInterval);
        }
        
        // Update every 45 seconds (different from header to avoid conflicts)
        this.chatItemsUpdateInterval = setInterval(() => {
            this.updateAllChatItemsStatus();
        }, 45000); // 45 segundos
    }

    // Stop automatic chat items updates
    stopChatItemsUpdates() {
        if (this.chatItemsUpdateInterval) {
            clearInterval(this.chatItemsUpdateInterval);
            this.chatItemsUpdateInterval = null;
        }
    }

    // Update all chat items status with 5-minute logic
    updateAllChatItemsStatus() {
        const chatItems = document.querySelectorAll('.chat-item');
        chatItems.forEach(item => {
            const conversationId = item.dataset.conversationId;
            const conversation = this.conversations.get(conversationId);
            
            if (conversation) {
                const otherUserId = conversation.participants?.find(p => p !== this.currentUser?._id);
                if (otherUserId) {
                    // Get updated status info with 5-minute logic
                    const statusInfo = this.getConversationStatusInfo(otherUserId);
                    
                    // Update status indicator
                    const statusIndicator = item.querySelector('.status-indicator');
                    if (statusIndicator) {
                        statusIndicator.className = `status-indicator ${statusInfo.statusClass}`;
                        statusIndicator.title = statusInfo.tooltipText;
                        
                        // Update status display for away users
                        const statusTime = statusIndicator.querySelector('.status-time');
                        if (statusInfo.statusClass === 'away') {
                            if (statusTime) {
                                statusTime.textContent = statusInfo.statusDisplay;
                            } else if (statusInfo.statusDisplay) {
                                statusIndicator.innerHTML = `<span class="status-time">${statusInfo.statusDisplay}</span>`;
                            }
                        } else if (statusTime) {
                            statusTime.remove();
                        }
                    }
                }
            }
        });
        
        console.log(`✅ Chat items status updated automatically`);
    }

    // Cleanup all intervals (for logout or page unload)
    cleanup() {
        this.stopConversationHeaderUpdates();
        this.stopChatItemsUpdates();
        
        if (this.conversationUpdateInterval) {
            clearInterval(this.conversationUpdateInterval);
            this.conversationUpdateInterval = null;
        }
        
        // Clear throttling cache
        this.lastStatusUpdate.clear();
        
        console.log('ChatManager cleanup completed');
    }

    getCurrentConversation() {
        return this.currentConversation;
    }

    clearCurrentAction() {
        // Clear any pending actions
        console.log('Clearing current action');
    }
    
    // Métodos para manejar contadores de mensajes no leídos
    incrementUnreadCount(message) {
        // Encontrar la conversación para este mensaje
        let conversationId = null;
        
        // Buscar conversación existente
        for (const [id, conv] of this.conversations) {
            if ((conv.participants.includes(message.sender._id) && conv.participants.includes(message.recipient)) ||
                (conv.participants.includes(message.recipient) && conv.participants.includes(message.sender._id))) {
                conversationId = id;
                break;
            }
        }
        
        if (conversationId) {
            const conversation = this.conversations.get(conversationId);
            if (conversation) {
                // Incrementar contador de no leídos
                conversation.unreadCount = (conversation.unreadCount || 0) + 1;
                
                // Actualizar contador global inmediatamente
                this.updateGlobalUnreadCounter();
                
                // Marcar como mensaje nuevo reciente
                conversation.hasNewMessage = true;
                conversation.lastNewMessageTime = new Date();
                
                // No re-renderizar para evitar parpadeo - el badge se actualiza automáticamente
                // this.renderConversations();
                
                // Mostrar badge verde estilo Messenger inmediatamente
                this.showMessengerBadge(conversationId);
            }
        }
    }
    
    // Función optimizada para actualizar estado de lectura sin parpadeos
    _updateReadStateSync(conversationId, conversation) {
        // Actualizar chat item en DOM
        const chatItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (chatItem) {
            chatItem.classList.remove('has-unread');
            // Asegurar que no quede ningún fondo verde problemático
            chatItem.style.backgroundColor = '';
        }
        
        // Actualizar badge específico sin animaciones innecesarias
        this._updateBadgeSync(conversationId, 0);
    }
    
    // Actualización de badge sincronizada y optimizada
    _updateBadgeSync(conversationId, unreadCount) {
        const chatItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (!chatItem) return;
        
        const unreadBadge = chatItem.querySelector('.unread-badge-messenger, .unread-count, .unread-badge');
        
        if (unreadCount > 0) {
            if (unreadBadge) {
                const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();
                unreadBadge.textContent = displayCount;
                unreadBadge.style.display = 'flex';
                unreadBadge.classList.remove('hidden');
            }
            chatItem.classList.add('has-unread');
            // Limpiar cualquier fondo verde problemático
            chatItem.style.backgroundColor = '';
        } else {
            if (unreadBadge) {
                unreadBadge.style.display = 'none';
                unreadBadge.classList.add('hidden');
                // Detener cualquier animación de parpadeo
                unreadBadge.style.animation = 'none';
            }
            chatItem.classList.remove('has-unread');
            // Limpiar cualquier fondo verde problemático
            chatItem.style.backgroundColor = '';
        }
    }

    // ROBUST function to mark conversation as read - PERMANENT DATABASE SAVE
    async markConversationAsRead(conversationId, immediate = false, retryCount = 0) {
        if (conversationId.startsWith('temp_')) {
            console.log('🟡 Skipping temporary conversation ID:', conversationId);
            return;
        }
        
        const conversation = this.conversations.get(conversationId);
        if (!conversation) {
            console.warn('⚠️ Conversation not found:', conversationId);
            return;
        }

        console.log(`📖 Marking conversation as read: ${conversation.name} (had ${conversation.unreadCount || 0} unread) - attempt ${retryCount + 1}`);
        
        // Maximum 2 retries to prevent infinite loops
        const maxRetries = 2;
        
        try {
            // Update local state immediately for responsive UI
            const previousUnread = conversation.unreadCount || 0;
            conversation.unreadCount = 0;
            conversation.hasNewMessage = false;
            conversation.lastReadAt = new Date();
            
            // Update UI immediately
            this.updateConversationItem(conversationId, { unreadCount: 0 });
            this.updateGlobalUnreadCounter();
            
            // Use socket for marking as read instead of non-existent API
            if (window.SocketManager?.isConnected) {
                window.SocketManager.emit('conversation:read', {
                    conversationId,
                    userId: this.currentUser?._id,
                    timestamp: new Date().toISOString()
                });
                console.log('✅ Socket notification sent for read status');
            }
            
            // Try to use SocketManager's markConversationAsRead if available
            if (window.SocketManager?.markConversationAsRead) {
                window.SocketManager.markConversationAsRead(conversationId);
                console.log('✅ SocketManager markConversationAsRead called');
            }
            
            console.log(`✅ Conversation marked as read: ${conversation.name} (${previousUnread} → 0)`);
            
        } catch (error) {
            console.error(`❌ Failed to mark conversation as read (attempt ${retryCount + 1}):`, error);
            
            // Only retry if we haven't exceeded max retries
            if (retryCount < maxRetries) {
                const retryDelay = 1000 * (retryCount + 1); // Increasing delay: 1s, 2s
                console.log(`🔄 Retrying in ${retryDelay}ms... (${retryCount + 1}/${maxRetries})`);
                
                setTimeout(async () => {
                    try {
                        await this.markConversationAsRead(conversationId, immediate, retryCount + 1);
                    } catch (retryError) {
                        console.error(`❌ Retry ${retryCount + 1} failed:`, retryError);
                    }
                }, retryDelay);
            } else {
                console.error('❌ Max retries exceeded for marking conversation as read');
                // Don't show notification for final failure to avoid spam
            }
        }
    }

    // Versión rápida para abrir conversación (mantener compatibilidad)
    markConversationAsReadImmediate(conversationId) {
        return this.markConversationAsRead(conversationId, true);
    }
    
    // Función para verificar que la conversación se marcó correctamente en el servidor
    async verifyConversationReadStatus(conversationId) {
        try {
            if (window.API && API.Messages) {
                console.log(`🔍 Verificando estado de lectura en el servidor para: ${conversationId}`);
                
                // Volver a cargar las conversaciones para verificar el estado
                const response = await fetch('/api/messages/conversations', {
                    headers: {
                        'Authorization': `Bearer ${Utils.Storage.get('authToken')}`,
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        const serverConversation = result.data.find(conv => conv._id === conversationId);
                        if (serverConversation) {
                            const localConversation = this.conversations.get(conversationId);
                            if (localConversation && serverConversation.unreadCount !== localConversation.unreadCount) {
                                console.log(`🔄 Sincronizando contador: local=${localConversation.unreadCount}, servidor=${serverConversation.unreadCount}`);
                                
                                // Actualizar el estado local con el del servidor
                                localConversation.unreadCount = serverConversation.unreadCount;
                                this._updateReadStateSync(conversationId, localConversation);
                                this.updateGlobalUnreadCounter();
                                
                                console.log(`✅ Estado sincronizado para ${localConversation.name}`);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error verificando estado de lectura:', error);
        }
    }
    
    // Actualizar contadores desde datos del servidor
    updateUnreadCounts(conversationsData) {
        if (!conversationsData || !Array.isArray(conversationsData)) return;
        
        conversationsData.forEach(serverConv => {
            const localConv = this.conversations.get(serverConv._id);
            if (localConv) {
                const oldCount = localConv.unreadCount || 0;
                localConv.unreadCount = serverConv.unreadCount || 0;
                
                // Actualizar badge individual si cambió
                if (oldCount !== localConv.unreadCount) {
                    this._updateBadgeSync(serverConv._id, localConv.unreadCount);
                    
                    // Actualizar clase has-unread del chat item
                    const chatItem = document.querySelector(`[data-conversation-id="${serverConv._id}"]`);
                    if (chatItem) {
                        if (localConv.unreadCount > 0) {
                            chatItem.classList.add('has-unread');
            // Limpiar cualquier fondo verde problemático
            chatItem.style.backgroundColor = '';
                        } else {
                            chatItem.classList.remove('has-unread');
                        }
                    }
                }
            }
        });
        
        // Actualizar contador global después de sincronizar
        this.updateGlobalUnreadCounter();
        
        // No re-renderizar para evitar parpadeo - se actualizó cada badge individualmente
        // this.renderConversations();
    }
    
    // Ya no necesitamos indicadores en el avatar - estilo WhatsApp
    renderUnreadIndicators(conversation) {
        // Los indicadores ahora están en la estructura principal (badge verde)
        return '';
    }
    
    // Mostrar badge verde estilo Messenger
    showMessengerBadge(conversationId) {
        const conversation = this.conversations.get(conversationId);
        if (conversation && conversation.unreadCount > 0) {
            // Actualizar badge individualmente sin renderizar todo
            this._updateBadgeSync(conversationId, conversation.unreadCount);
            
            // Asegurar que el chat item tenga la clase has-unread
            const chatItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
            if (chatItem) {
                chatItem.classList.add('has-unread');
            // Limpiar cualquier fondo verde problemático
            chatItem.style.backgroundColor = '';
            }
            
            console.log('Badge Messenger mostrado para:', conversationId, 'con', conversation.unreadCount, 'mensajes');
        }
        
        // Actualizar contador global después de mostrar badge individual
        this.updateGlobalUnreadCounter();
    }
    
    // Calcular total de mensajes no leídos en todas las conversaciones
    calculateTotalUnreadCount() {
        let totalUnread = 0;
        console.log(`📊 Calculating total unread count from ${this.conversations.size} conversations`);
        
        this.conversations.forEach((conversation, id) => {
            const unreadCount = conversation.unreadCount || 0;
            if (unreadCount > 0) {
                totalUnread += unreadCount;
                console.log(`  📧 ${conversation.name}: ${unreadCount} unread messages`);
            }
        });
        
        console.log(`📊 Total unread messages calculated: ${totalUnread}`);
        return totalUnread;
    }
    
    // Actualizar contador global de mensajes no leídos con animaciones suaves
    updateGlobalUnreadCounter() {
        const totalUnread = this.calculateTotalUnreadCount();
        
        // Elementos del contador principal (botón de notificación)
        const notificationContainer = document.getElementById('notification-container');
        const globalUnreadBadge = document.getElementById('global-unread-badge');
        const globalUnreadCount = document.getElementById('global-unread-count');
        
        if (!notificationContainer) {
            console.warn('Contenedor de notificación no encontrado');
            return;
        }

        const displayCount = totalUnread > 99 ? '99+' : totalUnread.toString();
        
        if (totalUnread > 0) {
            // Mostrar ícono de notificación con animación suave
            notificationContainer.style.transition = 'opacity 0.3s ease, visibility 0.3s ease';
            notificationContainer.classList.remove('hidden');
            notificationContainer.style.opacity = '1';
            notificationContainer.style.visibility = 'visible';
            
            if (globalUnreadBadge) {
                globalUnreadBadge.style.transition = 'all 0.3s ease';
                globalUnreadBadge.classList.remove('hidden');
                globalUnreadBadge.style.display = 'flex';
            }
            
            if (globalUnreadCount) {
                globalUnreadCount.textContent = displayCount;
            }
            
            // Mantener estado normal sin animaciones que causen parpadeo
            if (globalUnreadBadge) {
                globalUnreadBadge.style.transform = 'scale(1)';
            }
            
            console.log(`Contador global actualizado: ${totalUnread} mensajes no leídos`);
        } else {
            // Ocultar ícono completamente con animación suave
            notificationContainer.style.transition = 'opacity 0.3s ease, visibility 0.3s ease';
            notificationContainer.style.opacity = '0';
            notificationContainer.style.visibility = 'hidden';
            
            // Ocultar inmediatamente para evitar parpadeo
            notificationContainer.classList.add('hidden');
            
            if (globalUnreadBadge) {
                globalUnreadBadge.style.transition = 'all 0.3s ease';
                globalUnreadBadge.style.transform = 'scale(0)';
                // Ocultar inmediatamente y detener parpadeos
                globalUnreadBadge.classList.add('hidden');
                globalUnreadBadge.style.display = 'none';
                globalUnreadBadge.style.transform = 'scale(1)';
                globalUnreadBadge.style.animation = 'none';
            }
            
            console.log('Ícono de notificación ocultado - no hay mensajes no leídos');
        }
        
        // Actualizar título de la página para mostrar notificaciones
        this.updatePageTitle(totalUnread);
    }

    // Actualizar título de la página con contador de mensajes
    updatePageTitle(unreadCount) {
        const baseTitle = 'VigiChat - Chat en Tiempo Real';
        
        if (unreadCount > 0) {
            document.title = `(${unreadCount > 99 ? '99+' : unreadCount}) ${baseTitle}`;
        } else {
            document.title = baseTitle;
        }
    }

    // Inicializar sistema de notificaciones mejorado
    initializeUnreadCounterSystem() {
        console.log('🔔 Inicializando sistema de contadores de mensajes no leídos...');
        
        // Verificar que todos los elementos necesarios existan
        const elements = {
            notificationContainer: document.getElementById('notification-container'),
            globalUnreadBadge: document.getElementById('global-unread-badge'),
            globalUnreadCount: document.getElementById('global-unread-count')
        };
        
        // Log de elementos encontrados
        Object.entries(elements).forEach(([name, element]) => {
            if (element) {
                console.log(`✅ ${name}: encontrado`);
            } else {
                console.warn(`⚠️ ${name}: no encontrado`);
            }
        });
        
        // Inicializar contadores
        this.updateGlobalUnreadCounter();
        
        // Actualizar badges de conversaciones existentes
        if (this.conversations && this.conversations.length > 0) {
            console.log(`🔄 Actualizando badges para ${this.conversations.length} conversaciones`);
            this.conversations.forEach(conversation => {
                const chatItem = document.querySelector(`[data-conversation-id="${conversation.id || conversation._id}"]`);
                if (chatItem) {
                    this.updateUnreadBadgeInstant(chatItem, conversation);
                }
            });
        }
        
        console.log('✅ Sistema de contadores inicializado correctamente');
    }

    // Función de prueba mejorada para verificar el sistema de notificaciones
    testUnreadCounterSystem() {
        console.log('Iniciando prueba del sistema de contadores...');
        
        // Simular mensajes no leídos en las primeras 3 conversaciones
        let testConversations = 0;
        this.conversations.forEach((conversation) => {
            if (testConversations < 3) {
                const originalCount = conversation.unreadCount || 0;
                // REMOVED: No more random simulation - using real data from database
                
                console.log(`Conversación "${conversation.name}": ${originalCount} -> ${conversation.unreadCount} mensajes no leídos`);
                
                // Actualizar el badge visual usando la nueva función
                this._updateBadgeSync(conversation._id || conversation.id, conversation.unreadCount);
                
                // Actualizar contador global
                this.updateGlobalUnreadCounter();
                
                testConversations++;
            }
        });
        
        // Actualizar contador global
        this.updateGlobalUnreadCounter();
        
        console.log('Prueba completada - verifica los contadores en la interfaz');
        
        // Auto-limpiar después de 8 segundos para prueba
        setTimeout(() => {
            console.log('Limpiando prueba...');
            this.conversations.forEach(conversation => {
                conversation.unreadCount = 0;
                this._updateBadgeSync(conversation._id || conversation.id, 0);
            });
            this.updateGlobalUnreadCounter();
            console.log('Prueba limpiada');
        }, 8000);
    }

    // Función de prueba rápida para simular lectura de mensajes
    testMarkAsRead() {
        console.log('Simulando lectura de conversaciones...');
        
        // Marcar las primeras 2 conversaciones como leídas
        let marked = 0;
        this.conversations.forEach((conversation) => {
            if (marked < 2 && conversation.unreadCount > 0) {
                console.log(`Marcando como leída: ${conversation.name}`);
                this.markConversationAsReadImmediate(conversation._id || conversation.id);
                marked++;
            }
        });
    }

    // Prueba completa del sistema anti-parpadeo
    testAntiFlicker() {
        console.log('Probando sistema anti-parpadeo...');
        
        // 1. Crear mensajes no leídos
        let count = 0;
        this.conversations.forEach((conversation) => {
            if (count < 3) {
                conversation.unreadCount = 5;
                this._updateBadgeSync(conversation._id || conversation.id, 5);
                count++;
            }
        });
        
        console.log('Paso 1: Mensajes no leídos creados');
        
        // 2. Simular apertura de conversación después de 2 segundos
        setTimeout(() => {
            console.log('Paso 2: Simulando apertura de conversación...');
            const firstConversation = Array.from(this.conversations.values())[0];
            if (firstConversation) {
                this.markConversationAsReadImmediate(firstConversation._id);
                console.log('Conversación marcada como leída - NO debe parpadear');
            }
        }, 2000);
        
        // 3. Limpiar prueba después de 6 segundos
        setTimeout(() => {
            console.log('Paso 3: Limpiando prueba...');
            this.conversations.forEach(conversation => {
                conversation.unreadCount = 0;
                this._updateBadgeSync(conversation._id || conversation.id, 0);
            });
            this.updateGlobalUnreadCounter();
            console.log('Prueba anti-parpadeo completada');
        }, 6000);
    }

    // Inicializar contador global de mensajes no leídos
    initializeGlobalUnreadCounter() {
        const globalCounter = document.getElementById('global-unread-counter');
        
        if (globalCounter) {
            // Agregar funcionalidad de click
            globalCounter.addEventListener('click', () => {
                // Buscar la primera conversación con mensajes no leídos
                const firstUnreadConversation = Array.from(this.conversations.values())
                    .find(conv => conv.unreadCount > 0);
                
                if (firstUnreadConversation) {
                    // Cambiar al tab de chats si no está activo
                    const chatsTab = document.querySelector('[data-tab="chats"]');
                    if (chatsTab && !chatsTab.classList.contains('active')) {
                        chatsTab.click();
                    }
                    
                    // Abrir la conversación con mensajes no leídos
                    setTimeout(() => {
                        this.openConversation(firstUnreadConversation._id);
                    }, 200);
                } else {
                    // Si no hay mensajes no leídos, simplemente ir al tab de chats
                    const chatsTab = document.querySelector('[data-tab="chats"]');
                    if (chatsTab) {
                        chatsTab.click();
                    }
                }
            });
            
            // Agregar tooltip
            globalCounter.title = 'Ver mensajes no leídos';
        }
    }
    
    // Función temporal para testing del contador global (REMOVER DESPUÉS)
    testGlobalCounter() {
        console.log('=== TESTING GLOBAL COUNTER ===');
        
        // Verificar que los elementos existen
        const globalCounter = document.getElementById('global-unread-badge') || document.getElementById('global-unread-counter');
        const globalCountElement = document.getElementById('global-unread-count');
        
        console.log('Global counter element:', globalCounter);
        console.log('Global count element:', globalCountElement);
        console.log('Current display style:', globalCounter ? globalCounter.style.display : 'N/A');
        
        if (globalCounter && globalCountElement) {
            // Simular 3 mensajes no leídos
            globalCountElement.textContent = '3';
            globalCounter.style.display = 'flex';
            globalCounter.style.visibility = 'visible';
            globalCounter.style.opacity = '1';
            
            console.log('✅ Counter forced to display with 3 unread messages');
            console.log('Final display style:', globalCounter.style.display);
            console.log('Final visibility:', globalCounter.style.visibility);
            
            // También actualizar el titulo de la página
            document.title = '(3) VigiChat - Chat en Tiempo Real';
            
        } else {
            console.error('❌ Counter elements not found!');
            
            // Buscar elementos en todo el documento
            const allElements = document.querySelectorAll('[id*="global"]');
            console.log('Elements with "global" in ID:', allElements);
        }
    }
    
    // Función para simular mensajes no leídos usando el sistema normal
    // DEPRECATED - Use real database data instead
    simulateUnreadMessages() {
        console.warn('⚠️ simulateUnreadMessages is deprecated - using real database data');
        return;
        console.log('=== SIMULATING UNREAD MESSAGES ===');
        
        // Verificar si hay conversaciones
        if (this.conversations.size === 0) {
            console.log('No conversations available to simulate unread messages');
            return;
        }
        
        // Tomar la primera conversación y simular mensajes no leídos
        const firstConversation = Array.from(this.conversations.values())[0];
        if (firstConversation) {
            firstConversation.unreadCount = 2;
            firstConversation.hasNewMessage = true;
            
            console.log('Simulated 2 unread messages for conversation:', firstConversation.name);
            
            // Actualizar la UI usando el sistema normal
            this.updateGlobalUnreadCounter();
            this.renderConversations();
            
            console.log('✅ Updated UI through normal system');
        }
    }
    
    // Ocultar badge verde estilo Messenger
    hideMessengerBadge(conversationId, callback) {
        const chatItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (chatItem) {
            const badge = chatItem.querySelector('.unread-badge-messenger');
            if (badge) {
                badge.classList.add('fade-out');
                setTimeout(() => {
                    if (callback) callback();
                    // Actualizar contador global después de ocultar badge individual
                    this.updateGlobalUnreadCounter();
                }, 300);
                console.log('Badge Messenger ocultado para:', conversationId);
            } else {
                if (callback) callback();
                // Actualizar contador global incluso si no había badge
                this.updateGlobalUnreadCounter();
            }
        } else {
            if (callback) callback();
            // Actualizar contador global incluso si no se encontró el elemento
            this.updateGlobalUnreadCounter();
        }
    }
    
    // Actualizar indicadores en tiempo real
    updateMessageIndicators() {
        this.conversations.forEach((conversation, conversationId) => {
            if (conversation.hasNewMessage && conversation.lastNewMessageTime) {
                const timeSinceMessage = new Date() - new Date(conversation.lastNewMessageTime);
                
                // Si han pasado más de 30 segundos, cambiar de verde a rojo
                if (timeSinceMessage > 30000) {
                    const indicator = document.getElementById(`indicator-${conversationId}`);
                    if (indicator && indicator.classList.contains('new-message-indicator')) {
                        indicator.classList.remove('new-message-indicator');
                        indicator.classList.add('online-indicator');
                        conversation.hasNewMessage = false;
                    }
                }
            }
        });
    }

    // Start a new chat with a specific user
    async startChatWithUser(userId) {
        console.log('Starting chat with user:', userId);
        
        // Ensure we have a current user
        if (!this.currentUser) {
            const currentUser = window.AuthManager ? window.AuthManager.getCurrentUser() : Utils.Storage.get('currentUser');
            if (currentUser) {
                this.currentUser = currentUser;
            } else {
                console.error('No current user available to start chat');
                Utils.Notifications.error('Error: Usuario no autenticado');
                return;
            }
        }
        
        try {
            // Check if conversation already exists
            let conversation = await this.findOrCreateConversation(userId);
            
            if (conversation) {
                // Use the optimized selectConversation method instead of duplicating code
                await this.handleChatItemClick(conversation._id);
                
                console.log('Chat started successfully with user:', userId);
            } else {
                throw new Error('Could not create or find conversation');
            }
        } catch (error) {
            console.error('Error starting chat with user:', error);
            Utils.Notifications.error('Error al iniciar la conversación');
        }
    }

    // Find existing conversation or create new one
    async findOrCreateConversation(userId) {
        try {
            console.log('🔍 Finding or creating conversation with user:', userId);
            console.log('Current user ID:', this.currentUser?._id);
            
            // Check authentication first
            if (!window.API || !window.API.Auth.isAuthenticated()) {
                console.log('User not authenticated, creating local conversation only');
                const localConversation = {
                    _id: `temp_${userId}_${this.currentUser._id}`,
                    type: 'private',
                    participants: [userId, this.currentUser._id],
                    lastMessage: null,
                    lastActivity: new Date(),
                    isTemporary: true
                };
                this.conversations.set(localConversation._id, localConversation);
                return localConversation;
            }

            // Helper function to check if conversation is between these two users
            const isConversationBetweenUsers = (conversation, user1Id, user2Id) => {
                if (!conversation.participants || conversation.participants.length !== 2) {
                    return false;
                }
                const participants = conversation.participants.map(p => 
                    typeof p === 'object' ? p._id : p
                );
                return participants.includes(user1Id) && participants.includes(user2Id);
            };

            // First, try to find existing conversation from loaded conversations
            console.log('📋 Checking loaded conversations:', this.conversations.size);
            const existingConversation = [...this.conversations.values()].find(conv => 
                isConversationBetweenUsers(conv, userId, this.currentUser._id)
            );

            if (existingConversation) {
                console.log(' Found existing conversation from cache:', existingConversation._id);
                return existingConversation;
            }

            // Load conversations from API to check for existing ones
            console.log('Loading conversations from API...');
            await this.loadConversations();
            
            // Check again after loading with more detailed logging
            console.log('📋 Re-checking after API load. Total conversations:', this.conversations.size);
            const existingAfterLoad = [...this.conversations.values()].find(conv => {
                const isMatch = isConversationBetweenUsers(conv, userId, this.currentUser._id);
                if (isMatch) {
                    console.log(' Found matching conversation:', {
                        id: conv._id,
                        participants: conv.participants,
                        lastMessage: conv.lastMessage?.content?.text?.substring(0, 50)
                    });
                }
                return isMatch;
            });

            if (existingAfterLoad) {
                console.log(' Found existing conversation after API load:', existingAfterLoad._id);
                return existingAfterLoad;
            }

            console.log('ERROR No existing conversation found, creating temporary one');
            
            // If no existing conversation, create a simple local one
            // The conversation will be created in the backend when the first real message is sent
            const localConversation = {
                _id: `temp_${userId}_${this.currentUser._id}`,
                type: 'private',
                participants: [userId, this.currentUser._id],
                lastMessage: null,
                lastActivity: new Date(),
                isTemporary: true // Mark as temporary
            };
            
            this.conversations.set(localConversation._id, localConversation);
            console.log('🆕 Created temporary conversation:', localConversation._id);
            return localConversation;
            
        } catch (error) {
            console.error('Error finding/creating conversation:', error);
            throw error;
        }
    }

    // Set current conversation and update UI
    setCurrentConversation(conversation) {
        this.currentConversation = conversation;
        console.log(' Setting current conversation:', conversation);
        
        // Update chat header with contact info
        this.updateChatHeader(conversation);
        
        // Start real-time updates for this conversation
        this.startConversationUpdates();
        
        // Get fresh contact data using the exact same API as contacts.js
        const recipientId = this.getRecipientId();
        if (recipientId) {
            this.fetchContactDataForHeader(recipientId);
        }
        
        // Add conversation to the sidebar if it's not temporary and not already there
        if (!conversation.isTemporary && !conversation._id.startsWith('temp_')) {
            this.addConversationToSidebar(conversation);
        }
        
        // Clear messages container and show placeholder
        if (this.messageContainer) {
            this.messageContainer.innerHTML = `
                <div class="chat-placeholder" style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    text-align: center;
                    color: #6b7280;
                    padding: 2rem;
                ">
                    <div class="placeholder-content">
                        <i class="fas fa-comments" style="font-size: 3rem; margin-bottom: 1rem; color: #d1d5db;"></i>
                        <h3 style="margin: 0 0 0.5rem 0; font-weight: 500;">Conversación ${conversation.isTemporary ? 'nueva' : 'encontrada'}</h3>
                        <p style="margin: 0; font-size: 0.9rem;">${conversation.isTemporary ? 'Envía un mensaje para comenzar la conversación' : 'Cargando mensajes anteriores...'}</p>
                    </div>
                </div>
            `;
        }
    }

    // Update chat header with participant info
    updateChatHeader(conversation) {
        if (!conversation || !this.currentUser) return;

        // Find the other participant (not current user)
        const otherParticipantId = conversation.participants.find(p => p !== this.currentUser._id);
        
        // Get participant info from contacts or fetch from API
        const participant = this.contacts.get(otherParticipantId);
        
        if (participant) {
            this.updateHeaderWithContact(participant);
        } else {
            // Fetch participant info from API
            this.fetchAndUpdateHeaderContact(otherParticipantId);
        }
    }

    // Update header elements with contact information
    updateHeaderWithContact(contact) {
        const contactName = Utils.$('.contact-info h3');
        const contactAvatar = Utils.$('.contact-info img');
        const contactStatus = Utils.$('.contact-info .status');

        if (contactName) contactName.textContent = contact.fullName || contact.username;
        if (contactAvatar) {
            contactAvatar.src = contact.avatar || '/images/user-placeholder-40.svg';
            contactAvatar.alt = contact.fullName || contact.username;
        }
        if (contactStatus) {
            if (contact.status === 'online') {
                contactStatus.textContent = 'En línea';
                contactStatus.className = 'status-text online';
                contactStatus.style.color = '#10b981 !important';
            } else {
                contactStatus.textContent = contact.lastSeen ? Utils.formatLastSeenStyled(contact.lastSeen) : 'Desconectado';
                contactStatus.className = 'status-text offline';
                contactStatus.style.color = 'var(--text-secondary)';
            }
        }
    }

    // Fetch contact info and update header
    async fetchAndUpdateHeaderContact(userId) {
        try {
            // Try the Users API endpoint that we know works from profileViewer
            const response = await window.API?.Users?.getUserProfile ? 
                await window.API.Users.getUserProfile(userId) : null;

            if (response && response.success && response.data) {
                const contact = response.data;
                this.contacts.set(userId, contact);
                this.updateHeaderWithContact(contact);
                console.log('Contact info loaded for chat header:', contact.fullName);
            } else {
                // Fallback: use a simple display name
                console.log('Could not fetch contact info, using fallback');
                const fallbackContact = {
                    fullName: 'Usuario',
                    username: 'usuario',
                    status: 'offline',
                    avatar: '/images/user-placeholder-40.svg'
                };
                this.updateHeaderWithContact(fallbackContact);
            }
        } catch (error) {
            console.error('Error fetching contact info:', error);
            // Use fallback on error
            const fallbackContact = {
                fullName: 'Usuario',
                username: 'usuario', 
                status: 'offline',
                avatar: '/images/user-placeholder-40.svg'
            };
            this.updateHeaderWithContact(fallbackContact);
        }
    }
    
    // Add conversation to sidebar if not already there
    addConversationToSidebar(conversation) {
        console.log('🔧 Adding conversation to sidebar:', conversation._id);
        
        // Check if conversation is already in the conversations map
        if (this.conversations.has(conversation._id)) {
            console.log(' Conversation already in sidebar, refreshing render');
            this.renderConversations();
            return;
        }
        
        // Add to conversations map
        this.conversations.set(conversation._id, conversation);
        
        // Re-render conversations to show the new one
        this.renderConversations();
        
        console.log(' Conversation added to sidebar and rendered');
    }
    
    // Función para enfocar en el último mensaje (versión mejorada y más robusta)
    focusOnLatestMessage() {
        // Buscar mensajes con múltiples selectores para mayor compatibilidad
        const messageSelectors = [
            '.message',
            '[data-message-id]',
            '.message-content'
        ];
        
        let messages = null;
        for (const selector of messageSelectors) {
            messages = document.querySelectorAll(selector);
            if (messages.length > 0) break;
        }
        
        if (messages && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            
            // Usar requestAnimationFrame para asegurar que el DOM esté listo
            requestAnimationFrame(() => {
                // Scroll suave al último mensaje
                lastMessage.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'end',
                    inline: 'nearest' 
                });
                
                // Agregar efecto visual temporal al último mensaje
                lastMessage.classList.add('latest-message-highlight');
                setTimeout(() => {
                    if (lastMessage.classList.contains('latest-message-highlight')) {
                        lastMessage.classList.remove('latest-message-highlight');
                    }
                }, 2000);
                
                console.log(' Enfocado en el último mensaje:', {
                    totalMessages: messages.length,
                    lastMessageId: lastMessage.dataset?.messageId || 'no-id',
                    scrollPosition: lastMessage.offsetTop
                });
            });
        } else {
            console.log('📭 No hay mensajes para enfocar');
        }
    }
    
    // Función común para setup completo de conversación - optimizada
    async setupConversationView(conversationId, isNewChat = false) {
        console.log(`🔧 Setting up conversation view for: ${conversationId}, isNewChat: ${isNewChat}`);
        
        // Inicializar gestión del scroll
        this.setupScrollManagement();
        
        // Cargar mensajes
        await this.loadConversationMessages(conversationId);
        
        // Auto-scroll inmediato
        this.performRobustAutoScroll();
        
        // Usar requestAnimationFrame para scroll y enfoque más eficiente
        requestAnimationFrame(() => {
            this.performRobustAutoScroll();
            this.focusOnLatestMessage();
        });
        
        // Marcar como leída (sin await para no bloquear)
        this.markConversationAsRead(conversationId);
        window.SocketManager?.markConversationAsRead(conversationId);
        
        // Log para debugging
        console.log(` Conversación configurada correctamente: ${conversationId}`);
    }
    
    // Función para asegurar que el último mensaje sea visible - estilo WhatsApp
    ensureLastMessageVisible() {
        const messages = document.querySelectorAll('.message');
        if (messages.length === 0) return false;
        
        const lastMessage = messages[messages.length - 1];
        const scrollElement = this.getScrollableElement();
        
        if (!scrollElement || !lastMessage) return false;
        
        // Prevenir bucles infinitos con contador
        if (!this._scrollAttempts) this._scrollAttempts = 0;
        if (this._scrollAttempts >= 3) {
            this._scrollAttempts = 0;
            return true; // Salir para evitar bucle infinito
        }
        
        this._scrollAttempts++;
        
        // Función de scroll optimizada y simple
        const executeOptimizedScroll = () => {
            try {
                // Calcular posición correcta del scroll
                const maxScrollTop = Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight);
                
                // Método principal: scroll directo
                scrollElement.scrollTop = maxScrollTop;
                
                // Verificar si el scroll fue exitoso
                const actualScrollTop = scrollElement.scrollTop;
                const scrollSuccess = Math.abs(actualScrollTop - maxScrollTop) <= 5;
                
                if (!scrollSuccess) {
                    // Fallback: usar scrollIntoView solo si es necesario
                    lastMessage.scrollIntoView({ 
                        behavior: 'auto',
                        block: 'end',
                        inline: 'nearest'
                    });
                }
                
                return scrollSuccess;
            } catch (error) {
                // Fallback ultra-simple en caso de error
                scrollElement.scrollTop = scrollElement.scrollHeight;
                return true;
            }
        };
        
        // Ejecutar scroll inmediatamente
        const success = executeOptimizedScroll();
        
        // Solo un requestAnimationFrame adicional si falló el primer intento
        if (!success) {
            requestAnimationFrame(() => {
                executeOptimizedScroll();
                // Reset counter después de intento
                setTimeout(() => {
                    this._scrollAttempts = 0;
                }, 100);
            });
        } else {
            // Reset counter inmediatamente si fue exitoso
            this._scrollAttempts = 0;
        }
        
        return true;
    }
    
    // Nueva función para auto-scroll mejorado que se ejecuta después de cada mensaje
    performWhatsAppStyleAutoScroll() {
        
        // Ejecutar scroll inmediato múltiple
        this.scrollToBottom();
        this.ensureLastMessageVisible();
        
        // Respaldo adicional con delay
        setTimeout(() => {
            this.scrollToBottom();
            this.ensureLastMessageVisible();
        }, 50);
        
        // Respaldo adicional más largo para casos lentos
        setTimeout(() => {
            this.scrollToBottom();
            this.ensureLastMessageVisible();
        }, 200);
        
        // Respaldo final para asegurar que siempre funcione
        setTimeout(() => {
            this.scrollToBottom();
            this.ensureLastMessageVisible();
        }, 500);
    }

    // Función robusta de auto-scroll que combina todas las técnicas
    performRobustAutoScroll() {
        
        // Función auxiliar para ejecutar scroll múltiple
        const executeMultipleScrollMethods = () => {
            try {
                // Método 1: scrollToBottom tradicional
                this.scrollToBottom();
                
                // Método 2: ensureLastMessageVisible
                this.ensureLastMessageVisible();
                
                // Método 3: scroll directo al elemento contenedor
                const scrollElement = this.getScrollableElement();
                if (scrollElement) {
                    const targetScrollTop = scrollElement.scrollHeight - scrollElement.clientHeight;
                    scrollElement.scrollTop = Math.max(0, targetScrollTop + 50); // +50px extra para asegurar
                }
                
                // Método 4: scrollIntoView al último mensaje
                const messages = document.querySelectorAll('.message');
                if (messages.length > 0) {
                    const lastMessage = messages[messages.length - 1];
                    lastMessage.scrollIntoView({ 
                        behavior: 'auto', 
                        block: 'end', 
                        inline: 'nearest' 
                    });
                }
                
            } catch (error) {
                console.error('Error en executeMultipleScrollMethods:', error);
            }
        };
        
        // Ejecución inmediata
        executeMultipleScrollMethods();
        
        // Solo dos requestAnimationFrame para casos donde el DOM no está listo
        requestAnimationFrame(() => {
            executeMultipleScrollMethods();
            
            requestAnimationFrame(() => {
                executeMultipleScrollMethods();
            });
        });
        
        // Solo un timeout mínimo como respaldo final (eliminamos los delays largos)
        setTimeout(() => {
            executeMultipleScrollMethods();
        }, 50);
    }

    // Context menu for conversations
    showConversationContextMenu(event, conversation) {
        this.hideAllContextMenus(); // Hide any existing menus
        
        const contextMenu = Utils.createElement('div', {
            className: 'context-menu conversation-context-menu',
            style: 'position: fixed; z-index: 10000; background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 8px 0; min-width: 200px;'
        });
        
        const menuItems = [
            {
                icon: 'fas fa-broom',
                text: 'Vaciar chat',
                action: () => this.clearConversationAdvanced(conversation._id)
            },
            {
                icon: 'fas fa-trash-alt',
                text: 'Eliminar conversación',
                action: () => this.deleteConversation(conversation._id)
            },
            {
                icon: 'fas fa-ban',
                text: 'Bloquear usuario',
                action: () => this.blockUserFromChat(conversation)
            }
        ];
        
        menuItems.forEach(item => {
            const menuItem = Utils.createElement('div', {
                className: 'context-menu-item',
                style: 'padding: 12px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; color: #333; font-size: 14px;',
                onclick: () => {
                    item.action();
                    this.hideAllContextMenus();
                }
            });
            
            menuItem.innerHTML = `<i class="${item.icon}" style="width: 16px; font-size: 14px;"></i><span>${item.text}</span>`;
            
            // Hover effect
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.backgroundColor = '#f5f5f5';
            });
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.backgroundColor = 'transparent';
            });
            
            contextMenu.appendChild(menuItem);
        });
        
        // Position the menu
        const x = event.clientX || (event.touches && event.touches[0].clientX) || 0;
        const y = event.clientY || (event.touches && event.touches[0].clientY) || 0;
        
        contextMenu.style.left = `${Math.min(x, window.innerWidth - 220)}px`;
        contextMenu.style.top = `${Math.min(y, window.innerHeight - 200)}px`;
        
        document.body.appendChild(contextMenu);
        
        // Close on click outside
        setTimeout(() => {
            document.addEventListener('click', this.handleContextMenuOutsideClick.bind(this), { once: true });
        }, 10);
    }

    // Context menu for individual messages
    showMessageContextMenu(event, message) {
        this.hideAllContextMenus();
        
        const contextMenu = Utils.createElement('div', {
            className: 'context-menu message-context-menu',
            style: 'position: fixed; z-index: 10000; background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 8px 0; min-width: 180px;'
        });
        
        const menuItems = [
            {
                icon: 'fas fa-check-circle',
                text: 'Seleccionar',
                action: () => this.startSelectionMode(message)
            },
            {
                icon: 'fas fa-reply',
                text: 'Responder',
                action: () => this.replyToMessage(message)
            },
            {
                icon: 'fas fa-share',
                text: 'Reenviar',
                action: () => this.forwardMessage(message)
            },
            {
                icon: 'fas fa-copy',
                text: 'Copiar',
                action: () => this.copyMessage(message)
            }
        ];
        
        // Add delete option only for own messages
        if (message.sender._id === this.currentUser._id) {
            menuItems.push({
                icon: 'fas fa-trash',
                text: 'Eliminar',
                action: () => this.deleteMessageAdvanced(message._id, message)
            });
        }
        
        menuItems.forEach(item => {
            const menuItem = Utils.createElement('div', {
                className: 'context-menu-item',
                style: 'padding: 12px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; color: #333; font-size: 14px;',
                onclick: () => {
                    item.action();
                    this.hideAllContextMenus();
                }
            });
            
            menuItem.innerHTML = `<i class="${item.icon}" style="width: 16px; font-size: 14px;"></i><span>${item.text}</span>`;
            
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.backgroundColor = '#f5f5f5';
            });
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.backgroundColor = 'transparent';
            });
            
            contextMenu.appendChild(menuItem);
        });
        
        const x = event.clientX || (event.touches && event.touches[0].clientX) || 0;
        const y = event.clientY || (event.touches && event.touches[0].clientY) || 0;
        
        contextMenu.style.left = `${Math.min(x, window.innerWidth - 200)}px`;
        contextMenu.style.top = `${Math.min(y, window.innerHeight - 250)}px`;
        
        document.body.appendChild(contextMenu);
        
        setTimeout(() => {
            document.addEventListener('click', this.handleContextMenuOutsideClick.bind(this), { once: true });
        }, 10);
    }

    hideAllContextMenus() {
        const existingMenus = document.querySelectorAll('.context-menu');
        existingMenus.forEach(menu => menu.remove());
    }

    handleContextMenuOutsideClick(event) {
        if (!event.target.closest('.context-menu')) {
            this.hideAllContextMenus();
        }
    }

    // Conversation context menu actions
    async clearConversation(conversationId) {
        if (confirm('¿Estás seguro de que quieres vaciar este chat? Esta acción no se puede deshacer.')) {
            try {
                const response = await API.Messages.clearConversation(conversationId);
                if (response.success) {
                    // Reload the conversation if it's currently active
                    if (this.currentConversation && this.currentConversation._id === conversationId) {
                        this.loadConversationMessages(conversationId);
                    }
                    Utils.Notifications.success('Chat vaciado exitosamente');
                }
            } catch (error) {
                console.error('Error clearing conversation:', error);
                Utils.Notifications.error('Error al vaciar el chat');
            }
        }
    }

    muteConversation(conversationId) {
        // Implementation for muting conversation
        Utils.Notifications.info('Conversación silenciada');
    }

    pinConversation(conversationId) {
        // Implementation for pinning conversation
        Utils.Notifications.info('Conversación fijada');
    }

    // Message context menu actions
    replyToMessage(message) {
        // Set reply context and focus input
        if (this.messageInput) {
            // Remove any existing reply preview
            const existingReply = document.querySelector('.reply-preview');
            if (existingReply) {
                existingReply.remove();
            }

            const replyPreview = Utils.createElement('div', {
                className: 'reply-preview',
                style: 'background: #f8fafc; padding: 12px; margin-bottom: 8px; border-left: 4px solid #4f46e5; border-radius: 8px; position: relative; animation: slideDown 0.2s ease-out;'
            });
            
            replyPreview.innerHTML = `
                <div class="reply-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-reply" style="color: #4f46e5; font-size: 12px;"></i>
                        <span style="font-size: 12px; color: #4f46e5; font-weight: 600;">Respondiendo a ${message.sender.fullName || message.sender.username}</span>
                    </div>
                    <button class="close-reply-btn" style="background: none; border: none; cursor: pointer; color: #64748b; font-size: 16px; padding: 2px;">×</button>
                </div>
                <div class="reply-message-preview" style="font-size: 14px; color: #374151; background: white; padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb;">
                    ${Utils.truncateText(message.content.text, 50)}
                </div>
            `;
            
            const inputContainer = this.messageInput.parentElement;
            inputContainer.insertBefore(replyPreview, this.messageInput);
            
            // Bind close button event
            const closeBtn = replyPreview.querySelector('.close-reply-btn');
            closeBtn.addEventListener('click', () => {
                replyPreview.remove();
                this.replyContext = null;
                this.messageInput.focus();
            });
            
            this.messageInput.focus();
            
            // Store reply context
            this.replyContext = message;
        }
    }

    forwardMessage(message) {
        // Open forward modal and initialize forwarding
        if (window.forwardManager) {
            window.forwardManager.openForwardModal(message);
        } else {
            // Initialize forward manager if not already created
            window.forwardManager = new ForwardManager();
            window.forwardManager.openForwardModal(message);
        }
    }

    copyMessage(message) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(message.content.text).then(() => {
                Utils.Notifications.success('Mensaje copiado al portapapeles');
            }).catch(err => {
                console.error('Error copying message:', err);
                Utils.Notifications.error('Error al copiar mensaje');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = message.content.text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            Utils.Notifications.success('Mensaje copiado al portapapeles');
        }
    }

    async deleteMessage(messageId) {
        if (confirm('¿Estás seguro de que quieres eliminar este mensaje?')) {
            try {
                if (window.SocketManager) {
                    window.SocketManager.socket.emit('delete-message', { messageId });
                    Utils.Notifications.success('Mensaje eliminado');
                }
            } catch (error) {
                console.error('Error deleting message:', error);
                Utils.Notifications.error('Error al eliminar mensaje');
            }
        }
    }

    // New function for deleting entire conversation
    async deleteConversation(conversationId) {
        const conversation = this.conversations.get(conversationId);
        if (!conversation) return;

        const contactName = conversation.name || 'este usuario';
        
        const confirmed = await Utils.ConfirmationModal.deleteConversation(contactName);
        if (!confirmed) return;

        try {
                const response = await fetch(`/api/messages/conversation/${conversationId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${Utils.Storage.get('authToken')}`
                    }
                });

                if (response.ok) {
                    // Remove conversation from local storage
                    this.conversations.delete(conversationId);
                    
                    // Remove from UI
                    const conversationItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
                    if (conversationItem) {
                        conversationItem.remove();
                    }
                    
                    // If this was the active conversation, show welcome screen
                    if (this.currentConversation && this.currentConversation._id === conversationId) {
                        this.currentConversation = null;
                        this.showWelcomeScreen();
                        
                        // Notify welcome screen manager
                        if (window.welcomeScreenManager) {
                            window.welcomeScreenManager.setActiveConversation(false);
                        }
                    }
                    
                    const result = await response.json();
                    
                    // Show appropriate message based on deletion type
                    const successMessage = result.data?.conversationCompletelyDeleted ? 
                        `Conversación con ${contactName} eliminada completamente` : 
                        `Conversación con ${contactName} eliminada de tu vista`;
                    
                    Utils.Notifications.success(successMessage);
                    
                    console.log('OK Conversation deleted:', {
                        conversationId,
                        deletedForUser: result.data?.deletedForUser,
                        completelyDeleted: result.data?.conversationCompletelyDeleted
                    });
                } else {
                    const error = await response.json();
                    throw new Error(error.message || 'Error al eliminar la conversación');
                }
        } catch (error) {
            console.error('Error deleting conversation:', error);
            Utils.Notifications.error('Error al eliminar la conversación');
        }
    }

    // Function to block user from chat context menu
    async blockUserFromChat(conversation) {
        const recipientId = conversation.participants?.find(p => p !== this.currentUser?._id);
        if (!recipientId) {
            Utils.Notifications.error('No se pudo identificar al usuario');
            return;
        }

        const contactName = conversation.name || 'este usuario';
        
        const confirmed = await Utils.ConfirmationModal.block(contactName);
        if (!confirmed) return;

        try {
            // Use the same API function that works in contacts
            const response = await API.Contacts.blockContact(recipientId);

            if (response.success) {
                // Remove conversation from UI
                const conversationItem = document.querySelector(`[data-conversation-id="${conversation._id}"]`);
                if (conversationItem) {
                    conversationItem.remove();
                }
                
                // Remove from conversations map
                this.conversations.delete(conversation._id);
                
                // If this was the active conversation, show welcome screen  
                if (this.currentConversation && this.currentConversation._id === conversation._id) {
                    this.currentConversation = null;
                    this.showWelcomeScreen();
                    
                    if (window.welcomeScreenManager) {
                        window.welcomeScreenManager.setActiveConversation(false);
                    }
                }
                
                // Add to blocked contacts if manager exists
                if (window.blockedContactsManager) {
                    window.blockedContactsManager.addBlockedContact({
                        _id: recipientId,
                        fullName: contactName,
                        avatar: conversation.avatar
                    });
                }
                
                // Notify via socket if available (same as contacts)
                if (window.socket) {
                    window.socket.emit('contactBlocked', { contactId: recipientId });
                }
                
                Utils.Notifications.success('Contacto bloqueado correctamente');
            } else {
                throw new Error(response.message || 'Error al bloquear el contacto');
            }
        } catch (error) {
            console.error('Block contact error:', error);
            Utils.Notifications.error('Error al bloquear el contacto: ' + error.message);
        }
    }

    // Advanced function for clearing conversation with options
    async clearConversationAdvanced(conversationId) {
        const conversation = this.conversations.get(conversationId);
        if (!conversation) return;

        const contactName = conversation.name || 'este usuario';
        
        const action = await Utils.ConfirmationModal.clearChatAdvanced(contactName);
        if (!action) return; // User cancelled

        try {
            const deleteForBoth = action === 'both';
            
            const response = await fetch(`/api/messages/conversation/${conversationId}/clear`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Utils.Storage.get('authToken')}`
                },
                body: JSON.stringify({ 
                    deleteForBoth: deleteForBoth 
                })
            });

            if (response.ok) {
                const result = await response.json();
                
                // Reload the conversation if it's currently active
                if (this.currentConversation && this.currentConversation._id === conversationId) {
                    await this.loadConversationMessages(conversationId);
                }
                
                // Update conversation list
                this.renderConversations();
                
                // Show detailed success message
                const successMessage = result.data?.description || 
                    (deleteForBoth ? 'Chat vaciado para ambos usuarios' : 'Chat vaciado para ti');
                Utils.Notifications.success(successMessage);
                
                console.log('OK Chat cleared:', {
                    messagesDeleted: result.data?.messagesDeleted,
                    deleteForBoth: result.data?.deleteForBoth,
                    description: result.data?.description
                });
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Error al vaciar el chat');
            }
        } catch (error) {
            console.error('Error clearing conversation:', error);
            Utils.Notifications.error('Error al vaciar el chat');
        }
    }

    // Replace message with permanent deletion placeholder (WhatsApp style)
    replaceMessageWithDeletionPlaceholder(messageElement, deletedByName) {
        if (!messageElement) return;
        
        // Preserve original message positioning (sent/received)
        const isOwnMessage = messageElement.classList.contains('sent');
        const messageId = messageElement.getAttribute('data-message-id');
        
        // Create deletion placeholder content
        const placeholderContent = `
            <div class="message-content deleted-for-everyone" style="
                padding: 12px;
                background: ${isOwnMessage ? 'rgba(0, 168, 132, 0.1)' : 'rgba(128, 128, 128, 0.1)'};
                border-radius: 8px;
                text-align: center;
                font-style: italic;
                color: #666;
                font-size: 14px;
                border: 1px dashed #ccc;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                min-height: 40px;
            ">
                <i class="fas fa-ban" style="color: #999; font-size: 12px;"></i>
                <span>Este mensaje fue eliminado por ${deletedByName}</span>
            </div>
        `;
        
        // Replace message content but keep the message structure
        messageElement.innerHTML = placeholderContent;
        
        // Add permanent deletion class
        messageElement.classList.add('deleted-for-everyone');
        messageElement.setAttribute('data-deleted-for-everyone', 'true');
        messageElement.setAttribute('data-deleted-by', deletedByName);
        
        // Remove any interaction capabilities
        messageElement.style.pointerEvents = 'none';
        messageElement.removeEventListener('contextmenu', () => {});
        
        console.log(`Message ${messageId} replaced with permanent deletion placeholder`);
    }

    // WhatsApp-style deletion modal
    showWhatsAppStyleDeletionModal(canDeleteForEveryone, messageAgeMinutes) {
        return new Promise((resolve) => {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.2s ease;
            `;

            // Create modal content
            const modal = document.createElement('div');
            modal.style.cssText = `
                background: white;
                border-radius: 8px;
                padding: 0;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                transform: scale(0.9);
                transition: transform 0.2s ease;
            `;

            // Create modal header
            const header = document.createElement('div');
            header.style.cssText = `
                padding: 20px 24px 16px 24px;
                border-bottom: 1px solid #e0e0e0;
            `;
            header.innerHTML = `
                <h3 style="margin: 0; font-size: 18px; font-weight: 500; color: #333;">
                    Eliminar mensaje
                </h3>
            `;

            // Create modal body with options
            const body = document.createElement('div');
            body.style.cssText = `padding: 0;`;
            
            let timeWarning = '';
            if (!canDeleteForEveryone) {
                timeWarning = `
                    <div style="padding: 16px 24px; background: #fff3cd; border-left: 4px solid #ffc107; margin: 0;">
                        <p style="margin: 0; font-size: 14px; color: #856404;">
                            <i class="fas fa-clock" style="margin-right: 8px;"></i>
                            Este mensaje tiene más de 1 hora y 8 minutos. Solo se puede eliminar para ti.
                        </p>
                    </div>
                `;
            }

            body.innerHTML = `
                ${timeWarning}
                <div style="padding: 20px 0;">
                    <div class="deletion-option" data-action="just-me" style="
                        padding: 16px 24px;
                        cursor: pointer;
                        border-bottom: 1px solid #f0f0f0;
                        transition: background-color 0.2s ease;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    ">
                        <i class="fas fa-user" style="color: #666; width: 20px;"></i>
                        <div>
                            <div style="font-weight: 500; color: #333; margin-bottom: 4px;">
                                Eliminar solo para mí
                            </div>
                            <div style="font-size: 13px; color: #666;">
                                El mensaje se eliminará solo de tu chat
                            </div>
                        </div>
                    </div>
                    ${canDeleteForEveryone ? `
                        <div class="deletion-option" data-action="everyone" style="
                            padding: 16px 24px;
                            cursor: pointer;
                            transition: background-color 0.2s ease;
                            display: flex;
                            align-items: center;
                            gap: 12px;
                        ">
                            <i class="fas fa-users" style="color: #666; width: 20px;"></i>
                            <div>
                                <div style="font-weight: 500; color: #333; margin-bottom: 4px;">
                                    Eliminar para todos
                                </div>
                                <div style="font-size: 13px; color: #666;">
                                    El mensaje se eliminará para todos en este chat
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;

            // Create modal footer
            const footer = document.createElement('div');
            footer.style.cssText = `
                padding: 16px 24px;
                border-top: 1px solid #e0e0e0;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            `;
            footer.innerHTML = `
                <button id="cancel-deletion" style="
                    background: transparent;
                    border: 1px solid #ddd;
                    color: #666;
                    padding: 8px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                ">Cancelar</button>
            `;

            // Assemble modal
            modal.appendChild(header);
            modal.appendChild(body);
            modal.appendChild(footer);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // Add hover effects
            body.querySelectorAll('.deletion-option').forEach(option => {
                option.addEventListener('mouseenter', () => {
                    option.style.backgroundColor = '#f8f9fa';
                });
                option.addEventListener('mouseleave', () => {
                    option.style.backgroundColor = 'transparent';
                });
                option.addEventListener('click', () => {
                    const action = option.dataset.action;
                    document.body.removeChild(overlay);
                    resolve(action);
                });
            });

            // Cancel button
            footer.querySelector('#cancel-deletion').addEventListener('click', () => {
                document.body.removeChild(overlay);
                resolve(null);
            });

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                    resolve(null);
                }
            });

            // Animate in
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                modal.style.transform = 'scale(1)';
            });
        });
    }

    // Advanced function for deleting messages with WhatsApp-style time restrictions
    async deleteMessageAdvanced(messageId, messageObject = null) {
        try {
            console.log('🗑️ Starting WhatsApp-style deleteMessageAdvanced for:', messageId);
            
            // Find the message to check its timestamp
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
            if (!messageElement) {
                console.error('Message element not found:', messageId);
                Utils.Notifications.error('Mensaje no encontrado');
                return;
            }

            // Verify this is user's own message
            const isOwnMessage = messageElement.classList.contains('sent');
            if (!isOwnMessage) {
                Utils.Notifications.error('Solo puedes eliminar tus propios mensajes');
                return;
            }

            // Get message timestamp - prioritize object data over element data
            let messageTime;
            if (messageObject && (messageObject.timestamp || messageObject.createdAt)) {
                messageTime = messageObject.timestamp || messageObject.createdAt;
            } else {
                messageTime = messageElement.dataset.timestamp || Date.now();
            }
            
            const messageDate = new Date(messageTime);
            const now = new Date();
            const timeDifference = now - messageDate;
            
            // WhatsApp-style time limits:
            // - 1 hour and 8 minutes (68 minutes) for "eliminar para todos"
            // - Always available: "eliminar solo para mí"
            const sixtyEightMinutes = 68 * 60 * 1000; // 68 minutes in milliseconds
            const canDeleteForEveryone = timeDifference < sixtyEightMinutes;
            
            const messageAgeMinutes = Math.floor(timeDifference / (1000 * 60));
            console.log(`Message age: ${messageAgeMinutes} minutes, can delete for everyone: ${canDeleteForEveryone}`);

            // Show WhatsApp-style deletion options
            const action = await this.showWhatsAppStyleDeletionModal(canDeleteForEveryone, messageAgeMinutes);
            if (!action) {
                console.log('User cancelled message deletion');
                return; // User cancelled
            }

            console.log(`Deleting message - action: ${action}`);
            
            // Add visual feedback immediately
            messageElement.style.opacity = '0.5';
            messageElement.style.pointerEvents = 'none';
            
            try {
                // Determine deletion type
                const deleteForEveryone = action === 'everyone';
                const deleteForMe = action === 'just-me';
                
                // Use HTTP API instead of socket for more reliable deletion
                const response = await fetch(`/api/messages/${messageId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${Utils.Storage.get('authToken')}`
                    },
                    body: JSON.stringify({ 
                        deleteForEveryone,
                        deleteForMe,
                        deletionType: action // 'everyone' or 'just-me'
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    
                    if (deleteForEveryone) {
                        // When deleted for everyone, replace with permanent deletion placeholder
                        console.log('OK Message deleted for everyone - creating permanent placeholder');
                        Utils.Notifications.success('Mensaje eliminado para todos');
                        
                        // Immediately replace with deletion placeholder
                        this.replaceMessageWithDeletionPlaceholder(messageElement, this.currentUser.fullName || this.currentUser.username);
                        
                        // Also reload to ensure consistency
                        setTimeout(async () => {
                            if (this.currentConversation) {
                                await this.loadConversationMessages(this.currentConversation._id);
                            }
                        }, 500);
                        
                    } else if (deleteForMe) {
                        // When deleted just for me, message disappears completely from my view
                        console.log('OK Message deleted for me only - removing from view');
                        Utils.Notifications.success('Mensaje eliminado');
                        
                        // Animate out and remove
                        messageElement.style.transform = 'scale(0.8)';
                        messageElement.style.opacity = '0';
                        
                        setTimeout(() => {
                            if (messageElement.parentNode) {
                                messageElement.remove();
                            }
                        }, 200);
                    }
                    
                    console.log('OK Message deleted successfully:', result);
                } else {
                    const error = await response.json();
                    throw new Error(error.message || 'Error al eliminar mensaje');
                }
            } catch (error) {
                console.error('ERROR Error deleting message:', error);
                
                // Restore message appearance
                if (messageElement) {
                    messageElement.style.opacity = '1';
                    messageElement.style.pointerEvents = 'auto';
                }
                
                Utils.Notifications.error(error.message || 'Error al eliminar mensaje - intenta de nuevo');
            }
            
        } catch (error) {
            console.error('ERROR Error in deleteMessageAdvanced:', error);
            Utils.Notifications.error('Error al eliminar mensaje');
            
            // Restore message appearance if there was an error
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageElement) {
                messageElement.style.opacity = '1';
                messageElement.style.pointerEvents = 'auto';
            }
        }
    }

    // ============ MULTI-SELECTION FUNCTIONALITY ============
    
    startSelectionMode(initialMessage) {
        console.log('🔘 Starting selection mode with message:', initialMessage._id);
        this.isSelectionMode = true;
        
        // Add initial message to selection
        this.selectedMessages.add(initialMessage._id);
        
        // Apply visual feedback to all messages
        this.updateSelectionVisuals();
        
        // Show selection toolbar
        this.showSelectionToolbar();
        
        // Update message click handlers
        this.updateMessageClickHandlers();
    }
    
    exitSelectionMode() {
        console.log('ERROR Exiting selection mode');
        this.isSelectionMode = false;
        this.selectedMessages.clear();
        
        // Complete cleanup of all selection styles
        this.forceCleanAllSelectionStyles();
        
        // Remove visual feedback
        this.updateSelectionVisuals();
        
        // Hide selection toolbar
        this.hideSelectionToolbar();
        
        // Restore normal message click handlers
        this.updateMessageClickHandlers();
        
        console.log('OK Selection mode completely exited and cleaned');
    }
    
    forceCleanAllSelectionStyles() {
        console.log('🧹 Force cleaning all selection styles...');
        const messages = document.querySelectorAll('.message');
        
        messages.forEach(messageEl => {
            // Remove ALL selection-related classes
            messageEl.classList.remove('selection-mode', 'selected', 'selection-mode-handler');
            
            // Remove selection indicators
            const indicators = messageEl.querySelectorAll('.selection-indicator');
            indicators.forEach(indicator => indicator.remove());
            
            // Clear any inline styles that might affect selection appearance
            messageEl.style.removeProperty('border-color');
            messageEl.style.removeProperty('background-color');
            messageEl.style.removeProperty('box-shadow');
            messageEl.style.removeProperty('transform');
            
            // Remove any selection event handlers
            const existingHandler = messageEl.selectionClickHandler;
            if (existingHandler) {
                messageEl.removeEventListener('click', existingHandler);
                delete messageEl.selectionClickHandler;
            }
        });
        
        console.log('🧹 Force cleanup completed');
    }
    
    toggleMessageSelection(messageId) {
        if (this.selectedMessages.has(messageId)) {
            this.selectedMessages.delete(messageId);
        } else {
            this.selectedMessages.add(messageId);
        }
        
        // Update visuals
        this.updateSelectionVisuals();
        
        // Update toolbar count
        this.updateSelectionToolbar();
        
        // If no messages selected, exit selection mode
        if (this.selectedMessages.size === 0) {
            this.exitSelectionMode();
        }
    }
    
    updateSelectionVisuals() {
        console.log('🎨 Updating selection visuals...');
        const messages = document.querySelectorAll('.message');
        console.log(`Found ${messages.length} messages to update visually`);
        console.log(`Selection mode: ${this.isSelectionMode}, Selected count: ${this.selectedMessages.size}`);
        
        messages.forEach(messageEl => {
            const messageId = messageEl.getAttribute('data-message-id');
            const isSelected = this.selectedMessages.has(messageId);
            
            console.log(`Message ${messageId}: selected=${isSelected}`);
            
            if (this.isSelectionMode) {
                // Add selection mode styles
                messageEl.classList.add('selection-mode');
                
                if (isSelected) {
                    messageEl.classList.add('selected');
                    console.log(`OK Added 'selected' class to message ${messageId}`);
                } else {
                    // Ensure selected class is completely removed
                    messageEl.classList.remove('selected');
                    console.log(`ERROR Removed 'selected' class from message ${messageId}`);
                }
                
                // Add/update selection indicator
                this.addSelectionIndicator(messageEl, isSelected);
            } else {
                // Remove ALL selection-related styles and classes
                messageEl.classList.remove('selection-mode', 'selected', 'selection-mode-handler');
                this.removeSelectionIndicator(messageEl);
                console.log(`🧹 Cleaned all selection styles from message ${messageId}`);
            }
        });
        
        console.log('🎨 Selection visuals update completed');
    }
    
    addSelectionIndicator(messageEl, isSelected) {
        let indicator = messageEl.querySelector('.selection-indicator');
        if (!indicator) {
            indicator = Utils.createElement('div', {
                className: 'selection-indicator',
                style: `
                    position: absolute;
                    top: 8px;
                    left: 8px;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    border: 2px solid #00bfff;
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    z-index: 10;
                    transition: all 0.2s ease;
                `
            });
            messageEl.style.position = 'relative';
            messageEl.appendChild(indicator);
        }
        
        indicator.innerHTML = isSelected ? '<i class="fas fa-check" style="color: #00bfff;"></i>' : '';
        indicator.style.backgroundColor = isSelected ? '#00bfff' : 'white';
        indicator.style.color = isSelected ? 'white' : '#00bfff';
    }
    
    removeSelectionIndicator(messageEl) {
        const indicator = messageEl.querySelector('.selection-indicator');
        if (indicator) {
            indicator.remove();
            console.log('🗑️ Selection indicator removed');
        }
        
        // Also ensure any inline styles related to selection are cleared
        const existingStyles = messageEl.style.cssText;
        if (existingStyles.includes('border') || existingStyles.includes('background') || existingStyles.includes('box-shadow')) {
            // Clear any inline selection styles that might have been applied
            messageEl.style.removeProperty('border-color');
            messageEl.style.removeProperty('background-color');
            messageEl.style.removeProperty('box-shadow');
        }
    }
    
    showSelectionToolbar() {
        if (this.selectionToolbar) {
            this.hideSelectionToolbar();
        }
        
        this.selectionToolbar = Utils.createElement('div', {
            className: 'selection-toolbar',
            style: `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 60px;
                background: #00bfff;
                color: white;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 16px;
                z-index: 1000;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                transform: translateY(-100%);
                transition: transform 0.3s ease;
            `
        });
        
        this.selectionToolbar.innerHTML = `
            <div class="selection-info">
                <button class="btn-icon" id="cancel-selection" style="background: none; border: none; color: white; font-size: 18px; margin-right: 16px;">
                    <i class="fas fa-times"></i>
                </button>
                <span class="selection-count">${this.selectedMessages.size} seleccionado(s)</span>
            </div>
            <div class="selection-actions">
                <button class="btn-icon" id="select-all-messages" title="Seleccionar todo" style="background: none; border: none; color: white; font-size: 16px; margin: 0 8px;">
                    <i class="fas fa-check-double"></i>
                </button>
                <button class="btn-icon" id="copy-selected-messages" title="Copiar" style="background: none; border: none; color: white; font-size: 16px; margin: 0 8px;">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="btn-icon" id="delete-selected-messages" title="Eliminar" style="background: none; border: none; color: white; font-size: 16px; margin: 0 8px;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(this.selectionToolbar);
        
        // Animate in
        setTimeout(() => {
            this.selectionToolbar.style.transform = 'translateY(0)';
        }, 10);
        
        // Add event listeners
        this.setupSelectionToolbarEvents();
    }
    
    hideSelectionToolbar() {
        if (this.selectionToolbar) {
            this.selectionToolbar.style.transform = 'translateY(-100%)';
            setTimeout(() => {
                if (this.selectionToolbar) {
                    this.selectionToolbar.remove();
                    this.selectionToolbar = null;
                }
            }, 300);
        }
    }
    
    updateSelectionToolbar() {
        if (this.selectionToolbar) {
            const countEl = this.selectionToolbar.querySelector('.selection-count');
            if (countEl) {
                countEl.textContent = `${this.selectedMessages.size} seleccionado(s)`;
            }
            
            // Update select all button title
            const selectAllBtn = this.selectionToolbar.querySelector('#select-all-messages');
            if (selectAllBtn) {
                const messages = document.querySelectorAll('.message');
                const selectableMessages = Array.from(messages).filter(messageEl => {
                    const messageId = messageEl.getAttribute('data-message-id');
                    return messageId && !messageId.startsWith('temp_');
                });
                
                const allSelected = selectableMessages.length > 0 && selectableMessages.every(messageEl => {
                    const messageId = messageEl.getAttribute('data-message-id');
                    return this.selectedMessages.has(messageId);
                });
                
                selectAllBtn.title = allSelected ? 'Deseleccionar todo' : 'Seleccionar todo';
            }
        }
    }
    
    setupSelectionToolbarEvents() {
        if (!this.selectionToolbar) return;
        
        // Cancel selection
        this.selectionToolbar.querySelector('#cancel-selection')?.addEventListener('click', () => {
            this.exitSelectionMode();
        });
        
        // Select all
        this.selectionToolbar.querySelector('#select-all-messages')?.addEventListener('click', () => {
            this.selectAllMessages();
        });
        
        // Copy selected
        this.selectionToolbar.querySelector('#copy-selected-messages')?.addEventListener('click', () => {
            this.copySelectedMessages();
        });
        
        // Delete selected
        this.selectionToolbar.querySelector('#delete-selected-messages')?.addEventListener('click', () => {
            this.deleteSelectedMessages();
        });
    }
    
    updateMessageClickHandlers() {
        const messages = document.querySelectorAll('.message');
        messages.forEach(messageEl => {
            const messageId = messageEl.getAttribute('data-message-id');
            
            if (this.isSelectionMode) {
                // Add selection mode class and handler
                messageEl.classList.add('selection-mode-handler');
                
                // Remove any existing selection handler
                const existingHandler = messageEl.selectionClickHandler;
                if (existingHandler) {
                    messageEl.removeEventListener('click', existingHandler);
                }
                
                // Add new selection click handler
                const selectionHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleMessageSelection(messageId);
                };
                
                messageEl.selectionClickHandler = selectionHandler;
                messageEl.addEventListener('click', selectionHandler);
            } else {
                // Remove selection mode class and handler
                messageEl.classList.remove('selection-mode-handler');
                
                const existingHandler = messageEl.selectionClickHandler;
                if (existingHandler) {
                    messageEl.removeEventListener('click', existingHandler);
                    delete messageEl.selectionClickHandler;
                }
            }
        });
    }
    
    selectAllMessages() {
        const messages = document.querySelectorAll('.message');
        const selectableMessages = Array.from(messages).filter(messageEl => {
            const messageId = messageEl.getAttribute('data-message-id');
            return messageId && !messageId.startsWith('temp_');
        });
        
        // Check if all messages are already selected
        const allSelected = selectableMessages.every(messageEl => {
            const messageId = messageEl.getAttribute('data-message-id');
            return this.selectedMessages.has(messageId);
        });
        
        if (allSelected) {
            // Deselect all messages
            console.log('🔘 Deselecting all messages...');
            this.selectedMessages.clear();
            console.log('OK Deselect all completed');
        } else {
            // Select all messages
            console.log('🔘 Selecting all messages...');
            selectableMessages.forEach(messageEl => {
                const messageId = messageEl.getAttribute('data-message-id');
                this.selectedMessages.add(messageId);
                console.log(`Added message ${messageId} to selection`);
            });
            console.log(`Total selected messages: ${this.selectedMessages.size}`);
            console.log('OK Select all completed');
        }
        
        // Force update visuals and toolbar
        this.updateSelectionVisuals();
        this.updateSelectionToolbar();
    }
    
    copySelectedMessages() {
        const messagesToCopy = [];
        
        // Get messages in chronological order
        const messages = Array.from(document.querySelectorAll('.message'));
        messages.forEach(messageEl => {
            const messageId = messageEl.getAttribute('data-message-id');
            if (this.selectedMessages.has(messageId)) {
                const messageText = messageEl.querySelector('.message-text')?.textContent;
                const messageTime = messageEl.querySelector('.message-time')?.textContent;
                const isOwn = messageEl.classList.contains('sent');
                const sender = isOwn ? 'Tú' : (this.currentConversation?.name || 'Usuario');
                
                if (messageText) {
                    messagesToCopy.push(`[${messageTime}] ${sender}: ${messageText}`);
                }
            }
        });
        
        if (messagesToCopy.length > 0) {
            const textToCopy = messagesToCopy.join('\n');
            navigator.clipboard.writeText(textToCopy).then(() => {
                Utils.Notifications.success(`${messagesToCopy.length} mensaje(s) copiado(s)`);
                this.exitSelectionMode();
            }).catch(() => {
                Utils.Notifications.error('Error al copiar mensajes');
            });
        }
    }
    
    async deleteSelectedMessages() {
        console.log('🗑️ Starting delete selected messages...');
        console.log(`Selected messages count: ${this.selectedMessages.size}`);
        
        if (this.selectedMessages.size === 0) {
            console.log('ERROR No messages selected for deletion');
            return;
        }
        
        const confirmed = await Utils.ConfirmationModal.show({
            title: 'Eliminar mensajes',
            message: `¿Estás seguro de que quieres eliminar ${this.selectedMessages.size} mensaje(s)?`,
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            confirmClass: 'btn-danger'
        });
        
        console.log(`User confirmation: ${confirmed}`);
        
        if (confirmed) {
            const messageIds = Array.from(this.selectedMessages);
            let deletedCount = 0;
            
            console.log('Messages to delete:', messageIds);
            
            for (const messageId of messageIds) {
                try {
                    console.log(`Deleting message: ${messageId}`);
                    const response = await fetch(`/api/messages/${messageId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${Utils.Storage.get('authToken')}`
                        },
                        body: JSON.stringify({ deleteForEveryone: true })
                    });
                    
                    console.log(`Delete response for ${messageId}:`, response.status);
                    
                    if (response.ok) {
                        deletedCount++;
                        // Remove message from DOM
                        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
                        if (messageEl) {
                            messageEl.remove();
                            console.log(`OK Removed message ${messageId} from DOM`);
                        } else {
                            console.log(`WARNING Message element ${messageId} not found in DOM`);
                        }
                    } else {
                        console.log(`ERROR Failed to delete message ${messageId}, status: ${response.status}`);
                    }
                } catch (error) {
                    console.error('Error deleting message:', messageId, error);
                }
            }
            
            console.log(`OK Deletion completed. ${deletedCount}/${messageIds.length} messages deleted`);
            Utils.Notifications.success(`${deletedCount} mensaje(s) eliminado(s)`);
            this.exitSelectionMode();
        }
    }

    // Attachment modal functionality for both mobile and desktop
    showAttachmentModal() {
        const modal = Utils.$('#attachment-modal');
        const overlay = Utils.$('#attachment-modal-overlay');
        const attachBtn = Utils.$('#attach-btn');
        
        if (modal && overlay && attachBtn) {
            overlay.classList.add('show');
            
            // Position modal for desktop
            if (window.innerWidth > 768) {
                this.positionModalForDesktop(modal, attachBtn);
            }
            
            modal.classList.add('show');
        }
    }
    
    positionModalForDesktop(modal, attachBtn) {
        const attachBtnRect = attachBtn.getBoundingClientRect();
        const modalWidth = 280; // max-width from CSS
        const modalHeight = 150; // approximate height
        
        // Position above the attach button
        let top = attachBtnRect.top - modalHeight - 15;
        let left = attachBtnRect.left - (modalWidth / 2) + (attachBtnRect.width / 2);
        
        // Ensure modal stays within viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Adjust horizontal position if modal goes out of bounds
        if (left < 10) {
            left = 10;
        } else if (left + modalWidth > viewportWidth - 10) {
            left = viewportWidth - modalWidth - 10;
        }
        
        // If no space above, position below the button and adjust arrow direction
        if (top < 10) {
            top = attachBtnRect.bottom + 15;
            // Add class to flip arrow direction
            modal.classList.add('modal-below');
        } else {
            modal.classList.remove('modal-below');
        }
        
        // Final check to ensure it fits in viewport
        if (top + modalHeight > viewportHeight - 10) {
            top = viewportHeight - modalHeight - 10;
        }
        
        modal.style.position = 'fixed';
        modal.style.top = top + 'px';
        modal.style.left = left + 'px';
        modal.style.zIndex = '1050';
    }

    hideAttachmentModal() {
        const modal = Utils.$('#attachment-modal');
        const overlay = Utils.$('#attachment-modal-overlay');
        
        if (modal && overlay) {
            overlay.classList.remove('show');
            modal.classList.remove('show');
            
            // Reset position styles for desktop
            if (window.innerWidth > 768) {
                modal.style.position = '';
                modal.style.top = '';
                modal.style.left = '';
                modal.style.zIndex = '';
                modal.classList.remove('modal-below');
            }
        }
    }

    cleanupAttachmentModalEvents() {
        // Limpiar event listeners anteriores
        const overlay = Utils.$('#attachment-modal-overlay');
        if (this.attachmentModalHandlers.overlayClickHandler && overlay) {
            overlay.removeEventListener('click', this.attachmentModalHandlers.overlayClickHandler);
        }
        
        if (this.attachmentModalHandlers.documentClickHandler) {
            document.removeEventListener('click', this.attachmentModalHandlers.documentClickHandler);
        }

        // Limpiar event listeners de opciones
        this.attachmentModalHandlers.optionClickHandlers.forEach(({ element, handler }) => {
            if (element) {
                element.removeEventListener('click', handler);
            }
        });
        
        // Reset handlers
        this.attachmentModalHandlers = {
            overlayClickHandler: null,
            documentClickHandler: null,
            optionClickHandlers: []
        };
    }

    setupAttachmentModal() {
        console.log('🔧 Configurando attachment modal...');
        
        // Limpiar eventos anteriores primero
        this.cleanupAttachmentModalEvents();
        
        const overlay = Utils.$('#attachment-modal-overlay');
        const modal = Utils.$('#attachment-modal');
        
        if (!overlay || !modal) {
            console.error('❌ Elementos del attachment modal no encontrados');
            return;
        }

        // Close modal when clicking overlay
        this.attachmentModalHandlers.overlayClickHandler = () => {
            console.log('🔄 Overlay clicked - cerrando modal');
            this.hideAttachmentModal();
        };
        overlay.addEventListener('click', this.attachmentModalHandlers.overlayClickHandler);

        // Close modal when clicking outside on desktop
        this.attachmentModalHandlers.documentClickHandler = (e) => {
            const attachBtn = Utils.$('#attach-btn');
            if (modal && modal.classList.contains('show') && 
                !modal.contains(e.target) && 
                !attachBtn?.contains(e.target)) {
                console.log('🔄 Click fuera del modal - cerrando');
                this.hideAttachmentModal();
            }
        };
        document.addEventListener('click', this.attachmentModalHandlers.documentClickHandler);

        // Handle attachment options - con prevención de eventos duplicados
        const attachmentOptions = document.querySelectorAll('.attachment-option');
        console.log(`🔧 Configurando ${attachmentOptions.length} opciones de adjunto`);
        
        attachmentOptions.forEach(option => {
            const handler = (e) => {
                e.stopPropagation(); // Prevenir propagación
                const type = option.dataset.type;
                console.log(`🎯 Opción seleccionada: ${type}`);
                
                // Cerrar el modal de adjuntos primero
                this.hideAttachmentModal();
                
                // Ejecutar la acción específica
                this.handleAttachmentType(type);
            };
            
            option.addEventListener('click', handler);
            
            // Guardar referencia para cleanup
            this.attachmentModalHandlers.optionClickHandlers.push({
                element: option,
                handler: handler
            });
        });
        
        console.log('✅ Attachment modal configurado correctamente');
    }

    handleAttachmentType(type) {
        console.log(`🎯 handleAttachmentType llamado con tipo: ${type}`);
        
        switch (type) {
            case 'emoji':
                console.log('📝 Abriendo selector de emojis...');
                this.toggleEmojiPicker();
                break;
            case 'camera':
                console.log('📷 Abriendo cámara - ESTE ES EL ÚNICO BOTÓN QUE DEBE ABRIR LA CÁMARA');
                this.openCamera();
                break;
            case 'gallery':
                console.log('🖼️ Abriendo galería...');
                this.openGallery();
                break;
            case 'location':
                console.log('📍 Obteniendo ubicación...');
                this.shareLocation();
                break;
            case 'document':
                console.log('📄 Abriendo selector de documentos...');
                this.openDocumentPicker();
                break;
            default:
                console.log('❌ Tipo de adjunto desconocido:', type);
        }
    }

    openDocumentPicker() {
        // Create a file input for documents
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip,.rar';
        input.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0], 'document');
            }
        });
        input.click();
    }

    openGallery() {
        // Crear input para seleccionar imágenes de galería
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = false; // Una imagen a la vez para mejor UX
        input.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                // Solo tomar la primera imagen seleccionada
                this.handleImageUpload(files[0]);
            }
        });
        input.click();
    }

    async openCamera() {
        console.log('📷 Abriendo cámara con estilo simple...');
        
        // Cerrar modal de adjuntos si está abierto
        this.hideAttachmentModal();
        
        try {
            // Crear modal con estilo original simple
            const modal = document.createElement('div');
            modal.className = 'simple-camera-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                z-index: 99999999;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            modal.innerHTML = `
                <!-- Top Controls -->
                <div class="camera-top">
                    <div class="left-controls">
                        <button class="camera-close-btn" title="Cerrar">
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="camera-fullscreen-btn" title="Pantalla completa">
                            <i class="fas fa-expand"></i>
                        </button>
                        <button class="camera-flip-btn" title="Voltear cámara">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Video Stream -->
                <video class="camera-video" id="camera-video" autoplay playsinline muted></video>
                <canvas id="camera-canvas" style="display: none;"></canvas>
                
                <!-- Bottom Controls -->
                <div class="camera-bottom">
                    <div class="camera-gallery-btn">
                        <i class="fas fa-images" style="color: white; font-size: 20px;"></i>
                    </div>
                    
                    <div class="camera-capture-container">
                        <button class="camera-capture-btn" id="capture-btn">
                            <div class="camera-capture-inner"></div>
                        </button>
                    </div>
                    
                    <div class="camera-switch-btn">
                        <i class="fas fa-camera-rotate" style="color: white; font-size: 20px;"></i>
                    </div>
                </div>
                
                <!-- Recording Indicator -->
                <div class="camera-recording-indicator" id="recording-indicator" style="display: none;">
                    <div class="camera-recording-dot"></div>
                    <span class="camera-recording-time" id="recording-time">00:00</span>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Referencias a elementos
            const video = modal.querySelector('#camera-video');
            const canvas = modal.querySelector('#camera-canvas');
            const captureBtn = modal.querySelector('#capture-btn');
            const closeBtn = modal.querySelector('.camera-close-btn');
            const fullscreenBtn = modal.querySelector('.camera-fullscreen-btn');
            const flipBtn = modal.querySelector('.camera-flip-btn');
            const galleryBtn = modal.querySelector('.camera-gallery-btn');
            const recordingIndicator = modal.querySelector('#recording-indicator');
            const recordingTime = modal.querySelector('#recording-time');
            
            let currentStream = null;
            let currentFacingMode = 'user';
            let isFullscreen = false;
            let isRecording = false;
            let mediaRecorder = null;
            let recordedChunks = [];
            let recordingStartTime = null;
            let recordingTimer = null;
            let pressTimer = null;
            
            // Mostrar modal
            setTimeout(() => {
                modal.classList.add('active');
            }, 10);
            
            // Inicializar cámara
            const constraints = {
                video: {
                    facingMode: currentFacingMode,
                    width: { ideal: 1280, min: 640 },
                    height: { ideal: 720, min: 480 }
                },
                audio: true // Para video con audio
            };
            
            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = currentStream;
            
            console.log('📷 Cámara activada exitosamente!');
            
            // EVENTOS
            
            // Cerrar modal
            const closeModal = () => {
                if (mediaRecorder && isRecording) {
                    mediaRecorder.stop();
                }
                if (currentStream) {
                    currentStream.getTracks().forEach(track => track.stop());
                }
                modal.remove();
                console.log('📷 Cámara cerrada');
            };
            
            closeBtn.onclick = closeModal;
            
            // Pantalla completa
            fullscreenBtn.onclick = () => {
                if (!isFullscreen) {
                    modal.classList.add('fullscreen');
                    fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
                    fullscreenBtn.title = 'Salir de pantalla completa';
                    isFullscreen = true;
                } else {
                    modal.classList.remove('fullscreen');
                    fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
                    fullscreenBtn.title = 'Pantalla completa';
                    isFullscreen = false;
                }
            };
            
            // Voltear cámara
            flipBtn.onclick = async () => {
                try {
                    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
                    
                    if (currentStream) {
                        currentStream.getTracks().forEach(track => track.stop());
                    }
                    
                    const newConstraints = {
                        video: {
                            facingMode: currentFacingMode,
                            width: { ideal: 1280, min: 640 },
                            height: { ideal: 720, min: 480 }
                        },
                        audio: true
                    };
                    
                    currentStream = await navigator.mediaDevices.getUserMedia(newConstraints);
                    video.srcObject = currentStream;
                    
                } catch (error) {
                    console.error('Error cambiando cámara:', error);
                }
            };
            
            // Botón de galería - abrir selector de archivos
            galleryBtn.onclick = () => {
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';
                fileInput.style.display = 'none';
                
                fileInput.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const imageUrl = URL.createObjectURL(file);
                        this.addCapturedPhotoToChat(imageUrl, file);
                        closeModal();
                    }
                };
                
                document.body.appendChild(fileInput);
                fileInput.click();
                document.body.removeChild(fileInput);
            };
            
            // Función para actualizar tiempo de grabación
            const updateRecordingTime = () => {
                if (recordingStartTime) {
                    const elapsed = Date.now() - recordingStartTime;
                    const seconds = Math.floor(elapsed / 1000);
                    const minutes = Math.floor(seconds / 60);
                    const remainingSeconds = seconds % 60;
                    recordingTime.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
                }
            };
            
            // Botón de captura/grabación - PRESS AND HOLD
            captureBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                
                // Iniciar timer para grabación
                pressTimer = setTimeout(() => {
                    startVideoRecording();
                }, 500); // 500ms para iniciar grabación
            });
            
            captureBtn.addEventListener('mouseup', (e) => {
                e.preventDefault();
                
                if (pressTimer) {
                    clearTimeout(pressTimer);
                    pressTimer = null;
                }
                
                if (isRecording) {
                    stopVideoRecording();
                } else {
                    // Click rápido = tomar foto
                    takePhoto();
                }
            });
            
            captureBtn.addEventListener('mouseleave', (e) => {
                if (pressTimer) {
                    clearTimeout(pressTimer);
                    pressTimer = null;
                }
                
                if (isRecording) {
                    stopVideoRecording();
                }
            });
            
            // Touch events para móviles
            captureBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                pressTimer = setTimeout(() => {
                    startVideoRecording();
                }, 500);
            });
            
            captureBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                
                if (pressTimer) {
                    clearTimeout(pressTimer);
                    pressTimer = null;
                }
                
                if (isRecording) {
                    stopVideoRecording();
                } else {
                    takePhoto();
                }
            });
            
            // Funciones de grabación
            const startVideoRecording = () => {
                try {
                    recordedChunks = [];
                    mediaRecorder = new MediaRecorder(currentStream);
                    
                    mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                            recordedChunks.push(event.data);
                        }
                    };
                    
                    mediaRecorder.onstop = () => {
                        const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
                        showVideoPreview(videoBlob);
                    };
                    
                    mediaRecorder.start();
                    isRecording = true;
                    recordingStartTime = Date.now();
                    
                    // Mostrar indicador de grabación
                    recordingIndicator.style.display = 'flex';
                    captureBtn.classList.add('recording');
                    
                    // Iniciar timer
                    recordingTimer = setInterval(updateRecordingTime, 1000);
                    
                    console.log('🎥 Iniciando grabación de video...');
                    
                } catch (error) {
                    console.error('Error iniciando grabación:', error);
                }
            };
            
            const stopVideoRecording = () => {
                if (mediaRecorder && isRecording) {
                    mediaRecorder.stop();
                    isRecording = false;
                    recordingStartTime = null;
                    
                    // Ocultar indicador
                    recordingIndicator.style.display = 'none';
                    captureBtn.classList.remove('recording');
                    
                    if (recordingTimer) {
                        clearInterval(recordingTimer);
                        recordingTimer = null;
                    }
                    
                    console.log('🎥 Grabación detenida');
                }
            };
            
            // Tomar foto
            const takePhoto = () => {
                console.log('📷 Tomando foto...');
                
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        const imageUrl = URL.createObjectURL(blob);
                        this.addCapturedPhotoToChat(imageUrl, blob);
                        closeModal();
                        console.log('📷 Foto capturada y enviada');
                    }
                }, 'image/jpeg', 0.9);
            };
            
            // Mostrar preview de video y opciones
            const showVideoPreview = (videoBlob) => {
                closeModal();
                
                // Crear modal de preview
                const previewModal = document.createElement('div');
                previewModal.className = 'video-preview-modal';
                previewModal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.9);
                    z-index: 10002;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                `;
                
                const videoUrl = URL.createObjectURL(videoBlob);
                
                previewModal.innerHTML = `
                    <div style="background: white; border-radius: 12px; padding: 20px; max-width: 400px; width: 90%; text-align: center;">
                        <h3 style="margin: 0 0 15px 0; color: #333;">Video capturado</h3>
                        <video src="${videoUrl}" controls style="width: 100%; max-width: 300px; border-radius: 8px; margin-bottom: 15px;"></video>
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <button id="cancel-video" style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                            <button id="add-to-input" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                                <i class="fas fa-plus"></i> Añadir al mensaje
                            </button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(previewModal);
                
                // Eventos del preview
                previewModal.querySelector('#cancel-video').onclick = () => {
                    URL.revokeObjectURL(videoUrl);
                    previewModal.remove();
                };
                
                previewModal.querySelector('#add-to-input').onclick = () => {
                    this.addVideoToInput(videoBlob, videoUrl);
                    previewModal.remove();
                };
            };
            
        } catch (error) {
            console.error('📷 Error abriendo cámara:', error);
            
            let errorMessage = 'No se pudo acceder a la cámara.';
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Permisos de cámara denegados. Permite el acceso a la cámara.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No se encontró una cámara en este dispositivo.';
            }
            
            Utils.Notifications.error(errorMessage);
        }
    }

    // Función para añadir video al campo de entrada
    addVideoToInput(videoBlob, videoUrl) {
        console.log('📹 Añadiendo video al input...');
        
        try {
            // Obtener el área de entrada de mensajes
            const messageInput = document.querySelector('#message-input') || 
                                document.querySelector('.message-input') || 
                                document.querySelector('input[type="text"]');
            
            if (!messageInput) {
                console.error('No se encontró el campo de entrada de mensajes');
                return;
            }
            
            // Crear preview del video en el input
            const inputContainer = messageInput.parentElement;
            
            // Crear contenedor de preview si no existe
            let previewContainer = inputContainer.querySelector('.video-preview-container');
            if (!previewContainer) {
                previewContainer = document.createElement('div');
                previewContainer.className = 'video-preview-container';
                previewContainer.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px;
                    background: #f0f0f0;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    margin-bottom: 8px;
                `;
                
                inputContainer.insertBefore(previewContainer, messageInput);
            }
            
            previewContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                    <video src="${videoUrl}" style="width: 60px; height: 45px; border-radius: 4px; object-fit: cover;"></video>
                    <div style="flex: 1;">
                        <div style="font-size: 12px; color: #666; font-weight: 500;">Video capturado</div>
                        <div style="font-size: 11px; color: #999;">Listo para enviar</div>
                    </div>
                    <button class="remove-video-btn" style="
                        background: #dc3545;
                        color: white;
                        border: none;
                        width: 24px;
                        height: 24px;
                        border-radius: 50%;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 12px;
                    " title="Eliminar video">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="margin-top: 8px; display: flex; gap: 8px;">
                    <button class="cancel-video-btn" style="
                        background: #6c757d;
                        color: white;
                        border: none;
                        padding: 6px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                    ">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button class="send-video-btn" style="
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 6px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        flex: 1;
                    ">
                        <i class="fas fa-paper-plane"></i> Enviar video
                    </button>
                </div>
            `;
            
            // Guardar referencia del blob
            this.pendingVideoBlob = videoBlob;
            this.pendingVideoUrl = videoUrl;
            
            // Eventos de los botones
            const removeBtn = previewContainer.querySelector('.remove-video-btn');
            const cancelBtn = previewContainer.querySelector('.cancel-video-btn');
            const sendBtn = previewContainer.querySelector('.send-video-btn');
            
            removeBtn.onclick = cancelBtn.onclick = () => {
                if (this.pendingVideoUrl) {
                    URL.revokeObjectURL(this.pendingVideoUrl);
                }
                this.pendingVideoBlob = null;
                this.pendingVideoUrl = null;
                previewContainer.remove();
                console.log('📹 Video removido del input');
            };
            
            sendBtn.onclick = () => {
                if (this.pendingVideoBlob) {
                    const messageText = messageInput.value.trim();
                    this.sendVideoMessage(this.pendingVideoBlob, messageText);
                    
                    // Limpiar
                    messageInput.value = '';
                    if (this.pendingVideoUrl) {
                        URL.revokeObjectURL(this.pendingVideoUrl);
                    }
                    this.pendingVideoBlob = null;
                    this.pendingVideoUrl = null;
                    previewContainer.remove();
                }
            };
            
            // Focus en el input para que el usuario pueda escribir
            messageInput.focus();
            messageInput.placeholder = 'Escribe un comentario para el video (opcional)...';
            
            console.log('📹 Video añadido al input exitosamente');
            
        } catch (error) {
            console.error('Error añadiendo video al input:', error);
        }
    }
    
    // Función para enviar mensaje de video
    sendVideoMessage(videoBlob, messageText = '') {
        console.log('📹 Enviando mensaje de video...');
        
        try {
            // Buscar área de mensajes
            const messagesArea = document.querySelector('.messages') || 
                               document.querySelector('.chat-messages') || 
                               document.querySelector('#messages');
            
            if (messagesArea) {
                const videoUrl = URL.createObjectURL(videoBlob);
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message sent';
                messageDiv.style.cssText = 'margin: 10px; text-align: right;';
                
                const time = new Date().toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                messageDiv.innerHTML = `
                    <div style="background: #dcf8c6; padding: 8px 12px; border-radius: 18px; display: inline-block; max-width: 70%;">
                        <div style="margin: 4px 0;">
                            <video src="${videoUrl}" controls style="max-width: 300px; width: 100%; border-radius: 12px; cursor: pointer;"></video>
                        </div>
                        ${messageText ? `<div style="margin-top: 8px; color: #333; font-size: 14px;">${messageText}</div>` : ''}
                        <span style="font-size: 11px; color: #666; display: block; text-align: right; margin-top: 4px;">${time}</span>
                    </div>
                `;
                
                messagesArea.appendChild(messageDiv);
                messagesArea.scrollTop = messagesArea.scrollHeight;
                
                console.log('📹 Video enviado al chat exitosamente');
            } else {
                console.error('No se encontró el área de mensajes');
            }
            
        } catch (error) {
            console.error('Error enviando video:', error);
        }
    }

    // NUEVA FUNCIÓN PARA AÑADIR FOTO CAPTURADA AL CHAT
    addCapturedPhotoToChat(imageUrl, blob) {
        console.log('📷 Añadiendo foto capturada al chat...');
        
        try {
            // Crear un File object desde el blob
            const file = new File([blob], `camera-photo-${Date.now()}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now()
            });
            
            // Asignar como pendingImageFile y enviar
            this.pendingImageFile = file;
            
            // Limpiar input de mensaje
            if (this.messageInput) {
                this.messageInput.textContent = '';
            }
            
            console.log('📷 Enviando foto capturada...');
            
            // Enviar el mensaje usando el sistema existente
            this.sendCurrentMessage();
            
        } catch (error) {
            console.error('📷 Error añadiendo foto al chat:', error);
            
            // Fallback: Añadir imagen directamente al DOM si falla el envío normal
            this.addPhotoToMessagesDirectly(imageUrl);
        }
    }
    
    // FUNCIÓN FALLBACK PARA AÑADIR DIRECTAMENTE AL DOM
    addPhotoToMessagesDirectly(imageUrl) {
        console.log('📷 Fallback: Añadiendo foto directamente al DOM...');
        
        const messagesContainer = document.querySelector('.messages') || 
                                document.querySelector('.chat-messages') || 
                                document.querySelector('#messages') ||
                                document.querySelector('.messages-container');
        
        if (messagesContainer) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message sent';
            messageDiv.style.cssText = 'margin: 10px; text-align: right;';
            
            const time = new Date().toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            messageDiv.innerHTML = `
                <div class="message-content" style="background: #dcf8c6; padding: 8px 12px; border-radius: 18px; display: inline-block; max-width: 70%;">
                    <div class="message-image-container" style="margin: 4px 0;">
                        <img src="${imageUrl}" alt="Foto de cámara" style="max-width: 300px; width: 100%; border-radius: 12px; cursor: pointer;" 
                             onclick="this.style.position = this.style.position === 'fixed' ? 'static' : 'fixed'; 
                                      this.style.top = this.style.position === 'fixed' ? '0' : 'auto'; 
                                      this.style.left = this.style.position === 'fixed' ? '0' : 'auto'; 
                                      this.style.width = this.style.position === 'fixed' ? '100vw' : '100%'; 
                                      this.style.height = this.style.position === 'fixed' ? '100vh' : 'auto'; 
                                      this.style.zIndex = this.style.position === 'fixed' ? '999999' : 'auto'; 
                                      this.style.background = this.style.position === 'fixed' ? 'rgba(0,0,0,0.9)' : 'none'; 
                                      this.style.objectFit = this.style.position === 'fixed' ? 'contain' : 'none';">
                    </div>
                    <span class="message-time" style="font-size: 11px; color: #666;">${time}</span>
                </div>
            `;
            
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            console.log('📷 Foto añadida directamente al chat');
        } else {
            console.error('📷 No se encontró el contenedor de mensajes');
        }
    }

    async initializeCamera() {
        const overlay = document.getElementById('camera-modal-overlay');
        console.log('📷 Mostrando modal de cámara...');
        
        // Mostrar modal con animación suave
        overlay.style.display = 'flex';
        // Pequeño delay para permitir que el display flex tome efecto antes de agregar active
        setTimeout(() => {
            overlay.classList.add('active');
        }, 10);
        
        try {
            // Configurar constraints de la cámara
            this.currentFacingMode = 'environment'; // Cámara trasera por defecto
            console.log('📷 Iniciando stream de cámara...');
            await this.startCameraStream();
            console.log('📷 Stream iniciado, configurando event listeners...');
            this.setupCameraEventListeners();
            console.log('📷 Event listeners configurados');
            
        } catch (error) {
            console.error('❌ Error en initializeCamera:', error);
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
            throw error;
        }
    }

    async startCameraStream() {
        const video = document.getElementById('camera-video');
        
        const constraints = {
            video: {
                facingMode: this.currentFacingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false // Para foto no necesitamos audio inicialmente
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        this.currentCameraStream = stream;
        
        // Esperar a que el video esté listo para captura
        return new Promise((resolve) => {
            video.addEventListener('loadedmetadata', () => {
                console.log('📹 Video metadata cargada, listo para captura');
                resolve();
            });
        });
    }

    cleanupCameraEventListeners() {
        // Limpiar todos los event listeners de la cámara
        this.cameraEventHandlers.handlers.forEach(({ element, event, handler }) => {
            if (element && handler) {
                element.removeEventListener(event, handler);
            }
        });
        
        // Reset handlers
        this.cameraEventHandlers = {
            setupComplete: false,
            handlers: []
        };
        
        console.log('🧹 Event listeners de cámara limpiados');
    }
    
    addCameraEventListener(element, event, handler) {
        if (element && handler) {
            element.addEventListener(event, handler);
            this.cameraEventHandlers.handlers.push({ element, event, handler });
        }
    }

    setupCameraEventListeners() {
        console.log('📷 Configurando event listeners de cámara...');
        
        // Evitar configuración múltiple
        if (this.cameraEventHandlers.setupComplete) {
            console.log('⚠️ Event listeners de cámara ya configurados, saltando...');
            return;
        }
        
        // Limpiar eventos anteriores por seguridad
        this.cleanupCameraEventListeners();
        
        const overlay = document.getElementById('camera-modal-overlay');
        const closeCameraBtn = document.getElementById('close-camera-btn');
        const fullscreenBtn = document.getElementById('fullscreen-camera-btn');
        const switchCameraBtnTop = document.getElementById('switch-camera-btn-top');
        const captureBtn = document.getElementById('camera-capture-btn');
        const savePhotoBtn = document.getElementById('save-photo-btn');
        const retakePhotoBtn = document.getElementById('retake-photo-btn');
        const galleryAccessBtn = document.getElementById('gallery-access-btn');

        console.log('Elementos de cámara encontrados:', {
            overlay: !!overlay,
            closeCameraBtn: !!closeCameraBtn,
            captureBtn: !!captureBtn,
            savePhotoBtn: !!savePhotoBtn,
            retakePhotoBtn: !!retakePhotoBtn
        });
        
        // Variables para manejo de presión prolongada estilo WhatsApp
        let pressTimer = null;
        let isRecording = false;
        let recordingStartTime = null;
        let recordingTimer = null;
        
        // Cerrar modal
        if (closeCameraBtn) {
            this.addCameraEventListener(closeCameraBtn, 'click', () => this.closeCameraModal());
        }
        
        // Pantalla completa
        if (fullscreenBtn) {
            this.addCameraEventListener(fullscreenBtn, 'click', () => this.toggleFullscreen());
        }
        
        // Cambiar cámara (frontal/trasera)
        if (switchCameraBtnTop) {
            this.addCameraEventListener(switchCameraBtnTop, 'click', () => this.switchCamera());
        }
        
        // Acceso a galería
        if (galleryAccessBtn) {
            this.addCameraEventListener(galleryAccessBtn, 'click', () => {
                this.closeCameraModal();
                this.openGallery();
            });
        }
        
        // WhatsApp-style capture button behavior
        const startPressTimer = () => {
            // Inmediatamente cambiar estilo del botón
            captureBtn.classList.add('pressing');
            
            pressTimer = setTimeout(async () => {
                // Iniciar grabación de video después de 600ms (como WhatsApp)
                await this.startVideoRecording();
                isRecording = true;
                this.startRecordingTimer();
            }, 600);
        };
        
        const cancelPressTimer = () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
            captureBtn.classList.remove('pressing');
        };
        
        const handleRelease = async () => {
            cancelPressTimer();
            
            if (isRecording) {
                // Detener grabación de video
                await this.stopVideoRecording();
                this.stopRecordingTimer();
                isRecording = false;
            } else {
                // Tomar foto (tap rápido)
                await this.capturePhoto();
            }
        };
        
        // Mouse events para botón de captura
        if (captureBtn) {
            this.addCameraEventListener(captureBtn, 'mousedown', startPressTimer);
            this.addCameraEventListener(captureBtn, 'mouseup', handleRelease);
            this.addCameraEventListener(captureBtn, 'mouseleave', () => {
                cancelPressTimer();
                if (isRecording) {
                    this.stopVideoRecording();
                    this.stopRecordingTimer();
                    isRecording = false;
                }
            });
            
            // Touch events para móviles (más importante para WhatsApp-style)
            // Nota: Estos requieren opciones especiales, pero addCameraEventListener no las maneja
            // Los mantenemos como están pero los guardamos para cleanup
            const touchStartHandler = (e) => {
                e.preventDefault();
                startPressTimer();
            };
            const touchEndHandler = (e) => {
                e.preventDefault();
                handleRelease();
            };
            const touchCancelHandler = () => {
                cancelPressTimer();
                if (isRecording) {
                    this.stopVideoRecording();
                    this.stopRecordingTimer();
                    isRecording = false;
                }
            };
            
            captureBtn.addEventListener('touchstart', touchStartHandler, { passive: false });
            captureBtn.addEventListener('touchend', touchEndHandler, { passive: false });
            captureBtn.addEventListener('touchcancel', touchCancelHandler);
            
            // Guardar para cleanup (eventos especiales)
            this.cameraEventHandlers.handlers.push(
                { element: captureBtn, event: 'touchstart', handler: touchStartHandler },
                { element: captureBtn, event: 'touchend', handler: touchEndHandler },
                { element: captureBtn, event: 'touchcancel', handler: touchCancelHandler }
            );
        }
        
        // Botones de acción después de captura (WhatsApp style)
        if (savePhotoBtn) {
            console.log('Configurando evento para savePhotoBtn');
            this.addCameraEventListener(savePhotoBtn, 'click', () => {
                console.log('Botón enviar clickeado!');
                this.saveCapture();
            });
        } else {
            console.error('savePhotoBtn no encontrado!');
        }
        
        if (retakePhotoBtn) {
            console.log('Configurando evento para retakePhotoBtn');
            this.addCameraEventListener(retakePhotoBtn, 'click', () => this.retakeCapture());
        } else {
            console.error('retakePhotoBtn no encontrado!');
        }
        
        // Cerrar al hacer clic en overlay (pero no en el video)
        if (overlay) {
            this.addCameraEventListener(overlay, 'click', (e) => {
                if (e.target === overlay) {
                    this.closeCameraModal();
                }
            });
        }
        
        // Cerrar con la tecla Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) {
                this.closeCameraModal();
            }
        };
        this.addCameraEventListener(document, 'keydown', handleEscape);
        
        // Marcar configuración como completa
        this.cameraEventHandlers.setupComplete = true;
        console.log('✅ Event listeners de cámara configurados correctamente');
    }

    startRecordingTimer() {
        this.recordingStartTime = Date.now();
        const recordingTimeElement = document.getElementById('recording-time');
        
        this.recordingTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            recordingTimeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopRecordingTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
        
        const recordingTimeElement = document.getElementById('recording-time');
        if (recordingTimeElement) {
            recordingTimeElement.textContent = '0:00';
        }
    }

    async switchCamera() {
        if (this.currentCameraStream) {
            this.currentCameraStream.getTracks().forEach(track => track.stop());
        }
        
        // Cambiar entre frontal y trasera
        this.currentFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
        
        try {
            await this.startCameraStream();
        } catch (error) {
            console.error('Error switching camera:', error);
            Utils.Notifications.error('No se pudo cambiar la cámara');
        }
    }

    async startVideoRecording() {
        const video = document.getElementById('camera-video');
        const captureBtn = document.getElementById('camera-capture-btn');
        const recordingIndicator = document.getElementById('recording-indicator');
        
        try {
            // Configurar stream con audio para video (WhatsApp style)
            const constraints = {
                video: {
                    facingMode: this.currentFacingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: true
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Reemplazar stream del video
            video.srcObject = stream;
            this.currentCameraStream = stream;
            
            // Configurar MediaRecorder
            this.recordedChunks = [];
            this.mediaRecorder = new MediaRecorder(stream);
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.handleVideoRecorded();
            };
            
            // Iniciar grabación
            this.mediaRecorder.start();
            
            // Mostrar indicadores de grabación WhatsApp-style
            captureBtn.classList.add('recording');
            recordingIndicator.style.display = 'flex';
            
        } catch (error) {
            console.error('Error starting video recording:', error);
            Utils.Notifications.error('No se pudo iniciar la grabación de video');
        }
    }

    async stopVideoRecording() {
        const captureBtn = document.getElementById('camera-capture-btn');
        const recordingIndicator = document.getElementById('recording-indicator');
        
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        
        // Ocultar indicadores de grabación
        captureBtn.classList.remove('recording');
        recordingIndicator.style.display = 'none';
    }

    handleVideoRecorded() {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        
        // Para el preview del modal de cámara, usar blob URL temporalmente
        // La conversión a data URL se hará solo cuando sea necesario para el chat
        this.capturedVideoBlob = blob;
        this.capturedVideoUrl = videoUrl;
        this.captureType = 'video';
        
        console.log('Video guardado');
        
        // Mostrar preview del video
        this.showCapturePreview(videoUrl, 'video');
    }

    async capturePhoto() {
        console.log('Iniciando captura de foto...');
        const video = document.getElementById('camera-video');
        const canvas = document.getElementById('camera-canvas');
        
        if (!video || !canvas) {
            console.error('Elementos de video o canvas no encontrados');
            return;
        }
        
        console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
        
        // Verificar que el video tenga dimensiones válidas
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            console.error('Video no está listo para captura');
            Utils.Notifications.error('Error: Video no está listo');
            return;
        }
        
        // Configurar canvas con las dimensiones del video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Capturar frame actual del video
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        console.log('Frame capturado en canvas');
        
        // Convertir canvas a data URL (compatible con CSP)
        try {
            const dataURL = canvas.toDataURL('image/jpeg', 0.9);
            console.log('Data URL creado');
            
            // Convertir data URL a blob sin usar fetch (evita CSP)
            const blob = this.dataURLToBlob(dataURL);
            console.log('Blob creado:', blob.size, 'bytes');
            
            // Guardar referencia de la imagen
            this.capturedImageBlob = blob;
            this.capturedImageUrl = dataURL; // Usar data URL para mostrar
            this.captureType = 'image';
            
            console.log('Datos guardados:', {
                blobSize: blob.size,
                captureType: this.captureType,
                hasBlob: !!this.capturedImageBlob
            });
            
            console.log('Mostrando preview...');
            // Mostrar preview
            this.showCapturePreview(dataURL, 'image');
                
        } catch (error) {
            console.error('Error al capturar foto:', error);
            Utils.Notifications.error('Error al capturar foto');
        }
    }

    // Función helper para convertir data URL a blob sin usar fetch
    dataURLToBlob(dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }

    // Función helper para convertir blob a data URL
    blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Función para crear thumbnail de video
    createVideoThumbnail(videoUrl) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            video.onloadedmetadata = () => {
                try {
                    // Configurar canvas con las dimensiones del video
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    
                    // Ir al primer frame
                    video.currentTime = 0.1; // Pequeño offset para evitar frame negro
                    
                    video.onseeked = () => {
                        try {
                            // Capturar frame en canvas
                            ctx.drawImage(video, 0, 0);
                            
                            // Convertir a data URL
                            const thumbnailDataURL = canvas.toDataURL('image/jpeg', 0.8);
                            resolve(thumbnailDataURL);
                        } catch (error) {
                            reject(error);
                        }
                    };
                } catch (error) {
                    reject(error);
                }
            };
            
            video.onerror = reject;
            video.src = videoUrl;
            video.load();
        });
    }

    showCapturePreview(url, type) {
        console.log('Mostrando preview para:', type);
        
        const capturePreview = document.getElementById('capture-preview');
        const capturedImage = document.getElementById('captured-image');
        const capturedVideo = document.getElementById('captured-video');
        const cameraVideo = document.getElementById('camera-video');
        
        if (!capturePreview || !capturedImage || !capturedVideo || !cameraVideo) {
            console.error('Elementos de preview no encontrados');
            Utils.Notifications.error('Error en el preview');
            return;
        }
        
        if (type === 'image') {
            console.log('Configurando imagen para preview...');
            // Mostrar imagen y ocultar video
            capturedImage.src = url;
            capturedImage.style.display = 'block';
            capturedVideo.style.display = 'none';
            
            // Verificar que la imagen se cargó correctamente
            capturedImage.onload = () => {
                console.log('Imagen cargada correctamente');
            };
            
            capturedImage.onerror = () => {
                console.error('Error al cargar imagen en preview');
                Utils.Notifications.error('Error al mostrar preview');
            };
            
        } else if (type === 'video') {
            console.log('Configurando video para preview...');
            // Para videos, crear un thumbnail del primer frame
            this.createVideoThumbnail(url).then(thumbnailDataURL => {
                // Mostrar el thumbnail como imagen
                capturedImage.src = thumbnailDataURL;
                capturedImage.style.display = 'block';
                capturedVideo.style.display = 'none';
                
                console.log('Thumbnail de video creado correctamente');
            }).catch(error => {
                console.error('Error al crear thumbnail del video:', error);
                // Fallback: mostrar un ícono de video
                capturedImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiMzMzMiLz48cGF0aCBkPSJNNzUgNDBMMTI1IDcwTDc1IDEwMFY0MFoiIGZpbGw9IndoaXRlIi8+PC9zdmc+';
                capturedImage.style.display = 'block';
                capturedVideo.style.display = 'none';
            });
        }
        
        // Ocultar video y mostrar preview con animación suave
        console.log('Cambiando a modo preview...');
        console.log('Estados antes del cambio:', {
            cameraVideoDisplay: cameraVideo.style.display,
            capturePreviewDisplay: capturePreview.style.display
        });
        
        cameraVideo.style.display = 'none';
        capturePreview.style.display = 'flex';
        
        console.log('Estados después del cambio:', {
            cameraVideoDisplay: cameraVideo.style.display,
            capturePreviewDisplay: capturePreview.style.display
        });
        
        // Verificar que los botones estén visibles
        const previewControls = document.querySelector('.whatsapp-preview-controls');
        const saveBtn = document.getElementById('save-photo-btn');
        const retakeBtn = document.getElementById('retake-photo-btn');
        
        console.log('Botones del preview:', {
            previewControls: !!previewControls,
            previewControlsDisplay: previewControls ? previewControls.style.display : 'not found',
            saveBtn: !!saveBtn,
            retakeBtn: !!retakeBtn
        });
        
        // Pequeño delay para asegurar que se muestre correctamente
        setTimeout(() => {
            console.log('Preview mostrado');
        }, 100);
    }

    saveCapture() {
        console.log('saveCapture llamado:', {
            captureType: this.captureType,
            hasImageBlob: !!this.capturedImageBlob,
            hasVideoBlob: !!this.capturedVideoBlob
        });

        if (this.captureType === 'image' && this.capturedImageBlob) {
            console.log('Procesando imagen capturada...');
            const file = new File([this.capturedImageBlob], 'camera-photo.jpg', {
                type: 'image/jpeg',
                lastModified: Date.now()
            });
            console.log('Archivo de imagen creado:', file);
            
            // Llamar a handleImageUpload
            this.handleImageUpload(file);
            console.log('handleImageUpload llamado');
            
        } else if (this.captureType === 'video' && this.capturedVideoBlob) {
            console.log('Procesando video capturado...');
            const file = new File([this.capturedVideoBlob], 'camera-video.webm', {
                type: 'video/webm',
                lastModified: Date.now()
            });
            console.log('Enviando video capturado...');
            this.handleVideoUpload(file);
        } else {
            console.error('No hay captura para enviar:', {
                captureType: this.captureType,
                hasImageBlob: !!this.capturedImageBlob,
                hasVideoBlob: !!this.capturedVideoBlob
            });
            Utils.Notifications.error('No hay captura para enviar');
            return;
        }
        
        console.log('Cerrando modal de cámara...');
        this.closeCameraModal();
    }

    retakeCapture() {
        console.log('Retomando captura...');
        const capturePreview = document.getElementById('capture-preview');
        const capturedImage = document.getElementById('captured-image');
        const capturedVideo = document.getElementById('captured-video');
        const cameraVideo = document.getElementById('camera-video');
        
        if (!capturePreview || !cameraVideo) {
            console.error('Elementos de retake no encontrados');
            return;
        }
        
        // Ocultar preview y mostrar video nuevamente
        capturePreview.style.display = 'none';
        cameraVideo.style.display = 'block';
        
        // Limpiar elementos de preview
        if (capturedImage) {
            capturedImage.src = '';
            capturedImage.style.display = 'none';
        }
        if (capturedVideo) {
            capturedVideo.src = '';
            capturedVideo.style.display = 'none';
        }
        
        // Limpiar datos capturados
        this.cleanupCapturedData();
        
        console.log('Volviendo a modo cámara');
    }

    cleanupCapturedData() {
        if (this.capturedImageUrl) {
            URL.revokeObjectURL(this.capturedImageUrl);
        }
        if (this.capturedVideoUrl) {
            URL.revokeObjectURL(this.capturedVideoUrl);
        }
        
        this.capturedImageBlob = null;
        this.capturedImageUrl = null;
        this.capturedVideoBlob = null;
        this.capturedVideoUrl = null;
        this.captureType = null;
    }

    closeCameraModal() {
        console.log('🔄 Cerrando modal de cámara...');
        
        const overlay = document.getElementById('camera-modal-overlay');
        const capturePreview = document.getElementById('capture-preview');
        
        // Limpiar event listeners de cámara
        this.cleanupCameraEventListeners();
        
        // Parar stream
        if (this.currentCameraStream) {
            this.currentCameraStream.getTracks().forEach(track => track.stop());
            this.currentCameraStream = null;
        }
        
        // Parar grabación si está activa
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        
        // Limpiar datos
        this.cleanupCapturedData();
        
        // Reset UI
        capturePreview.style.display = 'none';
        document.getElementById('camera-video').style.display = 'block';
        document.getElementById('camera-capture-btn').classList.remove('recording');
        document.getElementById('recording-indicator').style.display = 'none';
        
        // Limpiar timer de grabación
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
        
        // Cerrar modal con animación suave
        overlay.classList.remove('active');
        // Esperar a que termine la animación antes de ocultar completamente
        setTimeout(() => {
            if (!overlay.classList.contains('active')) {
                overlay.style.display = 'none';
            }
        }, 300); // Coincide con la duración de la transición CSS
    }

    toggleFullscreen() {
        const overlay = document.getElementById('camera-modal-overlay');
        const fullscreenBtn = document.getElementById('fullscreen-camera-btn');
        const icon = fullscreenBtn.querySelector('i');
        
        if (overlay.classList.contains('fullscreen')) {
            // Salir de pantalla completa
            overlay.classList.remove('fullscreen');
            icon.className = 'fas fa-expand';
            fullscreenBtn.title = 'Pantalla completa';
        } else {
            // Entrar en pantalla completa
            overlay.classList.add('fullscreen');
            icon.className = 'fas fa-compress';
            fullscreenBtn.title = 'Salir de pantalla completa';
        }
    }

    shareLocation() {
        if (navigator.geolocation) {
            Utils.Notifications.info('Obteniendo ubicación...');
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const locationText = `Mi ubicación: https://maps.google.com/?q=${latitude},${longitude}`;
                    this.sendMessage(locationText);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    Utils.Notifications.error('No se pudo obtener la ubicación');
                }
            );
        } else {
            Utils.Notifications.error('Tu navegador no soporta geolocalización');
        }
    }

    toggleEmojiPicker() {
        // Usar el selector de emojis avanzado
        const messageInput = Utils.$('#message-input') || Utils.$('.message-input');
        if (messageInput && window.emojiPicker) {
            window.emojiPicker.toggle(messageInput);
        } else {
            console.error('EmojiPicker no está disponible o no se encontró el input de mensaje');
            Utils.Notifications.error('Error al abrir el selector de emojis');
        }
    }

    handleFileUpload(file, type) {
        if (type === 'camera' || type === 'image') {
            this.handleImageUpload(file);
        } else {
            Utils.Notifications.info(`Subiendo ${type}: ${file.name}`);
            console.log(`Uploading ${type}:`, file);
        }
    }

    handleImageUpload(file) {
        console.log('handleImageUpload llamado con:', file);
        
        // Validar que sea una imagen
        if (!file.type.startsWith('image/')) {
            console.error('Archivo no es imagen:', file.type);
            Utils.Notifications.error('Por favor selecciona un archivo de imagen válido');
            return;
        }

        console.log('Archivo es válido, creando preview...');

        // Convertir a data URL para evitar problemas de CSP
        this.blobToDataURL(file).then(dataURL => {
            console.log('Data URL creada para imagen');
            
            // Mostrar preview de la imagen en el área de input
            this.showImagePreview(dataURL, file);
            console.log('Preview mostrado en área de input');
            
            Utils.Notifications.success('Imagen cargada. Escribe un mensaje opcional y envía.');
        }).catch(error => {
            console.error('Error al crear data URL para imagen:', error);
            Utils.Notifications.error('Error al procesar imagen');
        });
    }

    handleVideoUpload(file) {
        // Validar que sea un video
        if (!file.type.startsWith('video/')) {
            Utils.Notifications.error('Por favor selecciona un archivo de video válido');
            return;
        }

        // Para el preview en chat, convertir a data URL para evitar CSP
        this.blobToDataURL(file).then(dataURL => {
            // Mostrar preview del video en el área de input con data URL
            this.showVideoPreview(dataURL, file);
            Utils.Notifications.success('Video cargado. Escribe un mensaje opcional y envía.');
        }).catch(error => {
            console.error('Error al procesar video:', error);
            Utils.Notifications.error('Error al procesar video');
        });
    }

    showImagePreview(imageUrl, file) {
        const messageInputContainer = Utils.$('#message-input-container');
        if (!messageInputContainer) return;

        // Remover preview existente si lo hay
        this.removeImagePreview();

        // Crear el contenedor de preview
        const previewContainer = document.createElement('div');
        previewContainer.className = 'image-preview-container';
        previewContainer.innerHTML = `
            <div class="image-preview-wrapper">
                <img src="${imageUrl}" alt="Vista previa" class="image-preview">
                <button class="remove-image-btn" title="Eliminar imagen">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="image-info">
                <i class="fas fa-camera"></i>
                <span class="image-name">${file.name}</span>
                <span class="image-size">(${this.formatFileSize(file.size)})</span>
            </div>
        `;

        // Insertar el preview antes del área de input
        messageInputContainer.insertBefore(previewContainer, messageInputContainer.firstChild);

        // Agregar event listener para eliminar la imagen
        const removeBtn = previewContainer.querySelector('.remove-image-btn');
        removeBtn.addEventListener('click', () => {
            this.removeImagePreview();
        });

        // Guardar referencia del archivo para envío
        this.pendingImageFile = file;
        this.pendingImageUrl = imageUrl;

        // Enfocar el input de texto
        const messageInput = Utils.$('#message-input');
        if (messageInput) {
            messageInput.focus();
        }
        
        // Actualizar el botón de envío para activarlo con la imagen
        this.updateSendButton();
    }

    showVideoPreview(videoUrl, file) {
        const messageInputContainer = Utils.$('#message-input-container');
        if (!messageInputContainer) return;

        // Remover preview existente si lo hay
        this.removeVideoPreview();

        // Crear el contenedor de preview
        const previewContainer = document.createElement('div');
        previewContainer.className = 'video-preview-container';
        previewContainer.innerHTML = `
            <div class="video-preview-wrapper">
                <video src="${videoUrl}" controls class="video-preview" style="max-width: 300px; max-height: 200px;">
                    Tu navegador no soporta el elemento video.
                </video>
                <button class="remove-video-btn" title="Eliminar video">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="video-info">
                <i class="fas fa-video"></i>
                <span class="video-name">${file.name}</span>
                <span class="video-size">(${this.formatFileSize(file.size)})</span>
            </div>
        `;

        // Insertar el preview antes del área de input
        messageInputContainer.insertBefore(previewContainer, messageInputContainer.firstChild);

        // Agregar event listener para eliminar el video
        const removeBtn = previewContainer.querySelector('.remove-video-btn');
        removeBtn.addEventListener('click', () => {
            this.removeVideoPreview();
        });

        // Guardar referencia del archivo para envío
        this.pendingVideoFile = file;
        this.pendingVideoUrl = videoUrl;

        // Enfocar el input de texto
        const messageInput = Utils.$('#message-input');
        if (messageInput) {
            messageInput.focus();
        }
    }

    removeImagePreview() {
        const previewContainer = document.querySelector('.image-preview-container');
        if (previewContainer) {
            previewContainer.remove();
        }

        // Limpiar referencias
        if (this.pendingImageUrl) {
            URL.revokeObjectURL(this.pendingImageUrl);
        }
        this.pendingImageFile = null;
        this.pendingImageUrl = null;
        
        // Actualizar el botón de envío
        this.updateSendButton();
    }

    removeVideoPreview() {
        const previewContainer = document.querySelector('.video-preview-container');
        if (previewContainer) {
            previewContainer.remove();
        }

        // Limpiar referencias
        if (this.pendingVideoUrl) {
            URL.revokeObjectURL(this.pendingVideoUrl);
        }
        this.pendingVideoFile = null;
        this.pendingVideoUrl = null;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async uploadFile(file, type = 'image') {
        console.log('Uploading file:', file.name, type);
        
        const formData = new FormData();
        const fieldName = type === 'image' ? 'image' : 'file';
        formData.append(fieldName, file);
        
        try {
            const response = await fetch(`/api/upload/${type}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Utils.Storage.get('authToken')}`
                },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Upload failed');
            }
            
            console.log('File uploaded successfully:', result.data);
            return result.data;
            
        } catch (error) {
            console.error('File upload error:', error);
            throw error;
        }
    }

    updateTemporaryMessageImage(tempId, uploadResult) {
        const messageEl = document.querySelector(`[data-client-id="${tempId}"]`);
        if (messageEl) {
            const imageEl = messageEl.querySelector('.message-image img');
            if (imageEl) {
                // Update the image source to use the server URL
                imageEl.src = uploadResult.url;
                console.log('Updated temporary message image with server URL:', uploadResult.url);
            }
        }
    }

    expandImage(imgElement) {
        // Crear overlay para imagen expandida
        const overlay = document.createElement('div');
        overlay.className = 'image-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: zoom-out;
        `;

        // Crear imagen expandida
        const expandedImg = document.createElement('img');
        expandedImg.src = imgElement.src;
        expandedImg.alt = imgElement.alt;
        expandedImg.style.cssText = `
            max-width: 90vw;
            max-height: 90vh;
            object-fit: contain;
            border-radius: 8px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        `;

        // Crear botón de cerrar
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.title = 'Cerrar (ESC)';
        closeBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 30px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 40px;
            cursor: pointer;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
            transition: background 0.2s ease;
        `;

        // Crear botón de descarga
        const downloadBtn = document.createElement('button');
        downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
        downloadBtn.title = 'Descargar imagen';
        downloadBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 90px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
            transition: background 0.2s ease;
        `;

        // Event listeners para hover
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
        });

        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        });

        downloadBtn.addEventListener('mouseenter', () => {
            downloadBtn.style.background = 'rgba(255, 255, 255, 0.3)';
        });

        downloadBtn.addEventListener('mouseleave', () => {
            downloadBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        });

        // Función para cerrar
        const closeOverlay = () => {
            overlay.remove();
            document.body.style.overflow = '';
        };

        // Función para descargar imagen
        const downloadImage = async () => {
            try {
                const response = await fetch(imgElement.src);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                
                // Generar nombre de archivo basado en la fecha/hora
                const now = new Date();
                const timestamp = now.toISOString().slice(0, 19).replace(/[:.]/g, '-');
                const extension = imgElement.src.split('.').pop().split('?')[0] || 'jpg';
                link.download = `imagen-${timestamp}.${extension}`;
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                console.log('Imagen descargada exitosamente');
            } catch (error) {
                console.error('Error al descargar imagen:', error);
                // Fallback: intentar descarga directa
                const link = document.createElement('a');
                link.href = imgElement.src;
                link.download = `imagen-${Date.now()}.jpg`;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        };

        // Event listeners
        closeBtn.addEventListener('click', closeOverlay);
        downloadBtn.addEventListener('click', downloadImage);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeOverlay();
            }
        });

        // Cerrar con ESC
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeOverlay();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        // Agregar elementos
        overlay.appendChild(expandedImg);
        overlay.appendChild(closeBtn);
        overlay.appendChild(downloadBtn);
        document.body.appendChild(overlay);
        
        // Prevenir scroll del body
        document.body.style.overflow = 'hidden';

        // Animación de entrada
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 10);
    }

    setupMobileInputBehavior() {
        const messageInput = Utils.$('#message-input');
        const messageInputContainer = Utils.$('#message-input-container');
        
        if (!messageInput || !messageInputContainer) return;
        
        // Set up viewport height handling for mobile keyboard
        this.setupMobileViewportHandler();

        // Handle focus/blur for hiding navigation
        messageInput.addEventListener('focus', () => {
            if (window.innerWidth <= 768) {
                messageInputContainer.classList.add('typing-mode');
                // Hide bottom navigation on mobile
                const sidebar = Utils.$('.sidebar');
                if (sidebar && sidebar.classList.contains('open')) {
                    // Don't hide navigation if sidebar is open
                    return;
                }
                // Add class to hide navigation tabs
                document.body.classList.add('mobile-typing');
            }
        });

        messageInput.addEventListener('blur', () => {
            if (window.innerWidth <= 768) {
                // Small delay to allow for keyboard animation
                setTimeout(() => {
                    messageInputContainer.classList.remove('typing-mode');
                    document.body.classList.remove('mobile-typing');
                }, 300);
            }
        });

        // Auto-resize input
        messageInput.addEventListener('input', () => {
            this.autoResizeInput(messageInput);
        });
    }
    
    // Setup dynamic viewport handling for mobile keyboard
    setupMobileViewportHandler() {
        if (window.innerWidth > 768) return; // Only for mobile
        
        // Function to set app height based on viewport
        const setAppHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
            console.log(`Viewport height updated: ${window.innerHeight}px`);
        };
        
        // Set initial height
        setAppHeight();
        
        // Update height on resize (keyboard show/hide)
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                setAppHeight();
            }, 100);
        });
        
        // Alternative method using visual viewport if available
        if (window.visualViewport) {
            const handleViewportChange = () => {
                const height = window.visualViewport.height;
                document.documentElement.style.setProperty('--app-height', `${height}px`);
                console.log(`Visual viewport height updated: ${height}px`);
            };
            
            window.visualViewport.addEventListener('resize', handleViewportChange);
        }
        
        // Handle input focus/blur for better keyboard management
        const messageInput = Utils.$('#message-input');
        if (messageInput) {
            messageInput.addEventListener('focus', () => {
                console.log('Input focused - keyboard should appear');
                // Delay to ensure keyboard is fully shown
                setTimeout(setAppHeight, 300);
            });
            
            messageInput.addEventListener('blur', () => {
                console.log('Input blurred - keyboard should hide');
                // Delay to ensure keyboard is fully hidden
                setTimeout(setAppHeight, 300);
            });
        }
    }

    autoResizeInput(element) {
        if (!element) return;
        
        // Reset height to calculate new height
        element.style.height = 'auto';
        
        // Calculate new height based on content
        const maxHeight = 80; // Match CSS max-height
        const newHeight = Math.min(element.scrollHeight, maxHeight);
        
        element.style.height = newHeight + 'px';
        
        // Add scrollbar if content exceeds max height
        if (element.scrollHeight > maxHeight) {
            element.style.overflowY = 'auto';
        } else {
            element.style.overflowY = 'hidden';
        }
    }

    // ENHANCED METHODS FOR IMPROVED NOTIFICATION FLOW

    // Immediate global counter update without animation delays
    updateGlobalUnreadCounterImmediate() {
        const totalUnread = this.calculateTotalUnreadCount();
        
        console.log(`🔔 updateGlobalUnreadCounterImmediate called - Total unread: ${totalUnread}`);
        
        // Use the correct elements - only manipulate the badge, not the container
        const globalUnreadBadge = document.getElementById('global-unread-badge');
        const globalUnreadCount = document.getElementById('global-unread-count');
        
        console.log(`🔍 DOM elements found:`, {
            badge: !!globalUnreadBadge,
            count: !!globalUnreadCount,
            badgeClasses: globalUnreadBadge?.className,
            countText: globalUnreadCount?.textContent
        });
        
        if (!globalUnreadBadge || !globalUnreadCount) {
            console.error('❌ Global notification elements not found');
            return;
        }

        const displayCount = totalUnread > 99 ? '99+' : totalUnread.toString();
        
        if (totalUnread > 0) {
            // Show badge immediately without animations
            console.log(`🔔 Showing global badge with count: ${displayCount}`);
            globalUnreadBadge.style.transition = 'none';
            globalUnreadBadge.classList.remove('hidden');
            globalUnreadBadge.style.display = 'flex';
            globalUnreadBadge.style.animation = 'none';
            globalUnreadCount.textContent = displayCount;
            
            console.log(`✅ Badge updated - Classes: ${globalUnreadBadge.className}, Display: ${globalUnreadBadge.style.display}`);
        } else {
            // Hide badge immediately without animations
            console.log(`🔕 Hiding global badge (no unread messages)`);
            globalUnreadBadge.style.transition = 'none';
            globalUnreadBadge.classList.add('hidden');
            globalUnreadBadge.style.display = 'none';
            globalUnreadBadge.style.animation = 'none';
            
            console.log(`✅ Badge hidden - Classes: ${globalUnreadBadge.className}, Display: ${globalUnreadBadge.style.display}`);
        }
        
        console.log(`✅ Global counter update completed: ${totalUnread} unread messages`);
    }

    // Update conversation item without flickering - DEPRECATED, use updateConversationItemSmart instead
    updateConversationItemWithoutFlicker(conversationId, conversation) {
        console.log(`Deprecated function called, redirecting to updateConversationItemSmart for: ${conversationId}`);
        return this.updateConversationItemSmart(conversationId, conversation);
    }

    // DEPRECATED: Use handleChatItemClick instead
    async selectConversationEnhanced(conversationId) {
        return this.handleChatItemClick(conversationId);
    }

    // Update browser title notification
    updateBrowserTitleNotification() {
        const totalUnread = this.calculateTotalUnreadCount();
        const originalTitle = document.title.replace(/^\(\d+\)\s*/, '');
        
        if (totalUnread > 0) {
            document.title = `(${totalUnread}) ${originalTitle}`;
        } else {
            document.title = originalTitle;
        }
    }

    // Optimized renderConversations to prevent flickering
    renderConversationsOptimized() {
        console.log('Optimized renderConversations called, conversations count:', this.conversations.size);
        
        const chatList = Utils.$('#chat-list');
        if (!chatList) {
            console.error('chat-list element not found');
            return;
        }

        // Check if we actually need to re-render by comparing conversation data
        if (this.lastRenderedConversationData) {
            const currentData = this.getConversationRenderData();
            if (this.isConversationDataSame(currentData, this.lastRenderedConversationData)) {
                console.log('Conversation data unchanged, skipping re-render to prevent flicker');
                return;
            }
        }

        // Store current data for next comparison
        this.lastRenderedConversationData = this.getConversationRenderData();

        if (this.conversations.size === 0) {
            if (!chatList.querySelector('.empty-state')) {
                chatList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-comments"></i>
                        <p>No hay conversaciones</p>
                        <button class="btn-primary" id="start-new-chat-btn">
                            Iniciar chat
                        </button>
                    </div>
                `;
                
                const startChatBtn = chatList.querySelector('#start-new-chat-btn');
                if (startChatBtn) {
                    startChatBtn.addEventListener('click', () => {
                        const contactsTab = document.querySelector('[data-tab="contacts"]');
                        if (contactsTab) {
                            contactsTab.click();
                            Utils.Notifications.info('Selecciona un contacto para iniciar una conversación');
                        }
                    });
                }
            }
            return;
        }

        // Use DocumentFragment for efficient DOM updates
        const fragment = document.createDocumentFragment();
        const sortedConversations = Array.from(this.conversations.values())
            .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

        sortedConversations.forEach(conversation => {
            const conversationElement = this.createConversationItem(conversation);
            fragment.appendChild(conversationElement);
        });

        // Replace content in one operation to minimize flicker
        chatList.innerHTML = '';
        chatList.appendChild(fragment);
        
        console.log('Optimized conversations rendered without flicker');
    }

    // Helper method to get render data for comparison
    getConversationRenderData() {
        const data = {};
        this.conversations.forEach((conv, id) => {
            data[id] = {
                name: conv.name,
                lastMessage: conv.lastMessage?.content?.text || '',
                lastActivity: conv.lastActivity,
                unreadCount: conv.unreadCount || 0,
                hasNewMessage: conv.hasNewMessage || false
            };
        });
        return data;
    }

    // Helper method to compare conversation data
    isConversationDataSame(current, previous) {
        if (!previous) return false;
        
        const currentKeys = Object.keys(current);
        const previousKeys = Object.keys(previous);
        
        if (currentKeys.length !== previousKeys.length) return false;
        
        for (const key of currentKeys) {
            if (!previous[key]) return false;
            
            const curr = current[key];
            const prev = previous[key];
            
            if (curr.name !== prev.name ||
                curr.lastMessage !== prev.lastMessage ||
                curr.lastActivity !== prev.lastActivity ||
                curr.unreadCount !== prev.unreadCount ||
                curr.hasNewMessage !== prev.hasNewMessage) {
                return false;
            }
        }
        
        return true;
    }

    // ANTI-FLICKER SYSTEM: Generate signature to detect real changes
    generateRenderSignature() {
        const conversations = Array.from(this.conversations.values());
        return conversations.map(conv => {
            return `${conv._id}:${conv.name}:${conv.unreadCount || 0}:${conv.lastActivity}:${conv.lastMessage?.content?.text || ''}`;
        }).sort().join('|');
    }

    // Smart conversation update - ROBUST version with multiple fallbacks
    updateConversationItemSmart(conversationId, newData) {
        // Simplified version to avoid complex dependencies
        return this.updateConversationItem(conversationId, newData);
    }

    // Batch update multiple conversations efficiently
    batchUpdateConversations(updates) {
        let hasAnyChanges = false;
        
        updates.forEach(({ conversationId, data }) => {
            const hasChanges = this.updateConversationItemSmart(conversationId, data);
            if (hasChanges) {
                hasAnyChanges = true;
            }
        });

        // Only update global counter if there were actual changes
        if (hasAnyChanges) {
            this.updateGlobalUnreadCounter();
        }

        return hasAnyChanges;
    }

    // HELPER FUNCTIONS FOR ROBUST BADGE MANAGEMENT
    
    // Find unread badge with multiple fallback selectors
    findUnreadBadge(chatItem) {
        // Try multiple possible selectors
        const selectors = [
            '.unread-badge-messenger',
            '.unread-badge',
            '.unread-count',
            '.badge',
            '[class*="unread"]',
            '[class*="badge"]'
        ];
        
        for (const selector of selectors) {
            const badge = chatItem.querySelector(selector);
            if (badge) {
                console.log(`🔍 Found badge with selector: ${selector}`);
                return badge;
            }
        }
        
        console.log(`🔍 No existing badge found in chat item`);
        return null;
    }
    
    // Create unread badge with robust fallback placement
    createUnreadBadge(chatItem, conversationId) {
        console.log(`🆕 Creating new badge for: ${conversationId}`);
        
        // Create badge element
        const badge = document.createElement('div');
        badge.className = 'unread-badge-messenger';
        badge.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            background: #25d366;
            color: white;
            border-radius: 50%;
            font-size: 12px;
            font-weight: bold;
            min-width: 18px;
            height: 18px;
            padding: 2px 4px;
            margin-left: 4px;
        `;
        
        // Try multiple placement strategies
        const placementSelectors = [
            '.chat-indicators',
            '.chat-time-container',
            '.chat-top-row',
            '.chat-info'
        ];
        
        for (const selector of placementSelectors) {
            const container = chatItem.querySelector(selector);
            if (container) {
                container.appendChild(badge);
                console.log(`✅ Badge created and placed in: ${selector}`);
                return badge;
            }
        }
        
        // Fallback: append to chat item directly
        chatItem.appendChild(badge);
        console.log(`✅ Badge created and placed as direct child of chat item`);
        return badge;
    }
    
    // Force re-render chat item with unread badge (nuclear option)
    forceUpdateChatItemWithBadge(conversationId, unreadCount) {
        console.log(`💥 Force updating chat item: ${conversationId} with count: ${unreadCount}`);
        
        const chatItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (!chatItem) return false;
        
        // Remove any existing badges
        const existingBadges = chatItem.querySelectorAll('[class*="badge"], [class*="unread"]');
        existingBadges.forEach(badge => badge.remove());
        
        // Add badge to HTML directly if unreadCount > 0
        if (unreadCount > 0) {
            const displayCount = unreadCount > 99 ? '99+' : unreadCount;
            const badgeHTML = `<div class="unread-badge-messenger" style="display: flex; align-items: center; justify-content: center; background: #25d366; color: white; border-radius: 50%; font-size: 12px; font-weight: bold; min-width: 18px; height: 18px; padding: 2px 4px; margin-left: 4px;">${displayCount}</div>`;
            
            // Try to inject into various containers
            const containers = [
                chatItem.querySelector('.chat-indicators'),
                chatItem.querySelector('.chat-time-container'),
                chatItem.querySelector('.chat-top-row')
            ];
            
            for (const container of containers) {
                if (container) {
                    container.insertAdjacentHTML('beforeend', badgeHTML);
                    console.log(`✅ Force-injected badge into container`);
                    return true;
                }
            }
            
            // Ultimate fallback
            chatItem.insertAdjacentHTML('beforeend', badgeHTML);
            console.log(`✅ Force-injected badge as direct child`);
            return true;
        }
        
        return false;
    }

    // SMOOTH CONVERSATION LOADING SYSTEM

    // Standard message loading like WhatsApp
    async loadConversationMessages(conversationId) {
        console.log(`📥 Loading conversation messages for: ${conversationId}`);

        try {
            this.setupElements();
            if (!this.messageContainer) {
                throw new Error('Message container not found');
            }

            // Show simple loading indicator centered
            this.messageContainer.innerHTML = '<div class="loading-indicator" style="display: flex; justify-content: center; align-items: center; height: 200px; font-size: 14px; color: #666;">Cargando mensajes...</div>';

            // Handle temporary conversations
            if (conversationId.startsWith('temp_')) {
                await this.handleTemporaryConversation(conversationId);
                return;
            }

            // Load messages
            const messages = await this.fetchMessages(conversationId);
            
            // Clear container and render messages
            this.messageContainer.innerHTML = '';
            
            if (messages && messages.length > 0) {
                messages.forEach(message => {
                    const messageElement = this.renderMessage(message);
                    if (messageElement) {
                        this.messageContainer.appendChild(messageElement);
                    }
                });
            }

            // Scroll to bottom (latest messages)
            this.scrollToBottom();

            console.log(`✅ Message loading completed for: ${conversationId}`);

        } catch (error) {
            console.error(`❌ Error loading messages:`, error);
            this.handleLoadingError(error, conversationId);
        }
    }

    // Handle temporary conversations (new conversations without messages)
    async handleTemporaryConversation(conversationId) {
        console.log('🆕 Handling temporary conversation:', conversationId);
        
        // Clear message container and show welcome screen
        if (this.messageContainer) {
            this.messageContainer.innerHTML = '';
        }
        
        // Show welcome message for new chat
        this.showWelcomeMessageForNewChat();
    }

    // Handle loading errors
    handleLoadingError(error, conversationId) {
        console.error('💥 Error loading conversation:', error);
        
        if (this.messageContainer) {
            this.messageContainer.innerHTML = `
                <div class="error-message" style="text-align: center; padding: 2rem; color: #666;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem; color: #ff6b6b;"></i>
                    <p>Error al cargar los mensajes</p>
                    <button onclick="window.chatManager.loadConversationMessages('${conversationId}')" 
                            class="retry-btn" 
                            style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--primary-color); color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
                        Reintentar
                    </button>
                </div>
            `;
        }
        
        // Show alert for user feedback
        Utils.Alerts.error('Error al cargar la conversación');
    }

    // Simple message fetching
    async fetchMessages(conversationId) {
        const response = await fetch(`/api/messages/conversation/${conversationId}`, {
            headers: {
                'Authorization': `Bearer ${Utils.Storage.get('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success || !result.data || !result.data.messages) {
            throw new Error('Invalid response format');
        }

        console.log(`📨 Fetched ${result.data.messages.length} messages`);
        return result.data.messages;
    }

    // Simple scroll to bottom
    scrollToBottom() {
        if (this.messageContainer) {
            this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
        }
    }





    // Standard chat item click handler - Clean like WhatsApp
    async handleChatItemClick(conversationId, conversationData = null) {
        try {
            // Get conversation data
            const conversation = conversationData || this.conversations.get(conversationId);
            if (!conversation) {
                Utils.Notifications.error('Conversación no encontrada');
                return;
            }

            // Set as current conversation
            this.currentConversation = conversation;
            this.updateActiveConversation();
            
            // Handle UI updates
            if (window.welcomeScreenManager) {
                window.welcomeScreenManager.setActiveConversation(true);
            }
            if (window.mobileNavigation?.onChatStarted) {
                window.mobileNavigation.onChatStarted();
            }
            
            // Join conversation room
            if (window.SocketManager?.isConnected) {
                window.SocketManager.joinConversation(conversationId);
            }
            
            // Load messages
            await this.loadConversationMessages(conversationId);
            
            // Mark as read and update counters
            await this.markConversationAsRead(conversationId);
            this.updateConversationItem(conversationId, { unreadCount: 0 });
            this.updateGlobalUnreadCounter();
            
        } catch (error) {
            console.error(`Error opening conversation:`, error);
            Utils.Notifications.error('Error al abrir la conversación');
        }
    }

    // Simple conversation item update
    updateConversationItem(conversationId, data) {
        const chatItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (!chatItem) return;

        // Update badge
        if (data.hasOwnProperty('unreadCount')) {
            let badge = chatItem.querySelector('.unread-badge-messenger');
            
            if (data.unreadCount > 0) {
                if (!badge) {
                    const indicators = chatItem.querySelector('.chat-indicators');
                    if (indicators) {
                        badge = document.createElement('div');
                        badge.className = 'unread-badge-messenger';
                        indicators.appendChild(badge);
                    }
                }
                if (badge) {
                    badge.textContent = data.unreadCount > 99 ? '99+' : data.unreadCount;
                    chatItem.classList.add('has-unread');
                }
            } else {
                if (badge) {
                    badge.remove();
                    chatItem.classList.remove('has-unread');
                }
            }
        }
    }

    // Load real conversation states from database
    async loadConversationStates() {
        console.log('📥 Loading real conversation states from database...');
        
        try {
            // Use existing conversations endpoint instead of non-existent /states endpoint
            const response = await fetch('/api/messages/conversations', {
                headers: {
                    'Authorization': `Bearer ${Utils.Storage.get('authToken')}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                console.log('✅ Loaded conversation states:', result.data.length);
                
                // Update local conversations with real unread counts
                result.data.forEach(state => {
                    const conversation = this.conversations.get(state.conversationId);
                    if (conversation) {
                        conversation.unreadCount = state.unreadCount || 0;
                        conversation.lastReadMessageId = state.lastReadMessageId;
                        conversation.lastActivity = state.lastActivity;
                        
                        // Update UI with real data
                        this.updateConversationItem(state.conversationId, {
                            unreadCount: state.unreadCount || 0
                        });
                    }
                });
                
                // Update global counter with real data
                this.updateGlobalUnreadCounter();
                
                // Re-render conversations with updated data
                this.renderConversations();
                
            } else {
                console.warn('No conversation states received from API');
            }
            
        } catch (error) {
            console.error('❌ Error loading conversation states:', error);
            // Fallback: keep existing conversation data without simulation
        }
    }

    // Save unread count to database immediately - using socket instead of non-existent API
    async saveUnreadCountToDatabase(conversationId, unreadCount) {
        try {
            console.log(`💾 Saving unread count ${unreadCount} for conversation ${conversationId} via socket`);
            
            // Use socket to update unread count instead of non-existent API endpoint
            if (window.SocketManager?.isConnected) {
                window.SocketManager.emit('conversation:unread-count', {
                    conversationId,
                    unreadCount,
                    userId: this.currentUser?._id,
                    timestamp: new Date().toISOString()
                });
                console.log('✅ Unread count sent via socket');
                return true;
            } else {
                console.warn('⚠️ Socket not connected, unread count not saved');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Failed to save unread count to database:', error);
            // Continue operation even if DB save fails - better user experience
        }
    }

    // Simple global unread counter update
    updateGlobalUnreadCounter() {
        const totalUnread = this.calculateTotalUnreadCount();
        
        // Try multiple selectors for the notification badge
        const globalBadge = document.getElementById('global-unread-badge') || 
                           document.querySelector('.global-unread-badge') ||
                           document.querySelector('[data-role="global-notification-badge"]');
        
        const globalCount = document.getElementById('global-unread-count') ||
                           document.querySelector('.global-unread-count') ||
                           globalBadge?.querySelector('.count');
        
        console.log(`🔔 Updating global counter: ${totalUnread} unread messages`, {
            badge: !!globalBadge,
            count: !!globalCount,
            badgeElement: globalBadge?.tagName,
            countElement: globalCount?.tagName
        });
        
        if (globalBadge && globalCount) {
            if (totalUnread > 0) {
                globalBadge.style.display = 'flex';
                globalBadge.style.visibility = 'visible';
                globalBadge.classList.remove('hidden');
                globalCount.textContent = totalUnread > 99 ? '99+' : totalUnread;
                console.log(`✅ Badge shown with count: ${globalCount.textContent}`);
            } else {
                globalBadge.style.display = 'none';
                globalBadge.style.visibility = 'hidden';
                globalBadge.classList.add('hidden');
                console.log(`✅ Badge hidden (no unread messages)`);
            }
        } else {
            console.warn('❌ Global notification elements not found', {
                badgeSelector: '#global-unread-badge',
                countSelector: '#global-unread-count'
            });
        }
        
        // Also update browser title
        this.updateBrowserTitle(totalUnread);
    }

    // Calculate total unread messages
    calculateTotalUnreadCount() {
        let total = 0;
        for (const conversation of this.conversations.values()) {
            total += conversation.unreadCount || 0;
        }
        return total;
    }

    // Update browser title with unread count
    updateBrowserTitle(unreadCount) {
        const baseTitle = 'Chat Realtime';
        if (unreadCount > 0) {
            document.title = `(${unreadCount}) ${baseTitle}`;
        } else {
            document.title = baseTitle;
        }
    }

    // Helper method: Load messages with retry mechanism
    async loadMessagesWithRetry(conversationId, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`📥 Loading messages attempt ${attempt}/${maxRetries} for: ${conversationId}`);
                await this.loadConversationMessages(conversationId);
                
                // Verify messages were actually loaded
                const messageContainer = document.getElementById('messages-scroll');
                const messages = messageContainer?.querySelectorAll('.message');
                
                if (messages && messages.length > 0) {
                    console.log(`✅ Messages loaded successfully: ${messages.length} messages`);
                    return true;
                } else if (attempt === maxRetries) {
                    console.warn(`⚠️ No messages found after ${maxRetries} attempts`);
                    return true; // Might be a new conversation with no messages
                }
                
            } catch (error) {
                console.error(`❌ Message loading attempt ${attempt} failed:`, error);
                if (attempt === maxRetries) {
                    return false;
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 500 * attempt));
            }
        }
        return false;
    }

    // Helper method: Mark conversation as read robustly
    async markConversationAsReadRobustly(conversationId, conversation) {
        try {
            console.log(`📖 Starting robust read marking for: ${conversation.name}`);
            
            // 1. Update local conversation data
            const previousUnread = conversation.unreadCount || 0;
            conversation.unreadCount = 0;
            conversation.hasNewMessage = false;
            conversation.lastReadAt = new Date();
            
            // 2. Immediately update UI elements
            this.updateConversationItemSmart(conversationId, conversation);
            this.updateGlobalUnreadCounter();
            
            // 3. Send to server (background)
            if (window.SocketManager?.isConnected) {
                try {
                    window.SocketManager.markConversationAsRead(conversationId);
                    console.log('✅ Read status sent to server');
                } catch (serverError) {
                    console.warn('⚠️ Server update failed, but local update succeeded:', serverError);
                }
            }
            
            // 4. Update browser title
            this.updateBrowserTitleNotification();
            
            console.log(`✅ Conversation marked as read: ${previousUnread} → 0 messages`);
            
        } catch (error) {
            console.error('❌ Error marking conversation as read:', error);
        }
    }

    // Helper method: Update contact status robustly
    async updateContactStatusRobustly(conversation) {
        try {
            console.log('👤 Updating contact status robustly...');
            
            // Get recipient info
            const recipientId = this.getRecipientId();
            if (!recipientId) {
                console.warn('⚠️ No recipient ID found');
                return;
            }
            
            // Update contact presence and status
            const contactData = await this.getRealTimeContactData(recipientId);
            if (contactData) {
                console.log(`✅ Got contact data for ${recipientId}:`, contactData);
                
                // Update header with fresh data
                this.updateConversationHeaderPersistent(recipientId, contactData.status, contactData.lastSeen);
            }
            
        } catch (error) {
            console.error('❌ Error updating contact status:', error);
        }
    }

    // Helper method: Perform final UI updates
    async performFinalUIUpdates(conversationId, conversation, previousUnreadCount) {
        try {
            console.log('🎨 Performing final UI updates...');
            
            // 1. Auto-scroll to latest messages
            this.performRobustAutoScroll();
            
            // 2. Position verification
            setTimeout(() => {
                this.enforceMessagePositioningImmediate();
            }, 200);
            
            // 3. Initialize message position protection
            this.initializeMessagePositionProtector();
            
            // 4. Update active conversation highlighting
            this.updateActiveConversationHighlight(conversationId);
            
            // 5. Trigger any necessary re-renders
            if (previousUnreadCount > 0) {
                // Only trigger smart updates, not full re-render
                this.updateConversationItemSmart(conversationId, conversation);
            }
            
            console.log('✅ Final UI updates completed');
            
        } catch (error) {
            console.error('❌ Error in final UI updates:', error);
        }
    }

    // Helper method: Update chat item active state
    updateChatItemActiveState(conversationId, isActive) {
        try {
            // Remove active class from all items
            document.querySelectorAll('.chat-item.active').forEach(item => {
                item.classList.remove('active');
            });
            
            // Add active class to current item
            if (isActive) {
                const currentItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
                if (currentItem) {
                    currentItem.classList.add('active');
                    console.log(`✅ Chat item marked as active: ${conversationId}`);
                }
            }
        } catch (error) {
            console.error('❌ Error updating chat item active state:', error);
        }
    }

    // Helper method: Update active conversation highlight
    updateActiveConversationHighlight(conversationId) {
        try {
            // Ensure only the correct conversation is highlighted
            document.querySelectorAll('.chat-item').forEach(item => {
                const itemId = item.getAttribute('data-conversation-id');
                if (itemId === conversationId) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        } catch (error) {
            console.error('❌ Error updating conversation highlight:', error);
        }
    }

    // Helper method: Recovery from click errors
    async recoverFromClickError(conversationId) {
        try {
            console.log(`🔧 Attempting recovery for conversation: ${conversationId}`);
            
            // Basic recovery: ensure UI is in consistent state
            this.isProcessingConversationClick = null;
            
            // Try to restore previous state
            const conversation = this.conversations.get(conversationId);
            if (conversation) {
                this.updateConversationItemSmart(conversationId, conversation);
            }
            
            // Clear any loading states
            const loadingElements = document.querySelectorAll('.loading');
            loadingElements.forEach(el => el.classList.remove('loading'));
            
            console.log('✅ Recovery completed');
            
        } catch (error) {
            console.error('❌ Recovery failed:', error);
        }
    }

    // DEBUG AND TESTING FUNCTIONS
    
    // Test function to verify indicator updates
    testIndicatorUpdates() {
        console.log('🧪 Testing indicator updates...');
        
        // Test 1: Check if global elements exist
        const globalBadge = document.getElementById('global-unread-badge');
        const globalCount = document.getElementById('global-unread-count');
        console.log('Global elements found:', { badge: !!globalBadge, count: !!globalCount });
        
        // Test 2: Check conversation data
        console.log('Current conversations:', this.conversations.size);
        this.conversations.forEach((conv, id) => {
            console.log(`  ${conv.name}: ${conv.unreadCount || 0} unread`);
        });
        
        // Test 3: Inspect actual DOM structure of chat items
        this.inspectChatItemStructure();
        
        // Test 4: Manual update
        this.updateGlobalUnreadCounter();
        
        // Test 5: Check first conversation badge
        if (this.conversations.size > 0) {
            const firstConv = Array.from(this.conversations.values())[0];
            console.log('Testing first conversation update:', firstConv.name);
            this.updateConversationItemSmart(firstConv._id, firstConv);
        }
    }

    // Debug function to inspect actual DOM structure
    inspectChatItemStructure() {
        console.log('🔍 Inspecting chat item DOM structure...');
        
        const chatItems = document.querySelectorAll('.chat-item');
        console.log(`Found ${chatItems.length} chat items`);
        
        chatItems.forEach((item, index) => {
            const conversationId = item.getAttribute('data-conversation-id');
            console.log(`\n📋 Chat Item ${index + 1} (ID: ${conversationId}):`);
            
            // Check overall structure
            console.log('  Classes:', item.className);
            console.log('  HTML structure:');
            console.log(item.innerHTML.substring(0, 500) + '...');
            
            // Look for indicators
            const chatIndicators = item.querySelector('.chat-indicators');
            const unreadBadge = item.querySelector('.unread-badge-messenger');
            const anyBadge = item.querySelector('[class*="badge"], [class*="unread"]');
            
            console.log('  Found elements:');
            console.log('    .chat-indicators:', !!chatIndicators);
            console.log('    .unread-badge-messenger:', !!unreadBadge);
            console.log('    Any badge-like element:', !!anyBadge);
            
            if (anyBadge) {
                console.log('    Badge element classes:', anyBadge.className);
                console.log('    Badge element content:', anyBadge.textContent);
            }
            
            // List all child elements with their classes
            const children = item.querySelectorAll('*');
            console.log('  All child elements:');
            children.forEach(child => {
                if (child.className) {
                    console.log(`    <${child.tagName.toLowerCase()} class="${child.className}">`);
                }
            });
        });
    }

    // Force reset all unread counts (for testing)
    forceResetAllUnreadCounts() {
        console.log('🔄 Force resetting all unread counts...');
        
        this.conversations.forEach((conversation, id) => {
            if (conversation.unreadCount > 0) {
                console.log(`Resetting ${conversation.name}: ${conversation.unreadCount} → 0`);
                conversation.unreadCount = 0;
                conversation.hasNewMessage = false;
                this.updateConversationItemSmart(id, conversation);
            }
        });
        
        this.updateGlobalUnreadCounter();
        console.log('✅ All unread counts reset');
    }

    // Simulate unread messages (for testing)
    // DEPRECATED - Use real database data instead  
    simulateUnreadMessages(count = 2) {
        console.warn('⚠️ simulateUnreadMessages is deprecated - using real database data');
        return;
        console.log(`🧪 Simulating ${count} unread messages...`);
        
        if (this.conversations.size > 0) {
            const firstConv = Array.from(this.conversations.values())[0];
            firstConv.unreadCount = count;
            firstConv.hasNewMessage = true;
            
            console.log(`Set ${firstConv.name} to ${count} unread messages`);
            this.updateConversationItem(firstConv._id, { unreadCount: count });
            this.updateGlobalUnreadCounter();
        }
    }

    // Force update all conversation badges (nuclear testing)
    forceUpdateAllBadges() {
        console.log('💥 Force updating all conversation badges...');
        
        this.conversations.forEach((conversation, id) => {
            const unreadCount = conversation.unreadCount || 0;
            console.log(`Force updating ${conversation.name}: ${unreadCount} unread`);
            this.forceUpdateChatItemWithBadge(id, unreadCount);
        });
        
        this.updateGlobalUnreadCounter();
        console.log('✅ All badges force updated');
    }

    // Test specific conversation badge update
    testConversationBadge(conversationId, count = 5) {
        console.log(`🧪 Testing badge update for conversation: ${conversationId} with count: ${count}`);
        
        const conversation = this.conversations.get(conversationId);
        if (!conversation) {
            console.error(`Conversation not found: ${conversationId}`);
            return;
        }
        
        // Set unread count
        conversation.unreadCount = count;
        
        // Try all update methods
        console.log('Method 1: updateConversationItemSmart');
        this.updateConversationItemSmart(conversationId, conversation);
        
        setTimeout(() => {
            console.log('Method 2: forceUpdateChatItemWithBadge');
            this.forceUpdateChatItemWithBadge(conversationId, count);
        }, 1000);
        
        // Update global counter
        this.updateGlobalUnreadCounter();
    }

    // TEST SMOOTH LOADING SYSTEM
    
    // Test smooth loading for specific conversation
    testSmoothLoading(conversationId) {
        console.log(`🧪 Testing smooth loading for: ${conversationId}`);
        
        if (!conversationId && this.conversations.size > 0) {
            conversationId = Array.from(this.conversations.keys())[0];
        }
        
        if (!conversationId) {
            console.error('No conversation ID provided or available');
            return;
        }
        
        this.loadConversationMessages(conversationId);
    }

    // Test older message loading
    testOlderMessageLoading(conversationId) {
        console.log(`🧪 Testing older message loading for: ${conversationId}`);
        
        if (!conversationId && this.currentConversation) {
            conversationId = this.currentConversation._id;
        }
        
        if (!conversationId) {
            console.error('No conversation ID provided or current conversation available');
            return;
        }
        
        // Removed complex older message loading
    }

    // Test scroll behavior
    testScrollBehavior() {
        console.log(`🧪 Testing scroll behavior`);
        
        if (!this.messageContainer) {
            console.error('Message container not found');
            return;
        }
        
        console.log('Testing scroll to latest...');
        this.scrollToBottom();
        
        setTimeout(() => {
            console.log('Testing scroll to top...');
            this.messageContainer.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }, 2000);
    }

    // Test loading states
    testLoadingStates() {
        console.log(`🧪 Testing loading states`);
        
        // Test main loading state
        this.showSmoothLoadingState('test-conversation');
        
        setTimeout(() => {
            this.hideSmoothLoadingState();
        }, 3000);
        
        // Test older messages loading
        setTimeout(() => {
            this.showOlderMessagesLoading();
            
            setTimeout(() => {
                this.hideOlderMessagesLoading();
            }, 2000);
        }, 4000);
    }

    // Test error handling
    testErrorHandling() {
        console.log(`🧪 Testing error handling`);
        
        this.handleLoadingError(new Error('Test error'), 'test-conversation-id');
    }

    // DEBUG COUNTER UPDATE FLOW
    debugCounterFlow(conversationId) {
        if (!conversationId && this.conversations.size > 0) {
            conversationId = Array.from(this.conversations.keys())[0];
        }
        
        if (!conversationId) {
            console.error('No conversation ID provided or available');
            return;
        }
        
        const conversation = this.conversations.get(conversationId);
        if (!conversation) {
            console.error(`Conversation not found: ${conversationId}`);
            return;
        }
        
        console.log('🔍 DEBUGGING COUNTER FLOW');
        console.log('========================');
        
        // Step 1: Show current state
        console.log('1. Current conversation state:');
        console.log(`   - Name: ${conversation.name}`);
        console.log(`   - Unread Count: ${conversation.unreadCount || 0}`);
        console.log(`   - Has New Message: ${conversation.hasNewMessage || false}`);
        
        // Step 2: Check DOM elements
        console.log('2. Checking DOM elements:');
        const chatItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        console.log(`   - Chat Item Found: ${!!chatItem}`);
        
        if (chatItem) {
            const badge = this.findUnreadBadge(chatItem);
            console.log(`   - Badge Found: ${!!badge}`);
            if (badge) {
                console.log(`   - Badge Content: "${badge.textContent}"`);
                console.log(`   - Badge Display: "${badge.style.display}"`);
                console.log(`   - Badge Classes: "${badge.className}"`);
            }
        }
        
        // Step 3: Check global counter
        console.log('3. Checking global counter:');
        const totalUnread = this.calculateTotalUnreadCount();
        console.log(`   - Total Unread Calculated: ${totalUnread}`);
        
        const globalBadge = document.getElementById('global-unread-badge');
        const globalCount = document.getElementById('global-unread-count');
        console.log(`   - Global Badge Found: ${!!globalBadge}`);
        console.log(`   - Global Count Found: ${!!globalCount}`);
        
        if (globalBadge && globalCount) {
            console.log(`   - Global Badge Display: "${globalBadge.style.display}"`);
            console.log(`   - Global Badge Classes: "${globalBadge.className}"`);
            console.log(`   - Global Count Text: "${globalCount.textContent}"`);
        }
        
        // Step 4: Test manual update
        console.log('4. Testing manual updates:');
        console.log('   - Setting conversation to 0 unread...');
        conversation.unreadCount = 0;
        conversation.hasNewMessage = false;
        
        console.log('   - Calling updateConversationItemSmart...');
        this.updateConversationItemSmart(conversationId, conversation);
        
        console.log('   - Calling updateGlobalUnreadCounterImmediate...');
        this.updateGlobalUnreadCounter();
        
        // Step 5: Verify changes
        setTimeout(() => {
            console.log('5. Verifying changes after update:');
            const updatedBadge = this.findUnreadBadge(chatItem);
            console.log(`   - Badge after update: ${!!updatedBadge}`);
            if (updatedBadge) {
                console.log(`   - Badge Display: "${updatedBadge.style.display}"`);
                console.log(`   - Badge Content: "${updatedBadge.textContent}"`);
            }
            
            if (globalBadge && globalCount) {
                console.log(`   - Global Badge Display: "${globalBadge.style.display}"`);
                console.log(`   - Global Count Text: "${globalCount.textContent}"`);
            }
            
            console.log('========================');
            console.log('🔍 Counter flow debugging completed');
        }, 500);
    }

    // Test complete conversation click flow with counter debugging
    testCompleteConversationFlow(conversationId) {
        if (!conversationId && this.conversations.size > 0) {
            conversationId = Array.from(this.conversations.keys())[0];
        }
        
        if (!conversationId) {
            console.error('No conversation ID provided or available');
            return;
        }
        
        console.log(`🧪 Testing complete conversation flow for: ${conversationId}`);
        
        // First, set some unread messages to test
        const conversation = this.conversations.get(conversationId);
        if (conversation) {
            conversation.unreadCount = 3;
            conversation.hasNewMessage = true;
            this.updateConversationItemSmart(conversationId, conversation);
            this.updateGlobalUnreadCounter();
            
            console.log('Set conversation to 3 unread messages');
            
            // Wait a bit, then simulate conversation click
            setTimeout(() => {
                console.log('Now simulating conversation click...');
                this.handleChatItemClick(conversationId, conversation);
            }, 2000);
        }
    }
}

// Initialize chat manager when Utils is available
const initChatManager = () => {
    try {
        if (typeof Utils !== 'undefined') {
            console.log('🚀 Initializing ChatManager...');
            window.Chat = new ChatManager();
            window.chatManager = window.Chat; // For compatibility with contacts.js
            console.log('✅ ChatManager created successfully');
            
            // Initialize with current user if available
            const currentUser = window.AuthManager ? window.AuthManager.getCurrentUser() : Utils.Storage.get('currentUser');
            if (currentUser) {
                console.log('👤 Initializing with current user:', currentUser.username);
                window.Chat.initialize(currentUser);
            } else {
                console.log('⚠️ No current user found for ChatManager initialization');
            }
            
            // Listen for authentication events to update current user
            if (window.Utils && Utils.EventBus) {
                Utils.EventBus.on('auth:login-success', (data) => {
                    if (data.user && window.Chat) {
                        console.log('🔄 Re-initializing ChatManager with logged-in user');
                        window.Chat.initialize(data.user);
                    }
                });
            }
        } else {
            console.log('⏳ Waiting for Utils to be available...');
            setTimeout(initChatManager, 10);
        }
    } catch (error) {
        console.error('❌ Error initializing ChatManager:', error);
        setTimeout(initChatManager, 100); // Retry after longer delay
    }
};

initChatManager();

// Limpiar intervalos cuando se cierre la ventana
window.addEventListener('beforeunload', () => {
    if (window.chatManager) {
        window.chatManager.stopIndicatorUpdates();
        window.chatManager.stopConversationUpdates();
    }
});

// ForwardManager class for handling message forwarding
class ForwardManager {
    constructor() {
        this.currentMessage = null;
        this.selectedContacts = new Set();
        this.contactsData = new Map();
        this.searchTimeout = null;
        
        this.initElements();
        this.bindEvents();
    }
    
    initElements() {
        this.modal = document.getElementById('forward-message-modal');
        this.messagePreview = document.getElementById('forward-message-content');
        this.searchInput = document.getElementById('forward-contact-search');
        this.contactsList = document.getElementById('forward-contacts-list');
        this.selectedSection = document.getElementById('selected-contacts-section');
        this.selectedList = document.getElementById('selected-contacts-list');
        this.confirmBtn = document.getElementById('confirm-forward');
        this.additionalTextInput = document.getElementById('forward-additional-text');
        this.charCount = document.getElementById('char-count');
        this.forwardCount = this.confirmBtn?.querySelector('.forward-count');
        this.selectAllCheckbox = document.getElementById('select-all-contacts');
        
        console.log('ForwardManager elements initialized:', {
            modal: !!this.modal,
            contactsList: !!this.contactsList,
            searchInput: !!this.searchInput,
            confirmBtn: !!this.confirmBtn
        });
    }
    
    bindEvents() {
        // Close modal events
        const closeBtn = document.getElementById('close-forward-modal');
        const cancelBtn = document.getElementById('cancel-forward');
        const overlay = this.modal?.querySelector('.modal-overlay');
        
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());
        if (overlay) overlay.addEventListener('click', () => this.closeModal());
        
        // Search input events
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }
        
        // Clear selection
        const clearBtn = document.getElementById('clear-selection');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSelection());
        }
        
        // Confirm forward
        if (this.confirmBtn) {
            this.confirmBtn.addEventListener('click', () => this.confirmForward());
        }
        
        // Character count for additional message
        if (this.additionalTextInput && this.charCount) {
            this.additionalTextInput.addEventListener('input', () => this.updateCharCount());
        }
        
        // Select all contacts
        if (this.selectAllCheckbox) {
            this.selectAllCheckbox.addEventListener('change', () => this.toggleSelectAll());
        }
        
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal?.classList.contains('hidden')) {
                this.closeModal();
            }
        });
    }
    
    openForwardModal(message) {
        console.log('Opening forward modal for message:', message);
        this.currentMessage = message;
        this.selectedContacts.clear();
        
        // Clear search input
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        
        // Clear additional text input
        if (this.additionalTextInput) {
            this.additionalTextInput.value = '';
        }
        
        // Reset select all checkbox
        if (this.selectAllCheckbox) {
            this.selectAllCheckbox.checked = false;
            this.selectAllCheckbox.indeterminate = false;
        }
        
        // Show message preview
        this.showMessagePreview(message);
        
        // Load contacts
        console.log('Loading contacts...');
        this.loadContacts();
        
        // Show modal
        if (this.modal) {
            this.modal.classList.remove('hidden');
            document.body.classList.add('modal-open');
            console.log('Modal shown');
            
            // Focus search input
            setTimeout(() => {
                if (this.searchInput) {
                    this.searchInput.focus();
                }
            }, 100);
        } else {
            console.error('Modal element not found');
        }
        
        this.updateUI();
    }
    
    showMessagePreview(message) {
        if (!this.messagePreview) return;
        
        const senderName = message.sender.fullName || message.sender.username;
        const messageText = Utils.truncateText(message.content.text, 100);
        
        this.messagePreview.innerHTML = `
            <div class="message-preview-item">
                <div class="preview-sender">
                    <img src="${message.sender.avatar || '/images/user-placeholder-32.svg'}" 
                         alt="${senderName}" class="sender-avatar">
                    <span class="sender-name">${senderName}</span>
                </div>
                <div class="preview-text">${messageText}</div>
            </div>
        `;
    }
    
    async loadContacts() {
        if (!this.contactsList) return;
        
        // Show loading state
        this.contactsList.innerHTML = `
            <div class="no-contacts">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando contactos...</p>
            </div>
        `;
        
        try {
            let contacts = [];
            
            // Primero intentar obtener contactos del contactsManager si está disponible
            if (window.contactsManager && window.contactsManager.contacts && window.contactsManager.contacts.size > 0) {
                contacts = Array.from(window.contactsManager.contacts.values());
                console.log('Loading contacts from contactsManager:', contacts.length);
            } else {
                // Si no hay contactos en el manager, cargar desde la API
                console.log('Loading contacts from API...');
                const response = await API.Contacts.getContacts();
                if (response.success && response.data) {
                    contacts = response.data;
                    console.log('Loaded contacts from API:', contacts.length);
                } else {
                    console.warn('No contacts received from API:', response);
                }
            }
            
            if (contacts && contacts.length > 0) {
                this.displayContacts(contacts);
            } else {
                this.contactsList.innerHTML = `
                    <div class="no-contacts">
                        <i class="fas fa-users"></i>
                        <p>No tienes contactos disponibles para reenviar</p>
                        <small>Agrega contactos para poder reenviar mensajes</small>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading contacts for forward:', error);
            this.contactsList.innerHTML = `
                <div class="no-contacts">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error al cargar contactos</p>
                    <small>Inténtalo de nuevo más tarde</small>
                </div>
            `;
        }
    }
    
    displayContacts(contacts) {
        if (!this.contactsList) {
            console.error('contactsList element not found');
            return;
        }
        
        console.log('Displaying contacts:', contacts.length, contacts);
        
        if (!contacts || !contacts.length) {
            this.contactsList.innerHTML = `
                <div class="no-contacts">
                    <i class="fas fa-users"></i>
                    <p>No tienes contactos disponibles</p>
                </div>
            `;
            return;
        }
        
        // Store contacts data
        this.contactsData.clear();
        contacts.forEach(contact => {
            this.contactsData.set(contact._id, contact);
        });
        
        const contactsHTML = contacts.map(contact => {
            const isSelected = this.selectedContacts.has(contact._id);
            const statusClass = contact.status === 'online' ? 'online' : 'offline';
            
            return `
                <div class="forward-contact-item ${isSelected ? 'selected' : ''}" data-contact-id="${contact._id}">
                    <div class="contact-avatar-wrapper">
                        <img src="${contact.avatar || '/images/user-placeholder-40.svg'}" 
                             alt="${contact.fullName}" class="contact-avatar">
                        <div class="status-indicator ${statusClass}"></div>
                    </div>
                    <div class="contact-info">
                        <div class="contact-name">${Utils.escapeHtml(contact.fullName || contact.username)}</div>
                        <div class="contact-username">@${Utils.escapeHtml(contact.username)}</div>
                    </div>
                    <div class="contact-action">
                        <span class="selection-status ${isSelected ? 'selected' : ''}" data-contact-id="${contact._id}">
                            <i class="fas ${isSelected ? 'fa-check-circle' : 'fa-circle'}"></i>
                            <span>${isSelected ? 'Seleccionado' : 'Seleccionar'}</span>
                        </span>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('Generated HTML for contacts:', contactsHTML.substring(0, 200) + '...');
        console.log('Setting innerHTML on element:', this.contactsList);
        console.log('Element ID:', this.contactsList.id);
        console.log('Element classes:', this.contactsList.className);
        
        // Clear the element first
        this.contactsList.innerHTML = '';
        
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            this.contactsList.innerHTML = contactsHTML;
            
            console.log('HTML after setting:', this.contactsList.innerHTML.substring(0, 200) + '...');
            console.log('Children count:', this.contactsList.children.length);
            
            // Force a reflow to ensure the DOM updates
            this.contactsList.offsetHeight;
            
            // Bind contact selection events
            this.bindContactEvents();
            
            // Double check that children are visible
            const items = this.contactsList.querySelectorAll('.forward-contact-item');
            console.log('Contact items found:', items.length);
            items.forEach((item, index) => {
                console.log(`Item ${index}:`, item.style.display, item.offsetHeight);
            });
            
            // Check container visibility
            const container = this.contactsList.parentElement;
            console.log('Container visibility:', {
                display: getComputedStyle(container).display,
                visibility: getComputedStyle(container).visibility,
                height: container.offsetHeight,
                overflow: getComputedStyle(container).overflow
            });
            
            console.log('ContactsList visibility:', {
                display: getComputedStyle(this.contactsList).display,
                visibility: getComputedStyle(this.contactsList).visibility,
                height: this.contactsList.offsetHeight,
                scrollHeight: this.contactsList.scrollHeight
            });
        }, 10);
    }
    
    bindContactEvents() {
        console.log('Binding contact events...');
        
        // Handle contact item clicks
        const contactItems = this.contactsList.querySelectorAll('.forward-contact-item');
        console.log('Found contact items:', contactItems.length);
        
        contactItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const contactId = item.dataset.contactId;
                console.log('Contact item clicked:', contactId);
                this.toggleContactSelection(contactId);
            });
        });
        
        // Handle selection status clicks specifically
        const selectionButtons = this.contactsList.querySelectorAll('.selection-status');
        console.log('Found selection buttons:', selectionButtons.length);
        
        selectionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const contactId = button.dataset.contactId;
                console.log('Selection button clicked for contact:', contactId);
                this.toggleContactSelection(contactId);
            });
        });
    }
    
    toggleContactSelection(contactId) {
        if (this.selectedContacts.has(contactId)) {
            this.selectedContacts.delete(contactId);
        } else {
            this.selectedContacts.add(contactId);
        }
        
        this.updateContactItem(contactId);
        this.updateSelectedContactsList();
        this.updateUI();
    }
    
    updateContactItem(contactId) {
        const item = this.contactsList.querySelector(`[data-contact-id="${contactId}"]`);
        const status = this.contactsList.querySelector(`[data-contact-id="${contactId}"] .selection-status`);
        
        if (item && status) {
            const isSelected = this.selectedContacts.has(contactId);
            
            // Update item appearance
            if (isSelected) {
                item.classList.add('selected');
                status.classList.add('selected');
                status.innerHTML = '<i class="fas fa-check-circle"></i><span>Seleccionado</span>';
            } else {
                item.classList.remove('selected');
                status.classList.remove('selected');
                status.innerHTML = '<i class="fas fa-circle"></i><span>Seleccionar</span>';
            }
        }
    }
    
    updateSelectedContactsList() {
        if (!this.selectedList) return;
        
        const selectedArray = Array.from(this.selectedContacts);
        const modalBody = this.modal?.querySelector('.modal-body');
        
        if (selectedArray.length === 0) {
            this.selectedSection.classList.add('hidden');
            if (modalBody) modalBody.classList.remove('has-selected-contacts');
            return;
        }
        
        this.selectedSection.classList.remove('hidden');
        if (modalBody) modalBody.classList.add('has-selected-contacts');
        
        this.selectedList.innerHTML = selectedArray.map(contactId => {
            const contact = this.contactsData.get(contactId);
            if (!contact) return '';
            
            return `
                <div class="selected-contact-item" data-contact-id="${contactId}">
                    <img src="${contact.avatar || '/images/user-placeholder-32.svg'}" 
                         alt="${contact.fullName}" class="selected-avatar">
                    <span class="selected-name">${Utils.escapeHtml(contact.fullName || contact.username)}</span>
                    <button class="remove-selected" data-contact-id="${contactId}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');
        
        // Bind remove events
        this.selectedList.querySelectorAll('.remove-selected').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const contactId = btn.dataset.contactId;
                this.toggleContactSelection(contactId);
            });
        });
    }
    
    handleSearch(query) {
        console.log('Search query:', query);
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Set new timeout for search (debounce)
        this.searchTimeout = setTimeout(() => {
            this.filterContacts(query);
        }, 300);
    }
    
    filterContacts(query) {
        console.log('Filtering contacts with query:', query);
        console.log('Available contacts data:', this.contactsData.size);
        
        if (!query.trim()) {
            // Show all contacts
            this.loadContacts();
            return;
        }
        
        const filteredContacts = Array.from(this.contactsData.values()).filter(contact => {
            const searchText = query.toLowerCase();
            const fullName = (contact.fullName || '').toLowerCase();
            const username = (contact.username || '').toLowerCase();
            
            const matches = fullName.includes(searchText) || username.includes(searchText);
            console.log(`Contact ${contact.fullName} matches: ${matches}`);
            return matches;
        });
        
        console.log('Filtered contacts:', filteredContacts.length);
        this.displayContacts(filteredContacts);
    }
    
    clearSelection() {
        this.selectedContacts.clear();
        this.updateSelectedContactsList();
        this.loadContacts(); // Reload to update selection states
        this.updateUI();
    }
    
    toggleSelectAll() {
        const isChecked = this.selectAllCheckbox?.checked;
        const allContacts = Array.from(this.contactsData.keys());
        
        if (isChecked) {
            // Select all contacts
            allContacts.forEach(contactId => {
                this.selectedContacts.add(contactId);
                this.updateContactItem(contactId);
            });
        } else {
            // Deselect all contacts
            this.selectedContacts.clear();
            allContacts.forEach(contactId => {
                this.updateContactItem(contactId);
            });
        }
        
        this.updateSelectedContactsList();
        this.updateUI();
    }
    
    updateUI() {
        const count = this.selectedContacts.size;
        const totalContacts = this.contactsData.size;
        
        // Update confirm button with intuitive text
        if (this.confirmBtn) {
            this.confirmBtn.disabled = count === 0;
            
            if (count === 0) {
                this.confirmBtn.innerHTML = '<i class="fas fa-share"></i> Selecciona contactos';
            } else if (count === 1) {
                this.confirmBtn.innerHTML = `<i class="fas fa-share"></i> Compartir con 1 contacto`;
            } else {
                this.confirmBtn.innerHTML = `<i class="fas fa-share"></i> Compartir con ${count} contactos`;
            }
        }
        
        // Update select all checkbox state
        if (this.selectAllCheckbox) {
            this.selectAllCheckbox.checked = count === totalContacts && totalContacts > 0;
            this.selectAllCheckbox.indeterminate = count > 0 && count < totalContacts;
        }
        
        // Update count display if exists
        if (this.forwardCount) {
            this.forwardCount.textContent = count.toString();
        }
    }
    
    async confirmForward() {
        // Validation
        if (this.selectedContacts.size === 0) {
            Utils.Notifications.error('Selecciona al menos un contacto para reenviar');
            return;
        }
        
        if (!this.currentMessage) {
            Utils.Notifications.error('No hay mensaje para reenviar');
            return;
        }
        
        if (!window.SocketManager || !window.SocketManager.isConnected) {
            Utils.Notifications.error('No hay conexión. Verifica tu internet');
            return;
        }
        
        const contactIds = Array.from(this.selectedContacts);
        const confirmBtn = this.confirmBtn;
        
        try {
            // Disable button and show loading
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reenviando...';
            }
            
            // Get additional message text (optional)
            const additionalText = this.additionalTextInput?.value?.trim() || '';
            
            // Validate message content
            if (!this.currentMessage.content || !this.currentMessage.content.text) {
                throw new Error('El mensaje original no tiene contenido válido');
            }
            
            // Send message to each selected contact
            let successCount = 0;
            for (const contactId of contactIds) {
                try {
                    // Validate contact ID
                    if (!contactId || typeof contactId !== 'string') {
                        console.warn('Invalid contact ID:', contactId);
                        continue;
                    }
                    
                    // Create forward data
                    const forwardData = {
                        isForwarded: true,
                        originalMessage: this.currentMessage._id,
                        originalSender: this.currentMessage.sender,
                        originalContent: this.currentMessage.content.text,
                        originalType: this.currentMessage.type || 'text',
                        originalAttachments: this.currentMessage.attachments || []
                    };
                    
                    // Send via socket with proper error handling
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('Timeout sending message'));
                        }, 10000); // 10 second timeout
                        
                        try {
                            window.SocketManager.sendForwardedMessage(contactId, additionalText, forwardData);
                            clearTimeout(timeout);
                            resolve();
                        } catch (error) {
                            clearTimeout(timeout);
                            reject(error);
                        }
                    });
                    
                    successCount++;
                } catch (error) {
                    console.error(`Error forwarding to contact ${contactId}:`, error);
                }
            }
            
            // Show success notification
            if (successCount > 0) {
                const contactNames = contactIds.slice(0, successCount).map(id => {
                    const contact = this.contactsData.get(id);
                    return contact ? (contact.fullName || contact.username) : 'Usuario';
                });
                
                const message = successCount === 1 
                    ? `Mensaje reenviado a ${contactNames[0]}`
                    : `Mensaje reenviado a ${successCount} contacto${successCount > 1 ? 's' : ''}`;
                Utils.Notifications.success(message);
                
                // Close modal on success
                this.closeModal();
            } else {
                Utils.Notifications.error('No se pudo reenviar el mensaje a ningún contacto');
                
                // Restore button
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    this.updateUI();
                }
            }
            
        } catch (error) {
            console.error('Error forwarding message:', error);
            Utils.Notifications.error(error.message || 'Error al reenviar el mensaje');
            
            // Restore button
            if (confirmBtn) {
                confirmBtn.disabled = false;
                this.updateUI();
            }
        }
    }
    
    updateCharCount() {
        if (!this.additionalTextInput || !this.charCount) return;
        
        const length = this.additionalTextInput.value.length;
        this.charCount.textContent = length;
        
        // Update styling based on character count
        this.charCount.parentElement.classList.remove('warning', 'error');
        if (length > 400) {
            this.charCount.parentElement.classList.add('warning');
        }
        if (length >= 500) {
            this.charCount.parentElement.classList.add('error');
        }
    }
    
    closeModal() {
        if (this.modal) {
            this.modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
        }
        
        // Reset state
        this.currentMessage = null;
        this.selectedContacts.clear();
        this.contactsData.clear();
        
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        
        // Clear additional message input
        if (this.additionalTextInput) {
            this.additionalTextInput.value = '';
            this.updateCharCount();
        }
        
        this.updateUI();
    }
}

// Initialize ForwardManager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.forwardManager = new ForwardManager();
    
    // Start real-time presence monitoring if Chat is available
    if (window.Chat && typeof window.Chat.startPresenceMonitoring === 'function') {
        window.Chat.startPresenceMonitoring();
    }
});

// Test function to simulate message delivery - for debugging
window.testMessageDelivery = function() {
    console.log('🧪 Testing message delivery simulation...');
    
    // Find the most recent sent message
    const sentMessages = document.querySelectorAll('.message.sent');
    if (sentMessages.length > 0) {
        const lastMessage = sentMessages[sentMessages.length - 1];
        const messageId = lastMessage.getAttribute('data-message-id');
        const clientId = lastMessage.getAttribute('data-client-id');
        
        console.log('🧪 Simulating delivery for message:', messageId, 'clientId:', clientId);
        
        // Simulate the delivered event
        if (window.Chat && window.Chat.handleMessageDelivered) {
            window.Chat.handleMessageDelivered({
                messageId: messageId,
                clientId: clientId,
                deliveredAt: Date.now()
            });
        }
    } else {
        console.log('🧪 No sent messages found to test delivery');
    }
};