const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware for optional authentication (public routes)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (user) {
      req.user = user;
    }
    next();
  } catch (error) {
    next();
  }
};

// Middleware for required authentication (protected routes)
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Auth: No Authorization header or invalid format');
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log('❌ Auth: No token found in Authorization header');
      return res.status(401).json({ message: 'Authentication required' });
    }

    console.log('🔍 Auth: Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Auth: Token verified, payload:', { id: decoded.id, exp: decoded.exp });
    
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      console.log('❌ Auth: User not found for ID:', decoded.id);
      return res.status(401).json({ message: 'User not found' });
    }

    console.log('✅ Auth: User authenticated:', user._id);
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = {
  optionalAuth,
  authenticate
}; 