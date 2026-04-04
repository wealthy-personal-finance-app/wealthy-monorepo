
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import connectDB from '../../../common/config/db.js';
import authRoutes from './routes/authRoutes.js';
import { initializePassport } from './config/passport.js';

const app = express();

// Initialize passport AFTER dotenv loads
initializePassport();

// Middleware
app.use(cors());
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'wealthy_secret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);

// Health Check
app.get('/', (req, res) => {
  res.json({ 
    message: '✅ Auth Service Running!',
    service: 'auth-service',
    port: process.env.AUTH_PORT || 5001
  });
});

// Connect DB and Start Server
const PORT = process.env.AUTH_PORT || 5001;
connectDB('wealthy_auth').then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Auth Service running on port ${PORT}`);
  });
});