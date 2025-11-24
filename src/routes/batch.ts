/**
 * NOIZYLAB Email System - Batch Routes
 * API endpoints for batch email operations
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { EmailRequestSchema } from '../types';
import { toNoizylabError, ValidationError } from '../errors';
import { now } from '../utils';

/**
 * Context type with batch service
 */
interface BatchContext {
  Variables: {
    batchService: import('../services/batch-service').BatchEmailService;
    clientId: string;
    requestId: string;
  };
}

const batchRoutes = new Hono<BatchContext>();

/**
 * Batch request schema
 */
const BatchRequestSchema = z.object({
  emails: z.array(EmailRequestSchema).min(1).max(1000),
  options: z
    .object({
      skipSuppressed: z.boolean().optional(),
      stopOnError: z.boolean().optional(),
      maxConcurrent: z.number().min(1).max(50).optional(),
      delayBetweenMs: z.number().min(0).max(10000).optional(),
    })
    .optional(),
});

/**
 * POST /batch - Send batch of emails synchronously
 */
batchRoutes.post('/', async (c) => {
  const requestId = c.get('requestId');
  const batchService = c.get('batchService');
  const clientId = c.get('clientId');

  try {
    const body = await c.req.json();
    const validation = BatchRequestSchema.safeParse(body);

    if (!validation.success) {
      throw new ValidationError('Invalid batch request', {
        errors: validation.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const result = await batchService.sendBatch(validation.data, clientId);

    return c.json(
      {
        success: true,
        data: {
          batchId: result.batchId,
          totalRequested: result.totalRequested,
          totalSent: result.totalSent,
          totalFailed: result.totalFailed,
          totalSkipped: result.totalSkipped,
          durationMs: result.durationMs,
          results: result.results,
        },
        meta: { requestId, timestamp: now() },
      },
      201
    );
  } catch (error) {
    const noizylabError = toNoizylabError(error);
    return c.json(noizylabError.toJSON(), noizylabError.statusCode);
  }
});

/**
 * POST /batch/async - Queue batch for async processing
 */
batchRoutes.post('/async', async (c) => {
  const requestId = c.get('requestId');
  const batchService = c.get('batchService');
  const clientId = c.get('clientId');

  try {
    const body = await c.req.json();
    const validation = BatchRequestSchema.safeParse(body);

    if (!validation.success) {
      throw new ValidationError('Invalid batch request', {
        errors: validation.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const result = await batchService.queueBatch(validation.data, clientId);

    return c.json(
      {
        success: true,
        data: result,
        meta: { requestId, timestamp: now() },
      },
      202
    );
  } catch (error) {
    const noizylabError = toNoizylabError(error);
    return c.json(noizylabError.toJSON(), noizylabError.statusCode);
  }
});

/**
 * GET /batch/:batchId - Get batch status
 */
batchRoutes.get('/:batchId', async (c) => {
  const requestId = c.get('requestId');
  const batchService = c.get('batchService');
  const batchId = c.req.param('batchId');

  try {
    const status = await batchService.getBatchStatus(batchId);

    if (status === null) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Batch not found: ${batchId}`,
          },
          meta: { requestId, timestamp: now() },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: status,
      meta: { requestId, timestamp: now() },
    });
  } catch (error) {
    const noizylabError = toNoizylabError(error);
    return c.json(noizylabError.toJSON(), noizylabError.statusCode);
  }
});

/**
 * GET /batch/:batchId/results - Get batch results
 */
batchRoutes.get('/:batchId/results', async (c) => {
  const requestId = c.get('requestId');
  const batchService = c.get('batchService');
  const batchId = c.req.param('batchId');

  try {
    const results = await batchService.getBatchResults(batchId);

    if (results === null) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Batch results not found: ${batchId}`,
          },
          meta: { requestId, timestamp: now() },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: results,
      meta: { requestId, timestamp: now() },
    });
  } catch (error) {
    const noizylabError = toNoizylabError(error);
    return c.json(noizylabError.toJSON(), noizylabError.statusCode);
  }
});

/**
 * DELETE /batch/:batchId - Cancel a pending batch
 */
batchRoutes.delete('/:batchId', async (c) => {
  const requestId = c.get('requestId');
  const batchService = c.get('batchService');
  const batchId = c.req.param('batchId');

  try {
    const cancelled = await batchService.cancelBatch(batchId);

    if (!cancelled) {
      return c.json(
        {
          success: false,
          error: {
            code: 'CANNOT_CANCEL',
            message: `Batch cannot be cancelled (not found or already processing): ${batchId}`,
          },
          meta: { requestId, timestamp: now() },
        },
        400
      );
    }

    return c.json({
      success: true,
      data: { cancelled: true },
      meta: { requestId, timestamp: now() },
    });
  } catch (error) {
    const noizylabError = toNoizylabError(error);
    return c.json(noizylabError.toJSON(), noizylabError.statusCode);
  }
});

export { batchRoutes };
