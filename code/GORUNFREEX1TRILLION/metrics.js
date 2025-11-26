/**
 * GORUNFREEX1TRILLION - METRICS & MONITORING
 * Real-time metrics collection and monitoring
 */

const { EventEmitter } = require('events');

// ============================================
// COUNTER
// ============================================

class Counter {
  constructor(name, options = {}) {
    this.name = name;
    this.help = options.help || '';
    this.labels = options.labels || [];
    this.values = new Map();
  }

  inc(labelsOrValue = 1, value = 1) {
    if (typeof labelsOrValue === 'number') {
      value = labelsOrValue;
      labelsOrValue = {};
    }

    const key = this.labelKey(labelsOrValue);
    const current = this.values.get(key) || 0;
    this.values.set(key, current + value);
  }

  get(labels = {}) {
    return this.values.get(this.labelKey(labels)) || 0;
  }

  reset(labels = {}) {
    if (Object.keys(labels).length === 0) {
      this.values.clear();
    } else {
      this.values.delete(this.labelKey(labels));
    }
  }

  labelKey(labels) {
    return JSON.stringify(labels);
  }

  collect() {
    const metrics = [];
    for (const [key, value] of this.values) {
      metrics.push({
        name: this.name,
        type: 'counter',
        labels: JSON.parse(key),
        value
      });
    }
    return metrics;
  }
}

// ============================================
// GAUGE
// ============================================

class Gauge {
  constructor(name, options = {}) {
    this.name = name;
    this.help = options.help || '';
    this.labels = options.labels || [];
    this.values = new Map();
  }

  set(labelsOrValue, value) {
    if (typeof labelsOrValue === 'number') {
      value = labelsOrValue;
      labelsOrValue = {};
    }

    const key = this.labelKey(labelsOrValue);
    this.values.set(key, value);
  }

  inc(labelsOrValue = 1, value = 1) {
    if (typeof labelsOrValue === 'number') {
      value = labelsOrValue;
      labelsOrValue = {};
    }

    const key = this.labelKey(labelsOrValue);
    const current = this.values.get(key) || 0;
    this.values.set(key, current + value);
  }

  dec(labelsOrValue = 1, value = 1) {
    if (typeof labelsOrValue === 'number') {
      value = labelsOrValue;
      labelsOrValue = {};
    }

    const key = this.labelKey(labelsOrValue);
    const current = this.values.get(key) || 0;
    this.values.set(key, current - value);
  }

  get(labels = {}) {
    return this.values.get(this.labelKey(labels)) || 0;
  }

  labelKey(labels) {
    return JSON.stringify(labels);
  }

  collect() {
    const metrics = [];
    for (const [key, value] of this.values) {
      metrics.push({
        name: this.name,
        type: 'gauge',
        labels: JSON.parse(key),
        value
      });
    }
    return metrics;
  }
}

// ============================================
// HISTOGRAM
// ============================================

class Histogram {
  constructor(name, options = {}) {
    this.name = name;
    this.help = options.help || '';
    this.labels = options.labels || [];
    this.buckets = options.buckets || [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
    this.values = new Map();
  }

  observe(labelsOrValue, value) {
    if (typeof labelsOrValue === 'number') {
      value = labelsOrValue;
      labelsOrValue = {};
    }

    const key = this.labelKey(labelsOrValue);

    if (!this.values.has(key)) {
      this.values.set(key, {
        buckets: this.buckets.map(b => ({ le: b, count: 0 })),
        sum: 0,
        count: 0
      });
    }

    const data = this.values.get(key);
    data.sum += value;
    data.count++;

    for (const bucket of data.buckets) {
      if (value <= bucket.le) {
        bucket.count++;
      }
    }
  }

  // Timer helper
  startTimer(labels = {}) {
    const start = process.hrtime.bigint();
    return () => {
      const duration = Number(process.hrtime.bigint() - start) / 1e9; // seconds
      this.observe(labels, duration);
      return duration;
    };
  }

  get(labels = {}) {
    const data = this.values.get(this.labelKey(labels));
    if (!data) return null;

    return {
      buckets: data.buckets,
      sum: data.sum,
      count: data.count,
      mean: data.count > 0 ? data.sum / data.count : 0
    };
  }

  labelKey(labels) {
    return JSON.stringify(labels);
  }

  collect() {
    const metrics = [];
    for (const [key, data] of this.values) {
      const labels = JSON.parse(key);

      // Add bucket metrics
      for (const bucket of data.buckets) {
        metrics.push({
          name: `${this.name}_bucket`,
          type: 'histogram',
          labels: { ...labels, le: bucket.le },
          value: bucket.count
        });
      }

      // Add sum and count
      metrics.push({
        name: `${this.name}_sum`,
        type: 'histogram',
        labels,
        value: data.sum
      });

      metrics.push({
        name: `${this.name}_count`,
        type: 'histogram',
        labels,
        value: data.count
      });
    }
    return metrics;
  }
}

// ============================================
// SUMMARY
// ============================================

class Summary {
  constructor(name, options = {}) {
    this.name = name;
    this.help = options.help || '';
    this.labels = options.labels || [];
    this.percentiles = options.percentiles || [0.5, 0.9, 0.95, 0.99];
    this.maxAge = options.maxAge || 60000;
    this.values = new Map();
  }

  observe(labelsOrValue, value) {
    if (typeof labelsOrValue === 'number') {
      value = labelsOrValue;
      labelsOrValue = {};
    }

    const key = this.labelKey(labelsOrValue);

    if (!this.values.has(key)) {
      this.values.set(key, []);
    }

    const observations = this.values.get(key);
    observations.push({ value, timestamp: Date.now() });

    // Cleanup old observations
    const cutoff = Date.now() - this.maxAge;
    while (observations.length > 0 && observations[0].timestamp < cutoff) {
      observations.shift();
    }
  }

  get(labels = {}) {
    const observations = this.values.get(this.labelKey(labels)) || [];
    if (observations.length === 0) return null;

    const values = observations.map(o => o.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    const result = {
      count: values.length,
      sum,
      percentiles: {}
    };

    for (const p of this.percentiles) {
      const index = Math.ceil(p * values.length) - 1;
      result.percentiles[p] = values[Math.max(0, index)];
    }

    return result;
  }

  startTimer(labels = {}) {
    const start = process.hrtime.bigint();
    return () => {
      const duration = Number(process.hrtime.bigint() - start) / 1e9;
      this.observe(labels, duration);
      return duration;
    };
  }

  labelKey(labels) {
    return JSON.stringify(labels);
  }

  collect() {
    const metrics = [];
    for (const [key, observations] of this.values) {
      const labels = JSON.parse(key);
      const data = this.get(labels);
      if (!data) continue;

      for (const [quantile, value] of Object.entries(data.percentiles)) {
        metrics.push({
          name: this.name,
          type: 'summary',
          labels: { ...labels, quantile },
          value
        });
      }

      metrics.push({
        name: `${this.name}_sum`,
        type: 'summary',
        labels,
        value: data.sum
      });

      metrics.push({
        name: `${this.name}_count`,
        type: 'summary',
        labels,
        value: data.count
      });
    }
    return metrics;
  }
}

// ============================================
// METRICS REGISTRY
// ============================================

class MetricsRegistry extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.collectors = [];
  }

  counter(name, options = {}) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, new Counter(name, options));
    }
    return this.metrics.get(name);
  }

  gauge(name, options = {}) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, new Gauge(name, options));
    }
    return this.metrics.get(name);
  }

  histogram(name, options = {}) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, new Histogram(name, options));
    }
    return this.metrics.get(name);
  }

  summary(name, options = {}) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, new Summary(name, options));
    }
    return this.metrics.get(name);
  }

  registerCollector(collector) {
    this.collectors.push(collector);
  }

  async collect() {
    const allMetrics = [];

    // Collect from registered metrics
    for (const metric of this.metrics.values()) {
      allMetrics.push(...metric.collect());
    }

    // Collect from custom collectors
    for (const collector of this.collectors) {
      const metrics = await collector();
      allMetrics.push(...metrics);
    }

    return allMetrics;
  }

  // Prometheus format output
  async prometheus() {
    const metrics = await this.collect();
    const lines = [];

    for (const metric of metrics) {
      const labels = Object.entries(metric.labels || {})
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');

      const labelStr = labels ? `{${labels}}` : '';
      lines.push(`${metric.name}${labelStr} ${metric.value}`);
    }

    return lines.join('\n');
  }

  // JSON format output
  async json() {
    return this.collect();
  }

  clear() {
    this.metrics.clear();
  }
}

// ============================================
// SYSTEM METRICS COLLECTOR
// ============================================

function collectSystemMetrics(registry) {
  const os = require('os');

  // CPU
  const cpuGauge = registry.gauge('process_cpu_usage', {
    help: 'Process CPU usage'
  });

  // Memory
  const memoryGauge = registry.gauge('process_memory_bytes', {
    help: 'Process memory usage'
  });

  // Event loop lag
  const eventLoopHistogram = registry.histogram('nodejs_eventloop_lag_seconds', {
    help: 'Event loop lag',
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]
  });

  let lastCPU = process.cpuUsage();
  let lastTime = process.hrtime.bigint();

  registry.registerCollector(async () => {
    const metrics = [];

    // CPU usage
    const currentCPU = process.cpuUsage(lastCPU);
    const currentTime = process.hrtime.bigint();
    const elapsedTime = Number(currentTime - lastTime) / 1e6; // ms

    const cpuPercent = ((currentCPU.user + currentCPU.system) / 1000) / elapsedTime * 100;
    cpuGauge.set(cpuPercent);

    lastCPU = process.cpuUsage();
    lastTime = process.hrtime.bigint();

    // Memory usage
    const mem = process.memoryUsage();
    memoryGauge.set({ type: 'rss' }, mem.rss);
    memoryGauge.set({ type: 'heapTotal' }, mem.heapTotal);
    memoryGauge.set({ type: 'heapUsed' }, mem.heapUsed);
    memoryGauge.set({ type: 'external' }, mem.external);

    // System metrics
    metrics.push({
      name: 'nodejs_version_info',
      type: 'gauge',
      labels: { version: process.version },
      value: 1
    });

    metrics.push({
      name: 'process_uptime_seconds',
      type: 'gauge',
      labels: {},
      value: process.uptime()
    });

    metrics.push({
      name: 'system_memory_bytes',
      type: 'gauge',
      labels: { type: 'total' },
      value: os.totalmem()
    });

    metrics.push({
      name: 'system_memory_bytes',
      type: 'gauge',
      labels: { type: 'free' },
      value: os.freemem()
    });

    metrics.push({
      name: 'system_cpu_count',
      type: 'gauge',
      labels: {},
      value: os.cpus().length
    });

    return metrics;
  });

  // Measure event loop lag
  setInterval(() => {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1e9;
      eventLoopHistogram.observe(lag);
    });
  }, 1000);
}

// ============================================
// HEALTH CHECKER
// ============================================

class HealthChecker extends EventEmitter {
  constructor() {
    super();
    this.checks = new Map();
    this.results = new Map();
  }

  register(name, check, options = {}) {
    this.checks.set(name, {
      check,
      timeout: options.timeout || 5000,
      critical: options.critical !== false
    });
  }

  async run() {
    const results = {};
    let healthy = true;

    for (const [name, { check, timeout, critical }] of this.checks) {
      try {
        const result = await Promise.race([
          check(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Health check timeout')), timeout)
          )
        ]);

        results[name] = {
          status: 'healthy',
          ...result
        };

      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message
        };

        if (critical) {
          healthy = false;
        }
      }
    }

    this.results = results;
    this.emit('check', { healthy, results });

    return { healthy, results, timestamp: Date.now() };
  }

  getStatus() {
    return this.results;
  }
}

// ============================================
// EXPORTS
// ============================================

const globalRegistry = new MetricsRegistry();

module.exports = {
  Counter,
  Gauge,
  Histogram,
  Summary,
  MetricsRegistry,
  HealthChecker,
  collectSystemMetrics,

  // Global registry methods
  counter: (name, options) => globalRegistry.counter(name, options),
  gauge: (name, options) => globalRegistry.gauge(name, options),
  histogram: (name, options) => globalRegistry.histogram(name, options),
  summary: (name, options) => globalRegistry.summary(name, options),
  collect: () => globalRegistry.collect(),
  prometheus: () => globalRegistry.prometheus(),
  json: () => globalRegistry.json(),

  // Create new registry
  create: () => new MetricsRegistry(),
  registry: globalRegistry
};
