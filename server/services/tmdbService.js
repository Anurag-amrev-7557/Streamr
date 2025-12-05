import axios from 'axios';
import https from 'https';
import cache from '../utils/cache.js';
import User from '../models/User.js';
import {
    scoreSearchResult,
    applyFilters,
    paginateResults,
    generateSearchCacheKey,
    normalizeSearchQuery
} from '../utils/searchHelpers.js';
import { trackSearchQuery } from '../utils/searchAnalytics.js';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// --- Configuration & Constants ---
const CONFIG = {
    TIMEOUT: 10000,
    CIRCUIT_BREAKER: {
        FAILURE_THRESHOLD: 5,
        RESET_TIMEOUT: 30000, // 30 seconds
    },
    RETRY: {
        MAX_RETRIES: 3,
        INITIAL_DELAY: 1000,
    },
    CACHE_TTL: {
        TRENDING: 86400, // 24 hours
        SEARCH: 900,     // 15 minutes
        DETAILS: 43200,  // 12 hours
        SUGGESTIONS: 3600 // 1 hour
    },
    SCORING: {
        FRANCHISE: 20,
        SIMILAR: 10,
        DIRECTOR: 8,
        CAST: 6,
        KEYWORD: 6,
        LANGUAGE: 5,
        STUDIO: 5,
        ERA: 4,
        GENRE: 3,
        BASE: 2
    }
};

// --- Advanced Networking Client ---
class TMDBClient {
    constructor() {
        this.client = axios.create({
            baseURL: TMDB_BASE_URL,
            timeout: CONFIG.TIMEOUT,
            httpsAgent: new https.Agent({ keepAlive: true })
        });

        this.pendingRequests = new Map();

        // Circuit Breaker State
        this.failures = 0;
        this.lastFailureTime = 0;
        this.circuitOpen = false;

        // Setup Interceptors
        this.setupInterceptors();
    }

    setupInterceptors() {
        this.client.interceptors.response.use(
            response => {
                this.recordSuccess();
                return response;
            },
            async error => {
                this.recordFailure();

                const config = error.config;

                // Handle Rate Limiting (429), Server Errors (5xx), and Network Errors
                const shouldRetry =
                    config &&
                    !config._retry &&
                    (
                        (error.response?.status === 429 || error.response?.status >= 500) ||
                        (error.code === 'ECONNABORTED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT')
                    );

                if (shouldRetry) {
                    config._retry = true;
                    config.retryCount = config.retryCount || 0;

                    if (config.retryCount < CONFIG.RETRY.MAX_RETRIES) {
                        config.retryCount++;
                        const delay = CONFIG.RETRY.INITIAL_DELAY * Math.pow(2, config.retryCount - 1);

                        console.warn(`TMDB Retry ${config.retryCount}/${CONFIG.RETRY.MAX_RETRIES} for ${config.url} due to ${error.code || error.response?.status}`);

                        // Wait for delay
                        await new Promise(resolve => setTimeout(resolve, delay));

                        return this.client(config);
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    recordSuccess() {
        if (this.circuitOpen) {
            this.circuitOpen = false;
            this.failures = 0;
            console.log('TMDB Circuit Breaker: CLOSED (Recovered)');
        }
    }

    recordFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= CONFIG.CIRCUIT_BREAKER.FAILURE_THRESHOLD) {
            this.circuitOpen = true;
            console.warn('TMDB Circuit Breaker: OPEN (Too many failures)');
        }
    }

    checkCircuit() {
        if (this.circuitOpen) {
            if (Date.now() - this.lastFailureTime > CONFIG.CIRCUIT_BREAKER.RESET_TIMEOUT) {
                // Half-open state: allow one request to try
                return true;
            }
            throw new Error('TMDB Service Unavailable (Circuit Breaker Open)');
        }
        return true;
    }

    async get(endpoint, params = {}) {
        this.checkCircuit();

        const cacheKey = `${endpoint}_${JSON.stringify(params)}`;

        // Request Coalescing
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }

        const requestPromise = this.client.get(endpoint, { params })
            .then(res => {
                this.pendingRequests.delete(cacheKey);
                return res;
            })
            .catch(err => {
                this.pendingRequests.delete(cacheKey);
                throw err;
            });

        this.pendingRequests.set(cacheKey, requestPromise);
        return requestPromise;
    }
}

const tmdbClient = new TMDBClient();

class TmdbService {
    constructor() {
        this.cache = cache;
    }

    // --- Smart Caching Wrapper ---
    async getWithSmartCache(key, fetchFn, ttl = 300) {
        const cached = this.cache.get(key);

        if (cached) {
            // Stale-While-Revalidate Logic could be implemented here if we stored timestamp
            // For now, standard cache return
            return { data: cached, fromCache: true };
        }

        try {
            const data = await fetchFn();
            this.cache.set(key, data, ttl);
            return { data, fromCache: false };
        } catch (error) {
            // If fetch fails but we have stale data (not implemented in node-cache directly without custom wrapper),
            // we would return it here.
            // Fallback: if error, try to return empty structure or rethrow
            throw error;
        }
    }

    async getRecommendations(userId) {
        const cacheKey = userId ? `rec_home_v3_${userId}` : 'rec_home_v3_guest';

        // SWR-like behavior: Check cache first
        const cachedData = this.cache.get(cacheKey);
        if (cachedData) {
            // In a real SWR, we might trigger a background refresh here if data is "old" but not expired
            return { data: cachedData, fromCache: true };
        }

        const apiKey = process.env.TMDB_API_KEY;

        const fetchLogic = async () => {
            if (!userId) {
                const trending = await this.fetchTMDB('/trending/all/week', { api_key: apiKey });
                return { results: trending };
            }

            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            const watchHistory = user.watchHistory || [];

            if (watchHistory.length === 0) {
                const trending = await this.fetchTMDB('/trending/all/week', { api_key: apiKey });
                return { results: trending };
            }

            const recommendations = await this.generatePersonalizedRecommendations(watchHistory, apiKey);
            return { results: recommendations };
        };

        try {
            const data = await fetchLogic();
            this.cache.set(cacheKey, data, CONFIG.CACHE_TTL.TRENDING);
            return { data, fromCache: false };
        } catch (error) {
            console.error('Error fetching recommendations:', error);
            // Fallback to trending if personalization fails
            const trending = await this.fetchTMDB('/trending/all/week', { api_key: apiKey });
            return { data: { results: trending }, fromCache: false };
        }
    }

    async getItemRecommendations(type, id, userId) {
        const cacheKey = userId ? `rec_item_${type}_${id}_${userId}` : `rec_item_${type}_${id}_guest`;

        return this.getWithSmartCache(cacheKey, async () => {
            const apiKey = process.env.TMDB_API_KEY;
            let userTopGenres = [];

            if (userId) {
                try {
                    const user = await User.findById(userId);
                    const watchHistory = user ? (user.watchHistory || []) : [];
                    userTopGenres = this.calculateUserTopGenres(watchHistory);
                } catch (err) {
                    console.warn('Failed to fetch user for item recommendations', err);
                }
            }

            const recommendations = await this.generateItemRecommendations(type, id, apiKey, userTopGenres);
            return { results: recommendations };
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

        return this.getWithSmartCache(cacheKey, async () => {
            const apiKey = process.env.TMDB_API_KEY;
            if (!apiKey) throw new Error('TMDB API Key missing');

            const startTime = Date.now();
            const results = await this.fetchSearchResults(trimmedQuery, apiKey, limitNum);

            let filteredResults = this.processSearchResults(results, filters, trimmedQuery, sortBy);
            const paginatedData = paginateResults(filteredResults, pageNum, limitNum);

            // Cleanup internal scores
            paginatedData.results = paginatedData.results.map(({ _relevanceScore, ...item }) => item);

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

        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        const apiKey = process.env.TMDB_API_KEY;
        try {
            const response = await tmdbClient.get('/search/multi', {
                api_key: apiKey,
                query: trimmedQuery,
                language: 'en-US',
                page: 1
            });

            const results = response.data.results || [];
            const suggestions = results
                .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
                .slice(0, 10)
                .map(item => ({
                    id: item.id,
                    title: item.title || item.name,
                    media_type: item.media_type,
                    year: (item.release_date || item.first_air_date || '').substring(0, 4),
                    poster_path: item.poster_path
                }));

            this.cache.set(cacheKey, suggestions, CONFIG.CACHE_TTL.SUGGESTIONS);
            return suggestions;
        } catch (error) {
            console.error('Search Suggestions Error:', error.message);
            return [];
        }
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
        } catch (error) {
            return null;
        }
    }

    calculateUserTopGenres(watchHistory) {
        const genreScores = {};
        const decayFactor = 0.95;
        watchHistory.forEach((item, index) => {
            if (item.genre_ids) {
                const weight = Math.pow(decayFactor, index);
                item.genre_ids.forEach(genreId => {
                    genreScores[genreId] = (genreScores[genreId] || 0) + weight;
                });
            }
        });
        return Object.entries(genreScores)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([id]) => id);
    }

    async generatePersonalizedRecommendations(watchHistory, apiKey) {
        const topGenres = this.calculateUserTopGenres(watchHistory);
        const recentItems = watchHistory.slice(0, 3);

        const analyzedDetails = await Promise.all(
            recentItems.map(item => {
                if (!item.id) return null;
                const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
                return this.fetchDetails(type, item.id, apiKey);
            })
        );

        const validDetails = analyzedDetails.filter(d => d !== null);
        const { topPeople, topLanguage, topKeywords, topEra } = this.extractPreferences(validDetails);

        const promises = [];

        // Source A: Popularity based on Top Genre 1
        if (topGenres[0]) {
            promises.push(this.fetchTMDB('/discover/movie', {
                api_key: apiKey,
                with_genres: topGenres[0],
                sort_by: 'popularity.desc',
                'vote_count.gte': 100
            }).then(res => ({ source: 'popular_genre_1', items: res })));
        }

        // Source B: Quality based on Top Genre 2
        const qualityGenre = topGenres[1] || topGenres[0];
        if (qualityGenre) {
            promises.push(this.fetchTMDB('/discover/movie', {
                api_key: apiKey,
                with_genres: qualityGenre,
                sort_by: 'vote_average.desc',
                'vote_count.gte': 300
            }).then(res => ({ source: 'quality_genre_2', items: res })));
        }

        // Source C: Contextual (Based on most recent item)
        if (recentItems[0] && recentItems[0].id) {
            const item = recentItems[0];
            const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');

            promises.push(this.fetchTMDB(`/${type}/${item.id}/recommendations`, { api_key: apiKey })
                .then(res => ({ source: 'recent_0', items: res })));

            promises.push(this.fetchTMDB(`/${type}/${item.id}/similar`, { api_key: apiKey })
                .then(res => ({ source: 'similar_recent', items: res })));
        }

        // Source E: People
        if (topPeople.length > 0) {
            promises.push(this.fetchTMDB('/discover/movie', {
                api_key: apiKey,
                with_people: topPeople.slice(0, 1).join(','),
                sort_by: 'popularity.desc'
            }).then(res => ({ source: 'people_match', items: res })));
        }

        // Source F: Regional
        if (topLanguage && topLanguage !== 'en') {
            promises.push(this.fetchTMDB('/discover/movie', {
                api_key: apiKey,
                with_original_language: topLanguage,
                sort_by: 'popularity.desc'
            }).then(res => ({ source: 'language_match', items: res })));
        }

        // Source H: Franchise
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

        return this.scoreAndRankItems(results, watchHistory, topGenres, topLanguage, topEra);
    }

    extractPreferences(validDetails) {
        const preferredPeople = {};
        const preferredLanguages = {};
        const preferredKeywords = {};
        const preferredEras = {};

        validDetails.forEach((detail, idx) => {
            const weight = Math.pow(0.9, idx);

            if (detail.original_language) {
                preferredLanguages[detail.original_language] = (preferredLanguages[detail.original_language] || 0) + weight;
            }

            if (detail.credits) {
                const directors = detail.credits.crew?.filter(c => c.job === 'Director') || [];
                directors.forEach(d => {
                    preferredPeople[d.id] = (preferredPeople[d.id] || 0) + (weight * 2);
                });

                const cast = detail.credits.cast?.slice(0, 3) || [];
                cast.forEach(c => {
                    preferredPeople[c.id] = (preferredPeople[c.id] || 0) + weight;
                });
            }

            const keywords = detail.keywords?.keywords || detail.keywords?.results || [];
            keywords.forEach(k => {
                preferredKeywords[k.id] = (preferredKeywords[k.id] || 0) + weight;
            });

            const date = detail.release_date || detail.first_air_date;
            if (date) {
                const year = parseInt(date.substring(0, 4));
                const decade = Math.floor(year / 10) * 10;
                preferredEras[decade] = (preferredEras[decade] || 0) + weight;
            }
        });

        const topPeople = Object.entries(preferredPeople).sort(([, a], [, b]) => b - a).slice(0, 2).map(([id]) => id);
        const topLanguage = Object.entries(preferredLanguages).sort(([, a], [, b]) => b - a).map(([lang]) => lang)[0];
        const topKeywords = Object.entries(preferredKeywords).sort(([, a], [, b]) => b - a).slice(0, 3).map(([id]) => id);
        const topEra = Object.entries(preferredEras).sort(([, a], [, b]) => b - a).map(([decade]) => parseInt(decade))[0];

        return { topPeople, topLanguage, topKeywords, topEra };
    }

    scoreAndRankItems(results, watchHistory, topGenres, topLanguage, topEra) {
        const itemScores = new Map();
        const itemData = new Map();

        results.forEach(({ source, items }) => {
            items.forEach(item => {
                if (!item.id) return;

                if (!itemScores.has(item.id)) {
                    itemScores.set(item.id, 0);
                    itemData.set(item.id, item);
                }

                let score = 0;
                if (source === 'franchise_match') score += CONFIG.SCORING.FRANCHISE;
                if (source === 'similar_recent') score += CONFIG.SCORING.SIMILAR;
                if (source === 'people_match') score += CONFIG.SCORING.DIRECTOR;
                if (source === 'language_match') score += CONFIG.SCORING.LANGUAGE;
                if (source.startsWith('recent_')) score += 5;
                if (source === 'popular_genre_1') score += 3;
                if (source === 'quality_genre_2') score += 3;
                score += CONFIG.SCORING.BASE;

                itemScores.set(item.id, itemScores.get(item.id) + score);
            });
        });

        return this.finalizeRanking(itemScores, itemData, watchHistory, topGenres, topLanguage, topEra);
    }

    finalizeRanking(itemScores, itemData, watchHistory, topGenres, topLanguage, topEra) {
        for (const [id, score] of itemScores.entries()) {
            const item = itemData.get(id);
            let newScore = score;

            if (item.vote_average) newScore += item.vote_average;

            if (item.genre_ids) {
                item.genre_ids.forEach(gid => {
                    if (topGenres.includes(String(gid)) || topGenres.includes(gid)) newScore += 2;
                });
            }

            if (item.original_language === topLanguage && topLanguage !== 'en') newScore += 3;

            const date = item.release_date || item.first_air_date;
            if (date && topEra) {
                const year = parseInt(date.substring(0, 4));
                const decade = Math.floor(year / 10) * 10;
                if (decade === topEra) newScore += 4;
            }

            itemScores.set(id, newScore);
        }

        const watchedIds = new Set(watchHistory.map(item => item.id));
        return Array.from(itemScores.entries())
            .filter(([id]) => !watchedIds.has(id))
            .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
            .map(([id]) => itemData.get(id))
            .filter(item => item.poster_path || item.backdrop_path)
            .slice(0, 20);
    }

    async generateItemRecommendations(type, id, apiKey, userTopGenres) {
        let itemDetails;
        try {
            const response = await tmdbClient.get(`/${type}/${id}`, {
                api_key: apiKey,
                append_to_response: 'credits,keywords'
            });
            itemDetails = response.data;
        } catch (error) {
            throw new Error('Item not found');
        }

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

        // --- Smart Fetch Strategy ---
        // 1. Primary Sources (Critical, wait for these)
        const primaryPromises = [];
        primaryPromises.push(this.fetchTMDB(`/${type}/${id}/similar`, { api_key: apiKey }).then(res => ({ source: 'similar', items: res })));
        primaryPromises.push(this.fetchTMDB(`/${type}/${id}/recommendations`, { api_key: apiKey }).then(res => ({ source: 'recommendations', items: res })));

        if (type === 'movie' && itemDetails.belongs_to_collection) {
            primaryPromises.push(
                tmdbClient.get(`/collection/${itemDetails.belongs_to_collection.id}`, {
                    api_key: apiKey
                })
                    .then(res => ({ source: 'franchise_match', items: res.data.parts || [] }))
                    .catch(() => ({ source: 'franchise_match', items: [] }))
            );
        }

        // 2. Secondary Sources (Enhancement, skip if slow)
        const secondaryPromises = [];
        const SECONDARY_TIMEOUT = 1500; // 1.5s timeout for secondary sources

        const withTimeout = (promise, fallbackValue) => {
            return Promise.race([
                promise,
                new Promise(resolve => setTimeout(() => resolve(fallbackValue), SECONDARY_TIMEOUT))
            ]);
        };

        if (director && type === 'movie') {
            secondaryPromises.push(withTimeout(
                this.fetchTMDB('/discover/movie', {
                    api_key: apiKey,
                    with_people: director.id,
                    sort_by: 'popularity.desc'
                }).then(res => ({ source: 'director_match', items: res })),
                { source: 'director_match', items: [] } // Fallback
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

        // Execute all requests
        // We use allSettled to ensure one failure doesn't break the whole response
        const allPromises = [...primaryPromises, ...secondaryPromises];
        const resultsSettled = await Promise.allSettled(allPromises);

        const results = resultsSettled
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value)
            // Filter out empty fallbacks if needed, though scoreAndRank handles empty lists
            .filter(r => r && r.items);

        return this.scoreAndRankItemRecommendations(results, id, userTopGenres);
    }

    scoreAndRankItemRecommendations(results, currentId, userTopGenres) {
        const itemScores = new Map();
        const itemData = new Map();

        results.forEach(({ source, items }) => {
            items.forEach(item => {
                if (!item.id || item.id === parseInt(currentId)) return;

                if (!itemScores.has(item.id)) {
                    itemScores.set(item.id, 0);
                    itemData.set(item.id, item);
                }

                let score = 0;
                if (source === 'franchise_match') score += CONFIG.SCORING.FRANCHISE;
                if (source === 'similar') score += CONFIG.SCORING.SIMILAR;
                if (source === 'recommendations') score += 5;
                if (source === 'director_match') score += CONFIG.SCORING.DIRECTOR;
                if (source === 'cast_match') score += CONFIG.SCORING.CAST;
                if (source === 'keyword_match') score += CONFIG.SCORING.KEYWORD;
                if (source === 'studio_match') score += CONFIG.SCORING.STUDIO;
                if (source === 'era_match') score += CONFIG.SCORING.ERA;
                score += CONFIG.SCORING.BASE;

                itemScores.set(item.id, itemScores.get(item.id) + score);
            });
        });

        for (const [id, score] of itemScores.entries()) {
            const item = itemData.get(id);
            let newScore = score;

            if (userTopGenres.length > 0 && item.genre_ids) {
                item.genre_ids.forEach(gid => {
                    if (userTopGenres.includes(String(gid)) || userTopGenres.includes(gid)) newScore += 3;
                });
            }

            itemScores.set(id, newScore);
        }

        return Array.from(itemScores.entries())
            .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
            .map(([id]) => itemData.get(id))
            .filter(item => item.poster_path || item.backdrop_path)
            .slice(0, 12);
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

        return this.getWithSmartCache(cacheKey, async () => {
            const response = await tmdbClient.get(endpoint, {
                ...params,
                api_key: apiKey
            });
            return response.data;
        }, 300);
    }

    processSearchResults(allResults, filters, query, sortBy) {
        let filteredResults = allResults.filter(item =>
            item.media_type === 'movie' || item.media_type === 'tv'
        );

        filteredResults = filteredResults.map(item => ({
            id: item.id,
            media_type: item.media_type,
            title: item.title || item.name,
            name: item.name,
            original_title: item.original_title,
            original_name: item.original_name,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            overview: item.overview,
            vote_average: item.vote_average,
            vote_count: item.vote_count,
            popularity: item.popularity,
            genre_ids: item.genre_ids,
            release_date: item.release_date,
            first_air_date: item.first_air_date,
            adult: item.adult
        }));

        if (filters.mediaType || filters.yearStart || filters.yearEnd || filters.minRating || filters.genres.length > 0) {
            filteredResults = applyFilters(filteredResults, filters);
        }

        filteredResults = filteredResults.map(item => ({
            ...item,
            _relevanceScore: scoreSearchResult(item, query)
        }));

        switch (sortBy) {
            case 'recent':
                filteredResults.sort((a, b) => {
                    const dateA = a.release_date || a.first_air_date || '1900-01-01';
                    const dateB = b.release_date || b.first_air_date || '1900-01-01';
                    return dateB.localeCompare(dateA);
                });
                break;
            case 'popular':
                filteredResults.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
                break;
            case 'rating':
                filteredResults.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
                break;
            case 'relevance':
            default:
                filteredResults.sort((a, b) => (b._relevanceScore || 0) - (a._relevanceScore || 0));
                break;
        }

        if (sortBy === 'relevance') {
            filteredResults = filteredResults.filter(item => (item._relevanceScore || 0) > 10);
        }

        const seenIds = new Set();
        return filteredResults.filter(item => {
            if (seenIds.has(item.id)) return false;
            seenIds.add(item.id);
            return true;
        });
    }
}

export default new TmdbService();
