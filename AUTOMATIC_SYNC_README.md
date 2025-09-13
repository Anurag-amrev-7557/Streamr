# Automatic Sync System for User Data

This document explains how the automatic synchronization system works between the frontend and backend for user watchlist and viewing progress data.

## Overview

The system automatically syncs user data (watchlist and viewing progress) with the backend whenever changes occur, eliminating the need for manual sync operations. This ensures that user data is always up-to-date across devices and sessions.

## How It Works

### 1. Frontend Contexts with Auto-Sync

#### WatchlistContext
- **Automatic Loading**: On component mount, loads existing watchlist from backend if user is authenticated
- **Automatic Syncing**: Whenever the watchlist changes (add/remove items), automatically syncs with backend after 1 second delay
- **Debounced Sync**: Uses debouncing to prevent excessive API calls during rapid changes

#### ViewingProgressContext
- **Automatic Loading**: On component mount, loads existing viewing progress from backend if user is authenticated
- **Automatic Syncing**: Whenever viewing progress changes (start watching, update progress), automatically syncs with backend after 1 second delay
- **Debounced Sync**: Uses debouncing to prevent excessive API calls during rapid changes

### 2. Backend API Endpoints

#### Watchlist Endpoints
- `POST /api/user/watchlist/sync` - Sync entire watchlist
- `GET /api/user/watchlist` - Get user's watchlist
- `POST /api/user/watchlist` - Add item to watchlist
- `DELETE /api/user/watchlist/:movieId` - Remove item from watchlist
- `DELETE /api/user/watchlist` - Clear entire watchlist

#### Viewing Progress Endpoints
- `POST /api/user/viewing-progress/sync` - Sync entire viewing progress
- `GET /api/user/viewing-progress` - Get user's viewing progress
- `PUT /api/user/viewing-progress` - Update viewing progress for specific item
- `DELETE /api/user/viewing-progress` - Clear entire viewing progress

### 3. Data Flow

```
User Action → Frontend Context Update → Local Storage → Backend Sync (1s delay)
     ↓
Backend Database Updated
     ↓
Other devices/sessions get updated data on next load
```

## Benefits

1. **Seamless Experience**: Users don't need to manually sync their data
2. **Cross-Device Sync**: Data is automatically available on all devices
3. **Data Persistence**: User data survives browser clearing and device changes
4. **Real-time Updates**: Changes are reflected immediately in the UI
5. **Efficient**: Debounced syncing prevents excessive API calls

## Technical Implementation

### Frontend Auto-Sync Logic

```javascript
// Example from WatchlistContext
useEffect(() => {
  const autoSyncWithBackend = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (watchlist.length > 0 && token) {
        await userAPI.syncWatchlist(watchlist);
        console.log('Watchlist automatically synced with backend');
      }
    } catch (error) {
      console.error('Auto-sync failed:', error);
    }
  };

  // Debounce sync to avoid too many API calls
  const syncTimeout = setTimeout(autoSyncWithBackend, 1000);
  
  return () => clearTimeout(syncTimeout);
}, [watchlist]);
```

### Backend Data Model

The User model has been enhanced with new fields:

```javascript
// Enhanced watchlist structure
watchlist: [{
  id: Number,
  title: String,
  poster_path: String,
  backdrop_path: String,
  overview: String,
  type: String, // 'movie' or 'tv'
  year: String,
  rating: Number,
  genres: [String],
  release_date: String,
  duration: String,
  director: String,
  cast: [String],
  addedAt: Date
}]

// Enhanced viewing progress structure
viewingProgress: {
  type: Map,
  of: {
    id: Number,
    title: String,
    type: String, // 'movie' or 'tv'
    poster_path: String,
    backdrop_path: String,
    lastWatched: Date,
    season: Number, // for TV shows
    episode: Number, // for TV shows
    episodeTitle: String, // for TV shows
    progress: Number // 0-100
  }
}
```

## Error Handling

- **Silent Failures**: Auto-sync failures don't show error toasts to avoid user confusion
- **Graceful Degradation**: If backend sync fails, data remains in localStorage
- **Retry Logic**: Failed syncs can be retried on next change
- **Authentication Checks**: Only syncs when user is authenticated

## Performance Considerations

1. **Debouncing**: 1-second delay prevents excessive API calls
2. **Token Validation**: Checks authentication before attempting sync
3. **Conditional Syncing**: Only syncs when there's actual data to sync
4. **Background Operations**: Sync operations don't block UI interactions

## Testing

Use the provided test script to verify endpoints:

```bash
cd backend
node test-sync-endpoints.js
```

Make sure to:
1. Start the backend server
2. Create a test user or update credentials in the test script
3. Install axios if not already installed: `npm install axios`

## Migration from Manual Sync

The previous manual sync system has been replaced with automatic syncing:

- ❌ Manual sync button removed from ProfilePage
- ❌ Manual sync functions removed
- ✅ Automatic sync on every data change
- ✅ Background loading from backend on app start
- ✅ Seamless user experience

## Future Enhancements

1. **Conflict Resolution**: Handle cases where data conflicts between devices
2. **Offline Support**: Queue sync operations when offline
3. **Real-time Updates**: WebSocket support for live updates across devices
4. **Sync Status Indicators**: Show sync status in UI (optional)
5. **Selective Syncing**: Allow users to choose what to sync

## Troubleshooting

### Common Issues

1. **Sync Not Working**: Check if user is authenticated (valid token in localStorage)
2. **Data Not Loading**: Verify backend endpoints are accessible
3. **Performance Issues**: Check if too many sync calls are being made

### Debug Information

Enable debug logging by checking browser console for:
- "Watchlist automatically synced with backend"
- "Viewing progress automatically synced with backend"
- "Loaded watchlist from backend: X items"
- "Loaded viewing progress from backend: X items"

## Conclusion

The automatic sync system provides a seamless, efficient way to keep user data synchronized across devices without requiring any user intervention. The system is robust, handles errors gracefully, and provides a better user experience than manual synchronization.
