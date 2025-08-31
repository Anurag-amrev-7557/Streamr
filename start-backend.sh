#!/bin/bash

# Streamr Backend Startup Script
echo "🚀 Starting Streamr Backend Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "backend/package.json" ]; then
    echo "❌ Please run this script from the project root directory."
    exit 1
fi

# Navigate to backend directory
cd backend

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating a basic one..."
    cat > .env << EOF
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/streamr
# or use MongoDB Atlas: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/streamr

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# TMDB API Key
TMDB_API_KEY=your-tmdb-api-key

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
    echo "✅ Created .env file. Please update it with your actual configuration."
fi

# Start the server
echo "🌐 Starting backend server on http://localhost:3001"
echo "📱 Frontend should be running on http://localhost:5173"
echo "🔌 WebSocket will be available on http://localhost:3001/community"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev 