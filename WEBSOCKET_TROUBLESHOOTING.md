# WebSocket Connection Troubleshooting Guide

## Problem
You're seeing WebSocket connection errors like:
```
WebSocket connection to 'wss://streamr-jjj9.onrender.com/socket.io/?EIO=4&transport=websocket' failed: WebSocket is closed before the connection is established.
```

## Solutions

### 1. **Switch to Local Backend (Recommended for Development)**

If you're developing locally, switch to the local backend:

```javascript
// In frontend/src/config/api.js, change:
mode: 'local'  // instead of 'deployed'
```

Then start the backend server:

```bash
# Option 1: Use the startup script
./start-backend.sh

# Option 2: Manual startup
cd backend
npm install
npm run dev
```

### 2. **Check Backend Server Status**

The deployed backend at `https://streamr-jjj9.onrender.com` might be:
- **Sleeping** (Render.com free tier limitation)
- **Down** due to inactivity
- **Experiencing issues**

### 3. **Use the Backend Status Indicator**

The app now includes a **Backend Status Indicator** that will:
- Show when the backend is unavailable
- Provide a "Retry" button to reconnect
- Store data locally when backend is down
- Sync data when connection is restored

### 4. **Manual Backend Mode Switching**

You can switch backend modes programmatically:

```javascript
import { switchBackendMode, getCurrentBackendMode } from './config/api';

// Switch to local backend
switchBackendMode('local');

// Switch to deployed backend
switchBackendMode('deployed');

// Check current mode
console.log('Current backend:', getCurrentBackendMode());
```

### 5. **Test Backend Connectivity**

```javascript
import { testBackendConnectivity } from './config/api';

const isOnline = await testBackendConnectivity();
console.log('Backend online:', isOnline);
```

### 6. **Enhanced Socket Service Features**

The socket service now includes:
- **Automatic retry** with exponential backoff
- **Local data storage** when backend is unavailable
- **Data synchronization** when connection is restored
- **Better error handling** and logging
- **Fallback to polling** if WebSocket fails

### 7. **Development Setup**

For local development:

1. **Start MongoDB** (if using local database):
   ```bash
   # Install MongoDB or use Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

2. **Configure environment variables**:
   ```bash
   cd backend
   # Edit .env file with your configuration
   ```

3. **Start backend**:
   ```bash
   ./start-backend.sh
   ```

4. **Start frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

### 8. **Production Deployment**

For production, ensure:
- Backend server is running and accessible
- CORS is properly configured
- WebSocket ports are open
- SSL certificates are valid (for WSS)

### 9. **Debugging Tips**

1. **Check browser console** for detailed error messages
2. **Monitor network tab** for failed requests
3. **Use browser dev tools** to inspect WebSocket connections
4. **Check backend logs** for connection issues

### 10. **Common Issues and Fixes**

| Issue | Solution |
|-------|----------|
| CORS errors | Update CORS configuration in backend |
| Connection timeout | Increase timeout values in socket config |
| SSL certificate issues | Use HTTP for local development |
| Port conflicts | Change backend port in .env |
| Database connection | Check MongoDB connection string |

### 11. **Emergency Fallback**

If the backend is completely unavailable:
- The app will continue to work with limited features
- Data will be stored locally
- Users can still browse movies and TV shows
- Community features will be disabled until connection is restored

---

**Need Help?** Check the browser console for detailed error messages and refer to the backend logs for server-side issues. 