/**
 * User Profile Settings Manager
 * Handles the current user's profile modal with inline editing
 */

class UserProfileSettingsManager {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.currentUser = null;
        
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
        this.modal = document.getElementById('user-profile-settings-modal');
        
        if (!this.modal) {
            console.warn('User profile settings modal not found');
            return;
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close modal buttons
        const closeBtn = document.getElementById('close-user-profile-modal');
        const closeBtn2 = document.getElementById('close-profile-modal-btn');
        const overlay = this.modal.querySelector('.modal-overlay');
        
        [closeBtn, closeBtn2].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.closeModal());
            }
        });

        if (overlay) {
            overlay.addEventListener('click', () => this.closeModal());
        }

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeModal();
            }
        });

        // Profile photo click
        const profilePhoto = document.getElementById('user-profile-avatar');
        if (profilePhoto) {
            profilePhoto.addEventListener('click', () => this.handleProfilePhotoClick());
        }

        // Avatar overlay (pencil) click for editing photo
        const avatarOverlay = this.modal.querySelector('.avatar-overlay');
        if (avatarOverlay) {
            avatarOverlay.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleProfilePhotoClick();
            });
        }

        // Expand photo button click
        const expandPhotoBtn = document.getElementById('expand-user-photo');
        if (expandPhotoBtn) {
            expandPhotoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleExpandPhotoClick();
            });
        }

        // Edit field buttons
        this.modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-field-btn') || e.target.closest('.edit-field-btn')) {
                const btn = e.target.closest('.edit-field-btn');
                const field = btn.dataset.field;
                this.startEditField(field);
            }
            
            if (e.target.classList.contains('save-field-btn') || e.target.closest('.save-field-btn')) {
                const btn = e.target.closest('.save-field-btn');
                const field = btn.dataset.field;
                this.saveField(field);
            }
            
            if (e.target.classList.contains('cancel-field-btn') || e.target.closest('.cancel-field-btn')) {
                const btn = e.target.closest('.cancel-field-btn');
                const field = btn.dataset.field;
                this.cancelEditField(field);
            }
        });

        // Current user name click
        const currentUserName = document.getElementById('current-user-name');
        if (currentUserName) {
            currentUserName.addEventListener('click', () => {
                this.openModal();
            });
            
            // Add cursor pointer style
            currentUserName.style.cursor = 'pointer';
            currentUserName.title = 'Click para ver y editar tu perfil';
        }
    }

    openModal() {
        if (!this.modal) return;

        // Get current user data
        this.currentUser = window.AuthManager ? window.AuthManager.getCurrentUser() : Utils.Storage.get('currentUser');
        
        if (!this.currentUser) {
            Utils.Notifications.error('No se pudo cargar la información del usuario');
            return;
        }

        // Populate modal with user data
        this.populateUserData();
        
        // Show modal
        this.modal.classList.remove('hidden');
        this.isOpen = true;
        
        // Add show class for animation after a small delay
        setTimeout(() => {
            this.modal.classList.add('show');
        }, 10);
        
        // Prevent body scroll
        document.body.classList.add('modal-open');
    }

    closeModal() {
        if (!this.modal) return;

        // Cancel any active edits
        this.cancelAllEdits();
        
        // Remove show class for animation
        this.modal.classList.remove('show');
        
        // Hide modal after animation completes
        setTimeout(() => {
            this.modal.classList.add('hidden');
        }, 300);
        
        this.isOpen = false;
        
        // Restore body scroll
        document.body.classList.remove('modal-open');
    }

    populateUserData() {
        if (!this.currentUser) return;

        // Profile photo
        const avatar = document.getElementById('user-profile-avatar');
        if (avatar) {
            avatar.src = this.currentUser.avatar || this.generateAvatarUrl();
        }

        // Full name
        const fullNameDisplay = document.getElementById('user-fullname-display');
        if (fullNameDisplay) {
            fullNameDisplay.textContent = this.currentUser.fullName || 'Sin nombre';
        }

        // Email
        const emailDisplay = document.getElementById('user-email-display');
        if (emailDisplay) {
            emailDisplay.textContent = this.currentUser.email || 'Sin correo';
        }

        // Username
        const usernameDisplay = document.getElementById('user-username-display');
        if (usernameDisplay) {
            usernameDisplay.textContent = this.currentUser.username || 'Sin usuario';
        }

        // Status message
        const statusMessageDisplay = document.getElementById('user-statusmessage-display');
        if (statusMessageDisplay) {
            statusMessageDisplay.textContent = this.currentUser.statusMessage || 'Sin mensaje de estado';
        }

        // Member since
        const joinedDisplay = document.getElementById('user-joined-display');
        if (joinedDisplay) {
            const joinedDate = this.currentUser.createdAt ? 
                this.formatDate(this.currentUser.createdAt) : 'Fecha desconocida';
            joinedDisplay.textContent = joinedDate;
        }

        // Current status
        const currentStatusDisplay = document.getElementById('user-currentstatus-display');
        if (currentStatusDisplay) {
            const statusIndicator = currentStatusDisplay.querySelector('.status-indicator');
            if (statusIndicator) {
                statusIndicator.className = `status-indicator ${this.currentUser.status || 'online'}`;
            }
            const statusText = currentStatusDisplay.textContent.includes('En línea') ? 'En línea' : 
                               this.getStatusText(this.currentUser.status || 'online');
            currentStatusDisplay.innerHTML = `
                <div class="status-indicator ${this.currentUser.status || 'online'}"></div>
                ${statusText}
            `;
        }

        // Last activity
        const lastActivityDisplay = document.getElementById('user-lastactivity-display');
        if (lastActivityDisplay) {
            const lastActivity = this.currentUser.lastSeen ? 
                this.formatRelativeTime(this.currentUser.lastSeen) : 'En línea ahora';
            lastActivityDisplay.textContent = lastActivity;
        }
    }

    startEditField(fieldName) {
        // Hide the display content
        const fieldContent = this.modal.querySelector(`[data-field="${fieldName}"]`).closest('.profile-field-editable');
        const displayElement = fieldContent.querySelector('.field-content');
        const editElement = fieldContent.querySelector('.field-edit');
        const inputElement = fieldContent.querySelector('.field-input');

        if (!displayElement || !editElement || !inputElement) return;

        // Get current value
        const currentValue = this.getCurrentFieldValue(fieldName);
        
        // Set input value
        inputElement.value = currentValue;
        
        // Toggle visibility
        displayElement.style.display = 'none';
        editElement.classList.remove('hidden');
        
        // Focus input
        setTimeout(() => {
            inputElement.focus();
            inputElement.select();
        }, 100);

        // Handle Enter key to save
        const handleEnter = (e) => {
            if (e.key === 'Enter') {
                this.saveField(fieldName);
                inputElement.removeEventListener('keydown', handleEnter);
            }
        };
        inputElement.addEventListener('keydown', handleEnter);
    }

    async saveField(fieldName) {
        const fieldContent = this.modal.querySelector(`[data-field="${fieldName}"]`).closest('.profile-field-editable');
        const editElement = fieldContent.querySelector('.field-edit');
        const inputElement = fieldContent.querySelector('.field-input');
        const saveBtn = fieldContent.querySelector('.save-field-btn');

        if (!inputElement || !saveBtn) return;

        const newValue = inputElement.value.trim();

        // Validate input
        if (!this.validateFieldValue(fieldName, newValue)) {
            return;
        }

        // Show loading state
        const originalSaveContent = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        saveBtn.disabled = true;

        try {
            // Update user data via API
            const updateData = {};
            updateData[fieldName] = newValue;

            const response = await API.Users.updateProfile(updateData);

            if (response.success) {
                // Update current user data with the complete response from server
                if (response.data) {
                    // Update with complete user data from server
                    this.currentUser = { ...this.currentUser, ...response.data };
                } else {
                    // Fallback: update only the changed field
                    this.currentUser[fieldName] = newValue;
                }
                
                // Update storage with complete user data
                Utils.Storage.set('currentUser', this.currentUser);
                
                // Update display in modal
                const displayElement = document.getElementById(`user-${fieldName.toLowerCase()}-display`);
                if (displayElement) {
                    displayElement.textContent = newValue;
                }

                // Update main UI elements
                this.updateMainUIElements(fieldName, newValue);
                
                // Update AuthManager if available
                if (window.AuthManager && typeof window.AuthManager.updateCurrentUser === 'function') {
                    window.AuthManager.updateCurrentUser(this.currentUser);
                }

                // Cancel edit mode
                this.cancelEditField(fieldName);

                // Show success notification
                Utils.Notifications.success(`${this.getFieldDisplayName(fieldName)} actualizado correctamente`);

            } else {
                throw new Error(response.message || 'Error al actualizar el campo');
            }

        } catch (error) {
            console.error('Error updating field:', error);
            
            // Handle specific field errors
            let errorMessage = `Error al actualizar ${this.getFieldDisplayName(fieldName)}`;
            
            if (error.response && error.response.field) {
                switch (error.response.field) {
                    case 'email':
                        errorMessage = 'Este correo electrónico ya está siendo usado por otro usuario';
                        break;
                    case 'username':
                        errorMessage = 'Este nombre de usuario ya está siendo usado por otro usuario';
                        break;
                    default:
                        errorMessage = error.response.message || errorMessage;
                }
            } else {
                errorMessage += ': ' + (error.message || 'Error desconocido');
            }
            
            Utils.Notifications.error(errorMessage);
        } finally {
            // Restore button state
            saveBtn.innerHTML = originalSaveContent;
            saveBtn.disabled = false;
        }
    }

    cancelEditField(fieldName) {
        const fieldContent = this.modal.querySelector(`[data-field="${fieldName}"]`).closest('.profile-field-editable');
        const displayElement = fieldContent.querySelector('.field-content');
        const editElement = fieldContent.querySelector('.field-edit');

        if (displayElement && editElement) {
            displayElement.style.display = 'flex';
            editElement.classList.add('hidden');
        }
    }

    cancelAllEdits() {
        const editElements = this.modal.querySelectorAll('.field-edit:not(.hidden)');
        editElements.forEach(editElement => {
            const fieldBtn = editElement.querySelector('.save-field-btn');
            if (fieldBtn && fieldBtn.dataset.field) {
                this.cancelEditField(fieldBtn.dataset.field);
            }
        });
    }

    getCurrentFieldValue(fieldName) {
        if (!this.currentUser) return '';
        
        switch (fieldName) {
            case 'fullName': return this.currentUser.fullName || '';
            case 'email': return this.currentUser.email || '';
            case 'username': return this.currentUser.username || '';
            case 'statusMessage': return this.currentUser.statusMessage || '';
            default: return '';
        }
    }

    validateFieldValue(fieldName, value) {
        switch (fieldName) {
            case 'fullName':
                if (value.length < 2) {
                    Utils.Notifications.error('El nombre debe tener al menos 2 caracteres');
                    return false;
                }
                if (value.length > 100) {
                    Utils.Notifications.error('El nombre no puede tener más de 100 caracteres');
                    return false;
                }
                break;
                
            case 'email':
                if (!Utils.validateEmail(value)) {
                    Utils.Notifications.error('Por favor ingresa un email válido');
                    return false;
                }
                break;
                
            case 'username':
                if (value.length < 3) {
                    Utils.Notifications.error('El nombre de usuario debe tener al menos 3 caracteres');
                    return false;
                }
                if (value.length > 30) {
                    Utils.Notifications.error('El nombre de usuario no puede tener más de 30 caracteres');
                    return false;
                }
                if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                    Utils.Notifications.error('El nombre de usuario solo puede contener letras, números y guiones bajos');
                    return false;
                }
                break;
                
            case 'statusMessage':
                if (value.length > 100) {
                    Utils.Notifications.error('El mensaje de estado no puede tener más de 100 caracteres');
                    return false;
                }
                break;
        }
        
        return true;
    }

    getFieldDisplayName(fieldName) {
        const names = {
            fullName: 'Nombre completo',
            email: 'Correo electrónico',
            username: 'Nombre de usuario',
            statusMessage: 'Mensaje de estado'
        };
        return names[fieldName] || fieldName;
    }

    handleProfilePhotoClick() {
        // Close this modal first to avoid z-index conflicts
        this.closeModal();
        
        // Wait a bit for the modal to close, then trigger photo functionality
        setTimeout(() => {
            try {
                // Use the intelligent photo crop system directly (same as the "Cambiar" button)
                if (window.intelligentPhotoCrop && typeof window.intelligentPhotoCrop.triggerFileInput === 'function') {
                    console.log('Triggering intelligent photo crop from profile settings modal');
                    window.intelligentPhotoCrop.triggerFileInput();
                } else if (window.profilePhotoManager && typeof window.profilePhotoManager.uploadPhotoToServer === 'function') {
                    // Fallback: create file input like the original implementation
                    console.log('Using profilePhotoManager fallback');
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = 'image/*';
                    fileInput.style.display = 'none';
                    
                    fileInput.addEventListener('change', (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            console.log('File selected for upload:', file.name);
                            window.profilePhotoManager.uploadPhotoToServer(file);
                        }
                        // Clean up
                        if (fileInput.parentNode) {
                            fileInput.parentNode.removeChild(fileInput);
                        }
                    });
                    
                    document.body.appendChild(fileInput);
                    fileInput.click();
                } else {
                    // Final fallback: trigger the photo modal buttons directly
                    console.log('Using button trigger fallback');
                    const changeBtn = document.getElementById('photo-modal-change-btn') || 
                                    document.getElementById('change-photo-btn');
                    
                    if (changeBtn) {
                        changeBtn.click();
                    } else {
                        throw new Error('No se encontró ningún método de cambio de foto disponible');
                    }
                }
            } catch (error) {
                console.error('Error triggering photo change:', error);
                Utils.Notifications.error('Error al abrir el selector de foto: ' + error.message);
            }
        }, 300); // Wait for modal close animation
    }

    generateAvatarUrl() {
        const name = this.currentUser.fullName || this.currentUser.username || 'User';
        const initials = Utils.getInitials(name);
        const color = Utils.stringToColor(name);
        
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${color.replace('#', '')}&color=fff&size=200`;
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'long' 
            });
        } catch (error) {
            return 'Fecha desconocida';
        }
    }

    formatRelativeTime(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);

            if (minutes < 1) return 'En línea ahora';
            if (minutes < 60) return `Hace ${minutes} min`;
            if (hours < 24) return `Hace ${hours} h`;
            if (days === 1) return 'Ayer';
            if (days < 7) return `Hace ${days} días`;
            return date.toLocaleDateString('es-ES');
        } catch (error) {
            return 'En línea ahora';
        }
    }

    updateMainUIElements(fieldName, newValue) {
        // Update main UI elements based on which field was changed
        switch (fieldName) {
            case 'fullName':
                // Update name in sidebar
                const currentUserNameElement = document.getElementById('current-user-name');
                if (currentUserNameElement) {
                    currentUserNameElement.textContent = newValue;
                }
                
                // Update name in any profile modals that might be open
                const profileModalName = document.getElementById('profile-modal-name');
                if (profileModalName) {
                    profileModalName.textContent = newValue;
                }
                break;
                
            case 'username':
                // Update username displays if any exist
                const usernameElements = document.querySelectorAll('[data-username-display]');
                usernameElements.forEach(el => {
                    el.textContent = '@' + newValue;
                });
                break;
                
            case 'email':
                // Update email displays if any exist  
                const emailElements = document.querySelectorAll('[data-email-display]');
                emailElements.forEach(el => {
                    el.textContent = newValue;
                });
                break;
                
            case 'statusMessage':
                // Update status message in profile displays
                const statusElements = document.querySelectorAll('[data-status-message-display]');
                statusElements.forEach(el => {
                    el.textContent = newValue || 'Sin mensaje de estado';
                });
                break;
        }
        
        // Update the profile modal avatar if it exists (for consistency)
        const profileAvatar = document.getElementById('user-profile-avatar');
        if (profileAvatar && this.currentUser.avatar) {
            profileAvatar.src = this.currentUser.avatar + '?t=' + Date.now();
        }
    }

    getStatusText(status) {
        const statusTexts = {
            online: 'En línea',
            away: 'Ausente',
            busy: 'Ocupado',
            offline: 'Desconectado'
        };
        
        return statusTexts[status] || 'Desconocido';
    }

    handleExpandPhotoClick() {
        try {
            // Get the current user's avatar and data
            const avatar = this.currentUser?.avatar || 'images/user-placeholder-40.svg';
            const userName = this.currentUser?.fullName || this.currentUser?.username || 'Usuario';
            const status = 'En línea'; // Current user is always online
            
            // Close this modal first to avoid z-index conflicts
            this.closeModal();
            
            // Wait for modal to close then use the existing photo viewer functionality
            setTimeout(() => {
                if (window.profilePhotoViewer && typeof window.profilePhotoViewer.openModal === 'function') {
                    console.log('Expanding user profile photo with correct function');
                    // Use openModal with isOwnProfile = true to show change/delete buttons
                    window.profilePhotoViewer.openModal(avatar, userName, status, true);
                } else {
                    console.error('profilePhotoViewer.openModal not available');
                    Utils.Notifications.error('Error al mostrar la foto de perfil');
                }
            }, 300);
        } catch (error) {
            console.error('Error expanding profile photo:', error);
            Utils.Notifications.error('Error al mostrar la foto: ' + error.message);
        }
    }
}

// Initialize the user profile settings manager
let userProfileSettingsManager;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        userProfileSettingsManager = new UserProfileSettingsManager();
    });
} else {
    userProfileSettingsManager = new UserProfileSettingsManager();
}

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserProfileSettingsManager;
} else {
    window.UserProfileSettingsManager = UserProfileSettingsManager;
    window.userProfileSettingsManager = userProfileSettingsManager;
}