# 💰 Wealthy Monorepo | AI-Powered Financial Assistant

Wealthy is a microservices-based financial platform designed to help users manage their finances through an intelligent AI Assistant. The system features automated transaction tracking, Google OAuth security, and Stripe-powered premium features.

---

## 🚀 Getting Started

Follow these steps to set up the project locally after cloning the repository.

### 1. Prerequisites
Ensure you have the following installed on your machine:
* **Node.js** (v18.0.0 or higher)
* **NPM** (v9.0.0 or higher)
* **MongoDB Atlas** account
* **Google Cloud Console** account (for Gemini and Auth)

### 2. Install Dependencies
This project uses **NPM Workspaces**. You only need to run the install command once from the root directory to link all services, the shared library, and the frontend.

npm install

### 3.Environment Configuration
The system uses a Centralized Environment Strategy. Create a .env file in the root directory (the same folder as this README).

Copy the following template and replace the placeholders with your actual keys:
# --- Gateway & Ports ---
GATEWAY_PORT=5000
AUTH_PORT=5001
TRANSACTION_PORT=5002
AI_PORT=5003
PAYMENT_PORT=5004
PORT=3000

# --- Databases & Security ---
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/wealthy
JWT_SECRET=your_random_secret_string_here

# --- AI & External APIs ---
GEMINI_API_KEY=your_google_ai_key
STRIPE_SECRET_KEY=your_stripe_test_key

### 4. Running the Project

You can launch the entire ecosystem (Gateway, all Backend Services, and the React Client) simultaneously with one command:
npm run dev

### 5. Verifying the Setup (API Health Checks)
Once the project is running, you can verify the connectivity of all microservices by visiting these endpoints in your browser or using Postman. All requests must go through the **Gateway (Port 5000)**.

| Service | Test Endpoint URL | Expected Response |
| :--- | :--- | :--- |
| **AI Finance** | `http://localhost:5000/api/ai/ask` | `{"message": "AI Finance Service: Query endpoint active"}` |


If you receive a `504 Gateway Timeout`, ensure the specific service is running in your terminal. If you receive a `404 Not Found`, check that the route is correctly defined in the service's `index.js`.