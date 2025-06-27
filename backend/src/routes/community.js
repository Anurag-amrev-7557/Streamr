const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const CommunityController = require('../controllers/communityController');

// Public routes (with optional authentication)
router.get('/discussions', optionalAuth, CommunityController.getDiscussions);
router.get('/discussions/:id', optionalAuth, CommunityController.getDiscussionById);
router.get('/trending', optionalAuth, CommunityController.getTrendingTopics);
router.get('/stats', optionalAuth, CommunityController.getCommunityStats);
router.get('/search', optionalAuth, CommunityController.searchDiscussions);
router.get('/categories', optionalAuth, CommunityController.getCategories);
router.get('/tags', optionalAuth, CommunityController.getTopTags);

// Protected routes (require authentication)
router.post('/discussions', authenticate, CommunityController.createDiscussion);
router.put('/discussions/:id', authenticate, CommunityController.updateDiscussion);
router.delete('/discussions/:id', authenticate, CommunityController.deleteDiscussion);
router.post('/discussions/:id/replies', authenticate, CommunityController.addReply);
router.put('/discussions/:id/replies/:replyId', authenticate, CommunityController.updateReply);
router.delete('/discussions/:id/replies/:replyId', authenticate, CommunityController.deleteReply);
router.post('/discussions/:id/like', authenticate, CommunityController.likeDiscussion);
router.post('/discussions/:id/replies/:replyId/like', authenticate, CommunityController.likeReply);

module.exports = router; 