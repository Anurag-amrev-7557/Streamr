import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useUndoSafe } from './UndoContext';
import { userAPI } from '../services/api';

const WatchHistoryContext = createContext();

export const useWatchHistory = () => {
  const context = useContext(WatchHistoryContext);
  if (!context) {
    throw new Error('useWatchHistory must be used within a WatchHistoryProvider');
  }
  return context;
};

// Safe version that returns null instead of throwing during initialization
export const useWatchHistorySafe = () => {
  const context = useContext(WatchHistoryContext);
  return context;
};

export const WatchHistoryProvider = ({ children }) => {
  const [watchHistory, setWatchHistory] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastBackendSync, setLastBackendSync] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  
  // Refs to track changes and prevent infinite loops
  const isUpdatingFromBackend = useRef(false);
  const pendingChanges = useRef(new Set());
  const lastLocalChange = useRef(null);
  
  // Get undo context safely
  const undoContext = useUndoSafe();

  // Load watch history from backend and localStorage on mount
  useEffect(() => {
    const loadFromLocalStorage = () => {
      try {
        const savedHistory = localStorage.getItem('watchHistory');
        if (savedHistory) {
          const parsed = JSON.parse(savedHistory);
          setWatchHistory(parsed);
          console.log('Loaded watch history from localStorage:', parsed.length, 'items');
        }
      } catch (error) {
        console.error('Error loading watch history from localStorage:', error);
      }
    };

    // Try backend first, then fall back to localStorage
    loadFromBackend().finally(() => {
      loadFromLocalStorage();
      setIsInitialized(true);
    });
  }, []);

  // Define loadFromBackend function that can be used by other useEffects
  const loadFromBackendForSync = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        setIsSyncing(true);
        setSyncError(null);
        
        const response = await userAPI.getWatchHistory();
        if (response.success && response.data.watchHistory) {
          // Update local state with backend data
          const backendData = response.data.watchHistory;
          isUpdatingFromBackend.current = true;
          setWatchHistory(backendData);
          setLastBackendSync(new Date().toISOString());
          console.log('Loaded watch history from backend:', backendData.length, 'items');
          
          // Update localStorage with backend data
          try {
            localStorage.setItem('watchHistory', JSON.stringify(backendData));
          } catch (error) {
            console.error('Error updating localStorage with backend data:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load watch history from backend:', error);
      setSyncError(error.message);
      // Fall back to localStorage
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Listen for authentication token changes and reload watch history
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'accessToken') {
        console.log('Auth token changed, reloading watch history from backend');
        // Small delay to ensure the token is properly set
        setTimeout(() => {
          loadFromBackendForSync();
        }, 100);
      }
    };

    // Listen for storage events (for cross-tab communication)
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom auth events
    const handleAuthChange = () => {
      console.log('Auth change detected, reloading watch history from backend');
      setTimeout(() => {
        loadFromBackendForSync();
      }, 100);
    };

    window.addEventListener('auth-changed', handleAuthChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', handleAuthChange);
    };
  }, []);

  // Periodic refresh from backend (every 30 seconds) to catch changes from other devices
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = localStorage.getItem('accessToken');
      if (token && isInitialized && !isSyncing) {
        try {
          console.log('Performing periodic watch history refresh from backend');
          const response = await userAPI.getWatchHistory();
          if (response.success && response.data.watchHistory) {
            const backendData = response.data.watchHistory;
            
            // Only update if the data is different
            const currentData = JSON.stringify(watchHistory);
            const newData = JSON.stringify(backendData);
            
            if (currentData !== newData) {
              console.log('Watch history data changed on backend, updating local state');
              isUpdatingFromBackend.current = true;
              setWatchHistory(backendData);
              setLastBackendSync(new Date().toISOString());
              
              // Update localStorage with backend data
              try {
                localStorage.setItem('watchHistory', JSON.stringify(backendData));
              } catch (error) {
                console.error('Error updating localStorage with backend data:', error);
              }
            }
          }
        } catch (error) {
          console.error('Periodic refresh failed:', error);
          // Don't set sync error for background refresh
        }
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [watchHistory, isInitialized, isSyncing]);

  // Enhanced auto-sync with backend and save to localStorage whenever watch history changes
  useEffect(() => {
    // Don't sync during initial load or when updating from backend
    if (!isInitialized || isUpdatingFromBackend.current) {
      isUpdatingFromBackend.current = false;
      return;
    }
    
    // Don't sync if there are no changes
    if (watchHistory.length === 0 && !lastLocalChange.current) {
      return;
    }
    
    const autoSyncWithBackend = async () => {
      try {
        // Only sync if user is authenticated
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.log('User not authenticated, skipping backend sync');
          return;
        }

        // Check if we have pending changes
        if (pendingChanges.current.size > 0) {
          console.log('Skipping sync due to pending changes:', pendingChanges.current.size);
          return;
        }

        setIsSyncing(true);
        setSyncError(null);
        
        await userAPI.syncWatchHistory(watchHistory);
        setLastBackendSync(new Date().toISOString());
        console.log('Watch history automatically synced with backend');
        
        // Clear any pending changes after successful sync
        pendingChanges.current.clear();
        
      } catch (error) {
        console.error('Auto-sync failed:', error);
        setSyncError(error.message);
        // Don't show error toast for auto-sync failures
      } finally {
        setIsSyncing(false);
      }
    };

    // Debounce the sync to avoid too many API calls
    const syncTimeout = setTimeout(autoSyncWithBackend, 1500);
    
    // Always save to localStorage
    try {
      localStorage.setItem('watchHistory', JSON.stringify(watchHistory));
      lastLocalChange.current = new Date().toISOString();
    } catch (error) {
      console.error('Error saving watch history:', error);
    }
    
    return () => clearTimeout(syncTimeout);
  }, [watchHistory, isInitialized]);

  // Add item to watch history
  const addToWatchHistory = useCallback(async (contentId, progress = 0) => {
    if (!contentId) return;

    // Mark this change as pending
    const changeId = `add_${contentId}_${Date.now()}`;
    pendingChanges.current.add(changeId);

    const now = new Date().toISOString();
    
    setWatchHistory(prev => {
      // Check if item already exists
      const existingIndex = prev.findIndex(item => item.content === contentId);
      
      if (existingIndex > -1) {
        // Update existing item
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          progress,
          lastWatched: now
        };
        
        return updated;
      } else {
        // Add new item
        const newHistory = [...prev, {
          content: contentId,
          progress,
          lastWatched: now
        }];
        
        return newHistory;
      }
    });

    // Add to undo context if available
    if (undoContext?.addToHistory) {
      undoContext.addToHistory('watchHistory', 'add', { contentId, progress });
    }

    // Ensure backend sync happens for addition
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        // Get the updated watch history after addition
        const updatedHistory = watchHistory.find(item => item.content === contentId) 
          ? watchHistory.map(item => 
              item.content === contentId 
                ? { ...item, progress, lastWatched: now }
                : item
            )
          : [...watchHistory, { content: contentId, progress, lastWatched: now }];
        
        await userAPI.syncWatchHistory(updatedHistory);
        console.log('Watch history synced to backend after addition');
        setLastBackendSync(new Date().toISOString());
      }
    } catch (error) {
      console.error('Failed to sync addition to backend:', error);
      setSyncError(error.message);
    } finally {
      // Remove the pending change after sync attempt
      setTimeout(() => {
        pendingChanges.current.delete(changeId);
        console.log('Removed pending change for addition:', changeId);
      }, 100);
    }
  }, [watchHistory, undoContext]);

  // Update watch history progress
  const updateWatchHistoryProgress = useCallback(async (contentId, progress) => {
    if (!contentId || typeof progress !== 'number') return;

    // Mark this change as pending
    const changeId = `update_${contentId}_${Date.now()}`;
    pendingChanges.current.add(changeId);

    setWatchHistory(prev => {
      const existingIndex = prev.findIndex(item => item.content === contentId);
      
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          progress,
          lastWatched: new Date().toISOString()
        };
        
        return updated;
      }
      
      return prev;
    });

    // Add to undo context if available
    if (undoContext?.addToHistory) {
      undoContext.addToHistory('watchHistory', 'update', { contentId, progress });
    }

    // Ensure backend sync happens for progress update
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        // Get the updated watch history after progress update
        const updatedHistory = watchHistory.map(item => 
          item.content === contentId 
            ? { ...item, progress, lastWatched: new Date().toISOString() }
            : item
        );
        
        await userAPI.syncWatchHistory(updatedHistory);
        console.log('Watch history synced to backend after progress update');
        setLastBackendSync(new Date().toISOString());
      }
    } catch (error) {
      console.error('Failed to sync progress update to backend:', error);
      setSyncError(error.message);
    } finally {
      // Remove the pending change after sync attempt
      setTimeout(() => {
        pendingChanges.current.delete(changeId);
        console.log('Removed pending change for progress update:', changeId);
      }, 100);
    }
  }, [watchHistory, undoContext]);

  // Remove item from watch history
  const removeFromWatchHistory = useCallback(async (contentId) => {
    if (!contentId) return;

    // Mark this change as pending
    const changeId = `remove_${contentId}_${Date.now()}`;
    pendingChanges.current.add(changeId);

    setWatchHistory(prev => {
      const existingIndex = prev.findIndex(item => item.content === contentId);
      
      if (existingIndex > -1) {
        // Add to undo context if available
        if (undoContext?.addToHistory) {
          undoContext.addToHistory('watchHistory', 'remove', prev[existingIndex]);
        }
        
        const newHistory = prev.filter(item => item.content !== contentId);
        
        return newHistory;
      }
      
      return prev;
    });

    // Ensure backend sync happens for removal
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        // Get the updated watch history after removal
        const updatedHistory = watchHistory.filter(item => item.content !== contentId);
        
        await userAPI.syncWatchHistory(updatedHistory);
        console.log('Watch history synced to backend after removal');
        setLastBackendSync(new Date().toISOString());
      }
    } catch (error) {
      console.error('Failed to sync removal to backend:', error);
      setSyncError(error.message);
    } finally {
      // Remove the pending change after sync attempt
      setTimeout(() => {
        pendingChanges.current.delete(changeId);
        console.log('Removed pending change for removal:', changeId);
      }, 100);
    }
  }, [watchHistory, undoContext]);

  // Clear entire watch history
  const clearWatchHistory = useCallback(async () => {
    // Mark this change as pending
    const changeId = `clear_${Date.now()}`;
    pendingChanges.current.add(changeId);

    // Add to undo context if available
    if (undoContext?.addToHistory) {
      undoContext.addToHistory('watchHistory', 'clear', [...watchHistory]);
    }
    
    setWatchHistory([]);

    // Ensure backend sync happens for clearing
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        await userAPI.syncWatchHistory([]);
        console.log('Watch history synced to backend after clearing');
        setLastBackendSync(new Date().toISOString());
      }
    } catch (error) {
      console.error('Failed to sync clearing to backend:', error);
      setSyncError(error.message);
    } finally {
      // Remove the pending change after sync attempt
      setTimeout(() => {
        pendingChanges.current.delete(changeId);
        console.log('Removed pending change for clearing:', changeId);
      }, 100);
    }
  }, [watchHistory, undoContext]);

  // Enhanced sync with backend manually (for explicit sync operations)
  const syncWithBackend = useCallback(async (force = false) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Don't sync if there are pending changes (unless forced)
      if (!force && pendingChanges.current.size > 0) {
        console.log('Skipping sync due to pending changes');
        return { success: false, error: 'Pending changes detected' };
      }

      setIsSyncing(true);
      setSyncError(null);

      await userAPI.syncWatchHistory(watchHistory);
      setLastBackendSync(new Date().toISOString());
      console.log('Watch history manually synced with backend');
      
      // Clear any pending changes after successful sync
      pendingChanges.current.clear();
      
      return { success: true };
    } catch (error) {
      console.error('Manual sync failed:', error);
      setSyncError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsSyncing(false);
    }
  }, [watchHistory]);

  // Enhanced load from backend manually (for explicit refresh operations)
  const loadFromBackend = useCallback(async (force = false) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Don't load if there are pending changes (unless forced)
      if (!force && pendingChanges.current.size > 0) {
        console.log('Skipping load due to pending changes');
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
        console.log('Watch history manually loaded from backend:', backendData.length, 'items');
        
        // Update localStorage with backend data
        try {
          localStorage.setItem('watchHistory', JSON.stringify(backendData));
        } catch (error) {
          console.error('Error updating localStorage with backend data:', error);
        }
        
        return { success: true, data: backendData };
      }
      
      return { success: false, error: 'Invalid response format' };
    } catch (error) {
      console.error('Manual load failed:', error);
      setSyncError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Force sync to resolve conflicts
  const forceSync = useCallback(async () => {
    console.log('Force syncing watch history to resolve conflicts');
    return await syncWithBackend(true);
  }, [syncWithBackend]);

  // Force load from backend to resolve conflicts
  const forceLoad = useCallback(async () => {
    console.log('Force loading watch history from backend to resolve conflicts');
    return await loadFromBackend(true);
  }, [loadFromBackend]);

  // Manual refresh function for users to sync from backend
  const refreshFromBackend = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      setIsSyncing(true);
      setSyncError(null);
      
      const response = await userAPI.getWatchHistory();
      if (response.success && response.data.watchHistory) {
        const backendData = response.data.watchHistory;
        
        isUpdatingFromBackend.current = true;
        setWatchHistory(backendData);
        setLastBackendSync(new Date().toISOString());
        console.log('Manually refreshed watch history from backend:', backendData.length, 'items');
        
        // Update localStorage with backend data
        try {
          localStorage.setItem('watchHistory', JSON.stringify(backendData));
        } catch (error) {
          console.error('Error updating localStorage with backend data:', error);
        }
        
        return { success: true, data: backendData };
      }
      
      return { success: false, error: 'Invalid response format' };
    } catch (error) {
      console.error('Manual refresh failed:', error);
      setSyncError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const value = {
    watchHistory,
    isInitialized,
    isSyncing,
    syncError,
    lastBackendSync,
    addToWatchHistory,
    updateWatchHistoryProgress,
    removeFromWatchHistory,
    clearWatchHistory,
    syncWithBackend,
    loadFromBackend,
    forceSync,
    forceLoad,
    refreshFromBackend
  };

  return (
    <WatchHistoryContext.Provider value={value}>
      {children}
    </WatchHistoryContext.Provider>
  );
};
