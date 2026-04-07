import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  plan: { type: String, enum: ['free', 'pro'], default: 'free' },
  interval: { type: String, enum: ['monthly', 'annually'], default: 'monthly' },
  status: { type: String, enum: ['active', 'expired', 'canceled'], default: 'active' },
  stripeCustomerId: { type: String },
  expiryDate: { type: Date }
}, { timestamps: true });

export default mongoose.model('Subscription', subscriptionSchema);