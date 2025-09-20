const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // adjust path if different
require('dotenv').config();

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`,
},
async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails && profile.emails[0] && profile.emails[0].value;
    // Try to find existing user by email
    let user = await User.findOne({ email });

    if (!user) {
      // create new user (no local password)
      user = await User.create({
        name: profile.displayName || 'Google User',
        email,
        password: '',      // blank because OAuth user
        googleId: profile.id,
        providers: ['google']
      });
    } else {
      // ensure googleId and providers contain 'google'
      let changed = false;
      if (!user.googleId) {
        user.googleId = profile.id;
        changed = true;
      }
      if (!user.providers || !user.providers.includes('google')) {
        user.providers = Array.from(new Set([...(user.providers || []), 'google']));
        changed = true;
      }
      if (changed) await user.save();
    }

    // create a JWT token (reuse your existing JWT_SECRET and expiry policy)
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    // Return both user and token so route handler can respond or redirect
    return done(null, { user, token });
  } catch (err) {
    return done(err, null);
  }
}));

// Not using persistent sessions; still define serialize/deserialize to avoid errors:
passport.serializeUser((obj, done) => done(null, obj));
passport.deserializeUser((obj, done) => done(null, obj));