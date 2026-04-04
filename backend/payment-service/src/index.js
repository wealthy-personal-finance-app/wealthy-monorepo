import express, { json, raw } from 'express';
import stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();

// Stripe webhooks require the raw body to verify the signature
// We use a middleware to handle JSON for regular routes
app.use((req, res, next) => {
    if (req.originalUrl === '/webhook') {
        next();
    } else {
        json()(req, res, next);
    }
});

const PORT = process.env.PAYMENT_PORT || 5004;
// const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY);

// Route for creating a checkout session
app.post('/create-checkout', async (req, res) => {
    // Phase 7: Implement Stripe Checkout logic here
    res.json({ message: "Payment Service: Checkout endpoint active" });
});

// Route for Stripe Webhooks
app.post('/webhook', raw({ type: 'application/json' }), (req, res) => {
    // This handles payment success/failure notifications from Stripe
    res.status(200).send({ received: true });
});

app.listen(PORT, () => console.log(`Payment Service running on port ${PORT}`));