# TMDB 500 Internal Server Error - Complete Fix

## Problem Summary
Your Streamr backend was experiencing **500 Internal Server Errors** when calling TMDB API endpoints:
- `/api/tmdb/trending` - 500 Error
- `/api/tmdb/popular` - 500 Error  
- `/api/tmdb/top-rated` - 500 Error

## Root Cause
The errors were caused by **TLS protocol conflicts** between Node.js v22.17.1 and the TMDB API server, resulting in `ECONNRESET` errors.

## Solution Implemented
I've implemented a **dual-server architecture** with automatic proxy fallback:

1. **Main Backend Server** (Port 3001) - Your existing Express.js server
2. **TMDB Proxy Server** (Port 5001) - Dedicated proxy that handles TLS issues
3. **Automatic Fallback** - When main API calls fail, requests automatically route through the proxy

## How It Works

### 1. Primary Request Flow
```
Frontend → Main Backend → TMDB API
```

### 2. Fallback Flow (When TLS fails)
```
Frontend → Main Backend → TMDB Proxy → TMDB API
```

### 3. Automatic Detection
The system automatically detects TLS/connection errors and switches to the proxy:
- `ECONNRESET` errors
- TLS protocol conflicts
- Connection timeouts

## Quick Start

### Option 1: Use the Combined Startup Script (Recommended)
```bash
cd backend
./start-with-proxy.sh
```

This starts both servers automatically and handles cleanup.

### Option 2: Manual Startup
```bash
# Terminal 1: Start TMDB Proxy Server
cd backend
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use default
node tmdb-proxy-server.js

# Terminal 2: Start Main Backend
cd backend
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use default
npm start
```

## Testing the Fix

### 1. Test Proxy Server
```bash
curl http://localhost:5001/health
```
Expected: `{"status":"ok","service":"TMDB Proxy Server",...}`

### 2. Test Main Backend
```bash
curl http://localhost:3001/api/health
```
Expected: `{"status":"ok","timestamp":"...",...}`

### 3. Test TMDB Endpoints
```bash
curl "http://localhost:3001/api/tmdb/trending?media_type=movie&page=1"
curl "http://localhost:3001/api/tmdb/popular?media_type=movie&page=1"
curl "http://localhost:3001/api/tmdb/top-rated?media_type=movie&page=1"
```

### 4. Run Automated Test
```bash
cd backend
node test-proxy-fallback.js
```

## Files Modified

### 1. `src/routes/tmdb.js`
- Added proxy fallback mechanism
- Automatic error detection and routing
- Seamless fallback for trending, popular, and top-rated endpoints

### 2. `tmdb-proxy-server.js` (Existing)
- Dedicated proxy server for TMDB API calls
- Uses `undici` HTTP client (more reliable than axios for TLS)
- Handles CORS and error responses

### 3. `start-with-proxy.sh` (New)
- Automated startup script for both servers
- Health checks and graceful shutdown
- Process management and cleanup

### 4. `test-proxy-fallback.js` (New)
- Comprehensive testing of the fallback system
- Verifies both servers are running
- Tests all TMDB endpoints

## Environment Variables

### Required
```bash
TMDB_API_KEY=your_actual_tmdb_api_key_here
```

### Optional
```bash
TMDB_PROXY_URL=http://localhost:5001  # Default proxy URL
PROXY_PORT=5001                        # Proxy server port
```

## Troubleshooting

### Issue: Proxy Server Won't Start
```bash
# Check if port 5001 is available
lsof -i :5001

# Kill any existing process
kill -9 <PID>

# Restart proxy server
node tmdb-proxy-server.js
```

### Issue: Main Backend Won't Start
```bash
# Check if port 3001 is available
lsof -i :3001

# Kill any existing process
kill -9 <PID>

# Restart backend
npm start
```

### Issue: Still Getting 500 Errors
1. Check both servers are running:
   ```bash
   curl http://localhost:5001/health
   curl http://localhost:3001/api/health
   ```

2. Check backend logs for proxy fallback attempts:
   ```bash
   tail -f server.log
   ```

3. Verify TMDB API key is set:
   ```bash
   echo $TMDB_API_KEY
   ```

## Production Deployment

### Render.com
1. Set environment variables in Render dashboard
2. Use the startup script in your build command
3. Ensure both ports are accessible

### Docker
```dockerfile
# Use stable Node.js version
FROM node:20.11.0-alpine

# Copy startup script
COPY start-with-proxy.sh /app/
RUN chmod +x /app/start-with-proxy.sh

# Use startup script as entrypoint
CMD ["/app/start-with-proxy.sh"]
```

## Benefits of This Solution

1. **Zero Downtime** - Automatic fallback when TLS issues occur
2. **Transparent** - Frontend doesn't need any changes
3. **Reliable** - Multiple HTTP clients and fallback mechanisms
4. **Maintainable** - Clear separation of concerns
5. **Scalable** - Can easily add more proxy servers if needed

## Monitoring

### Health Check Endpoints
- Main Backend: `http://localhost:3001/api/health`
- Proxy Server: `http://localhost:5001/health`
- TMDB Health: `http://localhost:3001/api/tmdb/health`

### Logs
- Main Backend: `server.log`
- Proxy Server: Console output
- Look for "Attempting proxy fallback" messages

## Support

If you continue to experience issues:

1. **Check both servers are running** on the correct ports
2. **Verify TMDB API key** is valid and active
3. **Check network connectivity** to TMDB API
4. **Review server logs** for specific error messages
5. **Test with the diagnostic script** to isolate issues

## Summary

This solution provides a robust, production-ready fix for your TMDB 500 errors by:
- Implementing automatic proxy fallback
- Using stable Node.js versions
- Providing comprehensive error handling
- Maintaining backward compatibility
- Offering easy deployment and monitoring

Your frontend will now receive successful responses from TMDB endpoints, resolving the 500 errors you were experiencing. 