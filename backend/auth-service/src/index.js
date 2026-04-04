import express, { json } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
app.use(json());

const PORT = process.env.AUTH_PORT || 5001;

app.post('/login', (req, res) => {
    // Phase 2: Implement Google Auth logic here
    res.json({ message: "Auth Service: Login endpoint active" });
});

app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));