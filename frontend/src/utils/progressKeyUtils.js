/**
 * Utility functions for consistent progress key generation across the application
 */

/**
 * Generate a consistent progress key for viewing progress tracking
 * @param {string|number} id - Content ID (movie ID or TV show ID)
 * @param {string} type - Content type ('movie' or 'tv')
 * @param {number|null} season - Season number (for TV shows)
 * @param {number|null} episode - Episode number (for TV shows)
 * @returns {string} Progress key in format: movie_{id} or tv_{id}_{season}_{episode}
 */
export const generateProgressKey = (id, type, season = null, episode = null) => {
  if (!id || !type) {
    console.warn('generateProgressKey: Missing required parameters', { id, type, season, episode });
    return null;
  }

  if (type === 'movie') {
    return `movie_${id}`;
  } else if (type === 'tv') {
    if (!season || !episode) {
      console.warn('generateProgressKey: TV shows require season and episode numbers', { 
        id, 
        season, 
        episode,
        error: !season && !episode ? 'Both season and episode are missing' :
               !season ? 'Season number is missing' : 'Episode number is missing'
      });
      return null;
    }
    return `tv_${id}_${season}_${episode}`;
  }

  console.warn('generateProgressKey: Unknown content type', { type });
  return null;
};

/**
 * Parse a progress key to extract its components
 * @param {string} progressKey - Progress key to parse
 * @returns {object|null} Parsed components or null if invalid
 */
export const parseProgressKey = (progressKey) => {
  if (!progressKey || typeof progressKey !== 'string') {
    return null;
  }

  if (progressKey.startsWith('movie_')) {
    const id = progressKey.replace('movie_', '');
    return {
      type: 'movie',
      id: parseInt(id, 10),
      season: null,
      episode: null
    };
  } else if (progressKey.startsWith('tv_')) {
    const parts = progressKey.split('_');
    if (parts.length === 4) {
      return {
        type: 'tv',
        id: parseInt(parts[1], 10),
        season: parseInt(parts[2], 10),
        episode: parseInt(parts[3], 10)
      };
    }
  }

  return null;
};

/**
 * Get progress for a specific content item
 * @param {object} viewingProgress - Current viewing progress object
 * @param {string|number} id - Content ID
 * @param {string} type - Content type
 * @param {number|null} season - Season number (for TV)
 * @param {number|null} episode - Episode number (for TV)
 * @returns {object|null} Progress data or null if not found
 */
export const getProgressForContent = (viewingProgress, id, type, season = null, episode = null) => {
  const progressKey = generateProgressKey(id, type, season, episode);
  if (!progressKey || !viewingProgress) {
    return null;
  }
  return viewingProgress[progressKey] || null;
};

/**
 * Check if content has any progress (useful for resume functionality)
 * @param {object} viewingProgress - Current viewing progress object
 * @param {string|number} id - Content ID
 * @param {string} type - Content type
 * @param {number|null} season - Season number (for TV)
 * @param {number|null} episode - Episode number (for TV)
 * @returns {boolean} True if content has progress between 0 and 100
 */
export const hasProgress = (viewingProgress, id, type, season = null, episode = null) => {
  const progress = getProgressForContent(viewingProgress, id, type, season, episode);
  return progress && typeof progress.progress === 'number' && progress.progress > 0 && progress.progress < 100;
};

/**
 * Get all progress entries for a TV show (across all seasons/episodes)
 * @param {object} viewingProgress - Current viewing progress object
 * @param {string|number} showId - TV show ID
 * @returns {array} Array of progress entries for the show
 */
export const getShowProgress = (viewingProgress, showId) => {
  if (!viewingProgress || !showId) {
    return [];
  }

  const showPrefix = `tv_${showId}_`;
  return Object.entries(viewingProgress)
    .filter(([key]) => key.startsWith(showPrefix))
    .map(([key, value]) => ({
      key,
      ...value,
      ...parseProgressKey(key)
    }));
};

/**
 * Validate episode data for consistent progress tracking
 * @param {object} episode - Episode data object
 * @param {object} currentSeason - Current season data (fallback)
 * @returns {object} Validated season and episode numbers
 */
export const validateEpisodeData = (episode, currentSeason = null) => {
  const seasonNumber = episode?.season_number || currentSeason?.season_number;
  const episodeNumber = episode?.episode_number;

  if (!seasonNumber || !episodeNumber) {
    console.warn('validateEpisodeData: Missing season or episode number', {
      episode: episode?.name,
      seasonNumber,
      episodeNumber,
      hasCurrentSeason: !!currentSeason
    });
  }

  return {
    seasonNumber,
    episodeNumber,
    isValid: !!(seasonNumber && episodeNumber)
  };
};
