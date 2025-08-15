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

module.exports = router; 