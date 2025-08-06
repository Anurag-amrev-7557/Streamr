const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Session monitoring script for Streamr backend
 * Run this script to monitor session usage and performance
 */

async function monitorSessions() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const sessionCollection = db.collection('sessions');

    // Get current session statistics
    const totalSessions = await sessionCollection.countDocuments();
    const activeSessions = await sessionCollection.countDocuments({
      expires: { $gt: new Date() }
    });
    const expiredSessions = await sessionCollection.countDocuments({
      expires: { $lte: new Date() }
    });

    // Get session creation trends (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSessions = await sessionCollection.countDocuments({
      _id: { $regex: /^[a-f0-9]{24}$/ }, // Valid ObjectId format
      expires: { $gt: yesterday }
    });

    // Get unique users (approximate)
    const uniqueUsers = await sessionCollection.distinct('session.userId');

    console.log('\n📊 Session Monitor Report');
    console.log('========================');
    console.log(`📅 Generated: ${new Date().toISOString()}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');
    console.log('📈 Session Statistics:');
    console.log(`   Total sessions: ${totalSessions}`);
    console.log(`   Active sessions: ${activeSessions}`);
    console.log(`   Expired sessions: ${expiredSessions}`);
    console.log(`   Recent sessions (24h): ${recentSessions}`);
    console.log(`   Unique users: ${uniqueUsers.length}`);
    console.log('');

    // Memory usage estimation (rough calculation)
    const avgSessionSize = 1024; // ~1KB per session
    const estimatedMemoryUsage = (totalSessions * avgSessionSize) / (1024 * 1024); // MB
    console.log('💾 Memory Usage (Estimated):');
    console.log(`   Current sessions: ${estimatedMemoryUsage.toFixed(2)} MB`);
    console.log(`   Active sessions: ${(activeSessions * avgSessionSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log('');

    // Performance recommendations
    console.log('💡 Performance Recommendations:');
    if (expiredSessions > 100) {
      console.log('   ⚠️  Consider running cleanup: Many expired sessions found');
    }
    if (totalSessions > 10000) {
      console.log('   ⚠️  High session count: Consider reducing TTL or implementing cleanup');
    }
    if (activeSessions > 5000) {
      console.log('   ⚠️  High active sessions: Monitor for potential memory issues');
    }
    if (expiredSessions === 0 && totalSessions > 0) {
      console.log('   ✅ Good: No expired sessions found');
    }
    if (totalSessions < 100) {
      console.log('   ✅ Good: Low session count');
    }
    console.log('');

    // TTL index check
    const indexes = await sessionCollection.indexes();
    const ttlIndex = indexes.find(index => index.expireAfterSeconds !== undefined);
    
    if (ttlIndex) {
      console.log('🔧 TTL Configuration:');
      console.log(`   TTL field: ${Object.keys(ttlIndex.key)[0]}`);
      console.log(`   Expire after: ${ttlIndex.expireAfterSeconds} seconds`);
      console.log(`   Status: ✅ Active`);
    } else {
      console.log('🔧 TTL Configuration:');
      console.log('   Status: ❌ Not configured');
    }

    // Sample recent sessions
    if (activeSessions > 0) {
      console.log('\n📋 Sample Active Sessions:');
      const sampleSessions = await sessionCollection.find({
        expires: { $gt: new Date() }
      }).limit(5).toArray();

      sampleSessions.forEach((session, index) => {
        const userId = session.session?.userId || 'Unknown';
        const expires = new Date(session.expires).toLocaleString();
        console.log(`   ${index + 1}. User: ${userId} | Expires: ${expires}`);
      });
    }

    console.log('\n✅ Session monitoring completed successfully!');

  } catch (error) {
    console.error('❌ Error monitoring sessions:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the monitor
monitorSessions(); 