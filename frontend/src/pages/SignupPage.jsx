import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: '',
  });
  const [touched, setTouched] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false,
    agreeToTerms: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuth();

  const validateUsername = (username) => {
    if (!username) return 'Username is required';
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (username.length > 20) return 'Username must be less than 20 characters';
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return 'Username can only contain letters, numbers, underscores, and hyphens';
    }
    return '';
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
    if (!/(?=.*[!@#$%^&*])/.test(password)) return 'Password must contain at least one special character (!@#$%^&*)';
    return '';
  };

  const validateConfirmPassword = (confirmPassword) => {
    if (!confirmPassword) return 'Please confirm your password';
    if (confirmPassword !== formData.password) return 'Passwords do not match';
    return '';
  };

  const validateField = (name, value) => {
    switch (name) {
      case 'username':
        return validateUsername(value);
      case 'email':
        return validateEmail(value);
      case 'password':
        return validatePassword(value);
      case 'confirmPassword':
        return validateConfirmPassword(value);
      case 'agreeToTerms':
        return value ? '' : 'You must agree to the terms and conditions';
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

    // If password changes, revalidate confirm password
    if (name === 'password' && touched.confirmPassword) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: validateConfirmPassword(formData.confirmPassword)
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
           formData.username && 
           formData.email && 
           formData.password && 
           formData.confirmPassword && 
           formData.agreeToTerms;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate all fields on submit
    const newErrors = {
      username: validateUsername(formData.username),
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
      confirmPassword: validateConfirmPassword(formData.confirmPassword),
      agreeToTerms: formData.agreeToTerms ? '' : 'You must agree to the terms and conditions',
    };
    setErrors(newErrors);

    // If there are any errors, don't submit
    if (Object.values(newErrors).some(error => error)) {
      return;
    }

    setLoading(true);

    try {
      const result = await signup({
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      
      if (result.success) {
        navigate('/profile');
      } else {
        setError(result.error || 'Failed to create account');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account');
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Create Account</h1>
          <p className="text-white/70 mt-2 text-sm sm:text-base">Join Streamr today</p>
        </div>
        {/* Signup Form */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#181b20] rounded-2xl shadow-xl border border-white/20 p-4 sm:p-8 w-full"
        >
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div>
              <label htmlFor="username" className="block text-white mb-2 text-sm sm:text-base font-medium">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                className={`w-full bg-[#23272F] text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white border transition-all duration-200 text-base sm:text-lg h-12 ${
                  touched.username && errors.username ? 'border-white' : 'border-white/20 focus:border-white/40'
                }`}
                placeholder="Enter your username"
                autoComplete="username"
              />
              {touched.username && errors.username && (
                <p className="mt-1 text-xs sm:text-sm text-white/80">{errors.username}</p>
              )}
            </div>

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
                className={`w-full bg-[#23272F] text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white border transition-all duration-200 text-base sm:text-lg h-12 ${
                  touched.email && errors.email ? 'border-white' : 'border-white/20 focus:border-white/40'
                }`}
                placeholder="Enter your email"
                autoComplete="email"
              />
              {touched.email && errors.email && (
                <p className="mt-1 text-xs sm:text-sm text-white/80">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-white mb-2 text-sm sm:text-base font-medium">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                className={`w-full bg-[#23272F] text-white rounded-lg px-4 pr-16 focus:outline-none focus:ring-2 focus:ring-white border transition-all duration-200 text-base sm:text-lg h-12 ${
                  touched.password && errors.password ? 'border-white' : 'border-white/20 focus:border-white/40'
                }`}
                placeholder="Enter your password"
                autoComplete="new-password"
              />
              {touched.password && errors.password && (
                <p className="mt-1 text-xs sm:text-sm text-white/80">{errors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-white mb-2 text-sm sm:text-base font-medium">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                className={`w-full bg-[#23272F] text-white rounded-lg px-4 pr-16 focus:outline-none focus:ring-2 focus:ring-white border transition-all duration-200 text-base sm:text-lg h-12 ${
                  touched.confirmPassword && errors.confirmPassword ? 'border-white' : 'border-white/20 focus:border-white/40'
                }`}
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
              {touched.confirmPassword && errors.confirmPassword && (
                <p className="mt-1 text-xs sm:text-sm text-white/80">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="flex flex-row items-center justify-between gap-2 w-full">
              <input
                type="checkbox"
                id="agreeToTerms"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleChange}
                className="form-checkbox rounded border-white/20 bg-[#23272F] focus:ring-white"
              />
              <label htmlFor="agreeToTerms" className="text-white/70 text-xs sm:text-sm">
                I agree to the <Link to="#" className="text-white hover:underline">terms and conditions</Link>
              </label>
            </div>
            {touched.agreeToTerms && errors.agreeToTerms && (
              <p className="mt-1 text-xs sm:text-sm text-white/80">{errors.agreeToTerms}</p>
            )}

            <motion.button
              type="submit"
              disabled={loading || !isFormValid()}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed bg-white text-black hover:bg-white/90 shadow-lg shadow-white/20"
            >
              {loading ? 'Signing up...' : 'Sign Up'}
            </motion.button>
          </form>

          {/* Social Login */}
          <div className="mt-8">
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
                className="w-full flex items-center justify-center gap-3 py-2.5 bg-[#23272F] text-white rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200 font-medium"
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
                className="w-full flex items-center justify-center gap-3 py-2.5 bg-[#23272F] text-white rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200 font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    fill="currentColor"
                    d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                  />
                </svg>
                GitHub
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Login Link */}
        <div className="text-center mt-6">
          <span className="text-white/70">Already have an account?</span>{' '}
          <Link to="/login" className="text-white hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage; 