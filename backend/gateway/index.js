import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.GATEWAY_PORT || 5000;

// Route to Auth Service
app.use('/api/auth', createProxyMiddleware({ 
    target: `http://localhost:${process.env.AUTH_PORT || 5001}`, 
    changeOrigin: true 
}));

// Route to Transaction Service
app.use('/api/transactions', createProxyMiddleware({ 
    target: `http://localhost:${process.env.TRANSACTION_PORT || 5002}`, 
    changeOrigin: true 
}));

// Route to AI Finance Service
app.use('/api/ai', createProxyMiddleware({ 
    target: `http://localhost:${process.env.AI_PORT || 5003}`, 
    changeOrigin: true 
}));

// Route to Payment Service
app.use('/api/payments', createProxyMiddleware({ 
    target: `http://localhost:${process.env.PAYMENT_PORT || 5004}`, 
    changeOrigin: true 
}));

app.listen(PORT, () => console.log(`Gateway running on port ${PORT}`));