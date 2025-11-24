#!/bin/bash
#===============================================================================
# NOIZYLAB QUICK PERMISSION FIX
# Fast one-shot permission repair for common issues
#===============================================================================

TARGET="${1:-/Volumes/4TBSG}"

echo "🔧 NOIZYLAB Quick Permission Fix"
echo "   Target: $TARGET"
echo ""

if [ ! -d "$TARGET" ]; then
    echo "❌ Error: $TARGET not found!"
    exit 1
fi

echo "📁 Fixing directory permissions (755)..."
find "$TARGET" -type d -exec chmod 755 {} \; 2>/dev/null

echo "📄 Fixing file permissions (644)..."
find "$TARGET" -type f -exec chmod 644 {} \; 2>/dev/null

echo "🔨 Making scripts executable (755)..."
find "$TARGET" -type f \( -name "*.sh" -o -name "*.py" -o -name "*.rb" \) -exec chmod 755 {} \; 2>/dev/null

echo "🧹 Removing .DS_Store files..."
find "$TARGET" -name ".DS_Store" -delete 2>/dev/null
find "$TARGET" -name "._*" -delete 2>/dev/null

echo "🔓 Removing quarantine flags..."
xattr -rd com.apple.quarantine "$TARGET" 2>/dev/null

echo "🚫 Removing ACLs..."
chmod -RN "$TARGET" 2>/dev/null

echo ""
echo "✅ Permission repair complete!"
echo ""
echo "For full repair with all options, run:"
echo "   ./repair-permissions.sh -a $TARGET"
echo ""
echo "Or with sudo for complete access:"
echo "   sudo ./repair-permissions.sh -a $TARGET"
