#!/bin/bash
#===============================================================================
# NOIZYLAB SMART PROJECT ANALYZER
# Intelligent detection, categorization, and analysis of code projects
#===============================================================================

set -e

TARGET="${1:-/Volumes/12TB}"
OUTPUT_DIR="$HOME/.noizylab/analysis"
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
# PROJECT DETECTION
#===============================================================================

detect_project_type() {
    local dir="$1"

    # Check for project markers
    [ -f "$dir/package.json" ] && echo "nodejs"
    [ -f "$dir/requirements.txt" ] && echo "python"
    [ -f "$dir/setup.py" ] && echo "python"
    [ -f "$dir/pyproject.toml" ] && echo "python"
    [ -f "$dir/Cargo.toml" ] && echo "rust"
    [ -f "$dir/go.mod" ] && echo "go"
    [ -f "$dir/Gemfile" ] && echo "ruby"
    [ -f "$dir/composer.json" ] && echo "php"
    [ -f "$dir/pom.xml" ] && echo "java"
    [ -f "$dir/build.gradle" ] && echo "java"
    [ -f "$dir/Package.swift" ] && echo "swift"
    [ -f "$dir/CMakeLists.txt" ] && echo "cpp"
    [ -f "$dir/Makefile" ] && echo "make"
    [ -f "$dir/*.sln" ] 2>/dev/null && echo "dotnet"
    [ -f "$dir/pubspec.yaml" ] && echo "dart"
    [ -f "$dir/mix.exs" ] && echo "elixir"
}

detect_framework() {
    local dir="$1"

    # JavaScript/TypeScript frameworks
    if [ -f "$dir/package.json" ]; then
        local pkg=$(cat "$dir/package.json" 2>/dev/null)

        echo "$pkg" | grep -q '"next"' && echo "Next.js"
        echo "$pkg" | grep -q '"react"' && echo "React"
        echo "$pkg" | grep -q '"vue"' && echo "Vue"
        echo "$pkg" | grep -q '"@angular/core"' && echo "Angular"
        echo "$pkg" | grep -q '"svelte"' && echo "Svelte"
        echo "$pkg" | grep -q '"express"' && echo "Express"
        echo "$pkg" | grep -q '"fastify"' && echo "Fastify"
        echo "$pkg" | grep -q '"nest"' && echo "NestJS"
        echo "$pkg" | grep -q '"electron"' && echo "Electron"
        echo "$pkg" | grep -q '"react-native"' && echo "React Native"
        echo "$pkg" | grep -q '"expo"' && echo "Expo"
        echo "$pkg" | grep -q '"gatsby"' && echo "Gatsby"
        echo "$pkg" | grep -q '"nuxt"' && echo "Nuxt"
        echo "$pkg" | grep -q '"astro"' && echo "Astro"
        echo "$pkg" | grep -q '"remix"' && echo "Remix"
    fi

    # Python frameworks
    if [ -f "$dir/requirements.txt" ] || [ -f "$dir/pyproject.toml" ]; then
        local req=""
        [ -f "$dir/requirements.txt" ] && req=$(cat "$dir/requirements.txt" 2>/dev/null)
        [ -f "$dir/pyproject.toml" ] && req="$req $(cat "$dir/pyproject.toml" 2>/dev/null)"

        echo "$req" | grep -qi "django" && echo "Django"
        echo "$req" | grep -qi "flask" && echo "Flask"
        echo "$req" | grep -qi "fastapi" && echo "FastAPI"
        echo "$req" | grep -qi "pytorch\|torch" && echo "PyTorch"
        echo "$req" | grep -qi "tensorflow" && echo "TensorFlow"
        echo "$req" | grep -qi "pandas" && echo "Data Science"
        echo "$req" | grep -qi "scrapy" && echo "Scrapy"
    fi

    # Ruby frameworks
    if [ -f "$dir/Gemfile" ]; then
        local gem=$(cat "$dir/Gemfile" 2>/dev/null)
        echo "$gem" | grep -q "rails" && echo "Rails"
        echo "$gem" | grep -q "sinatra" && echo "Sinatra"
    fi
}

analyze_project() {
    local dir="$1"
    local name=$(basename "$dir")

    # Get project type
    local types=$(detect_project_type "$dir" | sort -u | tr '\n' ',')
    types=${types%,}

    # Get frameworks
    local frameworks=$(detect_framework "$dir" | sort -u | tr '\n' ',')
    frameworks=${frameworks%,}

    # Count files
    local file_count=$(find "$dir" -type f -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | wc -l | tr -d ' ')

    # Get size
    local size=$(du -sh "$dir" 2>/dev/null | cut -f1)

    # Check for git
    local has_git="no"
    [ -d "$dir/.git" ] && has_git="yes"

    # Get last modified
    local last_mod=$(stat -f%m "$dir" 2>/dev/null || stat -c%Y "$dir" 2>/dev/null)
    local last_mod_date=$(date -r "$last_mod" "+%Y-%m-%d" 2>/dev/null || date -d "@$last_mod" "+%Y-%m-%d" 2>/dev/null)

    # Check for README
    local has_readme="no"
    [ -f "$dir/README.md" ] || [ -f "$dir/README" ] || [ -f "$dir/readme.md" ] && has_readme="yes"

    # Check for tests
    local has_tests="no"
    [ -d "$dir/test" ] || [ -d "$dir/tests" ] || [ -d "$dir/__tests__" ] || [ -d "$dir/spec" ] && has_tests="yes"

    # Check for CI
    local has_ci="no"
    [ -d "$dir/.github/workflows" ] || [ -f "$dir/.travis.yml" ] || [ -f "$dir/.gitlab-ci.yml" ] || [ -f "$dir/Jenkinsfile" ] && has_ci="yes"

    # Check for Docker
    local has_docker="no"
    [ -f "$dir/Dockerfile" ] || [ -f "$dir/docker-compose.yml" ] && has_docker="yes"

    echo "$name|$types|$frameworks|$file_count|$size|$has_git|$has_readme|$has_tests|$has_ci|$has_docker|$last_mod_date|$dir"
}

#===============================================================================
# SCANNING
#===============================================================================

scan_projects() {
    echo -e "${PURPLE}${BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║            NOIZYLAB SMART PROJECT ANALYZER                        ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    echo -e "${CYAN}Scanning: $TARGET${NC}"
    echo ""

    local output_file="$OUTPUT_DIR/projects_$TIMESTAMP.csv"
    local json_file="$OUTPUT_DIR/projects_$TIMESTAMP.json"

    # CSV header
    echo "name|types|frameworks|files|size|git|readme|tests|ci|docker|last_modified|path" > "$output_file"

    # Find and analyze projects
    local count=0
    local total_projects=0

    # Find by common markers
    echo -e "${YELLOW}Finding projects...${NC}"

    {
        find "$TARGET" -name "package.json" -not -path "*/node_modules/*" 2>/dev/null
        find "$TARGET" -name "requirements.txt" 2>/dev/null
        find "$TARGET" -name "Cargo.toml" 2>/dev/null
        find "$TARGET" -name "go.mod" 2>/dev/null
        find "$TARGET" -name "Gemfile" 2>/dev/null
        find "$TARGET" -name "pom.xml" 2>/dev/null
        find "$TARGET" -name "composer.json" 2>/dev/null
    } | while read -r marker; do
        local project_dir=$(dirname "$marker")
        ((count++))
        echo -ne "\r${CYAN}Analyzing project $count: $(basename "$project_dir")${NC}          "

        analyze_project "$project_dir" >> "$output_file"
    done

    echo ""
    total_projects=$(wc -l < "$output_file" | tr -d ' ')
    total_projects=$((total_projects - 1))  # Subtract header

    echo ""
    echo -e "${GREEN}Found $total_projects projects${NC}"
    echo ""

    # Generate summary
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}  PROJECT SUMMARY${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""

    # By type
    echo -e "${CYAN}By Type:${NC}"
    tail -n +2 "$output_file" | cut -d'|' -f2 | tr ',' '\n' | sort | uniq -c | sort -rn | head -10 | while read -r count type; do
        [ -n "$type" ] && printf "  %-15s %s\n" "$type" "$count"
    done

    echo ""
    echo -e "${CYAN}By Framework:${NC}"
    tail -n +2 "$output_file" | cut -d'|' -f3 | tr ',' '\n' | sort | uniq -c | sort -rn | head -10 | while read -r count framework; do
        [ -n "$framework" ] && printf "  %-15s %s\n" "$framework" "$count"
    done

    echo ""
    echo -e "${CYAN}Project Health:${NC}"
    local with_git=$(tail -n +2 "$output_file" | cut -d'|' -f6 | grep -c "yes" || echo "0")
    local with_readme=$(tail -n +2 "$output_file" | cut -d'|' -f7 | grep -c "yes" || echo "0")
    local with_tests=$(tail -n +2 "$output_file" | cut -d'|' -f8 | grep -c "yes" || echo "0")
    local with_ci=$(tail -n +2 "$output_file" | cut -d'|' -f9 | grep -c "yes" || echo "0")
    local with_docker=$(tail -n +2 "$output_file" | cut -d'|' -f10 | grep -c "yes" || echo "0")

    printf "  %-20s %s/%s\n" "With Git:" "$with_git" "$total_projects"
    printf "  %-20s %s/%s\n" "With README:" "$with_readme" "$total_projects"
    printf "  %-20s %s/%s\n" "With Tests:" "$with_tests" "$total_projects"
    printf "  %-20s %s/%s\n" "With CI/CD:" "$with_ci" "$total_projects"
    printf "  %-20s %s/%s\n" "With Docker:" "$with_docker" "$total_projects"

    echo ""
    echo -e "${CYAN}Largest Projects:${NC}"
    tail -n +2 "$output_file" | sort -t'|' -k4 -rn | head -10 | while IFS='|' read -r name types frameworks files size git readme tests ci docker modified path; do
        printf "  %-30s %6s files  %8s\n" "${name:0:30}" "$files" "$size"
    done

    echo ""
    echo -e "${GREEN}Full report: $output_file${NC}"
}

#===============================================================================
# MAIN
#===============================================================================

case "${1:-}" in
    --help|-h)
        echo "NOIZYLAB Smart Project Analyzer"
        echo ""
        echo "Usage: $0 [path]"
        echo ""
        echo "Analyzes all projects in the given path and generates:"
        echo "  - Project type detection (Node.js, Python, Rust, Go, etc.)"
        echo "  - Framework detection (React, Django, Rails, etc.)"
        echo "  - Health metrics (git, tests, CI, Docker)"
        echo "  - Size and file counts"
        echo ""
        echo "Default path: /Volumes/12TB"
        ;;
    *)
        scan_projects
        ;;
esac
