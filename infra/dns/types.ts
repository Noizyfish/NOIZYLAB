/**
 * Type definitions for DNS records and zone configuration
 * @module types
 */

/**
 * Provider hint for DNS provider selection
 */
export type ProviderHint = 'cloudflare' | 'godaddy' | 'route53' | 'other';

/**
 * Validation level for validation errors
 */
export type ValidationLevel = 'error' | 'warning' | 'info';

/**
 * Base DNS record properties
 */
export interface BaseDnsRecord {
  /** Record name (e.g., '@', 'www', 'mail.example.com') */
  name: string;
  /** Time to live in seconds */
  ttl?: number;
  /** Optional comment for documentation */
  comment?: string;
}

/**
 * A record - IPv4 address
 */
export interface ARecord extends BaseDnsRecord {
  type: 'A';
  /** IPv4 address (e.g., '192.0.2.1') */
  value: string;
}

/**
 * AAAA record - IPv6 address
 */
export interface AAAARecord extends BaseDnsRecord {
  type: 'AAAA';
  /** IPv6 address (e.g., '2001:0db8::1') */
  value: string;
}

/**
 * CNAME record - Canonical name
 */
export interface CNAMERecord extends BaseDnsRecord {
  type: 'CNAME';
  /** Target hostname (e.g., 'example.com.') */
  target: string;
}

/**
 * MX record - Mail exchange
 */
export interface MXRecord extends BaseDnsRecord {
  type: 'MX';
  /** Priority (0-65535, lower is higher priority) */
  priority: number;
  /** Mail server hostname (e.g., 'mail.example.com.') */
  target: string;
}

/**
 * TXT record - Text data
 */
export interface TXTRecord extends BaseDnsRecord {
  type: 'TXT';
  /** Text value (arbitrary string) */
  value: string;
}

/**
 * NS record - Name server
 */
export interface NSRecord extends BaseDnsRecord {
  type: 'NS';
  /** Nameserver hostname (e.g., 'ns1.example.com.') */
  target: string;
}

/**
 * SRV record - Service locator
 */
export interface SRVRecord extends BaseDnsRecord {
  type: 'SRV';
  /** Priority (0-65535) */
  priority: number;
  /** Weight (0-65535) */
  weight: number;
  /** Port number (0-65535) */
  port: number;
  /** Target hostname (e.g., 'server.example.com.') */
  target: string;
}

/**
 * CAA record - Certification Authority Authorization
 */
export interface CAARecord extends BaseDnsRecord {
  type: 'CAA';
  /** Flags (typically 0 or 128 for critical) */
  flags: number;
  /** Tag type ('issue', 'issuewild', or 'iodef') */
  tag: 'issue' | 'issuewild' | 'iodef';
  /** Value (CA domain or URL for iodef) */
  value: string;
}

/**
 * Discriminated union of all DNS record types
 */
export type DnsRecord =
  | ARecord
  | AAAARecord
  | CNAMERecord
  | MXRecord
  | TXTRecord
  | NSRecord
  | SRVRecord
  | CAARecord;

/**
 * Zone configuration
 */
export interface ZoneConfig {
  /** Zone/domain name (e.g., 'example.com') */
  zone: string;
  /** Default TTL for records without explicit TTL */
  defaultTtl?: number;
  /** DNS records */
  records: DnsRecord[];
  /** Provider hint for automation */
  providerHint?: ProviderHint;
  /** Optional metadata */
  metadata?: {
    description?: string;
    lastUpdated?: string;
    [key: string]: unknown;
  };
}

/**
 * Type guard for A record
 * @param record - DNS record to check
 * @returns True if record is an A record
 */
export function isARecord(record: DnsRecord): record is ARecord {
  return record.type === 'A';
}

/**
 * Type guard for AAAA record
 * @param record - DNS record to check
 * @returns True if record is an AAAA record
 */
export function isAAAARecord(record: DnsRecord): record is AAAARecord {
  return record.type === 'AAAA';
}

/**
 * Type guard for CNAME record
 * @param record - DNS record to check
 * @returns True if record is a CNAME record
 */
export function isCNAMERecord(record: DnsRecord): record is CNAMERecord {
  return record.type === 'CNAME';
}

/**
 * Type guard for MX record
 * @param record - DNS record to check
 * @returns True if record is an MX record
 */
export function isMXRecord(record: DnsRecord): record is MXRecord {
  return record.type === 'MX';
}

/**
 * Type guard for TXT record
 * @param record - DNS record to check
 * @returns True if record is a TXT record
 */
export function isTXTRecord(record: DnsRecord): record is TXTRecord {
  return record.type === 'TXT';
}

/**
 * Type guard for NS record
 * @param record - DNS record to check
 * @returns True if record is an NS record
 */
export function isNSRecord(record: DnsRecord): record is NSRecord {
  return record.type === 'NS';
}

/**
 * Type guard for SRV record
 * @param record - DNS record to check
 * @returns True if record is an SRV record
 */
export function isSRVRecord(record: DnsRecord): record is SRVRecord {
  return record.type === 'SRV';
}

/**
 * Type guard for CAA record
 * @param record - DNS record to check
 * @returns True if record is a CAA record
 */
export function isCAARecord(record: DnsRecord): record is CAARecord {
  return record.type === 'CAA';
}
