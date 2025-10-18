// Enhanced Network Optimization Service
class EnhancedNetworkOptimizationService {
  constructor() {
    this.config = {
      // Request batching
      batchingEnabled: true,
      batchDelay: 100, // ms
      maxBatchSize: 10,
      
      // Request queuing
      queuingEnabled: true,
      maxQueueSize: 50,
      queueTimeout: 30000, // 30 seconds
      
      // Adaptive strategies
      adaptiveEnabled: true,
      performanceThreshold: 0.7,
      networkQualityThreshold: 0.8,
      
      // Caching strategies
      cacheEnabled: true,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      maxCacheSize: 1000,
      
      // Retry strategies
      retryEnabled: true,
      maxRetries: 3,
      retryDelay: 1000, // 1 second
      exponentialBackoff: true,
      
      // Connection management
      maxConcurrentRequests: 6,
      requestTimeout: 10000, // 10 seconds
      keepAlive: true,
      
      // Analytics
      analyticsEnabled: true,
      debugMode: import.meta.env.DEV
    };
    
    this.state = {
      isInitialized: false,
      isOnline: navigator.onLine,
      networkQuality: 1.0,
      devicePerformance: 1.0,
      
      // Request management
      activeRequests: new Map(),
      requestQueue: [],
      requestBatches: new Map(),
      
      // Caching
      requestCache: new Map(),
      cacheTimestamps: new Map(),
      
      // Performance tracking
      stats: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        cachedRequests: 0,
        averageResponseTime: 0,
        totalResponseTime: 0,
        networkErrors: 0,
        timeoutErrors: 0
      },
      
      // Adaptive state
      adaptiveState: {
        currentStrategy: 'normal',
        performanceHistory: [],
        networkHistory: [],
        lastAdaptation: 0
      },
      
      // Event listeners
      listeners: new Map(),
      
      // Background processes
      intervals: new Set(),
      timeouts: new Set()
    };
    
    // Initialize asynchronously
    this.initialize().catch(error => {
      console.error('Enhanced Network Optimization Service initialization failed:', error);
    });
  }

  // Initialize the service
  async initialize() {
    try {
      console.log('🌐 Initializing Enhanced Network Optimization Service...');
      
      // Initialize caches
      this.initializeCaches();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start background processes
      this.startBackgroundProcesses();
      
      // Measure device performance
      await this.measureDevicePerformance();
      
      // Mark as initialized
      this.state.isInitialized = true;
      
      console.log('✅ Enhanced Network Optimization Service initialized');
      
      // Emit initialization complete event
      this.emit('initialized', this.getStats());
      
    } catch (error) {
      console.error('Failed to initialize Enhanced Network Optimization Service:', error);
      throw error;
    }
  }

  // Initialize caches
  initializeCaches() {
    if (this.config.cacheEnabled) {
      this.state.requestCache = new Map();
      this.state.cacheTimestamps = new Map();
    }
  }

  // Setup event listeners
  setupEventListeners() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.handleOnline();
    });
    
    window.addEventListener('offline', () => {
      this.handleOffline();
    });
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handlePageHidden();
      } else {
        this.handlePageVisible();
      }
    });
    
    // Listen for network quality changes
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', () => {
        this.handleNetworkChange();
      });
    }
  }

  // Start background processes
  startBackgroundProcesses() {
    // Cache cleanup interval
    const cacheCleanupInterval = setInterval(() => {
      this.cleanupCache();
    }, 60 * 1000); // Every minute
    
    // Adaptive optimization interval
    const adaptiveInterval = setInterval(() => {
      this.performAdaptiveOptimization();
    }, 30 * 1000); // Every 30 seconds
    
    // Queue processing interval
    const queueInterval = setInterval(() => {
      this.processQueue();
    }, 100); // Every 100ms
    
    // Store intervals for cleanup
    this.state.intervals.add(cacheCleanupInterval);
    this.state.intervals.add(adaptiveInterval);
    this.state.intervals.add(queueInterval);
  }

  // Measure device performance
  async measureDevicePerformance() {
    try {
      // Measure basic performance metrics
      const startTime = performance.now();
      
      // Simple performance test
      let testResult = 0;
      for (let i = 0; i < 1000; i++) {
        testResult += Math.random();
      }
      
      const endTime = performance.now();
      const performanceTime = endTime - startTime;
      
      // Normalize performance (lower is better)
      this.state.devicePerformance = Math.max(0.1, Math.min(1.0, 1000 / performanceTime));
      
      // Adjust configuration based on device performance
      this.adjustConfigurationForPerformance();
      
    } catch (error) {
      console.warn('Failed to measure device performance:', error);
      this.state.devicePerformance = 0.5; // Default to medium performance
    }
  }

  // Adjust configuration based on device performance
  adjustConfigurationForPerformance() {
    const performance = this.state.devicePerformance;
    
    if (performance < 0.3) {
      // Low performance device
      this.config.maxConcurrentRequests = 2;
      this.config.requestTimeout = 15000;
      this.config.batchDelay = 200;
      this.config.maxBatchSize = 5;
    } else if (performance < 0.7) {
      // Medium performance device
      this.config.maxConcurrentRequests = 4;
      this.config.requestTimeout = 12000;
      this.config.batchDelay = 150;
      this.config.maxBatchSize = 8;
    } else {
      // High performance device
      this.config.maxConcurrentRequests = 6;
      this.config.requestTimeout = 10000;
      this.config.batchDelay = 100;
      this.config.maxBatchSize = 10;
    }
  }

  // Make optimized request
  async makeRequest(url, options = {}) {
    if (!this.state.isInitialized) {
      throw new Error('Network Optimization Service not initialized');
    }
    
    const startTime = performance.now();
    this.state.stats.totalRequests++;
    
    // Check cache first
    if (this.config.cacheEnabled) {
      const cachedResponse = this.getFromCache(url, options);
      if (cachedResponse) {
        this.state.stats.cachedRequests++;
        return cachedResponse;
      }
    }
    
    // Check if we should batch this request
    if (this.config.batchingEnabled && this.shouldBatchRequest(url, options)) {
      return this.batchRequest(url, options);
    }
    
    // Check if we should queue this request
    if (this.config.queuingEnabled && this.shouldQueueRequest()) {
      return this.queueRequest(url, options);
    }
    
    // Make the request
    return this.performRequest(url, options, startTime);
  }

  // Check if request should be batched
  shouldBatchRequest(url, options) {
    // Only batch GET requests
    if (options.method && options.method.toUpperCase() !== 'GET') {
      return false;
    }
    
    // Check if there's already a batch for this endpoint
    const endpoint = this.getEndpoint(url);
    const existingBatch = this.state.requestBatches.get(endpoint);
    
    return existingBatch && existingBatch.requests.length < this.config.maxBatchSize;
  }

  // Check if request should be queued
  shouldQueueRequest() {
    return this.state.activeRequests.size >= this.config.maxConcurrentRequests;
  }

  // Batch request
  async batchRequest(url, options) {
    const endpoint = this.getEndpoint(url);
    let batch = this.state.requestBatches.get(endpoint);
    
    if (!batch) {
      batch = {
        requests: [],
        timer: null,
        promise: null
      };
      this.state.requestBatches.set(endpoint, batch);
    }
    
    // Create promise for this request
    const requestPromise = new Promise((resolve, reject) => {
      batch.requests.push({
        url,
        options,
        resolve,
        reject,
        timestamp: Date.now()
      });
    });
    
    // Start batch timer if not already started
    if (!batch.timer) {
      batch.timer = setTimeout(() => {
        this.executeBatch(endpoint);
      }, this.config.batchDelay);
    }
    
    return requestPromise;
  }

  // Execute batch
  async executeBatch(endpoint) {
    const batch = this.state.requestBatches.get(endpoint);
    if (!batch || batch.requests.length === 0) return;
    
    // Clear timer
    if (batch.timer) {
      clearTimeout(batch.timer);
      batch.timer = null;
    }
    
    // Get all requests in this batch
    const requests = batch.requests;
    this.state.requestBatches.delete(endpoint);
    
    try {
      // Execute all requests in parallel
      const results = await Promise.allSettled(
        requests.map(req => this.performRequest(req.url, req.options))
      );
      
      // Resolve/reject each request
      results.forEach((result, index) => {
        const request = requests[index];
        if (result.status === 'fulfilled') {
          request.resolve(result.value);
        } else {
          request.reject(result.reason);
        }
      });
      
    } catch (error) {
      // Reject all requests if batch fails
      requests.forEach(request => {
        request.reject(error);
      });
    }
  }

  // Queue request
  async queueRequest(url, options) {
    return new Promise((resolve, reject) => {
      const queueItem = {
        url,
        options,
        resolve,
        reject,
        timestamp: Date.now()
      };
      
      this.state.requestQueue.push(queueItem);
      
      // Set timeout for queued items
      const timeout = setTimeout(() => {
        const index = this.state.requestQueue.findIndex(item => item === queueItem);
        if (index !== -1) {
          this.state.requestQueue.splice(index, 1);
          reject(new Error('Request queue timeout'));
        }
      }, this.config.queueTimeout);
      
      // Store timeout for cleanup
      queueItem.timeout = timeout;
    });
  }

  // Process queue
  processQueue() {
    if (this.state.requestQueue.length === 0) return;
    
    // Check if we can process more requests
    if (this.state.activeRequests.size >= this.config.maxConcurrentRequests) {
      return;
    }
    
    // Get the oldest queued request
    const queueItem = this.state.requestQueue.shift();
    
    // Clear timeout
    if (queueItem.timeout) {
      clearTimeout(queueItem.timeout);
    }
    
    // Process the request
    this.performRequest(queueItem.url, queueItem.options)
      .then(queueItem.resolve)
      .catch(queueItem.reject);
  }

  // Perform actual request
  async performRequest(url, options, startTime) {
    const requestId = this.generateRequestId();
    this.state.activeRequests.set(requestId, { url, startTime });
    
    try {
      // Apply adaptive strategies
      const adaptedOptions = this.adaptRequestOptions(options);
      
      // Make the request with retry logic
      const response = await this.makeRequestWithRetry(url, adaptedOptions);
      
      // Calculate response time
      const responseTime = performance.now() - startTime;
      this.updateStats(responseTime, true);
      
      // Cache successful responses
      if (this.config.cacheEnabled && this.shouldCacheResponse(response, options)) {
        this.addToCache(url, options, response);
      }
      
      // Emit success event
      this.emit('requestSuccess', {
        url,
        responseTime,
        response
      });
      
      return response;
      
    } catch (error) {
      this.updateStats(0, false, error);
      
      // Emit error event
      this.emit('requestError', {
        url,
        error: error.message
      });
      
      throw error;
      
    } finally {
      this.state.activeRequests.delete(requestId);
      
      // Process queue if there are pending requests
      this.processQueue();
    }
  }

  // Make request with retry logic
  async makeRequestWithRetry(url, options, attempt = 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (this.config.retryEnabled && attempt < this.config.maxRetries) {
        // Calculate delay with exponential backoff
        const delay = this.config.exponentialBackoff 
          ? this.config.retryDelay * Math.pow(2, attempt - 1)
          : this.config.retryDelay;
        
        await this.delay(delay);
        return this.makeRequestWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  // Adapt request options based on current state
  adaptRequestOptions(options) {
    const adaptedOptions = { ...options };
    
    // Add timeout
    if (!adaptedOptions.signal) {
      const controller = new AbortController();
      adaptedOptions.signal = controller.signal;
      
      // Set timeout
      setTimeout(() => {
        controller.abort();
      }, this.config.requestTimeout);
    }
    
    // Add headers for better caching
    if (!adaptedOptions.headers) {
      adaptedOptions.headers = {};
    }
    
    // Add cache control headers
    if (this.config.cacheEnabled) {
      adaptedOptions.headers['Cache-Control'] = 'max-age=300'; // 5 minutes
    }
    
    return adaptedOptions;
  }

  // Get from cache
  getFromCache(url, options) {
    if (!this.config.cacheEnabled) return null;
    
    const cacheKey = this.generateCacheKey(url, options);
    const cached = this.state.requestCache.get(cacheKey);
    
    if (cached) {
      const timestamp = this.state.cacheTimestamps.get(cacheKey);
      if (timestamp && Date.now() - timestamp < this.config.cacheTTL) {
        return cached;
      } else {
        // Remove expired entry
        this.state.requestCache.delete(key);
        this.state.cacheTimestamps.delete(key);
      }
    }
    
    return null;
  }

  // Add to cache
  addToCache(url, options, response) {
    if (!this.config.cacheEnabled) return;
    
    const cacheKey = this.generateCacheKey(url, options);
    
    // Check cache size
    if (this.state.requestCache.size >= this.config.maxCacheSize) {
      // Remove oldest entries
      const entries = Array.from(this.state.cacheTimestamps.entries());
      entries.sort((a, b) => a[1] - b[1]);
      
      // Remove 20% of oldest entries
      const toRemove = entries.slice(0, Math.floor(entries.length * 0.2));
      toRemove.forEach(([key]) => {
        this.state.requestCache.delete(key);
        this.state.cacheTimestamps.delete(key);
      });
    }
    
    this.state.requestCache.set(cacheKey, response);
    this.state.cacheTimestamps.set(cacheKey, Date.now());
  }

  // Check if response should be cached
  shouldCacheResponse(response, options) {
    // Only cache successful GET requests
    if (options.method && options.method.toUpperCase() !== 'GET') {
      return false;
    }
    
    if (!response.ok) {
      return false;
    }
    
    // Check content type
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return true;
    }
    
    return false;
  }

  // Generate cache key
  generateCacheKey(url, options) {
    const optionsString = JSON.stringify(options);
    return `${url}|${optionsString}`;
  }

  // Generate request ID
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get endpoint from URL
  getEndpoint(url) {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      return url;
    }
  }

  // Update statistics
  updateStats(responseTime, success, error = null) {
    if (success) {
      this.state.stats.successfulRequests++;
      this.state.stats.totalResponseTime += responseTime;
      this.state.stats.averageResponseTime = this.state.stats.totalResponseTime / this.state.stats.successfulRequests;
    } else {
      this.state.stats.failedRequests++;
      
      if (error && error.name === 'AbortError') {
        this.state.stats.timeoutErrors++;
      } else {
        this.state.stats.networkErrors++;
      }
    }
  }

  // Perform adaptive optimization
  performAdaptiveOptimization() {
    if (!this.config.adaptiveEnabled) return;
    
    const now = Date.now();
    if (now - this.state.adaptiveState.lastAdaptation < 60000) return; // Minimum 1 minute between adaptations
    
    this.state.adaptiveState.lastAdaptation = now;
    
    // Analyze current performance
    const performance = this.analyzePerformance();
    const networkQuality = this.analyzeNetworkQuality();
    
    // Update history
    this.state.adaptiveState.performanceHistory.push(performance);
    this.state.adaptiveState.networkHistory.push(networkQuality);
    
    // Keep only recent history
    if (this.state.adaptiveState.performanceHistory.length > 10) {
      this.state.adaptiveState.performanceHistory.shift();
    }
    if (this.state.adaptiveState.networkHistory.length > 10) {
      this.state.adaptiveState.networkHistory.shift();
    }
    
    // Determine new strategy
    const newStrategy = this.determineStrategy(performance, networkQuality);
    
    if (newStrategy !== this.state.adaptiveState.currentStrategy) {
      this.applyStrategy(newStrategy);
      this.state.adaptiveState.currentStrategy = newStrategy;
    }
  }

  // Analyze performance
  analyzePerformance() {
    const { successfulRequests, failedRequests, averageResponseTime } = this.state.stats;
    const totalRequests = successfulRequests + failedRequests;
    
    if (totalRequests === 0) return 1.0;
    
    const successRate = successfulRequests / totalRequests;
    const responseTimeScore = Math.max(0, 1 - (averageResponseTime / 10000)); // Normalize to 10 seconds
    
    return (successRate + responseTimeScore) / 2;
  }

  // Analyze network quality
  analyzeNetworkQuality() {
    if (!navigator.connection) return 1.0;
    
    const connection = navigator.connection;
    let quality = 1.0;
    
    // Adjust based on connection type
    if (connection.effectiveType) {
      switch (connection.effectiveType) {
        case 'slow-2g':
          quality *= 0.2;
          break;
        case '2g':
          quality *= 0.4;
          break;
        case '3g':
          quality *= 0.6;
          break;
        case '4g':
          quality *= 0.8;
          break;
        default:
          quality *= 1.0;
      }
    }
    
    // Adjust based on downlink
    if (connection.downlink) {
      quality *= Math.min(1.0, connection.downlink / 10); // Normalize to 10 Mbps
    }
    
    return quality;
  }

  // Determine strategy
  determineStrategy(performance, networkQuality) {
    const overallQuality = (performance + networkQuality) / 2;
    
    if (overallQuality < 0.3) {
      return 'conservative';
    } else if (overallQuality < 0.7) {
      return 'balanced';
    } else {
      return 'aggressive';
    }
  }

  // Apply strategy
  applyStrategy(strategy) {
    console.log(`🌐 Applying network strategy: ${strategy}`);
    
    switch (strategy) {
      case 'conservative':
        this.config.maxConcurrentRequests = 2;
        this.config.requestTimeout = 15000;
        this.config.batchDelay = 200;
        this.config.maxBatchSize = 3;
        break;
        
      case 'balanced':
        this.config.maxConcurrentRequests = 4;
        this.config.requestTimeout = 12000;
        this.config.batchDelay = 150;
        this.config.maxBatchSize = 6;
        break;
        
      case 'aggressive':
        this.config.maxConcurrentRequests = 6;
        this.config.requestTimeout = 10000;
        this.config.batchDelay = 100;
        this.config.maxBatchSize = 10;
        break;
    }
  }

  // Handle online
  handleOnline() {
    this.state.isOnline = true;
    this.state.networkQuality = 1.0;
    
    // Restore aggressive settings
    this.applyStrategy('aggressive');
    
    // Process queued requests
    this.processQueue();
    
    this.emit('online');
  }

  // Handle offline
  handleOffline() {
    this.state.isOnline = false;
    this.state.networkQuality = 0.1;
    
    // Apply conservative settings
    this.applyStrategy('conservative');
    
    this.emit('offline');
  }

  // Handle page hidden
  handlePageHidden() {
    // Reduce concurrent requests
    this.config.maxConcurrentRequests = Math.max(1, this.config.maxConcurrentRequests - 1);
  }

  // Handle page visible
  handlePageVisible() {
    // Restore concurrent requests
    this.config.maxConcurrentRequests = Math.min(6, this.config.maxConcurrentRequests + 1);
  }

  // Handle network change
  handleNetworkChange() {
    if (navigator.connection) {
      this.state.networkQuality = this.analyzeNetworkQuality();
      this.performAdaptiveOptimization();
    }
  }

  // Cleanup cache
  cleanupCache() {
    if (!this.config.cacheEnabled) return;
    
    const now = Date.now();
    
    for (const [key, timestamp] of this.state.cacheTimestamps.entries()) {
      if (now - timestamp > this.config.cacheTTL) {
        this.state.requestCache.delete(key);
        this.state.cacheTimestamps.delete(key);
      }
    }
  }

  // Utility function for delay
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Event system
  on(event, callback) {
    if (!this.state.listeners.has(event)) {
      this.state.listeners.set(event, new Set());
    }
    this.state.listeners.get(event).add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.state.listeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  emit(event, data) {
    const listeners = this.state.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.warn('Event listener error:', error);
        }
      });
    }
  }

  // Get statistics
  getStats() {
    return {
      ...this.state.stats,
      isOnline: this.state.isOnline,
      networkQuality: this.state.networkQuality,
      devicePerformance: this.state.devicePerformance,
      activeRequests: this.state.activeRequests.size,
      queuedRequests: this.state.requestQueue.length,
      cachedRequests: this.state.requestCache.size,
      currentStrategy: this.state.adaptiveState.currentStrategy
    };
  }

  // Clear all caches
  clearAllCaches() {
    this.state.requestCache.clear();
    this.state.cacheTimestamps.clear();
  }

  // Destroy the service
  destroy() {
    console.log('🗑️ Destroying Enhanced Network Optimization Service...');
    
    // Clear all caches
    this.clearAllCaches();
    
    // Clear all intervals and timeouts
    this.state.intervals.forEach(clearInterval);
    this.state.timeouts.forEach(clearTimeout);
    this.state.intervals.clear();
    this.state.timeouts.clear();
    
    // Clear all listeners
    this.state.listeners.clear();
    
    // Clear all state
    this.state = null;
    
    console.log('✅ Enhanced Network Optimization Service destroyed');
  }
}

// Create singleton instance
const enhancedNetworkOptimizationService = new EnhancedNetworkOptimizationService();

// Auto-initialize in development
if (import.meta.env.DEV) {
  // Add to window for debugging
  window.enhancedNetworkOptimizationService = enhancedNetworkOptimizationService;
}

export default enhancedNetworkOptimizationService; 