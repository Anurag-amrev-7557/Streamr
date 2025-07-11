import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, userAPI, api } from '../services/api';

const AuthContext = createContext(null);

// Token refresh interval (4 minutes)
const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000;
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

  // Update last activity time
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
    setSessionWarning(false);
  }, []);

  // Check session timeout
  useEffect(() => {
    const checkSessionTimeout = () => {
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

    const interval = setInterval(checkSessionTimeout, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [lastActivity, rememberMe, sessionWarning]);

  // Add activity listeners
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [updateActivity]);

  // Function to refresh token and update user data
  const refreshTokenAndUserData = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('No access token found');
        return false;
      }

      const response = await authAPI.refreshToken();
      const { accessToken } = response.data || response;
      
      if (!accessToken) {
        console.error('No access token received from refresh');
        return false;
      }

      localStorage.setItem('accessToken', accessToken);
      
      // Get fresh user data
      const profileResponse = await userAPI.getProfile();
      if (!profileResponse.data) {
        console.error('No user data received after refresh');
        return false;
      }

      setUser(profileResponse.data);
      setLastActivity(Date.now());
      setSessionWarning(false);
      return true;
    } catch (err) {
      console.error('Token refresh failed:', err);
      localStorage.removeItem('accessToken');
      setUser(null);
      return false;
    }
  }, []);

  // Automatic token refresh
  useEffect(() => {
    let isMounted = true;
    let refreshTimeout = null;

    const scheduleRefresh = async () => {
      if (!isMounted) return;

      // Clear any existing timeout
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      // Set new timeout - refresh 1 minute before token expires
      refreshTimeout = setTimeout(async () => {
        if (!isMounted) return;
        
        const success = await refreshTokenAndUserData();
        if (success && isMounted) {
          scheduleRefresh(); // Schedule next refresh only if successful
        } else if (isMounted) {
          // If refresh failed, try again in 30 seconds
          refreshTimeout = setTimeout(scheduleRefresh, 30000);
        }
      }, TOKEN_REFRESH_INTERVAL - 60000); // Refresh 1 minute before expiration

      setRefreshTokenTimeout(refreshTimeout);
    };

    if (user) {
      scheduleRefresh();
    }

    return () => {
      isMounted = false;
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, [user, refreshTokenAndUserData]);

  // Check for existing session on mount
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          if (isMounted) {
            setLoading(false);
            setUser(null);
          }
          return;
        }

        // Add a loading check here to prevent race conditions during OAuth login
        // if (loading) return;

        try {
          // Get user profile first
          const profileResponse = await userAPI.getProfile();
          if (!isMounted) return;

          if (profileResponse.data) {
            setUser(profileResponse.data);
          } else {
            // If profile is empty, logout
            throw new Error('No user data found');
          }
        } catch (profileError) {
          console.error('Profile fetch failed, attempting to refresh token:', profileError);
          if (!isMounted) return;
          
          // If profile fetch fails, try to refresh token once
          const refreshSuccess = await refreshTokenAndUserData();
          if (!refreshSuccess && isMounted) {
            // If refresh also fails, logout
            throw new Error('Token refresh failed');
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        if (isMounted) {
          localStorage.removeItem('accessToken');
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [refreshTokenAndUserData]);

  // Add request interceptor to handle token refresh
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried to refresh token yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const success = await refreshTokenAndUserData();
            if (success) {
              // Update the failed request's authorization header
              const token = localStorage.getItem('accessToken');
              originalRequest.headers.Authorization = `Bearer ${token}`;
              // Retry the original request
              return api(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // If refresh fails, redirect to login
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
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
      const response = await authAPI.login(emailOrUser, password);
      
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
      const { accessToken, user } = response.data.data;
      if (!accessToken) {
        throw new Error('No access token received from signup');
      }
      
      localStorage.setItem('accessToken', accessToken);
      setUser(user);
      setLastActivity(Date.now());
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
      setUser(null);
      setRememberMe(false);
      localStorage.removeItem('accessToken');
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
    reloadUser
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