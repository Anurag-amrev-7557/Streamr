/**
 * Optimizes the user avatar URL by using a smaller version if it matches the default Pixabay image.
 * @param {string} url - The avatar URL.
 * @returns {string} - The optimized avatar URL.
 */
import defaultAvatar from '../assets/default-avatar.png';

/**
 * Optimizes the user avatar URL by using a smaller version if it matches the default Pixabay image.
 * @param {string} url - The avatar URL.
 * @returns {string} - The optimized avatar URL.
 */
export const getOptimizedAvatarUrl = (url) => {
    if (!url) return defaultAvatar;

    // Check if it's the specific Pixabay image (original or already optimized)
    if (url.includes('blank-profile-picture-973460') && url.includes('pixabay.com')) {
        return defaultAvatar;
    }

    return url;
};

// Check for WebP support
const supportsWebP = (() => {
    const elem = document.createElement('canvas');
    if (!!(elem.getContext && elem.getContext('2d'))) {
        return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    return false;
})();

/**
 * Get optimized TMDB image URL
 * @param {string} path - Image path from TMDB API
 * @param {string} size - Desired size (e.g., 'w500', 'original')
 * @returns {string} Full image URL
 */
export const getTMDBImage = (path, size = 'w500') => {
    if (!path) return '';
    const baseUrl = 'https://image.tmdb.org/t/p/';
    return `${baseUrl}${size}${path}`;
};

/**
 * Get optimized TMDB backdrop URL
 * @param {string} path - Image path
 * @param {boolean} highQuality - Whether to use original quality
 * @returns {string} Full image URL
 */
export const getTMDBBackdrop = (path, highQuality = false) => {
    return getTMDBImage(path, highQuality ? 'original' : 'w1280');
};

/**
 * Get optimized TMDB poster URL
 * @param {string} path - Image path
 * @param {boolean} small - Whether to use small size (for lists)
 * @returns {string} Full image URL
 */
export const getTMDBPoster = (path, small = false) => {
    return getTMDBImage(path, small ? 'w342' : 'w500');
};
