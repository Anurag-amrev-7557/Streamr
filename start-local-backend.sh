#!/bin/bash

echo "🚀 Starting Local Backend..."
echo "================================"

# Check if we're in the right directory
if [ ! -f "backend/package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected to find: backend/package.json"
    exit 1
fi

# Navigate to backend directory
cd backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Check if the backend is already running
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Backend is already running on port 3001"
    echo "   You can access it at: http://localhost:3001"
    echo "   To stop it, press Ctrl+C or run: pkill -f 'node.*3001'"
else
    echo "✅ Starting backend on port 3001..."
    echo "   Access URL: http://localhost:3001"
    echo "   API URL: http://localhost:3001/api"
    echo ""
    echo "Press Ctrl+C to stop the backend"
    echo "================================"
fi

# Start the backend
npm start 