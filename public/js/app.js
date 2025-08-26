// Main application entry point

class VigiChatApp {
    constructor() {
        this.initialized = false;
        this.currentTheme = 'light';
        
        this.init();
    }

    async init() {
        if (this.initialized) return;
        
        try {
            console.log('Initializing VigiChat...');
            
            // Initialize utilities
            Utils.Theme.init();
            Utils.Sound.init();
            
            // Setup enhanced animations
            this.setupEnhancedAnimations();
            
            // Unregister existing service worker
            this.unregisterServiceWorker();
            console.log('Service Worker removed completely');
            
            // Setup global event listeners
            this.setupGlobalEventListeners();
            
            // Setup tab functionality
            this.setupTabs();
            
            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            // Handle app installation
            this.handleAppInstall();
            
            // Setup performance monitoring
            this.setupPerformanceMonitoring();
            
            // Setup event-driven alert system
            this.setupEventDrivenAlerts();
            
            // Initialize user status display
            this.initializeUserStatusDisplay();
            
            // Initialize mobile view if on mobile device
            if (window.mobileNavigation && typeof window.mobileNavigation.initializeMobileView === 'function') {
                // Small delay to ensure all components are ready
                setTimeout(() => {
                    window.mobileNavigation.initializeMobileView();
                }, 500);
            }
            
            // Initialize tab content caching
            this.initializeTabCaching();
            
            this.initialized = true;
            console.log('VigiChat initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize VigiChat:', error);
            Utils.Notifications.error('Error al inicializar la aplicación', 4000);
        }
    }

    setupEnhancedAnimations() {
        // Enhanced page transitions
        this.enhancePageTransitions();
        
        // Enhanced modal animations
        this.enhanceModalAnimations();
        
        // Enhanced button interactions
        this.enhanceButtonInteractions();
        
        // Enhanced loading states
        this.enhanceLoadingStates();
    }

    enhancePageTransitions() {
        // Smooth transitions between auth forms
        const authForms = document.querySelectorAll('.auth-form');
        
        authForms.forEach(form => {
            form.addEventListener('animationend', (e) => {
                if (e.animationName === 'slideIn' && !form.classList.contains('hidden')) {
                    form.style.opacity = '1';
                    form.style.transform = 'translateY(0)';
                }
            });
        });

        // Smooth app container entry
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        if (!appContainer.classList.contains('hidden')) {
                            appContainer.style.opacity = '0';
                            appContainer.style.transform = 'translateY(20px)';
                            requestAnimationFrame(() => {
                                appContainer.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                                appContainer.style.opacity = '1';
                                appContainer.style.transform = 'translateY(0)';
                            });
                        }
                    }
                });
            });
            observer.observe(appContainer, { attributes: true });
        }
    }

    enhanceModalAnimations() {
        // Enhanced modal opening/closing
        const modals = document.querySelectorAll('.modal');
        
        modals.forEach(modal => {
            const modalContent = modal.querySelector('.modal-content, .user-profile-modal-content, .profile-modal-content');
            if (!modalContent) return;
            
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        if (!modal.classList.contains('hidden')) {
                            // Opening animation
                            modalContent.style.opacity = '0';
                            modalContent.style.transform = 'scale(0.9) translateY(-10px)';
                            requestAnimationFrame(() => {
                                modalContent.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                                modalContent.style.opacity = '1';
                                modalContent.style.transform = 'scale(1) translateY(0)';
                            });
                        }
                    }
                });
            });
            observer.observe(modal, { attributes: true });
        });
    }

    enhanceButtonInteractions() {
        // Enhanced button hover effects
        document.addEventListener('mouseover', (e) => {
            if (e.target.matches('.btn-enhanced, .icon-btn, .tab-button')) {
                e.target.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
            }
        });

        // Enhanced button click effects
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn-enhanced, .auth-button')) {
                const ripple = this.createRippleEffect(e);
                e.target.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            }
        });
    }

    createRippleEffect(event) {
        const ripple = document.createElement('div');
        ripple.style.position = 'absolute';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'rgba(255, 255, 255, 0.6)';
        ripple.style.transform = 'scale(0)';
        ripple.style.animation = 'ripple 0.6s linear';
        ripple.style.pointerEvents = 'none';
        
        const rect = event.target.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.width = size + 'px';
        ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        return ripple;
    }

    enhanceLoadingStates() {
        // Enhanced loading text animation
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) {
            const texts = ['Conectando...', 'Cargando datos...', 'Iniciando chat...', 'Casi listo...'];
            let currentIndex = 0;
            
            setInterval(() => {
                loadingText.style.opacity = '0';
                setTimeout(() => {
                    currentIndex = (currentIndex + 1) % texts.length;
                    loadingText.textContent = texts[currentIndex];
                    loadingText.style.opacity = '1';
                }, 300);
            }, 2000);
        }
    }

    setupGlobalEventListeners() {
        // Handle unhandled errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            Utils.Notifications.error('Ha ocurrido un error inesperado', 4000);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            Utils.Notifications.error('Error en la aplicación', 4000);
            event.preventDefault();
        });

        // Handle before unload
        window.addEventListener('beforeunload', (event) => {
            // Save any pending data
            this.handleBeforeUnload();
            
            // Show confirmation for unsaved changes (if any)
            const hasUnsavedChanges = this.hasUnsavedChanges();
            if (hasUnsavedChanges) {
                event.preventDefault();
                event.returnValue = '¿Estás seguro de que quieres salir? Hay cambios sin guardar.';
                return event.returnValue;
            }
        });

        // Handle page focus/blur
        window.addEventListener('focus', () => {
            document.body.classList.remove('app-blurred');
            
            // Update user status if connected
            if (window.SocketManager?.isConnected) {
                window.SocketManager.updateUserStatus('online');
            }
        });

        window.addEventListener('blur', () => {
            document.body.classList.add('app-blurred');
            
            // Update user status if connected
            if (window.SocketManager?.isConnected) {
                window.SocketManager.updateUserStatus('away');
            }
        });

        // Handle network status
        window.addEventListener('online', () => {
            document.body.classList.remove('offline');
            Utils.Notifications.success('Conexión restaurada', 3000);
        });

        window.addEventListener('offline', () => {
            document.body.classList.add('offline');
            Utils.Notifications.warning('Sin conexión a internet', 4000);
        });

        // Handle resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });

        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
    }

    setupTabs() {
        // Setup tab switching functionality
        document.querySelectorAll('.tab-button').forEach(tabButton => {
            tabButton.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = tabButton.dataset.tab;
                if (tabName) {
                    this.switchTab(tabName);
                }
            });
        });
    }

    switchTab(tabName) {
        // Prevent multiple rapid switches
        if (this.isTabSwitching) return;
        this.isTabSwitching = true;
        
        // Smooth transition timing
        const transitionStart = performance.now();
        
        // Pre-cache content if possible
        this.precacheTabContent(tabName);
        
        // Update tab buttons with smooth transition
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Get current and target tab content
        const currentTab = document.querySelector('.tab-content.active');
        const targetTab = document.getElementById(`${tabName}-tab`);
        
        if (currentTab && targetTab && currentTab !== targetTab) {
            // Smooth transition between tabs
            this.performSmoothTabTransition(currentTab, targetTab, tabName);
        } else {
            // Simple toggle if no transition needed
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.toggle('active', content.id === `${tabName}-tab`);
            });
            this.loadTabContent(tabName);
        }
        
        // Force ensure correct tab activation after any transition
        this.ensureTabActivation(tabName);
        
        // Dispatch custom event for immediate UI updates
        document.dispatchEvent(new CustomEvent('tab:changed', {
            detail: { tabName: tabName }
        }));
        
        console.log(`Switched to tab: ${tabName}`);
        
        // Reset switch flag after transition
        setTimeout(() => {
            this.isTabSwitching = false;
        }, 150);
    }

    loadTabContent(tabName) {
        // Check if content is already cached/loaded
        const isContentCached = this.isTabContentCached(tabName);
        
        switch (tabName) {
            case 'contacts':
                if (!isContentCached) {
                    this.loadContactsWithPreload(tabName);
                } else {
                    // Refresh cached content smoothly
                    this.refreshCachedContacts();
                }
                break;
            case 'requests':
                if (window.contactsManager) {
                    if (!isContentCached) {
                        window.contactsManager.loadContactRequests();
                    }
                }
                break;
            case 'chats':
                // Check if conversations are already rendered
                if (!isContentCached) {
                    this.waitForChatManagerAndRender();
                } else {
                    // Just ensure current data is visible
                    this.refreshCachedChats();
                }
                break;
            default:
                break;
        }
    }

    async waitForChatManagerAndRender() {
        let attempts = 0;
        const maxAttempts = 20;
        
        while (attempts < maxAttempts) {
            const chatManager = window.chatManager || window.Chat;
            if (chatManager && chatManager.initialized !== false) {
                console.log('✅ Chat manager ready, rendering conversations');
                if (chatManager.renderConversations) {
                    chatManager.renderConversations();
                } else if (chatManager.loadConversations) {
                    // If renderConversations doesn't exist, try loading conversations
                    await chatManager.loadConversations();
                }
                return;
            }
            
            attempts++;
            console.log(`⏳ Waiting for chat manager to render conversations... attempt ${attempts}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.error('❌ Could not render conversations - chat manager not available');
    }

    async loadContactsWithPreload() {
        const contactsList = document.getElementById('contacts-list');
        if (!contactsList) return;
        
        // Check if we have cached contacts first
        if (this.contactsCache && this.contactsCache.length > 0) {
            this.displayCachedContacts(contactsList);
            return;
        }
        
        // Show optimized loading state
        this.showContactsLoadingState(contactsList);
        
        // Load contacts with improved error handling
        if (window.contactsManager) {
            try {
                await window.contactsManager.loadContacts();
                this.cacheContactsData();
                
                // Smooth transition from loading to content
                this.transitionFromLoadingToContent(contactsList);
            } catch (error) {
                console.error('Error loading contacts:', error);
                this.showContactsErrorState(contactsList);
            }
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Global shortcuts
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case 'k':
                        event.preventDefault();
                        this.openQuickSearch();
                        break;
                    case 'n':
                        event.preventDefault();
                        this.openNewChat();
                        break;
                    case ',':
                        event.preventDefault();
                        this.openSettings();
                        break;
                    case 'Enter':
                        if (event.shiftKey) {
                            // Shift+Ctrl+Enter - send message
                            event.preventDefault();
                            window.Chat?.sendCurrentMessage();
                        }
                        break;
                }
            }

            // Other shortcuts
            switch (event.key) {
                case 'Escape':
                    this.handleEscapeKey(event);
                    break;
                case 'F1':
                    event.preventDefault();
                    this.showHelp();
                    break;
            }

            // Arrow navigation in chat list
            if (event.target.closest('.chat-list, .contacts-list')) {
                this.handleArrowNavigation(event);
            }
        });
    }

    handleEscapeKey(event) {
        // Close any open modals
        const openModal = Utils.$('.modal:not(.hidden)');
        if (openModal) {
            event.preventDefault();
            this.closeModal(openModal);
            return;
        }

        // Close any open dropdowns
        const openDropdown = Utils.$('.dropdown.open, .context-menu:not(.hidden)');
        if (openDropdown) {
            event.preventDefault();
            openDropdown.classList.add('hidden');
            openDropdown.classList.remove('open');
            return;
        }

        // Clear search if focused
        const searchInput = Utils.$('#chat-search');
        if (searchInput && document.activeElement === searchInput && searchInput.value) {
            event.preventDefault();
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            return;
        }

        // Clear message input selection/editing
        if (window.Chat?.clearCurrentAction) {
            event.preventDefault();
            window.Chat.clearCurrentAction();
        }
    }

    handleArrowNavigation(event) {
        if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;

        const items = event.target.closest('.tab-content').querySelectorAll('.chat-item, .contact-item');
        const currentIndex = Array.from(items).findIndex(item => item.classList.contains('active'));
        
        let newIndex;
        if (event.key === 'ArrowUp') {
            newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        } else {
            newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        }

        if (items[newIndex]) {
            event.preventDefault();
            items.forEach(item => item.classList.remove('active'));
            items[newIndex].classList.add('active');
            items[newIndex].click();
            items[newIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    openQuickSearch() {
        const searchInput = Utils.$('#chat-search');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    openNewChat() {
        const newChatBtn = Utils.$('#new-chat-btn');
        if (newChatBtn) {
            newChatBtn.click();
        }
    }

    openSettings() {
        const settingsBtn = Utils.$('#settings-btn');
        if (settingsBtn) {
            settingsBtn.click();
        }
    }

    showHelp() {
        const helpModal = Utils.$('#help-modal');
        if (helpModal) {
            helpModal.classList.remove('hidden');
        } else {
            // Create help modal dynamically
            this.createHelpModal();
        }
    }

    createHelpModal() {
        const helpContent = `
            <div class="help-section">
                <h4>Atajos de teclado</h4>
                <div class="shortcut-list">
                    <div class="shortcut"><kbd>Ctrl+K</kbd> <span>Buscar chats</span></div>
                    <div class="shortcut"><kbd>Ctrl+N</kbd> <span>Nuevo chat</span></div>
                    <div class="shortcut"><kbd>Ctrl+,</kbd> <span>Configuración</span></div>
                    <div class="shortcut"><kbd>Shift+Ctrl+Enter</kbd> <span>Enviar mensaje</span></div>
                    <div class="shortcut"><kbd>Esc</kbd> <span>Cerrar/Cancelar</span></div>
                    <div class="shortcut"><kbd>↑/↓</kbd> <span>Navegar chats</span></div>
                </div>
            </div>
            
            <div class="help-section">
                <h4>Funciones</h4>
                <ul>
                    <li>Mensajes en tiempo real con cifrado</li>
                    <li>Indicadores de escritura y estado de mensajes</li>
                    <li>Reacciones y respuestas a mensajes</li>
                    <li>Gestión de contactos avanzada</li>
                    <li>Archivos adjuntos y multimedia</li>
                    <li>Temas claro y oscuro</li>
                    <li>Notificaciones push</li>
                    <li>Modo sin conexión</li>
                </ul>
            </div>
            
            <div class="help-section">
                <h4>Privacidad y Seguridad</h4>
                <p>Todos los mensajes están cifrados de extremo a extremo. Tu privacidad es nuestra prioridad.</p>
            </div>
        `;

        const modal = Utils.createElement('div', {
            id: 'help-modal',
            className: 'modal',
            innerHTML: `
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Ayuda - VigiChat</h3>
                        <button class="close-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${helpContent}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-primary" data-close-modal>Entendido</button>
                    </div>
                </div>
            `
        });

        document.body.appendChild(modal);
        this.setupModal(modal);
    }

    setupModal(modal) {
        const closeButtons = modal.querySelectorAll('.close-modal, [data-close-modal]');
        const overlay = modal.querySelector('.modal-overlay');

        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.closeModal(modal));
        });

        overlay.addEventListener('click', () => this.closeModal(modal));

        // Trap focus within modal
        modal.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                this.trapFocus(event, modal);
            }
        });
    }

    closeModal(modal) {
        modal.style.animation = 'modalSlideOut 0.3s ease-in-out forwards';
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.style.animation = '';
        }, 300);
    }

    trapFocus(event, container) {
        const focusableElements = container.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    }

    handleResize() {
        // Update layout based on screen size
        const isMobile = window.innerWidth <= 768;
        document.body.classList.toggle('mobile', isMobile);
        
        // Notify other components
        window.dispatchEvent(new CustomEvent('app:resize', {
            detail: { width: window.innerWidth, height: window.innerHeight, isMobile }
        }));
    }

    handleOrientationChange() {
        // Force layout recalculation
        document.body.classList.add('orientation-changing');
        
        setTimeout(() => {
            document.body.classList.remove('orientation-changing');
            this.handleResize();
        }, 100);
    }

    handleBeforeUnload() {
        // Save current state
        const currentConversation = window.Chat?.getCurrentConversation();
        if (currentConversation) {
            Utils.Storage.set('lastConversation', currentConversation._id);
        }

        // Save draft messages
        const messageInput = Utils.$('#message-input');
        if (messageInput && messageInput.textContent.trim()) {
            Utils.Storage.set('messageDraft', {
                conversationId: currentConversation?._id,
                content: messageInput.textContent.trim(),
                timestamp: Date.now()
            });
        }

        // Disconnect socket gracefully
        if (window.SocketManager?.isConnected) {
            window.SocketManager.updateUserStatus('offline');
            window.SocketManager.disconnect();
        }
    }

    hasUnsavedChanges() {
        // Check for draft messages
        const messageInput = Utils.$('#message-input');
        if (messageInput && messageInput.textContent.trim()) {
            return true;
        }

        // Check for unsaved profile changes
        const profileForm = Utils.$('#profile-form');
        if (profileForm && profileForm.classList.contains('modified')) {
            return true;
        }

        return false;
    }

    async unregisterServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                    console.log('Service Worker unregistered:', registration.scope);
                }
                
                // Clear all caches
                const cacheNames = await caches.keys();
                for (let cacheName of cacheNames) {
                    await caches.delete(cacheName);
                    console.log('Cache deleted:', cacheName);
                }
            } catch (error) {
                console.log('Service Worker unregister failed:', error);
            }
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);
                
                // Handle updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    showUpdateNotification() {
        const notification = Utils.Notifications.show(
            'Nueva versión disponible. <button onclick="location.reload()">Actualizar</button>',
            'info',
            0 // Don't auto-hide
        );
        
        notification.classList.add('update-notification');
    }

    handleAppInstall() {
        let deferredPrompt;

        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            deferredPrompt = event;
            this.showInstallButton();
        });

        window.addEventListener('appinstalled', () => {
            console.log('App installed');
            Utils.Notifications.success('App instalada correctamente!', 3000);
            this.hideInstallButton();
        });
    }

    showInstallButton() {
        const installBtn = Utils.$('#install-btn');
        if (installBtn) {
            installBtn.classList.remove('hidden');
            installBtn.addEventListener('click', this.promptInstall.bind(this));
        }
    }

    hideInstallButton() {
        const installBtn = Utils.$('#install-btn');
        if (installBtn) {
            installBtn.classList.add('hidden');
        }
    }

    async promptInstall() {
        const deferredPrompt = window.deferredPrompt;
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        
        if (result.outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }
        
        window.deferredPrompt = null;
        this.hideInstallButton();
    }

    setupPerformanceMonitoring() {
        // Monitor performance
        if ('performance' in window) {
            // Log navigation timing
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const navigation = performance.getEntriesByType('navigation')[0];
                    if (navigation) {
                        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
                        const load = navigation.loadEventEnd - navigation.loadEventStart;
                        const total = navigation.loadEventEnd - navigation.navigationStart;
                        
                        console.log('Navigation timing:', {
                            domContentLoaded: domContentLoaded || 0,
                            load: load || 0,
                            total: total || 0
                        });
                    }
                }, 0);
            });

            // Monitor memory usage (if available) - only when no conversation is open
            if ('memory' in performance) {
                setInterval(() => {
                    // Only show memory usage when no conversation is open
                    const hasOpenConversation = window.Chat && window.Chat.getCurrentConversation && window.Chat.getCurrentConversation();
                    
                    if (!hasOpenConversation) {
                        const memory = performance.memory;
                        console.log('Memory usage:', {
                            used: Math.round(memory.usedJSHeapSize / 1048576),
                            total: Math.round(memory.totalJSHeapSize / 1048576),
                            limit: Math.round(memory.jsHeapSizeLimit / 1048576)
                        });
                    }
                }, 60000); // Every minute
            }
        }
    }

    setupEventDrivenAlerts() {
        // Setup event-driven notification system
        console.log('Setting up event-driven alerts...');

        // Listen for authentication events
        Utils.EventBus.on('auth:login-success', (data) => {
            Utils.Notifications.success('¡Bienvenido de vuelta!', 3000, { 
                userId: data?.user?.id,
                source: 'auth' 
            });
        });

        Utils.EventBus.on('auth:login-failed', (data) => {
            Utils.Notifications.error(data?.message || 'Error al iniciar sesión', 4000, { 
                source: 'auth',
                error: data?.error 
            });
        });

        Utils.EventBus.on('auth:logout', () => {
            Utils.Notifications.info('Sesión cerrada correctamente', 2500, { source: 'auth' });
        });

        // Listen for connection events
        Utils.EventBus.on('connection:connected', () => {
            Utils.Notifications.success('Conectado al servidor', 3000);
        });

        Utils.EventBus.on('connection:disconnected', () => {
            Utils.Notifications.warning('Conexión perdida. Reintentando...', 4000);
        });

        Utils.EventBus.on('connection:reconnected', () => {
            Utils.Notifications.success('Conexión restablecida', 3000);
        });

        // Listen for message events
        Utils.EventBus.on('message:received', (data) => {
            if (data?.isImportant) {
                Utils.Notifications.info(`Nuevo mensaje de ${data.sender}`, 3500);
            }
        });

        Utils.EventBus.on('message:sent', (data) => {
            if (data?.showConfirmation) {
                Utils.Notifications.success('Mensaje enviado', 2500);
            }
        });

        // Listen for contact events
        Utils.EventBus.on('contact:request-received', (data) => {
            Utils.Notifications.info(`Nueva solicitud de contacto de ${data.sender}`, 4000);
        });

        Utils.EventBus.on('contact:request-accepted', (data) => {
            Utils.Notifications.success(`${data.contact} aceptó tu solicitud`, 4000);
        });

        // Listen for error events
        Utils.EventBus.on('error:network', (data) => {
            Utils.Notifications.error('Error de conexión. Verificando estado de la red...', 4500);
        });

        Utils.EventBus.on('error:api', (data) => {
            const message = data?.userMessage || 'Error en el servidor';
            Utils.Notifications.error(message, 4000);
        });

        // Listen for file upload events
        Utils.EventBus.on('upload:started', (data) => {
            Utils.Notifications.info(`Subiendo archivo: ${data.filename}`, 3000);
        });

        Utils.EventBus.on('upload:completed', (data) => {
            Utils.Notifications.success(`Archivo subido: ${data.filename}`, 3000);
        });

        Utils.EventBus.on('upload:failed', (data) => {
            Utils.Notifications.error(`Error al subir: ${data.filename}`, 5000, { 
                source: 'upload',
                uploadId: data.id,
                error: data.error 
            });
        });

        // Setup global notification event handlers
        Utils.EventBus.on('notification:before-show', (data) => {
            // Optional: Log all notifications for debugging
            if (window.location.search.includes('debug=notifications')) {
                console.log('Notification:', data);
            }
        });

        Utils.EventBus.on('notification:shown', (data) => {
            // Play sound for important notifications
            if (data.type === 'error' || data.eventData?.isImportant) {
                Utils.Sound.error();
            } else if (data.type === 'success') {
                if (Utils.Sound && typeof Utils.Sound.success === 'function') {
                    Utils.Sound.success();
                }
            }
        });

        console.log('Event-driven alerts configured successfully');
    }

    // Public methods
    getVersion() {
        return '1.0.0';
    }

    getStats() {
        return {
            initialized: this.initialized,
            theme: Utils.Theme.current,
            online: navigator.onLine,
            connection: window.SocketManager?.getConnectionStatus(),
            memory: 'memory' in performance ? performance.memory : null
        };
    }

    // Initialize user status display
    initializeUserStatusDisplay() {
        console.log('Initializing user status display...');
        
        // Ensure current user status is green
        const currentUserStatus = document.getElementById('current-user-status');
        if (currentUserStatus) {
            currentUserStatus.className = 'status-text online';
            currentUserStatus.style.color = '#10b981 !important';
            currentUserStatus.textContent = 'En línea';
        }
        
        // Update all online status elements
        const onlineElements = document.querySelectorAll('.status.online, .status-text.online, span.online');
        onlineElements.forEach(element => {
            element.style.color = '#10b981 !important';
            element.style.fontWeight = '500';
        });
        
        console.log('User status display initialized');
    }

    // ========================
    // TAB CACHING & SMOOTH TRANSITIONS
    // ========================

    initializeTabCaching() {
        this.tabCache = {
            contacts: { loaded: false, data: null, timestamp: null },
            chats: { loaded: false, data: null, timestamp: null },
            requests: { loaded: false, data: null, timestamp: null }
        };
        this.contactsCache = null;
        this.isTabSwitching = false;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    }

    isTabContentCached(tabName) {
        const cache = this.tabCache[tabName];
        if (!cache || !cache.loaded) return false;
        
        // Check if cache is still fresh
        const now = Date.now();
        return cache.timestamp && (now - cache.timestamp) < this.CACHE_DURATION;
    }

    cacheContactsData() {
        const contactsList = document.getElementById('contacts-list');
        if (contactsList) {
            this.contactsCache = Array.from(contactsList.querySelectorAll('.contact-item:not(.contact-skeleton)'));
            this.tabCache.contacts = {
                loaded: true,
                data: this.contactsCache,
                timestamp: Date.now()
            };
        }
    }

    performSmoothTabTransition(currentTab, targetTab, tabName) {
        // Start transition
        currentTab.style.opacity = '0.7';
        currentTab.style.transform = 'translateX(-10px)';
        
        setTimeout(() => {
            // Hide current tab
            currentTab.classList.remove('active');
            
            // Prepare target tab
            targetTab.style.opacity = '0';
            targetTab.style.transform = 'translateX(10px)';
            targetTab.classList.add('active');
            
            // Load content before showing
            this.loadTabContent(tabName);
            
            // Smooth entrance
            requestAnimationFrame(() => {
                targetTab.style.transition = 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)';
                targetTab.style.opacity = '1';
                targetTab.style.transform = 'translateX(0)';
                
                // Reset current tab styles
                currentTab.style.transition = '';
                currentTab.style.opacity = '';
                currentTab.style.transform = '';
            });
            
        }, 75);
    }

    precacheTabContent(tabName) {
        // Pre-cache content for faster switching
        if (tabName === 'contacts' && window.contactsManager && !this.isTabContentCached('contacts')) {
            // Preload contacts in background
            setTimeout(() => {
                if (window.contactsManager.loadContacts) {
                    window.contactsManager.loadContacts().catch(console.error);
                }
            }, 50);
        }
        
        if (tabName === 'chats' && window.chatManager && !this.isTabContentCached('chats')) {
            // Ensure conversations are loaded
            setTimeout(() => {
                if (window.chatManager.renderConversations) {
                    window.chatManager.renderConversations();
                }
            }, 50);
        }
    }

    displayCachedContacts(contactsList) {
        if (this.contactsCache && this.contactsCache.length > 0) {
            contactsList.innerHTML = '';
            this.contactsCache.forEach(contact => {
                contactsList.appendChild(contact.cloneNode(true));
            });
            
            // Refresh with live data in background
            setTimeout(() => {
                if (window.contactsManager) {
                    window.contactsManager.loadContacts().catch(console.error);
                }
            }, 100);
        }
    }

    showContactsLoadingState(contactsList) {
        contactsList.innerHTML = `
            <div class="loading-contacts" style="opacity: 0; transform: translateY(10px);">
                <div class="contact-item contact-skeleton">
                    <div class="contact-avatar-container">
                        <div class="contact-avatar skeleton-avatar"></div>
                    </div>
                    <div class="contact-info">
                        <div class="contact-details">
                            <div class="contact-name skeleton-line"></div>
                            <div class="contact-username skeleton-line-small"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Smooth entrance
        requestAnimationFrame(() => {
            const loading = contactsList.querySelector('.loading-contacts');
            if (loading) {
                loading.style.transition = 'all 0.2s ease-out';
                loading.style.opacity = '1';
                loading.style.transform = 'translateY(0)';
            }
        });
    }

    transitionFromLoadingToContent(contactsList) {
        const loading = contactsList.querySelector('.loading-contacts');
        if (loading) {
            loading.style.opacity = '0';
            loading.style.transform = 'translateY(-10px)';
            
            setTimeout(() => {
                const newItems = contactsList.querySelectorAll('.contact-item:not(.contact-skeleton)');
                newItems.forEach((item, index) => {
                    item.style.opacity = '0';
                    item.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        item.style.transition = 'all 0.2s ease-out';
                        item.style.opacity = '1';
                        item.style.transform = 'translateY(0)';
                    }, index * 50);
                });
            }, 100);
        }
    }

    showContactsErrorState(contactsList) {
        contactsList.innerHTML = `
            <div class="empty-state" style="opacity: 0;">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error al cargar contactos</h3>
                <p>Intenta actualizar la página</p>
            </div>
        `;
        
        requestAnimationFrame(() => {
            const errorState = contactsList.querySelector('.empty-state');
            if (errorState) {
                errorState.style.transition = 'opacity 0.3s ease-out';
                errorState.style.opacity = '1';
            }
        });
    }

    refreshCachedContacts() {
        if (window.contactsManager) {
            // Refresh in background without showing loading state
            window.contactsManager.loadContacts().catch(console.error);
        }
    }

    refreshCachedChats() {
        if (window.chatManager && window.chatManager.renderConversations) {
            // Gentle refresh of existing conversations
            window.chatManager.renderConversations();
        }
    }

    ensureTabActivation(tabName) {
        // Force ensure the correct tab is active and clickable
        setTimeout(() => {
            console.log(`Ensuring tab activation for: ${tabName}`);
            
            // Remove active from all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Add active to target tab
            const targetTab = document.getElementById(`${tabName}-tab`);
            if (targetTab) {
                targetTab.classList.add('active');
                
                // Force pointer events
                targetTab.style.pointerEvents = 'all';
                targetTab.style.zIndex = '10';
                
                console.log(`Tab ${tabName} activated with pointer events enabled`);
            } else {
                console.error(`Target tab not found: ${tabName}-tab`);
            }
            
            // Ensure tab buttons are also correctly set
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tabName);
            });
            
        }, 100); // Small delay to ensure DOM updates
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.App = new VigiChatApp();
    });
} else {
    window.App = new VigiChatApp();
}

// Export for debugging
window.VigiChatApp = VigiChatApp;