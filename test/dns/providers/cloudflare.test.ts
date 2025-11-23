/**
 * Tests for Cloudflare provider
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CloudflareProvider } from '../../../infra/dns/providers/cloudflare.js';
import type { ZoneConfig } from '../../../infra/dns/types.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('CloudflareProvider', () => {
  let provider: CloudflareProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLOUDFLARE_API_TOKEN = 'test-token';
    process.env.CLOUDFLARE_ZONE_ID = 'test-zone-id';
    provider = new CloudflareProvider();
  });

  describe('authenticate', () => {
    it('should authenticate successfully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: { id: 'test-zone-id' } }),
      });

      await expect(provider.authenticate()).resolves.toBeUndefined();
    });

    it('should throw error if API token is missing', async () => {
      delete process.env.CLOUDFLARE_API_TOKEN;
      provider = new CloudflareProvider();

      await expect(provider.authenticate()).rejects.toThrow('CLOUDFLARE_API_TOKEN');
    });

    it('should throw error if zone ID is missing', async () => {
      delete process.env.CLOUDFLARE_ZONE_ID;
      provider = new CloudflareProvider();

      await expect(provider.authenticate()).rejects.toThrow('CLOUDFLARE_ZONE_ID');
    });

    it('should throw error if authentication fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
        json: async () => ({ success: false, errors: [{ message: 'Invalid token' }] }),
      });

      await expect(provider.authenticate()).rejects.toThrow();
    });
  });

  describe('listRecords', () => {
    it('should list all records for a zone', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: [
            {
              id: 'rec1',
              type: 'A',
              name: 'www.example.com',
              content: '192.0.2.1',
              ttl: 3600,
            },
            {
              id: 'rec2',
              type: 'MX',
              name: 'example.com',
              content: 'mail.example.com',
              ttl: 3600,
              priority: 10,
            },
          ],
        }),
      });

      const records = await provider.listRecords('example.com');

      expect(records).toHaveLength(2);
      expect(records[0].type).toBe('A');
      expect(records[0].name).toBe('www');
      expect(records[1].type).toBe('MX');
      expect(records[1].name).toBe('@');
    });

    it('should handle pagination', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: Array(100).fill({
              id: 'rec1',
              type: 'A',
              name: 'www.example.com',
              content: '192.0.2.1',
              ttl: 3600,
            }),
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: [
              {
                id: 'rec2',
                type: 'A',
                name: 'api.example.com',
                content: '192.0.2.2',
                ttl: 3600,
              },
            ],
          }),
        });

      const records = await provider.listRecords('example.com');

      expect(records.length).toBeGreaterThan(100);
    });

    it('should throw error if listing fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
        json: async () => ({ success: false }),
      });

      await expect(provider.listRecords('example.com')).rejects.toThrow();
    });
  });

  describe('dryRun', () => {
    it('should identify records to create', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: [],
        }),
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
        json: async () => ({
          success: true,
          result: [
            {
              id: 'rec1',
              type: 'A',
              name: 'www.example.com',
              content: '192.0.2.1',
              ttl: 7200, // Different TTL
            },
          ],
        }),
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
        json: async () => ({
          success: true,
          result: [
            {
              id: 'rec1',
              type: 'A',
              name: 'old.example.com',
              content: '192.0.2.99',
              ttl: 3600,
            },
          ],
        }),
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
        json: async () => ({
          success: true,
          result: [],
        }),
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

    it('should create new records', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: [],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: { id: 'new-rec' },
          }),
        });

      const config: ZoneConfig = {
        zone: 'example.com',
        records: [{ type: 'A', name: 'www', value: '192.0.2.1', ttl: 3600 }],
      };

      const result = await provider.applyConfig(config, {});

      expect(result.created).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: [],
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Bad Request',
          json: async () => ({
            success: false,
            errors: [{ message: 'Invalid record' }],
          }),
        });

      const config: ZoneConfig = {
        zone: 'example.com',
        records: [{ type: 'A', name: 'www', value: '192.0.2.1', ttl: 3600 }],
      };

      const result = await provider.applyConfig(config, {});

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('rate limiting', () => {
    it('should retry on rate limit (429)', async () => {
      vi.useFakeTimers();

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          status: 429,
          ok: false,
          headers: {
            get: () => '1', // Retry-After header
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: { id: 'test-zone-id' } }),
        });

      const authPromise = provider.authenticate();

      // Fast-forward time to trigger retry
      await vi.advanceTimersByTimeAsync(1000);

      await expect(authPromise).resolves.toBeUndefined();

      vi.useRealTimers();
    });
  });
});
