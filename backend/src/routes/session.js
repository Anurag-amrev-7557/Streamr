const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const sessionUtils = require('../utils/sessionUtils');
const logger = require('winston');

/**
 * @route   GET /api/session/stats
 * @desc    Get session statistics (admin only)
 * @access  Private
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Check if user is admin (you can modify this logic based on your user roles)
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const stats = await sessionUtils.getSessionStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting session stats:', error);
    res.status(500).json({ error: 'Failed to get session statistics' });
  }
});

/**
 * @route   POST /api/session/cleanup
 * @desc    Clean up expired sessions (admin only)
 * @access  Private
 */
router.post('/cleanup', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const removedCount = await sessionUtils.cleanupExpiredSessions();
    res.json({
      success: true,
      message: `Cleaned up ${removedCount} expired sessions`,
      removedCount
    });
  } catch (error) {
    logger.error('Error cleaning up sessions:', error);
    res.status(500).json({ error: 'Failed to clean up sessions' });
  }
});

/**
 * @route   GET /api/session/user/:userId
 * @desc    Get sessions for a specific user (admin only)
 * @access  Private
 */
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const { userId } = req.params;
    const sessions = await sessionUtils.getUserSessions(userId);
    
    res.json({
      success: true,
      data: {
        userId,
        sessionCount: sessions.length,
        sessions
      }
    });
  } catch (error) {
    logger.error('Error getting user sessions:', error);
    res.status(500).json({ error: 'Failed to get user sessions' });
  }
});

/**
 * @route   DELETE /api/session/user/:userId
 * @desc    Invalidate all sessions for a user (admin only)
 * @access  Private
 */
router.delete('/user/:userId', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const { userId } = req.params;
    const invalidatedCount = await sessionUtils.invalidateUserSessions(userId);
    
    res.json({
      success: true,
      message: `Invalidated ${invalidatedCount} sessions for user ${userId}`,
      invalidatedCount
    });
  } catch (error) {
    logger.error('Error invalidating user sessions:', error);
    res.status(500).json({ error: 'Failed to invalidate user sessions' });
  }
});

/**
 * @route   GET /api/session/current
 * @desc    Get current session information
 * @access  Private
 */
router.get('/current', authenticate, (req, res) => {
  try {
    const sessionInfo = {
      sessionId: req.sessionID,
      userId: req.user._id,
      username: req.user.username,
      createdAt: req.session.cookie.expires,
      lastActivity: new Date().toISOString()
    };

    res.json({
      success: true,
      data: sessionInfo
    });
  } catch (error) {
    logger.error('Error getting current session:', error);
    res.status(500).json({ error: 'Failed to get current session' });
  }
});

module.exports = router; 