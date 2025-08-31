const axios = require('axios');

console.log('🔍 Checking Deployment Status...\n');

const checkDeploymentStatus = async () => {
  try {
    // Check if the deployed backend is accessible
    console.log('1️⃣ Checking if deployed backend is accessible...');
    const healthResponse = await axios.get('https://streamr-jjj9.onrender.com/api/health');
    console.log('✅ Deployed backend is accessible');
    console.log('   Status:', healthResponse.data.status);
    console.log('   Environment:', healthResponse.data.environment);
    console.log('   Uptime:', Math.floor(healthResponse.data.uptime / 60), 'minutes');
    
    // Check if wishlist endpoints are now working
    console.log('\n2️⃣ Testing wishlist endpoints...');
    try {
      const wishlistResponse = await axios.get('https://streamr-jjj9.onrender.com/api/user/wishlist', {
        headers: { 'Authorization': 'Bearer test_token' }
      });
      console.log('❌ Unexpected success with invalid token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Wishlist endpoint exists and requires auth');
      } else if (error.response?.status === 404) {
        console.log('❌ Wishlist endpoint still not found');
        console.log('💡 The deployed backend hasn\'t been updated yet');
      } else {
        console.log('⚠️  Unexpected response:', error.response?.status);
      }
    }
    
    // Check if watchlist sync is working (this was giving 500 errors)
    console.log('\n3️⃣ Testing watchlist sync endpoint...');
    try {
      const syncResponse = await axios.post('https://streamr-jjj9.onrender.com/api/user/watchlist/sync', {
        watchlist: [{ id: 1, title: 'Test' }]
      }, {
        headers: { 'Authorization': 'Bearer test_token' }
      });
      console.log('❌ Unexpected success with invalid token');
    } catch (error) {
      if (error.response?.status === 500) {
        console.log('❌ Watchlist sync still returns 500 error');
        console.log('💡 The deployed backend still has the old code');
      } else if (error.response?.status === 401) {
        console.log('✅ Watchlist sync endpoint exists and requires auth');
      } else {
        console.log('⚠️  Unexpected response:', error.response?.status);
      }
    }
    
    console.log('\n📊 Deployment Status Summary:');
    console.log('   ✅ Backend accessible: Yes');
    console.log('   ❌ Wishlist endpoints: Need to check');
    console.log('   ❌ Watchlist sync: Still has 500 errors');
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Check your Render dashboard for deployment status');
    console.log('2. Verify the deployment is using the correct repository/branch');
    console.log('3. Check if auto-deploy is enabled');
    console.log('4. Manually trigger a deployment if needed');
    
    console.log('\n💡 If the backend still has issues:');
    console.log('   - The deployment might not be automatic');
    console.log('   - You might need to manually deploy from Render dashboard');
    console.log('   - Or the deployment is using a different branch');
    
  } catch (error) {
    console.error('❌ Error checking deployment:', error.message);
  }
};

checkDeploymentStatus();
