import React, { useState, useRef, useEffect, useCallback, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { getMovieDetails, getMovieCredits, getMovieVideos, getSimilarMovies, getTVSeason, getTVSeasons } from '../services/tmdbService';
import { useWatchlist } from '../contexts/WatchlistContext';
import { Loader, PageLoader, SectionLoader, CardLoader } from './Loader';
import { getStreamingUrl, isStreamingAvailable, needsEpisodeSelection } from '../services/streamingService';
import StreamingPlayer from './StreamingPlayer';
import TVEpisodeSelector from './TVEpisodeSelector';

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
    });

    // eslint-disable-next-line
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

  const handleCloseTrailer = useCallback(() => {
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

    // Accessibility: Return focus to close button or overlay
    setTimeout(() => {
      const closeBtn = document.getElementById("trailer-close-btn");
      if (closeBtn) closeBtn.focus();
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

    // Enhanced: Optionally scroll to top for better UX
    if (options.scrollToTop !== false) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

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

  // Reset optimistic state if movie changes
  useEffect(() => {
    setOptimisticWatchlist(null);
    setWatchlistError(null);
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

  const { isMobile, isTablet, isDesktop } = useIsMobile();
  
  // 🚀 Ultra-enhanced mobile drag state with advanced performance optimizations
  const [dragY, setDragY] = useState(0);
  const dragYRef = useRef(0); // Single source of truth for drag position
  const [isDragging, setIsDragging] = useState(false);
  const [dragDirection, setDragDirection] = useState('none'); // 'up', 'down', 'none'
  const [dragIntensity, setDragIntensity] = useState(0); // 0-1 scale for visual feedback
  const dragStartY = useRef(null);
  const lastDragY = useRef(0);
  const dragStartTime = useRef(0);
  const dragThreshold = 120; // Reduced for more responsive UX
  const velocityThreshold = 1.2; // Increased for better flick detection
  const resistanceFactor = 0.75; // More resistance for better feel
  const maxDragDistance = window.innerHeight * 0.8; // Maximum drag distance

  // 🎯 Advanced drag logic with predictive animations and performance optimizations
  const rafRef = useRef();
  const pendingDragY = useRef(null);
  const velocityRef = useRef(0);
  const lastFrameTime = useRef(Date.now());
  const dragHistory = useRef([]); // Enhanced velocity tracking
  const momentumRef = useRef(0); // Momentum for smooth animations
  const isAnimatingRef = useRef(false); // Prevent conflicts during animations
  const lastUpdateTime = useRef(0); // Throttle updates for smoothness
  const updateThreshold = 1000 / 120; // 120fps target for ultra-smooth performance
  const performanceMode = useRef('auto'); // Auto-detect high refresh rate displays
  
  // Auto-detect high refresh rate displays
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if device supports high refresh rate
      const mediaQuery = window.matchMedia('(min-resolution: 120dpi)');
      const hasHighRefreshRate = window.matchMedia('(min-resolution: 120dpi)').matches || 
                                window.devicePixelRatio >= 2;
      
      if (hasHighRefreshRate) {
        performanceMode.current = 'high';
      } else {
        performanceMode.current = 'standard';
      }
    }
  }, []);
  
  const updateDragY = useCallback(() => {
    if (pendingDragY.current !== null && !isAnimatingRef.current) {
      const now = Date.now();
      
      // Adaptive frame rate based on device capability
      const targetFPS = performanceMode.current === 'high' ? 120 : 60;
      const adaptiveThreshold = 1000 / targetFPS;
      
      // Ultra-smooth updates with adaptive throttling
      if (now - lastUpdateTime.current >= adaptiveThreshold) {
        const newDragY = pendingDragY.current;
        
        // Improved change detection for smoother scrolling
        const changeThreshold = performanceMode.current === 'high' ? 0.05 : 0.1;
        if (Math.abs(newDragY - dragYRef.current) > changeThreshold) {
          setDragY(newDragY);
          dragYRef.current = newDragY;
          
          // Optimized drag direction and intensity calculation
          const normalizedDrag = Math.min(newDragY / dragThreshold, 1);
          setDragIntensity(normalizedDrag);
          
          // Only update direction if it actually changed
          const newDirection = newDragY > 15 ? 'down' : newDragY < -15 ? 'up' : 'none';
          if (newDirection !== dragDirection) {
            setDragDirection(newDirection);
          }
        }
        
        lastUpdateTime.current = now;
        pendingDragY.current = null;
      }
    }
    
    // Continue RAF loop only if still dragging
    if (isDragging && !isAnimatingRef.current) {
      rafRef.current = requestAnimationFrame(updateDragY);
    }
  }, [isDragging, dragThreshold, dragDirection]);

  useEffect(() => {
    if (!isMobile || !isDragging) return;
    rafRef.current = requestAnimationFrame(updateDragY);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isDragging, isMobile, updateDragY]);

  // 🎮 Enhanced drag handlers with advanced touch handling and haptic feedback
  const handleDragStart = useCallback((e) => {
    e.stopPropagation();
    
    if (isAnimatingRef.current) return; // Prevent drag during animations
    
    // Ultra-fast state initialization for 120fps
    setIsDragging(true);
    setDragDirection('none');
    setDragIntensity(0);
    
    // High-performance drag state setup
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    dragStartTime.current = Date.now();
    lastDragY.current = dragYRef.current;
    lastFrameTime.current = Date.now();
    lastUpdateTime.current = Date.now();
    
    // Instant velocity and momentum reset for 120fps
    velocityRef.current = 0;
    momentumRef.current = 0;
    dragHistory.current = [];
    pendingDragY.current = 0;
    
    // Optimized body style management
    document.body.style.userSelect = 'none';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    
    // Minimal haptic feedback for 120fps responsiveness
    if (navigator.vibrate && isMobile) {
      navigator.vibrate(5);
    }
  }, [isMobile]);

  const handleDragMove = useCallback((e) => {
    if (!isDragging || isAnimatingRef.current) return;
    e.stopPropagation();
    
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    let deltaY = clientY - dragStartY.current;
    
    // Ultra-smooth resistance system optimized for 120fps
    if (deltaY < 0) {
      // Upward drag - apply progressive resistance with micro-adjustments
      const resistance = Math.max(0.15, resistanceFactor - (Math.abs(deltaY) / 600));
      deltaY *= resistance;
    } else if (deltaY > maxDragDistance) {
      // Downward drag beyond max - apply refined rubber band effect
      const overshoot = deltaY - maxDragDistance;
      deltaY = maxDragDistance + (overshoot * 0.2);
    }
    
    // Ultra-optimized velocity calculation for 120fps with reduced jitter
    const now = Date.now();
    const dt = now - lastFrameTime.current;
    
    if (dt > 0 && dt < 50) { // Tighter bounds for 120fps
      // High-performance velocity tracking with reduced jitter
      if (dragHistory.current.length >= 2) {
        const recent = dragHistory.current.slice(-2);
        const velocity = (recent[1].position - recent[0].position) / (recent[1].time - recent[0].time);
        
        // Smoother velocity calculation to reduce jitter
        const smoothingFactor = 0.85;
        velocityRef.current = velocity * (1 - smoothingFactor) + velocityRef.current * smoothingFactor;
        momentumRef.current = velocityRef.current * 0.6;
      }
      
      // Efficient drag history for 120fps
      dragHistory.current.push({ time: now, position: deltaY });
      if (dragHistory.current.length > 3) { // Reduced for 120fps performance
        dragHistory.current.shift();
      }
      
      lastFrameTime.current = now;
      lastDragY.current = deltaY;
    }
    
    // Immediate pending drag position for 120fps responsiveness
    pendingDragY.current = Math.max(0, deltaY);
  }, [isDragging, resistanceFactor, maxDragDistance]);

  const handleDragEnd = useCallback(() => {
    if (isAnimatingRef.current) return;
    
    // Ultra-fast state cleanup for 120fps
    setIsDragging(false);
    setDragDirection('none');
    setDragIntensity(0);
    
    // Immediate body style restoration
    document.body.style.userSelect = '';
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    
    // Get final drag state
    const velocity = velocityRef.current;
    const finalDragY = dragYRef.current;
    const momentum = momentumRef.current;
    
    // High-performance dismissal logic
    const shouldDismiss = (finalDragY > dragThreshold && velocity >= 0) || 
                         (finalDragY > 80 && velocity > 0.4) ||
                         (finalDragY > 60 && momentum > 0.6);
    
    if (shouldDismiss) {
      isAnimatingRef.current = true;
      
      // Ultra-smooth dismiss animation for 120fps
      const baseDistance = window.innerHeight * 0.85;
      const momentumDistance = Math.abs(momentum) * 120;
      const dismissDistance = Math.min(baseDistance + momentumDistance, window.innerHeight * 1.05);
      
      setDragY(dismissDistance);
      dragYRef.current = dismissDistance;
      
      // Optimized haptic feedback for 120fps
      if (navigator.vibrate && isMobile) {
        navigator.vibrate([20, 10, 20]);
      }
      
      // Immediate onClose for 120fps responsiveness
      onClose();
      
      // Ultra-fast cleanup for 120fps
      setTimeout(() => {
        setDragY(0);
        dragYRef.current = 0;
        isAnimatingRef.current = false;
      }, 100);
    } else {
      isAnimatingRef.current = true;
      
      // Ultra-smooth snap-back for 120fps
      const snapBackDistance = Math.abs(momentum) * 20;
      const targetY = Math.max(0, finalDragY - snapBackDistance);
      
      setDragY(targetY);
      dragYRef.current = targetY;
      
      // Minimal haptic feedback
      if (navigator.vibrate && isMobile) {
        navigator.vibrate(10);
      }
      
      // Ultra-fast return to zero for 120fps
      setTimeout(() => {
        setDragY(0);
        dragYRef.current = 0;
        isAnimatingRef.current = false;
      }, 100);
    }
    
    // Instant drag state cleanup
    dragHistory.current = [];
    momentumRef.current = 0;
    velocityRef.current = 0;
  }, [dragThreshold, velocityThreshold, isMobile, onClose]);

  // Stable drag handlers for JSX usage with enhanced stability
  const stableHandleDragStart = useCallback((e) => {
    handleDragStart(e);
  }, [handleDragStart]);

  const stableHandleDragMove = useCallback((e) => {
    handleDragMove(e);
  }, [handleDragMove]);

  const stableHandleDragEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

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
          animate={{ scale: 1, opacity: 1, y: isMobile ? dragY : 0 }}
          exit={{ scale: 0.98, opacity: 0, y: 60 }}
          transition={isMobile ? {
            y: isDragging ? { type: 'tween', duration: 0 } : { type: 'spring', stiffness: 320, damping: 28, mass: 0.7 },
            scale: { type: 'spring', stiffness: 260, damping: 22 },
            opacity: { duration: 0.28 },
          } : {
            duration: 0.32, type: 'spring', stiffness: 260, damping: 22, delay: 0
          }}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
          style={isMobile ? { touchAction: 'pan-y', WebkitUserSelect: 'none', userSelect: 'none', willChange: 'transform', zIndex: 1000000000 } : { zIndex: 1000000000 }}
          onTouchStart={isMobile ? stableHandleDragStart : undefined}
          onTouchMove={isMobile ? stableHandleDragMove : undefined}
          onTouchEnd={isMobile ? stableHandleDragEnd : undefined}
          onMouseDown={isMobile ? stableHandleDragStart : undefined}
          onMouseMove={isMobile && isDragging ? stableHandleDragMove : undefined}
          onMouseUp={isMobile ? stableHandleDragEnd : undefined}
          onMouseLeave={isMobile && isDragging ? stableHandleDragEnd : undefined}
        >
          {/* Mobile drag handle/slider */}
          {isMobile && (
            <>
              {/* 🚀 Ultra-enhanced mobile drag handle with haptic feedback, accessibility, and visual cues */}
              <div
                className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center group"
                style={{ width: '100%', pointerEvents: 'auto', userSelect: 'none' }}
                role="button"
                aria-label="Drag to close overlay"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleDragStart(e);
                  }
                }}
                onFocus={(e) => {
                  // Optionally highlight handle on focus for accessibility
                  e.currentTarget.classList.add('ring-2', 'ring-white/80');
                }}
                onBlur={(e) => {
                  e.currentTarget.classList.remove('ring-2', 'ring-white/80');
                }}
                aria-describedby="drag-hint"
              >
                {/* Minimalist, modern drag handle with subtle shadow and pure white color */}
                <motion.div
                  className={`w-16 h-2 rounded-full mb-2 cursor-grab active:cursor-grabbing transition-all duration-200 shadow-lg border border-white/10 group-focus:ring-2 group-focus:ring-white/80`}
                  style={{
                    background: isDragging
                      ? 'linear-gradient(90deg, #fff 0%, #fff 100%)'
                      : 'linear-gradient(90deg, #fff 0%, #e5e5e5 100%)',
                    opacity: isDragging ? 1 : 0.92,
                    touchAction: 'none',
                    boxShadow: isDragging
                      ? '0 6px 18px 0 rgba(255,255,255,0.25)'
                      : '0 2px 8px 0 rgba(0,0,0,0.18)',
                    outline: 'none',
                    transform: isDragging ? 'scale(1.12)' : 'scale(1)',
                    transition: 'background 0.18s, opacity 0.18s, transform 0.18s',
                  }}
                  whileHover={{ scale: 1.08, opacity: 1 }}
                  whileTap={{ scale: 0.98, opacity: 1 }}
                  onTouchStart={(e) => {
                    if (window.navigator?.vibrate) window.navigator.vibrate(10);
                    handleDragStart(e);
                  }}
                  onMouseDown={handleDragStart}
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  {/* Optional: Add a subtle inner shadow for depth */}
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '9999px',
                      boxShadow: isDragging
                        ? 'inset 0 1px 6px 0 rgba(0,0,0,0.10)'
                        : 'inset 0 1px 3px 0 rgba(0,0,0,0.08)',
                    }}
                  />
                </motion.div>
                {/* Animated drag indicator with icon */}
                <motion.div
                  className="flex items-center gap-1 text-white/70 text-xs font-semibold select-none"
                  id="drag-hint"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: isDragging ? 1 : 0.85, y: isDragging ? 0 : -4 }}
                  transition={{ duration: 0.18 }}
                >
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${dragDirection === 'down' ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l-6-6m6 6l6-6" />
                  </svg>
                  <span>
                    {isDragging
                      ? dragDirection === 'down'
                        ? 'Release to close'
                        : 'Keep dragging down'
                      : 'Drag down to close'}
                  </span>
                </motion.div>
              </div>

              {/* 🌈 Enhanced top fade gradient with dynamic opacity and subtle blur */}
              <motion.div
                className="pointer-events-none fixed left-0 right-0 top-0 z-[1000000001] h-10"
                style={{
                  background: 'linear-gradient(to bottom, rgba(18,20,23,0.98) 70%, rgba(18,20,23,0.0))',
                  borderTopLeftRadius: '1.25rem',
                  borderTopRightRadius: '1.25rem',
                  maxWidth: '100vw',
                  margin: '0 auto',
                  zIndex: 1000000001,
                  filter: showTopFade ? 'blur(0.5px)' : 'none',
                  transition: 'filter 0.2s',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: showTopFade ? 1 : 0 }}
                transition={{
                  duration: 0.28,
                  ease: 'easeInOut'
                }}
              />

              {/* 🖤 Minimalist & modern pure white top scroll progress bar */}
              {isDragging && (
                <motion.div
                  className="absolute top-0 left-0 right-0 h-1 z-40"
                  initial={{ scaleX: 0, opacity: 1 }}
                  animate={{
                    scaleX: dragIntensity,
                    opacity: dragIntensity > 0.2 ? 1 : 0.9,
                  }}
                  transition={{ duration: 0.14 }}
                  style={{
                    transformOrigin: 'left',
                    borderRadius: '2px',
                    background: '#fff',
                    boxShadow: dragIntensity > 0.85
                      ? '0 1px 8px 0 rgba(255,255,255,0.18)'
                      : '0 1px 4px 0 rgba(0,0,0,0.10)',
                  }}
                />
              )}
            </>
          )}
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
                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                          <span className="px-3 py-1.5 text-white/60 rounded-full text-sm bg-[rgb(255,255,255,0.05)] backdrop-blur-[1px] border-t-[1px] border-b-[1px] border-white/30">
                            {movieDetails.type === 'movie' ? 'Movie' : 'TV Series'}
                          </span>
                          <span className="text-white/70 text-base sm:text-lg font-semibold">
                            {movieDetails.type === 'tv'
                              ? (movieDetails.first_air_date
                                  ? new Date(movieDetails.first_air_date).getFullYear()
                                  : (movieDetails.release_date
                                      ? new Date(movieDetails.release_date).getFullYear()
                                      : 'N/A'))
                              : (movieDetails.release_date
                                  ? new Date(movieDetails.release_date).getFullYear()
                                  : 'N/A')}
                          </span>
                        </div>
                      </div>
                      

                      <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 text-white/60 text-sm mb-4 sm:mb-6">
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
                        <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4 sm:mb-6">
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
                                className="px-3 py-1 text-white/50 overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 rounded-full text-white/60 text-sm transform transition-all duration-300 hover:bg-white/10 will-change-transform"
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
                        <div className="flex flex-row items-center justify-center sm:justify-start gap-3 sm:gap-4">
                        {/* Watch Now Button - Only show if streaming is available and it's a movie */}
                        {isStreamingAvailable(movie) && movie.type === 'movie' && (
                          <button
                            onClick={handleStreamingClick}
                            className="group relative px-4 sm:px-6 py-3 rounded-full transition-all duration-300 flex items-center gap-2 font-medium hover:scale-105 hover:shadow-lg text-white/80 overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 hover:bg-white/10 w-full sm:w-auto justify-center min-w-0"
                          >
                            {/* Animated background effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            {/* Button content */}
                            <div className="relative flex items-center gap-2 min-w-0">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-all duration-300 group-hover:scale-110 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                              <span className="truncate whitespace-nowrap">Watch Now</span>
                            </div>
                          </button>
                        )}

                        <button 
                          onClick={handleTrailerClick}
                          className="group relative px-4 sm:px-6 py-3 rounded-full transition-all duration-300 flex items-center gap-2 font-medium hover:scale-105 hover:shadow-lg text-white/80 overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 hover:bg-white/10 w-full sm:w-auto justify-center min-w-0"
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
                          className={`group relative px-4 sm:px-6 py-3 rounded-full transition-all duration-300 flex items-center gap-2 font-medium hover:scale-105 hover:shadow-lg overflow-hidden w-full sm:w-auto justify-center min-w-0 ${
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
                      
                      {/* Mobile Minimalist Info Section */}
                      <div className="lg:hidden mt-4">
                        <div className="text-white/60 text-sm">
                          {/* Top Cast */}
                          {movieDetails.cast && movieDetails.cast.length > 0 && (
                            <div className="flex items-center gap-1 mb-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                              </svg>
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
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
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
                    {/* Enhanced Overview Section - Responsive for Mobile & Desktop */}
                    <motion.div
                      initial={{ opacity: 0, y: 32, scale: 0.98 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="relative"
                    >
                      <h3
                        className={`
                          text-lg sm:text-xl md:text-2xl font-bold text-white
                          mb-2 sm:mb-3 md:mb-4 flex items-center gap-2
                        `}
                      >
                        <span
                          className={`
                            inline-flex items-center justify-center
                            w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10
                            rounded-full bg-primary/10 shadow-md mr-1
                          `}
                        >
                          <svg
                            className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-primary/80"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.2}
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20l9-5-9-5-9 5 9 5zm0-10V4m0 0L7 7m5-3l5 3" />
                          </svg>
                        </span>
                        <span className="tracking-tight drop-shadow-sm">Storyline</span>
                      </h3>
                      <div className="relative group">
                        <motion.p
                          className={`
                            text-white/80 leading-relaxed
                            text-sm sm:text-base md:text-lg
                            transition-colors duration-300 group-hover:text-white font-serif
                            px-0 sm:px-1 md:px-2
                            ${movieDetails.overview && movieDetails.overview.length > 220 ? 'max-h-[8.5rem] sm:max-h-[10rem] md:max-h-[12rem] overflow-y-auto pr-1 sm:pr-2 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent' : ''}
                          `}
                          initial={{ opacity: 0.7, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.1 }}
                        >
                          {movieDetails.overview && movieDetails.overview.trim() !== "" ? (
                            <>
                              {/* Quotation mark accent */}
                              <span className="text-primary/70 text-xl sm:text-2xl font-bold align-top select-none mr-1">"</span>
                              <span className="align-middle">{movieDetails.overview}</span>
                              <span className="text-primary/70 text-xl sm:text-2xl font-bold align-bottom select-none ml-1">"</span>
                            </>
                          ) : (
                            <span className="italic text-white/40">No synopsis available for this movie.</span>
                          )}
                        </motion.p>
                        {/* Decorative animated gradient line */}
                        <motion.div
                          className={`
                            absolute left-0 bottom-0
                            w-14 sm:w-20 md:w-28 h-1
                            bg-gradient-to-r from-primary/80 via-primary/40 to-transparent
                            rounded-full opacity-80 group-hover:opacity-100
                            transition-opacity duration-300 shadow-lg
                          `}
                          initial={{ scaleX: 0.7, opacity: 0.7 }}
                          animate={{ scaleX: 1, opacity: 1 }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                          style={{ transformOrigin: 'left' }}
                        />
                        {/* Subtle floating icon accent (desktop only) */}
                        <motion.div
                          className="hidden md:block absolute -top-7 right-0 opacity-60 pointer-events-none"
                          initial={{ y: -8, opacity: 0 }}
                          animate={{ y: 0, opacity: 0.6 }}
                          transition={{ duration: 0.7, delay: 0.3, type: "spring", stiffness: 80 }}
                        >
                          <svg className="w-7 h-7 text-primary/40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20l9-5-9-5-9 5 9 5zm0-10V4m0 0L7 7m5-3l5 3" />
                          </svg>
                        </motion.div>
                        {/* Mobile floating icon accent (mobile only, smaller and lower opacity) */}
                        <motion.div
                          className="block md:hidden absolute -top-5 right-0 opacity-40 pointer-events-none"
                          initial={{ y: -6, opacity: 0 }}
                          animate={{ y: 0, opacity: 0.4 }}
                          transition={{ duration: 0.7, delay: 0.3, type: "spring", stiffness: 80 }}
                        >
                          <svg className="w-5 h-5 text-primary/30" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20l9-5-9-5-9 5 9 5zm0-10V4m0 0L7 7m5-3l5 3" />
                          </svg>
                        </motion.div>
                      </div>
                    </motion.div>

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
                              <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-primary/80" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 002 2z" />
                              </svg>
                            </span>
                            <span className="tracking-tight drop-shadow-sm">Episodes</span>
                          </h3>
                          
                          {/* Season Selector */}
                          <div className="flex items-center gap-2">
                            <span className="text-white/60 text-sm">Season:</span>
                            <select
                              value={currentSeason?.season_number || ''}
                              onChange={(e) => {
                                const selectedSeason = seasons.find(s => s.season_number === parseInt(e.target.value));
                                if (selectedSeason) {
                                  handleSeasonChange(selectedSeason);
                                }
                              }}
                              className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                              {seasons.map((season) => (
                                <option key={season.id} value={season.season_number}>
                                  {season.name || `Season ${season.season_number}`}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Episodes Grid */}
                        {isEpisodesLoading ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {[...Array(10)].map((_, index) => (
                              <div key={index} className="bg-white/5 rounded-lg p-4 animate-pulse">
                                <div className="w-full h-32 bg-white/10 rounded mb-3"></div>
                                <div className="h-4 bg-white/10 rounded mb-2"></div>
                                <div className="h-3 bg-white/10 rounded w-2/3"></div>
                              </div>
                            ))}
                          </div>
                        ) : episodes.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {episodes.map((episode) => (
                              <motion.div
                                key={episode.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="group relative bg-white/5 rounded-lg overflow-hidden hover:bg-white/10 transition-all duration-300 cursor-pointer"
                                onClick={() => handleEpisodeClick(episode)}
                              >
                                {/* Episode Thumbnail */}
                                <div className="relative aspect-video overflow-hidden">
                                  {episode.still_path ? (
                                    <img
                                      src={episode.still_path}
                                      alt={episode.name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-white/10 flex items-center justify-center">
                                      <svg className="w-12 h-12 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                  )}
                                  
                                  {/* Episode Number Badge */}
                                  <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                                    {episode.episode_number}
                                  </div>
                                  
                                  {/* Play Button Overlay */}
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z"/>
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Episode Info */}
                                <div className="p-4">
                                  <h4 className="text-white font-semibold text-sm mb-2 line-clamp-2">
                                    {episode.name}
                                  </h4>
                                  <div className="flex items-center justify-between text-white/60 text-xs">
                                    <span>{episode.runtime ? formatRuntime(episode.runtime) : 'N/A'}</span>
                                    {episode.air_date && (
                                      <span>{new Date(episode.air_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                    )}
                                  </div>
                                  {episode.overview && (
                                    <p className="text-white/50 text-xs mt-2 line-clamp-2">
                                      {episode.overview}
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-white/40 py-8">
                            <svg className="w-12 h-12 mx-auto mb-3 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 002 2z" />
                            </svg>
                            <p>No episodes available for this season.</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Similar Section */}
                <motion.div 
                  className="pt-6 sm:pt-8 mt-6 sm:mt-8 relative"
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
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
                    {/* Film reel SVG for "You might also like" */}
                    <svg className="w-6 h-6 text-primary/80 animate-spin-slow" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
                      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                      <circle cx="7.5" cy="12" r="1" fill="currentColor" />
                      <circle cx="16.5" cy="12" r="1" fill="currentColor" />
                      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
                      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
                    </svg>
                    You might also like
                  </h3>
                  {isSimilarLoading ? (
                    <div className="py-6 sm:py-8 flex justify-center items-center">
                      <CardLoader count={4} />
                    </div>
                  ) : similarToShow && similarToShow.length > 0 ? (
                    <>
                      <motion.div 
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        layout={false}
                      >
                        {similarToShow.map((similar, idx) => {
                          let key = '';
                          if (similar.id && typeof similar.id !== 'undefined' && similar.id !== null && similar.id !== '') {
                            key = `similar-${String(similar.id)}-${idx}`;
                          } else if (similar.title && typeof similar.title === 'string' && similar.title.trim() !== '') {
                            key = `similar-title-${similar.title.replace(/\s+/g, '_')}-${idx}`;
                          } else if (similar.name && typeof similar.name === 'string' && similar.name.trim() !== '') {
                            key = `similar-name-${similar.name.replace(/\s+/g, '_')}-${idx}`;
                          } else {
                            key = `similar-fallback-${idx}`;
                          }
                          return (
                            <motion.div
                              variants={itemVariants}
                              key={key}
                              layout={false}
                              {...fadeInMotionProps}
                              whileHover={{
                                scale: 1.045,
                                zIndex: 2,
                                boxShadow: "0 4px 32px 0 rgba(0,0,0,0.18), 0 0 0 2px #fff2"
                              }}
                              whileTap={{ scale: 0.98 }}
                              transition={{ type: "spring", stiffness: 260, damping: 18 }}
                            >
                              <SimilarMovieCard
                                similar={similar}
                                onClick={handleSimilarMovieClick}
                                isMobile={isMobile}
                                className="transition-shadow duration-200"
                              />
                            </motion.div>
                          );
                        })}
                      </motion.div>
                      {(similarMovies.length > similarToShow.length || hasMoreSimilar) && (
                        <div className="col-span-full flex flex-col items-center justify-center py-3 sm:py-4 gap-2">
                          {similarMovies.length > similarToShow.length && (
                            <button
                              onClick={handleShowMoreSimilar}
                              className="px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold text-primary bg-white/10 rounded-full hover:bg-primary/20 hover:text-white shadow transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
                            >
                              Show More
                            </button>
                          )}
                          {hasMoreSimilar && (
                            <div ref={similarLoaderRef} className="flex justify-center items-center w-full">
                              {isSimilarLoadingMore && <CardLoader count={4} />}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="col-span-full text-center text-gray-400 py-6 sm:py-8 text-sm sm:text-base flex flex-col items-center gap-2">
                      <svg className="w-10 h-10 mx-auto text-white/20 mb-2" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" strokeDasharray="2 2" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 9.5l5 5m0-5l-5 5" />
                      </svg>
                      <span>
                        No similar {movieDetails.type === 'movie' ? 'movies' : 'shows'} found.
                      </span>
                    </div>
                  )}
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
        {showTrailer && (
          <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center bg-black/50"><Loader size="large" color="white" variant="circular" /></div>}>
            <div 
              className={`fixed inset-0 z-[1000000002] flex items-center justify-center bg-black/90 transition-opacity duration-300 ${
                showTrailer ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ zIndex: 1000000002 }}
              onClick={handleCloseTrailer}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div 
                className="relative w-[90vw] max-w-4xl aspect-video transform transition-all duration-300 scale-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleCloseTrailer}
                  className="absolute -top-12 right-0 p-2 rounded-full bg-[#1a1a1a]/80 text-white hover:bg-[#1a1a1a] transition-all duration-200 transform hover:scale-110 group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                  <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#1a1a1a] rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Close Trailer
                  </span>
                </button>
                <div className="relative w-full h-full rounded-lg overflow-hidden">
                  {isTrailerLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
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
              </div>
            </div>
          </Suspense>
        )}

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
        />
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(overlayContent, portalContainer);
};

export default MovieDetailsOverlay;