/**
 * API Configuration and Helper Utilities
 * Centralizes configuration for API endpoints and environment variables.
 */

/**
 * Helper to get the correct base URL.
 * Prevents issues where VITE_API_URL might be missing or relative in production.
 * 
 * @returns {string} The base URL for API requests
 */
export const getBaseUrl = () => {
    const url = import.meta.env.VITE_API_URL;
    // If url is missing, empty, or just a slash, fallback to hardcoded production URL
    if (!url || url === '/' || url.startsWith('/')) {
        return import.meta.env.PROD
            ? 'https://streamrbackend.vercel.app/api'
            : 'http://localhost:3000/api';
    }
    return url;
};
