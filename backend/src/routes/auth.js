const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');
const authValidation = require('../middleware/validation');
const { rateLimiters } = require('../middleware/rateLimit');

// Local auth
router.post('/register', rateLimiters.auth, authValidation.signup, authController.register);
router.post('/login', rateLimiters.auth, authValidation.login, authController.login);
router.post('/logout', rateLimiters.auth, authController.logout);
router.post('/refresh-token', rateLimiters.auth, authController.refreshToken);

// Password reset
router.post('/forgot-password', rateLimiters.auth, authValidation.forgotPassword, authController.forgotPassword);
router.post('/reset-password', rateLimiters.auth, authValidation.resetPassword, authController.resetPassword);

// Email verification
router.get('/verify-email/:token', rateLimiters.auth, authController.verifyEmail);
router.post('/resend-verification', rateLimiters.auth, authValidation.forgotPassword, authController.resendVerification);

// Google OAuth
router.get('/google', rateLimiters.auth, passport.authenticate('google', { 
  scope: ['profile', 'email'],
  session: false 
}));
router.post('/google', rateLimiters.auth, authController.googleAuth);
router.get('/google/callback',
  rateLimiters.auth, passport.authenticate('google', { session: false }),
  authController.oauthCallback
);

// GitHub OAuth
router.get('/github', rateLimiters.auth, passport.authenticate('github', { 
  scope: ['user:email'],
  session: false 
}));
router.post('/github', rateLimiters.auth, authController.githubAuth);
router.get('/github/callback',
  rateLimiters.auth, passport.authenticate('github', { session: false }),
  authController.oauthCallback
);

module.exports = router; 