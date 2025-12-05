#!/bin/bash
# Step 4: Setup Backend

echo "[4/10] Setting up Noizy.AI backend..."

cd ../backend/core

if [ -f "package.json" ]; then
    echo "       📦 Installing Node.js dependencies..."
    npm install --silent
    echo "       ✅ Backend dependencies installed"
else
    echo "       ⚠️  package.json not found - skipping"
fi

cd ../../installer

echo ""
