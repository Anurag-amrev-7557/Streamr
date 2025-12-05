/**
 * IndexedDB Cache Manager
 * Provides persistent storage for large data like images and API responses
 */

const DB_NAME = 'StreamrCache';
const DB_VERSION = 1;
const STORES = {
    IMAGES: 'images',
    API_RESPONSES: 'api_responses',
    USER_PREFERENCES: 'user_preferences',
};

class IndexedDBCache {
    constructor() {
        this.db = null;
        this.initPromise = this.init();
    }

    /**
     * Initialize IndexedDB
     */
    async init() {
        if (!('indexedDB' in window)) {
            console.warn('IndexedDB not supported');
            return null;
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains(STORES.IMAGES)) {
                    const imageStore = db.createObjectStore(STORES.IMAGES, { keyPath: 'url' });
                    imageStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.API_RESPONSES)) {
                    const apiStore = db.createObjectStore(STORES.API_RESPONSES, { keyPath: 'url' });
                    apiStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.USER_PREFERENCES)) {
                    db.createObjectStore(STORES.USER_PREFERENCES, { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * Get item from store
     */
    async get(storeName, key) {
        await this.initPromise;
        if (!this.db) return null;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => {
                const result = request.result;

                // Check if expired (24 hours for images, 1 hour for API)
                if (result) {
                    const maxAge = storeName === STORES.IMAGES ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
                    if (Date.now() - result.timestamp > maxAge) {
                        this.delete(storeName, key);
                        resolve(null);
                        return;
                    }
                }

                resolve(result);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Set item in store
     */
    async set(storeName, data) {
        await this.initPromise;
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put({
                ...data,
                timestamp: Date.now(),
            });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get multiple items from store
     */
    async getMany(storeName, keys) {
        await this.initPromise;
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const results = [];
            let completed = 0;

            keys.forEach((key, index) => {
                const request = store.get(key);
                request.onsuccess = () => {
                    const result = request.result;
                    if (result) {
                        const maxAge = storeName === STORES.IMAGES ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
                        if (Date.now() - result.timestamp <= maxAge) {
                            results[index] = result;
                        } else {
                            // Expired
                            results[index] = null;
                            // We don't delete here to avoid transaction issues, cleanup will handle it
                        }
                    } else {
                        results[index] = null;
                    }
                    completed++;
                    if (completed === keys.length) {
                        resolve(results);
                    }
                };
                request.onerror = () => {
                    results[index] = null;
                    completed++;
                    if (completed === keys.length) {
                        resolve(results);
                    }
                };
            });
        });
    }

    /**
     * Set multiple items in store
     */
    async setMany(storeName, items) {
        await this.initPromise;
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);

            items.forEach(item => {
                store.put({
                    ...item,
                    timestamp: Date.now(),
                });
            });
        });
    }

    /**
     * Delete item from store
     */
    async delete(storeName, key) {
        await this.initPromise;
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear entire store
     */
    async clear(storeName) {
        await this.initPromise;
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clean up old entries
     */
    async cleanup() {
        await this.initPromise;
        if (!this.db) return;

        const stores = [STORES.IMAGES, STORES.API_RESPONSES];
        const now = Date.now();

        for (const storeName of stores) {
            const maxAge = storeName === STORES.IMAGES ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
            const expiryTime = now - maxAge;

            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const index = store.index('timestamp');

            // Use IDBKeyRange to find all expired items efficiently
            const range = IDBKeyRange.upperBound(expiryTime);
            const request = index.openCursor(range);

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };
        }
    }

    /**
     * Get storage usage estimate
     */
    async getStorageEstimate() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const usage = estimate.usage || 0;
            const quota = estimate.quota || 0;
            const percentUsed = quota > 0 ? (usage / quota * 100).toFixed(2) : 0;

            return {
                usage: (usage / 1024 / 1024).toFixed(2) + ' MB',
                quota: (quota / 1024 / 1024).toFixed(2) + ' MB',
                percentUsed: percentUsed + '%',
            };
        }
        return null;
    }
}

// Export singleton instance
export const indexedDBCache = new IndexedDBCache();

// Auto-cleanup every hour
setInterval(() => {
    indexedDBCache.cleanup();
}, 60 * 60 * 1000);

export { STORES };
export default IndexedDBCache;
