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
    // Each queued entry is an object { requestFn, resolve, reject, _cancelInner }
    const entry = requestQueue.shift();
    const { requestFn, resolve, reject } = entry;

    try {
      // requestFn may return either a direct value/promise or an object { promise, cancel }
      const maybe = await requestFn();

      if (maybe && typeof maybe === 'object' && 'promise' in maybe && typeof maybe.promise.then === 'function') {
        // expose inner cancel so callers can cancel after this entry left the outer queue
        entry._cancelInner = typeof maybe.cancel === 'function' ? maybe.cancel : null;
        const result = await maybe.promise;
        resolve(result);
      } else {
        resolve(maybe);
      }
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
  // Backwards-compatible: if called with a second arg `true` we return
  // { promise, cancel } so callers can cancel the queued request before it runs.
  const _queueRequest = (requestFn, returnCancel = false) => {
    if (!returnCancel) {
      return new Promise((resolve, reject) => {
        requestQueue.push({ requestFn, resolve, reject });
        processQueue();
      });
    }

    // cancellable variant
    let queuedEntry = null;
    const promise = new Promise((resolve, reject) => {
      queuedEntry = { requestFn, resolve, reject };
      requestQueue.push(queuedEntry);
      processQueue();
    });

    const cancel = (reason = 'Request cancelled') => {
      const idx = requestQueue.indexOf(queuedEntry);
      if (idx !== -1) {
        // remove from queue and reject the awaiting promise
        requestQueue.splice(idx, 1);
        try { queuedEntry.reject(new Error(reason)); } catch (e) { /* ignore */ }
      }
    };

    return { promise, cancel };
  };

  // Replace the function object so callers can still call queueRequest(fn)
  // and internally we delegate to the compat implementation.
  // Note: this outer function is used below; return the non-cancellable promise by default.
  return _queueRequest(requestFn, false);
};

// Request throttling to prevent rate limiting
class RequestThrottler {
  constructor() {
    this.requestQueue = [];
    this.isProcessing = false;
    this.lastRequestTime = 0;
    this.minInterval = 100; // Minimum 100ms between requests
  }

  /**
   * throttle(requestFn)
   * - Adds a request to the throttler queue and returns a cancellable object
   *   { promise, cancel } where promise resolves/rejects with the request result.
   * - Backwards compatible: callers that await the return value still receive
   *   a standard promise-like result if they access `.promise`.
   */
  throttle(requestFn) {
    let queuedEntry = null;

    const promise = new Promise((resolve, reject) => {
      queuedEntry = { requestFn, resolve, reject, cancelled: false, _cancelInner: null };
      this.requestQueue.push(queuedEntry);
      this.processQueue();
    });

    const cancel = (reason = 'Throttled request cancelled') => {
      // If still in queue, remove it
      const idx = this.requestQueue.indexOf(queuedEntry);
      if (idx !== -1) {
        this.requestQueue.splice(idx, 1);
        try { queuedEntry.reject(new Error(reason)); } catch (e) { /* ignore */ }
        return;
      }

      // Otherwise, if an inner cancel was exposed, call it
      if (queuedEntry && queuedEntry._cancelInner) {
        try { queuedEntry._cancelInner(); } catch (e) { /* ignore */ }
      }
    };

    return { promise, cancel };
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

      const entry = this.requestQueue.shift();
      if (!entry || entry.cancelled) continue;

      this.lastRequestTime = Date.now();

      const { requestFn, resolve, reject } = entry;

      try {
        const maybe = requestFn();

        if (maybe && typeof maybe === 'object' && 'promise' in maybe && typeof maybe.promise.then === 'function') {
          // expose inner cancel so external code can cancel while inside throttler
          entry._cancelInner = typeof maybe.cancel === 'function' ? maybe.cancel : null;
          const result = await maybe.promise;
          resolve(result);
        } else {
          const result = await maybe;
          resolve(result);
        }
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
// requestFn: function that returns a promise for the network request
// opts: { timeout } can override network-aware timeout
export const fetchWithRetry = async (requestFn, opts = {}, retryConfig = {}) => {
  const netConfig = getNetworkAwareConfig();
  const timeout = opts.timeout ?? netConfig.timeout;
  const networkRetryConfig = netConfig.retryConfig;
  const config = { 
    ...networkRetryConfig, 
    maxDelay: 30000, // Increased max delay for rate limiting
    ...retryConfig 
  };
  
  // Throttle the request to prevent rate limiting
  const throttledRequest = () => requestThrottler.throttle(requestFn);

  let lastError;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      // Create a cancellable queued request so we can remove it from the
      // queue if the timeout fires before it is executed.
      const queued = queueRequest(throttledRequest, true);

      // Create a timeout promise that cancels the queued request when fired
      const timeoutPromise = new Promise((_, reject) => {
        const t = setTimeout(() => {
          try { queued.cancel('Request timeout'); } catch (e) { /* ignore */ }
          reject(new Error('Request timeout'));
        }, timeout);
        // store timer on the promise so we can clear it if queued resolves
        timeoutPromise._timer = t;
      });

      // Execute the queued request function with timeout
      const result = await Promise.race([
        queued.promise,
        timeoutPromise
      ]);

      // If we got here, clear the timeout
      if (timeoutPromise._timer) clearTimeout(timeoutPromise._timer);

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
    return apiFetch('/user/profile', { method: 'PUT', body: { location } });
  },

  // Update user preferences
  updatePreferences: async (preferences) => {
    return apiFetch('/user/preferences', { method: 'PUT', body: preferences });
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    return apiFetch('/user/password', { method: 'PUT', body: { currentPassword, newPassword } });
  },

  // Enable/Disable 2FA
  toggle2FA: async (enable = true) => {
    return apiFetch('/user/2fa', { method: enable ? 'POST' : 'DELETE' });
  },

  // 2FA Setup - Generate secret and QR code
  setup2FA: async () => {
    return apiFetch('/user/2fa/setup', { method: 'POST' });
  },

  // 2FA Verify - Verify setup with TOTP code
  verify2FA: async (code) => {
    return apiFetch('/user/2fa/verify', { method: 'POST', body: { code } });
  },

  // 2FA Disable - Disable 2FA with verification
  disable2FA: async (code, password) => {
    return apiFetch('/user/2fa/disable', { method: 'POST', body: { code, password } });
  },

  // Get backup codes
  getBackupCodes: async () => {
    return apiFetch('/user/2fa/backup-codes', { method: 'GET' });
  },

  // Regenerate backup codes
  regenerateBackupCodes: async () => {
    return apiFetch('/user/2fa/backup-codes/regenerate', { method: 'POST' });
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
    return apiFetch(`/user/oauth/${provider}`, { method: 'DELETE' });
  },

  // Delete user account
  deleteAccount: async () => {
    return apiFetch('/user/account', { method: 'DELETE' });
  },

  // Watchlist Management
  // Get user's watchlist
  getWatchlist: async () => {
    return apiFetch('/user/watchlist', { method: 'GET' });
  },

  // Sync entire watchlist with backend
  syncWatchlist: async (watchlistData) => {
    return apiFetch('/user/watchlist/sync', { method: 'POST', body: { watchlist: watchlistData } });
  },

  // Enhanced sync watchlist with conflict resolution
  syncWatchlistEnhanced: async (watchlistData, lastSync = null) => {
    return apiFetch('/user/watchlist/sync/enhanced', { method: 'POST', body: { watchlist: watchlistData, lastSync, clientVersion: new Date().toISOString() } });
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
    return apiFetch('/user/watchlist', { method: 'DELETE' });
  },

  // Viewing Progress Management
  // Get user's viewing progress
  getViewingProgress: async () => {
    return apiFetch('/user/viewing-progress', { method: 'GET' });
  },

  // Sync entire viewing progress with backend
  syncViewingProgress: async (progressData) => {
    return apiFetch('/user/viewing-progress/sync', { method: 'POST', body: { viewingProgress: progressData } });
  },

  // Update viewing progress for a specific item
  updateViewingProgress: async (progressData) => {
    return apiFetch('/user/viewing-progress', { method: 'PUT', body: { progressData } });
  },

  // Clear entire viewing progress
  clearViewingProgress: async () => {
    return apiFetch('/user/viewing-progress', { method: 'DELETE' });
  },

  // Watch History API methods
  // Get user's watch history
  getWatchHistory: async () => {
    return apiFetch('/user/watch-history', { method: 'GET' });
  },

  // Sync entire watch history with backend
  syncWatchHistory: async (watchHistoryData, lastSyncTimestamp = null) => {
    return apiFetch('/user/watch-history/sync', { method: 'POST', body: { watchHistory: watchHistoryData, lastSyncTimestamp } });
  },

  // Process batch operations for watch history
  processBatchWatchHistory: async (operations) => {
    return apiFetch('/user/watch-history/batch', { method: 'POST', body: { operations } });
  },

  // Enhanced sync watch history with conflict resolution
  syncWatchHistoryEnhanced: async (watchHistoryData, lastSync = null) => {
    return apiFetch('/user/watch-history/sync/enhanced', { method: 'POST', body: { watchHistory: watchHistoryData, lastSync, clientVersion: new Date().toISOString() } });
  },

  // Get sync status for both watchlist and watch history
  getSyncStatus: async () => {
    return apiFetch('/user/sync-status', { method: 'GET' });
  },

  // Update watch history for a specific item
  updateWatchHistory: async (contentId, progress) => {
    return apiFetch('/user/watch-history', { method: 'PUT', body: { contentId, progress } });
  },

  // Clear entire watch history
  clearWatchHistory: async () => {
    return apiFetch('/user/watch-history', { method: 'DELETE' });
  },

  // Wishlist Methods
  // Get user's wishlist
  getWishlist: async () => {
    return apiFetch('/user/wishlist', { method: 'GET' });
  },

  // Sync entire wishlist from frontend (diff-based, no bulk endpoint)
  syncWishlist: async (wishlist) => {
    // Normalize payload to match backend schema
    const normalized = Array.isArray(wishlist) ? wishlist.map(item => ({
      id: item.id,
      title: item.title || item.name || item.original_title || item.original_name || 'Unknown',
      poster_path: item.poster_path || item.poster,
      backdrop_path: item.backdrop_path || item.backdrop,
      overview: item.overview || '',
      type: item.media_type || item.type || 'movie',
      year: item.year || (item.release_date ? String(new Date(item.release_date).getFullYear()) : (item.first_air_date ? String(new Date(item.first_air_date).getFullYear()) : '')),
      rating: typeof item.vote_average !== 'undefined' ? Number(item.vote_average) : (typeof item.rating !== 'undefined' ? Number(item.rating) : undefined),
      genres: Array.isArray(item.genres)
        ? item.genres.map(g => (typeof g === 'string' ? g : g?.name)).filter(Boolean)
        : (Array.isArray(item.genre_ids) ? item.genre_ids.map(n => String(n)).filter(Boolean) : []),
      release_date: item.release_date || item.first_air_date || '',
      duration: item.duration || '',
      director: item.director || '',
      cast: Array.isArray(item.cast) ? item.cast.map(c => (typeof c === 'string' ? c : c?.name || '')).filter(Boolean) : [],
      addedAt: item.addedAt || new Date().toISOString()
    })) : [];

    // Diff-based reconciliation only (no bulk call)
    const server = await userAPI.getWishlist();
    const serverList = Array.isArray(server?.data?.wishlist) ? server.data.wishlist : [];
    const serverIds = new Set(serverList.map(i => i.id));
    const desiredIds = new Set(normalized.map(i => i.id));

    // Add missing
    for (const item of normalized) {
      if (!serverIds.has(item.id)) {
        try {
          await userAPI.addToWishlist(item);
        } catch (e) {
          console.warn('Failed to add wishlist item during diff sync:', item.id, e.message);
        }
      }
    }

    // Remove extras
    for (const item of serverList) {
      if (!desiredIds.has(item.id)) {
        try {
          await userAPI.removeFromWishlist(item.id);
        } catch (e) {
          console.warn('Failed to remove wishlist item during diff sync:', item.id, e.message);
        }
      }
    }

    return { success: true, data: { wishlist: normalized } };
  },

  // Add item to wishlist
  addToWishlist: async (movie) => {
    // Normalize single item
    const normalizedMovie = {
      id: movie.id,
      title: movie.title || movie.name || movie.original_title || movie.original_name || 'Unknown',
      poster_path: movie.poster_path || movie.poster,
      backdrop_path: movie.backdrop_path || movie.backdrop,
      overview: movie.overview || '',
      type: movie.media_type || movie.type || 'movie',
      year: movie.year || (movie.release_date ? String(new Date(movie.release_date).getFullYear()) : (movie.first_air_date ? String(new Date(movie.first_air_date).getFullYear()) : '')),
      rating: typeof movie.vote_average !== 'undefined' ? Number(movie.vote_average) : (typeof movie.rating !== 'undefined' ? Number(movie.rating) : undefined),
      genres: Array.isArray(movie.genres)
        ? movie.genres.map(g => (typeof g === 'string' ? g : g?.name)).filter(Boolean)
        : (Array.isArray(movie.genre_ids) ? movie.genre_ids.map(n => String(n)).filter(Boolean) : []),
      release_date: movie.release_date || movie.first_air_date || '',
      duration: movie.duration || '',
      director: movie.director || '',
      cast: Array.isArray(movie.cast) ? movie.cast.map(c => (typeof c === 'string' ? c : c?.name || '')).filter(Boolean) : [],
      addedAt: movie.addedAt || new Date().toISOString()
    };

    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/wishlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ movie: normalizedMovie })
      });
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const text = await response.text();
          errorMessage = text || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }
      
      return response.json();
    }, { timeout });
  },

  // Remove item from wishlist
  removeFromWishlist: async (movieId) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/wishlist/${movieId}`, {
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

  // Clear entire wishlist
  clearWishlist: async () => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return fetchWithRetry(async () => {
      const response = await fetch(`${getApiUrl()}/user/wishlist`, {
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

// --- API helper utilities ---
// Centralize token/header handling, standardized fetch and error parsing
const getAuthToken = () => localStorage.getItem('accessToken');

const buildUrl = (path) => {
  if (!path) return getApiUrl();
  return `${getApiUrl()}${path.startsWith('/') ? path : `/${path}`}`;
};

const parseResponseSafely = async (response) => {
  const ct = response.headers.get?.('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      return await response.json();
    } catch (e) {
      // fallthrough to text
    }
  }
  try {
    return await response.text();
  } catch (e) {
    return null;
  }
};

/**
 * apiFetch - standardized fetch wrapper used by userAPI methods
 * - automatically attaches Authorization header when auth=true
 * - stringifies plain objects to JSON
 * - uses existing fetchWithRetry for retries/throttling
 */
const apiFetch = async (path, { method = 'GET', body = null, auth = true, extraHeaders = {}, isForm = false } = {}) => {
  const url = buildUrl(path);
  const token = auth ? getAuthToken() : null;
  if (auth && !token) throw new Error('No authentication token found');

  const headers = { ...extraHeaders };

  let payload = body;
  if (!isForm && body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    payload = JSON.stringify(body);
  }

  if (auth) headers['Authorization'] = `Bearer ${token}`;

  // Use AbortController + fetchWithRetry. We pass timeout to fetchWithRetry so
  // it uses the same timeout for its retry loop, and also abort the underlying
  // fetch when the timeout fires to avoid leaked requests.
  const { timeout } = getNetworkAwareConfig();

  const requestFn = async () => {
    const controller = new AbortController();
    const signal = controller.signal;
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: payload,
        signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        const parsed = await parseResponseSafely(response);
        let message = `HTTP error! status: ${response.status}`;
        if (parsed) {
          if (typeof parsed === 'string') message = parsed || message;
          else if (parsed.message) message = parsed.message;
          else message = JSON.stringify(parsed);
        }
        const err = new Error(message);
        err.response = response;
        throw err;
      }

      return parseResponseSafely(response);
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw err;
    }
  };

  return fetchWithRetry(requestFn, { timeout });
};

// Example: refactor a few userAPI methods to use apiFetch to reduce duplication
userAPI.updateProfile = async (profileData) => apiFetch('/user/profile', { method: 'PUT', body: profileData });

userAPI.uploadProfilePicture = async (file) => {
  const formData = new FormData();
  formData.append('avatar', file);
  return apiFetch('/user/profile/picture', { method: 'POST', body: formData, isForm: true });
};

userAPI.getProfile = async () => apiFetch('/user/profile', { method: 'GET' });

userAPI.addToWatchlist = async (movie) => {
  // normalize movie minimally and send
  const normalized = {
    id: movie.id,
    title: movie.title || movie.name || movie.original_title || movie.original_name || 'Unknown',
    poster_path: movie.poster_path || movie.poster,
    backdrop_path: movie.backdrop_path || movie.backdrop,
    overview: movie.overview || '',
    type: movie.media_type || movie.type || 'movie',
    addedAt: movie.addedAt || new Date().toISOString()
  };

  return apiFetch('/user/wishlist', { method: 'POST', body: { movie: normalized } });
};

userAPI.removeFromWatchlist = async (movieId) => apiFetch(`/user/wishlist/${movieId}`, { method: 'DELETE' });
