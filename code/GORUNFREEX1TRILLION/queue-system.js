/**
 * GORUNFREEX1TRILLION - QUEUE SYSTEM
 * Robust message queue with persistence and dead-letter handling
 */

const { EventEmitter } = require('events');

// ============================================
// MESSAGE QUEUE
// ============================================

class MessageQueue extends EventEmitter {
  constructor(name, options = {}) {
    super();
    this.name = name;
    this.queue = [];
    this.processing = new Map();
    this.deadLetter = [];

    this.options = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 5000,
      visibilityTimeout: options.visibilityTimeout || 30000,
      maxSize: options.maxSize || 100000,
      ...options
    };

    this.stats = {
      enqueued: 0,
      processed: 0,
      failed: 0,
      deadLettered: 0
    };

    // Visibility timeout checker
    setInterval(() => this.checkVisibilityTimeouts(), 5000);
  }

  // Enqueue message
  enqueue(message, options = {}) {
    if (this.queue.length >= this.options.maxSize) {
      throw new Error('Queue is full');
    }

    const item = {
      id: this.generateId(),
      message,
      priority: options.priority || 0,
      delay: options.delay || 0,
      attempts: 0,
      createdAt: Date.now(),
      availableAt: Date.now() + (options.delay || 0),
      metadata: options.metadata || {}
    };

    // Insert based on priority
    if (options.priority) {
      const index = this.queue.findIndex(q => q.priority < item.priority);
      if (index === -1) {
        this.queue.push(item);
      } else {
        this.queue.splice(index, 0, item);
      }
    } else {
      this.queue.push(item);
    }

    this.stats.enqueued++;
    this.emit('enqueue', item);

    return item.id;
  }

  // Batch enqueue
  enqueueBatch(messages) {
    return messages.map(msg =>
      this.enqueue(msg.message || msg, msg.options || {})
    );
  }

  // Dequeue message for processing
  dequeue() {
    const now = Date.now();

    const index = this.queue.findIndex(item => item.availableAt <= now);
    if (index === -1) return null;

    const item = this.queue.splice(index, 1)[0];
    item.processingStartedAt = now;
    item.visibilityDeadline = now + this.options.visibilityTimeout;
    item.attempts++;

    this.processing.set(item.id, item);
    this.emit('dequeue', item);

    return item;
  }

  // Acknowledge successful processing
  ack(messageId) {
    const item = this.processing.get(messageId);
    if (!item) return false;

    this.processing.delete(messageId);
    this.stats.processed++;
    this.emit('ack', item);

    return true;
  }

  // Negative acknowledge - retry or dead-letter
  nack(messageId, requeue = true) {
    const item = this.processing.get(messageId);
    if (!item) return false;

    this.processing.delete(messageId);

    if (requeue && item.attempts < this.options.maxRetries) {
      // Requeue with delay
      item.availableAt = Date.now() + (this.options.retryDelay * item.attempts);
      this.queue.push(item);
      this.stats.failed++;
      this.emit('retry', item);
    } else {
      // Move to dead-letter queue
      item.deadLetteredAt = Date.now();
      item.reason = 'Max retries exceeded';
      this.deadLetter.push(item);
      this.stats.deadLettered++;
      this.emit('deadLetter', item);
    }

    return true;
  }

  // Check for visibility timeout violations
  checkVisibilityTimeouts() {
    const now = Date.now();

    for (const [id, item] of this.processing) {
      if (item.visibilityDeadline < now) {
        // Message processing timeout - nack and requeue
        this.nack(id, true);
        this.emit('timeout', item);
      }
    }
  }

  // Peek at next message without dequeuing
  peek() {
    const now = Date.now();
    return this.queue.find(item => item.availableAt <= now) || null;
  }

  // Get queue size
  size() {
    return {
      pending: this.queue.length,
      processing: this.processing.size,
      deadLetter: this.deadLetter.length
    };
  }

  // Clear queue
  clear() {
    this.queue = [];
    this.processing.clear();
    return this;
  }

  // Reprocess dead-letter messages
  reprocessDeadLetters(limit = 100) {
    const count = Math.min(limit, this.deadLetter.length);
    const items = this.deadLetter.splice(0, count);

    for (const item of items) {
      item.attempts = 0;
      item.availableAt = Date.now();
      delete item.deadLetteredAt;
      delete item.reason;
      this.queue.push(item);
    }

    return count;
  }

  getStats() {
    return {
      name: this.name,
      ...this.stats,
      ...this.size()
    };
  }

  generateId() {
    return `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================
// QUEUE WORKER
// ============================================

class QueueWorker extends EventEmitter {
  constructor(queue, handler, options = {}) {
    super();
    this.queue = queue;
    this.handler = handler;
    this.concurrency = options.concurrency || 1;
    this.pollInterval = options.pollInterval || 1000;
    this.running = false;
    this.activeJobs = 0;
    this.pollTimer = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.poll();
    this.emit('start');
    return this;
  }

  stop() {
    this.running = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    this.emit('stop');
    return this;
  }

  async poll() {
    if (!this.running) return;

    while (this.activeJobs < this.concurrency) {
      const item = this.queue.dequeue();
      if (!item) break;

      this.processItem(item);
    }

    this.pollTimer = setTimeout(() => this.poll(), this.pollInterval);
  }

  async processItem(item) {
    this.activeJobs++;
    this.emit('process', item);

    try {
      await this.handler(item.message, item);
      this.queue.ack(item.id);
      this.emit('success', item);
    } catch (error) {
      this.queue.nack(item.id, true);
      this.emit('error', { item, error });
    } finally {
      this.activeJobs--;
    }
  }

  getStatus() {
    return {
      running: this.running,
      activeJobs: this.activeJobs,
      concurrency: this.concurrency
    };
  }
}

// ============================================
// PRIORITY QUEUE
// ============================================

class PriorityMessageQueue extends MessageQueue {
  constructor(name, options = {}) {
    super(name, {
      ...options,
      priorityLevels: options.priorityLevels || ['low', 'normal', 'high', 'critical']
    });

    this.priorityValues = {
      low: 1,
      normal: 5,
      high: 10,
      critical: 100
    };
  }

  enqueue(message, options = {}) {
    const priority = typeof options.priority === 'string'
      ? this.priorityValues[options.priority] || 5
      : options.priority || 5;

    return super.enqueue(message, { ...options, priority });
  }

  enqueueCritical(message, options = {}) {
    return this.enqueue(message, { ...options, priority: 'critical' });
  }

  enqueueHigh(message, options = {}) {
    return this.enqueue(message, { ...options, priority: 'high' });
  }

  enqueueLow(message, options = {}) {
    return this.enqueue(message, { ...options, priority: 'low' });
  }
}

// ============================================
// DELAYED QUEUE
// ============================================

class DelayedQueue extends MessageQueue {
  schedule(message, delayMs, options = {}) {
    return this.enqueue(message, { ...options, delay: delayMs });
  }

  scheduleAt(message, timestamp, options = {}) {
    const delay = timestamp - Date.now();
    return this.enqueue(message, { ...options, delay: Math.max(0, delay) });
  }

  // Schedule recurring task
  scheduleRecurring(message, intervalMs, options = {}) {
    const jobId = this.generateId();

    const scheduleNext = () => {
      if (this.recurringJobs && !this.recurringJobs.has(jobId)) return;

      this.enqueue({ ...message, _recurring: jobId }, {
        ...options,
        delay: intervalMs
      });
    };

    if (!this.recurringJobs) this.recurringJobs = new Map();
    this.recurringJobs.set(jobId, { message, intervalMs, options });

    this.on('ack', (item) => {
      if (item.message._recurring === jobId) {
        scheduleNext();
      }
    });

    scheduleNext();
    return jobId;
  }

  cancelRecurring(jobId) {
    if (this.recurringJobs) {
      this.recurringJobs.delete(jobId);
    }
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  MessageQueue,
  QueueWorker,
  PriorityMessageQueue,
  DelayedQueue,

  // Quick queue creation
  create: (name, options) => new MessageQueue(name, options),
  priority: (name, options) => new PriorityMessageQueue(name, options),
  delayed: (name, options) => new DelayedQueue(name, options)
};
