// Singleton RealTimeUpdateManager
class RealTimeUpdateManager {
  constructor() {
    if (RealTimeUpdateManager.instance) return RealTimeUpdateManager.instance;
    this.subscribers = new Map();
    this.isActive = false;
    this.isDestroyed = false;
    this.cleanupScheduled = false;
    this.maxSubscribers = 10;
    this.updateInterval = null;
    this.abortController = null;
    this.lastUpdateTime = 0;
    this.updateQueue = [];
    this.memoryCheckInterval = null;
    this.cleanupTimer = null;
    this.visibilityListenerAttached = false;
    this.performanceMode = 'high';
    this.updateIntervals = {
      high: 120 * 1000,
      medium: 180 * 1000,
      low: 300 * 1000
    };

    RealTimeUpdateManager.instance = this;
  }

  subscribe(movieId, type, callback) {
    if (!this.subscribers || this.isDestroyed) return;
    const key = `${type}_${movieId}`;
    if (this.subscribers.size >= this.maxSubscribers) {
      const firstKey = this.subscribers.keys().next().value;
      this.subscribers.delete(firstKey);
    }
    this.subscribers.set(key, callback);
    if (!this.isActive && !this.isDestroyed) this.startUpdates();
  }

  unsubscribe(movieId, type) {
    if (!this.subscribers || this.isDestroyed) return;
    const key = `${type}_${movieId}`;
    this.subscribers.delete(key);
    if (this.subscribers.size === 0) this.stopUpdates();
  }

  startUpdates() {
    if (this.isActive || !this.subscribers || this.isDestroyed) return;
    this.isActive = true;
    this.abortController = new AbortController();
    if (!this.visibilityListenerAttached && typeof document !== 'undefined' && document.addEventListener) {
      this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      this.visibilityListenerAttached = true;
    }
    const updateInterval = this.updateIntervals[this.performanceMode] || this.updateIntervals.high;
    this.updateInterval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (this.abortController?.signal.aborted || this.isDestroyed) { this.stopUpdates(); return; }
      if (performance.now() - this.lastUpdateTime < 5000) return;
      await this.performUpdates();
    }, updateInterval);
  }

  setPerformanceMode(frameRate) {
    if (frameRate < 30) this.performanceMode = 'low';
    else if (frameRate < 45) this.performanceMode = 'medium';
    else this.performanceMode = 'high';
    if (this.isActive) { this.stopUpdates(); this.startUpdates(); }
  }

  stopUpdates() {
    if (!this.isActive) return;
    this.isActive = false;
    if (this.updateInterval) { clearInterval(this.updateInterval); this.updateInterval = null; }
    if (this.memoryCheckInterval) { clearInterval(this.memoryCheckInterval); this.memoryCheckInterval = null; }
    if (this.abortController) { this.abortController.abort(); this.abortController = null; }
    if (this.cleanupTimer) { clearTimeout(this.cleanupTimer); this.cleanupTimer = null; }
    this.updateQueue = [];
    const noSubscribers = !this.subscribers || this.subscribers.size === 0;
    if ((this.isDestroyed || noSubscribers) && this.visibilityListenerAttached && typeof document !== 'undefined' && document.removeEventListener) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      this.visibilityListenerAttached = false;
    }
  }

  handleVisibilityChange() {
    if (this.isDestroyed) return;
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'hidden') this.stopUpdates();
    else if (document.visibilityState === 'visible') {
      if (this.subscribers && this.subscribers.size > 0 && !this.isActive) this.startUpdates();
    }
  }

  async performUpdates() {
    if (this.abortController?.signal.aborted || !this.subscribers) return;
    const now = Date.now();
    if (now - this.lastUpdateTime < 10000) return;
    this.lastUpdateTime = now;
    const subscriberEntries = Array.from(this.subscribers.entries());
    if (subscriberEntries.length === 0) return;
    const [key, callback] = subscriberEntries[0];
    const [type, movieId] = key.split('_');
    try {
      // We dynamically import service to avoid circular deps
      const { getMovieDetails } = await import('./tmdbService.js');
      const freshData = await getMovieDetails(movieId, type);
      if (freshData) callback(freshData);
    } catch (error) {
      console.warn('Real-time update failed for', key, error);
    }
  }

  cleanup() {
    if (this.cleanupScheduled || this.isDestroyed) return;
    this.cleanupScheduled = true;
    this.isDestroyed = true;
    this.stopUpdates();
    if (this.visibilityListenerAttached && typeof document !== 'undefined' && document.removeEventListener) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      this.visibilityListenerAttached = false;
    }
    if (this.subscribers) { this.subscribers.clear(); this.subscribers = null; }
    this.updateInterval = null;
    this.abortController = null;
    this.lastUpdateTime = 0;
    this.updateQueue = [];
    this.memoryCheckInterval = null;
    this.cleanupTimer = null;
  }
}

const instance = new RealTimeUpdateManager();
export default instance;
