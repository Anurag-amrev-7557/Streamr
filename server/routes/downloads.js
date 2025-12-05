import express from 'express';
import * as downloadsController from '../controllers/downloadsController.js';

const router = express.Router();

// @route   GET /api/downloads/search
// @desc    Search for movies/series on hicine.info
// @access  Public
router.get('/search', downloadsController.searchDownloads);

// @route   GET /api/downloads/details
// @desc    Get download links (Not needed with new API, but kept for compatibility or future use)
// @access  Public
router.get('/details', downloadsController.getDownloadDetails);

export default router;
