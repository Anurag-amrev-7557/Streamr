// Enhanced API Service with Intelligent Request Management
import advancedCache from './advancedCacheService.js';
import performanceMonitor from './performanceMonitor.js';
import { getApiUrl } from '../config/api';

class EnhancedApiService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || getApiUrl();
    this.requestQueue = [];
    this.activeRequests = new Map();
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      retryableStatuses: [408, 429, 500, 502, 503, 504],
      retryableErrors: ['NetworkError', 'TimeoutError', 'AbortError']
    };
    
    this.cacheConfig = {
      enabled: true,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      compress: true
    };
    
    this.rateLimitConfig = {
      maxRequests: 100,
      windowMs: 60 * 1000, // 1 minute
      currentRequests: 0,
      resetTime: Date.now()
    };
    
    this.setupInterceptors();
  }

  // Setup request/response interceptors
  setupInterceptors() {
    // Request interceptor
    this.requestInterceptor = (config) => {
      const startTime = performance.now();
      config.metadata = {
        startTime,
        retryCount: 0,
        cacheKey: this.generateCacheKey(config),
        isRetry: false
      };
      
      // Add authentication header
      const token = this.getAuthToken();
      if (token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${token}`
        };
      }
      
      // Add request ID for tracking
      config.headers = {
        ...config.headers,
        'X-Request-ID': this.generateRequestId(),
        'X-Client-Version': '1.0.0'
      };
      
      return config;
    };

    // Response interceptor
    this.responseInterceptor = (response) => {
      const duration = performance.now() - response.config.metadata.startTime;
      
      // Track API call performance
      performanceMonitor.trackApiCall(
        response.config.url,
        response.config.method,
        duration,
        response.status,
        response.data ? JSON.stringify(response.data).length : 0
      );
      
      // Cache successful responses
      if (this.cacheConfig.enabled && response.status === 200) {
        this.cacheResponse(response);
      }
      
      return response;
    };

    // Error interceptor
    this.errorInterceptor = (error) => {
      const duration = performance.now() - (error.config?.metadata?.startTime || Date.now());
      
      // Track failed API call
      performanceMonitor.trackApiCall(
        error.config?.url || 'unknown',
        error.config?.method || 'unknown',
        duration,
        error.response?.status || 0,
        0
      );
      
      // Track error
      performanceMonitor.trackError(error, {
        type: 'api_error',
        endpoint: error.config?.url,
        method: error.config?.method
      });
      
      return Promise.reject(error);
    };
  }

  // Generate cache key for request
  generateCacheKey(config) {
    const { url, method, params, data } = config;
    const keyData = {
      url,
      method,
      params: params || {},
      data: data || {}
    };
    
    return `api:${method}:${url}:${JSON.stringify(keyData)}`;
  }

  // Generate unique request ID
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get authentication token
  getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

  // Enhanced request method with intelligent caching and retry logic
  async request(config) {
    const enhancedConfig = this.requestInterceptor(config);
    
    // Check cache first
    if (this.cacheConfig.enabled && enhancedConfig.method?.toLowerCase() === 'get') {
      const cachedResponse = this.getCachedResponse(enhancedConfig);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Check rate limits
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    // Queue request if too many active requests
    if (this.activeRequests.size >= 10) {
      return this.queueRequest(enhancedConfig);
    }
    
    return this.executeRequest(enhancedConfig);
  }

  // Execute request with retry logic
  async executeRequest(config, retryCount = 0) {
    const requestId = config.headers['X-Request-ID'];
    this.activeRequests.set(requestId, config);
    
    try {
      const response = await this.makeRequest(config);
      this.activeRequests.delete(requestId);
      
      return this.responseInterceptor(response);
    } catch (error) {
      this.activeRequests.delete(requestId);
      
      // Check if we should retry
      if (this.shouldRetry(error, retryCount)) {
        return this.retryRequest(config, retryCount + 1);
      }
      
      throw this.errorInterceptor(error);
    }
  }

  // Make the actual HTTP request
  async makeRequest(config) {
    const { url, method = 'GET', headers = {}, data, params } = config;
    
    const requestConfig = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      requestConfig.body = JSON.stringify(data);
    }
    
    if (params) {
      const urlWithParams = new URL(url, this.baseURL);
      Object.keys(params).forEach(key => {
        urlWithParams.searchParams.append(key, params[key]);
      });
      config.url = urlWithParams.toString();
    }
    
    const fullUrl = config.url.startsWith('http') ? config.url : `${this.baseURL}${config.url}`;
    
    const response = await fetch(fullUrl, requestConfig);
    
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.response = response;
      error.status = response.status;
      throw error;
    }
    
    const responseData = await response.json();
    
    return {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      config
    };
  }

  // Check if request should be retried
  shouldRetry(error, retryCount) {
    if (retryCount >= this.retryConfig.maxRetries) {
      return false;
    }
    
    // Check if error is retryable
    const isRetryableStatus = error.status && this.retryConfig.retryableStatuses.includes(error.status);
    const isRetryableError = error.name && this.retryConfig.retryableErrors.includes(error.name);
    const isNetworkError = error.message && error.message.includes('network');
    
    return isRetryableStatus || isRetryableError || isNetworkError;
  }

  // Retry request with exponential backoff
  async retryRequest(config, retryCount) {
    const delay = this.calculateRetryDelay(retryCount);
    
    console.warn(`Retrying request ${config.url} (attempt ${retryCount + 1}/${this.retryConfig.maxRetries + 1}) in ${delay}ms`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    config.metadata.retryCount = retryCount;
    config.metadata.isRetry = true;
    
    return this.executeRequest(config, retryCount);
  }

  // Calculate retry delay with exponential backoff and jitter
  calculateRetryDelay(retryCount) {
    const exponentialDelay = this.retryConfig.baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, this.retryConfig.maxDelay);
  }

  // Check rate limits
  checkRateLimit() {
    const now = Date.now();
    
    // Reset counter if window has passed
    if (now - this.rateLimitConfig.resetTime > this.rateLimitConfig.windowMs) {
      this.rateLimitConfig.currentRequests = 0;
      this.rateLimitConfig.resetTime = now;
    }
    
    if (this.rateLimitConfig.currentRequests >= this.rateLimitConfig.maxRequests) {
      return false;
    }
    
    this.rateLimitConfig.currentRequests++;
    return true;
  }

  // Queue request for later execution
  async queueRequest(config) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        config,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      // Process queue periodically
      setTimeout(() => {
        this.processQueue();
      }, 100);
    });
  }

  // Process queued requests
  processQueue() {
    while (this.requestQueue.length > 0 && this.activeRequests.size < 10) {
      const queuedRequest = this.requestQueue.shift();
      
      this.executeRequest(queuedRequest.config)
        .then(queuedRequest.resolve)
        .catch(queuedRequest.reject);
    }
  }

  // Get cached response
  getCachedResponse(config) {
    const cacheKey = config.metadata.cacheKey;
    const cached = advancedCache.get(cacheKey, {
      namespace: 'api',
      params: { ttl: this.cacheConfig.defaultTTL }
    });
    
    if (cached) {
      console.debug(`Cache hit for ${config.url}`);
      return cached;
    }
    
    return null;
  }

  // Cache response
  cacheResponse(response) {
    const cacheKey = response.config.metadata.cacheKey;
    
    advancedCache.set(cacheKey, response.data, {
      namespace: 'api',
      ttl: this.cacheConfig.defaultTTL,
      priority: 'normal',
      compress: this.cacheConfig.compress
    });
  }

  // Enhanced GET request
  async get(url, params = {}, options = {}) {
    return this.request({
      url,
      method: 'GET',
      params,
      ...options
    });
  }

  // Enhanced POST request
  async post(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'POST',
      data,
      ...options
    });
  }

  // Enhanced PUT request
  async put(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'PUT',
      data,
      ...options
    });
  }

  // Enhanced DELETE request
  async delete(url, options = {}) {
    return this.request({
      url,
      method: 'DELETE',
      ...options
    });
  }

  // Enhanced PATCH request
  async patch(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'PATCH',
      data,
      ...options
    });
  }

  // Batch requests
  async batch(requests) {
    const promises = requests.map(request => {
      return this.request(request).catch(error => ({
        error: error.message,
        status: error.status || 500
      }));
    });
    
    return Promise.all(promises);
  }

  // Upload file with progress tracking
  async uploadFile(url, file, onProgress = null, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    const config = {
      url,
      method: 'POST',
      data: formData,
      headers: {
        // Don't set Content-Type for FormData
      },
      ...options
    };
    
    // Add progress tracking if supported
    if (onProgress && typeof XMLHttpRequest !== 'undefined') {
      return this.uploadWithProgress(config, onProgress);
    }
    
    return this.request(config);
  }

  // Upload with progress tracking
  uploadWithProgress(config, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete, event.loaded, event.total);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch {
            resolve(xhr.responseText);
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });
      
      xhr.open(config.method, `${this.baseURL}${config.url}`);
      
      // Add headers
      Object.keys(config.headers || {}).forEach(key => {
        xhr.setRequestHeader(key, config.headers[key]);
      });
      
      xhr.send(config.data);
    });
  }

  // Clear cache for specific endpoint
  clearCache(pattern = null) {
    if (pattern) {
      return advancedCache.invalidate({
        namespace: 'api',
        pattern: new RegExp(pattern)
      });
    } else {
      return advancedCache.invalidate({ namespace: 'api' });
    }
  }

  // Get request statistics
  getStats() {
    return {
      activeRequests: this.activeRequests.size,
      queuedRequests: this.requestQueue.length,
      rateLimit: {
        current: this.rateLimitConfig.currentRequests,
        max: this.rateLimitConfig.maxRequests,
        resetTime: this.rateLimitConfig.resetTime
      },
      cache: advancedCache.getStats()
    };
  }

  // Cleanup resources
  cleanup() {
    this.activeRequests.clear();
    this.requestQueue = [];
  }
}

// Create singleton instance
const enhancedApiService = new EnhancedApiService();

// Export the singleton instance
export default enhancedApiService;

// Export utility functions
export const apiUtils = {
  // GET request
  get: (url, params, options) => enhancedApiService.get(url, params, options),
  
  // POST request
  post: (url, data, options) => enhancedApiService.post(url, data, options),
  
  // PUT request
  put: (url, data, options) => enhancedApiService.put(url, data, options),
  
  // DELETE request
  delete: (url, options) => enhancedApiService.delete(url, options),
  
  // PATCH request
  patch: (url, data, options) => enhancedApiService.patch(url, data, options),
  
  // Batch requests
  batch: (requests) => enhancedApiService.batch(requests),
  
  // Upload file
  uploadFile: (url, file, onProgress, options) => 
    enhancedApiService.uploadFile(url, file, onProgress, options),
  
  // Clear cache
  clearCache: (pattern) => enhancedApiService.clearCache(pattern),
  
  // Get stats
  getStats: () => enhancedApiService.getStats(),
  
  // Cleanup
  cleanup: () => enhancedApiService.cleanup()
}; 