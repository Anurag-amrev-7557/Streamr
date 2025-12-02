import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies
    else if (req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        // Development Bypass
        if (process.env.NODE_ENV === 'development') {
            try {
                const devUser = await User.findOne();
                if (devUser) {
                    req.user = devUser;
                    return next();
                }
            } catch (error) {
                console.error('Dev auth bypass failed:', error);
            }
        }

        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        next();
    } catch (error) { // eslint-disable-line no-unused-vars
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }
};

// Generate JWT Token
export const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });
};

// Send token response
export const sendTokenResponse = (user, statusCode, res) => {
    const token = generateToken(user._id);

    const options = {
        expires: new Date(Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    };

    res
        .status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            token,
            user: user.getPublicProfile()
        });
};

// Optional Auth Middleware - Doesn't block if no token, just sets req.user to null
export const optionalProtect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        next();
    } catch (error) { // eslint-disable-line no-unused-vars
        // If token is invalid, just proceed as guest
        req.user = null;
        next();
    }
};
