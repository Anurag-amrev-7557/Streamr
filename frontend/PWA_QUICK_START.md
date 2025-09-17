# PWA Quick Start Guide

This guide will help you quickly integrate the PWA components into your existing Streamr application.

## 🚀 Quick Setup

### 1. Add PWA Components to Your App

Import and use the PWA components in your main App component:

```jsx
import React, { useState } from 'react';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import PWAStatus from './components/PWAStatus';
import PWAInstallGuide from './components/PWAInstallGuide';

function App() {
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  return (
    <div className="App">
      {/* Your existing app content */}
      
      {/* PWA Components */}
      <PWAInstallPrompt />
      
      {/* Add PWA Status to your navbar or settings */}
      <div className="navbar-right">
        <PWAStatus />
        <button onClick={() => setShowInstallGuide(true)}>
          📱 Install Guide
        </button>
      </div>
      
      {/* PWA Install Guide Modal */}
      <PWAInstallGuide 
        isOpen={showInstallGuide} 
        onClose={() => setShowInstallGuide(false)} 
      />
    </div>
  );
}
```

### 2. Add PWA Status to Navigation

Integrate the PWA status indicator into your existing navigation:

```jsx
// In your Navbar component
import PWAStatus from './components/PWAStatus';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        {/* Your logo and main nav */}
      </div>
      
      <div className="navbar-right">
        {/* Existing nav items */}
        <PWAStatus />
        {/* Other nav items */}
      </div>
    </nav>
  );
}
```

### 3. Use PWA Utilities in Your Components

Leverage the PWA utilities for offline functionality:

```jsx
import React from 'react';

function MovieCard({ movie }) {
  const handleAddToWatchlist = async () => {
    try {
      // Use PWA offline queue if available
      if (window.pwaRegistration) {
        await window.pwaRegistration.addToWatchlist(movie.id, 'add');
      } else {
        // Fallback to direct API call
        await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ movieId: movie.id, action: 'add' })
        });
      }
    } catch (error) {
      console.error('Failed to add to watchlist:', error);
    }
  };

  return (
    <div className="movie-card">
      {/* Movie content */}
      <button onClick={handleAddToWatchlist}>
        Add to Watchlist
      </button>
    </div>
  );
}
```

## 🔧 Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# PWA Configuration
VITE_PWA_NAME=Streamr
VITE_PWA_SHORT_NAME=Streamr
VITE_PWA_DESCRIPTION=Your Ultimate Streaming Platform

# VAPID Keys for Push Notifications (optional)
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
```

### Service Worker Registration

The service worker is automatically registered when you import the enhanced registration utility. Make sure your `main.jsx` includes:

```jsx
// Initialize enhanced service worker registration for PWA features
import './utils/enhancedServiceWorkerRegistration.js'
```

## 📱 Testing PWA Features

### 1. Test Installation

1. Open your app in Chrome/Edge
2. Look for the install icon in the address bar
3. Click install and verify the app appears on your desktop/home screen

### 2. Test Offline Functionality

1. Open Chrome DevTools
2. Go to Application > Service Workers
3. Check "Offline" to simulate offline mode
4. Test your app's offline behavior

### 3. Test Service Worker

1. Open Chrome DevTools
2. Go to Application > Service Workers
3. Monitor service worker activity and cache

## 🎯 Common Use Cases

### Offline Queue Management

```jsx
// Add items to offline queue
await window.pwaRegistration.addToWatchlist(movieId, 'add');
await window.pwaRegistration.addRating(movieId, rating);
await window.pwaRegistration.addSearchHistory(query);

// Check offline queue status
const queue = window.pwaRegistration.getOfflineQueue();
console.log('Pending items:', queue.length);

// Clear offline queue
window.pwaRegistration.clearOfflineQueue();
```

### PWA Status Monitoring

```jsx
// Check if app is installed
const isInstalled = window.pwaRegistration.isAppInstalled();

// Check network status
const isOnline = window.pwaRegistration.isNetworkOnline();

// Listen for network changes
window.addEventListener('networkStatusChanged', (event) => {
  console.log('Network status:', event.detail.isOnline);
});
```

### Installation Tracking

```jsx
// Track PWA installation
window.addEventListener('appinstalled', (event) => {
  // Send analytics
  gtag('event', 'pwa_install', {
    event_category: 'PWA',
    event_label: 'App Installation'
  });
});
```

## 🐛 Troubleshooting

### PWA Not Installing

- Check if HTTPS is enabled
- Verify service worker is registered
- Check browser console for errors
- Ensure manifest.json is accessible

### Offline Features Not Working

- Verify service worker is active
- Check cache storage in DevTools
- Ensure offline.html is accessible
- Test with network throttling

### Performance Issues

- Monitor cache size and cleanup
- Check service worker update frequency
- Verify image optimization
- Monitor memory usage

## 📊 Analytics Integration

### Track PWA Metrics

```jsx
// Track PWA usage
useEffect(() => {
  if (window.pwaRegistration) {
    const isInstalled = window.pwaRegistration.isAppInstalled();
    const isOnline = window.pwaRegistration.isNetworkOnline();
    
    // Send to analytics
    analytics.track('pwa_status', {
      installed: isInstalled,
      online: isOnline,
      timestamp: Date.now()
    });
  }
}, []);
```

### Monitor Offline Usage

```jsx
// Track offline actions
const handleOfflineAction = async (action) => {
  try {
    await window.pwaRegistration.addToOfflineQueue(action);
    
    // Track offline action
    analytics.track('offline_action_queued', {
      action: action.type,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to queue offline action:', error);
  }
};
```

## 🚀 Deployment Checklist

- [ ] Generate all required icon sizes
- [ ] Test PWA installation on multiple devices
- [ ] Verify offline functionality
- [ ] Test service worker updates
- [ ] Run Lighthouse PWA audit
- [ ] Check HTTPS configuration
- [ ] Test push notifications (if enabled)
- [ ] Verify manifest.json accessibility

## 📚 Additional Resources

- [PWA Implementation Guide](./PWA_IMPROVEMENTS_README.md)
- [Service Worker Documentation](https://web.dev/service-worker-lifecycle/)
- [PWA Best Practices](https://web.dev/pwa-checklist/)
- [Lighthouse PWA Audit](https://developers.google.com/web/tools/lighthouse)

---

*This quick start guide will get you up and running with PWA features in minutes. For detailed implementation information, refer to the full PWA Improvements README.* 