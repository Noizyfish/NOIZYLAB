/**
 * GORUNFREEX1TRILLION - ANALYTICS SYSTEM
 * Real-time analytics, tracking, and insights
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');

// ============================================
// EVENT TRACKER
// ============================================

class EventTracker extends EventEmitter {
  constructor(options = {}) {
    super();
    this.events = [];
    this.maxEvents = options.maxEvents || 100000;
    this.flushInterval = options.flushInterval || 60000;
    this.sinks = [];
    this.sessionStore = new Map();

    // Start auto-flush
    if (options.autoFlush !== false) {
      this.startAutoFlush();
    }
  }

  track(eventName, properties = {}, context = {}) {
    const event = {
      id: this.generateId(),
      name: eventName,
      properties,
      context: {
        timestamp: Date.now(),
        sessionId: context.sessionId,
        userId: context.userId,
        anonymousId: context.anonymousId || this.generateAnonymousId(),
        ip: context.ip,
        userAgent: context.userAgent,
        referrer: context.referrer,
        url: context.url,
        ...context
      }
    };

    this.events.push(event);

    // Trim if over limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    this.emit('event', event);
    return event;
  }

  // Common event helpers
  pageView(page, properties = {}, context = {}) {
    return this.track('page_view', { page, ...properties }, context);
  }

  click(element, properties = {}, context = {}) {
    return this.track('click', { element, ...properties }, context);
  }

  formSubmit(formName, properties = {}, context = {}) {
    return this.track('form_submit', { form: formName, ...properties }, context);
  }

  purchase(orderId, amount, properties = {}, context = {}) {
    return this.track('purchase', { orderId, amount, ...properties }, context);
  }

  signup(userId, properties = {}, context = {}) {
    return this.track('signup', { userId, ...properties }, context);
  }

  login(userId, properties = {}, context = {}) {
    return this.track('login', { userId, ...properties }, context);
  }

  search(query, properties = {}, context = {}) {
    return this.track('search', { query, ...properties }, context);
  }

  error(errorType, message, properties = {}, context = {}) {
    return this.track('error', { errorType, message, ...properties }, context);
  }

  // Session management
  startSession(sessionId, userId = null) {
    const session = {
      id: sessionId || this.generateId(),
      userId,
      startTime: Date.now(),
      events: [],
      properties: {}
    };

    this.sessionStore.set(session.id, session);
    this.track('session_start', {}, { sessionId: session.id, userId });

    return session;
  }

  endSession(sessionId) {
    const session = this.sessionStore.get(sessionId);
    if (session) {
      session.endTime = Date.now();
      session.duration = session.endTime - session.startTime;

      this.track('session_end', {
        duration: session.duration,
        eventCount: session.events.length
      }, { sessionId });
    }
  }

  // Add sink for data export
  addSink(sink) {
    this.sinks.push(sink);
    return this;
  }

  startAutoFlush() {
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
  }

  async flush() {
    if (this.events.length === 0) return;

    const eventsToFlush = [...this.events];
    this.events = [];

    for (const sink of this.sinks) {
      try {
        await sink.write(eventsToFlush);
      } catch (error) {
        this.emit('sinkError', { sink, error });
        // Re-add events on failure
        this.events.unshift(...eventsToFlush);
      }
    }

    this.emit('flush', { count: eventsToFlush.length });
  }

  generateId() {
    return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  generateAnonymousId() {
    return `anon-${crypto.randomBytes(16).toString('hex')}`;
  }

  getEvents(filter = {}) {
    let events = [...this.events];

    if (filter.name) {
      events = events.filter(e => e.name === filter.name);
    }

    if (filter.userId) {
      events = events.filter(e => e.context.userId === filter.userId);
    }

    if (filter.sessionId) {
      events = events.filter(e => e.context.sessionId === filter.sessionId);
    }

    if (filter.since) {
      events = events.filter(e => e.context.timestamp >= filter.since);
    }

    if (filter.until) {
      events = events.filter(e => e.context.timestamp <= filter.until);
    }

    return events;
  }
}

// ============================================
// ANALYTICS AGGREGATOR
// ============================================

class AnalyticsAggregator {
  constructor(tracker) {
    this.tracker = tracker;
  }

  // Count events by name
  countByEvent(filter = {}) {
    const events = this.tracker.getEvents(filter);
    const counts = {};

    for (const event of events) {
      counts[event.name] = (counts[event.name] || 0) + 1;
    }

    return counts;
  }

  // Count unique users
  countUniqueUsers(filter = {}) {
    const events = this.tracker.getEvents(filter);
    const users = new Set();

    for (const event of events) {
      if (event.context.userId) {
        users.add(event.context.userId);
      }
    }

    return users.size;
  }

  // Count unique sessions
  countUniqueSessions(filter = {}) {
    const events = this.tracker.getEvents(filter);
    const sessions = new Set();

    for (const event of events) {
      if (event.context.sessionId) {
        sessions.add(event.context.sessionId);
      }
    }

    return sessions.size;
  }

  // Time series aggregation
  timeSeries(eventName, interval = 'hour', filter = {}) {
    const events = this.tracker.getEvents({ ...filter, name: eventName });
    const series = {};

    for (const event of events) {
      const bucket = this.getBucket(event.context.timestamp, interval);
      series[bucket] = (series[bucket] || 0) + 1;
    }

    return Object.entries(series)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, count]) => ({ time, count }));
  }

  getBucket(timestamp, interval) {
    const date = new Date(timestamp);

    switch (interval) {
      case 'minute':
        return date.toISOString().slice(0, 16);
      case 'hour':
        return date.toISOString().slice(0, 13);
      case 'day':
        return date.toISOString().slice(0, 10);
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().slice(0, 10);
      case 'month':
        return date.toISOString().slice(0, 7);
      default:
        return date.toISOString().slice(0, 13);
    }
  }

  // Funnel analysis
  funnel(steps, filter = {}) {
    const events = this.tracker.getEvents(filter);

    // Group events by session
    const sessionEvents = new Map();
    for (const event of events) {
      const sid = event.context.sessionId || event.context.anonymousId;
      if (!sessionEvents.has(sid)) {
        sessionEvents.set(sid, []);
      }
      sessionEvents.get(sid).push(event);
    }

    // Calculate funnel
    const results = steps.map(step => ({ step, count: 0, rate: 0 }));

    for (const sessionEvts of sessionEvents.values()) {
      let currentStep = 0;

      for (const event of sessionEvts) {
        if (currentStep < steps.length && event.name === steps[currentStep]) {
          results[currentStep].count++;
          currentStep++;
        }
      }
    }

    // Calculate rates
    for (let i = 0; i < results.length; i++) {
      if (i === 0) {
        results[i].rate = 100;
      } else {
        results[i].rate = results[i - 1].count > 0
          ? (results[i].count / results[i - 1].count * 100)
          : 0;
      }
    }

    return results;
  }

  // Cohort analysis
  cohort(cohortEvent, targetEvent, filter = {}) {
    const events = this.tracker.getEvents(filter);

    // Find cohorts (users grouped by when they did cohortEvent)
    const cohorts = new Map();

    for (const event of events) {
      if (event.name === cohortEvent && event.context.userId) {
        const week = this.getBucket(event.context.timestamp, 'week');
        if (!cohorts.has(event.context.userId)) {
          cohorts.set(event.context.userId, { cohortWeek: week, targetEvents: [] });
        }
      }
    }

    // Track target events
    for (const event of events) {
      if (event.name === targetEvent && cohorts.has(event.context.userId)) {
        cohorts.get(event.context.userId).targetEvents.push(event);
      }
    }

    // Aggregate by cohort week
    const cohortData = {};
    for (const [userId, data] of cohorts) {
      if (!cohortData[data.cohortWeek]) {
        cohortData[data.cohortWeek] = { users: 0, retained: {} };
      }
      cohortData[data.cohortWeek].users++;

      for (const targetEvent of data.targetEvents) {
        const week = this.getBucket(targetEvent.context.timestamp, 'week');
        cohortData[data.cohortWeek].retained[week] =
          (cohortData[data.cohortWeek].retained[week] || 0) + 1;
      }
    }

    return cohortData;
  }

  // Get summary stats
  summary(filter = {}) {
    const events = this.tracker.getEvents(filter);

    return {
      totalEvents: events.length,
      uniqueUsers: this.countUniqueUsers(filter),
      uniqueSessions: this.countUniqueSessions(filter),
      eventCounts: this.countByEvent(filter),
      topEvents: Object.entries(this.countByEvent(filter))
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }))
    };
  }
}

// ============================================
// REAL-TIME DASHBOARD
// ============================================

class RealTimeDashboard extends EventEmitter {
  constructor(tracker) {
    super();
    this.tracker = tracker;
    this.aggregator = new AnalyticsAggregator(tracker);
    this.metrics = {
      activeUsers: new Set(),
      eventsPerMinute: 0,
      recentEvents: []
    };

    this.startTracking();
  }

  startTracking() {
    this.tracker.on('event', (event) => {
      // Track active users (last 5 minutes)
      const userId = event.context.userId || event.context.anonymousId;
      this.metrics.activeUsers.add(userId);

      // Track recent events
      this.metrics.recentEvents.push(event);
      if (this.metrics.recentEvents.length > 100) {
        this.metrics.recentEvents.shift();
      }

      this.emit('update', this.getMetrics());
    });

    // Cleanup old active users every minute
    setInterval(() => {
      const fiveMinutesAgo = Date.now() - 300000;
      const recentEvents = this.tracker.getEvents({ since: fiveMinutesAgo });

      this.metrics.activeUsers = new Set(
        recentEvents.map(e => e.context.userId || e.context.anonymousId)
      );

      // Calculate events per minute
      const oneMinuteAgo = Date.now() - 60000;
      this.metrics.eventsPerMinute = this.tracker.getEvents({ since: oneMinuteAgo }).length;

    }, 60000);
  }

  getMetrics() {
    return {
      activeUsers: this.metrics.activeUsers.size,
      eventsPerMinute: this.metrics.eventsPerMinute,
      recentEvents: this.metrics.recentEvents.slice(-20),
      summary: this.aggregator.summary({ since: Date.now() - 3600000 }) // Last hour
    };
  }

  generateReport() {
    const metrics = this.getMetrics();
    const summary = this.aggregator.summary({ since: Date.now() - 86400000 }); // Last 24h

    return `
╔══════════════════════════════════════════════════════════════╗
║           NOIZYLAB ANALYTICS DASHBOARD                       ║
║           ${new Date().toISOString().padEnd(45)}║
╠══════════════════════════════════════════════════════════════╣

  REAL-TIME METRICS
  ─────────────────────────────────────────────────────────────
  Active Users (5m):     ${metrics.activeUsers}
  Events/Minute:         ${metrics.eventsPerMinute}

  LAST 24 HOURS
  ─────────────────────────────────────────────────────────────
  Total Events:          ${summary.totalEvents}
  Unique Users:          ${summary.uniqueUsers}
  Unique Sessions:       ${summary.uniqueSessions}

  TOP EVENTS
  ─────────────────────────────────────────────────────────────
${summary.topEvents.map(e => `  ${e.name.padEnd(25)} ${e.count}`).join('\n')}

╚══════════════════════════════════════════════════════════════╝
`;
  }
}

// ============================================
// ANALYTICS SINKS
// ============================================

class ConsoleSink {
  async write(events) {
    console.log(`[Analytics] Flushing ${events.length} events`);
  }
}

class FileSink {
  constructor(filename) {
    this.filename = filename;
  }

  async write(events) {
    const fs = require('fs').promises;
    const data = events.map(e => JSON.stringify(e)).join('\n') + '\n';
    await fs.appendFile(this.filename, data);
  }
}

class WebhookSink {
  constructor(url, options = {}) {
    this.url = url;
    this.headers = options.headers || {};
    this.batchSize = options.batchSize || 100;
  }

  async write(events) {
    for (let i = 0; i < events.length; i += this.batchSize) {
      const batch = events.slice(i, i + this.batchSize);

      await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        },
        body: JSON.stringify({ events: batch })
      });
    }
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  EventTracker,
  AnalyticsAggregator,
  RealTimeDashboard,
  ConsoleSink,
  FileSink,
  WebhookSink,

  // Quick setup
  createTracker: (options) => new EventTracker(options),
  createDashboard: (tracker) => new RealTimeDashboard(tracker)
};
