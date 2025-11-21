/**
 * Base provider interface and types
 * @module providers/base
 */

import type { DnsRecord, ZoneConfig } from '../types.js';

/**
 * Options for applying configuration
 */
export interface ApplyOptions {
  /** Dry run - don't actually make changes */
  dryRun?: boolean;
  /** Delete records not in configuration */
  deleteUnmanaged?: boolean;
  /** Verbose output */
  verbose?: boolean;
}

/**
 * Result of applying configuration
 */
export interface ApplyResult {
  /** Records that were created */
  created: DnsRecord[];
  /** Records that were updated */
  updated: DnsRecord[];
  /** Records that were deleted */
  deleted: DnsRecord[];
  /** Errors encountered */
  errors: string[];
}

/**
 * Result of dry run
 */
export interface DryRunResult {
  /** Records that would be created */
  toCreate: DnsRecord[];
  /** Records that would be updated */
  toUpdate: DnsRecord[];
  /** Records that would be deleted */
  toDelete: DnsRecord[];
}

/**
 * DNS provider interface
 */
export interface DnsProvider {
  /** Provider name */
  name: string;

  /**
   * Authenticate with the provider
   * @throws Error if authentication fails
   */
  authenticate(): Promise<void>;

  /**
   * List all DNS records for a zone
   * @param zone - Zone/domain name
   * @returns Array of DNS records
   */
  listRecords(zone: string): Promise<DnsRecord[]>;

  /**
   * Apply zone configuration to provider
   * @param config - Zone configuration
   * @param options - Apply options
   * @returns Result of the operation
   */
  applyConfig(config: ZoneConfig, options: ApplyOptions): Promise<ApplyResult>;

  /**
   * Perform dry run to see what would change
   * @param config - Zone configuration
   * @returns What would change
   */
  dryRun(config: ZoneConfig): Promise<DryRunResult>;
}
