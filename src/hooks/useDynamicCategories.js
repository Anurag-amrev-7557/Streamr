import { useMemo } from 'react';
import { CATEGORIES } from '../lib/categories';

/**
 * Hook to get a random subset of categories.
 * @param {string} type - 'movie', 'tv', or 'all'
 * @param {number} count - Number of categories to return
 * @returns {Array} - Array of category objects with { title, fetchUrl }
 */
export const useDynamicCategories = (type = 'all', count = 20) => {
    const categories = useMemo(() => {
        // Filter categories by type
        let filtered = CATEGORIES;
        if (type !== 'all') {
            filtered = CATEGORIES.filter(cat => cat.type === type);
        }

        // Shuffle the array (Fisher-Yates shuffle)
        const shuffled = [...filtered];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Select the top 'count' items
        const selected = shuffled.slice(0, count);

        // Map to the format expected by Row component
        return selected.map(cat => {
            const params = new URLSearchParams(cat.params);
            // Ensure api_key is not included here as it's handled by the axios instance
            // But we need to make sure the endpoint is correct

            // Construct the full URL with params
            // Note: The axios instance in tmdb.js handles the base URL and API key.
            // We just need to pass the endpoint + query params string.
            const queryString = params.toString();
            const fetchUrl = queryString ? `${cat.endpoint}?${queryString}` : cat.endpoint;

            return {
                id: cat.id,
                title: cat.title,
                fetchUrl: fetchUrl,
                isLargeRow: false // Default to standard row size
            };
        });
    }, [type, count]);

    return categories;
};

export default useDynamicCategories;
