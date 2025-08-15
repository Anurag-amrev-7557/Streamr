const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: function() { return !this.googleId && !this.githubId; },
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't include password in queries by default
  },
  googleId: { type: String },
  githubId: { type: String },
  avatar: { type: String },
  isVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  profilePicture: {
    type: String,
    default: null
  },
  location: {
    type: String,
    trim: true,
    default: ''
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [250, 'Bio cannot exceed 250 characters'],
    default: ''
  },
  socialLinks: {
    twitter: { type: String, trim: true, default: '' },
    instagram: { type: String, trim: true, default: '' },
    letterboxd: { type: String, trim: true, default: '' }
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    genres: {
      type: [String],
      default: []
    },
    language: {
      type: String,
      default: 'en'
    },
    rating: {
      type: String,
      default: 'all'
    }
  },
  watchlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  }],
  watchHistory: [{
    content: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content'
    },
    progress: {
      type: Number,
      default: 0
    },
    lastWatched: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to check if user is verified
userSchema.methods.isEmailVerified = function() {
  return this.isVerified;
};

// Method to generate verification token
userSchema.methods.generateVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = token;
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = token;
  this.resetPasswordExpires = Date.now() + 1 * 60 * 60 * 1000; // 1 hour
  return token;
};

// Method to add content to watchlist
userSchema.methods.addToWatchlist = async function(contentId) {
  if (!this.watchlist.includes(contentId)) {
    this.watchlist.push(contentId);
    await this.save();
  }
};

// Method to remove content from watchlist
userSchema.methods.removeFromWatchlist = async function(contentId) {
  this.watchlist = this.watchlist.filter(id => id.toString() !== contentId.toString());
  await this.save();
};

// Method to update watch history
userSchema.methods.updateWatchHistory = async function(contentId, progress) {
  const historyIndex = this.watchHistory.findIndex(
    item => item.content.toString() === contentId.toString()
  );

  if (historyIndex > -1) {
    this.watchHistory[historyIndex].progress = progress;
    this.watchHistory[historyIndex].lastWatched = Date.now();
  } else {
    this.watchHistory.push({
      content: contentId,
      progress,
      lastWatched: Date.now()
    });
  }

  await this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User;