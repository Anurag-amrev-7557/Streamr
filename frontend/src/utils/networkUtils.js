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
            cache: 'no-cache',
            mode: 'cors'
          });
          return response.ok;
        } catch (error) {
          return false;
        }
      }
    },
    {
      name: 'TMDB API Test',
      test: async () => {
        try {
          // Import the API key from TMDB service
          const { TMDB_API_KEY } = await import('../services/tmdbService.js');
          
          // Check if API key is properly configured
          if (!TMDB_API_KEY || TMDB_API_KEY === 'undefined' || TMDB_API_KEY === '') {
            console.warn('TMDB API key is not configured');
            return false;
          }
          
          const response = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${TMDB_API_KEY}`, {
            method: 'HEAD',
            cache: 'no-cache',
            mode: 'cors'
          });
          
          if (response.status === 401) {
            console.warn('TMDB API authentication failed - check API key');
            return false;
          }
          
          return response.ok;
        } catch (error) {
          console.warn('TMDB API test failed:', error.message);
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
            cache: 'no-cache',
            mode: 'cors'
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
            cache: 'no-cache',
            mode: 'cors'
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

/**
 * Check if we can access external APIs
 */
export const checkExternalAPIAccess = async () => {
  const apis = [
    {
      name: 'TMDB API',
      url: 'https://api.themoviedb.org/3/configuration',
      test: async () => {
        try {
          // Import the API key from TMDB service
          const { TMDB_API_KEY } = await import('../services/tmdbService.js');
          
          // Check if API key is properly configured
          if (!TMDB_API_KEY || TMDB_API_KEY === 'undefined' || TMDB_API_KEY === '') {
            console.warn('TMDB API key is not configured');
            return false;
          }
          
          const response = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${TMDB_API_KEY}`, {
            method: 'GET',
            mode: 'cors',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (response.status === 401) {
            console.warn('TMDB API authentication failed - check API key');
            return false;
          }
          
          return response.ok;
        } catch (error) {
          console.warn('TMDB API access failed:', error.message);
          return false;
        }
      }
    }
  ];

  const results = [];
  for (const api of apis) {
    try {
      const accessible = await api.test();
      results.push({
        name: api.name,
        accessible,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      results.push({
        name: api.name,
        accessible: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  return results;
};

// Export for browser console testing
if (typeof window !== 'undefined') {
  window.testNetworkConnectivity = testNetworkConnectivity;
  window.getNetworkInfo = getNetworkInfo;
  window.createNetworkMonitor = createNetworkMonitor;
  window.checkExternalAPIAccess = checkExternalAPIAccess;
  
  console.log('🌐 Network utilities available:');
  console.log('- testNetworkConnectivity()');
  console.log('- getNetworkInfo()');
  console.log('- createNetworkMonitor(callback)');
  console.log('- checkExternalAPIAccess()');
} 