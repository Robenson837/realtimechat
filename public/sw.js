// Service Worker for VigiChat
const CACHE_NAME = 'vigichat-v1';
const urlsToCache = [
    '/',
    '/styles.css',
    '/js/app.js',
    '/js/ui.js',
    '/js/socket.js',
    '/js/auth.js',
    '/js/chat.js',
    '/js/utils.js',
    '/js/api.js',
    '/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Install event
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache opened');
                return cache.addAll(urlsToCache.map(url => {
                    return new Request(url, {
                        credentials: 'same-origin'
                    });
                }));
            })
            .catch((error) => {
                console.error('Cache failed:', error);
            })
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip socket.io requests
    if (event.request.url.includes('socket.io')) {
        return;
    }

    // Skip API requests (let them go to network) - VERY IMPORTANT!
    if (event.request.url.includes('/api/')) {
        console.log('SW: Skipping API request:', event.request.url);
        return;
    }
    
    // Skip external CDN requests that cause issues
    if (event.request.url.includes('cdnjs.cloudflare.com') || 
        event.request.url.includes('fonts.googleapis.com') ||
        event.request.url.includes('fontawesome') ||
        event.request.url.includes('googleapis')) {
        console.log('SW: Skipping external CDN request:', event.request.url);
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version if available
                if (response) {
                    return response;
                }

                // Otherwise, fetch from network
                return fetch(event.request).then((response) => {
                    // Don't cache non-successful responses or non-basic types
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Skip caching for chrome-extension and unsupported schemes
                    if (event.request.url.startsWith('chrome-extension://') || 
                        event.request.url.startsWith('moz-extension://') ||
                        event.request.url.startsWith('edge-extension://')) {
                        return response;
                    }

                    // Clone the response for caching
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            // Additional check before putting in cache
                            if (event.request.url.startsWith('http') && !event.request.url.includes('chrome-extension')) {
                                cache.put(event.request, responseToCache);
                            }
                        })
                        .catch(error => {
                            console.warn('Cache put failed:', error);
                        });

                    return response;
                })
                .catch(error => {
                    console.warn('Fetch failed:', error);
                    throw error;
                });
            })
            .catch(() => {
                // Return a custom offline page if available
                if (event.request.destination === 'document') {
                    return caches.match('/');
                }
            })
    );
});

// Handle background sync for messages
self.addEventListener('sync', (event) => {
    if (event.tag === 'send-messages') {
        event.waitUntil(sendPendingMessages());
    }
});

// Handle push notifications
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'New message received',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            url: '/'
        },
        actions: [
            {
                action: 'view',
                title: 'View Message',
                icon: '/icons/view-icon.png'
            },
            {
                action: 'dismiss',
                title: 'Dismiss',
                icon: '/icons/dismiss-icon.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('VigiChat', options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Function to send pending messages when back online
async function sendPendingMessages() {
    try {
        const cache = await caches.open('pending-messages');
        const requests = await cache.keys();
        
        for (const request of requests) {
            try {
                await fetch(request);
                await cache.delete(request);
            } catch (error) {
                console.error('Failed to send pending message:', error);
            }
        }
    } catch (error) {
        console.error('Error processing pending messages:', error);
    }
}