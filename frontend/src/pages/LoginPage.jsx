import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Show session timeout warning
  useEffect(() => {
    const warningTimeout = setTimeout(() => {
      setSessionWarning(true);
    }, 25 * 60 * 1000); // Show warning 5 minutes before timeout

    return () => clearTimeout(warningTimeout);
  }, []);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  const validateField = (name, value) => {
    switch (name) {
      case 'email':
        return validateEmail(value);
      case 'password':
        return validatePassword(value);
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Only validate if the field has been touched
    if (touched[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: validateField(name, newValue)
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    setErrors(prev => ({
      ...prev,
      [name]: validateField(name, value)
    }));
  };

  const isFormValid = () => {
    return !Object.values(errors).some(error => error) && 
           formData.email && 
           formData.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate all fields on submit
    const newErrors = {
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
    };
    setErrors(newErrors);

    // If there are any errors, don't submit
    if (Object.values(newErrors).some(error => error)) {
      return;
    }

    setLoading(true);

    try {
      const result = await login(formData.email, formData.password, formData.rememberMe);
      if (result.success) {
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        setError(result.error || 'Failed to login');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  };

  const handleGithubLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/github`;
  };

  return (
    <div className="min-h-screen bg-[#0f1114] text-white flex items-center justify-center px-2 sm:px-0">
      <div className="w-full max-w-md mx-auto px-2 sm:px-6 py-8 sm:py-12 flex flex-col items-center">
        {/* Logo/Brand */}
        <div className="text-center mb-5 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Welcome Back</h1>
          <p className="text-white/70 mt-2 text-sm sm:text-base">Sign in to your account</p>
        </div>
        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#181b20] rounded-2xl shadow-xl border border-white/20 p-4 sm:p-8 w-full"
        >
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-full text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {sessionWarning && (
            <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-full text-yellow-700 dark:text-yellow-400 text-sm">
              Your session will expire in 5 minutes. Please save your work.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div>
              <label htmlFor="email" className="block text-white mb-2 text-sm sm:text-base font-medium">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                className={`w-full bg-[#23272F] text-white rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white border transition-all duration-200 text-base sm:text-lg ${
                  touched.email && errors.email ? 'border-white' : 'border-white/20 focus:border-white/40'
                }`}
                placeholder="Enter your email"
                autoComplete="email"
              />
              {touched.email && errors.email && (
                <p className="mt-1 text-xs sm:text-sm text-white/80">{errors.email}</p>
              )}
            </div>

            <div className="relative">
              <label htmlFor="password" className="block text-white mb-2 text-sm sm:text-base font-medium">
                Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                className={`w-full bg-[#23272F] text-white rounded-full px-4 pr-16 focus:outline-none focus:ring-2 focus:ring-white border transition-all duration-200 text-base sm:text-lg h-12 ${
                  touched.password && errors.password ? 'border-white' : 'border-white/20 focus:border-white/40'
                }`}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <div className="absolute right-2 bottom-1.5 flex items-center">
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="flex items-center justify-center text-white/60 hover:text-white focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{ padding: 0, background: "none", height: "2.5rem", width: "2.5rem" }}
                >
                  {showPassword ? (
                    // Eye-off icon
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0 1 12 19c-5 0-9-4.03-9-7 0-1.13.37-2.22 1.05-3.22m2.1-2.53A9.97 9.97 0 0 1 12 5c5 0 9 4.03 9 7 0 1.13-.37 2.22-1.05 3.22a9.956 9.956 0 0 1-2.1 2.53M15 12a3 3 0 0 0-3-3m0 0a3 3 0 0 0-3 3m6 0a3 3 0 0 1-3 3m0 0a3 3 0 0 1-3-3m0 0L3 3m18 18-3-3" />
                    </svg>
                  ) : (
                    // Eye icon
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {touched.password && errors.password && (
                <p className="mt-1 text-xs sm:text-sm text-white/80">{errors.password}</p>
              )}
            </div>

            <div className="flex flex-row items-center justify-between gap-2 w-full">
              <label className="flex items-center gap-2 text-white/80 text-xs sm:text-sm">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="form-checkbox rounded-full border-white/40 bg-[#23272F] focus:ring-white"
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-white/70 hover:underline text-xs sm:text-sm ml-0 sm:ml-2">
                Forgot password?
              </Link>
            </div>

            <motion.button
              type="submit"
              disabled={loading || !isFormValid()}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-full font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed bg-white text-black hover:bg-white/90 shadow-lg shadow-white/20"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </motion.button>
          </form>

          {/* Social Login */}
          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-white/20" />
            <span className="mx-4 text-white/60 text-xs sm:text-sm">or</span>
            <div className="flex-grow border-t border-white/20" />
          </div>

          <div className="flex flex-col gap-3">
            <motion.button
              type="button"
              onClick={handleGoogleLogin}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-3 py-2.5 bg-[#23272F] text-white rounded-full border border-white/10 hover:bg-white/10 transition-all duration-200 font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
              </svg>
              Google
            </motion.button>

            <motion.button
              type="button"
              onClick={handleGithubLogin}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-3 py-2.5 bg-[#23272F] text-white rounded-full border border-white/10 hover:bg-white/10 transition-all duration-200 font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </motion.button>
          </div>

          <div className="text-center mt-6">
            <span className="text-white/70">Don't have an account?</span>{' '}
            <Link to="/signup" className="text-white hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;