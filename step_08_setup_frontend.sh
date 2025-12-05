#!/bin/bash
# Step 8: Setup Frontend

echo "[8/10] Setting up Noizy.AI frontend..."

cd ../frontend

if [ -f "package.json" ]; then
    echo "       📦 Installing React dependencies..."
    npm install --silent
    echo "       ✅ Frontend ready"
else
    echo "       ℹ️  Frontend scaffolded but not yet implemented"
    echo "       ✅ Structure ready"
fi

cd ../installer

echo ""
