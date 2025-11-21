/**
 * Tests for GoDaddy provider
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoDaddyProvider } from '../../../infra/dns/providers/godaddy.js';
import type { ZoneConfig } from '../../../infra/dns/types.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('GoDaddyProvider', () => {
  let provider: GoDaddyProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GODADDY_API_KEY = 'test-key';
    process.env.GODADDY_API_SECRET = 'test-secret';
    provider = new GoDaddyProvider();
  });

  describe('authenticate', () => {
    it('should authenticate successfully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await expect(provider.authenticate()).resolves.toBeUndefined();
    });

    it('should throw error if API key is missing', async () => {
      delete process.env.GODADDY_API_KEY;
      provider = new GoDaddyProvider();

      await expect(provider.authenticate()).rejects.toThrow('GODADDY_API_KEY');
    });

    it('should throw error if API secret is missing', async () => {
      delete process.env.GODADDY_API_SECRET;
      provider = new GoDaddyProvider();

      await expect(provider.authenticate()).rejects.toThrow('GODADDY_API_SECRET');
    });

    it('should throw error if authentication fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
      });

      await expect(provider.authenticate()).rejects.toThrow();
    });
  });

  describe('listRecords', () => {
    it('should list all records for a domain', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            type: 'A',
            name: 'www',
            data: '192.0.2.1',
            ttl: 3600,
          },
          {
            type: 'MX',
            name: '@',
            data: 'mail.example.com',
            ttl: 3600,
            priority: 10,
          },
        ],
      });

      const records = await provider.listRecords('example.com');

      expect(records).toHaveLength(2);
      expect(records[0].type).toBe('A');
      expect(records[0].name).toBe('www');
      expect(records[1].type).toBe('MX');
      expect(records[1].name).toBe('@');
    });

    it('should throw error if listing fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(provider.listRecords('example.com')).rejects.toThrow();
    });
  });

  describe('dryRun', () => {
    it('should identify records to create', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const config: ZoneConfig = {
        zone: 'example.com',
        records: [{ type: 'A', name: 'www', value: '192.0.2.1', ttl: 3600 }],
      };

      const result = await provider.dryRun(config);

      expect(result.toCreate).toHaveLength(1);
      expect(result.toUpdate).toHaveLength(0);
      expect(result.toDelete).toHaveLength(0);
    });

    it('should identify records to update', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            type: 'A',
            name: 'www',
            data: '192.0.2.1',
            ttl: 7200, // Different TTL
          },
        ],
      });

      const config: ZoneConfig = {
        zone: 'example.com',
        records: [{ type: 'A', name: 'www', value: '192.0.2.1', ttl: 3600 }],
      };

      const result = await provider.dryRun(config);

      expect(result.toCreate).toHaveLength(0);
      expect(result.toUpdate).toHaveLength(1);
      expect(result.toDelete).toHaveLength(0);
    });

    it('should identify records to delete', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            type: 'A',
            name: 'old',
            data: '192.0.2.99',
            ttl: 3600,
          },
        ],
      });

      const config: ZoneConfig = {
        zone: 'example.com',
        records: [{ type: 'A', name: 'www', value: '192.0.2.1', ttl: 3600 }],
      };

      const result = await provider.dryRun(config);

      expect(result.toCreate).toHaveLength(1);
      expect(result.toUpdate).toHaveLength(0);
      expect(result.toDelete).toHaveLength(1);
    });
  });

  describe('applyConfig', () => {
    it('should return dry run results when dryRun option is true', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const config: ZoneConfig = {
        zone: 'example.com',
        records: [{ type: 'A', name: 'www', value: '192.0.2.1', ttl: 3600 }],
      };

      const result = await provider.applyConfig(config, { dryRun: true });

      expect(result.created).toHaveLength(1);
      expect(result.updated).toHaveLength(0);
      expect(result.deleted).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should update records by type (batch operation)', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      const config: ZoneConfig = {
        zone: 'example.com',
        records: [
          { type: 'A', name: 'www', value: '192.0.2.1', ttl: 3600 },
          { type: 'A', name: 'api', value: '192.0.2.2', ttl: 3600 },
        ],
      };

      const result = await provider.applyConfig(config, {});

      expect(result.created).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle mixed record types', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true, // A records
        })
        .mockResolvedValueOnce({
          ok: true, // MX records
        });

      const config: ZoneConfig = {
        zone: 'example.com',
        records: [
          { type: 'A', name: 'www', value: '192.0.2.1', ttl: 3600 },
          { type: 'MX', name: '@', priority: 10, target: 'mail.example.com', ttl: 3600 },
        ],
      };

      const result = await provider.applyConfig(config, {});

      expect(result.created.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle errors gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Bad Request',
          text: async () => 'Invalid record data',
        });

      const config: ZoneConfig = {
        zone: 'example.com',
        records: [{ type: 'A', name: 'www', value: '192.0.2.1', ttl: 3600 }],
      };

      const result = await provider.applyConfig(config, {});

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should delete unmanaged records when option is set', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              type: 'A',
              name: 'old',
              data: '192.0.2.99',
              ttl: 3600,
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true, // Update A records
        })
        .mockResolvedValueOnce({
          ok: true, // Delete old A records
        });

      const config: ZoneConfig = {
        zone: 'example.com',
        records: [{ type: 'A', name: 'www', value: '192.0.2.1', ttl: 3600 }],
      };

      const result = await provider.applyConfig(config, { deleteUnmanaged: true });

      expect(result.deleted.length).toBeGreaterThan(0);
    });
  });

  describe('SRV records', () => {
    it('should format SRV records correctly', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      const config: ZoneConfig = {
        zone: 'example.com',
        records: [
          {
            type: 'SRV',
            name: '_http._tcp',
            priority: 10,
            weight: 20,
            port: 80,
            target: 'server.example.com',
            ttl: 3600,
          },
        ],
      };

      const result = await provider.applyConfig(config, {});

      expect(result.created).toHaveLength(1);
    });
  });
});
