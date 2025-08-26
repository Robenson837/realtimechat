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
        return `<span class="${sizeClass}" title="Cuenta Oficial Verificada">
            <i class="fas fa-check-circle"></i>
        </span>`;
    }
    
    /**
     * Generar etiqueta "Oficial" con estilo
     */
    generateOfficialLabel() {
        return `<span class="official-label">Oficial</span>`;
    }
    
    /**
     * Generar nombre completo con verificación si aplica
     */
    generateVerifiedDisplayName(user, showOfficialLabel = true) {
        if (!user) return '';
        
        const userName = user.fullName || user.username || 'Usuario';
        const isVerified = this.isUserVerified(user);
        
        if (!isVerified) {
            return `<span class="user-display-name">${userName}</span>`;
        }
        
        // Usuario verificado
        let html = `<span class="user-display-name verified-user">${userName}</span>`;
        html += ` ${this.generateVerificationBadge()}`;
        
        if (showOfficialLabel) {
            html += ` ${this.generateOfficialLabel()}`;
        }
        
        return html;
    }
    
    /**
     * Aplicar verificación a un elemento existente
     */
    applyVerificationToElement(element, user, options = {}) {
        if (!element || !user) return;
        
        const {
            showOfficialLabel = true,
            badgeSize = 'normal',
            replaceContent = false
        } = options;
        
        const isVerified = this.isUserVerified(user);
        
        if (!isVerified) {
            // Remover clases de verificación si existen
            element.classList.remove('verified-user');
            return;
        }
        
        // Aplicar verificación
        element.classList.add('verified-user');
        
        if (replaceContent) {
            element.innerHTML = this.generateVerifiedDisplayName(user, showOfficialLabel);
        } else {
            // Solo agregar badge si no existe
            if (!element.querySelector('.verification-badge')) {
                const badge = this.generateVerificationBadge(badgeSize);
                element.insertAdjacentHTML('beforeend', ` ${badge}`);
                
                if (showOfficialLabel && !element.querySelector('.official-label')) {
                    const label = this.generateOfficialLabel();
                    element.insertAdjacentHTML('beforeend', ` ${label}`);
                }
            }
        }
    }
    
    /**
     * Actualizar todos los elementos de usuario en la página
     */
    updateAllUserElements() {
        // Actualizar nombres en sidebar de contactos
        const contactElements = document.querySelectorAll('[data-user-email]');
        contactElements.forEach(element => {
            const email = element.getAttribute('data-user-email');
            if (this.isVerifiedEmail(email)) {
                const user = { email, fullName: element.textContent };
                this.applyVerificationToElement(element, user);
            }
        });
        
        // Actualizar elementos de chat
        this.updateChatElements();
        
        // Actualizar elementos de perfil
        this.updateProfileElements();
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
                this.applyVerificationToElement(element, currentUser);
            });
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
    setTimeout(() => {
        window.verificationSystem.updateAllUserElements();
    }, 1000);
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