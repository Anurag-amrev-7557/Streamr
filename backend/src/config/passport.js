const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Local Strategy
passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  try {
    const user = await User.findOne({ email });
    if (!user) return done(null, false, { message: 'Incorrect email or password.' });
    if (!user.password) return done(null, false, { message: 'Please login with your social account.' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return done(null, false, { message: 'Incorrect email or password.' });
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'https://streamr-jjj9.onrender.com/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      // Sanitize display name and check for uniqueness
      let username = profile.displayName.replace(/\s/g, '').toLowerCase();
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        username = `${username}_${profile.id.slice(0, 5)}`; // Append part of googleId for uniqueness
      }
      
      user = await User.create({
        username: username,
        email: profile.emails[0].value,
        googleId: profile.id,
        avatar: profile.photos[0]?.value,
        isVerified: true,
        name: profile.displayName,
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// GitHub Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: 'https://streamr-jjj9.onrender.com/api/auth/github/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ githubId: profile.id });
    if (!user) {
      // Prefer profile.username for GitHub, fallback to displayName
      let username = (profile.username || profile.displayName || '').replace(/\s/g, '').toLowerCase();
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        username = `${username}_${profile.id.slice(0, 5)}`; // Append part of githubId for uniqueness
      }
      
      user = await User.create({
        username: username,
        email: profile.emails[0].value,
        githubId: profile.id,
        avatar: profile.photos[0]?.value,
        isVerified: true,
        name: profile.displayName || profile.username,
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport; 