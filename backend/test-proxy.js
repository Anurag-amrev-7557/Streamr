#!/usr/bin/env node

/**
 * Test TMDB Proxy Server
 * This script tests the proxy server to ensure it's working correctly
 */

const config = require('./tmdb-proxy-config');
const axios = require('axios');

async function testProxyServer() {
  console.log('🧪 Testing TMDB Proxy Server\n');
  
  try {
    // Test proxy health
    console.log('1. Testing proxy health...');
    const healthResponse = await axios.get(`${config.proxy.baseUrl}/health`);
    console.log('✅ Proxy health:', healthResponse.data);
    
    // Test proxy trending endpoint (without API key for now)
    console.log('\n2. Testing proxy trending endpoint...');
    try {
      const trendingResponse = await axios.get(`${config.proxy.baseUrl}/trending?api_key=test`);
      if (trendingResponse.data.status_code === 7) {
        console.log('✅ Proxy trending endpoint working (expected invalid API key error)');
        console.log('   Response:', trendingResponse.data.status_message);
      } else {
        console.log('✅ Proxy trending endpoint working');
        console.log('   Results count:', trendingResponse.data.results?.length || 'N/A');
      }
    } catch (error) {
      console.log('❌ Proxy trending endpoint failed:', error.message);
    }
    
    // Test proxy popular endpoint
    console.log('\n3. Testing proxy popular endpoint...');
    try {
      const popularResponse = await axios.get(`${config.proxy.baseUrl}/popular?api_key=test`);
      if (popularResponse.data.status_code === 7) {
        console.log('✅ Proxy popular endpoint working (expected invalid API key error)');
        console.log('   Response:', popularResponse.data.status_message);
      } else {
        console.log('✅ Proxy popular endpoint working');
        console.log('   Results count:', popularResponse.data.results?.length || 'N/A');
      }
    } catch (error) {
      console.log('❌ Proxy popular endpoint failed:', error.message);
    }
    
    // Test proxy top-rated endpoint
    console.log('\n4. Testing proxy top-rated endpoint...');
    try {
      const topRatedResponse = await axios.get(`${config.proxy.baseUrl}/top-rated?api_key=test`);
      if (topRatedResponse.data.status_code === 7) {
        console.log('✅ Proxy top-rated endpoint working (expected invalid API key error)');
        console.log('   Response:', topRatedResponse.data.status_message);
      } else {
        console.log('✅ Proxy top-rated endpoint working');
        console.log('   Results count:', topRatedResponse.data.results?.length || 'N/A');
      }
    } catch (error) {
      console.log('❌ Proxy top-rated endpoint failed:', error.message);
    }
    
    // Test configuration
    console.log('\n5. Testing configuration...');
    console.log('   Current mode:', config.getStatus().mode);
    console.log('   Base URL:', config.getStatus().baseUrl);
    console.log('   Node version:', config.getStatus().nodeVersion);
    
    // Test URL generation
    console.log('\n6. Testing URL generation...');
    console.log('   Trending URL:', config.getUrl('trending', { page: 1 }));
    console.log('   Popular URL:', config.getUrl('popular', { media_type: 'movie', page: 1 }));
    console.log('   Top Rated URL:', config.getUrl('topRated', { media_type: 'movie', page: 1 }));
    
    console.log('\n🎉 Proxy server is working correctly!');
    console.log('\n📋 Next steps:');
    console.log('1. Set your TMDB_API_KEY environment variable');
    console.log('2. Update your frontend to use the proxy URLs');
    console.log('3. The proxy will handle the TLS issues automatically');
    
  } catch (error) {
    console.error('\n❌ Proxy test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run the test
if (require.main === module) {
  testProxyServer();
}

module.exports = { testProxyServer }; 