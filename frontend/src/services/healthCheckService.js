// Centralized health check service with intelligent caching
class HealthCheckService {
  constructor() {
    this.lastCheck = null;
    this.cacheDuration = 30000; // 30 seconds cache
    this.isChecking = false;
    this.checkQueue = [];
  }

  async checkHealth(force = false) {
    // Return cached result if still valid
    if (!force && this.lastCheck && (Date.now() - this.lastCheck.timestamp) < this.cacheDuration) {
      return this.lastCheck.result;
    }

    // If already checking, queue this request
    if (this.isChecking) {
      return new Promise((resolve) => {
        this.checkQueue.push(resolve);
      });
    }

    this.isChecking = true;

    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const response = await fetch('/api/health', {
          method: 'GET',
          cache: 'no-cache',
          signal: controller.signal
        });
        
        // Clear timeout
        clearTimeout(timeoutId);
        
        const result = {
          status: response.ok ? 'online' : 'error',
          httpStatus: response.status,
          timestamp: Date.now(),
          responseTime: Date.now() - (this.lastCheck?.timestamp || Date.now())
        };

        this.lastCheck = {
          result,
          timestamp: Date.now()
        };

        // Resolve queued requests
        this.checkQueue.forEach(resolve => resolve(result));
        this.checkQueue = [];

        return result;
      } catch (error) {
        // Clear timeout on error
        clearTimeout(timeoutId);
        
        const result = {
          status: 'error',
          error: error.message,
          timestamp: Date.now()
        };

        this.lastCheck = {
          result,
          timestamp: Date.now()
        };

        // Resolve queued requests
        this.checkQueue.forEach(resolve => resolve(result));
        this.checkQueue = [];

        return result;
      }
    } finally {
      this.isChecking = false;
    }
  }

  // Get cached health status without making a new request
  getCachedHealth() {
    if (this.lastCheck && (Date.now() - this.lastCheck.timestamp) < this.cacheDuration) {
      return this.lastCheck.result;
    }
    return null;
  }

  // Force a fresh health check
  async forceCheck() {
    return this.checkHealth(true);
  }
}

// Export singleton instance
export const healthCheckService = new HealthCheckService();
export default healthCheckService; 