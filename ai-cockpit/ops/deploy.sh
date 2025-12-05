#!/bin/bash
# NOIZYLAB Deploy Script
set -e

echo "=========================================="
echo "NOIZYLAB DEPLOY"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Check git status
echo "Checking git status..."
if [[ -n $(git status --porcelain) ]]; then
    echo -e "${RED}Uncommitted changes detected!${NC}"
    git status --short
    read -p "Commit all? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add -A
        git commit -m "Deploy commit: $(date '+%Y-%m-%d %H:%M')

Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>"
    fi
fi

# Push to GitHub
echo "Pushing to GitHub..."
git push origin main

# Run tests if available
if [ -f "./ops/test.sh" ]; then
    echo "Running tests..."
    ./ops/test.sh
fi

echo ""
echo -e "${GREEN}=========================================="
echo "DEPLOY COMPLETE"
echo "==========================================${NC}"
echo "Repository: https://github.com/Noizyfish/NOIZYLAB"
