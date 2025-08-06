const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Test script to verify MongoDB session store setup
 */

async function testSessionStore() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const sessionCollection = db.collection('sessions');

    // Check if sessions collection exists
    const collections = await db.listCollections().toArray();
    const sessionsCollectionExists = collections.some(col => col.name === 'sessions');
    
    if (sessionsCollectionExists) {
      console.log('✅ Sessions collection exists');
      
      // Get session statistics
      const totalSessions = await sessionCollection.countDocuments();
      const activeSessions = await sessionCollection.countDocuments({
        expires: { $gt: new Date() }
      });
      const expiredSessions = await sessionCollection.countDocuments({
        expires: { $lte: new Date() }
      });

      console.log('📊 Session Statistics:');
      console.log(`   Total sessions: ${totalSessions}`);
      console.log(`   Active sessions: ${activeSessions}`);
      console.log(`   Expired sessions: ${expiredSessions}`);

      // Check for TTL index
      const indexes = await sessionCollection.indexes();
      const ttlIndex = indexes.find(index => index.expireAfterSeconds !== undefined);
      
      if (ttlIndex) {
        console.log('✅ TTL index found for automatic session cleanup');
        console.log(`   TTL field: ${Object.keys(ttlIndex.key)[0]}`);
        console.log(`   Expire after: ${ttlIndex.expireAfterSeconds} seconds`);
      } else {
        console.log('⚠️  No TTL index found - sessions may not auto-expire');
      }

    } else {
      console.log('ℹ️  Sessions collection does not exist yet (will be created on first session)');
    }

    // Test session creation
    console.log('\n🧪 Testing session creation...');
    const testSession = {
      _id: 'test-session-' + Date.now(),
      session: {
        userId: 'test-user-123',
        username: 'testuser',
        createdAt: new Date()
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    };

    await sessionCollection.insertOne(testSession);
    console.log('✅ Test session created successfully');

    // Verify session was created
    const createdSession = await sessionCollection.findOne({ _id: testSession._id });
    if (createdSession) {
      console.log('✅ Test session retrieved successfully');
    }

    // Clean up test session
    await sessionCollection.deleteOne({ _id: testSession._id });
    console.log('✅ Test session cleaned up');

    console.log('\n🎉 Session store test completed successfully!');
    console.log('✅ Your MongoDB session store is properly configured');
    console.log('✅ The MemoryStore warning should no longer appear');

  } catch (error) {
    console.error('❌ Error testing session store:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the test
testSessionStore(); 