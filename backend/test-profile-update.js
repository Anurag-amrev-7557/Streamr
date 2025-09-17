const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

// Test profile update functionality
async function testProfileUpdate() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find a test user (you can modify this to use a specific user ID)
    const testUser = await User.findOne();
    if (!testUser) {
      console.log('No users found in database');
      return;
    }

    console.log('Test user found:', {
      id: testUser._id,
      name: testUser.name,
      username: testUser.username,
      location: testUser.location,
      bio: testUser.bio
    });

    // Test updating the user's profile
    const updateData = {
      name: 'Test Updated Name',
      location: 'Test Location',
      bio: 'This is a test bio update'
    };

    console.log('Updating user with data:', updateData);

    const updatedUser = await User.findByIdAndUpdate(
      testUser._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (updatedUser) {
      console.log('Profile updated successfully!');
      console.log('Updated user:', {
        id: updatedUser._id,
        name: updatedUser.name,
        username: updatedUser.username,
        location: updatedUser.location,
        bio: updatedUser.bio
      });
    } else {
      console.log('Failed to update user');
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testProfileUpdate(); 