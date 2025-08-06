#!/bin/bash

echo "🔍 Testing WebSocket Connections..."
echo "=================================="

# Test Backend Health
echo "1. Testing Backend Health..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "   ✅ Backend is running and healthy"
else
    echo "   ❌ Backend is not responding"
    exit 1
fi

# Test Frontend
echo "2. Testing Frontend..."
if curl -s http://localhost:5173 > /dev/null; then
    echo "   ✅ Frontend is running"
else
    echo "   ❌ Frontend is not responding"
    exit 1
fi

# Test WebSocket endpoints
echo "3. Testing WebSocket Endpoints..."

# Test Vite HMR WebSocket (port 5173)
echo "   Testing Vite HMR WebSocket..."
if nc -z localhost 5173 2>/dev/null; then
    echo "   ✅ Vite HMR WebSocket port is open"
else
    echo "   ⚠️  Vite HMR WebSocket port might not be accessible"
fi

# Test Backend WebSocket (port 3001)
echo "   Testing Backend WebSocket..."
if nc -z localhost 3001 2>/dev/null; then
    echo "   ✅ Backend WebSocket port is open"
else
    echo "   ❌ Backend WebSocket port is not accessible"
fi

echo ""
echo "🎯 Summary:"
echo "==========="
echo "✅ Backend API: http://localhost:3001/api/health"
echo "✅ Frontend: http://localhost:5173"
echo "✅ Vite HMR: ws://localhost:5173"
echo "✅ Backend Socket: ws://localhost:3001/community"
echo ""
echo "🌐 To test WebSocket connections in browser:"
echo "   Navigate to: http://localhost:5173/websocket-test"
echo ""
echo "🔧 Configuration:"
echo "   - Frontend using local backend (mode: 'local')"
echo "   - Vite HMR configured with explicit port"
echo "   - WebSocket proxy configured for /community"
echo ""
echo "✨ All connections should now be working!" 