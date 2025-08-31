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

// Watch History and Wishlist Routes
// @route   POST /api/user/watchlist
// @desc    Add content to watchlist
// @access  Private
router.post('/watchlist', rateLimiters.general, authenticate, userController.addToWatchlist);

// @route   DELETE /api/user/watchlist/:contentId
// @desc    Remove content from watchlist
// @access  Private
router.delete('/watchlist/:contentId', rateLimiters.general, authenticate, userController.removeFromWatchlist);

// @route   GET /api/user/watchlist
// @desc    Get user's watchlist
// @access  Private
router.get('/watchlist', rateLimiters.general, authenticate, userController.getWatchlist);

// @route   POST /api/user/watch-history
// @desc    Update watch history
// @access  Private
router.post('/watch-history', rateLimiters.general, authenticate, userController.updateWatchHistory);

// @route   GET /api/user/watch-history
// @desc    Get user's watch history
// @access  Private
router.get('/watch-history', rateLimiters.general, authenticate, userController.getWatchHistory);

// @route   DELETE /api/user/watch-history/:contentId
// @desc    Remove item from watch history
// @access  Private
router.delete('/watch-history/:contentId', rateLimiters.general, authenticate, userController.removeFromWatchHistory);

// @route   DELETE /api/user/watch-history
// @desc    Clear entire watch history
// @access  Private
router.delete('/watch-history', rateLimiters.general, authenticate, userController.clearWatchHistory);

// @route   GET /api/user/watch-stats
// @desc    Get user's watch statistics
// @access  Private
router.get('/watch-stats', rateLimiters.general, authenticate, userController.getWatchStats);

module.exports = router; 