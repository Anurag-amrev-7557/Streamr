# Cross-Device Sync Debugging Guide

## What Should Be Working Now

After the recent fixes, the following should be working:

✅ **Watchlist**: Immediate backend sync + 30-second periodic refresh  
✅ **Watch History**: Immediate backend sync + 30-second periodic refresh  
✅ **Viewing Progress**: 30-second periodic refresh + auto-sync on changes  
✅ **Authentication Events**: Auto-reload on login/logout  
✅ **Cross-Tab Communication**: Storage events for multiple tabs  

## Debugging Steps

### 1. **Check Browser Console for Sync Logs**

Open the browser console and look for these messages:

#### **Watchlist Sync Logs**
```
✅ Loaded watchlist from backend: X items
✅ Watchlist synced to backend after addition
✅ Watchlist synced to backend after removal
✅ Performing periodic watchlist refresh from backend
✅ Watchlist data changed on backend, updating local state
```

#### **Watch History Sync Logs**
```
✅ Loaded watch history from backend: X items
✅ Watch history synced to backend after addition
✅ Watch history synced to backend after progress update
✅ Watch history synced to backend after removal
✅ Performing periodic watch history refresh from backend
✅ Watch history data changed on backend, updating local state
```

#### **Viewing Progress Sync Logs**
```
✅ Loaded viewing progress from backend: X items
✅ Viewing progress automatically synced with backend
✅ Performing periodic viewing progress refresh from backend
✅ Viewing progress data changed on backend, updating local state
```

#### **Authentication Event Logs**
```
✅ Auth token changed, reloading watchlist from backend
✅ Auth change detected, reloading watchlist from backend
✅ Auth token changed, reloading watch history from backend
✅ Auth change detected, reloading watch history from backend
✅ Auth token changed, reloading viewing progress from backend
✅ Auth change detected, reloading viewing progress from backend
```

### 2. **Test Authentication Events**

In the browser console, manually trigger auth events:

```javascript
// Test login event
window.dispatchEvent(new CustomEvent('auth-changed', { 
  detail: { action: 'login' } 
}));

// Test storage change event
const storageEvent = new StorageEvent('storage', {
  key: 'accessToken',
  newValue: 'new-token-123',
  oldValue: 'old-token-456'
});
window.dispatchEvent(storageEvent);
```

You should see the corresponding reload messages in the console.

### 3. **Test Manual Refresh Functions**

Use the context functions to manually refresh data:

```javascript
// In browser console, access the contexts
const { refreshFromBackend: refreshWatchlist } = useWatchlist();
const { refreshFromBackend: refreshHistory } = useWatchHistory();
const { refreshFromBackend: refreshProgress } = useViewingProgress();

// Test manual refresh
await refreshWatchlist();
await refreshHistory();
await refreshProgress();
```

### 4. **Check Network Tab**

1. Open browser DevTools → Network tab
2. Perform an action (add to watchlist, watch content, etc.)
3. Look for API calls to:
   - `/user/watchlist/sync` (watchlist changes)
   - `/user/watch-history/sync` (watch history changes)
   - `/user/viewing-progress/sync` (viewing progress changes)
   - `/user/watchlist` (periodic refresh)
   - `/user/watch-history` (periodic refresh)
   - `/user/viewing-progress` (periodic refresh)

### 5. **Test Cross-Device Scenario**

1. **Open two browser tabs/windows**
2. **Log in with same account on both**
3. **On Tab A**: Add item to watchlist
4. **On Tab B**: Wait 30 seconds, check if item appears
5. **On Tab B**: Watch some content
6. **On Tab A**: Wait 30 seconds, check if content appears in history
7. **On Tab A**: Start watching a movie
8. **On Tab B**: Wait 30 seconds, check if progress syncs

### 6. **Check Context State**

In the browser console, check the context state:

```javascript
// Check watchlist context
const { watchlist, isInitialized, isSyncing, lastBackendSync } = useWatchlist();
console.log('Watchlist state:', { 
  items: watchlist.length, 
  isInitialized, 
  isSyncing, 
  lastBackendSync 
});

// Check watch history context
const { watchHistory, isInitialized, isSyncing, lastBackendSync } = useWatchHistory();
console.log('Watch history state:', { 
  items: watchHistory.length, 
  isInitialized, 
  isSyncing, 
  lastBackendSync 
});

// Check viewing progress context
const { viewingProgress, isInitialized } = useViewingProgress();
console.log('Viewing progress state:', { 
  items: Object.keys(viewingProgress).length, 
  isInitialized 
});
```

### 7. **Check localStorage**

Verify that data is being saved to localStorage:

```javascript
// Check localStorage
console.log('Watchlist localStorage:', localStorage.getItem('watchlist'));
console.log('Watch history localStorage:', localStorage.getItem('watchHistory'));
console.log('Viewing progress localStorage:', localStorage.getItem('viewingProgress'));
console.log('Access token:', localStorage.getItem('accessToken'));
```

### 8. **Test Periodic Refresh**

Wait for the 30-second periodic refresh and check console for:

```
✅ Performing periodic watchlist refresh from backend
✅ Performing periodic watch history refresh from backend
✅ Performing periodic viewing progress refresh from backend
```

## Common Issues and Solutions

### **Issue 1: No sync logs in console**
**Possible causes:**
- Contexts not properly initialized
- API calls failing silently
- Authentication token missing

**Solutions:**
- Check if user is logged in
- Verify accessToken exists in localStorage
- Check network tab for failed API calls

### **Issue 2: Data not syncing between devices**
**Possible causes:**
- Periodic refresh not working
- Change detection failing
- Backend sync not happening

**Solutions:**
- Check if 30-second intervals are working
- Verify change detection logic
- Test manual refresh functions

### **Issue 3: Authentication events not working**
**Possible causes:**
- Event listeners not attached
- Event dispatching failing
- Context not responding to events

**Solutions:**
- Test manual event dispatching
- Check if event listeners are attached
- Verify context initialization

### **Issue 4: API calls failing**
**Possible causes:**
- Backend not running
- Authentication issues
- Network problems

**Solutions:**
- Check backend status
- Verify authentication token
- Check network connectivity

## Debug Commands

### **Force Manual Sync**
```javascript
// Force sync all data
const { forceSync: forceWatchlistSync } = useWatchlist();
const { forceSync: forceHistorySync } = useWatchHistory();

await forceWatchlistSync();
await forceHistorySync();
```

### **Check Pending Changes**
```javascript
// Debug pending changes
const { debugPendingChanges } = useWatchlist();
debugPendingChanges();
```

### **Test API Endpoints**
```javascript
// Test API directly
const response = await fetch('/api/user/watchlist', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
});
console.log('API response:', await response.json());
```

## Expected Behavior

### **Immediate Sync (0-2 seconds)**
- Adding items to watchlist
- Removing items from watchlist
- Adding items to watch history
- Updating watch history progress
- Starting to watch content

### **Periodic Sync (30 seconds)**
- Checking for changes from other devices
- Updating local state if backend data differs
- Syncing any local changes to backend

### **Authentication Sync (immediate)**
- Reloading all data when user logs in
- Clearing data when user logs out
- Cross-tab communication

## Still Not Working?

If the sync is still not working after following these debugging steps:

1. **Check the specific error messages** in the console
2. **Verify the backend is running** and accessible
3. **Check if the user is properly authenticated**
4. **Test with a fresh browser session**
5. **Verify the API endpoints are responding**

Report the specific error messages and behavior you're seeing for further assistance.
