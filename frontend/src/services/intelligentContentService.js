// Intelligent Content Service
// Handles smart caching, predictive loading, and adaptive content delivery

import enhancedNetworkService from './enhancedNetworkService.js';
import { performanceService } from './performanceOptimizationService.js';

class IntelligentContentService {
  constructor() {
    this.contentCache = new Map();
    this.prefetchCache = new Map();
    this.userBehaviorCache = new Map();
    this.priorityQueue = [];
    this.activeFetches = new Set();
    
    this.config = {
      cacheTTL: 30 * 60 * 1000, // 30 minutes
      prefetchTTL: 5 * 60 * 1000, // 5 minutes
      maxCacheSize: 100,
      maxPrefetchSize: 50,
      batchSize: 10,
      retryAttempts: 3,
      retryDelay: 1000
    };
    
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      prefetchHits: 0,
      averageLoadTime: 0,
      totalRequests: 0
    };
    
    this.init();
  }

  init() {
    this.setupCacheCleanup();
    this.setupPredictiveLoading();
    this.setupUserBehaviorTracking();
    this.setupNetworkAdaptation();
  }

  // Setup automatic cache cleanup
  setupCacheCleanup() {
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  // Setup predictive loading based on user behavior
  setupPredictiveLoading() {
    // Listen for user interactions to predict next content
    document.addEventListener('click', (e) => {
      this.trackUserInteraction(e);
    });
    
    document.addEventListener('scroll', (e) => {
      this.trackScrollBehavior(e);
    });
  }

  // Setup user behavior tracking
  setupUserBehaviorTracking() {
    this.userBehavior = {
      viewedContent: new Set(),
      searchHistory: [],
      categoryPreferences: new Map(),
      timeSpent: new Map(),
      lastInteraction: Date.now()
    };
  }

  // Setup network adaptation
  setupNetworkAdaptation() {
    window.addEventListener('networkQualityChange', (e) => {
      this.adaptToNetworkQuality(e.detail);
    });
  }

  // Intelligent content fetching with smart caching
  async fetchContent(contentKey, options = {}) {
    const {
      priority = 'normal',
      forceRefresh = false,
      prefetch = false,
      ttl = this.config.cacheTTL
    } = options;

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.getCachedContent(contentKey);
      if (cached) {
        this.metrics.cacheHits++;
        return cached;
      }
    }

    this.metrics.cacheMisses++;
    this.metrics.totalRequests++;

    // Add to priority queue
    const fetchPromise = this.queueContentFetch(contentKey, priority);
    
    // If prefetch, store in prefetch cache
    if (prefetch) {
      this.prefetchCache.set(contentKey, {
        promise: fetchPromise,
        timestamp: Date.now(),
        ttl: this.config.prefetchTTL
      });
    }

    return fetchPromise;
  }

  // Queue content fetch with priority
  async queueContentFetch(contentKey, priority) {
    const fetchId = this.generateFetchId();
    
    const fetchTask = {
      id: fetchId,
      contentKey,
      priority,
      timestamp: Date.now(),
      retryCount: 0
    };

    // Add to priority queue
    if (priority === 'high') {
      this.priorityQueue.unshift(fetchTask);
    } else {
      this.priorityQueue.push(fetchTask);
    }

    return new Promise((resolve, reject) => {
      fetchTask.resolve = resolve;
      fetchTask.reject = reject;
      
      // Process queue
      this.processPriorityQueue();
    });
  }

  // Process priority queue
  async processPriorityQueue() {
    if (this.priorityQueue.length === 0) return;
    
    const networkConfig = enhancedNetworkService.getConfig();
    const maxConcurrent = networkConfig.batchSize || this.config.batchSize;
    
    // Get high priority tasks first
    const highPriorityTasks = this.priorityQueue.filter(t => t.priority === 'high');
    const normalTasks = this.priorityQueue.filter(t => t.priority !== 'high');
    
    // Execute high priority tasks immediately
    for (const task of highPriorityTasks.slice(0, maxConcurrent)) {
      this.executeContentFetch(task);
    }
    
    // Batch normal tasks
    const batch = normalTasks.slice(0, maxConcurrent);
    if (batch.length > 0) {
      await this.executeBatchFetch(batch);
    }
  }

  // Execute single content fetch
  async executeContentFetch(task) {
    const { id, contentKey, retryCount } = task;
    
    // Remove from queue
    this.priorityQueue = this.priorityQueue.filter(t => t.id !== id);
    
    // Check if already fetching
    if (this.activeFetches.has(contentKey)) {
      // Wait for existing fetch
      const existingFetch = this.activeFetches.get(contentKey);
      const result = await existingFetch;
      task.resolve(result);
      return;
    }

    try {
      const startTime = performance.now();
      
      // Create fetch promise
      const fetchPromise = this.performContentFetch(contentKey);
      this.activeFetches.set(contentKey, fetchPromise);
      
      const result = await fetchPromise;
      const duration = performance.now() - startTime;
      
      // Cache the result
      this.cacheContent(contentKey, result);
      
      // Update metrics
      this.updateLoadTimeMetrics(duration);
      
      // Track user behavior
      this.trackContentView(contentKey);
      
      task.resolve(result);
      
    } catch (error) {
      if (retryCount < this.config.retryAttempts && this.shouldRetry(error)) {
        // Retry with exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, retryCount);
        setTimeout(() => {
          task.retryCount++;
          this.priorityQueue.unshift(task);
          this.processPriorityQueue();
        }, delay);
      } else {
        task.reject(error);
      }
    } finally {
      this.activeFetches.delete(contentKey);
    }
  }

  // Execute batch fetch
  async executeBatchFetch(tasks) {
    const batchPromises = tasks.map(task => this.executeContentFetch(task));
    
    try {
      await Promise.allSettled(batchPromises);
    } catch (error) {
      console.warn('Batch fetch error:', error);
    }
  }

  // Perform actual content fetch
  async performContentFetch(contentKey) {
    // Determine fetch strategy based on content type
    const fetchStrategy = this.getFetchStrategy(contentKey);
    
    // Use network service for actual request
    const response = await enhancedNetworkService.queueRequest({
      url: fetchStrategy.url,
      options: fetchStrategy.options
    }, fetchStrategy.priority);
    
    // Transform response based on content type
    return this.transformContent(response, contentKey);
  }

  // Get fetch strategy based on content type
  getFetchStrategy(contentKey) {
    const [contentType, ...params] = contentKey.split(':');
    
    const strategies = {
      'trending': {
        url: '/api/movies/trending',
        options: { method: 'GET' },
        priority: 'high'
      },
      'popular': {
        url: '/api/movies/popular',
        options: { method: 'GET' },
        priority: 'high'
      },
      'topRated': {
        url: '/api/movies/top-rated',
        options: { method: 'GET' },
        priority: 'medium'
      },
      'upcoming': {
        url: '/api/movies/upcoming',
        options: { method: 'GET' },
        priority: 'medium'
      },
      'genre': {
        url: `/api/movies/genre/${params[0]}`,
        options: { method: 'GET' },
        priority: 'normal'
      },
      'search': {
        url: `/api/search?q=${encodeURIComponent(params[0])}`,
        options: { method: 'GET' },
        priority: 'high'
      },
      'details': {
        url: `/api/movies/${params[0]}/details`,
        options: { method: 'GET' },
        priority: 'high'
      },
      'similar': {
        url: `/api/movies/${params[0]}/similar`,
        options: { method: 'GET' },
        priority: 'normal'
      }
    };
    
    return strategies[contentType] || strategies['trending'];
  }

  // Transform content based on type
  transformContent(response, contentKey) {
    const [contentType] = contentKey.split(':');
    
    // Apply content-specific transformations
    const transformers = {
      'trending': this.transformTrendingContent,
      'popular': this.transformPopularContent,
      'topRated': this.transformTopRatedContent,
      'upcoming': this.transformUpcomingContent,
      'genre': this.transformGenreContent,
      'search': this.transformSearchContent,
      'details': this.transformDetailsContent,
      'similar': this.transformSimilarContent
    };
    
    const transformer = transformers[contentType] || this.transformDefaultContent;
    return transformer(response, contentKey);
  }

  // Content transformers
  transformTrendingContent(response, contentKey) {
    return {
      type: 'trending',
      data: response.data || [],
      timestamp: Date.now(),
      source: contentKey
    };
  }

  transformPopularContent(response, contentKey) {
    return {
      type: 'popular',
      data: response.data || [],
      timestamp: Date.now(),
      source: contentKey
    };
  }

  transformTopRatedContent(response, contentKey) {
    return {
      type: 'topRated',
      data: response.data || [],
      timestamp: Date.now(),
      source: contentKey
    };
  }

  transformUpcomingContent(response, contentKey) {
    return {
      type: 'upcoming',
      data: response.data || [],
      timestamp: Date.now(),
      source: contentKey
    };
  }

  transformGenreContent(response, contentKey) {
    const [, genre] = contentKey.split(':');
    return {
      type: 'genre',
      genre,
      data: response.data || [],
      timestamp: Date.now(),
      source: contentKey
    };
  }

  transformSearchContent(response, contentKey) {
    const [, query] = contentKey.split(':');
    return {
      type: 'search',
      query,
      data: response.data || [],
      timestamp: Date.now(),
      source: contentKey
    };
  }

  transformDetailsContent(response, contentKey) {
    const [, id] = contentKey.split(':');
    return {
      type: 'details',
      id,
      data: response.data || {},
      timestamp: Date.now(),
      source: contentKey
    };
  }

  transformSimilarContent(response, contentKey) {
    const [, id] = contentKey.split(':');
    return {
      type: 'similar',
      id,
      data: response.data || [],
      timestamp: Date.now(),
      source: contentKey
    };
  }

  transformDefaultContent(response, contentKey) {
    return {
      type: 'default',
      data: response.data || [],
      timestamp: Date.now(),
      source: contentKey
    };
  }

  // Smart caching
  cacheContent(contentKey, content) {
    // Check cache size limit
    if (this.contentCache.size >= this.config.maxCacheSize) {
      this.evictOldestCache();
    }
    
    this.contentCache.set(contentKey, {
      data: content,
      timestamp: Date.now(),
      ttl: this.config.cacheTTL,
      accessCount: 1
    });
  }

  getCachedContent(contentKey) {
    const cached = this.contentCache.get(contentKey);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.contentCache.delete(contentKey);
      return null;
    }
    
    // Update access count
    cached.accessCount++;
    
    return cached.data;
  }

  // Predictive loading
  async predictAndPrefetch() {
    const predictions = this.generatePredictions();
    
    for (const prediction of predictions) {
      if (!this.isCached(prediction.contentKey)) {
        await this.fetchContent(prediction.contentKey, {
          priority: prediction.priority,
          prefetch: true
        });
      }
    }
  }

  generatePredictions() {
    const predictions = [];
    
    // Based on user behavior
    const recentViews = Array.from(this.userBehavior.viewedContent).slice(-5);
    const searchHistory = this.userBehavior.searchHistory.slice(-3);
    
    // Predict based on recent views
    recentViews.forEach(contentId => {
      predictions.push({
        contentKey: `similar:${contentId}`,
        priority: 'medium'
      });
    });
    
    // Predict based on search history
    searchHistory.forEach(search => {
      predictions.push({
        contentKey: `search:${search}`,
        priority: 'low'
      });
    });
    
    // Predict based on category preferences
    this.userBehavior.categoryPreferences.forEach((count, category) => {
      if (count > 2) {
        predictions.push({
          contentKey: `genre:${category}`,
          priority: 'medium'
        });
      }
    });
    
    return predictions.slice(0, 5); // Limit predictions
  }

  // User behavior tracking
  trackUserInteraction(event) {
    const contentId = this.extractContentId(event.target);
    if (contentId) {
      this.trackContentView(contentId);
    }
    
    this.userBehavior.lastInteraction = Date.now();
  }

  trackScrollBehavior(event) {
    // Track scroll patterns for predictive loading
    const scrollDepth = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    
    if (scrollDepth > 0.8) {
      // User is near bottom, predict next content
      this.predictAndPrefetch();
    }
  }

  trackContentView(contentId) {
    this.userBehavior.viewedContent.add(contentId);
    
    // Update category preferences
    const category = this.extractCategory(contentId);
    if (category) {
      const currentCount = this.userBehavior.categoryPreferences.get(category) || 0;
      this.userBehavior.categoryPreferences.set(category, currentCount + 1);
    }
    
    // Update time spent
    const now = Date.now();
    const timeSpent = now - this.userBehavior.lastInteraction;
    this.userBehavior.timeSpent.set(contentId, timeSpent);
  }

  // Utility methods
  extractContentId(element) {
    // Extract content ID from DOM element
    return element.closest('[data-content-id]')?.dataset.contentId ||
           element.closest('[data-movie-id]')?.dataset.movieId;
  }

  extractCategory(contentId) {
    // Extract category from content ID
    return contentId.split('-')[0];
  }

  isCached(contentKey) {
    return this.contentCache.has(contentKey) || this.prefetchCache.has(contentKey);
  }

  shouldRetry(error) {
    const retryableErrors = ['NetworkError', 'TimeoutError', 'AbortError'];
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    
    return (
      retryableErrors.includes(error.name) ||
      (error.status && retryableStatuses.includes(error.status)) ||
      error.message.includes('network')
    );
  }

  generateFetchId() {
    return `fetch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  updateLoadTimeMetrics(duration) {
    this.metrics.averageLoadTime = 
      (this.metrics.averageLoadTime * (this.metrics.totalRequests - 1) + duration) / 
      this.metrics.totalRequests;
  }

  evictOldestCache() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, value] of this.contentCache.entries()) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.contentCache.delete(oldestKey);
    }
  }

  cleanupExpiredCache() {
    const now = Date.now();
    
    // Clean main cache
    for (const [key, value] of this.contentCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.contentCache.delete(key);
      }
    }
    
    // Clean prefetch cache
    for (const [key, value] of this.prefetchCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.prefetchCache.delete(key);
      }
    }
  }

  adaptToNetworkQuality(networkInfo) {
    // Adjust cache TTL based on network quality
    const quality = networkInfo.quality;
    
    if (quality === 'slowConnection') {
      this.config.cacheTTL = 60 * 60 * 1000; // 1 hour
      this.config.prefetchTTL = 10 * 60 * 1000; // 10 minutes
    } else if (quality === 'lowQuality') {
      this.config.cacheTTL = 45 * 60 * 1000; // 45 minutes
      this.config.prefetchTTL = 7 * 60 * 1000; // 7 minutes
    } else {
      this.config.cacheTTL = 30 * 60 * 1000; // 30 minutes
      this.config.prefetchTTL = 5 * 60 * 1000; // 5 minutes
    }
  }

  // Get service statistics
  getStats() {
    const cacheHitRate = this.metrics.totalRequests > 0 
      ? this.metrics.cacheHits / this.metrics.totalRequests 
      : 0;
    
    return {
      cache: {
        size: this.contentCache.size,
        hitRate: cacheHitRate,
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses
      },
      prefetch: {
        size: this.prefetchCache.size,
        hits: this.metrics.prefetchHits
      },
      performance: {
        averageLoadTime: this.metrics.averageLoadTime,
        totalRequests: this.metrics.totalRequests
      },
      queue: {
        length: this.priorityQueue.length,
        activeFetches: this.activeFetches.size
      },
      userBehavior: {
        viewedContent: this.userBehavior.viewedContent.size,
        searchHistory: this.userBehavior.searchHistory.length,
        categoryPreferences: this.userBehavior.categoryPreferences.size
      }
    };
  }

  // Cleanup resources
  cleanup() {
    this.contentCache.clear();
    this.prefetchCache.clear();
    this.userBehaviorCache.clear();
    this.priorityQueue = [];
    this.activeFetches.clear();
  }
}

// Create singleton instance
const intelligentContentService = new IntelligentContentService();

// Export the singleton instance
export default intelligentContentService;

// Export utility functions
export const contentUtils = {
  // Fetch content
  fetchContent: (contentKey, options) => intelligentContentService.fetchContent(contentKey, options),
  
  // Predict and prefetch
  predictAndPrefetch: () => intelligentContentService.predictAndPrefetch(),
  
  // Get stats
  getStats: () => intelligentContentService.getStats(),
  
  // Cleanup
  cleanup: () => intelligentContentService.cleanup()
}; 