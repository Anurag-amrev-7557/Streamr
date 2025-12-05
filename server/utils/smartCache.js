import NodeCache from 'node-cache';

class SmartCache {
    constructor(ttlSeconds = 300) {
        this.cache = new NodeCache({ stdTTL: ttlSeconds, checkperiod: ttlSeconds * 0.2 });
    }

    /**
     * Get data from cache or fetch it if missing/stale.
     * Supports Stale-While-Revalidate (SWR) if backgroundRefresh is true (not fully implemented in this basic version, 
     * but structure allows for it).
     * 
     * @param {string} key - Cache key
     * @param {Function} fetchFn - Async function to fetch data if cache miss
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<{data: any, fromCache: boolean}>}
     */
    async get(key, fetchFn, ttl) {
        const cached = this.cache.get(key);

        if (cached !== undefined) {
            return { data: cached, fromCache: true };
        }

        try {
            const data = await fetchFn();
            this.cache.set(key, data, ttl);
            return { data, fromCache: false };
        } catch (error) {
            console.error(`SmartCache fetch failed for key ${key}:`, error.message);
            throw error;
        }
    }

    set(key, value, ttl) {
        return this.cache.set(key, value, ttl);
    }

    del(key) {
        return this.cache.del(key);
    }

    flush() {
        return this.cache.flushAll();
    }
}

// Export a singleton instance
export default new SmartCache();
