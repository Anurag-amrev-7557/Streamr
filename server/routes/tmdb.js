import express from 'express';
import { protect, optionalProtect } from '../middleware/auth.js';
import * as tmdbController from '../controllers/tmdbController.js';

const router = express.Router();

// Recommendation Route - Must be before the proxy route
router.get('/recommendations', optionalProtect, tmdbController.getRecommendations);

// Item-Based Recommendation Route (for Modal)
router.get('/recommendations/:type/:id', optionalProtect, tmdbController.getItemRecommendations);

// Enhanced Multi-Search Endpoint with Fuzzy Search, Filters, and Pagination
router.get('/search/multi', tmdbController.multiSearch);

// Search Suggestions
router.get('/search/suggestions', tmdbController.getSearchSuggestions);

// Proxy all other requests to TMDB
router.get('/*', tmdbController.proxy);

export default router;
