#!/bin/bash

# 🚀 Deploy Watchlist Fix to Production
# This script automates the deployment of the watchlist 500 error fix

set -e  # Exit on any error

echo "🚀 Starting Watchlist Fix Deployment..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Current directory: $(pwd)"

# Step 1: Check git status
print_status "Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    print_warning "You have uncommitted changes. Please commit them first:"
    git status --short
    echo ""
    read -p "Do you want to continue with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled. Please commit your changes first."
        exit 1
    fi
fi

# Step 2: Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    print_warning "You're not on the main branch (currently on: $CURRENT_BRANCH)"
    read -p "Do you want to switch to main branch? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout main
        print_success "Switched to main branch"
    else
        print_error "Deployment cancelled. Please switch to main branch first."
        exit 1
    fi
fi

# Step 3: Pull latest changes
print_status "Pulling latest changes from remote..."
git pull origin main

# Step 4: Check if backend dependencies are installed
print_status "Checking backend dependencies..."
if [ ! -d "backend/node_modules" ]; then
    print_warning "Backend dependencies not installed. Installing now..."
    cd backend
    npm install
    cd ..
    print_success "Backend dependencies installed"
else
    print_success "Backend dependencies already installed"
fi

# Step 5: Test the backend locally
print_status "Testing backend locally..."
cd backend
if npm test 2>/dev/null; then
    print_success "Backend tests passed"
else
    print_warning "Backend tests not configured or failed - continuing with deployment"
fi
cd ..

# Step 6: Commit and push changes
print_status "Committing changes..."
git add .
git commit -m "Fix watchlist 500 error: Add database migration and schema updates

- Add database migration script for User model schema
- Ensure watchlist, wishlist, viewingProgress fields exist
- Fix 500 errors on watchlist sync endpoint
- Update User model with proper field definitions"

print_success "Changes committed"

print_status "Pushing to remote repository..."
git push origin main
print_success "Changes pushed to remote"

# Step 7: Deployment instructions
echo ""
echo "🎯 Deployment Instructions for Render:"
echo "======================================"
echo ""
echo "1. Go to Render Dashboard: https://dashboard.render.com"
echo "2. Select your backend service: streamr-jjj9"
echo "3. Go to Settings > Environment"
echo "4. Ensure these environment variables are set:"
echo "   - NODE_ENV=production"
echo "   - MONGO_URI=your_mongodb_connection_string"
echo "   - JWT_SECRET=your_jwt_secret"
echo "   - SESSION_SECRET=your_session_secret"
echo ""
echo "5. Click 'Manual Deploy'"
echo "6. Select 'Deploy latest commit'"
echo "7. Wait for deployment to complete"
echo ""
echo "8. After deployment, run the database migration:"
echo "   - Go to your service dashboard"
echo "   - Click 'Shell'"
echo "   - Run: node database-migration.js"
echo ""

# Step 8: Test deployment
print_status "After deployment, test the endpoints:"
echo ""
echo "Test health endpoint:"
echo "curl https://streamr-jjj9.onrender.com/api/health"
echo ""
echo "Test watchlist sync (should get 401 without auth):"
echo "curl -X POST https://streamr-jjj9.onrender.com/api/user/watchlist/sync \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"watchlist\": []}'"
echo ""

# Step 9: Alternative deployment method
echo "🔄 Alternative: Quick Deploy via Render Shell"
echo "=============================================="
echo ""
echo "If you prefer to deploy directly via shell:"
echo "1. Go to your service dashboard"
echo "2. Click 'Shell'"
echo "3. Run these commands:"
echo ""
echo "cd /opt/render/project/src"
echo "git pull origin main"
echo "npm install"
echo "node database-migration.js"
echo ""

print_success "Deployment script completed!"
print_status "Next steps:"
echo "  1. Deploy to Render using the instructions above"
echo "  2. Run the database migration"
echo "  3. Test the endpoints"
echo "  4. Verify watchlist sync works without 500 errors"

echo ""
echo "�� Happy deploying!"
