/**
 * NOIZYLAB Email System - Analytics Routes
 * API endpoints for email analytics and statistics
 */

import { Hono } from 'hono';
import type { TimeRange } from '../services/analytics-service';
import { toNoizylabError } from '../errors';
import { now } from '../utils';

/**
 * Context type with analytics service
 */
interface AnalyticsContext {
  Variables: {
    analyticsService: import('../services/analytics-service').AnalyticsService;
    requestId: string;
  };
}

const analyticsRoutes = new Hono<AnalyticsContext>();

/**
 * GET /analytics/overview - Get analytics overview
 */
analyticsRoutes.get('/overview', async (c) => {
  const requestId = c.get('requestId');
  const analyticsService = c.get('analyticsService');

  const timeRange = (c.req.query('range') ?? '24h') as TimeRange;

  try {
    const overview = await analyticsService.getOverview(timeRange);

    return c.json({
      success: true,
      data: overview,
      meta: { requestId, timestamp: now() },
    });
  } catch (error) {
    const noizylabError = toNoizylabError(error);
    return c.json(noizylabError.toJSON(), noizylabError.statusCode);
  }
});

/**
 * GET /analytics/volume - Get email volume time series
 */
analyticsRoutes.get('/volume', async (c) => {
  const requestId = c.get('requestId');
  const analyticsService = c.get('analyticsService');

  const timeRange = (c.req.query('range') ?? '24h') as TimeRange;
  const granularity = (c.req.query('granularity') ?? 'hour') as 'hour' | 'day';

  try {
    const volume = await analyticsService.getVolumeTimeSeries(timeRange, granularity);

    return c.json({
      success: true,
      data: volume,
      meta: {
        requestId,
        timestamp: now(),
        timeRange,
        granularity,
      },
    });
  } catch (error) {
    const noizylabError = toNoizylabError(error);
    return c.json(noizylabError.toJSON(), noizylabError.statusCode);
  }
});

/**
 * GET /analytics/providers - Get provider performance metrics
 */
analyticsRoutes.get('/providers', async (c) => {
  const requestId = c.get('requestId');
  const analyticsService = c.get('analyticsService');

  const timeRange = (c.req.query('range') ?? '24h') as TimeRange;

  try {
    const providers = await analyticsService.getProviderMetrics(timeRange);

    return c.json({
      success: true,
      data: providers,
      meta: { requestId, timestamp: now(), timeRange },
    });
  } catch (error) {
    const noizylabError = toNoizylabError(error);
    return c.json(noizylabError.toJSON(), noizylabError.statusCode);
  }
});

/**
 * GET /analytics/domains - Get domain statistics
 */
analyticsRoutes.get('/domains', async (c) => {
  const requestId = c.get('requestId');
  const analyticsService = c.get('analyticsService');

  const timeRange = (c.req.query('range') ?? '24h') as TimeRange;
  const limit = parseInt(c.req.query('limit') ?? '20', 10);

  try {
    const domains = await analyticsService.getDomainStats(timeRange, limit);

    return c.json({
      success: true,
      data: domains,
      meta: { requestId, timestamp: now(), timeRange },
    });
  } catch (error) {
    const noizylabError = toNoizylabError(error);
    return c.json(noizylabError.toJSON(), noizylabError.statusCode);
  }
});

/**
 * GET /analytics/templates - Get template performance
 */
analyticsRoutes.get('/templates', async (c) => {
  const requestId = c.get('requestId');
  const analyticsService = c.get('analyticsService');

  const timeRange = (c.req.query('range') ?? '30d') as TimeRange;
  const limit = parseInt(c.req.query('limit') ?? '20', 10);

  try {
    const templates = await analyticsService.getTemplateStats(timeRange, limit);

    return c.json({
      success: true,
      data: templates,
      meta: { requestId, timestamp: now(), timeRange },
    });
  } catch (error) {
    const noizylabError = toNoizylabError(error);
    return c.json(noizylabError.toJSON(), noizylabError.statusCode);
  }
});

/**
 * GET /analytics/status - Get status breakdown
 */
analyticsRoutes.get('/status', async (c) => {
  const requestId = c.get('requestId');
  const analyticsService = c.get('analyticsService');

  const timeRange = (c.req.query('range') ?? '24h') as TimeRange;

  try {
    const breakdown = await analyticsService.getStatusBreakdown(timeRange);

    return c.json({
      success: true,
      data: breakdown,
      meta: { requestId, timestamp: now(), timeRange },
    });
  } catch (error) {
    const noizylabError = toNoizylabError(error);
    return c.json(noizylabError.toJSON(), noizylabError.statusCode);
  }
});

/**
 * POST /analytics/invalidate-cache - Invalidate analytics cache
 */
analyticsRoutes.post('/invalidate-cache', async (c) => {
  const requestId = c.get('requestId');
  const analyticsService = c.get('analyticsService');

  try {
    await analyticsService.invalidateCache();

    return c.json({
      success: true,
      data: { invalidated: true },
      meta: { requestId, timestamp: now() },
    });
  } catch (error) {
    const noizylabError = toNoizylabError(error);
    return c.json(noizylabError.toJSON(), noizylabError.statusCode);
  }
});

export { analyticsRoutes };
