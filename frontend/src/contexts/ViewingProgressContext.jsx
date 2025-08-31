import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import syncService from '../services/syncService';
import { userAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { useUndoSafe } from './UndoContext';

const ViewingProgressContext = createContext();

export const useViewingProgress = () => {
  const context = useContext(ViewingProgressContext);
  if (!context) {
    throw new Error('useViewingProgress must be used within a ViewingProgressProvider');
  }
  return context;
};

export const ViewingProgressProvider = ({ children }) => {
  const [viewingProgress, setViewingProgress] = useState({});
  const [continueWatching, setContinueWatching] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const { user } = useAuth();
  const isMountedRef = useRef(true);
  
  // Get undo context safely
  const undoContext = useUndoSafe();

  // Load viewing progress from localStorage on mount
  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem('viewingProgress');
      if (savedProgress) {
        const parsedProgress = JSON.parse(savedProgress);
        setViewingProgress(parsedProgress);
        
        // Process continue watching array
        const continueWatchingArray = Object.values(parsedProgress);
        if (continueWatchingArray.length > 0) {
          // Group TV shows by show ID and keep only the most recent episode
          const tvShows = new Map();
          const groupedItems = [];
          
          // Process items in batches to prevent blocking
          const processItems = () => {
            continueWatchingArray.forEach(item => {
              if (item.type === 'tv') {
                // For TV shows, group by show ID and keep only the most recent episode
                if (!tvShows.has(item.id) || new Date(item.lastWatched) > new Date(tvShows.get(item.id).lastWatched)) {
                  tvShows.set(item.id, item);
                }
              } else {
                // For movies, add directly
                groupedItems.push(item);
              }
            });
            
            // Add the most recent episode for each TV show
            tvShows.forEach(show => {
              groupedItems.push(show);
            });
            
            // Sort by last watched date and limit to 20 items
            const finalArray = groupedItems
              .sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched))
              .slice(0, 20);
            
            setContinueWatching(finalArray);
          };
          
          // Use requestIdleCallback if available, otherwise setTimeout
          if (window.requestIdleCallback) {
            window.requestIdleCallback(processItems);
          } else {
            setTimeout(processItems, 0);
          }
        }
      }
      setIsInitialized(true);
    } catch (error) {
      console.error('Error loading viewing progress:', error);
      setIsInitialized(true);
    }
  }, []);

  // Initialize sync service when user is authenticated
  useEffect(() => {
    if (user && isMountedRef.current) {
      try {
        // Load viewing progress from backend if available
        loadViewingProgressFromBackend();
        
        // Set up periodic sync
        const syncInterval = setInterval(() => {
          if (user && navigator.onLine) {
            syncViewingProgressWithBackend();
          }
        }, 30000); // Sync every 30 seconds when online
        
        return () => {
          clearInterval(syncInterval);
        };
      } catch (error) {
        console.error('Error initializing viewing progress sync:', error);
      }
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [user]);

  // Load viewing progress from backend
  const loadViewingProgressFromBackend = async () => {
    if (!user) return;
    
    try {
      setIsSyncing(true);
      const response = await userAPI.getViewingProgress();
      
      if (response.success && response.data.viewingProgress) {
        const backendProgress = {};
        
        response.data.viewingProgress.forEach(item => {
          if (item.type === 'movie') {
            const key = `movie_${item.tmdbId}`;
            backendProgress[key] = {
              id: item.tmdbId,
              type: item.type,
              title: item.title,
              poster_path: item.posterPath,
              backdrop_path: item.backdropPath,
              progress: item.progress,
              lastWatched: item.lastWatched
            };
          } else if (item.type === 'tv') {
            const key = `tv_${item.tmdbId}_${item.season}_${item.episode}`;
            backendProgress[key] = {
              id: item.tmdbId,
              type: item.type,
              title: item.title,
              poster_path: item.posterPath,
              backdrop_path: item.backdropPath,
              season: item.season,
              episode: item.episode,
              episodeTitle: item.episodeTitle,
              progress: item.progress,
              lastWatched: item.lastWatched
            };
          }
        });
        
        // Merge with local progress, prioritizing backend data
        const mergedProgress = { ...viewingProgress, ...backendProgress };
        setViewingProgress(mergedProgress);
        
        // Update localStorage with merged data
        localStorage.setItem('viewingProgress', JSON.stringify(mergedProgress));
        
        console.log('Viewing progress loaded from backend:', Object.keys(backendProgress).length, 'items');
      }
    } catch (error) {
      console.error('Error loading viewing progress from backend:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync viewing progress with backend
  const syncViewingProgressWithBackend = async () => {
    if (!user || !navigator.onLine) return;
    
    try {
      setIsSyncing(true);
      await syncService.syncViewingProgress();
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Error syncing viewing progress with backend:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Save viewing progress to localStorage whenever it changes
  useEffect(() => {
    // Don't save during initial load
    if (!isInitialized || !isMountedRef.current) return;
    
    try {
      // Always save the current state to localStorage (even if empty)
      localStorage.setItem('viewingProgress', JSON.stringify(viewingProgress));
      
      // Trigger sync with backend if user is authenticated
      if (user && navigator.onLine) {
        syncService.queueSync('viewingProgress');
      }
    } catch (error) {
      console.error('Error saving viewing progress:', error);
    }
  }, [viewingProgress, isInitialized, user]);

  // Helper function to extract path from full TMDB URL
  const extractPathFromUrl = (url) => {
    if (!url) {
      console.log('🖼️ extractPathFromUrl: No URL provided');
      return null;
    }
    
    console.log('🖼️ extractPathFromUrl input:', url);
    
    // If it's already a path (starts with /), return as-is
    if (url.startsWith('/')) {
      console.log('🖼️ Already a path, returning as-is:', url);
      return url;
    }
    
    // If it's a full URL, extract the path
    if (url.startsWith('http')) {
      // Extract path from full URL
      const match = url.match(/\/t\/p\/[^\/]+\/(.+)$/);
      const result = match ? `/${match[1]}` : null;
      console.log('🖼️ Extracted path from URL:', result);
      return result;
    }
    
    // If it's neither a path nor a URL, assume it's a path and add leading slash
    if (url && !url.startsWith('/')) {
      const result = `/${url}`;
      console.log('🖼️ Added leading slash:', result);
      return result;
    }
    
    console.log('🖼️ No valid path found, returning null');
    return null;
  };

  // Start watching a movie
  const startWatchingMovie = useCallback((movie) => {
    console.log('🎬 startWatchingMovie called with:', {
      movie: movie?.title || movie?.name,
      movieId: movie?.id,
      hasMovie: !!movie,
      hasMovieId: !!movie?.id
    });

    if (!movie || !movie.id) {
      console.warn('❌ startWatchingMovie: Missing movie data');
      return;
    }

    const progressKey = `movie_${movie.id}`;
    const now = new Date().toISOString();
    
    const movieProgress = {
      id: movie.id,
      type: 'movie',
      title: movie.title || movie.name,
      poster_path: movie.poster_path || movie.poster,
      backdrop_path: movie.backdrop_path || movie.backdrop,
      progress: 0,
      lastWatched: now
    };

    setViewingProgress(prev => ({
      ...prev,
      [progressKey]: movieProgress
    }));

    // Update continue watching list
    setContinueWatching(prev => {
      const existingIndex = prev.findIndex(item => 
        item.id === movie.id && item.type === 'movie'
      );

      if (existingIndex > -1) {
        // Update existing entry
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...movieProgress
        };
        return updated;
      } else {
        // Add new entry at the beginning
        return [movieProgress, ...prev];
      }
    });

    // Sync will be handled by useEffect after localStorage is updated
  }, []);

  // Start watching a TV episode
  const startWatchingEpisode = useCallback((show, season, episode, episodeData = null) => {
    console.log('🎬 startWatchingEpisode called with:', {
      show: show?.name || show?.title,
      showId: show?.id,
      season,
      episode,
      episodeData: episodeData?.name,
      hasShow: !!show,
      hasShowId: !!show?.id,
      hasSeason: !!season,
      hasEpisode: !!episode
    });

    if (!show || !show.id || !season || !episode) {
      console.warn('❌ startWatchingEpisode: Missing required data', {
        show: !!show,
        showId: !!show?.id,
        season: !!season,
        episode: !!episode
      });
      return;
    }

    const progressKey = `tv_${show.id}_${season}_${episode}`;
    const now = new Date().toISOString();
    
    // Enhanced debugging for TV show data structure
    console.log('🎬 Show data structure:', {
      id: show.id,
      name: show.name,
      title: show.title,
      poster_path: show.poster_path,
      backdrop_path: show.backdrop_path,
      poster: show.poster,
      backdrop: show.backdrop
    });

    // Enhanced debugging for extracted paths
    // Use full URLs if paths are undefined
    const posterSource = show.poster_path || show.poster;
    const backdropSource = show.backdrop_path || show.backdrop;
    const extractedPosterPath = extractPathFromUrl(posterSource);
    const extractedBackdropPath = extractPathFromUrl(backdropSource);
    
    console.log('🎬 Extracted image paths:', {
      original_poster_path: show.poster_path,
      original_backdrop_path: show.backdrop_path,
      original_poster: show.poster,
      original_backdrop: show.backdrop,
      extracted_poster_path: extractedPosterPath,
      extracted_backdrop_path: extractedBackdropPath
    });
    
    const episodeProgress = {
      id: show.id,
      type: 'tv',
      title: show.name || show.title,
      poster_path: extractedPosterPath,
      backdrop_path: extractedBackdropPath,
      season,
      episode,
      episodeTitle: episodeData?.name || null,
      progress: 0,
      lastWatched: now
    };

    setViewingProgress(prev => ({
      ...prev,
      [progressKey]: episodeProgress
    }));

    // Update continue watching list
    setContinueWatching(prev => {
      const existingIndex = prev.findIndex(item => 
        item.id === show.id && 
        item.type === 'tv' && 
        item.season === season && 
        item.episode === episode
      );

      if (existingIndex > -1) {
        // Update existing entry
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...episodeProgress
        };
        return updated;
      } else {
        // Add new entry at the beginning
        return [episodeProgress, ...prev];
      }
    });

    // Sync will be handled by useEffect after localStorage is updated
  }, []);

  // Update viewing progress
  const updateProgress = useCallback((id, type, season = null, episode = null, progress = 0) => {
    const progressKey = type === 'movie' ? `movie_${id}` : `tv_${id}_${season}_${episode}`;
    
    console.log('📊 updateProgress called:', { id, type, season, episode, progress, progressKey });
    
    setViewingProgress(prev => {
      const existing = prev[progressKey];
      if (!existing) {
        console.warn('⚠️ No existing progress entry found for:', progressKey);
        return prev;
      }

      const updatedProgress = {
        ...existing,
        progress: Math.max(existing.progress, progress),
        lastWatched: new Date().toISOString()
      };

      console.log('📊 Updated progress entry:', updatedProgress);

      return {
        ...prev,
        [progressKey]: updatedProgress
      };
    });

    // Also update the continue watching list and re-sort by last watched
    setContinueWatching(prev => {
      const updated = prev.map(item => {
        if (item.id === id && item.type === type) {
          if (type === 'tv' && item.season === season && item.episode === episode) {
            return {
              ...item,
              progress: Math.max(item.progress || 0, progress),
              lastWatched: new Date().toISOString()
            };
          } else if (type === 'movie') {
            return {
              ...item,
              progress: Math.max(item.progress || 0, progress),
              lastWatched: new Date().toISOString()
            };
          }
        }
        return item;
      });

      // Re-sort by last watched date to ensure most recently watched items appear first
      const sorted = updated.sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched));

      console.log('📊 Updated continue watching list with progress:', sorted.length, 'items');
      return sorted;
    });

    // Sync will be handled by useEffect after localStorage is updated
  }, []);

  // Remove from continue watching
  const removeFromContinueWatching = useCallback((id, type, season = null, episode = null) => {
    // Find the item to be removed for undo functionality
    let itemToRemove = null;
    if (type === 'movie') {
      itemToRemove = continueWatching.find(item => 
        item.id === id && item.type === 'movie'
      );
    } else if (type === 'tv') {
      itemToRemove = continueWatching.find(item => 
        item.id === id && item.type === 'tv'
      );
    }

    // Attempt to load the already-fetched thumbnail URL from localStorage (if present)
    let savedImageUrl = null;
    if (type === 'movie') {
      const persistentKey = `${id}_movie_movie_movie`;
      savedImageUrl = localStorage.getItem(`continue_watching_image_${persistentKey}`);
    } else if (type === 'tv') {
      const persistentKey = `${id}_tv_${season || 'unknown'}_${episode || 'unknown'}`;
      savedImageUrl = localStorage.getItem(`continue_watching_image_${persistentKey}`);
    }

    if (type === 'movie') {
      // For movies, remove the specific movie
      const progressKey = `movie_${id}`;
      
      setViewingProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[progressKey];
        return newProgress;
      });

      setContinueWatching(prev => 
        prev.filter(item => 
          !(item.id === id && item.type === 'movie')
        )
      );
      
      // Clear persistent image URL for movie
      const persistentKey = `${id}_movie_movie_movie`;
      localStorage.removeItem(`continue_watching_image_${persistentKey}`);
    } else if (type === 'tv') {
      // For TV shows, remove ALL episodes of the same show
      setViewingProgress(prev => {
        const newProgress = { ...prev };
        // Remove all entries for this TV show
        Object.keys(newProgress).forEach(key => {
          if (key.startsWith(`tv_${id}_`)) {
            delete newProgress[key];
          }
        });
        return newProgress;
      });

      setContinueWatching(prev => 
        prev.filter(item => 
          !(item.id === id && item.type === 'tv')
        )
      );
      
      // Clear persistent image URL for TV show
      const persistentKey = `${id}_tv_${season || 'unknown'}_${episode || 'unknown'}`;
      localStorage.removeItem(`continue_watching_image_${persistentKey}`);
    }

    // Add to undo context if undo is available
    if (undoContext && itemToRemove) {
      const payload = savedImageUrl ? { ...itemToRemove, thumbnailUrl: savedImageUrl } : itemToRemove;
      undoContext.addDeletedItem('continueWatching', payload);
    }
  }, [continueWatching, undoContext]);

  // Clear all viewing progress
  const clearAllProgress = useCallback(() => {
    // Clear state - useEffect will handle localStorage
    setViewingProgress({});
    setContinueWatching([]);
  }, []);

  // Clear all continue watching items
  const clearAllContinueWatching = useCallback(() => {
    setViewingProgress({});
    setContinueWatching([]);
    
    // Clear all persistent image URLs
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('continue_watching_image_')) {
        localStorage.removeItem(key);
      }
    });
  }, []);

  // Restore item to continue watching (for undo functionality)
  const restoreToContinueWatching = useCallback((item) => {
    if (item.type === 'movie') {
      const progressKey = `movie_${item.id}`;
      const movieProgress = {
        id: item.id,
        title: item.title,
        type: item.type,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        lastWatched: item.lastWatched || new Date().toISOString(),
        progress: item.progress || 0
      };
      
      setViewingProgress(prev => ({
        ...prev,
        [progressKey]: movieProgress
      }));

      setContinueWatching(prev => {
        const filtered = prev.filter(existing => 
          !(existing.id === item.id && existing.type === 'movie')
        );
        return [movieProgress, ...filtered].slice(0, 20);
      });
    } else if (item.type === 'tv') {
      const progressKey = `tv_${item.id}_${item.season}_${item.episode}`;
      const episodeProgress = {
        id: item.id,
        title: item.title,
        type: item.type,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        lastWatched: item.lastWatched || new Date().toISOString(),
        season: item.season,
        episode: item.episode,
        episodeTitle: item.episodeTitle,
        progress: item.progress || 0
      };
      
      setViewingProgress(prev => ({
        ...prev,
        [progressKey]: episodeProgress
      }));

      setContinueWatching(prev => {
        const filtered = prev.filter(existing => 
          !(existing.id === item.id && existing.type === 'tv')
        );
        return [episodeProgress, ...filtered].slice(0, 20);
      });
    }
  }, []);

  // Get continue watching items
  const getContinueWatching = useCallback(() => {
    return continueWatching;
  }, [continueWatching]);

  // Check if user has any continue watching items
  const hasContinueWatching = useCallback(() => {
    return continueWatching.length > 0;
  }, [continueWatching]);

  // Manually refresh data from localStorage (for testing) - OPTIMIZED
  const refreshFromStorage = useCallback(() => {
    try {
      const savedProgress = localStorage.getItem('viewingProgress');
      
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress);
        setViewingProgress(parsed);
        
        // Convert to continue watching array with TV show grouping - OPTIMIZED
        const continueWatchingArray = Object.entries(parsed)
          .map(([key, data]) => ({
            id: data.id,
            title: data.title,
            type: data.type,
            poster_path: data.poster_path,
            backdrop_path: data.backdrop_path,
            lastWatched: data.lastWatched,
            season: data.season,
            episode: data.episode,
            episodeTitle: data.episodeTitle,
            progress: data.progress || 0
          }))
          .sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched));
        
        // Group TV shows by ID and keep only the most recent episode for each show - OPTIMIZED
        const groupedItems = [];
        const tvShows = new Map();
        
        // Process items in batches to prevent blocking
        const processItems = () => {
          continueWatchingArray.forEach(item => {
            if (item.type === 'tv') {
              // For TV shows, group by show ID and keep only the most recent episode
              if (!tvShows.has(item.id) || new Date(item.lastWatched) > new Date(tvShows.get(item.id).lastWatched)) {
                tvShows.set(item.id, item);
              }
            } else {
              // For movies, add directly
              groupedItems.push(item);
            }
          });
          
          // Add the most recent episode for each TV show
          tvShows.forEach(show => {
            groupedItems.push(show);
          });
          
          // Sort by last watched date and limit to 20 items
          const finalArray = groupedItems
            .sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched))
            .slice(0, 20);
          
          setContinueWatching(finalArray);
        };
        
        // Use requestIdleCallback if available, otherwise setTimeout
        if (window.requestIdleCallback) {
          window.requestIdleCallback(processItems);
        } else {
          setTimeout(processItems, 0);
        }
      }
    } catch (error) {
      console.error('Error refreshing viewing progress:', error);
    }
  }, []);

  // Test function to manually create progress entry (for debugging)
  const createTestProgress = useCallback((movie, progress = 50) => {
    console.log('🧪 Creating test progress for:', movie.title, 'with progress:', progress);
    startWatchingMovie(movie);
    
    // Update progress after a short delay
    setTimeout(() => {
      updateProgress(movie.id, 'movie', null, null, progress);
    }, 100);
  }, [startWatchingMovie, updateProgress]);

  const value = {
    viewingProgress,
    continueWatching,
    startWatchingMovie,
    startWatchingEpisode,
    updateProgress,
    removeFromContinueWatching,
    restoreToContinueWatching,
    clearAllContinueWatching,
    hasContinueWatching,
    refreshFromStorage,
    isInitialized,
    isSyncing,
    lastSyncTime,
    syncViewingProgressWithBackend
  };

  return (
    <ViewingProgressContext.Provider value={value}>
      {children}
    </ViewingProgressContext.Provider>
  );
}; 