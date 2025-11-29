import levenshtein from 'fast-levenshtein';

/**
 * Calculate string similarity score (0-1, higher is better)
 * Uses Levenshtein distance algorithm
 */
export const calculateSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;

    const maxLength = Math.max(s1.length, s2.length);
    const distance = levenshtein.get(s1, s2);

    // Convert distance to similarity score (0-1)
    return 1 - (distance / maxLength);
};

/**
 * Normalize search query
 * - Trim whitespace
 * - Convert to lowercase
 * - Remove special characters (optional)
 */
export const normalizeSearchQuery = (query) => {
    if (!query) return '';
    return query.trim().toLowerCase();
};

/**
 * Tokenize query into words for better matching
 */
export const tokenizeQuery = (query) => {
    if (!query) return [];
    return normalizeSearchQuery(query)
        .split(/\s+/)
        .filter(token => token.length > 0);
};

/**
 * Calculate relevance score for a search result
 * Combines multiple signals:
 * - Title match quality (exact, starts with, contains, fuzzy)
 * - Popularity
 * - Vote average
 * - Recency
 */
export const scoreSearchResult = (item, query) => {
    let score = 0;
    const normalizedQuery = normalizeSearchQuery(query);
    const tokens = tokenizeQuery(query);

    const title = (item.title || item.name || '').toLowerCase().trim();
    const originalTitle = (item.original_title || item.original_name || '').toLowerCase().trim();

    // 1. Title Match Quality (Most Important) - Max 100 points
    if (title === normalizedQuery || originalTitle === normalizedQuery) {
        score += 100; // Exact match
    } else if (title.startsWith(normalizedQuery) || originalTitle.startsWith(normalizedQuery)) {
        score += 80; // Starts with query
    } else if (title.includes(normalizedQuery) || originalTitle.includes(normalizedQuery)) {
        score += 60; // Contains query
    } else {
        // Fuzzy match for typo tolerance
        const titleSimilarity = calculateSimilarity(title, normalizedQuery);
        const originalTitleSimilarity = calculateSimilarity(originalTitle, normalizedQuery);
        const bestSimilarity = Math.max(titleSimilarity, originalTitleSimilarity);

        if (bestSimilarity > 0.7) {
            score += bestSimilarity * 50; // Fuzzy match (max 50 points)
        }

        // Token matching (for multi-word queries)
        const tokenMatches = tokens.filter(token =>
            title.includes(token) || originalTitle.includes(token)
        ).length;
        score += (tokenMatches / Math.max(tokens.length, 1)) * 30;
    }

    // 2. Popularity Score (0-20 points)
    // Normalize popularity to 0-20 range (typical popularity: 0-500)
    if (item.popularity) {
        score += Math.min((item.popularity / 500) * 20, 20);
    }

    // 3. Vote Average (0-15 points)
    // Normalize vote average to 0-15 range (vote_average: 0-10)
    if (item.vote_average) {
        score += (item.vote_average / 10) * 15;
    }

    // 4. Vote Count Weight (0-10 points)
    // More votes = more reliable
    if (item.vote_count) {
        score += Math.min((item.vote_count / 1000) * 10, 10);
    }

    // 5. Recency Bonus (0-10 points)
    // Slight boost for newer content
    const releaseDate = item.release_date || item.first_air_date;
    if (releaseDate) {
        const year = parseInt(releaseDate.substring(0, 4));
        const currentYear = new Date().getFullYear();
        const age = currentYear - year;

        if (age <= 1) {
            score += 10; // Very recent
        } else if (age <= 3) {
            score += 7; // Recent
        } else if (age <= 5) {
            score += 4; // Moderately recent
        }
    }

    // 6. Media Type Preference (slight boost for movies in multi-search)
    // Movies tend to be more popular in search
    if (item.media_type === 'movie') {
        score += 2;
    }

    return Math.round(score * 100) / 100; // Round to 2 decimal places
};

/**
 * Build filter predicates for search results
 */
export const buildSearchFilters = (filters) => {
    const predicates = [];

    // Media Type Filter
    if (filters.mediaType && filters.mediaType !== 'all') {
        predicates.push(item => item.media_type === filters.mediaType);
    }

    // Year Range Filter
    if (filters.yearStart || filters.yearEnd) {
        predicates.push(item => {
            const releaseDate = item.release_date || item.first_air_date;
            if (!releaseDate) return false;

            const year = parseInt(releaseDate.substring(0, 4));
            const yearStart = filters.yearStart || 1900;
            const yearEnd = filters.yearEnd || new Date().getFullYear();

            return year >= yearStart && year <= yearEnd;
        });
    }

    // Rating Filter
    if (filters.minRating) {
        predicates.push(item => {
            return item.vote_average >= filters.minRating;
        });
    }

    // Genre Filter
    if (filters.genres && filters.genres.length > 0) {
        predicates.push(item => {
            if (!item.genre_ids || item.genre_ids.length === 0) return false;
            // Check if item has any of the selected genres
            return filters.genres.some(genreId =>
                item.genre_ids.includes(parseInt(genreId))
            );
        });
    }

    return predicates;
};

/**
 * Apply filters to search results
 */
export const applyFilters = (results, filters) => {
    const predicates = buildSearchFilters(filters);

    return results.filter(item => {
        return predicates.every(predicate => predicate(item));
    });
};

/**
 * Paginate results
 */
export const paginateResults = (results, page = 1, limit = 10) => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedResults = results.slice(startIndex, endIndex);
    const total = results.length;
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return {
        results: paginatedResults,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasMore
        }
    };
};

/**
 * Generate cache key for search with filters
 */
export const generateSearchCacheKey = (query, filters = {}, page = 1) => {
    const parts = ['search_multi', normalizeSearchQuery(query)];

    if (filters.mediaType && filters.mediaType !== 'all') {
        parts.push(`mt:${filters.mediaType}`);
    }
    if (filters.yearStart) {
        parts.push(`ys:${filters.yearStart}`);
    }
    if (filters.yearEnd) {
        parts.push(`ye:${filters.yearEnd}`);
    }
    if (filters.minRating) {
        parts.push(`mr:${filters.minRating}`);
    }
    if (filters.genres && filters.genres.length > 0) {
        parts.push(`g:${filters.genres.sort().join(',')}`);
    }
    parts.push(`p:${page}`);

    return parts.join('_');
};
