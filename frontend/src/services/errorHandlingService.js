// Comprehensive error handling service for network and CORS issues

// Error types and their handling strategies
const ERROR_TYPES = {
  CORS_ERROR: 'CORS_ERROR',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  CONNECTION_RESET: 'CONNECTION_RESET',
  API_UNAVAILABLE: 'API_UNAVAILABLE',
  RATE_LIMIT: 'RATE_LIMIT',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

// Error classification function
export const classifyError = (error) => {
  const errorMessage = error.message?.toLowerCase() || '';
  const errorName = error.name || '';

  // CORS errors
  if (errorMessage.includes('cors') || 
      errorMessage.includes('access-control-allow-origin') ||
      errorMessage.includes('favicon.ico')) {
    return {
      type: ERROR_TYPES.CORS_ERROR,
      severity: 'low',
      retryable: false,
      userMessage: 'Cross-origin request blocked. This is normal for some external resources.',
      shouldLog: false // Don't log CORS errors as they're expected
    };
  }

  // Network timeout errors
  if (errorMessage.includes('timeout') || 
      errorName === 'AbortError' ||
      errorMessage.includes('aborted')) {
    return {
      type: ERROR_TYPES.NETWORK_TIMEOUT,
      severity: 'medium',
      retryable: true,
      userMessage: 'Request timed out. Please check your internet connection.',
      shouldLog: true
    };
  }

  // Connection reset errors
  if (errorMessage.includes('connection reset') || 
      errorMessage.includes('net::err_connection_reset') ||
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('network error')) {
    return {
      type: ERROR_TYPES.CONNECTION_RESET,
      severity: 'high',
      retryable: true,
      userMessage: 'Connection was reset. Please check your internet connection.',
      shouldLog: true
    };
  }

  // API unavailable errors
  if (errorMessage.includes('503') || 
      errorMessage.includes('service unavailable') ||
      errorMessage.includes('maintenance')) {
    return {
      type: ERROR_TYPES.API_UNAVAILABLE,
      severity: 'medium',
      retryable: true,
      userMessage: 'Service temporarily unavailable. Please try again later.',
      shouldLog: true
    };
  }

  // Rate limit errors
  if (errorMessage.includes('429') || 
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests')) {
    return {
      type: ERROR_TYPES.RATE_LIMIT,
      severity: 'medium',
      retryable: true,
      userMessage: 'Too many requests. Please wait a moment and try again.',
      shouldLog: true
    };
  }

  // Authentication errors
  if (errorMessage.includes('401') || 
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden')) {
    return {
      type: ERROR_TYPES.AUTHENTICATION_ERROR,
      severity: 'high',
      retryable: false,
      userMessage: 'API authentication failed. Please check your API key configuration.',
      shouldLog: true
    };
  }

  // Unknown errors
  return {
    type: ERROR_TYPES.UNKNOWN_ERROR,
    severity: 'medium',
    retryable: true,
    userMessage: 'An unexpected error occurred. Please try again.',
    shouldLog: true
  };
};

// Error logging with filtering
export const logError = (error, context = {}) => {
  const errorInfo = classifyError(error);
  
  // Don't log CORS errors as they're expected
  if (!errorInfo.shouldLog) {
    return;
  }

  const logData = {
    timestamp: new Date().toISOString(),
    errorType: errorInfo.type,
    severity: errorInfo.severity,
    message: error.message,
    stack: error.stack,
    context,
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  // Log to console with appropriate level
  switch (errorInfo.severity) {
    case 'high':
      console.error('🚨 High severity error:', logData);
      break;
    case 'medium':
      console.warn('⚠️ Medium severity error:', logData);
      break;
    case 'low':
      console.info('ℹ️ Low severity error:', logData);
      break;
    default:
      console.log('📝 Error:', logData);
  }

  // Store error for analytics (if needed)
  storeErrorForAnalytics(logData);
};

// Store errors for analytics
const storeErrorForAnalytics = (errorData) => {
  try {
    const errors = JSON.parse(localStorage.getItem('errorAnalytics') || '[]');
    errors.push(errorData);
    
    // Keep only last 50 errors
    if (errors.length > 50) {
      errors.splice(0, errors.length - 50);
    }
    
    localStorage.setItem('errorAnalytics', JSON.stringify(errors));
  } catch (error) {
    console.warn('Failed to store error for analytics:', error);
  }
};

// Get error analytics
export const getErrorAnalytics = () => {
  try {
    const errors = JSON.parse(localStorage.getItem('errorAnalytics') || '[]');
    return errors;
  } catch (error) {
    console.warn('Failed to get error analytics:', error);
    return [];
  }
};

// Clear error analytics
export const clearErrorAnalytics = () => {
  try {
    localStorage.removeItem('errorAnalytics');
  } catch (error) {
    console.warn('Failed to clear error analytics:', error);
  }
};

// Enhanced fetch wrapper with error handling
export const fetchWithErrorHandling = async (url, options = {}) => {
  const startTime = performance.now();
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: options.signal || new AbortController().signal
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      error.response = response;
      throw error;
    }

    return response;
  } catch (error) {
    const errorInfo = classifyError(error);
    logError(error, {
      url,
      options,
      duration: performance.now() - startTime
    });

    // Re-throw with enhanced error information
    error.errorInfo = errorInfo;
    throw error;
  }
};

// Retry wrapper with exponential backoff
export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorInfo = classifyError(error);

      // Don't retry non-retryable errors
      if (!errorInfo.retryable) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      
      console.log(`Retry attempt ${attempt}/${maxRetries} in ${Math.round(delay)}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

// Network health check
export const checkNetworkHealth = async () => {
  const checks = [
    {
      name: 'TMDB API',
      url: async () => {
        const { TMDB_API_KEY } = await import('./tmdbService.js');
        return `https://api.themoviedb.org/3/configuration?api_key=${TMDB_API_KEY}`;
      },
      timeout: 5000
    },
    {
      name: 'Backend API',
      url: '/api/health',
      timeout: 3000
    }
  ];

  const results = [];

  for (const check of checks) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), check.timeout);

      // Handle async URL generation
      const url = typeof check.url === 'function' ? await check.url() : check.url;
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'cors'
      });

      clearTimeout(timeoutId);
      results.push({
        name: check.name,
        status: 'success',
        responseTime: Date.now()
      });
    } catch (error) {
      results.push({
        name: check.name,
        status: 'failed',
        error: error.message
      });
    }
  }

  return results;
};

// Export for browser console testing
if (typeof window !== 'undefined') {
  window.classifyError = classifyError;
  window.logError = logError;
  window.getErrorAnalytics = getErrorAnalytics;
  window.clearErrorAnalytics = clearErrorAnalytics;
  window.fetchWithErrorHandling = fetchWithErrorHandling;
  window.retryWithBackoff = retryWithBackoff;
  window.checkNetworkHealth = checkNetworkHealth;
  
  console.log('🔧 Error handling utilities available:');
  console.log('- classifyError(error)');
  console.log('- logError(error, context)');
  console.log('- getErrorAnalytics()');
  console.log('- clearErrorAnalytics()');
  console.log('- fetchWithErrorHandling(url, options)');
  console.log('- retryWithBackoff(fn, maxRetries, baseDelay)');
  console.log('- checkNetworkHealth()');
} 