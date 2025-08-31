#!/bin/bash

echo "🧹 Clearing Vite caches..."

# Clear Vite cache directories
rm -rf node_modules/.vite
rm -rf .vite
rm -rf dist

# Clear npm cache (optional)
# npm cache clean --force

# Clear any temporary files
find . -name "*.tmp" -delete 2>/dev/null
find . -name "*.cache" -delete 2>/dev/null

echo "✅ Caches cleared successfully!"
echo "🚀 Starting development server..."

# Start the development server
npm run dev 