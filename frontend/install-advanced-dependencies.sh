#!/bin/bash

# HomePage Advanced Improvements - Installation Script
# This script installs all necessary dependencies for the advanced HomePage implementation

echo "🚀 Installing HomePage Advanced Dependencies..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to frontend directory
cd "$(dirname "$0")"

echo "${BLUE}📦 Installing State Management...${NC}"
npm install zustand immer

echo ""
echo "${BLUE}📡 Installing React Query...${NC}"
npm install @tanstack/react-query @tanstack/react-query-devtools

echo ""
echo "${BLUE}💾 Installing IndexedDB Wrapper...${NC}"
npm install idb

echo ""
echo "${BLUE}🛡️ Installing Error Boundaries...${NC}"
npm install react-error-boundary

echo ""
echo "${BLUE}📊 Installing Performance Monitoring...${NC}"
npm install web-vitals

echo ""
echo "${BLUE}🎨 Installing UI Utilities (Optional)...${NC}"
npm install react-window react-virtualized-auto-sizer

echo ""
echo "${BLUE}🔧 Installing Developer Tools (DevDependencies)...${NC}"
npm install -D @tanstack/eslint-plugin-query

echo ""
echo "${GREEN}✅ Installation Complete!${NC}"
echo ""
echo "${YELLOW}📚 Next Steps:${NC}"
echo "1. Review HOMEPAGE_IMPLEMENTATION_ROADMAP.md for implementation strategy"
echo "2. Check src/stores/homePageStore.js for the Zustand store"
echo "3. See HOMEPAGE_IMPLEMENTATION_EXAMPLE.jsx for usage examples"
echo "4. Read HOMEPAGE_ADVANCED_IMPROVEMENTS.md for detailed patterns"
echo ""
echo "${YELLOW}🎯 Quick Start:${NC}"
echo "Add React Query provider to your App.jsx:"
echo ""
echo "  import { QueryClient, QueryClientProvider } from '@tanstack/react-query';"
echo "  const queryClient = new QueryClient();"
echo ""
echo "  <QueryClientProvider client={queryClient}>"
echo "    <App />"
echo "  </QueryClientProvider>"
echo ""
echo "${GREEN}Happy coding! 🎉${NC}"
