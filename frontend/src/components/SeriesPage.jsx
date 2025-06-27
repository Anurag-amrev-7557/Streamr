import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as tmdbService from '../services/tmdbService';
import { useInView } from 'react-intersection-observer';
import MovieDetailsOverlay from './MovieDetailsOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import { debounce } from 'lodash';
import { useWatchlist } from '../contexts/WatchlistContext';

const SeriesCard = ({ series, onSeriesClick }) => {
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const [loadedImages, setLoadedImages] = useState({});
  const isBookmarked = watchlist.some(item => item.id === series.id);

  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    if (isBookmarked) {
      removeFromWatchlist(series.id);
    } else {
      addToWatchlist({ ...series, title: series.name, type: 'tv' });
    }
  };

  const handleImageLoad = (id) => {
    setLoadedImages(prev => ({ ...prev, [id]: true }));
  };

  const getImageUrl = (path) => {
    if (!path) return `https://via.placeholder.com/500x750.png/1a1d24/ffffff?text=${encodeURIComponent(series.name)}`;
    return `https://image.tmdb.org/t/p/w500${path}`;
  };

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
              alt={series.name || series.title}
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
            <span className="text-white/60 text-center p-2">{series.name || series.title}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
          <div className="text-white">
            <h4 className="font-medium text-sm truncate">{series.name || series.title}</h4>
            <p className="text-xs text-gray-300 flex items-center gap-1">
              {series.first_air_date?.split('-')[0] || series.release_date?.split('-')[0]} •
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-400 mr-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
                {series.vote_average?.toFixed(1)}
              </span>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const SeriesPage = () => {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadMoreSeries();
    }
  }, [inView, hasMore, loading]);

  const fetchGenres = async () => {
    try {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      const response = await fetch(
        `https://api.themoviedb.org/3/genre/tv/list?api_key=${apiKey}`
      );
      const data = await response.json();
      setGenres(data.genres);
    } catch (err) {
      console.error('Error fetching genres:', err);
    }
  };

  const fetchInitialSeries = async () => {
    try {
      setLoading(true);
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      const networkId = categories.find(c => c.id === activeCategory)?.networkId;
      
      let url;
      if (networkId) {
        // Fetch series by network/streaming service
        url = `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&page=1&with_networks=${networkId}&sort_by=popularity.desc&include_adult=false&language=en-US`;
      } else {
        // Fetch popular TV shows
        url = `https://api.themoviedb.org/3/tv/popular?api_key=${apiKey}&page=1&language=en-US`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.results && Array.isArray(data.results)) {
        setSeries(data.results);
        setHasMore(data.page < data.total_pages);
        setPage(1);
      } else {
        console.error('Invalid API response format:', data);
        setError('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error fetching series:', err);
      setError('Failed to load series');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreSeries = async () => {
    if (loading) return;
    try {
      setLoading(true);
      const nextPage = page + 1;
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      const networkId = categories.find(c => c.id === activeCategory)?.networkId;
      
      let url;
      if (networkId) {
        // Fetch more series by network/streaming service
        url = `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&page=${nextPage}&with_networks=${networkId}&sort_by=popularity.desc&include_adult=false&language=en-US`;
      } else {
        // Fetch more popular TV shows
        url = `https://api.themoviedb.org/3/tv/popular?api_key=${apiKey}&page=${nextPage}&language=en-US`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.results && Array.isArray(data.results)) {
        setSeries(prev => [...prev, ...data.results]);
        setHasMore(data.page < data.total_pages);
        setPage(nextPage);
      } else {
        console.error('Invalid API response format:', data);
        setError('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error loading more series:', err);
      setError('Failed to load more series');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = async (category) => {
    setActiveCategory(category);
    setSeries([]);
    setLoading(true);
    setError(null);
    setPage(1);
    setHasMore(true);

    try {
      let response;
      if (category === 'netflix') {
        response = await tmdbService.getTVSeriesByNetwork(213);
      } else if (category === 'prime') {
        response = await tmdbService.getTVSeriesByNetwork(1024);
      } else if (category === 'hbo') {
        response = await tmdbService.getTVSeriesByNetwork(49);
      } else if (category === 'hulu') {
        response = await tmdbService.getTVSeriesByNetwork(453);
      } else if (category === 'disney') {
        response = await tmdbService.getTVSeriesByNetwork(2739);
      } else if (category === 'apple') {
        response = await tmdbService.getTVSeriesByNetwork(2552);
      } else {
        response = await tmdbService.getPopularTV();
      }

      if (response && response.results) {
        const transformedSeries = response.results.map(series => ({
          ...series,
          type: 'tv',
          title: series.name,
          year: series.first_air_date ? series.first_air_date.split('-')[0] : 'N/A',
          rating: series.vote_average,
          duration: `${series.number_of_seasons} Season${series.number_of_seasons !== 1 ? 's' : ''}`,
          backdrop: series.backdrop_path,
          image: series.poster_path,
          overview: series.overview,
          genres: series.genre_ids,
          networks: series.networks
        }));

        setSeries(transformedSeries);
        setHasMore(response.page < response.total_pages);
      } else {
        setError('No series found');
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error fetching series:', err);
      setError('Failed to load series');
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSeriesClick = async (series) => {
    try {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      const response = await fetch(
        `https://api.themoviedb.org/3/tv/${series.id}?api_key=${apiKey}&append_to_response=credits,videos,similar,networks`
      );
      const seriesDetails = await response.json();

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
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      const response = await fetch(
        `https://api.themoviedb.org/3/tv/${similarSeries.id}?api_key=${apiKey}&append_to_response=credits,videos,similar,networks`
      );
      const seriesDetails = await response.json();

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
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      const response = await fetch(
        `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=${pageNum}`
      );
      const data = await response.json();

      if (pageNum === 1) {
        setSearchResults(data.results);
      } else {
        const newResults = data.results.filter(newSeries => 
          !searchResults.some(existingSeries => existingSeries.id === newSeries.id)
        );
        setSearchResults(prev => [...prev, ...newResults]);
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
      const matchesGenre = !selectedGenre || 
        (series.genre_ids && series.genre_ids.includes(selectedGenre));
      
      const seriesYear = series.first_air_date ? new Date(series.first_air_date).getFullYear() : null;
      const matchesYear = !selectedYear || seriesYear === selectedYear;
      
      return matchesGenre && matchesYear;
    });
  };

  const getDisplaySeries = () => {
    const seriesToFilter = searchQuery ? searchResults : series;
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
      <div className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-xl mx-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search TV series..."
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
                className="px-4 py-2 bg-[#1a1a1a] rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all duration-300 flex items-center gap-2"
              >
                {selectedGenre ? genres.find(g => g.id === selectedGenre)?.name : 'Genre'}
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
                        className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:bg-[#2b3036] hover:text-white"
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
                className="px-4 py-2 bg-[#1a1a1a] rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-all duration-300 flex items-center gap-2"
              >
                {selectedYear || 'Year'}
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
                        className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:bg-[#2b3036] hover:text-white"
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

        {error ? (
          <div className="text-center text-red-500 py-8">{error}</div>
        ) : (
          <div className="mt-8">
            {loading && series.length === 0 ? (
              <p>Loading...</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6">
                {getDisplaySeries().map((s) => (
                  <SeriesCard key={s.id} series={s} onSeriesClick={handleSeriesClick} />
                ))}
              </div>
            )}
          </div>
        )}

        {(loading || isSearching) && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        )}

        {!loading && !isSearching && ((searchQuery && hasMoreSearchResults) || (!searchQuery && hasMore)) && (
          <div ref={loadMoreRef} className="h-10" />
        )}

        {selectedSeries && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-7xl max-h-[90vh] bg-[#141414] rounded-xl overflow-hidden">
              <MovieDetailsOverlay
                movie={selectedSeries}
                onClose={handleCloseOverlay}
                onMovieSelect={handleSimilarSeriesClick}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeriesPage; 