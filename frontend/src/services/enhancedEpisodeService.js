// Enhanced Episode Service with Intelligent Caching and Performance Optimization
import { TMDB_API_KEY, TMDB_BASE_URL, TMDB_IMAGE_BASE_URL } from './tmdbService.js';
import advancedCache from './advancedCacheService.js';
import performanceMonitor from './performanceMonitor.js';

// Enhanced cache configuration for episodes
const EPISODE_CACHE_CONFIG = {
  SEASON_DETAILS: 30 * 60 * 1000,    // 30 minutes for season details
  EPISODE_LIST: 15 * 60 * 1000,      // 15 minutes for episode lists
  SEASON_METADATA: 60 * 60 * 1000,   // 1 hour for season metadata
  SERIES_METADATA: 2 * 60 * 60 * 1000, // 2 hours for series metadata
  IMAGES: 24 * 60 * 60 * 1000        // 24 hours for images
};

// Request deduplication to prevent duplicate API calls
const pendingRequests = new Map();

// Enhanced retry configuration
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY: 1000,
  MAX_DELAY: 8000,
  BACKOFF_MULTIPLIER: 2
};

class EnhancedEpisodeService {
  constructor() {
    this.cache = new Map();
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.rateLimitConfig = {
      maxRequests: 40,
      windowMs: 10 * 1000,
      currentRequests: 0,
      resetTime: Date.now()
    };
  }

  // Generate cache key for episodes and seasons
  generateCacheKey(type, tvId, seasonNumber = null, episodeNumber = null) {
    const parts = [type, tvId];
    if (seasonNumber !== null) parts.push(`s${seasonNumber}`);
    if (episodeNumber !== null) parts.push(`e${episodeNumber}`);
    return parts.join('_');
  }

  // Get cached data with TTL check
  getCachedData(key, ttl) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  // Set cached data with timestamp
  setCachedData(key, data, ttl) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  // Check and update rate limits
  checkRateLimit() {
    const now = Date.now();
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

  // Enhanced fetch with retry logic and error handling
  async fetchWithRetry(url, attempt = 1) {
    const requestKey = `${url}_${attempt}`;
    
    // Check if this exact request is already pending
    if (pendingRequests.has(requestKey)) {
      return pendingRequests.get(requestKey);
    }

    const requestPromise = this._executeFetchWithRetry(url, attempt);
    pendingRequests.set(requestKey, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      pendingRequests.delete(requestKey);
    }
  }

  async _executeFetchWithRetry(url, attempt = 1) {
    const startTime = performance.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const duration = performance.now() - startTime;
      
      // Track successful API call
      performanceMonitor.trackApiCall(url, 'GET', duration, response.status, JSON.stringify(data).length);
      
      return data;
    } catch (error) {
      const duration = performance.now() - startTime;
      performanceMonitor.trackApiCall(url, 'GET', duration, 0, 0);
      performanceMonitor.trackError(error, { url, attempt });
      
      // Retry logic for specific error types
      if (attempt < RETRY_CONFIG.MAX_RETRIES && this.shouldRetry(error)) {
        const delay = Math.min(
          RETRY_CONFIG.BASE_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt - 1),
          RETRY_CONFIG.MAX_DELAY
        );
        
        console.log(`Retrying episode fetch in ${delay}ms (attempt ${attempt + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this._executeFetchWithRetry(url, attempt + 1);
      }
      
      throw error;
    }
  }

  shouldRetry(error) {
    // Retry on network errors, timeouts, and 5xx server errors
    return error.name === 'AbortError' || 
           error.message.includes('fetch') ||
           error.message.includes('network') ||
           error.message.includes('timeout') ||
           (error.message.includes('HTTP 5') && !error.message.includes('HTTP 404'));
  }

  // Enhanced episode data transformation
  transformEpisodeData(episode, tvId, seasonNumber) {
    if (!episode) return null;
    
    return {
      id: episode.id,
      name: episode.name || 'Unknown Episode',
      overview: episode.overview || '',
      air_date: episode.air_date,
      episode_number: episode.episode_number || 0,
      season_number: seasonNumber,
      runtime: episode.runtime || 0,
      vote_average: episode.vote_average || 0,
      vote_count: episode.vote_count || 0,
      still_path: episode.still_path ? 
        `${TMDB_IMAGE_BASE_URL}/w300${episode.still_path.startsWith('/') ? episode.still_path : `/${episode.still_path}`}` : 
        null,
      crew: episode.crew || [],
      guest_stars: episode.guest_stars || [],
      production_code: episode.production_code || '',
      show_id: tvId,
      // Enhanced metadata
      formatted_runtime: this.formatRuntime(episode.runtime),
      formatted_air_date: this.formatDate(episode.air_date),
      rating_percentage: episode.vote_average ? Math.round(episode.vote_average * 10) : 0,
      has_overview: !!(episode.overview && episode.overview.trim()),
      has_still: !!episode.still_path
    };
  }

  // Enhanced season data transformation
  transformSeasonData(season, tvId) {
    if (!season) return null;
    
    return {
      id: season.id,
      name: season.name || `Season ${season.season_number}`,
      overview: season.overview || '',
      season_number: season.season_number,
      air_date: season.air_date,
      episode_count: season.episode_count || 0,
      poster_path: season.poster_path ? 
        `${TMDB_IMAGE_BASE_URL}/w500${season.poster_path.startsWith('/') ? season.poster_path : `/${season.poster_path}`}` : 
        null,
      show_id: tvId,
      // Enhanced metadata
      formatted_air_date: this.formatDate(season.air_date),
      has_overview: !!(season.overview && season.overview.trim()),
      has_poster: !!season.poster_path,
      is_special: season.season_number === 0,
      is_latest: false // Will be set by caller
    };
  }

  // Format runtime in human-readable format
  formatRuntime(minutes) {
    if (!minutes || minutes <= 0) return 'Unknown';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  // Format date in human-readable format
  formatDate(dateString) {
    if (!dateString) return 'TBA';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  }

  // Fetch single season with enhanced caching
  async getSeason(tvId, seasonNumber, options = {}) {
    const cacheKey = this.generateCacheKey('season', tvId, seasonNumber);
    const ttl = options.cacheTTL || EPISODE_CACHE_CONFIG.SEASON_DETAILS;
    
    // Check cache first
    const cached = this.getCachedData(cacheKey, ttl);
    if (cached && !options.forceRefresh) {
      return cached;
    }

    // Check rate limits
    if (!this.checkRateLimit()) {
      return this.queueRequest(() => this.getSeason(tvId, seasonNumber, options));
    }

    try {
      const url = `${TMDB_BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits,videos,images`;
      const data = await this.fetchWithRetry(url);
      
      if (!data) {
        throw new Error('Invalid response from TMDB API');
      }

      // Transform the data
      const transformedSeason = {
        id: data.id,
        name: data.name,
        overview: data.overview || '',
        season_number: data.season_number,
        air_date: data.air_date,
        poster_path: data.poster_path ? 
          `${TMDB_IMAGE_BASE_URL}/w500${data.poster_path.startsWith('/') ? data.poster_path : `/${data.poster_path}`}` : 
          null,
        episode_count: data.episodes ? data.episodes.length : 0,
        episodes: data.episodes ? data.episodes.map(episode => 
          this.transformEpisodeData(episode, tvId, seasonNumber)
        ).filter(Boolean) : [],
        show_id: tvId,
        // Enhanced metadata
        formatted_air_date: this.formatDate(data.air_date),
        has_overview: !!(data.overview && data.overview.trim()),
        has_poster: !!data.poster_path,
        is_special: data.season_number === 0
      };

      // Cache the result
      this.setCachedData(cacheKey, transformedSeason, ttl);
      
      return transformedSeason;
    } catch (error) {
      console.error(`Error fetching season ${seasonNumber} for TV show ${tvId}:`, error);
      throw error;
    }
  }

  // Fetch multiple seasons in batch with intelligent caching
  async getSeasonsBatch(tvId, seasonNumbers, options = {}) {
    const results = [];
    const promises = [];
    
    // Check cache for each season first
    for (const seasonNumber of seasonNumbers) {
      const cacheKey = this.generateCacheKey('season', tvId, seasonNumber);
      const ttl = options.cacheTTL || EPISODE_CACHE_CONFIG.SEASON_DETAILS;
      const cached = this.getCachedData(cacheKey, ttl);
      
      if (cached && !options.forceRefresh) {
        results.push(cached);
      } else {
        promises.push(
          this.getSeason(tvId, seasonNumber, options)
            .then(season => ({ season, index: seasonNumbers.indexOf(seasonNumber) }))
            .catch(error => ({ error, index: seasonNumbers.indexOf(seasonNumber) }))
        );
      }
    }

    // Fetch uncached seasons
    if (promises.length > 0) {
      const batchResults = await Promise.allSettled(promises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          const { season, index } = result.value;
          if (season) {
            results[index] = season;
          }
        } else {
          console.error('Batch season fetch failed:', result.reason);
        }
      }
    }

    return results.filter(Boolean);
  }

  // Fetch all seasons for a TV show with progressive loading
  async getAllSeasons(tvId, options = {}) {
    const cacheKey = this.generateCacheKey('seasons_metadata', tvId);
    const ttl = options.cacheTTL || EPISODE_CACHE_CONFIG.SEASON_METADATA;
    
    // Check cache for seasons metadata
    const cached = this.getCachedData(cacheKey, ttl);
    if (cached && !options.forceRefresh) {
      return cached;
    }

    try {
      // First, get the TV show details to know how many seasons
      const url = `${TMDB_BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=seasons`;
      const data = await this.fetchWithRetry(url);
      
      if (!data || !data.seasons) {
        throw new Error('Invalid response from TMDB API');
      }

      // Transform seasons metadata
      const seasonsMetadata = data.seasons.map(season => 
        this.transformSeasonData(season, tvId)
      ).filter(Boolean);

      // Mark the latest season
      if (seasonsMetadata.length > 0) {
        const latestSeason = seasonsMetadata[seasonsMetadata.length - 1];
        latestSeason.is_latest = true;
      }

      // Cache the metadata
      this.setCachedData(cacheKey, seasonsMetadata, ttl);
      
      return seasonsMetadata;
    } catch (error) {
      console.error(`Error fetching seasons metadata for TV show ${tvId}:`, error);
      throw error;
    }
  }

  // Progressive loading of episodes with virtual scrolling support
  async getEpisodesProgressive(tvId, seasonNumber, options = {}) {
    const {
      page = 1,
      pageSize = 20,
      includeDetails = true,
      sortBy = 'episode_number',
      sortOrder = 'asc'
    } = options;

    try {
      // Get the full season data
      const season = await this.getSeason(tvId, seasonNumber, options);
      
      if (!season || !season.episodes) {
        return {
          episodes: [],
          total: 0,
          page: 1,
          hasMore: false
        };
      }

      // Sort episodes
      let sortedEpisodes = [...season.episodes];
      sortedEpisodes.sort((a, b) => {
        const aValue = a[sortBy] || 0;
        const bValue = b[sortBy] || 0;
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      });

      // Apply pagination
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedEpisodes = sortedEpisodes.slice(startIndex, endIndex);

      return {
        episodes: paginatedEpisodes,
        total: sortedEpisodes.length,
        page,
        hasMore: endIndex < sortedEpisodes.length,
        totalPages: Math.ceil(sortedEpisodes.length / pageSize)
      };
    } catch (error) {
      console.error(`Error fetching episodes progressively for season ${seasonNumber}:`, error);
      throw error;
    }
  }

  // Search episodes within a season
  async searchEpisodes(tvId, seasonNumber, searchTerm, options = {}) {
    try {
      const season = await this.getSeason(tvId, seasonNumber, options);
      
      if (!season || !season.episodes) {
        return [];
      }

      const term = searchTerm.toLowerCase();
      return season.episodes.filter(episode => 
        episode.name.toLowerCase().includes(term) ||
        episode.overview.toLowerCase().includes(term) ||
        episode.episode_number.toString().includes(term) ||
        episode.production_code?.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error(`Error searching episodes in season ${seasonNumber}:`, error);
      throw error;
    }
  }

  // Get episode statistics for a season
  async getSeasonStats(tvId, seasonNumber, options = {}) {
    try {
      const season = await this.getSeason(tvId, seasonNumber, options);
      
      if (!season || !season.episodes) {
        return null;
      }

      const episodes = season.episodes;
      const totalEpisodes = episodes.length;
      const episodesWithRatings = episodes.filter(ep => ep.vote_average > 0);
      const episodesWithRuntime = episodes.filter(ep => ep.runtime > 0);
      const episodesWithOverview = episodes.filter(ep => ep.has_overview);

      return {
        total_episodes: totalEpisodes,
        average_rating: episodesWithRatings.length > 0 ? 
          episodesWithRatings.reduce((sum, ep) => sum + ep.vote_average, 0) / episodesWithRatings.length : 0,
        total_runtime: episodesWithRuntime.reduce((sum, ep) => sum + ep.runtime, 0),
        average_runtime: episodesWithRuntime.length > 0 ? 
          episodesWithRuntime.reduce((sum, ep) => sum + ep.runtime, 0) / episodesWithRuntime.length : 0,
        episodes_with_overview: episodesWithOverview.length,
        episodes_with_ratings: episodesWithRatings.length,
        episodes_with_runtime: episodesWithRuntime.length,
        best_rated_episode: episodesWithRatings.length > 0 ? 
          episodesWithRatings.reduce((best, ep) => ep.vote_average > best.vote_average ? ep : best) : null,
        longest_episode: episodesWithRuntime.length > 0 ? 
          episodesWithRuntime.reduce((longest, ep) => ep.runtime > longest.runtime ? ep : longest) : null
      };
    } catch (error) {
      console.error(`Error getting stats for season ${seasonNumber}:`, error);
      throw error;
    }
  }

  // Queue request for rate limiting
  async queueRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }

  // Process queued requests
  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const { requestFn, resolve, reject } = this.requestQueue.shift();
      
      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Small delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessingQueue = false;
  }

  // Clear cache for specific TV show or all cache
  clearCache(tvId = null) {
    if (tvId) {
      // Clear cache for specific TV show
      for (const [key] of this.cache) {
        if (key.includes(`_${tvId}_`)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: this.cache.size * 1000 // Rough estimate in bytes
    };
  }

  // Cleanup method
  cleanup() {
    this.cache.clear();
    this.requestQueue = [];
    pendingRequests.clear();
  }
}

// Create singleton instance
const enhancedEpisodeService = new EnhancedEpisodeService();

// Export the service and individual methods for backward compatibility
export default enhancedEpisodeService;

// Export individual methods for direct use
export const {
  getSeason,
  getSeasonsBatch,
  getAllSeasons,
  getEpisodesProgressive,
  searchEpisodes,
  getSeasonStats,
  clearCache,
  getCacheStats,
  cleanup
} = enhancedEpisodeService; 