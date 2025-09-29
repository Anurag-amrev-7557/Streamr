/**
 * Portal State Service
 * 
 * Provides state persistence and restoration for portal management.
 * Features:
 * - Portal state persistence
 * - State restoration on page reload
 * - Portal history tracking
 * - State snapshots and rollback
 * - Cross-session state management
 */

class PortalStateService {
  constructor() {
    this.storageKey = 'streamr_portal_states';
    this.historyKey = 'streamr_portal_history';
    this.maxHistorySize = 50;
    this.maxStateAge = 24 * 60 * 60 * 1000; // 24 hours
    this.isInitialized = false;
    this.stateCache = new Map();
    this.history = [];
    
    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;
    
    this.isInitialized = true;
    this.loadPersistedState();
    this.loadHistory();
    this.setupStateCleanup();
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('[PortalStateService] Initialized with', this.stateCache.size, 'cached states');
    }
  }

  // State persistence methods
  savePortalState(portalId, state) {
    if (!this.isInitialized) return;
    
    const stateData = {
      id: portalId,
      state: { ...state },
      timestamp: Date.now(),
      version: '1.0'
    };
    
    this.stateCache.set(portalId, stateData);
    this.persistToStorage();
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[PortalStateService] Saved state for portal: ${portalId}`);
    }
  }

  loadPortalState(portalId) {
    if (!this.isInitialized) return null;
    
    const stateData = this.stateCache.get(portalId);
    if (!stateData) return null;
    
    // Check if state is still valid
    if (this.isStateExpired(stateData)) {
      this.stateCache.delete(portalId);
      return null;
    }
    
    return stateData.state;
  }

  deletePortalState(portalId) {
    if (!this.isInitialized) return;
    
    this.stateCache.delete(portalId);
    this.persistToStorage();
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[PortalStateService] Deleted state for portal: ${portalId}`);
    }
  }

  // History tracking methods
  addToHistory(portalId, action, data = {}) {
    if (!this.isInitialized) return;
    
    const historyEntry = {
      id: portalId,
      action,
      data,
      timestamp: Date.now()
    };
    
    this.history.unshift(historyEntry);
    
    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }
    
    this.persistHistory();
  }

  getHistory(portalId = null, limit = 10) {
    if (!this.isInitialized) return [];
    
    let filteredHistory = this.history;
    
    if (portalId) {
      filteredHistory = this.history.filter(entry => entry.id === portalId);
    }
    
    return filteredHistory.slice(0, limit);
  }

  clearHistory() {
    this.history = [];
    this.persistHistory();
  }

  // State snapshots and rollback
  createSnapshot(portalId) {
    if (!this.isInitialized) return null;
    
    const currentState = this.stateCache.get(portalId);
    if (!currentState) return null;
    
    const snapshot = {
      id: portalId,
      state: { ...currentState.state },
      timestamp: Date.now(),
      snapshotId: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    // Store snapshot in a separate cache
    const snapshotKey = `snapshot_${portalId}`;
    this.stateCache.set(snapshotKey, snapshot);
    
    this.addToHistory(portalId, 'snapshot_created', { snapshotId: snapshot.snapshotId });
    
    return snapshot.snapshotId;
  }

  rollbackToSnapshot(portalId, snapshotId) {
    if (!this.isInitialized) return false;
    
    const snapshotKey = `snapshot_${portalId}`;
    const snapshot = this.stateCache.get(snapshotKey);
    
    if (!snapshot || snapshot.snapshotId !== snapshotId) {
      return false;
    }
    
    // Restore state from snapshot
    this.savePortalState(portalId, snapshot.state);
    this.addToHistory(portalId, 'rollback', { snapshotId });
    
    return true;
  }

  // Cross-session state management
  exportPortalStates() {
    if (!this.isInitialized) return null;
    
    const exportData = {
      states: Array.from(this.stateCache.entries()),
      history: this.history,
      exportTimestamp: Date.now(),
      version: '1.0'
    };
    
    return JSON.stringify(exportData);
  }

  importPortalStates(exportData) {
    if (!this.isInitialized) return false;
    
    try {
      const data = JSON.parse(exportData);
      
      if (data.version !== '1.0') {
        console.warn('[PortalStateService] Unsupported export version');
        return false;
      }
      
      // Import states
      if (data.states) {
        this.stateCache.clear();
        data.states.forEach(([key, value]) => {
          this.stateCache.set(key, value);
        });
      }
      
      // Import history
      if (data.history) {
        this.history = data.history;
      }
      
      this.persistToStorage();
      this.persistHistory();
      
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PortalStateService] Imported', this.stateCache.size, 'states');
      }
      
      return true;
    } catch (error) {
      console.error('[PortalStateService] Failed to import states:', error);
      return false;
    }
  }

  // Storage methods
  persistToStorage() {
    if (typeof window === 'undefined' || !localStorage) return;
    
    try {
      const statesArray = Array.from(this.stateCache.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(statesArray));
    } catch (error) {
      console.warn('[PortalStateService] Failed to persist states:', error);
    }
  }

  loadPersistedState() {
    if (typeof window === 'undefined' || !localStorage) return;
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const statesArray = JSON.parse(stored);
        this.stateCache = new Map(statesArray);
        
        // Clean up expired states
        this.cleanupExpiredStates();
      }
    } catch (error) {
      console.warn('[PortalStateService] Failed to load persisted states:', error);
    }
  }

  persistHistory() {
    if (typeof window === 'undefined' || !localStorage) return;
    
    try {
      localStorage.setItem(this.historyKey, JSON.stringify(this.history));
    } catch (error) {
      console.warn('[PortalStateService] Failed to persist history:', error);
    }
  }

  loadHistory() {
    if (typeof window === 'undefined' || !localStorage) return;
    
    try {
      const stored = localStorage.getItem(this.historyKey);
      if (stored) {
        this.history = JSON.parse(stored);
        
        // Clean up old history entries
        this.cleanupOldHistory();
      }
    } catch (error) {
      console.warn('[PortalStateService] Failed to load history:', error);
    }
  }

  // Utility methods
  isStateExpired(stateData) {
    return Date.now() - stateData.timestamp > this.maxStateAge;
  }

  cleanupExpiredStates() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, stateData] of this.stateCache.entries()) {
      if (this.isStateExpired(stateData)) {
        this.stateCache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.persistToStorage();
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[PortalStateService] Cleaned up ${cleanedCount} expired states`);
      }
    }
  }

  cleanupOldHistory() {
    const cutoffTime = Date.now() - this.maxStateAge;
    const originalLength = this.history.length;
    
    this.history = this.history.filter(entry => entry.timestamp > cutoffTime);
    
    if (this.history.length !== originalLength) {
      this.persistHistory();
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[PortalStateService] Cleaned up ${originalLength - this.history.length} old history entries`);
      }
    }
  }

  setupStateCleanup() {
    // Clean up expired states every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredStates();
      this.cleanupOldHistory();
    }, 60 * 60 * 1000);
  }

  // Analytics and monitoring
  getStateMetrics() {
    return {
      totalStates: this.stateCache.size,
      historyEntries: this.history.length,
      oldestState: this.getOldestStateAge(),
      newestState: this.getNewestStateAge(),
      isInitialized: this.isInitialized
    };
  }

  getOldestStateAge() {
    if (this.stateCache.size === 0) return null;
    
    const oldest = Math.min(...Array.from(this.stateCache.values()).map(s => s.timestamp));
    return Date.now() - oldest;
  }

  getNewestStateAge() {
    if (this.stateCache.size === 0) return null;
    
    const newest = Math.max(...Array.from(this.stateCache.values()).map(s => s.timestamp));
    return Date.now() - newest;
  }

  // Cleanup
  cleanup() {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Clear all data structures
    this.stateCache.clear();
    this.history = [];
  }
}

// Create singleton instance
const portalStateService = new PortalStateService();

export default portalStateService;
