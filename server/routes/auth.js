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

// @route   POST /api/auth/profiles
// @desc    Create a new profile
// @access  Private
router.post('/profiles', protect, async (req, res) => {
    try {
        const { name, avatar } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Profile name is required'
            });
        }

        const user = await User.findById(req.user.id);

        if (user.profiles.length >= 5) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 5 profiles allowed'
            });
        }

        user.profiles.push({
            name,
            avatar: avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_150.png'
        });

        await user.save();

        res.status(201).json({
            success: true,
            profiles: user.profiles
        });
    } catch (error) {
        console.error('Create profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   PUT /api/auth/profiles/:id
// @desc    Update a profile
// @access  Private
router.put('/profiles/:id', protect, async (req, res) => {
    try {
        const { name, avatar } = req.body;
        const profileId = req.params.id;

        const user = await User.findById(req.user.id);
        const profile = user.profiles.id(profileId);

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        if (name) profile.name = name;
        if (avatar) profile.avatar = avatar;

        await user.save();

        res.status(200).json({
            success: true,
            profiles: user.profiles
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   DELETE /api/auth/profiles/:id
// @desc    Delete a profile
// @access  Private
router.delete('/profiles/:id', protect, async (req, res) => {
    try {
        const profileId = req.params.id;
        const user = await User.findById(req.user.id);

        if (user.profiles.length <= 1) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete the last profile'
            });
        }

        user.profiles.pull(profileId);
        await user.save();

        res.status(200).json({
            success: true,
            profiles: user.profiles
        });
    } catch (error) {
        console.error('Delete profile error:', error);
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
// @desc    Get user's my list (profile aware)
// @access  Private
router.get('/mylist', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const profileId = req.header('X-Profile-ID');

        // Find profile or default to first one
        const profile = user.profiles.id(profileId) || user.profiles[0];

        if (!profile) {
            // Should not happen if migration worked, but safety check
            return res.status(200).json({ success: true, myList: [] });
        }

        res.status(200).json({
            success: true,
            myList: profile.myList || []
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
// @desc    Add item to user's my list (profile aware)
// @access  Private
router.post('/mylist/add', protect, async (req, res) => {
    try {
        const { item } = req.body;
        const profileId = req.header('X-Profile-ID');

        const user = await User.findById(req.user.id);

        // Find profile or default to first one
        // We need the actual subdocument to modify it
        let profile = user.profiles.id(profileId);
        if (!profile && user.profiles.length > 0) {
            profile = user.profiles[0];
        }

        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }

        // Check if item already exists in this profile's list
        const exists = profile.myList.some(i => i.id === item.id);

        if (!exists) {
            profile.myList.push(item);
            await user.save();
        }

        res.status(200).json({
            success: true,
            myList: profile.myList
        });
    } catch (error) {
        console.error('Add to list error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   DELETE /api/auth/mylist/:id
// @desc    Remove item from user's my list (profile aware)
// @access  Private
router.delete('/mylist/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const numericId = parseInt(id);
        const profileId = req.header('X-Profile-ID');

        const user = await User.findById(req.user.id);

        let profile = user.profiles.id(profileId);
        if (!profile && user.profiles.length > 0) {
            profile = user.profiles[0];
        }

        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }

        // Filter out the item
        profile.myList = profile.myList.filter(item => item.id !== numericId);
        await user.save();

        res.status(200).json({
            success: true,
            myList: profile.myList
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
// @desc    Clear user's my list (profile aware)
// @access  Private
router.delete('/mylist/clear', protect, async (req, res) => {
    try {
        const profileId = req.header('X-Profile-ID');
        const user = await User.findById(req.user.id);

        let profile = user.profiles.id(profileId);
        if (!profile && user.profiles.length > 0) {
            profile = user.profiles[0];
        }

        if (profile) {
            profile.myList = [];
            await user.save();
        }

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
// @desc    Get user's watch history (profile aware)
// @access  Private
router.get('/watch-history', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const profileId = req.header('X-Profile-ID');

        const profile = user.profiles.id(profileId) || user.profiles[0];

        res.status(200).json({
            success: true,
            watchHistory: profile ? (profile.watchHistory || []) : []
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
// @desc    Add item to user's watch history (profile aware)
// @access  Private
router.post('/watch-history/add', protect, async (req, res) => {
    try {
        const { item } = req.body;
        const profileId = req.header('X-Profile-ID');

        const user = await User.findById(req.user.id);

        let profile = user.profiles.id(profileId);
        if (!profile && user.profiles.length > 0) {
            profile = user.profiles[0];
        }

        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }

        // Remove existing entry with same ID
        profile.watchHistory = profile.watchHistory.filter(i => i.id !== item.id);

        const newItem = {
            ...item,
            lastWatched: new Date().toISOString()
        };

        // Add to beginning
        profile.watchHistory.unshift(newItem);

        await user.save();

        // Invalidate Home Recommendations Cache for this user
        const cacheKey = `rec_home_${req.user.id}`;
        cache.del(cacheKey);

        res.status(200).json({
            success: true,
            watchHistory: profile.watchHistory
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
// @desc    Remove item from user's watch history (profile aware)
// @access  Private
router.delete('/watch-history/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const numericId = parseInt(id);
        const profileId = req.header('X-Profile-ID');

        const user = await User.findById(req.user.id);

        let profile = user.profiles.id(profileId);
        if (!profile && user.profiles.length > 0) {
            profile = user.profiles[0];
        }

        if (profile) {
            profile.watchHistory = profile.watchHistory.filter(item => item.id !== numericId);
            await user.save();
        }

        res.status(200).json({
            success: true,
            watchHistory: profile ? profile.watchHistory : []
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
// @desc    Get user's search history (profile aware)
// @access  Private
router.get('/search-history', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const profileId = req.header('X-Profile-ID');

        const profile = user.profiles.id(profileId) || user.profiles[0];

        res.status(200).json({
            success: true,
            searchHistory: profile ? (profile.searchHistory || []) : []
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
// @desc    Add item to user's search history (profile aware)
// @access  Private
router.post('/search-history/add', protect, async (req, res) => {
    try {
        const { query } = req.body;
        const profileId = req.header('X-Profile-ID');

        const user = await User.findById(req.user.id);

        let profile = user.profiles.id(profileId);
        if (!profile && user.profiles.length > 0) {
            profile = user.profiles[0];
        }

        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }

        // Remove existing entry with same query
        profile.searchHistory = profile.searchHistory.filter(i => i.query !== query);

        // Add to beginning and limit to 10
        profile.searchHistory.unshift({ query, timestamp: new Date() });
        if (profile.searchHistory.length > 10) {
            profile.searchHistory = profile.searchHistory.slice(0, 10);
        }

        await user.save();

        res.status(200).json({
            success: true,
            searchHistory: profile.searchHistory
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
// @desc    Remove item from user's search history (profile aware)
// @access  Private
router.delete('/search-history/:query', protect, async (req, res) => {
    try {
        const { query } = req.params;
        const profileId = req.header('X-Profile-ID');

        const user = await User.findById(req.user.id);

        let profile = user.profiles.id(profileId);
        if (!profile && user.profiles.length > 0) {
            profile = user.profiles[0];
        }

        if (profile) {
            profile.searchHistory = profile.searchHistory.filter(item => item.query !== query);
            await user.save();
        }

        res.status(200).json({
            success: true,
            searchHistory: profile ? profile.searchHistory : []
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
// @desc    Clear user's search history (profile aware)
// @access  Private
router.delete('/search-history/clear', protect, async (req, res) => {
    try {
        const profileId = req.header('X-Profile-ID');
        const user = await User.findById(req.user.id);

        let profile = user.profiles.id(profileId);
        if (!profile && user.profiles.length > 0) {
            profile = user.profiles[0];
        }

        if (profile) {
            profile.searchHistory = [];
            await user.save();
        }

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

