#!/bin/bash

echo "🚀 Sightline.ai Debug Startup Script"
echo "======================================"

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "✅ Port $port is in use"
        return 0
    else
        echo "❌ Port $port is free"
        return 1
    fi
}

# Function to kill processes on a port
kill_port() {
    local port=$1
    echo "🔪 Killing processes on port $port..."
    lsof -ti:$port | xargs kill -9 2>/dev/null
    sleep 1
}

# Check current status
echo ""
echo "📊 Current Status:"
check_port 3000 && echo "   Frontend (Next.js) running on port 3000" || echo "   Frontend not running"
check_port 8000 && echo "   Backend (FastAPI) running on port 8000" || echo "   Backend not running"

# Kill existing processes
echo ""
echo "🧹 Cleaning up existing processes..."
kill_port 3000
kill_port 8000

# Check environment
echo ""
echo "🔍 Environment Check:"

if [ -f ".env.local" ]; then
    echo "✅ .env.local exists"
    
    # Check for required variables
    if grep -q "OPENAI_API_KEY" .env.local; then
        echo "✅ OPENAI_API_KEY found"
    else
        echo "❌ OPENAI_API_KEY missing"
    fi
    
    if grep -q "DATABASE_URL" .env.local; then
        echo "✅ DATABASE_URL found"
    else
        echo "❌ DATABASE_URL missing"
    fi
    
    if grep -q "NEXTAUTH_SECRET" .env.local; then
        echo "✅ NEXTAUTH_SECRET found"
    else
        echo "❌ NEXTAUTH_SECRET missing"
    fi
else
    echo "❌ .env.local not found"
    echo "   Please copy .env.example to .env.local and fill in the values"
fi

# Check database connection
echo ""
echo "🔍 Database Check:"
if command -v psql >/dev/null 2>&1; then
    echo "✅ PostgreSQL client available"
else
    echo "⚠️  PostgreSQL client not found (optional for Neon)"
fi

# Check Python environment
echo ""
echo "🔍 Python Environment Check:"
if [ -d "venv" ]; then
    echo "✅ Virtual environment exists"
    if [ -f "venv/bin/python" ]; then
        echo "✅ Python executable found"
        venv/bin/python --version
    else
        echo "❌ Python executable not found in venv"
    fi
else
    echo "❌ Virtual environment not found"
    echo "   Run: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
fi

# Check Node.js dependencies
echo ""
echo "🔍 Node.js Dependencies Check:"
if [ -d "node_modules" ]; then
    echo "✅ node_modules exists"
else
    echo "❌ node_modules missing"
    echo "   Run: npm install or pnpm install"
fi

# Start services
echo ""
echo "🚀 Starting Services..."

# Start backend
echo "Starting FastAPI backend..."
cd api
../venv/bin/python -m uvicorn index:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Check if backend started
if check_port 8000; then
    echo "✅ Backend started successfully"
else
    echo "❌ Backend failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start frontend
echo "Starting Next.js frontend..."
npm run dev &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 5

# Check if frontend started
if check_port 3000; then
    echo "✅ Frontend started successfully"
else
    echo "❌ Frontend failed to start"
    kill $FRONTEND_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 Both services are running!"
echo "📱 Frontend: http://localhost:3000"
echo "🔗 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "📋 Debugging Steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Open browser dev tools (F12)"
echo "3. Check the Debug Panel in the bottom-right corner"
echo "4. Try pasting a YouTube URL"
echo "5. Watch the logs in the Debug Panel and browser console"
echo ""
echo "🛑 To stop: Press Ctrl+C or run 'pkill -f uvicorn && pkill -f next'"

# Keep script running
wait