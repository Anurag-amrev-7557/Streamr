import { scoreSearchResult, applyFilters } from './searchHelpers.js';

const SCORING = {
    FRANCHISE: 25, // Boosted
    SIMILAR: 15,
    DIRECTOR: 12,
    MY_LIST_INTENT: 12, // New high signal
    CAST: 8,
    KEYWORD: 6,
    LANGUAGE: 5,
    STUDIO: 5,
    ERA: 4,
    GENRE: 3,
    BASE: 2,
    DEEP_CUT_BONUS: 5,
    DISCOVERY_BONUS: 4
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
        // More recent watches have significantly higher weight
        const weight = Math.pow(0.85, idx);

        if (detail.original_language) {
            preferredLanguages[detail.original_language] = (preferredLanguages[detail.original_language] || 0) + weight;
        }

        if (detail.credits) {
            const directors = detail.credits.crew?.filter(c => c.job === 'Director') || [];
            directors.forEach(d => {
                preferredPeople[d.id] = (preferredPeople[d.id] || 0) + (weight * 3); // Directors are huge signal
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

export const scoreAndRankItems = (results, watchHistory, myList, topGenres, topLanguage, topEra) => {
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
            if (source === 'director_aficionado') score += SCORING.DIRECTOR;
            if (source.startsWith('history_recent_')) score += SCORING.SIMILAR;
            if (source.startsWith('mylist_intent_')) score += SCORING.MY_LIST_INTENT;
            if (source === 'people_match') score += SCORING.DIRECTOR; // Legacy fallback
            if (source === 'language_match' || source === 'intl_fan') score += SCORING.LANGUAGE;
            if (source === 'popular_genre_1') score += SCORING.GENRE * 1.5;
            if (source === 'genre_hero_pop') score += SCORING.GENRE * 2;
            if (source === 'genre_hero_quality') score += SCORING.GENRE * 2;
            if (source === 'quality_genre_2') score += SCORING.GENRE;

            if (source === 'deep_cuts') score += SCORING.DEEP_CUT_BONUS;
            if (source === 'discovery_new_horizons') score += SCORING.DISCOVERY_BONUS;
            if (source.startsWith('recent_')) score += 5; // Legacy fallback

            score += SCORING.BASE;

            itemScores.set(item.id, itemScores.get(item.id) + score);
        });
    });

    // Add explicit MyList content IDs for easy checking
    const myListIds = new Set((myList || []).map(m => m.id));

    return finalizeRanking(itemScores, itemData, watchHistory, myListIds, topGenres, topLanguage, topEra);
};

const finalizeRanking = (itemScores, itemData, watchHistory, myListIds, topGenres, topLanguage, topEra) => {
    for (const [id, score] of itemScores.entries()) {
        const item = itemData.get(id);
        let newScore = score;

        if (item.vote_average) newScore += item.vote_average;

        // Boost items that match top genres
        if (item.genre_ids) {
            item.genre_ids.forEach(gid => {
                if (topGenres.includes(String(gid)) || topGenres.includes(gid)) newScore += 2;
            });
        }

        // Boost items from the same era
        const date = item.release_date || item.first_air_date;
        if (date && topEra) {
            const year = parseInt(date.substring(0, 4));
            const decade = Math.floor(year / 10) * 10;
            if (decade === topEra) newScore += 3;
        }

        // Boost items already in MyList (Remind them to watch) or closely related
        if (myListIds && myListIds.has(item.id)) {
            // Actually, we might want to filter out things ALREADY in my list depending on UI?
            // Usually "Recommendations" shouldn't show what I already explicitly saved to watch,
            // OR it should show them with a "Jump Back In" label. 
            // For now, let's slight penalize exact matches so they don't dominate discovery, 
            // but keep them if they are high scoring (reminder).
            newScore -= 5;
        }

        itemScores.set(id, newScore);
    }

    const watchedIds = new Set(watchHistory.map(item => item.id));

    // Diverse Selection Strategy
    const sortedItems = Array.from(itemScores.entries())
        .filter(([id]) => !watchedIds.has(id))
        .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
        .map(([id]) => itemData.get(id))
        .filter(item => item.poster_path || item.backdrop_path);

    const finalSelection = [];
    const seenGenres = new Set();

    // Greedy selection with diversity boost
    for (const item of sortedItems) {
        if (finalSelection.length >= 20) break;

        // Check if we have too much of this primary genre already
        const primaryGenre = item.genre_ids?.[0];
        const isGenreSaturated = seenGenres.has(primaryGenre) && finalSelection.filter(i => i.genre_ids?.[0] === primaryGenre).length > 3;

        if (!isGenreSaturated) {
            finalSelection.push(item);
            if (primaryGenre) seenGenres.add(primaryGenre);
        } else {
            // If highly scored enough, we still include it, but maybe skip marginal ones?
            // For now, just skip to force diversity
            // Actually, let's allow it if it's REALLY high score (>30)
            if (itemScores.get(item.id) > 30) {
                finalSelection.push(item);
            }
        }
    }

    // Fill up if diversity filtering was too aggressive
    if (finalSelection.length < 20) {
        const remaining = sortedItems.filter(i => !finalSelection.includes(i));
        finalSelection.push(...remaining.slice(0, 20 - finalSelection.length));
    }

    return finalSelection;
};

export const scoreAndRankItemRecommendations = (results, currentId, userTopGenres, userMyListIds = []) => {
    const itemScores = new Map();
    const itemData = new Map();

    const myListSet = new Set(userMyListIds);

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

        // Boost items that are in the user's MyList (User already expressed interest)
        if (myListSet.has(item.id)) newScore += 10;

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
