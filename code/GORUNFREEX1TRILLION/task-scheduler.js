/**
 * GORUNFREEX1TRILLION - TASK SCHEDULER
 * Advanced task scheduling and orchestration
 */

const { EventEmitter } = require('events');

// ============================================
// PRIORITY QUEUE
// ============================================

class PriorityQueue {
  constructor() {
    this.heap = [];
  }

  push(item, priority = 0) {
    this.heap.push({ item, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;

    const top = this.heap[0];
    const last = this.heap.pop();

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }

    return top.item;
  }

  peek() {
    return this.heap[0]?.item || null;
  }

  get length() {
    return this.heap.length;
  }

  bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[parent].priority >= this.heap[index].priority) break;
      [this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]];
      index = parent;
    }
  }

  bubbleDown(index) {
    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let largest = index;

      if (left < this.heap.length && this.heap[left].priority > this.heap[largest].priority) {
        largest = left;
      }
      if (right < this.heap.length && this.heap[right].priority > this.heap[largest].priority) {
        largest = right;
      }

      if (largest === index) break;

      [this.heap[index], this.heap[largest]] = [this.heap[largest], this.heap[index]];
      index = largest;
    }
  }
}

// ============================================
// TASK SCHEDULER
// ============================================

class TaskScheduler extends EventEmitter {
  constructor(options = {}) {
    super();
    this.concurrency = options.concurrency || 10;
    this.running = new Map();
    this.queue = new PriorityQueue();
    this.completed = [];
    this.failed = [];
    this.paused = false;
    this.stats = { scheduled: 0, completed: 0, failed: 0, running: 0 };
  }

  schedule(task, options = {}) {
    const taskWrapper = {
      id: options.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      fn: task,
      priority: options.priority || 0,
      timeout: options.timeout || 0,
      retries: options.retries || 0,
      retryDelay: options.retryDelay || 1000,
      dependencies: options.dependencies || [],
      metadata: options.metadata || {},
      attempts: 0,
      scheduledAt: Date.now()
    };

    this.queue.push(taskWrapper, taskWrapper.priority);
    this.stats.scheduled++;
    this.emit('scheduled', taskWrapper);

    this.process();

    return taskWrapper.id;
  }

  scheduleMany(tasks) {
    return tasks.map(({ task, options }) => this.schedule(task, options));
  }

  async process() {
    if (this.paused) return;

    while (this.running.size < this.concurrency && this.queue.length > 0) {
      const task = this.queue.pop();

      // Check dependencies
      if (task.dependencies.length > 0) {
        const pendingDeps = task.dependencies.filter(
          depId => !this.completed.find(t => t.id === depId)
        );

        if (pendingDeps.length > 0) {
          // Re-queue with lower priority
          this.queue.push(task, task.priority - 1);
          continue;
        }
      }

      this.executeTask(task);
    }
  }

  async executeTask(task) {
    this.running.set(task.id, task);
    this.stats.running = this.running.size;
    task.startedAt = Date.now();
    task.attempts++;

    this.emit('started', task);

    try {
      let result;

      if (task.timeout > 0) {
        result = await Promise.race([
          task.fn(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Task timeout')), task.timeout)
          )
        ]);
      } else {
        result = await task.fn();
      }

      task.completedAt = Date.now();
      task.duration = task.completedAt - task.startedAt;
      task.result = result;

      this.running.delete(task.id);
      this.completed.push(task);
      this.stats.completed++;
      this.stats.running = this.running.size;

      this.emit('completed', task);

    } catch (error) {
      task.error = error;
      this.running.delete(task.id);

      if (task.attempts < task.retries + 1) {
        // Retry
        this.emit('retry', { task, attempt: task.attempts, error });
        setTimeout(() => {
          this.queue.push(task, task.priority);
          this.process();
        }, task.retryDelay * task.attempts);
      } else {
        task.failedAt = Date.now();
        this.failed.push(task);
        this.stats.failed++;
        this.emit('failed', { task, error });
      }

      this.stats.running = this.running.size;
    }

    this.process();
  }

  pause() {
    this.paused = true;
    this.emit('paused');
  }

  resume() {
    this.paused = false;
    this.emit('resumed');
    this.process();
  }

  cancel(taskId) {
    // Remove from queue (would need queue modification)
    // Cancel running task if possible
    this.emit('cancelled', taskId);
  }

  getStatus(taskId) {
    if (this.running.has(taskId)) {
      return { status: 'running', task: this.running.get(taskId) };
    }

    const completed = this.completed.find(t => t.id === taskId);
    if (completed) {
      return { status: 'completed', task: completed };
    }

    const failed = this.failed.find(t => t.id === taskId);
    if (failed) {
      return { status: 'failed', task: failed };
    }

    return { status: 'queued' };
  }

  getStats() {
    return {
      ...this.stats,
      queueLength: this.queue.length,
      uptime: Date.now() - (this.startTime || Date.now())
    };
  }

  async waitForAll() {
    return new Promise(resolve => {
      const check = () => {
        if (this.running.size === 0 && this.queue.length === 0) {
          resolve({ completed: this.completed, failed: this.failed });
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }
}

// ============================================
// CRON-LIKE SCHEDULER
// ============================================

class CronScheduler {
  constructor() {
    this.jobs = new Map();
    this.timers = new Map();
  }

  schedule(name, cronExpr, fn) {
    const job = { name, cronExpr, fn, lastRun: null, nextRun: null };
    this.jobs.set(name, job);
    this.scheduleNext(name);
    return this;
  }

  scheduleNext(name) {
    const job = this.jobs.get(name);
    if (!job) return;

    const nextRun = this.parseNextRun(job.cronExpr);
    job.nextRun = nextRun;

    const delay = nextRun - Date.now();

    if (delay > 0) {
      const timer = setTimeout(async () => {
        job.lastRun = Date.now();
        try {
          await job.fn();
        } catch (error) {
          console.error(`Cron job ${name} failed:`, error);
        }
        this.scheduleNext(name);
      }, delay);

      this.timers.set(name, timer);
    }
  }

  parseNextRun(expr) {
    // Simplified cron parsing - supports: @hourly, @daily, @weekly, or interval in ms
    const now = Date.now();

    switch (expr) {
      case '@hourly': return now + 3600000;
      case '@daily': return now + 86400000;
      case '@weekly': return now + 604800000;
      default:
        if (typeof expr === 'number') return now + expr;
        return now + 60000; // Default: 1 minute
    }
  }

  cancel(name) {
    const timer = this.timers.get(name);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(name);
    }
    this.jobs.delete(name);
  }

  cancelAll() {
    for (const [name] of this.jobs) {
      this.cancel(name);
    }
  }

  getJobs() {
    return Array.from(this.jobs.values());
  }
}

// ============================================
// DEPENDENCY GRAPH EXECUTOR
// ============================================

class DependencyGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
  }

  addTask(id, fn, dependencies = []) {
    this.nodes.set(id, { fn, completed: false, result: null });
    this.edges.set(id, dependencies);
    return this;
  }

  async execute(concurrency = 10) {
    const results = new Map();
    const completed = new Set();
    const running = new Set();

    const getReady = () => {
      const ready = [];
      for (const [id, deps] of this.edges) {
        if (completed.has(id) || running.has(id)) continue;
        if (deps.every(dep => completed.has(dep))) {
          ready.push(id);
        }
      }
      return ready;
    };

    while (completed.size < this.nodes.size) {
      const ready = getReady();

      if (ready.length === 0 && running.size === 0) {
        throw new Error('Circular dependency detected');
      }

      const batch = ready.slice(0, concurrency - running.size);

      await Promise.all(batch.map(async (id) => {
        running.add(id);
        const node = this.nodes.get(id);

        try {
          const depResults = this.edges.get(id).map(dep => results.get(dep));
          node.result = await node.fn(...depResults);
          results.set(id, node.result);
          node.completed = true;
          completed.add(id);
        } finally {
          running.delete(id);
        }
      }));
    }

    return results;
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  PriorityQueue,
  TaskScheduler,
  CronScheduler,
  DependencyGraph
};
