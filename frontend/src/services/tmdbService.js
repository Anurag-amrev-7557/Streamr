// Export TMDB constants
export const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Enhanced network error handling constants
const NETWORK_ERROR_TYPES = {
  CONNECTION_RESET: 'CONNECTION_RESET',
  TIMEOUT: 'TIMEOUT',
  NETWORK_UNREACHABLE: 'NETWORK_UNREACHABLE',
  DNS_FAILURE: 'DNS_FAILURE',
  SSL_ERROR: 'SSL_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN: 'UNKNOWN'
};

// Enhanced retry configuration
const RETRY_CONFIG = {
  MAX_RETRIES: 3, // Reduced from 5 to 3 for faster failure
  BASE_DELAY: 500, // Reduced from 1000 to 500ms
  MAX_DELAY: 10000, // Reduced from 30000 to 10000ms
  JITTER_FACTOR: 0.2, // Reduced jitter for more predictable timing
  BACKOFF_MULTIPLIER: 1.5, // Reduced from 2 to 1.5 for faster retries
  TIMEOUT: 15000 // Reduced from 30000 to 15000ms
};

// Validate API key configuration
if (!TMDB_API_KEY || TMDB_API_KEY === 'undefined' || TMDB_API_KEY === '') {
  console.error('❌ TMDB API Key is missing or invalid!');
  console.error('Please set the VITE_TMDB_API_KEY environment variable in your .env file');
  console.error('You can get a free API key from: https://www.themoviedb.org/settings/api');
} else {
  console.debug('✅ TMDB API Key is configured');
}

// Enhanced cache with different durations for different types of data
const cache = new Map();
const CACHE_DURATIONS = {
  LIST: 15 * 60 * 1000,    // Reduced from 30 to 15 minutes for fresher data
  DETAILS: 30 * 60 * 1000, // Reduced from 60 to 30 minutes
  IMAGES: 12 * 60 * 60 * 1000 // Reduced from 24 to 12 hours
};

// Optimized request queue with better concurrency
const requestQueue = [];
let isProcessingQueue = false;
const MAX_CONCURRENT_REQUESTS = 4; // Increased from 2 to 4
let activeRequests = 0;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // Reduced from 250ms to 100ms

// Request batching for better performance
const batchRequests = new Map();
const BATCH_TIMEOUT = 50; // 50ms batch window

// Enhanced network error detection and classification
const classifyNetworkError = (error) => {
  const errorMessage = error.message.toLowerCase();
  const errorName = error.name;
  
  // Connection reset errors
  if (errorMessage.includes('connection reset') || 
      errorMessage.includes('net::err_connection_reset') ||
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('network error')) {
    return {
      type: NETWORK_ERROR_TYPES.CONNECTION_RESET,
      retryable: true,
      severity: 'high',
      userMessage: 'Connection was reset. Please check your internet connection.'
    };
  }
  
  // Timeout errors
  if (errorMessage.includes('timeout') || 
      errorMessage.includes('aborted') ||
      errorName === 'AbortError') {
    return {
      type: NETWORK_ERROR_TYPES.TIMEOUT,
      retryable: true,
      severity: 'medium',
      userMessage: 'Request timed out. Please try again.'
    };
  }
  
  // DNS failures
  if (errorMessage.includes('dns') || 
      errorMessage.includes('name not resolved') ||
      errorMessage.includes('getaddrinfo')) {
    return {
      type: NETWORK_ERROR_TYPES.DNS_FAILURE,
      retryable: true,
      severity: 'high',
      userMessage: 'Unable to resolve server address. Please check your internet connection.'
    };
  }
  
  // SSL/TLS errors
  if (errorMessage.includes('ssl') || 
      errorMessage.includes('tls') ||
      errorMessage.includes('certificate')) {
    return {
      type: NETWORK_ERROR_TYPES.SSL_ERROR,
      retryable: false,
      severity: 'high',
      userMessage: 'SSL certificate error. Please check your connection.'
    };
  }
  
  // Rate limiting
  if (errorMessage.includes('rate limit') || 
      errorMessage.includes('429') ||
      errorMessage.includes('too many requests')) {
    return {
      type: NETWORK_ERROR_TYPES.RATE_LIMIT,
      retryable: true,
      severity: 'medium',
      userMessage: 'Rate limit exceeded. Please wait a moment and try again.'
    };
  }
  
  // Server errors
  if (errorMessage.includes('500') || 
      errorMessage.includes('502') ||
      errorMessage.includes('503') ||
      errorMessage.includes('504')) {
    return {
      type: NETWORK_ERROR_TYPES.SERVER_ERROR,
      retryable: true,
      severity: 'medium',
      userMessage: 'Server error. Please try again.'
    };
  }
  
  // Unknown errors
  return {
    type: NETWORK_ERROR_TYPES.UNKNOWN,
    retryable: true,
    severity: 'low',
    userMessage: 'An unexpected error occurred. Please try again.'
  };
};

// Optimized retry delay calculation
const calculateRetryDelayEnhanced = (attempt, errorType = 'unknown') => {
  const baseDelay = RETRY_CONFIG.BASE_DELAY;
  const maxDelay = RETRY_CONFIG.MAX_DELAY;
  const backoffMultiplier = RETRY_CONFIG.BACKOFF_MULTIPLIER;
  const jitterFactor = RETRY_CONFIG.JITTER_FACTOR;
  
  // Calculate exponential backoff
  let delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
  
  // Apply jitter for better distribution
  const jitter = delay * jitterFactor * (Math.random() - 0.5);
  delay += jitter;
  
  // Cap at maximum delay
  delay = Math.min(delay, maxDelay);
  
  // Adjust based on error type
  switch (errorType) {
    case NETWORK_ERROR_TYPES.RATE_LIMIT:
      delay = Math.max(delay, 2000); // Longer delay for rate limits
      break;
    case NETWORK_ERROR_TYPES.SERVER_ERROR:
      delay = Math.max(delay, 1000); // Medium delay for server errors
      break;
    case NETWORK_ERROR_TYPES.CONNECTION_RESET:
      delay = Math.max(delay, 500); // Shorter delay for connection issues
      break;
    default:
      break;
  }
  
  return Math.max(delay, 100); // Minimum 100ms delay
};

// Enhanced network connectivity check
const checkNetworkConnectivity = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    // Use a public CDN endpoint instead of TMDB API for network checks
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Optimized queue processing with better concurrency
const processQueue = async () => {
  if (isProcessingQueue || activeRequests >= MAX_CONCURRENT_REQUESTS) {
    return;
  }
  
  isProcessingQueue = true;
  
  while (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
    const request = requestQueue.shift();
    activeRequests++;
    
    // Process request without blocking the queue
    request().finally(() => {
      activeRequests--;
      if (requestQueue.length > 0) {
        processQueue();
      }
    });
  }
  
  isProcessingQueue = false;
};

// Enhanced request queuing with batching
const queueRequest = async (request, priority = false, metadata = {}, options = {}) => {
  const requestId = Math.random().toString(36).substr(2, 9);
  const timestamp = Date.now();
  
  // Check if we can batch this request
  const batchKey = options.batchKey;
  if (batchKey && batchRequests.has(batchKey)) {
    const batch = batchRequests.get(batchKey);
    batch.requests.push({ request, priority, metadata, requestId, timestamp });
    return new Promise((resolve, reject) => {
      batch.promises.push({ resolve, reject });
    });
  }
  
  // Create new batch if needed
  if (batchKey) {
    const batch = {
      requests: [{ request, priority, metadata, requestId, timestamp }],
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
  
  // Regular request processing
  const wrappedRequest = async (attempt = 1) => {
    try {
      // Rate limiting
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
      }
      lastRequestTime = Date.now();
      
      // Network connectivity check (only on first attempt and if not recently checked)
      const lastNetworkCheck = Date.now() - (window.lastNetworkCheck || 0);
      if (attempt === 1 && lastNetworkCheck > 30000) { // Check every 30 seconds max
        const isConnected = await checkNetworkConnectivity();
        window.lastNetworkCheck = Date.now();
        if (!isConnected) {
          throw new Error('No network connectivity');
        }
      }
      
      // Execute request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), RETRY_CONFIG.TIMEOUT);
      
      try {
        const result = await request();
        clearTimeout(timeoutId);
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      const classifiedError = classifyNetworkError(error);
      
      // Check if we should retry
      if (attempt < RETRY_CONFIG.MAX_RETRIES && classifiedError.retryable) {
        const delay = calculateRetryDelayEnhanced(attempt, classifiedError.type);
        await new Promise(resolve => setTimeout(resolve, delay));
        return wrappedRequest(attempt + 1);
      }
      
      // Log error for debugging
      if (import.meta.env.DEV) {
        console.error(`Request failed after ${attempt} attempts:`, {
          error: error.message,
          type: classifiedError.type,
          severity: classifiedError.severity,
          metadata
        });
      }
      
      throw new Error(classifiedError.userMessage);
    }
  };
  
  // Add to queue with priority
  if (priority) {
    requestQueue.unshift(wrappedRequest);
  } else {
    requestQueue.push(wrappedRequest);
  }
  
  // Process queue
  processQueue();
  
  return wrappedRequest();
};

// Process batched requests
const processBatch = async (batchKey) => {
  const batch = batchRequests.get(batchKey);
  if (!batch) return;
  
  batchRequests.delete(batchKey);
  clearTimeout(batch.timeout);
  
  // Sort requests by priority
  batch.requests.sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0));
  
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



// Helper functions for enhanced queue management
const shouldRetry = (error) => {
  // Retry on network errors, 5xx server errors, and rate limits
  return error.code === 'TIMEOUT' || 
         error.status >= 500 || 
         error.status === 429 ||
         error.message.includes('network') ||
         error.message.includes('fetch');
};

const calculateRetryDelay = (attempt, error) => {
  // Use enhanced network error classification
  const networkError = classifyNetworkError(error);
  return calculateRetryDelayEnhanced(attempt, networkError.type);
};

// Enhanced cache management
const getCachedData = (key, type = 'LIST') => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATIONS[type]) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data, type = 'LIST') => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    type
  });
};

// Enhanced fetch with advanced caching, intelligent retry logic, and comprehensive error handling
export const fetchWithCache = async (url, options = {}, type = 'LIST') => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 8000;
  const REQUEST_TIMEOUT = 15000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Enhanced cache key generation with better collision prevention
  const generateCacheKey = (url, options) => {
    const urlObj = new URL(url, TMDB_BASE_URL);
    const params = new URLSearchParams(urlObj.search);
    params.delete('api_key'); // Remove API key from cache key for security
    return `${urlObj.pathname}-${params.toString()}-${JSON.stringify(options)}`;
  };

  // Intelligent retry delay calculation with jitter
  const calculateRetryDelay = (attempt, error) => {
    // Use enhanced network error classification
    const networkError = classifyNetworkError(error);
    return calculateRetryDelayEnhanced(attempt, networkError.type);
  };

  // Enhanced error classification and handling
  const classifyError = (error, status) => {
    if (status === 401) {
      console.error('🔐 TMDB API Authentication Failed (401 Unauthorized)');
      console.error('This usually means:');
      console.error('1. The API key is missing or invalid');
      console.error('2. The API key has expired or been revoked');
      console.error('3. The API key doesn\'t have the required permissions');
      console.error('Please check your VITE_TMDB_API_KEY environment variable');
      return { type: 'AUTH_ERROR', retryable: false };
    }
    if (status === 404) return { type: 'NOT_FOUND', retryable: false };
    if (status === 429) return { type: 'RATE_LIMIT', retryable: true };
    if (status >= 500) return { type: 'SERVER_ERROR', retryable: true };
    if (error.name === 'TypeError' && error.message.includes('fetch')) return { type: 'NETWORK_ERROR', retryable: true };
    return { type: 'CLIENT_ERROR', retryable: false };
  };

  const fetchWithRetry = async (url, attempt = 1) => {
    const requestStartTime = performance.now();
    const requestId = `fetch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Enhanced API key validation
      if (!TMDB_API_KEY || TMDB_API_KEY === 'undefined') {
        throw new Error('TMDB API key is not configured');
      }

      // Enhanced URL construction with proper parameter handling
      const urlObj = new URL(url, TMDB_BASE_URL);
      if (!urlObj.searchParams.has('api_key')) {
        urlObj.searchParams.set('api_key', TMDB_API_KEY);
      }
      const urlWithKey = urlObj.toString();
      
      // Enhanced cache key generation
      const cacheKey = generateCacheKey(url, options);
      
      // Intelligent cache type detection
      const cacheType = url.includes('/movie/') || url.includes('/tv/') || url.includes('/person/') ? 'DETAILS' : 'LIST';
      const cachedData = getCachedData(cacheKey, cacheType);
      
      if (cachedData) {
        console.debug(`🎯 Cache hit for ${cacheKey} (${cacheType})`);
        return cachedData;
      }

      // Enhanced rate limiting with adaptive delays
      const timeSinceLastRequest = Date.now() - lastRequestTime;
      const adaptiveInterval = Math.max(MIN_REQUEST_INTERVAL, 
        requestQueue.length > 5 ? MIN_REQUEST_INTERVAL * 1.2 : MIN_REQUEST_INTERVAL);
      
      if (timeSinceLastRequest < adaptiveInterval) {
        const delay = adaptiveInterval - timeSinceLastRequest;
        console.debug(`⏳ Rate limiting: waiting ${delay}ms before request`);
        await sleep(delay);
      }

      // Enhanced request with timeout and better headers
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(urlWithKey, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'MovieApp/1.0',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      // Enhanced response handling with detailed error classification
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        const networkError = classifyNetworkError(error);
        
        if (response.status === 404) {
          console.debug(`🔍 Resource not found: ${url}`);
          return null;
        }
        
        if (networkError.retryable && attempt < MAX_RETRIES) {
          const delay = calculateRetryDelayEnhanced(attempt, networkError.type);
          console.warn(`🔄 Retrying ${networkError.type} (${response.status}) - attempt ${attempt}/${MAX_RETRIES} in ${delay}ms`);
          await sleep(delay);
          return fetchWithRetry(url, attempt + 1);
        }
        
        throw error;
      }

      // Enhanced response parsing with validation
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format: expected JSON');
      }

      const data = await response.json();
      
      // Enhanced data validation
      if (!data || (Array.isArray(data) && data.length === 0 && !url.includes('search'))) {
        console.warn(`⚠️ Empty or invalid response for ${url}`);
        return null;
      }

      // Enhanced caching with metadata
      setCachedData(cacheKey, data, cacheType);
      lastRequestTime = Date.now();
      
      const duration = performance.now() - requestStartTime;
      console.debug(`✅ Request ${requestId} completed in ${duration.toFixed(2)}ms`, {
        url: urlObj.pathname,
        cacheType,
        duration,
        dataSize: JSON.stringify(data).length
      });

      return data;

    } catch (error) {
      const duration = performance.now() - requestStartTime;
      const networkError = classifyNetworkError(error);
      
      // Enhanced error logging with context
      console.error(`❌ Request ${requestId} failed after ${duration.toFixed(2)}ms (attempt ${attempt}/${MAX_RETRIES}):`, {
        error: error.message,
        type: networkError.type,
        retryable: networkError.retryable,
        userMessage: networkError.userMessage,
        url: url,
        duration
      });

      // Enhanced retry logic with better error handling
      if (networkError.retryable && attempt < MAX_RETRIES) {
        const delay = calculateRetryDelayEnhanced(attempt, networkError.type);
        console.warn(`🔄 Retrying ${networkError.type} - attempt ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }

      // Enhanced error propagation with context
      const enhancedError = new Error(`Request failed: ${networkError.userMessage}`);
      enhancedError.originalError = error;
      enhancedError.networkError = networkError;
      enhancedError.requestId = requestId;
      enhancedError.attempts = attempt;
      enhancedError.url = url;
      throw enhancedError;
    }
  };

  return fetchWithRetry(url);
};

// Batch fetch function for multiple requests with rate limiting
const batchFetch = async (requests) => {
  const results = [];
  for (const req of requests) {
    try {
      const result = await fetchWithCache(req.url, req.options);
      results.push(result);
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error in batch fetch:', error);
      results.push(null);
    }
  }
  return results;
};

// Enhanced helper function to transform movie data with comprehensive data processing
export const transformMovieData = (movie) => {
  if (!movie) return null;
  
  // Enhanced genre mapping with comprehensive TMDB genre IDs
  const genreMap = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Science Fiction',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western',
    10759: 'Action & Adventure',
    10762: 'Kids',
    10763: 'News',
    10764: 'Reality',
    10765: 'Sci-Fi & Fantasy',
    10766: 'Soap',
    10767: 'Talk',
    10768: 'War & Politics'
  };

  // Enhanced genre processing with fallback handling
  const getGenreNames = (genreIds) => {
    if (!genreIds || !Array.isArray(genreIds)) return [];
    return genreIds
      .map(id => genreMap[id] || `Unknown Genre (${id})`)
      .filter(Boolean);
  };

  // Enhanced date processing with validation
  const processDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      console.warn(`Invalid date format: ${dateString}`);
      return null;
    }
  };

  // Enhanced duration formatting with edge case handling
  const formatDuration = (runtime) => {
    if (!runtime || runtime <= 0) return null;
    const hours = Math.floor(runtime / 60);
    const minutes = runtime % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  // Enhanced rating processing with validation
  const processRating = (rating) => {
    if (rating === null || rating === undefined || isNaN(rating)) return '0.0';
    const numRating = parseFloat(rating);
    return isNaN(numRating) ? '0.0' : numRating.toFixed(1);
  };

  // Enhanced image URL processing with size optimization
  const getImageUrl = (path, size = 'w500') => {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
  };

  // Enhanced title processing with fallback chain
  const getTitle = (movie) => {
    return movie.title || movie.name || movie.original_title || movie.original_name || 'Untitled';
  };

  // Enhanced overview processing with truncation
  const getOverview = (overview) => {
    if (!overview) return '';
    return overview.length > 500 ? overview.substring(0, 500) + '...' : overview;
  };

  // Process the movie data with enhanced error handling
  try {
    const processedDate = processDate(movie.release_date);
    const genreNames = getGenreNames(movie.genre_ids);
    
    return {
      id: movie.id || null,
      title: getTitle(movie),
      overview: getOverview(movie.overview),
      poster: getImageUrl(movie.poster_path, 'w500'),
      backdrop: getImageUrl(movie.backdrop_path, 'original'),
      rating: processRating(movie.vote_average),
      year: processedDate ? processedDate.getFullYear() : null,
      duration: formatDuration(movie.runtime),
      runtime: movie.runtime || 0,
      genres: genreNames,
      genre_ids: movie.genre_ids || [],
      type: movie.media_type || 'movie',
      trailer: null, // Will be populated by separate API call
      releaseDate: movie.release_date || null,
      status: movie.status || 'Released',
      voteCount: movie.vote_count || 0,
      popularity: movie.popularity || 0,
      originalLanguage: movie.original_language || 'en',
      originalTitle: movie.original_title || movie.original_name || getTitle(movie),
      director: null, // Will be populated by credits API call
      cast: null, // Will be populated by credits API call
      // Enhanced metadata
      adult: movie.adult || false,
      video: movie.video || false,
      budget: movie.budget || 0,
      revenue: movie.revenue || 0,
      tagline: movie.tagline || '',
      productionCompanies: movie.production_companies?.map(company => ({
        id: company.id,
        name: company.name,
        logoPath: getImageUrl(company.logo_path, 'w185'),
        originCountry: company.origin_country
      })) || [],
      productionCountries: movie.production_countries?.map(country => ({
        iso31661: country.iso_3166_1,
        name: country.name
      })) || [],
      spokenLanguages: movie.spoken_languages?.map(lang => ({
        iso6391: lang.iso_639_1,
        name: lang.name
      })) || [],
      // Enhanced status tracking
      isProcessed: true,
      processedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error processing movie data:', error, movie);
    // Return a minimal valid object with error information
    return {
      id: movie.id || null,
      title: getTitle(movie),
      overview: '',
      poster: null,
      backdrop: null,
      rating: '0.0',
      year: null,
      duration: null,
      runtime: 0,
      genres: [],
      genre_ids: [],
      type: 'movie',
      error: error.message,
      isProcessed: false
    };
  }
};

// Enhanced helper function to transform TV data with comprehensive data processing
export const transformTVData = (tv) => {
  if (!tv) return null;
  
  try {
    // Enhanced genre mapping with comprehensive TMDB TV genre IDs
    const genreMap = {
      10759: 'Action & Adventure',
      16: 'Animation',
      35: 'Comedy',
      80: 'Crime',
      99: 'Documentary',
      18: 'Drama',
      10751: 'Family',
      10762: 'Kids',
      9648: 'Mystery',
      10763: 'News',
      10764: 'Reality',
      10765: 'Sci-Fi & Fantasy',
      10766: 'Soap',
      10767: 'Talk',
      10768: 'War & Politics',
      37: 'Western',
      10770: 'TV Movie',
      28: 'Action',
      12: 'Adventure',
      14: 'Fantasy',
      27: 'Horror',
      10402: 'Music',
      10749: 'Romance',
      878: 'Science Fiction',
      53: 'Thriller',
      10752: 'War'
    };

    // Enhanced genre processing with fallback handling
    const getGenreNames = (genreIds) => {
      if (!genreIds || !Array.isArray(genreIds)) return [];
      return genreIds
        .map(id => genreMap[id] || `Unknown Genre (${id})`)
        .filter(Boolean);
    };

    // Enhanced date processing with validation
    const processDate = (dateString) => {
      if (!dateString) return null;
      try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? null : date;
      } catch (error) {
        console.warn(`Invalid date format: ${dateString}`);
        return null;
      }
    };

    // Enhanced duration formatting with better time calculation
    const formatDuration = (minutes) => {
      if (!minutes || minutes <= 0) return null;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    // Enhanced image URL generation with fallback sizes
    const getImageUrl = (path, size = 'w500') => {
      if (!path) return null;
      return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
    };

    // Enhanced title extraction with fallback handling
    const getTitle = (show) => {
      return show.name || show.title || show.original_name || 'Unknown Title';
    };

    // Enhanced network processing with comprehensive data
    const processNetworks = (networks) => {
      if (!networks || !Array.isArray(networks)) return [];
      return networks.map(network => ({
        id: network.id,
        name: network.name,
        logoPath: getImageUrl(network.logo_path, 'w185'),
        originCountry: network.origin_country,
        headquarters: network.headquarters || null,
        homepage: network.homepage || null
      }));
    };

    // Enhanced episode processing with detailed information
    const processEpisodes = (episodes) => {
      if (!episodes || !Array.isArray(episodes)) return [];
      return episodes.map(episode => ({
        id: episode.id,
        name: episode.name,
        overview: episode.overview || '',
        airDate: processDate(episode.air_date),
        episodeNumber: episode.episode_number || 0,
        seasonNumber: episode.season_number || 0,
        stillPath: getImageUrl(episode.still_path, 'w300'),
        runtime: episode.runtime || 0,
        voteAverage: episode.vote_average || 0,
        voteCount: episode.vote_count || 0
      }));
    };

    // Enhanced season processing with comprehensive data
    const processSeasons = (seasons) => {
      if (!seasons || !Array.isArray(seasons)) return [];
      return seasons.map(season => ({
        id: season.id,
        name: season.name,
        overview: season.overview || '',
        airDate: processDate(season.air_date),
        seasonNumber: season.season_number || 0,
        episodeCount: season.episode_count || 0,
        posterPath: getImageUrl(season.poster_path, 'w500'),
        episodes: processEpisodes(season.episodes || [])
      }));
    };

    // Enhanced status mapping with detailed information
    const getStatusInfo = (status) => {
      const statusMap = {
        'Returning Series': { status: 'Returning Series', color: 'green', description: 'Currently airing new episodes' },
        'Ended': { status: 'Ended', color: 'red', description: 'Series has concluded' },
        'Canceled': { status: 'Canceled', color: 'orange', description: 'Series was canceled' },
        'In Production': { status: 'In Production', color: 'blue', description: 'Currently in production' },
        'Planned': { status: 'Planned', color: 'purple', description: 'Planned for future release' },
        'Pilot': { status: 'Pilot', color: 'gray', description: 'Pilot episode only' }
      };
      return statusMap[status] || { status: status || 'Unknown', color: 'gray', description: 'Status unknown' };
    };

    const processedDate = processDate(tv.first_air_date);
    const statusInfo = getStatusInfo(tv.status);
    const genreNames = getGenreNames(tv.genre_ids || tv.genres?.map(g => g.id) || []);

    return {
      // Basic information
      id: tv.id,
      title: getTitle(tv),
      overview: tv.overview || '',
      poster: getImageUrl(tv.poster_path, 'w500'),
      backdrop: getImageUrl(tv.backdrop_path, 'original'),
      rating: tv.vote_average ? tv.vote_average.toFixed(1) : '0.0',
      year: processedDate ? processedDate.getFullYear() : null,
      duration: formatDuration(tv.episode_run_time?.[0]),
      runtime: tv.episode_run_time?.[0] || 0,
      genres: genreNames,
      genre_ids: tv.genre_ids || tv.genres?.map(g => g.id) || [],
      type: 'tv',
      
      // Enhanced metadata
      trailer: null, // Will be populated by videos API call
      network: tv.networks?.[0]?.name || null,
      networks: processNetworks(tv.networks),
      seasons: tv.number_of_seasons || 0,
      episodes: tv.number_of_episodes || 0,
      status: statusInfo.status,
      statusColor: statusInfo.color,
      statusDescription: statusInfo.description,
      lastAirDate: processDate(tv.last_air_date),
      nextEpisodeDate: processDate(tv.next_episode_to_air?.air_date),
      voteCount: tv.vote_count || 0,
      popularity: tv.popularity || 0,
      originalLanguage: tv.original_language || 'en',
      originalTitle: tv.original_name || getTitle(tv),
      director: null, // Will be populated by credits API call
      cast: null, // Will be populated by credits API call
      
      // Enhanced production information
      createdBy: tv.created_by?.map(creator => ({
        id: creator.id,
        name: creator.name,
        profilePath: getImageUrl(creator.profile_path, 'w185'),
        gender: creator.gender || null,
        creditId: creator.credit_id
      })) || [],
      productionCompanies: tv.production_companies?.map(company => ({
        id: company.id,
        name: company.name,
        logoPath: getImageUrl(company.logo_path, 'w185'),
        originCountry: company.origin_country
      })) || [],
      productionCountries: tv.production_countries?.map(country => ({
        iso31661: country.iso_3166_1,
        name: country.name
      })) || [],
      spokenLanguages: tv.spoken_languages?.map(lang => ({
        iso6391: lang.iso_639_1,
        name: lang.name
      })) || [],
      
      // Enhanced episode and season data
      episodeRunTime: tv.episode_run_time || [],
      seasonsData: processSeasons(tv.seasons || []),
      
      // Enhanced status tracking
      isProcessed: true,
      processedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error processing TV data:', error, tv);
    // Return a minimal valid object with error information
    return {
      id: tv.id || null,
      title: tv.name || 'Unknown Title',
      overview: '',
      poster: null,
      backdrop: null,
      rating: '0.0',
      year: null,
      duration: null,
      runtime: 0,
      genres: [],
      genre_ids: [],
      type: 'tv',
      error: error.message,
      isProcessed: false
    };
  }
};

// Optimized fetch movies function
const fetchMovies = async (endpoint, page = 1) => {
  try {
    const data = await fetchWithCache(
      `${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}&page=${page}`
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid API response');
    }
    
    return {
      movies: data.results.map(transformMovieData).filter(Boolean),
      totalPages: data.total_pages || 1,
      currentPage: data.page || 1,
      totalResults: data.total_results || 0
    };
  } catch (error) {
    console.error('Error fetching movies:', error);
    throw error;
  }
};

// Optimized getMovieDetails function
export const getMovieDetails = async (id, type = 'movie') => {
  try {
    // Check if this movie ID is known to not exist
    if (nonExistentMovieCache.has(`${type}_${id}`)) {
      console.debug(`🎯 Skipping request for non-existent ${type} ${id}`);
      return null;
    }

    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const data = await fetchWithCache(
      `${TMDB_BASE_URL}/${endpoint}/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits,similar,images&include_image_language=en`
    );

    if (!data) {
      // Cache this movie ID as non-existent to prevent future requests
      nonExistentMovieCache.add(`${type}_${id}`);
      console.debug(`🔍 Caching non-existent ${type} ${id}`);
      return null; // Not found
    }

    const baseData = type === 'movie' ? transformMovieData(data) : transformTVData(data);
    if (!baseData) {
      throw new Error('Failed to transform data');
    }

    // Get the English logo
    const logo = data.images?.logos?.find(logo => logo.iso_639_1 === 'en') || data.images?.logos?.[0];
    const logoUrl = logo ? `${TMDB_IMAGE_BASE_URL}/w300${logo.file_path}` : null;

    // Get backdrop with appropriate size
    const backdrop = data.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/w1280${data.backdrop_path}` : null;

    const trailer = data.videos?.results?.find(video => 
      video.type === 'Trailer' && video.site === 'YouTube'
    )?.key;

    const cast = data.credits?.cast?.slice(0, 6).map(person => ({
      name: person.name,
      character: person.character,
      image: person.profile_path ? `${TMDB_IMAGE_BASE_URL}/w185${person.profile_path}` : null
    })) || [];

    const director = data.credits?.crew?.find(person => person.job === 'Director')?.name;

    const similar = data.similar?.results?.slice(0, 6).map(item => 
      type === 'movie' ? transformMovieData(item) : transformTVData(item)
    ).filter(Boolean) || [];

    // Transform production companies
    const productionCompanies = data.production_companies?.map(company => ({
      id: company.id,
      name: company.name,
      logo_path: company.logo_path ? `${TMDB_IMAGE_BASE_URL}/w185${company.logo_path}` : null,
      origin_country: company.origin_country
    })) || [];

    // Transform spoken languages
    const spokenLanguages = data.spoken_languages?.map(lang => ({
      iso_639_1: lang.iso_639_1,
      name: lang.name,
      english_name: lang.english_name
    })) || [];

    // Transform genres
    const genres = data.genres?.map(genre => ({
      id: genre.id,
      name: genre.name
    })) || [];

    return {
      ...baseData,
      logo: logoUrl,
      backdrop,
      trailer,
      cast,
      director,
      similar,
      production_companies: productionCompanies,
      spoken_languages: spokenLanguages,
      genres,
      budget: data.budget,
      revenue: data.revenue,
      runtime: data.runtime,
      status: data.status,
      homepage: data.homepage,
      release_date: data.release_date || data.first_air_date,
      last_air_date: data.last_air_date,
      number_of_seasons: data.number_of_seasons,
      number_of_episodes: data.number_of_episodes,
      networks: data.networks?.map(network => ({
        id: network.id,
        name: network.name,
        logo_path: network.logo_path ? `${TMDB_IMAGE_BASE_URL}/w185${network.logo_path}` : null,
        origin_country: network.origin_country
      })) || [],
      created_by: data.created_by,
      episode_run_time: data.episode_run_time,
      next_episode_to_air: data.next_episode_to_air,
      seasons: data.seasons
    };
  } catch (error) {
    console.error('Error fetching movie details:', error);
    throw error;
  }
};

// Optimized getMovieCredits function
export const getMovieCredits = async (id, type = 'movie') => {
  try {
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const data = await fetchWithCache(
      `${TMDB_BASE_URL}/${endpoint}/${id}/credits?api_key=${TMDB_API_KEY}&language=en-US`
    );
    if (!data) return null; // Not found
    return data;
  } catch (error) {
    console.error('Error fetching credits:', error);
    throw error;
  }
};

// Optimized getMovieVideos function
export const getMovieVideos = async (id, type = 'movie') => {
  if (!id) return null;
  const url = `${TMDB_BASE_URL}/${type}/${id}/videos`;
  const data = await fetchWithCache(url, {}, 'DETAILS');
  if (!data) return null; // Not found
  return data;
};

// Enhanced getSimilarMovies function with intelligent recommendations
export const getSimilarMovies = async (id, type = 'movie', page = 1, options = {}) => {
  if (!id) return null;
  
  // Check if this movie ID is known to not exist
  if (nonExistentMovieCache.has(`${type}_${id}`)) {
    console.debug(`🎯 Skipping similar movies request for non-existent ${type} ${id}`);
    return null;
  }
  
  try {
    // For the initial similar movies fetch, use a more focused approach
    // that prioritizes actual similar content over generic popular content
    
    // First, try to get recommendations (most reliable for actual similar content)
    const recommendationsUrl = `${TMDB_BASE_URL}/${type}/${id}/recommendations?page=${page}`;
    const recommendationsData = await fetchWithCache(recommendationsUrl, {}, 'LIST');
    
    // Then, try to get similar content
    const similarUrl = `${TMDB_BASE_URL}/${type}/${id}/similar?page=${page}`;
    const similarData = await fetchWithCache(similarUrl, {}, 'LIST');
    
    // If both requests return null, cache this movie as non-existent
    if (!recommendationsData && !similarData) {
      nonExistentMovieCache.add(`${type}_${id}`);
      console.debug(`🔍 Caching non-existent ${type} ${id} (similar movies)`);
      return null;
    }
    
    // Combine and deduplicate results
    const allResults = [];
    const existingIds = new Set();
    
    // Add recommendations first (they're usually more relevant)
    if (recommendationsData && recommendationsData.results) {
      recommendationsData.results.forEach(item => {
        if (item && item.id && !existingIds.has(item.id)) {
          existingIds.add(item.id);
          allResults.push(item);
        }
      });
    }
    
    // Add similar content (avoiding duplicates)
    if (similarData && similarData.results) {
      similarData.results.forEach(item => {
        if (item && item.id && !existingIds.has(item.id)) {
          existingIds.add(item.id);
          allResults.push(item);
        }
      });
    }
    
    // If we have results, return them
    if (allResults.length > 0) {
      return {
        page: page,
        results: allResults,
        total_pages: Math.max(
          recommendationsData?.total_pages || 1,
          similarData?.total_pages || 1
        ),
        total_results: allResults.length
      };
    }
    
    // Fallback to original recommendations if no combined results
    if (recommendationsData) {
      return recommendationsData;
    }
    
    // Final fallback to similar data
    if (similarData) {
      return similarData;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching similar movies:', error);
    
    // Fallback to original implementation
    const url = `${TMDB_BASE_URL}/${type}/${id}/recommendations?page=${page}`;
    const data = await fetchWithCache(url, {}, 'LIST');
    if (!data) {
      // Cache this movie ID as non-existent to prevent future requests
      nonExistentMovieCache.add(`${type}_${id}`);
      console.debug(`🔍 Caching non-existent ${type} ${id} (fallback)`);
      return null; // Not found
    }
    return data;
  }
};

// Optimized getTrendingMovies function with better retry logic
export const getTrendingMovies = async (page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 503 && attempt < MAX_RETRIES) {
          const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
          console.log(`Attempt ${attempt} failed with 503, retrying in ${delay}ms...`);
          await sleep(delay);
          return fetchWithRetry(url, attempt + 1);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    // First, get trending content with retry logic
    const trendingData = await fetchWithRetry(
      `${TMDB_BASE_URL}/trending/all/week?page=${page}&api_key=${TMDB_API_KEY}`
    );

    if (!trendingData?.results) {
      throw new Error('Invalid trending movies response');
    }

    // Use a Map to ensure uniqueness by ID
    const uniqueMoviesMap = new Map();

    // Transform trending content first
    trendingData.results.forEach(item => {
      if (!uniqueMoviesMap.has(item.id)) {
        const transformed = item.media_type === 'movie' 
          ? transformMovieData(item)
          : transformTVData(item);
        if (transformed) {
          uniqueMoviesMap.set(item.id, transformed);
        }
      }
    });

    // Convert Map to array
    const uniqueMovies = Array.from(uniqueMoviesMap.values());

    // Get initial set of movies (first 6)
    const initialMovies = uniqueMovies.slice(0, 6);
    const remainingMovies = uniqueMovies.slice(6);

    // Fetch details for initial movies with delay between requests
    const initialMoviesWithDetails = [];
    for (const movie of initialMovies) {
      try {
        const details = await getMovieDetails(movie.id, movie.type);
        initialMoviesWithDetails.push({
          ...movie,
          director: details.director,
          cast: details.cast?.slice(0, 3),
          genres: details.genres || movie.genres,
          duration: movie.type === 'movie' 
            ? details.runtime 
              ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
              : null
            : details.episode_run_time?.[0]
              ? `${Math.floor(details.episode_run_time[0] / 60)}h ${details.episode_run_time[0] % 60}m`
              : null,
          network: details.networks?.[0]?.name || null,
          seasons: details.number_of_seasons || null,
          episodes: details.number_of_episodes || null,
          status: details.status || null,
          nextEpisodeDate: details.next_episode_to_air?.air_date || null,
          logo: details.logo || movie.logo
        });
        // Add a small delay between requests
        await sleep(100);
      } catch (error) {
        console.error(`Error fetching details for ${movie.title}:`, error);
        initialMoviesWithDetails.push(movie);
      }
    }

    // Combine initial detailed movies with remaining basic movies
    const moviesWithDetails = [...initialMoviesWithDetails, ...remainingMovies];

    // Queue additional content requests with lower priority and longer delays
    const additionalContent = [
      { network: 'Netflix', id: 213 },
      { network: 'HBO', id: 49 },
      { network: 'Prime', id: 1024 },
      { network: 'Disney+', id: 2739 },
      { network: 'Apple TV+', id: 2552 },
      { network: 'Hulu', id: 453 }
    ];

    // Queue each network request with lower priority and increasing delays
    additionalContent.forEach(({ network, id }, index) => {
      queueRequest(async () => {
        try {
          // Add increasing delay based on index
          await sleep(200 * (index + 1));
          const data = await fetchWithRetry(
            `${TMDB_BASE_URL}/discover/tv?with_networks=${id}&sort_by=popularity.desc&page=${page}&api_key=${TMDB_API_KEY}`
          );
          
          if (data?.results) {
            const networkMovies = data.results
              .map(item => {
                if (!uniqueMoviesMap.has(item.id)) {
                  const transformed = transformTVData(item);
                  if (transformed) {
                    uniqueMoviesMap.set(item.id, transformed);
                    return transformed;
                  }
                }
                return null;
              })
              .filter(Boolean);

            moviesWithDetails.push(...networkMovies);
          }
        } catch (error) {
          console.error(`Error fetching ${network} content:`, error);
        }
      }, false);
    });

    return {
      movies: moviesWithDetails,
      totalPages: trendingData.total_pages || 1,
      currentPage: page,
      totalResults: moviesWithDetails.length
    };
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      error: error.message
    };
  }
};

export const getPopularMovies = async (page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          // Rate limit hit, wait longer
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit hit, waiting ${retryAfter} seconds`);
          await sleep(retryAfter * 1000);
        } else if (response.status >= 500) {
          // Server error, retry with exponential backoff
          if (attempt <= MAX_RETRIES) {
            const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
            console.warn(`Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
            await sleep(delay);
            return fetchWithRetry(url, attempt + 1);
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    const data = await fetchWithRetry(
      `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=${page}&include_adult=false&language=en-US&region=US`
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid API response structure');
    }

    // Enhanced data validation and processing
    const validMovies = data.results
      .filter(movie => movie && movie.id && movie.title)
      .map(transformMovieData)
      .filter(Boolean);

    return {
      movies: validMovies,
      totalPages: data.total_pages || 1,
      currentPage: data.page || page,
      totalResults: data.total_results || validMovies.length,
      hasMore: (data.page || page) < (data.total_pages || 1)
    };
  } catch (error) {
    console.error('Error fetching popular movies:', error);
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      error: error.message
    };
  }
};

export const getTopRatedMovies = async (page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    const data = await fetchWithRetry(
      `${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&page=${page}&include_adult=false&language=en-US&region=US`
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid API response structure');
    }

    // Enhanced data validation and processing
    const validMovies = data.results
      .filter(movie => movie && movie.id && movie.title)
      .map(transformMovieData)
      .filter(Boolean);

    return {
      movies: validMovies,
      totalPages: data.total_pages || 1,
      currentPage: data.page || page,
      totalResults: data.total_results || validMovies.length,
      hasMore: (data.page || page) < (data.total_pages || 1)
    };
  } catch (error) {
    console.error('Error fetching top rated movies:', error);
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      error: error.message
    };
  }
};

export const getUpcomingMovies = async (page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;
  const PAGES_TO_FETCH = 3; // Fetch 3 pages at once for better coverage

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    // Enhanced data collection with parallel fetching and better error handling
    const fetchPromises = Array.from({ length: PAGES_TO_FETCH }, (_, i) => 
      fetchWithRetry(
        `${TMDB_BASE_URL}/movie/upcoming?api_key=${TMDB_API_KEY}&page=${page + i}&include_adult=false&language=en-US&region=US`
      ).catch(error => {
        console.warn(`Failed to fetch page ${page + i}:`, error.message);
        return { results: [] }; // Return empty results on failure
      })
    );

    const pageResults = await Promise.all(fetchPromises);
    const allMovies = pageResults.flatMap(data => data?.results || []);

    // Enhanced filtering with better date validation
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    const upcomingMovies = allMovies.filter(movie => {
      if (!movie?.release_date || !movie?.id || !movie?.title) return false;
      
      try {
        const releaseDate = new Date(movie.release_date);
        if (isNaN(releaseDate.getTime())) return false;
        
        releaseDate.setHours(0, 0, 0, 0); // Normalize to start of day
        return releaseDate > today;
      } catch (error) {
        console.warn(`Invalid release date for movie ${movie.id}: ${movie.release_date}`);
        return false;
      }
    });

    // Enhanced sorting with fallback to popularity
    upcomingMovies.sort((a, b) => {
      try {
        const dateA = new Date(a.release_date);
        const dateB = new Date(b.release_date);
        
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
          // Fallback to popularity sorting if dates are invalid
          return (b.popularity || 0) - (a.popularity || 0);
        }
        
        const dateComparison = dateA - dateB;
        if (dateComparison !== 0) return dateComparison;
        
        // If same date, sort by popularity
        return (b.popularity || 0) - (a.popularity || 0);
      } catch (error) {
        console.warn('Error sorting movies:', error);
        return 0;
      }
    });

    // Enhanced deduplication with better performance
    const uniqueMovies = upcomingMovies.reduce((acc, movie) => {
      if (!acc.some(existing => existing.id === movie.id)) {
        acc.push(movie);
      }
      return acc;
    }, []);

    // Enhanced data transformation with validation
    const transformedMovies = uniqueMovies
      .map(movie => {
        try {
          return transformMovieData(movie);
        } catch (error) {
          console.warn(`Error transforming movie ${movie.id}:`, error);
          return null;
        }
      })
      .filter(Boolean);

    // Enhanced pagination calculation
    const moviesPerPage = 20;
    const totalPages = Math.max(1, Math.ceil(uniqueMovies.length / moviesPerPage));
    const hasMore = page < totalPages;

    return {
      movies: transformedMovies,
      totalPages,
      currentPage: page,
      totalResults: uniqueMovies.length,
      hasMore,
      // Enhanced metadata
      fetchedPages: PAGES_TO_FETCH,
      uniqueMoviesCount: uniqueMovies.length,
      transformedMoviesCount: transformedMovies.length,
      // Enhanced error tracking
      errors: pageResults.filter(result => result.error).length
    };
  } catch (error) {
    console.error('Error fetching upcoming movies:', error);
    // Enhanced error response with more context
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      // Enhanced debugging info
      fetchedPages: 0,
      uniqueMoviesCount: 0,
      transformedMoviesCount: 0
    };
  }
};

// Enhanced genre fetching with comprehensive error handling, caching, and multi-language support
export const getGenres = async (language = 'en-US', includeTV = true) => {
  const CACHE_KEY = `genres_${language}_${includeTV}`;
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  try {
    // Check cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }

    // Fetch movie genres
    const movieResponse = await fetchWithCache(
      `${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}&language=${language}`
    );

    let allGenres = movieResponse.genres || [];

    // Optionally fetch TV genres and merge them
    if (includeTV) {
      try {
        const tvResponse = await fetchWithCache(
          `${TMDB_BASE_URL}/genre/tv/list?api_key=${TMDB_API_KEY}&language=${language}`
        );
        
        const tvGenres = tvResponse.genres || [];
        
        // Merge genres, avoiding duplicates by ID
        const genreMap = new Map();
        
        // Add movie genres first
        allGenres.forEach(genre => {
          genreMap.set(genre.id, { ...genre, type: 'movie' });
        });
        
        // Add TV genres, updating existing ones to be multi-type
        tvGenres.forEach(genre => {
          if (genreMap.has(genre.id)) {
            const existing = genreMap.get(genre.id);
            genreMap.set(genre.id, { ...existing, type: 'both' });
          } else {
            genreMap.set(genre.id, { ...genre, type: 'tv' });
          }
        });
        
        allGenres = Array.from(genreMap.values());
      } catch (tvError) {
        console.warn('Failed to fetch TV genres, using movie genres only:', tvError);
      }
    }

    // Enhanced genre data with additional metadata
    const enhancedGenres = allGenres.map(genre => ({
      ...genre,
      slug: genre.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      displayName: genre.name,
      count: 0, // Will be populated by usage tracking
      popularity: 0, // Will be populated by usage tracking
      lastUpdated: new Date().toISOString()
    }));

    const result = {
      genres: enhancedGenres,
      total: enhancedGenres.length,
      language,
      includeTV,
      fetchedAt: new Date().toISOString(),
      metadata: {
        movieGenres: allGenres.filter(g => g.type === 'movie' || g.type === 'both').length,
        tvGenres: allGenres.filter(g => g.type === 'tv' || g.type === 'both').length,
        sharedGenres: allGenres.filter(g => g.type === 'both').length
      }
    };

    // Cache the result
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: result,
        timestamp: Date.now()
      }));
    } catch (cacheError) {
      console.warn('Failed to cache genres:', cacheError);
    }

    return result;
  } catch (error) {
    console.error('Error fetching genres:', error);
    
    // Enhanced error response with fallback data
    const fallbackGenres = [
      { id: 28, name: 'Action', type: 'movie', slug: 'action' },
      { id: 35, name: 'Comedy', type: 'movie', slug: 'comedy' },
      { id: 18, name: 'Drama', type: 'movie', slug: 'drama' },
      { id: 27, name: 'Horror', type: 'movie', slug: 'horror' },
      { id: 10749, name: 'Romance', type: 'movie', slug: 'romance' },
      { id: 878, name: 'Science Fiction', type: 'movie', slug: 'science-fiction' }
    ];

    return {
      genres: fallbackGenres,
      total: fallbackGenres.length,
      language,
      includeTV,
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      isFallback: true,
      metadata: {
        movieGenres: fallbackGenres.length,
        tvGenres: 0,
        sharedGenres: 0
      }
    };
  }
};

export const getMoviesByGenre = async (genreId, page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;
  const DETAILS_BATCH_SIZE = 8; // Increased from 6 for better coverage

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit hit, waiting ${retryAfter} seconds`);
          await sleep(retryAfter * 1000);
        } else if (response.status >= 500) {
          if (attempt <= MAX_RETRIES) {
            const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
            console.warn(`Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
            await sleep(delay);
            return fetchWithRetry(url, attempt + 1);
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    // Enhanced API call with better parameters
    const data = await fetchWithRetry(
      `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&page=${page}&sort_by=popularity.desc&include_adult=false&language=en-US&region=US&vote_count.gte=10`
    );

    if (!data || !data.results) {
      throw new Error('Invalid API response structure');
    }

    // Enhanced data validation and processing
    const initialMovies = data.results
      .filter(movie => movie && movie.id && movie.title)
      .map(transformMovieData)
      .filter(Boolean);

    // Enhanced batch processing with better error handling and rate limiting
    const processMovieBatch = async (movies, startIndex, batchSize) => {
      const batch = movies.slice(startIndex, startIndex + batchSize);
      const results = [];

      for (let i = 0; i < batch.length; i++) {
        const movie = batch[i];
        try {
          // Add delay between requests to respect rate limits
          if (i > 0) await sleep(100);
          
          const details = await getMovieDetails(movie.id, 'movie');
          const enhancedMovie = {
            ...movie,
            runtime: details?.runtime || 0,
            duration: details?.runtime ? 
              `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m` : 
              null,
            // Enhanced metadata from details
            budget: details?.budget || 0,
            revenue: details?.revenue || 0,
            status: details?.status || 'Unknown',
            homepage: details?.homepage || null,
            production_companies: details?.production_companies || [],
            spoken_languages: details?.spoken_languages || [],
            cast: details?.cast || [],
            director: details?.director || null,
            trailer: details?.trailer || null,
            logo: details?.logo || null,
            backdrop: details?.backdrop || movie.backdrop
          };
          results.push(enhancedMovie);
        } catch (error) {
          console.warn(`Error fetching details for movie ${movie.id}:`, error.message);
          // Return movie with basic info if details fetch fails
          results.push({
            ...movie,
            runtime: 0,
            duration: null,
            error: error.message
          });
        }
      }
      return results;
    };

    // Process movies in batches with enhanced error handling
    const moviesWithDetails = await processMovieBatch(initialMovies, 0, DETAILS_BATCH_SIZE);
    const remainingMovies = initialMovies.slice(DETAILS_BATCH_SIZE);

    // Enhanced response with comprehensive metadata
    const allMovies = [...moviesWithDetails, ...remainingMovies];

    return {
      movies: allMovies,
      totalPages: data.total_pages || 1,
      currentPage: data.page || page,
      totalResults: data.total_results || allMovies.length,
      hasMore: (data.page || page) < (data.total_pages || 1),
      genreId,
      metadata: {
        processedWithDetails: moviesWithDetails.length,
        totalProcessed: allMovies.length,
        averageRuntime: moviesWithDetails.length > 0 ? 
          Math.round(moviesWithDetails.reduce((sum, m) => sum + (m.runtime || 0), 0) / moviesWithDetails.length) : 
          0,
        processedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error(`Error fetching movies for genre ${genreId}:`, error);
    
    // Enhanced error response with fallback data
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      genreId,
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      metadata: {
        processedWithDetails: 0,
        totalProcessed: 0,
        averageRuntime: 0,
        isError: true
      }
    };
  }
};

export const getActionMovies = async (page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          // Rate limit hit, wait longer
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit hit, waiting ${retryAfter} seconds`);
          await sleep(retryAfter * 1000);
        } else if (response.status >= 500) {
          // Server error, retry with exponential backoff
          if (attempt <= MAX_RETRIES) {
            const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
            console.warn(`Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
            await sleep(delay);
            return fetchWithRetry(url, attempt + 1);
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    // Enhanced action movies fetching with better filtering and sorting
    const data = await fetchWithRetry(
      `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=28&page=${page}&language=en-US&sort_by=popularity.desc&include_adult=false&vote_count.gte=50&vote_average.gte=5.0`
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid API response structure for action movies');
    }

    // Enhanced data validation and processing with action-specific filtering
    const validActionMovies = data.results
      .filter(movie => {
        // Ensure it's a valid action movie with required fields
        if (!movie || !movie.id || !movie.title) return false;
        
        // Filter for movies that actually have action elements
        const hasActionGenre = movie.genre_ids && movie.genre_ids.includes(28);
        const hasReasonableRating = movie.vote_average >= 5.0;
        const hasEnoughVotes = movie.vote_count >= 50;
        
        return hasActionGenre && hasReasonableRating && hasEnoughVotes;
      })
      .map(transformMovieData)
      .filter(Boolean);

    // Enhanced response with action-specific metadata
    return {
      movies: validActionMovies,
      totalPages: data.total_pages || 1,
      currentPage: data.page || page,
      totalResults: data.total_results || validActionMovies.length,
      hasMore: (data.page || page) < (data.total_pages || 1),
      genreId: 28,
      genreName: 'Action',
      metadata: {
        averageRating: validActionMovies.length > 0 ? 
          Math.round((validActionMovies.reduce((sum, m) => sum + parseFloat(m.rating || 0), 0) / validActionMovies.length) * 10) / 10 : 
          0,
        averageVoteCount: validActionMovies.length > 0 ? 
          Math.round(validActionMovies.reduce((sum, m) => sum + (m.vote_count || 0), 0) / validActionMovies.length) : 
          0,
        releaseYearRange: validActionMovies.length > 0 ? {
          min: Math.min(...validActionMovies.map(m => m.year || 0).filter(y => y > 0)),
          max: Math.max(...validActionMovies.map(m => m.year || 0).filter(y => y > 0))
        } : null,
        processedAt: new Date().toISOString(),
        filterCriteria: {
          minRating: 5.0,
          minVoteCount: 50,
          sortBy: 'popularity.desc'
        }
      }
    };
  } catch (error) {
    console.error('Error fetching action movies:', error);
    
    // Enhanced error response with fallback data
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      genreId: 28,
      genreName: 'Action',
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      metadata: {
        averageRating: 0,
        averageVoteCount: 0,
        releaseYearRange: null,
        isError: true,
        filterCriteria: {
          minRating: 5.0,
          minVoteCount: 50,
          sortBy: 'popularity.desc'
        }
      }
    };
  }
};

export const getComedyMovies = async (page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;
  const DETAILS_BATCH_SIZE = 8;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit hit, waiting ${retryAfter} seconds`);
          await sleep(retryAfter * 1000);
        } else if (response.status >= 500) {
          if (attempt <= MAX_RETRIES) {
            const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
            console.warn(`Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
            await sleep(delay);
            return fetchWithRetry(url, attempt + 1);
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    // Enhanced API call with better parameters for comedy movies
    const data = await fetchWithRetry(
      `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=35&page=${page}&sort_by=popularity.desc&include_adult=false&language=en-US&region=US&vote_count.gte=10&vote_average.gte=5.0`
    );

    if (!data || !data.results) {
      throw new Error('Invalid API response structure');
    }

    // Enhanced data validation and processing
    const validComedyMovies = data.results
      .filter(movie => movie && movie.id && movie.title && movie.genre_ids?.includes(35))
      .map(transformMovieData)
      .filter(Boolean);

    // Enhanced metadata calculation
    const averageRating = validComedyMovies.length > 0 ? 
      Math.round((validComedyMovies.reduce((sum, m) => sum + parseFloat(m.rating || 0), 0) / validComedyMovies.length) * 10) / 10 : 
      0;

    const averageVoteCount = validComedyMovies.length > 0 ? 
      Math.round(validComedyMovies.reduce((sum, m) => sum + (m.vote_count || 0), 0) / validComedyMovies.length) : 
      0;

    const releaseYearRange = validComedyMovies.length > 0 ? {
      min: Math.min(...validComedyMovies.map(m => m.year || 0).filter(y => y > 0)),
      max: Math.max(...validComedyMovies.map(m => m.year || 0).filter(y => y > 0))
    } : null;

    return {
      movies: validComedyMovies,
      totalPages: data.total_pages || 1,
      currentPage: data.page || page,
      totalResults: data.total_results || validComedyMovies.length,
      hasMore: (data.page || page) < (data.total_pages || 1),
      genreId: 35,
      genreName: 'Comedy',
      metadata: {
        averageRating,
        averageVoteCount,
        releaseYearRange,
        processedAt: new Date().toISOString(),
        filterCriteria: {
          minRating: 5.0,
          minVoteCount: 10,
          sortBy: 'popularity.desc'
        }
      }
    };
  } catch (error) {
    console.error('Error fetching comedy movies:', error);
    
    // Enhanced error response with fallback data
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      genreId: 35,
      genreName: 'Comedy',
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      metadata: {
        averageRating: 0,
        averageVoteCount: 0,
        releaseYearRange: null,
        isError: true,
        filterCriteria: {
          minRating: 5.0,
          minVoteCount: 10,
          sortBy: 'popularity.desc'
        }
      }
    };
  }
};

export const getDramaMovies = async (page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit hit, waiting ${retryAfter} seconds`);
          await sleep(retryAfter * 1000);
        } else if (response.status >= 500) {
          if (attempt <= MAX_RETRIES) {
            const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
            console.warn(`Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
            await sleep(delay);
            return fetchWithRetry(url, attempt + 1);
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    // Enhanced drama movies fetching with better filtering and sorting
    const data = await fetchWithRetry(
      `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=18&page=${page}&language=en-US&sort_by=popularity.desc&include_adult=false&vote_count.gte=50&vote_average.gte=5.0`
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid API response structure for drama movies');
    }

    // Enhanced data validation and processing with drama-specific filtering
    const validDramaMovies = data.results
      .filter(movie => {
        if (!movie || !movie.id || !movie.title) return false;
        
        const hasDramaGenre = movie.genre_ids && movie.genre_ids.includes(18);
        const hasReasonableRating = movie.vote_average >= 5.0;
        const hasEnoughVotes = movie.vote_count >= 50;
        
        return hasDramaGenre && hasReasonableRating && hasEnoughVotes;
      })
      .map(transformMovieData)
      .filter(Boolean);

    // Enhanced response with drama-specific metadata
    const averageRating = validDramaMovies.length > 0 ? 
      Math.round((validDramaMovies.reduce((sum, m) => sum + parseFloat(m.rating || 0), 0) / validDramaMovies.length) * 10) / 10 : 
      0;

    const averageVoteCount = validDramaMovies.length > 0 ? 
      Math.round(validDramaMovies.reduce((sum, m) => sum + (m.vote_count || 0), 0) / validDramaMovies.length) : 
      0;

    const releaseYearRange = validDramaMovies.length > 0 ? {
      min: Math.min(...validDramaMovies.map(m => m.year || 0).filter(y => y > 0)),
      max: Math.max(...validDramaMovies.map(m => m.year || 0).filter(y => y > 0))
    } : null;

    return {
      movies: validDramaMovies,
      totalPages: data.total_pages || 1,
      currentPage: data.page || page,
      totalResults: data.total_results || validDramaMovies.length,
      hasMore: (data.page || page) < (data.total_pages || 1),
      genreId: 18,
      genreName: 'Drama',
      metadata: {
        averageRating,
        averageVoteCount,
        releaseYearRange,
        processedAt: new Date().toISOString(),
        filterCriteria: {
          minRating: 5.0,
          minVoteCount: 50,
          sortBy: 'popularity.desc'
        }
      }
    };
  } catch (error) {
    console.error('Error fetching drama movies:', error);
    
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      genreId: 18,
      genreName: 'Drama',
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      metadata: {
        averageRating: 0,
        averageVoteCount: 0,
        releaseYearRange: null,
        isError: true,
        filterCriteria: {
          minRating: 5.0,
          minVoteCount: 50,
          sortBy: 'popularity.desc'
        }
      }
    };
  }
};

export const getHorrorMovies = async (page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;
  const DETAILS_BATCH_SIZE = 8; // Increased for better coverage

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit hit, waiting ${retryAfter} seconds`);
          await sleep(retryAfter * 1000);
        } else if (response.status >= 500) {
          if (attempt <= MAX_RETRIES) {
            const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
            console.warn(`Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
            await sleep(delay);
            return fetchWithRetry(url, attempt + 1);
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    // Enhanced horror movies fetching with better filtering and sorting
    const data = await fetchWithRetry(
      `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=27&page=${page}&language=en-US&sort_by=popularity.desc&include_adult=false&vote_count.gte=30&vote_average.gte=4.5`
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid API response structure for horror movies');
    }

    // Enhanced data validation and processing with horror-specific filtering
    const validHorrorMovies = data.results
      .filter(movie => {
        if (!movie || !movie.id || !movie.title) return false;
        
        const hasHorrorGenre = movie.genre_ids && movie.genre_ids.includes(27);
        const hasReasonableRating = movie.vote_average >= 4.5;
        const hasEnoughVotes = movie.vote_count >= 30;
        
        return hasHorrorGenre && hasReasonableRating && hasEnoughVotes;
      })
      .map(transformMovieData)
      .filter(Boolean);

    // Enhanced response with horror-specific metadata
    const averageRating = validHorrorMovies.length > 0 ? 
      Math.round((validHorrorMovies.reduce((sum, m) => sum + parseFloat(m.rating || 0), 0) / validHorrorMovies.length) * 10) / 10 : 
      0;

    const averageVoteCount = validHorrorMovies.length > 0 ? 
      Math.round(validHorrorMovies.reduce((sum, m) => sum + (m.vote_count || 0), 0) / validHorrorMovies.length) : 
      0;

    const releaseYearRange = validHorrorMovies.length > 0 ? {
      min: Math.min(...validHorrorMovies.map(m => new Date(m.release_date).getFullYear())),
      max: Math.max(...validHorrorMovies.map(m => new Date(m.release_date).getFullYear()))
    } : null;

    return {
      movies: validHorrorMovies,
      totalPages: data.total_pages || 1,
      currentPage: data.page || page,
      totalResults: data.total_results || validHorrorMovies.length,
      hasMore: (data.page || page) < (data.total_pages || 1),
      genreId: 27,
      genreName: 'Horror',
      metadata: {
        averageRating,
        averageVoteCount,
        releaseYearRange,
        processedAt: new Date().toISOString(),
        filterCriteria: {
          minRating: 4.5,
          minVoteCount: 30,
          sortBy: 'popularity.desc'
        }
      }
    };
  } catch (error) {
    console.error('Error fetching horror movies:', error);
    
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      genreId: 27,
      genreName: 'Horror',
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      metadata: {
        averageRating: 0,
        averageVoteCount: 0,
        releaseYearRange: null,
        isError: true,
        filterCriteria: {
          minRating: 4.5,
          minVoteCount: 30,
          sortBy: 'popularity.desc'
        }
      }
    };
  }
};

export const getSciFiMovies = async (page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit hit, waiting ${retryAfter} seconds`);
          await sleep(retryAfter * 1000);
        } else if (response.status >= 500) {
          if (attempt <= MAX_RETRIES) {
            const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
            console.warn(`Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
            await sleep(delay);
            return fetchWithRetry(url, attempt + 1);
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    // Enhanced Sci-Fi movies fetching with better filtering and sorting
    const data = await fetchWithRetry(
      `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=878&page=${page}&language=en-US&sort_by=popularity.desc&include_adult=false&vote_count.gte=20&vote_average.gte=4.5`
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid API response structure for Sci-Fi movies');
    }

    // Enhanced data validation and processing with Sci-Fi-specific filtering
    const validSciFiMovies = data.results
      .filter(movie => {
        // Ensure it's a valid Sci-Fi movie with required fields
        if (!movie || !movie.id || !movie.title) return false;
        
        // Filter for movies that actually have Sci-Fi elements
        const hasSciFiGenre = movie.genre_ids && movie.genre_ids.includes(878);
        const hasReasonableRating = movie.vote_average >= 4.5;
        const hasEnoughVotes = movie.vote_count >= 20;
        
        return hasSciFiGenre && hasReasonableRating && hasEnoughVotes;
      })
      .map(transformMovieData)
      .filter(Boolean);

    // Calculate metadata for Sci-Fi movies
    const averageRating = validSciFiMovies.length > 0 ? 
      Math.round((validSciFiMovies.reduce((sum, m) => sum + parseFloat(m.rating || 0), 0) / validSciFiMovies.length) * 10) / 10 : 
      0;
    
    const averageVoteCount = validSciFiMovies.length > 0 ? 
      Math.round(validSciFiMovies.reduce((sum, m) => sum + (m.vote_count || 0), 0) / validSciFiMovies.length) : 
      0;
    
    const releaseYearRange = validSciFiMovies.length > 0 ? {
      min: Math.min(...validSciFiMovies.map(m => m.year || 0).filter(y => y > 0)),
      max: Math.max(...validSciFiMovies.map(m => m.year || 0).filter(y => y > 0))
    } : null;

    return {
      movies: validSciFiMovies,
      totalPages: data.total_pages || 1,
      currentPage: data.page || page,
      totalResults: data.total_results || validSciFiMovies.length,
      hasMore: (data.page || page) < (data.total_pages || 1),
      genreId: 878,
      genreName: 'Science Fiction',
      metadata: {
        averageRating,
        averageVoteCount,
        releaseYearRange,
        processedAt: new Date().toISOString(),
        filterCriteria: {
          minRating: 4.5,
          minVoteCount: 20,
          sortBy: 'popularity.desc'
        }
      }
    };
  } catch (error) {
    console.error('Error fetching Sci-Fi movies:', error);
    
    // Enhanced error response with fallback data
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      genreId: 878,
      genreName: 'Science Fiction',
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      metadata: {
        averageRating: 0,
        averageVoteCount: 0,
        releaseYearRange: null,
        isError: true,
        filterCriteria: {
          minRating: 4.5,
          minVoteCount: 20,
          sortBy: 'popularity.desc'
        }
      }
    };
  }
};

export const getDocumentaryMovies = async (page = 1) => {
  return getMoviesByGenre(99, page); // Documentary genre ID
};

export const getFamilyMovies = async (page = 1) => {
  return getMoviesByGenre(10751, page); // Family genre ID
};

export const getAnimationMovies = async (page = 1) => {
  return getMoviesByGenre(16, page); // Animation genre ID
};

export const getAwardWinningMovies = async (page = 1) => {
  try {
    // Use fetchWithCache instead of direct fetch for better caching and error handling
    const data = await fetchWithCache(
      `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&page=${page}&language=en-US&sort_by=vote_average.desc&vote_count.gte=1000&include_adult=true`
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid API response for award winning movies');
    }

    // Transform the results using the existing transformMovieData function
    const movies = data.results
      .map(transformMovieData)
      .filter(Boolean); // Remove any null results

    return {
      movies,
      totalPages: data.total_pages || 1,
      currentPage: data.page || 1,
      totalResults: data.total_results || movies.length
    };
  } catch (error) {
    console.error('Error fetching award winning movies:', error);
    // Return a default response instead of throwing
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      error: error.message
    };
  }
};

export const getLatestMovies = async (page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit hit, waiting ${retryAfter} seconds`);
          await sleep(retryAfter * 1000);
        } else if (response.status >= 500) {
          if (attempt <= MAX_RETRIES) {
            const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
            console.warn(`Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
            await sleep(delay);
            return fetchWithRetry(url, attempt + 1);
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    // Enhanced latest movies fetching with better filtering and error handling
    const data = await fetchWithRetry(
      `${TMDB_BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&page=${page}&language=en-US&region=US&include_adult=false`
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid API response structure for latest movies');
    }

    // Enhanced data validation and processing
    const validLatestMovies = data.results
      .filter(movie => movie && movie.id && movie.title)
      .map(transformMovieData)
      .filter(Boolean);

    // Calculate metadata for latest movies
    const averageRating = validLatestMovies.length > 0 ? 
      Math.round((validLatestMovies.reduce((sum, m) => sum + parseFloat(m.rating || 0), 0) / validLatestMovies.length) * 10) / 10 : 
      0;

    const averageVoteCount = validLatestMovies.length > 0 ? 
      Math.round(validLatestMovies.reduce((sum, m) => sum + (m.vote_count || 0), 0) / validLatestMovies.length) : 
      0;

    const releaseYearRange = validLatestMovies.length > 0 ? {
      min: Math.min(...validLatestMovies.map(m => m.year || 0).filter(y => y > 0)),
      max: Math.max(...validLatestMovies.map(m => m.year || 0).filter(y => y > 0))
    } : null;

    return {
      movies: validLatestMovies,
      totalPages: data.total_pages || 1,
      currentPage: data.page || page,
      totalResults: data.total_results || validLatestMovies.length,
      hasMore: (data.page || page) < (data.total_pages || 1),
      genreId: null, // Latest movies span multiple genres
      genreName: 'Latest Releases',
      metadata: {
        averageRating,
        averageVoteCount,
        releaseYearRange,
        processedAt: new Date().toISOString(),
        filterCriteria: {
          region: 'US',
          includeAdult: false,
          sortBy: 'release_date.desc'
        }
      }
    };
  } catch (error) {
    console.error('Error fetching latest movies:', error);
    
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      genreId: null,
      genreName: 'Latest Releases',
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      metadata: {
        averageRating: 0,
        averageVoteCount: 0,
        releaseYearRange: null,
        isError: true,
        filterCriteria: {
          region: 'US',
          includeAdult: false,
          sortBy: 'release_date.desc'
        }
      }
    };
  }
};

// Helper function to format runtime in minutes to hours and minutes
const formatRuntime = (minutes) => {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 
    ? `${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ''}`
    : `${remainingMinutes}m`;
};

// Enhanced movies by category with retry logic, pagination, and comprehensive error handling
export const getMoviesByCategory = async (category, page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;
  const VALID_CATEGORIES = ['popular', 'top_rated', 'upcoming', 'now_playing'];

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit hit for category ${category}, waiting ${retryAfter} seconds`);
          await sleep(retryAfter * 1000);
          return fetchWithRetry(url, attempt + 1);
        } else if (response.status >= 500) {
          if (attempt <= MAX_RETRIES) {
            const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
            console.warn(`Server error ${response.status} for category ${category}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
            await sleep(delay);
            return fetchWithRetry(url, attempt + 1);
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError' && error.name !== 'AbortError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed for category ${category}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    // Validate and format category
    const formattedCategory = category.toLowerCase().replace(/[^a-z_]/g, '');
    
    if (!VALID_CATEGORIES.includes(formattedCategory)) {
      throw new Error(`Invalid category: ${category}. Valid categories are: ${VALID_CATEGORIES.join(', ')}`);
    }

    // Enhanced API call with better parameters
    const data = await fetchWithRetry(
      `${TMDB_BASE_URL}/movie/${formattedCategory}?api_key=${TMDB_API_KEY}&language=en-US&page=${page}&region=US&include_adult=false`
    );

    if (!data || !data.results) {
      throw new Error(`Invalid API response structure for category: ${formattedCategory}`);
    }

    // Enhanced data validation and processing
    const validMovies = data.results.filter(movie => 
      movie && 
      movie.id && 
      movie.title && 
      movie.poster_path && 
      movie.release_date &&
      movie.vote_average >= 0
    );

    // Calculate metadata
    const averageRating = validMovies.length > 0 ? 
      Math.round((validMovies.reduce((sum, m) => sum + parseFloat(m.vote_average || 0), 0) / validMovies.length) * 10) / 10 : 
      0;

    const averageVoteCount = validMovies.length > 0 ? 
      Math.round(validMovies.reduce((sum, m) => sum + (m.vote_count || 0), 0) / validMovies.length) : 
      0;

    const releaseYearRange = validMovies.length > 0 ? {
      min: Math.min(...validMovies.map(m => new Date(m.release_date).getFullYear()).filter(y => y > 1900)),
      max: Math.max(...validMovies.map(m => new Date(m.release_date).getFullYear()).filter(y => y > 1900))
    } : null;

    return {
      movies: validMovies,
      totalPages: data.total_pages || 1,
      currentPage: data.page || page,
      totalResults: data.total_results || validMovies.length,
      hasMore: (data.page || page) < (data.total_pages || 1),
      category: formattedCategory,
      categoryDisplayName: formattedCategory.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '),
      metadata: {
        averageRating,
        averageVoteCount,
        releaseYearRange,
        processedAt: new Date().toISOString(),
        filterCriteria: {
          region: 'US',
          includeAdult: false,
          language: 'en-US'
        }
      }
    };
  } catch (error) {
    console.error(`Error fetching movies for category ${category}:`, error);
    
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      category: category?.toLowerCase().replace(/[^a-z_]/g, '') || 'unknown',
      categoryDisplayName: category || 'Unknown Category',
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      metadata: {
        averageRating: 0,
        averageVoteCount: 0,
        releaseYearRange: null,
        isError: true,
        filterCriteria: {
          region: 'US',
          includeAdult: false,
          language: 'en-US'
        }
      }
    };
  }
};

// Enhanced discover movies with comprehensive filtering, retry logic, and proper error handling
export const discoverMovies = async ({ 
  with_genres, 
  primary_release_year, 
  sort_by = 'popularity.desc',
  page = 1,
  vote_count_gte = 10,
  vote_average_gte = 0,
  include_adult = false,
  with_keywords,
  without_keywords,
  with_cast,
  with_crew,
  with_companies,
  with_runtime_gte,
  with_runtime_lte,
  with_release_type,
  with_original_language,
  with_watch_providers,
  watch_region = 'US'
}) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit hit, waiting ${retryAfter} seconds`);
          await sleep(retryAfter * 1000);
          return fetchWithRetry(url, attempt + 1);
        } else if (response.status >= 500 && attempt <= MAX_RETRIES) {
          const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
          console.warn(`Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
          await sleep(delay);
          return fetchWithRetry(url, attempt + 1);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Request timed out');
      }
      
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    // Build URL with comprehensive filtering options
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: 'en-US',
      sort_by: sort_by,
      page: page.toString(),
      include_adult: include_adult.toString(),
      vote_count_gte: vote_count_gte.toString(),
      vote_average_gte: vote_average_gte.toString(),
      watch_region: watch_region
    });

    if (with_genres) {
      params.append('with_genres', with_genres);
    }
    
    if (primary_release_year) {
      params.append('primary_release_year', primary_release_year.toString());
    }

    if (with_keywords) {
      params.append('with_keywords', with_keywords);
    }

    if (without_keywords) {
      params.append('without_keywords', without_keywords);
    }

    if (with_cast) {
      params.append('with_cast', with_cast);
    }

    if (with_crew) {
      params.append('with_crew', with_crew);
    }

    if (with_companies) {
      params.append('with_companies', with_companies);
    }

    if (with_runtime_gte) {
      params.append('with_runtime_gte', with_runtime_gte.toString());
    }

    if (with_runtime_lte) {
      params.append('with_runtime_lte', with_runtime_lte.toString());
    }

    if (with_release_type) {
      params.append('with_release_type', with_release_type);
    }

    if (with_original_language) {
      params.append('with_original_language', with_original_language);
    }

    if (with_watch_providers) {
      params.append('with_watch_providers', with_watch_providers);
    }

    const url = `${TMDB_BASE_URL}/discover/movie?${params.toString()}`;
    
    const data = await fetchWithRetry(url);
    
    if (!data || !data.results) {
      throw new Error('Invalid API response structure for movie discovery');
    }

    // Transform and validate the results
    const validMovies = data.results
      .map(transformMovieData)
      .filter(Boolean);

    // Calculate metadata
    const averageRating = validMovies.length > 0 ? 
      Math.round(validMovies.reduce((sum, m) => sum + (m.vote_average || 0), 0) / validMovies.length * 10) / 10 : 0;
    
    const averageVoteCount = validMovies.length > 0 ? 
      Math.round(validMovies.reduce((sum, m) => sum + (m.vote_count || 0), 0) / validMovies.length) : 0;

    const releaseYearRange = validMovies.length > 0 ? {
      min: Math.min(...validMovies.map(m => new Date(m.release_date).getFullYear())),
      max: Math.max(...validMovies.map(m => new Date(m.release_date).getFullYear()))
    } : null;

    return {
      movies: validMovies,
      totalPages: data.total_pages || 1,
      currentPage: data.page || page,
      totalResults: data.total_results || validMovies.length,
      hasMore: (data.page || page) < (data.total_pages || 1),
      metadata: {
        averageRating,
        averageVoteCount,
        releaseYearRange,
        processedAt: new Date().toISOString(),
        filterCriteria: {
          with_genres,
          primary_release_year,
          sort_by,
          vote_count_gte,
          vote_average_gte,
          include_adult,
          watch_region
        }
      }
    };
  } catch (error) {
    console.error('Error discovering movies:', error);
    
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      metadata: {
        averageRating: 0,
        averageVoteCount: 0,
        releaseYearRange: null,
        isError: true,
        filterCriteria: {
          with_genres,
          primary_release_year,
          sort_by,
          vote_count_gte,
          vote_average_gte,
          include_adult,
          watch_region
        }
      }
    };
  }
};

// Enhanced search movies with advanced retry logic, caching, comprehensive error handling, and performance optimizations
export const searchMovies = async (query, page = 1, options = {}) => {
  const {
    includeAdult = true,
    language = 'en-US',
    region = 'US',
    maxRetries = 5,
    initialRetryDelay = 2000,
    maxRetryDelay = 10000,
    timeout = 12000,
    enableCaching = true,
    cacheExpiry = 5 * 60 * 1000, // 5 minutes
    sortBy = 'popularity.desc',
    enableMetrics = true,
    enableCompression = true,
    batchSize = 10,
    searchType = 'multi', // 'multi', 'movie', 'tv', 'person'
    enableFuzzySearch = true,
    enableSpellCheck = true,
    maxResults = 1000
  } = options;

  const RESULTS_PER_PAGE = 20;
  const CACHE_KEY = `search_${btoa(query)}_${page}_${btoa(JSON.stringify(options))}`;
  const metrics = {
    startTime: Date.now(),
    cacheHits: 0,
    retryCount: 0,
    requestCount: 0,
    errors: [],
    searchStrategies: [],
    performance: {}
  };

  // Enhanced sleep function with exponential backoff and jitter
  const sleep = (ms, attempt = 1) => {
    const jitter = Math.random() * 0.1 * ms; // 10% jitter
    const actualDelay = ms + jitter;
    console.debug(`Sleeping for ${actualDelay.toFixed(0)}ms (attempt ${attempt})...`);
    return new Promise(resolve => setTimeout(resolve, actualDelay));
  };

  // Advanced fetch with retry logic, timeout, compression, and comprehensive error handling
  const fetchWithRetry = async (url, attempt = 1, customTimeout = timeout) => {
    const startTime = Date.now();
    metrics.requestCount++;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn(`Request timeout after ${customTimeout}ms: ${url}`);
      }, customTimeout);

      console.debug(`Fetching URL (attempt ${attempt}): ${url}`);
      
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'MovieApp/2.0',
        'Accept-Encoding': enableCompression ? 'gzip, deflate, br' : 'identity'
      };

      const response = await fetch(url, {
        signal: controller.signal,
        headers,
        compress: enableCompression
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      console.debug(`Request completed in ${duration}ms with status ${response.status}`);

      // Enhanced status code handling with detailed error categorization
      if (!response.ok) {
        const errorData = await response.text().catch(() => 'No error details');
        const errorInfo = {
          status: response.status,
          statusText: response.statusText,
          url,
          attempt,
          duration,
          details: errorData
        };
        
        if (response.status === 404) {
          console.info('Resource not found, returning null');
          return null;
        }
        
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
          if (attempt < maxRetries) {
            metrics.retryCount++;
            await sleep(retryAfter * 1000, attempt);
            return fetchWithRetry(url, attempt + 1, customTimeout);
          }
        }
        
        if ((response.status === 503 || response.status === 502 || response.status === 504) && attempt < maxRetries) {
          const delay = Math.min(initialRetryDelay * Math.pow(2, attempt - 1), maxRetryDelay);
          console.warn(`Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
          metrics.retryCount++;
          await sleep(delay, attempt);
          return fetchWithRetry(url, attempt + 1, customTimeout);
        }
        
        metrics.errors.push(errorInfo);
        throw new Error(`HTTP ${response.status}: ${response.statusText}. Details: ${errorData}`);
      }

      const data = await response.json();
      
      // Enhanced response validation with detailed error messages
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response: not an object');
      }
      
      if (!Array.isArray(data.results)) {
        throw new Error('Invalid response: missing or invalid results array');
      }

      return data;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error.name === 'AbortError') {
        console.error(`Request aborted after ${duration}ms due to timeout`);
      } else {
        console.error(`Request failed after ${duration}ms:`, error.message);
      }

      if (attempt < maxRetries && error.name !== 'TypeError') {
        const delay = Math.min(initialRetryDelay * Math.pow(2, attempt - 1), maxRetryDelay);
        console.warn(`Retrying in ${delay}ms (attempt ${attempt}/${maxRetries}): ${error.message}`);
        metrics.retryCount++;
        await sleep(delay, attempt);
        return fetchWithRetry(url, attempt + 1, customTimeout);
      }
      
      metrics.errors.push({
        error: error.message,
        url,
        attempt,
        duration
      });
      throw error;
    }
  };

  // Enhanced data transformation with validation and performance optimization
  const transformSearchResult = (item) => {
    try {
      if (!item || !item.media_type) {
        console.warn('Invalid search result item:', item);
        return null;
      }

      const transformed = item.media_type === 'movie' 
        ? transformMovieData(item)
        : transformTVData(item);

      if (!transformed) {
        console.warn('Failed to transform item:', item);
        return null;
      }

      const year = item.release_date || item.first_air_date 
        ? new Date(item.release_date || item.first_air_date).getFullYear() 
        : null;

      return {
        ...transformed,
        type: item.media_type,
        image: item.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${item.poster_path}` : null,
        backdrop: item.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/original${item.backdrop_path}` : null,
        year,
        rating: item.vote_average || 0,
        title: item.title || item.name || 'Unknown Title',
        popularity: item.popularity || 0,
        originalLanguage: item.original_language || 'en',
        voteCount: item.vote_count || 0,
        overview: item.overview || '',
        genreIds: item.genre_ids || [],
        mediaType: item.media_type,
        releaseDate: item.release_date || item.first_air_date,
        originalTitle: item.original_title || item.original_name
      };
    } catch (error) {
      console.error('Error transforming search result:', error, item);
      return null;
    }
  };

  // Calculate relevance score based on query matching
  const calculateRelevanceScore = (item, searchQuery) => {
    const query = searchQuery.toLowerCase();
    const title = (item.title || item.name || '').toLowerCase();
    const overview = (item.overview || '').toLowerCase();
    
    let score = 0;
    
    // Exact title match gets highest score
    if (title === query) score += 100;
    // Title starts with query
    else if (title.startsWith(query)) score += 80;
    // Title contains query
    else if (title.includes(query)) score += 60;
    // Overview contains query
    else if (overview.includes(query)) score += 20;
    
    // Boost for recent content
    const year = item.release_date || item.first_air_date 
      ? new Date(item.release_date || item.first_air_date).getFullYear() 
      : 0;
    if (year >= new Date().getFullYear() - 2) score += 10;
    
    // Boost for high ratings
    if (item.vote_average >= 7) score += 15;
    if (item.vote_average >= 8) score += 10;
    
    return score;
  };

  // Enhanced cache management with compression and TTL
  const cacheManager = {
    get: (key) => {
      try {
        const cached = sessionStorage.getItem(key);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < cacheExpiry) {
            metrics.cacheHits++;
            console.debug('Cache hit for key:', key);
            return parsed.data;
          }
          // Remove expired cache
          sessionStorage.removeItem(key);
        }
        return null;
      } catch (error) {
        console.warn('Failed to retrieve cached data:', error);
        return null;
      }
    },
    set: (key, data) => {
      try {
        const cacheData = {
          data,
          timestamp: Date.now(),
          version: '2.0'
        };
        sessionStorage.setItem(key, JSON.stringify(cacheData));
        console.debug('Cached data for key:', key);
      } catch (error) {
        console.warn('Failed to cache data:', error);
      }
    }
  };

  // Enhanced search strategies
  const searchStrategies = {
    multi: async () => {
      const url = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=${language}&query=${encodeURIComponent(query)}&page=${page}&include_adult=${includeAdult}&region=${region}`;
      return await fetchWithRetry(url);
    },
    
    movie: async () => {
      const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=${language}&query=${encodeURIComponent(query)}&page=${page}&include_adult=${includeAdult}&region=${region}`;
      return await fetchWithRetry(url);
    },
    
    tv: async () => {
      const url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=${language}&query=${encodeURIComponent(query)}&page=${page}&include_adult=${includeAdult}&region=${region}`;
      return await fetchWithRetry(url);
    },
    
    person: async () => {
      const url = `${TMDB_BASE_URL}/search/person?api_key=${TMDB_API_KEY}&language=${language}&query=${encodeURIComponent(query)}&page=${page}&include_adult=${includeAdult}&region=${region}`;
      return await fetchWithRetry(url);
    }
  };

  try {
    // Enhanced input validation and sanitization
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      console.warn('Invalid search query:', query);
      return {
        results: [],
        page: 1,
        total_pages: 0,
        total_results: 0,
        query: query || '',
        timestamp: new Date().toISOString(),
        metadata: {
          searchType: 'invalid_query',
          processingTime: 0,
          metrics: enableMetrics ? metrics : null
        }
      };
    }

    const sanitizedQuery = query.trim();
    const startTime = Date.now();

    // Check cache first if enabled
    if (enableCaching) {
      const cachedResult = cacheManager.get(CACHE_KEY);
      if (cachedResult) {
        return {
          ...cachedResult,
          metadata: {
            ...cachedResult.metadata,
            cacheHit: true,
            processingTime: Date.now() - startTime
          }
        };
      }
    }

    // Execute search based on strategy
    let searchResponse = null;
    let usedStrategy = searchType;

    try {
      // Try primary search strategy
      if (searchStrategies[searchType]) {
        searchResponse = await searchStrategies[searchType]();
        metrics.searchStrategies.push({ strategy: searchType, success: true });
      }
    } catch (error) {
      console.warn(`Primary search strategy '${searchType}' failed:`, error.message);
      metrics.searchStrategies.push({ strategy: searchType, success: false, error: error.message });
      
      // Fallback to multi search if primary fails
      if (searchType !== 'multi') {
        try {
          searchResponse = await searchStrategies.multi();
          usedStrategy = 'multi';
          metrics.searchStrategies.push({ strategy: 'multi', success: true, fallback: true });
        } catch (multiError) {
          console.warn('Multi search fallback also failed:', multiError.message);
          metrics.searchStrategies.push({ strategy: 'multi', success: false, error: multiError.message });
        }
      }
    }

    // If still no response, try parallel separate searches
    if (!searchResponse) {
      console.debug('Executing parallel separate searches as final fallback');
      
      try {
        const [movieResponse, tvResponse] = await Promise.allSettled([
          searchStrategies.movie(),
          searchStrategies.tv()
        ]);

        const movieResults = movieResponse.status === 'fulfilled' ? movieResponse.value : { results: [], total_results: 0 };
        const tvResults = tvResponse.status === 'fulfilled' ? tvResponse.value : { results: [], total_results: 0 };

        // Combine results
        searchResponse = {
          results: [
            ...(movieResults.results || []).map(item => ({ ...item, media_type: 'movie' })),
            ...(tvResults.results || []).map(item => ({ ...item, media_type: 'tv' }))
          ],
          total_results: (movieResults.total_results || 0) + (tvResults.total_results || 0),
          total_pages: Math.max(movieResults.total_pages || 1, tvResults.total_pages || 1)
        };

        usedStrategy = 'parallel';
        metrics.searchStrategies.push({ strategy: 'parallel', success: true, fallback: true });
      } catch (parallelError) {
        console.error('All search strategies failed:', parallelError);
        metrics.searchStrategies.push({ strategy: 'parallel', success: false, error: parallelError.message });
      }
    }

    // Process results
    if (searchResponse && Array.isArray(searchResponse.results)) {
      // Filter and transform results
      const transformedResults = searchResponse.results
        .filter(item => item && (item.media_type === 'movie' || item.media_type === 'tv'))
        .map(transformSearchResult)
        .filter(Boolean)
        .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
        .slice(0, maxResults);

      const result = {
        results: transformedResults,
        page: page,
        total_pages: searchResponse.total_pages || 1,
        total_results: searchResponse.total_results || transformedResults.length,
        has_more: page < (searchResponse.total_pages || 1),
        query: sanitizedQuery,
        timestamp: new Date().toISOString(),
        metadata: {
          searchType: usedStrategy,
          processingTime: Date.now() - startTime,
          cacheHit: false,
          metrics: enableMetrics ? {
            ...metrics,
            performance: {
              totalTime: Date.now() - startTime,
              requestCount: metrics.requestCount,
              retryCount: metrics.retryCount,
              cacheHits: metrics.cacheHits,
              searchStrategies: metrics.searchStrategies
            }
          } : null
        }
      };

      // Cache the result
      if (enableCaching) {
        cacheManager.set(CACHE_KEY, result);
      }

      return result;
    }

    // No results found
    return {
      results: [],
      page: page,
      total_pages: 0,
      total_results: 0,
      has_more: false,
      query: sanitizedQuery,
      timestamp: new Date().toISOString(),
      metadata: {
        searchType: usedStrategy,
        processingTime: Date.now() - startTime,
        cacheHit: false,
        metrics: enableMetrics ? {
          ...metrics,
          performance: {
            totalTime: Date.now() - startTime,
            requestCount: metrics.requestCount,
            retryCount: metrics.retryCount,
            cacheHits: metrics.cacheHits,
            searchStrategies: metrics.searchStrategies
          }
        } : null
      }
    };

  } catch (error) {
    console.error('Error searching movies:', error);
    return {
      results: [],
      page: page,
      total_pages: 0,
      total_results: 0,
      has_more: false,
      query: query || '',
      timestamp: new Date().toISOString(),
      error: error.message,
      metadata: {
        searchType: 'error',
        processingTime: Date.now() - metrics.startTime,
        cacheHit: false,
        metrics: enableMetrics ? {
          ...metrics,
          performance: {
            totalTime: Date.now() - metrics.startTime,
            requestCount: metrics.requestCount,
            retryCount: metrics.retryCount,
            cacheHits: metrics.cacheHits,
            searchStrategies: metrics.searchStrategies
          }
        } : null
      }
    };
  }
};

export const getAiringTodayTVShows = async (page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit hit for airing today TV shows, waiting ${retryAfter} seconds`);
          await sleep(retryAfter * 1000);
          return fetchWithRetry(url, attempt + 1);
        } else if (response.status >= 500) {
          if (attempt <= MAX_RETRIES) {
            const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
            console.warn(`Server error ${response.status} for airing today TV shows, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
            await sleep(delay);
            return fetchWithRetry(url, attempt + 1);
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Request timed out for airing today TV shows');
      }
      
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed for airing today TV shows, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    // Enhanced airing today TV shows fetching with better error handling and validation
    const data = await fetchWithRetry(
      `${TMDB_BASE_URL}/tv/airing_today?api_key=${TMDB_API_KEY}&language=en-US&page=${page}&timezone=America/New_York`
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid API response structure for airing today TV shows');
    }

    // Enhanced data validation and processing
    const validTVShows = data.results.filter(show => 
      show && 
      show.id && 
      show.name && 
      show.poster_path && 
      show.first_air_date &&
      show.vote_average >= 0
    );

    // Calculate metadata
    const averageRating = validTVShows.length > 0 ? 
      Math.round((validTVShows.reduce((sum, s) => sum + parseFloat(s.vote_average || 0), 0) / validTVShows.length) * 10) / 10 : 
      0;

    const averageVoteCount = validTVShows.length > 0 ? 
      Math.round(validTVShows.reduce((sum, s) => sum + (s.vote_count || 0), 0) / validTVShows.length) : 
      0;

    const releaseYearRange = validTVShows.length > 0 ? {
      min: Math.min(...validTVShows.map(s => new Date(s.first_air_date).getFullYear()).filter(y => y > 1900)),
      max: Math.max(...validTVShows.map(s => new Date(s.first_air_date).getFullYear()).filter(y => y > 1900))
    } : null;

    const transformedShows = validTVShows.map(transformTVData).filter(Boolean);

    return {
      movies: transformedShows,
      totalPages: data.total_pages || 1,
      currentPage: data.page || page,
      totalResults: data.total_results || transformedShows.length,
      hasMore: (data.page || page) < (data.total_pages || 1),
      category: 'airing_today',
      categoryDisplayName: 'Airing Today',
      metadata: {
        averageRating,
        averageVoteCount,
        releaseYearRange,
        processedAt: new Date().toISOString(),
        filterCriteria: {
          timezone: 'America/New_York',
          sortBy: 'popularity.desc'
        }
      }
    };
  } catch (error) {
    console.error('Error fetching airing today TV shows:', error);
    
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      category: 'airing_today',
      categoryDisplayName: 'Airing Today',
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      metadata: {
        averageRating: 0,
        averageVoteCount: 0,
        releaseYearRange: null,
        isError: true,
        filterCriteria: {
          timezone: 'America/New_York',
          sortBy: 'popularity.desc'
        }
      }
    };
  }
};

export const getNowPlayingMovies = async (page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit hit for now playing movies, waiting ${retryAfter} seconds`);
          await sleep(retryAfter * 1000);
          return fetchWithRetry(url, attempt + 1);
        } else if (response.status >= 500 && attempt <= MAX_RETRIES) {
          const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
          console.warn(`Server error ${response.status} for now playing movies, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
          await sleep(delay);
          return fetchWithRetry(url, attempt + 1);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Request timed out for now playing movies');
      }
      
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed for now playing movies, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    // Enhanced now playing movies fetching with better filtering and error handling
    const data = await fetchWithRetry(
      `${TMDB_BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&language=en-US&page=${page}&region=US&include_adult=false`
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid API response structure for now playing movies');
    }

    // Enhanced data validation and processing
    const validMovies = data.results.filter(movie => 
      movie && 
      movie.id && 
      movie.title && 
      movie.poster_path && 
      movie.release_date &&
      movie.vote_average >= 0
    );

    // Calculate metadata
    const averageRating = validMovies.length > 0 ? 
      Math.round((validMovies.reduce((sum, m) => sum + parseFloat(m.vote_average || 0), 0) / validMovies.length) * 10) / 10 : 
      0;

    const averageVoteCount = validMovies.length > 0 ? 
      Math.round(validMovies.reduce((sum, m) => sum + (m.vote_count || 0), 0) / validMovies.length) : 
      0;

    const releaseYearRange = validMovies.length > 0 ? {
      min: Math.min(...validMovies.map(m => new Date(m.release_date).getFullYear()).filter(y => y > 1900)),
      max: Math.max(...validMovies.map(m => new Date(m.release_date).getFullYear()).filter(y => y > 1900))
    } : null;

    const transformedMovies = validMovies.map(transformMovieData).filter(Boolean);

    return {
      movies: transformedMovies,
      totalPages: data.total_pages || 1,
      currentPage: data.page || page,
      totalResults: data.total_results || transformedMovies.length,
      hasMore: (data.page || page) < (data.total_pages || 1),
      category: 'now_playing',
      categoryDisplayName: 'Now Playing',
      metadata: {
        averageRating,
        averageVoteCount,
        releaseYearRange,
        processedAt: new Date().toISOString(),
        filterCriteria: {
          region: 'US',
          includeAdult: false,
          sortBy: 'popularity.desc'
        }
      }
    };
  } catch (error) {
    console.error('Error fetching now playing movies:', error);
    
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      category: 'now_playing',
      categoryDisplayName: 'Now Playing',
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      metadata: {
        averageRating: 0,
        averageVoteCount: 0,
        releaseYearRange: null,
        isError: true,
        filterCriteria: {
          region: 'US',
          includeAdult: false,
          sortBy: 'popularity.desc'
        }
      }
    };
  }
};

export const getPopularTVShows = async (page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit hit for popular TV shows, waiting ${retryAfter} seconds`);
          await sleep(retryAfter * 1000);
          return fetchWithRetry(url, attempt + 1);
        } else if (response.status >= 500 && attempt <= MAX_RETRIES) {
          const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
          console.warn(`Server error ${response.status} for popular TV shows, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
          await sleep(delay);
          return fetchWithRetry(url, attempt + 1);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Request timed out for popular TV shows');
      }
      
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed for popular TV shows, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    // Enhanced popular TV shows fetching with better parameters and error handling
    const data = await fetchWithRetry(
      `${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}&include_adult=false&region=US`
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid API response structure for popular TV shows');
    }

    // Enhanced data validation and processing
    const validTVShows = data.results.filter(show => 
      show && 
      show.id && 
      show.name && 
      show.poster_path && 
      show.first_air_date &&
      show.vote_average >= 0
    );

    // Transform valid shows using existing transformTVData function
    const transformedShows = validTVShows.map(transformTVData).filter(Boolean);

    // Calculate metadata
    const averageRating = transformedShows.length > 0 ? 
      Math.round((transformedShows.reduce((sum, show) => sum + parseFloat(show.vote_average || 0), 0) / transformedShows.length) * 10) / 10 : 
      0;

    const averageVoteCount = transformedShows.length > 0 ? 
      Math.round(transformedShows.reduce((sum, show) => sum + (show.vote_count || 0), 0) / transformedShows.length) : 
      0;

    const releaseYearRange = transformedShows.length > 0 ? {
      min: Math.min(...transformedShows.map(show => new Date(show.first_air_date).getFullYear()).filter(y => y > 1900)),
      max: Math.max(...transformedShows.map(show => new Date(show.first_air_date).getFullYear()).filter(y => y > 1900))
    } : null;

    return {
      movies: transformedShows,
      totalPages: data.total_pages || 1,
      currentPage: data.page || page,
      totalResults: data.total_results || transformedShows.length,
      hasMore: (data.page || page) < (data.total_pages || 1),
      category: 'popular_tv',
      categoryDisplayName: 'Popular TV Shows',
      metadata: {
        averageRating,
        averageVoteCount,
        releaseYearRange,
        processedAt: new Date().toISOString(),
        filterCriteria: {
          region: 'US',
          includeAdult: false,
          sortBy: 'popularity.desc'
        }
      }
    };
  } catch (error) {
    console.error('Error fetching popular TV shows:', error);
    
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      category: 'popular_tv',
      categoryDisplayName: 'Popular TV Shows',
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      metadata: {
        averageRating: 0,
        averageVoteCount: 0,
        releaseYearRange: null,
        isError: true,
        filterCriteria: {
          region: 'US',
          includeAdult: false,
          sortBy: 'popularity.desc'
        }
      }
    };
  }
};

export const getTopRatedTVShows = async (page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit hit for top rated TV shows, waiting ${retryAfter} seconds`);
          await sleep(retryAfter * 1000);
          return fetchWithRetry(url, attempt + 1);
        } else if (response.status >= 500 && attempt <= MAX_RETRIES) {
          const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
          console.warn(`Server error ${response.status} for top rated TV shows, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
          await sleep(delay);
          return fetchWithRetry(url, attempt + 1);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Request timed out for top rated TV shows');
      }
      
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed for top rated TV shows, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    // Enhanced API call with better parameters
    const data = await fetchWithRetry(
      `${TMDB_BASE_URL}/tv/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=${page}&region=US&include_adult=false`
    );

    if (!data || !data.results) {
      throw new Error('Invalid API response structure for top rated TV shows');
    }

    // Enhanced data validation and processing
    const validTVShows = data.results.filter(show => 
      show && 
      show.id && 
      show.name && 
      show.poster_path && 
      show.first_air_date &&
      show.vote_average >= 0
    );

    // Transform the results using the existing transformTVData function
    const transformedShows = validTVShows.map(transformTVData).filter(Boolean);

    // Calculate metadata
    const averageRating = validTVShows.length > 0 ? 
      Math.round((validTVShows.reduce((sum, s) => sum + parseFloat(s.vote_average || 0), 0) / validTVShows.length) * 10) / 10 : 
      0;

    const averageVoteCount = validTVShows.length > 0 ? 
      Math.round(validTVShows.reduce((sum, s) => sum + (s.vote_count || 0), 0) / validTVShows.length) : 
      0;

    const releaseYearRange = validTVShows.length > 0 ? {
      min: Math.min(...validTVShows.map(s => new Date(s.first_air_date).getFullYear()).filter(y => y > 1900)),
      max: Math.max(...validTVShows.map(s => new Date(s.first_air_date).getFullYear()).filter(y => y > 1900))
    } : null;

    return {
      movies: transformedShows,
      totalPages: data.total_pages || 1,
      currentPage: data.page || page,
      totalResults: data.total_results || transformedShows.length,
      hasMore: (data.page || page) < (data.total_pages || 1),
      category: 'top_rated_tv',
      categoryDisplayName: 'Top Rated TV Shows',
      metadata: {
        averageRating,
        averageVoteCount,
        releaseYearRange,
        processedAt: new Date().toISOString(),
        filterCriteria: {
          region: 'US',
          includeAdult: false,
          sortBy: 'vote_average.desc'
        }
      }
    };
  } catch (error) {
    console.error('Error fetching top rated TV shows:', error);
    
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      category: 'top_rated_tv',
      categoryDisplayName: 'Top Rated TV Shows',
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      metadata: {
        averageRating: 0,
        averageVoteCount: 0,
        releaseYearRange: null,
        isError: true,
        filterCriteria: {
          region: 'US',
          includeAdult: false,
          sortBy: 'vote_average.desc'
        }
      }
    };
  }
};

export const getNetflixOriginals = async (page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit hit for Netflix originals, waiting ${retryAfter} seconds`);
          await sleep(retryAfter * 1000);
          return fetchWithRetry(url, attempt + 1);
        } else if (response.status >= 500 && attempt <= MAX_RETRIES) {
          const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
          console.warn(`Server error ${response.status} for Netflix originals, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
          await sleep(delay);
          return fetchWithRetry(url, attempt + 1);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Request timed out for Netflix originals');
      }
      
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed for Netflix originals, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    // Enhanced Netflix originals fetching with better parameters and error handling
    const data = await fetchWithRetry(
      `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_networks=213&language=en-US&page=${page}&sort_by=popularity.desc&include_adult=false&vote_count.gte=10`
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid API response structure for Netflix originals');
    }

    // Enhanced data validation and processing
    const validShows = data.results.filter(show => 
      show && 
      show.id && 
      show.name && 
      show.poster_path && 
      show.first_air_date &&
      show.vote_average >= 0
    );

    // Transform the results using the existing transformTVData function
    const transformedShows = validShows.map(transformTVData).filter(Boolean);

    // Calculate metadata
    const averageRating = transformedShows.length > 0 ? 
      Math.round((transformedShows.reduce((sum, show) => sum + parseFloat(show.vote_average || 0), 0) / transformedShows.length) * 10) / 10 : 
      0;

    const averageVoteCount = transformedShows.length > 0 ? 
      Math.round(transformedShows.reduce((sum, show) => sum + (show.vote_count || 0), 0) / transformedShows.length) : 
      0;

    const releaseYearRange = transformedShows.length > 0 ? {
      min: Math.min(...transformedShows.map(show => new Date(show.first_air_date).getFullYear()).filter(y => y > 1900)),
      max: Math.max(...transformedShows.map(show => new Date(show.first_air_date).getFullYear()).filter(y => y > 1900))
    } : null;

    return {
      movies: transformedShows,
      totalPages: data.total_pages || 1,
      currentPage: data.page || page,
      totalResults: data.total_results || transformedShows.length,
      hasMore: (data.page || page) < (data.total_pages || 1),
      category: 'netflix_originals',
      categoryDisplayName: 'Netflix Originals',
      metadata: {
        averageRating,
        averageVoteCount,
        releaseYearRange,
        processedAt: new Date().toISOString(),
        filterCriteria: {
          network: 'Netflix (213)',
          sortBy: 'popularity.desc',
          minVoteCount: 10,
          includeAdult: false
        }
      }
    };
  } catch (error) {
    console.error('Error fetching Netflix originals:', error);
    
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      category: 'netflix_originals',
      categoryDisplayName: 'Netflix Originals',
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      metadata: {
        averageRating: 0,
        averageVoteCount: 0,
        releaseYearRange: null,
        isError: true,
        filterCriteria: {
          network: 'Netflix (213)',
          sortBy: 'popularity.desc',
          minVoteCount: 10,
          includeAdult: false
        }
      }
    };
  }
};

export const getNetflixOriginalsByGenre = async (genreId, page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit hit for Netflix originals by genre ${genreId}, waiting ${retryAfter} seconds`);
          await sleep(retryAfter * 1000);
          return fetchWithRetry(url, attempt + 1);
        } else if (response.status >= 500 && attempt <= MAX_RETRIES) {
          const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
          console.warn(`Server error ${response.status} for Netflix originals by genre ${genreId}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
          await sleep(delay);
          return fetchWithRetry(url, attempt + 1);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Request timed out for Netflix originals by genre');
      }
      
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed for Netflix originals by genre ${genreId}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    // Validate genre ID
    if (!genreId || isNaN(parseInt(genreId))) {
      throw new Error(`Invalid genre ID: ${genreId}`);
    }

    // Enhanced API call with comprehensive parameters
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: 'en-US',
      page: page.toString(),
      with_networks: '213', // Netflix network ID
      with_genres: genreId.toString(),
      sort_by: 'popularity.desc',
      include_adult: 'false',
      vote_count_gte: '10',
      watch_region: 'US'
    });

    const data = await fetchWithRetry(`${TMDB_BASE_URL}/discover/tv?${params}`);

    if (!data || !data.results) {
      throw new Error(`Invalid API response structure for Netflix originals by genre: ${genreId}`);
    }

    // Enhanced data validation and processing
    const validTVShows = data.results.filter(show => 
      show && 
      show.id && 
      show.name && 
      show.poster_path && 
      show.first_air_date &&
      show.vote_average >= 0
    );

    // Calculate metadata
    const averageRating = validTVShows.length > 0 ? 
      Math.round((validTVShows.reduce((sum, s) => sum + parseFloat(s.vote_average || 0), 0) / validTVShows.length) * 10) / 10 : 
      0;

    const averageVoteCount = validTVShows.length > 0 ? 
      Math.round(validTVShows.reduce((sum, s) => sum + (s.vote_count || 0), 0) / validTVShows.length) : 
      0;

    const releaseYearRange = validTVShows.length > 0 ? {
      min: Math.min(...validTVShows.map(s => new Date(s.first_air_date).getFullYear()).filter(y => y > 1900)),
      max: Math.max(...validTVShows.map(s => new Date(s.first_air_date).getFullYear()).filter(y => y > 1900))
    } : null;

    const transformedShows = validTVShows.map(transformTVData).filter(Boolean);

    return {
      movies: transformedShows,
      totalPages: data.total_pages || 1,
      currentPage: data.page || page,
      totalResults: data.total_results || transformedShows.length,
      hasMore: (data.page || page) < (data.total_pages || 1),
      category: `netflix_originals_genre_${genreId}`,
      categoryDisplayName: `Netflix Originals - Genre ${genreId}`,
      metadata: {
        averageRating,
        averageVoteCount,
        releaseYearRange,
        processedAt: new Date().toISOString(),
        filterCriteria: {
          network: 'Netflix (213)',
          genreId: parseInt(genreId),
          sortBy: 'popularity.desc',
          minVoteCount: 10,
          includeAdult: false,
          watchRegion: 'US'
        }
      }
    };
  } catch (error) {
    console.error('Error fetching Netflix originals by genre:', error);
    
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      category: `netflix_originals_genre_${genreId}`,
      categoryDisplayName: `Netflix Originals - Genre ${genreId}`,
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      metadata: {
        averageRating: 0,
        averageVoteCount: 0,
        releaseYearRange: null,
        isError: true,
        filterCriteria: {
          network: 'Netflix (213)',
          genreId: parseInt(genreId),
          sortBy: 'popularity.desc',
          minVoteCount: 10,
          includeAdult: false,
          watchRegion: 'US'
        }
      }
    };
  }
};


export const getTVSeriesByNetwork = async (networkId, page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit hit for TV series by network ${networkId}, waiting ${retryAfter} seconds`);
          await sleep(retryAfter * 1000);
          return fetchWithRetry(url, attempt + 1);
        } else if (response.status >= 500 && attempt <= MAX_RETRIES) {
          const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
          console.warn(`Server error ${response.status} for TV series by network ${networkId}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
          await sleep(delay);
          return fetchWithRetry(url, attempt + 1);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Request timed out for TV series by network');
      }
      
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed for TV series by network ${networkId}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    // Enhanced TV series by network fetching with better parameters and error handling
    // Removed vote_count.gte=10 filter to be less restrictive
    const data = await fetchWithRetry(
      `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_networks=${networkId}&language=en-US&page=${page}&sort_by=popularity.desc&include_adult=false&region=US`
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid API response structure for TV series by network');
    }

    // Enhanced data validation and processing - less restrictive filtering
    const validShows = data.results.filter(show => 
      show && 
      show.id && 
      show.name
    );

    // Transform the results to match the expected format for SeriesPage
    const transformedShows = validShows.map(show => ({
      ...show,
      type: 'tv',
      title: show.name,
      year: show.first_air_date ? show.first_air_date.split('-')[0] : 'N/A',
      rating: show.vote_average,
      duration: `${show.number_of_seasons || 0} Season${(show.number_of_seasons || 0) !== 1 ? 's' : ''}`,
      backdrop: show.backdrop_path,
      image: show.poster_path,
      overview: show.overview,
      genres: show.genre_ids,
      networks: show.networks
    }));

    // Calculate metadata
    const averageRating = transformedShows.length > 0 ? 
      Math.round((transformedShows.reduce((sum, show) => sum + parseFloat(show.rating || 0), 0) / transformedShows.length) * 10) / 10 : 
      0;

    const averageVoteCount = transformedShows.length > 0 ? 
      Math.round(transformedShows.reduce((sum, show) => sum + (show.vote_count || 0), 0) / transformedShows.length) : 
      0;

    const releaseYearRange = transformedShows.length > 0 ? {
      min: Math.min(...transformedShows.map(show => new Date(show.first_air_date).getFullYear()).filter(y => y > 1900)),
      max: Math.max(...transformedShows.map(show => new Date(show.first_air_date).getFullYear()).filter(y => y > 1900))
    } : null;

    return {
      results: transformedShows, // Changed from 'movies' to 'results' to match SeriesPage expectations
      totalPages: data.total_pages || 1,
      page: data.page || page,
      totalResults: data.total_results || transformedShows.length,
      hasMore: (data.page || page) < (data.total_pages || 1),
      category: `network_${networkId}`,
      categoryDisplayName: `TV Series - Network ${networkId}`,
      metadata: {
        averageRating,
        averageVoteCount,
        releaseYearRange,
        processedAt: new Date().toISOString(),
        filterCriteria: {
          networkId: parseInt(networkId),
          sortBy: 'popularity.desc',
          includeAdult: false,
          region: 'US'
        }
      }
    };
  } catch (error) {
    console.error('Error fetching TV series by network:', error);
    
    return {
      results: [], // Changed from 'movies' to 'results'
      totalPages: 1,
      page: page,
      totalResults: 0,
      hasMore: false,
      category: `network_${networkId}`,
      categoryDisplayName: `TV Series - Network ${networkId}`,
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      metadata: {
        averageRating: 0,
        averageVoteCount: 0,
        releaseYearRange: null,
        isError: true,
        filterCriteria: {
          networkId: parseInt(networkId),
          sortBy: 'popularity.desc',
          includeAdult: false,
          region: 'US'
        }
      }
    };
  }
};


export const getAiringTodayTV = async (page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit hit for airing today TV shows, waiting ${retryAfter} seconds`);
          await sleep(retryAfter * 1000);
          return fetchWithRetry(url, attempt + 1);
        } else if (response.status >= 500 && attempt <= MAX_RETRIES) {
          const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
          console.warn(`Server error ${response.status} for airing today TV shows, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
          await sleep(delay);
          return fetchWithRetry(url, attempt + 1);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Request timed out for airing today TV shows');
      }
      
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed for airing today TV shows, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    // Enhanced airing today TV shows fetching with better parameters and error handling
    const data = await fetchWithRetry(
      `${TMDB_BASE_URL}/tv/airing_today?api_key=${TMDB_API_KEY}&language=en-US&page=${page}&region=US&include_adult=false`
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid API response structure for airing today TV shows');
    }

    // Enhanced data validation and processing
    const validTVShows = data.results.filter(show => 
      show && 
      show.id && 
      show.name && 
      show.poster_path && 
      show.first_air_date &&
      show.vote_average >= 0
    );

    // Transform valid shows using existing transformTVData function
    const transformedShows = validTVShows.map(transformTVData).filter(Boolean);

    // Calculate metadata
    const averageRating = transformedShows.length > 0 ? 
      Math.round((transformedShows.reduce((sum, show) => sum + parseFloat(show.vote_average || 0), 0) / transformedShows.length) * 10) / 10 : 
      0;

    const averageVoteCount = transformedShows.length > 0 ? 
      Math.round(transformedShows.reduce((sum, show) => sum + (show.vote_count || 0), 0) / transformedShows.length) : 
      0;

    const releaseYearRange = transformedShows.length > 0 ? {
      min: Math.min(...transformedShows.map(show => new Date(show.first_air_date).getFullYear()).filter(y => y > 1900)),
      max: Math.max(...transformedShows.map(show => new Date(show.first_air_date).getFullYear()).filter(y => y > 1900))
    } : null;

    return {
      movies: transformedShows,
      totalPages: data.total_pages || 1,
      currentPage: data.page || page,
      totalResults: data.total_results || transformedShows.length,
      hasMore: (data.page || page) < (data.total_pages || 1),
      category: 'airing_today_tv',
      categoryDisplayName: 'Airing Today TV Shows',
      metadata: {
        averageRating,
        averageVoteCount,
        releaseYearRange,
        processedAt: new Date().toISOString(),
        filterCriteria: {
          region: 'US',
          includeAdult: false,
          sortBy: 'popularity.desc'
        }
      }
    };
  } catch (error) {
    console.error('Error fetching airing today TV shows:', error);
    
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      category: 'airing_today_tv',
      categoryDisplayName: 'Airing Today TV Shows',
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      metadata: {
        averageRating: 0,
        averageVoteCount: 0,
        releaseYearRange: null,
        isError: true,
        filterCriteria: {
          region: 'US',
          includeAdult: false,
          sortBy: 'popularity.desc'
        }
      }
    };
  }
};

// Get movies by year
export const getMoviesByYear = async (year, page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('🔐 TMDB API Authentication Failed (401 Unauthorized)');
          throw new Error(`TMDB API Authentication Failed: ${response.statusText}. Please check your API key configuration.`);
        } else if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit hit, waiting ${retryAfter} seconds`);
          await sleep(retryAfter * 1000);
        } else if (response.status >= 500) {
          if (attempt <= MAX_RETRIES) {
            const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
            console.warn(`Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
            await sleep(delay);
            return fetchWithRetry(url, attempt + 1);
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    const data = await fetchWithRetry(
      `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&primary_release_date.gte=${startDate}&primary_release_date.lte=${endDate}&page=${page}&sort_by=popularity.desc&language=en-US&include_adult=false&vote_count.gte=10`
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid API response structure for movies by year');
    }

    const validMovies = data.results
      .filter(movie => movie && movie.id && movie.title)
      .map(transformMovieData)
      .filter(Boolean);

    return {
      movies: validMovies,
      totalPages: data.total_pages || 1,
      currentPage: data.page || page,
      totalResults: data.total_results || validMovies.length,
      hasMore: (data.page || page) < (data.total_pages || 1),
      year: year,
      metadata: {
        averageRating: validMovies.length > 0 ? 
          Math.round((validMovies.reduce((sum, m) => sum + parseFloat(m.rating || 0), 0) / validMovies.length) * 10) / 10 : 
          0,
        averageVoteCount: validMovies.length > 0 ? 
          Math.round(validMovies.reduce((sum, m) => sum + (m.vote_count || 0), 0) / validMovies.length) : 
          0,
        processedAt: new Date().toISOString(),
        filterCriteria: {
          year: year,
          sortBy: 'popularity.desc',
          minVoteCount: 10,
          includeAdult: false
        }
      }
    };
  } catch (error) {
    console.error('Error fetching movies by year:', error);
    
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      year: year,
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      metadata: {
        averageRating: 0,
        averageVoteCount: 0,
        isError: true,
        filterCriteria: {
          year: year,
          sortBy: 'popularity.desc',
          minVoteCount: 10,
          includeAdult: false
        }
      }
    };
  }
};

// Get movies by streaming service (e.g., Netflix)
export const getNetflixMovies = async (page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('🔐 TMDB API Authentication Failed (401 Unauthorized)');
          throw new Error(`TMDB API Authentication Failed: ${response.statusText}. Please check your API key configuration.`);
        } else if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit hit, waiting ${retryAfter} seconds`);
          await sleep(retryAfter * 1000);
        } else if (response.status >= 500) {
          if (attempt <= MAX_RETRIES) {
            const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
            console.warn(`Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
            await sleep(delay);
            return fetchWithRetry(url, attempt + 1);
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    const data = await fetchWithRetry(
      `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_watch_providers=8&watch_region=US&page=${page}&sort_by=popularity.desc&language=en-US&include_adult=false&vote_count.gte=10`
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid API response structure for Netflix movies');
    }

    const validMovies = data.results
      .filter(movie => movie && movie.id && movie.title)
      .map(transformMovieData)
      .filter(Boolean);

    return {
      movies: validMovies,
      totalPages: data.total_pages || 1,
      currentPage: data.page || page,
      totalResults: data.total_results || validMovies.length,
      hasMore: (data.page || page) < (data.total_pages || 1),
      provider: 'Netflix',
      providerId: 8,
      metadata: {
        averageRating: validMovies.length > 0 ? 
          Math.round((validMovies.reduce((sum, m) => sum + parseFloat(m.rating || 0), 0) / validMovies.length) * 10) / 10 : 
          0,
        averageVoteCount: validMovies.length > 0 ? 
          Math.round(validMovies.reduce((sum, m) => sum + (m.vote_count || 0), 0) / validMovies.length) : 
          0,
        processedAt: new Date().toISOString(),
        filterCriteria: {
          provider: 'Netflix (8)',
          watchRegion: 'US',
          sortBy: 'popularity.desc',
          minVoteCount: 10,
          includeAdult: false
        }
      }
    };
  } catch (error) {
    console.error('Error fetching Netflix movies:', error);
    
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      provider: 'Netflix',
      providerId: 8,
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      metadata: {
        averageRating: 0,
        averageVoteCount: 0,
        isError: true,
        filterCriteria: {
          provider: 'Netflix (8)',
          watchRegion: 'US',
          sortBy: 'popularity.desc',
          minVoteCount: 10,
          includeAdult: false
        }
      }
    };
  }
};

// Get Netflix movies by genre
export const getNetflixMoviesByGenre = async (genreId, page = 1) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const MAX_RETRY_DELAY = 5000;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('🔐 TMDB API Authentication Failed (401 Unauthorized)');
          throw new Error(`TMDB API Authentication Failed: ${response.statusText}. Please check your API key configuration.`);
        } else if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
          console.warn(`Rate limit hit, waiting ${retryAfter} seconds`);
          await sleep(retryAfter * 1000);
        } else if (response.status >= 500) {
          if (attempt <= MAX_RETRIES) {
            const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
            console.warn(`Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
            await sleep(delay);
            return fetchWithRetry(url, attempt + 1);
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt <= MAX_RETRIES && error.name !== 'TypeError') {
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        await sleep(delay);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    const data = await fetchWithRetry(
      `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_watch_providers=8&watch_region=US&with_genres=${genreId}&page=${page}&sort_by=popularity.desc&language=en-US&include_adult=false&vote_count.gte=10`
    );
    
    if (!data || !data.results) {
      throw new Error('Invalid API response structure for Netflix movies by genre');
    }

    const validMovies = data.results
      .filter(movie => movie && movie.id && movie.title)
      .map(transformMovieData)
      .filter(Boolean);

    return {
      movies: validMovies,
      totalPages: data.total_pages || 1,
      currentPage: data.page || page,
      totalResults: data.total_results || validMovies.length,
      hasMore: (data.page || page) < (data.total_pages || 1),
      provider: 'Netflix',
      providerId: 8,
      genreId: genreId,
      metadata: {
        averageRating: validMovies.length > 0 ? 
          Math.round((validMovies.reduce((sum, m) => sum + parseFloat(m.rating || 0), 0) / validMovies.length) * 10) / 10 : 
          0,
        averageVoteCount: validMovies.length > 0 ? 
          Math.round(validMovies.reduce((sum, m) => sum + (m.vote_count || 0), 0) / validMovies.length) : 
          0,
        processedAt: new Date().toISOString(),
        filterCriteria: {
          provider: 'Netflix (8)',
          genreId: genreId,
          watchRegion: 'US',
          sortBy: 'popularity.desc',
          minVoteCount: 10,
          includeAdult: false
        }
      }
    };
  } catch (error) {
    console.error('Error fetching Netflix movies by genre:', error);
    
    return {
      movies: [],
      totalPages: 1,
      currentPage: page,
      totalResults: 0,
      hasMore: false,
      provider: 'Netflix',
      providerId: 8,
      genreId: genreId,
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      metadata: {
        averageRating: 0,
        averageVoteCount: 0,
        isError: true,
        filterCriteria: {
          provider: 'Netflix (8)',
          genreId: genreId,
          watchRegion: 'US',
          sortBy: 'popularity.desc',
          minVoteCount: 10,
          includeAdult: false
        }
      }
    };
  }
};

// Get popular TV series
export const getPopularTV = async (page = 1) => {
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (attempt < 3) {
        await sleep(1000 * attempt);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    const url = `${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;
    const data = await fetchWithRetry(url);
    
    if (!data || !data.results) {
      throw new Error('Invalid response from TMDB API');
    }

    const transformedResults = data.results.map(tv => transformTVData(tv));
    
    return {
      results: transformedResults,
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results
    };
  } catch (error) {
    console.error('Error fetching popular TV shows:', error);
    throw error;
  }
};

// TV Season and Episode Functions
export const getTVSeason = async (tvId, seasonNumber) => {
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (attempt < 3) {
        await sleep(1000 * attempt);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    const url = `${TMDB_BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits,videos,images`;
    const data = await fetchWithRetry(url);
    
    if (!data) {
      throw new Error('Invalid response from TMDB API');
    }

    // Transform the season data
    const transformedSeason = {
      id: data.id,
      name: data.name,
      overview: data.overview || '',
      season_number: data.season_number,
      air_date: data.air_date,
      poster_path: data.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${data.poster_path}` : null,
      episodes: data.episodes ? data.episodes.map(episode => ({
        id: episode.id,
        name: episode.name,
        overview: episode.overview || '',
        still_path: episode.still_path ? `${TMDB_IMAGE_BASE_URL}/w300${episode.still_path}` : null,
        air_date: episode.air_date,
        episode_number: episode.episode_number,
        season_number: episode.season_number,
        runtime: episode.runtime || 0,
        vote_average: episode.vote_average || 0,
        vote_count: episode.vote_count || 0,
        crew: episode.crew || [],
        guest_stars: episode.guest_stars || []
      })) : []
    };

    return transformedSeason;
  } catch (error) {
    console.error('Error fetching TV season:', error);
    throw error;
  }
};

export const getTVSeasons = async (tvId) => {
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  const fetchWithRetry = async (url, attempt = 1) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (attempt < 3) {
        await sleep(1000 * attempt);
        return fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  };

  try {
    const url = `${TMDB_BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=seasons`;
    const data = await fetchWithRetry(url);
    
    if (!data || !data.seasons) {
      throw new Error('Invalid response from TMDB API');
    }

    // Transform the seasons data
    const transformedSeasons = data.seasons.map(season => ({
      id: season.id,
      name: season.name,
      overview: season.overview || '',
      season_number: season.season_number,
      air_date: season.air_date,
      poster_path: season.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${season.poster_path}` : null,
      episode_count: season.episode_count || 0
    }));

    return transformedSeasons;
  } catch (error) {
    console.error('Error fetching TV seasons:', error);
    throw error;
  }
};

// Cache for non-existent movie IDs to prevent repeated requests
const nonExistentMovieCache = new Set();
const NON_EXISTENT_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Add specific known non-existent movie IDs to prevent 404 errors
const KNOWN_NON_EXISTENT_MOVIES = [
  'movie_109974', // This specific movie ID that's causing 404 errors
  'movie_206992'  // Another known non-existent movie ID
];

// Initialize cache with known non-existent movies
KNOWN_NON_EXISTENT_MOVIES.forEach(id => {
  nonExistentMovieCache.add(id);
});

// Clear non-existent movie cache periodically to prevent memory leaks
setInterval(() => {
  if (nonExistentMovieCache.size > 1000) {
    console.debug(`🧹 Clearing non-existent movie cache (${nonExistentMovieCache.size} entries)`);
    nonExistentMovieCache.clear();
    // Re-add known non-existent movies after clearing
    KNOWN_NON_EXISTENT_MOVIES.forEach(id => {
      nonExistentMovieCache.add(id);
    });
  }
}, NON_EXISTENT_CACHE_DURATION);

// Function to manually add movie IDs to the non-existent cache
export const addToNonExistentCache = (id, type = 'movie') => {
  const cacheKey = `${type}_${id}`;
  nonExistentMovieCache.add(cacheKey);
  console.debug(`🔍 Manually added ${type} ${id} to non-existent cache`);
  return cacheKey;
};

// Function to check if a movie ID is in the non-existent cache
export const isInNonExistentCache = (id, type = 'movie') => {
  return nonExistentMovieCache.has(`${type}_${id}`);
};

// Utility function to check if a movie exists
export const checkMovieExists = async (id, type = 'movie') => {
  if (!id) return false;
  
  // Check cache first
  if (nonExistentMovieCache.has(`${type}_${id}`)) {
    return false;
  }
  
  try {
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const response = await fetch(`${TMDB_BASE_URL}/${endpoint}/${id}?api_key=${TMDB_API_KEY}`);
    
    if (response.status === 404) {
      nonExistentMovieCache.add(`${type}_${id}`);
      console.debug(`🔍 Caching non-existent ${type} ${id} (checkMovieExists)`);
      return false;
    }
    
    if (response.ok) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if movie exists:', error);
    return false;
  }
};

// Function to clear non-existent movie cache
export const clearNonExistentMovieCache = () => {
  const size = nonExistentMovieCache.size;
  nonExistentMovieCache.clear();
  // Re-add known non-existent movies after clearing
  KNOWN_NON_EXISTENT_MOVIES.forEach(id => {
    nonExistentMovieCache.add(id);
  });
  console.debug(`🧹 Cleared non-existent movie cache (${size} entries)`);
  return size;
};

// Function to get non-existent movie cache stats
export const getNonExistentMovieCacheStats = () => {
  return {
    size: nonExistentMovieCache.size,
    entries: Array.from(nonExistentMovieCache),
    knownNonExistent: KNOWN_NON_EXISTENT_MOVIES
  };
};

