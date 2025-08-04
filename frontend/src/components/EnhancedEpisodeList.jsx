import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  seasonNumber, 
  onEpisodeSelect, 
  onSeasonChange,
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

  // Refs for intersection observer
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });

  const searchInputRef = useRef(null);

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
      
      if (cached) {
        setEpisodes(cached);
        setFilteredEpisodes(cached);
        setHasMoreEpisodes(cached.length > maxEpisodesPerPage);
      } else {
        // Fetch from API
        const seasonData = await enhancedEpisodeService.getSeason(tvId, seasonNum);
        const episodesData = seasonData.episodes || [];
        
        setEpisodes(episodesData);
        setFilteredEpisodes(episodesData);
        setHasMoreEpisodes(episodesData.length > maxEpisodesPerPage);
        
        // Cache the episodes
        setEpisodeCache(prev => new Map(prev).set(cacheKey, episodesData));
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
      
    } catch (err) {
      console.error(`Error loading episodes for season ${seasonNum}:`, err);
      setError('Failed to load episodes');
      setEpisodes([]);
      setFilteredEpisodes([]);
    } finally {
      setLoadingEpisodes(false);
    }
  }, [tvId, maxEpisodesPerPage, showStats, episodeCache]);

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

  // Search episodes
  const handleSearch = useCallback(async (term) => {
    setSearchTerm(term);
    
    if (!term.trim()) {
      setFilteredEpisodes(episodes);
      setCurrentPage(1);
      return;
    }
    
    try {
      const searchResults = await enhancedEpisodeService.searchEpisodes(
        tvId, 
        currentSeason.season_number, 
        term
      );
      setFilteredEpisodes(searchResults);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error searching episodes:', err);
      // Fallback to client-side search
      const filtered = episodes.filter(episode => 
        episode.name.toLowerCase().includes(term.toLowerCase()) ||
        episode.overview.toLowerCase().includes(term.toLowerCase()) ||
        episode.episode_number.toString().includes(term)
      );
      setFilteredEpisodes(filtered);
    }
  }, [tvId, currentSeason, episodes]);

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

  // Episode card component
  const EpisodeCard = ({ episode, index }) => (
    <motion.div
      variants={episodeVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer group"
      onClick={() => handleEpisodeClick(episode)}
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
  );

  // Season selector component
  const SeasonSelector = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Seasons</h3>
        {currentSeason && (
          <span className="text-sm text-gray-400">
            {currentSeason.episode_count} episodes
          </span>
        )}
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2">
        {seasons.map((season) => (
          <button
            key={season.season_number}
            onClick={() => handleSeasonChange(season)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentSeason?.season_number === season.season_number
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
            }`}
          >
            {season.name}
            {season.is_latest && (
              <span className="ml-1 text-xs text-yellow-400">★</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  // Search and filter component
  const SearchAndFilter = () => (
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
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => handleSearch('')}
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
          className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-white hover:bg-gray-700 transition-colors"
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>
    </div>
  );

  // Season stats component
  const SeasonStats = () => {
    if (!showStats || !seasonStats) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-4 bg-gray-800 rounded-lg"
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
  };

  // Loading component
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  );

  // Error component
  const ErrorMessage = () => (
    <div className="text-center py-8">
      <div className="text-red-400 mb-2">⚠️</div>
      <p className="text-gray-400">{error}</p>
      <button
        onClick={() => loadSeasonEpisodes(currentSeason?.season_number)}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Retry
      </button>
    </div>
  );

  // Empty state component
  const EmptyState = () => (
    <div className="text-center py-8">
      <div className="text-gray-400 mb-2">📺</div>
      <p className="text-gray-400">
        {searchTerm ? 'No episodes found matching your search.' : 'No episodes available for this season.'}
      </p>
    </div>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
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
      >
        {displayEpisodes.length > 0 ? (
          <>
            {displayEpisodes.map((episode, index) => (
              <EpisodeCard key={episode.id} episode={episode} index={index} />
            ))}
            
            {/* Load more trigger */}
            {hasMoreEpisodes && !showAllEpisodes && (
              <div ref={loadMoreRef} className="h-10" />
            )}
            
            {/* Show all episodes button */}
            {hasMoreEpisodes && !showAllEpisodes && (
              <button
                onClick={() => setShowAllEpisodes(true)}
                className="w-full py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
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

export default EnhancedEpisodeList; 