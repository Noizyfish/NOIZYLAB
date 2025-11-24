#!/bin/bash
#===============================================================================
# NOIZYLAB INTERACTIVE MENU SYSTEM
# Beautiful TUI for navigating all tools and features
#===============================================================================

# Configuration
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
NOIZYLAB_DIR="$HOME/.noizylab"
VERSION="2.0"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Box drawing characters
TL='╔' TR='╗' BL='╚' BR='╝'
H='═' V='║'
LT='╠' RT='╣' TT='╦' BT='╩'

#===============================================================================
# UTILITY FUNCTIONS
#===============================================================================

# Get terminal dimensions
get_term_size() {
    TERM_COLS=$(tput cols)
    TERM_ROWS=$(tput lines)
}

# Clear screen and hide cursor
init_screen() {
    clear
    tput civis  # Hide cursor
}

# Restore cursor on exit
cleanup() {
    tput cnorm  # Show cursor
    echo -e "${NC}"
    clear
}

trap cleanup EXIT

# Center text
center_text() {
    local text="$1"
    local width="$2"
    local len=${#text}
    local padding=$(( (width - len) / 2 ))
    printf "%*s%s%*s" $padding "" "$text" $padding ""
}

# Draw horizontal line
draw_line() {
    local width="$1"
    local char="${2:-$H}"
    printf "%${width}s" | tr ' ' "$char"
}

# Print at position
print_at() {
    local row="$1"
    local col="$2"
    local text="$3"
    tput cup "$row" "$col"
    echo -ne "$text"
}

#===============================================================================
# BANNER
#===============================================================================

print_banner() {
    local start_row="$1"
    local banner_width=75
    local col=$(( (TERM_COLS - banner_width) / 2 ))

    print_at $((start_row)) $col "${PURPLE}${BOLD}"
    print_at $((start_row)) $col "    ╔═══════════════════════════════════════════════════════════════════════════╗"
    print_at $((start_row + 1)) $col "    ║                                                                           ║"
    print_at $((start_row + 2)) $col "    ║     ███╗   ██╗ ██████╗ ██╗███████╗██╗   ██╗██╗      █████╗ ██████╗       ║"
    print_at $((start_row + 3)) $col "    ║     ████╗  ██║██╔═══██╗██║╚══███╔╝╚██╗ ██╔╝██║     ██╔══██╗██╔══██╗      ║"
    print_at $((start_row + 4)) $col "    ║     ██╔██╗ ██║██║   ██║██║  ███╔╝  ╚████╔╝ ██║     ███████║██████╔╝      ║"
    print_at $((start_row + 5)) $col "    ║     ██║╚██╗██║██║   ██║██║ ███╔╝    ╚██╔╝  ██║     ██╔══██║██╔══██╗      ║"
    print_at $((start_row + 6)) $col "    ║     ██║ ╚████║╚██████╔╝██║███████╗   ██║   ███████╗██║  ██║██████╔╝      ║"
    print_at $((start_row + 7)) $col "    ║     ╚═╝  ╚═══╝ ╚═════╝ ╚═╝╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═════╝       ║"
    print_at $((start_row + 8)) $col "    ║                                                                           ║"
    print_at $((start_row + 9)) $col "    ║              ULTIMATE CODE MANAGEMENT TOOLKIT v$VERSION                        ║"
    print_at $((start_row + 10)) $col "    ╚═══════════════════════════════════════════════════════════════════════════╝"
    print_at $((start_row + 11)) $col "${NC}"
}

#===============================================================================
# MENU RENDERING
#===============================================================================

# Menu items: [key] [icon] [name] [description]
declare -a MAIN_MENU=(
    "1|📦|Extract Code|Extract code from external drives"
    "2|💾|Backup & Sync|Backup and synchronize files"
    "3|🔐|Permissions|Fix file permissions"
    "4|✅|Integrity|Verify file integrity"
    "5|🔍|Duplicates|Find and remove duplicates"
    "6|📚|Git Manager|Manage git repositories"
    "7|📊|Statistics|Code statistics and analytics"
    "8|🛡️|Security|Security scanning"
    "9|🔬|Analyze|Smart project analysis"
    "A|📦|Dependencies|Scan dependencies"
    "B|⚡|Automation|Scheduled tasks"
    "C|📈|Dashboard|Real-time monitoring"
    "D|📄|Reports|Generate HTML reports"
    "E|☁️|Cloud Sync|Sync to cloud storage"
    "H|💊|Doctor|System health check"
    "Q|🚪|Quit|Exit NOIZYLAB"
)

render_menu() {
    local start_row="$1"
    local selected="$2"
    local col=$(( (TERM_COLS - 70) / 2 ))
    local row=$start_row
    local idx=0

    for item in "${MAIN_MENU[@]}"; do
        IFS='|' read -r key icon name desc <<< "$item"

        if [ "$idx" -eq "$selected" ]; then
            print_at $row $col "${WHITE}${BOLD}  ▶ [$key] $icon $name${NC}"
            print_at $row $((col + 40)) "${DIM}$desc${NC}"
        else
            print_at $row $col "${CYAN}    [$key] $icon $name${NC}"
            print_at $row $((col + 40)) "${DIM}$desc${NC}"
        fi

        ((row++))
        ((idx++))
    done
}

render_status_bar() {
    local row=$((TERM_ROWS - 2))
    local col=2

    # Draw separator
    print_at $((row - 1)) 0 "${DIM}$(draw_line $TERM_COLS '─')${NC}"

    # Status info
    print_at $row $col "${GREEN}●${NC} Ready"
    print_at $row $((col + 15)) "${DIM}|${NC} ${CYAN}Config:${NC} ~/.noizylab"
    print_at $row $((col + 45)) "${DIM}|${NC} ${CYAN}↑↓${NC} Navigate  ${CYAN}Enter${NC} Select  ${CYAN}Q${NC} Quit"
}

#===============================================================================
# SUBMENUS
#===============================================================================

show_extract_menu() {
    init_screen
    get_term_size
    print_banner 1

    local col=$(( (TERM_COLS - 60) / 2 ))
    local row=14

    print_at $row $col "${CYAN}${BOLD}═══ Extract Code ═══${NC}"
    ((row += 2))

    print_at $row $col "${WHITE}[1]${NC} Quick scan (preview only)"
    ((row++))
    print_at $row $col "${WHITE}[2]${NC} Extract from /Volumes/4TBSG"
    ((row++))
    print_at $row $col "${WHITE}[3]${NC} Extract from /Volumes/12TB"
    ((row++))
    print_at $row $col "${WHITE}[4]${NC} Extract from custom path"
    ((row++))
    print_at $row $col "${WHITE}[B]${NC} Back to main menu"
    ((row += 2))

    print_at $row $col "Select option: "
    tput cnorm
    read -n 1 choice
    tput civis

    case "$choice" in
        1) run_script "quick-scan.sh" ;;
        2) run_script "extract-and-move-code.sh" "/Volumes/4TBSG" ;;
        3) run_script "extract-12tb.sh" ;;
        4)
            print_at $((row + 2)) $col "Enter path: "
            tput cnorm
            read custom_path
            tput civis
            run_script "extract-and-move-code.sh" "$custom_path"
            ;;
        b|B) return ;;
    esac
}

show_backup_menu() {
    init_screen
    get_term_size
    print_banner 1

    local col=$(( (TERM_COLS - 60) / 2 ))
    local row=14

    print_at $row $col "${CYAN}${BOLD}═══ Backup & Sync ═══${NC}"
    ((row += 2))

    print_at $row $col "${WHITE}[1]${NC} Start backup"
    ((row++))
    print_at $row $col "${WHITE}[2]${NC} Mirror mode (exact copy)"
    ((row++))
    print_at $row $col "${WHITE}[3]${NC} Smart sync"
    ((row++))
    print_at $row $col "${WHITE}[4]${NC} Watch mode (continuous)"
    ((row++))
    print_at $row $col "${WHITE}[5]${NC} List backups"
    ((row++))
    print_at $row $col "${WHITE}[B]${NC} Back to main menu"
    ((row += 2))

    print_at $row $col "Select option: "
    tput cnorm
    read -n 1 choice
    tput civis

    case "$choice" in
        1) run_script "backup-sync.sh" "backup" ;;
        2) run_script "backup-sync.sh" "mirror" ;;
        3) run_script "backup-sync.sh" "sync" ;;
        4) run_script "backup-sync.sh" "watch" ;;
        5) run_script "backup-sync.sh" "list" ;;
        b|B) return ;;
    esac
}

show_git_menu() {
    init_screen
    get_term_size
    print_banner 1

    local col=$(( (TERM_COLS - 60) / 2 ))
    local row=14

    print_at $row $col "${CYAN}${BOLD}═══ Git Manager ═══${NC}"
    ((row += 2))

    print_at $row $col "${WHITE}[1]${NC} Find all repositories"
    ((row++))
    print_at $row $col "${WHITE}[2]${NC} List repositories"
    ((row++))
    print_at $row $col "${WHITE}[3]${NC} Update all (pull)"
    ((row++))
    print_at $row $col "${WHITE}[4]${NC} Fetch all"
    ((row++))
    print_at $row $col "${WHITE}[5]${NC} Show dirty repos"
    ((row++))
    print_at $row $col "${WHITE}[6]${NC} Show unpushed commits"
    ((row++))
    print_at $row $col "${WHITE}[7]${NC} Export report"
    ((row++))
    print_at $row $col "${WHITE}[8]${NC} Backup all repos"
    ((row++))
    print_at $row $col "${WHITE}[B]${NC} Back to main menu"
    ((row += 2))

    print_at $row $col "Select option: "
    tput cnorm
    read -n 1 choice
    tput civis

    case "$choice" in
        1) run_script "git-manager.sh" "find" ;;
        2) run_script "git-manager.sh" "list" ;;
        3) run_script "git-manager.sh" "update" ;;
        4) run_script "git-manager.sh" "fetch" ;;
        5) run_script "git-manager.sh" "dirty" ;;
        6) run_script "git-manager.sh" "unpushed" ;;
        7) run_script "git-manager.sh" "export" ;;
        8) run_script "git-manager.sh" "backup" ;;
        b|B) return ;;
    esac
}

show_security_menu() {
    init_screen
    get_term_size
    print_banner 1

    local col=$(( (TERM_COLS - 60) / 2 ))
    local row=14

    print_at $row $col "${CYAN}${BOLD}═══ Security Scanner ═══${NC}"
    ((row += 2))

    print_at $row $col "${WHITE}[1]${NC} Full security scan"
    ((row++))
    print_at $row $col "${WHITE}[2]${NC} Scan for secrets only"
    ((row++))
    print_at $row $col "${WHITE}[3]${NC} Scan files permissions"
    ((row++))
    print_at $row $col "${WHITE}[4]${NC} Check dependencies"
    ((row++))
    print_at $row $col "${WHITE}[5]${NC} Git security check"
    ((row++))
    print_at $row $col "${WHITE}[6]${NC} Best practices audit"
    ((row++))
    print_at $row $col "${WHITE}[B]${NC} Back to main menu"
    ((row += 2))

    print_at $row $col "Select option: "
    tput cnorm
    read -n 1 choice
    tput civis

    case "$choice" in
        1) run_script "security-scanner.sh" "scan" ;;
        2) run_script "security-scanner.sh" "secrets" ;;
        3) run_script "security-scanner.sh" "files" ;;
        4) run_script "security-scanner.sh" "deps" ;;
        5) run_script "security-scanner.sh" "git" ;;
        6) run_script "security-scanner.sh" "practices" ;;
        b|B) return ;;
    esac
}

show_automation_menu() {
    init_screen
    get_term_size
    print_banner 1

    local col=$(( (TERM_COLS - 60) / 2 ))
    local row=14

    print_at $row $col "${CYAN}${BOLD}═══ Automation ═══${NC}"
    ((row += 2))

    print_at $row $col "${WHITE}[1]${NC} Install all agents"
    ((row++))
    print_at $row $col "${WHITE}[2]${NC} Uninstall agents"
    ((row++))
    print_at $row $col "${WHITE}[3]${NC} List agents"
    ((row++))
    print_at $row $col "${WHITE}[4]${NC} View logs"
    ((row++))
    print_at $row $col "${WHITE}[5]${NC} Run backup now"
    ((row++))
    print_at $row $col "${WHITE}[6]${NC} Run security scan now"
    ((row++))
    print_at $row $col "${WHITE}[B]${NC} Back to main menu"
    ((row += 2))

    print_at $row $col "Select option: "
    tput cnorm
    read -n 1 choice
    tput civis

    case "$choice" in
        1) run_script "setup-automation.sh" "install" ;;
        2) run_script "setup-automation.sh" "uninstall" ;;
        3) run_script "setup-automation.sh" "list" ;;
        4) run_script "setup-automation.sh" "logs" ;;
        5) run_script "setup-automation.sh" "run" "backup" ;;
        6) run_script "setup-automation.sh" "run" "security" ;;
        b|B) return ;;
    esac
}

show_cloud_menu() {
    init_screen
    get_term_size
    print_banner 1

    local col=$(( (TERM_COLS - 60) / 2 ))
    local row=14

    print_at $row $col "${CYAN}${BOLD}═══ Cloud Sync ═══${NC}"
    ((row += 2))

    print_at $row $col "${WHITE}[1]${NC} Sync to S3"
    ((row++))
    print_at $row $col "${WHITE}[2]${NC} Sync to Google Drive"
    ((row++))
    print_at $row $col "${WHITE}[3]${NC} Sync to Dropbox"
    ((row++))
    print_at $row $col "${WHITE}[4]${NC} Configure cloud settings"
    ((row++))
    print_at $row $col "${WHITE}[5]${NC} View sync status"
    ((row++))
    print_at $row $col "${WHITE}[B]${NC} Back to main menu"
    ((row += 2))

    print_at $row $col "Select option: "
    tput cnorm
    read -n 1 choice
    tput civis

    case "$choice" in
        1) run_script "cloud-sync.sh" "s3" ;;
        2) run_script "cloud-sync.sh" "gdrive" ;;
        3) run_script "cloud-sync.sh" "dropbox" ;;
        4) run_script "cloud-sync.sh" "config" ;;
        5) run_script "cloud-sync.sh" "status" ;;
        b|B) return ;;
    esac
}

#===============================================================================
# SCRIPT RUNNER
#===============================================================================

run_script() {
    local script="$1"
    shift
    local args="$@"

    clear
    tput cnorm

    if [ -x "$SCRIPTS_DIR/$script" ]; then
        echo -e "${CYAN}Running: $script $args${NC}\n"
        "$SCRIPTS_DIR/$script" $args
    else
        echo -e "${RED}Script not found or not executable: $script${NC}"
    fi

    echo ""
    echo -e "${DIM}Press any key to continue...${NC}"
    read -n 1
    tput civis
}

#===============================================================================
# MAIN LOOP
#===============================================================================

main_menu() {
    local selected=0
    local menu_size=${#MAIN_MENU[@]}

    while true; do
        init_screen
        get_term_size
        print_banner 1
        render_menu 14 $selected
        render_status_bar

        # Read key
        read -rsn1 key

        case "$key" in
            A|k) # Up arrow or k
                ((selected--))
                [ $selected -lt 0 ] && selected=$((menu_size - 1))
                ;;
            B|j) # Down arrow or j
                ((selected++))
                [ $selected -ge $menu_size ] && selected=0
                ;;
            '') # Enter
                handle_selection $selected
                ;;
            q|Q)
                return 0
                ;;
            1|2|3|4|5|6|7|8|9)
                # Direct key selection
                local idx=$((key - 1))
                [ $idx -lt $menu_size ] && handle_selection $idx
                ;;
            a|A) handle_selection 9 ;;  # Dependencies
            b|B) handle_selection 10 ;; # Automation
            c|C) handle_selection 11 ;; # Dashboard
            d|D) handle_selection 12 ;; # Reports
            e|E) handle_selection 13 ;; # Cloud
            h|H) handle_selection 14 ;; # Doctor
        esac
    done
}

handle_selection() {
    local idx="$1"

    case "$idx" in
        0) show_extract_menu ;;
        1) show_backup_menu ;;
        2) run_script "repair-permissions.sh" ;;
        3) run_script "integrity-checker.sh" "verify" ;;
        4) run_script "duplicate-cleaner.sh" "scan" ;;
        5) show_git_menu ;;
        6) run_script "code-stats.sh" ;;
        7) show_security_menu ;;
        8) run_script "project-analyzer.sh" ;;
        9) run_script "dependency-scanner.sh" ;;
        10) show_automation_menu ;;
        11) run_script "dashboard.sh" ;;
        12) run_script "generate-report.sh" ;;
        13) show_cloud_menu ;;
        14) run_script "noizylab" "doctor" ;;
        15) return 1 ;; # Quit
    esac
}

#===============================================================================
# QUICK ACCESS MODE
#===============================================================================

quick_mode() {
    echo -e "${CYAN}${BOLD}NOIZYLAB Quick Menu${NC}"
    echo ""
    echo "  1) Extract Code      6) Git Manager      B) Automation"
    echo "  2) Backup/Sync       7) Statistics       C) Dashboard"
    echo "  3) Permissions       8) Security         D) Reports"
    echo "  4) Integrity         9) Analyze          E) Cloud"
    echo "  5) Duplicates        A) Dependencies     H) Doctor"
    echo ""
    echo -n "Select (Q to quit): "
    read -n 1 choice
    echo ""

    case "$choice" in
        1) show_extract_menu ;;
        2) show_backup_menu ;;
        3) "$SCRIPTS_DIR/repair-permissions.sh" ;;
        4) "$SCRIPTS_DIR/integrity-checker.sh" verify ;;
        5) "$SCRIPTS_DIR/duplicate-cleaner.sh" scan ;;
        6) show_git_menu ;;
        7) "$SCRIPTS_DIR/code-stats.sh" ;;
        8) show_security_menu ;;
        9) "$SCRIPTS_DIR/project-analyzer.sh" ;;
        a|A) "$SCRIPTS_DIR/dependency-scanner.sh" ;;
        b|B) show_automation_menu ;;
        c|C) "$SCRIPTS_DIR/dashboard.sh" ;;
        d|D) "$SCRIPTS_DIR/generate-report.sh" ;;
        e|E) show_cloud_menu ;;
        h|H) "$SCRIPTS_DIR/noizylab" doctor ;;
        q|Q) exit 0 ;;
    esac
}

#===============================================================================
# ENTRY POINT
#===============================================================================

case "${1:-}" in
    --quick|-q)
        quick_mode
        ;;
    --help|-h)
        echo "NOIZYLAB Interactive Menu"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  (none)      Start interactive TUI menu"
        echo "  --quick     Start in quick selection mode"
        echo "  --help      Show this help"
        ;;
    *)
        main_menu
        ;;
esac
