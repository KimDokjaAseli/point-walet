/**
 * WalletPoint Service Worker
 * Handles push notifications and caching
 */

const CACHE_NAME = 'walletpoint-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/app.css',
    '/js/config.js',
    '/js/utils.js',
    '/js/api.js',
    '/js/auth.js',
    '/js/components.js',
    '/js/router.js',
    '/js/app.js'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests and external requests
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((response) => {
                // Don't cache API responses
                if (event.request.url.includes('/api/')) {
                    return response;
                }
                // Cache other responses
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return response;
            });
        })
    );
});

// Push event - show notification
self.addEventListener('push', (event) => {
    let data = { title: 'WalletPoint', body: 'Ada notifikasi baru' };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: '/img/icon-192.png',
        badge: '/img/badge-72.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'wp-notification',
        renotify: true,
        data: data.data || {}
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const data = event.notification.data || {};
    let url = '/';

    // Navigate based on notification type
    switch (data.type) {
        case 'transfer':
            url = '/#/transfer';
            break;
        case 'quiz':
            url = '/#/missions';
            break;
        case 'order':
            url = '/#/marketplace';
            break;
        default:
            url = '/#/notifications';
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                // Focus existing window if available
                for (const client of windowClients) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(url);
                        return client.focus();
                    }
                }
                // Open new window if no existing window
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-pending-actions') {
        event.waitUntil(syncPendingActions());
    }
});

async function syncPendingActions() {
    // In a real app, this would sync any pending offline actions
    console.log('Syncing pending actions...');
}
