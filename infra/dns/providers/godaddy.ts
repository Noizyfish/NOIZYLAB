/**
 * GoDaddy DNS provider implementation
 * @module providers/godaddy
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
 * GoDaddy API record format
 */
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
 * GoDaddy DNS provider
 * 
 * Environment variables:
 * - GODADDY_API_KEY: API key
 * - GODADDY_API_SECRET: API secret
 * 
 * @example
 * ```typescript
 * const provider = new GoDaddyProvider();
 * await provider.authenticate();
 * const result = await provider.applyConfig(config, { dryRun: true });
 * ```
 */
export class GoDaddyProvider implements DnsProvider {
  name = 'godaddy';
  private apiKey: string;
  private apiSecret: string;
  private baseUrl = 'https://api.godaddy.com/v1';

  constructor() {
    this.apiKey = process.env.GODADDY_API_KEY || '';
    this.apiSecret = process.env.GODADDY_API_SECRET || '';
  }

  /**
   * Authenticate with GoDaddy API
   * @throws Error if authentication fails
   */
  async authenticate(): Promise<void> {
    if (!this.apiKey) {
      throw new Error('GODADDY_API_KEY environment variable is required');
    }
    if (!this.apiSecret) {
      throw new Error('GODADDY_API_SECRET environment variable is required');
    }

    // Test authentication by getting available domains
    const response = await this.fetch('/domains');
    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }
  }

  /**
   * List all DNS records for a domain
   * @param zone - Domain name
   * @returns Array of DNS records
   */
  async listRecords(zone: string): Promise<DnsRecord[]> {
    const response = await this.fetch(`/domains/${zone}/records`);

    if (!response.ok) {
      throw new Error(`Failed to list records: ${response.statusText}`);
    }

    const gdRecords = (await response.json()) as GoDaddyRecord[];
    const records: DnsRecord[] = [];

    for (const gdRecord of gdRecords) {
      const record = this.fromGoDaddyRecord(gdRecord);
      if (record) {
        records.push(record);
      }
    }

    return records;
  }

  /**
   * Apply configuration to GoDaddy
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

    // GoDaddy requires batch updates per record type
    const recordsByType = new Map<string, DnsRecord[]>();
    for (const record of config.records) {
      const records = recordsByType.get(record.type) || [];
      records.push(record);
      recordsByType.set(record.type, records);
    }

    // Process each type
    for (const [type, records] of recordsByType.entries()) {
      try {
        await this.updateRecordsByType(config.zone, type, records);
        for (const record of records) {
          const key = this.recordKey(record);
          const existing = existingMap.get(key);
          if (existing) {
            result.updated.push(record);
            existingMap.delete(key);
          } else {
            result.created.push(record);
          }
        }
      } catch (error) {
        result.errors.push(
          `Failed to update ${type} records: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Delete unmanaged records
    if (options.deleteUnmanaged) {
      const remainingByType = new Map<string, DnsRecord[]>();
      for (const record of existingMap.values()) {
        const records = remainingByType.get(record.type) || [];
        records.push(record);
        remainingByType.set(record.type, records);
      }

      for (const [type, records] of remainingByType.entries()) {
        try {
          await this.deleteRecordsByType(config.zone, type, records);
          result.deleted.push(...records);
        } catch (error) {
          result.errors.push(
            `Failed to delete ${type} records: ${error instanceof Error ? error.message : String(error)}`
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
   * Update records of a specific type (GoDaddy batch operation)
   */
  private async updateRecordsByType(
    domain: string,
    type: string,
    records: DnsRecord[]
  ): Promise<void> {
    const gdRecords = records.map((r) => this.toGoDaddyRecord(r));
    const response = await this.fetch(`/domains/${domain}/records/${type}`, {
      method: 'PUT',
      body: JSON.stringify(gdRecords),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to update records: ${text}`);
    }
  }

  /**
   * Delete records of a specific type
   */
  private async deleteRecordsByType(
    domain: string,
    type: string,
    records: DnsRecord[]
  ): Promise<void> {
    // GoDaddy doesn't have a direct delete API - we replace with empty array
    const response = await this.fetch(`/domains/${domain}/records/${type}`, {
      method: 'PUT',
      body: JSON.stringify([]),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to delete records: ${text}`);
    }
  }

  /**
   * Convert DnsRecord to GoDaddy format
   */
  private toGoDaddyRecord(record: DnsRecord): GoDaddyRecord {
    const name = record.name === '@' ? '@' : record.name;
    const ttl = record.ttl || 3600;

    if (isARecord(record) || isAAAARecord(record) || isTXTRecord(record)) {
      return { type: record.type, name, data: record.value, ttl };
    } else if (isCNAMERecord(record) || isNSRecord(record)) {
      return { type: record.type, name, data: record.target, ttl };
    } else if (isMXRecord(record)) {
      return { type: record.type, name, data: record.target, ttl, priority: record.priority };
    } else if (isSRVRecord(record)) {
      return {
        type: record.type,
        name,
        data: record.target,
        ttl,
        priority: record.priority,
        weight: record.weight,
        port: record.port,
      };
    } else if (isCAARecord(record)) {
      return {
        type: record.type,
        name,
        data: `${record.flags} ${record.tag} "${record.value}"`,
        ttl,
      };
    }

    throw new Error(`Unsupported record type: ${(record as DnsRecord).type}`);
  }

  /**
   * Convert GoDaddy record to DnsRecord
   */
  private fromGoDaddyRecord(gdRecord: GoDaddyRecord): DnsRecord | null {
    const name = gdRecord.name;
    const ttl = gdRecord.ttl;

    switch (gdRecord.type) {
      case 'A':
        return { type: 'A', name, value: gdRecord.data, ttl };
      case 'AAAA':
        return { type: 'AAAA', name, value: gdRecord.data, ttl };
      case 'CNAME':
        return { type: 'CNAME', name, target: gdRecord.data, ttl };
      case 'MX':
        return { type: 'MX', name, target: gdRecord.data, ttl, priority: gdRecord.priority || 0 };
      case 'TXT':
        return { type: 'TXT', name, value: gdRecord.data, ttl };
      case 'NS':
        return { type: 'NS', name, target: gdRecord.data, ttl };
      case 'SRV':
        return {
          type: 'SRV',
          name,
          priority: gdRecord.priority || 0,
          weight: gdRecord.weight || 0,
          port: gdRecord.port || 0,
          target: gdRecord.data,
          ttl,
        };
      case 'CAA': {
        const match = gdRecord.data.match(/^(\d+)\s+(\w+)\s+"(.+)"$/);
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
   * Make HTTP request to GoDaddy API
   */
  private async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Authorization': `sso-key ${this.apiKey}:${this.apiSecret}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    return fetch(url, { ...options, headers });
  }
}
