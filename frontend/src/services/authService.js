import { getApiUrl } from '../config/api';

/**
 * Authentication API service
 * Handles all authentication-related API calls
 */
export const authAPI = {
  /**
   * Refresh the authentication token
   * @returns {Promise<Object>} Response with new tokens
   */
  refreshToken: async () => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (storedRefreshToken) {
        headers['Authorization'] = `Bearer ${storedRefreshToken}`;
      }
      
      const response = await fetch(`${getApiUrl()}/auth/refresh-token`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Frontend: Token refresh failed:', errorText);
        throw new Error('Token refresh failed');
      }
      
      const data = await response.json();
      
      if (data.data?.refreshToken) {
        localStorage.setItem('refreshToken', data.data.refreshToken);
      }
      
      return data;
    } catch (error) {
      console.error('❌ Frontend: Token refresh error:', error);
      throw error;
    }
  },
  
  /**
   * Login with email and password
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.email - User email
   * @param {string} credentials.password - User password
   * @returns {Promise<Object>} Response with user data and tokens
   */
  login: async (credentials) => {
    try {
      const response = await fetch(`${getApiUrl()}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
      });

      let data = null;
      try {
        data = await response.json();
      } catch (e) {
        // Ignore JSON parse errors
      }

      if (!response.ok) {
        const errorMessage =
          data?.message ||
          (Array.isArray(data?.errors) && data.errors[0]?.msg) ||
          'Login failed';
        throw new Error(errorMessage);
      }

      if (data?.data?.refreshToken) {
        localStorage.setItem('refreshToken', data.data.refreshToken);
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  /**
   * Logout the current user
   * @returns {Promise<Object>} Logout response
   */
  logout: async () => {
    try {
      const response = await fetch(`${getApiUrl()}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      localStorage.removeItem('refreshToken');
      
      return await response.json();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },
  
  /**
   * Request a password reset email
   * @param {string} email - User email
   * @returns {Promise<Object>} Response
   */
  forgotPassword: async (email) => {
    try {
      const response = await fetch(`${getApiUrl()}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        throw new Error('Forgot password request failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  },
  
  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Response
   */
  resetPassword: async (token, newPassword) => {
    try {
      const response = await fetch(`${getApiUrl()}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });
      
      if (!response.ok) {
        throw new Error('Password reset failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  },
  
  /**
   * Verify email with token
   * @param {string} token - Verification token
   * @returns {Promise<Object>} Response
   */
  verifyEmail: async (token) => {
    try {
      const response = await fetch(`${getApiUrl()}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      if (!response.ok) {
        throw new Error('Email verification failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  },

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Response with user data and tokens
   */
  signup: async (userData) => {
    try {
      const response = await fetch(`${getApiUrl()}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Signup failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }
};
