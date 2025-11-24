/**
 * NOIZYLAB Email System - Suppression List Service
 * Manages email addresses that should not receive emails
 */

import { ValidationError, RecipientBlockedError } from '../errors';
import { generateRequestId, now, normalizeEmail, isValidEmail } from '../utils';

/**
 * Suppression reason types
 */
export type SuppressionReason = 'bounce' | 'complaint' | 'manual' | 'unsubscribe';

/**
 * Suppression entry
 */
export interface SuppressionEntry {
  id: string;
  email: string;
  reason: SuppressionReason;
  sourceMessageId?: string;
  notes?: string;
  createdAt: string;
  expiresAt?: string;
}

/**
 * Bulk suppression result
 */
export interface BulkSuppressionResult {
  added: number;
  skipped: number;
  errors: Array<{ email: string; error: string }>;
}

/**
 * Suppression list service
 */
export class SuppressionService {
  private readonly db: D1Database;
  private readonly kv: KVNamespace;
  private readonly cachePrefix = 'suppression';
  private readonly cacheTtl = 3600; // 1 hour

  constructor(db: D1Database, kv: KVNamespace) {
    this.db = db;
    this.kv = kv;
  }

  /**
   * Check if an email is suppressed
   */
  async isEmailSuppressed(email: string): Promise<{ suppressed: boolean; reason?: SuppressionReason }> {
    const normalizedEmail = normalizeEmail(email);

    // Check cache first
    const cacheKey = `${this.cachePrefix}:${normalizedEmail}`;
    const cached = await this.kv.get(cacheKey);
    if (cached !== null) {
      if (cached === 'not_suppressed') {
        return { suppressed: false };
      }
      return { suppressed: true, reason: cached as SuppressionReason };
    }

    // Check database
    const result = await this.db
      .prepare(
        `SELECT reason FROM suppression_list
         WHERE email = ?
         AND (expires_at IS NULL OR expires_at > datetime('now'))`
      )
      .bind(normalizedEmail)
      .first();

    if (result !== null) {
      const reason = String(result['reason']) as SuppressionReason;
      await this.kv.put(cacheKey, reason, { expirationTtl: this.cacheTtl });
      return { suppressed: true, reason };
    }

    await this.kv.put(cacheKey, 'not_suppressed', { expirationTtl: this.cacheTtl });
    return { suppressed: false };
  }

  /**
   * Check multiple emails for suppression
   */
  async checkEmails(emails: string[]): Promise<Map<string, { suppressed: boolean; reason?: SuppressionReason }>> {
    const results = new Map<string, { suppressed: boolean; reason?: SuppressionReason }>();

    // Normalize all emails
    const normalizedEmails = emails.map(normalizeEmail);

    // Check cache for all emails
    const uncached: string[] = [];
    for (const email of normalizedEmails) {
      const cacheKey = `${this.cachePrefix}:${email}`;
      const cached = await this.kv.get(cacheKey);

      if (cached !== null) {
        if (cached === 'not_suppressed') {
          results.set(email, { suppressed: false });
        } else {
          results.set(email, { suppressed: true, reason: cached as SuppressionReason });
        }
      } else {
        uncached.push(email);
      }
    }

    // Query database for uncached emails
    if (uncached.length > 0) {
      const placeholders = uncached.map(() => '?').join(',');
      const query = `
        SELECT email, reason FROM suppression_list
        WHERE email IN (${placeholders})
        AND (expires_at IS NULL OR expires_at > datetime('now'))
      `;

      const dbResults = await this.db
        .prepare(query)
        .bind(...uncached)
        .all();

      const suppressedEmails = new Set<string>();
      for (const row of dbResults.results ?? []) {
        const email = String(row['email']);
        const reason = String(row['reason']) as SuppressionReason;
        results.set(email, { suppressed: true, reason });
        suppressedEmails.add(email);

        // Cache result
        await this.kv.put(`${this.cachePrefix}:${email}`, reason, { expirationTtl: this.cacheTtl });
      }

      // Cache not suppressed
      for (const email of uncached) {
        if (!suppressedEmails.has(email)) {
          results.set(email, { suppressed: false });
          await this.kv.put(`${this.cachePrefix}:${email}`, 'not_suppressed', {
            expirationTtl: this.cacheTtl,
          });
        }
      }
    }

    return results;
  }

  /**
   * Add email to suppression list
   */
  async addEmail(
    email: string,
    reason: SuppressionReason,
    options: { sourceMessageId?: string; notes?: string; expiresAt?: string } = {}
  ): Promise<SuppressionEntry> {
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      throw new ValidationError('Invalid email address');
    }

    const timestamp = now();
    const id = generateRequestId();

    await this.db
      .prepare(
        `INSERT INTO suppression_list (id, email, reason, source_message_id, notes, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET
           reason = excluded.reason,
           source_message_id = COALESCE(excluded.source_message_id, suppression_list.source_message_id),
           notes = COALESCE(excluded.notes, suppression_list.notes),
           expires_at = excluded.expires_at`
      )
      .bind(
        id,
        normalizedEmail,
        reason,
        options.sourceMessageId ?? null,
        options.notes ?? null,
        timestamp,
        options.expiresAt ?? null
      )
      .run();

    // Invalidate cache
    await this.kv.delete(`${this.cachePrefix}:${normalizedEmail}`);

    return {
      id,
      email: normalizedEmail,
      reason,
      sourceMessageId: options.sourceMessageId,
      notes: options.notes,
      createdAt: timestamp,
      expiresAt: options.expiresAt,
    };
  }

  /**
   * Add multiple emails to suppression list
   */
  async addEmails(
    entries: Array<{
      email: string;
      reason: SuppressionReason;
      notes?: string;
      expiresAt?: string;
    }>
  ): Promise<BulkSuppressionResult> {
    const result: BulkSuppressionResult = {
      added: 0,
      skipped: 0,
      errors: [],
    };

    for (const entry of entries) {
      try {
        if (!isValidEmail(entry.email)) {
          result.errors.push({ email: entry.email, error: 'Invalid email address' });
          continue;
        }

        await this.addEmail(entry.email, entry.reason, {
          notes: entry.notes,
          expiresAt: entry.expiresAt,
        });
        result.added++;
      } catch (error) {
        result.errors.push({
          email: entry.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Remove email from suppression list
   */
  async removeEmail(email: string): Promise<boolean> {
    const normalizedEmail = normalizeEmail(email);

    const result = await this.db
      .prepare('DELETE FROM suppression_list WHERE email = ?')
      .bind(normalizedEmail)
      .run();

    // Invalidate cache
    await this.kv.delete(`${this.cachePrefix}:${normalizedEmail}`);

    return (result.meta.changes ?? 0) > 0;
  }

  /**
   * Get suppression entry
   */
  async getEntry(email: string): Promise<SuppressionEntry | null> {
    const normalizedEmail = normalizeEmail(email);

    const result = await this.db
      .prepare('SELECT * FROM suppression_list WHERE email = ?')
      .bind(normalizedEmail)
      .first();

    if (result === null) {
      return null;
    }

    return {
      id: String(result['id']),
      email: String(result['email']),
      reason: String(result['reason']) as SuppressionReason,
      sourceMessageId: result['source_message_id'] ? String(result['source_message_id']) : undefined,
      notes: result['notes'] ? String(result['notes']) : undefined,
      createdAt: String(result['created_at']),
      expiresAt: result['expires_at'] ? String(result['expires_at']) : undefined,
    };
  }

  /**
   * List suppressed emails with pagination
   */
  async listEntries(options: {
    reason?: SuppressionReason;
    limit?: number;
    offset?: number;
    search?: string;
  } = {}): Promise<{ entries: SuppressionEntry[]; total: number }> {
    const { reason, limit = 50, offset = 0, search } = options;

    let whereClause = '1=1';
    const params: unknown[] = [];

    if (reason !== undefined) {
      whereClause += ' AND reason = ?';
      params.push(reason);
    }

    if (search !== undefined && search !== '') {
      whereClause += ' AND email LIKE ?';
      params.push(`%${search}%`);
    }

    const countQuery = `SELECT COUNT(*) as count FROM suppression_list WHERE ${whereClause}`;
    const countResult = await this.db
      .prepare(countQuery)
      .bind(...params)
      .first<{ count: number }>();

    const query = `
      SELECT * FROM suppression_list
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const result = await this.db
      .prepare(query)
      .bind(...params, limit, offset)
      .all();

    const entries: SuppressionEntry[] = (result.results ?? []).map((row) => ({
      id: String(row['id']),
      email: String(row['email']),
      reason: String(row['reason']) as SuppressionReason,
      sourceMessageId: row['source_message_id'] ? String(row['source_message_id']) : undefined,
      notes: row['notes'] ? String(row['notes']) : undefined,
      createdAt: String(row['created_at']),
      expiresAt: row['expires_at'] ? String(row['expires_at']) : undefined,
    }));

    return {
      entries,
      total: countResult?.count ?? 0,
    };
  }

  /**
   * Get suppression statistics
   */
  async getStats(): Promise<Record<SuppressionReason, number>> {
    const result = await this.db
      .prepare('SELECT reason, COUNT(*) as count FROM suppression_list GROUP BY reason')
      .all();

    const stats: Record<SuppressionReason, number> = {
      bounce: 0,
      complaint: 0,
      manual: 0,
      unsubscribe: 0,
    };

    for (const row of result.results ?? []) {
      const reason = String(row['reason']) as SuppressionReason;
      stats[reason] = Number(row['count'] ?? 0);
    }

    return stats;
  }

  /**
   * Clean up expired suppressions
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.db
      .prepare("DELETE FROM suppression_list WHERE expires_at IS NOT NULL AND expires_at < datetime('now')")
      .run();

    return result.meta.changes ?? 0;
  }

  /**
   * Validate recipients before sending
   * Throws RecipientBlockedError if any recipient is suppressed
   */
  async validateRecipients(emails: string[]): Promise<void> {
    const results = await this.checkEmails(emails);

    for (const [email, status] of results) {
      if (status.suppressed) {
        throw new RecipientBlockedError(
          email,
          `Email is suppressed due to: ${status.reason}`
        );
      }
    }
  }

  /**
   * Filter out suppressed recipients
   */
  async filterSuppressed(emails: string[]): Promise<{
    allowed: string[];
    suppressed: Array<{ email: string; reason: SuppressionReason }>;
  }> {
    const results = await this.checkEmails(emails);

    const allowed: string[] = [];
    const suppressed: Array<{ email: string; reason: SuppressionReason }> = [];

    for (const [email, status] of results) {
      if (status.suppressed && status.reason !== undefined) {
        suppressed.push({ email, reason: status.reason });
      } else {
        allowed.push(email);
      }
    }

    return { allowed, suppressed };
  }
}

/**
 * Create suppression service from environment
 */
export function createSuppressionService(env: Env): SuppressionService {
  return new SuppressionService(env.EMAIL_DB, env.EMAIL_KV);
}
