#!/usr/bin/env node

// Test script to verify backend endpoints
const axios = require('axios');

const BASE_URL = 'https://streamr-jjj9.onrender.com/api';

async function testEndpoint(endpoint, description) {
  try {
    console.log(`\n🧪 Testing ${description}...`);
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      timeout: 10000
    });
    console.log(`✅ ${description}: ${response.status} - ${response.data?.results?.length || 0} results`);
    return true;
  } catch (error) {
    console.log(`❌ ${description}: ${error.response?.status || 'Network Error'} - ${error.message}`);
    return false;
  }
}

async function testHealthEndpoints() {
  console.log('🏥 Testing Health Endpoints...');
  
  await testEndpoint('/health', 'Health Check');
  await testEndpoint('/tmdb/health', 'TMDB Health Check');
}

async function testTMDBEndpoints() {
  console.log('\n🎬 Testing TMDB Endpoints...');
  
  await testEndpoint('/tmdb/trending', 'Trending Movies');
  await testEndpoint('/tmdb/popular', 'Popular Movies');
  await testEndpoint('/tmdb/top-rated', 'Top Rated Movies');
  await testEndpoint('/tmdb/upcoming', 'Upcoming Movies');
  await testEndpoint('/tmdb/now-playing', 'Now Playing Movies');
}

async function testCommunityEndpoints() {
  console.log('\n👥 Testing Community Endpoints...');
  
  await testEndpoint('/community/discussions', 'Community Discussions');
  await testEndpoint('/community/trending', 'Community Trending');
  await testEndpoint('/community/stats', 'Community Stats');
  await testEndpoint('/community/categories', 'Community Categories');
  await testEndpoint('/community/tags', 'Community Tags');
}

async function runTests() {
  console.log('🚀 Starting Backend Endpoint Tests...\n');
  
  try {
    await testHealthEndpoints();
    await testTMDBEndpoints();
    await testCommunityEndpoints();
    
    console.log('\n✨ All tests completed!');
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { testEndpoint, runTests }; 