/**
 * NOIZYLAB DNS Zone Configuration
 * @module noizylab.dns
 */

import type { ZoneConfig } from './types.js';

/**
 * NOIZYLAB zone configuration
 * This is the baseline DNS configuration for noizylab.com
 * 
 * @example
 * ```typescript
 * import { noizylabZoneConfig } from './noizylab.dns.js';
 * import { validateZoneConfig } from './validator.js';
 * 
 * const result = validateZoneConfig(noizylabZoneConfig);
 * if (result.valid) {
 *   console.log('Configuration is valid!');
 * }
 * ```
 */
export const noizylabZoneConfig: ZoneConfig = {
  zone: 'noizylab.com',
  defaultTtl: 3600,
  providerHint: 'cloudflare',
  metadata: {
    description: 'NOIZYLAB DNS Configuration',
    lastUpdated: new Date().toISOString(),
  },
  records: [
    // TXT records - SPF, verification, etc.
    {
      type: 'TXT',
      name: '@',
      value: 'v=spf1 include:_spf.google.com ~all',
      comment: 'SPF record for Google Workspace',
    },
    {
      type: 'TXT',
      name: '@',
      value: 'google-site-verification=example123',
      comment: 'Google site verification',
    },

    // CNAME records
    {
      type: 'CNAME',
      name: 'www',
      target: 'noizylab.com.',
      comment: 'WWW subdomain',
    },

    // MX records - Mail exchange
    {
      type: 'MX',
      name: '@',
      priority: 1,
      target: 'aspmx.l.google.com.',
      comment: 'Primary mail server',
    },
    {
      type: 'MX',
      name: '@',
      priority: 5,
      target: 'alt1.aspmx.l.google.com.',
      comment: 'Secondary mail server',
    },
    {
      type: 'MX',
      name: '@',
      priority: 5,
      target: 'alt2.aspmx.l.google.com.',
      comment: 'Tertiary mail server',
    },
  ],
};

// Re-export types and utilities for convenience
export type {
  ZoneConfig,
  DnsRecord,
  ARecord,
  AAAARecord,
  CNAMERecord,
  MXRecord,
  TXTRecord,
  NSRecord,
  SRVRecord,
  CAARecord,
  ProviderHint,
  ValidationLevel,
} from './types.js';

export {
  isARecord,
  isAAAARecord,
  isCNAMERecord,
  isMXRecord,
  isTXTRecord,
  isNSRecord,
  isSRVRecord,
  isCAARecord,
} from './types.js';
