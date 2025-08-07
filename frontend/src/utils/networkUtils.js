// Simple network utilities that avoid CORS issues
export const checkBasicConnectivity = () => {
  return navigator.onLine;
};

export const checkApiConnectivity = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    // Try to connect to TMDB API directly
    const response = await fetch('https://api.themoviedb.org/3/configuration', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn('API connectivity check failed:', error);
    return false;
  }
};

export const getNetworkStatus = () => {
  return {
    isOnline: navigator.onLine,
    connectionType: navigator.connection?.effectiveType || 'unknown',
    downlink: navigator.connection?.downlink || null,
    rtt: navigator.connection?.rtt || null
  };
};

export const createRetryableFetch = (maxRetries = 2, baseDelay = 1000) => {
  return async (url, options = {}) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
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
        
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  };
};

// Network monitor for real-time connectivity tracking
export const createNetworkMonitor = (onStatusChange) => {
  let isMonitoring = false;
  
  const handleOnline = () => {
    if (onStatusChange) {
      onStatusChange({ isOnline: true, type: 'online' });
    }
  };
  
  const handleOffline = () => {
    if (onStatusChange) {
      onStatusChange({ isOnline: false, type: 'offline' });
    }
  };
  
  const handleConnectionChange = () => {
    if (onStatusChange) {
      onStatusChange({
        ...getNetworkStatus(),
        type: 'connection-change'
      });
    }
  };
  
  const start = () => {
    if (isMonitoring) return;
    
    isMonitoring = true;
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (navigator.connection) {
      navigator.connection.addEventListener('change', handleConnectionChange);
    }
    
    // Initial status
    if (onStatusChange) {
      onStatusChange({
        ...getNetworkStatus(),
        type: 'initial'
      });
    }
  };
  
  const stop = () => {
    if (!isMonitoring) return;
    
    isMonitoring = false;
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    
    if (navigator.connection) {
      navigator.connection.removeEventListener('change', handleConnectionChange);
    }
  };
  
  return {
    start,
    stop,
    getStatus: getNetworkStatus
  };
}; 