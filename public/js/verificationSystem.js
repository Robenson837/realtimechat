/**
 * Sistema de Verificación de Cuentas Oficiales
 * Sistema para identificar y marcar cuentas verificadas con badge oficial
 */

class VerificationSystem {
    constructor() {
        this.verifiedEmails = [
            'robensoninnocent12@gmail.com'
            // Agregar más correos verificados aquí manualmente
        ];
        
        this.init();
    }
    
    init() {
        console.log('🔵 Sistema de Verificación inicializado');
        console.log(`📧 Correos verificados: ${this.verifiedEmails.length}`);
    }
    
    /**
     * Verificar si un correo está en la lista de verificados
     */
    isVerifiedEmail(email) {
        if (!email) return false;
        return this.verifiedEmails.includes(email.toLowerCase().trim());
    }
    
    /**
     * Verificar si un usuario está verificado
     */
    isUserVerified(user) {
        if (!user || !user.email) return false;
        return this.isVerifiedEmail(user.email);
    }
    
    /**
     * Generar HTML del badge de verificación
     */
    generateVerificationBadge(size = 'normal') {
        const sizeClass = size === 'small' ? 'verification-badge-small' : 'verification-badge';
        const svgSize = size === 'small' ? '16' : '20';
        
        return `<span class="${sizeClass}" title="Cuenta Oficial Verificada">
            <svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 36 36" aria-label="Verificado" role="img">
                <path fill="#1877F2" d="M18 1C8.6 1 1 8.6 1 18s7.6 17 17 17 17-7.6 17-17S27.4 1 18 1z"/>
                <path fill="#fff" d="M15.5 24.7l-6.3-6.3 2.1-2.1 4.2 4.2 8.6-8.6 2.1 2.1-10.7 10.7z"/>
            </svg>
        </span>`;
    }
    
    /**
     * Generar etiqueta "Oficial" con estilo
     */
    generateOfficialLabel(withBackground = true) {
        const className = withBackground ? 'official-label' : 'official-label-no-bg';
        return `<span class="${className}">Oficial</span>`;
    }
    
    /**
     * Generar badge para foto de perfil (esquina superior derecha)
     */
    generateProfilePhotoBadge() {
        return `<span class="profile-photo-badge" title="Cuenta Oficial Verificada">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 36 36" aria-label="Verificado" role="img">
                <path fill="#1877F2" d="M18 1C8.6 1 1 8.6 1 18s7.6 17 17 17 17-7.6 17-17S27.4 1 18 1z"/>
                <path fill="#fff" d="M15.5 24.7l-6.3-6.3 2.1-2.1 4.2 4.2 8.6-8.6 2.1 2.1-10.7 10.7z"/>
            </svg>
        </span>`;
    }
    
    /**
     * Generar nombre completo con verificación si aplica
     */
    generateVerifiedDisplayName(user, options = {}) {
        if (!user) return '';
        
        const {
            showOfficialLabel = true,
            isProfileModal = false,
            badgeSize = 'normal'
        } = options;
        
        const userName = user.fullName || user.username || 'Usuario';
        const isVerified = this.isUserVerified(user);
        
        if (!isVerified) {
            return `<span class="user-display-name">${userName}</span>`;
        }
        
        // Usuario verificado - SIEMPRE mostrar badge + etiqueta
        let html = `<span class="user-display-name verified-user">${userName}</span>`;
        html += ` ${this.generateVerificationBadge(badgeSize)}`;
        
        // SIEMPRE mostrar etiqueta "Oficial" para usuarios verificados
        html += ` ${this.generateOfficialLabel(!isProfileModal)}`;
        
        return html;
    }
    
    /**
     * Aplicar verificación a un elemento existente
     */
    applyVerificationToElement(element, user, options = {}) {
        if (!element || !user) {
            console.log('⚠️ Elemento o usuario no válido para verificación');
            return;
        }
        
        const {
            showOfficialLabel = true,
            badgeSize = 'normal',
            replaceContent = false,
            isProfileModal = false
        } = options;
        
        const isVerified = this.isUserVerified(user);
        console.log(`🔍 Usuario ${user.email} verificado: ${isVerified}`);
        
        if (!isVerified) {
            // Remover clases de verificación si existen
            element.classList.remove('verified-user');
            return;
        }
        
        // Aplicar verificación
        element.classList.add('verified-user');
        console.log(`✨ Aplicando verificación a elemento para ${user.email}`);
        
        if (replaceContent) {
            const verificationOptions = {
                showOfficialLabel: true, // SIEMPRE mostrar etiqueta
                isProfileModal,
                badgeSize
            };
            const verifiedHTML = this.generateVerifiedDisplayName(user, verificationOptions);
            console.log(`🎨 HTML generado: ${verifiedHTML}`);
            element.innerHTML = verifiedHTML;
        } else {
            // Solo agregar badge si no existe
            if (!element.querySelector('.verification-badge')) {
                const badge = this.generateVerificationBadge(badgeSize);
                element.insertAdjacentHTML('beforeend', ` ${badge}`);
                
                // SIEMPRE agregar etiqueta "Oficial" para usuarios verificados
                if (!element.querySelector('.official-label') && !element.querySelector('.official-label-no-bg')) {
                    const label = this.generateOfficialLabel(!isProfileModal);
                    element.insertAdjacentHTML('beforeend', ` ${label}`);
                }
            }
        }
    }
    
    /**
     * Actualizar todos los elementos de usuario en la página
     */
    updateAllUserElements() {
        console.log('🔄 Actualizando todos los elementos de usuario...');
        
        // Actualizar nombres en sidebar de contactos
        const contactElements = document.querySelectorAll('[data-user-email]');
        console.log(`📧 Encontrados ${contactElements.length} elementos con data-user-email`);
        
        contactElements.forEach(element => {
            const email = element.getAttribute('data-user-email');
            console.log(`📧 Verificando email: ${email}`);
            
            if (this.isVerifiedEmail(email)) {
                console.log(`✅ Email verificado: ${email}`);
                const user = { 
                    email, 
                    fullName: element.textContent.trim() 
                };
                this.applyVerificationToElement(element, user, { replaceContent: true });
            } else {
                console.log(`❌ Email no verificado: ${email}`);
            }
        });
        
        // Actualizar elementos de chat
        this.updateChatElements();
        
        // Actualizar elementos de perfil
        this.updateProfileElements();
        
        console.log('✅ Actualización completada');
    }
    
    /**
     * Actualizar elementos en el área de chat
     */
    updateChatElements() {
        // Headers de chat
        const chatHeaders = document.querySelectorAll('.chat-header-name, .mobile-chat-name');
        chatHeaders.forEach(element => {
            const email = element.getAttribute('data-user-email');
            if (email && this.isVerifiedEmail(email)) {
                const user = { email, fullName: element.textContent };
                this.applyVerificationToElement(element, user);
            }
        });
    }
    
    /**
     * Actualizar elementos de perfil
     */
    updateProfileElements() {
        // Perfil del usuario actual
        const currentUser = window.AuthManager?.getCurrentUser() || Utils.Storage.get('currentUser');
        if (currentUser && this.isUserVerified(currentUser)) {
            const profileNameElements = document.querySelectorAll('#current-user-name, #user-fullname-display');
            profileNameElements.forEach(element => {
                const isModal = element.id === 'user-fullname-display';
                this.applyVerificationToElement(element, currentUser, { 
                    replaceContent: true,
                    isProfileModal: isModal 
                });
            });
            
            // Aplicar badge a fotos de perfil
            this.applyProfilePhotoBadges(currentUser);
        }
    }
    
    /**
     * Aplicar badges a fotos de perfil
     */
    applyProfilePhotoBadges(user) {
        if (!this.isUserVerified(user)) return;
        
        // Buscar contenedores de avatar que no tengan ya el badge
        const avatarContainers = document.querySelectorAll('.user-avatar, .profile-avatar, .current-user-avatar');
        
        avatarContainers.forEach(container => {
            if (!container.querySelector('.profile-photo-badge')) {
                // Hacer el contenedor relativo para posicionamiento absoluto del badge
                container.style.position = 'relative';
                container.insertAdjacentHTML('beforeend', this.generateProfilePhotoBadge());
            }
        });
        
        // También aplicar al avatar del modal de perfil
        const profileAvatar = document.getElementById('user-profile-avatar');
        if (profileAvatar && !profileAvatar.parentElement.querySelector('.profile-photo-badge')) {
            const container = profileAvatar.parentElement;
            container.style.position = 'relative';
            container.insertAdjacentHTML('beforeend', this.generateProfilePhotoBadge());
        }
    }
    
    /**
     * Agregar nuevo correo verificado (función de desarrollo)
     */
    addVerifiedEmail(email) {
        if (!email || this.verifiedEmails.includes(email.toLowerCase().trim())) {
            return false;
        }
        
        this.verifiedEmails.push(email.toLowerCase().trim());
        console.log(`✅ Correo agregado a verificados: ${email}`);
        return true;
    }
    
    /**
     * Remover correo verificado (función de desarrollo)
     */
    removeVerifiedEmail(email) {
        const index = this.verifiedEmails.indexOf(email.toLowerCase().trim());
        if (index > -1) {
            this.verifiedEmails.splice(index, 1);
            console.log(`❌ Correo removido de verificados: ${email}`);
            return true;
        }
        return false;
    }
    
    /**
     * Obtener lista de correos verificados
     */
    getVerifiedEmails() {
        return [...this.verifiedEmails];
    }
}

// Crear instancia global
window.verificationSystem = new VerificationSystem();

// Funciones de conveniencia globales
window.isVerifiedUser = (user) => window.verificationSystem.isUserVerified(user);
window.isVerifiedEmail = (email) => window.verificationSystem.isVerifiedEmail(email);

// Aplicar verificaciones cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Aplicar inmediatamente
    if (window.verificationSystem) {
        window.verificationSystem.updateAllUserElements();
    }
    
    // Aplicar después de delays para elementos dinámicos
    setTimeout(() => {
        if (window.verificationSystem) {
            window.verificationSystem.updateAllUserElements();
        }
    }, 1000);
    
    setTimeout(() => {
        if (window.verificationSystem) {
            window.verificationSystem.updateAllUserElements();
        }
    }, 3000);
    
    // Aplicar cada vez que se detecten cambios en el DOM
    const observer = new MutationObserver(() => {
        setTimeout(() => {
            if (window.verificationSystem) {
                window.verificationSystem.updateAllUserElements();
            }
        }, 100);
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});

// Observer para aplicar verificación a elementos dinámicos
if (window.MutationObserver) {
    const observer = new MutationObserver((mutations) => {
        let needsUpdate = false;
        
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Verificar si hay elementos con data-user-email o nombres de usuario
                        if (node.getAttribute && node.getAttribute('data-user-email') || 
                            node.classList && (node.classList.contains('contact-name') || 
                                             node.classList.contains('chat-header-name'))) {
                            needsUpdate = true;
                        }
                    }
                });
            }
        });
        
        if (needsUpdate) {
            setTimeout(() => {
                window.verificationSystem.updateAllUserElements();
            }, 100);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

console.log('🔵 Sistema de Verificación cargado exitosamente');