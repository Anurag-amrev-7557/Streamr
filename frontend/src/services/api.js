// Optimized API Service with Enhanced Performance
// Import all tmdbService functions at the top to avoid hoisting issues
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
} from './tmdbService.js';

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

// Request queue for rate limiting
const requestQueue = [];
let isProcessingQueue = false;
const REQUEST_DELAY = 200; // 200ms between requests

const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const { requestFn, resolve, reject } = requestQueue.shift();
    
    try {
      const result = await requestFn();
      resolve(result);
    } catch (error) {
      reject(error);
    }
    
    // Wait before processing next request
    if (requestQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    }
  }
  
  isProcessingQueue = false;
};

const queueRequest = (requestFn) => {
  return new Promise((resolve, reject) => {
    requestQueue.push({ requestFn, resolve, reject });
    processQueue();
  });
};

// Request throttling to prevent rate limiting
class RequestThrottler {
  constructor() {
    this.requestQueue = [];
    this.isProcessing = false;
    this.lastRequestTime = 0;
    this.minInterval = 100; // Minimum 100ms between requests
  }

  async throttle(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.minInterval) {
        const delay = this.minInterval - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const { requestFn, resolve, reject } = this.requestQueue.shift();
      this.lastRequestTime = Date.now();

      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.isProcessing = false;
  }
}

// Global request throttler instance
const requestThrottler = new RequestThrottler();

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
  const config = { 
    ...networkRetryConfig, 
    maxDelay: 30000, // Increased max delay for rate limiting
    ...retryConfig 
  };
  
  // Throttle the request to prevent rate limiting
  const throttledRequest = () => requestThrottler.throttle(requestFn);
  
  // Queue the request to prevent rate limiting
  const queuedRequest = () => queueRequest(throttledRequest);
  
  let lastError;
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
      });
      
      // Execute the queued request function with timeout
      const result = await Promise.race([
        queuedRequest(),
        timeoutPromise
      ]);
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if it's a rate limiting error
      if (error.response?.status === 429) {
        console.warn(`Rate limit hit (attempt ${attempt}/${config.maxRetries})`);
        
        // Parse retry-after header or response body for optimal delay
        let rateLimitDelay = config.baseDelay * Math.pow(3, attempt - 1);
        
        if (error.response?.headers?.['retry-after']) {
          const retryAfter = parseInt(error.response.headers['retry-after']);
          if (!isNaN(retryAfter)) {
            rateLimitDelay = retryAfter * 1000; // Convert seconds to milliseconds
            console.log(`Using retry-after header: ${retryAfter}s`);
          }
        } else if (error.response?.data?.retryAfter) {
          const retryAfter = parseInt(error.response.data.retryAfter);
          if (!isNaN(retryAfter)) {
            rateLimitDelay = retryAfter * 1000;
            console.log(`Using response retry-after: ${retryAfter}s`);
          }
        }
        
        // Ensure delay is within reasonable bounds
        rateLimitDelay = Math.min(Math.max(rateLimitDelay, 1000), config.maxDelay);
        
        console.log(`Rate limit - waiting ${rateLimitDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
        
        if (attempt === config.maxRetries) {
          const errorMessage = error.response?.data?.error || 'Rate limit exceeded. Please try again later.';
          const retryAfter = error.response?.data?.retryAfter || '15 minutes';
          throw new Error(`${errorMessage} Retry after: ${retryAfter}`);
        }
        continue;
      }
      
      console.warn(`Request failed (attempt ${attempt}/${config.maxRetries}):`, error.message);
      
      if (attempt === config.maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff for other errors
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

import { getApiUrl } from '../config/api.js';

// User API service
export const userAPI = {
  // Update user profile
  updateProfile: async (profileData) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    console.log('API: Sending profile update request to:', `${getApiUrl()}/user/profile`);
    console.log('API: Profile data:', profileData);
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      
      console.log('API: Response status:', response.status);
      console.log('API: Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API: Error response body:', errorText);
        
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.warn('API: Could not parse error response as JSON');
        }
        
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      console.log('API: Success response:', responseData);
      return responseData;
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
      // Backend expects field name 'avatar' per upload.single('avatar')
      formData.append('avatar', file);
      
      const response = await fetch(`${getApiUrl()}/user/profile/picture`, {
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
      const response = await fetch(`${getApiUrl()}/user/profile`, {
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

  // Update user location only
  updateLocation: async (location) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ location })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.warn('Could not parse error response as JSON');
        }
        throw new Error(errorMessage);
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
      const response = await fetch(`${getApiUrl()}/user/preferences`, {
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

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }, { timeout });
  },

  // Enable/Disable 2FA
  toggle2FA: async (enable = true) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/2fa`, {
        method: enable ? 'POST' : 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }, { timeout });
  },

  // 2FA Setup - Generate secret and QR code
  setup2FA: async () => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/2fa/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }, { timeout });
  },

  // 2FA Verify - Verify setup with TOTP code
  verify2FA: async (code) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/2fa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }, { timeout });
  },

  // 2FA Disable - Disable 2FA with verification
  disable2FA: async (code, password) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/2fa/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code, password })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }, { timeout });
  },

  // Get backup codes
  getBackupCodes: async () => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/2fa/backup-codes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }, { timeout });
  },

  // Regenerate backup codes
  regenerateBackupCodes: async () => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/2fa/backup-codes/regenerate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }, { timeout });
  },

  // Connect OAuth provider
  connectOAuth: async (provider) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    // This would typically redirect to OAuth provider
    window.location.href = `${getApiUrl()}/auth/${provider}/connect`;
  },

  // Disconnect OAuth provider
  disconnectOAuth: async (provider) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/oauth/${provider}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
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
      const response = await fetch(`${getApiUrl()}/user/account`, {
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
  },

  // Watchlist Management
  // Get user's watchlist
  getWatchlist: async () => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/watchlist`, {
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

  // Sync entire watchlist with backend
  syncWatchlist: async (watchlistData) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/watchlist/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ watchlist: watchlistData })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }, { timeout });
  },

  // Enhanced sync watchlist with conflict resolution
  syncWatchlistEnhanced: async (watchlistData, lastSync = null) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/watchlist/sync/enhanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          watchlist: watchlistData,
          lastSync,
          clientVersion: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }, { timeout });
  },

  // Add item to watchlist
  addToWatchlist: async (movieData) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/watchlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ movieData })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }, { timeout });
  },

  // Remove item from watchlist
  removeFromWatchlist: async (movieId) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/watchlist/${movieId}`, {
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
  },

  // Clear entire watchlist
  clearWatchlist: async () => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/watchlist`, {
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
  },

  // Viewing Progress Management
  // Get user's viewing progress
  getViewingProgress: async () => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/viewing-progress`, {
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

  // Sync entire viewing progress with backend
  syncViewingProgress: async (progressData) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/viewing-progress/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ viewingProgress: progressData })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }, { timeout });
  },

  // Update viewing progress for a specific item
  updateViewingProgress: async (progressData) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/viewing-progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ progressData })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }, { timeout });
  },

  // Clear entire viewing progress
  clearViewingProgress: async () => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/viewing-progress`, {
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
  },

  // Watch History API methods
  // Get user's watch history
  getWatchHistory: async () => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/watch-history`, {
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

  // Sync entire watch history with backend
  syncWatchHistory: async (watchHistoryData) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/watch-history/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ watchHistory: watchHistoryData })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }, { timeout });
  },

  // Enhanced sync watch history with conflict resolution
  syncWatchHistoryEnhanced: async (watchHistoryData, lastSync = null) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/watch-history/sync/enhanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          watchHistory: watchHistoryData,
          lastSync,
          clientVersion: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }, { timeout });
  },

  // Get sync status for both watchlist and watch history
  getSyncStatus: async () => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/sync-status`, {
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

  // Update watch history for a specific item
  updateWatchHistory: async (contentId, progress) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/watch-history`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ contentId, progress })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }, { timeout });
  },

  // Clear entire watch history
  clearWatchHistory: async () => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/watch-history`, {
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