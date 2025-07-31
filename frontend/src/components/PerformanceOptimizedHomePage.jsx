import React, { useState, useEffect, useRef, useCallback, memo, useMemo, lazy, Suspense } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, A11y } from 'swiper/modules';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE_URL, transformMovieData } from '../services/tmdbService';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { 
  getTrendingMovies, 
  getPopularMovies, 
  getTopRatedMovies, 
  getUpcomingMovies,
  getActionMovies,
  getComedyMovies,
  getDramaMovies,
  getHorrorMovies,
  getSciFiMovies,
  getDocumentaryMovies,
  getFamilyMovies,
  getAnimationMovies,
  getAwardWinningMovies,
  getLatestMovies,
  getMovieDetails,
  getMovieCredits,
  getMovieVideos,
  getSimilarMovies,
  getPopularTVShows,
  getTopRatedTVShows,
  getAiringTodayTVShows,
  getNowPlayingMovies
} from '../services/tmdbService';
import { PageLoader, SectionLoader, CardLoader } from './Loader';
import { useLoading } from '../contexts/LoadingContext';
import Navbar from './Navbar';
import { useWatchlist } from '../contexts/WatchlistContext';
const MovieDetailsOverlay = lazy(() => import('./MovieDetailsOverlay'));
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactPlayer from 'react-player';
import { useState as useToastState } from 'react';
import MinimalToast from './MinimalToast';
import { debounce as lodashDebounce } from 'lodash';
import { useSmoothScroll, useScrollAnimation, useScrollParallax } from '../hooks/useSmoothScroll';

// Lazy load heavy components
const HeroSection = lazy(() => import('./HeroSection'));
const MovieSection = lazy(() => import('./MovieSection'));

// Performance-optimized ProgressiveImage component
const ProgressiveImage = memo(({
  src,
  alt = "",
  className = "",
  style = {},
  aspectRatio = "16/10",
  srcSet,
  sizes,
  placeholderSrc,
  onLoad,
  onError,
  retryCount = 1,
  priority = false,
  ...rest
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(null);
  const [retry, setRetry] = useState(0);
  const imageRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  // Compute tiny/placeholder src
  const getTinySrc = useCallback(
    (src) => {
      if (!src) return null;
      if (placeholderSrc) return placeholderSrc;
      // Try to replace TMDB style /w500 or /original with /w92
      return src.replace(/\/(w\d+|original)/, "/w92");
    },
    [placeholderSrc]
  );

  // Retry logic for failed loads
  useEffect(() => {
    if (imageError && retry < retryCount && src) {
      retryTimeoutRef.current = setTimeout(() => {
        setImageError(false);
        setRetry((r) => r + 1);
      }, 500 + 500 * retry); // Exponential backoff
    }
    return () => clearTimeout(retryTimeoutRef.current);
  }, [imageError, retry, retryCount, src]);

  // Load tiny and full image
  useEffect(() => {
    if (!src) {
      setCurrentSrc(null);
      setImageLoaded(false);
      setImageError(false);
      return;
    }
    setImageLoaded(false);
    setImageError(false);
    setRetry(0);

    const tinySrc = getTinySrc(src);
    setCurrentSrc(tinySrc);

    // Preload full image with priority handling
    const fullImage = new window.Image();
    if (priority) {
      fullImage.fetchPriority = 'high';
    }
    fullImage.src = src;
    if (srcSet) fullImage.srcset = srcSet;
    fullImage.onload = () => {
      setCurrentSrc(src);
      setImageLoaded(true);
      if (onLoad) onLoad();
    };
    fullImage.onerror = (e) => {
      setImageError(true);
      if (onError) onError(e);
    };
  }, [src, srcSet, getTinySrc, retry, priority, onLoad, onError]);

  // Keyboard accessibility: focusable if onClick or tabIndex provided
  const isInteractive = !!rest.onClick || rest.tabIndex !== undefined;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        aspectRatio,
        ...style,
      }}
      aria-busy={!imageLoaded && !imageError}
      aria-label={alt}
      tabIndex={isInteractive ? 0 : undefined}
      {...rest}
    >
      {/* Shimmer Loading Placeholder */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#1a1d24] to-[#2b3036]">
          <div
            className="absolute inset-0 animate-shimmer"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.07) 50%, transparent)",
              backgroundSize: "200% 100%",
              animation: "shimmer 2s infinite linear",
            }}
          />
        </div>
      )}

      {/* Tiny Image (Blurred) */}
      {currentSrc && !imageError && !imageLoaded && (
        <div
          className="absolute inset-0 z-10 bg-cover bg-center transition-opacity duration-500"
          style={{
            backgroundImage: `url("${currentSrc}")`,
            filter: "blur(12px) brightness(0.95)",
            transform: "scale(1.08)",
            opacity: imageLoaded ? 0 : 1,
            transition: "opacity 0.5s",
          }}
          aria-hidden="true"
        />
      )}

      {/* Full Image (background-image for smooth fade, plus <img> for SEO/accessibility) */}
      {!imageError && currentSrc && (
        <>
          <div
            className={`absolute inset-0 z-20 bg-cover bg-center transition-all duration-700 ${
              imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
            }`}
            style={{
              backgroundImage: currentSrc === src ? `url("${src}")` : "none",
              backgroundPosition: "center 20%",
              imageRendering: "auto",
              WebkitBackfaceVisibility: "hidden",
              backfaceVisibility: "hidden",
              transform: "translateZ(0)",
              WebkitFontSmoothing: "antialiased",
              WebkitTransform: "translate3d(0,0,0)",
              transition:
                "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)",
            }}
            aria-hidden="true"
          />
          {/* Visually hidden <img> for SEO/accessibility, but not shown */}
          {src && (
            <img
              ref={imageRef}
              src={src}
              srcSet={srcSet}
              sizes={sizes}
              alt={alt}
              loading={priority ? "eager" : "lazy"}
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: "none",
                zIndex: -1,
              }}
              tabIndex={-1}
              aria-hidden="true"
              draggable={false}
              onLoad={() => {
                setImageLoaded(true);
                if (onLoad) onLoad();
              }}
              onError={(e) => {
                setImageError(true);
                if (onError) onError(e);
              }}
            />
          )}
        </>
      )}

      {/* Error Fallback */}
      {imageError && (
        <div className="absolute inset-0 z-30 bg-gradient-to-br from-[#1a1d24] to-[#2b3036] flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-white/20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-label="Image failed to load"
            role="img"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
    </div>
  );
});

// Performance-optimized MovieCard component
const MovieCard = memo(({ 
  title, 
  type, 
  image, 
  backdrop, 
  episodes, 
  seasons, 
  rating, 
  year, 
  duration, 
  runtime, 
  onMouseLeave, 
  onClick, 
  id, 
  prefetching, 
  cardClassName, 
  poster, 
  poster_path, 
  backdrop_path, 
  overview, 
  genres, 
  release_date, 
  first_air_date, 
  vote_average, 
  media_type, 
  onPrefetch,
  priority = false 
}) => {
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const [isInWatchlistState, setIsInWatchlistState] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [prefetchComplete, setPrefetchComplete] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const prefetchTimeoutRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsInWatchlistState(isInWatchlist(id));
  }, [id, isInWatchlist]);

  // Check if we're on mobile for responsive layout
  useEffect(() => {
    const checkScreenSize = () => {
      const isNowMobile = window.innerWidth < 768;
      setIsMobile(prev => {
        if (prev !== isNowMobile) {
          return isNowMobile;
        }
        return prev;
      });
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // Enhanced prefetching function with image preloading, error logging, and smarter checks
  const handlePrefetch = useCallback(async () => {
    if (prefetchComplete || isPrefetching) return;

    setIsPrefetching(true);

    try {
      // Prefetch movie details, similar movies, and high-res images
      const prefetchPromises = [];

      // Prefetch movie details if not already available
      if (!runtime || !overview) {
        prefetchPromises.push(
          getMovieDetails(id, media_type || type || 'movie').catch(err => {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Prefetch movie details failed:', err);
            }
            return null;
          })
        );
      }

      // Prefetch similar movies
      prefetchPromises.push(
        getSimilarMovies(id, media_type || type || 'movie', 1).catch(err => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Prefetch similar movies failed:', err);
          }
          return null;
        })
      );

      // Prefetch high-res poster and backdrop images if available
      const imageUrls = [];
      if (poster_path) {
        // Try to fetch a higher-res poster if not already loaded
        const posterUrl = `https://image.tmdb.org/t/p/w500${poster_path}`;
        imageUrls.push(posterUrl);
      }
      if (backdrop_path) {
        const backdropUrl = `https://image.tmdb.org/t/p/w780${backdrop_path}`;
        imageUrls.push(backdropUrl);
      }
      // Preload images in parallel
      const imagePrefetches = imageUrls.map(
        url =>
          new Promise(resolve => {
            const img = new window.Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
          })
      );
      if (imagePrefetches.length > 0) {
        prefetchPromises.push(Promise.all(imagePrefetches));
      }

      // Execute all prefetch operations
      await Promise.allSettled(prefetchPromises);
      setPrefetchComplete(true);

      // Notify parent component about successful prefetch
      if (onPrefetch) {
        onPrefetch(id);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Prefetch failed:', error);
      }
      // Prefetch failed silently in production
    } finally {
      setIsPrefetching(false);
    }
  }, [
    id,
    runtime,
    overview,
    media_type,
    type,
    prefetchComplete,
    isPrefetching,
    onPrefetch,
    poster_path,
    backdrop_path
  ]);

  // Enhanced: smarter debouncing, touch support, and analytics
  // Handle mouse enter/touch start with debouncing and analytics
  const handleMouseEnter = useCallback((event) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Optionally: Track hover analytics (only once per card per session)
    if (window && window.gtag && !window.__cardHoverTracked?.[id]) {
      window.gtag('event', 'card_hover', { movie_id: id, title });
      window.__cardHoverTracked = window.__cardHoverTracked || {};
      window.__cardHoverTracked[id] = true;
    }

    // For touch devices, ignore mouseenter if touch event was just fired
    if (event && event.type === 'mouseenter' && handleMouseEnter.lastTouch && Date.now() - handleMouseEnter.lastTouch < 400) {
      return;
    }

    // Start prefetching after a short delay to avoid unnecessary requests
    hoverTimeoutRef.current = setTimeout(() => {
      handlePrefetch();
    }, 120); // Slightly faster (120ms) for more responsive feel
  }, [handlePrefetch, id, title]);

  // Track last touch time to avoid double-trigger on touch devices
  handleMouseEnter.lastTouch = 0;

  // Touch support: call this onTouchStart
  const handleTouchStart = useCallback(() => {
    handleMouseEnter.lastTouch = Date.now();
    handleMouseEnter({ type: 'touchstart' });
  }, [handleMouseEnter]);

  // Enhanced: Handle mouse leave/touch end/cancel with analytics and optional callback
  const handleMouseLeave = useCallback((event) => {
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

    // Optionally: Track leave analytics (only once per card per session)
    if (window && window.gtag && !window.__cardLeaveTracked?.[id]) {
      window.gtag('event', 'card_hover_leave', { movie_id: id, title });
      window.__cardLeaveTracked = window.__cardLeaveTracked || {};
      window.__cardLeaveTracked[id] = true;
    }

    // Optionally: If a callback is provided for leave, call it
    if (typeof onMouseLeave === 'function') {
      onMouseLeave(event);
    }
  }, [id, title, onMouseLeave]);

  // Enhanced cleanup: also remove any event listeners or observers if added in the future
  useEffect(() => {
    // If you add any event listeners or observers, clean them up here
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
        prefetchTimeoutRef.current = null;
      }
      // Example: If you ever add a MutationObserver or IntersectionObserver, disconnect here
      if (typeof observerRef !== "undefined" && observerRef?.current) {
        if (typeof observerRef.current.disconnect === "function") {
          observerRef.current.disconnect();
        }
        observerRef.current = null;
      }
      // Example: Remove any custom event listeners if added
      if (typeof cleanupExtra === "function") {
        cleanupExtra();
      }
    };
  }, []);

  const handleWatchlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInWatchlistState) {
      removeFromWatchlist(id);
      setIsInWatchlistState(false);
    } else {
      // Standardized movie data for watchlist (matches MoviesPage/Navbar)
      const release = release_date || first_air_date || '';
      let computedYear = 'N/A';
      if (release) {
        const parsedYear = new Date(release).getFullYear();
        if (!isNaN(parsedYear)) computedYear = parsedYear;
      }
      const movieData = {
        id,
        title: title || '',
        type: media_type || type || 'movie',
        poster_path: poster || poster_path || image || backdrop || '',
        backdrop_path: backdrop || backdrop_path || '',
        overview: overview || '',
        year: computedYear,
        rating: typeof vote_average === 'number' ? vote_average : (typeof rating === 'number' ? rating : 0),
        genres: genres || [],
        release_date: release,
        addedAt: new Date().toISOString(),
      };
      addToWatchlist(movieData);
      setIsInWatchlistState(true);
    }
  };

  const formatDuration = () => {
    if (type === 'tv') {
      return seasons ? `${seasons} Season${seasons > 1 ? 's' : ''}` : 'TV Show';
    }
    // For movies, use runtime if available, otherwise fall back to duration
    if (runtime) {
      return `${Math.floor(runtime / 60)}h ${runtime % 60}m`;
    }
    return duration;
  };

  // Enhanced: Responsive image source, aspect ratio, and card width with fallback, retina, and ultra-wide support
  // Determine best image source based on device, pixel density, and available fields
  const getBestImageSource = () => {
    // Prefer highest quality available, fallback to next best
    if (isMobile) {
      // On mobile, prefer portrait poster, fallback to landscape if poster missing
      return poster || poster_path || image || backdrop || backdrop_path || null;
    } else {
      // On desktop, prefer landscape, fallback to poster if no backdrop
      return backdrop || backdrop_path || image || poster || poster_path || null;
    }
  };

  // Responsive aspect ratio: portrait for mobile, landscape for desktop, ultra-wide for very large screens
  const getAspectRatio = () => {
    if (typeof window !== "undefined" && window.innerWidth > 1800 && !isMobile) {
      return "21/9"; // Ultra-wide for big screens
    }
    return isMobile ? "2/3" : "16/10";
  };

  // Responsive card width: larger on tablets, ultra-wide on big screens
  const getCardWidth = () => {
    if (typeof window !== "undefined" && window.innerWidth > 1800 && !isMobile) {
      return "w-[420px]"; // Ultra-wide
    }
    if (isMobile) {
      return "w-[160px] sm:w-[180px] md:w-[200px]";
    }
    return "w-80 xl:w-[340px]";
  };

  // Retina/HiDPI support: use srcSet for ProgressiveImage if available
  const getSrcSet = () => {
    // Example: TMDB style URLs, adjust as needed for your backend
    const base = getBestImageSource();
    if (!base) return undefined;
    if (base.includes("/w500")) {
      return `${base.replace("/w500", "/w300")} 1x, ${base.replace("/w500", "/w780")} 1.5x, ${base.replace("/w500", "/w1280")} 2x, ${base.replace("/w500", "/original")} 3x`;
    }
    if (base.includes("/original")) {
      return `${base.replace("/original", "/w300")} 1x, ${base.replace("/original", "/w780")} 1.5x, ${base.replace("/original", "/w1280")} 2x, ${base} 3x`;
    }
    return undefined;
  };

  const imageSource = getBestImageSource();
  const aspectRatio = getAspectRatio();
  const cardWidth = getCardWidth();
  const imageSrcSet = getSrcSet();

  return (
    <div 
      className={`group flex flex-col gap-4 rounded-lg ${cardWidth} flex-shrink-0 ${cardClassName}`}
      data-movie-id={id}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`relative ${isMobile ? 'aspect-[2/3]' : 'aspect-[16/10]'} rounded-lg overflow-hidden bg-gray-800 transform-gpu transition-all duration-300 md:group-hover:scale-[1.02] md:group-hover:shadow-2xl md:group-hover:shadow-black/20 w-full`}>
        {/* Prefetch shimmer/spinner overlay */}
        {prefetching && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 pointer-events-none">
            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          </div>
        )}
        {/* Clickable area for movie details */}
        <div 
          className="w-full h-full cursor-pointer"
          onClick={onClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <ProgressiveImage
            src={imageSource}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 md:group-hover:scale-110"
            aspectRatio={aspectRatio}
            priority={priority}
          />
          {/* Movie info overlay - only show on desktop for landscape cards */}
          {!isMobile && (
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 md:group-hover:opacity-100 transition-all duration-500">
              <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 md:group-hover:translate-y-0 transition-transform duration-500">
                <h3 className="text-white font-medium text-lg truncate mb-1">{title}</h3>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <span className="flex items-center gap-1">
                    {year}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    {type === 'tv' ? 'TV Show' : 'Movie'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    {formatDuration()}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                    {rating}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Watchlist button - outside the clickable area */}
        <div className="absolute top-3 right-3 z-10">
          <button 
            className="p-2 bg-black/40 backdrop-blur-sm rounded-full opacity-0 md:group-hover:opacity-100 transition-all duration-300 hover:bg-black/60 md:hover:scale-110 transform-gpu"
            onClick={handleWatchlistClick}
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isInWatchlistState ? 'text-green-400' : 'text-white'} transition-colors duration-300`} viewBox="0 0 24 24" fill="currentColor">
              {isInWatchlistState ? (
                <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
              ) : (
                <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/>
              )}
            </svg>
          </button>
        </div>
      </div>
      
      {/* Movie info below card for mobile portrait layout */}
      {isMobile && (
        <div className="px-1">
          <h3 className="text-white font-medium text-sm truncate mb-1">{title}</h3>
          <div className="flex items-center gap-2 text-white/60 text-xs">
            <span>{year}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
              {rating}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

// Performance-optimized HomePage component
const PerformanceOptimizedHomePage = () => {
  const navigate = useNavigate();
  const { setLoadingState } = useLoading();
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [toast, setToast] = useToastState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentSection, setCurrentSection] = useState('');
  
  // Performance-optimized state management
  const [sections, setSections] = useState({
    trending: { movies: [], loading: true, hasMore: true, currentPage: 1 },
    popular: { movies: [], loading: true, hasMore: true, currentPage: 1 },
    topRated: { movies: [], loading: true, hasMore: true, currentPage: 1 },
    upcoming: { movies: [], loading: true, hasMore: true, currentPage: 1 },
    action: { movies: [], loading: true, hasMore: true, currentPage: 1 },
    comedy: { movies: [], loading: true, hasMore: true, currentPage: 1 },
    drama: { movies: [], loading: true, hasMore: true, currentPage: 1 },
    horror: { movies: [], loading: true, hasMore: true, currentPage: 1 },
    sciFi: { movies: [], loading: true, hasMore: true, currentPage: 1 },
    documentary: { movies: [], loading: true, hasMore: true, currentPage: 1 },
    family: { movies: [], loading: true, hasMore: true, currentPage: 1 },
    animation: { movies: [], loading: true, hasMore: true, currentPage: 1 },
    awardWinning: { movies: [], loading: true, hasMore: true, currentPage: 1 },
    latest: { movies: [], loading: true, hasMore: true, currentPage: 1 }
  });

  const [featuredContent, setFeaturedContent] = useState(null);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prefetchedMovies, setPrefetchedMovies] = useState(new Set());
  const [prefetchCache, setPrefetchCache] = useState(new Map());
  const [prefetchStats, setPrefetchStats] = useState({
    totalPrefetched: 0,
    successfulPrefetches: 0,
    failedPrefetches: 0,
    cacheHits: 0
  });

  // Performance monitoring
  const loadStartTime = useRef(Date.now());
  const sectionLoadTimes = useRef({});
  const prefetchQueueRef = useRef([]);
  const isProcessingPrefetchRef = useRef(false);

  // Enhanced progressive loading with priority sections
  const prioritySections = ['trending', 'popular', 'topRated'];
  const secondarySections = ['upcoming', 'action', 'comedy', 'drama'];
  const tertiarySections = ['horror', 'sciFi', 'documentary', 'family', 'animation', 'awardWinning', 'latest'];

  // Performance-optimized fetch function with intelligent caching
  const fetchSectionData = useCallback(async (sectionKey, page = 1, priority = false) => {
    const startTime = Date.now();
    setCurrentSection(sectionKey);
    
    try {
      setSections(prev => ({
        ...prev,
        [sectionKey]: { ...prev[sectionKey], loading: true }
      }));

      let response;
      const getFetchFunction = (key) => {
        const fetchFunctions = {
          trending: getTrendingMovies,
          popular: getPopularMovies,
          topRated: getTopRatedMovies,
          upcoming: getUpcomingMovies,
          action: getActionMovies,
          comedy: getComedyMovies,
          drama: getDramaMovies,
          horror: getHorrorMovies,
          sciFi: getSciFiMovies,
          documentary: getDocumentaryMovies,
          family: getFamilyMovies,
          animation: getAnimationMovies,
          awardWinning: getAwardWinningMovies,
          latest: getLatestMovies
        };
        return fetchFunctions[key];
      };

      const fetchFunction = getFetchFunction(sectionKey);
      if (!fetchFunction) {
        throw new Error(`No fetch function found for section: ${sectionKey}`);
      }

      response = await fetchFunction(page);
      
      const movies = response.results || response.movies || [];
      const totalPages = response.total_pages || response.totalPages || 1;

      setSections(prev => ({
        ...prev,
        [sectionKey]: {
          movies: page === 1 ? movies : [...prev[sectionKey].movies, ...movies],
          loading: false,
          hasMore: page < totalPages,
          currentPage: page
        }
      }));

      // Performance logging
      const loadTime = Date.now() - startTime;
      sectionLoadTimes.current[sectionKey] = loadTime;
      
      if (loadTime > 2000) {
        console.warn(`Slow section load detected: ${sectionKey} took ${loadTime}ms`);
      }

      // Update loading progress
      const totalSections = Object.keys(sections).length;
      const loadedSections = Object.values(sections).filter(s => !s.loading).length;
      setLoadingProgress((loadedSections / totalSections) * 100);

    } catch (error) {
      console.error(`Error fetching ${sectionKey}:`, error);
      setSections(prev => ({
        ...prev,
        [sectionKey]: { ...prev[sectionKey], loading: false, error: error.message }
      }));
    }
  }, [sections]);

  // Progressive loading strategy
  useEffect(() => {
    const loadSectionsProgressively = async () => {
      setIsInitialLoad(true);
      setLoadingProgress(0);

      // Load priority sections first (above the fold)
      for (const section of prioritySections) {
        await fetchSectionData(section, 1, true);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between sections
      }

      // Load secondary sections (visible on scroll)
      for (const section of secondarySections) {
        fetchSectionData(section, 1, false); // Don't await, load in parallel
      }

      // Load tertiary sections (below the fold) with delay
      setTimeout(() => {
        for (const section of tertiarySections) {
          fetchSectionData(section, 1, false);
        }
      }, 1000);

      setIsInitialLoad(false);
    };

    loadSectionsProgressively();
  }, [fetchSectionData]);

  // Load featured content
  useEffect(() => {
    const loadFeaturedContent = async () => {
      try {
        setFeaturedLoading(true);
        const trendingResponse = await getTrendingMovies(1);
        const featuredMovie = trendingResponse.results?.[0];
        
        if (featuredMovie) {
          // Fetch additional details for featured content
          const [details, credits, videos] = await Promise.allSettled([
            getMovieDetails(featuredMovie.id, 'movie'),
            getMovieCredits(featuredMovie.id, 'movie'),
            getMovieVideos(featuredMovie.id, 'movie')
          ]);

          const featuredData = {
            ...featuredMovie,
            ...(details.status === 'fulfilled' ? details.value : {}),
            cast: credits.status === 'fulfilled' ? credits.value.cast?.slice(0, 4) : [],
            trailer: videos.status === 'fulfilled' ? 
              videos.value.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer')?.key : null
          };

          setFeaturedContent(featuredData);
        }
      } catch (error) {
        console.error('Error loading featured content:', error);
      } finally {
        setFeaturedLoading(false);
      }
    };

    loadFeaturedContent();
  }, []);

  // Enhanced prefetch handling
  const handlePrefetch = useCallback((movieId) => {
    setPrefetchedMovies(prev => new Set([...prev, movieId]));
    setPrefetchStats(prev => ({
      ...prev,
      totalPrefetched: prev.totalPrefetched + 1,
      successfulPrefetches: prev.successfulPrefetches + 1
    }));
  }, []);

  // Load more movies for a section
  const loadMoreMovies = useCallback(async (sectionKey) => {
    const section = sections[sectionKey];
    if (!section || section.loading || !section.hasMore) return;

    const nextPage = section.currentPage + 1;
    await fetchSectionData(sectionKey, nextPage);
  }, [sections, fetchSectionData]);

  // Handle movie selection
  const handleMovieSelect = useCallback((movie) => {
    setSelectedMovie(movie);
  }, []);

  // Handle category change
  const handleCategoryChange = useCallback((category) => {
    if (activeCategory === category || isTransitioning) return;
    
    setIsTransitioning(true);
    setActiveCategory(category);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, [activeCategory, isTransitioning]);

  // Performance monitoring
  useEffect(() => {
    const totalLoadTime = Date.now() - loadStartTime.current;
    console.log(`🎯 HomePage Performance Report:
      - Total load time: ${totalLoadTime}ms
      - Initial load: ${isInitialLoad ? 'Yes' : 'No'}
      - Loading progress: ${loadingProgress.toFixed(1)}%
      - Current section: ${currentSection}
      - Prefetch stats: ${JSON.stringify(prefetchStats)}
    `);
  }, [isInitialLoad, loadingProgress, currentSection, prefetchStats]);

  // Loading screen for initial load
  if (isInitialLoad && loadingProgress < 50) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-lg font-medium mb-2">Loading Streamr</div>
          <div className="text-white/60 text-sm">Loading your favorite content...</div>
          <div className="mt-4 w-64 bg-white/10 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <div className="text-white/40 text-xs mt-2">{loadingProgress.toFixed(0)}%</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white overflow-x-hidden">
      {/* Performance monitoring overlay (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs z-50 max-w-xs">
          <div className="font-semibold mb-2">Performance Monitor</div>
          <div className="space-y-1">
            <div>Load Progress: {loadingProgress.toFixed(1)}%</div>
            <div>Current Section: {currentSection}</div>
            <div>Prefetch Hits: {prefetchStats.cacheHits}</div>
            <div>Total Prefetched: {prefetchStats.totalPrefetched}</div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <Suspense fallback={<div className="h-[65vh] bg-gray-800 animate-pulse"></div>}>
        {featuredContent && (
          <HeroSection 
            featuredContent={featuredContent} 
            onMovieSelect={handleMovieSelect}
            loading={featuredLoading}
          />
        )}
      </Suspense>

      {/* Movie Sections */}
      <div className="space-y-8">
        {Object.entries(sections).map(([sectionKey, section]) => (
          <Suspense key={sectionKey} fallback={<SectionLoader />}>
            <MovieSection
              title={sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1).replace(/([A-Z])/g, ' $1')}
              movies={section.movies}
              loading={section.loading}
              onLoadMore={() => loadMoreMovies(sectionKey)}
              hasMore={section.hasMore}
              currentPage={section.currentPage}
              sectionKey={sectionKey}
              onMovieSelect={handleMovieSelect}
              onPrefetch={handlePrefetch}
              priority={prioritySections.includes(sectionKey)}
            />
          </Suspense>
        ))}
      </div>

      {/* Movie Details Overlay */}
      <AnimatePresence>
        {selectedMovie && (
          <Suspense fallback={null}>
            <MovieDetailsOverlay
              movie={selectedMovie}
              onClose={() => setSelectedMovie(null)}
              onMovieSelect={handleMovieSelect}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <MinimalToast 
            type={toast.type} 
            message={toast.message} 
            show={!!toast}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PerformanceOptimizedHomePage; 