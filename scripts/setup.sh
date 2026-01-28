#!/bin/bash
# setup.sh

echo "🚀 Setting up SwapLink Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "📦 Installing dependencies..."
pnpm install

echo "🐳 Starting Docker containers..."
pnpm run docker:dev:up

echo "⏳ Waiting for database to be ready..."
sleep 10

echo "🔄 Running database migrations..."
pnpm run db:migrate

echo "🔧 Generating Prisma client..."
pnpm run db:generate

echo "✅ Setup complete! Run 'pnpm run dev' to start the development server."
