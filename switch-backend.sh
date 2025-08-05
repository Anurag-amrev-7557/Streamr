#!/bin/bash

# Backend Switcher Script
# Usage: ./switch-backend.sh [local|deployed]

set -e

FRONTEND_DIR="frontend"
ENV_FILE="$FRONTEND_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env file not found in $FRONTEND_DIR"
    exit 1
fi

if [ $# -eq 0 ]; then
    echo "Usage: $0 [local|deployed]"
    echo ""
    echo "Current configuration:"
    grep "VITE_API_URL" "$ENV_FILE" || echo "No VITE_API_URL found"
    exit 1
fi

MODE=$1

case $MODE in
    "local")
        echo "🔄 Switching to local backend..."
        sed -i.bak 's|VITE_API_URL=.*|VITE_API_URL=http://localhost:3001/api|' "$ENV_FILE"
        echo "✅ Switched to local backend"
        echo "🌐 API URL: http://localhost:3001/api"
        ;;
    "deployed")
        echo "🔄 Switching to deployed backend..."
        sed -i.bak 's|VITE_API_URL=.*|VITE_API_URL=https://streamr-jjj9.onrender.com/api|' "$ENV_FILE"
        echo "✅ Switched to deployed backend"
        echo "🌐 API URL: https://streamr-jjj9.onrender.com/api"
        ;;
    *)
        echo "❌ Invalid mode. Use 'local' or 'deployed'"
        exit 1
        ;;
esac

echo ""
echo "📝 Updated configuration:"
grep "VITE_API_URL" "$ENV_FILE"

echo ""
echo "⚠️  Note: You may need to restart your frontend development server"
echo "   to pick up the new configuration."
echo ""
echo "   To restart:"
echo "   cd frontend && npm run dev" 