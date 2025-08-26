/**
 * Configuration for Progressive Scroll System
 * Use this to customize scroll behavior per device/situation
 */

// Global configuration object
window.ProgressiveScrollConfig = {
    // Enable debug logging (set to true for development)
    debug: false,
    
    // Mobile configuration - VERDADERAMENTE progresivo
    mobile: {
        // Scroll behavior
        enableSmoothScroll: true,            // Enable for better UX
        scrollThreshold: 200,                // Larger threshold for mobile
        userScrollDetectionDelay: 500,       // Longer delay - respeta más el usuario
        autoScrollForOwnMessages: false,     // DESHABILITADO - solo si está al final
        autoScrollForOthersNearBottom: false,// DESHABILITADO - nunca auto-scroll
        
        // Animation settings
        scrollAnimationDuration: 400,        // Smooth scroll animation time (ms)
        messageAppearanceDelay: 100,         // Delay before new messages appear
        
        // Touch interaction
        preventTextSelectionDuringScroll: true, // Better touch experience
        showScrollButtonSize: 56,            // Size of scroll-to-bottom button (px)
        
        // Performance
        enableMessageLazyLoad: true,         // Load messages progressively
        maxMessagesInView: 50                // Max messages to keep in DOM
    },
    
    // Desktop configuration - también más conservador  
    desktop: {
        enableSmoothScroll: true,
        scrollThreshold: 150,                // Mayor threshold
        userScrollDetectionDelay: 250,       // Mayor delay
        autoScrollForOwnMessages: false,     // También deshabilitado en desktop
        autoScrollForOthersNearBottom: false,// También deshabilitado en desktop
        
        scrollAnimationDuration: 300,
        messageAppearanceDelay: 50,
        
        showScrollButtonSize: 48,
        
        enableMessageLazyLoad: false,
        maxMessagesInView: 100
    },
    
    // Tablet configuration (hybrid approach)
    tablet: {
        enableSmoothScroll: true,
        scrollThreshold: 125,
        userScrollDetectionDelay: 200,
        autoScrollForOwnMessages: true,
        autoScrollForOthersNearBottom: true,
        
        scrollAnimationDuration: 350,
        messageAppearanceDelay: 75,
        
        showScrollButtonSize: 52,
        
        enableMessageLazyLoad: true,
        maxMessagesInView: 75
    }
};

// Device detection and config selection
window.getProgressiveScrollConfig = function() {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTablet = /iPad|Android.*(?=.*Mobile)/i.test(navigator.userAgent) && window.innerWidth >= 768;
    
    if (isTablet) {
        console.log('📱 Using tablet scroll configuration');
        return window.ProgressiveScrollConfig.tablet;
    } else if (isMobile) {
        console.log('📱 Using mobile scroll configuration');
        return window.ProgressiveScrollConfig.mobile;
    } else {
        console.log('🖥️ Using desktop scroll configuration');
        return window.ProgressiveScrollConfig.desktop;
    }
};

// Debug helpers
window.enableScrollDebug = function() {
    window.ProgressiveScrollConfig.debug = true;
    window.DEBUG_SCROLL = true;
    console.log('🐛 Progressive scroll debugging enabled');
    
    if (window.progressiveScroll) {
        console.log('Current scroll state:', window.progressiveScroll.getScrollState());
    }
};

window.disableScrollDebug = function() {
    window.ProgressiveScrollConfig.debug = false;
    window.DEBUG_SCROLL = false;
    console.log('🔇 Progressive scroll debugging disabled');
};

// Performance monitoring
window.monitorScrollPerformance = function(duration = 10000) {
    if (!window.progressiveScroll) {
        console.error('Progressive scroll not available');
        return;
    }
    
    console.log(`📊 Monitoring scroll performance for ${duration/1000} seconds...`);
    
    let scrollCount = 0;
    let lastScrollTime = 0;
    const startTime = Date.now();
    
    const originalRequestScroll = window.progressiveScroll.requestScroll;
    window.progressiveScroll.requestScroll = function(...args) {
        scrollCount++;
        const now = Date.now();
        const timeSinceLastScroll = now - lastScrollTime;
        lastScrollTime = now;
        
        if (window.ProgressiveScrollConfig.debug) {
            console.log(`📊 Scroll #${scrollCount}, delay: ${timeSinceLastScroll}ms`);
        }
        
        return originalRequestScroll.apply(this, args);
    };
    
    setTimeout(() => {
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        const avgScrollsPerSecond = (scrollCount / (totalTime / 1000)).toFixed(2);
        
        console.log(`📊 Scroll Performance Report:`);
        console.log(`   Total scrolls: ${scrollCount}`);
        console.log(`   Duration: ${totalTime}ms`);
        console.log(`   Average: ${avgScrollsPerSecond} scrolls/second`);
        
        // Restore original function
        window.progressiveScroll.requestScroll = originalRequestScroll;
    }, duration);
};

// Quick config updates
window.updateScrollConfig = function(updates) {
    const config = window.getProgressiveScrollConfig();
    Object.assign(config, updates);
    
    if (window.progressiveScroll) {
        window.progressiveScroll.updateConfig(config);
    }
    
    console.log('📱 Scroll configuration updated:', updates);
};

// Export for use
console.log('✅ Progressive scroll configuration loaded');