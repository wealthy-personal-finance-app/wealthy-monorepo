import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
app.use(express.json());

const PORT = process.env.AI_PORT || 5003;
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/ask', async (req, res) => {
    // Phase 4-6: Implement Classifier, Guardrails, and RAG here
    res.json({ message: "AI Finance Service: Query endpoint active" });
});

app.listen(PORT, () => console.log(`AI Finance Service running on port ${PORT}`));