import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  getTrendingMovies, 
  getPopularMovies, 
  getTopRatedMovies, 
  getGenres, 
  getMovieDetails,
  searchMovies,
  getNetflixMovies,
  getNetflixMoviesByGenre,
  getMoviesByGenre,
  getMoviesByYear,
  fetchWithCache,
  TMDB_BASE_URL,
  TMDB_API_KEY,
  transformMovieData,
  getUpcomingMovies,
  getMoviesByCategory,
  discoverMovies,
  getSimilarMovies,
  getNowPlayingMovies
} from '../services/tmdbService';
import { useLoading } from '../contexts/LoadingContext';
const MovieDetailsOverlay = lazy(() => import('./MovieDetailsOverlay'));
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { debounce } from 'lodash';
import { useWatchlist } from '../contexts/WatchlistContext';
const EnhancedSearchBar = lazy(() => import('./EnhancedSearchBar'));
import searchHistoryService from '../services/searchHistoryService';
import { getPosterProps, getBackdropProps, getTmdbImageUrl } from '../utils/imageUtils';
import RatingBadge from './RatingBadge';

const fadeInAnimation = {
  '@keyframes fadeIn': {
    '0%': {
      opacity: '0',
      transform: 'translateY(10px)'
    },
    '100%': {
      opacity: '1',
      transform: 'translateY(0)'
    }
  }
};

const styles = {
  ...fadeInAnimation,
  '.animate-fadeIn': {
    animation: 'fadeIn 0.5s ease-out forwards'
  }
};

const gridVariants = {
  hidden: { 
    opacity: 0,
    y: 10
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
      staggerChildren: 0.02,
      delayChildren: 0.05
    }
  }
};

const cardVariants = {
  hidden: { 
    opacity: 0,
    y: 10,
    scale: 0.98
  },
  visible: { 
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      mass: 0.8
    }
  }
};

const loadingVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      duration: 0.3
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
};

const MovieCard = memo(({ movie, index, onClick, onPrefetch }) => {
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const isBookmarked = watchlist.some(item => item.id === movie.id);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [prefetchComplete, setPrefetchComplete] = useState(false);
  const imgRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const prefetchTimeoutRef = useRef(null);
  
  // Touch event handling for mobile
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);
  const clickTimeoutRef = useRef(null);
  const isTouchDevice = useRef(false);

  // Detect touch device
  useEffect(() => {
    isTouchDevice.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    
    if (isBookmarked) {
      removeFromWatchlist(movie.id);
    } else {
      addToWatchlist({ ...movie, type: 'movie' });
    }
  };

  // Enhanced click handler for mobile
  const handleCardClick = useCallback((e) => {
    // Prevent double clicks
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      return;
    }

    // Set a timeout to prevent rapid successive clicks
    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null;
    }, 300);

    // Call the original onClick handler
    onClick(movie);
  }, [onClick, movie]);

  // Touch event handlers for mobile
  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStartRef.current) return;

    touchEndRef.current = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
      time: Date.now()
    };

    const start = touchStartRef.current;
    const end = touchEndRef.current;
    
    // Calculate touch distance and duration
    const distance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );
    const duration = end.time - start.time;

    // Only trigger click if it's a proper tap (not a swipe or long press)
    if (distance < 10 && duration < 300) {
      handleCardClick(e);
    }

    // Reset touch references
    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [handleCardClick]);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  const getImageUrl = () => {
    if (imageError) return null;
    const posterPath = movie.poster_path || movie.poster;
    if (!posterPath) return null;
    if (posterPath.startsWith('http')) return posterPath;
    return getPosterProps(movie, 'w500').src;
  };

  // Enhanced prefetching function
  const handlePrefetch = useCallback(async () => {
    if (prefetchComplete || isPrefetching) return;
    
    setIsPrefetching(true);
    
    try {
      // Prefetch movie details, similar movies, and higher resolution images
      const prefetchPromises = [];
      
      // Prefetch movie details if not already available
      if (!movie.runtime && !movie.budget && !movie.revenue) {
        prefetchPromises.push(
          getMovieDetails(movie.id, 'movie').catch(err => {
            console.warn(`Failed to prefetch details for movie ${movie.id}:`, err);
            return null;
          })
        );
      }
      
      // Prefetch similar movies
      prefetchPromises.push(
        getSimilarMovies(movie.id, 'movie', 1).catch(err => {
          console.warn(`Failed to prefetch similar movies for ${movie.id}:`, err);
          return null;
        })
      );
      
      // Prefetch higher resolution poster image
      const posterPath = movie.poster_path || movie.poster;
      if (posterPath && !posterPath.startsWith('http')) {
        const highResUrl = getTmdbImageUrl(posterPath, 'w780');
        prefetchPromises.push(
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(highResUrl);
            img.onerror = () => resolve(null);
            img.src = highResUrl;
          })
        );
      }
      
      // Prefetch backdrop image
      const backdropPath = movie.backdrop_path;
      if (backdropPath) {
        const backdropUrl = getTmdbImageUrl(backdropPath, 'w1280');
        prefetchPromises.push(
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(backdropUrl);
            img.onerror = () => resolve(null);
            img.src = backdropUrl;
          })
        );
      }
      
      // Execute all prefetch operations
      await Promise.allSettled(prefetchPromises);
      setPrefetchComplete(true);
      
      // Notify parent component about successful prefetch
      if (onPrefetch) {
        onPrefetch(movie.id);
      }
      
    } catch (error) {
      console.warn(`Prefetch failed for movie ${movie.id}:`, error);
    } finally {
      setIsPrefetching(false);
    }
  }, [movie.id, movie.runtime, movie.budget, movie.revenue, movie.poster_path, movie.poster, movie.backdrop_path, prefetchComplete, isPrefetching, onPrefetch]);

  // Handle mouse enter with debouncing - MEMORY LEAK FIX
  const handleMouseEnter = useCallback(() => {
    // FIXED: Add throttling to prevent rapid hover events
    const now = Date.now();
    const lastHoverTime = handleMouseEnter.lastCallTime || 0;
    const HOVER_THROTTLE = 1000; // FIXED: Increased from 500ms to 1000ms throttle
    
    if (now - lastHoverTime < HOVER_THROTTLE) {
      return; // Skip if hovered too recently
    }
    handleMouseEnter.lastCallTime = now;
    
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    // FIXED: Start prefetching after a short delay to avoid unnecessary requests
    hoverTimeoutRef.current = setTimeout(() => {
      handlePrefetch();
    }, 1000); // FIXED: Increased from 500ms to 1000ms delay
  }, [handlePrefetch, movie.id]);

  // Handle mouse leave - MEMORY LEAK FIX
  const handleMouseLeave = useCallback(() => {
    // Clear the hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    // Clear any prefetch timeout
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
      prefetchTimeoutRef.current = null;
    }
    
    // FIXED: Reset hover time to allow immediate re-hover
    handleMouseEnter.lastCallTime = 0;
  }, []);

  // Cleanup on unmount - MEMORY LEAK FIX
  useEffect(() => {
    return () => {
      // FIXED: Clear all timeouts
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
        prefetchTimeoutRef.current = null;
      }
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      
      // FIXED: Clear any pending prefetch operations
      if (imgRef.current) {
        imgRef.current = null;
      }
      
      // FIXED: Clear any pending image loads
      if (imgRef.current && imgRef.current.src) {
        imgRef.current.src = '';
      }
      
      // FIXED: Reset hover time
      handleMouseEnter.lastCallTime = 0;
      
      // FIXED: Clear any pending state updates
      setIsPrefetching(false);
      
      // Clear touch references
      touchStartRef.current = null;
      touchEndRef.current = null;
    };
  }, []);

  return (
    <motion.div
      key={`${movie.id}-${index}`}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      layoutId={`movie-${movie.id}`}
      className="group cursor-pointer transform relative touch-manipulation select-none"
      data-movie-id={movie.id}
      whileHover={{ 
        scale: 1.02, // FIXED: Reduced scale to reduce memory usage
        transition: {
          type: "tween", // FIXED: Changed from spring to tween for better performance
          duration: 0.2
        }
      }}
      onClick={handleCardClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      transition={{
        type: "tween", // FIXED: Changed from spring to tween for better performance
        duration: 0.2
      }}
    >
      {/* Prefetch indicator (subtle) - Removed to avoid visual distraction */}
      {/* {isPrefetching && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute top-1 left-1 z-20 w-2 h-2 bg-blue-500 rounded-full animate-pulse"
          title="Prefetching..."
        />
      )} */}
      
      <motion.div 
        layout
        className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 relative w-full"
      >
        {/* Rating Badge - top left */}
        <RatingBadge 
          rating={movie.vote_average || movie.rating} 
          position="top-left"
          size="default"
        />
        
        <AnimatePresence>
          <motion.button
            onClick={handleBookmarkClick}
            className="absolute top-2 right-2 z-10 p-2 bg-black/50 rounded-full transition-colors transition-opacity duration-300 hover:bg-black/70 opacity-0 group-hover:opacity-100"
            aria-label={isBookmarked ? "Remove from watchlist" : "Add to watchlist"}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isBookmarked ? (
              <motion.svg
                key="bookmarked"
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.2 }}
              >
                <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21L12 17.5 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" />
              </motion.svg>
            ) : (
              <motion.svg
                key="not-bookmarked"
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.2 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.5 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </motion.svg>
            )}
          </motion.button>
        </AnimatePresence>
        {!imageLoaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 bg-gray-800 flex items-center justify-center"
          >
            <div className="w-8 h-8 border-4 border-gray-600 border-t-white rounded-full animate-spin"></div>
          </motion.div>
        )}
        
        <motion.img
          ref={imgRef}
          src={getImageUrl() || `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="500" height="750" viewBox="0 0 500 750" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="500" height="750" fill="#1a1a1a"/>
              <path d="M250 300C277.614 300 300 277.614 300 250C300 222.386 277.614 200 250 200C222.386 200 200 222.386 200 250C200 277.614 222.386 300 250 300Z" fill="#333333"/>
              <path d="M350 450C350 483.137 323.137 510 290 510H210C176.863 510 150 483.137 150 450V350C150 316.863 176.863 290 210 290H290C323.137 290 350 316.863 350 350V450Z" fill="#333333"/>
              <path d="M250 400C250 400 230 370 210 370C190 370 170 400 170 400" stroke="#666666" stroke-width="4" stroke-linecap="round"/>
              <path d="M330 400C330 400 310 370 290 370C270 370 250 400 250 400" stroke="#666666" stroke-width="4" stroke-linecap="round"/>
              <text x="250" y="550" font-family="Arial" font-size="24" fill="#666666" text-anchor="middle">No Image Available</text>
              <text x="250" y="580" font-family="Arial" font-size="16" fill="#666666" text-anchor="middle">${movie.title}</text>
            </svg>
          `)}`}
          alt={movie.title}
          className={`w-full h-full object-cover ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          layout
          transition={{ duration: 0.1 }}
        />
        
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.1 }}
          className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3"
          layout
        >
          <motion.div className="text-white" layout>
            <h4 className="font-medium text-sm truncate">{movie.title}</h4>
            <p className="text-xs text-gray-300 flex items-center gap-1">
              {movie.release_date?.split('-')[0] || movie.year || 'N/A'} •
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-400 mr-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
                {movie.vote_average?.toFixed(1) || movie.rating || 'N/A'}
              </span>
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
});

const MoviesPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [sortBy, setSortBy] = useState('popularity');
  const [movies, setMovies] = useState([]);
  const [tempMovies, setTempMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { setLoadingState } = useLoading();
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [loadedImages, setLoadedImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadedSections, setLoadedSections] = useState({
    header: false,
    filters: false,
    movies: false
  });
  const observerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [scrollRootEl, setScrollRootEl] = useState(null);
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    root: null,
    rootMargin: '0px 0px 200px 0px',
    triggerOnce: false,
    delay: 100
  });
  const prevInViewRef = useRef(false);
  const currentScrollTopRef = useRef(0);
  const lastTriggerScrollTopRef = useRef(0);
  const MIN_SCROLL_DELTA_PX = 60;
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
  const [activeCategory, setActiveCategory] = useState('popular');
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const searchTimeoutRef = useRef(null);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);
  const [yearDropdownRef, setYearDropdownRef] = useState(null);
  const [genreDropdownRef, setGenreDropdownRef] = useState(null);
  const [searchHistoryItems, setSearchHistoryItems] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  
  // Enhanced prefetch state management with memory optimization
  const [prefetchedMovies, setPrefetchedMovies] = useState(new Set());
  const [prefetchCache, setPrefetchCache] = useState(new Map());
  const [prefetchStats, setPrefetchStats] = useState({
    totalPrefetched: 0,
    successfulPrefetches: 0,
    failedPrefetches: 0,
    cacheHits: 0
  });
  const prefetchQueueRef = useRef([]);
  const isProcessingPrefetchRef = useRef(false);
  const prefetchTimeoutRef = useRef(null);

  // Predictive prefetching based on viewport visibility
  const [visibleMovies, setVisibleMovies] = useState(new Set());
  const visibilityObserverRef = useRef(null);
  
  // Memory optimization: Limit cache size to prevent memory leaks
  const MAX_CACHE_SIZE = 100;
  const MAX_VISIBLE_MOVIES = 50;

  // Add back missing state variables
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const isMounted = useRef(true);
  const fetchInProgress = useRef(false);
  const previousMovies = useRef([]);
  const moviesRef = useRef([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingNextPage, setIsLoadingNextPage] = useState(false);
  const [nextPageMovies, setNextPageMovies] = useState([]);

  // Define fetchMovies function before useEffect hooks
  const fetchMovies = useCallback(async (category, pageNum = 1) => {
    if (fetchInProgress.current) {
      return;
    }
    fetchInProgress.current = true;
    try {
      if (pageNum === 1) {
        setLoading(true);
        setError(null);
      } else {
        setIsLoadingNextPage(true);
      }

      let response;
      let results = [];
      let totalPages = 1;

      // Check if we have filters applied (year or genre)
      if (selectedYear || selectedGenre) {
        
        // Use discoverMovies for filtered results with category-specific sorting
        const discoverParams = {
          page: pageNum,
          vote_count_gte: 10,
          include_adult: false
        };

        // Apply category-specific sorting and constraints
        switch (category) {
          case 'popular':
            discoverParams.sort_by = 'popularity.desc';
            break;
          case 'top_rated':
            discoverParams.sort_by = 'vote_average.desc';
            discoverParams.vote_count_gte = 50; // Higher threshold for top rated
            break;
          case 'upcoming':
            discoverParams.sort_by = 'release_date.asc';
            // Don't override year filter if user selected one
            if (!selectedYear) {
              const today = new Date();
              discoverParams.primary_release_date_gte = today.toISOString().split('T')[0];
            }
            break;
          case 'now_playing':
            discoverParams.sort_by = 'popularity.desc';
            // Don't override year filter if user selected one
            if (!selectedYear) {
              const today = new Date();
              const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
              discoverParams.primary_release_date_gte = thirtyDaysAgo.toISOString().split('T')[0];
              discoverParams.primary_release_date_lte = today.toISOString().split('T')[0];
            }
            break;
          default:
            discoverParams.sort_by = 'popularity.desc';
        }

        if (selectedYear) {
          discoverParams.primary_release_year = selectedYear;
        }

        if (selectedGenre && selectedGenre.id) {
          discoverParams.with_genres = selectedGenre.id;
        }

        response = await discoverMovies(discoverParams);
        results = response.movies || [];
        totalPages = response.totalPages || 1;
        
      } else {
        // Use category-based service functions for unfiltered results
        switch (category) {
          case 'popular':
            response = await getPopularMovies(pageNum);
            break;
          case 'top_rated':
            response = await getTopRatedMovies(pageNum);
            break;
          case 'upcoming':
            response = await getUpcomingMovies(pageNum);
            break;
          case 'now_playing':
            response = await getNowPlayingMovies(pageNum);
            break;
          default:
            response = await getPopularMovies(pageNum);
        }
        results = response.movies || response.results || [];
        totalPages = response.totalPages || response.total_pages || 1;
      }

      if (pageNum === 1) {
        setMovies(results);
      } else {
        setMovies(prevMovies => {
          // Proper deduplication to prevent duplicate content
          const existingIds = new Set(prevMovies.map(movie => movie.id));
          const uniqueNewMovies = results.filter(movie => !existingIds.has(movie.id));
          
          if (uniqueNewMovies.length === 0) {
            return prevMovies;
          }
          
          const updatedMovies = [...prevMovies, ...uniqueNewMovies];
          return updatedMovies;
        });
      }
      setHasMore(pageNum < totalPages);
      setCurrentPage(pageNum);
      setTotalPages(totalPages);
      setLoadedSections(prev => ({ ...prev, [category]: true }));
    } catch (err) {
      setError('Failed to load movies: ' + (err.message || 'Unknown error'));
    } finally {
      if (pageNum === 1) {
        setLoading(false);
      } else {
        setIsLoadingNextPage(false);
      }
      fetchInProgress.current = false;
    }
  }, [selectedYear, selectedGenre, activeCategory]);
  
  // Memory optimization: Clear fetchMovies callback on unmount
  useEffect(() => {
    return () => {
      // Reset fetch states on cleanup
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
      setLoading(false);
      setIsLoadingNextPage(false);
      
      // Clear any pending fetch operations
      if (isMounted.current) {
        isMounted.current = false;
      }
    };
  }, []);

  const handleCategoryChange = useCallback((category) => {
    // Prevent multiple rapid clicks
    if (activeCategory === category || isTransitioning) return;
    
    // Set transition state for smooth animations
    setIsTransitioning(true);
    
    // Reset all states when changing category
    setActiveCategory(category);
    setMovies([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    setLoading(true);
    setIsLoadingNextPage(false);
    setNextPageMovies([]);
    
    // Fetch movies for the new category immediately
    fetchMovies(category, 1);
    
    // Clear transition state after animation completes
    setTimeout(() => {
      setIsTransitioning(false);
    }, 400);
  }, [activeCategory, isTransitioning, fetchMovies]);
  
  // Memory optimization: Clear handleCategoryChange callback on unmount
  useEffect(() => {
    return () => {
      // Reset transition state on cleanup
      setIsTransitioning(false);
      
      // Clear any pending category changes
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
    };
  }, []);

  const handleGenreSelect = useCallback(async (genre) => {
    setSelectedGenre(genre);
    setGenreDropdownOpen(false);
    
    // Update URL with the new genre
    const searchParams = new URLSearchParams(window.location.search);
    if (genre) {
      searchParams.set('genre', genre.name.toLowerCase());
    } else {
      searchParams.delete('genre');
    }
    navigate(`?${searchParams.toString()}`, { replace: true });
  }, [navigate]);
  
  // Memory optimization: Clear handleGenreSelect callback on unmount
  useEffect(() => {
    return () => {
      // Reset genre state on cleanup
      setSelectedGenre(null);
      setGenreDropdownOpen(false);
      
      // Clear any pending genre operations
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
    };
  }, []);

  // Add URL parameter handling
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const category = searchParams.get('category');
    const genreParam = searchParams.get('genre');
    const yearParam = searchParams.get('year');
    
    if (category) {
      handleCategoryChange(category);
    }

    if (genreParam && genres.length > 0) {
      // Map genre names to their IDs
      const genreIdMap = {
        'action': 28,
        'adventure': 12,
        'animation': 16,
        'comedy': 35,
        'crime': 80,
        'documentary': 99,
        'drama': 18,
        'family': 10751,
        'fantasy': 14,
        'history': 36,
        'horror': 27,
        'music': 10402,
        'mystery': 9648,
        'romance': 10749,
        'sci-fi': 878,
        'tv movie': 10770,
        'thriller': 53,
        'war': 10752,
        'western': 37
      };

      const genreId = genreIdMap[genreParam.toLowerCase()];
      if (genreId) {
        const genreObj = genres.find(g => g.id === genreId);
        if (genreObj) {
          setSelectedGenre(genreObj);
        }
      }
    }

    if (yearParam) {
      const year = parseInt(yearParam);
      if (year && year >= 1900 && year <= new Date().getFullYear()) {
        setSelectedYear(year);
      }
    }
    
    return () => {
      // Cleanup function for URL parameter handling
      // Clear any pending URL operations
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
    };
  }, [window.location.search, genres]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      
      // Comprehensive cleanup on component unmount
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      
      if (visibilityObserverRef.current) {
        visibilityObserverRef.current.disconnect();
        visibilityObserverRef.current = null;
      }
      
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      
      // Clear all refs
      moviesRef.current = [];
      previousMovies.current = [];
      prefetchQueueRef.current = [];
      isProcessingPrefetchRef.current = false;
      fetchInProgress.current = false;
      
      // Clear prefetch timeout
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
        prefetchTimeoutRef.current = null;
      }
      
      // Clear large state objects
      setMovies([]);
      setSearchResults([]);
      setPrefetchedMovies(new Set());
      setPrefetchCache(new Map());
      setVisibleMovies(new Set());
      
      // Clear any remaining timeouts
      // Note: hoverTimeoutRef is handled by MovieCard components, prefetchTimeoutRef is handled here
      
      // Clear all state to prevent memory leaks
      setSearchQuery('');
      setSelectedGenre(null);
      setSelectedYear(null);
      setSortBy('popularity');
      setTempMovies([]);
      setSelectedMovie(null);
      setPage(1);
      setTotalPages(1);
      setIsLoadingMore(false);
      setShowGenreDropdown(false);
      setShowSortDropdown(false);
      setShowYearDropdown(false);
      setLoadedImages({});
      setLoading(true);
      setLoadedSections({
        header: false,
        filters: false,
        movies: false
      });
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      setSearchPage(1);
      setHasMoreSearchResults(false);
      setActiveCategory('popular');
      setHasMore(true);
      setError(null);
      setYearDropdownOpen(false);
      setGenreDropdownOpen(false);
      setSearchHistoryItems([]);
      setTrendingSearches([]);
      setPrefetchStats({
        totalPrefetched: 0,
        successfulPrefetches: 0,
        failedPrefetches: 0,
        cacheHits: 0
      });
      setIsTransitioning(false);
      setIsUpdating(false);
      setCurrentPage(1);
      setIsLoadingNextPage(false);
      setNextPageMovies([]);
      
    };
  }, []);

  // Add animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.3
      }
    }
  };

  // Define categories with exact TMDB API category IDs - Memoized for performance
  const categories = useMemo(() => [
    { id: 'popular', name: 'Popular' },
    { id: 'top_rated', name: 'Top Rated' },
    { id: 'upcoming', name: 'Upcoming' },
    { id: 'now_playing', name: 'Now Playing' }
  ], []);

  const getImageUrl = (path) => {
    if (!path) return null;
    return getPosterProps({ poster_path: path }, 'w500').src;
  };

  const handleImageLoad = (movieId) => {
    setLoadedImages(prev => ({
      ...prev,
      [movieId]: true
    }));
  };

  const handleImageError = (movieId) => {
    setLoadedImages(prev => ({
      ...prev,
      [movieId]: 'error'
    }));
  };







  const handleMovieClick = useCallback((movie) => {
    // If we have prefetched data, use it immediately
    const cachedData = prefetchCache.get(movie.id);
    if (cachedData?.details) {
      setSelectedMovie({
        ...movie,
        ...cachedData.details,
        similar: cachedData.similar?.results || []
      });
    } else {
      setSelectedMovie(movie);
    }
  }, [prefetchCache]);
  
  // Memory optimization: Clear handleMovieClick callback on unmount
  useEffect(() => {
    return () => {
      // Reset selected movie on cleanup
      setSelectedMovie(null);
      
      // Clear any cached movie data to free memory
      setPrefetchCache(new Map());
    };
  }, []);

  const handleCloseOverlay = useCallback(() => {
    setSelectedMovie(null);
  }, []);
  
  // Memory optimization: Clear handleCloseOverlay callback on unmount
  useEffect(() => {
    return () => {
      // Reset overlay state on cleanup
      setSelectedMovie(null);
      
      // Clear any pending overlay operations
      setIsTransitioning(false);
    };
  }, []);

  const handleSimilarMovieClick = useCallback((similarMovie) => {
    setSelectedMovie(similarMovie);
  }, []);
  
  // Memory optimization: Clear handleSimilarMovieClick callback on unmount
  useEffect(() => {
    return () => {
      // Reset similar movie state on cleanup
      setSelectedMovie(null);
      
      // Clear any cached similar movies data
      setPrefetchCache(prev => {
        const newCache = new Map();
        for (const [key, value] of prev.entries()) {
          if (value.similar) {
            newCache.set(key, { ...value, similar: null });
          } else {
            newCache.set(key, value);
          }
        }
        return newCache;
      });
    };
  }, []);

  // Fetch genres on component mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchGenres = async () => {
      try {
        const response = await getGenres();
        if (isMounted) {
          setGenres(response.genres || []);
        }
      } catch (error) {
        console.error('Error fetching genres:', error);
      }
    };
    
    fetchGenres();
    
    return () => {
      isMounted = false;
      
      // Clear genres on cleanup to prevent memory leaks
      setGenres([]);
      
      // Clear any pending genre fetch operations
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
    };
  }, []);

  // Reset fetchInProgress on component mount
  useEffect(() => {
    fetchInProgress.current = false;
    
    return () => {
      // Cleanup on unmount
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
      
      // Clear any pending search operations
      setIsSearching(false);
      setSearchError(null);
      
      // Clear any pending fetch operations
      setLoading(false);
      setIsLoadingNextPage(false);
    };
  }, []);



  // Load more movies
  const handleLoadMore = async () => {
    if (loading || currentPage >= totalPages) return;
    const nextPage = currentPage + 1;
    await fetchMovies(activeCategory, nextPage);
  };

  // Handle genre click
  const handleGenreChange = (genreId) => {
    setSelectedGenre(genreId);
    setShowGenreDropdown(false);
  };

  // Handle genre navigation from MovieDetailsOverlay
  const handleGenreNavigation = (genre) => {
    if (genre && genre.id) {
      setSelectedGenre(genre); // Set the full genre object, not just the ID
      setShowGenreDropdown(false);
      // Close the overlay
      setSelectedMovie(null);
    }
  };

  // Handle year click
  const handleYearChange = (year) => {
    setSelectedYear(year);
    setShowYearDropdown(false);
  };

  // Handle sort change
  const handleSortChange = (sort) => {
    setSortBy(sort);
    setPage(1);
  };

  const performSearch = async (query, pageNum = 1) => {
    
    if (!query.trim()) {
      setSearchResults([]);
      setHasMoreSearchResults(false);
      return;
    }

    try {
      setIsSearching(true);
      setError(null); // Clear any previous errors
      
      const response = await searchMovies(query, pageNum);
      
      
      
      if (pageNum === 1) {
        setSearchResults(response.results || []);
        
      } else {
        const newResults = (response.results || []).filter(newMovie => 
          !searchResults.some(existingMovie => existingMovie.id === newMovie.id)
        );
        setSearchResults(prev => [...prev, ...newResults]);
        
      }

      setHasMoreSearchResults(response.page < response.total_pages);
      
    } catch (err) {
      console.error('Error searching movies:', err);
      setError('Failed to search movies');
      setSearchResults([]);
      setHasMoreSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Memory optimization: Clear performSearch function on unmount
  useEffect(() => {
    return () => {
      // Reset search states on cleanup
      setIsSearching(false);
      setSearchError(null);
      setSearchResults([]);
      setHasMoreSearchResults(false);
      
      // Clear search timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, []);

  // Debounced search function - removed duplicate implementation
  // The EnhancedSearchBar now handles the search logic

  // Update the load more search results with memory optimization
  const loadMoreSearchResults = useCallback(async () => {
    if (!searchQuery.trim() || !hasMoreSearchResults || isSearching) return;

    try {
      setIsSearching(true);
      const nextPage = searchPage + 1;
      const response = await searchMovies(searchQuery, nextPage);

      if (response.results) {
        setSearchResults(prev => {
          const newResults = response.results.filter(newMovie => 
            !prev.some(existingMovie => existingMovie.id === newMovie.id)
          );
          const updatedResults = [...prev, ...newResults];
          
          // Memory optimization: Limit search results array size
          const MAX_SEARCH_RESULTS = 200;
          if (updatedResults.length > MAX_SEARCH_RESULTS) {
            return updatedResults.slice(-MAX_SEARCH_RESULTS);
          }
          
          return updatedResults;
        });
        setHasMoreSearchResults(response.page < response.total_pages);
        setSearchPage(nextPage);
      }
    } catch (error) {
      console.error('Error loading more search results:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, hasMoreSearchResults, isSearching, searchPage]);
  
  // Memory optimization: Clear loadMoreSearchResults callback on unmount
  useEffect(() => {
    return () => {
      // Reset search pagination states on cleanup
      setSearchPage(1);
      setHasMoreSearchResults(false);
      
      // Clear any pending search operations
      setIsSearching(false);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, []);

  // Update the intersection observer effect for search results
  useEffect(() => {
    if (inView && hasMoreSearchResults && !isSearching && searchQuery.trim()) {
      loadMoreSearchResults();
    }
    
    return () => {
      // Cleanup for search results intersection observer
      // No specific cleanup needed as the observer is managed by useInView
    };
  }, [inView, hasMoreSearchResults, isSearching, searchQuery, loadMoreSearchResults]);

  // Generate year options (last 10 years)
  const yearOptions = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  // Get selected genre name
  const getSelectedGenreName = () => {
    if (!selectedGenre) return 'Genre';
    const genre = genres.find(g => g.id === selectedGenre);
    return genre ? genre.name : 'Genre';
  };

  // Get selected sort name
  const getSelectedSortName = () => {
    switch (sortBy) {
      case 'popularity':
        return 'Popularity';
      case 'top_rated':
        return 'Top Rated';
      case 'trending':
        return 'Trending';
      default:
        return 'Sort by';
    }
  };

  // Progressive loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadedSections(prev => ({ ...prev, header: true }));
    }, 100);

    const filtersTimer = setTimeout(() => {
      setLoadedSections(prev => ({ ...prev, filters: true }));
    }, 300);

    const moviesTimer = setTimeout(() => {
      setLoadedSections(prev => ({ ...prev, movies: true }));
    }, 500);

    return () => {
      clearTimeout(timer);
      clearTimeout(filtersTimer);
      clearTimeout(moviesTimer);
      
      // Reset loaded sections on cleanup
      setLoadedSections({
        header: false,
        filters: false,
        movies: false
      });
      
      // Clear any pending loading operations
      setIsTransitioning(false);
    };
  }, []);

  // Load search history and trending searches
  useEffect(() => {
    const loadSearchData = () => {
      const history = searchHistoryService.getHistoryByType('movie');
      const trending = searchHistoryService.getTrendingSearches(5);
      
      setSearchHistoryItems(history.map(item => item.query));
      setTrendingSearches(trending);
    };

    loadSearchData();
    
    // Subscribe to history changes
    const unsubscribe = searchHistoryService.subscribe(() => {
      loadSearchData();
    });

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
      
      // Clear search data on cleanup
      setSearchHistoryItems([]);
      setTrendingSearches([]);
      
      // Clear any pending search operations
      setIsSearching(false);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, []);

  // Add click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setShowGenreDropdown(false);
        setShowYearDropdown(false);
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      
      // Close all dropdowns on cleanup
      setShowGenreDropdown(false);
      setShowYearDropdown(false);
      setShowSortDropdown(false);
      setGenreDropdownOpen(false);
      setYearDropdownOpen(false);
    };
  }, []);

  // Add escape key handler
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowGenreDropdown(false);
        setShowYearDropdown(false);
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      
      // Close all dropdowns on cleanup
      setShowGenreDropdown(false);
      setShowYearDropdown(false);
      setShowSortDropdown(false);
      setGenreDropdownOpen(false);
      setYearDropdownOpen(false);
    };
  }, []);

  // Update the filterMovies function to handle both regular movies and search results
  const filterMovies = useCallback((moviesToFilter) => {
    try {
      if (!moviesToFilter || !Array.isArray(moviesToFilter)) {
        return [];
      }
      
      // If we have year or genre filters applied, the API should have already filtered them
      // This function is now mainly used for search results
      return moviesToFilter.filter(movie => {
        if (!movie) return false;
        
        // For search results, we might still need to apply filters
        let matchesGenre = true;
        if (selectedGenre && selectedGenre.id) {
          matchesGenre = movie.genre_ids && Array.isArray(movie.genre_ids) && movie.genre_ids.includes(selectedGenre.id);
        }
        
        let matchesYear = true;
        if (selectedYear) {
          const movieYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
          matchesYear = movieYear && movieYear === parseInt(selectedYear);
        }
        
        return matchesGenre && matchesYear;
      });
    } catch (error) {
      console.error('Error in filterMovies:', error);
      return moviesToFilter || [];
    }
  }, [selectedGenre, selectedYear]);
  
  // Memory optimization: Clear filterMovies callback on unmount
  useEffect(() => {
    return () => {
      // Reset filter states on cleanup
      setSelectedGenre(null);
      setSelectedYear(null);
      
      // Clear any pending filter operations
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
    };
  }, []);

  // Get the current list of movies to display
  const getDisplayMovies = useCallback(() => {
    try {
      if (searchQuery.trim() && searchResults.length > 0) {
        // For search results, apply filters
        return filterMovies(searchResults);
      } else {
        // For regular movies, return them as-is since they're already filtered by the API
        return movies;
      }
    } catch (error){
      console.error('Error in getDisplayMovies:', error);
      return [];
    }
  }, [searchQuery, searchResults, movies, filterMovies]);
  
  // Memory optimization: Clear getDisplayMovies callback on unmount
  useEffect(() => {
    return () => {
      // Reset display states on cleanup
      setSearchQuery('');
      setSearchResults([]);
      setMovies([]);
      
      // Clear any pending display operations
      setIsTransitioning(false);
    };
  }, []);

  const handleYearSelect = useCallback(async (year) => {
    setSelectedYear(year);
    setYearDropdownOpen(false);
    
    // Update URL with the new year
    const searchParams = new URLSearchParams(window.location.search);
    if (year) {
      searchParams.set('year', year.toString());
    } else {
      searchParams.delete('year');
    }
    navigate(`?${searchParams.toString()}`, { replace: true });
  }, [navigate]);
  
  // Memory optimization: Clear handleYearSelect callback on unmount
  useEffect(() => {
    return () => {
      // Reset year state on cleanup
      setSelectedYear(null);
      setYearDropdownOpen(false);
      
      // Clear any pending year operations
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
    };
  }, []);

  // Update the useEffect that tracks movies state changes
  useEffect(() => {
    if (movies.length > 0) {
      moviesRef.current = movies;
    }
    
    return () => {
      // Cleanup movies reference on unmount
      moviesRef.current = [];
      previousMovies.current = [];
      
      // Clear any pending movie operations
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
    };
  }, [movies]);

  // Add effect to refetch movies when filters change
  useEffect(() => {
    // Only refetch if we're not in a search state
    if (!searchQuery.trim()) {
      setMovies([]);
      setPage(1);
      setHasMore(true);
      setError(null);
      setLoading(true);
      setIsLoadingNextPage(false);
      setNextPageMovies([]);
      
      fetchMovies(activeCategory, 1);
    }
    
    return () => {
      // Cleanup on filter change
      setNextPageMovies([]);
      setIsLoadingNextPage(false);
      
      // Clear any pending filter operations
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
    };
  }, [selectedYear, selectedGenre, activeCategory, searchQuery, fetchMovies]);

  // Initial load effect
  useEffect(() => {
    if (!searchQuery.trim() && movies.length === 0) {
      fetchMovies(activeCategory, 1);
    }
    
    return () => {
      // Cleanup on initial load effect unmount
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
      
      // Clear any pending initial load operations
      setLoading(false);
      setIsLoadingNextPage(false);
    };
  }, [fetchMovies, activeCategory, searchQuery, movies.length]);

  // Update the loadMoreMovies function with memory optimization
  const loadMoreMovies = useCallback(async () => {
    
    if (loading || !hasMore || fetchInProgress.current) {
      return;
    }
    
    fetchInProgress.current = true;
    // Keep both flags in sync: one gates requests, the other drives UI spinner
    setIsLoadingMore(true);
    setIsLoadingNextPage(true);
    
    try {
      const nextPage = currentPage + 1;
      let newMovies = [];
      
      // Use the same logic as fetchMovies for consistency
      if (selectedYear || selectedGenre) {
        // Use discoverMovies for filtered results with category-specific sorting
        const discoverParams = {
          page: nextPage,
          vote_count_gte: 10,
          include_adult: false
        };

        // Apply category-specific sorting and constraints
        switch (activeCategory) {
          case 'popular':
            discoverParams.sort_by = 'popularity.desc';
            break;
          case 'top_rated':
            discoverParams.sort_by = 'vote_average.desc';
            discoverParams.vote_count_gte = 50; // Higher threshold for top rated
            break;
          case 'upcoming':
            discoverParams.sort_by = 'release_date.asc';
            // Don't override year filter if user selected one
            if (!selectedYear) {
              const today = new Date();
              discoverParams.primary_release_date_gte = today.toISOString().split('T')[0];
            }
            break;
          case 'now_playing':
            discoverParams.sort_by = 'popularity.desc';
            // Don't override year filter if user selected one
            if (!selectedYear) {
              const today = new Date();
              const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
              discoverParams.primary_release_date_gte = thirtyDaysAgo.toISOString().split('T')[0];
              discoverParams.primary_release_date_lte = today.toISOString().split('T')[0];
            }
            break;
          default:
            discoverParams.sort_by = 'popularity.desc';
        }

        if (selectedYear) {
          discoverParams.primary_release_year = selectedYear;
        }

        if (selectedGenre && selectedGenre.id) {
          discoverParams.with_genres = selectedGenre.id;
        }

        const response = await discoverMovies(discoverParams);
        newMovies = response.movies || [];
        setHasMore(nextPage < response.totalPages);
        if (response.totalPages) {
          setTotalPages(response.totalPages);
        }
      } else {
        // Load more movies for current category
        const response = await getMoviesByCategory(activeCategory, nextPage);
        newMovies = response.movies || response.results || [];
        setHasMore(nextPage < (response.totalPages || response.total_pages || 1));
        if (response.totalPages || response.total_pages) {
          setTotalPages(response.totalPages || response.total_pages);
        }
      }
      
      if (newMovies.length > 0) {
        setMovies(prevMovies => {
          // Proper deduplication to prevent duplicate content
          const existingIds = new Set(prevMovies.map(movie => movie.id));
          const uniqueNewMovies = newMovies.filter(movie => !existingIds.has(movie.id));
          
          if (uniqueNewMovies.length === 0) {
            setHasMore(false);
            return prevMovies;
          }
          
          const updatedMovies = [...prevMovies, ...uniqueNewMovies];
          
          // Memory optimization: Limit movies array size to prevent memory leaks
          const MAX_MOVIES = 500;
          if (updatedMovies.length > MAX_MOVIES) {
            // Keep only the most recent movies
            return updatedMovies.slice(-MAX_MOVIES);
          }
          
          return updatedMovies;
        });
        // Advance page after successfully appending unique movies
        setCurrentPage(nextPage);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('🎬 Error loading more movies:', error);
      setError('Failed to load more movies: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoadingMore(false);
      setIsLoadingNextPage(false);
      fetchInProgress.current = false;
      // No special guard reset needed; conditions gate firing
    }
  }, [loading, hasMore, currentPage, selectedYear, selectedGenre, activeCategory]);
  
  // Memory optimization: Clear loadMoreMovies callback on unmount
  useEffect(() => {
    return () => {
      // Reset loading states on cleanup
      setIsLoadingMore(false);
      setIsLoadingNextPage(false);
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
      
      // Clear any pending load more operations
      setHasMore(false);
    };
  }, []);

  // Update the intersection observer effect with debouncing and user-scroll guard
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      
    }
    
    let timeoutId = null;
    
    if (
      inView &&
      hasMore &&
      !loading &&
      !isLoadingMore &&
      !fetchInProgress.current
    ) {
      loadMoreMovies();
    }
    
    return () => {
      // Cleanup for load more movies intersection observer
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // Clear any pending load more operations
      setIsLoadingMore(false);
      setIsLoadingNextPage(false);
    };
  }, [inView, hasMore, loading, isLoadingMore, loadMoreMovies]);

  // Update the movies grid section to use getDisplayMovies
  const displayMovies = useMemo(() => {
    return getDisplayMovies();
  }, [getDisplayMovies]);
  
  // Memory optimization: Clear displayMovies when component unmounts
  useEffect(() => {
    return () => {
      // Clear any pending display operations
      setIsTransitioning(false);
      
      // Clear any cached display data
      setLoadedImages({});
    };
  }, []);



  // Enhanced prefetch handling - MEMORY LEAK FIX
  const handlePrefetch = useCallback((movieId) => {
    // FIXED: Only update stats if not already prefetched to prevent rapid increases
    setPrefetchedMovies(prev => {
      if (prev.has(movieId)) {
        return prev; // Already prefetched, don't update stats
      }
      return new Set([...prev, movieId]);
    });
    
    // FIXED: Only increment stats if this is a new prefetch
    setPrefetchedMovies(prev => {
      if (!prev.has(movieId)) {
        setPrefetchStats(prevStats => ({
          ...prevStats,
          totalPrefetched: prevStats.totalPrefetched + 1,
          successfulPrefetches: prevStats.successfulPrefetches + 1
        }));
      }
      return prev;
    });
  }, []);
  
  // Memory optimization: Clear handlePrefetch callback on unmount
  useEffect(() => {
    return () => {
      // Reset prefetch states on cleanup
      setPrefetchedMovies(new Set());
      setPrefetchStats({
        totalPrefetched: 0,
        successfulPrefetches: 0,
        failedPrefetches: 0,
        cacheHits: 0
      });
      
      // Clear any pending prefetch operations
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
        prefetchTimeoutRef.current = null;
      }
    };
  }, []);

  // Intelligent prefetch queue processing with memory optimization
  const processPrefetchQueue = useCallback(async () => {
    if (isProcessingPrefetchRef.current || prefetchQueueRef.current.length === 0) {
      return;
    }

    isProcessingPrefetchRef.current = true;

    try {
      // Process up to 3 prefetch requests at a time
      const batchSize = 3;
      const batch = prefetchQueueRef.current.splice(0, batchSize);

      await Promise.allSettled(
        batch.map(async (queueItem) => {
          const { movieId } = queueItem;
          
          try {
            // Check if already in cache
            if (prefetchCache.has(movieId)) {
              setPrefetchStats(prev => ({
                ...prev,
                cacheHits: prev.cacheHits + 1
              }));
              return;
            }

            // Prefetch movie details and similar movies
            const [details, similar] = await Promise.allSettled([
              getMovieDetails(movieId, 'movie'),
              getSimilarMovies(movieId, 'movie', 1)
            ]);

            // Only cache if we have valid data
            const detailsValue = details.status === 'fulfilled' ? details.value : null;
            const similarValue = similar.status === 'fulfilled' ? similar.value : null;
            
            // Only cache if we have at least some data or if the movie is confirmed to not exist
            if (detailsValue || similarValue || (detailsValue === null && similarValue === null)) {
              setPrefetchCache(prev => {
                const newCache = new Map(prev);
                
                // Memory optimization: Limit cache size
                if (newCache.size >= MAX_CACHE_SIZE) {
                  // Remove oldest entries
                  const entries = Array.from(newCache.entries());
                  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
                  const toRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.2)); // Remove 20% of oldest entries
                  toRemove.forEach(([key]) => newCache.delete(key));
                }
                
                newCache.set(movieId, {
                  details: detailsValue,
                  similar: similarValue,
                  timestamp: Date.now()
                });
                
                return newCache;
              });
            }

            handlePrefetch(movieId);
          } catch (error) {
            console.warn(`Failed to prefetch movie ${movieId}:`, error);
            setPrefetchStats(prev => ({
              ...prev,
              failedPrefetches: prev.failedPrefetches + 1
            }));
          }
        })
      );
    } finally {
      isProcessingPrefetchRef.current = false;
      
      // Process next batch if queue is not empty
      if (prefetchQueueRef.current.length > 0) {
        const timeoutId = setTimeout(processPrefetchQueue, 100);
        
        // Store timeout ID for cleanup
        prefetchTimeoutRef.current = timeoutId;
      }
    }
  }, [prefetchCache, handlePrefetch]);
  
  // Memory optimization: Clear processPrefetchQueue callback on unmount
  useEffect(() => {
    return () => {
      // Reset prefetch processing states on cleanup
      isProcessingPrefetchRef.current = false;
      prefetchQueueRef.current = [];
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
        prefetchTimeoutRef.current = null;
      }
      
      // Clear any pending prefetch operations
      setPrefetchCache(new Map());
    };
  }, []);

  // Enhanced prefetch queue with priority based on visibility and memory optimization - MEMORY LEAK FIX
  const queuePrefetchWithPriority = useCallback((movieId, priority = 'normal') => {
    // FIXED: Add throttling to prevent rapid prefetch calls
    const now = Date.now();
    const lastPrefetchTime = queuePrefetchWithPriority.lastCallTime || 0;
    const THROTTLE_DELAY = 1000; // 1 second throttle
    
    if (now - lastPrefetchTime < THROTTLE_DELAY) {
      return; // Skip if called too recently
    }
    queuePrefetchWithPriority.lastCallTime = now;
    
    if (prefetchedMovies.has(movieId) || prefetchCache.has(movieId)) {
      return;
    }
    
    // Skip prefetching if we've already determined this movie doesn't exist
    const cachedData = prefetchCache.get(movieId);
    if (cachedData && cachedData.details === null && cachedData.similar === null) {
      return;
    }

    const queueItem = { movieId, priority, timestamp: Date.now() };
    
    // FIXED: Reduce queue size to prevent memory leaks
    const MAX_QUEUE_SIZE = 20; // Reduced from 50 to 20
    if (prefetchQueueRef.current.length >= MAX_QUEUE_SIZE) {
      // Remove oldest low priority items
      prefetchQueueRef.current = prefetchQueueRef.current.filter(item => 
        item.priority === 'high' || 
        (Date.now() - item.timestamp) < 15000 // Reduced from 30 seconds to 15 seconds
      );
    }
    
    // FIXED: Check if item is already in queue to prevent duplicates
    const isAlreadyQueued = prefetchQueueRef.current.some(item => item.movieId === movieId);
    if (isAlreadyQueued) {
      return;
    }
    
    // Add to queue with priority
    if (priority === 'high') {
      prefetchQueueRef.current.unshift(queueItem);
    } else {
      prefetchQueueRef.current.push(queueItem);
    }
    
    // Start processing if not already running
    if (!isProcessingPrefetchRef.current) {
      processPrefetchQueue();
    }
  }, [prefetchedMovies, prefetchCache, processPrefetchQueue]);
  
  // Memory optimization: Clear queuePrefetchWithPriority callback on unmount
  useEffect(() => {
    return () => {
      // Reset queue states on cleanup
      prefetchQueueRef.current = [];
      isProcessingPrefetchRef.current = false;
      
      // Clear any pending prefetch operations
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
        prefetchTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Memory optimization: Clear prefetch queue on component unmount
  useEffect(() => {
    return () => {
      prefetchQueueRef.current = [];
      isProcessingPrefetchRef.current = false;
      
      // Clear prefetch timeout
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
        prefetchTimeoutRef.current = null;
      }
    };
  }, []);

  // Add movie to prefetch queue (updated to use priority)
  const queuePrefetch = useCallback((movieId) => {
    // Check if movie is visible for priority
    const priority = visibleMovies.has(movieId) ? 'high' : 'normal';
    queuePrefetchWithPriority(movieId, priority);
  }, [visibleMovies, queuePrefetchWithPriority]);
  
  // Memory optimization: Clear queuePrefetch callback on unmount
  useEffect(() => {
    return () => {
      // Reset queue states on cleanup
      setVisibleMovies(new Set());
      
      // Clear any pending prefetch operations
      prefetchQueueRef.current = [];
      isProcessingPrefetchRef.current = false;
    };
  }, []);

  // Store the latest queuePrefetch function in a ref to avoid stale closures - MEMORY LEAK FIX
  const queuePrefetchRef = useRef(queuePrefetch);
  
  // Update the ref whenever queuePrefetch changes - MEMORY LEAK FIX
  useEffect(() => {
    queuePrefetchRef.current = queuePrefetch;
    
    return () => {
      // Clear the ref on cleanup
      queuePrefetchRef.current = null;
      
      // Clear any pending prefetch operations
      prefetchQueueRef.current = [];
      isProcessingPrefetchRef.current = false;
    };
  }, [queuePrefetch]);

  // FIXED: Add throttling to queuePrefetch to prevent excessive calls
  const throttledQueuePrefetch = useCallback((movieId) => {
    const now = Date.now();
    const lastCallTime = throttledQueuePrefetch.lastCallTime || 0;
    const THROTTLE_DELAY = 2000; // 2 seconds throttle
    
    if (now - lastCallTime < THROTTLE_DELAY) {
      return; // Skip if called too recently
    }
    throttledQueuePrefetch.lastCallTime = now;
    
    queuePrefetchRef.current(movieId);
  }, []);

  // Enhanced visibility tracking for predictive prefetching with memory optimization - MEMORY LEAK FIX
  useEffect(() => {
    // FIXED: Only create observer if not already exists to prevent recreation
    if (visibilityObserverRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const newVisibleMovies = new Set(visibleMovies);
        
        entries.forEach(entry => {
          const movieId = entry.target.dataset.movieId;
          if (movieId) {
            if (entry.isIntersecting) {
              newVisibleMovies.add(parseInt(movieId));
              // FIXED: Reduce prefetch frequency - only prefetch when more visible
              if (entry.intersectionRatio > 0.5) { // Increased threshold from 0.1 to 0.5
                throttledQueuePrefetch(parseInt(movieId));
              }
            } else {
              newVisibleMovies.delete(parseInt(movieId));
            }
          }
        });
        
        // Memory optimization: Limit visible movies set size
        if (newVisibleMovies.size > MAX_VISIBLE_MOVIES) {
          const visibleArray = Array.from(newVisibleMovies);
          const trimmedSet = new Set(visibleArray.slice(-MAX_VISIBLE_MOVIES));
          setVisibleMovies(trimmedSet);
        } else {
          setVisibleMovies(newVisibleMovies);
        }
      },
      {
        rootMargin: '100px 0px', // FIXED: Reduced from 200px to 100px to reduce prefetch area
        threshold: [0, 0.5, 1.0] // FIXED: Simplified thresholds to reduce call frequency
      }
    );

    visibilityObserverRef.current = observer;

    // FIXED: Use setTimeout to ensure DOM is ready and prevent immediate observation
    const observeTimeout = setTimeout(() => {
      const movieCards = document.querySelectorAll('[data-movie-id]');
      movieCards.forEach(card => observer.observe(card));
    }, 100);

    return () => {
      clearTimeout(observeTimeout);
      if (visibilityObserverRef.current) {
        visibilityObserverRef.current.disconnect();
        visibilityObserverRef.current = null;
      }
      
      // Clear visible movies on cleanup to prevent memory leaks
      setVisibleMovies(new Set());
      
      // Clear any pending visibility operations
      prefetchQueueRef.current = [];
      isProcessingPrefetchRef.current = false;
    };
  }, []); // FIXED: Removed dependencies to prevent recreation

  // FIXED: Separate effect to observe new movie cards when movies change
  useEffect(() => {
    if (visibilityObserverRef.current) {
      // Observe new movie cards that might have been added
      const movieCards = document.querySelectorAll('[data-movie-id]');
      movieCards.forEach(card => {
        if (!card.dataset.observed) {
          visibilityObserverRef.current.observe(card);
          card.dataset.observed = 'true';
        }
      });
    }
  }, [movies, searchResults]);

  // Clean up old cache entries (older than 10 minutes) - MEMORY LEAK FIX
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;
      
      setPrefetchCache(prev => {
        const newCache = new Map();
        for (const [key, value] of prev.entries()) {
          if (now - value.timestamp < tenMinutes) {
            newCache.set(key, value);
          }
        }
        return newCache;
      });
      
      // Also clean up prefetched movies set to prevent memory leaks
      setPrefetchedMovies(prev => {
        const newSet = new Set();
        // Keep only recent entries (last 100)
        const recentEntries = Array.from(prev).slice(-100);
        recentEntries.forEach(id => newSet.add(id));
        return newSet;
      });
      
      // FIXED: Reset prefetch stats periodically to prevent counter overflow
      setPrefetchStats(prev => ({
        totalPrefetched: Math.min(prev.totalPrefetched, 1000), // Cap at 1000
        successfulPrefetches: Math.min(prev.successfulPrefetches, 1000),
        failedPrefetches: Math.min(prev.failedPrefetches, 100),
        cacheHits: Math.min(prev.cacheHits, 1000)
      }));
    }, 5 * 60 * 1000); // Clean up every 5 minutes

    return () => {
      clearInterval(cleanupInterval);
      
      // Clear any pending cache operations
      setPrefetchCache(new Map());
      setPrefetchedMovies(new Set());
    };
  }, []);

  return (
    <motion.div 
      ref={(el) => { scrollContainerRef.current = el; setScrollRootEl(el); }}
      className="min-h-screen bg-[#0F0F0F] text-white overflow-y-auto scrollbar-gutter-stable"
      exit={{ opacity: 0 }}
    >
      <div className="w-full px-4 py-8">
        {/* Search and Filters Section */}
        <div className="flex flex-col items-center gap-6">
                  {/* Enhanced Search Bar */}
        <div className="relative w-full">
          <div className="relative max-w-xl mx-auto">
            <Suspense fallback={
              <div className="w-full h-12 bg-gray-800 rounded-lg animate-pulse"></div>
            }>
              <EnhancedSearchBar
                placeholder="Search movies..."
                initialValue={searchQuery}
                onSearch={(query) => {
                  setSearchQuery(query);
                  if (query.trim()) {
                    performSearch(query, 1);
                  } else {
                    setSearchResults([]);
                    setHasMoreSearchResults(false);
                  }
                }}
                onSearchSubmit={(query) => {
                  // Only add to history when search is actually submitted
                  searchHistoryService.addToHistory(query, 'movie');
                }}
                onClear={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setHasMoreSearchResults(false);
                }}
                isLoading={isSearching}
                showLoadingSpinner={true}
                theme="dark"
                variant="floating"
                size="md"
                showSuggestions={true}
                suggestions={searchResults.slice(0, 5).map(movie => ({
                  title: movie.title,
                  name: movie.title,
                  id: movie.id,
                  poster_path: movie.poster_path,
                  year: movie.release_date ? new Date(movie.release_date).getFullYear() : null
                }))}
                onSuggestionSelect={(suggestion) => {
                  const movie = searchResults.find(m => m.id === suggestion.id);
                  if (movie) {
                    handleMovieClick(movie);
                  }
                }}
                searchHistory={searchHistoryItems}
                showHistory={true}
                onHistorySelect={(historyItem) => {
                  setSearchQuery(historyItem);
                  performSearch(historyItem, 1);
                  searchHistoryService.incrementSearchCount(historyItem);
                }}
                clearHistory={() => searchHistoryService.clearHistoryByType('movie')}
                showTrendingSearches={true}
                trendingSearches={trendingSearches}
                onTrendingSelect={(trending) => {
                  setSearchQuery(trending);
                  performSearch(trending, 1);
                  searchHistoryService.addToHistory(trending, 'movie');
                }}
              />
            </Suspense>
          </div>
        </div>

          {/* Category Selector */}
          {!searchQuery && (
            <div className="relative inline-flex rounded-full bg-[#1a1a1a] p-1 overflow-x-auto max-w-full">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 whitespace-nowrap focus:outline-none ${
                    activeCategory === category.id
                      ? 'text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="relative z-10">{category.name}</span>
                  {activeCategory === category.id && (
                    <motion.div
                      layoutId="activeCategoryBackground"
                      className="absolute inset-0 bg-white rounded-full"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-4 justify-center w-full">
            {/* Year Filter */}
            <div className="relative" ref={yearDropdownRef}>
              <button
                onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  selectedYear 
                    ? 'bg-white text-black shadow-lg' 
                    : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                }`}
              >
                {selectedYear ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-black rounded-full"></span>
                    {selectedYear}
                  </span>
                ) : (
                  'Year'
                )}
                <svg
                  className={`w-4 h-4 transition-transform ${yearDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {yearDropdownOpen && (
                <div className="absolute z-50 mt-2 w-48 bg-[#1a1a1a] rounded-lg shadow-lg py-1">
                  <button
                    onClick={() => handleYearSelect(null)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:text-white hover:bg-[#2b3036]"
                  >
                    All Years
                  </button>
                  {yearOptions.map(year => (
                    <button
                      key={year}
                      onClick={() => handleYearSelect(year)}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-[#2b3036] ${
                        selectedYear === year ? 'text-white bg-[#2b3036]' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Genre Filter */}
            <div className="relative" ref={genreDropdownRef}>
              <button
                onClick={() => setGenreDropdownOpen(!genreDropdownOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  selectedGenre 
                    ? 'bg-white text-black shadow-lg' 
                    : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                }`}
              >
                {selectedGenre ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-black rounded-full"></span>
                    {selectedGenre.name}
                  </span>
                ) : (
                  'Genre'
                )}
                <svg
                  className={`w-4 h-4 transition-transform ${genreDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {genreDropdownOpen && (
                <div className="absolute z-50 mt-2 w-48 bg-[#1a1a1a] rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto">
                  <button
                    onClick={() => handleGenreSelect(null)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:text-white hover:bg-[#2b3036]"
                  >
                    All Genres
                  </button>
                  {genres.map(genre => (
                    <button
                      key={genre.id}
                      onClick={() => handleGenreSelect(genre)}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-[#2b3036] ${
                        selectedGenre?.id === genre.id ? 'text-white bg-[#2b3036]' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {genre.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(selectedYear || selectedGenre) && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center items-center gap-2 mt-4"
          >
            <span className="text-sm text-gray-400">Showing:</span>
            <div className="flex gap-2">
              {selectedGenre && (
                <span className="px-3 py-1 bg-white text-black text-sm rounded-full font-medium">
                  {selectedGenre.name}
                </span>
              )}
              {selectedYear && (
                <span className="px-3 py-1 bg-white text-black text-sm rounded-full font-medium">
                  {selectedYear}
                </span>
              )}
              <button
                onClick={() => {
                  try {
                    setSelectedYear(null);
                    setSelectedGenre(null);
                    
                    // Clear URL parameters
                    const searchParams = new URLSearchParams(window.location.search);
                    searchParams.delete('genre');
                    searchParams.delete('year');
                    navigate(`?${searchParams.toString()}`, { replace: true });


                  } catch (error) {
                    console.error('Error clearing filters:', error);
                  }
                }}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded-full hover:bg-gray-500 transition-colors"
              >
                Clear All
              </button>
            </div>
          </motion.div>
        )}

        {/* Movies grid with smooth category transitions */}
        <motion.div 
          className="w-full mt-8"
          key={activeCategory}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
        >
          {error ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center text-red-500 py-8"
            >
              {error}
            </motion.div>
          ) : (loading && movies.length === 0) || (loading && !isLoadingMore) ? (
            <motion.div 
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={loadingVariants}
              className="flex justify-center items-center py-8"
            >
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </motion.div>
                      ) : (
              <motion.div
                key={`movies-grid-${activeCategory}-${selectedGenre?.id || 'all'}-${selectedYear || 'all'}`}
                variants={gridVariants}
                initial="hidden"
                animate="visible"
                transition={{
                  duration: 0.4,
                  ease: [0.25, 0.46, 0.45, 0.94],
                  staggerChildren: 0.02,
                  delayChildren: 0.05
                }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10 gap-4"
              >
                {displayMovies.map((movie, index) => {
                  if (!movie || !movie.id) {
                    return null;
                  }
                  return (
                    <MovieCard
                      key={`movie-${movie.id}`}
                      movie={movie}
                      index={index}
                      onClick={handleMovieClick}
                      onPrefetch={queuePrefetch}
                    />
                  );
                })}
                {/* Show loading placeholders for next page */}
                {isLoadingNextPage && (
                  <>
                    {Array.from({ length: 20 }, (_, index) => (
                      <motion.div
                        key={`loading-placeholder-${index}`}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800"
                      >
                        <motion.div 
                          className="w-full h-full bg-gray-800"
                          animate={{
                            opacity: [0.5, 0.8, 0.5],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      </motion.div>
                    ))}
                  </>
                )}
              </motion.div>
            )}
          
          {/* Load more trigger */}
          {hasMore && (
            <motion.div 
              ref={loadMoreRef} 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="h-20 flex items-center justify-center"
              style={{ minHeight: '100px' }}
            >
              {isLoadingNextPage && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"
                />
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Prefetch Performance Monitor (Development Only) - MEMORY LEAK FIX */}
        {import.meta.env.DEV && import.meta.env.VITE_DEBUG_MEMORY === 'true' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs z-50 max-w-xs"
          >
            <div className="font-semibold mb-2">Prefetch Stats</div>
            <div className="space-y-1">
              <div>Total: {prefetchStats.totalPrefetched}</div>
              <div>Success: {prefetchStats.successfulPrefetches}</div>
              <div>Failed: {prefetchStats.failedPrefetches}</div>
              <div>Cache Hits: {prefetchStats.cacheHits}</div>
              <div>Queue: {prefetchQueueRef.current.length}</div>
              <div>Visible: {visibleMovies.size}</div>
            </div>
          </motion.div>
        )}

        {/* Movie Details Overlay */}
        <AnimatePresence>
          {selectedMovie && (
            <Suspense fallback={null}>
              <MovieDetailsOverlay
                movie={selectedMovie}
                onClose={handleCloseOverlay}
                onMovieSelect={handleSimilarMovieClick}
                onGenreClick={handleGenreNavigation}
              />
            </Suspense>
          )}
        </AnimatePresence>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4a4a4a;
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #5a5a5a;
        }
        ${styles}
      `}</style>
    </motion.div>
  );
};

export default MoviesPage;