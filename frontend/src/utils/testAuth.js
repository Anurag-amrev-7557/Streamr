import { getApiUrl } from '../config/api';

// Test authentication flow
export const testAuthFlow = async () => {
  console.log('Testing authentication flow...');
  
  try {
    // Test 1: Check if we can access the health endpoint
    const healthResponse = await fetch(`${getApiUrl()}/health`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (healthResponse.ok) {
      console.log('✅ Health endpoint accessible');
    } else {
      console.log('❌ Health endpoint not accessible');
    }
    
    // Test 2: Check if we have an access token
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      console.log('✅ Access token found in localStorage');
      
      // Test 3: Try to get user profile with existing token
      const profileResponse = await fetch(`${getApiUrl()}/user/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (profileResponse.ok) {
        console.log('✅ User profile accessible with existing token');
      } else {
        console.log('❌ User profile not accessible with existing token');
        
        // Test 4: Try to refresh token
        console.log('Attempting token refresh...');
        const refreshResponse = await fetch(`${getApiUrl()}/auth/refresh-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (refreshResponse.ok) {
          console.log('✅ Token refresh successful');
          const refreshData = await refreshResponse.json();
          if (refreshData.data && refreshData.data.accessToken) {
            localStorage.setItem('accessToken', refreshData.data.accessToken);
            console.log('✅ New access token stored');
          }
        } else {
          console.log('❌ Token refresh failed');
        }
      }
    } else {
      console.log('❌ No access token found in localStorage');
    }
    
    // Test 5: Check cookies
    console.log('Cookies:', document.cookie);
    
  } catch (error) {
    console.error('❌ Auth flow test failed:', error);
  }
};

// Test login flow
export const testLoginFlow = async (email, password) => {
  console.log('Testing login flow...');
  
  try {
    const loginResponse = await fetch(`${getApiUrl()}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful');
      console.log('Login response:', loginData);
      
      if (loginData.data && loginData.data.accessToken) {
        localStorage.setItem('accessToken', loginData.data.accessToken);
        console.log('✅ Access token stored');
      }
      
      return loginData;
    } else {
      const errorData = await loginResponse.json();
      console.log('❌ Login failed:', errorData);
      return errorData;
    }
  } catch (error) {
    console.error('❌ Login test failed:', error);
    return { error: error.message };
  }
}; 