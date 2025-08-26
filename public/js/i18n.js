/**
 * VigiChat Internationalization System
 * Sistema de internacionalización ligero pero completo para VigiChat
 */

class I18nManager {
    constructor() {
        this.currentLanguage = 'es'; // Idioma por defecto
        this.translations = {};
        this.supportedLanguages = {
            'es': {
                name: 'Español',
                nativeName: 'Español',
                flag: '🇪🇸',
                flagUrl: 'https://flagcdn.com/16x12/es.png'
            },
            'en': {
                name: 'English',
                nativeName: 'English', 
                flag: '🇺🇸',
                flagUrl: 'https://flagcdn.com/16x12/us.png'
            },
            'fr': {
                name: 'French',
                nativeName: 'Français',
                flag: '🇫🇷',
                flagUrl: 'https://flagcdn.com/16x12/fr.png'
            },
            'ht': {
                name: 'Haitian Creole',
                nativeName: 'Kreyòl Ayisyen',
                flag: '🇭🇹',
                flagUrl: 'https://flagcdn.com/16x12/ht.png'
            }
        };
        
        this.init();
    }
    
    async init() {
        // Cargar idioma guardado del localStorage
        const savedLanguage = localStorage.getItem('vigichat-language');
        if (savedLanguage && this.supportedLanguages[savedLanguage]) {
            this.currentLanguage = savedLanguage;
        }
        
        // Cargar traducciones
        await this.loadTranslations();
        
        // Aplicar traducciones
        this.applyTranslations();
        
        console.log(`🌐 I18n initialized with language: ${this.currentLanguage}`);
    }
    
    async loadTranslations() {
        try {
            // Cargar archivo de traducciones para el idioma actual
            const response = await fetch(`/translations/${this.currentLanguage}.json`);
            if (response.ok) {
                this.translations = await response.json();
                console.log(`✅ Translations loaded for: ${this.currentLanguage}`);
            } else {
                console.warn(`⚠️ No translations file found for: ${this.currentLanguage}`);
                // Fallback a español si no existe el archivo
                if (this.currentLanguage !== 'es') {
                    const fallbackResponse = await fetch('/translations/es.json');
                    if (fallbackResponse.ok) {
                        this.translations = await fallbackResponse.json();
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error loading translations:', error);
            // Usar traducciones inline como fallback
            this.translations = this.getFallbackTranslations();
        }
    }
    
    getFallbackTranslations() {
        const fallback = {
            es: {
                // Menú principal - formato plano
                'main_menu.profile_settings': 'Ajustes de perfil',
                'main_menu.add_contact': 'Agregar contacto',
                'main_menu.blocked_contacts': 'Contactos bloqueados',
                'main_menu.language': 'Idioma',
                'main_menu.help': 'Ayuda',
                'main_menu.logout': 'Cerrar sesión',
                
                // Chat
                'chat.online': 'En línea',
                'chat.offline': 'Desconectado',
                'chat.typing': 'Escribiendo...',
                'chat.last_seen': 'Visto por última vez',
                
                // Botones
                'buttons.send': 'Enviar',
                'buttons.cancel': 'Cancelar',
                'buttons.save': 'Guardar',
                'buttons.delete': 'Eliminar',
                
                // Llamadas
                'calls.incoming': 'Llamada entrante',
                'calls.outgoing': 'Llamando...',
                'calls.accept': 'Aceptar',
                'calls.decline': 'Rechazar',
                'calls.end': 'Finalizar'
            },
            en: {
                // Menú principal - formato plano
                'main_menu.profile_settings': 'Profile Settings',
                'main_menu.add_contact': 'Add Contact',
                'main_menu.blocked_contacts': 'Blocked Contacts',
                'main_menu.language': 'Language',
                'main_menu.help': 'Help',
                'main_menu.logout': 'Logout',
                
                'chat.online': 'Online',
                'chat.offline': 'Offline',
                'chat.typing': 'Typing...',
                'chat.last_seen': 'Last seen',
                
                'buttons.send': 'Send',
                'buttons.cancel': 'Cancel',
                'buttons.save': 'Save',
                'buttons.delete': 'Delete',
                
                'calls.incoming': 'Incoming Call',
                'calls.outgoing': 'Calling...',
                'calls.accept': 'Accept',
                'calls.decline': 'Decline',
                'calls.end': 'End Call'
            },
            fr: {
                // Menú principal - formato plano
                'main_menu.profile_settings': 'Paramètres du profil',
                'main_menu.add_contact': 'Ajouter un contact',
                'main_menu.blocked_contacts': 'Contacts bloqués',
                'main_menu.language': 'Langue',
                'main_menu.help': 'Aide',
                'main_menu.logout': 'Se déconnecter',
                
                'chat.online': 'En ligne',
                'chat.offline': 'Hors ligne',
                'chat.typing': 'En train d\'écrire...',
                'chat.last_seen': 'Vu pour la dernière fois',
                
                'buttons.send': 'Envoyer',
                'buttons.cancel': 'Annuler',
                'buttons.save': 'Sauvegarder',
                'buttons.delete': 'Supprimer',
                
                'calls.incoming': 'Appel entrant',
                'calls.outgoing': 'Appel en cours...',
                'calls.accept': 'Accepter',
                'calls.decline': 'Refuser',
                'calls.end': 'Raccrocher'
            },
            ht: {
                // Menú principal - formato plano
                'main_menu.profile_settings': 'Paramèt pwofil yo',
                'main_menu.add_contact': 'Ajoute kontak',
                'main_menu.blocked_contacts': 'Kontak yo bloke',
                'main_menu.language': 'Lang',
                'main_menu.help': 'Èd',
                'main_menu.logout': 'Soti',
                
                'chat.online': 'Sou entènèt',
                'chat.offline': 'Pa konekte',
                'chat.typing': 'Y ap ekri...',
                'chat.last_seen': 'Te wè dènye fwa',
                
                'buttons.send': 'Voye',
                'buttons.cancel': 'Anile',
                'buttons.save': 'Sovgade',
                'buttons.delete': 'Efase',
                
                'calls.incoming': 'Appèl k ap antre',
                'calls.outgoing': 'Y ap rele...',
                'calls.accept': 'Aksepte',
                'calls.decline': 'Refize',
                'calls.end': 'Fini appèl la'
            }
        };
        
        return fallback[this.currentLanguage] || fallback.es;
    }
    
    // Obtener traducción
    t(key, params = {}) {
        const translation = this.translations[key] || key;
        
        // Reemplazar parámetros si los hay
        return Object.keys(params).reduce((str, param) => {
            return str.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
        }, translation);
    }
    
    // Cambiar idioma
    async changeLanguage(languageCode) {
        if (!this.supportedLanguages[languageCode]) {
            console.error(`❌ Unsupported language: ${languageCode}`);
            return false;
        }
        
        console.log(`🌐 Changing language from ${this.currentLanguage} to ${languageCode}`);
        
        this.currentLanguage = languageCode;
        localStorage.setItem('vigichat-language', languageCode);
        
        // Recargar traducciones
        await this.loadTranslations();
        
        // Aplicar traducciones
        this.applyTranslations();
        
        // Disparar evento personalizado
        const event = new CustomEvent('languageChanged', {
            detail: {
                language: languageCode,
                languageInfo: this.supportedLanguages[languageCode]
            }
        });
        document.dispatchEvent(event);
        
        console.log(`✅ Language changed to: ${languageCode}`);
        return true;
    }
    
    // Aplicar traducciones al DOM
    applyTranslations() {
        console.log('🌐 Applying translations...', this.translations);
        
        // Buscar elementos con data-i18n
        const elements = document.querySelectorAll('[data-i18n]');
        
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            // Solo actualizar si la traducción es diferente de la clave
            if (translation !== key) {
                // Determinar si actualizar textContent o placeholder
                if (element.tagName === 'INPUT' && element.type === 'text') {
                    element.placeholder = translation;
                } else if (element.tagName === 'INPUT' && element.type === 'submit') {
                    element.value = translation;
                } else {
                    element.textContent = translation;
                }
                console.log(`✅ Translated ${key} -> ${translation}`);
            } else {
                console.warn(`⚠️ No translation found for key: ${key}`);
            }
        });
        
        // Actualizar atributos title y aria-label
        const titleElements = document.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });
        
        const ariaElements = document.querySelectorAll('[data-i18n-aria]');
        ariaElements.forEach(element => {
            const key = element.getAttribute('data-i18n-aria');
            element.setAttribute('aria-label', this.t(key));
        });
        
        console.log(`✅ Applied ${elements.length} translations`);
    }
    
    // Obtener lista de idiomas soportados
    getSupportedLanguages() {
        return this.supportedLanguages;
    }
    
    // Obtener idioma actual
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    
    // Detectar idioma del navegador
    detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0].toLowerCase();
        
        // Mapear códigos especiales
        const langMapping = {
            'ht': 'ht', // Haitian Creole
            'fr': 'fr', // French
            'en': 'en', // English
            'es': 'es'  // Spanish
        };
        
        return langMapping[langCode] || 'es'; // Default a español
    }
    
    // Inicializar con idioma del navegador si no hay preferencia guardada
    initWithBrowserLanguage() {
        const savedLanguage = localStorage.getItem('vigichat-language');
        if (!savedLanguage) {
            const detectedLang = this.detectBrowserLanguage();
            if (this.supportedLanguages[detectedLang]) {
                this.changeLanguage(detectedLang);
            }
        }
    }
}

// Instanciar y exportar globalmente
window.i18n = new I18nManager();

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.i18n.initWithBrowserLanguage();
            // Aplicar traducciones después de un pequeño delay
            setTimeout(() => {
                window.i18n.applyTranslations();
            }, 200);
        }, 100);
    });
} else {
    setTimeout(() => {
        window.i18n.initWithBrowserLanguage();
        // Aplicar traducciones después de un pequeño delay
        setTimeout(() => {
            window.i18n.applyTranslations();
        }, 200);
    }, 100);
}

// Función de conveniencia global para traducciones
window.t = (key, params) => window.i18n.t(key, params);

// Funciones de debugging globales
window.debugI18n = {
    // Mostrar todas las traducciones actuales
    showTranslations: () => {
        console.log('🌐 Current translations:', window.i18n.translations);
    },
    
    // Forzar aplicación de traducciones
    forceApply: () => {
        console.log('🌐 Force applying translations...');
        window.i18n.applyTranslations();
    },
    
    // Mostrar elementos con data-i18n
    showI18nElements: () => {
        const elements = document.querySelectorAll('[data-i18n]');
        console.log(`🌐 Found ${elements.length} elements with data-i18n:`);
        elements.forEach(el => {
            console.log(`- ${el.getAttribute('data-i18n')}: "${el.textContent}" (${el.tagName})`);
        });
    },
    
    // Cambiar idioma para testing
    changeLanguage: (lang) => {
        window.i18n.changeLanguage(lang);
    }
};

console.log('🌐 I18n system loaded. Use window.debugI18n for debugging.');