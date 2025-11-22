#!/usr/bin/env node

/**
 * NOIZYLAB Email Agent Database
 * SQLite database for email tracking, analytics, and persistence
 */

const Database = require('better-sqlite3');
const path = require('path');

class EmailDatabase {
  constructor(dbPath = './data/noizylab.db') {
    // Ensure data directory exists
    const fs = require('fs');
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initDatabase();
  }
  
  initDatabase() {
    // Email history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS email_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT,
        recipient TEXT NOT NULL,
        subject TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sent_at DATETIME,
        error TEXT,
        template_type TEXT,
        retry_count INTEGER DEFAULT 0
      )
    `);
    
    // Email statistics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS email_stats (
        date TEXT PRIMARY KEY,
        sent_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        queued_count INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Scheduled emails table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scheduled_emails (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT,
        html TEXT,
        schedule_time DATETIME NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sent_at DATETIME
      )
    `);
    
    // API keys table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used DATETIME,
        usage_count INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1
      )
    `);
    
    // Create indices
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_email_history_status ON email_history(status)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_email_history_created ON email_history(created_at)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_scheduled_time ON scheduled_emails(schedule_time, status)`);
  }
  
  // Email History Methods
  logEmail(data) {
    const stmt = this.db.prepare(`
      INSERT INTO email_history (message_id, recipient, subject, status, template_type)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(data.messageId, data.recipient, data.subject, data.status || 'pending', data.template || null);
  }
  
  updateEmailStatus(id, status, messageId = null, error = null) {
    const stmt = this.db.prepare(`
      UPDATE email_history 
      SET status = ?, message_id = COALESCE(?, message_id), error = ?, sent_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(status, messageId, error, id);
  }
  
  getEmailHistory(limit = 100, offset = 0, status = null) {
    let query = 'SELECT * FROM email_history';
    const params = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }
  
  // Statistics Methods
  updateStats(date, sent = 0, failed = 0, queued = 0) {
    const stmt = this.db.prepare(`
      INSERT INTO email_stats (date, sent_count, failed_count, queued_count)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        sent_count = sent_count + excluded.sent_count,
        failed_count = failed_count + excluded.failed_count,
        queued_count = queued_count + excluded.queued_count,
        updated_at = CURRENT_TIMESTAMP
    `);
    return stmt.run(date, sent, failed, queued);
  }
  
  getStats(days = 7) {
    const stmt = this.db.prepare(`
      SELECT * FROM email_stats 
      WHERE date >= date('now', '-' || ? || ' days')
      ORDER BY date DESC
    `);
    return stmt.all(days);
  }
  
  getTotalStats() {
    const stmt = this.db.prepare(`
      SELECT 
        SUM(sent_count) as total_sent,
        SUM(failed_count) as total_failed,
        SUM(queued_count) as total_queued
      FROM email_stats
    `);
    return stmt.get();
  }
  
  // Scheduled Emails Methods
  scheduleEmail(data) {
    const stmt = this.db.prepare(`
      INSERT INTO scheduled_emails (recipient, subject, body, html, schedule_time)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(data.recipient, data.subject, data.text, data.html, data.scheduleTime);
  }
  
  getPendingScheduledEmails() {
    const stmt = this.db.prepare(`
      SELECT * FROM scheduled_emails 
      WHERE status = 'pending' AND schedule_time <= CURRENT_TIMESTAMP
      ORDER BY schedule_time ASC
    `);
    return stmt.all();
  }
  
  updateScheduledEmail(id, status) {
    const stmt = this.db.prepare(`
      UPDATE scheduled_emails 
      SET status = ?, sent_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(status, id);
  }
  
  // API Key Methods
  createApiKey(key, name) {
    const stmt = this.db.prepare(`
      INSERT INTO api_keys (key, name)
      VALUES (?, ?)
    `);
    return stmt.run(key, name);
  }
  
  validateApiKey(key) {
    const stmt = this.db.prepare(`
      SELECT * FROM api_keys WHERE key = ? AND active = 1
    `);
    const result = stmt.get(key);
    
    if (result) {
      // Update usage
      const updateStmt = this.db.prepare(`
        UPDATE api_keys 
        SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      updateStmt.run(result.id);
    }
    
    return result !== undefined;
  }
  
  close() {
    this.db.close();
  }
}

module.exports = EmailDatabase;
