import { getApiUrl } from '../config/api';

// Debug utility for authentication issues
export const debugAuth = {
  // Test if cookies are being sent properly
  testCookieSending: async () => {
    try {
      console.log('🔍 Testing cookie sending...');
      console.log('🌐 API URL:', getApiUrl());
      
      const response = await fetch(`${getApiUrl()}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      console.log('📊 Response status:', response.status);
      console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      console.log('📊 Response data:', data);
      
      return { success: response.ok, data, status: response.status };
    } catch (error) {
      console.error('❌ Cookie test failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Test login and check if refresh token cookie is set
  testLoginFlow: async (email, password) => {
    try {
      console.log('🔍 Testing login flow...');
      
      const loginResponse = await fetch(`${getApiUrl()}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      
      console.log('📊 Login response status:', loginResponse.status);
      console.log('📊 Login response headers:', Object.fromEntries(loginResponse.headers.entries()));
      
      const loginData = await loginResponse.json();
      console.log('📊 Login response data:', loginData);
      
      if (loginResponse.ok) {
        // Wait a moment then test refresh token
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const refreshResponse = await fetch(`${getApiUrl()}/auth/refresh-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        console.log('📊 Refresh response status:', refreshResponse.status);
        const refreshData = await refreshResponse.json();
        console.log('📊 Refresh response data:', refreshData);
        
        return {
          loginSuccess: loginResponse.ok,
          refreshSuccess: refreshResponse.ok,
          loginData,
          refreshData
        };
      }
      
      return { loginSuccess: false, loginData };
    } catch (error) {
      console.error('❌ Login flow test failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Check current cookies
  checkCookies: () => {
    console.log('🍪 Current cookies:', document.cookie);
    return document.cookie;
  },

  // Test with explicit refresh token in Authorization header
  testWithAuthHeader: async (refreshToken) => {
    try {
      console.log('🔍 Testing with Authorization header...');
      
      const response = await fetch(`${getApiUrl()}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`
        },
        credentials: 'include',
      });
      
      console.log('📊 Response status:', response.status);
      const data = await response.json();
      console.log('📊 Response data:', data);
      
      return { success: response.ok, data, status: response.status };
    } catch (error) {
      console.error('❌ Auth header test failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Test cookie functionality
  testCookieFunctionality: async () => {
    try {
      console.log('🔍 Testing cookie functionality...');
      
      // First, set a test cookie
      const setResponse = await fetch(`${getApiUrl()}/test-cookie`, {
        method: 'GET',
        credentials: 'include',
      });
      
      console.log('📊 Set cookie response status:', setResponse.status);
      const setData = await setResponse.json();
      console.log('📊 Set cookie response data:', setData);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Then, try to read the cookie
      const readResponse = await fetch(`${getApiUrl()}/test-cookie-read`, {
        method: 'GET',
        credentials: 'include',
      });
      
      console.log('📊 Read cookie response status:', readResponse.status);
      const readData = await readResponse.json();
      console.log('📊 Read cookie response data:', readData);
      
      return { 
        setSuccess: setResponse.ok, 
        readSuccess: readResponse.ok, 
        setData, 
        readData 
      };
    } catch (error) {
      console.error('❌ Cookie functionality test failed:', error);
      return { success: false, error: error.message };
    }
  }
};

export default debugAuth; 