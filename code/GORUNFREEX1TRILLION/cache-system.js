/**
 * GORUNFREEX1TRILLION - CACHE SYSTEM
 * High-performance caching with multiple strategies
 */

const { EventEmitter } = require('events');

// ============================================
// LRU CACHE
// ============================================

class LRUCache extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxSize = options.maxSize || 1000;
    this.maxAge = options.maxAge || 0; // 0 = no expiry
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check expiry
    if (this.maxAge > 0 && Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, { ...entry, timestamp: Date.now() });

    this.stats.hits++;
    return entry.value;
  }

  set(key, value, ttl = null) {
    // Delete if exists to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      this.emit('eviction', oldestKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.maxAge
    });

    return this;
  }

  has(key) {
    return this.cache.has(key);
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
    return this;
  }

  get size() {
    return this.cache.size;
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : '0%'
    };
  }

  // Get or compute
  async getOrSet(key, compute, ttl = null) {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const value = await compute();
    this.set(key, value, ttl);
    return value;
  }

  // Memoize a function
  memoize(fn, keyFn = (...args) => JSON.stringify(args)) {
    return async (...args) => {
      const key = keyFn(...args);
      return this.getOrSet(key, () => fn(...args));
    };
  }
}

// ============================================
// MULTI-TIER CACHE
// ============================================

class MultiTierCache {
  constructor(tiers = []) {
    this.tiers = tiers.length > 0 ? tiers : [
      new LRUCache({ maxSize: 100, maxAge: 60000 }),   // L1: Small, fast
      new LRUCache({ maxSize: 1000, maxAge: 300000 }), // L2: Larger, slower
    ];
  }

  async get(key) {
    for (let i = 0; i < this.tiers.length; i++) {
      const value = this.tiers[i].get(key);

      if (value !== undefined) {
        // Populate higher tiers
        for (let j = 0; j < i; j++) {
          this.tiers[j].set(key, value);
        }
        return value;
      }
    }

    return undefined;
  }

  set(key, value, options = {}) {
    const tierIndex = options.tier !== undefined ? options.tier : 0;

    for (let i = tierIndex; i < this.tiers.length; i++) {
      this.tiers[i].set(key, value);
    }

    return this;
  }

  delete(key) {
    for (const tier of this.tiers) {
      tier.delete(key);
    }
    return this;
  }

  clear() {
    for (const tier of this.tiers) {
      tier.clear();
    }
    return this;
  }

  getStats() {
    return this.tiers.map((tier, i) => ({
      tier: i,
      ...tier.getStats()
    }));
  }
}

// ============================================
// CACHE DECORATORS
// ============================================

function cached(cache, options = {}) {
  const keyPrefix = options.prefix || '';
  const ttl = options.ttl || null;
  const keyFn = options.keyFn || ((...args) => JSON.stringify(args));

  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      const key = `${keyPrefix}${propertyKey}:${keyFn(...args)}`;

      const cachedValue = cache.get(key);
      if (cachedValue !== undefined) {
        return cachedValue;
      }

      const result = await originalMethod.apply(this, args);
      cache.set(key, result, ttl);
      return result;
    };

    return descriptor;
  };
}

function invalidates(cache, pattern) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      const result = await originalMethod.apply(this, args);

      // Clear matching cache entries
      if (typeof pattern === 'function') {
        const keys = pattern(...args);
        keys.forEach(key => cache.delete(key));
      } else if (pattern instanceof RegExp) {
        // Would need cache to expose keys iterator
      }

      return result;
    };

    return descriptor;
  };
}

// ============================================
// DISTRIBUTED CACHE ADAPTER
// ============================================

class DistributedCache {
  constructor(options = {}) {
    this.localCache = new LRUCache({ maxSize: options.localSize || 100 });
    this.remoteClient = options.client; // Redis, Memcached, etc.
    this.prefix = options.prefix || 'noisy:';
    this.defaultTTL = options.ttl || 3600;
  }

  async get(key) {
    // Check local first
    const local = this.localCache.get(key);
    if (local !== undefined) return local;

    // Check remote
    if (this.remoteClient) {
      const remote = await this.remoteClient.get(this.prefix + key);
      if (remote) {
        const value = JSON.parse(remote);
        this.localCache.set(key, value);
        return value;
      }
    }

    return undefined;
  }

  async set(key, value, ttl = null) {
    const actualTTL = ttl || this.defaultTTL;

    this.localCache.set(key, value, actualTTL * 1000);

    if (this.remoteClient) {
      await this.remoteClient.setex(
        this.prefix + key,
        actualTTL,
        JSON.stringify(value)
      );
    }

    return this;
  }

  async delete(key) {
    this.localCache.delete(key);

    if (this.remoteClient) {
      await this.remoteClient.del(this.prefix + key);
    }

    return this;
  }

  async clear() {
    this.localCache.clear();

    if (this.remoteClient) {
      const keys = await this.remoteClient.keys(this.prefix + '*');
      if (keys.length > 0) {
        await this.remoteClient.del(...keys);
      }
    }

    return this;
  }
}

// ============================================
// CACHE WARMING
// ============================================

class CacheWarmer {
  constructor(cache) {
    this.cache = cache;
    this.warmers = [];
  }

  register(name, fetcher, options = {}) {
    this.warmers.push({
      name,
      fetcher,
      interval: options.interval || 300000, // 5 minutes
      keys: options.keys || null,
      running: false
    });
    return this;
  }

  async warmAll() {
    const results = await Promise.allSettled(
      this.warmers.map(w => this.runWarmer(w))
    );

    return results.map((result, i) => ({
      warmer: this.warmers[i].name,
      success: result.status === 'fulfilled',
      error: result.reason?.message
    }));
  }

  async runWarmer(warmer) {
    if (warmer.running) return;
    warmer.running = true;

    try {
      const data = await warmer.fetcher();

      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.key && item.value !== undefined) {
            this.cache.set(item.key, item.value);
          }
        }
      } else if (typeof data === 'object') {
        for (const [key, value] of Object.entries(data)) {
          this.cache.set(key, value);
        }
      }
    } finally {
      warmer.running = false;
    }
  }

  startAutoWarm() {
    for (const warmer of this.warmers) {
      this.runWarmer(warmer);
      setInterval(() => this.runWarmer(warmer), warmer.interval);
    }
    return this;
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  LRUCache,
  MultiTierCache,
  DistributedCache,
  CacheWarmer,
  cached,
  invalidates,

  // Quick cache creation
  create: (options) => new LRUCache(options),
  multiTier: (tiers) => new MultiTierCache(tiers)
};
