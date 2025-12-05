#!/bin/bash
# Step 5: Setup Python Brain

echo "[5/10] Configuring Noizy Brain (FastAPI)..."

cd ../backend/brain

if [ -f "requirements.txt" ]; then
    echo "       📦 Installing Python dependencies..."
    pip3 install -q -r requirements.txt
    echo "       ✅ Brain dependencies installed"
else
    echo "       ⚠️  requirements.txt not found - installing basics..."
    pip3 install -q fastapi uvicorn pydantic
fi

cd ../../installer

echo ""
