#!/bin/bash

# Start Backend with Debug Mode for Active Users Testing
# This script enables detailed logging for the active users functionality

echo "🚀 Starting Streamr Backend with Debug Mode..."
echo "📍 Debug logging enabled for Active Users tracking"
echo ""

# Set debug environment variable
export DEBUG_ACTIVE_USERS=true

# Navigate to backend directory
cd backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the backend server
echo "🔧 Starting server with DEBUG_ACTIVE_USERS=true..."
echo "📊 Active Users tracking will show detailed logs"
echo ""

npm start 