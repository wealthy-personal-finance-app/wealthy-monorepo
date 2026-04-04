# Create Common Shared Layer
mkdir -p common/middleware common/models common/utils

# Create Backend Services (Execution Layer)
mkdir -p backend/auth-service/src 
mkdir -p backend/transaction-service/src 
mkdir -p backend/ai-finance-service/src/guardrails 
mkdir -p backend/ai-finance-service/src/classifier 
mkdir -p backend/ai-finance-service/src/rag
mkdir -p backend/payment-service/src

# Create API Gateway
mkdir -p backend/gateway
touch backend/gateway/index.js

# Create Client (Frontend)
mkdir -p client/public client/src

# Initialize dummy package.json files for workspaces
for dir in backend/auth-service backend/transaction-service backend/ai-finance-service backend/payment-service backend/gateway client; do
  echo "{\"name\": \"$(basename $dir)\", \"version\": \"1.0.0\"}" > $dir/package.json
done

echo "Structure created successfully"