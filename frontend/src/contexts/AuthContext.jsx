import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getApiUrl, switchBackendMode, getCurrentBackendMode } from '../config/api';

// Authentication API functions
const authAPI = {
  refreshToken: async () => {
    try {
      console.log('🔄 Frontend: Attempting token refresh...');
      console.log('🌐 Frontend: API URL:', getApiUrl());
      console.log('🍪 Frontend: Cookies available:', document.cookie ? 'Yes' : 'No');
      
      // Check if we have a refresh token in localStorage as fallback
      const storedRefreshToken = localStorage.getItem('refreshToken');
      console.log('💾 Frontend: Stored refresh token:', storedRefreshToken ? 'Available' : 'Not found');
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // Add Authorization header if we have a stored refresh token
      if (storedRefreshToken) {
        headers['Authorization'] = `Bearer ${storedRefreshToken}`;
        console.log('🔑 Frontend: Using stored refresh token in Authorization header');
      }
      
      const response = await fetch(`${getApiUrl()}/auth/refresh-token`, {
        method: 'POST',
        headers,
        credentials: 'include', // This is crucial for sending cookies
      });
      
      console.log('📡 Frontend: Response status:', response.status);
      console.log('📡 Frontend: Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Frontend: Response error:', errorText);
        throw new Error('Token refresh failed');
      }
      
      const data = await response.json();
      console.log('✅ Frontend: Refresh successful:', data);
      
      // Store new refresh token in localStorage if provided
      if (data.data && data.data.refreshToken) {
        localStorage.setItem('refreshToken', data.data.refreshToken);
        console.log('💾 Frontend: Stored new refresh token in localStorage');
      }
      
      return data;
    } catch (error) {
      console.error('❌ Frontend: Token refresh error:', error);
      throw error;
    }
  },
  
  login: async (credentials) => {
    try {
      const response = await fetch(`${getApiUrl()}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include', // This is crucial for receiving cookies
      });
      
      if (!response.ok) {
        throw new Error('Login failed');
      }
      
      const data = await response.json();
      
      // Store refresh token in localStorage for fallback
      if (data.data && data.data.refreshToken) {
        localStorage.setItem('refreshToken', data.data.refreshToken);
        console.log('💾 Frontend: Stored refresh token in localStorage during login');
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  logout: async () => {
    try {
      const response = await fetch(`${getApiUrl()}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // This is crucial for clearing cookies
      });
      
      // Clear refresh token from localStorage
      localStorage.removeItem('refreshToken');
      console.log('💾 Frontend: Cleared refresh token from localStorage during logout');
      
      return await response.json();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },
  
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
  }
};

const userAPI = {
  getProfile: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token');
      }
      
      const response = await fetch(`${getApiUrl()}/user/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to get user profile');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },
  
  updateProfile: async (userData) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token');
      }
      
      const response = await fetch(`${getApiUrl()}/user/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },
  
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

const AuthContext = createContext(null);

// Token refresh interval (14 minutes - refresh before 15-minute expiration)
const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000;
// Session timeout (2 days)
const SESSION_TIMEOUT = 2 * 24 * 60 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [rememberMe, setRememberMe] = useState(false);
  const [refreshTokenTimeout, setRefreshTokenTimeout] = useState(null);
  const [sessionWarning, setSessionWarning] = useState(false);

  // Use refs to track timeouts and intervals for proper cleanup
  const refreshTokenTimeoutRef = useRef(null);
  const sessionCheckIntervalRef = useRef(null);
  const activityListenersRef = useRef([]);
  const isMountedRef = useRef(true);

  // Update last activity time
  const updateActivity = useCallback(() => {
    if (isMountedRef.current) {
      setLastActivity(Date.now());
      setSessionWarning(false);
    }
  }, []);

  // Check session timeout
  useEffect(() => {
    const checkSessionTimeout = () => {
      if (!isMountedRef.current) return;
      
      const timeLeft = SESSION_TIMEOUT - (Date.now() - lastActivity);
      
      // Show warning 1 hour before timeout
      if (timeLeft <= 60 * 60 * 1000 && !sessionWarning) {
        setSessionWarning(true);
      }
      
      // Logout if session expired
      if (!rememberMe && timeLeft <= 0) {
        console.log('Session timed out');
        logout();
      }
    };

    sessionCheckIntervalRef.current = setInterval(checkSessionTimeout, 60000); // Check every minute
    
    return () => {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
    };
  }, [lastActivity, rememberMe, sessionWarning]);

  // Add activity listeners
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const listeners = [];
    
    events.forEach(event => {
      const listener = () => updateActivity();
      window.addEventListener(event, listener);
      listeners.push({ event, listener });
    });

    activityListenersRef.current = listeners;

    return () => {
      listeners.forEach(({ event, listener }) => {
        window.removeEventListener(event, listener);
      });
      activityListenersRef.current = [];
    };
  }, [updateActivity]);

  // Function to refresh token and update user data
  const refreshTokenAndUserData = useCallback(async () => {
    try {
      console.log('🔄 Attempting to refresh token...');
      console.log('🌐 Using API URL:', getApiUrl());
      const response = await authAPI.refreshToken();
      
      console.log('🔄 Refresh response:', response);
      
      if (!response.success) {
        throw new Error('Token refresh failed');
      }
      
      const { accessToken } = response.data || response;
      
      if (!accessToken) {
        console.error('❌ No access token received from refresh');
        return false;
      }

      localStorage.setItem('accessToken', accessToken);
      console.log('✅ New access token stored');
      
      // Get fresh user data
      console.log('🔄 Getting user profile after refresh...');
      const profileResponse = await userAPI.getProfile();
      if (!profileResponse.data) {
        console.error('❌ No user data received after refresh');
        return false;
      }

      if (isMountedRef.current) {
        setUser(profileResponse.data);
        setLastActivity(Date.now());
        setSessionWarning(false);
        console.log('✅ Token refresh successful');
      }
      return true;
    } catch (err) {
      console.error('❌ Token refresh failed:', err);
      
      // If refresh token is expired or invalid, clear everything
      if (err.message.includes('401') || err.message.includes('Unauthorized') || err.message.includes('No refresh token provided')) {
        console.log('🔄 Refresh token expired or invalid, clearing auth state...');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken'); // Also clear refresh token
        if (isMountedRef.current) {
          setUser(null);
          setSessionWarning(false);
        }
      }
      
      return false;
    }
  }, []);

  // Automatic token refresh
  useEffect(() => {
    let refreshTimeout = null;

    const scheduleRefresh = async () => {
      if (!isMountedRef.current) return;

      // Clear any existing timeout
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
        refreshTimeout = null;
      }

      // Set new timeout - refresh 1 minute before token expires
      refreshTimeout = setTimeout(async () => {
        if (!isMountedRef.current) return;
        
        console.log('Scheduled token refresh...');
        const success = await refreshTokenAndUserData();
        if (success && isMountedRef.current) {
          scheduleRefresh(); // Schedule next refresh only if successful
        } else if (isMountedRef.current) {
          // If refresh failed, try again in 30 seconds
          console.log('Token refresh failed, retrying in 30 seconds...');
          refreshTimeout = setTimeout(scheduleRefresh, 30000);
        }
      }, TOKEN_REFRESH_INTERVAL - 60000); // Refresh 1 minute before expiration

      refreshTokenTimeoutRef.current = refreshTimeout;
    };

    if (user) {
      scheduleRefresh();
    }

    return () => {
      if (refreshTokenTimeoutRef.current) {
        clearTimeout(refreshTokenTimeoutRef.current);
        refreshTokenTimeoutRef.current = null;
      }
    };
  }, [user, refreshTokenAndUserData]);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔍 Checking authentication on mount...');
        const token = localStorage.getItem('accessToken');
        
        if (!token) {
          // No token in localStorage, check if we have a refresh token
          console.log('No access token in localStorage, checking for refresh token...');
          
          // Check if we have any cookies or localStorage refresh token
          const hasCookies = document.cookie.length > 0;
          const hasStoredRefreshToken = localStorage.getItem('refreshToken');
          console.log('🍪 Cookies available:', hasCookies ? 'Yes' : 'No');
          console.log('💾 Stored refresh token:', hasStoredRefreshToken ? 'Available' : 'Not found');
          
          if (!hasCookies && !hasStoredRefreshToken) {
            console.log('🔄 No refresh tokens found, user not authenticated');
            setLoading(false);
            setUser(null);
            return;
          }
          
          // Try to refresh token
          console.log('🔄 Attempting token refresh...');
          const refreshSuccess = await refreshTokenAndUserData();
          if (!refreshSuccess && isMountedRef.current) {
            console.log('🔄 Token refresh failed, user not authenticated');
            setLoading(false);
            setUser(null);
          }
          return;
        }

        try {
          // Get user profile first
          console.log('🔍 Attempting to get user profile...');
          const profileResponse = await userAPI.getProfile();
          if (!isMountedRef.current) return;

          if (profileResponse.data) {
            setUser(profileResponse.data);
            console.log('✅ User authenticated from existing token');
          } else {
            // If profile is empty, logout
            throw new Error('No user data found');
          }
        } catch (profileError) {
          console.error('❌ Profile fetch failed, attempting to refresh token:', profileError);
          if (!isMountedRef.current) return;
          
          // If profile fetch fails, try to refresh token once
          const refreshSuccess = await refreshTokenAndUserData();
          if (!refreshSuccess && isMountedRef.current) {
            // If refresh also fails, clear auth state
            console.log('🔄 Token refresh failed, clearing auth state');
            localStorage.removeItem('accessToken');
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        if (isMountedRef.current) {
          localStorage.removeItem('accessToken');
          setUser(null);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMountedRef.current = false;
    };
  }, [refreshTokenAndUserData]);

  const reloadUser = async () => {
    try {
      const profileResponse = await userAPI.getProfile();
      if (profileResponse.data) {
        setUser(profileResponse.data);
      } else {
        throw new Error('No user data found');
      }
    } catch (error) {
      console.error('Failed to reload user:', error);
    }
  };

  const login = useCallback(async (emailOrUser, password, remember = false) => {
    try {
      setLoading(true);
      setError(null);
      setRememberMe(remember);
      
      // If only one argument is provided and it's an object, it's an OAuth login
      if (!password && typeof emailOrUser === 'object') {
        const { user, accessToken } = emailOrUser;
        if (accessToken) {
          localStorage.setItem('accessToken', accessToken);
        }
        setUser(user);
        setLastActivity(Date.now());
        setSessionWarning(false);
        setLoading(false);
        return { success: true };
      }
      
      // Regular email/password login
      const response = await authAPI.login({ email: emailOrUser, password: password });
      
      if (!response.success) {
        throw new Error(response.message || 'Login failed');
      }
      
      // Set user data and token
      const { user, accessToken } = response.data;
      if (!accessToken) {
        throw new Error('No access token received from login');
      }
      
      localStorage.setItem('accessToken', accessToken);
      setUser(user);
      setLastActivity(Date.now());
      setSessionWarning(false);
      setLoading(false);
      console.log('Login successful');
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to login';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  }, []);

  const signup = async (userData) => {
    try {
      setError(null);
      const response = await authAPI.signup(userData);
      
      // Set user data and token
      const { accessToken, user } = response.data;
      if (!accessToken) {
        throw new Error('No access token received from signup');
      }
      
      localStorage.setItem('accessToken', accessToken);
      setUser(user);
      setLastActivity(Date.now());
      console.log('Signup successful');
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to create account';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      // Clear all timeouts and intervals
      if (refreshTokenTimeoutRef.current) {
        clearTimeout(refreshTokenTimeoutRef.current);
        refreshTokenTimeoutRef.current = null;
      }
      
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
      
      setUser(null);
      setRememberMe(false);
      localStorage.removeItem('accessToken');
      console.log('Logout successful');
    }
  }, []);

  const forgotPassword = async (email) => {
    try {
      setError(null);
      await authAPI.forgotPassword(email);
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to send reset email';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      setError(null);
      await authAPI.resetPassword(token, newPassword);
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to reset password';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const verifyEmail = async (token) => {
    try {
      const response = await authAPI.verifyEmail(token);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  };

  // Cleanup function for component unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Clear all timeouts and intervals
      if (refreshTokenTimeoutRef.current) {
        clearTimeout(refreshTokenTimeoutRef.current);
        refreshTokenTimeoutRef.current = null;
      }
      
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
      
      // Remove activity listeners
      activityListenersRef.current.forEach(({ event, listener }) => {
        window.removeEventListener(event, listener);
      });
      activityListenersRef.current = [];
    };
  }, []);

  const value = {
    user,
    loading,
    error,
    rememberMe,
    sessionWarning,
    login,
    signup,
    logout,
    forgotPassword,
    resetPassword,
    verifyEmail,
    updateActivity,
    reloadUser,
    switchBackendMode,
    getCurrentBackendMode
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 