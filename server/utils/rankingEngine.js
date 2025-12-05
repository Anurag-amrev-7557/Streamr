import { scoreSearchResult, applyFilters } from './searchHelpers.js';

const SCORING = {
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
};

export const calculateUserTopGenres = (watchHistory) => {
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
};

export const extractPreferences = (validDetails) => {
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
};

export const scoreAndRankItems = (results, watchHistory, topGenres, topLanguage, topEra) => {
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
            if (source === 'franchise_match') score += SCORING.FRANCHISE;
            if (source === 'similar_recent') score += SCORING.SIMILAR;
            if (source === 'people_match') score += SCORING.DIRECTOR;
            if (source === 'language_match') score += SCORING.LANGUAGE;
            if (source.startsWith('recent_')) score += 5;
            if (source === 'popular_genre_1') score += 3;
            if (source === 'quality_genre_2') score += 3;
            score += SCORING.BASE;

            itemScores.set(item.id, itemScores.get(item.id) + score);
        });
    });

    return finalizeRanking(itemScores, itemData, watchHistory, topGenres, topLanguage, topEra);
};

const finalizeRanking = (itemScores, itemData, watchHistory, topGenres, topLanguage, topEra) => {
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
};

export const scoreAndRankItemRecommendations = (results, currentId, userTopGenres) => {
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
            if (source === 'franchise_match') score += SCORING.FRANCHISE;
            if (source === 'similar') score += SCORING.SIMILAR;
            if (source === 'recommendations') score += 5;
            if (source === 'director_match') score += SCORING.DIRECTOR;
            if (source === 'cast_match') score += SCORING.CAST;
            if (source === 'keyword_match') score += SCORING.KEYWORD;
            if (source === 'studio_match') score += SCORING.STUDIO;
            if (source === 'era_match') score += SCORING.ERA;
            score += SCORING.BASE;

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
};

export const processSearchResults = (allResults, filters, query, sortBy) => {
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
};
