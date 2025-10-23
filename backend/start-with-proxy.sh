#!/bin/bash

# Start TMDB Proxy Server and Main Backend
# This script resolves TLS issues by using a proxy fallback

echo "🚀 Starting Streamr Backend with TMDB Proxy Fallback..."

# Function to cleanup background processes
cleanup() {
    echo "🛑 Shutting down servers..."
    kill $PROXY_PID $BACKEND_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

# Start TMDB Proxy Server
echo "📡 Starting TMDB Proxy Server on port 5001..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use default

node tmdb-proxy-server.js &
PROXY_PID=$!

# Wait a moment for proxy server to start
sleep 3

# Check if proxy server is running
if ! curl -s http://localhost:5001/health > /dev/null; then
    echo "❌ Failed to start TMDB Proxy Server"
    exit 1
fi

echo "✅ TMDB Proxy Server started successfully"

# Start Main Backend Server
echo "🔧 Starting Main Backend Server on port 3001..."
npm start &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 5

# Check if backend is running
if ! curl -s http://localhost:3001/api/health > /dev/null; then
    echo "❌ Failed to start Main Backend Server"
    kill $PROXY_PID 2>/dev/null
    exit 1
fi

echo "✅ Main Backend Server started successfully"
echo ""
echo "🎉 Both servers are running:"
echo "   📡 TMDB Proxy: http://localhost:5001"
echo "   🔧 Main Backend: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait 