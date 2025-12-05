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

// Create an axios instance for TMDB
const tmdbClient = axios.create({
    baseURL: TMDB_BASE_URL,
    timeout: 10000,
    httpsAgent: new https.Agent({ keepAlive: true })
});

class TmdbService {
    constructor() {
        this.cache = cache;
    }

    async getRecommendations(userId) {
        const cacheKey = userId ? `rec_home_v3_${userId}` : 'rec_home_v3_guest';
        const cachedData = this.cache.get(cacheKey);

        if (cachedData) {
            return { data: cachedData, fromCache: true };
        }

        const apiKey = process.env.TMDB_API_KEY;

        if (!userId) {
            const trending = await this.fetchTMDB('/trending/all/week', { api_key: apiKey });
            const responseData = { results: trending };
            this.cache.set(cacheKey, responseData, 600);
            return { data: responseData, fromCache: false };
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const watchHistory = user.watchHistory || [];

        // Strategy 1: If history is empty, return Trending
        if (watchHistory.length === 0) {
            const trending = await this.fetchTMDB('/trending/all/week', { api_key: apiKey });
            this.cache.set(cacheKey, { results: trending }, 600);
            return { data: { results: trending }, fromCache: false };
        }

        // --- Advanced Recommendation Algorithm ---
        const recommendations = await this.generatePersonalizedRecommendations(watchHistory, apiKey);

        const responseData = { results: recommendations };
        this.cache.set(cacheKey, responseData, 600);

        return { data: responseData, fromCache: false };
    }

    async getItemRecommendations(type, id, userId) {
        const cacheKey = userId ? `rec_item_${type}_${id}_${userId}` : `rec_item_${type}_${id}_guest`;
        const cachedData = this.cache.get(cacheKey);

        if (cachedData) {
            return { data: cachedData, fromCache: true };
        }

        const apiKey = process.env.TMDB_API_KEY;
        let userTopGenres = [];

        if (userId) {
            const user = await User.findById(userId);
            const watchHistory = user ? (user.watchHistory || []) : [];
            userTopGenres = this.calculateUserTopGenres(watchHistory);
        }

        const recommendations = await this.generateItemRecommendations(type, id, apiKey, userTopGenres);

        const responseData = { results: recommendations };
        this.cache.set(cacheKey, responseData, 600);

        return { data: responseData, fromCache: false };
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
        const cachedResponse = this.cache.get(cacheKey);

        if (cachedResponse) {
            trackSearchQuery(trimmedQuery, cachedResponse.results?.length || 0, 0);
            return { data: cachedResponse, fromCache: true };
        }

        const apiKey = process.env.TMDB_API_KEY;
        if (!apiKey) throw new Error('TMDB API Key missing');

        const startTime = Date.now();
        const results = await this.fetchSearchResults(trimmedQuery, apiKey, limitNum);

        let filteredResults = this.processSearchResults(results, filters, trimmedQuery, sortBy);

        const paginatedData = paginateResults(filteredResults, pageNum, limitNum);
        // Remove internal score
        paginatedData.results = paginatedData.results.map(({ _relevanceScore, ...item }) => item); // eslint-disable-line no-unused-vars

        const responseTime = Date.now() - startTime;

        const responseData = {
            ...paginatedData,
            query: trimmedQuery,
            filters: {
                mediaType: filters.mediaType || 'all',
                yearStart: filters.yearStart,
                yearEnd: filters.yearEnd,
                minRating: filters.minRating,
                genres: filters.genres
            },
            sortBy,
            responseTime
        };

        this.cache.set(cacheKey, responseData, 900);
        return { data: responseData, fromCache: false };
    }

    async getSearchSuggestions(query) {
        if (!query || !query.trim()) {
            return [];
        }

        const trimmedQuery = query.trim();
        const cacheKey = `search_suggestions_${normalizeSearchQuery(trimmedQuery)}`;
        const cachedData = this.cache.get(cacheKey);

        if (cachedData) {
            return cachedData;
        }

        const apiKey = process.env.TMDB_API_KEY;
        try {
            const response = await tmdbClient.get('/search/multi', {
                params: {
                    api_key: apiKey,
                    query: trimmedQuery,
                    language: 'en-US',
                    page: 1
                }
            });

            const results = response.data.results || [];

            // Filter and map to simple suggestions
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

            this.cache.set(cacheKey, suggestions, 3600); // Cache for 1 hour
            return suggestions;
        } catch (error) {
            console.error('Search Suggestions Error:', error.message);
            return [];
        }
    }

    // Helper methods
    async fetchTMDB(endpoint, params = {}) {
        try {
            const response = await tmdbClient.get(endpoint, { params });
            return response.data.results || [];
        } catch (error) {
            console.error(`TMDB Fetch Error (${endpoint}):`, error.message);
            return [];
        }
    }

    async fetchDetails(type, id, apiKey) {
        try {
            const response = await tmdbClient.get(`/${type}/${id}`, {
                params: {
                    api_key: apiKey,
                    append_to_response: 'credits,keywords'
                }
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
        // 1. Weighted Genre Analysis
        const topGenres = this.calculateUserTopGenres(watchHistory);

        // 2. Deep Analysis of Recent Items
        const recentItems = watchHistory.slice(0, 3);
        const analyzedDetails = await Promise.all(
            recentItems.map(item => {
                if (!item.id) return null;
                const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
                return this.fetchDetails(type, item.id, apiKey);
            })
        );

        const validDetails = analyzedDetails.filter(d => d !== null);

        // Extract Preferences (People, Languages, Keywords, Eras)
        const { topPeople, topLanguage, topKeywords, topEra } = this.extractPreferences(validDetails);

        // 3. Multi-Source Retrieval
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

        // Source B: Quality (High Rated) based on Top Genre 2
        const qualityGenre = topGenres[1] || topGenres[0];
        if (qualityGenre) {
            promises.push(this.fetchTMDB('/discover/movie', {
                api_key: apiKey,
                with_genres: qualityGenre,
                sort_by: 'vote_average.desc',
                'vote_count.gte': 300
            }).then(res => ({ source: 'quality_genre_2', items: res })));
        }

        // Source C: Contextual (Based on last 3 watched items)
        recentItems.forEach((item, idx) => {
            if (item.id) {
                const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
                promises.push(this.fetchTMDB(`/${type}/${item.id}/recommendations`, { api_key: apiKey })
                    .then(res => ({ source: `recent_${idx}`, items: res })));
            }
        });

        // Source D: Similarity (Based on most recent item)
        if (recentItems[0] && recentItems[0].id) {
            const item = recentItems[0];
            const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
            promises.push(this.fetchTMDB(`/${type}/${item.id}/similar`, { api_key: apiKey })
                .then(res => ({ source: 'similar_recent', items: res })));
        }

        // Source E: People (Director/Actor)
        if (topPeople.length > 0) {
            promises.push(this.fetchTMDB('/discover/movie', {
                api_key: apiKey,
                with_people: topPeople.join(','),
                sort_by: 'popularity.desc'
            }).then(res => ({ source: 'people_match', items: res })));
        }

        // Source F: Regional/Language
        if (topLanguage && topLanguage !== 'en') {
            promises.push(this.fetchTMDB('/discover/movie', {
                api_key: apiKey,
                with_original_language: topLanguage,
                sort_by: 'popularity.desc'
            }).then(res => ({ source: 'language_match', items: res })));
        }

        // Source G: Keywords
        if (topKeywords.length > 0) {
            promises.push(this.fetchTMDB('/discover/movie', {
                api_key: apiKey,
                with_keywords: topKeywords.join('|'),
                sort_by: 'popularity.desc'
            }).then(res => ({ source: 'keyword_match', items: res })));
        }

        // Source H: Franchise/Collection
        if (validDetails[0] && validDetails[0].belongs_to_collection) {
            promises.push(
                tmdbClient.get(`/collection/${validDetails[0].belongs_to_collection.id}`, {
                    params: { api_key: apiKey }
                })
                    .then(res => ({ source: 'franchise_match', items: res.data.parts || [] }))
                    .catch(() => ({ source: 'franchise_match', items: [] }))
            );
        }

        const results = await Promise.all(promises);

        // 4. Scoring & Re-Ranking
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
                if (source === 'franchise_match') score += 20;
                if (source === 'similar_recent') score += 10;
                if (source === 'people_match') score += 8;
                if (source === 'keyword_match') score += 6;
                if (source === 'language_match') score += 5;
                if (source.startsWith('recent_')) score += 5;
                if (source === 'popular_genre_1') score += 3;
                if (source === 'quality_genre_2') score += 3;
                score += 2;

                itemScores.set(item.id, itemScores.get(item.id) + score);
            });
        });

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
                params: {
                    api_key: apiKey,
                    append_to_response: 'credits,keywords'
                }
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

        const promises = [];
        promises.push(this.fetchTMDB(`/${type}/${id}/similar`, { api_key: apiKey }).then(res => ({ source: 'similar', items: res })));
        promises.push(this.fetchTMDB(`/${type}/${id}/recommendations`, { api_key: apiKey }).then(res => ({ source: 'recommendations', items: res })));

        if (director && type === 'movie') {
            promises.push(this.fetchTMDB('/discover/movie', {
                api_key: apiKey,
                with_people: director.id,
                sort_by: 'popularity.desc'
            }).then(res => ({ source: 'director_match', items: res })));
        }

        if (keywordIds.length > 0) {
            promises.push(this.fetchTMDB(`/discover/${type}`, {
                api_key: apiKey,
                with_keywords: keywordIds.join('|'),
                sort_by: 'popularity.desc'
            }).then(res => ({ source: 'keyword_match', items: res })));
        }

        if (eraStart && itemDetails.genres?.length > 0) {
            const genreIds = itemDetails.genres.map(g => g.id).slice(0, 2).join(',');
            const dateParam = type === 'movie' ? 'primary_release_date' : 'first_air_date';
            promises.push(this.fetchTMDB(`/discover/${type}`, {
                api_key: apiKey,
                with_genres: genreIds,
                [`${dateParam}.gte`]: eraStart,
                [`${dateParam}.lte`]: eraEnd,
                sort_by: 'vote_average.desc',
                'vote_count.gte': 100
            }).then(res => ({ source: 'era_match', items: res })));
        }

        if (type === 'movie' && itemDetails.belongs_to_collection) {
            promises.push(
                tmdbClient.get(`/collection/${itemDetails.belongs_to_collection.id}`, {
                    params: { api_key: apiKey }
                })
                    .then(res => ({ source: 'franchise_match', items: res.data.parts || [] }))
                    .catch(() => ({ source: 'franchise_match', items: [] }))
            );
        }

        if (topCast.length > 0) {
            const castIds = topCast.map(c => c.id).join(',');
            promises.push(this.fetchTMDB(`/discover/${type}`, {
                api_key: apiKey,
                with_people: castIds,
                sort_by: 'popularity.desc'
            }).then(res => ({ source: 'cast_match', items: res })));
        }

        if (studio) {
            promises.push(this.fetchTMDB(`/discover/${type}`, {
                api_key: apiKey,
                with_companies: studio.id,
                sort_by: 'popularity.desc'
            }).then(res => ({ source: 'studio_match', items: res })));
        }

        const results = await Promise.all(promises);
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
                if (source === 'franchise_match') score += 20;
                if (source === 'similar') score += 5;
                if (source === 'recommendations') score += 5;
                if (source === 'director_match') score += 8;
                if (source === 'cast_match') score += 6;
                if (source === 'keyword_match') score += 6;
                if (source === 'studio_match') score += 5;
                if (source === 'era_match') score += 4;
                score += 2;

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
                    params: {
                        api_key: apiKey,
                        query: query,
                        language: 'en-US',
                        page: i
                    }
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
        const cachedData = this.cache.get(cacheKey);

        if (cachedData) {
            return { data: cachedData, fromCache: true };
        }

        try {
            const response = await tmdbClient.get(endpoint, {
                params: { ...params, api_key: apiKey }
            });

            this.cache.set(cacheKey, response.data, 300); // Cache for 5 minutes
            return { data: response.data, fromCache: false };
        } catch (error) {
            console.error(`TMDB Proxy Error (${endpoint}):`, error.message);
            throw error;
        }
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
