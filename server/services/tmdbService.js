import tmdbClient from '../utils/tmdbClient.js';
import smartCache from '../utils/smartCache.js';
import User from '../models/User.js';
import {
    generateSearchCacheKey,
    normalizeSearchQuery,
    paginateResults
} from '../utils/searchHelpers.js';
import { trackSearchQuery } from '../utils/searchAnalytics.js';
import {
    scoreAndRankItems,
    scoreAndRankItemRecommendations,
    processSearchResults,
    extractPreferences,
    calculateUserTopGenres
} from '../utils/rankingEngine.js';

// --- Configuration & Constants ---
const CONFIG = {
    CACHE_TTL: {
        TRENDING: 86400, // 24 hours
        SEARCH: 900,     // 15 minutes
        DETAILS: 43200,  // 12 hours
        SUGGESTIONS: 3600 // 1 hour
    }
};

class TmdbService {
    async getRecommendations(user) {
        const userId = user ? user.id : null;
        const cacheKey = userId ? `rec_home_v4_${userId}` : 'rec_home_v4_guest';

        return smartCache.get(cacheKey, async () => {
            const apiKey = process.env.TMDB_API_KEY;

            if (!user) {
                const trending = await this.fetchTMDB('/trending/all/week', { api_key: apiKey });
                return { results: trending };
            }

            const watchHistory = user.watchHistory || [];
            const myList = user.myList || [];

            if (watchHistory.length === 0 && myList.length === 0) {
                const trending = await this.fetchTMDB('/trending/all/week', { api_key: apiKey });
                return { results: trending };
            }

            const recommendations = await this.generatePersonalizedRecommendations(watchHistory, myList, apiKey);
            return { results: recommendations };
        }, CONFIG.CACHE_TTL.TRENDING);
    }

    async getItemRecommendations(type, id, user) {
        const userId = user ? user.id : null;
        const cacheKey = userId ? `rec_item_${type}_${id}_${userId}` : `rec_item_${type}_${id}_guest`;

        return smartCache.get(cacheKey, async () => {
            const apiKey = process.env.TMDB_API_KEY;
            let userTopGenres = [];
            let userMyListIds = [];

            if (user) {
                const watchHistory = user.watchHistory || [];
                userTopGenres = calculateUserTopGenres(watchHistory);
                userMyListIds = (user.myList || []).map(item => item.id);
            }

            const recommendations = await this.generateItemRecommendations(type, id, apiKey, userTopGenres, userMyListIds);
            return { results: recommendations };
        }, CONFIG.CACHE_TTL.DETAILS);
    }

    async getModalData(type, id) {
        const cacheKey = `modal_data_${type}_${id}`;

        return smartCache.get(cacheKey, async () => {
            const apiKey = process.env.TMDB_API_KEY;
            // Append critical resources to the main details request
            // We get details, credits, images, videos, content ratings (for PG age), and release dates (for certifying age)
            const appendToResponse = 'credits,images,videos,content_ratings,release_dates,external_ids';

            try {
                const response = await tmdbClient.get(`/${type}/${id}`, {
                    api_key: apiKey,
                    append_to_response: appendToResponse + ',similar,recommendations',
                    include_image_language: 'en,null' // Prioritize English images, fallback to no language
                });

                const data = response.data;

                // transform data if needed, but returning it raw is fine as we can destructure on client
                // We add a 'success' flag just in case
                return {
                    ...data,
                    // Helper to make frontend easier if needed, but frontend can just access properties
                };
            } catch (error) {
                console.error(`Error fetching modal data for ${type}/${id}:`, error.message);
                throw error;
            }
        }, CONFIG.CACHE_TTL.DETAILS);
    }

    async multiSearch(params) {
        const {
            query,
            mediaType = 'all',
            yearStart,
            yearEnd,
            minRating,
            genres,
            page = 1,
            limit = 20,
            sortBy = 'relevance'
        } = params;

        if (!query || !query.trim()) {
            return this.getEmptySearchResult(limit);
        }

        const trimmedQuery = query.trim();
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 20;

        const filters = {
            mediaType: mediaType !== 'all' ? mediaType : null,
            yearStart: yearStart ? parseInt(yearStart) : null,
            yearEnd: yearEnd ? parseInt(yearEnd) : null,
            minRating: minRating ? parseFloat(minRating) : null,
            genres: genres ? genres.split(',').map(g => g.trim()) : []
        };

        const cacheKey = generateSearchCacheKey(trimmedQuery, filters, pageNum);

        return smartCache.get(cacheKey, async () => {
            const apiKey = process.env.TMDB_API_KEY;
            if (!apiKey) throw new Error('TMDB API Key missing');

            const startTime = Date.now();
            const results = await this.fetchSearchResults(trimmedQuery, apiKey, limitNum);

            let filteredResults = processSearchResults(results, filters, trimmedQuery, sortBy);
            const paginatedData = paginateResults(filteredResults, pageNum, limitNum);

            // Cleanup internal scores
            paginatedData.results = paginatedData.results.map(({ _relevanceScore: _, ...item }) => item);

            const responseTime = Date.now() - startTime;
            trackSearchQuery(trimmedQuery, paginatedData.results.length, responseTime);

            return {
                ...paginatedData,
                query: trimmedQuery,
                filters,
                sortBy,
                responseTime
            };
        }, CONFIG.CACHE_TTL.SEARCH);
    }

    getEmptySearchResult(limit) {
        return {
            results: [],
            pagination: {
                page: 1,
                limit: parseInt(limit),
                total: 0,
                totalPages: 0,
                hasMore: false
            }
        };
    }

    async getSearchSuggestions(query) {
        if (!query || !query.trim()) return [];

        const trimmedQuery = query.trim();
        const cacheKey = `search_suggestions_${normalizeSearchQuery(trimmedQuery)}`;

        return smartCache.get(cacheKey, async () => {
            const apiKey = process.env.TMDB_API_KEY;
            try {
                const response = await tmdbClient.get('/search/multi', {
                    api_key: apiKey,
                    query: trimmedQuery,
                    language: 'en-US',
                    page: 1
                });

                const results = response.data.results || [];
                return results
                    .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
                    .slice(0, 10)
                    .map(item => ({
                        id: item.id,
                        title: item.title || item.name,
                        media_type: item.media_type,
                        year: (item.release_date || item.first_air_date || '').substring(0, 4),
                        poster_path: item.poster_path
                    }));
            } catch (error) {
                console.error('Search Suggestions Error:', error.message);
                return [];
            }
        }, CONFIG.CACHE_TTL.SUGGESTIONS).then(res => res.data); // smartCache returns {data, fromCache}, we just want data here
    }

    // --- Helper Methods ---

    async fetchTMDB(endpoint, params = {}) {
        try {
            const response = await tmdbClient.get(endpoint, params);
            return response.data.results || [];
        } catch (error) {
            console.error(`TMDB Fetch Error (${endpoint}):`, error.message);
            return [];
        }
    }

    async fetchDetails(type, id, apiKey) {
        try {
            const response = await tmdbClient.get(`/${type}/${id}`, {
                api_key: apiKey,
                append_to_response: 'credits,keywords'
            });
            return response.data;
        } catch {
            return null;
        }
    }

    async generatePersonalizedRecommendations(watchHistory, myList, apiKey) {
        const topGenres = calculateUserTopGenres(watchHistory);

        // 1. Analyze Recent Watch History (Weighted)
        // Take top 3 recent items to avoid "tunnel vision" on just the very last watched item
        const recentItems = watchHistory.slice(0, 3);

        // 2. Analyze My List (High Intent)
        // Take most recently added items to My List
        const recentMyList = myList.slice(0, 3);

        const analyzedDetailsPromises = [
            ...recentItems.map(item => {
                if (!item.id) return null;
                const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
                return this.fetchDetails(type, item.id, apiKey);
            }),
            ...recentMyList.map(item => {
                if (!item.id) return null;
                const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
                return this.fetchDetails(type, item.id, apiKey);
            })
        ];

        const analyzedDetailsRaw = await Promise.all(analyzedDetailsPromises);
        const validDetails = analyzedDetailsRaw.filter(d => d !== null);

        const { topPeople, topLanguage, topEra } = extractPreferences(validDetails);

        const promises = [];

        // --- Source A: Watch History Context (Recent) ---
        recentItems.forEach((item, index) => {
            const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
            // Recent 0 gets "Recommendations" (TMDB's logic)
            // Recent 1, 2 get "Similar" (Content equality)
            const endpoint = index === 0 ? 'recommendations' : 'similar';

            promises.push(this.fetchTMDB(`/${type}/${item.id}/${endpoint}`, { api_key: apiKey })
                .then(res => ({ source: `history_recent_${index}`, items: res })));
        });

        // --- Source B: My List Intent ---
        recentMyList.forEach((item, index) => {
            const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
            promises.push(this.fetchTMDB(`/${type}/${item.id}/recommendations`, { api_key: apiKey })
                .then(res => ({ source: `mylist_intent_${index}`, items: res })));
        });

        // --- Source C: Genre Mastery (Popularity + Quality) ---
        if (topGenres[0]) {
            promises.push(this.fetchTMDB('/discover/movie', {
                api_key: apiKey,
                with_genres: topGenres[0],
                sort_by: 'popularity.desc',
                'vote_count.gte': 200
            }).then(res => ({ source: 'genre_hero_pop', items: res })));
        }

        const qualityGenre = topGenres[1] || topGenres[0];
        if (qualityGenre) {
            promises.push(this.fetchTMDB('/discover/movie', {
                api_key: apiKey,
                with_genres: qualityGenre,
                sort_by: 'vote_average.desc',
                'vote_count.gte': 500,
                'primary_release_date.gte': '2010-01-01' // Modern classics
            }).then(res => ({ source: 'genre_hero_quality', items: res })));
        }

        // --- Source D: Discovery / Diversity (Cross-pollination) ---
        // If they love Genre A, recommend highly rated items from OTHER genres that are popular
        // We simulate this by excluding their top genres
        // (Note: TMDB doesn't easily support "exclude genre" AND "sort by pop" efficiently in all cases, 
        // effectively utilize 'without_genres')
        if (topGenres.length > 0) {
            const excludeGenres = topGenres.slice(0, 2).join(',');
            promises.push(this.fetchTMDB('/discover/movie', {
                api_key: apiKey,
                without_genres: excludeGenres,
                sort_by: 'popularity.desc',
                'vote_count.gte': 1000,
                page: 1
            }).then(res => ({ source: 'discovery_new_horizons', items: res })));
        }

        // --- Source E: Deep Cuts (Valid for deeper library exploration) ---
        // Find movies from their top era/genre that are NOT the most popular, but high rated
        if (topEra && topGenres[0]) {
            const startDev = `${topEra}-01-01`;
            const endDev = `${topEra + 9}-12-31`;
            promises.push(this.fetchTMDB('/discover/movie', {
                api_key: apiKey,
                with_genres: topGenres[0],
                'primary_release_date.gte': startDev,
                'primary_release_date.lte': endDev,
                sort_by: 'vote_average.desc',
                'vote_count.gte': 100,
                'vote_count.lte': 5000 // Not the super-blockbusters
            }).then(res => ({ source: 'deep_cuts', items: res })));
        }

        // Source F: People & Language (Preserve specific tastes)
        // Only if strongly detected (e.g. they watched 2+ movies by same director)
        if (topPeople.length > 0) {
            promises.push(this.fetchTMDB('/discover/movie', {
                api_key: apiKey,
                with_people: topPeople.slice(0, 1).join(','),
                sort_by: 'popularity.desc'
            }).then(res => ({ source: 'director_aficionado', items: res })));
        }

        if (topLanguage && topLanguage !== 'en') {
            promises.push(this.fetchTMDB('/discover/movie', {
                api_key: apiKey,
                with_original_language: topLanguage,
                sort_by: 'popularity.desc'
            }).then(res => ({ source: 'intl_fan', items: res })));
        }

        // Source G: Franchise (Strongest signal)
        // Check ONLY most recent item for franchise
        if (validDetails[0] && validDetails[0].belongs_to_collection) {
            promises.push(
                tmdbClient.get(`/collection/${validDetails[0].belongs_to_collection.id}`, {
                    api_key: apiKey
                })
                    .then(res => ({ source: 'franchise_match', items: res.data.parts || [] }))
                    .catch(() => ({ source: 'franchise_match', items: [] }))
            );
        }

        const resultsSettled = await Promise.allSettled(promises);
        const results = resultsSettled
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);

        // Pass full context for re-ranking
        return scoreAndRankItems(results, watchHistory, myList, topGenres, topLanguage, topEra);
    }

    async generateItemRecommendations(type, id, apiKey, userTopGenres, userMyListIds = []) {
        // --- Smart Parallel Fetch Strategy ---
        // Goal: Get results FAST while still being "smart".
        // Instead of waiting for details -> then secondary -> then merge, we fire Primary IMMEDIATELY.

        // 1. Fire Primary Sources parallel to Details
        const primarySourcesPromise = (async () => {
            const promises = [
                this.fetchTMDB(`/${type}/${id}/similar`, { api_key: apiKey })
                    .then(res => ({ source: 'similar', items: res }))
                    .catch(() => ({ source: 'similar', items: [] })),
                this.fetchTMDB(`/${type}/${id}/recommendations`, { api_key: apiKey })
                    .then(res => ({ source: 'recommendations', items: res }))
                    .catch(() => ({ source: 'recommendations', items: [] }))
            ];

            // We'll wait for these separately later
            return Promise.all(promises);
        })();

        // 2. Fetch Details (needed for Secondary sources like Director/Keywords)
        // We set a timeout on details too, so if TMDB is slow on details, we just show Primary results.
        const detailsPromise = new Promise((resolve) => {
            tmdbClient.get(`/${type}/${id}`, {
                api_key: apiKey,
                append_to_response: 'credits,keywords',
                timeout: 2000 // 2s timeout for details
            })
                .then(response => resolve(response.data))
                .catch(() => {
                    console.warn(`Details fetch failed/timedout for ${type}/${id}`);
                    resolve(null);
                });
        });

        // 3. Wait for Details (or timeout)
        let itemDetails = null;
        try {
            itemDetails = await detailsPromise;
        } catch { /* ignore */ }

        // 4. Fire Secondary Sources (only if we got details)
        const secondaryPromises = [];
        if (itemDetails) {
            const keywords = itemDetails.keywords?.keywords || itemDetails.keywords?.results || [];
            const keywordIds = keywords.map(k => k.id).slice(0, 3);
            const director = itemDetails.credits?.crew?.find(c => c.job === 'Director');
            const topCast = itemDetails.credits?.cast?.slice(0, 2) || [];
            const studio = itemDetails.production_companies?.[0];

            const date = itemDetails.release_date || itemDetails.first_air_date;
            let eraStart, eraEnd;
            if (date) {
                const year = parseInt(date.substring(0, 4));
                const decade = Math.floor(year / 10) * 10;
                eraStart = `${decade}-01-01`;
                eraEnd = `${decade + 9}-12-31`;
            }

            const SECONDARY_TIMEOUT = 1000; // Reduced to 1000ms
            const withTimeout = (promise, fallbackValue) => {
                return Promise.race([
                    promise,
                    new Promise(resolve => setTimeout(() => resolve(fallbackValue), SECONDARY_TIMEOUT))
                ]);
            };

            // Franchise Match (Often high quality)
            if (type === 'movie' && itemDetails.belongs_to_collection) {
                secondaryPromises.push(
                    tmdbClient.get(`/collection/${itemDetails.belongs_to_collection.id}`, {
                        api_key: apiKey
                    })
                        .then(res => ({ source: 'franchise_match', items: res.data.parts || [] }))
                        .catch(() => ({ source: 'franchise_match', items: [] }))
                );
            }

            if (director && type === 'movie') {
                secondaryPromises.push(withTimeout(
                    this.fetchTMDB('/discover/movie', {
                        api_key: apiKey,
                        with_people: director.id,
                        sort_by: 'popularity.desc'
                    }).then(res => ({ source: 'director_match', items: res })),
                    { source: 'director_match', items: [] }
                ));
            }

            if (keywordIds.length > 0) {
                secondaryPromises.push(withTimeout(
                    this.fetchTMDB(`/discover/${type}`, {
                        api_key: apiKey,
                        with_keywords: keywordIds.join('|'),
                        sort_by: 'popularity.desc'
                    }).then(res => ({ source: 'keyword_match', items: res })),
                    { source: 'keyword_match', items: [] }
                ));
            }

            if (eraStart && itemDetails.genres?.length > 0) {
                const genreIds = itemDetails.genres.map(g => g.id).slice(0, 2).join(',');
                const dateParam = type === 'movie' ? 'primary_release_date' : 'first_air_date';
                secondaryPromises.push(withTimeout(
                    this.fetchTMDB(`/discover/${type}`, {
                        api_key: apiKey,
                        with_genres: genreIds,
                        [`${dateParam}.gte`]: eraStart,
                        [`${dateParam}.lte`]: eraEnd,
                        sort_by: 'vote_average.desc',
                        'vote_count.gte': 100
                    }).then(res => ({ source: 'era_match', items: res })),
                    { source: 'era_match', items: [] }
                ));
            }

            if (topCast.length > 0) {
                const castIds = topCast.map(c => c.id).join(',');
                secondaryPromises.push(withTimeout(
                    this.fetchTMDB(`/discover/${type}`, {
                        api_key: apiKey,
                        with_people: castIds,
                        sort_by: 'popularity.desc'
                    }).then(res => ({ source: 'cast_match', items: res })),
                    { source: 'cast_match', items: [] }
                ));
            }

            if (studio) {
                secondaryPromises.push(withTimeout(
                    this.fetchTMDB(`/discover/${type}`, {
                        api_key: apiKey,
                        with_companies: studio.id,
                        sort_by: 'popularity.desc'
                    }).then(res => ({ source: 'studio_match', items: res })),
                    { source: 'studio_match', items: [] }
                ));
            }
        }

        // 5. Final await: Wait for Primary to finish (must be done) AND Secondary to finish (or timeout)
        // Note: primarySourcesPromise started WAY back at step 1.
        const [primaryResults, secondaryResults] = await Promise.all([
            primarySourcesPromise,
            Promise.allSettled(secondaryPromises).then(results =>
                results.filter(r => r.status === 'fulfilled').map(r => r.value)
            )
        ]);

        const allResults = [...primaryResults, ...secondaryResults].filter(r => r && r.items && r.items.length > 0);

        return scoreAndRankItemRecommendations(allResults, id, userTopGenres, userMyListIds);
    }

    async fetchSearchResults(query, apiKey, limit) {
        const pagesToFetch = Math.min(3, Math.ceil(limit / 10));
        const fetchPromises = [];

        for (let i = 1; i <= pagesToFetch; i++) {
            fetchPromises.push(
                tmdbClient.get('/search/multi', {
                    api_key: apiKey,
                    query: query,
                    language: 'en-US',
                    page: i
                }).catch(err => {
                    console.error(`Error fetching page ${i}:`, err.message);
                    return { data: { results: [] } };
                })
            );
        }

        const responses = await Promise.all(fetchPromises);
        let allResults = [];
        responses.forEach(response => {
            if (response.data && response.data.results) {
                allResults = allResults.concat(response.data.results);
            }
        });
        return allResults;
    }

    async proxyRequest(endpoint, params) {
        const apiKey = process.env.TMDB_API_KEY;
        const cacheKey = `tmdb_proxy_${endpoint}_${JSON.stringify(params)}`;

        return smartCache.get(cacheKey, async () => {
            const response = await tmdbClient.get(endpoint, {
                ...params,
                api_key: apiKey
            });
            return response.data;
        }, 300);
    }
}

export default new TmdbService();
