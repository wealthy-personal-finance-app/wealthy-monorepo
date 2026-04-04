import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    default: null
  },
  avatar: {
    type: String,
    default: null
  },
  provider: {
    type: String,
    enum: ['local', 'google', 'facebook', 'twitter'],
    default: 'local'
  },
  providerId: {
    type: String,
    default: null
  },
  currency: {
    type: String,
    default: 'USD'
  },
  financialGoals: {
    type: String,
    default: null
  },
  habitStrengthScore: {
    type: Number,
    default: 0
  },
  streak: {
    type: Number,
    default: 0
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  role: {
    type: String,
    enum: ['basic', 'pro'],
    default: 'basic'
  }
}, { timestamps: true });

export default mongoose.model('User', UserSchema);