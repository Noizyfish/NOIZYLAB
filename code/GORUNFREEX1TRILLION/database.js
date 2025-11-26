/**
 * GORUNFREEX1TRILLION - DATABASE UTILITIES
 * High-performance database abstraction layer
 */

const { EventEmitter } = require('events');

// ============================================
// CONNECTION POOL
// ============================================

class ConnectionPool extends EventEmitter {
  constructor(options = {}) {
    super();
    this.minConnections = options.min || 2;
    this.maxConnections = options.max || 10;
    this.acquireTimeout = options.acquireTimeout || 30000;
    this.idleTimeout = options.idleTimeout || 60000;
    this.createConnection = options.create;
    this.destroyConnection = options.destroy || ((conn) => conn.end?.());
    this.validateConnection = options.validate || (() => true);

    this.pool = [];
    this.waiting = [];
    this.activeCount = 0;
    this.stats = { acquired: 0, released: 0, created: 0, destroyed: 0, timeouts: 0 };
  }

  async initialize() {
    for (let i = 0; i < this.minConnections; i++) {
      const conn = await this.createNewConnection();
      this.pool.push({ connection: conn, lastUsed: Date.now() });
    }
    this.startIdleCheck();
    this.emit('initialized', { connections: this.pool.length });
  }

  async createNewConnection() {
    const conn = await this.createConnection();
    this.stats.created++;
    return conn;
  }

  async acquire() {
    // Try to get from pool
    while (this.pool.length > 0) {
      const item = this.pool.pop();
      if (await this.validateConnection(item.connection)) {
        this.activeCount++;
        this.stats.acquired++;
        return item.connection;
      } else {
        await this.destroyConnection(item.connection);
        this.stats.destroyed++;
      }
    }

    // Create new if under max
    if (this.activeCount < this.maxConnections) {
      const conn = await this.createNewConnection();
      this.activeCount++;
      this.stats.acquired++;
      return conn;
    }

    // Wait for available connection
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waiting.indexOf(waiter);
        if (index > -1) this.waiting.splice(index, 1);
        this.stats.timeouts++;
        reject(new Error('Connection acquire timeout'));
      }, this.acquireTimeout);

      const waiter = { resolve, reject, timeout };
      this.waiting.push(waiter);
    });
  }

  release(connection) {
    this.activeCount--;
    this.stats.released++;

    if (this.waiting.length > 0) {
      const waiter = this.waiting.shift();
      clearTimeout(waiter.timeout);
      this.activeCount++;
      waiter.resolve(connection);
    } else {
      this.pool.push({ connection, lastUsed: Date.now() });
    }
  }

  startIdleCheck() {
    setInterval(() => {
      const now = Date.now();
      const toRemove = [];

      for (let i = this.pool.length - 1; i >= 0; i--) {
        if (this.pool.length <= this.minConnections) break;

        if (now - this.pool[i].lastUsed > this.idleTimeout) {
          toRemove.push(this.pool.splice(i, 1)[0]);
        }
      }

      toRemove.forEach(item => {
        this.destroyConnection(item.connection);
        this.stats.destroyed++;
      });
    }, this.idleTimeout / 2);
  }

  async withConnection(fn) {
    const conn = await this.acquire();
    try {
      return await fn(conn);
    } finally {
      this.release(conn);
    }
  }

  getStats() {
    return {
      ...this.stats,
      poolSize: this.pool.length,
      activeConnections: this.activeCount,
      waitingRequests: this.waiting.length
    };
  }

  async shutdown() {
    // Clear waiting
    for (const waiter of this.waiting) {
      clearTimeout(waiter.timeout);
      waiter.reject(new Error('Pool shutting down'));
    }
    this.waiting = [];

    // Destroy all connections
    for (const item of this.pool) {
      await this.destroyConnection(item.connection);
    }
    this.pool = [];
    this.emit('shutdown');
  }
}

// ============================================
// QUERY BUILDER
// ============================================

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this._select = ['*'];
    this._where = [];
    this._orderBy = [];
    this._groupBy = [];
    this._having = [];
    this._joins = [];
    this._limit = null;
    this._offset = null;
    this._params = [];
  }

  select(...columns) {
    this._select = columns.length > 0 ? columns : ['*'];
    return this;
  }

  where(column, operator, value) {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }
    this._where.push({ column, operator, value, type: 'AND' });
    this._params.push(value);
    return this;
  }

  orWhere(column, operator, value) {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }
    this._where.push({ column, operator, value, type: 'OR' });
    this._params.push(value);
    return this;
  }

  whereIn(column, values) {
    this._where.push({ column, operator: 'IN', value: values, type: 'AND' });
    this._params.push(...values);
    return this;
  }

  whereNull(column) {
    this._where.push({ column, operator: 'IS NULL', value: null, type: 'AND' });
    return this;
  }

  whereNotNull(column) {
    this._where.push({ column, operator: 'IS NOT NULL', value: null, type: 'AND' });
    return this;
  }

  whereBetween(column, min, max) {
    this._where.push({ column, operator: 'BETWEEN', value: [min, max], type: 'AND' });
    this._params.push(min, max);
    return this;
  }

  join(table, column1, operator, column2) {
    this._joins.push({ type: 'INNER', table, column1, operator, column2 });
    return this;
  }

  leftJoin(table, column1, operator, column2) {
    this._joins.push({ type: 'LEFT', table, column1, operator, column2 });
    return this;
  }

  rightJoin(table, column1, operator, column2) {
    this._joins.push({ type: 'RIGHT', table, column1, operator, column2 });
    return this;
  }

  orderBy(column, direction = 'ASC') {
    this._orderBy.push({ column, direction: direction.toUpperCase() });
    return this;
  }

  groupBy(...columns) {
    this._groupBy.push(...columns);
    return this;
  }

  having(column, operator, value) {
    this._having.push({ column, operator, value });
    this._params.push(value);
    return this;
  }

  limit(count) {
    this._limit = count;
    return this;
  }

  offset(count) {
    this._offset = count;
    return this;
  }

  // Build SELECT query
  toSQL() {
    let sql = `SELECT ${this._select.join(', ')} FROM ${this.table}`;

    // Joins
    for (const join of this._joins) {
      sql += ` ${join.type} JOIN ${join.table} ON ${join.column1} ${join.operator} ${join.column2}`;
    }

    // Where
    if (this._where.length > 0) {
      sql += ' WHERE ';
      sql += this._where.map((w, i) => {
        const prefix = i === 0 ? '' : ` ${w.type} `;
        if (w.operator === 'IN') {
          const placeholders = w.value.map(() => '?').join(', ');
          return `${prefix}${w.column} IN (${placeholders})`;
        } else if (w.operator === 'BETWEEN') {
          return `${prefix}${w.column} BETWEEN ? AND ?`;
        } else if (w.value === null) {
          return `${prefix}${w.column} ${w.operator}`;
        }
        return `${prefix}${w.column} ${w.operator} ?`;
      }).join('');
    }

    // Group By
    if (this._groupBy.length > 0) {
      sql += ` GROUP BY ${this._groupBy.join(', ')}`;
    }

    // Having
    if (this._having.length > 0) {
      sql += ' HAVING ' + this._having.map(h =>
        `${h.column} ${h.operator} ?`
      ).join(' AND ');
    }

    // Order By
    if (this._orderBy.length > 0) {
      sql += ' ORDER BY ' + this._orderBy.map(o =>
        `${o.column} ${o.direction}`
      ).join(', ');
    }

    // Limit & Offset
    if (this._limit !== null) {
      sql += ` LIMIT ${this._limit}`;
    }
    if (this._offset !== null) {
      sql += ` OFFSET ${this._offset}`;
    }

    return { sql, params: this._params };
  }

  // Build INSERT query
  insert(data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');

    return {
      sql: `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES (${placeholders})`,
      params: values
    };
  }

  // Build bulk INSERT
  insertMany(records) {
    if (records.length === 0) return { sql: '', params: [] };

    const columns = Object.keys(records[0]);
    const values = [];
    const placeholderRows = [];

    for (const record of records) {
      values.push(...Object.values(record));
      placeholderRows.push(`(${columns.map(() => '?').join(', ')})`);
    }

    return {
      sql: `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES ${placeholderRows.join(', ')}`,
      params: values
    };
  }

  // Build UPDATE query
  update(data) {
    const sets = Object.keys(data).map(col => `${col} = ?`);
    const params = [...Object.values(data), ...this._params];

    let sql = `UPDATE ${this.table} SET ${sets.join(', ')}`;

    if (this._where.length > 0) {
      sql += ' WHERE ' + this._where.map((w, i) => {
        const prefix = i === 0 ? '' : ` ${w.type} `;
        return `${prefix}${w.column} ${w.operator} ?`;
      }).join('');
    }

    return { sql, params };
  }

  // Build DELETE query
  delete() {
    let sql = `DELETE FROM ${this.table}`;

    if (this._where.length > 0) {
      sql += ' WHERE ' + this._where.map((w, i) => {
        const prefix = i === 0 ? '' : ` ${w.type} `;
        return `${prefix}${w.column} ${w.operator} ?`;
      }).join('');
    }

    return { sql, params: this._params };
  }
}

// ============================================
// REPOSITORY PATTERN
// ============================================

class Repository {
  constructor(pool, table, options = {}) {
    this.pool = pool;
    this.table = table;
    this.primaryKey = options.primaryKey || 'id';
    this.timestamps = options.timestamps !== false;
    this.softDelete = options.softDelete || false;
  }

  query() {
    const qb = new QueryBuilder(this.table);
    if (this.softDelete) {
      qb.whereNull('deleted_at');
    }
    return qb;
  }

  async execute(queryOrBuilder) {
    const { sql, params } = typeof queryOrBuilder === 'string'
      ? { sql: queryOrBuilder, params: [] }
      : queryOrBuilder.toSQL ? queryOrBuilder.toSQL() : queryOrBuilder;

    return this.pool.withConnection(async (conn) => {
      return conn.query(sql, params);
    });
  }

  async findById(id) {
    const query = this.query().where(this.primaryKey, id).limit(1);
    const results = await this.execute(query);
    return results[0] || null;
  }

  async findAll(options = {}) {
    let query = this.query();

    if (options.where) {
      for (const [key, value] of Object.entries(options.where)) {
        query = query.where(key, value);
      }
    }

    if (options.orderBy) {
      const [column, direction] = options.orderBy.split(' ');
      query = query.orderBy(column, direction);
    }

    if (options.limit) query = query.limit(options.limit);
    if (options.offset) query = query.offset(options.offset);

    return this.execute(query);
  }

  async create(data) {
    if (this.timestamps) {
      data.created_at = new Date();
      data.updated_at = new Date();
    }

    const query = new QueryBuilder(this.table).insert(data);
    const result = await this.execute(query);
    return { id: result.insertId, ...data };
  }

  async createMany(records) {
    if (this.timestamps) {
      const now = new Date();
      records = records.map(r => ({ ...r, created_at: now, updated_at: now }));
    }

    const query = new QueryBuilder(this.table).insertMany(records);
    return this.execute(query);
  }

  async update(id, data) {
    if (this.timestamps) {
      data.updated_at = new Date();
    }

    const query = new QueryBuilder(this.table)
      .where(this.primaryKey, id)
      .update(data);

    await this.execute(query);
    return this.findById(id);
  }

  async delete(id) {
    if (this.softDelete) {
      return this.update(id, { deleted_at: new Date() });
    }

    const query = new QueryBuilder(this.table)
      .where(this.primaryKey, id)
      .delete();

    return this.execute(query);
  }

  async count(where = {}) {
    let query = new QueryBuilder(this.table).select('COUNT(*) as count');

    for (const [key, value] of Object.entries(where)) {
      query = query.where(key, value);
    }

    if (this.softDelete) {
      query = query.whereNull('deleted_at');
    }

    const result = await this.execute(query);
    return result[0]?.count || 0;
  }

  async exists(where) {
    const count = await this.count(where);
    return count > 0;
  }

  async paginate(page = 1, perPage = 20, options = {}) {
    const offset = (page - 1) * perPage;
    const total = await this.count(options.where || {});
    const data = await this.findAll({ ...options, limit: perPage, offset });

    return {
      data,
      pagination: {
        total,
        perPage,
        currentPage: page,
        lastPage: Math.ceil(total / perPage),
        hasMore: page * perPage < total
      }
    };
  }
}

// ============================================
// TRANSACTION MANAGER
// ============================================

class TransactionManager {
  constructor(pool) {
    this.pool = pool;
  }

  async transaction(fn) {
    const conn = await this.pool.acquire();

    try {
      await conn.query('START TRANSACTION');

      const result = await fn({
        query: (sql, params) => conn.query(sql, params),
        commit: () => conn.query('COMMIT'),
        rollback: () => conn.query('ROLLBACK')
      });

      await conn.query('COMMIT');
      return result;

    } catch (error) {
      await conn.query('ROLLBACK');
      throw error;

    } finally {
      this.pool.release(conn);
    }
  }
}

// ============================================
// MIGRATION RUNNER
// ============================================

class MigrationRunner {
  constructor(pool, options = {}) {
    this.pool = pool;
    this.table = options.table || 'migrations';
    this.directory = options.directory || './migrations';
  }

  async initialize() {
    await this.pool.withConnection(async (conn) => {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS ${this.table} (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          batch INT NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });
  }

  async getExecuted() {
    return this.pool.withConnection(async (conn) => {
      const rows = await conn.query(`SELECT name FROM ${this.table} ORDER BY batch, id`);
      return rows.map(r => r.name);
    });
  }

  async run(migrations) {
    const executed = await this.getExecuted();
    const pending = migrations.filter(m => !executed.includes(m.name));

    if (pending.length === 0) {
      return { migrated: [], message: 'Nothing to migrate' };
    }

    const batch = Math.max(...(await this.getBatches()), 0) + 1;
    const migrated = [];

    for (const migration of pending) {
      await this.pool.withConnection(async (conn) => {
        await conn.query('START TRANSACTION');
        try {
          await migration.up(conn);
          await conn.query(
            `INSERT INTO ${this.table} (name, batch) VALUES (?, ?)`,
            [migration.name, batch]
          );
          await conn.query('COMMIT');
          migrated.push(migration.name);
        } catch (error) {
          await conn.query('ROLLBACK');
          throw error;
        }
      });
    }

    return { migrated, batch };
  }

  async rollback(steps = 1) {
    const batches = await this.getBatches();
    const targetBatches = batches.slice(-steps);

    const rolledBack = [];

    for (const batch of targetBatches.reverse()) {
      const migrations = await this.getMigrationsForBatch(batch);

      for (const migration of migrations.reverse()) {
        await this.pool.withConnection(async (conn) => {
          await conn.query('START TRANSACTION');
          try {
            if (migration.down) await migration.down(conn);
            await conn.query(`DELETE FROM ${this.table} WHERE name = ?`, [migration.name]);
            await conn.query('COMMIT');
            rolledBack.push(migration.name);
          } catch (error) {
            await conn.query('ROLLBACK');
            throw error;
          }
        });
      }
    }

    return { rolledBack };
  }

  async getBatches() {
    return this.pool.withConnection(async (conn) => {
      const rows = await conn.query(`SELECT DISTINCT batch FROM ${this.table} ORDER BY batch`);
      return rows.map(r => r.batch);
    });
  }

  async getMigrationsForBatch(batch) {
    return this.pool.withConnection(async (conn) => {
      return conn.query(`SELECT * FROM ${this.table} WHERE batch = ? ORDER BY id`, [batch]);
    });
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  ConnectionPool,
  QueryBuilder,
  Repository,
  TransactionManager,
  MigrationRunner,

  // Quick helpers
  query: (table) => new QueryBuilder(table),
  createPool: (options) => new ConnectionPool(options)
};
