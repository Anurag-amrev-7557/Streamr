#!/bin/bash

echo "🔍 Checking Streamr Services Status..."
echo "======================================"

# Check backend
echo "🌐 Backend (http://localhost:3001):"
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "   ✅ Running"
    echo "   📊 Health: $(curl -s http://localhost:3001/api/health)"
else
    echo "   ❌ Not running"
fi

# Check frontend
echo ""
echo "📱 Frontend (http://localhost:5173):"
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "   ✅ Running"
else
    echo "   ❌ Not running"
fi

# Check WebSocket
echo ""
echo "🔌 WebSocket (ws://localhost:3001/community):"
if curl -s http://localhost:3001/community > /dev/null 2>&1; then
    echo "   ✅ Available"
else
    echo "   ❌ Not available"
fi

echo ""
echo "🎯 Quick Access:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:3001/api"
echo "   Backend Health: http://localhost:3001/api/health"
echo ""
echo "💡 To stop services:"
echo "   Backend: Ctrl+C in backend terminal"
echo "   Frontend: Ctrl+C in frontend terminal" 