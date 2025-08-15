import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, A11y, Mousewheel, Keyboard } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { useViewingProgress } from '../contexts/ViewingProgressContext';
import { getOptimizedImageUrl } from '../services/imageOptimizationService';
import { useContinueWatchingMemoryOptimizer } from '../utils/continueWatchingMemoryOptimizer';



// Continue Watching Movie Card Component - Using exact same design as trending cards
const ContinueWatchingCard = React.memo(({ item, onClick, isMobile, onRemove }) => {
  const [isMobileState, setIsMobileState] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [seasonProgress, setSeasonProgress] = useState(null);
  const memoryOptimizer = useContinueWatchingMemoryOptimizer();

  // Check if we're on mobile for responsive layout - OPTIMIZED
  useEffect(() => {
    if (!memoryOptimizer) return;
    
    const checkScreenSize = () => {
      if (!memoryOptimizer.isMounted()) return;
      
      const isNowMobile = window.innerWidth < 768 || 
                         (window.navigator && window.navigator.userAgent && 
                          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent));
      
      setIsMobileState(isNowMobile);
    };
    
    checkScreenSize();
    
    // Debounced resize handler to prevent excessive updates
    const debouncedResize = memoryOptimizer.createDebouncedFunction(checkScreenSize, 100);
    memoryOptimizer.addEventListener(window, 'resize', debouncedResize);
    
    // Cleanup is handled automatically by the memory optimizer
  }, [memoryOptimizer]);





  const formatDuration = () => {
    if (item.type === 'tv') {
      return item.seasons ? `${item.seasons} Season${item.seasons > 1 ? 's' : ''}` : 'TV Show';
    }
    return item.runtime ? `${Math.floor(item.runtime / 60)}h ${item.runtime % 60}m` : 'Movie';
  };

  // Enhanced: Responsive image source, aspect ratio, and card width with fallback, retina, and ultra-wide support
  // Determine best image source based on device, pixel density, and available fields
  const getBestImageSource = () => {
    // Use getImageUrl to get the proper URL with mobile/desktop logic
    return getImageUrl();
  };

  // Get the proper image URL based on the source type
  const getImageUrl = useCallback(() => {
    try {
      console.log('🖼️ ContinueWatchingCard getImageUrl for item:', {
        id: item.id,
        title: item.title,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        type: item.type,
        isMobile: isMobileState
      });



      // Use the optimized image service instead of manual URL construction
      if (isMobileState) {
        // For mobile, prefer poster
        if (item.poster_path) {
          const mobileUrl = getOptimizedImageUrl(item.poster_path, 'w500');
          return mobileUrl;
        } else if (item.backdrop_path) {
          const mobileUrl = getOptimizedImageUrl(item.backdrop_path, 'w500');
          return mobileUrl;
        }
      } else {
        // For desktop, prefer backdrop
        if (item.backdrop_path) {
          return getOptimizedImageUrl(item.backdrop_path, 'w780');
        } else if (item.poster_path) {
          return getOptimizedImageUrl(item.poster_path, 'w500');
        }
      }
      
      console.log('🖼️ No valid image paths found for item:', item);
      return null;
    } catch (error) {
      console.error('Error constructing image URL:', error);
      return null;
    }
  }, [item.id, item.title, item.poster_path, item.backdrop_path, item.type, item.season, item.episode, item.episodeTitle, isMobileState]);

  // Responsive aspect ratio: portrait for mobile, landscape for desktop
  const getAspectRatio = () => {
    return isMobileState ? "2/3" : "16/10";
  };

  // Responsive card width: optimized for grid layout
  const getCardWidth = () => {
    if (typeof window !== "undefined" && window.innerWidth > 1800 && !isMobileState) {
      return "w-[420px]"; // Ultra-wide
    }
    if (isMobileState) {
      return "w-[160px] sm:w-[180px] md:w-[200px]";
    }
    return "w-80 xl:w-[340px]";
  };

  const imageSource = getBestImageSource();
  const aspectRatio = getAspectRatio();
  const cardWidth = getCardWidth();

  // State for image loading fallback
  const [imageLoadError, setImageLoadError] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [lastStableUrl, setLastStableUrl] = useState(null);
  const [hasInitializedImage, setHasInitializedImage] = useState(false);
  
  // Ref to track if component is mounted
  const isMountedRef = useRef(true);

  // Persistent image state management
  const getPersistentImageKey = () => `${item.id}_${item.type}_${item.season || 'movie'}_${item.episode || 'movie'}`;
  
  // Load persistent image URL from localStorage
  useEffect(() => {
    const persistentKey = getPersistentImageKey();
    const savedImageUrl = localStorage.getItem(`continue_watching_image_${persistentKey}`);
    
    // Mobile-specific debugging for persistent image loading
    if (isMobileState && item.type === 'tv') {
      console.log('📱 Mobile persistent image lookup:', {
        key: persistentKey,
        savedUrl: savedImageUrl,
        itemTitle: item.title,
        hasSavedUrl: !!savedImageUrl
      });
    }
    
    if (savedImageUrl && savedImageUrl !== 'null') {
      console.log('🖼️ Loading persistent image URL:', savedImageUrl, 'for item:', item.title);
      setCurrentImageUrl(savedImageUrl);
      setLastStableUrl(savedImageUrl);
      setImageLoadError(false);
      setHasInitializedImage(true);
    } else {
      console.log('📱 Mobile: No persistent image URL found for', item.title, 'key:', persistentKey);
    }
  }, [item.id, item.type, item.season, item.episode, isMobileState]);

  // Save image URL to localStorage when it changes
  useEffect(() => {
    if (currentImageUrl && currentImageUrl !== 'null') {
      const persistentKey = getPersistentImageKey();
      localStorage.setItem(`continue_watching_image_${persistentKey}`, currentImageUrl);
      console.log('🖼️ Saved persistent image URL:', currentImageUrl, 'for item:', item.title);
    }
  }, [currentImageUrl, item.id, item.type, item.season, item.episode]);


  // Initialize image URL with better state management
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    const url = getImageUrl();
    console.log('🖼️ Setting image URL:', url, 'for item:', item.title, 'hasInitialized:', hasInitializedImage, 'isMobile:', isMobileState);
    
    // Mobile-specific debugging for TV shows
    if (isMobileState && item.type === 'tv') {
      console.log('📱 Mobile TV Show image URL setting:', {
        url,
        currentImageUrl,
        lastStableUrl,
        hasInitializedImage,
        itemTitle: item.title,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path
      });
    }
    
    // If we already have a stable URL and the component has been initialized, don't change it
    if (hasInitializedImage && lastStableUrl && url === null) {
      console.log('🖼️ Keeping stable URL as component is initialized');
      return;
    }
    
    // Only update if the URL has actually changed and is not null
    if (url !== currentImageUrl && url !== null) {
      setCurrentImageUrl(url);
      setLastStableUrl(url);
      setImageLoadError(false);
      setHasInitializedImage(true);
    } else if (url === null && currentImageUrl !== null) {
      // Only set to null if we don't already have a valid URL
      console.log('🖼️ Keeping existing image URL as new URL is null');
    } else if (url === null && currentImageUrl === null && lastStableUrl === null && (item.poster_path || item.backdrop_path)) {
      // Fallback: if we have image paths but no URL, try to construct one
      console.log('🖼️ Attempting fallback image URL construction');
      const fallbackUrl = getOptimizedImageUrl(item.poster_path || item.backdrop_path, isMobileState ? 'w500' : 'w780');
      if (fallbackUrl && isMountedRef.current) {
        setCurrentImageUrl(fallbackUrl);
        setLastStableUrl(fallbackUrl);
        setImageLoadError(false);
        setHasInitializedImage(true);
      }
    }
  }, [getImageUrl, currentImageUrl, lastStableUrl, hasInitializedImage, item.poster_path, item.backdrop_path, isMobileState]);



  // Get year from lastWatched date or use current year
  const getYear = () => {
    if (item.lastWatched) {
      return new Date(item.lastWatched).getFullYear();
    }
    return new Date().getFullYear();
  };

  // Get episode info for TV shows
  const getEpisodeInfo = () => {
    if (item.type === 'tv' && item.season && item.episode) {
      return `S${item.season} E${item.episode}`;
    }
    return '';
  };

  // Get progress percentage for display
  const getProgressPercentage = () => {
    const progress = item.progress || 0;
    console.log('🎬 ContinueWatchingCard progress for', item.title, ':', progress);
    return progress;
  };

  // Format progress for display
  const formatProgress = () => {
    const progress = getProgressPercentage();
    if (progress === 0) return 'Not started';
    if (progress >= 90) return 'Almost finished';
    return `${progress.toFixed(0)}% watched`;
  };

  // Calculate season progress for TV shows
  const calculateSeasonProgress = useCallback(async () => {
    if (item.type === 'tv' && item.season && item.episode) {
      try {
        // Import the service dynamically to avoid circular dependencies
        const { getTVSeason } = await import('../services/tmdbService');
        const seasonData = await getTVSeason(item.id, item.season);
        const totalEpisodes = seasonData.episodes?.length || 0;
        
        // Calculate watched episodes (assuming episodes are watched sequentially)
        const watchedEpisodes = item.episode;
        const progress = totalEpisodes > 0 ? (watchedEpisodes / totalEpisodes) * 100 : 0;
        
        setSeasonProgress({
          watched: watchedEpisodes,
          total: totalEpisodes,
          percentage: progress
        });
      } catch (error) {
        console.error('Error fetching season data for progress:', error);
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

  // Cleanup effect to prevent state updates when component is being removed
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Cleanup persistent image URL when item is removed
  useEffect(() => {
    return () => {
      // Only cleanup if the component is being unmounted due to item removal
      if (!isMountedRef.current) {
        const persistentKey = getPersistentImageKey();
        localStorage.removeItem(`continue_watching_image_${persistentKey}`);
        console.log('🖼️ Cleaned up persistent image URL for item:', item.title);
      }
    };
  }, [item.id, item.type, item.season, item.episode]);

  return (
    <motion.div 
      className={`group flex flex-col gap-4 rounded-lg ${cardWidth} flex-shrink-0 touch-manipulation`}
      data-movie-id={item.id}
      style={{
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation',
      }}
      initial={{ opacity: 1, scale: 1, y: 0 }}
      animate={isRemoving ? { 
        opacity: 0, 
        scale: 0.8, 
        y: -20,
        transition: { duration: 0.3, ease: "easeInOut" }
      } : { 
        opacity: 1, 
        scale: 1, 
        y: 0,
        transition: { duration: 0.3, ease: "easeOut" }
      }}
      exit={{ 
        opacity: 0, 
        scale: 0.8, 
        y: -20,
        transition: { duration: 0.3, ease: "easeInOut" }
      }}
      layout
    >
      <div className={`relative ${isMobileState ? 'aspect-[2/3]' : 'aspect-[16/10]'} rounded-lg overflow-hidden transform-gpu transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/20 w-full active:scale-[0.98] active:shadow-lg`}>
        {/* Clickable area for movie details */}
        <div 
          className="w-full h-full cursor-pointer touch-manipulation"
          onClick={() => onClick(item)}
          style={{
            WebkitTapHighlightColor: 'transparent',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            touchAction: 'manipulation',
          }}
        >
          {(currentImageUrl || lastStableUrl) && !imageLoadError ? (
            <img
              src={currentImageUrl || lastStableUrl}
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
              onError={(e) => {
                console.error('🖼️ Image failed to load:', currentImageUrl || lastStableUrl);
                console.error('🖼️ Item data:', {
                  id: item.id,
                  title: item.title,
                  type: item.type,
                  poster_path: item.poster_path,
                  backdrop_path: item.backdrop_path,
                  season: item.season,
                  episode: item.episode
                });
                console.error('🖼️ Error details:', {
                  error: e,
                  target: e.target,
                  naturalWidth: e.target.naturalWidth,
                  naturalHeight: e.target.naturalHeight
                });
                
                // Only set error if component is still mounted
                if (isMountedRef.current) {
                  setImageLoadError(true);
                }
              }}
              onLoad={(e) => {
                console.log('🖼️ Image loaded successfully:', currentImageUrl || lastStableUrl);
                console.log('🖼️ Image load details:', {
                  id: item.id,
                  title: item.title,
                  type: item.type,
                  naturalWidth: e.target.naturalWidth,
                  naturalHeight: e.target.naturalHeight
                });
                
                // Only log if component is still mounted
                if (isMountedRef.current) {
                  console.log('🖼️ Image load confirmed for mounted component');
                }
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
              </svg>
            </div>
          )}
          
          {/* Movie info overlay - only show on desktop for landscape cards */}
          {!isMobileState && (
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 hover:opacity-100 transition-all duration-500">
              <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 hover:translate-y-0 transition-transform duration-500">
                <h3 className="text-white font-medium text-lg truncate mb-1">{item.title}</h3>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <span className="flex items-center gap-1">
                    {getYear()}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    {item.type === 'tv' ? 'TV Show' : 'Movie'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    {formatDuration()}
                  </span>
                  {item.type === 'tv' && item.season && item.episode && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {getEpisodeInfo()}
                      </span>
                    </>
                  )}
                </div>
                
                {/* Progress bar for TV shows */}
                {item.type === 'tv' && seasonProgress && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-white/70 text-xs mb-1">
                      <span>Season {item.season} Progress</span>
                      <span>{seasonProgress.watched}/{seasonProgress.total} episodes</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-1.5">
                      <div 
                        className="bg-white h-1 rounded-full transition-all duration-300"
                        style={{ width: `${seasonProgress.percentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Progress bar for movies - Always show for debugging */}
                {item.type === 'movie' && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-white/70 text-xs mb-1">
                      <span>Watch Progress</span>
                      <span>{formatProgress()}</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-1.5">
                      <div 
                        className={`h-1 rounded-full transition-all duration-300 ${
                          getProgressPercentage() > 0 ? 'bg-white' : 'bg-white/30'
                        }`}
                        style={{ width: `${Math.max(getProgressPercentage(), 1)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        
          {/* Remove button - positioned at top right (rendered last to ensure top stacking on mobile) */}
          {onRemove && (
            <motion.button
              aria-label="Remove from Continue Watching"
              onClick={(e) => {
                e.stopPropagation();
                setIsRemoving(true);
                setTimeout(() => {
                  onRemove(item);
                }, 300);
              }}
              className="absolute top-2 right-2 z-30 w-9 h-9 sm:w-8 sm:h-8 bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 pointer-events-auto shadow-md shadow-black/30"
              style={{
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                touchAction: 'manipulation',
                transform: 'translateZ(0)',
                willChange: 'transform',
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          )}
        </div>
        
        {/* Progress bar overlay for mobile TV shows */}
        {isMobileState && item.type === 'tv' && seasonProgress && (
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between text-white/90 text-xs mb-1">
              <span>Season {item.season}</span>
              <span>{seasonProgress.watched}/{seasonProgress.total}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-1">
              <div 
                className="bg-white h-0.5 rounded-full transition-all duration-300"
                style={{ width: `${seasonProgress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Progress bar overlay for mobile movies - Always show for debugging */}
        {isMobileState && item.type === 'movie' && (
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between text-white/90 text-xs mb-1">
              <span>Progress</span>
              <span>{getProgressPercentage().toFixed(0)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-1">
              <div 
                className={`h-0.5 rounded-full transition-all duration-300 ${
                  getProgressPercentage() > 0 ? 'bg-white' : 'bg-white/30'
                }`}
                style={{ width: `${Math.max(getProgressPercentage(), 1)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
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

  // Don't render if no continue watching items
  if (!hasContinueWatching()) {
    return null;
  }

  if (isMobile) {
    return (
      <div className="mt-8 px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Continue Watching</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                clearAllContinueWatching();
              }}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
        <div className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-4 px-2 sm:px-4">
          <AnimatePresence>
            {memoizedContinueWatching.map((item, index) => (
              <motion.div 
                key={`continue-watching-${item.id}-${item.type}-${item.season || 'movie'}-${item.episode || 'movie'}`} 
                className="flex-shrink-0 relative group"
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, x: -100 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <ContinueWatchingCard
                  item={item}
                  onClick={handleMovieSelect}
                  isMobile={isMobile}
                  onRemove={handleRemoveItem}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4 px-4">
        <h2 className="text-xl font-semibold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Continue Watching</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              clearAllContinueWatching();
            }}
            className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-colors"
          >
            Clear All
          </button>
        </div>
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
          <AnimatePresence>
            {memoizedContinueWatching.map((item, index) => (
              <SwiperSlide key={`continue-watching-${item.id}-${item.type}-${item.season || 'movie'}-${item.episode || 'movie'}`} className="!w-auto">
                <motion.div 
                  className="relative group"
                  initial={{ opacity: 1, scale: 1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8, x: -100 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <ContinueWatchingCard
                    item={item}
                    onClick={handleMovieSelect}
                    isMobile={isMobile}
                    onRemove={handleRemoveItem}
                  />
                </motion.div>
              </SwiperSlide>
            ))}
          </AnimatePresence>
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