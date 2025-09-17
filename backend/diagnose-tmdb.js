#!/usr/bin/env node

/**
 * TMDB API Diagnostic Script
 * This script helps diagnose issues with the TMDB API endpoints
 */

const axios = require('axios');
const https = require('https');

// Configuration
const BACKEND_URL = 'https://streamr-jjj9.onrender.com';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Create a custom HTTPS agent with relaxed SSL settings
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  timeout: 30000
});

async function testBackendHealth() {
  console.log('🔍 Testing Backend Health...\n');
  
  try {
    // Test basic backend health
    const healthResponse = await axios.get(`${BACKEND_URL}/api/health`, {
      timeout: 10000,
      httpsAgent: httpsAgent
    });
    console.log('✅ Backend is running:', healthResponse.data);
  } catch (error) {
    console.log('❌ Backend health check failed:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    }
  }
}

async function testTMDBHealth() {
  console.log('\n🔍 Testing TMDB Health Endpoint...\n');
  
  try {
    const tmdbHealthResponse = await axios.get(`${BACKEND_URL}/api/tmdb/health`, {
      timeout: 10000,
      httpsAgent: httpsAgent
    });
    console.log('✅ TMDB Health:', tmdbHealthResponse.data);
    
    // Check if API key is configured
    if (tmdbHealthResponse.data.tmdb_api_key === 'missing') {
      console.log('⚠️  TMDB API key is not configured!');
      console.log('   This is likely the cause of the 500 errors.');
      console.log('   Please set the TMDB_API_KEY environment variable.');
    }
  } catch (error) {
    console.log('❌ TMDB health check failed:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    }
  }
}

async function testTMDBEndpoints() {
  console.log('\n🔍 Testing TMDB API Endpoints...\n');
  
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
        httpsAgent: httpsAgent
      });
      console.log(`✅ ${endpoint.name}: Success (${response.status})`);
      if (response.data.results) {
        console.log(`   Results count: ${response.data.results.length}`);
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
}

async function testDirectTMDB() {
  console.log('\n🔍 Testing Direct TMDB API Access...\n');
  
  // This will fail without an API key, but helps confirm the issue
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/trending/movie/week`, {
      timeout: 10000,
      httpsAgent: httpsAgent
    });
    console.log('✅ Direct TMDB API access works');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ TMDB API is accessible (401 Unauthorized expected without API key)');
    } else {
      console.log('❌ TMDB API access issue:', error.message);
    }
  }
}

async function checkEnvironment() {
  console.log('\n🔍 Environment Check...\n');
  
  console.log('Current working directory:', process.cwd());
  console.log('Node version:', process.version);
  console.log('Platform:', process.platform);
  
  // Check if .env file exists
  const fs = require('fs');
  const path = require('path');
  
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    console.log('✅ .env file found');
    
    // Read and check for TMDB_API_KEY
    const envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('TMDB_API_KEY=')) {
      const apiKeyLine = envContent.split('\n').find(line => line.startsWith('TMDB_API_KEY='));
      if (apiKeyLine) {
        const apiKey = apiKeyLine.split('=')[1];
        if (apiKey && apiKey !== 'your_tmdb_api_key_here' && apiKey.trim() !== '') {
          console.log('✅ TMDB_API_KEY is set in .env file');
        } else {
          console.log('⚠️  TMDB_API_KEY is set but appears to be a placeholder');
        }
      }
    } else {
      console.log('❌ TMDB_API_KEY not found in .env file');
    }
  } else {
    console.log('❌ .env file not found');
    console.log('   Please create a .env file based on env.example');
  }
}

async function main() {
  console.log('🚀 TMDB API Diagnostic Tool\n');
  console.log('This tool will help identify why your TMDB endpoints are returning 500 errors.\n');
  
  try {
    await testBackendHealth();
    await testTMDBHealth();
    await testTMDBEndpoints();
    await testDirectTMDB();
    await checkEnvironment();
    
    console.log('\n📋 Summary:');
    console.log('If you see "TMDB API key is not configured" above, that\'s the issue.');
    console.log('To fix this:');
    console.log('1. Get a TMDB API key from https://www.themoviedb.org/settings/api');
    console.log('2. Create a .env file in your backend directory');
    console.log('3. Add: TMDB_API_KEY=your_actual_api_key_here');
    console.log('4. Restart your backend server');
    
  } catch (error) {
    console.error('\n💥 Diagnostic failed:', error.message);
  }
}

// Run the diagnostic
if (require.main === module) {
  main();
}

module.exports = { testBackendHealth, testTMDBHealth, testTMDBEndpoints }; 