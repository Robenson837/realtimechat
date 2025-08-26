/**
 * Chat Progressive Integration
 * Integrates progressive scrolling with existing chat system
 */

(function() {
    'use strict';

    // Wait for chat manager to be ready - Updated to work with your ChatManager class
    function waitForChatManager(callback, timeout = 15000) {
        const startTime = Date.now();
        
        function check() {
            // Check for multiple possible chat manager instances
            const chatManager = window.chatManager || 
                               window.Chat || 
                               (window.ChatManager && new window.ChatManager()) ||
                               null;
            
            if (chatManager) {
                console.log('✅ Found chat manager:', chatManager.constructor?.name || 'Unknown');
                // Store globally for consistent access
                if (!window.chatManager) {
                    window.chatManager = chatManager;
                }
                callback();
            } else if (Date.now() - startTime < timeout) {
                console.log('⏳ Still waiting for chat manager...', {
                    chatManager: !!window.chatManager,
                    Chat: !!window.Chat,
                    ChatManager: !!window.ChatManager,
                    elapsed: Date.now() - startTime
                });
                setTimeout(check, 200);
            } else {
                console.warn('⚠️ Chat manager not available, initializing progressive scroll anyway');
                // Initialize without chat manager - basic functionality
                callback();
            }
        }
        
        check();
    }

    // Initialize progressive scroll integration
    function initializeProgressiveScroll() {
        if (window.progressiveScrollIntegration) {
            console.log('Progressive scroll integration already initialized');
            return;
        }

        console.log('Initializing progressive scroll integration...');

        const messagesContainer = document.getElementById('messages-scroll');
        if (!messagesContainer) {
            console.warn('Messages container not found, retrying...');
            setTimeout(initializeProgressiveScroll, 1000);
            return;
        }

        // Initialize progressive scroll manager
        const progressiveScroll = new ProgressiveScrollManager({
            container: messagesContainer,
            messagesContainer: messagesContainer,
            batchSize: 30,
            threshold: 150,
            loadingThreshold: 100,
            debounceDelay: 150
        });

        // Integration object
        const integration = {
            progressiveScroll,
            currentConversation: null,
            isIntegrated: false,
            messageRenderer: null
        };

        // Integrate with chat manager (flexible detection)
        const chatManager = window.chatManager || window.Chat || null;
        if (chatManager) {
            integration.messageRenderer = chatManager;
            integrateWithChatManager(integration);
            console.log('✅ Progressive scroll integrated with chat manager');
        } else {
            // Use basic integration without specific chat manager
            console.log('ℹ️ Using basic progressive scroll integration');
            setupBasicIntegration(integration);
        }

        // Store integration globally
        window.progressiveScrollIntegration = integration;

        console.log('Progressive scroll integration initialized successfully');
    }

    function integrateWithChatManager(integration) {
        const { progressiveScroll, messageRenderer } = integration;
        
        console.log('Integrating progressive scroll with chat manager...');

        // Override loadMessages method to use progressive scroll
        if (messageRenderer.loadMessages) {
            const originalLoadMessages = messageRenderer.loadMessages.bind(messageRenderer);
            
            messageRenderer.loadMessages = function(conversationId, options = {}) {
                console.log('Loading messages with progressive scroll:', conversationId);
                
                if (conversationId !== integration.currentConversation) {
                    integration.currentConversation = conversationId;
                    progressiveScroll.setConversation(conversationId);
                    return;
                }
                
                // Use original method as fallback
                return originalLoadMessages(conversationId, options);
            };
        }

        // Handle message rendering
        progressiveScroll.on('renderMessages', ({ messages, mode }) => {
            console.log(`Rendering ${messages.length} messages (${mode})`);
            
            if (mode === 'replace') {
                // Clear existing messages
                const messagesContainer = document.getElementById('messages-scroll');
                if (messagesContainer) {
                    // Keep only the trigger elements and loaders
                    const elementsToKeep = messagesContainer.querySelectorAll('.scroll-trigger, .progressive-loader');
                    messagesContainer.innerHTML = '';
                    elementsToKeep.forEach(el => messagesContainer.appendChild(el));
                }
            }
            
            // Render messages using chat manager's method
            if (messageRenderer && typeof messageRenderer.renderMessage === 'function') {
                messages.forEach(message => {
                    try {
                        const messageElement = messageRenderer.renderMessage(message);
                        if (messageElement) {
                            if (mode === 'prepend') {
                                insertMessageAtTop(messageElement);
                            } else {
                                appendMessageToContainer(messageElement);
                            }
                        }
                    } catch (error) {
                        console.error('Error rendering message:', error);
                    }
                });
            } else if (messageRenderer && typeof messageRenderer.renderMessages === 'function') {
                // Fallback to batch rendering
                messageRenderer.renderMessages(messages, mode);
            } else {
                // Fallback to basic rendering
                renderMessagesBasic(messages, mode);
            }
        });

        // Handle single message addition
        progressiveScroll.on('addMessage', ({ message, options }) => {
            if (messageRenderer && typeof messageRenderer.renderMessage === 'function') {
                try {
                    const messageElement = messageRenderer.renderMessage(message);
                    if (messageElement) {
                        appendMessageToContainer(messageElement);
                    }
                } catch (error) {
                    console.error('Error rendering new message:', error);
                }
            }
        });

        // Handle loading states
        progressiveScroll.on('messagesLoaded', ({ messages, type, performance }) => {
            console.log(`Loaded ${messages.length} messages (${type})`, performance);
            
            // Update UI indicators
            if (messageRenderer.updateLoadingState) {
                messageRenderer.updateLoadingState(false);
            }
            
            // Trigger chat manager updates
            if (messageRenderer.onMessagesLoaded) {
                messageRenderer.onMessagesLoaded(messages, type);
            }
        });

        // Handle errors
        progressiveScroll.on('loadError', (error) => {
            console.error('Progressive scroll load error:', error);
            
            if (messageRenderer.showError) {
                messageRenderer.showError('Error loading messages. Please try again.');
            }
        });

        // Handle scroll events
        progressiveScroll.on('scroll', ({ scrollTop, isAtBottom, isAtTop, direction }) => {
            // Update scroll-to-bottom button
            updateScrollToBottomButton(isAtBottom, scrollTop > 200);
            
            // Update read status
            if (isAtBottom && messageRenderer.markMessagesAsRead) {
                messageRenderer.markMessagesAsRead(integration.currentConversation);
            }
        });

        integration.isIntegrated = true;
        console.log('Progressive scroll integration with chat manager completed');
    }

    function setupBasicIntegration(integration) {
        const { progressiveScroll } = integration;
        
        console.log('Setting up basic progressive scroll integration...');

        // Handle message rendering with basic DOM manipulation
        progressiveScroll.on('renderMessages', ({ messages, mode }) => {
            console.log(`Rendering ${messages.length} messages (${mode}) - Basic mode`);
            renderMessagesBasic(messages, mode);
        });

        // Handle single message addition
        progressiveScroll.on('addMessage', ({ message, options }) => {
            console.log('Adding new message - Basic mode');
            const messageElement = createBasicMessageElement(message);
            if (messageElement) {
                appendMessageToContainer(messageElement);
            }
        });

        // Handle loading states
        progressiveScroll.on('messagesLoaded', ({ messages, type, performance }) => {
            console.log(`Loaded ${messages.length} messages (${type}) - Basic mode`, performance);
        });

        // Handle errors
        progressiveScroll.on('loadError', (error) => {
            console.error('Progressive scroll load error:', error);
            showBasicError('Error loading messages. Please refresh the page.');
        });

        // Handle scroll events
        progressiveScroll.on('scroll', ({ scrollTop, isAtBottom, isAtTop, direction }) => {
            updateScrollToBottomButton(isAtBottom, scrollTop > 200);
        });

        integration.isIntegrated = true;
        console.log('Basic progressive scroll integration completed');
    }

    // Helper functions
    function insertMessageAtTop(messageElement) {
        const messagesContainer = document.getElementById('messages-scroll');
        if (!messagesContainer) return;

        // Find the first message element (after loaders and triggers)
        const firstMessage = messagesContainer.querySelector('.message:not(.scroll-trigger):not(.progressive-loader)');
        
        if (firstMessage) {
            messagesContainer.insertBefore(messageElement, firstMessage);
        } else {
            // Find insertion point after top loader
            const topLoader = messagesContainer.querySelector('.progressive-loader-top');
            if (topLoader && topLoader.nextSibling) {
                messagesContainer.insertBefore(messageElement, topLoader.nextSibling);
            } else {
                messagesContainer.appendChild(messageElement);
            }
        }
    }

    function appendMessageToContainer(messageElement) {
        const messagesContainer = document.getElementById('messages-scroll');
        if (!messagesContainer) return;

        // Insert before bottom loader and trigger
        const bottomLoader = messagesContainer.querySelector('.progressive-loader-bottom');
        if (bottomLoader) {
            messagesContainer.insertBefore(messageElement, bottomLoader);
        } else {
            messagesContainer.appendChild(messageElement);
        }
    }

    function renderMessagesBasic(messages, mode) {
        console.log(`Basic rendering: ${messages.length} messages (${mode})`);
        
        const messagesContainer = document.getElementById('messages-scroll');
        if (!messagesContainer) return;

        messages.forEach(message => {
            const messageElement = createBasicMessageElement(message);
            if (mode === 'prepend') {
                insertMessageAtTop(messageElement);
            } else {
                appendMessageToContainer(messageElement);
            }
        });
    }

    function createBasicMessageElement(message) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.sender._id === window.currentUser?._id ? 'sent' : 'received'}`;
        messageEl.dataset.messageId = message._id;
        
        const time = new Date(message.createdAt).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageEl.innerHTML = `
            <div class="message-content">
                <div class="message-text">${message.content.text || ''}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
        
        return messageEl;
    }

    function showBasicError(message) {
        // Try to find existing notification system first
        if (window.showNotification) {
            window.showNotification(message, 'error');
        } else if (window.UI && window.UI.showError) {
            window.UI.showError(message);
        } else {
            // Fallback to console and basic alert
            console.error('Progressive Scroll Error:', message);
            // Create a temporary error message in the UI
            const errorElement = document.createElement('div');
            errorElement.className = 'progressive-scroll-error';
            errorElement.textContent = message;
            errorElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #fee;
                color: #c33;
                padding: 12px 20px;
                border-radius: 8px;
                border: 1px solid #fcc;
                z-index: 10000;
                max-width: 300px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            `;
            
            document.body.appendChild(errorElement);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (errorElement.parentNode) {
                    errorElement.parentNode.removeChild(errorElement);
                }
            }, 5000);
        }
    }

    function updateScrollToBottomButton(isAtBottom, shouldShow) {
        let scrollButton = document.getElementById('scroll-to-bottom');
        
        if (!scrollButton) {
            // Create scroll button if it doesn't exist
            scrollButton = document.createElement('button');
            scrollButton.id = 'scroll-to-bottom';
            scrollButton.className = 'scroll-to-bottom hidden';
            scrollButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
            scrollButton.title = 'Ir al final';
            
            // Add click handler
            scrollButton.addEventListener('click', () => {
                if (window.progressiveScrollIntegration?.progressiveScroll) {
                    window.progressiveScrollIntegration.progressiveScroll.scrollToBottom(true);
                }
            });
            
            // Add to page
            const messagesContainer = document.getElementById('messages-container') || document.body;
            messagesContainer.appendChild(scrollButton);
        }
        
        // Update visibility
        if (shouldShow && !isAtBottom) {
            scrollButton.classList.remove('hidden');
        } else {
            scrollButton.classList.add('hidden');
        }
    }

    // Public API
    window.progressiveScrollAPI = {
        initialize: initializeProgressiveScroll,
        
        setConversation: (conversationId) => {
            if (window.progressiveScrollIntegration?.progressiveScroll) {
                window.progressiveScrollIntegration.progressiveScroll.setConversation(conversationId);
            }
        },
        
        addMessage: (message, options) => {
            if (window.progressiveScrollIntegration?.progressiveScroll) {
                window.progressiveScrollIntegration.progressiveScroll.addMessage(message, options);
            }
        },
        
        scrollToBottom: (smooth = true) => {
            if (window.progressiveScrollIntegration?.progressiveScroll) {
                window.progressiveScrollIntegration.progressiveScroll.scrollToBottom(smooth);
            }
        },
        
        scrollToMessage: (messageId, highlight = true) => {
            if (window.progressiveScrollIntegration?.progressiveScroll) {
                return window.progressiveScrollIntegration.progressiveScroll.scrollToMessage(messageId, highlight);
            }
            return false;
        },
        
        refresh: () => {
            if (window.progressiveScrollIntegration?.progressiveScroll) {
                window.progressiveScrollIntegration.progressiveScroll.refresh();
            }
        },
        
        getStats: () => {
            if (window.progressiveScrollIntegration?.progressiveScroll) {
                return window.progressiveScrollIntegration.progressiveScroll.getStats();
            }
            return null;
        }
    };

    // Simple initialization - wait for container to be visible
    function checkAndInitialize() {
        const container = document.getElementById('messages-scroll');
        const messagesContainer = document.getElementById('messages-container');
        
        if (container && messagesContainer && !messagesContainer.classList.contains('hidden')) {
            initializeProgressiveScroll();
        } else {
            setTimeout(checkAndInitialize, 1000);
        }
    }
    
    // Start checking when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAndInitialize);
    } else {
        checkAndInitialize();
    }

    // Debug helpers
    window.debugProgressiveScroll = () => {
        if (window.progressiveScrollIntegration?.progressiveScroll) {
            const stats = window.progressiveScrollIntegration.progressiveScroll.getStats();
            console.log('Progressive Scroll Stats:', stats);
            return stats;
        }
        console.log('Progressive scroll not initialized');
        return null;
    };

    console.log('Progressive scroll integration module loaded');

})();