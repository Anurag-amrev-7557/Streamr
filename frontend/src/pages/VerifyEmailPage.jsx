import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const MAX_RETRIES = 3;
const RETRY_COOLDOWN = 5 * 60 * 1000; // 5 minutes
const SUPPORT_EMAIL = 'support@streamr.com';

// Common email domains for suggestions
const commonDomains = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'protonmail.com',
  'icloud.com',
  'aol.com',
  'mail.com',
  'zoho.com',
  'yandex.com'
];

// FAQ items
const FAQ_ITEMS = [
  {
    question: 'Why do I need to verify my email?',
    answer: 'Email verification helps us ensure the security of your account and allows us to send you important updates and notifications.'
  },
  {
    question: 'How long is the verification link valid?',
    answer: 'The verification link is valid for 24 hours. If it expires, you can request a new verification email.'
  },
  {
    question: 'What if I don\'t receive the verification email?',
    answer: 'Check your spam folder first. If you still don\'t see it, you can request a new verification email after the cooldown period.'
  },
  {
    question: 'Can I change my email address?',
    answer: 'Yes, you can change your email address during the verification process. Make sure to use a valid email address you have access to.'
  },
  {
    question: 'What happens if I enter the wrong email?',
    answer: 'You can change your email address during verification. Make sure to enter the correct email address you want to use for your account.'
  },
  {
    question: 'Is my email address secure?',
    answer: 'Yes, we take your privacy seriously. Your email address is encrypted and only used for account-related communications.'
  },
  {
    question: 'Can I verify multiple email addresses?',
    answer: 'No, each account can only have one verified email address. You can change your email address at any time.'
  },
  {
    question: 'What if I need help with verification?',
    answer: 'You can contact our support team using the support form below. We\'ll help you resolve any verification issues.'
  }
];

const ISSUE_CATEGORIES = [
  'Email not received',
  'Invalid verification link',
  'Link expired',
  'Wrong email address',
  'Technical issues',
  'Other'
];

const VerifyEmailPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [cooldownEnd, setCooldownEnd] = useState(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showSupport, setShowSupport] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportDescription, setReportDescription] = useState('');
  const [reportCategory, setReportCategory] = useState('');
  const [reportScreenshot, setReportScreenshot] = useState(null);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [emailSuggestions, setEmailSuggestions] = useState([]);
  const { token } = useParams();
  const navigate = useNavigate();
  const { verifyEmail, forgotPassword } = useAuth();

  // Check password strength
  const checkPasswordStrength = (password) => {
    const feedback = [];
    let score = 0;

    if (password.length < 8) {
      feedback.push('Password should be at least 8 characters long');
    } else {
      score += 1;
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Add uppercase letters');
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Add lowercase letters');
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Add numbers');
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Add special characters');
    }

    return { score, feedback };
  };

  // Validate email format and suggest corrections
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    
    // Check for common typos
    if (email.includes('@gamil.com')) {
      setEmailSuggestions([email.replace('@gamil.com', '@gmail.com')]);
      return 'Did you mean gmail.com?';
    }
    if (email.includes('@gmial.com')) {
      setEmailSuggestions([email.replace('@gmial.com', '@gmail.com')]);
      return 'Did you mean gmail.com?';
    }
    if (email.includes('@yaho.com')) {
      setEmailSuggestions([email.replace('@yaho.com', '@yahoo.com')]);
      return 'Did you mean yahoo.com?';
    }

    // Generate suggestions for incomplete domains
    if (email.includes('@') && !emailRegex.test(email)) {
      const [localPart, domain] = email.split('@');
      const suggestions = commonDomains
        .filter(d => d.startsWith(domain))
        .map(d => `${localPart}@${d}`);
      if (suggestions.length > 0) {
        setEmailSuggestions(suggestions);
        return 'Did you mean one of these?';
      }
    }

    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    setEmailSuggestions([]);
    return '';
  };

  // Check cooldown timer
  useEffect(() => {
    if (cooldownEnd) {
      const timer = setInterval(() => {
        const timeLeft = cooldownEnd - Date.now();
        if (timeLeft <= 0) {
          setCooldownEnd(null);
          clearInterval(timer);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownEnd]);

  useEffect(() => {
    const verify = async () => {
      try {
        const result = await verifyEmail(token);
        if (result.success) {
          setSuccess(true);
          // Start countdown
          let timeLeft = 3;
          const timer = setInterval(() => {
            timeLeft -= 1;
            setCountdown(timeLeft);
            if (timeLeft <= 0) {
              clearInterval(timer);
              navigate('/login');
            }
          }, 1000);
          return () => clearInterval(timer);
        }
      } catch (err) {
        console.error('Verification error:', err);
        let errorMessage = err.response?.data?.message || 'Failed to verify email. The link may have expired.';
        
        // Add more detailed error messages
        if (errorMessage.includes('expired')) {
          errorMessage = 'This verification link has expired. Please request a new one.';
        } else if (errorMessage.includes('invalid')) {
          errorMessage = 'This verification link is invalid. Please check the link and try again.';
        } else if (errorMessage.includes('already verified')) {
          errorMessage = 'This email has already been verified. You can proceed to login.';
        }
        
        setError(errorMessage);
        // Try to extract email from error message
        const emailMatch = errorMessage.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          setEmail(emailMatch[0]);
        }
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token, verifyEmail, navigate]);

  const handleResendVerification = async () => {
    try {
      setResendLoading(true);
      setError('');
      setEmailError('');
      setPasswordError('');

      // Validate email
      const emailError = validateEmail(email);
      if (emailError) {
        setEmailError(emailError);
        return;
      }

      // Validate password
      if (!password) {
        setPasswordError('Password is required to change email');
        return;
      }

      // Check password strength
      const { score, feedback } = checkPasswordStrength(password);
      if (score < 3) {
        setPasswordError(`Password is too weak. ${feedback.join(', ')}`);
        return;
      }

      // Check retry limit
      if (retryCount >= MAX_RETRIES) {
        setCooldownEnd(Date.now() + RETRY_COOLDOWN);
        setError(`Too many attempts. Please try again in 5 minutes or contact support at ${SUPPORT_EMAIL}`);
        return;
      }

      await forgotPassword(email);
      setResendSuccess(true);
      setRetryCount(prev => prev + 1);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err) {
      console.error('Resend error:', err);
      let errorMessage = err.response?.data?.message || 'Failed to resend verification email';
      
      // Add more detailed error messages
      if (errorMessage.includes('not found')) {
        errorMessage = 'No account found with this email address. Please check the email and try again.';
      } else if (errorMessage.includes('rate limit')) {
        errorMessage = 'Too many attempts. Please wait a few minutes before trying again.';
      }
      
      setError(errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setEmailError('');
    setEmailSuggestions([]);
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordError('');
    
    // Calculate password strength
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[a-z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    setPasswordStrength(score);
  };

  const handleSuggestionClick = (suggestion) => {
    setEmail(suggestion);
    setEmailError('');
    setEmailSuggestions([]);
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setReportError('Screenshot size should be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setReportError('Please upload an image file');
        return;
      }
      setReportScreenshot(file);
      setReportError('');
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportCategory) {
      setReportError('Please select an issue category');
      return;
    }
    if (!reportDescription.trim()) {
      setReportError('Please describe the issue');
      return;
    }

    try {
      setReportError('');
      // Here you would typically send the report to your backend
      // For now, we'll just simulate a successful submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      setReportSuccess(true);
      setReportDescription('');
      setReportCategory('');
      setReportScreenshot(null);
    } catch (err) {
      setReportError('Failed to submit report. Please try again.');
    }
  };

  const getCooldownTimeLeft = () => {
    if (!cooldownEnd) return null;
    const timeLeft = Math.ceil((cooldownEnd - Date.now()) / 1000);
    if (timeLeft <= 0) return null;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPasswordStrengthColor = (score) => {
    switch (score) {
      case 0:
      case 1:
        return 'text-red-400';
      case 2:
        return 'text-yellow-400';
      case 3:
        return 'text-blue-400';
      case 4:
      case 5:
        return 'text-green-400';
      default:
        return 'text-white/60';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Email Verification
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Verifying your email...</p>
            </div>
          ) : error ? (
            <div className="space-y-6">
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Verification Failed</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>

              {showEmailForm ? (
                <div className="space-y-4">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      placeholder="Enter your email"
                      className={`w-full bg-[#2b3036] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white-500 ${
                        emailError ? 'border border-red-500' : ''
                      }`}
                    />
                    {emailError && (
                      <p className="mt-1 text-sm text-red-400">{emailError}</p>
                    )}
                    {emailSuggestions.length > 0 && (
                      <div className="mt-2">
                        {emailSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-sm text-blue-400 hover:text-blue-300 mr-2"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      type="password"
                      value={password}
                      onChange={handlePasswordChange}
                      placeholder="Enter your password"
                      className={`w-full bg-[#2b3036] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white-500 ${
                        passwordError ? 'border border-red-500' : ''
                      }`}
                    />
                    {passwordError && (
                      <p className="mt-1 text-sm text-red-400">{passwordError}</p>
                    )}
                    <div className="mt-2">
                      <div className="flex items-center">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full">
                          <div
                            className={`h-2 rounded-full ${
                              passwordStrength === 0 ? 'bg-red-500' :
                              passwordStrength === 1 ? 'bg-red-500' :
                              passwordStrength === 2 ? 'bg-yellow-500' :
                              passwordStrength === 3 ? 'bg-yellow-500' :
                              passwordStrength === 4 ? 'bg-green-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${(passwordStrength / 5) * 100}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm text-gray-500">
                          {passwordStrength === 0 ? 'Very Weak' :
                           passwordStrength === 1 ? 'Weak' :
                           passwordStrength === 2 ? 'Fair' :
                           passwordStrength === 3 ? 'Good' :
                           passwordStrength === 4 ? 'Strong' :
                           'Very Strong'}
                        </span>
                      </div>
                      {passwordStrength < 3 && (
                        <p className="mt-1 text-sm text-gray-500">
                          Password should be at least 8 characters long and include uppercase, lowercase, numbers, and special characters.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={handleResendVerification}
                      disabled={resendLoading || !!cooldownEnd}
                      className="w-full bg-white text-black rounded-lg px-6 py-2 font-medium hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resendLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="w-5 h-5 border-t-2 border-b-2 border-black rounded-full animate-spin"></div>
                        </div>
                      ) : cooldownEnd ? (
                        `Try again in ${getCooldownTimeLeft()}`
                      ) : (
                        `Resend Verification Email (${MAX_RETRIES - retryCount} attempts left)`
                      )}
                    </button>
                    <button
                      onClick={() => setShowEmailForm(false)}
                      className="w-full bg-[#2b3036] text-white rounded-lg px-6 py-2 font-medium hover:bg-[#363b42] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(true)}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSupport(true)}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Contact Support
                  </button>
                </div>
              )}
            </div>
          ) : success ? (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Email Verified Successfully</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Your email has been verified. You can now proceed to login.</p>
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Go to Login
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {showSupport && (
          <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Contact Support</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Need help? Our support team is here to assist you.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Frequently Asked Questions</h4>
                  <div className="mt-4 space-y-4">
                    {FAQ_ITEMS.map((item, index) => (
                      <div key={index} className="border-b border-gray-200 pb-4">
                        <h5 className="text-sm font-medium text-gray-900">{item.question}</h5>
                        <p className="mt-1 text-sm text-gray-500">{item.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900">Report an Issue</h4>
                  <p className="mt-1 text-sm text-gray-500">
                    If you're still experiencing problems, please report the issue to our support team.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowReportForm(true)}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Report Issue
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showReportForm && (
          <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Report an Issue</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Please provide details about the issue you're experiencing.
                </p>
              </div>

              <form onSubmit={handleReportSubmit} className="space-y-6">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Issue Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="">Select a category</option>
                    {ISSUE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="description"
                      name="description"
                      rows={4}
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Please describe the issue in detail..."
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="screenshot" className="block text-sm font-medium text-gray-700">
                    Screenshot (optional)
                  </label>
                  <div className="mt-1 flex items-center">
                    <input
                      type="file"
                      id="screenshot"
                      name="screenshot"
                      accept="image/*"
                      onChange={handleScreenshotChange}
                      className="sr-only"
                    />
                    <label
                      htmlFor="screenshot"
                      className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Upload Screenshot
                    </label>
                    {reportScreenshot && (
                      <span className="ml-3 text-sm text-gray-500">
                        {reportScreenshot.name}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
                  </p>
                </div>

                {reportError && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{reportError}</p>
                      </div>
                    </div>
                  </div>
                )}

                {reportSuccess && (
                  <div className="rounded-md bg-green-50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-green-700">
                          Your report has been submitted successfully. We'll get back to you soon.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReportForm(false);
                      setReportDescription('');
                      setReportCategory('');
                      setReportScreenshot(null);
                      setReportError('');
                      setReportSuccess(false);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage; 