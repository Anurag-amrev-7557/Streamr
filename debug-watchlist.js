const mongoose = require('mongoose');

// Test the Content model
async function testContentModel() {
  try {
    console.log('🔍 Testing Content model...');
    
    // Connect to MongoDB (you'll need to update this URL)
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/streamr';
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB');
    
    // Import the Content model
    const Content = require('./src/models/Content');
    
    // Test data
    const testMovie = {
      tmdbId: 550,
      type: 'movie',
      title: 'Fight Club',
      name: 'Fight Club',
      overview: 'A ticking-time-bomb insomniac and a devil-may-care soapmaker form an underground fight club that evolves into something much, much more.',
      posterPath: '/pB8BM7pdM6DU9m0sr0X0FfHKgYo.jpg',
      backdropPath: '/52AfXWuXCHn3DU9m0sr0X0FfHKgYo.jpg',
      releaseDate: new Date('1999-10-15'),
      rating: 8.8,
      genres: ['Drama'],
      runtime: 139
    };
    
    console.log('📝 Creating test movie...');
    const content = await Content.findOrCreate(testMovie);
    console.log('✅ Content created/found:', {
      id: content._id,
      tmdbId: content.tmdbId,
      title: content.title,
      type: content.type
    });
    
    // Test incrementing wishlist count
    console.log('📈 Testing wishlist count increment...');
    await content.incrementWishlistCount();
    console.log('✅ Wishlist count incremented to:', content.wishlistCount);
    
    // Test decrementing wishlist count
    console.log('📉 Testing wishlist count decrement...');
    await content.decrementWishlistCount();
    console.log('✅ Wishlist count decremented to:', content.wishlistCount);
    
    // Test display title virtual
    console.log('🏷️ Display title:', content.displayTitle);
    
    // Test release year virtual
    console.log('📅 Release year:', content.releaseYear);
    
    console.log('🎉 Content model test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing Content model:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Test the User model's watchlist methods
async function testUserWatchlist() {
  try {
    console.log('\n👤 Testing User model watchlist methods...');
    
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/streamr';
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB');
    
    // Import models
    const User = require('./src/models/User');
    const Content = require('./src/models/Content');
    
    // Create a test user
    const testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'testpassword123'
    });
    
    console.log('👤 Creating test user...');
    await testUser.save();
    console.log('✅ Test user created:', testUser._id);
    
    // Create test content
    const testContent = new Content({
      tmdbId: 13,
      type: 'movie',
      title: 'Forrest Gump',
      name: 'Forrest Gump',
      overview: 'The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold from the perspective of an Alabama man with an IQ of 75.',
      rating: 8.8,
      genres: ['Drama', 'Romance']
    });
    
    console.log('🎬 Creating test content...');
    await testContent.save();
    console.log('✅ Test content created:', testContent._id);
    
    // Test adding to watchlist
    console.log('📝 Testing add to watchlist...');
    await testUser.addToWatchlist(testContent._id);
    console.log('✅ Added to watchlist. Watchlist count:', testUser.watchlist.length);
    
    // Test updating watch history
    console.log('📺 Testing watch history update...');
    await testUser.updateWatchHistory(testContent._id, 75);
    console.log('✅ Watch history updated. History count:', testUser.watchHistory.length);
    
    // Test removing from watchlist
    console.log('🗑️ Testing remove from watchlist...');
    await testUser.removeFromWatchlist(testContent._id);
    console.log('✅ Removed from watchlist. Watchlist count:', testUser.watchlist.length);
    
    // Clean up
    await User.findByIdAndDelete(testUser._id);
    await Content.findByIdAndDelete(testContent._id);
    console.log('🧹 Test data cleaned up');
    
    console.log('🎉 User watchlist test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing User watchlist:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Watchlist Debug Tests...\n');
  
  try {
    await testContentModel();
    await testUserWatchlist();
    console.log('\n🎉 All tests completed successfully!');
  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testContentModel,
  testUserWatchlist
};
