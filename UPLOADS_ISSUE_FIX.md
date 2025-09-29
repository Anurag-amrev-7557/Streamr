# Uploads Issue Fix Guide

## Problem Description
You're encountering a "Cannot GET /uploads/6844285ef387e7f41cfbf3ef-1755895805125.png" error. This happens because:

1. **Frontend is configured to use deployed backend** (`mode: 'deployed'` in `frontend/src/config/api.js`)
2. **Local backend doesn't have the uploaded files** - they're stored on the deployed server
3. **File path mismatch** between local and deployed environments

## Root Cause
The file `6844285ef387e7f41cfbf3ef-1755895805125.png` was uploaded to the deployed backend at `https://streamr-jjj9.onrender.com`, but your local backend at `http://localhost:3001` doesn't have this file.

## Solutions

### Solution 1: Switch to Local Backend (Recommended for Development)

```javascript
// In your browser console or code:
import BackendSwitcher from './src/utils/backendSwitcher';

// Switch to local backend
BackendSwitcher.switchToLocal();

// Or manually change the config:
// In frontend/src/config/api.js, change:
mode: 'local' // instead of 'deployed'
```

**Benefits:**
- Faster development
- No network dependencies
- Full control over data

**Drawbacks:**
- No access to production data/files
- Need to re-upload files locally

### Solution 2: Use the Proxy Endpoint (Best of Both Worlds)

The backend now includes a proxy endpoint that can fetch files from the deployed backend when they're not available locally:

```
GET /api/upload/proxy/:filename
```

**Example:**
```
GET /api/upload/proxy/6844285ef387e7f41cfbf3ef-1755895805125.png
```

**How it works:**
1. Check if file exists locally in `backend/uploads/`
2. If not found, fetch from `https://streamr-jjj9.onrender.com/uploads/:filename`
3. Stream the file back to the client
4. Cache headers for performance

### Solution 3: Use the SafeImage Component

Replace regular `<img>` tags with the new `SafeImage` component:

```jsx
import SafeImage from './components/common/SafeImage';

// Instead of:
<img src="/uploads/profile.png" alt="Profile" />

// Use:
<SafeImage 
  src="/uploads/profile.png" 
  alt="Profile"
  fallbackSrc="/default-avatar.png"
/>
```

**Features:**
- Automatic URL resolution based on backend mode
- Graceful fallback for missing images
- Loading states
- Error handling

## Quick Fix Commands

### For Development:
```bash
# In your browser console:
BackendSwitcher.setupForDevelopment()
```

### For Production:
```bash
# In your browser console:
BackendSwitcher.setupForProduction()
```

### Manual Configuration:
```javascript
// In frontend/src/config/api.js
const API_CONFIG = {
  mode: 'local', // Change this line
  // ... rest of config
};
```

## File Structure

```
backend/
├── uploads/                    # Local uploads directory
├── src/
│   ├── routes/
│   │   └── upload.js          # New proxy endpoint
│   └── index.js               # Updated with upload routes
frontend/
├── src/
│   ├── config/
│   │   └── api.js             # Enhanced with file URL helpers
│   ├── components/
│   │   └── common/
│   │       └── SafeImage.jsx  # New safe image component
│   └── utils/
│       └── backendSwitcher.js # Backend management utility
└── public/
    └── default-avatar.png     # Fallback image (add your own)
```

## Testing the Fix

1. **Start your local backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Test the proxy endpoint:**
   ```bash
   curl http://localhost:3001/api/upload/proxy/6844285ef387e7f41cfbf3ef-1755895805125.png
   ```

3. **Check the uploads directory:**
   ```bash
   ls -la backend/uploads/
   ```

4. **Test in browser:**
   ```javascript
   // In browser console:
   BackendSwitcher.logStatus();
   BackendSwitcher.testConnectivity();
   ```

## Environment Variables

You can also control the backend mode using environment variables:

```bash
# In your .env file:
VITE_API_URL=http://localhost:3001/api
VITE_BASE_URL=http://localhost:3001
```

## Troubleshooting

### If proxy endpoint fails:
1. Check if `node-fetch` is installed: `npm install node-fetch@2`
2. Verify the deployed backend is accessible
3. Check CORS settings

### If images still don't load:
1. Verify the file path is correct
2. Check browser network tab for errors
3. Ensure the backend is running on the expected port

### If switching backends doesn't work:
1. Refresh the page after switching
2. Check console for errors
3. Verify the config file is saved

## Best Practices

1. **For Development:** Use local backend with proxy for missing files
2. **For Production:** Use deployed backend for consistency
3. **Always use SafeImage component** for user-uploaded content
4. **Test both modes** before deploying
5. **Keep uploads directory in .gitignore** to avoid committing user files

## Summary

The uploads issue is resolved by:
1. ✅ **Proxy endpoint** for fetching files from deployed backend
2. ✅ **SafeImage component** for graceful image handling
3. ✅ **Backend switcher utility** for easy mode management
4. ✅ **Enhanced API configuration** with file URL helpers

Choose the solution that best fits your development workflow!
