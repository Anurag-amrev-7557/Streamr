import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  addToWatchlist, 
  removeFromWatchlist, 
  getWatchlist,
  updateWatchHistory,
  getWatchHistory,
  removeFromWatchHistory,
  clearWatchHistory,
  getWatchStats,
  prepareContentData
} from '../services/userService';

export const useWatchData = () => {
  const [watchlist, setWatchlist] = useState([]);
  const [watchHistory, setWatchHistory] = useState([]);
  const [watchStats, setWatchStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Refs to prevent memory leaks
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);

  // Get authentication state from AuthContext
  const { isAuthenticated } = useAuth();

  // Check if user is authenticated
  const isUserAuthenticated = useCallback(() => {
    return isAuthenticated;
  }, [isAuthenticated]);

  // Load watchlist from backend
  const loadWatchlist = useCallback(async () => {
    if (!isUserAuthenticated() || loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      
      const response = await getWatchlist();
      if (mountedRef.current) {
        setWatchlist(response.data.watchlist || []);
        console.log('📋 Watchlist loaded:', response.data.watchlist?.length || 0, 'items');
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message);
        console.error('Error loading watchlist:', err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      loadingRef.current = false;
    }
  }, [isUserAuthenticated]);

  // Load watch history from backend
  const loadWatchHistory = useCallback(async () => {
    if (!isUserAuthenticated() || loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      
      const response = await getWatchHistory();
      if (mountedRef.current) {
        setWatchHistory(response.data.watchHistory || []);
        console.log('📚 Watch history loaded:', response.data.watchHistory?.length || 0, 'items');
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message);
        console.error('Error loading watch history:', err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      loadingRef.current = false;
    }
  }, [isUserAuthenticated]);

  // Load watch statistics from backend
  const loadWatchStats = useCallback(async () => {
    if (!isUserAuthenticated() || loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      
      const response = await getWatchStats();
      if (mountedRef.current) {
        setWatchStats(response.data);
        console.log('📊 Watch stats loaded successfully');
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message);
        console.error('Error loading watch stats:', err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      loadingRef.current = false;
    }
  }, [isUserAuthenticated]);

  // Add content to watchlist
  const addToWatchlistHandler = useCallback(async (movie) => {
    if (!isUserAuthenticated()) {
      throw new Error('User must be authenticated to add to watchlist');
    }

    try {
      setError(null);
      console.log('➕ Adding movie to watchlist:', movie.title || movie.name);
      
      const contentData = prepareContentData(movie);
      
      if (!contentData) {
        throw new Error('Invalid movie data');
      }

      const response = await addToWatchlist(contentData);
      
      // Update local state
      if (mountedRef.current) {
        setWatchlist(prev => {
          const newWatchlist = [...prev, response.data];
          console.log('📋 Watchlist updated, new total:', newWatchlist.length);
          return newWatchlist;
        });
      }
      
      return response;
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message);
      }
      throw err;
    }
  }, [isUserAuthenticated]);

  // Remove content from watchlist
  const removeFromWatchlistHandler = useCallback(async (contentId) => {
    if (!isUserAuthenticated()) {
      throw new Error('User must be authenticated to remove from watchlist');
    }

    try {
      setError(null);
      console.log('🗑️ Removing from watchlist with contentId:', contentId);
      
      await removeFromWatchlist(contentId);
      
      // Update local state
      if (mountedRef.current) {
        setWatchlist(prev => {
          const filtered = prev.filter(item => item._id !== contentId);
          console.log('📋 Updated watchlist state:', filtered.length, 'items remaining');
          return filtered;
        });
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message);
      }
      throw err;
    }
  }, [isUserAuthenticated]);

  // Update watch history
  const updateWatchHistoryHandler = useCallback(async (movie, progress) => {
    if (!isUserAuthenticated()) {
      throw new Error('User must be authenticated to update watch history');
    }

    try {
      setError(null);
      console.log('📺 Updating watch history for:', movie.title || movie.name, 'Progress:', progress);
      
      const contentData = prepareContentData(movie);
      
      if (!contentData) {
        throw new Error('Invalid movie data');
      }

      const response = await updateWatchHistory({
        ...contentData,
        progress
      });
      
      // Update local state
      if (mountedRef.current) {
        setWatchHistory(prev => {
          const existingIndex = prev.findIndex(
            item => item.content._id === response.data.contentId
          );
          
          if (existingIndex > -1) {
            // Update existing entry
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              progress: response.data.progress,
              lastWatched: new Date()
            };
            console.log('📚 Updated existing watch history entry');
            return updated;
          } else {
            // Add new entry
            const newEntry = {
              content: {
                _id: response.data.contentId,
                tmdbId: response.data.tmdbId,
                title: response.data.title,
                type: response.data.type
              },
              progress: response.data.progress,
              lastWatched: new Date()
            };
            console.log('📚 Added new watch history entry');
            return [newEntry, ...prev];
          }
        });
      }
      
      return response;
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message);
      }
      throw err;
    }
  }, [isUserAuthenticated]);

  // Remove item from watch history
  const removeFromWatchHistoryHandler = useCallback(async (contentId) => {
    if (!isUserAuthenticated()) {
      throw new Error('User must be authenticated to remove from watch history');
    }

    try {
      setError(null);
      console.log('🗑️ Removing from watch history, contentId:', contentId);
      
      await removeFromWatchHistory(contentId);
      
      // Update local state
      if (mountedRef.current) {
        setWatchHistory(prev => prev.filter(item => item.content._id !== contentId));
        console.log('📚 Removed item from watch history');
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message);
      }
      throw err;
    }
  }, [isUserAuthenticated]);

  // Clear entire watch history
  const clearWatchHistoryHandler = useCallback(async () => {
    if (!isUserAuthenticated()) {
      throw new Error('User must be authenticated to clear watch history');
    }

    try {
      setError(null);
      console.log('🧹 Clearing entire watch history');
      
      await clearWatchHistory();
      
      // Update local state
      if (mountedRef.current) {
        setWatchHistory([]);
        console.log('📚 Watch history cleared');
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message);
      }
      throw err;
    }
  }, [isUserAuthenticated]);

  // Check if content is in watchlist
  const isInWatchlist = useCallback((tmdbId, type) => {
    const found = watchlist.some(item => 
      item.tmdbId === tmdbId && item.type === type
    );
    console.log('🔍 Checking if in watchlist:', { tmdbId, type, found });
    return found;
  }, [watchlist]);

  // Get content ID from watchlist by TMDB ID and type
  const getContentIdFromWatchlist = useCallback((tmdbId, type) => {
    const item = watchlist.find(item => 
      item.tmdbId === tmdbId && item.type === type
    );
    return item ? item._id : null;
  }, [watchlist]);

  // Get watch progress for content
  const getWatchProgress = useCallback((tmdbId, type, season = null, episode = null) => {
    const historyItem = watchHistory.find(item => {
      if (item.content.tmdbId === tmdbId && item.content.type === type) {
        // For TV shows, check season/episode if provided
        if (type === 'tv' && season && episode) {
          // This is a simplified check - you might want to enhance this
          // to handle specific episode tracking
          return true;
        }
        return true;
      }
      return false;
    });
    
    return historyItem ? historyItem.progress : 0;
  }, [watchHistory]);

  // Initialize data
  const initializeData = useCallback(async () => {
    if (!isUserAuthenticated() || isInitialized) return;
    
    try {
      console.log('🚀 Initializing watch data...');
      await Promise.all([
        loadWatchlist(),
        loadWatchHistory(),
        loadWatchStats()
      ]);
      
      if (mountedRef.current) {
        setIsInitialized(true);
        console.log('✅ Watch data initialized successfully');
      }
    } catch (err) {
      console.error('Error initializing watch data:', err);
    }
  }, [isUserAuthenticated, isInitialized, loadWatchlist, loadWatchHistory, loadWatchStats]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    if (!isUserAuthenticated()) return;
    
    try {
      console.log('🔄 Refreshing watch data...');
      await Promise.all([
        loadWatchlist(),
        loadWatchHistory(),
        loadWatchStats()
      ]);
      console.log('✅ Watch data refreshed successfully');
    } catch (err) {
      console.error('Error refreshing watch data:', err);
    }
  }, [isUserAuthenticated, loadWatchlist, loadWatchHistory, loadWatchStats]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Initialize data when component mounts or authentication changes
  useEffect(() => {
    initializeData();
  }, [initializeData]);

  // Re-initialize when authentication state changes
  useEffect(() => {
    if (isUserAuthenticated()) {
      console.log('🔄 Authentication detected, re-initializing watch data...');
      initializeData();
    } else {
      console.log('⚠️ No authentication, clearing watch data...');
      if (mountedRef.current) {
        setWatchlist([]);
        setWatchHistory([]);
        setWatchStats(null);
        setIsInitialized(false);
      }
    }
  }, [isUserAuthenticated, initializeData]);

  return {
    // State
    watchlist,
    watchHistory,
    watchStats,
    loading,
    error,
    isInitialized,
    
    // Actions
    addToWatchlist: addToWatchlistHandler,
    removeFromWatchlist: removeFromWatchlistHandler,
    updateWatchHistory: updateWatchHistoryHandler,
    removeFromWatchHistory: removeFromWatchHistoryHandler,
    clearWatchHistory: clearWatchHistoryHandler,
    
    // Utilities
    isInWatchlist,
    getContentIdFromWatchlist,
    getWatchProgress,
    refreshData,
    isUserAuthenticated,
    
    // Loading functions
    loadWatchlist,
    loadWatchHistory,
    loadWatchStats
  };
};
