/**
 * Language Selector Component
 * Componente para cambiar idioma con banderas y nombres nativos
 */

class LanguageSelector {
    constructor() {
        this.isOpen = false;
        this.modalId = 'language-selector-modal';
        this.init();
    }
    
    init() {
        this.createLanguageModal();
        this.setupEventListeners();
        
        // Initialize flags after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.updateCurrentLanguageFlags();
        }, 100);
        
        console.log('🌐 Language Selector initialized');
    }
    
    createLanguageModal() {
        // Remover modal existente si existe
        const existingModal = document.getElementById(this.modalId);
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = this.modalId;
        modal.className = 'language-modal hidden';
        modal.innerHTML = `
            <div class="language-modal-overlay"></div>
            <div class="language-modal-content">
                <div class="language-modal-header">
                    <h3 data-i18n="main_menu.language">Idioma</h3>
                    <button class="language-modal-close" aria-label="Cerrar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="language-modal-body">
                    <div class="language-options" id="language-options">
                        <!-- Languages will be populated here -->
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.modal = modal;
        
        // Poblar opciones de idioma
        this.populateLanguageOptions();
        
        // Setup modal event listeners
        this.setupModalEvents();
    }
    
    populateLanguageOptions() {
        const container = document.getElementById('language-options');
        const supportedLanguages = window.i18n.getSupportedLanguages();
        const currentLanguage = window.i18n.getCurrentLanguage();
        
        container.innerHTML = '';
        
        Object.entries(supportedLanguages).forEach(([code, info]) => {
            const option = document.createElement('div');
            option.className = `language-option ${code === currentLanguage ? 'active' : ''}`;
            option.dataset.language = code;
            
            option.innerHTML = `
                <div class="language-flag">
                    <img src="${info.flagUrl}" alt="${info.name}" class="flag-img" loading="lazy"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
                    <span class="flag-emoji" style="display:none;">${info.flag}</span>
                </div>
                <div class="language-info">
                    <div class="language-native-name">${info.nativeName}</div>
                    <div class="language-english-name">${info.name}</div>
                </div>
                <div class="language-check ${code === currentLanguage ? 'visible' : ''}">
                    <i class="fas fa-check"></i>
                </div>
            `;
            
            // Event listener para cambiar idioma
            option.addEventListener('click', () => this.selectLanguage(code));
            
            container.appendChild(option);
        });
    }
    
    async selectLanguage(languageCode) {
        const currentLanguage = window.i18n.getCurrentLanguage();
        
        if (languageCode === currentLanguage) {
            this.close();
            return;
        }
        
        // Mostrar loading
        this.showLoading();
        
        try {
            // Cambiar idioma
            const success = await window.i18n.changeLanguage(languageCode);
            
            if (success) {
                // Actualizar selección visual
                this.updateSelection(languageCode);
                
                // Mostrar notificación de éxito
                this.showSuccessNotification(languageCode);
                
                // Cerrar modal después de un delay
                setTimeout(() => {
                    this.close();
                }, 800);
                
                // Actualizar todas las traducciones en la aplicación
                this.updateAllTranslations();
            } else {
                this.showErrorNotification();
            }
        } catch (error) {
            console.error('Error changing language:', error);
            this.showErrorNotification();
        }
        
        this.hideLoading();
    }
    
    updateSelection(selectedLanguage) {
        const options = document.querySelectorAll('.language-option');
        
        options.forEach(option => {
            const languageCode = option.dataset.language;
            const checkElement = option.querySelector('.language-check');
            
            if (languageCode === selectedLanguage) {
                option.classList.add('active');
                checkElement.classList.add('visible');
            } else {
                option.classList.remove('active');
                checkElement.classList.remove('visible');
            }
        });
    }
    
    updateAllTranslations() {
        // Aplicar traducciones a elementos dinámicos específicos de la aplicación
        this.translateMenuItems();
        this.translateChatInterface();
        this.translateCallInterface();
        this.updateCurrentLanguageFlags();
    }
    
    translateMenuItems() {
        // Actualizar elementos del menú principal
        const menuItems = {
            'profile-settings': 'main_menu.profile_settings',
            'add-contact-menu': 'main_menu.add_contact',
            'blocked-contacts-menu': 'main_menu.blocked_contacts',
            'help-menu': 'main_menu.help',
            'logout-menu': 'main_menu.logout'
        };
        
        Object.entries(menuItems).forEach(([id, key]) => {
            const element = document.getElementById(id);
            if (element) {
                const span = element.querySelector('span');
                if (span) {
                    span.textContent = window.i18n.t(key);
                }
            }
        });
    }
    
    translateChatInterface() {
        // Actualizar placeholder de búsqueda
        const searchInput = document.querySelector('.search-container input');
        if (searchInput) {
            searchInput.placeholder = window.i18n.t('chat.search_placeholder');
        }
        
        // Actualizar placeholder de mensaje
        const messageInput = document.querySelector('.message-input');
        if (messageInput) {
            messageInput.placeholder = window.i18n.t('chat.message_placeholder');
        }
    }
    
    translateCallInterface() {
        // Actualizar textos de llamadas si están visibles
        const callElements = {
            'incoming-call-type': 'calls.incoming',
            'call-status': 'calls.outgoing'
        };
        
        Object.entries(callElements).forEach(([id, key]) => {
            const element = document.getElementById(id);
            if (element && element.textContent.includes('llamada') || element.textContent.includes('call')) {
                element.textContent = window.i18n.t(key);
            }
        });
    }
    
    updateCurrentLanguageFlags() {
        const currentLang = window.i18n.getCurrentLanguage();
        const langInfo = window.i18n.getSupportedLanguages()[currentLang];
        
        if (langInfo) {
            // Update desktop flag
            const desktopFlag = document.getElementById('current-language-flag');
            if (desktopFlag) {
                desktopFlag.src = langInfo.flagUrl;
                desktopFlag.alt = currentLang.toUpperCase();
            }
            
            // Update mobile flag
            const mobileFlag = document.getElementById('mobile-current-language-flag');
            if (mobileFlag) {
                mobileFlag.src = langInfo.flagUrl;
                mobileFlag.alt = currentLang.toUpperCase();
            }
        }
    }
    
    showLoading() {
        const modal = this.modal.querySelector('.language-modal-content');
        modal.classList.add('loading');
        
        // Disable all options
        const options = document.querySelectorAll('.language-option');
        options.forEach(option => {
            option.style.pointerEvents = 'none';
            option.style.opacity = '0.7';
        });
    }
    
    hideLoading() {
        const modal = this.modal.querySelector('.language-modal-content');
        modal.classList.remove('loading');
        
        // Re-enable all options
        const options = document.querySelectorAll('.language-option');
        options.forEach(option => {
            option.style.pointerEvents = '';
            option.style.opacity = '';
        });
    }
    
    showSuccessNotification(languageCode) {
        const info = window.i18n.getSupportedLanguages()[languageCode];
        
        // Usar el sistema de notificaciones existente si está disponible
        if (window.Utils?.Notifications?.success) {
            window.Utils.Notifications.success(
                `Idioma cambiado a ${info.nativeName}`,
                {
                    duration: 2000,
                    icon: info.flag
                }
            );
        } else {
            // Notificación personalizada simple
            this.showCustomNotification(`${info.flag} Idioma cambiado a ${info.nativeName}`, 'success');
        }
    }
    
    showErrorNotification() {
        if (window.Utils?.Notifications?.error) {
            window.Utils.Notifications.error('Error al cambiar el idioma');
        } else {
            this.showCustomNotification('❌ Error al cambiar el idioma', 'error');
        }
    }
    
    showCustomNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `language-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4ade80' : '#ef4444'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10001;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }
    
    setupModalEvents() {
        const closeBtn = this.modal.querySelector('.language-modal-close');
        const overlay = this.modal.querySelector('.language-modal-overlay');
        
        closeBtn.addEventListener('click', () => this.close());
        overlay.addEventListener('click', () => this.close());
        
        // ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.close();
            }
        });
    }
    
    setupEventListeners() {
        // Escuchar cuando se agregue el botón de idioma al DOM
        document.addEventListener('DOMContentLoaded', () => {
            this.attachToLanguageButton();
        });
        
        // También intentar inmediatamente por si el DOM ya está listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.attachToLanguageButton());
        } else {
            this.attachToLanguageButton();
        }
    }
    
    attachToLanguageButton() {
        // Desktop button
        const languageButton = document.getElementById('language-menu');
        if (languageButton) {
            languageButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.open();
            });
            console.log('✅ Desktop language button attached');
        }
        
        // Mobile button  
        const mobileLanguageButton = document.getElementById('mobile-language-menu');
        if (mobileLanguageButton) {
            mobileLanguageButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.open();
            });
            console.log('✅ Mobile language button attached');
        }
        
        // If neither found, retry
        if (!languageButton && !mobileLanguageButton) {
            setTimeout(() => this.attachToLanguageButton(), 500);
        }
    }
    
    open() {
        this.modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        this.isOpen = true;
        
        // Refresh language options in case something changed
        this.populateLanguageOptions();
        
        console.log('🌐 Language selector opened');
    }
    
    close() {
        this.modal.classList.add('hidden');
        document.body.style.overflow = '';
        this.isOpen = false;
        
        console.log('🌐 Language selector closed');
    }
}

// Initialize language selector when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.languageSelector = new LanguageSelector();
    });
} else {
    window.languageSelector = new LanguageSelector();
}

console.log('🌐 Language Selector script loaded');