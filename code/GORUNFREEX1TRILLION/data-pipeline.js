/**
 * GORUNFREEX1TRILLION - DATA PIPELINE
 * High-throughput data processing pipelines
 */

const { EventEmitter } = require('events');
const { Transform, Readable, pipeline } = require('stream');
const { promisify } = require('util');

const pipelineAsync = promisify(pipeline);

// ============================================
// PIPELINE BUILDER
// ============================================

class DataPipeline extends EventEmitter {
  constructor(name = 'pipeline') {
    super();
    this.name = name;
    this.stages = [];
    this.metrics = {
      processed: 0,
      errors: 0,
      startTime: null,
      bytesProcessed: 0
    };
  }

  // Add transformation stage
  transform(fn, options = {}) {
    this.stages.push({
      type: 'transform',
      fn,
      name: options.name || `stage_${this.stages.length}`,
      concurrency: options.concurrency || 1
    });
    return this;
  }

  // Add filter stage
  filter(predicate, options = {}) {
    this.stages.push({
      type: 'filter',
      fn: predicate,
      name: options.name || `filter_${this.stages.length}`
    });
    return this;
  }

  // Add batch stage
  batch(size, options = {}) {
    this.stages.push({
      type: 'batch',
      size,
      name: options.name || `batch_${this.stages.length}`
    });
    return this;
  }

  // Add debounce stage
  debounce(ms) {
    this.stages.push({
      type: 'debounce',
      ms,
      name: `debounce_${this.stages.length}`
    });
    return this;
  }

  // Add throttle stage
  throttle(itemsPerSecond) {
    this.stages.push({
      type: 'throttle',
      rate: itemsPerSecond,
      name: `throttle_${this.stages.length}`
    });
    return this;
  }

  // Add tap for side effects (logging, metrics)
  tap(fn, options = {}) {
    this.stages.push({
      type: 'tap',
      fn,
      name: options.name || `tap_${this.stages.length}`
    });
    return this;
  }

  // Add error handler
  catch(handler) {
    this.errorHandler = handler;
    return this;
  }

  // Build Node.js streams
  buildStreams() {
    const streams = [];

    for (const stage of this.stages) {
      switch (stage.type) {
        case 'transform':
          streams.push(this.createTransformStream(stage));
          break;
        case 'filter':
          streams.push(this.createFilterStream(stage));
          break;
        case 'batch':
          streams.push(this.createBatchStream(stage));
          break;
        case 'throttle':
          streams.push(this.createThrottleStream(stage));
          break;
        case 'tap':
          streams.push(this.createTapStream(stage));
          break;
      }
    }

    return streams;
  }

  createTransformStream(stage) {
    const self = this;
    return new Transform({
      objectMode: true,
      async transform(chunk, encoding, callback) {
        try {
          const result = await stage.fn(chunk);
          self.metrics.processed++;
          callback(null, result);
        } catch (error) {
          self.metrics.errors++;
          if (self.errorHandler) {
            self.errorHandler(error, chunk);
            callback();
          } else {
            callback(error);
          }
        }
      }
    });
  }

  createFilterStream(stage) {
    return new Transform({
      objectMode: true,
      async transform(chunk, encoding, callback) {
        try {
          const keep = await stage.fn(chunk);
          callback(null, keep ? chunk : undefined);
        } catch (error) {
          callback(error);
        }
      }
    });
  }

  createBatchStream(stage) {
    let batch = [];
    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        batch.push(chunk);
        if (batch.length >= stage.size) {
          const result = batch;
          batch = [];
          callback(null, result);
        } else {
          callback();
        }
      },
      flush(callback) {
        if (batch.length > 0) {
          callback(null, batch);
        } else {
          callback();
        }
      }
    });
  }

  createThrottleStream(stage) {
    const interval = 1000 / stage.rate;
    let lastTime = 0;

    return new Transform({
      objectMode: true,
      async transform(chunk, encoding, callback) {
        const now = Date.now();
        const wait = Math.max(0, interval - (now - lastTime));

        if (wait > 0) {
          await new Promise(r => setTimeout(r, wait));
        }

        lastTime = Date.now();
        callback(null, chunk);
      }
    });
  }

  createTapStream(stage) {
    return new Transform({
      objectMode: true,
      async transform(chunk, encoding, callback) {
        try {
          await stage.fn(chunk);
          callback(null, chunk);
        } catch (error) {
          callback(null, chunk); // Tap errors don't stop the pipeline
        }
      }
    });
  }

  // Execute pipeline with array input
  async execute(input) {
    this.metrics.startTime = Date.now();
    let data = Array.isArray(input) ? input : [input];

    for (const stage of this.stages) {
      switch (stage.type) {
        case 'transform':
          data = await Promise.all(data.map(stage.fn));
          break;
        case 'filter':
          const filtered = await Promise.all(
            data.map(async item => ({ item, keep: await stage.fn(item) }))
          );
          data = filtered.filter(x => x.keep).map(x => x.item);
          break;
        case 'batch':
          data = this.batchArray(data, stage.size);
          break;
        case 'tap':
          await Promise.all(data.map(stage.fn));
          break;
      }

      this.emit('stageComplete', { stage: stage.name, items: data.length });
    }

    this.metrics.processed = data.length;
    return data;
  }

  // Execute with Node.js streams
  async executeStream(readable, writable) {
    this.metrics.startTime = Date.now();
    const streams = this.buildStreams();

    try {
      await pipelineAsync(readable, ...streams, writable);
      this.emit('complete', this.getMetrics());
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  batchArray(arr, size) {
    const batches = [];
    for (let i = 0; i < arr.length; i += size) {
      batches.push(arr.slice(i, i + size));
    }
    return batches;
  }

  getMetrics() {
    return {
      ...this.metrics,
      duration: Date.now() - this.metrics.startTime,
      throughput: this.metrics.processed / ((Date.now() - this.metrics.startTime) / 1000)
    };
  }
}

// ============================================
// SPECIALIZED PIPELINES
// ============================================

class ETLPipeline extends DataPipeline {
  constructor(name) {
    super(name);
    this.extractors = [];
    this.loaders = [];
  }

  extract(source, options = {}) {
    this.extractors.push({ source, options });
    return this;
  }

  load(destination, options = {}) {
    this.loaders.push({ destination, options });
    return this;
  }

  async run() {
    // Extract from all sources
    let data = [];
    for (const extractor of this.extractors) {
      const extracted = await this.extractFrom(extractor);
      data.push(...extracted);
    }

    // Transform
    data = await this.execute(data);

    // Load to all destinations
    for (const loader of this.loaders) {
      await this.loadTo(loader, data);
    }

    return { extracted: data.length, loaded: data.length };
  }

  async extractFrom(extractor) {
    // Override in subclass or provide extractor function
    if (typeof extractor.source === 'function') {
      return await extractor.source();
    }
    return [];
  }

  async loadTo(loader, data) {
    // Override in subclass or provide loader function
    if (typeof loader.destination === 'function') {
      return await loader.destination(data);
    }
  }
}

// ============================================
// DATA VALIDATORS
// ============================================

class DataValidator {
  constructor() {
    this.rules = [];
  }

  required(field) {
    this.rules.push({
      field,
      validate: (data) => data[field] !== undefined && data[field] !== null,
      message: `${field} is required`
    });
    return this;
  }

  type(field, type) {
    this.rules.push({
      field,
      validate: (data) => typeof data[field] === type,
      message: `${field} must be of type ${type}`
    });
    return this;
  }

  range(field, min, max) {
    this.rules.push({
      field,
      validate: (data) => data[field] >= min && data[field] <= max,
      message: `${field} must be between ${min} and ${max}`
    });
    return this;
  }

  pattern(field, regex) {
    this.rules.push({
      field,
      validate: (data) => regex.test(data[field]),
      message: `${field} does not match required pattern`
    });
    return this;
  }

  custom(field, fn, message) {
    this.rules.push({ field, validate: fn, message });
    return this;
  }

  validate(data) {
    const errors = [];

    for (const rule of this.rules) {
      if (!rule.validate(data)) {
        errors.push({ field: rule.field, message: rule.message });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  createFilter() {
    return (data) => this.validate(data).valid;
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  DataPipeline,
  ETLPipeline,
  DataValidator,

  // Quick pipeline builder
  pipe: () => new DataPipeline(),
  etl: (name) => new ETLPipeline(name),
  validator: () => new DataValidator()
};
