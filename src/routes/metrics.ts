/**
 * NOIZYLAB Email System - Metrics Routes
 * API endpoints for Prometheus metrics export
 */

import { Hono } from 'hono';
import { now } from '../utils';

/**
 * Context type with metrics service
 */
interface MetricsContext {
  Variables: {
    metricsService: import('../services/metrics-service').MetricsService;
    requestId: string;
  };
}

const metricsRoutes = new Hono<MetricsContext>();

/**
 * GET /metrics - Export metrics in Prometheus format
 */
metricsRoutes.get('/', async (c) => {
  const metricsService = c.get('metricsService');

  const prometheusFormat = metricsService.exportPrometheus();

  return c.text(prometheusFormat, 200, {
    'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
  });
});

/**
 * GET /metrics/json - Export metrics as JSON
 */
metricsRoutes.get('/json', async (c) => {
  const requestId = c.get('requestId');
  const metricsService = c.get('metricsService');

  const metrics = metricsService.exportJSON();

  return c.json({
    success: true,
    data: metrics,
    meta: { requestId, timestamp: now() },
  });
});

/**
 * POST /metrics/reset - Reset all metrics (admin only)
 */
metricsRoutes.post('/reset', async (c) => {
  const requestId = c.get('requestId');
  const metricsService = c.get('metricsService');

  metricsService.reset();

  return c.json({
    success: true,
    data: { reset: true },
    meta: { requestId, timestamp: now() },
  });
});

export { metricsRoutes };
