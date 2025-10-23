import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { useUndoSafe } from './UndoContext';
import { useSocket } from './SocketContext';
import { userAPI } from '../services/api';
import { getApiUrl } from '../config/api';

const WatchHistoryContext = createContext();

export const useWatchHistory = () => {
  const context = useContext(WatchHistoryContext);
  if (!context) {
    throw new Error('useWatchHistory must be used within a WatchHistoryProvider');
  }
  return context;
};

export const useWatchHistorySafe = () => {
  return useContext(WatchHistoryContext);
};

const WATCH_HISTORY_STORAGE_KEY = 'watchHistory';
const WATCH_HISTORY_VERSION = 2;
const WATCH_HISTORY_LAST_SYNC_KEY = 'watchHistoryLastSync';
const WATCH_HISTORY_OFFLINE_QUEUE_KEY = 'watchHistoryOfflineQueue';
const WATCH_HISTORY_BROADCAST_CHANNEL = 'watchHistory_channel_v1';

function migrateWatchHistory(data, version) {
  // Handle migrations based on version
  if (!version || version < 2) {
    // Migrate to version 2: Add timestamps to all entries if missing
    return data.map(item => ({
      ...item,
      lastWatched: item.lastWatched || new Date().toISOString(),
      syncTimestamp: item.syncTimestamp || new Date().toISOString()
    }));
  }
  return data;
}

function getLocalWatchHistory() {
  try {
    const raw = localStorage.getItem(WATCH_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return migrateWatchHistory(parsed, WATCH_HISTORY_VERSION);
    }
    return [];
  } catch (e) {
    console.error('Failed to parse local watch history:', e);
    return [];
  }
}

function setLocalWatchHistory(history) {
  try {
    // Use a safe stringify to avoid circular refs and trim large arrays if necessary
    localStorage.setItem(WATCH_HISTORY_STORAGE_KEY, JSON.stringify(history));
    // Update last sync timestamp
    localStorage.setItem(WATCH_HISTORY_LAST_SYNC_KEY, new Date().toISOString());
    // Broadcast to other tabs to keep state in sync
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel(WATCH_HISTORY_BROADCAST_CHANNEL);
        bc.postMessage({ type: 'local-update', payload: history });
        bc.close();
      } else {
        // Fallback to storage event
        localStorage.setItem(`${WATCH_HISTORY_STORAGE_KEY}_meta`, Date.now().toString());
      }
    } catch (e) {
      // Non-critical
      console.debug('BroadcastChannel not available or failed:', e.message || e);
    }
  } catch (e) {
    console.error('Failed to save watch history to localStorage:', e);
  }
}

function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(WATCH_HISTORY_OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to parse offline queue:', e);
    return [];
  }
}

function addToOfflineQueue(operation) {
  try {
    const queue = getOfflineQueue();
    queue.push({
      ...operation,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(WATCH_HISTORY_OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch (e) {
    console.error('Failed to add to offline queue:', e);
    return false;
  }
}

// Helper: replace offline queue atomically
function setOfflineQueue(queue) {
  try {
    localStorage.setItem(WATCH_HISTORY_OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch (e) {
    console.error('Failed to set offline queue:', e);
    return false;
  }
}

function clearOfflineQueue() {
  try {
    localStorage.removeItem(WATCH_HISTORY_OFFLINE_QUEUE_KEY);
    return true;
  } catch (e) {
    console.error('Failed to clear offline queue:', e);
    return false;
  }
}

export const WatchHistoryProvider = ({ children }) => {
  const [watchHistory, setWatchHistory] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastBackendSync, setLastBackendSync] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [lastConflict, setLastConflict] = useState(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [pendingOfflineOperations, setPendingOfflineOperations] = useState([]);

  // Refs to track changes and prevent infinite loops
  const isUpdatingFromBackend = useRef(false);
  const pendingChanges = useRef(new Set());
  const lastLocalChange = useRef(null);
  const networkStatus = useRef('online');
  const broadcastChannelRef = useRef(null);

  // For optimistic UI: track last mutation for rollback
  const lastMutation = useRef(null);

  // Get undo context safely
  const undoContext = useUndoSafe();

  // --- Utility: Compare two watch histories for equality ---
  const areHistoriesEqual = (a, b) => {
    if (a.length !== b.length) return false;
    // Sort by content for comparison
    const sortFn = (x, y) => (x.content > y.content ? 1 : -1);
    const aSorted = [...a].sort(sortFn);
    const bSorted = [...b].sort(sortFn);
    for (let i = 0; i < aSorted.length; i++) {
      if (
        aSorted[i].content !== bSorted[i].content ||
        aSorted[i].progress !== bSorted[i].progress ||
        aSorted[i].lastWatched !== bSorted[i].lastWatched
      ) {
        return false;
      }
    }
    return true;
  };
  
  // --- Utility: Merge watch histories with timestamp-based conflict resolution ---
  const mergeWatchHistories = (local, remote) => {
    // Use a map by content ID and prefer the item with the latest lastWatched timestamp
    const map = new Map();
    const push = (item, origin) => {
      try {
        const ts = item && item.lastWatched ? new Date(item.lastWatched).getTime() : 0;
        const existing = map.get(item.content);
        if (!existing || ts > existing._ts) {
          map.set(item.content, { ...item, _ts: ts, _origin: origin });
        }
      } catch (e) {
        // If parsing fails, prefer incoming item
        map.set(item.content, { ...item, _ts: Date.now(), _origin: origin });
      }
    };
    (Array.isArray(local) ? local : []).forEach(i => push(i, 'local'));
    (Array.isArray(remote) ? remote : []).forEach(i => push(i, 'remote'));

    return Array.from(map.values()).map(({ _ts, _origin, ...rest }) => rest);
  };
  
  // --- Utility: Check network status ---
  const checkNetworkStatus = () => {
    return navigator.onLine;
  };

  // --- Network status detection ---
  useEffect(() => {
    let isMounted = true;
    
    const handleOnline = () => {
      if (!isMounted) return;
      console.log('Network is online, processing offline queue...');
      networkStatus.current = 'online';
      setOfflineMode(false);
      
      // Process offline queue when back online
      const offlineQueue = getOfflineQueue();
      if (offlineQueue.length > 0) {
        setPendingOfflineOperations(offlineQueue);
      }
    };
    
    const handleOffline = () => {
      if (!isMounted) return;
      console.log('Network is offline, enabling offline mode...');
      networkStatus.current = 'offline';
      setOfflineMode(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check
    setOfflineMode(!navigator.onLine);
    networkStatus.current = navigator.onLine ? 'online' : 'offline';

    // Setup BroadcastChannel for cross-tab sync (best-effort)
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        broadcastChannelRef.current = new BroadcastChannel(WATCH_HISTORY_BROADCAST_CHANNEL);
        broadcastChannelRef.current.onmessage = (ev) => {
          try {
            const { type, payload } = ev.data || {};
            if (type === 'local-update' && Array.isArray(payload)) {
              setWatchHistory((prev) => {
                if (!areHistoriesEqual(prev, payload)) {
                  isUpdatingFromBackend.current = true;
                  return payload;
                }
                return prev;
              });
            }
            if (type === 'offline-queue-updated') {
              setPendingOfflineOperations(getOfflineQueue());
            }
          } catch (e) {
            console.debug('BroadcastChannel message handling error', e.message || e);
          }
        };
      }
    } catch (e) {
      // Ignore if BroadcastChannel unavailable
    }
    
    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // Close broadcast channel
      try {
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.close();
          broadcastChannelRef.current = null;
        }
      } catch (e) {
        // ignore
      }
    };
  }, []);

  // --- Load from backend for sync (used by effects) ---
  const loadFromBackendForSync = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      try {
        const authCheck = await fetch(`${getApiUrl()}/user/profile`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!authCheck.ok) {
          localStorage.removeItem('accessToken');
          return;
        }
      } catch (e) {
        // If network hiccup, bail out silently and rely on offline/local data
        console.debug('Auth check failed during loadFromBackendForSync:', e.message || e);
        return;
      }
      setIsSyncing(true);
      setSyncError(null);

      // Load current local pre-login history (if any)
      const localPreLogin = getLocalWatchHistory();

      // Pull backend copy
      const response = await userAPI.getWatchHistory();
        if (response.success && response.data.watchHistory) {
        const backendData = response.data.watchHistory;

  // Merge local and backend using timestamp-based conflict resolution
  const mergedData = mergeWatchHistories(localPreLogin, backendData);

        // If merged differs from backend, upload immediately so other devices see it
        (async () => {
          try {
            if (!areHistoriesEqual(mergedData, backendData)) {
              if (navigator.onLine) {
                // Fire-and-forget with retry strategy
                (async function trySync(retries = 0) {
                  try {
                    await userAPI.syncWatchHistory(mergedData);
                    window.dispatchEvent(new Event('watch-history-synced'));
                    window.dispatchEvent(new Event('achievements-refresh'));
                    setLastBackendSync(new Date().toISOString());
                  } catch (e) {
                    if (retries < 3) {
                      const delay = Math.pow(2, retries) * 500; // exponential backoff
                      setTimeout(() => trySync(retries + 1), delay);
                    } else {
                      console.warn('Sync after merge failed, queuing offline:', e.message || e);
                      addToOfflineQueue({ type: 'sync', data: mergedData });
                      setPendingOfflineOperations(getOfflineQueue());
                    }
                  }
                })();
              } else {
                // Offline: enqueue a sync operation so it will be processed when back online
                console.log('Offline at login - queuing merged watch history for later sync');
                addToOfflineQueue({ type: 'sync', data: mergedData });
                setPendingOfflineOperations(getOfflineQueue());
              }
            }
          } catch (e) {
            // Best-effort: capture error but still apply merged locally
            console.warn('Watch history immediate upload after login failed:', e);
          }
        })();

        // Update local state and cache
        isUpdatingFromBackend.current = true;
        setWatchHistory(mergedData);
        setLastBackendSync(new Date().toISOString());
        setLocalWatchHistory(mergedData);
      }
    } catch (error) {
      if (
        error.message &&
        (error.message.includes('401') || error.message.includes('Unauthorized'))
      ) {
        localStorage.removeItem('accessToken');
      }
      setSyncError(error.message);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // --- Load from backend and localStorage on mount ---
  useEffect(() => {
    let didCancel = false;
    const load = async () => {
      // Try backend first, then fallback to localStorage
      if (navigator.onLine) {
        const backendResult = await loadFromBackend(true);
        if (!backendResult.success) {
          // fallback to localStorage
          const local = getLocalWatchHistory();
          if (!didCancel) {
            setWatchHistory(local);
            setIsInitialized(true);
          }
        } else {
          setIsInitialized(true);
        }
      } else {
        // Offline mode - use localStorage only
        const local = getLocalWatchHistory();
        if (!didCancel) {
          setWatchHistory(local);
          setIsInitialized(true);
          setOfflineMode(true);
        }
      }
    };
    load();
    return () => {
      didCancel = true;
    };
    // eslint-disable-next-line
  }, []);

  // Debounced localStorage writes to avoid thrashing
  const saveLocalDebounced = useRef(null);
  const scheduleLocalSave = useCallback((nextHistory) => {
    if (saveLocalDebounced.current) clearTimeout(saveLocalDebounced.current);
    saveLocalDebounced.current = setTimeout(() => {
      setLocalWatchHistory(nextHistory);
      saveLocalDebounced.current = null;
    }, 250);
  }, []);

  // --- Listen for authentication token changes and reload watch history ---
  useEffect(() => {
    let timeoutId = null;
    let authTimeoutId = null;
    
    const handleStorageChange = (e) => {
      if (e.key === 'accessToken') {
        console.log('Auth token changed (storage), updating watch history state');
        const token = localStorage.getItem('accessToken');
        // If token removed, clear watch history immediately to avoid showing previous user's data
        if (!token) {
          console.log('Access token removed - clearing watch history and offline queue');
          setWatchHistory([]);
          clearOfflineQueue();
          setPendingOfflineOperations([]);
          setIsInitialized(true);
          return;
        }

        timeoutId = setTimeout(() => {
          loadFromBackendForSync();
        }, 100);
      }
      if (e.key === WATCH_HISTORY_STORAGE_KEY) {
        // Cross-tab sync for local watch history
        const local = getLocalWatchHistory();
        setWatchHistory((prev) => {
          if (!areHistoriesEqual(prev, local)) {
            return local;
          }
          return prev;
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const handleAuthChange = () => {
      console.log('Auth change detected (custom event), updating watch history state');
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('Access token removed via auth-changed - clearing watch history and offline queue');
        setWatchHistory([]);
        clearOfflineQueue();
        setPendingOfflineOperations([]);
        setIsInitialized(true);
        return;
      }

      authTimeoutId = setTimeout(() => {
        loadFromBackendForSync();
      }, 100);
    };

    window.addEventListener('auth-changed', handleAuthChange);

    return () => {
      // Clear any pending timeouts
      if (timeoutId) clearTimeout(timeoutId);
      if (authTimeoutId) clearTimeout(authTimeoutId);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', handleAuthChange);
    };
    // eslint-disable-next-line
  }, [loadFromBackendForSync]);

  // Get socket context for real-time updates (with error handling)
  let socketContext = null;
  try {
    socketContext = useSocket();
  } catch (error) {
    console.log('Socket context not available, using polling fallback');
  }

  // Real-time WebSocket sync for watch history
  useEffect(() => {
    if (socketContext && socketContext.addListener) {
      // Listen for real-time watch history updates
      const removeListener = socketContext.addListener('watchHistory:updated', (data) => {
        if (data.userId && data.watchHistory) {
          console.log('Received real-time watch history update:', data.watchHistory.length, 'items');
          
          // Only update if the data is different
          if (!areHistoriesEqual(watchHistory, data.watchHistory)) {
            console.log('Watch history data changed via WebSocket, updating local state');
            isUpdatingFromBackend.current = true;
            setWatchHistory(data.watchHistory);
            setLastBackendSync(data.serverTimestamp || new Date().toISOString());
            setLocalWatchHistory(data.watchHistory);
          }
        }
      });

      return () => {
        if (removeListener) removeListener();
      };
    } else {
      // Fallback to periodic refresh if WebSocket is not available
      const interval = setInterval(async () => {
        const token = localStorage.getItem('accessToken');
        if (!token || !isInitialized || isSyncing) return;
        try {
          const authCheck = await fetch(`${getApiUrl()}/user/profile`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!authCheck.ok) {
            localStorage.removeItem('accessToken');
            return;
          }
        } catch {
          return;
        }
        try {
          const response = await userAPI.getWatchHistory();
          if (response.success && response.data.watchHistory) {
            const backendData = response.data.watchHistory;
            if (!areHistoriesEqual(watchHistory, backendData)) {
              isUpdatingFromBackend.current = true;
              setWatchHistory(backendData);
              setLastBackendSync(new Date().toISOString());
              setLocalWatchHistory(backendData);
            }
          }
        } catch (error) {
          if (
            error.message &&
            (error.message.includes('401') || error.message.includes('Unauthorized'))
          ) {
            localStorage.removeItem('accessToken');
          }
        }
      }, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line
  }, [watchHistory, isInitialized, isSyncing, socketContext]);

  // --- Enhanced auto-sync with backend and save to localStorage whenever watch history changes ---
  useEffect(() => {
    if (!isInitialized || isUpdatingFromBackend.current) {
      isUpdatingFromBackend.current = false;
      return;
    }
    if (watchHistory.length === 0 && !lastLocalChange.current) {
      return;
    }

    let isMounted = true;

    const autoSyncWithBackend = async () => {
      if (!isMounted) return;
      
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        if (pendingChanges.current.size > 0) return;
        
        // Skip sync if offline
        if (!navigator.onLine) {
          console.log('Offline mode: Skipping backend sync, saving to queue');
          addToOfflineQueue({
            type: 'sync',
            data: watchHistory
          });
          return;
        }
        
        setIsSyncing(true);
        setSyncError(null);
        
        // Get the latest backend data first for proper merging
        const response = await userAPI.getWatchHistory();
        if (response && response.success && response.data && response.data.watchHistory) {
          const backendData = response.data.watchHistory;

          // Merge local and remote data with timestamp-based conflict resolution
          const mergedData = mergeWatchHistories(watchHistory, backendData);

          // Only sync if there are differences after merging
          if (!areHistoriesEqual(watchHistory, mergedData)) {
            // Update local state with merged data
            isUpdatingFromBackend.current = true;
            setWatchHistory(mergedData);

            // Sync merged data to backend
            try {
              await userAPI.syncWatchHistory(mergedData);
              setLastBackendSync(new Date().toISOString());
              pendingChanges.current.clear();
              // Notify listeners
              window.dispatchEvent(new Event('watch-history-synced'));
              window.dispatchEvent(new Event('achievements-refresh'));
            } catch (e) {
              // On failure, queue merged data for later processing
              console.warn('Auto sync merged data failed, queueing for later:', e.message || e);
              addToOfflineQueue({ type: 'sync', data: mergedData });
              setPendingOfflineOperations(getOfflineQueue());
            }
          }
        } else {
          // If we can't get backend data, attempt to sync current state; queue on failure
          try {
            await userAPI.syncWatchHistory(watchHistory);
            setLastBackendSync(new Date().toISOString());
            pendingChanges.current.clear();
            window.dispatchEvent(new Event('watch-history-synced'));
            window.dispatchEvent(new Event('achievements-refresh'));
          } catch (e) {
            console.warn('Auto sync fallback failed, queueing for later:', e.message || e);
            addToOfflineQueue({ type: 'sync', data: watchHistory });
            setPendingOfflineOperations(getOfflineQueue());
          }
        }
      } catch (error) {
        setSyncError(error.message);
        // If sync fails due to network issues, add to offline queue
        if (!navigator.onLine) {
          addToOfflineQueue({
            type: 'sync',
            data: watchHistory
          });
        }
      } finally {
        if (isMounted) {
          setIsSyncing(false);
        }
      }
    };

    const syncTimeout = setTimeout(autoSyncWithBackend, 1000);

    try {
      // Persist locally (debounced)
      scheduleLocalSave(watchHistory);
      lastLocalChange.current = new Date().toISOString();
    } catch (error) {
      // Already logged in setLocalWatchHistory
    }

    return () => {
      isMounted = false;
      clearTimeout(syncTimeout);
    };
    // eslint-disable-next-line
  }, [watchHistory, isInitialized]);

  // --- Process offline queue when back online ---
  useEffect(() => {
    if (offlineMode || pendingOfflineOperations.length === 0 || isSyncing) return;
    
    const processOfflineQueue = async () => {
      try {
        setIsSyncing(true);
        console.log(`Processing ${pendingOfflineOperations.length} offline operations...`);

        // Try with retry/backoff
        let attempts = 0;
        let lastErr = null;
        while (attempts < 4) {
          try {
            const response = await userAPI.processBatchWatchHistory(pendingOfflineOperations);
            if (response && response.success && response.data && response.data.watchHistory) {
              isUpdatingFromBackend.current = true;
              setWatchHistory(response.data.watchHistory);
              setLocalWatchHistory(response.data.watchHistory);
              setLastBackendSync(new Date().toISOString());
            }

            // Clear the offline queue
            clearOfflineQueue();
            setPendingOfflineOperations([]);

            // Notify other tabs
            try {
              if (broadcastChannelRef.current) {
                broadcastChannelRef.current.postMessage({ type: 'offline-queue-updated' });
              }
            } catch (e) {}

            console.log('Offline queue processed successfully');
            lastErr = null;
            break;
          } catch (e) {
            lastErr = e;
            attempts += 1;
            const delay = Math.pow(2, attempts) * 300;
            // eslint-disable-next-line no-await-in-loop
            await new Promise((r) => setTimeout(r, delay));
          }
        }
        if (lastErr) {
          console.error('Failed to process offline queue after retries:', lastErr);
          setSyncError(lastErr.message || lastErr);
        }
      } catch (error) {
        console.error('Failed to process offline queue:', error);
        setSyncError(error.message);
        // Keep the queue for retry later
      } finally {
        setIsSyncing(false);
      }
    };
    
    processOfflineQueue();
  }, [offlineMode, pendingOfflineOperations, isSyncing, watchHistory]);

  // --- Add item to watch history (Optimistic) ---
  const addToWatchHistory = useCallback(
    async (contentId, progress = 0) => {
      if (!contentId) return;
      const changeId = `add_${contentId}_${Date.now()}`;
      pendingChanges.current.add(changeId);
      const now = new Date().toISOString();

      setWatchHistory((prev) => {
        const existingIndex = prev.findIndex((item) => item.content === contentId);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            progress,
            lastWatched: now,
            syncTimestamp: now
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              content: contentId,
              progress,
              lastWatched: now,
              syncTimestamp: now
            },
          ];
        }
      });

      if (undoContext?.addToHistory) {
        undoContext.addToHistory('watchHistory', 'add', { contentId, progress });
      }

      // Persist locally (debounced)
      try {
        scheduleLocalSave(getLocalWatchHistory());
      } catch (e) {}

      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          if (!navigator.onLine) {
            // Store operation in offline queue
            addToOfflineQueue({
              type: 'add',
              contentId,
              progress,
              timestamp: now
            });
            setPendingOfflineOperations(getOfflineQueue());
            return;
          }
          
          // Use the latest state for sync
          const updatedHistory = getLocalWatchHistory();
          await userAPI.syncWatchHistory(updatedHistory);
          setLastBackendSync(new Date().toISOString());
          window.dispatchEvent(new Event('watch-history-synced'));
          window.dispatchEvent(new Event('achievements-refresh'));
        }
      } catch (error) {
        setSyncError(error.message);
        // If sync fails due to network issues, add to offline queue
        if (!navigator.onLine) {
          addToOfflineQueue({
            type: 'add',
            contentId,
            progress,
            timestamp: now
          });
          setPendingOfflineOperations(getOfflineQueue());
        }
      } finally {
        setTimeout(() => {
          pendingChanges.current.delete(changeId);
        }, 100);
      }
    },
    [undoContext]
  );

  // --- Update watch history progress (Optimistic) ---
  const updateWatchHistoryProgress = useCallback(
    async (contentId, progress) => {
      if (!contentId || typeof progress !== 'number') return;
      const changeId = `update_${contentId}_${Date.now()}`;
      pendingChanges.current.add(changeId);
      const now = new Date().toISOString();

      setWatchHistory((prev) => {
        const existingIndex = prev.findIndex((item) => item.content === contentId);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            progress,
            lastWatched: now,
            syncTimestamp: now
          };
          return updated;
        }
        return prev;
      });

      if (undoContext?.addToHistory) {
        undoContext.addToHistory('watchHistory', 'update', { contentId, progress });
      }

      // Persist locally (debounced)
      try {
        scheduleLocalSave(getLocalWatchHistory());
      } catch (e) {}

      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          if (!navigator.onLine) {
            // Store operation in offline queue
            addToOfflineQueue({
              type: 'update',
              contentId,
              progress,
              timestamp: now
            });
            setPendingOfflineOperations(getOfflineQueue());
            return;
          }

          const updatedHistory = getLocalWatchHistory();
          await userAPI.syncWatchHistory(updatedHistory);
          setLastBackendSync(new Date().toISOString());
          window.dispatchEvent(new Event('watch-history-synced'));
          window.dispatchEvent(new Event('achievements-refresh'));
        }
      } catch (error) {
        setSyncError(error.message);
        // If sync fails due to network issues, add to offline queue
        if (!navigator.onLine) {
          addToOfflineQueue({
            type: 'update',
            contentId,
            progress,
            timestamp: now
          });
        }
      } finally {
        setTimeout(() => {
          pendingChanges.current.delete(changeId);
        }, 100);
      }
    },
    [undoContext]
  );

  // --- Remove item from watch history (Optimistic) ---
  const removeFromWatchHistory = useCallback(
    async (contentId) => {
      if (!contentId) return;
      const changeId = `remove_${contentId}_${Date.now()}`;
      pendingChanges.current.add(changeId);

      setWatchHistory((prev) => {
        const existingIndex = prev.findIndex((item) => item.content === contentId);
        if (existingIndex > -1) {
          if (undoContext?.addToHistory) {
            undoContext.addToHistory('watchHistory', 'remove', prev[existingIndex]);
          }
          return prev.filter((item) => item.content !== contentId);
        }
        return prev;
      });

      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          if (!navigator.onLine) {
            addToOfflineQueue({ type: 'remove', contentId, timestamp: new Date().toISOString() });
            setPendingOfflineOperations(getOfflineQueue());
          } else {
            const updatedHistory = getLocalWatchHistory();
            await userAPI.syncWatchHistory(updatedHistory);
            setLastBackendSync(new Date().toISOString());
            window.dispatchEvent(new Event('watch-history-synced'));
            window.dispatchEvent(new Event('achievements-refresh'));
          }
        }
      } catch (error) {
        setSyncError(error.message);
      } finally {
        setTimeout(() => {
          pendingChanges.current.delete(changeId);
        }, 100);
      }
    },
    [undoContext]
  );

  // --- Clear entire watch history (Optimistic) ---
  const clearWatchHistory = useCallback(async () => {
    const changeId = `clear_${Date.now()}`;
    pendingChanges.current.add(changeId);

    if (undoContext?.addToHistory) {
      undoContext.addToHistory('watchHistory', 'clear', [...watchHistory]);
    }

    setWatchHistory([]);

    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        if (!navigator.onLine) {
          addToOfflineQueue({ type: 'clear', timestamp: new Date().toISOString() });
          setPendingOfflineOperations(getOfflineQueue());
        } else {
          await userAPI.syncWatchHistory([]);
          setLastBackendSync(new Date().toISOString());
          window.dispatchEvent(new Event('watch-history-synced'));
          window.dispatchEvent(new Event('achievements-refresh'));
        }
      }
    } catch (error) {
      setSyncError(error.message);
    } finally {
      setTimeout(() => {
        pendingChanges.current.delete(changeId);
      }, 100);
    }
    // eslint-disable-next-line
  }, [watchHistory, undoContext]);

  // --- Enhanced sync with backend manually (for explicit sync operations) ---
  const syncWithBackend = useCallback(
    async (force = false) => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('No authentication token found');
        if (!force && pendingChanges.current.size > 0) {
          return { success: false, error: 'Pending changes detected' };
        }
        setIsSyncing(true);
        setSyncError(null);
        
        // Check if we're online
        if (!navigator.onLine) {
          throw new Error('You are offline. Changes will sync when connection is restored.');
        }
        
        // Pass the current timestamp for conflict resolution
        const response = await userAPI.syncWatchHistory(getLocalWatchHistory());
        if (response && response.watchHistory) {
          // Update local state with the server state
          isUpdatingFromBackend.current = true;
          setWatchHistory(response.watchHistory);
          setLocalWatchHistory(response.watchHistory);
        }
        
        setLastBackendSync(new Date().toISOString());
        pendingChanges.current.clear();
        return { success: true };
      } catch (error) {
        setSyncError(error.message);
        
        // If we're offline, add to offline queue
        if (!navigator.onLine) {
          addToOfflineQueue({
            type: 'sync',
            data: getLocalWatchHistory(),
            timestamp: new Date().toISOString()
          });
        }
        
        return { success: false, error: error.message };
      } finally {
        setIsSyncing(false);
      }
    },
    []
  );

  // --- Enhanced load from backend manually (for explicit refresh operations) ---
  const loadFromBackend = useCallback(
    async (force = false) => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('No authentication token found');
        if (!force && pendingChanges.current.size > 0) {
          return { success: false, error: 'Pending changes detected' };
        }
        setIsSyncing(true);
        setSyncError(null);
        const response = await userAPI.getWatchHistory();
        if (response.success && response.data.watchHistory) {
          const backendData = response.data.watchHistory;
          isUpdatingFromBackend.current = true;
          setWatchHistory(backendData);
          setLastBackendSync(new Date().toISOString());
          setLocalWatchHistory(backendData);
          return { success: true, data: backendData };
        }
        return { success: false, error: 'Invalid response format' };
      } catch (error) {
        setSyncError(error.message);
        return { success: false, error: error.message };
      } finally {
        setIsSyncing(false);
      }
    },
    []
  );

  // --- Force sync/load for conflict resolution ---
  const forceSync = useCallback(async () => {
    return await syncWithBackend(true);
  }, [syncWithBackend]);
  const forceLoad = useCallback(async () => {
    return await loadFromBackend(true);
  }, [loadFromBackend]);

  // --- Manual refresh function for users to sync from backend ---
  const refreshFromBackend = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No authentication token found');
      setIsSyncing(true);
      setSyncError(null);
      const response = await userAPI.getWatchHistory();
      if (response.success && response.data.watchHistory) {
        const backendData = response.data.watchHistory;
        isUpdatingFromBackend.current = true;
        setWatchHistory(backendData);
        setLastBackendSync(new Date().toISOString());
        setLocalWatchHistory(backendData);
        return { success: true, data: backendData };
      }
      return { success: false, error: 'Invalid response format' };
    } catch (error) {
      setSyncError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // --- Memoize value for context consumers ---
  const value = useMemo(
    () => ({
      watchHistory,
      isInitialized,
      isSyncing,
      syncError,
      lastBackendSync,
      lastConflict,
      addToWatchHistory,
      updateWatchHistoryProgress,
      removeFromWatchHistory,
      clearWatchHistory,
      syncWithBackend,
      loadFromBackend,
      forceSync,
      forceLoad,
      refreshFromBackend,
      // New: utility for advanced consumers
      getLocalWatchHistory,
    }),
    [
      watchHistory,
      isInitialized,
      isSyncing,
      syncError,
      lastBackendSync,
      lastConflict,
      addToWatchHistory,
      updateWatchHistoryProgress,
      removeFromWatchHistory,
      clearWatchHistory,
      syncWithBackend,
      loadFromBackend,
      forceSync,
      forceLoad,
      refreshFromBackend,
    ]
  );

  return (
    <WatchHistoryContext.Provider value={value}>
      {children}
    </WatchHistoryContext.Provider>
  );
};
