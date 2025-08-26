/**
 * Full Profile Viewer
 * Handles complete profile views with detailed user information
 */

class ProfileViewer {
    constructor() {
        this.modal = null;
        this.modalOverlay = null;
        this.closeBtn = null;
        
        // Profile elements
        this.profileImage = null;
        this.profileName = null;
        this.profileUsername = null;
        this.profileFullName = null;
        this.profileUsernameDetail = null;
        this.profileStatus = null;
        this.profileStatusIndicator = null;
        this.profileLastSeen = null;
        this.profileLastConnection = null;
        this.profileEmail = null;
        this.profileBio = null;
        this.profileStatusMessage = null;
        this.profileMemberSince = null;
        
        // Shared content elements
        this.sharedFilesList = null;
        this.viewAllFilesBtn = null;
        
        // Quick action buttons
        this.quickMessageBtn = null;
        this.quickCallBtn = null;
        this.quickVideoBtn = null;
        
        // Action buttons
        this.expandPhotoBtn = null;
        this.blockUserBtn = null;
        this.removeContactBtn = null;
        
        this.currentUserData = null;
        
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupElements());
        } else {
            this.setupElements();
        }
    }

    setupElements() {
        this.modal = document.getElementById('full-profile-modal');
        this.modalOverlay = document.getElementById('profile-modal-overlay');
        this.closeBtn = document.getElementById('close-profile-modal');

        // Profile elements
        this.profileImage = document.getElementById('profile-modal-image');
        this.profileName = document.getElementById('profile-modal-name');
        this.profileUsername = document.getElementById('profile-modal-username');
        this.profileFullName = document.getElementById('profile-modal-full-name');
        this.profileUsernameDetail = document.getElementById('profile-modal-username-detail');
        this.profileStatus = document.getElementById('profile-modal-status');
        this.profileStatusIndicator = document.getElementById('profile-modal-status-indicator');
        this.profileLastSeen = document.getElementById('profile-modal-last-seen');
        this.profileLastConnection = document.getElementById('profile-modal-last-connection');
        this.profileEmail = document.getElementById('profile-modal-email');
        this.profileBio = document.getElementById('profile-modal-bio');
        this.profileStatusMessage = document.getElementById('profile-modal-status-message');
        this.profileMemberSince = document.getElementById('profile-modal-member-since');
        
        // Shared content elements
        this.sharedFilesList = document.getElementById('shared-files-list');
        this.viewAllFilesBtn = document.getElementById('view-all-files');
        
        // Quick action buttons
        this.quickMessageBtn = document.getElementById('quick-message-btn');
        this.quickCallBtn = document.getElementById('quick-call-btn');
        this.quickVideoBtn = document.getElementById('quick-video-btn');

        // Action buttons
        this.expandPhotoBtn = document.getElementById('expand-photo-from-profile');
        this.blockUserBtn = document.getElementById('block-user-btn');
        this.removeContactBtn = document.getElementById('remove-contact-btn');

        if (!this.modal) {
            console.warn('Full profile modal not found');
            return;
        }

        this.setupEventListeners();
        this.setupProfileClickHandlers();
    }

    setupEventListeners() {
        // Close modal events
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (this.modalOverlay) {
            this.modalOverlay.addEventListener('click', () => this.closeModal());
        }

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalOpen()) {
                this.closeModal();
            }
        });

        // Expand photo button
        if (this.expandPhotoBtn) {
            this.expandPhotoBtn.addEventListener('click', () => {
                if (this.currentUserData && window.profilePhotoViewer) {
                    window.profilePhotoViewer.showPhoto(
                        this.currentUserData.avatar || 'images/user-placeholder-40.svg',
                        this.currentUserData.fullName || this.currentUserData.username,
                        this.getStatusText()
                    );
                }
            });
        }

        // Quick action buttons
        if (this.quickMessageBtn) {
            this.quickMessageBtn.addEventListener('click', () => this.handleSendMessage());
        }

        if (this.quickCallBtn) {
            this.quickCallBtn.addEventListener('click', () => this.handleVoiceCall());
        }

        if (this.quickVideoBtn) {
            this.quickVideoBtn.addEventListener('click', () => this.handleVideoCall());
        }

        if (this.blockUserBtn) {
            this.blockUserBtn.addEventListener('click', () => this.handleBlockUser());
        }

        if (this.removeContactBtn) {
            this.removeContactBtn.addEventListener('click', () => this.handleRemoveContact());
        }

        // Shared content buttons
        if (this.viewAllFilesBtn) {
            this.viewAllFilesBtn.addEventListener('click', () => this.handleViewAllFiles());
        }
    }

    setupProfileClickHandlers() {
        this.attachProfileClickHandlers();
        this.setupMutationObserver();
    }

    attachProfileClickHandlers() {
        // Contact items in contacts list (excluding the avatar)
        const contactItems = document.querySelectorAll('.contacts-list .contact-item');
        contactItems.forEach(item => {
            if (!item.hasAttribute('data-profile-handler')) {
                item.setAttribute('data-profile-handler', 'true');
                
                // Add click handler to the contact info area (not the avatar)
                const contactInfo = item.querySelector('.contact-info');
                if (contactInfo) {
                    contactInfo.addEventListener('click', (e) => {
                        // Prevent if clicking on avatar
                        if (e.target.tagName === 'IMG' || e.target.closest('.contact-avatar-container')) {
                            return;
                        }
                        
                        e.stopPropagation();
                        this.extractContactData(item).then(contactData => {
                            this.openProfile(contactData);
                        }).catch(error => {
                            console.error('Error extracting contact data:', error);
                            // Fallback to non-async version
                            const fallbackData = this.extractContactDataSync(item);
                            this.openProfile(fallbackData);
                        });
                    });
                }
            }
        });

        // Chat items in chat list (excluding the avatar) - but NOT in the main chats tab
        const chatItems = document.querySelectorAll('.chat-list .chat-item');
        chatItems.forEach(item => {
            // Skip if this is in the main chats tab (where clicks should open conversations)
            const isInChatsTab = item.closest('#chats-tab');
            if (isInChatsTab) return;
            if (!item.hasAttribute('data-profile-handler')) {
                item.setAttribute('data-profile-handler', 'true');
                
                const chatInfo = item.querySelector('.chat-info');
                if (chatInfo) {
                    chatInfo.addEventListener('click', (e) => {
                        // Prevent if clicking on avatar
                        if (e.target.tagName === 'IMG' || e.target.closest('.chat-avatar')) {
                            return;
                        }
                        
                        e.stopPropagation();
                        this.extractChatData(item).then(contactData => {
                            this.openProfile(contactData);
                        }).catch(error => {
                            console.error('Error extracting chat data:', error);
                            // Fallback to sync version
                            const fallbackData = this.extractChatDataSync(item);
                            this.openProfile(fallbackData);
                        });
                    });
                }
            }
        });

        // Contact info in chat header (excluding the avatar)
        const chatHeaderInfo = document.querySelector('.chat-header .contact-details');
        if (chatHeaderInfo && !chatHeaderInfo.hasAttribute('data-profile-handler')) {
            chatHeaderInfo.setAttribute('data-profile-handler', 'true');
            chatHeaderInfo.addEventListener('click', (e) => {
                // Prevent if clicking on avatar
                if (e.target.tagName === 'IMG') {
                    return;
                }
                
                e.stopPropagation();
                const contactInfo = chatHeaderInfo.closest('.contact-info');
                
                // Get the recipient ID from chat.js (current conversation)
                const recipientId = window.Chat?.getRecipientId();
                
                this.extractChatHeaderData(contactInfo, recipientId).then(contactData => {
                    this.openProfile(contactData);
                }).catch(error => {
                    console.error('Error extracting chat header data:', error);
                    // Fallback to sync version
                    const fallbackData = this.extractChatHeaderDataSync(contactInfo);
                    this.openProfile(fallbackData);
                });
            });
        }
    }

    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            let shouldReattach = false;
            
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const hasContactItems = node.querySelectorAll ? 
                            node.querySelectorAll('.contact-item, .chat-item').length > 0 : false;
                        
                        if (hasContactItems || node.matches?.('.contact-item, .chat-item')) {
                            shouldReattach = true;
                        }
                    }
                });
            });

            if (shouldReattach) {
                setTimeout(() => {
                    this.attachProfileClickHandlers();
                }, 100);
            }
        });

        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            observer.observe(appContainer, {
                childList: true,
                subtree: true
            });
        }
    }

    async extractContactData(contactItem) {
        const avatar = contactItem.querySelector('img')?.src || 'images/user-placeholder-40.svg';
        const name = contactItem.querySelector('.contact-name')?.textContent || 'Contacto';
        const userId = contactItem.dataset.userId;
        
        // Get real user data from API - REQUIRED
        let realUserData = null;
        let presenceData = null;
        
        if (userId && window.API && window.API.Users && window.API.Users.getUserProfile) {
            try {
                // Get both profile and presence data
                const [profileResponse, presenceResponse] = await Promise.all([
                    window.API.Users.getUserProfile(userId),
                    fetch(`/api/users/${userId}/presence`, {
                        headers: {
                            'Authorization': `Bearer ${Utils.Storage.get('authToken')}`
                        }
                    }).then(res => res.ok ? res.json() : null)
                ]);
                
                if (profileResponse.success) {
                    realUserData = profileResponse.data;
                    console.log('✅ Got real user data from API:', realUserData);
                }
                
                if (presenceResponse && presenceResponse.success) {
                    presenceData = presenceResponse.data;
                    console.log('✅ Got real presence data from API:', presenceData);
                    
                    // Override profile status with real-time presence data
                    realUserData.status = presenceData.status;
                    realUserData.lastSeen = presenceData.lastSeen;
                }
            } catch (error) {
                console.error('❌ Failed to fetch user profile/presence data:', error);
            }
        }

        // REQUIRE real data from API - no fallbacks to fake data
        if (!realUserData) {
            console.error('❌ No real user data available from API for userId:', userId);
            throw new Error('No se pudo obtener información real del usuario');
        }

        // Use ONLY real data from database
        const username = realUserData.username;
        const email = realUserData.email;
        const bio = realUserData.bio || 'Sin biografía disponible';
        const createdAt = realUserData.createdAt;
        const lastSeen = realUserData.lastSeen;
        const status = realUserData.status || 'offline';
        const statusMessage = realUserData.statusMessage || '';
        
        const statusIndicator = contactItem.querySelector('.status-indicator');
        const statusClass = statusIndicator ? [...statusIndicator.classList].find(c => ['online', 'offline', 'away', 'busy'].includes(c)) : 'offline';

        return {
            avatar: realUserData.avatar || avatar,
            fullName: realUserData.fullName,
            username: `@${username}`,
            email,
            bio,
            status,
            statusClass,
            lastSeen: Utils.formatLastSeenStyled(lastSeen),
            lastConnection: this.formatLastConnection(lastSeen, status, userId),
            statusMessage,
            memberSince: this.formatMemberSince(createdAt),
            userId,
            sharedFiles: [], // Will be populated from real API data
            createdAt,
            realUserData // Store complete user data for reference
        };
    }

    extractContactDataSync(contactItem) {
        const avatar = contactItem.querySelector('img')?.src || 'images/user-placeholder-40.svg';
        const name = contactItem.querySelector('.contact-name')?.textContent || 'Contacto';
        const username = contactItem.dataset.username || name.toLowerCase().replace(/\s+/g, '');
        const status = contactItem.querySelector('.contact-status')?.textContent || '';
        const email = contactItem.dataset.email || 'Email no disponible';
        const lastSeen = contactItem.querySelector('.last-seen')?.textContent || 'Hace un momento';
        const statusIndicator = contactItem.querySelector('.status-indicator');
        const statusClass = statusIndicator ? [...statusIndicator.classList].find(c => ['online', 'offline', 'away', 'busy'].includes(c)) : 'offline';
        const bio = contactItem.dataset.bio || 'Sin biografía disponible';
        const createdAt = contactItem.dataset.createdAt;

        return {
            avatar,
            fullName: name,
            username: `@${username}`,
            email,
            bio,
            status,
            statusClass,
            lastSeen: Utils.formatLastSeenStyled(lastSeen),
            lastConnection: this.formatLastConnection(lastSeen, status, contactItem.dataset.userId),
            statusMessage: status || 'Disponible',
            memberSince: this.formatMemberSince(createdAt),
            userId: contactItem.dataset.userId,
            sharedFiles: [],
            createdAt
        };
    }

    async extractChatData(chatItem) {
        const avatar = chatItem.querySelector('img')?.src || 'images/user-placeholder-40.svg';
        const name = chatItem.querySelector('.chat-name')?.textContent || 'Chat';
        const userId = chatItem.dataset.userId;
        
        // Get real user data from API - REQUIRED
        let realUserData = null;
        let presenceData = null;
        
        if (userId && window.API && window.API.Users && window.API.Users.getUserProfile) {
            try {
                // Get both profile and presence data
                const [profileResponse, presenceResponse] = await Promise.all([
                    window.API.Users.getUserProfile(userId),
                    fetch(`/api/users/${userId}/presence`, {
                        headers: {
                            'Authorization': `Bearer ${Utils.Storage.get('authToken')}`
                        }
                    }).then(res => res.ok ? res.json() : null)
                ]);
                
                if (profileResponse.success) {
                    realUserData = profileResponse.data;
                    console.log('✅ Got real chat user data from API:', realUserData);
                }
                
                if (presenceResponse && presenceResponse.success) {
                    presenceData = presenceResponse.data;
                    console.log('✅ Got real chat presence data from API:', presenceData);
                    
                    // Override profile status with real-time presence data
                    realUserData.status = presenceData.status;
                    realUserData.lastSeen = presenceData.lastSeen;
                }
            } catch (error) {
                console.error('❌ Failed to fetch chat user profile/presence data:', error);
            }
        }

        // REQUIRE real data from API
        if (!realUserData) {
            console.error('❌ No real chat user data available from API for userId:', userId);
            throw new Error('No se pudo obtener información real del usuario del chat');
        }

        // Use ONLY real data
        const username = realUserData.username;
        const email = realUserData.email; // Show exactly what API returns
        const bio = realUserData.bio || 'Sin biografía disponible';
        const createdAt = realUserData.createdAt;
        const lastSeen = realUserData.lastSeen;
        const status = realUserData.status || 'offline';
        const statusMessage = realUserData.statusMessage || '';

        return {
            avatar: realUserData.avatar || avatar,
            fullName: realUserData.fullName,
            username: `@${username}`,
            email,
            bio,
            status,
            statusClass: status === 'online' ? 'online' : 'offline',
            lastSeen: Utils.formatLastSeenStyled(lastSeen),
            lastConnection: this.formatLastConnection(lastSeen, status, userId),
            statusMessage,
            memberSince: this.formatMemberSince(createdAt),
            userId,
            sharedFiles: [],
            realUserData
        };
    }

    extractChatDataSync(chatItem) {
        const avatar = chatItem.querySelector('img')?.src || 'images/user-placeholder-40.svg';
        const name = chatItem.querySelector('.chat-name')?.textContent || 'Chat';
        const username = chatItem.dataset.username || name.toLowerCase().replace(/\s+/g, '');
        const lastMessage = chatItem.querySelector('.last-message')?.textContent || '';
        const email = chatItem.dataset.email || 'Email no disponible';

        return {
            avatar,
            fullName: name,
            username: `@${username}`,
            email,
            bio: chatItem.dataset.bio || 'Sin biografía disponible',
            status: 'En línea',
            statusClass: 'online',
            lastSeen: 'hace un momento',
            lastConnection: this.formatLastConnection(new Date(), 'online', chatItem.dataset.userId),
            statusMessage: lastMessage || 'Disponible',
            memberSince: this.formatMemberSince(chatItem.dataset.createdAt) || 'Enero 2024',
            userId: chatItem.dataset.userId,
            sharedFiles: []
        };
    }

    async extractChatHeaderData(contactInfo, recipientId = null) {
        const avatar = contactInfo.querySelector('img')?.src || 'images/user-placeholder-40.svg';
        const name = contactInfo.querySelector('.contact-name')?.textContent || 'Contacto';
        const userId = recipientId || contactInfo.dataset.userId || contactInfo.closest('[data-user-id]')?.dataset.userId;
        
        // Get real user data from API - REQUIRED
        let realUserData = null;
        let presenceData = null;
        
        if (userId && window.API && window.API.Users && window.API.Users.getUserProfile) {
            try {
                // Get both profile and presence data
                const [profileResponse, presenceResponse] = await Promise.all([
                    window.API.Users.getUserProfile(userId),
                    fetch(`/api/users/${userId}/presence`, {
                        headers: {
                            'Authorization': `Bearer ${Utils.Storage.get('authToken')}`
                        }
                    }).then(res => res.ok ? res.json() : null)
                ]);
                
                if (profileResponse.success) {
                    realUserData = profileResponse.data;
                    console.log('✅ Got real chat header user data from API:', realUserData);
                }
                
                if (presenceResponse && presenceResponse.success) {
                    presenceData = presenceResponse.data;
                    console.log('✅ Got real chat header presence data from API:', presenceData);
                    
                    // Override profile status with real-time presence data
                    realUserData.status = presenceData.status;
                    realUserData.lastSeen = presenceData.lastSeen;
                }
            } catch (error) {
                console.error('❌ Failed to fetch chat header user profile/presence data:', error);
            }
        }

        // REQUIRE real data from API
        if (!realUserData) {
            console.error('❌ No real chat header user data available from API for userId:', userId);
            throw new Error('No se pudo obtener información real del usuario del header del chat');
        }

        // Use ONLY real data
        const username = realUserData.username;
        const email = realUserData.email; // Show exactly what API returns
        const bio = realUserData.bio || 'Sin biografía disponible';
        const createdAt = realUserData.createdAt;
        const lastSeen = realUserData.lastSeen;
        const status = realUserData.status || 'offline';
        const statusMessage = realUserData.statusMessage || '';

        return {
            avatar: realUserData.avatar || avatar,
            fullName: realUserData.fullName,
            username: `@${username}`,
            email,
            bio,
            status,
            statusClass: status === 'online' ? 'online' : 'offline',
            lastSeen: Utils.formatLastSeenStyled(lastSeen),
            lastConnection: this.formatLastConnection(lastSeen, status, userId),
            statusMessage,
            memberSince: this.formatMemberSince(createdAt),
            userId,
            sharedFiles: [],
            realUserData
        };
    }

    extractChatHeaderDataSync(contactInfo) {
        const avatar = contactInfo.querySelector('img')?.src || 'images/user-placeholder-40.svg';
        const name = contactInfo.querySelector('.contact-name')?.textContent || 'Contacto';
        const lastSeen = contactInfo.querySelector('.last-seen')?.textContent || 'Hace un momento';
        const username = name.toLowerCase().replace(/\s+/g, '');

        const recipientId = contactInfo.dataset.userId || contactInfo.closest('[data-user-id]')?.dataset.userId;
        
        return {
            avatar,
            fullName: name,
            username: `@${username}`,
            email: 'Email no disponible',
            bio: 'Sin biografía disponible',
            status: 'En línea',
            statusClass: 'online',
            lastSeen: Utils.formatLastSeenStyled(lastSeen),
            lastConnection: this.formatLastConnection(lastSeen, 'online', recipientId),
            statusMessage: 'Disponible',
            memberSince: 'Enero 2024',
            sharedFiles: []
        };
    }

    openProfile(userData) {
        if (!this.modal || !userData) return;

        this.currentUserData = userData;
        
        // Set profile data
        if (this.profileImage) this.profileImage.src = userData.avatar;
        if (this.profileName) this.profileName.textContent = userData.fullName;
        if (this.profileUsername) this.profileUsername.textContent = userData.username;
        if (this.profileFullName) this.profileFullName.textContent = userData.fullName;
        if (this.profileUsernameDetail) this.profileUsernameDetail.textContent = userData.username;
        if (this.profileEmail) this.profileEmail.textContent = userData.email;
        if (this.profileBio) this.profileBio.textContent = userData.bio || 'Sin biografía disponible';
        if (this.profileStatusMessage) this.profileStatusMessage.textContent = userData.statusMessage;
        if (this.profileMemberSince) this.profileMemberSince.textContent = userData.memberSince;
        
        // Lógica mejorada y robusta: mostrar SOLO uno de los estados
        const isReallyOnline = this.isUserReallyOnline(userData.userId);
        const showOnlineNow = userData.lastConnection && userData.lastConnection.includes('En línea ahora');
        
        // CRÍTICO: mostrar SOLO un estado, nunca ambos
        if (showOnlineNow && isReallyOnline) {
            // Usuario está EN LÍNEA: mostrar ÚNICAMENTE "En línea"
            if (this.profileStatus) {
                this.profileStatus.textContent = 'En línea';
                this.profileStatus.style.color = '#25D366'; // Verde WhatsApp
                this.profileStatus.style.fontWeight = '600'; // Negrita
                this.profileStatus.style.display = 'inline'; // Asegurar que sea visible
            }
            
            // OCULTAR COMPLETAMENTE todos los campos de última conexión
            if (this.profileLastSeen) {
                this.profileLastSeen.style.display = 'none';
            }
            
            // Ocultar separador entre estado y última conexión
            const separator = document.querySelector('.status-separator');
            if (separator) {
                separator.style.display = 'none';
            }
            
            // Limpiar el campo de última conexión en la sección de detalles
            if (this.profileLastConnection) {
                this.profileLastConnection.textContent = 'En línea';
                this.profileLastConnection.style.color = '#25D366';
                this.profileLastConnection.style.fontWeight = '600';
            }
            
            console.log('Profile status: ONLINE (showing ONLY "En línea")');
            
        } else {
            // Usuario está DESCONECTADO: mostrar ÚNICAMENTE última conexión (sin "offline")
            
            // OCULTAR completamente el campo de estado (no queremos mostrar "offline")
            if (this.profileStatus) {
                this.profileStatus.style.display = 'none';
            }
            
            // OCULTAR separador ya que no hay estado que mostrar
            const separator = document.querySelector('.status-separator');
            if (separator) {
                separator.style.display = 'none';
            }
            
            // Mostrar SOLO la última conexión
            if (this.profileLastSeen) {
                const lastConnectionText = userData.lastConnection || userData.lastSeen || 'Hace un momento';
                this.profileLastSeen.textContent = lastConnectionText;
                this.profileLastSeen.style.display = 'inline';
                this.profileLastSeen.style.color = '#64748b';
                this.profileLastSeen.style.fontWeight = '400';
            }
            
            // También actualizar el campo en la sección de detalles
            if (this.profileLastConnection) {
                const lastConnectionText = userData.lastConnection || userData.lastSeen || 'Hace un momento';
                this.profileLastConnection.textContent = lastConnectionText;
                this.profileLastConnection.style.color = '#64748b';
                this.profileLastConnection.style.fontWeight = '400';
            }
            
            console.log('Profile status: DISCONNECTED (showing ONLY last connection time)');
        }

        // Set status indicator with consistent 10-minute logic
        if (this.profileStatusIndicator) {
            const actualStatusClass = (showOnlineNow && isReallyOnline) ? 'online' : 'offline';
            this.profileStatusIndicator.className = `status-indicator ${actualStatusClass}`;
        }

        // Populate shared files from real data
        this.populateSharedFiles(userData.sharedFiles);

        // Show modal
        this.modal.classList.remove('hidden');
        setTimeout(() => {
            this.modal.classList.add('show');
        }, 10);

        document.body.style.overflow = 'hidden';
        console.log('Full profile modal opened for:', userData.fullName);
    }

    closeModal() {
        if (!this.modal) return;

        this.modal.classList.remove('show');
        setTimeout(() => {
            this.modal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);

        console.log('Full profile modal closed');
    }

    isModalOpen() {
        return this.modal && !this.modal.classList.contains('hidden');
    }

    getStatusText() {
        return this.currentUserData?.status || 'En línea';
    }

    // Action handlers
    handleSendMessage() {
        console.log('Send message to:', this.currentUserData?.fullName);
        this.closeModal();
        
        // Switch to chats tab and start conversation
        const chatsTab = document.querySelector('[data-tab="chats"]');
        if (chatsTab) {
            chatsTab.click();
        }
        
        // Start chat using the existing chat manager
        const chatManager = window.chatManager || window.Chat;
        if (chatManager && typeof chatManager.startChatWithUser === 'function') {
            chatManager.startChatWithUser(this.currentUserData?.userId);
        } else {
            console.error('Chat manager not available or startChatWithUser method missing');
            Utils.Notifications.error('Error al iniciar el chat. Intenta de nuevo.');
        }
    }

    handleVoiceCall() {
        console.log('Voice call to:', this.currentUserData?.fullName);
        // TODO: Implement voice call functionality
    }

    handleVideoCall() {
        console.log('Video call to:', this.currentUserData?.fullName);
        // TODO: Implement video call functionality
    }

    async handleBlockUser() {
        if (!this.currentUserData) return;
        
        const confirmed = await Utils.ConfirmationModal.block(this.currentUserData.fullName);
        if (confirmed) {
            try {
                // Show loading state
                if (this.blockUserBtn) {
                    this.blockUserBtn.disabled = true;
                    this.blockUserBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Bloqueando...</span>';
                }

                // Call API to block user (will also unfriend automatically)
                const response = await fetch('/api/contacts/block', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${Utils.Storage.get('authToken')}`
                    },
                    body: JSON.stringify({
                        userId: this.currentUserData.userId
                    })
                });

                if (response.ok) {
                    // Show success notification
                    this.showNotification(`${this.currentUserData.fullName} ha sido bloqueado y eliminado de tus contactos`, 'success');
                    
                    // Remove from contacts list in UI
                    this.removeContactFromUI(this.currentUserData.userId);
                    
                    // Add to blocked contacts manager if available
                    if (window.blockedContactsManager && typeof window.blockedContactsManager.addBlockedContact === 'function') {
                        window.blockedContactsManager.addBlockedContact(this.currentUserData);
                    }
                    
                    // Close modal
                    this.closeModal();
                } else {
                    const error = await response.json();
                    throw new Error(error.message || 'Error al bloquear usuario');
                }
            } catch (error) {
                console.error('Error blocking user:', error);
                this.showNotification(`Error al bloquear usuario: ${error.message}`, 'error');
            } finally {
                // Reset button state
                if (this.blockUserBtn) {
                    this.blockUserBtn.disabled = false;
                    this.blockUserBtn.innerHTML = '<i class="fas fa-ban"></i><span>Bloquear</span>';
                }
            }
        }
    }

    async handleRemoveContact() {
        if (!this.currentUserData) return;
        
        const confirmed = await Utils.ConfirmationModal.remove(this.currentUserData.fullName);
        if (confirmed) {
            try {
                // Show loading state
                if (this.removeContactBtn) {
                    this.removeContactBtn.disabled = true;
                    this.removeContactBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Eliminando...</span>';
                }

                // Call API to remove contact
                const response = await fetch('/api/contacts/remove', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${Utils.Storage.get('authToken')}`
                    },
                    body: JSON.stringify({
                        userId: this.currentUserData.userId
                    })
                });

                if (response.ok) {
                    // Show success notification
                    this.showNotification(`${this.currentUserData.fullName} ha sido eliminado de tus contactos`, 'success');
                    
                    // Remove from contacts list in UI
                    this.removeContactFromUI(this.currentUserData.userId);
                    
                    // Close modal
                    this.closeModal();
                } else {
                    const error = await response.json();
                    throw new Error(error.message || 'Error al eliminar contacto');
                }
            } catch (error) {
                console.error('Error removing contact:', error);
                this.showNotification(`Error al eliminar contacto: ${error.message}`, 'error');
            } finally {
                // Reset button state
                if (this.removeContactBtn) {
                    this.removeContactBtn.disabled = false;
                    this.removeContactBtn.innerHTML = '<i class="fas fa-user-minus"></i><span>Eliminar contacto</span>';
                }
            }
        }
    }

    // Utility methods

    formatLastConnection(lastSeenDate, status, userId) {
        if (!lastSeenDate) return 'Desconocido';
        
        try {
            // Check if user is really online using the same logic as chat.js
            const isReallyOnline = this.isUserReallyOnline(userId);
            
            const now = new Date();
            const lastSeen = new Date(lastSeenDate);
            const diff = now - lastSeen;
            const minutes = Math.floor(diff / 60000);
            
            // Apply 10-minute buffer: show "En línea ahora" only if truly active
            if ((status === 'online' && isReallyOnline) || minutes < 10) {
                return 'En línea ahora';
            }
            
            // Otherwise show last seen time
            const formatted = Utils.formatLastSeenStyled(lastSeenDate);
            return formatted.startsWith('últ.') ? formatted : `últ. vez ${formatted}`;
        } catch (error) {
            console.error('Error formatting last connection:', error);
            return Utils.formatLastSeenStyled(lastSeenDate) || 'Desconocido';
        }
    }

    // Check if user is really online (same logic as chat.js)
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
                
                // Consider online if activity within last 10 minutes
                return minutesSinceActivity < 10;
            }
        }
        
        return false;
    }

    formatMemberSince(createdAt) {
        if (!createdAt) {
            return 'Fecha no disponible'; // Default fallback
        }
        
        try {
            const date = new Date(createdAt);
            
            // Check if date is valid
            if (isNaN(date.getTime())) {
                return 'Fecha no disponible';
            }
            
            // Format complete date with day, month, year and time
            const dateOptions = { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric'
            };
            
            const timeOptions = {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            };
            
            const formattedDate = date.toLocaleDateString('es-ES', dateOptions);
            const formattedTime = date.toLocaleTimeString('es-ES', timeOptions);
            
            return `${formattedDate} a las ${formattedTime}`;
        } catch (error) {
            console.error('Error formatting member since date:', error);
            return 'Fecha no disponible';
        }
    }

    async fetchSharedFiles(userId) {
        // TODO: Replace with real API call
        // Example: const response = await fetch(`/api/users/${userId}/shared-files`);
        // return response.json();
        
        // For now, return empty array - will be populated when API is available
        return [];
    }

    populateSharedFiles(fileItems) {
        if (!this.sharedFilesList) {
            return;
        }

        // Clear existing content
        this.sharedFilesList.innerHTML = '';

        // If no files or empty array, show placeholder
        if (!fileItems || fileItems.length === 0) {
            this.sharedFilesList.innerHTML = `
                <div class="file-placeholder">
                    <i class="fas fa-folder-open"></i>
                    <span>No hay archivos compartidos</span>
                </div>
            `;
            return;
        }

        // Show only first 5 items
        const displayItems = fileItems.slice(0, 5);
        
        displayItems.forEach(item => {
            const fileElement = document.createElement('div');
            fileElement.className = 'file-item';
            fileElement.addEventListener('click', () => this.handleFileClick(item));

            const fileIcon = this.getFileIcon(item.name, item.mimeType);
            const fileType = this.getFileType(item.name, item.mimeType);

            fileElement.innerHTML = `
                <div class="file-icon ${fileType}">
                    <i class="${fileIcon}"></i>
                </div>
                <div class="file-info">
                    <div class="file-name">${item.name || 'Archivo sin nombre'}</div>
                    <div class="file-details">${this.formatFileDate(item.uploadedAt || item.timestamp)}</div>
                </div>
                <div class="file-size">${this.formatFileSize(item.size)}</div>
            `;

            this.sharedFilesList.appendChild(fileElement);
        });
    }

    formatFileDate(timestamp) {
        if (!timestamp) return 'Fecha desconocida';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            return 'Hoy';
        } else if (days === 1) {
            return 'Ayer';
        } else if (days < 7) {
            return `Hace ${days} días`;
        } else {
            return date.toLocaleDateString('es-ES');
        }
    }

    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    getFileIcon(fileName, mimeType) {
        const extension = fileName ? fileName.split('.').pop().toLowerCase() : '';
        const mime = mimeType ? mimeType.toLowerCase() : '';
        
        // PDF files
        if (extension === 'pdf' || mime.includes('pdf')) {
            return 'fas fa-file-pdf';
        }
        
        // Word documents
        if (['doc', 'docx'].includes(extension) || mime.includes('word')) {
            return 'fas fa-file-word';
        }
        
        // PowerPoint
        if (['ppt', 'pptx'].includes(extension) || mime.includes('presentation')) {
            return 'fas fa-file-powerpoint';
        }
        
        // Excel
        if (['xls', 'xlsx'].includes(extension) || mime.includes('sheet')) {
            return 'fas fa-file-excel';
        }
        
        // Images
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension) || mime.includes('image')) {
            return 'fas fa-file-image';
        }
        
        // Videos
        if (['mp4', 'avi', 'mkv', 'mov', 'wmv'].includes(extension) || mime.includes('video')) {
            return 'fas fa-file-video';
        }
        
        // Audio
        if (['mp3', 'wav', 'flac', 'ogg'].includes(extension) || mime.includes('audio')) {
            return 'fas fa-file-audio';
        }
        
        // Archives
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension) || mime.includes('archive') || mime.includes('compressed')) {
            return 'fas fa-file-archive';
        }
        
        // Code files
        if (['js', 'html', 'css', 'php', 'py', 'java', 'cpp', 'c'].includes(extension)) {
            return 'fas fa-file-code';
        }
        
        // Default
        return 'fas fa-file';
    }

    getFileType(fileName, mimeType) {
        const extension = fileName ? fileName.split('.').pop().toLowerCase() : '';
        const mime = mimeType ? mimeType.toLowerCase() : '';
        
        if (extension === 'pdf' || mime.includes('pdf')) return 'pdf';
        if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(extension) || mime.includes('word') || mime.includes('presentation') || mime.includes('sheet')) return 'doc';
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension) || mime.includes('image')) return 'image';
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension) || mime.includes('archive') || mime.includes('compressed')) return 'zip';
        
        return 'default';
    }

    handleFileClick(fileItem) {
        console.log('Download/view file:', fileItem);
        // TODO: Implement file download/preview
        // Example: window.open(fileItem.downloadUrl, '_blank');
    }

    handleViewAllFiles() {
        console.log('View all shared files for:', this.currentUserData?.fullName);
        // TODO: Open files browser modal or new page
        // Example: window.location.href = `/files/${this.currentUserData?.userId}`;
    }

    // Utility methods for contact management
    removeContactFromUI(userId) {
        if (!userId) return;
        
        // Remove from contacts list
        const contactItem = document.querySelector(`.contact-item[data-user-id="${userId}"]`);
        if (contactItem) {
            contactItem.remove();
        }
        
        // Remove from chat list if exists
        const chatItem = document.querySelector(`.chat-item[data-user-id="${userId}"]`);
        if (chatItem) {
            chatItem.remove();
        }
        
        // Update empty state if no contacts remain
        this.updateEmptyStates();
    }
    
    updateEmptyStates() {
        const contactsList = document.getElementById('contacts-list');
        const chatsList = document.getElementById('chat-list');
        
        // Check contacts list
        if (contactsList && contactsList.children.length === 0) {
            contactsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>No tienes contactos aún</p>
                </div>
            `;
        }
        
        // Check chats list
        if (chatsList && chatsList.children.length === 0) {
            chatsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <p>No hay conversaciones recientes</p>
                </div>
            `;
        }
    }
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container') || 
                         this.createNotificationContainer();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = this.getNotificationIcon(type);
        
        notification.innerHTML = `
            <div class="notification-content">
                <i class="${icon}"></i>
                <span class="notification-message">${message}</span>
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Close button functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.hideNotification(notification);
        });
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideNotification(notification);
        }, 5000);
        
        container.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
    }
    
    createNotificationContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        return container;
    }
    
    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'fas fa-check-circle';
            case 'error': return 'fas fa-exclamation-circle';
            case 'warning': return 'fas fa-exclamation-triangle';
            default: return 'fas fa-info-circle';
        }
    }
    
    hideNotification(notification) {
        if (!notification) return;
        
        notification.classList.remove('show');
        notification.classList.add('hide');
        
        setTimeout(() => {
            notification.remove();
        }, 300);
    }

    // Public method to show profile (for external use)
    showProfile(userData) {
        this.openProfile(userData);
    }
}

// Initialize the profile viewer
let profileViewer;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        profileViewer = new ProfileViewer();
    });
} else {
    profileViewer = new ProfileViewer();
}

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfileViewer;
} else {
    window.ProfileViewer = ProfileViewer;
    window.profileViewer = profileViewer;
}