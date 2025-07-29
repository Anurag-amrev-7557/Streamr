import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  getTrendingMovies, 
  getPopularMovies, 
  getTopRatedMovies, 
  getGenres, 
  getMovieDetails,
  searchMovies,
  getNetflixMovies,
  getNetflixMoviesByGenre,
  getMoviesByGenre,
  getMoviesByYear,
  fetchWithCache,
  TMDB_BASE_URL,
  TMDB_API_KEY,
  transformMovieData,
  getUpcomingMovies,
  getMoviesByCategory,
  discoverMovies,
  getSimilarMovies
} from '../services/tmdbService';
import { useLoading } from '../contexts/LoadingContext';
import MovieDetailsOverlay from './MovieDetailsOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { debounce } from 'lodash';
import { useWatchlist } from '../contexts/WatchlistContext';

const fadeInAnimation = {
  '@keyframes fadeIn': {
    '0%': {
      opacity: '0',
      transform: 'translateY(10px)'
    },
    '100%': {
      opacity: '1',
      transform: 'translateY(0)'
    }
  }
};

const styles = {
  ...fadeInAnimation,
  '.animate-fadeIn': {
    animation: 'fadeIn 0.5s ease-out forwards'
  }
};

const gridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.01,
      delayChildren: 0
    }
  }
};

const cardVariants = {
  hidden: { 
    opacity: 0,
    y: 10,
    scale: 0.98
  },
  visible: { 
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
      mass: 0.8,
      delay: 0
    }
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.15,
      ease: "easeOut"
    }
  }
};

const loadingVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      duration: 0.3
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
};

const MovieCard = ({ movie, index, onClick, onPrefetch }) => {
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const isBookmarked = watchlist.some(item => item.id === movie.id);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [prefetchComplete, setPrefetchComplete] = useState(false);
  const imgRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const prefetchTimeoutRef = useRef(null);

  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    if (isBookmarked) {
      removeFromWatchlist(movie.id);
    } else {
      addToWatchlist({ ...movie, type: 'movie' });
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  const getImageUrl = () => {
    if (imageError) return null;
    const posterPath = movie.poster_path || movie.poster;
    if (!posterPath) return null;
    if (posterPath.startsWith('http')) return posterPath;
    return `https://image.tmdb.org/t/p/w500${posterPath}`;
  };

  // Enhanced prefetching function
  const handlePrefetch = useCallback(async () => {
    if (prefetchComplete || isPrefetching) return;
    
    setIsPrefetching(true);
    
    try {
      // Prefetch movie details, similar movies, and higher resolution images
      const prefetchPromises = [];
      
      // Prefetch movie details if not already available
      if (!movie.runtime && !movie.budget && !movie.revenue) {
        prefetchPromises.push(
          getMovieDetails(movie.id, 'movie').catch(err => {
            console.warn(`Failed to prefetch details for movie ${movie.id}:`, err);
            return null;
          })
        );
      }
      
      // Prefetch similar movies
      prefetchPromises.push(
        getSimilarMovies(movie.id, 'movie', 1).catch(err => {
          console.warn(`Failed to prefetch similar movies for ${movie.id}:`, err);
          return null;
        })
      );
      
      // Prefetch higher resolution poster image
      const posterPath = movie.poster_path || movie.poster;
      if (posterPath && !posterPath.startsWith('http')) {
        const highResUrl = `https://image.tmdb.org/t/p/w780${posterPath}`;
        prefetchPromises.push(
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(highResUrl);
            img.onerror = () => resolve(null);
            img.src = highResUrl;
          })
        );
      }
      
      // Prefetch backdrop image
      const backdropPath = movie.backdrop_path;
      if (backdropPath) {
        const backdropUrl = `https://image.tmdb.org/t/p/w1280${backdropPath}`;
        prefetchPromises.push(
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(backdropUrl);
            img.onerror = () => resolve(null);
            img.src = backdropUrl;
          })
        );
      }
      
      // Execute all prefetch operations
      await Promise.allSettled(prefetchPromises);
      setPrefetchComplete(true);
      
      // Notify parent component about successful prefetch
      if (onPrefetch) {
        onPrefetch(movie.id);
      }
      
    } catch (error) {
      console.warn(`Prefetch failed for movie ${movie.id}:`, error);
    } finally {
      setIsPrefetching(false);
    }
  }, [movie.id, movie.runtime, movie.budget, movie.revenue, movie.poster_path, movie.poster, movie.backdrop_path, prefetchComplete, isPrefetching, onPrefetch]);

  // Handle mouse enter with debouncing
  const handleMouseEnter = useCallback(() => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Start prefetching after a short delay to avoid unnecessary requests
    hoverTimeoutRef.current = setTimeout(() => {
      handlePrefetch();
    }, 200); // 200ms delay before starting prefetch
  }, [handlePrefetch]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
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
  }, []);

  // Cleanup on unmount
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
      key={`${movie.id}-${index}`}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      layoutId={`movie-${movie.id}`}
      className="group cursor-pointer transform relative"
      data-movie-id={movie.id}
      whileHover={{ 
        scale: 1.03,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 25
        }
      }}
      onClick={() => onClick(movie)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Prefetch indicator (subtle) - Removed to avoid visual distraction */}
      {/* {isPrefetching && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute top-1 left-1 z-20 w-2 h-2 bg-blue-500 rounded-full animate-pulse"
          title="Prefetching..."
        />
      )} */}
      
      <motion.div 
        layout
        className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 relative w-full"
      >
        <AnimatePresence>
          <motion.button
            onClick={handleBookmarkClick}
            className="absolute top-2 right-2 z-10 p-2 bg-black/50 rounded-full transition-colors transition-opacity duration-300 hover:bg-black/70 opacity-0 group-hover:opacity-100"
            aria-label={isBookmarked ? "Remove from watchlist" : "Add to watchlist"}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isBookmarked ? (
              <motion.svg
                key="bookmarked"
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.2 }}
              >
                <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21L12 17.5 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" />
              </motion.svg>
            ) : (
              <motion.svg
                key="not-bookmarked"
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.2 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.5 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </motion.svg>
            )}
          </motion.button>
        </AnimatePresence>
        {!imageLoaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 bg-gray-800 flex items-center justify-center"
          >
            <div className="w-8 h-8 border-4 border-gray-600 border-t-white rounded-full animate-spin"></div>
          </motion.div>
        )}
        
        <motion.img
          ref={imgRef}
          src={getImageUrl() || `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="500" height="750" viewBox="0 0 500 750" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="500" height="750" fill="#1a1a1a"/>
              <path d="M250 300C277.614 300 300 277.614 300 250C300 222.386 277.614 200 250 200C222.386 200 200 222.386 200 250C200 277.614 222.386 300 250 300Z" fill="#333333"/>
              <path d="M350 450C350 483.137 323.137 510 290 510H210C176.863 510 150 483.137 150 450V350C150 316.863 176.863 290 210 290H290C323.137 290 350 316.863 350 350V450Z" fill="#333333"/>
              <path d="M250 400C250 400 230 370 210 370C190 370 170 400 170 400" stroke="#666666" stroke-width="4" stroke-linecap="round"/>
              <path d="M330 400C330 400 310 370 290 370C270 370 250 400 250 400" stroke="#666666" stroke-width="4" stroke-linecap="round"/>
              <text x="250" y="550" font-family="Arial" font-size="24" fill="#666666" text-anchor="middle">No Image Available</text>
              <text x="250" y="580" font-family="Arial" font-size="16" fill="#666666" text-anchor="middle">${movie.title}</text>
            </svg>
          `)}`}
          alt={movie.title}
          className={`w-full h-full object-cover ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          layout
          transition={{ duration: 0.1 }}
        />
        
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.1 }}
          className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3"
          layout
        >
          <motion.div className="text-white" layout>
            <h4 className="font-medium text-sm truncate">{movie.title}</h4>
            <p className="text-xs text-gray-300 flex items-center gap-1">
              {movie.release_date?.split('-')[0] || movie.year || 'N/A'} •
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-400 mr-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
                {movie.vote_average?.toFixed(1) || movie.rating || 'N/A'}
              </span>
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

const MoviesPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [sortBy, setSortBy] = useState('popularity');
  const [movies, setMovies] = useState([]);
  const [tempMovies, setTempMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { setLoadingState } = useLoading();
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [loadedImages, setLoadedImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadedSections, setLoadedSections] = useState({
    header: false,
    filters: false,
    movies: false
  });
  const observerRef = useRef(null);
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '200px',
    triggerOnce: false
  });
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
  const [activeCategory, setActiveCategory] = useState('popular');
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const searchTimeoutRef = useRef(null);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);
  const [yearDropdownRef, setYearDropdownRef] = useState(null);
  const [genreDropdownRef, setGenreDropdownRef] = useState(null);
  
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

  // Predictive prefetching based on viewport visibility
  const [visibleMovies, setVisibleMovies] = useState(new Set());
  const visibilityObserverRef = useRef(null);

  // Add back missing state variables
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const isMounted = useRef(true);
  const fetchInProgress = useRef(false);
  const previousMovies = useRef([]);
  const moviesRef = useRef([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingNextPage, setIsLoadingNextPage] = useState(false);
  const [nextPageMovies, setNextPageMovies] = useState([]);

  // Define fetchMovies function before useEffect hooks
  const fetchMovies = async (category, pageNum = 1) => {
    console.log('fetchMovies called - fetchInProgress:', fetchInProgress.current, 'category:', category, 'pageNum:', pageNum);
    if (fetchInProgress.current) {
      console.log('fetchMovies: Already in progress, returning');
      return;
    }
    fetchInProgress.current = true;
    
    try {
      if (pageNum === 1) {
        setLoading(true);
        setError(null);
      } else {
        setIsLoadingNextPage(true);
      }

      let response;
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      
      if (!apiKey) {
        throw new Error('TMDB API key is not configured');
      }
      
      // Use different endpoints based on category
      let url;
      if (category === 'now_playing') {
        url = `https://api.themoviedb.org/3/movie/now_playing?api_key=${apiKey}&page=${pageNum}`;
      } else if (category === 'popular') {
        url = `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&page=${pageNum}`;
      } else if (category === 'top_rated') {
        url = `https://api.themoviedb.org/3/movie/top_rated?api_key=${apiKey}&page=${pageNum}`;
      } else if (category === 'upcoming') {
        url = `https://api.themoviedb.org/3/movie/upcoming?api_key=${apiKey}&page=${pageNum}`;
      } else {
        // Build the URL with filters for other categories
        url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&page=${pageNum}`;
        
        // Add year filter if selected
        if (selectedYear) {
          url += `&primary_release_year=${selectedYear}`;
        }
        
        // Add genre filter if selected
        if (selectedGenre) {
          url += `&with_genres=${selectedGenre}`;
        }
        
        // Add sort parameter based on category
        switch (category) {
          case 'popular':
            url += '&sort_by=popularity.desc';
            break;
          case 'top_rated':
            url += '&sort_by=vote_average.desc';
            break;
          case 'upcoming':
            url += '&sort_by=release_date.desc';
            break;
          default:
            url += '&sort_by=popularity.desc';
        }
      }

      console.log('Fetching movies from:', url);
      response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.results) {
        throw new Error('Invalid response format from TMDB API');
      }
      
      console.log(`Fetched ${data.results.length} movies for category: ${category}, page: ${pageNum}`);
      console.log('First movie:', data.results[0]);
      
      if (pageNum === 1) {
        console.log('Setting movies for page 1:', data.results.length, 'movies');
        setMovies(data.results);
      } else {
        setMovies(prevMovies => {
          const uniqueMovies = [...prevMovies];
          data.results.forEach(newMovie => {
            if (!uniqueMovies.some(movie => movie.id === newMovie.id)) {
              uniqueMovies.push(newMovie);
            }
          });
          return uniqueMovies;
        });
      }
      
      setHasMore(data.page < data.total_pages);
      setCurrentPage(pageNum);
      setLoadedSections(prev => ({ ...prev, [category]: true }));
      console.log('Movies fetch completed, setting loading to false');

    } catch (err) {
      console.error('Error fetching movies:', err);
      setError('Failed to load movies: ' + err.message);
    } finally {
      if (pageNum === 1) {
        console.log('Finally block: Setting loading to false');
        setLoading(false);
      } else {
        setIsLoadingNextPage(false);
      }
      console.log('Finally block: Setting fetchInProgress to false');
      fetchInProgress.current = false;
    }
  };

  const handleCategoryChange = (category) => {
    // Reset all states when changing category
    setActiveCategory(category);
    setMovies([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    setLoading(true);
    setIsLoadingNextPage(false);
    setNextPageMovies([]);
    
    // Fetch movies for the new category
    fetchMovies(category, 1);
  };

  const handleGenreSelect = async (genre) => {
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;
    
    setSelectedGenre(genre);
    setGenreDropdownOpen(false);
    
    // Update URL with the new genre
    const searchParams = new URLSearchParams(window.location.search);
    if (genre) {
      searchParams.set('genre', genre.name.toLowerCase());
    } else {
      searchParams.delete('genre');
    }
    navigate(`?${searchParams.toString()}`, { replace: true });

    setLoading(true);
    setCurrentPage(1); // Reset page when changing genre
    
    try {
      let results = [];
      if (genre) {
        const response = await getMoviesByGenre(genre.id, 1);
        results = response.movies || [];
        
        // Store the results in both refs
        previousMovies.current = results;
        moviesRef.current = results;
        
        if (isMounted.current) {
          setMovies(() => {
            return results;
          });
          setTotalPages(response.totalPages || 1);
          setHasMore(response.totalPages > 1);
          setError(null);
        }
      } else {
        const response = await getMoviesByCategory(activeCategory);
        results = response.results || [];
        
        // Store the results in both refs
        previousMovies.current = results;
        moviesRef.current = results;
        
        if (isMounted.current) {
          setMovies(() => {
            return results;
          });
          setTotalPages(response.total_pages || 1);
          setHasMore(response.total_pages > 1);
          setError(null);
        }
      }
    } catch (error) {
      if (isMounted.current) {
        console.error('Error fetching movies by genre:', error);
        setError('Failed to load movies');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
      fetchInProgress.current = false;
    }
  };

  // Add URL parameter handling
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const category = searchParams.get('category');
    const genreParam = searchParams.get('genre');
    
    if (category) {
      handleCategoryChange(category);
    }

    if (genreParam && genres.length > 0) {
      // Map genre names to their IDs
      const genreIdMap = {
        'action': 28,
        'adventure': 12,
        'animation': 16,
        'comedy': 35,
        'crime': 80,
        'documentary': 99,
        'drama': 18,
        'family': 10751,
        'fantasy': 14,
        'history': 36,
        'horror': 27,
        'music': 10402,
        'mystery': 9648,
        'romance': 10749,
        'sci-fi': 878,
        'tv movie': 10770,
        'thriller': 53,
        'war': 10752,
        'western': 37
      };

      const genreId = genreIdMap[genreParam.toLowerCase()];
      if (genreId) {
        const genreObj = genres.find(g => g.id === genreId);
        if (genreObj) {
          setSelectedGenre(genreObj);
          handleGenreSelect(genreObj);
        }
      }
    }
  }, [window.location.search, genres]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Add animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.3
      }
    }
  };

  // Define categories with exact TMDB API category IDs
  const categories = [
    { id: 'popular', name: 'Popular' },
    { id: 'top_rated', name: 'Top Rated' },
    { id: 'upcoming', name: 'Upcoming' },
    { id: 'now_playing', name: 'Now Playing' }
  ];

  const getImageUrl = (path) => {
    if (!path) return null;
    return `https://image.tmdb.org/t/p/w500${path}`;
  };

  const handleImageLoad = (movieId) => {
    setLoadedImages(prev => ({
      ...prev,
      [movieId]: true
    }));
  };

  const handleImageError = (movieId) => {
    setLoadedImages(prev => ({
      ...prev,
      [movieId]: 'error'
    }));
  };

  useEffect(() => {
    setPage(1);
    setMovies([]);
    setHasMore(true);
    fetchMovies(activeCategory, 1);
  }, [activeCategory, selectedGenre, selectedYear]);



  useEffect(() => {
    if (inView && hasMore && !loading && !isLoadingMore && !isLoadingNextPage) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMovies(activeCategory, nextPage);
    }
  }, [inView, hasMore, loading, isLoadingMore, isLoadingNextPage, activeCategory, selectedGenre, selectedYear]);

  const handleMovieClick = (movie) => {
    // If we have prefetched data, use it immediately
    const cachedData = prefetchCache.get(movie.id);
    if (cachedData?.details) {
      setSelectedMovie({
        ...movie,
        ...cachedData.details,
        similar: cachedData.similar?.results || []
      });
    } else {
      setSelectedMovie(movie);
    }
  };

  const handleCloseOverlay = () => {
    setSelectedMovie(null);
  };

  const handleSimilarMovieClick = (similarMovie) => {
    setSelectedMovie(similarMovie);
  };

  // Fetch genres on component mount
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await getGenres();
        setGenres(response.genres || []);
      } catch (error) {
        console.error('Error fetching genres:', error);
      }
    };
    fetchGenres();
  }, []);

  // Reset fetchInProgress on component mount
  useEffect(() => {
    fetchInProgress.current = false;
    console.log('Component mounted, reset fetchInProgress to false');
  }, []);



  // Load more movies
  const handleLoadMore = async () => {
    if (loading || page >= totalPages) return;
    
    setLoading(true);
    try {
      const nextPage = page + 1;
      let newMovies = [];
      
      if (selectedYear) {
        const response = await fetch(
          `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&page=${nextPage}&year=${selectedYear}${selectedGenre ? `&with_genres=${selectedGenre}` : ''}&sort_by=${sortBy}`
        );
        const data = await response.json();
        newMovies = data.results || [];
      } else {
        let endpoint = '';
        switch (sortBy) {
          case 'popularity':
            endpoint = 'popular';
            break;
          case 'top_rated':
            endpoint = 'top_rated';
            break;
          case 'trending':
            endpoint = 'trending/movie/day';
            break;
          default:
            endpoint = 'popular';
        }
        
        // Fix the URL structure for trending movies
        const url = sortBy === 'trending'
          ? `${TMDB_BASE_URL}/trending/movie/day?api_key=${TMDB_API_KEY}&page=${nextPage}`
          : `${TMDB_BASE_URL}/movie/${endpoint}?api_key=${TMDB_API_KEY}&page=${nextPage}`;
          
        const response = await fetch(url);
        const data = await response.json();
        newMovies = data.results || [];
        
        if (selectedGenre) {
          newMovies = newMovies.filter(movie => 
            movie.genre_ids && movie.genre_ids.includes(selectedGenre)
          );
        }
      }
      
      // Filter out duplicates
      const existingIds = new Set(movies.map(m => m.id));
      const uniqueNewMovies = newMovies.filter(movie => !existingIds.has(movie.id));
      
      if (uniqueNewMovies.length > 0) {
        setMovies(prevMovies => [...prevMovies, ...uniqueNewMovies]);
        setPage(nextPage);
      }
    } catch (error) {
      console.error('Error loading more movies:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle genre click
  const handleGenreChange = (genreId) => {
    setSelectedGenre(genreId);
    setShowGenreDropdown(false);
  };

  // Handle year click
  const handleYearChange = (year) => {
    setSelectedYear(year);
    setShowYearDropdown(false);
  };

  // Handle sort change
  const handleSortChange = (sort) => {
    setSortBy(sort);
    setPage(1);
  };

  const searchMovies = async (query, pageNum = 1) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasMoreSearchResults(false);
      return;
    }

    try {
      setIsSearching(true);
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=${pageNum}`
      );
      const data = await response.json();

      if (pageNum === 1) {
        setSearchResults(data.results);
      } else {
        const newResults = data.results.filter(newMovie => 
          !searchResults.some(existingMovie => existingMovie.id === newMovie.id)
        );
        setSearchResults(prev => [...prev, ...newResults]);
      }

      setHasMoreSearchResults(data.page < data.total_pages);
    } catch (err) {
      console.error('Error searching movies:', err);
      setError('Failed to search movies');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search function
  const debouncedSearch = debounce((query) => {
    setSearchPage(1);
    searchMovies(query, 1);
  }, 500);

  // Update the search handling
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim()) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const apiKey = import.meta.env.VITE_TMDB_API_KEY;
          const response = await fetch(
            `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=1`
          );
          const data = await response.json();
          
          if (data.results) {
            setSearchResults(data.results);
            setHasMoreSearchResults(data.page < data.total_pages);
            setSearchPage(1);
          } else {
            setSearchResults([]);
            setHasMoreSearchResults(false);
          }
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
          setHasMoreSearchResults(false);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setSearchResults([]);
      setHasMoreSearchResults(false);
      setIsSearching(false);
    }
  };

  // Update the load more search results
  const loadMoreSearchResults = async () => {
    if (!searchQuery.trim() || !hasMoreSearchResults || isSearching) return;

    try {
      setIsSearching(true);
      const nextPage = searchPage + 1;
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(searchQuery)}&page=${nextPage}`
      );
      const data = await response.json();

      if (data.results) {
        setSearchResults(prev => {
          const newResults = data.results.filter(newMovie => 
            !prev.some(existingMovie => existingMovie.id === newMovie.id)
          );
          return [...prev, ...newResults];
        });
        setHasMoreSearchResults(data.page < data.total_pages);
        setSearchPage(nextPage);
      }
    } catch (error) {
      console.error('Error loading more search results:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Update the intersection observer effect for search results
  useEffect(() => {
    if (inView && hasMoreSearchResults && !isSearching && searchQuery.trim()) {
      loadMoreSearchResults();
    }
  }, [inView, hasMoreSearchResults, isSearching, searchQuery]);

  // Generate year options (last 10 years)
  const yearOptions = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  // Get selected genre name
  const getSelectedGenreName = () => {
    if (!selectedGenre) return 'Genre';
    const genre = genres.find(g => g.id === selectedGenre);
    return genre ? genre.name : 'Genre';
  };

  // Get selected sort name
  const getSelectedSortName = () => {
    switch (sortBy) {
      case 'popularity':
        return 'Popularity';
      case 'top_rated':
        return 'Top Rated';
      case 'trending':
        return 'Trending';
      default:
        return 'Sort by';
    }
  };

  // Progressive loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadedSections(prev => ({ ...prev, header: true }));
    }, 100);

    const filtersTimer = setTimeout(() => {
      setLoadedSections(prev => ({ ...prev, filters: true }));
    }, 300);

    const moviesTimer = setTimeout(() => {
      setLoadedSections(prev => ({ ...prev, movies: true }));
    }, 500);

    return () => {
      clearTimeout(timer);
      clearTimeout(filtersTimer);
      clearTimeout(moviesTimer);
    };
  }, []);

  // Add click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setShowGenreDropdown(false);
        setShowYearDropdown(false);
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add escape key handler
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowGenreDropdown(false);
        setShowYearDropdown(false);
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Update the filterMovies function to handle both regular movies and search results
  const filterMovies = (moviesToFilter) => {
    return moviesToFilter.filter(movie => {
      const matchesGenre = !selectedGenre || 
        (movie.genre_ids && movie.genre_ids.includes(selectedGenre));
      
      const movieYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
      const matchesYear = !selectedYear || movieYear === selectedYear;
      
      return matchesGenre && matchesYear;
    });
  };

  // Get the current list of movies to display
  const getDisplayMovies = () => {
    if (searchQuery.trim() && searchResults.length > 0) {
      return searchResults;
    }
    return movies;
  };

  const handleYearSelect = async (year) => {
    setSelectedYear(year);
    setYearDropdownOpen(false);
    setLoading(true);
    try {
      let results = [];
      if (year) {
        // Fetch movies for the selected year
        const response = await discoverMovies({
          primary_release_year: year,
          with_genres: selectedGenre?.id,
          sort_by: 'popularity.desc'
        });
        // Format the results to ensure all required fields are present
        results = (response.results || []).map(movie => ({
          ...movie,
          title: movie.title || 'Untitled',
          poster_path: movie.poster_path || null,
          release_date: movie.release_date || null,
          vote_average: movie.vote_average || 0,
          genre_ids: movie.genre_ids || []
        }));
      } else {
        // If no year selected, fetch based on current category
        const response = await getMoviesByCategory(activeCategory);
        results = response.results || [];
      }
      setMovies(results);
    } catch (error) {
      console.error('Error fetching movies by year:', error);
      setError('Failed to load movies');
    } finally {
      setLoading(false);
    }
  };

  // Update the useEffect that tracks movies state changes
  useEffect(() => {
    if (movies.length > 0) {
      moviesRef.current = movies;
    }
  }, [movies]);

  // Update the loadMoreMovies function
  const loadMoreMovies = async () => {
    if (loading || !hasMore || fetchInProgress.current) {
      return;
    }
    
    fetchInProgress.current = true;
    setIsLoadingMore(true);
    
    try {
      const nextPage = currentPage + 1;
      let newMovies = [];
      if (selectedGenre) {
        const response = await getMoviesByGenre(selectedGenre.id, nextPage);
        newMovies = response.movies || [];
        
        if (newMovies.length > 0) {
          setMovies(prevMovies => {
            const updatedMovies = [...prevMovies, ...newMovies];
            return updatedMovies;
          });
          setCurrentPage(nextPage);
          setHasMore(nextPage < response.totalPages);
        } else {
          setHasMore(false);
        }
      } else {
        const response = await getMoviesByCategory(activeCategory, nextPage);
        newMovies = response.results || [];
        
        if (newMovies.length > 0) {
          setMovies(prevMovies => {
            const updatedMovies = [...prevMovies, ...newMovies];
            return updatedMovies;
          });
          setCurrentPage(nextPage);
          setHasMore(nextPage < response.total_pages);
        } else {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Error loading more movies:', error);
    } finally {
      setIsLoadingMore(false);
      fetchInProgress.current = false;
    }
  };

  // Update the intersection observer effect
  useEffect(() => {
    if (inView && hasMore && !loading && !isLoadingMore && !fetchInProgress.current) {
      loadMoreMovies();
    }
  }, [inView, hasMore, loading, isLoadingMore]);

  // Update the movies grid section to use getDisplayMovies
  const displayMovies = movies.length > 0 ? movies : moviesRef.current;

  // Update the intersection observer effect
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingNextPage && hasMore && !fetchInProgress.current) {
          if (searchQuery.trim()) {
            handleSearchChange(searchQuery);
          } else {
            fetchMovies();
          }
        }
      },
      {
        rootMargin: '800px',
        threshold: 0.6
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [searchQuery, selectedGenre, selectedYear, isLoadingNextPage, hasMore]);

  // Enhanced prefetch handling
  const handlePrefetch = useCallback((movieId) => {
    setPrefetchedMovies(prev => new Set([...prev, movieId]));
    setPrefetchStats(prev => ({
      ...prev,
      totalPrefetched: prev.totalPrefetched + 1,
      successfulPrefetches: prev.successfulPrefetches + 1
    }));
  }, []);

  // Intelligent prefetch queue processing
  const processPrefetchQueue = useCallback(async () => {
    if (isProcessingPrefetchRef.current || prefetchQueueRef.current.length === 0) {
      return;
    }

    isProcessingPrefetchRef.current = true;

    try {
      // Process up to 3 prefetch requests at a time
      const batchSize = 3;
      const batch = prefetchQueueRef.current.splice(0, batchSize);

      await Promise.allSettled(
        batch.map(async (queueItem) => {
          const { movieId } = queueItem;
          
          try {
            // Check if already in cache
            if (prefetchCache.has(movieId)) {
              setPrefetchStats(prev => ({
                ...prev,
                cacheHits: prev.cacheHits + 1
              }));
              return;
            }

            // Prefetch movie details and similar movies
            const [details, similar] = await Promise.allSettled([
              getMovieDetails(movieId, 'movie'),
              getSimilarMovies(movieId, 'movie', 1)
            ]);

            // Cache the results
            setPrefetchCache(prev => new Map(prev).set(movieId, {
              details: details.status === 'fulfilled' ? details.value : null,
              similar: similar.status === 'fulfilled' ? similar.value : null,
              timestamp: Date.now()
            }));

            handlePrefetch(movieId);
          } catch (error) {
            console.warn(`Failed to prefetch movie ${movieId}:`, error);
            setPrefetchStats(prev => ({
              ...prev,
              failedPrefetches: prev.failedPrefetches + 1
            }));
          }
        })
      );
    } finally {
      isProcessingPrefetchRef.current = false;
      
      // Process next batch if queue is not empty
      if (prefetchQueueRef.current.length > 0) {
        setTimeout(processPrefetchQueue, 100);
      }
    }
  }, [prefetchCache, handlePrefetch]);

  // Enhanced prefetch queue with priority based on visibility
  const queuePrefetchWithPriority = useCallback((movieId, priority = 'normal') => {
    if (prefetchedMovies.has(movieId) || prefetchCache.has(movieId)) {
      return;
    }

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
  }, [prefetchedMovies, prefetchCache, processPrefetchQueue]);

  // Add movie to prefetch queue (updated to use priority)
  const queuePrefetch = useCallback((movieId) => {
    // Check if movie is visible for priority
    const priority = visibleMovies.has(movieId) ? 'high' : 'normal';
    queuePrefetchWithPriority(movieId, priority);
  }, [visibleMovies, queuePrefetchWithPriority]);

  // Enhanced visibility tracking for predictive prefetching
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const newVisibleMovies = new Set(visibleMovies);
        
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
        
        setVisibleMovies(newVisibleMovies);
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
    };
  }, [movies, searchResults, queuePrefetch, visibleMovies]);

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

    return () => clearInterval(cleanupInterval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white overflow-y-scroll scrollbar-gutter-stable">
      <div className="container mx-auto px-4 py-8">
        {/* Search and Filters Section */}
        <div className="flex flex-col items-center gap-6">
          {/* Search Bar */}
          <div className="relative w-full">
            <div className="relative max-w-xl mx-auto">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search movies..."
                className="w-full px-4 py-3 bg-[#2b3036] text-white rounded-lg pl-12 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                </div>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="relative inline-flex rounded-lg bg-[#1a1a1a] p-1 overflow-x-auto max-w-full">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 whitespace-nowrap focus:outline-none ${
                  activeCategory === category.id
                    ? 'text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="relative z-10">{category.name}</span>
                {activeCategory === category.id && (
                  <motion.div
                    layoutId="activeCategoryBackground"
                    className="absolute inset-0 bg-white rounded-lg"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-4 justify-center w-full">
            {/* Year Filter */}
            <div className="relative" ref={yearDropdownRef}>
              <button
                onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                {selectedYear || 'Year'}
                <svg
                  className={`w-4 h-4 transition-transform ${yearDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {yearDropdownOpen && (
                <div className="absolute z-10 mt-2 w-48 bg-[#1a1a1a] rounded-lg shadow-lg py-1">
                  <button
                    onClick={() => handleYearSelect(null)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:text-white hover:bg-[#2b3036]"
                  >
                    All Years
                  </button>
                  {yearOptions.map(year => (
                    <button
                      key={year}
                      onClick={() => handleYearSelect(year)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:text-white hover:bg-[#2b3036]"
                    >
                      {year}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Genre Filter */}
            <div className="relative" ref={genreDropdownRef}>
              <button
                onClick={() => setGenreDropdownOpen(!genreDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                {selectedGenre?.name || 'Genre'}
                <svg
                  className={`w-4 h-4 transition-transform ${genreDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {genreDropdownOpen && (
                <div className="absolute z-10 mt-2 w-48 bg-[#1a1a1a] rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto">
                  <button
                    onClick={() => handleGenreSelect(null)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:text-white hover:bg-[#2b3036]"
                  >
                    All Genres
                  </button>
                  {genres.map(genre => (
                    <button
                      key={genre.id}
                      onClick={() => handleGenreSelect(genre)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:text-white hover:bg-[#2b3036]"
                    >
                      {genre.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Movies grid */}
        <div className="w-full mt-8">
          {console.log('Render debug - loading:', loading, 'movies.length:', movies.length, 'error:', error, 'isLoadingMore:', isLoadingMore)}
          {error ? (
            <div className="text-center text-red-500 py-8">{error}</div>
          ) : loading && !isLoadingMore ? (
            <motion.div 
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={loadingVariants}
              className="flex justify-center items-center py-8"
            >
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={searchQuery.trim() ? 'search' : 'movies'}
                variants={gridVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4"
              >
                {console.log('Rendering movies:', (searchQuery.trim() ? searchResults : movies).length, 'movies')}
                {(searchQuery.trim() ? searchResults : movies).map((movie, index) => {
                  console.log('Rendering movie:', movie.title, 'at index:', index);
                  return (
                    <MovieCard
                      key={`${movie.id}-${index}`}
                      movie={movie}
                      index={index}
                      onClick={handleMovieClick}
                      onPrefetch={queuePrefetch}
                    />
                  );
                })}
                {/* Show loading placeholders for next page */}
                {isLoadingNextPage && (
                  <AnimatePresence>
                    {nextPageMovies.map((_, index) => (
                      <motion.div
                        key={`loading-${index}`}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800"
                      >
                        <motion.div 
                          className="w-full h-full bg-gray-800"
                          animate={{
                            opacity: [0.5, 0.8, 0.5],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </motion.div>
            </AnimatePresence>
          )}
          
          {/* Load more trigger */}
          {hasMore && (
            <motion.div 
              ref={loadMoreRef} 
              initial={{ opacity: 0 }}
              animate={{ opacity: isLoadingNextPage ? 0.5 : 1 }}
              transition={{ duration: 0.3 }}
              className="h-20 flex items-center justify-center"
              style={{ minHeight: '100px' }}
            >
              {isLoadingNextPage && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"
                />
              )}
            </motion.div>
          )}
        </div>

        {/* Prefetch Performance Monitor (Development Only) */}
        {import.meta.env.DEV && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs z-50 max-w-xs"
          >
            <div className="font-semibold mb-2">Prefetch Stats</div>
            <div className="space-y-1">
              <div>Total: {prefetchStats.totalPrefetched}</div>
              <div>Success: {prefetchStats.successfulPrefetches}</div>
              <div>Failed: {prefetchStats.failedPrefetches}</div>
              <div>Cache Hits: {prefetchStats.cacheHits}</div>
              <div>Queue: {prefetchQueueRef.current.length}</div>
              <div>Visible: {visibleMovies.size}</div>
            </div>
          </motion.div>
        )}

        {/* Movie Details Overlay */}
        <AnimatePresence>
          {selectedMovie && (
            <MovieDetailsOverlay
              movie={selectedMovie}
              onClose={handleCloseOverlay}
              onMovieSelect={handleSimilarMovieClick}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4a4a4a;
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #5a5a5a;
        }
        ${styles}
      `}</style>
    </div>
  );
};

export default MoviesPage;