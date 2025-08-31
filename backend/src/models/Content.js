const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  tmdbId: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['movie', 'tv'],
    default: 'movie'
  },
  mediaType: {
    type: String,
    enum: ['movie', 'tv'],
    default: 'movie'
  },
  overview: {
    type: String,
    trim: true
  },
  posterPath: {
    type: String
  },
  backdropPath: {
    type: String
  },
  releaseDate: {
    type: Date
  },
  firstAirDate: {
    type: Date
  },
  rating: {
    type: Number,
    min: 0,
    max: 10
  },
  voteCount: {
    type: Number,
    default: 0
  },
  popularity: {
    type: Number,
    default: 0
  },
  runtime: {
    type: Number
  },
  episodeRuntime: {
    type: [Number]
  },
  genres: [{
    type: String,
    trim: true
  }],
  genreIds: [{
    type: Number
  }],
  originalLanguage: {
    type: String,
    default: 'en'
  },
  originalTitle: {
    type: String
  },
  originalName: {
    type: String
  },
  adult: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    default: 'Released'
  },
  // TV Show specific fields
  numberOfSeasons: {
    type: Number
  },
  numberOfEpisodes: {
    type: Number
  },
  // Enhanced metadata
  tagline: {
    type: String
  },
  budget: {
    type: Number
  },
  revenue: {
    type: Number
  },
  productionCompanies: [{
    id: Number,
    name: String,
    logoPath: String,
    originCountry: String
  }],
  productionCountries: [{
    iso31661: String,
    name: String
  }],
  spokenLanguages: [{
    iso6391: String,
    name: String
  }],
  // Tracking fields
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  watchCount: {
    type: Number,
    default: 0
  },
  wishlistCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better query performance
// Compound unique index for tmdbId + type combination
contentSchema.index({ tmdbId: 1, type: 1 }, { unique: true });
contentSchema.index({ title: 'text', name: 'text', overview: 'text' });
contentSchema.index({ type: 1, rating: -1 });
contentSchema.index({ type: 1, popularity: -1 });
contentSchema.index({ genres: 1 });
contentSchema.index({ releaseDate: -1 });
contentSchema.index({ firstAirDate: -1 });

// Virtual for display title (combines title and name)
contentSchema.virtual('displayTitle').get(function() {
  return this.title || this.name || 'Untitled';
});

// Virtual for release year
contentSchema.virtual('releaseYear').get(function() {
  const date = this.releaseDate || this.firstAirDate;
  return date ? date.getFullYear() : null;
});

// Method to update watch count
contentSchema.methods.incrementWatchCount = async function() {
  this.watchCount += 1;
  this.lastUpdated = new Date();
  await this.save();
};

// Method to update wishlist count
contentSchema.methods.incrementWishlistCount = async function() {
  this.wishlistCount += 1;
  this.lastUpdated = new Date();
  await this.save();
};

// Method to decrement wishlist count
contentSchema.methods.decrementWishlistCount = async function() {
  if (this.wishlistCount > 0) {
    this.wishlistCount -= 1;
    this.lastUpdated = new Date();
    await this.save();
  }
};

// Static method to find or create content
contentSchema.statics.findOrCreate = async function(contentData) {
  const { tmdbId, type } = contentData;
  
  let content = await this.findOne({ tmdbId, type });
  
  if (!content) {
    content = new this(contentData);
    await content.save();
  }
  
  return content;
};

// Pre-save middleware to ensure mediaType matches type
contentSchema.pre('save', function(next) {
  if (this.type && !this.mediaType) {
    this.mediaType = this.type;
  }
  if (this.mediaType && !this.type) {
    this.type = this.mediaType;
  }
  next();
});

const Content = mongoose.model('Content', contentSchema);

module.exports = Content;
