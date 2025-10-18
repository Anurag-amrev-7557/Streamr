import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { switchBackendMode, getCurrentBackendMode } from '../config/api';
import { detectAndUpdateUserLocation } from '../services/locationService';
import { authAPI } from '../services/authService';
import { userAPI } from '../services/userService';
import { toast } from 'react-hot-toast';

const AuthContext = createContext(null);

// Constants
const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000; // 14 minutes
const SESSION_TIMEOUT = 2 * 24 * 60 * 60 * 1000; // 2 days
const SESSION_WARNING_TIME = 60 * 60 * 1000; // 1 hour before timeout
const SESSION_CHECK_INTERVAL = 60000; // Check every minute
const REFRESH_RETRY_DELAY = 30000; // 30 seconds

/**
 * Dispatch authentication change events
 * @param {string} action - The action that triggered the event ('login' or 'logout')
 */
const dispatchAuthEvents = (action) => {
  window.dispatchEvent(new CustomEvent('auth-changed', { detail: { action } }));
  window.dispatchEvent(new Event('account-reload'));
};

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
  const logoutRef = useRef(null);

  // Update last activity time
  const updateActivity = useCallback(() => {
    if (isMountedRef.current) {
      setLastActivity(Date.now());
      setSessionWarning(false);
    }
  }, []);

  // Check session timeout
  useEffect(() => {
    if (!user) return;

    const checkSessionTimeout = () => {
      if (!isMountedRef.current) return;
      
      const timeLeft = SESSION_TIMEOUT - (Date.now() - lastActivity);
      
      // Show warning 1 hour before timeout
      if (timeLeft <= SESSION_WARNING_TIME && !sessionWarning) {
        setSessionWarning(true);
      }
      
      // Logout if session expired and remember me is false
      if (!rememberMe && timeLeft <= 0 && logoutRef.current) {
        logoutRef.current();
      }
    };

    sessionCheckIntervalRef.current = setInterval(checkSessionTimeout, SESSION_CHECK_INTERVAL);
    
    return () => {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
    };
  }, [user, lastActivity, rememberMe, sessionWarning]);

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
      const response = await authAPI.refreshToken();
      
      if (!response.success) {
        throw new Error('Token refresh failed');
      }
      
      const { accessToken } = response.data || response;
      
      if (!accessToken) {
        console.error('❌ No access token received from refresh');
        return false;
      }

      localStorage.setItem('accessToken', accessToken);
      
      const profileResponse = await userAPI.getProfile();
      if (!profileResponse.data) {
        console.error('❌ No user data received after refresh');
        return false;
      }

      if (isMountedRef.current) {
        setUser(profileResponse.data);
        setLastActivity(Date.now());
        setSessionWarning(false);
      }
      return true;
    } catch (err) {
      console.error('❌ Token refresh failed:', err);
      
      // If refresh token is expired or invalid, clear everything
      const isAuthError = err.message.includes('401') || 
                         err.message.includes('Unauthorized') || 
                         err.message.includes('No refresh token provided');
      
      if (isAuthError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
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
    if (!user) return;

    let refreshTimeout = null;

    const scheduleRefresh = async () => {
      if (!isMountedRef.current) return;

      // Clear any existing timeout
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
        refreshTimeout = null;
      }

      // Refresh 1 minute before token expires
      refreshTimeout = setTimeout(async () => {
        if (!isMountedRef.current) return;
        
        const success = await refreshTokenAndUserData();
        if (success && isMountedRef.current) {
          scheduleRefresh(); // Schedule next refresh
        } else if (isMountedRef.current) {
          // If refresh failed, retry in 30 seconds
          refreshTimeout = setTimeout(scheduleRefresh, REFRESH_RETRY_DELAY);
        }
      }, TOKEN_REFRESH_INTERVAL - 60000);

      refreshTokenTimeoutRef.current = refreshTimeout;
    };

    scheduleRefresh();

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
        const token = localStorage.getItem('accessToken');
        
        if (!token) {
          // No token in localStorage, check if we have a refresh token
          
          // Check if we have any cookies or localStorage refresh token
          const hasCookies = document.cookie.length > 0;
          const hasStoredRefreshToken = localStorage.getItem('refreshToken');
          
          if (!hasCookies && !hasStoredRefreshToken) {
            setLoading(false);
            setUser(null);
            return;
          }
          
          // Try to refresh token
          const refreshSuccess = await refreshTokenAndUserData();
          if (!refreshSuccess && isMountedRef.current) {
            setLoading(false);
            setUser(null);
          }
          return;
        }

        try {
          // Get user profile first
          const profileResponse = await userAPI.getProfile();
          if (!isMountedRef.current) return;

          if (profileResponse.data) {
            setUser(profileResponse.data);
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

  /**
   * Reload user profile data
   */
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

  /**
   * Login user with email/password or OAuth data
   * @param {string|Object} emailOrUser - Email string or OAuth user object
   * @param {string} [password] - Password (not required for OAuth)
   * @param {boolean} [remember=false] - Remember user session
   * @returns {Promise<Object>} Result with success status
   */
  const login = useCallback(async (emailOrUser, password, remember = false) => {
    try {
      setLoading(true);
      setError(null);
      setRememberMe(remember);
      
      // Handle OAuth login
      if (!password && typeof emailOrUser === 'object') {
        const { user, accessToken } = emailOrUser;
        if (accessToken) {
          localStorage.setItem('accessToken', accessToken);
        }
        
        dispatchAuthEvents('login');
        
        setUser(user);
        setLastActivity(Date.now());
        setSessionWarning(false);
        
        // Auto-detect location for OAuth users without location
        if (user && !user.location) {
          await detectAndUpdateUserLocation(setUser, true);
        }
        
        setLoading(false);
        return { success: true };
      }
      
      // Handle regular email/password login
      const response = await authAPI.login({ email: emailOrUser, password: password });
      
      if (!response.success) {
        throw new Error(response.message || 'Login failed');
      }
      
      const { user, accessToken } = response.data;
      if (!accessToken) {
        throw new Error('No access token received from login');
      }
      
      localStorage.setItem('accessToken', accessToken);
      
      dispatchAuthEvents('login');
      
      // Fetch fresh user profile to ensure latest changes are reflected
      let currentUser = null;
      try {
        const profileResponse = await userAPI.getProfile();
        if (profileResponse?.data) {
          currentUser = profileResponse.data;
          setUser(profileResponse.data);
        } else {
          currentUser = user;
          setUser(user);
        }
      } catch (profileErr) {
        console.warn('Failed to fetch fresh profile after login, using response user:', profileErr);
        currentUser = user;
        setUser(user);
      }

      // Auto-detect location for users without location
      if (currentUser && !currentUser.location) {
        await detectAndUpdateUserLocation(setUser, true);
      }

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

  /**
   * Sign up a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Result with success status
   */
  const signup = async (userData) => {
    try {
      setError(null);
      const response = await authAPI.signup(userData);
      
      const { accessToken, user } = response.data;
      if (!accessToken) {
        throw new Error('No access token received from signup');
      }
      
      localStorage.setItem('accessToken', accessToken);
      
      dispatchAuthEvents('login');
      
      setUser(user);
      setLastActivity(Date.now());
      
      // Auto-detect location for new accounts
      await detectAndUpdateUserLocation(setUser, true);
      
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to create account';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Logout the current user
   */
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
      
      dispatchAuthEvents('logout');
    }
  }, []);

  // Keep logoutRef in sync with logout function
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  /**
   * Request password reset email
   * @param {string} email - User email
   * @returns {Promise<Object>} Result with success status
   */
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

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Result with success status
   */
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

  /**
   * Verify email with token
   * @param {string} token - Verification token
   * @returns {Promise<Object>} Result with user data
   */
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

  /**
   * Manual location detection for existing users
   * @returns {Promise<Object>} Result with location data
   */
  const manualDetectAndUpdateLocation = async () => {
    if (!user) {
      toast.error('Please log in to update your location');
      return { success: false, error: 'User not logged in' };
    }

    const result = await detectAndUpdateUserLocation(setUser, true);
    
    if (result.success) {
      // Show extended toast with additional details
      const toastMessage = result.details
        ? `Location updated: ${result.location}\n📍 ${result.details.city || ''}, ${result.details.state || ''}${result.details.country && result.details.country !== result.details.state ? `, ${result.details.country}` : ''}`
        : `Location updated: ${result.location}`;
      
      toast.success(toastMessage, {
        duration: 5000,
        icon: '📍'
      });
    }
    
    return result;
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
    reloadUser,
    switchBackendMode,
    getCurrentBackendMode,
    detectAndUpdateLocation: manualDetectAndUpdateLocation
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