// Network Optimizer Utility for better timeout handling and network reliability

// Enhanced timeout configuration
const NETWORK_CONFIG = {
  BASE_TIMEOUT: 25000, // 25 seconds base timeout
  RETRY_TIMEOUT: 30000, // 30 seconds for retries
  HEALTH_CHECK_TIMEOUT: 5000, // 5 seconds for health checks
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  BACKOFF_MULTIPLIER: 2,
  CONNECTIVITY_CHECK_INTERVAL: 10000, // 10 seconds
};

// Network state tracking
let networkState = {
  isOnline: navigator.onLine,
  lastConnectivityCheck: Date.now(),
  averageResponseTime: 0,
  consecutiveFailures: 0,
  isDegraded: false,
  timeoutCount: 0,
};

// Enhanced timeout promise with better error handling
export const createTimeoutPromise = (timeout, requestId = null) => {
  return new Promise((_, reject) => {
    const timeoutId = setTimeout(() => {
      const error = new Error(`Request timeout after ${timeout}ms`);
      error.name = 'TIMEOUT';
      error.requestId = requestId;
      error.timeout = timeout;
      reject(error);
    }, timeout);
    
    return () => clearTimeout(timeoutId);
  });
};

// Enhanced fetch with intelligent timeout
export const enhancedFetch = async (url, options = {}, requestId = null) => {
  const startTime = performance.now();
  
  // Determine timeout based on network conditions
  let timeout = NETWORK_CONFIG.BASE_TIMEOUT;
  if (networkState.isDegraded) {
    timeout = NETWORK_CONFIG.RETRY_TIMEOUT;
  }
  if (networkState.consecutiveFailures > 2) {
    timeout = Math.min(timeout * 1.5, 45000); // Cap at 45 seconds
  }

  // Create abort controller for request cancellation
  const controller = new AbortController();
  const signal = controller.signal;

  // Create timeout promise
  const timeoutPromise = createTimeoutPromise(timeout, requestId);
  
  // Create fetch promise
  const fetchPromise = fetch(url, {
    ...options,
    signal,
  });

  try {
    // Race between fetch and timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    // Update network state on success
    const duration = performance.now() - startTime;
    updateNetworkState(true, duration);
    
    return response;
  } catch (error) {
    // Update network state on failure
    const duration = performance.now() - startTime;
    updateNetworkState(false, duration);
    
    // Enhanced error classification
    const enhancedError = classifyEnhancedError(error, url, requestId);
    throw enhancedError;
  }
};

// Enhanced error classification
const classifyEnhancedError = (error, url, requestId) => {
  const enhancedError = new Error();
  enhancedError.originalError = error;
  enhancedError.url = url;
  enhancedError.requestId = requestId;
  enhancedError.timestamp = Date.now();

  if (error.name === 'TIMEOUT') {
    enhancedError.type = 'TIMEOUT';
    enhancedError.retryable = true;
    enhancedError.userMessage = 'Request timed out. Please try again.';
    networkState.timeoutCount++;
  } else if (error.name === 'AbortError') {
    enhancedError.type = 'ABORTED';
    enhancedError.retryable = true;
    enhancedError.userMessage = 'Request was cancelled.';
  } else if (!navigator.onLine) {
    enhancedError.type = 'OFFLINE';
    enhancedError.retryable = true;
    enhancedError.userMessage = 'You are offline. Please check your connection.';
  } else if (error.message.includes('Failed to fetch')) {
    enhancedError.type = 'NETWORK_ERROR';
    enhancedError.retryable = true;
    enhancedError.userMessage = 'Network error. Please check your connection.';
  } else {
    enhancedError.type = 'UNKNOWN';
    enhancedError.retryable = false;
    enhancedError.userMessage = 'An unexpected error occurred.';
  }

  return enhancedError;
};

// Update network state based on request results
const updateNetworkState = (success, duration) => {
  if (success) {
    networkState.consecutiveFailures = 0;
    networkState.averageResponseTime = 
      (networkState.averageResponseTime + duration) / 2;
    networkState.isDegraded = duration > 10000; // 10 second threshold
  } else {
    networkState.consecutiveFailures++;
    networkState.isDegraded = networkState.consecutiveFailures > 1;
  }
  
  networkState.lastConnectivityCheck = Date.now();
};

// Enhanced retry logic with exponential backoff
export const enhancedRetry = async (fetchFunction, maxRetries = NETWORK_CONFIG.MAX_RETRIES) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFunction();
    } catch (error) {
      lastError = error;
      
      // Don't retry if error is not retryable
      if (!error.retryable) {
        throw error;
      }
      
      // Don't retry if we're offline
      if (!navigator.onLine) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        NETWORK_CONFIG.RETRY_DELAY * Math.pow(NETWORK_CONFIG.BACKOFF_MULTIPLIER, attempt - 1),
        NETWORK_CONFIG.MAX_DELAY || 8000
      );
      
      console.warn(`🔄 Retrying ${error.type} - attempt ${attempt}/${maxRetries} in ${delay.toFixed(2)}ms`);
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Enhanced network connectivity check
export const enhancedNetworkCheck = async () => {
  try {
    const startTime = performance.now();
    const response = await fetch('/api/health', {
      method: 'HEAD',
      cache: 'no-cache',
      signal: AbortSignal.timeout(NETWORK_CONFIG.HEALTH_CHECK_TIMEOUT)
    });
    
    const duration = performance.now() - startTime;
    networkState.isOnline = response.ok;
    networkState.averageResponseTime = duration;
    
    return networkState.isOnline;
  } catch (error) {
    networkState.isOnline = false;
    return false;
  }
};

// Get current network state
export const getNetworkState = () => ({ ...networkState });

// Enhanced fetch wrapper with automatic retry
export const fetchWithEnhancedRetry = async (url, options = {}, requestId = null) => {
  const fetchFunction = () => enhancedFetch(url, options, requestId);
  return enhancedRetry(fetchFunction);
};

// Monitor network connectivity
export const startNetworkMonitoring = () => {
  const monitor = async () => {
    await enhancedNetworkCheck();
  };
  
  // Initial check
  monitor();
  
  // Periodic monitoring
  const interval = setInterval(monitor, NETWORK_CONFIG.CONNECTIVITY_CHECK_INTERVAL);
  
  // Listen for online/offline events
  const handleOnline = () => {
    networkState.isOnline = true;
    networkState.consecutiveFailures = 0;
    networkState.timeoutCount = 0;
  };
  
  const handleOffline = () => {
    networkState.isOnline = false;
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Return cleanup function
  return () => {
    clearInterval(interval);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// Get network statistics
export const getNetworkStats = () => {
  return {
    isOnline: networkState.isOnline,
    isDegraded: networkState.isDegraded,
    averageResponseTime: networkState.averageResponseTime,
    consecutiveFailures: networkState.consecutiveFailures,
    timeoutCount: networkState.timeoutCount,
    lastCheck: networkState.lastConnectivityCheck,
  };
};

// Export network configuration for other services
export { NETWORK_CONFIG }; 