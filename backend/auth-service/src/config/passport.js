 import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import User from '../models/User.js';
import logger from '../../../../common/utils/logger.js';

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

// ===== INITIALIZE FUNCTION =====
export const initializePassport = () => {

  // ===== GOOGLE =====
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ 
        provider: 'google', 
        providerId: profile.id 
      });
      if(user) return done(null, user);

      user = await User.findOne({ email: profile.emails[0].value });
      if(user) {
        user.provider = 'google';
        user.providerId = profile.id;
        user.avatar = profile.photos[0].value;
        await user.save();
        return done(null, user);
      }

      user = await User.create({
        name: profile.displayName,
        email: profile.emails[0].value,
        avatar: profile.photos[0].value,
        provider: 'google',
        providerId: profile.id
      });
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));

  // ===== FACEBOOK =====
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL,
    profileFields: ['id', 'displayName', 'photos', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ 
        provider: 'facebook', 
        providerId: profile.id 
      });
      if(user) return done(null, user);

      const email = profile.emails && profile.emails[0]
        ? profile.emails[0].value
        : `fb_${profile.id}@wealthy.app`;

      user = await User.findOne({ email });
      if(user) {
        user.provider = 'facebook';
        user.providerId = profile.id;
        await user.save();
        return done(null, user);
      }

      user = await User.create({
        name: profile.displayName,
        email: email,
        avatar: profile.photos ? profile.photos[0].value : null,
        provider: 'facebook',
        providerId: profile.id
      });
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));

  // ===== TWITTER / X =====
  passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_API_KEY,
    consumerSecret: process.env.TWITTER_API_SECRET,
    callbackURL: process.env.TWITTER_CALLBACK_URL,
    includeEmail: true
  },
  async (token, tokenSecret, profile, done) => {
    try {
      let user = await User.findOne({ 
        provider: 'twitter', 
        providerId: profile.id 
      });
      if(user) return done(null, user);

      const email = profile.emails && profile.emails[0]
        ? profile.emails[0].value
        : `tw_${profile.id}@wealthy.app`;

      user = await User.findOne({ email });
      if(user) {
        user.provider = 'twitter';
        user.providerId = profile.id;
        await user.save();
        return done(null, user);
      }

      user = await User.create({
        name: profile.displayName,
        email: email,
        avatar: profile.photos ? profile.photos[0].value : null,
        provider: 'twitter',
        providerId: profile.id
      });
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));

};

export default passport;