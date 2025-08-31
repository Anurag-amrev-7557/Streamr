const jwt = require('jsonwebtoken');

// Generate access token (short-lived)
const signAccessToken = (payload) => {
  return jwt.sign({ userId: payload.id }, process.env.JWT_SECRET, {
    expiresIn: '15m' // 15 minutes
  });
};

// Generate refresh token (long-lived)
const signRefreshToken = (payload) => {
  return jwt.sign({ userId: payload.id }, process.env.JWT_SECRET, {
    expiresIn: '7d' // 7 days
  });
};

// Verify access token
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token has expired');
    }
    throw new Error('Invalid access token');
  }
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token has expired');
    }
    throw new Error('Invalid refresh token');
  }
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
}; 