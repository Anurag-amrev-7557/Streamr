// Advanced Cache Service with Intelligent Management
class AdvancedCacheService {
  constructor() {
    this.cache = new Map();
    this.metadata = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      memoryUsage: 0
    };
    this.maxSize = 1000; // Maximum number of cache entries
    this.maxMemory = 50 * 1024 * 1024; // 50MB max memory usage
    this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
    this.lastCleanup = Date.now();
    
    // Start cleanup interval
    this.startCleanupInterval();
    
    // Monitor memory usage
    this.monitorMemoryUsage();
  }

  // Enhanced cache key generation with namespace support
  generateKey(namespace, key, params = {}) {
    const paramString = Object.keys(params).length > 0 
      ? JSON.stringify(params) 
      : '';
    return `${namespace}:${key}:${paramString}`;
  }

  // Intelligent cache with TTL, priority, and compression
  set(key, value, options = {}) {
    const {
      ttl = 30 * 60 * 1000, // 30 minutes default
      priority = 'normal', // low, normal, high, critical
      compress = true,
      namespace = 'default',
      tags = [],
      maxAge = null
    } = options;

    const cacheKey = this.generateKey(namespace, key, options.params);
    
    // Compress data if enabled and data is large
    const dataToStore = compress && this.shouldCompress(value) 
      ? this.compressData(value) 
      : value;

    const entry = {
      value: dataToStore,
      compressed: compress && this.shouldCompress(value),
      timestamp: Date.now(),
      ttl,
      priority,
      namespace,
      tags,
      accessCount: 0,
      lastAccessed: Date.now(),
      size: this.calculateSize(dataToStore)
    };

    // Check if we need to evict entries
    if (this.cache.size >= this.maxSize) {
      this.evictEntries();
    }

    // Check memory usage
    if (this.stats.memoryUsage + entry.size > this.maxMemory) {
      this.evictByMemory();
    }

    this.cache.set(cacheKey, entry);
    this.metadata.set(cacheKey, {
      created: Date.now(),
      namespace,
      tags,
      priority
    });

    this.stats.sets++;
    this.stats.size = this.cache.size;
    this.updateMemoryUsage();

    return true;
  }

  // Enhanced get with automatic decompression and access tracking
  get(key, options = {}) {
    const { namespace = 'default', params = {} } = options;
    const cacheKey = this.generateKey(namespace, key, params);
    
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.delete(cacheKey);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    this.stats.hits++;
    
    // Decompress if necessary
    if (entry.compressed) {
      return this.decompressData(entry.value);
    }
    
    return entry.value;
  }

  // Advanced cache invalidation with tag-based and pattern matching
  invalidate(options = {}) {
    const { 
      namespace, 
      tags = [], 
      pattern, 
      priority,
      olderThan 
    } = options;

    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      let shouldDelete = false;

      // Check namespace
      if (namespace && entry.namespace !== namespace) {
        continue;
      }

      // Check tags
      if (tags.length > 0 && !tags.some(tag => entry.tags.includes(tag))) {
        continue;
      }

      // Check pattern
      if (pattern && !key.match(pattern)) {
        continue;
      }

      // Check priority
      if (priority && entry.priority !== priority) {
        continue;
      }

      // Check age
      if (olderThan && (Date.now() - entry.timestamp) < olderThan) {
        continue;
      }

      this.delete(key);
      deletedCount++;
    }

    return deletedCount;
  }

  // Enhanced delete with cleanup
  delete(key) {
    const entry = this.cache.get(key);
    if (entry) {
      this.stats.memoryUsage -= entry.size;
      this.cache.delete(key);
      this.metadata.delete(key);
      this.stats.deletes++;
      this.stats.size = this.cache.size;
    }
  }

  // Clear all cache entries
  clear() {
    this.cache.clear();
    this.metadata.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      memoryUsage: 0
    };
  }

  // Get cache statistics
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      efficiency: this.calculateEfficiency(),
      memoryUsageMB: (this.stats.memoryUsage / (1024 * 1024)).toFixed(2),
      averageEntrySize: this.stats.size > 0 
        ? (this.stats.memoryUsage / this.stats.size).toFixed(2)
        : 0
    };
  }

  // Intelligent eviction based on LRU and priority
  evictEntries() {
    const entries = Array.from(this.cache.entries());
    
    // Sort by priority and access time
    entries.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
      const aPriority = priorityOrder[a[1].priority] || 1;
      const bPriority = priorityOrder[b[1].priority] || 1;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return a[1].lastAccessed - b[1].lastAccessed;
    });

    // Remove 20% of entries, starting with lowest priority/oldest
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.delete(entries[i][0]);
    }
  }

  // Memory-based eviction
  evictByMemory() {
    const entries = Array.from(this.cache.entries());
    
    // Sort by size (largest first) and access time
    entries.sort((a, b) => {
      if (a[1].size !== b[1].size) {
        return b[1].size - a[1].size;
      }
      return a[1].lastAccessed - b[1].lastAccessed;
    });

    let freedMemory = 0;
    const targetFreeMemory = this.maxMemory * 0.3; // Free 30% of max memory

    for (const [key, entry] of entries) {
      if (freedMemory >= targetFreeMemory) break;
      
      this.delete(key);
      freedMemory += entry.size;
    }
  }

  // Check if entry is expired
  isExpired(entry) {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  // Calculate data size
  calculateSize(data) {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  // Determine if data should be compressed
  shouldCompress(data) {
    const size = this.calculateSize(data);
    return size > 1024; // Compress if larger than 1KB
  }

  // Simple compression (in production, use proper compression)
  compressData(data) {
    try {
      return JSON.stringify(data);
    } catch {
      return data;
    }
  }

  // Simple decompression
  decompressData(data) {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  // Calculate cache efficiency
  calculateEfficiency() {
    const totalRequests = this.stats.hits + this.stats.misses;
    if (totalRequests === 0) return 0;
    
    const hitRate = this.stats.hits / totalRequests;
    const memoryEfficiency = 1 - (this.stats.memoryUsage / this.maxMemory);
    
    return (hitRate * 0.7 + memoryEfficiency * 0.3) * 100;
  }

  // Monitor memory usage
  monitorMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memoryInfo = performance.memory;
        if (memoryInfo && memoryInfo.usedJSHeapSize > this.maxMemory) {
          this.evictByMemory();
        }
      }, 30000); // Check every 30 seconds
    }
  }

  // Update memory usage statistics
  updateMemoryUsage() {
    this.stats.memoryUsage = Array.from(this.cache.values())
      .reduce((total, entry) => total + entry.size, 0);
  }

  // Start cleanup interval
  startCleanupInterval() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.debug(`Cache cleanup: removed ${cleanedCount} expired entries`);
    }

    this.lastCleanup = now;
  }

  // Get cache keys by pattern
  getKeys(pattern = null) {
    const keys = Array.from(this.cache.keys());
    if (!pattern) return keys;
    
    const regex = new RegExp(pattern);
    return keys.filter(key => regex.test(key));
  }

  // Get cache entries by namespace
  getByNamespace(namespace) {
    const entries = [];
    for (const [key, entry] of this.cache.entries()) {
      if (entry.namespace === namespace) {
        entries.push({ key, ...entry });
      }
    }
    return entries;
  }

  // Preload data with intelligent scheduling
  preload(keys, options = {}) {
    const { priority = 'low', namespace = 'preload' } = options;
    
    keys.forEach(key => {
      if (!this.cache.has(key)) {
        this.set(key, null, {
          priority,
          namespace,
          ttl: 5 * 60 * 1000 // 5 minutes for preloaded data
        });
      }
    });
  }

  // Export cache for debugging
  export() {
    return {
      entries: Array.from(this.cache.entries()),
      metadata: Array.from(this.metadata.entries()),
      stats: this.getStats(),
      timestamp: Date.now()
    };
  }

  // Import cache data
  import(data) {
    if (data.entries) {
      this.cache = new Map(data.entries);
    }
    if (data.metadata) {
      this.metadata = new Map(data.metadata);
    }
    this.updateMemoryUsage();
  }
}

// Create singleton instance
const advancedCache = new AdvancedCacheService();

// Export the singleton instance
export default advancedCache;

// Export utility functions
export const cacheUtils = {
  // Generate cache key for API responses
  generateApiKey: (endpoint, params = {}) => {
    return advancedCache.generateKey('api', endpoint, params);
  },

  // Generate cache key for user data
  generateUserKey: (userId, dataType) => {
    return advancedCache.generateKey('user', `${userId}:${dataType}`);
  },

  // Generate cache key for movie data
  generateMovieKey: (movieId, dataType = 'details') => {
    return advancedCache.generateKey('movie', `${movieId}:${dataType}`);
  },

  // Invalidate all movie-related cache
  invalidateMovieCache: (movieId = null) => {
    if (movieId) {
      return advancedCache.invalidate({ 
        pattern: `movie:${movieId}:.*`,
        namespace: 'movie'
      });
    } else {
      return advancedCache.invalidate({ namespace: 'movie' });
    }
  },

  // Invalidate all user-related cache
  invalidateUserCache: (userId = null) => {
    if (userId) {
      return advancedCache.invalidate({ 
        pattern: `user:${userId}:.*`,
        namespace: 'user'
      });
    } else {
      return advancedCache.invalidate({ namespace: 'user' });
    }
  },

  // Get cache statistics
  getStats: () => advancedCache.getStats(),

  // Clear all cache
  clear: () => advancedCache.clear(),

  // Export cache data
  export: () => advancedCache.export(),

  // Import cache data
  import: (data) => advancedCache.import(data)
}; 