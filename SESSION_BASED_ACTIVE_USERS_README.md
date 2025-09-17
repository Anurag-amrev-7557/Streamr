# 🔍 Session-Based Active User Tracking Implementation

## Overview

This implementation provides real-time active user tracking using a session-based method. It tracks unique user sessions and provides both WebSocket real-time updates and REST API endpoints for monitoring active users.

## 🏗️ Architecture

### Core Components

1. **Session Management**: Uses Express sessions with MongoDB store
2. **WebSocket Tracking**: Socket.IO connections with session-based user identification
3. **Active User Storage**: In-memory Set and Map for efficient tracking
4. **Cleanup Mechanism**: Automatic removal of stale sessions
5. **Rate Limiting**: Specific rate limits for the active users endpoint

### Data Structures

```javascript
// Track unique user sessions
const activeUsers = new Set(); // Contains user keys like "user_123" or "session_abc"

// Map session ID to detailed user info
const activeSessions = new Map(); // sessionId -> { userId, userKey, connectedAt, lastActivity }
```

## 🚀 Features

### ✅ Real-time Updates
- WebSocket connections broadcast active user count changes
- Immediate updates to all connected clients
- Heartbeat mechanism to track user activity

### ✅ Session-based Tracking
- Unique session identification
- Support for both authenticated and anonymous users
- Prevents duplicate counting across multiple browser tabs

### ✅ Automatic Cleanup
- Removes stale sessions after 5 minutes of inactivity
- Runs cleanup every 2 minutes
- Prevents memory leaks

### ✅ Debug Information
- Optional debug mode with detailed session information
- API endpoint provides comprehensive debugging data
- Real-time logging of connection events

### ✅ Rate Limiting
- Specific rate limiter for active users endpoint (10,000 requests per 15 minutes)
- Prevents abuse while allowing frequent polling

## 📡 API Endpoints

### GET /api/active-users

Returns the current active user count and optional debug information.

**Response:**
```json
{
  "count": 5,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "debug": {
    "totalConnections": 5,
    "activeUsersSet": 5,
    "activeSessionsMap": 5,
    "sampleUsers": ["user_123", "session_abc", "user_456"],
    "sessionDetails": [
      {
        "sessionId": "abc123",
        "userId": "123",
        "connectedAt": "2024-01-15T10:25:00.000Z",
        "lastActivity": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

## 🔌 WebSocket Events

### Client → Server Events

- `heartbeat`: Keep connection alive and update last activity

### Server → Client Events

- `activeUsers:update`: Broadcast when active user count changes
  ```json
  {
    "count": 5,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
  ```

## 🛠️ Configuration

### Environment Variables

```bash
# Enable debug logging for active users tracking
DEBUG_ACTIVE_USERS=true

# Session configuration
SESSION_SECRET=your-super-secret-session-key-here
MONGO_URI=mongodb://localhost:27017/streamr

# JWT for user authentication
JWT_SECRET=your-super-secret-jwt-key-here
```

### Session Configuration

The implementation uses MongoDB for session storage with the following settings:

```javascript
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60, // 24 hours
    autoRemove: 'native'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'none',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

## 🧪 Testing

### Test Scripts

1. **Comprehensive Test**: `test-session-based-active-users.js`
   - Tests API endpoint
   - Tests WebSocket connections
   - Tests multiple connections
   - Tests session consistency
   - Tests cleanup mechanism
   - Tests debug information

2. **HTML Test Page**: `test-session-active-users.html`
   - Interactive web interface
   - Real-time connection testing
   - Visual indicators and logging

### Running Tests

```bash
# Run comprehensive test
node test-session-based-active-users.js

# Open HTML test page in browser
open test-session-active-users.html
```

### Test Scenarios

1. **Single Connection**: Connect one client and verify count increases
2. **Multiple Connections**: Connect multiple clients and verify accurate counting
3. **Session Consistency**: Disconnect and reconnect to verify no double-counting
4. **Cleanup Mechanism**: Verify stale sessions are removed automatically
5. **Debug Information**: Verify debug data is available when enabled

## 🔧 Implementation Details

### User Identification

The system identifies users using a hierarchical approach:

1. **Authenticated Users**: `user_${userId}` (from JWT token)
2. **Anonymous Users**: `session_${sessionId}` (from session ID)

### Session Lifecycle

1. **Connection**: User connects via WebSocket
2. **Identification**: System determines user type (authenticated/anonymous)
3. **Tracking**: User added to active users set
4. **Activity**: Heartbeat updates last activity timestamp
5. **Cleanup**: Stale sessions removed after 5 minutes of inactivity
6. **Disconnection**: User removed from active users set

### Error Handling

- Graceful handling of connection failures
- Anonymous connections allowed even without authentication
- Automatic cleanup of stale sessions
- Comprehensive error logging

## 📊 Performance Considerations

### Memory Usage
- In-memory storage for fast access
- Automatic cleanup prevents memory leaks
- Efficient Set/Map data structures

### Scalability
- Session-based approach scales with user sessions
- MongoDB session store supports clustering
- Rate limiting prevents abuse

### Real-time Updates
- WebSocket broadcasting for instant updates
- Heartbeat mechanism for connection health
- Fallback API polling for reliability

## 🚨 Troubleshooting

### Common Issues

1. **Count Not Updating**
   - Check WebSocket connection status
   - Verify session middleware is properly configured
   - Check debug logs for connection events

2. **Duplicate Counting**
   - Ensure session IDs are unique
   - Check for multiple connections from same session
   - Verify cleanup mechanism is running

3. **Stale Sessions**
   - Check cleanup interval (runs every 2 minutes)
   - Verify heartbeat mechanism is working
   - Check session TTL settings

### Debug Mode

Enable debug mode to see detailed logging:

```bash
DEBUG_ACTIVE_USERS=true npm start
```

This will log:
- User connection/disconnection events
- Active user count changes
- Session cleanup events
- Detailed session information

## 🔄 Migration from Previous Implementation

If migrating from a previous active user tracking system:

1. **Backup existing data** if needed
2. **Update frontend** to use new WebSocket events
3. **Test thoroughly** with the provided test scripts
4. **Monitor performance** and adjust cleanup intervals if needed

## 📈 Monitoring

### Key Metrics to Monitor

1. **Active User Count**: Real-time user count
2. **Session Count**: Number of active sessions
3. **Connection Count**: WebSocket connections
4. **Cleanup Events**: Stale session removals
5. **API Response Times**: Endpoint performance

### Health Checks

- `/api/health`: General server health
- `/api/active-users`: Active users endpoint health
- WebSocket connection status

## 🎯 Best Practices

1. **Enable Debug Mode** in development for troubleshooting
2. **Monitor Memory Usage** to ensure cleanup is working
3. **Test Session Consistency** regularly
4. **Use Rate Limiting** to prevent abuse
5. **Implement Heartbeat** on client side for better tracking

## 🔮 Future Enhancements

Potential improvements for future versions:

1. **Redis Integration**: For distributed session storage
2. **User Analytics**: Track user behavior patterns
3. **Geographic Tracking**: Track users by location
4. **Device Tracking**: Track users across devices
5. **Historical Data**: Store active user history

---

## 📝 Summary

This session-based active user tracking implementation provides:

- ✅ **Real-time tracking** of active users
- ✅ **Session-based identification** for accurate counting
- ✅ **Automatic cleanup** of stale sessions
- ✅ **Comprehensive testing** tools
- ✅ **Debug capabilities** for troubleshooting
- ✅ **Rate limiting** for protection
- ✅ **Scalable architecture** for growth

The implementation is production-ready and includes comprehensive testing tools to verify functionality.
