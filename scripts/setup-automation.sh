#!/bin/bash
#===============================================================================
# NOIZYLAB AUTOMATION SETUP
# Install LaunchAgents for scheduled backups, syncs, and maintenance
#===============================================================================

set -e

# Configuration
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
NOIZYLAB_DIR="$HOME/.noizylab"
LOG_DIR="$NOIZYLAB_DIR/logs"

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
    echo "║              NOIZYLAB AUTOMATION SETUP                            ║"
    echo "║         LaunchAgents • Cron • Scheduled Tasks                     ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

#===============================================================================
# LAUNCH AGENT TEMPLATES
#===============================================================================

# Daily backup at 2 AM
create_backup_agent() {
    local plist="$LAUNCH_AGENTS_DIR/com.noizylab.backup.plist"

    cat > "$plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.noizylab.backup</string>
    <key>ProgramArguments</key>
    <array>
        <string>$SCRIPTS_DIR/backup-sync.sh</string>
        <string>backup</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/backup.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/backup.error.log</string>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
EOF

    log_success "Created daily backup agent: $plist"
}

# Hourly sync
create_sync_agent() {
    local plist="$LAUNCH_AGENTS_DIR/com.noizylab.sync.plist"

    cat > "$plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.noizylab.sync</string>
    <key>ProgramArguments</key>
    <array>
        <string>$SCRIPTS_DIR/backup-sync.sh</string>
        <string>sync</string>
    </array>
    <key>StartInterval</key>
    <integer>3600</integer>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/sync.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/sync.error.log</string>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
EOF

    log_success "Created hourly sync agent: $plist"
}

# Weekly integrity check (Sundays at 3 AM)
create_integrity_agent() {
    local plist="$LAUNCH_AGENTS_DIR/com.noizylab.integrity.plist"

    cat > "$plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.noizylab.integrity</string>
    <key>ProgramArguments</key>
    <array>
        <string>$SCRIPTS_DIR/integrity-checker.sh</string>
        <string>verify</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Weekday</key>
        <integer>0</integer>
        <key>Hour</key>
        <integer>3</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/integrity.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/integrity.error.log</string>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
EOF

    log_success "Created weekly integrity check agent: $plist"
}

# Weekly security scan (Saturdays at 4 AM)
create_security_agent() {
    local plist="$LAUNCH_AGENTS_DIR/com.noizylab.security.plist"

    cat > "$plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.noizylab.security</string>
    <key>ProgramArguments</key>
    <array>
        <string>$SCRIPTS_DIR/security-scanner.sh</string>
        <string>scan</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Weekday</key>
        <integer>6</integer>
        <key>Hour</key>
        <integer>4</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/security.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/security.error.log</string>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
EOF

    log_success "Created weekly security scan agent: $plist"
}

# Weekly git update (Mondays at 6 AM)
create_git_update_agent() {
    local plist="$LAUNCH_AGENTS_DIR/com.noizylab.git-update.plist"

    cat > "$plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.noizylab.git-update</string>
    <key>ProgramArguments</key>
    <array>
        <string>$SCRIPTS_DIR/git-manager.sh</string>
        <string>fetch</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Weekday</key>
        <integer>1</integer>
        <key>Hour</key>
        <integer>6</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/git-update.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/git-update.error.log</string>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
EOF

    log_success "Created weekly git update agent: $plist"
}

# Monthly cleanup (1st of month at 5 AM)
create_cleanup_agent() {
    local plist="$LAUNCH_AGENTS_DIR/com.noizylab.cleanup.plist"

    cat > "$plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.noizylab.cleanup</string>
    <key>ProgramArguments</key>
    <array>
        <string>$SCRIPTS_DIR/duplicate-cleaner.sh</string>
        <string>dry-run</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Day</key>
        <integer>1</integer>
        <key>Hour</key>
        <integer>5</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/cleanup.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/cleanup.error.log</string>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
EOF

    log_success "Created monthly cleanup agent: $plist"
}

#===============================================================================
# CRONTAB ALTERNATIVE (for non-macOS)
#===============================================================================

create_crontab() {
    local cron_file="$NOIZYLAB_DIR/crontab.txt"

    cat > "$cron_file" << EOF
# NOIZYLAB Automated Tasks
# Install with: crontab $cron_file

# Daily backup at 2 AM
0 2 * * * $SCRIPTS_DIR/backup-sync.sh backup >> $LOG_DIR/backup.log 2>&1

# Hourly sync
0 * * * * $SCRIPTS_DIR/backup-sync.sh sync >> $LOG_DIR/sync.log 2>&1

# Weekly integrity check (Sundays at 3 AM)
0 3 * * 0 $SCRIPTS_DIR/integrity-checker.sh verify >> $LOG_DIR/integrity.log 2>&1

# Weekly security scan (Saturdays at 4 AM)
0 4 * * 6 $SCRIPTS_DIR/security-scanner.sh scan >> $LOG_DIR/security.log 2>&1

# Weekly git fetch (Mondays at 6 AM)
0 6 * * 1 $SCRIPTS_DIR/git-manager.sh fetch >> $LOG_DIR/git-update.log 2>&1

# Monthly cleanup report (1st of month at 5 AM)
0 5 1 * * $SCRIPTS_DIR/duplicate-cleaner.sh dry-run >> $LOG_DIR/cleanup.log 2>&1
EOF

    log_success "Created crontab file: $cron_file"
    echo ""
    echo "To install crontab, run:"
    echo "  crontab $cron_file"
}

#===============================================================================
# AGENT MANAGEMENT
#===============================================================================

install_agents() {
    print_banner
    log "Installing NOIZYLAB automation agents..."

    # Create directories
    mkdir -p "$LAUNCH_AGENTS_DIR"
    mkdir -p "$LOG_DIR"

    # Make scripts executable
    chmod +x "$SCRIPTS_DIR"/*.sh

    # Create all agents
    create_backup_agent
    create_sync_agent
    create_integrity_agent
    create_security_agent
    create_git_update_agent
    create_cleanup_agent

    # Also create crontab for non-macOS
    create_crontab

    echo ""
    log "Loading agents..."

    for plist in "$LAUNCH_AGENTS_DIR"/com.noizylab.*.plist; do
        if [ -f "$plist" ]; then
            local name=$(basename "$plist" .plist)
            launchctl unload "$plist" 2>/dev/null || true
            launchctl load "$plist" 2>/dev/null && log_success "Loaded: $name" || log_warning "Could not load: $name"
        fi
    done

    echo ""
    log_success "Automation setup complete!"
    echo ""
    echo "Scheduled tasks:"
    echo "  • Daily backup:       2:00 AM"
    echo "  • Hourly sync:        Every hour"
    echo "  • Weekly integrity:   Sunday 3:00 AM"
    echo "  • Weekly security:    Saturday 4:00 AM"
    echo "  • Weekly git fetch:   Monday 6:00 AM"
    echo "  • Monthly cleanup:    1st of month 5:00 AM"
    echo ""
    echo "Logs: $LOG_DIR"
}

uninstall_agents() {
    print_banner
    log "Uninstalling NOIZYLAB automation agents..."

    for plist in "$LAUNCH_AGENTS_DIR"/com.noizylab.*.plist; do
        if [ -f "$plist" ]; then
            local name=$(basename "$plist" .plist)
            launchctl unload "$plist" 2>/dev/null || true
            rm -f "$plist"
            log_success "Removed: $name"
        fi
    done

    log_success "All agents uninstalled"
}

list_agents() {
    print_banner
    log "NOIZYLAB automation agents:"
    echo ""

    for plist in "$LAUNCH_AGENTS_DIR"/com.noizylab.*.plist; do
        if [ -f "$plist" ]; then
            local name=$(basename "$plist" .plist)
            local status=$(launchctl list | grep "$name" && echo "running" || echo "stopped")
            echo "  • $name"
        fi
    done

    echo ""
    log "Recent logs:"
    ls -lt "$LOG_DIR"/*.log 2>/dev/null | head -5 || echo "  No logs yet"
}

view_logs() {
    local agent="${1:-all}"

    if [ "$agent" = "all" ]; then
        log "Recent log entries:"
        tail -50 "$LOG_DIR"/*.log 2>/dev/null | head -100
    else
        local log_file="$LOG_DIR/$agent.log"
        if [ -f "$log_file" ]; then
            tail -100 "$log_file"
        else
            log_error "Log not found: $log_file"
        fi
    fi
}

run_now() {
    local agent="$1"

    case "$agent" in
        backup)
            "$SCRIPTS_DIR/backup-sync.sh" backup
            ;;
        sync)
            "$SCRIPTS_DIR/backup-sync.sh" sync
            ;;
        integrity)
            "$SCRIPTS_DIR/integrity-checker.sh" verify
            ;;
        security)
            "$SCRIPTS_DIR/security-scanner.sh" scan
            ;;
        git)
            "$SCRIPTS_DIR/git-manager.sh" fetch
            ;;
        cleanup)
            "$SCRIPTS_DIR/duplicate-cleaner.sh" dry-run
            ;;
        *)
            log_error "Unknown agent: $agent"
            echo "Available: backup, sync, integrity, security, git, cleanup"
            ;;
    esac
}

#===============================================================================
# USAGE
#===============================================================================

usage() {
    echo "NOIZYLAB Automation Setup"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  install         Install all automation agents"
    echo "  uninstall       Remove all automation agents"
    echo "  list            List installed agents"
    echo "  logs [agent]    View logs (all or specific agent)"
    echo "  run <agent>     Run an agent manually now"
    echo "  crontab         Generate crontab file only"
    echo ""
    echo "Agents: backup, sync, integrity, security, git, cleanup"
    echo ""
    echo "Examples:"
    echo "  $0 install"
    echo "  $0 logs backup"
    echo "  $0 run security"
}

#===============================================================================
# MAIN
#===============================================================================

main() {
    local cmd="${1:-help}"
    local arg="${2:-}"

    case "$cmd" in
        install|setup)
            install_agents
            ;;
        uninstall|remove)
            uninstall_agents
            ;;
        list|ls|status)
            list_agents
            ;;
        logs|log)
            view_logs "$arg"
            ;;
        run|exec)
            run_now "$arg"
            ;;
        crontab|cron)
            mkdir -p "$NOIZYLAB_DIR"
            mkdir -p "$LOG_DIR"
            create_crontab
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
