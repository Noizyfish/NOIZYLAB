/**
 * DNS configuration normalization utilities
 * @module normalizer
 */

import type { ZoneConfig, DnsRecord } from './types.js';
import {
  isCNAMERecord,
  isMXRecord,
  isNSRecord,
  isSRVRecord,
  isCAARecord,
} from './types.js';

/**
 * Options for zone configuration normalization
 */
export interface NormalizerOptions {
  /** Default TTL to apply to records without explicit TTL */
  defaultTtl?: number;
  /** Whether to ensure FQDNs have trailing dots */
  ensureTrailingDots?: boolean;
  /** Whether to lowercase hostnames */
  lowercaseHostnames?: boolean;
  /** Whether to remove duplicate records */
  removeDuplicates?: boolean;
  /** Whether to sort records */
  sortRecords?: boolean;
}

/**
 * Default normalizer options
 */
const DEFAULT_OPTIONS: Required<NormalizerOptions> = {
  defaultTtl: 3600,
  ensureTrailingDots: true,
  lowercaseHostnames: true,
  removeDuplicates: true,
  sortRecords: true,
};

/**
 * Normalize a zone configuration
 * 
 * Performs the following operations:
 * - Trims all string fields
 * - Converts empty names to "@"
 * - Applies default TTL
 * - Ensures FQDN formatting (trailing dots)
 * - Lowercases hostnames
 * - Removes duplicate records
 * - Sorts records by type then name
 * 
 * @param config - Zone configuration to normalize
 * @param options - Normalization options
 * @returns Normalized zone configuration
 * 
 * @example
 * ```typescript
 * const config = {
 *   zone: 'example.com',
 *   records: [
 *     { type: 'A', name: '', value: '192.0.2.1' },
 *     { type: 'A', name: 'www', value: '192.0.2.2', ttl: 7200 }
 *   ]
 * };
 * 
 * const normalized = normalizeZoneConfig(config);
 * // Result:
 * // {
 * //   zone: 'example.com',
 * //   records: [
 * //     { type: 'A', name: '@', value: '192.0.2.1', ttl: 3600 },
 * //     { type: 'A', name: 'www', value: '192.0.2.2', ttl: 7200 }
 * //   ]
 * // }
 * ```
 */
export function normalizeZoneConfig(
  config: ZoneConfig,
  options: NormalizerOptions = {}
): ZoneConfig {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const defaultTtl = config.defaultTtl ?? opts.defaultTtl;

  // Normalize zone name
  let zone = config.zone.trim();
  if (opts.lowercaseHostnames) {
    zone = zone.toLowerCase();
  }

  // Normalize records
  let records = config.records.map((record) => normalizeRecord(record, zone, defaultTtl, opts));

  // Remove duplicates
  if (opts.removeDuplicates) {
    records = removeDuplicateRecords(records);
  }

  // Sort records
  if (opts.sortRecords) {
    records = sortRecords(records);
  }

  return {
    ...config,
    zone,
    defaultTtl,
    records,
  };
}

/**
 * Normalize a single DNS record
 * @param record - Record to normalize
 * @param zone - Zone name
 * @param defaultTtl - Default TTL value
 * @param options - Normalization options
 * @returns Normalized record
 */
function normalizeRecord(
  record: DnsRecord,
  zone: string,
  defaultTtl: number,
  options: Required<NormalizerOptions>
): DnsRecord {
  // Normalize base properties
  let name = record.name.trim();
  if (name === '' || name === zone) {
    name = '@';
  }
  if (options.lowercaseHostnames && name !== '@') {
    name = name.toLowerCase();
  }

  const ttl = record.ttl ?? defaultTtl;
  const comment = record.comment?.trim();

  // Create base normalized record
  const baseRecord = {
    ...record,
    name,
    ttl,
    ...(comment ? { comment } : {}),
  };

  // Normalize type-specific fields
  if (isCNAMERecord(record)) {
    return {
      ...baseRecord,
      target: normalizeHostname(record.target, options),
    };
  } else if (isMXRecord(record)) {
    return {
      ...baseRecord,
      target: normalizeHostname(record.target, options),
    };
  } else if (isNSRecord(record)) {
    return {
      ...baseRecord,
      target: normalizeHostname(record.target, options),
    };
  } else if (isSRVRecord(record)) {
    return {
      ...baseRecord,
      target: normalizeHostname(record.target, options),
    };
  } else if (isCAARecord(record)) {
    return {
      ...baseRecord,
      value: record.value.trim(),
    };
  } else {
    // A, AAAA, TXT records
    return {
      ...baseRecord,
      value: record.value.trim(),
    };
  }
}

/**
 * Normalize a hostname (add trailing dot if needed, lowercase)
 * @param hostname - Hostname to normalize
 * @param options - Normalization options
 * @returns Normalized hostname
 */
function normalizeHostname(
  hostname: string,
  options: Required<NormalizerOptions>
): string {
  let normalized = hostname.trim();

  if (options.lowercaseHostnames) {
    normalized = normalized.toLowerCase();
  }

  if (options.ensureTrailingDots && !normalized.endsWith('.')) {
    normalized += '.';
  }

  return normalized;
}

/**
 * Remove duplicate records from array
 * @param records - Records to deduplicate
 * @returns Array without duplicates
 */
function removeDuplicateRecords(records: DnsRecord[]): DnsRecord[] {
  const seen = new Set<string>();
  return records.filter((record) => {
    const key = recordKey(record);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Generate a unique key for a record
 * @param record - DNS record
 * @returns Unique key string
 */
function recordKey(record: DnsRecord): string {
  const base = `${record.type}:${record.name}`;

  if (isCNAMERecord(record)) {
    return `${base}:${record.target}`;
  } else if (isMXRecord(record)) {
    return `${base}:${record.priority}:${record.target}`;
  } else if (isNSRecord(record)) {
    return `${base}:${record.target}`;
  } else if (isSRVRecord(record)) {
    return `${base}:${record.priority}:${record.weight}:${record.port}:${record.target}`;
  } else if (isCAARecord(record)) {
    return `${base}:${record.flags}:${record.tag}:${record.value}`;
  } else {
    return `${base}:${record.value}`;
  }
}

/**
 * Sort records by type then name
 * @param records - Records to sort
 * @returns Sorted array
 */
function sortRecords(records: DnsRecord[]): DnsRecord[] {
  const typeOrder = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA'];

  return [...records].sort((a, b) => {
    // First sort by type
    const typeComparison =
      typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
    if (typeComparison !== 0) {
      return typeComparison;
    }

    // Then sort by name
    const nameComparison = a.name.localeCompare(b.name);
    if (nameComparison !== 0) {
      return nameComparison;
    }

    // For MX records, sort by priority
    if (isMXRecord(a) && isMXRecord(b)) {
      return a.priority - b.priority;
    }

    // For SRV records, sort by priority then weight
    if (isSRVRecord(a) && isSRVRecord(b)) {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.weight - b.weight;
    }

    return 0;
  });
}
