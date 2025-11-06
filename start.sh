#!/bin/bash

# Greta Productivity Agent - Quick Start Script

echo "🚀 Greta Productivity Agent - Quick Start"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | sed 's/v//' | cut -d'.' -f1)
# Only check if it's a number
if [[ "$NODE_VERSION" =~ ^[0-9]+$ ]] && [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Node.js version is too old. You have $(node -v), but need v18+"
    echo "   Please upgrade Node.js: https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js $(node -v) detected"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✓ Dependencies installed"
    echo ""
fi

# Check if project is built
if [ ! -d "dist" ]; then
    echo "🔨 Building TypeScript code..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Build failed"
        exit 1
    fi
    echo "✓ Build complete"
    echo ""
fi

echo "🎯 Starting Greta Productivity Agent..."
echo ""
echo "The app will:"
echo "  • Start tracking your active window every 5 seconds"
echo "  • Store data locally in SQLite database"
echo "  • Display a dashboard with your activities"
echo ""
echo "Press Ctrl+C to stop the application"
echo ""

npm start
