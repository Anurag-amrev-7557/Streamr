// Network-Optimized API Service for Minimal Network Requirements

import { getApiUrl } from '../config/api';

class NetworkOptimizedApiService {
  constructor() {
    this.baseUrl = getApiUrl();
    this.timeout = 10000; // 10 second timeout
    this.retryAttempts = 2;
    this.retryDelay = 1000; // 1 second delay between retries
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
  }

  // Create fetch with timeout and retry logic
  async fetchWithTimeout(url, options = {}, attempt = 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);
      return response;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.warn(`Request timeout for ${url}`);
        throw new Error('Request timeout - network too slow');
      }

      // Retry logic for network errors
      if (attempt < this.retryAttempts && this.shouldRetry(error)) {
        console.log(`Retrying request (${attempt + 1}/${this.retryAttempts}) for ${url}`);
        await this.delay(this.retryDelay * (attempt + 1)); // Exponential backoff
        return this.fetchWithTimeout(url, options, attempt + 1);
      }

      throw error;
    }
  }

  // Check if error should trigger a retry
  shouldRetry(error) {
    // Retry on network errors, not on 4xx client errors
    return !error.status || (error.status >= 500 && error.status < 600);
  }

  // Simple delay function
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get cached response if available and not expired
  getCachedResponse(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  // Cache response
  setCachedResponse(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Generate cache key
  generateCacheKey(endpoint, params = {}) {
    return `${endpoint}-${JSON.stringify(params)}`;
  }

  // GET request with caching
  async get(endpoint, params = {}, useCache = true) {
    const cacheKey = this.generateCacheKey(endpoint, params);
    
    // Check cache first if enabled
    if (useCache) {
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        console.log(`Serving cached response for ${endpoint}`);
        return cached;
      }
    }

    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${this.baseUrl}${endpoint}${queryString ? `?${queryString}` : ''}`;
      
      const response = await this.fetchWithTimeout(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache successful responses
      if (useCache) {
        this.setCachedResponse(cacheKey, data);
      }
      
      return data;

    } catch (error) {
      console.error(`GET request failed for ${endpoint}:`, error);
      
      // Return cached data as fallback if available
      if (useCache) {
        const cached = this.getCachedResponse(cacheKey);
        if (cached) {
          console.log(`Returning cached fallback for ${endpoint}`);
          return { ...cached, _cached: true, _error: error.message };
        }
      }
      
      throw error;
    }
  }

  // POST request
  async post(endpoint, data = {}) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error(`POST request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // PUT request
  async put(endpoint, data = {}) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const response = await this.fetchWithTimeout(url, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error(`PUT request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // DELETE request
  async delete(endpoint) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const response = await this.fetchWithTimeout(url, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error(`DELETE request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Health check with timeout
  async healthCheck() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/health`, {}, 0);
      return response.ok;
    } catch (error) {
      console.warn('Health check failed:', error.message);
      return false;
    }
  }

  // Test network speed
  async testNetworkSpeed() {
    const startTime = Date.now();
    
    try {
      await this.healthCheck();
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (responseTime < 1000) {
        return 'fast';
      } else if (responseTime < 3000) {
        return 'medium';
      } else {
        return 'slow';
      }
    } catch (error) {
      return 'offline';
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('API cache cleared');
  }

  // Get cache statistics
  getCacheStats() {
    const entries = this.cache.size;
    const totalSize = JSON.stringify(Array.from(this.cache.entries())).length;
    
    return {
      entries,
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      oldestEntry: entries > 0 ? new Date(Math.min(...Array.from(this.cache.values()).map(v => v.timestamp))) : null,
      newestEntry: entries > 0 ? new Date(Math.max(...Array.from(this.cache.values()).map(v => v.timestamp))) : null
    };
  }

  // Update timeout settings based on network conditions
  updateTimeoutSettings(networkSpeed) {
    switch (networkSpeed) {
      case 'fast':
        this.timeout = 5000;
        this.retryAttempts = 1;
        this.retryDelay = 500;
        break;
      case 'medium':
        this.timeout = 10000;
        this.retryAttempts = 2;
        this.retryDelay = 1000;
        break;
      case 'slow':
        this.timeout = 15000;
        this.retryAttempts = 3;
        this.retryDelay = 2000;
        break;
      default:
        this.timeout = 20000;
        this.retryAttempts = 1;
        this.retryDelay = 5000;
    }
    
    console.log(`Updated timeout settings for ${networkSpeed} network:`, {
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      retryDelay: this.retryDelay
    });
  }
}

// Create and export instance
const networkOptimizedApi = new NetworkOptimizedApiService();

// Auto-detect network speed on initialization
networkOptimizedApi.testNetworkSpeed().then(speed => {
  networkOptimizedApi.updateTimeoutSettings(speed);
});

export default networkOptimizedApi; 