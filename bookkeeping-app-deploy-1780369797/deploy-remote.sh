#!/bin/bash
# Remote deployment script - Run this on the production server

set -e

DEPLOY_PATH="${1:-.}"
echo "Deploying to $DEPLOY_PATH..."

# Stop the current app (if running)
echo "Stopping current app instance..."
pm2 stop bookkeeping-app 2>/dev/null || true
sleep 2

# Backup current version
if [ -d "$DEPLOY_PATH/current" ]; then
  echo "Backing up current version..."
  mv "$DEPLOY_PATH/current" "$DEPLOY_PATH/backup-$(date +%s)"
fi

# Copy new version
echo "Installing new version..."
mv "$(pwd)" "$DEPLOY_PATH/current"
cd "$DEPLOY_PATH/current"

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Update environment (keep existing .env.production if it exists)
if [ ! -f ".env.production" ]; then
  echo "WARNING: .env.production not found. Creating template..."
  cp .env.production .env.production.local
fi

# Start the app
echo "Starting app..."
pm2 start npm --name "bookkeeping-app" -- start

echo "✓ Deployment complete!"
echo "App running at bookkeeping-app.ca"
