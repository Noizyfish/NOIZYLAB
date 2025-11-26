/**
 * NOIZYLAB - Basic Usage Examples
 * Demonstrates core functionality of GORUNFREEX1TRILLION
 */

// ============================================
// PARALLEL PROCESSING
// ============================================

async function parallelProcessingExample() {
  const { runParallel, ParallelEngine } = require('../code/GORUNFREEX1TRILLION/parallel-engine');

  console.log('\n=== Parallel Processing ===\n');

  // Process items in parallel with controlled concurrency
  const items = Array.from({ length: 100 }, (_, i) => i);

  const results = await ParallelEngine.batch(items, 10, async (item) => {
    // Simulate async work
    await new Promise(r => setTimeout(r, 10));
    return item * 2;
  });

  console.log(`Processed ${results.length} items`);
  console.log(`First 5 results: ${results.slice(0, 5).join(', ')}`);

  // Retry with exponential backoff
  let attempts = 0;
  const result = await ParallelEngine.retry(
    async () => {
      attempts++;
      if (attempts < 3) throw new Error('Simulated failure');
      return 'Success!';
    },
    { maxAttempts: 5, delay: 100 }
  );

  console.log(`Result after ${attempts} attempts: ${result}`);
}

// ============================================
// CACHING
// ============================================

async function cachingExample() {
  const { LRUCache, MultiTierCache } = require('../code/GORUNFREEX1TRILLION/cache-system');

  console.log('\n=== Caching ===\n');

  const cache = new LRUCache({ maxSize: 100, maxAge: 5000 });

  // Basic set/get
  cache.set('user:1', { name: 'John', age: 30 });
  console.log('Cached user:', cache.get('user:1'));

  // Get or compute
  const data = await cache.getOrSet('expensive:data', async () => {
    console.log('Computing expensive data...');
    await new Promise(r => setTimeout(r, 100));
    return { computed: true, timestamp: Date.now() };
  });

  console.log('Data:', data);

  // Second call returns cached
  const cachedData = await cache.getOrSet('expensive:data', async () => {
    console.log('This should not be called!');
    return { computed: true };
  });

  console.log('Cached data (no recompute):', cachedData);
  console.log('Cache stats:', cache.getStats());
}

// ============================================
// VALIDATION
// ============================================

async function validationExample() {
  const v = require('../code/GORUNFREEX1TRILLION/validation');

  console.log('\n=== Validation ===\n');

  // Define schema
  const userSchema = v.object({
    name: v.string().required().min(2).max(50),
    email: v.string().required().email(),
    age: v.number().optional().min(0).max(150),
    role: v.string().enum(['admin', 'user', 'guest']).default('user'),
    tags: v.array(v.string()).optional()
  });

  // Valid data
  const validUser = {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    tags: ['developer', 'nodejs']
  };

  const result = await userSchema.validate(validUser);
  console.log('Valid user:', result.valid ? 'PASS' : 'FAIL');
  console.log('Validated data:', result.value);

  // Invalid data
  const invalidUser = {
    name: 'J',
    email: 'not-an-email',
    age: -5
  };

  const invalidResult = await userSchema.validate(invalidUser);
  console.log('\nInvalid user:', invalidResult.valid ? 'PASS' : 'FAIL');
  console.log('Errors:', invalidResult.errors);
}

// ============================================
// RATE LIMITING
// ============================================

async function rateLimitingExample() {
  const { RateLimiter } = require('../code/GORUNFREEX1TRILLION/rate-limiter');

  console.log('\n=== Rate Limiting ===\n');

  const limiter = new RateLimiter({
    strategy: 'sliding-window',
    windowSize: 1000,  // 1 second
    maxRequests: 5
  });

  // Make requests
  for (let i = 0; i < 8; i++) {
    const result = limiter.check('user:123');
    console.log(`Request ${i + 1}: ${result.allowed ? 'ALLOWED' : 'BLOCKED'} (remaining: ${result.remaining})`);
  }

  console.log('\nStats:', limiter.getStats());
}

// ============================================
// EVENT SYSTEM
// ============================================

async function eventSystemExample() {
  const { NoizyEventBus, Saga } = require('../code/GORUNFREEX1TRILLION/event-system');

  console.log('\n=== Event System ===\n');

  const bus = new NoizyEventBus();

  // Subscribe to events
  bus.subscribe('user:created', (event) => {
    console.log('User created:', event.data);
  });

  // Wildcard subscription
  bus.subscribe('user:*', (event) => {
    console.log('User event:', event.type);
  });

  // Publish events
  await bus.publish('user:created', { id: 1, name: 'John' });
  await bus.publish('user:updated', { id: 1, name: 'John Doe' });

  // Saga example
  const orderSaga = new Saga('order-process', bus)
    .step('validate', async (ctx) => {
      console.log('Validating order...');
      return { validated: true };
    })
    .step('process', async (ctx) => {
      console.log('Processing order...');
      return { processed: true };
    })
    .step('notify', async (ctx) => {
      console.log('Sending notification...');
      return { notified: true };
    });

  const sagaResult = await orderSaga.execute({ orderId: '123' });
  console.log('Saga result:', sagaResult);
}

// ============================================
// STATE MACHINE
// ============================================

async function stateMachineExample() {
  const { create, interpret } = require('../code/GORUNFREEX1TRILLION/state-machine');

  console.log('\n=== State Machine ===\n');

  const trafficLight = create({
    id: 'traffic-light',
    initial: 'red',
    context: { cycleCount: 0 },
    states: {
      red: {
        entry: (ctx) => console.log('Light is RED'),
        on: {
          NEXT: {
            target: 'green',
            actions: (ctx) => ({ cycleCount: ctx.cycleCount + 1 })
          }
        }
      },
      green: {
        entry: (ctx) => console.log('Light is GREEN'),
        on: { NEXT: 'yellow' }
      },
      yellow: {
        entry: (ctx) => console.log('Light is YELLOW'),
        on: { NEXT: 'red' }
      }
    }
  });

  const interpreter = interpret(trafficLight);
  interpreter.start();

  await interpreter.send('NEXT'); // red -> green
  await interpreter.send('NEXT'); // green -> yellow
  await interpreter.send('NEXT'); // yellow -> red

  console.log('Current state:', interpreter.state);
  console.log('Context:', interpreter.context);
}

// ============================================
// LOGGING
// ============================================

function loggingExample() {
  const { Logger, ConsoleTransport, Formatters } = require('../code/GORUNFREEX1TRILLION/logger');

  console.log('\n=== Logging ===\n');

  const logger = new Logger({
    context: 'MyApp',
    level: 'DEBUG',
    transports: [new ConsoleTransport({ pretty: true })],
    redact: ['password', 'token']
  });

  logger.info('Application started');
  logger.debug('Debug information', { details: 'some data' });
  logger.warn('Warning message');
  logger.error('Error occurred', new Error('Something went wrong'));

  // Child logger
  const dbLogger = logger.child({ context: 'Database' });
  dbLogger.info('Connected to database', { host: 'localhost', port: 5432 });

  // Redaction
  logger.info('User login', { username: 'john', password: 'secret123' });
}

// ============================================
// METRICS
// ============================================

async function metricsExample() {
  const { counter, gauge, histogram, prometheus } = require('../code/GORUNFREEX1TRILLION/metrics');

  console.log('\n=== Metrics ===\n');

  // Counter
  const requestCount = counter('http_requests_total', {
    help: 'Total HTTP requests'
  });

  requestCount.inc({ method: 'GET', path: '/api/users' });
  requestCount.inc({ method: 'POST', path: '/api/users' });
  requestCount.inc({ method: 'GET', path: '/api/users' });

  // Gauge
  const activeConnections = gauge('active_connections', {
    help: 'Number of active connections'
  });

  activeConnections.set(10);
  activeConnections.inc(5);
  activeConnections.dec(2);

  // Histogram
  const requestDuration = histogram('request_duration_seconds', {
    help: 'Request duration',
    buckets: [0.01, 0.05, 0.1, 0.5, 1]
  });

  // Simulate some requests
  for (let i = 0; i < 10; i++) {
    requestDuration.observe({ method: 'GET' }, Math.random() * 0.5);
  }

  // Output in Prometheus format
  const output = await prometheus();
  console.log('Prometheus metrics:\n', output);
}

// ============================================
// RUN ALL EXAMPLES
// ============================================

async function runAllExamples() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     NOIZYLAB - GORUNFREEX1TRILLION     ║');
  console.log('║          Usage Examples                ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    await parallelProcessingExample();
    await cachingExample();
    await validationExample();
    await rateLimitingExample();
    await eventSystemExample();
    await stateMachineExample();
    loggingExample();
    await metricsExample();

    console.log('\n✓ All examples completed successfully!\n');

  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}

module.exports = {
  parallelProcessingExample,
  cachingExample,
  validationExample,
  rateLimitingExample,
  eventSystemExample,
  stateMachineExample,
  loggingExample,
  metricsExample,
  runAllExamples
};
