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
const WATCH_HISTORY_VERSION = 1;

function migrateWatchHistory(data) {
  // For future schema migrations
  // Currently, just return as is
  return data;
}

function getLocalWatchHistory() {
  try {
    const raw = localStorage.getItem(WATCH_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return migrateWatchHistory(parsed);
    }
    return [];
  } catch (e) {
    console.error('Failed to parse local watch history:', e);
    return [];
  }
}

function setLocalWatchHistory(history) {
  try {
    localStorage.setItem(WATCH_HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save watch history to localStorage:', e);
  }
}

export const WatchHistoryProvider = ({ children }) => {
  const [watchHistory, setWatchHistory] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastBackendSync, setLastBackendSync] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [lastConflict, setLastConflict] = useState(null);

  // Refs to track changes and prevent infinite loops
  const isUpdatingFromBackend = useRef(false);
  const pendingChanges = useRef(new Set());
  const lastLocalChange = useRef(null);

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

  // --- Load from backend and localStorage on mount ---
  useEffect(() => {
    let didCancel = false;
    const load = async () => {
      // Try backend first, then fallback to localStorage
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
    };
    load();
    return () => {
      didCancel = true;
    };
    // eslint-disable-next-line
  }, []);

  // --- Listen for authentication token changes and reload watch history ---
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'accessToken') {
        setTimeout(() => {
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
      setTimeout(() => {
        loadFromBackendForSync();
      }, 100);
    };

    window.addEventListener('auth-changed', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', handleAuthChange);
    };
    // eslint-disable-next-line
  }, []);

  // --- Periodic refresh from backend (every 30 seconds) ---
  useEffect(() => {
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
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [watchHistory, isInitialized, isSyncing]);

  // --- Enhanced auto-sync with backend and save to localStorage whenever watch history changes ---
  useEffect(() => {
    if (!isInitialized || isUpdatingFromBackend.current) {
      isUpdatingFromBackend.current = false;
      return;
    }
    if (watchHistory.length === 0 && !lastLocalChange.current) {
      return;
    }

    const autoSyncWithBackend = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        if (pendingChanges.current.size > 0) return;
        setIsSyncing(true);
        setSyncError(null);
        await userAPI.syncWatchHistory(watchHistory);
        setLastBackendSync(new Date().toISOString());
        pendingChanges.current.clear();
      } catch (error) {
        setSyncError(error.message);
      } finally {
        setIsSyncing(false);
      }
    };

    const syncTimeout = setTimeout(autoSyncWithBackend, 1200);

    try {
      setLocalWatchHistory(watchHistory);
      lastLocalChange.current = new Date().toISOString();
    } catch (error) {
      // Already logged in setLocalWatchHistory
    }

    return () => clearTimeout(syncTimeout);
    // eslint-disable-next-line
  }, [watchHistory, isInitialized]);

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
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              content: contentId,
              progress,
              lastWatched: now,
            },
          ];
        }
      });

      if (undoContext?.addToHistory) {
        undoContext.addToHistory('watchHistory', 'add', { contentId, progress });
      }

      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          // Use the latest state for sync
          const updatedHistory = getLocalWatchHistory();
          await userAPI.syncWatchHistory(updatedHistory);
          setLastBackendSync(new Date().toISOString());
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

  // --- Update watch history progress (Optimistic) ---
  const updateWatchHistoryProgress = useCallback(
    async (contentId, progress) => {
      if (!contentId || typeof progress !== 'number') return;
      const changeId = `update_${contentId}_${Date.now()}`;
      pendingChanges.current.add(changeId);

      setWatchHistory((prev) => {
        const existingIndex = prev.findIndex((item) => item.content === contentId);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            progress,
            lastWatched: new Date().toISOString(),
          };
          return updated;
        }
        return prev;
      });

      if (undoContext?.addToHistory) {
        undoContext.addToHistory('watchHistory', 'update', { contentId, progress });
      }

      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const updatedHistory = getLocalWatchHistory();
          await userAPI.syncWatchHistory(updatedHistory);
          setLastBackendSync(new Date().toISOString());
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
          const updatedHistory = getLocalWatchHistory();
          await userAPI.syncWatchHistory(updatedHistory);
          setLastBackendSync(new Date().toISOString());
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
        await userAPI.syncWatchHistory([]);
        setLastBackendSync(new Date().toISOString());
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
        await userAPI.syncWatchHistory(getLocalWatchHistory());
        setLastBackendSync(new Date().toISOString());
        pendingChanges.current.clear();
        return { success: true };
      } catch (error) {
        setSyncError(error.message);
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
      } catch {
        return;
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
