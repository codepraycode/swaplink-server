#!/bin/bash

# Load environment variables from .env.production
if [ -f .env.production ]; then
  export $(grep -v '^#' .env.production | xargs)
else
  echo "❌ .env.production file not found!"
  exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is not set in .env.production"
  exit 1
fi

echo "🚀 Deploying migrations to production database..."
echo "Database URL: $DATABASE_URL"

# Run Prisma migration
npx prisma migrate deploy

if [ $? -eq 0 ]; then
  echo "✅ Migrations applied successfully!"
else
  echo "❌ Migration failed!"
  exit 1
fi
