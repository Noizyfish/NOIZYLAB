/**
 * DNS configuration serialization utilities
 * @module serializers
 */

import type { ZoneConfig, DnsRecord, ProviderHint } from './types.js';
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
 * Convert zone configuration to RFC-compliant BIND zone file format
 * 
 * @param config - Zone configuration
 * @returns Zone file content as string
 * 
 * @example
 * ```typescript
 * const zoneFile = toZoneFile(config);
 * fs.writeFileSync('zone.db', zoneFile);
 * ```
 */
export function toZoneFile(config: ZoneConfig): string {
  const lines: string[] = [];

  // SOA header
  const serial = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  lines.push(`;; Zone file for ${config.zone}`);
  lines.push(`;; Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`$ORIGIN ${config.zone}.`);
  lines.push(`$TTL ${config.defaultTtl || 3600}`);
  lines.push('');
  lines.push(`@ IN SOA ns1.${config.zone}. admin.${config.zone}. (`);
  lines.push(`    ${serial} ; serial`);
  lines.push(`    7200       ; refresh (2 hours)`);
  lines.push(`    3600       ; retry (1 hour)`);
  lines.push(`    1209600    ; expire (2 weeks)`);
  lines.push(`    86400      ; minimum (1 day)`);
  lines.push(`)');
  lines.push('');

  // Records
  for (const record of config.records) {
    const recordLines = recordToZoneFileLines(record, config.defaultTtl || 3600);
    lines.push(...recordLines);
  }

  return lines.join('\n') + '\n';
}

/**
 * Convert a single record to zone file lines
 */
function recordToZoneFileLines(record: DnsRecord, defaultTtl: number): string[] {
  const ttl = record.ttl ?? defaultTtl;
  const name = record.name === '@' ? '@' : record.name;
  const comment = record.comment ? ` ; ${record.comment}` : '';

  if (isARecord(record)) {
    return [`${name.padEnd(20)} ${ttl.toString().padEnd(8)} IN A     ${record.value}${comment}`];
  } else if (isAAAARecord(record)) {
    return [`${name.padEnd(20)} ${ttl.toString().padEnd(8)} IN AAAA  ${record.value}${comment}`];
  } else if (isCNAMERecord(record)) {
    return [`${name.padEnd(20)} ${ttl.toString().padEnd(8)} IN CNAME ${record.target}${comment}`];
  } else if (isMXRecord(record)) {
    return [
      `${name.padEnd(20)} ${ttl.toString().padEnd(8)} IN MX    ${record.priority} ${record.target}${comment}`,
    ];
  } else if (isTXTRecord(record)) {
    const txtValue = escapeTxtValue(record.value);
    return [`${name.padEnd(20)} ${ttl.toString().padEnd(8)} IN TXT   ${txtValue}${comment}`];
  } else if (isNSRecord(record)) {
    return [`${name.padEnd(20)} ${ttl.toString().padEnd(8)} IN NS    ${record.target}${comment}`];
  } else if (isSRVRecord(record)) {
    return [
      `${name.padEnd(20)} ${ttl.toString().padEnd(8)} IN SRV   ${record.priority} ${record.weight} ${record.port} ${record.target}${comment}`,
    ];
  } else if (isCAARecord(record)) {
    return [
      `${name.padEnd(20)} ${ttl.toString().padEnd(8)} IN CAA   ${record.flags} ${record.tag} "${record.value}"${comment}`,
    ];
  }

  return [];
}

/**
 * Escape TXT record value for zone file
 * Handles quotes, special characters, and splits long values
 */
function escapeTxtValue(value: string): string {
  // If value is longer than 255 chars, split into multiple strings
  if (value.length > 255) {
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += 255) {
      chunks.push(value.substring(i, i + 255));
    }
    return chunks.map((chunk) => `"${escapeString(chunk)}"`).join(' ');
  }

  return `"${escapeString(value)}"`;
}

/**
 * Escape special characters in strings
 */
function escapeString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Convert zone configuration to human-readable table format with colors
 * 
 * @param config - Zone configuration
 * @returns Formatted string
 * 
 * @example
 * ```typescript
 * const output = toHumanReadable(config);
 * console.log(output);
 * ```
 */
export function toHumanReadable(config: ZoneConfig): string {
  const lines: string[] = [];

  lines.push(`\n╔════════════════════════════════════════════════════════════════╗`);
  lines.push(`║  DNS Configuration: ${config.zone.padEnd(43)}║`);
  lines.push(`╠════════════════════════════════════════════════════════════════╣`);
  lines.push(`║  Default TTL: ${(config.defaultTtl || 3600).toString().padEnd(48)}║`);
  lines.push(`║  Records: ${config.records.length.toString().padEnd(52)}║`);
  if (config.providerHint) {
    lines.push(`║  Provider: ${config.providerHint.padEnd(51)}║`);
  }
  lines.push(`╚════════════════════════════════════════════════════════════════╝\n`);

  // Table header
  lines.push('┌──────────┬─────────────────┬─────┬────────────────────────────────────────┐');
  lines.push('│ Type     │ Name            │ TTL │ Value                                  │');
  lines.push('├──────────┼─────────────────┼─────┼────────────────────────────────────────┤');

  // Records
  for (const record of config.records) {
    const type = record.type.padEnd(8);
    const name = record.name.substring(0, 15).padEnd(15);
    const ttl = (record.ttl || config.defaultTtl || 3600).toString().padEnd(4);
    const value = formatRecordValue(record).substring(0, 38).padEnd(38);

    lines.push(`│ ${type} │ ${name} │ ${ttl} │ ${value} │`);
  }

  lines.push('└──────────┴─────────────────┴─────┴────────────────────────────────────────┘');

  return lines.join('\n');
}

/**
 * Format record value for human-readable display
 */
function formatRecordValue(record: DnsRecord): string {
  if (isARecord(record) || isAAAARecord(record) || isTXTRecord(record)) {
    return record.value;
  } else if (isCNAMERecord(record) || isNSRecord(record)) {
    return record.target;
  } else if (isMXRecord(record)) {
    return `${record.priority} ${record.target}`;
  } else if (isSRVRecord(record)) {
    return `${record.priority} ${record.weight} ${record.port} ${record.target}`;
  } else if (isCAARecord(record)) {
    return `${record.flags} ${record.tag} "${record.value}"`;
  }
  return '';
}

/**
 * Provider-specific payload formats
 */
interface CloudflareRecord {
  type: string;
  name: string;
  content: string;
  ttl: number;
  priority?: number;
}

interface GoDaddyRecord {
  type: string;
  name: string;
  data: string;
  ttl: number;
  priority?: number;
  weight?: number;
  port?: number;
}

/**
 * Convert zone configuration to provider-specific JSON payload
 * 
 * @param config - Zone configuration
 * @param provider - Provider name
 * @returns Provider-specific payload
 * 
 * @example
 * ```typescript
 * const payload = toProviderPayload(config, 'cloudflare');
 * // Upload to Cloudflare API
 * ```
 */
export function toProviderPayload(
  config: ZoneConfig,
  provider: ProviderHint
): CloudflareRecord[] | GoDaddyRecord[] | DnsRecord[] {
  if (provider === 'cloudflare') {
    return toCloudflarePayload(config);
  } else if (provider === 'godaddy') {
    return toGoDaddyPayload(config);
  } else {
    // Generic format (just return records as-is)
    return config.records;
  }
}

/**
 * Convert to Cloudflare format
 */
function toCloudflarePayload(config: ZoneConfig): CloudflareRecord[] {
  return config.records.map((record) => {
    const base = {
      type: record.type,
      name: record.name === '@' ? config.zone : `${record.name}.${config.zone}`,
      ttl: record.ttl || config.defaultTtl || 3600,
    };

    if (isARecord(record) || isAAAARecord(record) || isTXTRecord(record)) {
      return { ...base, content: record.value };
    } else if (isCNAMERecord(record) || isNSRecord(record)) {
      return { ...base, content: record.target };
    } else if (isMXRecord(record)) {
      return { ...base, content: record.target, priority: record.priority };
    } else if (isSRVRecord(record)) {
      return {
        ...base,
        content: `${record.priority} ${record.weight} ${record.port} ${record.target}`,
      };
    } else if (isCAARecord(record)) {
      return { ...base, content: `${record.flags} ${record.tag} "${record.value}"` };
    }

    return { ...base, content: '' };
  });
}

/**
 * Convert to GoDaddy format
 */
function toGoDaddyPayload(config: ZoneConfig): GoDaddyRecord[] {
  return config.records.map((record) => {
    const base = {
      type: record.type,
      name: record.name === '@' ? '@' : record.name,
      ttl: record.ttl || config.defaultTtl || 3600,
    };

    if (isARecord(record) || isAAAARecord(record) || isTXTRecord(record)) {
      return { ...base, data: record.value };
    } else if (isCNAMERecord(record) || isNSRecord(record)) {
      return { ...base, data: record.target };
    } else if (isMXRecord(record)) {
      return { ...base, data: record.target, priority: record.priority };
    } else if (isSRVRecord(record)) {
      return {
        ...base,
        data: record.target,
        priority: record.priority,
        weight: record.weight,
        port: record.port,
      };
    } else if (isCAARecord(record)) {
      return { ...base, data: `${record.flags} ${record.tag} "${record.value}"` };
    }

    return { ...base, data: '' };
  });
}
