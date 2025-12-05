/**
 * Advanced LRU (Least Recently Used) Memory Cache
 * Provides intelligent in-memory caching with automatic cleanup
 */

class LRUCache {
    constructor(maxSize = 100, maxAge = 30 * 60 * 1000, maxMemory = 50 * 1024 * 1024) { // Default: 100 items, 30 mins, 50MB
        this.cache = new Map();
        this.maxSize = maxSize;
        this.maxAge = maxAge;
        this.maxMemory = maxMemory;
        this.currentMemory = 0;
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            staleHits: 0,
        };
    }

    /**
     * Estimate size of value in bytes
     */
    estimateSize(value) {
        if (!value) return 0;
        if (typeof value === 'string') return value.length * 2;
        if (typeof value === 'number') return 8;
        if (typeof value === 'boolean') return 4;
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value).length * 2;
            } catch (e) {
                return 0;
            }
        }
        return 0;
    }

    /**
     * Get item from cache with stale-while-revalidate support
     * @param {string} key
     * @param {Function} revalidateFn - Optional function to fetch fresh data if stale
     */
    async get(key, revalidateFn = null) {
        const item = this.cache.get(key);

        if (!item) {
            this.stats.misses++;
            if (revalidateFn) {
                const freshData = await revalidateFn();
                this.set(key, freshData);
                return freshData;
            }
            return null;
        }

        const isStale = Date.now() - item.timestamp > this.maxAge;

        if (isStale) {
            if (revalidateFn) {
                // Return stale data immediately, update in background
                this.stats.staleHits++;
                // Trigger revalidation without awaiting
                revalidateFn().then(freshData => {
                    this.set(key, freshData);
                }).catch(err => console.error(`Cache revalidation failed for ${key}:`, err));

                return item.value;
            } else {
                // No revalidation function, treat as expired
                this.delete(key);
                this.stats.misses++;
                return null;
            }
        }

        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, item);
        this.stats.hits++;

        return item.value;
    }

    /**
     * Set item in cache
     */
    set(key, value) {
        const size = this.estimateSize(value);

        // If key exists, remove old size
        if (this.cache.has(key)) {
            const oldItem = this.cache.get(key);
            this.currentMemory -= oldItem.size;
            this.cache.delete(key);
        }

        // Check memory limit
        while (this.currentMemory + size > this.maxMemory && this.cache.size > 0) {
            this.evictOldest();
        }

        // Check count limit
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }

        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            size
        });
        this.currentMemory += size;
    }

    /**
     * Evict oldest item
     */
    evictOldest() {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
            this.delete(firstKey);
            this.stats.evictions++;
        }
    }

    /**
     * Delete item
     */
    delete(key) {
        const item = this.cache.get(key);
        if (item) {
            this.currentMemory -= item.size;
            this.cache.delete(key);
        }
    }

    /**
     * Check if key exists in cache
     */
    has(key) {
        return this.cache.has(key) &&
            (Date.now() - this.cache.get(key).timestamp < this.maxAge);
    }

    /**
     * Clear entire cache
     */
    clear() {
        this.cache.clear();
        this.currentMemory = 0;
        this.stats = { hits: 0, misses: 0, evictions: 0, staleHits: 0 };
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses + this.stats.staleHits;
        const hitRate = total > 0 ? ((this.stats.hits + this.stats.staleHits) / total * 100).toFixed(2) : 0;

        return {
            ...this.stats,
            size: this.cache.size,
            memory: `${(this.currentMemory / 1024 / 1024).toFixed(2)} MB`,
            hitRate: `${hitRate}%`,
        };
    }

    /**
     * Clean up stale entries
     */
    cleanup() {
        const now = Date.now();
        // Use iterator to avoid creating array of all entries
        const iterator = this.cache.entries();
        let result = iterator.next();

        while (!result.done) {
            const [key, item] = result.value;
            if (now - item.timestamp > this.maxAge) {
                this.delete(key);
            }
            result = iterator.next();
        }
    }
}

// Export singleton instances for different cache types
export const imageCache = new LRUCache(200, 60 * 60 * 1000, 50 * 1024 * 1024); // 200 images, 1 hour, 50MB
export const apiCache = new LRUCache(100, 30 * 60 * 1000, 10 * 1024 * 1024); // 100 API responses, 30 minutes, 10MB
export const metadataCache = new LRUCache(50, 24 * 60 * 60 * 1000, 5 * 1024 * 1024); // 50 metadata, 24 hours, 5MB

// Auto-cleanup every 5 minutes
setInterval(() => {
    imageCache.cleanup();
    apiCache.cleanup();
    metadataCache.cleanup();
}, 5 * 60 * 1000);

/**
 * Get cache stats for debugging
 */
export const getCacheStats = () => ({
    image: imageCache.getStats(),
    api: apiCache.getStats(),
    metadata: metadataCache.getStats(),
});

export default LRUCache;
