#!/bin/bash
#===============================================================================
# NOIZYLAB PERMISSIONS REPAIR TOOL
# Fixes file/directory permissions, ACLs, ownership, and extended attributes
#===============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Default paths
SOURCE_VOLUME="/Volumes/4TBSG"
DEST_DIR="/Users/m2ultra/NOIZYLAB"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Counters
DIRS_FIXED=0
FILES_FIXED=0
ACLS_FIXED=0
XATTRS_FIXED=0
ERRORS=0

#===============================================================================
# LOGGING
#===============================================================================

log() { echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; ((ERRORS++)); }
log_info() { echo -e "${BLUE}[i]${NC} $1"; }

print_banner() {
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║              NOIZYLAB PERMISSIONS REPAIR TOOL                     ║"
    echo "║         Fix Permissions • ACLs • Ownership • Attributes           ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_section() {
    echo -e "\n${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

#===============================================================================
# PERMISSION REPAIR FUNCTIONS
#===============================================================================

# Fix standard Unix permissions
fix_unix_permissions() {
    local target="$1"
    print_section "FIXING UNIX PERMISSIONS"

    log "Setting directory permissions to 755..."
    find "$target" -type d ! -perm 755 2>/dev/null | while read -r dir; do
        if chmod 755 "$dir" 2>/dev/null; then
            ((DIRS_FIXED++))
            [ $((DIRS_FIXED % 100)) -eq 0 ] && echo -ne "\r${CYAN}Directories fixed: $DIRS_FIXED${NC}"
        fi
    done
    echo ""
    log_success "Fixed $DIRS_FIXED directories"

    log "Setting file permissions to 644 (code files to 644, scripts to 755)..."

    # Regular files: 644
    find "$target" -type f ! -perm 644 \
        ! -name "*.sh" ! -name "*.bash" ! -name "*.zsh" \
        ! -name "*.py" ! -name "*.rb" ! -name "*.pl" \
        ! -name "Makefile" ! -name "Rakefile" \
        2>/dev/null | while read -r file; do
        if chmod 644 "$file" 2>/dev/null; then
            ((FILES_FIXED++))
            [ $((FILES_FIXED % 100)) -eq 0 ] && echo -ne "\r${CYAN}Files fixed: $FILES_FIXED${NC}"
        fi
    done

    # Executable scripts: 755
    find "$target" -type f \( \
        -name "*.sh" -o -name "*.bash" -o -name "*.zsh" -o \
        -name "*.py" -o -name "*.rb" -o -name "*.pl" -o \
        -name "Makefile" -o -name "Rakefile" \
    \) ! -perm 755 2>/dev/null | while read -r script; do
        if chmod 755 "$script" 2>/dev/null; then
            ((FILES_FIXED++))
        fi
    done

    echo ""
    log_success "Fixed $FILES_FIXED files"
}

# Fix Access Control Lists (macOS specific)
fix_acls() {
    local target="$1"
    print_section "FIXING ACCESS CONTROL LISTS (ACLs)"

    if ! command -v chmod &>/dev/null; then
        log_warning "chmod not available, skipping ACL repair"
        return
    fi

    log "Removing problematic ACLs..."

    # Find files with ACLs and remove them
    find "$target" -type f 2>/dev/null | while read -r file; do
        # Check if file has ACLs (macOS)
        if ls -le "$file" 2>/dev/null | grep -q "^ [0-9]"; then
            if chmod -N "$file" 2>/dev/null; then
                ((ACLS_FIXED++))
                [ $((ACLS_FIXED % 50)) -eq 0 ] && echo -ne "\r${CYAN}ACLs removed: $ACLS_FIXED${NC}"
            fi
        fi
    done

    # Same for directories
    find "$target" -type d 2>/dev/null | while read -r dir; do
        if ls -led "$dir" 2>/dev/null | grep -q "^ [0-9]"; then
            if chmod -N "$dir" 2>/dev/null; then
                ((ACLS_FIXED++))
            fi
        fi
    done

    echo ""
    log_success "Removed $ACLS_FIXED ACLs"
}

# Fix extended attributes (macOS specific)
fix_extended_attributes() {
    local target="$1"
    print_section "FIXING EXTENDED ATTRIBUTES"

    if ! command -v xattr &>/dev/null; then
        log_warning "xattr not available, skipping extended attribute repair"
        return
    fi

    log "Removing quarantine and problematic extended attributes..."

    # Remove common problematic xattrs
    local xattrs_to_remove=(
        "com.apple.quarantine"
        "com.apple.metadata:kMDItemWhereFroms"
        "com.apple.metadata:kMDItemDownloadedDate"
        "com.apple.lastuseddate#PS"
    )

    for xattr_name in "${xattrs_to_remove[@]}"; do
        find "$target" -type f 2>/dev/null | while read -r file; do
            if xattr -l "$file" 2>/dev/null | grep -q "$xattr_name"; then
                if xattr -d "$xattr_name" "$file" 2>/dev/null; then
                    ((XATTRS_FIXED++))
                fi
            fi
        done
    done

    log_success "Fixed $XATTRS_FIXED extended attributes"
}

# Fix ownership
fix_ownership() {
    local target="$1"
    local owner="${2:-$(whoami)}"
    print_section "FIXING OWNERSHIP"

    log "Setting ownership to $owner..."

    if [ "$(whoami)" = "root" ]; then
        chown -R "$owner:staff" "$target" 2>/dev/null
        log_success "Ownership set to $owner:staff"
    else
        log_warning "Not running as root - attempting with current user"
        # Try to fix what we can
        find "$target" -user "$(whoami)" -type f 2>/dev/null | while read -r file; do
            chown "$owner" "$file" 2>/dev/null
        done
        log_info "Fixed ownership where possible (run with sudo for full repair)"
    fi
}

# Remove .DS_Store and other junk files
clean_junk_files() {
    local target="$1"
    print_section "CLEANING JUNK FILES"

    local junk_count=0

    # .DS_Store files
    log "Removing .DS_Store files..."
    find "$target" -name ".DS_Store" -type f -delete 2>/dev/null
    junk_count=$((junk_count + $(find "$target" -name ".DS_Store" 2>/dev/null | wc -l)))

    # ._* AppleDouble files
    log "Removing AppleDouble (._*) files..."
    find "$target" -name "._*" -type f -delete 2>/dev/null

    # Thumbs.db (Windows)
    log "Removing Thumbs.db files..."
    find "$target" -name "Thumbs.db" -type f -delete 2>/dev/null
    find "$target" -name "thumbs.db" -type f -delete 2>/dev/null

    # Desktop.ini (Windows)
    find "$target" -name "desktop.ini" -type f -delete 2>/dev/null
    find "$target" -name "Desktop.ini" -type f -delete 2>/dev/null

    # .Spotlight-V100, .fseventsd, .Trashes
    find "$target" -name ".Spotlight-V100" -type d -exec rm -rf {} + 2>/dev/null
    find "$target" -name ".fseventsd" -type d -exec rm -rf {} + 2>/dev/null
    find "$target" -name ".Trashes" -type d -exec rm -rf {} + 2>/dev/null

    # __MACOSX folders
    find "$target" -name "__MACOSX" -type d -exec rm -rf {} + 2>/dev/null

    log_success "Cleaned junk files"
}

# Fix file locks
fix_file_locks() {
    local target="$1"
    print_section "FIXING FILE LOCKS"

    if ! command -v chflags &>/dev/null; then
        log_warning "chflags not available (not macOS?), skipping lock repair"
        return
    fi

    log "Removing user immutable flags..."
    find "$target" -type f 2>/dev/null | while read -r file; do
        # Check for locked files
        if ls -lO "$file" 2>/dev/null | grep -q "uchg\|schg"; then
            if chflags nouchg,noschg "$file" 2>/dev/null; then
                log_info "Unlocked: $file"
            fi
        fi
    done

    log_success "File locks removed"
}

# Verify and repair disk (macOS)
verify_disk() {
    local volume="$1"
    print_section "VERIFYING DISK"

    if ! command -v diskutil &>/dev/null; then
        log_warning "diskutil not available, skipping disk verification"
        return
    fi

    # Get disk identifier
    local disk_id=$(diskutil info "$volume" 2>/dev/null | grep "Device Identifier" | awk '{print $NF}')

    if [ -z "$disk_id" ]; then
        log_warning "Could not determine disk identifier for $volume"
        return
    fi

    log "Disk identifier: $disk_id"
    log_info "To repair this disk, run:"
    echo -e "${YELLOW}  sudo diskutil repairDisk $disk_id${NC}"
    echo -e "${YELLOW}  sudo diskutil repairVolume $volume${NC}"
}

# Reset permissions to defaults for code repository
reset_repo_permissions() {
    local target="$1"
    print_section "RESETTING REPOSITORY PERMISSIONS"

    log "Setting optimal permissions for code repository..."

    # Directories: rwxr-xr-x (755)
    find "$target" -type d -exec chmod 755 {} \; 2>/dev/null

    # Regular files: rw-r--r-- (644)
    find "$target" -type f -exec chmod 644 {} \; 2>/dev/null

    # Shell scripts: rwxr-xr-x (755)
    find "$target" -type f -name "*.sh" -exec chmod 755 {} \; 2>/dev/null
    find "$target" -type f -name "*.bash" -exec chmod 755 {} \; 2>/dev/null

    # Python scripts: rwxr-xr-x (755)
    find "$target" -type f -name "*.py" -exec chmod 755 {} \; 2>/dev/null

    # Git hooks
    if [ -d "$target/.git/hooks" ]; then
        chmod 755 "$target/.git/hooks/"* 2>/dev/null
    fi

    # Executables in bin/
    if [ -d "$target/bin" ]; then
        chmod 755 "$target/bin/"* 2>/dev/null
    fi

    # node_modules binaries
    find "$target" -path "*/node_modules/.bin/*" -type f -exec chmod 755 {} \; 2>/dev/null

    log_success "Repository permissions reset"
}

#===============================================================================
# REPAIR ALL
#===============================================================================

repair_all() {
    local target="$1"

    print_banner

    if [ ! -d "$target" ]; then
        log_error "Target directory not found: $target"
        exit 1
    fi

    log "Target: $target"
    log "Starting comprehensive permission repair..."

    fix_unix_permissions "$target"
    fix_acls "$target"
    fix_extended_attributes "$target"
    fix_file_locks "$target"
    clean_junk_files "$target"
    reset_repo_permissions "$target"

    print_section "REPAIR COMPLETE"

    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║                   PERMISSION REPAIR COMPLETE                      ║"
    echo "╠═══════════════════════════════════════════════════════════════════╣"
    printf "║  Directories Fixed:  %-10s                                ║\n" "$DIRS_FIXED"
    printf "║  Files Fixed:        %-10s                                ║\n" "$FILES_FIXED"
    printf "║  ACLs Removed:       %-10s                                ║\n" "$ACLS_FIXED"
    printf "║  XAttrs Fixed:       %-10s                                ║\n" "$XATTRS_FIXED"
    printf "║  Errors:             %-10s                                ║\n" "$ERRORS"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

#===============================================================================
# USAGE
#===============================================================================

usage() {
    echo "NOIZYLAB Permissions Repair Tool"
    echo ""
    echo "Usage: $0 [OPTIONS] [TARGET_PATH]"
    echo ""
    echo "Options:"
    echo "  -a, --all           Run all repairs (default)"
    echo "  -p, --permissions   Fix Unix permissions only"
    echo "  -l, --acls          Fix ACLs only"
    echo "  -x, --xattrs        Fix extended attributes only"
    echo "  -o, --ownership     Fix ownership only"
    echo "  -c, --clean         Clean junk files only"
    echo "  -u, --unlock        Remove file locks only"
    echo "  -r, --repo          Reset to repository defaults"
    echo "  -v, --verify        Verify disk (macOS)"
    echo "  -s, --source        Repair source volume ($SOURCE_VOLUME)"
    echo "  -d, --dest          Repair destination ($DEST_DIR)"
    echo "  -h, --help          Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 -a /path/to/directory     # Full repair"
    echo "  $0 -s                         # Repair source volume"
    echo "  $0 -d                         # Repair destination"
    echo "  $0 -p -c /path/to/project    # Fix permissions and clean junk"
    echo "  sudo $0 -a /Volumes/4TBSG    # Full repair with root (recommended)"
}

#===============================================================================
# MAIN
#===============================================================================

main() {
    local target=""
    local mode="all"
    local actions=()

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -a|--all)
                mode="all"
                shift
                ;;
            -p|--permissions)
                actions+=("permissions")
                shift
                ;;
            -l|--acls)
                actions+=("acls")
                shift
                ;;
            -x|--xattrs)
                actions+=("xattrs")
                shift
                ;;
            -o|--ownership)
                actions+=("ownership")
                shift
                ;;
            -c|--clean)
                actions+=("clean")
                shift
                ;;
            -u|--unlock)
                actions+=("unlock")
                shift
                ;;
            -r|--repo)
                actions+=("repo")
                shift
                ;;
            -v|--verify)
                actions+=("verify")
                shift
                ;;
            -s|--source)
                target="$SOURCE_VOLUME"
                shift
                ;;
            -d|--dest)
                target="$DEST_DIR"
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            -*)
                echo "Unknown option: $1"
                usage
                exit 1
                ;;
            *)
                target="$1"
                shift
                ;;
        esac
    done

    # Default target
    if [ -z "$target" ]; then
        echo "No target specified. Use -s for source, -d for destination, or specify a path."
        echo ""
        usage
        exit 1
    fi

    # Run appropriate actions
    if [ ${#actions[@]} -eq 0 ] || [ "$mode" = "all" ]; then
        repair_all "$target"
    else
        print_banner
        for action in "${actions[@]}"; do
            case "$action" in
                permissions) fix_unix_permissions "$target" ;;
                acls) fix_acls "$target" ;;
                xattrs) fix_extended_attributes "$target" ;;
                ownership) fix_ownership "$target" ;;
                clean) clean_junk_files "$target" ;;
                unlock) fix_file_locks "$target" ;;
                repo) reset_repo_permissions "$target" ;;
                verify) verify_disk "$target" ;;
            esac
        done
    fi
}

main "$@"
