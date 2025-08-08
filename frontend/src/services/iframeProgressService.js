// Iframe Progress Tracking Service
// Handles progress tracking from external streaming services via iframes

export class IframeProgressService {
  constructor() {
    this.listeners = new Map();
    this.isListening = false;
    this.allowedDomains = [
      '111movies.com',
      'player.videasy.net',
      'vidjoy.pro',
      'vidfast.pro'
    ];
  }

  /**
   * Start listening for postMessage events from iframes
   */
  startListening() {
    if (this.isListening) return;

    this.isListening = true;
    window.addEventListener('message', this.handleMessage.bind(this));
    console.log('🎧 IframeProgressService: Started listening for postMessage events');
  }

  /**
   * Stop listening for postMessage events
   */
  stopListening() {
    if (!this.isListening) return;

    this.isListening = false;
    window.removeEventListener('message', this.handleMessage.bind(this));
    console.log('🔇 IframeProgressService: Stopped listening for postMessage events');
  }

  /**
   * Handle incoming postMessage events
   */
  handleMessage(event) {
    // Only accept messages from our streaming domains
    const origin = event.origin || '';
    const isAllowedDomain = this.allowedDomains.some(domain => origin.includes(domain));
    
    if (!isAllowedDomain) return;

    try {
      const data = event.data;
      console.log('📨 IframeProgressService: Received message from', origin, data);

      // Parse different message formats
      const progressData = this.parseProgressData(data);
      if (progressData) {
        this.notifyListeners(progressData);
      }
    } catch (error) {
      console.warn('IframeProgressService: Error processing message:', error);
    }
  }

  /**
   * Parse progress data from various message formats
   */
  parseProgressData(data) {
    if (!data || typeof data !== 'object') return null;

    let progressData = null;

    // Format 1: Nested event format (like timeupdate)
    if (data.event === 'timeupdate' && data.data) {
      progressData = data.data;
      console.log('📊 IframeProgressService: Parsed timeupdate event:', progressData);
    }
    // Format 2: Direct data format
    else if (data.currentTime !== undefined || data.progress !== undefined) {
      progressData = data;
      console.log('📊 IframeProgressService: Parsed direct data format:', progressData);
    }
    // Format 3: Custom streaming service formats
    else if (data.type === 'progress' || data.type === 'timeUpdate') {
      progressData = data;
      console.log('📊 IframeProgressService: Parsed custom format:', progressData);
    }

    if (!progressData) return null;

    // Process the progress data
    if (progressData.currentTime !== undefined && progressData.duration !== undefined) {
      return {
        currentTime: progressData.currentTime,
        duration: progressData.duration,
        progress: (progressData.currentTime / progressData.duration) * 100,
        playing: progressData.playing !== undefined ? progressData.playing : true
      };
    }

    if (progressData.progress !== undefined) {
      return {
        currentTime: progressData.currentTime || 0,
        duration: progressData.duration || 0,
        progress: progressData.progress,
        playing: progressData.playing !== undefined ? progressData.playing : true
      };
    }

    if (progressData.time !== undefined) {
      const duration = progressData.duration || 7200; // Default 2 hours
      return {
        currentTime: progressData.time,
        duration: duration,
        progress: (progressData.time / duration) * 100,
        playing: progressData.playing !== undefined ? progressData.playing : true
      };
    }

    return null;
  }

  /**
   * Add a progress listener
   */
  addListener(id, callback) {
    this.listeners.set(id, callback);
    console.log(`🎧 IframeProgressService: Added listener for ${id}`);
  }

  /**
   * Remove a progress listener
   */
  removeListener(id) {
    this.listeners.delete(id);
    console.log(`🔇 IframeProgressService: Removed listener for ${id}`);
  }

  /**
   * Notify all listeners of progress updates
   */
  notifyListeners(progressData) {
    this.listeners.forEach((callback, id) => {
      try {
        callback(progressData);
      } catch (error) {
        console.warn(`IframeProgressService: Error in listener ${id}:`, error);
      }
    });
  }

  /**
   * Extract timestamp from URL parameters
   */
  extractTimestampFromUrl(url) {
    if (!url) return null;

    try {
      const urlObj = new URL(url);
      const timestampParams = ['t', 'time', 'start', 'position', 'seek', 'timestamp'];
      
      for (const param of timestampParams) {
        const value = urlObj.searchParams.get(param);
        if (value) {
          const timestamp = parseFloat(value);
          if (!isNaN(timestamp) && timestamp > 0) {
            return {
              timestamp,
              param,
              progress: this.estimateProgressFromTimestamp(timestamp)
            };
          }
        }
      }
    } catch (error) {
      console.warn('IframeProgressService: Error extracting timestamp from URL:', error);
    }

    return null;
  }

  /**
   * Estimate progress from timestamp (assuming average movie length)
   */
  estimateProgressFromTimestamp(timestamp) {
    const estimatedDuration = 7200; // 2 hours in seconds
    return Math.min((timestamp / estimatedDuration) * 100, 100);
  }

  /**
   * Check localStorage for saved progress
   */
  checkLocalStorageForProgress() {
    try {
      const storageKeys = Object.keys(localStorage);
      const progressKeys = storageKeys.filter(key => 
        key.includes('progress') || 
        key.includes('time') || 
        key.includes('position') ||
        key.includes('watch') ||
        key.includes('video')
      );

      for (const key of progressKeys) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const data = JSON.parse(value);
            if (data && (data.currentTime || data.time || data.position)) {
              const timestamp = data.currentTime || data.time || data.position;
              const duration = data.duration || 7200;
              return {
                currentTime: timestamp,
                duration: duration,
                progress: (timestamp / duration) * 100,
                source: 'localStorage',
                key: key
              };
            }
          }
        } catch (parseError) {
          // Try parsing as simple number
          const timestamp = parseFloat(value);
          if (!isNaN(timestamp) && timestamp > 0) {
            const duration = 7200;
            return {
              currentTime: timestamp,
              duration: duration,
              progress: (timestamp / duration) * 100,
              source: 'localStorage',
              key: key
            };
          }
        }
      }
    } catch (error) {
      console.warn('IframeProgressService: Error checking localStorage:', error);
    }

    return null;
  }

  /**
   * Send message to iframe requesting progress
   */
  requestProgressFromIframe(iframe) {
    if (!iframe || !iframe.contentWindow) return;

    try {
      // Try different message formats that streaming services might respond to
      const messages = [
        { type: 'GET_PROGRESS', action: 'getProgress' },
        { type: 'PROGRESS_REQUEST', action: 'getCurrentTime' },
        { type: 'TIME_REQUEST', action: 'getTime' },
        { action: 'getProgress' },
        { action: 'getCurrentTime' },
        { action: 'getTime' }
      ];

      messages.forEach(message => {
        try {
          iframe.contentWindow.postMessage(message, '*');
        } catch (error) {
          console.warn('IframeProgressService: Error sending message to iframe:', error);
        }
      });
    } catch (error) {
      console.warn('IframeProgressService: Error requesting progress from iframe:', error);
    }
  }

  /**
   * Monitor iframe URL changes for timestamp parameters
   */
  startUrlMonitoring(iframe, callback, interval = 5000) {
    if (!iframe) return null;

    const checkUrl = () => {
      try {
        const currentSrc = iframe.src;
        if (currentSrc) {
          const timestampData = this.extractTimestampFromUrl(currentSrc);
          if (timestampData) {
            callback(timestampData);
          }
        }
      } catch (error) {
        console.warn('IframeProgressService: Error monitoring URL:', error);
      }
    };

    // Check immediately
    checkUrl();

    // Set up periodic checking
    const intervalId = setInterval(checkUrl, interval);
    return intervalId;
  }

  /**
   * Stop URL monitoring
   */
  stopUrlMonitoring(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }

  /**
   * Get streaming service info from URL
   */
  getStreamingServiceFromUrl(url) {
    if (!url) return null;

    for (const domain of this.allowedDomains) {
      if (url.includes(domain)) {
        return {
          domain,
          name: this.getServiceName(domain)
        };
      }
    }

    return null;
  }

  /**
   * Get service name from domain
   */
  getServiceName(domain) {
    const serviceNames = {
      '111movies.com': '111Movies',
      'player.videasy.net': 'Videasy',
      'vidjoy.pro': 'VidJoy',
      'vidfast.pro': 'VidFast'
    };

    return serviceNames[domain] || domain;
  }

  /**
   * Clean up all resources
   */
  cleanup() {
    this.stopListening();
    this.listeners.clear();
    console.log('🧹 IframeProgressService: Cleaned up all resources');
  }
}

// Create singleton instance
const iframeProgressService = new IframeProgressService();

// Auto-start listening when module loads
if (typeof window !== 'undefined') {
  iframeProgressService.startListening();
}

export default iframeProgressService; 