import express from 'express';
import passport from 'passport';
import {
  register,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  oauthSuccess,
  oauthFailure
} from '../controllers/authController.js';
import { protect } from '../../../../common/middleware/authMiddleware.js';

// Load passport config
import '../config/passport.js';

const router = express.Router();

// ===== LOCAL AUTH =====
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);

// ===== PROTECTED =====
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

// ===== GOOGLE =====
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/api/auth/failed' 
  }),
  oauthSuccess
);

// ===== FACEBOOK =====
router.get('/facebook',
  passport.authenticate('facebook', { 
    scope: ['email'] 
  })
);
router.get('/facebook/callback',
  passport.authenticate('facebook', { 
    failureRedirect: '/api/auth/failed' 
  }),
  oauthSuccess
);

// ===== TWITTER / X =====
router.get('/twitter',
  passport.authenticate('twitter')
);
router.get('/twitter/callback',
  passport.authenticate('twitter', { 
    failureRedirect: '/api/auth/failed' 
  }),
  oauthSuccess
);

// ===== OAUTH RESULTS =====
router.get('/success', oauthSuccess);
router.get('/failed', oauthFailure);

export default router;