const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const crypto = require('crypto');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../utils/email');
const { OAuth2Client } = require('google-auth-library');
const { Octokit } = require('@octokit/rest');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const octokit = new Octokit();

// Helper function to generate tokens
const generateTokens = (user, res) => {
  const accessToken = signAccessToken({ id: user._id });
  const refreshToken = signRefreshToken({ id: user._id });

  // Set refresh token in HTTP-only cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return { accessToken, refreshToken };
};

// Helper function to handle errors
const handleError = (res, error, status = 500) => {
  console.error('Auth Error:', error);
  return res.status(status).json({
    success: false,
    message: error.message || 'An error occurred during authentication'
  });
};

// Register
exports.register = async (req, res) => {
  try {
    const { username, email, password, name } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: existingUser.email === email ? 
          'Email already in use' : 
          'Username already taken'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      name,
      isVerified: false
    });

    // Generate verification token
    const verificationToken = user.generateVerificationToken();
    await user.save();

    // Send verification email
    await sendVerificationEmail(user.email, verificationToken);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user, res);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isVerified: user.isVerified,
          profilePicture: user.profilePicture
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);
    
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !user.password) {
      console.log('Login failed: User not found or no password set');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Login failed: Password mismatch');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    console.log('Login successful for user:', user._id);
    const { accessToken, refreshToken } = generateTokens(user, res);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isVerified: user.isVerified,
          profilePicture: user.profilePicture
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    handleError(res, error);
  }
};

// Logout
exports.logout = async (req, res) => {
  // Clear refresh token cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  
  res.json({ 
    success: true,
    message: 'Logged out successfully' 
  });
};

// Refresh Token
exports.refreshToken = async (req, res) => {
  try {
    // Try to get refresh token from cookie first
    let refreshToken = req.cookies.refreshToken;
    
    // If not in cookie, try Authorization header
    if (!refreshToken) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        refreshToken = authHeader.split(' ')[1];
      }
    }

    if (!refreshToken) {
      return res.status(401).json({ 
        success: false,
        message: 'No refresh token provided' 
      });
    }

    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.userId);

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user, res);
    res.json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    handleError(res, error, 401);
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Return success even if user doesn't exist for security
      return res.json({ 
        success: true,
        message: 'If your email is registered, you will receive a password reset link' 
      });
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();

    await sendPasswordResetEmail(user.email, resetToken);

    res.json({ 
      success: true,
      message: 'If your email is registered, you will receive a password reset link' 
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired reset token' 
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ 
      success: true,
      message: 'Password has been reset successfully' 
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Verify Email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired verification token' 
      });
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ 
      success: true,
      message: 'Email verified successfully' 
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Resend Verification
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (user.isVerified) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is already verified' 
      });
    }

    const verificationToken = user.generateVerificationToken();
    await user.save();

    await sendVerificationEmail(user.email, verificationToken);

    res.json({ 
      success: true,
      message: 'Verification email sent successfully' 
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Google OAuth
exports.googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const { email, name, picture } = ticket.getPayload();

    // Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        username: name.toLowerCase().replace(/\s+/g, ''),
        isVerified: true,
        profilePicture: picture
      });
      await user.save();
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user, res);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isVerified: user.isVerified,
          profilePicture: user.profilePicture
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    handleError(res, error);
  }
};

// GitHub OAuth
exports.githubAuth = async (req, res) => {
  try {
    const { code } = req.body;
    
    // Exchange code for access token
    const { data } = await octokit.request('POST /login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code
    });

    // Get user data
    const { data: userData } = await octokit.request('GET /user', {
      headers: {
        authorization: `token ${data.access_token}`
      }
    });

    // Find or create user
    let user = await User.findOne({ email: userData.email });
    if (!user) {
      user = new User({
        email: userData.email,
        username: userData.login,
        isVerified: true,
        profilePicture: userData.avatar_url
      });
      await user.save();
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user, res);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isVerified: user.isVerified,
          profilePicture: user.profilePicture
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    handleError(res, error);
  }
};

// OAuth Callback
exports.oauthCallback = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=Authentication failed`);
    }

    const { accessToken, refreshToken } = generateTokens(user, res);

    // Redirect to frontend with access token
    const redirectUrl = new URL('/oauth-success', process.env.CLIENT_URL);
    redirectUrl.searchParams.append('token', accessToken);
    redirectUrl.searchParams.append('refreshToken', refreshToken);
    redirectUrl.searchParams.append('user', JSON.stringify({
      id: user._id,
      username: user.username,
      email: user.email,
      isVerified: user.isVerified,
      profilePicture: user.profilePicture
    }));

    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}/login?error=Authentication failed`);
  }
}; 