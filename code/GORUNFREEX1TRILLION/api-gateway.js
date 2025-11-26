/**
 * GORUNFREEX1TRILLION - API GATEWAY
 * Full-featured API gateway with routing, middleware, and load balancing
 */

const { EventEmitter } = require('events');
const http = require('http');
const https = require('https');
const url = require('url');
const crypto = require('crypto');

// ============================================
// ROUTER
// ============================================

class Router {
  constructor() {
    this.routes = [];
    this.middleware = [];
  }

  use(path, handler) {
    if (typeof path === 'function') {
      this.middleware.push({ path: '/', handler: path });
    } else {
      this.middleware.push({ path, handler });
    }
    return this;
  }

  route(method, path, ...handlers) {
    const pattern = this.pathToRegex(path);
    this.routes.push({
      method: method.toUpperCase(),
      path,
      pattern,
      handlers
    });
    return this;
  }

  get(path, ...handlers) { return this.route('GET', path, ...handlers); }
  post(path, ...handlers) { return this.route('POST', path, ...handlers); }
  put(path, ...handlers) { return this.route('PUT', path, ...handlers); }
  patch(path, ...handlers) { return this.route('PATCH', path, ...handlers); }
  delete(path, ...handlers) { return this.route('DELETE', path, ...handlers); }
  options(path, ...handlers) { return this.route('OPTIONS', path, ...handlers); }
  head(path, ...handlers) { return this.route('HEAD', path, ...handlers); }
  all(path, ...handlers) { return this.route('*', path, ...handlers); }

  pathToRegex(path) {
    const paramNames = [];
    const regexStr = path
      .replace(/\/:(\w+)/g, (_, name) => {
        paramNames.push(name);
        return '/([^/]+)';
      })
      .replace(/\*/g, '.*');

    return {
      regex: new RegExp(`^${regexStr}$`),
      paramNames
    };
  }

  match(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== '*' && route.method !== method) continue;

      const match = pathname.match(route.pattern.regex);
      if (match) {
        const params = {};
        route.pattern.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });
        return { route, params };
      }
    }
    return null;
  }

  getMiddleware(pathname) {
    return this.middleware.filter(m =>
      pathname.startsWith(m.path) || m.path === '/'
    );
  }
}

// ============================================
// CONTEXT (REQUEST/RESPONSE WRAPPER)
// ============================================

class Context {
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.params = {};
    this.query = {};
    this.body = null;
    this.state = {};
    this.startTime = Date.now();
  }

  get method() { return this.req.method; }
  get url() { return this.req.url; }
  get path() { return url.parse(this.req.url).pathname; }
  get headers() { return this.req.headers; }
  get ip() {
    return this.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           this.req.socket.remoteAddress;
  }

  get(header) {
    return this.req.headers[header.toLowerCase()];
  }

  set(header, value) {
    this.res.setHeader(header, value);
    return this;
  }

  status(code) {
    this.res.statusCode = code;
    return this;
  }

  json(data) {
    this.set('Content-Type', 'application/json');
    this.res.end(JSON.stringify(data));
  }

  text(data) {
    this.set('Content-Type', 'text/plain');
    this.res.end(data);
  }

  html(data) {
    this.set('Content-Type', 'text/html');
    this.res.end(data);
  }

  redirect(url, status = 302) {
    this.status(status).set('Location', url);
    this.res.end();
  }

  send(data) {
    if (typeof data === 'object') {
      this.json(data);
    } else {
      this.text(String(data));
    }
  }

  async parseBody() {
    if (this.body !== null) return this.body;

    return new Promise((resolve, reject) => {
      const chunks = [];
      this.req.on('data', chunk => chunks.push(chunk));
      this.req.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        const contentType = this.get('content-type') || '';

        try {
          if (contentType.includes('application/json')) {
            this.body = JSON.parse(raw);
          } else if (contentType.includes('application/x-www-form-urlencoded')) {
            this.body = Object.fromEntries(new URLSearchParams(raw));
          } else {
            this.body = raw;
          }
          resolve(this.body);
        } catch (e) {
          this.body = raw;
          resolve(this.body);
        }
      });
      this.req.on('error', reject);
    });
  }
}

// ============================================
// API GATEWAY
// ============================================

class APIGateway extends EventEmitter {
  constructor(options = {}) {
    super();
    this.router = new Router();
    this.services = new Map();
    this.loadBalancers = new Map();
    this.rateLimiters = new Map();
    this.circuitBreakers = new Map();
    this.options = {
      timeout: options.timeout || 30000,
      maxBodySize: options.maxBodySize || '10mb',
      trustProxy: options.trustProxy || false,
      cors: options.cors || null,
      ...options
    };
  }

  // Register a service
  registerService(name, config) {
    this.services.set(name, {
      name,
      targets: Array.isArray(config.targets) ? config.targets : [config.targets],
      healthCheck: config.healthCheck || '/health',
      timeout: config.timeout || this.options.timeout,
      retries: config.retries || 3,
      stripPrefix: config.stripPrefix !== false,
      ...config
    });

    // Setup load balancer for service
    this.loadBalancers.set(name, new LoadBalancer(
      this.services.get(name).targets,
      config.loadBalancing || 'round-robin'
    ));

    return this;
  }

  // Proxy route to service
  proxy(path, serviceName, options = {}) {
    this.router.all(`${path}*`, async (ctx, next) => {
      const service = this.services.get(serviceName);
      if (!service) {
        ctx.status(503).json({ error: 'Service not found' });
        return;
      }

      const lb = this.loadBalancers.get(serviceName);
      const target = lb.getTarget();

      if (!target) {
        ctx.status(503).json({ error: 'No healthy targets' });
        return;
      }

      // Build target URL
      let targetPath = ctx.path;
      if (service.stripPrefix) {
        targetPath = targetPath.replace(path, '') || '/';
      }

      const targetUrl = new URL(targetPath, target.url);
      targetUrl.search = new URL(ctx.req.url, 'http://localhost').search;

      try {
        const response = await this.proxyRequest(ctx, targetUrl.toString(), service);

        // Copy response
        ctx.status(response.status);
        for (const [key, value] of Object.entries(response.headers)) {
          if (key.toLowerCase() !== 'transfer-encoding') {
            ctx.set(key, value);
          }
        }
        ctx.res.end(response.body);

      } catch (error) {
        lb.markUnhealthy(target);
        this.emit('proxyError', { service: serviceName, target, error });
        ctx.status(502).json({ error: 'Bad Gateway', message: error.message });
      }
    });

    return this;
  }

  async proxyRequest(ctx, targetUrl, service) {
    const parsedUrl = new URL(targetUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const body = ctx.method !== 'GET' && ctx.method !== 'HEAD'
      ? await ctx.parseBody()
      : null;

    return new Promise((resolve, reject) => {
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: ctx.method,
        headers: {
          ...ctx.headers,
          host: parsedUrl.host,
          'x-forwarded-for': ctx.ip,
          'x-forwarded-proto': ctx.get('x-forwarded-proto') || 'http',
          'x-forwarded-host': ctx.get('host')
        },
        timeout: service.timeout
      };

      const req = protocol.request(options, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks)
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body) {
        const bodyStr = typeof body === 'object' ? JSON.stringify(body) : body;
        req.write(bodyStr);
      }

      req.end();
    });
  }

  // Add middleware
  use(path, handler) {
    this.router.use(path, handler);
    return this;
  }

  // Add route
  route(method, path, ...handlers) {
    this.router.route(method, path, ...handlers);
    return this;
  }

  get(path, ...handlers) { return this.route('GET', path, ...handlers); }
  post(path, ...handlers) { return this.route('POST', path, ...handlers); }
  put(path, ...handlers) { return this.route('PUT', path, ...handlers); }
  patch(path, ...handlers) { return this.route('PATCH', path, ...handlers); }
  delete(path, ...handlers) { return this.route('DELETE', path, ...handlers); }

  // Handle request
  async handleRequest(req, res) {
    const ctx = new Context(req, res);

    // Parse query string
    const parsedUrl = url.parse(req.url, true);
    ctx.query = parsedUrl.query;

    try {
      // Run middleware
      const middleware = this.router.getMiddleware(ctx.path);
      for (const mw of middleware) {
        let nextCalled = false;
        await mw.handler(ctx, () => { nextCalled = true; });
        if (!nextCalled || res.writableEnded) return;
      }

      // Match route
      const match = this.router.match(ctx.method, ctx.path);

      if (!match) {
        ctx.status(404).json({ error: 'Not Found' });
        return;
      }

      ctx.params = match.params;

      // Run route handlers
      for (const handler of match.route.handlers) {
        let nextCalled = false;
        await handler(ctx, () => { nextCalled = true; });
        if (!nextCalled || res.writableEnded) return;
      }

    } catch (error) {
      this.emit('error', { error, ctx });
      if (!res.writableEnded) {
        ctx.status(500).json({ error: 'Internal Server Error', message: error.message });
      }
    } finally {
      this.emit('request', {
        method: ctx.method,
        path: ctx.path,
        status: res.statusCode,
        duration: Date.now() - ctx.startTime,
        ip: ctx.ip
      });
    }
  }

  // Create HTTP server
  listen(port, callback) {
    const server = http.createServer((req, res) => this.handleRequest(req, res));
    server.listen(port, callback);
    return server;
  }
}

// ============================================
// LOAD BALANCER
// ============================================

class LoadBalancer {
  constructor(targets, strategy = 'round-robin') {
    this.targets = targets.map(t => ({
      url: typeof t === 'string' ? t : t.url,
      weight: t.weight || 1,
      healthy: true,
      connections: 0,
      lastUsed: 0
    }));
    this.strategy = strategy;
    this.currentIndex = 0;
  }

  getTarget() {
    const healthyTargets = this.targets.filter(t => t.healthy);
    if (healthyTargets.length === 0) return null;

    switch (this.strategy) {
      case 'round-robin':
        return this.roundRobin(healthyTargets);
      case 'weighted':
        return this.weighted(healthyTargets);
      case 'least-connections':
        return this.leastConnections(healthyTargets);
      case 'random':
        return this.random(healthyTargets);
      case 'ip-hash':
        return this.ipHash(healthyTargets);
      default:
        return this.roundRobin(healthyTargets);
    }
  }

  roundRobin(targets) {
    const target = targets[this.currentIndex % targets.length];
    this.currentIndex++;
    target.lastUsed = Date.now();
    return target;
  }

  weighted(targets) {
    const totalWeight = targets.reduce((sum, t) => sum + t.weight, 0);
    let random = Math.random() * totalWeight;

    for (const target of targets) {
      random -= target.weight;
      if (random <= 0) {
        target.lastUsed = Date.now();
        return target;
      }
    }
    return targets[0];
  }

  leastConnections(targets) {
    const target = targets.reduce((min, t) =>
      t.connections < min.connections ? t : min
    );
    target.connections++;
    target.lastUsed = Date.now();
    return target;
  }

  random(targets) {
    const target = targets[Math.floor(Math.random() * targets.length)];
    target.lastUsed = Date.now();
    return target;
  }

  ipHash(targets, ip = '127.0.0.1') {
    const hash = crypto.createHash('md5').update(ip).digest('hex');
    const index = parseInt(hash.slice(0, 8), 16) % targets.length;
    const target = targets[index];
    target.lastUsed = Date.now();
    return target;
  }

  markUnhealthy(target) {
    target.healthy = false;
    // Auto-recover after 30 seconds
    setTimeout(() => { target.healthy = true; }, 30000);
  }

  releaseConnection(target) {
    target.connections = Math.max(0, target.connections - 1);
  }

  getStats() {
    return this.targets.map(t => ({
      url: t.url,
      healthy: t.healthy,
      connections: t.connections,
      weight: t.weight
    }));
  }
}

// ============================================
// BUILT-IN MIDDLEWARE
// ============================================

const middleware = {
  // CORS middleware
  cors(options = {}) {
    const defaults = {
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      headers: 'Content-Type,Authorization',
      credentials: false,
      maxAge: 86400
    };
    const config = { ...defaults, ...options };

    return async (ctx, next) => {
      const origin = ctx.get('origin');

      // Handle origin
      if (typeof config.origin === 'function') {
        ctx.set('Access-Control-Allow-Origin', config.origin(origin));
      } else if (config.origin === true) {
        ctx.set('Access-Control-Allow-Origin', origin || '*');
      } else {
        ctx.set('Access-Control-Allow-Origin', config.origin);
      }

      if (config.credentials) {
        ctx.set('Access-Control-Allow-Credentials', 'true');
      }

      // Handle preflight
      if (ctx.method === 'OPTIONS') {
        ctx.set('Access-Control-Allow-Methods', config.methods);
        ctx.set('Access-Control-Allow-Headers', config.headers);
        ctx.set('Access-Control-Max-Age', String(config.maxAge));
        ctx.status(204);
        ctx.res.end();
        return;
      }

      await next();
    };
  },

  // Body parser
  bodyParser(options = {}) {
    return async (ctx, next) => {
      if (['POST', 'PUT', 'PATCH'].includes(ctx.method)) {
        await ctx.parseBody();
      }
      await next();
    };
  },

  // Request logging
  logger(options = {}) {
    return async (ctx, next) => {
      const start = Date.now();
      await next();
      const duration = Date.now() - start;

      const log = `${ctx.method} ${ctx.path} ${ctx.res.statusCode} ${duration}ms`;

      if (options.logger) {
        options.logger(log);
      } else {
        console.log(`[Gateway] ${log}`);
      }
    };
  },

  // Rate limiting
  rateLimit(options = {}) {
    const windowMs = options.windowMs || 60000;
    const max = options.max || 100;
    const store = new Map();

    return async (ctx, next) => {
      const key = options.keyGenerator ? options.keyGenerator(ctx) : ctx.ip;
      const now = Date.now();

      let record = store.get(key);
      if (!record || now - record.start > windowMs) {
        record = { count: 0, start: now };
        store.set(key, record);
      }

      record.count++;

      ctx.set('X-RateLimit-Limit', String(max));
      ctx.set('X-RateLimit-Remaining', String(Math.max(0, max - record.count)));
      ctx.set('X-RateLimit-Reset', String(Math.ceil((record.start + windowMs) / 1000)));

      if (record.count > max) {
        ctx.status(429).json({
          error: 'Too Many Requests',
          retryAfter: Math.ceil((record.start + windowMs - now) / 1000)
        });
        return;
      }

      await next();
    };
  },

  // Authentication
  auth(options = {}) {
    return async (ctx, next) => {
      const authHeader = ctx.get('authorization');

      if (!authHeader) {
        if (options.optional) return next();
        ctx.status(401).json({ error: 'Authorization required' });
        return;
      }

      const [scheme, token] = authHeader.split(' ');

      if (options.bearer && scheme === 'Bearer') {
        try {
          ctx.state.user = await options.bearer(token);
          return next();
        } catch (e) {
          ctx.status(401).json({ error: 'Invalid token' });
          return;
        }
      }

      if (options.basic && scheme === 'Basic') {
        const decoded = Buffer.from(token, 'base64').toString();
        const [username, password] = decoded.split(':');
        try {
          ctx.state.user = await options.basic(username, password);
          return next();
        } catch (e) {
          ctx.status(401).json({ error: 'Invalid credentials' });
          return;
        }
      }

      if (options.apiKey) {
        const apiKey = ctx.get('x-api-key') || ctx.query.api_key;
        if (apiKey) {
          try {
            ctx.state.user = await options.apiKey(apiKey);
            return next();
          } catch (e) {
            ctx.status(401).json({ error: 'Invalid API key' });
            return;
          }
        }
      }

      ctx.status(401).json({ error: 'Authentication failed' });
    };
  },

  // Request timeout
  timeout(ms = 30000) {
    return async (ctx, next) => {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), ms);
      });

      try {
        await Promise.race([next(), timeoutPromise]);
      } catch (error) {
        if (error.message === 'Request timeout') {
          ctx.status(504).json({ error: 'Gateway Timeout' });
        } else {
          throw error;
        }
      }
    };
  },

  // Response compression
  compress() {
    const zlib = require('zlib');

    return async (ctx, next) => {
      await next();

      const acceptEncoding = ctx.get('accept-encoding') || '';

      // Only compress if response hasn't been sent and accepts encoding
      if (!ctx.res.writableEnded && acceptEncoding.includes('gzip')) {
        const originalEnd = ctx.res.end.bind(ctx.res);
        ctx.res.end = (data) => {
          if (data && data.length > 1024) {
            ctx.set('Content-Encoding', 'gzip');
            zlib.gzip(data, (err, compressed) => {
              if (!err) {
                originalEnd(compressed);
              } else {
                originalEnd(data);
              }
            });
          } else {
            originalEnd(data);
          }
        };
      }
    };
  },

  // Security headers
  security(options = {}) {
    return async (ctx, next) => {
      ctx.set('X-Content-Type-Options', 'nosniff');
      ctx.set('X-Frame-Options', options.frameOptions || 'DENY');
      ctx.set('X-XSS-Protection', '1; mode=block');
      ctx.set('Referrer-Policy', 'strict-origin-when-cross-origin');

      if (options.hsts) {
        ctx.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      }

      if (options.csp) {
        ctx.set('Content-Security-Policy', options.csp);
      }

      await next();
    };
  }
};

// ============================================
// SERVICE REGISTRY
// ============================================

class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.watchers = new Map();
  }

  register(name, instance) {
    if (!this.services.has(name)) {
      this.services.set(name, []);
    }

    const entry = {
      id: crypto.randomBytes(8).toString('hex'),
      name,
      ...instance,
      registeredAt: Date.now(),
      lastHeartbeat: Date.now()
    };

    this.services.get(name).push(entry);
    this.notifyWatchers(name, 'register', entry);

    return entry.id;
  }

  deregister(name, instanceId) {
    const instances = this.services.get(name);
    if (!instances) return false;

    const index = instances.findIndex(i => i.id === instanceId);
    if (index === -1) return false;

    const [removed] = instances.splice(index, 1);
    this.notifyWatchers(name, 'deregister', removed);

    return true;
  }

  heartbeat(name, instanceId) {
    const instances = this.services.get(name);
    if (!instances) return false;

    const instance = instances.find(i => i.id === instanceId);
    if (!instance) return false;

    instance.lastHeartbeat = Date.now();
    return true;
  }

  discover(name) {
    return this.services.get(name) || [];
  }

  discoverOne(name) {
    const instances = this.discover(name);
    if (instances.length === 0) return null;
    return instances[Math.floor(Math.random() * instances.length)];
  }

  watch(name, callback) {
    if (!this.watchers.has(name)) {
      this.watchers.set(name, []);
    }
    this.watchers.get(name).push(callback);
  }

  notifyWatchers(name, event, data) {
    const watchers = this.watchers.get(name) || [];
    for (const callback of watchers) {
      callback(event, data);
    }
  }

  list() {
    const result = {};
    for (const [name, instances] of this.services) {
      result[name] = instances.length;
    }
    return result;
  }

  // Cleanup stale instances
  cleanup(maxAge = 60000) {
    const now = Date.now();
    for (const [name, instances] of this.services) {
      const stale = instances.filter(i => now - i.lastHeartbeat > maxAge);
      for (const instance of stale) {
        this.deregister(name, instance.id);
      }
    }
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  APIGateway,
  Router,
  Context,
  LoadBalancer,
  ServiceRegistry,
  middleware,

  // Quick setup
  createGateway: (options) => new APIGateway(options),
  createRegistry: () => new ServiceRegistry()
};
