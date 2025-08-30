// Mobile Navigation Management
class MobileNavigationManager {
    constructor() {
        this.currentTab = 'chats';
        this.isInitialized = false;
        this.init();
    }

    init() {
        if (this.isInitialized) return;

        console.log('Initializing mobile navigation manager');
        
        // Ensure DOM is ready before setting up event listeners
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeAfterDOM();
            });
        } else {
            this.initializeAfterDOM();
        }
    }

    initializeAfterDOM() {
        // Add small delay to ensure all other scripts have loaded
        setTimeout(() => {
            this.setupEventListeners();
            this.setupMenuHandlers();
            this.updateActiveTab();
            this.isInitialized = true;
            console.log('Mobile navigation fully initialized');
        }, 100);
    }

    setupEventListeners() {
        // Remove existing listeners first to prevent duplicates
        this.removeExistingListeners();
        
        // Bottom navigation tabs with improved event handling
        const navTabs = document.querySelectorAll('.mobile-bottom-nav .nav-tab');
        console.log(`Found ${navTabs.length} mobile nav tabs`);
        
        navTabs.forEach((tab, index) => {
            // Store reference for later removal if needed
            const clickHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const tabType = tab.dataset.tab;
                console.log(`Mobile tab clicked: ${tabType} (index: ${index})`);
                this.switchTab(tabType);
            };
            
            // Store handler for cleanup
            tab._mobileNavClickHandler = clickHandler;
            tab.addEventListener('click', clickHandler);
            
            // Add touch handling for better mobile responsiveness
            let touchStartTime;
            const touchStartHandler = (e) => {
                touchStartTime = Date.now();
            };
            
            const touchEndHandler = (e) => {
                const touchDuration = Date.now() - touchStartTime;
                if (touchDuration < 300) { // Only trigger if touch is quick
                    clickHandler(e);
                }
            };
            
            tab._mobileTouchStartHandler = touchStartHandler;
            tab._mobileTouchEndHandler = touchEndHandler;
            tab.addEventListener('touchstart', touchStartHandler, { passive: true });
            tab.addEventListener('touchend', touchEndHandler, { passive: false });
        });

        // Mobile profile button (old)
        const mobileProfileBtn = document.getElementById('mobile-profile-btn');
        if (mobileProfileBtn) {
            mobileProfileBtn.addEventListener('click', () => {
                this.openProfileSettings();
            });
        }

        // New mobile profile image - click to open profile settings
        const mobileCurrentProfileImg = document.getElementById('mobile-current-user-profile-img');
        if (mobileCurrentProfileImg) {
            mobileCurrentProfileImg.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.userProfileSettingsManager && typeof window.userProfileSettingsManager.openModal === 'function') {
                    window.userProfileSettingsManager.openModal();
                } else {
                    // Fallback to opening profile settings
                    this.openProfileSettings();
                }
            });
        }

        // Mobile profile container click
        const mobileUserProfile = document.getElementById('mobile-current-user-profile');
        if (mobileUserProfile) {
            mobileUserProfile.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.userProfileSettingsManager && typeof window.userProfileSettingsManager.openModal === 'function') {
                    window.userProfileSettingsManager.openModal();
                } else {
                    // Fallback to opening profile settings
                    this.openProfileSettings();
                }
            });
        }

        // Mobile menu button with improved visibility
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenuDropdown = document.getElementById('mobile-menu-dropdown');
        
        if (mobileMenuBtn && mobileMenuDropdown) {
            console.log('Mobile menu elements found:', { btn: !!mobileMenuBtn, dropdown: !!mobileMenuDropdown });
            
            // Force the button to be clickable and visible
            mobileMenuBtn.style.pointerEvents = 'auto';
            mobileMenuBtn.style.cursor = 'pointer';
            mobileMenuBtn.style.zIndex = '10';
            mobileMenuBtn.style.position = 'relative';
            
            // Ensure dropdown has proper styling
            mobileMenuDropdown.style.zIndex = '9999';
            mobileMenuDropdown.style.position = 'absolute';
            
            const toggleMobileMenu = (e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log('Mobile menu button clicked');
                
                const isHidden = mobileMenuDropdown.classList.contains('hidden');
                
                if (isHidden) {
                    // Show menu
                    mobileMenuDropdown.classList.remove('hidden');
                    mobileMenuDropdown.style.display = 'block';
                    // Create backdrop
                    this.createMenuBackdrop();
                } else {
                    // Hide menu
                    mobileMenuDropdown.classList.add('hidden');
                    mobileMenuDropdown.style.display = 'none';
                    // Remove backdrop
                    this.removeMenuBackdrop();
                }
                
                console.log('Dropdown is now:', mobileMenuDropdown.classList.contains('hidden') ? 'hidden' : 'visible');
            };

            // Remove existing listeners first
            if (mobileMenuBtn._mobileMenuToggleHandler) {
                mobileMenuBtn.removeEventListener('click', mobileMenuBtn._mobileMenuToggleHandler);
            }
            
            // Add new listener
            mobileMenuBtn._mobileMenuToggleHandler = toggleMobileMenu;
            mobileMenuBtn.addEventListener('click', toggleMobileMenu);

            // Close menu when clicking outside or on backdrop
            if (!document._mobileMenuOutsideClickHandler) {
                document._mobileMenuOutsideClickHandler = (e) => {
                    if (!mobileMenuBtn.contains(e.target) && !mobileMenuDropdown.contains(e.target)) {
                        mobileMenuDropdown.classList.add('hidden');
                        mobileMenuDropdown.style.display = 'none';
                        this.removeMenuBackdrop();
                    }
                };
                document.addEventListener('click', document._mobileMenuOutsideClickHandler);
            }
        }

        // Handle window resize to ensure proper mobile/desktop switching
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Setup search functionality
        this.setupSearchFunctionality();
    }

    setupMenuHandlers() {
        // Mobile menu items
        const mobileMenuItems = {
            'mobile-profile-settings': () => this.openProfileSettings(),
            'mobile-add-contact-menu': () => this.openAddContactModal(),
            'mobile-blocked-contacts-menu': () => this.openBlockedContactsModal(),
            'mobile-help-menu': () => this.openHelpDialog(),
            'mobile-logout-menu': () => this.handleLogout()
        };

        Object.entries(mobileMenuItems).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', () => {
                    handler();
                    // Close mobile menu
                    const dropdown = document.getElementById('mobile-menu-dropdown');
                    if (dropdown) {
                        dropdown.classList.add('hidden');
                    }
                });
            }
        });
    }

    switchTab(tabType) {
        console.log(`Switching to mobile tab: ${tabType}`);
        
        // Update current tab
        this.currentTab = tabType;
        
        // Update active states in bottom navigation
        this.updateActiveTab();
        
        // Switch sidebar content
        this.showSidebarTab(tabType);
        
        // Show sidebar on mobile when switching tabs
        this.showMobileSidebar();
        
        // Hide chat area and ensure mobile header is visible when switching tabs
        if (this.isMobileView()) {
            const chatArea = document.getElementById('chat-area');
            if (chatArea) {
                chatArea.style.display = 'none';
            }
            
            // Always show mobile header when navigating between tabs
            document.body.classList.remove('mobile-chat-open');
            
            // Keep welcome screen hidden on mobile
            const welcomeScreen = document.querySelector('.welcome-screen');
            if (welcomeScreen) {
                welcomeScreen.classList.add('mobile-hidden');
            }
        }
    }

    updateActiveTab() {
        // Update bottom nav active states
        const navTabs = document.querySelectorAll('.mobile-bottom-nav .nav-tab');
        navTabs.forEach(tab => {
            const tabType = tab.dataset.tab;
            if (tabType === this.currentTab) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Update sidebar tab active states (sync with desktop)
        const sidebarTabs = document.querySelectorAll('.chat-tabs .tab-button');
        sidebarTabs.forEach(tab => {
            const tabType = tab.dataset.tab;
            if (tabType === this.currentTab) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }

    showSidebarTab(tabType) {
        // Smooth transition without flicker
        const tabContents = document.querySelectorAll('.tab-content');
        const targetTab = document.getElementById(`${tabType}-tab`);
        
        if (!targetTab) {
            console.warn(`Tab content not found: ${tabType}-tab`);
            return;
        }

        // Use batch DOM updates to prevent flickering
        requestAnimationFrame(() => {
            // Hide all tab contents with transition
            tabContents.forEach(content => {
                if (content !== targetTab && content.classList.contains('active')) {
                    content.style.opacity = '0';
                    content.style.transform = 'translateX(-10px)';
                    
                    setTimeout(() => {
                        content.classList.remove('active');
                        content.style.opacity = '';
                        content.style.transform = '';
                    }, 150);
                }
            });

            // Show selected tab content with smooth entrance
            setTimeout(() => {
                targetTab.classList.add('active');
                targetTab.style.opacity = '0';
                targetTab.style.transform = 'translateX(10px)';
                
                requestAnimationFrame(() => {
                    targetTab.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                    targetTab.style.opacity = '1';
                    targetTab.style.transform = 'translateX(0)';
                    
                    // Clean up transition styles
                    setTimeout(() => {
                        targetTab.style.transition = '';
                        targetTab.style.opacity = '';
                        targetTab.style.transform = '';
                    }, 200);
                });
            }, 75);
        });
        
        // Update sidebar state classes for CSS targeting
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            // Remove all tab-specific classes
            sidebar.classList.remove('contacts-active', 'requests-active', 'chats-active', 'calls-active');
            // Add current tab class
            sidebar.classList.add(`${tabType}-active`);
        }
        
        // Handle search visibility based on tab type
        this.handleSearchVisibility(tabType);

        // Update unread badges if needed
        this.updateUnreadBadges();
    }
    
    handleSearchVisibility(tabType) {
        const searchContainer = document.getElementById('search-container');
        
        if (this.isMobileView() && searchContainer) {
            if (tabType === 'contacts' || tabType === 'requests' || tabType === 'calls') {
                // Hide general search for contacts, requests and calls tabs
                searchContainer.style.display = 'none';
            } else {
                // Show general search only for chats tab
                searchContainer.style.display = 'block';
            }
        }
    }
    
    setupSearchFunctionality() {
        // Chat search functionality with debouncing for better mobile performance
        const chatSearchInput = document.getElementById('chat-search');
        if (chatSearchInput) {
            let chatSearchTimeout;
            
            chatSearchInput.addEventListener('input', (e) => {
                clearTimeout(chatSearchTimeout);
                chatSearchTimeout = setTimeout(() => {
                    this.filterChats(e.target.value.trim());
                }, 150); // 150ms debounce for smoother mobile experience
            });
            
            // Clear search on focus out if empty
            chatSearchInput.addEventListener('blur', (e) => {
                if (!e.target.value.trim()) {
                    this.filterChats('');
                }
            });
            
            // Enhanced mobile keyboard handling
            chatSearchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.target.blur(); // Hide keyboard on enter
                }
            });
        }
        
        // Contacts search functionality with enhanced mobile support
        const contactsSearchInput = document.getElementById('contacts-search');
        if (contactsSearchInput) {
            let contactsSearchTimeout;
            
            contactsSearchInput.addEventListener('input', (e) => {
                clearTimeout(contactsSearchTimeout);
                contactsSearchTimeout = setTimeout(() => {
                    this.filterContacts(e.target.value.trim());
                }, 150); // 150ms debounce
            });
            
            // Clear search on focus out if empty
            contactsSearchInput.addEventListener('blur', (e) => {
                if (!e.target.value.trim()) {
                    this.filterContacts('');
                }
            });
            
            // Enhanced mobile keyboard handling
            contactsSearchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.target.blur(); // Hide keyboard on enter
                }
            });
        }
    }
    
    filterChats(query) {
        const chatList = document.getElementById('chat-list');
        if (!chatList) return;
        
        const chatItems = chatList.querySelectorAll('.chat-item');
        let visibleCount = 0;
        
        chatItems.forEach(item => {
            const nameElement = item.querySelector('.chat-name');
            const lastMessageElement = item.querySelector('.last-message');
            
            if (nameElement) {
                const name = nameElement.textContent.toLowerCase();
                const lastMessage = lastMessageElement ? lastMessageElement.textContent.toLowerCase() : '';
                const searchTerm = query.toLowerCase();
                
                // Enhanced search: support for partial matches and multiple words
                const isMatch = query === '' || 
                               name.includes(searchTerm) || 
                               lastMessage.includes(searchTerm) ||
                               this.fuzzyMatch(name, searchTerm) ||
                               this.fuzzyMatch(lastMessage, searchTerm);
                
                if (isMatch) {
                    item.style.display = 'flex';
                    item.style.opacity = '1';
                    item.style.transform = 'translateX(0)';
                    visibleCount++;
                } else {
                    item.style.display = 'none';
                    item.style.opacity = '0';
                    item.style.transform = 'translateX(-10px)';
                }
            }
        });
        
        // Show/hide empty state message
        this.toggleEmptyState(chatList, visibleCount, 'chats', query);
    }
    
    filterContacts(query) {
        const contactsList = document.getElementById('contacts-list');
        if (!contactsList) return;
        
        const contactItems = contactsList.querySelectorAll('.contact-item');
        let visibleCount = 0;
        
        contactItems.forEach(item => {
            const nameElement = item.querySelector('.contact-name');
            const statusElement = item.querySelector('.contact-status');
            const emailElement = item.querySelector('.contact-email');
            
            if (nameElement) {
                const name = nameElement.textContent.toLowerCase();
                const status = statusElement ? statusElement.textContent.toLowerCase() : '';
                const email = emailElement ? emailElement.textContent.toLowerCase() : '';
                const searchTerm = query.toLowerCase();
                
                // Enhanced search: name, status, email and fuzzy matching
                const isMatch = query === '' || 
                               name.includes(searchTerm) || 
                               status.includes(searchTerm) ||
                               email.includes(searchTerm) ||
                               this.fuzzyMatch(name, searchTerm) ||
                               this.fuzzyMatch(email, searchTerm);
                
                if (isMatch) {
                    item.style.display = 'flex';
                    item.style.opacity = '1';
                    item.style.transform = 'translateX(0)';
                    visibleCount++;
                } else {
                    item.style.display = 'none';
                    item.style.opacity = '0';
                    item.style.transform = 'translateX(-10px)';
                }
            }
        });
        
        // Show/hide empty state message
        this.toggleEmptyState(contactsList, visibleCount, 'contactos', query);
    }

    showMobileSidebar() {
        if (this.isMobileView()) {
            const sidebar = document.getElementById('sidebar');
            const chatArea = document.getElementById('chat-area');
            
            if (sidebar && chatArea) {
                sidebar.classList.add('mobile-active');
                chatArea.style.display = 'none';
            }
        }
    }

    hideMobileSidebar() {
        if (this.isMobileView()) {
            const sidebar = document.getElementById('sidebar');
            const chatArea = document.getElementById('chat-area');
            
            if (sidebar && chatArea) {
                sidebar.classList.remove('mobile-active');
                chatArea.style.display = 'flex';
            }
        }
    }

    hideChatArea() {
        if (this.isMobileView()) {
            const chatArea = document.getElementById('chat-area');
            if (chatArea) {
                chatArea.style.display = 'none';
            }
            
            // Always show mobile header when returning from conversation
            document.body.classList.remove('mobile-chat-open');
            
            // On mobile, show chat list instead of welcome content
            this.showMobileSidebar();
            
            // Set chats as active tab
            this.currentTab = 'chats';
            this.updateActiveTab();
            this.showSidebarTab('chats');
        }
    }

    showChatArea() {
        const chatArea = document.getElementById('chat-area');
        if (chatArea) {
            chatArea.style.display = 'flex';
            
            // Hide sidebar on mobile when showing chat
            if (this.isMobileView()) {
                this.hideMobileSidebar();
                
                // Hide mobile header when chat is open
                document.body.classList.add('mobile-chat-open');
                
                // Hide welcome content when chat is open
                const welcomeContent = document.querySelector('.welcome-content');
                if (welcomeContent) {
                    welcomeContent.style.display = 'none';
                }
                
                // Hide welcome screen completely on mobile
                const welcomeScreen = document.querySelector('.welcome-screen');
                if (welcomeScreen) {
                    welcomeScreen.classList.add('mobile-hidden');
                }
                
                // Make sure chats tab is active when showing chat
                this.currentTab = 'chats';
                this.updateActiveTab();
            }
        }
    }

    updateUnreadBadges() {
        // Update mobile nav badges to match sidebar badges
        const chatsBadge = document.getElementById('chats-unread');
        const requestsBadge = document.getElementById('requests-unread');
        
        const mobileChatsBadge = document.getElementById('mobile-chats-badge');
        const mobileRequestsBadge = document.getElementById('mobile-requests-badge');

        // Sync chats badge
        if (chatsBadge && mobileChatsBadge) {
            if (chatsBadge.classList.contains('hidden')) {
                mobileChatsBadge.classList.add('hidden');
            } else {
                mobileChatsBadge.classList.remove('hidden');
                mobileChatsBadge.textContent = chatsBadge.textContent;
            }
        }

        // Sync requests badge
        if (requestsBadge && mobileRequestsBadge) {
            if (requestsBadge.classList.contains('hidden')) {
                mobileRequestsBadge.classList.add('hidden');
            } else {
                mobileRequestsBadge.classList.remove('hidden');
                mobileRequestsBadge.textContent = requestsBadge.textContent;
            }
        }
    }

    isMobileView() {
        return window.innerWidth <= 768;
    }

    handleResize() {
        if (!this.isMobileView()) {
            // Desktop view - ensure sidebar is shown and chat area is visible
            const sidebar = document.getElementById('sidebar');
            const chatArea = document.getElementById('chat-area');
            
            if (sidebar) {
                sidebar.classList.remove('mobile-active');
            }
            
            if (chatArea) {
                chatArea.style.display = 'flex';
            }
        } else {
            // Mobile view - apply mobile logic
            if (this.currentTab !== 'chats') {
                this.hideChatArea();
            }
        }
    }

    // Integration with existing functionality
    openProfileSettings() {
        console.log('Opening profile settings from mobile menu');
        // Trigger existing profile settings functionality
        const profileSettingsBtn = document.getElementById('profile-settings');
        if (profileSettingsBtn) {
            profileSettingsBtn.click();
        }
    }

    openAddContactModal() {
        console.log('Opening add contact modal from mobile menu');
        // Trigger existing add contact functionality
        const addContactBtn = document.getElementById('add-contact-menu');
        if (addContactBtn) {
            addContactBtn.click();
        }
    }

    openBlockedContactsModal() {
        console.log('Opening blocked contacts modal from mobile menu');
        // Trigger existing blocked contacts functionality
        const blockedContactsBtn = document.getElementById('blocked-contacts-menu');
        if (blockedContactsBtn) {
            blockedContactsBtn.click();
        }
    }

    openHelpDialog() {
        console.log('Opening help dialog from mobile menu');
        // Trigger existing help functionality
        const helpBtn = document.getElementById('help-menu');
        if (helpBtn) {
            helpBtn.click();
        }
    }

    handleLogout() {
        console.log('Logging out from mobile menu');
        // Trigger existing logout functionality
        const logoutBtn = document.getElementById('logout-menu');
        if (logoutBtn) {
            logoutBtn.click();
        }
    }

    // Public method to update user profile in mobile header
    updateMobileUserProfile(user) {
        const mobileProfileImg = document.getElementById('mobile-current-user-profile-img');
        const mobileOnlineIndicator = document.getElementById('mobile-current-user-online-indicator');
        
        if (mobileProfileImg && user.profileImage) {
            mobileProfileImg.src = user.profileImage;
        }
        
        // Sync online status
        this.syncOnlineStatus();
        
        // Also update the old profile image for backward compatibility
        const oldMobileProfileImg = document.querySelector('.mobile-profile-img');
        if (oldMobileProfileImg && user.profileImage) {
            oldMobileProfileImg.src = user.profileImage;
        }
    }

    // Public method to be called when starting a chat (from contacts, etc)
    onChatStarted() {
        console.log('Chat started - switching to chat view');
        this.showChatArea();
    }

    // Public method to handle back button in chat header
    onChatBackButton() {
        console.log('Chat back button pressed');
        this.hideChatArea();
    }
    
    // Sync online status between desktop and mobile
    syncOnlineStatus() {
        const mainOnlineIndicator = document.getElementById('current-user-online-indicator');
        const mobileOnlineIndicator = document.getElementById('mobile-current-user-online-indicator');
        
        if (mainOnlineIndicator && mobileOnlineIndicator) {
            if (mainOnlineIndicator.classList.contains('online')) {
                mobileOnlineIndicator.classList.add('online');
            } else {
                mobileOnlineIndicator.classList.remove('online');
            }
        }
    }

    // Initialize mobile view after login
    initializeMobileView() {
        if (this.isMobileView()) {
            console.log('Initializing mobile view - loading chat list');
            
            // Ensure chat area is properly displayed on mobile
            const chatArea = document.getElementById('chat-area');
            if (chatArea) {
                chatArea.style.display = 'flex';
                chatArea.style.visibility = 'visible';
                chatArea.style.opacity = '1';
            }
            
            // Hide welcome screen completely on mobile initially
            const welcomeScreen = document.querySelector('.welcome-screen');
            if (welcomeScreen) {
                welcomeScreen.classList.add('mobile-hidden');
                // Ensure it doesn't interfere with mobile layout
                welcomeScreen.style.position = 'relative';
                welcomeScreen.style.zIndex = '1';
            }
            
            // Show chat list by default but keep mobile header visible
            this.currentTab = 'chats';
            this.updateActiveTab();
            this.showSidebarTab('chats');
            this.showMobileSidebar();
            
            // Handle initial search visibility
            this.handleSearchVisibility('chats');
            
            // Ensure mobile header stays visible (not in conversation mode)
            document.body.classList.remove('mobile-chat-open');
            
            // Ensure sidebar is visible by default on mobile
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.add('mobile-active');
                sidebar.style.visibility = 'visible';
                sidebar.style.opacity = '1';
            }
            
            // Sync online status
            this.syncOnlineStatus();
            
            console.log('Mobile view initialization completed');
        } else {
            // Desktop view - ensure proper layout
            const chatArea = document.getElementById('chat-area');
            const welcomeScreen = document.querySelector('.welcome-screen');
            const sidebar = document.getElementById('sidebar');
            
            if (chatArea) {
                chatArea.style.display = 'flex';
            }
            
            if (welcomeScreen) {
                welcomeScreen.classList.remove('mobile-hidden');
                welcomeScreen.style.position = '';
                welcomeScreen.style.zIndex = '';
            }
            
            if (sidebar) {
                sidebar.classList.remove('mobile-active');
            }
        }
    }
    
    // Remove existing event listeners to prevent duplicates
    removeExistingListeners() {
        const navTabs = document.querySelectorAll('.mobile-bottom-nav .nav-tab');
        navTabs.forEach(tab => {
            if (tab._mobileNavClickHandler) {
                tab.removeEventListener('click', tab._mobileNavClickHandler);
                delete tab._mobileNavClickHandler;
            }
            if (tab._mobileTouchStartHandler) {
                tab.removeEventListener('touchstart', tab._mobileTouchStartHandler);
                delete tab._mobileTouchStartHandler;
            }
            if (tab._mobileTouchEndHandler) {
                tab.removeEventListener('touchend', tab._mobileTouchEndHandler);
                delete tab._mobileTouchEndHandler;
            }
        });
    }

    // Fuzzy matching for better search experience
    fuzzyMatch(text, query) {
        if (!query || query.length < 2) return false;
        
        // Remove accents and special characters for better matching
        const normalizeText = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normalizedText = normalizeText(text);
        const normalizedQuery = normalizeText(query);
        
        // Split query into words for multi-word search
        const queryWords = normalizedQuery.split(' ').filter(word => word.length > 0);
        
        // Check if all query words are found in text
        return queryWords.every(word => normalizedText.includes(word));
    }
    
    // Create backdrop for mobile menu
    createMenuBackdrop() {
        // Remove existing backdrop first
        this.removeMenuBackdrop();
        
        const backdrop = document.createElement('div');
        backdrop.className = 'mobile-menu-backdrop show';
        backdrop.id = 'mobile-menu-backdrop';
        
        backdrop.addEventListener('click', () => {
            const dropdown = document.getElementById('mobile-menu-dropdown');
            if (dropdown) {
                dropdown.classList.add('hidden');
                dropdown.style.display = 'none';
            }
            this.removeMenuBackdrop();
        });
        
        document.body.appendChild(backdrop);
    }
    
    // Remove backdrop for mobile menu
    removeMenuBackdrop() {
        const existingBackdrop = document.getElementById('mobile-menu-backdrop');
        if (existingBackdrop) {
            existingBackdrop.remove();
        }
    }

    // Toggle empty state message for search results
    toggleEmptyState(container, visibleCount, type, query) {
        let emptyStateElement = container.querySelector('.search-empty-state');
        
        if (visibleCount === 0 && query.trim() !== '') {
            if (!emptyStateElement) {
                emptyStateElement = document.createElement('div');
                emptyStateElement.className = 'search-empty-state';
                emptyStateElement.innerHTML = `
                    <div class="empty-state-content">
                        <i class="fas fa-search" style="font-size: 48px; color: var(--text-tertiary); margin-bottom: 16px;"></i>
                        <h3 style="color: var(--text-secondary); margin-bottom: 8px;">No se encontraron ${type}</h3>
                        <p style="color: var(--text-tertiary); font-size: 14px;">Intenta con otro término de búsqueda</p>
                    </div>
                `;
                emptyStateElement.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    text-align: center;
                    width: 100%;
                `;
                container.appendChild(emptyStateElement);
            }
            emptyStateElement.style.display = 'flex';
        } else if (emptyStateElement) {
            emptyStateElement.style.display = 'none';
        }
    }
}

// Initialize mobile navigation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing mobile navigation');
    window.mobileNavigation = new MobileNavigationManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileNavigationManager;
}