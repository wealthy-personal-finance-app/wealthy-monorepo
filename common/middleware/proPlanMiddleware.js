import { Subscription } from '../models/Subscription.js';
import { errorResponse } from '../utils/responses.js';

export const checkProPlan = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const subscription = await Subscription.findOne({
      userId,
      plan: 'pro',
      status: 'active',
      expiryDate: { $gt: new Date() } 
    });

    if (!subscription) {
      return errorResponse(res, 403, "Access Denied. This feature requires a Wealthy Pro subscription.");
    }

    next();
  } catch (error) {
    return errorResponse(res, 500, "Error verifying subscription status", error);
  }
};