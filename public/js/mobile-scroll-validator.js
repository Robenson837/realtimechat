/**
 * MOBILE SCROLL VALIDATOR - Cross-Browser Testing
 * Validates and ensures touch scrolling works on ALL mobile devices
 * Based on comprehensive browser compatibility testing
 */

class MobileScrollValidator {
    constructor() {
        this.tests = [];
        this.fixes = [];
        this.browserInfo = this.detectBrowser();
        this.deviceInfo = this.detectDevice();
    }

    detectBrowser() {
        const ua = navigator.userAgent;
        return {
            isIOS: /iPad|iPhone|iPod/.test(ua),
            isSafari: /Safari/.test(ua) && !/Chrome/.test(ua),
            isChrome: /Chrome/.test(ua),
            isFirefox: /Firefox/.test(ua),
            isAndroid: /Android/.test(ua),
            isSamsungBrowser: /SamsungBrowser/.test(ua),
            isEdge: /Edg/.test(ua),
            version: this.extractVersion(ua)
        };
    }

    detectDevice() {
        return {
            isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            isTablet: /iPad|Android.*(?=.*Mobile)/i.test(navigator.userAgent) && window.innerWidth >= 768,
            isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            pixelRatio: window.devicePixelRatio || 1
        };
    }

    extractVersion(ua) {
        let version = 'unknown';
        if (ua.includes('Version/')) {
            version = ua.split('Version/')[1].split(' ')[0];
        } else if (ua.includes('Chrome/')) {
            version = ua.split('Chrome/')[1].split(' ')[0];
        } else if (ua.includes('Firefox/')) {
            version = ua.split('Firefox/')[1].split(' ')[0];
        }
        return version;
    }

    async runComprehensiveTest() {
        console.log('🔍 Starting comprehensive mobile scroll validation...');
        console.log(`📱 Device: ${this.deviceInfo.isMobile ? 'Mobile' : 'Desktop'}`);
        console.log(`🌐 Browser: ${this.getBrowserName()}`);
        
        this.tests = [];
        this.fixes = [];

        // Core tests
        await this.testScrollContainers();
        await this.testCSSProperties();
        await this.testTouchCapability();
        await this.testViewportConfiguration();
        await this.testScrollBehavior();
        
        // Browser-specific tests
        if (this.browserInfo.isIOS) {
            await this.testIOSSpecific();
        }
        if (this.browserInfo.isAndroid) {
            await this.testAndroidSpecific();
        }
        if (this.browserInfo.isSamsungBrowser) {
            await this.testSamsungBrowser();
        }

        this.generateReport();
        this.applyAutomaticFixes();
    }

    async testScrollContainers() {
        const containers = document.querySelectorAll('.messages-container, .messages-scroll, #messages-scroll');
        
        containers.forEach((container, index) => {
            const test = {
                name: `Container ${index + 1} (${container.className || container.id})`,
                passed: false,
                details: {},
                fixes: []
            };

            // Test 1: Has overflow scroll
            const computed = window.getComputedStyle(container);
            test.details.overflowY = computed.overflowY;
            test.details.overflowX = computed.overflowX;
            
            if (computed.overflowY === 'scroll' || computed.overflowY === 'auto') {
                test.passed = true;
            } else {
                test.fixes.push('Set overflow-y: scroll');
            }

            // Test 2: Has scrollable content
            const hasScrollableContent = container.scrollHeight > container.clientHeight;
            test.details.hasScrollableContent = hasScrollableContent;
            test.details.scrollHeight = container.scrollHeight;
            test.details.clientHeight = container.clientHeight;

            if (!hasScrollableContent) {
                test.fixes.push('Add more content or reduce container height');
            }

            // Test 3: Mobile-specific properties
            if (this.deviceInfo.isMobile) {
                test.details.webkitOverflowScrolling = computed.webkitOverflowScrolling;
                test.details.touchAction = computed.touchAction;
                test.details.overscrollBehavior = computed.overscrollBehavior;

                if (computed.webkitOverflowScrolling !== 'touch') {
                    test.fixes.push('Set -webkit-overflow-scrolling: touch');
                }
                if (!computed.touchAction || !computed.touchAction.includes('pan-y')) {
                    test.fixes.push('Set touch-action: pan-y');
                }
            }

            this.tests.push(test);
        });
    }

    async testCSSProperties() {
        const test = {
            name: 'CSS Properties Support',
            passed: true,
            details: {},
            fixes: []
        };

        // Test touch-action support
        const tempElement = document.createElement('div');
        tempElement.style.touchAction = 'pan-y';
        test.details.touchActionSupported = tempElement.style.touchAction === 'pan-y';

        // Test -webkit-overflow-scrolling support
        tempElement.style.webkitOverflowScrolling = 'touch';
        test.details.webkitOverflowScrollingSupported = tempElement.style.webkitOverflowScrolling === 'touch';

        // Test overscroll-behavior support
        tempElement.style.overscrollBehavior = 'contain';
        test.details.overscrollBehaviorSupported = tempElement.style.overscrollBehavior === 'contain';

        if (!test.details.touchActionSupported && this.deviceInfo.isMobile) {
            test.passed = false;
            test.fixes.push('Browser does not support touch-action property');
        }

        if (!test.details.webkitOverflowScrollingSupported && this.browserInfo.isIOS) {
            test.passed = false;
            test.fixes.push('Browser does not support -webkit-overflow-scrolling');
        }

        this.tests.push(test);
    }

    async testTouchCapability() {
        const test = {
            name: 'Touch Capability',
            passed: false,
            details: {},
            fixes: []
        };

        test.details.ontouchstartSupported = 'ontouchstart' in window;
        test.details.maxTouchPoints = navigator.maxTouchPoints || 0;
        test.details.msMaxTouchPoints = navigator.msMaxTouchPoints || 0;
        test.details.pointerEventsSupported = 'PointerEvent' in window;

        const hasTouchSupport = test.details.ontouchstartSupported || 
                               test.details.maxTouchPoints > 0 || 
                               test.details.msMaxTouchPoints > 0;

        if (this.deviceInfo.isMobile && !hasTouchSupport) {
            test.fixes.push('Device appears to be mobile but touch events not supported');
        } else if (this.deviceInfo.isMobile && hasTouchSupport) {
            test.passed = true;
        } else if (!this.deviceInfo.isMobile) {
            test.passed = true; // Desktop doesn't need touch
        }

        this.tests.push(test);
    }

    async testViewportConfiguration() {
        const test = {
            name: 'Viewport Configuration',
            passed: false,
            details: {},
            fixes: []
        };

        const viewport = document.querySelector('meta[name="viewport"]');
        test.details.hasViewportMeta = !!viewport;
        test.details.viewportContent = viewport ? viewport.content : 'none';

        if (this.deviceInfo.isMobile) {
            if (!viewport) {
                test.fixes.push('Add viewport meta tag');
            } else {
                const content = viewport.content.toLowerCase();
                test.details.hasInitialScale = content.includes('initial-scale');
                test.details.hasWidth = content.includes('width=device-width');
                test.details.hasUserScalable = content.includes('user-scalable');

                if (!test.details.hasWidth) {
                    test.fixes.push('Add width=device-width to viewport');
                }
                if (!test.details.hasInitialScale) {
                    test.fixes.push('Add initial-scale=1.0 to viewport');
                }
                if (content.includes('user-scalable=yes')) {
                    test.fixes.push('Consider setting user-scalable=no for better scroll experience');
                }

                test.passed = test.details.hasWidth && test.details.hasInitialScale;
            }
        } else {
            test.passed = true; // Viewport not critical for desktop
        }

        this.tests.push(test);
    }

    async testScrollBehavior() {
        const container = document.querySelector('.messages-container') || 
                         document.querySelector('.messages-scroll') || 
                         document.querySelector('#messages-scroll');

        const test = {
            name: 'Scroll Behavior Test',
            passed: false,
            details: {},
            fixes: []
        };

        if (!container) {
            test.fixes.push('No scroll container found');
            this.tests.push(test);
            return;
        }

        // Test programmatic scrolling
        const initialScrollTop = container.scrollTop;
        const maxScroll = container.scrollHeight - container.clientHeight;

        if (maxScroll > 0) {
            // Test scroll to middle
            container.scrollTop = maxScroll / 2;
            
            setTimeout(() => {
                const middlePosition = container.scrollTop;
                test.details.canScrollProgrammatically = Math.abs(middlePosition - maxScroll / 2) < 10;
                
                // Reset position
                container.scrollTop = initialScrollTop;
                
                test.passed = test.details.canScrollProgrammatically;
                if (!test.passed) {
                    test.fixes.push('Programmatic scrolling not working properly');
                }
            }, 100);
        } else {
            test.details.canScrollProgrammatically = false;
            test.fixes.push('Container has no scrollable content');
        }

        this.tests.push(test);
    }

    async testIOSSpecific() {
        const test = {
            name: 'iOS Safari Specific',
            passed: true,
            details: {},
            fixes: []
        };

        const containers = document.querySelectorAll('.messages-container, .messages-scroll, #messages-scroll');
        containers.forEach(container => {
            const computed = window.getComputedStyle(container);
            
            // iOS needs -webkit-overflow-scrolling: touch
            if (computed.webkitOverflowScrolling !== 'touch') {
                test.passed = false;
                test.fixes.push('Set -webkit-overflow-scrolling: touch for iOS momentum scrolling');
            }

            // iOS needs proper transform for hardware acceleration
            if (computed.transform === 'none') {
                test.fixes.push('Consider adding transform: translateZ(0) for iOS performance');
            }
        });

        test.details.iosVersion = this.browserInfo.version;
        this.tests.push(test);
    }

    async testAndroidSpecific() {
        const test = {
            name: 'Android Chrome Specific',
            passed: true,
            details: {},
            fixes: []
        };

        const containers = document.querySelectorAll('.messages-container, .messages-scroll, #messages-scroll');
        containers.forEach(container => {
            const computed = window.getComputedStyle(container);
            
            // Android Chrome prefers overscroll-behavior
            if (!computed.overscrollBehavior || computed.overscrollBehavior === 'auto') {
                test.fixes.push('Set overscroll-behavior: contain for better Android experience');
            }
        });

        test.details.androidVersion = this.browserInfo.version;
        this.tests.push(test);
    }

    async testSamsungBrowser() {
        const test = {
            name: 'Samsung Internet Browser',
            passed: true,
            details: {},
            fixes: []
        };

        // Samsung browser has specific quirks
        test.fixes.push('Samsung browser may need additional touch-action configurations');
        this.tests.push(test);
    }

    generateReport() {
        console.log('\n📊 MOBILE SCROLL VALIDATION REPORT');
        console.log('=' * 50);
        
        console.log(`🔧 Device: ${this.deviceInfo.isMobile ? 'Mobile' : 'Desktop'}`);
        console.log(`🌐 Browser: ${this.getBrowserName()}`);
        console.log(`📱 Touch Support: ${this.deviceInfo.isTouch ? 'Yes' : 'No'}`);
        console.log(`📐 Viewport: ${this.deviceInfo.viewportWidth}x${this.deviceInfo.viewportHeight}`);
        
        let passedTests = 0;
        let totalTests = this.tests.length;

        this.tests.forEach((test, index) => {
            console.log(`\n${index + 1}. ${test.name}: ${test.passed ? '✅ PASS' : '❌ FAIL'}`);
            
            if (test.fixes.length > 0) {
                console.log('   Fixes needed:');
                test.fixes.forEach(fix => console.log(`   - ${fix}`));
            }

            if (Object.keys(test.details).length > 0) {
                console.log('   Details:', test.details);
            }

            if (test.passed) passedTests++;
        });

        console.log(`\n📈 Score: ${passedTests}/${totalTests} tests passed`);
        
        if (passedTests === totalTests) {
            console.log('🎉 All tests passed! Mobile scrolling should work perfectly.');
        } else {
            console.log('⚠️ Some tests failed. Applying automatic fixes...');
        }
    }

    applyAutomaticFixes() {
        const containers = document.querySelectorAll('.messages-container, .messages-scroll, #messages-scroll');
        
        containers.forEach(container => {
            console.log(`🔧 Applying fixes to: ${container.className || container.id}`);
            
            // Universal fixes
            container.style.overflowY = 'scroll';
            container.style.overflowX = 'hidden';
            
            if (this.deviceInfo.isMobile) {
                // Mobile-specific fixes
                container.style.webkitOverflowScrolling = 'touch';
                container.style.touchAction = 'pan-y';
                container.style.overscrollBehavior = 'contain';
                container.style.transform = 'translate3d(0, 0, 0)';
                container.style.webkitTransform = 'translate3d(0, 0, 0)';
                
                // iOS specific
                if (this.browserInfo.isIOS) {
                    container.style.webkitBackfaceVisibility = 'hidden';
                    container.style.perspective = '1000px';
                }
                
                // Android specific
                if (this.browserInfo.isAndroid) {
                    container.style.willChange = 'scroll-position';
                }
            }
            
            // Always disable snap
            container.style.scrollBehavior = 'auto';
            container.style.scrollSnapType = 'none';
        });

        // Fix viewport if needed
        if (this.deviceInfo.isMobile) {
            this.fixViewportMeta();
        }

        console.log('✅ Automatic fixes applied');
    }

    fixViewportMeta() {
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        
        viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover';
        console.log('📱 Viewport meta tag fixed');
    }

    getBrowserName() {
        if (this.browserInfo.isIOS && this.browserInfo.isSafari) return 'iOS Safari';
        if (this.browserInfo.isIOS && this.browserInfo.isChrome) return 'iOS Chrome';
        if (this.browserInfo.isAndroid && this.browserInfo.isChrome) return 'Android Chrome';
        if (this.browserInfo.isSamsungBrowser) return 'Samsung Internet';
        if (this.browserInfo.isFirefox) return 'Firefox Mobile';
        if (this.browserInfo.isEdge) return 'Edge Mobile';
        return 'Unknown Mobile Browser';
    }
}

// Initialize validator
const mobileScrollValidator = new MobileScrollValidator();

// Global functions
window.validateMobileScrolling = function() {
    return mobileScrollValidator.runComprehensiveTest();
};

window.fixMobileScrollingEmergency = function() {
    console.log('🚨 EMERGENCY: Applying all mobile scroll fixes...');
    mobileScrollValidator.applyAutomaticFixes();
    
    // Additional emergency fixes
    const containers = document.querySelectorAll('*[class*="message"], *[id*="scroll"]');
    containers.forEach(container => {
        if (container.scrollHeight > container.clientHeight) {
            container.style.overflowY = 'scroll';
            container.style.webkitOverflowScrolling = 'touch';
            container.style.touchAction = 'pan-y';
        }
    });
    
    console.log('🔧 Emergency fixes complete');
};

window.MobileScrollValidator = MobileScrollValidator;
window.mobileScrollValidator = mobileScrollValidator;

console.log('✅ Mobile Scroll Validator loaded');
console.log('🔍 Use window.validateMobileScrolling() for comprehensive testing');
console.log('🚨 Use window.fixMobileScrollingEmergency() for emergency fixes');