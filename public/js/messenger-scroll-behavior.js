/**
 * MESSENGER SCROLL BEHAVIOR - Exact Implementation
 * Based on deep research of Facebook Messenger scroll patterns
 * Replicates exact behavior found in Meta's chat applications
 */

class MessengerScrollBehavior {
    constructor() {
        this.scrollContainer = null;
        this.isUserScrolling = false;
        this.scrollTimeout = null;
        this.lastScrollPosition = 0;
        this.scrollDirection = 'down';
        this.isMobile = this.detectMobile();
        this.touchStartY = 0;
        this.scrollVelocity = 0;
        this.lastScrollTime = 0;
        
        // MESSENGER PATTERN: Configuration
        this.config = {
            scrollThreshold: 100, // Distance from bottom to trigger new message loading
            scrollDebounce: 16,   // 60fps throttling
            velocityThreshold: 500, // Minimum velocity for momentum detection
            autoScrollDelay: 100   // Delay before auto-scroll to bottom
        };
        
        this.init();
    }

    detectMobile() {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.findScrollContainer();
        this.setupMessengerScrollBehavior();
        this.attachEventListeners();
        this.preventScrollChaining();
        
        console.log('📱 Messenger-style scroll behavior initialized');
    }

    findScrollContainer() {
        // MESSENGER PATTERN: Find the primary scroll container
        const selectors = [
            '.messages-container',
            '.messages-scroll',
            '#messages-scroll',
            '[data-scroll-container]'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                this.scrollContainer = element;
                console.log(`📱 Found Messenger-style container: ${selector}`);
                break;
            }
        }

        if (!this.scrollContainer) {
            console.warn('⚠️ No Messenger-style scroll container found');
        }
    }

    setupMessengerScrollBehavior() {
        if (!this.scrollContainer) return;

        const container = this.scrollContainer;

        // MESSENGER PATTERN: Core scroll properties
        container.style.overflowY = 'auto';
        container.style.overflowX = 'hidden';
        container.style.overscrollBehavior = 'contain';
        container.style.overscrollBehaviorY = 'contain';
        container.style.touchAction = 'pan-y';
        container.style.scrollBehavior = 'auto';
        
        if (this.isMobile) {
            // MESSENGER MOBILE: Enhanced touch scrolling
            container.style.webkitOverflowScrolling = 'touch';
            container.style.webkitTouchCallout = 'none';
            container.style.webkitTransform = 'translate3d(0, 0, 0)';
            container.style.transform = 'translate3d(0, 0, 0)';
            container.style.webkitBackfaceVisibility = 'hidden';
            container.style.contain = 'layout style paint';
        }

        // MESSENGER PATTERN: Prevent text selection during scroll
        container.style.webkitUserSelect = 'none';
        container.style.userSelect = 'none';
        
        // But allow text selection in messages
        const messages = container.querySelectorAll('.message');
        messages.forEach(message => {
            message.style.webkitUserSelect = 'text';
            message.style.userSelect = 'text';
        });
    }

    attachEventListeners() {
        if (!this.scrollContainer) return;

        // MESSENGER PATTERN: Throttled scroll event
        this.scrollContainer.addEventListener('scroll', this.throttle((e) => {
            this.handleScroll(e);
        }, this.config.scrollDebounce), { passive: true });

        if (this.isMobile) {
            // MESSENGER MOBILE: Touch events for better control
            this.scrollContainer.addEventListener('touchstart', (e) => {
                this.handleTouchStart(e);
            }, { passive: true });

            this.scrollContainer.addEventListener('touchmove', (e) => {
                this.handleTouchMove(e);
            }, { passive: true });

            this.scrollContainer.addEventListener('touchend', (e) => {
                this.handleTouchEnd(e);
            }, { passive: true });
        }
    }

    handleScroll(event) {
        const container = event.target;
        const currentScrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const currentTime = Date.now();
        
        // MESSENGER PATTERN: Calculate scroll velocity
        const deltaTime = currentTime - this.lastScrollTime;
        const deltaScroll = Math.abs(currentScrollTop - this.lastScrollPosition);
        this.scrollVelocity = deltaTime > 0 ? deltaScroll / deltaTime : 0;
        
        // MESSENGER PATTERN: Track scroll direction
        this.scrollDirection = currentScrollTop > this.lastScrollPosition ? 'down' : 'up';
        
        // MESSENGER PATTERN: Update user scrolling state
        this.isUserScrolling = true;
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            this.isUserScrolling = false;
        }, 150);

        // MESSENGER PATTERN: Handle infinite scroll (load more messages)
        const distanceFromTop = currentScrollTop;
        const distanceFromBottom = scrollHeight - currentScrollTop - clientHeight;
        
        if (distanceFromTop < this.config.scrollThreshold && this.scrollDirection === 'up') {
            this.handleLoadMoreMessages();
        }

        // MESSENGER PATTERN: Auto-scroll behavior for new messages
        if (distanceFromBottom <= 50 && this.scrollDirection === 'down') {
            // User is near bottom, allow auto-scroll
            this.allowAutoScroll = true;
        } else if (distanceFromBottom > 200) {
            // User scrolled up significantly, disable auto-scroll
            this.allowAutoScroll = false;
        }

        // Update tracking variables
        this.lastScrollPosition = currentScrollTop;
        this.lastScrollTime = currentTime;
    }

    handleTouchStart(event) {
        this.touchStartY = event.touches[0].clientY;
        this.isUserScrolling = true;
        
        // MESSENGER PATTERN: Clear any auto-scroll timers
        clearTimeout(this.scrollTimeout);
    }

    handleTouchMove(event) {
        // MESSENGER PATTERN: Track touch movement
        const currentY = event.touches[0].clientY;
        const deltaY = currentY - this.touchStartY;
        
        // Update scroll direction based on touch
        this.scrollDirection = deltaY < 0 ? 'down' : 'up';
    }

    handleTouchEnd(event) {
        // MESSENGER PATTERN: Delayed reset of user scrolling state
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            this.isUserScrolling = false;
        }, 300); // Longer delay on mobile
    }

    handleLoadMoreMessages() {
        // MESSENGER PATTERN: Trigger loading more messages when near top
        if (typeof window.chatManager !== 'undefined' && 
            typeof window.chatManager.loadMoreMessages === 'function') {
            console.log('📱 Loading more messages (Messenger pattern)');
            window.chatManager.loadMoreMessages();
        }
    }

    // MESSENGER PATTERN: Smart auto-scroll for new messages
    handleNewMessage(isFromCurrentUser = false) {
        if (!this.scrollContainer) return false;

        // MESSENGER BEHAVIOR: Always scroll for own messages
        if (isFromCurrentUser) {
            this.scrollToBottom('smooth');
            return true;
        }

        // MESSENGER BEHAVIOR: Only scroll for others if near bottom and not actively scrolling
        if (this.allowAutoScroll && !this.isUserScrolling) {
            setTimeout(() => {
                this.scrollToBottom('smooth');
            }, this.config.autoScrollDelay);
            return true;
        }

        return false;
    }

    // MESSENGER PATTERN: Position-based scrolling (not native smooth scroll)
    scrollToBottom(behavior = 'auto') {
        if (!this.scrollContainer) return;

        const container = this.scrollContainer;
        const targetScrollTop = container.scrollHeight - container.clientHeight;

        if (behavior === 'smooth' && !this.isMobile) {
            // MESSENGER DESKTOP: Use smooth scrolling
            container.scrollTo({
                top: targetScrollTop,
                behavior: 'smooth'
            });
        } else {
            // MESSENGER MOBILE: Instant scroll (better performance)
            container.scrollTop = targetScrollTop;
        }

        // Update tracking
        this.lastScrollPosition = targetScrollTop;
        this.allowAutoScroll = true;
    }

    // MESSENGER PATTERN: Prevent scroll chaining to parent elements
    preventScrollChaining() {
        if (!this.scrollContainer) return;

        // MESSENGER PATTERN: Apply overscroll-behavior to prevent chaining
        document.body.style.overscrollBehavior = 'contain';
        document.documentElement.style.overscrollBehavior = 'contain';

        // MESSENGER PATTERN: Prevent scroll on document when scrolling in chat
        document.addEventListener('touchmove', (e) => {
            if (this.scrollContainer.contains(e.target)) {
                // Allow scrolling in chat container
                return;
            }
            
            // Prevent scrolling outside chat container
            if (this.isUserScrolling) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    // MESSENGER PATTERN: Throttle function for performance
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    // MESSENGER PATTERN: Update container when DOM changes
    refresh() {
        this.findScrollContainer();
        this.setupMessengerScrollBehavior();
        console.log('📱 Messenger scroll behavior refreshed');
    }

    // MESSENGER PATTERN: Get current scroll state
    getScrollState() {
        if (!this.scrollContainer) return null;

        const container = this.scrollContainer;
        return {
            scrollTop: container.scrollTop,
            scrollHeight: container.scrollHeight,
            clientHeight: container.clientHeight,
            distanceFromBottom: container.scrollHeight - container.scrollTop - container.clientHeight,
            isUserScrolling: this.isUserScrolling,
            scrollDirection: this.scrollDirection,
            scrollVelocity: this.scrollVelocity,
            allowAutoScroll: this.allowAutoScroll
        };
    }
}

// Initialize Messenger scroll behavior
const messengerScroll = new MessengerScrollBehavior();

// Export for global access
window.MessengerScrollBehavior = MessengerScrollBehavior;
window.messengerScroll = messengerScroll;

// Integration with existing chat system
if (typeof window.progressiveScroll !== 'undefined') {
    // Override progressive scroll methods with Messenger patterns
    const originalOnNewMessage = window.progressiveScroll.onNewMessage;
    window.progressiveScroll.onNewMessage = function(options = {}) {
        return messengerScroll.handleNewMessage(options.fromCurrentUser);
    };
}

// Global helper functions
window.scrollToBottomMessenger = function(behavior = 'auto') {
    messengerScroll.scrollToBottom(behavior);
};

window.refreshMessengerScroll = function() {
    messengerScroll.refresh();
};

window.getMessengerScrollState = function() {
    return messengerScroll.getScrollState();
};

console.log('✅ Messenger-exact scroll behavior loaded');
console.log('📱 Patterns implemented: position-based scrolling, overscroll-behavior, touch optimization');
console.log('🔧 Use window.getMessengerScrollState() to debug scroll behavior');