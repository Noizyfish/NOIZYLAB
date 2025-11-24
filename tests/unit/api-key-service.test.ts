/**
 * NOIZYLAB Email System - API Key Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  APIKeyService,
  createAPIKeyService,
  type APIKey,
  type APIKeyScope,
  scopeDescriptions,
} from '../../src/services/api-key-service';

// Mock KV store
const createMockKV = () => {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    list: vi.fn(async ({ prefix }: { prefix: string }) => {
      const keys: { name: string }[] = [];
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
          keys.push({ name: key });
        }
      }
      return { keys, list_complete: true, cursor: '' };
    }),
    _store: store,
  };
};

describe('APIKeyService', () => {
  let service: APIKeyService;
  let mockKV: ReturnType<typeof createMockKV>;

  beforeEach(() => {
    mockKV = createMockKV();
    service = new APIKeyService(mockKV as unknown as KVNamespace);
  });

  describe('createKey', () => {
    it('should create a new API key', async () => {
      const result = await service.createKey({
        name: 'Test Key',
        scopes: ['email:send', 'email:read'],
        clientId: 'client-123',
      });

      expect(result.key).toBeDefined();
      expect(result.rawKey).toBeDefined();
      expect(result.key.name).toBe('Test Key');
      expect(result.key.scopes).toContain('email:send');
      expect(result.key.clientId).toBe('client-123');
      expect(result.key.isActive).toBe(true);
    });

    it('should generate unique key IDs', async () => {
      const key1 = await service.createKey({
        name: 'Key 1',
        scopes: ['email:send'],
        clientId: 'client-1',
      });

      const key2 = await service.createKey({
        name: 'Key 2',
        scopes: ['email:send'],
        clientId: 'client-2',
      });

      expect(key1.key.id).not.toBe(key2.key.id);
      expect(key1.rawKey).not.toBe(key2.rawKey);
    });

    it('should set expiration when provided', async () => {
      const expiresAt = new Date(Date.now() + 86400000).toISOString();
      const result = await service.createKey({
        name: 'Expiring Key',
        scopes: ['email:send'],
        clientId: 'client-123',
        expiresAt,
      });

      expect(result.key.expiresAt).toBe(expiresAt);
    });

    it('should set rate limit when provided', async () => {
      const result = await service.createKey({
        name: 'Limited Key',
        scopes: ['email:send'],
        clientId: 'client-123',
        rateLimit: 100,
      });

      expect(result.key.rateLimit).toBe(100);
    });

    it('should set metadata when provided', async () => {
      const metadata = { team: 'engineering', project: 'email-service' };
      const result = await service.createKey({
        name: 'Meta Key',
        scopes: ['email:send'],
        clientId: 'client-123',
        metadata,
      });

      expect(result.key.metadata).toEqual(metadata);
    });

    it('should store key hash, not raw key', async () => {
      const result = await service.createKey({
        name: 'Test Key',
        scopes: ['email:send'],
        clientId: 'client-123',
      });

      // The stored key should have a hash, not the raw key
      const storedData = mockKV._store.get(`apikey:${result.key.id}`);
      expect(storedData).toBeDefined();
      const parsed = JSON.parse(storedData!);
      expect(parsed.keyHash).toBeDefined();
      expect(parsed.rawKey).toBeUndefined();
    });
  });

  describe('validateKey', () => {
    it('should validate a correct key', async () => {
      const { rawKey, key } = await service.createKey({
        name: 'Valid Key',
        scopes: ['email:send', 'email:read'],
        clientId: 'client-123',
      });

      const result = await service.validateKey(rawKey);

      expect(result.valid).toBe(true);
      expect(result.key).toBeDefined();
      expect(result.key?.id).toBe(key.id);
    });

    it('should reject invalid key', async () => {
      const result = await service.validateKey('invalid-key-12345');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject expired key', async () => {
      const expiredDate = new Date(Date.now() - 86400000).toISOString();
      const { rawKey } = await service.createKey({
        name: 'Expired Key',
        scopes: ['email:send'],
        clientId: 'client-123',
        expiresAt: expiredDate,
      });

      const result = await service.validateKey(rawKey);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject inactive key', async () => {
      const { rawKey, key } = await service.createKey({
        name: 'Active Key',
        scopes: ['email:send'],
        clientId: 'client-123',
      });

      // Deactivate the key
      await service.revokeKey(key.id);

      const result = await service.validateKey(rawKey);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('inactive');
    });

    it('should update last used timestamp on validation', async () => {
      const { rawKey, key } = await service.createKey({
        name: 'Track Usage Key',
        scopes: ['email:send'],
        clientId: 'client-123',
      });

      await service.validateKey(rawKey);

      const updatedKey = await service.getKey(key.id);
      expect(updatedKey?.lastUsedAt).toBeDefined();
    });
  });

  describe('hasScope', () => {
    it('should check if key has specific scope', async () => {
      const { key } = await service.createKey({
        name: 'Scoped Key',
        scopes: ['email:send', 'template:read'],
        clientId: 'client-123',
      });

      expect(service.hasScope(key, 'email:send')).toBe(true);
      expect(service.hasScope(key, 'template:read')).toBe(true);
      expect(service.hasScope(key, 'email:read')).toBe(false);
      expect(service.hasScope(key, 'admin')).toBe(false);
    });

    it('should grant all permissions with admin scope', async () => {
      const { key } = await service.createKey({
        name: 'Admin Key',
        scopes: ['admin'],
        clientId: 'client-123',
      });

      expect(service.hasScope(key, 'email:send')).toBe(true);
      expect(service.hasScope(key, 'template:write')).toBe(true);
      expect(service.hasScope(key, 'analytics:read')).toBe(true);
    });
  });

  describe('revokeKey', () => {
    it('should revoke an active key', async () => {
      const { key } = await service.createKey({
        name: 'To Revoke',
        scopes: ['email:send'],
        clientId: 'client-123',
      });

      const result = await service.revokeKey(key.id);

      expect(result).toBe(true);

      const updatedKey = await service.getKey(key.id);
      expect(updatedKey?.isActive).toBe(false);
    });

    it('should return false for non-existent key', async () => {
      const result = await service.revokeKey('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('deleteKey', () => {
    it('should delete a key', async () => {
      const { key } = await service.createKey({
        name: 'To Delete',
        scopes: ['email:send'],
        clientId: 'client-123',
      });

      const result = await service.deleteKey(key.id);

      expect(result).toBe(true);

      const deletedKey = await service.getKey(key.id);
      expect(deletedKey).toBeNull();
    });
  });

  describe('listKeys', () => {
    it('should list all keys for a client', async () => {
      await service.createKey({
        name: 'Key 1',
        scopes: ['email:send'],
        clientId: 'client-123',
      });

      await service.createKey({
        name: 'Key 2',
        scopes: ['email:read'],
        clientId: 'client-123',
      });

      await service.createKey({
        name: 'Other Key',
        scopes: ['email:send'],
        clientId: 'client-456',
      });

      const keys = await service.listKeys('client-123');

      expect(keys.length).toBe(2);
      expect(keys.every((k) => k.clientId === 'client-123')).toBe(true);
    });

    it('should return empty array for client with no keys', async () => {
      const keys = await service.listKeys('no-keys-client');
      expect(keys).toHaveLength(0);
    });
  });

  describe('rotateKey', () => {
    it('should rotate a key generating new secret', async () => {
      const { key: originalKey, rawKey: originalRaw } = await service.createKey({
        name: 'To Rotate',
        scopes: ['email:send'],
        clientId: 'client-123',
      });

      const { key: rotatedKey, rawKey: rotatedRaw } = await service.rotateKey(originalKey.id);

      expect(rotatedKey.id).toBe(originalKey.id);
      expect(rotatedKey.name).toBe(originalKey.name);
      expect(rotatedRaw).not.toBe(originalRaw);

      // Old key should no longer work
      const oldValidation = await service.validateKey(originalRaw);
      expect(oldValidation.valid).toBe(false);

      // New key should work
      const newValidation = await service.validateKey(rotatedRaw);
      expect(newValidation.valid).toBe(true);
    });
  });

  describe('updateKey', () => {
    it('should update key name', async () => {
      const { key } = await service.createKey({
        name: 'Original Name',
        scopes: ['email:send'],
        clientId: 'client-123',
      });

      const updated = await service.updateKey(key.id, { name: 'Updated Name' });

      expect(updated?.name).toBe('Updated Name');
    });

    it('should update key scopes', async () => {
      const { key } = await service.createKey({
        name: 'Scopes Key',
        scopes: ['email:send'],
        clientId: 'client-123',
      });

      const updated = await service.updateKey(key.id, {
        scopes: ['email:send', 'email:read', 'template:read'],
      });

      expect(updated?.scopes).toContain('email:read');
      expect(updated?.scopes).toContain('template:read');
    });

    it('should return null for non-existent key', async () => {
      const updated = await service.updateKey('non-existent', { name: 'New Name' });
      expect(updated).toBeNull();
    });
  });

  describe('scopeDescriptions', () => {
    it('should have descriptions for all scopes', () => {
      const scopes: APIKeyScope[] = [
        'email:send',
        'email:read',
        'template:read',
        'template:write',
        'analytics:read',
        'suppression:read',
        'suppression:write',
        'batch:send',
        'webhook:read',
        'admin',
      ];

      scopes.forEach((scope) => {
        expect(scopeDescriptions[scope]).toBeDefined();
        expect(typeof scopeDescriptions[scope]).toBe('string');
      });
    });
  });

  describe('createAPIKeyService', () => {
    it('should create service from env', () => {
      const env = { EMAIL_KV: mockKV } as unknown as Env;
      const createdService = createAPIKeyService(env);
      expect(createdService).toBeInstanceOf(APIKeyService);
    });
  });
});
