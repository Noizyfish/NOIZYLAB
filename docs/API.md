# NOIZYLAB API Reference

## Core Module

### TrillionProcessor

Main parallel processing engine.

```javascript
const { TrillionProcessor } = require('@noizylab/core');

const processor = new TrillionProcessor(options);
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxWorkers` | number | CPU count | Number of worker threads |
| `taskQueueSize` | number | 1000000 | Maximum queue size |
| `batchSize` | number | 10000 | Items per batch |
| `memoryThreshold` | number | 0.9 | Memory usage threshold |
| `autoScale` | boolean | true | Auto-scale workers |

#### Methods

##### `initialize()`
Initialize worker threads.
```javascript
await processor.initialize();
```

##### `addTasks(tasks)`
Add tasks to processing queue.
```javascript
const taskIds = await processor.addTasks([
  { operation: 'compute', data: {...} },
  { operation: 'transform', data: [...] }
]);
```

##### `parallelMap(items, processFn, options)`
Parallel map operation.
```javascript
const results = await processor.parallelMap(items, async (item) => {
  return await processItem(item);
}, { batchSize: 1000 });
```

##### `getStats()`
Get processing statistics.
```javascript
const stats = processor.getStats();
// { processed, failed, elapsed, rate, workers, queueLength, memoryUsage }
```

##### `shutdown()`
Gracefully shutdown all workers.
```javascript
await processor.shutdown();
```

#### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `initialized` | `{ workers }` | Workers ready |
| `taskComplete` | `{ taskId, result }` | Task completed |
| `taskError` | `{ taskId, error }` | Task failed |
| `batchComplete` | `{ completed, total }` | Batch finished |
| `shutdown` | stats | Shutdown complete |

---

## Parallel Engine

### ParallelEngine

Controlled concurrency utilities.

```javascript
const { ParallelEngine, parallel, batch } = require('@noizylab/parallel');
```

#### Static Methods

##### `ParallelEngine.all(tasks, concurrency)`
Run tasks with controlled concurrency.
```javascript
const results = await ParallelEngine.all([
  () => fetch('/api/1'),
  () => fetch('/api/2'),
  () => fetch('/api/3')
], 2); // 2 concurrent
```

##### `ParallelEngine.batch(items, batchSize, processor)`
Process in batches.
```javascript
const results = await ParallelEngine.batch(
  items,
  100,
  async (item) => process(item)
);
```

##### `ParallelEngine.retry(fn, options)`
Retry with exponential backoff.
```javascript
const result = await ParallelEngine.retry(
  () => unreliableOperation(),
  { maxAttempts: 3, delay: 1000, backoff: 2 }
);
```

##### `ParallelEngine.raceWithTimeout(promise, ms, fallback)`
Race with timeout.
```javascript
const result = await ParallelEngine.raceWithTimeout(
  slowOperation(),
  5000,
  'default value'
);
```

---

## Cache System

### LRUCache

Least Recently Used cache.

```javascript
const { LRUCache } = require('@noizylab/cache');

const cache = new LRUCache({
  maxSize: 1000,
  maxAge: 60000  // 1 minute TTL
});
```

#### Methods

##### `get(key)`
Get cached value.

##### `set(key, value, ttl?)`
Set cached value with optional TTL.

##### `getOrSet(key, compute, ttl?)`
Get or compute if missing.
```javascript
const data = await cache.getOrSet('key', async () => {
  return await expensiveOperation();
});
```

##### `memoize(fn, keyFn?)`
Create memoized function.
```javascript
const cached = cache.memoize(fibonacci);
```

### MultiTierCache

Multi-level caching (L1/L2).

```javascript
const { MultiTierCache } = require('@noizylab/cache');

const cache = new MultiTierCache([
  new LRUCache({ maxSize: 100, maxAge: 60000 }),   // L1: fast
  new LRUCache({ maxSize: 1000, maxAge: 300000 }) // L2: larger
]);
```

---

## API Client

### NoizyAPIClient

HTTP client with retry and circuit breaker.

```javascript
const { NoizyAPIClient } = require('@noizylab/api');

const client = new NoizyAPIClient({
  baseURL: 'https://api.example.com',
  timeout: 30000,
  retries: 3,
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 30000
  }
});
```

#### Methods

```javascript
// HTTP methods
const response = await client.get('/users');
const response = await client.post('/users', { name: 'John' });
const response = await client.put('/users/1', { name: 'Jane' });
const response = await client.delete('/users/1');

// Interceptors
client.useRequestInterceptor(async (config) => {
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

## Event System

### NoizyEventBus

Enhanced event emitter with middleware and history.

```javascript
const { NoizyEventBus } = require('@noizylab/events');

const bus = new NoizyEventBus();

// Middleware
bus.use(async (event) => {
  console.log('Event:', event.type);
});

// Subscribe (supports wildcards)
bus.subscribe('user:*', handler);
bus.subscribe('order:created', handler, { once: true });

// Publish
await bus.publish('user:created', { id: 1 });

// Wait for event
const event = await bus.waitFor('user:verified', 30000);

// Replay history
const events = bus.getHistory({ type: 'user:*', limit: 100 });
await bus.replay(events);
```

### Saga

Orchestrate multi-step workflows with compensation.

```javascript
const { Saga } = require('@noizylab/events');

const saga = new Saga('checkout', eventBus)
  .step('reserve', reserveInventory, releaseInventory)
  .step('charge', chargeCard, refundCard)
  .step('ship', createShipment);

const result = await saga.execute({ orderId: '123' });
// { success: true/false, context, error? }
```

---

## Queue System

### MessageQueue

Robust message queue with dead-letter handling.

```javascript
const { MessageQueue, QueueWorker } = require('@noizylab/queue');

const queue = new MessageQueue('tasks', {
  maxRetries: 3,
  retryDelay: 5000,
  visibilityTimeout: 30000
});

// Enqueue
queue.enqueue({ action: 'process', data: {...} }, {
  priority: 10,
  delay: 5000
});

// Worker
const worker = new QueueWorker(queue, async (message, item) => {
  await processMessage(message);
}, { concurrency: 5 });

worker.start();
```

---

## Crypto Utilities

### Encryption

```javascript
const { NoizyCrypto } = require('@noizylab/crypto');

const crypto = new NoizyCrypto();
const key = crypto.generateKey();

// Encrypt/Decrypt
const encrypted = crypto.encrypt(data, key);
const decrypted = crypto.decrypt(encrypted, key);

// With password
const encrypted = crypto.encryptWithPassword(data, 'password');
const decrypted = crypto.decryptWithPassword(encrypted, 'password');
```

### Hashing

```javascript
const { NoizyHash } = require('@noizylab/crypto');

// Hash
NoizyHash.sha256('data');
NoizyHash.sha512('data');

// HMAC
NoizyHash.hmac('data', 'secret');
NoizyHash.verifyHmac('data', 'secret', expectedHmac);

// Password
const hashed = await NoizyHash.hashPassword('password');
const valid = await NoizyHash.verifyPassword('password', hashed);
```

### Tokens

```javascript
const { NoizyTokens } = require('@noizylab/crypto');

NoizyTokens.generate(32);        // Random hex token
NoizyTokens.generateUrlSafe(32); // URL-safe token
NoizyTokens.generateOTP(6);      // 6-digit OTP
NoizyTokens.uuid();              // UUID v4
NoizyTokens.shortId(8);          // Short alphanumeric ID

// Timed tokens
const token = NoizyTokens.generateTimedToken({ userId: 1 }, 'secret', 3600);
const data = NoizyTokens.verifyTimedToken(token, 'secret');
```

---

## Email Service

### NoizyMailService

Email with templates and queue.

```javascript
const { NoizyMailService } = require('@noizylab/email');

const mailer = new NoizyMailService({
  smtpHost: 'smtp.example.com',
  smtpPort: 587,
  user: 'user@example.com',
  pass: 'password'
});

// Send with template
await mailer.send('welcome', 'user@example.com', {
  name: 'John',
  activationLink: 'https://...'
});

// Available templates: welcome, notification, alert, report
```

---

## WebSocket Server

### NoizyWebSocketServer

Real-time bidirectional communication.

```javascript
const { NoizyWebSocketServer } = require('@noizylab/websocket');

const wss = new NoizyWebSocketServer({
  heartbeatInterval: 30000
});

// Middleware
wss.use(async (client, request) => {
  // Auth check
});

// Handle messages
wss.handle('chat', async (message, client) => {
  wss.sendToRoom(message.room, {
    type: 'chat',
    from: client.id,
    text: message.text
  });
});

// Room management
wss.joinRoom(clientId, 'room1');
wss.sendToRoom('room1', { type: 'update' });
```
