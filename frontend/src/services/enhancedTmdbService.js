// Enhanced TMDB Service with Advanced Caching and Performance Monitoring
import advancedCache from './advancedCacheService.js';
import performanceMonitor from './performanceMonitor.js';
import enhancedApiService from './enhancedApiService.js';

// TMDB Configuration
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Validate API key configuration
if (!TMDB_API_KEY || TMDB_API_KEY === 'undefined' || TMDB_API_KEY === '') {
  console.error('❌ TMDB API Key is missing or invalid!');
  console.error('Please set the VITE_TMDB_API_KEY environment variable in your .env file');
  console.error('You can get a free API key from: https://www.themoviedb.org/settings/api');
} else {
  console.debug('✅ TMDB API Key is configured');
}

class EnhancedTmdbService {
  constructor() {
    this.cacheConfig = {
      movieDetails: 60 * 60 * 1000, // 1 hour
      movieList: 30 * 60 * 1000,    // 30 minutes
      images: 24 * 60 * 60 * 1000,  // 24 hours
      search: 15 * 60 * 1000,       // 15 minutes
      genres: 24 * 60 * 60 * 1000   // 24 hours
    };
    
    this.rateLimitConfig = {
      maxRequests: 40,
      windowMs: 10 * 1000, // 10 seconds
      currentRequests: 0,
      resetTime: Date.now()
    };
    
    this.requestQueue = [];
    this.isProcessingQueue = false;
  }

  // Enhanced request method with intelligent caching and rate limiting
  async makeRequest(endpoint, params = {}, cacheKey = null, cacheTTL = null) {
    const startTime = performance.now();
    
    // Generate cache key if not provided
    if (!cacheKey) {
      cacheKey = this.generateCacheKey(endpoint, params);
    }
    
    // Check cache first
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      performanceMonitor.trackApiCall(endpoint, 'GET', performance.now() - startTime, 200, 0);
      return cachedData;
    }
    
    // Check rate limits
    if (!this.checkRateLimit()) {
      return this.queueRequest(endpoint, params, cacheKey, cacheTTL);
    }
    
    try {
      const url = `${TMDB_BASE_URL}${endpoint}`;
      const queryParams = new URLSearchParams({
        api_key: TMDB_API_KEY,
        ...params
      });
      
      const fullUrl = `${url}?${queryParams.toString()}`;
      
      const response = await fetch(fullUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const duration = performance.now() - startTime;
      
      if (!response.ok) {
        performanceMonitor.trackApiCall(endpoint, 'GET', duration, response.status, 0);
        throw new Error(`TMDB API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache the response
      this.cacheData(cacheKey, data, cacheTTL);
      
      // Track successful API call
      performanceMonitor.trackApiCall(endpoint, 'GET', duration, response.status, JSON.stringify(data).length);
      
      return data;
    } catch (error) {
      const duration = performance.now() - startTime;
      performanceMonitor.trackApiCall(endpoint, 'GET', duration, 0, 0);
      performanceMonitor.trackError(error, { endpoint, params });
      throw error;
    }
  }

  // Generate cache key
  generateCacheKey(endpoint, params = {}) {
    const paramString = Object.keys(params).length > 0 
      ? JSON.stringify(params) 
      : '';
    return `tmdb:${endpoint}:${paramString}`;
  }

  // Get cached data
  getCachedData(cacheKey) {
    return advancedCache.get(cacheKey, {
      namespace: 'tmdb',
      params: { ttl: this.cacheConfig.movieList }
    });
  }

  // Cache data
  cacheData(cacheKey, data, ttl = null) {
    const cacheTTL = ttl || this.cacheConfig.movieList;
    
    advancedCache.set(cacheKey, data, {
      namespace: 'tmdb',
      ttl: cacheTTL,
      priority: 'normal',
      compress: true
    });
  }

  // Check rate limits
  checkRateLimit() {
    const now = Date.now();
    
    // Reset counter if window has passed
    if (now - this.rateLimitConfig.resetTime > this.rateLimitConfig.windowMs) {
      this.rateLimitConfig.currentRequests = 0;
      this.rateLimitConfig.resetTime = now;
    }
    
    if (this.rateLimitConfig.currentRequests >= this.rateLimitConfig.maxRequests) {
      return false;
    }
    
    this.rateLimitConfig.currentRequests++;
    return true;
  }

  // Queue request for later execution
  async queueRequest(endpoint, params, cacheKey, cacheTTL) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        endpoint,
        params,
        cacheKey,
        cacheTTL,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  // Process queued requests
  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0 && this.checkRateLimit()) {
      const request = this.requestQueue.shift();
      
      try {
        const result = await this.makeRequest(
          request.endpoint,
          request.params,
          request.cacheKey,
          request.cacheTTL
        );
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
      
      // Add delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    
    this.isProcessingQueue = false;
    
    // Process remaining requests after a delay
    if (this.requestQueue.length > 0) {
      setTimeout(() => this.processQueue(), 1000);
    }
  }

  // Enhanced movie data transformation
  transformMovieData(movie) {
    if (!movie) return null;
    
    try {
      const genreMap = {
        28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
        80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
        14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
        9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
        10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
      };

      const getGenreNames = (genreIds) => {
        if (!genreIds || !Array.isArray(genreIds)) return [];
        return genreIds
          .map(id => genreMap[id] || `Unknown Genre (${id})`)
          .filter(Boolean);
      };

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

      const formatDuration = (runtime) => {
        if (!runtime || runtime <= 0) return null;
        const hours = Math.floor(runtime / 60);
        const minutes = runtime % 60;
        if (hours === 0) return `${minutes}m`;
        if (minutes === 0) return `${hours}h`;
        return `${hours}h ${minutes}m`;
      };

      const getImageUrl = (path, size = 'w500') => {
        if (!path) return null;
        return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
      };

      const processedDate = processDate(movie.release_date);
      const genreNames = getGenreNames(movie.genre_ids);
      
      return {
        id: movie.id || null,
        title: movie.title || movie.name || 'Untitled',
        overview: movie.overview || '',
        poster: getImageUrl(movie.poster_path, 'w500'),
        backdrop: getImageUrl(movie.backdrop_path, 'original'),
        rating: movie.vote_average ? movie.vote_average.toFixed(1) : '0.0',
        year: processedDate ? processedDate.getFullYear() : null,
        duration: formatDuration(movie.runtime),
        runtime: movie.runtime || 0,
        genres: genreNames,
        genre_ids: movie.genre_ids || [],
        type: movie.media_type || 'movie',
        trailer: null,
        releaseDate: movie.release_date || null,
        status: movie.status || 'Released',
        voteCount: movie.vote_count || 0,
        popularity: movie.popularity || 0,
        originalLanguage: movie.original_language || 'en',
        originalTitle: movie.original_title || movie.original_name || movie.title,
        director: null,
        cast: null,
        adult: movie.adult || false,
        video: movie.video || false,
        budget: movie.budget || 0,
        revenue: movie.revenue || 0,
        tagline: movie.tagline || '',
        isProcessed: true,
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error processing movie data:', error, movie);
      return {
        id: movie.id || null,
        title: movie.title || 'Unknown Title',
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
  }

  // Enhanced TV data transformation
  transformTVData(tv) {
    if (!tv) return null;
    
    try {
      const genreMap = {
        10759: 'Action & Adventure', 16: 'Animation', 35: 'Comedy',
        80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
        10762: 'Kids', 9648: 'Mystery', 10763: 'News', 10764: 'Reality',
        10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk',
        10768: 'War & Politics', 37: 'Western', 10770: 'TV Movie'
      };

      const getGenreNames = (genreIds) => {
        if (!genreIds || !Array.isArray(genreIds)) return [];
        return genreIds
          .map(id => genreMap[id] || `Unknown Genre (${id})`)
          .filter(Boolean);
      };

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

      const formatDuration = (minutes) => {
        if (!minutes || minutes <= 0) return null;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      };

      const getImageUrl = (path, size = 'w500') => {
        if (!path) return null;
        return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
      };

      const processedDate = processDate(tv.first_air_date);
      const genreNames = getGenreNames(tv.genre_ids || tv.genres?.map(g => g.id) || []);

      return {
        id: tv.id,
        title: tv.name || tv.title || 'Unknown Title',
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
        trailer: null,
        network: tv.networks?.[0]?.name || null,
        seasons: tv.number_of_seasons || 0,
        episodes: tv.number_of_episodes || 0,
        status: tv.status || 'Unknown',
        lastAirDate: processDate(tv.last_air_date),
        voteCount: tv.vote_count || 0,
        popularity: tv.popularity || 0,
        originalLanguage: tv.original_language || 'en',
        originalTitle: tv.original_name || tv.name,
        director: null,
        cast: null,
        isProcessed: true,
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error processing TV data:', error, tv);
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
  }

  // Enhanced movie fetching with better error handling and caching
  async fetchMovies(endpoint, page = 1, additionalParams = {}) {
    try {
      const params = {
        page,
        language: 'en-US',
        include_adult: false,
        ...additionalParams
      };
      
      const data = await this.makeRequest(endpoint, params, null, this.cacheConfig.movieList);
      
      if (!data || !data.results) {
        throw new Error('Invalid API response structure');
      }
      
      const transformedMovies = data.results
        .map(movie => this.transformMovieData(movie))
        .filter(Boolean);
      
      return {
        movies: transformedMovies,
        totalPages: data.total_pages || 1,
        currentPage: data.page || page,
        totalResults: data.total_results || transformedMovies.length,
        hasMore: (data.page || page) < (data.total_pages || 1)
      };
    } catch (error) {
      console.error('Error fetching movies:', error);
      return {
        movies: [],
        totalPages: 1,
        currentPage: page,
        totalResults: 0,
        hasMore: false,
        error: error.message
      };
    }
  }

  // Enhanced movie details fetching
  async getMovieDetails(id, type = 'movie') {
    try {
      const endpoint = `/${type}/${id}`;
      const params = {
        append_to_response: 'videos,credits,similar,images',
        include_image_language: 'en'
      };
      
      const data = await this.makeRequest(endpoint, params, null, this.cacheConfig.movieDetails);
      
      if (!data) {
        return null;
      }
      
      const baseData = type === 'movie' ? this.transformMovieData(data) : this.transformTVData(data);
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
        type === 'movie' ? this.transformMovieData(item) : this.transformTVData(item)
      ).filter(Boolean) || [];
      
      return {
        ...baseData,
        logo: logoUrl,
        backdrop,
        trailer,
        cast,
        director,
        similar,
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
  }

  // Enhanced search functionality
  async searchMovies(query, page = 1, options = {}) {
    try {
      const params = {
        query,
        page,
        language: 'en-US',
        include_adult: false,
        ...options
      };
      
      const data = await this.makeRequest('/search/multi', params, null, this.cacheConfig.search);
      
      if (!data || !data.results) {
        throw new Error('Invalid search response');
      }
      
      const results = data.results
        .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
        .map(item => {
          if (item.media_type === 'movie') {
            return this.transformMovieData(item);
          } else {
            return this.transformTVData(item);
          }
        })
        .filter(Boolean);
      
      return {
        results,
        totalPages: data.total_pages || 1,
        currentPage: data.page || page,
        totalResults: data.total_results || results.length,
        hasMore: (data.page || page) < (data.total_pages || 1)
      };
    } catch (error) {
      console.error('Error searching movies:', error);
      return {
        results: [],
        totalPages: 1,
        currentPage: page,
        totalResults: 0,
        hasMore: false,
        error: error.message
      };
    }
  }

  // Enhanced trending movies
  async getTrendingMovies(page = 1) {
    return this.fetchMovies('/trending/all/week', page);
  }

  // Enhanced popular movies
  async getPopularMovies(page = 1) {
    return this.fetchMovies('/movie/popular', page);
  }

  // Enhanced top rated movies
  async getTopRatedMovies(page = 1) {
    return this.fetchMovies('/movie/top_rated', page);
  }

  // Enhanced upcoming movies
  async getUpcomingMovies(page = 1) {
    return this.fetchMovies('/movie/upcoming', page);
  }

  // Enhanced now playing movies
  async getNowPlayingMovies(page = 1) {
    return this.fetchMovies('/movie/now_playing', page);
  }

  // Enhanced movies by genre
  async getMoviesByGenre(genreId, page = 1) {
    const params = {
      with_genres: genreId,
      sort_by: 'popularity.desc',
      'vote_count.gte': 10
    };
    
    return this.fetchMovies('/discover/movie', page, params);
  }

  // Enhanced TV shows
  async getPopularTVShows(page = 1) {
    return this.fetchMovies('/tv/popular', page);
  }

  async getTopRatedTVShows(page = 1) {
    return this.fetchMovies('/tv/top_rated', page);
  }

  async getAiringTodayTVShows(page = 1) {
    return this.fetchMovies('/tv/airing_today', page);
  }

  // Enhanced genres
  async getGenres(includeTV = true) {
    try {
      const cacheKey = `genres_${includeTV}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }
      
      const movieResponse = await this.makeRequest('/genre/movie/list', {}, null, this.cacheConfig.genres);
      let allGenres = movieResponse.genres || [];
      
      if (includeTV) {
        try {
          const tvResponse = await this.makeRequest('/genre/tv/list', {}, null, this.cacheConfig.genres);
          const tvGenres = tvResponse.genres || [];
          
          const genreMap = new Map();
          
          allGenres.forEach(genre => {
            genreMap.set(genre.id, { ...genre, type: 'movie' });
          });
          
          tvGenres.forEach(genre => {
            if (genreMap.has(genre.id)) {
              const existing = genreMap.get(genre.id);
              genreMap.set(genre.id, { ...existing, type: 'both' });
            } else {
              genreMap.set(genre.id, { ...genre, type: 'tv' });
            }
          });
          
          allGenres = Array.from(genreMap.values());
        } catch (error) {
          console.warn('Failed to fetch TV genres:', error);
        }
      }
      
      const result = {
        genres: allGenres,
        total: allGenres.length,
        includeTV,
        fetchedAt: new Date().toISOString()
      };
      
      this.cacheData(cacheKey, result, this.cacheConfig.genres);
      return result;
    } catch (error) {
      console.error('Error fetching genres:', error);
      return {
        genres: [],
        total: 0,
        includeTV,
        error: error.message
      };
    }
  }

  // Clear cache
  clearCache(pattern = null) {
    if (pattern) {
      return advancedCache.invalidate({
        namespace: 'tmdb',
        pattern: new RegExp(pattern)
      });
    } else {
      return advancedCache.invalidate({ namespace: 'tmdb' });
    }
  }

  // Get service statistics
  getStats() {
    return {
      rateLimit: {
        current: this.rateLimitConfig.currentRequests,
        max: this.rateLimitConfig.maxRequests,
        resetTime: this.rateLimitConfig.resetTime
      },
      queue: {
        length: this.requestQueue.length,
        isProcessing: this.isProcessingQueue
      },
      cache: advancedCache.getStats()
    };
  }

  // Cleanup resources
  cleanup() {
    this.requestQueue = [];
    this.isProcessingQueue = false;
  }
}

// Create singleton instance
const enhancedTmdbService = new EnhancedTmdbService();

// Export the singleton instance
export default enhancedTmdbService;

// Export utility functions
export const tmdbUtils = {
  // Movie fetching
  getTrendingMovies: (page) => enhancedTmdbService.getTrendingMovies(page),
  getPopularMovies: (page) => enhancedTmdbService.getPopularMovies(page),
  getTopRatedMovies: (page) => enhancedTmdbService.getTopRatedMovies(page),
  getUpcomingMovies: (page) => enhancedTmdbService.getUpcomingMovies(page),
  getNowPlayingMovies: (page) => enhancedTmdbService.getNowPlayingMovies(page),
  getMoviesByGenre: (genreId, page) => enhancedTmdbService.getMoviesByGenre(genreId, page),
  
  // TV fetching
  getPopularTVShows: (page) => enhancedTmdbService.getPopularTVShows(page),
  getTopRatedTVShows: (page) => enhancedTmdbService.getTopRatedTVShows(page),
  getAiringTodayTVShows: (page) => enhancedTmdbService.getAiringTodayTVShows(page),
  
  // Details and search
  getMovieDetails: (id, type) => enhancedTmdbService.getMovieDetails(id, type),
  searchMovies: (query, page, options) => enhancedTmdbService.searchMovies(query, page, options),
  
  // Genres
  getGenres: (includeTV) => enhancedTmdbService.getGenres(includeTV),
  
  // Cache management
  clearCache: (pattern) => enhancedTmdbService.clearCache(pattern),
  
  // Stats
  getStats: () => enhancedTmdbService.getStats(),
  
  // Cleanup
  cleanup: () => enhancedTmdbService.cleanup(),
  
  // Constants
  TMDB_BASE_URL,
  TMDB_IMAGE_BASE_URL,
  transformMovieData: (movie) => enhancedTmdbService.transformMovieData(movie),
  transformTVData: (tv) => enhancedTmdbService.transformTVData(tv)
}; 