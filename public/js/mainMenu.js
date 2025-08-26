/**
 * Main Menu Manager
 * Handles the main menu dropdown functionality
 */

class MainMenuManager {
    constructor() {
        this.menuBtn = null;
        this.dropdown = null;
        this.isOpen = false;
        
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
        this.menuBtn = document.getElementById('main-menu-btn');
        this.dropdown = document.getElementById('main-menu-dropdown');

        if (!this.menuBtn || !this.dropdown) {
            console.warn('Main menu elements not found, retrying...');
            // Retry after a delay in case elements are not ready yet
            setTimeout(() => {
                this.menuBtn = document.getElementById('main-menu-btn');
                this.dropdown = document.getElementById('main-menu-dropdown');
                
                if (this.menuBtn && this.dropdown) {
                    console.log('Main menu elements found on retry');
                    this.setupEventListeners();
                } else {
                    console.warn('Main menu elements still not found after retry');
                }
            }, 500);
            return;
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Main menu button click
        this.menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });

        // Menu item click handlers
        document.getElementById('profile-settings')?.addEventListener('click', () => {
            this.handleProfileSettings();
            this.closeMenu();
        });

        document.getElementById('add-contact-menu')?.addEventListener('click', () => {
            this.handleAddContact();
            this.closeMenu();
        });

        document.getElementById('blocked-contacts-menu')?.addEventListener('click', () => {
            this.closeMenu(); // Close menu first
            // Small delay to allow menu to close before opening modal
            setTimeout(() => {
                this.handleBlockedContacts();
            }, 100);
        });

        document.getElementById('help-menu')?.addEventListener('click', () => {
            this.handleHelp();
            this.closeMenu();
        });

        document.getElementById('logout-menu')?.addEventListener('click', () => {
            this.handleLogout();
            this.closeMenu();
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.dropdown.contains(e.target) && !this.menuBtn.contains(e.target)) {
                this.closeMenu();
            }
        });

        // Close menu on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMenu();
            }
        });
    }

    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        if (!this.dropdown) return;

        this.dropdown.classList.remove('hidden');
        this.isOpen = true;
        
        // Adjust position if in mobile view
        if (this.isMobileView()) {
            this.adjustMobilePosition();
        }
        
        // Focus first menu item for accessibility
        const firstMenuItem = this.dropdown.querySelector('.menu-item');
        if (firstMenuItem) {
            setTimeout(() => firstMenuItem.focus(), 100);
        }
    }
    
    isMobileView() {
        return window.innerWidth <= 768;
    }
    
    adjustMobilePosition() {
        if (!this.dropdown || !this.menuBtn) return;
        
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('mobile-active')) {
            // Ensure dropdown is positioned correctly within the mobile sidebar
            this.dropdown.style.position = 'absolute';
            this.dropdown.style.top = 'calc(100% + 5px)';
            this.dropdown.style.right = '8px';
            this.dropdown.style.left = 'auto';
            this.dropdown.style.zIndex = '1001';
        }
    }

    closeMenu() {
        if (!this.dropdown) return;

        this.dropdown.classList.add('hidden');
        this.isOpen = false;
    }

    handleProfileSettings() {
        // Open user profile settings modal
        if (window.userProfileSettingsManager) {
            window.userProfileSettingsManager.openModal();
        } else if (window.UserProfileSettingsManager) {
            // Try to create instance if class exists
            try {
                window.userProfileSettingsManager = new window.UserProfileSettingsManager();
                window.userProfileSettingsManager.openModal();
            } catch (error) {
                console.error('Error creating UserProfileSettingsManager:', error);
                Utils.Notifications.error('Error: No se pudo inicializar el modal de perfil');
            }
        } else {
            // Wait for scripts to load
            let attempts = 0;
            const maxAttempts = 10;
            const checkAndOpen = () => {
                attempts++;
                if (window.userProfileSettingsManager) {
                    window.userProfileSettingsManager.openModal();
                } else if (window.UserProfileSettingsManager && attempts < maxAttempts) {
                    try {
                        window.userProfileSettingsManager = new window.UserProfileSettingsManager();
                        window.userProfileSettingsManager.openModal();
                    } catch (error) {
                        setTimeout(checkAndOpen, 100);
                    }
                } else if (attempts < maxAttempts) {
                    setTimeout(checkAndOpen, 100);
                } else {
                    console.error('UserProfileSettingsManager not available after', attempts, 'attempts');
                    Utils.Notifications.error('Error: No se pudo abrir el modal de perfil');
                }
            };
            checkAndOpen();
        }
    }

    handleAddContact() {
        // Use the existing add contact functionality
        if (window.contactsManager) {
            window.contactsManager.showAddContactModal();
        } else {
            // Fallback: trigger add contact button
            const addContactBtn = document.getElementById('add-contact-btn');
            if (addContactBtn) {
                addContactBtn.click();
            }
        }
    }

    handleBlockedContacts() {
        console.log('handleBlockedContacts called');
        console.log('window.blockedContactsManager:', window.blockedContactsManager);
        
        // Try to initialize if not available
        if (!window.blockedContactsManager) {
            console.log('blockedContactsManager not available, trying to initialize...');
            if (window.initializeBlockedContactsManager) {
                window.initializeBlockedContactsManager();
            } else if (window.BlockedContactsManager) {
                try {
                    window.blockedContactsManager = new window.BlockedContactsManager();
                    console.log('Manually created blockedContactsManager');
                } catch (error) {
                    console.error('Error creating blockedContactsManager:', error);
                }
            }
        }
        
        // Use the existing blocked contacts functionality
        if (window.blockedContactsManager) {
            console.log('Opening blocked contacts modal...');
            window.blockedContactsManager.openModal();
        } else {
            console.warn('blockedContactsManager still not available after initialization attempts');
            // Try direct modal manipulation as fallback
            this.tryDirectModalOpen();
        }
    }

    tryDirectModalOpen() {
        console.log('Trying direct modal manipulation...');
        const modal = document.getElementById('blocked-contacts-modal');
        if (modal) {
            console.log('Found modal, opening directly...');
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
            document.body.style.overflow = 'hidden';
            
            // Load blocked contacts directly via API
            this.loadBlockedContactsDirectly();
        } else {
            console.error('Modal element not found');
            if (window.Utils && window.Utils.Notifications) {
                window.Utils.Notifications.error('Error: No se encontró el modal de contactos bloqueados');
            } else {
                alert('Error: No se encontró el modal de contactos bloqueados');
            }
        }
    }

    async loadBlockedContactsDirectly() {
        const blockedList = document.getElementById('blocked-contacts-list');
        const loadingState = document.getElementById('blocked-loading');
        const emptyState = document.getElementById('empty-blocked-state');
        
        if (!blockedList) return;
        
        // Show loading
        if (loadingState) loadingState.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
        
        try {
            const response = await API.Contacts.getBlockedContacts();
            console.log('Direct blocked contacts response:', response);
            
            if (response.success) {
                const blockedContacts = response.data || [];
                console.log('Direct loaded contacts:', blockedContacts.length);
                
                // Clear existing content
                const contactItems = blockedList.querySelectorAll('.blocked-contact-item');
                contactItems.forEach(item => item.remove());
                
                if (blockedContacts.length === 0) {
                    if (emptyState) emptyState.classList.remove('hidden');
                } else {
                    blockedContacts.forEach(contact => {
                        const element = this.createBlockedContactElement(contact);
                        blockedList.appendChild(element);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading blocked contacts directly:', error);
            if (window.Utils && window.Utils.Notifications) {
                window.Utils.Notifications.error('Error al cargar contactos bloqueados');
            }
        } finally {
            if (loadingState) loadingState.classList.add('hidden');
        }
    }

    createBlockedContactElement(contact) {
        const contactDiv = document.createElement('div');
        contactDiv.className = 'blocked-contact-item';
        contactDiv.dataset.userId = contact._id;

        contactDiv.innerHTML = `
            <div class="contact-avatar-container">
                <img class="contact-avatar" src="${contact.avatar || '/images/user-placeholder-40.svg'}" alt="${contact.fullName}" />
                <div class="status-indicator blocked">
                    <i class="fas fa-ban"></i>
                </div>
            </div>
            <div class="contact-info">
                <div class="contact-name">${contact.fullName || contact.username}</div>
                <div class="contact-username">@${contact.username}</div>
                <div class="contact-status blocked-status">Bloqueado ${this.formatBlockedDate(contact.blockedAt)}</div>
            </div>
            <div class="contact-action-buttons">
                <button class="contact-action-btn unblock-btn" data-user-id="${contact._id}" data-tooltip="Desbloquear">
                    <i class="fas fa-unlock"></i>
                </button>
                <button class="contact-action-btn remove-btn" data-user-id="${contact._id}" data-tooltip="Eliminar permanentemente">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Add event listeners
        const unblockBtn = contactDiv.querySelector('.unblock-btn');
        const removeBtn = contactDiv.querySelector('.remove-btn');
        
        unblockBtn.addEventListener('click', () => this.handleDirectUnblock(contact));
        removeBtn.addEventListener('click', () => this.handleDirectRemove(contact));

        // Setup smart tooltip positioning
        this.setupTooltipPositioning(contactDiv);

        return contactDiv;
    }

    setupTooltipPositioning(contactDiv) {
        const buttons = contactDiv.querySelectorAll('.contact-action-btn');
        
        buttons.forEach((button, index) => {
            button.addEventListener('mouseenter', () => {
                this.adjustTooltipPosition(button, contactDiv, index);
            });
        });
    }

    adjustTooltipPosition(button, contactDiv, buttonIndex) {
        // Remove any existing positioning classes
        button.classList.remove('tooltip-left', 'tooltip-right');
        
        const modalContent = button.closest('.modal-content');
        if (!modalContent) return;
        
        const modalRect = modalContent.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        
        // Check if tooltip would overflow on the right
        const tooltipWidth = 150; // Estimated tooltip width
        const rightSpace = modalRect.right - buttonRect.right;
        const leftSpace = buttonRect.left - modalRect.left;
        
        // If it's the last button and there's not enough space on top/right
        if (buttonIndex === 1 && rightSpace < tooltipWidth) {
            button.classList.add('tooltip-left');
        } else if (buttonIndex === 0 && leftSpace < tooltipWidth) {
            button.classList.add('tooltip-right');
        }
        // Default positioning (top) is handled by CSS
    }

    formatBlockedDate(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            
            if (days === 0) {
                return 'hoy';
            } else if (days === 1) {
                return 'ayer';
            } else if (days < 30) {
                return `hace ${days} d`;
            } else {
                return date.toLocaleDateString('es-ES');
            }
        } catch (error) {
            return '';
        }
    }

    async handleDirectUnblock(contact) {
        if (!(await Utils.ConfirmationModal.unblock(contact.fullName || contact.username))) {
            return;
        }

        try {
            const response = await API.Contacts.unblockContact(contact._id);
            if (response.success) {
                // Reload the list
                this.loadBlockedContactsDirectly();
                
                if (window.Utils && window.Utils.Notifications) {
                    window.Utils.Notifications.success(`${contact.fullName || contact.username} ha sido desbloqueado`);
                }
            }
        } catch (error) {
            console.error('Error unblocking:', error);
            if (window.Utils && window.Utils.Notifications) {
                window.Utils.Notifications.error('Error al desbloquear usuario');
            }
        }
    }

    async handleDirectRemove(contact) {
        if (!(await Utils.ConfirmationModal.deletePermanently(contact.fullName || contact.username))) {
            return;
        }

        try {
            const response = await API.Contacts.removeContact(contact._id);
            if (response.success) {
                // Reload the list
                this.loadBlockedContactsDirectly();
                
                if (window.Utils && window.Utils.Notifications) {
                    window.Utils.Notifications.success(`${contact.fullName || contact.username} ha sido eliminado`);
                }
            }
        } catch (error) {
            console.error('Error removing:', error);
            if (window.Utils && window.Utils.Notifications) {
                window.Utils.Notifications.error('Error al eliminar usuario');
            }
        }
    }

    handleHelp() {
        // Show help information
        if (window.Utils && window.Utils.Notifications) {
            window.Utils.Notifications.info(`
                <strong>VigiChat - Ayuda</strong><br>
                <small>• Use el menú para acceder a todas las funciones</small><br>
                <small>• Puede agregar contactos desde "Agregar contacto"</small><br>
                <small>• Los contactos bloqueados aparecen en "Contactos bloqueados"</small><br>
                <small>• Configure su perfil en "Ajustes de perfil"</small>
            `, 8000);
        } else {
            alert('VigiChat - Ayuda\n\n• Use el menú para acceder a todas las funciones\n• Puede agregar contactos desde "Agregar contacto"\n• Los contactos bloqueados aparecen en "Contactos bloqueados"\n• Configure su perfil en "Ajustes de perfil"');
        }
    }

    handleLogout() {
        // Close session properly through SocketManager
        console.log('Logout initiated from main menu');
        
        if (window.SocketManager) {
            // Use the new closeSession method which handles proper session termination
            window.SocketManager.closeSession();
        } else {
            // Fallback if SocketManager not available
            this.fallbackLogout();
        }
    }
    
    fallbackLogout() {
        console.log('Fallback logout method');
        
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
}

// Setup modal close functionality
function setupBlockedContactsModalClose() {
    const modal = document.getElementById('blocked-contacts-modal');
    if (!modal) return;
    
    const closeBtn = modal.querySelector('.close-modal');
    const overlay = modal.querySelector('.modal-overlay');
    
    function closeModal() {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    if (overlay) {
        overlay.addEventListener('click', closeModal);
    }
    
    // ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });
}

// Initialize the main menu manager
let mainMenuManager;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        mainMenuManager = new MainMenuManager();
        setupBlockedContactsModalClose();
    });
} else {
    mainMenuManager = new MainMenuManager();
    setupBlockedContactsModalClose();
}

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MainMenuManager;
} else {
    window.MainMenuManager = MainMenuManager;
    window.mainMenuManager = mainMenuManager;
}