import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toNumericRating } from '../utils/ratingUtils';
import { useUndoSafe } from './UndoContext';
import { userAPI } from '../services/api';
import { getApiUrl } from '../config/api';
import { useSocket } from './SocketContext';

// Genre mapping for converting TMDB genre IDs to names
const GENRE_MAP = {
  28: 'Action',
  12: 'Adventure', 
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics'
};

const WishlistContext = createContext();

// Helper function to format genres consistently
const formatGenres = (genreData) => {
  if (!genreData) return [];
  
  // If it's already an array of objects with name property, return as is
  if (Array.isArray(genreData) && genreData.length > 0 && typeof genreData[0] === 'object' && genreData[0].name) {
    return genreData;
  }
  
  // If it's an array of genre IDs (numbers), convert to objects
  if (Array.isArray(genreData) && genreData.length > 0 && typeof genreData[0] === 'number') {
    return genreData
      .map(id => ({
        id: id,
        name: GENRE_MAP[id] || `Unknown Genre (${id})`
      }))
      .filter(Boolean);
  }
  
  // If it's an array of strings, convert to objects
  if (Array.isArray(genreData) && genreData.length > 0 && typeof genreData[0] === 'string') {
    return genreData.map((name, index) => ({
      id: index + 1, // Fallback ID
      name: name
    }));
  }
  
  return [];
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

// Safe version that returns null instead of throwing during initialization
export const useWishlistSafe = () => {
  const context = useContext(WishlistContext);
  return context;
};

export const WishlistProvider = ({ children }) => {
  const { socket } = useSocket();
  const [wishlist, setWishlist] = useState(() => {
    // Initialize from localStorage on mount
    try {
      const savedWishlist = localStorage.getItem('wishlist');
      if (savedWishlist) {
        const parsedWishlist = JSON.parse(savedWishlist);
        // Migrate old data that might have genre IDs instead of formatted genres
        return parsedWishlist.map(movie => ({
          ...movie,
          genres: formatGenres(movie.genres || movie.genre_ids || [])
        }));
      }
      return [];
    } catch (error) {
      console.error('Error loading wishlist from localStorage:', error);
      return [];
    }
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [lastBackendSync, setLastBackendSync] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  
  // Refs to track changes and prevent infinite loops
  const isUpdatingFromBackend = useRef(false);
  const pendingChanges = useRef(new Set());
  const lastLocalChange = useRef(null);
  const syncPausedUntil = useRef(0);
  const recentlyRemoved = useRef(new Map()); // id -> timestamp
  const SUPPRESSION_MS = 30000; // 30 seconds suppression to avoid flicker on delete
  const RECENTLY_REMOVED_KEY = 'wishlistRecentlyRemoved';

  // Load persisted recently-removed map from localStorage
  const loadRecentlyRemovedFromStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(RECENTLY_REMOVED_KEY);
      if (!raw) return new Map();
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return new Map(Object.entries(parsed).map(([k, v]) => [Number(k), Number(v)]));
      }
    } catch (e) {
      console.warn('Failed to load recentlyRemoved from storage:', e);
    }
    return new Map();
  }, []);

  const persistRecentlyRemovedToStorage = useCallback(() => {
    try {
      const obj = {};
      recentlyRemoved.current.forEach((v, k) => { obj[k] = v; });
      localStorage.setItem(RECENTLY_REMOVED_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('Failed to persist recentlyRemoved to storage:', e);
    }
  }, []);

  // Initialize recentlyRemoved from storage on mount
  useEffect(() => {
    recentlyRemoved.current = loadRecentlyRemovedFromStorage();

    // Clean up expired entries on mount
    const now = Date.now();
    let changed = false;
    Array.from(recentlyRemoved.current.entries()).forEach(([id, ts]) => {
      if (now - ts >= SUPPRESSION_MS) {
        recentlyRemoved.current.delete(id);
        changed = true;
      }
    });
    if (changed) persistRecentlyRemovedToStorage();
  }, [loadRecentlyRemovedFromStorage, persistRecentlyRemovedToStorage]);

  const isSyncPaused = useCallback(() => {
    return Date.now() < syncPausedUntil.current;
  }, []);

  const pauseSync = useCallback((ms = 5000) => {
    syncPausedUntil.current = Date.now() + ms;
  }, []);

  // Get undo context safely
  const undoContext = useUndoSafe();

  // Merge backend wishlist with local optimistically-updated list to avoid flicker
  const mergeWishlist = useCallback((localList, serverList) => {
    const localById = new Map(localList.map(item => [Number(item.id), item]));
    const serverById = new Map(serverList.map(item => [Number(item.id), item]));

    const result = [];

    // Prefer local items (optimistic source of truth)
    localById.forEach((value, key) => {
      result.push(value);
    });

    // Add any server items missing locally (e.g., added from another device)
    serverById.forEach((value, key) => {
      if (!localById.has(key)) {
        // If there is a pending local removal for this key, skip adding to prevent flicker
        const hasPendingRemove = Array.from(pendingChanges.current).some(id => id.startsWith(`remove_${Number(key)}_`));
        // Also skip if recently removed within suppression window
        const removedAt = recentlyRemoved.current.get(Number(key));
        const withinSuppression = removedAt && (Date.now() - removedAt < SUPPRESSION_MS);
        if (!hasPendingRemove && !withinSuppression) {
          result.push(value);
        }
      }
    });

    return result;
  }, []);

  // Helper: reconcile local wishlist with backend using add/remove (no bulk sync)
  const reconcileWithBackend = React.useCallback(async (localList) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return { success: false, error: 'Not authenticated' };

      const response = await userAPI.getWishlist();
      const serverList = Array.isArray(response?.data?.wishlist) ? response.data.wishlist : [];

      const serverIds = new Set(serverList.map(i => i.id));
      const localIds = new Set(localList.map(i => i.id));

      // Add items missing on server
      for (const item of localList) {
        if (!serverIds.has(item.id)) {
          try {
            await userAPI.addToWishlist(item);
          } catch (e) {
            console.warn('Wishlist reconcile add failed:', item.id, e.message);
          }
        }
      }

      // Remove items not in local
      for (const item of serverList) {
        if (!localIds.has(item.id)) {
          try {
            await userAPI.removeFromWishlist(item.id);
          } catch (e) {
            console.warn('Wishlist reconcile remove failed:', item.id, e.message);
          }
        }
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Define loadFromBackend function that can be reused (auth changes, manual refresh)
  const loadFromBackend = React.useCallback(async () => {
      try {
        // Avoid overwriting local optimistic changes or while sync is paused
        if (pendingChanges.current.size > 0 || isSyncPaused()) {
          console.log('Skipping backend load due to pending changes or paused sync');
          setIsInitialized(true);
          return;
        }
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.log('No access token found, skipping backend wishlist load');
          setIsInitialized(true);
          return;
        }
        
        // Check if token is valid by making a simple auth check using profile endpoint
        try {
          const authCheck = await fetch(`${getApiUrl()}/user/profile`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!authCheck.ok) {
            console.log('Token validation failed, clearing token and skipping backend load');
            localStorage.removeItem('accessToken');
            setIsInitialized(true);
            return;
          }
        } catch (authError) {
          console.log('Token validation error, skipping backend load:', authError);
          setIsInitialized(true);
          return;
        }
        
        setIsSyncing(true);
        setSyncError(null);
        
        const response = await userAPI.getWishlist();
        if (response.success && response.data.wishlist) {
          // Update local state with backend data
          const backendRaw = response.data.wishlist.map(movie => ({
            ...movie,
            id: Number(movie.id),
            genres: formatGenres(movie.genres || [])
          }));
          const SUPPRESSION_MS = 30000; // 30 seconds suppression to avoid flicker on delete
          const backendData = backendRaw.filter(item => {
            const removedAt = recentlyRemoved.current.get(Number(item.id));
            return !(removedAt && (Date.now() - removedAt < SUPPRESSION_MS));
          });
          
          // SAFEGUARD: Check if backend is empty but local storage has data
          if (backendData.length === 0 && wishlist.length > 0) {
            console.log('Backend returned empty wishlist on initial load but local has data. Preserving local data.');
            console.log('Local wishlist has', wishlist.length, 'items');
            
            // Try to restore local data to backend
            try {
              console.log('Attempting to restore local wishlist to backend on initial load (diff-based)');
              await reconcileWithBackend(wishlist);
              console.log('Successfully reconciled local wishlist to backend on initial load');
              setLastBackendSync(new Date().toISOString());
            } catch (syncError) {
              console.error('Failed to reconcile local wishlist to backend on initial load:', syncError);
            }
            
            // Don't overwrite local data
            setIsSyncing(false);
            setIsInitialized(true);
            return;
          }
          
            // Update local state with backend data merged with local to avoid flicker (atomic with localStorage)
            isUpdatingFromBackend.current = true;
            setWishlist(prev => {
              const merged = mergeWishlist(prev, backendData);
              // If merged differs from backendData, attempt to reconcile so other devices receive local additions
              (async () => {
                try {
                  const mergedJson = JSON.stringify(merged);
                  const backendJson = JSON.stringify(backendData);
                  if (mergedJson !== backendJson) {
                    console.log('Merged wishlist differs from backend, attempting reconcile to backend');
                    await reconcileWithBackend(merged);
                    console.log('Reconcile attempt after load completed');
                  }
                } catch (e) {
                  console.warn('Failed to reconcile merged wishlist to backend after load:', e);
                }
              })();

              // Skip if unchanged
              if (JSON.stringify(prev) === JSON.stringify(merged)) {
                return prev;
              }
              try {
                localStorage.setItem('wishlist', JSON.stringify(merged));
              } catch (error) {
                console.error('Error updating localStorage with backend data:', error);
              }
              return merged;
            });
          setLastBackendSync(new Date().toISOString());
          console.log('Loaded wishlist from backend:', backendData.length, 'items');
        } else if (response.success && response.data.wishlist && response.data.wishlist.length === 0) {
          // Backend explicitly returned empty array
          console.log('Backend returned empty wishlist on initial load');
          
          // Only clear local data if it was also empty
          if (wishlist.length === 0) {
            console.log('Local wishlist was already empty, no action needed');
          } else {
            console.log('Backend returned empty wishlist but local has data. This might indicate a backend issue.');
            console.log('Local wishlist has', wishlist.length, 'items - preserving local data');
            
            // Try to restore local data to backend
            try {
              console.log('Attempting to restore local wishlist to backend on initial load (diff-based)');
              await reconcileWithBackend(wishlist);
              console.log('Successfully reconciled local wishlist to backend on initial load');
              setLastBackendSync(new Date().toISOString());
            } catch (syncError) {
              console.error('Failed to reconcile local wishlist to backend on initial load:', syncError);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load wishlist from backend:', error);
        
        // Check if it's an authentication error
        if (error.message && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
          console.log('Authentication error, clearing token and using local data');
          localStorage.removeItem('accessToken');
        }
        
        setSyncError(error.message);
        // Don't show error toast for background loading
      } finally {
        setIsSyncing(false);
        setIsInitialized(true);
      }
  }, [wishlist]);

  // Load wishlist from backend on mount if user is authenticated
  useEffect(() => {
    loadFromBackend();
  }, [loadFromBackend]);

  // Realtime updates via socket
  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      try {
        // Ignore while local pending or paused to avoid overriding optimistic state
        if (pendingChanges.current.size > 0 || isSyncPaused()) {
          console.debug('wishlist socket: update ignored due to pendingChanges or paused sync', {
            pendingCount: pendingChanges.current.size,
            isPaused: isSyncPaused()
          });
          return;
        }
        const backendRaw = Array.isArray(payload?.wishlist) ? payload.wishlist : [];
        console.debug('wishlist socket: received payload', { count: backendRaw.length, payload });
        const backendData = backendRaw.map(movie => ({
          ...movie,
          id: Number(movie.id),
          genres: formatGenres(movie.genres || [])
        }));
        // Log suppression decisions per id
        backendData.forEach(item => {
          const removedAt = recentlyRemoved.current.get(Number(item.id));
          const suppressed = !!(removedAt && (Date.now() - removedAt < SUPPRESSION_MS));
          if (suppressed) {
            console.debug('wishlist socket: suppressing re-insert for id', item.id, { removedAt, ageMs: Date.now() - removedAt });
          }
        });
        isUpdatingFromBackend.current = true;
        setWishlist(prev => {
          const merged = mergeWishlist(prev, backendData);
          if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
          try { localStorage.setItem('wishlist', JSON.stringify(merged)); } catch {}
          return merged;
        });
        setLastBackendSync(new Date().toISOString());
      } catch (e) {
        console.error('Error applying realtime wishlist update:', e);
      }
    };
    socket.on('wishlist:updated', handler);
    return () => {
      socket.off('wishlist:updated', handler);
    };
  }, [socket, mergeWishlist, isSyncPaused]);

  // Save to localStorage whenever wishlist changes
  useEffect(() => {
    if (isInitialized && !isUpdatingFromBackend.current) {
      try {
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        console.log('💾 Saved wishlist to localStorage:', wishlist.length, 'items');
      } catch (error) {
        console.error('Error saving wishlist to localStorage:', error);
      }
    }
  }, [wishlist, isInitialized]);

  // Listen for authentication token changes and reload wishlist
  useEffect(() => {
    let timeoutId = null;
    let authTimeoutId = null;
    
    const handleStorageChange = (e) => {
      if (e.key === 'accessToken') {
        console.log('Auth token changed, reloading wishlist from backend');
        timeoutId = setTimeout(() => {
          loadFromBackend();
        }, 100);
      }
    };

    const handleAuthChange = () => {
      console.log('Auth change detected, reloading wishlist from backend');
      authTimeoutId = setTimeout(() => {
        loadFromBackend();
      }, 100);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-changed', handleAuthChange);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (authTimeoutId) clearTimeout(authTimeoutId);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', handleAuthChange);
    };
  }, [loadFromBackend]);

  // Periodic refresh from backend to catch changes from other devices
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = localStorage.getItem('accessToken');
      if (token && isInitialized && !isSyncing) {
        try {
          // Don't refresh from backend if there are pending local changes or sync is paused
          if (pendingChanges.current.size > 0 || isSyncPaused()) {
            console.log('Skipping periodic wishlist refresh due to pending changes or paused sync');
            return;
          }
          console.log('Performing periodic wishlist refresh from backend');
          const response = await userAPI.getWishlist();
          if (response.success && response.data.wishlist) {
            const backendRaw = response.data.wishlist.map(movie => ({
              ...movie,
              id: Number(movie.id),
              genres: formatGenres(movie.genres || [])
            }));
            // Filter out items that were recently removed locally (suppression window)
            console.debug('wishlist periodic: received backend list', { count: backendRaw.length });
            const backendData = backendRaw.filter(item => {
              const removedAt = recentlyRemoved.current.get(Number(item.id));
              const suppressed = !!(removedAt && (Date.now() - removedAt < SUPPRESSION_MS));
              if (suppressed) {
                console.debug('wishlist periodic: suppressing id from backend update', {
                  id: item.id,
                  removedAt,
                  ageMs: Date.now() - removedAt
                });
              }
              return !(removedAt && (Date.now() - removedAt < SUPPRESSION_MS));
            });
            
            if (backendData.length === 0 && wishlist.length > 0) {
              console.log('Backend returned empty wishlist but local has data. Skipping update to prevent data loss.');
              console.log('Local wishlist has', wishlist.length, 'items');
              try {
                console.log('Attempting to reconcile local wishlist to backend');
                await reconcileWithBackend(wishlist);
                console.log('Successfully reconciled local wishlist to backend');
                setLastBackendSync(new Date().toISOString());
              } catch (syncError) {
                console.error('Failed to reconcile local wishlist to backend:', syncError);
              }
              return;
            }
            
            const currentData = JSON.stringify(wishlist);
            const newData = JSON.stringify(backendData);
            if (currentData !== newData) {
              console.log('Wishlist data changed on backend, updating local state');
              isUpdatingFromBackend.current = true;
              setWishlist(prev => {
                const merged = mergeWishlist(prev, backendData);
                // Skip if unchanged
                if (JSON.stringify(prev) === JSON.stringify(merged)) {
                  return prev;
                }
                try {
                  localStorage.setItem('wishlist', JSON.stringify(merged));
                } catch (error) {
                  console.error('Error updating localStorage with backend data:', error);
                }
                return merged;
              });
              setLastBackendSync(new Date().toISOString());
            }
          }
        } catch (error) {
          console.error('Periodic wishlist refresh failed:', error);
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [wishlist, isInitialized, isSyncing]);

  // Sync to backend when wishlist changes (debounced) using diff-based reconciliation
  useEffect(() => {
    if (!isInitialized || isUpdatingFromBackend.current) return;

    let isMounted = true;

    const syncTimeout = setTimeout(async () => {
      if (!isMounted) return;
      
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        // Do not reconcile while there are pending local changes or sync is paused to avoid flicker
        if (pendingChanges.current.size > 0 || isSyncPaused()) {
          console.log('Skipping wishlist reconcile due to pending changes or paused sync');
          return;
        }

        setIsSyncing(true);
        setSyncError(null);
        console.log('🔄 Reconciling wishlist to backend (diff-based):', wishlist.length, 'items');
        const result = await reconcileWithBackend(wishlist);
        if (result.success) {
          setLastBackendSync(new Date().toISOString());
          console.log('✅ Wishlist reconciled with backend successfully');
        } else if (result.error) {
          console.error('❌ Wishlist reconcile failed:', result.error);
          setSyncError(result.error);
        }
      } catch (error) {
        console.error('❌ Error syncing wishlist to backend:', error);
        setSyncError(error.message);
      } finally {
        if (isMounted) {
          setIsSyncing(false);
        }
      }
    }, 2000); // 2 second delay

    return () => {
      isMounted = false;
      clearTimeout(syncTimeout);
    };
  }, [wishlist, isInitialized]);

  // Add movie to wishlist
  const addToWishlist = useCallback(async (movie) => {
    if (!movie || !movie.id) {
      console.error('Invalid movie data for wishlist:', movie);
      return false;
    }

    // Check if movie is already in wishlist
    if (wishlist.some(item => item.id === movie.id)) {
      console.log('Movie already in wishlist:', movie.title);
      return false;
    }

    try {
      const changeId = `add_${movie.id}_${Date.now()}`;
      pendingChanges.current.add(changeId);
      lastLocalChange.current = Date.now();
      // Format movie data
      const formattedMovie = {
        ...movie,
        id: Number(movie.id),
        title: movie.title || movie.name || movie.original_title || movie.original_name || (movie.media_type === 'tv' ? 'Unknown Series' : 'Unknown Movie'),
        genres: formatGenres(movie.genres || movie.genre_ids || []),
        addedAt: new Date().toISOString()
      };

      // Add to local state and immediately persist to localStorage
      const nextList = [...wishlist.map(i => ({ ...i, id: Number(i.id) })), formattedMovie];
      setWishlist(nextList);
      try {
        localStorage.setItem('wishlist', JSON.stringify(nextList));
      } catch (e) {
        console.error('Error writing wishlist to localStorage on add:', e);
      }
  // Pause backend fetching briefly to avoid race with local optimistic update
  pauseSync(5000);
      
      // Add to undo context
      if (undoContext) {
        undoContext.addAction({
          type: 'ADD_TO_WISHLIST',
          data: { movie: formattedMovie },
          undo: () => removeFromWishlist(formattedMovie.id),
          redo: () => addToWishlist(formattedMovie)
        });
      }

      // Try to add to backend immediately
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          await userAPI.addToWishlist(formattedMovie);
          console.log('✅ Added to wishlist backend:', formattedMovie.title);
          // Clear this pending change after successful backend write
          pendingChanges.current.delete(changeId);
          setLastBackendSync(new Date().toISOString());
          // If no more pending changes, unpause immediately
          if (pendingChanges.current.size === 0) {
            syncPausedUntil.current = Date.now();
          }
        } catch (error) {
          console.error('Failed to add to wishlist backend, will sync later:', error);
        }
      }

      console.log('✅ Added to wishlist:', formattedMovie.title);
      // Cleanup any very old pending changes (fallback)
      const now = Date.now();
      Array.from(pendingChanges.current).forEach(id => {
        const ts = parseInt(id.split('_').pop());
        if (!Number.isNaN(ts) && now - ts > 10000) {
          pendingChanges.current.delete(id);
        }
      });

      return true;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      return false;
    }
  }, [wishlist, undoContext]);

  // Remove movie from wishlist
  const removeFromWishlist = useCallback(async (movieId) => {
    const numericId = Number(movieId);
    const movieToRemove = wishlist.find(item => Number(item.id) === numericId);
    if (!movieToRemove) {
      console.log('Movie not found in wishlist:', movieId);
      return false;
    }

    try {
      const changeId = `remove_${movieId}_${Date.now()}`;
      pendingChanges.current.add(changeId);
      lastLocalChange.current = Date.now();
      // Remove from local state and immediately persist to localStorage
      const nextList = wishlist.filter(item => Number(item.id) !== numericId).map(i => ({ ...i, id: Number(i.id) }));
      setWishlist(nextList);
      try {
        localStorage.setItem('wishlist', JSON.stringify(nextList));
      } catch (e) {
        console.error('Error writing wishlist to localStorage on remove:', e);
      }
      // Pause backend fetching briefly to avoid race with local optimistic update
      pauseSync(3000);
  // Mark as recently removed to suppress re-insert from backend for a short window
  recentlyRemoved.current.set(numericId, Date.now());
  persistRecentlyRemovedToStorage();
  console.debug('wishlist remove: marked recentlyRemoved', { id: numericId, at: recentlyRemoved.current.get(numericId) });
  persistRecentlyRemovedToStorage();
      
      // Add to undo context
      if (undoContext) {
        undoContext.addAction({
          type: 'REMOVE_FROM_WISHLIST',
          data: { movie: movieToRemove },
          undo: () => addToWishlist(movieToRemove),
          redo: () => removeFromWishlist(movieId)
        });
      }

      // Try to remove from backend immediately
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          await userAPI.removeFromWishlist(numericId);
          console.log('✅ Removed from wishlist backend:', movieToRemove.title);
          // Clear this pending change after successful backend write
          pendingChanges.current.delete(changeId);
          setLastBackendSync(new Date().toISOString());
          // If no more pending changes, unpause immediately
          if (pendingChanges.current.size === 0) {
            syncPausedUntil.current = Date.now();
          }
          // Cleanup suppression entry after success
          recentlyRemoved.current.delete(numericId);
          persistRecentlyRemovedToStorage();
        } catch (error) {
          console.error('Failed to remove from wishlist backend, will sync later:', error);
        }
      }

      console.log('✅ Removed from wishlist:', movieToRemove.title);
      // Cleanup any very old pending changes (fallback)
      const now = Date.now();
      Array.from(pendingChanges.current).forEach(id => {
        const ts = parseInt(id.split('_').pop());
        if (!Number.isNaN(ts) && now - ts > 10000) {
          pendingChanges.current.delete(id);
        }
      });

      // Ensure suppression entry eventually expires even if backend never confirms
      setTimeout(() => {
        const removedAt = recentlyRemoved.current.get(numericId);
        if (removedAt && (Date.now() - removedAt >= SUPPRESSION_MS)) {
          recentlyRemoved.current.delete(numericId);
          persistRecentlyRemovedToStorage();
        }
      }, SUPPRESSION_MS + 1000);

      return true;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      return false;
    }
  }, [wishlist, undoContext]);

  // Check if movie is in wishlist
  const isInWishlist = useCallback((movieId) => {
    return wishlist.some(item => item.id === movieId);
  }, [wishlist]);

  // Clear entire wishlist
  const clearWishlist = useCallback(async () => {
    if (wishlist.length === 0) return true;

    try {
      const currentWishlist = [...wishlist];
      
      // Clear local state and immediately persist to localStorage
      setWishlist([]);
      try {
        localStorage.setItem('wishlist', JSON.stringify([]));
      } catch (e) {
        console.error('Error writing wishlist to localStorage on clear:', e);
      }
      
      // Add to undo context
      if (undoContext) {
        undoContext.addAction({
          type: 'CLEAR_WISHLIST',
          data: { wishlist: currentWishlist },
          undo: () => setWishlist(currentWishlist),
          redo: () => setWishlist([])
        });
      }

      // Try to clear backend immediately
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          await userAPI.clearWishlist();
          console.log('✅ Cleared wishlist backend');
        } catch (error) {
          console.error('Failed to clear wishlist backend, will sync later:', error);
        }
      }

      console.log('✅ Cleared wishlist');
      return true;
    } catch (error) {
      console.error('Error clearing wishlist:', error);
      return false;
    }
  }, [wishlist, undoContext]);

  // Move movie to watchlist (transfer from wishlist to watchlist)
  const moveToWatchlist = useCallback(async (movieId) => {
    const movieToMove = wishlist.find(item => item.id === movieId);
    if (!movieToMove) {
      console.log('Movie not found in wishlist:', movieId);
      return false;
    }

    try {
      // Remove from wishlist
      await removeFromWishlist(movieId);
      
      // Note: This would need to be integrated with WatchlistContext
      // For now, we'll just log that it should be moved
      console.log('📝 Movie moved from wishlist to watchlist:', movieToMove.title);
      
      return true;
    } catch (error) {
      console.error('Error moving movie to watchlist:', error);
      return false;
    }
  }, [wishlist, removeFromWishlist]);

  // Get wishlist statistics
  const getWishlistStats = useCallback(() => {
    const total = wishlist.length;
    const movies = wishlist.filter(item => item.media_type !== 'tv').length;
    const tvShows = wishlist.filter(item => item.media_type === 'tv').length;
    
    // Group by genre
    const genreCounts = {};
    wishlist.forEach(item => {
      if (item.genres) {
        item.genres.forEach(genre => {
          genreCounts[genre.name] = (genreCounts[genre.name] || 0) + 1;
        });
      }
    });

    // Sort genres by count
    const sortedGenres = Object.entries(genreCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    return {
      total,
      movies,
      tvShows,
      topGenres: sortedGenres,
      lastUpdated: lastBackendSync
    };
  }, [wishlist, lastBackendSync]);

  // Search within wishlist
  const searchWishlist = useCallback((query) => {
    if (!query || query.trim() === '') return wishlist;
    
    const searchTerm = query.toLowerCase().trim();
    return wishlist.filter(item => 
      item.title?.toLowerCase().includes(searchTerm) ||
      item.original_title?.toLowerCase().includes(searchTerm) ||
      item.overview?.toLowerCase().includes(searchTerm) ||
      item.genres?.some(genre => genre.name.toLowerCase().includes(searchTerm))
    );
  }, [wishlist]);

  // Filter wishlist by various criteria
  const filterWishlist = useCallback((filters = {}) => {
    let filtered = [...wishlist];

    // Filter by media type
    if (filters.mediaType) {
      filtered = filtered.filter(item => item.media_type === filters.mediaType);
    }

    // Filter by genre
    if (filters.genre) {
      filtered = filtered.filter(item => 
        item.genres?.some(genre => genre.name === filters.genre)
      );
    }

    // Filter by rating
    if (filters.minRating) {
      filtered = filtered.filter(item => 
        (item.vote_average || 0) >= filters.minRating
      );
    }

    // Filter by year
    if (filters.year) {
      filtered = filtered.filter(item => {
        const releaseYear = new Date(item.release_date || item.first_air_date).getFullYear();
        return releaseYear === filters.year;
      });
    }

    // Sort
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'title':
            return (a.title || '').localeCompare(b.title || '');
          case 'rating':
            return (b.vote_average || 0) - (a.vote_average || 0);
          case 'date':
            return new Date(b.release_date || b.first_air_date) - new Date(a.release_date || b.first_air_date);
          case 'added':
            return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [wishlist]);

  // Manual sync with backend (diff-based)
  const syncWithBackend = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('No auth token, skipping backend sync');
        return false;
      }

      setIsSyncing(true);
      setSyncError(null);
      
      console.log('🔄 Manual reconcile with backend...');
      const result = await reconcileWithBackend(wishlist);
      
      if (result.success) {
        setLastBackendSync(new Date().toISOString());
        console.log('✅ Manual reconcile completed successfully');
        return true;
      } else {
        console.error('❌ Manual reconcile failed:', result.error || 'Unknown error');
        setSyncError(result.error || 'Unknown error');
        return false;
      }
    } catch (error) {
      console.error('❌ Manual reconcile error:', error);
      setSyncError(error.message);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [wishlist]);

  const value = {
    // State
    wishlist,
    isInitialized,
    lastBackendSync,
    isSyncing,
    syncError,
    
    // Actions
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    moveToWatchlist,
    syncWithBackend,
    loadFromBackend,
    
    // Queries
    isInWishlist,
    getWishlistStats,
    searchWishlist,
    filterWishlist,
    
    // Utilities
    totalItems: wishlist.length,
    isEmpty: wishlist.length === 0
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};
