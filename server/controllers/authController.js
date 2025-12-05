import User from '../models/User.js';
import { sendTokenResponse } from '../middleware/auth.js';
import asyncHandler from '../middleware/async.js';
import { validationResult } from 'express-validator';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
        return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Create user
    const user = await User.create({
        name,
        email,
        password
    });

    sendTokenResponse(user, 201, res);
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    sendTokenResponse(user, 200, res);
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    res.status(200).json({
        success: true,
        user: user.getPublicProfile()
    });
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res, next) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        message: 'User logged out successfully'
    });
});

// @desc    Update user's my list
// @route   PUT /api/auth/mylist
// @access  Private
export const updateMyList = asyncHandler(async (req, res, next) => {
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
});

// @desc    Get user's my list
// @route   GET /api/auth/mylist
// @access  Private
export const getMyList = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('myList');

    res.status(200).json({
        success: true,
        myList: user.myList || []
    });
});

// @desc    Add item to user's my list
// @route   POST /api/auth/mylist/add
// @access  Private
export const addToMyList = asyncHandler(async (req, res, next) => {
    const { item } = req.body;

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
        const user = await User.findById(req.user.id);
        res.status(200).json({
            success: true,
            myList: user ? user.myList : []
        });
    }
});

// @desc    Remove item from user's my list
// @route   DELETE /api/auth/mylist/:id
// @access  Private
export const removeFromMyList = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const numericId = parseInt(id);

    const user = await User.findByIdAndUpdate(
        req.user.id,
        { $pull: { myList: { id: numericId } } },
        { new: true }
    );

    res.status(200).json({
        success: true,
        myList: user ? user.myList : []
    });
});

// @desc    Clear user's my list
// @route   DELETE /api/auth/mylist/clear
// @access  Private
export const clearMyList = asyncHandler(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { $set: { myList: [] } });

    res.status(200).json({
        success: true,
        myList: []
    });
});

// @desc    Get user's watch history
// @route   GET /api/auth/watch-history
// @access  Private
export const getWatchHistory = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('watchHistory');

    res.status(200).json({
        success: true,
        watchHistory: user.watchHistory || []
    });
});

// @desc    Update user's watch history
// @route   PUT /api/auth/watch-history
// @access  Private
export const updateWatchHistory = asyncHandler(async (req, res, next) => {
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
});

// @desc    Add item to user's watch history
// @route   POST /api/auth/watch-history/add
// @access  Private
import cache from '../utils/cache.js';

export const addToWatchHistory = asyncHandler(async (req, res, next) => {
    const { item } = req.body;

    // Remove existing entry if present
    await User.findByIdAndUpdate(
        req.user.id,
        { $pull: { watchHistory: { id: item.id } } }
    );

    // Construct new item with all metadata
    const newItem = {
        id: item.id,
        title: item.title || item.name,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        media_type: item.media_type || (item.first_air_date ? 'tv' : 'movie'),
        season: item.season,
        episode: item.episode,
        episodeTitle: item.episodeTitle,
        duration: item.duration,
        progress: item.progress,
        lastWatched: item.lastWatched || new Date().toISOString()
    };

    const user = await User.findByIdAndUpdate(
        req.user.id,
        {
            $push: {
                watchHistory: {
                    $each: [newItem],
                    $position: 0,
                    $slice: 100 // Limit history to 100 items
                }
            }
        },
        { new: true }
    );

    // Invalidate Home Recommendations Cache for this user
    const cacheKey = `rec_home_v3_${req.user.id}`;
    cache.del(cacheKey);

    res.status(200).json({
        success: true,
        watchHistory: user ? user.watchHistory : []
    });
});

// @desc    Remove item from user's watch history
// @route   DELETE /api/auth/watch-history/:id
// @access  Private
export const removeFromWatchHistory = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const numericId = parseInt(id);

    const user = await User.findByIdAndUpdate(
        req.user.id,
        { $pull: { watchHistory: { id: numericId } } },
        { new: true }
    );

    res.status(200).json({
        success: true,
        watchHistory: user ? user.watchHistory : []
    });
});

// @desc    Update user's search history (full sync)
// @route   PUT /api/auth/search-history
// @access  Private
export const updateSearchHistory = asyncHandler(async (req, res, next) => {
    const { searchHistory } = req.body;

    // Validate and limit to 10 items
    const validHistory = (searchHistory || [])
        .filter(item => item && typeof item.query === 'string' && item.query.trim())
        .slice(0, 10)
        .map(item => ({
            query: item.query.trim(),
            timestamp: item.timestamp ? new Date(item.timestamp) : new Date()
        }));

    const user = await User.findByIdAndUpdate(
        req.user.id,
        { searchHistory: validHistory },
        { new: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        searchHistory: user.searchHistory
    });
});

// @desc    Get user's search history
// @route   GET /api/auth/search-history
// @access  Private
export const getSearchHistory = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('searchHistory');

    res.status(200).json({
        success: true,
        searchHistory: user.searchHistory || []
    });
});

// @desc    Add item to user's search history
// @route   POST /api/auth/search-history/add
// @access  Private
export const addToSearchHistory = asyncHandler(async (req, res, next) => {
    const { query } = req.body;

    await User.findByIdAndUpdate(
        req.user.id,
        { $pull: { searchHistory: { query: query } } }
    );

    const user = await User.findByIdAndUpdate(
        req.user.id,
        {
            $push: {
                searchHistory: {
                    $each: [{ query, timestamp: new Date() }],
                    $position: 0,
                    $slice: 10
                }
            }
        },
        { new: true }
    );

    res.status(200).json({
        success: true,
        searchHistory: user ? user.searchHistory : []
    });
});

// @desc    Remove item from user's search history
// @route   DELETE /api/auth/search-history/:query
// @access  Private
export const removeFromSearchHistory = asyncHandler(async (req, res, next) => {
    const { query } = req.params;

    const user = await User.findByIdAndUpdate(
        req.user.id,
        { $pull: { searchHistory: { query: query } } },
        { new: true }
    );

    res.status(200).json({
        success: true,
        searchHistory: user ? user.searchHistory : []
    });
});

// @desc    Clear user's search history
// @route   DELETE /api/auth/search-history/clear
// @access  Private
export const clearSearchHistory = asyncHandler(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { $set: { searchHistory: [] } });

    res.status(200).json({
        success: true,
        searchHistory: []
    });
});
