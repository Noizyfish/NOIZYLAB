/**
 * NOIZYLAB Email System - Metrics Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MetricsService,
  createMetricsService,
  getMetrics,
  recordAPIMetrics,
  EMAIL_METRICS,
} from '../../src/services/metrics-service';

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

describe('MetricsService', () => {
  let service: MetricsService;
  let mockKV: ReturnType<typeof createMockKV>;

  beforeEach(() => {
    mockKV = createMockKV();
    service = new MetricsService(mockKV as unknown as KVNamespace);
  });

  describe('Counter Operations', () => {
    it('should increment counter', () => {
      service.incCounter('test_counter');
      service.incCounter('test_counter');
      service.incCounter('test_counter');

      const metrics = service.getMetrics();
      const counter = metrics.counters.find((c) => c.name === 'test_counter');
      expect(counter?.value).toBe(3);
    });

    it('should increment counter by specific value', () => {
      service.incCounter('test_counter', {}, 5);
      service.incCounter('test_counter', {}, 10);

      const metrics = service.getMetrics();
      const counter = metrics.counters.find((c) => c.name === 'test_counter');
      expect(counter?.value).toBe(15);
    });

    it('should track counters with labels separately', () => {
      service.incCounter('http_requests', { method: 'GET' });
      service.incCounter('http_requests', { method: 'GET' });
      service.incCounter('http_requests', { method: 'POST' });

      const metrics = service.getMetrics();
      const getCounter = metrics.counters.find(
        (c) => c.name === 'http_requests' && c.labels?.method === 'GET'
      );
      const postCounter = metrics.counters.find(
        (c) => c.name === 'http_requests' && c.labels?.method === 'POST'
      );

      expect(getCounter?.value).toBe(2);
      expect(postCounter?.value).toBe(1);
    });
  });

  describe('Gauge Operations', () => {
    it('should set gauge value', () => {
      service.setGauge('active_connections', 10);
      service.setGauge('active_connections', 15);
      service.setGauge('active_connections', 12);

      const metrics = service.getMetrics();
      const gauge = metrics.gauges.find((g) => g.name === 'active_connections');
      expect(gauge?.value).toBe(12);
    });

    it('should track gauges with labels separately', () => {
      service.setGauge('queue_size', 100, { queue: 'email' });
      service.setGauge('queue_size', 50, { queue: 'batch' });

      const metrics = service.getMetrics();
      const emailQueue = metrics.gauges.find(
        (g) => g.name === 'queue_size' && g.labels?.queue === 'email'
      );
      const batchQueue = metrics.gauges.find(
        (g) => g.name === 'queue_size' && g.labels?.queue === 'batch'
      );

      expect(emailQueue?.value).toBe(100);
      expect(batchQueue?.value).toBe(50);
    });
  });

  describe('Histogram Operations', () => {
    it('should observe histogram values', () => {
      service.observeHistogram('request_duration', 0.05);
      service.observeHistogram('request_duration', 0.15);
      service.observeHistogram('request_duration', 0.5);
      service.observeHistogram('request_duration', 1.2);

      const metrics = service.getMetrics();
      const histogram = metrics.histograms.find((h) => h.name === 'request_duration');

      expect(histogram?.count).toBe(4);
      expect(histogram?.sum).toBeCloseTo(1.9, 2);
    });

    it('should track histogram with labels', () => {
      service.observeHistogram('request_duration', 0.1, { path: '/api/send' });
      service.observeHistogram('request_duration', 0.2, { path: '/api/send' });
      service.observeHistogram('request_duration', 0.5, { path: '/health' });

      const metrics = service.getMetrics();
      const sendHistogram = metrics.histograms.find(
        (h) => h.name === 'request_duration' && h.labels?.path === '/api/send'
      );

      expect(sendHistogram?.count).toBe(2);
    });
  });

  describe('Prometheus Export', () => {
    it('should export metrics in Prometheus format', () => {
      service.incCounter('emails_sent_total', { provider: 'mailchannels' });
      service.setGauge('rate_limit_remaining', 95);
      service.observeHistogram('send_duration_seconds', 0.25);

      const output = service.exportPrometheus();

      expect(output).toContain('emails_sent_total');
      expect(output).toContain('rate_limit_remaining');
      expect(output).toContain('send_duration_seconds');
      expect(output).toContain('provider="mailchannels"');
    });

    it('should escape label values in Prometheus format', () => {
      service.incCounter('test_metric', { path: '/path/with"quotes' });

      const output = service.exportPrometheus();
      expect(output).toContain('\\"'); // Escaped quotes
    });

    it('should include histogram buckets in output', () => {
      service.observeHistogram('duration', 0.1);
      service.observeHistogram('duration', 0.5);

      const output = service.exportPrometheus();
      expect(output).toContain('_bucket{');
      expect(output).toContain('_count');
      expect(output).toContain('_sum');
    });
  });

  describe('JSON Export', () => {
    it('should export metrics as JSON', () => {
      service.incCounter('test_counter');
      service.setGauge('test_gauge', 42);

      const json = service.exportJSON();

      expect(json.counters).toBeDefined();
      expect(json.gauges).toBeDefined();
      expect(json.histograms).toBeDefined();
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('Persistence', () => {
    it('should persist metrics to KV', async () => {
      service.incCounter('persistent_counter', {}, 10);
      await service.persist();

      expect(mockKV.put).toHaveBeenCalled();
    });

    it('should load persisted metrics', async () => {
      // Pre-populate KV with metrics
      mockKV._store.set(
        'metrics:data',
        JSON.stringify({
          counters: [{ name: 'loaded_counter', value: 100, labels: {} }],
          gauges: [],
          histograms: [],
        })
      );

      await service.load();

      const metrics = service.getMetrics();
      const counter = metrics.counters.find((c) => c.name === 'loaded_counter');
      expect(counter?.value).toBe(100);
    });
  });

  describe('Reset', () => {
    it('should reset all metrics', () => {
      service.incCounter('counter1');
      service.setGauge('gauge1', 50);
      service.observeHistogram('hist1', 0.5);

      service.reset();

      const metrics = service.getMetrics();
      expect(metrics.counters).toHaveLength(0);
      expect(metrics.gauges).toHaveLength(0);
      expect(metrics.histograms).toHaveLength(0);
    });
  });

  describe('EMAIL_METRICS Constants', () => {
    it('should have all expected metric names', () => {
      expect(EMAIL_METRICS.EMAILS_SENT_TOTAL).toBeDefined();
      expect(EMAIL_METRICS.EMAILS_FAILED_TOTAL).toBeDefined();
      expect(EMAIL_METRICS.EMAIL_SEND_DURATION).toBeDefined();
      expect(EMAIL_METRICS.RATE_LIMIT_REMAINING).toBeDefined();
      expect(EMAIL_METRICS.API_REQUESTS_TOTAL).toBeDefined();
      expect(EMAIL_METRICS.API_REQUEST_DURATION).toBeDefined();
    });
  });

  describe('Factory Functions', () => {
    it('should create metrics service from env', () => {
      const env = { EMAIL_KV: mockKV } as unknown as Env;
      const createdService = createMetricsService(env);
      expect(createdService).toBeInstanceOf(MetricsService);
    });

    it('should get singleton metrics instance', () => {
      const metrics1 = getMetrics(mockKV as unknown as KVNamespace);
      const metrics2 = getMetrics(mockKV as unknown as KVNamespace);
      expect(metrics1).toBe(metrics2);
    });
  });

  describe('recordAPIMetrics helper', () => {
    it('should record API metrics', () => {
      recordAPIMetrics(service, {
        method: 'POST',
        path: '/emails/send',
        status: 200,
        duration: 0.15,
      });

      const metrics = service.getMetrics();
      const requestCounter = metrics.counters.find(
        (c) => c.name === EMAIL_METRICS.API_REQUESTS_TOTAL
      );
      expect(requestCounter).toBeDefined();
    });
  });
});
