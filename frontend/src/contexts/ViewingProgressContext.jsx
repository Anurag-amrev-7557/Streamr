import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useUndoSafe } from './UndoContext';
import { useSocket } from './SocketContext';
import { userAPI } from '../services/api';
import { getApiUrl } from '../config/api';
import { generateProgressKey } from '../utils/progressKeyUtils';

const ViewingProgressContext = createContext();

/**
 * Hook to access the viewing progress context
 * @returns {Object} Viewing progress context value
 * @throws {Error} If used outside of ViewingProgressProvider
 */
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
  
  // Refs for proper cleanup and avoiding stale closures
  const saveTimeoutRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const viewingProgressRef = useRef(viewingProgress);
  const lastBackendDataRef = useRef(null);
  
  // Update ref when viewingProgress changes
  useEffect(() => {
    viewingProgressRef.current = viewingProgress;
  }, [viewingProgress]);
  
  // Get undo context safely
  const undoContext = useUndoSafe();

  // Define loadFromBackend function that can be used by other useEffects
  const loadFromBackendForSync = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('No access token found, skipping backend viewing progress load');
        return;
      }
      
      // Check if token is valid by making a simple auth check using profile endpoint
      try {
        const authCheck = await fetch(`${getApiUrl()}/user/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (!authCheck.ok) {
          console.log('Token validation failed, clearing token and skipping backend load');
          localStorage.removeItem('accessToken');
          return;
        }
      } catch (authError) {
        if (authError.name === 'TimeoutError' || authError.name === 'AbortError') {
          console.log('Token validation timeout, skipping backend load');
        } else {
          console.log('Token validation error, skipping backend load:', authError);
        }
        return;
      }
      
      const response = await userAPI.getViewingProgress();
      if (response?.success && response.data?.viewingProgress) {
        // Update local state with backend data
        setViewingProgress(response.data.viewingProgress);
        lastBackendDataRef.current = JSON.stringify(response.data.viewingProgress);
        console.log('Loaded viewing progress from backend:', Object.keys(response.data.viewingProgress).length, 'items');
      }
    } catch (error) {
      console.error('Failed to load viewing progress from backend:', error);
      
      // Check if it's an authentication error
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        console.log('Authentication error, clearing token and using local data');
        localStorage.removeItem('accessToken');
      }
      
      // Fall back to localStorage
    }
  }, []);

  // Load viewing progress from backend and localStorage on mount - OPTIMIZED
  useEffect(() => {
    const loadFromLocalStorage = () => {
      try {
        const savedProgress = localStorage.getItem('viewingProgress');
        
        if (savedProgress) {
          const parsed = JSON.parse(savedProgress);
          setViewingProgress(parsed);
          
          // Convert to continue watching array with TV show grouping - OPTIMIZED
          const continueWatchingArray = Object.entries(parsed)
            .map(([key, data]) => {
              // Debug logging for title resolution
              if (data.type === 'tv' && (!data.title || data.title === 'Unknown Series')) {
                console.log('🔍 TV Show title debug:', {
                  key,
                  id: data.id,
                  title: data.title,
                  name: data.name,
                  original_title: data.original_title,
                  original_name: data.original_name,
                  allData: data
                });
              }
              
              return {
                id: data.id,
                title: data.title || data.name || data.original_title || data.original_name || (data.type === 'tv' ? 'Unknown Series' : 'Unknown Movie'),
                type: data.type,
                poster_path: data.poster_path,
                backdrop_path: data.backdrop_path,
                lastWatched: data.lastWatched,
                season: data.season,
                episode: data.episode,
                episodeTitle: data.episodeTitle,
                progress: data.progress || 0
              };
            })
            .sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched));
          
          // Group TV shows by ID and keep only the most recent episode for each show - OPTIMIZED
          const groupedItems = [];
          const tvShows = new Map();
          
          // Process items in batches to prevent blocking
          const processItems = () => {
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            continueWatchingArray.forEach(item => {
              // Skip items that are completed (>95%) and older than 7 days
              const lastWatchedDate = new Date(item.lastWatched);
              const isCompleted = item.progress >= 95;
              const isOld = lastWatchedDate < sevenDaysAgo;
              
              if (isCompleted && isOld) {
                return; // Skip this item
              }
              
              if (item.type === 'tv') {
                // For TV shows, group by show ID and keep only the most recent episode
                if (!tvShows.has(item.id) || new Date(item.lastWatched) > new Date(tvShows.get(item.id).lastWatched)) {
                  tvShows.set(item.id, item);
                }
              } else {
                // For movies, add directly (excluding completed & old ones)
                groupedItems.push(item);
              }
            });
            
            // Add the most recent episode for each TV show
            tvShows.forEach(show => {
              groupedItems.push(show);
            });
            
            // Enhanced sorting algorithm:
            // 1. Prioritize items watched in last 24 hours
            // 2. Then by progress (show nearly-finished content prominently)
            // 3. Finally by last watched date
            const finalArray = groupedItems
              .sort((a, b) => {
                const aDate = new Date(a.lastWatched);
                const bDate = new Date(b.lastWatched);
                const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                
                // Prioritize items watched in the last 24 hours
                const aIsRecent = aDate > oneDayAgo;
                const bIsRecent = bDate > oneDayAgo;
                
                if (aIsRecent && !bIsRecent) return -1;
                if (!aIsRecent && bIsRecent) return 1;
                
                // For items both recent or both old, prioritize by progress
                // Show nearly-finished content (70-95%) first
                const aProgress = a.progress || 0;
                const bProgress = b.progress || 0;
                
                const aNearlyFinished = aProgress >= 70 && aProgress < 95;
                const bNearlyFinished = bProgress >= 70 && bProgress < 95;
                
                if (aNearlyFinished && !bNearlyFinished) return -1;
                if (!aNearlyFinished && bNearlyFinished) return 1;
                
                // Finally, sort by last watched date
                return bDate - aDate;
              });
            
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
        console.error('Error loading viewing progress from localStorage:', error);
      }
    };

    // Try backend first, then fall back to localStorage
    loadFromBackendForSync().finally(() => {
      loadFromLocalStorage();
      setIsInitialized(true);
    });
  }, [loadFromBackendForSync]);

  // Listen for authentication token changes and reload viewing progress
  useEffect(() => {
    let timeoutId = null;
    
    const handleStorageChange = (e) => {
      if (e.key === 'accessToken') {
        console.log('Auth token changed (storage), updating viewing progress state');
        // If token was removed (logout), clear local viewing progress/continueWatching immediately
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.log('Access token removed - clearing viewing progress and continueWatching');
          setViewingProgress({});
          setContinueWatching([]);
          setIsInitialized(true);
          return;
        }

        // Small delay to ensure the token is properly set before loading
        timeoutId = setTimeout(() => {
          loadFromBackendForSync();
        }, 100);
      }
    };

    // Listen for storage events (for cross-tab communication)
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom auth events
    const handleAuthChange = () => {
      console.log('Auth change detected (custom event), updating viewing progress state');
      // If token was removed (logout), clear local viewing progress/continueWatching immediately
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('Access token removed via auth-changed - clearing viewing progress and continueWatching');
        setViewingProgress({});
        setContinueWatching([]);
        setIsInitialized(true);
        return;
      }

      timeoutId = setTimeout(() => {
        loadFromBackendForSync();
      }, 100);
    };

    window.addEventListener('auth-changed', handleAuthChange);
    
    return () => {
      // Clear any pending timeouts
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', handleAuthChange);
    };
  }, [loadFromBackendForSync]);

  // Get socket context for real-time updates (with error handling)
  let socketContext = null;
  try {
    socketContext = useSocket();
  } catch (error) {
    console.log('Socket context not available, using polling fallback');
  }

  // Real-time WebSocket sync for viewing progress
  useEffect(() => {
    if (socketContext && socketContext.addListener) {
      // Listen for real-time viewing progress updates
      const removeListener = socketContext.addListener('viewingProgress:updated', (data) => {
        if (data.userId && data.viewingProgress) {
          console.log('Received real-time viewing progress update:', Object.keys(data.viewingProgress).length, 'items');
          
          // Only update if the data is different
          const currentData = JSON.stringify(viewingProgressRef.current);
          const newData = JSON.stringify(data.viewingProgress);
          
          if (currentData !== newData) {
            console.log('Viewing progress data changed via WebSocket, updating local state');
            setViewingProgress(data.viewingProgress);
            
            // Update localStorage with backend data
            try {
              localStorage.setItem('viewingProgress', newData);
            } catch (error) {
              console.error('Error updating localStorage with WebSocket data:', error);
            }
          }
        }
      });

      return () => {
        if (removeListener) removeListener();
      };
    } else {
      // Fallback to adaptive, visibility-aware polling if WebSocket is not available
      let pollInterval = 30000; // start with 30s
      const backoffMax = 120000; // 2 minutes max

      const poll = async () => {
        try {
          // Only poll when page is visible and initialized
          if (document.hidden || !isInitialized) return;

          const token = localStorage.getItem('accessToken');
          if (!token) return;

          const response = await userAPI.getViewingProgress();
          if (response?.success && response.data?.viewingProgress) {
            const backendData = response.data.viewingProgress;

            // Only update if data changed compared to last backend snapshot
            const backendJson = JSON.stringify(backendData);
            if (lastBackendDataRef.current !== backendJson) {
              lastBackendDataRef.current = backendJson;
              setViewingProgress(backendData);

              try {
                localStorage.setItem('viewingProgress', backendJson);
              } catch (error) {
                console.error('Error updating localStorage with backend data:', error);
              }
            }

            // successful poll -> reset backoff
            pollInterval = 30000;
          }
        } catch (error) {
          console.error('Adaptive periodic refresh failed:', error);
          // exponential backoff to reduce CPU/network usage on errors
          pollInterval = Math.min(backoffMax, Math.max(30000, pollInterval * 1.5));
        } finally {
          // schedule next poll
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = setInterval(poll, pollInterval);
        }
      };

      // Handle visibility changes
      const handleVisibility = () => {
        if (!document.hidden) {
          poll(); // Start polling when visible
        } else {
          // Stop polling when hidden
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      };

      document.addEventListener('visibilitychange', handleVisibility);
      
      // Start immediately if visible
      if (!document.hidden) poll();

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }
  }, [isInitialized, socketContext]);

  // Auto-sync with backend and save to localStorage whenever viewing progress changes
  useEffect(() => {
    // Don't sync during initial load
    if (!isInitialized) return;

    // Save to localStorage and schedule backend sync (debounced)
    const scheduleSaveAndSync = () => {
      // debounce localStorage writes and backend sync to 2s
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const payloadJson = JSON.stringify(viewingProgressRef.current);
          try {
            localStorage.setItem('viewingProgress', payloadJson);
          } catch (error) {
            console.error('Error saving viewing progress:', error);
          }

          const token = localStorage.getItem('accessToken');
          if (Object.keys(viewingProgressRef.current).length > 0 && token) {
            try {
              await userAPI.syncViewingProgress(viewingProgressRef.current);
              console.log('Viewing progress automatically synced with backend');
            } catch (err) {
              console.error('Auto-sync failed:', err);
            }
          }
        } catch (error) {
          console.error('Failed to serialize viewingProgress for save:', error);
        }
      }, 2000);
    };

    scheduleSaveAndSync();

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [viewingProgress, isInitialized]);

  /**
   * Helper function to extract path from full TMDB URL
   * @param {string} url - Full TMDB URL or path
   * @returns {string|null} Extracted path or null
   */
  const extractPathFromUrl = useCallback((url) => {
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
  }, []);

  /**
   * Start watching a movie and add it to viewing progress
   * @param {Object} movie - Movie object with id, title, poster_path, etc.
   */
  const startWatchingMovie = useCallback((movie) => {
    if (!movie?.id) {
      console.warn('❌ startWatchingMovie: Invalid movie data', movie);
      return;
    }

    console.log('🎬 startWatchingMovie called with:', movie);

    const progressKey = `movie_${movie.id}`;
    const now = new Date().toISOString();
    
    const movieProgress = {
      id: movie.id,
      title: movie.title || movie.name || movie.original_title || movie.original_name || 'Unknown Movie',
      type: 'movie',
      poster_path: extractPathFromUrl(movie.poster_path || movie.poster),
      backdrop_path: extractPathFromUrl(movie.backdrop_path || movie.backdrop),
      lastWatched: now,
      progress: 0
    };

    console.log('🎬 movieProgress created:', movieProgress);

    setViewingProgress(prev => ({
      ...prev,
      [progressKey]: movieProgress
    }));

    // Update continue watching list
    setContinueWatching(prev => {
      const filtered = prev.filter(item => !(item.id === movie.id && item.type === 'movie'));
      return [movieProgress, ...filtered];
    });
  }, [extractPathFromUrl]);

  /**
   * Start watching a TV episode and add it to viewing progress
   * @param {Object} show - TV show object with id, name, poster_path, etc.
   * @param {number} season - Season number
   * @param {number} episode - Episode number
   * @param {Object|null} episodeData - Optional episode data with name, etc.
   */
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

    if (!show?.id || !season || !episode) {
      console.warn('❌ startWatchingEpisode: Missing required data', {
        show: !!show,
        showId: !!show?.id,
        season: !!season,
        episode: !!episode
      });
      return;
    }

    const progressKey = generateProgressKey(show.id, 'tv', season, episode);
    
    if (!progressKey) {
      console.warn('❌ startWatchingEpisode: Invalid progress key generated', { showId: show.id, season, episode });
      return;
    }
    
    const now = new Date().toISOString();
    
    console.log('🎬 Creating progress entry with key:', progressKey);
    
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
      title: show.name || show.title || show.original_name || show.original_title || 'Unknown Series',
      type: 'tv',
      poster_path: extractedPosterPath,
      backdrop_path: extractedBackdropPath,
      lastWatched: now,
      season: season,
      episode: episode,
      episodeTitle: episodeData?.name || `Episode ${episode}`,
      progress: 0
    };

    console.log('🎬 episodeProgress created:', episodeProgress);
    
    // Mobile-specific debugging for TV show storage
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      console.log('📱 Mobile TV Show storage debugging:', {
        id: show.id,
        title: show.name || show.title,
        poster_path: extractedPosterPath,
        backdrop_path: extractedBackdropPath,
        hasPosterPath: !!extractedPosterPath,
        hasBackdropPath: !!extractedBackdropPath,
        season,
        episode
      });
    }

    setViewingProgress(prev => ({
      ...prev,
      [progressKey]: episodeProgress
    }));

    // Update continue watching list
    setContinueWatching(prev => {
      // For TV shows, remove ALL episodes of the same show and add only the latest one
      const filtered = prev.filter(item => 
        !(item.id === show.id && item.type === 'tv')
      );
      const newList = [episodeProgress, ...filtered];
      console.log('🎬 Updated continue watching list:', newList.length, 'items');
      return newList;
    });
  }, [extractPathFromUrl]);

  /**
   * Update viewing progress for a movie or TV episode
   * @param {number|string} id - Content ID
   * @param {string} type - Content type ('movie' or 'tv')
   * @param {number|null} season - Season number for TV shows
   * @param {number|null} episode - Episode number for TV shows
   * @param {number} progress - Progress percentage (0-100)
   */
  const updateProgress = useCallback((id, type, season = null, episode = null, progress = 0) => {
    const progressKey = generateProgressKey(id, type, season, episode);
    
    if (!progressKey) {
      console.warn('❌ updateProgress: Invalid progress key generated', { 
        id, 
        type, 
        season, 
        episode,
        error: type === 'tv' ? 'TV shows require both season and episode numbers' : 'Invalid content type or missing ID'
      });
      return;
    }
    
    console.log('📊 updateProgress called:', { id, type, season, episode, progress, progressKey });
    
    // Additional debugging for TV shows
    if (type === 'tv') {
      console.log('📊 TV Progress Update Debug:', {
        showId: id,
        season,
        episode,
        progress,
        progressKey,
        existingProgress: viewingProgressRef.current[progressKey]
      });
    }
    
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

    // Trigger immediate sync for progress updates
    const token = localStorage.getItem('accessToken');
    if (token && isInitialized) {
      setTimeout(async () => {
        try {
          await userAPI.syncViewingProgress(viewingProgressRef.current);
          console.log('Immediate viewing progress sync completed');
        } catch (error) {
          console.error('Immediate viewing progress sync failed:', error);
        }
      }, 500); // Small delay to ensure state is updated
    }
  }, [isInitialized]);

  /**
   * Remove an item from continue watching list
   * @param {number|string} id - Content ID
   * @param {string} type - Content type ('movie' or 'tv')
   * @param {number|null} season - Season number for TV shows
   * @param {number|null} episode - Episode number for TV shows
   */
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

  /**
   * Clear all viewing progress
   */
  const clearAllProgress = useCallback(() => {
    // Clear state - useEffect will handle localStorage
    setViewingProgress({});
    setContinueWatching([]);
  }, []);

  /**
   * Clear all continue watching items
   */
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

  /**
   * Restore an item to continue watching (for undo functionality)
   * @param {Object} item - Item to restore
   */
  const restoreToContinueWatching = useCallback((item) => {
    if (item.type === 'movie') {
      const progressKey = `movie_${item.id}`;
      const movieProgress = {
        id: item.id,
        title: item.title || 'Unknown Movie',
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
        return [movieProgress, ...filtered];
      });
    } else if (item.type === 'tv') {
      const progressKey = `tv_${item.id}_${item.season}_${item.episode}`;
      const episodeProgress = {
        id: item.id,
        title: item.title || item.name || item.original_title || item.original_name || 'Unknown Series',
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
        return [episodeProgress, ...filtered];
      });
    }
  }, []);

  /**
   * Get continue watching items
   * @returns {Array} Array of continue watching items
   */
  const getContinueWatching = useCallback(() => {
    return continueWatching;
  }, [continueWatching]);

  /**
   * Check if user has any continue watching items
   * @returns {boolean} True if user has continue watching items
   */
  const hasContinueWatching = useCallback(() => {
    return continueWatching.length > 0;
  }, [continueWatching]);

  /**
   * Manually refresh data from localStorage
   */
  const refreshFromStorage = useCallback(() => {
    try {
      const savedProgress = localStorage.getItem('viewingProgress');
      
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress);
        setViewingProgress(parsed);
        
        // Convert to continue watching array with TV show grouping - OPTIMIZED
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const continueWatchingArray = Object.entries(parsed)
          .map(([key, data]) => {
            // Debug logging for title resolution
            if (data.type === 'tv' && (!data.title || data.title === 'Unknown Series')) {
              console.log('🔍 TV Show title debug (refreshFromStorage):', {
                key,
                id: data.id,
                title: data.title,
                name: data.name,
                original_title: data.original_title,
                original_name: data.original_name,
                allData: data
              });
            }
            
            return {
              id: data.id,
              title: data.title || data.name || data.original_title || data.original_name || (data.type === 'tv' ? 'Unknown Series' : 'Unknown Movie'),
              type: data.type,
              poster_path: data.poster_path,
              backdrop_path: data.backdrop_path,
              lastWatched: data.lastWatched,
              season: data.season,
              episode: data.episode,
              episodeTitle: data.episodeTitle,
              progress: data.progress || 0
            };
          })
          .filter(item => {
            // Filter out completed items that are older than 7 days
            const lastWatchedDate = new Date(item.lastWatched);
            const isCompleted = item.progress >= 95;
            const isOld = lastWatchedDate < sevenDaysAgo;
            
            return !(isCompleted && isOld);
          })
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
          
          // Enhanced sorting algorithm:
          // 1. Prioritize items watched in last 24 hours
          // 2. Then by progress (show nearly-finished content prominently)
          // 3. Finally by last watched date
          const now = new Date();
          const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          
          const finalArray = groupedItems
            .sort((a, b) => {
              const aDate = new Date(a.lastWatched);
              const bDate = new Date(b.lastWatched);
              
              // Prioritize items watched in the last 24 hours
              const aIsRecent = aDate > oneDayAgo;
              const bIsRecent = bDate > oneDayAgo;
              
              if (aIsRecent && !bIsRecent) return -1;
              if (!aIsRecent && bIsRecent) return 1;
              
              // For items both recent or both old, prioritize by progress
              // Show nearly-finished content (70-95%) first
              const aProgress = a.progress || 0;
              const bProgress = b.progress || 0;
              
              const aNearlyFinished = aProgress >= 70 && aProgress < 95;
              const bNearlyFinished = bProgress >= 70 && bProgress < 95;
              
              if (aNearlyFinished && !bNearlyFinished) return -1;
              if (!aNearlyFinished && bNearlyFinished) return 1;
              
              // Finally, sort by last watched date
              return bDate - aDate;
            });
          
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

  /**
   * Mark an item as watched by setting progress to 100% and removing it after a delay
   * @param {number} id - Content ID
   * @param {string} type - Content type ('movie' or 'tv')
   * @param {number|null} season - Season number for TV shows
   * @param {number|null} episode - Episode number for TV shows
   */
  const markAsWatched = useCallback((id, type, season = null, episode = null) => {
    // Update progress to 100%
    updateProgress(id, type, season, episode, 100);
    
    // Remove from continue watching after a short delay
    setTimeout(() => {
      removeFromContinueWatching(id, type, season, episode);
    }, 1000);
  }, [updateProgress, removeFromContinueWatching]);

  /**
   * Clear only movies from continue watching
   */
  const clearMoviesFromContinueWatching = useCallback(() => {
    const moviesToRemove = continueWatching.filter(item => item.type === 'movie');
    
    moviesToRemove.forEach(movie => {
      const progressKey = `movie_${movie.id}`;
      setViewingProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[progressKey];
        return newProgress;
      });
      
      const persistentKey = `${movie.id}_movie_movie_movie`;
      localStorage.removeItem(`continue_watching_image_${persistentKey}`);
    });
    
    setContinueWatching(prev => prev.filter(item => item.type !== 'movie'));
  }, [continueWatching]);

  /**
   * Clear only TV shows from continue watching
   */
  const clearTVShowsFromContinueWatching = useCallback(() => {
    const tvShowsToRemove = continueWatching.filter(item => item.type === 'tv');
    
    tvShowsToRemove.forEach(show => {
      setViewingProgress(prev => {
        const newProgress = { ...prev };
        Object.keys(newProgress).forEach(key => {
          if (key.startsWith(`tv_${show.id}_`)) {
            delete newProgress[key];
          }
        });
        return newProgress;
      });
      
      const persistentKey = `${show.id}_tv_${show.season || 'unknown'}_${show.episode || 'unknown'}`;
      localStorage.removeItem(`continue_watching_image_${persistentKey}`);
    });
    
    setContinueWatching(prev => prev.filter(item => item.type !== 'tv'));
  }, [continueWatching]);

  /**
   * Test function to manually create progress entry (for debugging)
   * @param {Object} movie - Movie object
   * @param {number} progress - Progress percentage (default: 50)
   */
  const createTestProgress = useCallback((movie, progress = 50) => {
    console.log('🧪 Creating test progress for:', movie.title, 'with progress:', progress);
    startWatchingMovie(movie);
    
    // Update progress after a short delay
    setTimeout(() => {
      updateProgress(movie.id, 'movie', null, null, progress);
    }, 100);
  }, [startWatchingMovie, updateProgress]);

  /**
   * Manual refresh function for users to sync from backend
   * @returns {Promise<Object>} Response object with success status and data/error
   */
  const refreshFromBackend = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await userAPI.getViewingProgress();
      if (response?.success && response.data?.viewingProgress) {
        const backendData = response.data.viewingProgress;
        
        setViewingProgress(backendData);
        lastBackendDataRef.current = JSON.stringify(backendData);
        console.log('Manually refreshed viewing progress from backend:', Object.keys(backendData).length, 'items');
        
        // Update localStorage with backend data
        try {
          localStorage.setItem('viewingProgress', JSON.stringify(backendData));
        } catch (error) {
          console.error('Error updating localStorage with backend data:', error);
        }
        
        return { success: true, data: backendData };
      }
      
      return { success: false, error: 'Invalid response format' };
    } catch (error) {
      console.error('Manual refresh failed:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    viewingProgress,
    continueWatching,
    startWatchingMovie,
    startWatchingEpisode,
    updateProgress,
    removeFromContinueWatching,
    restoreToContinueWatching,
    clearAllContinueWatching,
    clearMoviesFromContinueWatching,
    clearTVShowsFromContinueWatching,
    markAsWatched,
    hasContinueWatching,
    refreshFromStorage,
    refreshFromBackend,
    isInitialized
  }), [
    viewingProgress,
    continueWatching,
    startWatchingMovie,
    startWatchingEpisode,
    updateProgress,
    removeFromContinueWatching,
    restoreToContinueWatching,
    clearAllContinueWatching,
    clearMoviesFromContinueWatching,
    clearTVShowsFromContinueWatching,
    markAsWatched,
    hasContinueWatching,
    refreshFromStorage,
    refreshFromBackend,
    isInitialized
  ]);

  return (
    <ViewingProgressContext.Provider value={value}>
      {children}
    </ViewingProgressContext.Provider>
  );
}; 