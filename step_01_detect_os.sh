#!/bin/bash
# Step 1: Detect Operating System

echo "[1/10] Detecting OS..."

OS=$(uname)

if [[ "$OS" == "Darwin" ]]; then
    echo "       ✅ macOS detected"
elif [[ "$OS" == "Linux" ]]; then
    echo "       ✅ Linux detected"
else
    echo "       ❌ Unsupported OS: $OS"
    exit 1
fi

echo ""
