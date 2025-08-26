/**
 * STANDARD MOBILE TOUCH HANDLER - Cross-Browser Compatible
 * Ensures proper touch scrolling on all mobile devices
 * Based on 2024 Web Standards
 */

class StandardMobileTouchHandler {
    constructor() {
        this.isMobile = this.detectMobileDevice();
        this.isTouch = this.detectTouchCapability();
        this.containers = [];
        this.init();
    }

    // STANDARD: Modern mobile device detection
    detectMobileDevice() {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (navigator.maxTouchPoints && navigator.maxTouchPoints > 2) ||
               window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    }

    // STANDARD: Touch capability detection
    detectTouchCapability() {
        return 'ontouchstart' in window ||
               navigator.maxTouchPoints > 0 ||
               navigator.msMaxTouchPoints > 0;
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.findScrollContainers();
        this.applyStandardTouchScrolling();
        this.setupViewportMeta();
        this.preventScrollConflicts();
        
        console.log(`📱 Standard Mobile Touch Handler initialized`);
        console.log(`   Device: ${this.isMobile ? 'Mobile' : 'Desktop'}`);
        console.log(`   Touch: ${this.isTouch ? 'Enabled' : 'Disabled'}`);
        console.log(`   Containers: ${this.containers.length}`);
    }

    findScrollContainers() {
        const selectors = [
            '.messages-container',
            '.messages-scroll', 
            '#messages-scroll',
            '.chat-list',
            '.contacts-list',
            '[data-scroll="true"]'
        ];

        this.containers = [];
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (!this.containers.includes(element)) {
                    this.containers.push(element);
                }
            });
        });
    }

    applyStandardTouchScrolling() {
        this.containers.forEach(container => {
            if (!container) return;

            // CRITICAL: Set overflow for scrolling to work
            container.style.overflowY = 'scroll';
            container.style.overflowX = 'hidden';

            if (this.isMobile || this.isTouch) {
                // MOBILE: Apply mobile-specific properties
                this.applyMobileScrollProperties(container);
            } else {
                // DESKTOP: Apply desktop-specific properties  
                this.applyDesktopScrollProperties(container);
            }

            // UNIVERSAL: Properties for all devices
            container.style.scrollBehavior = 'auto';
            container.style.scrollSnapType = 'none';
            
            console.log(`✅ Applied standard touch scrolling to: ${container.className || container.id}`);
        });
    }

    applyMobileScrollProperties(container) {
        // STANDARD: Modern touch-action (2024)
        container.style.touchAction = 'pan-y';
        
        // WEBKIT: Legacy iOS support (still required)
        container.style.webkitOverflowScrolling = 'touch';
        
        // MODERN: Standard overscroll behavior
        container.style.overscrollBehavior = 'contain';
        container.style.overscrollBehaviorY = 'contain';
        
        // PERFORMANCE: Hardware acceleration
        container.style.transform = 'translate3d(0, 0, 0)';
        container.style.webkitTransform = 'translate3d(0, 0, 0)';
        
        // OPTIMIZATION: Better rendering
        container.style.webkitBackfaceVisibility = 'hidden';
        container.style.backfaceVisibility = 'hidden';
        
        // INTERACTION: Disable text selection during scroll
        container.style.webkitUserSelect = 'none';
        container.style.userSelect = 'none';
        
        // WEBKIT: Disable tap highlights
        container.style.webkitTapHighlightColor = 'transparent';
        
        // CONTAINMENT: Better performance
        container.style.contain = 'layout style paint';
    }

    applyDesktopScrollProperties(container) {
        // DESKTOP: Natural scrolling
        container.style.webkitOverflowScrolling = 'auto';
        container.style.overscrollBehavior = 'auto';
        container.style.transform = 'none';
        container.style.webkitUserSelect = 'text';
        container.style.userSelect = 'text';
    }

    setupViewportMeta() {
        if (!this.isMobile) return;

        // ENSURE: Proper viewport meta tag for mobile
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }

        // STANDARD: Mobile viewport settings
        const content = 'width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover';
        if (viewport.content !== content) {
            viewport.content = content;
            console.log('📱 Updated viewport meta tag for mobile');
        }
    }

    preventScrollConflicts() {
        if (!this.isMobile) return;

        // PREVENT: Document scroll conflicts on mobile
        document.addEventListener('touchstart', (e) => {
            // Allow scrolling in designated containers
            let target = e.target;
            while (target && target !== document.body) {
                if (this.containers.includes(target)) {
                    return; // Allow scrolling
                }
                target = target.parentElement;
            }
        }, { passive: true });

        // PREVENT: Overscroll on document body
        document.body.style.overscrollBehavior = 'contain';
        document.documentElement.style.overscrollBehavior = 'contain';
    }

    // PUBLIC: Force refresh of touch scrolling
    refresh() {
        this.findScrollContainers();
        this.applyStandardTouchScrolling();
        console.log('🔄 Standard touch scrolling refreshed');
    }

    // PUBLIC: Add new scrollable container
    addContainer(element) {
        if (element && !this.containers.includes(element)) {
            this.containers.push(element);
            
            if (this.isMobile || this.isTouch) {
                this.applyMobileScrollProperties(element);
            } else {
                this.applyDesktopScrollProperties(element);
            }
            
            element.style.overflowY = 'scroll';
            element.style.overflowX = 'hidden';
            element.style.scrollBehavior = 'auto';
            element.style.scrollSnapType = 'none';
            
            console.log('✅ Added new scrollable container:', element.className || element.id);
        }
    }

    // PUBLIC: Diagnostic information
    getDiagnostics() {
        return {
            isMobile: this.isMobile,
            isTouch: this.isTouch,
            containerCount: this.containers.length,
            userAgent: navigator.userAgent,
            maxTouchPoints: navigator.maxTouchPoints || 0,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                devicePixelRatio: window.devicePixelRatio || 1
            }
        };
    }
}

// INITIALIZE: Create global instance
const standardTouchHandler = new StandardMobileTouchHandler();

// EXPORT: Global access
window.StandardMobileTouchHandler = StandardMobileTouchHandler;
window.standardTouchHandler = standardTouchHandler;

// UTILITIES: Global helper functions
window.fixMobileScrollingNow = function() {
    console.log('🔧 Force-fixing mobile scrolling with standard methods...');
    
    if (window.standardTouchHandler) {
        window.standardTouchHandler.refresh();
    }
    
    // EMERGENCY: Direct CSS application
    const containers = document.querySelectorAll('.messages-container, .messages-scroll, #messages-scroll');
    containers.forEach(container => {
        if (standardTouchHandler.isMobile) {
            container.style.overflowY = 'scroll';
            container.style.webkitOverflowScrolling = 'touch';
            container.style.touchAction = 'pan-y';
            container.style.overscrollBehavior = 'contain';
            container.style.transform = 'translate3d(0, 0, 0)';
        }
        console.log(`🔧 Emergency fix applied to: ${container.className || container.id}`);
    });
};

window.testMobileScrolling = function() {
    console.log('🧪 Testing mobile scrolling capabilities...');
    
    const diagnostics = window.standardTouchHandler.getDiagnostics();
    console.log('📊 Device Diagnostics:', diagnostics);
    
    const container = document.querySelector('.messages-container') || 
                     document.querySelector('.messages-scroll') || 
                     document.querySelector('#messages-scroll');
    
    if (container) {
        const computed = window.getComputedStyle(container);
        console.log('📋 Container Properties:');
        console.log(`   overflow-y: ${computed.overflowY}`);
        console.log(`   -webkit-overflow-scrolling: ${computed.webkitOverflowScrolling || 'not set'}`);
        console.log(`   touch-action: ${computed.touchAction}`);
        console.log(`   overscroll-behavior: ${computed.overscrollBehavior || 'not set'}`);
        console.log(`   transform: ${computed.transform}`);
        
        const hasScroll = container.scrollHeight > container.clientHeight;
        console.log(`   Scrollable content: ${hasScroll ? '✅' : '❌'} (${container.scrollHeight}px vs ${container.clientHeight}px)`);
    } else {
        console.error('❌ No scrollable container found');
    }
};

console.log('✅ Standard Mobile Touch Handler loaded');
console.log('🔧 Use window.fixMobileScrollingNow() for emergency fixes');
console.log('🧪 Use window.testMobileScrolling() for diagnostics');