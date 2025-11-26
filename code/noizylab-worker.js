/**
 * NOIZYLAB Cloudflare Worker - EDGE COMPUTING POWERHOUSE
 * High-performance edge functions for global deployment
 * Version: 2.0.0
 */

// Configuration
const CONFIG = {
  corsOrigins: ['https://noizylab.com', 'https://app.noizylab.com'],
  rateLimit: { requests: 100, window: 60 },
  cache: { ttl: 3600, staleWhileRevalidate: 86400 }
};

// KV Namespace bindings (configure in wrangler.toml)
// NOIZY_CACHE, NOIZY_SESSIONS, NOIZY_ANALYTICS

// ============================================
// CORE ROUTER
// ============================================

class NoizyRouter {
  constructor() {
    this.routes = new Map();
    this.middleware = [];
  }

  use(fn) {
    this.middleware.push(fn);
    return this;
  }

  on(method, path, handler) {
    const key = `${method.toUpperCase()}:${path}`;
    this.routes.set(key, { handler, pattern: this.pathToRegex(path) });
    return this;
  }

  get(path, handler) { return this.on('GET', path, handler); }
  post(path, handler) { return this.on('POST', path, handler); }
  put(path, handler) { return this.on('PUT', path, handler); }
  delete(path, handler) { return this.on('DELETE', path, handler); }

  pathToRegex(path) {
    const pattern = path
      .replace(/\/:([^/]+)/g, '/(?<$1>[^/]+)')
      .replace(/\//g, '\\/');
    return new RegExp(`^${pattern}$`);
  }

  async handle(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;

    // Run middleware
    const context = { request, env, ctx, url, params: {}, state: {} };

    for (const mw of this.middleware) {
      const result = await mw(context);
      if (result instanceof Response) return result;
    }

    // Find matching route
    for (const [key, route] of this.routes) {
      if (!key.startsWith(method)) continue;

      const match = url.pathname.match(route.pattern);
      if (match) {
        context.params = match.groups || {};
        return route.handler(context);
      }
    }

    return new Response('Not Found', { status: 404 });
  }
}

// ============================================
// MIDDLEWARE
// ============================================

// CORS Handler
const corsMiddleware = (context) => {
  const origin = context.request.headers.get('Origin');

  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': CONFIG.corsOrigins.includes(origin) ? origin : CONFIG.corsOrigins[0],
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  context.state.corsOrigin = CONFIG.corsOrigins.includes(origin) ? origin : CONFIG.corsOrigins[0];
};

// Rate Limiter
const rateLimitMiddleware = async (context) => {
  const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = `ratelimit:${ip}`;

  if (context.env.NOIZY_CACHE) {
    const current = await context.env.NOIZY_CACHE.get(key);
    const count = current ? parseInt(current) : 0;

    if (count >= CONFIG.rateLimit.requests) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
      });
    }

    await context.env.NOIZY_CACHE.put(key, String(count + 1), { expirationTtl: CONFIG.rateLimit.window });
  }
};

// Auth Middleware
const authMiddleware = async (context) => {
  const authHeader = context.request.headers.get('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    // Validate JWT or session token
    context.state.authenticated = true;
    context.state.token = token;
  }
};

// ============================================
// API HANDLERS
// ============================================

const handlers = {
  // Health check
  health: (ctx) => json({ status: 'OK', timestamp: Date.now(), edge: ctx.request.cf?.colo }),

  // Analytics tracking
  track: async (ctx) => {
    const body = await ctx.request.json();
    const event = {
      ...body,
      timestamp: Date.now(),
      ip: ctx.request.headers.get('CF-Connecting-IP'),
      country: ctx.request.cf?.country,
      userAgent: ctx.request.headers.get('User-Agent')
    };

    // Store in KV or send to analytics service
    if (ctx.env.NOIZY_ANALYTICS) {
      const key = `event:${Date.now()}:${crypto.randomUUID()}`;
      await ctx.env.NOIZY_ANALYTICS.put(key, JSON.stringify(event), { expirationTtl: 86400 * 30 });
    }

    return json({ success: true, eventId: crypto.randomUUID() });
  },

  // Dynamic data endpoint
  getData: async (ctx) => {
    const { id } = ctx.params;

    // Check cache first
    if (ctx.env.NOIZY_CACHE) {
      const cached = await ctx.env.NOIZY_CACHE.get(`data:${id}`);
      if (cached) {
        return json(JSON.parse(cached), { 'X-Cache': 'HIT' });
      }
    }

    // Fetch and cache
    const data = { id, generated: Date.now(), source: 'origin' };

    if (ctx.env.NOIZY_CACHE) {
      await ctx.env.NOIZY_CACHE.put(`data:${id}`, JSON.stringify(data), { expirationTtl: CONFIG.cache.ttl });
    }

    return json(data, { 'X-Cache': 'MISS' });
  },

  // Webhook processor
  webhook: async (ctx) => {
    const signature = ctx.request.headers.get('X-Webhook-Signature');
    const body = await ctx.request.text();

    // Verify signature (implement HMAC verification)
    // const isValid = await verifySignature(body, signature, ctx.env.WEBHOOK_SECRET);

    const payload = JSON.parse(body);

    // Process webhook asynchronously
    ctx.ctx.waitUntil(processWebhook(payload, ctx.env));

    return json({ received: true });
  },

  // Image optimization proxy
  imageProxy: async (ctx) => {
    const url = ctx.url.searchParams.get('url');
    const width = parseInt(ctx.url.searchParams.get('w') || '0');
    const quality = parseInt(ctx.url.searchParams.get('q') || '80');

    if (!url) return new Response('Missing URL', { status: 400 });

    const imageRequest = new Request(url, {
      cf: {
        image: {
          width: width || undefined,
          quality,
          format: 'auto'
        }
      }
    });

    return fetch(imageRequest);
  },

  // Server-sent events for real-time updates
  stream: async (ctx) => {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    ctx.ctx.waitUntil((async () => {
      for (let i = 0; i < 10; i++) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ tick: i, time: Date.now() })}\n\n`));
        await new Promise(r => setTimeout(r, 1000));
      }
      await writer.close();
    })());

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  }
};

// ============================================
// UTILITIES
// ============================================

function json(data, headers = {}) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

async function processWebhook(payload, env) {
  // Background webhook processing
  console.log('Processing webhook:', payload.type);
}

// ============================================
// WORKER ENTRY POINT
// ============================================

const router = new NoizyRouter();

// Apply middleware
router.use(corsMiddleware);
router.use(rateLimitMiddleware);
router.use(authMiddleware);

// Register routes
router.get('/health', handlers.health);
router.get('/api/data/:id', handlers.getData);
router.post('/api/track', handlers.track);
router.post('/api/webhook', handlers.webhook);
router.get('/api/stream', handlers.stream);
router.get('/img', handlers.imageProxy);

// Export for Cloudflare Workers
export default {
  async fetch(request, env, ctx) {
    try {
      const response = await router.handle(request, env, ctx);

      // Add CORS headers to response
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', '*');

      return new Response(response.body, {
        status: response.status,
        headers
      });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  // Scheduled tasks (cron triggers)
  async scheduled(event, env, ctx) {
    switch (event.cron) {
      case '0 * * * *': // Every hour
        await cleanupExpiredData(env);
        break;
      case '0 0 * * *': // Daily
        await generateDailyReport(env);
        break;
    }
  }
};

async function cleanupExpiredData(env) {
  console.log('Running cleanup task...');
}

async function generateDailyReport(env) {
  console.log('Generating daily report...');
}
