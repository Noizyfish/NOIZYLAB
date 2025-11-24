#!/bin/bash
#===============================================================================
# NOIZYLAB ONE-COMMAND INSTALLER
# Complete installation and setup in a single command
#===============================================================================

set -e

# Configuration
INSTALL_DIR="/Users/m2ultra/NOIZYLAB"
SCRIPTS_DIR="$INSTALL_DIR/scripts"
NOIZYLAB_DIR="$HOME/.noizylab"
BIN_DIR="/usr/local/bin"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

#===============================================================================
# BANNER
#===============================================================================

print_banner() {
    clear
    echo -e "${PURPLE}${BOLD}"
    cat << 'EOF'

    ╔═══════════════════════════════════════════════════════════════════════════╗
    ║                                                                           ║
    ║     ███╗   ██╗ ██████╗ ██╗███████╗██╗   ██╗██╗      █████╗ ██████╗       ║
    ║     ████╗  ██║██╔═══██╗██║╚══███╔╝╚██╗ ██╔╝██║     ██╔══██╗██╔══██╗      ║
    ║     ██╔██╗ ██║██║   ██║██║  ███╔╝  ╚████╔╝ ██║     ███████║██████╔╝      ║
    ║     ██║╚██╗██║██║   ██║██║ ███╔╝    ╚██╔╝  ██║     ██╔══██║██╔══██╗      ║
    ║     ██║ ╚████║╚██████╔╝██║███████╗   ██║   ███████╗██║  ██║██████╔╝      ║
    ║     ╚═╝  ╚═══╝ ╚═════╝ ╚═╝╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═════╝       ║
    ║                                                                           ║
    ║              ULTIMATE CODE MANAGEMENT TOOLKIT v2.0                        ║
    ║                       ONE-COMMAND INSTALLER                               ║
    ║                                                                           ║
    ╚═══════════════════════════════════════════════════════════════════════════╝

EOF
    echo -e "${NC}"
}

log() { echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

#===============================================================================
# INSTALLATION STEPS
#===============================================================================

step_directories() {
    echo -e "\n${PURPLE}Step 1: Creating directories${NC}"

    mkdir -p "$NOIZYLAB_DIR"
    mkdir -p "$NOIZYLAB_DIR/logs"
    mkdir -p "$NOIZYLAB_DIR/reports"
    mkdir -p "$NOIZYLAB_DIR/analysis"
    mkdir -p "$NOIZYLAB_DIR/dependencies"
    mkdir -p "$NOIZYLAB_DIR/checksums"
    mkdir -p "$NOIZYLAB_DIR/git-reports"
    mkdir -p "$NOIZYLAB_DIR/security"
    mkdir -p "$NOIZYLAB_DIR/stats"
    mkdir -p "$LAUNCH_AGENTS_DIR"

    log_success "Created ~/.noizylab directory structure"
}

step_permissions() {
    echo -e "\n${PURPLE}Step 2: Setting permissions${NC}"

    chmod +x "$SCRIPTS_DIR"/*.sh 2>/dev/null || true
    chmod +x "$SCRIPTS_DIR"/*.py 2>/dev/null || true
    chmod +x "$SCRIPTS_DIR/noizylab" 2>/dev/null || true

    log_success "Made all scripts executable"
}

step_symlink() {
    echo -e "\n${PURPLE}Step 3: Creating global command${NC}"

    if [ -w "$BIN_DIR" ]; then
        ln -sf "$SCRIPTS_DIR/noizylab" "$BIN_DIR/noizylab"
        log_success "Created 'noizylab' command in $BIN_DIR"
    else
        log_warning "Cannot write to $BIN_DIR (need sudo)"
        echo "  Run: sudo ln -sf $SCRIPTS_DIR/noizylab $BIN_DIR/noizylab"
    fi
}

step_shell_completion() {
    echo -e "\n${PURPLE}Step 4: Setting up shell completion${NC}"

    # Bash completion
    local bash_completion="$NOIZYLAB_DIR/noizylab-completion.bash"
    cat > "$bash_completion" << 'EOF'
# NOIZYLAB bash completion
_noizylab_completions() {
    local cur="${COMP_WORDS[COMP_CWORD]}"
    local commands="extract backup permissions integrity duplicates git stats security automation doctor version help dashboard report analyze dependencies notify"

    case "${COMP_WORDS[1]}" in
        backup)
            COMPREPLY=($(compgen -W "sync mirror watch list cleanup" -- "$cur"))
            ;;
        git)
            COMPREPLY=($(compgen -W "find list update fetch clean dirty unpushed export backup report" -- "$cur"))
            ;;
        security)
            COMPREPLY=($(compgen -W "scan secrets files deps git practices" -- "$cur"))
            ;;
        automation)
            COMPREPLY=($(compgen -W "install uninstall list logs run" -- "$cur"))
            ;;
        *)
            COMPREPLY=($(compgen -W "$commands" -- "$cur"))
            ;;
    esac
}
complete -F _noizylab_completions noizylab
EOF

    # Add to bashrc if not already there
    if [ -f "$HOME/.bashrc" ]; then
        if ! grep -q "noizylab-completion.bash" "$HOME/.bashrc"; then
            echo "source $bash_completion" >> "$HOME/.bashrc"
            log_success "Added bash completion to ~/.bashrc"
        fi
    fi

    # Zsh completion
    if [ -f "$HOME/.zshrc" ]; then
        if ! grep -q "noizylab-completion.bash" "$HOME/.zshrc"; then
            echo "source $bash_completion" >> "$HOME/.zshrc"
            log_success "Added completion to ~/.zshrc"
        fi
    fi
}

step_agents() {
    echo -e "\n${PURPLE}Step 5: Installing automation agents${NC}"

    "$SCRIPTS_DIR/setup-automation.sh" install 2>/dev/null || log_warning "Agents not installed (run manually)"

    log_success "Automation agents configured"
}

step_verify() {
    echo -e "\n${PURPLE}Step 6: Verifying installation${NC}"

    local checks=0
    local passed=0

    # Check scripts
    ((checks++))
    if [ -x "$SCRIPTS_DIR/noizylab" ]; then
        ((passed++))
        log_success "Main CLI tool: OK"
    else
        log_error "Main CLI tool: MISSING"
    fi

    # Check directories
    ((checks++))
    if [ -d "$NOIZYLAB_DIR" ]; then
        ((passed++))
        log_success "Config directory: OK"
    else
        log_error "Config directory: MISSING"
    fi

    # Check command
    ((checks++))
    if command -v noizylab &>/dev/null || [ -x "$BIN_DIR/noizylab" ]; then
        ((passed++))
        log_success "Global command: OK"
    else
        log_warning "Global command: NOT IN PATH"
    fi

    echo ""
    echo -e "Verification: ${GREEN}$passed/$checks${NC} checks passed"
}

step_summary() {
    echo -e "\n${GREEN}${BOLD}"
    cat << 'EOF'
╔═══════════════════════════════════════════════════════════════════════════╗
║                     INSTALLATION COMPLETE! 🎉                              ║
╚═══════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"

    echo -e "${CYAN}Installed Tools:${NC}"
    echo "  • noizylab extract    - Extract code from volumes"
    echo "  • noizylab backup     - Backup and sync"
    echo "  • noizylab permissions- Fix permissions"
    echo "  • noizylab integrity  - File integrity verification"
    echo "  • noizylab duplicates - Find/remove duplicates"
    echo "  • noizylab git        - Git repository management"
    echo "  • noizylab stats      - Code statistics"
    echo "  • noizylab security   - Security scanning"
    echo "  • noizylab automation - Scheduled tasks"
    echo "  • noizylab dashboard  - Real-time monitoring"
    echo "  • noizylab doctor     - System health check"

    echo ""
    echo -e "${CYAN}Quick Start:${NC}"
    echo "  noizylab doctor              # Check system health"
    echo "  noizylab dashboard           # Real-time monitoring"
    echo "  noizylab extract /Volumes/12TB"
    echo ""

    echo -e "${CYAN}Configuration:${NC}"
    echo "  Config:  ~/.noizylab/"
    echo "  Logs:    ~/.noizylab/logs/"
    echo "  Reports: ~/.noizylab/reports/"
    echo ""

    echo -e "${YELLOW}Note: Run 'source ~/.bashrc' or restart terminal for completion${NC}"
}

#===============================================================================
# UNINSTALL
#===============================================================================

uninstall() {
    print_banner
    echo -e "${RED}${BOLD}UNINSTALLING NOIZYLAB${NC}"
    echo ""

    read -p "This will remove NOIZYLAB. Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi

    # Remove agents
    echo "Removing automation agents..."
    for plist in "$LAUNCH_AGENTS_DIR"/com.noizylab.*.plist; do
        if [ -f "$plist" ]; then
            launchctl unload "$plist" 2>/dev/null || true
            rm -f "$plist"
        fi
    done

    # Remove symlink
    echo "Removing global command..."
    rm -f "$BIN_DIR/noizylab" 2>/dev/null || sudo rm -f "$BIN_DIR/noizylab"

    # Remove config
    read -p "Remove ~/.noizylab config and logs? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$NOIZYLAB_DIR"
    fi

    echo ""
    log_success "NOIZYLAB uninstalled"
}

#===============================================================================
# MAIN
#===============================================================================

main() {
    print_banner

    echo -e "${CYAN}This installer will:${NC}"
    echo "  1. Create configuration directories"
    echo "  2. Set script permissions"
    echo "  3. Create global 'noizylab' command"
    echo "  4. Set up shell completion"
    echo "  5. Install automation agents"
    echo "  6. Verify installation"
    echo ""

    read -p "Continue with installation? (Y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo "Installation cancelled."
        exit 0
    fi

    step_directories
    step_permissions
    step_symlink
    step_shell_completion
    step_agents
    step_verify
    step_summary
}

case "${1:-}" in
    --uninstall|uninstall)
        uninstall
        ;;
    --help|-h)
        echo "NOIZYLAB Installer"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  (none)        Run installation"
        echo "  --uninstall   Remove NOIZYLAB"
        echo "  --help        Show this help"
        ;;
    *)
        main
        ;;
esac
