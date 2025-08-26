/**
 * Progressive Scroll Fallback System
 * Ensures progressive scroll works even without perfect chat manager integration
 */

(function() {
    'use strict';

    // Emergency progressive scroll initialization
    function emergencyInitialization() {
        console.log('🚨 Emergency progressive scroll initialization started');
        
        const messagesContainer = document.getElementById('messages-scroll');
        if (!messagesContainer) {
            console.warn('❌ No messages container found for emergency init');
            return false;
        }

        // Create minimal progressive scroll without full integration
        const minimalScroll = new ProgressiveScrollManager({
            container: messagesContainer,
            batchSize: 20,
            threshold: 100
        });

        // Basic event handling
        minimalScroll.on('renderMessages', ({ messages, mode }) => {
            console.log(`🔧 Emergency rendering: ${messages.length} messages (${mode})`);
            renderMessagesMinimal(messages, mode, messagesContainer);
        });

        minimalScroll.on('messagesLoaded', ({ messages, type }) => {
            console.log(`✅ Emergency loaded: ${messages.length} messages (${type})`);
        });

        minimalScroll.on('loadError', (error) => {
            console.error('❌ Emergency load error:', error);
        });

        // Store for API access
        window.progressiveScrollEmergency = minimalScroll;
        
        // Create basic API
        if (!window.progressiveScrollAPI) {
            window.progressiveScrollAPI = {
                setConversation: (id) => minimalScroll.setConversation(id),
                scrollToBottom: (smooth) => minimalScroll.scrollToBottom(smooth),
                addMessage: (msg, opts) => minimalScroll.addMessage(msg, opts),
                refresh: () => minimalScroll.refresh(),
                getStats: () => minimalScroll.getStats()
            };
        }

        console.log('✅ Emergency progressive scroll initialized');
        return true;
    }

    function renderMessagesMinimal(messages, mode, container) {
        if (!messages || messages.length === 0) return;

        messages.forEach(message => {
            const messageEl = createMinimalMessageElement(message);
            if (messageEl) {
                if (mode === 'prepend') {
                    // Insert at top (after loaders)
                    const firstMessage = container.querySelector('.message:not(.progressive-loader)');
                    if (firstMessage) {
                        container.insertBefore(messageEl, firstMessage);
                    } else {
                        container.appendChild(messageEl);
                    }
                } else {
                    // Insert at bottom (before loaders)
                    const bottomLoader = container.querySelector('.progressive-loader-bottom');
                    if (bottomLoader) {
                        container.insertBefore(messageEl, bottomLoader);
                    } else {
                        container.appendChild(messageEl);
                    }
                }
            }
        });
    }

    function createMinimalMessageElement(message) {
        if (!message || !message.content) return null;

        const messageEl = document.createElement('div');
        messageEl.className = 'message';
        messageEl.dataset.messageId = message._id;
        
        // Detect if sent by current user (basic detection)
        const currentUserId = window.currentUser?._id || 
                             window.AuthManager?.getCurrentUser()?._id ||
                             localStorage.getItem('currentUserId');
        
        if (currentUserId && message.sender._id === currentUserId) {
            messageEl.classList.add('sent');
        } else {
            messageEl.classList.add('received');
        }
        
        const time = new Date(message.createdAt).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const senderName = message.sender.fullName || message.sender.username || 'User';
        
        messageEl.innerHTML = `
            <div class="message-content">
                <div class="message-header">
                    <span class="sender-name">${senderName}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-text">${escapeHtml(message.content.text || '')}</div>
            </div>
        `;
        
        return messageEl;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Auto-detect and initialize based on conditions
    function smartInitialization() {
        // Wait a bit for normal initialization
        setTimeout(() => {
            if (!window.progressiveScrollIntegration && !window.progressiveScrollAPI) {
                console.log('⚡ Normal integration not found, starting emergency mode');
                emergencyInitialization();
            } else {
                console.log('✅ Normal progressive scroll integration detected');
            }
        }, 3000);
    }

    // Monitor for chat container availability
    function monitorForContainer() {
        const checkForContainer = () => {
            const container = document.getElementById('messages-scroll');
            if (container && !container.dataset.progressiveScrollReady) {
                container.dataset.progressiveScrollReady = 'true';
                console.log('📦 Messages container detected, ensuring progressive scroll');
                
                // Give normal integration a chance
                setTimeout(() => {
                    if (!window.progressiveScrollIntegration) {
                        emergencyInitialization();
                    }
                }, 2000);
            }
        };

        // Check immediately and then periodically
        checkForContainer();
        const interval = setInterval(() => {
            checkForContainer();
            // Stop monitoring after 30 seconds
            if (Date.now() - startTime > 30000) {
                clearInterval(interval);
            }
        }, 1000);

        const startTime = Date.now();
    }

    // Public utilities
    window.progressiveScrollFallback = {
        emergencyInit: emergencyInitialization,
        renderMinimal: renderMessagesMinimal,
        
        // Diagnostic function
        diagnose: () => {
            const result = {
                timestamp: new Date().toISOString(),
                progressiveScrollManager: !!window.ProgressiveScrollManager,
                progressiveScrollIntegration: !!window.progressiveScrollIntegration,
                progressiveScrollAPI: !!window.progressiveScrollAPI,
                progressiveScrollEmergency: !!window.progressiveScrollEmergency,
                chatManager: !!window.chatManager,
                Chat: !!window.Chat,
                ChatManager: !!window.ChatManager,
                messagesContainer: !!document.getElementById('messages-scroll'),
                currentUser: !!window.currentUser,
                AuthManager: !!window.AuthManager
            };
            
            console.table(result);
            return result;
        },
        
        // Force reset and reinitialize
        reset: () => {
            if (window.progressiveScrollIntegration?.progressiveScroll) {
                window.progressiveScrollIntegration.progressiveScroll.destroy();
            }
            if (window.progressiveScrollEmergency) {
                window.progressiveScrollEmergency.destroy();
            }
            
            delete window.progressiveScrollIntegration;
            delete window.progressiveScrollAPI;
            delete window.progressiveScrollEmergency;
            
            setTimeout(emergencyInitialization, 100);
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            monitorForContainer();
            smartInitialization();
        });
    } else {
        monitorForContainer();
        smartInitialization();
    }

    console.log('📋 Progressive scroll fallback system loaded');

})();