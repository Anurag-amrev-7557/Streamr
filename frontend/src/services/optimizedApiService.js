import { batchRequest, getCachedData } from './performanceOptimizationService';

// API Configuration
const API_CONFIG = {
  baseURL: 'https://api.themoviedb.org/3',
  apiKey: import.meta.env.VITE_TMDB_API_KEY,
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  batchSize: 5,
  batchDelay: 50
};

// Request queue for batching
let requestQueue = [];
let batchTimeout = null;

class OptimizedApiService {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.retryCounts = new Map();
  }

  // 🎯 Core API request method with batching and caching
  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      params = {},
      priority = false,
      useCache = true,
      cacheTTL = API_CONFIG.cacheTTL,
      retryAttempts = API_CONFIG.retryAttempts
    } = options;

    const cacheKey = this.generateCacheKey(endpoint, params);
    
    // Check cache first
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cacheTTL) {
        return cached.data;
      }
    }

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    // Create request promise
    const requestPromise = this.executeRequest(endpoint, method, params, retryAttempts);
    
    // Store pending request
    this.pendingRequests.set(cacheKey, requestPromise);
    
    // Cache the result when resolved
    requestPromise.then(data => {
      if (useCache) {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      }
      this.pendingRequests.delete(cacheKey);
    }).catch(() => {
      this.pendingRequests.delete(cacheKey);
    });

    return requestPromise;
  }

  // 🔄 Execute actual API request with retry logic
  async executeRequest(endpoint, method, params, retryAttempts) {
    const url = this.buildUrl(endpoint, params);
    const requestId = `${method}_${url}`;
    
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        const startTime = performance.now();
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_CONFIG.apiKey}`
          },
          signal: AbortSignal.timeout(API_CONFIG.timeout)
        });

        const duration = performance.now() - startTime;
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Record performance metrics
        this.recordApiCall(duration, true);
        
        return data;
      } catch (error) {
        this.recordApiCall(0, false);
        
        if (attempt === retryAttempts) {
          throw error;
        }
        
        // Exponential backoff with jitter
        const delay = Math.pow(2, attempt) * API_CONFIG.retryDelay + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // 📦 Batch multiple requests for efficiency
  async batchRequests(requests) {
    return Promise.all(
      requests.map(({ endpoint, options }) => 
        this.request(endpoint, options)
      )
    );
  }

  // 🎯 Optimized movie data fetching with intelligent caching
  async getMovieData(movieId, type = 'movie') {
    const cacheKey = `movie_${type}_${movieId}`;
    
    return getCachedData(cacheKey, async () => {
      const [details, credits, videos, similar] = await Promise.allSettled([
        this.request(`/${type}/${movieId}`),
        this.request(`/${type}/${movieId}/credits`),
        this.request(`/${type}/${movieId}/videos`),
        this.request(`/${type}/${movieId}/similar`)
      ]);

      return {
        details: details.status === 'fulfilled' ? details.value : null,
        credits: credits.status === 'fulfilled' ? credits.value : null,
        videos: videos.status === 'fulfilled' ? videos.value : null,
        similar: similar.status === 'fulfilled' ? similar.value : null
      };
    }, { ttl: 10 * 60 * 1000 }); // 10 minutes for movie data
  }

  // 🎬 Optimized movie list fetching with pagination
  async getMovieList(endpoint, page = 1, priority = false) {
    const cacheKey = `list_${endpoint}_${page}`;
    
    return getCachedData(cacheKey, async () => {
      return this.request(endpoint, {
        params: { page },
        priority,
        cacheTTL: 2 * 60 * 1000 // 2 minutes for lists
      });
    });
  }

  // 🔍 Optimized search with debouncing
  async searchContent(query, type = 'multi', page = 1) {
    if (!query.trim()) return { results: [], total_pages: 0 };
    
    const cacheKey = `search_${type}_${query}_${page}`;
    
    return getCachedData(cacheKey, async () => {
      return this.request('/search/multi', {
        params: { query, page },
        cacheTTL: 1 * 60 * 1000 // 1 minute for search results
      });
    });
  }

  // 🎭 Optimized genre fetching
  async getGenres(type = 'movie') {
    const cacheKey = `genres_${type}`;
    
    return getCachedData(cacheKey, async () => {
      return this.request(`/genre/${type}/list`, {
        cacheTTL: 24 * 60 * 60 * 1000 // 24 hours for genres
      });
    });
  }

  // 📺 Optimized TV show data
  async getTVShowData(showId) {
    const cacheKey = `tv_show_${showId}`;
    
    return getCachedData(cacheKey, async () => {
      const [details, seasons] = await Promise.allSettled([
        this.request(`/tv/${showId}`),
        this.request(`/tv/${showId}/seasons`)
      ]);

      return {
        details: details.status === 'fulfilled' ? details.value : null,
        seasons: seasons.status === 'fulfilled' ? seasons.value : null
      };
    }, { ttl: 10 * 60 * 1000 });
  }

  // 🎬 Optimized trending content
  async getTrendingContent(timeWindow = 'day', type = 'all') {
    const cacheKey = `trending_${type}_${timeWindow}`;
    
    return getCachedData(cacheKey, async () => {
      return this.request('/trending/all/day', {
        params: { time_window: timeWindow },
        cacheTTL: 30 * 60 * 1000 // 30 minutes for trending
      });
    });
  }

  // 🏆 Optimized top rated content
  async getTopRatedContent(type = 'movie') {
    const cacheKey = `top_rated_${type}`;
    
    return getCachedData(cacheKey, async () => {
      return this.request(`/${type}/top_rated`, {
        cacheTTL: 60 * 60 * 1000 // 1 hour for top rated
      });
    });
  }

  // 🆕 Optimized upcoming content
  async getUpcomingContent(type = 'movie') {
    const cacheKey = `upcoming_${type}`;
    
    return getCachedData(cacheKey, async () => {
      return this.request(`/${type}/upcoming`, {
        cacheTTL: 2 * 60 * 60 * 1000 // 2 hours for upcoming
      });
    });
  }

  // 🎭 Optimized cast and crew data
  async getCastData(movieId, type = 'movie') {
    const cacheKey = `cast_${type}_${movieId}`;
    
    return getCachedData(cacheKey, async () => {
      return this.request(`/${type}/${movieId}/credits`, {
        cacheTTL: 24 * 60 * 60 * 1000 // 24 hours for cast data
      });
    });
  }

  // 🎬 Optimized similar content
  async getSimilarContent(movieId, type = 'movie', page = 1) {
    const cacheKey = `similar_${type}_${movieId}_${page}`;
    
    return getCachedData(cacheKey, async () => {
      return this.request(`/${type}/${movieId}/similar`, {
        params: { page },
        cacheTTL: 60 * 60 * 1000 // 1 hour for similar content
      });
    });
  }

  // 🎬 Optimized recommendations
  async getRecommendations(movieId, type = 'movie', page = 1) {
    const cacheKey = `recommendations_${type}_${movieId}_${page}`;
    
    return getCachedData(cacheKey, async () => {
      return this.request(`/${type}/${movieId}/recommendations`, {
        params: { page },
        cacheTTL: 60 * 60 * 1000 // 1 hour for recommendations
      });
    });
  }

  // 🎬 Optimized movie details with all related data
  async getCompleteMovieData(movieId, type = 'movie') {
    const cacheKey = `complete_${type}_${movieId}`;
    
    return getCachedData(cacheKey, async () => {
      const [
        details,
        credits,
        videos,
        similar,
        recommendations,
        images
      ] = await Promise.allSettled([
        this.request(`/${type}/${movieId}`),
        this.request(`/${type}/${movieId}/credits`),
        this.request(`/${type}/${movieId}/videos`),
        this.request(`/${type}/${movieId}/similar`),
        this.request(`/${type}/${movieId}/recommendations`),
        this.request(`/${type}/${movieId}/images`)
      ]);

      return {
        details: details.status === 'fulfilled' ? details.value : null,
        credits: credits.status === 'fulfilled' ? credits.value : null,
        videos: videos.status === 'fulfilled' ? videos.value : null,
        similar: similar.status === 'fulfilled' ? similar.value : null,
        recommendations: recommendations.status === 'fulfilled' ? recommendations.value : null,
        images: images.status === 'fulfilled' ? images.value : null
      };
    }, { ttl: 15 * 60 * 1000 }); // 15 minutes for complete data
  }

  // 🛠️ Utility methods
  buildUrl(endpoint, params = {}) {
    const url = new URL(`${API_CONFIG.baseURL}${endpoint}`);
    
    // Add API key
    url.searchParams.set('api_key', API_CONFIG.apiKey);
    
    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value.toString());
      }
    });
    
    return url.toString();
  }

  generateCacheKey(endpoint, params = {}) {
    const paramString = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    return `${endpoint}?${paramString}`;
  }

  recordApiCall(duration, success) {
    // This will be handled by the performance service
    if (window.gtag) {
      window.gtag('event', 'api_call', {
        duration: Math.round(duration),
        success: success
      });
    }
  }

  // 🧹 Cache management
  clearCache() {
    this.cache.clear();
    this.pendingRequests.clear();
    this.retryCounts.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      retryCounts: Object.fromEntries(this.retryCounts)
    };
  }
}

// Export singleton instance
export const optimizedApiService = new OptimizedApiService();

// Export convenience methods
export const getMovieData = (movieId, type) => optimizedApiService.getMovieData(movieId, type);
export const getMovieList = (endpoint, page, priority) => optimizedApiService.getMovieList(endpoint, page, priority);
export const searchContent = (query, type, page) => optimizedApiService.searchContent(query, type, page);
export const getGenres = (type) => optimizedApiService.getGenres(type);
export const getTVShowData = (showId) => optimizedApiService.getTVShowData(showId);
export const getTrendingContent = (timeWindow, type) => optimizedApiService.getTrendingContent(timeWindow, type);
export const getTopRatedContent = (type) => optimizedApiService.getTopRatedContent(type);
export const getUpcomingContent = (type) => optimizedApiService.getUpcomingContent(type);
export const getCastData = (movieId, type) => optimizedApiService.getCastData(movieId, type);
export const getSimilarContent = (movieId, type, page) => optimizedApiService.getSimilarContent(movieId, type, page);
export const getRecommendations = (movieId, type, page) => optimizedApiService.getRecommendations(movieId, type, page);
export const getCompleteMovieData = (movieId, type) => optimizedApiService.getCompleteMovieData(movieId, type); 