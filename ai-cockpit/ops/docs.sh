#!/bin/bash
# NOIZYLAB Documentation Generator

echo "=========================================="
echo "NOIZYLAB DOCS GENERATOR"
echo "=========================================="

DOCS_DIR="docs"
mkdir -p "$DOCS_DIR"

# Generate script documentation
echo "Generating script documentation..."
echo "# NOIZYLAB Scripts" > "$DOCS_DIR/scripts.md"
echo "" >> "$DOCS_DIR/scripts.md"
echo "Auto-generated: $(date)" >> "$DOCS_DIR/scripts.md"
echo "" >> "$DOCS_DIR/scripts.md"

for f in scripts/*.py; do
    if [ -f "$f" ]; then
        echo "## $(basename $f)" >> "$DOCS_DIR/scripts.md"
        echo '```' >> "$DOCS_DIR/scripts.md"
        # Extract docstring
        python3 -c "
import ast
with open('$f') as f:
    tree = ast.parse(f.read())
    docstring = ast.get_docstring(tree)
    if docstring:
        print(docstring)
    else:
        print('No documentation')
" >> "$DOCS_DIR/scripts.md" 2>/dev/null || echo "Unable to parse" >> "$DOCS_DIR/scripts.md"
        echo '```' >> "$DOCS_DIR/scripts.md"
        echo "" >> "$DOCS_DIR/scripts.md"
    fi
done

# Generate directory tree
echo "Generating directory tree..."
echo "# NOIZYLAB Structure" > "$DOCS_DIR/structure.md"
echo '```' >> "$DOCS_DIR/structure.md"
tree -L 3 -I '.git|__pycache__|.DS_Store|node_modules' . >> "$DOCS_DIR/structure.md" 2>/dev/null || find . -maxdepth 3 -type d | head -50 >> "$DOCS_DIR/structure.md"
echo '```' >> "$DOCS_DIR/structure.md"

echo ""
echo "Documentation generated in $DOCS_DIR/"
ls -la "$DOCS_DIR/"
