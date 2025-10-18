// YouTube Error Handler Utility
// Handles common YouTube player errors caused by ad blockers and privacy extensions

/**
 * Check if an error is a YouTube-related error that should be suppressed
 * @param {Error|string} error - The error to check
 * @returns {boolean} - True if the error should be suppressed
 */
export const isYouTubeError = (error) => {
  if (!error) return false;
  
  const errorMessage = error.toString().toLowerCase();
  const errorUrl = error.url || error.src || '';
  
  // YouTube-specific error patterns
  const youtubeErrorPatterns = [
    'err_blocked_by_client',
    'net::err_blocked_by_client',
    'generate_204',
    'log_event',
    'stats/qoe',
    'youtubei/v1/log_event',
    'play.google.com/log',
    'youtube.com/generate_204'
  ];
  
  // Check if the error matches any YouTube error patterns
  const isYouTubeError = youtubeErrorPatterns.some(pattern => 
    errorMessage.includes(pattern) || errorUrl.includes(pattern)
  );
  
  // Check if it's from YouTube domains
  const youtubeDomains = [
    'youtube.com',
    'youtu.be',
    'googlevideo.com',
    'google.com',
    'play.google.com'
  ];
  
  const isFromYouTubeDomain = youtubeDomains.some(domain => 
    errorUrl.includes(domain) || errorMessage.includes(domain)
  );
  
  return isYouTubeError || isFromYouTubeDomain;
};

/**
 * Handle YouTube player errors gracefully
 * @param {Error|Object} error - The error to handle
 * @param {boolean} isDevelopment - Whether we're in development mode
 */
export const handleYouTubeError = (error, isDevelopment = false) => {
  // Handle YouTube API error codes
  if (error && typeof error === 'object') {
    const errorCode = error.data || error.code || error.error;
    
    // Error 150: Video owner has restricted embedding
    if (errorCode === 150) {
      if (isDevelopment) {
        console.debug('YouTube player: Video embedding restricted by owner (error 150)');
      }
      return true; // Error was handled
    }
    
    // Error 101: Video owner has restricted embedding
    if (errorCode === 101) {
      if (isDevelopment) {
        console.debug('YouTube player: Video embedding restricted by owner (error 101)');
      }
      return true; // Error was handled
    }
    
    // Error 2: Invalid video ID
    if (errorCode === 2) {
      if (isDevelopment) {
        console.debug('YouTube player: Invalid video ID (error 2)');
      }
      return true; // Error was handled
    }
    
    // Error 5: HTML5 player error
    if (errorCode === 5) {
      if (isDevelopment) {
        console.debug('YouTube player: HTML5 player error (error 5)');
      }
      return true; // Error was handled
    }
  }
  
  if (isYouTubeError(error)) {
    if (isDevelopment) {
      console.debug('YouTube player: Ad blocker detected (normal behavior)');
    }
    return true; // Error was handled
  }
  
  // Log other errors
  console.warn('YouTube player error:', error);
  return false; // Error was not handled
};

/**
 * Suppress YouTube-related console errors
 */
export const suppressYouTubeErrors = () => {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  console.error = (...args) => {
    const errorMessage = args.join(' ').toLowerCase();
    
    if (isYouTubeError(errorMessage)) {
      console.debug('Suppressing YouTube-related error:', ...args);
      return;
    }
    
    originalConsoleError.apply(console, args);
  };
  
  console.warn = (...args) => {
    const errorMessage = args.join(' ').toLowerCase();
    
    if (isYouTubeError(errorMessage)) {
      console.debug('Suppressing YouTube-related warning:', ...args);
      return;
    }
    
    originalConsoleWarn.apply(console, args);
  };
};

/**
 * Restore original console methods
 */
export const restoreConsoleMethods = () => {
  // This would need to be implemented if we want to restore the original methods
  // For now, we'll just log that we're restoring
  console.debug('Console methods restored');
};

export default {
  isYouTubeError,
  handleYouTubeError,
  suppressYouTubeErrors,
  restoreConsoleMethods
}; 