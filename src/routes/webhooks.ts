/**
 * NOIZYLAB Email System - Webhook Routes
 * API endpoints for receiving provider webhooks
 */

import { Hono } from 'hono';
import { toNoizylabError } from '../errors';
import { now } from '../utils';

/**
 * Context type with webhook service
 */
interface WebhookContext {
  Variables: {
    webhookService: import('../services/webhook-service').WebhookService;
    requestId: string;
  };
}

const webhookRoutes = new Hono<WebhookContext>();

/**
 * POST /webhooks/:provider - Receive webhook from provider
 */
webhookRoutes.post('/:provider', async (c) => {
  const requestId = c.get('requestId');
  const webhookService = c.get('webhookService');
  const provider = c.req.param('provider');

  try {
    const rawBody = await c.req.text();
    const payload = JSON.parse(rawBody);

    // Collect headers
    const headers: Record<string, string> = {};
    c.req.raw.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const result = await webhookService.processWebhook(provider, payload, headers, rawBody);

    return c.json({
      success: true,
      data: {
        processed: result.processed,
        events: result.events.map((e) => ({
          id: e.id,
          type: e.type,
          messageId: e.messageId,
          timestamp: e.timestamp,
        })),
      },
      meta: { requestId, timestamp: now() },
    });
  } catch (error) {
    const noizylabError = toNoizylabError(error);
    return c.json(noizylabError.toJSON(), noizylabError.statusCode);
  }
});

/**
 * GET /webhooks/:provider - Webhook verification (for some providers)
 */
webhookRoutes.get('/:provider', async (c) => {
  const provider = c.req.param('provider');

  // Handle provider-specific verification
  switch (provider) {
    case 'sendgrid':
      // SendGrid doesn't use GET verification
      return c.text('OK', 200);

    case 'resend':
      // Resend uses svix, which may send verification
      const challenge = c.req.query('challenge');
      if (challenge) {
        return c.text(challenge, 200);
      }
      return c.text('OK', 200);

    case 'mailchannels':
      return c.text('OK', 200);

    default:
      return c.text('OK', 200);
  }
});

/**
 * GET /webhooks/events/:messageId - Get webhook events for a message
 */
webhookRoutes.get('/events/:messageId', async (c) => {
  const requestId = c.get('requestId');
  const webhookService = c.get('webhookService');
  const messageId = c.req.param('messageId');

  try {
    const events = await webhookService.getEventsForMessage(messageId);

    return c.json({
      success: true,
      data: events,
      meta: { requestId, timestamp: now() },
    });
  } catch (error) {
    const noizylabError = toNoizylabError(error);
    return c.json(noizylabError.toJSON(), noizylabError.statusCode);
  }
});

export { webhookRoutes };
