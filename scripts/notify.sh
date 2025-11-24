#!/bin/bash
#===============================================================================
# NOIZYLAB NOTIFICATION SYSTEM
# macOS notifications, sound alerts, and logging for all events
#===============================================================================

# Configuration
LOG_DIR="$HOME/.noizylab/logs"
NOTIFICATION_LOG="$LOG_DIR/notifications.log"

mkdir -p "$LOG_DIR"

#===============================================================================
# NOTIFICATION FUNCTIONS
#===============================================================================

# Send macOS notification
notify_macos() {
    local title="$1"
    local message="$2"
    local subtitle="${3:-}"
    local sound="${4:-default}"

    if command -v osascript &>/dev/null; then
        osascript -e "display notification \"$message\" with title \"$title\" subtitle \"$subtitle\" sound name \"$sound\""
    fi
}

# Send terminal-notifier (if installed)
notify_terminal() {
    local title="$1"
    local message="$2"
    local group="${3:-noizylab}"

    if command -v terminal-notifier &>/dev/null; then
        terminal-notifier \
            -title "$title" \
            -message "$message" \
            -group "$group" \
            -sound default \
            -appIcon "$HOME/.noizylab/icon.png" 2>/dev/null
    fi
}

# Log notification
log_notification() {
    local level="$1"
    local title="$2"
    local message="$3"

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $title: $message" >> "$NOTIFICATION_LOG"
}

# Play sound alert
play_sound() {
    local type="${1:-default}"

    case "$type" in
        success)
            afplay /System/Library/Sounds/Glass.aiff 2>/dev/null &
            ;;
        warning)
            afplay /System/Library/Sounds/Sosumi.aiff 2>/dev/null &
            ;;
        error)
            afplay /System/Library/Sounds/Basso.aiff 2>/dev/null &
            ;;
        complete)
            afplay /System/Library/Sounds/Hero.aiff 2>/dev/null &
            ;;
        *)
            afplay /System/Library/Sounds/Pop.aiff 2>/dev/null &
            ;;
    esac
}

#===============================================================================
# NOTIFICATION TYPES
#===============================================================================

notify_info() {
    local title="$1"
    local message="$2"

    log_notification "INFO" "$title" "$message"
    notify_macos "NOIZYLAB" "$message" "$title" "Pop"
    echo -e "\033[0;34m[INFO]\033[0m $title: $message"
}

notify_success() {
    local title="$1"
    local message="$2"

    log_notification "SUCCESS" "$title" "$message"
    notify_macos "NOIZYLAB ✓" "$message" "$title" "Glass"
    play_sound success
    echo -e "\033[0;32m[SUCCESS]\033[0m $title: $message"
}

notify_warning() {
    local title="$1"
    local message="$2"

    log_notification "WARNING" "$title" "$message"
    notify_macos "NOIZYLAB ⚠️" "$message" "$title" "Sosumi"
    play_sound warning
    echo -e "\033[1;33m[WARNING]\033[0m $title: $message"
}

notify_error() {
    local title="$1"
    local message="$2"

    log_notification "ERROR" "$title" "$message"
    notify_macos "NOIZYLAB ❌" "$message" "$title" "Basso"
    play_sound error
    echo -e "\033[0;31m[ERROR]\033[0m $title: $message"
}

notify_complete() {
    local title="$1"
    local message="$2"

    log_notification "COMPLETE" "$title" "$message"
    notify_macos "NOIZYLAB 🎉" "$message" "$title" "Hero"
    play_sound complete
    echo -e "\033[0;32m[COMPLETE]\033[0m $title: $message"
}

#===============================================================================
# SPECIFIC NOTIFICATIONS
#===============================================================================

notify_backup_start() {
    notify_info "Backup Started" "Beginning backup of $1"
}

notify_backup_complete() {
    local size="${2:-unknown}"
    notify_success "Backup Complete" "Backup of $1 finished ($size)"
}

notify_backup_failed() {
    notify_error "Backup Failed" "Backup of $1 failed: $2"
}

notify_sync_complete() {
    notify_success "Sync Complete" "Synchronized $1 files to $2"
}

notify_security_alert() {
    notify_warning "Security Alert" "Found $1 potential issues in $2"
}

notify_volume_mounted() {
    notify_info "Volume Mounted" "$1 is now available"
}

notify_volume_unmounted() {
    notify_warning "Volume Unmounted" "$1 is no longer available"
}

notify_integrity_passed() {
    notify_success "Integrity Check" "All files verified successfully"
}

notify_integrity_failed() {
    notify_error "Integrity Check" "Found $1 corrupted files"
}

notify_duplicates_found() {
    notify_info "Duplicates Found" "Found $1 duplicate files ($2 recoverable)"
}

notify_agent_started() {
    notify_info "Agent Started" "$1 is now running"
}

notify_agent_stopped() {
    notify_warning "Agent Stopped" "$1 has stopped"
}

#===============================================================================
# MAIN
#===============================================================================

case "${1:-}" in
    info)
        shift
        notify_info "$1" "$2"
        ;;
    success)
        shift
        notify_success "$1" "$2"
        ;;
    warning)
        shift
        notify_warning "$1" "$2"
        ;;
    error)
        shift
        notify_error "$1" "$2"
        ;;
    complete)
        shift
        notify_complete "$1" "$2"
        ;;
    backup-start)
        shift
        notify_backup_start "$1"
        ;;
    backup-complete)
        shift
        notify_backup_complete "$1" "$2"
        ;;
    backup-failed)
        shift
        notify_backup_failed "$1" "$2"
        ;;
    sync-complete)
        shift
        notify_sync_complete "$1" "$2"
        ;;
    security-alert)
        shift
        notify_security_alert "$1" "$2"
        ;;
    test)
        echo "Testing notifications..."
        notify_info "Test" "This is an info notification"
        sleep 1
        notify_success "Test" "This is a success notification"
        sleep 1
        notify_warning "Test" "This is a warning notification"
        sleep 1
        notify_error "Test" "This is an error notification"
        sleep 1
        notify_complete "Test" "All notification tests complete!"
        ;;
    --help|-h)
        echo "NOIZYLAB Notification System"
        echo ""
        echo "Usage: $0 <type> <title> <message>"
        echo ""
        echo "Types:"
        echo "  info              Information notification"
        echo "  success           Success notification (with sound)"
        echo "  warning           Warning notification (with sound)"
        echo "  error             Error notification (with sound)"
        echo "  complete          Completion notification (with sound)"
        echo ""
        echo "Special notifications:"
        echo "  backup-start      Backup started"
        echo "  backup-complete   Backup completed"
        echo "  backup-failed     Backup failed"
        echo "  sync-complete     Sync completed"
        echo "  security-alert    Security issue found"
        echo ""
        echo "  test              Test all notification types"
        echo ""
        echo "Examples:"
        echo "  $0 success 'Backup' 'Completed successfully'"
        echo "  $0 error 'Sync' 'Connection failed'"
        echo "  $0 test"
        ;;
    *)
        echo "Usage: $0 <type> <title> <message>"
        echo "Run '$0 --help' for more information"
        ;;
esac
