/**
 * GORUNFREEX1TRILLION - API CLIENT
 * High-performance HTTP client with retry, caching, and circuit breaker
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// ============================================
// CIRCUIT BREAKER
// ============================================

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.halfOpenRequests = options.halfOpenRequests || 3;

    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailure = null;
    this.halfOpenSuccesses = 0;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.halfOpenSuccesses = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.successes++;

    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.halfOpenRequests) {
        this.state = 'CLOSED';
      }
    }
  }

  onFailure() {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes
    };
  }
}

// ============================================
// API CLIENT
// ============================================

class NoizyAPIClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || '';
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.headers = options.headers || {};

    this.circuitBreaker = options.circuitBreaker
      ? new CircuitBreaker(options.circuitBreaker)
      : null;

    this.interceptors = {
      request: [],
      response: []
    };

    this.cache = options.cache || null;
    this.stats = { requests: 0, success: 0, failed: 0, retried: 0 };
  }

  // Interceptors
  useRequestInterceptor(fn) {
    this.interceptors.request.push(fn);
    return this;
  }

  useResponseInterceptor(fn) {
    this.interceptors.response.push(fn);
    return this;
  }

  // HTTP Methods
  async get(path, options = {}) {
    return this.request('GET', path, null, options);
  }

  async post(path, data, options = {}) {
    return this.request('POST', path, data, options);
  }

  async put(path, data, options = {}) {
    return this.request('PUT', path, data, options);
  }

  async patch(path, data, options = {}) {
    return this.request('PATCH', path, data, options);
  }

  async delete(path, options = {}) {
    return this.request('DELETE', path, null, options);
  }

  // Core request method
  async request(method, path, data = null, options = {}) {
    this.stats.requests++;

    let config = {
      method,
      url: this.baseURL + path,
      data,
      headers: { ...this.headers, ...options.headers },
      timeout: options.timeout || this.timeout
    };

    // Run request interceptors
    for (const interceptor of this.interceptors.request) {
      config = await interceptor(config);
    }

    // Check cache for GET requests
    if (method === 'GET' && this.cache && !options.noCache) {
      const cached = this.cache.get(config.url);
      if (cached) return cached;
    }

    // Execute with circuit breaker if enabled
    const execute = () => this.executeRequest(config, options);

    let response;
    if (this.circuitBreaker) {
      response = await this.circuitBreaker.execute(execute);
    } else {
      response = await execute();
    }

    // Cache GET responses
    if (method === 'GET' && this.cache && !options.noCache) {
      this.cache.set(config.url, response, options.cacheTTL);
    }

    return response;
  }

  async executeRequest(config, options) {
    let lastError;

    for (let attempt = 0; attempt <= (options.retries ?? this.retries); attempt++) {
      if (attempt > 0) {
        this.stats.retried++;
        await this.delay(this.retryDelay * Math.pow(2, attempt - 1));
      }

      try {
        const response = await this.httpRequest(config);

        // Run response interceptors
        let processedResponse = response;
        for (const interceptor of this.interceptors.response) {
          processedResponse = await interceptor(processedResponse);
        }

        this.stats.success++;
        return processedResponse;

      } catch (error) {
        lastError = error;

        // Don't retry client errors (4xx)
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          break;
        }
      }
    }

    this.stats.failed++;
    throw lastError;
  }

  httpRequest(config) {
    return new Promise((resolve, reject) => {
      const url = new URL(config.url);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...config.headers
        },
        timeout: config.timeout
      };

      const req = client.request(options, (res) => {
        let data = '';

        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            data: this.parseResponse(data, res.headers['content-type'])
          };

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            const error = new Error(`HTTP ${res.statusCode}`);
            error.statusCode = res.statusCode;
            error.response = response;
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (config.data) {
        req.write(JSON.stringify(config.data));
      }

      req.end();
    });
  }

  parseResponse(data, contentType) {
    if (!data) return null;

    if (contentType && contentType.includes('application/json')) {
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    }

    return data;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      ...this.stats,
      circuitBreaker: this.circuitBreaker?.getState()
    };
  }
}

// ============================================
// BATCH REQUEST HANDLER
// ============================================

class BatchRequestHandler {
  constructor(client, options = {}) {
    this.client = client;
    this.batchSize = options.batchSize || 10;
    this.delay = options.delay || 100;
  }

  async batchGet(urls) {
    const results = [];

    for (let i = 0; i < urls.length; i += this.batchSize) {
      const batch = urls.slice(i, i + this.batchSize);
      const batchResults = await Promise.all(
        batch.map(url => this.client.get(url).catch(e => ({ error: e.message })))
      );
      results.push(...batchResults);

      if (i + this.batchSize < urls.length) {
        await new Promise(r => setTimeout(r, this.delay));
      }
    }

    return results;
  }

  async batchPost(requests) {
    const results = [];

    for (let i = 0; i < requests.length; i += this.batchSize) {
      const batch = requests.slice(i, i + this.batchSize);
      const batchResults = await Promise.all(
        batch.map(req =>
          this.client.post(req.url, req.data, req.options)
            .catch(e => ({ error: e.message }))
        )
      );
      results.push(...batchResults);

      if (i + this.batchSize < requests.length) {
        await new Promise(r => setTimeout(r, this.delay));
      }
    }

    return results;
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  NoizyAPIClient,
  CircuitBreaker,
  BatchRequestHandler,

  // Quick client creation
  create: (options) => new NoizyAPIClient(options)
};
