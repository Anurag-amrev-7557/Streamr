const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { rateLimiters } = require('../middleware/rateLimit');

// @route   GET /api/user/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', rateLimiters.general, authenticate, userController.getProfile);

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', rateLimiters.general, authenticate, userController.updateProfile);

// @route   POST /api/user/profile/picture
// @desc    Upload profile picture
// @access  Private
router.post('/profile/picture', rateLimiters.general, authenticate, upload.single('avatar'), userController.uploadProfilePicture);

// @route   PUT /api/user/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', rateLimiters.general, authenticate, userController.updatePreferences);

// Watchlist Routes
// @route   GET /api/user/watchlist
// @desc    Get user's watchlist
// @access  Private
router.get('/watchlist', rateLimiters.general, authenticate, userController.getWatchlist);

// @route   POST /api/user/watchlist/sync
// @desc    Sync entire watchlist from frontend
// @access  Private
router.post('/watchlist/sync', rateLimiters.general, authenticate, userController.syncWatchlist);

// @route   POST /api/user/watchlist
// @desc    Add item to watchlist
// @access  Private
router.post('/watchlist', rateLimiters.general, authenticate, userController.addToWatchlist);

// @route   DELETE /api/user/watchlist/:movieId
// @desc    Remove item from watchlist
// @access  Private
router.delete('/watchlist/:movieId', rateLimiters.general, authenticate, userController.removeFromWatchlist);

// @route   DELETE /api/user/watchlist
// @desc    Clear entire watchlist
// @access  Private
router.delete('/watchlist', rateLimiters.general, authenticate, userController.clearWatchlist);

// Viewing Progress Routes
// @route   GET /api/user/viewing-progress
// @desc    Get user's viewing progress
// @access  Private
router.get('/viewing-progress', rateLimiters.general, authenticate, userController.getViewingProgress);

// @route   POST /api/user/viewing-progress/sync
// @desc    Sync entire viewing progress from frontend
// @access  Private
router.post('/viewing-progress/sync', rateLimiters.general, authenticate, userController.syncViewingProgress);

// @route   PUT /api/user/viewing-progress
// @desc    Update viewing progress for a specific item
// @access  Private
router.put('/viewing-progress', rateLimiters.general, authenticate, userController.updateViewingProgress);

// @route   DELETE /api/user/viewing-progress
// @desc    Clear entire viewing progress
// @access  Private
router.delete('/viewing-progress', rateLimiters.general, authenticate, userController.clearViewingProgress);

// 2FA Routes
// @route   POST /api/user/2fa/setup
// @desc    Setup 2FA - generate secret and QR code
// @access  Private
router.post('/2fa/setup', rateLimiters.general, authenticate, userController.setup2FA);

// @route   POST /api/user/2fa/verify
// @desc    Verify 2FA setup with TOTP code
// @access  Private
router.post('/2fa/verify', rateLimiters.general, authenticate, userController.verify2FA);

// @route   POST /api/user/2fa/disable
// @desc    Disable 2FA with verification
// @access  Private
router.post('/2fa/disable', rateLimiters.general, authenticate, userController.disable2FA);

// @route   GET /api/user/2fa/backup-codes
// @desc    Get backup codes
// @access  Private
router.get('/2fa/backup-codes', rateLimiters.general, authenticate, userController.getBackupCodes);

// @route   POST /api/user/2fa/backup-codes/regenerate
// @desc    Regenerate backup codes
// @access  Private
router.post('/2fa/backup-codes/regenerate', rateLimiters.general, authenticate, userController.regenerateBackupCodes);

// @route   POST /api/user/2fa/backup-codes/verify
// @desc    Verify backup code
// @access  Private
router.post('/2fa/backup-codes/verify', rateLimiters.general, authenticate, userController.verifyBackupCode);

module.exports = router; 