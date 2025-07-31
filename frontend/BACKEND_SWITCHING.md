# Backend Switching Guide

This guide explains how to switch between local and deployed backends for development.

## Quick Switch

### Method 1: Browser Console
Open your browser's developer console and run:

```javascript
// Switch to local backend
switchBackend('local')

// Switch to deployed backend  
switchBackend('deployed')

// Check current configuration
getCurrentBackend()

// Log current configuration
logBackendConfig()
```

### Method 2: Edit Configuration File
Edit `src/config/api.js` and change the `mode`:

```javascript
const API_CONFIG = {
  mode: 'local',  // Change to 'deployed' for production backend
  // ... rest of config
};
```

## Backend URLs

### Local Backend
- API: `http://localhost:3001/api`
- Socket: `http://localhost:3001/community`
- Status: ✅ Working with CORS

### Deployed Backend  
- API: `https://streamr-jjj9.onrender.com/api`
- Socket: `https://streamr-jjj9.onrender.com/community`
- Status: ⚠️ CORS issues with localhost

## Troubleshooting

### CORS Issues
If you see CORS errors when using the deployed backend:
1. Switch to local backend: `switchBackend('local')`
2. Or use the deployed frontend at `https://streamr-see.web.app`

### Local Backend Not Working
Make sure the local backend is running:
```bash
cd backend
npm start
```

### Check Current Configuration
```javascript
logBackendConfig()
```

## Development Workflow

1. **Local Development**: Use `switchBackend('local')` for development
2. **Testing Deployed**: Use `switchBackend('deployed')` to test production backend
3. **Production**: Deployed frontend automatically uses deployed backend

## Available Functions

- `switchBackend(mode)` - Switch between 'local' and 'deployed'
- `getCurrentBackend()` - Get current configuration
- `logBackendConfig()` - Log current configuration to console
- `isLocalBackend()` - Check if using local backend
- `isDeployedBackend()` - Check if using deployed backend 