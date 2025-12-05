import tmdbService from '../services/tmdbService.js';

export const getRecommendations = async (req, res, next) => {
    try {
        // Pass the full user object (which contains watchHistory) to avoid re-fetching in service
        const user = req.user || null;
        const { data, fromCache } = await tmdbService.getRecommendations(user);

        if (fromCache) {
            res.setHeader('X-Cache', 'HIT');
        } else {
            res.setHeader('X-Cache', 'MISS');
        }

        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const getItemRecommendations = async (req, res, next) => {
    try {
        const { type, id } = req.params;
        const user = req.user || null;

        const { data, fromCache } = await tmdbService.getItemRecommendations(type, id, user);

        if (fromCache) {
            res.setHeader('X-Cache', 'HIT');
        } else {
            res.setHeader('X-Cache', 'MISS');
        }

        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const multiSearch = async (req, res, next) => {
    try {
        const { data, fromCache } = await tmdbService.multiSearch(req.query);

        if (fromCache) {
            res.setHeader('X-Cache', 'HIT');
        }

        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const getSearchSuggestions = async (req, res, next) => {
    try {
        const { query } = req.query;
        const suggestions = await tmdbService.getSearchSuggestions(query);
        res.json(suggestions);
    } catch (error) {
        next(error);
    }
};

export const proxy = async (req, res, next) => {
    try {
        const endpoint = req.path;
        const { data, fromCache } = await tmdbService.proxyRequest(endpoint, req.query);

        if (fromCache) {
            res.setHeader('X-Cache', 'HIT');
        } else {
            res.setHeader('X-Cache', 'MISS');
        }

        res.json(data);
    } catch (error) {
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            next(error);
        }
    }
};
