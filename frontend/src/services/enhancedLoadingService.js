// Enhanced Loading Service - Replaces timeout-based loading with retry mechanisms
class EnhancedLoadingService {
  constructor() {
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2,
      jitterFactor: 0.1
    };
    
    this.networkProfiles = {
      fast: { timeout: 8000, retries: 2 },
      slow: { timeout: 15000, retries: 3 },
      verySlow: { timeout: 25000, retries: 4 }
    };
  }

  // Detect network profile based on connection speed
  detectNetworkProfile() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      if (connection.effectiveType === '4g' || connection.downlink > 10) {
        return 'fast';
      } else if (connection.effectiveType === '3g' || connection.downlink > 2) {
        return 'slow';
      } else {
        return 'verySlow';
      }
    }
    return 'fast'; // Default fallback
  }

  // Calculate retry delay with exponential backoff and jitter
  calculateRetryDelay(attempt, baseDelay = this.retryConfig.baseDelay) {
    const exponentialDelay = baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
    const jitter = exponentialDelay * this.retryConfig.jitterFactor * Math.random();
    return Math.min(exponentialDelay + jitter, this.retryConfig.maxDelay);
  }

  // Enhanced retry with network-aware timeouts
  async retryWithBackoff(operation, context = '') {
    const networkProfile = this.detectNetworkProfile();
    const config = this.networkProfiles[networkProfile];
    
    let lastError;
    
    for (let attempt = 1; attempt <= config.retries; attempt++) {
      try {
        // Create abort controller for this attempt
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);
        
        try {
          const result = await operation(controller.signal);
          clearTimeout(timeoutId);
          return { success: true, data: result, attempt };
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain error types
        if (this.isNonRetryableError(error)) {
          console.warn(`Non-retryable error in ${context}:`, error);
          break;
        }
        
        // Log retry attempt
        console.log(`🔄 Retry attempt ${attempt}/${config.retries} for ${context}:`, error.message);
        
        // If this is the last attempt, don't wait
        if (attempt === config.retries) {
          break;
        }
        
        // Wait before retrying
        const delay = this.calculateRetryDelay(attempt);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // All retries failed
    return {
      success: false,
      error: lastError,
      attempts: config.retries,
      context
    };
  }

  // Check if error is non-retryable
  isNonRetryableError(error) {
    // Don't retry on authentication errors, rate limits, or client errors
    if (error.status === 401 || error.status === 403 || error.status === 429) {
      return true;
    }
    
    // Don't retry on certain network errors
    if (error.name === 'AbortError' && error.message.includes('timeout')) {
      return false; // Allow retry on timeouts
    }
    
    return false;
  }

  // Enhanced loading state management
  createLoadingState() {
    return {
      isLoading: false,
      error: null,
      retryCount: 0,
      lastAttempt: null,
      isRetrying: false
    };
  }

  // Update loading state with retry information
  updateLoadingState(state, updates) {
    return {
      ...state,
      ...updates,
      lastAttempt: Date.now()
    };
  }

  // Handle loading failure with retry logic
  async handleLoadingFailure(operation, context, onRetry, onFinalFailure) {
    const result = await this.retryWithBackoff(operation, context);
    
    if (result.success) {
      return result.data;
    }
    
    // All retries failed
    if (onFinalFailure) {
      onFinalFailure(result.error, result.attempts);
    }
    
    throw result.error;
  }

  // Create a loading operation with automatic retry
  createRetryableOperation(operation, context) {
    return async () => {
      return this.retryWithBackoff(operation, context);
    };
  }

  // Network status monitoring
  monitorNetworkStatus(onStatusChange) {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      const updateStatus = () => {
        const profile = this.detectNetworkProfile();
        onStatusChange(profile, connection);
      };
      
      connection.addEventListener('change', updateStatus);
      updateStatus(); // Initial status
      
      return () => connection.removeEventListener('change', updateStatus);
    }
    
    return () => {}; // No-op cleanup
  }

  // Get user-friendly error message
  getErrorMessage(error, context = '') {
    if (error.name === 'AbortError') {
      return 'Request timed out. Please check your connection and try again.';
    }
    
    if (error.message.includes('Failed to fetch')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    
    if (error.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    
    if (error.status >= 500) {
      return 'Server error. Please try again in a moment.';
    }
    
    return `Failed to load ${context}. Please try again.`;
  }

  // Get network status badge for floating display
  getNetworkStatusBadge(networkProfile) {
    if (networkProfile === 'fast') return null;
    
    const config = {
      slow: { text: 'Slow Connection', color: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300' },
      verySlow: { text: 'Very Slow Connection', color: 'bg-orange-500/20 border-orange-500/30 text-orange-300' }
    };
    
    return config[networkProfile] || null;
  }

  // Create a loading indicator component state
  createLoadingIndicatorState() {
    return {
      showRetryButton: false,
      retryButtonText: 'Retry',
      showNetworkStatus: false,
      networkStatusText: '',
      canRetry: true
    };
  }

  // Update loading indicator based on retry state
  updateLoadingIndicator(state, retryCount, maxRetries, networkProfile) {
    const canRetry = retryCount < maxRetries;
    const showRetryButton = retryCount > 0 && canRetry;
    
    let retryButtonText = 'Retry';
    if (retryCount > 0) {
      retryButtonText = `Retry (${retryCount}/${maxRetries})`;
    }
    
    let networkStatusText = '';
    if (networkProfile === 'slow') {
      networkStatusText = 'Slow connection detected';
    } else if (networkProfile === 'verySlow') {
      networkStatusText = 'Very slow connection detected';
    }
    
    return {
      ...state,
      showRetryButton,
      retryButtonText,
      showNetworkStatus: networkStatusText.length > 0,
      networkStatusText,
      canRetry
    };
  }
}

// Create singleton instance
const enhancedLoadingService = new EnhancedLoadingService();

export default enhancedLoadingService;
export { EnhancedLoadingService }; 