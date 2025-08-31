import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toNumericRating } from '../utils/ratingUtils';
import { useUndoSafe } from './UndoContext';
import syncService from '../services/syncService';
import { userAPI } from '../services/api';
import { useAuth } from './AuthContext';

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

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const { user } = useAuth();
  const isMountedRef = useRef(true);

  // Get undo context safely
  const undoContext = useUndoSafe();

  // Initialize sync service when user is authenticated
  useEffect(() => {
    if (user && isMountedRef.current) {
      try {
        syncService.init();
        
        // Load watchlist from backend if available
        loadWatchlistFromBackend();
        
        // Set up periodic sync
        const syncInterval = setInterval(() => {
          if (user && navigator.onLine) {
            syncWatchlistWithBackend();
          }
        }, 30000); // Sync every 30 seconds when online
        
        return () => {
          clearInterval(syncInterval);
          syncService.cleanup();
        };
      } catch (error) {
        console.error('Error initializing sync service:', error);
      }
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [user]);

  // Load watchlist from backend
  const loadWatchlistFromBackend = async () => {
    if (!user) return;
    
    try {
      setIsSyncing(true);
      const response = await userAPI.getWatchlist();
      
      if (response.success && response.data.watchlist) {
        const backendWatchlist = response.data.watchlist.map(item => ({
          id: item.tmdbId,
          tmdbId: item.tmdbId,
          title: item.title,
          type: item.type,
          poster_path: item.posterPath,
          backdrop_path: item.backdropPath,
          overview: item.overview,
          release_date: item.releaseDate,
          rating: item.rating,
          genres: item.genres,
          addedAt: item.addedAt
        }));
        
        // Merge with local watchlist, prioritizing backend data
        const mergedWatchlist = mergeWatchlists(watchlist, backendWatchlist);
        setWatchlist(mergedWatchlist);
        
        // Update localStorage with merged data
        localStorage.setItem('watchlist', JSON.stringify(mergedWatchlist));
        
        console.log('Watchlist loaded from backend:', backendWatchlist.length, 'items');
      }
    } catch (error) {
      console.error('Error loading watchlist from backend:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Merge local and backend watchlists
  const mergeWatchlists = (local, backend) => {
    const merged = [...local];
    const localIds = new Set(local.map(item => `${item.id}_${item.type}`));
    
    backend.forEach(backendItem => {
      const key = `${backendItem.id}_${backendItem.type}`;
      if (!localIds.has(key)) {
        merged.push(backendItem);
      }
    });
    
    return merged;
  };

  // Sync watchlist with backend
  const syncWatchlistWithBackend = async () => {
    if (!user || !navigator.onLine) return;
    
    try {
      setIsSyncing(true);
      await syncService.syncWatchlist();
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Error syncing watchlist with backend:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Save watchlist to localStorage and trigger sync
  useEffect(() => {
    // Don't save during initial load
    if (!isMountedRef.current) return;
    
    try {
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
      
      // Trigger sync with backend if user is authenticated
      if (user && navigator.onLine) {
        syncService.queueSync('watchlist');
      }
    } catch (error) {
      console.error('Error saving watchlist to localStorage:', error);
    }
  }, [watchlist, user]);

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

  const addToWatchlist = (movie) => {
    if (!validateMovieData(movie)) {
      console.warn('Invalid movie data, skipping add to watchlist');
      return;
    }

    console.log('Adding movie to watchlist:', movie.title);
    
    setWatchlist(prev => {
      // Check if movie is already in watchlist
      const existingIndex = prev.findIndex(item => item.id === movie.id);
      
      if (existingIndex > -1) {
        console.log('Movie already in watchlist, updating...');
        // Update existing entry
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...movie,
          addedAt: new Date().toISOString()
        };
        return updated;
      }
      
      // Add new movie
      const newMovie = {
        ...movie,
        addedAt: new Date().toISOString()
      };
      
      const newWatchlist = [newMovie, ...prev];
      console.log('New watchlist length:', newWatchlist.length);
      return newWatchlist;
    });

    // Sync will be handled by useEffect after localStorage is updated
  };

  const removeFromWatchlist = useCallback((movieId) => {
    console.log('Removing movie from watchlist:', movieId);
    
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

    // Sync will be handled by useEffect after localStorage is updated
  }, [watchlist, undoContext]);

  // Clear all items from the watchlist
  const clearWatchlist = () => {
    setWatchlist([]);
    // localStorage will be updated by useEffect after state change
  };

  // Restore item to watchlist (for undo functionality)
  const restoreToWatchlist = useCallback((movie) => {
    console.log('Restoring movie to watchlist:', movie.title);
    
    // Check if movie is already in watchlist
    if (watchlist.some(item => item.id === movie.id)) {
      console.log('Movie already in watchlist:', movie.title);
      return;
    }
    
    // Add the movie back to the watchlist
    setWatchlist(prev => [movie, ...prev]);
    
    // Sync will be handled by useEffect after localStorage is updated
  }, [watchlist]);

  const isInWatchlist = (movieId) => {
    return watchlist.some(movie => movie.id === movieId);
  };

  const value = {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    restoreToWatchlist,
    clearWatchlist,
    isInWatchlist,
    isSyncing,
    lastSyncTime,
    syncWatchlistWithBackend
  };

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}; 