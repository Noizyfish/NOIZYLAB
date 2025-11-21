/**
 * Cloudflare DNS provider implementation
 * @module providers/cloudflare
 */

import type { DnsRecord, ZoneConfig } from '../types.js';
import type { DnsProvider, ApplyOptions, ApplyResult, DryRunResult } from './base.js';
import {
  isARecord,
  isAAAARecord,
  isCNAMERecord,
  isMXRecord,
  isTXTRecord,
  isNSRecord,
  isSRVRecord,
  isCAARecord,
} from '../types.js';

/**
 * Cloudflare API record format
 */
interface CloudflareRecord {
  id?: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  priority?: number;
  proxied?: boolean;
}

/**
 * Cloudflare DNS provider
 * 
 * Environment variables:
 * - CLOUDFLARE_API_TOKEN: API token with DNS edit permissions
 * - CLOUDFLARE_ZONE_ID: Zone ID for the domain
 * 
 * @example
 * ```typescript
 * const provider = new CloudflareProvider();
 * await provider.authenticate();
 * const result = await provider.applyConfig(config, { dryRun: true });
 * ```
 */
export class CloudflareProvider implements DnsProvider {
  name = 'cloudflare';
  private apiToken: string;
  private zoneId: string;
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
    this.zoneId = process.env.CLOUDFLARE_ZONE_ID || '';
  }

  /**
   * Authenticate with Cloudflare API
   * @throws Error if authentication fails
   */
  async authenticate(): Promise<void> {
    if (!this.apiToken) {
      throw new Error('CLOUDFLARE_API_TOKEN environment variable is required');
    }
    if (!this.zoneId) {
      throw new Error('CLOUDFLARE_ZONE_ID environment variable is required');
    }

    // Verify token and zone access
    const response = await this.fetch(`/zones/${this.zoneId}`);
    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(`Authentication failed: ${data.errors?.[0]?.message || 'Unknown error'}`);
    }
  }

  /**
   * List all DNS records for the zone
   * @param zone - Zone name
   * @returns Array of DNS records
   */
  async listRecords(zone: string): Promise<DnsRecord[]> {
    const records: DnsRecord[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await this.fetch(
        `/zones/${this.zoneId}/dns_records?page=${page}&per_page=${perPage}`
      );

      if (!response.ok) {
        throw new Error(`Failed to list records: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(`Failed to list records: ${data.errors?.[0]?.message || 'Unknown error'}`);
      }

      const cfRecords = data.result as CloudflareRecord[];
      for (const cfRecord of cfRecords) {
        const record = this.fromCloudflareRecord(cfRecord, zone);
        if (record) {
          records.push(record);
        }
      }

      // Check if there are more pages
      if (cfRecords.length < perPage) {
        break;
      }
      page++;
    }

    return records;
  }

  /**
   * Apply configuration to Cloudflare
   * @param config - Zone configuration
   * @param options - Apply options
   * @returns Result of the operation
   */
  async applyConfig(config: ZoneConfig, options: ApplyOptions): Promise<ApplyResult> {
    const result: ApplyResult = {
      created: [],
      updated: [],
      deleted: [],
      errors: [],
    };

    if (options.dryRun) {
      const dryRunResult = await this.dryRun(config);
      result.created = dryRunResult.toCreate;
      result.updated = dryRunResult.toUpdate;
      result.deleted = dryRunResult.toDelete;
      return result;
    }

    // Get existing records
    const existingRecords = await this.listRecords(config.zone);
    const existingMap = new Map<string, DnsRecord>();
    for (const record of existingRecords) {
      existingMap.set(this.recordKey(record), record);
    }

    // Process desired records
    for (const record of config.records) {
      const key = this.recordKey(record);
      const existing = existingMap.get(key);

      try {
        if (existing) {
          // Update if changed
          if (this.recordsEqual(record, existing)) {
            // No change needed
            existingMap.delete(key);
          } else {
            await this.updateRecord(record, config.zone);
            result.updated.push(record);
            existingMap.delete(key);
          }
        } else {
          // Create new record
          await this.createRecord(record, config.zone);
          result.created.push(record);
        }
      } catch (error) {
        result.errors.push(
          `Failed to process record ${record.type} ${record.name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Delete unmanaged records
    if (options.deleteUnmanaged) {
      for (const record of existingMap.values()) {
        try {
          await this.deleteRecord(record);
          result.deleted.push(record);
        } catch (error) {
          result.errors.push(
            `Failed to delete record ${record.type} ${record.name}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }

    return result;
  }

  /**
   * Perform dry run
   * @param config - Zone configuration
   * @returns What would change
   */
  async dryRun(config: ZoneConfig): Promise<DryRunResult> {
    const result: DryRunResult = {
      toCreate: [],
      toUpdate: [],
      toDelete: [],
    };

    const existingRecords = await this.listRecords(config.zone);
    const existingMap = new Map<string, DnsRecord>();
    for (const record of existingRecords) {
      existingMap.set(this.recordKey(record), record);
    }

    for (const record of config.records) {
      const key = this.recordKey(record);
      const existing = existingMap.get(key);

      if (existing) {
        if (!this.recordsEqual(record, existing)) {
          result.toUpdate.push(record);
        }
        existingMap.delete(key);
      } else {
        result.toCreate.push(record);
      }
    }

    result.toDelete = Array.from(existingMap.values());

    return result;
  }

  /**
   * Create a DNS record
   */
  private async createRecord(record: DnsRecord, zone: string): Promise<void> {
    const cfRecord = this.toCloudflareRecord(record, zone);
    const response = await this.fetch(`/zones/${this.zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify(cfRecord),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.errors?.[0]?.message || response.statusText);
    }
  }

  /**
   * Update a DNS record
   */
  private async updateRecord(record: DnsRecord, zone: string): Promise<void> {
    // First find the record ID
    const existingRecords = await this.listRecords(zone);
    const existing = existingRecords.find(
      (r) => this.recordKey(r) === this.recordKey(record)
    );

    if (!existing) {
      throw new Error('Record not found for update');
    }

    // Get the Cloudflare ID from the name field if it was stored
    const recordId = await this.getRecordId(record, zone);
    if (!recordId) {
      throw new Error('Could not find record ID');
    }

    const cfRecord = this.toCloudflareRecord(record, zone);
    const response = await this.fetch(`/zones/${this.zoneId}/dns_records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(cfRecord),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.errors?.[0]?.message || response.statusText);
    }
  }

  /**
   * Delete a DNS record
   */
  private async deleteRecord(record: DnsRecord): Promise<void> {
    const recordId = await this.getRecordId(record, '');
    if (!recordId) {
      throw new Error('Could not find record ID');
    }

    const response = await this.fetch(`/zones/${this.zoneId}/dns_records/${recordId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.errors?.[0]?.message || response.statusText);
    }
  }

  /**
   * Get record ID from Cloudflare
   */
  private async getRecordId(record: DnsRecord, zone: string): Promise<string | null> {
    const response = await this.fetch(`/zones/${this.zoneId}/dns_records?type=${record.type}&name=${record.name}`);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.success || !data.result?.length) return null;

    return data.result[0].id;
  }

  /**
   * Convert DnsRecord to Cloudflare format
   */
  private toCloudflareRecord(record: DnsRecord, zone: string): CloudflareRecord {
    const name = record.name === '@' ? zone : `${record.name}.${zone}`;
    const ttl = record.ttl || 3600;

    if (isARecord(record) || isAAAARecord(record) || isTXTRecord(record)) {
      return { type: record.type, name, content: record.value, ttl };
    } else if (isCNAMERecord(record) || isNSRecord(record)) {
      return { type: record.type, name, content: record.target, ttl };
    } else if (isMXRecord(record)) {
      return { type: record.type, name, content: record.target, ttl, priority: record.priority };
    } else if (isSRVRecord(record)) {
      return {
        type: record.type,
        name,
        content: `${record.priority} ${record.weight} ${record.port} ${record.target}`,
        ttl,
      };
    } else if (isCAARecord(record)) {
      return {
        type: record.type,
        name,
        content: `${record.flags} ${record.tag} "${record.value}"`,
        ttl,
      };
    }

    throw new Error(`Unsupported record type: ${(record as DnsRecord).type}`);
  }

  /**
   * Convert Cloudflare record to DnsRecord
   */
  private fromCloudflareRecord(cfRecord: CloudflareRecord, zone: string): DnsRecord | null {
    const name = cfRecord.name === zone ? '@' : cfRecord.name.replace(`.${zone}`, '');
    const ttl = cfRecord.ttl;

    switch (cfRecord.type) {
      case 'A':
        return { type: 'A', name, value: cfRecord.content, ttl };
      case 'AAAA':
        return { type: 'AAAA', name, value: cfRecord.content, ttl };
      case 'CNAME':
        return { type: 'CNAME', name, target: cfRecord.content, ttl };
      case 'MX':
        return { type: 'MX', name, target: cfRecord.content, ttl, priority: cfRecord.priority || 0 };
      case 'TXT':
        return { type: 'TXT', name, value: cfRecord.content, ttl };
      case 'NS':
        return { type: 'NS', name, target: cfRecord.content, ttl };
      case 'SRV': {
        const parts = cfRecord.content.split(' ');
        return {
          type: 'SRV',
          name,
          priority: parseInt(parts[0]),
          weight: parseInt(parts[1]),
          port: parseInt(parts[2]),
          target: parts[3],
          ttl,
        };
      }
      case 'CAA': {
        const match = cfRecord.content.match(/^(\d+)\s+(\w+)\s+"(.+)"$/);
        if (match) {
          return {
            type: 'CAA',
            name,
            flags: parseInt(match[1]),
            tag: match[2] as 'issue' | 'issuewild' | 'iodef',
            value: match[3],
            ttl,
          };
        }
        return null;
      }
      default:
        return null;
    }
  }

  /**
   * Generate unique key for record
   */
  private recordKey(record: DnsRecord): string {
    let key = `${record.type}:${record.name}`;

    if (isCNAMERecord(record) || isNSRecord(record)) {
      key += `:${record.target}`;
    } else if (isMXRecord(record)) {
      key += `:${record.priority}:${record.target}`;
    } else if (isSRVRecord(record)) {
      key += `:${record.priority}:${record.weight}:${record.port}:${record.target}`;
    } else if (isCAARecord(record)) {
      key += `:${record.flags}:${record.tag}:${record.value}`;
    } else {
      key += `:${record.value}`;
    }

    return key;
  }

  /**
   * Check if two records are equal
   */
  private recordsEqual(a: DnsRecord, b: DnsRecord): boolean {
    return this.recordKey(a) === this.recordKey(b) && a.ttl === b.ttl;
  }

  /**
   * Make HTTP request to Cloudflare API with retry logic
   */
  private async fetch(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    let lastError: Error | null = null;
    const maxRetries = 3;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, { ...options, headers });
        
        // Rate limiting - wait and retry
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
          await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
          continue;
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }

    throw lastError || new Error('Failed to fetch from Cloudflare API');
  }
}
