import express from 'express';
import axios from 'axios';
import https from 'https';

import cache from '../utils/cache.js';

const router = express.Router();

// Use shared cache
const tmdbCache = cache;

// TMDB Base URL
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Create an axios instance for TMDB
const tmdbClient = axios.create({
    baseURL: TMDB_BASE_URL,
    timeout: 10000,
    httpsAgent: new https.Agent({ keepAlive: true })
});

// Import dependencies for recommendation logic
import User from '../models/User.js';
import { protect, optionalProtect } from '../middleware/auth.js'; // eslint-disable-line no-unused-vars

// Recommendation Route - Must be before the proxy route
router.get('/recommendations', optionalProtect, async (req, res) => {
    try {
        // Get user ID if authenticated, otherwise null
        const userId = req.user?.id || null;

        // 1. Check Cache
        const cacheKey = userId ? `rec_home_v3_${userId}` : 'rec_home_v3_guest';
        const cachedData = tmdbCache.get(cacheKey);
        if (cachedData) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(cachedData);
        }

        // If no user is authenticated, return trending content
        if (!userId) {
            const apiKey = process.env.TMDB_API_KEY;
            const fetchTMDB = async (endpoint, params = {}) => {
                try {
                    const response = await tmdbClient.get(endpoint, {
                        params: { ...params, api_key: apiKey }
                    });
                    return response.data.results || [];
                } catch (error) { // eslint-disable-line no-unused-vars
                    return [];
                }
            };

            const trending = await fetchTMDB('/trending/all/week');
            const responseData = { results: trending };
            tmdbCache.set(cacheKey, responseData, 600);
            res.setHeader('X-Cache', 'MISS');
            return res.json(responseData);
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const watchHistory = user.watchHistory || [];
        const apiKey = process.env.TMDB_API_KEY;

        // Helper to fetch from TMDB
        const fetchTMDB = async (endpoint, params = {}) => {
            try {
                const response = await tmdbClient.get(endpoint, {
                    params: { ...params, api_key: apiKey }
                });
                return response.data.results || [];
            } catch (error) {
                console.error(`TMDB Fetch Error (${endpoint}):`, error.message);
                return [];
            }
        };

        // Helper to fetch single item details
        const fetchDetails = async (type, id) => {
            try {
                const response = await tmdbClient.get(`/${type}/${id}`, {
                    params: {
                        api_key: apiKey,
                        append_to_response: 'credits,keywords'
                    }
                });
                return response.data;
            } catch (error) { // eslint-disable-line no-unused-vars
                return null;
            }
        };

        // Strategy 1: If history is empty, return Trending
        if (watchHistory.length === 0) {
            const trending = await fetchTMDB('/trending/all/week');
            tmdbCache.set(cacheKey, { results: trending }, 600); // Cache for 10 mins
            return res.json({ results: trending });
        }

        // --- Advanced Recommendation Algorithm ---

        // 1. Weighted Genre Analysis
        const genreScores = {};
        const decayFactor = 0.95; // Decay score for older items

        watchHistory.forEach((item, index) => {
            if (item.genre_ids) {
                const weight = Math.pow(decayFactor, index); // Higher weight for recent items (index 0 is most recent)
                item.genre_ids.forEach(genreId => {
                    genreScores[genreId] = (genreScores[genreId] || 0) + weight;
                });
            }
        });

        // Get top 3 genres
        const topGenres = Object.entries(genreScores)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([id]) => id);

        // 2. Deep Analysis of Recent Items (Actor, Director, Country, Keywords, Era)
        const recentItems = watchHistory.slice(0, 3);
        const analyzedDetails = await Promise.all(
            recentItems.map(item => {
                if (!item.id) return null;
                const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
                return fetchDetails(type, item.id);
            })
        );

        const validDetails = analyzedDetails.filter(d => d !== null);

        // Extract Preferences
        const preferredPeople = {}; // id -> score
        const preferredLanguages = {}; // iso_639_1 -> score
        const preferredKeywords = {}; // id -> score
        const preferredEras = {}; // decade (e.g., 1990) -> score

        validDetails.forEach((detail, idx) => {
            const weight = Math.pow(0.9, idx);

            // Language/Country
            if (detail.original_language) {
                preferredLanguages[detail.original_language] = (preferredLanguages[detail.original_language] || 0) + weight;
            }

            // Credits
            if (detail.credits) {
                // Directors (Crew)
                const directors = detail.credits.crew?.filter(c => c.job === 'Director') || [];
                directors.forEach(d => {
                    preferredPeople[d.id] = (preferredPeople[d.id] || 0) + (weight * 2); // Directors have high weight
                });

                // Cast (Top 3)
                const cast = detail.credits.cast?.slice(0, 3) || [];
                cast.forEach(c => {
                    preferredPeople[c.id] = (preferredPeople[c.id] || 0) + weight;
                });
            }

            // Keywords
            const keywords = detail.keywords?.keywords || detail.keywords?.results || [];
            keywords.forEach(k => {
                preferredKeywords[k.id] = (preferredKeywords[k.id] || 0) + weight;
            });

            // Era (Decade)
            const date = detail.release_date || detail.first_air_date;
            if (date) {
                const year = parseInt(date.substring(0, 4));
                const decade = Math.floor(year / 10) * 10;
                preferredEras[decade] = (preferredEras[decade] || 0) + weight;
            }
        });

        const topPeople = Object.entries(preferredPeople)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 2)
            .map(([id]) => id);

        const topLanguage = Object.entries(preferredLanguages)
            .sort(([, a], [, b]) => b - a)
            .map(([lang]) => lang)[0];

        const topKeywords = Object.entries(preferredKeywords)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([id]) => id);

        const topEra = Object.entries(preferredEras)
            .sort(([, a], [, b]) => b - a)
            .map(([decade]) => parseInt(decade))[0];

        // 3. Multi-Source Retrieval
        const promises = [];

        // Source A: Popularity based on Top Genre 1
        if (topGenres[0]) {
            promises.push(fetchTMDB('/discover/movie', {
                with_genres: topGenres[0],
                sort_by: 'popularity.desc',
                'vote_count.gte': 100
            }).then(res => ({ source: 'popular_genre_1', items: res })));
        }

        // Source B: Quality (High Rated) based on Top Genre 2
        const qualityGenre = topGenres[1] || topGenres[0];
        if (qualityGenre) {
            promises.push(fetchTMDB('/discover/movie', {
                with_genres: qualityGenre,
                sort_by: 'vote_average.desc',
                'vote_count.gte': 300
            }).then(res => ({ source: 'quality_genre_2', items: res })));
        }

        // Source C: Contextual (Based on last 3 watched items)
        recentItems.forEach((item, idx) => {
            if (item.id) {
                const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
                promises.push(fetchTMDB(`/${type}/${item.id}/recommendations`)
                    .then(res => ({ source: `recent_${idx}`, items: res })));
            }
        });

        // Source D: Similarity (Based on most recent item)
        if (recentItems[0] && recentItems[0].id) {
            const item = recentItems[0];
            const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
            promises.push(fetchTMDB(`/${type}/${item.id}/similar`)
                .then(res => ({ source: 'similar_recent', items: res })));
        }

        // Source E: People (Director/Actor)
        if (topPeople.length > 0) {
            promises.push(fetchTMDB('/discover/movie', {
                with_people: topPeople.join(','),
                sort_by: 'popularity.desc'
            }).then(res => ({ source: 'people_match', items: res })));
        }

        // Source F: Regional/Language
        if (topLanguage && topLanguage !== 'en') {
            promises.push(fetchTMDB('/discover/movie', {
                with_original_language: topLanguage,
                sort_by: 'popularity.desc'
            }).then(res => ({ source: 'language_match', items: res })));
        }

        // Source G: Keywords
        if (topKeywords.length > 0) {
            promises.push(fetchTMDB('/discover/movie', {
                with_keywords: topKeywords.join('|'), // OR logic
                sort_by: 'popularity.desc'
            }).then(res => ({ source: 'keyword_match', items: res })));
        }

        // Source H: Franchise/Collection (Home Page Support)
        // Check if the most recent item belongs to a collection
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
        const itemScores = new Map();
        const itemData = new Map();

        results.forEach(({ source, items }) => {
            items.forEach(item => {
                if (!item.id) return;

                // Initialize if new
                if (!itemScores.has(item.id)) {
                    itemScores.set(item.id, 0);
                    itemData.set(item.id, item);
                }

                // Base score per source
                let score = 0;
                if (source === 'franchise_match') score += 20; // HUGE boost for franchise
                if (source === 'similar_recent') score += 10;
                if (source === 'people_match') score += 8;
                if (source === 'keyword_match') score += 6;
                if (source === 'language_match') score += 5;
                if (source.startsWith('recent_')) score += 5;
                if (source === 'popular_genre_1') score += 3;
                if (source === 'quality_genre_2') score += 3;

                // Boost for appearing in multiple sources
                score += 2;

                itemScores.set(item.id, itemScores.get(item.id) + score);
            });
        });

        // Add content-based boosts
        for (const [id, score] of itemScores.entries()) {
            const item = itemData.get(id);
            let newScore = score;

            // Boost high rated items
            if (item.vote_average) {
                newScore += item.vote_average; // Add rating directly (0-10)
            }

            // Boost if matches top genres
            if (item.genre_ids) {
                item.genre_ids.forEach(gid => {
                    if (topGenres.includes(String(gid)) || topGenres.includes(gid)) {
                        newScore += 2;
                    }
                });
            }

            // Boost if matches language
            if (item.original_language === topLanguage && topLanguage !== 'en') {
                newScore += 3;
            }

            // Boost if matches top keywords (need to fetch details or assume source match)
            // Note: We don't have keywords for all items, but 'keyword_match' source handles discovery.

            // Boost if matches Era
            const date = item.release_date || item.first_air_date;
            if (date && topEra) {
                const year = parseInt(date.substring(0, 4));
                const decade = Math.floor(year / 10) * 10;
                if (decade === topEra) {
                    newScore += 4; // Significant boost for era match
                }
            }

            itemScores.set(id, newScore);
        }

        // 5. Filtering & Final Sort
        const watchedIds = new Set(watchHistory.map(item => item.id));
        const finalRecommendations = Array.from(itemScores.entries())
            .filter(([id]) => !watchedIds.has(id)) // Remove watched
            .sort(([, scoreA], [, scoreB]) => scoreB - scoreA) // Sort by score desc
            .map(([id]) => itemData.get(id))
            .filter(item => item.poster_path || item.backdrop_path); // Ensure images exist

        const responseData = { results: finalRecommendations.slice(0, 20) };

        // Cache the result
        tmdbCache.set(cacheKey, responseData, 600); // 10 minutes

        res.setHeader('X-Cache', 'MISS');
        res.json(responseData);

    } catch (error) {
        console.error('Recommendation Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Item-Based Recommendation Route (for Modal)
router.get('/recommendations/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        const userId = req.user?.id || null;

        // 1. Check Cache
        const cacheKey = userId ? `rec_item_${type}_${id}_${userId}` : `rec_item_${type}_${id}_guest`;
        const cachedData = tmdbCache.get(cacheKey);
        if (cachedData) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(cachedData);
        }

        const apiKey = process.env.TMDB_API_KEY;

        // Fetch user for personalization (if authenticated)
        let user = null;
        let watchHistory = [];
        let userTopGenres = [];

        if (userId) {
            user = await User.findById(userId);
            watchHistory = user ? (user.watchHistory || []) : [];

            // Calculate User's Top Genres (Hybrid Filtering)
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
            userTopGenres = Object.entries(genreScores)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([id]) => id);
        }


        // Helper to fetch from TMDB
        const fetchTMDB = async (endpoint, params = {}) => {
            try {
                const response = await tmdbClient.get(endpoint, {
                    params: { ...params, api_key: apiKey }
                });
                return response.data.results || [];
            } catch (error) { // eslint-disable-line no-unused-vars
                return [];
            }
        };

        // 1. Fetch Item Details (Keywords, Credits, Release Date, Collection, Production Companies)
        let itemDetails;
        try {
            const response = await tmdbClient.get(`/${type}/${id}`, {
                params: {
                    api_key: apiKey,
                    append_to_response: 'credits,keywords'
                }
            });
            itemDetails = response.data;
        } catch (error) { // eslint-disable-line no-unused-vars
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        // Extract Metadata
        const keywords = itemDetails.keywords?.keywords || itemDetails.keywords?.results || [];
        const keywordIds = keywords.map(k => k.id).slice(0, 3); // Top 3 keywords

        const director = itemDetails.credits?.crew?.find(c => c.job === 'Director');
        // Get top 2 cast members for actor matching
        const topCast = itemDetails.credits?.cast?.slice(0, 2) || [];

        // Get top production company (Studio)
        const studio = itemDetails.production_companies && itemDetails.production_companies.length > 0 ? itemDetails.production_companies[0] : null;

        const date = itemDetails.release_date || itemDetails.first_air_date;
        let eraStart, eraEnd;
        if (date) {
            const year = parseInt(date.substring(0, 4));
            const decade = Math.floor(year / 10) * 10;
            eraStart = `${decade}-01-01`;
            eraEnd = `${decade + 9}-12-31`;
        }

        // 2. Multi-Source Retrieval
        const promises = [];

        // Source A: Similar (TMDB Default)
        promises.push(fetchTMDB(`/${type}/${id}/similar`).then(res => ({ source: 'similar', items: res })));

        // Source B: Recommendations (TMDB Default)
        promises.push(fetchTMDB(`/${type}/${id}/recommendations`).then(res => ({ source: 'recommendations', items: res })));

        // Source C: Same Director (Movies only usually)
        if (director && type === 'movie') {
            promises.push(fetchTMDB('/discover/movie', {
                with_people: director.id,
                sort_by: 'popularity.desc'
            }).then(res => ({ source: 'director_match', items: res })));
        }

        // Source D: Same Keywords
        if (keywordIds.length > 0) {
            promises.push(fetchTMDB(`/discover/${type}`, {
                with_keywords: keywordIds.join('|'), // OR logic
                sort_by: 'popularity.desc'
            }).then(res => ({ source: 'keyword_match', items: res })));
        }

        // Source E: Same Era & Genre
        if (eraStart && itemDetails.genres && itemDetails.genres.length > 0) {
            const genreIds = itemDetails.genres.map(g => g.id).slice(0, 2).join(',');
            const dateParam = type === 'movie' ? 'primary_release_date' : 'first_air_date';

            promises.push(fetchTMDB(`/discover/${type}`, {
                with_genres: genreIds,
                [`${dateParam}.gte`]: eraStart,
                [`${dateParam}.lte`]: eraEnd,
                sort_by: 'vote_average.desc',
                'vote_count.gte': 100
            }).then(res => ({ source: 'era_match', items: res })));
        }

        // Source F: Franchise/Collection (Movies only)
        if (type === 'movie' && itemDetails.belongs_to_collection) {
            promises.push(
                tmdbClient.get(`/collection/${itemDetails.belongs_to_collection.id}`, {
                    params: { api_key: apiKey }
                })
                    .then(res => ({ source: 'franchise_match', items: res.data.parts || [] }))
                    .catch(() => ({ source: 'franchise_match', items: [] }))
            );
        }

        // Source G: Same Cast (Actor Match)
        if (topCast.length > 0) {
            const castIds = topCast.map(c => c.id).join(',');
            promises.push(fetchTMDB(`/discover/${type}`, {
                with_people: castIds,
                sort_by: 'popularity.desc'
            }).then(res => ({ source: 'cast_match', items: res })));
        }

        // Source H: Same Studio (Company Match)
        if (studio) {
            promises.push(fetchTMDB(`/discover/${type}`, {
                with_companies: studio.id,
                sort_by: 'popularity.desc'
            }).then(res => ({ source: 'studio_match', items: res })));
        }

        const results = await Promise.all(promises);

        // 3. Scoring & Re-Ranking
        const itemScores = new Map();
        const itemData = new Map();

        results.forEach(({ source, items }) => {
            items.forEach(item => {
                if (!item.id || item.id === parseInt(id)) return; // Skip self

                if (!itemScores.has(item.id)) {
                    itemScores.set(item.id, 0);
                    itemData.set(item.id, item);
                }

                let score = 0;
                if (source === 'franchise_match') score += 20; // HUGE boost for franchise
                if (source === 'similar') score += 5;
                if (source === 'recommendations') score += 5;
                if (source === 'director_match') score += 8;
                if (source === 'cast_match') score += 6;
                if (source === 'keyword_match') score += 6;
                if (source === 'studio_match') score += 5;
                if (source === 'era_match') score += 4;

                score += 2; // Boost for appearing in multiple sources

                itemScores.set(item.id, itemScores.get(item.id) + score);
            });
        });

        // 4. Hybrid Personalization & Final Sort
        for (const [id, score] of itemScores.entries()) {
            const item = itemData.get(id);
            let newScore = score;

            // Boost if item matches User's Top Genres (only if user is authenticated)
            if (userTopGenres.length > 0 && item.genre_ids) {
                item.genre_ids.forEach(gid => {
                    if (userTopGenres.includes(String(gid)) || userTopGenres.includes(gid)) {
                        newScore += 3; // Personal preference boost
                    }
                });
            }

            itemScores.set(id, newScore);
        }

        const finalRecommendations = Array.from(itemScores.entries())
            .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
            .map(([id]) => itemData.get(id))
            .filter(item => item.poster_path || item.backdrop_path);

        const responseData = { results: finalRecommendations.slice(0, 12) };

        // Cache the result
        tmdbCache.set(cacheKey, responseData, 600); // 10 minutes

        res.setHeader('X-Cache', 'MISS');
        res.json(responseData);

    } catch (error) {
        console.error('Item Recommendation Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Import search helpers
import {
    scoreSearchResult,
    applyFilters,
    paginateResults,
    generateSearchCacheKey,
    normalizeSearchQuery
} from '../utils/searchHelpers.js';
import { trackSearchQuery } from '../utils/searchAnalytics.js';

// Enhanced Multi-Search Endpoint with Fuzzy Search, Filters, and Pagination
router.get('/search/multi', async (req, res) => {
    const startTime = Date.now();

    try {
        const {
            query,
            mediaType = 'all', // all, movie, tv
            yearStart,
            yearEnd,
            minRating,
            genres, // comma-separated genre IDs
            page = 1,
            limit = 20,
            sortBy = 'relevance' // relevance, recent, popular, rating
        } = req.query;

        // Validate query
        if (!query || !query.trim()) {
            return res.json({
                results: [],
                pagination: {
                    page: 1,
                    limit: parseInt(limit),
                    total: 0,
                    totalPages: 0,
                    hasMore: false
                }
            });
        }

        const trimmedQuery = query.trim();
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 20;

        // Parse filters
        const filters = {
            mediaType: mediaType !== 'all' ? mediaType : null,
            yearStart: yearStart ? parseInt(yearStart) : null,
            yearEnd: yearEnd ? parseInt(yearEnd) : null,
            minRating: minRating ? parseFloat(minRating) : null,
            genres: genres ? genres.split(',').map(g => g.trim()) : []
        };

        // Generate cache key with filters
        const cacheKey = generateSearchCacheKey(trimmedQuery, filters, pageNum);

        // Check cache
        const cachedResponse = tmdbCache.get(cacheKey);
        if (cachedResponse) {
            res.setHeader('X-Cache', 'HIT');

            // Track search (even for cached results)
            trackSearchQuery(trimmedQuery, cachedResponse.results?.length || 0, 0);

            return res.json(cachedResponse);
        }

        const apiKey = process.env.TMDB_API_KEY;

        if (!apiKey) {
            console.error('TMDB_API_KEY is missing in server environment variables');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error: TMDB API Key missing'
            });
        }

        // Fetch multiple pages from TMDB to get more results for better filtering and ranking
        const pagesToFetch = Math.min(3, Math.ceil(limitNum / 10)); // Fetch up to 3 pages
        const fetchPromises = [];

        for (let i = 1; i <= pagesToFetch; i++) {
            fetchPromises.push(
                tmdbClient.get('/search/multi', {
                    params: {
                        api_key: apiKey,
                        query: trimmedQuery,
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

        // Combine results from all pages
        let allResults = [];
        responses.forEach(response => {
            if (response.data && response.data.results) {
                allResults = allResults.concat(response.data.results);
            }
        });

        // Filter by media type first (remove persons, etc.)
        let filteredResults = allResults.filter(item =>
            item.media_type === 'movie' || item.media_type === 'tv'
        );

        // Map to consistent format with all needed fields
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

        // Apply custom filters
        if (filters.mediaType || filters.yearStart || filters.yearEnd || filters.minRating || filters.genres.length > 0) {
            filteredResults = applyFilters(filteredResults, filters);
        }

        // Calculate relevance scores for all results
        filteredResults = filteredResults.map(item => {
            const _relevanceScore = scoreSearchResult(item, trimmedQuery);
            return {
                ...item,
                _relevanceScore
            };
        });

        // Apply sorting
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

        // Remove items with very low relevance scores (likely not relevant)
        if (sortBy === 'relevance') {
            filteredResults = filteredResults.filter(item => (item._relevanceScore || 0) > 10);
        }

        // Remove duplicate IDs (can happen when fetching multiple pages)
        const seenIds = new Set();
        filteredResults = filteredResults.filter(item => {
            if (seenIds.has(item.id)) return false;
            seenIds.add(item.id);
            return true;
        });

        // Paginate results
        const paginatedData = paginateResults(filteredResults, pageNum, limitNum);

        // Remove internal score from response
        paginatedData.results = paginatedData.results.map(({ _relevanceScore, ...item }) => item); // eslint-disable-line no-unused-vars

        const responseTime = Date.now() - startTime;

        // Build response
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

        // Cache for 15 minutes (enhanced search results are more stable)
        tmdbCache.set(cacheKey, responseData, 900);

        // Track search analytics
        trackSearchQuery(trimmedQuery, responseData.results.length, responseTime);

        res.setHeader('X-Cache', 'MISS');
        res.json(responseData);
    } catch (error) {
        console.error('Enhanced Search Error:', error.message);

        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            res.status(504).json({ success: false, message: 'TMDB Service Unavailable' });
        } else {
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
});

// Autocomplete Suggestions Endpoint
router.get('/search/suggestions', async (req, res) => {
    try {
        const { query } = req.query;

        // If no query, return trending searches
        if (!query || query.trim().length < 2) {
            const { getCachedTrendingSearches } = await import('../utils/searchAnalytics.js');
            const trending = getCachedTrendingSearches().slice(0, 8);
            return res.json({
                suggestions: trending.map(t => t.query),
                type: 'trending'
            });
        }

        const trimmedQuery = query.trim();
        const cacheKey = `suggestions_${normalizeSearchQuery(trimmedQuery)}`;

        // Check cache (short TTL for suggestions)
        const cachedSuggestions = tmdbCache.get(cacheKey);
        if (cachedSuggestions) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(cachedSuggestions);
        }

        const apiKey = process.env.TMDB_API_KEY;

        // Quick search for suggestions (only first page, top results)
        const response = await tmdbClient.get('/search/multi', {
            params: {
                api_key: apiKey,
                query: trimmedQuery,
                language: 'en-US',
                page: 1
            }
        });

        // Extract top 8 unique titles, prioritized by popularity
        const suggestions = (response.data.results || [])
            .filter(item => (item.media_type === 'movie' || item.media_type === 'tv') && item.vote_count > 5) // Basic quality filter
            .sort((a, b) => b.popularity - a.popularity) // Sort by popularity
            .map(item => item.title || item.name)
            .filter((title, index, self) => title && self.indexOf(title) === index)
            .slice(0, 8);

        const responseData = {
            suggestions,
            type: 'results'
        };

        // Cache for 5 minutes (suggestions change frequently)
        tmdbCache.set(cacheKey, responseData, 300);

        res.setHeader('X-Cache', 'MISS');
        res.json(responseData);

    } catch (error) {
        console.error('Suggestions Error:', error.message);
        res.status(500).json({ suggestions: [], type: 'error' });
    }
});

// Trending Searches Endpoint
router.get('/search/trending', async (req, res) => {
    try {
        const cacheKey = 'trending_searches';

        // Check cache
        const cachedTrending = tmdbCache.get(cacheKey);
        if (cachedTrending) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(cachedTrending);
        }

        const { getCachedTrendingSearches } = await import('../utils/searchAnalytics.js');
        const trending = getCachedTrendingSearches();

        const responseData = {
            trending: trending.slice(0, 10),
            timestamp: new Date()
        };

        // Cache for 1 hour
        tmdbCache.set(cacheKey, responseData, 3600);

        res.setHeader('X-Cache', 'MISS');
        res.json(responseData);

    } catch (error) {
        console.error('Trending Searches Error:', error.message);
        res.status(500).json({ trending: [] });
    }
});

// Proxy route for all TMDB requests
router.get('/*', async (req, res) => {
    try {
        const apiKey = process.env.TMDB_API_KEY;

        if (!apiKey) {
            console.error('TMDB_API_KEY is missing in server environment variables');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error: TMDB API Key missing'
            });
        }

        // Construct the path (e.g., /movie/top_rated)
        const path = req.path;

        // Generate a unique cache key based on path and query parameters
        // We exclude api_key from the key as it's constant on the server
        const cacheKey = `${path}?${new URLSearchParams(req.query).toString()}`;

        // Check cache
        const cachedResponse = tmdbCache.get(cacheKey);
        if (cachedResponse) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(cachedResponse);
        }

        // Forward query parameters and append API key
        const params = {
            ...req.query,
            api_key: apiKey,
            language: req.query.language || 'en-US'
        };

        // Make request to TMDB
        const response = await tmdbClient.get(path, { params });

        // Store in cache
        tmdbCache.set(cacheKey, response.data);

        // Forward the data back to the client
        res.setHeader('X-Cache', 'MISS');
        res.json(response.data);
    } catch (error) {
        // Handle errors
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error(`TMDB Proxy Error [${error.response.status}]: ${error.response.config.url}`);
            res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('TMDB Proxy Error: No response received', error.message);
            res.status(504).json({ success: false, message: 'TMDB Service Unavailable' });
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('TMDB Proxy Error:', error.message);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
});

export default router;
