const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');
const authValidation = require('../middleware/validation');

// Local auth
router.post('/register', authValidation.signup, authController.register);
router.post('/login', authValidation.login, authController.login);
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);

// Password reset
router.post('/forgot-password', authValidation.forgotPassword, authController.forgotPassword);
router.post('/reset-password', authValidation.resetPassword, authController.resetPassword);

// Email verification
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', authValidation.forgotPassword, authController.resendVerification);

// Google OAuth
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  session: false 
}));
router.post('/google', authController.googleAuth);
router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  authController.oauthCallback
);

// GitHub OAuth
router.get('/github', passport.authenticate('github', { 
  scope: ['user:email'],
  session: false 
}));
router.post('/github', authController.githubAuth);
router.get('/github/callback',
  passport.authenticate('github', { session: false }),
  authController.oauthCallback
);

module.exports = router; 