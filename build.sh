#!/bin/bash
set -e

echo "🚀 Starting ChatBill deployment..."

# Navigate to backend
cd backend

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Run migrations (optional - doar dacă vrei auto-migrate)
# echo "🗄️ Running database migrations..."
# npx prisma migrate deploy

echo "✅ Build completed successfully!"
