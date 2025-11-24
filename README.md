# NOIZYLAB

```
    ███╗   ██╗ ██████╗ ██╗███████╗██╗   ██╗██╗      █████╗ ██████╗
    ████╗  ██║██╔═══██╗██║╚══███╔╝╚██╗ ██╔╝██║     ██╔══██╗██╔══██╗
    ██╔██╗ ██║██║   ██║██║  ███╔╝  ╚████╔╝ ██║     ███████║██████╔╝
    ██║╚██╗██║██║   ██║██║ ███╔╝    ╚██╔╝  ██║     ██╔══██║██╔══██╗
    ██║ ╚████║╚██████╔╝██║███████╗   ██║   ███████╗██║  ██║██████╔╝
    ╚═╝  ╚═══╝ ╚═════╝ ╚═╝╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═════╝

         COMPLETE DEVELOPMENT PLATFORM v2.0
```

[![CI](https://github.com/noizyfish/NOIZYLAB/actions/workflows/ci.yml/badge.svg)](https://github.com/noizyfish/NOIZYLAB/actions/workflows/ci.yml)
[![Deploy](https://github.com/noizyfish/NOIZYLAB/actions/workflows/deploy.yml/badge.svg)](https://github.com/noizyfish/NOIZYLAB/actions/workflows/deploy.yml)
[![codecov](https://codecov.io/gh/noizyfish/NOIZYLAB/branch/main/graph/badge.svg)](https://codecov.io/gh/noizyfish/NOIZYLAB)

NOIZYLAB is a comprehensive development platform combining:

1. **Production Email System** - Cloudflare Workers email service with 80%+ test coverage
2. **Code Management Toolkit** - Scripts for managing, backing up, and securing your entire codebase

---

## Table of Contents

- [Email System](#email-system)
- [Code Management Toolkit](#code-management-toolkit)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Toolkit Commands](#toolkit-commands)

---

# Email System

Production-ready email system built for Cloudflare Workers with comprehensive test coverage.

## Features

- **Multiple Email Providers**: MailChannels (free), Resend, SendGrid
- **Template Engine**: Variable substitution, conditionals, loops, HTML escaping
- **Rate Limiting**: Sliding window algorithm with KV storage
- **Email Logging**: Full audit trail with D1 database
- **Async Processing**: Queue-based email delivery
- **Scheduled Emails**: Send emails at a specific time
- **Idempotency**: Prevent duplicate sends
- **Health Checks**: Detailed component status
- **TypeScript**: Full type safety with strict mode
- **80%+ Test Coverage**: Unit and integration tests

## Email Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account
- Wrangler CLI

### Installation

```bash
# Clone the repository
git clone https://github.com/noizyfish/NOIZYLAB.git
cd NOIZYLAB

# Install dependencies
npm install

# Create KV namespace
wrangler kv:namespace create EMAIL_KV
wrangler kv:namespace create EMAIL_KV --preview

# Create D1 database
wrangler d1 create noizylab-email-logs

# Run migrations
wrangler d1 migrations apply noizylab-email-logs

# Update wrangler.toml with your namespace/database IDs

# Start development server
npm run dev
```

### Configuration

Update `wrangler.toml` with your Cloudflare resources:

```toml
[[kv_namespaces]]
binding = "EMAIL_KV"
id = "your-kv-namespace-id"

[[d1_databases]]
binding = "EMAIL_DB"
database_name = "noizylab-email-logs"
database_id = "your-d1-database-id"
```

Set secrets for email providers:

```bash
# Optional: Resend API key
wrangler secret put RESEND_API_KEY

# Optional: SendGrid API key
wrangler secret put SENDGRID_API_KEY

# Optional: DKIM configuration
wrangler secret put DKIM_PRIVATE_KEY
wrangler secret put DKIM_DOMAIN
wrangler secret put DKIM_SELECTOR
```

## API Reference

### Send Email

```bash
POST /emails
Content-Type: application/json

{
  "to": "recipient@example.com",
  "subject": "Hello World",
  "html": "<h1>Hello!</h1>",
  "text": "Hello!"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "messageId": "noizy_abc123_xyz789",
    "status": "sent",
    "timestamp": "2025-01-01T00:00:00.000Z"
  },
  "meta": {
    "requestId": "req_abc123",
    "rateLimit": {
      "remaining": 99,
      "limit": 100,
      "resetAt": 1704067200
    }
  }
}
```

### Send with Template

```bash
POST /emails
Content-Type: application/json

{
  "to": "recipient@example.com",
  "subject": "Welcome",
  "templateId": "welcome-email",
  "templateData": {
    "name": "John",
    "company": "Acme Inc"
  }
}
```

### Template Syntax

```html
{{name}}              <!-- Simple variable -->
{{user.name}}         <!-- Nested property -->
{{name|Guest}}        <!-- Default value -->

{{#if premium}}
  <p>Premium feature!</p>
{{/if}}

{{#each items}}
  <li>{{@index}}: {{name}}</li>
{{/each}}
```

### Health Checks

```bash
GET /health          # Simple health check
GET /health/detailed # Component status
GET /health/live     # Liveness probe
GET /health/ready    # Readiness probe
```

---

# Code Management Toolkit

A comprehensive toolkit for managing, backing up, analyzing, and securing your entire codebase across multiple drives and cloud storage.

## Toolkit Features

- **Code Extraction** - Extract and organize code from external drives
- **Backup & Sync** - Incremental backups with rsync, mirror mode, watch mode
- **Permission Repair** - Fix file permissions, ACLs, extended attributes
- **File Integrity** - SHA256/MD5 checksums and verification
- **Duplicate Detection** - Find and clean duplicate files
- **Git Management** - Batch operations across all repositories
- **Code Statistics** - Lines of code, language breakdown, complexity
- **Security Scanning** - Detect secrets, API keys, vulnerabilities
- **Project Analysis** - Smart detection of frameworks and technologies
- **Dependency Scanning** - Find outdated packages and vulnerabilities
- **Cloud Sync** - Sync to S3, Google Drive, Dropbox, Backblaze
- **Automation** - Scheduled tasks via LaunchAgents/cron
- **Notifications** - macOS notifications with sounds
- **Real-time Dashboard** - Monitor system status
- **HTML Reports** - Beautiful visual reports

## Toolkit Quick Start

### One-Command Installation

```bash
cd NOIZYLAB
./scripts/install.sh
```

This will:
1. Create `~/.noizylab` directory structure
2. Set proper permissions on all scripts
3. Create the global `noizylab` command
4. Set up shell completion
5. Install automation agents

### Interactive Menu

```bash
./scripts/menu.sh
# or after installation:
noizylab menu
```

## Toolkit Commands

### Master CLI

```bash
# System health check
noizylab doctor

# Real-time dashboard
noizylab dashboard

# Extract code from external drive
noizylab extract /Volumes/MyDrive

# Backup with sync
noizylab backup sync

# Fix permissions
noizylab permissions /path/to/fix

# Verify file integrity
noizylab integrity verify

# Find duplicates
noizylab duplicates scan

# Git operations
noizylab git list
noizylab git fetch
noizylab git dirty

# Code statistics
noizylab stats

# Security scan
noizylab security scan

# Analyze projects
noizylab analyze

# Scan dependencies
noizylab dependencies

# Cloud sync
noizylab cloud sync

# Generate report
noizylab report
```

### Individual Scripts

| Script | Description |
|--------|-------------|
| `extract-and-move-code.sh` | Extract code from external drives |
| `backup-sync.sh` | Backup and synchronization |
| `repair-permissions.sh` | Fix file permissions |
| `integrity-checker.sh` | File integrity verification |
| `duplicate-cleaner.sh` | Find/remove duplicates |
| `git-manager.sh` | Git repository management |
| `code-stats.sh` | Code statistics |
| `security-scanner.sh` | Security scanning |
| `project-analyzer.sh` | Project type detection |
| `dependency-scanner.sh` | Dependency vulnerability scanning |
| `cloud-sync.sh` | Cloud storage sync |
| `dashboard.sh` | Real-time monitoring |
| `generate-report.sh` | HTML report generation |
| `notify.sh` | macOS notifications |
| `setup-automation.sh` | Scheduled task setup |
| `menu.sh` | Interactive TUI |
| `install.sh` | One-command installer |

### Automation Schedule

When automation is installed, these tasks run automatically:

| Task | Schedule |
|------|----------|
| Daily backup | 2:00 AM |
| Hourly sync | Every hour |
| Weekly integrity check | Sunday 3:00 AM |
| Weekly security scan | Saturday 4:00 AM |
| Weekly git fetch | Monday 6:00 AM |
| Monthly cleanup report | 1st of month 5:00 AM |

### Cloud Sync Support

```bash
# Configure providers
./scripts/cloud-sync.sh config s3
./scripts/cloud-sync.sh config gdrive
./scripts/cloud-sync.sh config dropbox

# Sync
./scripts/cloud-sync.sh sync ~/code
```

Supported: AWS S3, Google Drive, Dropbox, Backblaze B2, any rclone remote

---

## Project Structure

```
NOIZYLAB/
├── src/                      # Email system source
│   ├── index.ts              # Main entry point
│   ├── types/                # TypeScript types & Zod schemas
│   ├── errors/               # Custom error classes
│   ├── utils/                # Utility functions
│   ├── services/             # Business logic
│   │   ├── email-service.ts
│   │   ├── rate-limiter.ts
│   │   ├── template-engine.ts
│   │   └── providers/        # Email providers
│   ├── routes/               # API routes
│   └── middleware/           # Hono middleware
├── tests/                    # Test suites
│   ├── unit/                 # Unit tests
│   └── integration/          # Integration tests
├── scripts/                  # Code management toolkit
│   ├── noizylab             # Master CLI
│   ├── menu.sh              # Interactive TUI
│   ├── install.sh           # Installer
│   ├── extract-*.sh         # Code extraction
│   ├── backup-sync.sh       # Backup & sync
│   ├── repair-permissions.sh # Permission repair
│   ├── integrity-checker.sh # Integrity checks
│   ├── duplicate-cleaner.sh # Duplicate management
│   ├── git-manager.sh       # Git management
│   ├── code-stats.sh        # Statistics
│   ├── security-scanner.sh  # Security scanning
│   ├── project-analyzer.sh  # Project analysis
│   ├── dependency-scanner.sh # Dependency scanning
│   ├── cloud-sync.sh        # Cloud sync
│   ├── dashboard.sh         # Dashboard
│   ├── generate-report.sh   # Report generation
│   ├── notify.sh            # Notifications
│   └── setup-automation.sh  # Automation setup
├── migrations/               # D1 database migrations
├── .github/workflows/        # CI/CD pipelines
├── CODE_MASTER/              # Documentation
├── wrangler.toml             # Cloudflare config
├── vitest.config.ts          # Test config
└── package.json
```

## Development Commands

```bash
# Email system
npm run dev           # Start development server
npm run test          # Run tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint issues
npm run typecheck     # Run TypeScript check
npm run format        # Format code with Prettier
npm run validate      # Run all checks

# Toolkit
./scripts/noizylab doctor    # Health check
./scripts/noizylab dashboard # Monitoring
./scripts/menu.sh            # Interactive menu
```

## Deployment

### Email System

```bash
# Deploy to staging
npm run deploy -- --env staging

# Deploy to production
npm run deploy -- --env production
```

### Toolkit Installation

```bash
./scripts/install.sh           # Install
./scripts/install.sh --uninstall  # Uninstall
```

## Requirements

### Email System
- Node.js 18+
- Cloudflare account
- Wrangler CLI

### Toolkit
- macOS or Linux
- Bash 4.0+
- Python 3.6+ (for some scripts)
- Optional: rsync, rclone, jq, aws-cli

## Error Codes (Email System)

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid request data |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `AUTHENTICATION_ERROR` | Invalid credentials |
| `PROVIDER_ERROR` | Email provider failed |
| `TEMPLATE_NOT_FOUND` | Template doesn't exist |
| `TEMPLATE_RENDER_ERROR` | Template rendering failed |
| `ATTACHMENT_TOO_LARGE` | Attachment exceeds limit |
| `RECIPIENT_BLOCKED` | Email address blocked |
| `IDEMPOTENCY_CONFLICT` | Duplicate request |
| `INTERNAL_ERROR` | Server error |

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for your changes
4. Ensure all tests pass
5. Submit a pull request

## Support

- [GitHub Issues](https://github.com/noizyfish/NOIZYLAB/issues)
