class ContactsManager {
    constructor() {
        this.selectedUser = null;
        this.searchTimeout = null;
        this.searchCache = new Map();
        this.searchHistory = [];
        this.maxCacheSize = 50;
        this.maxHistorySize = 20;
        this.sentRequests = new Set(); // Track sent requests in current session
        this.contacts = new Map(); // Initialize contacts Map
        this.realTimeUpdateInterval = null; // For cleanup
        this.contactsCache = null; // Cache for contacts data
        this.contactsCacheTimestamp = null; // Cache timestamp
        this.CACHE_DURATION = 30000; // 30 seconds cache
        this.isLoadingContacts = false; // Prevent duplicate loading
        
        this.init();
    }

    init() {
        this.bindEvents();
        
        // Only load data if user is authenticated
        if (window.API && window.API.Auth.isAuthenticated()) {
            console.log('User authenticated, loading contacts with new style...');
            this.loadContacts();
            this.loadContactRequests();
        }
    }

    bindEvents() {
        // Add contact button
        const addContactBtn = document.getElementById('add-contact-btn');
        if (addContactBtn) {
            addContactBtn.addEventListener('click', () => this.showAddContactModal());
        }

        // Modal events
        this.bindModalEvents();
        
        // Search input events
        this.bindSearchEvents();

        // Socket events for real-time updates
        this.bindSocketEvents();

        // Global event listeners for data-attributes
        this.bindGlobalEvents();
    }

    bindModalEvents() {
        // Close modal buttons
        document.querySelectorAll('[data-close-modal], .close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModals();
            });
        });

        // Modal overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', () => this.closeModals());
        });

        // Send request button removed - now handled directly by individual buttons

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModals();
            }
        });
    }

    bindSearchEvents() {
        const searchInput = document.getElementById('contact-search');
        if (searchInput) {
            // Simple search without preloading
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                
                // Clear previous timeout
                if (this.searchTimeout) {
                    clearTimeout(this.searchTimeout);
                }

                // Set new timeout for search (debounce)
                this.searchTimeout = setTimeout(() => {
                    this.searchUsers(query);
                }, 200);
            });

            // Show suggestions on focus
            searchInput.addEventListener('focus', (e) => {
                this.showSearchSuggestions();
            });

            // Keyboard navigation
            searchInput.addEventListener('keydown', (e) => {
                this.handleKeyboardNavigation(e);
            });

            // Blur event to hide suggestions
            searchInput.addEventListener('blur', (e) => {
                // Delay hiding to allow click events
                setTimeout(() => {
                    if (!document.querySelector('.search-results:hover')) {
                        this.clearSearchResults();
                    }
                }, 150);
            });
        }
    }

    bindSocketEvents() {
        if (window.socket) {
            // Listen for contact request notifications
            window.socket.on('contactRequest', (data) => {
                this.handleIncomingContactRequest(data);
            });

            // Listen for contact request responses
            window.socket.on('contactRequestResponse', (data) => {
                this.handleContactRequestResponse(data);
            });

            // Listen for new contact added
            window.socket.on('contactAdded', (data) => {
                this.handleContactAdded(data);
            });

            // Listen for contact status changes (presence updates)
            window.socket.on('contact-status-changed', (data) => {
                this.handleContactStatusUpdate(data);
            });
        }
    }

    // Handle real-time contact status updates
    handleContactStatusUpdate(data) {
        console.log('Contact status update received:', data);
        
        const { userId, status, lastSeen } = data;
        
        // Update contact in memory
        const contact = this.contacts.get(userId);
        if (contact) {
            contact.status = status;
            contact.lastSeen = lastSeen;
            console.log(`Updated contact ${userId} status to ${status}`);
        }
        
        // Update UI immediately
        this.updateContactItemStatus(userId, status, lastSeen);
    }

    // Update specific contact item status in the UI
    updateContactItemStatus(userId, status, lastSeen) {
        const contactItem = document.querySelector(`.contact-item[data-user-id="${userId}"]`);
        if (!contactItem) return;
        
        // Apply 2-minute buffer logic (improved from 5 minutes)
        const isReallyOnline = this.isUserReallyOnline(userId);
        const showOnline = status === 'online' && isReallyOnline;
        
        // Update status indicator
        const statusIndicator = contactItem.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${showOnline ? 'online' : 'offline'}`;
        }
        
        // Update last seen text
        const contactStatus = contactItem.querySelector('.contact-status');
        if (contactStatus) {
            if (showOnline) {
                contactStatus.textContent = 'En línea';
                contactStatus.className = 'contact-status online';
            } else {
                const formattedLastSeen = Utils.formatLastSeenStyled ? 
                    Utils.formatLastSeenStyled(lastSeen) : 
                    'Desconectado';
                contactStatus.textContent = formattedLastSeen;
                contactStatus.className = 'contact-status offline';
            }
        }
        
        console.log(`Contact item ${userId} updated - ${showOnline ? 'En línea' : 'Offline'}`);
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
                
                // Consider online if activity within last 2 minutes (improved from 10)
                return minutesSinceActivity < 2;
            }
        }
        
        return false;
    }

    bindGlobalEvents() {
        // Use event delegation for dynamically created elements
        document.addEventListener('click', (e) => {
            // Clear user button
            if (e.target.closest('[data-clear-user]')) {
                e.preventDefault();
                this.clearSelectedUser();
            }

            // Retry search button
            if (e.target.closest('[data-retry-search]')) {
                e.preventDefault();
                this.clearSearchResults();
                const searchInput = document.getElementById('contact-search');
                if (searchInput) searchInput.focus();
            }

            // Note: Current user profile click is now handled by profilePhoto.js
        });
    }

    showAddContactModal() {
        const modal = document.getElementById('add-contact-modal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.classList.add('modal-open');
            
            // Focus search input
            const searchInput = document.getElementById('contact-search');
            if (searchInput) {
                searchInput.focus();
            }
        }
    }

    closeModals() {
        // Close standard modals
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
        
        // Close dynamic context menus (contact profile menus)
        document.querySelectorAll('.contact-profile-modal').forEach(menu => {
            menu.remove();
        });
        
        document.body.classList.remove('modal-open');
        
        // Reset form
        this.resetAddContactForm();
    }

    resetAddContactForm() {
        const searchInput = document.getElementById('contact-search');
        const messageInput = document.getElementById('contact-message');
        const sendBtn = document.getElementById('send-contact-request');

        if (searchInput) searchInput.value = '';
        if (messageInput) messageInput.value = 'Hola, me gustaría agregarte a mis contactos...';
        if (sendBtn) sendBtn.disabled = true;

        this.selectedUser = null;
        this.clearSearchResults();
    }

    async searchUsers(query) {
        const resultsContainer = document.getElementById('contact-search-results');
        
        if (!query) {
            console.log('Empty query, clearing results');
            this.clearSearchResults();
            return;
        }
        
        if (query.length < 3) {
            console.log('Query too short, showing minimum message');
            this.showMinimumCharsMessage(query.length);
            return;
        }

        // Check cache first
        if (this.searchCache.has(query)) {
            console.log('Using cached results for:', query);
            this.displayCachedResults(query);
            return;
        }

        try {
            console.log('Starting search for:', query);
            
            // Show loading
            this.showSearchLoading();
            
            // Use API client for contacts search which includes relationship status
            const searchResults = await API.Contacts.searchUsers(query, 15);
            console.log('Search response:', searchResults);

            if (searchResults.success) {
                console.log('Search successful, showing results');
                
                // Cache the results
                this.cacheSearchResults(query, searchResults.data);
                
                // Add to search history
                this.addToSearchHistory(query);
                
                this.displaySearchResults(searchResults.data, searchResults.message);
            } else {
                console.error('Search failed:', searchResults.message);
                this.showSearchError(searchResults.message || 'Error al buscar usuarios');
            }

        } catch (error) {
            console.error('Search error:', error);
            
            // Handle specific error types
            if (error instanceof API.ApiError && error.status === 401) {
                this.showSearchError('Error de autenticación. Por favor inicia sesión nuevamente.');
                return;
            }
            
            this.showSearchError('Error de conexión');
        }
    }

    showSearchLoading() {
        const resultsContainer = document.getElementById('contact-search-results');
        if (resultsContainer) {
            console.log('Showing search preloader');
            resultsContainer.innerHTML = `
                <div class="search-loading">
                    <div class="loading-spinner">
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                    </div>
                    <div class="loading-text">
                        <span>Buscando usuarios...</span>
                        <small>Esto puede tomar unos segundos</small>
                    </div>
                </div>
            `;
            resultsContainer.classList.add('visible');
        } else {
            console.error('Search results container not found');
        }
    }

    showMinimumCharsMessage(currentLength) {
        const resultsContainer = document.getElementById('contact-search-results');
        if (resultsContainer) {
            const remaining = 3 - currentLength; // Changed to 3 to match backend requirement
            resultsContainer.innerHTML = `
                <div class="search-info" style="padding: 32px 16px; text-align: center; color: #64748b;">
                    <div class="info-icon" style="font-size: 32px; margin-bottom: 16px; opacity: 0.5;">
                        <i class="fas fa-keyboard"></i>
                    </div>
                    <div class="info-content">
                        <h4 style="color: #0f172a; margin-bottom: 8px; font-size: 16px;">Continúa escribiendo...</h4>
                        <p style="margin-bottom: 8px;">Ingresa al menos <strong>3 caracteres</strong> para buscar usuarios</p>
                        <small style="color: #4f46e5; font-weight: 500;">Faltan <strong>${remaining}</strong> caractere${remaining > 1 ? 's' : ''}</small>
                    </div>
                </div>
            `;
            resultsContainer.classList.add('visible');
            resultsContainer.style.cssText = `
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                max-height: 300px !important;
                overflow-y: auto !important;
                margin-top: 1rem !important;
                background: white !important;
                border: 1px solid #e2e8f0 !important;
                border-radius: 8px !important;
                position: relative !important;
                z-index: 1000 !important;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
            `;
        }
    }

    displaySearchResults(users, message = '') {
        const resultsContainer = document.getElementById('contact-search-results');
        
        if (!resultsContainer) {
            console.error('Search results container not found');
            return;
        }
        
        console.log('Displaying search results for', users.length, 'users');
        
        if (!users.length) {
            resultsContainer.innerHTML = `
                <div class="search-empty" style="padding: 32px 16px; text-align: center; color: #64748b;">
                    <div class="empty-icon" style="font-size: 32px; margin-bottom: 16px; opacity: 0.5;">
                        <i class="fas fa-search-minus"></i>
                    </div>
                    <div class="empty-content">
                        <h4 style="color: #0f172a; margin-bottom: 8px; font-size: 16px;">Sin coincidencias</h4>
                        <p style="margin-bottom: 12px;">No se encontraron usuarios que coincidan con tu búsqueda</p>
                        <small style="display: block; margin-bottom: 12px;">Intenta buscar por:</small>
                        <ul class="search-tips" style="list-style: none; padding: 0; margin: 0; text-align: left; max-width: 200px; margin: 0 auto;">
                            <li style="padding: 2px 0; font-size: 12px; color: #94a3b8;">• Nombre completo</li>
                            <li style="padding: 2px 0; font-size: 12px; color: #94a3b8;">• Nombre de usuario</li>
                            <li style="padding: 2px 0; font-size: 12px; color: #94a3b8;">• Correo electrónico</li>
                        </ul>
                    </div>
                </div>
            `;
            resultsContainer.classList.add('visible');
            resultsContainer.style.cssText = `
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                max-height: 300px !important;
                overflow-y: auto !important;
                margin-top: 1rem !important;
                background: white !important;
                border: 1px solid #e2e8f0 !important;
                border-radius: 8px !important;
                position: relative !important;
                z-index: 1000 !important;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
            `;
            return;
        }

        const resultsHTML = `
            <div class="search-results-header" style="padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; border-radius: 8px 8px 0 0;">
                <h4 style="margin: 0; color: #0f172a; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-users" style="color: #4f46e5;"></i> 
                    Usuarios encontrados (${users.length})
                </h4>
            </div>
            <div class="search-results-list" style="padding: 0;">
                ${users.map(user => {
                    // Determine button and status based on relationship
                    let actionButton = '';
                    let relationshipBadge = '';
                    let clickable = true;

                    switch (user.relationshipStatus) {
                        case 'contact':
                            actionButton = `
                                <button class="contact-status-btn contact" disabled
                                        style="padding: 8px 12px; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: not-allowed; 
                                               background: #10b981; color: white; display: flex; align-items: center; gap: 4px; min-width: 80px; justify-content: center;">
                                    <i class="fas fa-check-circle"></i>
                                    <span>Contacto</span>
                                </button>
                            `;
                            relationshipBadge = '<span style="display: inline-block; font-size: 11px; font-weight: 500; padding: 2px 6px; border-radius: 4px; background: #22c55e; color: white;">Ya es tu contacto</span>';
                            clickable = false;
                            break;
                        case 'sent':
                            actionButton = `
                                <button class="contact-status-btn sent" disabled
                                        style="padding: 8px 12px; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: not-allowed; 
                                               background: #f59e0b; color: white; display: flex; align-items: center; gap: 4px; min-width: 80px; justify-content: center;">
                                    <i class="fas fa-clock"></i>
                                    <span>Enviado</span>
                                </button>
                            `;
                            relationshipBadge = '<span style="display: inline-block; font-size: 11px; font-weight: 500; padding: 2px 6px; border-radius: 4px; background: #f59e0b; color: white;">Solicitud enviada</span>';
                            clickable = false;
                            break;
                        case 'received':
                            actionButton = `
                                <button class="contact-status-btn received" data-handle-pending="${user._id}"
                                        style="padding: 8px 12px; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; 
                                               background: #4f46e5; color: white; display: flex; align-items: center; gap: 4px; min-width: 80px; justify-content: center;
                                               transition: all 0.2s ease;">
                                    <i class="fas fa-reply"></i>
                                    <span>Responder</span>
                                </button>
                            `;
                            relationshipBadge = '<span style="display: inline-block; font-size: 11px; font-weight: 500; padding: 2px 6px; border-radius: 4px; background: #4f46e5; color: white;">Te envió solicitud</span>';
                            clickable = true;
                            break;
                        default:
                            // Only allow sending request if no existing relationship
                            actionButton = `
                                <button class="add-contact-btn" data-user-id="${user._id}"
                                        style="padding: 8px 12px; border: none; border-radius: 6px; font-size: 11px; font-weight: 500; cursor: pointer; 
                                               background: #4f46e5; color: white; display: flex; align-items: center; gap: 4px; min-width: 100px; justify-content: center;
                                               transition: all 0.2s ease;">
                                    <i class="fas fa-paper-plane"></i>
                                    <span>Enviar solicitud</span>
                                </button>
                            `;
                            clickable = true;
                    }

                    return `
                        <div class="search-result-item ${clickable ? 'clickable' : 'non-clickable'}" data-user-id="${user._id}" 
                             style="display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; transition: all 0.2s ease; ${clickable ? 'cursor: pointer;' : 'cursor: default; opacity: 0.7;'}">
                            <div class="user-avatar" style="position: relative; margin-right: 12px; flex-shrink: 0;">
                                <img src="${user.avatar || '/images/user-placeholder-40.svg'}" alt="${user.fullName}" 
                                     style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid #e2e8f0; object-fit: cover;"
                                     onerror="this.src='/images/user-placeholder-40.svg'">
                                <div class="status-indicator ${user.status || 'offline'}" 
                                     style="position: absolute; bottom: -2px; right: -2px; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; background: ${user.status === 'online' ? '#10b981' : '#6b7280'};"></div>
                            </div>
                            <div class="user-info" style="flex: 1; min-width: 0;">
                                <div class="user-name" style="font-weight: 600; font-size: 14px; color: #0f172a; margin-bottom: 4px; word-wrap: break-word;">
                                    ${Utils.escapeHtml(user.fullName || user.username)}
                                </div>
                                <div class="user-details" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                    <span class="username" style="font-size: 12px; color: #64748b; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">
                                        @${Utils.escapeHtml(user.username)}
                                    </span>
                                    ${user.status === 'online' ? 
                                        '<span class="status online status-text" style="font-size: 12px; font-weight: 500; color: #10b981 !important;">En línea</span>' : 
                                        `<span class="last-seen status-text offline" style="font-size: 12px; color: #94a3b8;">${Utils.formatLastSeenStyled(user.lastSeen)}</span>`
                                    }
                                </div>
                                ${relationshipBadge ? `<div style="margin-top: 4px;">${relationshipBadge}</div>` : ''}
                            </div>
                            <div class="user-actions" style="flex-shrink: 0; margin-left: 12px;">
                                ${actionButton}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        resultsContainer.innerHTML = resultsHTML;

        // Bind events for adding contacts directly
        const addContactButtons = resultsContainer.querySelectorAll('.add-contact-btn');
        console.log(`Found ${addContactButtons.length} add-contact buttons to bind events`);
        
        addContactButtons.forEach((btn, index) => {
            console.log(`Binding event to button ${index}:`, btn);
            
            btn.addEventListener('click', async (e) => {
                console.log('=== BUTTON CLICK EVENT ===');
                console.log('Button clicked:', btn);
                console.log('Event:', e);
                
                e.preventDefault();
                e.stopPropagation();
                
                const userId = btn.dataset.userId;
                console.log('User ID from button:', userId);
                
                const user = users.find(u => u._id === userId);
                console.log('Found user:', user);
                
                if (user && user.relationshipStatus === 'none') {
                    console.log('Calling sendDirectContactRequest...');
                    await this.sendDirectContactRequest(user, btn);
                } else {
                    console.log('User not valid for request:', {
                        user: !!user,
                        relationship: user?.relationshipStatus
                    });
                }
            });
        });
        
        // Bind click events for user selection (backup method)
        resultsContainer.querySelectorAll('.search-result-item.clickable').forEach(item => {
            item.addEventListener('click', (e) => {
                // Only if the click wasn't on a button
                if (!e.target.closest('button')) {
                    e.preventDefault();
                    const userId = item.dataset.userId;
                    const user = users.find(u => u._id === userId);
                    if (user && user.relationshipStatus === 'none') {
                        this.selectUser(user);
                    }
                }
            });
        });

        // Bind events for pending request buttons
        resultsContainer.querySelectorAll('[data-handle-pending]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const userId = btn.dataset.handlePending;
                this.handlePendingRequest(userId);
            });
        });

        // Force visibility with robust styling
        resultsContainer.classList.add('visible');
        resultsContainer.style.cssText = `
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            max-height: 300px !important;
            overflow-y: auto !important;
            margin-top: 1rem !important;
            background: white !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px !important;
            position: relative !important;
            z-index: 1000 !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
        `;
        
        console.log('Search results displayed successfully');
        console.log('Results container:', resultsContainer);
        console.log('Results HTML:', resultsContainer.innerHTML);
    }

    selectUser(user) {
        this.selectedUser = user;
        
        // Update search input
        const searchInput = document.getElementById('contact-search');
        if (searchInput) {
            searchInput.value = `${user.fullName} (@${user.username})`;
        }

        // Send button removed - functionality now handled by individual buttons

        // Hide search results
        this.clearSearchResults();

        // Show selected user info
        this.showSelectedUserInfo(user);
    }

    showSelectedUserInfo(user) {
        const resultsContainer = document.getElementById('contact-search-results');
        resultsContainer.innerHTML = `
            <div class="selected-user-info">
                <div class="user-avatar">
                    <img src="${user.avatar || '/images/user-placeholder-40.svg'}" alt="${user.fullName}">
                    <div class="status-indicator ${user.status}"></div>
                </div>
                <div class="user-info">
                    <div class="user-name">${user.fullName}</div>
                    <div class="username">@${user.username}</div>
                </div>
                <button class="change-user-btn" data-clear-user="true">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        resultsContainer.classList.add('visible');
    }
    
    async sendDirectContactRequest(user, button) {
        try {
            console.log('=== CONTACT REQUEST DEBUG ===');
            console.log('User object:', user);
            console.log('Button element:', button);
            console.log('API object:', window.API);
            console.log('Contacts API:', window.API?.Contacts);
            
            // Disable button and show loading
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Enviando...</span>';
            
            // Use default message always
            const message = 'Hola, me gustaría agregarte a mis contactos.';
            
            console.log('Sending direct contact request to:', user.username, 'with ID:', user._id);
            console.log('Message:', message);
            
            
            const result = await window.API.Contacts.sendContactRequest(user._id, message);
            console.log('API Response:', result);
            
            if (result.success) {
                // Update button to show sent state immediately for better UX
                button.className = 'contact-status-btn sent';
                button.innerHTML = '<i class="fas fa-check"></i> <span>Enviado</span>';
                button.style.background = '#f59e0b';
                button.style.cursor = 'not-allowed';
                button.disabled = true;
                
                // Also update the user object in the local array to prevent re-renders
                user.relationshipStatus = 'sent';
                
                // Show success notification
                Utils.Notifications.success(`Solicitud enviada a ${user.fullName}`);
                
                // Refresh contact requests to show the new request
                this.loadContactRequests();
                
                // Clear search cache to ensure fresh data with updated relationship status
                this.searchCache.clear();
                
                // Refresh search results to show updated status
                setTimeout(() => {
                    this.refreshCurrentSearch();
                }, 1000);
                
            } else {
                throw new Error(result.message || 'Error al enviar solicitud');
            }
            
        } catch (error) {
            console.error('=== ERROR SENDING CONTACT REQUEST ===');
            console.error('Error details:', error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            
            // Reset button
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-paper-plane"></i> <span>Enviar solicitud</span>';
            
            // Show error message
            const errorMsg = error.message || 'Error al enviar la solicitud';
            Utils.Notifications.error(`Error: ${errorMsg}`);
        }
    }

    clearSelectedUser() {
        this.selectedUser = null;
        
        const searchInput = document.getElementById('contact-search');
        const sendBtn = document.getElementById('send-contact-request');
        
        if (searchInput) searchInput.value = '';
        if (sendBtn) sendBtn.disabled = true;
        
        this.clearSearchResults();
        searchInput.focus();
    }

    clearSearchResults() {
        const resultsContainer = document.getElementById('contact-search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
            resultsContainer.classList.remove('visible');
            resultsContainer.style.display = 'none';
        }
    }

    showSearchError(message) {
        const resultsContainer = document.getElementById('contact-search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="search-error">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="error-content">
                        <h4>Error en la búsqueda</h4>
                        <p>${message}</p>
                        <button class="retry-search-btn" data-retry-search="true">
                            <i class="fas fa-redo"></i>
                            Intentar nuevamente
                        </button>
                    </div>
                </div>
            `;
            resultsContainer.classList.add('visible');
        }
    }

    // sendContactRequest method removed - now handled by sendDirectContactRequest

    async loadContacts() {
        try {
            const contactsList = document.getElementById('contacts-list');
            
            // Show enhanced skeleton loading if list is empty or has no real content
            const shouldShowSkeleton = contactsList && 
                (!contactsList.children.length || 
                 contactsList.querySelector('.empty-state') ||
                 contactsList.querySelector('.error-state'));
            
            if (shouldShowSkeleton) {
                this.showContactsLoadingSkeleton(contactsList);
            }

            // Optimistic loading: Cache previous contacts data
            const cachedContacts = this.getCachedContacts();
            if (cachedContacts && cachedContacts.length > 0 && shouldShowSkeleton) {
                // Show cached data immediately while loading fresh data
                setTimeout(() => {
                    this.displayContacts(cachedContacts, true); // true = from cache
                }, 100);
            }

            // Use API client to get fresh data
            const data = await API.Contacts.getContacts();

            if (data.success) {
                // Cache the fresh data
                this.cacheContacts(data.data);
                this.displayContacts(data.data);
            } else {
                this.showContactsErrorState(contactsList);
            }

        } catch (error) {
            console.error('Load contacts error:', error);
            const contactsList = document.getElementById('contacts-list');
            
            // Try to show cached data if available
            const cachedContacts = this.getCachedContacts();
            if (cachedContacts && cachedContacts.length > 0) {
                console.log('Showing cached contacts due to network error');
                this.displayContacts(cachedContacts, true);
                // Show a subtle warning about using cached data
                this.showCacheWarning();
            } else if (contactsList) {
                this.showContactsErrorState(contactsList);
            }
        }
    }

    showContactsErrorState(contactsList) {
        if (!contactsList) return;
        
        contactsList.style.transition = 'opacity 0.3s ease';
        contactsList.style.opacity = '0.7';
        
        setTimeout(() => {
            contactsList.innerHTML = `
                <div class="error-state" style="opacity: 0; transform: translateY(10px);">
                    <i class="fas fa-exclamation-triangle" style="color: var(--error-color); font-size: 2rem; margin-bottom: 1rem;"></i>
                    <h3>Error al cargar contactos</h3>
                    <p>No se pudieron cargar los contactos</p>
                    <button class="btn-secondary" onclick="window.contactsManager.loadContacts()" style="margin-top: 1rem;">
                        Reintentar
                    </button>
                </div>
            `;
            
            contactsList.style.opacity = '1';
            
            // Animate in error state
            requestAnimationFrame(() => {
                const errorState = contactsList.querySelector('.error-state');
                if (errorState) {
                    errorState.style.transition = 'all 0.3s ease';
                    errorState.style.opacity = '1';
                    errorState.style.transform = 'translateY(0)';
                }
            });
        }, 150);
    }

    async loadContactRequests() {
        try {
            // Use API client instead of manual fetch
            const data = await API.Contacts.getContactRequests();

            if (data.success) {
                this.displayContactRequests(data.data);
                this.updateRequestsBadge(data.data.length);
            }

        } catch (error) {
            console.error('Load contact requests error:', error);
        }
    }

    displayContacts(contacts, fromCache = false) {
        const contactsList = document.getElementById('contacts-list');
        
        if (!contactsList) {
            console.error('Contacts list element not found');
            return;
        }
        
        if (!contacts.length) {
            this.showEmptyContactsState(contactsList);
            return;
        }

        // Update contacts map for real-time updates
        this.contacts.clear();
        contacts.forEach(contact => {
            this.contacts.set(contact._id, contact);
        });

        // Smooth loading implementation with cache indication
        this.renderContactsSmooth(contactsList, contacts, fromCache);
    }

    showEmptyContactsState(contactsList) {
        // Fade out current content if exists
        const currentContent = contactsList.innerHTML;
        if (currentContent.trim()) {
            contactsList.style.opacity = '0.7';
            setTimeout(() => {
                contactsList.innerHTML = `
                    <div class="empty-state" style="opacity: 0; transform: translateY(10px);">
                        <i class="fas fa-users"></i>
                        <h3>Sin contactos aún</h3>
                        <p>Agrega tu primer contacto para empezar a chatear</p>
                    </div>
                `;
                contactsList.style.opacity = '1';
                
                // Animate in empty state
                requestAnimationFrame(() => {
                    const emptyState = contactsList.querySelector('.empty-state');
                    if (emptyState) {
                        emptyState.style.transition = 'all 0.3s ease';
                        emptyState.style.opacity = '1';
                        emptyState.style.transform = 'translateY(0)';
                    }
                });
            }, 150);
        } else {
            contactsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>Sin contactos aún</h3>
                    <p>Agrega tu primer contacto para empezar a chatear</p>
                </div>
            `;
        }
    }

    renderContactsSmooth(contactsList, contacts, fromCache = false) {
        // Check if we need to show loading skeleton first
        const hasContent = contactsList.children.length > 0 && 
                          !contactsList.querySelector('.contact-skeleton') &&
                          !contactsList.querySelector('.empty-state') &&
                          !contactsList.querySelector('.error-state');

        if (!hasContent) {
            // Show skeleton only if not loading from cache
            if (!fromCache) {
                this.showContactsLoadingSkeleton(contactsList);
            }
            
            // Render actual contacts with appropriate delay
            const delay = fromCache ? 50 : 180; // Faster for cached data
            setTimeout(() => {
                this.renderContactsContent(contactsList, contacts);
            }, delay);
        } else {
            // Direct render for subsequent updates with smooth transition
            this.renderContactsContent(contactsList, contacts);
        }
    }

    showContactsLoadingSkeleton(contactsList) {
        // Smooth transition to loading state
        contactsList.style.transition = 'opacity 0.2s ease';
        contactsList.style.opacity = '0.8';
        
        const skeletonHTML = `
            <div class="contacts-loading-container smooth-loading">
                <div class="loading-header">
                    <div class="loading-text skeleton-shimmer" style="width: 120px; height: 16px; margin-bottom: 16px;"></div>
                </div>
                ${Array.from({length: 6}, (_, i) => `
                    <div class="contact-item contact-skeleton" style="animation-delay: ${i * 0.05}s; opacity: 0; transform: translateY(10px);">
                        <div class="contact-avatar-container">
                            <div class="contact-avatar skeleton-shimmer"></div>
                            <div class="status-indicator skeleton-shimmer"></div>
                        </div>
                        <div class="contact-info">
                            <div class="contact-details">
                                <div class="contact-name skeleton-shimmer" style="width: ${60 + Math.random() * 30}%; height: 14px; margin-bottom: 4px;"></div>
                                <div class="contact-username skeleton-shimmer" style="width: ${40 + Math.random() * 20}%; height: 12px; margin-bottom: 2px;"></div>
                                <div class="contact-status skeleton-shimmer" style="width: ${30 + Math.random() * 25}%; height: 10px;"></div>
                            </div>
                        </div>
                        <div class="contact-actions">
                            <div class="skeleton-shimmer" style="width: 28px; height: 28px; border-radius: 50%; margin-right: 8px;"></div>
                            <div class="skeleton-shimmer" style="width: 28px; height: 28px; border-radius: 50%;"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        contactsList.innerHTML = skeletonHTML;
        
        // Progressive fade-in animation for skeleton items
        requestAnimationFrame(() => {
            contactsList.style.opacity = '1';
            
            // Animate skeleton items progressively
            const skeletonItems = contactsList.querySelectorAll('.contact-skeleton');
            skeletonItems.forEach((item, index) => {
                setTimeout(() => {
                    item.style.transition = 'all 0.3s ease';
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, index * 50);
            });
        });
    }

    renderContactsContent(contactsList, contacts) {
        console.log('Displaying contacts with real-time status:', contacts.map(c => ({
            name: c.fullName, 
            status: c.status, 
            isReallyOnline: c.isReallyOnline
        })));
        
        console.log('Displaying contacts with Messenger-style layout:', contacts.length, 'contacts');

        // Progressive rendering for smooth transition
        const isFirstLoad = contactsList.querySelector('.contact-skeleton') || contactsList.querySelector('.contacts-loading-container');
        
        if (isFirstLoad) {
            // Smooth transition from skeleton to real content
            contactsList.style.transition = 'opacity 0.25s ease';
            contactsList.style.opacity = '0.6';
            
            setTimeout(() => {
                this.renderContactsHTML(contactsList, contacts);
                
                // Animate in new content with improved timing
                contactsList.style.opacity = '1';
                
                // Enhanced progressive show animation
                requestAnimationFrame(() => {
                    const contactItems = contactsList.querySelectorAll('.contact-item');
                    contactItems.forEach((item, index) => {
                        // Initialize with invisible state
                        item.style.opacity = '0';
                        item.style.transform = 'translateY(8px) scale(0.98)';
                        item.style.transition = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
                        
                        setTimeout(() => {
                            item.style.opacity = '1';
                            item.style.transform = 'translateY(0) scale(1)';
                        }, Math.min(index * 30, 800)); // Cap max delay at 800ms
                    });
                });
            }, 120); // Reduced delay for snappier feel
        } else {
            // Optimized update for subsequent renders with micro-animations
            const existingItems = Array.from(contactsList.querySelectorAll('.contact-item'));
            
            // Quick pulse animation for updates
            existingItems.forEach(item => {
                item.style.transition = 'transform 0.15s ease';
                item.style.transform = 'scale(0.995)';
                setTimeout(() => {
                    item.style.transform = 'scale(1)';
                }, 75);
            });
            
            setTimeout(() => {
                this.renderContactsHTML(contactsList, contacts);
            }, 75);
        }
    }

    renderContactsHTML(contactsList, contacts) {
        contactsList.innerHTML = contacts.map(contact => {
            const isCurrentUser = window.API?.Auth?.getCurrentUserId ? 
                (window.API.Auth.getCurrentUserId() === contact._id) : false;
            
            // Calculate status display
            let statusDisplay = '';
            let statusClass = 'offline';
            let tooltipText = '';
            
            if (contact.status === 'online') {
                statusClass = 'online';
                tooltipText = 'En línea';
            } else if (contact.lastSeen) {
                const lastSeenMinutes = this.getMinutesSinceLastSeen(contact.lastSeen);
                if (lastSeenMinutes < 5) {
                    statusClass = 'online';
                    tooltipText = 'En línea';
                } else {
                    // Show away status with time for any time > 5 minutes
                    statusClass = 'away';
                    if (lastSeenMinutes < 60) {
                        statusDisplay = `${lastSeenMinutes}m`;
                        tooltipText = `Activo hace ${lastSeenMinutes} min`;
                    } else if (lastSeenMinutes < 1440) { // Less than 24 hours
                        const hours = Math.floor(lastSeenMinutes / 60);
                        statusDisplay = `${hours}h`;
                        tooltipText = `Activo hace ${hours} h`;
                    } else {
                        const days = Math.floor(lastSeenMinutes / 1440);
                        statusDisplay = `${days}d`;
                        tooltipText = `Activo hace ${days} d`;
                    }
                }
            } else {
                statusClass = 'offline';
                tooltipText = 'Desconectado';
            }

            // Ensure we have complete contact information
            const fullName = contact.fullName || contact.name || 'Usuario';
            const username = contact.username || 'usuario';
            const email = contact.email || '';

            return `
                <div class="contact-item" data-user-id="${contact._id}">
                    <div class="contact-avatar-container" data-avatar-click="${contact._id}" data-is-current="${isCurrentUser}">
                        <img src="${contact.avatar || '/images/user-placeholder-40.svg'}" 
                             alt="${fullName}" 
                             class="contact-avatar"
                             onerror="this.src='/images/user-placeholder-40.svg'">
                        ${statusClass === 'online' ? 
                            `<div class="status-indicator ${statusClass}" title="${tooltipText}"></div>` :
                            statusClass === 'away' ? 
                            `<div class="status-indicator ${statusClass}" title="${tooltipText}">
                                <span class="status-time">${statusDisplay}</span>
                             </div>` : ''
                        }
                    </div>
                    <div class="contact-info" data-view-profile="${contact._id}">
                        <div class="contact-details">
                            <div class="contact-name" title="${Utils.escapeHtml(fullName)}">${Utils.escapeHtml(fullName)}</div>
                            <div class="contact-username" title="@${Utils.escapeHtml(username)}">@${Utils.escapeHtml(username)}</div>
                            ${email ? `<div class="contact-email" title="${Utils.escapeHtml(email)}">${Utils.escapeHtml(email)}</div>` : ''}
                        </div>
                    </div>
                    <div class="contact-actions">
                        <div class="contact-action-buttons">
                            <button class="chat-btn" data-start-chat="${contact._id}" title="Iniciar chat">
                                <i class="fas fa-comment"></i>
                            </button>
                            <button class="more-btn" data-contact-menu="${contact._id}" title="Más opciones">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Force immediate style application and prevent layout thrashing
        requestAnimationFrame(() => {
            // Trigger reflow to ensure styles are computed immediately
            contactsList.offsetHeight;
            
            // Apply loaded class to all contact items for animation
            const contactItems = contactsList.querySelectorAll('.contact-item');
            contactItems.forEach((item, index) => {
                // Stagger the appearance slightly for smooth loading
                setTimeout(() => {
                    item.classList.add('contact-loaded');
                    // Force layout recalculation to ensure styles are applied
                    item.offsetHeight;
                }, index * 10);
            });
        });

        // Bind main click event to each contact item
        contactsList.querySelectorAll('.contact-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Check if click was on a button or specific action element
                if (e.target.closest('.contact-action-buttons') || 
                    e.target.closest('[data-contact-menu]') || 
                    e.target.closest('[data-start-chat]') ||
                    e.target.closest('[data-avatar-click]')) {
                    return; // Let specific handlers handle these
                }
                
                // Default action: view profile
                const contactId = item.dataset.userId;
                if (contactId) {
                    console.log('Contact item clicked:', contactId);
                    this.viewContactProfile(contactId);
                }
            });
        });

        // Bind contact info click to view profile
        contactsList.querySelectorAll('[data-view-profile]').forEach(element => {
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                const contactId = element.dataset.viewProfile;
                this.viewContactProfile(contactId);
            });
        });

        // Bind start chat button events
        contactsList.querySelectorAll('[data-start-chat]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const contactId = btn.dataset.startChat;
                this.startChat(contactId);
            });
        });

        contactsList.querySelectorAll('[data-avatar-click]').forEach(element => {
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                const contactId = element.dataset.avatarClick;
                const isCurrentUser = element.dataset.isCurrent === 'true';
                this.handleAvatarClick(contactId, isCurrentUser);
            });
        });

        contactsList.querySelectorAll('[data-contact-menu]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const contactId = btn.dataset.contactMenu;
                this.showContactMenu(contactId);
            });
        });
    }

    displayContactRequests(requests) {
        const requestsList = document.getElementById('requests-list');
        
        if (!requests.length) {
            requestsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-clock"></i>
                    <h3>Sin solicitudes pendientes</h3>
                    <p>Las solicitudes de contacto aparecerán aquí</p>
                </div>
            `;
            return;
        }

        requestsList.innerHTML = requests.map(request => `
            <div class="request-item" data-request-id="${request._id}" data-user-id="${request.from._id}">
                <div class="request-avatar">
                    <img src="${request.from.avatar || '/images/user-placeholder-40.svg'}" alt="${request.from.fullName}">
                </div>
                <div class="request-info">
                    <div class="request-name">${request.from.fullName}</div>
                    <div class="request-username">@${request.from.username}</div>
                    ${request.message ? `<div class="request-message">"${request.message}"</div>` : ''}
                    <div class="request-time">${this.formatRequestTime(request.sentAt)}</div>
                </div>
                <div class="request-actions">
                    <button class="accept-btn" data-request-action="accept" data-request-id="${request._id}">
                        <i class="fas fa-check"></i>
                        Aceptar
                    </button>
                    <button class="reject-btn" data-request-action="reject" data-request-id="${request._id}">
                        <i class="fas fa-times"></i>
                        Rechazar
                    </button>
                </div>
            </div>
        `).join('');

        // Bind request action events
        requestsList.querySelectorAll('[data-request-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.requestAction;
                const requestId = btn.dataset.requestId;
                this.handleContactRequest(requestId, action);
            });
        });
    }

    async handleContactRequest(requestId, action) {
        try {
            // Use API client instead of manual fetch
            let data;
            if (action === 'accept') {
                data = await API.Contacts.acceptContactRequest(requestId);
            } else if (action === 'reject') {
                data = await API.Contacts.declineContactRequest(requestId);
            }

            if (data.success) {
                if (action === 'accept') {
                    this.showNotification('<strong>¡Solicitud aceptada!</strong><br><small>Ya pueden chatear juntos</small>', 'success', 6000);
                    this.loadContacts(); // Reload contacts
                } else {
                    this.showNotification('<strong>Solicitud rechazada</strong><br><small>La solicitud ha sido eliminada</small>', 'info', 4000);
                }
                
                this.loadContactRequests(); // Reload requests
                
                // Clear caches to ensure fresh relationship statuses in search
                this.searchCache.clear();
                
                // Refresh current search if active
                setTimeout(() => {
                    this.refreshCurrentSearch();
                }, 500);
                
                // Notify via socket
                if (window.socket) {
                    window.socket.emit('contactRequestResponse', {
                        requestId,
                        action
                    });
                }
            } else {
                this.showNotification(`<strong>Error:</strong> ${data.message}`, 'error');
            }

        } catch (error) {
            console.error('Handle contact request error:', error);
            this.showNotification('<strong>Error de conexión</strong><br><small>No se pudo procesar la solicitud</small>', 'error');
        }
    }

    // Real-time event handlers
    handleIncomingContactRequest(data) {
        this.loadContactRequests();
        this.showNotification(
            `<strong>Nueva solicitud de contacto</strong><br><small>De: ${data.from.fullName}</small>`, 
            'info', 
            8000
        );
        
        // Play notification sound if enabled
        this.playNotificationSound();
    }

    handleContactRequestResponse(data) {
        if (data.action === 'accept') {
            this.showNotification(
                `<strong>¡Solicitud aceptada!</strong><br><small>${data.user.fullName} ahora es tu contacto</small>`, 
                'success', 
                7000
            );
            this.loadContacts();
        } else {
            this.showNotification(
                `<strong>Solicitud rechazada</strong><br><small>${data.user.fullName} no aceptó tu solicitud</small>`, 
                'warning', 
                6000
            );
        }
        
        // Clear all caches to ensure fresh data with updated relationship status
        this.searchCache.clear();
        
        // Refresh search if active
        setTimeout(() => {
            this.refreshCurrentSearch();
        }, 500);
    }

    handleContactAdded(data) {
        this.loadContacts();
        
        // Clear all caches to ensure fresh relationship status
        this.searchCache.clear();
        
        // Refresh search if active
        setTimeout(() => {
            this.refreshCurrentSearch();
        }, 500);
    }

    // Utility methods
    updateRequestsBadge(count) {
        const badge = document.getElementById('requests-unread');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 9 ? '9+' : count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    async startChat(contactId) {
        try {
            console.log('🚀 Starting chat with contact:', contactId);
            
            // Get contact info for display
            const contact = Array.from(this.contacts.values()).find(c => c._id === contactId);
            const contactName = contact ? (contact.fullName || contact.username) : 'Usuario';
            
            // Check if conversation already exists with retry mechanism
            const chatManager = await this.waitForChatManager();
            if (!chatManager) {
                console.error('Chat manager not available after retry');
                Utils.Notifications.error('Error al iniciar el chat. Intenta de nuevo.');
                return;
            }
            
            // Ensure chat manager is properly initialized with current user
            if (!chatManager.currentUser) {
                const currentUser = window.AuthManager ? window.AuthManager.getCurrentUser() : Utils.Storage.get('currentUser');
                if (currentUser && chatManager.initialize) {
                    console.log('🔄 Initializing chat manager with current user...');
                    await chatManager.initialize(currentUser);
                }
            }
            
            // Check for existing conversation
            const existingConversation = await this.findExistingConversation(contactId);
            
            let notificationMessage;
            if (existingConversation) {
                console.log('📱 Found existing conversation:', existingConversation._id);
                notificationMessage = `Continuando chat con ${contactName}`;
            } else {
                console.log('🆕 No existing conversation, creating new one');
                notificationMessage = `Iniciando nueva conversación con ${contactName}`;
            }
            
            // Switch to chats tab first
            const chatsTab = document.querySelector('[data-tab="chats"]');
            if (chatsTab) {
                chatsTab.click();
            }
            
            // Start chat immediately without delay - the chat manager will handle any DOM readiness
            try {
                if (existingConversation) {
                    // Select existing conversation
                    await chatManager.selectConversation(existingConversation._id);
                } else {
                    // Start new chat
                    await chatManager.startChatWithUser(contactId);
                }
                Utils.Notifications.success(notificationMessage);
            } catch (error) {
                console.error('Error starting/continuing chat:', error);
                Utils.Notifications.error('Error al acceder al chat. Intenta de nuevo.');
            }
            
        } catch (error) {
            console.error('❌ Error in startChat:', error);
            Utils.Notifications.error('Error al iniciar el chat. Intenta de nuevo.');
        }
    }

    // Wait for chat manager to be available
    async waitForChatManager(maxRetries = 20, delayMs = 200) {
        for (let i = 0; i < maxRetries; i++) {
            const chatManager = window.chatManager || window.Chat;
            if (chatManager && chatManager.initialized !== false) {
                console.log(`✅ Chat manager found after ${i} retries`);
                return chatManager;
            }
            
            console.log(`⏳ Waiting for chat manager... attempt ${i + 1}/${maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        console.error('❌ Chat manager not available after maximum retries');
        return null;
    }

    // Helper method to find existing conversation with a contact
    async findExistingConversation(contactId) {
        try {
            const chatManager = await this.waitForChatManager();
            if (!chatManager || !chatManager.conversations) {
                return null;
            }
            
            // Get current user ID
            const currentUser = chatManager.currentUser || window.AuthManager?.getCurrentUser() || Utils.Storage.get('currentUser');
            if (!currentUser || !currentUser._id) {
                console.warn('No current user found');
                return null;
            }
            
            // Search through existing conversations
            for (const [conversationId, conversation] of chatManager.conversations) {
                if (conversation.type === 'private' && 
                    conversation.participants && 
                    conversation.participants.includes(contactId) && 
                    conversation.participants.includes(currentUser._id)) {
                    
                    console.log('✅ Found existing conversation:', conversationId);
                    return conversation;
                }
            }
            
            console.log('📭 No existing conversation found with contact:', contactId);
            return null;
            
        } catch (error) {
            console.error('❌ Error finding existing conversation:', error);
            return null;
        }
    }

    handleAvatarClick(contactId, isCurrentUser) {
        if (isCurrentUser) {
            // Show profile management options for current user
            this.showProfileManagementMenu(contactId);
        } else {
            // Show contact profile/options for other users
            this.showContactProfileMenu(contactId);
        }
    }

    showProfileManagementMenu(contactId) {
        // Create and show profile management modal for current user
        const modal = document.createElement('div');
        modal.className = 'modal profile-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content profile-management">
                <div class="modal-header">
                    <h3><i class="fas fa-user-cog"></i> Mi Perfil</h3>
                    <button class="close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="profile-actions">
                        <button class="profile-action-btn" data-action="change-avatar">
                            <i class="fas fa-camera"></i>
                            <span>Cambiar foto de perfil</span>
                        </button>
                        <button class="profile-action-btn" data-action="edit-info">
                            <i class="fas fa-edit"></i>
                            <span>Editar información</span>
                        </button>
                        <button class="profile-action-btn" data-action="privacy-settings">
                            <i class="fas fa-shield-alt"></i>
                            <span>Configuración de privacidad</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.remove('hidden');

        // Bind events
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.modal-overlay').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelectorAll('.profile-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                this.handleProfileAction(action);
                modal.remove();
            });
        });
    }

    showContactProfileMenu(contactId) {
        // Find the button that triggered this menu to position the modal nearby
        const triggerButton = document.querySelector(`[data-contact-menu="${contactId}"]`);
        const buttonRect = triggerButton ? triggerButton.getBoundingClientRect() : null;

        // Create and show contact profile/options menu
        const modal = document.createElement('div');
        modal.className = 'modal contact-profile-modal compact-menu';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content contact-profile compact">
                <div class="contact-menu-actions">
                    <button class="contact-menu-btn" data-action="view-profile" data-contact-id="${contactId}">
                        <i class="fas fa-eye"></i>
                        <span>Ver perfil</span>
                    </button>
                    <button class="contact-menu-btn" data-action="start-chat" data-contact-id="${contactId}">
                        <i class="fas fa-comments"></i>
                        <span>Iniciar chat</span>
                    </button>
                    <button class="contact-menu-btn warning" data-action="remove-contact" data-contact-id="${contactId}">
                        <i class="fas fa-user-times"></i>
                        <span>Eliminar contacto</span>
                    </button>
                    <button class="contact-menu-btn danger" data-action="block-contact" data-contact-id="${contactId}">
                        <i class="fas fa-ban"></i>
                        <span>Bloquear contacto</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Position the modal near the trigger button
        if (buttonRect) {
            const modalContent = modal.querySelector('.modal-content');
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // Calculate position
            let left = buttonRect.left - 180; // Position to the left of the button
            let top = buttonRect.top - 10; // Slightly above the button
            
            // Ensure modal stays within viewport
            if (left < 10) {
                left = buttonRect.right + 10; // If can't fit on left, show on right
            }
            if (left + 200 > viewportWidth) {
                left = viewportWidth - 210; // Adjust if modal goes off-screen
            }
            if (top + 200 > viewportHeight) {
                top = viewportHeight - 210; // Adjust vertical position
            }
            if (top < 10) {
                top = 10; // Minimum top margin
            }
            
            modalContent.style.position = 'fixed';
            modalContent.style.left = `${left}px`;
            modalContent.style.top = `${top}px`;
            modalContent.style.margin = '0';
            modalContent.style.transform = 'none';
        }
        
        modal.classList.remove('hidden');

        // Bind events
        modal.querySelector('.modal-overlay').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelectorAll('.contact-menu-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const action = btn.dataset.action;
                const contactId = btn.dataset.contactId;
                
                // For view-profile, don't remove modal yet - let viewContactProfile handle it
                if (action === 'view-profile') {
                    await this.handleContactAction(action, contactId);
                } else {
                    await this.handleContactAction(action, contactId);
                    modal.remove();
                }
            });
        });

        // Close on ESC key
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        // Auto-close after a delay if user doesn't interact
        setTimeout(() => {
            if (document.body.contains(modal)) {
                modal.addEventListener('mouseleave', () => {
                    setTimeout(() => {
                        if (document.body.contains(modal) && !modal.matches(':hover')) {
                            modal.remove();
                        }
                    }, 1000);
                });
            }
        }, 100);
    }

    handleProfileAction(action) {
        switch (action) {
            case 'change-avatar':
                this.openAvatarUpload();
                break;
            case 'edit-info':
                this.openProfileEditor();
                break;
            case 'privacy-settings':
                this.openPrivacySettings();
                break;
        }
    }

    async handleContactAction(action, contactId) {
        switch (action) {
            case 'view-profile':
                await this.viewContactProfile(contactId);
                break;
            case 'start-chat':
                this.startChat(contactId);
                break;
            case 'remove-contact':
                this.confirmRemoveContact(contactId);
                break;
            case 'block-contact':
                this.confirmBlockContact(contactId);
                break;
        }
    }

    openAvatarUpload() {
        // Create file input for avatar upload
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.uploadAvatar(e.target.files[0]);
            }
        });
        input.click();
    }

    openProfileEditor() {
        Utils.Notifications.info('Editor de perfil disponible próximamente');
    }

    openPrivacySettings() {
        Utils.Notifications.info('Configuración de privacidad disponible próximamente');
    }

    async viewContactProfile(contactId) {
        try {
            console.log('Opening profile for contact:', contactId);

            // Close the current context menu first
            this.closeModals();

            // Get user data directly from API
            let userData = null;
            if (window.API && window.API.Users && window.API.Users.getUserProfile) {
                try {
                    const response = await window.API.Users.getUserProfile(contactId);
                    if (response.success && response.data) {
                        userData = response.data;
                        console.log('Got user data from API:', userData);
                    }
                } catch (error) {
                    console.warn('Could not fetch user profile data:', error);
                }
            }

            // If API failed, show error and return
            if (!userData) {
                console.error('No user data available from API for contactId:', contactId);
                Utils.Notifications.error('No se pudo obtener la información del usuario desde la base de datos');
                return;
            }

            // Debug: Log the exact user data we got
            console.log('📧 USER DATA RECEIVED:', {
                id: userData._id,
                username: userData.username,
                fullName: userData.fullName,
                email: userData.email,
                bio: userData.bio
            });

            // Ensure we have the essential fields from database
            if (!userData.email) {
                console.warn('⚠️ User data missing email field, but user should have email');
                userData.email = 'Email no recibido de la API';
            } else {
                console.log('✅ Email received correctly:', userData.email);
            }
            
            if (!userData.lastSeen) {
                console.warn('User data missing lastSeen field');
                userData.lastSeen = null;
            }

            if (!userData.createdAt) {
                console.warn('User data missing createdAt field');
                userData.createdAt = null;
            }

            // Open the profile modal directly
            this.openProfileModal(userData);

        } catch (error) {
            console.error('Error viewing contact profile:', error);
            Utils.Notifications.error('Error al abrir el perfil del contacto');
        }
    }

    openProfileModal(userData) {
        // Find the profile modal
        const modal = document.getElementById('full-profile-modal');
        if (!modal) {
            console.error('Profile modal not found');
            Utils.Notifications.error('Modal de perfil no encontrado');
            return;
        }

        // Format dates
        const lastSeen = Utils.formatLastSeenStyled(userData.lastSeen);
        const lastConnection = this.formatLastConnection(userData.lastSeen);
        const memberSince = this.formatMemberSince(userData.createdAt);

        // Populate modal with user data
        const profileImage = document.getElementById('profile-modal-image');
        const profileName = document.getElementById('profile-modal-name');
        const profileUsername = document.getElementById('profile-modal-username');
        const profileFullName = document.getElementById('profile-modal-full-name');
        const profileUsernameDetail = document.getElementById('profile-modal-username-detail');
        const profileEmail = document.getElementById('profile-modal-email');
        const profileBio = document.getElementById('profile-modal-bio');
        const profileLastSeen = document.getElementById('profile-modal-last-seen');
        const profileLastConnection = document.getElementById('profile-modal-last-connection');
        const profileMemberSince = document.getElementById('profile-modal-member-since');
        const profileStatusIndicator = document.getElementById('profile-modal-status-indicator');

        if (profileImage) profileImage.src = userData.avatar || '/images/user-placeholder-40.svg';
        if (profileName) profileName.textContent = userData.fullName;
        if (profileUsername) profileUsername.textContent = `@${userData.username}`;
        if (profileFullName) profileFullName.textContent = userData.fullName;
        if (profileUsernameDetail) profileUsernameDetail.textContent = `@${userData.username}`;
        if (profileEmail) {
            // ALWAYS show the email exactly as it comes from API
            profileEmail.textContent = userData.email || 'Sin email disponible';
        }
        if (profileBio) profileBio.textContent = userData.bio || 'Sin biografía disponible';
        if (profileLastSeen) profileLastSeen.textContent = lastSeen;
        if (profileLastConnection) profileLastConnection.textContent = lastConnection;
        if (profileMemberSince) profileMemberSince.textContent = memberSince;
        if (profileStatusIndicator) {
            profileStatusIndicator.className = `status-indicator ${userData.status === 'online' ? 'online' : 'offline'}`;
        }

        // Show/hide photo actions based on whether it's own profile
        const photoActions = document.getElementById('profile-photo-actions');
        if (photoActions) {
            const shouldShow = userData.isOwnProfile === true;
            // Always show buttons for own profile, regardless of whether there's a photo
            photoActions.style.display = shouldShow ? 'flex' : 'none';
            photoActions.style.visibility = shouldShow ? 'visible' : 'hidden';
            photoActions.style.opacity = shouldShow ? '1' : '0';
            console.log('Photo actions visibility:', shouldShow, 'for profile:', userData.fullName);
            
            // Ensure buttons are set up after showing them
            if (shouldShow) {
                setTimeout(() => {
                    if (window.profilePhotoViewer) {
                        window.profilePhotoViewer.setupPhotoActionListeners();
                    }
                }, 100);
            }
        } else {
            console.log('Photo actions element not found');
        }

        // Show modal
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);

        document.body.style.overflow = 'hidden';
        console.log('Profile modal opened for:', userData.fullName);
    }

    async showOwnProfile() {
        try {
            // Get current user data from API
            const response = await fetch('/api/users/me', {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Error fetching user data');
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Error loading profile');
            }

            // Mark as own profile and show
            result.data.isOwnProfile = true;
            console.log('Showing own profile with data:', result.data);
            this.viewContactProfile(result.data);

        } catch (error) {
            console.error('Error showing own profile:', error);
            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                Utils.showNotification('error', 'Error al cargar tu perfil');
            } else {
                console.error('Error al cargar tu perfil');
            }
        }
    }


    formatLastConnection(lastSeenDate) {
        if (!lastSeenDate) return 'Sin información de conexión';
        
        try {
            const now = new Date();
            const lastSeen = new Date(lastSeenDate);
            
            // Validate date
            if (isNaN(lastSeen.getTime())) {
                return 'Información de conexión no disponible';
            }
            
            const diff = now - lastSeen;
            const minutes = Math.floor(diff / 60000);
            
            if (minutes < 5) return 'En línea ahora';
            
            const formatted = Utils.formatLastSeenStyled(lastSeenDate);
            if (formatted === 'En línea') return 'En línea ahora';
            
            return `Visto por última vez ${formatted}`;
        } catch (error) {
            console.error('Error formatting last connection:', error);
            return 'Error al obtener información de conexión';
        }
    }

    formatMemberSince(createdAt) {
        if (!createdAt) return 'Fecha no disponible';
        
        try {
            const date = new Date(createdAt);
            if (isNaN(date.getTime())) return 'Fecha no disponible';
            
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
            return 'Fecha no disponible';
        }
    }

    async confirmRemoveContact(contactId) {
        if (await Utils.ConfirmationModal.remove('este contacto')) {
            this.removeContact(contactId);
        }
    }

    async confirmBlockContact(contactId) {
        if (await Utils.ConfirmationModal.block('este contacto')) {
            this.blockContact(contactId);
        }
    }

    async uploadAvatar(file) {
        try {
            Utils.Notifications.info('Subiendo foto de perfil...');
            // TODO: Implement avatar upload
            Utils.Notifications.success('Funcionalidad de cambio de avatar disponible próximamente');
        } catch (error) {
            Utils.Notifications.error('Error al subir la foto de perfil');
        }
    }

    async removeContact(contactId) {
        try {
            const response = await API.Contacts.removeContact(contactId);
            if (response.success) {
                Utils.Notifications.success('Contacto eliminado correctamente');
                this.loadContacts();
                
                // Notify via socket if available
                if (window.socket) {
                    window.socket.emit('contactRemoved', { contactId });
                }
            } else {
                throw new Error(response.message || 'Error al eliminar el contacto');
            }
        } catch (error) {
            console.error('Remove contact error:', error);
            Utils.Notifications.error('Error al eliminar el contacto: ' + error.message);
        }
    }

    async blockContact(contactId) {
        try {
            const response = await API.Contacts.blockContact(contactId);
            if (response.success) {
                Utils.Notifications.success('Contacto bloqueado correctamente');
                this.loadContacts();
                
                // Refresh blocked contacts if modal is open
                if (window.blockedContactsManager) {
                    window.blockedContactsManager.refreshBlockedContacts();
                }
                
                // Notify via socket if available
                if (window.socket) {
                    window.socket.emit('contactBlocked', { contactId });
                }
            } else {
                throw new Error(response.message || 'Error al bloquear el contacto');
            }
        } catch (error) {
            console.error('Block contact error:', error);
            Utils.Notifications.error('Error al bloquear el contacto: ' + error.message);
        }
    }

    showContactMenu(contactId) {
        // Legacy method - now handled by handleAvatarClick
        this.showContactProfileMenu(contactId);
    }

    handlePendingRequest(userId) {
        // Switch to requests tab and highlight the specific request
        const requestsTab = document.querySelector('[data-tab="requests"]');
        if (requestsTab) {
            requestsTab.click();
            
            // Close the modal
            this.closeModals();
            
            // Highlight the specific request after a short delay
            setTimeout(() => {
                const requestItems = document.querySelectorAll('.request-item');
                requestItems.forEach(item => {
                    if (item.dataset.userId === userId) {
                        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        item.classList.add('highlighted');
                        setTimeout(() => item.classList.remove('highlighted'), 3000);
                    }
                });
            }, 200);
        }
    }


    getMinutesSinceLastSeen(date) {
        const now = new Date();
        const lastSeen = new Date(date);
        const diff = now - lastSeen;
        return Math.floor(diff / 60000); // Return minutes
    }

    formatRequestTime(date) {
        return new Intl.DateTimeFormat('es', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    }

    formatCreatedDate(date) {
        const createdDate = new Date(date);
        const now = new Date();
        const diffTime = Math.abs(now - createdDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 30) {
            return `hace ${diffDays} d`;
        } else if (diffDays < 365) {
            const diffMonths = Math.floor(diffDays / 30);
            return `hace ${diffMonths} mes${diffMonths !== 1 ? 'es' : ''}`;
        } else {
            const diffYears = Math.floor(diffDays / 365);
            return `hace ${diffYears} año${diffYears !== 1 ? 's' : ''}`;
        }
    }

    showNotification(message, type = 'info', duration = 5000) {
        // Remove any existing notifications first
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        // Create notification element with enhanced structure
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.className = 'notification-close';
        closeButton.innerHTML = '×';
        closeButton.addEventListener('click', () => this.hideNotification(notification));
        
        // Set message content
        notification.innerHTML = `
            <div class="notification-content">
                ${message}
            </div>
        `;
        notification.appendChild(closeButton);
        
        // Add to page
        document.body.appendChild(notification);
        
        // Show with animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.hideNotification(notification);
            }, duration);
        }
        
        // Return notification element for manual control
        return notification;
    }

    hideNotification(notification) {
        if (notification && notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 400);
        }
    }

    playNotificationSound() {
        // Play notification sound if enabled
        try {
            // Use system notification sound or create a simple beep
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.1;
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (e) {
            // Fallback: try to use HTML5 audio
            try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+HyvmwhCSqUy/LTgjMGHm/E7uOYUwwNUanl8bVhGgg2jdTux3gsCSZ7xe7cjj0KGmO37uueVBMKR6Lh9LVhGwhQm99IQYj3AAaJDVOr5vK9fyMELY/K8dYMJQEEJILM8Xgl5');
                audio.volume = 0.1;
                audio.play().catch(() => {});
            } catch (e2) {}
        }
    }

    // ===== NEW PRELOAD AND CACHE FUNCTIONALITY =====

    // Display cached results instantly
    displayCachedResults(query) {
        console.log('Displaying cached results for:', query);
        const cachedData = this.searchCache.get(query);
        this.displaySearchResults(cachedData.users, query, true);
    }

    // Cache search results with timestamp
    cacheSearchResults(query, users) {
        // Manage cache size
        if (this.searchCache.size >= this.maxCacheSize) {
            // Remove oldest entries
            const firstKey = this.searchCache.keys().next().value;
            this.searchCache.delete(firstKey);
        }

        this.searchCache.set(query, {
            users,
            timestamp: Date.now(),
            hits: 1
        });
    }

    // Add query to search history
    addToSearchHistory(query) {
        if (!this.searchHistory.includes(query)) {
            this.searchHistory.unshift(query);
            if (this.searchHistory.length > this.maxHistorySize) {
                this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
            }
        }
    }

    // Show search suggestions based on history
    showSearchSuggestions() {
        const resultsContainer = document.getElementById('contact-search-results');
        
        if (this.searchHistory.length > 0) {
            const suggestions = this.searchHistory.slice(0, 5).map(query => `
                <div class="search-suggestion-item" data-query="${query}">
                    <i class="fas fa-history"></i>
                    <span>${query}</span>
                    <button class="remove-suggestion" data-query="${query}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');

            resultsContainer.innerHTML = `
                <div class="search-suggestions">
                    <div class="suggestions-header">
                        <i class="fas fa-clock"></i>
                        <span>Búsquedas recientes</span>
                    </div>
                    ${suggestions}
                </div>
            `;
            resultsContainer.style.display = 'block';

            // Bind suggestion click events
            this.bindSuggestionEvents();
        }
    }

    // Bind events for search suggestions
    bindSuggestionEvents() {
        const suggestionItems = document.querySelectorAll('.search-suggestion-item');
        const removeBtns = document.querySelectorAll('.remove-suggestion');
        
        suggestionItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.remove-suggestion')) return;
                
                const query = item.dataset.query;
                const searchInput = document.getElementById('contact-search');
                if (searchInput) {
                    searchInput.value = query;
                    this.searchUsers(query);
                }
            });
        });

        removeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const query = btn.dataset.query;
                this.removeFromSearchHistory(query);
                this.showSearchSuggestions();
            });
        });
    }

    // Remove query from search history
    removeFromSearchHistory(query) {
        this.searchHistory = this.searchHistory.filter(q => q !== query);
        this.searchCache.delete(query);
    }

    // Predictive preloading
    async preloadPredictiveResults(query) {
        if (this.isPreloading) return;
        
        const predictions = this.generateSearchPredictions(query);
        
        for (const prediction of predictions) {
            if (!this.searchCache.has(prediction) && !this.preloadCache.has(prediction)) {
                this.preloadSearchResults(prediction);
                break; // Only preload one at a time to avoid overwhelming
            }
        }
    }

    // Generate search predictions based on current query
    generateSearchPredictions(query) {
        const predictions = [];
        
        // Common name patterns
        const commonSuffixes = ['a', 'o', 's', 'n', 'r', 'l', 'e', 'i'];
        commonSuffixes.forEach(suffix => {
            if (!query.endsWith(suffix)) {
                predictions.push(query + suffix);
            }
        });

        // Based on search history
        this.searchHistory.forEach(historicalQuery => {
            if (historicalQuery.startsWith(query) && historicalQuery !== query) {
                predictions.push(historicalQuery);
            }
        });

        return predictions.slice(0, 3); // Limit predictions
    }

    // Preload search results in the background
    async preloadSearchResults(query) {
        if (query.length < 3 || this.preloadCache.has(query)) return;

        this.isPreloading = true;
        
        try {
            console.log('Preloading results for:', query);
            const response = await window.API.searchUsers(query);
            
            if (response.success) {
                this.preloadCache.set(query, {
                    users: response.data.users,
                    timestamp: Date.now()
                });
                
                // Move to main cache if query becomes active
                setTimeout(() => {
                    if (this.preloadCache.has(query)) {
                        this.searchCache.set(query, this.preloadCache.get(query));
                        this.preloadCache.delete(query);
                    }
                }, 5000);
            }
        } catch (error) {
            console.warn('Preload failed for:', query, error);
        } finally {
            this.isPreloading = false;
        }
    }

    // Preload popular/common searches
    preloadPopularSearches() {
        const popularQueries = ['admin', 'user', 'test', 'maria', 'juan', 'ana'];
        
        popularQueries.forEach((query, index) => {
            setTimeout(() => {
                if (!this.searchCache.has(query)) {
                    this.preloadSearchResults(query);
                }
            }, index * 1000); // Stagger the preloads
        });
    }

    // Enhanced search loading with better UX
    showSearchLoading(query) {
        const resultsContainer = document.getElementById('contact-search-results');
        resultsContainer.innerHTML = `
            <div class="search-loading enhanced">
                <div class="loading-spinner">
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                </div>
                <p>Buscando "<strong>${query}</strong>"...</p>
                <div class="loading-progress">
                    <div class="progress-bar"></div>
                </div>
            </div>
        `;
        resultsContainer.style.display = 'block';
    }

    // Keyboard navigation for search results
    handleKeyboardNavigation(e) {
        const resultsContainer = document.getElementById('contact-search-results');
        const items = resultsContainer.querySelectorAll('.search-result-item.clickable, .search-suggestion-item');
        
        if (items.length === 0) return;
        
        let currentIndex = -1;
        const current = resultsContainer.querySelector('.keyboard-selected');
        
        if (current) {
            currentIndex = Array.from(items).indexOf(current);
            current.classList.remove('keyboard-selected');
        }
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                currentIndex = (currentIndex + 1) % items.length;
                break;
            case 'ArrowUp':
                e.preventDefault();
                currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
                break;
            case 'Enter':
                e.preventDefault();
                if (current) {
                    current.click();
                    return;
                }
                break;
            case 'Escape':
                e.preventDefault();
                this.clearSearchResults();
                return;
            default:
                return;
        }
        
        if (currentIndex >= 0) {
            items[currentIndex].classList.add('keyboard-selected');
            items[currentIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    // Find user in cache by ID
    findUserInCache(userId) {
        for (const cachedData of this.searchCache.values()) {
            const user = cachedData.users.find(u => u._id === userId);
            if (user) return user;
        }
        return null;
    }

    // Refresh search results if currently searching
    refreshCurrentSearch() {
        const searchInput = document.getElementById('contact-search');
        if (searchInput && searchInput.value.trim() && searchInput.value.length >= 3) {
            const currentQuery = searchInput.value.trim();
            console.log('Refreshing search for:', currentQuery);
            
            // Clear caches first
            this.searchCache.clear();
            
            // Re-run search
            setTimeout(() => {
                this.searchUsers(currentQuery);
            }, 500);
        }
    }

    // Caching methods for improved performance
    cacheContacts(contacts) {
        this.contactsCache = contacts;
        this.contactsCacheTimestamp = Date.now();
        // Also cache in localStorage for persistence across page loads
        try {
            localStorage.setItem('contacts_cache', JSON.stringify({
                data: contacts,
                timestamp: this.contactsCacheTimestamp
            }));
        } catch (e) {
            console.warn('Could not cache contacts in localStorage:', e);
        }
    }
    
    getCachedContacts() {
        // Check memory cache first
        if (this.contactsCache && this.contactsCacheTimestamp) {
            const age = Date.now() - this.contactsCacheTimestamp;
            if (age < this.CACHE_DURATION) {
                return this.contactsCache;
            }
        }
        
        // Check localStorage cache
        try {
            const cached = localStorage.getItem('contacts_cache');
            if (cached) {
                const parsedCache = JSON.parse(cached);
                const age = Date.now() - parsedCache.timestamp;
                if (age < this.CACHE_DURATION * 2) { // Allow longer cache for localStorage
                    this.contactsCache = parsedCache.data;
                    this.contactsCacheTimestamp = parsedCache.timestamp;
                    return parsedCache.data;
                }
            }
        } catch (e) {
            console.warn('Could not read contacts cache from localStorage:', e);
        }
        
        return null;
    }
    
    clearContactsCache() {
        this.contactsCache = null;
        this.contactsCacheTimestamp = null;
        try {
            localStorage.removeItem('contacts_cache');
        } catch (e) {
            console.warn('Could not clear contacts cache:', e);
        }
    }
    
    showCacheWarning() {
        const warning = document.createElement('div');
        warning.className = 'cache-warning';
        warning.innerHTML = `
            <i class="fas fa-wifi" style="opacity: 0.7; margin-right: 6px;"></i>
            <span>Mostrando datos guardados</span>
        `;
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 193, 7, 0.9);
            color: #856404;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            z-index: 1000;
            animation: fadeInOut 4s ease-in-out forwards;
        `;
        
        document.body.appendChild(warning);
        setTimeout(() => warning.remove(), 4000);
    }

    // Public method to load data after authentication
    loadUserData() {
        console.log('Loading user data with new contact style...');
        // Clear any stale cache when loading fresh user data
        this.clearContactsCache();
        
        // Ensure contacts load with the new Messenger-style layout
        this.loadContacts();
        this.loadContactRequests();
        
        // Force refresh of contact display to ensure new styling is applied
        setTimeout(() => {
            if (this.contacts && this.contacts.size > 0) {
                this.displayContacts(Array.from(this.contacts.values()));
            }
        }, 100);
        
        // Start real-time last seen updates
        this.startRealTimeUpdates();
    }
    
    startRealTimeUpdates() {
        // Update lastSeen times every 30 seconds for real-time display
        if (this.realTimeUpdateInterval) {
            clearInterval(this.realTimeUpdateInterval);
        }
        
        this.realTimeUpdateInterval = setInterval(() => {
            this.updateLastSeenTimes();
        }, 30000);
    }
    
    updateLastSeenTimes() {
        // Check if contacts is initialized
        if (!this.contacts || this.contacts.size === 0) {
            return;
        }
        
        // Find all contacts with lastSeen times and update their display with 5-minute logic
        const contactElements = document.querySelectorAll('[data-user-id]');
        contactElements.forEach(element => {
            const userId = element.getAttribute('data-user-id');
            const contact = Array.from(this.contacts.values()).find(c => c._id === userId);
            
            if (contact && contact.lastSeen) {
                // Apply 5-minute buffer logic consistently
                const isReallyOnline = this.isUserReallyOnline(userId);
                const shouldShowOnline = contact.status === 'online' && isReallyOnline;
                
                // Update status indicator
                const statusIndicator = element.querySelector('.status-indicator');
                if (statusIndicator) {
                    statusIndicator.className = `status-indicator ${shouldShowOnline ? 'online' : 'offline'}`;
                }
                
                // Update status text
                const contactStatus = element.querySelector('.contact-status');
                if (contactStatus) {
                    if (shouldShowOnline) {
                        contactStatus.textContent = 'En línea';
                        contactStatus.className = 'contact-status online';
                    } else {
                        const formattedLastSeen = Utils.formatLastSeenStyled(contact.lastSeen);
                        contactStatus.textContent = formattedLastSeen;
                        contactStatus.className = 'contact-status offline';
                    }
                }
                
                // Update legacy last-seen element if it exists
                const lastSeenElement = element.querySelector('.last-seen');
                if (lastSeenElement) {
                    if (shouldShowOnline) {
                        lastSeenElement.textContent = 'En línea';
                    } else {
                        lastSeenElement.textContent = Utils.formatLastSeenStyled(contact.lastSeen);
                    }
                }
            }
        });
    }
    
    // Force refresh contacts with new styling (can be called from external modules)
    refreshContactsDisplay() {
        console.log('Forcing contacts refresh with new styling...');
        if (this.contacts && this.contacts.size > 0) {
            this.displayContacts(Array.from(this.contacts.values()));
        } else {
            // If no contacts cached, reload them
            this.loadContacts();
        }
    }
}

// Initialize when DOM is ready and Utils is available
const initContactsManager = () => {
    if (typeof Utils !== 'undefined') {
        window.contactsManager = new ContactsManager();
    } else {
        setTimeout(initContactsManager, 10);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContactsManager);
} else {
    initContactsManager();
}