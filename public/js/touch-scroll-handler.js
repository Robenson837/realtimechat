/**
 * Touch Scroll Handler for Mobile and Tablet Devices
 * Provides enhanced touch scrolling experience across all devices
 */

class TouchScrollHandler {
    constructor() {
        this.isTouch = 'ontouchstart' in window;
        this.isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.scrollableElements = [];
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupTouchScrolling());
        } else {
            this.setupTouchScrolling();
        }
    }

    setupTouchScrolling() {
        // Find all scrollable elements
        this.scrollableElements = document.querySelectorAll('.scrollable-area, .messages-container, .messages-scroll, .chat-list, .contacts-list, .requests-list, .calls-list');
        
        if (this.isTouch || this.isMobile) {
            this.enhanceTouchScrolling();
        }

        // Setup observer for dynamically added elements
        this.observeNewElements();
        
        // Add momentum scrolling polyfill for older browsers
        this.addMomentumScrollingPolyfill();

        console.log('✅ Touch scroll handler initialized for', this.scrollableElements.length, 'elements');
    }

    enhanceTouchScrolling() {
        this.scrollableElements.forEach(element => {
            if (!element) return;

            // Add touch-specific properties
            element.style.webkitOverflowScrolling = 'touch';
            element.style.overscrollBehavior = 'contain';
            element.style.touchAction = 'pan-y';
            
            // Add performance optimizations
            element.style.willChange = 'scroll-position';
            element.style.transform = 'translateZ(0)';
            
            // Add touch event listeners for better handling
            this.addTouchEventListeners(element);
        });
    }

    addTouchEventListeners(element) {
        let isScrolling = false;
        let touchStart = 0;
        let scrollStart = 0;

        // Only add touch-specific behaviors on touch devices
        if (this.isTouch) {
            element.addEventListener('touchstart', (e) => {
                isScrolling = false;
                touchStart = e.touches[0].clientY;
                scrollStart = element.scrollTop;
            }, { passive: true });

            element.addEventListener('touchmove', (e) => {
                if (!isScrolling) {
                    isScrolling = true;
                    element.classList.add('is-scrolling');
                }
            }, { passive: true });

            element.addEventListener('touchend', () => {
                isScrolling = false;
                setTimeout(() => {
                    element.classList.remove('is-scrolling');
                }, 150);
            }, { passive: true });
        }

        // Handle momentum scrolling end - only on touch devices
        if (this.isTouch || this.isMobile) {
            let scrollTimeout;
            element.addEventListener('scroll', () => {
                clearTimeout(scrollTimeout);
                element.classList.add('is-scrolling');
                
                scrollTimeout = setTimeout(() => {
                    element.classList.remove('is-scrolling');
                }, 150);
            }, { passive: true });
        }
    }

    observeNewElements() {
        // Observer for dynamically added scrollable elements
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the new element is scrollable or contains scrollable elements
                        const newScrollables = node.querySelectorAll ? 
                            node.querySelectorAll('.scrollable-area, .messages-container, .messages-scroll, .chat-list, .contacts-list, .requests-list, .calls-list') : [];
                        
                        if (node.classList && (node.classList.contains('scrollable-area') || 
                            node.classList.contains('messages-container') || 
                            node.classList.contains('messages-scroll') ||
                            node.classList.contains('chat-list') ||
                            node.classList.contains('contacts-list') ||
                            node.classList.contains('requests-list') ||
                            node.classList.contains('calls-list'))) {
                            this.enhanceElement(node);
                        }
                        
                        newScrollables.forEach(el => this.enhanceElement(el));
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    enhanceElement(element) {
        if (this.isTouch || this.isMobile) {
            element.style.webkitOverflowScrolling = 'touch';
            element.style.overscrollBehavior = 'contain';
            element.style.touchAction = 'pan-y';
            element.style.willChange = 'scroll-position';
            element.style.transform = 'translateZ(0)';
            
            this.addTouchEventListeners(element);
            console.log('✅ Enhanced scrolling for new element:', element.className);
        } else {
            // Ensure desktop devices have proper click handling
            element.style.pointerEvents = 'auto';
            console.log('✅ Ensured click handling for desktop element:', element.className);
        }
    }

    addMomentumScrollingPolyfill() {
        // Polyfill for browsers that don't support -webkit-overflow-scrolling: touch
        if (!('webkitOverflowScrolling' in document.documentElement.style)) {
            console.log('🔧 Adding momentum scrolling polyfill');
            
            this.scrollableElements.forEach(element => {
                let isScrolling = false;
                let startY = 0;
                let scrollTop = 0;
                let velocity = 0;
                let amplitude = 0;
                let timestamp = 0;
                let ticker = 0;

                element.addEventListener('touchstart', (e) => {
                    isScrolling = true;
                    amplitude = 0;
                    velocity = 0;
                    timestamp = Date.now();
                    startY = e.touches[0].clientY;
                    scrollTop = element.scrollTop;
                    clearInterval(ticker);
                }, { passive: true });

                element.addEventListener('touchmove', (e) => {
                    if (!isScrolling) return;
                    
                    const now = Date.now();
                    const elapsed = now - timestamp;
                    timestamp = now;
                    
                    const deltaY = e.touches[0].clientY - startY;
                    velocity = 0.8 * (1000 * deltaY / (elapsed + 1)) + 0.2 * velocity;
                }, { passive: true });

                element.addEventListener('touchend', () => {
                    if (!isScrolling) return;
                    isScrolling = false;

                    if (velocity > 10 || velocity < -10) {
                        amplitude = 0.8 * velocity;
                        const target = Math.round(element.scrollTop - amplitude);
                        timestamp = Date.now();
                        
                        ticker = setInterval(() => {
                            const elapsed = Date.now() - timestamp;
                            const delta = -amplitude * Math.exp(-elapsed / 325);
                            
                            if (delta > 0.5 || delta < -0.5) {
                                element.scrollTop = target + delta;
                            } else {
                                clearInterval(ticker);
                            }
                        }, 16);
                    }
                }, { passive: true });
            });
        }
    }

    // Method to manually refresh scrollable elements
    refresh() {
        this.setupTouchScrolling();
    }

    // Method to add custom scrollable element
    addScrollableElement(element) {
        if (element && !this.scrollableElements.includes(element)) {
            this.scrollableElements.push(element);
            this.enhanceElement(element);
        }
    }

    // Method to handle scroll to specific position with smooth animation
    scrollToPosition(element, position, duration = 300) {
        const start = element.scrollTop;
        const change = position - start;
        const increment = 20;
        let currentTime = 0;

        const animateScroll = () => {
            currentTime += increment;
            const val = this.easeInOutQuad(currentTime, start, change, duration);
            element.scrollTop = val;
            
            if (currentTime < duration) {
                setTimeout(animateScroll, increment);
            }
        };
        
        animateScroll();
    }

    // Easing function for smooth scrolling
    easeInOutQuad(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }
}

// Initialize touch scroll handler
const touchScrollHandler = new TouchScrollHandler();

// Export for global access
window.TouchScrollHandler = TouchScrollHandler;
window.touchScrollHandler = touchScrollHandler;

// Add CSS classes for scroll state styling
const style = document.createElement('style');
style.textContent = `
/* Only disable pointer events during active scrolling on touch devices */
@media (hover: none) and (pointer: coarse) {
    .is-scrolling {
        pointer-events: none;
    }

    .is-scrolling * {
        pointer-events: none;
    }
    
    .scrollable-area::-webkit-scrollbar-thumb,
    .messages-container::-webkit-scrollbar-thumb,
    .messages-scroll::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.3) !important;
        opacity: 1 !important;
    }
    
    .is-scrolling::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.5) !important;
    }
}

/* Desktop devices should never have pointer events disabled */
@media (hover: hover) and (pointer: fine) {
    .is-scrolling,
    .is-scrolling * {
        pointer-events: auto !important;
    }
}
`;
document.head.appendChild(style);

console.log('✅ Touch Scroll Handler loaded successfully');