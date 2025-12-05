#!/bin/bash
# NOIZYLAB Security Risk Scanner

echo "=========================================="
echo "NOIZYLAB RISK SCAN"
echo "=========================================="

RISK_COUNT=0

# Check for sensitive files
echo ""
echo "Scanning for sensitive files..."
SENSITIVE=$(find . -name "*.env" -o -name "*.pem" -o -name "*.key" -o -name "credentials*" -o -name "*secret*" 2>/dev/null | grep -v ".git")
if [ -n "$SENSITIVE" ]; then
    echo "WARNING: Sensitive files found:"
    echo "$SENSITIVE"
    RISK_COUNT=$((RISK_COUNT + $(echo "$SENSITIVE" | wc -l)))
fi

# Check for hardcoded secrets
echo ""
echo "Scanning for hardcoded secrets..."
SECRETS=$(grep -r -l -E "(api_key|apikey|password|secret|token).*=" --include="*.py" --include="*.json" --include="*.yaml" . 2>/dev/null | grep -v ".git" | head -20)
if [ -n "$SECRETS" ]; then
    echo "WARNING: Potential hardcoded secrets in:"
    echo "$SECRETS"
    RISK_COUNT=$((RISK_COUNT + $(echo "$SECRETS" | wc -l)))
fi

# Check for large files
echo ""
echo "Scanning for large files (>10MB)..."
LARGE=$(find . -size +10M -not -path "./.git/*" 2>/dev/null)
if [ -n "$LARGE" ]; then
    echo "WARNING: Large files found:"
    echo "$LARGE"
fi

# Check .gitignore
echo ""
echo "Checking .gitignore coverage..."
if [ ! -f ".gitignore" ]; then
    echo "WARNING: No .gitignore file!"
    RISK_COUNT=$((RISK_COUNT + 1))
else
    echo ".gitignore exists with $(wc -l < .gitignore) rules"
fi

# Summary
echo ""
echo "=========================================="
if [ $RISK_COUNT -gt 0 ]; then
    echo "RISK SCAN: $RISK_COUNT issues found"
else
    echo "RISK SCAN: All clear!"
fi
echo "=========================================="
