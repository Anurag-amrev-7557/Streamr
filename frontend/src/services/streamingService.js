// Streaming service for multiple streaming providers
export const STREAMING_SERVICES = {
  MOVIES111: {
    name: '111Movies',
    description: 'Fastest',
    baseUrl: 'https://111movies.com',
    movieFormat: '/movie/{id}',
    tvFormat: '/tv/{id}/{season}/{episode}'
  },
  VIDEASY: {
    name: 'Videasy',
    description: 'Fast',
    baseUrl: 'https://player.videasy.net',
    movieFormat: '/movie/{id}',
    tvFormat: '/tv/{id}/{season}/{episode}'
  },
  VIDJOY: {
    name: 'VidJoy',
    description: 'Dubbed',
    baseUrl: 'https://vidjoy.pro/embed',
    movieFormat: '/movie/{id}',
    tvFormat: '/tv/{id}/{season}/{episode}'
  },
  VIDFAST: {
    name: 'VidFast',
    description: 'Ad-free',
    baseUrl: 'https://vidfast.pro',
    movieFormat: '/movie/{id}',
    tvFormat: '/tv/{id}/{season}/{episode}'
  }
};

// Default streaming service
export const DEFAULT_STREAMING_SERVICE = 'MOVIES111';

/**
 * Get streaming service configuration
 * @param {string} serviceKey - Service key (MOVIES111, VIDEASY)
 * @returns {Object} Service configuration
 */
export const getStreamingService = (serviceKey = DEFAULT_STREAMING_SERVICE) => {
  return STREAMING_SERVICES[serviceKey] || STREAMING_SERVICES[DEFAULT_STREAMING_SERVICE];
};

/**
 * Generate streaming URL for movies
 * @param {string} id - Movie ID (IMDB with 'tt' prefix or TMDB ID)
 * @param {string} serviceKey - Streaming service key
 * @returns {string} Streaming URL
 */
export const getMovieStreamingUrl = (id, serviceKey = DEFAULT_STREAMING_SERVICE) => {
  if (!id) return null;
  
  try {
    const service = getStreamingService(serviceKey);
    const idString = String(id).trim();
    
    if (!idString) return null;
    
    // Format the URL using the service configuration
    return service.baseUrl + service.movieFormat.replace('{id}', idString);
  } catch (error) {
    console.error('Error generating movie streaming URL:', error);
    return null;
  }
};

/**
 * Generate streaming URL for TV show episodes
 * @param {string} id - TV Show ID (IMDB with 'tt' prefix or TMDB ID)
 * @param {number} season - Season number
 * @param {number} episode - Episode number
 * @param {string} serviceKey - Streaming service key
 * @returns {string} Streaming URL
 */
export const getTVStreamingUrl = (id, season, episode, serviceKey = DEFAULT_STREAMING_SERVICE) => {
  if (!id || !season || !episode) return null;
  
  try {
    const service = getStreamingService(serviceKey);
    const idString = String(id).trim();
    
    if (!idString) return null;
    
    const seasonNum = Number(season);
    const episodeNum = Number(episode);
    
    if (!seasonNum || !episodeNum || seasonNum < 1 || episodeNum < 1) {
      return null;
    }
    
    // Format the URL using the service configuration
    return service.baseUrl + service.tvFormat
      .replace('{id}', idString)
      .replace('{season}', seasonNum)
      .replace('{episode}', episodeNum);
  } catch (error) {
    console.error('Error generating TV streaming URL:', error);
    return null;
  }
};

/**
 * Get all available streaming URLs for a piece of content
 * @param {Object} content - Content object with id, type, and optional season/episode
 * @returns {Object} Object with service keys as keys and URLs as values
 */
export const getAllStreamingUrls = (content) => {
  if (!isStreamingAvailable(content)) return {};
  
  const urls = {};
  
  Object.keys(STREAMING_SERVICES).forEach(serviceKey => {
    if (content.type === 'movie') {
      const url = getMovieStreamingUrl(content.id, serviceKey);
      if (url) urls[serviceKey] = url;
    } else if (content.type === 'tv' && content.season && content.episode) {
      const url = getTVStreamingUrl(content.id, content.season, content.episode, serviceKey);
      if (url) urls[serviceKey] = url;
    }
  });
  
  return urls;
};

/**
 * Create an embed player URL for streaming
 * @param {string} streamingUrl - The base streaming URL
 * @returns {string} Embed player URL
 */
export const getEmbedPlayerUrl = (streamingUrl) => {
  if (!streamingUrl) return null;
  
  // Add embed parameter to the URL
  const url = new URL(streamingUrl);
  url.searchParams.set('embed', '1');
  return url.toString();
};

/**
 * Check if a streaming URL is available for a movie/show
 * @param {Object} movie - Movie/show object with id and type
 * @returns {boolean} Whether streaming is available
 */
export const isStreamingAvailable = (movie) => {
  if (!movie || !movie.id) return false;
  
  if (movie.type === 'movie') {
    return true;
  } else if (movie.type === 'tv') {
    // For TV shows, we need season and episode numbers
    return movie.season && movie.episode;
  }
  
  return false;
};

/**
 * Get streaming URL based on content type
 * @param {Object} content - Content object with id, type, and optional season/episode
 * @param {string} serviceKey - Streaming service key
 * @returns {string|null} Streaming URL or null if not available
 */
export const getStreamingUrl = (content, serviceKey = DEFAULT_STREAMING_SERVICE) => {
  if (!isStreamingAvailable(content)) return null;
  
  if (content.type === 'movie') {
    return getMovieStreamingUrl(content.id, serviceKey);
  } else if (content.type === 'tv' && content.season && content.episode) {
    return getTVStreamingUrl(content.id, content.season, content.episode, serviceKey);
  }
  
  return null;
};

/**
 * Check if content needs episode selection (TV shows without season/episode)
 * @param {Object} content - Content object
 * @returns {boolean} Whether episode selection is needed
 */
export const needsEpisodeSelection = (content) => {
  return content && content.type === 'tv' && (!content.season || !content.episode);
};

/**
 * Open streaming URL in a new tab
 * @param {string} url - Streaming URL
 */
export const openStreamingUrl = (url) => {
  if (!url) return;
  
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Open streaming URL in embed player
 * @param {string} url - Streaming URL
 */
export const openEmbedPlayer = (url) => {
  if (!url) return;
  
  const embedUrl = getEmbedPlayerUrl(url);
  window.open(embedUrl, '_blank', 'noopener,noreferrer');
};

/**
 * Get available streaming services for a piece of content
 * @param {Object} content - Content object
 * @returns {Array} Array of available service objects with name and key
 */
export const getAvailableStreamingServices = (content) => {
  if (!isStreamingAvailable(content)) return [];
  
  const availableServices = [];
  
  Object.entries(STREAMING_SERVICES).forEach(([key, service]) => {
    const url = getStreamingUrl(content, key);
    if (url) {
      availableServices.push({
        key,
        name: service.name,
        description: service.description,
        url
      });
    }
  });
  
  return availableServices;
};

/**
 * Get streaming URL for TV episode with specific service
 * @param {Object} episodeData - Episode data with season and episode numbers
 * @param {string} serviceKey - Streaming service key
 * @returns {string} Streaming URL for the episode
 */
export const getEpisodeStreamingUrl = (episodeData, serviceKey = DEFAULT_STREAMING_SERVICE) => {
  if (!episodeData || !episodeData.showId || !episodeData.season || !episodeData.episode) {
    return null;
  }
  
  return getTVStreamingUrl(
    episodeData.showId,
    episodeData.season,
    episodeData.episode,
    serviceKey
  );
};

/**
 * Get all available streaming URLs for a TV episode
 * @param {Object} episodeData - Episode data with season and episode numbers
 * @returns {Object} Object with service keys as keys and URLs as values
 */
export const getAllEpisodeStreamingUrls = (episodeData) => {
  if (!episodeData || !episodeData.showId || !episodeData.season || !episodeData.episode) {
    return {};
  }
  
  const urls = {};
  
  Object.keys(STREAMING_SERVICES).forEach(serviceKey => {
    const url = getTVStreamingUrl(
      episodeData.showId,
      episodeData.season,
      episodeData.episode,
      serviceKey
    );
    if (url) urls[serviceKey] = url;
  });
  
  return urls;
};

/**
 * Get available streaming services for a TV episode
 * @param {Object} episodeData - Episode data with season and episode numbers
 * @returns {Array} Array of available service objects with name and key
 */
export const getAvailableEpisodeStreamingServices = (episodeData) => {
  if (!episodeData || !episodeData.showId || !episodeData.season || !episodeData.episode) {
    return [];
  }
  
  const availableServices = [];
  
  Object.entries(STREAMING_SERVICES).forEach(([key, service]) => {
    const url = getTVStreamingUrl(
      episodeData.showId,
      episodeData.season,
      episodeData.episode,
      key
    );
    if (url) {
      availableServices.push({
        key,
        name: service.name,
        description: service.description,
        url
      });
    }
  });
  
  return availableServices;
}; 