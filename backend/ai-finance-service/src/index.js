import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envPath = path.resolve(__dirname, '../../../.env');

// Log this to your terminal to see the actual path
console.log("Looking for .env at:", envPath);

dotenv.config({ path: envPath });

console.log("API Key loaded:", process.env.GEMINI_API_KEY ? "YES" : "NO");

import express from 'express';

import cors from 'cors';
import { connectDB } from '@wealthy/common';
import aiRoutes from './routes/aiRoutes.js';

// 1. Setup environment pathing


console.log("API KEY:", process.env.GEMINI_API_KEY);

const app = express();

// 2. Connect to MongoDB (Data & Execution Layer)
// This ensures the AI can access transactions and chat history

// 3. Middleware
app.use(cors());
// express.json() is required here for the /chat and /history endpoints
app.use(express.json());

// 4. Routing (Intelligence Layer)
// Mounts the AI routes which include guardrails, classifiers, and RAG logic
app.use("/", aiRoutes);

// 5. Start Service
const PORT = process.env.AI_PORT || 5005;

const startService = async () => {
  try {
      await connectDB("wealthy_auth");
      console.log("✅ Connected to MongoDB");
      app.listen(PORT, () => {
          console.log(`🤖 Wealthy AI Finance Service running on port ${PORT}`)
      })
  } catch (error) {
      console.error("❌ Failed to connect to MongoDB", error)
    }
}
startService();
