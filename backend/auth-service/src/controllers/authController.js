
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import generateToken from '../../../../common/utils/generateToken.js';
import { successResponse, errorResponse } from '../../../../common/utils/response.js';

// ===== REGISTER =====
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if(!name || !email || !password) {
      return errorResponse(res, 400, '❌ Name, email and password are required');
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if(existingUser) {
      return errorResponse(res, 400, '❌ Email already registered');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      provider: 'local'
    });

    // Generate token
    const token = generateToken(user);

    return successResponse(res, 201, '✅ Registration successful!', {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });

  } catch (err) {
    return errorResponse(res, 500, '❌ Server error', err);
  }
};

// ===== LOGIN =====
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if(!email || !password) {
      return errorResponse(res, 400, '❌ Email and password are required');
    }

    // Find user
    const user = await User.findOne({ email });
    if(!user) {
      return errorResponse(res, 400, '❌ Invalid email or password');
    }

    // Check if social login user
    if(user.provider !== 'local') {
      return errorResponse(res, 400, `❌ Please login with ${user.provider}`);
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch) {
      return errorResponse(res, 400, '❌ Invalid email or password');
    }

    // Update last active
    user.lastActive = Date.now();
    await user.save();

    // Generate token
    const token = generateToken(user);

    return successResponse(res, 200, '✅ Login successful!', {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });

  } catch (err) {
    return errorResponse(res, 500, '❌ Server error', err);
  }
};

 // ===== REFRESH TOKEN =====
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if(!refreshToken) {
      return errorResponse(res, 400, '❌ Token required');
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if(!user) {
      return errorResponse(res, 404, '❌ User not found');
    }

    const token = generateToken(user);
    return successResponse(res, 200, '✅ Token refreshed!', { token });

  } catch (err) {
    return errorResponse(res, 401, '❌ Invalid token', err);
  }
};
// ===== GET PROFILE =====
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if(!user) {
      return errorResponse(res, 404, '❌ User not found');
    }
    return successResponse(res, 200, '✅ Profile fetched!', { user });
  } catch (err) {
    return errorResponse(res, 500, '❌ Server error', err);
  }
};

// ===== UPDATE PROFILE =====
const updateProfile = async (req, res) => {
  try {
    const { name, currency, financialGoals } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, currency, financialGoals },
      { new: true }
    ).select('-password');

    return successResponse(res, 200, '✅ Profile updated!', { user });
  } catch (err) {
    return errorResponse(res, 500, '❌ Server error', err);
  }
};

// ===== OAUTH SUCCESS =====
const oauthSuccess = (req, res) => {
  try {
    const token = generateToken(req.user);
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (err) {
    res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
  }
};

// ===== OAUTH FAILURE =====
const oauthFailure = (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
};

export {
  register,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  oauthSuccess,
  oauthFailure
};