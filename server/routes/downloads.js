import express from 'express';
import { scrapeHicineSearch } from '../utils/scraper.js';

const router = express.Router();

// @route   GET /api/downloads/search
// @desc    Search for movies/series on hicine.info
// @access  Public
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ success: false, message: 'Query parameter "q" is required' });
        }

        const results = await scrapeHicineSearch(q);
        res.json({ success: true, count: results.length, data: results });
    } catch (error) {
        console.error('Search Route Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch search results', error: error.message });
    }
});

// @route   GET /api/downloads/details
// @desc    Get download links (Not needed with new API, but kept for compatibility or future use)
// @access  Public
router.get('/details', async (req, res) => {
    // With the new API, search returns all details including links.
    // We can either deprecate this or use it to fetch by ID if we find that endpoint.
    // For now, we'll return a message.
    res.json({ success: true, message: 'Details are included in search results.' });
});

export default router;
