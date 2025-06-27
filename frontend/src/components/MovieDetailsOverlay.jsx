import React, { useState, useRef, useEffect, useCallback, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMovieDetails, getMovieCredits, getMovieVideos, getSimilarMovies } from '../services/tmdbService';
import { useWatchlist } from '../contexts/WatchlistContext';
import { Loader, PageLoader, SectionLoader, CardLoader } from './Loader';

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

// Memoize motion variants outside the component to avoid recreation on every render
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02, // minimal
      type: 'spring',
      stiffness: 260,
      damping: 22,
      duration: 0.10,
      delay: 0,
    },
  },
};
const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.10,
      type: 'spring',
      stiffness: 260,
      damping: 22,
      delay: 0,
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
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
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

// Simple mobile detection hook
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 640 : false
  );
  React.useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 640);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
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
  const handleShowMoreCast = useCallback(() => setCastLimit(lim => lim + 20), []);
  const handleShowMoreSimilar = useCallback(() => setSimilarLimit(lim => lim + 20), []);
  // Memoize castToShow (already memoized, but add comment)
  // Memoize the visible cast list for performance
  const castToShow = React.useMemo(() => {
    if (!movieDetails?.cast) return [];
    return showAllCast ? movieDetails.cast.slice(0, castLimit) : movieDetails.cast.slice(0, Math.min(5, castLimit));
  }, [movieDetails, showAllCast, castLimit]);
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
      setScrollY(scrollContainerRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const currentRef = scrollContainerRef.current;
    if (currentRef) {
      currentRef.addEventListener('scroll', handleScroll, { passive: true });
    }
    return () => {
      if (currentRef) {
        currentRef.removeEventListener('scroll', handleScroll);
      }
    };
  }, [loading, handleScroll]);

  // Memoize loadMoreSimilar
  const loadMoreSimilar = useCallback(async () => {
    if (isSimilarLoadingMore || !hasMoreSimilar) return;
    setIsSimilarLoadingMore(true);
    const nextPage = similarMoviesPage + 1;
    try {
      const data = await getSimilarMovies(movie.id, movie.type, nextPage);
      if (data?.results?.length > 0) {
        setSimilarMovies(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMovies = data.results.filter(m => !existingIds.has(m.id));
          return [...prev, ...newMovies];
        });
        setSimilarMoviesPage(nextPage);
        setHasMoreSimilar(data.page < data.total_pages);
      } else {
        setHasMoreSimilar(false);
      }
    } catch (error) {
      console.error('Failed to load more similar movies:', error);
    } finally {
      setIsSimilarLoadingMore(false);
    }
  }, [isSimilarLoadingMore, hasMoreSimilar, similarMoviesPage, movie.id, movie.type]);

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

  // Enhanced fetchMovieData with retry/backoff
  const fetchMovieData = useCallback(async (attempt = 0) => {
    if (!movie) return;
    try {
      setLoading(true);
      setError(null);
      setSimilarMovies([]);
      setSimilarMoviesPage(1);
      setHasMoreSimilar(true);
      setIsCastLoading(true);
      setIsSimilarLoading(true);
      setShowAllCast(false);

      const [movieDetails, movieCredits, movieVideos, similar] = await Promise.all([
        getMovieDetails(movie.id, movie.type),
        getMovieCredits(movie.id, movie.type),
        getMovieVideos(movie.id, movie.type),
        getSimilarMovies(movie.id, movie.type, 1)
      ]);

      if (!movieDetails) {
        setError('Movie not found.');
        setMovieDetails(null);
        return;
      }

      setMovieDetails(movieDetails);
      setCredits(movieCredits);
      setVideos(movieVideos);
      setSimilarMovies(similar?.results || []);
      setHasMoreSimilar(similar?.page < similar?.total_pages);
      setIsCastLoading(false);
      setIsSimilarLoading(false);
      setRetryCount(0);
    } catch (err) {
      if (attempt < 3) {
        // Exponential backoff
        setTimeout(() => {
          setRetryCount(attempt + 1);
          fetchMovieData(attempt + 1);
        }, Math.pow(2, attempt) * 500);
      } else {
        setError('Failed to fetch movie details. Please try again.');
        setMovieDetails(null);
      }
    } finally {
      setLoading(false);
    }
  }, [movie]);

  // Call fetchMovieData on mount or movie change
  useEffect(() => {
    fetchMovieData(0);
    // eslint-disable-next-line
  }, [movie?.id, movie?.type]);

  // Retry handler for manual retry
  const handleRetry = () => {
    setRetryCount(0);
    fetchMovieData(0);
  };

  // Reset state when component unmounts
  useEffect(() => {
    return () => {
      setMovieDetails(null);
      setCredits(null);
      setVideos(null);
      setSimilarMovies([]);
      setLoading(true);
      setError(null);
      setShowTrailer(false);
    };
  }, []);

  // Improved scroll lock: only set overflow, do not touch position/top/width
  useEffect(() => {
    // On mount: lock scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      // On unmount: restore scroll
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleTrailerClick = () => {
    setIsTrailerLoading(true);
    setShowTrailer(true);
  };

  const handleCloseTrailer = () => {
    setShowTrailer(false);
    if (playerRef.current) {
      playerRef.current.pauseVideo();
    }
  };

  const handleSimilarMovieClick = (similarMovie) => {
    // On both mobile and desktop, just update the movie in-place
    if (onMovieSelect) {
      onMovieSelect(similarMovie);
    }
  };

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

  const fetchBasicInfo = useCallback(async () => {
    if (!movie) return;
    try {
      setBasicLoading(true);
      setError(null);
      const details = await getMovieDetails(movie.id, movie.type);
      if (!details) {
        setError('Movie not found.');
        setMovieDetails(null);
        return;
      }
      setMovieDetails(details);
    } catch (err) {
      setError('Failed to fetch movie details. Please try again.');
      setMovieDetails(null);
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
    try {
      const [movieCredits, movieVideos, similar] = await Promise.all([
        getMovieCredits(movie.id, movie.type),
        getMovieVideos(movie.id, movie.type),
        getSimilarMovies(movie.id, movie.type, 1)
      ]);
      setCredits(movieCredits);
      setVideos(movieVideos);
      setSimilarMovies(similar?.results || []);
      setHasMoreSimilar(similar?.page < similar?.total_pages);
    } catch (err) {
      // Show partial data, but log error
      console.error('Failed to fetch extra info:', err);
    } finally {
      setIsCastLoading(false);
      setIsSimilarLoading(false);
    }
  }, [movie]);

  // On mount or movie change, fetch basic info, then extra info
  useEffect(() => {
    setMovieDetails(null);
    setCredits(null);
    setVideos(null);
    setSimilarMovies([]);
    setBasicLoading(true);
    setIsCastLoading(true);
    setIsSimilarLoading(true);
    setError(null);
    fetchBasicInfo().then(() => {
      fetchExtraInfo();
    });
    // eslint-disable-next-line
  }, [movie?.id, movie?.type]);

  const isMobile = useIsMobile();
  // Mobile drag state
  const [dragY, setDragY] = useState(0);
  const dragYRef = useRef(0); // single source of truth for drag position
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(null);
  const lastDragY = useRef(0);
  const dragStartTime = useRef(0);
  const dragThreshold = 140; // px, slightly higher for intent
  const velocityThreshold = 0.7; // px/ms, for fast flicks

  // --- Ultra smooth drag logic ---
  // Only update dragY state on animation frame, use ref for immediate updates
  // Add inertia/flick support and spring-based return/dismiss
  const rafRef = useRef();
  const pendingDragY = useRef(null);
  const velocityRef = useRef(0);
  const lastFrameTime = useRef(Date.now());
  const updateDragY = () => {
    if (pendingDragY.current !== null) {
      setDragY(pendingDragY.current);
      dragYRef.current = pendingDragY.current;
      pendingDragY.current = null;
    }
    rafRef.current = requestAnimationFrame(updateDragY);
  };
  useEffect(() => {
    if (!isMobile) return;
    if (!isDragging) return;
    rafRef.current = requestAnimationFrame(updateDragY);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isDragging, isMobile]);

  // Drag handlers (touch/mouse) with velocity tracking
  const handleDragStart = (e) => {
    setIsDragging(true);
    dragStartY.current = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartTime.current = Date.now();
    lastDragY.current = dragYRef.current;
    lastFrameTime.current = Date.now();
    velocityRef.current = 0;
    document.body.style.userSelect = 'none';
  };
  const handleDragMove = (e) => {
    if (!isDragging) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    let deltaY = clientY - dragStartY.current;
    if (deltaY < 0) deltaY = 0; // Don't allow upward drag
    // Calculate velocity (px/ms)
    const now = Date.now();
    const dt = now - lastFrameTime.current;
    if (dt > 0) {
      velocityRef.current = (deltaY - lastDragY.current) / dt;
      lastFrameTime.current = now;
      lastDragY.current = deltaY;
    }
    pendingDragY.current = deltaY;
  };
  const handleDragEnd = () => {
    setIsDragging(false);
    document.body.style.userSelect = '';
    const dragDuration = Date.now() - dragStartTime.current;
    const velocity = velocityRef.current;
    // Dismiss if dragged past threshold or flicked fast
    if (dragYRef.current > dragThreshold || Math.abs(velocity) > velocityThreshold) {
      // Animate out with spring
      setDragY(window.innerHeight * 0.9);
      dragYRef.current = window.innerHeight * 0.9;
      setTimeout(() => {
        setDragY(0);
        dragYRef.current = 0;
        onClose();
      }, 260);
    } else {
      // Snap back with spring
      setDragY(0);
      dragYRef.current = 0;
    }
  };
  // Memoize drag handlers
  const stableHandleDragStart = React.useCallback(handleDragStart, []);
  const stableHandleDragMove = React.useCallback(handleDragMove, [isDragging]);
  const stableHandleDragEnd = React.useCallback(handleDragEnd, [isDragging]);

  // For scroll-based appearance
  const [showTopFade, setShowTopFade] = useState(false);
  useEffect(() => {
    if (!isMobile) return;
    const handleMobileScroll = () => {
      if (scrollContainerRef.current) {
        setShowTopFade(scrollContainerRef.current.scrollTop > 24);
      }
    };
    const ref = scrollContainerRef.current;
    if (ref) ref.addEventListener('scroll', handleMobileScroll, { passive: true });
    return () => {
      if (ref) ref.removeEventListener('scroll', handleMobileScroll);
    };
  }, [isMobile, loading]);

  // Utility: fade-in animation for delayed content
  const fadeInMotionProps = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.4, ease: 'easeOut' },
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

  return (
    <AnimatePresence>
      {/* Overlay background with ultra-smooth fade */}
      <motion.div
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100000] p-4 contain-paint transition-none sm:mt-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28, ease: 'easeInOut' }}
        onClick={handleClickOutside}
        tabIndex={-1}
      >
        {/* Main content: ultra-smooth entry/exit with spring */}
        <motion.div
          ref={contentRef}
          layout
          className="relative w-full max-w-6xl h-auto max-h-[calc(100vh-4rem)] z-[100001] sm:max-h-[90vh] bg-gradient-to-br from-[#1a1d24] to-[#121417] rounded-2xl shadow-2xl overflow-hidden flex flex-col transform-gpu will-change-transform contain-paint pointer-events-auto overflow-y-auto"
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
          style={isMobile ? { touchAction: 'pan-y', WebkitUserSelect: 'none', userSelect: 'none', willChange: 'transform' } : {}}
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
              <div
                className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center"
                style={{ width: '100%', pointerEvents: 'auto' }}
              >
                <div
                  className={`w-12 h-1.5 rounded-full bg-white/30 mb-2 cursor-grab active:cursor-grabbing transition-all duration-200 ${isDragging ? 'bg-white/60 scale-110' : ''}`}
                  style={{ touchAction: 'none' }}
                  onTouchStart={handleDragStart}
                  onMouseDown={handleDragStart}
                />
              </div>
              {/* Top fade gradient for scroll appearance */}
              <div
                className={`pointer-events-none fixed left-0 right-0 top-0 z-[99999999] h-8 transition-opacity duration-300 ${showTopFade ? 'opacity-100' : 'opacity-0'}`}
                style={{
                  background: 'linear-gradient(to bottom, rgba(18,20,23,0.95) 60%, rgba(18,20,23,0.0))',
                  borderTopLeftRadius: '1rem',
                  borderTopRightRadius: '1rem',
                  maxWidth: '100vw',
                  margin: '0 auto',
                }}
              />
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
                    className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-8"
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

                      {/* Action Buttons */}
                      <div className="flex flex-row items-center justify-center sm:justify-start gap-3 sm:gap-4 my-4 sm:my-6">
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
                    </div>
                  </motion.div>
                </div>
              </div>

              <div className="p-4 sm:p-8 bg-black/20">
                <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-x-12 gap-8">
                  {/* Left Column */}
                  <div className="lg:col-span-2 space-y-8 sm:space-y-12">
                    {/* Overview Section */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.5 }}
                    >
                      <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Storyline</h3>
                      <p className="text-white/70 leading-relaxed text-sm sm:text-base">{movieDetails.overview}</p>
                    </motion.div>

                    {/* Cast Section */}
                    <motion.div 
                      className="pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-white/10"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="flex justify-between items-center mb-4 sm:mb-6">
                        <h3 className="text-xl sm:text-2xl font-bold text-white">Cast & Crew</h3>
                      </div>

                      {/* Director & Writers */}
                      <motion.div 
                        className="flex flex-col sm:flex-row gap-4 sm:gap-8 mb-6 sm:mb-8"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        {movieDetails.director && movieDetails.director !== 'N/A' && (
                          <motion.div variants={itemVariants}>
                            <h4 className="text-xs sm:text-sm text-white/60 mb-1 sm:mb-2 tracking-wider uppercase">Directed by</h4>
                            <p className="text-base sm:text-lg text-white font-medium">{movieDetails.director}</p>
                          </motion.div>
                        )}
                        {movieDetails.writers && movieDetails.writers.length > 0 && (
                          <motion.div variants={itemVariants}>
                            <h4 className="text-xs sm:text-sm text-white/60 mb-1 sm:mb-2 tracking-wider uppercase">Written by</h4>
                            <p className="text-base sm:text-lg text-white font-medium">{movieDetails.writers.join(', ')}</p>
                          </motion.div>
                        )}
                      </motion.div>

                      {isCastLoading ? (
                        <SectionLoader text="Loading cast information..." />
                      ) : castToShow.length > 0 ? (
                        <>
                          <motion.div 
                            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 gap-x-4 sm:gap-x-6 gap-y-6 sm:gap-y-8"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            layout={false}
                          >
                            {castToShow.map((person, idx) => {
                              let key = '';
                              if (person.id && typeof person.id !== 'undefined' && person.id !== null && person.id !== '') {
                                key = `cast-${String(person.id)}-${idx}`;
                              } else if (person.name && typeof person.name === 'string' && person.name.trim() !== '') {
                                key = `cast-name-${person.name.replace(/\s+/g, '_')}-${idx}`;
                              } else {
                                key = `cast-fallback-${idx}`;
                              }
                              return (
                                <motion.div variants={itemVariants} key={key} layout={false} {...fadeInMotionProps}>
                                  <CastCard person={person} />
                                </motion.div>
                              );
                            })}
                          </motion.div>
                          {/* Cast Section Buttons */}
                          {showAllCast ? (
                            <div className="text-center mt-6 sm:mt-8">
                              <button
                                onClick={handleToggleShowAllCast}
                                className="px-4 sm:px-6 py-2 text-sm font-medium text-white/70 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                              >
                                Show Less
                              </button>
                            </div>
                          ) : castToShow.length < movieDetails.cast.length ? (
                            <div className="text-center mt-6 sm:mt-8">
                              {movieDetails.cast.length > 5 && (
                                <button
                                  onClick={handleToggleShowAllCast}
                                  className="px-4 sm:px-6 py-2 text-sm font-medium text-white/70 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                                >
                                  Show All ({movieDetails.cast.length})
                                </button>
                              )}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <div className="text-center text-white/60 py-6 sm:py-8">No cast information available.</div>
                      )}
                    </motion.div>
                  </div>

                  {/* Right Column (Sticky) */}
                  <div className="lg:col-span-1">
                    <motion.div 
                      className="lg:sticky lg:top-8 space-y-6 sm:space-y-8"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {/* Details Card */}
                      <motion.div variants={itemVariants}>
                        <div className="p-4 sm:p-6 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl shadow-lg transition-all duration-300 hover:border-white/20 hover:shadow-2xl">
                            <h4 className="font-bold text-white mb-4 sm:mb-5 text-lg sm:text-xl border-b border-white/10 pb-2 sm:pb-3">Details</h4>
                            <motion.ul 
                              className="space-y-3 sm:space-y-4 text-white/70 text-xs sm:text-sm"
                              variants={containerVariants}
                              initial="hidden"
                              animate="visible"
                            >
                              <motion.li variants={itemVariants} className="flex items-center justify-between p-2 rounded-lg transition-colors hover:bg-white/5">
                                <span className="flex items-center gap-2 sm:gap-3 font-medium">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                  <span className="hidden sm:inline">Release Date</span>
                                  <span className="sm:hidden">Release</span>
                                </span>
                                <span className="text-white/90 font-mono text-right text-xs sm:text-sm">
                                  {movieDetails.type === 'tv'
                                    ? (movieDetails.first_air_date
                                        ? `${new Date(movieDetails.first_air_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} (${new Date(movieDetails.first_air_date).getFullYear()})`
                                        : (movieDetails.release_date
                                            ? `${new Date(movieDetails.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} (${new Date(movieDetails.release_date).getFullYear()})`
                                            : 'N/A'))
                                    : (movieDetails.release_date
                                        ? `${new Date(movieDetails.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} (${new Date(movieDetails.release_date).getFullYear()})`
                                        : 'N/A')}
                                </span>
                              </motion.li>
                              {movieDetails.type === 'tv' && movieDetails.last_air_date && (
                                <motion.li variants={itemVariants} className="flex items-center justify-between p-2 rounded-lg transition-colors hover:bg-white/5">
                                  <span className="flex items-center gap-2 sm:gap-3 font-medium">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    <span className="hidden sm:inline">Last Air Date</span>
                                    <span className="sm:hidden">Last Air</span>
                                  </span>
                                  <span className="text-white/90 font-mono text-right text-xs sm:text-sm">
                                    {new Date(movieDetails.last_air_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </span>
                                </motion.li>
                              )}
                              <motion.li variants={itemVariants} className="flex items-center justify-between p-2 rounded-lg transition-colors hover:bg-white/5">
                                <span className="flex items-center gap-2 sm:gap-3 font-medium">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                  Runtime
                                </span>
                                <span className="text-white/90 font-mono text-right text-xs sm:text-sm">{movieDetails.runtime ? formatRuntime(movieDetails.runtime) : 'N/A'}</span>
                              </motion.li>
                              {movieDetails.type === 'tv' && (
                                <>
                                  <motion.li variants={itemVariants} className="flex items-center justify-between p-2 rounded-lg transition-colors hover:bg-white/5">
                                    <span className="flex items-center gap-2 sm:gap-3 font-medium">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                      Seasons
                                    </span>
                                    <span className="text-white/90 font-mono text-right text-xs sm:text-sm">{movieDetails.number_of_seasons ? `${movieDetails.number_of_seasons} Season${movieDetails.number_of_seasons !== 1 ? 's' : ''}` : 'N/A'}</span>
                                  </motion.li>
                                  <motion.li variants={itemVariants} className="flex items-center justify-between p-2 rounded-lg transition-colors hover:bg-white/5">
                                    <span className="flex items-center gap-2 sm:gap-3 font-medium">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                      Status
                                    </span>
                                    <span className="text-white/90 capitalize text-right text-xs sm:text-sm">{movieDetails.status}</span>
                                  </motion.li>
                                </>
                              )}
                              <motion.li variants={itemVariants} className="flex items-center justify-between p-2 rounded-lg transition-colors hover:bg-white/5">
                                <span className="flex items-center gap-2 sm:gap-3 font-medium">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                  Rating
                                </span>
                                <span className="text-white/90 font-mono flex items-center gap-1.5 text-xs sm:text-sm">{formatRating(movieDetails.rating)}</span>
                              </motion.li>
                              {movieDetails.budget > 0 && (
                                <motion.li variants={itemVariants} className="flex items-center justify-between p-2 rounded-lg transition-colors hover:bg-white/5">
                                  <span className="flex items-center gap-2 sm:gap-3 font-medium">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                    Budget
                                  </span>
                                  <span className="text-white/90 font-mono text-right text-xs sm:text-sm">${movieDetails.budget.toLocaleString()}</span>
                                </motion.li>
                              )}
                              {movieDetails.revenue > 0 && (
                                <motion.li variants={itemVariants} className="flex items-center justify-between p-2 rounded-lg transition-colors hover:bg-white/5">
                                  <span className="flex items-center gap-2 sm:gap-3 font-medium">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                    Revenue
                                  </span>
                                  <span className="text-white/90 font-mono text-right text-xs sm:text-sm">${movieDetails.revenue.toLocaleString()}</span>
                                </motion.li>
                              )}
                              <motion.li variants={itemVariants} className="flex items-center justify-between p-2 rounded-lg transition-colors hover:bg-white/5">
                                <span className="flex items-center gap-2 sm:gap-3 font-medium">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                                  <span className="hidden sm:inline">Original Language</span>
                                  <span className="sm:hidden">Language</span>
                                </span>
                                <span className="text-white/90 font-mono uppercase text-right text-xs sm:text-sm">{movieDetails.original_language}</span>
                              </motion.li>
                            </motion.ul>
                        </div>
                      </motion.div>

                      {/* Genres Card */}
                      <motion.div variants={itemVariants}>
                        <div className="p-4 sm:p-6 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl shadow-lg transition-all duration-300 hover:border-white/20 hover:shado-2xl">
                            <h4 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl border-b border-white/10 pb-2 sm:pb-3">Genres</h4>
                            <motion.div 
                              className="flex flex-wrap gap-2"
                              variants={containerVariants}
                              initial="hidden"
                              animate="visible"
                            >
                              {movieDetails.genres && movieDetails.genres.map((genre, idx) => {
                                let key = '';
                                if (genre.id && typeof genre.id !== 'undefined' && genre.id !== null && genre.id !== '') {
                                  key = `genre-${String(genre.id)}-${idx}`;
                                } else if (genre.name && typeof genre.name === 'string' && genre.name.trim() !== '') {
                                  key = `genre-name-${genre.name.replace(/\s+/g, '_')}-${idx}`;
                                } else {
                                  key = `genre-fallback-${idx}`;
                                }
                                return (
                                  <motion.span variants={itemVariants} key={key} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 border border-transparent rounded-full text-white/80 text-sm transform transition-all duration-300 hover:bg-white/20 hover:text-white hover:border-white/30">{genre.name}</motion.span>
                                );
                              })}
                            </motion.div>
                        </div>
                      </motion.div>
                    </motion.div>
                  </div>
                </div>

                {/* Similar Section */}
                <motion.div 
                  className="pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-white/10"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.6 }}
                >
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">You might also like</h3>
                  {isSimilarLoading ? (
                    <div className="py-6 sm:py-8"><CardLoader count={4} /></div>
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
                            <motion.div variants={itemVariants} key={key} layout={false} {...fadeInMotionProps}>
                              <SimilarMovieCard similar={similar} onClick={handleSimilarMovieClick} isMobile={isMobile} />
                            </motion.div>
                          );
                        })}
                      </motion.div>
                      {similarMovies.length > similarToShow.length && (
                        <div className="col-span-full flex justify-center py-3 sm:py-4">
                          <button onClick={handleShowMoreSimilar} className="px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium text-white/70 bg-white/5 rounded-full hover:bg-white/10 transition-colors">Show More</button>
                        </div>
                      )}
                      {hasMoreSimilar && (
                        <div ref={similarLoaderRef} className="col-span-full flex justify-center py-3 sm:py-4">
                          {isSimilarLoadingMore && <CardLoader count={4} />}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="col-span-full text-center text-gray-400 py-6 sm:py-8 text-sm sm:text-base">No similar {movieDetails.type === 'movie' ? 'movies' : 'shows'} found.</div>
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
              className={`fixed inset-0 z-[100002] flex items-center justify-center bg-black/90 transition-opacity duration-300 ${
                showTrailer ? 'opacity-100' : 'opacity-0'
              }`}
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
      </motion.div>
    </AnimatePresence>
  );
};

export default MovieDetailsOverlay;