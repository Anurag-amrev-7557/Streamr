const NodeCache = require('node-cache');

// Initialize cache with standard TTL of 5 minutes and check period of 60 seconds
const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false, // Don't clone objects for better performance
  maxKeys: 1000 // Limit cache size to prevent memory issues
});

// Cache middleware with configurable TTL
const cacheMiddleware = (ttl = 300) => {
  return (req, res, next) => {
    // Skip cache for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip cache for authenticated requests unless explicitly allowed
    if (req.user && !req.query.allowCache) {
      return next();
    }

    // Create a cache key from the URL and any query parameters
    const key = `${req.originalUrl || req.url}`;

    // Try to get cached response
    const cachedResponse = cache.get(key);
    if (cachedResponse) {
      // Add cache hit header for debugging
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedResponse);
    }

    // Cache miss, continue with request
    res.setHeader('X-Cache', 'MISS');

    // Store the original res.json method
    const originalJson = res.json;

    // Override res.json method to cache the response
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, data, ttl);
      }
      // Call the original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

// Function to clear specific cache entries by pattern
const clearCache = (pattern) => {
  if (!pattern) return 0;
  
  const keys = cache.keys();
  let count = 0;
  
  keys.forEach(key => {
    if (key.includes(pattern)) {
      cache.del(key);
      count++;
    }
  });
  
  return count;
};

// Function to get cache stats
const getCacheStats = () => {
  return {
    keys: cache.keys().length,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    ksize: cache.getStats().ksize,
    vsize: cache.getStats().vsize
  };
};

module.exports = {
  cacheMiddleware,
  clearCache,
  getCacheStats
};