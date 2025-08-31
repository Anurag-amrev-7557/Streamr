import { userAPI } from './api.js';

/**
 * Sync Service for managing data synchronization between localStorage and backend
 * Handles watchlist and viewing progress synchronization
 */
class SyncService {
  constructor() {
    this.syncQueue = [];
    this.isSyncing = false;
    this.syncInterval = null;
    this.lastSyncTime = null;
    this.syncRetryCount = 0;
    this.maxRetries = 3;
  }

  /**
   * Initialize the sync service
   */
  init() {
    // Start periodic sync
    this.startPeriodicSync();
    
    // Listen for storage events to trigger sync
    window.addEventListener('storage', this.handleStorageEvent.bind(this));
    
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    console.log('Sync service initialized');
  }

  /**
   * Start periodic synchronization
   */
  startPeriodicSync() {
    // Sync every 5 minutes when online
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.syncAll();
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Stop periodic synchronization
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Handle storage events from other tabs
   */
  handleStorageEvent(event) {
    if (event.key === 'watchlist' || event.key === 'viewingProgress') {
      // Trigger sync when data changes in other tabs
      this.queueSync(event.key);
    }
  }

  /**
   * Handle online event
   */
  handleOnline() {
    console.log('Network is online, syncing data...');
    this.syncAll();
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('Network is offline, pausing sync...');
    this.stopPeriodicSync();
  }

  /**
   * Queue a sync operation
   */
  queueSync(dataType) {
    if (!this.syncQueue.includes(dataType)) {
      this.syncQueue.push(dataType);
    }
    
    if (!this.isSyncing) {
      this.processSyncQueue();
    }
  }

  /**
   * Process the sync queue
   */
  async processSyncQueue() {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;
    
    try {
      while (this.syncQueue.length > 0) {
        const dataType = this.syncQueue.shift();
        await this.syncDataType(dataType);
      }
    } catch (error) {
      console.error('Error processing sync queue:', error);
    } finally {
      this.isSyncing = false;
      
      // If there are still items in the queue, retry after a delay
      if (this.syncQueue.length > 0) {
        setTimeout(() => this.processSyncQueue(), 5000);
      }
    }
  }

  /**
   * Sync all data types
   */
  async syncAll() {
    try {
      await Promise.all([
        this.syncWatchlist(),
        this.syncViewingProgress()
      ]);
      
      this.lastSyncTime = new Date();
      this.syncRetryCount = 0;
      
      console.log('All data synced successfully');
    } catch (error) {
      console.error('Error syncing all data:', error);
      this.handleSyncError(error);
    }
  }

  /**
   * Sync watchlist data
   */
  async syncWatchlist() {
    try {
      const localWatchlist = this.getLocalWatchlist();
      if (localWatchlist.length === 0) {
        console.log('No local watchlist data to sync');
        return;
      }

      console.log('Syncing watchlist with backend...');
      const response = await userAPI.syncWatchlist(localWatchlist);
      
      if (response.success) {
        console.log('Watchlist synced successfully');
        this.updateLastSyncTime('watchlist');
      }
    } catch (error) {
      console.error('Error syncing watchlist:', error);
      throw error;
    }
  }

  /**
   * Sync viewing progress data
   */
  async syncViewingProgress() {
    try {
      const localProgress = this.getLocalViewingProgress();
      if (Object.keys(localProgress).length === 0) {
        console.log('No local viewing progress data to sync');
        return;
      }

      console.log('Syncing viewing progress with backend...');
      const response = await userAPI.syncViewingProgress(localProgress);
      
      if (response.success) {
        console.log('Viewing progress synced successfully');
        this.updateLastSyncTime('viewingProgress');
      }
    } catch (error) {
      console.error('Error syncing viewing progress:', error);
      throw error;
    }
  }

  /**
   * Sync a specific data type
   */
  async syncDataType(dataType) {
    try {
      switch (dataType) {
        case 'watchlist':
          await this.syncWatchlist();
          break;
        case 'viewingProgress':
          await this.syncViewingProgress();
          break;
        default:
          console.warn(`Unknown data type for sync: ${dataType}`);
      }
    } catch (error) {
      console.error(`Error syncing ${dataType}:`, error);
      throw error;
    }
  }

  /**
   * Get watchlist from localStorage
   */
  getLocalWatchlist() {
    try {
      const watchlist = localStorage.getItem('watchlist');
      return watchlist ? JSON.parse(watchlist) : [];
    } catch (error) {
      console.error('Error reading local watchlist:', error);
      return [];
    }
  }

  /**
   * Get viewing progress from localStorage
   */
  getLocalViewingProgress() {
    try {
      const progress = localStorage.getItem('viewingProgress');
      return progress ? JSON.parse(progress) : {};
    } catch (error) {
      console.error('Error reading local viewing progress:', error);
      return {};
    }
  }

  /**
   * Update last sync time for a data type
   */
  updateLastSyncTime(dataType) {
    try {
      const syncTimes = JSON.parse(localStorage.getItem('syncTimes') || '{}');
      syncTimes[dataType] = new Date().toISOString();
      localStorage.setItem('syncTimes', JSON.stringify(syncTimes));
    } catch (error) {
      console.error('Error updating sync time:', error);
    }
  }

  /**
   * Get last sync time for a data type
   */
  getLastSyncTime(dataType) {
    try {
      const syncTimes = JSON.parse(localStorage.getItem('syncTimes') || '{}');
      return syncTimes[dataType] ? new Date(syncTimes[dataType]) : null;
    } catch (error) {
      console.error('Error reading sync time:', error);
      return null;
    }
  }

  /**
   * Handle sync errors
   */
  handleSyncError(error) {
    this.syncRetryCount++;
    
    if (this.syncRetryCount <= this.maxRetries) {
      console.log(`Sync failed, retrying in ${this.syncRetryCount * 10} seconds...`);
      setTimeout(() => {
        this.syncAll();
      }, this.syncRetryCount * 10000);
    } else {
      console.error('Max sync retries reached, stopping sync');
      this.stopPeriodicSync();
    }
  }

  /**
   * Force immediate sync
   */
  async forceSync() {
    console.log('Forcing immediate sync...');
    await this.syncAll();
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      queueLength: this.syncQueue.length,
      lastSyncTime: this.lastSyncTime,
      retryCount: this.syncRetryCount,
      isOnline: navigator.onLine
    };
  }

  /**
   * Cleanup the sync service
   */
  cleanup() {
    this.stopPeriodicSync();
    window.removeEventListener('storage', this.handleStorageEvent.bind(this));
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    console.log('Sync service cleaned up');
  }
}

// Create and export a singleton instance
const syncService = new SyncService();

export default syncService;
