/**
 * Advanced LRU (Least Recently Used) Memory Cache
 * Provides intelligent in-memory caching with automatic cleanup
 */

class LRUCache {
    constructor(maxSize = 100, maxAge = 30 * 60 * 1000) { // Default: 100 items, 30 minutes
        this.cache = new Map();
        this.maxSize = maxSize;
        this.maxAge = maxAge;
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
        };
    }

    /**
     * Get item from cache
     */
    get(key) {
        const item = this.cache.get(key);

        if (!item) {
            this.stats.misses++;
            return null;
        }

        // Check if item is stale
        if (Date.now() - item.timestamp > this.maxAge) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }

        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, { ...item, timestamp: Date.now() });
        this.stats.hits++;

        return item.value;
    }

    /**
     * Set item in cache
     */
    set(key, value) {
        // If key exists, delete it first to update position
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // Evict oldest item if at capacity
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
            this.stats.evictions++;
        }

        this.cache.set(key, {
            value,
            timestamp: Date.now(),
        });
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
        this.stats = { hits: 0, misses: 0, evictions: 0 };
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;

        return {
            ...this.stats,
            size: this.cache.size,
            hitRate: `${hitRate}%`,
        };
    }

    /**
     * Clean up stale entries
     */
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > this.maxAge) {
                this.cache.delete(key);
            }
        }
    }
}

// Export singleton instances for different cache types
export const imageCache = new LRUCache(200, 60 * 60 * 1000); // 200 images, 1 hour
export const apiCache = new LRUCache(100, 30 * 60 * 1000); // 100 API responses, 30 minutes
export const metadataCache = new LRUCache(50, 24 * 60 * 60 * 1000); // 50 metadata, 24 hours

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
