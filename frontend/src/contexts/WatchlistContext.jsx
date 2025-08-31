import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toNumericRating } from '../utils/ratingUtils';
import { useUndoSafe } from './UndoContext';
import { userAPI } from '../services/api';

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
  
  // Refs to track changes and prevent infinite loops
  const isUpdatingFromBackend = useRef(false);
  const pendingChanges = useRef(new Set());
  const lastLocalChange = useRef(null);

  // Get undo context safely
  const undoContext = useUndoSafe();

  // Load watchlist from backend on mount if user is authenticated
  useEffect(() => {
    const loadFromBackend = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          setIsSyncing(true);
          setSyncError(null);
          
          const response = await userAPI.getWatchlist();
          if (response.success && response.data.watchlist) {
            // Update local state with backend data
            const backendData = response.data.watchlist.map(movie => ({
              ...movie,
              genres: formatGenres(movie.genres || [])
            }));
            
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
          }
        }
      } catch (error) {
        console.error('Failed to load watchlist from backend:', error);
        setSyncError(error.message);
        // Don't show error toast for background loading
      } finally {
        setIsSyncing(false);
        setIsInitialized(true);
      }
    };

    loadFromBackend();
  }, []);

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

    const autoSyncWithBackend = async () => {
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
        setIsSyncing(false);
      }
    };

    // Debounce the sync to avoid too many API calls
    const syncTimeout = setTimeout(autoSyncWithBackend, 1500);
    
    return () => clearTimeout(syncTimeout);
  }, [watchlist, isInitialized]);

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
      lastLocalChange.current = new Date().toISOString();
    } catch (error) {
      console.error('Error saving watchlist to localStorage:', error);
    }
  }, [watchlist, isInitialized]);

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
    console.log('Attempting to add movie to watchlist:', movie);
    
    // Validate movie data
    if (!validateMovieData(movie)) {
      console.error('Invalid movie data, cannot add to watchlist');
      return;
    }

    // Mark this change as pending
    const changeId = `add_${movie.id}_${Date.now()}`;
    pendingChanges.current.add(changeId);
    console.log('Added pending change for addition:', changeId, 'Total pending:', pendingChanges.current.size);

    // Format movie data to ensure all necessary fields are present
    const formattedMovie = {
      id: movie.id,
      title: movie.title || movie.name,
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
    
    console.log('Formatted movie data:', formattedMovie);

    setWatchlist(prev => {
      // Check if movie is already in watchlist
      if (prev.some(item => item.id === movie.id)) {
        console.log('Movie already in watchlist:', movie.title);
        pendingChanges.current.delete(changeId);
        return prev;
      }
      
      // Add the new movie at the beginning of the list
      const newWatchlist = [formattedMovie, ...prev];
      console.log('Added movie to watchlist:', formattedMovie.title);
      console.log('New watchlist length:', newWatchlist.length);
      return newWatchlist;
    });

    // Ensure backend sync happens for addition
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        // Get the updated watchlist after addition
        const updatedWatchlist = [formattedMovie, ...watchlist];
        await userAPI.syncWatchlist(updatedWatchlist);
        console.log('Watchlist synced to backend after addition');
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
  };

  const removeFromWatchlist = useCallback(async (movieId) => {
    console.log('Removing movie from watchlist:', movieId);
    
    // Mark this change as pending
    const changeId = `remove_${movieId}_${Date.now()}`;
    pendingChanges.current.add(changeId);
    console.log('Added pending change for removal:', changeId, 'Total pending:', pendingChanges.current.size);
    
    // Find the movie to be removed for undo functionality
    const movieToRemove = watchlist.find(movie => movie.id === movieId);
    
    setWatchlist(prev => {
      const newWatchlist = prev.filter(movie => movie.id !== movieId);
      console.log('Updated watchlist length:', newWatchlist.length);
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
        // Get the updated watchlist after removal
        const updatedWatchlist = watchlist.filter(movie => movie.id !== movieId);
        await userAPI.syncWatchlist(updatedWatchlist);
        console.log('Watchlist synced to backend after removal');
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
      
      const response = await userAPI.getWatchlist();
      if (response.success && response.data.watchlist) {
        const backendData = response.data.watchlist.map(movie => ({
          ...movie,
          genres: formatGenres(movie.genres || [])
        }));
        
        isUpdatingFromBackend.current = true;
        setWatchlist(backendData);
        setLastBackendSync(new Date().toISOString());
        console.log('Watchlist manually loaded from backend:', backendData.length, 'items');
        
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
      console.error('Manual load failed:', error);
      setSyncError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsSyncing(false);
    }
  }, []);

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
    debugPendingChanges
  };

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}; 