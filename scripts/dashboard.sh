#!/bin/bash
#===============================================================================
# NOIZYLAB REAL-TIME DASHBOARD
# Live monitoring of all systems, volumes, and agents
#===============================================================================

# Configuration
REFRESH_RATE=2
NOIZYLAB_DIR="$HOME/.noizylab"
LOG_DIR="$NOIZYLAB_DIR/logs"

# Colors and formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Box drawing characters
H_LINE="─"
V_LINE="│"
TL_CORNER="┌"
TR_CORNER="┐"
BL_CORNER="└"
BR_CORNER="┘"
T_DOWN="┬"
T_UP="┴"
T_RIGHT="├"
T_LEFT="┤"
CROSS="┼"

#===============================================================================
# UTILITY FUNCTIONS
#===============================================================================

get_terminal_size() {
    TERM_COLS=$(tput cols)
    TERM_ROWS=$(tput lines)
}

center_text() {
    local text="$1"
    local width="$2"
    local text_len=${#text}
    local padding=$(( (width - text_len) / 2 ))
    printf "%*s%s%*s" $padding "" "$text" $padding ""
}

draw_box() {
    local title="$1"
    local width="$2"
    local color="$3"

    echo -e "${color}${TL_CORNER}$(printf '%*s' $((width-2)) | tr ' ' "$H_LINE")${TR_CORNER}${NC}"
    echo -e "${color}${V_LINE}${NC}$(center_text "$title" $((width-2)))${color}${V_LINE}${NC}"
    echo -e "${color}${T_RIGHT}$(printf '%*s' $((width-2)) | tr ' ' "$H_LINE")${T_LEFT}${NC}"
}

draw_box_bottom() {
    local width="$1"
    local color="$2"
    echo -e "${color}${BL_CORNER}$(printf '%*s' $((width-2)) | tr ' ' "$H_LINE")${BR_CORNER}${NC}"
}

progress_bar() {
    local current=$1
    local total=$2
    local width=${3:-20}
    local percentage=$((current * 100 / total))
    local filled=$((current * width / total))
    local empty=$((width - filled))

    local bar=""
    local color="${GREEN}"

    if [ $percentage -gt 80 ]; then
        color="${RED}"
    elif [ $percentage -gt 60 ]; then
        color="${YELLOW}"
    fi

    printf "${color}"
    printf "%${filled}s" | tr ' ' '█'
    printf "${GRAY}"
    printf "%${empty}s" | tr ' ' '░'
    printf "${NC} %3d%%" $percentage
}

human_size() {
    local bytes=$1
    if [ -z "$bytes" ] || [ "$bytes" = "0" ]; then
        echo "0 B"
        return
    fi
    if [ $bytes -ge 1099511627776 ]; then
        printf "%.1f TB" $(echo "scale=1; $bytes/1099511627776" | bc)
    elif [ $bytes -ge 1073741824 ]; then
        printf "%.1f GB" $(echo "scale=1; $bytes/1073741824" | bc)
    elif [ $bytes -ge 1048576 ]; then
        printf "%.1f MB" $(echo "scale=1; $bytes/1048576" | bc)
    elif [ $bytes -ge 1024 ]; then
        printf "%.1f KB" $(echo "scale=1; $bytes/1024" | bc)
    else
        echo "$bytes B"
    fi
}

#===============================================================================
# DATA COLLECTION
#===============================================================================

get_volume_info() {
    local vol="$1"
    if [ -d "$vol" ]; then
        df -k "$vol" 2>/dev/null | tail -1 | awk '{print $2" "$3" "$4}'
    else
        echo "0 0 0"
    fi
}

get_agent_status() {
    local agent="$1"
    if launchctl list 2>/dev/null | grep -q "$agent"; then
        echo "running"
    else
        echo "stopped"
    fi
}

get_last_log_entry() {
    local log_file="$1"
    if [ -f "$log_file" ]; then
        tail -1 "$log_file" 2>/dev/null | cut -c1-60
    else
        echo "No log file"
    fi
}

get_file_count() {
    local dir="$1"
    if [ -d "$dir" ]; then
        find "$dir" -type f 2>/dev/null | wc -l | tr -d ' '
    else
        echo "0"
    fi
}

get_git_repo_count() {
    local dir="$1"
    if [ -d "$dir" ]; then
        find "$dir" -name ".git" -type d 2>/dev/null | wc -l | tr -d ' '
    else
        echo "0"
    fi
}

#===============================================================================
# DASHBOARD SECTIONS
#===============================================================================

render_header() {
    clear
    echo -e "${PURPLE}${BOLD}"
    cat << 'EOF'
    ╔═══════════════════════════════════════════════════════════════════════════╗
    ║   _   _  ___ ___ _______   ___      _    ____                             ║
    ║  | \ | |/ _ \_ _|__  /\ \ / / |    / \  | __ )                            ║
    ║  |  \| | | | | |  / /  \ V /| |   / _ \ |  _ \                            ║
    ║  | |\  | |_| | | / /_   | | | |__/ ___ \| |_) |                           ║
    ║  |_| \_|\___/___/____|  |_| |____/_/   \_\____/                           ║
    ║                                                                           ║
    ║                    REAL-TIME MONITORING DASHBOARD                         ║
    ╚═══════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    echo -e "${GRAY}  $(date '+%Y-%m-%d %H:%M:%S') | Refresh: ${REFRESH_RATE}s | Press Ctrl+C to exit${NC}"
    echo ""
}

render_volumes() {
    draw_box " VOLUMES " 76 "${CYAN}"

    local volumes=("/Volumes/12TB" "/Volumes/4TBSG" "/Users/m2ultra/NOIZYLAB")
    local names=("12TB Drive" "4TB Drive" "NOIZYLAB")

    for i in "${!volumes[@]}"; do
        local vol="${volumes[$i]}"
        local name="${names[$i]}"
        local info=$(get_volume_info "$vol")
        local total=$(echo "$info" | cut -d' ' -f1)
        local used=$(echo "$info" | cut -d' ' -f2)
        local free=$(echo "$info" | cut -d' ' -f3)

        if [ -d "$vol" ]; then
            local status="${GREEN}●${NC}"
            local total_h=$(human_size $((total * 1024)))
            local used_h=$(human_size $((used * 1024)))
            local free_h=$(human_size $((free * 1024)))
            local pct=$((used * 100 / total))

            printf "${CYAN}${V_LINE}${NC}  $status %-12s " "$name"
            progress_bar $used $total 25
            printf "  ${WHITE}%8s${NC} / ${WHITE}%8s${NC} free: ${GREEN}%8s${NC}" "$used_h" "$total_h" "$free_h"
            printf " ${CYAN}${V_LINE}${NC}\n"
        else
            printf "${CYAN}${V_LINE}${NC}  ${RED}●${NC} %-12s ${GRAY}[NOT MOUNTED]${NC}%45s${CYAN}${V_LINE}${NC}\n" "$name" ""
        fi
    done

    draw_box_bottom 76 "${CYAN}"
    echo ""
}

render_agents() {
    draw_box " AGENTS " 76 "${YELLOW}"

    local agents=(
        "com.noizylab.volume-monitor:Volume Monitor:5min"
        "com.noizylab.backup-12tb:Backup 12TB:Daily 2AM"
        "com.noizylab.sync-12tb:Sync 12TB:Hourly"
        "com.noizylab.integrity-12tb:Integrity Check:Sun 3AM"
        "com.noizylab.security-12tb:Security Scan:Sat 4AM"
        "com.noizylab.git-12tb:Git Fetch:Mon 6AM"
        "com.noizylab.duplicates-12tb:Duplicate Scan:Monthly"
        "com.noizylab.permissions-12tb:Permission Fix:Wed 4AM"
        "com.noizylab.stats-12tb:Code Stats:Monthly"
    )

    for agent_info in "${agents[@]}"; do
        local agent=$(echo "$agent_info" | cut -d: -f1)
        local name=$(echo "$agent_info" | cut -d: -f2)
        local schedule=$(echo "$agent_info" | cut -d: -f3)
        local status=$(get_agent_status "$agent")

        if [ "$status" = "running" ]; then
            local status_icon="${GREEN}●${NC}"
            local status_text="${GREEN}ACTIVE${NC}"
        else
            local status_icon="${GRAY}○${NC}"
            local status_text="${GRAY}IDLE${NC}"
        fi

        printf "${YELLOW}${V_LINE}${NC}  $status_icon %-20s %-10s %8s " "$name" "$status_text" "$schedule"

        # Last run info from log
        local log_file="$LOG_DIR/${agent#com.noizylab.}.log"
        if [ -f "$log_file" ]; then
            local last_mod=$(stat -f%m "$log_file" 2>/dev/null || stat -c%Y "$log_file" 2>/dev/null)
            local now=$(date +%s)
            local age=$((now - last_mod))
            if [ $age -lt 3600 ]; then
                printf "${GREEN}%dm ago${NC}" $((age / 60))
            elif [ $age -lt 86400 ]; then
                printf "${YELLOW}%dh ago${NC}" $((age / 3600))
            else
                printf "${GRAY}%dd ago${NC}" $((age / 86400))
            fi
        else
            printf "${GRAY}Never${NC}"
        fi
        printf "%10s${YELLOW}${V_LINE}${NC}\n" ""
    done

    draw_box_bottom 76 "${YELLOW}"
    echo ""
}

render_stats() {
    draw_box " QUICK STATS " 76 "${GREEN}"

    # Get quick stats
    local noizylab_files=$(get_file_count "/Users/m2ultra/NOIZYLAB/code" 2>/dev/null || echo "0")
    local git_repos=$(get_git_repo_count "/Users/m2ultra/NOIZYLAB" 2>/dev/null || echo "0")
    local log_size=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1 || echo "0")
    local agent_count=$(ls "$HOME/Library/LaunchAgents"/com.noizylab.*.plist 2>/dev/null | wc -l | tr -d ' ')

    printf "${GREEN}${V_LINE}${NC}  ${WHITE}Code Files:${NC} %-10s ${WHITE}Git Repos:${NC} %-8s ${WHITE}Agents:${NC} %-5s ${WHITE}Log Size:${NC} %-10s ${GREEN}${V_LINE}${NC}\n" \
        "$noizylab_files" "$git_repos" "$agent_count" "$log_size"

    draw_box_bottom 76 "${GREEN}"
    echo ""
}

render_recent_activity() {
    draw_box " RECENT ACTIVITY " 76 "${BLUE}"

    # Show last 5 log entries across all logs
    if [ -d "$LOG_DIR" ]; then
        ls -t "$LOG_DIR"/*.log 2>/dev/null | head -3 | while read -r log; do
            local name=$(basename "$log" .log)
            local entry=$(tail -1 "$log" 2>/dev/null | cut -c1-55)
            printf "${BLUE}${V_LINE}${NC}  ${CYAN}%-18s${NC} ${WHITE}%s${NC}" "$name" "${entry:0:50}"
            printf "%$((72 - ${#name} - ${#entry}))s${BLUE}${V_LINE}${NC}\n" ""
        done
    else
        printf "${BLUE}${V_LINE}${NC}  ${GRAY}No recent activity${NC}%55s${BLUE}${V_LINE}${NC}\n" ""
    fi

    draw_box_bottom 76 "${BLUE}"
    echo ""
}

render_quick_commands() {
    echo -e "${GRAY}Quick Commands:${NC}"
    echo -e "  ${CYAN}noizylab extract${NC}    - Extract code from volumes"
    echo -e "  ${CYAN}noizylab backup${NC}     - Run backup now"
    echo -e "  ${CYAN}noizylab security${NC}   - Security scan"
    echo -e "  ${CYAN}noizylab stats${NC}      - Code statistics"
    echo -e "  ${CYAN}noizylab doctor${NC}     - System health check"
}

#===============================================================================
# MAIN DASHBOARD LOOP
#===============================================================================

run_dashboard() {
    # Hide cursor
    tput civis

    # Cleanup on exit
    trap 'tput cnorm; clear; exit 0' INT TERM

    while true; do
        get_terminal_size
        render_header
        render_volumes
        render_agents
        render_stats
        render_recent_activity
        render_quick_commands
        sleep $REFRESH_RATE
    done
}

# One-time render for non-interactive use
render_once() {
    render_header
    render_volumes
    render_agents
    render_stats
    render_recent_activity
    render_quick_commands
}

#===============================================================================
# MAIN
#===============================================================================

case "${1:-}" in
    --once|-1)
        render_once
        ;;
    --help|-h)
        echo "NOIZYLAB Dashboard"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --once, -1    Render once and exit"
        echo "  --help, -h    Show this help"
        echo ""
        echo "Default: Run live dashboard with auto-refresh"
        ;;
    *)
        run_dashboard
        ;;
esac
