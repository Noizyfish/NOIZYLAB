#!/bin/bash
#===============================================================================
# NOIZYLAB DUPLICATE CLEANER
# Find and remove duplicate files, recover disk space
#===============================================================================

set -e

# Configuration
TARGET="/Volumes/4TBSG"
TRASH_DIR="$HOME/.Trash/noizylab_duplicates_$(date +%Y%m%d)"

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
    echo "║              NOIZYLAB DUPLICATE CLEANER                           ║"
    echo "║         Find • Analyze • Clean • Recover Space                    ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
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

#===============================================================================
# DUPLICATE FINDING
#===============================================================================

# Find duplicates using fdupes if available, otherwise use custom method
find_duplicates() {
    local target="$1"
    local output="$2"
    local min_size="${3:-1024}"  # Minimum 1KB

    log "Scanning for duplicates in $target..."
    log "Minimum file size: $(human_size $min_size)"

    if command -v fdupes &>/dev/null; then
        log "Using fdupes for duplicate detection..."
        fdupes -r -S -n "$target" > "$output" 2>/dev/null
    else
        log "Using built-in duplicate detection..."
        custom_find_duplicates "$target" "$output" "$min_size"
    fi
}

# Custom duplicate finder using checksums
custom_find_duplicates() {
    local target="$1"
    local output="$2"
    local min_size="$3"

    local temp_hashes=$(mktemp)
    local count=0

    # First pass: collect file sizes
    log "Pass 1: Collecting file sizes..."
    find "$target" -type f -size +"${min_size}c" \
        -not -path '*/node_modules/*' \
        -not -path '*/.git/*' \
        -not -path '*/__pycache__/*' \
        -not -path '*/.Trash/*' \
        -not -name '.DS_Store' \
        -not -name '._*' \
        2>/dev/null | while read -r file; do
        local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
        echo "$size|$file"
    done > "$temp_hashes.sizes"

    # Find sizes with multiple files
    log "Pass 2: Finding potential duplicates by size..."
    cut -d'|' -f1 "$temp_hashes.sizes" | sort | uniq -d > "$temp_hashes.dup_sizes"

    # Hash only files with duplicate sizes
    log "Pass 3: Computing checksums for potential duplicates..."
    while read -r size; do
        grep "^$size|" "$temp_hashes.sizes" | cut -d'|' -f2 | while read -r file; do
            local hash=$(md5 -q "$file" 2>/dev/null || md5sum "$file" 2>/dev/null | cut -d' ' -f1)
            echo "$hash|$size|$file"
            ((count++))
            [ $((count % 50)) -eq 0 ] && echo -ne "\r${CYAN}Hashed: $count files${NC}"
        done
    done < "$temp_hashes.dup_sizes" > "$temp_hashes"

    echo ""

    # Group by hash
    log "Pass 4: Grouping duplicates..."
    > "$output"

    cut -d'|' -f1 "$temp_hashes" | sort | uniq -d | while read -r hash; do
        echo "" >> "$output"
        echo "=== Duplicate Set (hash: $hash) ===" >> "$output"
        grep "^$hash|" "$temp_hashes" | while IFS='|' read -r h size file; do
            echo "  [$(human_size $size)] $file" >> "$output"
        done
    done

    rm -f "$temp_hashes" "$temp_hashes.sizes" "$temp_hashes.dup_sizes"
}

# Interactive duplicate review
review_duplicates() {
    local dup_file="$1"

    if [ ! -f "$dup_file" ]; then
        log_error "Duplicate file not found: $dup_file"
        return 1
    fi

    print_banner
    log "Reviewing duplicates from: $dup_file"
    echo ""

    local total_sets=$(grep -c "=== Duplicate Set" "$dup_file" 2>/dev/null || echo "0")
    log "Found $total_sets sets of duplicates"
    echo ""

    # Show preview
    head -50 "$dup_file"

    if [ $(wc -l < "$dup_file") -gt 50 ]; then
        echo ""
        echo "... ($(wc -l < "$dup_file") total lines)"
    fi
}

# Calculate space that can be recovered
calculate_savings() {
    local target="$1"
    local temp_file=$(mktemp)

    print_banner
    log "Calculating potential space savings..."

    # Find duplicates and calculate sizes
    find "$target" -type f -size +1024c \
        -not -path '*/node_modules/*' \
        -not -path '*/.git/*' \
        -not -name '.DS_Store' \
        2>/dev/null | while read -r file; do
        local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
        local hash=$(md5 -q "$file" 2>/dev/null || md5sum "$file" 2>/dev/null | cut -d' ' -f1)
        echo "$hash $size"
    done > "$temp_file"

    # Calculate wasted space
    local total_waste=0
    sort "$temp_file" | uniq -d -f0 | while read -r hash size; do
        local count=$(grep -c "^$hash " "$temp_file")
        local waste=$((size * (count - 1)))
        total_waste=$((total_waste + waste))
    done

    # Get actual calculation
    local waste=$(sort "$temp_file" | awk '
    {
        if ($1 in seen) {
            waste += $2
        } else {
            seen[$1] = 1
        }
    }
    END { print waste }
    ')

    rm -f "$temp_file"

    echo ""
    echo -e "${GREEN}Potential space savings: $(human_size ${waste:-0})${NC}"
}

# Auto-clean duplicates (keep first, move rest to trash)
auto_clean() {
    local target="$1"
    local strategy="${2:-keep-first}"
    local dry_run="${3:-false}"

    print_banner
    log "Auto-cleaning duplicates..."
    log "Strategy: $strategy"
    log "Dry run: $dry_run"

    mkdir -p "$TRASH_DIR"

    local temp_file=$(mktemp)
    local removed=0
    local saved_bytes=0

    # Find all duplicates
    find "$target" -type f -size +1024c \
        -not -path '*/node_modules/*' \
        -not -path '*/.git/*' \
        -not -name '.DS_Store' \
        2>/dev/null | while read -r file; do
        local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
        local hash=$(md5 -q "$file" 2>/dev/null || md5sum "$file" 2>/dev/null | cut -d' ' -f1)
        echo "$hash|$size|$file"
    done | sort > "$temp_file"

    local prev_hash=""
    local keep_file=""

    while IFS='|' read -r hash size file; do
        if [ "$hash" = "$prev_hash" ]; then
            # This is a duplicate
            case "$strategy" in
                keep-first)
                    # Keep the first one we saw
                    ;;
                keep-newest)
                    local keep_mtime=$(stat -f%m "$keep_file" 2>/dev/null || stat -c%Y "$keep_file" 2>/dev/null)
                    local curr_mtime=$(stat -f%m "$file" 2>/dev/null || stat -c%Y "$file" 2>/dev/null)
                    if [ "$curr_mtime" -gt "$keep_mtime" ]; then
                        # Current is newer, remove the kept one
                        if [ "$dry_run" != "true" ]; then
                            mv "$keep_file" "$TRASH_DIR/"
                        fi
                        keep_file="$file"
                        ((removed++))
                        saved_bytes=$((saved_bytes + size))
                        continue
                    fi
                    ;;
                keep-shortest-path)
                    if [ ${#file} -lt ${#keep_file} ]; then
                        if [ "$dry_run" != "true" ]; then
                            mv "$keep_file" "$TRASH_DIR/"
                        fi
                        keep_file="$file"
                        ((removed++))
                        saved_bytes=$((saved_bytes + size))
                        continue
                    fi
                    ;;
            esac

            # Remove the duplicate
            echo -e "${YELLOW}Removing:${NC} $file"
            if [ "$dry_run" != "true" ]; then
                mv "$file" "$TRASH_DIR/"
            fi
            ((removed++))
            saved_bytes=$((saved_bytes + size))
        else
            prev_hash="$hash"
            keep_file="$file"
        fi
    done < "$temp_file"

    rm -f "$temp_file"

    echo ""
    log_success "Removed $removed duplicate files"
    log "Saved: $(human_size $saved_bytes)"

    if [ "$dry_run" = "true" ]; then
        log_warning "This was a DRY RUN - no files were moved"
    else
        log "Duplicates moved to: $TRASH_DIR"
    fi
}

# Clean empty directories
clean_empty_dirs() {
    local target="$1"

    log "Cleaning empty directories..."

    local count=0
    find "$target" -type d -empty 2>/dev/null | while read -r dir; do
        rmdir "$dir" 2>/dev/null && ((count++))
    done

    log_success "Removed $count empty directories"
}

#===============================================================================
# USAGE
#===============================================================================

usage() {
    echo "NOIZYLAB Duplicate Cleaner"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  scan [path]                Find duplicates and show report"
    echo "  calculate [path]           Calculate potential space savings"
    echo "  clean [path] [strategy]    Auto-clean duplicates"
    echo "  dry-run [path] [strategy]  Preview what would be cleaned"
    echo "  empty [path]               Remove empty directories"
    echo ""
    echo "Strategies:"
    echo "  keep-first         Keep first file found (default)"
    echo "  keep-newest        Keep newest file by modification time"
    echo "  keep-shortest-path Keep file with shortest path"
    echo ""
    echo "Examples:"
    echo "  $0 scan /Volumes/4TBSG"
    echo "  $0 calculate /Volumes/4TBSG"
    echo "  $0 dry-run /Volumes/4TBSG keep-newest"
    echo "  $0 clean /Volumes/4TBSG keep-first"
}

#===============================================================================
# MAIN
#===============================================================================

main() {
    local cmd="${1:-help}"
    local target="${2:-$TARGET}"
    local strategy="${3:-keep-first}"

    case "$cmd" in
        scan|find)
            print_banner
            local output="/tmp/noizylab_duplicates_$(date +%Y%m%d_%H%M%S).txt"
            find_duplicates "$target" "$output"
            review_duplicates "$output"
            log "Full report: $output"
            ;;
        calculate|calc|savings)
            calculate_savings "$target"
            ;;
        clean|remove)
            auto_clean "$target" "$strategy" "false"
            ;;
        dry-run|preview)
            auto_clean "$target" "$strategy" "true"
            ;;
        empty|dirs)
            print_banner
            clean_empty_dirs "$target"
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
