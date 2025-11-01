import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, A11y, Mousewheel, Keyboard, FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { AnimatePresence, motion } from 'framer-motion';
import { useViewingProgress } from '../contexts/ViewingProgressContext';
import { getOptimizedImageUrl } from '../services/imageOptimizationService';
import { useContinueWatchingMemoryOptimizer } from '../utils/continueWatchingMemoryOptimizer';

// Advanced constants for optimized performance
const IMAGE_LOAD_TIMEOUT = 8000; // 8 seconds
const INTERSECTION_THRESHOLD = 0.05; // Load when 5% visible
const INTERSECTION_ROOT_MARGIN = '100px'; // Pre-load 100px before visible
const SEASON_CACHE_EXPIRY = 300000; // 5 minutes
const DEBOUNCE_RESIZE_DELAY = 150;
const CARD_ANIMATION_DURATION = 300;

// Advanced Continue Watching Movie Card Component with intelligent caching and optimization
const ContinueWatchingCard = React.memo(({ item, onClick, isMobile, onRemove, index, totalItems }) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [seasonProgress, setSeasonProgress] = useState(null);
  const [isLoadingSeasonData, setIsLoadingSeasonData] = useState(false);
  const memoryOptimizer = useContinueWatchingMemoryOptimizer();

  // Advanced state management
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [cardWidth, setCardWidth] = useState('w-80');
  
  // Refs for performance optimization
  const cardRef = useRef(null);
  const imageTimeoutRef = useRef(null);
  const seasonProgressCache = useRef(new Map());
  const mountedRef = useRef(true);
  const lastSeasonFetchRef = useRef(null);

  // Priority loading based on position (first 3 cards load immediately)
  const isPriority = index < 3;
  const loadPriority = isPriority ? 'high' : 'low';

  // Memoized mobile state
  const isMobileState = useMemo(() => isMobile, [isMobile]);

  // Advanced cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (imageTimeoutRef.current) {
        clearTimeout(imageTimeoutRef.current);
      }
    };
  }, []);

  // Intelligent responsive card width calculation
  useEffect(() => {
    const calculateCardWidth = () => {
      const width = window.innerWidth;
      if (width > 1800 && !isMobileState) {
        setCardWidth("w-[420px]");
      } else if (isMobileState) {
        setCardWidth("w-[160px] sm:w-[180px] md:w-[200px]");
      } else {
        setCardWidth("w-80 xl:w-[340px]");
      }
    };

    calculateCardWidth();

    if (memoryOptimizer) {
      const debouncedResize = memoryOptimizer.createDebouncedFunction(calculateCardWidth, DEBOUNCE_RESIZE_DELAY);
      window.addEventListener('resize', debouncedResize);
      return () => window.removeEventListener('resize', debouncedResize);
    }
  }, [isMobileState, memoryOptimizer]);

  // Advanced duration formatting with caching
  const formatDuration = useMemo(() => {
    if (item.type === 'tv') {
      return item.seasons ? `${item.seasons} Season${item.seasons > 1 ? 's' : ''}` : 'TV Show';
    }
    return item.runtime ? `${Math.floor(item.runtime / 60)}h ${item.runtime % 60}m` : 'Movie';
  }, [item.type, item.seasons, item.runtime]);

  // Intelligent image URL selection with quality optimization
  const imageUrl = useMemo(() => {
    try {
      if (isMobileState) {
        // For mobile: prefer poster for portrait aspect ratio
        if (item.poster_path) {
          return getOptimizedImageUrl(item.poster_path, 'w342');
        } else if (item.backdrop_path) {
          return getOptimizedImageUrl(item.backdrop_path, 'w342');
        }
      } else {
        // For desktop: prefer backdrop for landscape aspect ratio
        if (item.backdrop_path) {
          return getOptimizedImageUrl(item.backdrop_path, 'w500');
        } else if (item.poster_path) {
          return getOptimizedImageUrl(item.poster_path, 'w342');
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }, [item.poster_path, item.backdrop_path, isMobileState]);

  // Get year from lastWatched date with fallback
  const getYear = useMemo(() => {
    if (item.lastWatched) {
      return new Date(item.lastWatched).getFullYear();
    }
    if (item.release_date) {
      return new Date(item.release_date).getFullYear();
    }
    if (item.first_air_date) {
      return new Date(item.first_air_date).getFullYear();
    }
    return new Date().getFullYear();
  }, [item.lastWatched, item.release_date, item.first_air_date]);

  // Episode info with improved formatting
  const getEpisodeInfo = useMemo(() => {
    if (item.type === 'tv' && item.season && item.episode) {
      return `S${String(item.season).padStart(2, '0')} E${String(item.episode).padStart(2, '0')}`;
    }
    return '';
  }, [item.type, item.season, item.episode]);

  // Advanced progress calculations with precise rounding
  const getProgressPercentage = useMemo(() => {
    const progress = Number(item.progress) || 0;
    return Math.min(Math.max(progress, 0), 100); // Clamp between 0-100
  }, [item.progress]);

  // Smart progress label with contextual messages
  const formatProgress = useMemo(() => {
    const progress = getProgressPercentage;
    if (progress === 0) return 'Start watching';
    if (progress < 10) return 'Just started';
    if (progress < 30) return 'Early stages';
    if (progress < 70) return `${progress.toFixed(0)}% complete`;
    if (progress < 90) return 'Almost there';
    if (progress < 95) return 'Nearly finished';
    return 'Finish watching';
  }, [getProgressPercentage]);

  // Advanced season progress calculation with caching and error handling
  const calculateSeasonProgress = useCallback(async () => {
    if (item.type === 'tv' && item.season && item.episode) {
      const cacheKey = `${item.id}_${item.season}`;
      const now = Date.now();
      
      // Check cache with expiry
      if (seasonProgressCache.current.has(cacheKey)) {
        const cached = seasonProgressCache.current.get(cacheKey);
        if (now - cached.timestamp < SEASON_CACHE_EXPIRY) {
          setSeasonProgress(cached.data);
          return;
        }
      }
      
      // Prevent duplicate fetches
      if (lastSeasonFetchRef.current === cacheKey && isLoadingSeasonData) {
        return;
      }
      
      setIsLoadingSeasonData(true);
      lastSeasonFetchRef.current = cacheKey;
      
      try {
        const { getTVSeason } = await import('../services/tmdbService');
        const seasonData = await getTVSeason(item.id, item.season);
        
        if (!mountedRef.current) return;
        
        const totalEpisodes = seasonData.episodes?.length || 0;
        const watchedEpisodes = Math.min(item.episode, totalEpisodes);
        const progress = totalEpisodes > 0 ? (watchedEpisodes / totalEpisodes) * 100 : 0;
        
        const progressData = {
          watched: watchedEpisodes,
          total: totalEpisodes,
          percentage: Math.round(progress * 10) / 10 // Round to 1 decimal
        };
        
        // Cache with timestamp
        seasonProgressCache.current.set(cacheKey, {
          data: progressData,
          timestamp: now
        });
        
        setSeasonProgress(progressData);
      } catch (error) {
        console.error('Failed to fetch season progress:', error);
        // Set fallback data
        if (mountedRef.current) {
          setSeasonProgress({
            watched: item.episode,
            total: item.episode,
            percentage: 0
          });
        }
      } finally {
        if (mountedRef.current) {
          setIsLoadingSeasonData(false);
        }
      }
    }
  }, [item.id, item.season, item.episode, item.type, isLoadingSeasonData]);

  // Load season progress on mount with smart delay
  useEffect(() => {
    if (item.type === 'tv' && item.season && item.episode) {
      // Priority items load immediately, others after a short delay to prevent congestion
      const delay = isPriority ? 0 : index * 100; // Stagger by 100ms per item
      const timeoutId = setTimeout(() => {
        if (mountedRef.current) {
          calculateSeasonProgress();
        }
      }, delay);
      
      return () => clearTimeout(timeoutId);
    }
  }, [calculateSeasonProgress, item.type, item.season, item.episode, isPriority, index]);

  // Optimized event handlers with proper error boundaries
  const handleCardClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isRemoving) return;
    
    try {
      onClick(item);
    } catch (error) {
      console.error('Error handling card click:', error);
    }
  }, [onClick, item, isRemoving]);

  const handleRemoveClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isRemoving) return;
    
    setIsRemoving(true);
    
    try {
      setTimeout(() => {
        if (mountedRef.current) {
          onRemove(item);
        }
      }, CARD_ANIMATION_DURATION);
    } catch (error) {
      console.error('Error removing item:', error);
      setIsRemoving(false);
    }
  }, [onRemove, item, isRemoving]);

  // Advanced Intersection Observer with priority loading and proper cleanup
  useEffect(() => {
    if (!cardRef.current || isInView) return;
    
    // Priority cards skip intersection observer and load immediately
    if (isPriority) {
      setIsInView(true);
      return;
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isInView && mountedRef.current) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { 
        threshold: INTERSECTION_THRESHOLD,
        rootMargin: INTERSECTION_ROOT_MARGIN
      }
    );
    
    observer.observe(cardRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, [isInView, isPriority]);

  // Image load timeout handler for better UX
  useEffect(() => {
    if (!isInView || !imageUrl || imageLoaded || imageError) return;
    // Rate-limited warning helper (DEV-only)
    const _warnTs = (function () {
      try {
        if (typeof window !== 'undefined') {
          window.__STREAMR_CW_WARN_TS = window.__STREAMR_CW_WARN_TS || new Map();
          return window.__STREAMR_CW_WARN_TS;
        }
      } catch (_) {}
      return new Map();
    })();
    const imageWarn = (key, ...args) => {
      try {
        if (!(import.meta && import.meta.env && import.meta.env.DEV)) return;
        const now = Date.now();
        const last = _warnTs.get(key) || 0;
        const RATE_LIMIT_MS = 60 * 1000;
        if (now - last > RATE_LIMIT_MS) {
          _warnTs.set(key, now);
          // eslint-disable-next-line no-console
          console.warn(...args);
        } else {
          // eslint-disable-next-line no-console
          console.debug('[throttled continue-watching image warn]', ...args);
        }
      } catch (_) {}
    };

    imageTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && !imageLoaded) {
        imageWarn(item.id + ':timeout', `Image load timeout for: ${item.title}`);
        setImageError(true);
      }
    }, IMAGE_LOAD_TIMEOUT);
    
    return () => {
      if (imageTimeoutRef.current) {
        clearTimeout(imageTimeoutRef.current);
      }
    };
  }, [isInView, imageUrl, imageLoaded, imageError, item.title]);

  // Image load handlers
  const handleImageLoad = useCallback(() => {
    if (mountedRef.current) {
      setImageLoaded(true);
      setImageError(false);
      if (imageTimeoutRef.current) {
        clearTimeout(imageTimeoutRef.current);
      }
    }
  }, []);

  const handleImageError = useCallback(() => {
    if (mountedRef.current) {
      setImageError(true);
      setImageLoaded(false);
      if (imageTimeoutRef.current) {
        clearTimeout(imageTimeoutRef.current);
      }
    }
  }, []);

  return (
    <div 
      ref={cardRef}
      className={`group flex flex-col gap-4 rounded-lg ${cardWidth} flex-shrink-0 touch-manipulation`}
      data-movie-id={item.id}
      data-priority={isPriority}
      style={{
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation',
        opacity: isRemoving ? 0 : 1,
        transform: isRemoving ? 'scale(0.8) translateY(-20px)' : 'scale(1) translateY(0)',
        transition: `all ${CARD_ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        willChange: isRemoving ? 'opacity, transform' : 'auto',
      }}
    >
      <div className={`relative ${isMobileState ? 'aspect-[2/3]' : 'aspect-[16/10]'} rounded-lg overflow-hidden transform-gpu transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/20 w-full active:scale-[0.98] active:shadow-lg`}>
        {/* Clickable area for movie details */}
        <div 
          className="w-full h-full cursor-pointer touch-manipulation"
          onClick={handleCardClick}
          role="button"
          tabIndex={0}
          aria-label={`Continue watching ${item.title}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCardClick(e);
            }
          }}
          style={{
            WebkitTapHighlightColor: 'transparent',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            touchAction: 'manipulation',
          }}
        >
          {isInView && imageUrl && !imageError ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center animate-pulse">
                  <svg className="w-12 h-12 text-gray-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                </div>
              )}
              <img
                src={imageUrl}
                alt={item.title}
                loading={loadPriority === 'high' ? 'eager' : 'lazy'}
                fetchpriority={loadPriority}
                className={`w-full h-full object-cover transition-all duration-700 ${
                  imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                } hover:scale-110`}
                style={{
                  imageRendering: 'auto',
                  WebkitBackfaceVisibility: 'hidden',
                  backfaceVisibility: 'hidden',
                  transform: 'translateZ(0)',
                  WebkitFontSmoothing: 'antialiased',
                  WebkitTransform: 'translate3d(0,0,0)',
                }}
                draggable={false}
                onError={handleImageError}
                onLoad={handleImageLoad}
              />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 flex flex-col items-center justify-center gap-3">
              <svg className="w-16 h-16 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
              </svg>
              {imageError && (
                <p className="text-gray-400 text-xs">Failed to load image</p>
              )}
            </div>
          )}
          
          {/* Nearly Finished Badge - Top left with enhanced animation - Black & White Theme */}
          {getProgressPercentage >= 70 && getProgressPercentage < 95 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="absolute top-2 left-2 z-20 px-2.5 py-1 bg-white/5 backdrop-blur-sm rounded-full text-white text-[10px] font-semibold flex items-center gap-1.5 shadow-lg border border-white/30"
            >
              <svg 
                className="w-3 h-3" 
                fill="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  fillRule="evenodd"
                  clipRule="evenodd"
                />
              </svg>
              Almost Done
            </motion.div>
          )}

          {/* Completed Badge - For 95%+ progress - Black & White Theme */}
          {getProgressPercentage >= 95 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="absolute top-2 left-2 z-20 px-2.5 py-1 bg-white/5 backdrop-blur-sm rounded-full text-white text-[10px] font-semibold flex items-center gap-1.5 shadow-lg border border-white/30"
            >
              <svg 
                className="w-3 h-3" 
                fill="none" 
                stroke="currentColor"
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2.5} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
              Complete
            </motion.div>
          )}

          {/* Movie info overlay - Enhanced with better gradients */}
          <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-100 transition-all duration-500 rounded-lg overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-0 transition-transform duration-500 overflow-hidden">
                <h3 className="text-white font-medium text-lg truncate mb-1 drop-shadow-lg">{item.title}</h3>
                <div className="flex items-center gap-2 text-white/90 text-sm drop-shadow-md flex-wrap">
                  <span className="flex items-center gap-1">
                    {getYear}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    {item.type === 'tv' ? 'TV Show' : 'Movie'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    {formatDuration}
                  </span>
                  {item.type === 'tv' && item.season && item.episode && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-medium">
                        {getEpisodeInfo}
                      </span>
                    </>
                  )}
                </div>
                
                {/* Enhanced Progress bar for TV shows - Black & White Theme - OPTIMIZED */}
                {item.type === 'tv' && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-white/70 text-xs mb-1.5">
                      <span className="font-medium">Season {item.season || 'N/A'}</span>
                      {/* Announce season progress updates to assistive tech */}
                      <span className="font-mono" aria-live="polite" aria-atomic="true">
                        {seasonProgress ? (
                          `${seasonProgress.watched}/${seasonProgress.total} eps`
                        ) : isLoadingSeasonData ? (
                          <span className="animate-pulse">Loading...</span>
                        ) : (
                          `${item.episode || 0} eps`
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-1 relative overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          seasonProgress ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'bg-white/30'
                        }`}
                        style={{
                          width: seasonProgress ? `${seasonProgress.percentage}%` : '0%',
                          transform: 'translateZ(0)',
                          willChange: 'width',
                          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      />
                      {/* Shimmer effect for loading */}
                      {isLoadingSeasonData && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                      )}
                    </div>
                  </div>
                )}

                {/* Enhanced Progress bar for movies - Black & White Theme - OPTIMIZED */}
                {item.type === 'movie' && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-white/70 text-xs mb-1.5">
                      <span className="font-medium">Watch Progress</span>
                      {/* Announce progress updates for screen readers */}
                      <span className="font-mono" aria-live="polite" aria-atomic="true">{getProgressPercentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-1 relative overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          getProgressPercentage > 0 
                            ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                            : 'bg-white/30'
                        }`}
                        style={{
                          width: `${Math.max(getProgressPercentage, 1)}%`,
                          transform: 'translateZ(0)',
                          willChange: 'width',
                          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
        
          {/* Remove button - Enhanced with better accessibility */}
          {onRemove && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              aria-label={`Remove ${item.title} from Continue Watching`}
              aria-pressed={isRemoving}
              onClick={handleRemoveClick}
              disabled={isRemoving}
              className="absolute top-2 right-2 z-40 w-9 h-9 sm:w-8 sm:h-8 bg-black/70 hover:bg-red-600/90 disabled:bg-gray-600/70 rounded-full flex items-center justify-center transition-all duration-200 pointer-events-auto shadow-md shadow-black/30 group/btn"
              style={{
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                touchAction: 'manipulation',
              }}
            >
              {isRemoving ? (
                <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {/* Hidden label for screen readers */}
              <span className="sr-only">Remove {item.title} from Continue Watching</span>
            </motion.button>
          )}
        </div>
        
        {/* Mobile Progress Bar - Minimal, always-visible on mobile */}
        {isMobileState && (
          <div className="absolute bottom-0 left-0 right-0 p-2 md:hidden z-20" style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)',
            pointerEvents: 'none'
          }}>
            <div className="flex items-center justify-between text-white/95 text-[11px] font-medium mb-1 px-1">
              <span className="truncate">{item.type === 'tv' ? `S${item.season || 'N/A'}` : 'Progress'}</span>
              <span className="font-mono text-[11px]">
                {item.type === 'tv'
                  ? (seasonProgress ? `${seasonProgress.watched}/${seasonProgress.total}` : `${item.episode || 0} eps`)
                  : `${getProgressPercentage.toFixed(0)}%`
                }
              </span>
            </div>
            <div className="w-full h-0.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-white"
                style={{
                  width: item.type === 'tv' ? (seasonProgress ? `${seasonProgress.percentage}%` : '0%') : `${Math.max(getProgressPercentage, 1)}%`,
                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Advanced memo comparison for optimal re-rendering
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.progress === nextProps.item.progress &&
    prevProps.item.season === nextProps.item.season &&
    prevProps.item.episode === nextProps.item.episode &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.index === nextProps.index
  );
});

ContinueWatchingCard.displayName = 'ContinueWatchingCard';

// PropTypes for the card to help catch incorrect prop usage
ContinueWatchingCard.propTypes = {
  item: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired,
  isMobile: PropTypes.bool,
  onRemove: PropTypes.func,
  index: PropTypes.number,
  totalItems: PropTypes.number,
};
// Main Continue Watching Component - ADVANCED VERSION with intelligent optimizations
const ContinueWatching = ({ onMovieSelect, isMobile }) => {
  const { 
    continueWatching, 
    hasContinueWatching, 
    removeFromContinueWatching, 
    refreshFromStorage, 
    clearAllContinueWatching,
    clearMoviesFromContinueWatching,
    clearTVShowsFromContinueWatching,
    markAsWatched
  } = useViewingProgress();
  const memoryOptimizer = useContinueWatchingMemoryOptimizer();
  
  // Advanced state management
  const [showClearMenu, setShowClearMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  
  // Refs for advanced optimizations
  const swiperRef = useRef(null);
  const refreshTimeoutRef = useRef(null);
  const visibilityListenerRef = useRef(null);
  const focusListenerRef = useRef(null);
  
  // Advanced visibility tracking (SSR-safe)
  const [isVisible, setIsVisible] = useState(() => {
    try {
      return typeof document !== 'undefined' ? !document.hidden : true;
    } catch (e) {
      return true;
    }
  });
  
  // Intelligent refresh with throttling to prevent excessive API calls
  const intelligentRefresh = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefresh;
    
    // Throttle refreshes to max once every 5 seconds
    if (timeSinceLastRefresh < 5000 || isRefreshing) {
      return;
    }
    
    setIsRefreshing(true);
    try {
      await refreshFromStorage();
      setLastRefresh(now);
    } catch (error) {
      console.error('Failed to refresh continue watching:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshFromStorage, lastRefresh, isRefreshing]);
  
  // Advanced auto-refresh with visibility detection and smart intervals
  useEffect(() => {
    if (!memoryOptimizer) return;
    
    // Initial refresh on mount
    intelligentRefresh();
    
    // Visibility change handler - refresh when user returns to tab
    const handleVisibilityChange = () => {
      const newVisibility = !document.hidden;
      setIsVisible(newVisibility);
      
      if (newVisibility && memoryOptimizer.isMounted()) {
        intelligentRefresh();
      }
    };

    // Focus handler - refresh when window gains focus
    const handleFocus = () => {
      if (memoryOptimizer.isMounted() && isVisible) {
        intelligentRefresh();
      }
    };
    
    memoryOptimizer.addEventListener(document, 'visibilitychange', handleVisibilityChange);
    memoryOptimizer.addEventListener(window, 'focus', handleFocus);

    // Smart interval - only refresh when visible, reduce frequency when hidden
    const refreshInterval = isVisible ? 30000 : 60000; // 30s when visible, 60s when hidden
    memoryOptimizer.addInterval(() => {
      if (memoryOptimizer.isMounted()) {
        intelligentRefresh();
      }
    }, refreshInterval);

    // Cleanup is automatic via memory optimizer
  }, [intelligentRefresh, memoryOptimizer, isVisible]);
  
  // Advanced memoization with stats computed in one pass to reduce work
  const { memoizedContinueWatching, stats } = useMemo(() => {
    const list = Array.isArray(continueWatching) ? continueWatching : [];
    // Create shallow copy and sort by lastWatched (most recent first)
    const sorted = [...list].sort((a, b) => {
      const dateA = a?.lastWatched ? new Date(a.lastWatched).getTime() : 0;
      const dateB = b?.lastWatched ? new Date(b.lastWatched).getTime() : 0;
      return dateB - dateA;
    });

    // Compute stats in the same iteration for performance
    const computed = sorted.reduce(
      (acc, item) => {
        if (item?.type === 'movie') acc.movies += 1;
        if (item?.type === 'tv') acc.tvShows += 1;
        acc.total += 1;
        return acc;
      },
      { movies: 0, tvShows: 0, total: 0 }
    );

    return { memoizedContinueWatching: sorted, stats: computed };
  }, [continueWatching]);

  // Advanced Swiper update logic with error handling
  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper || typeof swiper !== 'object') return;

    try {
      // Base update (safe)
      if (typeof swiper.update === 'function') swiper.update();

      // Only call slide-related updates if slides are available on the swiper instance
      const hasSlides = !!swiper.slides && (typeof swiper.slides.length === 'number');

      if (hasSlides) {
        if (typeof swiper.updateSlides === 'function') swiper.updateSlides();
        if (typeof swiper.updateProgress === 'function') swiper.updateProgress();
        if (typeof swiper.updateSize === 'function') swiper.updateSize();
        if (typeof swiper.updateSlidesClasses === 'function') swiper.updateSlidesClasses();
      }

      // Reset to first slide if current index is out of bounds
      const count = Array.isArray(memoizedContinueWatching) ? memoizedContinueWatching.length : 0;
      if (hasSlides && typeof swiper.activeIndex === 'number' && swiper.activeIndex >= count && count > 0) {
        if (typeof swiper.slideTo === 'function') swiper.slideTo(0, 0); // Instantly move to first slide
      }
    } catch (error) {
      console.warn('Swiper update error:', error);
    }
  }, [memoizedContinueWatching, isMobile]);

  // Advanced movie selection handler with analytics tracking
  const handleMovieSelect = useCallback((item) => {
    if (!onMovieSelect || !item) return;
    
    try {
      // Create enhanced movie object with all necessary data
      const movieObject = {
        id: item.id,
        title: item.title,
        name: item.title,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        media_type: item.type,
        type: item.type,
        season: item.season,
        episode: item.episode,
        episodeTitle: item.episodeTitle,
        progress: item.progress,
        lastWatched: item.lastWatched,
        // Additional metadata for better UX
        runtime: item.runtime,
        release_date: item.release_date,
        first_air_date: item.first_air_date,
      };
      
      // Track selection event (can be extended with analytics)
      console.log('Continue watching item selected:', {
        id: item.id,
        type: item.type,
        progress: item.progress
      });
      
      onMovieSelect(movieObject);
    } catch (error) {
      console.error('Error handling movie selection:', error);
    }
  }, [onMovieSelect]);

  // Advanced remove handler with optimistic updates
  const handleRemoveItem = useCallback((item) => {
    if (!item) return;
    
    try {
      removeFromContinueWatching(item.id, item.type, item.season, item.episode);
      
      // Log removal for debugging
      console.log('Removed from continue watching:', {
        id: item.id,
        type: item.type,
        title: item.title
      });
    } catch (error) {
      console.error('Error removing item:', error);
    }
  }, [removeFromContinueWatching]);

  // Advanced clear all with confirmation tracking
  const handleClearAll = useCallback(() => {
    try {
      clearAllContinueWatching();
      setShowClearMenu(false);
      console.log('Cleared all continue watching items');
    } catch (error) {
      console.error('Error clearing all:', error);
    }
  }, [clearAllContinueWatching]);

  // Clear movies only
  const handleClearMovies = useCallback(() => {
    try {
      clearMoviesFromContinueWatching();
      setShowClearMenu(false);
      console.log('Cleared movies from continue watching');
    } catch (error) {
      console.error('Error clearing movies:', error);
    }
  }, [clearMoviesFromContinueWatching]);

  // Clear TV shows only
  const handleClearTVShows = useCallback(() => {
    try {
      clearTVShowsFromContinueWatching();
      setShowClearMenu(false);
      console.log('Cleared TV shows from continue watching');
    } catch (error) {
      console.error('Error clearing TV shows:', error);
    }
  }, [clearTVShowsFromContinueWatching]);

  // Advanced click outside handler with proper cleanup
  useEffect(() => {
    if (!showClearMenu || !memoryOptimizer) return;
    
    const handleClickOutside = (e) => {
      if (!e.target.closest('.clear-menu-container')) {
        setShowClearMenu(false);
      }
    };
    
    // Small delay to prevent immediate closing
    const timeoutId = setTimeout(() => {
      memoryOptimizer.addEventListener(document, 'mousedown', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [showClearMenu, memoryOptimizer]);

  // Don't render if no continue watching items
  if (!hasContinueWatching()) {
    return null;
  }

  // stats are now provided by the memo above

  // Mobile rendering with enhanced UI
  if (isMobile) {
    return (
      <motion.div 
        className="mt-8 px-4"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.6, 
          ease: [0.25, 0.46, 0.45, 0.94],
          delay: 0.1
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
              <span className="inline-flex items-center gap-2">
                <span className="flex-shrink-0 text-white">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 transition-transform duration-200 hover:scale-110" 
                    viewBox="0 0 24 24" 
                    fill="currentColor" 
                    aria-hidden="true"
                    role="img"
                  >
                    <path 
                      d="M8 5v14l11-7z"
                      stroke="currentColor"
                      strokeWidth="0.5"
                      fillRule="evenodd"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <span>Continue Watching</span>
              </span>
            </h2>
            {/* Item count badge */}
            <span className="px-2 py-0.5 text-xs font-medium bg-white/10 text-white/70 rounded-full">
              {stats.total}
            </span>
          </div>
          <div className="relative flex items-center gap-2 clear-menu-container">
            <button
              onClick={() => setShowClearMenu(!showClearMenu)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-all duration-200 flex items-center gap-1 active:scale-95"
            >
              Clear
              <motion.svg 
                className="w-3 h-3" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                animate={{ rotate: showClearMenu ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </motion.svg>
            </button>
            
            {/* Enhanced Dropdown menu */}
            <AnimatePresence>
              {showClearMenu && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-1 w-44 bg-[#1a1d24]/98 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 py-1.5 z-50 clear-menu-container overflow-hidden"
                  style={{ 
                    backgroundImage: 'linear-gradient(135deg, rgba(26, 29, 36, 0.98) 0%, rgba(43, 48, 54, 0.98) 100%)'
                  }}
                >
                  <button
                    onClick={handleClearAll}
                    disabled={stats.total === 0}
                    className="w-full px-3 py-2 text-[11px] text-left text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center gap-2 group rounded-lg"
                  >
                    <svg className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition-all duration-200 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" strokeWidth="0.5" fillRule="evenodd" clipRule="evenodd" />
                    </svg>
                    <span>Clear All</span>
                    <span className="ml-auto text-[10px] font-mono opacity-60">({stats.total})</span>
                  </button>
                  <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-1"></div>
                  <button
                    onClick={handleClearMovies}
                    disabled={stats.movies === 0}
                    className="w-full px-3 py-2 text-[11px] text-left text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center gap-2 group rounded-lg"
                  >
                    <svg className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition-all duration-200 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" stroke="currentColor" strokeWidth="0.5" fillRule="evenodd" clipRule="evenodd" />
                    </svg>
                    <span>Clear Movies</span>
                    <span className="ml-auto text-[10px] font-mono opacity-60">({stats.movies})</span>
                  </button>
                  <button
                    onClick={handleClearTVShows}
                    disabled={stats.tvShows === 0}
                    className="w-full px-3 py-2 text-[11px] text-left text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center gap-2 group rounded-lg"
                  >
                    <svg className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition-all duration-200 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5l-1 3v1h8v-1l-1-3h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12H3V5h18v10z" stroke="currentColor" strokeWidth="0.5" fillRule="evenodd" clipRule="evenodd" />
                    </svg>
                    <span>Clear TV Shows</span>
                    <span className="ml-auto text-[10px] font-mono opacity-60">({stats.tvShows})</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-4 px-2 sm:px-4 horizontal-scroll-container">
          {memoizedContinueWatching.map((item, index) => (
            <motion.div 
              key={`continue-watching-${item.id}-${item.type}-${item.season || 'movie'}-${item.episode || 'movie'}`} 
              className="flex-shrink-0 relative group"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                duration: 0.4, 
                ease: [0.25, 0.46, 0.45, 0.94],
                delay: 0.3 + (index * 0.08) // Stagger by 80ms per card
              }}
            >
              <ContinueWatchingCard
                item={item}
                onClick={handleMovieSelect}
                isMobile={isMobile}
                onRemove={handleRemoveItem}
                index={index}
                totalItems={memoizedContinueWatching.length}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }

  // Desktop rendering with enhanced Swiper
  return (
    <motion.div 
      className="mt-8"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.6, 
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: 0.1
      }}
    >
      <motion.div 
        className="flex items-center justify-between mb-4 px-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ 
          duration: 0.5, 
          ease: [0.25, 0.46, 0.45, 0.94],
          delay: 0.2
        }}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
            <span className="inline-flex items-center gap-2">
              <span className="flex-shrink-0 text-white">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4 transition-transform duration-200 hover:scale-110" 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  aria-hidden="true"
                  role="img"
                >
                  <path 
                    d="M8 5v14l11-7z"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <span>Continue Watching</span>
            </span>
          </h2>
          {/* Enhanced item count badge */}
          <span className="px-2.5 py-1 text-xs font-medium bg-white/10 text-white/70 rounded-lg border border-white/5">
            {stats.total} {stats.total === 1 ? 'item' : 'items'}
          </span>
        </div>
        <div className="relative flex items-center gap-2 clear-menu-container">
          {isRefreshing && (
            <svg className="w-4 h-4 text-white/50 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
          )}
          <button
            onClick={() => setShowClearMenu(!showClearMenu)}
            className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-all duration-200 flex items-center gap-1.5 active:scale-95 hover:shadow-lg hover:shadow-white/5"
          >
            Clear
            <motion.svg 
              className="w-3.5 h-3.5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              animate={{ rotate: showClearMenu ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </motion.svg>
          </button>
          
          {/* Enhanced Dropdown menu */}
          <AnimatePresence>
            {showClearMenu && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 top-full mt-2 w-48 bg-[#1a1d24]/98 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 py-2 z-50 clear-menu-container overflow-hidden"
                style={{ 
                  backgroundImage: 'linear-gradient(135deg, rgba(26, 29, 36, 0.98) 0%, rgba(43, 48, 54, 0.98) 100%)'
                }}
              >
                <button
                  onClick={handleClearAll}
                  disabled={stats.total === 0}
                  className="w-full px-4 py-2.5 text-xs text-left text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center gap-2.5 group rounded-lg"
                >
                  <svg className="w-4 h-4 text-white/60 group-hover:text-white transition-all duration-200 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" strokeWidth="0.5" fillRule="evenodd" clipRule="evenodd" />
                  </svg>
                  <span className="flex-1">Clear All</span>
                  <span className="text-[10px] font-mono opacity-60">({stats.total})</span>
                </button>
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-1.5 mx-2"></div>
                <button
                  onClick={handleClearMovies}
                  disabled={stats.movies === 0}
                  className="w-full px-4 py-2.5 text-xs text-left text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center gap-2.5 group rounded-lg"
                >
                  <svg className="w-4 h-4 text-white/60 group-hover:text-white transition-all duration-200 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" stroke="currentColor" strokeWidth="0.5" fillRule="evenodd" clipRule="evenodd" />
                  </svg>
                  <span className="flex-1">Clear Movies</span>
                  <span className="text-[10px] font-mono opacity-60">({stats.movies})</span>
                </button>
                <button
                  onClick={handleClearTVShows}
                  disabled={stats.tvShows === 0}
                  className="w-full px-4 py-2.5 text-xs text-left text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center gap-2.5 group rounded-lg"
                >
                  <svg className="w-4 h-4 text-white/60 group-hover:text-white transition-all duration-200 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5l-1 3v1h8v-1l-1-3h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12H3V5h18v10z" stroke="currentColor" strokeWidth="0.5" fillRule="evenodd" clipRule="evenodd" />
                  </svg>
                  <span className="flex-1">Clear TV Shows</span>
                  <span className="text-[10px] font-mono opacity-60">({stats.tvShows})</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      <motion.div 
        className="relative group"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ 
          duration: 0.5, 
          ease: [0.25, 0.46, 0.45, 0.94],
          delay: 0.3
        }}
      >
        <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-[#121417] to-transparent z-10 pointer-events-none"></div>
        <div className="absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-[#121417] to-transparent z-10 pointer-events-none"></div>
        <Swiper
          modules={[Navigation, A11y, Mousewheel, Keyboard, FreeMode]}
          spaceBetween={16}
          slidesPerView="auto"
          speed={400}
          onSwiper={(swiper) => { swiperRef.current = swiper; }}
          navigation={{
            nextEl: '.continue-watching-swiper-next',
            prevEl: '.continue-watching-swiper-prev',
          }}
          mousewheel={{
            forceToAxis: true,
            sensitivity: 1,
            releaseOnEdges: true
          }}
          // Allow desktop mouse dragging and pointer interactions
          simulateTouch={true}
          touchStartPreventDefault={false}
          touchStartForcePreventDefault={false}
          pointerEventsTarget="container"
          keyboard={{
            enabled: true,
            onlyInViewport: true
          }}
          grabCursor={true}
          touchRatio={1}
          touchAngle={45}
          resistance={true}
          resistanceRatio={0.85}
          allowTouchMove={true}
          allowSlideNext={true}
          allowSlidePrev={true}
          watchSlidesProgress={true}
          freeMode={{
            enabled: true,
            momentum: true,
            momentumVelocityRatio: 0.75,
            sticky: false
          }}
          observer={true}
          observeParents={true}
          updateOnWindowResize={true}
          className="px-6 pb-4 overflow-hidden"
        >
          {memoizedContinueWatching.map((item, index) => (
            <SwiperSlide key={`continue-watching-${item.id}-${item.type}-${item.season || 'movie'}-${item.episode || 'movie'}`} className="!w-auto">
              <motion.div 
                className="relative group"
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  duration: 0.4, 
                  ease: [0.25, 0.46, 0.45, 0.94],
                  delay: 0.4 + (index * 0.08) // Stagger by 80ms per card
                }}
              >
                <ContinueWatchingCard
                  item={item}
                  onClick={handleMovieSelect}
                  isMobile={isMobile}
                  onRemove={handleRemoveItem}
                  index={index}
                  totalItems={memoizedContinueWatching.length}
                />
              </motion.div>
            </SwiperSlide>
          ))}
        </Swiper>
        {/* Enhanced Navigation buttons */}
        <div className="continue-watching-swiper-prev !w-10 !h-10 !bg-white/5 hover:!bg-white/12 !rounded-full !border !border-white/10 !transition-all !duration-300 !ease-out -translate-x-16 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 !absolute !left-0 !-translate-y-1/2 !top-[50%] !m-0 !z-20 flex items-center justify-center hover:shadow-xl hover:shadow-black/20">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </div>
        <div className="continue-watching-swiper-next !w-10 !h-10 !bg-white/5 hover:!bg-white/12 !rounded-full !border !border-white/10 !transition-all !duration-300 !ease-out translate-x-16 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 !absolute !right-0 !-translate-y-1/2 !top-[50%] !m-0 !z-20 flex items-center justify-center hover:shadow-xl hover:shadow-black/20">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </motion.div>
    </motion.div>
  );
};

// PropTypes for ContinueWatching
ContinueWatching.propTypes = {
  onMovieSelect: PropTypes.func,
  isMobile: PropTypes.bool,
};

export default ContinueWatching; 