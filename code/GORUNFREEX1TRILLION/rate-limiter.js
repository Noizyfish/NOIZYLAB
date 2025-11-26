/**
 * GORUNFREEX1TRILLION - RATE LIMITER
 * Advanced rate limiting with multiple strategies
 */

const { EventEmitter } = require('events');

// ============================================
// TOKEN BUCKET
// ============================================

class TokenBucket {
  constructor(options = {}) {
    this.capacity = options.capacity || 100;
    this.refillRate = options.refillRate || 10; // tokens per second
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }

  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  consume(tokens = 1) {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return { allowed: true, remaining: Math.floor(this.tokens) };
    }

    const waitTime = ((tokens - this.tokens) / this.refillRate) * 1000;
    return { allowed: false, remaining: 0, retryAfter: Math.ceil(waitTime) };
  }

  getState() {
    this.refill();
    return {
      tokens: Math.floor(this.tokens),
      capacity: this.capacity,
      refillRate: this.refillRate
    };
  }
}

// ============================================
// SLIDING WINDOW
// ============================================

class SlidingWindow {
  constructor(options = {}) {
    this.windowSize = options.windowSize || 60000; // 1 minute
    this.maxRequests = options.maxRequests || 100;
    this.requests = [];
  }

  record() {
    const now = Date.now();

    // Remove expired requests
    this.requests = this.requests.filter(t => now - t < this.windowSize);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const retryAfter = this.windowSize - (now - oldestRequest);

      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil(retryAfter),
        reset: oldestRequest + this.windowSize
      };
    }

    this.requests.push(now);

    return {
      allowed: true,
      remaining: this.maxRequests - this.requests.length,
      reset: now + this.windowSize
    };
  }

  getState() {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < this.windowSize);

    return {
      currentRequests: this.requests.length,
      maxRequests: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - this.requests.length),
      windowSize: this.windowSize
    };
  }
}

// ============================================
// FIXED WINDOW COUNTER
// ============================================

class FixedWindowCounter {
  constructor(options = {}) {
    this.windowSize = options.windowSize || 60000;
    this.maxRequests = options.maxRequests || 100;
    this.counter = 0;
    this.windowStart = Date.now();
  }

  record() {
    const now = Date.now();

    // Check if window has passed
    if (now - this.windowStart >= this.windowSize) {
      this.counter = 0;
      this.windowStart = now;
    }

    if (this.counter >= this.maxRequests) {
      const retryAfter = this.windowSize - (now - this.windowStart);
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil(retryAfter),
        reset: this.windowStart + this.windowSize
      };
    }

    this.counter++;

    return {
      allowed: true,
      remaining: this.maxRequests - this.counter,
      reset: this.windowStart + this.windowSize
    };
  }

  getState() {
    const now = Date.now();
    if (now - this.windowStart >= this.windowSize) {
      this.counter = 0;
      this.windowStart = now;
    }

    return {
      counter: this.counter,
      maxRequests: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - this.counter),
      windowReset: this.windowStart + this.windowSize
    };
  }
}

// ============================================
// LEAKY BUCKET
// ============================================

class LeakyBucket {
  constructor(options = {}) {
    this.capacity = options.capacity || 100;
    this.leakRate = options.leakRate || 10; // requests per second
    this.queue = [];
    this.processing = false;
  }

  async add(request) {
    return new Promise((resolve, reject) => {
      if (this.queue.length >= this.capacity) {
        reject(new Error('Bucket overflow'));
        return;
      }

      this.queue.push({ request, resolve, reject, addedAt: Date.now() });
      this.startLeaking();
    });
  }

  startLeaking() {
    if (this.processing) return;
    this.processing = true;

    const leak = () => {
      if (this.queue.length === 0) {
        this.processing = false;
        return;
      }

      const item = this.queue.shift();
      item.resolve(item.request);

      setTimeout(leak, 1000 / this.leakRate);
    };

    leak();
  }

  getState() {
    return {
      queueLength: this.queue.length,
      capacity: this.capacity,
      leakRate: this.leakRate,
      processing: this.processing
    };
  }
}

// ============================================
// RATE LIMITER MANAGER
// ============================================

class RateLimiter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.strategy = options.strategy || 'sliding-window';
    this.limiters = new Map();
    this.defaultOptions = options;

    this.stats = {
      allowed: 0,
      blocked: 0,
      totalRequests: 0
    };
  }

  getLimiter(key) {
    if (!this.limiters.has(key)) {
      let limiter;

      switch (this.strategy) {
        case 'token-bucket':
          limiter = new TokenBucket(this.defaultOptions);
          break;
        case 'fixed-window':
          limiter = new FixedWindowCounter(this.defaultOptions);
          break;
        case 'leaky-bucket':
          limiter = new LeakyBucket(this.defaultOptions);
          break;
        case 'sliding-window':
        default:
          limiter = new SlidingWindow(this.defaultOptions);
      }

      this.limiters.set(key, limiter);
    }

    return this.limiters.get(key);
  }

  check(key) {
    const limiter = this.getLimiter(key);
    this.stats.totalRequests++;

    let result;
    if (this.strategy === 'token-bucket') {
      result = limiter.consume();
    } else if (this.strategy === 'leaky-bucket') {
      // Leaky bucket is async, handle differently
      result = { allowed: limiter.queue.length < limiter.capacity, remaining: limiter.capacity - limiter.queue.length };
    } else {
      result = limiter.record();
    }

    if (result.allowed) {
      this.stats.allowed++;
      this.emit('allowed', { key, ...result });
    } else {
      this.stats.blocked++;
      this.emit('blocked', { key, ...result });
    }

    return result;
  }

  // Middleware for Express/Koa
  middleware(keyFn = (req) => req.ip) {
    return (req, res, next) => {
      const key = keyFn(req);
      const result = this.check(key);

      res.setHeader('X-RateLimit-Remaining', result.remaining);

      if (result.reset) {
        res.setHeader('X-RateLimit-Reset', Math.ceil(result.reset / 1000));
      }

      if (!result.allowed) {
        res.setHeader('Retry-After', Math.ceil(result.retryAfter / 1000));
        res.status(429).json({
          error: 'Too Many Requests',
          retryAfter: result.retryAfter
        });
        return;
      }

      next();
    };
  }

  // Decorator for functions
  wrap(fn, keyFn = () => 'default') {
    return async (...args) => {
      const key = keyFn(...args);
      const result = this.check(key);

      if (!result.allowed) {
        const error = new Error('Rate limit exceeded');
        error.retryAfter = result.retryAfter;
        throw error;
      }

      return fn(...args);
    };
  }

  reset(key) {
    this.limiters.delete(key);
  }

  resetAll() {
    this.limiters.clear();
  }

  getStats() {
    return {
      ...this.stats,
      blockRate: this.stats.totalRequests > 0
        ? ((this.stats.blocked / this.stats.totalRequests) * 100).toFixed(2) + '%'
        : '0%',
      activeLimiters: this.limiters.size
    };
  }
}

// ============================================
// DISTRIBUTED RATE LIMITER
// ============================================

class DistributedRateLimiter extends RateLimiter {
  constructor(options = {}) {
    super(options);
    this.store = options.store; // Redis client or similar
    this.prefix = options.prefix || 'ratelimit:';
  }

  async check(key) {
    if (!this.store) {
      return super.check(key);
    }

    const storeKey = this.prefix + key;
    const now = Date.now();
    const windowStart = now - this.defaultOptions.windowSize;

    // Using Redis sorted set for sliding window
    await this.store.zremrangebyscore(storeKey, 0, windowStart);

    const count = await this.store.zcard(storeKey);

    if (count >= this.defaultOptions.maxRequests) {
      const oldest = await this.store.zrange(storeKey, 0, 0, 'WITHSCORES');
      const retryAfter = oldest.length > 0
        ? this.defaultOptions.windowSize - (now - parseFloat(oldest[1]))
        : 1000;

      this.stats.blocked++;
      return { allowed: false, remaining: 0, retryAfter };
    }

    await this.store.zadd(storeKey, now, `${now}-${Math.random()}`);
    await this.store.expire(storeKey, Math.ceil(this.defaultOptions.windowSize / 1000));

    this.stats.allowed++;
    return {
      allowed: true,
      remaining: this.defaultOptions.maxRequests - count - 1
    };
  }
}

// ============================================
// ADAPTIVE RATE LIMITER
// ============================================

class AdaptiveRateLimiter extends RateLimiter {
  constructor(options = {}) {
    super(options);
    this.minRate = options.minRate || 10;
    this.maxRate = options.maxRate || 1000;
    this.targetLatency = options.targetLatency || 100; // ms
    this.adjustInterval = options.adjustInterval || 5000;
    this.latencies = [];

    this.startAdaptation();
  }

  recordLatency(latency) {
    this.latencies.push(latency);
    if (this.latencies.length > 100) {
      this.latencies.shift();
    }
  }

  startAdaptation() {
    setInterval(() => {
      if (this.latencies.length === 0) return;

      const avgLatency = this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;

      // Adjust rate based on latency
      if (avgLatency > this.targetLatency * 1.5) {
        // Decrease rate
        this.defaultOptions.maxRequests = Math.max(
          this.minRate,
          Math.floor(this.defaultOptions.maxRequests * 0.8)
        );
        this.emit('rateDecreased', { newRate: this.defaultOptions.maxRequests, avgLatency });
      } else if (avgLatency < this.targetLatency * 0.5) {
        // Increase rate
        this.defaultOptions.maxRequests = Math.min(
          this.maxRate,
          Math.floor(this.defaultOptions.maxRequests * 1.2)
        );
        this.emit('rateIncreased', { newRate: this.defaultOptions.maxRequests, avgLatency });
      }

      // Reset limiters with new rate
      this.limiters.clear();
      this.latencies = [];

    }, this.adjustInterval);
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  TokenBucket,
  SlidingWindow,
  FixedWindowCounter,
  LeakyBucket,
  RateLimiter,
  DistributedRateLimiter,
  AdaptiveRateLimiter,

  // Quick creation
  create: (options) => new RateLimiter(options),
  distributed: (options) => new DistributedRateLimiter(options),
  adaptive: (options) => new AdaptiveRateLimiter(options)
};
