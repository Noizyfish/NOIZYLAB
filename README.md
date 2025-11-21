# NOIZYLAB DNS Configuration Management

Production-grade, enterprise-ready DNS configuration management system with provider adapters, validation, and automated deployment.

## Features

### 🎯 Core Capabilities
- **Type-Safe Configuration** - Full TypeScript support with strict mode and comprehensive type definitions
- **Multiple Record Types** - A, AAAA, CNAME, MX, TXT, NS, SRV, CAA records
- **Multi-Provider Support** - Cloudflare, GoDaddy, Route53 (coming soon)
- **Validation Engine** - Comprehensive DNS rules validation with errors and warnings
- **Normalization** - Automatic config normalization (TTLs, FQDNs, deduplication, sorting)
- **Export Formats** - BIND zone files, human-readable tables, provider-specific JSON
- **Dry-Run Mode** - Test changes before applying
- **Idempotent Operations** - Safe to run multiple times
- **CLI Tool** - Full-featured command-line interface

### 🛡️ Validation Rules
- CNAME exclusivity enforcement
- IPv4/IPv6 address format validation
- MX priority and target validation (0-65535)
- TTL range warnings (<300s or >86400s)
- TXT record length warnings (>255 chars)
- SRV field validation (priority, weight, port)
- CAA record validation (flags, tags, values)
- Zone apex restrictions

## Installation

```bash
npm install
```

## Quick Start

### Basic Configuration

```typescript
import { ZoneConfig } from './infra/dns/types';

const config: ZoneConfig = {
  zone: 'example.com',
  defaultTtl: 3600,
  providerHint: 'cloudflare',
  records: [
    { type: 'A', name: '@', value: '192.0.2.1' },
    { type: 'A', name: 'www', value: '192.0.2.1' },
    { type: 'MX', name: '@', priority: 10, target: 'mail.example.com.' },
    { type: 'TXT', name: '@', value: 'v=spf1 include:_spf.example.com ~all' },
  ],
};
```

### CLI Usage

```bash
# Validate configuration
npm run dns validate

# Show configuration in human-readable format
npm run dns show

# Export to BIND zone file
npm run dns export -o zone.db

# Show differences with live DNS (Cloudflare)
npm run dns diff cloudflare

# Apply configuration (dry-run)
npm run dns apply cloudflare --dry-run

# Apply configuration (for real)
npm run dns apply cloudflare

# Delete records not in configuration
npm run dns apply cloudflare --delete-unmanaged

# Verbose output
npm run dns apply cloudflare --verbose
```

## Provider Setup

### Cloudflare

1. Get your API token from [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Get your Zone ID from the domain overview page
3. Set environment variables:

```bash
export CLOUDFLARE_API_TOKEN=your_token_here
export CLOUDFLARE_ZONE_ID=your_zone_id_here
```

### GoDaddy

1. Generate API keys from [GoDaddy Developer Portal](https://developer.godaddy.com/keys)
2. Set environment variables:

```bash
export GODADDY_API_KEY=your_key_here
export GODADDY_API_SECRET=your_secret_here
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run format
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Lint your code
7. Commit your changes
8. Push to the branch
9. Open a Pull Request

## License

MIT

## Support

For issues and questions:
- GitHub Issues: https://github.com/Noizyfish/NOIZYLAB/issues

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

**NOIZYLAB** - Production-ready DNS configuration management 🚀
