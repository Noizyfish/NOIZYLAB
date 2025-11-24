/**
 * NOIZYLAB Email System - Suppression Routes
 * API endpoints for suppression list management
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { SuppressionReason } from '../services/suppression-service';
import { toNoizylabError, ValidationError } from '../errors';
import { now } from '../utils';

/**
 * Context type with suppression service
 */
interface SuppressionContext {
  Variables: {
    suppressionService: import('../services/suppression-service').SuppressionService;
    requestId: string;
  };
}

const suppressionRoutes = new Hono<SuppressionContext>();

/**
 * Add email schema
 */
const AddEmailSchema = z.object({
  email: z.string().email(),
  reason: z.enum(['bounce', 'complaint', 'manual', 'unsubscribe']),
  notes: z.string().max(1000).optional(),
  expiresAt: z.string().datetime().optional(),
});

/**
 * Bulk add schema
 */
const BulkAddSchema = z.object({
  entries: z.array(
    z.object({
      email: z.string().email(),
      reason: z.enum(['bounce', 'complaint', 'manual', 'unsubscribe']),
      notes: z.string().max(1000).optional(),
      expiresAt: z.string().datetime().optional(),
    })
  ).min(1).max(1000),
});

/**
 * Check emails schema
 */
const CheckEmailsSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(100),
});

/**
 * GET /suppression - List suppressed emails
 */
suppressionRoutes.get('/', async (c) => {
  const requestId = c.get('requestId');
  const suppressionService = c.get('suppressionService');

  const reason = c.req.query('reason') as SuppressionReason | undefined;
  const limit = parseInt(c.req.query('limit') ?? '50', 10);
  const offset = parseInt(c.req.query('offset') ?? '0', 10);
  const search = c.req.query('search');

  try {
    const { entries, total } = await suppressionService.listEntries({
      reason,
      limit: Math.min(limit, 100),
      offset,
      search,
    });

    return c.json({
      success: true,
      data: entries,
      meta: {
        requestId,
        timestamp: now(),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + entries.length < total,
        },
      },
    });
  } catch (error) {
    const noizylabError = toNoizylabError(error);
    return c.json(noizylabError.toJSON(), noizylabError.statusCode);
  }
});

/**
 * GET /suppression/stats - Get suppression statistics
 */
suppressionRoutes.get('/stats', async (c) => {
  const requestId = c.get('requestId');
  const suppressionService = c.get('suppressionService');

  try {
    const stats = await suppressionService.getStats();

    return c.json({
      success: true,
      data: {
        ...stats,
        total: Object.values(stats).reduce((a, b) => a + b, 0),
      },
      meta: { requestId, timestamp: now() },
    });
  } catch (error) {
    const noizylabError = toNoizylabError(error);
    return c.json(noizylabError.toJSON(), noizylabError.statusCode);
  }
});

/**
 * POST /suppression/check - Check if emails are suppressed
 */
suppressionRoutes.post('/check', async (c) => {
  const requestId = c.get('requestId');
  const suppressionService = c.get('suppressionService');

  try {
    const body = await c.req.json();
    const validation = CheckEmailsSchema.safeParse(body);

    if (!validation.success) {
      throw new ValidationError('Invalid request', {
        errors: validation.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const results = await suppressionService.checkEmails(validation.data.emails);

    const response: Record<string, { suppressed: boolean; reason?: string }> = {};
    for (const [email, status] of results) {
      response[email] = status;
    }

    return c.json({
      success: true,
      data: response,
      meta: { requestId, timestamp: now() },
    });
  } catch (error) {
    const noizylabError = toNoizylabError(error);
    return c.json(noizylabError.toJSON(), noizylabError.statusCode);
  }
});

/**
 * GET /suppression/:email - Get suppression entry
 */
suppressionRoutes.get('/:email', async (c) => {
  const requestId = c.get('requestId');
  const suppressionService = c.get('suppressionService');
  const email = decodeURIComponent(c.req.param('email'));

  try {
    const entry = await suppressionService.getEntry(email);

    if (entry === null) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Email not in suppression list: ${email}`,
          },
          meta: { requestId, timestamp: now() },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: entry,
      meta: { requestId, timestamp: now() },
    });
  } catch (error) {
    const noizylabError = toNoizylabError(error);
    return c.json(noizylabError.toJSON(), noizylabError.statusCode);
  }
});

/**
 * POST /suppression - Add email to suppression list
 */
suppressionRoutes.post('/', async (c) => {
  const requestId = c.get('requestId');
  const suppressionService = c.get('suppressionService');

  try {
    const body = await c.req.json();
    const validation = AddEmailSchema.safeParse(body);

    if (!validation.success) {
      throw new ValidationError('Invalid request', {
        errors: validation.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { email, reason, notes, expiresAt } = validation.data;
    const entry = await suppressionService.addEmail(email, reason, { notes, expiresAt });

    return c.json(
      {
        success: true,
        data: entry,
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
 * POST /suppression/bulk - Add multiple emails to suppression list
 */
suppressionRoutes.post('/bulk', async (c) => {
  const requestId = c.get('requestId');
  const suppressionService = c.get('suppressionService');

  try {
    const body = await c.req.json();
    const validation = BulkAddSchema.safeParse(body);

    if (!validation.success) {
      throw new ValidationError('Invalid request', {
        errors: validation.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const result = await suppressionService.addEmails(validation.data.entries);

    return c.json(
      {
        success: true,
        data: result,
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
 * DELETE /suppression/:email - Remove email from suppression list
 */
suppressionRoutes.delete('/:email', async (c) => {
  const requestId = c.get('requestId');
  const suppressionService = c.get('suppressionService');
  const email = decodeURIComponent(c.req.param('email'));

  try {
    const removed = await suppressionService.removeEmail(email);

    if (!removed) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Email not in suppression list: ${email}`,
          },
          meta: { requestId, timestamp: now() },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: { removed: true },
      meta: { requestId, timestamp: now() },
    });
  } catch (error) {
    const noizylabError = toNoizylabError(error);
    return c.json(noizylabError.toJSON(), noizylabError.statusCode);
  }
});

/**
 * POST /suppression/cleanup - Clean up expired suppressions
 */
suppressionRoutes.post('/cleanup', async (c) => {
  const requestId = c.get('requestId');
  const suppressionService = c.get('suppressionService');

  try {
    const removed = await suppressionService.cleanupExpired();

    return c.json({
      success: true,
      data: { removed },
      meta: { requestId, timestamp: now() },
    });
  } catch (error) {
    const noizylabError = toNoizylabError(error);
    return c.json(noizylabError.toJSON(), noizylabError.statusCode);
  }
});

export { suppressionRoutes };
