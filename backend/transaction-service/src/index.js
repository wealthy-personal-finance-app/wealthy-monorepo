import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '@wealthy/common';
import connectDB from '@wealthy/common/config/db.js'; 
import transactionRoutes from './routes/transactionRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const log = logger.child({ service: 'TRANSACTION-SERVICE' });

app.use(cors());
app.use(express.json());

app.use('/', transactionRoutes);

const PORT = process.env.TRANSACTION_PORT || 5002;

const startService = async () => {
  await connectDB('wealthy_auth');
  app.listen(PORT, () => {
    log.info(`Transaction Service live on port ${PORT}`);
  });
};

startService();