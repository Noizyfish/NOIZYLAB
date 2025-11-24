#!/bin/bash
#===============================================================================
# NOIZYLAB FILE INTEGRITY CHECKER
# Verify file integrity using checksums, detect corruption, track changes
#===============================================================================

set -e

# Configuration
TARGET="/Volumes/4TBSG"
CHECKSUM_DB="$HOME/.noizylab/checksums"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
TOTAL_FILES=0
VERIFIED=0
CORRUPTED=0
NEW_FILES=0
CHANGED=0
MISSING=0

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
    echo "║            NOIZYLAB FILE INTEGRITY CHECKER                        ║"
    echo "║         Checksum • Verify • Track Changes • Detect Corruption     ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_section() {
    echo -e "\n${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

#===============================================================================
# CHECKSUM FUNCTIONS
#===============================================================================

# Generate checksum for a file
get_checksum() {
    local file="$1"
    local algo="${2:-sha256}"

    case "$algo" in
        md5)
            if command -v md5 &>/dev/null; then
                md5 -q "$file" 2>/dev/null
            else
                md5sum "$file" 2>/dev/null | cut -d' ' -f1
            fi
            ;;
        sha1)
            shasum -a 1 "$file" 2>/dev/null | cut -d' ' -f1
            ;;
        sha256)
            shasum -a 256 "$file" 2>/dev/null | cut -d' ' -f1
            ;;
        xxhash|xxh)
            if command -v xxhsum &>/dev/null; then
                xxhsum "$file" 2>/dev/null | cut -d' ' -f1
            else
                # Fallback to sha256
                shasum -a 256 "$file" 2>/dev/null | cut -d' ' -f1
            fi
            ;;
    esac
}

# Get file metadata
get_file_meta() {
    local file="$1"
    local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
    local mtime=$(stat -f%m "$file" 2>/dev/null || stat -c%Y "$file" 2>/dev/null)
    echo "$size|$mtime"
}

#===============================================================================
# DATABASE FUNCTIONS
#===============================================================================

init_db() {
    local target="$1"
    local db_name=$(echo "$target" | tr '/' '_' | tr ' ' '_')
    local db_path="$CHECKSUM_DB/${db_name}.db"

    mkdir -p "$CHECKSUM_DB"
    echo "$db_path"
}

save_checksum() {
    local db="$1"
    local file="$2"
    local checksum="$3"
    local meta="$4"

    # Escape special characters in path
    local escaped_file=$(echo "$file" | sed 's/|/\\|/g')
    echo "$checksum|$meta|$escaped_file" >> "$db"
}

load_checksums() {
    local db="$1"
    if [ -f "$db" ]; then
        cat "$db"
    fi
}

#===============================================================================
# SCANNING
#===============================================================================

# Generate checksums for all files
generate_checksums() {
    local target="$1"
    local algo="${2:-sha256}"
    local db=$(init_db "$target")
    local db_new="${db}.new"

    print_section "GENERATING CHECKSUMS"
    log "Target: $target"
    log "Algorithm: $algo"
    log "Database: $db"

    # Remove old temp file
    rm -f "$db_new"

    local count=0
    find "$target" -type f \
        -not -path '*/node_modules/*' \
        -not -path '*/.git/*' \
        -not -path '*/__pycache__/*' \
        -not -path '*/.Trash/*' \
        -not -name '.DS_Store' \
        -not -name '._*' \
        2>/dev/null | while read -r file; do

        ((count++))
        [ $((count % 100)) -eq 0 ] && echo -ne "\r${CYAN}Files processed: $count${NC}"

        local checksum=$(get_checksum "$file" "$algo")
        local meta=$(get_file_meta "$file")

        if [ -n "$checksum" ]; then
            save_checksum "$db_new" "$file" "$checksum" "$meta"
            ((TOTAL_FILES++))
        fi
    done

    echo ""

    # Move new db to replace old
    mv "$db_new" "$db"

    log_success "Generated checksums for $count files"
    log "Database saved: $db"
}

# Verify files against stored checksums
verify_checksums() {
    local target="$1"
    local algo="${2:-sha256}"
    local db=$(init_db "$target")

    print_section "VERIFYING CHECKSUMS"
    log "Target: $target"
    log "Database: $db"

    if [ ! -f "$db" ]; then
        log_error "No checksum database found. Run 'generate' first."
        return 1
    fi

    local report_file="$CHECKSUM_DB/verify_report_$TIMESTAMP.txt"

    echo "NOIZYLAB Integrity Verification Report" > "$report_file"
    echo "Generated: $(date)" >> "$report_file"
    echo "Target: $target" >> "$report_file"
    echo "========================================" >> "$report_file"
    echo "" >> "$report_file"

    local count=0
    local total=$(wc -l < "$db" | tr -d ' ')

    while IFS='|' read -r stored_checksum stored_meta stored_file; do
        ((count++))
        [ $((count % 50)) -eq 0 ] && echo -ne "\r${CYAN}Verifying: $count/$total${NC}"

        # Clean up file path
        local file=$(echo "$stored_file" | sed 's/\\|/|/g')

        if [ ! -f "$file" ]; then
            ((MISSING++))
            echo "MISSING: $file" >> "$report_file"
            continue
        fi

        local current_checksum=$(get_checksum "$file" "$algo")

        if [ "$current_checksum" = "$stored_checksum" ]; then
            ((VERIFIED++))
        else
            ((CORRUPTED++))
            echo "CORRUPTED: $file" >> "$report_file"
            echo "  Expected: $stored_checksum" >> "$report_file"
            echo "  Got:      $current_checksum" >> "$report_file"
        fi
    done < "$db"

    echo ""

    # Check for new files
    log "Checking for new files..."
    find "$target" -type f \
        -not -path '*/node_modules/*' \
        -not -path '*/.git/*' \
        -not -name '.DS_Store' \
        2>/dev/null | while read -r file; do
        if ! grep -q "$file" "$db" 2>/dev/null; then
            ((NEW_FILES++))
            echo "NEW: $file" >> "$report_file"
        fi
    done

    print_section "VERIFICATION RESULTS"

    echo -e "${GREEN}Verified:${NC}  $VERIFIED"
    echo -e "${RED}Corrupted:${NC} $CORRUPTED"
    echo -e "${YELLOW}Missing:${NC}   $MISSING"
    echo -e "${BLUE}New:${NC}       $NEW_FILES"

    if [ $CORRUPTED -gt 0 ]; then
        echo ""
        log_error "CORRUPTION DETECTED! Check report: $report_file"
    else
        log_success "All files verified successfully!"
    fi

    log "Full report: $report_file"
}

# Quick check using file metadata only (faster)
quick_check() {
    local target="$1"
    local db=$(init_db "$target")

    print_section "QUICK CHECK (Metadata Only)"
    log "Target: $target"

    if [ ! -f "$db" ]; then
        log_error "No checksum database found. Run 'generate' first."
        return 1
    fi

    local changed=0
    local count=0

    while IFS='|' read -r stored_checksum stored_meta stored_file; do
        ((count++))
        [ $((count % 100)) -eq 0 ] && echo -ne "\r${CYAN}Checking: $count${NC}"

        local file=$(echo "$stored_file" | sed 's/\\|/|/g')

        if [ -f "$file" ]; then
            local current_meta=$(get_file_meta "$file")
            if [ "$current_meta" != "$stored_meta" ]; then
                ((changed++))
                echo -e "\n${YELLOW}Changed:${NC} $file"
            fi
        fi
    done < "$db"

    echo ""
    log_success "Quick check complete: $changed files changed"
}

# Find duplicate files by checksum
find_duplicates() {
    local target="$1"
    local db=$(init_db "$target")

    print_section "FINDING DUPLICATES"
    log "Target: $target"

    if [ ! -f "$db" ]; then
        log_error "No checksum database found. Run 'generate' first."
        return 1
    fi

    local dup_file="$CHECKSUM_DB/duplicates_$TIMESTAMP.txt"

    # Find duplicate checksums
    cut -d'|' -f1 "$db" | sort | uniq -d > "$CHECKSUM_DB/dup_hashes.tmp"

    local dup_count=$(wc -l < "$CHECKSUM_DB/dup_hashes.tmp" | tr -d ' ')

    if [ "$dup_count" -eq 0 ]; then
        log_success "No duplicates found!"
        rm -f "$CHECKSUM_DB/dup_hashes.tmp"
        return
    fi

    echo "NOIZYLAB Duplicate Files Report" > "$dup_file"
    echo "Generated: $(date)" >> "$dup_file"
    echo "========================================" >> "$dup_file"

    while read -r hash; do
        echo "" >> "$dup_file"
        echo "Hash: $hash" >> "$dup_file"
        grep "^$hash|" "$db" | cut -d'|' -f3- >> "$dup_file"
    done < "$CHECKSUM_DB/dup_hashes.tmp"

    rm -f "$CHECKSUM_DB/dup_hashes.tmp"

    log_success "Found $dup_count sets of duplicate files"
    log "Report: $dup_file"

    # Show preview
    echo ""
    head -30 "$dup_file"
    echo "..."
}

# Compare two directories
compare_dirs() {
    local dir1="$1"
    local dir2="$2"
    local algo="${3:-sha256}"

    print_section "COMPARING DIRECTORIES"
    log "Directory 1: $dir1"
    log "Directory 2: $dir2"

    local temp1=$(mktemp)
    local temp2=$(mktemp)

    # Generate checksums for both dirs
    log "Scanning directory 1..."
    find "$dir1" -type f -not -name '.DS_Store' 2>/dev/null | while read -r f; do
        local rel=${f#$dir1/}
        local hash=$(get_checksum "$f" "$algo")
        echo "$hash $rel" >> "$temp1"
    done

    log "Scanning directory 2..."
    find "$dir2" -type f -not -name '.DS_Store' 2>/dev/null | while read -r f; do
        local rel=${f#$dir2/}
        local hash=$(get_checksum "$f" "$algo")
        echo "$hash $rel" >> "$temp2"
    done

    # Compare
    log "Comparing..."
    echo ""

    echo -e "${YELLOW}Only in $dir1:${NC}"
    comm -23 <(sort "$temp1") <(sort "$temp2") | head -20

    echo ""
    echo -e "${YELLOW}Only in $dir2:${NC}"
    comm -13 <(sort "$temp1") <(sort "$temp2") | head -20

    echo ""
    echo -e "${GREEN}Identical files:${NC} $(comm -12 <(sort "$temp1") <(sort "$temp2") | wc -l | tr -d ' ')"

    rm -f "$temp1" "$temp2"
}

#===============================================================================
# USAGE
#===============================================================================

usage() {
    echo "NOIZYLAB File Integrity Checker"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  generate [path] [algo]  Generate checksums for all files"
    echo "  verify [path] [algo]    Verify files against stored checksums"
    echo "  quick [path]            Quick check using file metadata only"
    echo "  duplicates [path]       Find duplicate files by checksum"
    echo "  compare [dir1] [dir2]   Compare two directories"
    echo ""
    echo "Algorithms: md5, sha1, sha256 (default), xxhash"
    echo ""
    echo "Examples:"
    echo "  $0 generate /Volumes/4TBSG"
    echo "  $0 verify /Volumes/4TBSG"
    echo "  $0 quick /Users/m2ultra/NOIZYLAB"
    echo "  $0 duplicates /Volumes/4TBSG"
    echo "  $0 compare /Volumes/4TBSG /Users/m2ultra/NOIZYLAB"
}

#===============================================================================
# MAIN
#===============================================================================

main() {
    print_banner

    local cmd="${1:-help}"
    local arg1="${2:-$TARGET}"
    local arg2="${3:-sha256}"
    local arg3="${4:-}"

    mkdir -p "$CHECKSUM_DB"

    case "$cmd" in
        generate|gen|create)
            generate_checksums "$arg1" "$arg2"
            ;;
        verify|check)
            verify_checksums "$arg1" "$arg2"
            ;;
        quick|fast)
            quick_check "$arg1"
            ;;
        duplicates|dups|dup)
            find_duplicates "$arg1"
            ;;
        compare|diff)
            compare_dirs "$arg1" "$arg2" "$arg3"
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
