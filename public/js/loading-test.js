// Loading Performance Test Script
// This script can be run in the browser console to test the loading improvements

window.LoadingTest = {
    
    // Test contacts loading with different scenarios
    testContactsLoading() {
        console.log('🧪 Testing contacts loading improvements...');
        
        if (!window.contactsManager) {
            console.error('❌ ContactsManager not available');
            return;
        }
        
        const tests = [
            {
                name: 'Clear cache and reload',
                action: () => {
                    window.contactsManager.clearContactsCache();
                    window.contactsManager.loadContacts();
                }
            },
            {
                name: 'Load with existing cache',
                action: () => {
                    window.contactsManager.loadContacts();
                }
            },
            {
                name: 'Test skeleton animation',
                action: () => {
                    const contactsList = document.getElementById('contacts-list');
                    if (contactsList) {
                        window.contactsManager.showContactsLoadingSkeleton(contactsList);
                    }
                }
            }
        ];
        
        tests.forEach((test, index) => {
            setTimeout(() => {
                console.log(`🧪 Running test: ${test.name}`);
                test.action();
            }, index * 2000);
        });
    },
    
    // Test conversations loading
    testConversationsLoading() {
        console.log('🧪 Testing conversations loading improvements...');
        
        if (!window.chatManager) {
            console.error('❌ ChatManager not available');
            return;
        }
        
        const tests = [
            {
                name: 'Show conversations skeleton',
                action: () => {
                    window.chatManager.showConversationsLoadingSkeleton();
                }
            },
            {
                name: 'Load conversations with cache',
                action: () => {
                    window.chatManager.loadConversations();
                }
            }
        ];
        
        tests.forEach((test, index) => {
            setTimeout(() => {
                console.log(`🧪 Running test: ${test.name}`);
                test.action();
            }, index * 2000);
        });
    },
    
    // Test message loading
    testMessageLoading() {
        console.log('🧪 Testing message loading improvements...');
        
        if (!window.chatManager) {
            console.error('❌ ChatManager not available');
            return;
        }
        
        const messageContainer = document.getElementById('messages-container') || 
                               document.querySelector('.messages-container');
        
        if (!messageContainer) {
            console.error('❌ Message container not found');
            return;
        }
        
        const tests = [
            {
                name: 'Show message skeleton',
                action: () => {
                    window.chatManager.showMessagesLoadingSkeleton();
                }
            },
            {
                name: 'Test smooth clear',
                action: async () => {
                    await window.chatManager.smoothClearMessages();
                }
            },
            {
                name: 'Test error state',
                action: async () => {
                    await window.chatManager.showMessagesErrorState('test-conversation');
                }
            }
        ];
        
        tests.forEach((test, index) => {
            setTimeout(async () => {
                console.log(`🧪 Running test: ${test.name}`);
                await test.action();
            }, index * 2500);
        });
    },
    
    // Performance measurement
    measureLoadingPerformance() {
        console.log('📊 Measuring loading performance...');
        
        const measurements = {
            contactsStart: null,
            contactsEnd: null,
            conversationsStart: null,
            conversationsEnd: null
        };
        
        // Measure contacts loading
        if (window.contactsManager) {
            const originalLoadContacts = window.contactsManager.loadContacts;
            window.contactsManager.loadContacts = function() {
                measurements.contactsStart = performance.now();
                const result = originalLoadContacts.call(this);
                
                if (result && result.then) {
                    result.then(() => {
                        measurements.contactsEnd = performance.now();
                        const duration = measurements.contactsEnd - measurements.contactsStart;
                        console.log(`⏱️ Contacts loading took: ${duration.toFixed(2)}ms`);
                    });
                } else {
                    measurements.contactsEnd = performance.now();
                    const duration = measurements.contactsEnd - measurements.contactsStart;
                    console.log(`⏱️ Contacts loading took: ${duration.toFixed(2)}ms`);
                }
                
                return result;
            };
        }
        
        // Measure conversations loading  
        if (window.chatManager) {
            const originalLoadConversations = window.chatManager.loadConversations;
            window.chatManager.loadConversations = function() {
                measurements.conversationsStart = performance.now();
                const result = originalLoadConversations.call(this);
                
                if (result && result.then) {
                    result.then(() => {
                        measurements.conversationsEnd = performance.now();
                        const duration = measurements.conversationsEnd - measurements.conversationsStart;
                        console.log(`⏱️ Conversations loading took: ${duration.toFixed(2)}ms`);
                    });
                } else {
                    measurements.conversationsEnd = performance.now();
                    const duration = measurements.conversationsEnd - measurements.conversationsStart;
                    console.log(`⏱️ Conversations loading took: ${duration.toFixed(2)}ms`);
                }
                
                return result;
            };
        }
        
        console.log('📊 Performance measurement setup complete. Load contacts/conversations to see timings.');
    },
    
    // Test mobile optimizations
    testMobileOptimizations() {
        console.log('📱 Testing mobile optimizations...');
        
        // Simulate mobile viewport
        const meta = document.querySelector('meta[name="viewport"]');
        console.log('📱 Current viewport:', meta ? meta.content : 'not set');
        
        // Test reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        console.log('📱 Prefers reduced motion:', prefersReducedMotion);
        
        // Test touch capabilities
        const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        console.log('📱 Touch screen detected:', hasTouchScreen);
        
        // Test high DPI display
        const highDPI = window.devicePixelRatio > 1;
        console.log('📱 High DPI display:', highDPI, `(${window.devicePixelRatio}x)`);
        
        return {
            viewport: meta ? meta.content : null,
            prefersReducedMotion,
            hasTouchScreen,
            highDPI,
            devicePixelRatio: window.devicePixelRatio
        };
    },
    
    // Run all tests
    runAllTests() {
        console.log('🚀 Running all loading improvement tests...');
        
        this.measureLoadingPerformance();
        
        setTimeout(() => this.testContactsLoading(), 1000);
        setTimeout(() => this.testConversationsLoading(), 8000);
        setTimeout(() => this.testMessageLoading(), 15000);
        setTimeout(() => this.testMobileOptimizations(), 22000);
        
        console.log('⏰ All tests scheduled. Check console for results over the next 25 seconds.');
    },
    
    // Quick visual test
    quickVisualTest() {
        console.log('👁️ Running quick visual test...');
        
        const tests = [
            () => {
                const contactsList = document.getElementById('contacts-list');
                if (contactsList && window.contactsManager) {
                    window.contactsManager.showContactsLoadingSkeleton(contactsList);
                    setTimeout(() => {
                        window.contactsManager.loadContacts();
                    }, 2000);
                }
            },
            () => {
                if (window.chatManager) {
                    window.chatManager.showConversationsLoadingSkeleton();
                    setTimeout(() => {
                        window.chatManager.loadConversations();
                    }, 2000);
                }
            }
        ];
        
        tests.forEach((test, index) => {
            setTimeout(test, index * 3000);
        });
    }
};

// Auto-expose testing functions to console
console.log('🧪 Loading Test Suite Ready!');
console.log('📋 Available commands:');
console.log('   LoadingTest.runAllTests() - Run comprehensive tests');
console.log('   LoadingTest.quickVisualTest() - Quick visual test');
console.log('   LoadingTest.testContactsLoading() - Test contacts only');
console.log('   LoadingTest.testConversationsLoading() - Test conversations only');
console.log('   LoadingTest.testMessageLoading() - Test messages only');
console.log('   LoadingTest.testMobileOptimizations() - Test mobile features');
console.log('   LoadingTest.measureLoadingPerformance() - Setup performance monitoring');