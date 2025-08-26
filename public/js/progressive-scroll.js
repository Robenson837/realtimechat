/**
 * Progressive Scroll Manager for Mobile Conversations
 * Provides smooth, user-friendly scrolling without aggressive auto-scroll
 */

class ProgressiveScrollManager {
    constructor() {
        this.isUserScrolling = false;
        this.userScrollTimeout = null;
        this.pendingScrolls = new Set();
        this.scrollThreshold = 100; // Distance from bottom to show scroll button
        this.isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.conversationContainer = null;
        this.scrollToBottomBtn = null;
        this.lastKnownScrollPosition = 0;
        this.isNearBottom = true;
        this.lastScrollTime = 0; // Timestamp del último scroll
        this.newMessageNotification = null; // Para la notificación sutil
        
        // Use external configuration if available
        this.currentConfig = window.getProgressiveScrollConfig ? 
            window.getProgressiveScrollConfig() : 
            this.getDefaultConfig();
        this.init();
    }

    getDefaultConfig() {
        // Fallback configuration
        return this.isMobile ? {
            enableSmoothScroll: false,
            scrollThreshold: 150,
            userScrollDetectionDelay: 300,
            autoScrollForOwnMessages: true,
            autoScrollForOthersNearBottom: true,
            scrollAnimationDuration: 400
        } : {
            enableSmoothScroll: true,
            scrollThreshold: 100,
            userScrollDetectionDelay: 150,
            autoScrollForOwnMessages: true,
            autoScrollForOthersNearBottom: true,
            scrollAnimationDuration: 300
        };
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.conversationContainer = this.findScrollableContainer();
        this.scrollToBottomBtn = document.getElementById('scroll-to-bottom') || this.createScrollButton();
        
        if (this.conversationContainer) {
            this.attachScrollListeners();
            this.setupScrollButton();
            this.applyNaturalScrollOverrides();
            console.log('✅ Progressive scroll manager initialized with natural scroll overrides');
        }
    }

    findScrollableContainer() {
        // Buscar contenedor de conversación en orden de prioridad
        const selectors = [
            '#messages-scroll',
            '.messages-container',
            '.messages-scroll',
            '[data-conversation-scroll]'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                console.log(`📱 Found conversation container: ${selector}`);
                return element;
            }
        }

        console.warn('⚠️ No conversation container found');
        return null;
    }

    attachScrollListeners() {
        if (!this.conversationContainer) return;

        // Detectar scroll del usuario
        this.conversationContainer.addEventListener('scroll', this.handleScroll.bind(this), { 
            passive: true 
        });

        // Touch events para móvil
        if (this.isMobile) {
            this.conversationContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { 
                passive: true 
            });
            
            this.conversationContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { 
                passive: true 
            });

            this.conversationContainer.addEventListener('touchend', this.handleTouchEnd.bind(this), { 
                passive: true 
            });
        }
    }

    handleScroll(event) {
        const container = event.target;
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

        // Actualizar estado
        this.lastKnownScrollPosition = scrollTop;
        this.isNearBottom = distanceFromBottom <= (this.currentConfig.scrollThreshold || 150);
        this.lastScrollTime = Date.now(); // Registrar tiempo del scroll

        // Detectar si el usuario está scrolleando activamente
        this.markUserScrolling();

        // Actualizar botón de scroll
        this.updateScrollButton(distanceFromBottom);
        
        // Detectar scroll cerca del top para carga progresiva
        if (scrollTop <= 200) {
            this.onNearTopScroll();
        }

        // Debug logging
        if (window.DEBUG_SCROLL || (window.ProgressiveScrollConfig && window.ProgressiveScrollConfig.debug)) {
            console.log(`📱 Scroll: pos=${scrollTop}, bottom=${distanceFromBottom}, near=${this.isNearBottom}, userScrolling=${this.isUserScrolling}`);
        }
    }

    handleTouchStart(event) {
        if (this.isMobile) {
            this.isUserScrolling = true;
            this.clearUserScrollTimeout();
        }
    }

    handleTouchMove(event) {
        if (this.isMobile) {
            this.isUserScrolling = true;
            this.markUserScrolling();
        }
    }

    handleTouchEnd(event) {
        if (this.isMobile) {
            // Mantener flag por un tiempo después del touch
            this.clearUserScrollTimeout();
            this.userScrollTimeout = setTimeout(() => {
                this.isUserScrolling = false;
            }, this.currentConfig.userScrollDetectionDelay);
        }
    }

    markUserScrolling() {
        this.isUserScrolling = true;
        this.clearUserScrollTimeout();
        
        this.userScrollTimeout = setTimeout(() => {
            this.isUserScrolling = false;
        }, this.currentConfig.userScrollDetectionDelay || 300);
    }

    clearUserScrollTimeout() {
        if (this.userScrollTimeout) {
            clearTimeout(this.userScrollTimeout);
            this.userScrollTimeout = null;
        }
    }

    updateScrollButton(distanceFromBottom) {
        if (!this.scrollToBottomBtn) return;

        const shouldShow = distanceFromBottom > (this.currentConfig.scrollThreshold || 150);
        
        if (shouldShow && !this.scrollToBottomBtn.classList.contains('visible')) {
            this.scrollToBottomBtn.classList.add('visible');
            this.scrollToBottomBtn.style.display = 'flex';
        } else if (!shouldShow && this.scrollToBottomBtn.classList.contains('visible')) {
            this.scrollToBottomBtn.classList.remove('visible');
            setTimeout(() => {
                if (!this.scrollToBottomBtn.classList.contains('visible')) {
                    this.scrollToBottomBtn.style.display = 'none';
                }
            }, 300);
        }
    }

    createScrollButton() {
        const button = document.createElement('button');
        button.id = 'scroll-to-bottom';
        button.className = 'scroll-to-bottom';
        button.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M7 13l3 3 3-3m-3-9v12"/>
            </svg>
        `;
        button.style.display = 'none';
        
        button.addEventListener('click', () => this.scrollToBottomSmooth());
        
        // Añadir al contenedor padre de la conversación
        const chatContainer = document.querySelector('.chat-container') || 
                             document.querySelector('.main-content') || 
                             document.body;
        chatContainer.appendChild(button);
        
        return button;
    }

    setupScrollButton() {
        if (this.scrollToBottomBtn) {
            this.scrollToBottomBtn.addEventListener('click', () => this.scrollToBottomSmooth());
        }
    }

    // Método principal para scroll VERDADERAMENTE progresivo
    requestScroll(options = {}) {
        const { 
            force = false, 
            smooth = false, 
            reason = 'unknown',
            delay = 0,
            userInitiated = false
        } = options;

        if (delay > 0) {
            setTimeout(() => this.requestScroll({ ...options, delay: 0 }), delay);
            return;
        }

        // REGLA FUNDAMENTAL: Si el usuario está scrolleando o no está al final, NO hacer scroll automático
        if (!userInitiated && !force) {
            // Si el usuario está scrolleando activamente, nunca interrumpir
            if (this.isUserScrolling) {
                if (window.DEBUG_SCROLL) {
                    console.log(`📱 BLOCKED auto-scroll: User is actively scrolling (${reason})`);
                }
                return false;
            }

            // Si el usuario no está cerca del final, significa que está leyendo mensajes antiguos
            if (!this.isNearBottom) {
                if (window.DEBUG_SCROLL) {
                    console.log(`📱 BLOCKED auto-scroll: User is reading old messages (${reason})`);
                }
                // Mostrar notificación sutil de nuevo mensaje sin molestar
                this.showNewMessageNotification();
                return false;
            }

            // En móvil, ser aún más restrictivo
            if (this.isMobile) {
                // Verificar si hubo scroll reciente (último medio segundo)
                const timeSinceLastScroll = Date.now() - this.lastScrollTime;
                if (timeSinceLastScroll < 500) {
                    if (window.DEBUG_SCROLL) {
                        console.log(`📱 BLOCKED auto-scroll: Recent user scroll activity (${reason})`);
                    }
                    return false;
                }
            }
        }

        return this.executeScroll(smooth, reason);
    }

    // Apply natural scroll overrides to prevent automatic behaviors
    applyNaturalScrollOverrides() {
        if (!this.conversationContainer) return;

        // Apply force-natural-scroll class
        this.conversationContainer.classList.add('force-natural-scroll');
        
        // Apply device-specific inline styles
        const element = this.conversationContainer;
        element.style.scrollBehavior = 'auto';              // Always manual control
        element.style.scrollSnapType = 'none';              // Never auto-snap
        
        // Mobile vs Desktop specific settings
        if (this.isMobile) {
            // Enable touch scrolling for mobile
            element.style.webkitOverflowScrolling = 'touch'; 
            element.style.overscrollBehavior = 'contain';
            element.style.transform = 'translateZ(0)';
            element.style.willChange = 'scroll-position';
            element.style.touchAction = 'pan-y';
            console.log('📱 Applied mobile touch scroll settings');
        } else {
            // Disable momentum scrolling for desktop
            element.style.webkitOverflowScrolling = 'auto';
            element.style.overscrollBehavior = 'auto';
            element.style.transform = 'none';
            element.style.willChange = 'auto';
            console.log('🖥️ Applied desktop scroll settings');
        }

        // Apply to child message elements too
        const messages = element.querySelectorAll('.message, [class*="message"]');
        messages.forEach(msg => {
            msg.style.scrollSnapAlign = 'none';
            if (!this.isMobile) {
                msg.style.transform = 'none';
            }
        });

        if (window.DEBUG_SCROLL) {
            element.classList.add('debug-scroll-natural');
            console.log('🎯 Natural scroll overrides applied to conversation container');
        }
    }

    // Mostrar notificación sutil de nuevo mensaje sin molestar al usuario
    showNewMessageNotification() {
        // Solo mostrar si no hay una notificación activa
        if (this.newMessageNotification && this.newMessageNotification.style.display !== 'none') {
            return;
        }

        // Crear o actualizar notificación
        if (!this.newMessageNotification) {
            this.newMessageNotification = document.createElement('div');
            this.newMessageNotification.className = 'new-message-notification';
            this.newMessageNotification.innerHTML = `
                <div class="notification-content">
                    <span class="notification-text">Nuevo mensaje</span>
                    <button class="notification-dismiss" onclick="this.parentElement.parentElement.style.display='none'">×</button>
                </div>
            `;
            
            // Agregar al contenedor
            const chatContainer = document.querySelector('.chat-container') || 
                                 document.querySelector('.main-content') || 
                                 document.body;
            chatContainer.appendChild(this.newMessageNotification);
        }

        // Mostrar notificación
        this.newMessageNotification.style.display = 'flex';
        this.newMessageNotification.classList.add('show');

        // Auto-ocultar después de 4 segundos
        setTimeout(() => {
            if (this.newMessageNotification) {
                this.newMessageNotification.classList.remove('show');
                setTimeout(() => {
                    if (this.newMessageNotification) {
                        this.newMessageNotification.style.display = 'none';
                    }
                }, 300);
            }
        }, 4000);
    }

    executeScroll(smooth = false, reason = 'unknown') {
        if (!this.conversationContainer) return false;

        const container = this.conversationContainer;
        const targetScrollTop = container.scrollHeight - container.clientHeight;
        
        if (targetScrollTop <= 0) return true; // Ya está en el top

        try {
            if (smooth && this.currentConfig.enableSmoothScroll) {
                container.scrollTo({
                    top: targetScrollTop,
                    behavior: 'smooth'
                });
            } else {
                // Scroll instantáneo para móvil
                container.scrollTop = targetScrollTop;
            }

            // Verificar éxito
            const actualPosition = container.scrollTop;
            const success = Math.abs(actualPosition - targetScrollTop) <= 10;
            
            if (success) {
                this.isNearBottom = true;
                this.lastKnownScrollPosition = actualPosition;
            }

            if (window.DEBUG_SCROLL) {
                console.log(`📱 Scroll executed (${reason}): target=${targetScrollTop}, actual=${actualPosition}, success=${success}`);
            }

            return success;
        } catch (error) {
            console.error('Error executing scroll:', error);
            return false;
        }
    }

    // Scroll suave al presionar el botón - INICIADO POR USUARIO
    scrollToBottomSmooth() {
        if (!this.conversationContainer) return;

        const container = this.conversationContainer;
        const targetScrollTop = container.scrollHeight - container.clientHeight;

        // Este SÍ es iniciado por el usuario, así que siempre se ejecuta
        if (this.isMobile) {
            this.animateScrollToPosition(container, targetScrollTop, this.currentConfig.scrollAnimationDuration || 400);
        } else {
            container.scrollTo({
                top: targetScrollTop,
                behavior: 'smooth'
            });
        }

        // Ocultar notificación de nuevo mensaje si existe
        if (this.newMessageNotification) {
            this.newMessageNotification.style.display = 'none';
        }

        // Ocultar botón inmediatamente
        if (this.scrollToBottomBtn) {
            this.scrollToBottomBtn.classList.remove('visible');
            this.scrollToBottomBtn.style.display = 'none';
        }
        
        if (window.DEBUG_SCROLL) {
            console.log('📱 User-initiated scroll to bottom');
        }
    }

    // Animación personalizada para móvil
    animateScrollToPosition(element, targetPosition, duration = 400) {
        const startPosition = element.scrollTop;
        const distance = targetPosition - startPosition;
        let startTime = null;

        const animationStep = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            
            // Función de easing suave
            const easedProgress = this.easeOutCubic(progress);
            
            element.scrollTop = startPosition + (distance * easedProgress);

            if (progress < 1) {
                requestAnimationFrame(animationStep);
            } else {
                // Asegurar posición final
                element.scrollTop = targetPosition;
                this.isNearBottom = true;
                this.lastKnownScrollPosition = targetPosition;
            }
        };

        requestAnimationFrame(animationStep);
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    // Método para nuevos mensajes - VERDADERAMENTE progresivo
    onNewMessage(options = {}) {
        const { fromCurrentUser = false, conversationId = null } = options;

        // NUEVA FILOSOFÍA: Solo hacer scroll automático en casos muy específicos
        if (fromCurrentUser) {
            // ÚNICO caso de auto-scroll: mensaje del propio usuario
            // Pero solo si no está leyendo mensajes antiguos
            if (this.isNearBottom && !this.isUserScrolling) {
                return this.requestScroll({ 
                    force: false, // No forzar, respetar las reglas
                    smooth: this.currentConfig.enableSmoothScroll, 
                    reason: 'user_own_message',
                    userInitiated: false
                });
            } else {
                // Incluso para mensajes propios, si está leyendo arriba, no molestar
                if (window.DEBUG_SCROLL) {
                    console.log('📱 Not scrolling for own message - user is reading old messages');
                }
                this.showNewMessageNotification();
                return false;
            }
        } else {
            // MENSAJES DE OTROS: NUNCA hacer scroll automático
            // Solo mostrar notificación sutil
            if (window.DEBUG_SCROLL) {
                console.log('📱 New message from others - showing notification only');
            }
            this.showNewMessageNotification();
            return false;
        }
    }
    
    // Método para detectar cuando el usuario llega cerca del top
    onNearTopScroll() {
        // Integración con progressive message loader
        if (window.progressiveMessageLoader && !window.progressiveMessageLoader.isLoading) {
            const container = this.conversationContainer;
            if (container && container.scrollTop <= 200) {
                console.log('📄 Near top detected - triggering progressive load');
                // No cargar aquí directamente, el ProgressiveMessageLoader maneja esto
            }
        }
    }

    // Método para cargar conversación - más suave
    onConversationLoad() {
        // Al cargar nueva conversación, ir al final pero con retraso
        // para permitir que el usuario vea que se está cargando
        setTimeout(() => {
            this.requestScroll({ 
                force: true, // Solo aquí forzamos porque es carga inicial
                smooth: true, // Siempre suave al cargar
                reason: 'conversation_load',
                userInitiated: false
            });
        }, 200); // Más tiempo para que el usuario vea la carga
    }

    // Método para cargar mensajes antiguos
    onLoadOlderMessages(firstVisibleMessageId) {
        // Mantener posición relativa al cargar mensajes antiguos
        if (this.conversationContainer && firstVisibleMessageId) {
            const firstVisibleMessage = document.querySelector(`[data-message-id="${firstVisibleMessageId}"]`);
            if (firstVisibleMessage) {
                firstVisibleMessage.scrollIntoView({ block: 'start' });
                console.log('📱 Maintained position after loading older messages');
            }
        }
    }

    // Refresh manual
    refresh() {
        this.setup();
    }

    // Actualizar configuración
    updateConfig(newConfig) {
        this.currentConfig = { ...this.currentConfig, ...newConfig };
        console.log('📱 Progressive scroll config updated:', this.currentConfig);
    }

    // Debug helper
    getScrollState() {
        if (!this.conversationContainer) return null;

        const container = this.conversationContainer;
        return {
            scrollTop: container.scrollTop,
            scrollHeight: container.scrollHeight,
            clientHeight: container.clientHeight,
            distanceFromBottom: container.scrollHeight - container.scrollTop - container.clientHeight,
            isNearBottom: this.isNearBottom,
            isUserScrolling: this.isUserScrolling,
            isMobile: this.isMobile
        };
    }
}

// Inicializar manager
const progressiveScroll = new ProgressiveScrollManager();

// Exportar para uso global
window.ProgressiveScrollManager = ProgressiveScrollManager;
window.progressiveScroll = progressiveScroll;

// Helper functions para testing
window.testProgressiveScroll = function() {
    console.log('🧪 Testing progressive scroll behavior...');
    window.enableScrollDebug();
    
    console.log('Current scroll state:', window.progressiveScroll.getScrollState());
    console.log('Current config:', window.progressiveScroll.currentConfig);
    
    console.log('📱 Try scrolling up and see if auto-scroll is blocked');
    console.log('📱 Try sending a message while scrolled up');
    console.log('📱 The system should show notifications instead of auto-scrolling');
};

window.resetProgressiveScroll = function() {
    console.log('🔄 Resetting progressive scroll...');
    if (window.progressiveScroll) {
        window.progressiveScroll.refresh();
    }
};

// Test natural scroll behavior
window.testNaturalScroll = function() {
    console.log('🧪 Testing natural scroll behavior...');
    
    const container = window.progressiveScroll?.conversationContainer;
    if (!container) {
        console.error('❌ No conversation container found');
        return;
    }
    
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log(`📱 Device type: ${isMobile ? 'Mobile' : 'Desktop'}`);
    
    // Test current CSS properties
    const computed = window.getComputedStyle(container);
    const tests = {
        'scroll-behavior': computed.scrollBehavior,
        '-webkit-overflow-scrolling': computed.webkitOverflowScrolling,
        'scroll-snap-type': computed.scrollSnapType,
        'overscroll-behavior': computed.overscrollBehavior,
        'transform': computed.transform,
        'will-change': computed.willChange,
        'touch-action': computed.touchAction
    };
    
    console.log('📊 Current scroll properties:');
    Object.entries(tests).forEach(([prop, value]) => {
        let isCorrect = false;
        
        if (isMobile) {
            // Mobile should have touch enabled but no snap
            isCorrect = (
                (prop === 'scroll-behavior' && value === 'auto') ||
                (prop === '-webkit-overflow-scrolling' && value === 'touch') ||
                (prop === 'scroll-snap-type' && value === 'none') ||
                (prop === 'overscroll-behavior' && value === 'contain') ||
                (prop === 'touch-action' && value.includes('pan-y')) ||
                (prop === 'transform' && (value !== 'none' && value !== 'matrix(1, 0, 0, 1, 0, 0)')) ||
                (prop === 'will-change' && value === 'scroll-position')
            );
        } else {
            // Desktop should be natural
            isCorrect = (
                (prop === 'scroll-behavior' && value === 'auto') ||
                (prop === '-webkit-overflow-scrolling' && value === 'auto') ||
                (prop === 'scroll-snap-type' && value === 'none') ||
                (prop === 'overscroll-behavior' && value === 'auto') ||
                (prop === 'transform' && (value === 'none' || value === 'matrix(1, 0, 0, 1, 0, 0)')) ||
                (prop === 'will-change' && value === 'auto')
            );
        }
        
        console.log(`   ${isCorrect ? '✅' : '❌'} ${prop}: ${value}`);
    });
    
    // Test touch scrolling capability on mobile
    if (isMobile) {
        console.log('📱 Testing touch scroll capability...');
        
        // Check if touch events are supported
        const hasTouchSupport = 'ontouchstart' in window;
        console.log(`   Touch events supported: ${hasTouchSupport ? '✅' : '❌'}`);
        
        // Test scroll height vs client height
        const hasScrollableContent = container.scrollHeight > container.clientHeight;
        console.log(`   Has scrollable content: ${hasScrollableContent ? '✅' : '❌'} (${container.scrollHeight}px vs ${container.clientHeight}px)`);
        
        if (!hasScrollableContent) {
            console.log('   ⚠️ No scrollable content - add more messages to test');
        }
    }
    
    // Test scroll position stability
    console.log('📍 Testing scroll position stability...');
    const initialPos = container.scrollTop;
    console.log(`   Initial position: ${initialPos}px`);
    
    // Force apply natural overrides again
    if (window.progressiveScroll) {
        window.progressiveScroll.applyNaturalScrollOverrides();
        console.log('   🔧 Re-applied natural scroll overrides');
    }
    
    setTimeout(() => {
        const finalPos = container.scrollTop;
        console.log(`   Final position: ${finalPos}px`);
        
        if (Math.abs(finalPos - initialPos) < 5) {
            console.log('   ✅ Scroll position is stable - no automatic movement detected');
        } else {
            console.log('   ❌ Scroll position changed automatically - may need additional fixes');
        }
    }, 100);
};

// Activar debug mode para desarrollo (descomenta para testing)
// window.DEBUG_SCROLL = true;
// window.testProgressiveScroll();

// Function to force-fix scroll issues in real-time
window.fixMobileScrollNow = function() {
    console.log('🔧 Force-fixing mobile scroll issues...');
    
    const containers = document.querySelectorAll('.messages-container, .messages-scroll, #messages-scroll');
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    containers.forEach(container => {
        if (!container) return;
        
        // Force mobile-friendly settings
        if (isMobile) {
            container.style.webkitOverflowScrolling = 'touch';
            container.style.overscrollBehavior = 'contain';
            container.style.touchAction = 'pan-y';
            container.style.transform = 'translateZ(0)';
            container.style.willChange = 'scroll-position';
        }
        
        // Always disable snap behavior
        container.style.scrollBehavior = 'auto';
        container.style.scrollSnapType = 'none';
        
        console.log(`✅ Fixed scroll for: ${container.className || container.id}`);
    });
    
    // Force re-apply to progressive scroll if available
    if (window.progressiveScroll) {
        window.progressiveScroll.applyNaturalScrollOverrides();
    }
    
    // Test the result
    setTimeout(() => {
        window.testNaturalScroll();
    }, 100);
};

console.log('✅ Progressive Scroll Manager loaded');
console.log('📱 Auto-scroll is DISABLED - user has full control');
console.log('🔧 Touch scrolling ENABLED for mobile devices');
console.log('🛠️ Use window.testNaturalScroll() to test scroll behavior');
console.log('🚨 Use window.fixMobileScrollNow() if scroll doesn\'t work on mobile');