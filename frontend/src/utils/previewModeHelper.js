// Helper utility for preview mode and offline detection
export const isPreviewMode = () => {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.port === '4173' || // Vite preview port
         window.location.port === '5173';   // Vite dev port
};

export const isDevelopmentMode = () => {
  return import.meta.env.DEV || isPreviewMode();
};

export const clearCache = async () => {
  try {
    // Clear browser cache for development
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('Browser cache cleared');
    }
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
};

export const testNetworkConnectivity = async () => {
  try {
    // Try multiple endpoints to test connectivity
    const endpoints = [
      '/api/health',
      'https://api.themoviedb.org/3/configuration',
      'https://httpbin.org/get'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'HEAD',
          cache: 'no-cache',
          mode: 'no-cors'
        });
        return true; // If any endpoint responds, we're online
      } catch (error) {
        console.log(`Failed to reach ${endpoint}:`, error);
      }
    }
    return false; // If none respond, we're offline
  } catch (error) {
    console.error('Network connectivity test failed:', error);
    return false;
  }
};

export const handleOfflineState = () => {
  if (isPreviewMode()) {
    // In preview mode, be more lenient with offline detection
    setTimeout(() => {
      if (!navigator.onLine) {
        console.log('Preview mode: Attempting to reload despite offline state');
        window.location.reload();
      }
    }, 3000);
  }
};

// Auto-clear cache in development mode
if (isDevelopmentMode()) {
  clearCache();
} 