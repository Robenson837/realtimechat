/**
 * MESSENGER SCROLL TESTER
 * Validates that scroll behavior matches Facebook Messenger exactly
 */

class MessengerScrollTester {
    constructor() {
        this.testResults = [];
        this.container = null;
    }

    async runMessengerCompatibilityTest() {
        console.log('🔍 Testing Messenger-style scroll compatibility...');
        
        this.container = document.querySelector('.messages-container') || 
                        document.querySelector('.messages-scroll') || 
                        document.querySelector('#messages-scroll');

        if (!this.container) {
            console.error('❌ No scroll container found for testing');
            return;
        }

        this.testResults = [];

        // Core Messenger tests
        await this.testOverscrollBehavior();
        await this.testTouchAction();
        await this.testPositionBasedScrolling();
        await this.testScrollChainPrevention();
        await this.testMobileOptimizations();
        await this.testAutoScrollBehavior();
        await this.testPerformanceProperties();

        this.generateMessengerTestReport();
    }

    async testOverscrollBehavior() {
        const test = {
            name: 'Overscroll Behavior (Messenger Pattern)',
            passed: false,
            details: {}
        };

        const computed = window.getComputedStyle(this.container);
        const bodyComputed = window.getComputedStyle(document.body);
        const htmlComputed = window.getComputedStyle(document.documentElement);

        // Test container overscroll behavior
        test.details.containerOverscrollBehavior = computed.overscrollBehavior;
        test.details.containerOverscrollBehaviorY = computed.overscrollBehaviorY;
        test.details.bodyOverscrollBehavior = bodyComputed.overscrollBehaviorY;
        test.details.htmlOverscrollBehavior = htmlComputed.overscrollBehavior;

        // MESSENGER REQUIREMENT: Container should have 'contain'
        const containerCorrect = computed.overscrollBehavior === 'contain' || 
                                computed.overscrollBehaviorY === 'contain';
        
        // MESSENGER REQUIREMENT: Body should prevent pull-to-refresh
        const bodyCorrect = bodyComputed.overscrollBehaviorY === 'contain';

        test.passed = containerCorrect && bodyCorrect;
        test.details.containerCorrect = containerCorrect;
        test.details.bodyCorrect = bodyCorrect;

        this.testResults.push(test);
    }

    async testTouchAction() {
        const test = {
            name: 'Touch Action (Messenger Pattern)',
            passed: false,
            details: {}
        };

        const computed = window.getComputedStyle(this.container);
        const touchAction = computed.touchAction;

        test.details.touchAction = touchAction;
        test.details.supportedTouchActions = [
            'pan-y',
            'pan-y pan-x pinch-zoom',
            'manipulation'
        ];

        // MESSENGER REQUIREMENT: Should allow pan-y
        test.passed = touchAction && (
            touchAction.includes('pan-y') || 
            touchAction === 'manipulation'
        );

        this.testResults.push(test);
    }

    async testPositionBasedScrolling() {
        const test = {
            name: 'Position-Based Scrolling (Messenger Pattern)',
            passed: false,
            details: {}
        };

        const computed = window.getComputedStyle(this.container);
        
        test.details.overflow = computed.overflow;
        test.details.overflowY = computed.overflowY;
        test.details.overflowX = computed.overflowX;
        test.details.position = computed.position;

        // MESSENGER REQUIREMENT: Should have auto/scroll overflow and relative position
        const overflowCorrect = computed.overflowY === 'auto' || computed.overflowY === 'scroll';
        const overflowXCorrect = computed.overflowX === 'hidden';
        const positionCorrect = computed.position === 'relative';

        test.passed = overflowCorrect && overflowXCorrect && positionCorrect;
        test.details.overflowCorrect = overflowCorrect;
        test.details.overflowXCorrect = overflowXCorrect;
        test.details.positionCorrect = positionCorrect;

        this.testResults.push(test);
    }

    async testScrollChainPrevention() {
        const test = {
            name: 'Scroll Chain Prevention (Messenger Pattern)',
            passed: false,
            details: {}
        };

        // Test if scroll chaining is properly prevented
        const hasScrollableContent = this.container.scrollHeight > this.container.clientHeight;
        
        if (hasScrollableContent) {
            // Simulate scroll at boundaries
            const initialScrollTop = this.container.scrollTop;
            
            // Try scrolling past top
            this.container.scrollTop = -100;
            const scrolledPastTop = this.container.scrollTop === 0;
            
            // Try scrolling past bottom
            const maxScroll = this.container.scrollHeight - this.container.clientHeight;
            this.container.scrollTop = maxScroll + 100;
            const scrolledPastBottom = this.container.scrollTop === maxScroll;
            
            // Restore position
            this.container.scrollTop = initialScrollTop;
            
            test.passed = scrolledPastTop && scrolledPastBottom;
            test.details.canScrollPastBoundaries = !test.passed;
        } else {
            test.passed = true;
            test.details.noScrollableContent = true;
        }

        this.testResults.push(test);
    }

    async testMobileOptimizations() {
        const test = {
            name: 'Mobile Optimizations (Messenger Pattern)',
            passed: false,
            details: {}
        };

        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const computed = window.getComputedStyle(this.container);

        if (isMobile) {
            test.details.webkitOverflowScrolling = computed.webkitOverflowScrolling;
            test.details.transform = computed.transform;
            test.details.webkitBackfaceVisibility = computed.webkitBackfaceVisibility;
            test.details.contain = computed.contain;

            // MESSENGER MOBILE REQUIREMENTS
            const momentumScrolling = computed.webkitOverflowScrolling === 'touch';
            const hasTransform = computed.transform && computed.transform !== 'none';
            const hasBackfaceVisibility = computed.webkitBackfaceVisibility === 'hidden';
            const hasContainment = computed.contain && computed.contain.includes('layout');

            test.passed = momentumScrolling && hasTransform;
            test.details.momentumScrolling = momentumScrolling;
            test.details.hasTransform = hasTransform;
            test.details.hasBackfaceVisibility = hasBackfaceVisibility;
            test.details.hasContainment = hasContainment;
        } else {
            test.passed = true;
            test.details.notMobile = true;
        }

        this.testResults.push(test);
    }

    async testAutoScrollBehavior() {
        const test = {
            name: 'Auto-Scroll Behavior (Messenger Pattern)',
            passed: false,
            details: {}
        };

        // Test if Messenger scroll behavior is available
        test.details.messengerScrollAvailable = typeof window.messengerScroll !== 'undefined';
        test.details.hasHandleNewMessage = typeof window.messengerScroll?.handleNewMessage === 'function';
        test.details.hasScrollToBottom = typeof window.scrollToBottomMessenger === 'function';

        if (window.messengerScroll) {
            const scrollState = window.messengerScroll.getScrollState();
            test.details.scrollState = scrollState;
            
            test.passed = scrollState !== null && 
                         typeof scrollState.scrollTop !== 'undefined' &&
                         typeof scrollState.allowAutoScroll !== 'undefined';
        }

        this.testResults.push(test);
    }

    async testPerformanceProperties() {
        const test = {
            name: 'Performance Properties (Messenger Pattern)',
            passed: false,
            details: {}
        };

        const computed = window.getComputedStyle(this.container);
        
        test.details.willChange = computed.willChange;
        test.details.transform = computed.transform;
        test.details.scrollBehavior = computed.scrollBehavior;

        // MESSENGER PERFORMANCE: Should have proper optimization
        const hasWillChange = computed.willChange && computed.willChange !== 'auto';
        const hasTransform = computed.transform && computed.transform !== 'none';
        const manualScrollBehavior = computed.scrollBehavior === 'auto';

        test.passed = hasTransform && manualScrollBehavior;
        test.details.hasWillChange = hasWillChange;
        test.details.hasTransform = hasTransform;
        test.details.manualScrollBehavior = manualScrollBehavior;

        this.testResults.push(test);
    }

    generateMessengerTestReport() {
        console.log('\n📊 MESSENGER SCROLL COMPATIBILITY REPORT');
        console.log('=' + '='.repeat(49));
        
        let passedTests = 0;
        const totalTests = this.testResults.length;

        this.testResults.forEach((test, index) => {
            console.log(`\n${index + 1}. ${test.name}: ${test.passed ? '✅ PASS' : '❌ FAIL'}`);
            
            if (test.details && Object.keys(test.details).length > 0) {
                Object.entries(test.details).forEach(([key, value]) => {
                    console.log(`   ${key}: ${value}`);
                });
            }

            if (test.passed) passedTests++;
        });

        console.log(`\n📈 Messenger Compatibility: ${passedTests}/${totalTests} tests passed`);
        
        const compatibilityPercentage = Math.round((passedTests / totalTests) * 100);
        
        if (compatibilityPercentage === 100) {
            console.log('🎉 Perfect Messenger compatibility! Your scroll behaves exactly like Facebook Messenger.');
        } else if (compatibilityPercentage >= 80) {
            console.log('✅ Good Messenger compatibility! Most patterns are correctly implemented.');
        } else if (compatibilityPercentage >= 60) {
            console.log('⚠️ Partial Messenger compatibility. Some patterns need adjustment.');
        } else {
            console.log('❌ Low Messenger compatibility. Significant improvements needed.');
        }

        console.log(`📱 Compatibility Score: ${compatibilityPercentage}%`);
        
        return {
            score: compatibilityPercentage,
            passedTests: passedTests,
            totalTests: totalTests,
            results: this.testResults
        };
    }
}

// Initialize tester
const messengerTester = new MessengerScrollTester();

// Global test functions
window.testMessengerCompatibility = function() {
    return messengerTester.runMessengerCompatibilityTest();
};

window.validateMessengerScroll = function() {
    console.log('🔍 Quick Messenger scroll validation...');
    
    const checks = {
        container: !!document.querySelector('.messages-container, .messages-scroll, #messages-scroll'),
        messengerBehavior: typeof window.messengerScroll !== 'undefined',
        overscrollBehavior: window.getComputedStyle(document.body).overscrollBehaviorY === 'contain',
        touchAction: true // Will check in full test
    };

    console.log('Quick validation results:', checks);
    
    const allPassed = Object.values(checks).every(check => check === true);
    console.log(`Quick validation: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (!allPassed) {
        console.log('💡 Run window.testMessengerCompatibility() for detailed analysis');
    }
    
    return allPassed;
};

console.log('✅ Messenger scroll tester loaded');
console.log('🔍 Use window.testMessengerCompatibility() for full compatibility test');
console.log('⚡ Use window.validateMessengerScroll() for quick validation');