// Utility functions for VigiChat

// DOM utilities
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Create element with attributes and children
const createElement = (tag, attributes = {}, ...children) => {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'innerHTML') {
            element.innerHTML = value;
        } else if (key === 'textContent') {
            element.textContent = value;
        } else if (key.startsWith('on')) {
            element.addEventListener(key.slice(2).toLowerCase(), value);
        } else {
            element.setAttribute(key, value);
        }
    });
    
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            element.appendChild(child);
        }
    });
    
    return element;
};

// Time formatting utilities
const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
};

const formatDate = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffTime = Math.abs(now - messageDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        return 'Hoy';
    } else if (diffDays === 2) {
        return 'Ayer';
    } else if (diffDays <= 7) {
        return messageDate.toLocaleDateString('es-ES', { weekday: 'long' });
    } else {
        return messageDate.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short'
        });
    }
};

const formatLastSeen = (date) => {
    if (!date) return 'Nunca visto';
    
    const now = new Date();
    const lastSeen = new Date(date);
    const diffTime = Math.abs(now - lastSeen);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) {
        return 'En línea';
    } else if (diffMinutes < 60) {
        return `Hace ${diffMinutes} min`;
    } else if (diffHours < 24) {
        return `Hace ${diffHours}h`;
    } else if (diffDays === 1) {
        return 'Ayer';
    } else if (diffDays < 7) {
        return `Hace ${diffDays} días`;
    } else {
        return lastSeen.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short'
        });
    }
};

// Formato de última conexión con hora detallada
const formatLastSeenStyled = (date) => {
    if (!date) return 'Nunca visto';
    
    const now = new Date();
    const lastSeen = new Date(date);
    
    // Obtener fechas sin tiempo para comparación de días
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastSeenDate = new Date(lastSeen.getFullYear(), lastSeen.getMonth(), lastSeen.getDate());
    const diffTime = nowDate - lastSeenDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Obtener configuración de 12h/24h del navegador
    const is24Hour = !new Intl.DateTimeFormat('es-ES', { hour: 'numeric' })
        .formatToParts(new Date()).find(part => part.type === 'dayPeriod');
    
    const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: !is24Hour
    };
    
    const timeString = lastSeen.toLocaleTimeString('es-ES', timeOptions);
    
    if (diffDays === 0) {
        // Si fue hoy - solo mostrar hora
        return `últ. vez hoy a las ${timeString}`;
    } else if (diffDays === 1) {
        // Si fue ayer - mostrar "ayer" + hora
        return `últ. vez ayer a las ${timeString}`;
    } else if (diffDays < 7) {
        // Si fue esta semana - mostrar día de la semana + hora
        const dayName = lastSeen.toLocaleDateString('es-ES', { weekday: 'long' });
        return `últ. vez el ${dayName} a las ${timeString}`;
    } else {
        // Si fue hace más de una semana - solo fecha (sin hora)
        const dateString = lastSeen.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: lastSeen.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
        return `últ. vez el ${dateString}`;
    }
};

const formatTimeAgo = (date) => {
    if (!date) return 'Nunca';
    
    const now = new Date();
    const past = new Date(date);
    const diffTime = Math.abs(now - past);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) {
        return 'ahora';
    } else if (diffMinutes < 60) {
        return `hace ${diffMinutes} min`;
    } else if (diffHours < 24) {
        return `hace ${diffHours} h`;
    } else if (diffDays === 1) {
        return 'ayer';
    } else if (diffDays < 7) {
        return `hace ${diffDays} d`;
    } else {
        return past.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short'
        });
    }
};

const formatRelativeTime = (date) => {
    if (!date) return 'Nunca conectado';
    
    const now = new Date();
    const past = new Date(date);
    const diffTime = Math.abs(now - past);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 5) {
        return 'En línea';
    } else if (diffMinutes < 60) {
        return `Visto hace ${diffMinutes} min`;
    } else if (diffHours < 24) {
        return `Visto hace ${diffHours} h`;
    } else if (diffDays === 1) {
        return 'Visto ayer';
    } else if (diffDays < 7) {
        return `Visto hace ${diffDays} d`;
    } else {
        return `Visto el ${past.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short'
        })}`;
    }
};

// Text utilities
const truncateText = (text, maxLength = 50) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
};

const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

const unescapeHtml = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
};

// URL utilities
const isValidUrl = (string) => {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
};

const extractUrls = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
};

// File utilities
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'fas fa-image';
    if (mimeType.startsWith('video/')) return 'fas fa-video';
    if (mimeType.startsWith('audio/')) return 'fas fa-music';
    if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
    if (mimeType.includes('word')) return 'fas fa-file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fas fa-file-excel';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fas fa-file-powerpoint';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return 'fas fa-file-archive';
    return 'fas fa-file';
};

// Validation utilities
const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

const validateUsername = (username) => {
    const regex = /^[a-zA-Z0-9_]{3,30}$/;
    return regex.test(username);
};

const validatePassword = (password) => {
    const checks = {
        length: password.length >= 6,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const score = Object.values(checks).filter(Boolean).length;
    
    return {
        isValid: checks.length,
        score,
        strength: score < 2 ? 'weak' : score < 4 ? 'fair' : score < 5 ? 'good' : 'strong',
        checks
    };
};

// Storage utilities
const Storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    },
    
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Error removing from localStorage:', error);
        }
    },
    
    clear() {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Error clearing localStorage:', error);
        }
    },
    
    // Fix inconsistent token storage
    fixTokenInconsistency() {
        try {
            // Check if there are different tokens stored
            const authToken = this.get('authToken');
            const token = localStorage.getItem('token');
            
            console.log('Token check:', { authToken, token });
            
            // If there's a mismatch, clear everything and force re-login
            if (token && authToken && token !== JSON.stringify(authToken).replace(/"/g, '')) {
                console.warn('Token inconsistency detected, clearing all tokens');
                localStorage.removeItem('token');
                this.remove('authToken');
                this.remove('currentUser');
                return true; // Indicates cleanup was needed
            }
            
            // If only old token exists, remove it
            if (token && !authToken) {
                console.warn('Old token format detected, cleaning up');
                localStorage.removeItem('token');
                return true;
            }
            
            return false; // No cleanup needed
        } catch (error) {
            console.error('Error fixing token inconsistency:', error);
            return false;
        }
    }
};

// Animation utilities
const animateElement = (element, animation, duration = 300) => {
    return new Promise((resolve) => {
        element.style.animation = `${animation} ${duration}ms ease-in-out`;
        element.addEventListener('animationend', () => {
            element.style.animation = '';
            resolve();
        }, { once: true });
    });
};

// Debounce utility
const debounce = (func, wait, immediate = false) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
};

// Throttle utility
const throttle = (func, limit) => {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// Color utilities
const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 60%)`;
};

const getInitials = (name) => {
    return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

// Notification utilities
const Alerts = {
    queue: [],
    activeNotifications: new Set(),
    lastNotificationTime: 0,
    minInterval: 300, // Minimum time between alerts (ms)
    maxVisible: 2, // Maximum alerts visible at once
    throttleMap: new Map(), // Track throttled alert types
    messageHistory: new Map(), // Track recent identical messages
    
    show(message, type = 'info', duration = null) {
        const now = Date.now();
        
        // Set default durations based on type and message content
        if (duration === null) {
            duration = this.getDefaultDuration(type, message);
        }
        
        // Create unique key for this notification type and message
        const notificationKey = `${type}:${message}`;
        
        // Enhanced throttling - check message history
        const lastMessageTime = this.messageHistory.get(notificationKey);
        const throttleTime = this.getThrottleTime(type);
        
        if (lastMessageTime && (now - lastMessageTime) < throttleTime) {
            // Update existing notification instead of creating duplicate
            const existingNotification = this.findExistingNotification(message, type);
            if (existingNotification) {
                this.refreshNotification(existingNotification, duration);
                this.messageHistory.set(notificationKey, now);
                return existingNotification;
            }
            return null;
        }
        
        // Check for duplicate notifications more thoroughly
        const existingNotification = this.findExistingNotification(message, type);
        if (existingNotification) {
            this.refreshNotification(existingNotification, duration);
            this.messageHistory.set(notificationKey, now);
            return existingNotification;
        }
        
        // Enforce global minimum interval between different notifications (reduced to show more notifications)
        if (now - this.lastNotificationTime < (this.minInterval / 2)) {
            const priority = this.getNotificationPriority(type);
            this.addToQueue({ message, type, duration, timestamp: now, priority });
            return null;
        }
        
        // Remove oldest notification if we've reached the limit
        if (this.activeNotifications.size >= this.maxVisible) {
            const oldest = Array.from(this.activeNotifications)[0];
            this.remove(oldest);
        }
        
        const container = $('#alerts-container');
        if (!container) return null;
        
        const alert = createElement('div', {
            className: `alert ${type}`,
            innerHTML: `
                <div class="alert-icon">
                    <i class="${this.getIcon(type)}"></i>
                </div>
                <div class="alert-content">
                    <p>${message}</p>
                </div>
                <button class="alert-close">
                    <i class="fas fa-times"></i>
                </button>
            `
        });
        
        container.appendChild(alert);
        this.activeNotifications.add(alert);
        this.lastNotificationTime = now;
        this.messageHistory.set(notificationKey, now);
        
        // Initial state: positioned off-screen to the right
        alert.style.opacity = '0';
        alert.style.transform = 'translateX(100%) scale(0.85)';
        
        // Trigger entrance animation with a slight delay for better visibility
        requestAnimationFrame(() => {
            setTimeout(() => {
                alert.classList.add('show');
                alert.style.opacity = '';
                alert.style.transform = '';
            }, 50); // Small delay to ensure proper rendering
        });
        
        // Auto remove with longer duration
        if (duration > 0) {
            const removeTimer = setTimeout(() => {
                this.remove(alert);
            }, duration);
            
            // Store timer to allow cancellation on manual close
            alert.dataset.removeTimer = removeTimer;
        }
        
        // Manual remove
        alert.querySelector('.alert-close').addEventListener('click', () => {
            if (alert.dataset.removeTimer) {
                clearTimeout(alert.dataset.removeTimer);
            }
            this.remove(alert);
        });
        
        // Pause auto-remove on hover
        alert.addEventListener('mouseenter', () => {
            if (alert.dataset.removeTimer) {
                clearTimeout(alert.dataset.removeTimer);
                alert.dataset.removeTimer = null;
            }
        });
        
        // Resume auto-remove on mouse leave
        alert.addEventListener('mouseleave', () => {
            if (!alert.dataset.removeTimer && duration > 0) {
                const remainingTime = Math.max(2000, duration * 0.4); // Al menos 2 segundos o 40% del tiempo original
                const removeTimer = setTimeout(() => {
                    this.remove(alert);
                }, remainingTime);
                alert.dataset.removeTimer = removeTimer;
            }
        });
        
        return alert;
    },
    
    getDefaultDuration(type, message = '') {
        // Validar mensaje
        if (!message || typeof message !== 'string') {
            return 4000; // Fallback de 4 segundos
        }
        
        // Limpiar mensaje y calcular métricas
        const cleanMessage = message.trim();
        const messageLength = cleanMessage.length;
        const wordsCount = cleanMessage.split(/\s+/).filter(word => word.length > 0).length;
        
        // Casos especiales
        if (messageLength === 0) return 3000;
        if (messageLength <= 15) return 3000; // Mensajes muy cortos
        if (wordsCount <= 2) return 3000; // Máximo 2 palabras
        
        // Fórmula de tiempo de lectura optimizada
        // Velocidad promedio: 250 palabras por minuto = ~4.2 palabras por segundo
        // Agregamos tiempo base para procesar el contexto visual
        const baseTime = 2500; // Tiempo base para ver la notificación
        const readingTime = (wordsCount / 4.2) * 1000; // Tiempo de lectura
        const totalTime = baseTime + readingTime;
        
        // Ajustes por tipo de notificación
        const typeMultipliers = {
            'success': 0.9,   // Menos tiempo - mensaje positivo, se lee rápido
            'info': 1.0,      // Tiempo base - información neutra
            'warning': 1.3,   // Más tiempo - requiere atención
            'error': 1.5      // Máximo tiempo - crítico, debe ser leído completamente
        };
        
        const multiplier = typeMultipliers[type] || 1.0;
        let finalDuration = Math.round(totalTime * multiplier);
        
        // Límites razonables y ajustes finales
        finalDuration = Math.max(3000, Math.min(7000, finalDuration));
        
        // Ajuste para mensajes largos: añadir tiempo extra
        if (wordsCount > 15) {
            finalDuration += 1000; // 1 segundo extra para mensajes largos
        }
        
        return finalDuration;
    },
    
    getThrottleTime(type) {
        const throttleTimes = {
            'success': 1000,  // Increased to reduce duplicate notifications
            'info': 1500,
            'warning': 2000,
            'error': 2500     // Longer throttling for errors
        };
        return throttleTimes[type] || 1500;
    },
    
    findExistingNotification(message, type) {
        return Array.from(this.activeNotifications)
            .find(n => {
                const content = n.querySelector('.notification-content p');
                return content && 
                       content.textContent.trim() === message.trim() && 
                       n.classList.contains(type);
            });
    },
    
    refreshNotification(notification, duration) {
        // Clear existing timer
        if (notification.dataset.removeTimer) {
            clearTimeout(notification.dataset.removeTimer);
        }
        
        // Add refresh animation
        notification.classList.add('notification-refreshed');
        setTimeout(() => {
            notification.classList.remove('notification-refreshed');
        }, 300);
        
        // Set new auto-remove timer
        if (duration > 0) {
            const removeTimer = setTimeout(() => {
                this.remove(notification);
            }, duration);
            notification.dataset.removeTimer = removeTimer;
        }
    },
    
    getNotificationPriority(type) {
        const priorities = {
            'error': 1,
            'warning': 2,
            'success': 3,
            'info': 4
        };
        return priorities[type] || 5;
    },
    
    addToQueue(notification) {
        // Insert with priority (lower number = higher priority)
        const insertIndex = this.queue.findIndex(queued => 
            queued.priority > notification.priority
        );
        
        if (insertIndex === -1) {
            this.queue.push(notification);
        } else {
            this.queue.splice(insertIndex, 0, notification);
        }
        
        this.processQueue();
    },
    
    processQueue() {
        if (this.queue.length === 0 || this.activeNotifications.size >= this.maxVisible) {
            return;
        }
        
        const now = Date.now();
        if (now - this.lastNotificationTime < this.minInterval) {
            // Schedule next processing attempt with better delay for visibility
            const delay = Math.max(200, this.minInterval - (now - this.lastNotificationTime));
            setTimeout(() => this.processQueue(), delay);
            return;
        }
        
        // Process highest priority notification
        const next = this.queue.shift();
        this.show(next.message, next.type, next.duration);
    },
    
    updateNotification(notification, newMessage) {
        const contentElement = notification.querySelector('.notification-content p');
        if (contentElement) {
            contentElement.textContent = newMessage;
            
            // Reset timer if it exists
            if (notification.dataset.removeTimer) {
                clearTimeout(notification.dataset.removeTimer);
                const removeTimer = setTimeout(() => {
                    this.remove(notification);
                }, 4000);
                notification.dataset.removeTimer = removeTimer;
            }
            
            // Add update animation
            notification.classList.add('notification-updated');
            setTimeout(() => {
                notification.classList.remove('notification-updated');
            }, 300);
        }
    },
    
    remove(alert) {
        if (alert && alert.parentNode) {
            // Remove from active set
            this.activeNotifications.delete(alert);
            
            // Clear any existing timers
            if (alert.dataset.removeTimer) {
                clearTimeout(alert.dataset.removeTimer);
            }
            
            // Apply hide animation that slides to the left
            alert.classList.remove('alert-visible', 'alert-entering');
            alert.classList.add('hide');
            
            // Use CSS transition instead of animation
            alert.style.animation = 'alertSlideOut 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards';
            
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
                
                // Process queue after removal
                if (this.queue.length > 0 && this.activeNotifications.size < this.maxVisible) {
                    this.processQueue();
                }
            }, 400); // Match animation duration
        }
    },
    
    // Clear all alerts
    clear() {
        this.queue = [];
        this.messageHistory.clear(); // Clear message history
        this.activeNotifications.forEach(alert => {
            if (alert.dataset.removeTimer) {
                clearTimeout(alert.dataset.removeTimer);
            }
            alert.remove();
        });
        this.activeNotifications.clear();
    },
    
    // Clear alerts of specific type
    clearByType(type) {
        Array.from(this.activeNotifications)
            .filter(alert => alert.classList.contains(type))
            .forEach(alert => this.remove(alert));
    },
    
    // Get current alerts count
    getCount() {
        return this.activeNotifications.size + this.queue.length;
    },
    
    getIcon(type) {
        switch (type) {
            case 'success': return 'fas fa-check-circle';
            case 'error': return 'fas fa-exclamation-circle';
            case 'warning': return 'fas fa-exclamation-triangle';
            default: return 'fas fa-info-circle';
        }
    },
    
    success(message, duration = null) {
        // Si no se especifica duración, usar cálculo inteligente
        if (duration === null) {
            duration = this.getDefaultDuration('success', message);
        }
        return this.show(message, 'success', duration);
    },
    
    error(message, duration = null) {
        // Si no se especifica duración, usar cálculo inteligente
        if (duration === null) {
            duration = this.getDefaultDuration('error', message);
        }
        return this.show(message, 'error', duration);
    },
    
    warning(message, duration = null) {
        // Si no se especifica duración, usar cálculo inteligente
        if (duration === null) {
            duration = this.getDefaultDuration('warning', message);
        }
        return this.show(message, 'warning', duration);
    },
    
    info(message, duration = null) {
        // Si no se especifica duración, usar cálculo inteligente
        if (duration === null) {
            duration = this.getDefaultDuration('info', message);
        }
        return this.show(message, 'info', duration);
    }
};

// Theme utilities
const Theme = {
    get current() {
        return Storage.get('theme', 'light');
    },
    
    set(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        Storage.set('theme', theme);
    },
    
    toggle() {
        const current = this.current;
        this.set(current === 'light' ? 'dark' : 'light');
    },
    
    init() {
        const saved = this.current;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (saved === 'auto') {
            this.set(prefersDark ? 'dark' : 'light');
        } else {
            this.set(saved);
        }
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (this.current === 'auto') {
                this.set(e.matches ? 'dark' : 'light');
            }
        });
    }
};

// Copy to clipboard
const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        Notifications.success('Copiado al portapapeles');
        return true;
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        
        // Fallback for older browsers
        const textarea = createElement('textarea', {
            value: text,
            style: 'position: fixed; opacity: 0; pointer-events: none;'
        });
        
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            Notifications.success('Copiado al portapapeles');
            return true;
        } catch (fallbackError) {
            console.error('Fallback copy failed:', fallbackError);
            Notifications.error('Error al copiar al portapapeles');
            return false;
        } finally {
            document.body.removeChild(textarea);
        }
    }
};

// Sound utilities
const Sound = {
    context: null,
    enabled: Storage.get('soundEnabled', true),
    
    init() {
        if (!this.context && this.enabled) {
            try {
                this.context = new (window.AudioContext || window.webkitAudioContext)();
            } catch (error) {
                console.warn('Web Audio API not supported');
            }
        }
    },
    
    beep(frequency = 800, duration = 200, volume = 0.1) {
        if (!this.enabled || !this.context) return;
        
        try {
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.context.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, this.context.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume, this.context.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration / 1000);
            
            oscillator.start(this.context.currentTime);
            oscillator.stop(this.context.currentTime + duration / 1000);
        } catch (error) {
            console.warn('Error playing sound:', error);
        }
    },
    
    messageReceived() {
        this.beep(600, 150);
    },
    
    messageSent() {
        this.beep(800, 100);
    },
    
    notification() {
        this.beep(1000, 200);
    },
    
    error() {
        this.beep(400, 300);
    },
    
    toggle() {
        this.enabled = !this.enabled;
        Storage.set('soundEnabled', this.enabled);
        
        if (this.enabled) {
            this.init();
            this.beep(); // Test sound
        }
    }
};

// Event Bus for centralized event handling
class EventBus {
    constructor() {
        this.events = new Map();
        this.maxListeners = 100;
        this.debugMode = false;
    }

    // Register event listener
    on(eventType, callback, options = {}) {
        if (!this.events.has(eventType)) {
            this.events.set(eventType, new Set());
        }

        const listeners = this.events.get(eventType);
        
        // Check max listeners limit
        if (listeners.size >= this.maxListeners) {
            console.warn(`EventBus: Maximum listeners (${this.maxListeners}) reached for event '${eventType}'`);
            return false;
        }

        const listener = {
            callback,
            once: options.once || false,
            priority: options.priority || 0,
            id: options.id || Math.random().toString(36).substr(2, 9)
        };

        listeners.add(listener);

        if (this.debugMode) {
            console.log(`EventBus: Registered listener for '${eventType}' (ID: ${listener.id})`);
        }

        return listener.id;
    }

    // Register one-time event listener
    once(eventType, callback, options = {}) {
        return this.on(eventType, callback, { ...options, once: true });
    }

    // Remove event listener
    off(eventType, listenerIdOrCallback) {
        if (!this.events.has(eventType)) {
            return false;
        }

        const listeners = this.events.get(eventType);
        
        for (const listener of listeners) {
            if (listener.id === listenerIdOrCallback || listener.callback === listenerIdOrCallback) {
                listeners.delete(listener);
                
                if (this.debugMode) {
                    console.log(`EventBus: Removed listener for '${eventType}' (ID: ${listener.id})`);
                }
                
                return true;
            }
        }

        return false;
    }

    // Emit event to all listeners
    emit(eventType, data = null) {
        if (!this.events.has(eventType)) {
            if (this.debugMode) {
                console.log(`EventBus: No listeners for event '${eventType}'`);
            }
            return 0;
        }

        const listeners = Array.from(this.events.get(eventType))
            .sort((a, b) => b.priority - a.priority); // Higher priority first
        
        let handled = 0;
        const toRemove = [];

        for (const listener of listeners) {
            try {
                listener.callback(data, eventType);
                handled++;
                
                if (listener.once) {
                    toRemove.push(listener);
                }
            } catch (error) {
                console.error(`EventBus: Error in listener for '${eventType}':`, error);
            }
        }

        // Remove one-time listeners
        if (toRemove.length > 0) {
            const eventListeners = this.events.get(eventType);
            toRemove.forEach(listener => eventListeners.delete(listener));
        }

        if (this.debugMode && handled > 0) {
            console.log(`EventBus: Emitted '${eventType}' to ${handled} listeners`);
        }

        return handled;
    }

    // Get all listeners for an event type
    getListeners(eventType) {
        return this.events.get(eventType) || new Set();
    }

    // Remove all listeners for an event type
    removeAllListeners(eventType) {
        if (eventType) {
            return this.events.delete(eventType);
        } else {
            // Remove all listeners
            this.events.clear();
            return true;
        }
    }

    // Get event statistics
    getStats() {
        const stats = {
            totalEventTypes: this.events.size,
            totalListeners: 0,
            eventTypes: {}
        };

        for (const [eventType, listeners] of this.events) {
            const listenerCount = listeners.size;
            stats.totalListeners += listenerCount;
            stats.eventTypes[eventType] = listenerCount;
        }

        return stats;
    }

    // Enable/disable debug mode
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`EventBus: Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Create global EventBus instance
const eventBusInstance = new EventBus();

// Enhanced Notifications with event-driven alerts
const EnhancedAlerts = {
    ...Alerts,
    
    // Override show method to emit events
    show(message, type = 'info', duration = null, eventData = null) {
        // Emit before-show event
        eventBusInstance.emit('alert:before-show', { message, type, duration, eventData });
        
        const alert = Alerts.show.call(this, message, type, duration);
        
        if (alert) {
            // Emit after-show event
            eventBusInstance.emit('alert:shown', { 
                alert, 
                message, 
                type, 
                duration, 
                eventData 
            });
        }
        
        return alert;
    },

    // Event-driven notification methods
    success(message, duration = null, eventData = null) {
        eventBusInstance.emit('notification:success', { message, duration, eventData });
        return this.show(message, 'success', duration, eventData);
    },

    error(message, duration = null, eventData = null) {
        eventBusInstance.emit('notification:error', { message, duration, eventData });
        return this.show(message, 'error', duration, eventData);
    },

    warning(message, duration = null, eventData = null) {
        eventBusInstance.emit('notification:warning', { message, duration, eventData });
        return this.show(message, 'warning', duration, eventData);
    },

    info(message, duration = null, eventData = null) {
        eventBusInstance.emit('notification:info', { message, duration, eventData });
        return this.show(message, 'info', duration, eventData);
    }
};

// Custom Confirmation Modal
const ConfirmationModal = {
    modal: null,
    titleElement: null,
    messageElement: null,
    detailsElement: null,
    confirmButton: null,
    cancelButton: null,
    overlay: null,
    currentResolve: null,
    currentReject: null,

    init() {
        if (this.modal) return; // Already initialized

        this.modal = document.getElementById('confirmation-modal');
        this.titleElement = document.getElementById('confirmation-title');
        this.messageElement = document.getElementById('confirmation-message');
        this.detailsElement = document.getElementById('confirmation-details');
        this.confirmButton = document.getElementById('confirmation-confirm');
        this.cancelButton = document.getElementById('confirmation-cancel');
        this.overlay = this.modal?.querySelector('.modal-overlay');

        if (!this.modal) {
            console.warn('Confirmation modal not found in DOM');
            return;
        }

        this.setupEventListeners();
    },

    setupEventListeners() {
        // Confirm button
        this.confirmButton.addEventListener('click', () => {
            this.hide();
            if (this.currentResolve) {
                this.currentResolve(true);
                this.currentResolve = null;
                this.currentReject = null;
            }
        });

        // Cancel button
        this.cancelButton.addEventListener('click', () => {
            this.hide();
            if (this.currentResolve) {
                this.currentResolve(false);
                this.currentResolve = null;
                this.currentReject = null;
            }
        });

        // Overlay click
        this.overlay.addEventListener('click', () => {
            this.hide();
            if (this.currentResolve) {
                this.currentResolve(false);
                this.currentResolve = null;
                this.currentReject = null;
            }
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible()) {
                this.hide();
                if (this.currentResolve) {
                    this.currentResolve(false);
                    this.currentResolve = null;
                    this.currentReject = null;
                }
            }
        });
    },

    show(options = {}) {
        this.init(); // Ensure initialized

        const {
            title = 'Confirmar acción',
            message = '¿Estás seguro de que quieres realizar esta acción?',
            details = null,
            confirmText = 'Confirmar',
            cancelText = 'Cancelar',
            confirmClass = 'btn-danger',
            icon = 'fas fa-exclamation-triangle'
        } = options;

        // Set content
        this.titleElement.textContent = title;
        this.messageElement.textContent = message;
        
        // Set details if provided
        if (details) {
            this.detailsElement.textContent = details;
            this.detailsElement.classList.remove('hidden');
        } else {
            this.detailsElement.classList.add('hidden');
        }

        // Set button texts and styles
        this.confirmButton.textContent = confirmText;
        this.cancelButton.textContent = cancelText;
        
        // Reset button classes and add new one
        this.confirmButton.className = `btn ${confirmClass}`;
        
        // Set icon
        const iconElement = this.modal.querySelector('.confirmation-icon i');
        if (iconElement) {
            iconElement.className = icon;
        }

        // Show modal
        this.modal.classList.remove('hidden');
        setTimeout(() => {
            this.modal.classList.add('show');
        }, 10);

        // Disable body scroll
        document.body.style.overflow = 'hidden';

        // Focus confirm button
        setTimeout(() => {
            this.confirmButton.focus();
        }, 100);

        return new Promise((resolve, reject) => {
            this.currentResolve = resolve;
            this.currentReject = reject;
        });
    },

    hide() {
        if (!this.modal) return;

        this.modal.classList.remove('show');
        setTimeout(() => {
            this.modal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    },

    isVisible() {
        return this.modal && !this.modal.classList.contains('hidden');
    },

    // Convenience methods for common confirmations
    async confirm(message, title = 'Confirmar') {
        return this.show({
            title,
            message,
            confirmText: 'Confirmar',
            cancelText: 'Cancelar',
            confirmClass: 'btn-primary'
        });
    },

    async danger(message, title = 'Acción peligrosa') {
        return this.show({
            title,
            message,
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            confirmClass: 'btn-danger',
            icon: 'fas fa-exclamation-triangle'
        });
    },

    async block(userName, title = 'Bloquear contacto') {
        return this.show({
            title,
            message: `¿Estás seguro de que quieres bloquear a ${userName}?`,
            details: 'Esto también eliminará el contacto de tu lista.',
            confirmText: 'Bloquear',
            cancelText: 'Cancelar',
            confirmClass: 'btn-warning',
            icon: 'fas fa-ban'
        });
    },

    async unblock(userName, title = 'Desbloquear contacto') {
        return this.show({
            title,
            message: `¿Estás seguro de que quieres desbloquear a ${userName}?`,
            confirmText: 'Desbloquear',
            cancelText: 'Cancelar',
            confirmClass: 'btn-success',
            icon: 'fas fa-unlock'
        });
    },

    async remove(userName, title = 'Eliminar contacto') {
        return this.show({
            title,
            message: `¿Estás seguro de que quieres eliminar a ${userName} de tus contactos?`,
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            confirmClass: 'btn-danger',
            icon: 'fas fa-user-minus'
        });
    },

    async deletePermanently(userName, title = 'Eliminar permanentemente') {
        return this.show({
            title,
            message: `¿Estás seguro de que quieres eliminar permanentemente a ${userName}?`,
            details: 'Esta acción no se puede deshacer.',
            confirmText: 'Eliminar permanentemente',
            cancelText: 'Cancelar',
            confirmClass: 'btn-danger',
            icon: 'fas fa-trash'
        });
    },

    // Advanced modals for chat actions
    async clearChatAdvanced(contactName) {
        return new Promise((resolve) => {
            const modal = Utils.createElement('div', {
                className: 'modal advanced-confirmation-modal',
                style: 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 99999; display: flex; align-items: center; justify-content: center;'
            });

            const modalContent = Utils.createElement('div', {
                className: 'modal-content',
                style: 'background: white; border-radius: 12px; padding: 24px; max-width: 400px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.3);'
            });

            modalContent.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <i class="fas fa-broom" style="font-size: 48px; color: #f59e0b; margin-bottom: 16px;"></i>
                    <h3 style="margin: 0 0 8px 0; color: #1f2937;">Vaciar chat</h3>
                    <p style="margin: 0; color: #6b7280;">¿Cómo quieres vaciar este chat con ${contactName}?</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button class="btn-option" data-action="myself" style="padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; background: white; cursor: pointer; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-user" style="color: #6b7280;"></i>
                        <div style="text-align: left;">
                            <div style="font-weight: 500; color: #1f2937;">Solo para mí</div>
                            <div style="font-size: 12px; color: #6b7280;">Los mensajes se eliminan solo de tu dispositivo</div>
                        </div>
                    </button>
                    <button class="btn-option" data-action="both" style="padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; background: white; cursor: pointer; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-users" style="color: #ef4444;"></i>
                        <div style="text-align: left;">
                            <div style="font-weight: 500; color: #1f2937;">Para ambos</div>
                            <div style="font-size: 12px; color: #6b7280;">Los mensajes se eliminan para ambos usuarios</div>
                        </div>
                    </button>
                </div>
                <div style="margin-top: 20px; text-align: center;">
                    <button class="btn-cancel" style="padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 6px; background: white; color: #6b7280; cursor: pointer;">Cancelar</button>
                </div>
            `;

            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            // Add hover effects
            modalContent.querySelectorAll('.btn-option').forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    btn.style.borderColor = '#3b82f6';
                    btn.style.background = '#f8fafc';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.borderColor = '#d1d5db';
                    btn.style.background = 'white';
                });
                btn.addEventListener('click', () => {
                    const action = btn.dataset.action;
                    document.body.removeChild(modal);
                    resolve(action);
                });
            });

            modalContent.querySelector('.btn-cancel').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(null);
            });

            // Close on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                    resolve(null);
                }
            });
        });
    },

    async deleteMessageAdvanced(canDeleteForOthers = true) {
        return new Promise((resolve) => {
            const modal = Utils.createElement('div', {
                className: 'modal advanced-confirmation-modal',
                style: 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 99999; display: flex; align-items: center; justify-content: center;'
            });

            const modalContent = Utils.createElement('div', {
                className: 'modal-content',
                style: 'background: white; border-radius: 12px; padding: 24px; max-width: 400px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.3);'
            });

            let optionsHtml = `
                <button class="btn-option" data-action="myself" style="padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; background: white; cursor: pointer; display: flex; align-items: center; gap: 12px;">
                    <i class="fas fa-eye-slash" style="color: #6b7280;"></i>
                    <div style="text-align: left;">
                        <div style="font-weight: 500; color: #1f2937;">Eliminar solo para mí</div>
                        <div style="font-size: 12px; color: #6b7280;">El mensaje se oculta solo para ti</div>
                    </div>
                </button>
            `;

            if (canDeleteForOthers) {
                optionsHtml += `
                    <button class="btn-option" data-action="everyone" style="padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; background: white; cursor: pointer; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-trash" style="color: #ef4444;"></i>
                        <div style="text-align: left;">
                            <div style="font-weight: 500; color: #1f2937;">Eliminar para todos</div>
                            <div style="font-size: 12px; color: #6b7280;">El mensaje se elimina para ambos usuarios</div>
                        </div>
                    </button>
                `;
            }

            modalContent.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <i class="fas fa-trash" style="font-size: 48px; color: #ef4444; margin-bottom: 16px;"></i>
                    <h3 style="margin: 0 0 8px 0; color: #1f2937;">Eliminar mensaje</h3>
                    <p style="margin: 0; color: #6b7280;">¿Cómo quieres eliminar este mensaje?</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${optionsHtml}
                </div>
                <div style="margin-top: 20px; text-align: center;">
                    <button class="btn-cancel" style="padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 6px; background: white; color: #6b7280; cursor: pointer;">Cancelar</button>
                </div>
            `;

            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            // Add hover effects
            modalContent.querySelectorAll('.btn-option').forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    btn.style.borderColor = '#3b82f6';
                    btn.style.background = '#f8fafc';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.borderColor = '#d1d5db';
                    btn.style.background = 'white';
                });
                btn.addEventListener('click', () => {
                    const action = btn.dataset.action;
                    document.body.removeChild(modal);
                    resolve(action);
                });
            });

            modalContent.querySelector('.btn-cancel').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(null);
            });

            // Close on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                    resolve(null);
                }
            });
        });
    },

    async deleteConversation(contactName, title = 'Eliminar conversación') {
        return this.show({
            title,
            message: `¿Estás seguro de que quieres eliminar la conversación con ${contactName}?`,
            details: 'Esta acción eliminará toda la conversación permanentemente y no se puede deshacer.',
            confirmText: 'Eliminar conversación',
            cancelText: 'Cancelar',
            confirmClass: 'btn-danger',
            icon: 'fas fa-trash-alt'
        });
    }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ConfirmationModal.init());
} else {
    ConfirmationModal.init();
}

// Export utilities for other modules
window.Utils = {
    $, $$, createElement,
    formatTime, formatDate, formatLastSeen, formatLastSeenStyled, formatTimeAgo, formatRelativeTime,
    truncateText, escapeHtml, unescapeHtml,
    isValidUrl, extractUrls,
    formatFileSize, getFileIcon,
    validateEmail, validateUsername, validatePassword,
    Storage,
    animateElement,
    debounce, throttle,
    stringToColor, getInitials,
    Alerts: EnhancedAlerts,
    Notifications: EnhancedAlerts, // Alias para compatibilidad
    Theme,
    copyToClipboard,
    Sound,
    EventBus: eventBusInstance,
    ConfirmationModal
};