// Enhanced API Service V2 with Intelligent Caching
import enhancedCache, { enhancedCacheUtils } from './enhancedCacheService.js';
import performanceMonitor from './performanceMonitor.js';

class EnhancedApiServiceV2 {
  constructor() {
    this.config = {
      // API configuration
      baseURL: import.meta.env.VITE_API_URL || 'https://streamr-jjj9.onrender.com',
      timeout: 10000, // 10 seconds
      retryAttempts: 3,
      retryDelay: 1000,
      
      // Caching configuration
      cacheEnabled: true,
      defaultTTL: 15 * 60 * 1000, // 15 minutes
      aggressiveCaching: true,
      
      // Request batching
      batchingEnabled: true,
      batchTimeout: 100, // 100ms
      maxBatchSize: 10,
      
      // Rate limiting - More conservative to avoid 429 errors
      rateLimitEnabled: true,
      maxRequestsPerSecond: 2, // Reduced from 10 to 2
      rateLimitWindow: 1000, // 1 second
      maxConcurrentRequests: 3, // Limit concurrent requests
      
      // Performance monitoring
      performanceTracking: true,
      detailedLogging: false
    };
    
    this.state = {
      requestQueue: new Map(),
      batchQueue: new Map(),
      rateLimitTokens: this.config.maxRequestsPerSecond,
      lastRateLimitReset: Date.now(),
      pendingRequests: new Map(),
      requestQueue: [], // Add request queue for throttling
      isRateLimited: false,
      rateLimitResetTime: 0,
      failedRequests: new Set(), // Cache failed requests to prevent repeated calls
      requestStats: {
        total: 0,
        cached: 0,
        network: 0,
        errors: 0,
        rateLimited: 0, // Track rate limit errors
        averageResponseTime: 0
      }
    };
    
    this.initialize();
  }

  // Initialize the service
  async initialize() {
    try {
      // Initialize rate limiting
      this.startRateLimitReset();
      
      // Initialize request tracking
      this.startRequestTracking();
      
      // Warm up cache with critical data
      await this.warmupCriticalData();
      
      console.log('🚀 Enhanced API Service V2 initialized');
    } catch (error) {
      console.error('Failed to initialize Enhanced API Service V2:', error);
    }
  }

  // Main request method with intelligent caching
  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      params = {},
      data = null,
      headers = {},
      useCache = this.config.cacheEnabled,
      cacheTTL = this.config.defaultTTL,
      priority = 'normal',
      namespace = 'api',
      retryAttempts = this.config.retryAttempts,
      batchKey = null,
      prefetch = false
    } = options;

    const requestId = this.generateRequestId();
    const cacheKey = this.generateCacheKey(endpoint, method, params, data);
    
    // Check if this request has failed before (for 404s and other client errors)
    const requestSignature = `${method}:${endpoint}:${JSON.stringify(params)}`;
    if (this.state.failedRequests.has(requestSignature)) {
      console.warn(`Skipping previously failed request: ${requestSignature}`);
      throw new Error(`Request previously failed: ${endpoint}`);
    }
    
    // Track request start
    const startTime = performance.now();
    this.trackRequest('start', { requestId, endpoint, method });

    try {
      // Check cache first (for GET requests)
      if (useCache && method === 'GET') {
        const cachedData = await enhancedCache.get(cacheKey, { namespace });
        if (cachedData) {
          this.trackRequest('cache_hit', { requestId, endpoint });
          this.state.requestStats.cached++;
          return this.createResponse(cachedData, true);
        }
      }

      // Handle batching
      if (this.config.batchingEnabled && batchKey && method === 'GET') {
        return this.handleBatchedRequest(batchKey, endpoint, options);
      }

      // Check concurrent request limits
      if (this.state.pendingRequests.size >= this.config.maxConcurrentRequests) {
        // Queue the request
        return new Promise((resolve, reject) => {
          this.state.requestQueue.push({
            endpoint,
            options,
            resolve,
            reject,
            timestamp: Date.now()
          });
        });
      }

      // Check rate limits
      if (this.config.rateLimitEnabled && !this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      // Track pending request
      this.state.pendingRequests.set(requestId, { endpoint, startTime: Date.now() });

      // Execute request
      const response = await this.executeRequest(endpoint, method, params, data, headers, retryAttempts);
      
      // Cache successful responses
      if (useCache && response.ok && method === 'GET') {
        await this.cacheResponse(cacheKey, response.data, {
          namespace,
          ttl: cacheTTL,
          priority,
          metadata: { url: endpoint, method, params }
        });
      }

      // Track successful request
      this.trackRequest('success', { 
        requestId, 
        endpoint, 
        duration: performance.now() - startTime,
        size: response.data ? JSON.stringify(response.data).length : 0
      });

      this.state.requestStats.network++;
      
      // Remove from pending requests
      this.state.pendingRequests.delete(requestId);
      
      // Process queued requests
      this.processRequestQueue();
      
      return response;

    } catch (error) {
      // Track error
      this.trackRequest('error', { 
        requestId, 
        endpoint, 
        error: error.message,
        duration: performance.now() - startTime
      });

      this.state.requestStats.errors++;
      
      // Cache failed requests to prevent repeated calls
      const isClientError = error.message?.includes('404') || 
                           error.message?.includes('403') || 
                           error.message?.includes('401') || 
                           error.message?.includes('400');
      if (isClientError) {
        this.state.failedRequests.add(requestSignature);
        console.warn(`Caching failed request: ${requestSignature}`);
      }
      
      // Remove from pending requests
      this.state.pendingRequests.delete(requestId);
      
      // Process queued requests
      this.processRequestQueue();
      
      // Try to get from cache on error (stale-while-revalidate)
      if (useCache && method === 'GET') {
        const staleData = await enhancedCache.get(cacheKey, { namespace });
        if (staleData) {
          console.warn(`Using stale cache for ${endpoint}:`, error.message);
          return this.createResponse(staleData, true, true);
        }
      }
      
      throw error;
    }
  }

  // Execute actual HTTP request
  async executeRequest(endpoint, method, params, data, headers, retryAttempts) {
    // Check if we're currently rate limited
    if (this.state.isRateLimited) {
      const waitTime = this.state.rateLimitResetTime - Date.now();
      if (waitTime > 0) {
        await this.sleep(waitTime);
      } else {
        this.state.isRateLimited = false;
        this.state.rateLimitResetTime = 0;
      }
    }

    const url = this.buildUrl(endpoint, params);
    const requestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      signal: AbortSignal.timeout(this.config.timeout)
    };

    if (data && method !== 'GET') {
      requestOptions.body = JSON.stringify(data);
    }

    let lastError;
    
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        
        if (response.status === 429) {
          // Handle rate limiting
          this.state.requestStats.rateLimited++;
          this.state.isRateLimited = true;
          
          // Parse retry-after header or use exponential backoff
          const retryAfter = response.headers.get('retry-after');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
          
          this.state.rateLimitResetTime = Date.now() + waitTime;
          
          if (attempt < retryAttempts) {
            console.warn(`Rate limited (429). Waiting ${waitTime}ms before retry ${attempt + 1}/${retryAttempts}`);
            await this.sleep(waitTime);
            continue;
          } else {
            throw new Error(`Rate limited after ${retryAttempts} attempts`);
          }
        }
        
        if (!response.ok) {
          // Don't retry on 404 errors - endpoint doesn't exist
          if (response.status === 404) {
            console.warn(`Endpoint not found (404): ${url}`);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          // Don't retry on 4xx client errors (except 429 which is handled separately)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            console.warn(`Client error (${response.status}): ${url}`);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const responseData = await response.json();
        
        return {
          ok: true,
          status: response.status,
          data: responseData,
          headers: Object.fromEntries(response.headers.entries())
        };
        
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors (4xx) or if error message indicates client error
        const isClientError = error.message?.includes('404') || 
                             error.message?.includes('403') || 
                             error.message?.includes('401') || 
                             error.message?.includes('400');
        
        if (attempt < retryAttempts && !isClientError) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        } else if (isClientError) {
          console.warn(`Not retrying client error: ${error.message}`);
          break;
        }
      }
    }
    
    throw lastError;
  }

  // Handle batched requests
  async handleBatchedRequest(batchKey, endpoint, options) {
    if (this.state.batchQueue.has(batchKey)) {
      const batch = this.state.batchQueue.get(batchKey);
      batch.requests.push({ endpoint, options });
      
      return new Promise((resolve, reject) => {
        batch.promises.push({ resolve, reject });
      });
    }

    // Create new batch
    const batch = {
      requests: [{ endpoint, options }],
      promises: [],
      timeout: setTimeout(() => {
        this.processBatch(batchKey);
      }, this.config.batchTimeout)
    };

    this.state.batchQueue.set(batchKey, batch);
    
    return new Promise((resolve, reject) => {
      batch.promises.push({ resolve, reject });
    });
  }

  // Process batched requests
  async processBatch(batchKey) {
    const batch = this.state.batchQueue.get(batchKey);
    if (!batch) return;

    this.state.batchQueue.delete(batchKey);
    
    try {
      // Execute all requests in parallel
      const results = await Promise.allSettled(
        batch.requests.map(req => this.executeRequest(
          req.endpoint, 
          req.options.method || 'GET',
          req.options.params || {},
          req.options.data || null,
          req.options.headers || {}
        ))
      );

      // Resolve/reject promises
      results.forEach((result, index) => {
        const { resolve, reject } = batch.promises[index];
        
        if (result.status === 'fulfilled') {
          resolve(result.value);
        } else {
          reject(result.reason);
        }
      });

    } catch (error) {
      // Reject all promises on batch error
      batch.promises.forEach(({ reject }) => reject(error));
    }
  }

  // Cache response with intelligent features
  async cacheResponse(key, data, options = {}) {
    try {
      await enhancedCache.set(key, data, options);
      
      // Trigger prefetching for related content
      if (this.shouldPrefetch(data)) {
        this.schedulePrefetch(data);
      }
      
    } catch (error) {
      console.warn('Failed to cache response:', error);
    }
  }

  // Determine if data should trigger prefetching
  shouldPrefetch(data) {
    // Prefetch for movie details
    if (data && data.id && (data.title || data.name)) {
      return true;
    }
    
    // Prefetch for lists with items
    if (data && data.results && Array.isArray(data.results) && data.results.length > 0) {
      return true;
    }
    
    return false;
  }

  // Schedule intelligent prefetching
  schedulePrefetch(data) {
    if (!data) return;

    const prefetchTasks = [];

    // Prefetch similar content for movies
    if (data.id && (data.title || data.name)) {
      prefetchTasks.push({
        type: 'similar',
        url: `/api/movie/${data.id}/similar`,
        priority: 'medium'
      });
      
      prefetchTasks.push({
        type: 'recommendations',
        url: `/api/movie/${data.id}/recommendations`,
        priority: 'medium'
      });
    }

    // Prefetch next page for lists - only if we have a valid API endpoint
    if (data.page && data.total_pages && data.page < data.total_pages) {
      // Get the current request context to determine the correct API endpoint
      const currentPath = window.location.pathname;
      let apiEndpoint = null;
      
      // Map frontend routes to API endpoints
      if (currentPath === '/movies' || currentPath === '/') {
        apiEndpoint = '/api/tmdb/trending';
      } else if (currentPath === '/popular') {
        apiEndpoint = '/api/tmdb/popular';
      } else if (currentPath === '/top-rated') {
        apiEndpoint = '/api/tmdb/top-rated';
      } else if (currentPath === '/upcoming') {
        apiEndpoint = '/api/tmdb/upcoming';
      } else if (currentPath === '/now-playing') {
        apiEndpoint = '/api/tmdb/now-playing';
      }
      
      // Only add prefetch task if we have a valid API endpoint
      if (apiEndpoint) {
        const nextPage = data.page + 1;
        prefetchTasks.push({
          type: 'next_page',
          url: `${apiEndpoint}?page=${nextPage}`,
          priority: 'low'
        });
      }
    }

    // Execute prefetch tasks
    prefetchTasks.forEach(task => {
      setTimeout(async () => {
        try {
          await this.request(task.url, {
            useCache: true,
            priority: task.priority,
            namespace: 'prefetch'
          });
        } catch (error) {
          // Silently fail prefetch requests
          console.debug('Prefetch failed:', task.url);
        }
      }, Math.random() * 1000); // Random delay to avoid overwhelming the server
    });
  }

  // Warm up critical data
  async warmupCriticalData() {
    const criticalEndpoints = [
      '/api/tmdb/trending',
      '/api/tmdb/popular',
      '/api/tmdb/top-rated'
    ];

    criticalEndpoints.forEach((endpoint, index) => {
      setTimeout(async () => {
        try {
          await this.request(endpoint, {
            useCache: true,
            priority: 'high',
            namespace: 'warmup'
          });
        } catch (error) {
          console.debug('Warmup failed:', endpoint, error.message);
        }
      }, (index + 1) * 3000 + Math.random() * 2000); // Staggered delays: 3s, 6s, 9s + random
    });
  }

  // Rate limiting
  checkRateLimit() {
    const now = Date.now();
    
    // Reset tokens if window has passed
    if (now - this.state.lastRateLimitReset >= this.config.rateLimitWindow) {
      this.state.rateLimitTokens = this.config.maxRequestsPerSecond;
      this.state.lastRateLimitReset = now;
    }
    
    if (this.state.rateLimitTokens > 0) {
      this.state.rateLimitTokens--;
      return true;
    }
    
    return false;
  }

  // Start rate limit reset interval
  startRateLimitReset() {
    setInterval(() => {
      this.state.rateLimitTokens = this.config.maxRequestsPerSecond;
      this.state.lastRateLimitReset = Date.now();
    }, this.config.rateLimitWindow);
  }

  // Request tracking
  trackRequest(type, data) {
    if (!this.config.performanceTracking) return;

    const event = {
      type,
      timestamp: Date.now(),
      ...data
    };

    // Track in performance monitor
    if (performanceMonitor && typeof performanceMonitor.trackApiCall === 'function') {
      performanceMonitor.trackApiCall(
        data.endpoint,
        data.method || 'GET',
        data.duration || 0,
        data.status || 200,
        data.size || 0
      );
    }

    // Update internal stats
    if (type === 'success' && data.duration) {
      this.updateAverageResponseTime(data.duration);
    }
  }

  // Update average response time
  updateAverageResponseTime(duration) {
    const { total, averageResponseTime } = this.state.requestStats;
    this.state.requestStats.averageResponseTime = 
      (averageResponseTime * total + duration) / (total + 1);
  }

  // Start request tracking
  startRequestTracking() {
    setInterval(() => {
      if (this.config.detailedLogging) {
        console.log('API Service Stats:', this.getStats());
      }
    }, 60000); // Log every minute
  }

  // Generate request ID
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate cache key
  generateCacheKey(endpoint, method, params, data) {
    const keyData = {
      endpoint,
      method,
      params: params || {},
      data: data || null
    };
    
    return btoa(JSON.stringify(keyData)).replace(/[^a-zA-Z0-9]/g, '');
  }

  // Build URL with parameters
  buildUrl(endpoint, params) {
    const url = new URL(endpoint, this.config.baseURL);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });
    
    return url.toString();
  }

  // Create response object
  createResponse(data, fromCache = false, stale = false) {
    return {
      ok: true,
      status: 200,
      data,
      headers: {},
      fromCache,
      stale
    };
  }

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get service statistics
  getStats() {
    try {
      const cacheStats = enhancedCache.getStats();
      
      return {
        ...this.state.requestStats,
        cacheStats,
        rateLimitTokens: this.state.rateLimitTokens,
        pendingRequests: this.state.pendingRequests.size,
        batchQueueSize: this.state.batchQueue.size,
        requestQueueSize: this.state.requestQueue.size
      };
    } catch (error) {
      console.warn('Failed to get API service stats:', error);
      // Return fallback stats
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
        cacheStats: {
          hits: 0,
          misses: 0,
          sets: 0,
          deletes: 0,
          size: 0,
          memoryUsage: 0,
          hitRate: '0%',
          efficiency: 0,
          memoryUsageMB: '0.00',
          averageEntrySize: 0
        },
        rateLimitTokens: 0,
        pendingRequests: 0,
        batchQueueSize: 0,
        requestQueueSize: 0
      };
    }
  }

  // Clear all caches
  async clearCache() {
    await enhancedCache.clear();
    console.log('All caches cleared');
  }

  // Preload specific data
  async preload(endpoints, options = {}) {
    const { priority = 'low', namespace = 'preload' } = options;
    
    const promises = endpoints.map(endpoint => 
      this.request(endpoint, {
        useCache: true,
        priority,
        namespace
      }).catch(error => {
        console.debug('Preload failed:', endpoint, error);
        return null;
      })
    );
    
    return Promise.allSettled(promises);
  }

  // Invalidate cache by pattern
  async invalidateCache(pattern) {
    return enhancedCache.invalidate(pattern);
  }

  // Get cached data without network request
  async getCached(endpoint, params = {}) {
    const cacheKey = this.generateCacheKey(endpoint, 'GET', params);
    return await enhancedCache.get(cacheKey, { namespace: 'api' });
  }

  // Check if data is cached
  async isCached(endpoint, params = {}) {
    const cacheKey = this.generateCacheKey(endpoint, 'GET', params);
    const data = await enhancedCache.get(cacheKey, { namespace: 'api' });
    return data !== null;
  }

  // Clear failed requests cache
  clearFailedRequests() {
    this.state.failedRequests.clear();
    console.log('Cleared failed requests cache');
  }

  // Get failed requests count
  getFailedRequestsCount() {
    return this.state.failedRequests.size;
  }

  // Process the request queue
  processRequestQueue() {
    if (this.state.requestQueue.length === 0) return;

    const now = Date.now();
    const queue = this.state.requestQueue;
    this.state.requestQueue = []; // Clear the queue immediately

    for (const item of queue) {
      const { endpoint, options, resolve, reject, timestamp } = item;

      // Check if the request is still pending and within the timeout
      if (now - timestamp > 10000) { // 10 seconds timeout for queue items
        reject(new Error('Request queue timeout'));
        continue;
      }

      // Check concurrent request limits
      if (this.state.pendingRequests.size >= this.config.maxConcurrentRequests) {
        // Re-queue if we hit max concurrent requests
        this.state.requestQueue.push({ endpoint, options, resolve, reject, timestamp });
        continue;
      }

      // Check rate limits
      if (this.config.rateLimitEnabled && !this.checkRateLimit()) {
        reject(new Error('Rate limit exceeded for queue item'));
        continue;
      }

      // Track pending request
      const requestId = this.generateRequestId();
      this.state.pendingRequests.set(requestId, { endpoint, startTime: Date.now() });

      // Execute request
      this.request(endpoint, options)
        .then(resolve)
        .catch(reject);
    }
  }
}

// Create singleton instance
const enhancedApiServiceV2 = new EnhancedApiServiceV2();

// Export the singleton instance
export default enhancedApiServiceV2;

// Export utility functions
export const apiUtils = {
  // Get service stats
  getStats: () => enhancedApiServiceV2.getStats(),
  
  // Clear cache
  clearCache: () => enhancedApiServiceV2.clearCache(),
  
  // Preload data
  preload: (endpoints, options) => enhancedApiServiceV2.preload(endpoints, options),
  
  // Invalidate cache
  invalidateCache: (pattern) => enhancedApiServiceV2.invalidateCache(pattern),
  
  // Get cached data
  getCached: (endpoint, params) => enhancedApiServiceV2.getCached(endpoint, params),
  
  // Check if cached
  isCached: (endpoint, params) => enhancedApiServiceV2.isCached(endpoint, params),
  
  // Generate cache key
  generateCacheKey: (endpoint, method, params, data) => 
    enhancedApiServiceV2.generateCacheKey(endpoint, method, params, data),
  
  // Clear failed requests cache
  clearFailedRequests: () => enhancedApiServiceV2.clearFailedRequests(),
  
  // Get failed requests count
  getFailedRequestsCount: () => enhancedApiServiceV2.getFailedRequestsCount()
}; 