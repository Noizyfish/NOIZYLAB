#!/bin/bash
# Step 2: Install Node.js

echo "[2/10] Installing Node.js..."

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "       ✅ Node.js already installed: $NODE_VERSION"
else
    echo "       📦 Installing Node.js..."
    
    if command -v brew &> /dev/null; then
        brew install node
    elif command -v apt &> /dev/null; then
        sudo apt update && sudo apt install -y nodejs npm
    else
        echo "       ⚠️  Please install Node.js manually from nodejs.org"
        exit 1
    fi
    
    echo "       ✅ Node.js installed"
fi

echo ""
