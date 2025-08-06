// Fix Backend Connection Utility
// This script helps resolve authentication issues by switching to local backend

import { switchBackend } from './backendSwitcher.js';

export const fixBackendConnection = () => {
  console.log('🔧 Fixing backend connection...');
  
  // Clear any problematic tokens
  localStorage.removeItem('accessToken');
  
  // Clear any cookies that might be causing issues
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
  
  // Switch to local backend
  const success = switchBackend('local');
  
  if (success) {
    console.log('✅ Switched to local backend successfully');
    console.log('🔄 Page will reload to apply changes...');
  } else {
    console.error('❌ Failed to switch backend');
  }
  
  return success;
};

// Make it available globally for easy access
if (typeof window !== 'undefined') {
  window.fixBackendConnection = fixBackendConnection;
  console.log('🔧 Backend connection fixer available:');
  console.log('- fixBackendConnection()');
} 