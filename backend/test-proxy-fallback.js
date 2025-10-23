#!/usr/bin/env node

/**
 * Test Proxy Fallback Mechanism
 * This script tests if the proxy fallback works when main TMDB API fails
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3001';
const PROXY_URL = 'http://localhost:5001';

async function testProxyFallback() {
  console.log('🧪 Testing Proxy Fallback Mechanism\n');
  
  // First, test if proxy server is running
  try {
    const proxyHealth = await axios.get(`${PROXY_URL}/health`);
    console.log('✅ Proxy server is running:', proxyHealth.data);
  } catch (error) {
    console.log('❌ Proxy server is not running. Please start it first:');
    console.log('   node tmdb-proxy-server.js');
    return;
  }
  
  // Test if main backend is running
  try {
    const backendHealth = await axios.get(`${BACKEND_URL}/api/health`);
    console.log('✅ Main backend is running:', backendHealth.data);
  } catch (error) {
    console.log('❌ Main backend is not running. Please start it first:');
    console.log('   npm start');
    return;
  }
  
  console.log('\n🔍 Testing TMDB endpoints with proxy fallback...\n');
  
  const endpoints = [
    { name: 'Trending', path: '/api/tmdb/trending' },
    { name: 'Popular', path: '/api/tmdb/popular' },
    { name: 'Top Rated', path: '/api/tmdb/top-rated' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name} endpoint...`);
      
      const response = await axios.get(`${BACKEND_URL}${endpoint.path}`, {
        timeout: 15000,
        params: {
          media_type: 'movie',
          page: 1
        }
      });
      
      console.log(`✅ ${endpoint.name}: Success (${response.status})`);
      if (response.data.results) {
        console.log(`   Results count: ${response.data.results.length}`);
      }
      
      // Check if response came from proxy (look for proxy headers or logs)
      if (response.headers['x-proxy-source']) {
        console.log(`   📡 Response served via proxy`);
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint.name}: Failed`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${error.response.data?.error || 'Unknown error'}`);
        if (error.response.data?.details) {
          console.log(`   Details: ${error.response.data.details}`);
        }
      } else {
        console.log(`   Error: ${error.message}`);
      }
    }
    console.log('');
  }
  
  console.log('🎯 Proxy Fallback Test Complete!');
  console.log('');
  console.log('If you see successful responses above, the proxy fallback is working.');
  console.log('If you still see 500 errors, check the backend logs for more details.');
}

// Run the test
testProxyFallback().catch(console.error); 