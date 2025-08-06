# Rate Limiting Solution for Streamr

## Problem
The application was experiencing 429 "Too Many Requests" errors when fetching community discussions. This was caused by:

1. **Backend Rate Limiting**: 100 requests per 15 minutes in production
2. **Aggressive Retry Logic**: Immediate retries on 429 errors made the problem worse
3. **No Client-Side Rate Limiting**: Multiple concurrent requests hitting the API simultaneously
4. **Lack of Caching**: Repeated requests for the same data

## Solution Overview

### 1. Enhanced Retry Logic (`api.js`)
- **Rate Limit Detection**: Identifies 429 errors and rate limit messages
- **Exponential Backoff**: Uses 3x multiplier for rate limit errors (vs 2x for other errors)
- **Longer Delays**: Allows up to 2x max delay for rate limit errors
- **Smart Retry**: Only retries appropriate errors, avoids retrying rate limits immediately

### 2. Rate Limiting Service (`rateLimitService.js`)
- **Request Queue**: Queues requests when rate limits are approached
- **Priority System**: High priority for user actions, normal for data fetching
- **Concurrent Request Limiting**: Maximum 5 concurrent requests
- **Request Spacing**: 200ms minimum delay between requests
- **Window-based Limiting**: 80 requests per 15-minute window (conservative)
- **Real-time Monitoring**: Tracks request counts and queue status

### 3. Enhanced Community Service (`communityService.js`)
- **Caching**: 5-minute cache for discussion data
- **Rate Limit Integration**: All requests go through rate limiting service
- **Priority Assignment**: User actions get high priority
- **Cache Management**: Automatic cache invalidation and stats

### 4. User Feedback (`RateLimitStatus.jsx`)
- **Visual Status**: Shows current API usage and queue status
- **Smart Visibility**: Only appears when rate limits are being hit
- **Real-time Updates**: Updates every second
- **User-Friendly Messages**: Clear explanations of current status

## Implementation Details

### Rate Limiting Service Features
```javascript
// Configuration
maxConcurrentRequests: 5
requestDelay: 200ms
rateLimitWindow: 15 minutes
maxRequestsPerWindow: 80 (conservative)

// Priority levels
'high' - User actions (create, update, delete, like)
'normal' - Data fetching (get discussions, search)
```

### Caching Strategy
```javascript
// Cache duration
CACHE_DURATION: 5 minutes

// Cache keys
`discussions_${params.toString()}`
// Example: discussions_page=1&limit=10&sortBy=newest
```

### Error Handling
```javascript
// Rate limit detection
const isRateLimitError = error.response?.status === 429 || 
                        error.message?.includes('Too many requests') ||
                        error.message?.includes('rate limit');

// Exponential backoff
delay = Math.min(
  config.baseDelay * Math.pow(3, attempt - 1), // 3x for rate limits
  config.maxDelay * 2 // 2x max delay for rate limits
);
```

## Usage

### For Developers
```javascript
// Using rate limiting service directly
import rateLimitService from './services/rateLimitService.js';

const result = await rateLimitService.queueRequest(
  async () => {
    const response = await api.get('/endpoint');
    return response.data;
  },
  'high' // priority
);

// Check status
const status = rateLimitService.getStatus();
console.log(status);
```

### For Users
- **Automatic**: No user action required
- **Visual Feedback**: Status indicator appears when needed
- **Transparent**: Requests are queued and processed automatically
- **Informative**: Clear messages about current status

## Benefits

### 1. Prevents Rate Limit Errors
- Client-side rate limiting prevents hitting backend limits
- Request queuing ensures smooth operation
- Conservative limits (80 vs 100) provide safety margin

### 2. Better User Experience
- No more 429 errors for users
- Visual feedback when rate limits are approached
- Automatic request management
- Faster responses through caching

### 3. Improved Performance
- Reduced API calls through caching
- Efficient request queuing
- Priority-based request processing
- Better resource utilization

### 4. Scalability
- Handles high traffic gracefully
- Configurable limits and delays
- Easy to adjust for different environments
- Monitoring and debugging capabilities

## Configuration

### Environment Variables
```bash
# Backend rate limiting (already configured)
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # 100 requests per window
```

### Frontend Configuration
```javascript
// In rateLimitService.js
maxConcurrentRequests: 5,        // Adjust based on server capacity
requestDelay: 200,               // Minimum delay between requests
maxRequestsPerWindow: 80,        // Conservative limit (80% of backend)
rateLimitWindow: 15 * 60 * 1000  // 15 minutes
```

## Monitoring

### Status Information
```javascript
{
  queueLength: 0,           // Number of queued requests
  activeRequests: 2,        // Currently executing requests
  requestCount: 45,         // Requests in current window
  windowStart: 1234567890,  // Window start timestamp
  canMakeRequest: true      // Whether new requests can be made
}
```

### Debug Information
- Console logs for rate limit events
- Request queue status
- Cache hit/miss statistics
- Error tracking and reporting

## Future Improvements

### 1. Adaptive Rate Limiting
- Adjust limits based on server response times
- Dynamic request spacing based on load
- Machine learning for optimal limits

### 2. Advanced Caching
- Intelligent cache invalidation
- Cache warming for popular data
- Distributed caching for multiple users

### 3. Enhanced Monitoring
- Real-time analytics dashboard
- Alert system for rate limit approaches
- Performance metrics and reporting

### 4. User Preferences
- Allow users to adjust request priorities
- Manual cache clearing options
- Custom rate limit preferences

## Testing

### Manual Testing
1. Navigate to Community page
2. Rapidly refresh or navigate
3. Check for rate limit status indicator
4. Verify no 429 errors in console

### Automated Testing
```javascript
// Test rate limiting service
const status = rateLimitService.getStatus();
expect(status.requestCount).toBeLessThan(80);

// Test caching
const cached = getCachedData('test_key');
expect(cached).toBeNull(); // Should be null initially
```

## Conclusion

This comprehensive rate limiting solution effectively prevents 429 errors while maintaining excellent user experience. The combination of client-side rate limiting, intelligent caching, and user feedback creates a robust system that can handle high traffic gracefully.

The solution is:
- **Proactive**: Prevents rate limit errors before they occur
- **User-friendly**: Provides clear feedback and automatic management
- **Scalable**: Can be easily adjusted for different environments
- **Maintainable**: Well-documented and modular design
- **Performance-focused**: Reduces API calls and improves response times 