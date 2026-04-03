import express, { json } from 'express';
import { connect } from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
const app = express();
app.use(json());

const PORT = process.env.TRANSACTION_PORT || 5002;

// connect(process.env.MONGO_URI)
//     .then(() => console.log("Transaction Service connected to MongoDB"))
//     .catch(err => console.error("MongoDB connection error:", err));

app.get('/summary', (req, res) => {
    // Phase 1: Implement MongoDB CRUD logic here
    res.json({ message: "Transaction Service: Summary endpoint active" });
});

app.listen(PORT, () => console.log(`Transaction Service running on port ${PORT}`));