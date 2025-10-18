import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, A11y, Mousewheel, Keyboard, FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { useViewingProgress } from '../contexts/ViewingProgressContext';
import { getOptimizedImageUrl } from '../services/imageOptimizationService';
import { useContinueWatchingMemoryOptimizer } from '../utils/continueWatchingMemoryOptimizer';



// Continue Watching Movie Card Component - Using exact same design as trending cards
const ContinueWatchingCard = React.memo(({ item, onClick, isMobile, onRemove }) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [seasonProgress, setSeasonProgress] = useState(null);
  const memoryOptimizer = useContinueWatchingMemoryOptimizer();

  // Use passed isMobile prop instead of detecting again
  const isMobileState = isMobile;





  const formatDuration = useMemo(() => {
    if (item.type === 'tv') {
      return item.seasons ? `${item.seasons} Season${item.seasons > 1 ? 's' : ''}` : 'TV Show';
    }
    return item.runtime ? `${Math.floor(item.runtime / 60)}h ${item.runtime % 60}m` : 'Movie';
  }, [item.type, item.seasons, item.runtime]);

  // Responsive card width: optimized for grid layout
  const cardWidth = useMemo(() => {
    if (typeof window !== "undefined" && window.innerWidth > 1800 && !isMobileState) {
      return "w-[420px]"; // Ultra-wide
    }
    if (isMobileState) {
      return "w-[160px] sm:w-[180px] md:w-[200px]";
    }
    return "w-80 xl:w-[340px]";
  }, [isMobileState]);

  // Get the proper image URL based on the source type
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

  // State for lazy loading
  const [isInView, setIsInView] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  
  // Ref for intersection observer
  const cardRef = useRef(null);
  
  // Cache for season progress data
  const seasonProgressCache = useRef(new Map());

  // Get year from lastWatched date or use current year
  const getYear = useMemo(() => {
    if (item.lastWatched) {
      return new Date(item.lastWatched).getFullYear();
    }
    return new Date().getFullYear();
  }, [item.lastWatched]);

  // Get episode info for TV shows
  const getEpisodeInfo = useMemo(() => {
    if (item.type === 'tv' && item.season && item.episode) {
      return `S${item.season} E${item.episode}`;
    }
    return '';
  }, [item.type, item.season, item.episode]);

  // Get progress percentage for display
  const getProgressPercentage = useMemo(() => {
    const progress = item.progress || 0;
    return progress;
  }, [item.progress]);

  // Format progress for display
  const formatProgress = useMemo(() => {
    const progress = getProgressPercentage;
    if (progress === 0) return 'Not started';
    if (progress >= 90) return 'Almost finished';
    return `${progress.toFixed(0)}% watched`;
  }, [getProgressPercentage]);

  // Calculate season progress for TV shows
  const calculateSeasonProgress = useCallback(async () => {
    if (item.type === 'tv' && item.season && item.episode) {
      const cacheKey = `${item.id}_${item.season}`;
      
      // Check cache first
      if (seasonProgressCache.current.has(cacheKey)) {
        const cachedData = seasonProgressCache.current.get(cacheKey);
        setSeasonProgress(cachedData);
        return;
      }
      
      try {
        // Import the service dynamically to avoid circular dependencies
        const { getTVSeason } = await import('../services/tmdbService');
        const seasonData = await getTVSeason(item.id, item.season);
        const totalEpisodes = seasonData.episodes?.length || 0;
        
        // Calculate watched episodes (assuming episodes are watched sequentially)
        const watchedEpisodes = item.episode;
        const progress = totalEpisodes > 0 ? (watchedEpisodes / totalEpisodes) * 100 : 0;
        
        const progressData = {
          watched: watchedEpisodes,
          total: totalEpisodes,
          percentage: progress
        };
        
        // Cache the result
        seasonProgressCache.current.set(cacheKey, progressData);
        
        setSeasonProgress(progressData);
      } catch (error) {
        setSeasonProgress(null);
      }
    }
  }, [item.id, item.season, item.episode, item.type]);

  // Fetch season progress when component mounts
  useEffect(() => {
    if (item.type === 'tv' && item.season && item.episode) {
      calculateSeasonProgress();
    }
  }, [calculateSeasonProgress]);

  // Memoized event handlers
  const handleCardClick = useCallback(() => {
    onClick(item);
  }, [onClick, item]);

  const handleRemoveClick = useCallback((e) => {
    e.stopPropagation();
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(item);
    }, 300);
  }, [onRemove, item]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!cardRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isInView) {
            setIsInView(true);
            observer.disconnect(); // Stop observing once loaded
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' } // Load when 10% visible, with 50px margin
    );
    
    observer.observe(cardRef.current);
    
    return () => observer.disconnect();
  }, [isInView]);

  return (
    <div 
      ref={cardRef}
      className={`group flex flex-col gap-4 rounded-lg ${cardWidth} flex-shrink-0 touch-manipulation`}
      data-movie-id={item.id}
      style={{
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation',
        opacity: isRemoving ? 0 : 1,
        transform: isRemoving ? 'scale(0.8) translateY(-20px)' : 'scale(1) translateY(0)',
        transition: 'all 0.3s ease-in-out',
      }}
    >
      <div className={`relative ${isMobileState ? 'aspect-[2/3]' : 'aspect-[16/10]'} rounded-lg overflow-hidden transform-gpu transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/20 w-full active:scale-[0.98] active:shadow-lg`}>
        {/* Clickable area for movie details */}
        <div 
          className="w-full h-full cursor-pointer touch-manipulation"
          onClick={handleCardClick}
          style={{
            WebkitTapHighlightColor: 'transparent',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            touchAction: 'manipulation',
          }}
        >
          {isInView && imageUrl && !imageLoadError ? (
            <img
              src={imageUrl}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
              style={{
                imageRendering: 'auto',
                WebkitBackfaceVisibility: 'hidden',
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0)',
                WebkitFontSmoothing: 'antialiased',
                WebkitTransform: 'translate3d(0,0,0)',
              }}
              draggable={false}
              onError={() => setImageLoadError(true)}
              onLoad={() => setImageLoadError(false)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
              </svg>
            </div>
          )}
          
          {/* Movie info overlay - ALWAYS VISIBLE on desktop for landscape cards - FIXED positioning */}
          <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-100 transition-all duration-500 rounded-lg overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-0 transition-transform duration-500 overflow-hidden">
                <h3 className="text-white font-medium text-lg truncate mb-1 drop-shadow-lg">{item.title}</h3>
                <div className="flex items-center gap-2 text-white/90 text-sm drop-shadow-md">
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
                      <span className="flex items-center gap-1">
                        {getEpisodeInfo}
                      </span>
                    </>
                  )}
                </div>
                
                {/* Progress bar for TV shows - ALWAYS VISIBLE */}
                {item.type === 'tv' && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-white/70 text-xs mb-1">
                      <span>Season {item.season || 'N/A'} Progress</span>
                      <span>
                        {seasonProgress ? `${seasonProgress.watched}/${seasonProgress.total}` : `${item.episode || 0} episodes`}
                      </span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-1.5">
                      <div 
                        className={`h-1 rounded-full transition-all duration-300 ${
                          seasonProgress ? 'bg-white' : 'bg-white/30'
                        }`}
                        style={{ 
                          width: seasonProgress ? `${seasonProgress.percentage}%` : '0%'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Progress bar for movies - ALWAYS VISIBLE */}
                {item.type === 'movie' && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-white/70 text-xs mb-1">
                      <span>Watch Progress</span>
                      <span>{getProgressPercentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-1.5">
                      <div 
                        className={`h-1 rounded-full transition-all duration-300 ${
                          getProgressPercentage > 0 ? 'bg-white' : 'bg-white/30'
                        }`}
                        style={{ width: `${Math.max(getProgressPercentage, 1)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
        
          {/* Remove button - positioned at top right (rendered last to ensure top stacking on mobile) */}
          {onRemove && (
            <button
              aria-label="Remove from Continue Watching"
              onClick={handleRemoveClick}
              className="absolute top-2 right-2 z-30 w-9 h-9 sm:w-8 sm:h-8 bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 pointer-events-auto shadow-md shadow-black/30"
              style={{
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                touchAction: 'manipulation',
              }}
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Mobile Progress Bar - ALWAYS VISIBLE using inline styles for maximum compatibility */}
        <div 
          style={{
            display: typeof window !== 'undefined' && window.innerWidth < 768 ? 'block' : 'none',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '8px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
            zIndex: 9999,
            pointerEvents: 'none'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'rgba(255,255,255,0.9)',
            fontSize: '12px',
            marginBottom: '4px'
          }}>
            <span>
              {item.type === 'tv' 
                ? `Season ${item.season || 'N/A'}`
                : 'Progress'
              }
            </span>
            <span>
              {item.type === 'tv' 
                ? (seasonProgress ? `${seasonProgress.watched}/${seasonProgress.total}` : `${item.episode || 0} episodes`)
                : `${getProgressPercentage.toFixed(0)}%`
              }
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '4px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: '9999px',
            overflow: 'hidden'
          }}>
            <div 
              style={{
                height: '2px',
                backgroundColor: item.type === 'tv'
                  ? (seasonProgress ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.3)')
                  : (getProgressPercentage > 0 ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.3)'),
                borderRadius: '9999px',
                transition: 'width 0.3s ease',
                width: item.type === 'tv' 
                  ? (seasonProgress ? `${seasonProgress.percentage}%` : '0%')
                  : `${Math.max(getProgressPercentage, 1)}%`
              }}
            />
          </div>
        </div>




      </div>
    </div>
  );
});

ContinueWatchingCard.displayName = 'ContinueWatchingCard';

// Main Continue Watching Component - MEMORY LEAK FIXED
const ContinueWatching = ({ onMovieSelect, isMobile }) => {
  const { continueWatching, hasContinueWatching, removeFromContinueWatching, refreshFromStorage, clearAllContinueWatching } = useViewingProgress();
  const memoryOptimizer = useContinueWatchingMemoryOptimizer();
  
  // 🎬 OPTIMIZED: Auto-refresh viewing progress when component mounts or user returns
  useEffect(() => {
    if (!memoryOptimizer) return;
    
    // Refresh viewing progress to ensure we have the latest data
    refreshFromStorage();
    
    // Also refresh when the page becomes visible again (user returns from watching content)
    const handleVisibilityChange = () => {
      if (!document.hidden && memoryOptimizer.isMounted()) {
        refreshFromStorage();
      }
    };

    // Listen for page visibility changes
    memoryOptimizer.addEventListener(document, 'visibilitychange', handleVisibilityChange);
    
    // Also refresh when the window gains focus
    const handleFocus = () => {
      if (memoryOptimizer.isMounted()) {
        refreshFromStorage();
      }
    };
    
    memoryOptimizer.addEventListener(window, 'focus', handleFocus);

    // Periodic refresh every 30 seconds to ensure data stays current
    memoryOptimizer.addInterval(() => {
      if (memoryOptimizer.isMounted()) {
        refreshFromStorage();
      }
    }, 30000); // 30 seconds

    // Cleanup is handled automatically by the memory optimizer
  }, [refreshFromStorage, memoryOptimizer]);
  
  // Memoized continue watching items to prevent unnecessary re-renders
  const memoizedContinueWatching = useMemo(() => continueWatching, [continueWatching]);

  // Add swiper ref to update when items change
  const swiperRef = useRef(null);

  // Update swiper when continue watching items change to ensure proper scrolling
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
  }, [memoizedContinueWatching, isMobile]); // Also update when mobile state changes
  

  
  const handleMovieSelect = useCallback((item) => {
    if (onMovieSelect) {
      // Create a movie object that matches the expected format
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
        episodeTitle: item.episodeTitle
      };
      
      onMovieSelect(movieObject);
    }
  }, [onMovieSelect]);

  const handleRemoveItem = useCallback((item) => {
    removeFromContinueWatching(item.id, item.type, item.season, item.episode);
  }, [removeFromContinueWatching]);

  // 🎬 OPTIMIZED: Memoized clear all handler
  const handleClearAll = useCallback(() => {
    clearAllContinueWatching();
  }, [clearAllContinueWatching]);

  // Don't render if no continue watching items
  if (!hasContinueWatching()) {
    return null;
  }

  if (isMobile) {
    return (
      <div className="mt-8 px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            <span className="inline-flex items-center gap-2">
              <span className="flex-shrink-0 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 10.59l3.3 1.9a1 1 0 01-1 1.73l-3.8-2.2a1 1 0 01-.5-.87V7a1 1 0 112 0v5.59z" />
                </svg>
              </span>
              <span>Continue Watching</span>
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearAll}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
        <div className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-4 px-2 sm:px-4 horizontal-scroll-container">
          {memoizedContinueWatching.map((item, index) => (
            <div 
              key={`continue-watching-${item.id}-${item.type}-${item.season || 'movie'}-${item.episode || 'movie'}`} 
              className="flex-shrink-0 relative group"
            >
              <ContinueWatchingCard
                item={item}
                onClick={handleMovieSelect}
                isMobile={isMobile}
                onRemove={handleRemoveItem}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4 px-4">
        <h2 className="text-xl font-semibold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
          <span className="inline-flex items-center gap-2">
            <span className="flex-shrink-0 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 10.59l3.3 1.9a1 1 0 01-1 1.73l-3.8-2.2a1 1 0 01-.5-.87V7a1 1 0 112 0v5.59z" />
              </svg>
            </span>
            <span>Continue Watching</span>
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearAll}
            className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>
      <div className="relative group">
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
            momentumVelocityRatio: 0.75
          }}
          observer={true}
          observeParents={true}
          updateOnWindowResize={true}
          className="px-6 pb-4 overflow-hidden"
        >
          {memoizedContinueWatching.map((item, index) => (
            <SwiperSlide key={`continue-watching-${item.id}-${item.type}-${item.season || 'movie'}-${item.episode || 'movie'}`} className="!w-auto">
              <div 
                className="relative group"
              >
                <ContinueWatchingCard
                  item={item}
                  onClick={handleMovieSelect}
                  isMobile={isMobile}
                  onRemove={handleRemoveItem}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        {/* Navigation buttons - only visible on desktop */}
        <div className="continue-watching-swiper-prev !w-10 !h-10 !bg-white/5 hover:!bg-white/10 !rounded-full !border !border-white/10 !transition-all !duration-300 opacity-0 group-hover:opacity-100 !absolute !left-0 !-translate-y-1/2 !top-[50%] !m-0 !z-20 hover:!shadow-lg hover:!shadow-black/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </div>
        <div className="continue-watching-swiper-next !w-10 !h-10 !bg-white/5 hover:!bg-white/10 !rounded-full !border !border-white/10 !transition-all !duration-300 opacity-0 group-hover:opacity-100 !absolute !right-0 !-translate-y-1/2 !top-[50%] !m-0 !z-20 hover:!shadow-lg hover:!shadow-black/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default ContinueWatching; 