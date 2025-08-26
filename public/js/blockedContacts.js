/**
 * Blocked Contacts Manager
 * Handles the blocked contacts modal and functionality
 */

class BlockedContactsManager {
    constructor() {
        console.log('BlockedContactsManager constructor called');
        this.modal = null;
        this.modalOverlay = null;
        this.closeBtn = null;
        this.blockedList = null;
        this.loadingState = null;
        this.emptyState = null;
        this.openBtn = null;
        
        this.blockedContacts = [];
        this.isLoading = false;
        
        this.init();
        console.log('BlockedContactsManager constructor finished');
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupElements());
        } else {
            this.setupElements();
        }
    }

    setupElements() {
        this.modal = document.getElementById('blocked-contacts-modal');
        this.modalOverlay = this.modal?.querySelector('.modal-overlay');
        this.closeBtn = this.modal?.querySelector('.close-modal');
        this.blockedList = document.getElementById('blocked-contacts-list');
        this.loadingState = document.getElementById('blocked-loading');
        this.emptyState = document.getElementById('empty-blocked-state');
        // Note: openBtn is handled by mainMenu.js, not needed here

        if (!this.modal) {
            console.warn('Blocked contacts modal not found');
            return;
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Note: Open modal button is handled by mainMenu.js

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
    }

    async openModal() {
        console.log('BlockedContactsManager.openModal() called');
        console.log('this.modal:', this.modal);
        
        if (!this.modal) {
            console.error('Modal element not found');
            return;
        }

        // Calculate position relative to the menu
        this.positionModalBelowMenu();

        // Show modal
        console.log('Showing modal...');
        this.modal.classList.remove('hidden');
        setTimeout(() => {
            this.modal.classList.add('show');
        }, 10);

        document.body.style.overflow = 'hidden';

        // Load blocked contacts
        console.log('Loading blocked contacts...');
        await this.loadBlockedContacts();
        
        console.log('Blocked contacts modal opened successfully');
    }

    positionModalBelowMenu() {
        // Find the main menu button or dropdown
        const mainMenuBtn = document.getElementById('main-menu-btn');
        const mainMenuDropdown = document.getElementById('main-menu-dropdown');
        const sidebar = document.getElementById('sidebar');
        
        if (mainMenuBtn && sidebar) {
            const sidebarRect = sidebar.getBoundingClientRect();
            const menuRect = mainMenuBtn.getBoundingClientRect();
            
            const modalContent = this.modal.querySelector('.modal-content');
            if (modalContent) {
                // Position below the menu dropdown
                modalContent.style.top = `${menuRect.bottom + 5}px`;
                modalContent.style.left = `${sidebarRect.left + 10}px`;
                
                console.log('Modal positioned at:', {
                    top: menuRect.bottom + 5,
                    left: sidebarRect.left + 10
                });
            }
        } else {
            console.warn('Could not find menu elements for positioning');
        }
    }

    closeModal() {
        if (!this.modal) return;

        this.modal.classList.remove('show');
        setTimeout(() => {
            this.modal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);

        console.log('Blocked contacts modal closed');
    }

    isModalOpen() {
        return this.modal && !this.modal.classList.contains('hidden');
    }

    async loadBlockedContacts() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingState();

        try {
            console.log('Calling API.Contacts.getBlockedContacts()...');
            const response = await API.Contacts.getBlockedContacts();
            console.log('Blocked contacts response:', response);
            
            if (response.success) {
                this.blockedContacts = response.data || [];
                console.log('Blocked contacts loaded:', this.blockedContacts.length, 'contacts');
                this.renderBlockedContacts();
            } else {
                throw new Error(response.message || 'Error al cargar contactos bloqueados');
            }
        } catch (error) {
            console.error('Error loading blocked contacts:', error);
            this.showError('Error al cargar contactos bloqueados');
        } finally {
            this.isLoading = false;
            this.hideLoadingState();
        }
    }

    renderBlockedContacts() {
        if (!this.blockedList) return;

        // Clear existing content except loading and empty states
        const contactItems = this.blockedList.querySelectorAll('.blocked-contact-item');
        contactItems.forEach(item => item.remove());

        if (this.blockedContacts.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();

        this.blockedContacts.forEach(contact => {
            const contactElement = this.createBlockedContactElement(contact);
            this.blockedList.appendChild(contactElement);
        });
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
                <div class="contact-status blocked-status" title="Bloqueado el ${this.formatFullDate(contact.blockedAt)}">
                    Bloqueado ${this.formatBlockedDate(contact.blockedAt)}
                </div>
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

        // Add unblock functionality
        const unblockBtn = contactDiv.querySelector('.unblock-btn');
        unblockBtn.addEventListener('click', () => this.handleUnblockUser(contact));

        // Add remove functionality
        const removeBtn = contactDiv.querySelector('.remove-btn');
        removeBtn.addEventListener('click', () => this.handleRemoveUser(contact));

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
            const minutes = Math.floor(diff / (1000 * 60));
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const months = Math.floor(days / 30);
            const years = Math.floor(days / 365);
            
            if (minutes < 1) {
                return 'hace un momento';
            } else if (minutes < 60) {
                return `hace ${minutes} min`;
            } else if (hours < 24) {
                return `hace ${hours} h`;
            } else if (days === 1) {
                return 'ayer';
            } else if (days < 7) {
                return `hace ${days} d`;
            } else if (days < 30) {
                const weeks = Math.floor(days / 7);
                return `hace ${weeks} semana${weeks > 1 ? 's' : ''}`;
            } else if (months < 12) {
                return `hace ${months} mes${months > 1 ? 'es' : ''}`;
            } else {
                return `hace ${years} año${years > 1 ? 's' : ''}`;
            }
        } catch (error) {
            console.error('Error formatting blocked date:', error);
            return 'fecha desconocida';
        }
    }

    formatFullDate(dateString) {
        if (!dateString) return 'fecha desconocida';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting full date:', error);
            return 'fecha desconocida';
        }
    }

    async handleUnblockUser(contact) {
        const confirmed = await Utils.ConfirmationModal.unblock(contact.fullName || contact.username);
        
        if (!confirmed) return;

        try {
            // First unblock the contact
            const unblockResponse = await API.Contacts.unblockContact(contact._id);

            if (unblockResponse.success) {
                this.showNotification(`${contact.fullName || contact.username} ha sido desbloqueado`, 'success');
                
                // Remove from local array
                this.blockedContacts = this.blockedContacts.filter(c => 
                    c._id !== contact._id
                );
                
                // Re-render the list
                this.renderBlockedContacts();
                
                // Refresh contacts list if available
                if (window.contactsManager) {
                    window.contactsManager.loadContacts();
                    window.contactsManager.loadContactRequests();
                }
                
            } else {
                throw new Error(unblockResponse.message || 'Error al desbloquear usuario');
            }
        } catch (error) {
            console.error('Error unblocking user:', error);
            this.showNotification(`Error al desbloquear usuario: ${error.message}`, 'error');
        }
    }

    async handleRemoveUser(contact) {
        const confirmed = await Utils.ConfirmationModal.deletePermanently(contact.fullName || contact.username);
        
        if (!confirmed) return;

        try {
            const response = await API.Contacts.removeContact(contact._id);

            if (response.success) {
                // Remove from local array
                this.blockedContacts = this.blockedContacts.filter(c => 
                    c._id !== contact._id
                );
                
                // Re-render the list
                this.renderBlockedContacts();
                
                // Show success notification
                this.showNotification(`${contact.fullName || contact.username} ha sido eliminado permanentemente`, 'success');
                
                // Refresh contacts list if available
                if (window.contactsManager) {
                    window.contactsManager.loadContacts();
                }
                
            } else {
                throw new Error(response.message || 'Error al eliminar usuario');
            }
        } catch (error) {
            console.error('Error removing user:', error);
            this.showNotification(`Error al eliminar usuario: ${error.message}`, 'error');
        }
    }

    showLoadingState() {
        if (this.loadingState) {
            this.loadingState.classList.remove('hidden');
        }
        this.hideEmptyState();
    }

    hideLoadingState() {
        if (this.loadingState) {
            this.loadingState.classList.add('hidden');
        }
    }

    showEmptyState() {
        if (this.emptyState) {
            this.emptyState.classList.remove('hidden');
        }
    }

    hideEmptyState() {
        if (this.emptyState) {
            this.emptyState.classList.add('hidden');
        }
    }

    showError(message) {
        // You can implement a more sophisticated error display
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Use the Utils notification system
        if (window.Utils && window.Utils.Notifications) {
            window.Utils.Notifications[type](message);
        } else if (window.contactsManager && typeof window.contactsManager.showNotification === 'function') {
            // Fallback to contacts manager notification
            window.contactsManager.showNotification(message, type);
        } else {
            // Fallback to console or alert
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Public method to refresh the list
    async refreshBlockedContacts() {
        if (this.isModalOpen()) {
            await this.loadBlockedContacts();
        }
    }

    // Public method to add a blocked contact (called from other modules)
    addBlockedContact(contact) {
        if (!this.blockedContacts.some(c => (c.userId || c._id) === (contact.userId || contact._id))) {
            this.blockedContacts.unshift({
                ...contact,
                blockedAt: new Date().toISOString()
            });
            
            if (this.isModalOpen()) {
                this.renderBlockedContacts();
            }
        }
    }
}

// Initialize the blocked contacts manager
let blockedContactsManager;

function initializeBlockedContactsManager() {
    console.log('Initializing BlockedContactsManager...');
    try {
        blockedContactsManager = new BlockedContactsManager();
        window.blockedContactsManager = blockedContactsManager;
        console.log('BlockedContactsManager initialized successfully:', blockedContactsManager);
        return blockedContactsManager;
    } catch (error) {
        console.error('Error initializing BlockedContactsManager:', error);
        return null;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, initializing BlockedContactsManager...');
        initializeBlockedContactsManager();
    });
} else {
    console.log('DOM already loaded, initializing BlockedContactsManager immediately...');
    initializeBlockedContactsManager();
}

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BlockedContactsManager;
} else {
    window.BlockedContactsManager = BlockedContactsManager;
    window.initializeBlockedContactsManager = initializeBlockedContactsManager;
}