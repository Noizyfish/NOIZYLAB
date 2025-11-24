#!/bin/bash
#===============================================================================
# NOIZYLAB CLOUD SYNC
# Sync code and backups to cloud storage (S3, Google Drive, Dropbox, etc.)
#===============================================================================

set -e

# Configuration
NOIZYLAB_DIR="$HOME/.noizylab"
CONFIG_FILE="$NOIZYLAB_DIR/cloud-config.json"
LOG_DIR="$NOIZYLAB_DIR/logs"
CLOUD_LOG="$LOG_DIR/cloud-sync.log"
SYNC_STATE="$NOIZYLAB_DIR/sync-state.json"

# Default paths
DEFAULT_SOURCE="$HOME/NOIZYLAB_CODE"
DEFAULT_BACKUP_DIR="$HOME/.noizylab/backups"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

mkdir -p "$LOG_DIR"
mkdir -p "$NOIZYLAB_DIR"

#===============================================================================
# LOGGING
#===============================================================================

log() { echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

log_to_file() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$CLOUD_LOG"
}

print_banner() {
    echo -e "${CYAN}${BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║                    NOIZYLAB CLOUD SYNC                            ║"
    echo "║            S3 • Google Drive • Dropbox • Backblaze                ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

#===============================================================================
# CONFIGURATION
#===============================================================================

init_config() {
    if [ ! -f "$CONFIG_FILE" ]; then
        cat > "$CONFIG_FILE" << 'EOF'
{
    "default_provider": "s3",
    "providers": {
        "s3": {
            "enabled": false,
            "bucket": "",
            "region": "us-west-2",
            "prefix": "noizylab-backup/",
            "profile": "default"
        },
        "gdrive": {
            "enabled": false,
            "folder_id": "",
            "service_account": ""
        },
        "dropbox": {
            "enabled": false,
            "folder": "/NOIZYLAB_BACKUP"
        },
        "backblaze": {
            "enabled": false,
            "bucket": "",
            "key_id": "",
            "application_key": ""
        },
        "rclone": {
            "enabled": false,
            "remote": ""
        }
    },
    "sync": {
        "include_patterns": ["*.py", "*.js", "*.ts", "*.go", "*.rs", "*.java", "*.rb"],
        "exclude_patterns": ["node_modules", "__pycache__", ".git/objects", "*.log", ".DS_Store"],
        "max_file_size_mb": 100,
        "compress": true,
        "encrypt": false
    },
    "schedule": {
        "enabled": false,
        "interval_hours": 24
    }
}
EOF
        log_success "Created config file: $CONFIG_FILE"
    fi
}

show_config() {
    echo -e "${CYAN}Cloud Sync Configuration${NC}"
    echo ""

    if [ -f "$CONFIG_FILE" ]; then
        cat "$CONFIG_FILE"
    else
        log_warning "No config file found. Run 'cloud-sync.sh config' to create one."
    fi
}

configure_provider() {
    local provider="$1"

    case "$provider" in
        s3)
            configure_s3
            ;;
        gdrive)
            configure_gdrive
            ;;
        dropbox)
            configure_dropbox
            ;;
        backblaze)
            configure_backblaze
            ;;
        rclone)
            configure_rclone
            ;;
        *)
            echo "Available providers: s3, gdrive, dropbox, backblaze, rclone"
            ;;
    esac
}

configure_s3() {
    echo -e "${CYAN}Configure AWS S3${NC}"
    echo ""

    read -p "S3 Bucket name: " bucket
    read -p "AWS Region [us-west-2]: " region
    region="${region:-us-west-2}"
    read -p "Prefix/folder [noizylab-backup/]: " prefix
    prefix="${prefix:-noizylab-backup/}"
    read -p "AWS Profile [default]: " profile
    profile="${profile:-default}"

    # Update config using Python (more reliable JSON handling)
    python3 << EOF
import json

with open("$CONFIG_FILE", "r") as f:
    config = json.load(f)

config["providers"]["s3"]["enabled"] = True
config["providers"]["s3"]["bucket"] = "$bucket"
config["providers"]["s3"]["region"] = "$region"
config["providers"]["s3"]["prefix"] = "$prefix"
config["providers"]["s3"]["profile"] = "$profile"
config["default_provider"] = "s3"

with open("$CONFIG_FILE", "w") as f:
    json.dump(config, f, indent=4)
EOF

    log_success "S3 configured successfully"
    echo ""
    echo "Make sure you have AWS CLI installed and configured:"
    echo "  brew install awscli"
    echo "  aws configure"
}

configure_gdrive() {
    echo -e "${CYAN}Configure Google Drive${NC}"
    echo ""
    echo "Google Drive sync requires rclone."
    echo ""
    echo "Setup steps:"
    echo "  1. Install rclone: brew install rclone"
    echo "  2. Configure Google Drive: rclone config"
    echo "  3. Note the remote name you created"
    echo ""

    read -p "rclone remote name for Google Drive: " remote
    read -p "Target folder in Google Drive [NOIZYLAB_BACKUP]: " folder
    folder="${folder:-NOIZYLAB_BACKUP}"

    python3 << EOF
import json

with open("$CONFIG_FILE", "r") as f:
    config = json.load(f)

config["providers"]["gdrive"]["enabled"] = True
config["providers"]["rclone"]["enabled"] = True
config["providers"]["rclone"]["remote"] = "$remote:$folder"
config["default_provider"] = "rclone"

with open("$CONFIG_FILE", "w") as f:
    json.dump(config, f, indent=4)
EOF

    log_success "Google Drive configured via rclone"
}

configure_dropbox() {
    echo -e "${CYAN}Configure Dropbox${NC}"
    echo ""
    echo "Dropbox sync requires rclone."
    echo ""
    echo "Setup steps:"
    echo "  1. Install rclone: brew install rclone"
    echo "  2. Configure Dropbox: rclone config"
    echo "  3. Note the remote name you created"
    echo ""

    read -p "rclone remote name for Dropbox: " remote
    read -p "Target folder in Dropbox [NOIZYLAB_BACKUP]: " folder
    folder="${folder:-NOIZYLAB_BACKUP}"

    python3 << EOF
import json

with open("$CONFIG_FILE", "r") as f:
    config = json.load(f)

config["providers"]["dropbox"]["enabled"] = True
config["providers"]["dropbox"]["folder"] = "/$folder"
config["providers"]["rclone"]["enabled"] = True
config["providers"]["rclone"]["remote"] = "$remote:$folder"
config["default_provider"] = "rclone"

with open("$CONFIG_FILE", "w") as f:
    json.dump(config, f, indent=4)
EOF

    log_success "Dropbox configured via rclone"
}

configure_backblaze() {
    echo -e "${CYAN}Configure Backblaze B2${NC}"
    echo ""

    read -p "B2 Bucket name: " bucket
    read -p "B2 Key ID: " key_id
    read -sp "B2 Application Key: " app_key
    echo ""

    python3 << EOF
import json

with open("$CONFIG_FILE", "r") as f:
    config = json.load(f)

config["providers"]["backblaze"]["enabled"] = True
config["providers"]["backblaze"]["bucket"] = "$bucket"
config["providers"]["backblaze"]["key_id"] = "$key_id"
config["providers"]["backblaze"]["application_key"] = "$app_key"
config["default_provider"] = "backblaze"

with open("$CONFIG_FILE", "w") as f:
    json.dump(config, f, indent=4)
EOF

    log_success "Backblaze B2 configured"
}

configure_rclone() {
    echo -e "${CYAN}Configure rclone Remote${NC}"
    echo ""
    echo "rclone supports 40+ cloud storage providers."
    echo ""
    echo "Setup steps:"
    echo "  1. Install rclone: brew install rclone"
    echo "  2. Configure remote: rclone config"
    echo "  3. List remotes: rclone listremotes"
    echo ""

    read -p "rclone remote (e.g., myremote:bucket/path): " remote

    python3 << EOF
import json

with open("$CONFIG_FILE", "r") as f:
    config = json.load(f)

config["providers"]["rclone"]["enabled"] = True
config["providers"]["rclone"]["remote"] = "$remote"
config["default_provider"] = "rclone"

with open("$CONFIG_FILE", "w") as f:
    json.dump(config, f, indent=4)
EOF

    log_success "rclone remote configured"
}

#===============================================================================
# SYNC FUNCTIONS
#===============================================================================

get_exclude_args() {
    local excludes=""

    # Common excludes
    excludes="--exclude 'node_modules/' "
    excludes+="--exclude '__pycache__/' "
    excludes+="--exclude '.git/objects/' "
    excludes+="--exclude '*.log' "
    excludes+="--exclude '.DS_Store' "
    excludes+="--exclude 'target/' "
    excludes+="--exclude 'dist/' "
    excludes+="--exclude 'build/' "
    excludes+="--exclude '.venv/' "
    excludes+="--exclude 'venv/' "
    excludes+="--exclude '*.pyc' "
    excludes+="--exclude '.env' "
    excludes+="--exclude '*.tmp' "

    echo "$excludes"
}

sync_to_s3() {
    local source="${1:-$DEFAULT_SOURCE}"
    local bucket=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['providers']['s3']['bucket'])")
    local region=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['providers']['s3']['region'])")
    local prefix=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['providers']['s3']['prefix'])")
    local profile=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['providers']['s3']['profile'])")

    if [ -z "$bucket" ]; then
        log_error "S3 bucket not configured. Run: cloud-sync.sh config s3"
        return 1
    fi

    log "Syncing to S3: s3://$bucket/$prefix"
    log_to_file "Starting S3 sync: $source -> s3://$bucket/$prefix"

    local excludes=$(get_exclude_args)

    aws s3 sync "$source" "s3://$bucket/$prefix" \
        --region "$region" \
        --profile "$profile" \
        --delete \
        $excludes \
        --storage-class STANDARD_IA \
        2>&1 | tee -a "$CLOUD_LOG"

    local status=$?
    if [ $status -eq 0 ]; then
        log_success "S3 sync complete"
        log_to_file "S3 sync completed successfully"
        update_sync_state "s3" "success"
    else
        log_error "S3 sync failed"
        log_to_file "S3 sync failed with status $status"
        update_sync_state "s3" "failed"
    fi

    return $status
}

sync_to_rclone() {
    local source="${1:-$DEFAULT_SOURCE}"
    local remote=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['providers']['rclone']['remote'])")

    if [ -z "$remote" ]; then
        log_error "rclone remote not configured. Run: cloud-sync.sh config rclone"
        return 1
    fi

    if ! command -v rclone &>/dev/null; then
        log_error "rclone not installed. Install with: brew install rclone"
        return 1
    fi

    log "Syncing to: $remote"
    log_to_file "Starting rclone sync: $source -> $remote"

    rclone sync "$source" "$remote" \
        --exclude "node_modules/**" \
        --exclude "__pycache__/**" \
        --exclude ".git/objects/**" \
        --exclude "*.log" \
        --exclude ".DS_Store" \
        --exclude "target/**" \
        --exclude "dist/**" \
        --exclude ".venv/**" \
        --progress \
        --stats 10s \
        2>&1 | tee -a "$CLOUD_LOG"

    local status=$?
    if [ $status -eq 0 ]; then
        log_success "rclone sync complete"
        log_to_file "rclone sync completed successfully"
        update_sync_state "rclone" "success"
    else
        log_error "rclone sync failed"
        log_to_file "rclone sync failed with status $status"
        update_sync_state "rclone" "failed"
    fi

    return $status
}

sync_to_backblaze() {
    local source="${1:-$DEFAULT_SOURCE}"
    local bucket=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['providers']['backblaze']['bucket'])")

    if [ -z "$bucket" ]; then
        log_error "Backblaze B2 not configured. Run: cloud-sync.sh config backblaze"
        return 1
    fi

    # Use rclone for B2 (more reliable)
    log "Syncing to Backblaze B2: $bucket"
    log_to_file "Starting B2 sync: $source -> b2:$bucket"

    if command -v rclone &>/dev/null; then
        rclone sync "$source" "b2:$bucket/noizylab-backup/" \
            --exclude "node_modules/**" \
            --exclude "__pycache__/**" \
            --exclude ".git/objects/**" \
            --progress \
            2>&1 | tee -a "$CLOUD_LOG"
    elif command -v b2 &>/dev/null; then
        b2 sync "$source" "b2://$bucket/noizylab-backup/" \
            --excludeRegex 'node_modules/.*' \
            --excludeRegex '__pycache__/.*' \
            2>&1 | tee -a "$CLOUD_LOG"
    else
        log_error "Neither rclone nor b2 CLI installed"
        return 1
    fi

    local status=$?
    if [ $status -eq 0 ]; then
        log_success "B2 sync complete"
        update_sync_state "backblaze" "success"
    else
        log_error "B2 sync failed"
        update_sync_state "backblaze" "failed"
    fi

    return $status
}

#===============================================================================
# STATE TRACKING
#===============================================================================

update_sync_state() {
    local provider="$1"
    local status="$2"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    python3 << EOF
import json
import os

state_file = "$SYNC_STATE"

if os.path.exists(state_file):
    with open(state_file, "r") as f:
        state = json.load(f)
else:
    state = {"syncs": {}}

state["syncs"]["$provider"] = {
    "last_sync": "$timestamp",
    "status": "$status"
}
state["last_sync"] = "$timestamp"
state["last_provider"] = "$provider"

with open(state_file, "w") as f:
    json.dump(state, f, indent=4)
EOF
}

show_status() {
    print_banner
    echo -e "${CYAN}Sync Status${NC}"
    echo ""

    if [ -f "$SYNC_STATE" ]; then
        python3 << 'EOF'
import json
from datetime import datetime

with open("$HOME/.noizylab/sync-state.json", "r") as f:
    state = json.load(f)

print(f"Last sync: {state.get('last_sync', 'Never')}")
print(f"Last provider: {state.get('last_provider', 'None')}")
print("")
print("Provider Status:")
for provider, info in state.get("syncs", {}).items():
    status_icon = "✓" if info["status"] == "success" else "✗"
    print(f"  {status_icon} {provider}: {info['status']} ({info['last_sync']})")
EOF
    else
        echo "No sync history found."
    fi

    echo ""
    echo -e "${CYAN}Configured Providers${NC}"

    if [ -f "$CONFIG_FILE" ]; then
        python3 << 'EOF'
import json

with open("$HOME/.noizylab/cloud-config.json", "r") as f:
    config = json.load(f)

default = config.get("default_provider", "none")
print(f"Default: {default}")
print("")

for name, settings in config.get("providers", {}).items():
    enabled = "✓" if settings.get("enabled", False) else "○"
    print(f"  {enabled} {name}")
EOF
    fi
}

#===============================================================================
# AUTO-SYNC
#===============================================================================

auto_sync() {
    local source="${1:-$DEFAULT_SOURCE}"

    init_config

    local provider=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['default_provider'])" 2>/dev/null || echo "")

    if [ -z "$provider" ]; then
        log_error "No provider configured. Run: cloud-sync.sh config <provider>"
        return 1
    fi

    log "Auto-sync using provider: $provider"

    case "$provider" in
        s3)
            sync_to_s3 "$source"
            ;;
        rclone|gdrive|dropbox)
            sync_to_rclone "$source"
            ;;
        backblaze)
            sync_to_backblaze "$source"
            ;;
        *)
            log_error "Unknown provider: $provider"
            return 1
            ;;
    esac
}

#===============================================================================
# RESTORE
#===============================================================================

restore_from_cloud() {
    local destination="${1:-$DEFAULT_SOURCE}"
    local provider=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['default_provider'])" 2>/dev/null || echo "")

    log_warning "This will overwrite local files with cloud versions!"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        return 0
    fi

    case "$provider" in
        s3)
            local bucket=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['providers']['s3']['bucket'])")
            local prefix=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['providers']['s3']['prefix'])")
            aws s3 sync "s3://$bucket/$prefix" "$destination" --delete
            ;;
        rclone|gdrive|dropbox)
            local remote=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['providers']['rclone']['remote'])")
            rclone sync "$remote" "$destination" --progress
            ;;
        *)
            log_error "Restore not implemented for: $provider"
            return 1
            ;;
    esac

    log_success "Restore complete"
}

#===============================================================================
# LIST CLOUD FILES
#===============================================================================

list_cloud_files() {
    local provider=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['default_provider'])" 2>/dev/null || echo "")

    case "$provider" in
        s3)
            local bucket=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['providers']['s3']['bucket'])")
            local prefix=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['providers']['s3']['prefix'])")
            aws s3 ls "s3://$bucket/$prefix" --recursive --human-readable | head -50
            ;;
        rclone|gdrive|dropbox)
            local remote=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['providers']['rclone']['remote'])")
            rclone ls "$remote" | head -50
            ;;
        *)
            log_error "List not implemented for: $provider"
            ;;
    esac
}

#===============================================================================
# USAGE
#===============================================================================

usage() {
    echo "NOIZYLAB Cloud Sync"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  sync [path]       Sync to configured cloud provider"
    echo "  s3 [path]         Sync directly to S3"
    echo "  gdrive [path]     Sync to Google Drive (via rclone)"
    echo "  dropbox [path]    Sync to Dropbox (via rclone)"
    echo "  backblaze [path]  Sync to Backblaze B2"
    echo "  rclone [path]     Sync to any rclone remote"
    echo ""
    echo "  restore [path]    Restore from cloud"
    echo "  list              List files in cloud"
    echo "  status            Show sync status"
    echo ""
    echo "  config            Show configuration"
    echo "  config <provider> Configure a provider"
    echo ""
    echo "Providers: s3, gdrive, dropbox, backblaze, rclone"
    echo ""
    echo "Examples:"
    echo "  $0 config s3              # Configure S3"
    echo "  $0 sync ~/NOIZYLAB_CODE   # Sync folder"
    echo "  $0 status                 # Show status"
}

#===============================================================================
# MAIN
#===============================================================================

main() {
    init_config

    local cmd="${1:-help}"
    local arg="${2:-}"

    case "$cmd" in
        sync|auto)
            print_banner
            auto_sync "$arg"
            ;;
        s3)
            print_banner
            sync_to_s3 "$arg"
            ;;
        gdrive|google)
            print_banner
            sync_to_rclone "$arg"
            ;;
        dropbox)
            print_banner
            sync_to_rclone "$arg"
            ;;
        backblaze|b2)
            print_banner
            sync_to_backblaze "$arg"
            ;;
        rclone)
            print_banner
            sync_to_rclone "$arg"
            ;;
        restore)
            print_banner
            restore_from_cloud "$arg"
            ;;
        list|ls)
            print_banner
            list_cloud_files
            ;;
        status)
            show_status
            ;;
        config)
            if [ -n "$arg" ]; then
                configure_provider "$arg"
            else
                show_config
            fi
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
