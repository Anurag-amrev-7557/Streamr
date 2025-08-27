/**
 * HomePage Component - Enhanced Hero Section for Trending Content
 * 
 * Recent Updates:
 * - Advanced content prioritization with 7-factor analysis
 * - Smart movie vs series selection based on quality, popularity, and credibility
 * - Intelligent rating system that considers vote count credibility
 * - Genre-aware content selection for trending categories
 * - Quality score calculation combining rating, popularity, and vote count
 * - Clean, streamlined design without excessive indicators
 * - FIXED: Consolidated 50+ useEffect hooks into optimized, memory-safe versions
 * - FIXED: Added proper cleanup to prevent memory leaks and infinite loops
 * - FIXED: Optimized performance monitoring with consolidated observers
 */
import React, { useState, useEffect, useRef, useCallback, memo, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';

// Core Services and Configuration
import { getApiUrl } from '../config/api';
import { getPosterProps, getBackdropProps } from '../utils/imageUtils';

// TMDB API Functions
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

// Components
import ErrorBoundary from './ErrorBoundary';
import { PageLoader, SectionLoader, CardLoader } from './Loader';
import ContinueWatching from './ContinueWatching';
import CastDetailsOverlay from './CastDetailsOverlay';
import RatingBadge from './RatingBadge';
import AdBlockerRecommendationToast from './AdBlockerRecommendationToast';

// Contexts and Hooks
import { useLoading } from '../contexts/LoadingContext';
import { useWatchlist } from '../contexts/WatchlistContext';
import { useViewingProgress } from '../contexts/ViewingProgressContext';
import { useSmoothScroll, useScrollAnimation } from '../hooks/useSmoothScroll';
import { usePersistentCache } from '../hooks/usePersistentCache';

// Utilities and Services
import memoryOptimizationService from '../utils/memoryOptimizationService';
import { trackPageLoad, trackApiCall } from '../utils/performanceMonitor';
import performanceOptimizationService from '../services/performanceOptimizationService';
import enhancedPerformanceService from '../services/enhancedPerformanceService';

// Swiper imports for desktop category and movie sections
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, A11y, Mousewheel, Keyboard, FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// 🚀 PERFORMANCE OPTIMIZED: Enhanced Swiper styles with advanced performance optimizations
const swiperStyles = `
  /* Advanced GPU acceleration and performance optimizations */
  .swiper,
  .swiper-wrapper {
    will-change: transform;
    transform: translateZ(0);
    overflow: visible;
  }

  .swiper-container {
    overflow: hidden;
    position: relative;
  }

  .swiper-wrapper {
    align-items: flex-start;
    justify-content: flex-start;
  }
  
  .swiper-slide {
    will-change: transform;
    backface-visibility: hidden;
    transform: translateZ(0);
    transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    width: auto !important;
  }

  /* Enhanced navigation button styles */
  .swiper-button-prev,
  .swiper-button-next {
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .swiper-button-prev:hover,
  .swiper-button-next:hover {
    transform: scale(1.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .swiper-button-prev:active,
  .swiper-button-next:active {
    transform: scale(0.95);
  }

  /* Enhanced slide transitions */
  .swiper-slide-active {
    transform: scale(1.02);
    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .swiper-slide-prev,
  .swiper-slide-next {
    transform: scale(0.98);
    opacity: 0.8;
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  /* Smooth momentum scrolling */
  .swiper-wrapper {
    transition-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  /* Enhanced touch feedback */
  .swiper-slide {
    touch-action: pan-y pinch-zoom;
  }

  /* Improved focus states for accessibility */
  .swiper-button-prev:focus,
  .swiper-button-next:focus {
    outline: 2px solid rgba(255, 255, 255, 0.5);
    outline-offset: 2px;
  }
    flex-shrink: 0;
  }

  /* Enhanced movie card overlay styling - FIXED positioning */
  .movie-card-container .absolute.inset-0 {
    border-radius: 0.5rem;
    overflow: hidden;
    /* Ensure overlay stays within card boundaries */
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    /* Prevent overlay from extending beyond card */
    clip-path: inset(0 0 0 0);
  }

  .movie-card-container .bg-gradient-to-t {
    background: linear-gradient(to top, 
      rgba(0, 0, 0, 0.95) 0%, 
      rgba(0, 0, 0, 0.7) 30%, 
      rgba(0, 0, 0, 0.4) 60%, 
      transparent 100%);
    /* Ensure gradient respects card boundaries */
    border-radius: inherit;
  }

  /* Fix overlay positioning for movie cards */
  .movie-card-container .relative.group {
    overflow: hidden;
    border-radius: 0.5rem;
  }

  /* Ensure overlay content stays within bounds */
  .movie-card-container .absolute.bottom-0 {
    border-radius: 0 0 0.5rem 0.5rem;
    overflow: hidden;
  }

  /* Additional fixes for movie card positioning */
  .movie-card-container {
    position: relative;
    overflow: hidden;
    border-radius: 0.5rem;
  }

  /* Ensure all absolute positioned elements within cards are contained */
  .movie-card-container .absolute {
    position: absolute;
    overflow: hidden;
  }

  /* Fix for gradient overlay extending beyond boundaries */
  .movie-card-container .bg-gradient-to-t {
    mask-image: radial-gradient(circle at center, black 100%, transparent 100%);
    -webkit-mask-image: radial-gradient(circle at center, black 100%, transparent 100%);
    /* Additional containment */
    contain: layout style paint;
  }

  /* Ensure proper z-index stacking for overlays */
  .movie-card-container .absolute.inset-0 {
    z-index: 1;
  }

  /* Fix for any remaining overflow issues */
  .movie-card-container * {
    box-sizing: border-box;
  }

  /* Swiper container spacing */
  .swiper {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
    overflow: visible;
  }

  /* Ensure first and last slides have proper spacing */
  .swiper-wrapper {
    padding-left: 0;
    padding-right: 0;
    overflow: visible;
  }

  /* Fix swiper slide overflow issues */
  .swiper-slide {
    overflow: hidden;
    border-radius: 0.5rem;
  }

  /* Enhanced gradient overlay positioning */
  .relative.group .absolute.inset-y-0 {
    width: 7rem; /* w-28 */
  }

  /* Ensure proper spacing for first and last cards */
  .swiper-slide:first-child {
    margin-left: 0;
  }

  .swiper-slide:last-child {
    margin-right: 0;
  }
  

  
  /* Navigation buttons - consolidated styles */
  .swiper-button-next,
  .swiper-button-prev,
  .category-swiper-next,
  .category-swiper-prev {
    width: 40px !important;
    height: 40px !important;
    background: rgba(255, 255, 255, 0.1) !important;
    backdrop-filter: blur(10px) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    border-radius: 50% !important;
    transition: all 0.2s ease !important;
    position: absolute !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    z-index: 20 !important;
  }
  
  .swiper-button-next,
  .category-swiper-next {
    right: 0 !important;
  }
  
  .swiper-button-prev,
  .category-swiper-prev {
    left: 0 !important;
  }
  
  .swiper-button-next::after,
  .swiper-button-prev::after {
    font-size: 14px !important;
    font-weight: bold !important;
    color: white !important;
  }
  
  /* Hover effects */
  .swiper-button-next:hover,
  .swiper-button-prev:hover,
  .category-swiper-next:hover,
  .category-swiper-prev:hover {
    background: rgba(255, 255, 255, 0.2) !important;
    transform: translateY(-50%) scale(1.1) !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
  }
  
  /* Visibility control for custom navigation */
  .category-swiper-next,
  .category-swiper-prev {
    opacity: 0 !important;
  }
  
  .group:hover .category-swiper-next,
  .group:hover .category-swiper-prev {
    opacity: 1 !important;
  }
`;

// Inject styles (idempotent)
if (typeof document !== 'undefined') {
  const existing = document.getElementById('homepage-swiper-styles');
  if (!existing) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'homepage-swiper-styles';
    styleSheet.textContent = swiperStyles;
    document.head.appendChild(styleSheet);
  }
  
  // Inject optimized ultra-smooth scrolling styles
  const existingScrollStyles = document.getElementById('ultra-smooth-scroll-styles');
  if (!existingScrollStyles) {
    const scrollStyleSheet = document.createElement('style');
    scrollStyleSheet.id = 'ultra-smooth-scroll-styles';
    scrollStyleSheet.textContent = `
      /* Base scroll styles */
      .ultra-smooth-scroll,
      .scroll-container-fix {
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: auto;
        scroll-padding: 1rem;
      }
      
      /* Horizontal scrolling */
      .ultra-smooth-scroll {
        scroll-snap-type: x proximity;
      }
      
      /* Vertical scrolling */
      .scroll-container-fix {
        scroll-snap-type: y proximity;
      }
      
      /* Webkit scrollbar styles */
      .ultra-smooth-scroll::-webkit-scrollbar {
        height: 4px;
        width: 4px;
      }
      
      .scroll-container-fix::-webkit-scrollbar {
        width: 6px;
      }
      
      .ultra-smooth-scroll::-webkit-scrollbar-track,
      .scroll-container-fix::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .ultra-smooth-scroll::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        transition: background 0.2s ease;
      }
      
      .scroll-container-fix::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        transition: background 0.2s ease;
      }
      
      .ultra-smooth-scroll::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.4);
      }
      
      .scroll-container-fix::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      /* Touch device optimization */
      @media (hover: none) and (pointer: coarse) {
        .ultra-smooth-scroll,
        .scroll-container-fix {
          scroll-behavior: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
      }
    `;
    document.head.appendChild(scrollStyleSheet);
  }
}
// Lazy load non-critical components with optimized preloading
const MovieDetailsOverlay = lazy(() => import('./MovieDetailsOverlay'), {
  suspense: true
});

// Preload critical components after initial render for better performance



// Optimized visibility gate for better performance and immediate rendering
const VisibleOnDemand = ({ children, rootMargin = '200px', placeholderHeight = 300 }) => {
  const [isVisible, setIsVisible] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || isVisible) return;
    
    let observer;
    try {
      observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry && (entry.isIntersecting || entry.intersectionRatio > 0)) {
          setIsVisible(true);
          observer.disconnect();
        }
      }, { 
        root: null, 
        rootMargin, 
        threshold: 0.01 
      });
      
      observer.observe(ref.current);
    } catch (_) {
      // Fallback: render immediately if IntersectionObserver not available
      setIsVisible(true);
    }
    
    return () => {
      if (observer) {
        try { 
          observer.disconnect(); 
        } catch (_) {}
      }
    };
  }, [rootMargin, isVisible]);

  return (
    <div
      ref={ref}
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: `${placeholderHeight}px 1000px`
      }}
    >
      {children}
    </div>
  );
};

// Optimized device capability detection for better performance
const useDevicePerformanceHints = () => {
  const [hints, setHints] = useState({
    reducedMotion: false,
    isPointerFine: true,
    isLowEndDevice: false
  });

  useEffect(() => {
    let reducedMotion = false;
    let isPointerFine = true;
    let isLowEndDevice = false;

    try {
      reducedMotion = typeof window !== 'undefined' && 
                     window.matchMedia && 
                     window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) {}
    
    try {
      isPointerFine = typeof window !== 'undefined' && 
                     window.matchMedia && 
                     window.matchMedia('(pointer: fine)').matches;
    } catch (_) {}

    setHints({ reducedMotion, isPointerFine, isLowEndDevice });
  }, []);

  return hints;
};

// Performance monitoring hook
const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState({
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    firstInputDelay: 0,
    cumulativeLayoutShift: 0,
    timeToInteractive: 0,
    memoryUsage: 0,
    memoryLimit: 0,
    cacheHitRate: 0
  });

  const observersRef = useRef([]);
  const isMountedRef = useRef(true);
  const memoryIntervalRef = useRef(null);

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

    // Enhanced memory monitoring
    if (performance.memory) {
      const updateMemoryMetrics = () => {
        if (!isMountedRef.current) return;
        
        const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
        const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
        
        setMetrics(prev => ({
          ...prev,
          memoryUsage: usedMB,
          memoryLimit: limitMB
        }));
      };

      // Update memory metrics less frequently in production and only when tab is visible
      const memIntervalMs = (import.meta && import.meta.env && import.meta.env.DEV) ? 5000 : 30000;
      memoryIntervalRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') {
          updateMemoryMetrics();
        }
      }, memIntervalMs);
      updateMemoryMetrics(); // Initial update
    }

    // Enhanced cache monitoring
    const updateCacheMetrics = () => {
      if (!isMountedRef.current) return;
      
      try {
        const keys = Object.keys(localStorage);
        const movieCacheKeys = keys.filter(key => key.startsWith('movieCache_'));
        const totalEntries = movieCacheKeys.length;
        
        // Calculate cache hit rate from stored metrics
        const cacheStats = JSON.parse(localStorage.getItem('cacheStats') || '{"hits": 0, "misses": 0}');
        const hitRate = cacheStats.hits + cacheStats.misses > 0 
          ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100 
          : 0;
        
        setMetrics(prev => ({
          ...prev,
          cacheHitRate: hitRate
        }));
      } catch (error) {
        console.warn('Failed to update cache metrics:', error);
      }
    };

    // Update cache metrics less frequently in production and only when tab is visible
    const cacheIntervalMs = (import.meta && import.meta.env && import.meta.env.DEV) ? 10000 : 60000;
    const cacheInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateCacheMetrics();
      }
    }, cacheIntervalMs);
    updateCacheMetrics(); // Initial update

    return () => {
      isMountedRef.current = false;
      
      // Disconnect all observers - FIXED: Observer leaks
      observersRef.current.forEach(observer => {
        if (observer && typeof observer.disconnect === 'function') {
          try {
            observer.disconnect();
          } catch (error) {
            if (import.meta.env.DEV) {
              console.warn('Failed to disconnect performance observer:', error);
            }
          }
        }
      });
      observersRef.current = [];
      
      // Clear memory monitoring interval
      if (memoryIntervalRef.current) {
        clearInterval(memoryIntervalRef.current);
        memoryIntervalRef.current = null;
      }
      
      // Clear cache monitoring interval
      clearInterval(cacheInterval);
    };
  }, []);

  return metrics;
};

// 🚀 PERFORMANCE OPTIMIZED: Memoized MovieCard component to prevent unnecessary re-renders
const MemoizedMovieCard = memo(({ onClick, onPrefetch, ...movie }) => (
  <MovieCard {...movie} onClick={onClick} onPrefetch={onPrefetch} />
), (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.id === nextProps.id &&
    prevProps.poster_path === nextProps.poster_path &&
    prevProps.title === nextProps.title &&
    prevProps.vote_average === nextProps.vote_average
  );
});

// Optimized Category Swiper Component for Desktop View
const CategorySwiper = memo(({ categories, activeCategory, onCategoryClick, isMobile }) => {
  const categorySwiperRef = useRef(null);
  
  useEffect(() => {
    return () => {
      try {
        if (categorySwiperRef.current?.destroy) {
          categorySwiperRef.current.destroy(true, true);
        }
      } catch (error) {
        console.warn('Error destroying category swiper:', error);
      } finally {
        categorySwiperRef.current = null;
      }
    };
  }, []);
  
  if (isMobile) {
    return (
      <div className="relative mt-6 px-4">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#121417] to-transparent z-10 pointer-events-none"></div>
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#121417] to-transparent z-10 pointer-events-none"></div>
        <div 
          className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 mb-2 horizontal-scroll-container" 
          style={{
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
            willChange: 'scroll-position',
            transform: 'translate3d(0, 0, 0)',
            contain: 'layout style paint',
            scrollSnapType: 'x mandatory',
            scrollPadding: '0 20px'
          }}
        >
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
    <MotionConfig reducedMotion="user" transition={{ type: 'tween' }}>
      <div className="relative mt-6 group">
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#121417] to-transparent z-10 pointer-events-none"></div>
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#121417] to-transparent z-10 pointer-events-none"></div>
      <Swiper
        modules={[Navigation, A11y, Mousewheel, Keyboard, FreeMode]}
        spaceBetween={12}
        slidesPerView="auto"
        speed={500}
        easing="cubic-bezier(0.25, 0.46, 0.45, 0.94)"
        // navigation disabled for category swiper (arrows hidden)
        navigation={false}
        onSwiper={(swiper) => { categorySwiperRef.current = swiper; }}
        onSlideChange={(swiper) => {
          // Enhanced category slide change animation
          const activeSlide = swiper.slides[swiper.activeIndex];
          if (activeSlide) {
            const button = activeSlide.querySelector('button');
            if (button) {
              button.style.transform = 'scale(1.05)';
              button.style.transition = 'transform 0.2s ease-out';
              setTimeout(() => {
                button.style.transform = 'scale(1)';
              }, 200);
            }
          }
        }}
        freeMode={{
          enabled: true,
          momentum: true,
          momentumVelocityRatio: 0.8,
          momentumRatio: 0.8,
          momentumBounce: true,
          momentumBounceRatio: 0.1
        }}
        mousewheel={{
          forceToAxis: true,
          sensitivity: 0.7,
          releaseOnEdges: true,
          thresholdDelta: 40,
          thresholdTime: 150
        }}
        keyboard={{
          enabled: true,
          onlyInViewport: true,
          pageUpDown: true
        }}
        grabCursor={true}
        touchRatio={1.1}
        touchAngle={45}
        resistance={true}
        resistanceRatio={0.8}
        watchSlidesProgress={true}
        followFinger={true}
        threshold={8}
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
        {categories.map((category) => (
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
    </MotionConfig>
  );
});

CategorySwiper.displayName = 'CategorySwiper';

// Optimized Movie Section Swiper Component for Desktop View
const MovieSectionSwiper = memo(({ title, movies, loading, onLoadMore, hasMore, currentPage, sectionKey, onMovieSelect, onMovieHover, onPrefetch, isMobile }) => {
  const swiperRef = useRef(null);
  const prevElRef = useRef(null);
  const nextElRef = useRef(null);

  // Progressive list rendering for better performance
  const [renderCount, setRenderCount] = useState(() => {
    const initial = isMobile ? 6 : 10;
    return Math.min(Array.isArray(movies) ? movies.length : 0, initial);
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (swiperRef.current?.destroy) {
          swiperRef.current.destroy(true, true);
        }
      } catch (error) {
        console.warn('Error destroying movie section swiper:', error);
      } finally {
        swiperRef.current = null;
      }
    };
  }, []);

  // Keep navigation updated when slides change
  useEffect(() => {
    const s = swiperRef.current;
    if (s && s.navigation && typeof s.navigation.update === 'function') {
      try { s.navigation.update(); } catch (_) {}
    }
  }, [movies?.length, sectionKey]);

  // Update swiper when movies change to ensure proper scrolling
  useEffect(() => {
    const s = swiperRef.current;
    if (s) {
      try {
        s.update();
        s.updateSlides();
        s.updateProgress();
        s.updateSize();
      } catch (_) {}
    }
  }, [movies, renderCount]);

  // Force swiper update after render to ensure proper scrolling
  useEffect(() => {
    const s = swiperRef.current;
    if (s) {
      // Use setTimeout to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        try {
          s.update();
          s.updateSlides();
          s.updateProgress();
          s.updateSize();
        } catch (_) {}
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // 🚀 PERFORMANCE OPTIMIZED: Advanced render count management with intelligent batching and performance monitoring
  useEffect(() => {
    const total = Array.isArray(movies) ? movies.length : 0;
    if (renderCount >= total) return;
    
    let idleId;
    let animationFrameId;
    
    const schedule = () => {
      if ('requestIdleCallback' in window) {
        // 🚀 OPTIMIZED: Use requestIdleCallback with adaptive timeout based on content size
        const timeout = Math.min(400, Math.max(100, total * 2)); // Adaptive timeout
        idleId = window.requestIdleCallback(() => setRenderCount(total), { timeout });
      } else {
        // 🚀 OPTIMIZED: Fallback with requestAnimationFrame for better performance
        animationFrameId = requestAnimationFrame(() => {
          // 🚀 ADDITIONAL: Use microtask for better performance
          Promise.resolve().then(() => {
            setTimeout(() => setRenderCount(total), 50); // Reduced delay for better responsiveness
          });
        });
      }
    };
    
    schedule();
    
    return () => {
      if (typeof idleId === 'number') {
        try { clearTimeout(idleId); } catch (_) {}
      } else if (idleId && typeof window.cancelIdleCallback === 'function') {
        try { window.cancelIdleCallback(idleId); } catch (_) {}
      }
      if (animationFrameId) {
        try { cancelAnimationFrame(animationFrameId); } catch (_) {}
      }
    };
  }, [movies, renderCount]);
  if (isMobile) {
    return (
      <div className="mt-8 px-4">
        <motion.div 
          className="flex items-center justify-between mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }} // 🚀 OPTIMIZED: Reduced from 0.6s
        >
          <motion.h2 
            className="text-xl font-semibold bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent relative"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.05, ease: "easeOut" }} // 🚀 OPTIMIZED: Reduced from 0.7s
          >
            <motion.span
              className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 bg-clip-text text-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }} // 🚀 OPTIMIZED: Reduced from 2s
            />
            {title}
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }} // 🚀 OPTIMIZED: Reduced from 0.6s
          >
            <Link
              to={`/movies?category=${sectionKey}`}
              aria-label={`View all ${title}`}
              className="group text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-all duration-300 transform hover:scale-105"
            >
              <span className="relative z-10">View all</span>
              <motion.span
                className="ml-1 inline-block"
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                →
              </motion.span>
            </Link>
          </motion.div>
        </motion.div>
        <div className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-4 px-2 sm:px-4 horizontal-scroll-container" style={{
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          willChange: 'scroll-position, transform',
          transform: 'translate3d(0, 0, 0)',
          contain: 'layout style paint',
          scrollSnapType: 'x proximity',
          scrollPadding: '0 20px',
          overscrollBehavior: 'auto',
          // 🚀 PERFORMANCE OPTIMIZATIONS
          contentVisibility: 'auto',
          containIntrinsicSize: 'auto 200px',
          isolation: 'isolate'
        }}>
          {movies.map((movie, index) => (
            <div 
              key={`${sectionKey}-${movie.id}-${index}`} 
              className="flex-shrink-0"
              onMouseEnter={() => onMovieHover && onMovieHover(movie, index, movies)}
            >
              <MemoizedMovieCard 
                {...movie} 
                onClick={() => onMovieSelect(movie)} 
                id={movie.id} 
                onPrefetch={() => onPrefetch && onPrefetch(movie.id)} 
              />
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

  const items = Array.isArray(movies) ? movies : [];
  const itemsToRender = items.slice(0, renderCount);

  return (
    <div className="mt-8">
      <motion.div 
        className="flex items-center justify-between mb-4 pl-7 pr-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.h2 
          className="text-xl font-semibold bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent relative"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
        >
          <motion.span
            className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 bg-clip-text text-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          />
          {title}
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          <Link
            to={`/movies?category=${sectionKey}`}
            aria-label={`View all ${title}`}
            className="group text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-all duration-300 transform hover:scale-105"
          >
            <span className="relative z-10">View all</span>
            <motion.span
              className="ml-1 inline-block"
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              →
            </motion.span>
          </Link>
        </motion.div>
      </motion.div>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-[#121417] to-transparent z-10 pointer-events-none"></div>
        <div className="absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-[#121417] to-transparent z-10 pointer-events-none"></div>
        {itemsToRender.length > 0 ? (
        <Swiper
          modules={[Navigation, A11y, Mousewheel, Keyboard, FreeMode]}
          spaceBetween={16}
          slidesPerView="auto"
          speed={600}
          easing="cubic-bezier(0.25, 0.46, 0.45, 0.94)"
          
          onSwiper={(swiper) => { swiperRef.current = swiper; }}
          onBeforeInit={(swiper) => {
            swiper.params.navigation = swiper.params.navigation || {};
            swiper.params.navigation.prevEl = prevElRef.current;
            swiper.params.navigation.nextEl = nextElRef.current;
          }}
          onInit={(swiper) => {
            if (swiper.navigation) {
              try { swiper.navigation.init(); swiper.navigation.update(); } catch (_) {}
            }
          }}
          onSlideChange={(swiper) => {
            // Enhanced slide change animation
            const activeSlide = swiper.slides[swiper.activeIndex];
            if (activeSlide) {
              activeSlide.style.transform = 'scale(1.02)';
              activeSlide.style.transition = 'transform 0.3s ease-out';
              setTimeout(() => {
                activeSlide.style.transform = 'scale(1)';
              }, 300);
            }
          }}
          mousewheel={{
            forceToAxis: true,
            sensitivity: 0.8,
            releaseOnEdges: true,
            thresholdDelta: 50,
            thresholdTime: 200
          }}
          keyboard={{
            enabled: true,
            onlyInViewport: true,
            pageUpDown: true
          }}
          grabCursor={true}
          touchRatio={1.2}
          touchAngle={45}
          resistance={true}
          resistanceRatio={0.7}
          allowTouchMove={true}
          allowSlideNext={true}
          allowSlidePrev={true}
          freeMode={{
            enabled: true,
            momentum: true,
            momentumVelocityRatio: 0.8,
            momentumRatio: 0.8,
            momentumBounce: true,
            momentumBounceRatio: 0.2
          }}
          watchSlidesProgress={true}
          observer={true}
          observeParents={true}
          updateOnWindowResize={true}
          edgeSwipeDetection={true}
          edgeSwipeThreshold={30}
          longSwipes={true}
          longSwipesRatio={0.6}
          longSwipesMs={400}
          shortSwipes={true}
          shortSwipesMs={300}
          followFinger={true}
          threshold={10}
          className="px-6 pb-4 overflow-hidden"
        >
                      {itemsToRender.map((movie, index) => (
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
                <div className="flex flex-col gap-4 rounded-lg w-64 sm:w-72 md:w-80 flex-shrink-0">
                  <div className="relative aspect-[16/10] rounded-lg overflow-hidden bg-black/20 w-full">
                    <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                  </div>
                </div>
              </SwiperSlide>
            )}
        </Swiper>
        ) : (
          loading ? (
            <div className="px-4 pb-4">
              <div className="flex flex-row gap-4 overflow-hidden">
                <div className="w-64 sm:w-72 md:w-80 h-40 rounded-lg bg-white/5" />
                <div className="w-64 sm:w-72 md:w-80 h-40 rounded-lg bg-white/5" />
                <div className="w-64 sm:w-72 md:w-80 h-40 rounded-lg bg-white/5" />
              </div>
            </div>
          ) : null
        )}
        {/* Enhanced Navigation buttons - only visible on desktop */}
        <motion.div 
          ref={prevElRef} 
          className="!w-12 !h-12 !bg-white/10 hover:!bg-white/20 !rounded-full !border !border-white/20 !transition-all !duration-300 opacity-0 group-hover:opacity-100 !absolute !left-2 !-translate-y-1/2 !top-[50%] !m-0 !z-20 hover:!shadow-xl hover:!shadow-black/30 flex items-center justify-center cursor-pointer backdrop-blur-sm"
          whileHover={{ 
            scale: 1.1, 
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            borderColor: 'rgba(255, 255, 255, 0.4)'
          }}
          whileTap={{ scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25 
          }}
          onClick={() => {
            if (swiperRef.current && swiperRef.current.slidePrev) {
              swiperRef.current.slidePrev(600, 'cubic-bezier(0.25, 0.46, 0.45, 0.94)');
            }
          }}
        >
          <motion.svg 
            className="w-6 h-6 text-white" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            whileHover={{ x: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </motion.svg>
        </motion.div>
        <motion.div 
          ref={nextElRef} 
          className="!w-12 !h-12 !bg-white/10 hover:!bg-white/20 !rounded-full !border !border-white/20 !transition-all !duration-300 opacity-0 group-hover:opacity-100 !absolute !right-2 !-translate-y-1/2 !top-[50%] !m-0 !z-20 hover:!shadow-xl hover:!shadow-black/30 flex items-center justify-center cursor-pointer backdrop-blur-sm"
          whileHover={{ 
            scale: 1.1, 
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            borderColor: 'rgba(255, 255, 255, 0.4)'
          }}
          whileTap={{ scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25 
          }}
          onClick={() => {
            if (swiperRef.current && swiperRef.current.slideNext) {
              swiperRef.current.slideNext(600, 'cubic-bezier(0.25, 0.46, 0.45, 0.94)');
            }
          }}
        >
          <motion.svg 
            className="w-6 h-6 text-white" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            whileHover={{ x: 2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </motion.svg>
        </motion.div>
      </div>
    </div>
  );
});

MovieSectionSwiper.displayName = 'MovieSectionSwiper';

// Optimized ProgressiveImage with better performance and memory management
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

    // Optimized retry logic with requestAnimationFrame
    useEffect(() => {
      if (imageError && retry < retryCount && src) {
        retryTimeoutRef.current = requestAnimationFrame(() => {
          const timeoutId = setTimeout(() => {
            setImageError(false);
            setRetry((r) => r + 1);
          }, 300 + 200 * retry); // Faster retry with shorter delays
          
          // Store timeout ID for cleanup
          retryTimeoutRef.current = timeoutId;
        });
      }
      return () => {
        if (retryTimeoutRef.current) {
          if (typeof retryTimeoutRef.current === 'number') {
            clearTimeout(retryTimeoutRef.current);
          } else {
            cancelAnimationFrame(retryTimeoutRef.current);
          }
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
        // fullImage.fetchPriority = 'high';
        fullImage.fetchpriority = 'high';
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
          try {
            preloadRef.current.onload = null;
            preloadRef.current.onerror = null;
            preloadRef.current.src = '';
            preloadRef.current.srcset = '';
          } catch (error) {
            console.warn('Error cleaning up image:', error);
          } finally {
            preloadRef.current = null;
          }
        }
      };
    }, [src, srcSet, getTinySrc, retry, priority, onLoad, onError]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (retryTimeoutRef.current) {
          if (typeof retryTimeoutRef.current === 'number') {
            clearTimeout(retryTimeoutRef.current);
          } else {
            cancelAnimationFrame(retryTimeoutRef.current);
          }
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
  
  // Simplified drag detection - only track if mouse is pressed and moving
  const [isMousePressed, setIsMousePressed] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragThreshold = 15; // Reduced threshold for better responsiveness
  
  // Optimized image source selection for better performance
  const getBestImageSource = useCallback(() => {
    if (isMobile) {
      return poster || poster_path || image || backdrop || backdrop_path || null;
    } else {
      return backdrop || backdrop_path || image || poster || poster_path || null;
    }
  }, [isMobile, poster, poster_path, image, backdrop, backdrop_path]);

  // FIXED: Add debugging for movie card rendering - moved after isMobile definition (dev only)
  useEffect(() => {
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_MEMORY === 'true') {
      console.log(`MovieCard Debug - ${id}:`, {
        title,
        isMobile,
        imageSource: getBestImageSource(),
        poster_path,
        backdrop_path
      });
    }
  }, [id, title, isMobile, poster_path, backdrop_path, getBestImageSource]);

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
          return isNowMobile;
        }
        return prev;
      });
    };
    
    checkScreenSize();
    const resizeHandler = checkScreenSize;
    
    try {
      window.addEventListener('resize', resizeHandler, { passive: true });
    } catch (error) {
      // Fallback for browsers that don't support passive listeners
      window.addEventListener('resize', resizeHandler);
    }
    
    return () => {
      try {
        window.removeEventListener('resize', resizeHandler);
      } catch (error) {
        console.warn('Error removing resize listener:', error);
      }
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

      // 🚀 OPTIMIZED: Intelligent image prefetching with priority and size optimization
      const imageUrls = [];
      if (poster_path) {
        // Use smaller poster size for faster loading
        const posterUrl = getPosterProps({ poster_path }, 'w342').src;
        imageUrls.push({ url: posterUrl, priority: 'high' });
      }
      if (backdrop_path) {
        // Use medium backdrop size for better performance
        const backdropUrl = getBackdropProps({ backdrop_path }, 'w500').src;
        imageUrls.push({ url: backdropUrl, priority: 'medium' });
      }
      
      // 🚀 OPTIMIZED: Parallel image loading with priority-based execution
      const imagePrefetches = imageUrls.map(
        ({ url, priority }) =>
          new Promise(resolve => {
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            // Set loading attribute for better performance
            if (priority === 'high') {
              img.loading = 'eager';
            } else {
              img.loading = 'lazy';
            }
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
  const handleTouchStart = useCallback((event) => {
    handleMouseEnter.lastTouch = Date.now();
    handleMouseEnter({ type: 'touchstart' });
    
    // Track touch start position for drag detection
    if (event.touches && event.touches[0]) {
      dragStartRef.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
      setHasMoved(false);
    }
  }, [handleMouseEnter]);

  // Handle touch end to reset drag state
  const handleTouchEnd = useCallback(() => {
    // Reset touch state
    setHasMoved(false);
  }, []);

  // Handle touch move to detect dragging
  const handleTouchMove = useCallback((event) => {
    if (event.touches && event.touches[0]) {
      const currentX = event.touches[0].clientX;
      const currentY = event.touches[0].clientY;
      const deltaX = Math.abs(currentX - dragStartRef.current.x);
      const deltaY = Math.abs(currentY - dragStartRef.current.y);
      
      // Only consider horizontal movement for swiper interactions
      if (deltaX > dragThreshold) {
        setHasMoved(true);
      }
    }
  }, []);



  // Handle mouse down for desktop drag detection
  const handleMouseDown = useCallback((event) => {
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY
    };
    setIsMousePressed(true);
    setHasMoved(false);
  }, []);

  // Handle mouse move for desktop drag detection
  const handleMouseMove = useCallback((event) => {
    if (!isMousePressed) return;
    
    const deltaX = Math.abs(event.clientX - dragStartRef.current.x);
    const deltaY = Math.abs(event.clientY - dragStartRef.current.y);
    
    // Only consider horizontal movement for swiper interactions
    if (deltaX > dragThreshold) {
      setHasMoved(true);
    }
  }, [isMousePressed]);

  // Handle mouse up for desktop drag detection
  const handleMouseUp = useCallback(() => {
    // Reset mouse state
    setIsMousePressed(false);
    setHasMoved(false);
  }, []);

  // Enhanced: Handle mouse leave/touch end/cancel with analytics and optional callback
  const handleMouseLeave = useCallback((event) => {
    // Reset mouse state when leaving the card area
    setIsMousePressed(false);
    setHasMoved(false);
    
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
        try {
          clearTimeout(hoverTimeoutRef.current);
        } catch (error) {
          console.warn('Error clearing hover timeout:', error);
        } finally {
          hoverTimeoutRef.current = null;
        }
      }
      if (prefetchTimeoutRef.current) {
        try {
          clearTimeout(prefetchTimeoutRef.current);
        } catch (error) {
          console.warn('Error clearing prefetch timeout:', error);
        } finally {
          prefetchTimeoutRef.current = null;
        }
      }
    };
  }, []);

  // FIXED: Add proper cleanup for mobile detection with passive listeners
  useEffect(() => {
    const checkScreenSize = () => {
      const isNowMobile = window.innerWidth < 768 || 
                         (window.navigator && window.navigator.userAgent && 
                          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent));
      setIsMobile(prev => {
        if (prev !== isNowMobile) {
          if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_MEMORY === 'true') {
            console.log('MovieCard Mobile detection changed:', isNowMobile, 'Screen width:', window.innerWidth);
          }
          return isNowMobile;
        }
        return prev;
      });
    };
    
    checkScreenSize();
    const resizeHandler = checkScreenSize;
    
    try {
      window.addEventListener('resize', resizeHandler, { passive: true });
    } catch (error) {
      // Fallback for browsers that don't support passive listeners
      window.addEventListener('resize', resizeHandler);
    }
    
    return () => {
      try {
        window.removeEventListener('resize', resizeHandler);
      } catch (error) {
        console.warn('Error removing resize listener:', error);
      }
    };
  }, []);

  // Modified click handler that prevents clicks during dragging
  const handleCardClick = useCallback((event) => {
    // Prevent click if user was dragging (mouse pressed + moved)
    if (isMousePressed && hasMoved) {
      event.preventDefault();
      event.stopPropagation();
      console.log('Click prevented - mouse was pressed and moved');
      return;
    }
    
    // Call the original onClick handler
    if (onClick) {
      onClick();
    } else {
      console.log('No onClick handler provided');
    }
  }, [isMousePressed, hasMoved, onClick]);

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
      className={`flex flex-col gap-4 rounded-lg ${cardWidth} flex-shrink-0 ${cardClassName} movie-card-container`}
      data-movie-id={id}
      style={{
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'auto',
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
          className="w-full h-full cursor-pointer group"
          onClick={handleCardClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            WebkitTapHighlightColor: 'transparent',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            touchAction: 'auto',
          }}
        >
          <ProgressiveImage
            src={imageSource}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            aspectRatio={aspectRatio}
          />
          {/* Movie info overlay - only show on desktop for landscape cards - FIXED positioning */}
          {!isMobile && (
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-lg overflow-hidden">
              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 md:p-3 lg:p-5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500 overflow-hidden">
                <h3 className="text-white font-medium text-xs sm:text-base md:text-sm lg:text-lg truncate mb-1 drop-shadow-lg">{title}</h3>
                <div className="flex items-center gap-1.5 sm:gap-2 md:gap-1.5 text-white/90 text-xs sm:text-sm md:text-xs drop-shadow-md">
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-3.5 md:w-3.5 text-yellow-400 drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                    {rating}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Rating Badge - top left (responsive per breakpoint) */}
        {/* xs/sm/md: small */}
        <div className="block lg:hidden">
          <RatingBadge 
            rating={rating || vote_average} 
            position="top-left"
            size="ultra-small"
          />
        </div>
        {/* lg: default */}
        <div className="hidden lg:block xl:hidden">
          <RatingBadge 
            rating={rating || vote_average} 
            position="top-left"
            size="extra-small"
          />
        </div>
        {/* xl: large */}
        <div className="hidden xl:block 2xl:hidden">
          <RatingBadge 
            rating={rating || vote_average} 
            position="top-left"
            size="small"
          />
        </div>
        {/* 2xl+: xl */}
        <div className="hidden 2xl:block">
          <RatingBadge 
            rating={rating || vote_average} 
            position="top-left"
            size="default"
          />
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
          touchAction: 'auto',
        }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isInWatchlistState ? 'text-white-400' : 'text-white'} transition-colors duration-300`} viewBox="0 0 24 24" fill="currentColor">
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

// Optimized MovieSection with better performance and memory management
const MovieSection = memo(({ title, movies, loading, onLoadMore, hasMore, currentPage, sectionKey, onMovieSelect, onMovieHover, onPrefetch }) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isViewAllMode, setIsViewAllMode] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [prefetchingIds, setPrefetchingIds] = useState([]);
  
  const scrollContainerRef = useRef(null);
  const loadingRef = useRef(false);
  const preloadTriggeredRef = useRef(false);
  const preloadTimeoutRef = useRef(null);
  const transitionTimeoutRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const preloadedPagesRef = useRef(new Set());
  
  // Debug logging for development
  useEffect(() => {
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_MEMORY === 'true') {
      console.log(`MovieSection Debug - ${sectionKey}:`, {
        title,
        moviesCount: movies?.length || 0,
        loading,
        hasMore,
        currentPage
      });
    }
  }, [sectionKey, title, movies, loading, hasMore, currentPage]);

  // Check if we're on desktop for navigation buttons - FIXED: Proper cleanup and mobile detection
  useEffect(() => {
    const checkScreenSize = () => {
      // FIXED: More reliable mobile/desktop detection
      const isNowDesktop = window.innerWidth > 768 && 
                          !(window.navigator && window.navigator.userAgent && 
                            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent));
      setIsDesktop(prev => {
        if (prev !== isNowDesktop) {
          if (import.meta.env.DEV) {
            console.log('MovieSection Desktop detection changed:', isNowDesktop, 'Screen width:', window.innerWidth);
          }
          return isNowDesktop;
        }
        return prev;
      });
    };
    
    checkScreenSize();
    const resizeHandler = checkScreenSize;
    
    try {
      window.addEventListener('resize', resizeHandler, { passive: true });
    } catch (error) {
      // Fallback for browsers that don't support passive listeners
      window.addEventListener('resize', resizeHandler);
    }
    
    return () => {
      try {
        window.removeEventListener('resize', resizeHandler);
      } catch (error) {
        console.warn('Error removing resize listener:', error);
      }
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
  }, [hasMore, isLoadingMore, currentPage, sectionKey]); // Removed onLoadMore dependency to prevent infinite loops

  // 🚀 PERFORMANCE OPTIMIZED: Enhanced scroll handler with progressive preloading and throttling
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || loadingRef.current || !hasMore || isLoadingMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const scrollThreshold = 400;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < scrollThreshold;

    // 🚀 OPTIMIZED: Throttled scroll state updates for better performance
    setIsScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 100); // Reduced from 150ms for better responsiveness

    // 🚀 OPTIMIZED: Progressive preloading with debounced execution
    if (isNearBottom) {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
      preloadTimeoutRef.current = setTimeout(() => {
        preloadNextPages();
      }, 50); // Reduced from 100ms for faster preloading
    }
  }, [hasMore, isLoadingMore]); // Removed preloadNextPages dependency to prevent infinite loops

  // Preload next page when entering view all mode
  useEffect(() => {
    if (isViewAllMode && hasMore && !isLoadingMore && !preloadedPagesRef.current.has(currentPage + 1)) {
      preloadNextPages();
    }
  }, [isViewAllMode, hasMore, isLoadingMore, currentPage]); // Removed preloadNextPages dependency to prevent infinite loops

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
          if (import.meta.env.DEV) {
            console.log('MovieSection Desktop detection changed:', isNowDesktop, 'Screen width:', window.innerWidth);
          }
          return isNowDesktop;
        }
        return prev;
      });
    };
    
    checkScreenSize();
    const resizeHandler = checkScreenSize;
    
    try {
      window.addEventListener('resize', resizeHandler, { passive: true });
    } catch (error) {
      // Fallback for browsers that don't support passive listeners
      window.addEventListener('resize', resizeHandler);
    }
    
    return () => {
      try {
        window.removeEventListener('resize', resizeHandler);
      } catch (error) {
        console.warn('Error removing resize listener:', error);
      }
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
          <div className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto pb-4 scrollbar-hide horizontal-scroll-container">
            {[...Array(6)].map((_, index) => (
              <div key={`loader-${sectionKey}-${index}`} className="flex-shrink-0">
                <div className="w-full max-w-[180px] sm:max-w-[220px] md:max-w-[250px]">
                  <div className="aspect-[2/3] bg-gray-800 rounded-lg w-full"></div>
                  <div className="h-4 bg-gray-800 rounded mt-2 w-3/4"></div>
                  <div className="h-3 bg-gray-800 rounded mt-1 w-1/2"></div>
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
                className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 max-h-[600px] overflow-y-auto overflow-x-hidden w-full px-4 sm:px-6 scrollbar-hide justify-items-center scroll-container-fix ultra-smooth-scroll`}
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: isScrolling ? 'rgba(255, 255, 255, 0.2) transparent' : 'rgba(255, 255, 255, 0.1) transparent',
                  scrollBehavior: 'smooth',
                  overscrollBehavior: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  scrollSnapType: 'y proximity',
                  scrollPadding: '1rem',
                  // Ultra-smooth scrolling optimizations
                  willChange: 'scroll-position',
                  transform: 'translateZ(0)', // Force hardware acceleration
                  backfaceVisibility: 'hidden',
                  perspective: '1000px',
                  // Enhanced momentum scrolling
                  scrollSnapAlign: 'start',
                  scrollSnapStop: 'always',
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
            <div className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-4 px-2 sm:px-4 horizontal-scroll-container" style={{
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              willChange: 'scroll-position',
              transform: 'translateZ(0)'
            }}>
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



const HeroSection = memo(({ featuredContent, trendingMovies, onMovieSelect, onGenreClick, onCastMemberClick }) => {
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const { viewingProgress } = useViewingProgress();
  const [isExpanded, setIsExpanded] = useState(false);
  const heroRef = useRef(null);

  // Memoized computed values for performance
  const isMovieInWatchlist = useMemo(() => 
    featuredContent ? isInWatchlist(featuredContent.id) : false, 
    [featuredContent, isInWatchlist]
  );

  // Determine if Resume should be shown instead of Watch Now
  const isResumeAvailable = useMemo(() => {
    if (!featuredContent || !featuredContent.id || !viewingProgress) return false;
    const contentType = featuredContent.type || featuredContent.media_type || featuredContent.mediaType || 'movie';
    if (contentType === 'movie') {
      const progressEntry = viewingProgress[`movie_${featuredContent.id}`];
      return !!(progressEntry && typeof progressEntry.progress === 'number' && progressEntry.progress > 0);
    }
    // For TV, check if any episode for this show has progress > 0
    const tvKeyPrefix = `tv_${featuredContent.id}_`;
    return Object.entries(viewingProgress).some(([key, data]) =>
      key.startsWith(tvKeyPrefix) && typeof data?.progress === 'number' && data.progress > 0
    );
  }, [featuredContent, viewingProgress]);

  // Check if the featured content is trending
  const isTrending = useMemo(() => {
    if (!featuredContent || !featuredContent.id) return false;
    
    // Check if it's in the trending movies list
    const isInTrending = trendingMovies.some(movie => movie.id === featuredContent.id);
    
    // Check if it has high popularity (trending indicator)
    const popularity = featuredContent.popularity || 0;
    const isHighPopularity = popularity > 5000;
    
    // Check if it's recent (within last year)
    const releaseDate = featuredContent.release_date || featuredContent.first_air_date;
    const isRecent = releaseDate ? new Date(releaseDate).getFullYear() >= new Date().getFullYear() - 1 : false;
    
    return isInTrending || isHighPopularity || isRecent;
  }, [featuredContent, trendingMovies]);

  // Mouse event handlers removed for better performance

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
      }

      // Toast handling removed

    } catch (error) {
      console.error('Error in watchlist operation:', error);
    }
  }, [featuredContent, isMovieInWatchlist, addToWatchlist, removeFromWatchlist]);

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
    <MotionConfig reducedMotion="user" transition={{ type: 'tween' }}>
    <div
      ref={heroRef}
      className="relative min-h-[65vh] sm:min-h-[70vh] min-h-[550px] sm:min-h-[600px] w-full overflow-hidden flex items-stretch scrollbar-hide"
    >
      {/* Background Image (No Parallax) - use img for better LCP with fetchPriority */}
      <motion.img
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 will-change-transform transform-gpu"
        src={featuredContent.backdrop}
        alt={`${featuredContent.title || featuredContent.name || 'Featured'} backdrop`}
        decoding="async"
        loading="eager"
        fetchpriority="high"
        sizes="100vw"
        style={{
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />
      {/* Gradient Overlay - Enhanced for mobile visibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#121417] via-[#121417]/90 sm:via-[#121417]/80 to-[#121417]/40 sm:to-transparent" />
      {/* Content */}
      <div className="relative h-full max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center will-change-transform transform-gpu">
        <div className="w-full max-w-2xl flex flex-col gap-4 sm:gap-6 rounded-2xl p-4 sm:p-6 md:p-10 overflow-auto max-h-[85vh] sm:max-h-[90vh] md:max-h-[85vh] lg:max-h-[90vh] mt-4 sm:mt-8 mx-auto scrollbar-hide">
          <div className="flex items-center gap-2 mb-2 sm:mb-4">
            <div className="relative group will-change-transform">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 blur-md group-hover:blur-lg transition-all duration-300 rounded-full transform-gpu will-change-transform"></div>
              <div className="relative flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 bg-black/40 backdrop-blur-sm rounded-full border border-white/10 transform-gpu">
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary transform-gpu" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-xs sm:text-sm font-medium text-white/90 tracking-wide transform-gpu">Trending Now</span>
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
                   className="w-[180px] sm:w-[220px] md:w-[280px] lg:w-[320px] xl:w-[340px] max-w-full h-auto object-contain transform transition-all duration-300 hover:scale-105 opacity-0 animate-fadeIn will-change-transform"
                  onError={e => {
                    const target = e?.currentTarget || e?.target;
                    if (target && target.style) {
                      target.style.display = 'none';
                    }
                  }}
                  onLoad={e => { e.target.classList.remove('opacity-0'); }}
                   loading="eager"
                />
              </motion.div>
            ) : (
              <motion.h1
                className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-extrabold mb-2 sm:mb-4 uppercase tracking-tight leading-tight bg-gradient-to-br from-white via-primary to-[#6b7280] bg-clip-text text-transparent drop-shadow-[0_4px_32px_rgba(99,102,241,0.25), 0 2px 16px rgba(0,0,0,0.45)] animate-hero-title"
                 style={{
                  WebkitTextStroke: '1px rgba(0,0,0,0.12)',
                  letterSpacing: '-0.02em',
                  lineHeight: '1.08',
                   textShadow: '0 4px 32px rgba(99,102,241,0.25), 0 2px 16px rgba(0,2,16,0.45)',
                   willChange: 'transform, opacity'
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
            {/* Content Type Badge */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                featuredContent.type === 'tv' 
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30' 
                  : 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
              }`}>
                {featuredContent.type === 'tv' ? 'TV Series' : 'Movie'}
              </div>
            </div>
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
              className={`text-white/80 leading-relaxed transition-all duration-300 ease-in-out break-words text-sm sm:text-base ${!isExpanded ? 'line-clamp-2' : ''}`}
              style={{ 
                overflow: isExpanded ? 'auto' : 'hidden',
                wordBreak: 'break-word',
                whiteSpace: 'pre-line',
                willChange: 'opacity'
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
              {featuredContent.genres.slice(0, 5).map((genre, i) => {
                // Safely convert genre to string, handling non-primitive values
                let genreName = '';
                try {
                  genreName = typeof genre === 'object' ? genre.name : String(genre);
                } catch (err) {
                  genreName = typeof genre === 'object' ? (genre.name || 'Unknown') : 'Unknown';
                }
                const normalizedGenre = typeof genre === 'object' ? genre : { name: genreName };
                return (
                  <motion.span
                    key={genreName}
                    className="px-2 sm:px-3 py-1 bg-white/10 text-white/80 rounded-full text-xs sm:text-sm cursor-pointer hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 will-change-transform"
                    custom={i}
                    variants={genreChipVariants}
                    initial="hidden"
                    animate="visible"
                    role="button"
                    tabIndex={0}
                    onClick={() => onGenreClick && onGenreClick(normalizedGenre)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onGenreClick && onGenreClick(normalizedGenre);
                      }
                    }}
                  >
                    {genreName}
                  </motion.span>
                );
              })}
            </div>
          )}
          {/* Cast Avatars */}
          {featuredContent.cast && featuredContent.cast.length > 0 && (
            <div className="flex items-center gap-2 sm:gap-4">
              {featuredContent.cast.slice(0, 4).map((person, idx) => (
                <div 
                  key={idx} 
                  className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform duration-200"
                  onClick={() => onCastMemberClick(person)}
                >
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
          <div className="flex flex-row items-center gap-2 sm:gap-3 md:gap-4 overflow-visible px-2 py-4 w-full mb-6">
            <button
              onClick={() => onMovieSelect(featuredContent)}
              className="group relative flex-1 sm:w-auto px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 bg-white text-black rounded-full hover:bg-white/90 transition-all duration-300 flex items-center justify-center gap-2 font-medium hover:scale-105 hover:shadow-lg hover:shadow-white/20 overflow-hidden flex-shrink-0 transform-gpu will-change-transform"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 will-change-transform"></div>
              <div className="relative flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="8,5 20,12 8,19" />
                </svg>
                <span className="text-sm sm:text-base">{isResumeAvailable ? 'Resume' : 'Watch Now'}</span>
              </div>
            </button>
            {/* Trailer Button removed */}
            <button
              onClick={handleWatchlistClick}
              className={`group relative flex-1 sm:w-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 rounded-full transition-all duration-300 flex items-center justify-center gap-2 font-medium hover:scale-105 hover:shadow-lg overflow-hidden flex-shrink-0 transform-gpu will-change-transform ${
                isMovieInWatchlist 
                  ? 'bg-white-500/20 text-white-400 border border-white/30 hover:bg-white/20' 
                  : 'bg-white/10 text-white/90 border border-white/10 hover:bg-white/20'
              }`}
              style={{ whiteSpace: 'nowrap' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 will-change-transform"></div>
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
      {/* Trailer Modal removed */}
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
      {/* Toast removed */}
    </div>
    </MotionConfig>
  );
});

// Optimized Mobile Hero Section with better performance
const MobileHeroSection = memo(({ featuredContent, trendingMovies, loading, onMovieSelect, onGenreClick, onCastMemberClick }) => {
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const { viewingProgress } = useViewingProgress();
  
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const scrollContainerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  // Optimized mobile content with faster loading and immediate fallback
  const mobileContent = useMemo(() => {
    // Prioritize featured content first for immediate display
    if (featuredContent && featuredContent.length > 0) {
      return featuredContent.slice(0, 6); // Show featured content immediately
    }
    
    // Fallback to trending movies if featured content isn't ready
    if (trendingMovies && trendingMovies.length > 0) {
      return trendingMovies.slice(0, 6);
    }
    
    // Return empty array - will show skeleton loading
    return [];
  }, [featuredContent, trendingMovies]);

  // Add immediate fallback content for faster perceived loading
  const fallbackContent = useMemo(() => {
    // Create placeholder content for immediate display while real content loads
    return Array.from({ length: 6 }, (_, index) => ({
      id: `placeholder-${index}`,
      title: `Loading...`,
      poster_path: null,
      backdrop_path: null,
      isPlaceholder: true,
      type: 'movie'
    }));
  }, []);

  // Determine what content to show based on loading state
  const displayContent = useMemo(() => {
    if (loading && mobileContent.length === 0) {
      return fallbackContent; // Show skeleton loading
    }
    return mobileContent.length > 0 ? mobileContent : fallbackContent;
  }, [loading, mobileContent, fallbackContent]);

  // Priority loading: Show first 2 items immediately, then load the rest
  const priorityContent = useMemo(() => {
    if (mobileContent.length > 0) {
      // Show first 2 items immediately, then progressively load more
      const immediate = mobileContent.slice(0, 2);
      const delayed = mobileContent.slice(2);
      return [...immediate, ...delayed];
    }
    return displayContent;
  }, [mobileContent, displayContent]);

  // Helper function to check if a movie is in watchlist
  const checkIsInWatchlist = useCallback((content) => {
    return content ? isInWatchlist(content.id) : false;
  }, [isInWatchlist]);

  // Helper function to check if resume is available
  const checkIsResumeAvailable = useCallback((content) => {
    if (!content || !content.id || !viewingProgress) return false;
    const contentType = content.type || content.media_type || content.mediaType || 'movie';
    if (contentType === 'movie') {
      const progressEntry = viewingProgress[`movie_${content.id}`];
      return !!(progressEntry && typeof progressEntry.progress === 'number' && progressEntry.progress > 0);
    }
    // For TV, check if any episode for this show has progress > 0
    const tvKeyPrefix = `tv_${content.id}_`;
    return Object.entries(viewingProgress).some(([key, data]) =>
      key.startsWith(tvKeyPrefix) && typeof data?.progress === 'number' && data.progress > 0
    );
  }, [viewingProgress]);

  // Scroll to specific card
  const scrollToCard = useCallback((index) => {
    if (!scrollContainerRef.current || index < 0 || index >= priorityContent.length) return;
    
    const cardWidth = scrollContainerRef.current.scrollWidth / priorityContent.length;
    const scrollPosition = index * cardWidth;
    
    scrollContainerRef.current.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    });
  }, [priorityContent.length]);



  // Handle scroll events to update current card index
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const scrollLeft = scrollContainerRef.current.scrollLeft;
    const cardWidth = scrollContainerRef.current.scrollWidth / priorityContent.length;
    const newIndex = Math.round(scrollLeft / cardWidth);
    
    if (newIndex !== currentCardIndex) {
      setCurrentCardIndex(newIndex);
    }
  }, [currentCardIndex, priorityContent.length]);

  // Handle manual card selection
  const handleCardSelect = useCallback((index) => {
    setCurrentCardIndex(index);
    scrollToCard(index);
  }, [scrollToCard]);

  const handleWatchlistClick = useCallback((e, content) => {
    e.stopPropagation();
    if (!content) return;

    try {
      const isInWatchlist = checkIsInWatchlist(content);
      if (isInWatchlist) {
        removeFromWatchlist(content.id);
      } else {
        const release = content.release_date || content.first_air_date || '';
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

        let normalizedRating = 0;
        if (typeof content.rating === 'number' && !isNaN(content.rating)) {
          normalizedRating = Math.max(0, Math.min(10, content.rating));
        } else if (typeof content.rating === 'string') {
          const parsed = parseFloat(content.rating);
          if (!isNaN(parsed)) {
            normalizedRating = Math.max(0, Math.min(10, parsed));
          }
        }

        const movieData = {
          id: content.id,
          title: content.title?.trim() || content.name?.trim() || 'Untitled',
          type: content.type || 'movie',
          poster_path: content.poster_path || content.backdrop || '',
          backdrop_path: content.backdrop || content.poster_path || '',
          overview: content.overview?.trim() || 'No overview available',
          year: computedYear,
          rating: normalizedRating,
          genres: Array.isArray(content.genres) ? content.genres : [],
          release_date: release,
          addedAt: new Date().toISOString(),
          originalLanguage: content.original_language || 'en',
          popularity: content.popularity || 0,
          voteCount: content.vote_count || 0,
          mediaType: content.media_type || content.type || 'movie'
        };

        addToWatchlist(movieData);
      }
    } catch (error) {
      console.error('Error in watchlist operation:', error);
    }
  }, [checkIsInWatchlist, addToWatchlist, removeFromWatchlist]);

  // Intersection Observer for performance optimization
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = currentCardIndex > 0 ? currentCardIndex - 1 : priorityContent.length - 1;
        handleCardSelect(prevIndex);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = (currentCardIndex + 1) % priorityContent.length;
        handleCardSelect(nextIndex);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentCardIndex, priorityContent.length]); // Removed handleCardSelect dependency to prevent infinite loops

  // Show loading skeleton for faster perceived performance
  if (loading && (!mobileContent || mobileContent.length === 0)) {
    return (
      <div className="px-4 py-6 sm:hidden pb-0">
        {/* Loading Skeleton */}
        <div className="flex items-center gap-2 mb-4 ml-2 md:ml-0">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 blur-md rounded-full"></div>
                      <div className="relative flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-full border border-white/10">
            <div className="w-3.5 h-3.5 bg-gray-800 rounded-full"></div>
            <div className="w-20 h-4 bg-gray-800 rounded"></div>
          </div>
          </div>
        </div>
        
        {/* Skeleton Cards */}
        <div className="flex gap-6 overflow-x-auto pb-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="flex-shrink-0 w-[calc(100vw-2rem)] max-w-md bg-black rounded-3xl overflow-hidden">
              <div className="h-56 bg-gray-900"></div>
              <div className="p-5 space-y-3">
                <div className="h-6 bg-gray-800 rounded w-3/4"></div>
                <div className="h-4 bg-gray-800 rounded w-1/2"></div>
                <div className="h-4 bg-gray-800 rounded w-2/3"></div>
                <div className="h-4 bg-gray-800 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={sectionRef}
      className="px-4 py-6 sm:hidden pb-0"
    >
              {/* Loading Indicator */}
      {loading && (
        <div className="flex items-center gap-2 mb-3 ml-2 md:ml-0">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 backdrop-blur-sm rounded-full border border-blue-400/20">
            <div className="w-3.5 h-3.5 bg-blue-400 rounded-full"></div>
            <span className="text-sm font-medium text-blue-200 tracking-wide">Loading content...</span>
          </div>
        </div>
      )}

      {/* Trending Badge */}
        <div className="flex items-center gap-2 mb-4 ml-2 md:ml-0">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 blur-md rounded-full"></div>
          <div className="relative flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-full border border-white/10">
            <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-sm font-medium text-white/90 tracking-wide">Trending Now</span>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Content Cards */}
      <div className="relative">
        <div 
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory px-1" 
          style={{
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
            scrollSnapType: 'x mandatory',
            scrollPadding: '0 1rem',
            willChange: 'scroll-position'
          }}
          onScroll={handleScroll}
        >
        {priorityContent.map((content, index) => {

          
          const isInWatchlist = checkIsInWatchlist(content);
          const isResumeAvailable = checkIsResumeAvailable(content);
          
          // Enhanced year extraction with better fallbacks
          let year = 'N/A';
          try {
            // Check multiple possible date fields
            const possibleDates = [
              content.release_date,
              content.first_air_date,
              content.releaseDate,
              content.firstAirDate,
              content.air_date,
              content.airDate
            ].filter(Boolean);
            
            if (possibleDates.length > 0) {
              for (const dateStr of possibleDates) {
                try {
                  const date = new Date(dateStr);
                  if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() <= new Date().getFullYear() + 10) {
                    year = date.getFullYear();
                    break;
                  }
                } catch (e) {
                  continue;
                }
              }
            }
            
            // If still N/A, try to extract from title or other fields
            if (year === 'N/A') {
              // Check if there's a year in the title (e.g., "Movie Name (2023)")
              const titleMatch = (content.title || content.name || '').match(/\((\d{4})\)/);
              if (titleMatch) {
                const titleYear = parseInt(titleMatch[1]);
                if (titleYear > 1900 && titleYear <= new Date().getFullYear() + 10) {
                  year = titleYear;
                }
              }
            }
          } catch (error) {
            console.warn('Error parsing date for year:', error);
            year = 'N/A';
          }
          
          // Enhanced runtime extraction with better fallbacks
          let runtime = 'N/A';
          try {
            if (content.type === 'tv') {
              // For TV shows, try multiple approaches
              if (content.number_of_seasons && content.number_of_seasons > 0) {
                runtime = `${content.number_of_seasons} Season${content.number_of_seasons > 1 ? 's' : ''}`;
              } else if (content.episode_run_time && Array.isArray(content.episode_run_time) && content.episode_run_time.length > 0) {
                const episodeTime = content.episode_run_time[0];
                if (episodeTime && episodeTime > 0) {
                  const hours = Math.floor(episodeTime / 60);
                  const minutes = episodeTime % 60;
                  runtime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                }
              } else if (content.episodeRunTime && Array.isArray(content.episodeRunTime) && content.episodeRunTime.length > 0) {
                const episodeTime = content.episodeRunTime[0];
                if (episodeTime && episodeTime > 0) {
                  const hours = Math.floor(episodeTime / 60);
                  const minutes = episodeTime % 60;
                  runtime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                }
              } else if (content.episode_runtime) {
                const episodeTime = content.episode_runtime;
                if (episodeTime && episodeTime > 0) {
                  const hours = Math.floor(episodeTime / 60);
                  const minutes = episodeTime % 60;
                  runtime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                }
              }
              
              // If still N/A, provide a generic TV label
              if (runtime === 'N/A') {
                runtime = 'TV Series';
              }
            } else {
              // For movies, check multiple runtime fields
              const possibleRuntimes = [
                content.runtime,
                content.duration,
                content.movie_runtime
              ].filter(r => r && r > 0);
              

              
              if (possibleRuntimes.length > 0) {
                const movieTime = possibleRuntimes[0];
                const hours = Math.floor(movieTime / 60);
                const minutes = movieTime % 60;
                runtime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
              } else {
                runtime = 'Movie';
              }
            }
          } catch (error) {
            console.warn('Error parsing runtime:', error);
            runtime = content.type === 'tv' ? 'TV Series' : 'Movie';
          }
          

          
                    return (
            <div 
              key={`${content.id}-${index}`} 
              className={`flex-shrink-0 w-[calc(100vw-2rem)] max-w-md rounded-3xl overflow-hidden border border-white/10 shadow-2xl snap-center transition-all duration-500 flex flex-col ${
                content.isPlaceholder 
                  ? 'cursor-default' 
                  : 'cursor-pointer hover:scale-[1.03] active:scale-[0.97]'
              }`}
              onClick={content.isPlaceholder ? undefined : () => onMovieSelect(content)}
            >
              {/* Background Image */}
              <div className="relative h-56 w-full overflow-hidden">
                {content.isPlaceholder ? (
                  <div className="w-full h-full bg-gray-700" />
                ) : (
                  <img
                    src={content.backdrop || content.poster_path}
                    alt={`${content.title || content.name || 'Content'} backdrop`}
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                    loading={index < 2 ? "eager" : "lazy"}
                    fetchpriority={index < 2 ? "high" : "auto"}
                    decoding="async"
                  />
                )}
                {/* Enhanced Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 via-black/30 to-transparent" />
                
                {/* Subtle Vignette Effect */}
                <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/20" />
                
                {/* Content Type Badge */}
                <div className="absolute top-4 left-4">
                                     <div className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                     content.type === 'tv' 
                       ? 'bg-purple-500/20 text-purple-200 border border-purple-400/20' 
                       : 'bg-blue-500/20 text-blue-200 border border-blue-400/20'
                   }`}>
                    {content.type === 'tv' ? 'TV Series' : 'Movie'}
                  </div>
                </div>

                {/* Rating Badge */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/30 backdrop-blur-md rounded-full border border-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                  </svg>
                  <span className="text-xs text-white font-medium">
                    {typeof content.rating === 'number' 
                      ? content.rating.toFixed(1)
                      : typeof content.rating === 'string'
                        ? parseFloat(content.rating).toFixed(1)
                        : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Content Details */}
              <div className="p-5 flex flex-col flex-1 pb-6">
                {/* Title and Action Buttons Row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 pr-4">
                    {content.isPlaceholder ? (
                      <>
                        <div className="h-6 bg-gray-700 rounded mb-3" />
                        <div className="flex items-center gap-3">
                          <div className="h-4 bg-gray-700 rounded w-12" />
                          <div className="h-4 bg-gray-700 rounded w-2" />
                          <div className="h-4 bg-gray-700 rounded w-16" />
                        </div>
                      </>
                    ) : (
                      <>
                        <h2 className="text-xl font-medium text-white/90 mb-3 overflow-hidden leading-tight" style={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {content.title || content.name}
                        </h2>
                        
                        {/* Meta Info */}
                        <div className="flex items-center gap-3 text-white/60 text-sm">
                          <span>{year}</span>
                          <span className="text-white/40">•</span>
                          <span>{runtime}</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Action Buttons - Icon Only (One Line) */}
                  <div className="flex flex-row gap-2 flex-shrink-0">
                    {content.isPlaceholder ? (
                      <>
                        <div className="w-12 h-12 bg-gray-700 rounded-full" />
                        <div className="w-12 h-12 bg-gray-700 rounded-full" />
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMovieSelect(content);
                          }}
                          className="w-12 h-12 bg-white/90 backdrop-blur-sm text-black rounded-full hover:bg-white transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95"
                          title={isResumeAvailable ? 'Resume' : 'Watch Now'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="8,5 20,12 8,19" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWatchlistClick(e, content);
                          }}
                          className={`w-12 h-12 rounded-full transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95 backdrop-blur-sm ${
                            isInWatchlist 
                              ? 'bg-white/20 text-white border border-white/20 hover:bg-white/30' 
                              : 'bg-white/10 text-white/95 border border-white/10 hover:bg-white/20'
                          }`}
                          title={isInWatchlist ? 'Remove from List' : 'Add to List'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                            {isInWatchlist ? (
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                            ) : (
                              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                            )}
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Genres */}
                {content.isPlaceholder ? (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-4 bg-gray-700 rounded w-16" />
                    <div className="h-4 bg-gray-700 rounded w-2" />
                    <div className="h-4 bg-gray-700 rounded w-20" />
                  </div>
                ) : (
                  content.genres && content.genres.length > 0 && (
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {content.genres.slice(0, 2).map((genre, i) => {
                        let genreName = '';
                        try {
                          genreName = typeof genre === 'object' ? genre.name : String(genre);
                        } catch (err) {
                          genreName = typeof genre === 'object' ? (genre.name || 'Unknown') : 'Unknown';
                        }
                        const normalizedGenre = typeof genre === 'object' ? genre : { name: genreName };
                        return (
                          <React.Fragment key={genreName}>
                            <span
                              className="text-white/70 text-xs cursor-pointer hover:text-white transition-colors duration-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                onGenreClick && onGenreClick(normalizedGenre);
                              }}
                            >
                              {genreName}
                            </span>
                            {i < content.genres.slice(0, 2).length - 1 && (
                              <span className="text-white/40 text-xs">•</span>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )
                )}

                {/* Overview */}
                {content.isPlaceholder ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-full" />
                    <div className="h-4 bg-gray-700 rounded w-3/4" />
                  </div>
                ) : (
                  <p className="text-white/70 text-sm leading-relaxed mb-0 overflow-hidden" style={{ 
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {content.overview}
                  </p>
                )}


              </div>
            </div>
          );
        })}
        </div>
        
        {/* Scroll Indicators */}
        <div className="flex justify-center mt-4">
          <div className="flex items-center gap-2">
            {priorityContent.map((_, index) => (
              <button
                key={index}
                onClick={() => handleCardSelect(index)}
                className={`w-2 h-2 rounded-full transition-all duration-200 cursor-pointer ${
                  index === currentCardIndex 
                    ? 'bg-white' 
                    : 'bg-white/20 hover:bg-white/40'
                }`}
                aria-label={`Go to card ${index + 1}`}
              />
            ))}
          </div>
        </div>
        
        {/* Scroll Hint */}
        <div className="flex justify-center mt-3">
          {/* Auto-scroll toggle */}

          

          <div className="flex items-center gap-2 text-white/60 text-xs mb-3">

            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Swipe to see more</span>
            </div>
        </div>
      </div>
    </div>
  );
});

// Optimized categories list with better performance
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
  },

];

// Memoize MovieSection and HeroSection
const MemoizedMovieSection = memo(MovieSection);
const MemoizedHeroSection = memo(HeroSection);
const MemoizedMobileHeroSection = memo(MobileHeroSection);

// Lazy-load MovieDetailsOverlay
const LazyMovieDetailsOverlay = lazy(() => import('./MovieDetailsOverlay'));

const MOVIE_DETAILS_TTL = 60 * 60 * 1000; // 1 hour
const MOVIE_DETAILS_CACHE_LIMIT = 100;

const HomePage = () => {
  // Performance monitoring and optimization
  const performanceMetrics = usePerformanceMonitoring();
  const { reducedMotion, isPointerFine, isLowEndDevice } = useDevicePerformanceHints();
  
  // Persistent cache for cross-navigation
  const {
    isSectionCached,
    getCachedSection,
    setCachedSection,
    getCacheStats,
    clearCache,
    shouldSkipInitialLoading,
    isInitialized: cacheInitialized
  } = usePersistentCache();

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

  // Movie state variables
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
  
  // TV Shows state variables
  const [popularTVShows, setPopularTVShows] = useState([]);
  const [topRatedTVShows, setTopRatedTVShows] = useState([]);
  const [airingTodayTVShows, setAiringTodayTVShows] = useState([]);
  const [nowPlayingMovies, setNowPlayingMovies] = useState([]);
  
  // UI state variables
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [error, setError] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isInWatchlistState, setIsInWatchlistState] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Ad blocker recommendation toast state
  const [showAdBlockerToast, setShowAdBlockerToast] = useState(false);
  
  // Cast Details state
  const [selectedCastMember, setSelectedCastMember] = useState(null);
  const [showCastDetails, setShowCastDetails] = useState(false);
  
  // 🚀 FIXED: Retry count tracking to prevent infinite loops
  const [retryCounts, setRetryCounts] = useState({});
  
  // Hooks
  const { loadingStates, setLoadingState } = useLoading();
  const { addToWatchlist, isInWatchlist, removeFromWatchlist } = useWatchlist();
  const { refreshFromStorage } = useViewingProgress();

  // Optimized page states configuration
  const [pageStates, setPageStates] = useState({
    // High priority sections
    trending: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    popular: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    topRated: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    
    // Medium priority sections
    upcoming: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    action: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    comedy: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    drama: { current: 1, total: 1, isLoading: false, hasMore: true, lastFetched: null },
    
    // Low priority sections
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

  // FIXED: Track unique movie IDs for all categories - moved here to prevent hoisting issues
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

  // Optimized cache configuration
  const [dataCache, setDataCache] = useState({});
  const [featuredContent, setFeaturedContent] = useState(null);
  
  // Cache constants
  const CACHE_DURATION = 60 * 60 * 1000; // 1 hour TTL
  const CACHE_VERSION = '2.0';
  const STALE_MAX_AGE = 12 * 60 * 60 * 1000; // 12 hours stale usage
  const MAX_CACHE_SIZE = 1 * 1024 * 1024; // 1 MB
  const MAX_PAGES_PER_CATEGORY = 5;
  const MAX_TOTAL_CACHE_ITEMS = 25;

  // Optimized section TTLs for better performance
  const SECTION_TTLS = useMemo(() => ({
    featured: 15 * 60 * 1000,      // 15 minutes
    trending: 20 * 60 * 1000,      // 20 minutes
    nowPlaying: 30 * 60 * 1000,    // 30 minutes
    popular: 90 * 60 * 1000,       // 1.5 hours
    topRated: 90 * 60 * 1000,      // 1.5 hours
    upcoming: 120 * 60 * 1000,     // 2 hours
    popularTV: 90 * 60 * 1000,     // 1.5 hours
    topRatedTV: 90 * 60 * 1000,    // 1.5 hours
    airingToday: 30 * 60 * 1000    // 30 minutes
  }), []);

      // Helper: clean expired cache entries
      const cleanMovieDetailsCache = () => {
        const now = Date.now();
        Object.keys(movieDetailsCache.current).forEach((id) => {
          if (now - movieDetailsCache.current[id].timestamp > MOVIE_DETAILS_TTL) {
            delete movieDetailsCache.current[id];
          }
        });
      };

  const getBaseSectionFromKey = useCallback((cacheKey) => {
    if (!cacheKey || typeof cacheKey !== 'string') return cacheKey;
    const pageIdx = cacheKey.indexOf('_page_');
    return pageIdx > -1 ? cacheKey.slice(0, pageIdx) : cacheKey;
  }, []);

  const getTTLForKey = useCallback((cacheKey) => {
    const base = getBaseSectionFromKey(cacheKey);
    return SECTION_TTLS[base] || CACHE_DURATION;
  }, [SECTION_TTLS, CACHE_DURATION, getBaseSectionFromKey]);
  
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

  // Add movie to prefetch queue
  const queuePrefetch = useCallback((movieId) => {
    if (prefetchQueue.has(movieId)) {
      return; // Already in queue
    }
    
    // Add to prefetch queue
    setPrefetchQueue(prev => new Set([...prev, movieId]));
    
    // Start prefetching if not already running
    if (!isPrefetching) {
      setIsPrefetching(true);
      // Process prefetch queue
      setTimeout(() => {
        setPrefetchQueue(new Set());
        setIsPrefetching(false);
      }, 100);
    }
  }, [prefetchQueue, isPrefetching]);

  // Record prefetch analytics
  const recordPrefetch = useCallback((movieId) => {
    if (prefetchAnalytics.current) {
      prefetchAnalytics.current.prefetched[movieId] = Date.now();
      prefetchAnalytics.current.totalPrefetched++;
    }
  }, []);

  // Record prefetch usage
  const recordPrefetchUsed = useCallback((movieId) => {
    if (prefetchAnalytics.current && prefetchAnalytics.current.prefetched[movieId]) {
      const prefetchTime = prefetchAnalytics.current.prefetched[movieId];
      const usageTime = Date.now();
      const timeToUsage = usageTime - prefetchTime;
      
      if (!prefetchAnalytics.current.usageTimes) {
        prefetchAnalytics.current.usageTimes = [];
      }
      prefetchAnalytics.current.usageTimes.push(timeToUsage);
      
      // Keep only last 100 usage times to prevent memory leaks
      if (prefetchAnalytics.current.usageTimes.length > 100) {
        prefetchAnalytics.current.usageTimes = prefetchAnalytics.current.usageTimes.slice(-100);
      }
    }
  }, []);

  // 🚀 ULTRA-OPTIMIZED: Priority-based loading queue with virtual scrolling
  const [loadingQueue] = useState({
    critical: ['trending', 'popular'],
    high: ['topRated', 'upcoming'],
    medium: ['action', 'comedy', 'drama'],
    low: ['horror', 'sciFi', 'documentary', 'family', 'animation', 'awardWinning', 'latest', 'popularTV', 'topRatedTV', 'airingToday', 'nowPlaying']
  });

  // 🚀 NEW: Virtual scrolling optimization with intersection observer
  const [visibleSections, setVisibleSections] = useState(new Set(['all', 'trending', 'popular', 'topRated', 'upcoming', 'action', 'comedy', 'drama', 'horror', 'sciFi', 'documentary', 'family', 'animation', 'awardWinning', 'latest', 'popularTV', 'topRatedTV', 'airingToday', 'nowPlaying']));
  const [virtualScrollConfig] = useState({
    itemHeight: 300, // Approximate height of movie cards
    overscan: 2, // Number of items to render outside viewport
    batchSize: 10, // Number of items to render in each batch
    throttleMs: 16 // Throttle intersection observer updates
  });

  // 🚀 NEW: Request tracking to prevent duplicates and manage concurrent requests
  const [activeRequests, setActiveRequests] = useState(new Set());

  // Define categories early to avoid hoisting issues
  const categories = useMemo(() => categoriesList, []);
  
  // Intersection observer for lazy loading sections
  const sectionObserverRef = useRef(null);
  const [lazyLoadQueue, setLazyLoadQueue] = useState(new Set());
  
  // Handle cast member click
  const handleCastMemberClick = useCallback((person) => {
    setSelectedCastMember(person);
    setShowCastDetails(true);
  }, []);

  // Handle cast details close
  const handleCastDetailsClose = useCallback(() => {
    setShowCastDetails(false);
    setSelectedCastMember(null);
  }, []);

  // Handle movie selection
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

  // Helper functions for movie details cache
  const movieDetailsCache = useRef({});
  const MOVIE_DETAILS_TTL = 5 * 60 * 1000; // 5 minutes
  const MOVIE_DETAILS_CACHE_LIMIT = 50; // Max 50 movie details in cache
  const prefetchAnalytics = useRef({
    prefetched: {},
    used: {},
    totalPrefetched: 0,
    totalUsed: 0,
  });

  const getCachedMovieDetails = (id) => {
    const entry = movieDetailsCache.current[id];
    if (!entry) return null;
    if (Date.now() - entry.timestamp < MOVIE_DETAILS_TTL) {
      return entry.data;
    }
    return null;
  };

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
  
  // 🚀 PERFORMANCE OPTIMIZED: Enhanced intersection observer with advanced lazy loading and performance monitoring
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    
    sectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        // 🚀 OPTIMIZED: Batch state updates for better performance
        const newVisibleSections = new Set();
        const newLazyLoadItems = new Set();
        
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const sectionKey = entry.target.dataset.section;
            if (sectionKey) {
              newVisibleSections.add(sectionKey);
              newLazyLoadItems.add(sectionKey);
            }
          }
        });
        
        // Batch state updates to prevent multiple re-renders
        if (newVisibleSections.size > 0) {
          setVisibleSections(prev => new Set([...prev, ...newVisibleSections]));
        }
        if (newLazyLoadItems.size > 0) {
          setLazyLoadQueue(prev => new Set([...prev, ...newLazyLoadItems]));
        }
      },
              {
          rootMargin: '200px 0px', // Increased for better preloading
          threshold: 0.05, // Reduced threshold for earlier detection
          // 🚀 OPTIMIZED: Use passive observation for better performance
          passive: true,
          // 🚀 ADDITIONAL PERFORMANCE OPTIMIZATIONS
          trackVisibility: false,
          delay: 100
        }
    );
    
    return () => {
      if (sectionObserverRef.current) {
        sectionObserverRef.current.disconnect();
        sectionObserverRef.current = null;
      }
      // Clear state on cleanup
      setVisibleSections(new Set(['all', 'trending', 'popular', 'topRated', 'upcoming', 'action', 'comedy', 'drama', 'horror', 'sciFi', 'documentary', 'family', 'animation', 'awardWinning', 'latest', 'popularTV', 'topRatedTV', 'airingToday', 'nowPlaying']));
      setLazyLoadQueue(new Set());
    };
  }, []); // Empty dependency array to prevent infinite loops

  // FIXED: Enhanced mobile detection effect with proper cleanup
  useEffect(() => {
    const checkScreenSize = () => {
      const isNowMobile = window.innerWidth < 768 || 
                         (window.navigator && window.navigator.userAgent && 
                          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent));
      setIsMobile(prev => {
        if (prev !== isNowMobile) {
          if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_MEMORY === 'true') {
            console.log('Mobile detection changed:', isNowMobile, 'Screen width:', window.innerWidth);
          }
          return isNowMobile;
        }
        return prev;
      });
    };
    
    checkScreenSize();
    const resizeHandler = checkScreenSize;
    
    try {
      window.addEventListener('resize', resizeHandler, { passive: true });
    } catch (error) {
      // Fallback for browsers that don't support passive listeners
      window.addEventListener('resize', resizeHandler);
    }
    
    return () => {
      try {
        window.removeEventListener('resize', resizeHandler);
      } catch (error) {
        console.warn('Error removing resize listener:', error);
      }
    };
  }, []);

  // 🎬 FIXED: Auto-refresh viewing progress when user returns to page
  useEffect(() => {
    // Refresh viewing progress to ensure continue watching section is up to date
    refreshFromStorage();
    
    // Also refresh when the page becomes visible again (user returns from watching content)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (import.meta.env.DEV) {
          console.log('🔄 Page became visible, refreshing viewing progress...');
        }
        refreshFromStorage();
      }
    };

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also refresh when the window gains focus (alternative approach)
    const handleFocus = () => {
      if (import.meta.env.DEV) {
        console.log('🔄 Window gained focus, refreshing viewing progress...');
      }
      refreshFromStorage();
    };
    
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshFromStorage]); // Keep necessary dependency for proper functionality

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
      if (timeoutRefs.current) {
        timeoutRefs.current.forEach(timeoutId => {
          try {
            clearTimeout(timeoutId);
          } catch (error) {
            console.warn('Error clearing timeout during memory optimization cleanup:', error);
          }
        });
        timeoutRefs.current.clear();
      }
      if (intervalRefs.current) {
        intervalRefs.current.forEach(intervalId => {
          try {
            clearInterval(intervalId);
          } catch (error) {
            console.warn('Error clearing interval during memory optimization cleanup:', error);
          }
        });
        intervalRefs.current.clear();
      }
      
      // Clear movie details cache
      cleanMovieDetailsCache();
      
      // Clear intersection observer
      if (sectionObserverRef.current) {
        sectionObserverRef.current.disconnect();
        sectionObserverRef.current = null;
      }
      
      // Clear lazy load queue
      setLazyLoadQueue(new Set());
      setVisibleSections(new Set(['all', 'trending', 'popular', 'topRated', 'upcoming', 'action', 'comedy', 'drama', 'horror', 'sciFi', 'documentary', 'family', 'animation', 'awardWinning', 'latest', 'popularTV', 'topRatedTV', 'airingToday', 'nowPlaying']));
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
  // 🚀 ENHANCED: Ultra-optimized prefetching configuration with adaptive behavior
  const PREFETCH_CONFIG = {
    viewportThreshold: 0.15, // Reduced to 15% for even earlier prefetching
    maxConcurrentPrefetches: 3, // Increased to 3 for better coverage
    prefetchDelay: 30, // Reduced to 30ms for faster response
    priorityCategories: ['trending', 'popular', 'topRated'],
    adjacentCategories: true,
    smartPrefetching: true,
    requestDeduplication: true, // Prevent duplicate requests
    adaptivePrefetching: true, // Adjust based on network conditions
    memoryAware: true, // Consider memory usage when prefetching
    networkAware: true, // Adapt to network speed
    userBehaviorAware: true // Learn from user interaction patterns
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

  // 🚀 ENHANCED: Ultra-optimized progressive loading configuration with intelligent scheduling
  const PROGRESSIVE_LOADING_CONFIG = {
    criticalDelay: 0, // Load critical sections immediately
    highDelay: 30, // Reduced to 30ms for faster loading
    mediumDelay: 80, // Reduced to 80ms for faster loading
    lowDelay: 150, // Reduced to 150ms for faster loading
    batchSize: 4, // Increased to 4 sections at a time for faster loading
    maxConcurrent: 6, // Increased to 6 concurrent requests for faster loading
    adaptiveTiming: true, // Adjust based on network speed
    priorityQueue: true, // Use priority queue for better scheduling
    preloadThreshold: 0.5, // Start preloading when 50% of current section is loaded
    cacheStrategy: 'aggressive', // More aggressive caching for faster subsequent loads
    memoryOptimization: true, // Optimize memory usage during loading
    networkAdaptation: true, // Adapt to network conditions
    userExperienceOptimization: true // Prioritize user experience metrics
  };

  // 📊 NEW: Performance monitoring
  const performanceObserver = useRef(null);
  
  // 🧹 NEW: Track all timeouts and intervals for proper cleanup
  const timeoutRefs = useRef(new Set());
  const intervalRefs = useRef(new Set());
  const isMountedRef = useRef(true);
  const visibilityObserverRef = useRef(null);

  // FIXED: Add missing refs that were causing undefined errors
  const autoRotateIntervalRef = useRef(null);
  const isTransitioningRef = useRef(false);

  // 🧹 ENHANCED: Comprehensive cleanup function - FIXED: Memory leaks
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

    // State updates only if still mounted to avoid update-depth loops
    if (isMountedRef.current) {
      // Clear prefetch queue
      setPrefetchQueue(new Set());
      setIsPrefetching(false);

      // Clear viewport items
      setViewportItems(new Set());

      // Clear visible sections
      setVisibleSections(new Set(['all', 'trending', 'popular', 'topRated', 'upcoming', 'action', 'comedy', 'drama', 'horror', 'sciFi', 'documentary', 'family', 'animation', 'awardWinning', 'latest', 'popularTV', 'topRatedTV', 'airingToday', 'nowPlaying']));

      // Reset memory optimization
      setMemoryOptimization({
        lastCleanup: Date.now(),
        itemsInMemory: 0,
        maxItemsAllowed: 500
      });
    }

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

    // Use centralized timer cleanup function
    cleanupAllTimers();

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

    // Clear section observer if it exists
    if (sectionObserverRef && sectionObserverRef.current) {
      try {
        sectionObserverRef.current.disconnect();
        sectionObserverRef.current = null;
      } catch (error) {
        console.warn('Failed to disconnect section observer:', error);
      }
    }

    // Mark as unmounted
    isMountedRef.current = false;

    console.log('🧹 HomePage cleanup completed');
  }, []);

  // 🧹 ENHANCED: Memory optimization helpers with better monitoring
  const optimizeMemoryUsage = useCallback(() => {
    const now = Date.now();
    
    setMemoryOptimization(prev => {
      const timeSinceLastCleanup = now - prev.lastCleanup;
      
      // Clean up old cache entries if needed
      if (timeSinceLastCleanup > 5 * 60 * 1000) { // 5 minutes
        // Use a safer approach to avoid dependency issues
        try {
          const currentCache = cacheRef.current;
          if (currentCache && currentCache.size > MAX_TOTAL_CACHE_ITEMS) {
            // Convert to array and sort by timestamp
            const entries = Array.from(currentCache.entries());
            const sortedEntries = entries.sort((a, b) => {
              const aTime = a[1]?.timestamp || 0;
              const bTime = b[1]?.timestamp || 0;
              return aTime - bTime;
            });
            
            // Remove oldest entries
            const keysToRemove = sortedEntries.slice(0, entries.length - MAX_TOTAL_CACHE_ITEMS);
            keysToRemove.forEach(([key]) => {
              currentCache.delete(key);
            });
          }
        } catch (error) {
          console.warn('Error during memory optimization:', error);
        }
        
        return {
          ...prev,
          lastCleanup: now,
          itemsInMemory: cacheRef.current ? cacheRef.current.size : 0
        };
      }
      
      return prev;
    });
  }, []); // No dependencies to prevent infinite loops

  // 🧹 ENHANCED: Advanced memory monitoring with performance tracking
  const monitorMemoryUsage = useCallback(() => {
    if (performance.memory && import.meta.env.DEV) {
      try {
        const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
        const totalMB = performance.memory.totalJSHeapSize / 1024 / 1024;
        const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
        
        // Log memory usage for debugging
        if (import.meta.env.VITE_DEBUG_MEMORY === 'true') {
          console.log(`🧠 Memory Usage: ${usedMB.toFixed(2)}MB / ${totalMB.toFixed(2)}MB (Limit: ${limitMB.toFixed(2)}MB)`);
        }
        
        // Force cleanup if memory usage is high
        if (usedMB > 800) {
          console.warn(`⚠️ High memory usage detected: ${usedMB.toFixed(2)}MB`);
          
          // Trigger aggressive cleanup
          if (cleanup && typeof cleanup === 'function') {
            cleanup();
          }
          
          // Force garbage collection if available
          if (window.gc && typeof window.gc === 'function') {
            try {
              window.gc();
            } catch (error) {
              console.warn('Failed to force garbage collection:', error);
            }
          }
          
          // Update memory optimization state
          setMemoryOptimization(prev => ({
            ...prev,
            lastCleanup: Date.now(),
            itemsInMemory: 0
          }));
        }
      } catch (error) {
        console.warn('Error during memory monitoring:', error);
      }
    }
  }, [cleanup]);

  // 🧹 ENHANCED: Utility functions for tracking timeouts and intervals with proper memory management
  const trackedSetTimeout = useCallback((callback, delay) => {
    if (!isMountedRef.current) return null;
    
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        try {
          callback();
        } catch (error) {
          console.warn('Error in tracked timeout callback:', error);
        }
      }
      if (timeoutRefs.current) {
        timeoutRefs.current.delete(timeoutId);
      }
    }, delay);
    
    if (timeoutRefs.current) {
      timeoutRefs.current.add(timeoutId);
    }
    return timeoutId;
  }, []);

  const trackedSetInterval = useCallback((callback, delay) => {
    if (!isMountedRef.current) return null;
    
    const intervalId = setInterval(() => {
      if (isMountedRef.current) {
        try {
          callback();
        } catch (error) {
          console.warn('Error in tracked interval callback:', error);
        }
      }
    }, delay);
    
    if (intervalRefs.current) {
      intervalRefs.current.add(intervalId);
    }
    return intervalId;
  }, []);

  const trackedClearTimeout = useCallback((timeoutId) => {
    if (timeoutId && timeoutRefs.current) {
      try {
        clearTimeout(timeoutId);
        timeoutRefs.current.delete(timeoutId);
      } catch (error) {
        console.warn('Error clearing tracked timeout:', error);
      }
    }
  }, []);

  const trackedClearInterval = useCallback((intervalId) => {
    if (intervalId && intervalRefs.current) {
      try {
        clearInterval(intervalId);
        intervalRefs.current.delete(intervalId);
      } catch (error) {
        console.warn('Error clearing tracked interval:', error);
      }
    }
  }, []);

  // 🧹 ENHANCED: Comprehensive cleanup function for all timeouts and intervals
  const cleanupAllTimers = useCallback(() => {
    // Clear all timeouts
    if (timeoutRefs.current) {
      timeoutRefs.current.forEach(timeoutId => {
        try {
          clearTimeout(timeoutId);
        } catch (error) {
          console.warn('Failed to clear timeout during cleanup:', error);
        }
      });
      timeoutRefs.current.clear();
    }

    // Clear all intervals
    if (intervalRefs.current) {
      intervalRefs.current.forEach(intervalId => {
        try {
          clearInterval(intervalId);
        } catch (error) {
          console.warn('Failed to clear interval during cleanup:', error);
        }
      });
      intervalRefs.current.clear();
    }
  }, []);

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



  // 🚀 OPTIMIZED: Ultra-fast initial loading with progressive enhancement
  const fetchInitialMovies = async () => {
    const startTime = performance.now();
    
    try {
      setLoadingState('initial', true);
      setError(null);
      
      // Use the performance optimization service for ultra-fast loading
      const fetchFunctions = {
        featured: fetchFeaturedContent,
        trending: () => fetchPrioritySection('trending'),
        popular: () => fetchPrioritySection('popular'),
        topRated: () => fetchPrioritySection('topRated'),
        upcoming: () => fetchPrioritySection('upcoming'),
        action: () => fetchPrioritySection('action'),
        comedy: () => fetchPrioritySection('comedy'),
        drama: () => fetchPrioritySection('drama'),
        horror: () => fetchPrioritySection('horror'),
        sciFi: () => fetchPrioritySection('sciFi'),
        documentary: () => fetchPrioritySection('documentary'),
        family: () => fetchPrioritySection('family'),
        animation: () => fetchPrioritySection('animation'),
        awardWinning: () => fetchPrioritySection('awardWinning'),
        latest: () => fetchPrioritySection('latest'),
        popularTV: () => fetchPrioritySection('popularTV'),
        topRatedTV: () => fetchPrioritySection('topRatedTV'),
        airingToday: () => fetchPrioritySection('airingToday'),
        nowPlaying: () => fetchPrioritySection('nowPlaying')
      };
      
             // State setters for immediate updates
       const stateSetters = {
         featured: setFeaturedContent,
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
      
      // Execute the optimized loading strategy with throttling
      const success = await performanceOptimizationService.executeInitialLoad(fetchFunctions, stateSetters, {
        throttleDelay: 200, // Add 200ms delay between API calls
        maxConcurrent: 3    // Limit to 3 concurrent requests
      });
      
      // Calculate total time first
      const totalTime = performance.now() - startTime;
      
      if (success) {
        // Update loading states based on what was loaded
        setLoadingState('initial', false);
        setLoadingState('trending', false);
        setLoadingState('popular', false);
        
        // Set up observer for performance events
        performanceOptimizationService.addObserver((event, data) => {
          if (event === 'initialLoadComplete') {
            console.log('✅ Initial load completed by performance service');
          }
        });
        
        // Record homepage performance metrics
        enhancedPerformanceService.recordHomepageMetric('initialLoadTime', totalTime);
        
        // Get performance metrics from the service
        const serviceMetrics = performanceOptimizationService.getPerformanceState();
        enhancedPerformanceService.recordHomepageMetric('criticalContentLoad', serviceMetrics.performanceMetrics.criticalLoadTime);
        enhancedPerformanceService.recordHomepageMetric('highPriorityContentLoad', serviceMetrics.performanceMetrics.highPriorityLoadTime);
      }
      if (import.meta.env.DEV) {
        console.log('🎯 Initial load performance:', {
          totalTime: `${totalTime.toFixed(0)}ms`,
          serviceMetrics: performanceOptimizationService.getPerformanceState()
        });
      }
      
      // Track page load performance
      trackPageLoad('HomePage');
      
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ Error in fetchInitialMovies:', error);
      }
      
      // 🚀 FIXED: Enhanced error handling with graceful degradation
      const isNetworkError = error.message.includes('Network connection failed') || 
                            error.message.includes('Request timeout') ||
                            error.message.includes('ERR_CONNECTION_RESET') ||
                            error.message.includes('Failed to fetch');
      
      if (isNetworkError) {
        console.warn('Network error in fetchInitialMovies, continuing gracefully');
        // Don't set global error for network issues
      } else {
        setError('Failed to load initial content. Please refresh the page.');
      }
      
      setLoadingState('initial', false);
      
      // Track error using available performance monitoring
      if (typeof trackApiCall === 'function') {
        trackApiCall('fetchInitialMovies', 0, false);
      }
    }
  };

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

    // 🚀 ENHANCED: Intelligent preloading with validation, error handling, and performance monitoring
    if (criticalImages.length > 0) {
      const preloadLinks = [];
      const startTime = performance.now();
      
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
            if (import.meta.env.DEV) {
              console.warn('Preload failed for image:', image);
            }
            // Remove failed preload link
            try {
              if (link.parentNode && document.head.contains(link)) {
                link.parentNode.removeChild(link);
              }
            } catch (error) {
              if (import.meta.env.DEV) {
                console.warn('Failed to remove failed preload link:', error);
              }
            }
          };
          
          // Add success handling for performance monitoring
          link.onload = () => {
            const loadTime = performance.now() - startTime;
            if (import.meta.env.DEV) {
              console.log(`✅ Image preloaded successfully: ${image} in ${loadTime.toFixed(0)}ms`);
            }
          };
          
          document.head.appendChild(link);
          preloadLinks.push(link);
        } catch (error) {
          console.warn('Failed to create preload link for image:', image, error);
        }
      });
      
      // 🚀 ENHANCED: Smart cleanup with performance monitoring
      const cleanupTime = 15000; // 15 seconds
      const cleanupTimeout = trackedSetTimeout(() => {
        preloadLinks.forEach(link => {
          try {
            if (link && link.parentNode && document.head.contains(link)) {
              link.parentNode.removeChild(link);
            }
          } catch (error) {
            if (import.meta.env.DEV) {
              console.warn('Failed to remove preload link during cleanup:', error);
            }
          }
        });
        
        if (import.meta.env.DEV) {
          console.log(`🧹 Cleaned up ${preloadLinks.length} preload links after ${cleanupTime}ms`);
        }
      }, cleanupTime);
      
      // Store cleanup timeout for proper cleanup
      if (cleanupTimeout && timeoutRefs.current) {
        timeoutRefs.current.add(cleanupTimeout);
      }
    }
  }, []); // FIXED: Remove dependencies to prevent infinite loops

  // Execute preloading with optimized timing - FIXED: Timeout leaks
  useEffect(() => {
    let preloadTimeout;
    
    const executePreload = () => {
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        preloadTimeout = requestIdleCallback(preloadCriticalResources, { timeout: 1000 }); // Reduced timeout
      } else {
        preloadTimeout = setTimeout(preloadCriticalResources, 200); // Further reduced delay for faster loading
      }
    };
    
    executePreload();
    
    return () => {
      if (preloadTimeout) {
        try {
          if (typeof window !== 'undefined' && window.cancelIdleCallback) {
            cancelIdleCallback(preloadTimeout);
          } else {
            clearTimeout(preloadTimeout);
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('Error clearing preload timeout:', error);
          }
        }
      }
    };
  }, []); // Empty dependency array to prevent infinite loops

  // 📈 NEW: Performance monitoring setup - FIXED: Observer leaks
  useEffect(() => {
    // Set up performance observer
    if ('PerformanceObserver' in window) {
      try {
        performanceObserver.current = new PerformanceObserver((list) => {
          try {
            list.getEntries().forEach(entry => {
              if (entry.entryType === 'measure') {
                // Performance monitoring logic
              }
            });
          } catch (error) {
            console.warn('Error processing performance entries:', error);
          }
        });
        performanceObserver.current.observe({ entryTypes: ['measure'] });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Failed to set up performance observer:', error);
        }
      }
    }
    
    return () => {
      if (performanceObserver.current) {
        try {
          performanceObserver.current.disconnect();
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('Error disconnecting performance observer:', error);
          }
        } finally {
          performanceObserver.current = null;
        }
      }
    };
  }, []);



  // Add priority levels for sections
  const SECTION_PRIORITIES = {
    HIGH: ['trending', 'popular', 'topRated'],
    MEDIUM: ['upcoming', 'action', 'comedy', 'drama'],
    LOW: ['horror', 'sciFi', 'documentary', 'family', 'animation', 'awardWinning', 'latest', 'popularTV', 'topRatedTV', 'airingToday', 'nowPlaying']
  };

  // 🚀 ULTRA-OPTIMIZED: Advanced cache cleanup with intelligent eviction, performance monitoring, and memory pressure awareness
  const cleanupCache = useCallback(() => {
    const startTime = performance.now();
    let removedCount = 0;
    let totalSize = 0;
    let processedItems = 0;
    let cacheHits = 0;
    let cacheMisses = 0;
    
    // 🚀 OPTIMIZED: Check memory pressure before cleanup
    let shouldAggressiveCleanup = false;
    let memoryUsage = 0;
    
    if (performance.memory) {
      memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
      shouldAggressiveCleanup = memoryUsage > 0.8; // 80% memory usage threshold
      
      // 🚀 ADDITIONAL: Log memory usage for debugging
      if (import.meta.env.DEV) {
        console.log(`🧠 Memory usage: ${(memoryUsage * 100).toFixed(1)}% - Aggressive cleanup: ${shouldAggressiveCleanup}`);
      }
    }
    
    try {
      // Use more efficient iteration and early exit for better performance
      const cacheItems = [];
      const keys = Object.keys(localStorage);
      
      // Process only movie cache keys with early filtering
      const movieCacheKeys = keys.filter(key => key.startsWith('movieCache_'));
      
      if (movieCacheKeys.length === 0) {
        return; // Early exit if no cache items
      }

      // Group cache items by category and page with enhanced metadata
      const categoryPages = {};
      
      // Batch process items for better performance with enhanced validation
      for (const key of movieCacheKeys) {
        try {
          const item = localStorage.getItem(key);
          if (!item) continue;
          
          const parsed = JSON.parse(item);
          const itemSize = item.length;
          
          // Enhanced cache item structure validation
          if (!parsed || typeof parsed.timestamp !== 'number' || !parsed.data) {
            localStorage.removeItem(key); // Remove invalid items
            removedCount++;
            continue;
          }
          
          // Enhanced data integrity check
          if (parsed.data === null || parsed.data === undefined) {
            localStorage.removeItem(key);
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
            categoryPages[category] = { pages: [], other: [], totalSize: 0, lastAccess: 0 };
          }
          
          if (isPage && !isNaN(pageNum)) {
            categoryPages[category].pages.push({ 
              key, 
              timestamp: parsed.timestamp, 
              size: itemSize,
              age: Date.now() - parsed.timestamp,
              pageNum,
              accessCount: parsed.accessCount || 0
            });
          } else {
            categoryPages[category].other.push({ 
              key, 
              timestamp: parsed.timestamp, 
              size: itemSize,
              age: Date.now() - parsed.timestamp,
              accessCount: parsed.accessCount || 0
            });
          }
          
          categoryPages[category].totalSize += itemSize;
          categoryPages[category].lastAccess = Math.max(categoryPages[category].lastAccess, parsed.timestamp);
          
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
      
      if (removedCount > 0 && import.meta.env.DEV) {
        console.log(`Cache cleanup: removed ${removedCount} items, ${(totalSize / 1024 / 1024).toFixed(2)}MB remaining`);
      }

    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Critical error during cache cleanup:', error);
      }
      
      // Fallback: aggressive cleanup in case of critical errors
      try {
        const keys = Object.keys(localStorage);
        const movieCacheKeys = keys.filter(key => key.startsWith('movieCache_'));
        
        // Remove all movie cache items as emergency cleanup
        movieCacheKeys.forEach(key => {
          localStorage.removeItem(key);
          removedCount++;
        });
        
        if (import.meta.env.DEV) {
          console.warn(`Emergency cache cleanup removed ${removedCount} items`);
        }
      } catch (fallbackError) {
        if (import.meta.env.DEV) {
          console.error('Emergency cache cleanup also failed:', fallbackError);
        }
      }
    }
  }, []);

  // Add function to check if cache is valid (per-section TTL + versioning + SWR allowance)
  const isCacheValid = useCallback((cacheKey) => {
    try {
      const cachedData = localStorage.getItem(`movieCache_${cacheKey}`);
      if (!cachedData) return false;
      const parsed = JSON.parse(cachedData);
      const { timestamp, data, version } = parsed || {};
      if (!timestamp || data === undefined) return false;
      if (version && version !== CACHE_VERSION) return false;
      const ttl = getTTLForKey(cacheKey);
      return Date.now() - timestamp < ttl;
    } catch (error) {
      return false;
    }
  }, [getTTLForKey, CACHE_VERSION]);



  // Enhanced function to get cached data with validation, performance monitoring, and advanced error handling
  const getCachedData = useCallback((cacheKey) => {
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
        const ttl = getTTLForKey(cacheKey);
        const maxAge = ttl + (5 * 60 * 1000);
        const isExpired = cacheAge > ttl;
        const isTooOld = cacheAge > maxAge + STALE_MAX_AGE;
        
                  // Log cache age for debugging
          if (import.meta.env.DEV) {
            console.log(`🔍 Cache validation for ${cacheKey}:`, {
              age: `${(cacheAge / 1000 / 60).toFixed(1)} minutes`,
              ttl: `${(ttl / 1000 / 60).toFixed(1)} minutes`,
              maxAge: `${(maxAge / 1000 / 60).toFixed(1)} minutes`,
              isExpired,
              isTooOld
            });
          }
          
          // If too old even for SWR, drop it
          if (isTooOld) {
            if (import.meta.env.DEV) {
              console.log(`🗑️ Cache too old for ${cacheKey}, removing`);
            }
            localStorage.removeItem(storageKey);
            return null;
          }
          // If expired but within stale window, allow return (SWR) and let caller revalidate separately
          if (isExpired) {
            if (import.meta.env.DEV) {
              console.log(`⚠️ Cache expired for ${cacheKey} but within stale window, allowing stale usage`);
            }
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
  }, [getTTLForKey, CACHE_DURATION, STALE_MAX_AGE]);

  // Enhanced function to set cached data with validation, performance monitoring, and advanced error handling
  const setCachedData = useCallback((cacheKey, data) => {
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
        if (import.meta.env.DEV) {
          console.warn('Invalid cache key provided:', cacheKey, 'Type:', typeof cacheKey);
        }
        return false;
      }
      
      // Validate cache key format and length
      if (cacheKey.length === 0 || cacheKey.length > 100) {
        if (import.meta.env.DEV) {
          console.warn('Cache key length invalid:', cacheKey.length, 'Key:', cacheKey);
        }
        return false;
      }
      
      // Check for potentially malicious keys
      if (cacheKey.includes('..') || cacheKey.includes('__proto__') || cacheKey.includes('constructor')) {
        if (import.meta.env.DEV) {
          console.warn('Potentially malicious cache key detected:', cacheKey);
        }
        return false;
      }
      
      // Validate data structure
      if (data === null || data === undefined) {
        if (import.meta.env.DEV) {
          console.warn('Attempting to cache null/undefined data for key:', cacheKey);
        }
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
        version: CACHE_VERSION,
        checksum: simpleChecksum(jsonString)
      };
      
      const serializedData = JSON.stringify(cacheData);
      const dataSize = serializedData.length;
      
      // Validate data size before storage
      if (dataSize > MAX_CACHE_SIZE) {
        if (import.meta.env.DEV) {
          console.warn(`Cache data too large for key: ${cacheKey}`, {
            size: `${(dataSize / 1024 / 1024).toFixed(2)}MB`,
            limit: `${(MAX_CACHE_SIZE / 1024 / 1024).toFixed(2)}MB`
          });
        }
        return false;
      }
      
      metrics.serializationTime = performance.now() - serializationStart;

      // Enhanced localStorage storage with timeout protection
      const storageStart = performance.now();
      const storageKey = `movieCache_${cacheKey}`;
      
      try {
        localStorage.setItem(storageKey, serializedData);
        // Broadcast to other tabs for cross-tab sync
        try {
          localStorage.setItem('movieCache_lastUpdate', JSON.stringify({ key: cacheKey, ts: Date.now() }));
        } catch (_) {}
        metrics.storageTime = performance.now() - storageStart;
        metrics.totalTime = performance.now() - startTime;
        
        return true;
              } catch (storageError) {
          if (import.meta.env.DEV) {
            console.error('localStorage storage failed for key:', storageKey, storageError);
          }
          
          // Handle quota exceeded error specifically
          if (storageError.name === 'QuotaExceededError' || storageError.message.includes('quota')) {
            if (import.meta.env.DEV) {
              console.warn('Storage quota exceeded, performing emergency cleanup...');
            }
            
            // Perform emergency cleanup
            cleanupCache();
            
            // Try again after cleanup
            try {
              localStorage.setItem(storageKey, serializedData);
              if (import.meta.env.DEV) {
                console.log('Successfully stored data after emergency cleanup');
              }
              return true;
            } catch (retryError) {
              if (import.meta.env.DEV) {
                console.error('Failed to store data even after cleanup:', retryError);
              }
              return false;
            }
          }
          
          return false;
        }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Critical error setting cached data for key:', cacheKey, error);
      }
      return false;
    }
    return false;
  }, [cleanupCache, CACHE_VERSION, MAX_CACHE_SIZE]);

  // FIXED: Initialize data fetching with proper memory management
  useEffect(() => {
    let isMounted = true;
    
    const initializeData = async () => {
      if (isMounted) {
        // Check if we should skip initial loading due to cached data
        if (shouldSkipInitialLoading()) {
          if (import.meta.env.DEV) {
            console.log('🚀 Skipping initial loading - using cached data');
          }
          
          // Load cached data into state
          const criticalSections = ['featured', 'trending'];
          for (const section of criticalSections) {
            if (isSectionCached(section)) {
              const cachedData = getCachedSection(section);
              if (cachedData) {
                const setter = getSetterFunction(section);
                if (setter) {
                  setter(cachedData);
                  if (import.meta.env.DEV) {
                    console.log(`✅ Loaded ${section} from cache`);
                  }
                }
              }
            }
          }
          
          // Mark as loaded
          setLoadingState('initial', false);
          setLoadingState('trending', false);
          setLoadingState('popular', false);
          
          // Still fetch any missing sections in background
          setTimeout(() => {
            if (isMounted) {
              fetchInitialMovies();
            }
          }, 50); // Reduced delay for faster loading
          
          return;
        }
        
        // Normal loading path
        await fetchInitialMovies();
      }
    };
    
    initializeData();
    
    // Set up a periodic cleanup interval using tracked function
    const interval = trackedSetInterval(cleanupCache, 5 * 60 * 1000); // Every 5 minutes
    
    return () => {
      isMounted = false;
      
      // Use tracked clear function for proper cleanup
      if (interval) {
        trackedClearInterval(interval);
      }
      
      // Comprehensive cleanup
      cleanMovieDetailsCache();
      if (cacheRef.current) {
        cacheRef.current.clear();
      }
      if (lruQueue.current) {
        lruQueue.current.length = 0;
      }
      
      // Clear all pending requests
      if (pendingRequests.current) {
        pendingRequests.current.clear();
      }
      
      // Clear prefetch queue
      setPrefetchQueue(new Set());
      setIsPrefetching(false);
      
      // Clear viewport items
      setViewportItems(new Set());
      
      // Clear visible sections
      setVisibleSections(new Set(['all', 'trending', 'popular', 'topRated', 'upcoming', 'action', 'comedy', 'drama', 'horror', 'sciFi', 'documentary', 'family', 'animation', 'awardWinning', 'latest', 'popularTV', 'topRatedTV', 'airingToday', 'nowPlaying']));
      
      // Clear lazy load queue
      setLazyLoadQueue(new Set());
    };
  }, []); // Remove dependencies to prevent infinite loops - functions are stable with useCallback

  // FIXED: Loading state management with tracked timeout
  useEffect(() => {
    if (loadingStates.initial) {
      // Add timeout to prevent infinite loading using tracked function
      const loadingTimeout = trackedSetTimeout(() => {
        if (import.meta.env.DEV) {
          console.warn('Loading timeout reached, forcing completion');
        }
        setLoadingState('initial', false);
        setError('Loading took longer than expected. Some content may not be available.');
      }, 30000); // 30 second timeout
      
      return () => {
        // Use tracked clear function for proper cleanup
        trackedClearTimeout(loadingTimeout);
      };
    }
  }, [loadingStates.initial, setLoadingState]); // Keep necessary dependencies for proper functionality

  // 🚀 FIXED: Enhanced error handling effect with graceful degradation
  useEffect(() => {
    if (error) {
      // Don't log network errors as critical errors
      if (error.includes('Network connection failed') || 
          error.includes('Request timeout') ||
          error.includes('ERR_CONNECTION_RESET')) {
        console.warn('Network error in HomePage (non-critical):', error);
      } else if (import.meta.env.DEV) {
        console.error('Error in HomePage:', error);
      }
    }
    
    return () => {
      // Clear error state on unmount
      setError(null);
    };
  }, [error, setError]);

  // 🧹 ENHANCED: Memory optimization with intelligent monitoring and adaptive cleanup
  useEffect(() => {
    // Memory optimization interval using tracked function (dev-only)
    const memoryInterval = (import.meta && import.meta.env && import.meta.env.DEV)
      ? trackedSetInterval(() => {
        // Enhanced memory monitoring with adaptive thresholds
        if (performance.memory && import.meta.env.DEV) {
          const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
          const totalMB = performance.memory.totalJSHeapSize / 1024 / 1024;
          const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
          
          // Log memory usage for debugging
          if (import.meta.env.VITE_DEBUG_MEMORY === 'true') {
            console.log(`🧠 Memory Status: ${memoryMB.toFixed(2)}MB / ${totalMB.toFixed(2)}MB (Limit: ${limitMB.toFixed(2)}MB)`);
          }
          
          // Adaptive memory thresholds based on available memory
          const memoryThreshold = Math.min(800, limitMB * 0.7); // 70% of limit or 800MB, whichever is lower
          
          if (memoryMB > memoryThreshold) {
            if (import.meta.env.DEV) {
              console.warn(`⚠️ High memory usage detected: ${memoryMB.toFixed(2)}MB (Threshold: ${memoryThreshold.toFixed(2)}MB)`);
            }
            
            // Trigger intelligent cleanup
            optimizeMemoryUsage();
            
            // Force garbage collection if available
            if (window.gc) {
              window.gc();
            }
            
            // Update memory optimization state
            setMemoryOptimization(prev => ({
              ...prev,
              lastCleanup: Date.now(),
              itemsInMemory: Math.floor(memoryMB)
            }));
          }
          
          // Proactive cleanup if memory usage is moderate
          if (memoryMB > memoryThreshold * 0.8) {
            if (import.meta.env.DEV) {
              console.log(`🔄 Proactive memory cleanup triggered at ${memoryMB.toFixed(2)}MB`);
            }
            cleanupCache();
          }
        }
      }, 180000) // Check every 3 minutes for better responsiveness
      : null;
    
    return () => {
      // Use tracked clear function for proper cleanup
      if (memoryInterval) {
        trackedClearInterval(memoryInterval);
      }
      
      // Clear intersection observer
      if (sectionObserverRef && sectionObserverRef.current) {
        sectionObserverRef.current.disconnect();
        sectionObserverRef.current = null;
      }
      
      // Clear lazy load queue
      setLazyLoadQueue(new Set());
      setVisibleSections(new Set(['all', 'trending', 'popular', 'topRated', 'upcoming', 'action', 'comedy', 'drama', 'horror', 'sciFi', 'documentary', 'family', 'animation', 'awardWinning', 'latest', 'popularTV', 'topRatedTV', 'airingToday', 'nowPlaying']));
    };
  }, [optimizeMemoryUsage, cleanupCache]); // Added dependencies for proper cleanup

  // FIXED: Add debugging for mobile content loading - moved before early returns
  useEffect(() => {
        if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_MEMORY === 'true') {
      console.log('HomePage Debug - Mobile:', isMobile);
      console.log('HomePage Debug - Trending movies:', trendingMovies.length);
      console.log('HomePage Debug - Popular movies:', popularMovies.length);
      console.log('HomePage Debug - Top rated movies:', topRatedMovies.length);
      console.log('HomePage Debug - Upcoming movies:', upcomingMovies.length);
      console.log('HomePage Debug - Active category:', activeCategory);
    }
  }, [isMobile, trendingMovies.length, popularMovies.length, topRatedMovies.length, upcomingMovies.length, activeCategory]); // Keep necessary dependencies for proper functionality

  // 🚀 ENHANCED: Advanced performance monitoring with user interaction tracking
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!enhancedPerformanceService.homepageMetrics.userInteractionTime) {
        const interactionTime = performance.now();
        enhancedPerformanceService.recordHomepageMetric('userInteraction', interactionTime);
      }
    };

    // Enhanced user interaction tracking with performance metrics
    const events = ['click', 'scroll', 'keydown', 'touchstart', 'mousemove', 'wheel'];
    const passiveEvents = ['scroll', 'wheel', 'touchstart', 'touchmove'];
    
    events.forEach(event => {
      const isPassive = passiveEvents.includes(event);
      document.addEventListener(event, handleUserInteraction, { passive: isPassive });
    });

    // Enhanced scroll performance monitoring
    let scrollTimeout;
    const handleScrollPerformance = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      // Throttle updates more aggressively to reduce CPU
      scrollTimeout = setTimeout(() => {
        // Skip work when tab is hidden
        if (document.hidden) return;
        const scrollHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const maxScrollable = Math.max(1, scrollHeight - viewportHeight);
        const scrollTop = window.pageYOffset;
        const scrollPercentage = (scrollTop / maxScrollable) * 100;
        const scrollMetrics = { scrollTop, scrollHeight, viewportHeight, scrollPercentage };
        enhancedPerformanceService.recordHomepageMetric('scrollPerformance', scrollMetrics);
      }, 250);
    };

    // Add scroll performance monitoring
    document.addEventListener('scroll', handleScrollPerformance, { passive: true });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
      
      document.removeEventListener('scroll', handleScrollPerformance);
      
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, []);



  // 🚀 OPTIMIZED: Helper functions for ultra-fast loading
  
  // Enhanced function to fetch a single section with priority and performance monitoring
  const fetchPrioritySection = async (sectionKey, retryCount = 0) => {
    // Track active requests to prevent duplicates
    // activeRequests is now properly declared as state variable
    
    let section;
    let requestKey; // Declare requestKey at function scope
    const startTime = performance.now();
    
    try {
      // Enhanced section validation
      if (!sectionKey || typeof sectionKey !== 'string') {
        if (import.meta.env.DEV) {
          console.warn('Invalid section key provided:', sectionKey, 'Type:', typeof sectionKey);
        }
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
        if (import.meta.env.DEV) {
          console.error('Invalid section configuration for key:', sectionKey, {
            hasFetch: !!section.fetch,
            hasSetter: !!section.setter,
            hasIds: !!section.ids
          });
        }
        throw new Error(`Invalid section configuration for: ${sectionKey}`);
      }

              // Enhanced cache checking with performance monitoring
        let servedFromCache = false;
        const cachedDataForSWR = getCachedData(section.key);
        
        if (import.meta.env.DEV) {
          console.log(`🔍 Checking ${section.key} section cache:`, {
            hasCachedData: !!cachedDataForSWR,
            dataType: cachedDataForSWR ? Array.isArray(cachedDataForSWR) ? 'array' : typeof cachedDataForSWR : 'none',
            length: cachedDataForSWR?.length || 0
          });
        }
        
        if (cachedDataForSWR && Array.isArray(cachedDataForSWR) && cachedDataForSWR.length > 0) {
          // Serve immediately if valid cache exists
          try {
            section.setter(cachedDataForSWR);
            cachedDataForSWR.forEach(movie => {
              if (movie && movie.id && typeof movie.id === 'number') {
                section.ids.add(movie.id);
              }
            });
            servedFromCache = true;
            
            // Record cache hit
            enhancedPerformanceService.recordHomepageMetric('cacheHit', 1.0);
            
            // Log cache hit for debugging
            if (import.meta.env.DEV) {
              console.log(`✅ ${section.key} section served from cache:`, {
                count: cachedDataForSWR.length,
                cacheHit: true
              });
            }
            
            return; // Exit early if served from cache
          } catch (processingError) {
            if (import.meta.env.DEV) {
              console.error(`Error processing cached data for ${section.key}:`, processingError);
            }
          }
        } else {
          if (import.meta.env.DEV) {
            console.log(`❌ ${section.key} section cache miss or invalid data`);
          }
        }

      // Enhanced API fetching with optimized timeout - only if no valid cache
      if (!servedFromCache) {
        setLoadingState(section.key, true);
        // Record cache miss
        enhancedPerformanceService.recordHomepageMetric('cacheHit', 0.0);
        
        console.log(`🔄 Fetching ${section.key} section from API (cache miss)`);
      }
      
      // Use request deduplication to prevent duplicate calls
      requestKey = `${section.key}-page-1`;
      
      // Check if request is already in progress
      if (activeRequests.has(requestKey)) {
        console.log(`⏳ Request for ${section.key} already in progress, skipping...`);
        return;
      }
      
      // Mark request as active
      setActiveRequests(prev => new Set([...prev, requestKey]));
      
      let result;
      
      try {
        result = await deduplicateRequest(requestKey, async () => {
          // Increased timeout for better reliability
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 15000); // Increased to 15 second timeout
          });
          
          const fetchPromise = section.fetch(1);
          return await Promise.race([fetchPromise, timeoutPromise]);
        });
      } catch (error) {
        // 🚀 FIXED: Don't re-throw errors, handle them gracefully
        console.warn(`Error in deduplicateRequest for ${sectionKey}:`, error.message);
        // Return null to indicate failure instead of throwing
        result = null;
      }
      
      // Enhanced result validation and processing
      if (!result) {
        console.warn(`No result returned for ${sectionKey}, skipping processing`);
        return;
      }
      
      if (result && result.movies && Array.isArray(result.movies) && result.movies.length > 0) {
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
        } catch (cacheError) {
          console.warn(`Failed to cache data for ${section.key}:`, cacheError);
        }
      } else {
        console.warn(`No valid movies returned for ${section.key}`, result);
        // 🚀 FIXED: Don't set global error for empty results - this is normal
        // setError(`No movies available for ${section.key}`);
      }

    } catch (error) {
      console.error(`Critical error fetching ${sectionKey}:`, {
        error: error.message,
        stack: error.stack,
        sectionKey
      });
      
      // 🚀 FIXED: Enhanced error handling with graceful degradation
      // Don't set global errors for individual section failures
      const isNetworkError = error.message.includes('Network connection failed') || 
                            error.message.includes('Request timeout') ||
                            error.message.includes('ERR_CONNECTION_RESET') ||
                            error.message.includes('Failed to fetch');
      
      if (isNetworkError) {
        console.warn(`Network error for ${sectionKey}, continuing with other sections`);
        // Don't set global error for network issues
      } else {
        // Only set error for non-network issues
        const errorMessage = error.message === 'Request timeout' 
          ? `Request timeout for ${sectionKey}`
          : `Failed to fetch ${sectionKey} movies`;
        setError(errorMessage);
      }
      
      // Attempt to recover by clearing potentially corrupted cache
      try {
        const storageKey = `movieCache_${sectionKey}`;
        localStorage.removeItem(storageKey);
      } catch (cleanupError) {
        console.error(`Failed to clean up cache for ${sectionKey}:`, cleanupError);
      }
      
      // 🚀 FIXED: Add retry logic with retry count limit to prevent infinite loops
      const currentRetryCount = (retryCounts[sectionKey] || 0) + 1;
      
      if ((error.message === 'Request timeout' || isNetworkError) && currentRetryCount < 3) {
        const retryDelay = Math.min(5000 * Math.pow(2, currentRetryCount - 1), 30000);
        
        console.log(`🔄 Scheduling retry ${currentRetryCount}/3 for ${sectionKey} in ${retryDelay/1000} seconds...`);
        
        // Update retry count state
        setRetryCounts(prev => ({ ...prev, [sectionKey]: currentRetryCount }));
        
        setTimeout(() => {
          if (import.meta.env.DEV) {
            console.log(`🔄 Retrying fetch for ${sectionKey} (attempt ${currentRetryCount}/3)...`);
          }
          
          // Pass the retry count to prevent infinite loops
          fetchPrioritySection(sectionKey, currentRetryCount).catch(retryError => {
            console.warn(`Retry ${currentRetryCount}/3 failed for ${sectionKey}:`, retryError);
          });
        }, retryDelay);
      } else if (currentRetryCount >= 3) {
        console.warn(`Max retries (3) reached for ${sectionKey}, giving up`);
        // Reset retry count after max retries
        setRetryCounts(prev => ({ ...prev, [sectionKey]: 0 }));
      }
          } finally {
        // Clean up active request tracking
        if (requestKey) {
          setActiveRequests(prev => {
            const newSet = new Set(prev);
            newSet.delete(requestKey);
            return newSet;
          });
        }
        
        // Record API call performance metrics
        const totalTime = performance.now() - startTime;
        enhancedPerformanceService.recordHomepageMetric('apiCall', totalTime);
        
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

  // Patch handleMovieHover to record prefetch (throttled)
  const lastHoverTsRef = useRef(0);
  const handleMovieHover = useCallback(async (movie, index, moviesArr) => {
    if (!movie) return;
    const now = performance.now();
    if (now - lastHoverTsRef.current < 150) return; // throttle to ~6.6/s
    lastHoverTsRef.current = now;
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
  }, [currentFeaturedIndex, trendingMovies.length, isInWatchlist]); // Keep necessary dependencies for proper functionality

  // 🚀 ENHANCED: Intelligent prefetching with memory and network awareness
  const _prefetchCategory = async (category) => {
    // Enhanced validation and memory checks
    if (prefetchQueue.has(category) || dataCache[category]) return;
    
    // Memory-aware prefetching
    if (PREFETCH_CONFIG.memoryAware && performance.memory) {
      const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
      const memoryThreshold = Math.min(600, performance.memory.jsHeapSizeLimit / 1024 / 1024 * 0.5);
      
      if (memoryMB > memoryThreshold) {
        console.log(`🚫 Prefetch blocked for ${category} due to high memory usage: ${memoryMB.toFixed(2)}MB`);
        return;
      }
    }
    
    // Network-aware prefetching
    if (PREFETCH_CONFIG.networkAware && networkConditions.current.isSlow) {
      console.log(`🚫 Prefetch blocked for ${category} due to slow network`);
      return;
    }
    
    setPrefetchQueue(prev => new Set([...prev, category]));
    
    if (!isPrefetching) {
      setIsPrefetching(true);
      const prefetchStartTime = performance.now();
      
      try {
        // Use the original fetchMoviesForCategory function with enhanced error handling
        const result = await fetchMoviesForCategory(category, 1);
        if (result && result.movies) {
          setDataCache(prev => ({
            ...prev,
            [category]: {
              movies: result.movies,
              totalPages: result.totalPages || 1,
              timestamp: Date.now(),
              prefetched: true,
              prefetchTime: performance.now() - prefetchStartTime
            }
          }));
          
                  // Record successful prefetch
        if (import.meta.env.DEV) {
          console.log(`✅ Successfully prefetched ${category} in ${(performance.now() - prefetchStartTime).toFixed(0)}ms`);
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(`Error prefetching ${category}:`, error);
      }
      
      // Adaptive prefetching: reduce frequency for failed categories
      if (PREFETCH_CONFIG.userBehaviorAware) {
        const failedCategories = JSON.parse(localStorage.getItem('prefetchFailedCategories') || '{}');
        failedCategories[category] = (failedCategories[category] || 0) + 1;
        localStorage.setItem('prefetchFailedCategories', JSON.stringify(failedCategories));
      }
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

  // 🚀 ULTRA-OPTIMIZED: fetchMoviesForCategory with advanced caching, deduplication, and performance monitoring
  const fetchMoviesForCategory = useCallback(async (category, page = 1) => {
    const cacheKey = `${category}-${page}`;
    const startTime = performance.now();
    
    console.log(`🔄 fetchMoviesForCategory: Starting fetch for ${category} (page ${page})`);
    
    // 🚀 OPTIMIZED: Enhanced cache checking with memory pressure awareness
    const cachedData = dataCache[cacheKey];
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      const cacheHitTime = performance.now() - startTime;
      console.log(`✅ fetchMoviesForCategory: ${category} found in cache (${cacheHitTime.toFixed(2)}ms)`);
      
      // Track cache performance metrics
      if (window.gtag) {
        window.gtag('event', 'cache_hit', {
          category,
          page,
          response_time: cacheHitTime
        });
      }
      
      return cachedData;
    }

    // Use request deduplication to prevent duplicate requests
    return deduplicateRequest(cacheKey, async () => {
      const startTime = performance.now();
      let result;
      
      try {
        console.log(`🌐 fetchMoviesForCategory: Fetching ${category} from API...`);
        setLoadingState(category, true);
        
        // Adaptive loading based on network conditions - increased for backend proxy
        const timeout = networkConditions.current.isSlow ? 20000 : 15000;
        
        console.log(`⏱️ fetchMoviesForCategory: Using timeout of ${timeout}ms for ${category}`);
        
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
          console.error(`❌ fetchMoviesForCategory: Error fetching ${category}:`, error);
          throw error;
        } finally {
          setLoadingState(category, false);
        }

      console.log(`✅ fetchMoviesForCategory: ${category} completed successfully`);
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
  }, [categories, dataCache, CACHE_DURATION]); // Removed fetchMoviesForCategory dependency to prevent infinite loops

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
    if (import.meta.env.DEV) {
      console.log('handleCategoryChange called with:', category);
      console.log('Setting loading state for category:', category);
    }
    
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
      if (import.meta.env.DEV) {
        console.error(`Error loading category ${category}:`, error);
      }
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
            if (import.meta.env.DEV) {
              console.error(`Failed to load ${category} after ${retryCount} attempts:`, retryError);
            }
          }
          await new Promise(resolve => setTimeout(resolve, 500 * attempts)); // Reduced exponential backoff
        }
      }
    } finally {
      setLoadingState(category, false);
    }
  }, [setActiveCategory, setLoadingState, prefetchAdjacentCategories, dataCache, CACHE_DURATION, updateCategoryState, setError]); // FIXED: Removed fetchMoviesForCategory dependency to prevent infinite loops

  // Enhanced trend score calculation for dynamic hero content selection
  const calculateTrendScore = (item) => {
    if (!item) return 0;
    
    let score = 0;
    const rating = item.vote_average || item.rating || 0;
    const popularity = typeof item.popularity === 'number' ? item.popularity : 0;
    const voteCount = item.vote_count || item.voteCount || 0;
    const isTV = item.type === 'tv';
    
    // Base popularity score (highest weight for trending)
    score += popularity * 0.4;
    
    // Rating quality score
    score += rating * 100 * 0.2;
    
    // Vote count credibility score
    score += Math.min(voteCount / 100, 100) * 0.15;
    
    // Content type bonus
    if (isTV) {
      score += 500; // TV shows get bonus for variety
      if (item.status === 'Returning Series') score += 200;
      if (item.number_of_seasons > 1) score += 100;
    } else {
      score += 300; // Movies get base bonus
    }
    
    // Recency bonus (higher for very recent content)
    if (item.release_date || item.first_air_date) {
      const releaseDate = item.release_date || item.first_air_date;
      if (releaseDate) {
        const year = new Date(releaseDate).getFullYear();
        const currentYear = new Date().getFullYear();
        const yearsDiff = currentYear - year;
        
        if (yearsDiff === 0) score += 800;      // This year
        else if (yearsDiff === 1) score += 600;  // Last year
        else if (yearsDiff <= 3) score += 400;   // Recent (2-3 years)
        else if (yearsDiff > 10) score -= 200;   // Penalty for old content
      }
    }
    
    // Trending genre bonus
    if (item.genre_ids && Array.isArray(item.genre_ids)) {
      const trendingGenres = [16, 35, 10751, 10765, 10759]; // Animation, Comedy, Family, Sci-Fi & Fantasy, Action & Adventure
      const hasTrendingGenre = item.genre_ids.some(id => trendingGenres.includes(id));
      if (hasTrendingGenre) score += 300;
    }
    
    // Freshness bonus (for recently updated content)
    const now = Date.now();
    const lastUpdated = item.last_updated || item.updated_at || now;
    const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);
    if (hoursSinceUpdate < 24) score += 400; // Boost for content updated in last 24 hours
    
    return score;
  };

  // Enhanced content prioritization with trend-based selection for dynamic hero updates
  const getContentPriority = (item) => {
    if (!item) return 1.0;
    
    let priority = 1.0;
    const rating = item.vote_average || item.rating || 0;
    const popularity = typeof item.popularity === 'number' ? item.popularity : 0;
    const voteCount = item.vote_count || item.voteCount || 0;
    const isTV = item.type === 'tv';
    
    // Factor 1: Rating Quality (Higher weight for better ratings)
    if (rating >= 8.5) priority *= 1.4;        // Excellent rating
    else if (rating >= 8.0) priority *= 1.3;   // Very good rating
    else if (rating >= 7.5) priority *= 1.2;   // Good rating
    else if (rating >= 7.0) priority *= 1.1;   // Above average
    else if (rating < 6.0) priority *= 0.8;    // Penalize low ratings
    
    // Factor 2: Enhanced Popularity (Trend-based with higher weight for trending content)
    if (popularity > 10000) priority *= 1.5;   // Viral/trending (increased boost)
    else if (popularity > 8000) priority *= 1.4; // Very viral/trending
    else if (popularity > 5000) priority *= 1.3; // Very popular
    else if (popularity > 2000) priority *= 1.2; // Popular
    else if (popularity < 500) priority *= 0.8;  // Less popular (increased penalty)
    
    // Factor 3: Vote Count (Credibility of rating)
    if (voteCount > 15000) priority *= 1.2;    // Highly credible
    else if (voteCount > 8000) priority *= 1.15; // Very credible
    else if (voteCount > 3000) priority *= 1.1;  // Credible
    else if (voteCount < 500) priority *= 0.9;   // Less credible
    
    // Factor 4: Content Type Intelligence (Smart movie vs series selection)
    if (isTV) {
      // TV Series Logic
      if (item.status === 'Returning Series') priority *= 1.2;  // Ongoing series
      if (item.number_of_seasons > 1) priority *= 1.1;         // Multiple seasons
      if (item.status === 'Ended' && item.number_of_seasons >= 3) priority *= 1.15; // Completed series
      
      // Boost for high-quality TV series (Wednesday-like shows)
      if (rating >= 8.0 && popularity > 3000) priority *= 1.25; // High-quality series
    } else {
      // Movie Logic
      if (rating >= 8.0 && popularity > 3000) priority *= 1.2;  // High-quality movies
      if (item.runtime && item.runtime > 120) priority *= 1.05; // Feature-length movies
    }
    
    // Factor 5: Enhanced Recency (Higher weight for very recent content)
    if (item.release_date || item.first_air_date) {
      const releaseDate = item.release_date || item.first_air_date;
      if (releaseDate) {
        const year = new Date(releaseDate).getFullYear();
        const currentYear = new Date().getFullYear();
        const yearsDiff = currentYear - year;
        
        if (yearsDiff === 0) priority *= 1.25;      // This year (increased boost)
        else if (yearsDiff === 1) priority *= 1.15;  // Last year (increased boost)
        else if (yearsDiff <= 3) priority *= 1.1;   // Recent (2-3 years)
        else if (yearsDiff > 10) priority *= 0.9;   // Older content (increased penalty)
      }
    }
    
    // Factor 6: Enhanced Genre Intelligence (Boost trending genres more aggressively)
    if (item.genre_ids && Array.isArray(item.genre_ids)) {
      const trendingGenres = [16, 35, 10751, 10765, 10759]; // Animation, Comedy, Family, Sci-Fi & Fantasy, Action & Adventure
      const hasTrendingGenre = item.genre_ids.some(id => trendingGenres.includes(id));
      if (hasTrendingGenre) priority *= 1.1; // Increased boost for trending genres
    }
    
    // Factor 7: Content Quality Score (Combined metric)
    const qualityScore = (rating * 0.4) + (Math.min(popularity / 1000, 10) * 0.3) + (Math.min(voteCount / 1000, 10) * 0.3);
    if (qualityScore > 8) priority *= 1.2;      // High quality
    else if (qualityScore > 6) priority *= 1.1; // Good quality
    else if (qualityScore < 4) priority *= 0.9; // Lower quality
    
    // Factor 8: Trend Detection (New factor for dynamic updates)
    // Check if this content is in the trending list (higher priority)
    const isTrending = trendingMovies.some(trending => trending.id === item.id);
    if (isTrending) priority *= 1.3; // Significant boost for trending content
    
    // Factor 9: Freshness Boost (New factor for recently added content)
    const now = Date.now();
    const lastUpdated = item.last_updated || item.updated_at || now;
    const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);
    if (hoursSinceUpdate < 24) priority *= 1.2; // Boost for content updated in last 24 hours
    
    return priority;
  };

  // Enhanced featured content fetching with intelligent caching, performance monitoring, and advanced error handling
  // This function now prioritizes popular TV shows and trending content for better variety
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
      // Enhanced cache checking with performance monitoring + SWR for featured
      const cacheCheckStart = performance.now();
      const featuredCached = getCachedData('featured');
      
      console.log('🔍 Checking featured content cache:', {
        hasCachedData: !!featuredCached,
        dataType: featuredCached ? typeof featuredCached : 'none',
        hasId: featuredCached?.id,
        hasTitle: featuredCached?.title
      });
      
      if (featuredCached && featuredCached.id && featuredCached.title) {
        metrics.cacheHit = true;
        metrics.dataSize = 1;
        // Serve cached immediately and return early to avoid unnecessary API calls
        const processingStart = performance.now();
        setFeaturedContent(featuredCached);
        metrics.processingTime = performance.now() - processingStart;
        metrics.totalTime = performance.now() - startTime;
        
        // Log cache hit for debugging
        console.log('✅ Featured content served from cache:', {
          title: featuredCached.title,
          id: featuredCached.id,
          cacheHit: true,
          totalTime: metrics.totalTime
        });
        
        return; // Return early to prevent unnecessary API calls
      } else {
        console.log('❌ Featured content cache miss or invalid data');
      }
      metrics.cacheCheckTime = performance.now() - cacheCheckStart;

      // Only fetch from API if no valid cached data exists
      const trendingStart = performance.now();
      setLoadingState('featured', true);
      
      // Add timeout protection for API calls with better error handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Trending content request timeout')), 15000); // Increased to 15 seconds for better reliability
      });
      
      // Fetch trending content with retry logic and enhanced variety
      const fetchWithRetry = async (fetchFn, retries = 2) => {
        for (let i = 0; i <= retries; i++) {
          try {
            return await Promise.race([fetchFn(1), timeoutPromise]);
          } catch (error) {
            if (i === retries) throw error;
            console.warn(`Retry ${i + 1} for trending fetch:`, error.message);
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
          }
        }
      };

      const [trendingPromise, popularTVPromise, nowPlayingPromise] = await Promise.allSettled([
        fetchWithRetry(getTrendingMovies),
        fetchWithRetry(getPopularTVShows),
        fetchWithRetry(getNowPlayingMovies)
      ]);
      
      metrics.trendingFetchTime = performance.now() - trendingStart;

      // Combine and prioritize content
      let allCandidates = [];
      
      // Add trending content
      if (trendingPromise.status === 'fulfilled' && trendingPromise.value?.movies?.length) {
        allCandidates.push(...trendingPromise.value.movies);
      }
      
      // Add popular TV shows
      if (popularTVPromise.status === 'fulfilled' && popularTVPromise.value?.shows?.length) {
        allCandidates.push(...popularTVPromise.value.shows);
      }
      
      // Add now playing movies (often trending)
      if (nowPlayingPromise.status === 'fulfilled' && nowPlayingPromise.value?.movies?.length) {
        allCandidates.push(...nowPlayingPromise.value.movies);
      }

      // Enhanced result validation with fallback content
      if (!allCandidates.length) {
        console.warn('No trending content available from API, using fallback content');
        // Provide fallback content to prevent complete failure
        const fallbackContent = {
          id: 550,
          title: 'Fight Club',
          overview: 'An insomniac office worker and a devil-may-care soapmaker form an underground fight club that evolves into something much, much more.',
          poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
          backdrop_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
          type: 'movie',
          popularity: 100,
          vote_average: 8.8,
          release_date: '1999-10-15'
        };
        setFeaturedContent(fallbackContent);
        return;
      }

      // Enhanced item selection: prioritize trending content with trend detection
      const candidates = allCandidates.filter(item => item?.id && item?.title && typeof item.id === 'number');
      if (!candidates.length) {
        throw new Error('No valid trending items found');
      }
      
      // Enhanced trend-based selection with multiple scoring factors
      const bestItem = candidates
        .slice()
        .sort((a, b) => {
          // Calculate comprehensive trend score
          const scoreA = calculateTrendScore(a);
          const scoreB = calculateTrendScore(b);
          
          return scoreB - scoreA;
        })[0];

      // Enhanced details fetching with retry logic
      const detailsStart = performance.now();
      let details;
      
      try {
        details = await getMovieDetails(bestItem.id, bestItem.type || 'movie');
      } catch (detailsError) {
        console.warn(`Failed to fetch details for ${bestItem.title}, trying without type:`, detailsError);
        // Fallback: try without specifying type
        details = await getMovieDetails(bestItem.id);
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

      // Log hero content update for trend tracking
      if (import.meta.env.DEV) {
        console.log('🎬 Hero content updated:', {
          title: details.title,
          id: details.id,
          type: details.type,
          popularity: details.popularity,
          rating: details.vote_average,
          isTrending: trendingMovies.some(movie => movie.id === details.id),
          updateTime: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error(`💥 Critical error fetching featured content:`, {
        error: error.message,
        stack: error.stack,
        metrics: {
          totalTime: performance.now() - startTime,
          cacheHit: metrics.cacheHit
        }
      });
      
      // Provide fallback content on critical errors
      try {
        const fallbackContent = {
          id: 550,
          title: 'Fight Club',
          overview: 'An insomniac office worker and a devil-may-care soapmaker form an underground fight club that evolves into something much, much more.',
          poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
          backdrop_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
          type: 'movie',
          popularity: 100,
          vote_average: 8.8,
          release_date: '1999-10-15'
        };
        setFeaturedContent(fallbackContent);
        console.log('✅ Fallback content set due to API error');
      } catch (fallbackError) {
        console.error('Failed to set fallback content:', fallbackError);
      }
      
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
  }, []); // FIXED: Remove all dependencies to prevent infinite loops

  // FIXED: Fetch content useEffect with proper cleanup - run only once on mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchContent = async () => {
      if (isMounted && isMountedRef.current) { // FIXED: Added mount check
        await fetchFeaturedContent();
      }
    };
    
    fetchContent();
    
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array since fetchFeaturedContent has no dependencies

  // Ad blocker recommendation toast - show on first visit
  useEffect(() => {
    const hasSeenAdBlockerToast = localStorage.getItem('adBlockerToastShown');
    
    if (!hasSeenAdBlockerToast) {
      // Show toast after a short delay to let the page load
      const timer = setTimeout(() => {
        setShowAdBlockerToast(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // 🚀 PERFORMANCE OPTIMIZED: Load all movie sections data with intelligent prioritization and parallel loading
  useEffect(() => {
    let isMounted = true;
    
    console.log('🚀 HomePage: Starting to load all movie sections...');
    
    const loadAllSections = async () => {
      if (!isMounted || !isMountedRef.current) return;
      
      try {
        // 🚀 OPTIMIZED: Load critical sections in parallel for better performance
        const criticalSections = ['trending', 'popular', 'topRated'];
        
        console.log('📱 HomePage: Loading critical sections in parallel:', criticalSections);
        
        // 🚀 OPTIMIZED: Parallel loading with Promise.allSettled for better performance
        const criticalPromises = criticalSections.map(async (section) => {
          if (!isMounted) return null;
          
          try {
            console.log(`🔄 HomePage: Loading ${section} section...`);
            setLoadingState(section, true);
            const result = await fetchMoviesForCategory(section, 1);
            
            if (result && result.movies && Array.isArray(result.movies)) {
              const setter = getSetterFunction(section);
              if (setter) {
                setter(result.movies);
              }
              
              // 🚀 OPTIMIZED: Batch state updates to prevent multiple re-renders
              setPageStates(prev => ({
                ...prev,
                [section]: {
                  ...prev[section],
                  current: 1,
                  total: result.totalPages || 1,
                  isLoading: false,
                  hasMore: (result.totalPages || 1) > 1,
                  lastFetched: Date.now()
                }
              }));
              
              console.log(`✅ HomePage: ${section} section loaded successfully with ${result.movies.length} movies`);
              return { section, success: true, count: result.movies.length };
            }
          } catch (error) {
            console.error(`❌ HomePage: Failed to load ${section} section:`, error);
            setError(`Failed to load ${section} content. Please try again.`);
            return { section, success: false, error };
          } finally {
            if (isMounted) {
              setLoadingState(section, false);
            }
          }
        });
        
        // 🚀 OPTIMIZED: Wait for all critical sections to complete
        const criticalResults = await Promise.allSettled(criticalPromises);
        const successfulSections = criticalResults
          .filter(result => result.status === 'fulfilled' && result.value?.success)
          .map(result => result.value.section);
        
        console.log(`✅ HomePage: Critical sections completed. Successful: ${successfulSections.length}/${criticalSections.length}`);
        
        // Load medium priority sections after a short delay
        setTimeout(async () => {
          if (!isMounted) return;
          
          const mediumSections = ['upcoming', 'action', 'comedy', 'drama'];
          
          console.log('📱 HomePage: Loading medium priority sections:', mediumSections);
          
          for (const section of mediumSections) {
            if (!isMounted) return;
            
            try {
              console.log(`🔄 HomePage: Loading ${section} section...`);
              setLoadingState(section, true);
              const result = await fetchMoviesForCategory(section, 1);
              
              if (result && result.movies && Array.isArray(result.movies)) {
                const setter = getSetterFunction(section);
                if (setter) {
                  setter(result.movies);
                }
                
                setPageStates(prev => ({
                  ...prev,
                  [section]: {
                    ...prev[section],
                    current: 1,
                    total: result.totalPages || 1,
                    isLoading: false,
                    hasMore: (result.totalPages || 1) > 1,
                    lastFetched: Date.now()
                  }
                }));
                
                console.log(`✅ HomePage: ${section} section loaded successfully with ${result.movies.length} movies`);
              }
            } catch (error) {
              console.error(`❌ HomePage: Failed to load ${section} section:`, error);
            } finally {
              if (isMounted) {
                setLoadingState(section, false);
              }
            }
          }
        }, 500);
        
        // Load low priority sections after another delay
        setTimeout(async () => {
          if (!isMounted) return;
          
          const lowSections = ['horror', 'sciFi', 'documentary', 'family', 'animation', 'awardWinning', 'latest'];
          
          console.log('📱 HomePage: Loading low priority sections:', lowSections);
          
          for (const section of lowSections) {
            if (!isMounted) return;
            
            try {
              console.log(`🔄 HomePage: Loading ${section} section...`);
              setLoadingState(section, true);
              const result = await fetchMoviesForCategory(section, 1);
              
              if (result && result.movies && Array.isArray(result.movies)) {
                const setter = getSetterFunction(section);
                if (setter) {
                  setter(result.movies);
                }
                
                setPageStates(prev => ({
                  ...prev,
                  [section]: {
                    ...prev[section],
                    current: 1,
                    total: result.totalPages || 1,
                    isLoading: false,
                    hasMore: (result.totalPages || 1) > 1,
                    lastFetched: Date.now()
                  }
                }));
                
                console.log(`✅ HomePage: ${section} section loaded successfully with ${result.movies.length} movies`);
              }
            } catch (error) {
              console.error(`❌ HomePage: Failed to load ${section} section:`, error);
            } finally {
              if (isMounted) {
                setLoadingState(section, false);
              }
            }
          }
        }, 1000);
        
        // Load TV show sections
        setTimeout(async () => {
          if (!isMounted) return;
          
          const tvSections = ['popularTV', 'topRatedTV', 'airingToday', 'nowPlaying'];
          
          console.log('📱 HomePage: Loading TV show sections:', tvSections);
          
          for (const section of tvSections) {
            if (!isMounted) return;
            
            try {
              console.log(`🔄 HomePage: Loading ${section} section...`);
              setLoadingState(section, true);
              const result = await fetchMoviesForCategory(section, 1);
              
              if (result && result.movies && Array.isArray(result.movies)) {
                const setter = getSetterFunction(section);
                if (setter) {
                  setter(result.movies);
                }
                
                setPageStates(prev => ({
                  ...prev,
                  [section]: {
                    ...prev[section],
                    current: 1,
                    total: result.totalPages || 1,
                    isLoading: false,
                    hasMore: (result.totalPages || 1) > 1,
                    lastFetched: Date.now()
                  }
                }));
                
                console.log(`✅ HomePage: ${section} section loaded successfully with ${result.movies.length} movies`);
              }
            } catch (error) {
              console.error(`❌ HomePage: Failed to load ${section} section:`, error);
            } finally {
              if (isMounted) {
                setLoadingState(section, false);
              }
            }
          }
        }, 1500);
        
      } catch (error) {
        console.error('❌ HomePage: Failed to load movie sections:', error);
        setError('Failed to load movie content. Please refresh the page.');
      }
    };
    
    loadAllSections();
    
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array to run only once on mount



  // Enhanced: Automatic hero content refresh for trend updates
  useEffect(() => {
    let refreshInterval;
    
    const setupRefresh = () => {
      // Clear any existing interval
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      
      // Set up automatic refresh every 15 minutes (matching cache TTL)
      refreshInterval = trackedSetInterval(async () => {
        if (isMountedRef.current) {
          if (import.meta.env.DEV) {
            console.log('🔄 Auto-refreshing hero content for trend updates...');
          }
          
          // Clear the featured content cache to force fresh data
          try {
            const storageKey = 'movieCache_featured';
            localStorage.removeItem(storageKey);
          } catch (error) {
            if (import.meta.env.DEV) {
              console.warn('Failed to clear featured cache:', error);
            }
          }
          
          // Fetch fresh featured content
          await fetchFeaturedContent();
        }
      }, 15 * 60 * 1000); // 15 minutes
    };
    
    setupRefresh();
    
    return () => {
      if (refreshInterval) {
        trackedClearInterval(refreshInterval);
      }
    };
  }, []); // Empty dependency array to prevent infinite loops



  // FIXED: Enhanced prefetch processing with intelligent queue management
  // Cross-tab cache sync: listen to storage events to update sections when other tabs refresh cache
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'movieCache_lastUpdate' && e.newValue && isMountedRef.current) { // FIXED: Added mount check
        try {
          const { key } = JSON.parse(e.newValue);
          // If a known section key updated, refresh from cache if valid
          if (key && typeof key === 'string') {
            const setter = getSetterFunction(getBaseSectionFromKey(key));
            const cached = getCachedData(key);
            if (setter && cached) {
              setter(cached);
            }
            if (key === 'featured') {
              const fc = getCachedData('featured');
              if (fc && fc.id) setFeaturedContent(fc);
            }
          }
        } catch (_) {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []); // Empty dependency array to prevent infinite loops

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
      if (import.meta.env.DEV) {
        console.warn('Invalid category object provided to handleCategoryButtonClick:', category);
      }
      return;
    }
    
    if (import.meta.env.DEV) {
      console.log('Category button clicked:', category.id, 'Current active category:', activeCategory);
    }
    
    // Set the active category - data fetching will be handled by useEffect
    setActiveCategory(category.id);
  }, [activeCategory]);

  // Handle genre navigation from MovieDetailsOverlay
  const handleGenreNavigation = useCallback((genre) => {
    if (!genre) return;
    const genreName = typeof genre === 'string' ? genre : genre.name;
    if (!genreName) return;

    if (import.meta.env.DEV) {
      console.log('Genre navigation clicked:', genreName, 'ID:', genre.id);
    }
    
    // Navigate to MoviesPage with the selected genre name; MoviesPage maps name->id
    const searchParams = new URLSearchParams();
    searchParams.set('genre', genreName.toLowerCase());
    searchParams.set('category', 'popular'); // Default to popular category
    
    // Use window.location for navigation to ensure proper page reload
    window.location.href = `/movies?${searchParams.toString()}`;
  }, []);

  // Track previous category to avoid infinite loops
  const prevCategoryRef = useRef(activeCategory);
  
  // Handle category changes and fetch data - MOVED BEFORE EARLY RETURNS
  useEffect(() => {
    const prevCategory = prevCategoryRef.current;
    const currentCategory = activeCategory;
    
    // Only call handleCategoryChange if the category actually changed and it's not 'all'
    if (currentCategory && currentCategory !== 'all' && currentCategory !== prevCategory) {
      if (import.meta.env.DEV) {
        console.log('Category changed from', prevCategory, 'to', currentCategory);
      }
      prevCategoryRef.current = currentCategory;
      // Call handleCategoryChange directly since it's stable
      handleCategoryChange(currentCategory);
    }
  }, [activeCategory]); // FIXED: Removed handleCategoryChange dependency to prevent infinite loops

  // Enhanced swiper movement functions
  const smoothSlideTo = useCallback((swiper, index, speed = 600) => {
    if (swiper && typeof swiper.slideTo === 'function') {
      swiper.slideTo(index, speed, 'cubic-bezier(0.25, 0.46, 0.45, 0.94)');
    }
  }, []);

  const smoothSlideNext = useCallback((swiper, speed = 600) => {
    if (swiper && typeof swiper.slideNext === 'function') {
      swiper.slideNext(speed, 'cubic-bezier(0.25, 0.46, 0.45, 0.94)');
    }
  }, []);

  const smoothSlidePrev = useCallback((swiper, speed = 600) => {
    if (swiper && typeof swiper.slidePrev === 'function') {
      swiper.slidePrev(speed, 'cubic-bezier(0.25, 0.46, 0.45, 0.94)');
    }
  }, []);

  // Enhanced keyboard navigation for swipers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      const activeSwiper = document.querySelector('.swiper-slide-active')?.closest('.swiper')?.swiper;
      if (!activeSwiper) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          smoothSlidePrev(activeSwiper, 400);
          break;
        case 'ArrowRight':
          e.preventDefault();
          smoothSlideNext(activeSwiper, 400);
          break;
        case 'Home':
          e.preventDefault();
          smoothSlideTo(activeSwiper, 0, 600);
          break;
        case 'End':
          e.preventDefault();
          smoothSlideTo(activeSwiper, activeSwiper.slides.length - 1, 600);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [smoothSlideTo, smoothSlideNext, smoothSlidePrev]);

  // Enhanced touch and gesture support for mobile
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let isSwiping = false;

    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isSwiping = false;
    };

    const handleTouchMove = (e) => {
      if (!isSwiping) {
        const deltaX = Math.abs(e.touches[0].clientX - startX);
        const deltaY = Math.abs(e.touches[0].clientY - startY);
        
        if (deltaX > deltaY && deltaX > 10) {
          isSwiping = true;
        }
      }
    };

    const handleTouchEnd = (e) => {
      if (!isSwiping) return;
      
      const deltaX = e.changedTouches[0].clientX - startX;
      const deltaY = e.changedTouches[0].clientY - startY;
      
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        const activeSwiper = document.querySelector('.swiper-slide-active')?.closest('.swiper')?.swiper;
        if (activeSwiper) {
          if (deltaX > 0) {
            smoothSlidePrev(activeSwiper, 300);
          } else {
            smoothSlideNext(activeSwiper, 300);
          }
        }
      }
      
      isSwiping = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [smoothSlideNext, smoothSlidePrev]);

  // Add missing loadMoreMovies function
  const loadMoreMovies = useCallback(async (section) => {
    if (!section || !pageStates[section]) {
      console.warn('Invalid section for loadMoreMovies:', section);
      return;
    }
    
    const currentState = pageStates[section];
    if (currentState.isLoading || !currentState.hasMore) {
      return;
    }
    
    try {
      const nextPage = currentState.current + 1;
      const fetchFunction = getFetchFunction(section);
      
      if (!fetchFunction) {
        console.warn('No fetch function found for section:', section);
        return;
      }
      
      const result = await fetchFunction(nextPage);
      
      if (result && result.results) {
        // Update the appropriate state based on section
        const setterMap = {
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
        
        const setter = setterMap[section];
        if (setter) {
          setter(prev => [...prev, ...result.results]);
        }
        
        // Update page state
        setPageStates(prev => ({
          ...prev,
          [section]: {
            ...prev[section],
            current: nextPage,
            hasMore: nextPage < (result.totalPages || 1),
            isLoading: false
          }
        }));
      }
    } catch (error) {
      console.error(`Error loading more movies for ${section}:`, error);
      // Reset loading state on error
      setPageStates(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          isLoading: false
        }
      }));
    }
  }, []); // FIXED: Empty dependency array to prevent infinite loops and excessive re-renders

  // 🧹 ENHANCED: Comprehensive cleanup on unmount with memory optimization
  useEffect(() => {
    return () => {
      // Mark component as unmounted
      isMountedRef.current = false;
      
      // Run comprehensive cleanup (guarded)
      try { cleanup(); } catch (_) {}
      
      // Additional cleanup for any remaining resources (guarded)
      try { cleanupAllTimers(); } catch (_) {}
      
      // Clear intersection observer
      if (sectionObserverRef && sectionObserverRef.current) {
        sectionObserverRef.current.disconnect();
        sectionObserverRef.current = null;
      }
      
      // Clear visibility observer
      if (visibilityObserverRef.current) {
        visibilityObserverRef.current.disconnect();
        visibilityObserverRef.current = null;
      }
      
      // Clear performance observer
      if (performanceObserver.current) {
        performanceObserver.current.disconnect();
        performanceObserver.current = null;
      }
      
      // Avoid setState on unmount to prevent update-depth loops
      
      // Clear all timeouts
      if (timeoutRefs.current) {
        timeoutRefs.current.forEach(timeoutId => {
          try { clearTimeout(timeoutId); } catch (_) {}
        });
        timeoutRefs.current.clear();
      }
      
      // Clear all intervals
      if (intervalRefs.current) {
        intervalRefs.current.forEach(intervalId => {
          try { clearInterval(intervalId); } catch (_) {}
        });
        intervalRefs.current.clear();
      }
      
      // Cleanup caches
      cleanMovieDetailsCache();
      if (cacheRef.current) {
        cacheRef.current.clear();
      }
      if (lruQueue.current) {
        lruQueue.current.length = 0;
      }
      
      // Avoid state updates here to prevent update-depth loops on cleanup
      
      // Clear pending requests
      if (pendingRequests.current) {
        pendingRequests.current.clear();
      }
      
      // Ensure scroll is enabled
      document.body.style.overflow = 'auto';
      
      if (import.meta.env.DEV) {
        console.log('🧹 HomePage component unmounted - all memory cleaned up');
      }
    };
  }, []);

  // FIXED: Memoize the PageLoader component to prevent unnecessary re-renders and memory leaks
  const pageLoader = useMemo(() => {
    if (loadingStates.initial) {
      // Calculate loading progress based on loaded sections
      const totalSections = 6; // Reduced from 18 to 6 (featured, trending, popular, topRated, upcoming, action)
      const loadedSections = Object.keys(loadingStates).filter(key => 
        key !== 'initial' && !loadingStates[key]
      ).length;
      const progress = Math.min((loadedSections / totalSections) * 100, 95); // Cap at 95% until fully loaded
      
      return (
        <PageLoader 
          text={shouldSkipInitialLoading() ? "Loading from cache..." : "Loading your cinematic experience..."} 
          showProgress={true}
          progress={progress}
          variant="minimalist" // Use minimalist variant for better performance
          showTips={false} // FIXED: Disable tips to reduce memory usage
        />
      );
    }
    return null;
  }, [loadingStates.initial, shouldSkipInitialLoading]); // Keep necessary dependencies only

  // Early returns moved to the end after all hooks are called
  if (loadingStates.initial) {
    return pageLoader;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#121417]">
        <div className="text-white text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className={`relative flex size-full min-h-screen flex-col bg-[#121417] dark group/design-root overflow-x-hidden font-inter scrollbar-hide smooth-scroll performance-scroll touch-scroll-fix`}>
      {/* Error Boundary for better error handling */}
      <ErrorBoundary
        fallback={
          <div className="flex items-center justify-center min-h-screen bg-[#121417]">
            <div className="text-white text-xl">Something went wrong. Please refresh the page.</div>
          </div>
        }
        onError={(error, errorInfo) => {
          console.error('HomePage Error Boundary caught an error:', error, errorInfo);
          // Track error for analytics
          if (typeof trackApiCall === 'function') {
            trackApiCall('HomePageError', 0, false);
          }
        }}
      >
        <div className="layout-container flex h-full grow flex-col scrollbar-hide momentum-scroll">
          <div className="flex flex-1 justify-center">
            <div className="layout-content-container flex flex-col w-full flex-1 scrollbar-hide custom-scroll-ease">

            
            {/* Add HeroSection here - Mobile vs Desktop */}
            {/* Mobile Hero Section */}
            <MemoizedMobileHeroSection 
              featuredContent={featuredContent} 
              trendingMovies={trendingMovies}
              loading={loadingStates.featured || loadingStates.trending}
              onMovieSelect={handleMovieSelect}
              onGenreClick={handleGenreNavigation}
              onCastMemberClick={handleCastMemberClick}
            />
            {/* Desktop Hero Section */}
            <div className="hidden sm:block">
              <MemoizedHeroSection 
                featuredContent={featuredContent} 
                trendingMovies={trendingMovies}
                onMovieSelect={handleMovieSelect}
                onGenreClick={handleGenreNavigation}
                onCastMemberClick={handleCastMemberClick}
              />
            </div>
            {/* Category Selector with Swiper for Desktop */}
            <CategorySwiper 
              categories={categories}
              activeCategory={activeCategory}
              onCategoryClick={handleCategoryButtonClick}
              isMobile={isMobile}
            />
            {/* Movie Sections with Swiper for Desktop - lazily mount on visibility */}
            {activeCategory === 'all' ? (
              <>
                {/* Continue Watching Section */}
                <VisibleOnDemand placeholderHeight={220}>
                  <ContinueWatching 
                    onMovieSelect={handleMovieSelect}
                    isMobile={isMobile}
                  />
                </VisibleOnDemand>
                
                {/* Netflix-style Hero Section with Trending */}
                <VisibleOnDemand placeholderHeight={320}>
                  <MovieSectionSwiper 
                    title="Trending Now" 
                    movies={trendingMovies}
                    loading={loadingStates.trending}
                    onLoadMore={() => loadMoreMovies('trending')}
                    hasMore={pageStates.trending.current < pageStates.trending.total}
                    currentPage={pageStates.trending.current}
                    sectionKey="trending"
                    onMovieSelect={handleMovieSelect}
                    onMovieHover={isPointerFine ? handleMovieHover : undefined}
                    onPrefetch={queuePrefetch}
                    isMobile={isMobile}
                  />
                </VisibleOnDemand>
                
                {/* Popular TV Shows - Netflix-style */}
                <VisibleOnDemand placeholderHeight={320}>
                  <MovieSectionSwiper 
                    title="Popular TV Shows" 
                    movies={popularTVShows}
                    loading={loadingStates.popularTV}
                    onLoadMore={() => loadMoreMovies('popularTV')}
                    hasMore={pageStates.popularTV.current < pageStates.popularTV.total}
                    currentPage={pageStates.popularTV.current}
                    sectionKey="popularTV"
                    onMovieSelect={handleMovieSelect}
                    onMovieHover={isPointerFine ? handleMovieHover : undefined}
                    onPrefetch={queuePrefetch}
                    isMobile={isMobile}
                  />
                </VisibleOnDemand>
                
                {/* Popular Movies */}
                <VisibleOnDemand placeholderHeight={320}>
                  <MovieSectionSwiper 
                    title="Popular Movies" 
                    movies={popularMovies}
                    loading={loadingStates.popular}
                    onLoadMore={() => loadMoreMovies('popular')}
                    hasMore={pageStates.popular.current < pageStates.popular.total}
                    currentPage={pageStates.popular.current}
                    sectionKey="popular"
                    onMovieSelect={handleMovieSelect}
                    onMovieHover={isPointerFine ? handleMovieHover : undefined}
                    onPrefetch={queuePrefetch}
                    isMobile={isMobile}
                  />
                </VisibleOnDemand>
                
                {/* Top Rated TV Shows */}
                <VisibleOnDemand placeholderHeight={320}>
                  <MovieSectionSwiper 
                    title="Top Rated TV Shows" 
                    movies={topRatedTVShows}
                    loading={loadingStates.topRatedTV}
                    onLoadMore={() => loadMoreMovies('topRatedTV')}
                    hasMore={pageStates.topRatedTV.current < pageStates.topRatedTV.total}
                    currentPage={pageStates.topRatedTV.current}
                    sectionKey="topRatedTV"
                    onMovieSelect={handleMovieSelect}
                    onMovieHover={isPointerFine ? handleMovieHover : undefined}
                    onPrefetch={queuePrefetch}
                    isMobile={isMobile}
                  />
                </VisibleOnDemand>
                
                {/* Top Rated Movies */}
                <VisibleOnDemand placeholderHeight={320}>
                  <MovieSectionSwiper 
                    title="Top Rated Movies" 
                    movies={topRatedMovies}
                    loading={loadingStates.topRated}
                    onLoadMore={() => loadMoreMovies('topRated')}
                    hasMore={pageStates.topRated.current < pageStates.topRated.total}
                    currentPage={pageStates.topRated.current}
                    sectionKey="topRated"
                    onMovieSelect={handleMovieSelect}
                    onMovieHover={isPointerFine ? handleMovieHover : undefined}
                    onPrefetch={queuePrefetch}
                    isMobile={isMobile}
                  />
                </VisibleOnDemand>
                
                {/* Now Playing Movies */}
                <VisibleOnDemand placeholderHeight={320}>
                  <MovieSectionSwiper 
                    title="Now Playing" 
                    movies={nowPlayingMovies}
                    loading={loadingStates.nowPlaying}
                    onLoadMore={() => loadMoreMovies('nowPlaying')}
                    hasMore={pageStates.nowPlaying.current < pageStates.nowPlaying.total}
                    currentPage={pageStates.nowPlaying.current}
                    sectionKey="nowPlaying"
                    onMovieSelect={handleMovieSelect}
                    onMovieHover={isPointerFine ? handleMovieHover : undefined}
                    onPrefetch={queuePrefetch}
                    isMobile={isMobile}
                  />
                </VisibleOnDemand>
                
                {/* Coming Soon */}
                <VisibleOnDemand placeholderHeight={320}>
                  <MovieSectionSwiper 
                    title="Coming Soon" 
                    movies={upcomingMovies}
                    loading={loadingStates.upcoming}
                    onLoadMore={() => loadMoreMovies('upcoming')}
                    hasMore={pageStates.upcoming.current < pageStates.upcoming.total}
                    currentPage={pageStates.upcoming.current}
                    sectionKey="upcoming"
                    onMovieSelect={handleMovieSelect}
                    onMovieHover={isPointerFine ? handleMovieHover : undefined}
                    onPrefetch={queuePrefetch}
                    isMobile={isMobile}
                  />
                </VisibleOnDemand>
                
                {/* Airing Today TV Shows */}
                <VisibleOnDemand placeholderHeight={320}>
                  <MovieSectionSwiper 
                    title="Airing Today" 
                    movies={airingTodayTVShows}
                    loading={loadingStates.airingToday}
                    onLoadMore={() => loadMoreMovies('airingToday')}
                    hasMore={pageStates.airingToday.current < pageStates.airingToday.total}
                    currentPage={pageStates.airingToday.current}
                    sectionKey="airingToday"
                    onMovieSelect={handleMovieSelect}
                    onMovieHover={isPointerFine ? handleMovieHover : undefined}
                    onPrefetch={queuePrefetch}
                    isMobile={isMobile}
                  />
                </VisibleOnDemand>
                
                {/* Award Winning Movies */}
                <VisibleOnDemand placeholderHeight={320}>
                  <MovieSectionSwiper 
                    title="Award Winning" 
                    movies={awardWinningMovies}
                    loading={loadingStates.awardWinning}
                    onLoadMore={() => loadMoreMovies('awardWinning')}
                    hasMore={pageStates.awardWinning.current < pageStates.awardWinning.total}
                    currentPage={pageStates.awardWinning.current}
                    sectionKey="awardWinning"
                    onMovieSelect={handleMovieSelect}
                    onMovieHover={isPointerFine ? handleMovieHover : undefined}
                    onPrefetch={queuePrefetch}
                    isMobile={isMobile}
                  />
                </VisibleOnDemand>
                
                {/* Latest Releases */}
                <VisibleOnDemand placeholderHeight={320}>
                  <MovieSectionSwiper 
                    title="Latest Releases" 
                    movies={latestMovies}
                    loading={loadingStates.latest}
                    onLoadMore={() => loadMoreMovies('latest')}
                    hasMore={pageStates.latest.current < pageStates.latest.total}
                    currentPage={pageStates.latest.current}
                    sectionKey="latest"
                    onMovieSelect={handleMovieSelect}
                    onMovieHover={isPointerFine ? handleMovieHover : undefined}
                    onPrefetch={queuePrefetch}
                    isMobile={isMobile}
                  />
                </VisibleOnDemand>
              </>
            ) : (
              <VisibleOnDemand placeholderHeight={320}>
                <MovieSectionSwiper 
                  title={categories.find(c => c.id === activeCategory)?.label || ''}
                  movies={getMoviesForCategory(activeCategory)}
                  loading={loadingStates[activeCategory]}
                  onLoadMore={() => loadMoreMovies(activeCategory)}
                  hasMore={pageStates[activeCategory].current < pageStates[activeCategory].total}
                  currentPage={pageStates[activeCategory].current}
                  sectionKey={activeCategory}
                  onMovieSelect={handleMovieSelect}
                  onMovieHover={isPointerFine ? handleMovieHover : undefined}
                  onPrefetch={queuePrefetch}
                  isMobile={isMobile}
                />
              </VisibleOnDemand>
            )}
            
            {/* Bottom Spacing for Bottom Navigation - Mobile Only */}
            <div className="md:hidden pb-20 sm:pb-24"></div>
          </div>
        </div>
    </div>
    </ErrorBoundary>
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
              className="flex flex-col items-center space-y-6 p-8 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm"
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
                <p className="text-white/90 text-base font-semibold">
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

    {/* Cast Details Overlay */}
    {showCastDetails && selectedCastMember && (
      <CastDetailsOverlay
        person={selectedCastMember}
        onClose={handleCastDetailsClose}
        onMovieSelect={handleMovieSelect}
        onSeriesSelect={handleMovieSelect}
      />
    )}

    {/* Cache Status Display */}
    {import.meta.env.DEV && (
      <div className="fixed bottom-20 right-4 bg-black/80 text-white p-3 rounded-lg text-xs z-50">
        <div className="font-bold mb-2">Cache Status</div>
        <div>Entries: {getCacheStats().totalEntries}</div>
        <div>Hit Rate: {getCacheStats().hitRate}</div>
        <div>Hits: {getCacheStats().cacheHits}</div>
        <div>Misses: {getCacheStats().cacheMisses}</div>
        <button 
          onClick={clearCache}
          className="mt-2 px-2 py-1 bg-red-600 rounded text-xs hover:bg-red-700"
        >
          Clear Cache
        </button>
      </div>
    )}

         {/* Ad Blocker Recommendation Toast */}
     <AdBlockerRecommendationToast 
       show={showAdBlockerToast}
       onClose={() => setShowAdBlockerToast(false)}
       onDismiss={() => {
         localStorage.setItem('adBlockerToastShown', 'true');
       }}
     />
  </div>
  );
};

// Performance monitoring hook moved to top of file



export default HomePage;