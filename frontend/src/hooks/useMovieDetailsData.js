/**
 * 🚀 Advanced Movie Details Data Management Hook
 * 
 * This hook provides comprehensive data fetching, caching, and synchronization
 * for movie details with advanced features:
 * - SWR (stale-while-revalidate) pattern
 * - Optimistic updates
 * - Background synchronization
 * - Intelligent cache invalidation
 * - Request deduplication
 * - Retry logic with exponential backoff
 * - Network-aware fetching
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getMovieDetails, getMovieCredits, getMovieVideos, getSimilarMovies, getTVSeason, getTVSeasons } from '../services/tmdbService';
import { useNetworkStatus } from './useNetworkStatus';
import advancedCacheService from '../services/advancedCacheService';

// Advanced cache configuration
const CACHE_CONFIG = {
  movieDetails: {
    ttl: 10 * 60 * 1000, // 10 minutes
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
  credits: {
    ttl: 15 * 60 * 1000, // 15 minutes
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  },
  videos: {
    ttl: 20 * 60 * 1000, // 20 minutes
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  },
  similar: {
    ttl: 15 * 60 * 1000, // 15 minutes
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  },
};

// Request deduplication map
const ongoingRequests = new Map();

/**
 * Deduplicate concurrent requests for the same resource
 */
const deduplicateRequest = async (key, requestFn) => {
  if (ongoingRequests.has(key)) {
    return ongoingRequests.get(key);
  }

  const promise = requestFn();
  ongoingRequests.set(key, promise);

  try {
    const result = await promise;
    return result;
  } finally {
    ongoingRequests.delete(key);
  }
};

/**
 * Exponential backoff retry logic
 */
const retryWithBackoff = async (fn, maxRetries = 3, initialDelay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on 4xx errors (client errors)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }
      
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

export const useMovieDetailsData = (movie) => {
  const [state, setState] = useState({
    movieDetails: null,
    credits: null,
    videos: null,
    similarMovies: [],
    similarMoviesPage: 1,
    hasMoreSimilar: true,
    loading: true,
    error: null,
    isStale: false,
  });

  const [loadingStates, setLoadingStates] = useState({
    details: true,
    credits: true,
    videos: true,
    similar: true,
    similarMore: false,
  });

  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const { isOnline, effectiveType } = useNetworkStatus();

  // Get movie type and ID
  const movieType = useMemo(() => {
    return movie?.media_type || movie?.type || (movie?.first_air_date ? 'tv' : 'movie');
  }, [movie]);

  const movieId = movie?.id;

  /**
   * Update loading state for a specific resource
   */
  const setLoadingState = useCallback((key, value) => {
    setLoadingStates(prev => {
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  /**
   * Update main state
   */
  const updateState = useCallback((updates) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      // Prevent unnecessary re-renders
      if (JSON.stringify(prev) === JSON.stringify(newState)) return prev;
      return newState;
    });
  }, []);

  /**
   * Fetch movie details with caching and network awareness
   */
  const fetchMovieDetails = useCallback(async (forceRefresh = false) => {
    if (!movieId) return null;

    const cacheKey = `movie_details_${movieType}_${movieId}`;

    // Check cache first
    if (!forceRefresh) {
      const cached = advancedCacheService.get(cacheKey, CACHE_CONFIG.movieDetails);
      if (cached) {
        const isStale = advancedCacheService.isStale(cacheKey, CACHE_CONFIG.movieDetails.staleTime);
        updateState({ movieDetails: cached, isStale });
        
        // If stale but online, fetch in background
        if (isStale && isOnline) {
          fetchMovieDetails(true);
        }
        
        return cached;
      }
    }

    setLoadingState('details', true);

    try {
      const details = await deduplicateRequest(cacheKey, async () => {
        return await retryWithBackoff(async () => {
          const signal = abortControllerRef.current?.signal;
          return await getMovieDetails(movieId, movieType, { signal });
        });
      });

      if (isMountedRef.current && details) {
        advancedCacheService.set(cacheKey, details, CACHE_CONFIG.movieDetails);
        updateState({ movieDetails: details, error: null, isStale: false });
      }

      return details;
    } catch (error) {
      if (isMountedRef.current && error.name !== 'AbortError') {
        console.error('[useMovieDetailsData] Failed to fetch movie details:', error);
        updateState({ error: error.message });
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setLoadingState('details', false);
      }
    }
  }, [movieId, movieType, isOnline, updateState, setLoadingState]);

  /**
   * Fetch credits with caching
   */
  const fetchCredits = useCallback(async (forceRefresh = false) => {
    if (!movieId) return null;

    const cacheKey = `movie_credits_${movieType}_${movieId}`;

    if (!forceRefresh) {
      const cached = advancedCacheService.get(cacheKey, CACHE_CONFIG.credits);
      if (cached) {
        updateState({ credits: cached });
        return cached;
      }
    }

    setLoadingState('credits', true);

    try {
      const credits = await deduplicateRequest(cacheKey, async () => {
        return await retryWithBackoff(async () => {
          const signal = abortControllerRef.current?.signal;
          return await getMovieCredits(movieId, movieType, { signal });
        });
      });

      if (isMountedRef.current && credits) {
        advancedCacheService.set(cacheKey, credits, CACHE_CONFIG.credits);
        updateState({ credits, error: null });
      }

      return credits;
    } catch (error) {
      if (isMountedRef.current && error.name !== 'AbortError') {
        console.error('[useMovieDetailsData] Failed to fetch credits:', error);
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setLoadingState('credits', false);
      }
    }
  }, [movieId, movieType, updateState, setLoadingState]);

  /**
   * Fetch videos/trailers with caching
   */
  const fetchVideos = useCallback(async (forceRefresh = false) => {
    if (!movieId) return null;

    const cacheKey = `movie_videos_${movieType}_${movieId}`;

    if (!forceRefresh) {
      const cached = advancedCacheService.get(cacheKey, CACHE_CONFIG.videos);
      if (cached) {
        updateState({ videos: cached });
        return cached;
      }
    }

    setLoadingState('videos', true);

    try {
      const videos = await deduplicateRequest(cacheKey, async () => {
        return await retryWithBackoff(async () => {
          const signal = abortControllerRef.current?.signal;
          return await getMovieVideos(movieId, movieType, { signal });
        });
      });

      if (isMountedRef.current && videos) {
        advancedCacheService.set(cacheKey, videos, CACHE_CONFIG.videos);
        updateState({ videos, error: null });
      }

      return videos;
    } catch (error) {
      if (isMountedRef.current && error.name !== 'AbortError') {
        console.error('[useMovieDetailsData] Failed to fetch videos:', error);
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setLoadingState('videos', false);
      }
    }
  }, [movieId, movieType, updateState, setLoadingState]);

  /**
   * Fetch similar movies with pagination
   */
  const fetchSimilarMovies = useCallback(async (page = 1, forceRefresh = false) => {
    if (!movieId) return [];

    const cacheKey = `movie_similar_${movieType}_${movieId}_page_${page}`;

    if (!forceRefresh) {
      const cached = advancedCacheService.get(cacheKey, CACHE_CONFIG.similar);
      if (cached) {
        if (page === 1) {
          updateState({ similarMovies: cached.results || [], hasMoreSimilar: cached.page < cached.total_pages });
        } else {
          updateState(prev => ({
            similarMovies: [...prev.similarMovies, ...(cached.results || [])],
            hasMoreSimilar: cached.page < cached.total_pages,
          }));
        }
        return cached.results || [];
      }
    }

    const loadingKey = page === 1 ? 'similar' : 'similarMore';
    setLoadingState(loadingKey, true);

    try {
      const similar = await deduplicateRequest(cacheKey, async () => {
        return await retryWithBackoff(async () => {
          const signal = abortControllerRef.current?.signal;
          return await getSimilarMovies(movieId, movieType, page, { signal });
        });
      });

      if (isMountedRef.current && similar) {
        advancedCacheService.set(cacheKey, similar, CACHE_CONFIG.similar);
        
        if (page === 1) {
          updateState({
            similarMovies: similar.results || [],
            hasMoreSimilar: similar.page < similar.total_pages,
            similarMoviesPage: page,
            error: null,
          });
        } else {
          updateState(prev => ({
            similarMovies: [...prev.similarMovies, ...(similar.results || [])],
            hasMoreSimilar: similar.page < similar.total_pages,
            similarMoviesPage: page,
            error: null,
          }));
        }
      }

      return similar?.results || [];
    } catch (error) {
      if (isMountedRef.current && error.name !== 'AbortError') {
        console.error('[useMovieDetailsData] Failed to fetch similar movies:', error);
      }
      return [];
    } finally {
      if (isMountedRef.current) {
        setLoadingState(loadingKey, false);
      }
    }
  }, [movieId, movieType, updateState, setLoadingState]);

  /**
   * Load next page of similar movies
   */
  const loadMoreSimilar = useCallback(async () => {
    if (!state.hasMoreSimilar || loadingStates.similarMore) return;
    
    const nextPage = state.similarMoviesPage + 1;
    await fetchSimilarMovies(nextPage);
  }, [state.hasMoreSimilar, state.similarMoviesPage, loadingStates.similarMore, fetchSimilarMovies]);

  /**
   * Fetch all data in parallel with priority
   */
  const fetchAllData = useCallback(async () => {
    if (!movieId) return;

    updateState({ loading: true });

    // Priority 1: Details (required for UI)
    const detailsPromise = fetchMovieDetails();

    // Priority 2: Credits and Videos (important but not blocking)
    const creditsPromise = fetchCredits();
    const videosPromise = fetchVideos();

    // Priority 3: Similar movies (nice to have)
    const similarPromise = fetchSimilarMovies(1);

    try {
      // Wait for critical data first
      await detailsPromise;

      // Then load secondary data
      await Promise.allSettled([creditsPromise, videosPromise, similarPromise]);
    } finally {
      if (isMountedRef.current) {
        updateState({ loading: false });
      }
    }
  }, [movieId, fetchMovieDetails, fetchCredits, fetchVideos, fetchSimilarMovies, updateState]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    if (!isOnline) return;

    await Promise.allSettled([
      fetchMovieDetails(true),
      fetchCredits(true),
      fetchVideos(true),
      fetchSimilarMovies(1, true),
    ]);
  }, [isOnline, fetchMovieDetails, fetchCredits, fetchVideos, fetchSimilarMovies]);

  /**
   * Invalidate cache for current movie
   */
  const invalidateCache = useCallback(() => {
    if (!movieId) return;

    advancedCacheService.delete(`movie_details_${movieType}_${movieId}`);
    advancedCacheService.delete(`movie_credits_${movieType}_${movieId}`);
    advancedCacheService.delete(`movie_videos_${movieType}_${movieId}`);
    
    // Clear similar movies cache for all pages
    for (let page = 1; page <= state.similarMoviesPage; page++) {
      advancedCacheService.delete(`movie_similar_${movieType}_${movieId}_page_${page}`);
    }
  }, [movieId, movieType, state.similarMoviesPage]);

  // Initialize abort controller
  useEffect(() => {
    abortControllerRef.current = new AbortController();
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Fetch data when movie changes
  useEffect(() => {
    if (movieId && isOnline) {
      fetchAllData();
    }
  }, [movieId, isOnline, fetchAllData]);

  // Prefetch on slow connection
  useEffect(() => {
    if (movieId && effectiveType === '2g' && state.movieDetails) {
      // On slow connections, deprioritize similar movies
      setLoadingState('similar', false);
    }
  }, [movieId, effectiveType, state.movieDetails, setLoadingState]);

  return {
    // State
    ...state,
    loadingStates,
    isOnline,
    
    // Actions
    fetchMovieDetails,
    fetchCredits,
    fetchVideos,
    fetchSimilarMovies,
    loadMoreSimilar,
    refresh,
    invalidateCache,
    
    // Utils
    movieType,
  };
};

export default useMovieDetailsData;
