/**
 * I18n Initialization and Event Handlers
 * Maneja la inicialización de traducciones y eventos de cambio de idioma
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing i18n system...');
    
    // Escuchar eventos de cambio de idioma
    document.addEventListener('languageChanged', (event) => {
        console.log('Language changed event received:', event.detail);
        
        // Actualizar elementos específicos que no tienen data-i18n
        updateSpecificElements(event.detail.language);
        
        // Actualizar placeholders
        updatePlaceholders(event.detail.language);
        
        // Actualizar títulos de botones
        updateTitles(event.detail.language);
        
        // Reinicializar componentes que dependan del idioma
        reinitializeLanguageDependentComponents();
    });
    
    // Apply translations with debouncing to prevent loops
    let translationTimeout = null;
    let translationInProgress = false;
    let lastTranslationTime = 0;
    
    const applyTranslationsDebounced = () => {
        const now = Date.now();
        
        // Prevent too frequent applications
        if (now - lastTranslationTime < 2000) {
            console.log('Translation called too frequently, skipping');
            return;
        }
        
        if (translationInProgress) {
            console.log('Translation already in progress, skipping');
            return;
        }
        
        if (translationTimeout) {
            clearTimeout(translationTimeout);
        }
        
        translationTimeout = setTimeout(() => {
            if (window.i18n && !translationInProgress) {
                translationInProgress = true;
                lastTranslationTime = Date.now();
                
                console.log('Applying translations with debounce');
                window.i18n.applyTranslations();
                updateCurrentLanguageElements();
                
                setTimeout(() => {
                    translationInProgress = false;
                }, 500);
            }
        }, 500);
    };
    
    // Apply initial translations
    applyTranslationsDebounced();
    
    // Observer para aplicar traducciones a elementos que se agregan dinámicamente
    if (window.MutationObserver) {
        const observer = new MutationObserver((mutations) => {
            let needsTranslation = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Verificar si el nuevo nodo o sus hijos tienen data-i18n
                            if (node.getAttribute && node.getAttribute('data-i18n') || 
                                node.querySelectorAll && node.querySelectorAll('[data-i18n]').length > 0) {
                                needsTranslation = true;
                            }
                        }
                    });
                }
            });
            
            if (needsTranslation) {
                console.log('New translatable elements detected');
                applyTranslationsDebounced();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
});

function updateSpecificElements(language) {
    // Actualizar elementos que requieren lógica especial
    
    // Título de la página
    const title = document.querySelector('title');
    if (title) {
        const titles = {
            es: 'VigiChat - Mensajería Avanzada',
            en: 'VigiChat - Advanced Messaging',
            fr: 'VigiChat - Messagerie Avancée', 
            ht: 'VigiChat - Mesajri Avanse'
        };
        title.textContent = titles[language] || titles.es;
    }
    
    // Meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        const descriptions = {
            es: 'VigiChat - Aplicación de mensajería avanzada con funciones de vigilancia y tiempo real',
            en: 'VigiChat - Advanced messaging application with surveillance and real-time features',
            fr: 'VigiChat - Application de messagerie avancée avec fonctionnalités de surveillance et temps réel',
            ht: 'VigiChat - Aplikasyon mesajri avanse ak fonksyon sivèy ak tan reyèl'
        };
        metaDesc.content = descriptions[language] || descriptions.es;
    }
}

function updatePlaceholders(language) {
    // Actualizar placeholders que no se actualizan automáticamente
    const placeholders = {
        es: {
            search: 'Buscar chats...',
            message: 'Escribe un mensaje...',
            searchMessages: 'Buscar mensajes...'
        },
        en: {
            search: 'Search chats...',
            message: 'Type a message...',
            searchMessages: 'Search messages...'
        },
        fr: {
            search: 'Rechercher des conversations...',
            message: 'Tapez un message...',
            searchMessages: 'Rechercher des messages...'
        },
        ht: {
            search: 'Chèche konvèsasyon yo...',
            message: 'Ekri yon mesaj...',
            searchMessages: 'Chèche mesaj yo...'
        }
    };
    
    const langPlaceholders = placeholders[language] || placeholders.es;
    
    // Search input en sidebar
    const searchInput = document.querySelector('.search-container input');
    if (searchInput) {
        searchInput.placeholder = langPlaceholders.search;
    }
    
    // Message input
    const messageInput = document.querySelector('#message-input, .message-input');
    if (messageInput) {
        messageInput.placeholder = langPlaceholders.message;
    }
    
    // Search messages input
    const searchMessagesInput = document.querySelector('#conversation-search-input');
    if (searchMessagesInput) {
        searchMessagesInput.placeholder = langPlaceholders.searchMessages;
    }
}

function updateTitles(language) {
    // Actualizar títulos de botones que no tienen data-i18n-title
    const titles = {
        es: {
            mainMenu: 'Menú principal',
            search: 'Buscar en chat',
            call: 'Llamar',
            video: 'Videollamada',
            back: 'Volver'
        },
        en: {
            mainMenu: 'Main menu',
            search: 'Search in chat',
            call: 'Call',
            video: 'Video call',
            back: 'Back'
        },
        fr: {
            mainMenu: 'Menu principal',
            search: 'Rechercher dans le chat',
            call: 'Appeler',
            video: 'Appel vidéo',
            back: 'Retour'
        },
        ht: {
            mainMenu: 'Meni prensipal',
            search: 'Chèche nan chat la',
            call: 'Rele',
            video: 'Appèl videyo',
            back: 'Tounen'
        }
    };
    
    const langTitles = titles[language] || titles.es;
    
    // Main menu buttons
    const mainMenuBtns = document.querySelectorAll('#main-menu-btn, #mobile-menu-btn');
    mainMenuBtns.forEach(btn => {
        btn.title = langTitles.mainMenu;
    });
    
    // Search buttons
    const searchBtns = document.querySelectorAll('#search-btn, #search-messages-mobile-btn');
    searchBtns.forEach(btn => {
        btn.title = langTitles.search;
    });
    
    // Call buttons
    const callBtns = document.querySelectorAll('#call-btn, #call-mobile-btn');
    callBtns.forEach(btn => {
        btn.title = langTitles.call;
    });
    
    // Video buttons
    const videoBtns = document.querySelectorAll('#video-btn, #video-mobile-btn');
    videoBtns.forEach(btn => {
        btn.title = langTitles.video;
    });
    
    // Back button
    const backBtn = document.querySelector('#back-btn');
    if (backBtn) {
        backBtn.title = langTitles.back;
    }
}

function updateCurrentLanguageElements() {
    // Actualizar elementos que muestran el idioma actual
    if (window.languageSelector) {
        window.languageSelector.updateCurrentLanguageFlags();
    }
}

function reinitializeLanguageDependentComponents() {
    // Reinicializar componentes que dependen del idioma
    
    // Notificar a otros componentes del cambio
    if (window.chatManager) {
        // Actualizar textos dinámicos del chat
        window.chatManager.updateLanguageDependentTexts?.();
    }
    
    if (window.callManager) {
        // Actualizar textos de llamadas
        window.callManager.updateLanguageDependentTexts?.();
    }
    
    // Trigger resize para reajustar layouts si es necesario
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 100);
}

console.log('I18n initialization script loaded');