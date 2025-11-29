/**
 * Service Worker Registration and Management
 */

/**
 * Register service worker
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.warn('Service Workers not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
            scope: '/',
        });

        // Handle updates
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;

            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    if (confirm('New version available! Reload to update?')) {
                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                        window.location.reload();
                    }
                }
            });
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('[SW] Message from service worker:', event.data);
        });

        return registration;
    } catch (error) {
        console.error('[SW] Service Worker registration failed:', error);
        return null;
    }
}

/**
 * Unregister service worker
 * @returns {Promise<boolean>}
 */
export async function unregisterServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            await registration.unregister();
            console.log('[SW] Service Worker unregistered');
            return true;
        }
        return false;
    } catch (error) {
        console.error('[SW] Service Worker unregister failed:', error);
        return false;
    }
}

/**
 * Clear all caches managed by service worker
 * @returns {Promise<boolean>}
 */
export async function clearServiceWorkerCaches() {
    if (!('serviceWorker' in navigator)) {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.active) {
            registration.active.postMessage({ type: 'CLEAR_CACHE' });
            console.log('[SW] Cache clear request sent');
            return true;
        }
        return false;
    } catch (error) {
        console.error('[SW] Cache clear failed:', error);
        return false;
    }
}

/**
 * Get cache storage estimate
 * @returns {Promise<{usage: string, quota: string, percentUsed: string, usageBytes: number, quotaBytes: number}|null>}
 */
export async function getCacheStorageEstimate() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
            const estimate = await navigator.storage.estimate();
            const usage = estimate.usage || 0;
            const quota = estimate.quota || 0;
            const percentUsed = quota > 0 ? (usage / quota * 100).toFixed(2) : 0;

            return {
                usage: (usage / 1024 / 1024).toFixed(2) + ' MB',
                quota: (quota / 1024 / 1024).toFixed(2) + ' MB',
                percentUsed: percentUsed + '%',
                usageBytes: usage,
                quotaBytes: quota,
            };
        } catch (error) {
            console.error('[SW] Storage estimate failed:', error);
            return null;
        }
    }
    return null;
}

/**
 * Check if service worker is ready
 * @returns {boolean}
 */
export function isServiceWorkerReady() {
    return 'serviceWorker' in navigator && navigator.serviceWorker.controller;
}

/**
 * Force service worker update
 * @returns {Promise<boolean>}
 */
export async function updateServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            await registration.update();
            console.log('[SW] Update check completed');
            return true;
        }
        return false;
    } catch (error) {
        console.error('[SW] Update failed:', error);
        return false;
    }
}
