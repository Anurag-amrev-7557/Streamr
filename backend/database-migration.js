#!/usr/bin/env node

// Database Migration Script for User Model Schema
// This script ensures the User model has all required fields for watchlist functionality

const mongoose = require('mongoose');
require('dotenv').config();

// Import the User model
const User = require('./src/models/User');

// MongoDB connection options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

// Migration function
const migrateUserSchema = async () => {
  try {
    console.log('🔧 Starting User Model Schema Migration...\n');
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, mongooseOptions);
    console.log('✅ MongoDB connected successfully\n');
    
    // Get all users
    console.log('👥 Fetching all users from database...');
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users in database\n`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    // Process each user
    for (const user of users) {
      try {
        let needsUpdate = false;
        const updates = {};
        
        // Check and add watchlist field if missing
        if (!user.watchlist) {
          updates.watchlist = [];
          needsUpdate = true;
          console.log(`➕ Adding watchlist field to user: ${user.username || user.email}`);
        }
        
        // Check and add wishlist field if missing
        if (!user.wishlist) {
          updates.wishlist = [];
          needsUpdate = true;
          console.log(`➕ Adding wishlist field to user: ${user.username || user.email}`);
        }
        
        // Check and add viewingProgress field if missing
        if (!user.viewingProgress) {
          updates.viewingProgress = new Map();
          needsUpdate = true;
          console.log(`➕ Adding viewingProgress field to user: ${user.username || user.email}`);
        }
        
        // Check and add watchHistory field if missing
        if (!user.watchHistory) {
          updates.watchHistory = [];
          needsUpdate = true;
          console.log(`➕ Adding watchHistory field to user: ${user.username || user.email}`);
        }
        
        // Update user if needed
        if (needsUpdate) {
          await User.findByIdAndUpdate(user._id, { $set: updates }, { new: true });
          updatedCount++;
          console.log(`✅ Updated user: ${user.username || user.email}`);
        }
        
      } catch (error) {
        console.error(`❌ Error updating user ${user.username || user.email}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`   📥 Total users processed: ${users.length}`);
    console.log(`   ✅ Users updated: ${updatedCount}`);
    console.log(`   ❌ Errors encountered: ${errorCount}`);
    
    if (updatedCount > 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('   The User model now has all required fields for watchlist functionality.');
    } else {
      console.log('\n✨ No updates needed - all users already have the required fields.');
    }
    
    // Verify schema by checking a sample user
    console.log('\n🔍 Verifying schema...');
    const sampleUser = await User.findOne({});
    if (sampleUser) {
      console.log('✅ Schema verification:');
      console.log(`   - watchlist: ${Array.isArray(sampleUser.watchlist) ? '✅' : '❌'}`);
      console.log(`   - wishlist: ${Array.isArray(sampleUser.wishlist) ? '✅' : '❌'}`);
      console.log(`   - viewingProgress: ${sampleUser.viewingProgress instanceof Map ? '✅' : '❌'}`);
      console.log(`   - watchHistory: ${Array.isArray(sampleUser.watchHistory) ? '✅' : '❌'}`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
    process.exit(0);
  }
};

// Run migration if this script is executed directly
if (require.main === module) {
  migrateUserSchema();
}

module.exports = { migrateUserSchema };
