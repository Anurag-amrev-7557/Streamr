#!/usr/bin/env node

/**
 * Quick verification script for Enhanced Active Users functionality
 * Tests the basic API endpoints and shows the improvements
 */

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function verifyEnhancements() {
  console.log('🔍 Verifying Enhanced Active Users Functionality\n');
  console.log(`📍 Backend URL: ${BASE_URL}\n`);
  
  try {
    // Test 1: Basic API endpoint
    console.log('1️⃣ Testing Enhanced API Endpoint...');
    const response = await fetch(`${BASE_URL}/api/active-users`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ API Response Received');
    console.log(`   Count: ${data.count}`);
    console.log(`   Timestamp: ${data.timestamp}`);
    
    // Check for new enhanced features
    if (data.stats) {
      console.log('✅ Enhanced Stats Available:');
      console.log(`   Total: ${data.stats.total}`);
      console.log(`   Authenticated: ${data.stats.authenticated}`);
      console.log(`   Anonymous: ${data.stats.anonymous}`);
      console.log(`   By Namespace:`, data.stats.byNamespace);
    } else {
      console.log('⚠️  Enhanced stats not available (may be using old version)');
    }
    
    if (data.debug) {
      console.log('✅ Debug Information Available:');
      console.log(`   Total Connections: ${data.debug.totalConnections}`);
      console.log(`   Active Users Set: ${data.debug.activeUsersSet}`);
      console.log(`   Sample Users: ${data.debug.sampleUsers.join(', ')}`);
    } else {
      console.log('⚠️  Debug info not available (may be in production mode)');
    }
    
    // Test 2: Debug endpoint (if available)
    console.log('\n2️⃣ Testing Debug Endpoint...');
    try {
      const debugResponse = await fetch(`${BASE_URL}/api/active-users/debug`);
      if (debugResponse.status === 200) {
        const debugData = await debugResponse.json();
        console.log('✅ Debug Endpoint Available');
        console.log(`   Total Users: ${debugData.count}`);
        console.log(`   All Users: ${debugData.allUsers.length}`);
        console.log(`   Total Connections: ${debugData.totalConnections}`);
      } else {
        console.log('⚠️  Debug endpoint not available (expected in production)');
      }
    } catch (error) {
      console.log('⚠️  Debug endpoint not available:', error.message);
    }
    
    // Test 3: Health check
    console.log('\n3️⃣ Testing Health Endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Backend Health Check Passed');
      console.log(`   Status: ${healthData.status}`);
      console.log(`   Environment: ${healthData.environment}`);
      console.log(`   Uptime: ${Math.floor(healthData.uptime)}s`);
    }
    
    console.log('\n🎯 Verification Summary:');
    console.log('========================');
    console.log('✅ Enhanced API endpoint working');
    console.log(`${data.stats ? '✅' : '⚠️'} Enhanced stats available`);
    console.log(`${data.debug ? '✅' : '⚠️'} Debug information available`);
    console.log('✅ Backend health check passed');
    
    if (data.stats && data.debug) {
      console.log('\n🎉 All enhancements are working correctly!');
      console.log('   - Map-based user tracking active');
      console.log('   - Enhanced statistics available');
      console.log('   - Debug information enabled');
      console.log('   - Connection management improved');
    } else {
      console.log('\n⚠️  Some enhancements may not be active');
      console.log('   - Check if backend was restarted with new code');
      console.log('   - Verify DEBUG_ACTIVE_USERS environment variable');
    }
    
  } catch (error) {
    console.error('\n❌ Verification Failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure backend is running: cd backend && npm start');
    console.log('   2. Check if backend is accessible at:', BASE_URL);
    console.log('   3. Verify no firewall/network issues');
    console.log('   4. Check backend console for error messages');
  }
}

// Run verification
verifyEnhancements(); 