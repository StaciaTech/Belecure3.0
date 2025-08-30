#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo "================================================"
echo "  🚀 BELECURE - AI FLOORPLAN STUDIO"
echo "================================================"
echo "  Starting development servers..."
echo ""

# Function to handle cleanup
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Install backend dependencies
echo -e "${BLUE}[1/3]${NC} Installing backend dependencies..."
cd backend
npm install --silent
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Backend dependency installation failed${NC}"
    exit 1
fi

# Install frontend dependencies
echo -e "${BLUE}[2/3]${NC} Installing frontend dependencies..."
cd ../frontend
npm install --silent
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend dependency installation failed${NC}"
    exit 1
fi

echo -e "${BLUE}[3/3]${NC} Starting servers..."
echo ""

# Start backend server
echo -e "${PURPLE}⚙️  Starting Backend Server...${NC}"
cd ../backend
npm run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend server
echo -e "${CYAN}🎨 Starting Frontend Server...${NC}"
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}✅ Both servers are starting!${NC}"
echo ""
echo -e "${BLUE}📍 Backend:${NC}  http://localhost:5000"
echo -e "${BLUE}📍 Frontend:${NC} http://localhost:5173"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"

# Wait for background processes
wait 