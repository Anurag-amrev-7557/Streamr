# Preview Mode Offline Issue Fix

## Problem
When running `npm run preview`, the app shows an offline page even when the network is working. This happens because:

1. The PWA service worker is being too aggressive in offline detection
2. The service worker cache is interfering with preview mode
3. Network timeouts are too short for development environments

## Solutions Implemented

### 1. Updated PWA Configuration
- Disabled PWA in development mode to avoid conflicts
- Increased network timeouts for better reliability
- Added more lenient offline detection for preview mode

### 2. Enhanced Offline Page
- Added better connection status detection
- Implemented preview mode detection
- Added automatic reload when connection is restored
- Improved user feedback with connection status indicators

### 3. Development Helper Utilities
- Created `previewModeHelper.js` for better development handling
- Added automatic service worker cache clearing in development
- Implemented multiple network connectivity tests

### 4. Updated Network Status Component
- Simplified network status detection
- Added preview mode awareness
- Better offline/online state management

## How to Use

### For Development
```bash
# Normal development
npm run dev

# Preview with clean build
npm run preview:clean

# Clear cache if issues persist
npm run clear-cache
```

### For Production
```bash
# Build and preview
npm run build
npm run preview
```

## Troubleshooting

### If you still see the offline page:

1. **Clear browser cache and service workers:**
   - Open DevTools (F12)
   - Go to Application tab
   - Clear Storage (Service Workers, Cache Storage)
   - Reload the page

2. **Use the clean preview command:**
   ```bash
   npm run preview:clean
   ```

3. **Check network connectivity:**
   - The app now tests multiple endpoints
   - Check if `/api/health` is accessible
   - Verify TMDB API connectivity

4. **Force reload:**
   - Press Ctrl+Shift+R (or Cmd+Shift+R on Mac)
   - This bypasses the service worker cache

### Preview Mode Detection
The app now automatically detects preview mode and adjusts behavior:
- More lenient offline detection
- Automatic service worker cache clearing
- Better network connectivity testing

## Technical Details

### Service Worker Configuration
- Disabled in development mode
- Increased network timeouts (20 seconds for TMDB API)
- Better cache management

### Network Testing
The app tests connectivity to:
1. `/api/health` (local backend)
2. `https://api.themoviedb.org/3/configuration` (TMDB API)
3. `https://httpbin.org/get` (external test)

### Offline Detection
- Uses `navigator.onLine` for basic detection
- Implements active network testing
- Provides visual feedback on connection status

## Files Modified
- `vite.config.js` - PWA configuration updates
- `public/offline.html` - Enhanced offline page
- `src/main.jsx` - Development-friendly service worker handling
- `src/components/NetworkStatus.jsx` - Simplified network status
- `src/utils/previewModeHelper.js` - New helper utilities
- `package.json` - Added new scripts

## Future Improvements
- Consider implementing a more sophisticated offline detection algorithm
- Add user preferences for offline behavior
- Implement progressive loading for better offline experience 