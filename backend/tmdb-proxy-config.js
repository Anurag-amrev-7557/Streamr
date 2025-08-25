/**
 * TMDB Proxy Configuration
 * This file allows you to switch between the main backend and the proxy server
 * to work around the Node.js v22.17.1 TLS issue
 */

const config = {
  // Enable proxy mode to work around TLS issues
  useProxy: true,
  
  // Proxy server configuration
  proxy: {
    baseUrl: 'http://localhost:5001',
    endpoints: {
      trending: '/trending',
      popular: '/popular',
      topRated: '/top-rated',
      generic: '/api'
    }
  },
  
  // Main backend configuration (when proxy is disabled)
  mainBackend: {
    baseUrl: 'https://streamr-jjj9.onrender.com',
    endpoints: {
      trending: '/api/tmdb/trending',
      popular: '/api/tmdb/popular',
      topRated: '/api/tmdb/top-rated',
      generic: '/api/tmdb/proxy'
    }
  },
  
  // Current active configuration
  get activeConfig() {
    return this.useProxy ? this.proxy : this.mainBackend;
  },
  
  // Helper to get full URL for an endpoint
  getUrl(endpoint, params = {}) {
    const config = this.activeConfig;
    const baseUrl = config.baseUrl;
    const endpointPath = config.endpoints[endpoint] || config.endpoints.generic;
    
    if (endpoint === 'generic') {
      // For generic proxy, construct the full path
      const queryString = new URLSearchParams(params).toString();
      return `${baseUrl}${endpointPath}/${params.path || ''}?${queryString}`;
    } else {
      // For specific endpoints, add query parameters
      const queryString = new URLSearchParams(params).toString();
      return `${baseUrl}${endpointPath}?${queryString}`;
    }
  },
  
  // Switch between proxy and main backend
  switchMode(useProxy = true) {
    this.useProxy = useProxy;
    console.log(`Switched to ${useProxy ? 'proxy' : 'main backend'} mode`);
    return this.activeConfig;
  },
  
  // Get current mode status
  getStatus() {
    return {
      mode: this.useProxy ? 'proxy' : 'main_backend',
      baseUrl: this.activeConfig.baseUrl,
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    };
  }
};

module.exports = config; 