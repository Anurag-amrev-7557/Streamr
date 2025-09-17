// Test script to debug refresh token issues
import { getApiUrl } from '../config/api';

export const testRefreshTokenFlow = async () => {
  console.log('🧪 Testing refresh token flow...');
  
  try {
    // Step 1: Test login to get refresh token cookie
    console.log('📝 Step 1: Testing login...');
    const loginResponse = await fetch(`${getApiUrl()}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com', // Replace with actual test credentials
        password: 'testpassword'
      }),
      credentials: 'include',
    });
    
    console.log('📡 Login response status:', loginResponse.status);
    console.log('📡 Login response headers:', loginResponse.headers);
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('❌ Login failed:', errorText);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful:', loginData);
    
    // Check if refresh token was stored in localStorage
    const storedRefreshToken = localStorage.getItem('refreshToken');
    console.log('💾 Refresh token in localStorage:', storedRefreshToken ? 'Available' : 'Not found');
    
    // Step 2: Test refresh token with localStorage fallback
    console.log('🔄 Step 2: Testing refresh token...');
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Add Authorization header if we have a stored refresh token
    if (storedRefreshToken) {
      headers['Authorization'] = `Bearer ${storedRefreshToken}`;
      console.log('🔑 Using stored refresh token in Authorization header');
    }
    
    const refreshResponse = await fetch(`${getApiUrl()}/auth/refresh-token`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });
    
    console.log('📡 Refresh response status:', refreshResponse.status);
    console.log('📡 Refresh response headers:', refreshResponse.headers);
    
    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      console.error('❌ Refresh failed:', errorText);
      return;
    }
    
    const refreshData = await refreshResponse.json();
    console.log('✅ Refresh successful:', refreshData);
    
    // Check if new refresh token was stored
    const newStoredRefreshToken = localStorage.getItem('refreshToken');
    console.log('💾 New refresh token in localStorage:', newStoredRefreshToken ? 'Available' : 'Not found');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Test cookie availability
export const testCookies = () => {
  console.log('🍪 Testing cookies...');
  console.log('Document cookies:', document.cookie);
  console.log('Cookie length:', document.cookie.length);
  
  // Check if we can access cookies
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});
  
  console.log('Parsed cookies:', cookies);
  return cookies;
};

// Test API connectivity
export const testApiConnectivity = async () => {
  console.log('🌐 Testing API connectivity...');
  
  try {
    const response = await fetch(`${getApiUrl()}/health`, {
      method: 'GET',
      credentials: 'include',
    });
    
    console.log('📡 Health check status:', response.status);
    const data = await response.json();
    console.log('📡 Health check data:', data);
    
    return response.ok;
  } catch (error) {
    console.error('❌ API connectivity test failed:', error);
    return false;
  }
};

// Test current authentication state
export const testCurrentAuthState = () => {
  console.log('🔍 Testing current authentication state...');
  
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const cookies = document.cookie;
  
  console.log('🔑 Access token:', accessToken ? 'Available' : 'Not found');
  console.log('💾 Refresh token:', refreshToken ? 'Available' : 'Not found');
  console.log('🍪 Cookies:', cookies ? cookies : 'No cookies');
  
  return {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    hasCookies: !!cookies,
    cookieCount: cookies ? cookies.split(';').length : 0
  };
}; 