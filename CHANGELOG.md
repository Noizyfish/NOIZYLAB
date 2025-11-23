# Changelog

All notable changes to the NOIZYLAB DNS Configuration Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-21

### Added

#### Core DNS Engine
- Complete TypeScript type definitions for all DNS record types (A, AAAA, CNAME, MX, TXT, NS, SRV, CAA)
- Discriminated union types with type guards for type-safe record handling
- Provider hint system supporting Cloudflare, GoDaddy, Route53, and generic providers
- Configuration normalization with options for:
  - Default TTL application
  - FQDN formatting (trailing dots)
  - Hostname lowercasing
  - Duplicate record removal
  - Record sorting by type and name
- Comprehensive validation engine with error and warning levels:
  - CNAME exclusivity enforcement (no other records at same name)
  - MX record validation (priority 0-65535, valid FQDN targets)
  - A/AAAA record IP address format validation
  - TXT record length warnings (>255 chars requires chunking)
  - SRV record field validation (priority/weight/port ranges, valid targets)
  - NS record nameserver validation
  - CAA record flags, tags, and value validation
  - TTL range warnings (<300s or >86400s)
  - Zone apex restrictions (CNAME not allowed at @)
- Serialization utilities:
  - RFC-compliant BIND zone file export
  - Human-readable table format output
  - Provider-specific JSON payloads (Cloudflare, GoDaddy)

#### Provider Adapters
- **Cloudflare Provider**
  - Full API v4 client implementation
  - Authentication with API tokens
  - Idempotent configuration application
  - Automatic create/update/delete operations
  - Rate limiting and retry logic
  - Dry-run support
- **GoDaddy Provider**
  - API v1 client implementation
  - Batch update operations per record type
  - Same interface as Cloudflare for consistency
  - Dry-run support
- Base provider interface for extensibility
- Provider factory function for easy instantiation

#### CLI Tool
- `validate` command - Validate DNS configuration with detailed error/warning reporting
- `show` command - Display configuration in human-readable table format
- `export` command - Export to RFC-compliant BIND zone file format
- `diff <provider>` command - Show differences between local config and live DNS
- `apply <provider>` command - Apply configuration to DNS provider
  - `--dry-run` flag for safe testing
  - `--delete-unmanaged` flag for cleanup
  - `--verbose` flag for detailed output
- Colorized output using chalk
- Progress indicators using ora
- File-based configuration loading

#### Testing
- Comprehensive test suite with 61 tests
- Normalizer tests (11 tests)
- Validator tests (21 tests)
- Provider tests (29 tests)
- Test coverage with Vitest
- Mock HTTP client for provider testing

#### CI/CD
- GitHub Actions workflow for continuous integration
- Automated linting, building, and testing
- Code coverage reporting with Codecov integration

#### Documentation
- Complete README with:
  - Features overview
  - Installation instructions
  - Quick start examples
  - API reference
  - Provider setup guides
  - CLI usage examples
  - Contributing guidelines
- Inline JSDoc comments for all public APIs
- Type definitions for excellent IDE support

### Technical Details
- TypeScript strict mode enabled
- Node.js 18+ support (LTS)
- Zero runtime errors with comprehensive type checking
- Backward compatible baseline configuration
- Idempotent operations safe to run multiple times
- 100% testable with unit test coverage

### Initial Configuration
- noizylab.com zone configuration with:
  - SPF records for Google Workspace
  - Google site verification
  - WWW CNAME
  - MX records for Google mail servers

[1.0.0]: https://github.com/Noizyfish/NOIZYLAB/releases/tag/v1.0.0
