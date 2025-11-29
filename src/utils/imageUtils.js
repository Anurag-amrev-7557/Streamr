/**
 * Optimizes the user avatar URL by using a smaller version if it matches the default Pixabay image.
 * @param {string} url - The avatar URL.
 * @returns {string} - The optimized avatar URL.
 */
import defaultAvatar from '../assets/default-avatar.png';

export const getOptimizedAvatarUrl = (url) => {
    if (!url) return defaultAvatar;

    // Check if it's the specific Pixabay image (original or already optimized)
    if (url.includes('blank-profile-picture-973460') && url.includes('pixabay.com')) {
        return defaultAvatar;
    }

    return url;
};
