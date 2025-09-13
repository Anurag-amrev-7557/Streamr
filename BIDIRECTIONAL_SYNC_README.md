# Bidirectional Synchronization System

## Overview

This document describes the comprehensive bidirectional synchronization system implemented for watchlist and watch history data between the frontend and backend. The system ensures that changes made in either the frontend or backend are automatically synchronized in both directions, with conflict resolution and real-time status monitoring.

## Features

### 🔄 Automatic Bidirectional Sync
- **Frontend → Backend**: Changes made in the frontend automatically sync to the backend
- **Backend → Frontend**: Data is loaded from backend on app initialization
- **Real-time Updates**: Continuous monitoring of sync status and conflicts

### 🛡️ Conflict Resolution
- **Timestamp-based Detection**: Conflicts are detected by comparing last modification times
- **Dual Data Return**: When conflicts occur, both server and client versions are returned
- **Force Sync/Load**: Manual conflict resolution options for users

### 📱 Offline Support
- **Local Storage Fallback**: Data is cached locally for offline access
- **Queue Management**: Pending changes are tracked and synced when online
- **Graceful Degradation**: App continues to work offline with local data

### 📊 Status Monitoring
- **Visual Indicators**: Real-time sync status display
- **Error Reporting**: Clear error messages and resolution options
- **Performance Metrics**: Sync timing and success rate tracking

## Architecture

### Frontend Components

#### 1. WatchlistContext (`frontend/src/contexts/WatchlistContext.jsx`)
```javascript
// Enhanced state management with sync tracking
const [isSyncing, setIsSyncing] = useState(false);
const [syncError, setSyncError] = useState(null);
const [lastBackendSync, setLastBackendSync] = useState(null);

// Refs for preventing infinite loops
const isUpdatingFromBackend = useRef(false);
const pendingChanges = useRef(new Set());
const lastLocalChange = useRef(null);
```

**Key Features:**
- Automatic backend sync with debouncing (1.5s delay)
- Pending change tracking to prevent sync loops
- Conflict detection and resolution
- Force sync/load capabilities

#### 2. WatchHistoryContext (`frontend/src/contexts/WatchHistoryContext.jsx`)
Similar to WatchlistContext but for watch history data.

**Key Features:**
- Progress tracking for movies and TV shows
- Automatic sync of viewing progress
- Conflict resolution for concurrent updates

#### 3. SyncStatusIndicator (`frontend/src/components/SyncStatusIndicator.jsx`)
Visual component showing real-time sync status.

**Features:**
- Overall sync status (syncing, synced, error, unknown)
- Individual status for watchlist and watch history
- Force sync/load buttons for conflict resolution
- Backend status information
- Last sync timestamps

### Backend Components

#### 1. Enhanced Sync Controllers (`backend/src/controllers/userController.js`)

##### `syncWatchlistEnhanced`
```javascript
exports.syncWatchlistEnhanced = async (req, res) => {
  const { watchlist, lastSync, clientVersion } = req.body;
  
  // Check for conflicts by comparing timestamps
  const serverLastModified = user.updatedAt;
  const hasConflicts = lastSync && new Date(lastSync) < serverLastModified;

  if (hasConflicts) {
    // Return both versions for conflict resolution
    return res.json({
      success: true,
      message: 'Conflicts detected, returning both versions',
      data: {
        watchlist: user.watchlist,
        serverVersion: serverLastModified,
        clientVersion: clientVersion,
        conflicts: true
      }
    });
  }

  // No conflicts, proceed with sync
  await user.syncWatchlist(watchlist);
  // ... rest of implementation
};
```

##### `syncWatchHistoryEnhanced`
Similar implementation for watch history with conflict detection.

#### 2. Sync Status Endpoint (`getSyncStatus`)
```javascript
exports.getSyncStatus = async (req, res) => {
  const user = await User.findById(req.user.id);
  
  res.json({
    success: true,
    data: {
      watchlist: {
        count: user.watchlist.length,
        lastModified: user.updatedAt,
        version: user.updatedAt
      },
      watchHistory: {
        count: user.watchHistory.length,
        lastModified: user.updatedAt,
        version: user.updatedAt
      },
      lastSync: user.updatedAt
    }
  });
};
```

### API Endpoints

#### Enhanced Sync Routes
```
POST /api/user/watchlist/sync/enhanced
POST /api/user/watch-history/sync/enhanced
GET /api/user/sync-status
```

#### Standard Sync Routes (Backward Compatible)
```
POST /api/user/watchlist/sync
POST /api/user/watch-history/sync
```

## Data Flow

### 1. Initial Load
```
App Start → Load from Backend → Update Local State → Save to LocalStorage
```

### 2. Frontend Changes
```
User Action → Update Local State → Mark as Pending → Debounced Sync → Backend Update
```

### 3. Conflict Detection
```
Sync Request → Check Timestamps → Detect Conflicts → Return Both Versions → User Resolution
```

### 4. Offline Handling
```
Offline Action → Update Local State → Queue for Sync → Online Detection → Process Queue
```

## Conflict Resolution Strategy

### 1. Automatic Detection
- **Timestamp Comparison**: Server vs. client last modification time
- **Version Tracking**: Client version included in sync requests
- **Conflict Flag**: Clear indication when conflicts are detected

### 2. Resolution Options
- **Force Sync**: Override server data with client data
- **Force Load**: Override client data with server data
- **Manual Merge**: User can manually resolve conflicts

### 3. Data Integrity
- **Atomic Operations**: All-or-nothing sync operations
- **Rollback Support**: Undo functionality for sync operations
- **Validation**: Data validation before and after sync

## Error Handling

### 1. Network Errors
- **Retry Logic**: Automatic retry with exponential backoff
- **Fallback**: Local storage as backup data source
- **User Notification**: Clear error messages and resolution steps

### 2. Sync Errors
- **Conflict Resolution**: Automatic conflict detection and user guidance
- **Partial Sync**: Handle partial sync failures gracefully
- **Data Recovery**: Recover from corrupted sync states

### 3. Validation Errors
- **Data Sanitization**: Clean and validate data before sync
- **Schema Validation**: Ensure data structure consistency
- **Error Reporting**: Detailed error information for debugging

## Performance Optimizations

### 1. Debouncing
- **Sync Delay**: 1.5-second delay to batch multiple changes
- **Change Tracking**: Only sync when necessary
- **Pending Change Management**: Prevent unnecessary API calls

### 2. Caching
- **Local Storage**: Fast access to frequently used data
- **Memory Caching**: In-memory state management
- **Backend Caching**: Server-side data caching

### 3. Batch Operations
- **Bulk Sync**: Sync entire datasets in single requests
- **Incremental Updates**: Only sync changed data when possible
- **Parallel Processing**: Concurrent sync operations

## Security Considerations

### 1. Authentication
- **JWT Tokens**: Secure API access
- **User Isolation**: Data isolation between users
- **Session Management**: Proper session handling

### 2. Data Validation
- **Input Sanitization**: Prevent malicious data injection
- **Schema Validation**: Ensure data structure integrity
- **Access Control**: Verify user permissions for data access

### 3. Rate Limiting
- **API Limits**: Prevent abuse and ensure fair usage
- **Sync Throttling**: Limit sync frequency to prevent spam
- **User Quotas**: Manage resource usage per user

## Usage Examples

### 1. Basic Sync Usage
```javascript
// Add to watchlist (automatically syncs)
const { addToWatchlist } = useWatchlist();
addToWatchlist(movieData);

// Remove from watchlist (automatically syncs)
const { removeFromWatchlist } = useWatchlist();
removeFromWatchlist(movieId);
```

### 2. Manual Sync Control
```javascript
// Force sync to backend
const { forceSync } = useWatchlist();
await forceSync();

// Force load from backend
const { forceLoad } = useWatchlist();
await forceLoad();
```

### 3. Sync Status Monitoring
```javascript
// Check sync status
const { isSyncing, syncError, lastBackendSync } = useWatchlist();

if (isSyncing) {
  console.log('Syncing with backend...');
}

if (syncError) {
  console.error('Sync error:', syncError);
}

if (lastBackendSync) {
  console.log('Last sync:', new Date(lastBackendSync));
}
```

## Troubleshooting

### Common Issues

#### 1. Sync Not Working
- Check authentication token
- Verify network connectivity
- Check browser console for errors
- Ensure backend is running

#### 2. Data Conflicts
- Use force sync/load options
- Check last sync timestamps
- Verify data consistency
- Clear local storage if needed

#### 3. Performance Issues
- Reduce sync frequency
- Optimize data size
- Check network conditions
- Monitor API response times

### Debug Mode
Enable debug logging by setting environment variables:
```bash
VITE_DEBUG_SYNC=true
VITE_LOG_LEVEL=debug
```

## Future Enhancements

### 1. Real-time Updates
- **WebSocket Integration**: Live updates across devices
- **Push Notifications**: Notify users of sync status
- **Multi-device Sync**: Synchronize across multiple devices

### 2. Advanced Conflict Resolution
- **Merge Algorithms**: Intelligent data merging
- **Conflict Visualization**: Better conflict display
- **Auto-resolution**: Automatic conflict resolution rules

### 3. Performance Improvements
- **Incremental Sync**: Only sync changed data
- **Compression**: Reduce data transfer size
- **Background Sync**: Offline sync when possible

## Conclusion

The bidirectional synchronization system provides a robust, user-friendly way to keep watchlist and watch history data synchronized between frontend and backend. With automatic conflict detection, offline support, and comprehensive error handling, users can trust that their data will always be up-to-date and accessible across all devices.

The system is designed to be:
- **Reliable**: Handles network issues and conflicts gracefully
- **Fast**: Optimized for performance with debouncing and caching
- **Secure**: Proper authentication and data validation
- **User-friendly**: Clear status indicators and resolution options

For developers, the system provides:
- **Clear APIs**: Easy-to-use context hooks and methods
- **Comprehensive Error Handling**: Detailed error information and recovery
- **Performance Monitoring**: Built-in performance tracking and optimization
- **Extensibility**: Easy to add new sync features and data types
