/**
 * GORUNFREEX1TRILLION - LOGGER
 * High-performance structured logging system
 */

const { EventEmitter } = require('events');
const { createWriteStream } = require('fs');
const path = require('path');

// ============================================
// LOG LEVELS
// ============================================

const LogLevels = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  FATAL: 5,
  SILENT: 6
};

const LevelNames = Object.fromEntries(
  Object.entries(LogLevels).map(([k, v]) => [v, k])
);

const LevelColors = {
  TRACE: '\x1b[90m',  // Gray
  DEBUG: '\x1b[36m',  // Cyan
  INFO: '\x1b[32m',   // Green
  WARN: '\x1b[33m',   // Yellow
  ERROR: '\x1b[31m',  // Red
  FATAL: '\x1b[35m',  // Magenta
  RESET: '\x1b[0m'
};

// ============================================
// FORMATTERS
// ============================================

const Formatters = {
  json: (entry) => JSON.stringify(entry),

  pretty: (entry) => {
    const color = LevelColors[entry.level] || '';
    const reset = LevelColors.RESET;
    const time = new Date(entry.timestamp).toISOString();
    const ctx = entry.context ? ` [${entry.context}]` : '';
    const meta = entry.meta && Object.keys(entry.meta).length > 0
      ? '\n  ' + JSON.stringify(entry.meta, null, 2).split('\n').join('\n  ')
      : '';
    const error = entry.error
      ? `\n  ${entry.error.stack || entry.error.message}`
      : '';

    return `${color}${time} [${entry.level}]${ctx} ${entry.message}${meta}${error}${reset}`;
  },

  compact: (entry) => {
    const time = new Date(entry.timestamp).toTimeString().split(' ')[0];
    const level = entry.level.charAt(0);
    return `${time} ${level} ${entry.message}`;
  },

  clf: (entry) => {
    // Common Log Format
    const time = new Date(entry.timestamp).toISOString();
    return `- - - [${time}] "${entry.message}" - -`;
  }
};

// ============================================
// TRANSPORTS
// ============================================

class Transport extends EventEmitter {
  constructor(options = {}) {
    super();
    this.level = options.level || 'INFO';
    this.formatter = options.formatter || Formatters.json;
  }

  shouldLog(level) {
    return LogLevels[level] >= LogLevels[this.level];
  }

  log(entry) {
    throw new Error('Transport.log() must be implemented');
  }
}

class ConsoleTransport extends Transport {
  constructor(options = {}) {
    super({
      formatter: options.pretty !== false ? Formatters.pretty : Formatters.json,
      ...options
    });
  }

  log(entry) {
    if (!this.shouldLog(entry.level)) return;

    const output = this.formatter(entry);
    const method = entry.level === 'ERROR' || entry.level === 'FATAL' ? 'error' : 'log';
    console[method](output);
  }
}

class FileTransport extends Transport {
  constructor(options = {}) {
    super(options);
    this.filename = options.filename || 'app.log';
    this.maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 5;
    this.currentSize = 0;
    this.stream = null;
    this.queue = [];

    this.openStream();
  }

  openStream() {
    this.stream = createWriteStream(this.filename, { flags: 'a' });
    this.stream.on('error', (err) => this.emit('error', err));
  }

  async rotate() {
    this.stream.end();

    // Rename existing files
    for (let i = this.maxFiles - 1; i >= 0; i--) {
      const oldFile = i === 0 ? this.filename : `${this.filename}.${i}`;
      const newFile = `${this.filename}.${i + 1}`;

      try {
        const fs = require('fs').promises;
        await fs.rename(oldFile, newFile);
      } catch (e) {
        // File doesn't exist, skip
      }
    }

    // Delete oldest if exceeds maxFiles
    try {
      const fs = require('fs').promises;
      await fs.unlink(`${this.filename}.${this.maxFiles}`);
    } catch (e) {
      // File doesn't exist
    }

    this.currentSize = 0;
    this.openStream();
  }

  log(entry) {
    if (!this.shouldLog(entry.level)) return;

    const output = this.formatter(entry) + '\n';
    const size = Buffer.byteLength(output);

    if (this.currentSize + size > this.maxSize) {
      this.rotate().then(() => {
        this.stream.write(output);
        this.currentSize = size;
      });
    } else {
      this.stream.write(output);
      this.currentSize += size;
    }
  }

  close() {
    return new Promise((resolve) => {
      this.stream.end(resolve);
    });
  }
}

class HttpTransport extends Transport {
  constructor(options = {}) {
    super(options);
    this.url = options.url;
    this.headers = options.headers || {};
    this.batchSize = options.batchSize || 100;
    this.flushInterval = options.flushInterval || 5000;
    this.batch = [];

    this.startFlushing();
  }

  log(entry) {
    if (!this.shouldLog(entry.level)) return;

    this.batch.push(entry);

    if (this.batch.length >= this.batchSize) {
      this.flush();
    }
  }

  startFlushing() {
    setInterval(() => {
      if (this.batch.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  async flush() {
    if (this.batch.length === 0) return;

    const entries = this.batch;
    this.batch = [];

    try {
      await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        },
        body: JSON.stringify({ logs: entries })
      });
    } catch (error) {
      this.emit('error', error);
      // Re-add to batch for retry
      this.batch.unshift(...entries);
    }
  }
}

// ============================================
// LOGGER
// ============================================

class Logger extends EventEmitter {
  constructor(options = {}) {
    super();
    this.context = options.context || '';
    this.level = options.level || 'INFO';
    this.transports = options.transports || [new ConsoleTransport()];
    this.defaultMeta = options.meta || {};
    this.redact = options.redact || [];
    this.children = [];
  }

  setLevel(level) {
    this.level = level.toUpperCase();
  }

  addTransport(transport) {
    this.transports.push(transport);
    return this;
  }

  removeTransport(transport) {
    const index = this.transports.indexOf(transport);
    if (index > -1) this.transports.splice(index, 1);
    return this;
  }

  child(options = {}) {
    const childLogger = new Logger({
      context: options.context || this.context,
      level: options.level || this.level,
      transports: this.transports,
      meta: { ...this.defaultMeta, ...options.meta },
      redact: [...this.redact, ...(options.redact || [])]
    });

    this.children.push(childLogger);
    return childLogger;
  }

  redactSensitive(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const redacted = { ...obj };

    for (const key of this.redact) {
      if (key in redacted) {
        redacted[key] = '[REDACTED]';
      }
    }

    return redacted;
  }

  createEntry(level, message, meta = {}) {
    const entry = {
      timestamp: Date.now(),
      level,
      message,
      context: this.context,
      meta: this.redactSensitive({ ...this.defaultMeta, ...meta })
    };

    if (meta instanceof Error) {
      entry.error = {
        name: meta.name,
        message: meta.message,
        stack: meta.stack
      };
      entry.meta = this.defaultMeta;
    } else if (meta.error instanceof Error) {
      entry.error = {
        name: meta.error.name,
        message: meta.error.message,
        stack: meta.error.stack
      };
      delete entry.meta.error;
    }

    return entry;
  }

  log(level, message, meta) {
    if (LogLevels[level] < LogLevels[this.level]) return;

    const entry = this.createEntry(level, message, meta);

    for (const transport of this.transports) {
      transport.log(entry);
    }

    this.emit('log', entry);

    if (level === 'FATAL') {
      this.emit('fatal', entry);
    }
  }

  trace(message, meta) { this.log('TRACE', message, meta); }
  debug(message, meta) { this.log('DEBUG', message, meta); }
  info(message, meta) { this.log('INFO', message, meta); }
  warn(message, meta) { this.log('WARN', message, meta); }
  error(message, meta) { this.log('ERROR', message, meta); }
  fatal(message, meta) { this.log('FATAL', message, meta); }

  // Performance timing
  time(label) {
    return {
      label,
      start: process.hrtime.bigint(),
      end: () => {
        const duration = Number(process.hrtime.bigint() - this.start) / 1e6;
        this.info(`${label} completed`, { duration: `${duration.toFixed(2)}ms` });
        return duration;
      }
    };
  }

  // Request logging
  request(req, res, next) {
    const start = Date.now();
    const { method, url, headers } = req;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;

      this.info(`${method} ${url}`, {
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
        userAgent: headers['user-agent']
      });
    });

    if (next) next();
  }

  async flush() {
    const flushPromises = this.transports
      .filter(t => typeof t.flush === 'function')
      .map(t => t.flush());

    await Promise.all(flushPromises);
  }
}

// ============================================
// GLOBAL LOGGER
// ============================================

const globalLogger = new Logger({
  context: 'NOIZYLAB',
  transports: [new ConsoleTransport({ pretty: true })]
});

// ============================================
// EXPORTS
// ============================================

module.exports = {
  Logger,
  LogLevels,
  Formatters,
  Transport,
  ConsoleTransport,
  FileTransport,
  HttpTransport,

  // Global logger methods
  trace: (...args) => globalLogger.trace(...args),
  debug: (...args) => globalLogger.debug(...args),
  info: (...args) => globalLogger.info(...args),
  warn: (...args) => globalLogger.warn(...args),
  error: (...args) => globalLogger.error(...args),
  fatal: (...args) => globalLogger.fatal(...args),

  // Create new logger
  create: (options) => new Logger(options),
  child: (options) => globalLogger.child(options),

  // Configure global logger
  configure: (options) => {
    if (options.level) globalLogger.setLevel(options.level);
    if (options.transports) {
      globalLogger.transports = options.transports;
    }
    if (options.redact) {
      globalLogger.redact = options.redact;
    }
  }
};
