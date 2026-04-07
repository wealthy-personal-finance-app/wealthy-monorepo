import Stripe from "stripe";
import { Subscription } from "@wealthy/common";

let stripe;

const getStripe = () => {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is missing from environment variables');
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
};

export const createCheckoutSession = async (userId, userEmail, interval) => {
  const stripeInstance = getStripe();
  
  const isAnnual = interval === 'annually';
  const unitAmount = isAnnual ? 9999 : 999; 

  return await stripeInstance.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { 
          name: `Wealthy Pro - ${interval.charAt(0).toUpperCase() + interval.slice(1)}`,
          description: isAnnual ? 'Full access for 1 year' : 'Full access for 1 month'
        },
        unit_amount: unitAmount,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL}/success`,
    cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    metadata: { userId, interval }, 
    customer_email: userEmail
  });
};

export const fulfillOrder = async (session) => {
  const { userId, interval } = session.metadata;
  const stripeCustomerId = session.customer; 
  
  const expiry = new Date();
  
  if (interval === 'annually') {
    expiry.setFullYear(expiry.getFullYear() + 1);
  } else {
    expiry.setMonth(expiry.getMonth() + 1);
  }

  return await Subscription.findOneAndUpdate(
    { userId },
    { 
      plan: "pro", 
      status: "active", 
      interval: interval || "monthly",
      stripeCustomerId: stripeCustomerId, 
      expiryDate: expiry 
    },
    { upsert: true, new: true }
  );
};

export const verifyWebhook = (body, signature) => {
  const stripeInstance = getStripe();
  return stripeInstance.webhooks.constructEvent(
    body, 
    signature, 
    process.env.STRIPE_WEBHOOK_SECRET
  );
};