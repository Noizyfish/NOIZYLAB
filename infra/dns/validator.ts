/**
 * DNS configuration validation utilities
 * @module validator
 */

import type { ZoneConfig, DnsRecord, ValidationLevel } from './types.js';
import {
  isARecord,
  isAAAARecord,
  isCNAMERecord,
  isMXRecord,
  isTXTRecord,
  isNSRecord,
  isSRVRecord,
  isCAARecord,
} from './types.js';

/**
 * Validation error or warning
 */
export interface ValidationError {
  /** Severity level */
  level: ValidationLevel;
  /** Error message */
  message: string;
  /** Record that caused the error (if applicable) */
  record?: DnsRecord;
  /** Field that caused the error */
  field?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether configuration is valid (no errors) */
  valid: boolean;
  /** Array of errors */
  errors: ValidationError[];
  /** Array of warnings */
  warnings: ValidationError[];
}

/**
 * Validate a zone configuration
 * 
 * Checks for:
 * - CNAME exclusivity (no other records at same name)
 * - MX validation (priority range, valid target)
 * - A records (valid IPv4)
 * - AAAA records (valid IPv6)
 * - TXT records (not empty, warn if >255 chars)
 * - SRV records (valid priority/weight/port, valid target)
 * - NS records (valid nameserver)
 * - CAA records (valid flags, tags, value)
 * - TTL validation (warn if <300 or >86400)
 * - Zone apex validation (CNAME not allowed at @)
 * 
 * @param config - Zone configuration to validate
 * @returns Validation result with errors and warnings
 * 
 * @example
 * ```typescript
 * const result = validateZoneConfig(config);
 * if (!result.valid) {
 *   result.errors.forEach(err => console.error(err.message));
 * }
 * result.warnings.forEach(warn => console.warn(warn.message));
 * ```
 */
export function validateZoneConfig(config: ZoneConfig): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Group records by name for CNAME exclusivity check
  const recordsByName = new Map<string, DnsRecord[]>();
  for (const record of config.records) {
    const records = recordsByName.get(record.name) || [];
    records.push(record);
    recordsByName.set(record.name, records);
  }

  // Validate each record
  for (const record of config.records) {
    validateRecord(record, recordsByName.get(record.name) || [], errors, warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a single DNS record
 * @param record - Record to validate
 * @param recordsAtSameName - All records with the same name
 * @param errors - Array to collect errors
 * @param warnings - Array to collect warnings
 */
function validateRecord(
  record: DnsRecord,
  recordsAtSameName: DnsRecord[],
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Validate TTL
  if (record.ttl !== undefined) {
    if (record.ttl < 0) {
      errors.push({
        level: 'error',
        message: `TTL must be non-negative (got ${record.ttl})`,
        record,
        field: 'ttl',
      });
    } else if (record.ttl < 300) {
      warnings.push({
        level: 'warning',
        message: `TTL is very low (${record.ttl}s, recommended minimum 300s)`,
        record,
        field: 'ttl',
      });
    } else if (record.ttl > 86400) {
      warnings.push({
        level: 'warning',
        message: `TTL is very high (${record.ttl}s, recommended maximum 86400s)`,
        record,
        field: 'ttl',
      });
    }
  }

  // Type-specific validation
  if (isARecord(record)) {
    validateARecord(record, errors);
  } else if (isAAAARecord(record)) {
    validateAAAARecord(record, errors);
  } else if (isCNAMERecord(record)) {
    validateCNAMERecord(record, recordsAtSameName, errors);
  } else if (isMXRecord(record)) {
    validateMXRecord(record, errors);
  } else if (isTXTRecord(record)) {
    validateTXTRecord(record, warnings);
  } else if (isNSRecord(record)) {
    validateNSRecord(record, errors);
  } else if (isSRVRecord(record)) {
    validateSRVRecord(record, errors);
  } else if (isCAARecord(record)) {
    validateCAARecord(record, errors);
  }
}

/**
 * Validate A record
 */
function validateARecord(record: ARecord, errors: ValidationError[]): void {
  if (!isValidIPv4(record.value)) {
    errors.push({
      level: 'error',
      message: `Invalid IPv4 address: ${record.value}`,
      record,
      field: 'value',
    });
  }
}

/**
 * Validate AAAA record
 */
function validateAAAARecord(record: AAAARecord, errors: ValidationError[]): void {
  if (!isValidIPv6(record.value)) {
    errors.push({
      level: 'error',
      message: `Invalid IPv6 address: ${record.value}`,
      record,
      field: 'value',
    });
  }
}

/**
 * Validate CNAME record
 */
function validateCNAMERecord(
  record: CNAMERecord,
  recordsAtSameName: DnsRecord[],
  errors: ValidationError[]
): void {
  // CNAME cannot be at zone apex
  if (record.name === '@') {
    errors.push({
      level: 'error',
      message: 'CNAME records are not allowed at zone apex (@)',
      record,
      field: 'name',
    });
  }

  // CNAME exclusivity: no other records at same name
  if (recordsAtSameName.length > 1) {
    errors.push({
      level: 'error',
      message: `CNAME record at '${record.name}' conflicts with other records at the same name`,
      record,
    });
  }

  // Validate target
  if (!record.target || record.target.trim() === '') {
    errors.push({
      level: 'error',
      message: 'CNAME target cannot be empty',
      record,
      field: 'target',
    });
  } else if (!isValidHostname(record.target)) {
    errors.push({
      level: 'error',
      message: `Invalid CNAME target: ${record.target}`,
      record,
      field: 'target',
    });
  }
}

/**
 * Validate MX record
 */
function validateMXRecord(record: MXRecord, errors: ValidationError[]): void {
  // Validate priority
  if (record.priority < 0 || record.priority > 65535) {
    errors.push({
      level: 'error',
      message: `MX priority must be between 0 and 65535 (got ${record.priority})`,
      record,
      field: 'priority',
    });
  }

  // Validate target
  if (!record.target || record.target.trim() === '') {
    errors.push({
      level: 'error',
      message: 'MX target cannot be empty',
      record,
      field: 'target',
    });
  } else if (!isValidHostname(record.target)) {
    errors.push({
      level: 'error',
      message: `Invalid MX target: ${record.target}`,
      record,
      field: 'target',
    });
  }
}

/**
 * Validate TXT record
 */
function validateTXTRecord(record: TXTRecord, warnings: ValidationError[]): void {
  if (!record.value || record.value.trim() === '') {
    warnings.push({
      level: 'warning',
      message: 'TXT record value is empty',
      record,
      field: 'value',
    });
  } else if (record.value.length > 255) {
    warnings.push({
      level: 'warning',
      message: `TXT record value is longer than 255 characters (${record.value.length}), may need chunking`,
      record,
      field: 'value',
    });
  }
}

/**
 * Validate NS record
 */
function validateNSRecord(record: NSRecord, errors: ValidationError[]): void {
  if (!record.target || record.target.trim() === '') {
    errors.push({
      level: 'error',
      message: 'NS target cannot be empty',
      record,
      field: 'target',
    });
  } else if (!isValidHostname(record.target)) {
    errors.push({
      level: 'error',
      message: `Invalid NS target: ${record.target}`,
      record,
      field: 'target',
    });
  }
}

/**
 * Validate SRV record
 */
function validateSRVRecord(record: SRVRecord, errors: ValidationError[]): void {
  // Validate priority
  if (record.priority < 0 || record.priority > 65535) {
    errors.push({
      level: 'error',
      message: `SRV priority must be between 0 and 65535 (got ${record.priority})`,
      record,
      field: 'priority',
    });
  }

  // Validate weight
  if (record.weight < 0 || record.weight > 65535) {
    errors.push({
      level: 'error',
      message: `SRV weight must be between 0 and 65535 (got ${record.weight})`,
      record,
      field: 'weight',
    });
  }

  // Validate port
  if (record.port < 0 || record.port > 65535) {
    errors.push({
      level: 'error',
      message: `SRV port must be between 0 and 65535 (got ${record.port})`,
      record,
      field: 'port',
    });
  }

  // Validate target
  if (!record.target || record.target.trim() === '') {
    errors.push({
      level: 'error',
      message: 'SRV target cannot be empty',
      record,
      field: 'target',
    });
  } else if (!isValidHostname(record.target)) {
    errors.push({
      level: 'error',
      message: `Invalid SRV target: ${record.target}`,
      record,
      field: 'target',
    });
  }
}

/**
 * Validate CAA record
 */
function validateCAARecord(record: CAARecord, errors: ValidationError[]): void {
  // Validate flags
  if (record.flags !== 0 && record.flags !== 128) {
    errors.push({
      level: 'error',
      message: `CAA flags must be 0 or 128 (got ${record.flags})`,
      record,
      field: 'flags',
    });
  }

  // Tag is validated by TypeScript (union type)
  // Validate value
  if (!record.value || record.value.trim() === '') {
    errors.push({
      level: 'error',
      message: 'CAA value cannot be empty',
      record,
      field: 'value',
    });
  }
}

/**
 * Check if a string is a valid IPv4 address
 * @param value - String to check
 * @returns True if valid IPv4
 */
function isValidIPv4(value: string): boolean {
  const parts = value.split('.');
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255 && num.toString() === part;
  });
}

/**
 * Check if a string is a valid IPv6 address
 * @param value - String to check
 * @returns True if valid IPv6
 */
function isValidIPv6(value: string): boolean {
  // Basic IPv6 validation (simplified)
  const ipv6Regex =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
  return ipv6Regex.test(value);
}

/**
 * Check if a string is a valid hostname/FQDN
 * @param value - String to check
 * @returns True if valid hostname
 */
function isValidHostname(value: string): boolean {
  if (!value || value.trim() === '') return false;

  // Remove trailing dot for validation
  const hostname = value.endsWith('.') ? value.slice(0, -1) : value;

  // Basic hostname validation
  const hostnameRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  return hostnameRegex.test(hostname);
}
