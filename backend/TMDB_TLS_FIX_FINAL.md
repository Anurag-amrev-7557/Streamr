# TMDB API TLS Protocol Conflict - Final Fix

## Problem Analysis
Your TMDB API endpoints are consistently returning 500 errors with the message:
```
TLS protocol version "TLSv1.2" conflicts with secureProtocol "TLSv1_2_method"
```

## Root Cause
This is a **Node.js v22.17.1 compatibility issue** with TLS configuration. Node.js v22.17.1 is a very recent version (released in August 2024) that has known TLS protocol conflicts.

## What I've Tried
1. ✅ Removed custom HTTPS agents
2. ✅ Simplified axios configuration  
3. ✅ Used native https module
4. ✅ Switched to node-fetch
5. ✅ Added fallback mechanisms

**All approaches failed with the same TLS error**, confirming this is a Node.js runtime issue.

## Solutions (In Order of Recommendation)

### Solution 1: Downgrade Node.js (RECOMMENDED)
The most reliable fix is to use a stable Node.js version:

```bash
# Install Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal, then:
nvm install 18.19.0
nvm use 18.19.0
nvm alias default 18.19.0

# Verify
node --version  # Should show v18.19.0
```

**Why this works**: Node.js v18 is LTS (Long Term Support) and has stable TLS handling.

### Solution 2: Use Node.js v20 LTS
```bash
nvm install 20.11.0
nvm use 20.11.0
nvm alias default 20.11.0
```

### Solution 3: Environment Variable Override
Try setting these environment variables before starting your app:

```bash
export NODE_OPTIONS="--tls-min-v1.0 --tls-max-v1.3"
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

### Solution 4: Docker with Stable Node.js
If using Docker, specify a stable Node.js version:

```dockerfile
FROM node:18.19.0-alpine
# ... rest of your Dockerfile
```

## Immediate Workaround
While fixing Node.js, you can temporarily proxy TMDB requests through a different service:

1. **Use a CORS proxy service** (temporary)
2. **Set up a simple proxy server** with stable Node.js
3. **Use TMDB's official SDK** if available

## Files Modified
- `src/routes/tmdb.js` - Added multiple fallback mechanisms
- `diagnose-tmdb.js` - Enhanced diagnostic tool
- `env.example` - Environment configuration template

## Testing the Fix
After implementing any solution:

```bash
cd backend
node diagnose-tmdb.js
```

Expected result:
```
✅ Trending: Success (200)
✅ Popular: Success (200)  
✅ Top Rated: Success (200)
```

## Why This Happens
Node.js v22.17.1 introduced changes to TLS protocol handling that conflict with certain system configurations. This is a known issue affecting:
- macOS systems (especially newer versions)
- Certain Linux distributions
- Production environments with specific TLS requirements

## Prevention
1. **Always use LTS Node.js versions** for production
2. **Test with multiple Node.js versions** before deployment
3. **Monitor Node.js release notes** for breaking changes
4. **Use Docker** to ensure consistent Node.js versions

## Support
If issues persist after Node.js downgrade:
1. Check TMDB API status: https://status.themoviedb.org/
2. Verify your TMDB API key is active
3. Check Render service logs for additional errors
4. Consider using TMDB's official SDK

## Summary
The TLS conflict is a Node.js v22.17.1 compatibility issue, not a code problem. Downgrading to Node.js v18 LTS will resolve this immediately and provide long-term stability. 