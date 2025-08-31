import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toNumericRating } from '../utils/ratingUtils';
import { useUndoSafe } from './UndoContext';
import { useWatchData } from '../hooks/useWatchData';
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

const EnhancedWatchlistContext = createContext();

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

// Validate movie data before adding to watchlist
const validateMovieData = (movie) => {
  if (!movie || !movie.id) {
    console.error('Movie data is missing or invalid:', movie);
    return false;
  }
  
  if (!movie.title && !movie.name) {
    console.error('Movie is missing title and name:', movie);
    return false;
  }
  
  return true;
};

export const useEnhancedWatchlist = () => {
  const context = useContext(EnhancedWatchlistContext);
  if (!context) {
    throw new Error('useEnhancedWatchlist must be used within an EnhancedWatchlistProvider');
  }
  return context;
};

// Safe version that returns null instead of throwing during initialization
export const useEnhancedWatchlistSafe = () => {
  const context = useContext(EnhancedWatchlistContext);
  return context;
};

// Backward compatibility: Export the same hook names as the original context
export const useWatchlist = useEnhancedWatchlist;
export const useWatchlistSafe = useEnhancedWatchlistSafe;

export const EnhancedWatchlistProvider = ({ children }) => {
  // Use auth context for authentication state
  const { user, isAuthenticated: authIsAuthenticated } = useAuth();
  
  // Use our enhanced backend hook
  const {
    watchlist: backendWatchlist,
    watchHistory,
    watchStats,
    addToWatchlist: backendAddToWatchlist,
    removeFromWatchlist: backendRemoveFromWatchlist,
    updateWatchHistory: backendUpdateWatchHistory,
    isInWatchlist: backendIsInWatchlist,
    getContentIdFromWatchlist,
    loading: backendLoading,
    error: backendError,
    isInitialized: backendInitialized,
    isUserAuthenticated
  } = useWatchData();

  // Local state for backward compatibility
  const [localWatchlist, setLocalWatchlist] = useState(() => {
    try {
      const savedWatchlist = localStorage.getItem('watchlist');
      if (savedWatchlist) {
        const parsedWatchlist = JSON.parse(savedWatchlist);
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

  // Determine which watchlist to use
  const isAuthenticated = authIsAuthenticated && !!user;
  const watchlist = isAuthenticated && backendInitialized ? backendWatchlist : localWatchlist;
  const isBackendEnabled = isAuthenticated && backendInitialized;

  // Debug logging for authentication state
  useEffect(() => {
    console.log('🔐 EnhancedWatchlistContext - Auth State:', {
      isAuthenticated,
      authIsAuthenticated,
      user: !!user,
      backendInitialized,
      isBackendEnabled,
      backendWatchlistLength: backendWatchlist?.length || 0,
      localWatchlistLength: localWatchlist?.length || 0
    });
  }, [isAuthenticated, authIsAuthenticated, user, backendInitialized, isBackendEnabled, backendWatchlist, localWatchlist]);

  // Monitor authentication changes and trigger backend operations
  useEffect(() => {
    if (isAuthenticated && !backendInitialized) {
      console.log('🔄 User authenticated, waiting for backend initialization...');
    } else if (isAuthenticated && backendInitialized) {
      console.log('✅ User authenticated and backend ready, using backend system');
    } else if (!isAuthenticated) {
      console.log('⚠️ User not authenticated, using local storage system');
    }
  }, [isAuthenticated, backendInitialized]);

  // Undo context
  const undoContext = useUndoSafe();

  // Migrate local watchlist to backend when user authenticates
  useEffect(() => {
    if (isAuthenticated && backendInitialized && localWatchlist.length > 0) {
      console.log('🔄 Migrating local watchlist to backend...');
      
      const migrateToBackend = async () => {
        try {
          for (const movie of localWatchlist) {
            // Check if already in backend watchlist
            if (!backendIsInWatchlist(movie.id, movie.type || 'movie')) {
              console.log(`📝 Migrating: ${movie.title}`);
              await backendAddToWatchlist(movie);
            }
          }
          
          // Clear local watchlist after successful migration
          setLocalWatchlist([]);
          localStorage.removeItem('watchlist');
          console.log('✅ Local watchlist migration completed');
        } catch (error) {
          console.error('❌ Error migrating watchlist:', error);
        }
      };

      migrateToBackend();
    }
  }, [isAuthenticated, backendInitialized, localWatchlist, backendIsInWatchlist, backendAddToWatchlist]);

  // Enhanced add to watchlist function
  const addToWatchlist = useCallback(async (movie) => {
    console.log('➕ Adding movie to watchlist:', movie.title || movie.name);
    console.log('🔍 Current state:', { isBackendEnabled, isAuthenticated, backendInitialized });
    
    // Validate movie data
    if (!validateMovieData(movie)) {
      console.error('Invalid movie data, cannot add to watchlist');
      return false;
    }

    try {
      if (isBackendEnabled) {
        console.log('🚀 Using backend system for watchlist');
        // Use backend system
        const result = await backendAddToWatchlist(movie);
        console.log('✅ Backend add result:', result);
        return true;
      } else {
        console.log('💾 Using local storage system for watchlist');
        // Use local storage system
        setLocalWatchlist(prev => {
          // Check if movie is already in watchlist
          if (prev.some(item => item.id === movie.id)) {
            console.log('Movie already in local watchlist:', movie.title);
            return prev;
          }
          
          // Format movie data
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
          
          const newWatchlist = [formattedMovie, ...prev];
          
          // Save to localStorage
          try {
            localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
          } catch (error) {
            console.error('Error saving to localStorage:', error);
          }
          
          return newWatchlist;
        });
        
        console.log('✅ Added to local watchlist');
        return true;
      }
    } catch (error) {
      console.error('❌ Error adding to watchlist:', error);
      return false;
    }
  }, [isBackendEnabled, backendAddToWatchlist, isAuthenticated, backendInitialized]);

  // Enhanced remove from watchlist function
  const removeFromWatchlist = useCallback(async (movieId) => {
    console.log('🗑️ Removing movie from watchlist:', movieId);
    
    try {
      if (isBackendEnabled) {
        // Use backend system
        const contentId = getContentIdFromWatchlist(movieId, 'movie'); // Default to movie type
        if (contentId) {
          await backendRemoveFromWatchlist(contentId);
          console.log('✅ Removed from backend watchlist');
        } else {
          console.warn('⚠️ Content ID not found for movie:', movieId);
        }
      } else {
        // Use local storage system
        const movieToRemove = localWatchlist.find(movie => movie.id === movieId);
        
        setLocalWatchlist(prev => {
          const newWatchlist = prev.filter(movie => movie.id !== movieId);
          
          // Save to localStorage
          try {
            localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
          } catch (error) {
            console.error('Error saving to localStorage:', error);
          }
          
          return newWatchlist;
        });

        // Add to undo context if undo is available
        if (undoContext && movieToRemove) {
          undoContext.addDeletedItem('watchlist', movieToRemove);
        }
        
        console.log('✅ Removed from local watchlist');
      }
    } catch (error) {
      console.error('❌ Error removing from watchlist:', error);
    }
  }, [isBackendEnabled, backendRemoveFromWatchlist, getContentIdFromWatchlist, localWatchlist, undoContext]);

  // Enhanced clear watchlist function
  const clearWatchlist = useCallback(async () => {
    console.log('🧹 Clearing watchlist...');
    
    try {
      if (isBackendEnabled) {
        // For backend, we need to remove items one by one
        // This is a limitation of the current API
        console.log('⚠️ Backend clear watchlist not implemented yet');
      } else {
        // Use local storage system
        setLocalWatchlist([]);
        try {
          localStorage.setItem('watchlist', JSON.stringify([]));
        } catch (error) {
          console.error('Error clearing localStorage:', error);
        }
        console.log('✅ Local watchlist cleared');
      }
    } catch (error) {
      console.error('❌ Error clearing watchlist:', error);
    }
  }, [isBackendEnabled]);

  // Enhanced restore to watchlist function
  const restoreToWatchlist = useCallback(async (movie) => {
    console.log('🔄 Restoring movie to watchlist:', movie.title);
    
    try {
      if (isBackendEnabled) {
        // Use backend system
        await backendAddToWatchlist(movie);
        console.log('✅ Restored to backend watchlist');
      } else {
        // Use local storage system
        if (localWatchlist.some(item => item.id === movie.id)) {
          console.log('Movie already in local watchlist:', movie.title);
          return;
        }
        
        setLocalWatchlist(prev => [movie, ...prev]);
        console.log('✅ Restored to local watchlist');
      }
    } catch (error) {
      console.error('❌ Error restoring to watchlist:', error);
    }
  }, [isBackendEnabled, backendAddToWatchlist, localWatchlist]);

  // Enhanced is in watchlist function
  const isInWatchlist = useCallback((movieId, type = 'movie') => {
    if (isBackendEnabled) {
      return backendIsInWatchlist(movieId, type);
    } else {
      return localWatchlist.some(movie => movie.id === movieId);
    }
  }, [isBackendEnabled, backendIsInWatchlist, localWatchlist]);

  // Enhanced update watch history function
  const updateWatchHistory = useCallback(async (movie, progress) => {
    if (!isBackendEnabled) {
      console.log('⚠️ Watch history tracking requires authentication');
      return false;
    }

    try {
      await backendUpdateWatchHistory(movie, progress);
      console.log('✅ Watch history updated');
      return true;
    } catch (error) {
      console.error('❌ Error updating watch history:', error);
      return false;
    }
  }, [isBackendEnabled, backendUpdateWatchHistory]);

  const value = {
    // Core watchlist functionality
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    restoreToWatchlist,
    clearWatchlist,
    isInWatchlist,
    
    // Enhanced functionality
    watchHistory,
    watchStats,
    updateWatchHistory,
    
    // System status
    isBackendEnabled,
    isAuthenticated,
    backendLoading,
    backendError,
    backendInitialized,
    
    // Backward compatibility
    setWatchlist: isBackendEnabled ? (() => {
      console.warn('setWatchlist is not available when using backend sync. Use addToWatchlist/removeFromWatchlist instead.');
    }) : setLocalWatchlist
  };

  return (
    <EnhancedWatchlistContext.Provider value={value}>
      {children}
    </EnhancedWatchlistContext.Provider>
  );
};
