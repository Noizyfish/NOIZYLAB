#!/bin/bash
# Step 3: Install Python 3

echo "[3/10] Installing Python..."

if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "       ✅ Python already installed: $PYTHON_VERSION"
else
    echo "       📦 Installing Python 3..."
    
    if command -v brew &> /dev/null; then
        brew install python
    elif command -v apt &> /dev/null; then
        sudo apt install -y python3 python3-pip
    fi
    
    echo "       ✅ Python installed"
fi

# Install FastAPI
echo "       📦 Installing FastAPI + dependencies..."
pip3 install -q fastapi uvicorn pydantic

echo ""
