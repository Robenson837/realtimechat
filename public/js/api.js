// API module for VigiChat

const API_BASE_URL = (window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin) + '/api';

class ApiClient {
    constructor() {
        this.requestCount = 0;
        this.lastRequestTime = 0;
        this.retryDelays = new Map(); // Track retry delays per endpoint
        
        // Wait for Utils to be available
        if (typeof Utils === 'undefined') {
            this.initWhenReady();
            return;
        }
        this.init();
    }
    
    init() {
        this.token = Utils.Storage.get('authToken');
        this.baseURL = API_BASE_URL;
    }
    
    initWhenReady() {
        const checkUtils = () => {
            if (typeof Utils !== 'undefined') {
                this.init();
            } else {
                setTimeout(checkUtils, 10);
            }
        };
        checkUtils();
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        if (token) {
            Utils.Storage.set('authToken', token);
        } else {
            Utils.Storage.remove('authToken');
        }
    }

    // Get headers with authentication
    getHeaders(contentType = 'application/json') {
        const headers = {
            'Content-Type': contentType
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // Intelligent rate limiting
    async rateLimitCheck(endpoint) {
        const now = Date.now();
        const minInterval = 100; // Minimum time between requests (ms)
        
        // Check if we need to wait
        if (now - this.lastRequestTime < minInterval) {
            const waitTime = minInterval - (now - this.lastRequestTime);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        // Check for endpoint-specific retry delays
        const retryKey = endpoint.split('?')[0]; // Remove query params for key
        if (this.retryDelays.has(retryKey)) {
            const retryData = this.retryDelays.get(retryKey);
            if (now < retryData.nextRetry) {
                const waitTime = retryData.nextRetry - now;
                console.log(`Rate limited endpoint ${retryKey}, waiting ${waitTime}ms`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        
        this.lastRequestTime = Date.now();
        this.requestCount++;
    }

    // Handle rate limit response
    handleRateLimit(endpoint, retryAfter = null) {
        const retryKey = endpoint.split('?')[0];
        let delay = 1000; // Default 1 second
        
        // Use server-provided retry-after if available
        if (retryAfter) {
            delay = parseInt(retryAfter) * 1000;
        } else {
            // Exponential backoff based on previous failures
            const existing = this.retryDelays.get(retryKey);
            if (existing) {
                delay = Math.min(existing.delay * 2, 30000); // Max 30 seconds
            }
        }
        
        this.retryDelays.set(retryKey, {
            delay,
            nextRetry: Date.now() + delay,
            count: (this.retryDelays.get(retryKey)?.count || 0) + 1
        });
        
        // Clean up old entries
        setTimeout(() => {
            if (this.retryDelays.has(retryKey)) {
                const data = this.retryDelays.get(retryKey);
                if (Date.now() > data.nextRetry) {
                    this.retryDelays.delete(retryKey);
                }
            }
        }, delay + 5000);
    }

    // Make HTTP request
    async request(endpoint, options = {}) {
        // Apply intelligent rate limiting
        await this.rateLimitCheck(endpoint);
        
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        // Add body if it's an object
        if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                // Handle rate limiting specifically
                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After');
                    this.handleRateLimit(endpoint, retryAfter);
                    throw new ApiError('Demasiadas solicitudes. Intenta más tarde', response.status, data);
                }
                
                throw new ApiError(data.message || 'Request failed', response.status, data);
            }

            // Clear retry delay on successful request
            const retryKey = endpoint.split('?')[0];
            if (this.retryDelays.has(retryKey)) {
                this.retryDelays.delete(retryKey);
            }

            return data;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }

            // Handle network errors
            if (!navigator.onLine) {
                throw new ApiError('No hay conexión a internet', 0);
            }

            throw new ApiError('Error de conexión', 0, error);
        }
    }

    // HTTP methods
    get(endpoint, params = {}) {
        const url = new URL(`${this.baseURL}${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        
        return this.request(endpoint + url.search, { method: 'GET' });
    }

    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: data
        });
    }

    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: data
        });
    }

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // Upload file
    async upload(endpoint, file, onProgress, fieldName = 'file') {
        const formData = new FormData();
        formData.append(fieldName, file);

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    onProgress(percentComplete);
                }
            });

            xhr.addEventListener('load', () => {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(response);
                    } else {
                        reject(new ApiError(response.message || 'Upload failed', xhr.status, response));
                    }
                } catch (error) {
                    reject(new ApiError('Invalid response', xhr.status));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new ApiError('Upload failed', 0));
            });

            xhr.open('POST', `${this.baseURL}${endpoint}`);
            xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
            xhr.send(formData);
        });
    }
}

// Custom error class for API errors
class ApiError extends Error {
    constructor(message, status, response = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.response = response;
    }
}

// Create API client instance
const api = new ApiClient();

// Authentication endpoints
const Auth = {
    async login(email, password) {
        const response = await api.post('/auth/login', { email, password });
        api.setToken(response.data.token);
        return response;
    },

    async register(userData) {
        const response = await api.post('/auth/register', userData);
        api.setToken(response.data.token);
        return response;
    },

    async checkUsername(username) {
        return api.post('/auth/check-username', { username });
    },

    async checkEmail(email) {
        return api.post('/auth/check-email', { email });
    },

    async logout() {
        try {
            // Call backend to properly close session
            await api.post('/session-auth/logout');
        } catch (error) {
            console.warn('Backend logout failed:', error);
            // Continue with local cleanup even if backend fails
        } finally {
            // Always clean up locally
            api.setToken(null);
            Utils.Storage.clear();
        }
    },

    async forgotPassword(email) {
        return api.post('/auth/forgot-password', { email });
    },

    async resetPassword(token, password) {
        return api.post('/auth/reset-password', { token, password });
    },

    async verifyResetToken(token) {
        return api.get(`/auth/verify-reset-token/${token}`);
    },

    isAuthenticated() {
        return !!api.token;
    }
};

// User endpoints
const Users = {
    async getProfile() {
        return api.get('/users/me');
    },

    async updateProfile(userData) {
        return api.put('/users/me', userData);
    },

    async updateSettings(settings) {
        return api.put('/users/settings', settings);
    },

    async updateStatus(status, statusMessage = '') {
        return api.put('/users/status', { status, statusMessage });
    },

    async searchUsers(query, limit = 10) {
        return api.get('/users/search', { q: query, limit });
    },

    async getUserById(userId) {
        return api.get(`/users/${userId}`);
    },

    async getUserProfile(userId) {
        return this.getUserById(userId);
    },

    async deactivateAccount() {
        return api.delete('/users/me');
    },

    async uploadAvatar(file, onProgress) {
        return api.upload('/users/avatar', file, onProgress, 'avatar');
    },

    async deleteAvatar() {
        return api.delete('/users/avatar');
    }
};

// Contacts endpoints
const Contacts = {
    async getContacts() {
        return api.get('/contacts');
    },

    async searchUsers(query, limit = 15) {
        return api.get('/contacts/search', { q: query, limit });
    },

    async sendContactRequest(userId, message = '') {
        return api.post('/contacts/request', { userId, message });
    },

    async getContactRequests() {
        return api.get('/contacts/requests');
    },

    async acceptContactRequest(requestId) {
        return api.post(`/contacts/requests/${requestId}/accept`);
    },

    async declineContactRequest(requestId) {
        return api.post(`/contacts/requests/${requestId}/reject`);
    },

    async removeContact(contactId) {
        return api.delete(`/contacts/${contactId}`);
    },

    async blockContact(contactId) {
        return api.post(`/contacts/${contactId}/block`);
    },

    async unblockContact(contactId) {
        return api.post(`/contacts/${contactId}/unblock`);
    },

    async getBlockedContacts() {
        return api.get('/contacts/blocked');
    }
};

// Messages endpoints
const Messages = {
    async getConversations() {
        return api.get('/messages/conversations');
    },

    async getConversationMessages(conversationId, page = 1, limit = 50) {
        return api.get(`/messages/conversation/${conversationId}`, { page, limit });
    },

    async getMessages(conversationId, page = 1, limit = 20) {
        return this.getConversationMessages(conversationId, page, limit);
    },

    async clearConversation(conversationId) {
        return api.delete(`/messages/conversation/${conversationId}/clear`);
    },

    async sendMessage(recipientId, content, type = 'text', replyToId = null) {
        return api.post('/messages/send', {
            recipientId,
            content,
            type,
            replyToId
        });
    },

    async markAsRead(messageId) {
        return api.put(`/messages/${messageId}/read`);
    },

    async editMessage(messageId, content) {
        return api.put(`/messages/${messageId}/edit`, { content });
    },

    async deleteMessage(messageId) {
        return api.delete(`/messages/${messageId}`);
    },

    async addReaction(messageId, emoji) {
        return api.post(`/messages/${messageId}/react`, { emoji });
    },

    async getUnreadCount() {
        return api.get('/messages/unread-count');
    },

    async markConversationAsRead(conversationId) {
        return api.post('/messages/mark-conversation-read', { conversationId });
    }
};

// Upload endpoints
const Upload = {
    async uploadAvatar(file, onProgress) {
        return api.upload('/upload/avatar', file, onProgress);
    },

    async uploadFile(file, onProgress) {
        return api.upload('/upload/file', file, onProgress);
    },

    async uploadImage(file, onProgress) {
        return api.upload('/upload/image', file, onProgress);
    }
};

// Error handler for API calls
const handleApiError = (error) => {
    console.error('API Error:', error);

    if (error instanceof ApiError) {
        switch (error.status) {
            case 401:
                // Only logout for specific auth errors, not all 401s
                if (error.message && (
                    error.message.includes('token') || 
                    error.message.includes('expired') || 
                    error.message.includes('unauthorized')
                )) {
                    console.log('Token-related 401 error, logging out:', error.message);
                    Auth.logout().then(() => {
                        window.location.reload();
                    }).catch(() => {
                        window.location.reload();
                    });
                } else {
                    console.warn('401 error but not token-related, not logging out:', error.message);
                    Utils.Notifications.error('Error de autorización temporal', 4000);
                }
                break;
            case 403:
                Utils.Notifications.error('No tienes permisos para realizar esta acción', 4000);
                break;
            case 404:
                Utils.Notifications.error('Recurso no encontrado', 4000);
                break;
            case 429:
                Utils.Notifications.error('Demasiadas solicitudes. Intenta más tarde', 4500);
                break;
            case 500:
                Utils.Notifications.error('Error del servidor. Intenta más tarde', 4500);
                break;
            case 0:
                if (!navigator.onLine) {
                    Utils.Notifications.error('Sin conexión a internet', 4500);
                } else {
                    Utils.Notifications.error('Error de conexión', 4000);
                }
                break;
            default:
                Utils.Notifications.error(error.message || 'Error desconocido', 4000);
        }
    } else {
        Utils.Notifications.error('Error inesperado', 4000);
    }
};

// Request queue DISABLED FOR DEVELOPMENT
class RequestQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
    }

    add(request) {
        // Queue disabled for development
        console.log('Request queue disabled - ignoring request');
    }

    async processQueue() {
        // Queue disabled for development
        console.log('Queue processing disabled - doing nothing');
        return;
    }

    clear() {
        // Queue disabled for development
        console.log('Queue clear disabled - doing nothing');
        return;
    }

    size() {
        // Queue disabled for development
        return 0;
    }
}

const requestQueue = new RequestQueue();

// Cache for frequently accessed data (DISABLED FOR DEVELOPMENT)
class ApiCache {
    constructor() {
        this.cache = new Map();
        this.ttl = new Map(); // Time to live for cached items
        this.defaultTTL = 0; // Disabled - no caching
    }

    set(key, value, ttl = this.defaultTTL) {
        // Caching disabled for development
        return;
    }

    get(key) {
        // Caching disabled for development
        return null;
    }

    has(key) {
        return this.get(key) !== null;
    }

    delete(key) {
        this.cache.delete(key);
        this.ttl.delete(key);
    }

    clear() {
        this.cache.clear();
        this.ttl.clear();
    }

    size() {
        return this.cache.size;
    }
}

const apiCache = new ApiCache();

// Cached API wrapper
const CachedApi = {
    async get(key, apiFn, ttl) {
        if (apiCache.has(key)) {
            return apiCache.get(key);
        }

        try {
            const result = await apiFn();
            apiCache.set(key, result, ttl);
            return result;
        } catch (error) {
            throw error;
        }
    },

    invalidate(key) {
        apiCache.delete(key);
    },

    invalidatePattern(pattern) {
        for (const key of apiCache.cache.keys()) {
            if (key.includes(pattern)) {
                apiCache.delete(key);
            }
        }
    }
};

// Export API modules
window.API = {
    client: api,
    Auth,
    Users,
    Contacts,
    Messages,
    Upload,
    handleApiError,
    requestQueue,
    cache: CachedApi,
    ApiError
};