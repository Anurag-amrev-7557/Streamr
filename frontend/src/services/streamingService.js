// Streaming service for 111movies.com integration
export const STREAMING_BASE_URL = 'https://111movies.com';

/**
 * Generate streaming URL for movies
 * @param {string} id - Movie ID (IMDB with 'tt' prefix or TMDB ID)
 * @returns {string} Streaming URL
 */
export const getMovieStreamingUrl = (id) => {
  if (!id) return null;
  
  try {
    // Convert id to string to ensure it has string methods
    const idString = String(id).trim();
    
    // Validate the ID is not empty after trimming
    if (!idString) return null;
    
    // If it's already an IMDB ID with 'tt' prefix, use it directly
    if (idString.startsWith('tt')) {
      return `${STREAMING_BASE_URL}/movie/${idString}`;
    }
    
    // For TMDB IDs, we need to convert them to IMDB format
    // For now, we'll use the TMDB ID directly as it should work
    return `${STREAMING_BASE_URL}/movie/${idString}`;
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
 * @returns {string} Streaming URL
 */
export const getTVStreamingUrl = (id, season, episode) => {
  if (!id || !season || !episode) return null;
  
  try {
    // Convert id to string to ensure it has string methods
    const idString = String(id).trim();
    
    // Validate the ID is not empty after trimming
    if (!idString) return null;
    
    // Validate season and episode are positive numbers
    const seasonNum = Number(season);
    const episodeNum = Number(episode);
    
    if (!seasonNum || !episodeNum || seasonNum < 1 || episodeNum < 1) {
      return null;
    }
    
    // If it's already an IMDB ID with 'tt' prefix, use it directly
    if (idString.startsWith('tt')) {
      return `${STREAMING_BASE_URL}/tv/${idString}/${seasonNum}/${episodeNum}`;
    }
    
    // For TMDB IDs, we'll use them directly
    return `${STREAMING_BASE_URL}/tv/${idString}/${seasonNum}/${episodeNum}`;
  } catch (error) {
    console.error('Error generating TV streaming URL:', error);
    return null;
  }
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
  return movie && movie.id && (movie.type === 'movie' || movie.type === 'tv');
};

/**
 * Get streaming URL based on content type
 * @param {Object} content - Content object with id, type, and optional season/episode
 * @returns {string|null} Streaming URL or null if not available
 */
export const getStreamingUrl = (content) => {
  if (!isStreamingAvailable(content)) return null;
  
  if (content.type === 'movie') {
    return getMovieStreamingUrl(content.id);
  } else if (content.type === 'tv' && content.season && content.episode) {
    return getTVStreamingUrl(content.id, content.season, content.episode);
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