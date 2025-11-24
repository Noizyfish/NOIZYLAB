#!/bin/bash
#===============================================================================
# NOIZYLAB BACKUP & SYNC TOOL
# Incremental backups, mirroring, and smart synchronization
#===============================================================================

set -e

# Configuration
SOURCE="/Volumes/4TBSG"
DEST="/Users/m2ultra/NOIZYLAB"
BACKUP_DIR="/Users/m2ultra/NOIZYLAB_BACKUPS"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_DIR="$DEST/.logs"

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
    echo "║              NOIZYLAB BACKUP & SYNC TOOL                          ║"
    echo "║         Incremental • Mirror • Smart Sync • Verify                ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

#===============================================================================
# RSYNC PROFILES
#===============================================================================

# Incremental backup with hardlinks (space efficient)
incremental_backup() {
    local src="$1"
    local dest="$2"
    local backup_name="backup_$TIMESTAMP"
    local latest_link="$dest/latest"

    print_banner
    log "Starting incremental backup..."
    log "Source: $src"
    log "Destination: $dest/$backup_name"

    mkdir -p "$dest"

    # Find latest backup for hardlinking
    local link_dest=""
    if [ -L "$latest_link" ]; then
        link_dest="--link-dest=$latest_link"
        log "Using previous backup for hardlinks: $(readlink $latest_link)"
    fi

    # Run rsync with incremental backup
    rsync -avh --progress \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='__pycache__' \
        --exclude='.DS_Store' \
        --exclude='*.pyc' \
        --exclude='.venv' \
        --exclude='venv' \
        --exclude='.next' \
        --exclude='dist' \
        --exclude='build' \
        --exclude='.Trash' \
        $link_dest \
        "$src/" "$dest/$backup_name/"

    # Update latest symlink
    rm -f "$latest_link"
    ln -s "$backup_name" "$latest_link"

    log_success "Incremental backup complete: $dest/$backup_name"

    # Show backup size
    local size=$(du -sh "$dest/$backup_name" 2>/dev/null | cut -f1)
    log "Backup size: $size"
}

# Mirror sync (exact copy, deletes removed files)
mirror_sync() {
    local src="$1"
    local dest="$2"

    print_banner
    log "Starting mirror sync..."
    log "Source: $src"
    log "Destination: $dest"
    log_warning "This will DELETE files in destination that don't exist in source!"

    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Aborted."
        exit 0
    fi

    rsync -avh --progress --delete \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='__pycache__' \
        --exclude='.DS_Store' \
        --exclude='*.pyc' \
        --exclude='.venv' \
        --exclude='venv' \
        "$src/" "$dest/"

    log_success "Mirror sync complete"
}

# Smart sync (only changed files, preserve both sides)
smart_sync() {
    local src="$1"
    local dest="$2"

    print_banner
    log "Starting smart sync..."
    log "Source: $src"
    log "Destination: $dest"

    # Use rsync with update flag (skip newer files on dest)
    rsync -avh --progress --update \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='__pycache__' \
        --exclude='.DS_Store' \
        --exclude='*.pyc' \
        --exclude='.venv' \
        --exclude='venv' \
        --exclude='.next' \
        --exclude='dist' \
        --exclude='build' \
        "$src/" "$dest/"

    log_success "Smart sync complete"
}

# Dry run (preview changes)
dry_run_sync() {
    local src="$1"
    local dest="$2"

    print_banner
    log "DRY RUN - Previewing changes..."
    log "Source: $src"
    log "Destination: $dest"

    rsync -avhn --progress \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='__pycache__' \
        --exclude='.DS_Store' \
        "$src/" "$dest/" 2>&1 | head -100

    echo ""
    log_warning "This was a DRY RUN - no files were changed"
}

# Code-only sync (just code files)
code_sync() {
    local src="$1"
    local dest="$2"

    print_banner
    log "Starting code-only sync..."
    log "Source: $src"
    log "Destination: $dest"

    rsync -avh --progress \
        --include='*/' \
        --include='*.js' --include='*.jsx' \
        --include='*.ts' --include='*.tsx' \
        --include='*.py' --include='*.rb' \
        --include='*.go' --include='*.rs' \
        --include='*.java' --include='*.kt' \
        --include='*.swift' --include='*.c' \
        --include='*.cpp' --include='*.h' \
        --include='*.cs' --include='*.php' \
        --include='*.html' --include='*.css' \
        --include='*.scss' --include='*.json' \
        --include='*.yml' --include='*.yaml' \
        --include='*.md' --include='*.sql' \
        --include='*.sh' --include='*.bash' \
        --include='package.json' --include='tsconfig.json' \
        --include='Dockerfile' --include='Makefile' \
        --include='.gitignore' --include='requirements.txt' \
        --exclude='*' \
        --exclude='node_modules' \
        --exclude='.git' \
        "$src/" "$dest/"

    log_success "Code sync complete"
}

# Verify backup integrity
verify_backup() {
    local src="$1"
    local dest="$2"

    print_banner
    log "Verifying backup integrity..."

    rsync -avnc --progress \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='__pycache__' \
        --exclude='.DS_Store' \
        "$src/" "$dest/" 2>&1 | grep -E "^[^d]" | head -50

    log_success "Verification complete"
}

# List all backups
list_backups() {
    local backup_dir="${1:-$BACKUP_DIR}"

    print_banner
    log "Backups in $backup_dir:"
    echo ""

    if [ ! -d "$backup_dir" ]; then
        log_warning "No backup directory found"
        return
    fi

    ls -lth "$backup_dir" | head -20

    echo ""
    log "Total backup storage:"
    du -sh "$backup_dir" 2>/dev/null
}

# Cleanup old backups (keep N most recent)
cleanup_backups() {
    local backup_dir="${1:-$BACKUP_DIR}"
    local keep="${2:-5}"

    print_banner
    log "Cleaning up old backups (keeping $keep most recent)..."

    if [ ! -d "$backup_dir" ]; then
        log_warning "No backup directory found"
        return
    fi

    # List backups sorted by date, skip 'latest' symlink
    local backups=$(ls -1t "$backup_dir" | grep -v "^latest$" | tail -n +$((keep + 1)))

    if [ -z "$backups" ]; then
        log "No old backups to remove"
        return
    fi

    echo "Backups to remove:"
    echo "$backups"
    echo ""

    read -p "Remove these backups? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "$backups" | while read -r backup; do
            if [ -n "$backup" ]; then
                log "Removing: $backup"
                rm -rf "$backup_dir/$backup"
            fi
        done
        log_success "Cleanup complete"
    else
        log "Aborted"
    fi
}

#===============================================================================
# WATCH MODE
#===============================================================================

watch_sync() {
    local src="$1"
    local dest="$2"
    local interval="${3:-60}"

    print_banner
    log "Starting watch mode (sync every ${interval}s)..."
    log "Source: $src"
    log "Destination: $dest"
    log "Press Ctrl+C to stop"
    echo ""

    while true; do
        log "Syncing..."
        rsync -avq \
            --exclude='node_modules' \
            --exclude='.git' \
            --exclude='__pycache__' \
            --exclude='.DS_Store' \
            "$src/" "$dest/"
        log_success "Sync complete. Waiting ${interval}s..."
        sleep "$interval"
    done
}

#===============================================================================
# USAGE
#===============================================================================

usage() {
    echo "NOIZYLAB Backup & Sync Tool"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  backup [src] [dest]     Incremental backup with hardlinks"
    echo "  mirror [src] [dest]     Mirror sync (deletes extra files)"
    echo "  sync [src] [dest]       Smart sync (preserve both sides)"
    echo "  code [src] [dest]       Sync only code files"
    echo "  dry-run [src] [dest]    Preview changes without syncing"
    echo "  verify [src] [dest]     Verify backup integrity"
    echo "  watch [src] [dest] [s]  Continuous sync every N seconds"
    echo "  list [backup_dir]       List all backups"
    echo "  cleanup [dir] [keep]    Remove old backups (keep N newest)"
    echo ""
    echo "Defaults:"
    echo "  Source:      $SOURCE"
    echo "  Destination: $DEST"
    echo "  Backup Dir:  $BACKUP_DIR"
    echo ""
    echo "Examples:"
    echo "  $0 backup                              # Backup with defaults"
    echo "  $0 sync /Volumes/4TBSG ~/Code          # Sync to ~/Code"
    echo "  $0 watch /Volumes/4TBSG ~/Code 30      # Watch mode, 30s interval"
    echo "  $0 cleanup ~/Backups 3                 # Keep only 3 newest backups"
}

#===============================================================================
# MAIN
#===============================================================================

main() {
    local cmd="${1:-help}"
    local src="${2:-$SOURCE}"
    local dest="${3:-$DEST}"
    local extra="${4:-}"

    mkdir -p "$LOG_DIR"

    case "$cmd" in
        backup)
            dest="${3:-$BACKUP_DIR}"
            incremental_backup "$src" "$dest"
            ;;
        mirror)
            mirror_sync "$src" "$dest"
            ;;
        sync|smart)
            smart_sync "$src" "$dest"
            ;;
        code)
            code_sync "$src" "$dest"
            ;;
        dry-run|preview)
            dry_run_sync "$src" "$dest"
            ;;
        verify|check)
            verify_backup "$src" "$dest"
            ;;
        watch)
            watch_sync "$src" "$dest" "${extra:-60}"
            ;;
        list|ls)
            list_backups "$src"
            ;;
        cleanup|clean)
            cleanup_backups "$src" "${dest:-5}"
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
