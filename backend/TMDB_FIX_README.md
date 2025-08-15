# TMDB API 500 Error Fix

## Problem
Your TMDB API endpoints (`/api/tmdb/trending`, `/api/tmdb/popular`, `/api/tmdb/top-rated`) are returning 500 Internal Server Errors.

## Root Cause
The most likely cause is that the `TMDB_API_KEY` environment variable is not set in your backend deployment on Render.

## What I Fixed

### 1. Enhanced Error Handling
- Added comprehensive error logging for all TMDB endpoints
- Improved error responses with detailed information
- Added request/response logging for debugging

### 2. Added Health Endpoints
- `/api/tmdb/health` - Shows TMDB configuration status
- `/api/health` - General backend health check

### 3. Better Request Configuration
- Added User-Agent header to TMDB requests
- Improved HTTPS agent configuration
- Added response validation

## How to Fix

### Step 1: Get a TMDB API Key
1. Go to [TMDB Settings](https://www.themoviedb.org/settings/api)
2. Request an API key (v3 auth)
3. Copy your API key

### Step 2: Set Environment Variable on Render
1. Go to your Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add environment variable:
   - **Key**: `TMDB_API_KEY`
   - **Value**: `your_actual_api_key_here`
5. Save and redeploy

### Step 3: Test the Fix
Run the diagnostic script:
```bash
cd backend
node diagnose-tmdb.js
```

## Files Modified
- `src/routes/tmdb.js` - Enhanced error handling and logging
- `env.example` - Environment configuration template
- `diagnose-tmdb.js` - Diagnostic tool

## Expected Results
After fixing the API key:
- ✅ `/api/tmdb/trending` returns movie data
- ✅ `/api/tmdb/popular` returns movie data  
- ✅ `/api/tmdb/top-rated` returns movie data
- ✅ `/api/tmdb/health` shows "configured" status

## Troubleshooting
If you still get errors after setting the API key:

1. **Check Render logs** for detailed error messages
2. **Verify API key** is correct and active
3. **Check TMDB API status** at [TMDB Status](https://status.themoviedb.org/)
4. **Run diagnostic script** to identify issues

## Environment Variables Required
```bash
TMDB_API_KEY=your_tmdb_api_key_here
NODE_ENV=production
MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret
```

## API Rate Limits
TMDB has rate limits:
- 1000 requests per day for free tier
- Consider implementing caching for production use

## Support
If issues persist:
1. Check Render service logs
2. Verify environment variables are set
3. Test with diagnostic script
4. Check TMDB API documentation 