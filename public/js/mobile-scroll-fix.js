/**
 * MOBILE SCROLL FIX - For Touch Screens
 * Direct implementation that works on touch screens
 * Minimal, focused solution
 */

class MobileScrollFix {
    constructor() {
        this.containers = [];
        this.isTouchDevice = this.detectTouchScreen();
        this.init();
    }

    detectTouchScreen() {
        // Detect ACTUAL touch screen devices
        return (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0 ||
            window.matchMedia('(pointer: coarse)').matches
        );
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.fixMobileScroll());
        } else {
            this.fixMobileScroll();
        }
        
        // Re-apply fixes when new elements are added
        const observer = new MutationObserver(() => {
            this.fixMobileScroll();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    fixMobileScroll() {
        console.log('🔧 Aplicando fix para scroll en pantalla táctil...');
        
        // Find scroll containers
        this.containers = document.querySelectorAll(
            '.messages-container, .messages-scroll, #messages-scroll, [data-scroll]'
        );

        if (this.containers.length === 0) {
            console.warn('⚠️ No se encontraron contenedores de scroll');
            return;
        }

        this.containers.forEach(container => {
            this.applyTouchScrollFix(container);
        });

        // Fix body and html
        this.fixPageScroll();

        console.log(`✅ Fix aplicado a ${this.containers.length} contenedores`);
    }

    applyTouchScrollFix(container) {
        if (!container) return;

        console.log(`🔧 Aplicando fix a: ${container.className || container.id}`);

        // CRITICAL: Basic properties for touch scroll
        container.style.overflowY = 'scroll';
        container.style.overflowX = 'hidden';
        container.style.height = '100%';
        container.style.maxHeight = '100vh';
        
        if (this.isTouchDevice) {
            // TOUCH DEVICE: Enable momentum scrolling
            container.style.webkitOverflowScrolling = 'touch';
            container.style.touchAction = 'pan-y';
            container.style.transform = 'translateZ(0)';
            
            // Remove scrollbar on touch devices
            container.style.scrollbarWidth = 'none';
            container.style.msOverflowStyle = 'none';
            
            console.log('📱 Configuración táctil aplicada');
        } else {
            // NON-TOUCH: Standard scrolling
            container.style.webkitOverflowScrolling = 'auto';
            container.style.touchAction = 'auto';
            
            console.log('🖥️ Configuración desktop aplicada');
        }

        // FORCE: Remove conflicting properties
        container.style.scrollBehavior = 'auto';
        container.style.scrollSnapType = 'none';
        container.style.overscrollBehavior = 'auto';

        // ENSURE: Container has content and is scrollable
        this.ensureScrollable(container);
    }

    ensureScrollable(container) {
        // Make sure container has proper dimensions
        const rect = container.getBoundingClientRect();
        const hasContent = container.scrollHeight > container.clientHeight;
        
        console.log(`📏 Container: ${rect.width}x${rect.height}, Scrollable: ${hasContent}`);
        
        if (rect.height === 0) {
            console.warn('⚠️ Container has zero height, forcing minimum height');
            container.style.minHeight = '300px';
        }

        if (!hasContent) {
            console.warn('⚠️ Container has no scrollable content');
        }
    }

    fixPageScroll() {
        if (this.isTouchDevice) {
            // Prevent page scroll interference
            document.body.style.height = '100vh';
            document.body.style.overflowX = 'hidden';
            document.body.style.overscrollBehaviorY = 'contain';
            
            document.documentElement.style.height = '100%';
            document.documentElement.style.overflowX = 'hidden';
            
            console.log('📱 Page scroll fixed for touch device');
        }
    }

    // Manual force fix
    forceFix() {
        console.log('🚨 FORCE FIX: Aplicando todas las correcciones...');
        
        // Find ALL possible scroll containers
        const allContainers = document.querySelectorAll(
            'div, section, main, article, aside'
        );

        allContainers.forEach(el => {
            if (el.scrollHeight > el.clientHeight || 
                el.classList.toString().includes('scroll') ||
                el.classList.toString().includes('message')) {
                
                console.log(`🔧 Force fixing: ${el.tagName} ${el.className}`);
                
                el.style.overflowY = 'scroll';
                el.style.webkitOverflowScrolling = 'touch';
                el.style.touchAction = 'pan-y';
                el.style.transform = 'translateZ(0)';
            }
        });

        // Force viewport fix
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no';
        }

        console.log('🚨 Force fix completed');
    }

    // Add debug visual
    addDebugVisuals() {
        this.containers.forEach(container => {
            container.classList.add('mobile-scroll-debug');
        });
        console.log('🐛 Debug visuals added');
    }

    // Remove debug visual
    removeDebugVisuals() {
        this.containers.forEach(container => {
            container.classList.remove('mobile-scroll-debug');
        });
        console.log('🐛 Debug visuals removed');
    }

    // Get diagnostic info
    getDiagnostics() {
        const info = {
            isTouchDevice: this.isTouchDevice,
            containerCount: this.containers.length,
            containers: [],
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            userAgent: navigator.userAgent
        };

        this.containers.forEach((container, index) => {
            const rect = container.getBoundingClientRect();
            const computed = window.getComputedStyle(container);
            
            info.containers.push({
                index,
                className: container.className,
                id: container.id,
                dimensions: `${rect.width}x${rect.height}`,
                overflowY: computed.overflowY,
                webkitOverflowScrolling: computed.webkitOverflowScrolling,
                touchAction: computed.touchAction,
                scrollable: container.scrollHeight > container.clientHeight
            });
        });

        return info;
    }
}

// Initialize
const mobileScrollFix = new MobileScrollFix();

// Global functions
window.fixMobileScrollNow = function() {
    mobileScrollFix.fixMobileScroll();
};

window.forceMobileScrollFix = function() {
    mobileScrollFix.forceFix();
};

window.debugMobileScroll = function() {
    mobileScrollFix.addDebugVisuals();
    console.log('Diagnostics:', mobileScrollFix.getDiagnostics());
};

window.hideMobileScrollDebug = function() {
    mobileScrollFix.removeDebugVisuals();
};

console.log('✅ Mobile Scroll Fix cargado');
console.log(`📱 Pantalla táctil detectada: ${mobileScrollFix.isTouchDevice ? 'SÍ' : 'NO'}`);
console.log('🔧 Usa window.forceMobileScrollFix() si no funciona el scroll');
console.log('🐛 Usa window.debugMobileScroll() para diagnósticos');