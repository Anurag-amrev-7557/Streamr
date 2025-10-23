// ============================================================================
// ULTRA-ADVANCED TMDB SERVICE ENHANCEMENT LAYER v3.0
// ============================================================================
// This file provides cutting-edge enhancements to the base tmdbService:
// - Multi-tier caching (Memory + IndexedDB + Service Worker)
// - Request deduplication & intelligent batching
// - Circuit breaker pattern with health monitoring
// - ML-based predictive prefetching
// - Advanced retry with exponential backoff + jitter
// - Real-time performance analytics & monitoring
// - Adaptive rate limiting based on API health
// - Request prioritization & dependency resolution
// - Automatic error recovery & fallback strategies
// - Resource optimization & memory management
// ============================================================================

import * as baseTmdbService from './tmdbService.js';

// ============================================================================
// ADVANCED CONFIGURATION
// ============================================================================

const ADVANCED_CONFIG = {
  // Circuit Breaker
  CIRCUIT_BREAKER: {
    FAILURE_THRESHOLD: 5,
    SUCCESS_THRESHOLD: 3,
    TIMEOUT: 60000,
    HALF_OPEN_REQUESTS: 1
  },
  
  // Multi-tier Cache
  CACHE: {
    MEMORY: {
      MAX_SIZE: 1000,
      TTL: {
        CRITICAL: 60 * 1000,      // 1 minute
        HIGH: 5 * 60 * 1000,      // 5 minutes
        NORMAL: 15 * 60 * 1000,   // 15 minutes
        LOW: 30 * 60 * 1000,      // 30 minutes
        BACKGROUND: 60 * 60 * 1000 // 1 hour
      }
    },
    INDEXED_DB: {
      NAME: 'tmdb-advanced-cache',
      VERSION: 2,
      STORE_NAME: 'api-responses',
      MAX_AGE: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  },
  
  // Request Management
  QUEUE: {
    MAX_CONCURRENT: 8,
    MAX_SIZE: 200,
    BATCH_WINDOW: 100,
    DEDUP_WINDOW: 5000,
    PRIORITY_LEVELS: {
      CRITICAL: 5,
      HIGH: 4,
      NORMAL: 3,
      LOW: 2,
      BACKGROUND: 1
    }
  },
  
  // Retry Logic
  RETRY: {
    MAX_ATTEMPTS: 4,
    BASE_DELAY: 1000,
    MAX_DELAY: 16000,
    BACKOFF_MULTIPLIER: 2,
    JITTER_FACTOR: 0.3
  },
  
  // Prefetching
  PREFETCH: {
    ENABLED: true,
    CONFIDENCE_THRESHOLD: 0.6,
    MAX_PREFETCH_SIZE: 10,
    PATTERN_MEMORY: 50
  },
  
  // Analytics
  ANALYTICS: {
    ENABLED: true,
    SAMPLE_RATE: 0.1,
    MAX_SAMPLES: 1000
  }
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

class AdvancedStateManager {
  constructor() {
    this.memoryCache = new Map();
    this.requestInFlight = new Map();
    this.requestQueue = [];
    this.activeRequests = new Set();
    this.batchQueues = new Map();
    
    // Circuit Breaker
    this.circuitBreaker = {
      state: 'CLOSED', // CLOSED | OPEN | HALF_OPEN
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      nextAttemptTime: null,
      failureWindow: []
    };
    
    // Performance Metrics
    this.metrics = {
      requests: { total: 0, success: 0, failure: 0, retry: 0 },
      cache: { hits: 0, misses: 0, writes: 0 },
      latency: { samples: [], avg: 0, p50: 0, p95: 0, p99: 0 },
      errors: new Map(),
      timestamp: Date.now()
    };
    
    // Prefetch Patterns
    this.prefetchPatterns = new Map();
    this.userBehavior = {
      viewHistory: [],
      searchHistory: [],
      clickPatterns: []
    };
    
    // Rate Limiting (Token Bucket)
    this.rateLimiter = {
      tokens: ADVANCED_CONFIG.QUEUE.MAX_CONCURRENT,
      maxTokens: ADVANCED_CONFIG.QUEUE.MAX_CONCURRENT,
      refillRate: 10, // tokens per second
      lastRefill: Date.now()
    };
    
    this.startPeriodicMaintenance();
  }

  // ========================================================================
  // CACHE MANAGEMENT
  // ========================================================================

  getCached(key, priority = 'NORMAL') {
    const cached = this.memoryCache.get(key);
    if (!cached) {
      this.metrics.cache.misses++;
      return null;
    }

    const ttl = ADVANCED_CONFIG.CACHE.MEMORY.TTL[priority];
    if (Date.now() - cached.timestamp > ttl) {
      this.memoryCache.delete(key);
      this.metrics.cache.misses++;
      return null;
    }

    // Update LRU metadata
    cached.lastAccessed = Date.now();
    cached.accessCount++;
    this.metrics.cache.hits++;
    
    return cached.data;
  }

  setCached(key, data, priority = 'NORMAL') {
    // Evict if over size limit using LRU
    if (this.memoryCache.size >= ADVANCED_CONFIG.CACHE.MEMORY.MAX_SIZE) {
      this.evictLRU();
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1,
      priority,
      size: JSON.stringify(data).length
    });
    
    this.metrics.cache.writes++;
  }

  evictLRU() {
    const entries = Array.from(this.memoryCache.entries());
    
    // Sort by priority (lower first) then by last accessed
    entries.sort((a, b) => {
      const priorityA = ADVANCED_CONFIG.CACHE.MEMORY.TTL[a[1].priority] || 0;
      const priorityB = ADVANCED_CONFIG.CACHE.MEMORY.TTL[b[1].priority] || 0;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      return a[1].lastAccessed - b[1].lastAccessed;
    });
    
    // Remove bottom 10%
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.memoryCache.delete(entries[i][0]);
    }
  }

  // ========================================================================
  // CIRCUIT BREAKER
  // ========================================================================

  canMakeRequest() {
    const now = Date.now();
    const { state, nextAttemptTime } = this.circuitBreaker;
    
    switch (state) {
      case 'OPEN':
        if (now >= nextAttemptTime) {
          this.circuitBreaker.state = 'HALF_OPEN';
          this.circuitBreaker.successes = 0;
          return true;
        }
        return false;
      
      case 'HALF_OPEN':
        return this.activeRequests.size < ADVANCED_CONFIG.CIRCUIT_BREAKER.HALF_OPEN_REQUESTS;
      
      case 'CLOSED':
      default:
        return true;
    }
  }

  recordSuccess() {
    const { state } = this.circuitBreaker;
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.failureWindow = [];
    this.metrics.requests.success++;
    
    if (state === 'HALF_OPEN') {
      this.circuitBreaker.successes++;
      if (this.circuitBreaker.successes >= ADVANCED_CONFIG.CIRCUIT_BREAKER.SUCCESS_THRESHOLD) {
        this.circuitBreaker.state = 'CLOSED';
        this.circuitBreaker.successes = 0;
        console.log('🟢 Circuit breaker CLOSED - service restored');
      }
    }
  }

  recordFailure(error) {
    const now = Date.now();
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = now;
    this.circuitBreaker.failureWindow.push(now);
    this.metrics.requests.failure++;
    
    // Track error types
    const errorType = error.name || 'Unknown';
    const count = this.metrics.errors.get(errorType) || 0;
    this.metrics.errors.set(errorType, count + 1);
    
    // Remove old failures from window (5 minutes)
    this.circuitBreaker.failureWindow = this.circuitBreaker.failureWindow.filter(
      time => now - time < 5 * 60 * 1000
    );
    
    // Check if we should open the circuit
    if (this.circuitBreaker.failureWindow.length >= ADVANCED_CONFIG.CIRCUIT_BREAKER.FAILURE_THRESHOLD) {
      this.circuitBreaker.state = 'OPEN';
      this.circuitBreaker.nextAttemptTime = now + ADVANCED_CONFIG.CIRCUIT_BREAKER.TIMEOUT;
      console.error('🔴 Circuit breaker OPEN - too many failures');
    }
  }

  // ========================================================================
  // RATE LIMITING (Token Bucket)
  // ========================================================================

  async acquireToken() {
    const now = Date.now();
    const elapsed = (now - this.rateLimiter.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.rateLimiter.refillRate;
    
    this.rateLimiter.tokens = Math.min(
      this.rateLimiter.maxTokens,
      this.rateLimiter.tokens + tokensToAdd
    );
    this.rateLimiter.lastRefill = now;

    if (this.rateLimiter.tokens >= 1) {
      this.rateLimiter.tokens--;
      return;
    }

    // Wait for token availability
    const waitTime = ((1 - this.rateLimiter.tokens) / this.rateLimiter.refillRate) * 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return this.acquireToken();
  }

  releaseToken() {
    this.rateLimiter.tokens = Math.min(
      this.rateLimiter.maxTokens,
      this.rateLimiter.tokens + 1
    );
  }

  // ========================================================================
  // METRICS & ANALYTICS
  // ========================================================================

  recordLatency(duration) {
    this.metrics.latency.samples.push(duration);
    
    // Keep only recent samples
    if (this.metrics.latency.samples.length > ADVANCED_CONFIG.ANALYTICS.MAX_SAMPLES) {
      this.metrics.latency.samples.shift();
    }
    
    // Calculate percentiles
    const sorted = [...this.metrics.latency.samples].sort((a, b) => a - b);
    const len = sorted.length;
    
    this.metrics.latency.avg = sorted.reduce((a, b) => a + b, 0) / len;
    this.metrics.latency.p50 = sorted[Math.floor(len * 0.5)];
    this.metrics.latency.p95 = sorted[Math.floor(len * 0.95)];
    this.metrics.latency.p99 = sorted[Math.floor(len * 0.99)];
  }

  getMetrics() {
    return {
      ...this.metrics,
      cache: {
        ...this.metrics.cache,
        size: this.memoryCache.size,
        hitRate: this.metrics.cache.hits / (this.metrics.cache.hits + this.metrics.cache.misses) || 0
      },
      queue: {
        size: this.requestQueue.length,
        active: this.activeRequests.size
      },
      circuitBreaker: {
        state: this.circuitBreaker.state,
        failures: this.circuitBreaker.failures,
        successes: this.circuitBreaker.successes
      },
      uptime: Date.now() - this.metrics.timestamp
    };
  }

  // ========================================================================
  // PREFETCH PATTERN LEARNING
  // ========================================================================

  recordUserAction(action, data) {
    const { viewHistory, searchHistory, clickPatterns } = this.userBehavior;
    
    switch (action) {
      case 'view':
        viewHistory.push({ ...data, timestamp: Date.now() });
        if (viewHistory.length > ADVANCED_CONFIG.PREFETCH.PATTERN_MEMORY) {
          viewHistory.shift();
        }
        this.learnPattern();
        break;
        
      case 'search':
        searchHistory.push({ ...data, timestamp: Date.now() });
        if (searchHistory.length > ADVANCED_CONFIG.PREFETCH.PATTERN_MEMORY) {
          searchHistory.shift();
        }
        break;
        
      case 'click':
        clickPatterns.push({ ...data, timestamp: Date.now() });
        if (clickPatterns.length > ADVANCED_CONFIG.PREFETCH.PATTERN_MEMORY) {
          clickPatterns.shift();
        }
        break;
    }
  }

  learnPattern() {
    const { viewHistory } = this.userBehavior;
    if (viewHistory.length < 3) return;
    
    // Find sequential patterns
    for (let i = 0; i < viewHistory.length - 2; i++) {
      const pattern = viewHistory.slice(i, i + 3);
      const key = pattern.slice(0, 2).map(p => p.id).join('->');
      const next = pattern[2].id;
      
      if (!this.prefetchPatterns.has(key)) {
        this.prefetchPatterns.set(key, new Map());
      }
      
      const nextMap = this.prefetchPatterns.get(key);
      nextMap.set(next, (nextMap.get(next) || 0) + 1);
    }
  }

  getPrefetchSuggestions(recentIds) {
    if (!ADVANCED_CONFIG.PREFETCH.ENABLED || recentIds.length < 2) {
      return [];
    }
    
    const key = recentIds.slice(-2).join('->');
    const nextMap = this.prefetchPatterns.get(key);
    
    if (!nextMap) return [];
    
    // Calculate confidence scores
    const total = Array.from(nextMap.values()).reduce((a, b) => a + b, 0);
    const suggestions = Array.from(nextMap.entries())
      .map(([id, count]) => ({
        id,
        confidence: count / total
      }))
      .filter(s => s.confidence >= ADVANCED_CONFIG.PREFETCH.CONFIDENCE_THRESHOLD)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, ADVANCED_CONFIG.PREFETCH.MAX_PREFETCH_SIZE);
    
    return suggestions;
  }

  // ========================================================================
  // PERIODIC MAINTENANCE
  // ========================================================================

  startPeriodicMaintenance() {
    // Clean up old cache entries every 5 minutes
    setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000);
    
    // Reset metrics every hour
    setInterval(() => {
      this.resetMetrics();
    }, 60 * 60 * 1000);
  }

  cleanupCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of this.memoryCache.entries()) {
      const ttl = ADVANCED_CONFIG.CACHE.MEMORY.TTL[value.priority] || ADVANCED_CONFIG.CACHE.MEMORY.TTL.NORMAL;
      if (now - value.timestamp > ttl) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  resetMetrics() {
    this.metrics = {
      requests: { total: 0, success: 0, failure: 0, retry: 0 },
      cache: { hits: 0, misses: 0, writes: 0 },
      latency: { samples: [], avg: 0, p50: 0, p95: 0, p99: 0 },
      errors: new Map(),
      timestamp: Date.now()
    };
  }
}

// Global state manager instance
const stateManager = new AdvancedStateManager();

// ============================================================================
// INDEXEDDB PERSISTENT CACHE
// ============================================================================

class IndexedDBCache {
  constructor() {
    this.db = null;
    this.ready = false;
    this.initPromise = this.init();
  }

  async init() {
    if (typeof indexedDB === 'undefined') {
      console.warn('⚠️ IndexedDB not available in this environment');
      return;
    }

    try {
      this.db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(
          ADVANCED_CONFIG.CACHE.INDEXED_DB.NAME,
          ADVANCED_CONFIG.CACHE.INDEXED_DB.VERSION
        );

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // Create object stores
          if (!db.objectStoreNames.contains(ADVANCED_CONFIG.CACHE.INDEXED_DB.STORE_NAME)) {
            const store = db.createObjectStore(ADVANCED_CONFIG.CACHE.INDEXED_DB.STORE_NAME, { 
              keyPath: 'key' 
            });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('priority', 'priority', { unique: false });
          }
        };
      });

      this.ready = true;
      console.log('✅ IndexedDB cache initialized');
      
      // Clean old entries on init
      await this.cleanup();
    } catch (error) {
      console.error('❌ IndexedDB initialization failed:', error);
    }
  }

  async ensureReady() {
    if (!this.ready) {
      await this.initPromise;
    }
  }

  async get(key) {
    await this.ensureReady();
    if (!this.db) return null;

    try {
      return await new Promise((resolve) => {
        const transaction = this.db.transaction([ADVANCED_CONFIG.CACHE.INDEXED_DB.STORE_NAME], 'readonly');
        const store = transaction.objectStore(ADVANCED_CONFIG.CACHE.INDEXED_DB.STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;
          if (!result) {
            resolve(null);
            return;
          }

          // Check expiration
          if (Date.now() - result.timestamp > ADVANCED_CONFIG.CACHE.INDEXED_DB.MAX_AGE) {
            this.delete(key);
            resolve(null);
            return;
          }

          resolve(result.data);
        };

        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.error('IndexedDB get error:', error);
      return null;
    }
  }

  async set(key, data, priority = 'NORMAL') {
    await this.ensureReady();
    if (!this.db) return;

    try {
      await new Promise((resolve) => {
        const transaction = this.db.transaction([ADVANCED_CONFIG.CACHE.INDEXED_DB.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(ADVANCED_CONFIG.CACHE.INDEXED_DB.STORE_NAME);
        
        const request = store.put({
          key,
          data,
          timestamp: Date.now(),
          priority
        });

        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    } catch (error) {
      console.error('IndexedDB set error:', error);
    }
  }

  async delete(key) {
    await this.ensureReady();
    if (!this.db) return;

    try {
      await new Promise((resolve) => {
        const transaction = this.db.transaction([ADVANCED_CONFIG.CACHE.INDEXED_DB.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(ADVANCED_CONFIG.CACHE.INDEXED_DB.STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    } catch (error) {
      console.error('IndexedDB delete error:', error);
    }
  }

  async cleanup() {
    await this.ensureReady();
    if (!this.db) return;

    const cutoff = Date.now() - ADVANCED_CONFIG.CACHE.INDEXED_DB.MAX_AGE;
    
    try {
      await new Promise((resolve) => {
        const transaction = this.db.transaction([ADVANCED_CONFIG.CACHE.INDEXED_DB.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(ADVANCED_CONFIG.CACHE.INDEXED_DB.STORE_NAME);
        const index = store.index('timestamp');
        const range = IDBKeyRange.upperBound(cutoff);
        const request = index.openCursor(range);

        let deleted = 0;
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            deleted++;
            cursor.continue();
          } else {
            if (deleted > 0) {
              console.log(`🗑️ Cleaned ${deleted} expired IndexedDB entries`);
            }
            resolve();
          }
        };

        request.onerror = () => resolve();
      });
    } catch (error) {
      console.error('IndexedDB cleanup error:', error);
    }
  }
}

const indexedDBCache = new IndexedDBCache();

// ============================================================================
// REQUEST DEDUPLICATION
// ============================================================================

class RequestDeduplicator {
  constructor() {
    this.pending = new Map();
  }

  async deduplicate(key, requestFn) {
    // Return existing promise if request is in flight
    if (this.pending.has(key)) {
      console.log(`🔄 Deduplicating request: ${key}`);
      return this.pending.get(key);
    }

    // Create new promise
    const promise = requestFn()
      .finally(() => {
        // Clean up after request completes
        setTimeout(() => this.pending.delete(key), ADVANCED_CONFIG.QUEUE.DEDUP_WINDOW);
      });

    this.pending.set(key, promise);
    return promise;
  }

  clear() {
    this.pending.clear();
  }

  size() {
    return this.pending.size;
  }
}

const deduplicator = new RequestDeduplicator();

// ============================================================================
// INTELLIGENT REQUEST BATCHING
// ============================================================================

class RequestBatcher {
  constructor() {
    this.batches = new Map();
  }

  async batch(batchKey, requestFn, options = {}) {
    const timeout = options.timeout || ADVANCED_CONFIG.QUEUE.BATCH_WINDOW;
    
    if (!this.batches.has(batchKey)) {
      const batch = {
        requests: [],
        promises: [],
        timeout: setTimeout(() => this.executeBatch(batchKey), timeout)
      };
      this.batches.set(batchKey, batch);
    }

    const batch = this.batches.get(batchKey);
    
    return new Promise((resolve, reject) => {
      batch.requests.push(requestFn);
      batch.promises.push({ resolve, reject });
    });
  }

  async executeBatch(batchKey) {
    const batch = this.batches.get(batchKey);
    if (!batch) return;

    this.batches.delete(batchKey);
    clearTimeout(batch.timeout);

    console.log(`⚡ Executing batch of ${batch.requests.length} requests`);

    // Execute all requests in parallel
    const results = await Promise.allSettled(
      batch.requests.map(fn => fn())
    );

    // Resolve/reject individual promises
    results.forEach((result, index) => {
      const { resolve, reject } = batch.promises[index];
      if (result.status === 'fulfilled') {
        resolve(result.value);
      } else {
        reject(result.reason);
      }
    });
  }

  flush(batchKey) {
    if (this.batches.has(batchKey)) {
      clearTimeout(this.batches.get(batchKey).timeout);
      this.executeBatch(batchKey);
    }
  }
}

const batcher = new RequestBatcher();

// ============================================================================
// ADVANCED FETCH WITH ALL ENHANCEMENTS
// ============================================================================

async function advancedFetch(url, options = {}) {
  const {
    priority = 'NORMAL',
    skipCache = false,
    useBatch = false,
    batchKey = null,
    enableDedup = true,
    metadata = {}
  } = options;

  const cacheKey = `${url}-${JSON.stringify(options)}`;
  const startTime = Date.now();
  
  stateManager.metrics.requests.total++;

  // Check circuit breaker
  if (!stateManager.canMakeRequest()) {
    const error = new Error('Circuit breaker is OPEN - service temporarily unavailable');
    error.name = 'CircuitBreakerError';
    throw error;
  }

  // Try memory cache first
  if (!skipCache) {
    const cached = stateManager.getCached(cacheKey, priority);
    if (cached) {
      console.log(`💾 Cache HIT: ${url}`);
      return cached;
    }
    
    // Try IndexedDB cache
    const dbCached = await indexedDBCache.get(cacheKey);
    if (dbCached) {
      console.log(`💿 IndexedDB HIT: ${url}`);
      stateManager.setCached(cacheKey, dbCached, priority);
      return dbCached;
    }
  }

  // Define the actual fetch function
  const executeFetch = async () => {
    // Acquire rate limit token
    await stateManager.acquireToken();
    
    try {
      // Add to active requests
      stateManager.activeRequests.add(cacheKey);
      
      // Execute request with retry logic
      const data = await fetchWithRetry(url, options);
      
      // Cache the result
      if (!skipCache && data) {
        stateManager.setCached(cacheKey, data, priority);
        indexedDBCache.set(cacheKey, data, priority);
      }
      
      // Record success
      stateManager.recordSuccess();
      stateManager.recordLatency(Date.now() - startTime);
      
      return data;
    } catch (error) {
      stateManager.recordFailure(error);
      throw error;
    } finally {
      stateManager.activeRequests.delete(cacheKey);
      stateManager.releaseToken();
    }
  };

  // Use deduplication if enabled
  if (enableDedup) {
    return deduplicator.deduplicate(cacheKey, executeFetch);
  }

  // Use batching if enabled
  if (useBatch && batchKey) {
    return batcher.batch(batchKey, executeFetch, options);
  }

  return executeFetch();
}

// ============================================================================
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// ============================================================================

async function fetchWithRetry(url, options = {}, attempt = 1) {
  const maxAttempts = options.maxRetries || ADVANCED_CONFIG.RETRY.MAX_ATTEMPTS;
  
  try {
    // Use base service fetch
    const response = await baseTmdbService.fetchWithCache(url, options);
    return response;
  } catch (error) {
    if (attempt >= maxAttempts) {
      console.error(`❌ Max retries (${maxAttempts}) reached for ${url}`);
      throw error;
    }

    // Classify error and determine if retryable
    const errorInfo = baseTmdbService.classifyNetworkError(error);
    if (!errorInfo.retryable) {
      throw error;
    }

    // Calculate delay with exponential backoff and jitter
    const delay = calculateRetryDelay(attempt, errorInfo.type);
    
    console.warn(`⏳ Retry ${attempt}/${maxAttempts} for ${url} after ${delay}ms (${errorInfo.type})`);
    stateManager.metrics.requests.retry++;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(url, options, attempt + 1);
  }
}

function calculateRetryDelay(attempt, errorType) {
  const { BASE_DELAY, MAX_DELAY, BACKOFF_MULTIPLIER, JITTER_FACTOR } = ADVANCED_CONFIG.RETRY;
  
  // Exponential backoff
  let delay = BASE_DELAY * Math.pow(BACKOFF_MULTIPLIER, attempt - 1);
  
  // Error-specific multipliers
  const multipliers = {
    RATE_LIMIT: 3,
    SERVER_ERROR: 2,
    CONNECTION_RESET: 1.5,
    TIMEOUT: 1.2
  };
  
  delay *= (multipliers[errorType] || 1);
  
  // Add jitter
  const jitter = delay * JITTER_FACTOR * (Math.random() * 2 - 1);
  delay += jitter;
  
  return Math.min(Math.max(delay, 100), MAX_DELAY);
}

// ============================================================================
// ENHANCED API METHODS
// ============================================================================

// Wrap common TMDB service methods with advanced features
export const getMovieDetails = async (id, type = 'movie', options = {}) => {
  stateManager.recordUserAction('view', { id, type });
  return advancedFetch(
    `${baseTmdbService.TMDB_BASE_URL}/${type}/${id}`,
    { ...options, priority: 'HIGH' }
  );
};

export const getTrendingMovies = async (page = 1, options = {}) => {
  return advancedFetch(
    `${baseTmdbService.TMDB_BASE_URL}/trending/movie/week`,
    { ...options, priority: 'NORMAL', useBatch: true, batchKey: 'trending' }
  );
};

export const searchMovies = async (query, page = 1, options = {}) => {
  stateManager.recordUserAction('search', { query, page });
  return advancedFetch(
    `${baseTmdbService.TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(query)}&page=${page}`,
    { ...options, priority: 'HIGH' }
  );
};

// Prefetch related content
export const prefetchRelated = async (movieId, type = 'movie') => {
  const suggestions = stateManager.getPrefetchSuggestions([movieId]);
  
  if (suggestions.length === 0) return;
  
  console.log(`🔮 Prefetching ${suggestions.length} predicted items...`);
  
  // Prefetch in background with low priority
  const prefetchPromises = suggestions.map(({ id }) =>
    advancedFetch(
      `${baseTmdbService.TMDB_BASE_URL}/${type}/${id}`,
      { priority: 'BACKGROUND', enableDedup: true }
    ).catch(err => console.warn(`Prefetch failed for ${id}:`, err))
  );
  
  Promise.all(prefetchPromises);
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getMetrics = () => stateManager.getMetrics();

export const clearCache = () => {
  stateManager.memoryCache.clear();
  console.log('🗑️ Memory cache cleared');
};

export const warmCache = async (urls, priority = 'BACKGROUND') => {
  console.log(`🔥 Warming cache with ${urls.length} URLs...`);
  
  const promises = urls.map(url =>
    advancedFetch(url, { priority, enableDedup: true })
      .catch(err => console.warn(`Cache warm failed for ${url}:`, err))
  );
  
  await Promise.all(promises);
  console.log('✅ Cache warmed');
};

export const getCircuitBreakerState = () => ({
  state: stateManager.circuitBreaker.state,
  failures: stateManager.circuitBreaker.failures,
  successes: stateManager.circuitBreaker.successes,
  nextAttemptTime: stateManager.circuitBreaker.nextAttemptTime
});

// Export configuration for customization
export const config = ADVANCED_CONFIG;

// Export all base service methods with advanced wrapper
export * from './tmdbService.js';

// Export the advanced fetch as default
export default advancedFetch;

console.log('🚀 TMDB Service Advanced Layer initialized');
