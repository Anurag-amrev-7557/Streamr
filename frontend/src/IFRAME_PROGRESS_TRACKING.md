# Iframe Progress Tracking System

This system allows you to track viewing progress from external streaming services (111movies.com, videasy.com, vidfast.com, vidjoy.pro) that are embedded as iframes in your application.

## Overview

The system uses multiple strategies to detect and track progress from external iframe players:

1. **PostMessage Communication** - Listens for progress updates from iframe players
2. **URL Parameter Monitoring** - Detects timestamp parameters in iframe URLs
3. **localStorage Detection** - Checks for saved progress in browser storage
4. **Periodic Progress Requests** - Sends requests to iframe for progress updates

## How It Works

### 1. PostMessage Communication
External streaming services may send progress updates via `postMessage` events. The system listens for these messages and parses different formats:

```javascript
// Format 1: Standard video progress
{ currentTime: 1800, duration: 7200, playing: true }

// Format 2: Progress percentage
{ progress: 25, currentTime: 1800, duration: 7200 }

// Format 3: Time only
{ time: 3600, duration: 7200 }

// Format 4: Custom formats
{ type: 'progress', currentTime: 5400, duration: 7200, progress: 75 }
```

### 2. URL Parameter Monitoring
Some streaming services include timestamp parameters in their URLs:

```javascript
// Common timestamp parameters
https://111movies.com/movie/tt0111161?t=3600
https://player.videasy.net/movie/tt0111161?time=1800
https://vidjoy.pro/embed/movie/tt0111161?start=900
https://vidfast.pro/movie/tt0111161?position=2700
```

### 3. localStorage Detection
External services may store progress in browser localStorage:

```javascript
// Example localStorage keys that might contain progress
'video_progress_tt0111161'
'watch_time_tt0111161'
'player_position_tt0111161'
```

## Components

### 1. IframeProgressService (`services/iframeProgressService.js`)
Core service that handles all progress tracking logic.

```javascript
import iframeProgressService from '../services/iframeProgressService';

// Start listening for postMessage events
iframeProgressService.startListening();

// Add a progress listener
iframeProgressService.addListener('my-listener', (progressData) => {
  console.log('Progress update:', progressData);
});

// Check localStorage for progress
const progress = iframeProgressService.checkLocalStorageForProgress();

// Extract timestamp from URL
const timestamp = iframeProgressService.extractTimestampFromUrl(url);
```

### 2. useIframeProgress Hook (`hooks/useIframeProgress.js`)
React hook for easy integration in components.

```javascript
import { useIframeProgress } from '../hooks/useIframeProgress';

const MyComponent = () => {
  const iframeRef = useRef(null);
  const content = { id: 'tt0111161', type: 'movie', title: 'Movie Title' };

  const {
    startTracking,
    stopTracking,
    progress,
    duration,
    isTracking
  } = useIframeProgress(content, iframeRef, {
    autoStart: true,
    updateInterval: 10000,
    urlCheckInterval: 5000,
    minProgressChange: 1
  });

  return (
    <iframe ref={iframeRef} src="https://111movies.com/movie/tt0111161" />
  );
};
```

### 3. Enhanced StreamingPlayer (`components/StreamingPlayer.jsx`)
Updated streaming player with built-in progress tracking.

```javascript
<StreamingPlayer
  streamingUrl="https://111movies.com/movie/tt0111161"
  content={{ id: 'tt0111161', type: 'movie', title: 'Movie Title' }}
  isOpen={true}
  onClose={() => setShowPlayer(false)}
/>
```

## Usage Examples

### Basic Usage with Hook

```javascript
import React, { useRef } from 'react';
import { useIframeProgress } from '../hooks/useIframeProgress';

const MoviePlayer = ({ movie }) => {
  const iframeRef = useRef(null);
  
  const { progress, isTracking, startTracking, stopTracking } = useIframeProgress(
    movie,
    iframeRef,
    {
      autoStart: true,
      updateInterval: 5000
    }
  );

  return (
    <div>
      <iframe
        ref={iframeRef}
        src={`https://111movies.com/movie/${movie.id}`}
        className="w-full h-96"
      />
      <div>Progress: {progress.toFixed(1)}%</div>
      <div>Tracking: {isTracking ? 'Active' : 'Inactive'}</div>
    </div>
  );
};
```

### Advanced Usage with Manual Control

```javascript
import React, { useRef, useEffect } from 'react';
import { useIframeProgress } from '../hooks/useIframeProgress';
import { useViewingProgress } from '../contexts/ViewingProgressContext';

const AdvancedPlayer = ({ movie }) => {
  const iframeRef = useRef(null);
  const { startWatchingMovie, updateProgress } = useViewingProgress();
  
  const {
    startTracking,
    stopTracking,
    setProgress,
    getCurrentProgress
  } = useIframeProgress(movie, iframeRef, {
    autoStart: false, // Manual control
    enablePostMessage: true,
    enableUrlMonitoring: true,
    enableLocalStorageCheck: true
  });

  useEffect(() => {
    // Start watching when component mounts
    startWatchingMovie(movie);
    startTracking();
    
    return () => {
      stopTracking();
    };
  }, [movie]);

  const handleManualProgress = (newProgress) => {
    setProgress(newProgress);
  };

  return (
    <div>
      <iframe ref={iframeRef} src={`https://111movies.com/movie/${movie.id}`} />
      <button onClick={() => handleManualProgress(50)}>
        Set to 50%
      </button>
    </div>
  );
};
```

## Configuration Options

### useIframeProgress Options

```javascript
const options = {
  autoStart: true,              // Auto-start tracking when hook mounts
  updateInterval: 10000,        // Interval for progress requests (ms)
  urlCheckInterval: 5000,       // Interval for URL monitoring (ms)
  minProgressChange: 1,         // Minimum progress change to trigger update (%)
  enableLocalStorageCheck: true, // Enable localStorage progress detection
  enableUrlMonitoring: true,    // Enable URL parameter monitoring
  enablePostMessage: true       // Enable postMessage listening
};
```

### Supported Streaming Services

The system is configured to work with these streaming services:

- **111movies.com** - Primary streaming service
- **player.videasy.net** - Videasy streaming service
- **vidjoy.pro** - VidJoy streaming service
- **vidfast.pro** - VidFast streaming service

## Testing and Debugging

### Test Utilities

```javascript
import { 
  testIframeProgress, 
  simulateProgressUpdate, 
  checkProgressTrackingStatus,
  debugIframeCommunication 
} from '../utils/testIframeProgress';

// Run comprehensive tests
testIframeProgress();

// Simulate progress update
simulateProgressUpdate(50, 7200);

// Check system status
checkProgressTrackingStatus();

// Debug iframe communication
debugIframeCommunication(iframeElement);
```

### Demo Component

Use the `IframeProgressDemo` component to test the system:

```javascript
import IframeProgressDemo from '../components/IframeProgressDemo';

// In your app
<IframeProgressDemo />
```

## Integration with ViewingProgressContext

The system automatically integrates with your existing `ViewingProgressContext`:

```javascript
// Progress updates are automatically saved to context
const { updateProgress } = useViewingProgress();

// The hook handles this automatically:
updateProgress(movie.id, 'movie', null, null, progress);
```

## Troubleshooting

### Common Issues

1. **No progress updates received**
   - Check browser console for postMessage events
   - Verify iframe domain is in allowed list
   - Try different progress detection strategies

2. **Progress not saving**
   - Ensure ViewingProgressContext is available
   - Check localStorage permissions
   - Verify content object has required fields

3. **Iframe communication blocked**
   - Check CORS settings
   - Verify iframe src is accessible
   - Try different message formats

### Debug Steps

1. Open browser console
2. Run `testIframeProgress()` to check system status
3. Check for postMessage events in console
4. Verify iframe URL contains timestamp parameters
5. Check localStorage for saved progress

### Console Logs

The system provides detailed console logging:

```
🎬 Starting iframe progress tracking for: {id: "tt0111161", type: "movie"}
📨 Received postMessage from iframe: {currentTime: 1800, duration: 7200}
📊 Progress updated: {progress: "25.0%", duration: 7200, currentTime: 1800}
⏰ Found timestamp in URL parameter 't': 3600
📦 Found progress in localStorage key 'video_progress_tt0111161'
```

## Best Practices

1. **Always clean up listeners** when components unmount
2. **Use appropriate intervals** to avoid performance issues
3. **Handle errors gracefully** as external services may be unreliable
4. **Test with multiple services** to ensure compatibility
5. **Monitor console logs** for debugging information

## Limitations

1. **External service dependency** - Progress tracking depends on external services
2. **CORS restrictions** - Some iframe communication may be blocked
3. **Service changes** - External services may change their APIs
4. **Browser compatibility** - Some features may not work in older browsers

## Future Enhancements

1. **Machine learning** - Predict progress based on user behavior
2. **Multiple service support** - Add more streaming services
3. **Offline tracking** - Track progress when offline
4. **Analytics integration** - Track viewing patterns
5. **Custom progress algorithms** - More sophisticated progress detection

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review console logs for errors
3. Test with the demo component
4. Verify external service availability 