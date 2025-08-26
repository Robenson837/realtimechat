/**
 * Simple Progressive Scroll for VigiChat
 * Direct integration without complex dependencies
 */

(function() {
    'use strict';
    
    let scrollManager = null;
    let isInitialized = false;
    
    function initializeSimpleProgressiveScroll() {
        if (isInitialized) return;
        
        const container = document.getElementById('messages-scroll');
        if (!container) {
            return;
        }
        
        // Disable smooth scrolling
        container.style.scrollBehavior = 'auto';
        
        let isLoadingOlder = false;
        let hasMoreMessages = true;
        let currentConversationId = null;
        
        // Listen for scroll events
        container.addEventListener('scroll', function(e) {
            const scrollTop = e.target.scrollTop;
            const scrollHeight = e.target.scrollHeight;
            const clientHeight = e.target.clientHeight;
            
            // Check if scrolled to top (within 50px)
            if (scrollTop < 50 && hasMoreMessages && !isLoadingOlder && currentConversationId) {
                loadOlderMessages();
            }
        }, { passive: true });
        
        async function loadOlderMessages() {
            if (isLoadingOlder || !currentConversationId) return;
            
            isLoadingOlder = true;
            console.log('Loading older messages for conversation:', currentConversationId);
            
            // Show loading indicator
            showLoadingIndicator();
            
            try {
                // Get current messages count for pagination
                const currentMessages = container.querySelectorAll('.message').length;
                const page = Math.floor(currentMessages / 30) + 2; // Start from page 2 since page 1 is already loaded
                
                const response = await fetch(`/api/messages/conversation/${currentConversationId}?page=${page}&limit=30&loadDirection=before`);
                const data = await response.json();
                
                if (data.success && data.data.messages && data.data.messages.length > 0) {
                    // Store current scroll position for restoration
                    const oldScrollHeight = container.scrollHeight;
                    const oldScrollTop = container.scrollTop;
                    
                    // Use chat manager to properly render messages if available
                    if (window.chatManager && typeof window.chatManager.prependMessagesToContainer === 'function') {
                        window.chatManager.prependMessagesToContainer(data.data.messages);
                    } else if (window.chatManager && typeof window.chatManager.renderMessages === 'function') {
                        // Alternative method
                        data.data.messages.reverse().forEach(message => {
                            const messageEl = window.chatManager.renderMessage ? 
                                window.chatManager.renderMessage(message) : 
                                createBasicMessageElement(message);
                            if (messageEl) {
                                container.insertBefore(messageEl, container.firstChild);
                            }
                        });
                    } else {
                        // Fallback: render basic messages
                        data.data.messages.reverse().forEach(message => {
                            const messageEl = createBasicMessageElement(message);
                            if (messageEl) {
                                container.insertBefore(messageEl, container.firstChild);
                            }
                        });
                    }
                    
                    // Restore scroll position to maintain user's view
                    setTimeout(() => {
                        const newScrollHeight = container.scrollHeight;
                        const heightDifference = newScrollHeight - oldScrollHeight;
                        container.scrollTop = oldScrollTop + heightDifference;
                    }, 10);
                    
                    hasMoreMessages = data.data.hasMore || data.data.hasMoreBefore || false;
                    // console.log('Loaded', data.data.messages.length, 'older messages. Has more:', hasMoreMessages);
                } else {
                    hasMoreMessages = false;
                    // console.log('No more older messages available');
                }
            } catch (error) {
                console.error('Error loading older messages:', error);
            } finally {
                isLoadingOlder = false;
                hideLoadingIndicator();
            }
        }
        
        function createBasicMessageElement(message) {
            if (!message || !message.content) return null;
            
            const messageEl = document.createElement('div');
            messageEl.className = 'message';
            messageEl.dataset.messageId = message._id;
            
            // Determine if sent by current user
            const currentUserId = window.chatManager?.currentUser?._id || 
                                 window.currentUser?._id ||
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
            
            messageEl.innerHTML = `
                <div class="message-content">
                    <div class="message-text">${escapeHtml(message.content.text || '')}</div>
                    <div class="message-time">${time}</div>
                </div>
            `;
            
            return messageEl;
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function showLoadingIndicator() {
            let indicator = document.getElementById('loading-older-indicator');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'loading-older-indicator';
                indicator.innerHTML = 'Cargando mensajes anteriores...';
                indicator.style.cssText = `
                    position: absolute;
                    top: 10px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0,0,0,0.7);
                    color: white;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-size: 12px;
                    z-index: 100;
                `;
                container.style.position = 'relative';
                container.appendChild(indicator);
            }
            indicator.style.display = 'block';
        }
        
        function hideLoadingIndicator() {
            const indicator = document.getElementById('loading-older-indicator');
            if (indicator) {
                indicator.style.display = 'none';
            }
        }
        
        // API to set current conversation
        window.setProgressiveScrollConversation = function(conversationId) {
            currentConversationId = conversationId;
            hasMoreMessages = true;
            // console.log('Progressive scroll set for conversation:', conversationId);
        };
        
        // API to add new message (scroll to bottom if at bottom)
        window.addProgressiveScrollMessage = function() {
            const scrollTop = container.scrollTop;
            const scrollHeight = container.scrollHeight;
            const clientHeight = container.clientHeight;
            
            // If user is at bottom, keep them at bottom
            if ((scrollTop + clientHeight) >= (scrollHeight - 100)) {
                setTimeout(() => {
                    container.scrollTop = container.scrollHeight;
                }, 50);
            }
        };
        
        // Hook into chat manager - try multiple times as it may not be available immediately  
        function hookChatManager() {
            if (window.chatManager && typeof window.chatManager.selectConversation === 'function') {
                const originalSelectConversation = window.chatManager.selectConversation.bind(window.chatManager);
                
                window.chatManager.selectConversation = function(conversationId, conversation) {
                    // Call original function
                    const result = originalSelectConversation(conversationId, conversation);
                    
                    // Set up progressive scroll for this conversation
                    window.setProgressiveScrollConversation(conversationId);
                    
                    return result;
                };
                
                console.log('Hooked into chat manager selectConversation');
                return true;
            }
            return false;
        }
        
        // Try to hook immediately, then retry
        if (!hookChatManager()) {
            setTimeout(() => {
                if (!hookChatManager()) {
                    setTimeout(hookChatManager, 2000);
                }
            }, 1000);
        }
        
        isInitialized = true;
        console.log('Simple progressive scroll initialized');
    }
    
    // Initialize when messages container becomes visible
    function checkForContainer() {
        const container = document.getElementById('messages-scroll');
        const messagesContainer = document.getElementById('messages-container');
        
        if (container && messagesContainer && !messagesContainer.classList.contains('hidden')) {
            initializeSimpleProgressiveScroll();
        } else {
            setTimeout(checkForContainer, 500);
        }
    }
    
    // Start checking
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkForContainer);
    } else {
        checkForContainer();
    }
    
    console.log('Simple progressive scroll module loaded');
    
})();