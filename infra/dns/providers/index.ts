/**
 * Provider factory and exports
 * @module providers
 */

import type { DnsProvider } from './base.js';
import { CloudflareProvider } from './cloudflare.js';
import { GoDaddyProvider } from './godaddy.js';

/**
 * Get a DNS provider by name
 * 
 * @param name - Provider name ('cloudflare', 'godaddy', 'route53', or 'other')
 * @returns DNS provider instance
 * @throws Error if provider is not supported
 * 
 * @example
 * ```typescript
 * const provider = getProvider('cloudflare');
 * await provider.authenticate();
 * ```
 */
export function getProvider(name: string): DnsProvider {
  switch (name.toLowerCase()) {
    case 'cloudflare':
      return new CloudflareProvider();
    case 'godaddy':
      return new GoDaddyProvider();
    case 'route53':
      throw new Error('Route53 provider not yet implemented');
    case 'other':
      throw new Error('Generic provider not yet implemented');
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

// Re-export types and classes
export type { DnsProvider, ApplyOptions, ApplyResult, DryRunResult } from './base.js';
export { CloudflareProvider } from './cloudflare.js';
export { GoDaddyProvider } from './godaddy.js';
