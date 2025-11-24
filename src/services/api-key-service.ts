/**
 * NOIZYLAB Email System - API Key Management Service
 * Secure API key generation, validation, and management
 */

import { AuthenticationError, ValidationError } from '../errors';
import { generateRandomString, now, sha256 } from '../utils';

/**
 * API Key metadata
 */
export interface APIKey {
  id: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: APIKeyScope[];
  rateLimit?: {
    maxRequests: number;
    windowSeconds: number;
  };
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * API Key scopes for permission control
 */
export type APIKeyScope =
  | 'emails:send'
  | 'emails:read'
  | 'emails:batch'
  | 'templates:read'
  | 'templates:write'
  | 'templates:delete'
  | 'analytics:read'
  | 'suppression:read'
  | 'suppression:write'
  | 'webhooks:manage'
  | 'api-keys:manage'
  | '*';

/**
 * API Key creation input
 */
export interface CreateAPIKeyInput {
  name: string;
  scopes: APIKeyScope[];
  rateLimit?: {
    maxRequests: number;
    windowSeconds: number;
  };
  expiresAt?: string;
  createdBy: string;
  metadata?: Record<string, unknown>;
}

/**
 * API Key validation result
 */
export interface APIKeyValidationResult {
  valid: boolean;
  key?: APIKey;
  error?: string;
}

/**
 * API Key Service
 */
export class APIKeyService {
  private readonly kv: KVNamespace;
  private readonly keyPrefix = 'apikey';
  private readonly keyLength = 32;
  private readonly prefixLength = 8;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  /**
   * Generate a new API key
   * Returns the full key only once - must be saved by caller
   */
  async createKey(input: CreateAPIKeyInput): Promise<{ key: APIKey; rawKey: string }> {
    // Generate key components
    const keyId = generateRandomString(12);
    const keyPrefix = `nlab_${generateRandomString(this.prefixLength)}`;
    const keySecret = generateRandomString(this.keyLength);
    const rawKey = `${keyPrefix}_${keySecret}`;

    // Hash the full key for storage
    const keyHash = await sha256(rawKey);

    const timestamp = now();

    const apiKey: APIKey = {
      id: keyId,
      name: input.name,
      keyPrefix,
      keyHash,
      scopes: input.scopes,
      rateLimit: input.rateLimit,
      expiresAt: input.expiresAt,
      createdAt: timestamp,
      createdBy: input.createdBy,
      isActive: true,
      metadata: input.metadata,
    };

    // Store key by ID
    await this.kv.put(`${this.keyPrefix}:id:${keyId}`, JSON.stringify(apiKey));

    // Store key hash mapping for lookups
    await this.kv.put(`${this.keyPrefix}:hash:${keyHash}`, keyId);

    // Store key prefix mapping for listing
    await this.kv.put(`${this.keyPrefix}:prefix:${keyPrefix}`, keyId);

    return { key: apiKey, rawKey };
  }

  /**
   * Validate an API key
   */
  async validateKey(rawKey: string): Promise<APIKeyValidationResult> {
    // Check key format
    if (!rawKey.startsWith('nlab_') || rawKey.split('_').length !== 3) {
      return { valid: false, error: 'Invalid key format' };
    }

    // Hash the key
    const keyHash = await sha256(rawKey);

    // Look up by hash
    const keyId = await this.kv.get(`${this.keyPrefix}:hash:${keyHash}`);
    if (keyId === null) {
      return { valid: false, error: 'Key not found' };
    }

    // Get full key data
    const keyData = await this.kv.get(`${this.keyPrefix}:id:${keyId}`);
    if (keyData === null) {
      return { valid: false, error: 'Key data not found' };
    }

    const apiKey = JSON.parse(keyData) as APIKey;

    // Check if active
    if (!apiKey.isActive) {
      return { valid: false, error: 'Key is deactivated' };
    }

    // Check expiration
    if (apiKey.expiresAt !== undefined && new Date(apiKey.expiresAt) < new Date()) {
      return { valid: false, error: 'Key has expired' };
    }

    // Update last used
    apiKey.lastUsedAt = now();
    await this.kv.put(`${this.keyPrefix}:id:${keyId}`, JSON.stringify(apiKey));

    return { valid: true, key: apiKey };
  }

  /**
   * Check if a key has a specific scope
   */
  hasScope(key: APIKey, requiredScope: APIKeyScope): boolean {
    if (key.scopes.includes('*')) {
      return true;
    }
    return key.scopes.includes(requiredScope);
  }

  /**
   * Check if a key has all required scopes
   */
  hasAllScopes(key: APIKey, requiredScopes: APIKeyScope[]): boolean {
    return requiredScopes.every((scope) => this.hasScope(key, scope));
  }

  /**
   * Check if a key has any of the required scopes
   */
  hasAnyScope(key: APIKey, requiredScopes: APIKeyScope[]): boolean {
    return requiredScopes.some((scope) => this.hasScope(key, scope));
  }

  /**
   * Get API key by ID
   */
  async getKey(keyId: string): Promise<APIKey | null> {
    const keyData = await this.kv.get(`${this.keyPrefix}:id:${keyId}`);
    if (keyData === null) {
      return null;
    }
    return JSON.parse(keyData) as APIKey;
  }

  /**
   * List all API keys
   */
  async listKeys(options: {
    limit?: number;
    cursor?: string;
    includeInactive?: boolean;
  } = {}): Promise<{ keys: APIKey[]; cursor?: string }> {
    const { limit = 50, cursor, includeInactive = false } = options;

    const listResult = await this.kv.list({
      prefix: `${this.keyPrefix}:id:`,
      limit,
      cursor,
    });

    const keys: APIKey[] = [];
    for (const item of listResult.keys) {
      const keyData = await this.kv.get(item.name);
      if (keyData !== null) {
        const key = JSON.parse(keyData) as APIKey;
        if (includeInactive || key.isActive) {
          keys.push(key);
        }
      }
    }

    return {
      keys,
      cursor: listResult.list_complete ? undefined : listResult.cursor,
    };
  }

  /**
   * Update API key
   */
  async updateKey(
    keyId: string,
    updates: Partial<Pick<APIKey, 'name' | 'scopes' | 'rateLimit' | 'expiresAt' | 'metadata'>>
  ): Promise<APIKey | null> {
    const existing = await this.getKey(keyId);
    if (existing === null) {
      return null;
    }

    const updated: APIKey = {
      ...existing,
      ...updates,
    };

    await this.kv.put(`${this.keyPrefix}:id:${keyId}`, JSON.stringify(updated));

    return updated;
  }

  /**
   * Deactivate API key
   */
  async deactivateKey(keyId: string): Promise<boolean> {
    const existing = await this.getKey(keyId);
    if (existing === null) {
      return false;
    }

    existing.isActive = false;
    await this.kv.put(`${this.keyPrefix}:id:${keyId}`, JSON.stringify(existing));

    return true;
  }

  /**
   * Reactivate API key
   */
  async reactivateKey(keyId: string): Promise<boolean> {
    const existing = await this.getKey(keyId);
    if (existing === null) {
      return false;
    }

    existing.isActive = true;
    await this.kv.put(`${this.keyPrefix}:id:${keyId}`, JSON.stringify(existing));

    return true;
  }

  /**
   * Delete API key permanently
   */
  async deleteKey(keyId: string): Promise<boolean> {
    const existing = await this.getKey(keyId);
    if (existing === null) {
      return false;
    }

    // Delete all associated data
    await this.kv.delete(`${this.keyPrefix}:id:${keyId}`);
    await this.kv.delete(`${this.keyPrefix}:hash:${existing.keyHash}`);
    await this.kv.delete(`${this.keyPrefix}:prefix:${existing.keyPrefix}`);

    return true;
  }

  /**
   * Rotate API key (create new key, deactivate old)
   */
  async rotateKey(keyId: string): Promise<{ key: APIKey; rawKey: string } | null> {
    const existing = await this.getKey(keyId);
    if (existing === null) {
      return null;
    }

    // Create new key with same settings
    const { key: newKey, rawKey } = await this.createKey({
      name: `${existing.name} (rotated)`,
      scopes: existing.scopes,
      rateLimit: existing.rateLimit,
      createdBy: existing.createdBy,
      metadata: {
        ...existing.metadata,
        rotatedFrom: existing.id,
        rotatedAt: now(),
      },
    });

    // Deactivate old key
    await this.deactivateKey(keyId);

    return { key: newKey, rawKey };
  }

  /**
   * Get API key usage statistics
   */
  async getKeyStats(keyId: string): Promise<{
    totalRequests: number;
    lastUsedAt?: string;
    createdAt: string;
    daysActive: number;
  } | null> {
    const key = await this.getKey(keyId);
    if (key === null) {
      return null;
    }

    const createdDate = new Date(key.createdAt);
    const now = new Date();
    const daysActive = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    // Note: In production, you'd track request counts in a separate counter
    return {
      totalRequests: 0, // Would need separate tracking
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      daysActive,
    };
  }
}

/**
 * Create API key service from environment
 */
export function createAPIKeyService(env: Env): APIKeyService {
  return new APIKeyService(env.EMAIL_KV);
}

/**
 * Scope descriptions for documentation
 */
export const scopeDescriptions: Record<APIKeyScope, string> = {
  'emails:send': 'Send individual emails',
  'emails:read': 'View email logs and status',
  'emails:batch': 'Send batch emails',
  'templates:read': 'View email templates',
  'templates:write': 'Create and update templates',
  'templates:delete': 'Delete templates',
  'analytics:read': 'View analytics and statistics',
  'suppression:read': 'View suppression list',
  'suppression:write': 'Manage suppression list',
  'webhooks:manage': 'Manage webhook configurations',
  'api-keys:manage': 'Manage API keys',
  '*': 'Full access to all operations',
};
