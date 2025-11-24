/**
 * NOIZYLAB Email System - Metrics Service
 * Prometheus-compatible metrics collection and export
 */

import { now } from '../utils';

/**
 * Metric types
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * Metric labels
 */
export type MetricLabels = Record<string, string>;

/**
 * Counter metric
 */
interface CounterMetric {
  type: 'counter';
  name: string;
  help: string;
  values: Map<string, number>;
}

/**
 * Gauge metric
 */
interface GaugeMetric {
  type: 'gauge';
  name: string;
  help: string;
  values: Map<string, number>;
}

/**
 * Histogram metric
 */
interface HistogramMetric {
  type: 'histogram';
  name: string;
  help: string;
  buckets: number[];
  values: Map<string, { buckets: Map<number, number>; sum: number; count: number }>;
}

/**
 * Metric types union
 */
type Metric = CounterMetric | GaugeMetric | HistogramMetric;

/**
 * Pre-defined email metrics
 */
export const EMAIL_METRICS = {
  // Counters
  EMAILS_SENT_TOTAL: 'noizylab_emails_sent_total',
  EMAILS_DELIVERED_TOTAL: 'noizylab_emails_delivered_total',
  EMAILS_BOUNCED_TOTAL: 'noizylab_emails_bounced_total',
  EMAILS_FAILED_TOTAL: 'noizylab_emails_failed_total',
  API_REQUESTS_TOTAL: 'noizylab_api_requests_total',
  RATE_LIMIT_EXCEEDED_TOTAL: 'noizylab_rate_limit_exceeded_total',
  TEMPLATE_RENDERS_TOTAL: 'noizylab_template_renders_total',
  WEBHOOK_EVENTS_TOTAL: 'noizylab_webhook_events_total',

  // Gauges
  QUEUE_SIZE: 'noizylab_queue_size',
  SUPPRESSION_LIST_SIZE: 'noizylab_suppression_list_size',
  ACTIVE_API_KEYS: 'noizylab_active_api_keys',

  // Histograms
  EMAIL_SEND_DURATION: 'noizylab_email_send_duration_seconds',
  API_REQUEST_DURATION: 'noizylab_api_request_duration_seconds',
  TEMPLATE_RENDER_DURATION: 'noizylab_template_render_duration_seconds',
} as const;

/**
 * Default histogram buckets (in seconds)
 */
const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

/**
 * Metrics service
 */
export class MetricsService {
  private readonly metrics: Map<string, Metric> = new Map();
  private readonly kv?: KVNamespace;
  private readonly persistKey = 'metrics:state';

  constructor(kv?: KVNamespace) {
    this.kv = kv;
    this.initializeDefaultMetrics();
  }

  /**
   * Initialize pre-defined metrics
   */
  private initializeDefaultMetrics(): void {
    // Counters
    this.registerCounter(EMAIL_METRICS.EMAILS_SENT_TOTAL, 'Total number of emails sent');
    this.registerCounter(EMAIL_METRICS.EMAILS_DELIVERED_TOTAL, 'Total number of emails delivered');
    this.registerCounter(EMAIL_METRICS.EMAILS_BOUNCED_TOTAL, 'Total number of emails bounced');
    this.registerCounter(EMAIL_METRICS.EMAILS_FAILED_TOTAL, 'Total number of emails failed');
    this.registerCounter(EMAIL_METRICS.API_REQUESTS_TOTAL, 'Total number of API requests');
    this.registerCounter(EMAIL_METRICS.RATE_LIMIT_EXCEEDED_TOTAL, 'Total rate limit exceeded events');
    this.registerCounter(EMAIL_METRICS.TEMPLATE_RENDERS_TOTAL, 'Total template renders');
    this.registerCounter(EMAIL_METRICS.WEBHOOK_EVENTS_TOTAL, 'Total webhook events processed');

    // Gauges
    this.registerGauge(EMAIL_METRICS.QUEUE_SIZE, 'Current email queue size');
    this.registerGauge(EMAIL_METRICS.SUPPRESSION_LIST_SIZE, 'Current suppression list size');
    this.registerGauge(EMAIL_METRICS.ACTIVE_API_KEYS, 'Number of active API keys');

    // Histograms
    this.registerHistogram(
      EMAIL_METRICS.EMAIL_SEND_DURATION,
      'Email send duration in seconds',
      DEFAULT_BUCKETS
    );
    this.registerHistogram(
      EMAIL_METRICS.API_REQUEST_DURATION,
      'API request duration in seconds',
      DEFAULT_BUCKETS
    );
    this.registerHistogram(
      EMAIL_METRICS.TEMPLATE_RENDER_DURATION,
      'Template render duration in seconds',
      [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]
    );
  }

  /**
   * Register a counter metric
   */
  registerCounter(name: string, help: string): void {
    this.metrics.set(name, {
      type: 'counter',
      name,
      help,
      values: new Map(),
    });
  }

  /**
   * Register a gauge metric
   */
  registerGauge(name: string, help: string): void {
    this.metrics.set(name, {
      type: 'gauge',
      name,
      help,
      values: new Map(),
    });
  }

  /**
   * Register a histogram metric
   */
  registerHistogram(name: string, help: string, buckets: number[] = DEFAULT_BUCKETS): void {
    this.metrics.set(name, {
      type: 'histogram',
      name,
      help,
      buckets: buckets.sort((a, b) => a - b),
      values: new Map(),
    });
  }

  /**
   * Increment a counter
   */
  incCounter(name: string, labels: MetricLabels = {}, value: number = 1): void {
    const metric = this.metrics.get(name);
    if (metric === undefined || metric.type !== 'counter') {
      return;
    }

    const key = this.labelsToKey(labels);
    const current = metric.values.get(key) ?? 0;
    metric.values.set(key, current + value);
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, labels: MetricLabels = {}): void {
    const metric = this.metrics.get(name);
    if (metric === undefined || metric.type !== 'gauge') {
      return;
    }

    const key = this.labelsToKey(labels);
    metric.values.set(key, value);
  }

  /**
   * Increment a gauge
   */
  incGauge(name: string, labels: MetricLabels = {}, value: number = 1): void {
    const metric = this.metrics.get(name);
    if (metric === undefined || metric.type !== 'gauge') {
      return;
    }

    const key = this.labelsToKey(labels);
    const current = metric.values.get(key) ?? 0;
    metric.values.set(key, current + value);
  }

  /**
   * Decrement a gauge
   */
  decGauge(name: string, labels: MetricLabels = {}, value: number = 1): void {
    this.incGauge(name, labels, -value);
  }

  /**
   * Observe a histogram value
   */
  observeHistogram(name: string, value: number, labels: MetricLabels = {}): void {
    const metric = this.metrics.get(name);
    if (metric === undefined || metric.type !== 'histogram') {
      return;
    }

    const key = this.labelsToKey(labels);
    let data = metric.values.get(key);

    if (data === undefined) {
      data = {
        buckets: new Map(metric.buckets.map((b) => [b, 0])),
        sum: 0,
        count: 0,
      };
      metric.values.set(key, data);
    }

    // Update buckets
    for (const bucket of metric.buckets) {
      if (value <= bucket) {
        data.buckets.set(bucket, (data.buckets.get(bucket) ?? 0) + 1);
      }
    }

    data.sum += value;
    data.count += 1;
  }

  /**
   * Create a timer for histogram observation
   */
  startTimer(name: string, labels: MetricLabels = {}): () => number {
    const start = performance.now();
    return () => {
      const duration = (performance.now() - start) / 1000; // Convert to seconds
      this.observeHistogram(name, duration, labels);
      return duration;
    };
  }

  /**
   * Export metrics in Prometheus text format
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      if (metric.type === 'counter' || metric.type === 'gauge') {
        for (const [labelsKey, value] of metric.values) {
          const labels = labelsKey ? `{${labelsKey}}` : '';
          lines.push(`${metric.name}${labels} ${value}`);
        }
      } else if (metric.type === 'histogram') {
        for (const [labelsKey, data] of metric.values) {
          const baseLabels = labelsKey ? `${labelsKey},` : '';

          // Bucket values
          let cumulative = 0;
          for (const [bucket, count] of data.buckets) {
            cumulative += count;
            lines.push(`${metric.name}_bucket{${baseLabels}le="${bucket}"} ${cumulative}`);
          }
          lines.push(`${metric.name}_bucket{${baseLabels}le="+Inf"} ${data.count}`);

          // Sum and count
          const sumLabels = labelsKey ? `{${labelsKey}}` : '';
          lines.push(`${metric.name}_sum${sumLabels} ${data.sum}`);
          lines.push(`${metric.name}_count${sumLabels} ${data.count}`);
        }
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Export metrics as JSON
   */
  exportJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const metric of this.metrics.values()) {
      const values: Record<string, unknown> = {};

      if (metric.type === 'counter' || metric.type === 'gauge') {
        for (const [labelsKey, value] of metric.values) {
          values[labelsKey || '_default'] = value;
        }
      } else if (metric.type === 'histogram') {
        for (const [labelsKey, data] of metric.values) {
          values[labelsKey || '_default'] = {
            buckets: Object.fromEntries(data.buckets),
            sum: data.sum,
            count: data.count,
          };
        }
      }

      result[metric.name] = {
        type: metric.type,
        help: metric.help,
        values,
      };
    }

    return result;
  }

  /**
   * Get a specific metric value
   */
  getMetric(name: string, labels: MetricLabels = {}): number | undefined {
    const metric = this.metrics.get(name);
    if (metric === undefined) {
      return undefined;
    }

    if (metric.type === 'counter' || metric.type === 'gauge') {
      return metric.values.get(this.labelsToKey(labels));
    }

    return undefined;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    for (const metric of this.metrics.values()) {
      if (metric.type === 'counter' || metric.type === 'gauge') {
        metric.values.clear();
      } else if (metric.type === 'histogram') {
        metric.values.clear();
      }
    }
  }

  /**
   * Persist metrics to KV (for durability across restarts)
   */
  async persist(): Promise<void> {
    if (this.kv === undefined) {
      return;
    }

    const state = this.exportJSON();
    await this.kv.put(this.persistKey, JSON.stringify(state), {
      expirationTtl: 86400, // 1 day
    });
  }

  /**
   * Load metrics from KV
   */
  async load(): Promise<void> {
    if (this.kv === undefined) {
      return;
    }

    const state = await this.kv.get(this.persistKey, 'json');
    if (state === null) {
      return;
    }

    // Restore counter and gauge values
    const data = state as Record<string, { type: string; values: Record<string, unknown> }>;

    for (const [name, metricData] of Object.entries(data)) {
      const metric = this.metrics.get(name);
      if (metric === undefined) {
        continue;
      }

      if (metric.type === 'counter' || metric.type === 'gauge') {
        for (const [labelsKey, value] of Object.entries(metricData.values)) {
          const key = labelsKey === '_default' ? '' : labelsKey;
          metric.values.set(key, Number(value));
        }
      }
    }
  }

  /**
   * Convert labels object to key string
   */
  private labelsToKey(labels: MetricLabels): string {
    const entries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([k, v]) => `${k}="${v}"`).join(',');
  }
}

/**
 * Global metrics instance
 */
let globalMetrics: MetricsService | null = null;

/**
 * Get or create global metrics instance
 */
export function getMetrics(kv?: KVNamespace): MetricsService {
  if (globalMetrics === null) {
    globalMetrics = new MetricsService(kv);
  }
  return globalMetrics;
}

/**
 * Create metrics service from environment
 */
export function createMetricsService(env: Env): MetricsService {
  return getMetrics(env.EMAIL_KV);
}

/**
 * Middleware helper for recording API metrics
 */
export function recordAPIMetrics(
  metrics: MetricsService,
  method: string,
  path: string,
  status: number,
  duration: number
): void {
  const labels = { method, path, status: String(status) };

  metrics.incCounter(EMAIL_METRICS.API_REQUESTS_TOTAL, labels);
  metrics.observeHistogram(EMAIL_METRICS.API_REQUEST_DURATION, duration, { method, path });
}
