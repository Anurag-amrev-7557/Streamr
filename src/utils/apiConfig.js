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
    // In development mode, always use localhost to ensure proper cookie handling
    if (!import.meta.env.PROD) {
        return 'http://localhost:3000/api';
    }

    const url = import.meta.env.VITE_API_URL;
    // If url is missing, empty, or just a slash, fallback to hardcoded production URL
    if (!url || url === '/' || url.startsWith('/')) {
        return 'https://streamrbackend.vercel.app/api';
    }
    return url;
};
