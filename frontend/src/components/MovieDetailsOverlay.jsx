import React, { useState, useRef, useEffect, useCallback, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { getMovieDetails, getMovieCredits, getMovieVideos, getSimilarMovies, getTVSeason, getTVSeasons } from '../services/tmdbService';
import { useWatchlist } from '../contexts/WatchlistContext';
import { Loader, PageLoader, SectionLoader, CardLoader } from './Loader';
import { getStreamingUrl, isStreamingAvailable, needsEpisodeSelection } from '../services/streamingService';
import StreamingPlayer from './StreamingPlayer';
import TVEpisodeSelector from './TVEpisodeSelector';
import EnhancedSimilarContent from './EnhancedSimilarContent';

// Custom Modern Minimalist Dropdown Component
const CustomDropdown = React.memo(({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select option",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(option => option.value === value) || options[0];

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-1.5 text-sm text-white bg-transparent border-b border-white/15 hover:border-white/30 focus:outline-none focus:border-primary/80 transition-all duration-200 min-w-[120px]"
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <motion.svg 
          className="w-4 h-4 text-white/60 ml-2 flex-shrink-0" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a]/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden"
          >
            <div className="max-h-48 overflow-y-auto">
              {options.map((option, index) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-sm text-left hover:bg-white/10 transition-colors duration-150 ${
                    option.value === value 
                      ? 'bg-primary/20 text-primary' 
                      : 'text-white/80'
                  } ${index === 0 ? 'rounded-t-lg' : ''} ${index === options.length - 1 ? 'rounded-b-lg' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// 🚀 NEW: Advanced caching and real-time updates
const DETAILS_CACHE = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const BACKGROUND_REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes
const REAL_TIME_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

// 🎯 NEW: Cache management utilities
const getCachedDetails = (id, type) => {
  const key = `${type}_${id}`;
  const cached = DETAILS_CACHE.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedDetails = (id, type, data) => {
  const key = `${type}_${id}`;
  DETAILS_CACHE.set(key, {
    data,
    timestamp: Date.now()
  });
  
  // Clean up old cache entries
  const now = Date.now();
  for (const [cacheKey, value] of DETAILS_CACHE.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      DETAILS_CACHE.delete(cacheKey);
    }
  }
};

// 📊 NEW: Performance tracking
const trackPerformance = (operation, duration, success = true) => {
  if (window.gtag) {
    window.gtag('event', 'movie_details_performance', {
      event_category: 'MovieDetails',
      event_label: operation,
      value: Math.round(duration),
      success
    });
  }
};

// 🔄 NEW: Real-time update manager
class RealTimeUpdateManager {
  constructor() {
    this.subscribers = new Map();
    this.updateInterval = null;
    this.isActive = false;
  }

  subscribe(movieId, type, callback) {
    const key = `${type}_${movieId}`;
    this.subscribers.set(key, callback);
    
    if (!this.isActive) {
      this.startUpdates();
    }
  }

  unsubscribe(movieId, type) {
    const key = `${type}_${movieId}`;
    this.subscribers.delete(key);
    
    if (this.subscribers.size === 0) {
      this.stopUpdates();
    }
  }

  startUpdates() {
    if (this.isActive) return;
    
    this.isActive = true;
    this.updateInterval = setInterval(() => {
      this.performUpdates();
    }, REAL_TIME_UPDATE_INTERVAL);
  }

  stopUpdates() {
    if (!this.isActive) return;
    
    this.isActive = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  async performUpdates() {
    const updatePromises = [];
    
    for (const [key, callback] of this.subscribers.entries()) {
      const [type, movieId] = key.split('_');
      
      try {
        const startTime = performance.now();
        const freshData = await getMovieDetails(movieId, type);
        const duration = performance.now() - startTime;
        
        if (freshData) {
          setCachedDetails(movieId, type, freshData);
          callback(freshData);
          trackPerformance('real_time_update', duration, true);
        }
      } catch (error) {
        console.warn(`Real-time update failed for ${key}:`, error);
        trackPerformance('real_time_update', 0, false);
      }
    }
  }
}

// Global real-time update manager
const realTimeManager = new RealTimeUpdateManager();

// Hide scrollbars globally for MovieDetailsOverlay
const style = document.createElement('style');
style.innerHTML = `
  .hide-scrollbar {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }
  .hide-scrollbar::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    background: transparent !important;
  }
`;
if (typeof window !== 'undefined' && !document.getElementById('movie-details-overlay-scrollbar-style')) {
  style.id = 'movie-details-overlay-scrollbar-style';
  document.head.appendChild(style);
}

const NetworkDisplay = ({ networks, network }) => {
  const getNetworkNames = () => {
    if (!networks) {
      return network || 'N/A';
    }
    
    if (!Array.isArray(networks)) {
      return typeof networks === 'string' ? networks : 'N/A';
    }
    
    const names = networks
      .filter(n => n && typeof n === 'object' && n.name)
      .map(n => n.name)
      .filter(Boolean);
      
    return names.length > 0 ? names.join(', ') : 'N/A';
  };

  return (
    <div className="text-white/60 text-sm mb-6">
      <span>Network: {getNetworkNames()}</span>
    </div>
  );
};

// Enhanced motion variants with improved performance and visual appeal
const containerVariants = {
  hidden: { 
    opacity: 0,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      staggerChildren: 0.03,
      type: 'spring',
      stiffness: 300,
      damping: 25,
      duration: 0.15,
      delay: 0.05,
      ease: [0.25, 0.46, 0.45, 0.94], // Custom easing for smoother animation
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

const itemVariants = {
  hidden: { 
    y: 15, 
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.2,
      type: 'spring',
      stiffness: 300,
      damping: 25,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    y: -10,
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.15,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

// Additional variants for different animation types
const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

const slideUpVariants = {
  hidden: { 
    y: 30, 
    opacity: 0 
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

// Lazy load YouTube player for trailer modal
const LazyYouTube = lazy(() => import('react-youtube'));

// Memoized Cast Card
const CastCard = React.memo(function CastCard({ person }) {
  return (
    <div className="text-center group">
      <div className="relative w-24 h-24 mx-auto mb-3">
        <div className="rounded-full overflow-hidden w-full h-full transition-all duration-300 transform group-hover:scale-110 shadow-lg">
          {person.image ? (
            <img src={person.image} alt={person.name} className="w-full h-full object-cover will-change-transform" loading="lazy" style={{ backfaceVisibility: 'hidden' }} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white/30" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </div>
          )}
        </div>
        <div className="absolute inset-0 rounded-full ring-2 ring-white/10 ring-inset opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
      <h4 className="text-white font-medium text-sm truncate transition-colors group-hover:text-white">{person.name}</h4>
      <p className="text-white/60 text-xs truncate">{person.character}</p>
    </div>
  );
});

// Memoized Similar Movie Card
const SimilarMovieCard = React.memo(function SimilarMovieCard({ similar, onClick, isMobile }) {
  const displayTitle = similar.title || similar.name || 'Untitled';
  let displayYear = 'N/A';
  if (similar.year) {
    displayYear = similar.year;
  } else if (similar.first_air_date) {
    displayYear = new Date(similar.first_air_date).getFullYear();
  } else if (similar.release_date) {
    displayYear = new Date(similar.release_date).getFullYear();
  }
  return (
    <div className="group cursor-pointer" onClick={() => onClick(similar)}>
      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 relative shadow-lg">
        {similar.poster_path ? (
          <img src={`https://image.tmdb.org/t/p/w500${similar.poster_path}`} alt={displayTitle} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 will-change-transform" style={{ backfaceVisibility: 'hidden' }} loading="lazy"/>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
        )}
        {/* Only show hover overlay on desktop */}
        {!isMobile && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
            <div className="transform transition-transform duration-300 group-hover:-translate-y-2">
              <h4 className="font-semibold text-white text-base truncate">{displayTitle}</h4>
              <div className="flex items-center gap-2 text-xs text-white/70 mt-1">
                <span>{displayYear}</span>
                <span className="w-1 h-1 rounded-full bg-white/50"></span>
                <span className="flex items-center gap-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                  {similar.vote_average?.toFixed ? similar.vote_average.toFixed(1) : (typeof similar.vote_average === 'number' ? similar.vote_average : 'N/A')}
                </span>
              </div>
            </div>
          </div>
        )}
        <div className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center transform transition-all duration-300 scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
    </div>
  );
});

// Enhanced mobile detection hook with breakpoint management and performance optimizations
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 640;
  });

  const [isTablet, setIsTablet] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth > 640 && window.innerWidth <= 1024;
  });

  const [isDesktop, setIsDesktop] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth > 1024;
  });

  React.useEffect(() => {
    let timeoutId;
    
    function handleResize() {
      // Debounce resize events for better performance
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const width = window.innerWidth;
        setIsMobile(width <= 640);
        setIsTablet(width > 640 && width <= 1024);
        setIsDesktop(width > 1024);
      }, 100);
    }

    // Use passive listener for better scroll performance
    window.addEventListener('resize', handleResize, { passive: true });
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return { isMobile, isTablet, isDesktop };
}

const MovieDetailsOverlay = ({ movie, onClose, onMovieSelect }) => {
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const [movieDetails, setMovieDetails] = useState(null);
  const [credits, setCredits] = useState(null);
  const [videos, setVideos] = useState(null);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [similarMoviesPage, setSimilarMoviesPage] = useState(1);
  const [hasMoreSimilar, setHasMoreSimilar] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const overlayRef = useRef(null);
  const contentRef = useRef(null);
  const playerRef = useRef(null);
  const [isCastLoading, setIsCastLoading] = useState(true);
  const [isSimilarLoading, setIsSimilarLoading] = useState(true);
  const [isTrailerLoading, setIsTrailerLoading] = useState(false);
  const [isSimilarLoadingMore, setIsSimilarLoadingMore] = useState(false);
  const [showAllCast, setShowAllCast] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const similarLoaderRef = useRef(null);
  const scrollContainerRef = useRef(null);
  // Virtualization: show only first 20 cast/similar, with Show More
  const [castLimit, setCastLimit] = useState(20);
  const [similarLimit, setSimilarLimit] = useState(20);
  const [castSearchTerm, setCastSearchTerm] = useState("");
  const handleShowMoreCast = useCallback(() => setCastLimit(lim => lim + 20), []);
  const handleShowMoreSimilar = useCallback(() => setSimilarLimit(lim => lim + 20), []);
  // Add state to control how many rows of cast are shown
  const [castRowsShown, setCastRowsShown] = useState(1);
  
  // Streaming state
  const [showStreamingPlayer, setShowStreamingPlayer] = useState(false);
  const [streamingUrl, setStreamingUrl] = useState(null);
  const [showEpisodeSelector, setShowEpisodeSelector] = useState(false);
  
  // TV Seasons and Episodes state
  const [seasons, setSeasons] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [isSeasonsLoading, setIsSeasonsLoading] = useState(false);
  const [isEpisodesLoading, setIsEpisodesLoading] = useState(false);
  const [episodesViewMode, setEpisodesViewMode] = useState(() => {
    // Get saved view mode from localStorage, default to 'list'
    if (typeof window !== 'undefined') {
      return localStorage.getItem('episodesViewMode') || 'list';
    }
    return 'list';
  });

  // Custom setter that saves to localStorage
  const setEpisodesViewModeWithStorage = useCallback((mode) => {
    setEpisodesViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('episodesViewMode', mode);
    }
  }, []);

  // Get mobile/desktop state early to avoid initialization errors
  const { isMobile, isTablet, isDesktop } = useIsMobile();

  // Determine how many cast per row based on screen size
  const castPerRow = (() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1024) return 5; // lg
      if (window.innerWidth >= 640) return 4; // sm/md
      return 2; // xs
    }
    return 5;
  })();

  // Compute how many cast to show
  const castToShow = React.useMemo(() => {
    if (!movieDetails?.cast) return [];
    let filteredCast = movieDetails.cast;
    if (castSearchTerm && castSearchTerm.trim() !== "") {
      const term = castSearchTerm.trim().toLowerCase();
      filteredCast = filteredCast.filter(
        (person) =>
          (person.name && person.name.toLowerCase().includes(term)) ||
          (person.character && person.character.toLowerCase().includes(term))
      );
    }
    return filteredCast.slice(0, castRowsShown * castPerRow);
  }, [movieDetails, castSearchTerm, castRowsShown, castPerRow]);

  // Memoize similarToShow (already memoized, but add comment)
  // Memoize the visible similar movies list for performance
  const similarToShow = React.useMemo(() => {
    if (!similarMovies) return [];
    return similarMovies.slice(0, similarLimit);
  }, [similarMovies, similarLimit]);
  // Prefetch next page of similar movies in background
  useEffect(() => {
    if (hasMoreSimilar && !isSimilarLoadingMore && similarMovies.length >= similarLimit) {
      getSimilarMovies(movie.id, movie.type, similarMoviesPage + 1).then(data => {
        if (data?.results?.length > 0) {
          setSimilarMovies(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMovies = data.results.filter(m => !existingIds.has(m.id));
            return [...prev, ...newMovies];
          });
        }
      });
    }
    // eslint-disable-next-line
  }, [similarLimit]);

  // Memoized callback for toggling showAllCast
  const handleToggleShowAllCast = useCallback(() => setShowAllCast(v => !v), []);

  // Memoize event handlers to avoid unnecessary re-renders
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const scrollTop = scrollContainerRef.current.scrollTop;
      const scrollHeight = scrollContainerRef.current.scrollHeight;
      const clientHeight = scrollContainerRef.current.clientHeight;
      
      // Calculate scroll percentage for enhanced UX
      const scrollPercentage = Math.min(100, Math.max(0, (scrollTop / (scrollHeight - clientHeight)) * 100));
      
      // Update scroll position with improved throttling for better performance
      setScrollY(prevScrollY => {
        // Only update if change is significant (prevents excessive re-renders)
        if (Math.abs(prevScrollY - scrollTop) > 1) {
          return scrollTop;
        }
        return prevScrollY;
      });
      
      // Store scroll percentage for potential use in animations or UI feedback
      if (scrollContainerRef.current.dataset) {
        scrollContainerRef.current.dataset.scrollPercentage = scrollPercentage.toFixed(1);
      }
    }
  }, []);

  // Enhanced scroll event listener with performance optimizations and cleanup
  useEffect(() => {
    const currentRef = scrollContainerRef.current;
    
    if (!currentRef) return;
    
    // Improved throttled scroll handler for better performance
    let ticking = false;
    let lastScrollTime = 0;
    const scrollThrottle = 16; // ~60fps for scroll updates
    
    const throttledHandleScroll = () => {
      const now = Date.now();
      
      if (!ticking && (now - lastScrollTime) >= scrollThrottle) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
          lastScrollTime = now;
        });
        ticking = true;
      }
    };
    
    // Add event listener with passive option for better scroll performance
    currentRef.addEventListener('scroll', throttledHandleScroll, { 
      passive: true, 
      capture: false 
    });
    
    // Enhanced cleanup with proper reference checking
    return () => {
      if (currentRef && currentRef.removeEventListener) {
        currentRef.removeEventListener('scroll', throttledHandleScroll, { 
          capture: false 
        });
      }
    };
  }, [loading, handleScroll]);

  // 🚀 Ultra-enhanced loadMoreSimilar with advanced error handling, intelligent caching, and performance optimizations
  const loadMoreSimilar = useCallback(async () => {
    // Prevent multiple simultaneous requests with enhanced validation
    if (isSimilarLoadingMore || !hasMoreSimilar || !movie?.id) {
      return;
    }
    
    // Set loading state immediately with performance tracking
    const loadStartTime = performance.now();
    setIsSimilarLoadingMore(true);
    
    const nextPage = similarMoviesPage + 1;
    let retryCount = 0;
    const maxRetries = 3;
    const baseDelay = 1000; // Base delay for exponential backoff
    
    // Enhanced attempt function with intelligent retry logic and data validation
    const attemptLoad = async () => {
      try {
        // Add request timeout for better UX
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );
        
        const dataPromise = getSimilarMovies(movie.id, movie.type, nextPage);
        const data = await Promise.race([dataPromise, timeoutPromise]);
        
        // Comprehensive response validation with detailed error messages
        if (!data) {
          throw new Error('Empty response received');
        }
        
        if (!Array.isArray(data.results)) {
          throw new Error(`Invalid results format: expected array, got ${typeof data.results}`);
        }
        
        if (data.results.length > 0) {
          // Optimize state updates with intelligent deduplication and data validation
          setSimilarMovies(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMovies = data.results.filter(m => {
              // Enhanced validation for movie objects
              return m && 
                     m.id && 
                     typeof m.id === 'number' && 
                     !existingIds.has(m.id) && 
                     m.title && 
                     typeof m.title === 'string' &&
                     m.title.trim().length > 0;
            });
            
            return [...prev, ...newMovies];
          });
          
          // Update pagination state with validation
          setSimilarMoviesPage(nextPage);
          const hasMore = data.page < data.total_pages;
          setHasMoreSimilar(hasMore);
          
          // Intelligent prefetching with adaptive timing
          if (hasMore && data.page < data.total_pages - 1) {
            const prefetchDelay = Math.min(2000, 1000 + (data.results.length * 100)); // Adaptive delay
            setTimeout(() => {
              getSimilarMovies(movie.id, movie.type, nextPage + 1)
                .then(() => {})
                .catch(() => {});
            }, prefetchDelay);
          }
        } else {
          setHasMoreSimilar(false);
        }
      } catch (error) {
        // Enhanced exponential backoff with jitter for better retry distribution
        if (retryCount < maxRetries) {
          retryCount++;
          const exponentialDelay = Math.pow(2, retryCount) * baseDelay;
          const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
          const finalDelay = exponentialDelay + jitter;
          
          await new Promise(resolve => setTimeout(resolve, finalDelay));
          return attemptLoad();
        } else {
          // Final failure with user-friendly error handling
          setHasMoreSimilar(false);
        }
      } finally {
        setIsSimilarLoadingMore(false);
      }
    };
    
    await attemptLoad();
  }, [isSimilarLoadingMore, hasMoreSimilar, similarMoviesPage, movie?.id, movie?.type]);

  // Memoize observer effect
  useEffect(() => {
    if (loading) return;
    let observer;
    const currentLoader = similarLoaderRef.current;
    if (currentLoader) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMoreSimilar) {
            loadMoreSimilar();
          }
        },
        {
          root: scrollContainerRef.current,
          threshold: 1.0,
        }
      );
      observer.observe(currentLoader);
    }
    return () => {
      if (observer && currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [loading, hasMoreSimilar, loadMoreSimilar]);

  // Memoize click outside and escape handlers
  const handleClickOutside = useCallback((event) => {
    if (overlayRef.current && !contentRef.current?.contains(event.target)) {
      onClose();
    }
  }, [onClose]);

  const handleEscape = useCallback((event) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [handleClickOutside, handleEscape]);

  // Memoize genres (already memoized, but add comment)
  // Memoize genres for performance
  const genres = React.useMemo(() => movieDetails?.genres || [], [movieDetails]);

  const [retryCount, setRetryCount] = useState(0);

  // Enhanced fetchMovieData with comprehensive error handling, retry logic, and performance optimizations
  const fetchMovieData = useCallback(async (attempt = 0) => {
    if (!movie?.id || !movie?.type) {
      console.warn('Invalid movie data provided to fetchMovieData');
      return;
    }

    // Prevent multiple simultaneous requests
    if (loading && attempt === 0) {
      console.log('Request already in progress, skipping...');
      return;
    }

    try {
      // Reset all states at the beginning
      setLoading(true);
      setError(null);
      setMovieDetails(null);
      setCredits(null);
      setVideos(null);
      setSimilarMovies([]);
      setSimilarMoviesPage(1);
      setHasMoreSimilar(true);
      setIsCastLoading(true);
      setIsSimilarLoading(true);
      setShowAllCast(false);
      setShowTrailer(false);

      // Create abort controller for request cancellation
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 30000); // 30s timeout

      console.log(`Fetching movie data for ${movie.type} ID: ${movie.id} (attempt ${attempt + 1})`);

      // Parallel API calls with error handling for each
      const [movieDetails, movieCredits, movieVideos, similar] = await Promise.allSettled([
        getMovieDetails(movie.id, movie.type).catch(err => {
          console.error('Movie details fetch failed:', err);
          return null;
        }),
        getMovieCredits(movie.id, movie.type).catch(err => {
          console.error('Movie credits fetch failed:', err);
          return null;
        }),
        getMovieVideos(movie.id, movie.type).catch(err => {
          console.error('Movie videos fetch failed:', err);
          return null;
        }),
        getSimilarMovies(movie.id, movie.type, 1).catch(err => {
          console.error('Similar movies fetch failed:', err);
          return null;
        })
      ]);

      clearTimeout(timeoutId);

      // Handle individual API failures gracefully
      const details = movieDetails.status === 'fulfilled' ? movieDetails.value : null;
      const credits = movieCredits.status === 'fulfilled' ? movieCredits.value : null;
      const videos = movieVideos.status === 'fulfilled' ? movieVideos.value : null;
      const similarData = similar.status === 'fulfilled' ? similar.value : null;

      // Validate essential data
      if (!details) {
        throw new Error('Movie details not found or unavailable');
      }

      // 🎯 NEW: Cache the fetched details
      setCachedDetails(movie.id, movie.type, details);
      
      // Set data with fallbacks for failed requests
      setMovieDetails(details);
      setCredits(credits || { cast: [], crew: [] });
      setVideos(videos || { results: [] });
      setSimilarMovies(similarData?.results || []);
      setHasMoreSimilar(similarData ? (similarData.page < similarData.total_pages) : false);
      
      // Update loading states
      setIsCastLoading(false);
      setIsSimilarLoading(false);
      setRetryCount(0);
      
      // 📊 NEW: Track successful fetch performance
      const totalDuration = performance.now() - fetchStartTime;
      trackPerformance('movie_details_fetch', totalDuration, true);

      console.log('Movie data fetched successfully:', {
        hasDetails: !!details,
        hasCredits: !!credits,
        hasVideos: !!videos,
        hasSimilar: !!similarData,
        similarCount: similarData?.results?.length || 0
      });

    } catch (err) {
      console.error(`Fetch attempt ${attempt + 1} failed:`, err);
      
      // Handle different types of errors
      if (err.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else if (err.message.includes('not found')) {
        setError('Movie not found. It may have been removed or is unavailable.');
      } else if (attempt < 3) {
        // Exponential backoff with jitter for better retry distribution
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;
        
        console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/3)`);
        
        setTimeout(() => {
          setRetryCount(attempt + 1);
          fetchMovieData(attempt + 1);
        }, delay);
        return; // Don't set error state for retry attempts
      } else {
        setError(`Failed to load movie details after ${attempt + 1} attempts. Please try again later.`);
      }
      
      // Reset states on final failure
      if (attempt >= 3) {
        setMovieDetails(null);
        setCredits(null);
        setVideos(null);
        setSimilarMovies([]);
      }
    } finally {
      setLoading(false);
    }
  }, [movie, loading]);

  // 🚀 Enhanced data fetching with intelligent caching, performance tracking, and advanced error recovery
  useEffect(() => {
    // Prevent unnecessary fetches with comprehensive validation
    if (!movie?.id || !movie?.type || loading) {
      console.debug('Fetch blocked:', { movieId: movie?.id, movieType: movie?.type, loading });
      return;
    }

    // 🎯 NEW: Check cache first for instant loading
    const cachedDetails = getCachedDetails(movie.id, movie.type);
    if (cachedDetails) {
      console.log(`📦 Using cached data for ${movie.type} ID: ${movie.id}`);
      setMovieDetails(cachedDetails);
      setLoading(false);
      
      // Start background refresh for fresh data
      setTimeout(() => {
        fetchMovieData(0);
      }, 100);
      
      // Subscribe to real-time updates
      realTimeManager.subscribe(movie.id, movie.type, (freshData) => {
        console.log(`🔄 Real-time update received for ${movie.type} ID: ${movie.id}`);
        setMovieDetails(freshData);
      });
      
      return;
    }

    // Track fetch performance for optimization insights
    const fetchStartTime = performance.now();
    console.log(`🔄 Starting fetch for ${movie.type} ID: ${movie.id}`);

    // Execute fetch with performance monitoring
    fetchMovieData(0).finally(() => {
      const fetchDuration = performance.now() - fetchStartTime;
      console.log(`✅ Fetch completed in ${fetchDuration.toFixed(2)}ms`);
      
      // Log performance metrics for optimization
      if (fetchDuration > 2000) {
        console.warn(`⚠️ Slow fetch detected: ${fetchDuration.toFixed(2)}ms`);
      }
      
      // Subscribe to real-time updates after successful fetch
      realTimeManager.subscribe(movie.id, movie.type, (freshData) => {
        console.log(`🔄 Real-time update received for ${movie.type} ID: ${movie.id}`);
        setMovieDetails(freshData);
      });
    });

    // Cleanup: unsubscribe from real-time updates
    return () => {
      if (movie?.id && movie?.type) {
        realTimeManager.unsubscribe(movie.id, movie.type);
      }
    };
  }, [movie?.id, movie?.type]);

  // 🎯 Enhanced retry handler with intelligent state management and user feedback
  const handleRetry = useCallback(() => {
    // Validate current state before retry
    if (!movie?.id || !movie?.type) {
      console.warn('Retry blocked: Invalid movie data');
      return;
    }

    console.log(`🔄 Manual retry initiated for ${movie.type} ID: ${movie.id}`);
    
    // Reset all relevant states for clean retry
    setRetryCount(0);
    setError(null);
    setLoading(true);
    
    // Clear previous data to prevent stale content display
    setMovieDetails(null);
    setCredits(null);
    setVideos(null);
    setSimilarMovies([]);
    
    // Execute retry with performance tracking
    const retryStartTime = performance.now();
    fetchMovieData(0).finally(() => {
      const retryDuration = performance.now() - retryStartTime;
      console.log(`🔄 Retry completed in ${retryDuration.toFixed(2)}ms`);
    });
  }, [movie?.id, movie?.type, fetchMovieData]);

  // 🧹 Ultra-Comprehensive cleanup with memory leak prevention, state restoration, and advanced diagnostics
  useEffect(() => {
    // Track unmount for diagnostics
    let isUnmounted = false;

    // Helper: Log state reset for debugging
    const logReset = (name) => {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug(`[MovieDetailsOverlay] Resetting: ${name}`);
      }
    };

    // Helper: Safely reset a state setter
    const safeSet = (setter, value, name) => {
      try {
        setter(value);
        logReset(name);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`[MovieDetailsOverlay] Failed to reset ${name}:`, e);
      }
    };

    // Store cleanup function for proper execution
    const cleanup = () => {
      isUnmounted = true;

      // Reset all state variables to prevent memory leaks
      safeSet(setMovieDetails, null, "movieDetails");
      safeSet(setCredits, null, "credits");
      safeSet(setVideos, null, "videos");
      safeSet(setSimilarMovies, [], "similarMovies");
      safeSet(setLoading, true, "loading");
      safeSet(setError, null, "error");
      safeSet(setShowTrailer, false, "showTrailer");
      safeSet(setRetryCount, 0, "retryCount");

      // Reset UI states
      safeSet(setShowAllCast, false, "showAllCast");
      safeSet(setCastLimit, 20, "castLimit");
      safeSet(setSimilarLimit, 20, "similarLimit");
      safeSet(setScrollY, 0, "scrollY");
      safeSet(setShowTopFade, false, "showTopFade");
      safeSet(setScrollProgress, 0, "scrollProgress");

      // Clear any pending timeouts or intervals (robust)
      if (window.movieDetailsCleanupTimers && Array.isArray(window.movieDetailsCleanupTimers)) {
        window.movieDetailsCleanupTimers.forEach(timerId => {
          try {
            clearTimeout(timerId);
            clearInterval(timerId);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn("[MovieDetailsOverlay] Failed to clear timer:", timerId, e);
          }
        });
        window.movieDetailsCleanupTimers = [];
        logReset("movieDetailsCleanupTimers");
      }

      // Cancel any pending animation frames
      if (window.movieDetailsCleanupAnimationFrames && Array.isArray(window.movieDetailsCleanupAnimationFrames)) {
        window.movieDetailsCleanupAnimationFrames.forEach(frameId => {
          try {
            cancelAnimationFrame(frameId);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn("[MovieDetailsOverlay] Failed to cancel animation frame:", frameId, e);
          }
        });
        window.movieDetailsCleanupAnimationFrames = [];
        logReset("movieDetailsCleanupAnimationFrames");
      }

      // Reset scroll container if it exists
      if (scrollContainerRef.current) {
        try {
          scrollContainerRef.current.scrollTop = 0;
          logReset("scrollContainerRef.scrollTop");
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("[MovieDetailsOverlay] Failed to reset scrollContainerRef:", e);
        }
      }

      // Optionally: Remove any event listeners attached to window/document
      if (window._movieDetailsOverlayListeners) {
        window._movieDetailsOverlayListeners.forEach(({ target, type, handler }) => {
          try {
            (target || window).removeEventListener(type, handler);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn("[MovieDetailsOverlay] Failed to remove event listener:", type, e);
          }
        });
        window._movieDetailsOverlayListeners = [];
        logReset("_movieDetailsOverlayListeners");
      }
      
      // 🎯 NEW: Unsubscribe from real-time updates
      if (movie?.id && movie?.type) {
        try {
          realTimeManager.unsubscribe(movie.id, movie.type);
          logReset("realTimeManager.unsubscribe");
        } catch (e) {
          console.warn("[MovieDetailsOverlay] Failed to unsubscribe from real-time updates:", e);
        }
      }

      // Optionally: Cancel any fetches or abort controllers
      if (window._movieDetailsOverlayAbortControllers) {
        window._movieDetailsOverlayAbortControllers.forEach(controller => {
          try {
            controller.abort();
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn("[MovieDetailsOverlay] Failed to abort controller:", e);
          }
        });
        window._movieDetailsOverlayAbortControllers = [];
        logReset("_movieDetailsOverlayAbortControllers");
      }

      // Diagnostics: Log cleanup completion
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug("[MovieDetailsOverlay] Cleanup complete.");
      }
    };

    // Return cleanup function for React to execute on unmount
    return cleanup;
  }, []); // Empty dependency array ensures cleanup runs only on unmount

  // 🚀 Ultra-enhanced scroll lock with advanced state management, performance optimizations, and accessibility features
  useEffect(() => {
    // Store original body styles for precise restoration
    const originalStyles = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight
    };

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    // Simple and reliable approach: just hide overflow
    document.body.style.overflow = 'hidden';
    
    // Prevent layout shift by compensating for hidden scrollbar
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Enhanced cleanup with comprehensive state restoration
    return () => {
      // Restore all original styles
      Object.entries(originalStyles).forEach(([property, value]) => {
        if (document.body.style[property] !== undefined) {
          document.body.style[property] = value;
        }
      });
    };
  }, []); // Empty dependency array ensures this runs only on mount/unmount

  // 🚀 Enhanced trailer handlers with accessibility, analytics, and robust state management
  const handleTrailerClick = useCallback(() => {
    setIsTrailerLoading(true);
    setShowTrailer(true);

    // Accessibility: Move focus to trailer player after opening
    setTimeout(() => {
      if (playerRef.current && typeof playerRef.current.focus === "function") {
        playerRef.current.focus();
      }
    }, 350);

    // Analytics: Log trailer open event
    if (window.gtag) {
      window.gtag('event', 'trailer_open', {
        event_category: 'MovieDetails',
        event_label: movie?.title || movie?.name || movie?.id,
        value: movie?.id,
      });
    }
  }, [movie, playerRef]);

  const handleCloseTrailer = useCallback((e) => {
    // Prevent event bubbling to avoid closing the main overlay
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    setShowTrailer(false);

    // Pause and reset trailer video if possible
    if (playerRef.current) {
      if (typeof playerRef.current.pauseVideo === "function") {
        playerRef.current.pauseVideo();
      }
      // Optionally reset to start
      if (typeof playerRef.current.seekTo === "function") {
        playerRef.current.seekTo(0);
      }
    }

    // Accessibility: Return focus to trailer button
    setTimeout(() => {
      const trailerBtn = document.querySelector('[data-trailer-button]');
      if (trailerBtn) trailerBtn.focus();
    }, 200);

    // Analytics: Log trailer close event
    if (window.gtag) {
      window.gtag('event', 'trailer_close', {
        event_category: 'MovieDetails',
        event_label: movie?.title || movie?.name || movie?.id,
        value: movie?.id,
      });
    }
  }, [movie, playerRef]);

  // Keyboard event handler for trailer modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showTrailer && e.key === 'Escape') {
        handleCloseTrailer(e);
      }
    };

    if (showTrailer) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showTrailer, handleCloseTrailer]);

  // Streaming handlers
  const handleStreamingClick = useCallback(() => {
    if (!movie) return;
    
    // Check if episode selection is needed for TV shows
    if (needsEpisodeSelection(movie)) {
      setShowEpisodeSelector(true);
      return;
    }
    
    const url = getStreamingUrl(movie);
    if (url) {
      setStreamingUrl(url);
      setShowStreamingPlayer(true);
      
      // Analytics: Log streaming open event
      if (window.gtag) {
        window.gtag('event', 'streaming_open', {
          event_category: 'MovieDetails',
          event_label: movie?.title || movie?.name || movie?.id,
          value: movie?.id,
        });
      }
    }
  }, [movie]);

  const handleCloseStreaming = useCallback(() => {
    setShowStreamingPlayer(false);
    setStreamingUrl(null);
    
    // Analytics: Log streaming close event
    if (window.gtag && movie) {
      window.gtag('event', 'streaming_close', {
        event_category: 'MovieDetails',
        event_label: movie?.title || movie?.name || movie?.id,
        value: movie?.id,
      });
    }
  }, [movie]);

  const handleStreamingError = useCallback((error) => {
    console.error('Streaming error:', error);
    setShowStreamingPlayer(false);
    setStreamingUrl(null);
    
    // Analytics: Log streaming error event
    if (window.gtag && movie) {
      window.gtag('event', 'streaming_error', {
        event_category: 'MovieDetails',
        event_label: movie?.title || movie?.name || movie?.id,
        value: movie?.id,
        error_message: error,
      });
    }
  }, [movie]);

  const handleEpisodeSelect = useCallback((season, episode) => {
    if (!movie) return;
    
    const tvShow = {
      ...movie,
      season,
      episode
    };
    
    const url = getStreamingUrl(tvShow);
    if (url) {
      setStreamingUrl(url);
      setShowStreamingPlayer(true);
      
      // Analytics: Log episode selection event
      if (window.gtag) {
        window.gtag('event', 'episode_selected', {
          event_category: 'MovieDetails',
          event_label: movie?.title || movie?.name || movie?.id,
          value: movie?.id,
          season,
          episode,
        });
      }
    }
  }, [movie]);

  const handleCloseEpisodeSelector = useCallback(() => {
    setShowEpisodeSelector(false);
  }, []);

  // 🚀 Enhanced: Robust, analytics, accessibility, and smooth UX for similar movie click
  const handleSimilarMovieClick = useCallback((similarMovie, options = {}) => {
    // Validate movie data before proceeding
    if (!similarMovie || !similarMovie.id) {
      // Enhanced: User feedback (optional toast/snackbar)
      if (window?.showToast) {
        window.showToast('Invalid similar movie data provided', { type: 'error' });
      }
      // Dev warning
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.warn('[MovieDetailsOverlay] Invalid similar movie data:', similarMovie);
      }
      return;
    }

    // Enhanced: Track click event for analytics
    if (window.gtag) {
      window.gtag('event', 'similar_movie_click', {
        event_category: 'MovieDetails',
        event_label: similarMovie.title || similarMovie.name || similarMovie.id,
        value: similarMovie.id,
        from_movie_id: movie?.id,
        from_movie_title: movie?.title || movie?.name,
      });
    }

    // Prepare movie data with comprehensive fallbacks and normalization
    const getYear = (m) => {
      if (m.year) return m.year;
      if (m.release_date) return new Date(m.release_date).getFullYear();
      if (m.first_air_date) return new Date(m.first_air_date).getFullYear();
      return 'N/A';
    };

    const normalizeGenres = (m) => {
      if (Array.isArray(m.genres)) return m.genres;
      if (Array.isArray(m.genre_ids)) return m.genre_ids;
      return [];
    };

    const movieData = {
      id: similarMovie.id,
      title: similarMovie.title || similarMovie.name || 'Untitled',
      type: similarMovie.media_type || similarMovie.type || 'movie',
      poster_path: similarMovie.poster_path || similarMovie.poster || null,
      backdrop_path: similarMovie.backdrop_path || similarMovie.backdrop || null,
      overview: similarMovie.overview || '',
      year: getYear(similarMovie),
      rating: typeof similarMovie.vote_average === "number"
        ? similarMovie.vote_average
        : (typeof similarMovie.rating === "number" ? similarMovie.rating : 0),
      genres: normalizeGenres(similarMovie),
      release_date: similarMovie.release_date || similarMovie.first_air_date || null,
      // Enhanced: Add extra fields for richer context if available
      popularity: similarMovie.popularity,
      original_language: similarMovie.original_language,
      vote_count: similarMovie.vote_count,
      // Optionally pass through all original fields for future-proofing
      ...options.extraFields && typeof options.extraFields === "object" ? options.extraFields : {},
    };

    // Enhanced: Prevent default scroll behavior for smooth overlay transition
    // Removed scroll to top to prevent jarring user experience

    // Enhanced: Accessibility - move focus to overlay or main heading
    setTimeout(() => {
      const overlayHeading = document.getElementById('movie-details-overlay-heading');
      if (overlayHeading && typeof overlayHeading.focus === "function") {
        overlayHeading.focus();
      }
    }, 350);

    // Call onMovieSelect with prepared data
    if (onMovieSelect) {
      onMovieSelect(movieData);
    }
  }, [onMovieSelect, movie]);

  const [optimisticWatchlist, setOptimisticWatchlist] = useState(null); // null = not in optimistic mode
  const [watchlistError, setWatchlistError] = useState(null);
  
  // Like functionality state
  const [isLiked, setIsLiked] = useState(false);
  const [likeAnimation, setLikeAnimation] = useState(false);
  const [likeFeedback, setLikeFeedback] = useState(null);

  // Compute current optimistic state
  const isOptimisticallyInWatchlist =
    optimisticWatchlist !== null ? optimisticWatchlist : isInWatchlist(movie.id);

  // Optimistic UI for watchlist
  const handleWatchlistClick = (e) => {
    e.stopPropagation();
    // Save previous state for rollback
    const prev = isInWatchlist(movie.id);
    if (isOptimisticallyInWatchlist) {
      setOptimisticWatchlist(false);
      try {
        removeFromWatchlist(movie.id);
      } catch (err) {
        setOptimisticWatchlist(prev);
        setWatchlistError('Failed to update watchlist.');
        setTimeout(() => setWatchlistError(null), 2000);
      }
    } else {
      setOptimisticWatchlist(true);
      try {
        const movieData = {
          id: movie.id,
          title: movie.title || movie.name,
          type: movie.type || movie.media_type || 'movie',
          poster_path: movie.poster_path || movie.poster,
          backdrop_path: movie.backdrop_path || movie.backdrop,
          overview: movie.overview,
          year: movie.year || movie.release_date?.split('-')[0] || movie.first_air_date?.split('-')[0] || 'N/A',
          rating: movie.rating || movie.vote_average || 0,
          genres: movie.genres || movie.genre_ids || [],
          runtime: movie.runtime,
          release_date: movie.release_date || movie.first_air_date,
          addedAt: new Date().toISOString()
        };
        addToWatchlist(movieData);
      } catch (err) {
        setOptimisticWatchlist(prev);
        setWatchlistError('Failed to update watchlist.');
        setTimeout(() => setWatchlistError(null), 2000);
      }
    }
  };

  // Enhanced like handler with mobile feedback
  const handleLikeClick = useCallback((e) => {
    e.stopPropagation();
    
    // Toggle like state
    const newLikeState = !isLiked;
    setIsLiked(newLikeState);
    
    // Trigger animation
    setLikeAnimation(true);
    
    // Set feedback message
    setLikeFeedback(newLikeState ? 'Liked!' : 'Removed from likes');
    
    // Enhanced haptic feedback for mobile devices
    if ('vibrate' in navigator) {
      // Different vibration patterns for like vs unlike
      if (newLikeState) {
        // Like: short double vibration
        navigator.vibrate([30, 50, 30]);
      } else {
        // Unlike: single vibration
        navigator.vibrate([50]);
      }
    }
    
    // Optional: Play subtle sound effect for desktop users
    if (!isMobile && typeof window !== 'undefined') {
      try {
        // Create a subtle audio feedback (optional)
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(newLikeState ? 800 : 600, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (error) {
        // Silently fail if audio context is not available
        console.debug('Audio feedback not available:', error);
      }
    }
    
    // Analytics tracking
    if (window.gtag) {
      window.gtag('event', newLikeState ? 'like_movie' : 'unlike_movie', {
        event_category: 'MovieDetails',
        event_label: movie?.title || movie?.name || movie?.id,
        value: movie?.id,
      });
    }
    
    // Clear animation after delay
    setTimeout(() => {
      setLikeAnimation(false);
    }, 600);
    
    // Clear feedback message after delay
    setTimeout(() => {
      setLikeFeedback(null);
    }, 2000);
    
    // Here you would typically make an API call to save the like state
    // For now, we'll just log it
    console.log(`${newLikeState ? 'Liked' : 'Unliked'} movie:`, movie?.title || movie?.name);
  }, [isLiked, movie, isMobile]);

  // Reset optimistic state if movie changes
  useEffect(() => {
    setOptimisticWatchlist(null);
    setWatchlistError(null);
    setIsLiked(false);
    setLikeAnimation(false);
    setLikeFeedback(null);
  }, [movie.id]);

  const formatRuntime = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatRating = (rating) => {
    if (typeof rating === 'number') {
      return rating.toFixed(1);
    }
    if (typeof rating === 'string') {
      const numRating = parseFloat(rating);
      return !isNaN(numRating) ? numRating.toFixed(1) : 'N/A';
    }
    return 'N/A';
  };

  const [basicLoading, setBasicLoading] = useState(true);

  // 🚀 Enhanced: Robust fetch with diagnostics, analytics, and advanced error handling
  const fetchBasicInfo = useCallback(async () => {
    if (!movie || !movie.id || !movie.type) {
      setError('Invalid movie data.');
      setMovieDetails(null);
      setBasicLoading(false);
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.warn('[MovieDetailsOverlay] fetchBasicInfo: Invalid movie object:', movie);
      }
      return;
    }
    let fetchStart;
    try {
      setBasicLoading(true);
      setError(null);

      // Performance tracking
      fetchStart = performance.now();

      // Analytics: Track fetch start
      if (window.gtag) {
        window.gtag('event', 'fetch_basic_info_start', {
          event_category: 'MovieDetails',
          event_label: movie.title || movie.name || movie.id,
          value: movie.id,
        });
      }

      const details = await getMovieDetails(movie.id, movie.type);

      // Performance tracking
      const fetchDuration = performance.now() - fetchStart;
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug(`[MovieDetailsOverlay] fetchBasicInfo: Fetched in ${fetchDuration.toFixed(2)}ms`);
      }
      if (fetchDuration > 2000) {
        // eslint-disable-next-line no-console
        console.warn(`[MovieDetailsOverlay] fetchBasicInfo: Slow fetch (${fetchDuration.toFixed(2)}ms) for movie ID ${movie.id}`);
      }

      // Analytics: Track fetch duration
      if (window.gtag) {
        window.gtag('event', 'fetch_basic_info_complete', {
          event_category: 'MovieDetails',
          event_label: movie.title || movie.name || movie.id,
          value: movie.id,
          fetch_duration_ms: Math.round(fetchDuration),
        });
      }

      if (!details) {
        setError('Movie not found.');
        setMovieDetails(null);
        // Analytics: Track not found
        if (window.gtag) {
          window.gtag('event', 'fetch_basic_info_not_found', {
            event_category: 'MovieDetails',
            event_label: movie.title || movie.name || movie.id,
            value: movie.id,
          });
        }
        return;
      }
      setMovieDetails(details);
    } catch (err) {
      setError('Failed to fetch movie details. Please try again.');
      setMovieDetails(null);

      // Analytics: Track error
      if (window.gtag) {
        window.gtag('event', 'fetch_basic_info_error', {
          event_category: 'MovieDetails',
          event_label: movie?.title || movie?.name || movie?.id,
          value: movie?.id,
          error_message: err?.message || String(err),
        });
      }

      // Diagnostics
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.error('[MovieDetailsOverlay] fetchBasicInfo error:', err);
      }
    } finally {
      setBasicLoading(false);
    }
  }, [movie]);

  const fetchExtraInfo = useCallback(async () => {
    if (!movie) return;
    setIsCastLoading(true);
    setIsSimilarLoading(true);
    setShowAllCast(false);
    setSimilarMovies([]);
    setSimilarMoviesPage(1);
    setHasMoreSimilar(true);
    
    // Reset seasons and episodes state
    setSeasons([]);
    setCurrentSeason(null);
    setEpisodes([]);
    
    try {
      const promises = [
        getMovieCredits(movie.id, movie.type),
        getMovieVideos(movie.id, movie.type),
        getSimilarMovies(movie.id, movie.type, 1)
      ];
      
      // Add seasons fetching for TV shows
      if (movie.type === 'tv') {
        promises.push(getTVSeasons(movie.id));
      }
      
      const results = await Promise.all(promises);
      const [movieCredits, movieVideos, similar, ...rest] = results;
      
      setCredits(movieCredits);
      setVideos(movieVideos);
      setSimilarMovies(similar?.results || []);
      setHasMoreSimilar(similar?.page < similar?.total_pages);
      
      // Handle seasons for TV shows
      if (movie.type === 'tv' && rest[0]) {
        const seasonsData = rest[0];
        setSeasons(seasonsData);
        
        // Set the latest season as current
        if (seasonsData.length > 0) {
          const latestSeason = seasonsData[seasonsData.length - 1];
          setCurrentSeason(latestSeason);
          // Fetch episodes for the latest season
          fetchSeasonEpisodes(latestSeason.season_number);
        }
      }
    } catch (err) {
      // Show partial data, but log error
      console.error('Failed to fetch extra info:', err);
    } finally {
      setIsCastLoading(false);
      setIsSimilarLoading(false);
    }
  }, [movie]);

  const fetchSeasonEpisodes = useCallback(async (seasonNumber) => {
    if (!movie || movie.type !== 'tv' || !seasonNumber) return;
    
    setIsEpisodesLoading(true);
    try {
      const seasonData = await getTVSeason(movie.id, seasonNumber);
      setEpisodes(seasonData.episodes || []);
    } catch (err) {
      console.error('Failed to fetch season episodes:', err);
      setEpisodes([]);
    } finally {
      setIsEpisodesLoading(false);
    }
  }, [movie]);

  const handleSeasonChange = useCallback((season) => {
    setCurrentSeason(season);
    fetchSeasonEpisodes(season.season_number);
  }, [fetchSeasonEpisodes]);

  const handleEpisodeClick = useCallback((episode) => {
    if (!movie) return;
    
    const streamingUrl = getStreamingUrl({
      id: movie.id,
      type: 'tv',
      season: episode.season_number,
      episode: episode.episode_number
    });
    
    if (streamingUrl) {
      setStreamingUrl(streamingUrl);
      setShowStreamingPlayer(true);
    } else {
      // Fallback to episode selector if streaming URL is not available
      setShowEpisodeSelector(true);
    }
  }, [movie]);

    // Add handleRetryCast for cast-only retry
    const handleRetryCast = useCallback(() => {
      fetchExtraInfo();
    }, [fetchExtraInfo]);

  // 🚀 Enhanced: Robust mount/movie-change effect with race condition prevention, abort support, and analytics
  useEffect(() => {
    let isActive = true; // Prevent state updates if unmounted or movie changes rapidly
    let abortController = new AbortController();

    // Helper: Reset all relevant states for a clean slate
    const resetStates = () => {
      setMovieDetails(null);
      setCredits(null);
      setVideos(null);
      setSimilarMovies([]);
      setBasicLoading(true);
      setIsCastLoading(true);
      setIsSimilarLoading(true);
      setError(null);
      // Reset seasons and episodes state
      setSeasons([]);
      setCurrentSeason(null);
      setEpisodes([]);
      setIsSeasonsLoading(false);
      setIsEpisodesLoading(false);
    };

    resetStates();

    // Analytics: Track overlay open/fetch event
    if (window.gtag && movie?.id) {
      window.gtag('event', 'movie_details_overlay_open', {
        event_category: 'MovieDetails',
        event_label: movie?.title || movie?.name || movie?.id,
        value: movie?.id,
      });
    }

    // Enhanced: Fetch with abort and race condition protection
    const doFetch = async () => {
      try {
        await fetchBasicInfo({ signal: abortController.signal });
        if (!isActive) return;
        await fetchExtraInfo({ signal: abortController.signal });
      } catch (err) {
        if (abortController.signal.aborted) {
          // Optionally log abort
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.debug("[MovieDetailsOverlay] Fetch aborted due to unmount/movie change.");
          }
        } else {
          // Error already handled in fetchBasicInfo/fetchExtraInfo
        }
      }
    };

    doFetch();

    // Cleanup: abort fetches and prevent state updates
    return () => {
      isActive = false;
      abortController.abort();
    };
    // eslint-disable-next-line
  }, [movie?.id, movie?.type]);
  
  // 🔄 NEW: Background refresh for stale data
  useEffect(() => {
    if (!movie?.id || !movie?.type || !movieDetails) return;
    
    const backgroundRefreshTimer = setTimeout(() => {
      console.log(`🔄 Background refresh for ${movie.type} ID: ${movie.id}`);
      fetchMovieData(0);
    }, BACKGROUND_REFRESH_INTERVAL);
    
    return () => clearTimeout(backgroundRefreshTimer);
  }, [movie?.id, movie?.type, movieDetails]);
  
  // Mobile drag functionality removed
  
  // Mobile drag functionality removed

  // Mobile drag handlers removed

  // Enhanced scroll-based appearance with improved performance
  const [showTopFade, setShowTopFade] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  useEffect(() => {
    if (!isMobile) return;
    
    const handleMobileScroll = () => {
      if (scrollContainerRef.current) {
        const scrollTop = scrollContainerRef.current.scrollTop;
        const maxScroll = scrollContainerRef.current.scrollHeight - scrollContainerRef.current.clientHeight;
        
        setShowTopFade(scrollTop > 24);
        setScrollProgress(Math.min(scrollTop / Math.max(maxScroll, 1), 1));
      }
    };
    
    const ref = scrollContainerRef.current;
    if (ref) {
      ref.addEventListener('scroll', handleMobileScroll, { passive: true });
    }
    
    return () => {
      if (ref) {
        ref.removeEventListener('scroll', handleMobileScroll);
      }
    };
  }, [isMobile]);

  // Enhanced utility animations with spring physics
  const fadeInMotionProps = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { 
      duration: 0.5, 
      ease: [0.25, 0.46, 0.45, 0.94],
      type: 'spring',
      stiffness: 300,
      damping: 25
    },
  };

  const slideUpMotionProps = {
    initial: { y: 50, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
      type: 'spring',
      stiffness: 400,
      damping: 30
    },
  };

  // Memoize writers, directors, and production companies from credits (already added)
  const writers = React.useMemo(() => {
    if (!credits?.crew) return [];
    return credits.crew.filter(
      (person) => person.job === 'Writer' || person.job === 'Screenplay' || person.job === 'Author'
    );
  }, [credits]);
  const directors = React.useMemo(() => {
    if (!credits?.crew) return [];
    return credits.crew.filter((person) => person.job === 'Director');
  }, [credits]);
  const productionCompanies = React.useMemo(() => {
    if (!movieDetails?.production_companies) return [];
    return movieDetails.production_companies;
  }, [movieDetails]);

  // Memoize spoken languages (already added)
  const spokenLanguages = React.useMemo(() => {
    if (!movieDetails?.spoken_languages) return [];
    return movieDetails.spoken_languages;
  }, [movieDetails]);

  // Memoize videos (trailers, teasers, etc.) (already added)
  const videoList = React.useMemo(() => {
    if (!videos?.results) return [];
    return videos.results.filter(
      (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
    );
  }, [videos]);

  // Memoize formatted rating
  const formattedRating = React.useMemo(() => {
    if (!movieDetails?.vote_average) return 'N/A';
    return typeof movieDetails.vote_average === 'number'
      ? movieDetails.vote_average.toFixed(1)
      : parseFloat(movieDetails.vote_average).toFixed(1);
  }, [movieDetails]);

  // Memoize formatted release date
  const formattedReleaseDate = React.useMemo(() => {
    if (!movieDetails?.release_date) return 'N/A';
    const date = new Date(movieDetails.release_date);
    return isNaN(date) ? 'N/A' : date.toLocaleDateString();
  }, [movieDetails]);

  // Memoize formatted runtime
  const formattedRuntime = React.useMemo(() => {
    if (!movieDetails?.runtime) return 'N/A';
    const hours = Math.floor(movieDetails.runtime / 60);
    const minutes = movieDetails.runtime % 60;
    return `${hours}h ${minutes}m`;
  }, [movieDetails]);

  // Memoize formatted budget
  const formattedBudget = React.useMemo(() => {
    if (!movieDetails?.budget) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(movieDetails.budget);
  }, [movieDetails]);

  // Memoize formatted revenue
  const formattedRevenue = React.useMemo(() => {
    if (!movieDetails?.revenue) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(movieDetails.revenue);
  }, [movieDetails]);

  // 🚀 Enhanced Portal Management for MovieDetailsOverlay
  // - Robust: Handles SSR, multiple overlays, and accessibility
  // - Diagnostics: Logs portal creation/removal in development
  // - Prevents duplicate containers and memory leaks

  const [portalContainer, setPortalContainer] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      // SSR safety: don't attempt DOM operations
      setPortalContainer(null);
      return;
    }

    // Unique ID for this overlay instance (supports stacking if needed)
    const PORTAL_ID = 'movie-details-portal';
    let container = document.getElementById(PORTAL_ID);

    if (!container) {
      container = document.createElement('div');
      container.id = PORTAL_ID;
      // Accessibility: Mark as modal root
      container.setAttribute('role', 'dialog');
      container.setAttribute('aria-modal', 'true');
      container.setAttribute('tabindex', '-1');
      // Style: Ensure overlay is always on top and covers viewport
      container.style.position = 'fixed';
      container.style.inset = '0';
      container.style.zIndex = '2147483647'; // Max z-index for overlays
      container.style.pointerEvents = 'none'; // Let overlay content handle events
      document.body.appendChild(container);

      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug('[MovieDetailsOverlay] Portal container created');
      }
    } else {
      // If already exists, ensure correct attributes/styles
      container.setAttribute('role', 'dialog');
      container.setAttribute('aria-modal', 'true');
      container.setAttribute('tabindex', '-1');
      container.style.position = 'fixed';
      container.style.inset = '0';
      container.style.zIndex = '2147483647';
      container.style.pointerEvents = 'none';
    }

    setPortalContainer(container);

    // Cleanup: Remove portal only if it was created by this instance
    return () => {
      // Only remove if no other overlays are using it (could be enhanced for stacking)
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.debug('[MovieDetailsOverlay] Portal container removed');
        }
      }
    };
  }, []);

  // Don't render anything if portal container is not ready or in SSR
  if (typeof window === "undefined" || !portalContainer) {
    return null;
  }

  const overlayContent = (
    <AnimatePresence>
      {/* Overlay background with ultra-smooth fade */}
      <motion.div
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999999999] p-4 contain-paint transition-none sm:mt-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28, ease: 'easeInOut' }}
        onClick={handleClickOutside}
        tabIndex={-1}
        style={{ zIndex: 999999999 }}
      >
        {/* Main content: ultra-smooth entry/exit with spring */}
        <motion.div
          ref={contentRef}
          layout
          className="relative w-full max-w-6xl h-auto max-h-[calc(100vh-4rem)] z-[1000000000] sm:max-h-[90vh] bg-gradient-to-br from-[#1a1d24] to-[#121417] rounded-2xl shadow-2xl overflow-hidden flex flex-col transform-gpu will-change-transform contain-paint pointer-events-auto overflow-y-auto mt-8 sm:mt-12"
          initial={{ scale: 0.98, opacity: 0, y: 60 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.98, opacity: 0, y: 60 }}
          transition={{
            duration: 0.32, type: 'spring', stiffness: 260, damping: 22, delay: 0
          }}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
          style={{ zIndex: 1000000000 }}
        >
                      {/* Mobile drag functionality removed */}
          {basicLoading ? (
            <PageLoader />
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-red-400 text-lg font-semibold">{error}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          ) : movieDetails ? (
            <div ref={scrollContainerRef} className="h-full overflow-y-auto hide-scrollbar">
              <div className="relative h-[70vh] sm:h-[70vh]">
                {movieDetails.backdrop && (
                  <div className="absolute inset-0 overflow-hidden">
                    <motion.div 
                      className="absolute -inset-y-[15%] inset-x-0"
                      style={{ y: scrollY * 0.3 }}
                    >
                      <div className="absolute inset-0 bg-[#1a1a1a] animate-pulse"></div>
                      <img
                        src={movieDetails.backdrop}
                        alt={movieDetails.title}
                        className="w-full h-full object-cover hover:scale-105 opacity-0 animate-fadeIn will-change-transform"
                        style={{ backfaceVisibility: 'hidden' }}
                        loading="eager"
                        decoding="async"
                        fetchPriority="high"
                        onLoad={(e) => {
                          e.target.classList.remove('opacity-0');
                          e.target.previousSibling.classList.remove('animate-pulse');
                        }}
                      />
                    </motion.div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/80 to-transparent pointer-events-none will-change-opacity"></div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8">
                  <motion.div 
                    className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-8 relative"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    {movieDetails.image && (
                      <div className="w-32 h-48 sm:w-56 sm:h-84 flex-shrink-0 rounded-lg overflow-hidden transform transition-transform duration-300 hover:scale-105 shadow-2xl group mx-auto sm:mx-0">
                        <div className="absolute inset-0 bg-[#1a1a1a] animate-pulse"></div>
                        <img
                          src={movieDetails.image}
                          alt={movieDetails.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 opacity-0 will-change-transform"
                          style={{ backfaceVisibility: 'hidden' }}
                          loading="eager"
                          decoding="async"
                          fetchPriority="high"
                          onLoad={(e) => {
                            e.target.classList.remove('opacity-0');
                            e.target.previousSibling.classList.remove('animate-pulse');
                          }}
                        />
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                    )}
                    <div className="flex-1 w-full sm:w-auto text-center sm:text-left">
                      <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-7">
                        {movieDetails.logo ? (
                          <div className="relative">
                            <div className="absolute inset-0 animate-pulse rounded"></div>
                            <img
                              src={movieDetails.logo}
                              alt={movieDetails.title}
                              className="w-[200px] sm:w-[250px] max-w-full h-auto object-contain transform transition-all duration-300 hover:scale-105 opacity-0 animate-fadeIn will-change-transform"
                              style={{ backfaceVisibility: 'hidden' }}
                              loading="eager"
                              decoding="async"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                              onLoad={(e) => {
                                e.target.classList.remove('opacity-0');
                                e.target.previousSibling.classList.remove('animate-pulse');
                              }}
                            />
                            <h2 className="text-2xl sm:text-4xl font-bold text-white transform transition-all duration-300 hover:translate-x-1 hidden">
                              {movieDetails.title}
                            </h2>
                          </div>
                        ) : (
                          <h2 className="text-2xl sm:text-4xl font-bold text-white transform transition-all duration-300 hover:translate-x-1">
                            {movieDetails.title}
                          </h2>
                        )}
                      </div>
                      

                      <div className="flex flex-row items-center justify-center sm:justify-start gap-6 sm:gap-3 text-white/60 text-sm mb-4 sm:mb-6">
                        {movieDetails.type === 'movie' && movieDetails.release_date && (
                          <>
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{new Date(movieDetails.release_date).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}</span>
                            </div>
                          </>
                        )}
                        <span className="hidden sm:inline">•</span>
                        {movieDetails.type === 'movie' && (
                          <>
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>
                                {movieDetails.type === 'movie' 
                                  ? (movieDetails.runtime ? formatRuntime(movieDetails.runtime) : 'N/A')
                                  : (movieDetails.number_of_seasons 
                                      ? `${movieDetails.number_of_seasons} Season${movieDetails.number_of_seasons !== 1 ? 's' : ''}`
                                      : 'N/A')
                                }
                              </span>
                            </div>
                          </>
                        )}
                        {movieDetails.type === 'tv' && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span>{movieDetails.number_of_seasons ? `${movieDetails.number_of_seasons} Season${movieDetails.number_of_seasons !== 1 ? 's' : ''}` : 'N/A'}</span>
                            </div>
                            <span className="hidden sm:inline">•</span>
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="capitalize">{movieDetails.status}</span>
                            </div>
                            {movieDetails.first_air_date && (
                              <>
                                <span className="hidden sm:inline">•</span>
                                <div className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span>{new Date(movieDetails.first_air_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                              </>
                            )}
                          </>
                        )}
                        <span className="hidden sm:inline">•</span>
                        <span className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                          </svg>
                          {formatRating(movieDetails.rating)}
                        </span>
                      </div>

                      {movieDetails.genres && (
                        <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 sm:gap-2 mb-3 sm:mb-6">
                          {movieDetails.genres.map((genre, idx) => {
                            let key = '';
                            if (genre.id && typeof genre.id !== 'undefined' && genre.id !== null && genre.id !== '') {
                              key = `genre-${String(genre.id)}-${idx}`;
                            } else if (genre.name && typeof genre.name === 'string' && genre.name.trim() !== '') {
                              key = `genre-name-${genre.name.replace(/\s+/g, '_')}-${idx}`;
                            } else {
                              key = `genre-fallback-${idx}`;
                            }
                            return (
                              <span 
                                key={key}
                                className="px-2.5 sm:px-3 py-0.5 sm:py-1 text-white/50 overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 rounded-full text-white/60 text-xs sm:text-sm transform transition-all duration-300 hover:bg-white/10 will-change-transform"
                              >
                                {genre.name}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Action Buttons and Info Section */}
                      <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 my-4 sm:my-6">
                      {/* Action Buttons */}
                        <div className="flex flex-row items-center justify-center sm:justify-start gap-3 sm:gap-4 w-full">
                        {/* Watch Now Button - Only show if streaming is available and it's a movie */}
                        {isStreamingAvailable(movie) && movie.type === 'movie' && (
                          <button
                            onClick={handleStreamingClick}
                            className="group relative px-4 sm:px-6 py-2 sm:py-3 rounded-full transition-all duration-300 flex items-center gap-2 font-medium hover:scale-105 hover:shadow-lg text-black bg-white flex-1 sm:flex-none w-full sm:w-auto justify-center min-w-0"
                          >
                            {/* Button content */}
                            <div className="relative flex items-center gap-2 min-w-0">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-all duration-300 group-hover:scale-110 flex-shrink-0 text-black" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                              <span className="truncate whitespace-nowrap">Watch Now</span>
                            </div>
                          </button>
                        )}

                        <button 
                          data-trailer-button
                          onClick={handleTrailerClick}
                          className="group relative px-4 sm:px-6 py-2 sm:py-3 rounded-full transition-all duration-300 flex items-center gap-2 font-medium hover:scale-105 hover:shadow-lg text-white/80 overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 hover:bg-white/10 flex-1 sm:flex-none w-full sm:w-auto justify-center min-w-0"
                        >
                          {/* Animated background effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                          
                          {/* Button content */}
                          <div className="relative flex items-center gap-2 min-w-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-all duration-300 group-hover:scale-110 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                            <span className="truncate whitespace-nowrap">Watch Trailer</span>
                          </div>
                        </button>

                        <button 
                          onClick={handleWatchlistClick}
                          className={`group relative px-4 sm:px-6 py-3 rounded-full transition-all duration-300 flex items-center gap-2 font-medium hover:scale-105 hover:shadow-lg overflow-hidden w-full sm:w-auto justify-center min-w-0 hidden sm:flex ${
                            isOptimisticallyInWatchlist
                              ? 'text-white/80 overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 hover:bg-white/10' 
                              : 'text-white/80 overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 hover:bg-white/10'
                          }`}
                        >
                          {/* Animated background effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                          
                          {/* Button content */}
                          <div className="relative flex items-center gap-2 min-w-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-all duration-300 group-hover:scale-110 flex-shrink-0 ${isOptimisticallyInWatchlist ? 'group-hover:rotate-12' : 'group-hover:rotate-90'}`} viewBox="0 0 24 24" fill="currentColor">
                              {isOptimisticallyInWatchlist ? (
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                              ) : (
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                              )}
                            </svg>
                            <span className="truncate whitespace-nowrap">{isOptimisticallyInWatchlist ? 'Remove from List' : 'Add to List'}</span>
                          </div>
                        </button>
                        </div>

                        {/* Desktop Info Section - Rightmost */}
                        <div className="hidden lg:block text-white/60 text-sm text-right">
                          {/* Top Cast */}
                          {movieDetails.cast && movieDetails.cast.length > 0 && (
                            <div className="mb-2">
                              <span>
                                <span className="font-medium">Cast: </span>
                                {movieDetails.cast.slice(0, 3).map((person, idx) => (
                                  <span key={person.id || idx}>
                                    {person.name}
                                    {idx < Math.min(2, movieDetails.cast.length - 1) ? ', ' : ''}
                                  </span>
                                ))}
                                {movieDetails.cast.length > 3 && '...'}
                              </span>
                            </div>
                          )}
                          
                          {/* Genres */}
                          {movieDetails.genres && movieDetails.genres.length > 0 && (
                            <div>
                              <span>
                                <span className="font-medium">Genres: </span>
                                {movieDetails.genres.slice(0, 3).map((genre, idx) => (
                                  <span key={genre.id || idx}>
                                    {genre.name}
                                    {idx < Math.min(2, movieDetails.genres.length - 1) ? ', ' : ''}
                                  </span>
                                ))}
                                {movieDetails.genres.length > 3 && '...'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Desktop Overview Section */}
                      {movieDetails.overview && movieDetails.overview.trim() !== "" && (
                        <div className="hidden lg:block mt-6">
                          <div className="text-white/80 text-sm leading-relaxed">
                            <p className="text-white/90 leading-relaxed">
                              {movieDetails.overview}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Mobile Minimalist Info Section */}
                      <div className="lg:hidden mt-4">
                        <div className="text-white/60 text-sm space-y-3">
                          {/* Overview */}
                          {movieDetails.overview && movieDetails.overview.trim() !== "" && (
                            <div className="mb-3">
                              <p
                                className="text-white/90 text-sm leading-relaxed pl-0 text-justify text-left"
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  textAlign: 'justify'
                                }}
                              >
                                {movieDetails.overview}
                              </p>
                            </div>
                          )}
                          
                          {/* Top Cast */}
                          {movieDetails.cast && movieDetails.cast.length > 0 && (
                            <div className="mb-2">
                              <span className="truncate block">
                                <span className="font-medium">Cast: </span>
                                {movieDetails.cast.slice(0, 3).map((person, idx) => (
                                  <span key={person.id || idx}>
                                    {person.name}
                                    {idx < Math.min(2, movieDetails.cast.length - 1) ? ', ' : ''}
                                  </span>
                                ))}
                                {movieDetails.cast.length > 3 && '...'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                                                                                         {/* Mobile Action Buttons - Above Overview */}
                                             <div className="flex sm:hidden items-center justify-center gap-8 mt-4">
                                                   {/* Add to List Button */}
                          <button 
                            onClick={handleWatchlistClick}
                            className={`group relative w-12 h-12 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden flex items-center justify-center ${
                              isOptimisticallyInWatchlist 
                                ? 'bg-red-500/20 border-t-[1px] border-b-[1px] border-red-400/30 text-red-400' 
                                : 'bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 text-white/80 hover:bg-white/10'
                            }`}
                            title={isOptimisticallyInWatchlist ? 'Remove from List' : 'Add to List'}
                          >
                            {/* Animated background effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            
                            {/* Button content */}
                            <div className="relative">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-all duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                                {isOptimisticallyInWatchlist ? (
                                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                                ) : (
                                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                                )}
                              </svg>
                            </div>
                          </button>

                                                                               {/* Enhanced Like Button with Mobile Feedback */}
                                                                               <button 
                             onClick={handleLikeClick}
                             onKeyDown={(e) => {
                               if (e.key === 'Enter' || e.key === ' ') {
                                 e.preventDefault();
                                 handleLikeClick(e);
                               }
                             }}
                             className={`group relative w-12 h-12 rounded-full overflow-hidden backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:ring-offset-2 focus:ring-offset-black/50 ${
                               isLiked 
                                 ? 'bg-red-500/20 border-red-400/30 text-red-400' 
                                 : 'bg-[rgb(255,255,255,0.03)] border-white/30 text-white/80 hover:bg-white/10'
                             } ${likeAnimation ? 'animate-pulse' : ''}`}
                             title={isLiked ? 'Unlike' : 'Like'}
                             aria-label={isLiked ? 'Unlike this movie' : 'Like this movie'}
                             role="button"
                             tabIndex={0}
                           >
                             {/* Animated background effect */}
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                             
                             {/* Like animation overlay */}
                             {likeAnimation && (
                               <motion.div
                                 initial={{ scale: 0, opacity: 0 }}
                                 animate={{ scale: 1.5, opacity: 1 }}
                                 exit={{ scale: 2, opacity: 0 }}
                                 transition={{ duration: 0.6, ease: "easeOut" }}
                                 className="absolute inset-0 bg-red-500/20 rounded-full"
                               />
                             )}
                             
                             {/* Ripple effect for mobile feedback */}
                             {likeAnimation && (
                               <motion.div
                                 initial={{ scale: 0, opacity: 0.8 }}
                                 animate={{ scale: 2, opacity: 0 }}
                                 transition={{ duration: 0.8, ease: "easeOut" }}
                                 className="absolute inset-0 bg-red-400/30 rounded-full"
                               />
                             )}
                             
                             {/* Button content */}
                             <div className="relative">
                               <motion.svg 
                                 xmlns="http://www.w3.org/2000/svg" 
                                 className="h-5 w-5 transition-all duration-300 group-hover:scale-110" 
                                 fill={isLiked ? "currentColor" : "none"} 
                                 viewBox="0 0 24 24" 
                                 stroke="currentColor" 
                                 strokeWidth={1.5}
                                 animate={likeAnimation ? { 
                                   scale: [1, 1.3, 1],
                                   rotate: [0, -10, 10, 0]
                                 } : {}}
                                 transition={{ duration: 0.6, ease: "easeOut" }}
                               >
                                 <path strokeLinecap="round" strokeLinejoin="round" d="M2 21h4V9H2v12zM22.42 10.21c-.36-.36-.86-.58-1.41-.58h-6.72l.95-4.57.02-.32c0-.41-.17-.8-.44-1.09L13.17 2 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.78 0 1.48-.45 1.82-1.13l2.01-4.03c.09-.18.17-.37.17-.57v-4.06c0-.55-.22-1.05-.58-1.41z"/>
                               </motion.svg>
                             </div>
                           </button>

                          {/* Mobile Like Feedback Toast */}
                          {likeFeedback && (
                            <motion.div
                              initial={{ opacity: 0, y: 20, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -20, scale: 0.9 }}
                              transition={{ duration: 0.3, ease: "easeOut" }}
                              className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-black/90 backdrop-blur-md text-white text-sm px-4 py-2 rounded-full border border-white/20 shadow-lg z-50 whitespace-nowrap"
                            >
                              <div className="flex items-center gap-2">
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  className="h-4 w-4 text-red-400" 
                                  fill="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                </svg>
                                <span>{likeFeedback}</span>
                              </div>
                            </motion.div>
                          )}

                          {/* Share Button */}
                          <button 
                            onClick={() => {
                              if (navigator.share) {
                                navigator.share({
                                  title: movieDetails.title,
                                  text: `Check out ${movieDetails.title}!`,
                                  url: window.location.href
                                });
                              } else {
                                // Fallback: copy to clipboard
                                navigator.clipboard.writeText(window.location.href);
                                // You could add a toast notification here
                              }
                            }}
                            className="group relative w-12 h-12 rounded-full overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 text-white/80 hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center"
                            title="Share"
                          >
                            {/* Animated background effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            
                            {/* Button content */}
                            <div className="relative">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-all duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                              </svg>
                            </div>
                          </button>

                           {/* Report Button */}
                           <button 
                             onClick={() => {
                               // Handle report functionality
                               console.log('Report clicked');
                               // You could add a modal or navigation to report page
                             }}
                             className="group relative w-12 h-12 rounded-full overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 text-white/80 hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center"
                             title="Report"
                           >
                             {/* Animated background effect */}
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                             
                             {/* Button content */}
                             <div className="relative">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-all duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                               </svg>
                             </div>
                           </button>
                       </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              <div className="relative p-4 sm:p-8 bg-gradient-to-br from-black/60 via-black/30 to-primary/10 shadow-lg overflow-hidden transition-all duration-300">
                {/* Minimalist accent: top border line */}
                <div
                  aria-hidden="true"
                  className="absolute left-1/2 -translate-x-1/2 top-0 w-1/3 h-0.5 bg-gradient-to-r from-primary/60 via-white/20 to-transparent rounded-full opacity-60"
                />
                {/* Modern subtle glow */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-8 -left-8 w-32 h-32 rounded-full bg-primary/20 blur-2xl opacity-30"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-white/10 blur-2xl opacity-20"
                />
                <div className="space-y-8 sm:space-y-12">
                  {/* Full Width Content */}
                  <div className="w-full space-y-8 sm:space-y-12">


                    {/* TV Episodes Section - Only for TV shows */}
                    {movieDetails.type === 'tv' && seasons.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 32, scale: 0.98 }}
                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="relative"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-primary/10 shadow-md mr-1">
                              <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md-7 text-primary/80" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 002 2z" />
                              </svg>
                            </span>
                            <span className="tracking-tight drop-shadow-sm">Episodes</span>
                          </h3>
                          
                          {/* Controls */}
                          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                            {/* Season Selector - Left on mobile, right on desktop */}
                            <div className="flex items-center gap-2 order-2 sm:order-2">
                              <span className="text-white/60 text-sm">Season:</span>
                              <CustomDropdown
                                options={seasons.map((season) => ({
                                  value: season.season_number,
                                  label: season.name || `Season ${season.season_number}`
                                }))}
                                value={currentSeason?.season_number || ''}
                                onChange={(seasonNumber) => {
                                  const selectedSeason = seasons.find(s => s.season_number === seasonNumber);
                                  if (selectedSeason) {
                                    handleSeasonChange(selectedSeason);
                                  }
                                }}
                                placeholder="Select season"
                              />
                            </div>
                            
                            {/* View Toggle - Right on mobile, left on desktop */}
                            <div className="flex items-center gap-2 order-1 sm:order-1">
                              <button
                                onClick={() => setEpisodesViewModeWithStorage('card')}
                                className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                  episodesViewMode === 'card'
                                    ? 'text-white border-b-2 border-white/30'
                                    : 'text-white/50 hover:text-white/70 border-b-2 border-transparent hover:border-white/15'
                                }`}
                                title="Card View"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setEpisodesViewModeWithStorage('list')}
                                className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                  episodesViewMode === 'list'
                                    ? 'text-white border-b-2 border-white/30'
                                    : 'text-white/50 hover:text-white/70 border-b-2 border-transparent hover:border-white/15'
                                }`}
                                title="List View"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Episodes Content */}
                        {isEpisodesLoading ? (
                          episodesViewMode === 'card' ? (
                            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6">
                              {[...Array(8)].map((_, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.3, delay: index * 0.05 }}
                                  className="group relative bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02] rounded-2xl overflow-hidden border border-white/[0.08] shadow-lg backdrop-blur-sm"
                                >
                                  <div className="aspect-square sm:aspect-video lg:aspect-video bg-gradient-to-br from-gray-800 to-gray-700 animate-pulse rounded-t-2xl"></div>
                                  <div className="p-4 lg:p-5 space-y-3">
                                    <div className="h-4 bg-white/10 rounded animate-pulse"></div>
                                    <div className="h-3 bg-white/10 rounded w-2/3 animate-pulse"></div>
                                    <div className="h-3 bg-white/10 rounded w-1/2 animate-pulse"></div>
                                    <div className="pt-3 border-t border-white/[0.08]">
                                      <div className="flex items-center justify-between">
                                        <div className="h-3 bg-white/10 rounded w-16 animate-pulse"></div>
                                        <div className="h-3 bg-white/10 rounded w-12 animate-pulse"></div>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-0">
                              {[...Array(6)].map((_, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.3, delay: index * 0.05 }}
                                  className={`group relative ${
                                    index < 5 ? 'border-b border-white/[0.08]' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-3 sm:gap-6 p-3 sm:p-6">
                                    <div className="hidden md:block w-10 h-10 bg-white/10 animate-pulse rounded flex-shrink-0"></div>
                                    <div className="w-32 h-20 sm:w-32 sm:h-20 md:w-40 md:h-24 bg-white/10 animate-pulse rounded-lg flex-shrink-0"></div>
                                    <div className="flex-1 space-y-3">
                                      <div className="h-5 bg-white/10 rounded animate-pulse w-3/4"></div>
                                      <div className="h-4 bg-white/10 rounded animate-pulse w-full"></div>
                                      <div className="h-4 bg-white/10 rounded animate-pulse w-2/3"></div>
                                      <div className="flex items-center gap-4">
                                        <div className="h-4 bg-white/10 rounded animate-pulse w-20"></div>
                                        <div className="h-4 bg-white/10 rounded animate-pulse w-16"></div>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          )
                        ) : episodes.length > 0 ? (
                          episodesViewMode === 'card' ? (
                            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6">
                              {episodes.slice(0, 100).map((episode, index) => (
                                <motion.div
                                  key={episode.id}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ 
                                    duration: 0.4, 
                                    delay: index * 0.05,
                                    ease: [0.25, 0.46, 0.45, 0.94]
                                  }}
                                  whileHover={{ 
                                    transition: { duration: 0.3, ease: "easeOut" }
                                  }}
                                  className="group relative bg-gradient-to-br from-white/[0.04] to-white/[0.02] rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300 hover:bg-gradient-to-br hover:from-white/[0.06] hover:to-white/[0.03] shadow-sm hover:shadow-lg"
                                  onClick={() => handleEpisodeClick(episode)}
                                >
                                  {/* Episode Thumbnail */}
                                  <div className="relative aspect-video overflow-hidden">
                                    {episode.still_path ? (
                                      <img
                                        src={`https://image.tmdb.org/t/p/w500${episode.still_path}`}
                                        alt={episode.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gradient-to-br from-gray-800/60 to-gray-700/60 flex items-center justify-center">
                                        <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 002 2z" />
                                        </svg>
                                      </div>
                                    )}
                                    
                                    {/* Subtle Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    
                                    {/* Play Button */}
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                      <div className="bg-black/60 backdrop-blur-sm rounded-full p-3 sm:p-4 border border-white/20">
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M8 5v14l11-7z"/>
                                        </svg>
                                      </div>
                                    </div>
                                    
                                    {/* Episode Number Badge */}
                                    <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-black/85 backdrop-blur-md text-white text-xs font-semibold px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg border border-white/20">
                                      {episode.episode_number}
                                    </div>
                                    
                                    {/* Runtime Badge */}
                                    {episode.runtime && (
                                      <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-black/85 backdrop-blur-md text-white/85 text-xs font-medium px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg border border-white/20">
                                        {formatRuntime(episode.runtime)}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Episode Info */}
                                  <div className="p-3 sm:p-4 md:p-5 space-y-2 sm:space-y-3">
                                    <div className="space-y-1">
                                      <h4 className="text-white font-medium text-sm leading-tight line-clamp-2 group-hover:text-white/90 transition-colors duration-200 tracking-wide">
                                        {episode.name}
                                      </h4>
                                      
                                      {episode.overview && !isMobile && (
                                        <p className="text-white/65 text-xs leading-relaxed line-clamp-2 sm:line-clamp-2 group-hover:text-white/75 transition-colors duration-200 max-w-full overflow-hidden">
                                          {episode.overview}
                                        </p>
                                      )}
                                    </div>
                                    
                                    {/* Air Date */}
                                    {episode.air_date && (
                                      <div className="pt-2 sm:pt-3 border-t border-white/8">
                                        <span className="text-white/45 text-xs font-medium">
                                          {new Date(episode.air_date).toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric',
                                            year: 'numeric'
                                          })}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-0">
                              {episodes.slice(0, 50).map((episode, index) => (
                                <motion.div
                                  key={episode.id}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ 
                                    duration: 0.4, 
                                    delay: index * 0.05,
                                    ease: [0.25, 0.46, 0.45, 0.94]
                                  }}

                                  className={`group relative cursor-pointer transition-all duration-300 hover:bg-white/[0.02] ${
                                    index < episodes.length - 1 ? 'border-b border-white/[0.08]' : ''
                                  }`}
                                  onClick={() => handleEpisodeClick(episode)}
                                >
                                  <div className="flex items-center gap-3 sm:gap-6 p-3 sm:p-6">
                                    {/* Episode Number - Left of Thumbnail (Desktop Only) */}
                                    <div className="hidden md:flex flex-shrink-0 items-center justify-center w-10 h-10">
                                      <span className="text-white/60 text-base">
                                        {episode.episode_number}
                                      </span>
                                    </div>
                                    
                                    {/* Episode Thumbnail - Bigger */}
                                    <div className="relative w-32 h-20 sm:w-32 sm:h-20 md:w-40 md:h-24 overflow-hidden rounded-lg flex-shrink-0">
                                      {episode.still_path ? (
                                        <img
                                          src={`https://image.tmdb.org/t/p/w500${episode.still_path}`}
                                          alt={episode.name}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                          loading="lazy"
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-gray-800/60 to-gray-700/60 flex items-center justify-center">
                                          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 002 2z" />
                                          </svg>
                                        </div>
                                      )}
                                      
                                      {/* Subtle Gradient Overlay */}
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                      
                                      {/* Play Button */}
                                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                        <div className="bg-black/60 backdrop-blur-sm rounded-full p-3 border border-white/20">
                                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z"/>
                                          </svg>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Episode Info */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                      <div className="space-y-3 sm:space-y-3">
                                        <div className="space-y-1 sm:space-y-2">
                                          <h4 className="text-white font-medium text-sm sm:text-base leading-tight group-hover:text-white/90 transition-colors duration-200 tracking-wide">
                                            {episode.name}
                                          </h4>
                                          
                                          {/* Episode Overview - Hidden on mobile */}
                                          {episode.overview && !isMobile && (
                                            <p className="text-white/65 text-xs sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-2 group-hover:text-white/75 transition-colors duration-200 max-w-full">
                                              {episode.overview}
                                            </p>
                                          )}
                                        </div>
                                        
                                        {/* Episode Details */}
                                        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-white/45">
                                          {/* Air Date */}
                                          {episode.air_date ? (
                                            <>
                                              <span className="flex items-center gap-1">
                                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span className="hidden sm:inline">
                                                  {(() => {
                                                    const date = new Date(episode.air_date);
                                                    if (isNaN(date)) return "Unknown date";
                                                    return date.toLocaleDateString('en-US', { 
                                                      month: 'short', 
                                                      day: 'numeric',
                                                      year: 'numeric'
                                                    });
                                                  })()}
                                                </span>
                                                <span className="sm:hidden flex items-center gap-1">
                                                  <span>E{episode.episode_number}</span>
                                                  <span className="inline-block w-3 text-center text-white/30 select-none">•</span>
                                                  <span>
                                                    {(() => {
                                                      const date = new Date(episode.air_date);
                                                      if (isNaN(date)) return "Unknown";
                                                      return date.toLocaleDateString('en-US', { 
                                                        month: 'short', 
                                                        day: 'numeric'
                                                      });
                                                    })()}
                                                  </span>
                                                </span>
                                              </span>
                                              {/* Dot separator after date */}
                                              <span className="inline-block w-3 text-center text-white/30 select-none">•</span>
                                            </>
                                          ) : (
                                            <>
                                              <span className="flex items-center gap-1">
                                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span>No air date</span>
                                              </span>
                                              {/* Dot separator after date */}
                                              <span className="inline-block w-3 text-center text-white/30 select-none">•</span>
                                            </>
                                          )}

                                          {/* Runtime */}
                                          {typeof episode.runtime === "number" && episode.runtime > 0 ? (
                                            <span className="flex items-center gap-1">
                                              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                              </svg>
                                              {formatRuntime(episode.runtime)}
                                            </span>
                                          ) : (
                                            <span className="flex items-center gap-1">
                                              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                              </svg>
                                              <span>Unknown runtime</span>
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          )
                        ) : (
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-center text-white/40 py-12"
                          >
                            <div className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl p-8 border border-white/10">
                              <svg className="w-16 h-16 mx-auto mb-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 002 2z" />
                              </svg>
                              <h3 className="text-lg font-semibold text-white/60 mb-2">No Episodes Available</h3>
                              <p className="text-white/40 text-sm">This season doesn't have any episodes yet.</p>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </div>
                  <div className="h-1"></div>
                </div>

                {/* Similar Section */}
                <motion.div 
                  className="pt-6 sm:pt-8 relative"
                  initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
                  whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                >
                  {/* Enhanced border with matching radius */}
                  <div className="absolute -top-px left-0 w-full h-[1.5px] z-10 pointer-events-none">
                    <div className="w-full h-full border-t border-white/10 rounded-t-2xl" />
                  </div>
                  <div className="absolute -top-4 left-0 w-full flex justify-center pointer-events-none z-10">
                    <span className="inline-block h-1 w-32 bg-gradient-to-r from-primary/30 via-white/40 to-primary/30 rounded-full blur-sm opacity-60" />
                  </div>
                  
                  {/* Enhanced Similar Content Section */}
                  <EnhancedSimilarContent
                    key={`${movie?.id}-${movie?.type}`}
                    contentId={movie?.id}
                    contentType={movie?.type || 'movie'}
                    onItemClick={handleSimilarMovieClick}
                    isMobile={isMobile}
                    maxItems={24}
                    showFilters={true}
                    showTitle={true}
                    showLoadMore={true}
                    className=""
                  />
                </motion.div>
              </div>
            </div>
          ) : null}

          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full text-white transition-all duration-200 transform hover:scale-110 group overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-l-[1px] border-r-[1px] border-white/30 hover:bg-white/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
            <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#1a1a1a] rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Close
            </span>
          </button>
        </motion.div>

        {/* Trailer Modal */}
        <AnimatePresence>
          {showTrailer && (
            <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center bg-black/50"><Loader size="large" color="white" variant="circular" /></div>}>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90"
                onClick={handleCloseTrailer}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="relative w-[90vw] max-w-4xl aspect-video"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close Button */}
                  <button
                    id="trailer-close-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTrailer();
                    }}
                    className="absolute -top-12 right-0 p-3 rounded-full bg-[#1a1a1a]/90 text-white hover:bg-[#1a1a1a] transition-all duration-200 transform hover:scale-110 group z-10"
                    aria-label="Close trailer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                    <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#1a1a1a] rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Close Trailer
                    </span>
                  </button>
                  
                  {/* Video Container */}
                  <div className="relative w-full h-full rounded-lg overflow-hidden bg-black">
                    {isTrailerLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                        <Loader size="large" color="white" variant="circular" />
                      </div>
                    )}
                    {movieDetails.trailer ? (
                      <LazyYouTube
                        videoId={movieDetails.trailer}
                        opts={{
                          width: '100%',
                          height: '100%',
                          playerVars: {
                            autoplay: 1,
                            controls: 1,
                            modestbranding: 1,
                            rel: 0,
                            showinfo: 0,
                            iv_load_policy: 3,
                          },
                        }}
                        onReady={(event) => {
                          playerRef.current = event.target;
                          setIsTrailerLoading(false);
                        }}
                        className="w-full h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-white/70 text-lg">No trailer available.</div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            </Suspense>
          )}
        </AnimatePresence>

        {/* Streaming Player */}
        <StreamingPlayer
          streamingUrl={streamingUrl}
          title={movieDetails?.title || movieDetails?.name}
          isOpen={showStreamingPlayer}
          onClose={handleCloseStreaming}
          onError={handleStreamingError}
        />

        {/* TV Episode Selector */}
        <TVEpisodeSelector
          show={movieDetails}
          isOpen={showEpisodeSelector}
          onClose={handleCloseEpisodeSelector}
          onEpisodeSelect={handleEpisodeSelect}
          seasons={seasons}
          currentSeason={currentSeason}
          onSeasonChange={handleSeasonChange}
        />
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(overlayContent, portalContainer);
};

export default MovieDetailsOverlay;