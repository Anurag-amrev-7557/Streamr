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
    },
    autoplay: {
      type: Boolean,
      default: true
    },
    quality: {
      type: String,
      default: '1080p'
    }
  },
  // 2FA fields
  twoFactorSecret: {
    type: String,
    select: false // Don't include in queries by default
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  backupCodes: [{
    code: {
      type: String,
      required: true
    },
    used: {
      type: Boolean,
      default: false
    }
  }],
  // Enhanced watchlist and viewing progress for frontend sync
  watchlist: [{
    id: { type: Number, required: true },
    title: { type: String, required: true },
    poster_path: String,
    backdrop_path: String,
    overview: String,
    type: { type: String, enum: ['movie', 'tv'], default: 'movie' },
    year: String,
    rating: Number,
    genres: [String],
    release_date: String,
    duration: String,
    director: String,
    cast: [String],
    addedAt: { type: Date, default: Date.now }
  }],
  viewingProgress: {
    type: Map,
    of: {
      id: { type: Number, required: true },
      title: { type: String, required: true },
      type: { type: String, enum: ['movie', 'tv'], required: true },
      poster_path: String,
      backdrop_path: String,
      lastWatched: { type: Date, default: Date.now },
      season: Number,
      episode: Number,
      episodeTitle: String,
      progress: { type: Number, default: 0, min: 0, max: 100 }
    },
    default: () => new Map()
  },
  // Legacy fields for backward compatibility
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

// Enhanced method to add movie/show to watchlist
userSchema.methods.addToWatchlistEnhanced = async function(movieData) {
  // Check if already exists
  const existingIndex = this.watchlist.findIndex(item => item.id === movieData.id);
  
  if (existingIndex >= 0) {
    // Update existing entry
    this.watchlist[existingIndex] = {
      ...this.watchlist[existingIndex],
      ...movieData,
      addedAt: new Date()
    };
  } else {
    // Add new entry
    this.watchlist.push({
      ...movieData,
      addedAt: new Date()
    });
  }
  
  await this.save();
};

// Enhanced method to remove movie/show from watchlist
userSchema.methods.removeFromWatchlistEnhanced = async function(movieId) {
  this.watchlist = this.watchlist.filter(item => item.id !== movieId);
  await this.save();
};

// Enhanced method to sync entire watchlist
userSchema.methods.syncWatchlist = async function(watchlistData) {
  this.watchlist = watchlistData.map(item => ({
    ...item,
    addedAt: item.addedAt ? new Date(item.addedAt) : new Date()
  }));
  await this.save();
};

// Enhanced method to update viewing progress
userSchema.methods.updateViewingProgress = async function(progressData) {
  // Initialize viewingProgress if it's undefined
  if (!this.viewingProgress) {
    this.viewingProgress = new Map();
  }
  
  const key = progressData.type === 'movie' 
    ? `movie_${progressData.id}` 
    : `tv_${progressData.id}_${progressData.season}_${progressData.episode}`;
  
  this.viewingProgress.set(key, {
    ...progressData,
    lastWatched: new Date()
  });
  
  await this.save();
};

// Enhanced method to sync entire viewing progress
userSchema.methods.syncViewingProgress = async function(progressData) {
  // Initialize viewingProgress if it's undefined
  if (!this.viewingProgress) {
    this.viewingProgress = new Map();
  }
  
  // Clear existing progress
  this.viewingProgress.clear();
  
  // Add new progress entries
  Object.entries(progressData).forEach(([key, data]) => {
    this.viewingProgress.set(key, {
      ...data,
      lastWatched: data.lastWatched ? new Date(data.lastWatched) : new Date()
    });
  });
  
  await this.save();
};

// Method to get viewing progress
userSchema.methods.getViewingProgress = function() {
  // Initialize viewingProgress if it's undefined
  if (!this.viewingProgress) {
    this.viewingProgress = new Map();
  }
  
  const progress = {};
  this.viewingProgress.forEach((value, key) => {
    // Convert Mongoose document to plain object if it has toObject method
    progress[key] = value && typeof value.toObject === 'function' ? value.toObject() : value;
  });
  
  return progress;
};

// Method to clear viewing progress
userSchema.methods.clearViewingProgress = async function() {
  this.viewingProgress.clear();
  await this.save();
};

// Method to clear watchlist
userSchema.methods.clearWatchlist = async function() {
  this.watchlist = [];
  await this.save();
};

// Legacy method to add content to watchlist (for backward compatibility)
userSchema.methods.addToWatchlist = async function(contentId) {
  if (!this.watchlist.includes(contentId)) {
    this.watchlist.push(contentId);
    await this.save();
  }
};

// Legacy method to remove content from watchlist (for backward compatibility)
userSchema.methods.removeFromWatchlist = async function(contentId) {
  this.watchlist = this.watchlist.filter(id => id.toString() !== contentId.toString());
  await this.save();
};

// Legacy method to update watch history (for backward compatibility)
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