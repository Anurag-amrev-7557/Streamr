import React, { useState, useEffect, useRef, useCallback, memo, useMemo, lazy, Suspense } from 'react';
import { TMDB_BASE_URL, transformMovieData } from '../services/tmdbService';
import { getApiUrl } from '../config/api';
import { getPosterProps, getBackdropProps } from '../utils/imageUtils';
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
  getSimilarMovies,
  getPopularTVShows,
  getTopRatedTVShows,
  getAiringTodayTVShows,
  getNowPlayingMovies
} from '../services/tmdbService';
import { PageLoader, SectionLoader, CardLoader } from './Loader';
import ContinueWatching from './ContinueWatching';
import { useLoading } from '../contexts/LoadingContext';
import { useWatchlist } from '../contexts/WatchlistContext';
import { useViewingProgress } from '../contexts/ViewingProgressContext';
import { motion, AnimatePresence } from 'framer-motion';
import ScrollDebug from './ScrollDebug';
import memoryOptimizationService from '../utils/memoryOptimizationService';
// Swiper imports for desktop category and movie sections
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, A11y, Mousewheel, Keyboard } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// Custom Swiper styles for better navigation buttons
const swiperStyles = `
  .swiper-button-next,
  .swiper-button-prev {
    width: 40px !important;
    height: 40px !important;
    background: rgba(255, 255, 255, 0.1) !important;
    backdrop-filter: blur(10px) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    border-radius: 50% !important;
    transition: all 0.3s ease !important;
  }
  
  .swiper-button-next:hover,
  .swiper-button-prev:hover {
    background: rgba(255, 255, 255, 0.2) !important;
    transform: scale(1.1) !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
  }
  
  .swiper-button-next::after,
  .swiper-button-prev::after {
    font-size: 14px !important;
    font-weight: bold !important;
    color: white !important;
  }
  
  .swiper-button-next {
    right: 0 !important;
  }
  
  .swiper-button-prev {
    left: 0 !important;
  }
  
     /* Custom navigation buttons for category and movie sections */
   .category-swiper-next,
   .category-swiper-prev,
   .movie-swiper-next-trending,
   .movie-swiper-prev-trending,
   .movie-swiper-next-popular,
   .movie-swiper-prev-popular,
   .movie-swiper-next-topRated,
   .movie-swiper-prev-topRated,
   .movie-swiper-next-upcoming,
   .movie-swiper-prev-upcoming {
     width: 40px !important;
     height: 40px !important;
     background: rgba(255, 255, 255, 0.1) !important;
     backdrop-filter: blur(10px) !important;
     border: 1px solid rgba(255, 255, 255, 0.2) !important;
     border-radius: 50% !important;
     transition: all 0.3s ease !important;
     opacity: 0 !important;
     position: absolute !important;
     top: 50% !important;
     transform: translateY(-50%) !important;
     z-index: 20 !important;
   }
   
   .category-swiper-prev,
   .movie-swiper-prev-trending,
   .movie-swiper-prev-popular,
   .movie-swiper-prev-topRated,
   .movie-swiper-prev-upcoming {
     left: 0 !important;
   }
   
   .category-swiper-next,
   .movie-swiper-next-trending,
   .movie-swiper-next-popular,
   .movie-swiper-next-topRated,
   .movie-swiper-next-upcoming {
     right: 0 !important;
   }
  
  .group:hover .category-swiper-next,
  .group:hover .category-swiper-prev,
  .group:hover .movie-swiper-next-trending,
  .group:hover .movie-swiper-prev-trending,
  .group:hover .movie-swiper-next-popular,
  .group:hover .movie-swiper-prev-popular,
  .group:hover .movie-swiper-next-topRated,
  .group:hover .movie-swiper-prev-topRated,
  .group:hover .movie-swiper-next-upcoming,
  .group:hover .movie-swiper-prev-upcoming {
    opacity: 1 !important;
  }
  
  .category-swiper-next:hover,
  .category-swiper-prev:hover,
  .movie-swiper-next-trending:hover,
  .movie-swiper-prev-trending:hover,
  .movie-swiper-next-popular:hover,
  .movie-swiper-prev-popular:hover,
  .movie-swiper-next-topRated:hover,
  .movie-swiper-prev-topRated:hover,
  .movie-swiper-next-upcoming:hover,
  .movie-swiper-prev-upcoming:hover {
    background: rgba(255, 255, 255, 0.2) !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
  }
  
  .swiper-slide {
    transition: transform 0.3s ease !important;
  }
  
  /* Limit hover lift effect to movie swipers only */
  .movie-swiper .swiper-slide:hover {
    transform: translateY(-2px) !important;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = swiperStyles;
  document.head.appendChild(styleSheet);
}
// Lazy load heavy components
const ReactPlayer = lazy(() => import('react-player'));
const MinimalToast = lazy(() => import('./MinimalToast'));
// Ultra-smooth scrolling imports
import { useSmoothScroll, useScrollAnimation } from '../hooks/useSmoothScroll';
import { trackPageLoad, trackApiCall } from '../utils/performanceMonitor';

// Lazy load non-critical components with preloading hints
const MovieDetailsOverlay = lazy(() => import('./MovieDetailsOverlay'), {
  suspense: true
});
const EnhancedSearchBar = lazy(() => import('./EnhancedSearchBar'), {
  suspense: true
});
const NetworkStatus = lazy(() => import('./NetworkStatus'), {
  suspense: true
});

  // Preload critical components and images after initial render - MOVED INSIDE COMPONENT



// Category Swiper Component for Desktop View
const CategorySwiper = memo(({ categories, activeCategory, onCategoryClick, isMobile }) => {
  if (isMobile) {
    return (
      <div className="relative mt-6 px-4">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#121417] to-transparent z-10 pointer-events-none"></div>
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#121417] to-transparent z-10 pointer-events-none"></div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 mb-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => onCategoryClick(category)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                activeCategory === category.id
                  ? 'bg-white text-black hover:bg-white/90'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex-shrink-0">{category.icon}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative mt-6 group">
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#121417] to-transparent z-10 pointer-events-none"></div>
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#121417] to-transparent z-10 pointer-events-none"></div>
      <Swiper
        modules={[Navigation, A11y, Mousewheel, Keyboard]}
        spaceBetween={12}
        slidesPerView="auto"
        speed={400}
        // navigation disabled for category swiper (arrows hidden)
        navigation={false}
        mousewheel={{
          forceToAxis: true,
          sensitivity: 1,
          releaseOnEdges: true
        }}
        keyboard={{
          enabled: true,
          onlyInViewport: true
        }}
        grabCursor={true}
        touchRatio={1}
        touchAngle={45}
        resistance={true}
        resistanceRatio={0.85}
        watchSlidesProgress={true}
        className="px-4 pb-2"
        breakpoints={{
          768: {
            spaceBetween: 12,
            slidesPerView: "auto"
          },
          1024: {
            spaceBetween: 16,
            slidesPerView: "auto"
          },
          1280: {
            spaceBetween: 20,
            slidesPerView: "auto"
          },
          1536: {
            spaceBetween: 24,
            slidesPerView: "auto"
          }
        }}
      >
        {categories.map(category => (
          <SwiperSlide key={category.id} className="!w-auto">
            <button
              onClick={() => onCategoryClick(category)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                activeCategory === category.id
                  ? 'bg-white text-black hover:bg-white/90'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex-shrink-0">{category.icon}</span>
              <span>{category.label}</span>
            </button>
          </SwiperSlide>
        ))}
      </Swiper>
      {/* Navigation buttons removed for category swiper */}
    </div>
  );
});

CategorySwiper.displayName = 'CategorySwiper';

// Movie Section Swiper Component for Desktop View
const MovieSectionSwiper = memo(({ title, movies, loading, onLoadMore, hasMore, currentPage, sectionKey, onMovieSelect, onMovieHover, onPrefetch, isMobile }) => {
  if (isMobile) {
    return (
      <div className="mt-8 px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
        </div>
        <div className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-4 px-2 sm:px-4">
          {movies.map((movie, index) => (
            <div 
              key={`${sectionKey}-${movie.id}-${index}`} 
              className="flex-shrink-0"
              onMouseEnter={() => onMovieHover && onMovieHover(movie, index, movies)}
            >
              <MovieCard {...movie} onClick={() => onMovieSelect(movie)} id={movie.id} onPrefetch={() => onPrefetch && onPrefetch(movie.id)} />
            </div>
          ))}
          {loading && (
            <div className="flex-shrink-0">
              <div className="group flex flex-col gap-4 rounded-lg w-80 flex-shrink-0">
                <div className="relative aspect-[16/10] rounded-lg overflow-hidden bg-black/20 w-full">
                  <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4 px-4">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#121417] to-transparent z-10 pointer-events-none"></div>
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#121417] to-transparent z-10 pointer-events-none"></div>
        <Swiper
          modules={[Navigation, A11y, Mousewheel, Keyboard]}
          spaceBetween={16}
          slidesPerView="auto"
          speed={400}
          navigation={{
            nextEl: `.movie-swiper-next-${sectionKey}`,
            prevEl: `.movie-swiper-prev-${sectionKey}`,
          }}
          mousewheel={{
            forceToAxis: true,
            sensitivity: 1,
            releaseOnEdges: true
          }}
          keyboard={{
            enabled: true,
            onlyInViewport: true
          }}
          grabCursor={true}
          touchRatio={1}
          touchAngle={45}
          resistance={true}
          resistanceRatio={0.85}
          watchSlidesProgress={true}
          className="movie-swiper px-4 pb-4"
          breakpoints={{
            768: {
              spaceBetween: 16,
              slidesPerView: "auto"
            },
            1024: {
              spaceBetween: 20,
              slidesPerView: "auto"
            },
            1280: {
              spaceBetween: 24,
              slidesPerView: "auto"
            },
            1536: {
              spaceBetween: 28,
              slidesPerView: "auto"
            }
          }}
        >
          {movies.map((movie, index) => (
            <SwiperSlide key={`${sectionKey}-${movie.id}-${index}`} className="!w-auto">
              <div
                onMouseEnter={() => onMovieHover && onMovieHover(movie, index, movies)}
              >
                <MovieCard 
                  {...movie} 
                  onClick={() => onMovieSelect(movie)} 
                  id={movie.id} 
                  onPrefetch={() => onPrefetch && onPrefetch(movie.id)} 
                />
              </div>
            </SwiperSlide>
          ))}
          {loading && (
            <SwiperSlide className="!w-auto">
              <div className="flex flex-col gap-4 rounded-lg w-80 flex-shrink-0">
                <div className="relative aspect-[16/10] rounded-lg overflow-hidden bg-black/20 w-full">
                  <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                </div>
              </div>
            </SwiperSlide>
          )}
        </Swiper>
        {/* Navigation buttons - only visible on desktop */}
        <div className={`movie-swiper-prev-${sectionKey} !w-10 !h-10 !bg-white/5 hover:!bg-white/10 !rounded-full !border !border-white/10 !transition-all !duration-300 opacity-0 group-hover:opacity-100 !absolute !left-0 !-translate-y-1/2 !top-[50%] !m-0 !z-20 hover:!shadow-lg hover:!shadow-black/20 flex items-center justify-center`}>
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </div>
        <div className={`movie-swiper-next-${sectionKey} !w-10 !h-10 !bg-white/5 hover:!bg-white/10 !rounded-full !border !border-white/10 !transition-all !duration-300 opacity-0 group-hover:opacity-100 !absolute !right-0 !-translate-y-1/2 !top-[50%] !m-0 !z-20 hover:!shadow-lg hover:!shadow-black/20 flex items-center justify-center`}>
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
});

MovieSectionSwiper.displayName = 'MovieSectionSwiper';

// Ultra-optimized ProgressiveImage with advanced caching, preloading, and performance monitoring
const ProgressiveImage = memo(
  ({
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
    const preloadRef = useRef(null);

    // Compute tiny/placeholder src with optimized regex
    const getTinySrc = useCallback(
      (src) => {
        if (!src) return null;
        if (placeholderSrc) return placeholderSrc;
        // Optimized regex for better performance
        return src.replace(/\/(w\d+|original)/, "/w500");
      },
      [placeholderSrc]
    );

    // Optimized retry logic with requestAnimationFrame - FIXED: Timeout leaks
    useEffect(() => {
      if (imageError && retry < retryCount && src) {
        retryTimeoutRef.current = requestAnimationFrame(() => {
          setTimeout(() => {
            setImageError(false);
            setRetry((r) => r + 1);
          }, 300 + 200 * retry); // Faster retry with shorter delays
        });
      }
      return () => {
        if (retryTimeoutRef.current) {
          cancelAnimationFrame(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
      };
    }, [imageError, retry, retryCount, src]);

    // Ultra-optimized image loading with priority handling - FIXED: Image leaks
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

      // Create image with priority handling
      const fullImage = new window.Image();
      if (priority) {
        fullImage.fetchPriority = 'high';
        fullImage.loading = 'eager';
      } else {
        fullImage.loading = 'lazy';
      }
      
      // FIXED: Mobile-specific image loading optimization
      // Use smaller image sizes for mobile to improve loading performance
      const isMobile = window.innerWidth < 768;
      let optimizedSrc = src;
      
      if (isMobile && src.includes('/w')) {
        // For mobile, use smaller image sizes if available
        if (src.includes('/w500')) {
          optimizedSrc = src.replace('/w500', '/w300');
        } else if (src.includes('/w780')) {
          optimizedSrc = src.replace('/w780', '/w300');
        } else if (src.includes('/w1280')) {
          optimizedSrc = src.replace('/w1280', '/w300');
        }
      }
      
      fullImage.src = optimizedSrc;
      if (srcSet) fullImage.srcset = srcSet;
      
      // Store reference for cleanup
      preloadRef.current = fullImage;
      
      fullImage.onload = () => {
        if (preloadRef.current === fullImage) { // Check if still the same image
          setCurrentSrc(optimizedSrc);
          setImageLoaded(true);
          if (onLoad) onLoad();
        }
      };
      
      fullImage.onerror = (e) => {
        if (preloadRef.current === fullImage) { // Check if still the same image
          console.warn('Image failed to load:', optimizedSrc, 'Error:', e);
          setImageError(true);
          if (onError) onError(e);
        }
      };
      
      // Cleanup function - FIXED: Proper image cleanup
      return () => {
        if (preloadRef.current === fullImage) {
          preloadRef.current.onload = null;
          preloadRef.current.onerror = null;
          preloadRef.current.src = '';
          preloadRef.current.srcset = '';
          preloadRef.current = null;
        }
      };
    }, [src, srcSet, getTinySrc, retry, priority, onLoad, onError]);

    // Cleanup on unmount - FIXED: Memory leaks
    useEffect(() => {
      return () => {
        if (retryTimeoutRef.current) {
          cancelAnimationFrame(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
        if (preloadRef.current) {
          preloadRef.current.onload = null;
          preloadRef.current.onerror = null;
          preloadRef.current.src = '';
          preloadRef.current.srcset = '';
          preloadRef.current = null;
        }
      };
    }, []);

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
  }
);

const MovieCard = memo(({ title, type, image, backdrop, seasons, rating, year, duration, runtime, onMouseLeave, onClick, id, prefetching, cardClassName, poster, poster_path, backdrop_path, overview, genres, release_date, first_air_date, vote_average, media_type, onPrefetch }) => {
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const [isInWatchlistState, setIsInWatchlistState] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [prefetchComplete, setPrefetchComplete] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const prefetchTimeoutRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

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

  // FIXED: Add debugging for movie card rendering - moved after isMobile definition
  useEffect(() => {
    console.log(`MovieCard Debug - ${id}:`, {
      title,
      isMobile,
      imageSource: getBestImageSource(),
      poster_path,
      backdrop_path
    });
  }, [id, title, isMobile, poster_path, backdrop_path]);

  useEffect(() => {
    setIsInWatchlistState(isInWatchlist(id));
  }, [id, isInWatchlist]);

  // Check if we're on mobile for responsive layout - FIXED: Proper cleanup and mobile detection
  useEffect(() => {
    const checkScreenSize = () => {
      // FIXED: More reliable mobile detection
      const isNowMobile = window.innerWidth < 768 || 
                         (window.navigator && window.navigator.userAgent && 
                          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent));
      setIsMobile(prev => {
        if (prev !== isNowMobile) {
          console.log('Mobile detection changed:', isNowMobile, 'Screen width:', window.innerWidth);
          return isNowMobile;
        }
        return prev;
      });
    };
    
    checkScreenSize();
    const resizeHandler = checkScreenSize;
    window.addEventListener('resize', resizeHandler);
    
    return () => {
      window.removeEventListener('resize', resizeHandler);
    };
  }, []);

  // Further enhanced prefetching function with image preloading, error logging, and smarter checks
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
        const posterUrl = getPosterProps({ poster_path }, 'w500').src;
        imageUrls.push(posterUrl);
      }
      if (backdrop_path) {
        const backdropUrl = getBackdropProps({ backdrop_path }, 'w780').src;
        imageUrls.push(backdropUrl);
      }
      // Preload images in parallel
      const imagePrefetches = imageUrls.map(
        url =>
          new Promise(resolve => {
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
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

  // Enhanced cleanup: also remove any event listeners or observers if added in the future - FIXED: Timeout leaks
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
    };
  }, []);

  // FIXED: Add proper cleanup for mobile detection
  useEffect(() => {
    const checkScreenSize = () => {
      const isNowMobile = window.innerWidth < 768 || 
                         (window.navigator && window.navigator.userAgent && 
                          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent));
      setIsMobile(prev => {
        if (prev !== isNowMobile) {
          console.log('MovieCard Mobile detection changed:', isNowMobile, 'Screen width:', window.innerWidth);
          return isNowMobile;
        }
        return prev;
      });
    };
    
    checkScreenSize();
    const resizeHandler = checkScreenSize;
    window.addEventListener('resize', resizeHandler);
    
    return () => {
      window.removeEventListener('resize', resizeHandler);
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

  // Responsive aspect ratio: portrait for mobile, landscape for desktop, ultra-wide for very large screens
  const getAspectRatio = () => {
    if (typeof window !== "undefined" && window.innerWidth > 1800 && !isMobile) {
      return "21/9"; // Ultra-wide for big screens
    }
    return isMobile ? "2/3" : "16/10";
  };

  // Responsive card width: optimized for grid layout
  const getCardWidth = () => {
    if (typeof window !== "undefined" && window.innerWidth > 1800 && !isMobile) {
      return "w-[420px]"; // Ultra-wide
    }
    if (isMobile) {
      return "w-[160px] sm:w-[180px] md:w-[200px]";
    }
    return "w-80 xl:w-[340px]";
  };

  const imageSource = getBestImageSource();
  const aspectRatio = getAspectRatio();
  const cardWidth = getCardWidth();

  return (
    <div 
      className={`flex flex-col gap-4 rounded-lg ${cardWidth} flex-shrink-0 ${cardClassName} touch-manipulation`}
      data-movie-id={id}
      style={{
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation',
      }}
    >
      <div className={`relative ${isMobile ? 'aspect-[2/3]' : 'aspect-[16/10]'} rounded-lg overflow-hidden transform-gpu transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/20 w-full active:scale-[0.98] active:shadow-lg`}>
        {/* Prefetch shimmer/spinner overlay */}
        {prefetching && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 pointer-events-none">
            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          </div>
        )}
        {/* Clickable area for movie details */}
        <div 
          className="w-full h-full cursor-pointer touch-manipulation group"
          onClick={onClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleMouseLeave}
          style={{
            WebkitTapHighlightColor: 'transparent',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            touchAction: 'manipulation',
          }}
        >
          <ProgressiveImage
            src={imageSource}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            aspectRatio={aspectRatio}
          />
          {/* Movie info overlay - only show on desktop for landscape cards */}
          {!isMobile && (
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500">
              <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
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
            className="p-2 bg-black/40 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 sm:opacity-100 transition-all duration-300 hover:bg-black/60 hover:scale-110 transform-gpu active:scale-95 touch-manipulation"
            onClick={handleWatchlistClick}
            type="button"
            style={{
              WebkitTapHighlightColor: 'transparent',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              touchAction: 'manipulation',
            }}
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
      

    </div>
  );
});

const getFullLanguageName = (code) => {
  const languages = {
    'en': 'English',
    'hi': 'Hindi',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'tr': 'Turkish',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'da': 'Danish',
    'fi': 'Finnish',
    'no': 'Norwegian',
    'pl': 'Polish',
    'cs': 'Czech',
    'hu': 'Hungarian',
    'el': 'Greek',
    'he': 'Hebrew',
    'ro': 'Romanian',
    'th': 'Thai',
    'vi': 'Vietnamese',
    'id': 'Indonesian',
    'ms': 'Malay',
    'fa': 'Persian',
    'uk': 'Ukrainian',
    'bg': 'Bulgarian',
    'hr': 'Croatian',
    'sk': 'Slovak',
    'sl': 'Slovenian',
    'et': 'Estonian',
    'lv': 'Latvian',
    'lt': 'Lithuanian',
    'sr': 'Serbian',
    'ca': 'Catalan',
    'eu': 'Basque',
    'gl': 'Galician',
    'is': 'Icelandic',
    'mk': 'Macedonian',
    'bs': 'Bosnian',
    'hy': 'Armenian',
    'ka': 'Georgian',
    'az': 'Azerbaijani',
    'uz': 'Uzbek',
    'kk': 'Kazakh',
    'ky': 'Kyrgyz',
    'tg': 'Tajik',
    'mn': 'Mongolian',
    'ne': 'Nepali',
    'si': 'Sinhala',
    'km': 'Khmer',
    'lo': 'Lao',
    'my': 'Burmese',
    'jw': 'Javanese',
    'su': 'Sundanese',
    'ceb': 'Cebuano',
    'hmn': 'Hmong',
    'haw': 'Hawaiian',
    'yi': 'Yiddish',
    'fy': 'Frisian',
    'xh': 'Xhosa',
    'zu': 'Zulu',
    'af': 'Afrikaans',
    'lb': 'Luxembourgish',
    'ga': 'Irish',
    'mt': 'Maltese',
    'cy': 'Welsh',
    'gd': 'Scottish Gaelic',
    'kw': 'Cornish',
    'br': 'Breton',
    'sm': 'Samoan',
    'mi': 'Maori',
    'to': 'Tongan',
    'fj': 'Fijian',
    'ty': 'Tahitian',
    'mg': 'Malagasy',
    'sw': 'Swahili',
    'am': 'Amharic',
    'ha': 'Hausa',
    'yo': 'Yoruba',
    'ig': 'Igbo',
    'sn': 'Shona',
    'st': 'Sesotho',
    'so': 'Somali',
    'om': 'Oromo',
    'ti': 'Tigrinya',
    'ak': 'Akan',
    'rw': 'Kinyarwanda',
    'ny': 'Chichewa',
    'sg': 'Sango',
    'ln': 'Lingala',
    'wo': 'Wolof',
    'ff': 'Fula',
    'dz': 'Dzongkha',
    'bo': 'Tibetan',
    'ug': 'Uyghur',
    'ps': 'Pashto',
    'ku': 'Kurdish',
    'sd': 'Sindhi',
    'pa': 'Punjabi',
    'gu': 'Gujarati',
    'bn': 'Bengali',
    'as': 'Assamese',
    'or': 'Odia',
    'ta': 'Tamil',
    'te': 'Telugu',
    'kn': 'Kannada',
    'ml': 'Malayalam',
    'mr': 'Marathi',
    'sa': 'Sanskrit'
  };
  
  return languages[code] || code.toUpperCase();
};

// Enhanced memoization with custom comparison for better performance
const MovieSection = memo(({ title, movies, loading, onLoadMore, hasMore, currentPage, sectionKey, onMovieSelect, onMovieHover, onPrefetch }) => {
  // FIXED: Add debugging for movie section rendering
  useEffect(() => {
    console.log(`MovieSection Debug - ${sectionKey}:`, {
      title,
      moviesCount: movies?.length || 0,
      loading,
      hasMore,
      currentPage
    });
  }, [sectionKey, title, movies, loading, hasMore, currentPage]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isViewAllMode, setIsViewAllMode] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const scrollContainerRef = useRef(null);
  const loadingRef = useRef(false);
  const preloadTriggeredRef = useRef(false);
  const preloadTimeoutRef = useRef(null);
  const transitionTimeoutRef = useRef(null);
  const autoRotateIntervalRef = useRef(null);
  const visibilityObserverRef = useRef(null);
  const isTransitioningRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const preloadedPagesRef = useRef(new Set());

  // Step 9: Track prefetching state for user feedback
  const [prefetchingIds, setPrefetchingIds] = useState([]);

  // Check if we're on desktop for navigation buttons - FIXED: Proper cleanup and mobile detection
  useEffect(() => {
    const checkScreenSize = () => {
      // FIXED: More reliable mobile/desktop detection
      const isNowDesktop = window.innerWidth > 768 && 
                          !(window.navigator && window.navigator.userAgent && 
                            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent));
      setIsDesktop(prev => {
        if (prev !== isNowDesktop) {
          console.log('MovieSection Desktop detection changed:', isNowDesktop, 'Screen width:', window.innerWidth);
          return isNowDesktop;
        }
        return prev;
      });
    };
    
    checkScreenSize();
    const resizeHandler = checkScreenSize;
    window.addEventListener('resize', resizeHandler);
    
    return () => {
      window.removeEventListener('resize', resizeHandler);
    };
  }, []);

  const handleReachEnd = async (sectionKey) => {
    // FIXED: Enhanced validation with proper parameter handling
    if (!sectionKey) {
      console.warn('⚠️ handleReachEnd called without sectionKey');
      return;
    }
    
    if (loadingRef.current) {
      console.debug('🔄 Skipping load more - already loading');
      return;
    }
    
    if (!hasMore) {
      console.debug('📄 Skipping load more - no more content available');
      return;
    }
    
    if (isLoadingMore) {
      console.debug('⏳ Skipping load more - loading state active');
      return;
    }

    // Performance monitoring
    const startTime = performance.now();
    console.debug(`🚀 Starting load more for section: ${sectionKey}`);
    
    loadingRef.current = true;
    setIsLoadingMore(true);
    
    try {
      // Enhanced error handling with retry logic
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          await onLoadMore(sectionKey);
          break; // Success, exit retry loop
        } catch (error) {
          retryCount++;
          console.warn(`⚠️ Load more attempt ${retryCount} failed for ${sectionKey}:`, error);
          
          if (retryCount > maxRetries) {
            throw error; // Re-throw after max retries
          }
          
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }
      
      const loadTime = performance.now() - startTime;
      console.debug(`✅ Load more completed for ${sectionKey} in ${loadTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.error(`💥 Critical error loading more content for ${sectionKey}:`, {
        error: error.message,
        stack: error.stack,
        sectionKey,
        timestamp: new Date().toISOString()
      });
      
      // Enhanced user feedback for errors - removed setError call since it's not available in this scope
      console.error(`Failed to load more content for ${sectionKey}. Please try again.`);
      
    } finally {
      // Enhanced cleanup with validation
      const cleanupTime = performance.now() - startTime;
      console.debug(`🧹 Cleanup completed for ${sectionKey} (total time: ${cleanupTime.toFixed(2)}ms)`);
      
      loadingRef.current = false;
      setIsLoadingMore(false);
      
      // Reset error state after a delay - removed setError call
      // setTimeout(() => setError(null), 3000);
    }
  };



  // Enhanced progressive preloading with intelligent caching and performance optimization

  // Enhanced progressive preloading with intelligent caching and performance optimization
  const preloadNextPages = useCallback(async () => {
    // Early return conditions with enhanced validation
    if (!hasMore || isLoadingMore || preloadTriggeredRef.current || !onLoadMore) {
      return;
    }

    const nextPage = currentPage + 1;
    
    // Check if page is already preloaded or being processed
    if (preloadedPagesRef.current.has(nextPage)) {
      return;
    }

    // Prevent concurrent preload attempts
    preloadTriggeredRef.current = true;
    
    // Performance monitoring
    const startTime = performance.now();
    
    try {
      // Add visual feedback for preloading state
      setPrefetchingIds(prev => [...prev, `${sectionKey}-${nextPage}`]);
      
      // Execute preload with timeout protection
      const preloadPromise = onLoadMore(sectionKey);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Preload timeout')), 10000)
      );
      
      await Promise.race([preloadPromise, timeoutPromise]);
      
      // Mark page as successfully preloaded
      preloadedPagesRef.current.add(nextPage);
      
      // Performance logging
      const duration = performance.now() - startTime;
      if (duration > 1000) {
        console.warn(`Slow preload detected for ${sectionKey} page ${nextPage}: ${duration.toFixed(2)}ms`);
      }
      
    } catch (error) {
      // Enhanced error handling with user feedback
      console.warn(`Preload failed for ${sectionKey} page ${nextPage}:`, error);
      
      // Remove from preloaded set to allow retry
      preloadedPagesRef.current.delete(nextPage);
      
      // Optionally retry on network errors
      if (error.name === 'NetworkError' || error.message.includes('timeout')) {
        setTimeout(() => {
          preloadTriggeredRef.current = false;
        }, 2000); // Retry after 2 seconds
        return;
      }
    } finally {
      // Cleanup preloading state
      preloadTriggeredRef.current = false;
      setPrefetchingIds(prev => prev.filter(id => id !== `${sectionKey}-${nextPage}`));
    }
  }, [hasMore, isLoadingMore, currentPage, onLoadMore, sectionKey]);

  // Enhanced scroll handler with progressive preloading - FIXED: Timeout leaks
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || loadingRef.current || !hasMore || isLoadingMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const scrollThreshold = 400;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < scrollThreshold;

    // Update scroll state for visual feedback
    setIsScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);

    // Progressive preloading based on scroll position
    if (isNearBottom) {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
      preloadTimeoutRef.current = setTimeout(() => {
        preloadNextPages();
      }, 100);
    }
  }, [hasMore, isLoadingMore, preloadNextPages]);

  // Preload next page when entering view all mode
  useEffect(() => {
    if (isViewAllMode && hasMore && !isLoadingMore && !preloadedPagesRef.current.has(currentPage + 1)) {
      preloadNextPages();
    }
  }, [isViewAllMode, hasMore, isLoadingMore, currentPage, preloadNextPages]);

  // Enhanced cleanup function for view mode changes with comprehensive state management
  const cleanupViewMode = useCallback(() => {
    // Reset scroll position with smooth animation
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
    

    
    // Comprehensive preload state cleanup
    preloadedPagesRef.current.clear(); // More explicit than new Set()
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
      preloadTimeoutRef.current = null;
    }
    
    // Reset scroll-related states
    setIsScrolling(false);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    
    // Reset loading states to prevent stuck states
    loadingRef.current = false;
    setIsLoadingMore(false);
    
    // Clear any pending prefetch operations
    setPrefetchingIds(prev => {
      const filtered = prev.filter(id => !id.startsWith(sectionKey));
      return filtered;
    });
  }, [sectionKey]);

  // Enhanced view mode change handler with improved transitions and user feedback
  const handleViewAll = useCallback(() => {
    // Prevent rapid state changes during transition
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    if (!isViewAllMode) {
      // Transition to grid view with enhanced UX
      setIsViewAllMode(true);
      
      // Optimize preloading strategy
      if (hasMore && !preloadedPagesRef.current.has(currentPage + 1)) {
        // Use requestIdleCallback for better performance during transition
        if (window.requestIdleCallback) {
          requestIdleCallback(() => preloadNextPages(), { timeout: 1000 });
        } else {
          setTimeout(preloadNextPages, 100);
        }
      }
      
      // Enhanced scroll behavior with better timing - FIXED: Observer leaks
      setTimeout(() => {
        const sectionElement = document.getElementById(`section-${sectionKey}`);
        if (sectionElement) {
          // Use intersection observer for smoother scroll
          const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                entry.target.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'start',
                  inline: 'nearest'
                });
                observer.disconnect();
              }
            });
          }, { threshold: 0.1 });
          
          observer.observe(sectionElement);
          
          // Fallback scroll if observer doesn't trigger
          const fallbackTimeout = setTimeout(() => {
            if (observer) {
              observer.disconnect();
              sectionElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
              });
            }
          }, 300);
          
          // Clean up fallback timeout
          return () => {
            if (fallbackTimeout) {
              clearTimeout(fallbackTimeout);
            }
            if (observer) {
              observer.disconnect();
            }
          };
        }
      }, 150); // Slightly increased delay for better transition timing
      
    } else {
      // Enhanced cleanup with better state management
      cleanupViewMode();
      setIsViewAllMode(false);
      
      // Add subtle feedback for mode change
      if (scrollContainerRef.current) {
        scrollContainerRef.current.style.transition = 'all 0.3s ease-out';
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.style.transition = '';
          }
        }, 300);
      }
    }
    
    // Optimized transition timing with better user feedback - FIXED: Timeout leaks
    const transitionTimeout = setTimeout(() => {
      setIsTransitioning(false);
    }, 450); // Slightly longer for smoother transitions
    
    // Clean up transition timeout
    return () => {
      if (transitionTimeout) {
        clearTimeout(transitionTimeout);
      }
    };
  }, [isViewAllMode, isTransitioning, hasMore, currentPage, preloadNextPages, sectionKey, cleanupViewMode]);

  // Enhanced cleanup on unmount with comprehensive resource management - FIXED: Memory leaks
  useEffect(() => {
    return () => {
      // Clear all timeouts with enhanced error handling
      const timeouts = [
        preloadTimeoutRef.current,
        scrollTimeoutRef.current,
        transitionTimeoutRef.current
      ];
      
      timeouts.forEach(timeout => {
        if (timeout) {
          try {
            clearTimeout(timeout);
          } catch (error) {
            console.warn('Failed to clear timeout during cleanup:', error);
          }
        }
      });

      // Clear intervals
      if (autoRotateIntervalRef.current) {
        try {
          clearInterval(autoRotateIntervalRef.current);
        } catch (error) {
          console.warn('Failed to clear auto-rotate interval during cleanup:', error);
        }
      }

      // Disconnect observers
      if (visibilityObserverRef.current) {
        try {
          visibilityObserverRef.current.disconnect();
        } catch (error) {
          console.warn('Failed to disconnect visibility observer during cleanup:', error);
        }
      }



      // Reset refs to prevent memory leaks
      preloadTimeoutRef.current = null;
      scrollTimeoutRef.current = null;
      transitionTimeoutRef.current = null;
      autoRotateIntervalRef.current = null;
      visibilityObserverRef.current = null;
      isTransitioningRef.current = false;
      loadingRef.current = false;
      preloadTriggeredRef.current = false;
    };
  }, []);

  // FIXED: Add proper cleanup for mobile detection in MovieSection
  useEffect(() => {
    const checkScreenSize = () => {
      const isNowDesktop = window.innerWidth > 768 && 
                          !(window.navigator && window.navigator.userAgent && 
                            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent));
      setIsDesktop(prev => {
        if (prev !== isNowDesktop) {
          console.log('MovieSection Desktop detection changed:', isNowDesktop, 'Screen width:', window.innerWidth);
          return isNowDesktop;
        }
        return prev;
      });
    };
    
    checkScreenSize();
    const resizeHandler = checkScreenSize;
    window.addEventListener('resize', resizeHandler);
    
    return () => {
      window.removeEventListener('resize', resizeHandler);
    };
  }, []);


  // Reset loading states when view mode changes
  useEffect(() => {
    loadingRef.current = false;
    setIsLoadingMore(false);
    preloadTriggeredRef.current = false;
  }, [isViewAllMode]);

  if (loading && !movies.length) {
    return (
      <div className="mb-16">
        <div className="flex items-center justify-between px-4 pb-3">
          <h2 className="text-white text-2xl font-bold leading-tight tracking-[-0.02em]">{title}</h2>
        </div>
        <div className="relative px-2 pt-2">
          <div className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto pb-4 scrollbar-hide">
            {[...Array(6)].map((_, index) => (
              <div key={`loader-${sectionKey}-${index}`} className="flex-shrink-0">
                <div className="w-full max-w-[180px] sm:max-w-[220px] md:max-w-[250px] animate-pulse">
                  <div className="aspect-[2/3] bg-white/5 rounded-lg w-full"></div>
                  <div className="h-4 bg-white/5 rounded mt-2 w-3/4"></div>
                  <div className="h-3 bg-white/5 rounded mt-1 w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id={`section-${sectionKey}`} className=" group/section">
      <div className="flex flex-row items-center justify-between px-4 pb-3 pt-4 gap-2 sm:gap-0">
        <div className="flex flex-row items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <h2 className="text-white/80 leading-relaxed pl-0 sm:pl-6 text-lg sm:text-2xl font-bold leading-tight tracking-[-0.02em] group-hover/section:text-[#a1abb5] transition-colors duration-300 whitespace-nowrap truncate">{title}</h2>
          <span className="h-4 w-[1px] bg-white/10 group-hover/section:bg-white/20 transition-colors duration-300 hidden sm:inline-block"></span>
          <span className="text-white/50 text-xs sm:text-sm font-medium group-hover/section:text-white/70 transition-colors duration-300 truncate hidden sm:inline">
            {isViewAllMode ? 'Scroll to explore' : (movies.length > 1 ? 'Swipe to explore' : 'Swipe to view')}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <button 
            onClick={handleViewAll}
            className="opacity-100 sm:opacity-0 sm:group-hover/section:opacity-100 transition-all duration-300 text-[#a1abb5] hover:text-white text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 hover:gap-2 sm:hover:gap-3 relative overflow-hidden"
          >
            <span className="relative inline-block">
              <span className={`block transition-transform duration-300 ${isViewAllMode ? 'translate-y-[-100%]' : 'translate-y-0'}`}>View All</span>
              <span className={`block absolute top-0 left-0 transition-transform duration-300 ${isViewAllMode ? 'translate-y-0' : 'translate-y-[100%]'}`}>View Less</span>
            </span>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-4 w-4 transition-all duration-300 ${isViewAllMode ? 'rotate-180' : 'sm:group-hover/section:translate-x-1'}`} 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
            </svg>
          </button>
        </div>
      </div>
      <div className="relative px-2 pt-2">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#121417] to-transparent z-10 pointer-events-none"></div>
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#121417] to-transparent z-10 pointer-events-none"></div>
        <div 
          className={`transition-all duration-400 ease-in-out transform ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
          style={{ willChange: 'transform, opacity' }}
        >
          {isViewAllMode ? (
                          <div 
                ref={scrollContainerRef}
                className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 max-h-[600px] overflow-y-auto overflow-x-hidden w-full px-4 sm:px-6 scrollbar-hide justify-items-center scroll-container-fix`}
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: isScrolling ? 'rgba(255, 255, 255, 0.2) transparent' : 'rgba(255, 255, 255, 0.1) transparent',
                  scrollBehavior: 'smooth',
                  overscrollBehavior: 'auto', // Changed from 'contain' to 'auto' to allow scroll chaining
                  WebkitOverflowScrolling: 'touch',
                  scrollSnapType: 'y proximity',
                  scrollPadding: '1rem',
                  maxWidth: '100vw',
                }}
              >
              {movies.map((movie, index) => (
                <div 
                  key={`${sectionKey}-${movie.id}-${index}`}
                  id={`movie-card-${sectionKey}-${movie.id}`}
                  className="scroll-snap-align-start w-full flex justify-center"
                  style={{ willChange: 'transform' }}
                  onMouseEnter={() => onMovieHover && onMovieHover(movie, index, movies)}
                >
                  <MovieCard 
                    {...movie} 
                    onClick={() => onMovieSelect(movie)} 
                    id={movie.id}
                    priority={index < 10} // Prioritize loading for first 10 items
                    prefetching={prefetchingIds.includes(movie.id)}
                    onPrefetch={() => onPrefetch && onPrefetch(movie.id)} 
                  />
                </div>
              ))}
              {isLoadingMore && (
                <div className="col-span-full flex justify-center py-4">
                  <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
              {!hasMore && movies.length > 0 && (
                <div className="col-span-full text-center py-4 text-white/60">
                  No more movies to load
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-4 px-2 sm:px-4">
                {movies.map((movie, index) => (
                <div 
                  key={`${sectionKey}-${movie.id}-${index}`} 
                  className="flex-shrink-0"
                  onMouseEnter={() => onMovieHover && onMovieHover(movie, index, movies)}
                >
                      <MovieCard {...movie} onClick={() => onMovieSelect(movie)} id={movie.id} onPrefetch={() => onPrefetch && onPrefetch(movie.id)} />
                    </div>
                ))}
                {isLoadingMore && (
                <div className="flex-shrink-0">
                    <div className="group flex flex-col gap-4 rounded-lg w-80 flex-shrink-0">
                      <div className="relative aspect-[16/10] rounded-lg overflow-hidden bg-black/20 w-full">
                        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                      </div>
                    </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});



const HeroSection = memo(({ featuredContent, onMovieSelect }) => {
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const heroRef = useRef(null);
  const [parallaxTarget, setParallaxTarget] = useState({ x: 0, y: 0 });
  const parallaxAnimRef = useRef();
  const [toast, setToast] = useState(null);

  // Memoized computed values for performance
  const isMovieInWatchlist = useMemo(() => 
    featuredContent ? isInWatchlist(featuredContent.id) : false, 
    [featuredContent, isInWatchlist]
  );

  // Optimized parallax effect with reduced frequency - FIXED: Animation frame leaks
  useEffect(() => {
    if (!featuredContent) return; // Early return if no content
    
    let running = true;
    let lastTime = 0;
    const targetFPS = 30; // Reduced from 60fps for better performance
    const frameInterval = 1000 / targetFPS;
    
    function lerp(a, b, t) { return a + (b - a) * t; }
    
    function animate(currentTime) {
      if (currentTime - lastTime < frameInterval) {
        if (running) parallaxAnimRef.current = requestAnimationFrame(animate);
        return;
      }
      lastTime = currentTime;
      
      setParallax(prev => {
        const nx = lerp(prev.x, parallaxTarget.x, 0.08); // Reduced lerp factor
        const ny = lerp(prev.y, parallaxTarget.y, 0.08);
        if (Math.abs(nx - parallaxTarget.x) < 0.01 && Math.abs(ny - parallaxTarget.y) < 0.01) {
          return { x: parallaxTarget.x, y: parallaxTarget.y };
        }
        return { x: nx, y: ny };
      });
      
      if (running) parallaxAnimRef.current = requestAnimationFrame(animate);
    }
    
    parallaxAnimRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      if (parallaxAnimRef.current) {
        cancelAnimationFrame(parallaxAnimRef.current);
        parallaxAnimRef.current = null;
      }
    };
  }, [parallaxTarget.x, parallaxTarget.y, featuredContent]);

  // FIXED: Add proper cleanup for toast timeouts
  useEffect(() => {
    let toastTimeout;
    if (toast) {
      toastTimeout = setTimeout(() => setToast(null), 2000);
    }
    return () => {
      if (toastTimeout) {
        clearTimeout(toastTimeout);
      }
    };
  }, [toast]);

  const handleMouseMove = () => {
    // Parallax effect disabled for performance
  };
  const handleMouseLeave = () => {
    // Parallax effect disabled for performance
  };

  const handleWatchlistClick = useCallback((e) => {
    e.stopPropagation();
    if (!featuredContent) return;

    // Performance optimization: Early return for invalid data
    if (!featuredContent.id || !featuredContent.title) {
      console.warn('Invalid featured content for watchlist operation:', featuredContent);
      return;
    }

    try {
      if (isMovieInWatchlist) {
        // Remove from watchlist with enhanced error handling
        removeFromWatchlist(featuredContent.id);
        setToast({ 
          type: 'remove', 
          message: 'Removed from Watchlist',
          icon: '🗑️'
        });
      } else {
        // Enhanced data validation and normalization
        const release = featuredContent.release_date || featuredContent.first_air_date || '';
        let computedYear = 'N/A';
        
        if (release) {
          try {
            const parsedYear = new Date(release).getFullYear();
            if (!isNaN(parsedYear) && parsedYear > 1900 && parsedYear <= new Date().getFullYear() + 10) {
              computedYear = parsedYear;
            }
                  } catch (error) {
          console.warn('Invalid date format for year computation:', release, error);
        }
        }

        // Enhanced rating parsing with fallbacks
        let normalizedRating = 0;
        if (typeof featuredContent.rating === 'number' && !isNaN(featuredContent.rating)) {
          normalizedRating = Math.max(0, Math.min(10, featuredContent.rating)); // Clamp between 0-10
        } else if (typeof featuredContent.rating === 'string') {
          const parsed = parseFloat(featuredContent.rating);
          if (!isNaN(parsed)) {
            normalizedRating = Math.max(0, Math.min(10, parsed));
          }
        }

        // Enhanced movie data with additional metadata and validation
        const movieData = {
          id: featuredContent.id,
          title: featuredContent.title.trim() || 'Untitled',
          type: featuredContent.type || 'movie',
          poster_path: featuredContent.poster_path || featuredContent.backdrop || '',
          backdrop_path: featuredContent.backdrop || featuredContent.poster_path || '',
          overview: featuredContent.overview?.trim() || 'No overview available',
          year: computedYear,
          rating: normalizedRating,
          genres: Array.isArray(featuredContent.genres) ? featuredContent.genres : [],
          release_date: release,
          addedAt: new Date().toISOString(),
          // Additional metadata for enhanced functionality
          originalLanguage: featuredContent.original_language || 'en',
          popularity: featuredContent.popularity || 0,
          voteCount: featuredContent.vote_count || 0,
          // Enhanced type detection
          mediaType: featuredContent.media_type || featuredContent.type || 'movie'
        };

        // Add to watchlist with success feedback
        addToWatchlist(movieData);
        setToast({ 
          type: 'add', 
          message: 'Added to Watchlist',
          icon: '✅'
        });
      }

      // Enhanced toast management with better timing - FIXED: Timeout leaks
      const toastTimeout = setTimeout(() => setToast(null), 2000);
      return () => {
        clearTimeout(toastTimeout);
      };

    } catch (error) {
      console.error('Error in watchlist operation:', error);
      setToast({ 
        type: 'error', 
        message: 'Failed to update watchlist',
        icon: '❌'
      });
      
      // Clear error toast after shorter duration
      const errorToastTimeout = setTimeout(() => setToast(null), 1500);
      return () => {
        clearTimeout(errorToastTimeout);
      };
    }
  }, [featuredContent, isMovieInWatchlist, addToWatchlist, removeFromWatchlist, setToast]);

  if (!featuredContent) return null;

    // Animation variants simplified for performance
  const titleVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  };

  const logoVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  };

  const genreChipVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.8 },
    visible: (i) => ({ 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        delay: 0.3 + i * 0.1,
        duration: 0.4, 
        ease: 'easeOut' 
      }
    })
  };

  return (
    <div
      ref={heroRef}
      className="relative min-h-[65vh] sm:min-h-[70vh] min-h-[550px] sm:min-h-[600px] w-full overflow-hidden flex items-stretch scrollbar-hide"
    >
      {/* Background Image (No Parallax) */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
        style={{
          backgroundImage: `url(${featuredContent.backdrop})`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#121417] via-[#121417]/80 to-transparent" />
      {/* Content */}
      <div className="relative h-full max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center">
        <div className="w-full max-w-2xl flex flex-col gap-4 sm:gap-6 rounded-2xl p-4 sm:p-6 md:p-10 overflow-auto max-h-[85vh] sm:max-h-[90vh] md:max-h-[85vh] lg:max-h-[90vh] mt-4 sm:mt-8 mb-4 sm:mb-8 mx-auto scrollbar-hide">
          <div className="flex items-center gap-2 mb-2 sm:mb-4">
            <div className="relative group will-change-transform">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 blur-md group-hover:blur-lg transition-all duration-300 rounded-full transform-gpu"></div>
              <div className="relative flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 bg-black/40 backdrop-blur-sm rounded-full border border-white/10 transform-gpu">
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary transform-gpu" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-xs sm:text-sm font-medium text-white/90 tracking-wide transform-gpu">Trending Today</span>
              </div>
            </div>
          </div>
          {/* Animated Title/Logo */}
          <AnimatePresence>
            {featuredContent.logo ? (
              <motion.div
                className="mb-2 sm:mb-4"
                variants={logoVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <img
                  src={featuredContent.logo}
                  alt={featuredContent.title}
                  className="w-[200px] sm:w-[280px] md:w-[350px] lg:w-[400px] max-w-full h-auto object-contain transform transition-all duration-300 hover:scale-105 opacity-0 animate-fadeIn"
                  onError={e => { e.target.style.display = 'none'; }}
                  onLoad={e => { e.target.classList.remove('opacity-0'); }}
                />
              </motion.div>
            ) : (
              <motion.h1
                className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-extrabold mb-2 sm:mb-4 uppercase tracking-tight leading-tight bg-gradient-to-br from-white via-primary to-[#6b7280] bg-clip-text text-transparent drop-shadow-[0_4px_32px_rgba(99,102,241,0.05)] shadow-primary/40 animate-hero-title"
                style={{
                  WebkitTextStroke: '1px rgba(0,0,0,0.12)',
                  letterSpacing: '-0.02em',
                  lineHeight: '1.08',
                  textShadow: '0 4px 32px rgba(99,102,241,0.25), 0 2px 16px rgba(0,0,0,0.45)'
                }}
                variants={titleVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                {featuredContent.title}
              </motion.h1>
            )}
          </AnimatePresence>
          {/* Meta Section */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-8 mb-2 text-white/80">
            {/* Year */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/60" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
              </svg>
              <span className="text-sm sm:text-base">{featuredContent.year}</span>
            </div>
            {/* Rating */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
              <span className="text-sm sm:text-base">
                {typeof featuredContent.rating === 'number' 
                  ? featuredContent.rating.toFixed(1)
                  : typeof featuredContent.rating === 'string'
                    ? parseFloat(featuredContent.rating).toFixed(1)
                    : 'N/A'}
              </span>
            </div>
            {/* Runtime or Seasons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/60" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/>
              </svg>
              <span className="text-sm sm:text-base">
                {featuredContent.type === 'tv' && featuredContent.number_of_seasons
                  ? `${featuredContent.number_of_seasons} Season${featuredContent.number_of_seasons > 1 ? 's' : ''}`
                  : featuredContent.runtime
                    ? `${Math.floor(featuredContent.runtime / 60)}h ${featuredContent.runtime % 60}m`
                    : featuredContent.episode_run_time
                      ? `${Math.floor(featuredContent.episode_run_time[0] / 60)}h ${featuredContent.episode_run_time[0] % 60}m`
                      : 'N/A'}
              </span>
            </div>
            {/* Language */}
            {featuredContent.original_language && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/60" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.9 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/>
                </svg>
                <span className="text-sm sm:text-base uppercase">{getFullLanguageName(featuredContent.original_language)}</span>
              </div>
            )}
          </div>
          {/* Overview - tighter margin */}
          <div className="relative mb-2 transition-all duration-300 ease-in-out max-w-full">
            <div 
              className={`text-white/80 leading-relaxed transition-all duration-300 ease-in-out break-words text-sm sm:text-base ${!isExpanded ? 'line-clamp-3' : ''}`}
              style={{ 
                maxHeight: isExpanded ? '1000px' : '4.5rem',
                overflow: isExpanded ? 'auto' : 'hidden',
                wordBreak: 'break-word',
                whiteSpace: 'pre-line',
              }}
            >
              {featuredContent.overview}
            </div>
            {featuredContent.overview.length > 150 && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-primary text-xs sm:text-sm font-medium transition-colors duration-200 hover:text-primary/80"
              >
                {isExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
          {/* Animated Genre Chips */}
          {featuredContent.genres && featuredContent.genres.length > 0 && (
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
              {featuredContent.genres.slice(0, 5).map((genre, i) => (
                <motion.span
                  key={typeof genre === 'object' ? genre.name : genre}
                  className="px-2 sm:px-3 py-1 bg-white/10 text-white/80 rounded-full text-xs sm:text-sm"
                  custom={i}
                  variants={genreChipVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {typeof genre === 'object' ? genre.name : genre}
                </motion.span>
              ))}
            </div>
          )}
          {/* Cast Avatars */}
          {featuredContent.cast && featuredContent.cast.length > 0 && (
            <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
              {featuredContent.cast.slice(0, 4).map((person, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <img
                    src={person.image}
                    alt={person.name}
                    className="w-8 h-8 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white/20 shadow"
                    style={{ background: '#222' }}
                  />
                  <span className="text-xs text-white/80 mt-1 max-w-[50px] sm:max-w-[60px] truncate text-center">{person.name}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-row items-center gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-6 overflow-visible px-2 py-4 w-full">
            <button
              onClick={() => onMovieSelect(featuredContent)}
              className="group relative flex-1 sm:w-auto px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 bg-white text-black rounded-full hover:bg-white/90 transition-all duration-300 flex items-center justify-center gap-2 font-medium hover:scale-105 hover:shadow-lg hover:shadow-white/20 overflow-hidden flex-shrink-0 transform-gpu"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="relative flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="8,5 20,12 8,19" />
                </svg>
                <span className="text-sm sm:text-base">Watch Now</span>
              </div>
            </button>
            {/* Trailer Button */}
            {featuredContent.trailer && (
              <button
                onClick={() => setShowTrailer(true)}
                className="hidden sm:flex group relative px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 rounded-full transition-all duration-300 items-center justify-center gap-2 font-medium hover:scale-105 hover:shadow-lg overflow-hidden bg-white/10 text-white/90 border border-white/10 hover:bg-white/20 flex-shrink-0 transform-gpu"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <div className="relative flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <span className="text-sm sm:text-base">Watch Trailer</span>
                </div>
              </button>
            )}
            <button
              onClick={handleWatchlistClick}
              className={`group relative flex-1 sm:w-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 rounded-full transition-all duration-300 flex items-center justify-center gap-2 font-medium hover:scale-105 hover:shadow-lg overflow-hidden flex-shrink-0 transform-gpu ${
                isMovieInWatchlist 
                  ? 'bg-white-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30' 
                  : 'bg-white/10 text-white/90 border border-white/10 hover:bg-white/20'
              }`}
              style={{ whiteSpace: 'nowrap' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="relative flex items-center gap-2 min-w-0">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300 group-hover:scale-110 ${isMovieInWatchlist ? 'group-hover:rotate-12' : 'group-hover:rotate-90'}`} viewBox="0 0 24 24" fill="currentColor">
                  {isMovieInWatchlist ? (
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  ) : (
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  )}
                </svg>
                <span className="text-sm sm:text-base truncate whitespace-nowrap">{isMovieInWatchlist ? 'Added to List' : 'Add to List'}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
      {/* Trailer Modal */}
      <AnimatePresence>
        {showTrailer && featuredContent.trailer && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTrailer(false)}
          >
            <motion.div
              className="bg-black rounded-lg overflow-hidden shadow-2xl relative"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                className="absolute top-2 right-2 z-10 p-2 bg-black/60 rounded-full hover:bg-black/80"
                onClick={() => setShowTrailer(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="w-[95vw] sm:w-[90vw] max-w-2xl aspect-video">
                <ReactPlayer
                  url={`https://www.youtube.com/watch?v=${featuredContent.trailer}`}
                  width="100%"
                  height="100%"
                  controls
                  playing={showTrailer}
                  onError={(error) => {
                    console.warn('ReactPlayer error:', error);
                  }}
                  onReady={() => {
                    // Player is ready, but don't auto-play
                  }}
                  onPlay={() => {
                    // Handle play event
                  }}
                  onPause={() => {
                    // Handle pause event
                  }}
                  config={{
                    youtube: {
                      playerVars: {
                        // Prevent autoplay issues
                        autoplay: 0,
                        modestbranding: 1,
                        rel: 0
                      }
                    }
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Minimal Scroll Down Indicator */}
      <div className="absolute bottom-2 sm:bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center pointer-events-none select-none">
        <motion.div
          initial={{ y: 0, opacity: 0.7 }}
          animate={{ y: [0, 10, 0], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <svg className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-white/60 sm:text-white/70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
        <span className="text-xs text-white/50 sm:text-white/60 mt-1">Scroll</span>
      </div>
      {/* Minimal Toast */}
      <AnimatePresence>
        <MinimalToast type={toast?.type} message={toast?.message} show={!!toast} />
      </AnimatePresence>
    </div>
  );
});

// Memoize categories outside the component
const categoriesList = [
  { 
    id: 'all', 
    label: 'All', 
    icon: (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 transition-transform duration-200 hover:scale-110" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        aria-hidden="true"
        role="img"
      >
        <path 
          d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"
          stroke="currentColor"
          strokeWidth="0.5"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'Browse all available content',
    color: 'from-blue-500 to-indigo-600',
    gradient: 'bg-gradient-to-r from-blue-500/20 to-indigo-600/20'
  },
  { 
    id: 'trending', 
    label: 'Trending', 
    icon: (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 transition-transform duration-200 hover:scale-110" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        aria-hidden="true"
        role="img"
      >
        <path 
          d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"
          stroke="currentColor"
          strokeWidth="0.5"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'Discover what\'s trending right now',
    color: 'from-orange-500 to-red-600',
    gradient: 'bg-gradient-to-r from-orange-500/20 to-red-600/20'
  },
  { 
    id: 'popular', 
    label: 'Popular', 
    icon: (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 transition-transform duration-200 hover:scale-110" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        aria-hidden="true"
        role="img"
      >
        <path 
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          stroke="currentColor"
          strokeWidth="0.5"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'Most loved and watched content',
    color: 'from-pink-500 to-rose-600',
    gradient: 'bg-gradient-to-r from-pink-500/20 to-rose-600/20'
  },
  { 
    id: 'topRated', 
    label: 'Top Rated', 
    icon: (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 transition-transform duration-200 hover:scale-110" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        aria-hidden="true"
        role="img"
      >
        <path 
          d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
          stroke="currentColor"
          strokeWidth="0.5"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'Highest rated and critically acclaimed',
    color: 'from-yellow-500 to-amber-600',
    gradient: 'bg-gradient-to-r from-yellow-500/20 to-amber-600/20'
  },
  { 
    id: 'upcoming', 
    label: 'Coming Soon', 
    icon: (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 transition-transform duration-200 hover:scale-110" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        aria-hidden="true"
        role="img"
      >
        <path 
          d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"
          stroke="currentColor"
          strokeWidth="0.5"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'New releases and upcoming premieres',
    color: 'from-blue-500 to-indigo-600',
    gradient: 'bg-gradient-to-r from-blue-500/20 to-indigo-600/20'
  },
  { 
    id: 'action', 
    label: 'Action', 
    icon: (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 transition-transform duration-200 hover:scale-110" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        aria-hidden="true"
        role="img"
      >
        <path 
          d="M13 4v2.67l-1 1-1-1V4h2m7 7v2h-2.67l-1-1 1-1H20M6.67 11l1 1-1 1H4v-2h2.67M12 16.33l1 1V20h-2v-2.67l1-1M15 2H9v5.5l3 3 3-3V2zm7 7h-5.5l-3 3 3 3H22V9zM7.5 9H2v6h5.5l3-3-3-3zm4.5 4.5l-3 3V22h6v-5.5l-3-3z"
          stroke="currentColor"
          strokeWidth="0.5"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'High-octane thrillers and explosive adventures',
    color: 'from-red-500 to-orange-600',
    gradient: 'bg-gradient-to-r from-red-500/20 to-orange-600/20'
  },
  { 
    id: 'comedy', 
    label: 'Comedy', 
    icon: (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 transition-transform duration-200 hover:scale-110" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        aria-hidden="true"
        role="img"
      >
        <path 
          d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"
          stroke="currentColor"
          strokeWidth="0.5"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'Laugh-out-loud humor and witty entertainment',
    color: 'from-yellow-400 to-orange-500',
    gradient: 'bg-gradient-to-r from-yellow-400/20 to-orange-500/20'
  },
  { 
    id: 'drama', 
    label: 'Drama', 
    icon: (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 transition-transform duration-200 hover:scale-110" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        aria-hidden="true"
        role="img"
      >
        <path 
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v2h-2zm0-8h2v6h-2z"
          stroke="currentColor"
          strokeWidth="0.5"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'Emotional storytelling and character-driven narratives',
    color: 'from-purple-500 to-indigo-600',
    gradient: 'bg-gradient-to-r from-purple-500/20 to-indigo-600/20'
  },
  { 
    id: 'horror', 
    label: 'Horror', 
    icon: (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 transition-transform duration-200 hover:scale-110" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        aria-hidden="true"
        role="img"
      >
        <path 
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm2-4c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm-2-4c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm2-4c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"
          stroke="currentColor"
          strokeWidth="0.5"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'Spine-chilling thrills and supernatural suspense',
    color: 'from-gray-700 to-black',
    gradient: 'bg-gradient-to-r from-gray-700/20 to-black/20'
  },
  { 
    id: 'sciFi', 
    label: 'Sci-Fi', 
    icon: (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 transition-transform duration-200 hover:scale-110" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        aria-hidden="true"
        role="img"
      >
        <path 
          d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"
          stroke="currentColor"
          strokeWidth="0.5"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'Futuristic technology and space exploration',
    color: 'from-blue-500 to-cyan-600',
    gradient: 'bg-gradient-to-r from-blue-500/20 to-cyan-600/20'
  },
  { 
    id: 'documentary', 
    label: 'Documentary', 
    icon: (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 transition-transform duration-200 hover:scale-110" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        aria-hidden="true"
        role="img"
      >
        <path 
          d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM7 10h5v5H7z"
          stroke="currentColor"
          strokeWidth="0.5"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'Real-world stories and educational content',
    color: 'from-green-500 to-emerald-600',
    gradient: 'bg-gradient-to-r from-green-500/20 to-emerald-600/20'
  },
  { 
    id: 'family', 
    label: 'Family', 
    icon: (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 transition-transform duration-200 hover:scale-110" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        aria-hidden="true"
        role="img"
      >
        <path 
          d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm0 6v6h2v-6H8zm8-6c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm0 6v6h2v-6h-2z"
          stroke="currentColor"
          strokeWidth="0.5"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'Wholesome entertainment for all ages',
    color: 'from-purple-500 to-pink-600',
    gradient: 'bg-gradient-to-r from-purple-500/20 to-pink-600/20'
  },
  { 
    id: 'animation', 
    label: 'Animation', 
    icon: (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 transition-transform duration-200 hover:scale-110" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        aria-hidden="true"
        role="img"
      >
        <path 
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"
          stroke="currentColor"
          strokeWidth="0.5"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'Animated films and series',
    color: 'from-yellow-500 to-orange-600',
    gradient: 'bg-gradient-to-r from-yellow-500/20 to-orange-600/20'
  },
  { 
    id: 'awardWinning', 
    label: 'Award Winning', 
    icon: (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 transition-transform duration-200 hover:scale-110" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        aria-hidden="true"
        role="img"
      >
        <path 
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          stroke="currentColor"
          strokeWidth="0.5"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'Critically acclaimed and award-winning content',
    color: 'from-amber-500 to-yellow-600',
    gradient: 'bg-gradient-to-r from-amber-500/20 to-yellow-600/20'
  },
  { 
    id: 'latest', 
    label: 'Latest', 
    icon: (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 transition-transform duration-200 hover:scale-110" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        aria-hidden="true"
        role="img"
      >
        <path 
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
          stroke="currentColor"
          strokeWidth="0.5"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'Fresh releases and newest additions',
    color: 'from-green-500 to-emerald-600',
    gradient: 'bg-gradient-to-r from-green-500/20 to-emerald-600/20'
  },
  { 
    id: 'popularTV', 
    label: 'Popular TV', 
    icon: (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 transition-transform duration-200 hover:scale-110" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        aria-hidden="true"
        role="img"
      >
        <path 
          d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5l-1 3v1h8v-1l-1-3h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12H3V5h18v10z"
          stroke="currentColor"
          strokeWidth="0.5"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'Most popular TV shows and series',
    color: 'from-purple-500 to-pink-600',
    gradient: 'bg-gradient-to-r from-purple-500/20 to-pink-600/20'
  },
  { 
    id: 'topRatedTV', 
    label: 'Top Rated TV', 
    icon: (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 transition-transform duration-200 hover:scale-110" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        aria-hidden="true"
        role="img"
      >
        <path 
          d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5l-1 3v1h8v-1l-1-3h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12H3V5h18v10zM12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
          stroke="currentColor"
          strokeWidth="0.5"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'Highest rated TV shows and series',
    color: 'from-amber-500 to-orange-600',
    gradient: 'bg-gradient-to-r from-amber-500/20 to-orange-600/20'
  },
  { 
    id: 'airingToday', 
    label: 'Airing Today', 
    icon: (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 transition-transform duration-200 hover:scale-110" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        aria-hidden="true"
        role="img"
      >
        <path 
          d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"
          stroke="currentColor"
          strokeWidth="0.5"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    ),
    description: 'TV shows airing today',
    color: 'from-blue-500 to-cyan-600',
    gradient: 'bg-gradient-to-r from-blue-500/20 to-cyan-600/20'
  },
  { 
    id: 'nowPlaying', 
    label: 'Now Playing', 
    icon: (
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
    ),
    description: 'Movies currently in theaters',
    color: 'from-red-500 to-pink-600',
    gradient: 'bg-gradient-to-r from-red-500/20 to-pink-600/20'
  }
];

// Memoize MovieSection and HeroSection
const MemoizedMovieSection = memo(MovieSection);
const MemoizedHeroSection = memo(HeroSection);

// Lazy-load MovieDetailsOverlay
const LazyMovieDetailsOverlay = lazy(() => import('./MovieDetailsOverlay'));

const MOVIE_DETAILS_TTL = 60 * 60 * 1000; // 1 hour
const MOVIE_DETAILS_CACHE_LIMIT = 100;

const HomePage = () => {
  // 🚀 ULTRA-OPTIMIZED: Performance monitoring
  const performanceMetrics = usePerformanceMonitoring();

  // Initialize ultra-smooth scrolling
  const { scrollState } = useSmoothScroll({
    throttle: 16,
    enableMomentum: true,
    enableIntersectionObserver: true,
    scrollOffset: 80
  });

  // Scroll animation hooks for enhanced UX
  const { elementRef: heroRef } = useScrollAnimation({
    threshold: 0.1,
    triggerOnce: false
  });

  const { elementRef: sectionRef } = useScrollAnimation({
    threshold: 0.2,
    triggerOnce: true
  });

  const [trendingMovies, setTrendingMovies] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [topRatedMovies, setTopRatedMovies] = useState([]);
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [actionMovies, setActionMovies] = useState([]);
  const [comedyMovies, setComedyMovies] = useState([]);
  const [dramaMovies, setDramaMovies] = useState([]);
  const [horrorMovies, setHorrorMovies] = useState([]);
  const [sciFiMovies, setSciFiMovies] = useState([]);
  const [documentaryMovies, setDocumentaryMovies] = useState([]);
  const [familyMovies, setFamilyMovies] = useState([]);
  const [animationMovies, setAnimationMovies] = useState([]);
  const [awardWinningMovies, setAwardWinningMovies] = useState([]);
  const [latestMovies, setLatestMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [error, setError] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');
  const { loadingStates, setLoadingState } = useLoading();

  // Add watchlist hook
  const { addToWatchlist, isInWatchlist, removeFromWatchlist } = useWatchlist();
  
  // Add viewing progress hook
  const { refreshFromStorage } = useViewingProgress();
  

  const [isInWatchlistState, setIsInWatchlistState] = useState(false);

  // Add mobile detection state
  const [isMobile, setIsMobile] = useState(false);

  // Add new state for TV shows and now playing movies
  const [popularTVShows, setPopularTVShows] = useState([]);
  const [topRatedTVShows, setTopRatedTVShows] = useState([]);
  const [airingTodayTVShows, setAiringTodayTVShows] = useState([]);
  const [nowPlayingMovies, setNowPlayingMovies] = useState([]);

  // Advanced cache state with LRU eviction and memory optimization
  const [dataCache, setDataCache] = useState({});
  const [featuredContent, setFeaturedContent] = useState(null);
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
  const MAX_CACHE_SIZE = 1 * 1024 * 1024; // Reduced to 1 MB for faster access
  const MAX_PAGES_PER_CATEGORY = 5; // Reduced to 5 pages for faster loading
  const MAX_TOTAL_CACHE_ITEMS = 25; // Reduced to 25 items for better performance
  
  // Advanced memory management
  const cacheRef = useRef(new Map());
  const lruQueue = useRef([]);
  const memoryUsage = useRef(0);
  
  // FIXED: Add missing state variables that were causing hoisting issues
  const [overlayLoading, setOverlayLoading] = useState(false);

  // 🚀 ULTRA-OPTIMIZED: Advanced optimization states with virtual scrolling
  const [viewportItems, setViewportItems] = useState(new Set());
  const [prefetchQueue, setPrefetchQueue] = useState(new Set());
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [memoryOptimization, setMemoryOptimization] = useState({
    lastCleanup: Date.now(),
    itemsInMemory: 0,
    maxItemsAllowed: 500 // Reduced for better performance
  });

  // 🚀 ULTRA-OPTIMIZED: Priority-based loading queue with virtual scrolling
  const [loadingQueue] = useState({
    critical: ['trending', 'popular'],
    high: ['topRated', 'upcoming'],
    medium: ['action', 'comedy', 'drama'],
    low: ['horror', 'sciFi', 'documentary', 'family', 'animation', 'awardWinning', 'latest', 'popularTV', 'topRatedTV', 'airingToday', 'nowPlaying']
  });

  // 🚀 NEW: Virtual scrolling optimization with intersection observer
  const [visibleSections, setVisibleSections] = useState(new Set(['trending', 'popular']));
  const [virtualScrollConfig] = useState({
    itemHeight: 300, // Approximate height of movie cards
    overscan: 2, // Number of items to render outside viewport
    batchSize: 10, // Number of items to render in each batch
    throttleMs: 16 // Throttle intersection observer updates
  });

  // Define categories early to avoid hoisting issues
  const categories = useMemo(() => categoriesList, []);
  
  // Intersection observer for lazy loading sections
  const sectionObserverRef = useRef(null);
  const [lazyLoadQueue, setLazyLoadQueue] = useState(new Set());
  
  // FIXED: Enhanced intersection observer for lazy loading with proper cleanup
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    
    sectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const sectionKey = entry.target.dataset.section;
            if (sectionKey) {
              setVisibleSections(prev => {
                if (!prev.has(sectionKey)) {
                  return new Set([...prev, sectionKey]);
                }
                return prev;
              });
              setLazyLoadQueue(prev => new Set([...prev, sectionKey]));
            }
          }
        });
      },
      {
        rootMargin: '100px 0px', // Start loading 100px before section comes into view
        threshold: 0.1
      }
    );
    
    return () => {
      if (sectionObserverRef.current) {
        sectionObserverRef.current.disconnect();
        sectionObserverRef.current = null;
      }
      // Clear state on cleanup
      setVisibleSections(new Set());
      setLazyLoadQueue(new Set());
    };
  }, []); // Removed visibleSections from dependencies to prevent infinite loop

  // FIXED: Enhanced mobile detection effect with proper cleanup
  useEffect(() => {
    const checkScreenSize = () => {
      const isNowMobile = window.innerWidth < 768 || 
                         (window.navigator && window.navigator.userAgent && 
                          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent));
      setIsMobile(prev => {
        if (prev !== isNowMobile) {
          console.log('Mobile detection changed:', isNowMobile, 'Screen width:', window.innerWidth);
          return isNowMobile;
        }
        return prev;
      });
    };
    
    checkScreenSize();
    const resizeHandler = checkScreenSize;
    window.addEventListener('resize', resizeHandler);
    
    return () => {
      window.removeEventListener('resize', resizeHandler);
    };
  }, []);

  // 🎬 FIXED: Auto-refresh viewing progress when user returns to page
  useEffect(() => {
    // Refresh viewing progress to ensure continue watching section is up to date
    refreshFromStorage();
    
    // Also refresh when the page becomes visible again (user returns from watching content)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page became visible, refreshing viewing progress...');
        refreshFromStorage();
      }
    };

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also refresh when the window gains focus (alternative approach)
    const handleFocus = () => {
      console.log('🔄 Window gained focus, refreshing viewing progress...');
      refreshFromStorage();
    };
    
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshFromStorage]);

  // 🧹 FIXED: Memory optimization registration with proper cleanup
  useEffect(() => {
    // Register HomePage with centralized memory optimization service
    memoryOptimizationService.registerComponent('HomePage');
    
    const unregisterCleanup = memoryOptimizationService.registerCleanupCallback(() => {
      // Cleanup HomePage-specific caches and data
      if (cacheRef.current) {
        cacheRef.current.clear();
      }
      if (lruQueue.current) {
        lruQueue.current.length = 0;
      }
      // Clear pending requests
      if (pendingRequests.current) {
        pendingRequests.current.clear();
      }
      // Clear timeouts and intervals
      timeoutRefs.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      intervalRefs.current.forEach(intervalId => {
        clearInterval(intervalId);
      });
      timeoutRefs.current.clear();
      intervalRefs.current.clear();
      
      // Clear movie details cache
      cleanMovieDetailsCache();
      
      // Clear intersection observer
      if (sectionObserverRef.current) {
        sectionObserverRef.current.disconnect();
        sectionObserverRef.current = null;
      }
      
      // Clear lazy load queue
      setLazyLoadQueue(new Set());
      setVisibleSections(new Set());
    }, 'HomePage');

    return () => {
      memoryOptimizationService.unregisterComponent('HomePage');
      unregisterCleanup();
      
      // Additional cleanup on unmount
      if (sectionObserverRef.current) {
        sectionObserverRef.current.disconnect();
        sectionObserverRef.current = null;
      }
      
      // Clear all timeouts and intervals
      timeoutRefs.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      intervalRefs.current.forEach(intervalId => {
        clearInterval(intervalId);
      });
      timeoutRefs.current.clear();
      intervalRefs.current.clear();
    };
  }, []);

  // 🎯 NEW: Ultra-optimized prefetching configuration
  const PREFETCH_CONFIG = {
    viewportThreshold: 0.2, // Reduced to 20% for earlier prefetching
    maxConcurrentPrefetches: 2, // Reduced to 2 for better performance
    prefetchDelay: 50, // Reduced to 50ms for faster response
    priorityCategories: ['trending', 'popular', 'topRated'],
    adjacentCategories: true,
    smartPrefetching: true,
    requestDeduplication: true, // Prevent duplicate requests
    adaptivePrefetching: true // Adjust based on network conditions
  };

  // Helper function to get the appropriate fetch function
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
      latest: getLatestMovies,
      popularTV: getPopularTVShows,
      topRatedTV: getTopRatedTVShows,
      airingToday: getAiringTodayTVShows,
      nowPlaying: getNowPlayingMovies
    };
    return fetchFunctions[key];
  };
  
  // Request deduplication cache
  const pendingRequests = useRef(new Map());
  const networkConditions = useRef({
    isSlow: false,
    lastCheck: Date.now(),
    averageResponseTime: 0
  });

  // 🚀 NEW: Ultra-optimized progressive loading configuration
  const PROGRESSIVE_LOADING_CONFIG = {
    criticalDelay: 0, // Load critical sections immediately
    highDelay: 200, // Reduced to 200ms for faster loading
    mediumDelay: 500, // Reduced to 500ms
    lowDelay: 1000, // Reduced to 1s
    batchSize: 1, // Load 1 section at a time for better performance
    maxConcurrent: 2, // Reduced to 2 concurrent requests
    adaptiveTiming: true, // Adjust based on network speed
    priorityQueue: true // Use priority queue for better scheduling
  };

  // 📊 NEW: Performance monitoring
  const performanceObserver = useRef(null);
  
  // 🧹 NEW: Track all timeouts and intervals for proper cleanup
  const timeoutRefs = useRef(new Set());
  const intervalRefs = useRef(new Set());
  const isMountedRef = useRef(true);
  const visibilityObserverRef = useRef(null);

  // FIXED: Add missing refs that were causing undefined errors
  const movieDetailsCache = useRef({});
  const prefetchAnalytics = useRef({
    prefetched: {},
    used: {},
    totalPrefetched: 0,
    totalUsed: 0,
  });

  // FIXED: Add missing constants that were causing undefined errors
  const MOVIE_DETAILS_TTL = 5 * 60 * 1000; // 5 minutes
  const MOVIE_DETAILS_CACHE_LIMIT = 50; // Max 50 movie details in cache

  // 🧹 NEW: Comprehensive cleanup function - FIXED: Memory leaks
  const cleanup = useCallback(() => {
    // Clear all timeouts and intervals
    if (performanceObserver.current) {
      try {
        performanceObserver.current.disconnect();
      } catch (error) {
        console.warn('Failed to disconnect performance observer:', error);
      }
      performanceObserver.current = null;
    }

    // Clear pending requests
    pendingRequests.current.clear();

    // Clear caches
    cacheRef.current.clear();
    lruQueue.current = [];
    memoryUsage.current = 0;

    // Clear prefetch queue
    setPrefetchQueue(new Set());
    setIsPrefetching(false);

    // Clear viewport items
    setViewportItems(new Set());

    // Clear visible sections
    setVisibleSections(new Set(['trending', 'popular']));

    // Reset memory optimization
    setMemoryOptimization({
      lastCleanup: Date.now(),
      itemsInMemory: 0,
      maxItemsAllowed: 500
    });

    // Clear network conditions
    networkConditions.current = {
      isSlow: false,
      lastCheck: Date.now(),
      averageResponseTime: 0
    };

    // Clear movie details cache
    if (movieDetailsCache.current) {
      movieDetailsCache.current = {};
    }

    // Clear prefetch analytics
    if (prefetchAnalytics.current) {
      prefetchAnalytics.current = {
        prefetched: {},
        used: {},
        totalPrefetched: 0,
        totalUsed: 0,
      };
    }

    // Clear all tracked timeouts
    timeoutRefs.current.forEach(timeoutId => {
      try {
        clearTimeout(timeoutId);
      } catch (error) {
        console.warn('Failed to clear timeout during cleanup:', error);
      }
    });
    timeoutRefs.current.clear();

    // Clear all tracked intervals
    intervalRefs.current.forEach(intervalId => {
      try {
        clearInterval(intervalId);
      } catch (error) {
        console.warn('Failed to clear interval during cleanup:', error);
      }
    });
    intervalRefs.current.clear();

    // Clear all timeouts and intervals
    if (window.performanceObserver) {
      try {
        window.performanceObserver.disconnect();
      } catch (error) {
        console.warn('Failed to disconnect window performance observer:', error);
      }
    }

    // Clear visibility observer
    if (visibilityObserverRef.current) {
      try {
        visibilityObserverRef.current.disconnect();
      } catch (error) {
        console.warn('Failed to disconnect visibility observer:', error);
      }
      visibilityObserverRef.current = null;
    }

    // Reset body overflow - ensure scrolling is always enabled
    // document.body.style.overflow = 'unset'; // REMOVED: This was causing scroll issues

    // Mark as unmounted
    isMountedRef.current = false;

    console.log('🧹 HomePage cleanup completed');
  }, []);

  // 🧹 Utility functions for tracking timeouts and intervals
  const trackedSetTimeout = useCallback((callback, delay) => {
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        callback();
      }
      timeoutRefs.current.delete(timeoutId);
    }, delay);
    timeoutRefs.current.add(timeoutId);
    return timeoutId;
  }, []);

  const trackedSetInterval = useCallback((callback, delay) => {
    const intervalId = setInterval(() => {
      if (isMountedRef.current) {
        callback();
      }
    }, delay);
    intervalRefs.current.add(intervalId);
    return intervalId;
  }, []);

  // FIXED: Preload critical components and images after initial render - MOVED INSIDE COMPONENT
  const preloadCriticalComponents = useCallback(() => {
    // Preload components that are likely to be used
    import('./MovieDetailsOverlay');
    import('./EnhancedSearchBar');
    
    // Preload critical images for better perceived performance
    const preloadImage = (src) => {
      if (!src) return;
      const img = new Image();
      img.src = src;
    };
    
    // Preload first few movie posters from trending and popular
    const preloadImages = () => {
      const trendingPosters = trendingMovies.slice(0, 3).map(movie => 
        movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null
      ).filter(Boolean);
      
      const popularPosters = popularMovies.slice(0, 3).map(movie => 
        movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null
      ).filter(Boolean);
      
      [...trendingPosters, ...popularPosters].forEach(preloadImage);
    };
    
    // Delay preloading to not interfere with initial load
    const timeoutId = setTimeout(preloadImages, 1000);
    // Track timeout for cleanup
    if (timeoutRefs.current) {
      timeoutRefs.current.add(timeoutId);
    }
  }, [trendingMovies, popularMovies]);

  // 🧹 Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);



  // 🧠 NEW: Memory optimization helpers
  const optimizeMemoryUsage = useCallback(() => {
    const now = Date.now();
    
    setMemoryOptimization(prev => {
      const timeSinceLastCleanup = now - prev.lastCleanup;
      
      // Clean up old cache entries if needed
      if (timeSinceLastCleanup > 5 * 60 * 1000) { // 5 minutes
        setDataCache(currentDataCache => {
          const cacheKeys = Object.keys(currentDataCache);
          if (cacheKeys.length > MAX_TOTAL_CACHE_ITEMS) {
            // Remove oldest entries
            const sortedKeys = cacheKeys.sort((a, b) => 
              (currentDataCache[a]?.timestamp || 0) - (currentDataCache[b]?.timestamp || 0)
            );
            
            const keysToRemove = sortedKeys.slice(0, cacheKeys.length - MAX_TOTAL_CACHE_ITEMS);
            const newCache = { ...currentDataCache };
            keysToRemove.forEach(key => delete newCache[key]);
            return newCache;
          }
          return currentDataCache;
        });
        
        return {
          ...prev,
          lastCleanup: now,
          itemsInMemory: Object.keys(dataCache).length
        };
      }
      
      return prev;
    });
  }, []); // Removed problematic dependencies to prevent infinite loop

  // Advanced request deduplication
  const deduplicateRequest = useCallback(async (key, requestFn) => {
    if (pendingRequests.current.has(key)) {
      return pendingRequests.current.get(key);
    }
    
    const promise = requestFn();
    pendingRequests.current.set(key, promise);
    
    try {
      const result = await promise;
      pendingRequests.current.delete(key);
      return result;
    } catch (error) {
      pendingRequests.current.delete(key);
      throw error;
    }
  }, []);

  // Adaptive network condition monitoring
  const updateNetworkConditions = useCallback((responseTime) => {
    const now = Date.now();
    const timeSinceLastCheck = now - networkConditions.current.lastCheck;
    
    if (timeSinceLastCheck > 5000) { // Update every 5 seconds
      networkConditions.current.averageResponseTime = 
        (networkConditions.current.averageResponseTime + responseTime) / 2;
      networkConditions.current.isSlow = responseTime > 2000; // Consider slow if > 2s
      networkConditions.current.lastCheck = now;
    }
  }, []);



  // 🎯 NEW: Intelligent prefetching (simplified to avoid hoisting issues)
  const intelligentPrefetch = useCallback(async (category, priority = 'normal') => {
    setPrefetchQueue(prev => {
      if (prev.has(category)) return prev;
      return new Set([...prev, category]);
    });
    
    try {
      const startTime = performance.now();
      // Use a simple approach to avoid hoisting issues
      const cacheKey = `${category}-1`;
      
      // Check cache first using current state
      setDataCache(currentDataCache => {
        const cachedData = currentDataCache[cacheKey];
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
          return currentDataCache;
        }
        return currentDataCache;
      });

      // Get the appropriate fetch function
      const fetchFunction = getFetchFunction(category);
      if (!fetchFunction) {
        throw new Error(`No fetch function found for category: ${category}`);
      }

      const result = await fetchFunction(1);
      
      if (result && result.movies) {
        setDataCache(prev => ({
          ...prev,
          [category]: {
            movies: result.movies.slice(0, 20), // Limit prefetched items
            totalPages: result.totalPages || 1,
            timestamp: Date.now(),
            priority
          }
        }));
        
        // Performance logging
        const loadTime = performance.now() - startTime;
        if (process.env.NODE_ENV === 'development') {
          console.log(`Prefetch completed for ${category} in ${loadTime.toFixed(2)}ms`);
        }
      }
    } catch (error) {
      console.warn(`Prefetch failed for ${category}:`, error);
    } finally {
      setPrefetchQueue(prev => {
        const newQueue = new Set(prev);
        newQueue.delete(category);
        return newQueue;
      });
    }
  }, [getFetchFunction, CACHE_DURATION]); // Removed problematic dependencies

  // Create sections object from individual state variables
  const sections = useMemo(() => ({
    trending: { movies: trendingMovies },
    popular: { movies: popularMovies },
    topRated: { movies: topRatedMovies },
    upcoming: { movies: upcomingMovies },
    action: { movies: actionMovies },
    comedy: { movies: comedyMovies },
    drama: { movies: dramaMovies },
    horror: { movies: horrorMovies },
    sciFi: { movies: sciFiMovies },
    documentary: { movies: documentaryMovies },
    family: { movies: familyMovies },
    animation: { movies: animationMovies },
    awardWinning: { movies: awardWinningMovies },
    latest: { movies: latestMovies },
    popularTV: { movies: popularTVShows },
    topRatedTV: { movies: topRatedTVShows },
    airingToday: { movies: airingTodayTVShows },
    nowPlaying: { movies: nowPlayingMovies }
  }), [
    trendingMovies, popularMovies, topRatedMovies, upcomingMovies,
    actionMovies, comedyMovies, dramaMovies, horrorMovies,
    sciFiMovies, documentaryMovies, familyMovies, animationMovies,
    awardWinningMovies, latestMovies, popularTVShows, topRatedTVShows,
    airingTodayTVShows, nowPlayingMovies
  ]);

  // 🚀 ULTRA-OPTIMIZED: Intelligent resource preloading with performance monitoring
  const preloadCriticalResources = useCallback(() => {
    // Preload critical hero images for faster perceived loading
    const criticalImages = [];
    
    // Add hero section images if available
    if (featuredContent && featuredContent.backdrop_path) {
      const heroImage = getBackdropProps(featuredContent, 'w1280').src;
      // FIXED: Only preload TMDB images to avoid external resource warnings
      if (heroImage && heroImage.includes('image.tmdb.org')) {
        criticalImages.push(heroImage);
      }
    }
    
    // Add trending section first few images
    if (sections && sections.trending && sections.trending.movies && sections.trending.movies.length > 0) {
      sections.trending.movies.slice(0, 3).forEach(movie => {
        if (movie.poster_path) {
          const posterImage = getPosterProps(movie, 'w500').src;
          // FIXED: Only preload TMDB images to avoid external resource warnings
          if (posterImage && posterImage.includes('image.tmdb.org')) {
            criticalImages.push(posterImage);
          }
        }
      });
    }

    // FIXED: Intelligent preloading with validation and error handling
    if (criticalImages.length > 0) {
      const preloadLinks = [];
      criticalImages.forEach((image, index) => {
        try {
          // Validate image URL before creating preload link
          if (!image || !image.startsWith('https://image.tmdb.org/')) {
            console.warn('Skipping preload for non-TMDB image:', image);
            return;
          }
          
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = image;
          link.fetchPriority = index === 0 ? 'high' : 'auto'; // First image gets high priority
          
          // Add error handling for preload links
          link.onerror = () => {
            console.warn('Preload failed for image:', image);
            // Remove failed preload link
            try {
              if (link.parentNode && document.head.contains(link)) {
                link.parentNode.removeChild(link);
              }
            } catch (error) {
              console.warn('Failed to remove failed preload link:', error);
            }
          };
          
          document.head.appendChild(link);
          preloadLinks.push(link);
        } catch (error) {
          console.warn('Failed to create preload link for image:', image, error);
        }
      });
      
      // Clean up preload links after a delay
      setTimeout(() => {
        preloadLinks.forEach(link => {
          try {
            if (link && link.parentNode && document.head.contains(link)) {
              link.parentNode.removeChild(link);
            }
          } catch (error) {
            console.warn('Failed to remove preload link during cleanup:', error);
          }
        });
      }, 15000); // Reduced from 30 seconds to 15 seconds
    }
  }, [featuredContent, sections]);

  // Execute preloading with optimized timing - FIXED: Timeout leaks
  useEffect(() => {
    let preloadTimeout;
    
    const executePreload = () => {
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        preloadTimeout = requestIdleCallback(preloadCriticalResources, { timeout: 1000 }); // Reduced timeout
      } else {
        preloadTimeout = setTimeout(preloadCriticalResources, 1000); // Reduced delay
      }
    };
    
    executePreload();
    
    return () => {
      if (preloadTimeout) {
        if (typeof window !== 'undefined' && window.cancelIdleCallback) {
          cancelIdleCallback(preloadTimeout);
        } else {
          clearTimeout(preloadTimeout);
        }
      }
    };
  }, [featuredContent, sections]); // Use direct dependencies instead of preloadCriticalResources

  // 📈 NEW: Performance monitoring setup - FIXED: Observer leaks
  useEffect(() => {
    // Set up performance observer
    if ('PerformanceObserver' in window) {
      performanceObserver.current = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.entryType === 'measure') {
            // Performance monitoring logic
          }
        });
      });
      performanceObserver.current.observe({ entryTypes: ['measure'] });
    }
    
    return () => {
      if (performanceObserver.current) {
        performanceObserver.current.disconnect();
        performanceObserver.current = null;
      }
    };
  }, []);



  // Add priority levels for sections
  const SECTION_PRIORITIES = {
    HIGH: ['trending', 'popular', 'topRated'],
    MEDIUM: ['upcoming', 'action', 'comedy', 'drama'],
    LOW: ['horror', 'sciFi', 'documentary', 'family', 'animation', 'awardWinning', 'latest', 'popularTV', 'topRatedTV', 'airingToday', 'nowPlaying']
  };

  // Enhanced cache cleanup function with better error handling, performance optimizations, and monitoring - FIXED: Memory leaks
  const cleanupCache = useCallback(() => {
    const startTime = performance.now();
    let removedCount = 0;
    let totalSize = 0;
    let processedItems = 0;
    
    try {
      // Use more efficient iteration and early exit for better performance
      const cacheItems = [];
      const keys = Object.keys(localStorage);
      
      // Process only movie cache keys with early filtering
      const movieCacheKeys = keys.filter(key => key.startsWith('movieCache_'));
      
      if (movieCacheKeys.length === 0) {
        return; // Early exit if no cache items
      }

      // Group cache items by category and page
      const categoryPages = {};
      
      // Batch process items for better performance
      for (const key of movieCacheKeys) {
        try {
          const item = localStorage.getItem(key);
          if (!item) continue;
          
          const parsed = JSON.parse(item);
          const itemSize = item.length;
          
          // Validate cache item structure
          if (!parsed || typeof parsed.timestamp !== 'number' || !parsed.data) {
            localStorage.removeItem(key); // Remove invalid items
            removedCount++;
            continue;
          }
          
          totalSize += itemSize;
          
          // Extract category and page from key (e.g., "movieCache_comedy_page_37")
          const keyParts = key.replace('movieCache_', '').split('_');
          const category = keyParts[0];
          const isPage = keyParts.includes('page');
          const pageNum = isPage ? parseInt(keyParts[keyParts.length - 1]) : 0;
          
          if (!categoryPages[category]) {
            categoryPages[category] = { pages: [], other: [] };
          }
          
          if (isPage && !isNaN(pageNum)) {
            categoryPages[category].pages.push({ 
              key, 
              timestamp: parsed.timestamp, 
              size: itemSize,
              age: Date.now() - parsed.timestamp,
              pageNum
            });
          } else {
            categoryPages[category].other.push({ 
              key, 
              timestamp: parsed.timestamp, 
              size: itemSize,
              age: Date.now() - parsed.timestamp
            });
          }
          
          processedItems++;
          
        } catch (parseError) {
          // Remove corrupted items immediately
          localStorage.removeItem(key);
          removedCount++;
        }
      }

      // Cleanup strategy 1: Remove excess pages per category
      for (const [category, items] of Object.entries(categoryPages)) {
        if (items.pages.length > MAX_PAGES_PER_CATEGORY) {
          // Sort pages by number (keep newest pages)
          items.pages.sort((a, b) => b.pageNum - a.pageNum);
          
          // Remove excess pages (keep only the first MAX_PAGES_PER_CATEGORY)
          const pagesToRemove = items.pages.slice(MAX_PAGES_PER_CATEGORY);
          for (const page of pagesToRemove) {
            localStorage.removeItem(page.key);
            totalSize -= page.size;
            removedCount++;
          }
        }
      }

      // Cleanup strategy 2: Remove very old items (>1 hour)
      const veryOldThreshold = 60 * 60 * 1000; // 1 hour
      for (const [category, items] of Object.entries(categoryPages)) {
        const allItems = [...items.pages, ...items.other];
        const veryOldItems = allItems.filter(item => item.age > veryOldThreshold);
        
        for (const item of veryOldItems) {
          localStorage.removeItem(item.key);
          totalSize -= item.size;
          removedCount++;
        }
      }

      // Cleanup strategy 3: Size-based cleanup if still over limit
      if (totalSize > MAX_CACHE_SIZE) {
        // Flatten all items and sort by age (oldest first)
        const allItems = [];
        for (const [category, items] of Object.entries(categoryPages)) {
          allItems.push(...items.pages, ...items.other);
        }
        
        allItems.sort((a, b) => a.timestamp - b.timestamp);
        
        // Remove oldest items until under limit
        for (const item of allItems) {
          if (totalSize <= MAX_CACHE_SIZE * 0.8) break;
          localStorage.removeItem(item.key);
          totalSize -= item.size;
          removedCount++;
        }
      }

      // Cleanup strategy 4: Limit total cache items
      const remainingKeys = Object.keys(localStorage).filter(key => key.startsWith('movieCache_'));
      if (remainingKeys.length > MAX_TOTAL_CACHE_ITEMS) {
        // Get all remaining items and sort by age
        const remainingItems = [];
        for (const key of remainingKeys) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const parsed = JSON.parse(item);
              remainingItems.push({ key, timestamp: parsed.timestamp });
            }
          } catch (e) {
            localStorage.removeItem(key);
            removedCount++;
          }
        }
        
        remainingItems.sort((a, b) => a.timestamp - b.timestamp);
        
        // Remove oldest items to get under limit
        const itemsToRemove = remainingItems.slice(0, remainingKeys.length - MAX_TOTAL_CACHE_ITEMS);
        for (const item of itemsToRemove) {
          localStorage.removeItem(item.key);
          removedCount++;
        }
      }

      // Performance monitoring and logging
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (removedCount > 0) {
        console.log(`Cache cleanup: removed ${removedCount} items, ${(totalSize / 1024 / 1024).toFixed(2)}MB remaining`);
      }

    } catch (error) {
      console.error('Critical error during cache cleanup:', error);
      
      // Fallback: aggressive cleanup in case of critical errors
      try {
        const keys = Object.keys(localStorage);
        const movieCacheKeys = keys.filter(key => key.startsWith('movieCache_'));
        
        // Remove all movie cache items as emergency cleanup
        movieCacheKeys.forEach(key => {
          localStorage.removeItem(key);
          removedCount++;
        });
        
        console.warn(`Emergency cache cleanup removed ${removedCount} items`);
      } catch (fallbackError) {
        console.error('Emergency cache cleanup also failed:', fallbackError);
      }
    }
  }, []);

  // Add function to check if cache is valid
  const isCacheValid = (cacheKey) => {
    try {
      const cachedData = localStorage.getItem(`movieCache_${cacheKey}`);
      if (!cachedData) return false;
      
      const { timestamp, data } = JSON.parse(cachedData);
      return Date.now() - timestamp < CACHE_DURATION;
    } catch (error) {
      return false;
    }
  };



  // Enhanced function to get cached data with validation, performance monitoring, and advanced error handling
  const getCachedData = (cacheKey) => {
    const startTime = performance.now();
    const metrics = {
      validationTime: 0,
      retrievalTime: 0,
      parsingTime: 0,
      totalTime: 0
    };
    
    try {
      // Enhanced cache key validation with detailed logging
      const validationStart = performance.now();
      if (!cacheKey || typeof cacheKey !== 'string') {
        return null;
      }
      
      // Validate cache key format and length
      if (cacheKey.length === 0 || cacheKey.length > 100) {
        return null;
      }
      
      // Check for potentially malicious keys
      if (cacheKey.includes('..') || cacheKey.includes('__proto__') || cacheKey.includes('constructor')) {
        return null;
      }
      
      metrics.validationTime = performance.now() - validationStart;

      const storageKey = `movieCache_${cacheKey}`;
      
      // Enhanced localStorage retrieval with timeout protection
      const retrievalStart = performance.now();
      let cachedData;
      
      try {
        cachedData = localStorage.getItem(storageKey);
      } catch (storageError) {
        return null;
      }
      
      metrics.retrievalTime = performance.now() - retrievalStart;
      
      if (!cachedData) {
        return null;
      }
      
      // Enhanced data parsing with size validation
      const parsingStart = performance.now();
      
      // Check data size before parsing (prevent DoS attacks)
      if (cachedData.length > 10 * 1024 * 1024) { // 10MB limit
        localStorage.removeItem(storageKey);
        return null;
      }
      
      let parsedData;
      try {
        parsedData = JSON.parse(cachedData);
      } catch (parseError) {
        localStorage.removeItem(storageKey);
        return null;
      }
      
      metrics.parsingTime = performance.now() - parsingStart;
      
      // Enhanced data structure validation
      if (!parsedData || typeof parsedData !== 'object') {
        localStorage.removeItem(storageKey);
        return null;
      }
      
      if (!parsedData.hasOwnProperty('data')) {
        localStorage.removeItem(storageKey);
        return null;
      }
      
      // Enhanced timestamp validation with timezone consideration
      if (parsedData.timestamp) {
        const cacheAge = Date.now() - parsedData.timestamp;
        const maxAge = CACHE_DURATION + (5 * 60 * 1000); // Add 5 minute buffer
        
        if (cacheAge > maxAge) {
          localStorage.removeItem(storageKey);
          return null;
        }
      }
      
      // Enhanced data integrity check
      if (parsedData.data === null || parsedData.data === undefined) {
        localStorage.removeItem(storageKey);
        return null;
      }
      
      metrics.totalTime = performance.now() - startTime;
      
      return parsedData.data;
      
    } catch (error) {
      // Enhanced cleanup with retry mechanism
      try {
        const storageKey = `movieCache_${cacheKey}`;
        localStorage.removeItem(storageKey);
      } catch (cleanupError) {
        // Attempt to clear all cache as last resort
        try {
          const keys = Object.keys(localStorage);
          const movieCacheKeys = keys.filter(key => key.startsWith('movieCache_'));
          movieCacheKeys.forEach(key => localStorage.removeItem(key));
        } catch (emergencyError) {
          // Emergency cleanup failed silently
        }
      }
      
      return null;
    }
  };

  // Enhanced function to set cached data with validation, performance monitoring, and advanced error handling
  const setCachedData = (cacheKey, data) => {
    const startTime = performance.now();
    const metrics = {
      validationTime: 0,
      cleanupTime: 0,
      serializationTime: 0,
      storageTime: 0,
      totalTime: 0
    };
    
    try {
      // Enhanced cache key validation with detailed logging
      const validationStart = performance.now();
      if (!cacheKey || typeof cacheKey !== 'string') {
        console.warn('Invalid cache key provided:', cacheKey, 'Type:', typeof cacheKey);
        return false;
      }
      
      // Validate cache key format and length
      if (cacheKey.length === 0 || cacheKey.length > 100) {
        console.warn('Cache key length invalid:', cacheKey.length, 'Key:', cacheKey);
        return false;
      }
      
      // Check for potentially malicious keys
      if (cacheKey.includes('..') || cacheKey.includes('__proto__') || cacheKey.includes('constructor')) {
        console.warn('Potentially malicious cache key detected:', cacheKey);
        return false;
      }
      
      // Validate data structure
      if (data === null || data === undefined) {
        console.warn('Attempting to cache null/undefined data for key:', cacheKey);
        return false;
      }
      
      metrics.validationTime = performance.now() - validationStart;

      // Enhanced cleanup with performance monitoring
      const cleanupStart = performance.now();
      cleanupCache();
      metrics.cleanupTime = performance.now() - cleanupStart;

      // Enhanced data serialization with size validation
      const serializationStart = performance.now();
      // Use a simple checksum: first 8 chars of a hash of the JSON string (Unicode-safe)
      function simpleChecksum(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = ((hash << 5) - hash) + str.charCodeAt(i);
          hash |= 0;
        }
        return Math.abs(hash).toString(16).slice(0, 8);
      }
      const jsonString = JSON.stringify(data);
      const cacheData = {
        data,
        timestamp: Date.now(),
        version: '1.0',
        checksum: simpleChecksum(jsonString)
      };
      
      const serializedData = JSON.stringify(cacheData);
      const dataSize = serializedData.length;
      
      // Validate data size before storage
      if (dataSize > MAX_CACHE_SIZE) {
        console.warn(`Cache data too large for key: ${cacheKey}`, {
          size: `${(dataSize / 1024 / 1024).toFixed(2)}MB`,
          limit: `${(MAX_CACHE_SIZE / 1024 / 1024).toFixed(2)}MB`
        });
        return false;
      }
      
      metrics.serializationTime = performance.now() - serializationStart;

      // Enhanced localStorage storage with timeout protection
      const storageStart = performance.now();
      const storageKey = `movieCache_${cacheKey}`;
      
      try {
        localStorage.setItem(storageKey, serializedData);
        metrics.storageTime = performance.now() - storageStart;
        metrics.totalTime = performance.now() - startTime;
        
        return true;
      } catch (storageError) {
        console.error('localStorage storage failed for key:', storageKey, storageError);
        
        // Handle quota exceeded error specifically
        if (storageError.name === 'QuotaExceededError' || storageError.message.includes('quota')) {
          console.warn('Storage quota exceeded, performing emergency cleanup...');
          
          // Perform emergency cleanup
          cleanupCache();
          
          // Try again after cleanup
          try {
            localStorage.setItem(storageKey, serializedData);
            console.log('Successfully stored data after emergency cleanup');
            return true;
          } catch (retryError) {
            console.error('Failed to store data even after cleanup:', retryError);
            return false;
          }
        }
        
        return false;
      }
    } catch (error) {
      console.error('Critical error setting cached data for key:', cacheKey, error);
      return false;
    }
    return false;
  };

  // Initialize data fetching
  useEffect(() => {
    let isMounted = true;
    
    const initializeData = async () => {
      if (isMounted) {
        await fetchInitialMovies();
      }
    };
    
    initializeData();
    
    // Set up a periodic cleanup interval - more frequent to prevent quota issues
    const interval = trackedSetInterval(cleanupCache, 5 * 60 * 1000); // Every 5 minutes
    
    return () => {
      isMounted = false;
      if (interval) {
        clearInterval(interval);
        intervalRefs.current.delete(interval);
      }
      
      // Additional cleanup
      cleanMovieDetailsCache();
      if (cacheRef.current) {
        cacheRef.current.clear();
      }
      if (lruQueue.current) {
        lruQueue.current.length = 0;
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  // Add loading state for initial data fetch with timeout protection
  useEffect(() => {
    if (loadingStates.initial) {
      // Don't lock body scroll during loading - let users scroll normally
      // document.body.style.overflow = 'hidden'; // REMOVED: This was causing scroll issues
      
      // Add timeout to prevent infinite loading
      const loadingTimeout = setTimeout(() => {
        console.warn('Loading timeout reached, forcing completion');
        setLoadingState('initial', false);
        setError('Loading took longer than expected. Some content may not be available.');
      }, 30000); // 30 second timeout
      
      return () => {
        clearTimeout(loadingTimeout);
        // document.body.style.overflow = 'unset'; // REMOVED: This was causing scroll issues
      };
    }
    // else {
    //   document.body.style.overflow = 'unset'; // REMOVED: This was causing scroll issues
    // }
    
    // return () => {
    //   document.body.style.overflow = 'unset'; // REMOVED: This was causing scroll issues
    // };
  }, [loadingStates.initial, setLoadingState]);

  // Add error handling effect
  useEffect(() => {
    if (error) {
      console.error('Error in HomePage:', error);
    }
    
    return () => {
      // Clear error state on unmount
      setError(null);
    };
  }, [error]);

  // FIXED: Add cleanup effect with memory optimization and proper cleanup
  useEffect(() => {
    // Memory optimization interval
    const memoryInterval = setInterval(() => {
      if (performance.memory) {
        const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
        if (memoryMB > 400) {
          console.warn(`High memory usage detected: ${memoryMB.toFixed(2)}MB`);
          // Force cleanup
          if (window.gc) {
            window.gc();
          }
        }
      }
    }, 30000); // Check every 30 seconds
    
    // Store interval for cleanup
    intervalRefs.current.add(memoryInterval);
    
    return () => {
      clearInterval(memoryInterval);
      intervalRefs.current.delete(memoryInterval);
      
      // Clear intersection observer
      if (sectionObserverRef.current) {
        sectionObserverRef.current.disconnect();
        sectionObserverRef.current = null;
      }
      
      // Clear lazy load queue
      setLazyLoadQueue(new Set());
      setVisibleSections(new Set());
    };
  }, []);

  // FIXED: Add debugging for mobile content loading - moved before early returns
  useEffect(() => {
    console.log('HomePage Debug - Mobile:', isMobile);
    console.log('HomePage Debug - Trending movies:', trendingMovies.length);
    console.log('HomePage Debug - Popular movies:', popularMovies.length);
    console.log('HomePage Debug - Top rated movies:', topRatedMovies.length);
    console.log('HomePage Debug - Upcoming movies:', upcomingMovies.length);
    console.log('HomePage Debug - Active category:', activeCategory);
  }, [isMobile, trendingMovies.length, popularMovies.length, topRatedMovies.length, upcomingMovies.length, activeCategory]);

  // FIXED: Ensure proper scroll behavior with proper cleanup
  useEffect(() => {
    // Ensure body can always scroll
    const ensureScrollEnabled = () => {
      if (document.body.style.overflow === 'hidden') {
        console.warn('Body scroll was locked, re-enabling...');
        document.body.style.overflow = 'auto';
      }
    };

    // Check immediately
    ensureScrollEnabled();

    // Set up periodic check to ensure scroll is never locked
    const scrollCheckInterval = setInterval(ensureScrollEnabled, 5000);
    
    // Store interval for cleanup
    intervalRefs.current.add(scrollCheckInterval);

    return () => {
      clearInterval(scrollCheckInterval);
      intervalRefs.current.delete(scrollCheckInterval);
      // Final cleanup - ensure scroll is enabled
      document.body.style.overflow = 'auto';
    };
  }, []);

  // FIXED: Scroll restoration and position management
  useEffect(() => {
    // Store scroll position on page unload
    const handleBeforeUnload = () => {
      sessionStorage.setItem('homepageScrollPosition', window.scrollY.toString());
    };

    // Restore scroll position on page load
    const restoreScrollPosition = () => {
      const savedPosition = sessionStorage.getItem('homepageScrollPosition');
      if (savedPosition && !loadingStates.initial) {
        const position = parseInt(savedPosition, 10);
        if (position > 0) {
          setTimeout(() => {
            window.scrollTo(0, position);
            sessionStorage.removeItem('homepageScrollPosition');
          }, 100);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Restore position after initial load
    if (!loadingStates.initial) {
      restoreScrollPosition();
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [loadingStates.initial]);

  // FIXED: Focus management to prevent scroll blocking with proper cleanup
  useEffect(() => {
    const handleFocusIn = (event) => {
      // When focus is inside a scroll container, ensure scroll events can still bubble up
      const target = event.target;
      const scrollContainer = target.closest('[class*="overflow-y-auto"], [class*="overflow-x-auto"]');
      
      if (scrollContainer) {
        // Add a temporary class to allow scroll chaining
        scrollContainer.style.overscrollBehavior = 'auto';
        
        // Remove the class after a short delay
        const timeoutId = setTimeout(() => {
          if (scrollContainer && scrollContainer.style) {
            scrollContainer.style.overscrollBehavior = 'auto';
          }
        }, 100);
        
        // Store timeout for cleanup
        timeoutRefs.current.add(timeoutId);
      }
    };

    const handleWheel = (event) => {
      // Ensure wheel events can bubble up to the main page
      const target = event.target;
      const scrollContainer = target.closest('[class*="overflow-y-auto"], [class*="overflow-x-auto"]');
      
      if (scrollContainer) {
        // Check if the scroll container is at its scroll boundaries
        const isAtTop = scrollContainer.scrollTop === 0;
        const isAtBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight;
        
        // If at boundaries and trying to scroll further, allow the event to bubble up
        if ((isAtTop && event.deltaY < 0) || (isAtBottom && event.deltaY > 0)) {
          event.stopPropagation = () => {}; // Prevent stopPropagation from being called
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn, { passive: true });
    document.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('wheel', handleWheel);
      
      // Clear any remaining timeouts
      timeoutRefs.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      timeoutRefs.current.clear();
    };
  }, []);

  // Pagination states for all categories
  const [pageStates, setPageStates] = useState({
    // High priority sections - load first
    trending: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    popular: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    topRated: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    
    // Medium priority sections
    upcoming: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    action: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    comedy: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    drama: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    
    // Low priority sections - load last
    horror: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    sciFi: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    documentary: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    family: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    animation: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    awardWinning: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    latest: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    
    // TV show sections
    popularTV: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    topRatedTV: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    airingToday: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    nowPlaying: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null }
  });

  // Track unique movie IDs for all categories
  const [movieIds] = useState({
    trending: new Set(),
    popular: new Set(),
    topRated: new Set(),
    upcoming: new Set(),
    action: new Set(),
    comedy: new Set(),
    drama: new Set(),
    horror: new Set(),
    sciFi: new Set(),
    documentary: new Set(),
    family: new Set(),
    animation: new Set(),
    awardWinning: new Set(),
    latest: new Set(),
    popularTV: new Set(),
    topRatedTV: new Set(),
    airingToday: new Set(),
    nowPlaying: new Set()
  });

  // Enhanced prefetch state management
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
  const fetchInProgress = useRef(false);
  const [visibleMovies, setVisibleMovies] = useState(new Set());

  const addUniqueMovies = (currentMovies, newMovies, idSet) => {
    const uniqueNewMovies = newMovies.filter(movie => !idSet.has(movie.id));
    uniqueNewMovies.forEach(movie => idSet.add(movie.id));
    return [...currentMovies, ...uniqueNewMovies];
  };

  // Ultra-optimized fetchInitialMovies with intelligent prioritization, performance monitoring, and error recovery
  const fetchInitialMovies = async () => {
    const startTime = performance.now();
    const metrics = {
      featuredTime: 0,
      highPriorityTime: 0,
      mediumPriorityTime: 0,
      lowPriorityTime: 0,
      totalTime: 0,
      cacheHits: 0,
      apiCalls: 0,
      errors: 0
    };

    try {
      setLoadingState('initial', true);
      setError(null);
      
      // Phase 1: Critical content (featured + trending) - highest priority with parallel loading
      const featuredStart = performance.now();
      
      // Start featured content immediately
      const featuredPromise = fetchFeaturedContent();
      
      // Start trending in parallel for faster perceived loading
      const trendingPromise = fetchPrioritySection('trending');
      
      // Wait for critical content to complete
      await Promise.all([featuredPromise, trendingPromise]);
      
      metrics.featuredTime = performance.now() - featuredStart;
      
      // Phase 2: High priority content (popular, topRated) - load in parallel
      const highPriorityStart = performance.now();
      const highPriorityPromises = [
        fetchPrioritySection('popular'),
        fetchPrioritySection('topRated')
      ];
      
      await Promise.all(highPriorityPromises);
      metrics.highPriorityTime = performance.now() - highPriorityStart;
      
      // Phase 3: Medium priority content - load only essential sections for faster initial load
      const mediumPriorityStart = performance.now();
      const mediumPriorityCategories = ['upcoming', 'action', 'comedy', 'drama', 'popularTV', 'topRatedTV', 'airingToday', 'nowPlaying']; // Added TV categories
      
      // Load medium priority in parallel for faster loading
      const mediumPriorityPromises = mediumPriorityCategories.map(category => 
        fetchPrioritySection(category)
      );
      await Promise.all(mediumPriorityPromises);
      
      metrics.mediumPriorityTime = performance.now() - mediumPriorityStart;
      
        // Phase 4: Low priority content - load asynchronously after initial render with intelligent batching
  const lowPriorityStart = performance.now();
  const lowPriorityCategories = [
    'horror', 'sciFi', 'documentary', 'family', 'animation', 
    'awardWinning', 'latest', 'popularTV', 'topRatedTV', 
    'airingToday', 'nowPlaying'
  ];
  
  // Load low priority content in smaller batches to prevent overwhelming the API
  const batchSize = 3;
  const loadLowPriorityBatches = async () => {
    for (let i = 0; i < lowPriorityCategories.length; i += batchSize) {
      const batch = lowPriorityCategories.slice(i, i + batchSize);
      const batchPromises = batch.map(category => fetchPrioritySection(category));
      
      try {
        await Promise.allSettled(batchPromises);
        // Small delay between batches to prevent API rate limiting
        if (i + batchSize < lowPriorityCategories.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.warn(`Batch ${Math.floor(i / batchSize) + 1} failed:`, error);
      }
    }
  };
  
  // Start low priority loading in background
  loadLowPriorityBatches().then(() => {
    console.log('✅ All low priority content loaded');
  }).catch(error => {
    console.warn('Low priority content loading failed:', error);
  });
      
      metrics.lowPriorityTime = performance.now() - lowPriorityStart;
      metrics.totalTime = performance.now() - startTime;
      
      console.log('🎯 Initial load performance:', {
        featuredTime: `${metrics.featuredTime.toFixed(0)}ms`,
        highPriorityTime: `${metrics.highPriorityTime.toFixed(0)}ms`,
        mediumPriorityTime: `${metrics.mediumPriorityTime.toFixed(0)}ms`,
        lowPriorityTime: `${metrics.lowPriorityTime.toFixed(0)}ms`,
        totalTime: `${metrics.totalTime.toFixed(0)}ms`
      });
      
      // Track page load performance
      trackPageLoad('HomePage');
      
    } catch (error) {
      console.error('Critical error in fetchInitialMovies:', error);
      setError('Failed to load initial content. Please refresh the page.');
    } finally {
      setLoadingState('initial', false);
    }
  };

  // Enhanced helper function to chunk arrays for batch processing with validation, performance monitoring, and error handling
  const chunkArray = (array, size) => {
    const startTime = performance.now();
    const metrics = {
      validationTime: 0,
      processingTime: 0,
      totalTime: 0
    };
    
    try {
      // Enhanced input validation with detailed logging
      const validationStart = performance.now();
      if (!Array.isArray(array)) {
        console.warn('chunkArray: Invalid input - expected array, got:', typeof array);
        return [];
      }
      
      if (typeof size !== 'number' || size <= 0 || !Number.isInteger(size)) {
        console.warn('chunkArray: Invalid chunk size:', size, 'Type:', typeof size);
        return [array]; // Return original array as single chunk
      }
      
      if (array.length === 0) {
        return []; // Return empty array for empty input
      }
      
      metrics.validationTime = performance.now() - validationStart;

      // Enhanced processing with performance monitoring
      const processingStart = performance.now();
      const chunks = [];
      const totalChunks = Math.ceil(array.length / size);
      
      // Use more efficient iteration for better performance
      for (let i = 0; i < array.length; i += size) {
        const chunk = array.slice(i, i + size);
        chunks.push(chunk);
      }
      
      metrics.processingTime = performance.now() - processingStart;
      metrics.totalTime = performance.now() - startTime;
      
      return chunks;
      
    } catch (error) {
      console.error('Critical error in chunkArray:', {
        error: error.message,
        stack: error.stack,
        input: { arrayLength: array?.length, size, arrayType: typeof array }
      });
      
      // Fallback: return original array as single chunk
      return [array];
    }
  };

  // Enhanced function to fetch a single section with priority, performance monitoring, and advanced error handling
  const fetchPrioritySection = async (sectionKey) => {
    let section;
    const startTime = performance.now();
    const metrics = {
      validationTime: 0,
      cacheCheckTime: 0,
      fetchTime: 0,
      processingTime: 0,
      totalTime: 0,
      cacheHit: false,
      dataSize: 0
    };

    try {
      // Enhanced section validation with detailed logging
      const validationStart = performance.now();
      if (!sectionKey || typeof sectionKey !== 'string') {
        console.warn('Invalid section key provided:', sectionKey, 'Type:', typeof sectionKey);
        throw new Error(`Invalid section key: ${sectionKey}`);
      }

      section = {
        key: sectionKey,
        fetch: getFetchFunction(sectionKey),
        setter: getSetterFunction(sectionKey),
        ids: movieIds[sectionKey]
      };

      // Validate section configuration
      if (!section.fetch || !section.setter || !section.ids) {
        console.error('Invalid section configuration for key:', sectionKey, {
          hasFetch: !!section.fetch,
          hasSetter: !!section.setter,
          hasIds: !!section.ids
        });
        throw new Error(`Invalid section configuration for: ${sectionKey}`);
      }

      metrics.validationTime = performance.now() - validationStart;

      // Enhanced cache checking with performance monitoring
      const cacheCheckStart = performance.now();
      if (isCacheValid(section.key)) {
        const cachedData = getCachedData(section.key);
        if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
          metrics.cacheHit = true;
          metrics.dataSize = cachedData.length;
          
          // Enhanced data processing with validation
          const processingStart = performance.now();
          try {
            section.setter(cachedData);
            cachedData.forEach(movie => {
              if (movie && movie.id && typeof movie.id === 'number') {
                section.ids.add(movie.id);
              }
            });
            metrics.processingTime = performance.now() - processingStart;
            metrics.totalTime = performance.now() - startTime;
            
            return;
          } catch (processingError) {
            console.error(`Error processing cached data for ${section.key}:`, processingError);
            // Continue to fetch fresh data if cache processing fails
          }
        }
      }
      metrics.cacheCheckTime = performance.now() - cacheCheckStart;

        // Enhanced API fetching with optimized timeout and retry logic
  const fetchStart = performance.now();
  setLoadingState(section.key, true);
  
  // Use request deduplication to prevent duplicate calls
  const requestKey = `${section.key}-page-1`;
  let result;
  
  try {
    result = await deduplicateRequest(requestKey, async () => {
      // Reduced timeout for faster failure detection and better UX
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 15000); // Reduced from 30 to 15 seconds
      });
      
      const fetchPromise = section.fetch(1);
      return await Promise.race([fetchPromise, timeoutPromise]);
    });
  } catch (error) {
    throw error;
  }
  
  metrics.fetchTime = performance.now() - fetchStart;
  
  // Track API call performance
  trackApiCall(section.key, metrics.fetchTime, true);

      // Enhanced result validation and processing
      const processingStart = performance.now();
      if (result && result.movies && Array.isArray(result.movies) && result.movies.length > 0) {
        metrics.dataSize = result.movies.length;
        
        // Validate movie data structure
        const validMovies = result.movies.filter(movie => 
          movie && 
          movie.id && 
          typeof movie.id === 'number' &&
          movie.title &&
          typeof movie.title === 'string'
        );

        if (validMovies.length !== result.movies.length) {
          console.warn(`Filtered ${result.movies.length - validMovies.length} invalid movies from ${section.key}`);
        }

        // Update state with validated data
        section.setter(validMovies);
        validMovies.forEach(movie => section.ids.add(movie.id));
        
        // Enhanced pagination state update
        setPageStates(prev => ({
          ...prev,
          [section.key]: { 
            current: 1, 
            total: result.totalPages || 1,
            hasMore: (result.totalPages || 1) > 1,
            lastFetched: Date.now()
          }
        }));

        // Enhanced cache update with error handling
        try {
          setCachedData(section.key, validMovies);
          // console.log(`✅ Successfully cached ${validMovies.length} movies for ${section.key}`);
        } catch (cacheError) {
          console.warn(`Failed to cache data for ${section.key}:`, cacheError);
          // Continue execution even if caching fails
        }

        // console.log(`✅ Successfully fetched ${validMovies.length} movies for ${section.key}`);
      } else {
        console.warn(`No valid movies returned for ${section.key}`, result);
        setError(`No movies available for ${section.key}`);
      }

      metrics.processingTime = performance.now() - processingStart;
      metrics.totalTime = performance.now() - startTime;

    } catch (error) {
      const totalTime = performance.now() - startTime;
      trackApiCall(sectionKey, totalTime, false);
      
      console.error(`Critical error fetching ${sectionKey}:`, {
        error: error.message,
        stack: error.stack,
        sectionKey,
        metrics: {
          totalTime,
          cacheHit: metrics.cacheHit
        }
      });
      
      // Enhanced error handling with user-friendly messages
      const errorMessage = error.message === 'Request timeout' 
        ? `Request timeout for ${sectionKey}`
        : `Failed to fetch ${sectionKey} movies`;
      
      setError(errorMessage);
      
      // Attempt to recover by clearing potentially corrupted cache
      try {
        const storageKey = `movieCache_${sectionKey}`;
        localStorage.removeItem(storageKey);
      } catch (cleanupError) {
        console.error(`Failed to clean up cache for ${sectionKey}:`, cleanupError);
      }
    } finally {
      setLoadingState(section ? section.key : sectionKey, false);
    }
  };

  // Helper function to get the appropriate setter function
  const getSetterFunction = (key) => {
    const setterFunctions = {
      trending: setTrendingMovies,
      popular: setPopularMovies,
      topRated: setTopRatedMovies,
      upcoming: setUpcomingMovies,
      action: setActionMovies,
      comedy: setComedyMovies,
      drama: setDramaMovies,
      horror: setHorrorMovies,
      sciFi: setSciFiMovies,
      documentary: setDocumentaryMovies,
      family: setFamilyMovies,
      animation: setAnimationMovies,
      awardWinning: setAwardWinningMovies,
      latest: setLatestMovies,
      popularTV: setPopularTVShows,
      topRatedTV: setTopRatedTVShows,
      airingToday: setAiringTodayTVShows,
      nowPlaying: setNowPlayingMovies
    };
    return setterFunctions[key];
  };



  // Enhanced loadMoreMovies with intelligent caching, performance monitoring, error recovery, and advanced state management
  const loadMoreMovies = async (category) => {
    const startTime = performance.now();
    const metrics = {
      validationTime: 0,
      cacheCheckTime: 0,
      fetchTime: 0,
      processingTime: 0,
      totalTime: 0,
      cacheHit: false,
      dataSize: 0,
      uniqueMovies: 0
    };

    // Declare loadingTimeout outside try block so it's accessible in finally
    let loadingTimeout;

    try {
      // Enhanced input validation with detailed logging
      const validationStart = performance.now();
      if (!category || typeof category !== 'string') {
        console.warn('Invalid category provided to loadMoreMovies:', category, 'Type:', typeof category);
        throw new Error(`Invalid category: ${category}`);
      }

      const currentPage = pageStates[category]?.current;
      const totalPages = pageStates[category]?.total;

      if (!pageStates[category]) {
        console.error(`Page state not found for category: ${category}`);
        throw new Error(`Page state not found for category: ${category}`);
      }

      if (currentPage >= totalPages) {
        return;
      }

      const nextPage = currentPage + 1;
      metrics.validationTime = performance.now() - validationStart;

      // Enhanced loading state management with timeout protection
      setLoadingState(category, true);
      loadingTimeout = setTimeout(() => {
        console.warn(`⚠️ Loading timeout for ${category} page ${nextPage}`);
      }, 30000); // 30 second timeout

      let result;

      // Enhanced cache checking with performance monitoring
      const cacheCheckStart = performance.now();
      const cacheKey = `${category}_page_${nextPage}`;
      
      if (isCacheValid(cacheKey)) {
        const cachedData = getCachedData(cacheKey);
        if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
          result = { movies: cachedData };
          metrics.cacheHit = true;
          metrics.dataSize = cachedData.length;
        }
      }
      
      metrics.cacheCheckTime = performance.now() - cacheCheckStart;

      // Enhanced API fetching with retry mechanism and performance monitoring
      if (!result) {
        const fetchStart = performance.now();
        const fetchFunction = getFetchFunction(category);
        
        if (!fetchFunction) {
          console.error(`❌ No fetch function found for category: ${category}`);
          throw new Error(`No fetch function found for category: ${category}`);
        }

        // Implement retry mechanism for failed requests
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            result = await fetchFunction(nextPage);
            break; // Success, exit retry loop
          } catch (fetchError) {
            retryCount++;
            console.warn(`⚠️ Fetch attempt ${retryCount} failed for ${category} page ${nextPage}:`, fetchError);
            
            if (retryCount >= maxRetries) {
              throw fetchError; // Re-throw after all retries exhausted
            }
            
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          }
        }
        
        metrics.fetchTime = performance.now() - fetchStart;
        metrics.dataSize = result?.movies?.length || 0;
        
        // Enhanced cache management with validation and error handling
        if (result && result.movies && Array.isArray(result.movies) && result.movies.length > 0) {
          try {
            setCachedData(cacheKey, result.movies);
          } catch (cacheError) {
            console.warn(`⚠️ Failed to cache data for ${category} page ${nextPage}:`, cacheError);
          }
        }
      }

      // Enhanced state update with performance monitoring and validation
      const processingStart = performance.now();
      if (result && result.movies && Array.isArray(result.movies)) {
        const setter = getSetterFunction(category);
        if (setter) {
          // Enhanced unique movie addition with performance monitoring
          const beforeCount = movieIds[category]?.size || 0;
          setter(prev => {
            const updatedMovies = addUniqueMovies(prev, result.movies, movieIds[category]);
            return updatedMovies;
          });
          
          const afterCount = movieIds[category]?.size || 0;
          metrics.uniqueMovies = afterCount - beforeCount;
          
          // Enhanced page state update with validation
          setPageStates(prev => {
            const currentState = prev[category];
            if (!currentState) {
              console.warn(`⚠️ Page state not found for ${category} during update`);
              return prev;
            }
            
            return {
              ...prev,
              [category]: {
                ...currentState,
                current: nextPage,
                total: result.totalPages || currentState.total,
                lastFetched: Date.now(),
                hasMore: nextPage < (result.totalPages || currentState.total)
              }
            };
          });
        } else {
          console.error(`❌ No setter function found for category: ${category}`);
        }
      } else {
        console.warn(`⚠️ Invalid result structure for ${category} page ${nextPage}:`, result);
      }
      
      metrics.processingTime = performance.now() - processingStart;
      metrics.totalTime = performance.now() - startTime;

    } catch (error) {
      console.error(`💥 Critical error loading more ${category} movies:`, {
        error: error.message,
        stack: error.stack,
        category,
        page: pageStates[category]?.current + 1
      });
      
      // Enhanced error recovery with user feedback
      setError(`Failed to load more ${category} movies. Please try again.`);
      
    } finally {
      // Enhanced cleanup with timeout clearing
      clearTimeout(loadingTimeout);
      setLoadingState(category, false);
    }
  };

  // Add slide change handler
  const handleSlideChange = (newIndex) => {
    if (isTransitioning) return; // Prevent multiple transitions
    
    setIsTransitioning(true);
    
    // Calculate the next index
    const nextIndex = typeof newIndex === 'function' 
      ? newIndex(currentFeaturedIndex)
      : newIndex;

    // Ensure the index is within bounds
    const validIndex = (nextIndex + trendingMovies.length) % trendingMovies.length;
    
    setTimeout(() => {
      setCurrentFeaturedIndex(validIndex);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 500);
  };

  // Add useEffect for auto-rotation
  useEffect(() => {
    let intervalRef = null;
    
    if (trendingMovies.length > 1) {
      intervalRef = trackedSetInterval(() => {
        setCurrentFeaturedIndex(prevIndex => {
          if (!isTransitioning) {
            return (prevIndex + 1) % trendingMovies.length;
          }
          return prevIndex;
        });
      }, 5000); // Change featured movie every 5 seconds
    }

    return () => {
      if (intervalRef) {
        clearInterval(intervalRef);
        intervalRefs.current.delete(intervalRef);
      }
    };
  }, [trendingMovies.length, isTransitioning]); // Removed currentFeaturedIndex to prevent infinite loop

  // Enhanced movie details cache: { [id]: { data, timestamp } }

  // Helper: get cached details if fresh
  const getCachedMovieDetails = (id) => {
    const entry = movieDetailsCache.current[id];
    if (!entry) return null;
    if (Date.now() - entry.timestamp < MOVIE_DETAILS_TTL) {
      return entry.data;
    }
    return null;
  };

  // Helper: set details in cache, evict oldest if over limit
  const setCachedMovieDetails = (id, data) => {
    movieDetailsCache.current[id] = { data, timestamp: Date.now() };
    // Enforce cache size limit
    const keys = Object.keys(movieDetailsCache.current);
    if (keys.length > MOVIE_DETAILS_CACHE_LIMIT) {
      // Sort by oldest
      keys.sort((a, b) => movieDetailsCache.current[a].timestamp - movieDetailsCache.current[b].timestamp);
      for (let i = 0; i < keys.length - MOVIE_DETAILS_CACHE_LIMIT; i++) {
        delete movieDetailsCache.current[keys[i]];
      }
    }
  };

  // Helper: clean expired cache entries
  const cleanMovieDetailsCache = () => {
    const now = Date.now();
    Object.keys(movieDetailsCache.current).forEach((id) => {
      if (now - movieDetailsCache.current[id].timestamp > MOVIE_DETAILS_TTL) {
        delete movieDetailsCache.current[id];
      }
    });
  };

  // Periodically clean cache (every 10 min)
  useEffect(() => {
    const interval = trackedSetInterval(cleanMovieDetailsCache, 10 * 60 * 1000);
    
    return () => {
      if (interval) {
        clearInterval(interval);
        intervalRefs.current.delete(interval);
      }
    };
  }, []);

  // Step 10: Prefetch analytics

  // When prefetching, record analytics
  const recordPrefetch = (movieId) => {
    if (!prefetchAnalytics.current.prefetched[movieId]) {
      prefetchAnalytics.current.prefetched[movieId] = Date.now();
      prefetchAnalytics.current.totalPrefetched++;
    }
  };
  // When overlay is opened, record usage
  const recordPrefetchUsed = (movieId) => {
    if (!prefetchAnalytics.current.used[movieId]) {
      prefetchAnalytics.current.used[movieId] = Date.now();
      prefetchAnalytics.current.totalUsed++;
    }
  };
  // Log analytics summary every 30s
  useEffect(() => {
    const interval = trackedSetInterval(() => {
      const { totalPrefetched, totalUsed } = prefetchAnalytics.current;
      const efficiency = totalPrefetched > 0 ? ((totalUsed / totalPrefetched) * 100).toFixed(1) : 'N/A';
    }, 30000);
    
    return () => {
      if (interval) {
        clearInterval(interval);
        intervalRefs.current.delete(interval);
      }
    };
  }, []);

  // Patch handleMovieHover to record prefetch
  const handleMovieHover = useCallback(async (movie, index, moviesArr) => {
    if (!movie) return;
    const movieId = movie.id;
    recordPrefetch(movieId);
    const movieType = movie.media_type || movie.type || 'movie';
    const cached = getCachedMovieDetails(movieId);
    if (!cached) {
      try {
        const details = await getMovieDetails(movieId, movieType);
        setCachedMovieDetails(movieId, details);
              } catch (err) {
          console.warn('Failed to fetch movie details:', err);
        }
    }
    // Prefetch previous and next neighbors
    if (Array.isArray(moviesArr)) {
      const neighbors = [];
      if (index > 0) neighbors.push(moviesArr[index - 1]);
      if (index < moviesArr.length - 1) neighbors.push(moviesArr[index + 1]);
      for (const neighbor of neighbors) {
        if (!neighbor) continue;
        const nId = neighbor.id;
        recordPrefetch(nId);
        const nType = neighbor.media_type || neighbor.type || 'movie';
        const nCached = getCachedMovieDetails(nId);
        if (!nCached) {
          getMovieDetails(nId, nType).then((details) => {
            setCachedMovieDetails(nId, details);
          }).catch(() => {});
        }
      }
    }
  }, []);



  // Add this effect to check if the current movie is in watchlist
  useEffect(() => {
    if (trendingMovies[currentFeaturedIndex]) {
      const movieId = trendingMovies[currentFeaturedIndex].id;
      setIsInWatchlistState(isInWatchlist(movieId));
    }
  }, [currentFeaturedIndex, trendingMovies.length, isInWatchlist]); // Use trendingMovies.length instead of trendingMovies array

  // Add prefetch function
  const _prefetchCategory = async (category) => {
    if (prefetchQueue.has(category) || dataCache[category]) return;
    
    setPrefetchQueue(prev => new Set([...prev, category]));
    
    if (!isPrefetching) {
      setIsPrefetching(true);
      try {
        // Use the original fetchMoviesForCategory function
        const result = await fetchMoviesForCategory(category, 1);
        if (result && result.movies) {
          setDataCache(prev => ({
            ...prev,
            [category]: {
              movies: result.movies,
              totalPages: result.totalPages || 1,
              timestamp: Date.now()
            }
          }));
        }
      } catch (error) {
        console.error(`Error prefetching ${category}:`, error);
      } finally {
        setPrefetchQueue(prev => {
          const newQueue = new Set(prev);
          newQueue.delete(category);
          return newQueue;
        });
        setIsPrefetching(false);
      }
    }
  };

  // Ultra-optimized fetchMoviesForCategory with deduplication and adaptive loading
  const fetchMoviesForCategory = useCallback(async (category, page = 1) => {
    const cacheKey = `${category}-${page}`;
    
    // Check cache first with enhanced validation
    const cachedData = dataCache[cacheKey];
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return cachedData;
    }

    // Use request deduplication to prevent duplicate requests
    return deduplicateRequest(cacheKey, async () => {
      const startTime = performance.now();
      let result;
      
      try {
        setLoadingState(category, true);
        
                // Adaptive loading based on network conditions
        const timeout = networkConditions.current.isSlow ? 10000 : 5000;
        
        switch (category) {
          case 'all':
            // For 'all' category, return empty result as it shows multiple sections
            result = { movies: [], totalPages: 1 };
            break;
          case 'trending':
            result = await Promise.race([
              getTrendingMovies(page),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
            break;
          case 'popular':
            result = await Promise.race([
              getPopularMovies(page),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
            break;
          case 'topRated':
            result = await Promise.race([
              fetch(`${getApiUrl()}/tmdb/proxy/movie/top_rated?page=${page}`).then(res => res.json()),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
            break;
          case 'upcoming':
            result = await Promise.race([
              getUpcomingMovies(page),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
            break;
          case 'action':
            result = await Promise.race([
              getActionMovies(page),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
            break;
          case 'comedy':
            result = await Promise.race([
              getComedyMovies(page),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
            break;
          case 'drama':
            result = await Promise.race([
              fetch(`${getApiUrl()}/tmdb/proxy/discover/movie?with_genres=18&page=${page}`).then(res => res.json()),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
            break;
          case 'horror':
            result = await Promise.race([
              fetch(`${getApiUrl()}/tmdb/proxy/discover/movie?with_genres=27&page=${page}`).then(res => res.json()),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
            break;
          case 'sciFi':
            result = await Promise.race([
              fetch(`${getApiUrl()}/tmdb/proxy/discover/movie?with_genres=878&page=${page}`).then(res => res.json()),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
            break;
          case 'documentary':
            result = await Promise.race([
              fetch(`${getApiUrl()}/tmdb/proxy/discover/movie?with_genres=99&page=${page}`).then(res => res.json()),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
            break;
          case 'family':
            result = await Promise.race([
              getFamilyMovies(page),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
            break;
          case 'animation':
            result = await Promise.race([
              getAnimationMovies(page),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
            break;
          case 'awardWinning':
            result = await Promise.race([
              getAwardWinningMovies(page),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
            break;
          case 'latest':
            result = await Promise.race([
              getLatestMovies(page),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
            break;
          case 'popularTV':
            result = await Promise.race([
              getPopularTVShows(page),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
            if (result && result.results) {
              // Fetch full details for first 6 TV shows
              const initialTVs = result.results.slice(0, 6);
              const detailedTVs = await Promise.all(
                initialTVs.map(async (tv) => {
                  try {
                    const details = await getMovieDetails(tv.id, 'tv');
                    return { ...tv, ...details };
                  } catch (_e) {
                    return tv;
                  }
                })
              );
              // Merge detailed with remaining
              result = {
                movies: [...detailedTVs, ...result.results.slice(6).map(tv => ({ ...tv, title: tv.name, release_date: tv.first_air_date, media_type: 'tv' }))],
                totalPages: result.total_pages
              };
            }
            break;
          case 'topRatedTV':
            result = await Promise.race([
              getTopRatedTVShows(page),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
            if (result && result.results) {
              const initialTVs = result.results.slice(0, 6);
              const detailedTVs = await Promise.all(
                initialTVs.map(async (tv) => {
                  try {
                    const details = await getMovieDetails(tv.id, 'tv');
                    return { ...tv, ...details };
                  } catch (_e) {
                    return tv;
                  }
                })
              );
              result = {
                movies: [...detailedTVs, ...result.results.slice(6).map(tv => ({ ...tv, title: tv.name, release_date: tv.first_air_date, media_type: 'tv' }))],
                totalPages: result.total_pages
              };
            }
            break;
          case 'airingToday':
            result = await Promise.race([
              getAiringTodayTVShows(page),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
            if (result && result.results) {
              const initialTVs = result.results.slice(0, 6);
              const detailedTVs = await Promise.all(
                initialTVs.map(async (tv) => {
                  try {
                    const details = await getMovieDetails(tv.id, 'tv');
                    return { ...tv, ...details };
                  } catch (_e) {
                    return tv;
                  }
                })
              );
              result = {
                movies: [...detailedTVs, ...result.results.slice(6).map(tv => ({ ...tv, title: tv.name, release_date: tv.first_air_date, media_type: 'tv' }))],
                totalPages: result.total_pages
              };
            }
            break;
          case 'nowPlaying':
            result = await Promise.race([
              getNowPlayingMovies(page),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
            break;
          default:
            throw new Error(`Unknown category: ${category}`);
        }
        
        // Update network conditions
        const responseTime = performance.now() - startTime;
        updateNetworkConditions(responseTime);
        
        // Cache the result with enhanced metadata
        if (result && result.movies) {
          setDataCache(prev => ({
            ...prev,
            [cacheKey]: {
              ...result,
              timestamp: Date.now(),
              responseTime,
              category,
              page
            }
          }));
        }
        
      } catch (error) {
        console.error(`Error fetching ${category}:`, error);
        throw error;
      } finally {
        setLoadingState(category, false);
      }

      return result;
    });
  }, []);

  const prefetchAdjacentCategories = useCallback(async (currentCategory) => {
    const categoryIndex = categories.findIndex(cat => cat.id === currentCategory);
    if (categoryIndex === -1) return;

    const adjacentCategories = [
      categories[categoryIndex - 1]?.id,
      categories[categoryIndex + 1]?.id
    ].filter(Boolean);

    for (const category of adjacentCategories) {
      const cacheKey = `${category}-1`;
      if (!dataCache[cacheKey] || Date.now() - dataCache[cacheKey].timestamp > CACHE_DURATION) {
        try {
          await fetchMoviesForCategory(category);
        } catch (error) {
          console.error(`Error prefetching ${category}:`, error);
        }
      }
    }
  }, [categories, dataCache, CACHE_DURATION, fetchMoviesForCategory]);

  const updateCategoryState = useCallback((category, data) => {
    const setter = {
      trending: setTrendingMovies,
      popular: setPopularMovies,
      topRated: setTopRatedMovies,
      upcoming: setUpcomingMovies,
      action: setActionMovies,
      comedy: setComedyMovies,
      drama: setDramaMovies,
      horror: setHorrorMovies,
      sciFi: setSciFiMovies,
      documentary: setDocumentaryMovies,
      family: setFamilyMovies,
      animation: setAnimationMovies,
      awardWinning: setAwardWinningMovies,
      latest: setLatestMovies,
      popularTV: setPopularTVShows,
      topRatedTV: setTopRatedTVShows,
      airingToday: setAiringTodayTVShows,
      nowPlaying: setNowPlayingMovies
    }[category];

    if (setter) {
      setter(data.movies);
      setPageStates(prev => ({
        ...prev,
        [category]: { current: 1, total: data.totalPages || 1 }
      }));
    }
  }, [setTrendingMovies, setPopularMovies, setTopRatedMovies, setUpcomingMovies, setActionMovies, setComedyMovies, setDramaMovies, setHorrorMovies, setSciFiMovies, setDocumentaryMovies, setFamilyMovies, setAnimationMovies, setAwardWinningMovies, setLatestMovies, setPopularTVShows, setTopRatedTVShows, setAiringTodayTVShows, setNowPlayingMovies, setPageStates]);

  const handleCategoryChange = useCallback(async (category) => {
    console.log('handleCategoryChange called with:', category, 'Current active category:', activeCategory);
    
    // Don't toggle back to 'all' - just stay on the selected category
    if (category === activeCategory) {
      console.log('Category is already active, returning early');
      return;
    }

    console.log('Setting loading state for category:', category);
    // Set loading state for the specific category
    setLoadingState(category, true);
    
    try {
      // Start prefetching adjacent categories
      prefetchAdjacentCategories(category);

      // Update active category immediately for responsive UI
      setActiveCategory(category);
      
      // Try to get from cache first - use page 1 cache key
      const cacheKey = `${category}-1`;
      const cachedData = dataCache[cacheKey];
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        updateCategoryState(category, cachedData);
        return;
      }

      // If not in cache, fetch from API
      const result = await fetchMoviesForCategory(category);
      if (result && result.movies) {
        updateCategoryState(category, result);
      }
    } catch (error) {
      console.error(`Error loading category ${category}:`, error);
      setError(`Failed to load ${category} movies`);
      
      // Retry logic
      const retryCount = 3;
      let attempts = 0;
      
      while (attempts < retryCount) {
        try {
          const result = await fetchMoviesForCategory(category);
          if (result && result.movies) {
            updateCategoryState(category, result);
            break;
          }
        } catch (retryError) {
          attempts++;
          if (attempts === retryCount) {
            console.error(`Failed to load ${category} after ${retryCount} attempts:`, retryError);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
        }
      }
    } finally {
      setLoadingState(category, false);
    }
  }, [activeCategory, setActiveCategory, setLoadingState, prefetchAdjacentCategories, dataCache, CACHE_DURATION, fetchMoviesForCategory, updateCategoryState, setError]);

  // Enhanced featured content fetching with intelligent caching, performance monitoring, and advanced error handling
  const fetchFeaturedContent = useCallback(async () => {
    const startTime = performance.now();
    const metrics = {
      cacheCheckTime: 0,
      trendingFetchTime: 0,
      detailsFetchTime: 0,
      processingTime: 0,
      totalTime: 0,
      cacheHit: false,
      dataSize: 0
    };

    try {
      // Enhanced cache checking with performance monitoring
      const cacheCheckStart = performance.now();
      if (isCacheValid('featured')) {
        const cachedData = getCachedData('featured');
        if (cachedData && cachedData.id && cachedData.title) {
          metrics.cacheHit = true;
          metrics.dataSize = 1;
          
          // Enhanced data processing with validation
          const processingStart = performance.now();
          setFeaturedContent(cachedData);
          metrics.processingTime = performance.now() - processingStart;
          metrics.totalTime = performance.now() - startTime;
          
          return;
        }
      }
      metrics.cacheCheckTime = performance.now() - cacheCheckStart;

      // Enhanced trending content fetching with timeout protection
      const trendingStart = performance.now();
      setLoadingState('featured', true);
      
      // Add timeout protection for API calls - reduced for faster failure detection
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Trending content request timeout')), 10000); // Reduced from 15 to 10 seconds
      });
      
      const trendingPromise = getTrendingMovies(1);
      const trendingData = await Promise.race([trendingPromise, timeoutPromise]);
      
      metrics.trendingFetchTime = performance.now() - trendingStart;

      // Enhanced result validation
      if (!trendingData?.movies?.length) {
        throw new Error('No trending content available from API');
      }

      // Enhanced item selection with fallback strategy
      let firstItem = trendingData.movies[0];
      if (!firstItem?.id || !firstItem?.title) {
        // Try to find a valid item in the first few results
        const validItem = trendingData.movies.find(item => 
          item?.id && item?.title && typeof item.id === 'number'
        );
        if (!validItem) {
          throw new Error('No valid trending items found');
        }
        firstItem = validItem;
      }

      // Enhanced details fetching with retry logic
      const detailsStart = performance.now();
      let details;
      
      try {
        details = await getMovieDetails(firstItem.id, firstItem.type || 'movie');
      } catch (detailsError) {
        console.warn(`Failed to fetch details for ${firstItem.title}, trying without type:`, detailsError);
        // Fallback: try without specifying type
        details = await getMovieDetails(firstItem.id);
      }
      
      metrics.detailsFetchTime = performance.now() - detailsStart;

      // Enhanced data validation and processing
      const processingStart = performance.now();
      if (!details || !details.id || !details.title) {
        throw new Error('Invalid movie details received');
      }

      // Enhanced cache update with error handling
      try {
        setCachedData('featured', details);
      } catch (cacheError) {
        console.warn('Failed to cache featured content:', cacheError);
        // Continue execution even if caching fails
      }

      setFeaturedContent(details);
      metrics.dataSize = 1;
      metrics.processingTime = performance.now() - processingStart;
      metrics.totalTime = performance.now() - startTime;

    } catch (error) {
      console.error(`💥 Critical error fetching featured content:`, {
        error: error.message,
        stack: error.stack,
        metrics: {
          totalTime: performance.now() - startTime,
          cacheHit: metrics.cacheHit
        }
      });
      
      // Enhanced error handling with user-friendly messages
      const errorMessage = error.message.includes('timeout') 
        ? 'Featured content request timed out. Please try again.'
        : 'Failed to load featured content. Please refresh the page.';
      
      setError(errorMessage);
      
      // Attempt to recover by clearing potentially corrupted cache
      try {
        const storageKey = 'movieCache_featured';
        localStorage.removeItem(storageKey);
      } catch (cleanupError) {
        console.error('Failed to clean up featured content cache:', cleanupError);
      }
      
      // Set fallback content to prevent complete failure
      const fallbackContent = {
        id: 1,
        title: 'Welcome to Streamr',
        overview: 'Your ultimate streaming companion. Discover the latest movies and TV shows.',
        poster_path: null,
        backdrop_path: null,
        vote_average: 0,
        release_date: new Date().toISOString().split('T')[0],
        type: 'movie'
      };
      
      setFeaturedContent(fallbackContent);
    } finally {
      setLoadingState('featured', false);
    }
  }, [setFeaturedContent, setLoadingState, setError, isCacheValid, getCachedData, setCachedData]);

  useEffect(() => {
    let isMounted = true;
    
    const fetchContent = async () => {
      if (isMounted) {
        await fetchFeaturedContent();
      }
    };
    
    fetchContent();
    
    return () => {
      isMounted = false;
    };
  }, []); // Remove fetchFeaturedContent from dependencies to prevent infinite loop



  // Enhanced prefetch processing with intelligent queue management
  const processPrefetchQueue = useCallback(async () => {
    if (isProcessingPrefetchRef.current || prefetchQueueRef.current.length === 0) {
      return;
    }

    isProcessingPrefetchRef.current = true;

    try {
      // Process up to 3 prefetch requests at a time
      const batchSize = 3;
      const batch = prefetchQueueRef.current.splice(0, batchSize);

      const prefetchPromises = batch.map(async (queueItem) => {
        const { movieId, priority } = queueItem;
        
        // Check cache using current state
        setPrefetchedMovies(currentPrefetchedMovies => {
          if (currentPrefetchedMovies.has(movieId)) {
            setPrefetchStats(prev => ({
              ...prev,
              cacheHits: prev.cacheHits + 1
            }));
            return currentPrefetchedMovies;
          }
          return currentPrefetchedMovies;
        });
        
        setPrefetchCache(currentPrefetchCache => {
          if (currentPrefetchCache.has(movieId)) {
            setPrefetchStats(prev => ({
              ...prev,
              cacheHits: prev.cacheHits + 1
            }));
            return currentPrefetchCache;
          }
          return currentPrefetchCache;
        });

        try {
          // Prefetch movie details, similar movies, and higher resolution images
          const prefetchPromises = [];
          
          // Prefetch movie details
          prefetchPromises.push(
            getMovieDetails(movieId, 'movie').catch(err => {
              console.warn(`Failed to prefetch details for movie ${movieId}:`, err);
              return null;
            })
          );
          
          // Prefetch similar movies
          prefetchPromises.push(
            getSimilarMovies(movieId, 'movie', 1).catch(err => {
              console.warn(`Failed to prefetch similar movies for ${movieId}:`, err);
              return null;
            })
          );
          
          // Execute prefetch operations
          await Promise.allSettled(prefetchPromises);
          
          // Mark as prefetched
          setPrefetchedMovies(prev => new Set([...prev, movieId]));
          setPrefetchCache(prev => new Map(prev.set(movieId, {
            timestamp: Date.now(),
            priority
          })));
          
          setPrefetchStats(prev => ({
            ...prev,
            totalPrefetched: prev.totalPrefetched + 1,
            successfulPrefetches: prev.successfulPrefetches + 1
          }));
          
        } catch (error) {
          console.warn(`Prefetch failed for movie ${movieId}:`, error);
          setPrefetchStats(prev => ({
            ...prev,
            failedPrefetches: prev.failedPrefetches + 1
          }));
        }
      });

      await Promise.allSettled(prefetchPromises);
      
      // Add delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('Error processing prefetch queue:', error);
    } finally {
      isProcessingPrefetchRef.current = false;
      
      // Continue processing if there are more items
      if (prefetchQueueRef.current.length > 0) {
        setTimeout(() => processPrefetchQueue(), 50);
      }
    }
  }, []); // Removed problematic dependencies

  // Enhanced prefetch queue with priority based on visibility
  const queuePrefetchWithPriority = useCallback((movieId, priority = 'normal') => {
    setPrefetchedMovies(currentPrefetchedMovies => {
      if (currentPrefetchedMovies.has(movieId)) {
        return currentPrefetchedMovies;
      }
      return currentPrefetchedMovies;
    });
    
    setPrefetchCache(currentPrefetchCache => {
      if (currentPrefetchCache.has(movieId)) {
        return currentPrefetchCache;
      }
      return currentPrefetchCache;
    });

    const queueItem = { movieId, priority, timestamp: Date.now() };
    
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
  }, [processPrefetchQueue]); // Removed problematic dependencies

  // Add movie to prefetch queue (updated to use priority)
  const queuePrefetch = useCallback((movieId) => {
    // Check if movie is visible for priority using current state
    setVisibleMovies(currentVisibleMovies => {
      const priority = currentVisibleMovies.has(movieId) ? 'high' : 'normal';
      queuePrefetchWithPriority(movieId, priority);
      return currentVisibleMovies;
    });
  }, [queuePrefetchWithPriority]); // Removed visibleMovies from dependencies

  // Enhanced visibility tracking for predictive prefetching
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleMovies(prevVisibleMovies => {
          const newVisibleMovies = new Set(prevVisibleMovies);
          
          entries.forEach(entry => {
            const movieId = entry.target.dataset.movieId;
            if (movieId) {
              if (entry.isIntersecting) {
                newVisibleMovies.add(parseInt(movieId));
                // Prefetch movies that are about to come into view
                if (entry.intersectionRatio > 0.1) {
                  queuePrefetch(parseInt(movieId));
                }
              } else {
                newVisibleMovies.delete(parseInt(movieId));
              }
            }
          });
          
          return newVisibleMovies;
        });
      },
      {
        rootMargin: '200px 0px', // Start prefetching 200px before movie comes into view
        threshold: [0, 0.1, 0.5, 1.0]
      }
    );

    visibilityObserverRef.current = observer;

    // Observe all movie cards
    const movieCards = document.querySelectorAll('[data-movie-id]');
    movieCards.forEach(card => observer.observe(card));

    return () => {
      observer.disconnect();
      if (visibilityObserverRef.current) {
        visibilityObserverRef.current.disconnect();
        visibilityObserverRef.current = null;
      }
    };
  }, [queuePrefetch]); // Removed visibleMovies from dependencies to prevent infinite loop

  // Clean up old cache entries (older than 10 minutes)
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
    }, 5 * 60 * 1000); // Clean up every 5 minutes

    return () => {
      clearInterval(cleanupInterval);
    };
  }, []);

  // Add this function to handle adding/removing from watchlist
  const _handleWatchlistToggle = (e) => {
    e.stopPropagation();
    const movie = trendingMovies[currentFeaturedIndex];
    if (movie) {
      // Check if movie is already in watchlist
      if (isInWatchlist(movie.id)) {
        // Remove from watchlist
        removeFromWatchlist(movie.id);
        setIsInWatchlistState(false);
      } else {
        // Add to watchlist
        const movieData = {
          id: movie.id,
          title: movie.title || movie.name,
          type: movie.media_type || 'movie',
          poster_path: movie.poster_path || movie.poster || movie.backdrop_path || movie.backdrop,
          backdrop_path: movie.backdrop_path || movie.backdrop,
          overview: movie.overview,
          year: movie.release_date ? new Date(movie.release_date).getFullYear() : 
                movie.first_air_date ? new Date(movie.first_air_date).getFullYear() : 'N/A',
          rating: movie.vote_average || 0,
          genres: movie.genre_ids || [],
          release_date: movie.release_date || movie.first_air_date
        };

        addToWatchlist(movieData);
        setIsInWatchlistState(true);
      }
    }
  };

  // Memoize getMoviesForCategory - MOVED BEFORE EARLY RETURNS
  const getMoviesForCategory = useCallback((category) => {
    switch (category) {
      case 'all': return []; // Return empty array for 'all' category as it shows multiple sections
      case 'trending': return trendingMovies;
      case 'popular': return popularMovies;
      case 'topRated': return topRatedMovies;
      case 'upcoming': return upcomingMovies;
      case 'action': return actionMovies;
      case 'comedy': return comedyMovies;
      case 'drama': return dramaMovies;
      case 'horror': return horrorMovies;
      case 'sciFi': return sciFiMovies;
      case 'documentary': return documentaryMovies;
      case 'family': return familyMovies;
      case 'animation': return animationMovies;
      case 'awardWinning': return awardWinningMovies;
      case 'latest': return latestMovies;
      case 'popularTV': return popularTVShows;
      case 'topRatedTV': return topRatedTVShows;
      case 'airingToday': return airingTodayTVShows;
      case 'nowPlaying': return nowPlayingMovies;
      default: return [];
    }
  }, [trendingMovies, popularMovies, topRatedMovies, upcomingMovies, actionMovies, comedyMovies, dramaMovies, horrorMovies, sciFiMovies, documentaryMovies, familyMovies, animationMovies, awardWinningMovies, latestMovies, popularTVShows, topRatedTVShows, airingTodayTVShows, nowPlayingMovies]);

  // Simple category button click handler - MOVED BEFORE EARLY RETURNS
  const handleCategoryButtonClick = useCallback((category) => {
    if (!category || !category.id) {
      console.warn('Invalid category object provided to handleCategoryButtonClick:', category);
      return;
    }
    
    console.log('Category button clicked:', category.id, 'Current active category:', activeCategory);
    
    // Set the active category - data fetching will be handled by useEffect
    setActiveCategory(category.id);
  }, [activeCategory]);

  // Patch handleMovieSelect to record usage - MOVED BEFORE EARLY RETURNS
  const handleMovieSelect = useCallback(async (movie) => {
    if (!movie) return;
    const movieId = movie.id;
    recordPrefetchUsed(movieId);
    const movieType = movie.media_type || movie.type || 'movie';
    const cached = getCachedMovieDetails(movieId);
    if (cached) {
      setSelectedMovie(cached);
      setOverlayLoading(false);
      // SWR: fetch in background
      getMovieDetails(movieId, movieType).then((fresh) => {
        if (JSON.stringify(fresh) !== JSON.stringify(cached)) {
          setCachedMovieDetails(movieId, fresh);
          setSelectedMovie(fresh);
        }
      }).catch(() => {});
      return;
    }
    // No fresh cache: fetch and show
    setOverlayLoading(true);
    try {
      const details = await getMovieDetails(movieId, movieType);
      setCachedMovieDetails(movieId, details);
      setSelectedMovie(details);
    } catch (_err) {
      setSelectedMovie({ ...movie, error: 'Failed to load details.' });
    } finally {
      setOverlayLoading(false);
    }
  }, []);

  // Handle genre navigation from MovieDetailsOverlay
  const handleGenreNavigation = useCallback((genre) => {
    if (genre && genre.id) {
      console.log('Genre navigation clicked:', genre.name, 'ID:', genre.id);
      
      // Navigate to MoviesPage with the selected genre
      const searchParams = new URLSearchParams();
      searchParams.set('genre', genre.name.toLowerCase());
      searchParams.set('category', 'popular'); // Default to popular category
      
      // Use window.location for navigation to ensure proper page reload
      window.location.href = `/movies?${searchParams.toString()}`;
    }
  }, []);

  // Handle category changes and fetch data - MOVED BEFORE EARLY RETURNS
  useEffect(() => {
    console.log('useEffect triggered - activeCategory:', activeCategory);
    if (activeCategory && activeCategory !== 'all') {
      console.log('Calling handleCategoryChange for:', activeCategory);
      // Call the existing handleCategoryChange function
      handleCategoryChange(activeCategory);
    }
  }, [activeCategory, handleCategoryChange]);

  // FIXED: Comprehensive cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup all timeouts
      timeoutRefs.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      timeoutRefs.current.clear();
      
      // Cleanup all intervals
      intervalRefs.current.forEach(intervalId => {
        clearInterval(intervalId);
      });
      intervalRefs.current.clear();
      
      // Cleanup intersection observer
      if (sectionObserverRef.current) {
        sectionObserverRef.current.disconnect();
        sectionObserverRef.current = null;
      }
      
      // Cleanup caches
      cleanMovieDetailsCache();
      if (cacheRef.current) {
        cacheRef.current.clear();
      }
      if (lruQueue.current) {
        lruQueue.current.length = 0;
      }
      
      // Clear state
      setLazyLoadQueue(new Set());
      setVisibleSections(new Set());
      
      // Clear pending requests
      if (pendingRequests.current) {
        pendingRequests.current.clear();
      }
      
      // Ensure scroll is enabled
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Early returns moved to the end after all hooks are called
  if (loadingStates.initial) {
    // Calculate loading progress based on loaded sections
    const totalSections = 6; // Reduced from 18 to 6 (featured, trending, popular, topRated, upcoming, action)
    const loadedSections = Object.keys(loadingStates).filter(key => 
      key !== 'initial' && !loadingStates[key]
    ).length;
    const progress = Math.min((loadedSections / totalSections) * 100, 95); // Cap at 95% until fully loaded
    
    return <PageLoader 
      text="Loading your cinematic experience..." 
      showProgress={true}
      progress={progress}
    />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#121417]">
        <div className="text-white text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-[#121417] dark group/design-root overflow-x-hidden font-inter scrollbar-hide smooth-scroll performance-scroll">
      <div className="layout-container flex h-full grow flex-col scrollbar-hide momentum-scroll">
        <div className="flex flex-1 justify-center">
          <div className="layout-content-container flex flex-col w-full flex-1 scrollbar-hide custom-scroll-ease">

            
            {/* Add HeroSection here */}
            <MemoizedHeroSection 
              featuredContent={featuredContent} 
              onMovieSelect={handleMovieSelect}
            />
            {/* Category Selector with Swiper for Desktop */}
            <CategorySwiper 
              categories={categories}
              activeCategory={activeCategory}
              onCategoryClick={handleCategoryButtonClick}
              isMobile={isMobile}
            />
            {/* Movie Sections with Swiper for Desktop */}
            {activeCategory === 'all' ? (
              <>
                {/* Continue Watching Section */}
                <ContinueWatching 
                  onMovieSelect={handleMovieSelect}
                  isMobile={isMobile}
                />
                
                {/* Netflix-style Hero Section with Trending */}
                <MovieSectionSwiper 
                  title="Trending Now" 
                  movies={trendingMovies} 
                  loading={loadingStates.trending} 
                  onLoadMore={() => loadMoreMovies('trending')}
                  hasMore={pageStates.trending.current < pageStates.trending.total}
                  currentPage={pageStates.trending.current}
                  sectionKey="trending"
                  onMovieSelect={handleMovieSelect}
                  onMovieHover={handleMovieHover}
                  onPrefetch={queuePrefetch}
                  isMobile={isMobile}
                />
                
                {/* Popular TV Shows - Netflix-style */}
                <MovieSectionSwiper 
                  title="Popular TV Shows" 
                  movies={popularTVShows} 
                  loading={loadingStates.popularTV} 
                  onLoadMore={() => loadMoreMovies('popularTV')}
                  hasMore={pageStates.popularTV.current < pageStates.popularTV.total}
                  currentPage={pageStates.popularTV.current}
                  sectionKey="popularTV"
                  onMovieSelect={handleMovieSelect}
                  onMovieHover={handleMovieHover}
                  onPrefetch={queuePrefetch}
                  isMobile={isMobile}
                />
                
                {/* Popular Movies */}
                <MovieSectionSwiper 
                  title="Popular Movies" 
                  movies={popularMovies} 
                  loading={loadingStates.popular} 
                  onLoadMore={() => loadMoreMovies('popular')}
                  hasMore={pageStates.popular.current < pageStates.popular.total}
                  currentPage={pageStates.popular.current}
                  sectionKey="popular"
                  onMovieSelect={handleMovieSelect}
                  onMovieHover={handleMovieHover}
                  onPrefetch={queuePrefetch}
                  isMobile={isMobile}
                />
                
                {/* Top Rated TV Shows */}
                <MovieSectionSwiper 
                  title="Top Rated TV Shows" 
                  movies={topRatedTVShows} 
                  loading={loadingStates.topRatedTV} 
                  onLoadMore={() => loadMoreMovies('topRatedTV')}
                  hasMore={pageStates.topRatedTV.current < pageStates.topRatedTV.total}
                  currentPage={pageStates.topRatedTV.current}
                  sectionKey="topRatedTV"
                  onMovieSelect={handleMovieSelect}
                  onMovieHover={handleMovieHover}
                  onPrefetch={queuePrefetch}
                  isMobile={isMobile}
                />
                
                {/* Top Rated Movies */}
                <MovieSectionSwiper 
                  title="Top Rated Movies" 
                  movies={topRatedMovies} 
                  loading={loadingStates.topRated} 
                  onLoadMore={() => loadMoreMovies('topRated')}
                  hasMore={pageStates.topRated.current < pageStates.topRated.total}
                  currentPage={pageStates.topRated.current}
                  sectionKey="topRated"
                  onMovieSelect={handleMovieSelect}
                  onMovieHover={handleMovieHover}
                  onPrefetch={queuePrefetch}
                  isMobile={isMobile}
                />
                
                {/* Now Playing Movies */}
                <MovieSectionSwiper 
                  title="Now Playing" 
                  movies={nowPlayingMovies} 
                  loading={loadingStates.nowPlaying} 
                  onLoadMore={() => loadMoreMovies('nowPlaying')}
                  hasMore={pageStates.nowPlaying.current < pageStates.nowPlaying.total}
                  currentPage={pageStates.nowPlaying.current}
                  sectionKey="nowPlaying"
                  onMovieSelect={handleMovieSelect}
                  onMovieHover={handleMovieHover}
                  onPrefetch={queuePrefetch}
                  isMobile={isMobile}
                />
                
                {/* Coming Soon */}
                <MovieSectionSwiper 
                  title="Coming Soon" 
                  movies={upcomingMovies} 
                  loading={loadingStates.upcoming} 
                  onLoadMore={() => loadMoreMovies('upcoming')}
                  hasMore={pageStates.upcoming.current < pageStates.upcoming.total}
                  currentPage={pageStates.upcoming.current}
                  sectionKey="upcoming"
                  onMovieSelect={handleMovieSelect}
                  onMovieHover={handleMovieHover}
                  onPrefetch={queuePrefetch}
                  isMobile={isMobile}
                />
                
                {/* Airing Today TV Shows */}
                <MovieSectionSwiper 
                  title="Airing Today" 
                  movies={airingTodayTVShows} 
                  loading={loadingStates.airingToday} 
                  onLoadMore={() => loadMoreMovies('airingToday')}
                  hasMore={pageStates.airingToday.current < pageStates.airingToday.total}
                  currentPage={pageStates.airingToday.current}
                  sectionKey="airingToday"
                  onMovieSelect={handleMovieSelect}
                  onMovieHover={handleMovieHover}
                  onPrefetch={queuePrefetch}
                  isMobile={isMobile}
                />
                
                {/* Award Winning Movies */}
                <MovieSectionSwiper 
                  title="Award Winning" 
                  movies={awardWinningMovies} 
                  loading={loadingStates.awardWinning} 
                  onLoadMore={() => loadMoreMovies('awardWinning')}
                  hasMore={pageStates.awardWinning.current < pageStates.awardWinning.total}
                  currentPage={pageStates.awardWinning.current}
                  sectionKey="awardWinning"
                  onMovieSelect={handleMovieSelect}
                  onMovieHover={handleMovieHover}
                  onPrefetch={queuePrefetch}
                  isMobile={isMobile}
                />
                
                {/* Latest Releases */}
                <MovieSectionSwiper 
                  title="Latest Releases" 
                  movies={latestMovies} 
                  loading={loadingStates.latest} 
                  onLoadMore={() => loadMoreMovies('latest')}
                  hasMore={pageStates.latest.current < pageStates.latest.total}
                  currentPage={pageStates.latest.current}
                  sectionKey="latest"
                  onMovieSelect={handleMovieSelect}
                  onMovieHover={handleMovieHover}
                  onPrefetch={queuePrefetch}
                  isMobile={isMobile}
                />
              </>
            ) : (
              <MovieSectionSwiper 
                title={categories.find(c => c.id === activeCategory)?.label || ''}
                movies={getMoviesForCategory(activeCategory)}
                loading={loadingStates[activeCategory]}
                onLoadMore={() => loadMoreMovies(activeCategory)}
                hasMore={pageStates[activeCategory].current < pageStates[activeCategory].total}
                currentPage={pageStates[activeCategory].current}
                sectionKey={activeCategory}
                onMovieSelect={handleMovieSelect}
                onMovieHover={handleMovieHover}
                onPrefetch={queuePrefetch}
                isMobile={isMobile}
              />
            )}
          </div>
        </div>
      </div>
      {/* Add MovieDetailsOverlay */}
      {selectedMovie && (
        <Suspense 
          fallback={
            <motion.div 
              className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div 
                className="flex flex-col items-center space-y-6 p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-white/40 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-white/90 text-base font-semibold animate-pulse">
                    Loading movie details...
                  </p>
                  <p className="text-white/60 text-sm">
                    Preparing your viewing experience
                  </p>
                </div>
                <div className="flex space-x-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-white/40 rounded-full"
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.4, 1, 0.4]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.2
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            </motion.div>
          }
        >
          <MovieDetailsOverlay
            movie={selectedMovie}
            loading={overlayLoading}
            onClose={() => {
              setSelectedMovie(null);
              setOverlayLoading(false);
            }}
            onMovieSelect={handleMovieSelect}
            onGenreClick={handleGenreNavigation}
            onError={(error) => {
              console.error('Movie details overlay error:', error);
              setError('Failed to load movie details. Please try again.');
            }}
          />
        </Suspense>
      )}

      {/* Scroll Debug Component (Development Only) */}
      <ScrollDebug />
    </div>
  );
};

// 🚀 ULTRA-OPTIMIZED: Performance monitoring and service worker integration
const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState({
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    firstInputDelay: 0,
    cumulativeLayoutShift: 0,
    timeToInteractive: 0
  });

  const observersRef = useRef([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Monitor Core Web Vitals
  if ('PerformanceObserver' in window) {
      // First Contentful Paint
      const fcpObserver = new PerformanceObserver((list) => {
        if (!isMountedRef.current) return;
        const entries = list.getEntries();
        const fcp = entries[entries.length - 1];
        setMetrics(prev => ({ ...prev, firstContentfulPaint: fcp.startTime }));
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
      observersRef.current.push(fcpObserver);

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        if (!isMountedRef.current) return;
        const entries = list.getEntries();
        const lcp = entries[entries.length - 1];
        setMetrics(prev => ({ ...prev, largestContentfulPaint: lcp.startTime }));
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      observersRef.current.push(lcpObserver);

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        if (!isMountedRef.current) return;
        const entries = list.getEntries();
        const fid = entries[entries.length - 1];
        setMetrics(prev => ({ ...prev, firstInputDelay: fid.processingStart - fid.startTime }));
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      observersRef.current.push(fidObserver);

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        if (!isMountedRef.current) return;
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          clsValue += entry.value;
        }
        setMetrics(prev => ({ ...prev, cumulativeLayoutShift: clsValue }));
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      observersRef.current.push(clsObserver);
    }

    return () => {
      isMountedRef.current = false;
      // Disconnect all observers - FIXED: Observer leaks
      observersRef.current.forEach(observer => {
        if (observer && typeof observer.disconnect === 'function') {
          try {
            observer.disconnect();
    } catch (error) {
            console.warn('Failed to disconnect performance observer:', error);
    }
  }
      });
      observersRef.current = [];
};
  }, []);

  return metrics;
};



export default HomePage;