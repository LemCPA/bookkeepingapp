#!/bin/bash

# Deployment Script for Bookkeeping App to Production (bookkeeping-app.ca)
# Usage: ./deploy.sh [production-server-url] [production-path]
# Example: ./deploy.sh user@bookkeeping-app.ca /home/bookkeeping-app

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get input parameters
PROD_SERVER="${1:-user@bookkeeping-app.ca}"
PROD_PATH="${2:-/home/bookkeeping-app}"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Bookkeeping App - Production Deployment${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Validate .next build exists
if [ ! -d ".next" ]; then
  echo -e "${RED}ERROR: .next build directory not found!${NC}"
  echo "Please run 'npm run build' first or ensure the build exists."
  exit 1
fi

echo -e "${GREEN}✓${NC} .next build directory found"

# Create deployment package
echo -e "${YELLOW}Creating deployment package...${NC}"

DEPLOY_DIR="bookkeeping-app-deploy-$(date +%s)"
mkdir -p "$DEPLOY_DIR"

# Copy essential files
echo "  - Copying .next build (production files only)..."
mkdir -p "$DEPLOY_DIR/.next"
cp -r .next/server "$DEPLOY_DIR/.next/" 2>/dev/null || true
cp -r .next/static "$DEPLOY_DIR/.next/" 2>/dev/null || true
cp -r .next/build "$DEPLOY_DIR/.next/" 2>/dev/null || true
cp .next/*.json "$DEPLOY_DIR/.next/" 2>/dev/null || true
cp .next/*.js "$DEPLOY_DIR/.next/" 2>/dev/null || true

echo "  - Copying app code..."
cp -r app "$DEPLOY_DIR/" 2>/dev/null || true
cp -r public "$DEPLOY_DIR/" 2>/dev/null || true
cp -r lib "$DEPLOY_DIR/" 2>/dev/null || true
cp -r components "$DEPLOY_DIR/" 2>/dev/null || true

echo "  - Copying configuration files..."
cp package.json "$DEPLOY_DIR/"
cp package-lock.json "$DEPLOY_DIR/" 2>/dev/null || true
cp next.config.js "$DEPLOY_DIR/" 2>/dev/null || true
cp tsconfig.json "$DEPLOY_DIR/" 2>/dev/null || true

# Create environment template
cat > "$DEPLOY_DIR/.env.production" << 'EOF'
# Production Environment Variables
ANTHROPIC_API_KEY=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
JWT_SECRET=change-this-to-a-secure-random-string-in-production
NODE_ENV=production
EOF

# Create deployment helper script
cat > "$DEPLOY_DIR/deploy-remote.sh" << 'SCRIPT'
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
SCRIPT

chmod +x "$DEPLOY_DIR/deploy-remote.sh"

# Create tarball
echo -e "${YELLOW}Creating compressed package...${NC}"
tar -czf "$DEPLOY_DIR.tar.gz" "$DEPLOY_DIR/"
echo -e "${GREEN}✓${NC} Package created: $DEPLOY_DIR.tar.gz"

# Display next steps
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${GREEN}DEPLOYMENT PACKAGE READY${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "Package: $DEPLOY_DIR.tar.gz"
echo ""
echo -e "${YELLOW}NEXT STEPS:${NC}"
echo ""
echo "1. Transfer package to production server:"
echo "   scp $DEPLOY_DIR.tar.gz $PROD_SERVER:/tmp/"
echo ""
echo "2. SSH into production server:"
echo "   ssh $PROD_SERVER"
echo ""
echo "3. Extract and deploy:"
echo "   cd /tmp"
echo "   tar -xzf $DEPLOY_DIR.tar.gz"
echo "   cd $DEPLOY_DIR"
echo "   ./deploy-remote.sh $PROD_PATH"
echo ""
echo "4. Verify deployment:"
echo "   pm2 logs bookkeeping-app"
echo "   # Should show: 'ready - started server on 0.0.0.0:3000'"
echo ""
echo -e "${YELLOW}CONFIGURATION:${NC}"
echo "- Update .env.production with production values before deploying"
echo "- Ensure JWT_SECRET is a long, random string"
echo "- Database should already be configured on production server"
echo ""
echo -e "${GREEN}✓ Ready to deploy!${NC}"
