// Advanced Service Worker Service for Streamr
// Handles predictive prefetching, analytics, background sync, and performance monitoring

class AdvancedServiceWorkerService {
  constructor() {
    this.isSupported = 'serviceWorker' in navigator;
    this.registration = null;
    this.analyticsQueue = [];
    this.performanceMetrics = {};
    this.userBehavior = {
      viewedMovies: new Set(),
      searchHistory: [],
      genrePreferences: new Map(),
      watchTime: new Map(),
      lastActivity: Date.now()
    };
    
    this.init();
  }

  async init() {
    if (!this.isSupported) {
      console.warn('Service Worker not supported');
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.ready;
      console.log('Advanced Service Worker Service initialized');
      
      // Set up periodic sync if supported
      if ('periodicSync' in window) {
        await this.setupPeriodicSync();
      }
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
      
    } catch (error) {
      console.error('Service Worker initialization failed:', error);
    }
  }

  // 🎯 PREDICTIVE PREFETCHING
  async triggerPredictivePrefetch(movieId, type = 'movie') {
    if (!this.registration) return;

    try {
      await this.sendMessage('PREDICTIVE_PREFETCH', { movieId, type });
      console.log(`Predictive prefetch triggered for ${type} ${movieId}`);
    } catch (error) {
      console.error('Predictive prefetch failed:', error);
    }
  }

  async updateUserBehavior(movieId, movieData) {
    if (!this.registration) return;

    try {
      // Update local behavior tracking
      this.userBehavior.viewedMovies.add(movieId);
      this.userBehavior.lastActivity = Date.now();

      if (movieData.genres) {
        movieData.genres.forEach(genre => {
          const current = this.userBehavior.genrePreferences.get(genre.id) || 0;
          this.userBehavior.genrePreferences.set(genre.id, current + 1);
        });
      }

      // Send to Service Worker
      await this.sendMessage('UPDATE_USER_BEHAVIOR', { movieId, movieData });
      
    } catch (error) {
      console.error('User behavior update failed:', error);
    }
  }

  // 📊 PERFORMANCE MONITORING
  startPerformanceMonitoring() {
    // Monitor Core Web Vitals
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordPerformanceMetric('lcp', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordPerformanceMetric('fid', entry.processingStart - entry.startTime);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.recordPerformanceMetric('cls', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }

    // Monitor network performance
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', () => {
        this.recordPerformanceMetric('connection', {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt
        });
      });
    }

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        this.recordPerformanceMetric('memory', {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        });
      }, 30000); // Every 30 seconds
    }
  }

  recordPerformanceMetric(type, value) {
    this.performanceMetrics[type] = {
      value,
      timestamp: Date.now()
    };

    // Send to Service Worker
    this.sendMessage('TRACK_PERFORMANCE', {
      type,
      value,
      timestamp: Date.now()
    });
  }

  // 🔄 BACKGROUND SYNC
  async scheduleBackgroundSync(tag, delay = 0) {
    if (!this.registration) return;

    try {
      await this.sendMessage('SCHEDULE_BACKGROUND_SYNC', { tag, delay });
      console.log(`Background sync scheduled: ${tag}`);
    } catch (error) {
      console.error('Background sync scheduling failed:', error);
    }
  }

  async registerPeriodicSync(tag, options = {}) {
    if (!this.registration || !('periodicSync' in window)) {
      console.warn('Periodic sync not supported');
      return;
    }

    try {
      const status = await navigator.permissions.query({
        name: 'periodic-background-sync'
      });

      if (status.state === 'granted') {
        await this.registration.periodicSync.register(tag, options);
        console.log(`Periodic sync registered: ${tag}`);
      } else {
        console.warn('Periodic sync permission not granted');
      }
    } catch (error) {
      console.error('Periodic sync registration failed:', error);
    }
  }

  // 📱 PUSH NOTIFICATIONS
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Notification permission request failed:', error);
      return false;
    }
  }

  async sendNotification(title, options = {}) {
    if (!this.registration) return;

    try {
      await this.registration.showNotification(title, {
        icon: '/icon.svg',
        badge: '/icon.svg',
        ...options
      });
    } catch (error) {
      console.error('Notification sending failed:', error);
    }
  }

  // 🎯 INTELLIGENT CACHE MANAGEMENT
  async getCacheStatus() {
    if (!this.registration) return null;

    try {
      return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          resolve(event.data);
        };
        
        this.registration.active.postMessage({
          type: 'CACHE_STATUS'
        }, [channel.port2]);
      });
    } catch (error) {
      console.error('Cache status request failed:', error);
      return null;
    }
  }

  async clearCaches() {
    if (!this.registration) return;

    try {
      await this.sendMessage('CACHE_CLEAR');
      console.log('Caches cleared successfully');
    } catch (error) {
      console.error('Cache clearing failed:', error);
    }
  }

  // 📈 ANALYTICS & USER BEHAVIOR
  trackUserBehavior(behavior) {
    if (!this.registration) return;

    try {
      // Update local tracking
      if (behavior.movieId) {
        this.userBehavior.viewedMovies.add(behavior.movieId);
      }

      if (behavior.searchQuery) {
        this.userBehavior.searchHistory.push({
          query: behavior.searchQuery,
          timestamp: Date.now()
        });
      }

      if (behavior.genreId) {
        const current = this.userBehavior.genrePreferences.get(behavior.genreId) || 0;
        this.userBehavior.genrePreferences.set(behavior.genreId, current + 1);
      }

      this.userBehavior.lastActivity = Date.now();

      // Send to Service Worker
      this.sendMessage('TRACK_USER_BEHAVIOR', behavior);
      
    } catch (error) {
      console.error('Behavior tracking failed:', error);
    }
  }

  // 🎯 SMART RECOMMENDATIONS
  async getSmartRecommendations() {
    try {
      // Get user preferences from Service Worker
      const preferences = await this.getUserPreferences();
      
      // Generate recommendations based on behavior
      const recommendations = [];
      
      // Genre-based recommendations
      const topGenres = Array.from(this.userBehavior.genrePreferences.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      
      for (const [genreId, count] of topGenres) {
        recommendations.push({
          type: 'genre',
          genreId,
          priority: count
        });
      }
      
      // Time-based recommendations
      const hour = new Date().getHours();
      const timeBasedGenres = this.getTimeBasedGenres(hour);
      
      recommendations.push(...timeBasedGenres.map(genreId => ({
        type: 'time-based',
        genreId,
        priority: 1
      })));
      
      return recommendations;
      
    } catch (error) {
      console.error('Smart recommendations failed:', error);
      return [];
    }
  }

  getTimeBasedGenres(hour) {
    const timeGenres = {
      morning: [28, 12, 16], // Action, Adventure, Animation
      afternoon: [35, 10751, 14], // Comedy, Family, Fantasy
      evening: [27, 53, 80], // Horror, Thriller, Crime
      night: [18, 10749, 10402] // Drama, Romance, Music
    };
    
    if (hour >= 6 && hour < 12) return timeGenres.morning;
    if (hour >= 12 && hour < 17) return timeGenres.afternoon;
    if (hour >= 17 && hour < 22) return timeGenres.evening;
    return timeGenres.night;
  }

  // 🔧 UTILITY METHODS
  async sendMessage(type, data = {}) {
    if (!this.registration || !this.registration.active) {
      throw new Error('Service Worker not ready');
    }

    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        resolve(event.data);
      };
      
      channel.port1.onmessageerror = () => {
        reject(new Error('Message error'));
      };
      
      this.registration.active.postMessage({
        type,
        data
      }, [channel.port2]);
    });
  }

  async getUserPreferences() {
    try {
      const db = await this.openDB('streamr-preferences', 1);
      const transaction = db.transaction(['preferences'], 'readonly');
      const store = transaction.objectStore('preferences');
      const result = await store.get('user-preferences');
      return result ? result.data : null;
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      return null;
    }
  }

  openDB(name, version) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'id' });
        }
      };
    });
  }

  async setupPeriodicSync() {
    // Register periodic sync for content updates
    await this.registerPeriodicSync('content-update', {
      minInterval: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    // Register periodic sync for analytics
    await this.registerPeriodicSync('analytics-sync', {
      minInterval: 60 * 60 * 1000 // 1 hour
    });
    
    // Register periodic sync for predictive warming
    await this.registerPeriodicSync('predictive-warming', {
      minInterval: 6 * 60 * 60 * 1000 // 6 hours
    });
  }

  // 📊 GET ANALYTICS DATA
  async getAnalyticsData() {
    try {
      const db = await this.openDB('streamr-analytics', 1);
      
      const performanceStore = db.transaction(['performance'], 'readonly').objectStore('performance');
      const performanceData = await performanceStore.getAll();
      
      const behaviorStore = db.transaction(['behavior'], 'readonly').objectStore('behavior');
      const behaviorData = await behaviorStore.getAll();
      
      return {
        performance: performanceData,
        behavior: behaviorData,
        userBehavior: this.userBehavior,
        performanceMetrics: this.performanceMetrics
      };
    } catch (error) {
      console.error('Failed to get analytics data:', error);
      return null;
    }
  }
}

// Create singleton instance
const advancedServiceWorkerService = new AdvancedServiceWorkerService();

export default advancedServiceWorkerService; 