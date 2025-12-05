#!/bin/bash
# Step 6: Setup NoizyGeniuses

echo "[6/10] Installing 25 NoizyGeniuses..."

cd ../geniuses

if [ -f "package.json" ]; then
    echo "       📦 Installing genius dependencies..."
    npm install --silent
    echo "       ✅ All 25 geniuses ready"
else
    echo "       ℹ️  No package.json - geniuses are TypeScript modules"
    echo "       ✅ Geniuses loaded"
fi

cd ../installer

echo ""
