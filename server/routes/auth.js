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
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

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
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 1 * 1000),
        httpOnly: true
    });

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

export default router;
