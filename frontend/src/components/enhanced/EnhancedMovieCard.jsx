import React, { useState, useRef, useCallback, useEffect, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { performanceUtils } from '../../services/performanceMonitor.js';
import advancedCache from '../../services/advancedCacheService.js';
import PropTypes from 'prop-types';

// Constants for configuration
const CONFIG = {
  IMAGE: {
    MAX_RETRIES: 3,
    RETRY_DELAY_BASE: 1000,
    PLACEHOLDER_SIZE: 'w92',
    FULL_SIZE: 'w500',
    BLUR_AMOUNT: 'blur(10px)',
    PRELOAD_DELAY: 300,
  },
  HOVER: {
    DEBOUNCE_DELAY: 100,
    PREFETCH_DELAY: 250,
  },
  CACHE: {
    IMAGE_TTL: 1800000, // 30 minutes
    DETAILS_TTL: 600000, // 10 minutes
  },
  ANIMATION: {
    HOVER_SCALE: 1.03,
    TAP_SCALE: 0.97,
    DURATION: 0.25,
  },
};

// Image state machine
const IMAGE_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
  RETRYING: 'retrying',
};

// Enhanced Progressive Image Component with Intersection Observer
const ProgressiveImage = memo(({ 
  src, 
  alt, 
  className = "", 
  aspectRatio = "16/10",
  onLoad,
  onError,
  priority = false,
  threshold = 0.1,
  rootMargin = "50px",
  ...props 
}) => {
  const [imageState, setImageState] = useState(priority ? IMAGE_STATES.LOADING : IMAGE_STATES.IDLE);
  const [currentSrc, setCurrentSrc] = useState(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const retryCount = useRef(0);
  const abortControllerRef = useRef(null);

  // Generate optimized image URLs
  const getOptimizedSrc = useCallback((originalSrc, size = CONFIG.IMAGE.FULL_SIZE) => {
    if (!originalSrc) return null;
    
    // Handle TMDB image URLs
    if (originalSrc.includes('image.tmdb.org')) {
      return originalSrc.replace(/\/(w\d+|original)/, `/${size}`);
    }
    
    // Handle relative URLs
    if (originalSrc.startsWith('/')) {
      return originalSrc;
    }
    
    return originalSrc;
  }, []);

  // Generate low-quality placeholder with blur
  const getPlaceholderSrc = useCallback((originalSrc) => {
    return getOptimizedSrc(originalSrc, CONFIG.IMAGE.PLACEHOLDER_SIZE);
  }, [getOptimizedSrc]);

  // Check if image is in cache
  const getCachedImage = useCallback((imageSrc) => {
    if (!imageSrc) return null;
    const cacheKey = `image:${imageSrc}`;
    return advancedCache.get(cacheKey);
  }, []);

  // Cache image
  const cacheImage = useCallback((imageSrc) => {
    if (!imageSrc) return;
    const cacheKey = `image:${imageSrc}`;
    advancedCache.set(cacheKey, { url: imageSrc, timestamp: Date.now() }, CONFIG.CACHE.IMAGE_TTL);
  }, []);

  // Load image with advanced retry logic and progress tracking
  const loadImage = useCallback(async (imageSrc, isRetry = false) => {
    if (!imageSrc) {
      setImageState(IMAGE_STATES.ERROR);
      return;
    }

    // Check cache first
    const cachedImage = getCachedImage(imageSrc);
    if (cachedImage) {
      setCurrentSrc(imageSrc);
      setImageState(IMAGE_STATES.LOADED);
      setLoadProgress(100);
      if (onLoad) onLoad();
      return;
    }

    try {
      setImageState(isRetry ? IMAGE_STATES.RETRYING : IMAGE_STATES.LOADING);
      const placeholderSrc = getPlaceholderSrc(imageSrc);
      
      // Load placeholder first for better UX
      if (placeholderSrc && placeholderSrc !== imageSrc) {
        setCurrentSrc(placeholderSrc);
        setLoadProgress(25);
      }

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      // Preload full image with fetch API for better control
      const response = await fetch(imageSrc, { 
        signal: abortControllerRef.current.signal,
        mode: 'cors',
        cache: 'force-cache',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const objectURL = URL.createObjectURL(blob);
      
      // Load via Image object for proper loading event
      const img = new Image();
      
      img.onload = () => {
        setCurrentSrc(imageSrc);
        setImageState(IMAGE_STATES.LOADED);
        setLoadProgress(100);
        cacheImage(imageSrc);
        
        // Cleanup object URL
        URL.revokeObjectURL(objectURL);
        
        if (onLoad) onLoad();
        
        // Track performance
        performanceUtils.trackComponentRender('ProgressiveImage', performance.now(), {
          retries: retryCount.current,
        });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectURL);
        handleImageError(imageSrc);
      };
      
      img.src = objectURL;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.debug('Image load aborted:', imageSrc);
        return;
      }
      handleImageError(imageSrc, error);
    }
  }, [getPlaceholderSrc, getCachedImage, cacheImage, onLoad]);

  // Handle image load errors with exponential backoff
  const handleImageError = useCallback((imageSrc, error) => {
    if (retryCount.current < CONFIG.IMAGE.MAX_RETRIES) {
      retryCount.current++;
      const delay = CONFIG.IMAGE.RETRY_DELAY_BASE * Math.pow(2, retryCount.current - 1);
      
      console.warn(`Image load failed, retrying (${retryCount.current}/${CONFIG.IMAGE.MAX_RETRIES}) in ${delay}ms:`, imageSrc);
      
      setTimeout(() => loadImage(imageSrc, true), delay);
    } else {
      setImageState(IMAGE_STATES.ERROR);
      setLoadProgress(0);
      if (onError) onError(error);
      
      performanceUtils.trackUserInteraction('image_load_error', 'progressive_image', 0, {
        src: imageSrc,
        retries: retryCount.current,
      });
    }
  }, [loadImage, onError]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) {
      loadImage(src);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && imageState === IMAGE_STATES.IDLE) {
            loadImage(src);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
      
      // Abort any pending fetch
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [src, imageState, priority, threshold, rootMargin, loadImage]);

  // Reset state when src changes
  useEffect(() => {
    retryCount.current = 0;
    setImageState(priority ? IMAGE_STATES.LOADING : IMAGE_STATES.IDLE);
    setCurrentSrc(null);
    setLoadProgress(0);
  }, [src, priority]);

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio }}
      {...props}
    >
      {/* Advanced Loading State with Progress */}
      {(imageState === IMAGE_STATES.LOADING || imageState === IMAGE_STATES.RETRYING) && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900">
          {/* Shimmer effect */}
          <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" 
               style={{
                 backgroundSize: '200% 100%',
                 animation: 'shimmer 2s infinite',
               }}
          />
          
          {/* Loading progress bar */}
          {loadProgress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-700">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${loadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
          
          {/* Retry indicator */}
          {imageState === IMAGE_STATES.RETRYING && (
            <div className="absolute top-2 right-2 bg-yellow-500/20 backdrop-blur-sm rounded-full px-2 py-1">
              <span className="text-xs text-yellow-300">Retry {retryCount.current}</span>
            </div>
          )}
        </div>
      )}

      {/* Blurred Placeholder with enhanced transition */}
      <AnimatePresence>
        {currentSrc && imageState !== IMAGE_STATES.LOADED && (
          <motion.div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url("${currentSrc}")`,
              filter: CONFIG.IMAGE.BLUR_AMOUNT,
              transform: "scale(1.1)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      {/* Full Image with optimized rendering */}
      {currentSrc && imageState === IMAGE_STATES.LOADED && (
        <motion.img
          ref={imageRef}
          src={currentSrc}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ 
            willChange: 'transform, opacity',
            contentVisibility: 'auto',
          }}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            duration: 0.6, 
            ease: [0.43, 0.13, 0.23, 0.96] // Custom easing for smoother animation
          }}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchpriority={priority ? "high" : "auto"}
        />
      )}

      {/* Enhanced Error State with retry button */}
      {imageState === IMAGE_STATES.ERROR && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 flex flex-col items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <svg className="w-12 h-12 mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-gray-400 mb-2 text-center">Image unavailable</p>
          {retryCount.current >= CONFIG.IMAGE.MAX_RETRIES && (
            <button
              onClick={() => {
                retryCount.current = 0;
                loadImage(src);
              }}
              className="text-xs text-blue-400 hover:text-blue-300 underline transition-colors"
            >
              Try again
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
});

// Enhanced Movie Card Component with Advanced Features
const EnhancedMovieCard = memo(({
  movie,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  className = "",
  showDetails = true,
  priority = false,
  prefetch = true,
  lazyLoad = true,
  enableAnalytics = true,
  index = 0,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [prefetchedData, setPrefetchedData] = useState(null);
  const cardRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const prefetchTimeoutRef = useRef(null);
  const clickTimeRef = useRef(null);
  const mountTimeRef = useRef(Date.now());

  // Validate movie data
  const isValidMovie = useMemo(() => {
    return movie && (movie.id || movie._id) && movie.title;
  }, [movie]);

  // Memoized movie ID
  const movieId = useMemo(() => movie?.id || movie?._id, [movie]);

  // Memoized image source with fallback
  const imageSource = useMemo(() => {
    if (!movie) return null;
    return movie.backdrop || movie.poster || movie.image || null;
  }, [movie]);

  // Memoized formatted duration
  const formattedDuration = useMemo(() => {
    if (!movie) return 'N/A';
    
    if (movie.type === 'tv') {
      if (movie.seasons) {
        return `${movie.seasons} Season${movie.seasons > 1 ? 's' : ''}`;
      }
      if (movie.number_of_seasons) {
        return `${movie.number_of_seasons} Season${movie.number_of_seasons > 1 ? 's' : ''}`;
      }
      return 'TV Show';
    }
    
    if (movie.runtime) {
      const hours = Math.floor(movie.runtime / 60);
      const minutes = movie.runtime % 60;
      if (hours > 0) {
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
      }
      return `${minutes}m`;
    }
    
    return movie.duration || 'N/A';
  }, [movie]);

  // Memoized rating with validation
  const displayRating = useMemo(() => {
    if (!movie) return null;
    const rating = movie.rating || movie.vote_average;
    if (!rating || rating === '0.0' || rating === 0) return null;
    return typeof rating === 'number' ? rating.toFixed(1) : parseFloat(rating).toFixed(1);
  }, [movie]);

  // Memoized year extraction
  const releaseYear = useMemo(() => {
    if (!movie) return null;
    if (movie.year) return movie.year;
    if (movie.release_date) return new Date(movie.release_date).getFullYear();
    if (movie.first_air_date) return new Date(movie.first_air_date).getFullYear();
    return null;
  }, [movie]);

  // Memoized genres with limit
  const displayGenres = useMemo(() => {
    if (!movie?.genres || !Array.isArray(movie.genres)) return [];
    return movie.genres.slice(0, 3);
  }, [movie?.genres]);

  // Prefetch movie details with caching
  const prefetchMovieDetails = useCallback(async () => {
    if (!prefetch || !movieId) return;

    const cacheKey = `movie:${movieId}:details`;
    const cached = advancedCache.get(cacheKey);
    
    if (cached) {
      setPrefetchedData(cached);
      return;
    }

    try {
      // In a real implementation, this would fetch from API
      // For now, we'll simulate with a delay
      console.debug(`Prefetching details for movie ${movieId}`);
      
      // Cache placeholder to prevent duplicate requests
      advancedCache.set(cacheKey, { status: 'loading' }, CONFIG.CACHE.DETAILS_TTL);
      
      if (enableAnalytics) {
        performanceUtils.trackUserInteraction('prefetch_movie', 'movie_card', 0, {
          movieId,
          movieTitle: movie.title,
        });
      }
    } catch (error) {
      console.error('Error prefetching movie details:', error);
    }
  }, [prefetch, movieId, movie?.title, enableAnalytics]);

  // Track component lifecycle
  useEffect(() => {
    if (!enableAnalytics) return;
    
    const mountTime = Date.now() - mountTimeRef.current;
    performanceUtils.trackComponentLifecycle('EnhancedMovieCard', 'mount', {
      mountTime,
      movieId,
      index,
    });
    
    return () => {
      const lifetimeDuration = Date.now() - mountTimeRef.current;
      performanceUtils.trackComponentLifecycle('EnhancedMovieCard', 'unmount', {
        lifetimeDuration,
        movieId,
      });
    };
  }, [enableAnalytics, movieId, index]);

  // Enhanced hover handling with debouncing and prefetch
  const handleMouseEnter = useCallback((event) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
      setShowOverlay(true);
      
      if (onMouseEnter) {
        onMouseEnter(event, movie);
      }

      if (enableAnalytics) {
        performanceUtils.trackUserInteraction('card_hover', 'movie_card', performance.now(), {
          movieId,
          movieTitle: movie?.title,
          index,
        });
      }

      // Prefetch movie details after delay
      if (prefetch && movieId) {
        prefetchTimeoutRef.current = setTimeout(() => {
          prefetchMovieDetails();
        }, CONFIG.HOVER.PREFETCH_DELAY);
      }
    }, CONFIG.HOVER.DEBOUNCE_DELAY);
  }, [movie, movieId, onMouseEnter, prefetch, prefetchMovieDetails, enableAnalytics, index]);

  const handleMouseLeave = useCallback((event) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }

    setIsHovered(false);
    setShowOverlay(false);
    
    if (onMouseLeave) {
      onMouseLeave(event, movie);
    }
  }, [movie, onMouseLeave]);

  // Focus handling for keyboard navigation
  const handleFocus = useCallback((event) => {
    setIsFocused(true);
    setShowOverlay(true);
    
    if (onFocus) {
      onFocus(event, movie);
    }

    if (enableAnalytics) {
      performanceUtils.trackUserInteraction('card_focus', 'movie_card', 0, {
        movieId,
        method: 'keyboard',
      });
    }
  }, [movie, movieId, onFocus, enableAnalytics]);

  const handleBlur = useCallback((event) => {
    setIsFocused(false);
    setShowOverlay(false);
    
    if (onBlur) {
      onBlur(event, movie);
    }
  }, [movie, onBlur]);

  // Enhanced click handling with double-click prevention
  const handleClick = useCallback((event) => {
    event.preventDefault();
    
    // Prevent double-click
    const now = Date.now();
    if (clickTimeRef.current && now - clickTimeRef.current < 300) {
      return;
    }
    clickTimeRef.current = now;

    if (enableAnalytics) {
      performanceUtils.trackUserInteraction('card_click', 'movie_card', performance.now(), {
        movieId,
        movieTitle: movie?.title,
        index,
      });
    }

    if (onClick) {
      setIsLoading(true);
      Promise.resolve(onClick(movie, event)).finally(() => {
        setTimeout(() => setIsLoading(false), 500);
      });
    }
  }, [movie, movieId, onClick, enableAnalytics, index]);

  // Keyboard event handling
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick(event);
    } else if (event.key === 'Escape' && (isHovered || isFocused)) {
      event.currentTarget.blur();
    }
  }, [handleClick, isHovered, isFocused]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, []);

  // Early return if invalid movie data
  if (!isValidMovie) {
    console.warn('EnhancedMovieCard: Invalid movie data', movie);
    return null;
  }

  // Early return if invalid movie data
  if (!isValidMovie) {
    console.warn('EnhancedMovieCard: Invalid movie data', movie);
    return null;
  }

  return (
    <motion.article
      ref={cardRef}
      className={`group relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 shadow-lg hover:shadow-2xl transition-shadow duration-300 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      whileHover={{ scale: CONFIG.ANIMATION.HOVER_SCALE }}
      whileTap={{ scale: CONFIG.ANIMATION.TAP_SCALE }}
      transition={{ 
        duration: CONFIG.ANIMATION.DURATION,
        ease: [0.43, 0.13, 0.23, 0.96]
      }}
      role="button"
      tabIndex={0}
      aria-label={`${movie.title}${releaseYear ? `, ${releaseYear}` : ''}${displayRating ? `, rated ${displayRating}` : ''}`}
      aria-pressed={isHovered || isFocused}
      style={{
        willChange: 'transform',
        contentVisibility: 'auto',
      }}
      {...props}
    >
      {/* Image Container */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <ProgressiveImage
          src={imageSource}
          alt={`${movie.title} poster`}
          className="w-full h-full"
          priority={priority}
          threshold={lazyLoad ? 0.1 : 1}
          rootMargin={lazyLoad ? "50px" : "0px"}
          onLoad={() => {
            if (enableAnalytics) {
              performanceUtils.trackComponentRender('MovieCardImage', performance.now(), {
                movieId,
                index,
              });
            }
          }}
          onError={() => {
            if (enableAnalytics) {
              performanceUtils.trackUserInteraction('image_load_failed', 'movie_card', 0, {
                movieId,
                movieTitle: movie.title,
              });
            }
          }}
        />

        {/* Enhanced Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

        {/* Hover/Focus Overlay */}
        <AnimatePresence>
          {showOverlay && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />
          )}
        </AnimatePresence>

        {/* Top Badges Container */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 z-10">
          {/* Rating Badge */}
          {displayRating && (
            <motion.div
              className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md rounded-full px-3 py-1.5 shadow-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm text-white font-semibold">{displayRating}</span>
            </motion.div>
          )}

          {/* Type Badge */}
          <motion.div
            className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md rounded-full px-3 py-1.5 shadow-lg"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span className="text-sm text-white font-medium capitalize">
              {movie.type === 'tv' ? 'TV' : movie.type === 'movie' ? 'Movie' : movie.type || 'Media'}
            </span>
          </motion.div>
        </div>

        {/* Loading Indicator */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-white/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hover Actions */}
        <AnimatePresence>
          {(isHovered || isFocused) && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center z-10"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <motion.button
                className="relative bg-white text-gray-900 px-6 py-3 rounded-full font-semibold text-sm shadow-xl hover:bg-gray-100 transition-colors flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClick}
                aria-label={`View details for ${movie.title}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Details
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content Section */}
      {showDetails && (
        <div className="p-4 space-y-3">
          {/* Title */}
          <h3 className="text-white font-bold text-base leading-snug line-clamp-2 group-hover:text-blue-400 transition-colors duration-200">
            {movie.title}
          </h3>

          {/* Meta Information */}
          {(releaseYear || formattedDuration) && (
            <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
              {releaseYear && (
                <time dateTime={releaseYear.toString()} className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {releaseYear}
                </time>
              )}
              {releaseYear && formattedDuration !== 'N/A' && (
                <span className="text-gray-600">•</span>
              )}
              {formattedDuration !== 'N/A' && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formattedDuration}
                </span>
              )}
            </div>
          )}

          {/* Genres */}
          {displayGenres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {displayGenres.map((genre, index) => (
                <motion.span
                  key={`${genre}-${index}`}
                  className="px-2.5 py-1 bg-gray-800/80 backdrop-blur-sm rounded-full text-xs text-gray-300 font-medium border border-gray-700/50 hover:bg-gray-700/80 hover:border-gray-600/50 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {genre}
                </motion.span>
              ))}
            </div>
          )}

          {/* Additional Info on Hover/Focus */}
          <AnimatePresence>
            {(isHovered || isFocused) && movie.overview && (
              <motion.p
                className="text-gray-400 text-sm line-clamp-2 leading-relaxed"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {movie.overview}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Focus Ring */}
      {isFocused && (
        <div className="absolute inset-0 rounded-xl ring-4 ring-blue-500 ring-offset-2 ring-offset-gray-900 pointer-events-none" />
      )}
    </motion.article>
  );
});

// PropTypes for type checking
ProgressiveImage.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string.isRequired,
  className: PropTypes.string,
  aspectRatio: PropTypes.string,
  onLoad: PropTypes.func,
  onError: PropTypes.func,
  priority: PropTypes.bool,
  threshold: PropTypes.number,
  rootMargin: PropTypes.string,
};

EnhancedMovieCard.propTypes = {
  movie: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    _id: PropTypes.string,
    title: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['movie', 'tv', 'anime', 'manga']),
    backdrop: PropTypes.string,
    poster: PropTypes.string,
    image: PropTypes.string,
    rating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    vote_average: PropTypes.number,
    year: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    release_date: PropTypes.string,
    first_air_date: PropTypes.string,
    runtime: PropTypes.number,
    duration: PropTypes.string,
    seasons: PropTypes.number,
    number_of_seasons: PropTypes.number,
    genres: PropTypes.arrayOf(PropTypes.string),
    overview: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  className: PropTypes.string,
  showDetails: PropTypes.bool,
  priority: PropTypes.bool,
  prefetch: PropTypes.bool,
  lazyLoad: PropTypes.bool,
  enableAnalytics: PropTypes.bool,
  index: PropTypes.number,
};

// Display names for debugging
EnhancedMovieCard.displayName = 'EnhancedMovieCard';
ProgressiveImage.displayName = 'ProgressiveImage';

// Add custom CSS for shimmer animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
    .animate-shimmer {
      animation: shimmer 2s infinite;
    }
  `;
  if (!document.querySelector('style[data-shimmer-animation]')) {
    style.setAttribute('data-shimmer-animation', 'true');
    document.head.appendChild(style);
  }
}

export default EnhancedMovieCard;
export { ProgressiveImage }; 