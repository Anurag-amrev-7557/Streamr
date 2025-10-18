import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getApiUrl } from '../config/api';
import { toast } from 'react-hot-toast';

/**
 * CollectionsContext - Manages user collections with local storage and future backend sync support
 * Features:
 * - Local storage persistence
 * - Offline queue for pending operations
 * - Backend sync ready (when API endpoints are available)
 * - Optimistic updates with error handling
 */
const CollectionsContext = createContext();

/**
 * Hook to access collections context
 * @throws {Error} If used outside CollectionsProvider
 */
export const useCollections = () => {
  const ctx = useContext(CollectionsContext);
  if (!ctx) {
    throw new Error('useCollections must be used within CollectionsProvider');
  }
  return ctx;
};

/**
 * Safe version that returns null instead of throwing during initialization
 */
export const useCollectionsSafe = () => {
  const context = useContext(CollectionsContext);
  return context;
};

// Constants
const COLLECTIONS_STORAGE_KEY = 'streamr_user_collections';
const COLLECTIONS_OFFLINE_QUEUE = 'streamr_user_collections_offline_queue';
const SYNC_DEBOUNCE_MS = 300; // Debounce time for sync operations
const SUPPRESSION_MS = 30 * 1000; // 30 seconds to suppress re-adds/removes

/**
 * Safely retrieve collections from localStorage
 * @returns {Array} Array of collection items or empty array on error
 */
function getLocalCollections() {
  try {
    const raw = localStorage.getItem(COLLECTIONS_STORAGE_KEY);
    if (!raw) return [];
    
    const collections = JSON.parse(raw);
    return Array.isArray(collections) ? collections : [];
  } catch (error) {
    console.error('Error loading collections from localStorage:', error);
    return [];
  }
}

/**
 * Safely persist collections to localStorage
 * @param {Array} collections - Array of collection items
 */
function setLocalCollections(collections) {
  try {
    if (!Array.isArray(collections)) {
      console.error('Invalid collections data, expected array');
      return;
    }
    localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(collections));
  } catch (error) {
    console.error('Error saving collections to localStorage:', error);
  }
}

/**
 * Safely retrieve offline queue from localStorage
 * @returns {Array} Array of pending operations or empty array on error
 */
function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(COLLECTIONS_OFFLINE_QUEUE);
    if (!raw) return [];
    
    const queue = JSON.parse(raw);
    return Array.isArray(queue) ? queue : [];
  } catch (error) {
    console.error('Error loading offline queue:', error);
    return [];
  }
}

/**
 * Safely persist offline queue to localStorage
 * @param {Array} ops - Array of pending operations
 */
function setOfflineQueue(ops) {
  try {
    if (!Array.isArray(ops)) {
      console.error('Invalid offline queue data, expected array');
      return;
    }
    localStorage.setItem(COLLECTIONS_OFFLINE_QUEUE, JSON.stringify(ops));
  } catch (error) {
    console.error('Error saving offline queue:', error);
  }
}

export const CollectionsProvider = ({ children }) => {
  const [collections, setCollections] = useState(() => getLocalCollections());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [lastBackendSync, setLastBackendSync] = useState(null);
  
  // Refs for tracking state and preventing infinite loops
  const isUpdatingFromBackend = useRef(false);
  const isMountedRef = useRef(true);
  const syncTimeoutRef = useRef(null);
  const recentlyAdded = useRef(new Map());
  const recentlyRemoved = useRef(new Map());

  /**
   * Merge local and remote collections, preferring the most recent data
   * @param {Array} local - Local collections
   * @param {Array} remote - Remote collections from backend
   * @returns {Array} Merged collections
   */
  const mergeCollections = useCallback((local, remote) => {
    const map = new Map();
    
    // Add local collections first
    local.forEach(c => {
      if (c && c.id) {
        map.set(c.id, { ...c, source: 'local' });
      }
    });
    
    // Merge remote collections (prefer remote data for conflicts)
    remote.forEach(c => {
      if (c && c.id) {
        const existing = map.get(c.id);
        if (!existing) {
          map.set(c.id, { ...c, source: 'remote' });
        } else {
          // Merge, preferring remote timestamps if available
          const merged = { ...existing, ...c };
          delete merged.source;
          map.set(c.id, merged);
        }
      }
    });
    
    // Remove source tag and return array
    return Array.from(map.values()).map(({ source, ...c }) => c);
  }, []);

  /**
   * Load collections from backend (when API endpoint becomes available)
   * @param {boolean} force - Force reload even if already initialized
   */
  const loadFromBackend = useCallback(async (force = false) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.log('No access token found, using local collections only');
      if (!force) setIsInitialized(true);
      return;
    }

    // Validate token before attempting to sync
    try {
      const authCheck = await fetch(`${getApiUrl()}/user/profile`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (!authCheck.ok) {
        console.log('Token validation failed, clearing token');
        localStorage.removeItem('accessToken');
        if (!force) setIsInitialized(true);
        return;
      }
    } catch (error) {
      console.log('Token validation error:', error.message);
      if (!force) setIsInitialized(true);
      return;
    }

    if (!isMountedRef.current) return;

    setIsSyncing(true);
    setSyncError(null);
    
    try {
      // TODO: Replace with actual backend endpoint when available
      // Example: const response = await fetch(`${getApiUrl()}/user/collections`, {...});
      const remote = [];
      
      const local = getLocalCollections();
      const merged = mergeCollections(local, remote);
      
      // Update state and localStorage
      isUpdatingFromBackend.current = true;
      setCollections(merged);
      setLocalCollections(merged);
      setLastBackendSync(new Date().toISOString());
      
      console.log('Collections synced from backend:', merged.length, 'items');
    } catch (error) {
      console.error('Error loading collections from backend:', error);
      setSyncError(error.message);
      
      // Fall back to local data on error
      const local = getLocalCollections();
      if (local.length > 0 && collections.length === 0) {
        isUpdatingFromBackend.current = true;
        setCollections(local);
      }
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false);
        if (!force) setIsInitialized(true);
      }
    }
  }, [mergeCollections, collections.length]);

  /**
   * Process offline queue when coming back online
   */
  const processOfflineQueue = useCallback(async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;
    
    console.log('Processing offline queue:', queue.length, 'operations');
    
    // TODO: Process queue operations when backend API is available
    // For now, just clear the queue since operations are already applied locally
    setOfflineQueue([]);
    
    // Reload from backend to ensure sync
    await loadFromBackend(true);
  }, [loadFromBackend]);

  // Mount/unmount tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Initial load from backend on mount and auth changes
  useEffect(() => {
    let authTimeoutId = null;
    
    loadFromBackend(false);
    
    const handleAuthChange = (event) => {
      const action = event?.detail?.action;
      console.log('Auth changed, reloading collections:', action);
      
      // Clear timeout if already scheduled
      if (authTimeoutId) clearTimeout(authTimeoutId);
      
      // Debounce to avoid multiple rapid reloads
      authTimeoutId = setTimeout(() => {
        loadFromBackend(false);
      }, 300);
    };
    
    window.addEventListener('auth-changed', handleAuthChange);
    
    return () => {
      if (authTimeoutId) clearTimeout(authTimeoutId);
      window.removeEventListener('auth-changed', handleAuthChange);
    };
  }, [loadFromBackend]);

  // Persist collections to localStorage when they change (with debouncing)
  useEffect(() => {
    if (isUpdatingFromBackend.current) {
      isUpdatingFromBackend.current = false;
      return;
    }
    
    // Debounce localStorage writes
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      setLocalCollections(collections);
      console.log('Collections persisted to localStorage:', collections.length, 'items');
    }, SYNC_DEBOUNCE_MS);
    
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [collections]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('Device is online, processing offline queue');
      processOfflineQueue();
    };
    
    const handleOffline = () => {
      console.log('Device is offline, operations will be queued');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processOfflineQueue]);

  /**
   * Add an item to collections with validation and duplicate checking
   * @param {Object} item - The item to add to collections
   */
  const addToCollections = useCallback((item) => {
    if (!item || !item.id) {
      console.error('Cannot add invalid item to collections:', item);
      toast.error('Invalid item');
      return;
    }

    // Check suppression map to avoid re-adding recently removed items
    const now = Date.now();
    const suppressedUntil = recentlyRemoved.current.get(item.id);
    if (suppressedUntil && now < suppressedUntil) {
      console.log('Suppressing re-add of recently removed item:', item.id);
      return;
    }

    setCollections(prev => {
      // Check if item already exists
      const exists = prev.find(x => x.id === item.id);
      if (exists) {
        console.log('Item already in collections:', item.id);
        return prev;
      }

      // Add timestamp and metadata
      const newItem = {
        ...item,
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Add to suppression map
      recentlyAdded.current.set(item.id, now + SUPPRESSION_MS);
      setTimeout(() => recentlyAdded.current.delete(item.id), SUPPRESSION_MS);

      console.log('Added to collections:', item.id);
      toast.success('Added to collections');

      // Queue operation if offline
      if (!navigator.onLine) {
        const queue = getOfflineQueue();
        queue.push({ type: 'add', item: newItem, timestamp: now });
        setOfflineQueue(queue);
      }

      return [...prev, newItem];
    });
  }, []);

  /**
   * Remove an item from collections
   * @param {string|number} id - The ID of the item to remove
   */
  const removeFromCollections = useCallback((id) => {
    if (!id) {
      console.error('Cannot remove item without ID');
      return;
    }

    // Check suppression map to avoid removing recently added items
    const now = Date.now();
    const suppressedUntil = recentlyAdded.current.get(id);
    if (suppressedUntil && now < suppressedUntil) {
      console.log('Suppressing removal of recently added item:', id);
      return;
    }

    setCollections(prev => {
      const filtered = prev.filter(x => x.id !== id);
      
      if (filtered.length === prev.length) {
        console.log('Item not found in collections:', id);
        return prev;
      }

      // Add to suppression map
      recentlyRemoved.current.set(id, now + SUPPRESSION_MS);
      setTimeout(() => recentlyRemoved.current.delete(id), SUPPRESSION_MS);

      console.log('Removed from collections:', id);
      toast.success('Removed from collections');

      // Queue operation if offline
      if (!navigator.onLine) {
        const queue = getOfflineQueue();
        queue.push({ type: 'remove', id, timestamp: now });
        setOfflineQueue(queue);
      }

      return filtered;
    });
  }, []);

  /**
   * Check if an item is in collections
   * @param {string|number} id - The ID of the item to check
   * @returns {boolean} True if item is in collections
   */
  const isInCollections = useCallback((id) => {
    return collections.some(item => item.id === id);
  }, [collections]);

  /**
   * Clear all collections
   */
  const clearCollections = useCallback(() => {
    if (collections.length === 0) {
      toast.error('Collections already empty');
      return;
    }

    const confirmClear = window.confirm(
      `Are you sure you want to clear all ${collections.length} items from collections?`
    );

    if (!confirmClear) return;

    setCollections([]);
    toast.success('Collections cleared');

    // Queue operation if offline
    if (!navigator.onLine) {
      const queue = getOfflineQueue();
      queue.push({ type: 'clear', timestamp: Date.now() });
      setOfflineQueue(queue);
    }
  }, [collections.length]);

  /**
   * Get collections count
   */
  const collectionsCount = useMemo(() => collections.length, [collections.length]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    collections,
    collectionsCount,
    isSyncing,
    isInitialized,
    syncError,
    lastBackendSync,
    addToCollections,
    removeFromCollections,
    isInCollections,
    clearCollections,
    refreshCollections: () => loadFromBackend(true),
  }), [
    collections,
    collectionsCount,
    isSyncing,
    isInitialized,
    syncError,
    lastBackendSync,
    addToCollections,
    removeFromCollections,
    isInCollections,
    clearCollections,
    loadFromBackend,
  ]);

  return (
    <CollectionsContext.Provider value={value}>
      {children}
    </CollectionsContext.Provider>
  );
};
