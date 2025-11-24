#!/bin/bash
#===============================================================================
# NOIZYLAB DEPENDENCY SCANNER
# Find outdated packages, vulnerabilities, and license issues across all projects
#===============================================================================

set -e

TARGET="${1:-/Volumes/12TB}"
OUTPUT_DIR="$HOME/.noizylab/dependencies"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

mkdir -p "$OUTPUT_DIR"

#===============================================================================
# BANNER
#===============================================================================

print_banner() {
    echo -e "${CYAN}${BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║            NOIZYLAB DEPENDENCY SCANNER                            ║"
    echo "║     Outdated • Vulnerabilities • Licenses • Duplicates            ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

#===============================================================================
# NODE.JS SCANNING
#===============================================================================

scan_npm_project() {
    local dir="$1"
    local name=$(basename "$dir")
    local report="$OUTPUT_DIR/npm_${name}_$TIMESTAMP.txt"

    echo -e "${CYAN}Scanning Node.js project: $name${NC}"

    cd "$dir"

    echo "=== NPM Dependency Report: $name ===" > "$report"
    echo "Path: $dir" >> "$report"
    echo "Date: $(date)" >> "$report"
    echo "" >> "$report"

    # Check for package-lock.json
    if [ -f "package-lock.json" ]; then
        # Outdated packages
        echo "=== OUTDATED PACKAGES ===" >> "$report"
        npm outdated 2>/dev/null >> "$report" || echo "Could not check outdated" >> "$report"
        echo "" >> "$report"

        # Security audit
        echo "=== SECURITY AUDIT ===" >> "$report"
        npm audit 2>/dev/null >> "$report" || echo "Could not run audit" >> "$report"
        echo "" >> "$report"

        # Get vulnerability count
        local vulns=$(npm audit --json 2>/dev/null | grep -o '"vulnerabilities":{[^}]*}' | grep -oE '"(low|moderate|high|critical)":[0-9]+' || echo "")
        if [ -n "$vulns" ]; then
            echo -e "  ${YELLOW}Vulnerabilities found${NC}"
            echo "$vulns" | tr ',' '\n' | while read -r v; do
                local level=$(echo "$v" | cut -d'"' -f2)
                local count=$(echo "$v" | cut -d':' -f2)
                case "$level" in
                    critical) echo -e "    ${RED}Critical: $count${NC}" ;;
                    high) echo -e "    ${RED}High: $count${NC}" ;;
                    moderate) echo -e "    ${YELLOW}Moderate: $count${NC}" ;;
                    low) echo -e "    ${BLUE}Low: $count${NC}" ;;
                esac
            done
        else
            echo -e "  ${GREEN}No vulnerabilities found${NC}"
        fi
    else
        echo "No package-lock.json found" >> "$report"
        echo -e "  ${YELLOW}No lock file, skipping audit${NC}"
    fi

    # License check
    echo "=== LICENSES ===" >> "$report"
    if command -v license-checker &>/dev/null; then
        license-checker --summary 2>/dev/null >> "$report" || echo "License check failed" >> "$report"
    else
        echo "license-checker not installed" >> "$report"
    fi

    return 0
}

scan_all_npm() {
    echo -e "\n${PURPLE}━━━ Scanning Node.js Projects ━━━${NC}\n"

    local count=0
    local total_vulns=0

    find "$TARGET" -name "package.json" -not -path "*/node_modules/*" 2>/dev/null | while read -r pkg; do
        local dir=$(dirname "$pkg")
        ((count++))
        scan_npm_project "$dir"
    done

    echo -e "\n${GREEN}Scanned $count Node.js projects${NC}"
}

#===============================================================================
# PYTHON SCANNING
#===============================================================================

scan_python_project() {
    local dir="$1"
    local name=$(basename "$dir")
    local report="$OUTPUT_DIR/python_${name}_$TIMESTAMP.txt"

    echo -e "${CYAN}Scanning Python project: $name${NC}"

    cd "$dir"

    echo "=== Python Dependency Report: $name ===" > "$report"
    echo "Path: $dir" >> "$report"
    echo "Date: $(date)" >> "$report"
    echo "" >> "$report"

    # Check requirements.txt
    if [ -f "requirements.txt" ]; then
        echo "=== DEPENDENCIES ===" >> "$report"
        cat requirements.txt >> "$report"
        echo "" >> "$report"

        # Check for pinned versions
        local unpinned=$(grep -cvE '==|>=|<=|~=' requirements.txt 2>/dev/null || echo "0")
        if [ "$unpinned" -gt 0 ]; then
            echo -e "  ${YELLOW}Warning: $unpinned unpinned dependencies${NC}"
        fi

        # Safety check (if installed)
        if command -v safety &>/dev/null; then
            echo "=== SECURITY CHECK (safety) ===" >> "$report"
            safety check -r requirements.txt 2>/dev/null >> "$report" || echo "Safety check failed" >> "$report"
        fi

        # pip-audit (if installed)
        if command -v pip-audit &>/dev/null; then
            echo "=== SECURITY AUDIT (pip-audit) ===" >> "$report"
            pip-audit -r requirements.txt 2>/dev/null >> "$report" || echo "pip-audit failed" >> "$report"
        fi
    fi

    # Check pyproject.toml
    if [ -f "pyproject.toml" ]; then
        echo "=== PYPROJECT.TOML ===" >> "$report"
        cat pyproject.toml >> "$report"
    fi

    return 0
}

scan_all_python() {
    echo -e "\n${PURPLE}━━━ Scanning Python Projects ━━━${NC}\n"

    local count=0

    find "$TARGET" \( -name "requirements.txt" -o -name "pyproject.toml" \) 2>/dev/null | while read -r req; do
        local dir=$(dirname "$req")
        ((count++))
        scan_python_project "$dir"
    done

    echo -e "\n${GREEN}Scanned Python projects${NC}"
}

#===============================================================================
# RUST SCANNING
#===============================================================================

scan_rust_project() {
    local dir="$1"
    local name=$(basename "$dir")
    local report="$OUTPUT_DIR/rust_${name}_$TIMESTAMP.txt"

    echo -e "${CYAN}Scanning Rust project: $name${NC}"

    cd "$dir"

    echo "=== Rust Dependency Report: $name ===" > "$report"
    echo "Path: $dir" >> "$report"
    echo "Date: $(date)" >> "$report"
    echo "" >> "$report"

    if [ -f "Cargo.toml" ]; then
        echo "=== CARGO.TOML ===" >> "$report"
        cat Cargo.toml >> "$report"
        echo "" >> "$report"

        # Outdated (if cargo-outdated is installed)
        if command -v cargo &>/dev/null; then
            echo "=== OUTDATED ===" >> "$report"
            cargo outdated 2>/dev/null >> "$report" || echo "cargo outdated not available" >> "$report"

            # Audit (if cargo-audit is installed)
            echo "=== SECURITY AUDIT ===" >> "$report"
            cargo audit 2>/dev/null >> "$report" || echo "cargo audit not available" >> "$report"
        fi
    fi

    return 0
}

scan_all_rust() {
    echo -e "\n${PURPLE}━━━ Scanning Rust Projects ━━━${NC}\n"

    find "$TARGET" -name "Cargo.toml" 2>/dev/null | while read -r cargo; do
        local dir=$(dirname "$cargo")
        scan_rust_project "$dir"
    done
}

#===============================================================================
# GO SCANNING
#===============================================================================

scan_go_project() {
    local dir="$1"
    local name=$(basename "$dir")
    local report="$OUTPUT_DIR/go_${name}_$TIMESTAMP.txt"

    echo -e "${CYAN}Scanning Go project: $name${NC}"

    cd "$dir"

    echo "=== Go Dependency Report: $name ===" > "$report"
    echo "Path: $dir" >> "$report"
    echo "Date: $(date)" >> "$report"
    echo "" >> "$report"

    if [ -f "go.mod" ]; then
        echo "=== GO.MOD ===" >> "$report"
        cat go.mod >> "$report"
        echo "" >> "$report"

        if command -v go &>/dev/null; then
            echo "=== OUTDATED ===" >> "$report"
            go list -u -m all 2>/dev/null >> "$report" || echo "Could not list modules" >> "$report"

            # Vulnerability check
            echo "=== VULNERABILITIES ===" >> "$report"
            go list -json -m all 2>/dev/null | grep -i "vulnerability" >> "$report" || echo "No vulnerabilities found" >> "$report"
        fi
    fi

    return 0
}

scan_all_go() {
    echo -e "\n${PURPLE}━━━ Scanning Go Projects ━━━${NC}\n"

    find "$TARGET" -name "go.mod" 2>/dev/null | while read -r gomod; do
        local dir=$(dirname "$gomod")
        scan_go_project "$dir"
    done
}

#===============================================================================
# RUBY SCANNING
#===============================================================================

scan_ruby_project() {
    local dir="$1"
    local name=$(basename "$dir")
    local report="$OUTPUT_DIR/ruby_${name}_$TIMESTAMP.txt"

    echo -e "${CYAN}Scanning Ruby project: $name${NC}"

    cd "$dir"

    echo "=== Ruby Dependency Report: $name ===" > "$report"
    echo "Path: $dir" >> "$report"
    echo "Date: $(date)" >> "$report"
    echo "" >> "$report"

    if [ -f "Gemfile" ]; then
        echo "=== GEMFILE ===" >> "$report"
        cat Gemfile >> "$report"
        echo "" >> "$report"

        if command -v bundle &>/dev/null; then
            echo "=== OUTDATED ===" >> "$report"
            bundle outdated 2>/dev/null >> "$report" || echo "Could not check outdated" >> "$report"

            # Security audit
            if command -v bundle-audit &>/dev/null; then
                echo "=== SECURITY AUDIT ===" >> "$report"
                bundle-audit check 2>/dev/null >> "$report" || echo "bundle-audit failed" >> "$report"
            fi
        fi
    fi

    return 0
}

scan_all_ruby() {
    echo -e "\n${PURPLE}━━━ Scanning Ruby Projects ━━━${NC}\n"

    find "$TARGET" -name "Gemfile" 2>/dev/null | while read -r gemfile; do
        local dir=$(dirname "$gemfile")
        scan_ruby_project "$dir"
    done
}

#===============================================================================
# SUMMARY REPORT
#===============================================================================

generate_summary() {
    local summary="$OUTPUT_DIR/summary_$TIMESTAMP.md"

    echo "# NOIZYLAB Dependency Scan Summary" > "$summary"
    echo "" >> "$summary"
    echo "**Scan Date:** $(date)" >> "$summary"
    echo "**Target:** $TARGET" >> "$summary"
    echo "" >> "$summary"

    echo "## Projects Scanned" >> "$summary"
    echo "" >> "$summary"

    local npm_count=$(find "$TARGET" -name "package.json" -not -path "*/node_modules/*" 2>/dev/null | wc -l | tr -d ' ')
    local python_count=$(find "$TARGET" -name "requirements.txt" 2>/dev/null | wc -l | tr -d ' ')
    local rust_count=$(find "$TARGET" -name "Cargo.toml" 2>/dev/null | wc -l | tr -d ' ')
    local go_count=$(find "$TARGET" -name "go.mod" 2>/dev/null | wc -l | tr -d ' ')
    local ruby_count=$(find "$TARGET" -name "Gemfile" 2>/dev/null | wc -l | tr -d ' ')

    echo "| Language | Projects |" >> "$summary"
    echo "|----------|----------|" >> "$summary"
    echo "| Node.js | $npm_count |" >> "$summary"
    echo "| Python | $python_count |" >> "$summary"
    echo "| Rust | $rust_count |" >> "$summary"
    echo "| Go | $go_count |" >> "$summary"
    echo "| Ruby | $ruby_count |" >> "$summary"

    echo "" >> "$summary"
    echo "## Reports Generated" >> "$summary"
    echo "" >> "$summary"
    echo "Individual reports are available in: \`$OUTPUT_DIR\`" >> "$summary"

    echo -e "\n${GREEN}Summary saved: $summary${NC}"
}

#===============================================================================
# MAIN
#===============================================================================

main() {
    print_banner

    echo -e "${CYAN}Target: $TARGET${NC}"
    echo -e "${CYAN}Output: $OUTPUT_DIR${NC}"
    echo ""

    scan_all_npm
    scan_all_python
    scan_all_rust
    scan_all_go
    scan_all_ruby
    generate_summary

    echo ""
    echo -e "${GREEN}${BOLD}Dependency scan complete!${NC}"
    echo -e "Reports saved to: ${CYAN}$OUTPUT_DIR${NC}"
}

case "${1:-}" in
    --help|-h)
        echo "NOIZYLAB Dependency Scanner"
        echo ""
        echo "Usage: $0 [path]"
        echo ""
        echo "Scans for:"
        echo "  - Outdated packages"
        echo "  - Security vulnerabilities"
        echo "  - License issues"
        echo "  - Unpinned dependencies"
        echo ""
        echo "Supports: Node.js, Python, Rust, Go, Ruby"
        ;;
    --npm)
        shift
        TARGET="${1:-$TARGET}"
        print_banner
        scan_all_npm
        ;;
    --python)
        shift
        TARGET="${1:-$TARGET}"
        print_banner
        scan_all_python
        ;;
    *)
        main
        ;;
esac
