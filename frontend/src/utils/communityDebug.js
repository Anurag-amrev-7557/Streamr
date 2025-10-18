// Community API Debugging Utility
import { getApiUrl } from '../config/api';

export const debugCommunityAPI = async () => {
  const apiUrl = getApiUrl();
  console.log('🔍 Community API Debug Info:');
  console.log('API URL:', apiUrl);
  console.log('Current mode:', import.meta.env.MODE);
  console.log('Environment:', import.meta.env.DEV ? 'development' : 'production');
  
  try {
    // Test basic connectivity
    console.log('Testing basic connectivity...');
    const healthResponse = await fetch(`${apiUrl.replace('/api', '')}/api/health`);
    console.log('Health check status:', healthResponse.status);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('Health check data:', healthData);
    }
    
    // Test community discussions endpoint
    console.log('Testing community discussions endpoint...');
    const discussionsResponse = await fetch(`${apiUrl}/community/discussions?page=1&limit=5`);
    console.log('Discussions endpoint status:', discussionsResponse.status);
    
    if (discussionsResponse.ok) {
      const discussionsData = await discussionsResponse.json();
      console.log('Discussions data:', discussionsData);
    } else {
      const errorText = await discussionsResponse.text();
      console.error('Discussions endpoint error:', errorText);
    }
    
    // Test with authentication
    const token = localStorage.getItem('accessToken');
    if (token) {
      console.log('Testing with authentication...');
      const authResponse = await fetch(`${apiUrl}/community/discussions?page=1&limit=5`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Authenticated discussions status:', authResponse.status);
    } else {
      console.log('No authentication token found');
    }
    
  } catch (error) {
    console.error('Debug test failed:', error);
  }
};

export const testCommunityService = async () => {
  const { communityService } = await import('../services/communityService');
  
  try {
    console.log('Testing community service...');
    const discussions = await communityService.getDiscussions(1, 5);
    console.log('Community service result:', discussions);
    return discussions;
  } catch (error) {
    console.error('Community service test failed:', error);
    throw error;
  }
};

// Auto-run debug in development
if (import.meta.env.DEV) {
  console.log('🚀 Development mode detected - community debug available');
  window.debugCommunityAPI = debugCommunityAPI;
  window.testCommunityService = testCommunityService;
} 