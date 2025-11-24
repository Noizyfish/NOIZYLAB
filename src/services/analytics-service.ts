/**
 * NOIZYLAB Email System - Analytics Service
 * Email analytics, statistics, and reporting
 */

import type { EmailStatus, EmailProvider } from '../types';
import { now } from '../utils';

/**
 * Time range for analytics queries
 */
export type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d' | 'all';

/**
 * Analytics overview statistics
 */
export interface AnalyticsOverview {
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalFailed: number;
  deliveryRate: number;
  bounceRate: number;
  failureRate: number;
  averageDeliveryTime: number | null;
  period: TimeRange;
  timestamp: string;
}

/**
 * Email volume over time
 */
export interface VolumeDataPoint {
  timestamp: string;
  sent: number;
  delivered: number;
  bounced: number;
  failed: number;
}

/**
 * Provider performance metrics
 */
export interface ProviderMetrics {
  provider: EmailProvider;
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalFailed: number;
  deliveryRate: number;
  averageLatency: number | null;
}

/**
 * Top recipients
 */
export interface RecipientStats {
  email: string;
  domain: string;
  totalReceived: number;
  lastEmailAt: string;
}

/**
 * Domain statistics
 */
export interface DomainStats {
  domain: string;
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  deliveryRate: number;
}

/**
 * Template performance
 */
export interface TemplateStats {
  templateId: string;
  templateName: string;
  totalSent: number;
  totalDelivered: number;
  deliveryRate: number;
  lastUsedAt: string;
}

/**
 * Analytics service
 */
export class AnalyticsService {
  private readonly db: D1Database;
  private readonly kv: KVNamespace;
  private readonly cachePrefix = 'analytics';
  private readonly cacheTtl = 300; // 5 minutes

  constructor(db: D1Database, kv: KVNamespace) {
    this.db = db;
    this.kv = kv;
  }

  /**
   * Get analytics overview
   */
  async getOverview(timeRange: TimeRange = '24h'): Promise<AnalyticsOverview> {
    const cacheKey = `${this.cachePrefix}:overview:${timeRange}`;
    const cached = await this.kv.get(cacheKey, 'json');
    if (cached !== null) {
      return cached as AnalyticsOverview;
    }

    const since = this.getTimeSince(timeRange);

    const query = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' OR status = 'delivered' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        AVG(
          CASE
            WHEN delivered_at IS NOT NULL AND sent_at IS NOT NULL
            THEN (julianday(delivered_at) - julianday(sent_at)) * 86400
            ELSE NULL
          END
        ) as avg_delivery_time
      FROM email_logs
      WHERE created_at >= ?
    `;

    const result = await this.db.prepare(query).bind(since).first();

    const total = Number(result?.['total'] ?? 0);
    const sent = Number(result?.['sent'] ?? 0);
    const delivered = Number(result?.['delivered'] ?? 0);
    const bounced = Number(result?.['bounced'] ?? 0);
    const failed = Number(result?.['failed'] ?? 0);
    const avgDeliveryTime = result?.['avg_delivery_time'] as number | null;

    const overview: AnalyticsOverview = {
      totalSent: sent,
      totalDelivered: delivered,
      totalBounced: bounced,
      totalFailed: failed,
      deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
      bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
      failureRate: sent > 0 ? (failed / sent) * 100 : 0,
      averageDeliveryTime: avgDeliveryTime,
      period: timeRange,
      timestamp: now(),
    };

    await this.kv.put(cacheKey, JSON.stringify(overview), { expirationTtl: this.cacheTtl });

    return overview;
  }

  /**
   * Get email volume over time
   */
  async getVolumeTimeSeries(
    timeRange: TimeRange = '24h',
    granularity: 'hour' | 'day' = 'hour'
  ): Promise<VolumeDataPoint[]> {
    const cacheKey = `${this.cachePrefix}:volume:${timeRange}:${granularity}`;
    const cached = await this.kv.get(cacheKey, 'json');
    if (cached !== null) {
      return cached as VolumeDataPoint[];
    }

    const since = this.getTimeSince(timeRange);
    const dateFormat = granularity === 'hour' ? '%Y-%m-%d %H:00:00' : '%Y-%m-%d';

    const query = `
      SELECT
        strftime('${dateFormat}', created_at) as time_bucket,
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('sent', 'delivered') THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM email_logs
      WHERE created_at >= ?
      GROUP BY time_bucket
      ORDER BY time_bucket ASC
    `;

    const result = await this.db.prepare(query).bind(since).all();

    const dataPoints: VolumeDataPoint[] = (result.results ?? []).map((row) => ({
      timestamp: String(row['time_bucket']),
      sent: Number(row['sent'] ?? 0),
      delivered: Number(row['delivered'] ?? 0),
      bounced: Number(row['bounced'] ?? 0),
      failed: Number(row['failed'] ?? 0),
    }));

    await this.kv.put(cacheKey, JSON.stringify(dataPoints), { expirationTtl: this.cacheTtl });

    return dataPoints;
  }

  /**
   * Get provider performance metrics
   */
  async getProviderMetrics(timeRange: TimeRange = '24h'): Promise<ProviderMetrics[]> {
    const cacheKey = `${this.cachePrefix}:providers:${timeRange}`;
    const cached = await this.kv.get(cacheKey, 'json');
    if (cached !== null) {
      return cached as ProviderMetrics[];
    }

    const since = this.getTimeSince(timeRange);

    const query = `
      SELECT
        provider,
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('sent', 'delivered') THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM email_logs
      WHERE created_at >= ?
      GROUP BY provider
      ORDER BY total DESC
    `;

    const result = await this.db.prepare(query).bind(since).all();

    const metrics: ProviderMetrics[] = (result.results ?? []).map((row) => {
      const sent = Number(row['sent'] ?? 0);
      const delivered = Number(row['delivered'] ?? 0);

      return {
        provider: String(row['provider']) as EmailProvider,
        totalSent: sent,
        totalDelivered: delivered,
        totalBounced: Number(row['bounced'] ?? 0),
        totalFailed: Number(row['failed'] ?? 0),
        deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
        averageLatency: null,
      };
    });

    await this.kv.put(cacheKey, JSON.stringify(metrics), { expirationTtl: this.cacheTtl });

    return metrics;
  }

  /**
   * Get domain statistics
   */
  async getDomainStats(timeRange: TimeRange = '24h', limit: number = 20): Promise<DomainStats[]> {
    const cacheKey = `${this.cachePrefix}:domains:${timeRange}:${limit}`;
    const cached = await this.kv.get(cacheKey, 'json');
    if (cached !== null) {
      return cached as DomainStats[];
    }

    const since = this.getTimeSince(timeRange);

    // Note: This is a simplified query - in production you'd need to parse JSON array
    const query = `
      SELECT
        SUBSTR(from_address, INSTR(from_address, '@') + 1) as domain,
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('sent', 'delivered') THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced
      FROM email_logs
      WHERE created_at >= ?
      GROUP BY domain
      ORDER BY total DESC
      LIMIT ?
    `;

    const result = await this.db.prepare(query).bind(since, limit).all();

    const stats: DomainStats[] = (result.results ?? []).map((row) => {
      const sent = Number(row['sent'] ?? 0);
      const delivered = Number(row['delivered'] ?? 0);

      return {
        domain: String(row['domain']),
        totalSent: sent,
        totalDelivered: delivered,
        totalBounced: Number(row['bounced'] ?? 0),
        deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
      };
    });

    await this.kv.put(cacheKey, JSON.stringify(stats), { expirationTtl: this.cacheTtl });

    return stats;
  }

  /**
   * Get template performance statistics
   */
  async getTemplateStats(timeRange: TimeRange = '30d', limit: number = 20): Promise<TemplateStats[]> {
    const cacheKey = `${this.cachePrefix}:templates:${timeRange}:${limit}`;
    const cached = await this.kv.get(cacheKey, 'json');
    if (cached !== null) {
      return cached as TemplateStats[];
    }

    const since = this.getTimeSince(timeRange);

    const query = `
      SELECT
        template_id,
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('sent', 'delivered') THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        MAX(created_at) as last_used
      FROM email_logs
      WHERE created_at >= ? AND template_id IS NOT NULL
      GROUP BY template_id
      ORDER BY total DESC
      LIMIT ?
    `;

    const result = await this.db.prepare(query).bind(since, limit).all();

    const stats: TemplateStats[] = (result.results ?? []).map((row) => {
      const sent = Number(row['sent'] ?? 0);
      const delivered = Number(row['delivered'] ?? 0);

      return {
        templateId: String(row['template_id']),
        templateName: String(row['template_id']), // Would need join for actual name
        totalSent: sent,
        totalDelivered: delivered,
        deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
        lastUsedAt: String(row['last_used']),
      };
    });

    await this.kv.put(cacheKey, JSON.stringify(stats), { expirationTtl: this.cacheTtl });

    return stats;
  }

  /**
   * Get status breakdown
   */
  async getStatusBreakdown(timeRange: TimeRange = '24h'): Promise<Record<EmailStatus, number>> {
    const since = this.getTimeSince(timeRange);

    const query = `
      SELECT status, COUNT(*) as count
      FROM email_logs
      WHERE created_at >= ?
      GROUP BY status
    `;

    const result = await this.db.prepare(query).bind(since).all();

    const breakdown: Record<string, number> = {
      queued: 0,
      sending: 0,
      sent: 0,
      delivered: 0,
      bounced: 0,
      failed: 0,
      scheduled: 0,
    };

    for (const row of result.results ?? []) {
      const status = String(row['status']);
      breakdown[status] = Number(row['count'] ?? 0);
    }

    return breakdown as Record<EmailStatus, number>;
  }

  /**
   * Invalidate analytics cache
   */
  async invalidateCache(): Promise<void> {
    const list = await this.kv.list({ prefix: `${this.cachePrefix}:` });
    for (const key of list.keys) {
      await this.kv.delete(key.name);
    }
  }

  private getTimeSince(timeRange: TimeRange): string {
    const now = new Date();
    let since: Date;

    switch (timeRange) {
      case '1h':
        since = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        since = new Date(0);
    }

    return since.toISOString();
  }
}

/**
 * Create analytics service from environment
 */
export function createAnalyticsService(env: Env): AnalyticsService {
  return new AnalyticsService(env.EMAIL_DB, env.EMAIL_KV);
}
