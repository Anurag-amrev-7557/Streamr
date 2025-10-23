const Discussion = require('../models/Discussion');
const Reply = require('../models/Reply');
const User = require('../models/User');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 60 });

// Helper: standardized error responder
function respondError(res, message, error, status = 500) {
  const payload = { message };
  if (error && process.env.NODE_ENV === 'development') {
    payload.error = error.message || error;
    payload.stack = error.stack;
  }
  return res.status(status).json(payload);
}

// Helper: invalidate cache keys that include a substring (simple wildcard)
function invalidateCache(substring) {
  try {
    const keys = cache.keys();
    const toDelete = keys.filter(k => k.includes(substring));
    if (toDelete.length) cache.del(toDelete);
  } catch (e) {
    // non-fatal
    console.error('Cache invalidation error:', e);
  }
}

const CommunityController = {
  // Get all discussions with pagination and sorting
  async getDiscussions(req, res) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10)); // cap to 50
      const sort = req.query.sort || 'newest';
      const category = req.query.category;
      const tag = req.query.tag;

      // Create a cache key based on query params and user id
      const cacheKey = `discussions:${page}:${limit}:${sort}:${category || ''}:${tag || ''}:${req.user ? req.user.id : 'guest'}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const skip = (page - 1) * limit;

      // Build basic query safely
      const query = {};
      if (category && typeof category === 'string') query.category = category;
      if (tag && typeof tag === 'string') query.tags = tag;

      // Prepare find and count in parallel (lean to reduce memory)
      const findQuery = Discussion.find(query)
        .select('title content author category tags likes views replies createdAt updatedAt isPinned isLocked lastActivity')
        .skip(skip)
        .limit(limit)
        .lean();

      // Apply sorting
      switch (sort) {
        case 'newest':
          findQuery.sort({ createdAt: -1 });
          break;
        case 'oldest':
          findQuery.sort({ createdAt: 1 });
          break;
        case 'popular':
          findQuery.sort({ likes: -1, views: -1 });
          break;
        case 'trending':
          // trending is heavier; compute engagement in aggregation fallback
          // For simplicity, sort by replies length and views
          findQuery.sort({ 'replies.length': -1, views: -1 });
          break;
        default:
          findQuery.sort({ createdAt: -1 });
      }

      const [discussions, total] = await Promise.all([
        findQuery.populate('author', 'username avatar profilePicture').populate({ path: 'replies', select: 'content author createdAt updatedAt likes' }),
        Discussion.countDocuments(query)
      ]);

      // Add user's like status if authenticated
      const userId = req.user ? req.user.id : null;
      const formattedDiscussions = discussions.map(discussion => {
        const isLiked = userId ? (Array.isArray(discussion.likes) && discussion.likes.includes(userId)) : false;
        return {
          id: discussion._id,
          title: discussion.title,
          content: discussion.content,
          author: discussion.author,
          category: discussion.category,
          tags: discussion.tags,
          likes: Array.isArray(discussion.likes) ? discussion.likes.length : 0,
          isLiked,
          views: discussion.views || 0,
          replies: Array.isArray(discussion.replies) ? discussion.replies.map(reply => ({
            id: reply._id,
            content: reply.content,
            author: reply.author,
            createdAt: reply.createdAt,
            updatedAt: reply.updatedAt,
            likes: Array.isArray(reply.likes) ? reply.likes.length : 0,
            isLiked: userId ? (Array.isArray(reply.likes) && reply.likes.includes(userId)) : false
          })) : [],
          createdAt: discussion.createdAt,
          updatedAt: discussion.updatedAt,
          isPinned: discussion.isPinned,
          isLocked: discussion.isLocked,
          lastActivity: discussion.lastActivity
        };
      });

      const response = {
        discussions: formattedDiscussions,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalDiscussions: total
      };

      cache.set(cacheKey, response);
      return res.json(response);
    } catch (error) {
      return respondError(res, 'Error fetching discussions', error);
    }
  },

  // Get discussion by ID
  async getDiscussionById(req, res) {
    try {
      const discussion = await Discussion.findById(req.params.id)
        .select('title content author category tags likes views replies createdAt updatedAt isPinned isLocked lastActivity viewedBy')
        .populate('author', 'username avatar profilePicture')
        .populate({
          path: 'replies',
          select: 'content author createdAt updatedAt likes',
          populate: {
            path: 'author',
            select: 'username avatar profilePicture'
          }
        })
        .lean();

      if (!discussion) return res.status(404).json({ message: 'Discussion not found' });

      // Only increment views if the user hasn't viewed this discussion in the last 24 hours
      if (req.user) {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const lastViewed = Array.isArray(discussion.viewedBy) ? discussion.viewedBy.find(v => v.user.toString() === req.user._id.toString()) : null;
        if (!lastViewed || new Date(lastViewed.lastViewed) < oneDayAgo) {
          // Atomically update: if user entry exists update lastViewed, else push new entry; increment views
          const updateOps = lastViewed
            ? { $set: { 'viewedBy.$[elem].lastViewed': now }, $inc: { views: 1 } }
            : { $push: { viewedBy: { user: req.user._id, lastViewed: now } }, $inc: { views: 1 } };
          const options = lastViewed ? { arrayFilters: [{ 'elem.user': req.user._id }], new: true } : { new: true };
          try {
            await Discussion.findByIdAndUpdate(discussion._id, updateOps, options).exec();
            // Invalidate relevant caches
            invalidateCache('discussions:');
            invalidateCache('communityStats');
          } catch (e) {
            // Non-fatal; continue
            console.error('Failed to update view record:', e);
          }
        }
      }

      // Add user's like status if authenticated
      const userId = req.user ? req.user.id : null;
      const isLiked = userId ? (Array.isArray(discussion.likes) && discussion.likes.includes(userId)) : false;
      const formattedDiscussion = {
        id: discussion._id,
        title: discussion.title,
        content: discussion.content,
        author: discussion.author,
        category: discussion.category,
        tags: discussion.tags,
        likes: Array.isArray(discussion.likes) ? discussion.likes.length : 0,
        isLiked,
        views: discussion.views || 0,
        replies: Array.isArray(discussion.replies) ? discussion.replies.map(reply => ({
          id: reply._id,
          content: reply.content,
          author: reply.author,
          createdAt: reply.createdAt,
          updatedAt: reply.updatedAt,
          likes: Array.isArray(reply.likes) ? reply.likes.length : 0,
          isLiked: userId ? (Array.isArray(reply.likes) && reply.likes.includes(userId)) : false
        })) : [],
        createdAt: discussion.createdAt,
        updatedAt: discussion.updatedAt,
        isPinned: discussion.isPinned,
        isLocked: discussion.isLocked,
        lastActivity: discussion.lastActivity
      };

      return res.json(formattedDiscussion);
    } catch (error) {
      console.error('Error fetching discussion:', error);
      return respondError(res, 'Error fetching discussion', error);
    }
  },

  // Get trending topics
  async getTrendingTopics(req, res) {
    try {
      const topics = await Discussion.aggregate([
        {
          $lookup: {
            from: 'replies',
            localField: '_id',
            foreignField: 'discussion',
            as: 'replies'
          }
        },
        {
          $addFields: {
            engagement: {
              $add: [
                { $size: '$replies' },
                { $size: '$likes' },
                { $multiply: ['$views', 0.1] }
              ]
            }
          }
        },
        {
          $sort: { engagement: -1 }
        },
        {
          $limit: 10
        },
        {
          $project: {
            title: 1,
            engagement: 1,
            createdAt: 1,
            likes: 1,
            views: 1,
            replies: 1
          }
        }
      ]);

      // Add user's like status if authenticated
      if (req.user) {
        topics.forEach(topic => { topic.isLiked = Array.isArray(topic.likes) && topic.likes.includes(req.user.id); });
      }

      return res.json(topics);
    } catch (error) {
      return respondError(res, 'Error fetching trending topics', error);
    }
  },

  // Get community stats
  async getCommunityStats(req, res) {
    try {
      const cacheKey = 'communityStats';
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      const [totalUsers, totalDiscussions, totalReplies, activeUsers] = await Promise.all([
        User.countDocuments(),
        Discussion.countDocuments(),
        Reply.countDocuments({ parentReplyId: { $exists: false } }),
        User.countDocuments({ lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
      ]);

      // Get top categories
      const topCategories = await Discussion.aggregate([
        { $unwind: '$category' },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      // Get top tags
      const topTags = await Discussion.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      const response = {
        totalUsers,
        totalDiscussions,
        totalComments: totalReplies,
        activeUsers,
        topCategories,
        topTags
      };
      cache.set(cacheKey, response);
      return res.json(response);
    } catch (error) {
      return respondError(res, 'Error fetching community stats', error);
    }
  },

  // Create new discussion
  async createDiscussion(req, res) {
    try {
      const { title, content, tags, category } = req.body;
      if (!title || !content) return res.status(400).json({ message: 'Title and content are required' });
      // Protect against excessively large inputs
      if (String(title).length > 300) return res.status(400).json({ message: 'Title too long' });
      if (String(content).length > 50000) return res.status(400).json({ message: 'Content too long' });

      const discussion = await Discussion.create({ title, content, tags, category, author: req.user.id });
      await discussion.populate('author', 'username avatar');

      // Invalidate caches related to discussions and stats
      invalidateCache('discussions:');
      invalidateCache('communityStats');

      // Emit socket event
      const io = req.app.get('io');
      if (io && typeof io.to === 'function') io.to('community').emit('discussion:new', discussion);

      return res.status(201).json(discussion);
    } catch (error) {
      return respondError(res, 'Error creating discussion', error);
    }
  },

  // Add reply to discussion
  async addReply(req, res) {
    try {
      const { content, parentReplyId } = req.body;
      if (!content || String(content).trim().length === 0) return res.status(400).json({ message: 'Reply content required' });
      if (String(content).length > 20000) return res.status(400).json({ message: 'Reply too long' });

      const discussion = await Discussion.findById(req.params.id).select('_id');
      if (!discussion) return res.status(404).json({ message: 'Discussion not found' });

      // Create reply document
      const reply = await Reply.create({ content, author: req.user.id, discussion: discussion._id, parentReplyId });

      // Attach reply to parent reply or discussion atomically
      if (parentReplyId) {
        await Reply.findByIdAndUpdate(parentReplyId, { $push: { replies: reply._id } }).exec();
      } else {
        await Discussion.findByIdAndUpdate(discussion._id, { $push: { replies: reply._id }, $set: { lastActivity: new Date() } }).exec();
      }

      await reply.populate('author', 'username profilePicture');

      // Invalidate caches
      invalidateCache('discussions:');
      invalidateCache('communityStats');

      // Emit socket event with complete reply data
      const io = req.app.get('io');
      if (io && typeof io.to === 'function') {
        io.to('community').emit('reply:new', {
          discussionId: discussion._id,
          reply: {
            ...reply.toObject(),
            author: {
              _id: req.user._id,
              username: req.user.username,
              profilePicture: req.user.profilePicture
            }
          }
        });
      }

      return res.status(201).json(reply);
    } catch (error) {
      console.error('Error adding reply:', error);
      return respondError(res, 'Error adding reply', error);
    }
  },

  // Like/Unlike discussion
  async likeDiscussion(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const discussion = await Discussion.findById(id);
      
      if (!discussion) {
        return res.status(404).json({ message: 'Discussion not found' });
      }

      // Use the toggleLike method from the model
      const updatedDiscussion = await discussion.toggleLike(userId);
      if (!updatedDiscussion) {
        throw new Error('Failed to update discussion');
      }

      // Populate the author field before sending response
      await updatedDiscussion.populate('author', 'username avatar');

      // Add isLiked field for the current user
      updatedDiscussion.isLiked = updatedDiscussion.likes.includes(userId);

      // Get the socket instance from the request
      const io = req.app.get('io');
      if (io && typeof io.to === 'function') {
        io.to('community').emit('discussion:liked', {
          discussionId: updatedDiscussion._id,
          likes: updatedDiscussion.likes,
          isLiked: updatedDiscussion.isLiked
        });
      }

      // Invalidate caches
      invalidateCache('discussions:');
      invalidateCache('communityStats');

      res.json(updatedDiscussion);
    } catch (error) {
      console.error('Error in likeDiscussion:', error);
      return respondError(res, 'Error updating like', error);
    }
  },

  // Search discussions
  async searchDiscussions(req, res) {
    try {
      const query = req.query.q;
      
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({ message: 'Search query is required' });
      }
      const q = query.trim();
      // Prefer text index if present; fallback to regex
      const searchQuery = {
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { content: { $regex: q, $options: 'i' } },
          { tags: { $regex: q, $options: 'i' } }
        ]
      };

      const discussions = await Discussion.find(searchQuery).select('title content author tags likes').populate('author', 'username avatar').limit(10).lean();

      // Add user's like status if authenticated
      if (req.user) discussions.forEach(d => { d.isLiked = Array.isArray(d.likes) && d.likes.includes(req.user.id); });

      return res.json(discussions);
    } catch (error) {
      console.error('Error searching discussions:', error);
      return respondError(res, 'Error searching discussions', error);
    }
  },

  // Delete discussion
  async deleteDiscussion(req, res) {
    try {
      const discussion = await Discussion.findById(req.params.id);
      
      if (!discussion) {
        return res.status(404).json({ message: 'Discussion not found' });
      }

      // Check if user is the author
      if (discussion.author.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to delete this discussion' });
      }

      // Delete all replies associated with the discussion and the discussion atomically where possible
      await Promise.all([
        Reply.deleteMany({ discussion: discussion._id }),
        Discussion.deleteOne({ _id: discussion._id })
      ]);

      // Invalidate caches
      invalidateCache('discussions:');
      invalidateCache('communityStats');

      return res.json({ message: 'Discussion deleted successfully' });
    } catch (error) {
      return respondError(res, 'Error deleting discussion', error);
    }
  },

  // Delete reply
  async deleteReply(req, res) {
    try {
      const { id: discussionId, replyId } = req.params;
      
      const discussion = await Discussion.findById(discussionId);
      if (!discussion) {
        return res.status(404).json({ message: 'Discussion not found' });
      }

      const reply = await Reply.findById(replyId);
      if (!reply) {
        return res.status(404).json({ message: 'Reply not found' });
      }

      // Check if user is the author of the reply
      if (reply.author.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to delete this reply' });
      }

      // Remove reply from discussion (atomic) and delete the reply
      await Promise.all([
        Discussion.findByIdAndUpdate(discussionId, { $pull: { replies: replyId } }).exec(),
        Reply.deleteOne({ _id: replyId }).exec()
      ]);

      // Invalidate caches
      invalidateCache('discussions:');
      invalidateCache('communityStats');

      return res.json({ message: 'Reply deleted successfully' });
    } catch (error) {
      return respondError(res, 'Error deleting reply', error);
    }
  },

  // Like/Unlike reply
  async likeReply(req, res) {
    try {
      const { id: discussionId, replyId } = req.params;
      
      const discussion = await Discussion.findById(discussionId);
      if (!discussion) {
        return res.status(404).json({ message: 'Discussion not found' });
      }

      const reply = await Reply.findById(replyId);
      if (!reply) {
        return res.status(404).json({ message: 'Reply not found' });
      }

      // Atomic toggle: check membership then add or remove accordingly
      const userId = req.user.id;
      const alreadyLiked = Array.isArray(reply.likes) && reply.likes.includes(userId);
      let updated;
      if (alreadyLiked) {
        updated = await Reply.findByIdAndUpdate(replyId, { $pull: { likes: userId } }, { new: true }).lean();
      } else {
        updated = await Reply.findByIdAndUpdate(replyId, { $addToSet: { likes: userId } }, { new: true }).lean();
      }

      // Emit socket event for real-time update
      const io = req.app.get('io');
      if (io && typeof io.to === 'function') {
        io.to('community').emit('reply:liked', {
          discussionId,
          replyId,
          likes: updated.likes,
          isLiked: !alreadyLiked
        });
      }

      // Invalidate caches
      invalidateCache('discussions:');

      return res.json({ likes: updated.likes, isLiked: !alreadyLiked });
    } catch (error) {
      console.error('Error liking reply:', error);
      return respondError(res, 'Error liking reply', error);
    }
  },

  // Get all categories with their discussion counts
  async getCategories(req, res) {
    try {
      const categories = await Discussion.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            name: '$_id',
            count: 1
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      res.json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: 'Error fetching categories' });
    }
  },

  // Get top tags with their usage counts
  async getTopTags(req, res) {
    try {
      const tags = await Discussion.aggregate([
        {
          $unwind: '$tags'
        },
        {
          $group: {
            _id: '$tags',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            name: '$_id',
            count: 1
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 20 // Return top 20 tags
        }
      ]);

      res.json(tags);
    } catch (error) {
      console.error('Error fetching top tags:', error);
      res.status(500).json({ message: 'Error fetching top tags' });
    }
  },

  // Update a discussion
  async updateDiscussion(req, res) {
    try {
      const { id } = req.params;
      const { title, content, category, tags } = req.body;
      const userId = req.user._id;

      const discussion = await Discussion.findById(id);
      if (!discussion) {
        return res.status(404).json({ message: 'Discussion not found' });
      }

      // Check if user is the author
      if (discussion.author.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this discussion' });
      }

      const updatedDiscussion = await Discussion.findByIdAndUpdate(
        id,
        {
          title,
          content,
          category,
          tags,
          updatedAt: Date.now()
        },
        { new: true }
      ).populate('author', 'username avatar');

      res.json(updatedDiscussion);
    } catch (error) {
      console.error('Error updating discussion:', error);
      res.status(500).json({ message: 'Error updating discussion' });
    }
  },

  // Update a reply
  async updateReply(req, res) {
    try {
      const { id, replyId } = req.params;
      const { content } = req.body;
      const userId = req.user._id;

      const discussion = await Discussion.findById(id);
      if (!discussion) {
        return res.status(404).json({ message: 'Discussion not found' });
      }

      const reply = discussion.replies.id(replyId);
      if (!reply) {
        return res.status(404).json({ message: 'Reply not found' });
      }

      // Check if user is the author of the reply
      if (reply.author.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this reply' });
      }

      reply.content = content;
      reply.updatedAt = Date.now();
      await discussion.save();

      res.json(reply);
    } catch (error) {
      console.error('Error updating reply:', error);
      res.status(500).json({ message: 'Error updating reply' });
    }
  }
};

module.exports = CommunityController; 