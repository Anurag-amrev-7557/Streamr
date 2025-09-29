const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const CommunityController = require('../controllers/communityController');
const { rateLimiters } = require('../middleware/rateLimit');

// Public routes (with optional authentication) - use communityRead for generous limits
router.get('/discussions', rateLimiters.communityRead, optionalAuth, CommunityController.getDiscussions);
router.get('/discussions/:id', rateLimiters.communityRead, optionalAuth, CommunityController.getDiscussionById);
router.get('/trending', rateLimiters.communityRead, optionalAuth, CommunityController.getTrendingTopics);
router.get('/stats', rateLimiters.communityRead, optionalAuth, CommunityController.getCommunityStats);
router.get('/search', rateLimiters.communityRead, optionalAuth, CommunityController.searchDiscussions);
router.get('/categories', rateLimiters.communityRead, optionalAuth, CommunityController.getCategories);
router.get('/tags', rateLimiters.communityRead, optionalAuth, CommunityController.getTopTags);

// Protected routes (require authentication) - use communityWrite for write operations
router.post('/discussions', rateLimiters.communityWrite, authenticate, CommunityController.createDiscussion);
router.put('/discussions/:id', rateLimiters.communityWrite, authenticate, CommunityController.updateDiscussion);
router.delete('/discussions/:id', rateLimiters.communityWrite, authenticate, CommunityController.deleteDiscussion);
router.post('/discussions/:id/replies', rateLimiters.communityWrite, authenticate, CommunityController.addReply);
router.put('/discussions/:id/replies/:replyId', rateLimiters.communityWrite, authenticate, CommunityController.updateReply);
router.delete('/discussions/:id/replies/:replyId', rateLimiters.communityWrite, authenticate, CommunityController.deleteReply);
router.post('/discussions/:id/like', rateLimiters.communityWrite, authenticate, CommunityController.likeDiscussion);
router.post('/discussions/:id/replies/:replyId/like', rateLimiters.communityWrite, authenticate, CommunityController.likeReply);

module.exports = router; 