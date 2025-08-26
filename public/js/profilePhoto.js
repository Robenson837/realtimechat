/**
 * Profile Photo Viewer
 * Handles expanding and viewing profile photos
 */

class ProfilePhotoViewer {
    constructor() {
        this.modal = null;
        this.modalOverlay = null;
        this.modalImage = null;
        this.modalName = null;
        this.modalStatus = null;
        this.closeBtn = null;
        this.userAuthenticated = false;
        
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupElements());
        } else {
            this.setupElements();
        }
    }

    setupElements() {
        this.modal = document.getElementById('profile-photo-modal');
        this.modalOverlay = document.getElementById('photo-modal-overlay');
        this.modalImage = document.getElementById('photo-modal-image');
        this.modalName = document.getElementById('photo-modal-name');
        this.modalStatus = document.getElementById('photo-modal-status');
        this.closeBtn = document.getElementById('close-photo-modal');

        if (!this.modal) {
            console.warn('Profile photo modal not found');
            return;
        }

        this.setupEventListeners();
        this.setupAvatarClickHandlers();
        this.setupPhotoActionListeners();
        this.loadCurrentUserAvatar();
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
    }

    setupAvatarClickHandlers() {
        // Set up click handlers for existing avatars
        this.attachClickHandlers();

        // Set up observers for dynamically added avatars
        this.setupMutationObserver();
    }

    attachClickHandlers() {
        // Profile image in sidebar (own profile) - Redirect to full profile modal
        const profileImg = document.querySelector('.sidebar-header .profile-img');
        if (profileImg && !profileImg.hasAttribute('data-photo-handler')) {
            profileImg.setAttribute('data-photo-handler', 'true');
            profileImg.addEventListener('click', (e) => {
                e.stopPropagation();
                // Open photo modal with photo actions for own profile
                console.log('Opening own profile photo modal');
                const userInfo = profileImg.closest('.user-profile');
                const userName = userInfo?.querySelector('#current-user-name')?.textContent || 'Tu perfil';
                const userStatus = userInfo?.querySelector('#current-user-status')?.textContent || 'En línea';
                this.openModal(profileImg.src, userName, userStatus, true); // true = isOwnProfile
            });
        }

        // Contact avatar in chat header (ONLY the image)
        const chatHeaderAvatar = document.querySelector('.chat-header .contact-avatar');
        if (chatHeaderAvatar && !chatHeaderAvatar.hasAttribute('data-photo-handler')) {
            chatHeaderAvatar.setAttribute('data-photo-handler', 'true');
            chatHeaderAvatar.addEventListener('click', (e) => {
                e.stopPropagation();
                const contactInfo = chatHeaderAvatar.closest('.contact-info');
                const contactName = contactInfo?.querySelector('.contact-name')?.textContent || 'Contacto';
                const lastSeen = contactInfo?.querySelector('.last-seen')?.textContent || '';
                this.openModal(chatHeaderAvatar.src, contactName, lastSeen);
            });
        }

        // Contact avatars in contacts list (ONLY the images)
        const contactAvatars = document.querySelectorAll('.contacts-list .contact-avatar-container img, .contacts-list .contact-avatar');
        contactAvatars.forEach(avatar => {
            if (!avatar.hasAttribute('data-photo-handler')) {
                avatar.setAttribute('data-photo-handler', 'true');
                avatar.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const contactItem = avatar.closest('.contact-item');
                    const contactName = contactItem?.querySelector('.contact-name')?.textContent || 'Contacto';
                    const contactStatus = contactItem?.querySelector('.contact-status')?.textContent || '';
                    this.openModal(avatar.src, contactName, contactStatus);
                });
            }
        });

        // Search result avatars (ONLY the images)
        const searchAvatars = document.querySelectorAll('.search-results .search-result-avatar');
        searchAvatars.forEach(avatar => {
            if (!avatar.hasAttribute('data-photo-handler')) {
                avatar.setAttribute('data-photo-handler', 'true');
                avatar.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const resultItem = avatar.closest('.search-result-item');
                    const userName = resultItem?.querySelector('.user-name')?.textContent || 'Usuario';
                    const userStatus = resultItem?.querySelector('.user-status')?.textContent || '';
                    this.openModal(avatar.src, userName, userStatus);
                });
            }
        });

        // Chat list avatars (ONLY the images)
        const chatAvatars = document.querySelectorAll('.chat-list .chat-avatar');
        chatAvatars.forEach(avatar => {
            if (!avatar.hasAttribute('data-photo-handler')) {
                avatar.setAttribute('data-photo-handler', 'true');
                avatar.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const chatItem = avatar.closest('.chat-item');
                    const chatName = chatItem?.querySelector('.chat-name')?.textContent || 'Chat';
                    const lastMessage = chatItem?.querySelector('.last-message')?.textContent || '';
                    this.openModal(avatar.src, chatName, lastMessage);
                });
            }
        });

        // Large profile image in profile modal (when viewing full profile)
        const profileLargeImage = document.querySelector('.profile-large-image');
        if (profileLargeImage && !profileLargeImage.hasAttribute('data-photo-handler')) {
            profileLargeImage.setAttribute('data-photo-handler', 'true');
            profileLargeImage.addEventListener('click', (e) => {
                e.stopPropagation();
                const profileModal = profileLargeImage.closest('.profile-modal-content');
                const userName = profileModal?.querySelector('#profile-modal-name')?.textContent || 'Usuario';
                const userStatus = profileModal?.querySelector('#profile-modal-status')?.textContent || '';
                this.openModal(profileLargeImage.src, userName, userStatus);
            });
        }
    }

    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            let shouldReattach = false;
            
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the added node contains avatars
                        const avatars = node.querySelectorAll ? 
                            node.querySelectorAll('img.contact-avatar, img.search-result-avatar, img.chat-avatar, .contact-avatar-container img, .profile-large-image') : 
                            [];
                        
                        if (avatars.length > 0 || node.matches?.('img.contact-avatar, img.search-result-avatar, img.chat-avatar, .profile-large-image') || node.querySelector?.('.contact-avatar-container img, .profile-large-image')) {
                            shouldReattach = true;
                        }
                    }
                });
            });

            if (shouldReattach) {
                // Small delay to ensure DOM is fully updated
                setTimeout(() => {
                    this.attachClickHandlers();
                }, 100);
            }
        });

        // Observe the entire app container for changes
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            observer.observe(appContainer, {
                childList: true,
                subtree: true
            });
        }
    }

    openModal(imageSrc, userName, userStatus, isOwnProfile = false) {
        if (!this.modal || !this.modalImage || !this.modalName || !this.modalStatus) {
            console.warn('Modal elements not found');
            return;
        }

        // Set the image and user info
        this.modalImage.src = imageSrc;
        this.modalImage.alt = `Foto de perfil de ${userName}`;
        this.modalName.textContent = userName;
        this.modalStatus.textContent = userStatus;

        // Show/hide photo actions based on whether it's own profile
        this.togglePhotoActions(isOwnProfile);

        // Show the modal
        this.modal.classList.remove('hidden');
        
        // Add animation class
        setTimeout(() => {
            this.modal.classList.add('show');
        }, 10);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        console.log('Profile photo modal opened for:', userName, isOwnProfile ? '(own profile)' : '');
    }

    togglePhotoActions(isOwnProfile) {
        const photoActions = document.getElementById('photo-modal-actions');
        const profilePhotoActions = document.getElementById('profile-photo-actions');
        
        if (photoActions) {
            photoActions.style.display = isOwnProfile ? 'flex' : 'none';
        }
        
        if (profilePhotoActions) {
            profilePhotoActions.style.display = isOwnProfile ? 'flex' : 'none';
        }
        
        if (isOwnProfile) {
            // Setup event listeners for change and delete buttons in both modals
            setTimeout(() => {
                this.setupPhotoActionListeners();
            }, 100);
        }
    }

    setupPhotoActionListeners() {
        // Handle both modal types - photo modal and profile modal
        const changeButtons = [
            document.getElementById('photo-modal-change-btn'),
            document.getElementById('change-photo-btn')
        ];
        const deleteButtons = [
            document.getElementById('photo-modal-delete-btn'),
            document.getElementById('delete-photo-btn')
        ];
        
        changeButtons.forEach(changeBtn => {
            if (changeBtn && !changeBtn.hasAttribute('data-listener-added')) {
                changeBtn.setAttribute('data-listener-added', 'true');
                changeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Change photo button clicked from:', changeBtn.id);
                    
                    try {
                        // Usar el sistema de crop inteligente si está disponible
                        if (window.intelligentPhotoCrop) {
                            window.intelligentPhotoCrop.triggerFileInput();
                        } else {
                            // Fallback al método simple
                            const fileInput = document.createElement('input');
                            fileInput.type = 'file';
                            fileInput.accept = 'image/*';
                            fileInput.style.display = 'none';
                            
                            fileInput.addEventListener('change', (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    console.log('File selected:', file.name);
                                    // Preguntar si quiere usar crop
                                    if (confirm('¿Quieres recortar la imagen antes de guardarla?')) {
                                        this.showNotification('info', 'Sistema de recorte no disponible. Subiendo imagen directamente...');
                                    }
                                    this.uploadPhotoToServer(file);
                                }
                                // Limpiar el input después de usar
                                if (fileInput.parentNode) {
                                    fileInput.parentNode.removeChild(fileInput);
                                }
                            });
                            
                            document.body.appendChild(fileInput);
                            fileInput.click();
                        }
                    } catch (error) {
                        console.error('Error opening file selector:', error);
                        this.showNotification('error', 'Error al abrir selector de archivos');
                    }
                });
            }
        });
        
        deleteButtons.forEach(deleteBtn => {
            if (deleteBtn && !deleteBtn.hasAttribute('data-listener-added')) {
                deleteBtn.setAttribute('data-listener-added', 'true');
                deleteBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Delete photo button clicked from:', deleteBtn.id);
                    
                    try {
                        // Usar backend real para eliminar la foto permanentemente
                        this.deletePhotoFromServer();
                    } catch (error) {
                        console.error('Error deleting photo:', error);
                        this.showNotification('error', 'Error al eliminar la foto');
                    }
                });
            }
        });
    }

    async uploadPhotoToServer(file) {
        console.log('Uploading photo to server:', file.name);
        
        // Validar archivo
        if (!file.type.startsWith('image/')) {
            this.showNotification('error', 'Por favor selecciona un archivo de imagen válido');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('error', 'La imagen es demasiado grande. Máximo 5MB');
            return;
        }
        
        try {
            // Verificar si hay API disponible
            if (typeof API === 'undefined' || !API.Upload) {
                throw new Error('Sistema de upload no disponible');
            }
            
            // Verificar autenticación usando API client
            if (!API.Auth.isAuthenticated()) {
                this.showNotification('error', 'Debes iniciar sesión para cambiar tu foto de perfil');
                return;
            }
            
            // Mostrar indicador de carga
            this.showNotification('info', 'Subiendo foto de perfil...');
            
            // Usar el API client para subir el avatar con progreso
            const response = await API.Users.uploadAvatar(file, (progress) => {
                console.log(`Upload progress: ${progress}%`);
            });
            
            // Verificar que la respuesta sea exitosa
            if (!response.success) {
                throw new Error(response.message || 'Error al procesar la imagen');
            }
            
            // Actualizar la UI con la nueva imagen
            this.updateProfileImageInUI(response.avatarUrl);
            
            // Actualizar usuario actual si está disponible
            if (window.AuthManager && window.AuthManager.getCurrentUser()) {
                window.AuthManager.updateCurrentUser({ avatar: response.avatarUrl });
            }
            
            // Mostrar notificación de éxito
            this.showNotification('success', '✅ Foto de perfil actualizada permanentemente');
            
            // Cerrar el modal después de un breve delay
            setTimeout(() => {
                this.closeModal();
            }, 1000);
            
        } catch (error) {
            console.error('Error uploading photo:', error);
            this.showNotification('error', error.message || 'Error al subir la foto de perfil');
        }
    }

    deletePhotoFromServer() {
        console.log('Showing delete confirmation modal');
        this.showDeleteConfirmationModal();
    }

    async confirmDeletePhoto() {
        console.log('Deleting photo from server');
        
        try {
            // Verificar si hay API disponible
            if (typeof API === 'undefined' || !API.Users) {
                throw new Error('Sistema de API no disponible');
            }
            
            // Verificar autenticación usando API client
            if (!API.Auth.isAuthenticated()) {
                this.showNotification('error', 'Debes iniciar sesión para eliminar tu foto de perfil');
                return;
            }
            
            // Mostrar indicador de carga
            this.showNotification('info', 'Eliminando foto de perfil...');
            
            // Usar el API client para eliminar el avatar
            const response = await API.Users.deleteAvatar();
            
            // Verificar que la respuesta sea exitosa
            if (!response.success) {
                throw new Error(response.message || 'Error al eliminar la imagen');
            }
            
            // Actualizar la UI con imagen por defecto
            const defaultImage = 'images/user-placeholder-40.svg';
            this.updateProfileImageInUI(defaultImage);
            
            // Actualizar usuario actual si está disponible
            if (window.AuthManager && window.AuthManager.getCurrentUser()) {
                window.AuthManager.updateCurrentUser({ avatar: null });
            }
            
            // Mostrar notificación de éxito
            this.showNotification('success', '🗑️ Foto de perfil eliminada permanentemente');
            
            // Cerrar el modal después de un breve delay
            setTimeout(() => {
                this.closeModal();
            }, 1000);
            
        } catch (error) {
            console.error('Error deleting photo:', error);
            this.showNotification('error', error.message || 'Error al eliminar la foto de perfil');
        }
    }

    showDeleteConfirmationModal() {
        const modal = document.getElementById('delete-photo-confirmation-modal');
        if (!modal) {
            console.error('Delete confirmation modal not found');
            return;
        }

        // Mostrar el modal
        modal.classList.remove('hidden');
        
        // Configurar event listeners para los botones
        this.setupDeleteConfirmationListeners();
    }

    setupDeleteConfirmationListeners() {
        const modal = document.getElementById('delete-photo-confirmation-modal');
        const cancelBtn = document.getElementById('cancel-delete-photo');
        const confirmBtn = document.getElementById('confirm-delete-photo');
        const overlay = modal?.querySelector('.modal-overlay');

        // Remover listeners existentes si los hay
        if (cancelBtn) {
            cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        }
        if (confirmBtn) {
            confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        }

        // Obtener referencias actualizadas después del cloning
        const newCancelBtn = document.getElementById('cancel-delete-photo');
        const newConfirmBtn = document.getElementById('confirm-delete-photo');

        // Evento para cancelar
        if (newCancelBtn) {
            newCancelBtn.addEventListener('click', () => {
                this.closeDeleteConfirmationModal();
            });
        }

        // Evento para confirmar eliminación
        if (newConfirmBtn) {
            newConfirmBtn.addEventListener('click', () => {
                this.closeDeleteConfirmationModal();
                this.confirmDeletePhoto();
            });
        }

        // Cerrar con overlay
        if (overlay) {
            overlay.addEventListener('click', () => {
                this.closeDeleteConfirmationModal();
            });
        }

        // Cerrar con ESC
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                this.closeDeleteConfirmationModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    closeDeleteConfirmationModal() {
        const modal = document.getElementById('delete-photo-confirmation-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    updateProfileImageInUI(avatarUrl) {
        // Agregar timestamp para evitar caché
        const imageUrl = avatarUrl + '?t=' + Date.now();
        
        // Actualizar la imagen en el modal actual
        if (this.modalImage) {
            this.modalImage.src = imageUrl;
        }
        
        // Actualizar todas las imágenes de perfil del usuario actual
        document.querySelectorAll('.profile-img, .sidebar-header .profile-img').forEach(img => {
            img.src = imageUrl;
        });
        
        // Actualizar también en el modal de perfil completo si está abierto
        const profileModalImage = document.getElementById('profile-modal-image');
        if (profileModalImage) {
            profileModalImage.src = imageUrl;
        }
    }

    async loadCurrentUserAvatar() {
        try {
            // Esperar un poco para asegurar que la autenticación esté completamente lista
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Verificar si hay API disponible
            if (typeof API === 'undefined' || !API.Users) {
                console.log('API not available yet, skipping avatar load');
                return;
            }
            
            // Verificar autenticación
            if (!API.Auth.isAuthenticated()) {
                this.userAuthenticated = false;
                console.log('User not authenticated');
                return;
            }
            
            // Obtener datos del usuario actual para cargar su avatar
            const result = await API.Users.getProfile();
            
            if (result.success) {
                // Marcar que el usuario está autenticado
                this.userAuthenticated = true;
                
                if (result.data.avatar) {
                    // Actualizar todas las imágenes de perfil con el avatar de la base de datos
                    const avatarUrl = result.data.avatar;
                    this.updateProfileImageInUI(avatarUrl);
                    console.log('Avatar loaded from database:', avatarUrl);
                }
            } else {
                this.userAuthenticated = false;
                console.log('Failed to get user profile');
            }
        } catch (error) {
            console.error('Error loading current user avatar:', error);
            this.userAuthenticated = false;
            // No mostramos error al usuario aquí porque es un proceso en segundo plano
        }
    }

    showNotification(type, message) {
        // Función helper para mostrar notificaciones
        if (typeof Utils !== 'undefined' && Utils.showNotification) {
            Utils.showNotification(type, message);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
            // Mostrar alerta simple como fallback
            if (type === 'success') {
                alert(`✅ ${message}`);
            } else if (type === 'error') {
                alert(`❌ ${message}`);
            } else {
                alert(message);
            }
        }
    }

    closeModal() {
        if (!this.modal) return;

        // Add closing animation
        this.modal.classList.remove('show');
        
        // Hide modal after animation
        setTimeout(() => {
            this.modal.classList.add('hidden');
            
            // Restore body scroll
            document.body.style.overflow = '';
        }, 200);

        console.log('Profile photo modal closed');
    }

    isModalOpen() {
        return this.modal && !this.modal.classList.contains('hidden');
    }

    // Public method to manually open modal (for external use)
    showPhoto(imageSrc, userName = 'Usuario', userStatus = '') {
        this.openModal(imageSrc, userName, userStatus);
    }
}

// Initialize the profile photo viewer
let profilePhotoViewer;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        profilePhotoViewer = new ProfilePhotoViewer();
    });
} else {
    profilePhotoViewer = new ProfilePhotoViewer();
}

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfilePhotoViewer;
} else {
    window.ProfilePhotoViewer = ProfilePhotoViewer;
}