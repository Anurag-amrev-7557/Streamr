const Discussion = require('../models/Discussion');
const Reply = require('../models/Reply');
const User = require('../models/User');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 60 });

const CommunityController = {
  // Get all discussions with pagination and sorting
  async getDiscussions(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
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

      let query = {};
      if (category) {
        query.category = category;
      }
      if (tag) {
        query.tags = tag;
      }

      let sortOptions = {};
      switch (sort) {
        case 'newest':
          sortOptions = { createdAt: -1 };
          break;
        case 'oldest':
          sortOptions = { createdAt: 1 };
          break;
        case 'popular':
          sortOptions = { likes: -1, views: -1 };
          break;
        case 'trending':
          sortOptions = { 
            $expr: { 
              $add: [
                { $size: '$replies' },
                { $size: '$likes' },
                { $multiply: ['$views', 0.1] }
              ]
            }
          };
          break;
        default:
          sortOptions = { createdAt: -1 };
      }

      const discussions = await Discussion.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .select('title content author category tags likes views replies createdAt updatedAt isPinned isLocked lastActivity')
        .populate('author', 'username avatar profilePicture')
        .populate({
          path: 'replies',
          select: 'content author createdAt updatedAt likes',
          populate: {
            path: 'author',
            select: 'username avatar profilePicture'
          }
        });

      const total = await Discussion.countDocuments(query);

      // Add user's like status if authenticated
      let userId = req.user ? req.user.id : null;
      const formattedDiscussions = discussions.map(discussion => {
        const isLiked = userId ? discussion.likes.includes(userId) : false;
        return {
          id: discussion._id,
          title: discussion.title,
          content: discussion.content,
          author: discussion.author,
          category: discussion.category,
          tags: discussion.tags,
          likes: discussion.likes.length,
          isLiked,
          views: discussion.views,
          replies: discussion.replies.map(reply => ({
            id: reply._id,
            content: reply.content,
            author: reply.author,
            createdAt: reply.createdAt,
            updatedAt: reply.updatedAt,
            likes: reply.likes ? reply.likes.length : 0,
            isLiked: userId ? (reply.likes ? reply.likes.includes(userId) : false) : false
          })),
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
      res.status(500).json({ message: 'Error fetching discussions', error: error.message });
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
        });

      if (!discussion) {
        return res.status(404).json({ message: 'Discussion not found' });
      }

      // Only increment views if the user hasn't viewed this discussion in the last 24 hours
      if (req.user) {
        const lastViewed = discussion.viewedBy.find(v => v.user.toString() === req.user._id.toString());
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        if (!lastViewed || lastViewed.lastViewed < oneDayAgo) {
          // Update or add the view record
          const viewIndex = discussion.viewedBy.findIndex(v => v.user.toString() === req.user._id.toString());
          if (viewIndex === -1) {
            discussion.viewedBy.push({ user: req.user._id, lastViewed: now });
          } else {
            discussion.viewedBy[viewIndex].lastViewed = now;
          }
          discussion.views += 1;
          await discussion.save();
        }
      }

      // Add user's like status if authenticated
      let userId = req.user ? req.user.id : null;
      const isLiked = userId ? discussion.likes.includes(userId) : false;
      const formattedDiscussion = {
        id: discussion._id,
        title: discussion.title,
        content: discussion.content,
        author: discussion.author,
        category: discussion.category,
        tags: discussion.tags,
        likes: discussion.likes.length,
        isLiked,
        views: discussion.views,
        replies: discussion.replies.map(reply => ({
          id: reply._id,
          content: reply.content,
          author: reply.author,
          createdAt: reply.createdAt,
          updatedAt: reply.updatedAt,
          likes: reply.likes ? reply.likes.length : 0,
          isLiked: userId ? (reply.likes ? reply.likes.includes(userId) : false) : false
        })),
        createdAt: discussion.createdAt,
        updatedAt: discussion.updatedAt,
        isPinned: discussion.isPinned,
        isLocked: discussion.isLocked,
        lastActivity: discussion.lastActivity
      };

      res.json(formattedDiscussion);
    } catch (error) {
      console.error('Error fetching discussion:', error);
      res.status(500).json({ message: 'Error fetching discussion' });
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
        topics.forEach(topic => {
          topic.isLiked = topic.likes.includes(req.user.id);
        });
      }

      res.json(topics);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching trending topics', error: error.message });
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
      res.status(500).json({ message: 'Error fetching community stats', error: error.message });
    }
  },

  // Create new discussion
  async createDiscussion(req, res) {
    try {
      const { title, content, tags, category } = req.body;
      const discussion = new Discussion({
        title,
        content,
        tags,
        category,
        author: req.user.id
      });

      await discussion.save();
      await discussion.populate('author', 'username avatar');

      // Emit socket event
      req.app.get('io').to('community').emit('discussion:new', discussion);

      res.status(201).json(discussion);
    } catch (error) {
      res.status(500).json({ message: 'Error creating discussion', error: error.message });
    }
  },

  // Add reply to discussion
  async addReply(req, res) {
    try {
      const { content, parentReplyId } = req.body;
      const discussion = await Discussion.findById(req.params.id);

      if (!discussion) {
        return res.status(404).json({ message: 'Discussion not found' });
      }

      const reply = new Reply({
        content,
        author: req.user.id,
        discussion: discussion._id,
        parentReplyId
      });

      await reply.save();
      
      if (parentReplyId) {
        // If it's a reply to another reply, add it to the parent reply's replies
        const parentReply = await Reply.findById(parentReplyId);
        if (parentReply) {
          parentReply.replies.push(reply._id);
          await parentReply.save();
        }
      } else {
        // If it's a top-level reply, add it to the discussion's replies
        discussion.replies.push(reply._id);
        await discussion.save();
      }

      // Populate the author information
      await reply.populate('author', 'username profilePicture');

      // Emit socket event with complete reply data
      req.app.get('io').to('community').emit('reply:new', {
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

      res.status(201).json(reply);
    } catch (error) {
      console.error('Error adding reply:', error);
      res.status(500).json({ message: 'Error adding reply', error: error.message });
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
      if (io) {
        // Emit socket event
        io.emit('discussion:liked', {
          discussionId: updatedDiscussion._id,
          likes: updatedDiscussion.likes,
          isLiked: updatedDiscussion.isLiked
        });
      }

      res.json(updatedDiscussion);
    } catch (error) {
      console.error('Error in likeDiscussion:', error);
      res.status(500).json({ 
        message: 'Error updating like', 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  // Search discussions
  async searchDiscussions(req, res) {
    try {
      const query = req.query.q;
      
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({ message: 'Search query is required' });
      }

      const discussions = await Discussion.find({
        $or: [
          { title: { $regex: query.trim(), $options: 'i' } },
          { content: { $regex: query.trim(), $options: 'i' } },
          { tags: { $regex: query.trim(), $options: 'i' } }
        ]
      })
      .populate('author', 'username avatar')
      .limit(10);

      // Add user's like status if authenticated
      if (req.user) {
        discussions.forEach(discussion => {
          discussion.isLiked = discussion.likes.includes(req.user.id);
        });
      }

      res.json(discussions);
    } catch (error) {
      console.error('Error searching discussions:', error);
      res.status(500).json({ message: 'Error searching discussions', error: error.message });
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

      // Delete all replies associated with the discussion
      await Reply.deleteMany({ discussion: discussion._id });

      // Delete the discussion
      await discussion.deleteOne();

      res.json({ message: 'Discussion deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting discussion', error: error.message });
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

      // Remove reply from discussion's replies array
      discussion.replies = discussion.replies.filter(
        reply => reply.toString() !== replyId
      );
      await discussion.save();

      // Delete the reply
      await reply.deleteOne();

      res.json({ message: 'Reply deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting reply', error: error.message });
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

      const likeIndex = reply.likes.indexOf(req.user.id);
      
      if (likeIndex === -1) {
        reply.likes.push(req.user.id);
      } else {
        reply.likes.splice(likeIndex, 1);
      }

      await reply.save();

      // Get the community namespace from the app
      const io = req.app.get('io');

      // Emit socket event for real-time update
      io.emit('reply:liked', {
        discussionId,
        replyId,
        likes: reply.likes,
        isLiked: likeIndex === -1
      });

      res.json({
        likes: reply.likes,
        isLiked: likeIndex === -1
      });
    } catch (error) {
      console.error('Error liking reply:', error);
      res.status(500).json({ message: 'Error liking reply', error: error.message });
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