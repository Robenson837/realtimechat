/**
 * Frontend Integration Example for Enhanced Session Authentication
 * 
 * Este archivo muestra cómo integrar el nuevo sistema de sesiones tipo Facebook
 * en tu aplicación frontend.
 */

class SessionManager {
    constructor(apiBaseUrl = '/api/session-auth') {
        this.apiBaseUrl = apiBaseUrl;
        this.sessionCheckInterval = null;
        this.refreshTimer = null;
        this.eventListeners = {};
    }

    /**
     * Iniciar sesión con el nuevo sistema
     */
    async login(email, password, remember = false, twoFactorCode = null) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Importante para cookies
                body: JSON.stringify({
                    email,
                    password,
                    remember,
                    twoFactorCode
                })
            });

            const data = await response.json();

            if (data.success) {
                // Almacenar información del usuario
                localStorage.setItem('user', JSON.stringify(data.data.user));
                
                // Configurar renovación automática de tokens
                this.setupTokenRefresh(data.data.session.expiresAt);
                
                // Verificar si requiere verificación adicional
                if (data.requiresVerification) {
                    this.trigger('verification-required', data.data);
                    return { success: true, requiresVerification: true, data: data.data };
                }
                
                // Mostrar alertas de seguridad si hay actividad sospechosa
                if (data.data.security.suspicious) {
                    this.handleSecurityAlert(data.data.security);
                }
                
                // Mostrar información del dispositivo si es nuevo
                if (data.data.session.isNewDevice) {
                    this.handleNewDevice(data.data.session);
                }
                
                this.trigger('login-success', data.data);
                return { success: true, data: data.data };
            } else {
                this.trigger('login-error', data.message);
                return { success: false, error: data.message };
            }

        } catch (error) {
            console.error('Login error:', error);
            this.trigger('login-error', 'Error de conexión');
            return { success: false, error: 'Error de conexión' };
        }
    }

    /**
     * Cerrar sesión
     */
    async logout() {
        try {
            await fetch(`${this.apiBaseUrl}/logout`, {
                method: 'POST',
                credentials: 'include'
            });

            this.clearLocalData();
            this.trigger('logout');

        } catch (error) {
            console.error('Logout error:', error);
            // Limpiar datos locales incluso si falla la petición
            this.clearLocalData();
            this.trigger('logout');
        }
    }

    /**
     * Cerrar sesión en todos los dispositivos
     */
    async logoutAll() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/logout-all`, {
                method: 'POST',
                credentials: 'include'
            });

            const data = await response.json();
            
            if (data.success) {
                this.clearLocalData();
                this.trigger('logout-all', data.data.revokedSessions);
                return { success: true, revokedSessions: data.data.revokedSessions };
            }

        } catch (error) {
            console.error('Logout all error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener todas las sesiones activas
     */
    async getSessions() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/sessions`, {
                credentials: 'include'
            });

            const data = await response.json();
            
            if (data.success) {
                return { success: true, sessions: data.data.sessions };
            } else {
                return { success: false, error: data.message };
            }

        } catch (error) {
            console.error('Get sessions error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Revocar una sesión específica
     */
    async revokeSession(sessionId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/sessions/${sessionId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const data = await response.json();
            return { success: data.success, message: data.message };

        } catch (error) {
            console.error('Revoke session error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Verificar si la sesión actual es válida
     */
    async verifySession() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/verify`, {
                credentials: 'include'
            });

            const data = await response.json();
            
            if (data.success) {
                // Actualizar información del usuario
                localStorage.setItem('user', JSON.stringify(data.data.user));
                return { success: true, user: data.data.user, session: data.data.session };
            } else {
                // Sesión inválida
                this.clearLocalData();
                this.trigger('session-invalid');
                return { success: false, error: data.message };
            }

        } catch (error) {
            console.error('Session verification error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Configurar renovación automática de tokens
     */
    setupTokenRefresh(expiresAt) {
        // Limpiar timer anterior si existe
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

        // Calcular cuándo renovar (2 minutos antes de expirar)
        const expirationTime = new Date(expiresAt).getTime();
        const refreshTime = expirationTime - Date.now() - (2 * 60 * 1000);

        if (refreshTime > 0) {
            this.refreshTimer = setTimeout(() => {
                this.refreshToken();
            }, refreshTime);
        }
    }

    /**
     * Renovar token automáticamente
     */
    async refreshToken() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/refresh`, {
                method: 'POST',
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                // Configurar próxima renovación
                this.setupTokenRefresh(data.data.expiresAt);
                this.trigger('token-refreshed');
            } else {
                // Refresh falló, redirigir a login
                this.clearLocalData();
                this.trigger('session-expired');
            }

        } catch (error) {
            console.error('Token refresh error:', error);
            this.clearLocalData();
            this.trigger('session-expired');
        }
    }

    /**
     * Manejar alertas de seguridad
     */
    handleSecurityAlert(security) {
        const alertMessage = `Se detectó actividad inusual en tu cuenta. Puntuación de riesgo: ${security.riskScore}/100`;
        
        if (security.riskScore > 70) {
            // Mostrar alerta crítica
            this.trigger('security-alert-critical', {
                message: alertMessage,
                risks: security.risks,
                recommendAction: 'Verificar actividad y cambiar contraseña'
            });
        } else {
            // Mostrar alerta informativa
            this.trigger('security-alert-info', {
                message: alertMessage,
                risks: security.risks
            });
        }
    }

    /**
     * Manejar nuevo dispositivo
     */
    handleNewDevice(session) {
        const deviceInfo = `${session.deviceInfo.browser.name} en ${session.deviceInfo.os.name}`;
        const locationInfo = `${session.location.city}, ${session.location.country}`;
        
        this.trigger('new-device-login', {
            device: deviceInfo,
            location: locationInfo,
            timestamp: new Date().toLocaleString()
        });
    }

    /**
     * Limpiar datos locales
     */
    clearLocalData() {
        localStorage.removeItem('user');
        
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
        }
    }

    /**
     * Sistema de eventos
     */
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    trigger(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(data));
        }
    }

    /**
     * Inicializar verificación periódica de sesión
     */
    startSessionMonitoring() {
        // Verificar sesión cada 5 minutos
        this.sessionCheckInterval = setInterval(() => {
            this.verifySession();
        }, 5 * 60 * 1000);
    }

    /**
     * Obtener usuario actual
     */
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    /**
     * Verificar si el usuario está logueado
     */
    isLoggedIn() {
        return !!this.getCurrentUser();
    }
}

// Ejemplo de uso
const sessionManager = new SessionManager();

// Configurar eventos
sessionManager.on('login-success', (data) => {
    console.log('Login exitoso:', data.user.fullName);
    // Redirigir a dashboard o página principal
    window.location.href = '/dashboard';
});

sessionManager.on('security-alert-critical', (alert) => {
    // Mostrar modal de alerta crítica
    showCriticalSecurityAlert(alert);
});

sessionManager.on('new-device-login', (info) => {
    // Mostrar notificación de nuevo dispositivo
    showNewDeviceNotification(info);
});

sessionManager.on('session-expired', () => {
    // Redirigir a login
    window.location.href = '/login';
});

// Inicializar monitoreo al cargar la página
window.addEventListener('load', () => {
    if (sessionManager.isLoggedIn()) {
        sessionManager.startSessionMonitoring();
        sessionManager.verifySession();
    }
});

// Función para mostrar alertas (implementar según tu UI)
function showCriticalSecurityAlert(alert) {
    // Implementar UI para mostrar alerta crítica
    alert(`🚨 ALERTA DE SEGURIDAD: ${alert.message}\n\nAcción recomendada: ${alert.recommendAction}`);
}

function showNewDeviceNotification(info) {
    // Implementar UI para mostrar notificación
    console.log(`📱 Nuevo dispositivo: ${info.device} desde ${info.location} a las ${info.timestamp}`);
}

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionManager;
}

/**
 * Ejemplo de integración con formulario de login HTML
 */
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(loginForm);
            const email = formData.get('email');
            const password = formData.get('password');
            const remember = formData.get('remember') === 'on';
            
            // Mostrar loading
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Iniciando sesión...';
            submitBtn.disabled = true;
            
            try {
                const result = await sessionManager.login(email, password, remember);
                
                if (!result.success) {
                    // Mostrar error
                    showLoginError(result.error);
                }
                // El evento 'login-success' manejará la redirección
                
            } catch (error) {
                showLoginError('Error inesperado durante el login');
            } finally {
                // Restaurar botón
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

function showLoginError(message) {
    // Implementar según tu UI
    alert(`Error: ${message}`);
}