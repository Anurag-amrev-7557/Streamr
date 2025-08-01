// Network connectivity utilities for testing and monitoring

/**
 * Test network connectivity using multiple methods
 */
export const testNetworkConnectivity = async () => {
  const results = {
    navigatorOnline: navigator.onLine,
    methods: [],
    overall: false
  };

  const connectivityChecks = [
    {
      name: 'Browser Online Status',
      test: () => navigator.onLine
    },
    {
      name: 'Backend Health Check',
      test: async () => {
        try {
          const response = await fetch('/api/health', {
            method: 'HEAD',
            cache: 'no-cache'
          });
          return response.ok;
        } catch (error) {
          return false;
        }
      }
    },
    {
      name: 'HTTPBin Status',
      test: async () => {
        try {
          const response = await fetch('https://httpbin.org/status/200', {
            method: 'HEAD',
            cache: 'no-cache'
          });
          return response.ok;
        } catch (error) {
          return false;
        }
      }
    },
    {
      name: 'JSONPlaceholder',
      test: async () => {
        try {
          const response = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
            method: 'HEAD',
            cache: 'no-cache'
          });
          return response.ok;
        } catch (error) {
          return false;
        }
      }
    }
  ];

  for (const check of connectivityChecks) {
    try {
      const result = await check.test();
      results.methods.push({
        name: check.name,
        success: result,
        timestamp: new Date().toISOString()
      });
      
      if (result) {
        results.overall = true;
      }
    } catch (error) {
      results.methods.push({
        name: check.name,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  return results;
};

/**
 * Check network connectivity (alias for testNetworkConnectivity)
 */
export const checkNetworkConnectivity = async () => {
  const results = await testNetworkConnectivity();
  return {
    isConnected: results.overall,
    details: results
  };
};

/**
 * Monitor network status changes
 */
export const createNetworkMonitor = (onStatusChange) => {
  let isOnline = navigator.onLine;
  
  const handleOnline = () => {
    if (!isOnline) {
      isOnline = true;
      onStatusChange({ online: true, timestamp: new Date().toISOString() });
    }
  };

  const handleOffline = () => {
    if (isOnline) {
      isOnline = false;
      onStatusChange({ online: false, timestamp: new Date().toISOString() });
    }
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

/**
 * Network monitor instance with listener support
 */
export const networkMonitor = {
  listeners: new Set(),
  
  addListener: (callback) => {
    networkMonitor.listeners.add(callback);
    return () => networkMonitor.listeners.delete(callback);
  },
  
  notifyListeners: (status) => {
    networkMonitor.listeners.forEach(callback => callback(status));
  }
};

// Initialize network monitor
if (typeof window !== 'undefined') {
  const cleanup = createNetworkMonitor((status) => {
    networkMonitor.notifyListeners(status);
  });
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanup);
}

/**
 * Simulate network errors for testing
 */
export const simulateNetworkError = (errorType) => {
  const errors = {
    CONNECTION_RESET: new Error('Connection reset by peer'),
    TIMEOUT: new Error('Request timeout'),
    DNS_FAILURE: new Error('DNS resolution failed'),
    SSL_ERROR: new Error('SSL certificate error'),
    NETWORK_UNREACHABLE: new Error('Network unreachable'),
    HOST_UNREACHABLE: new Error('Host unreachable')
  };
  
  const error = errors[errorType] || new Error('Unknown network error');
  error.type = errorType;
  return error;
};

/**
 * Classify network errors
 */
export const classifyNetworkError = (error) => {
  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';
  
  if (message.includes('timeout') || name.includes('timeout')) {
    return { type: 'TIMEOUT', retryable: true, delay: 1000 };
  }
  
  if (message.includes('dns') || message.includes('resolve')) {
    return { type: 'DNS_FAILURE', retryable: true, delay: 2000 };
  }
  
  if (message.includes('ssl') || message.includes('certificate')) {
    return { type: 'SSL_ERROR', retryable: false, delay: 0 };
  }
  
  if (message.includes('reset') || message.includes('connection')) {
    return { type: 'CONNECTION_RESET', retryable: true, delay: 1500 };
  }
  
  if (message.includes('unreachable') || message.includes('network')) {
    return { type: 'NETWORK_UNREACHABLE', retryable: true, delay: 3000 };
  }
  
  return { type: 'UNKNOWN', retryable: true, delay: 1000 };
};

/**
 * Calculate retry delay based on attempt and error type
 */
export const calculateRetryDelay = (attempt, errorType = 'unknown') => {
  const baseDelays = {
    TIMEOUT: 1000,
    DNS_FAILURE: 2000,
    SSL_ERROR: 0,
    CONNECTION_RESET: 1500,
    NETWORK_UNREACHABLE: 3000,
    UNKNOWN: 1000
  };
  
  const baseDelay = baseDelays[errorType] || 1000;
  const exponentialBackoff = Math.min(baseDelay * Math.pow(2, attempt - 1), 30000);
  const jitter = Math.random() * 1000;
  
  return exponentialBackoff + jitter;
};

/**
 * Enhanced fetch with retry logic
 */
export const fetchWithRetry = async (url, options = {}, retryConfig = {}) => {
  const {
    maxRetries = 3,
    timeout = 10000,
    retryableErrors = ['TIMEOUT', 'CONNECTION_RESET', 'DNS_FAILURE']
  } = retryConfig;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      const classification = classifyNetworkError(error);
      
      if (!retryableErrors.includes(classification.type)) {
        break;
      }
      
      const delay = calculateRetryDelay(attempt, classification.type);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * Get network information
 */
export const getNetworkInfo = () => {
  return {
    online: navigator.onLine,
    connectionType: navigator.connection?.effectiveType || 'unknown',
    downlink: navigator.connection?.downlink || 'unknown',
    rtt: navigator.connection?.rtt || 'unknown',
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  };
};

// Export for browser console testing
if (typeof window !== 'undefined') {
  window.testNetworkConnectivity = testNetworkConnectivity;
  window.checkNetworkConnectivity = checkNetworkConnectivity;
  window.getNetworkInfo = getNetworkInfo;
  window.createNetworkMonitor = createNetworkMonitor;
  window.simulateNetworkError = simulateNetworkError;
  window.classifyNetworkError = classifyNetworkError;
  window.calculateRetryDelay = calculateRetryDelay;
  window.fetchWithRetry = fetchWithRetry;
  
  console.log('🌐 Network utilities available:');
  console.log('- testNetworkConnectivity()');
  console.log('- checkNetworkConnectivity()');
  console.log('- getNetworkInfo()');
  console.log('- createNetworkMonitor(callback)');
  console.log('- simulateNetworkError(type)');
  console.log('- classifyNetworkError(error)');
  console.log('- calculateRetryDelay(attempt, errorType)');
  console.log('- fetchWithRetry(url, options, retryConfig)');
} 