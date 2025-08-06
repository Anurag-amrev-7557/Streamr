// Rate Limiting Service for API Requests
class RateLimitService {
  constructor() {
    this.requestQueue = [];
    this.activeRequests = 0;
    this.maxConcurrentRequests = 5;
    this.requestDelay = 200; // 200ms between requests
    this.lastRequestTime = 0;
    this.rateLimitWindow = 15 * 60 * 1000; // 15 minutes
    this.maxRequestsPerWindow = 80; // Conservative limit
    this.requestCount = 0;
    this.windowStart = Date.now();
    
    // Start processing queue
    this.processQueue();
  }

  // Add request to queue
  async queueRequest(requestFn, priority = 'normal') {
    return new Promise((resolve, reject) => {
      const request = {
        requestFn,
        resolve,
        reject,
        priority,
        timestamp: Date.now()
      };

      // Add to queue based on priority
      if (priority === 'high') {
        this.requestQueue.unshift(request);
      } else {
        this.requestQueue.push(request);
      }
    });
  }

  // Process the request queue
  async processQueue() {
    while (true) {
      if (this.requestQueue.length > 0 && this.canMakeRequest()) {
        const request = this.requestQueue.shift();
        this.executeRequest(request);
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Check if we can make a request
  canMakeRequest() {
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.windowStart > this.rateLimitWindow) {
      this.requestCount = 0;
      this.windowStart = now;
    }
    
    // Check if we're within rate limits
    if (this.requestCount >= this.maxRequestsPerWindow) {
      return false;
    }
    
    // Check if we have too many concurrent requests
    if (this.activeRequests >= this.maxConcurrentRequests) {
      return false;
    }
    
    // Ensure minimum delay between requests
    if (now - this.lastRequestTime < this.requestDelay) {
      return false;
    }
    
    return true;
  }

  // Execute a request
  async executeRequest(request) {
    this.activeRequests++;
    this.requestCount++;
    this.lastRequestTime = Date.now();
    
    try {
      const result = await request.requestFn();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.activeRequests--;
    }
  }

  // Get queue status
  getStatus() {
    return {
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests,
      requestCount: this.requestCount,
      windowStart: this.windowStart,
      canMakeRequest: this.canMakeRequest()
    };
  }

  // Reset rate limiting (useful for testing)
  reset() {
    this.requestCount = 0;
    this.windowStart = Date.now();
    this.requestQueue = [];
    this.activeRequests = 0;
  }
}

// Create singleton instance
const rateLimitService = new RateLimitService();

export default rateLimitService; 