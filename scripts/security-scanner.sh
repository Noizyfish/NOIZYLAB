#!/bin/bash
#===============================================================================
# NOIZYLAB SECURITY SCANNER
# Scan for secrets, vulnerabilities, and security issues in code
#===============================================================================

set -e

# Configuration
TARGET="/Volumes/4TBSG"
REPORT_DIR="$HOME/.noizylab/security"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
SECRETS_FOUND=0
VULNS_FOUND=0
ISSUES_FOUND=0

#===============================================================================
# LOGGING
#===============================================================================

log() { echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_critical() { echo -e "${RED}[!!!]${NC} $1"; }

print_banner() {
    echo -e "${RED}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║              NOIZYLAB SECURITY SCANNER                            ║"
    echo "║         Secrets • Vulnerabilities • Best Practices                ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_section() {
    echo -e "\n${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  $1${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

#===============================================================================
# SECRET PATTERNS
#===============================================================================

# Patterns to detect secrets
SECRET_PATTERNS=(
    # API Keys
    'api[_-]?key["\s]*[:=]["\s]*[A-Za-z0-9_-]{20,}'
    'apikey["\s]*[:=]["\s]*[A-Za-z0-9_-]{20,}'

    # AWS
    'AKIA[0-9A-Z]{16}'
    'aws[_-]?secret[_-]?access[_-]?key'
    'aws[_-]?access[_-]?key[_-]?id'

    # GitHub
    'ghp_[A-Za-z0-9]{36}'
    'github[_-]?token'
    'gho_[A-Za-z0-9]{36}'
    'ghu_[A-Za-z0-9]{36}'

    # Google
    'AIza[0-9A-Za-z_-]{35}'
    'google[_-]?api[_-]?key'

    # Stripe
    'sk_live_[0-9a-zA-Z]{24}'
    'pk_live_[0-9a-zA-Z]{24}'
    'rk_live_[0-9a-zA-Z]{24}'

    # Slack
    'xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}'
    'https://hooks.slack.com/services/'

    # Twilio
    'SK[0-9a-fA-F]{32}'
    'twilio[_-]?auth[_-]?token'

    # SendGrid
    'SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}'

    # Mailgun
    'key-[0-9a-zA-Z]{32}'

    # Private Keys
    '-----BEGIN RSA PRIVATE KEY-----'
    '-----BEGIN DSA PRIVATE KEY-----'
    '-----BEGIN EC PRIVATE KEY-----'
    '-----BEGIN OPENSSH PRIVATE KEY-----'
    '-----BEGIN PGP PRIVATE KEY BLOCK-----'

    # Passwords
    'password["\s]*[:=]["\s]*[^\s]{8,}'
    'passwd["\s]*[:=]["\s]*[^\s]{8,}'
    'pwd["\s]*[:=]["\s]*[^\s]{8,}'
    'secret["\s]*[:=]["\s]*[^\s]{8,}'

    # Database URLs
    'postgres://[^:]+:[^@]+@'
    'mysql://[^:]+:[^@]+@'
    'mongodb://[^:]+:[^@]+@'
    'mongodb\+srv://[^:]+:[^@]+@'
    'redis://:[^@]+@'

    # JWT
    'eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*'

    # Generic tokens
    'token["\s]*[:=]["\s]*[A-Za-z0-9_-]{20,}'
    'auth[_-]?token["\s]*[:=]["\s]*[A-Za-z0-9_-]{20,}'
    'access[_-]?token["\s]*[:=]["\s]*[A-Za-z0-9_-]{20,}'
    'bearer["\s]+[A-Za-z0-9_-]{20,}'

    # Heroku
    'heroku[_-]?api[_-]?key'

    # Firebase
    'firebase[_-]?api[_-]?key'

    # NPM
    'npm_[A-Za-z0-9]{36}'

    # Discord
    '[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27}'

    # Telegram
    '[0-9]+:AA[0-9A-Za-z_-]{33}'
)

#===============================================================================
# SCANNING FUNCTIONS
#===============================================================================

# Scan for secrets
scan_secrets() {
    local target="$1"
    local output="$REPORT_DIR/secrets_$(date +%Y%m%d_%H%M%S).txt"

    print_section "SCANNING FOR SECRETS"
    log "Target: $target"
    log "This scan checks for exposed API keys, passwords, and tokens..."

    mkdir -p "$REPORT_DIR"
    > "$output"

    echo "NOIZYLAB Security Scanner - Secrets Report" >> "$output"
    echo "Generated: $(date)" >> "$output"
    echo "Target: $target" >> "$output"
    echo "========================================" >> "$output"
    echo "" >> "$output"

    local found=0

    for pattern in "${SECRET_PATTERNS[@]}"; do
        log "Checking pattern: ${pattern:0:40}..."

        local results=$(grep -rniE "$pattern" "$target" \
            --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" \
            --include="*.py" --include="*.rb" --include="*.php" --include="*.go" \
            --include="*.java" --include="*.env*" --include="*.yml" --include="*.yaml" \
            --include="*.json" --include="*.xml" --include="*.conf" --include="*.config" \
            --include="*.sh" --include="*.bash" \
            --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=vendor \
            --exclude-dir=__pycache__ --exclude-dir=venv --exclude-dir=.venv \
            --exclude="*.min.js" --exclude="package-lock.json" --exclude="yarn.lock" \
            2>/dev/null || true)

        if [ -n "$results" ]; then
            echo "" >> "$output"
            echo "=== Pattern: $pattern ===" >> "$output"
            echo "$results" >> "$output"

            local count=$(echo "$results" | wc -l | tr -d ' ')
            ((found += count))

            # Show preview
            echo "$results" | head -3 | while read -r line; do
                log_warning "Found: ${line:0:100}..."
            done
        fi
    done

    SECRETS_FOUND=$found

    echo ""
    if [ $found -gt 0 ]; then
        log_critical "Found $found potential secrets!"
        log "Full report: $output"
    else
        log_success "No secrets detected"
    fi
}

# Scan for sensitive files
scan_sensitive_files() {
    local target="$1"

    print_section "SCANNING FOR SENSITIVE FILES"

    local sensitive_files=(
        ".env"
        ".env.local"
        ".env.production"
        ".env.development"
        "credentials.json"
        "credentials.yml"
        "secrets.json"
        "secrets.yml"
        "id_rsa"
        "id_dsa"
        "id_ecdsa"
        "id_ed25519"
        "*.pem"
        "*.key"
        "*.p12"
        "*.pfx"
        ".htpasswd"
        ".netrc"
        ".npmrc"
        ".pypirc"
        "wp-config.php"
        "config.php"
        "database.yml"
        "settings.py"
        "local_settings.py"
        ".aws/credentials"
        ".docker/config.json"
        "kubeconfig"
        ".kube/config"
    )

    local found=0

    for pattern in "${sensitive_files[@]}"; do
        local results=$(find "$target" -name "$pattern" \
            -not -path '*/node_modules/*' \
            -not -path '*/.git/*' \
            2>/dev/null)

        if [ -n "$results" ]; then
            echo "$results" | while read -r file; do
                ((found++))
                log_warning "Found sensitive file: $file"
            done
        fi
    done

    echo ""
    if [ $found -gt 0 ]; then
        log_critical "Found $found sensitive files!"
    else
        log_success "No sensitive files found in unexpected locations"
    fi
}

# Scan for hardcoded IPs and URLs
scan_hardcoded_values() {
    local target="$1"

    print_section "SCANNING FOR HARDCODED VALUES"

    log "Checking for hardcoded IPs..."
    local ips=$(grep -rnoE '\b([0-9]{1,3}\.){3}[0-9]{1,3}\b' "$target" \
        --include="*.js" --include="*.ts" --include="*.py" --include="*.go" \
        --include="*.java" --include="*.rb" --include="*.php" \
        --exclude-dir=node_modules --exclude-dir=.git \
        2>/dev/null | grep -v "127.0.0.1\|0.0.0.0\|localhost" | head -10)

    if [ -n "$ips" ]; then
        log_warning "Found hardcoded IPs:"
        echo "$ips" | head -5
    fi

    log "Checking for localhost references in production files..."
    local localhost=$(grep -rniE 'localhost|127\.0\.0\.1' "$target" \
        --include="*.env.production" --include="*prod*.json" --include="*production*.yml" \
        --exclude-dir=node_modules --exclude-dir=.git \
        2>/dev/null | head -10)

    if [ -n "$localhost" ]; then
        log_warning "Found localhost in production configs:"
        echo "$localhost" | head -5
    fi
}

# Check for vulnerable dependencies
check_dependencies() {
    local target="$1"

    print_section "CHECKING DEPENDENCIES"

    # Check for npm audit
    log "Checking Node.js projects..."
    find "$target" -name "package.json" -not -path '*/node_modules/*' 2>/dev/null | head -5 | while read -r pkg; do
        local dir=$(dirname "$pkg")
        local name=$(basename "$dir")

        if [ -f "$dir/package-lock.json" ]; then
            echo -ne "${CYAN}Auditing:${NC} $name... "
            cd "$dir"
            local audit_result=$(npm audit --json 2>/dev/null | grep -o '"vulnerabilities":[0-9]*' | cut -d: -f2 || echo "0")

            if [ "$audit_result" -gt 0 ]; then
                echo -e "${YELLOW}$audit_result vulnerabilities${NC}"
                ((VULNS_FOUND += audit_result))
            else
                echo -e "${GREEN}clean${NC}"
            fi
        fi
    done

    # Check for Python safety
    log "Checking Python projects..."
    find "$target" -name "requirements.txt" 2>/dev/null | head -5 | while read -r req; do
        local dir=$(dirname "$req")
        local name=$(basename "$dir")
        echo -e "${CYAN}Found:${NC} $name/requirements.txt"
    done

    if [ $VULNS_FOUND -gt 0 ]; then
        log_warning "Found $VULNS_FOUND vulnerable dependencies"
    else
        log_success "No vulnerable dependencies detected in scanned projects"
    fi
}

# Check git history for secrets
scan_git_history() {
    local target="$1"

    print_section "SCANNING GIT HISTORY"
    log "Checking for secrets in git commit history..."

    find "$target" -name ".git" -type d 2>/dev/null | head -5 | while read -r gitdir; do
        local repo=$(dirname "$gitdir")
        local name=$(basename "$repo")

        echo -ne "${CYAN}Scanning:${NC} $name... "
        cd "$repo"

        # Check for secrets in diff history
        local found=$(git log -p --all 2>/dev/null | grep -iE "(password|secret|api.?key|token)\s*[:=]" | head -5)

        if [ -n "$found" ]; then
            echo -e "${YELLOW}potential secrets found${NC}"
            ((ISSUES_FOUND++))
        else
            echo -e "${GREEN}clean${NC}"
        fi
    done
}

# Security best practices check
check_best_practices() {
    local target="$1"

    print_section "SECURITY BEST PRACTICES"

    # Check for .gitignore
    log "Checking .gitignore files..."
    find "$target" -name ".git" -type d 2>/dev/null | while read -r gitdir; do
        local repo=$(dirname "$gitdir")
        local gitignore="$repo/.gitignore"

        if [ ! -f "$gitignore" ]; then
            log_warning "Missing .gitignore: $repo"
            ((ISSUES_FOUND++))
        else
            # Check if common sensitive patterns are ignored
            if ! grep -q "\.env" "$gitignore" 2>/dev/null; then
                log_warning ".env not in .gitignore: $repo"
            fi
        fi
    done

    # Check for HTTPS
    log "Checking for HTTP (non-HTTPS) URLs..."
    local http_urls=$(grep -rnoE 'http://[^/]+' "$target" \
        --include="*.js" --include="*.ts" --include="*.py" --include="*.go" \
        --include="*.json" --include="*.yml" \
        --exclude-dir=node_modules --exclude-dir=.git \
        2>/dev/null | grep -v "localhost\|127.0.0.1\|http://schemas" | head -10)

    if [ -n "$http_urls" ]; then
        log_warning "Found non-HTTPS URLs:"
        echo "$http_urls" | head -5
    fi

    # Check for eval/exec usage
    log "Checking for dangerous functions (eval, exec)..."
    local dangerous=$(grep -rnoE '\b(eval|exec|system|shell_exec|passthru)\s*\(' "$target" \
        --include="*.js" --include="*.ts" --include="*.py" --include="*.php" --include="*.rb" \
        --exclude-dir=node_modules --exclude-dir=.git \
        2>/dev/null | head -10)

    if [ -n "$dangerous" ]; then
        log_warning "Found potentially dangerous function calls:"
        echo "$dangerous" | head -5
        ((ISSUES_FOUND++))
    fi
}

# Full security scan
full_scan() {
    local target="$1"
    local output="$REPORT_DIR/full_scan_$(date +%Y%m%d_%H%M%S).md"

    print_banner
    log "Starting comprehensive security scan..."
    log "Target: $target"

    mkdir -p "$REPORT_DIR"

    scan_secrets "$target"
    scan_sensitive_files "$target"
    scan_hardcoded_values "$target"
    check_dependencies "$target"
    check_best_practices "$target"

    print_section "SCAN COMPLETE"

    echo -e "${RED}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║                    SECURITY SCAN RESULTS                          ║"
    echo "╠═══════════════════════════════════════════════════════════════════╣"
    printf "║  Potential Secrets:      %-10s                             ║\n" "$SECRETS_FOUND"
    printf "║  Vulnerable Dependencies: %-10s                             ║\n" "$VULNS_FOUND"
    printf "║  Other Issues:           %-10s                             ║\n" "$ISSUES_FOUND"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    local total=$((SECRETS_FOUND + VULNS_FOUND + ISSUES_FOUND))
    if [ $total -gt 0 ]; then
        log_critical "Review findings and remediate security issues!"
    else
        log_success "No critical security issues detected"
    fi

    log "Reports saved to: $REPORT_DIR"
}

#===============================================================================
# USAGE
#===============================================================================

usage() {
    echo "NOIZYLAB Security Scanner"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  scan [path]           Full security scan"
    echo "  secrets [path]        Scan for exposed secrets only"
    echo "  files [path]          Scan for sensitive files only"
    echo "  deps [path]           Check for vulnerable dependencies"
    echo "  git [path]            Scan git history for secrets"
    echo "  practices [path]      Check security best practices"
    echo ""
    echo "Examples:"
    echo "  $0 scan /Volumes/4TBSG"
    echo "  $0 secrets /Users/m2ultra/projects"
    echo "  $0 deps /Users/m2ultra/myapp"
}

#===============================================================================
# MAIN
#===============================================================================

main() {
    local cmd="${1:-help}"
    local target="${2:-$TARGET}"

    mkdir -p "$REPORT_DIR"

    case "$cmd" in
        scan|full)
            full_scan "$target"
            ;;
        secrets)
            print_banner
            scan_secrets "$target"
            ;;
        files|sensitive)
            print_banner
            scan_sensitive_files "$target"
            ;;
        deps|dependencies|audit)
            print_banner
            check_dependencies "$target"
            ;;
        git|history)
            print_banner
            scan_git_history "$target"
            ;;
        practices|best)
            print_banner
            check_best_practices "$target"
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
