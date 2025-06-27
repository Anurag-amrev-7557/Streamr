const mongoose = require('mongoose');

const discussionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true,
    minlength: 10
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Movies',
      'TV Shows',
      'Anime',
      'Documentaries',
      'Reviews',
      'Recommendations',
      'News',
      'General'
    ]
  },
  tags: [{
    type: String,
    trim: true
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  views: {
    type: Number,
    default: 0
  },
  viewedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastViewed: {
      type: Date,
      default: Date.now
    }
  }],
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reply'
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
discussionSchema.index({ title: 'text', content: 'text', tags: 'text' });
discussionSchema.index({ category: 1 });
discussionSchema.index({ createdAt: -1 });
discussionSchema.index({ likes: -1 });
discussionSchema.index({ views: -1 });

// Update lastActivity when a reply is added
discussionSchema.pre('save', function(next) {
  if (this.isModified('replies')) {
    this.lastActivity = new Date();
  }
  next();
});

// Virtual for reply count
discussionSchema.virtual('replyCount').get(function() {
  return this.replies.length;
});

// Virtual for like count
discussionSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Method to check if user has liked
discussionSchema.methods.hasLiked = function(userId) {
  return this.likes.includes(userId);
};

// Method to toggle like
discussionSchema.methods.toggleLike = async function(userId) {
  const index = this.likes.indexOf(userId);
  if (index === -1) {
    this.likes.push(userId);
  } else {
    this.likes.splice(index, 1);
  }
  
  // Use findByIdAndUpdate to preserve all fields
  return Discussion.findByIdAndUpdate(
    this._id,
    { $set: { likes: this.likes } },
    { new: true, runValidators: false }
  );
};

// Method to increment views
discussionSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

const Discussion = mongoose.model('Discussion', discussionSchema);

module.exports = Discussion; 