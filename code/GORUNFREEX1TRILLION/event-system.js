/**
 * GORUNFREEX1TRILLION - EVENT SYSTEM
 * Advanced pub/sub and event-driven architecture
 */

const { EventEmitter } = require('events');

// ============================================
// ENHANCED EVENT BUS
// ============================================

class NoizyEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(0); // Unlimited listeners
    this.middlewares = [];
    this.history = [];
    this.historyLimit = 1000;
    this.wildcardHandlers = new Map();
  }

  // Middleware support
  use(middleware) {
    this.middlewares.push(middleware);
    return this;
  }

  // Enhanced emit with middleware
  async publish(event, data, options = {}) {
    const eventObj = {
      type: event,
      data,
      timestamp: Date.now(),
      id: this.generateId(),
      metadata: options.metadata || {}
    };

    // Run middlewares
    for (const middleware of this.middlewares) {
      const result = await middleware(eventObj);
      if (result === false) return false; // Middleware can cancel event
    }

    // Store in history
    if (!options.noHistory) {
      this.history.push(eventObj);
      if (this.history.length > this.historyLimit) {
        this.history.shift();
      }
    }

    // Emit to specific listeners
    this.emit(event, eventObj);

    // Emit to wildcard listeners
    for (const [pattern, handlers] of this.wildcardHandlers) {
      if (this.matchPattern(event, pattern)) {
        handlers.forEach(handler => handler(eventObj));
      }
    }

    return eventObj;
  }

  // Subscribe with options
  subscribe(event, handler, options = {}) {
    if (event.includes('*')) {
      // Wildcard subscription
      if (!this.wildcardHandlers.has(event)) {
        this.wildcardHandlers.set(event, []);
      }
      this.wildcardHandlers.get(event).push(handler);
    } else {
      if (options.once) {
        this.once(event, handler);
      } else {
        this.on(event, handler);
      }
    }

    // Return unsubscribe function
    return () => this.unsubscribe(event, handler);
  }

  unsubscribe(event, handler) {
    if (event.includes('*')) {
      const handlers = this.wildcardHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      }
    } else {
      this.removeListener(event, handler);
    }
  }

  // Wait for event with timeout
  waitFor(event, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeListener(event, handler);
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      const handler = (data) => {
        clearTimeout(timer);
        resolve(data);
      };

      this.once(event, handler);
    });
  }

  // Get event history
  getHistory(filter = {}) {
    let history = [...this.history];

    if (filter.type) {
      history = history.filter(e => e.type === filter.type);
    }

    if (filter.since) {
      history = history.filter(e => e.timestamp >= filter.since);
    }

    if (filter.limit) {
      history = history.slice(-filter.limit);
    }

    return history;
  }

  // Replay events
  async replay(events, delay = 0) {
    for (const event of events) {
      await this.publish(event.type, event.data, { noHistory: true });
      if (delay > 0) {
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  matchPattern(event, pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(event);
  }

  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    return {
      listeners: this.listenerCount(),
      wildcardPatterns: this.wildcardHandlers.size,
      historySize: this.history.length
    };
  }
}

// ============================================
// SAGA / ORCHESTRATOR
// ============================================

class Saga {
  constructor(name, eventBus) {
    this.name = name;
    this.eventBus = eventBus;
    this.steps = [];
    this.compensations = [];
    this.state = 'PENDING';
    this.context = {};
  }

  step(name, action, compensation = null) {
    this.steps.push({ name, action, compensation });
    return this;
  }

  async execute(initialContext = {}) {
    this.context = { ...initialContext };
    this.state = 'RUNNING';
    const executed = [];

    try {
      for (const step of this.steps) {
        this.eventBus.publish(`saga:${this.name}:step:start`, { step: step.name });

        const result = await step.action(this.context);
        this.context = { ...this.context, ...result };

        executed.push(step);

        this.eventBus.publish(`saga:${this.name}:step:complete`, {
          step: step.name,
          result
        });
      }

      this.state = 'COMPLETED';
      this.eventBus.publish(`saga:${this.name}:complete`, this.context);
      return { success: true, context: this.context };

    } catch (error) {
      this.state = 'COMPENSATING';
      this.eventBus.publish(`saga:${this.name}:error`, { error: error.message });

      // Run compensations in reverse order
      for (let i = executed.length - 1; i >= 0; i--) {
        const step = executed[i];
        if (step.compensation) {
          try {
            await step.compensation(this.context);
            this.eventBus.publish(`saga:${this.name}:compensated`, { step: step.name });
          } catch (compError) {
            this.eventBus.publish(`saga:${this.name}:compensation:failed`, {
              step: step.name,
              error: compError.message
            });
          }
        }
      }

      this.state = 'FAILED';
      this.eventBus.publish(`saga:${this.name}:failed`, { error: error.message });
      return { success: false, error: error.message, context: this.context };
    }
  }
}

// ============================================
// EVENT STORE
// ============================================

class EventStore {
  constructor(options = {}) {
    this.events = [];
    this.snapshots = new Map();
    this.snapshotInterval = options.snapshotInterval || 100;
    this.subscribers = new Map();
  }

  // Append event to store
  append(streamId, event) {
    const storedEvent = {
      id: this.generateId(),
      streamId,
      type: event.type,
      data: event.data,
      metadata: event.metadata || {},
      timestamp: Date.now(),
      version: this.getStreamVersion(streamId) + 1
    };

    this.events.push(storedEvent);

    // Notify subscribers
    const subs = this.subscribers.get(streamId) || [];
    subs.forEach(handler => handler(storedEvent));

    // Create snapshot if needed
    if (storedEvent.version % this.snapshotInterval === 0) {
      this.createSnapshot(streamId);
    }

    return storedEvent;
  }

  // Get events for a stream
  getStream(streamId, fromVersion = 0) {
    return this.events.filter(
      e => e.streamId === streamId && e.version > fromVersion
    );
  }

  // Get current version of stream
  getStreamVersion(streamId) {
    const streamEvents = this.events.filter(e => e.streamId === streamId);
    return streamEvents.length > 0 ? streamEvents[streamEvents.length - 1].version : 0;
  }

  // Subscribe to stream
  subscribe(streamId, handler) {
    if (!this.subscribers.has(streamId)) {
      this.subscribers.set(streamId, []);
    }
    this.subscribers.get(streamId).push(handler);

    return () => {
      const subs = this.subscribers.get(streamId);
      const index = subs.indexOf(handler);
      if (index > -1) subs.splice(index, 1);
    };
  }

  // Create snapshot
  createSnapshot(streamId) {
    const events = this.getStream(streamId);
    const state = events.reduce((state, event) => {
      return { ...state, ...event.data };
    }, {});

    this.snapshots.set(streamId, {
      state,
      version: this.getStreamVersion(streamId),
      timestamp: Date.now()
    });
  }

  // Reconstruct state from events
  reconstruct(streamId, reducer, initialState = {}) {
    const snapshot = this.snapshots.get(streamId);
    let state = snapshot ? { ...snapshot.state } : { ...initialState };
    const fromVersion = snapshot ? snapshot.version : 0;

    const events = this.getStream(streamId, fromVersion);

    for (const event of events) {
      state = reducer(state, event);
    }

    return state;
  }

  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    const streams = new Set(this.events.map(e => e.streamId));
    return {
      totalEvents: this.events.length,
      streams: streams.size,
      snapshots: this.snapshots.size
    };
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  NoizyEventBus,
  Saga,
  EventStore,

  // Singleton event bus
  globalBus: new NoizyEventBus()
};
