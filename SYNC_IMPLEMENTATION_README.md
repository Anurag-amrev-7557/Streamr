# Frontend-Backend Sync Implementation

This document describes the implementation of automatic synchronization between localStorage and the backend for watchlist and viewing progress data.

## Overview

The sync system provides seamless data synchronization between the frontend localStorage and backend database, ensuring that user data is always up-to-date across devices and sessions.

## Features

- **Automatic Sync**: Data syncs every 5 minutes when online
- **Real-time Updates**: Immediate sync when data changes
- **Offline Support**: Queues sync operations when offline
- **Conflict Resolution**: Merges local and backend data intelligently
- **Cross-tab Sync**: Syncs data across multiple browser tabs
- **Error Handling**: Automatic retry with exponential backoff
- **Status Indicators**: Visual feedback on sync status

## Architecture

### Backend Components

#### 1. User Model Updates (`backend/src/models/User.js`)
- Enhanced `watchlist` field to store full content data
- Enhanced `watchHistory` field to store viewing progress
- Added helper methods for data management

#### 2. API Routes (`backend/src/routes/user.js`)
```
GET    /api/user/watchlist              - Get user watchlist
POST   /api/user/watchlist              - Add item to watchlist
DELETE /api/user/watchlist/:tmdbId/:type - Remove item from watchlist
POST   /api/user/watchlist/sync         - Sync watchlist from localStorage

GET    /api/user/viewing-progress       - Get user viewing progress
POST   /api/user/viewing-progress       - Update viewing progress
POST   /api/user/viewing-progress/sync  - Sync viewing progress from localStorage
```

#### 3. Controller Methods (`backend/src/controllers/userController.js`)
- `getWatchlist()` - Retrieve user's watchlist
- `addToWatchlist()` - Add content to watchlist
- `removeFromWatchlist()` - Remove content from watchlist
- `syncWatchlist()` - Sync localStorage data with backend
- `getViewingProgress()` - Retrieve viewing progress
- `updateViewingProgress()` - Update viewing progress
- `syncViewingProgress()` - Sync localStorage data with backend

### Frontend Components

#### 1. Sync Service (`frontend/src/services/syncService.js`)
- Manages sync queue and operations
- Handles online/offline events
- Provides periodic sync functionality
- Manages error handling and retries

#### 2. Enhanced API Service (`frontend/src/services/api.js`)
- Added watchlist management methods
- Added viewing progress management methods
- Added sync methods for bulk operations

#### 3. Context Updates
- **WatchlistContext**: Integrated with sync service
- **ViewingProgressContext**: Integrated with sync service
- Automatic sync triggers on data changes

#### 4. Custom Hooks
- **useSync**: Provides sync functionality and status
- Real-time sync status updates
- Force sync capabilities

#### 5. UI Components
- **SyncIndicator**: Visual sync status indicator
- Shows current sync status
- Allows manual sync triggering

## Usage

### Basic Sync Usage

```jsx
import { useSync } from '../hooks/useSync';

const MyComponent = () => {
  const { isSyncing, lastSyncTime, forceSync } = useSync();
  
  return (
    <div>
      <p>Sync Status: {isSyncing ? 'Syncing...' : 'Idle'}</p>
      <p>Last Sync: {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never'}</p>
      <button onClick={forceSync}>Sync Now</button>
    </div>
  );
};
```

### Adding Sync Indicator

```jsx
import SyncIndicator from '../components/SyncIndicator';

const Navbar = () => {
  return (
    <nav>
      {/* Other navbar items */}
      <SyncIndicator className="ml-auto" />
    </nav>
  );
};
```

### Manual Sync Triggering

```jsx
import { useSync } from '../hooks/useSync';

const MyComponent = () => {
  const { queueSync } = useSync();
  
  const handleDataChange = () => {
    // Update local data
    updateLocalData();
    
    // Queue sync with backend
    queueSync('watchlist');
  };
};
```

## Data Flow

### 1. Local Data Change
1. User performs action (add to watchlist, update progress)
2. Frontend updates localStorage
3. Context triggers sync service
4. Sync service queues sync operation

### 2. Sync Process
1. Sync service processes queue
2. Data is sent to backend via API
3. Backend validates and stores data
4. Frontend receives confirmation
5. Sync status is updated

### 3. Data Merging
1. Frontend loads data from backend on login
2. Local and backend data are merged
3. Conflicts are resolved (backend data takes precedence)
4. Merged data is stored in localStorage

## Configuration

### Sync Intervals
- **Automatic Sync**: Every 5 minutes when online
- **Immediate Sync**: On data changes
- **Manual Sync**: User-triggered via UI

### Retry Logic
- **Max Retries**: 3 attempts
- **Retry Delay**: Exponential backoff (10s, 20s, 30s)
- **Error Handling**: Graceful degradation on sync failures

### Offline Behavior
- Sync operations are queued when offline
- Automatic sync resumes when connection is restored
- No data loss during offline periods

## Error Handling

### Network Errors
- Automatic retry with exponential backoff
- Queue management for failed operations
- User notification for persistent failures

### Data Validation
- Backend validates all incoming data
- Invalid data is rejected with error messages
- Frontend handles validation errors gracefully

### Conflict Resolution
- Backend data takes precedence over local data
- Merge strategies for different data types
- Timestamp-based conflict resolution

## Performance Considerations

### Batch Operations
- Multiple changes are batched together
- Reduced API calls for better performance
- Efficient data transfer

### Caching
- Local data is cached in localStorage
- Backend data is fetched only when needed
- Smart merging reduces unnecessary updates

### Memory Management
- Large datasets are processed in chunks
- Efficient data structures for quick access
- Cleanup of old sync data

## Security

### Authentication
- All sync operations require valid JWT tokens
- User data is isolated per user account
- Secure API endpoints with rate limiting

### Data Validation
- Input sanitization on both frontend and backend
- Type checking and validation
- Protection against malicious data

## Testing

### Backend Testing
```bash
# Test watchlist endpoints
npm test -- --grep "watchlist"

# Test viewing progress endpoints
npm test -- --grep "viewing-progress"
```

### Frontend Testing
```bash
# Test sync functionality
npm test -- --grep "sync"

# Test context integration
npm test -- --grep "WatchlistContext"
```

## Monitoring

### Sync Status
- Real-time sync status monitoring
- Queue length tracking
- Error rate monitoring
- Performance metrics

### Logging
- Detailed sync operation logs
- Error logging with stack traces
- Performance timing logs
- User action logs

## Troubleshooting

### Common Issues

#### 1. Sync Not Working
- Check user authentication status
- Verify network connectivity
- Check browser console for errors
- Verify backend service availability

#### 2. Data Not Syncing
- Check sync service initialization
- Verify localStorage permissions
- Check API endpoint availability
- Review error logs

#### 3. Performance Issues
- Monitor sync frequency
- Check data size and complexity
- Review network conditions
- Optimize data structures

### Debug Mode
Enable debug logging by setting:
```javascript
localStorage.setItem('debug_sync', 'true');
```

## Future Enhancements

### Planned Features
- **Real-time Sync**: WebSocket-based live updates
- **Conflict Resolution UI**: User choice for data conflicts
- **Sync Analytics**: Detailed sync performance metrics
- **Offline Mode**: Enhanced offline functionality
- **Multi-device Sync**: Cross-device synchronization

### Performance Improvements
- **Incremental Sync**: Only sync changed data
- **Compression**: Compress data during transfer
- **Background Sync**: Service worker-based sync
- **Smart Caching**: Intelligent data caching strategies

## Support

For issues or questions regarding the sync implementation:
1. Check the browser console for error messages
2. Review the sync status indicator
3. Check network connectivity
4. Verify backend service status
5. Review this documentation

## Contributing

When contributing to the sync system:
1. Follow the existing code patterns
2. Add comprehensive error handling
3. Include proper logging
4. Update this documentation
5. Add appropriate tests
