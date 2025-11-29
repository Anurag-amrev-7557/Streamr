/**
 * Service Worker - Emergency Cache Clear
 * This SW is designed to break the update loop by deleting all caches and forcing network requests.
 */

const CACHE_VERSION = 'streamr-emergency-v' + Date.now();

// Install: Skip waiting to activate immediately
self.addEventListener('install', (event) => { // eslint-disable-line no-unused-vars
    console.log('[SW] Installing new version...');
    self.skipWaiting();
});

// Activate: Delete ALL caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating and clearing caches...');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        console.log('[SW] Deleting cache:', cacheName);
                        return caches.delete(cacheName);
                    })
                );
            })
            .then(() => {
                console.log('[SW] All caches cleared.');
                return self.clients.claim();
            })
    );
});

// Fetch: Network only for everything
self.addEventListener('fetch', (event) => {
    // Pass through to network
    event.respondWith(fetch(event.request));
});
