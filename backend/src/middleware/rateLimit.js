const rateLimit = require('express-rate-limit');

// Rate limiting middleware to prevent abuse
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests, please try again later.') => {
  return rateLimit({
    windowMs, // 15 minutes by default
    max, // limit each IP to max requests per windowMs
    message: {
      error: message,
      status: 429
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      const retryAfter = Math.ceil(windowMs / 1000);
      console.log(`🚫 Rate limit exceeded for ${req.path}: ${req.ip} - ${retryAfter}s retry`);
      
      res.status(429).json({
        error: message,
        status: 429,
        retryAfter: retryAfter,
        remainingTime: retryAfter,
        endpoint: req.path,
        timestamp: new Date().toISOString()
      });
    },
    // Add keyGenerator to handle different user types
    keyGenerator: (req) => {
      // If user is authenticated, use their ID for rate limiting
      if (req.user && req.user.id) {
        return `user_${req.user.id}`;
      }
      // Otherwise use IP address
      return req.ip;
    },
    // Add skipSuccessfulRequests to not count successful requests
    skipSuccessfulRequests: false,
    // Add skipFailedRequests to not count failed requests
    skipFailedRequests: false
  });
};

// Different rate limiters for different endpoints
const rateLimiters = {
  // Health endpoints - very generous since they're essential for monitoring
  health: createRateLimiter(15 * 60 * 1000, 50000), // 50000 requests per 15 minutes
  
  // General API rate limiter
  general: createRateLimiter(15 * 60 * 1000, 5000), // 5000 requests per 15 minutes (increased from 2000)
  
  
  // TMDB API rate limiter (more restrictive since it calls external API)
  tmdb: createRateLimiter(15 * 60 * 1000, 2000), // 2000 requests per 15 minutes (increased from 500)
  
  // Community endpoints rate limiter - increased significantly
  community: createRateLimiter(15 * 60 * 1000, 2000), // 2000 requests per 15 minutes
  
  // Community read operations - very generous for browsing
  communityRead: createRateLimiter(15 * 60 * 1000, 5000), // 5000 requests per 15 minutes
  
  // Community write operations - more restrictive
  communityWrite: createRateLimiter(15 * 60 * 1000, 500), // 500 requests per 15 minutes
  
  // Auth endpoints rate limiter (more restrictive for security)
  auth: createRateLimiter(15 * 60 * 1000, 100), // 100 requests per 15 minutes
  
  // Strict rate limiter for sensitive operations
  strict: createRateLimiter(15 * 60 * 1000, 50), // 50 requests per 15 minutes
  
  // Active users endpoint - very generous since it's frequently accessed
  activeUsers: createRateLimiter(15 * 60 * 1000, 10000), // 10000 requests per 15 minutes
};

module.exports = {
  createRateLimiter,
  rateLimiters
}; 