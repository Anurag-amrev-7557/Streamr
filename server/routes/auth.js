import express from 'express';
import { body, validationResult } from 'express-validator';
import passport from 'passport';
import User from '../models/User.js';
import { protect, sendTokenResponse, generateToken } from '../middleware/auth.js';

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
    async (req, res) => {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { name, email, password } = req.body;

        try {
            // Check if user exists
            let user = await User.findOne({ email });

            if (user) {
                return res.status(400).json({
                    success: false,
                    message: 'User already exists with this email'
                });
            }

            // Create user
            user = await User.create({
                name,
                email,
                password
            });

            // Send token response
            sendTokenResponse(user, 201, res);
        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error during registration'
            });
        }
    }
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
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        try {
            // Find user and explicitly select password field
            const user = await User.findOne({ email }).select('+password');

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // Check password
            const isPasswordMatch = await user.comparePassword(password);

            if (!isPasswordMatch) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // Send token response
            sendTokenResponse(user, 200, res);
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error during login'
            });
        }
    }
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

        // Set cookie
        // Cookie removed to prevent third-party cookie warnings
        // Token is passed via URL query parameter

        // Redirect to frontend
        const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${token}`;
        console.log('Redirecting to:', redirectUrl);
        res.redirect(redirectUrl);
    }
);

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            user: user.getPublicProfile()
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/auth/logout
// @desc    Logout user / clear cookie
// @access  Private
router.post('/logout', protect, (req, res) => {
    res.status(200).json({
        success: true,
        message: 'User logged out successfully'
    });
});

// @route   PUT /api/auth/mylist
// @desc    Update user's my list
// @access  Private
router.put('/mylist', protect, async (req, res) => {
    try {
        const { myList } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { myList },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            user: user.getPublicProfile()
        });
    } catch (error) {
        console.error('Update list error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/auth/mylist
// @desc    Get user's my list
// @access  Private
router.get('/mylist', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('myList');

        res.status(200).json({
            success: true,
            myList: user.myList || []
        });
    } catch (error) {
        console.error('Get list error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/auth/mylist/add
// @desc    Add item to user's my list
// @access  Private
router.post('/mylist/add', protect, async (req, res) => {
    try {
        const { item } = req.body;

        // Use atomic update to avoid VersionError
        // Only add if it doesn't exist (by checking id)
        const updatedUser = await User.findOneAndUpdate(
            { _id: req.user.id, 'myList.id': { $ne: item.id } },
            { $push: { myList: item } },
            { new: true }
        );

        if (updatedUser) {
            res.status(200).json({
                success: true,
                myList: updatedUser.myList
            });
        } else {
            // Item already exists or user not found
            // Fetch current list to return
            const user = await User.findById(req.user.id);
            res.status(200).json({
                success: true,
                myList: user ? user.myList : []
            });
        }
    } catch (error) {
        console.error('Add to list error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   DELETE /api/auth/mylist/:id
// @desc    Remove item from user's my list
// @access  Private
router.delete('/mylist/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const numericId = parseInt(id); // Ensure ID is a number for matching

        // Use atomic update to avoid VersionError
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $pull: { myList: { id: numericId } } },
            { new: true }
        );

        res.status(200).json({
            success: true,
            myList: user ? user.myList : []
        });
    } catch (error) {
        console.error('Remove from list error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   DELETE /api/auth/mylist/clear
// @desc    Clear user's my list
// @access  Private
router.delete('/mylist/clear', protect, async (req, res) => {
    try {
        // Use atomic update
        await User.findByIdAndUpdate(req.user.id, { $set: { myList: [] } });

        res.status(200).json({
            success: true,
            myList: []
        });
    } catch (error) {
        console.error('Clear list error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/auth/watch-history
// @desc    Get user's watch history
// @access  Private
router.get('/watch-history', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('watchHistory');

        res.status(200).json({
            success: true,
            watchHistory: user.watchHistory || []
        });
    } catch (error) {
        console.error('Get watch history error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   PUT /api/auth/watch-history
// @desc    Update user's watch history
// @access  Private
router.put('/watch-history', protect, async (req, res) => {
    try {
        const { watchHistory } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { watchHistory },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            watchHistory: user.watchHistory
        });
    } catch (error) {
        console.error('Update watch history error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/auth/watch-history/add
// @desc    Add item to user's watch history
// @access  Private
import cache from '../utils/cache.js';

// ... existing imports

// @route   POST /api/auth/watch-history/add
// @desc    Add item to user's watch history
// @access  Private
router.post('/watch-history/add', protect, async (req, res) => {
    try {
        const { item } = req.body;

        // Atomic update:
        // 1. Remove existing entry with same ID (if any)
        // 2. Push new entry to the beginning

        // We can't do both in one atomic op easily with $pull and $push at position 0
        // But we can do them sequentially. Even if race condition happens between them,
        // it's less likely to cause VersionError than save().

        await User.findByIdAndUpdate(
            req.user.id,
            { $pull: { watchHistory: { id: item.id } } }
        );

        const newItem = {
            ...item,
            lastWatched: new Date().toISOString()
        };

        const user = await User.findByIdAndUpdate(
            req.user.id,
            {
                $push: {
                    watchHistory: {
                        $each: [newItem],
                        $position: 0
                    }
                }
            },
            { new: true }
        );

        // Invalidate Home Recommendations Cache for this user
        const cacheKey = `rec_home_${req.user.id}`;
        cache.del(cacheKey);

        res.status(200).json({
            success: true,
            watchHistory: user ? user.watchHistory : []
        });
    } catch (error) {
        console.error('Add to watch history error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   DELETE /api/auth/watch-history/:id
// @desc    Remove item from user's watch history
// @access  Private
router.delete('/watch-history/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const numericId = parseInt(id);

        // Use atomic update
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $pull: { watchHistory: { id: numericId } } },
            { new: true }
        );

        res.status(200).json({
            success: true,
            watchHistory: user ? user.watchHistory : []
        });
    } catch (error) {
        console.error('Remove from watch history error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/auth/search-history
// @desc    Get user's search history
// @access  Private
router.get('/search-history', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('searchHistory');

        res.status(200).json({
            success: true,
            searchHistory: user.searchHistory || []
        });
    } catch (error) {
        console.error('Get search history error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/auth/search-history/add
// @desc    Add item to user's search history
// @access  Private
router.post('/search-history/add', protect, async (req, res) => {
    try {
        const { query } = req.body;

        // Atomic update:
        // 1. Remove existing entry with same query (case-insensitive is hard with simple pull, 
        //    but we can try to normalize or just pull exact match if we stored it normalized)
        //    The schema says query is String.
        //    The previous code did: item.query.toLowerCase() !== query.toLowerCase()
        //    MongoDB $pull with regex? No, $pull takes a condition.
        //    We can use $pull with query matching.

        // However, for search history, strict atomic consistency is less critical than list/watch history.
        // But to avoid VersionError, we should still use atomic ops.

        // Step 1: Pull if exists (simplification: exact match or just push new one and let client handle dedup? 
        // No, backend should handle it).
        // We will try to pull exact match for now.

        await User.findByIdAndUpdate(
            req.user.id,
            { $pull: { searchHistory: { query: query } } }
        );

        // Step 2: Push to front and slice
        const user = await User.findByIdAndUpdate(
            req.user.id,
            {
                $push: {
                    searchHistory: {
                        $each: [{ query, timestamp: new Date() }],
                        $position: 0,
                        $slice: 10 // Keep only last 10
                    }
                }
            },
            { new: true }
        );

        res.status(200).json({
            success: true,
            searchHistory: user ? user.searchHistory : []
        });
    } catch (error) {
        console.error('Add to search history error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   DELETE /api/auth/search-history/:query
// @desc    Remove item from user's search history
// @access  Private
router.delete('/search-history/:query', protect, async (req, res) => {
    try {
        const { query } = req.params;

        // Atomic update
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $pull: { searchHistory: { query: query } } },
            { new: true }
        );

        res.status(200).json({
            success: true,
            searchHistory: user ? user.searchHistory : []
        });
    } catch (error) {
        console.error('Remove from search history error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   DELETE /api/auth/search-history/clear
// @desc    Clear user's search history
// @access  Private
router.delete('/search-history/clear', protect, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, { $set: { searchHistory: [] } });

        res.status(200).json({
            success: true,
            searchHistory: []
        });
    } catch (error) {
        console.error('Clear search history error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

export default router;

