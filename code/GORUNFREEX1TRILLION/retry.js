/**
 * GORUNFREEX1TRILLION - RETRY & RESILIENCE
 * Advanced retry patterns and fault tolerance
 */

const { EventEmitter } = require('events');

// ============================================
// RETRY STRATEGIES
// ============================================

const BackoffStrategies = {
  // Fixed delay between retries
  fixed: (attempt, delay) => delay,

  // Linear increase: delay * attempt
  linear: (attempt, delay) => delay * attempt,

  // Exponential: delay * 2^attempt
  exponential: (attempt, delay) => delay * Math.pow(2, attempt),

  // Exponential with jitter
  exponentialJitter: (attempt, delay) => {
    const exp = delay * Math.pow(2, attempt);
    const jitter = Math.random() * exp * 0.3; // 30% jitter
    return exp + jitter;
  },

  // Fibonacci sequence
  fibonacci: (attempt, delay) => {
    const fib = [1, 1];
    for (let i = 2; i <= attempt; i++) {
      fib[i] = fib[i - 1] + fib[i - 2];
    }
    return delay * fib[attempt];
  },

  // Decorrelated jitter (AWS recommended)
  decorrelatedJitter: (attempt, delay, prevDelay = delay) => {
    return Math.min(
      delay * 60, // cap at 60x base delay
      Math.random() * (prevDelay * 3 - delay) + delay
    );
  }
};

// ============================================
// RETRY FUNCTION
// ============================================

async function retry(fn, options = {}) {
  const {
    maxAttempts = 3,
    delay = 1000,
    maxDelay = 30000,
    backoff = 'exponential',
    retryIf = () => true,
    onRetry = () => {},
    timeout = 0,
    abortSignal = null
  } = options;

  const backoffFn = typeof backoff === 'function'
    ? backoff
    : BackoffStrategies[backoff] || BackoffStrategies.exponential;

  let lastError;
  let prevDelay = delay;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Check abort signal
    if (abortSignal?.aborted) {
      throw new Error('Retry aborted');
    }

    try {
      // With optional timeout
      if (timeout > 0) {
        return await Promise.race([
          fn(attempt),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeout)
          )
        ]);
      }

      return await fn(attempt);

    } catch (error) {
      lastError = error;

      // Check if should retry
      if (attempt >= maxAttempts - 1 || !retryIf(error, attempt)) {
        throw error;
      }

      // Calculate delay
      const waitTime = Math.min(
        backoffFn(attempt, delay, prevDelay),
        maxDelay
      );
      prevDelay = waitTime;

      // Notify retry
      onRetry({
        attempt: attempt + 1,
        error,
        nextDelay: waitTime
      });

      // Wait before retry
      await sleep(waitTime);
    }
  }

  throw lastError;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// CIRCUIT BREAKER
// ============================================

class CircuitBreaker extends EventEmitter {
  constructor(options = {}) {
    super();
    this.name = options.name || 'circuit';
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 3;
    this.timeout = options.timeout || 30000;
    this.halfOpenRequests = options.halfOpenRequests || 3;

    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailure = null;
    this.halfOpenCount = 0;
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rejectedCalls: 0,
      timeouts: 0
    };
  }

  async execute(fn, fallback = null) {
    this.stats.totalCalls++;

    // Check state
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.timeout) {
        this.transition('HALF_OPEN');
      } else {
        this.stats.rejectedCalls++;
        this.emit('rejected', { state: this.state });

        if (fallback) {
          return fallback();
        }
        throw new Error(`Circuit breaker is ${this.state}`);
      }
    }

    if (this.state === 'HALF_OPEN' && this.halfOpenCount >= this.halfOpenRequests) {
      this.stats.rejectedCalls++;
      if (fallback) return fallback();
      throw new Error('Circuit breaker half-open limit reached');
    }

    try {
      if (this.state === 'HALF_OPEN') {
        this.halfOpenCount++;
      }

      const result = await fn();
      this.onSuccess();
      return result;

    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  onSuccess() {
    this.stats.successfulCalls++;
    this.failures = 0;
    this.successes++;

    if (this.state === 'HALF_OPEN') {
      if (this.successes >= this.successThreshold) {
        this.transition('CLOSED');
      }
    }

    this.emit('success', { state: this.state });
  }

  onFailure(error) {
    this.stats.failedCalls++;
    this.failures++;
    this.successes = 0;
    this.lastFailure = Date.now();

    if (error.message === 'Timeout') {
      this.stats.timeouts++;
    }

    if (this.failures >= this.failureThreshold) {
      this.transition('OPEN');
    }

    this.emit('failure', { state: this.state, error });
  }

  transition(newState) {
    const prevState = this.state;
    this.state = newState;

    if (newState === 'HALF_OPEN') {
      this.halfOpenCount = 0;
      this.successes = 0;
    }

    if (newState === 'CLOSED') {
      this.failures = 0;
      this.successes = 0;
    }

    this.emit('stateChange', { from: prevState, to: newState });
  }

  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailure = null;
    this.halfOpenCount = 0;
    this.emit('reset');
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      stats: { ...this.stats }
    };
  }
}

// ============================================
// BULKHEAD
// ============================================

class Bulkhead extends EventEmitter {
  constructor(options = {}) {
    super();
    this.name = options.name || 'bulkhead';
    this.maxConcurrent = options.maxConcurrent || 10;
    this.maxQueue = options.maxQueue || 100;
    this.queueTimeout = options.queueTimeout || 30000;

    this.running = 0;
    this.queue = [];
    this.stats = {
      executed: 0,
      queued: 0,
      rejected: 0,
      timedOut: 0
    };
  }

  async execute(fn) {
    // Check if can execute immediately
    if (this.running < this.maxConcurrent) {
      return this.run(fn);
    }

    // Check queue limit
    if (this.queue.length >= this.maxQueue) {
      this.stats.rejected++;
      this.emit('rejected', { queueLength: this.queue.length });
      throw new Error('Bulkhead queue full');
    }

    // Add to queue
    return new Promise((resolve, reject) => {
      const item = {
        fn,
        resolve,
        reject,
        timestamp: Date.now()
      };

      // Set timeout
      item.timer = setTimeout(() => {
        const index = this.queue.indexOf(item);
        if (index > -1) {
          this.queue.splice(index, 1);
          this.stats.timedOut++;
          reject(new Error('Bulkhead queue timeout'));
        }
      }, this.queueTimeout);

      this.queue.push(item);
      this.stats.queued++;
      this.emit('queued', { queueLength: this.queue.length });
    });
  }

  async run(fn) {
    this.running++;

    try {
      const result = await fn();
      this.stats.executed++;
      return result;

    } finally {
      this.running--;
      this.processQueue();
    }
  }

  processQueue() {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift();
      clearTimeout(item.timer);

      this.run(item.fn)
        .then(item.resolve)
        .catch(item.reject);
    }
  }

  getState() {
    return {
      running: this.running,
      queueLength: this.queue.length,
      stats: { ...this.stats }
    };
  }
}

// ============================================
// TIMEOUT WRAPPER
// ============================================

async function withTimeout(fn, ms, fallback = null) {
  return Promise.race([
    fn(),
    new Promise((resolve, reject) =>
      setTimeout(() => {
        if (fallback !== null) {
          resolve(fallback);
        } else {
          reject(new Error('Operation timeout'));
        }
      }, ms)
    )
  ]);
}

// ============================================
// FALLBACK WRAPPER
// ============================================

async function withFallback(fn, fallbackFn) {
  try {
    return await fn();
  } catch (error) {
    if (typeof fallbackFn === 'function') {
      return fallbackFn(error);
    }
    return fallbackFn;
  }
}

// ============================================
// CACHE-ASIDE PATTERN
// ============================================

class CacheAside {
  constructor(options = {}) {
    this.cache = options.cache || new Map();
    this.ttl = options.ttl || 60000;
    this.staleWhileRevalidate = options.staleWhileRevalidate || false;
  }

  async get(key, fetchFn) {
    const cached = this.cache.get(key);

    if (cached) {
      const { value, timestamp } = cached;
      const age = Date.now() - timestamp;

      if (age < this.ttl) {
        return value;
      }

      if (this.staleWhileRevalidate) {
        // Return stale, revalidate in background
        this.revalidate(key, fetchFn);
        return value;
      }
    }

    // Fetch fresh data
    const value = await fetchFn();
    this.cache.set(key, { value, timestamp: Date.now() });
    return value;
  }

  async revalidate(key, fetchFn) {
    try {
      const value = await fetchFn();
      this.cache.set(key, { value, timestamp: Date.now() });
    } catch (error) {
      // Keep stale value on error
    }
  }

  invalidate(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

// ============================================
// RESILIENCE POLICY BUILDER
// ============================================

class ResiliencePolicy {
  constructor() {
    this.policies = [];
  }

  retry(options) {
    this.policies.push({
      type: 'retry',
      options
    });
    return this;
  }

  circuitBreaker(options) {
    this.policies.push({
      type: 'circuitBreaker',
      instance: new CircuitBreaker(options)
    });
    return this;
  }

  bulkhead(options) {
    this.policies.push({
      type: 'bulkhead',
      instance: new Bulkhead(options)
    });
    return this;
  }

  timeout(ms) {
    this.policies.push({
      type: 'timeout',
      ms
    });
    return this;
  }

  fallback(fallbackFn) {
    this.policies.push({
      type: 'fallback',
      fallbackFn
    });
    return this;
  }

  async execute(fn) {
    let wrappedFn = fn;

    // Apply policies in reverse order (innermost first)
    for (let i = this.policies.length - 1; i >= 0; i--) {
      const policy = this.policies[i];
      const currentFn = wrappedFn;

      switch (policy.type) {
        case 'retry':
          wrappedFn = () => retry(currentFn, policy.options);
          break;

        case 'circuitBreaker':
          wrappedFn = () => policy.instance.execute(currentFn);
          break;

        case 'bulkhead':
          wrappedFn = () => policy.instance.execute(currentFn);
          break;

        case 'timeout':
          wrappedFn = () => withTimeout(currentFn, policy.ms);
          break;

        case 'fallback':
          wrappedFn = () => withFallback(currentFn, policy.fallbackFn);
          break;
      }
    }

    return wrappedFn();
  }

  wrap(fn) {
    return (...args) => this.execute(() => fn(...args));
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  retry,
  BackoffStrategies,
  CircuitBreaker,
  Bulkhead,
  CacheAside,
  ResiliencePolicy,
  withTimeout,
  withFallback,
  sleep,

  // Quick creation
  policy: () => new ResiliencePolicy(),
  breaker: (options) => new CircuitBreaker(options),
  bulkhead: (options) => new Bulkhead(options)
};
