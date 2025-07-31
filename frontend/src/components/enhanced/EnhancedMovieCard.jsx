import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { performanceUtils } from '../../services/performanceMonitor.js';
import advancedCache from '../../services/advancedCacheService.js';

// Enhanced Progressive Image Component
const ProgressiveImage = memo(({ 
  src, 
  alt, 
  className = "", 
  aspectRatio = "16/10",
  onLoad,
  onError,
  priority = false,
  ...props 
}) => {
  const [imageState, setImageState] = useState('loading');
  const [currentSrc, setCurrentSrc] = useState(null);
  const imageRef = useRef(null);
  const retryCount = useRef(0);
  const maxRetries = 2;

  // Generate low-quality placeholder
  const getPlaceholderSrc = useCallback((originalSrc) => {
    if (!originalSrc) return null;
    // Create a very small version for blur effect
    return originalSrc.replace(/\/(w\d+|original)/, "/w92");
  }, []);

  // Load image with retry logic
  const loadImage = useCallback(async (imageSrc) => {
    if (!imageSrc) return;

    try {
      setImageState('loading');
      const placeholderSrc = getPlaceholderSrc(imageSrc);
      
      // Load placeholder first
      if (placeholderSrc) {
        setCurrentSrc(placeholderSrc);
      }

      // Preload full image
      const img = new Image();
      img.onload = () => {
        setCurrentSrc(imageSrc);
        setImageState('loaded');
        if (onLoad) onLoad();
      };
      img.onerror = () => {
        if (retryCount.current < maxRetries) {
          retryCount.current++;
          setTimeout(() => loadImage(imageSrc), 1000 * retryCount.current);
        } else {
          setImageState('error');
          if (onError) onError();
        }
      };
      img.src = imageSrc;
    } catch (error) {
      setImageState('error');
      if (onError) onError(error);
    }
  }, [getPlaceholderSrc, onLoad, onError]);

  useEffect(() => {
    loadImage(src);
  }, [src, loadImage]);

  // Track image load performance
  useEffect(() => {
    if (imageState === 'loaded') {
      performanceUtils.trackComponentRender('ProgressiveImage', performance.now());
    }
  }, [imageState]);

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio }}
      {...props}
    >
      {/* Shimmer Loading Placeholder */}
      {imageState === 'loading' && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      )}

      {/* Blurred Placeholder */}
      {currentSrc && imageState === 'loading' && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
          style={{
            backgroundImage: `url("${currentSrc}")`,
            filter: "blur(8px) brightness(0.8)",
            transform: "scale(1.1)"
          }}
        />
      )}

      {/* Full Image */}
      {currentSrc && imageState === 'loaded' && (
        <motion.img
          ref={imageRef}
          src={currentSrc}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
      )}

      {/* Error State */}
      {imageState === 'error' && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Image unavailable</p>
          </div>
        </div>
      )}
    </div>
  );
});

// Enhanced Movie Card Component
const EnhancedMovieCard = memo(({
  movie,
  onClick,
  onMouseEnter,
  onMouseLeave,
  className = "",
  showDetails = true,
  priority = false,
  prefetch = false,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const cardRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const prefetchTimeoutRef = useRef(null);

  // Track component mount performance
  useEffect(() => {
    performanceUtils.trackComponentLifecycle('EnhancedMovieCard', 'mount');
    return () => {
      performanceUtils.trackComponentLifecycle('EnhancedMovieCard', 'unmount');
    };
  }, []);

  // Enhanced hover handling with debouncing
  const handleMouseEnter = useCallback((event) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
      setShowOverlay(true);
      
      if (onMouseEnter) {
        onMouseEnter(event);
      }

      // Track user interaction
      performanceUtils.trackUserInteraction('card_hover', 'movie_card', 0, {
        movieId: movie.id,
        movieTitle: movie.title
      });

      // Prefetch movie details if enabled
      if (prefetch && movie.id) {
        prefetchTimeoutRef.current = setTimeout(() => {
          // Prefetch movie details to cache
          const cacheKey = `movie:${movie.id}:details`;
          if (!advancedCache.get(cacheKey)) {
            // This would trigger a background fetch in a real implementation
            console.debug(`Prefetching details for movie ${movie.id}`);
          }
        }, 200);
      }
    }, 150);
  }, [movie.id, movie.title, onMouseEnter, prefetch]);

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
      onMouseLeave(event);
    }
  }, [onMouseLeave]);

  // Enhanced click handling
  const handleClick = useCallback((event) => {
    event.preventDefault();
    
    // Track click interaction
    performanceUtils.trackUserInteraction('card_click', 'movie_card', 0, {
      movieId: movie.id,
      movieTitle: movie.title
    });

    if (onClick) {
      onClick(movie, event);
    }
  }, [movie, onClick]);

  // Format duration
  const formatDuration = useCallback(() => {
    if (movie.type === 'tv') {
      return movie.seasons ? `${movie.seasons} Season${movie.seasons > 1 ? 's' : ''}` : 'TV Show';
    }
    if (movie.runtime) {
      const hours = Math.floor(movie.runtime / 60);
      const minutes = movie.runtime % 60;
      return `${hours}h ${minutes}m`;
    }
    return movie.duration || 'N/A';
  }, [movie]);

  // Get best image source
  const getImageSource = useCallback(() => {
    return movie.backdrop || movie.poster || null;
  }, [movie]);

  // Cleanup timeouts
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

  return (
    <motion.div
      ref={cardRef}
      className={`group relative overflow-hidden rounded-lg bg-gray-900 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      role="button"
      tabIndex={0}
      aria-label={`${movie.title} - ${movie.year || 'Unknown year'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e);
        }
      }}
      {...props}
    >
      {/* Image Container */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <ProgressiveImage
          src={getImageSource()}
          alt={movie.title}
          className="w-full h-full"
          priority={priority}
          onLoad={() => {
            performanceUtils.trackComponentRender('MovieCardImage', performance.now());
          }}
        />

        {/* Hover Overlay */}
        <AnimatePresence>
          {showOverlay && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>

        {/* Rating Badge */}
        {movie.rating && movie.rating !== '0.0' && (
          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
            <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
            <span className="text-xs text-white font-medium">{movie.rating}</span>
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
          <span className="text-xs text-white font-medium">
            {movie.type === 'tv' ? 'TV' : 'Movie'}
          </span>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Content */}
      {showDetails && (
        <div className="p-3">
          {/* Title */}
          <h3 className="text-white font-semibold text-sm leading-tight mb-1 line-clamp-2">
            {movie.title}
          </h3>

          {/* Meta Information */}
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            {movie.year && (
              <span>{movie.year}</span>
            )}
            {movie.year && formatDuration() && (
              <span>•</span>
            )}
            {formatDuration() && (
              <span>{formatDuration()}</span>
            )}
          </div>

          {/* Genres */}
          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {movie.genres.slice(0, 2).map((genre, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-800/60 backdrop-blur-sm rounded-full text-xs text-gray-300"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hover Actions */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-center">
              <motion.button
                className="bg-white text-black px-4 py-2 rounded-full font-medium text-sm hover:bg-gray-100 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClick}
              >
                View Details
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// Display name for debugging
EnhancedMovieCard.displayName = 'EnhancedMovieCard';
ProgressiveImage.displayName = 'ProgressiveImage';

export default EnhancedMovieCard; 