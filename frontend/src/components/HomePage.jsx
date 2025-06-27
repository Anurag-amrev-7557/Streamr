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
import MovieDetailsOverlay from './MovieDetailsOverlay';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactPlayer from 'react-player';
import { useState as useToastState } from 'react';
import MinimalToast from './MinimalToast';
// Step 7: Background data refresh for movies in viewport
import { debounce as lodashDebounce } from 'lodash';

// Add custom styles for Swiper navigation
const swiperStyles = `
  .swiper-button-next,
  .swiper-button-prev {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 32px !important;
    height: 32px !important;
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 9999px !important;
    transition: all 0.3s ease !important;
    z-index: 10 !important;
    cursor: pointer !important;
  }

  .swiper-button-next:hover,
  .swiper-button-prev:hover {
    background: rgba(255, 255, 255, 0.1) !important;
  }

  .swiper-button-next::after,
  .swiper-button-prev::after {
    font-size: 14px !important;
    font-weight: bold !important;
    color: white !important;
  }

  .swiper-button-disabled {
    opacity: 0.35 !important;
    cursor: auto !important;
    pointer-events: none !important;
  }

  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
    -webkit-overflow-scrolling: touch;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }
`;

const ProgressiveImage = memo(({ src, alt, className, style, aspectRatio = "16/10" }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(null);
  const imageRef = useRef(null);

  useEffect(() => {
    if (src) {
      // Start with a tiny version of the image
      const tinySrc = src.replace('/w500', '/w92');
      setCurrentSrc(tinySrc);

      // Load the full image in the background
      const fullImage = new Image();
      fullImage.src = src;
      fullImage.onload = () => {
        setCurrentSrc(src);
        setImageLoaded(true);
      };
      fullImage.onerror = () => {
        setImageError(true);
      };
    }
  }, [src]);

  return (
    <div 
      className={`relative ${className}`}
      style={{ 
        aspectRatio,
        ...style
      }}
    >
      {/* Loading Placeholder */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br from-[#1a1d24] to-[#2b3036] transition-opacity duration-500 ${
          imageLoaded ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_2s_infinite]"></div>
      </div>

      {/* Tiny Image (Blurred) */}
      {currentSrc && !imageError && (
        <div
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 ${
            imageLoaded ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ 
            backgroundImage: `url("${currentSrc}")`,
            filter: 'blur(10px)',
            transform: 'scale(1.1)'
          }}
        />
      )}

      {/* Full Image */}
      {!imageError && (
        <div
          className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ${
            imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
          style={{ 
            backgroundImage: currentSrc ? `url("${currentSrc}")` : 'none',
            backgroundPosition: 'center 20%',
            imageRendering: 'optimizeQuality',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
            WebkitFontSmoothing: 'antialiased',
            WebkitTransform: 'translate3d(0,0,0)',
          }}
        />
      )}

      {/* Error Fallback */}
      {imageError && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1d24] to-[#2b3036] flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
    </div>
  );
});

const MovieCard = memo(({ title, type, image, backdrop, episodes, seasons, rating, year, duration, runtime, onClick, id, prefetching, cardClassName, poster_path, backdrop_path, overview, genres, release_date, first_air_date, vote_average, media_type }) => {
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const [isInWatchlistState, setIsInWatchlistState] = useState(false);

  useEffect(() => {
    setIsInWatchlistState(isInWatchlist(id));
  }, [id, isInWatchlist]);

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
        poster_path: poster_path || image || backdrop || '',
        backdrop_path: backdrop_path || backdrop || '',
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

  return (
    <div className={`group flex flex-col gap-4 rounded-lg w-80 ${cardClassName}`}>
      <div className="relative aspect-[16/10] rounded-lg overflow-hidden transform-gpu transition-all duration-300 md:group-hover:scale-[1.02] md:group-hover:shadow-2xl md:group-hover:shadow-black/20">
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
        >
          <ProgressiveImage
            src={backdrop || image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 md:group-hover:scale-110"
            aspectRatio="16/10"
          />
          {/* Movie info overlay */}
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

const MovieSection = memo(({ title, movies, loading, onLoadMore, hasMore, currentPage, sectionKey, onMovieSelect, onMovieHover }) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isViewAllMode, setIsViewAllMode] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const swiperRef = useRef(null);
  const holdTimerRef = useRef(null);
  const isHoldingRef = useRef(false);
  const scrollContainerRef = useRef(null);
  const loadingRef = useRef(false);
  const preloadTriggeredRef = useRef(false);
  const preloadTimeoutRef = useRef(null);
  const { setLoadingState } = useLoading();
  const navigate = useNavigate();
  const gridContainerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const preloadedPagesRef = useRef(new Set());

  // Step 9: Track prefetching state for user feedback
  const [prefetchingIds, setPrefetchingIds] = useState([]);

  // Progressive preloading based on scroll position
  const preloadNextPages = useCallback(async () => {
    if (!hasMore || isLoadingMore || preloadTriggeredRef.current) return;

    const nextPage = currentPage + 1;
    if (preloadedPagesRef.current.has(nextPage)) return;

    preloadTriggeredRef.current = true;
    try {
      await onLoadMore(sectionKey);
      preloadedPagesRef.current.add(nextPage);
    } catch (error) {
      console.error('Error preloading next page:', error);
    } finally {
      preloadTriggeredRef.current = false;
    }
  }, [hasMore, isLoadingMore, currentPage, onLoadMore, sectionKey]);

  // Enhanced scroll handler with progressive preloading
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

  // Cleanup function for view mode changes
  const cleanupViewMode = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    if (swiperRef.current?.swiper) {
      swiperRef.current.swiper.update();
    }
    // Reset preload states
    preloadedPagesRef.current = new Set();
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }
  };

  // Handle view mode change with improved transition
  const handleViewAll = () => {
    setIsTransitioning(true);
    
    if (!isViewAllMode) {
      setIsViewAllMode(true);
      // Preload next page when switching to grid view
      if (hasMore && !preloadedPagesRef.current.has(currentPage + 1)) {
        preloadNextPages();
      }
      setTimeout(() => {
        const sectionElement = document.getElementById(`section-${sectionKey}`);
        if (sectionElement) {
          sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      cleanupViewMode();
      setIsViewAllMode(false);
    }
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 400);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleReachEnd = async () => {
    if (loadingRef.current || !hasMore || isLoadingMore) return;
    
    loadingRef.current = true;
    setIsLoadingMore(true);
    
    try {
      await onLoadMore(sectionKey);
    } catch (error) {
      console.error('Error loading more movies:', error);
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
    }
  };

  // Reset loading states when view mode changes
  useEffect(() => {
    loadingRef.current = false;
    setIsLoadingMore(false);
    preloadTriggeredRef.current = false;
  }, [isViewAllMode]);

  const handlePrevButtonMouseDown = () => {
    isHoldingRef.current = true;
    holdTimerRef.current = setTimeout(() => {
      if (isHoldingRef.current && swiperRef.current?.swiper) {
        swiperRef.current.swiper.slideTo(0, 500);
      }
    }, 500); // Hold for 500ms to trigger
  };

  const handlePrevButtonMouseUp = () => {
    isHoldingRef.current = false;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }
  };

  if (loading && !movies.length) {
    return (
      <div className="mb-16">
        <div className="flex items-center justify-between px-4 pb-6 pt-8">
          <h2 className="text-white text-2xl font-bold leading-tight tracking-[-0.02em]">{title}</h2>
        </div>
        <div className="relative px-8 pt-2">
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
            {[...Array(6)].map((_, index) => (
              <CardLoader key={`loader-${sectionKey}-${index}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id={`section-${sectionKey}`} className="mb-10 group/section">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 pb-6 pt-8 gap-2 sm:gap-0">
        <div className="flex flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <h2 className="text-white/80 leading-relaxed pl-0 sm:pl-6 text-lg sm:text-2xl font-bold leading-tight tracking-[-0.02em] group-hover/section:text-[#a1abb5] transition-colors duration-300 whitespace-nowrap">{title}</h2>
          <span className="h-4 w-[1px] bg-white/10 group-hover/section:bg-white/20 transition-colors duration-300 hidden sm:inline-block"></span>
          <span className="text-white/50 text-xs sm:text-sm font-medium group-hover/section:text-white/70 transition-colors duration-300 truncate">
            {isViewAllMode ? 'Scroll to explore' : (movies.length > 1 ? 'Swipe to explore' : 'Swipe to view')}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-end">
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
      <div className="relative px-8 pt-2">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#121417] to-transparent z-10 pointer-events-none"></div>
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#121417] to-transparent z-10 pointer-events-none"></div>
        <div 
          className={`transition-all duration-400 ease-in-out transform ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
          style={{ willChange: 'transform, opacity' }}
        >
          {isViewAllMode ? (
            <div 
              ref={scrollContainerRef}
              className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 max-h-[600px] overflow-y-auto overflow-x-hidden w-full sm:px-4 scrollbar-hide justify-items-center`}
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: isScrolling ? 'rgba(255, 255, 255, 0.2) transparent' : 'rgba(255, 255, 255, 0.1) transparent',
                scrollBehavior: 'smooth',
                overscrollBehavior: 'contain',
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
                  className="scroll-snap-align-start w-full max-w-xs mx-auto"
                  style={{ willChange: 'transform', maxWidth: '100vw' }}
                  onMouseEnter={() => onMovieHover && onMovieHover(movie, index, movies)}
                >
                  <MovieCard 
                    {...movie} 
                    onClick={() => onMovieSelect(movie)} 
                    id={movie.id}
                    priority={index < 10} // Prioritize loading for first 10 items
                    prefetching={prefetchingIds.includes(movie.id)}
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
            <div className="swiper-container">
              <Swiper
                ref={swiperRef}
                modules={[Navigation, A11y]}
                spaceBetween={24}
                slidesPerView="auto"
                breakpoints={{
                  0: {
                    slidesPerView: 1,
                    spaceBetween: 8,
                    speed: 350, // Ultra smooth, slightly slower for mobile
                    touchRatio: 1.25,
                    touchAngle: 70,
                    freeMode: true,
                    resistance: false,
                    resistanceRatio: 0,
                    grabCursor: true,
                    navigation: false,
                    style: {
                      '--swiper-wrapper-transition-timing-function': 'cubic-bezier(0.22, 1, 0.36, 1)', // Soft, natural
                      'scroll-behavior': 'smooth',
                      'will-change': 'transform',
                    },
                  },
                  320: { slidesPerView: 1, spaceBetween: 8 },
                  480: { slidesPerView: 1.2, spaceBetween: 8 },
                  640: {
                    slidesPerView: 2,
                    spaceBetween: 16,
                    speed: 1000,
                    touchRatio: 1,
                    touchAngle: 45,
                    freeMode: true,
                    resistance: true,
                    resistanceRatio: 0.7,
                    grabCursor: true,
                    navigation: {
                      nextEl: '.swiper-button-next',
                      prevEl: '.swiper-button-prev',
                      disabledClass: 'swiper-button-disabled',
                      lockClass: 'swiper-button-lock',
                      hiddenClass: 'swiper-button-hidden',
                    },
                    style: {
                      '--swiper-wrapper-transition-timing-function': 'cubic-bezier(0.4, 0, 0.2, 1)',
                      'will-change': 'transform',
                    },
                  },
                  768: {
                    slidesPerView: 3,
                    spaceBetween: 20,
                    speed: 1000,
                    touchRatio: 1,
                    touchAngle: 45,
                    freeMode: true,
                    resistance: true,
                    resistanceRatio: 0.7,
                    grabCursor: true,
                    navigation: {
                      nextEl: '.swiper-button-next',
                      prevEl: '.swiper-button-prev',
                      disabledClass: 'swiper-button-disabled',
                      lockClass: 'swiper-button-lock',
                      hiddenClass: 'swiper-button-hidden',
                    },
                    style: {
                      '--swiper-wrapper-transition-timing-function': 'cubic-bezier(0.4, 0, 0.2, 1)',
                      'will-change': 'transform',
                    },
                  },
                  1024: { slidesPerView: 4, spaceBetween: 24 },
                  1280: { slidesPerView: 5, spaceBetween: 24 },
                }}
                speed={1000}
                resistance={true}
                resistanceRatio={0.7}
                touchRatio={1}
                touchAngle={45}
                touchMoveStopPropagation={true}
                watchSlidesProgress={true}
                grabCursor={true}
                freeMode={true}
                onReachEnd={handleReachEnd}
                onSlideChange={(swiper) => {
                  // Prefetch when we're 3 slides away from the end
                  const remainingSlides = swiper.slides.length - (swiper.activeIndex + swiper.params.slidesPerView);
                  if (remainingSlides <= 3 && !isLoadingMore && hasMore) {
                    handleReachEnd();
                  }
                }}
                onProgress={(swiper, progress) => {
                  // Prefetch when we're 80% through the current set of slides
                  if (progress > 0.8 && !isLoadingMore && hasMore) {
                    handleReachEnd();
                  }
                }}
                onTouchStart={() => {
                  // Prefetch next set of slides when user starts scrolling
                  if (!isLoadingMore && hasMore) {
                    handleReachEnd();
                  }
                }}
                className="px-2 sm:px-4"
                observer={true}
                observeParents={true}
                updateOnWindowResize={true}
                lazy={{
                  loadPrevNext: true,
                  loadPrevNextAmount: 3,
                  loadOnTransitionStart: true,
                }}
              >
                {movies.map((movie, index) => (
                  <SwiperSlide key={`${sectionKey}-${movie.id}-${index}`} className="!w-full sm:!w-auto">
                    <div onMouseEnter={() => onMovieHover && onMovieHover(movie, index, movies)}>
                      <MovieCard {...movie} onClick={() => onMovieSelect(movie)} id={movie.id} cardClassName="w-full max-w-xs sm:w-80" />
                    </div>
                  </SwiperSlide>
                ))}
                {isLoadingMore && (
                  <SwiperSlide key={`${sectionKey}-loading-more`} className="!w-full sm:!w-auto">
                    <div className="group flex flex-col gap-4 rounded-lg w-full max-w-xs sm:w-80">
                      <div className="relative aspect-[16/10] rounded-lg overflow-hidden bg-black/20">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                )}
                {window.innerWidth > 768 && (
                  <div 
                    className="swiper-button-prev !w-10 !h-10 !bg-white/5 hover:!bg-white/10 !rounded-full !border !border-white/10 !transition-all !duration-300 opacity-0 group-hover/section:opacity-100 !-left-0 !-translate-y-1/2 !top-[35%] !m-0 after:!text-white after:!text-sm after:!font-bold !z-10 hover:!scale-110 hover:!shadow-lg hover:!shadow-black/20"
                    onMouseDown={handlePrevButtonMouseDown}
                    onMouseUp={handlePrevButtonMouseUp}
                    onMouseLeave={handlePrevButtonMouseUp}
                    onTouchStart={handlePrevButtonMouseDown}
                    onTouchEnd={handlePrevButtonMouseUp}
                  ></div>
                )}
                {window.innerWidth > 768 && (
                  <div className="swiper-button-next !w-10 !h-10 !bg-white/5 hover:!bg-white/10 !rounded-full !border !border-white/10 !transition-all !duration-300 opacity-0 group-hover/section:opacity-100 !-right-0 !-translate-y-1/2 !top-[35%] !m-0 after:!text-white after:!text-sm after:!font-bold !z-10 hover:!scale-110 hover:!shadow-lg hover:!shadow-black/20"></div>
                )}
              </Swiper>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Add debounce utility function at the top of the file, after imports
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const HeroSection = ({ featuredContent, onMovieSelect }) => {
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const heroRef = useRef(null);
  const [parallaxTarget, setParallaxTarget] = useState({ x: 0, y: 0 });
  const parallaxAnimRef = useRef();
  const [toast, setToast] = useToastState(null);

  const isMovieInWatchlist = featuredContent ? isInWatchlist(featuredContent.id) : false;

  // Ultra-smooth parallax effect
  useEffect(() => {
    let running = true;
    function lerp(a, b, t) { return a + (b - a) * t; }
    function animate() {
      setParallax(prev => {
        const nx = lerp(prev.x, parallaxTarget.x, 0.12);
        const ny = lerp(prev.y, parallaxTarget.y, 0.12);
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
      if (parallaxAnimRef.current) cancelAnimationFrame(parallaxAnimRef.current);
    };
  }, [parallaxTarget.x, parallaxTarget.y]);

  const handleMouseMove = (e) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2; // -1 to 1
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setParallaxTarget({ x, y });
  };
  const handleMouseLeave = () => setParallaxTarget({ x: 0, y: 0 });

  const handleWatchlistClick = (e) => {
    e.stopPropagation();
    if (!featuredContent) return;
    if (isMovieInWatchlist) {
      removeFromWatchlist(featuredContent.id);
      setToast({ type: 'remove', message: 'Removed from Watchlist' });
    } else {
      // Standardized movie data for watchlist (matches MoviesPage/Navbar)
      const release = featuredContent.release_date || featuredContent.first_air_date || '';
      let computedYear = 'N/A';
      if (release) {
        const parsedYear = new Date(release).getFullYear();
        if (!isNaN(parsedYear)) computedYear = parsedYear;
      }
      const movieData = {
        id: featuredContent.id,
        title: featuredContent.title || '',
        type: featuredContent.type || 'movie',
        poster_path: featuredContent.poster_path || featuredContent.backdrop || '',
        backdrop_path: featuredContent.backdrop || '',
        overview: featuredContent.overview || '',
        year: computedYear,
        rating: typeof featuredContent.rating === 'number' ? featuredContent.rating : (typeof featuredContent.rating === 'string' ? parseFloat(featuredContent.rating) : 0),
        genres: featuredContent.genres || [],
        release_date: release,
        addedAt: new Date().toISOString(),
      };
      addToWatchlist(movieData);
      setToast({ type: 'add', message: 'Added to Watchlist' });
    }
    setTimeout(() => setToast(null), 1800);
  };

  if (!featuredContent) return null;

  // Animation variants
  const titleVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } }
  };
  const logoVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: 'easeOut' } }
  };
  const genreChipVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i) => ({ opacity: 1, y: 0, transition: { delay: 0.2 + i * 0.08, duration: 0.4 } })
  };

  // Parallax style
  const parallaxStyle = {
    transform: `scale(1.05) translate3d(${parallax.x * 20}px, ${parallax.y * 12}px, 0)`
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
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30' 
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
                  playing
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
};

// Memoize categories outside the component
const categoriesList = [
  { id: 'all', label: 'All', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
  ) },
  { id: 'trending', label: 'Trending', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
  ) },
  { id: 'popular', label: 'Popular', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
  ) },
  { id: 'topRated', label: 'Top Rated', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
  ) },
  { id: 'upcoming', label: 'Coming Soon', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
  ) },
  { id: 'action', label: 'Action', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M13 4v2.67l-1 1-1-1V4h2m7 7v2h-2.67l-1-1 1-1H20M6.67 11l1 1-1 1H4v-2h2.67M12 16.33l1 1V20h-2v-2.67l1-1M15 2H9v5.5l3 3 3-3V2zm7 7h-5.5l-3 3 3 3H22V9zM7.5 9H2v6h5.5l3-3-3-3zm4.5 4.5l-3 3V22h6v-5.5l-3-3z"/></svg>
  ) },
  { id: 'comedy', label: 'Comedy', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
  ) },
  { id: 'drama', label: 'Drama', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.87 0-7-3.59-7-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v3H8v2h3v3h2v-3h3v-2h-3V8z"/></svg>
  ) },
  { id: 'horror', label: 'Horror', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
  ) },
  { id: 'sciFi', label: 'Sci-Fi', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
  ) },
  { id: 'documentary', label: 'Documentary', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM7 10h5v5H7z"/></svg>
  ) },
  { id: 'family', label: 'Family', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm0 6v6h2v-6H8zm8-6c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm0 6v6h2v-6h-2z"/></svg>
  ) },
  { id: 'animation', label: 'Animation', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
  ) },
  { id: 'awardWinning', label: 'Award Winning', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.2 2H20H17V0H7v2H4.5H3.8H2v5h1.1l1.5 10.3c0 .7.6 1.2 1.3 1.2h12.2c.7 0 1.3-.5 1.3-1.2L20.9 7H22V2h-1.8zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6-9H6l-1-4h14l-1 4z"/></svg>
  ) },
  { id: 'latest', label: 'Latest', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
  ) }
];

// Memoize MovieSection and HeroSection
const MemoizedMovieSection = memo(MovieSection);
const MemoizedHeroSection = memo(HeroSection);

// Lazy-load MovieDetailsOverlay
const LazyMovieDetailsOverlay = lazy(() => import('./MovieDetailsOverlay'));

const MOVIE_DETAILS_TTL = 60 * 60 * 1000; // 1 hour
const MOVIE_DETAILS_CACHE_LIMIT = 100;

const HomePage = () => {
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
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');
  const { loadingStates, setLoadingState } = useLoading();

  // Add new state for TV shows and now playing movies
  const [popularTVShows, setPopularTVShows] = useState([]);
  const [topRatedTVShows, setTopRatedTVShows] = useState([]);
  const [airingTodayTVShows, setAiringTodayTVShows] = useState([]);
  const [nowPlayingMovies, setNowPlayingMovies] = useState([]);

  const { addToWatchlist, isInWatchlist, removeFromWatchlist } = useWatchlist();
  const [isInWatchlistState, setIsInWatchlistState] = useState(false);

  // Add cache state
  const [dataCache, setDataCache] = useState({});
  const [featuredContent, setFeaturedContent] = useState(null);
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
  const MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5 MB

  // Add priority levels for sections
  const SECTION_PRIORITIES = {
    HIGH: ['trending', 'popular', 'topRated'],
    MEDIUM: ['upcoming', 'action', 'comedy', 'drama'],
    LOW: ['horror', 'sciFi', 'documentary', 'family', 'animation', 'awardWinning', 'latest', 'popularTV', 'topRatedTV', 'airingToday', 'nowPlaying']
  };

  // Improved cache cleanup function
  const cleanupCache = useCallback(() => {
    try {
      const cacheItems = [];
      let totalSize = 0;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('movieCache_')) {
          const item = localStorage.getItem(key);
          try {
            const parsed = JSON.parse(item);
            const itemSize = item.length;
            totalSize += itemSize;
            cacheItems.push({ key, timestamp: parsed.timestamp, size: itemSize });
          } catch (e) {
            // Ignore items that can't be parsed
          }
        }
      }

      if (totalSize > MAX_CACHE_SIZE) {
        cacheItems.sort((a, b) => a.timestamp - b.timestamp); // Sort oldest first
        
        let removedCount = 0;
        while (totalSize > MAX_CACHE_SIZE * 0.8 && cacheItems.length > 0) {
          const itemToRemove = cacheItems.shift();
          localStorage.removeItem(itemToRemove.key);
          totalSize -= itemToRemove.size;
          removedCount++;
        }
      }
    } catch (error) {
      console.error('Error during cache cleanup:', error);
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
      console.error('Error checking cache:', error);
      return false;
    }
  };

  // Add function to get cached data
  const getCachedData = (cacheKey) => {
    try {
      const cachedData = localStorage.getItem(`movieCache_${cacheKey}`);
      if (!cachedData) return null;
      
      const { data } = JSON.parse(cachedData);
      return data;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  };

  // Add function to set cached data
  const setCachedData = (cacheKey, data) => {
    try {
      cleanupCache(); // Run cleanup before setting new data
      localStorage.setItem(`movieCache_${cacheKey}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error setting cached data:', error);
      if (error.name === 'QuotaExceededError') {
        // If still failing, perform a more aggressive cleanup
        cleanupCache(); 
      }
    }
  };

  // Initialize data fetching
  useEffect(() => {
    fetchInitialMovies();
    
    // Set up a periodic cleanup interval
    const interval = setInterval(cleanupCache, CACHE_DURATION);
    return () => clearInterval(interval);
  }, []); // Empty dependency array means this runs once on mount

  // Add loading state for initial data fetch
  useEffect(() => {
    if (loadingStates.initial) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [loadingStates.initial]);

  // Add error handling effect
  useEffect(() => {
    if (error) {
      console.error('Error in HomePage:', error);
    }
  }, [error]);

  // Add cleanup effect
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Pagination states for all categories
  const [pageStates, setPageStates] = useState({
    trending: { current: 1, total: 1 },
    popular: { current: 1, total: 1 },
    topRated: { current: 1, total: 1 },
    upcoming: { current: 1, total: 1 },
    action: { current: 1, total: 1 },
    comedy: { current: 1, total: 1 },
    drama: { current: 1, total: 1 },
    horror: { current: 1, total: 1 },
    sciFi: { current: 1, total: 1 },
    documentary: { current: 1, total: 1 },
    family: { current: 1, total: 1 },
    animation: { current: 1, total: 1 },
    awardWinning: { current: 1, total: 1 },
    latest: { current: 1, total: 1 },
    popularTV: { current: 1, total: 1 },
    topRatedTV: { current: 1, total: 1 },
    airingToday: { current: 1, total: 1 },
    nowPlaying: { current: 1, total: 1 }
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

  const addUniqueMovies = (currentMovies, newMovies, idSet) => {
    const uniqueNewMovies = newMovies.filter(movie => !idSet.has(movie.id));
    uniqueNewMovies.forEach(movie => idSet.add(movie.id));
    return [...currentMovies, ...uniqueNewMovies];
  };

  // Modify fetchInitialMovies to use prioritized loading
  const fetchInitialMovies = async () => {
    try {
      setLoadingState('initial', true);
      setError(null);
      
      // Start with featured content and trending movies in parallel
      const [featuredResult] = await Promise.all([
        fetchFeaturedContent(),
        fetchPrioritySection('trending')
      ]);

      // Fetch other high priority sections
      await Promise.all(
        SECTION_PRIORITIES.HIGH.filter(key => key !== 'trending').map(key =>
          fetchPrioritySection(key)
        )
      );

      // Start loading medium priority sections
      const mediumPriorityPromise = Promise.all(
        SECTION_PRIORITIES.MEDIUM.map(key =>
          fetchPrioritySection(key)
        )
      );

      // Start loading low priority sections
      const lowPriorityPromise = Promise.all(
        SECTION_PRIORITIES.LOW.map(key =>
          fetchPrioritySection(key)
        )
      );

      // Wait for all sections to complete
      await Promise.all([mediumPriorityPromise, lowPriorityPromise]);

      setError(null);
    } catch (err) {
      setError('Failed to fetch movies. Please try again later.');
      console.error('Error fetching movies:', err);
    } finally {
      setLoadingState('initial', false);
    }
  };

  // Add function to fetch a single section with priority
  const fetchPrioritySection = async (sectionKey) => {
    const section = {
      key: sectionKey,
      fetch: getFetchFunction(sectionKey),
      setter: getSetterFunction(sectionKey),
      ids: movieIds[sectionKey]
    };

    try {
      // Check cache first
      if (isCacheValid(section.key)) {
        const cachedData = getCachedData(section.key);
        if (cachedData) {
          section.setter(cachedData);
          cachedData.forEach(movie => section.ids.add(movie.id));
          return;
        }
      }

      setLoadingState(section.key, true);
      const result = await section.fetch(1);
      if (result && result.movies && result.movies.length > 0) {
        section.setter(result.movies);
        result.movies.forEach(movie => section.ids.add(movie.id));
        setPageStates(prev => ({
          ...prev,
          [section.key]: { current: 1, total: result.totalPages || 1 }
        }));
        // Update cache
        setCachedData(section.key, result.movies);
      }
    } catch (error) {
      console.error(`Error fetching ${section.key}:`, error);
      setError(`Failed to fetch ${section.key} movies`);
    } finally {
      setLoadingState(section.key, false);
    }
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

  // Modify loadMoreMovies to use cache
  const loadMoreMovies = async (category) => {
    const currentPage = pageStates[category].current;
    const totalPages = pageStates[category].total;

    if (currentPage >= totalPages) {
      console.log(`No more pages to load for ${category}`);
      return;
    }

    const nextPage = currentPage + 1;
    let result;

    try {
      setLoadingState(category, true);
      
      // Check if we have this page in cache
      const cacheKey = `${category}_page_${nextPage}`;
      if (isCacheValid(cacheKey)) {
        result = { movies: getCachedData(cacheKey) };
      } else {
        // Fetch from API
        const fetchFunction = getFetchFunction(category);
        if (fetchFunction) {
          result = await fetchFunction(nextPage);
        } else {
          console.error(`No fetch function found for category: ${category}`);
          return;
        }
        
        // Update cache
        if (result && result.movies) {
          setCachedData(cacheKey, result.movies);
        }
      }

      // Update state with new movies
      if (result && result.movies) {
        const setter = getSetterFunction(category);
        if (setter) {
          setter(prev => addUniqueMovies(prev, result.movies, movieIds[category]));
          setPageStates(prev => ({
            ...prev,
            [category]: { 
              current: nextPage, 
              total: result.totalPages || prev[category].total 
            }
          }));
        }
      }
    } catch (error) {
      console.error(`Error loading more ${category} movies:`, error);
    } finally {
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
    if (trendingMovies.length > 1) {
      const interval = setInterval(() => {
        if (!isTransitioning) {
          handleSlideChange((prevIndex) => 
            (prevIndex + 1) % trendingMovies.length
          );
        }
      }, 5000); // Change featured movie every 5 seconds

      return () => clearInterval(interval);
    }
  }, [trendingMovies, isTransitioning, currentFeaturedIndex]);

  // Enhanced movie details cache: { [id]: { data, timestamp } }
  const movieDetailsCache = useRef({});
  const [overlayLoading, setOverlayLoading] = useState(false);

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
    const interval = setInterval(cleanMovieDetailsCache, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Step 10: Prefetch analytics
  const prefetchAnalytics = useRef({
    prefetched: {}, // movieId: timestamp
    used: {}, // movieId: timestamp
    totalPrefetched: 0,
    totalUsed: 0,
  });

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
    const interval = setInterval(() => {
      const { totalPrefetched, totalUsed } = prefetchAnalytics.current;
      const efficiency = totalPrefetched > 0 ? ((totalUsed / totalPrefetched) * 100).toFixed(1) : 'N/A';
      console.log(`[Prefetch Analytics] Prefetched: ${totalPrefetched}, Used: ${totalUsed}, Efficiency: ${efficiency}%`);
    }, 30000);
    return () => clearInterval(interval);
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
      } catch (err) {}
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

  // Patch handleMovieSelect to record usage
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
    } catch (err) {
      setSelectedMovie({ ...movie, error: 'Failed to load details.' });
    } finally {
      setOverlayLoading(false);
    }
  }, []);

  // Add this effect to check if the current movie is in watchlist
  useEffect(() => {
    if (trendingMovies[currentFeaturedIndex]) {
      setIsInWatchlistState(isInWatchlist(trendingMovies[currentFeaturedIndex].id));
    }
  }, [currentFeaturedIndex, trendingMovies, isInWatchlist]);

  // Add prefetch function
  const prefetchCategory = async (category) => {
    if (prefetchQueue.has(category) || dataCache[category]) return;
    
    setPrefetchQueue(prev => new Set([...prev, category]));
    
    if (!isPrefetching) {
      setIsPrefetching(true);
      try {
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

  // Optimize getMoviesForCategory
  const fetchMoviesForCategory = async (category, page = 1) => {
    // Check cache first
    const cachedData = dataCache[category];
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return cachedData;
    }

    let result;
    try {
      setLoadingState(category, true);
      switch (category) {
        case 'trending':
          result = await getTrendingMovies(page);
          break;
        case 'popular':
          result = await getPopularMovies(page);
          break;
        case 'topRated':
          result = await getTopRatedMovies(page);
          break;
        case 'upcoming':
          result = await getUpcomingMovies(page);
          break;
        case 'action':
          result = await getActionMovies(page);
          break;
        case 'comedy':
          result = await getComedyMovies(page);
          break;
        case 'drama':
          result = await getDramaMovies(page);
          break;
        case 'horror':
          result = await getHorrorMovies(page);
          break;
        case 'sciFi':
          result = await getSciFiMovies(page);
          break;
        case 'documentary':
          result = await getDocumentaryMovies(page);
          break;
        case 'family':
          result = await getFamilyMovies(page);
          break;
        case 'animation':
          result = await getAnimationMovies(page);
          break;
        case 'awardWinning':
          result = await getAwardWinningMovies(page);
          break;
        case 'latest':
          result = await getLatestMovies(page);
          break;
        case 'popularTV':
          result = await getPopularTVShows(page);
          if (result && result.results) {
            // Fetch full details for first 6 TV shows
            const initialTVs = result.results.slice(0, 6);
            const detailedTVs = await Promise.all(
              initialTVs.map(async (tv) => {
                try {
                  const details = await getMovieDetails(tv.id, 'tv');
                  return { ...tv, ...details };
                } catch (e) {
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
          result = await getTopRatedTVShows(page);
          if (result && result.results) {
            const initialTVs = result.results.slice(0, 6);
            const detailedTVs = await Promise.all(
              initialTVs.map(async (tv) => {
                try {
                  const details = await getMovieDetails(tv.id, 'tv');
                  return { ...tv, ...details };
                } catch (e) {
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
          result = await getAiringTodayTVShows(page);
          if (result && result.results) {
            const initialTVs = result.results.slice(0, 6);
            const detailedTVs = await Promise.all(
              initialTVs.map(async (tv) => {
                try {
                  const details = await getMovieDetails(tv.id, 'tv');
                  return { ...tv, ...details };
                } catch (e) {
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
          result = await getNowPlayingMovies(page);
          break;
        default:
          return { movies: [], totalPages: 1 };
      }

      // Update cache
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

      return result;
    } catch (error) {
      console.error(`Error fetching ${category}:`, error);
      throw error;
    } finally {
      setLoadingState(category, false);
    }
  };

  const prefetchAdjacentCategories = async (currentCategory) => {
    const categoryIndex = categories.findIndex(cat => cat.id === currentCategory);
    if (categoryIndex === -1) return;

    const adjacentCategories = [
      categories[categoryIndex - 1]?.id,
      categories[categoryIndex + 1]?.id
    ].filter(Boolean);

    for (const category of adjacentCategories) {
      if (!dataCache[category] || Date.now() - dataCache[category].timestamp > CACHE_DURATION) {
        try {
          await fetchMoviesForCategory(category);
        } catch (error) {
          console.error(`Error prefetching ${category}:`, error);
        }
      }
    }
  };

  const handleCategoryChange = async (category) => {
    if (category === activeCategory) {
      setActiveCategory('all');
      return;
    }

    // Set loading state for the specific category
    setLoadingState(category, true);
    
    try {
      // Start prefetching adjacent categories
      prefetchAdjacentCategories(category);

      // Update active category immediately for responsive UI
      setActiveCategory(category);
      
      // Try to get from cache first
      const cachedData = dataCache[category];
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
            console.error(`Failed to load ${category} after ${retryCount} attempts`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
        }
      }
    } finally {
      setLoadingState(category, false);
    }
  };

  const updateCategoryState = (category, data) => {
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
  };

  // Update the category button click handler
  const handleCategoryButtonClick = useCallback((category) => {
    handleCategoryChange(category.id);
  }, [handleCategoryChange]);

  // Add this to your existing fetchInitialMovies function
  const fetchFeaturedContent = async () => {
    try {
      // Check cache first
      if (isCacheValid('featured')) {
        setFeaturedContent(dataCache['featured'].data);
        return;
      }

      // Get trending content
      const trendingData = await getTrendingMovies(1);
      if (!trendingData?.movies?.length) {
        throw new Error('No trending content available');
      }

      // Get the first trending item
      const firstItem = trendingData.movies[0];

      // Fetch complete details for the item
      const details = await getMovieDetails(firstItem.id, firstItem.type);

      // Update cache with complete details
      setDataCache(prev => ({
        ...prev,
        featured: {
          data: details,
          timestamp: Date.now()
        }
      }));

      setFeaturedContent(details);
    } catch (error) {
      console.error('Error fetching featured content:', error);
      setError('Failed to load featured content');
    }
  };

  useEffect(() => {
    fetchFeaturedContent();
  }, []);

  // Memoize categories and getMoviesForCategory
  const categories = useMemo(() => categoriesList, []);
  const getMoviesForCategory = useCallback((category) => {
    switch (category) {
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

  if (loadingStates.initial) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#121417]">
        <div className="text-white text-xl">{error}</div>
      </div>
    );
  }

  // Add this function to handle adding/removing from watchlist
  const handleWatchlistToggle = (e) => {
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
          poster_path: movie.poster_path || movie.poster || movie.backdrop_path || movie.backdrop,
          backdrop_path: movie.backdrop_path || movie.backdrop,
          overview: movie.overview,
          type: movie.media_type || 'movie',
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

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-[#121417] dark group/design-root overflow-x-hidden font-inter scrollbar-hide">
      <div className="layout-container flex h-full grow flex-col scrollbar-hide">
        <div className="flex flex-1 justify-center">
          <div className="layout-content-container flex flex-col w-full flex-1 scrollbar-hide">
            {/* Add HeroSection here */}
            <MemoizedHeroSection 
              featuredContent={featuredContent} 
              onMovieSelect={handleMovieSelect}
            />
            {/* Category Selector with Scroll */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#121417] to-transparent z-10 pointer-events-none"></div>
              <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#121417] to-transparent z-10 pointer-events-none"></div>
              <Swiper
                modules={[Navigation, A11y]}
                spaceBetween={16}
                slidesPerView="auto"
                speed={500}
                navigation={{
                  nextEl: '.category-button-next',
                  prevEl: '.category-button-prev',
                }}
                className="px-4 h-10 mt-6 pl-8"
              >
                {categories.map(category => (
                  <SwiperSlide key={category.id} className="!w-auto">
                    <button
                      onClick={() => handleCategoryButtonClick(category)}
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
                <div className="category-button-prev !w-8 !h-8 !bg-white/5 hover:!bg-white/10 !rounded-full !border !border-white/10 !transition-all !duration-300 opacity-0 group-hover:opacity-100 !-left-0 !-translate-y-1/2 !top-[35%] !m-0 after:!text-white after:!text-sm after:!font-bold !z-10 hover:!scale-110 hover:!shadow-lg hover:!shadow-black/20"></div>
                <div className="category-button-next !w-8 !h-8 !bg-white/5 hover:!bg-white/10 !rounded-full !border !border-white/10 !transition-all !duration-300 opacity-0 group-hover:opacity-100 !-right-0 !-translate-y-1/2 !top-[35%] !m-0 after:!text-white after:!text-sm after:!font-bold !z-10 hover:!scale-110 hover:!shadow-lg hover:!shadow-black/20"></div>
              </Swiper>
            </div>
            {/* Movie Sections */}
            {activeCategory === 'all' ? (
              <>
                <MemoizedMovieSection 
                  title="Trending Now" 
                  movies={trendingMovies} 
                  loading={loadingStates.trending} 
                  onLoadMore={() => loadMoreMovies('trending')}
                  hasMore={pageStates.trending.current < pageStates.trending.total}
                  currentPage={pageStates.trending.current}
                  sectionKey="trending"
                  onMovieSelect={handleMovieSelect}
                  onMovieHover={handleMovieHover}
                />
                <MemoizedMovieSection 
                  title="Popular Movies" 
                  movies={popularMovies} 
                  loading={loadingStates.popular} 
                  onLoadMore={() => loadMoreMovies('popular')}
                  hasMore={pageStates.popular.current < pageStates.popular.total}
                  currentPage={pageStates.popular.current}
                  sectionKey="popular"
                  onMovieSelect={handleMovieSelect}
                  onMovieHover={handleMovieHover}
                />
                <MemoizedMovieSection 
                  title="Top Rated Movies" 
                  movies={topRatedMovies} 
                  loading={loadingStates.topRated} 
                  onLoadMore={() => loadMoreMovies('topRated')}
                  hasMore={pageStates.topRated.current < pageStates.topRated.total}
                  currentPage={pageStates.topRated.current}
                  sectionKey="topRated"
                  onMovieSelect={handleMovieSelect}
                  onMovieHover={handleMovieHover}
                />
                <MemoizedMovieSection 
                  title="Coming Soon" 
                  movies={upcomingMovies} 
                  loading={loadingStates.upcoming} 
                  onLoadMore={() => loadMoreMovies('upcoming')}
                  hasMore={pageStates.upcoming.current < pageStates.upcoming.total}
                  currentPage={pageStates.upcoming.current}
                  sectionKey="upcoming"
                  onMovieSelect={handleMovieSelect}
                  onMovieHover={handleMovieHover}
                />
              </>
            ) : (
              <MemoizedMovieSection 
                title={categories.find(c => c.id === activeCategory)?.label || ''}
                movies={getMoviesForCategory(activeCategory)}
                loading={loadingStates[activeCategory]}
                onLoadMore={() => loadMoreMovies(activeCategory)}
                hasMore={pageStates[activeCategory].current < pageStates[activeCategory].total}
                currentPage={pageStates[activeCategory].current}
                sectionKey={activeCategory}
                onMovieSelect={handleMovieSelect}
                onMovieHover={handleMovieHover}
              />
            )}
          </div>
        </div>
      </div>
      {/* Add MovieDetailsOverlay */}
      {selectedMovie && (
        <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50"><div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div></div>}>
          <LazyMovieDetailsOverlay
            movie={selectedMovie}
            loading={overlayLoading}
            onClose={() => setSelectedMovie(null)}
            onMovieSelect={handleMovieSelect}
          />
        </Suspense>
      )}
    </div>
  );
};

export default HomePage;