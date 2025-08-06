const mongoose = require('mongoose');

/**
 * Session management utilities for Streamr backend
 */

/**
 * Get session statistics
 * @returns {Promise<Object>} Session statistics
 */
async function getSessionStats() {
  try {
    const db = mongoose.connection.db;
    const sessionCollection = db.collection('sessions');
    
    const totalSessions = await sessionCollection.countDocuments();
    const activeSessions = await sessionCollection.countDocuments({
      expires: { $gt: new Date() }
    });
    const expiredSessions = await sessionCollection.countDocuments({
      expires: { $lte: new Date() }
    });

    return {
      total: totalSessions,
      active: activeSessions,
      expired: expiredSessions,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting session stats:', error);
    throw error;
  }
}

/**
 * Clean up expired sessions manually
 * @returns {Promise<number>} Number of sessions removed
 */
async function cleanupExpiredSessions() {
  try {
    const db = mongoose.connection.db;
    const sessionCollection = db.collection('sessions');
    
    const result = await sessionCollection.deleteMany({
      expires: { $lte: new Date() }
    });

    console.log(`Cleaned up ${result.deletedCount} expired sessions`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    throw error;
  }
}

/**
 * Get sessions for a specific user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} User sessions
 */
async function getUserSessions(userId) {
  try {
    const db = mongoose.connection.db;
    const sessionCollection = db.collection('sessions');
    
    const sessions = await sessionCollection.find({
      'session.userId': userId
    }).toArray();

    return sessions;
  } catch (error) {
    console.error('Error getting user sessions:', error);
    throw error;
  }
}

/**
 * Invalidate all sessions for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of sessions invalidated
 */
async function invalidateUserSessions(userId) {
  try {
    const db = mongoose.connection.db;
    const sessionCollection = db.collection('sessions');
    
    const result = await sessionCollection.deleteMany({
      'session.userId': userId
    });

    console.log(`Invalidated ${result.deletedCount} sessions for user ${userId}`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error invalidating user sessions:', error);
    throw error;
  }
}

module.exports = {
  getSessionStats,
  cleanupExpiredSessions,
  getUserSessions,
  invalidateUserSessions
}; 