/**
 * Search Analytics Utilities
 * Track search queries, clicks, and generate trending searches
 */

// In-memory store for trending searches (could be Redis in production)
const trendingSearchesCache = {
    data: [],
    lastUpdated: null,
    queries: new Map() // query -> count
};

/**
 * Track a search query
 */
export const trackSearchQuery = (query, resultsCount = 0, responseTime = 0) => {
    if (!query || !query.trim()) return;

    const normalizedQuery = query.trim().toLowerCase();

    // Update trending counter
    const currentCount = trendingSearchesCache.queries.get(normalizedQuery) || 0;
    trendingSearchesCache.queries.set(normalizedQuery, currentCount + 1);

    // Return analytics data for database storage
    return {
        query: normalizedQuery,
        originalQuery: query.trim(),
        timestamp: new Date(),
        resultsCount,
        responseTime
    };
};

/**
 * Track search result click (CTR tracking)
 */
export const trackSearchClick = (query, clickedResult) => {
    if (!query || !clickedResult) return null;

    return {
        query: query.trim().toLowerCase(),
        clickedResultId: clickedResult.id,
        clickedResultType: clickedResult.media_type,
        clickedResultTitle: clickedResult.title || clickedResult.name,
        timestamp: new Date()
    };
};

/**
 * Generate trending searches
 * Returns top N most searched queries
 */
export const getTrendingSearches = (limit = 10) => {
    // Sort by count descending
    const sorted = Array.from(trendingSearchesCache.queries.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([query, count]) => ({
            query,
            count,
            trending: true
        }));

    trendingSearchesCache.data = sorted;
    trendingSearchesCache.lastUpdated = new Date();

    return sorted;
};

/**
 * Get cached trending searches
 * Returns cached data if fresh (< 1 hour old)
 */
export const getCachedTrendingSearches = () => {
    const ONE_HOUR = 60 * 60 * 1000;
    const now = Date.now();

    if (trendingSearchesCache.lastUpdated &&
        (now - trendingSearchesCache.lastUpdated.getTime()) < ONE_HOUR &&
        trendingSearchesCache.data.length > 0
    ) {
        return trendingSearchesCache.data;
    }

    // Generate fresh trending searches
    return getTrendingSearches();
};

/**
 * Calculate search metrics for analytics
 */
export const calculateSearchMetrics = (searchHistory) => {
    if (!searchHistory || searchHistory.length === 0) {
        return {
            totalSearches: 0,
            avgResponseTime: 0,
            avgResultsCount: 0,
            topQueries: [],
            searchTrend: []
        };
    }

    const totalSearches = searchHistory.length;

    // Calculate averages
    const totalResponseTime = searchHistory.reduce((sum, s) => sum + (s.responseTime || 0), 0);
    const totalResults = searchHistory.reduce((sum, s) => sum + (s.resultsCount || 0), 0);

    const avgResponseTime = totalResponseTime / totalSearches;
    const avgResultsCount = totalResults / totalSearches;

    // Top queries
    const queryCount = {};
    searchHistory.forEach(s => {
        if (s.query) {
            queryCount[s.query] = (queryCount[s.query] || 0) + 1;
        }
    });

    const topQueries = Object.entries(queryCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([query, count]) => ({ query, count }));

    // Search trend (by day)
    const searchTrend = {};
    searchHistory.forEach(s => {
        if (s.timestamp) {
            const date = new Date(s.timestamp).toISOString().split('T')[0];
            searchTrend[date] = (searchTrend[date] || 0) + 1;
        }
    });

    return {
        totalSearches,
        avgResponseTime: Math.round(avgResponseTime),
        avgResultsCount: Math.round(avgResultsCount * 10) / 10,
        topQueries,
        searchTrend: Object.entries(searchTrend).map(([date, count]) => ({ date, count }))
    };
};

/**
 * Reset trending searches (useful for testing)
 */
export const resetTrendingSearches = () => {
    trendingSearchesCache.queries.clear();
    trendingSearchesCache.data = [];
    trendingSearchesCache.lastUpdated = null;
};

export default {
    trackSearchQuery,
    trackSearchClick,
    getTrendingSearches,
    getCachedTrendingSearches,
    calculateSearchMetrics,
    resetTrendingSearches
};
