import { scrapeHicineSearch } from '../utils/scraper.js';

export const searchDownloads = async (req, res, next) => {
    try {
        const { q, year, type, seasons } = req.query;
        console.log('[Downloads] Search Request:', { q, year, type, seasons });

        if (!q) {
            return res.status(400).json({ success: false, message: 'Query parameter "q" is required' });
        }

        const metadata = { year, type, seasons };
        const results = await scrapeHicineSearch(q, metadata);
        res.json({ success: true, count: results.length, data: results });
    } catch (error) {
        console.error('Search Route Error:', error);
        next(error);
    }
};

export const getDownloadDetails = async (req, res) => {
    // With the new API, search returns all details including links.
    // We can either deprecate this or use it to fetch by ID if we find that endpoint.
    // For now, we'll return a message.
    res.json({ success: true, message: 'Details are included in search results.' });
};
