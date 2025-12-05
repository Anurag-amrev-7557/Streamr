import express from 'express';
import { body } from 'express-validator';
import passport from 'passport';
import { protect, generateToken } from '../middleware/auth.js';
import {
    register,
    login,
    getMe,
    logout,
    updateMyList,
    getMyList,
    addToMyList,
    removeFromMyList,
    clearMyList,
    getWatchHistory,
    updateWatchHistory,
    addToWatchHistory,
    removeFromWatchHistory,
    getSearchHistory,
    updateSearchHistory,
    addToSearchHistory,
    removeFromSearchHistory,
    clearSearchHistory
} from '../controllers/authController.js';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register user with email & password
// @access  Public
router.post(
    '/register',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters')
    ],
    register
);

// @route   POST /api/auth/login
// @desc    Login user with email & password
// @access  Public
router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    login
);

// @route   GET /api/auth/google
// @desc    Initiate Google OAuth
// @access  Public
router.get(
    '/google',
    passport.authenticate('google', {
        scope: ['profile', 'email']
    })
);

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get(
    '/google/callback',
    passport.authenticate('google', {
        failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`,
        session: false
    }),
    (req, res) => {
        const token = generateToken(req.user._id);

        const options = {
            expires: new Date(Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        };

        res.cookie('token', token, options);

        const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback`;
        res.redirect(redirectUrl);
    }
);

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, getMe);

// @route   POST /api/auth/logout
// @desc    Logout user / clear cookie
// @access  Private
router.post('/logout', protect, logout);

// @route   PUT /api/auth/mylist
// @desc    Update user's my list
// @access  Private
router.put('/mylist', protect, updateMyList);

// @route   GET /api/auth/mylist
// @desc    Get user's my list
// @access  Private
router.get('/mylist', protect, getMyList);

// @route   POST /api/auth/mylist/add
// @desc    Add item to user's my list
// @access  Private
router.post('/mylist/add', protect, addToMyList);

// @route   DELETE /api/auth/mylist/clear
// @desc    Clear user's my list
// @access  Private
router.delete('/mylist/clear', protect, clearMyList);

// @route   DELETE /api/auth/mylist/:id
// @desc    Remove item from user's my list
// @access  Private
router.delete('/mylist/:id', protect, removeFromMyList);

// @route   GET /api/auth/watch-history
// @desc    Get user's watch history
// @access  Private
router.get('/watch-history', protect, getWatchHistory);

// @route   PUT /api/auth/watch-history
// @desc    Update user's watch history
// @access  Private
router.put('/watch-history', protect, updateWatchHistory);

// @route   POST /api/auth/watch-history/add
// @desc    Add item to user's watch history
// @access  Private
router.post('/watch-history/add', protect, addToWatchHistory);

// @route   DELETE /api/auth/watch-history/:id
// @desc    Remove item from user's watch history
// @access  Private
router.delete('/watch-history/:id', protect, removeFromWatchHistory);

// @route   GET /api/auth/search-history
// @desc    Get user's search history
// @access  Private
router.get('/search-history', protect, getSearchHistory);

// @route   PUT /api/auth/search-history
// @desc    Update user's search history (full sync)
// @access  Private
router.put('/search-history', protect, updateSearchHistory);

// @route   POST /api/auth/search-history/add
// @desc    Add item to user's search history
// @access  Private
router.post('/search-history/add', protect, addToSearchHistory);

// @route   DELETE /api/auth/search-history/:query
// @desc    Remove item from user's search history
// @access  Private
router.delete('/search-history/:query', protect, removeFromSearchHistory);

// @route   DELETE /api/auth/search-history/clear
// @desc    Clear user's search history
// @access  Private
router.delete('/search-history/clear', protect, clearSearchHistory);

export default router;

