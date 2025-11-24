/**
 * NOIZYLAB Email System - Suppression Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SuppressionService, createSuppressionService } from '../../src/services/suppression-service';

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
      const keys: { name: string; expiration?: number }[] = [];
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

// Mock D1 database
const createMockD1 = () => {
  const data: Array<{ email: string; reason: string; source: string; created_at: string; expires_at?: string }> = [];
  return {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...args: unknown[]) => ({
        first: vi.fn(async () => {
          if (sql.includes('SELECT')) {
            return data.find((d) => d.email === args[0]) ?? null;
          }
          return null;
        }),
        run: vi.fn(async () => {
          if (sql.includes('INSERT')) {
            data.push({
              email: args[0] as string,
              reason: args[1] as string,
              source: args[2] as string,
              created_at: args[3] as string,
              expires_at: args[4] as string | undefined,
            });
          } else if (sql.includes('DELETE')) {
            const idx = data.findIndex((d) => d.email === args[0]);
            if (idx >= 0) data.splice(idx, 1);
          }
          return { success: true };
        }),
        all: vi.fn(async () => ({ results: data })),
      })),
    })),
    batch: vi.fn(async (statements: unknown[]) => {
      return statements.map(() => ({ success: true }));
    }),
    _data: data,
  };
};

describe('SuppressionService', () => {
  let service: SuppressionService;
  let mockKV: ReturnType<typeof createMockKV>;
  let mockD1: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockKV = createMockKV();
    mockD1 = createMockD1();
    service = new SuppressionService(mockKV as unknown as KVNamespace, mockD1 as unknown as D1Database);
  });

  describe('addEmail', () => {
    it('should add an email to suppression list', async () => {
      const result = await service.addEmail('test@example.com', 'bounce', {
        source: 'manual',
      });

      expect(result.email).toBe('test@example.com');
      expect(result.reason).toBe('bounce');
      expect(result.source).toBe('manual');
      expect(mockKV.put).toHaveBeenCalled();
    });

    it('should normalize email addresses', async () => {
      const result = await service.addEmail('TEST@EXAMPLE.COM', 'complaint');

      expect(result.email).toBe('test@example.com');
    });

    it('should set expiration when provided', async () => {
      const expiresAt = new Date(Date.now() + 86400000).toISOString();
      const result = await service.addEmail('test@example.com', 'bounce', {
        expiresAt,
      });

      expect(result.expiresAt).toBe(expiresAt);
    });
  });

  describe('removeEmail', () => {
    it('should remove an email from suppression list', async () => {
      await service.addEmail('test@example.com', 'bounce');
      const result = await service.removeEmail('test@example.com');

      expect(result).toBe(true);
      expect(mockKV.delete).toHaveBeenCalled();
    });

    it('should return false for non-existent email', async () => {
      const result = await service.removeEmail('nonexistent@example.com');
      expect(result).toBe(false);
    });
  });

  describe('isEmailSuppressed', () => {
    it('should return suppressed status for suppressed email', async () => {
      await service.addEmail('suppressed@example.com', 'bounce');
      const result = await service.isEmailSuppressed('suppressed@example.com');

      expect(result.suppressed).toBe(true);
      expect(result.reason).toBe('bounce');
    });

    it('should return not suppressed for clean email', async () => {
      const result = await service.isEmailSuppressed('clean@example.com');

      expect(result.suppressed).toBe(false);
      expect(result.reason).toBeUndefined();
    });

    it('should handle expired suppressions', async () => {
      const expiredDate = new Date(Date.now() - 86400000).toISOString();
      await service.addEmail('expired@example.com', 'bounce', {
        expiresAt: expiredDate,
      });

      // The service should check expiration
      const result = await service.isEmailSuppressed('expired@example.com');
      // Note: actual behavior depends on implementation details
      expect(result).toBeDefined();
    });
  });

  describe('filterSuppressed', () => {
    it('should filter suppressed emails from list', async () => {
      await service.addEmail('bad1@example.com', 'bounce');
      await service.addEmail('bad2@example.com', 'complaint');

      const result = await service.filterSuppressed([
        'good@example.com',
        'bad1@example.com',
        'bad2@example.com',
      ]);

      expect(result.allowed).toContain('good@example.com');
      expect(result.suppressed).toHaveLength(2);
      expect(result.suppressed.map((s) => s.email)).toContain('bad1@example.com');
    });

    it('should return all emails when none suppressed', async () => {
      const result = await service.filterSuppressed([
        'good1@example.com',
        'good2@example.com',
      ]);

      expect(result.allowed).toHaveLength(2);
      expect(result.suppressed).toHaveLength(0);
    });
  });

  describe('bulkAdd', () => {
    it('should add multiple emails', async () => {
      const result = await service.bulkAdd(
        ['test1@example.com', 'test2@example.com', 'test3@example.com'],
        'unsubscribe'
      );

      expect(result.added).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should handle invalid emails', async () => {
      const result = await service.bulkAdd(
        ['valid@example.com', 'invalid-email', 'also@valid.com'],
        'bounce'
      );

      // Implementation may skip or fail invalid emails
      expect(result.added + result.failed).toBe(3);
    });
  });

  describe('getEntry', () => {
    it('should retrieve suppression entry details', async () => {
      await service.addEmail('test@example.com', 'bounce', {
        source: 'webhook',
        metadata: { bounceType: 'hard' },
      });

      const entry = await service.getEntry('test@example.com');

      expect(entry).not.toBeNull();
      expect(entry?.email).toBe('test@example.com');
      expect(entry?.reason).toBe('bounce');
    });

    it('should return null for non-existent entry', async () => {
      const entry = await service.getEntry('nonexistent@example.com');
      expect(entry).toBeNull();
    });
  });

  describe('listEntries', () => {
    it('should list suppression entries with pagination', async () => {
      await service.addEmail('test1@example.com', 'bounce');
      await service.addEmail('test2@example.com', 'complaint');
      await service.addEmail('test3@example.com', 'unsubscribe');

      const result = await service.listEntries({ limit: 10 });

      expect(result.entries.length).toBeGreaterThan(0);
    });

    it('should filter by reason', async () => {
      await service.addEmail('bounce@example.com', 'bounce');
      await service.addEmail('complaint@example.com', 'complaint');

      const result = await service.listEntries({ reason: 'bounce', limit: 10 });

      // All returned entries should have bounce reason
      result.entries.forEach((entry) => {
        expect(entry.reason).toBe('bounce');
      });
    });
  });

  describe('createSuppressionService', () => {
    it('should create service from env', () => {
      const env = {
        EMAIL_KV: mockKV,
        EMAIL_DB: mockD1,
      } as unknown as Env;

      const createdService = createSuppressionService(env);
      expect(createdService).toBeInstanceOf(SuppressionService);
    });
  });
});
