import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toNumericRating } from '../utils/ratingUtils';
import { useUndoSafe } from './UndoContext';
import { userAPI } from '../services/api';
import { getApiUrl } from '../config/api';

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

const WatchlistContext = createContext();

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

export const useWatchlist = () => {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
};

// Safe version that returns null instead of throwing during initialization
export const useWatchlistSafe = () => {
  const context = useContext(WatchlistContext);
  return context;
};

export const WatchlistProvider = ({ children }) => {
  const [watchlist, setWatchlist] = useState(() => {
    // Initialize from localStorage on mount
    try {
      const savedWatchlist = localStorage.getItem('watchlist');
      if (savedWatchlist) {
        const parsedWatchlist = JSON.parse(savedWatchlist);
        // Migrate old data that might have genre IDs instead of formatted genres
        return parsedWatchlist.map(movie => ({
          ...movie,
          genres: formatGenres(movie.genres || movie.genre_ids || [])
        }));
      }
      return [];
    } catch (error) {
      console.error('Error loading watchlist from localStorage:', error);
      return [];
    }
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [lastBackendSync, setLastBackendSync] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  // Suppression map to avoid immediate re-inserts after local removals
  const recentlyRemoved = useRef(new Map());
  const SUPPRESSION_MS = 30 * 1000; // 30 seconds
  const RECENTLY_REMOVED_KEY = 'watchlistRecentlyRemoved';
  // Suppress backend-driven removals of newly added items for a short window
  const recentlyAdded = useRef(new Map());
  const RECENTLY_ADDED_KEY = 'watchlistRecentlyAdded';
  
  // Refs to track changes and prevent infinite loops
  const isUpdatingFromBackend = useRef(false);
  const pendingChanges = useRef(new Set());
  const lastLocalChange = useRef(null);

  // Get undo context safely
  const undoContext = useUndoSafe();

  // Define loadFromBackend function that can be used by other useEffects
  const loadFromBackend = useCallback(async (force = false) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('No access token found, skipping backend watchlist load');
        if (!force) setIsInitialized(true);
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
          if (!force) setIsInitialized(true);
          return;
        }
      } catch (authError) {
        console.log('Token validation error, skipping backend load:', authError);
        if (!force) setIsInitialized(true);
        return;
      }
      
      setIsSyncing(true);
      setSyncError(null);
      
      const response = await userAPI.getWatchlist();
      if (response.success && response.data.watchlist) {
        // Update local state with backend data
        const backendData = response.data.watchlist.map(movie => ({
          ...movie,
          genres: formatGenres(movie.genres || [])
        }));
        
        // SAFEGUARD: Check if backend is empty but local storage has data
        if (backendData.length === 0 && watchlist.length > 0) {
          console.log('Backend returned empty watchlist on initial load but local has data. Preserving local data.');
          console.log('Local watchlist has', watchlist.length, 'items');
          
          // Try to restore local data to backend
          try {
            console.log('Attempting to restore local watchlist to backend on initial load');
            await userAPI.syncWatchlist(watchlist);
            console.log('Successfully restored local watchlist to backend on initial load');
            setLastBackendSync(new Date().toISOString());
          } catch (syncError) {
            console.error('Failed to restore local watchlist to backend on initial load:', syncError);
          }
          
          // Don't overwrite local data
          setIsSyncing(false);
          if (!force) setIsInitialized(true);
          return;
        }
        
        // Update local state with backend data
        isUpdatingFromBackend.current = true;
        setWatchlist(backendData);
        setLastBackendSync(new Date().toISOString());
        console.log('Loaded watchlist from backend:', backendData.length, 'items');
        
        // Update localStorage with backend data
        try {
          localStorage.setItem('watchlist', JSON.stringify(backendData));
        } catch (error) {
          console.error('Error updating localStorage with backend data:', error);
        }
      } else if (response.success && response.data.watchlist && response.data.watchlist.length === 0) {
        // Backend explicitly returned empty array
        console.log('Backend returned empty watchlist on initial load');
        
        // Only clear local data if it was also empty
        if (watchlist.length === 0) {
          console.log('Local watchlist was already empty, no action needed');
          setIsSyncing(false);
          if (!force) setIsInitialized(true);
          return;
        } else {
          console.log('Backend returned empty watchlist but local has data. This might indicate a backend issue.');
          console.log('Local watchlist has', watchlist.length, 'items - preserving local data');
          
          // Try to restore local data to backend
          try {
            console.log('Attempting to restore local watchlist to backend on initial load');
            await userAPI.syncWatchlist(watchlist);
            console.log('Successfully restored local watchlist to backend on initial load');
            setLastBackendSync(new Date().toISOString());
          } catch (syncError) {
            console.error('Failed to restore local watchlist to backend on initial load:', syncError);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load watchlist from backend:', error);
      
      // Check if it's an authentication error
      if (error.message && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
        console.log('Authentication error, clearing token and using local data');
        localStorage.removeItem('accessToken');
      }
      
      setSyncError(error.message);
      // Don't show error toast for background loading
    } finally {
      setIsSyncing(false);
      if (!force) setIsInitialized(true);
    }
  }, [watchlist]);

  // Load watchlist from backend on mount if user is authenticated
  useEffect(() => {
    loadFromBackend();
  }, [loadFromBackend]);

  // Enhanced auto-sync with backend whenever watchlist changes
  useEffect(() => {
    // Don't sync during initial load or when updating from backend
    if (!isInitialized || isUpdatingFromBackend.current) {
      isUpdatingFromBackend.current = false;
      return;
    }

    // Don't sync if there are no changes
    if (watchlist.length === 0 && !lastLocalChange.current) {
      return;
    }

    let isMounted = true;

    const autoSyncWithBackend = async () => {
      if (!isMounted) return;
      
      try {
        // Only sync if user is authenticated
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.log('User not authenticated, skipping backend sync');
          return;
        }

        // Check if we have pending changes - but allow sync if they're old
        const now = Date.now();
        const hasRecentChanges = Array.from(pendingChanges.current).some(changeId => {
          const timestamp = parseInt(changeId.split('_').pop());
          return now - timestamp < 2000; // Allow sync if changes are older than 2 seconds
        });
        
        if (pendingChanges.current.size > 0 && hasRecentChanges) {
          console.log('Skipping sync due to recent pending changes:', pendingChanges.current.size);
          return;
        }

        setIsSyncing(true);
        setSyncError(null);
        
        await userAPI.syncWatchlist(watchlist);
        setLastBackendSync(new Date().toISOString());
        console.log('Watchlist automatically synced with backend');
        
        // Clear any old pending changes after successful sync
        const oldChanges = Array.from(pendingChanges.current).filter(changeId => {
          const timestamp = parseInt(changeId.split('_').pop());
          return now - timestamp > 2000; // Remove changes older than 2 seconds
        });
        oldChanges.forEach(changeId => pendingChanges.current.delete(changeId));
        
      } catch (error) {
        console.error('Auto-sync failed:', error);
        setSyncError(error.message);
        // Don't show error toast for auto-sync failures
      } finally {
        if (isMounted) {
          setIsSyncing(false);
        }
      }
    };

    // Debounce the sync to avoid too many API calls
    const syncTimeout = setTimeout(autoSyncWithBackend, 1500);
    
    return () => {
      isMounted = false;
      clearTimeout(syncTimeout);
    };
  }, [watchlist, isInitialized]);

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
      lastLocalChange.current = new Date().toISOString(); // Update ref with current state
      console.log('Watchlist state changed, saved to localStorage:', watchlist.length, 'items');
    } catch (error) {
      console.error('Error saving watchlist to localStorage:', error);
    }
  }, [watchlist, isInitialized]);

  // Persist recentlyRemoved map to localStorage so suppression survives reloads/tabs
  useEffect(() => {
    try {
      const obj = {};
      recentlyRemoved.current.forEach((ts, id) => { obj[id] = ts; });
      localStorage.setItem(RECENTLY_REMOVED_KEY, JSON.stringify(obj));
    } catch (e) {
      // ignore
    }
  }, [watchlist]);

  // Persist recentlyAdded map to localStorage so suppression survives reloads/tabs
  useEffect(() => {
    try {
      const obj = {};
      recentlyAdded.current.forEach((ts, id) => { obj[id] = ts; });
      localStorage.setItem(RECENTLY_ADDED_KEY, JSON.stringify(obj));
    } catch (e) {
      // ignore
    }
  }, [watchlist]);

  // Load persisted suppression map on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTLY_REMOVED_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.keys(parsed).forEach(k => {
          const ts = parsed[k];
          if (Date.now() - ts < SUPPRESSION_MS * 2) { // keep if reasonably recent
            recentlyRemoved.current.set(k, ts);
          }
        });
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Load persisted recentlyAdded map on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTLY_ADDED_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.keys(parsed).forEach(k => {
          const ts = parsed[k];
          if (Date.now() - ts < SUPPRESSION_MS * 2) {
            recentlyAdded.current.set(k, ts);
          }
        });
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Periodically purge old suppression entries
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      let changed = false;
      recentlyRemoved.current.forEach((ts, key) => {
        if (now - ts > SUPPRESSION_MS * 2) {
          recentlyRemoved.current.delete(key);
          changed = true;
        }
      });
      recentlyAdded.current.forEach((ts, key) => {
        if (now - ts > SUPPRESSION_MS * 2) {
          recentlyAdded.current.delete(key);
          changed = true;
        }
      });
      if (changed) {
        try {
          const obj = {};
          recentlyRemoved.current.forEach((ts, id) => { obj[id] = ts; });
          localStorage.setItem(RECENTLY_REMOVED_KEY, JSON.stringify(obj));
          const added = {};
          recentlyAdded.current.forEach((ts, id) => { added[id] = ts; });
          localStorage.setItem(RECENTLY_ADDED_KEY, JSON.stringify(added));
        } catch (e) {
          // ignore
        }
      }
    }, SUPPRESSION_MS);

    return () => clearInterval(id);
  }, []);

  // Listen for authentication token changes and reload watchlist
  useEffect(() => {
    let timeoutId = null;
    let authTimeoutId = null;
    
    const handleStorageChange = (e) => {
      if (e.key === 'accessToken') {
        console.log('Auth token changed (storage), updating watchlist state');
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.log('Access token removed - clearing local watchlist');
          setWatchlist([]);
          setIsInitialized(true);
          return;
        }

        // Small delay to ensure the token is properly set
        timeoutId = setTimeout(() => {
          loadFromBackend();
        }, 100);
      }
    };

    // Listen for storage events (for cross-tab communication)
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom auth events
    const handleAuthChange = () => {
      console.log('Auth change detected (custom event), updating watchlist state');
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('Access token removed via auth-changed - clearing local watchlist');
        setWatchlist([]);
        setIsInitialized(true);
        return;
      }

      authTimeoutId = setTimeout(() => {
        loadFromBackend();
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
  }, [loadFromBackend]);

  // Periodic refresh from backend (every 30 seconds) to catch changes from other devices
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = localStorage.getItem('accessToken');
      if (token && isInitialized && !isSyncing) {
        try {
          console.log('Performing periodic watchlist refresh from backend');
          const response = await userAPI.getWatchlist();
          if (response.success && response.data.watchlist) {
            const backendData = response.data.watchlist.map(movie => ({
              ...movie,
              genres: formatGenres(movie.genres || [])
            }));
            
            // SAFEGUARD: Don't overwrite local data if backend is empty but local has data
            if (backendData.length === 0 && watchlist.length > 0) {
              console.log('Backend returned empty watchlist but local has data. Skipping update to prevent data loss.');
              console.log('Local watchlist has', watchlist.length, 'items');
              
              // Instead of clearing local data, try to sync local data to backend
              try {
                console.log('Attempting to restore local watchlist to backend');
                await userAPI.syncWatchlist(watchlist);
                console.log('Successfully restored local watchlist to backend');
                setLastBackendSync(new Date().toISOString());
              } catch (syncError) {
                console.error('Failed to restore local watchlist to backend:', syncError);
              }
              return;
            }
            
            // Only update if the data is different
            const currentData = JSON.stringify(watchlist);
            const newData = JSON.stringify(backendData);
            
            if (currentData !== newData) {
              console.log('Watchlist data changed on backend, updating local state');
              // Start from backend data, but suppress re-inserts of recently removed
              // and ensure we keep any recentlyAdded items locally until backend catches up
              const filteredBackend = backendData.filter(item => {
                const removedTs = recentlyRemoved.current.get(String(item.id));
                if (removedTs && (Date.now() - removedTs) < SUPPRESSION_MS) {
                  console.log('⛔ Suppressing re-insert of recently removed item from backend:', item.id);
                  return false;
                }
                return true;
              });

              // Rehydrate recentlyAdded items that may not yet be on backend
              const localAddedItems = [];
              recentlyAdded.current.forEach((ts, id) => {
                if ((Date.now() - ts) < SUPPRESSION_MS) {
                  // If item is not present in filteredBackend, try to find it in local watchlist and add it back
                  const exists = filteredBackend.some(i => String(i.id) === String(id));
                  if (!exists) {
                    const localItem = watchlist.find(i => String(i.id) === String(id));
                    if (localItem) {
                      localAddedItems.push(localItem);
                      console.log('✨ Preserving recently added local item until backend updates:', id);
                    }
                  }
                }
              });

              const merged = [...localAddedItems, ...filteredBackend.filter(b => !localAddedItems.some(l => l.id === b.id))];

              isUpdatingFromBackend.current = true;
              setWatchlist(merged);
              setLastBackendSync(new Date().toISOString());
              
              // Update localStorage with backend data
              try {
                localStorage.setItem('watchlist', JSON.stringify(backendData));
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
  }, [watchlist, isInitialized, isSyncing]);

  const validateMovieData = (movie) => {
    // Ensure all required fields are present
    const requiredFields = ['id', 'title'];
    const missingFields = requiredFields.filter(field => !movie[field]);
    
    if (missingFields.length > 0) {
      console.warn('Missing required fields in movie data:', missingFields);
      return false;
    }
    
    // Check if we have at least one image field (poster_path, poster, or backdrop_path, backdrop)
    const hasImage = movie.poster_path || movie.poster || movie.backdrop_path || movie.backdrop;
    if (!hasImage) {
      console.warn('Movie has no image data');
      return false;
    }
    
    return true;
  };

  const addToWatchlist = async (movie) => {
    console.log('🎬 Attempting to add movie to watchlist:', movie);
    
    // Validate movie data
    if (!validateMovieData(movie)) {
      console.error('❌ Invalid movie data, cannot add to watchlist');
      return;
    }

    // Mark this change as pending
    const changeId = `add_${movie.id}_${Date.now()}`;
    pendingChanges.current.add(changeId);
    console.log('📝 Added pending change for addition:', changeId, 'Total pending:', pendingChanges.current.size);

    // Format movie data to ensure all necessary fields are present
    const formattedMovie = {
      id: movie.id,
      title: movie.title || movie.name || movie.original_title || movie.original_name || (movie.media_type === 'tv' ? 'Unknown Series' : 'Unknown Movie'),
      poster_path: movie.poster_path || movie.poster,
      backdrop_path: movie.backdrop_path || movie.backdrop,
      overview: movie.overview || '',
      type: movie.media_type || movie.type || 'movie',
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : 
            movie.first_air_date ? new Date(movie.first_air_date).getFullYear() : 
            movie.year || 'N/A',
      rating: toNumericRating(movie.vote_average || movie.rating, 0),
      genres: formatGenres(movie.genre_ids || movie.genres),
      release_date: movie.release_date || movie.first_air_date,
      duration: movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : 
               movie.episode_run_time ? `${Math.floor(movie.episode_run_time[0] / 60)}h ${movie.episode_run_time[0] % 60}m` : 
               movie.duration || 'N/A',
      director: movie.director,
      cast: movie.cast || [],
      addedAt: new Date().toISOString()
    };
    
    console.log('🎬 Formatted movie data:', formattedMovie);

    // Update local state immediately (like viewing progress does)
    setWatchlist(prev => {
      // Check if movie is already in watchlist
      if (prev.some(item => item.id === movie.id)) {
        console.log('⚠️ Movie already in watchlist:', movie.title);
        pendingChanges.current.delete(changeId);
        return prev;
      }
      
      // Add the new movie at the beginning of the list
      const newWatchlist = [formattedMovie, ...prev];
      // Mark as recently added to prevent backend refresh from removing it briefly
      try {
        recentlyAdded.current.set(String(formattedMovie.id), Date.now());
        const obj = {};
        recentlyAdded.current.forEach((ts, id) => { obj[id] = ts; });
        localStorage.setItem(RECENTLY_ADDED_KEY, JSON.stringify(obj));
        console.log('✨ Marked recently added:', formattedMovie.id);
      } catch (e) {
        // ignore
      }
      console.log('✅ Added movie to watchlist:', formattedMovie.title);
      console.log('📊 New watchlist length:', newWatchlist.length);
      return newWatchlist;
    });

    // Ensure backend sync happens for addition
    try {
      const token = localStorage.getItem('accessToken');

      if (token) {
        // Get the updated watchlist after addition - calculate it directly
        const updatedWatchlist = [formattedMovie, ...watchlist];
        console.log('🔄 Syncing to backend:', updatedWatchlist.length, 'items');
        console.log('🔄 First item:', updatedWatchlist[0]?.title);
        
        const syncResult = await userAPI.syncWatchlist(updatedWatchlist);
        console.log('✅ Watchlist synced to backend after addition:', syncResult);
        setLastBackendSync(new Date().toISOString());
      } else {
        console.warn('⚠️ No access token found, skipping backend sync');
      }
    } catch (error) {
      console.error('❌ Failed to sync addition to backend:', error);
      setSyncError(error.message);
    } finally {
      // Remove the pending change after sync attempt
      setTimeout(() => {
        pendingChanges.current.delete(changeId);
        console.log('🗑️ Removed pending change for addition:', changeId);
      }, 100);
    }
  };

  const removeFromWatchlist = useCallback(async (movieId) => {
    console.log('🗑️ Removing movie from watchlist:', movieId);
    
    // Mark this change as pending
    const changeId = `remove_${movieId}_${Date.now()}`;
    pendingChanges.current.add(changeId);
    console.log('📝 Added pending change for removal:', changeId, 'Total pending:', pendingChanges.current.size);
    
    // Find the movie to be removed for undo functionality
    const movieToRemove = watchlist.find(movie => movie.id === movieId);
    
    // Update local state immediately (like viewing progress does)
    setWatchlist(prev => {
      const newWatchlist = prev.filter(movie => movie.id !== movieId);
      // Mark as recently removed to prevent immediate re-insert from backend
      try {
        recentlyRemoved.current.set(String(movieId), Date.now());
        // persist
        const obj = {};
        recentlyRemoved.current.forEach((ts, id) => { obj[id] = ts; });
        localStorage.setItem(RECENTLY_REMOVED_KEY, JSON.stringify(obj));
        console.log('🛡️ Marked recently removed:', movieId);
      } catch (e) {
        // ignore
      }
      console.log('📊 Updated watchlist length:', newWatchlist.length);
      return newWatchlist;
    });

    // Add to undo context if undo is available
    if (undoContext && movieToRemove) {
      undoContext.addDeletedItem('watchlist', movieToRemove);
    }

    // Ensure backend sync happens for removal
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        // Get the updated watchlist after removal - calculate it directly
        const updatedWatchlist = watchlist.filter(movie => movie.id !== movieId);
        console.log('🔄 Syncing removal to backend:', updatedWatchlist.length, 'items remaining');
        
        const syncResult = await userAPI.syncWatchlist(updatedWatchlist);
        console.log('✅ Watchlist synced to backend after removal:', syncResult);
        setLastBackendSync(new Date().toISOString());
      } else {
        console.warn('⚠️ No access token found, skipping backend sync');
      }
    } catch (error) {
      console.error('❌ Failed to sync removal to backend:', error);
      setSyncError(error.message);
    } finally {
      // Remove the pending change after sync attempt
      setTimeout(() => {
        pendingChanges.current.delete(changeId);
        console.log('🗑️ Removed pending change for removal:', changeId);
      }, 100);
    }
  }, [watchlist, undoContext]);

  // Clear all items from the watchlist
  const clearWatchlist = async () => {
    // Mark this change as pending
    const changeId = `clear_${Date.now()}`;
    pendingChanges.current.add(changeId);
    
    setWatchlist([]);
    
    try {
      localStorage.setItem('watchlist', JSON.stringify([]));
    } catch (error) {
      console.error('Error clearing watchlist from localStorage:', error);
    }

    // Ensure backend sync happens for clearing
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        await userAPI.syncWatchlist([]);
        console.log('Watchlist synced to backend after clearing');
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
  };

  // Restore item to watchlist (for undo functionality)
  const restoreToWatchlist = useCallback(async (movie) => {
    console.log('Restoring movie to watchlist:', movie.title);
    
    // Check if movie is already in watchlist
    if (watchlist.some(item => item.id === movie.id)) {
      console.log('Movie already in watchlist:', movie.title);
      return;
    }
    
    // Mark this change as pending
    const changeId = `restore_${movie.id}_${Date.now()}`;
    pendingChanges.current.add(changeId);
    
    // Add the movie back to the watchlist
    setWatchlist(prev => {
      const newWatchlist = [movie, ...prev];
      return newWatchlist;
    });

    // Ensure backend sync happens for restoration
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        // Get the updated watchlist after restoration
        const updatedWatchlist = [movie, ...watchlist];
        await userAPI.syncWatchlist(updatedWatchlist);
        console.log('Watchlist synced to backend after restoration');
        setLastBackendSync(new Date().toISOString());
      }
    } catch (error) {
      console.error('Failed to sync restoration to backend:', error);
      setSyncError(error.message);
    } finally {
      // Remove the pending change after sync attempt
      setTimeout(() => {
        pendingChanges.current.delete(changeId);
        console.log('Removed pending change for restoration:', changeId);
      }, 100);
    }
  }, [watchlist]);

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
      
      await userAPI.syncWatchlist(watchlist);
      setLastBackendSync(new Date().toISOString());
      console.log('Watchlist manually synced with backend');
      
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
  }, [watchlist]);


  // Force sync to resolve conflicts
  const forceSync = useCallback(async () => {
    console.log('Force syncing watchlist to resolve conflicts');
    return await syncWithBackend(true);
  }, [syncWithBackend]);

  // Force load from backend to resolve conflicts
  const forceLoad = useCallback(async () => {
    console.log('Force loading watchlist from backend to resolve conflicts');
    return await loadFromBackend(true);
  }, [loadFromBackend]);

  // Debug function to check pending changes
  const debugPendingChanges = useCallback(() => {
    console.log('Current pending changes:', Array.from(pendingChanges.current));
    console.log('Pending changes count:', pendingChanges.current.size);
    console.log('Last local change:', lastLocalChange.current);
    console.log('Last backend sync:', lastBackendSync);
    console.log('Is syncing:', isSyncing);
    console.log('Is initialized:', isInitialized);
  }, [lastBackendSync, isSyncing, isInitialized]);

  // Function to restore watchlist from localStorage if it gets cleared
  const restoreFromLocalStorage = useCallback(async () => {
    try {
      const savedWatchlist = localStorage.getItem('watchlist');
      if (savedWatchlist) {
        const parsedWatchlist = JSON.parse(savedWatchlist);
        if (parsedWatchlist.length > 0) {
          console.log('Restoring watchlist from localStorage:', parsedWatchlist.length, 'items');
          
          // Format the data to ensure consistency
          const formattedWatchlist = parsedWatchlist.map(movie => ({
            ...movie,
            genres: formatGenres(movie.genres || movie.genre_ids || [])
          }));
          
          setWatchlist(formattedWatchlist);
          
          // Try to sync to backend
          try {
            const token = localStorage.getItem('accessToken');
            if (token) {
              await userAPI.syncWatchlist(formattedWatchlist);
              console.log('Successfully synced restored watchlist to backend');
              setLastBackendSync(new Date().toISOString());
            }
          } catch (syncError) {
            console.error('Failed to sync restored watchlist to backend:', syncError);
          }
          
          return { success: true, data: formattedWatchlist, message: 'Watchlist restored from localStorage' };
        }
      }
      
      return { success: false, error: 'No saved watchlist found in localStorage' };
    } catch (error) {
      console.error('Failed to restore from localStorage:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Function to log current watchlist state for debugging
  const logWatchlistState = useCallback(() => {
    console.log('=== WATCHLIST STATE DEBUG ===');
    console.log('Current watchlist length:', watchlist.length);
    console.log('LocalStorage watchlist length:', (() => {
      try {
        const saved = localStorage.getItem('watchlist');
        return saved ? JSON.parse(saved).length : 'No data';
      } catch (e) {
        return 'Error parsing';
      }
    })());
    console.log('Is initialized:', isInitialized);
    console.log('Is syncing:', isSyncing);
    console.log('Last backend sync:', lastBackendSync);
    console.log('Pending changes:', Array.from(pendingChanges.current));
    console.log('Last local change:', lastLocalChange.current);
    console.log('Is updating from backend:', isUpdatingFromBackend.current);
    console.log('Current watchlist items:', watchlist.map(item => ({ id: item.id, title: item.title })));
    console.log('================================');
  }, [watchlist, isInitialized, isSyncing, lastBackendSync, lastLocalChange]);

  // Manual refresh function for users to sync from backend
  const refreshFromBackend = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      setIsSyncing(true);
      setSyncError(null);
      
      const response = await userAPI.getWatchlist();
      if (response.success && response.data.watchlist) {
        const backendData = response.data.watchlist.map(movie => ({
          ...movie,
          genres: formatGenres(movie.genres || [])
        }));
        
        // SAFEGUARD: Don't overwrite local data if backend is empty but local has data
        if (backendData.length === 0 && watchlist.length > 0) {
          console.log('Backend returned empty watchlist on manual refresh but local has data. Preserving local data.');
          console.log('Local watchlist has', watchlist.length, 'items');
          
          // Try to restore local data to backend
          try {
            console.log('Attempting to restore local watchlist to backend on manual refresh');
            await userAPI.syncWatchlist(watchlist);
            console.log('Successfully restored local watchlist to backend on manual refresh');
            setLastBackendSync(new Date().toISOString());
          } catch (syncError) {
            console.error('Failed to restore local watchlist to backend on manual refresh:', syncError);
          }
          
          return { success: true, data: watchlist, message: 'Backend was empty, preserved local data' };
        }
        
        isUpdatingFromBackend.current = true;
        setWatchlist(backendData);
        setLastBackendSync(new Date().toISOString());
        console.log('Manually refreshed watchlist from backend:', backendData.length, 'items');
        
        // Update localStorage with backend data
        try {
          localStorage.setItem('watchlist', JSON.stringify(backendData));
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

  const isInWatchlist = (movieId) => {
    return watchlist.some(movie => movie.id === movieId);
  };

  const value = {
    watchlist,
    isInitialized,
    isSyncing,
    syncError,
    lastBackendSync,
    addToWatchlist,
    removeFromWatchlist,
    restoreToWatchlist,
    clearWatchlist,
    isInWatchlist,
    syncWithBackend,
    loadFromBackend,
    forceSync,
    forceLoad,
    debugPendingChanges,
    refreshFromBackend,
    restoreFromLocalStorage,
    logWatchlistState
  };

  // Expose context functions globally for debugging (only in development)
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    window.watchlistContext = value;
    console.log('🔧 Watchlist context exposed globally for debugging');
    console.log('Available functions:', Object.keys(value).filter(key => typeof value[key] === 'function'));
  }

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}; 