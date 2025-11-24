#!/bin/bash
#===============================================================================
# NOIZYLAB GIT REPOSITORY MANAGER
# Find, update, clean, and manage all git repositories
#===============================================================================

set -e

# Configuration
TARGET="/Volumes/4TBSG"
REPORT_DIR="$HOME/.noizylab/git-reports"

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
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

print_banner() {
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║              NOIZYLAB GIT REPOSITORY MANAGER                      ║"
    echo "║         Find • Update • Clean • Analyze • Backup                  ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_section() {
    echo -e "\n${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

#===============================================================================
# REPOSITORY DISCOVERY
#===============================================================================

# Find all git repositories
find_repos() {
    local target="$1"
    local output="${2:-/tmp/noizylab_repos.txt}"

    print_section "FINDING GIT REPOSITORIES"
    log "Scanning: $target"

    find "$target" -name ".git" -type d 2>/dev/null | while read -r gitdir; do
        local repo=$(dirname "$gitdir")
        echo "$repo"
    done > "$output"

    local count=$(wc -l < "$output" | tr -d ' ')
    log_success "Found $count repositories"

    if [ "$count" -gt 0 ]; then
        echo ""
        echo "Repositories found:"
        head -20 "$output" | while read -r repo; do
            echo -e "  ${CYAN}•${NC} $(basename "$repo")"
        done
        [ "$count" -gt 20 ] && echo "  ... and $((count - 20)) more"
    fi

    echo ""
    log "Full list: $output"
}

# List repositories with status
list_repos() {
    local target="$1"

    print_section "REPOSITORY STATUS"

    find "$target" -name ".git" -type d 2>/dev/null | while read -r gitdir; do
        local repo=$(dirname "$gitdir")
        local name=$(basename "$repo")

        cd "$repo" 2>/dev/null || continue

        # Get status
        local branch=$(git branch --show-current 2>/dev/null || echo "unknown")
        local status=""
        local remote=""

        # Check for uncommitted changes
        if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
            status="${YELLOW}[dirty]${NC}"
        else
            status="${GREEN}[clean]${NC}"
        fi

        # Check remote
        if git remote get-url origin &>/dev/null; then
            remote=$(git remote get-url origin 2>/dev/null | sed 's/.*[:/]\([^/]*\/[^/]*\)\.git$/\1/' | head -c 30)
        else
            remote="${YELLOW}no remote${NC}"
        fi

        printf "  %-30s %-15s %s %s\n" "$name" "($branch)" "$status" "$remote"
    done
}

#===============================================================================
# REPOSITORY OPERATIONS
#===============================================================================

# Update all repositories (git pull)
update_all() {
    local target="$1"
    local success=0
    local failed=0
    local skipped=0

    print_section "UPDATING REPOSITORIES"

    find "$target" -name ".git" -type d 2>/dev/null | while read -r gitdir; do
        local repo=$(dirname "$gitdir")
        local name=$(basename "$repo")

        echo -ne "${CYAN}Updating:${NC} $name... "

        cd "$repo" 2>/dev/null || { echo -e "${RED}failed${NC}"; ((failed++)); continue; }

        # Check if remote exists
        if ! git remote get-url origin &>/dev/null; then
            echo -e "${YELLOW}skipped (no remote)${NC}"
            ((skipped++))
            continue
        fi

        # Check for uncommitted changes
        if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
            echo -e "${YELLOW}skipped (dirty)${NC}"
            ((skipped++))
            continue
        fi

        # Try to pull
        if git pull --ff-only &>/dev/null; then
            echo -e "${GREEN}updated${NC}"
            ((success++))
        else
            echo -e "${YELLOW}up-to-date${NC}"
            ((success++))
        fi
    done

    echo ""
    log_success "Updated: $success, Skipped: $skipped, Failed: $failed"
}

# Fetch all (without merging)
fetch_all() {
    local target="$1"

    print_section "FETCHING ALL REPOSITORIES"

    find "$target" -name ".git" -type d 2>/dev/null | while read -r gitdir; do
        local repo=$(dirname "$gitdir")
        local name=$(basename "$repo")

        cd "$repo" 2>/dev/null || continue

        if git remote get-url origin &>/dev/null; then
            echo -ne "${CYAN}Fetching:${NC} $name... "
            if git fetch --all --prune &>/dev/null; then
                echo -e "${GREEN}done${NC}"
            else
                echo -e "${RED}failed${NC}"
            fi
        fi
    done
}

# Clean all repositories
clean_all() {
    local target="$1"

    print_section "CLEANING REPOSITORIES"

    find "$target" -name ".git" -type d 2>/dev/null | while read -r gitdir; do
        local repo=$(dirname "$gitdir")
        local name=$(basename "$repo")

        cd "$repo" 2>/dev/null || continue

        echo -ne "${CYAN}Cleaning:${NC} $name... "

        # Run git gc and prune
        git gc --auto --quiet 2>/dev/null
        git prune 2>/dev/null

        # Clean untracked files preview
        local untracked=$(git clean -n -d 2>/dev/null | wc -l | tr -d ' ')

        echo -e "${GREEN}done${NC} ($untracked untracked files)"
    done
}

# Show dirty repositories (with uncommitted changes)
show_dirty() {
    local target="$1"

    print_section "DIRTY REPOSITORIES"
    log "Repositories with uncommitted changes:"
    echo ""

    local count=0

    find "$target" -name ".git" -type d 2>/dev/null | while read -r gitdir; do
        local repo=$(dirname "$gitdir")
        local name=$(basename "$repo")

        cd "$repo" 2>/dev/null || continue

        local status=$(git status --porcelain 2>/dev/null)
        if [ -n "$status" ]; then
            ((count++))
            echo -e "${YELLOW}$name${NC} ($repo)"

            # Show changed files
            echo "$status" | head -5 | while read -r line; do
                echo "    $line"
            done
            local total=$(echo "$status" | wc -l | tr -d ' ')
            [ "$total" -gt 5 ] && echo "    ... and $((total - 5)) more"
            echo ""
        fi
    done

    [ "$count" -eq 0 ] && log_success "All repositories are clean!"
}

# Show repositories with unpushed commits
show_unpushed() {
    local target="$1"

    print_section "UNPUSHED COMMITS"
    log "Repositories with commits not pushed to remote:"
    echo ""

    find "$target" -name ".git" -type d 2>/dev/null | while read -r gitdir; do
        local repo=$(dirname "$gitdir")
        local name=$(basename "$repo")

        cd "$repo" 2>/dev/null || continue

        # Check for upstream
        local upstream=$(git rev-parse --abbrev-ref @{upstream} 2>/dev/null)
        [ -z "$upstream" ] && continue

        # Count unpushed commits
        local unpushed=$(git rev-list --count @{upstream}..HEAD 2>/dev/null)
        if [ "$unpushed" -gt 0 ]; then
            echo -e "${YELLOW}$name${NC}: $unpushed unpushed commit(s)"
            git log --oneline @{upstream}..HEAD 2>/dev/null | head -3 | sed 's/^/    /'
            echo ""
        fi
    done
}

# Clone missing repositories from a list
clone_from_list() {
    local list_file="$1"
    local dest_dir="${2:-$TARGET/cloned}"

    print_section "CLONING REPOSITORIES"

    if [ ! -f "$list_file" ]; then
        log_error "List file not found: $list_file"
        return 1
    fi

    mkdir -p "$dest_dir"

    while read -r url; do
        [ -z "$url" ] && continue
        [[ "$url" =~ ^# ]] && continue

        local name=$(basename "$url" .git)

        if [ -d "$dest_dir/$name" ]; then
            echo -e "${YELLOW}Skipping:${NC} $name (already exists)"
            continue
        fi

        echo -ne "${CYAN}Cloning:${NC} $name... "
        if git clone --depth 1 "$url" "$dest_dir/$name" &>/dev/null; then
            echo -e "${GREEN}done${NC}"
        else
            echo -e "${RED}failed${NC}"
        fi
    done < "$list_file"
}

# Export repository URLs to file
export_urls() {
    local target="$1"
    local output="${2:-$REPORT_DIR/repo_urls_$(date +%Y%m%d).txt}"

    print_section "EXPORTING REPOSITORY URLS"

    mkdir -p "$(dirname "$output")"

    find "$target" -name ".git" -type d 2>/dev/null | while read -r gitdir; do
        local repo=$(dirname "$gitdir")
        cd "$repo" 2>/dev/null || continue

        local url=$(git remote get-url origin 2>/dev/null)
        [ -n "$url" ] && echo "$url"
    done > "$output"

    local count=$(wc -l < "$output" | tr -d ' ')
    log_success "Exported $count repository URLs to: $output"
}

# Generate repository report
generate_report() {
    local target="$1"
    local output="${2:-$REPORT_DIR/report_$(date +%Y%m%d_%H%M%S).md}"

    print_section "GENERATING REPORT"

    mkdir -p "$(dirname "$output")"

    cat > "$output" << EOF
# NOIZYLAB Git Repository Report

**Generated:** $(date)
**Scanned:** $target

## Summary

EOF

    local total=0
    local dirty=0
    local no_remote=0

    # Count stats
    while read -r gitdir; do
        local repo=$(dirname "$gitdir")
        cd "$repo" 2>/dev/null || continue
        ((total++))

        [ -n "$(git status --porcelain 2>/dev/null)" ] && ((dirty++))
        git remote get-url origin &>/dev/null || ((no_remote++))
    done < <(find "$target" -name ".git" -type d 2>/dev/null)

    cat >> "$output" << EOF
| Metric | Count |
|--------|-------|
| Total Repositories | $total |
| Dirty (uncommitted changes) | $dirty |
| No Remote | $no_remote |

## Repositories

| Name | Branch | Status | Remote |
|------|--------|--------|--------|
EOF

    find "$target" -name ".git" -type d 2>/dev/null | while read -r gitdir; do
        local repo=$(dirname "$gitdir")
        local name=$(basename "$repo")

        cd "$repo" 2>/dev/null || continue

        local branch=$(git branch --show-current 2>/dev/null || echo "?")
        local status="clean"
        [ -n "$(git status --porcelain 2>/dev/null)" ] && status="dirty"

        local remote=$(git remote get-url origin 2>/dev/null | sed 's/.*github.com[:/]//' | sed 's/\.git$//' || echo "none")

        echo "| $name | $branch | $status | $remote |" >> "$output"
    done

    log_success "Report saved: $output"
}

# Backup all repositories (bare clone)
backup_repos() {
    local target="$1"
    local backup_dir="${2:-$HOME/git-backups/$(date +%Y%m%d)}"

    print_section "BACKING UP REPOSITORIES"
    log "Backup location: $backup_dir"

    mkdir -p "$backup_dir"

    find "$target" -name ".git" -type d 2>/dev/null | while read -r gitdir; do
        local repo=$(dirname "$gitdir")
        local name=$(basename "$repo")

        echo -ne "${CYAN}Backing up:${NC} $name... "

        if git clone --bare "$repo" "$backup_dir/$name.git" &>/dev/null; then
            echo -e "${GREEN}done${NC}"
        else
            echo -e "${RED}failed${NC}"
        fi
    done

    local size=$(du -sh "$backup_dir" 2>/dev/null | cut -f1)
    log_success "Backup complete: $size"
}

#===============================================================================
# USAGE
#===============================================================================

usage() {
    echo "NOIZYLAB Git Repository Manager"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  find [path]              Find all git repositories"
    echo "  list [path]              List repositories with status"
    echo "  update [path]            Update all repositories (git pull)"
    echo "  fetch [path]             Fetch all repositories"
    echo "  clean [path]             Clean all repositories (git gc)"
    echo "  dirty [path]             Show repositories with uncommitted changes"
    echo "  unpushed [path]          Show repositories with unpushed commits"
    echo "  export [path] [file]     Export repository URLs to file"
    echo "  clone [list] [dest]      Clone repositories from URL list"
    echo "  backup [path] [dest]     Backup all repositories (bare clone)"
    echo "  report [path] [file]     Generate markdown report"
    echo ""
    echo "Examples:"
    echo "  $0 find /Volumes/4TBSG"
    echo "  $0 list /Users/m2ultra/projects"
    echo "  $0 update /Users/m2ultra/projects"
    echo "  $0 dirty /Volumes/4TBSG"
    echo "  $0 backup /Volumes/4TBSG ~/git-backups"
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
        find|scan)
            find_repos "$arg1" "$arg2"
            ;;
        list|ls|status)
            list_repos "$arg1"
            ;;
        update|pull)
            update_all "$arg1"
            ;;
        fetch)
            fetch_all "$arg1"
            ;;
        clean|gc)
            clean_all "$arg1"
            ;;
        dirty|modified)
            show_dirty "$arg1"
            ;;
        unpushed|ahead)
            show_unpushed "$arg1"
            ;;
        export|urls)
            export_urls "$arg1" "$arg2"
            ;;
        clone|import)
            clone_from_list "$arg1" "$arg2"
            ;;
        backup|bak)
            backup_repos "$arg1" "$arg2"
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
