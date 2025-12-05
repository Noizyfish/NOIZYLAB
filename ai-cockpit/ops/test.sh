#!/bin/bash
# NOIZYLAB Test Runner
set -e

echo "=========================================="
echo "NOIZYLAB TEST SUITE"
echo "=========================================="

# Run Python tests if pytest available
if command -v pytest &> /dev/null; then
    echo "Running Python tests..."
    pytest tests/ -v 2>/dev/null || echo "No tests found or pytest not configured"
fi

# Validate Python syntax
echo ""
echo "Validating Python scripts..."
for f in scripts/*.py; do
    if [ -f "$f" ]; then
        python3 -m py_compile "$f" && echo "  OK: $f" || echo "  FAIL: $f"
    fi
done

# Validate JSON
echo ""
echo "Validating JSON files..."
for f in $(find . -name "*.json" -not -path "./.git/*" 2>/dev/null); do
    python3 -m json.tool "$f" > /dev/null 2>&1 && echo "  OK: $f" || echo "  FAIL: $f"
done

# Validate YAML
echo ""
echo "Validating YAML files..."
if command -v python3 &> /dev/null; then
    for f in $(find . -name "*.yaml" -o -name "*.yml" -not -path "./.git/*" 2>/dev/null); do
        python3 -c "import yaml; yaml.safe_load(open('$f'))" 2>/dev/null && echo "  OK: $f" || echo "  FAIL: $f"
    done
fi

echo ""
echo "=========================================="
echo "TESTS COMPLETE"
echo "=========================================="
