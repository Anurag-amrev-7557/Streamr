// Streaming service for multiple streaming providers
export const STREAMING_SERVICES = {
  MOVIES111: {
    name: '111Movies',
    description: 'Fastest',
    baseUrl: 'https://111movies.com',
    movieFormat: '/movie/{id}',
    tvFormat: '/tv/{id}/{season}/{episode}',
    quality: '1080p',
    autoplay: true,
    preload: 'metadata',
    bandwidth: 'high'
  },
  RIVESTREAM: {
    name: 'RiveStream',
    description: 'Download, Dubbed',
    baseUrl: 'https://rivestream.net/embed',
    movieFormat: '?type=movie&id={id}',
    tvFormat: '?type=tv&id={id}&season={season}&episode={episode}',
    quality: '1080p',
    autoplay: true,
    preload: 'metadata',
    bandwidth: 'high'
  },
  CINEMAOS: {
    name: 'Cinemaos',
    description: 'Download, Dubbed',
    baseUrl: 'https://cinemaos.tech/player',
    movieFormat: '/{id}',
    tvFormat: '/{id}/{season}/{episode}',
    quality: '1080p',
    autoplay: true,
    preload: 'auto',
    bandwidth: 'high'
  },
  VIDEASY: {
    name: 'Videasy',
    description: 'Fast',
    baseUrl: 'https://player.videasy.net',
    movieFormat: '/movie/{id}',
    tvFormat: '/tv/{id}/{season}/{episode}',
    quality: '720p',
    autoplay: true,
    preload: 'metadata',
    bandwidth: 'high'
  },
  VIDJOY: {
    name: 'VidJoy',
    description: 'Dubbed',
    baseUrl: 'https://vidjoy.pro/embed',
    movieFormat: '/movie/{id}',
    tvFormat: '/tv/{id}/{season}/{episode}',
    quality: '720p',
    autoplay: false,
    preload: 'metadata',
    bandwidth: 'high'
  },
  VIDFAST: {
    name: 'VidFast',
    description: 'Ad-free',
    baseUrl: 'https://vidfast.pro',
    movieFormat: '/movie/{id}',
    tvFormat: '/tv/{id}/{season}/{episode}',
    quality: '1080p',
    autoplay: true,
    preload: 'auto',
    bandwidth: 'high'
  }
};

// Default streaming service
export const DEFAULT_STREAMING_SERVICE = 'RIVESTREAM';

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
 * @param {Object} options - Additional options for streaming
 * @returns {string} Streaming URL
 */
export const getMovieStreamingUrl = (id, serviceKey = DEFAULT_STREAMING_SERVICE, options = {}) => {
  if (!id) return null;
  
  try {
    const service = getStreamingService(serviceKey);
    const idString = String(id).trim();
    
    if (!idString) return null;
    
    // Base URL
    let url = service.baseUrl + service.movieFormat.replace('{id}', idString);
    
    // Add quality and performance parameters
    const params = new URLSearchParams();
    
    // Quality settings
    if (options.quality || service.quality) {
      params.append('quality', options.quality || service.quality);
    }
    
    // Autoplay settings
    if (options.autoplay !== undefined) {
      params.append('autoplay', options.autoplay ? '1' : '0');
    } else if (service.autoplay) {
      params.append('autoplay', '1');
    }
    
    // Preload settings
    if (options.preload || service.preload) {
      params.append('preload', options.preload || service.preload);
    }
    
    // Bandwidth optimization
    if (options.bandwidth || service.bandwidth) {
      params.append('bandwidth', options.bandwidth || service.bandwidth);
    }
    
    // Additional performance parameters
    if (options.adaptive) {
      params.append('adaptive', '1');
    }
    
    if (options.buffer) {
      params.append('buffer', options.buffer);
    }
    
    // Add parameters to URL if any exist
    if (params.toString()) {
      // Check if URL already has query parameters
      const separator = url.includes('?') ? '&' : '?';
      url += separator + params.toString();
    }
    
    return url;
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
 * @param {Object} options - Additional options for streaming
 * @returns {string} Streaming URL
 */
export const getTVStreamingUrl = (id, season, episode, serviceKey = DEFAULT_STREAMING_SERVICE, options = {}) => {
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
    
    // Base URL
    let url = service.baseUrl + service.tvFormat
      .replace('{id}', idString)
      .replace('{season}', seasonNum)
      .replace('{episode}', episodeNum);
    
    // Add quality and performance parameters
    const params = new URLSearchParams();
    
    // Quality settings
    if (options.quality || service.quality) {
      params.append('quality', options.quality || service.quality);
    }
    
    // Autoplay settings
    if (options.autoplay !== undefined) {
      params.append('autoplay', options.autoplay ? '1' : '0');
    } else if (service.autoplay) {
      params.append('autoplay', '1');
    }
    
    // Preload settings
    if (options.preload || service.preload) {
      params.append('preload', options.preload || service.preload);
    }
    
    // Bandwidth optimization
    if (options.bandwidth || service.bandwidth) {
      params.append('bandwidth', options.bandwidth || service.bandwidth);
    }
    
    // Episode-specific parameters
    params.append('season', seasonNum);
    params.append('episode', episodeNum);
    
    // Additional performance parameters
    if (options.adaptive) {
      params.append('adaptive', '1');
    }
    
    if (options.buffer) {
      params.append('buffer', options.buffer);
    }
    
    // Add parameters to URL
    // Check if URL already has query parameters
    const separator = url.includes('?') ? '&' : '?';
    url += separator + params.toString();
    
    return url;
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
  
  // Check both type and media_type for compatibility
  const contentType = movie.type || movie.media_type || 'movie';
  
  if (contentType === 'movie') {
    return true;
  } else if (contentType === 'tv') {
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
  
  // Check both type and media_type for compatibility
  const contentType = content.type || content.media_type || 'movie';
  
  if (contentType === 'movie') {
    return getMovieStreamingUrl(content.id, serviceKey);
  } else if (contentType === 'tv' && content.season && content.episode) {
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
  if (!content) return false;
  
  // Check both type and media_type for compatibility
  const contentType = content.type || content.media_type || 'movie';
  
  return contentType === 'tv' && (!content.season || !content.episode);
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

/**
 * Get streaming URL with quality options
 * @param {Object} content - Content object with id, type, season, episode
 * @param {string} serviceKey - Streaming service key
 * @param {Object} options - Quality and performance options
 * @returns {string} Streaming URL
 */
export const getStreamingUrlWithQuality = (content, serviceKey = DEFAULT_STREAMING_SERVICE, options = {}) => {
  if (!content) return null;
  
  const { id, type, season, episode } = content;
  
  if (type === 'tv' && season && episode) {
    return getTVStreamingUrl(id, season, episode, serviceKey, options);
  } else {
    return getMovieStreamingUrl(id, serviceKey, options);
  }
};

/**
 * Get the best streaming service based on network conditions
 * @param {Object} networkInfo - Network information
 * @returns {string} Best service key
 */
export const getBestStreamingService = (networkInfo = {}) => {
  const { connectionType, downlink, effectiveType } = networkInfo;
  
  // Very high-speed connections (fiber, 5G) - 50+ Mbps
  if (downlink > 50 || (effectiveType === '4g' && downlink > 40)) {
    return 'CINEMAOS'; // Highest quality premium service
  }
  
  // High-speed connections (fiber, 5G, fast WiFi) - 25-50 Mbps
  if (downlink > 25 || (effectiveType === '4g' && downlink > 20)) {
    return 'RIVESTREAM'; // High quality streaming
  }
  
  // High-speed connections (fast WiFi, 4G) - 15-25 Mbps
  if (downlink > 15) {
    return 'VIDFAST'; // High quality
  }
  
  // Medium-speed connections (4G, decent WiFi) - 10-15 Mbps
  if (downlink > 10) {
    return 'MOVIES111'; // Balanced quality/speed
  }
  
  // Low-speed connections (3G, slow WiFi) - 5-10 Mbps
  if (downlink > 5) {
    return 'VIDEASY'; // Lower quality, faster loading
  }
  
  // Very slow connections - <5 Mbps
  return 'VIDJOY'; // Lowest quality, fastest loading
};

/**
 * Get adaptive streaming options based on network conditions
 * @param {Object} networkInfo - Network information
 * @returns {Object} Streaming options
 */
export const getAdaptiveStreamingOptions = (networkInfo = {}) => {
  const { downlink, effectiveType } = networkInfo;
  
  if (downlink > 25) {
    return {
      quality: '1080p',
      preload: 'auto',
      adaptive: true,
      buffer: 'high'
    };
  } else if (downlink > 10) {
    return {
      quality: '720p',
      preload: 'metadata',
      adaptive: true,
      buffer: 'medium'
    };
  } else {
    return {
      quality: '480p',
      preload: 'none',
      adaptive: true,
      buffer: 'low'
    };
  }
}; 