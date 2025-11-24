/**
 * NOIZYLAB Email System - Analytics Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AnalyticsService,
  createAnalyticsService,
  type TimeRange,
} from '../../src/services/analytics-service';

// Mock D1 database
const createMockD1 = () => {
  const mockData = {
    totalSent: 1000,
    totalDelivered: 950,
    totalBounced: 30,
    totalFailed: 20,
    avgDeliveryTime: 2.5,
  };

  return {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((..._args: unknown[]) => ({
        first: vi.fn(async () => {
          if (sql.includes('COUNT')) {
            if (sql.includes('status = ?')) {
              return { count: 100 };
            }
            return { count: mockData.totalSent };
          }
          if (sql.includes('AVG')) {
            return { avg_time: mockData.avgDeliveryTime };
          }
          return null;
        }),
        all: vi.fn(async () => {
          if (sql.includes('GROUP BY')) {
            if (sql.includes('provider')) {
              return {
                results: [
                  { provider: 'mailchannels', count: 500, delivered: 480, bounced: 15, failed: 5 },
                  { provider: 'resend', count: 300, delivered: 290, bounced: 8, failed: 2 },
                  { provider: 'sendgrid', count: 200, delivered: 180, bounced: 7, failed: 13 },
                ],
              };
            }
            if (sql.includes('domain')) {
              return {
                results: [
                  { domain: 'example.com', count: 400 },
                  { domain: 'test.com', count: 300 },
                  { domain: 'demo.org', count: 200 },
                ],
              };
            }
            if (sql.includes('template_id')) {
              return {
                results: [
                  { template_id: 'welcome', count: 250, success_rate: 0.98 },
                  { template_id: 'notification', count: 200, success_rate: 0.95 },
                  { template_id: 'marketing', count: 150, success_rate: 0.92 },
                ],
              };
            }
            if (sql.includes('date') || sql.includes('hour')) {
              return {
                results: [
                  { period: '2024-01-01', sent: 100, delivered: 95, bounced: 3, failed: 2 },
                  { period: '2024-01-02', sent: 120, delivered: 115, bounced: 4, failed: 1 },
                  { period: '2024-01-03', sent: 80, delivered: 78, bounced: 2, failed: 0 },
                ],
              };
            }
          }
          return { results: [] };
        }),
        run: vi.fn(async () => ({ success: true })),
      })),
    })),
    batch: vi.fn(async () => []),
  };
};

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
    list: vi.fn(async () => ({ keys: [], list_complete: true })),
    _store: store,
  };
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockD1: ReturnType<typeof createMockD1>;
  let mockKV: ReturnType<typeof createMockKV>;

  beforeEach(() => {
    mockD1 = createMockD1();
    mockKV = createMockKV();
    service = new AnalyticsService(mockD1 as unknown as D1Database, mockKV as unknown as KVNamespace);
  });

  describe('getOverview', () => {
    it('should return analytics overview', async () => {
      const timeRange: TimeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const overview = await service.getOverview(timeRange);

      expect(overview).toBeDefined();
      expect(overview.totalSent).toBeDefined();
      expect(overview.deliveryRate).toBeDefined();
      expect(overview.bounceRate).toBeDefined();
    });

    it('should calculate rates correctly', async () => {
      const timeRange: TimeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const overview = await service.getOverview(timeRange);

      // Rates should be between 0 and 1
      expect(overview.deliveryRate).toBeGreaterThanOrEqual(0);
      expect(overview.deliveryRate).toBeLessThanOrEqual(1);
      expect(overview.bounceRate).toBeGreaterThanOrEqual(0);
      expect(overview.bounceRate).toBeLessThanOrEqual(1);
    });
  });

  describe('getVolumeTimeSeries', () => {
    it('should return volume data by day', async () => {
      const timeRange: TimeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const volume = await service.getVolumeTimeSeries(timeRange, 'day');

      expect(Array.isArray(volume)).toBe(true);
      expect(volume.length).toBeGreaterThan(0);
      expect(volume[0]).toHaveProperty('period');
      expect(volume[0]).toHaveProperty('sent');
      expect(volume[0]).toHaveProperty('delivered');
    });

    it('should return volume data by hour', async () => {
      const timeRange: TimeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-02'),
      };

      const volume = await service.getVolumeTimeSeries(timeRange, 'hour');

      expect(Array.isArray(volume)).toBe(true);
    });
  });

  describe('getProviderMetrics', () => {
    it('should return metrics by provider', async () => {
      const timeRange: TimeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const metrics = await service.getProviderMetrics(timeRange);

      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0]).toHaveProperty('provider');
      expect(metrics[0]).toHaveProperty('count');
      expect(metrics[0]).toHaveProperty('delivered');
    });

    it('should include all configured providers', async () => {
      const timeRange: TimeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const metrics = await service.getProviderMetrics(timeRange);

      const providers = metrics.map((m) => m.provider);
      expect(providers).toContain('mailchannels');
      expect(providers).toContain('resend');
    });
  });

  describe('getDomainStats', () => {
    it('should return stats by recipient domain', async () => {
      const timeRange: TimeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const stats = await service.getDomainStats(timeRange);

      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0]).toHaveProperty('domain');
      expect(stats[0]).toHaveProperty('count');
    });

    it('should support limiting results', async () => {
      const timeRange: TimeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const stats = await service.getDomainStats(timeRange, 5);

      expect(stats.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getTemplateStats', () => {
    it('should return stats by template', async () => {
      const timeRange: TimeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const stats = await service.getTemplateStats(timeRange);

      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0]).toHaveProperty('template_id');
      expect(stats[0]).toHaveProperty('count');
    });
  });

  describe('getRecentActivity', () => {
    it('should return recent email activity', async () => {
      mockD1.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          all: vi.fn(async () => ({
            results: [
              {
                id: '1',
                recipient: 'user@example.com',
                status: 'sent',
                provider: 'mailchannels',
                created_at: new Date().toISOString(),
              },
            ],
          })),
          first: vi.fn(async () => null),
          run: vi.fn(async () => ({ success: true })),
        })),
      }));

      const activity = await service.getRecentActivity(10);

      expect(Array.isArray(activity)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const activity = await service.getRecentActivity(5);

      expect(activity.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getStatusBreakdown', () => {
    it('should return email count by status', async () => {
      mockD1.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          all: vi.fn(async () => ({
            results: [
              { status: 'sent', count: 800 },
              { status: 'delivered', count: 750 },
              { status: 'bounced', count: 30 },
              { status: 'failed', count: 20 },
            ],
          })),
          first: vi.fn(async () => null),
          run: vi.fn(async () => ({ success: true })),
        })),
      }));

      const timeRange: TimeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const breakdown = await service.getStatusBreakdown(timeRange);

      expect(breakdown).toBeDefined();
      expect(typeof breakdown).toBe('object');
    });
  });

  describe('caching', () => {
    it('should cache analytics results', async () => {
      const timeRange: TimeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      // First call
      await service.getOverview(timeRange);

      // Check if cache was set
      expect(mockKV.put).toHaveBeenCalled();
    });

    it('should return cached results when available', async () => {
      const cachedData = {
        totalSent: 500,
        totalDelivered: 480,
        deliveryRate: 0.96,
        bounceRate: 0.02,
        timestamp: new Date().toISOString(),
      };

      mockKV._store.set('analytics:overview:2024-01-01:2024-01-31', JSON.stringify(cachedData));

      const timeRange: TimeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const overview = await service.getOverview(timeRange);

      expect(overview.totalSent).toBe(cachedData.totalSent);
    });
  });

  describe('time range handling', () => {
    it('should handle 24 hour time range', async () => {
      const timeRange: TimeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const overview = await service.getOverview(timeRange);
      expect(overview).toBeDefined();
    });

    it('should handle 7 day time range', async () => {
      const timeRange: TimeRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const overview = await service.getOverview(timeRange);
      expect(overview).toBeDefined();
    });

    it('should handle 30 day time range', async () => {
      const timeRange: TimeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const overview = await service.getOverview(timeRange);
      expect(overview).toBeDefined();
    });
  });

  describe('createAnalyticsService', () => {
    it('should create service from env', () => {
      const env = {
        EMAIL_DB: mockD1,
        EMAIL_KV: mockKV,
      } as unknown as Env;

      const createdService = createAnalyticsService(env);
      expect(createdService).toBeInstanceOf(AnalyticsService);
    });
  });
});
