#!/bin/bash
#===============================================================================
# NOIZYLAB CODE STATISTICS GENERATOR
# Analyze codebase: lines of code, languages, complexity, file counts
#===============================================================================

set -e

# Configuration
TARGET="/Volumes/4TBSG"
REPORT_DIR="$HOME/.noizylab/stats"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

#===============================================================================
# LOGGING
#===============================================================================

log() { echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }

print_banner() {
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║            NOIZYLAB CODE STATISTICS GENERATOR                     ║"
    echo "║         Lines • Languages • Files • Complexity • Size             ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_section() {
    echo -e "\n${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

human_size() {
    local bytes=$1
    if [ $bytes -ge 1073741824 ]; then
        echo "$(echo "scale=2; $bytes/1073741824" | bc) GB"
    elif [ $bytes -ge 1048576 ]; then
        echo "$(echo "scale=2; $bytes/1048576" | bc) MB"
    elif [ $bytes -ge 1024 ]; then
        echo "$(echo "scale=2; $bytes/1024" | bc) KB"
    else
        echo "$bytes B"
    fi
}

human_number() {
    printf "%'d" "$1"
}

#===============================================================================
# LANGUAGE DETECTION
#===============================================================================

declare -A LANG_EXTENSIONS
LANG_EXTENSIONS=(
    ["js"]="JavaScript"
    ["jsx"]="JavaScript (React)"
    ["ts"]="TypeScript"
    ["tsx"]="TypeScript (React)"
    ["py"]="Python"
    ["rb"]="Ruby"
    ["go"]="Go"
    ["rs"]="Rust"
    ["java"]="Java"
    ["kt"]="Kotlin"
    ["swift"]="Swift"
    ["c"]="C"
    ["cpp"]="C++"
    ["cc"]="C++"
    ["h"]="C/C++ Header"
    ["hpp"]="C++ Header"
    ["cs"]="C#"
    ["php"]="PHP"
    ["html"]="HTML"
    ["css"]="CSS"
    ["scss"]="SCSS"
    ["sass"]="Sass"
    ["less"]="Less"
    ["vue"]="Vue"
    ["svelte"]="Svelte"
    ["json"]="JSON"
    ["yml"]="YAML"
    ["yaml"]="YAML"
    ["xml"]="XML"
    ["sql"]="SQL"
    ["sh"]="Shell"
    ["bash"]="Bash"
    ["zsh"]="Zsh"
    ["md"]="Markdown"
    ["mdx"]="MDX"
    ["graphql"]="GraphQL"
    ["sol"]="Solidity"
    ["dart"]="Dart"
    ["lua"]="Lua"
    ["r"]="R"
    ["R"]="R"
    ["ex"]="Elixir"
    ["exs"]="Elixir"
    ["erl"]="Erlang"
    ["hs"]="Haskell"
    ["scala"]="Scala"
    ["clj"]="Clojure"
    ["pl"]="Perl"
    ["pm"]="Perl"
)

get_language() {
    local ext="$1"
    echo "${LANG_EXTENSIONS[$ext]:-Unknown ($ext)}"
}

#===============================================================================
# STATISTICS FUNCTIONS
#===============================================================================

# Count lines in a file (excluding blank lines and comments)
count_code_lines() {
    local file="$1"
    local ext="${file##*.}"

    # Simple line count (excluding blank lines)
    grep -cv '^[[:space:]]*$' "$file" 2>/dev/null || echo "0"
}

# Full codebase analysis
analyze_codebase() {
    local target="$1"

    print_section "ANALYZING CODEBASE"
    log "Target: $target"
    log "This may take a while for large codebases..."

    local temp_file=$(mktemp)
    local total_files=0
    local total_lines=0
    local total_size=0

    # Collect file data
    find "$target" -type f \
        -not -path '*/node_modules/*' \
        -not -path '*/.git/*' \
        -not -path '*/__pycache__/*' \
        -not -path '*/venv/*' \
        -not -path '*/.venv/*' \
        -not -path '*/dist/*' \
        -not -path '*/build/*' \
        -not -path '*/.next/*' \
        -not -name '.DS_Store' \
        -not -name '*.min.js' \
        -not -name '*.min.css' \
        -not -name 'package-lock.json' \
        -not -name 'yarn.lock' \
        \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \
           -o -name "*.py" -o -name "*.rb" -o -name "*.go" -o -name "*.rs" \
           -o -name "*.java" -o -name "*.kt" -o -name "*.swift" \
           -o -name "*.c" -o -name "*.cpp" -o -name "*.h" -o -name "*.hpp" \
           -o -name "*.cs" -o -name "*.php" \
           -o -name "*.html" -o -name "*.css" -o -name "*.scss" \
           -o -name "*.vue" -o -name "*.svelte" \
           -o -name "*.json" -o -name "*.yml" -o -name "*.yaml" \
           -o -name "*.md" -o -name "*.sql" \
           -o -name "*.sh" -o -name "*.bash" \) \
        2>/dev/null | while read -r file; do

        local ext="${file##*.}"
        local lines=$(wc -l < "$file" 2>/dev/null | tr -d ' ')
        local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)

        echo "$ext|$lines|$size|$file" >> "$temp_file"
        ((total_files++))
        [ $((total_files % 500)) -eq 0 ] && echo -ne "\r${CYAN}Files scanned: $total_files${NC}"
    done

    echo ""

    # Generate statistics
    print_section "LANGUAGE BREAKDOWN"

    printf "%-25s %12s %15s %12s\n" "Language" "Files" "Lines" "Size"
    printf "%-25s %12s %15s %12s\n" "─────────────────────────" "────────────" "───────────────" "────────────"

    # Aggregate by extension
    cut -d'|' -f1 "$temp_file" | sort | uniq -c | sort -rn | while read -r count ext; do
        local lang=$(get_language "$ext")
        local lines=$(grep "^$ext|" "$temp_file" | cut -d'|' -f2 | awk '{s+=$1}END{print s}')
        local size=$(grep "^$ext|" "$temp_file" | cut -d'|' -f3 | awk '{s+=$1}END{print s}')

        printf "%-25s %12s %15s %12s\n" "$lang" "$(human_number $count)" "$(human_number $lines)" "$(human_size $size)"
    done

    # Totals
    total_files=$(wc -l < "$temp_file" | tr -d ' ')
    total_lines=$(cut -d'|' -f2 "$temp_file" | awk '{s+=$1}END{print s}')
    total_size=$(cut -d'|' -f3 "$temp_file" | awk '{s+=$1}END{print s}')

    echo ""
    printf "%-25s %12s %15s %12s\n" "─────────────────────────" "────────────" "───────────────" "────────────"
    printf "${GREEN}%-25s %12s %15s %12s${NC}\n" "TOTAL" "$(human_number $total_files)" "$(human_number $total_lines)" "$(human_size $total_size)"

    rm -f "$temp_file"
}

# Quick summary
quick_summary() {
    local target="$1"

    print_section "QUICK SUMMARY"

    echo -e "${CYAN}Total Directories:${NC}"
    find "$target" -type d -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | wc -l | tr -d ' '

    echo ""
    echo -e "${CYAN}Total Files:${NC}"
    find "$target" -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -not -name '.DS_Store' 2>/dev/null | wc -l | tr -d ' '

    echo ""
    echo -e "${CYAN}Total Size:${NC}"
    du -sh "$target" 2>/dev/null | cut -f1

    echo ""
    echo -e "${CYAN}Top 10 File Types:${NC}"
    find "$target" -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -name '*.*' 2>/dev/null | \
        sed 's/.*\.//' | sort | uniq -c | sort -rn | head -10
}

# Largest files
largest_files() {
    local target="$1"
    local limit="${2:-20}"

    print_section "LARGEST FILES (Top $limit)"

    find "$target" -type f \
        -not -path '*/node_modules/*' \
        -not -path '*/.git/*' \
        -not -name 'package-lock.json' \
        -not -name 'yarn.lock' \
        2>/dev/null -exec ls -lS {} + 2>/dev/null | \
        head -$((limit + 1)) | tail -$limit | \
        awk '{printf "%-12s %s\n", $5, $NF}' | \
        while read -r size file; do
            printf "%-12s %s\n" "$(human_size $size)" "$file"
        done
}

# Most complex files (by line count)
most_complex() {
    local target="$1"
    local limit="${2:-20}"

    print_section "LARGEST CODE FILES (Top $limit by lines)"

    find "$target" -type f \
        -not -path '*/node_modules/*' \
        -not -path '*/.git/*' \
        \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.go" \
           -o -name "*.java" -o -name "*.rb" -o -name "*.php" \) \
        2>/dev/null | \
        xargs wc -l 2>/dev/null | \
        sort -rn | \
        head -$((limit + 1)) | tail -$limit | \
        awk '{printf "%8d lines  %s\n", $1, $2}'
}

# Project detection
detect_projects() {
    local target="$1"

    print_section "PROJECT DETECTION"

    echo -e "${CYAN}Node.js Projects (package.json):${NC}"
    find "$target" -name "package.json" -not -path '*/node_modules/*' 2>/dev/null | wc -l | tr -d ' '

    echo ""
    echo -e "${CYAN}Python Projects:${NC}"
    echo -n "  requirements.txt: "
    find "$target" -name "requirements.txt" 2>/dev/null | wc -l | tr -d ' '
    echo -n "  setup.py: "
    find "$target" -name "setup.py" 2>/dev/null | wc -l | tr -d ' '
    echo -n "  pyproject.toml: "
    find "$target" -name "pyproject.toml" 2>/dev/null | wc -l | tr -d ' '

    echo ""
    echo -e "${CYAN}Go Projects (go.mod):${NC}"
    find "$target" -name "go.mod" 2>/dev/null | wc -l | tr -d ' '

    echo ""
    echo -e "${CYAN}Rust Projects (Cargo.toml):${NC}"
    find "$target" -name "Cargo.toml" 2>/dev/null | wc -l | tr -d ' '

    echo ""
    echo -e "${CYAN}Ruby Projects (Gemfile):${NC}"
    find "$target" -name "Gemfile" 2>/dev/null | wc -l | tr -d ' '

    echo ""
    echo -e "${CYAN}Docker Projects (Dockerfile):${NC}"
    find "$target" -name "Dockerfile" 2>/dev/null | wc -l | tr -d ' '

    echo ""
    echo -e "${CYAN}Git Repositories:${NC}"
    find "$target" -name ".git" -type d 2>/dev/null | wc -l | tr -d ' '
}

# Generate full report
generate_report() {
    local target="$1"
    local output="${2:-$REPORT_DIR/stats_$(date +%Y%m%d_%H%M%S).md}"

    print_section "GENERATING REPORT"

    mkdir -p "$(dirname "$output")"

    cat > "$output" << EOF
# NOIZYLAB Code Statistics Report

**Generated:** $(date)
**Target:** $target

## Summary

EOF

    # Quick stats
    local total_dirs=$(find "$target" -type d -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | wc -l | tr -d ' ')
    local total_files=$(find "$target" -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -not -name '.DS_Store' 2>/dev/null | wc -l | tr -d ' ')
    local total_size=$(du -sh "$target" 2>/dev/null | cut -f1)

    cat >> "$output" << EOF
| Metric | Value |
|--------|-------|
| Total Directories | $total_dirs |
| Total Files | $total_files |
| Total Size | $total_size |

## Language Breakdown

| Language | Files | Lines |
|----------|-------|-------|
EOF

    # Language stats
    find "$target" -type f \
        -not -path '*/node_modules/*' \
        -not -path '*/.git/*' \
        \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.go" \
           -o -name "*.java" -o -name "*.rb" -o -name "*.html" -o -name "*.css" \) \
        2>/dev/null | \
        sed 's/.*\.//' | sort | uniq -c | sort -rn | head -20 | \
        while read -r count ext; do
            local lang=$(get_language "$ext")
            echo "| $lang | $count | - |" >> "$output"
        done

    log_success "Report saved: $output"
}

#===============================================================================
# USAGE
#===============================================================================

usage() {
    echo "NOIZYLAB Code Statistics Generator"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  analyze [path]        Full codebase analysis"
    echo "  summary [path]        Quick summary"
    echo "  largest [path] [n]    Show n largest files"
    echo "  complex [path] [n]    Show n most complex files"
    echo "  projects [path]       Detect project types"
    echo "  report [path] [file]  Generate markdown report"
    echo ""
    echo "Examples:"
    echo "  $0 analyze /Volumes/4TBSG"
    echo "  $0 summary /Users/m2ultra/projects"
    echo "  $0 largest /Volumes/4TBSG 30"
    echo "  $0 report /Volumes/4TBSG ~/stats.md"
}

#===============================================================================
# MAIN
#===============================================================================

main() {
    print_banner

    local cmd="${1:-help}"
    local arg1="${2:-$TARGET}"
    local arg2="${3:-}"

    mkdir -p "$REPORT_DIR"

    case "$cmd" in
        analyze|full)
            analyze_codebase "$arg1"
            ;;
        summary|quick)
            quick_summary "$arg1"
            ;;
        largest|big)
            largest_files "$arg1" "${arg2:-20}"
            ;;
        complex|lines)
            most_complex "$arg1" "${arg2:-20}"
            ;;
        projects|detect)
            detect_projects "$arg1"
            ;;
        report)
            generate_report "$arg1" "$arg2"
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            echo "Unknown command: $cmd"
            usage
            exit 1
            ;;
    esac
}

main "$@"
