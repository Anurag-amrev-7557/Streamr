const User = require('../models/User');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        isVerified: user.isVerified,
        profilePicture: user.profilePicture,
        location: user.location,
        bio: user.bio,
        socialLinks: user.socialLinks,
        preferences: user.preferences,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
        googleId: user.googleId,
        githubId: user.githubId
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    console.log('Profile update request received:', {
      userId: req.user.id,
      body: req.body
    });

    const updateData = {};
    const updatableFields = ['name', 'location', 'bio', 'profilePicture', 'socialLinks'];

    updatableFields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updateData[field] = req.body[field];
      }
    });

    if (Object.prototype.hasOwnProperty.call(req.body, 'username')) {
      if (!req.body.username) {
        return res.status(400).json({ success: false, message: 'Username cannot be empty.' });
      }
      const existingUser = await User.findOne({ username: req.body.username });
      if (existingUser && existingUser._id.toString() !== req.user.id) {
        return res.status(400).json({ success: false, message: 'Username is already taken.' });
      }
      updateData.username = req.body.username;
    }

    console.log('Fields to update:', updateData);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify the update was successful by checking the updated fields
    const verificationChecks = [];
    for (const [field, value] of Object.entries(updateData)) {
      if (field === 'socialLinks') {
        // Check social links individually
        for (const [platform, url] of Object.entries(value)) {
          if (updatedUser.socialLinks[platform] !== url) {
            verificationChecks.push(`${platform} social link not updated correctly`);
          }
        }
      } else if (updatedUser[field] !== value) {
        verificationChecks.push(`${field} not updated correctly`);
      }
    }

    if (verificationChecks.length > 0) {
      console.error('Profile update verification failed:', verificationChecks);
      return res.status(500).json({ 
        success: false, 
        message: 'Profile update verification failed',
        details: verificationChecks
      });
    }

    console.log('Profile updated successfully for user:', updatedUser._id);
    console.log('Updated fields:', updateData);
    console.log('Verification passed for all fields');

    res.json({
      success: true,
      data: {
        id: updatedUser._id,
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        isVerified: updatedUser.isVerified,
        profilePicture: updatedUser.profilePicture,
        location: updatedUser.location,
        bio: updatedUser.bio,
        socialLinks: updatedUser.socialLinks,
        preferences: updatedUser.preferences,
        createdAt: updatedUser.createdAt,
        googleId: updatedUser.googleId,
        githubId: updatedUser.githubId
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};

// Update user preferences
exports.updatePreferences = async (req, res) => {
  try {
    const updateData = {};
    const updatablePreferences = ['theme', 'genres', 'language', 'rating'];

    updatablePreferences.forEach(field => {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
            updateData[`preferences.${field}`] = req.body[field];
        }
    });

    if (Object.prototype.hasOwnProperty.call(req.body, 'notifications')) {
        if (Object.prototype.hasOwnProperty.call(req.body.notifications, 'email')) {
            updateData['preferences.notifications.email'] = req.body.notifications.email;
        }
        if (Object.prototype.hasOwnProperty.call(req.body.notifications, 'push')) {
            updateData['preferences.notifications.push'] = req.body.notifications.push;
        }
    }
    
    const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateData },
        { new: true, runValidators: true }
    );
    
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating preferences'
    });
  }
};

// Upload profile picture
exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = `/uploads/${req.file.filename}`;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { profilePicture: filePath } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      data: {
        id: updatedUser._id,
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        isVerified: updatedUser.isVerified,
        profilePicture: updatedUser.profilePicture,
        location: updatedUser.location,
        bio: updatedUser.bio,
        socialLinks: updatedUser.socialLinks,
        preferences: updatedUser.preferences,
        createdAt: updatedUser.createdAt,
        googleId: updatedUser.googleId,
        githubId: updatedUser.githubId
      }
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ success: false, message: 'Error uploading profile picture' });
  }
}; 

// 2FA Setup - Generate secret and QR code
exports.setup2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA is already enabled' });
    }

    // Generate a new secret
    const secret = speakeasy.generateSecret({
      name: `Streamr (${user.email})`,
      issuer: 'Streamr',
      length: 32
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 8; i++) {
      const code = speakeasy.generateSecret({ length: 10 }).base32;
      backupCodes.push({
        code: code.replace(/[^A-Z0-9]/g, '').substring(0, 8),
        used: false
      });
    }

    // Save secret and backup codes to user
    user.twoFactorSecret = secret.base32;
    user.backupCodes = backupCodes;
    await user.save();

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode,
        backupCodes: backupCodes.map(bc => bc.code)
      }
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ success: false, message: 'Error setting up 2FA' });
  }
};

// 2FA Verify - Verify setup with TOTP code
exports.verify2FA = async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code || code.length !== 6) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 6-digit code' });
    }

    const user = await User.findById(req.user.id).select('+twoFactorSecret');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({ success: false, message: '2FA not set up yet' });
    }

    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2 // Allow 2 time steps for clock skew
    });

    if (!verified) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    await user.save();

    res.json({
      success: true,
      message: '2FA verification successful'
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ success: false, message: 'Error verifying 2FA' });
  }
};

// 2FA Disable - Disable 2FA with verification
exports.disable2FA = async (req, res) => {
  try {
    const { code, password } = req.body;
    
    if (!code || code.length !== 6) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 6-digit code' });
    }

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    const user = await User.findById(req.user.id).select('+password +twoFactorSecret');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA is not enabled' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Invalid password' });
    }

    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.backupCodes = [];
    await user.save();

    res.json({
      success: true,
      message: '2FA has been disabled successfully'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ success: false, message: 'Error disabling 2FA' });
  }
};

// Get backup codes
exports.getBackupCodes = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+backupCodes');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA is not enabled' });
    }

    res.json({
      success: true,
      data: {
        backupCodes: user.backupCodes.map(bc => ({
          code: bc.code,
          used: bc.used
        }))
      }
    });
  } catch (error) {
    console.error('Get backup codes error:', error);
    res.status(500).json({ success: false, message: 'Error fetching backup codes' });
  }
};

// Regenerate backup codes
exports.regenerateBackupCodes = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+backupCodes');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA is not enabled' });
    }

    // Generate new backup codes
    const backupCodes = [];
    for (let i = 0; i < 8; i++) {
      const code = speakeasy.generateSecret({ length: 10 }).base32;
      backupCodes.push({
        code: code.replace(/[^A-Z0-9]/g, '').substring(0, 8),
        used: false
      });
    }

    user.backupCodes = backupCodes;
    await user.save();

    res.json({
      success: true,
      data: {
        backupCodes: backupCodes.map(bc => bc.code)
      }
    });
  } catch (error) {
    console.error('Regenerate backup codes error:', error);
    res.status(500).json({ success: false, message: 'Error regenerating backup codes' });
  }
};

// Verify backup code
exports.verifyBackupCode = async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ success: false, message: 'Backup code is required' });
    }

    const user = await User.findById(req.user.id).select('+backupCodes');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA is not enabled' });
    }

    // Find and verify backup code
    const backupCode = user.backupCodes.find(bc => bc.code === code && !bc.used);
    if (!backupCode) {
      return res.status(400).json({ success: false, message: 'Invalid or already used backup code' });
    }

    // Mark backup code as used
    backupCode.used = true;
    await user.save();

    res.json({
      success: true,
      message: 'Backup code verified successfully'
    });
  } catch (error) {
    console.error('Verify backup code error:', error);
    res.status(500).json({ success: false, message: 'Error verifying backup code' });
  }
}; 

// Watchlist Controllers
exports.getWatchlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        watchlist: user.watchlist || []
      }
    });
  } catch (error) {
    console.error('Get watchlist error:', error);
    res.status(500).json({ success: false, message: 'Error fetching watchlist' });
  }
};

exports.addToWatchlist = async (req, res) => {
  try {
    const { tmdbId, type, title, posterPath, backdropPath, overview, releaseDate, rating, genres } = req.body;
    
    if (!tmdbId || !type) {
      return res.status(400).json({ success: false, message: 'TMDB ID and type are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if already in watchlist
    const existingItem = user.watchlist.find(
      item => item.tmdbId === tmdbId && item.type === type
    );
    
    if (existingItem) {
      return res.json({
        success: true,
        message: 'Content already in watchlist',
        data: { watchlist: user.watchlist }
      });
    }

    // Add to watchlist using the model method
    await user.addToWatchlist({
      tmdbId,
      type,
      title,
      posterPath,
      backdropPath,
      overview,
      releaseDate,
      rating,
      genres
    });

    res.json({
      success: true,
      message: 'Added to watchlist',
      data: { watchlist: user.watchlist }
    });
  } catch (error) {
    console.error('Add to watchlist error:', error);
    res.status(500).json({ success: false, message: 'Error adding to watchlist' });
  }
};

exports.removeFromWatchlist = async (req, res) => {
  try {
    const { tmdbId, type } = req.params;
    
    if (!tmdbId || !type) {
      return res.status(400).json({ success: false, message: 'TMDB ID and type are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Remove from watchlist using the model method
    await user.removeFromWatchlist(parseInt(tmdbId), type);

    res.json({
      success: true,
      message: 'Removed from watchlist',
      data: { watchlist: user.watchlist }
    });
  } catch (error) {
    console.error('Remove from watchlist error:', error);
    res.status(500).json({ success: false, message: 'Error removing from watchlist' });
  }
};

exports.syncWatchlist = async (req, res) => {
  try {
    const { watchlist } = req.body;
    
    if (!Array.isArray(watchlist)) {
      return res.status(400).json({ success: false, message: 'Watchlist must be an array' });
    }

    console.log('Syncing watchlist for user:', req.user.id, 'Items:', watchlist.length);

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Convert localStorage format to backend format
    const newWatchlist = watchlist.map(item => {
      const convertedItem = {
        tmdbId: parseInt(item.id || item.tmdbId) || 0,
        type: item.type || item.media_type || 'movie',
        title: item.title || item.name || '',
        posterPath: item.poster_path || item.poster || '',
        backdropPath: item.backdrop_path || item.backdrop || '',
        overview: item.overview || '',
        releaseDate: item.release_date || item.first_air_date || '',
        rating: parseFloat(item.rating || item.vote_average) || 0,
        genres: Array.isArray(item.genres || item.genre_ids) ? (item.genres || item.genre_ids) : [],
        addedAt: item.addedAt ? new Date(item.addedAt) : new Date()
      };
      
      console.log('Converting item:', item.id, 'to:', convertedItem.tmdbId);
      return convertedItem;
    });
    
    // Validate that all items have valid tmdbId
    const invalidItems = newWatchlist.filter(item => !item.tmdbId || item.tmdbId === 0);
    if (invalidItems.length > 0) {
      console.warn('Invalid items found:', invalidItems);
      return res.status(400).json({ 
        success: false, 
        message: 'Some items have invalid TMDB IDs',
        invalidItems 
      });
    }
    
    // Update user's watchlist
    user.watchlist = newWatchlist;
    await user.save();

    console.log('Watchlist synced successfully for user:', req.user.id, 'Items:', newWatchlist.length);

    res.json({
      success: true,
      message: 'Watchlist synced successfully',
      data: { watchlist: user.watchlist }
    });
  } catch (error) {
    console.error('Sync watchlist error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      success: false, 
      message: 'Error syncing watchlist',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Viewing Progress Controllers
exports.getViewingProgress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        viewingProgress: user.watchHistory || []
      }
    });
  } catch (error) {
    console.error('Get viewing progress error:', error);
    res.status(500).json({ success: false, message: 'Error fetching viewing progress' });
  }
};

exports.updateViewingProgress = async (req, res) => {
  try {
    const { tmdbId, type, season, episode, progress, title, posterPath, backdropPath, episodeTitle } = req.body;
    
    if (!tmdbId || !type || typeof progress !== 'number') {
      return res.status(400).json({ success: false, message: 'TMDB ID, type, and progress are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update viewing progress using the model method
    await user.updateWatchHistory({
      tmdbId,
      type,
      season,
      episode,
      progress,
      title,
      posterPath,
      backdropPath,
      episodeTitle
    });

    res.json({
      success: true,
      message: 'Viewing progress updated',
      data: { viewingProgress: user.watchHistory }
    });
  } catch (error) {
    console.error('Update viewing progress error:', error);
    res.status(500).json({ success: false, message: 'Error updating viewing progress' });
  }
};

exports.syncViewingProgress = async (req, res) => {
  try {
    const { viewingProgress } = req.body;
    
    if (!viewingProgress || typeof viewingProgress !== 'object') {
      return res.status(400).json({ success: false, message: 'Viewing progress must be an object' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Convert localStorage format to backend format
    const newWatchHistory = [];
    
    for (const [key, data] of Object.entries(viewingProgress)) {
      if (key.startsWith('movie_')) {
        const tmdbId = parseInt(key.replace('movie_', ''));
        newWatchHistory.push({
          tmdbId,
          type: 'movie',
          title: data.title,
          posterPath: data.poster_path || data.poster,
          backdropPath: data.backdrop_path || data.backdrop,
          progress: data.progress || 0,
          lastWatched: data.lastWatched ? new Date(data.lastWatched) : new Date()
        });
      } else if (key.startsWith('tv_')) {
        const parts = key.replace('tv_', '').split('_');
        if (parts.length >= 3) {
          const [tmdbId, season, episode] = parts;
          newWatchHistory.push({
            tmdbId: parseInt(tmdbId),
            type: 'tv',
            title: data.title,
            posterPath: data.poster_path || data.poster,
            backdropPath: data.backdrop_path || data.backdrop,
            season: parseInt(season),
            episode: parseInt(episode),
            episodeTitle: data.episodeTitle,
            progress: data.progress || 0,
            lastWatched: data.lastWatched ? new Date(data.lastWatched) : new Date()
          });
        }
      }
    }

    // Update user's watch history
    user.watchHistory = newWatchHistory;
    await user.save();

    res.json({
      success: true,
      message: 'Viewing progress synced successfully',
      data: { viewingProgress: user.watchHistory }
    });
  } catch (error) {
    console.error('Sync viewing progress error:', error);
    res.status(500).json({ success: false, message: 'Error syncing viewing progress' });
  }
}; 