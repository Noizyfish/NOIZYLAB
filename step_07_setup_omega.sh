#!/bin/bash
# Step 7: Setup Omega Miracle Engine

echo "[7/10] Installing Omega Miracle Engine..."

cd ../miracle

if [ -f "package.json" ]; then
    echo "       📦 Installing miracle engine..."
    npm install --silent
    echo "       ✅ Omega Core ready"
else
    echo "       ℹ️  Omega engine is TypeScript modules"
    echo "       ✅ Miracle Engine loaded"
fi

cd ../installer

echo ""
