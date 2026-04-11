# Wealthy Monorepo

Wealthy is a microservices-based personal finance platform. It combines transaction management, AI-powered financial guidance, analytics, autopilot flows, and Stripe subscriptions behind a single gateway.

## Project Overview

This repository uses npm workspaces and is organized into:

- backend: all microservices
- common: shared models, middleware, utilities, and response helpers
- client: frontend application

Core design:

- Gateway-first API access for frontend clients
- JWT-protected user routes
- Shared MongoDB database across services
- AI assistant with guardrails for finance-only conversations

## Services

### Gateway Service

- Path prefix routing:
	- /api/auth -> auth-service
	- /api/transactions -> transaction-service
	- /api/ai -> ai-finance-service
	- /api/payments -> payment-service

### Auth Service

- Local auth: register, login, token refresh
- Profile APIs: get/update profile
- OAuth flows: Google, Facebook, Twitter

### Transaction Service

- CRUD transactions
- Categories and custom category support
- Dashboard summaries and charts
- Spending and savings aggregations
- Analytics Sankey endpoint
- Autopilot flow management

### AI Finance Service

- Finance guardrails and query classification
- Personal insight via transaction-aware RAG flow
- General finance guidance
- Chat history and conversation loading
- Suggested questions endpoint based on recent chat activity

### Payment Service

- Stripe checkout session creation
- Stripe webhook processing
- Subscription lookup endpoint for current user plan

## Main API Endpoints (via Gateway)

All examples assume gateway runs on port 5000.

### Auth

- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- GET /api/auth/profile
- PUT /api/auth/profile

### Transactions

- POST /api/transactions/
- GET /api/transactions/
- GET /api/transactions/categories
- POST /api/transactions/categories
- GET /api/transactions/:id
- PATCH /api/transactions/:id
- DELETE /api/transactions/:id
- GET /api/transactions/dashboard/summary
- GET /api/transactions/dashboard/chart
- GET /api/transactions/dashboard/spending
- GET /api/transactions/dashboard/savings

### Analytics

- GET /api/transactions/analytics/sankey

### Autopilot

- GET /api/transactions/autopilot
- POST /api/transactions/autopilot
- PATCH /api/transactions/autopilot/:id
- PATCH /api/transactions/autopilot/:id/toggle
- DELETE /api/transactions/autopilot/:id

### AI

- POST /api/ai/chat
- GET /api/ai/history
- GET /api/ai/history/:id
- GET /api/ai/suggestions

### Payments

- POST /api/payments/subscribe
- GET /api/payments/subscription
- POST /api/payments/webhook

## Setup

### 1. Prerequisites

- Node.js 18+
- npm 9+
- MongoDB Atlas
- Stripe account
- Google credentials for OAuth and Gemini

### 2. Install dependencies

Run once at repository root:

```bash
npm install
```

### 3. Environment configuration

Create a root .env file.

Recommended template:

```env
# Ports
GATEWAY_PORT=5000
AUTH_PORT=5001
TRANSACTION_PORT=5002
AI_PORT=5003
PAYMENT_PORT=5004

# Database and auth
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret

# AI and external services
GEMINI_API_KEY=your_gemini_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
FRONTEND_URL=http://localhost:3000

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
TWITTER_CONSUMER_KEY=your_twitter_consumer_key
TWITTER_CONSUMER_SECRET=your_twitter_consumer_secret
```

Note: current service code reads MONGODB_URI. If your file uses MONGO_URI, update it to MONGODB_URI.

### 4. Run backend services

From root:

```bash
npm run dev
```

This starts backend services in parallel (auth, transaction, ai, gateway, payment).

## Quick Verification

After startup:

- Gateway should be available at http://localhost:5000
- Protected endpoints require Authorization header with Bearer token
- Stripe webhook must receive raw JSON body at /api/payments/webhook

If gateway returns 504, verify target service is running on expected port and env port values are aligned.