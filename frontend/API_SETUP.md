# API Setup Guide

## TMDB API Key Setup

To fix the CORS and network connectivity issues, you need to set up a TMDB API key:

### 1. Get a Free TMDB API Key

1. Go to [TMDB Settings](https://www.themoviedb.org/settings/api)
2. Create a free account if you don't have one
3. Request an API key (choose "Developer" option)
4. Copy your API key

### 2. Create Environment File

Create a `.env` file in the `frontend` directory with the following content:

```env
# TMDB API Configuration
VITE_TMDB_API_KEY=your_actual_api_key_here

# Backend Configuration (optional)
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001/community
```

### 3. Restart Development Server

After creating the `.env` file, restart your development server:

```bash
cd frontend
npm run dev
```

### 4. Verify Setup

Once the API key is configured, you should see:
- ✅ TMDB API Key is configured (in console)
- No more CORS errors
- Movie data loading properly

### Troubleshooting

- **CORS Errors**: These are now fixed by using CORS-friendly endpoints for network checks
- **401 Unauthorized**: This will be resolved once you add the API key
- **Network Connectivity**: The app now uses reliable endpoints for connectivity checks

### Alternative: Use Backend Proxy

If you prefer not to use the API key directly in the frontend, you can:
1. Set the API key in the backend's `.env` file
2. Use the backend's TMDB proxy routes instead
3. Update the frontend to use the backend API endpoints

The backend already has TMDB proxy functionality in `backend/src/routes/tmdb.js`. 