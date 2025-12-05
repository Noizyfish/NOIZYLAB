#!/bin/bash
# NOIZYLAB Pre-commit Hook
# Prevents sensitive data from being committed

echo "Running NOIZYLAB pre-commit checks..."

# Check for sensitive files
SENSITIVE_PATTERNS=(
    "\.env$"
    "\.env\.local$"
    "credentials\."
    "\.pem$"
    "\.key$"
    "api_key"
    "secret"
)

FILES=$(git diff --cached --name-only)
BLOCKED=0

for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    MATCHES=$(echo "$FILES" | grep -iE "$pattern" || true)
    if [ -n "$MATCHES" ]; then
        echo "BLOCKED: Sensitive file pattern '$pattern' found:"
        echo "$MATCHES"
        BLOCKED=1
    fi
done

# Check for large files (>10MB)
for file in $FILES; do
    if [ -f "$file" ]; then
        SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
        if [ "$SIZE" -gt 10485760 ]; then
            echo "BLOCKED: File too large (>10MB): $file"
            BLOCKED=1
        fi
    fi
done

# Check for audio/video files
AV_PATTERNS="\.mp3$|\.wav$|\.aiff$|\.flac$|\.mp4$|\.mov$|\.avi$"
AV_FILES=$(echo "$FILES" | grep -iE "$AV_PATTERNS" || true)
if [ -n "$AV_FILES" ]; then
    echo "WARNING: Audio/video files should go to 12TB, not git:"
    echo "$AV_FILES"
    BLOCKED=1
fi

if [ $BLOCKED -eq 1 ]; then
    echo ""
    echo "Commit blocked. Fix issues above or use --no-verify to bypass."
    exit 1
fi

echo "Pre-commit checks passed!"
exit 0
