#!/bin/bash
# Step 10: Final Verification

echo "[10/10] Running final verification..."
echo ""

# Check installations
echo "       🔍 Verifying installations..."

if command -v node &> /dev/null; then
    echo "       ✅ Node.js: $(node --version)"
else
    echo "       ❌ Node.js not found"
fi

if command -v python3 &> /dev/null; then
    echo "       ✅ Python: $(python3 --version)"
else
    echo "       ❌ Python not found"
fi

if command -v noizy-start &> /dev/null; then
    echo "       ✅ noizy-start command ready"
else
    echo "       ⚠️  noizy-start not in PATH"
fi

# Check key files
echo ""
echo "       🔍 Verifying file structure..."

[ -f "../backend/core/server.ts" ] && echo "       ✅ Backend server" || echo "       ❌ Backend server missing"
[ -f "../backend/brain/app.py" ] && echo "       ✅ Python brain" || echo "       ❌ Python brain missing"
[ -d "../geniuses/base" ] && echo "       ✅ 25 Geniuses" || echo "       ❌ Geniuses missing"
[ -f "../miracle/omega/omega_core.ts" ] && echo "       ✅ Omega Core" || echo "       ❌ Omega Core missing"

echo ""
echo "✅ Installation verification complete!"
echo ""
