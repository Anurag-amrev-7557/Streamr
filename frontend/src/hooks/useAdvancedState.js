/**
 * Advanced State Management Hook with Reducer Pattern
 * Provides centralized state management with actions, middleware, and time-travel debugging
 */
import { useReducer, useCallback, useRef, useEffect } from 'react';

// Action types
export const ACTION_TYPES = {
  // Movie data actions
  SET_MOVIES: 'SET_MOVIES',
  APPEND_MOVIES: 'APPEND_MOVIES',
  UPDATE_MOVIE: 'UPDATE_MOVIE',
  REMOVE_MOVIE: 'REMOVE_MOVIE',
  
  // UI state actions
  SET_SELECTED_MOVIE: 'SET_SELECTED_MOVIE',
  SET_FEATURED_CONTENT: 'SET_FEATURED_CONTENT',
  SET_ACTIVE_CATEGORY: 'SET_ACTIVE_CATEGORY',
  SET_FEATURED_INDEX: 'SET_FEATURED_INDEX',
  
  // Loading states
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // Page states
  UPDATE_PAGE_STATE: 'UPDATE_PAGE_STATE',
  RESET_PAGE_STATE: 'RESET_PAGE_STATE',
  
  // Cache operations
  SET_CACHE: 'SET_CACHE',
  INVALIDATE_CACHE: 'INVALIDATE_CACHE',
  CLEAR_CACHE: 'CLEAR_CACHE',
  
  // Batch operations
  BATCH_UPDATE: 'BATCH_UPDATE',
  RESET_STATE: 'RESET_STATE'
};

// Initial state structure
const createInitialState = () => ({
  // Movie collections
  movies: {
    trending: [],
    popular: [],
    topRated: [],
    upcoming: [],
    action: [],
    comedy: [],
    drama: [],
    horror: [],
    sciFi: [],
    documentary: [],
    family: [],
    animation: [],
    awardWinning: [],
    latest: [],
    popularTV: [],
    topRatedTV: [],
    airingToday: [],
    nowPlaying: []
  },
  
  // UI state
  ui: {
    selectedMovie: null,
    featuredContent: null,
    activeCategory: 'all',
    currentFeaturedIndex: 0,
    isTransitioning: false,
    isMobile: false,
    showAdBlockerToast: false,
    selectedCastMember: null,
    showCastDetails: false
  },
  
  // Loading & error states
  loading: {},
  errors: {},
  
  // Page states for pagination
  pageStates: {
    trending: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    popular: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    topRated: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    upcoming: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    action: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    comedy: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    drama: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    horror: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    sciFi: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    documentary: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    family: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    animation: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    awardWinning: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    latest: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    popularTV: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    topRatedTV: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    airingToday: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    nowPlaying: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null }
  },
  
  // Cache
  cache: {},
  
  // Metadata
  meta: {
    lastUpdate: Date.now(),
    version: '2.0'
  }
});

// Advanced reducer with middleware support
const homePageReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.SET_MOVIES: {
      const { category, movies, deduplicate = true } = action.payload;
      let processedMovies = movies;
      
      // Deduplication logic
      if (deduplicate && Array.isArray(movies)) {
        const existingIds = new Set(state.movies[category]?.map(m => m.id) || []);
        processedMovies = movies.filter(m => !existingIds.has(m.id));
      }
      
      return {
        ...state,
        movies: {
          ...state.movies,
          [category]: processedMovies
        },
        meta: { ...state.meta, lastUpdate: Date.now() }
      };
    }
    
    case ACTION_TYPES.APPEND_MOVIES: {
      const { category, movies, deduplicate = true } = action.payload;
      const existingMovies = state.movies[category] || [];
      let newMovies = movies;
      
      if (deduplicate && Array.isArray(movies)) {
        const existingIds = new Set(existingMovies.map(m => m.id));
        newMovies = movies.filter(m => !existingIds.has(m.id));
      }
      
      return {
        ...state,
        movies: {
          ...state.movies,
          [category]: [...existingMovies, ...newMovies]
        },
        meta: { ...state.meta, lastUpdate: Date.now() }
      };
    }
    
    case ACTION_TYPES.UPDATE_MOVIE: {
      const { category, movieId, updates } = action.payload;
      const movies = state.movies[category] || [];
      
      return {
        ...state,
        movies: {
          ...state.movies,
          [category]: movies.map(movie => 
            movie.id === movieId ? { ...movie, ...updates } : movie
          )
        },
        meta: { ...state.meta, lastUpdate: Date.now() }
      };
    }
    
    case ACTION_TYPES.SET_SELECTED_MOVIE:
      return {
        ...state,
        ui: { ...state.ui, selectedMovie: action.payload }
      };
    
    case ACTION_TYPES.SET_FEATURED_CONTENT:
      return {
        ...state,
        ui: { ...state.ui, featuredContent: action.payload }
      };
    
    case ACTION_TYPES.SET_ACTIVE_CATEGORY:
      return {
        ...state,
        ui: { ...state.ui, activeCategory: action.payload }
      };
    
    case ACTION_TYPES.SET_FEATURED_INDEX:
      return {
        ...state,
        ui: { ...state.ui, currentFeaturedIndex: action.payload }
      };
    
    case ACTION_TYPES.SET_LOADING: {
      const { key, value } = action.payload;
      return {
        ...state,
        loading: { ...state.loading, [key]: value }
      };
    }
    
    case ACTION_TYPES.SET_ERROR: {
      const { key, error } = action.payload;
      return {
        ...state,
        errors: { ...state.errors, [key]: error }
      };
    }
    
    case ACTION_TYPES.CLEAR_ERROR: {
      const { key } = action.payload;
      const { [key]: removed, ...remainingErrors } = state.errors;
      return {
        ...state,
        errors: remainingErrors
      };
    }
    
    case ACTION_TYPES.UPDATE_PAGE_STATE: {
      const { category, updates } = action.payload;
      return {
        ...state,
        pageStates: {
          ...state.pageStates,
          [category]: {
            ...state.pageStates[category],
            ...updates,
            lastFetched: Date.now()
          }
        }
      };
    }
    
    case ACTION_TYPES.RESET_PAGE_STATE: {
      const { category } = action.payload;
      return {
        ...state,
        pageStates: {
          ...state.pageStates,
          [category]: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null }
        }
      };
    }
    
    case ACTION_TYPES.SET_CACHE: {
      const { key, data, ttl } = action.payload;
      return {
        ...state,
        cache: {
          ...state.cache,
          [key]: {
            data,
            timestamp: Date.now(),
            ttl: ttl || 60 * 60 * 1000
          }
        }
      };
    }
    
    case ACTION_TYPES.INVALIDATE_CACHE: {
      const { key } = action.payload;
      const { [key]: removed, ...remainingCache } = state.cache;
      return {
        ...state,
        cache: remainingCache
      };
    }
    
    case ACTION_TYPES.CLEAR_CACHE:
      return {
        ...state,
        cache: {}
      };
    
    case ACTION_TYPES.BATCH_UPDATE: {
      const { updates } = action.payload;
      let newState = state;
      
      updates.forEach(update => {
        newState = homePageReducer(newState, update);
      });
      
      return newState;
    }
    
    case ACTION_TYPES.RESET_STATE:
      return createInitialState();
    
    default:
      return state;
  }
};

// Middleware for logging and debugging (dev only)
const loggingMiddleware = (action, state, nextState) => {
  if (import.meta.env.DEV) {
    console.group(`Action: ${action.type}`);
    console.log('Payload:', action.payload);
    console.log('Previous State:', state);
    console.log('Next State:', nextState);
    console.groupEnd();
  }
};

// Main hook
export const useAdvancedState = (initialState = null) => {
  const [state, dispatch] = useReducer(
    homePageReducer,
    initialState || createInitialState()
  );
  
  const stateHistoryRef = useRef([]);
  const maxHistorySize = 50;
  
  // Enhanced dispatch with middleware support
  const enhancedDispatch = useCallback((action) => {
    const currentState = state;
    
    // Apply action
    dispatch(action);
    
    // Store in history for time-travel debugging
    if (import.meta.env.DEV) {
      stateHistoryRef.current.push({
        action,
        state: currentState,
        timestamp: Date.now()
      });
      
      // Limit history size
      if (stateHistoryRef.current.length > maxHistorySize) {
        stateHistoryRef.current.shift();
      }
    }
  }, [state]);
  
  // Action creators
  const actions = {
    setMovies: useCallback((category, movies, deduplicate = true) => {
      enhancedDispatch({
        type: ACTION_TYPES.SET_MOVIES,
        payload: { category, movies, deduplicate }
      });
    }, [enhancedDispatch]),
    
    appendMovies: useCallback((category, movies, deduplicate = true) => {
      enhancedDispatch({
        type: ACTION_TYPES.APPEND_MOVIES,
        payload: { category, movies, deduplicate }
      });
    }, [enhancedDispatch]),
    
    updateMovie: useCallback((category, movieId, updates) => {
      enhancedDispatch({
        type: ACTION_TYPES.UPDATE_MOVIE,
        payload: { category, movieId, updates }
      });
    }, [enhancedDispatch]),
    
    setSelectedMovie: useCallback((movie) => {
      enhancedDispatch({
        type: ACTION_TYPES.SET_SELECTED_MOVIE,
        payload: movie
      });
    }, [enhancedDispatch]),
    
    setFeaturedContent: useCallback((content) => {
      enhancedDispatch({
        type: ACTION_TYPES.SET_FEATURED_CONTENT,
        payload: content
      });
    }, [enhancedDispatch]),
    
    setActiveCategory: useCallback((category) => {
      enhancedDispatch({
        type: ACTION_TYPES.SET_ACTIVE_CATEGORY,
        payload: category
      });
    }, [enhancedDispatch]),
    
    setFeaturedIndex: useCallback((index) => {
      enhancedDispatch({
        type: ACTION_TYPES.SET_FEATURED_INDEX,
        payload: index
      });
    }, [enhancedDispatch]),
    
    setLoading: useCallback((key, value) => {
      enhancedDispatch({
        type: ACTION_TYPES.SET_LOADING,
        payload: { key, value }
      });
    }, [enhancedDispatch]),
    
    setError: useCallback((key, error) => {
      enhancedDispatch({
        type: ACTION_TYPES.SET_ERROR,
        payload: { key, error }
      });
    }, [enhancedDispatch]),
    
    clearError: useCallback((key) => {
      enhancedDispatch({
        type: ACTION_TYPES.CLEAR_ERROR,
        payload: { key }
      });
    }, [enhancedDispatch]),
    
    updatePageState: useCallback((category, updates) => {
      enhancedDispatch({
        type: ACTION_TYPES.UPDATE_PAGE_STATE,
        payload: { category, updates }
      });
    }, [enhancedDispatch]),
    
    resetPageState: useCallback((category) => {
      enhancedDispatch({
        type: ACTION_TYPES.RESET_PAGE_STATE,
        payload: { category }
      });
    }, [enhancedDispatch]),
    
    setCache: useCallback((key, data, ttl) => {
      enhancedDispatch({
        type: ACTION_TYPES.SET_CACHE,
        payload: { key, data, ttl }
      });
    }, [enhancedDispatch]),
    
    invalidateCache: useCallback((key) => {
      enhancedDispatch({
        type: ACTION_TYPES.INVALIDATE_CACHE,
        payload: { key }
      });
    }, [enhancedDispatch]),
    
    clearCache: useCallback(() => {
      enhancedDispatch({ type: ACTION_TYPES.CLEAR_CACHE });
    }, [enhancedDispatch]),
    
    batchUpdate: useCallback((updates) => {
      enhancedDispatch({
        type: ACTION_TYPES.BATCH_UPDATE,
        payload: { updates }
      });
    }, [enhancedDispatch]),
    
    resetState: useCallback(() => {
      enhancedDispatch({ type: ACTION_TYPES.RESET_STATE });
    }, [enhancedDispatch])
  };
  
  // Debug utilities
  const debug = {
    getHistory: () => stateHistoryRef.current,
    clearHistory: () => { stateHistoryRef.current = []; },
    exportState: () => JSON.stringify(state, null, 2),
    importState: (stateJson) => {
      try {
        const importedState = JSON.parse(stateJson);
        actions.resetState();
        actions.batchUpdate([
          { type: ACTION_TYPES.BATCH_UPDATE, payload: { updates: [] } }
        ]);
      } catch (error) {
        console.error('Failed to import state:', error);
      }
    }
  };
  
  return {
    state,
    actions,
    dispatch: enhancedDispatch,
    debug: import.meta.env.DEV ? debug : null
  };
};

export default useAdvancedState;
