import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getPopularTVShows, 
  getTopRatedTVShows, 
  getAiringTodayTVShows,
  getTVSeriesByNetwork,
  getMovieDetails,
  getGenres,
  searchMovies
} from '../services/tmdbService';
import { useInView } from 'react-intersection-observer';
const MovieDetailsOverlay = lazy(() => import('./MovieDetailsOverlay'));
const EnhancedSimilarContent = lazy(() => import('./EnhancedSimilarContent'));
import { motion, AnimatePresence } from 'framer-motion';
import { debounce } from 'lodash';
import { useWatchlist } from '../contexts/WatchlistContext';
const EnhancedSearchBar = lazy(() => import('./EnhancedSearchBar'));
import searchHistoryService from '../services/searchHistoryService';

// Animation variants for smooth transitions
const gridVariants = {
  hidden: { 
    opacity: 0,
    y: 10
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
      staggerChildren: 0.02,
      delayChildren: 0.05
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
      damping: 30,
      mass: 0.8
    }
  }
};

const SeriesCard = ({ series, onSeriesClick }) => {
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const [loadedImages, setLoadedImages] = useState({});
  
  // Validate the series object
  if (!series || typeof series !== 'object') {
    console.warn('Invalid series object passed to SeriesCard:', series);
    return null;
  }
  
  const isBookmarked = watchlist.some(item => item.id === series.id);

  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    if (isBookmarked) {
      removeFromWatchlist(series.id);
    } else {
      addToWatchlist({ ...series, title: series.name || series.title, type: 'tv' });
    }
  };

  const handleImageLoad = (id) => {
    setLoadedImages(prev => ({ ...prev, [id]: true }));
  };

  const getImageUrl = (path) => {
    if (!path) return `https://via.placeholder.com/500x750.png/1a1d24/ffffff?text=${encodeURIComponent(series.name || series.title || 'Unknown')}`;
    return `https://image.tmdb.org/t/p/w500${path}`;
  };

  const seriesName = series.name || series.title || 'Unknown Title';
  const seriesYear = series.first_air_date ? new Date(series.first_air_date).getFullYear() : 
                    series.release_date ? new Date(series.release_date).getFullYear() : null;
  const seriesRating = series.vote_average || series.rating || 0;

  return (
    <motion.div
      className="group cursor-pointer transform transition-all duration-300 hover:scale-105"
      onClick={() => onSeriesClick(series)}
    >
      <div className="group aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 relative">
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

        {series.poster_path ? (
          <>
            <img
              src={getImageUrl(series.poster_path)}
              alt={seriesName}
              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 ${
                loadedImages[series.id] ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => handleImageLoad(series.id)}
            />
            {!loadedImages[series.id] && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/20 border-t-white/60"></div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <span className="text-white/60 text-center p-2">{seriesName}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
          <div className="text-white">
            <h4 className="font-medium text-sm truncate">{seriesName}</h4>
            <p className="text-xs text-gray-300 flex items-center gap-1">
              {seriesYear} •
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-400 mr-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
                {seriesRating?.toFixed(1)}
              </span>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const SeriesPage = () => {
  const navigate = useNavigate();
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [activeCategory, setActiveCategory] = useState('popular');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadedImages, setLoadedImages] = useState({});
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [genres, setGenres] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(true);
  const [loadedSections, setLoadedSections] = useState({
    popular: false,
    topRated: false,
    airingToday: false
  });
  const observerRef = useRef(null);
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [searchHistoryItems, setSearchHistoryItems] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();

  const categories = [
    { id: 'popular', label: 'Popular', networkId: null },
    { id: 'netflix', label: 'Netflix', networkId: 213 },
    { id: 'prime', label: 'Prime Video', networkId: 1024 },
    { id: 'hbo', label: 'HBO', networkId: 49 },
    { id: 'hulu', label: 'Hulu', networkId: 453 },
    { id: 'disney', label: 'Disney+', networkId: 2739 },
    { id: 'apple', label: 'Apple TV+', networkId: 2552 }
  ];

  const yearOptions = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchGenres();
    fetchInitialSeries();
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Load search history and trending searches
  useEffect(() => {
    const loadSearchData = () => {
      const history = searchHistoryService.getHistoryByType('tv');
      const trending = searchHistoryService.getTrendingSearches(5);
      
      setSearchHistoryItems(history.map(item => item.query));
      setTrendingSearches(trending);
    };

    loadSearchData();
    
    // Subscribe to history changes
    const unsubscribe = searchHistoryService.subscribe(() => {
      loadSearchData();
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (inView && hasMore && !loading && !isLoadingMore) {
      loadMoreSeries();
    }
  }, [inView, hasMore, loading, isLoadingMore]);

  const fetchGenres = async () => {
    try {
      const response = await getGenres();
      setGenres(response.genres || []);
    } catch (err) {
      console.error('Error fetching genres:', err);
    }
  };

  const fetchInitialSeries = async () => {
    try {
      setLoading(true);
      const networkId = categories.find(c => c.id === activeCategory)?.networkId;
      
      let response;
      if (networkId) {
        // Fetch series by network/streaming service
        response = await getTVSeriesByNetwork(networkId, 1);
      } else {
        // Fetch popular TV shows
        response = await getPopularTVShows(1);
      }
      
      // Handle different response formats
      let seriesData = [];
      let totalPages = 1;
      let currentPage = 1;
      
      if (response) {
        // getPopularTVShows returns { movies: [...], totalPages: ..., currentPage: ... }
        if (response.movies && Array.isArray(response.movies)) {
          seriesData = response.movies;
          totalPages = response.totalPages || 1;
          currentPage = response.currentPage || 1;
        }
        // getTVSeriesByNetwork returns { results: [...], page: ..., totalPages: ... }
        else if (response.results && Array.isArray(response.results)) {
          seriesData = response.results;
          totalPages = response.totalPages || 1;
          currentPage = response.page || 1;
        }
        // Fallback for other formats
        else if (Array.isArray(response)) {
          seriesData = response;
        }
      }
      
      if (seriesData.length > 0) {
        const transformedSeries = seriesData.map(series => {
          // Check if data is already transformed (from getPopularTVShows)
          const isAlreadyTransformed = series.title && series.poster && !series.name;
          
          if (isAlreadyTransformed) {
            // Data is already transformed, just ensure it has the required properties
            return {
              ...series,
              type: 'tv',
              name: series.title, // Map title back to name for consistency
              poster_path: series.poster, // Map poster back to poster_path
              backdrop_path: series.backdrop, // Map backdrop back to backdrop_path
              first_air_date: series.year ? `${series.year}-01-01` : null,
              vote_average: parseFloat(series.rating) || 0,
              number_of_seasons: series.seasons || 0,
              overview: series.overview || '',
              genre_ids: series.genre_ids || [],
              networks: series.networks || []
            };
          } else {
            // Raw data from getTVSeriesByNetwork, apply standard transformation
            return {
              ...series,
              type: 'tv',
              title: series.name || series.title,
              year: series.first_air_date ? series.first_air_date.split('-')[0] : 'N/A',
              rating: series.vote_average,
              duration: `${series.number_of_seasons || 0} Season${(series.number_of_seasons || 0) !== 1 ? 's' : ''}`,
              backdrop: series.backdrop_path,
              image: series.poster_path,
              overview: series.overview,
              genres: series.genre_ids,
              networks: series.networks
            };
          }
        });

        setSeries(transformedSeries);
        setHasMore(currentPage < totalPages);
        setPage(currentPage);
      } else {
        console.error('No series data found in response:', response);
        setError('No series available');
      }
    } catch (err) {
      console.error('Error fetching series:', err);
      setError('Failed to load series');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreSeries = async () => {
    if (loading || isLoadingMore) return;
    try {
      setIsLoadingMore(true);
      const nextPage = page + 1;
      const networkId = categories.find(c => c.id === activeCategory)?.networkId;
      
      let response;
      if (networkId) {
        // Fetch more series by network/streaming service
        response = await getTVSeriesByNetwork(networkId, nextPage);
      } else {
        // Fetch more popular TV shows
        response = await getPopularTVShows(nextPage);
      }
      
      // Handle different response formats
      let seriesData = [];
      let totalPages = 1;
      let currentPage = nextPage;
      
      if (response) {
        // getPopularTVShows returns { movies: [...], totalPages: ..., currentPage: ... }
        if (response.movies && Array.isArray(response.movies)) {
          seriesData = response.movies;
          totalPages = response.totalPages || 1;
          currentPage = response.currentPage || nextPage;
        }
        // getTVSeriesByNetwork returns { results: [...], page: ..., totalPages: ... }
        else if (response.results && Array.isArray(response.results)) {
          seriesData = response.results;
          totalPages = response.totalPages || 1;
          currentPage = response.page || nextPage;
        }
        // Fallback for other formats
        else if (Array.isArray(response)) {
          seriesData = response;
        }
      }
      
      if (seriesData.length > 0) {
        const transformedSeries = seriesData.map(series => {
          // Check if data is already transformed (from getPopularTVShows)
          const isAlreadyTransformed = series.title && series.poster && !series.name;
          
          if (isAlreadyTransformed) {
            // Data is already transformed, just ensure it has the required properties
            return {
              ...series,
              type: 'tv',
              name: series.title, // Map title back to name for consistency
              poster_path: series.poster, // Map poster back to poster_path
              backdrop_path: series.backdrop, // Map backdrop back to backdrop_path
              first_air_date: series.year ? `${series.year}-01-01` : null,
              vote_average: parseFloat(series.rating) || 0,
              number_of_seasons: series.seasons || 0,
              overview: series.overview || '',
              genre_ids: series.genre_ids || [],
              networks: series.networks || []
            };
          } else {
            // Raw data from getTVSeriesByNetwork, apply standard transformation
            return {
              ...series,
              type: 'tv',
              title: series.name || series.title,
              year: series.first_air_date ? series.first_air_date.split('-')[0] : 'N/A',
              rating: series.vote_average,
              duration: `${series.number_of_seasons || 0} Season${(series.number_of_seasons || 0) !== 1 ? 's' : ''}`,
              backdrop: series.backdrop_path,
              image: series.poster_path,
              overview: series.overview,
              genres: series.genre_ids,
              networks: series.networks
            };
          }
        });

        setSeries(prev => {
          // Create a Set of existing series IDs for efficient lookup
          const existingIds = new Set(prev.map(series => series.id));
          
          // Filter out duplicates from new series
          const uniqueNewSeries = transformedSeries.filter(series => !existingIds.has(series.id));
          
          // Return combined list with only unique entries
          return [...prev, ...uniqueNewSeries];
        });
        setHasMore(currentPage < totalPages);
        setPage(currentPage);
      } else {
        console.error('No series data found in response:', response);
        setError('No more series available');
      }
    } catch (err) {
      console.error('Error loading more series:', err);
      setError('Failed to load more series');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleCategoryClick = async (category) => {
    // Prevent multiple rapid clicks
    if (activeCategory === category || isTransitioning) return;
    
    // Set transition state for smooth animations
    setIsTransitioning(true);
    
    // Reset all states when changing category
    setActiveCategory(category);
    setSeries([]);
    setLoading(true);
    setError(null);
    setPage(1);
    setHasMore(true);

    try {
      let response;
      if (category === 'netflix') {
        response = await getTVSeriesByNetwork(213);
      } else if (category === 'prime') {
        response = await getTVSeriesByNetwork(1024);
      } else if (category === 'hbo') {
        response = await getTVSeriesByNetwork(49);
      } else if (category === 'hulu') {
        response = await getTVSeriesByNetwork(453);
      } else if (category === 'disney') {
        response = await getTVSeriesByNetwork(2739);
      } else if (category === 'apple') {
        response = await getTVSeriesByNetwork(2552);
      } else {
        response = await getPopularTVShows(1);
      }

      // Handle different response formats
      let seriesData = [];
      let totalPages = 1;
      let currentPage = 1;
      
      if (response) {
        // getPopularTVShows returns { movies: [...], totalPages: ..., currentPage: ... }
        if (response.movies && Array.isArray(response.movies)) {
          seriesData = response.movies;
          totalPages = response.totalPages || 1;
          currentPage = response.currentPage || 1;
        }
        // getTVSeriesByNetwork returns { results: [...], page: ..., totalPages: ... }
        else if (response.results && Array.isArray(response.results)) {
          seriesData = response.results;
          totalPages = response.totalPages || 1;
          currentPage = response.page || 1;
        }
        // Fallback for other formats
        else if (Array.isArray(response)) {
          seriesData = response;
        }
      }

      if (seriesData.length > 0) {
        const transformedSeries = seriesData.map(series => {
          // Check if data is already transformed (from getPopularTVShows)
          const isAlreadyTransformed = series.title && series.poster && !series.name;
          
          if (isAlreadyTransformed) {
            // Data is already transformed, just ensure it has the required properties
            return {
              ...series,
              type: 'tv',
              name: series.title, // Map title back to name for consistency
              poster_path: series.poster, // Map poster back to poster_path
              backdrop_path: series.backdrop, // Map backdrop back to backdrop_path
              first_air_date: series.year ? `${series.year}-01-01` : null,
              vote_average: parseFloat(series.rating) || 0,
              number_of_seasons: series.seasons || 0,
              overview: series.overview || '',
              genre_ids: series.genre_ids || [],
              networks: series.networks || []
            };
          } else {
            // Raw data from getTVSeriesByNetwork, apply standard transformation
            return {
              ...series,
              type: 'tv',
              title: series.name || series.title,
              year: series.first_air_date ? series.first_air_date.split('-')[0] : 'N/A',
              rating: series.vote_average,
              duration: `${series.number_of_seasons || 0} Season${(series.number_of_seasons || 0) !== 1 ? 's' : ''}`,
              backdrop: series.backdrop_path,
              image: series.poster_path,
              overview: series.overview,
              genres: series.genre_ids,
              networks: series.networks
            };
          }
        });

        setSeries(transformedSeries);
        setHasMore(currentPage < totalPages);
      } else {
        setSeries([]); // Only clear if no results
        setError('No series found');
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error fetching series:', err);
      setSeries([]); // Only clear on error
      setError('Failed to load series');
      setHasMore(false);
    } finally {
      setLoading(false);
      // Clear transition state after animation completes
      setTimeout(() => {
        setIsTransitioning(false);
      }, 400);
    }
  };

  const handleSeriesClick = async (series) => {
    try {
      const seriesDetails = await getMovieDetails(series.id, 'tv');

      // Transform the series data to match the expected format
      const transformedSeries = {
        ...seriesDetails,
        type: 'tv',
        title: seriesDetails.name,
        release_date: seriesDetails.first_air_date,
        runtime: seriesDetails.episode_run_time?.[0] || null,
        networks: seriesDetails.networks?.map(network => network.name).join(', ') || 'N/A',
        number_of_seasons: seriesDetails.number_of_seasons,
        number_of_episodes: seriesDetails.number_of_episodes,
        status: seriesDetails.status,
        similar: seriesDetails.similar?.results || [],
        videos: seriesDetails.videos?.results || [],
        credits: {
          cast: seriesDetails.credits?.cast || [],
          crew: seriesDetails.credits?.crew || []
        }
      };

      setSelectedSeries(transformedSeries);
    } catch (err) {
      console.error('Error fetching series details:', err);
      setError('Failed to load series details');
    }
  };

  const handleCloseOverlay = () => {
    setSelectedSeries(null);
  };

  const handleSimilarSeriesClick = async (similarSeries) => {
    try {
      const seriesDetails = await getMovieDetails(similarSeries.id, 'tv');

      // Transform the series data to match the expected format
      const transformedSeries = {
        ...seriesDetails,
        type: 'tv',
        title: seriesDetails.name,
        release_date: seriesDetails.first_air_date,
        runtime: seriesDetails.episode_run_time?.[0] || null,
        networks: seriesDetails.networks?.map(network => network.name).join(', ') || 'N/A',
        number_of_seasons: seriesDetails.number_of_seasons,
        number_of_episodes: seriesDetails.number_of_episodes,
        status: seriesDetails.status,
        similar: seriesDetails.similar?.results || [],
        videos: seriesDetails.videos?.results || [],
        credits: {
          cast: seriesDetails.credits?.cast || [],
          crew: seriesDetails.credits?.crew || []
        }
      };

      setSelectedSeries(transformedSeries);
    } catch (err) {
      console.error('Error fetching similar series details:', err);
      setError('Failed to load series details');
    }
  };

  const handleImageLoad = (id) => {
    setLoadedImages(prev => ({ ...prev, [id]: true }));
  };

  const handleImageError = (id) => {
    setLoadedImages(prev => ({ ...prev, [id]: true }));
  };

  const getImageUrl = (path) => {
    return path
      ? `https://image.tmdb.org/t/p/w500${path}`
      : 'https://via.placeholder.com/500x750?text=No+Image';
  };

  const searchSeries = async (query, pageNum = 1) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasMoreSearchResults(false);
      return;
    }

    try {
      setIsSearching(true);
      const data = await searchMovies(query, pageNum, { mediaType: 'tv' });

      // Validate and transform search results to ensure they have the correct structure
      const validatedResults = (data.results || []).map(result => {
        // Ensure the result is a valid object with required properties
        if (!result || typeof result !== 'object') {
          console.warn('Invalid search result:', result);
          return null;
        }

        // Transform the result to ensure it has the expected structure
        const transformedResult = {
          id: result.id || result.movie_id || result.tv_id,
          name: result.name || result.title || 'Unknown Title',
          title: result.title || result.name || 'Unknown Title',
          poster_path: result.poster_path || result.poster || '',
          backdrop_path: result.backdrop_path || result.backdrop || '',
          overview: result.overview || result.description || '',
          first_air_date: result.first_air_date || result.release_date || '',
          release_date: result.release_date || result.first_air_date || '',
          vote_average: result.vote_average || result.rating || 0,
          vote_count: result.vote_count || 0,
          popularity: result.popularity || 0,
          genre_ids: result.genre_ids || result.genres || [],
          media_type: result.media_type || 'tv',
          original_language: result.original_language || 'en',
          original_name: result.original_name || result.original_title || '',
          original_title: result.original_title || result.original_name || '',
          adult: result.adult || false,
          video: result.video || false,
          known_for_department: result.known_for_department || '',
          profile_path: result.profile_path || '',
          known_for: result.known_for || []
        };

        // Additional validation to ensure we have at least an id and name/title
        if (!transformedResult.id || (!transformedResult.name && !transformedResult.title)) {
          console.warn('Invalid transformed result - missing required fields:', transformedResult);
          return null;
        }

        return transformedResult;
      }).filter(Boolean); // Remove any null results

      if (pageNum === 1) {
        setSearchResults(validatedResults);
      } else {
        // Use Set for efficient deduplication (O(n) instead of O(n²))
        const existingIds = new Set(searchResults.map(series => series.id));
        const uniqueNewResults = validatedResults.filter(newSeries => !existingIds.has(newSeries.id));
        setSearchResults(prev => [...prev, ...uniqueNewResults]);
      }

      setHasMoreSearchResults(data.page < data.total_pages);
    } catch (err) {
      console.error('Error searching series:', err);
      setError('Failed to search series');
    } finally {
      setIsSearching(false);
    }
  };

  const debouncedSearch = debounce((query) => {
    setSearchPage(1);
    searchSeries(query, 1);
  }, 500);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  useEffect(() => {
    if (inView && hasMoreSearchResults && !isSearching && searchQuery) {
      const nextPage = searchPage + 1;
      setSearchPage(nextPage);
      searchSeries(searchQuery, nextPage);
    }
  }, [inView, hasMoreSearchResults, isSearching, searchQuery]);

  const filterSeries = (seriesToFilter) => {
    return seriesToFilter.filter(series => {
      // Ensure we're working with a valid series object
      if (!series || typeof series !== 'object') {
        console.warn('Invalid series object in filter:', series);
        return false;
      }

      const matchesGenre = !selectedGenre || 
        (series.genre_ids && Array.isArray(series.genre_ids) && series.genre_ids.includes(selectedGenre));
      
      const seriesYear = series.first_air_date ? new Date(series.first_air_date).getFullYear() : 
                        series.release_date ? new Date(series.release_date).getFullYear() : null;
      const matchesYear = !selectedYear || seriesYear === selectedYear;
      
      return matchesGenre && matchesYear;
    });
  };

  const getDisplaySeries = () => {
    const seriesToFilter = searchQuery ? searchResults : series;
    
    // Ensure we have valid arrays to work with
    if (!Array.isArray(seriesToFilter)) {
      console.warn('Invalid series data:', seriesToFilter);
      return [];
    }
    
    return filterSeries(seriesToFilter);
  };

  // Update the initial category
  useEffect(() => {
    setActiveCategory('popular');
  }, []);

  // Add click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showGenreDropdown && !event.target.closest('.genre-dropdown')) {
        setShowGenreDropdown(false);
      }
      if (showYearDropdown && !event.target.closest('.year-dropdown')) {
        setShowYearDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showGenreDropdown, showYearDropdown]);

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <div className="w-full px-4 py-8">
        {/* Enhanced Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-xl mx-auto">
            <Suspense fallback={
              <div className="w-full h-12 bg-gray-800 rounded-lg animate-pulse"></div>
            }>
              <EnhancedSearchBar
                placeholder="Search TV series..."
                initialValue={searchQuery}
                onSearch={(query) => {
                  setSearchQuery(query);
                  searchSeries(query, 1);
                }}
                onSearchSubmit={(query) => {
                  // Only add to history when search is actually submitted
                  searchHistoryService.addToHistory(query, 'tv');
                }}
                onClear={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setHasMoreSearchResults(false);
                }}
                isLoading={isSearching}
                theme="dark"
                variant="floating"
                size="md"
                showSuggestions={true}
                suggestions={searchResults.slice(0, 5).map(series => {
                  // Ensure we're working with a valid series object
                  if (!series || typeof series !== 'object') {
                    return null;
                  }
                  
                  return {
                    title: series.name || series.title || 'Unknown Title',
                    name: series.name || series.title || 'Unknown Title',
                    id: series.id || series.movie_id || series.tv_id,
                    poster_path: series.poster_path || series.poster || '',
                    year: series.first_air_date ? new Date(series.first_air_date).getFullYear() : 
                           series.release_date ? new Date(series.release_date).getFullYear() : null
                  };
                }).filter(Boolean)} // Remove any null suggestions
                onSuggestionSelect={(suggestion) => {
                  const series = searchResults.find(s => s.id === suggestion.id);
                  if (series) {
                    handleSeriesClick(series);
                  }
                }}
                searchHistory={searchHistoryItems}
                showHistory={true}
                onHistorySelect={(historyItem) => {
                  setSearchQuery(historyItem);
                  searchSeries(historyItem, 1);
                  searchHistoryService.incrementSearchCount(historyItem);
                }}
                clearHistory={() => searchHistoryService.clearHistoryByType('tv')}
                showTrendingSearches={true}
                trendingSearches={trendingSearches}
                onTrendingSelect={(trending) => {
                  setSearchQuery(trending);
                  searchSeries(trending, 1);
                  searchHistoryService.addToHistory(trending, 'tv');
                }}
              />
            </Suspense>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 mb-8">
          {!searchQuery && (
            <div className="relative inline-flex rounded-lg bg-[#1a1a1a] p-1 overflow-x-auto max-w-full">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 whitespace-nowrap focus:outline-none ${
                    activeCategory === category.id
                      ? 'text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="relative z-10">{category.label}</span>
                  {activeCategory === category.id && (
                    <motion.div
                      layoutId="activeSeriesCategoryBackground"
                      className="absolute inset-0 bg-white rounded-lg"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-4">
            {/* Genre Dropdown */}
            <div className="relative genre-dropdown">
              <button
                onClick={() => setShowGenreDropdown(!showGenreDropdown)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  selectedGenre 
                    ? 'bg-white text-black shadow-lg' 
                    : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                }`}
              >
                {selectedGenre ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-black rounded-full"></span>
                    {genres.find(g => g.id === selectedGenre)?.name}
                  </span>
                ) : (
                  'Genre'
                )}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showGenreDropdown && (
                <div className="absolute z-10 mt-2 w-48 rounded-lg bg-[#1a1a1a] shadow-lg max-h-[60vh] overflow-y-auto">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setSelectedGenre(null);
                        setShowGenreDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:bg-[#2b3036] hover:text-white sticky top-0 bg-[#1a1a1a]"
                    >
                      All Genres
                    </button>
                    {genres.map(genre => (
                      <button
                        key={genre.id}
                        onClick={() => {
                          setSelectedGenre(genre.id);
                          setShowGenreDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-[#2b3036] ${
                          selectedGenre === genre.id ? 'text-white bg-[#2b3036]' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {genre.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Year Dropdown */}
            <div className="relative year-dropdown">
              <button
                onClick={() => setShowYearDropdown(!showYearDropdown)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  selectedYear 
                    ? 'bg-white text-black shadow-lg' 
                    : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                }`}
              >
                {selectedYear ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-black rounded-full"></span>
                    {selectedYear}
                  </span>
                ) : (
                  'Year'
                )}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showYearDropdown && (
                <div className="absolute z-10 mt-2 w-48 rounded-lg bg-[#1a1a1a] shadow-lg max-h-[60vh] overflow-y-auto">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setSelectedYear(null);
                        setShowYearDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:bg-[#2b3036] hover:text-white sticky top-0 bg-[#1a1a1a]"
                    >
                      All Years
                    </button>
                    {yearOptions.map(year => (
                      <button
                        key={year}
                        onClick={() => {
                          setSelectedYear(year);
                          setShowYearDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-[#2b3036] ${
                          selectedYear === year ? 'text-white bg-[#2b3036]' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(selectedYear || selectedGenre) && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center items-center gap-2 mt-4"
          >
            <span className="text-sm text-gray-400">Showing:</span>
            <div className="flex gap-2">
              {selectedGenre && (
                <span className="px-3 py-1 bg-white text-black text-sm rounded-full font-medium">
                  {genres.find(g => g.id === selectedGenre)?.name}
                </span>
              )}
              {selectedYear && (
                <span className="px-3 py-1 bg-white text-black text-sm rounded-full font-medium">
                  {selectedYear}
                </span>
              )}
              <button
                onClick={() => {
                  setSelectedYear(null);
                  setSelectedGenre(null);
                  
                  // Clear URL parameters
                  const searchParams = new URLSearchParams(window.location.search);
                  searchParams.delete('genre');
                  searchParams.delete('year');
                  navigate(`?${searchParams.toString()}`, { replace: true });
                }}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded-full hover:bg-gray-500 transition-colors"
              >
                Clear All
              </button>
            </div>
          </motion.div>
        )}

        {error ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center text-red-500 py-8"
          >
            {error}
          </motion.div>
        ) : (
          <motion.div 
            className="mt-8"
            key={activeCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.3,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
          >
            {loading && series.length === 0 && !searchQuery ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex justify-center py-8"
              >
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </motion.div>
            ) : (
              <motion.div
                key={`${activeCategory}-${searchQuery.trim() ? 'search' : 'series'}`}
                variants={gridVariants}
                initial="hidden"
                animate="visible"
                transition={{
                  duration: 0.4,
                  ease: [0.25, 0.46, 0.45, 0.94],
                  staggerChildren: 0.02,
                  delayChildren: 0.05
                }}
                className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10 gap-6"
              >
                {getDisplaySeries().map((s, index) => {
                  // Ensure we have a valid series object
                  if (!s || typeof s !== 'object') {
                    console.warn('Invalid series object in render:', s);
                    return null;
                  }
                  
                  return (
                    <motion.div
                      key={`${s.id || index}-${index}`}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <SeriesCard series={s} onSeriesClick={handleSeriesClick} />
                    </motion.div>
                  );
                }).filter(Boolean)}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Show loading spinner only when loading more content (not initial load) */}
        {isLoadingMore && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex justify-center py-8"
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </motion.div>
        )}

        {/* Show loading spinner for search */}
        {isSearching && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex justify-center py-8"
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </motion.div>
        )}

        {!loading && !isSearching && ((searchQuery && hasMoreSearchResults) || (!searchQuery && hasMore)) && (
          <div ref={loadMoreRef} className="h-10" />
        )}

        {selectedSeries && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-7xl max-h-[90vh] bg-[#141414] rounded-xl overflow-hidden">
              <Suspense fallback={null}>
                <MovieDetailsOverlay
                  movie={selectedSeries}
                  onClose={handleCloseOverlay}
                  onMovieSelect={handleSimilarSeriesClick}
                />
              </Suspense>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeriesPage; 