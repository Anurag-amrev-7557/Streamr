// Optimized API Service with Enhanced Performance
import { 
  getTrendingMovies, 
  getPopularMovies, 
  getTopRatedMovies, 
  getUpcomingMovies,
  getNowPlayingMovies,
  getMovieDetails,
  getMovieCredits,
  getMovieVideos,
  getSimilarMovies,
  searchMovies,
  getGenres,
  getMoviesByGenre,
  getPopularTVShows,
  getTopRatedTVShows,
  getAiringTodayTVShows,
  getNetflixOriginals,
  getTVSeason,
  getTVSeasons,
  discoverMovies,
  transformMovieData,
  transformTVData
} from './tmdbService';

// Network utilities are defined locally in this file

// Enhanced cache with better performance
const apiCache = new Map();
const CACHE_DURATIONS = {
  SEARCH: 5 * 60 * 1000,      // 5 minutes for search results
  LIST: 10 * 60 * 1000,       // 10 minutes for list data
  DETAILS: 20 * 60 * 1000,    // 20 minutes for detailed data
  GENRES: 60 * 60 * 1000      // 1 hour for genres
};

// Request batching for better performance
const batchRequests = new Map();
const BATCH_TIMEOUT = 100; // 100ms batch window

// Network-aware configuration
export const getNetworkAwareConfig = () => {
  // Check if we're online
  const isOnline = navigator.onLine;
  
  // Adjust timeout based on network conditions
  const baseTimeout = 30000; // 30 seconds
  const timeout = isOnline ? baseTimeout : baseTimeout * 2; // Double timeout when offline
  
  return {
    timeout,
    isOnline,
    retryConfig: {
      maxRetries: isOnline ? 3 : 1,
      baseDelay: 1000,
      maxDelay: 10000
    }
  };
};

// Wrapper for fetchWithRetry that matches the expected usage in communityService
export const fetchWithRetry = async (requestFn, retryConfig = {}) => {
  const { timeout, retryConfig: networkRetryConfig } = getNetworkAwareConfig();
  const config = { ...networkRetryConfig, ...retryConfig };
  
  let lastError;
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
      });
      
      // Execute the request function with timeout
      const result = await Promise.race([
        requestFn(),
        timeoutPromise
      ]);
      
      return result;
    } catch (error) {
      lastError = error;
      
      console.warn(`Request failed (attempt ${attempt}/${config.maxRetries}):`, error.message);
      
      if (attempt === config.maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(2, attempt - 1),
        config.maxDelay
      );
      
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Optimized cache management
const getCachedData = (key, type = 'LIST') => {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATIONS[type]) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data, type = 'LIST') => {
  apiCache.set(key, {
    data,
    timestamp: Date.now(),
    type
  });
};

// Batch request processing
const processBatch = async (batchKey) => {
  const batch = batchRequests.get(batchKey);
  if (!batch) return;
  
  batchRequests.delete(batchKey);
  clearTimeout(batch.timeout);
  
  // Execute requests in parallel
  const results = await Promise.allSettled(
    batch.requests.map(req => req.request())
  );
  
  // Resolve promises with results
  results.forEach((result, index) => {
    const { resolve, reject } = batch.promises[index];
    if (result.status === 'fulfilled') {
      resolve(result.value);
    } else {
      reject(result.reason);
    }
  });
};

// Optimized API wrapper with batching and caching
const apiCall = async (request, cacheKey = null, cacheType = 'LIST', batchKey = null) => {
  // Check cache first
  if (cacheKey) {
    const cached = getCachedData(cacheKey, cacheType);
    if (cached) {
      return cached;
    }
  }
  
  // Handle batching
  if (batchKey && batchRequests.has(batchKey)) {
    const batch = batchRequests.get(batchKey);
    batch.requests.push({ request });
    return new Promise((resolve, reject) => {
      batch.promises.push({ resolve, reject });
    });
  }
  
  // Create new batch if needed
  if (batchKey) {
    const batch = {
      requests: [{ request }],
      promises: [],
      timeout: setTimeout(() => {
        processBatch(batchKey);
      }, BATCH_TIMEOUT)
    };
    batchRequests.set(batchKey, batch);
    
    return new Promise((resolve, reject) => {
      batch.promises.push({ resolve, reject });
    });
  }
  
  // Execute request
  const result = await request();
  
  // Cache result
  if (cacheKey) {
    setCachedData(cacheKey, result, cacheType);
  }
  
  return result;
};

// Optimized movie fetching with parallel requests
export const fetchMoviesData = async (page = 1) => {
  const cacheKey = `movies_data_${page}`;
  
  return apiCall(async () => {
    // Fetch all movie data in parallel
    const [trending, popular, topRated, upcoming, nowPlaying] = await Promise.all([
      getTrendingMovies(page),
      getPopularMovies(page),
      getTopRatedMovies(page),
      getUpcomingMovies(page),
      getNowPlayingMovies(page)
    ]);
    
    return {
      trending: trending?.results || [],
      popular: popular?.results || [],
      topRated: topRated?.results || [],
      upcoming: upcoming?.results || [],
      nowPlaying: nowPlaying?.results || []
    };
  }, cacheKey, 'LIST');
};

// Optimized TV shows fetching
export const fetchTVShowsData = async (page = 1) => {
  const cacheKey = `tv_shows_data_${page}`;
  
  return apiCall(async () => {
    // Fetch all TV data in parallel
    const [popular, topRated, airingToday, netflixOriginals] = await Promise.all([
      getPopularTVShows(page),
      getTopRatedTVShows(page),
      getAiringTodayTVShows(page),
      getNetflixOriginals(page)
    ]);
    
    return {
      popular: popular?.results || [],
      topRated: topRated?.results || [],
      airingToday: airingToday?.results || [],
      netflixOriginals: netflixOriginals?.results || []
    };
  }, cacheKey, 'LIST');
};

// Optimized movie details fetching
export const fetchMovieDetails = async (id, type = 'movie') => {
  const cacheKey = `movie_details_${type}_${id}`;
  
  return apiCall(async () => {
    // Fetch all movie details in parallel
    const [details, credits, videos, similar] = await Promise.all([
      getMovieDetails(id, type),
      getMovieCredits(id, type),
      getMovieVideos(id, type),
      getSimilarMovies(id, type)
    ]);
    
    return {
      details: details || {},
      credits: credits || {},
      videos: videos?.results || [],
      similar: similar?.results || []
    };
  }, cacheKey, 'DETAILS');
};

// Optimized search with better relevance scoring
export const searchContent = async (query, page = 1, options = {}) => {
  const cacheKey = `search_${query}_${page}_${JSON.stringify(options)}`;
  
  return apiCall(async () => {
    const results = await searchMovies(query, page, {
      ...options,
      includeAdult: false,
      language: 'en-US'
    });
    
    return {
      results: results?.results || [],
      totalPages: results?.total_pages || 0,
      totalResults: results?.total_results || 0,
      page: results?.page || 1
    };
  }, cacheKey, 'SEARCH');
};

// Optimized genre fetching
export const fetchGenres = async () => {
  const cacheKey = 'genres_data';
  
  return apiCall(async () => {
    const genres = await getGenres('en-US', true);
    return {
      movieGenres: genres?.movieGenres || [],
      tvGenres: genres?.tvGenres || []
    };
  }, cacheKey, 'GENRES');
};

// Optimized movies by genre
export const fetchMoviesByGenre = async (genreId, page = 1) => {
  const cacheKey = `movies_genre_${genreId}_${page}`;
  
  return apiCall(async () => {
    const results = await getMoviesByGenre(genreId, page);
    return {
      results: results?.results || [],
      totalPages: results?.total_pages || 0,
      totalResults: results?.total_results || 0,
      page: results?.page || 1
    };
  }, cacheKey, 'LIST');
};

// Optimized TV season fetching
export const fetchTVSeason = async (tvId, seasonNumber) => {
  const cacheKey = `tv_season_${tvId}_${seasonNumber}`;
  
  return apiCall(async () => {
    const season = await getTVSeason(tvId, seasonNumber);
    return season || {};
  }, cacheKey, 'DETAILS');
};

// Optimized TV seasons list
export const fetchTVSeasons = async (tvId) => {
  const cacheKey = `tv_seasons_${tvId}`;
  
  return apiCall(async () => {
    const seasons = await getTVSeasons(tvId);
    return seasons?.seasons || [];
  }, cacheKey, 'LIST');
};

// Optimized discover movies
export const fetchDiscoverMovies = async (filters = {}, page = 1) => {
  const cacheKey = `discover_movies_${JSON.stringify(filters)}_${page}`;
  
  return apiCall(async () => {
    const results = await discoverMovies({
      ...filters,
      page,
      include_adult: false,
      language: 'en-US'
    });
    
    return {
      results: results?.results || [],
      totalPages: results?.total_pages || 0,
      totalResults: results?.total_results || 0,
      page: results?.page || 1
    };
  }, cacheKey, 'LIST');
};

// Clear cache utility
export const clearApiCache = (type = null) => {
  if (type) {
    // Clear specific cache type
    for (const [key, value] of apiCache.entries()) {
      if (value.type === type) {
        apiCache.delete(key);
      }
    }
  } else {
    // Clear all cache
    apiCache.clear();
  }
};

// Cache statistics
export const getCacheStats = () => {
  const stats = {
    total: apiCache.size,
    byType: {}
  };
  
  for (const [key, value] of apiCache.entries()) {
    if (!stats.byType[value.type]) {
      stats.byType[value.type] = 0;
    }
    stats.byType[value.type]++;
  }
  
  return stats;
};

// Preload critical data for better performance
export const preloadCriticalData = async () => {
  try {
    // Preload genres and first page of movies/TV shows
    await Promise.all([
      fetchGenres(),
      fetchMoviesData(1),
      fetchTVShowsData(1)
    ]);
  } catch (error) {
    console.warn('Preload failed:', error);
  }
};

// User API service
export const userAPI = {
  // Update user profile
  updateProfile: async (profileData) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }, { timeout });
  },

  // Upload profile picture
  uploadProfilePicture: async (file) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const formData = new FormData();
      formData.append('profilePicture', file);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/user/profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }, { timeout });
  },

  // Get user profile
  getProfile: async () => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/user/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }, { timeout });
  },

  // Update user preferences
  updatePreferences: async (preferences) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/user/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(preferences)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }, { timeout });
  },

  // Delete user account
  deleteAccount: async () => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/user/account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }, { timeout });
  }
}; 