import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import enhancedEpisodeService from '../services/enhancedEpisodeService.js';
import { formatRating } from '../utils/ratingUtils.js';

// Animation variants for smooth transitions
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const episodeVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  },
  hover: {
    y: -5,
    scale: 1.02,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  }
};

const EnhancedEpisodeList = ({ 
  tvId, 
  seasonNumber = null, 
  onEpisodeSelect = null, 
  onSeasonChange = null,
  initialSeason = null,
  showSearch = true,
  showStats = true,
  maxEpisodesPerPage = 20,
  className = ""
}) => {
  // State management
  const [episodes, setEpisodes] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEpisodes, setFilteredEpisodes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreEpisodes, setHasMoreEpisodes] = useState(false);
  const [seasonStats, setSeasonStats] = useState(null);
  const [sortBy, setSortBy] = useState('episode_number');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);
  const [episodeCache, setEpisodeCache] = useState(new Map());
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const cacheExpirationTime = 5 * 60 * 1000; // 5 minutes

  // Refs for intersection observer
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });

  const searchInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);
  const episodeListRef = useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Focus search on '/' key
      if (e.key === '/' && showSearch && !e.target.matches('input, textarea')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // Clear search on 'Escape' key
      if (e.key === 'Escape' && searchTerm) {
        e.preventDefault();
        handleSearch('');
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [searchTerm, showSearch, handleSearch]);

  // Debounced search function
  const debouncedSearch = useCallback((term, delay = 500) => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearchImmediate(term);
    }, delay);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Memoized filtered episodes
  const displayEpisodes = useMemo(() => {
    if (!filteredEpisodes.length) return [];
    
    if (showAllEpisodes) {
      return filteredEpisodes;
    }
    
    return filteredEpisodes.slice(0, maxEpisodesPerPage);
  }, [filteredEpisodes, showAllEpisodes, maxEpisodesPerPage]);

  // Initialize component
  useEffect(() => {
    if (!tvId) return;
    
    const initializeComponent = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch all seasons metadata first
        const seasonsData = await enhancedEpisodeService.getAllSeasons(tvId);
        setSeasons(seasonsData);
        
        // Set initial season
        let targetSeason = initialSeason;
        if (!targetSeason && seasonsData.length > 0) {
          // Find the latest non-special season, or fall back to the last season
          const latestNonSpecial = seasonsData.find(s => !s.is_special && s.season_number > 0);
          targetSeason = latestNonSpecial || seasonsData[seasonsData.length - 1];
        }
        
        if (targetSeason) {
          setCurrentSeason(targetSeason);
          await loadSeasonEpisodes(targetSeason.season_number);
        }
      } catch (err) {
        console.error('Error initializing episode list:', err);
        setError('Failed to load episodes');
      } finally {
        setLoading(false);
      }
    };

    initializeComponent();
  }, [tvId, initialSeason]);

  // Load episodes for a specific season
  const loadSeasonEpisodes = useCallback(async (seasonNum) => {
    if (!tvId || !seasonNum) return;
    
    setLoadingEpisodes(true);
    setError(null);
    setCurrentPage(1);
    setSearchTerm('');
    
    try {
      // Check cache first
      const cacheKey = `episodes_${tvId}_${seasonNum}`;
      const cached = episodeCache.get(cacheKey);
      
      // Check if cache is still valid
      const isCacheValid = cached && (Date.now() - cached.timestamp) < cacheExpirationTime;
      
      if (isCacheValid) {
        setEpisodes(cached.data);
        setFilteredEpisodes(cached.data);
        setHasMoreEpisodes(cached.data.length > maxEpisodesPerPage);
      } else {
        // Fetch from API
        const seasonData = await enhancedEpisodeService.getSeason(tvId, seasonNum);
        const episodesData = seasonData.episodes || [];
        
        setEpisodes(episodesData);
        setFilteredEpisodes(episodesData);
        setHasMoreEpisodes(episodesData.length > maxEpisodesPerPage);
        
        // Cache the episodes with timestamp
        setEpisodeCache(prev => {
          const newCache = new Map(prev);
          newCache.set(cacheKey, {
            data: episodesData,
            timestamp: Date.now()
          });
          return newCache;
        });
      }
      
      // Load season stats
      if (showStats) {
        try {
          const stats = await enhancedEpisodeService.getSeasonStats(tvId, seasonNum);
          setSeasonStats(stats);
        } catch (statsError) {
          console.warn('Failed to load season stats:', statsError);
        }
      }
      
      // Reset retry count on successful load
      setRetryCount(0);
      
    } catch (err) {
      console.error(`Error loading episodes for season ${seasonNum}:`, err);
      setError('Failed to load episodes. Please try again.');
      setEpisodes([]);
      setFilteredEpisodes([]);
    } finally {
      setLoadingEpisodes(false);
    }
  }, [tvId, maxEpisodesPerPage, showStats, episodeCache, cacheExpirationTime]);

  // Handle season change
  const handleSeasonChange = useCallback(async (season) => {
    setCurrentSeason(season);
    await loadSeasonEpisodes(season.season_number);
    onSeasonChange?.(season);
  }, [loadSeasonEpisodes, onSeasonChange]);

  // Handle episode selection
  const handleEpisodeClick = useCallback((episode) => {
    onEpisodeSelect?.(episode, currentSeason);
  }, [onEpisodeSelect, currentSeason]);

  // Search episodes (immediate version for debounced calls)
  const handleSearchImmediate = useCallback(async (term) => {
    if (!term.trim()) {
      setFilteredEpisodes(episodes);
      setCurrentPage(1);
      return;
    }
    
    try {
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      const searchResults = await enhancedEpisodeService.searchEpisodes(
        tvId, 
        currentSeason.season_number, 
        term,
        { signal: abortControllerRef.current.signal }
      );
      setFilteredEpisodes(searchResults);
      setCurrentPage(1);
    } catch (err) {
      // Ignore aborted requests
      if (err.name === 'AbortError') {
        return;
      }
      
      console.error('Error searching episodes:', err);
      // Fallback to client-side search
      const filtered = episodes.filter(episode => 
        episode.name?.toLowerCase().includes(term.toLowerCase()) ||
        episode.overview?.toLowerCase().includes(term.toLowerCase()) ||
        episode.episode_number?.toString().includes(term)
      );
      setFilteredEpisodes(filtered);
    }
  }, [tvId, currentSeason, episodes]);

  // Search episodes (wrapper with debounce)
  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    debouncedSearch(term);
  }, [debouncedSearch]);

  // Sort episodes
  const handleSort = useCallback((newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    
    const sorted = [...filteredEpisodes].sort((a, b) => {
      const aValue = a[newSortBy] || 0;
      const bValue = b[newSortBy] || 0;
      return newSortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
    
    setFilteredEpisodes(sorted);
  }, [filteredEpisodes]);

  // Load more episodes (for progressive loading)
  useEffect(() => {
    if (inView && hasMoreEpisodes && !loadingEpisodes && !showAllEpisodes) {
      setShowAllEpisodes(true);
    }
  }, [inView, hasMoreEpisodes, loadingEpisodes, showAllEpisodes]);

  // Episode card component (Memoized)
  const EpisodeCard = memo(({ episode, index }) => (
    <motion.div
      variants={episodeVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer group"
      onClick={() => handleEpisodeClick(episode)}
      role="button"
      tabIndex={0}
      aria-label={`Episode ${episode.episode_number}: ${episode.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleEpisodeClick(episode);
        }
      }}
    >
      <div className="flex">
        {/* Episode still image */}
        <div className="w-32 h-20 flex-shrink-0 relative">
          {episode.still_path ? (
            <img
              src={episode.still_path}
              alt={episode.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
              <span className="text-gray-400 text-xs">No Image</span>
            </div>
          )}
          <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
            E{episode.episode_number}
          </div>
        </div>
        
        {/* Episode details */}
        <div className="flex-1 p-3">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-sm text-white group-hover:text-blue-400 transition-colors">
              {episode.name}
            </h4>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {episode.formatted_runtime && (
                <span>{episode.formatted_runtime}</span>
              )}
              {episode.rating_percentage > 0 && (
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span>{episode.rating_percentage}%</span>
                </div>
              )}
            </div>
          </div>
          
          {episode.has_overview && (
            <p className="text-xs text-gray-300 line-clamp-2 mb-2">
              {episode.overview}
            </p>
          )}
          
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{episode.formatted_air_date}</span>
            {episode.guest_stars?.length > 0 && (
              <span className="text-blue-400">
                {episode.guest_stars.length} guest star{episode.guest_stars.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  ));

  // Season selector component (Memoized)
  const SeasonSelector = memo(() => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Seasons</h3>
        {currentSeason && (
          <span className="text-sm text-gray-400">
            {currentSeason.episode_count} episodes
          </span>
        )}
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2 horizontal-scroll-container" role="tablist" aria-label="Season selection">
        {seasons.map((season) => (
          <button
            key={season.season_number}
            onClick={() => handleSeasonChange(season)}
            role="tab"
            aria-selected={currentSeason?.season_number === season.season_number}
            aria-label={`${season.name}, ${season.episode_count} episodes`}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentSeason?.season_number === season.season_number
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
            }`}
          >
            {season.name}
            {season.is_latest && (
              <span className="ml-1 text-xs text-yellow-400" aria-label="Latest season">★</span>
            )}
          </button>
        ))}
      </div>
    </div>
  ));

  // Search and filter component (Memoized)
  const SearchAndFilter = memo(() => (
    <div className="mb-6 space-y-4">
      {/* Search bar */}
      {showSearch && (
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search episodes..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            aria-label="Search episodes"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => handleSearch('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      )}
      
      {/* Sort options */}
      <div className="flex items-center gap-4">
        <select
          value={sortBy}
          onChange={(e) => handleSort(e.target.value, sortOrder)}
          aria-label="Sort episodes by"
          className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="episode_number">Episode Number</option>
          <option value="air_date">Air Date</option>
          <option value="vote_average">Rating</option>
          <option value="runtime">Runtime</option>
          <option value="name">Title</option>
        </select>
        
        <button
          onClick={() => handleSort(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
          aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
          className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-white hover:bg-gray-700 transition-colors"
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>
    </div>
  ));

  // Season stats component (Memoized)
  const SeasonStats = memo(() => {
    if (!showStats || !seasonStats) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-4 bg-gray-800 rounded-lg"
        role="region"
        aria-label="Season statistics"
      >
        <h4 className="text-sm font-medium text-white mb-3">Season Statistics</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-gray-400">Total Episodes</div>
            <div className="text-white font-medium">{seasonStats.total_episodes}</div>
          </div>
          <div>
            <div className="text-gray-400">Average Rating</div>
            <div className="text-white font-medium">
              {seasonStats.average_rating > 0 ? formatRating(seasonStats.average_rating) : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Total Runtime</div>
            <div className="text-white font-medium">
              {Math.floor(seasonStats.total_runtime / 60)}h {seasonStats.total_runtime % 60}m
            </div>
          </div>
          <div>
            <div className="text-gray-400">Avg Runtime</div>
            <div className="text-white font-medium">
              {Math.floor(seasonStats.average_runtime)}m
            </div>
          </div>
        </div>
      </motion.div>
    );
  });

  // Loading component with skeleton
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  );

  // Loading skeleton for episodes
  const EpisodeListSkeleton = () => (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
          <div className="flex">
            <div className="w-32 h-20 bg-gray-700 flex-shrink-0"></div>
            <div className="flex-1 p-3 space-y-2">
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              <div className="h-3 bg-gray-700 rounded w-full"></div>
              <div className="h-3 bg-gray-700 rounded w-5/6"></div>
              <div className="flex justify-between">
                <div className="h-3 bg-gray-700 rounded w-20"></div>
                <div className="h-3 bg-gray-700 rounded w-16"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Error component with retry
  const ErrorMessage = () => (
    <div className="text-center py-8" role="alert" aria-live="polite">
      <div className="text-red-400 mb-2 text-4xl">⚠️</div>
      <p className="text-gray-400 mb-1">{error}</p>
      {retryCount < maxRetries && (
        <p className="text-gray-500 text-sm mb-4">
          Retry attempt {retryCount} of {maxRetries}
        </p>
      )}
      <button
        onClick={() => {
          setRetryCount(prev => prev + 1);
          loadSeasonEpisodes(currentSeason?.season_number);
        }}
        disabled={retryCount >= maxRetries}
        className={`mt-4 px-4 py-2 rounded-lg transition-colors ${
          retryCount >= maxRetries
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {retryCount >= maxRetries ? 'Max retries reached' : 'Retry'}
      </button>
    </div>
  );

  // Empty state component
  const EmptyState = () => (
    <div className="text-center py-8" role="status" aria-live="polite">
      <div className="text-gray-400 mb-2 text-4xl">📺</div>
      <p className="text-gray-400">
        {searchTerm ? 'No episodes found matching your search.' : 'No episodes available for this season.'}
      </p>
      {searchTerm && (
        <button
          onClick={() => handleSearch('')}
          className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Clear Search
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <EpisodeListSkeleton />
      </div>
    );
  }

  if (error) {
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
      
      {/* Episodes List */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-3"
        role="list"
        aria-label="Episodes list"
      >
        {displayEpisodes.length > 0 ? (
          <>
            {displayEpisodes.map((episode, index) => (
              <div key={episode.id} role="listitem">
                <EpisodeCard episode={episode} index={index} />
              </div>
            ))}
            
            {/* Load more trigger */}
            {hasMoreEpisodes && !showAllEpisodes && (
              <div ref={loadMoreRef} className="h-10" aria-hidden="true" />
            )}
            
            {/* Show all episodes button */}
            {hasMoreEpisodes && !showAllEpisodes && (
              <button
                onClick={() => setShowAllEpisodes(true)}
                className="w-full py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={`Show all ${filteredEpisodes.length} episodes`}
              >
                Show All Episodes ({filteredEpisodes.length})
              </button>
            )}
          </>
        ) : (
          <EmptyState />
        )}
      </motion.div>
      
      {/* Loading more indicator */}
      {loadingEpisodes && (
        <LoadingSpinner />
      )}
    </div>
  );
};

// PropTypes for type checking
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
  className: PropTypes.string
};

export default EnhancedEpisodeList; 