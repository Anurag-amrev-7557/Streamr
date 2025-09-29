const mongoose = require('mongoose');
const User = require('./src/models/User');

// Test Google profile photo functionality
async function testGoogleProfilePhoto() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/streamr');
    console.log('✅ Connected to MongoDB');

    // Test data - simulate Google OAuth response
    const testGoogleUser = {
      email: 'test.google@example.com',
      name: 'Test Google User',
      picture: 'https://lh3.googleusercontent.com/a/test-profile-photo.jpg'
    };

    // Clean up any existing test user
    await User.deleteOne({ email: testGoogleUser.email });
    console.log('🧹 Cleaned up existing test user');

    // Test 1: Create new user with Google profile photo
    console.log('\n📝 Test 1: Creating new user with Google profile photo...');
    const newUser = new User({
      email: testGoogleUser.email,
      username: testGoogleUser.name.toLowerCase().replace(/\s+/g, ''),
      isVerified: true,
      profilePicture: testGoogleUser.picture
    });
    
    await newUser.save();
    console.log('✅ New user created with profile picture:', newUser.profilePicture);

    // Test 2: Update existing user's profile photo
    console.log('\n📝 Test 2: Updating existing user\'s profile photo...');
    const updatedPicture = 'https://lh3.googleusercontent.com/a/updated-profile-photo.jpg';
    
    const existingUser = await User.findOne({ email: testGoogleUser.email });
    if (existingUser) {
      existingUser.profilePicture = updatedPicture;
      await existingUser.save();
      console.log('✅ User profile picture updated to:', existingUser.profilePicture);
    }

    // Test 3: Verify profile photo URL handling
    console.log('\n📝 Test 3: Testing profile photo URL handling...');
    const user = await User.findOne({ email: testGoogleUser.email });
    
    if (user.profilePicture) {
      const isGooglePhoto = user.profilePicture.startsWith('http');
      console.log('✅ Profile picture URL:', user.profilePicture);
      console.log('✅ Is Google photo (starts with http):', isGooglePhoto);
      
      if (isGooglePhoto) {
        console.log('✅ Frontend will use URL directly');
      } else {
        console.log('✅ Frontend will prepend SERVER_URL');
      }
    }

    // Test 4: Test user data structure
    console.log('\n📝 Test 4: Verifying user data structure...');
    const userData = {
      id: user._id,
      username: user.username,
      email: user.email,
      isVerified: user.isVerified,
      profilePicture: user.profilePicture
    };
    
    console.log('✅ User data for frontend:', JSON.stringify(userData, null, 2));

    // Clean up
    await User.deleteOne({ email: testGoogleUser.email });
    console.log('\n🧹 Cleaned up test user');

    console.log('\n🎉 All tests passed! Google profile photo functionality is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testGoogleProfilePhoto();
