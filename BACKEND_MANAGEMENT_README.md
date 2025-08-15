# Backend Management Solution

This solution helps you manage backend connections and resolve rate limiting (429) errors by providing easy switching between local and deployed backends.

## 🚨 Current Issue

You're experiencing **429 (Too Many Requests)** errors from your deployed backend on Render:
```
GET https://streamr-jjj9.onrender.com/api/trending 429 (Too Many Requests)
GET https://streamr-jjj9.onrender.com/api/popular 429 (Too Many Requests)
GET https://streamr-jjj9.onrender.com/api/top-rated 429 (Too Many Requests)
```

## 🛠️ Solution Implemented

### 1. **Backend Switched to Local**
- ✅ Changed `frontend/src/config/api.js` from `deployed` to `local`
- ✅ This will use `http://localhost:3001/api` instead of the rate-limited deployed backend

### 2. **Enhanced Rate Limiting**
- ✅ Reduced max requests per second from 10 to 2
- ✅ Added concurrent request limiting (max 3 concurrent)
- ✅ Implemented request queuing and throttling
- ✅ Added exponential backoff for 429 errors
- ✅ Enhanced warmup with staggered delays

### 3. **Backend Management Tools**
- ✅ Created `BackendSwitcher` React component
- ✅ Added `TestBackendPage` for easy backend management
- ✅ Implemented global console functions for quick switching
- ✅ Created startup script for local backend

## 🚀 Quick Start

### Option 1: Use the UI (Recommended)
1. Navigate to `/test-backend` in your app
2. Use the Backend Switcher component to manage backends
3. Test connectivity before switching

### Option 2: Use Console Commands
Open your browser console and run:
```javascript
// Switch to local backend (avoid rate limiting)
switchToLocalBackend()

// Switch back to deployed backend
switchToDeployedBackend()

// Test current connection
testBackendConnection()

// Get current status
getBackendStatus()

// Auto-switch to best available backend
autoSwitchBackend()
```

### Option 3: Start Local Backend
```bash
# Make sure you're in the project root
./start-local-backend.sh

# Or manually:
cd backend
npm install
npm start
```

## 🔧 Configuration

### Current Settings (Conservative)
```javascript
// Rate limiting
maxRequestsPerSecond: 2,        // Reduced from 10
rateLimitWindow: 1000,          // 1 second
maxConcurrentRequests: 3,       // Limit concurrent requests

// Warmup delays
staggeredDelays: [3s, 6s, 9s]  // Avoid overwhelming server
```

### Backend URLs
- **Local**: `http://localhost:3001/api`
- **Deployed**: `https://streamr-jjj9.onrender.com/api`

## 📱 UI Components

### BackendSwitcher
- Real-time backend status
- One-click switching between backends
- Connection testing
- Auto-switching capability

### TestBackendPage
- Complete backend management interface
- Troubleshooting guide
- Console command reference

## 🚨 Troubleshooting

### Rate Limiting (429 Errors)
1. **Immediate fix**: Switch to local backend
2. **Long-term**: Implement better caching and request throttling
3. **Investigate**: Check deployed backend logs and rate limit settings

### Local Backend Issues
1. **Port conflict**: Ensure port 3001 is free
2. **Dependencies**: Run `npm install` in backend directory
3. **Database**: Check if your local database is running

### Deployed Backend Issues
1. **Service status**: Check if Render service is online
2. **Rate limits**: Verify your plan's rate limit settings
3. **Logs**: Check Render dashboard for error logs

## 🔄 Switching Backends

### To Local Backend
```javascript
switchToLocalBackend()
// Page will reload automatically
```

### To Deployed Backend
```javascript
switchToDeployedBackend()
// Page will reload automatically
```

### Auto-Switch
```javascript
autoSwitchBackend()
// Automatically finds best available backend
```

## 📊 Monitoring

### Request Statistics
- Total requests
- Cached responses
- Network requests
- Errors (including rate limiting)
- Average response time

### Performance Tracking
- Request duration monitoring
- Cache hit rates
- Error tracking
- Rate limit detection

## 🎯 Best Practices

### Development
1. Use local backend during development
2. Test with deployed backend before production
3. Monitor rate limits and adjust accordingly

### Production
1. Implement aggressive caching
2. Use request batching when possible
3. Monitor and adjust rate limiting settings
4. Consider CDN for static content

### Rate Limiting
1. Start conservative (2 req/sec)
2. Gradually increase based on backend capacity
3. Implement exponential backoff
4. Use request queuing for high-traffic periods

## 🔍 Debugging

### Console Logs
```javascript
// Check current configuration
getApiConfig()

// Test backend connectivity
testBackendConnectivity()

// Get detailed stats
// (Available in enhancedApiServiceV2)
```

### Network Tab
- Monitor request timing
- Check response headers
- Look for 429 errors
- Verify retry behavior

## 📝 Files Modified

1. **`frontend/src/config/api.js`** - Backend mode switched to local
2. **`frontend/src/services/enhancedApiServiceV2.js`** - Enhanced rate limiting
3. **`frontend/src/utils/backendSwitcher.js`** - Backend management utility
4. **`frontend/src/components/BackendSwitcher.jsx`** - React component
5. **`frontend/src/pages/TestBackendPage.jsx`** - Management page
6. **`start-local-backend.sh`** - Startup script

## 🚀 Next Steps

1. **Start your local backend** using the provided script
2. **Test the backend switcher** at `/test-backend`
3. **Verify local backend is working** before switching back
4. **Monitor rate limits** when using deployed backend
5. **Implement additional caching** if needed

## 💡 Tips

- **Always test connectivity** before switching backends
- **Use the UI components** for easier management
- **Monitor console logs** for debugging information
- **Keep local backend running** during development
- **Check Render dashboard** for deployed backend status

---

**Need help?** Check the troubleshooting guide in the TestBackendPage or use the console commands for quick debugging. 