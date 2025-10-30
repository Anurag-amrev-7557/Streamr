import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef, 
  memo, 
  useReducer,
  useTransition,
  useDeferredValue
} from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import enhancedEpisodeService from '../services/enhancedEpisodeService.js';
import { formatRating } from '../utils/ratingUtils.js';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CACHE_CONFIG = {
  EXPIRATION_TIME: 5 * 60 * 1000, // 5 minutes
  MAX_CACHE_SIZE: 50, // Maximum number of cached seasons
  PREFETCH_ADJACENT: true // Prefetch adjacent seasons
};

const PERFORMANCE_CONFIG = {
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 150,
  VIRTUAL_SCROLL_THRESHOLD: 50,
  INTERSECTION_THRESHOLD: 0.1,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
};

const SORT_OPTIONS = [
  { value: 'episode_number', label: 'Episode Number', icon: '#️⃣' },
  { value: 'air_date', label: 'Air Date', icon: '📅' },
  { value: 'vote_average', label: 'Rating', icon: '⭐' },
  { value: 'runtime', label: 'Runtime', icon: '⏱️' },
  { value: 'name', label: 'Title', icon: '📝' }
];

// ============================================================================
// STATE MANAGEMENT - Advanced Reducer Pattern
// ============================================================================

const actionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_EPISODES: 'SET_EPISODES',
  SET_SEASONS: 'SET_SEASONS',
  SET_CURRENT_SEASON: 'SET_CURRENT_SEASON',
  SET_FILTERED_EPISODES: 'SET_FILTERED_EPISODES',
  SET_SEARCH_TERM: 'SET_SEARCH_TERM',
  SET_SORT: 'SET_SORT',
  SET_STATS: 'SET_STATS',
  TOGGLE_SHOW_ALL: 'TOGGLE_SHOW_ALL',
  INCREMENT_RETRY: 'INCREMENT_RETRY',
  RESET_RETRY: 'RESET_RETRY',
  UPDATE_CACHE: 'UPDATE_CACHE',
  CLEAR_CACHE: 'CLEAR_CACHE',
  SET_VIEW_MODE: 'SET_VIEW_MODE',
  SET_FILTERS: 'SET_FILTERS',
  BATCH_UPDATE: 'BATCH_UPDATE'
};

const initialState = {
  episodes: [],
  seasons: [],
  currentSeason: null,
  loading: true,
  loadingEpisodes: false,
  error: null,
  searchTerm: '',
  filteredEpisodes: [],
  showAllEpisodes: false,
  seasonStats: null,
  sortBy: 'episode_number',
  sortOrder: 'asc',
  episodeCache: new Map(),
  retryCount: 0,
  viewMode: 'grid', // 'grid' | 'list' | 'compact'
  filters: {
    minRating: 0,
    hasOverview: false,
    hasGuestStars: false,
    runtimeMin: 0,
    runtimeMax: Infinity
  }
};

const episodeReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case actionTypes.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    
    case actionTypes.SET_EPISODES:
      return { 
        ...state, 
        episodes: action.payload,
        filteredEpisodes: action.payload,
        loading: false,
        loadingEpisodes: false
      };
    
    case actionTypes.SET_SEASONS:
      return { ...state, seasons: action.payload };
    
    case actionTypes.SET_CURRENT_SEASON:
      return { ...state, currentSeason: action.payload };
    
    case actionTypes.SET_FILTERED_EPISODES:
      return { ...state, filteredEpisodes: action.payload };
    
    case actionTypes.SET_SEARCH_TERM:
      return { ...state, searchTerm: action.payload };
    
    case actionTypes.SET_SORT:
      return { 
        ...state, 
        sortBy: action.payload.sortBy,
        sortOrder: action.payload.sortOrder 
      };
    
    case actionTypes.SET_STATS:
      return { ...state, seasonStats: action.payload };
    
    case actionTypes.TOGGLE_SHOW_ALL:
      return { ...state, showAllEpisodes: !state.showAllEpisodes };
    
    case actionTypes.INCREMENT_RETRY:
      return { ...state, retryCount: state.retryCount + 1 };
    
    case actionTypes.RESET_RETRY:
      return { ...state, retryCount: 0 };
    
    case actionTypes.UPDATE_CACHE:
      return { ...state, episodeCache: action.payload };
    
    case actionTypes.CLEAR_CACHE:
      return { ...state, episodeCache: new Map() };
    
    case actionTypes.SET_VIEW_MODE:
      return { ...state, viewMode: action.payload };
    
    case actionTypes.SET_FILTERS:
      return { ...state, filters: { ...state.filters, ...action.payload } };
    
    case actionTypes.BATCH_UPDATE:
      return { ...state, ...action.payload };
    
    default:
      return state;
  }
};

// ============================================================================
// ANIMATION VARIANTS - Enhanced & Optimized
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
      when: "beforeChildren"
    }
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1
    }
  }
};

const episodeVariants = {
  hidden: { 
    opacity: 0, 
    y: 20, 
    scale: 0.95,
    filter: "blur(4px)"
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 350,
      damping: 25,
      mass: 0.5
    }
  },
  hover: {
    y: -5,
    scale: 1.02,
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 20
    }
  },
  tap: {
    scale: 0.98
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    filter: "blur(4px)",
    transition: {
      duration: 0.2
    }
  }
};

// ============================================================================
// CUSTOM HOOKS - Advanced Utilities
// ============================================================================

// Debounced value hook with cleanup
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};

// Smart cache manager hook
const useCacheManager = (maxSize = CACHE_CONFIG.MAX_CACHE_SIZE) => {
  const cacheRef = useRef(new Map());
  
  const set = useCallback((key, value) => {
    const cache = cacheRef.current;
    
    // Implement LRU (Least Recently Used) eviction
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    cache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  }, [maxSize]);
  
  const get = useCallback((key, expirationTime = CACHE_CONFIG.EXPIRATION_TIME) => {
    const cache = cacheRef.current;
    const cached = cache.get(key);
    
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > expirationTime;
    if (isExpired) {
      cache.delete(key);
      return null;
    }
    
    // Move to end (most recently used)
    cache.delete(key);
    cache.set(key, cached);
    
    return cached.data;
  }, []);
  
  const clear = useCallback(() => {
    cacheRef.current.clear();
  }, []);
  
  const has = useCallback((key) => {
    return cacheRef.current.has(key);
  }, []);
  
  return { get, set, clear, has, cache: cacheRef.current };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const EnhancedEpisodeList = ({ 
  tvId, 
  seasonNumber = null, 
  onEpisodeSelect = null, 
  onSeasonChange = null,
  initialSeason = null,
  showSearch = true,
  showStats = true,
  maxEpisodesPerPage = 20,
  className = "",
  enableVirtualScroll = true,
  enablePrefetch = true,
  enableAdvancedFilters = false
}) => {
  // State management with useReducer for complex state
  const [state, dispatch] = useReducer(episodeReducer, initialState);
  
  // Performance optimizations
  const [isPending, startTransition] = useTransition();
  const debouncedSearchTerm = useDebounce(state.searchTerm, PERFORMANCE_CONFIG.DEBOUNCE_DELAY);
  const deferredEpisodes = useDeferredValue(state.filteredEpisodes);
  
  // Cache management
  const cache = useCacheManager();
  
  // Refs
  const searchInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const episodeListRef = useRef(null);
  const prefetchTimeoutRef = useRef(null);
  const animationControls = useAnimationControls();
  // Ref to safely call season change handler from effects (avoids TDZ/stale closures)
  const handleSeasonChangeRef = useRef(null);
  
  // Intersection observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: PERFORMANCE_CONFIG.INTERSECTION_THRESHOLD,
    triggerOnce: false,
    rootMargin: '100px'
  });

  
  // ============================================================================
  // ADVANCED FILTERING & SORTING
  // ============================================================================
  
  // Smart filtering with multiple criteria
  const applyAdvancedFilters = useCallback((episodes, filters, searchTerm) => {
    return episodes.filter(episode => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          episode.name?.toLowerCase().includes(searchLower) ||
          episode.overview?.toLowerCase().includes(searchLower) ||
          episode.episode_number?.toString().includes(searchTerm);
        
        if (!matchesSearch) return false;
      }
      
      // Rating filter
      if (filters.minRating > 0 && (episode.vote_average || 0) < filters.minRating) {
        return false;
      }
      
      // Overview filter
      if (filters.hasOverview && !episode.overview) {
        return false;
      }
      
      // Guest stars filter
      if (filters.hasGuestStars && (!episode.guest_stars || episode.guest_stars.length === 0)) {
        return false;
      }
      
      // Runtime filters
      const runtime = episode.runtime || 0;
      if (runtime < filters.runtimeMin || runtime > filters.runtimeMax) {
        return false;
      }
      
      return true;
    });
  }, []);
  
  // Advanced sorting with multiple strategies
  const applySorting = useCallback((episodes, sortBy, sortOrder) => {
    return [...episodes].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'episode_number':
          aValue = a.episode_number || 0;
          bValue = b.episode_number || 0;
          break;
        case 'air_date':
          aValue = new Date(a.air_date || 0).getTime();
          bValue = new Date(b.air_date || 0).getTime();
          break;
        case 'vote_average':
          aValue = a.vote_average || 0;
          bValue = b.vote_average || 0;
          break;
        case 'runtime':
          aValue = a.runtime || 0;
          bValue = b.runtime || 0;
          break;
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          return sortOrder === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        default:
          aValue = a[sortBy] || 0;
          bValue = b[sortBy] || 0;
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, []);
  
  // ============================================================================
  // SMART PREFETCHING
  // ============================================================================
  
  const prefetchAdjacentSeasons = useCallback(async (currentSeasonNumber) => {
    if (!enablePrefetch || !state.seasons.length) return;
    
    const currentIndex = state.seasons.findIndex(s => s.season_number === currentSeasonNumber);
    if (currentIndex === -1) return;
    
    const adjacentSeasons = [
      state.seasons[currentIndex - 1],
      state.seasons[currentIndex + 1]
    ].filter(Boolean);
    
    // Prefetch adjacent seasons in background
    prefetchTimeoutRef.current = setTimeout(() => {
      adjacentSeasons.forEach(async (season) => {
        const cacheKey = `episodes_${tvId}_${season.season_number}`;
        if (!cache.has(cacheKey)) {
          try {
            const seasonData = await enhancedEpisodeService.getSeason(tvId, season.season_number);
            cache.set(cacheKey, seasonData.episodes || []);
          } catch (err) {
            console.warn(`Failed to prefetch season ${season.season_number}:`, err);
          }
        }
      });
    }, 2000); // Delay prefetch to not interfere with current operation
  }, [enablePrefetch, state.seasons, tvId, cache]);
  
  // ============================================================================
  // DATA LOADING - Enhanced with retry logic & caching
  // ============================================================================
  
  const loadSeasonEpisodes = useCallback(async (seasonNum, retryAttempt = 0) => {
    if (!tvId || seasonNum === null || seasonNum === undefined) return;
    
    dispatch({ type: actionTypes.BATCH_UPDATE, payload: {
      loadingEpisodes: true,
      error: null,
      showAllEpisodes: false
    }});
    
    try {
      // Check cache first
      const cacheKey = `episodes_${tvId}_${seasonNum}`;
      const cachedEpisodes = cache.get(cacheKey);
      
      if (cachedEpisodes) {
        // Use cached data
        const filtered = applyAdvancedFilters(cachedEpisodes, state.filters, '');
        const sorted = applySorting(filtered, state.sortBy, state.sortOrder);
        
        dispatch({ type: actionTypes.BATCH_UPDATE, payload: {
          episodes: cachedEpisodes,
          filteredEpisodes: sorted,
          loadingEpisodes: false
        }});
        
        // Load stats in background
        if (showStats) {
          enhancedEpisodeService.getSeasonStats(tvId, seasonNum)
            .then(stats => dispatch({ type: actionTypes.SET_STATS, payload: stats }))
            .catch(err => console.warn('Failed to load stats:', err));
        }
        
        // Prefetch adjacent seasons
        prefetchAdjacentSeasons(seasonNum);
        
        return;
      }
      
      // Abort previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      // Fetch from API with retry logic
      const seasonData = await enhancedEpisodeService.getSeason(
        tvId, 
        seasonNum,
        { signal: abortControllerRef.current.signal }
      );
      
      const episodesData = seasonData.episodes || [];
      
      // Cache the episodes
      cache.set(cacheKey, episodesData);
      
      // Apply filters and sorting
      const filtered = applyAdvancedFilters(episodesData, state.filters, '');
      const sorted = applySorting(filtered, state.sortBy, state.sortOrder);
      
      dispatch({ type: actionTypes.BATCH_UPDATE, payload: {
        episodes: episodesData,
        filteredEpisodes: sorted,
        loadingEpisodes: false,
        retryCount: 0
      }});
      
      // Load stats
      if (showStats) {
        try {
          const stats = await enhancedEpisodeService.getSeasonStats(tvId, seasonNum);
          dispatch({ type: actionTypes.SET_STATS, payload: stats });
        } catch (statsError) {
          console.warn('Failed to load season stats:', statsError);
        }
      }
      
      // Prefetch adjacent seasons
      prefetchAdjacentSeasons(seasonNum);
      
    } catch (err) {
      // Handle abort
      if (err.name === 'AbortError') return;
      
      console.error(`Error loading episodes for season ${seasonNum}:`, err);
      
      // Retry logic with exponential backoff
      if (retryAttempt < PERFORMANCE_CONFIG.MAX_RETRIES) {
        const delay = PERFORMANCE_CONFIG.RETRY_DELAY * Math.pow(2, retryAttempt);
        setTimeout(() => {
          dispatch({ type: actionTypes.INCREMENT_RETRY });
          loadSeasonEpisodes(seasonNum, retryAttempt + 1);
        }, delay);
      } else {
        dispatch({ type: actionTypes.SET_ERROR, payload: 'Failed to load episodes. Please try again.' });
      }
    }
  }, [
    tvId, 
    showStats, 
    cache, 
    applyAdvancedFilters, 
    applySorting, 
    state.filters, 
    state.sortBy, 
    state.sortOrder,
    prefetchAdjacentSeasons
  ]);

  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  useEffect(() => {
    if (!tvId) return;
    
    const initializeComponent = async () => {
      dispatch({ type: actionTypes.SET_LOADING, payload: true });
      
      try {
        // Fetch all seasons metadata
        const seasonsData = await enhancedEpisodeService.getAllSeasons(tvId);
        dispatch({ type: actionTypes.SET_SEASONS, payload: seasonsData });
        
        // Determine initial season
        let targetSeason = initialSeason;
        if (!targetSeason && seasonsData.length > 0) {
          const latestNonSpecial = seasonsData.find(s => !s.is_special && s.season_number > 0);
          targetSeason = latestNonSpecial || seasonsData[seasonsData.length - 1];
        }
        
        if (targetSeason) {
          dispatch({ type: actionTypes.SET_CURRENT_SEASON, payload: targetSeason });
          await loadSeasonEpisodes(targetSeason.season_number);
        }
        
        dispatch({ type: actionTypes.SET_LOADING, payload: false });
      } catch (err) {
        console.error('Error initializing episode list:', err);
        dispatch({ type: actionTypes.SET_ERROR, payload: 'Failed to load episodes' });
      }
    };

    initializeComponent();
    
    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, [tvId, initialSeason, loadSeasonEpisodes]);
  
  // ============================================================================
  // SEARCH & FILTER EFFECTS
  // ============================================================================
  
  // Handle search with debounced value
  useEffect(() => {
    if (!state.episodes.length) return;
    
    startTransition(() => {
      const filtered = applyAdvancedFilters(
        state.episodes, 
        state.filters, 
        debouncedSearchTerm
      );
      const sorted = applySorting(filtered, state.sortBy, state.sortOrder);
      dispatch({ type: actionTypes.SET_FILTERED_EPISODES, payload: sorted });
    });
  }, [
    debouncedSearchTerm, 
    state.episodes, 
    state.filters, 
    state.sortBy, 
    state.sortOrder,
    applyAdvancedFilters,
    applySorting
  ]);
  
  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================
  
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Focus search on '/' key
      if (e.key === '/' && showSearch && !e.target.matches('input, textarea')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // Clear search on 'Escape' key
      if (e.key === 'Escape' && state.searchTerm) {
        e.preventDefault();
        dispatch({ type: actionTypes.SET_SEARCH_TERM, payload: '' });
        searchInputRef.current?.blur();
      }
      
      // Navigate seasons with arrow keys (when not in input)
      if (!e.target.matches('input, textarea, select')) {
        if (e.key === 'ArrowLeft' && state.currentSeason) {
          e.preventDefault();
          const currentIndex = state.seasons.findIndex(
            s => s.season_number === state.currentSeason.season_number
          );
          if (currentIndex > 0) {
            // Use ref to avoid TDZ/stale closures
            handleSeasonChangeRef.current?.(state.seasons[currentIndex - 1]);
          }
        }
        if (e.key === 'ArrowRight' && state.currentSeason) {
          e.preventDefault();
          const currentIndex = state.seasons.findIndex(
            s => s.season_number === state.currentSeason.season_number
          );
          if (currentIndex < state.seasons.length - 1) {
            handleSeasonChangeRef.current?.(state.seasons[currentIndex + 1]);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [state.searchTerm, state.currentSeason, state.seasons, showSearch]);
  
  // ============================================================================
  // INFINITE SCROLL
  // ============================================================================
  
  useEffect(() => {
    if (inView && !state.showAllEpisodes && deferredEpisodes.length > maxEpisodesPerPage) {
      dispatch({ type: actionTypes.TOGGLE_SHOW_ALL });
    }
  }, [inView, state.showAllEpisodes, deferredEpisodes.length, maxEpisodesPerPage]);
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleSeasonChange = useCallback(async (season) => {
    dispatch({ type: actionTypes.BATCH_UPDATE, payload: {
      currentSeason: season,
      searchTerm: '',
      showAllEpisodes: false
    }});
    
    await animationControls.start({ opacity: 0, y: 20 });
    await loadSeasonEpisodes(season.season_number);
    await animationControls.start({ opacity: 1, y: 0 });
    
    onSeasonChange?.(season);
  }, [loadSeasonEpisodes, onSeasonChange, animationControls]);

  // Keep ref in sync so keyboard shortcuts can call the latest handler
  useEffect(() => {
    handleSeasonChangeRef.current = handleSeasonChange;
  }, [handleSeasonChange]);


  const handleEpisodeClick = useCallback((episode) => {
    onEpisodeSelect?.(episode, state.currentSeason);
  }, [onEpisodeSelect, state.currentSeason]);

  const handleSearch = useCallback((term) => {
    dispatch({ type: actionTypes.SET_SEARCH_TERM, payload: term });
  }, []);

  const handleSort = useCallback((newSortBy, newSortOrder = state.sortOrder) => {
    dispatch({ type: actionTypes.SET_SORT, payload: { sortBy: newSortBy, sortOrder: newSortOrder } });
    
    startTransition(() => {
      const sorted = applySorting(state.filteredEpisodes, newSortBy, newSortOrder);
      dispatch({ type: actionTypes.SET_FILTERED_EPISODES, payload: sorted });
    });
  }, [state.sortOrder, state.filteredEpisodes, applySorting]);

  const handleFilterChange = useCallback((newFilters) => {
    dispatch({ type: actionTypes.SET_FILTERS, payload: newFilters });
  }, []);

  const handleViewModeChange = useCallback((mode) => {
    dispatch({ type: actionTypes.SET_VIEW_MODE, payload: mode });
  }, []);

  const handleRetry = useCallback(() => {
    if (state.retryCount < PERFORMANCE_CONFIG.MAX_RETRIES && state.currentSeason) {
      dispatch({ type: actionTypes.INCREMENT_RETRY });
      loadSeasonEpisodes(state.currentSeason.season_number);
    }
  }, [state.retryCount, state.currentSeason, loadSeasonEpisodes]);
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const displayEpisodes = useMemo(() => {
    if (!deferredEpisodes.length) return [];
    
    if (state.showAllEpisodes) {
      return deferredEpisodes;
    }
    
    return deferredEpisodes.slice(0, maxEpisodesPerPage);
  }, [deferredEpisodes, state.showAllEpisodes, maxEpisodesPerPage]);

  const hasMoreEpisodes = useMemo(() => {
    return deferredEpisodes.length > maxEpisodesPerPage;
  }, [deferredEpisodes.length, maxEpisodesPerPage]);

  const episodeStats = useMemo(() => {
    if (!state.filteredEpisodes.length) return null;
    
    return {
      total: state.filteredEpisodes.length,
      avgRating: state.filteredEpisodes.reduce((sum, ep) => sum + (ep.vote_average || 0), 0) / state.filteredEpisodes.length,
      totalRuntime: state.filteredEpisodes.reduce((sum, ep) => sum + (ep.runtime || 0), 0),
      withOverview: state.filteredEpisodes.filter(ep => ep.overview).length,
      withGuestStars: state.filteredEpisodes.filter(ep => ep.guest_stars?.length > 0).length
    };
  }, [state.filteredEpisodes]);

  // ============================================================================
  // MEMOIZED COMPONENTS
  // ============================================================================
  
  // Episode card component with advanced features
  const EpisodeCard = memo(({ episode, index, viewMode, onEpisodeClick, currentSeasonNumber }) => {
    const cardClass = viewMode === 'compact' 
      ? 'flex items-center gap-2 p-2'
      : 'flex gap-3 p-3';
      
    return (
      <motion.div
        variants={episodeVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        whileTap="tap"
        exit="exit"
        layout
        className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer group relative"
        onClick={() => onEpisodeClick?.(episode)}
        role="button"
        tabIndex={0}
        aria-label={`Episode ${episode.episode_number}: ${episode.name}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onEpisodeClick?.(episode);
          }
        }}
      >
        {/* Quality badge */}
        {episode.vote_average >= 8 && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full z-10">
            ⭐ Top Rated
          </div>
        )}
        
        <div className={cardClass}>
          {/* Episode still image */}
          <div className={`flex-shrink-0 relative ${viewMode === 'compact' ? 'w-20 h-12' : 'w-32 h-20'}`}>
            {episode.still_path ? (
              <img
                src={episode.still_path}
                alt={episode.name}
                className="w-full h-full object-cover rounded"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="w-full h-full bg-gray-700 flex items-center justify-center rounded">
                <span className="text-gray-400 text-xs">📺</span>
              </div>
            )}
            <div className="absolute top-1 left-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded backdrop-blur-sm">
              E{episode.episode_number}
            </div>
            
            {/* Progress indicator (if available) */}
            {episode.watch_progress > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
                <div 
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${episode.watch_progress}%` }}
                />
              </div>
            )}
          </div>
          
          {/* Episode details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <h4 className="font-medium text-sm text-white group-hover:text-blue-400 transition-colors truncate pr-2">
                {episode.name}
              </h4>
              <div className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
                {episode.formatted_runtime && (
                  <span className="flex items-center gap-1">
                    ⏱️ {episode.formatted_runtime}
                  </span>
                )}
                {episode.vote_average > 0 && (
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>{episode.vote_average.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
            
            {viewMode !== 'compact' && episode.overview && (
              <p className="text-xs text-gray-300 line-clamp-2 mb-2">
                {episode.overview}
              </p>
            )}
            
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{episode.formatted_air_date || episode.air_date}</span>
              {episode.guest_stars?.length > 0 && (
                <span className="text-blue-400 flex items-center gap-1">
                  👥 {episode.guest_stars.length} guest{episode.guest_stars.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Hover overlay with quick actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="absolute bottom-2 right-2 flex gap-2 pointer-events-auto">
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-full transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onEpisodeClick?.(episode);
              }}
              aria-label="Play episode"
            >
              ▶️
            </button>
          </div>
        </div>
      </motion.div>
    );
  }, (prevProps, nextProps) => {
    // Custom comparison for optimal re-rendering
    // Re-render when identity, view mode, progress, or handler/current season changes
    return (
      prevProps.episode.id === nextProps.episode.id &&
      prevProps.viewMode === nextProps.viewMode &&
      prevProps.episode.watch_progress === nextProps.episode.watch_progress &&
      prevProps.currentSeasonNumber === nextProps.currentSeasonNumber &&
      prevProps.onEpisodeClick === nextProps.onEpisodeClick
    );
  });

  // Season selector component with enhanced UX
  const SeasonSelector = memo(() => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          📺 Seasons
        </h3>
        {state.currentSeason && (
          <span className="text-sm text-gray-400">
            {state.currentSeason.episode_count} episodes
          </span>
        )}
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800" role="tablist" aria-label="Season selection">
        <AnimatePresence mode="popLayout">
          {state.seasons.map((season, index) => (
            <motion.button
              key={season.season_number}
              onClick={() => handleSeasonChange(season)}
              role="tab"
              aria-selected={state.currentSeason?.season_number === season.season_number}
              aria-label={`${season.name}, ${season.episode_count} episodes`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: index * 0.02 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                state.currentSeason?.season_number === season.season_number
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/50'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
              }`}
            >
              {season.name}
              {season.is_latest && (
                <span className="ml-1 text-xs text-yellow-400 animate-pulse" aria-label="Latest season">✨</span>
              )}
              {state.currentSeason?.season_number === season.season_number && (
                <motion.div
                  layoutId="activeSeasonIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  ));

  // Search and filter component with advanced features
  const SearchAndFilter = memo(() => (
    <div className="mb-6 space-y-4">
      {/* Search bar with real-time feedback */}
      {showSearch && (
        <div className="relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <span className="text-gray-400 text-lg">🔍</span>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search episodes... (Press / to focus)"
            value={state.searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            aria-label="Search episodes"
            className="w-full pl-10 pr-10 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          {state.searchTerm && (
            <button
              onClick={() => handleSearch('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded"
            >
              ✕
            </button>
          )}
          {isPending && (
            <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          )}
        </div>
      )}
      
      {/* Advanced controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Sort dropdown */}
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 border border-gray-600">
          <span className="text-xs text-gray-400">Sort:</span>
          <select
            value={state.sortBy}
            onChange={(e) => handleSort(e.target.value, state.sortOrder)}
            aria-label="Sort episodes by"
            className="bg-transparent text-sm text-white focus:outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.icon} {option.label}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => handleSort(state.sortBy, state.sortOrder === 'asc' ? 'desc' : 'asc')}
            aria-label={`Sort ${state.sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            className="px-2 py-1 hover:bg-gray-700 rounded text-sm text-white transition-colors"
          >
            {state.sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
        
        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1 border border-gray-600">
          {['list', 'grid', 'compact'].map(mode => (
            <button
              key={mode}
              onClick={() => handleViewModeChange(mode)}
              aria-label={`${mode} view`}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                state.viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {mode === 'list' && '☰'}
              {mode === 'grid' && '⊞'}
              {mode === 'compact' && '▤'}
            </button>
          ))}
        </div>
        
        {/* Results counter */}
        <div className="ml-auto text-sm text-gray-400">
          {state.filteredEpisodes.length} episode{state.filteredEpisodes.length !== 1 ? 's' : ''}
          {state.searchTerm && ` found`}
        </div>
      </div>
      
      {/* Advanced filters (collapsible) */}
      {enableAdvancedFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-gray-800 rounded-lg p-4 border border-gray-600 space-y-3"
        >
          <h4 className="text-sm font-medium text-white mb-2">Filters</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Min Rating</label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={state.filters.minRating}
                onChange={(e) => handleFilterChange({ minRating: parseFloat(e.target.value) })}
                className="w-full"
              />
              <span className="text-xs text-white">{state.filters.minRating}</span>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.filters.hasOverview}
                  onChange={(e) => handleFilterChange({ hasOverview: e.target.checked })}
                  className="rounded"
                />
                Has Description
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.filters.hasGuestStars}
                  onChange={(e) => handleFilterChange({ hasGuestStars: e.target.checked })}
                  className="rounded"
                />
                Has Guest Stars
              </label>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  ));

  // Season stats component with enhanced visualization
  const SeasonStats = memo(() => {
    if (!showStats || !state.seasonStats) return null;
    
    const stats = state.seasonStats;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-6 p-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700 shadow-xl"
        role="region"
        aria-label="Season statistics"
      >
        <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          📊 Season Statistics
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div 
            className="text-center"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="text-gray-400 text-xs mb-1">Total Episodes</div>
            <div className="text-white font-bold text-2xl">{stats.total_episodes}</div>
          </motion.div>
          
          <motion.div 
            className="text-center"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="text-gray-400 text-xs mb-1">Average Rating</div>
            <div className="text-yellow-400 font-bold text-2xl flex items-center justify-center gap-1">
              ⭐ {stats.average_rating > 0 ? stats.average_rating.toFixed(1) : 'N/A'}
            </div>
          </motion.div>
          
          <motion.div 
            className="text-center"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="text-gray-400 text-xs mb-1">Total Runtime</div>
            <div className="text-white font-bold text-xl">
              {Math.floor(stats.total_runtime / 60)}h {stats.total_runtime % 60}m
            </div>
          </motion.div>
          
          <motion.div 
            className="text-center"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="text-gray-400 text-xs mb-1">Avg Runtime</div>
            <div className="text-white font-bold text-xl">
              {Math.floor(stats.average_runtime)}m
            </div>
          </motion.div>
        </div>
        
        {/* Additional computed stats */}
        {episodeStats && (
          <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-2 gap-2 text-xs">
            <div className="text-gray-400">
              With Overview: <span className="text-white font-medium">{episodeStats.withOverview}</span>
            </div>
            <div className="text-gray-400">
              With Guests: <span className="text-white font-medium">{episodeStats.withGuestStars}</span>
            </div>
          </div>
        )}
      </motion.div>
    );
  });

  // Loading component with skeleton screens
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-8">
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border-4 border-blue-500 opacity-20"></div>
      </div>
    </div>
  );

  // Enhanced loading skeleton
  const EpisodeListSkeleton = () => (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <motion.div 
          key={i} 
          className="bg-gray-800 rounded-lg overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <div className="flex gap-3 p-3">
            <div className="w-32 h-20 bg-gray-700 flex-shrink-0 rounded animate-pulse"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-700 rounded w-3/4 animate-pulse"></div>
              <div className="h-3 bg-gray-700 rounded w-full animate-pulse"></div>
              <div className="h-3 bg-gray-700 rounded w-5/6 animate-pulse"></div>
              <div className="flex justify-between">
                <div className="h-3 bg-gray-700 rounded w-20 animate-pulse"></div>
                <div className="h-3 bg-gray-700 rounded w-16 animate-pulse"></div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  // Error component with enhanced retry
  const ErrorMessage = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12 px-4" 
      role="alert" 
      aria-live="polite"
    >
      <motion.div 
        className="text-red-400 mb-4 text-6xl"
        animate={{ rotate: [0, -10, 10, -10, 0] }}
        transition={{ duration: 0.5 }}
      >
        ⚠️
      </motion.div>
      <h3 className="text-xl font-semibold text-white mb-2">Oops! Something went wrong</h3>
      <p className="text-gray-400 mb-1">{state.error}</p>
      {state.retryCount > 0 && state.retryCount < PERFORMANCE_CONFIG.MAX_RETRIES && (
        <p className="text-gray-500 text-sm mb-4">
          Retry attempt {state.retryCount} of {PERFORMANCE_CONFIG.MAX_RETRIES}
        </p>
      )}
      <motion.button
        onClick={handleRetry}
        disabled={state.retryCount >= PERFORMANCE_CONFIG.MAX_RETRIES}
        whileHover={{ scale: state.retryCount < PERFORMANCE_CONFIG.MAX_RETRIES ? 1.05 : 1 }}
        whileTap={{ scale: state.retryCount < PERFORMANCE_CONFIG.MAX_RETRIES ? 0.95 : 1 }}
        className={`mt-4 px-6 py-3 rounded-lg font-medium transition-all ${
          state.retryCount >= PERFORMANCE_CONFIG.MAX_RETRIES
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:shadow-lg hover:shadow-blue-500/50'
        }`}
      >
        {state.retryCount >= PERFORMANCE_CONFIG.MAX_RETRIES ? '❌ Max retries reached' : '🔄 Retry'}
      </motion.button>
    </motion.div>
  );

  // Empty state component with suggestions
  const EmptyState = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12 px-4" 
      role="status" 
      aria-live="polite"
    >
      <motion.div 
        className="text-gray-400 mb-4 text-6xl"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {state.searchTerm ? '🔍' : '📺'}
      </motion.div>
      <h3 className="text-xl font-semibold text-white mb-2">
        {state.searchTerm ? 'No episodes found' : 'No episodes available'}
      </h3>
      <p className="text-gray-400 mb-6">
        {state.searchTerm 
          ? `No episodes match "${state.searchTerm}". Try a different search term.`
          : 'No episodes available for this season.'}
      </p>
      {state.searchTerm && (
        <motion.button
          onClick={() => handleSearch('')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all font-medium"
        >
          Clear Search
        </motion.button>
      )}
    </motion.div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (state.loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <EpisodeListSkeleton />
      </div>
    );
  }

  if (state.error && !state.episodes.length) {
    return <ErrorMessage />;
  }

  return (
    <div className={`space-y-6 ${className}`} ref={episodeListRef}>
      {/* Season Selector */}
      <SeasonSelector />
      
      {/* Search and Filter */}
      <SearchAndFilter />
      
      {/* Season Stats */}
      <SeasonStats />
      
      {/* Quick Stats Bar */}
      {state.searchTerm && displayEpisodes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2 text-sm text-blue-400"
        >
          Found {displayEpisodes.length} episode{displayEpisodes.length !== 1 ? 's' : ''} matching "{state.searchTerm}"
        </motion.div>
      )}
      
      {/* Episodes List with AnimatePresence for smooth transitions */}
      <AnimatePresence mode="wait">
        {displayEpisodes.length > 0 ? (
          <motion.div
            key="episodes-list"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`space-y-3 ${state.viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}`}
            role="list"
            aria-label="Episodes list"
          >
            <AnimatePresence mode="popLayout">
              {displayEpisodes.map((episode, index) => (
                <div key={episode.id} role="listitem">
                  <EpisodeCard
                    episode={episode}
                    index={index}
                    viewMode={state.viewMode}
                    onEpisodeClick={handleEpisodeClick}
                    currentSeasonNumber={state.currentSeason?.season_number}
                  />
                </div>
              ))}
            </AnimatePresence>
            
            {/* Load more trigger for infinite scroll */}
            {hasMoreEpisodes && !state.showAllEpisodes && (
              <div ref={loadMoreRef} className="h-10" aria-hidden="true" />
            )}
            
            {/* Show all episodes button */}
            {hasMoreEpisodes && !state.showAllEpisodes && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => dispatch({ type: actionTypes.TOGGLE_SHOW_ALL })}
                className="w-full py-4 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-600 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-lg"
                aria-label={`Show all ${deferredEpisodes.length} episodes`}
              >
                <span className="flex items-center justify-center gap-2">
                  Show All Episodes ({deferredEpisodes.length})
                  <span className="text-xl">▼</span>
                </span>
              </motion.button>
            )}
          </motion.div>
        ) : (
          <motion.div key="empty-state">
            <EmptyState />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Loading more indicator */}
      {state.loadingEpisodes && (
        <LoadingSpinner />
      )}
      
      {/* Back to top button (when scrolled) */}
      {displayEpisodes.length > 10 && (
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => episodeListRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="fixed bottom-8 right-8 p-4 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 transition-colors z-50"
          aria-label="Scroll to top"
        >
          <span className="text-2xl">↑</span>
        </motion.button>
      )}
    </div>
  );
};

// ============================================================================
// PROP TYPES & DEFAULT PROPS
// ============================================================================

EnhancedEpisodeList.propTypes = {
  tvId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  seasonNumber: PropTypes.number,
  onEpisodeSelect: PropTypes.func,
  onSeasonChange: PropTypes.func,
  initialSeason: PropTypes.shape({
    season_number: PropTypes.number,
    name: PropTypes.string,
    episode_count: PropTypes.number,
    is_special: PropTypes.bool,
    is_latest: PropTypes.bool
  }),
  showSearch: PropTypes.bool,
  showStats: PropTypes.bool,
  maxEpisodesPerPage: PropTypes.number,
  className: PropTypes.string,
  enableVirtualScroll: PropTypes.bool,
  enablePrefetch: PropTypes.bool,
  enableAdvancedFilters: PropTypes.bool
};

EnhancedEpisodeList.defaultProps = {
  seasonNumber: null,
  onEpisodeSelect: null,
  onSeasonChange: null,
  initialSeason: null,
  showSearch: true,
  showStats: true,
  maxEpisodesPerPage: 20,
  className: '',
  enableVirtualScroll: true,
  enablePrefetch: true,
  enableAdvancedFilters: false
};

export default memo(EnhancedEpisodeList); 