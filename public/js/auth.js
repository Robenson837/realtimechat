// Authentication module for VigiChat

class AuthManager {
    constructor() {
        this.currentUser = null;
        
        // Wait for Utils to be available
        if (typeof Utils === 'undefined') {
            this.initWhenReady();
            return;
        }
        this.init();
    }
    
    initWhenReady() {
        const checkUtils = () => {
            if (typeof Utils !== 'undefined') {
                this.setupElements();
                this.init();
            } else {
                setTimeout(checkUtils, 10);
            }
        };
        checkUtils();
    }
    
    setupElements() {
        this.authContainer = Utils.$('#auth-container');
        this.loginForm = Utils.$('#login-form');
        this.registerForm = Utils.$('#register-form');
        this.appContainer = Utils.$('#app-container');
        this.loadingScreen = Utils.$('#loading-screen');
    }

    init() {
        // Setup elements if not already done
        if (!this.authContainer) {
            this.setupElements();
        }
        
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    setupEventListeners() {
        // Form toggles
        Utils.$('#show-register').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });

        Utils.$('#show-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        Utils.$('#show-forgot-password').addEventListener('click', (e) => {
            e.preventDefault();
            this.showForgotPasswordForm();
        });

        Utils.$('#back-to-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        Utils.$('#return-to-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        // Alternative auth buttons
        Utils.$('#google-auth-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleGoogleAuth();
        });

        Utils.$('#magic-link-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showMagicLinkForm();
        });

        Utils.$('#back-to-login-from-magic').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        // Form submissions
        Utils.$('#login-form-element').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        Utils.$('#register-form-element').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        Utils.$('#forgot-password-form-element').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleForgotPassword();
        });

        Utils.$('#reset-password-form-element').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleResetPassword();
        });

        Utils.$('#magic-link-form-element').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleMagicLink();
        });

        // Password visibility toggles
        Utils.$$('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.togglePasswordVisibility(e.currentTarget);
            });
        });

        // Setup dynamic password toggle visibility
        this.setupDynamicPasswordToggle();

        // Real-time validation
        this.setupRealTimeValidation();
        
        // Check URL parameters to determine the type of authentication
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const magicLogin = urlParams.get('magic_login');
        const googleLogin = urlParams.get('google_login');
        
        // Only check reset token if there's no other auth flow in progress
        if (!token || (!magicLogin && !googleLogin)) {
            this.checkResetToken();
        }
        
        // Check for magic login token in URL
        if (token && magicLogin === 'success') {
            this.checkMagicLogin();
        }
        
        // Check for Google login token in URL
        if (token && googleLogin === 'success') {
            this.checkGoogleLogin();
        }
    }

    setupRealTimeValidation() {
        const emailInput = Utils.$('#register-email');
        const passwordInput = Utils.$('#register-password');

        // Email validation
        if (emailInput) {
            const debouncedEmailCheck = Utils.debounce(async (email) => {
                if (Utils.validateEmail(email)) {
                    await this.checkEmailAvailability(email);
                }
            }, 500);

            emailInput.addEventListener('input', (e) => {
                const email = e.target.value;
                const indicator = Utils.$('#email-validation');
                const errorElement = Utils.$('#email-error');
                const formGroup = e.target.closest('.form-group');
                
                if (Utils.validateEmail(email)) {
                    debouncedEmailCheck(email);
                } else if (email.length > 0) {
                    this.showFieldError(formGroup, errorElement, 'Formato de email inválido');
                    this.showValidationIndicator(indicator, false, 'Email inválido');
                } else {
                    indicator.innerHTML = '';
                    this.hideFieldError(formGroup, errorElement);
                }
            });
        }

        // Password strength
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                this.updatePasswordStrength(e.target.value);
            });
        }

        // Reset password validation
        const newPasswordInput = Utils.$('#new-password');
        const confirmPasswordInput = Utils.$('#confirm-password');

        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', (e) => {
                this.updatePasswordStrength(e.target.value, 'new-password-strength');
                this.checkPasswordMatch();
            });
        }

        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                this.checkPasswordMatch();
            });
        }
    }

    checkPasswordMatch() {
        const newPassword = Utils.$('#new-password')?.value || '';
        const confirmPassword = Utils.$('#confirm-password')?.value || '';
        const matchIndicator = Utils.$('#password-match');

        if (!matchIndicator) return;

        if (confirmPassword.length === 0) {
            matchIndicator.classList.remove('show', 'match', 'no-match');
            return;
        }

        matchIndicator.classList.add('show');

        if (newPassword === confirmPassword && newPassword.length >= 6) {
            matchIndicator.classList.add('match');
            matchIndicator.classList.remove('no-match');
            matchIndicator.querySelector('i').className = 'fas fa-check-circle';
            matchIndicator.querySelector('span').textContent = 'Las contraseñas coinciden';
        } else {
            matchIndicator.classList.add('no-match');
            matchIndicator.classList.remove('match');
            matchIndicator.querySelector('i').className = 'fas fa-times-circle';
            matchIndicator.querySelector('span').textContent = 'Las contraseñas no coinciden';
        }
    }

    async checkUsernameAvailability(username) {
        const indicator = Utils.$('#username-validation');
        
        try {
            const response = await API.Auth.checkUsername(username);
            this.showValidationIndicator(
                indicator, 
                response.available, 
                response.message
            );
        } catch (error) {
            console.error('Username check error:', error);
            indicator.innerHTML = '';
        }
    }

    async checkEmailAvailability(email) {
        const indicator = Utils.$('#email-validation');
        const errorElement = Utils.$('#email-error');
        const formGroup = Utils.$('#register-email').closest('.form-group');
        
        try {
            const response = await API.Auth.checkEmail(email);
            
            if (!response.available) {
                // Email already exists - show error state
                this.showFieldError(formGroup, errorElement, 'Este correo electrónico ya está registrado');
                this.showValidationIndicator(indicator, false, response.message);
            } else {
                // Email is available - show success state
                this.hideFieldError(formGroup, errorElement);
                this.showValidationIndicator(indicator, true, response.message);
            }
        } catch (error) {
            console.error('Email check error:', error);
            indicator.innerHTML = '';
            this.hideFieldError(formGroup, errorElement);
        }
    }

    showValidationIndicator(indicator, isValid, message) {
        const className = isValid ? 'valid' : 'invalid';
        
        if (isValid) {
            // Show check icon for valid/available
            indicator.innerHTML = `<i class="fas fa-check"></i>`;
        } else {
            // Don't show icon for invalid/registered email - just empty
            indicator.innerHTML = '';
        }
        
        indicator.className = `validation-indicator ${className}`;
        indicator.title = message;
    }

    showFieldError(formGroup, errorElement, message) {
        formGroup.classList.add('error');
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }

    hideFieldError(formGroup, errorElement) {
        formGroup.classList.remove('error');
        errorElement.classList.remove('show');
        errorElement.textContent = '';
    }

    updatePasswordStrength(password, containerId = 'password-strength') {
        const strengthBar = Utils.$(`#${containerId} .strength-bar`);
        const strengthText = Utils.$(`#${containerId} .strength-text`);
        
        if (!strengthBar || !strengthText) return;
        
        if (!password) {
            strengthBar.className = 'strength-bar';
            strengthText.textContent = '';
            return;
        }

        const validation = Utils.validatePassword(password);
        
        strengthBar.className = `strength-bar ${validation.strength}`;
        
        const strengthTexts = {
            weak: 'Débil',
            fair: 'Regular',
            good: 'Buena',
            strong: 'Fuerte'
        };
        
        strengthText.textContent = strengthTexts[validation.strength];
    }

    togglePasswordVisibility(button) {
        const targetId = button.getAttribute('data-target');
        const input = Utils.$(`#${targetId}`);
        const icon = button.querySelector('i');
        
        if (!input || !icon) {
            console.error('Password toggle: target input or icon not found');
            return;
        }
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
            button.setAttribute('title', 'Ocultar contraseña');
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
            button.setAttribute('title', 'Mostrar contraseña');
        }
        
        // Brief animation feedback
        button.style.transform = 'translateY(-50%) scale(0.9)';
        setTimeout(() => {
            button.style.transform = 'translateY(-50%) scale(1)';
        }, 100);
    }

    async handleLogin() {
        const email = Utils.$('#login-email').value.trim();
        const password = Utils.$('#login-password').value;
        const submitBtn = this.loginForm.querySelector('button[type="submit"]');

        if (!email || !password) {
            Utils.Notifications.error('Por favor completa todos los campos', 3500);
            return;
        }

        if (!Utils.validateEmail(email)) {
            Utils.Notifications.error('Por favor ingresa un email válido', 3500);
            return;
        }

        try {
            this.setButtonLoading(submitBtn, true);
            
            const response = await API.Auth.login(email, password);
            
            this.currentUser = response.data.user;
            Utils.Storage.set('currentUser', this.currentUser);
            
            // Clear any existing authentication notifications to prevent duplicates
            // Utils.Notifications.clearByType('success');
            // Utils.Notifications.clearByType('error');
            Utils.Notifications.success('¡Bienvenido de vuelta!', 3000);
            
            // Initialize app
            this.showApp();
            
            // Initialize other modules
            if (window.Chat) {
                window.Chat.initialize(this.currentUser);
            }
            if (window.SocketManager) {
                window.SocketManager.connect();
            }
            
            // Load user data after authentication
            if (window.contactsManager) {
                window.contactsManager.loadUserData();
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.handleLoginError(error);
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    generateUsername(fullName) {
        // Remove accents and special characters
        const cleanName = fullName
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .trim();
        
        // Take first name and last name initial, or just first name
        const parts = cleanName.split(' ').filter(part => part.length > 0);
        let username = '';
        
        if (parts.length >= 2) {
            // Use first name + last name initial
            username = parts[0] + parts[parts.length - 1].charAt(0);
        } else if (parts.length === 1) {
            // Use just the first name
            username = parts[0];
        }
        
        // Add random number to make it more unique
        const randomNum = Math.floor(Math.random() * 9999) + 1;
        username += randomNum;
        
        return username;
    }

    async handleRegister() {
        const fullName = Utils.$('#register-fullname').value.trim();
        const email = Utils.$('#register-email').value.trim();
        const password = Utils.$('#register-password').value;
        const submitBtn = this.registerForm.querySelector('button[type="submit"]');

        // Validation
        if (!fullName || !email || !password) {
            Utils.Notifications.error('Por favor completa todos los campos');
            return;
        }

        if (fullName.length < 2) {
            Utils.Notifications.error('El nombre debe tener al menos 2 caracteres', 4000);
            return;
        }

        if (!Utils.validateEmail(email)) {
            Utils.Notifications.error('Por favor ingresa un email válido', 3500);
            return;
        }

        const passwordValidation = Utils.validatePassword(password);
        if (!passwordValidation.isValid) {
            Utils.Notifications.error('La contraseña debe tener al menos 6 caracteres', 4000);
            return;
        }

        try {
            this.setButtonLoading(submitBtn, true);
            
            const response = await API.Auth.register({
                fullName,
                email,
                password
            });
            
            this.currentUser = response.data.user;
            Utils.Storage.set('currentUser', this.currentUser);
            
            // Clear any existing authentication notifications to prevent duplicates
            // Utils.Notifications.clearByType('success');
            // Utils.Notifications.clearByType('error');
            Utils.Notifications.success('¡Cuenta creada exitosamente!', 3000);
            
            // Initialize app
            this.showApp();
            
            // Initialize other modules
            if (window.Chat) {
                window.Chat.initialize(this.currentUser);
            }
            if (window.SocketManager) {
                window.SocketManager.connect();
            }
            
            // Load user data after authentication
            if (window.contactsManager) {
                window.contactsManager.loadUserData();
            }
            
        } catch (error) {
            console.error('Register error:', error);
            this.handleRegisterError(error);
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    setButtonLoading(button, loading) {
        const span = button.querySelector('span');
        const icon = button.querySelector('i');
        
        if (loading) {
            button.disabled = true;
            span.textContent = 'Procesando...';
            icon.className = 'fas fa-spinner fa-spin';
        } else {
            button.disabled = false;
            
            // Restore original text and icon based on form
            if (button.closest('#login-form')) {
                span.textContent = 'Iniciar Sesión';
                icon.className = 'fas fa-arrow-right';
            } else {
                span.textContent = 'Crear Cuenta';
                icon.className = 'fas fa-user-plus';
            }
        }
    }

    showLoginForm() {
        this.hideAllForms();
        this.loginForm.classList.remove('hidden');
        
        // Focus first input
        setTimeout(() => {
            Utils.$('#login-email').focus();
        }, 100);
    }

    showRegisterForm() {
        this.hideAllForms();
        this.registerForm.classList.remove('hidden');
        
        // Focus first input
        setTimeout(() => {
            Utils.$('#register-fullname').focus();
        }, 100);
    }

    showForgotPasswordForm() {
        this.hideAllForms();
        Utils.$('#forgot-password-form').classList.remove('hidden');
        
        // Focus email input
        setTimeout(() => {
            Utils.$('#forgot-email').focus();
        }, 100);
    }

    showResetPasswordForm() {
        this.hideAllForms();
        Utils.$('#reset-password-form').classList.remove('hidden');
        
        // Focus new password input
        setTimeout(() => {
            Utils.$('#new-password').focus();
        }, 100);
    }

    showPasswordResetSuccess() {
        this.hideAllForms();
        Utils.$('#password-reset-success').classList.remove('hidden');
    }

    showMagicLinkForm() {
        this.hideAllForms();
        Utils.$('#magic-link-form').classList.remove('hidden');
        
        // Focus email input
        setTimeout(() => {
            Utils.$('#magic-link-email').focus();
        }, 100);
    }

    hideAllForms() {
        const forms = ['login-form', 'register-form', 'forgot-password-form', 'reset-password-form', 'password-reset-success', 'magic-link-form'];
        forms.forEach(formId => {
            const form = Utils.$(`#${formId}`);
            if (form) {
                form.classList.add('hidden');
            }
        });
    }

    async checkAuthStatus() {
        // Check URL parameters first for magic login or Google login
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const magicLogin = urlParams.get('magic_login');
        const googleLogin = urlParams.get('google_login');
        
        // If we have login tokens in URL, skip normal auth check and let the specific handlers deal with it
        if (token && (magicLogin === 'success' || googleLogin === 'success')) {
            console.log('Processing authentication from URL parameters...');
            return; // Let checkMagicLogin or checkGoogleLogin handle this
        }
        
        // Fix any token inconsistencies before checking auth
        const tokensCleared = Utils.Storage.fixTokenInconsistency();
        if (tokensCleared) {
            console.log('Token inconsistency fixed, user will need to re-login');
        }
        
        const storedToken = Utils.Storage.get('authToken');
        const user = Utils.Storage.get('currentUser');
        
        // Check if accessing with a shared session URL from a different device
        const sharedSessionToken = urlParams.get('session');
        
        if (sharedSessionToken && (!storedToken || !user)) {
            // Show device verification modal for shared session
            this.showDeviceVerificationModal(sharedSessionToken);
            return;
        }
        
        if (!storedToken || !user) {
            this.showAuth();
            return;
        }

        try {
            // Show app immediately with cached user data to prevent loading screen flicker
            this.currentUser = user;
            this.showApp();
            
            // Initialize other modules when they're ready
            this.initializeModulesWhenReady();
            
            // Verify token is still valid in background (non-blocking)
            this.backgroundTokenValidation();
            
        } catch (error) {
            console.error('Auth check error:', error);
            this.handleAuthFailure();
        }
    }

    initializeModulesWhenReady() {
        let retryCount = 0;
        const maxRetries = 50; // Maximum 5 seconds of retries (50 * 100ms)
        
        // Function to check if modules are ready and initialize them
        const checkAndInitModules = () => {
            let allReady = true;
            
            // Initialize Chat module
            if (window.Chat && this.currentUser) {
                try {
                    window.Chat.initialize(this.currentUser);
                    console.log('Chat module initialized successfully');
                } catch (error) {
                    console.warn('Failed to initialize Chat module:', error);
                }
            } else {
                allReady = false;
            }
            
            // Load user data after authentication
            if (window.contactsManager && this.currentUser) {
                try {
                    window.contactsManager.loadUserData();
                    console.log('ContactsManager data loaded successfully');
                } catch (error) {
                    console.warn('Failed to load ContactsManager data:', error);
                }
            } else {
                allReady = false;
            }

            // IMMEDIATELY connect socket to prevent status change during page refresh
            if (window.SocketManager) {
                try {
                    console.log('Connecting socket immediately to maintain online status...');
                    window.SocketManager.connect();
                    console.log('SocketManager connected successfully');
                } catch (error) {
                    console.warn('Failed to connect SocketManager:', error);
                }
            } else {
                allReady = false;
            }
            
            if (!allReady && retryCount < maxRetries) {
                retryCount++;
                // Retry after a short delay if not all modules are ready
                setTimeout(checkAndInitModules, 100);
            } else if (!allReady && retryCount >= maxRetries) {
                console.warn('Max retries reached for module initialization. Some modules may not be ready.');
            }
        };
        
        // Start the initialization check
        checkAndInitModules();
    }

    async backgroundTokenValidation() {
        try {
            const response = await API.Users.getProfile();
            
            // Update user data if different
            if (response.data) {
                this.currentUser = response.data;
                Utils.Storage.set('currentUser', this.currentUser);
                this.updateCurrentUserDisplay();
            }
            
        } catch (error) {
            console.warn('Background token validation failed:', error);
            
            // Only logout if it's a clear authentication error
            if (error.status === 401 || error.status === 403) {
                console.log('Token expired, logging out...');
                await this.handleAuthFailure();
            }
            // For other errors (network, server), keep user logged in
        }
    }

    async handleAuthFailure() {
        // Only logout if we're certain it's an auth issue, not network
        if (window.SocketManager) {
            window.SocketManager.disconnect();
        }
        await API.Auth.logout();
        this.showAuth();
    }

    showAuth() {
        this.loadingScreen.classList.add('hidden');
        this.authContainer.classList.remove('hidden');
        this.appContainer.classList.add('hidden');
        
        // Focus first input
        setTimeout(() => {
            const firstInput = this.authContainer.querySelector('input:not([type="hidden"])');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }

    showApp() {
        this.loadingScreen.classList.add('hidden');
        this.authContainer.classList.add('hidden');
        this.appContainer.classList.remove('hidden');
        
        // Ensure welcome screen is shown initially
        this.ensureInitialWelcomeState();
        
        // Update current user display
        this.updateCurrentUserDisplay();
        
        // Ensure status remains online even after page refresh
        setTimeout(() => this.ensureOnlineDisplay(), 500);
    }

    // Ensure welcome screen is visible when app starts
    ensureInitialWelcomeState() {
        // Force welcome screen manager to show initial state
        if (window.welcomeScreenManager) {
            window.welcomeScreenManager.forceInitialWelcomeState();
            console.log('🏠 AuthManager: Welcome screen forced on app start');
        }
    }

    updateCurrentUserDisplay() {
        if (!this.currentUser) return;
        
        // Update sidebar user profile photo (desktop)
        const profileImg = document.getElementById('current-user-profile-img');
        if (profileImg) {
            profileImg.src = this.currentUser.avatar || this.generateAvatarUrl();
            
            // Add click handler to open user profile settings modal
            if (!profileImg.hasAttribute('data-click-handler')) {
                profileImg.setAttribute('data-click-handler', 'true');
                profileImg.addEventListener('click', () => {
                    if (window.userProfileSettingsManager && typeof window.userProfileSettingsManager.openModal === 'function') {
                        window.userProfileSettingsManager.openModal();
                    }
                });
            }
        }
        
        // Update online indicator
        const onlineIndicator = document.getElementById('current-user-online-indicator');
        if (onlineIndicator) {
            onlineIndicator.style.display = 'block'; // Current user is always online
        }
        
        // Update mobile navigation profile
        if (window.mobileNavigation && typeof window.mobileNavigation.updateMobileUserProfile === 'function') {
            window.mobileNavigation.updateMobileUserProfile({
                profileImage: this.currentUser.avatar || this.generateAvatarUrl(),
                fullName: this.currentUser.fullName
            });
        }
    }

    generateAvatarUrl() {
        const name = this.currentUser.fullName || this.currentUser.username || 'User';
        const initials = Utils.getInitials(name);
        const color = Utils.stringToColor(name);
        
        // Generate a simple avatar using a service or create locally
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${color.replace('#', '')}&color=fff&size=200`;
    }

    getStatusText(status) {
        const statusTexts = {
            online: 'En línea',
            away: 'Ausente',
            busy: 'Ocupado',
            offline: 'Desconectado'
        };
        
        return statusTexts[status] || 'Desconocido';
    }
    
    // Ensure current user always shows online display
    ensureOnlineDisplay() {
        // User online status is now handled through the presence system and main menu
        // No sidebar status elements to update since we removed the user profile section
        console.log('Online status ensured through presence system');
    }

    async logout() {
        try {
            // Disconnect socket first
            if (window.SocketManager) {
                window.SocketManager.disconnect();
            }
            
            // Clear auth data
            await API.Auth.logout();
            this.currentUser = null;
            
            // Clear all local storage data
            Utils.Storage.clear();
            
            // Hide app container and show auth container
            if (this.appContainer) {
                this.appContainer.classList.add('hidden');
            }
            if (this.loadingScreen) {
                this.loadingScreen.classList.add('hidden');
            }
            
            // Show auth form and login
            this.showAuth();
            this.showLoginForm();
            
            // Clear any form data
            const emailInput = Utils.$('#login-email');
            const passwordInput = Utils.$('#login-password');
            if (emailInput) emailInput.value = '';
            if (passwordInput) passwordInput.value = '';
            
            Utils.Notifications.info('Sesión cerrada correctamente', 2500);
            
        } catch (error) {
            console.error('Logout error:', error);
            // Force reload as fallback
            window.location.reload();
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    updateCurrentUser(userData) {
        this.currentUser = { ...this.currentUser, ...userData };
        Utils.Storage.set('currentUser', this.currentUser);
        this.updateCurrentUserDisplay();
    }

    handleLoginError(error) {
        let message = 'Error al iniciar sesión';

        if (error instanceof API.ApiError) {
            switch (error.status) {
                case 400:
                    // Validation errors
                    if (error.response && error.response.field) {
                        switch (error.response.field) {
                            case 'email':
                                message = 'El formato del email no es válido';
                                break;
                            case 'password':
                                message = 'La contraseña es requerida';
                                break;
                            default:
                                message = error.message || 'Datos de entrada inválidos';
                        }
                    } else {
                        message = error.message || 'Datos de entrada inválidos';
                    }
                    break;

                case 401:
                    // Unauthorized - invalid credentials
                    message = 'Email o contraseña incorrectos. Verifica tus datos e intenta nuevamente';
                    break;

                case 403:
                    // Forbidden - account issues
                    if (error.response && error.response.reason) {
                        switch (error.response.reason) {
                            case 'account_suspended':
                                message = 'Tu cuenta ha sido suspendida. Contacta al administrador';
                                break;
                            case 'account_blocked':
                                message = 'Tu cuenta está bloqueada temporalmente. Intenta más tarde';
                                break;
                            case 'email_not_verified':
                                message = 'Debes verificar tu email antes de iniciar sesión';
                                break;
                            default:
                                message = 'No tienes permisos para acceder a esta cuenta';
                        }
                    } else {
                        message = 'No tienes permisos para acceder a esta cuenta';
                    }
                    break;

                case 404:
                    // User not found
                    message = 'No existe una cuenta asociada a este email. Verifica los datos o regístrate';
                    break;

                case 429:
                    // Rate limiting
                    message = 'Demasiados intentos de inicio de sesión. Espera unos minutos antes de intentar nuevamente';
                    break;

                case 500:
                case 502:
                case 503:
                case 504:
                    // Server errors
                    message = 'Error del servidor. Intenta nuevamente en unos momentos';
                    break;

                case 0:
                    // Network error
                    if (!navigator.onLine) {
                        message = 'Sin conexión a internet. Verifica tu conexión y intenta nuevamente';
                    } else {
                        message = 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente';
                    }
                    break;

                default:
                    message = error.message || 'Error inesperado al iniciar sesión. Intenta nuevamente';
            }
        } else {
            // Generic error
            if (!navigator.onLine) {
                message = 'Sin conexión a internet. Verifica tu conexión y intenta nuevamente';
            } else {
                message = 'Error de conexión. No se pudo contactar el servidor';
            }
        }

        // Clear any existing error notifications to prevent duplicates
        // Utils.Notifications.clearByType('error');
        Utils.Notifications.error(message, 4000);
    }

    handleRegisterError(error) {
        let message = 'Error al crear la cuenta';

        if (error instanceof API.ApiError) {
            switch (error.status) {
                case 400:
                    // Validation errors
                    if (error.response && error.response.field) {
                        switch (error.response.field) {
                            case 'email':
                                if (error.response.code === 'invalid_format') {
                                    message = 'El formato del email no es válido';
                                } else if (error.response.code === 'already_exists') {
                                    message = 'Ya existe una cuenta con este email. Intenta iniciar sesión';
                                } else {
                                    message = 'Error en el campo email';
                                }
                                break;
                            case 'username':
                                if (error.response.code === 'already_exists') {
                                    message = 'El nombre de usuario ya está en uso. Elige otro';
                                } else if (error.response.code === 'invalid_format') {
                                    message = 'El nombre de usuario contiene caracteres no válidos';
                                } else if (error.response.code === 'too_short') {
                                    message = 'El nombre de usuario debe tener al menos 3 caracteres';
                                } else if (error.response.code === 'too_long') {
                                    message = 'El nombre de usuario no puede tener más de 30 caracteres';
                                } else {
                                    message = 'Error en el nombre de usuario';
                                }
                                break;
                            case 'password':
                                if (error.response.code === 'too_weak') {
                                    message = 'La contraseña es muy débil. Debe tener al menos 6 caracteres';
                                } else if (error.response.code === 'too_short') {
                                    message = 'La contraseña debe tener al menos 6 caracteres';
                                } else {
                                    message = 'Error en la contraseña';
                                }
                                break;
                            case 'fullName':
                                message = 'El nombre completo es requerido y debe tener al menos 2 caracteres';
                                break;
                            default:
                                message = error.message || 'Datos de entrada inválidos';
                        }
                    } else {
                        message = error.message || 'Datos de entrada inválidos. Verifica todos los campos';
                    }
                    break;

                case 409:
                    // Conflict - duplicate data
                    if (error.response && error.response.field) {
                        switch (error.response.field) {
                            case 'email':
                                message = 'Ya existe una cuenta con este email. Intenta iniciar sesión';
                                break;
                            case 'username':
                                message = 'El nombre de usuario ya está en uso. Elige otro';
                                break;
                            default:
                                message = 'Los datos ingresados ya están en uso';
                        }
                    } else {
                        message = 'Los datos ingresados ya están en uso';
                    }
                    break;

                case 422:
                    // Unprocessable entity - validation failed
                    message = 'Los datos ingresados no son válidos. Verifica todos los campos';
                    break;

                case 429:
                    // Rate limiting
                    message = 'Demasiados intentos de registro. Espera unos minutos antes de intentar nuevamente';
                    break;

                case 500:
                case 502:
                case 503:
                case 504:
                    // Server errors
                    message = 'Error del servidor. No se pudo crear la cuenta. Intenta nuevamente en unos momentos';
                    break;

                case 0:
                    // Network error
                    if (!navigator.onLine) {
                        message = 'Sin conexión a internet. Verifica tu conexión y intenta nuevamente';
                    } else {
                        message = 'Error de conexión. No se pudo contactar el servidor';
                    }
                    break;

                default:
                    message = error.message || 'Error inesperado al crear la cuenta. Intenta nuevamente';
            }
        } else {
            // Generic error
            if (!navigator.onLine) {
                message = 'Sin conexión a internet. Verifica tu conexión y intenta nuevamente';
            } else {
                message = 'Error de conexión. No se pudo contactar el servidor';
            }
        }

        // Clear any existing error notifications to prevent duplicates
        // Utils.Notifications.clearByType('error');
        Utils.Notifications.error(message, 4000);
    }

    async handleForgotPassword() {
        const email = Utils.$('#forgot-email').value.trim();
        const submitBtn = Utils.$('#forgot-password-form-element').querySelector('button[type="submit"]');

        if (!email) {
            Utils.Notifications.error('Por favor ingresa tu correo electrónico', 3500);
            return;
        }

        if (!Utils.validateEmail(email)) {
            Utils.Notifications.error('Por favor ingresa un email válido', 3500);
            return;
        }

        try {
            this.setButtonLoading(submitBtn, true, 'Enviando...');

            await API.Auth.forgotPassword(email);
            
            // Hide form elements (input and button)
            const formElement = Utils.$('#forgot-password-form-element');
            const authFooter = Utils.$('#forgot-password-form .auth-footer');
            
            if (formElement) formElement.style.display = 'none';
            if (authFooter) authFooter.style.display = 'none';
            
            // Show success state with checkmark and green background
            const authHeader = Utils.$('#forgot-password-form .auth-header');
            if (authHeader) {
                authHeader.innerHTML = `
                    <div class="logo">
                        <i class="fas fa-comments"></i>
                        <span>VigiChat</span>
                    </div>
                    <h2>Recuperar contraseña</h2>
                    <div class="forgot-password-success">
                        <div class="success-checkmark">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <h3>¡Enlace enviado!</h3>
                        <p>Revisa tu correo electrónico y sigue las instrucciones para restablecer tu contraseña.</p>
                        <p class="email-sent-to">Instrucciones enviadas a: <strong>${email}</strong></p>
                        <button class="auth-button return-login-btn" onclick="window.AuthManager.showLoginForm()">
                            <span>Volver al inicio de sesión</span>
                            <i class="fas fa-arrow-left"></i>
                        </button>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Forgot password error:', error);
            
            let message = 'Error al procesar la solicitud';
            
            if (error instanceof API.ApiError) {
                switch (error.status) {
                    case 404:
                        message = 'No existe una cuenta asociada a este correo electrónico';
                        break;
                    case 500:
                        message = 'Error al enviar el correo electrónico. Verifica tu conexión e intenta nuevamente';
                        break;
                    default:
                        message = error.message || 'Error al procesar la solicitud';
                }
            } else {
                message = 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente';
            }
            
            Utils.Notifications.error(message, 4000);
            this.setButtonLoading(submitBtn, false, 'Enviar enlace');
        }
    }

    async handleResetPassword() {
        const newPassword = Utils.$('#new-password').value;
        const confirmPassword = Utils.$('#confirm-password').value;
        const submitBtn = Utils.$('#reset-password-form-element').querySelector('button[type="submit"]');

        // Validation
        if (!newPassword || !confirmPassword) {
            Utils.Notifications.error('Por favor completa todos los campos');
            return;
        }

        if (newPassword !== confirmPassword) {
            Utils.Notifications.error('Las contraseñas no coinciden', 3500);
            return;
        }

        const passwordValidation = Utils.validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            Utils.Notifications.error('La contraseña debe tener al menos 6 caracteres', 4000);
            return;
        }

        // Get token from URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
            Utils.Notifications.error('Token de restablecimiento no válido', 4000);
            return;
        }

        try {
            this.setButtonLoading(submitBtn, true, 'Restableciendo...');

            await API.Auth.resetPassword(token, newPassword);
            
            // Show success screen
            this.showPasswordResetSuccess();
            
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);

        } catch (error) {
            console.error('Reset password error:', error);
            
            let message = 'Error al restablecer la contraseña';
            
            if (error instanceof API.ApiError) {
                switch (error.status) {
                    case 400:
                        message = 'El enlace de restablecimiento ha expirado o no es válido';
                        break;
                    default:
                        message = error.message || 'Error al procesar la solicitud';
                }
            }
            
            Utils.Notifications.error(message, 4000);
        } finally {
            this.setButtonLoading(submitBtn, false, 'Restablecer contraseña');
        }
    }

    async checkResetToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (token) {
            try {
                await API.Auth.verifyResetToken(token);
                
                // Token is valid, show reset form
                this.showResetPasswordForm();
                
            } catch (error) {
                console.error('Token verification error:', error);
                
                Utils.Notifications.error('El enlace de restablecimiento ha expirado o no es válido', 4500);
                
                // Clean URL and show login
                window.history.replaceState({}, document.title, window.location.pathname);
                this.showLoginForm();
            }
        }
    }

    async checkMagicLogin() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const magicLogin = urlParams.get('magic_login');

        if (token && magicLogin === 'success') {
            try {
                // Store the token and user data
                Utils.Storage.set('authToken', token);
                
                // Set the token in API for immediate use
                if (window.API && window.API.api) {
                    window.API.api.setToken(token);
                }
                
                // Get user profile with the token
                const response = await API.Users.getProfile();
                if (response && response.data) {
                    this.currentUser = response.data;
                    Utils.Storage.set('currentUser', this.currentUser);
                    
                    // Show success message
                    Utils.Notifications.success('¡Inicio de sesión con OTP exitoso!', 3000);
                    
                    // Clean URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                    
                    // Initialize app
                    this.showApp();
                    
                    // Initialize other modules
                    if (window.Chat) {
                        window.Chat.initialize(this.currentUser);
                    }
                    if (window.SocketManager) {
                        window.SocketManager.connect();
                    }
                    if (window.contactsManager) {
                        window.contactsManager.loadUserData();
                    }
                } else {
                    throw new Error('No se pudo obtener los datos del usuario');
                }
                
            } catch (error) {
                console.error('Magic login error:', error);
                
                // Clear invalid token data
                Utils.Storage.clear();
                
                Utils.Notifications.error('Error al procesar el inicio de sesión con OTP', 4500);
                
                // Clean URL and show login
                window.history.replaceState({}, document.title, window.location.pathname);
                this.showLoginForm();
            }
        }
    }

    async checkGoogleLogin() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const googleLogin = urlParams.get('google_login');
        const error = urlParams.get('error');

        if (error === 'google_auth_failed') {
            Utils.Notifications.error('Error en la autenticación con Google. Intenta nuevamente.', 4500);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            this.showLoginForm();
            return;
        }

        if (token && googleLogin === 'success') {
            try {
                // Store the token and user data
                Utils.Storage.set('authToken', token);
                
                // Set the token in API for immediate use
                if (window.API && window.API.api) {
                    window.API.api.setToken(token);
                }
                
                // Get user profile with the token
                const response = await API.Users.getProfile();
                if (response && response.data) {
                    this.currentUser = response.data;
                    Utils.Storage.set('currentUser', this.currentUser);
                    
                    // Show success message
                    Utils.Notifications.success('¡Inicio de sesión con Google exitoso!', 3000);
                    
                    // Clean URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                    
                    // Initialize app
                    this.showApp();
                    
                    // Initialize other modules
                    if (window.Chat) {
                        window.Chat.initialize(this.currentUser);
                    }
                    if (window.SocketManager) {
                        window.SocketManager.connect();
                    }
                    if (window.contactsManager) {
                        window.contactsManager.loadUserData();
                    }
                } else {
                    throw new Error('No se pudo obtener los datos del usuario');
                }
                
            } catch (error) {
                console.error('Google login error:', error);
                
                // Clear invalid token data
                Utils.Storage.clear();
                
                Utils.Notifications.error('Error al procesar el inicio de sesión con Google', 4500);
                
                // Clean URL and show login
                window.history.replaceState({}, document.title, window.location.pathname);
                this.showLoginForm();
            }
        }
    }

    setButtonLoading(button, loading, customText = null) {
        const span = button.querySelector('span');
        const icon = button.querySelector('i');
        
        if (loading) {
            button.disabled = true;
            if (customText) {
                span.textContent = customText;
            }
            icon.className = 'fas fa-spinner fa-spin';
        } else {
            button.disabled = false;
            
            // Restore original text and icon
            if (customText) {
                span.textContent = customText;
            } else {
                // Determine original text based on form context
                if (button.closest('#login-form')) {
                    span.textContent = 'Iniciar Sesión';
                    icon.className = 'fas fa-arrow-right';
                } else if (button.closest('#register-form')) {
                    span.textContent = 'Crear Cuenta';
                    icon.className = 'fas fa-user-plus';
                } else if (button.closest('#forgot-password-form')) {
                    span.textContent = 'Enviar enlace';
                    icon.className = 'fas fa-paper-plane';
                } else if (button.closest('#reset-password-form')) {
                    span.textContent = 'Restablecer contraseña';
                    icon.className = 'fas fa-check';
                }
            }
        }
    }

    // Device verification methods for cross-device session sharing
    showDeviceVerificationModal(sessionToken) {
        const modal = Utils.$('#device-verification-modal');
        if (!modal) {
            console.error('Device verification modal not found');
            return;
        }

        // Store session token for verification
        this.pendingSessionToken = sessionToken;
        
        // Setup form listeners if not already done
        this.setupDeviceVerificationListeners();
        
        // Show modal
        modal.classList.remove('hidden');
        
        // Focus on email input
        setTimeout(() => {
            const emailInput = Utils.$('#verify-email');
            if (emailInput) {
                emailInput.focus();
            }
        }, 100);
    }

    setupDeviceVerificationListeners() {
        const form = Utils.$('#device-verification-form');
        const cancelBtn = Utils.$('#cancel-verification');
        const verifyBtn = Utils.$('#verify-device-btn');
        const modal = Utils.$('#device-verification-modal');
        
        if (!form || this.deviceVerificationListenersSetup) return;
        
        // Mark as setup to avoid duplicate listeners
        this.deviceVerificationListenersSetup = true;

        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.performDeviceVerification();
        });

        // Verify button click
        if (verifyBtn) {
            verifyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.performDeviceVerification();
            });
        }

        // Cancel button
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeDeviceVerificationModal();
            });
        }

        // Close modal when clicking overlay
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.classList.contains('modal-overlay')) {
                    this.closeDeviceVerificationModal();
                }
            });
        }

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                this.closeDeviceVerificationModal();
            }
        });
    }

    async performDeviceVerification() {
        const email = Utils.$('#verify-email').value.trim();
        const password = Utils.$('#verify-password').value;
        const submitBtn = Utils.$('#verify-device-btn');
        
        if (!email || !password) {
            Utils.Notifications.error('Por favor completa todos los campos', 3500);
            return;
        }

        if (!Utils.validateEmail(email)) {
            Utils.Notifications.error('Por favor ingresa un email válido', 3500);
            return;
        }

        if (!this.pendingSessionToken) {
            Utils.Notifications.error('Token de sesión no válido', 4000);
            return;
        }

        try {
            this.setButtonLoading(submitBtn, true, 'Verificando...');

            const response = await fetch('/api/session-auth/verify-device', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionToken: this.pendingSessionToken,
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error de verificación');
            }

            // Successfully verified - set user data and show app
            this.currentUser = data.data.user;
            Utils.Storage.set('currentUser', this.currentUser);
            
            // Close modal
            this.closeDeviceVerificationModal();
            
            // Clear URL parameters
            const url = new URL(window.location);
            url.searchParams.delete('session');
            window.history.replaceState({}, document.title, url.pathname + url.search);
            
            // Show success and initialize app
            Utils.Notifications.success('Dispositivo verificado exitosamente', 3000);
            
            this.showApp();
            
            // Initialize other modules
            if (window.Chat) {
                window.Chat.initialize(this.currentUser);
            }
            if (window.SocketManager) {
                window.SocketManager.connect();
            }
            if (window.contactsManager) {
                window.contactsManager.loadUserData();
            }

        } catch (error) {
            console.error('Device verification error:', error);
            
            let message = 'Error al verificar dispositivo';
            if (error.message) {
                message = error.message;
            }
            
            Utils.Notifications.error(message, 4000);
        } finally {
            this.setButtonLoading(submitBtn, false, 'Verificar dispositivo');
        }
    }

    closeDeviceVerificationModal() {
        const modal = Utils.$('#device-verification-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        
        // Clear form
        const emailInput = Utils.$('#verify-email');
        const passwordInput = Utils.$('#verify-password');
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
        
        // Clear pending token
        this.pendingSessionToken = null;
        
        // If user canceled verification, redirect to normal auth
        this.showAuth();
    }

    async handleMagicLink() {
        const email = Utils.$('#magic-link-email').value.trim();
        const submitBtn = Utils.$('#magic-link-form-element').querySelector('button[type="submit"]');

        if (!email) {
            Utils.Notifications.error('Por favor ingresa tu correo electrónico', 3500);
            return;
        }

        if (!Utils.validateEmail(email)) {
            Utils.Notifications.error('Por favor ingresa un email válido', 3500);
            return;
        }

        try {
            this.setButtonLoading(submitBtn, true, 'Enviando...');

            await API.Auth.sendMagicLink(email);
            
            // Hide form elements (input and button)
            const formElement = Utils.$('#magic-link-form-element');
            const authFooter = Utils.$('#magic-link-form .auth-footer');
            
            if (formElement) formElement.style.display = 'none';
            if (authFooter) authFooter.style.display = 'none';
            
            // Show success state with checkmark
            const authHeader = Utils.$('#magic-link-form .auth-header');
            if (authHeader) {
                authHeader.innerHTML = `
                    <div class="logo">
                        <i class="fas fa-comments"></i>
                        <span>VigiChat</span>
                    </div>
                    <h2>Enlace Mágico</h2>
                    <div class="forgot-password-success">
                        <div class="success-checkmark">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <h3>¡OTP enviado!</h3>
                        <p>Revisa tu correo electrónico y haz clic en el enlace para iniciar sesión automáticamente.</p>
                        <p class="email-sent-to">Código OTP enviado a: <strong>${email}</strong></p>
                        <button class="auth-button return-login-btn" onclick="window.AuthManager.showLoginForm()">
                            <span>Volver al inicio de sesión</span>
                            <i class="fas fa-arrow-left"></i>
                        </button>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Magic link error:', error);
            
            let message = 'Error al procesar la solicitud';
            
            if (error instanceof API.ApiError) {
                switch (error.status) {
                    case 404:
                        message = 'No existe una cuenta asociada a este correo electrónico';
                        break;
                    case 500:
                        message = 'Error al enviar el código OTP. Verifica tu conexión e intenta nuevamente';
                        break;
                    default:
                        message = error.message || 'Error al procesar la solicitud';
                }
            } else {
                message = 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente';
            }
            
            Utils.Notifications.error(message, 4000);
            this.setButtonLoading(submitBtn, false, 'Enviar OTP');
        }
    }

    async handleGoogleAuth() {
        try {
            // Redirect to Google OAuth
            window.location.href = '/api/auth/google';
            
        } catch (error) {
            console.error('Google auth error:', error);
            Utils.Notifications.error('Error al iniciar autenticación con Google', 4000);
        }
    }

    setupDynamicPasswordToggle() {
        // Find all password inputs and their containers
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        
        passwordInputs.forEach(input => {
            const formGroup = input.closest('.form-group');
            if (!formGroup) return;
            
            // Function to check if input has content
            const checkContent = () => {
                if (input.value.trim().length > 0) {
                    formGroup.classList.add('has-content');
                } else {
                    formGroup.classList.remove('has-content');
                }
            };
            
            // Add event listeners
            input.addEventListener('input', checkContent);
            input.addEventListener('keyup', checkContent);
            input.addEventListener('paste', () => {
                // Use setTimeout to wait for paste content to be processed
                setTimeout(checkContent, 10);
            });
            
            // Check initial state
            checkContent();
        });
    }
}

// Initialize auth manager when Utils is available
const initAuthManager = () => {
    if (typeof Utils !== 'undefined') {
        window.AuthManager = new AuthManager();
        
        // Setup logout button
        Utils.$('#logout-btn')?.addEventListener('click', () => {
            window.AuthManager.logout();
        });
    } else {
        setTimeout(initAuthManager, 10);
    }
};

initAuthManager();