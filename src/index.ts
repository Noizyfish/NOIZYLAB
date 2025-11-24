/**
 * NOIZYLAB Email System - Main Entry Point
 * Cloudflare Workers entry point using Hono framework
 */

import { Hono } from 'hono';
import {
  emailRoutes,
  templateRoutes,
  healthRoutes,
  analyticsRoutes,
  suppressionRoutes,
  webhookRoutes,
  batchRoutes,
  metricsRoutes,
} from './routes';
import { applyMiddleware } from './middleware';
import {
  createProviders,
  createRateLimiter,
  createTemplateEngine,
  createEmailService,
  createWebhookService,
  createAnalyticsService,
  createSuppressionService,
  createBatchEmailService,
  createAPIKeyService,
  createMetricsService,
  getMetrics,
  EMAIL_METRICS,
} from './services';
import { generateRequestId } from './utils';

/**
 * Application version
 */
const APP_VERSION = '2.0.0';

/**
 * Application type with bindings
 */
type AppBindings = {
  Bindings: Env;
  Variables: {
    emailService: ReturnType<typeof createEmailService>;
    templateEngine: ReturnType<typeof createTemplateEngine>;
    webhookService: ReturnType<typeof createWebhookService>;
    analyticsService: ReturnType<typeof createAnalyticsService>;
    suppressionService: ReturnType<typeof createSuppressionService>;
    batchService: ReturnType<typeof createBatchEmailService>;
    apiKeyService: ReturnType<typeof createAPIKeyService>;
    metricsService: ReturnType<typeof createMetricsService>;
    kv: KVNamespace;
    db: D1Database;
    clientId: string;
    requestId: string;
  };
};

/**
 * Create the Hono application
 */
function createApp(): Hono<AppBindings> {
  const app = new Hono<AppBindings>();

  // Apply middleware
  applyMiddleware(app);

  // Initialize services middleware
  app.use('*', async (c, next) => {
    const env = c.env;
    const startTime = performance.now();

    // Create core services
    const providers = createProviders(env);
    const rateLimiter = createRateLimiter(env.EMAIL_KV, env);
    const templateEngine = createTemplateEngine(env.EMAIL_KV);
    const emailService = createEmailService(providers, rateLimiter, templateEngine, env);

    // Create additional services
    const webhookService = createWebhookService(env);
    const analyticsService = createAnalyticsService(env);
    const suppressionService = createSuppressionService(env);
    const batchService = createBatchEmailService(emailService, suppressionService, env);
    const apiKeyService = createAPIKeyService(env);
    const metricsService = createMetricsService(env);

    // Set context variables
    c.set('emailService', emailService);
    c.set('templateEngine', templateEngine);
    c.set('webhookService', webhookService);
    c.set('analyticsService', analyticsService);
    c.set('suppressionService', suppressionService);
    c.set('batchService', batchService);
    c.set('apiKeyService', apiKeyService);
    c.set('metricsService', metricsService);
    c.set('kv', env.EMAIL_KV);
    c.set('db', env.EMAIL_DB);

    // Set default client ID if not set by auth middleware
    if (c.get('clientId') === undefined) {
      c.set('clientId', 'anonymous');
    }

    // Set request ID if not set
    if (c.get('requestId') === undefined) {
      c.set('requestId', generateRequestId());
    }

    await next();

    // Record API metrics
    const duration = (performance.now() - startTime) / 1000;
    metricsService.incCounter(EMAIL_METRICS.API_REQUESTS_TOTAL, {
      method: c.req.method,
      path: c.req.path,
      status: String(c.res.status),
    });
    metricsService.observeHistogram(EMAIL_METRICS.API_REQUEST_DURATION, duration, {
      method: c.req.method,
      path: c.req.path,
    });
  });

  // Mount routes
  app.route('/emails', emailRoutes);
  app.route('/templates', templateRoutes);
  app.route('/health', healthRoutes);
  app.route('/analytics', analyticsRoutes);
  app.route('/suppression', suppressionRoutes);
  app.route('/webhooks', webhookRoutes);
  app.route('/batch', batchRoutes);
  app.route('/metrics', metricsRoutes);

  // Root endpoint
  app.get('/', (c) => {
    return c.json({
      name: 'NOIZYLAB Email System',
      version: APP_VERSION,
      documentation: '/docs',
      endpoints: {
        emails: '/emails',
        templates: '/templates',
        health: '/health',
        analytics: '/analytics',
        suppression: '/suppression',
        webhooks: '/webhooks',
        batch: '/batch',
        metrics: '/metrics',
      },
      features: [
        'Multiple email providers (MailChannels, Resend, SendGrid, AWS SES, Postmark)',
        'Template engine with variables, conditionals, loops, and helpers',
        'Rate limiting with sliding window algorithm',
        'Email logging with D1 database',
        'Queue-based async email processing',
        'Scheduled email delivery',
        'Batch email sending',
        'Suppression list management',
        'Webhook processing for delivery events',
        'Analytics and statistics',
        'Prometheus metrics export',
        'API key management',
      ],
    });
  });

  return app;
}

// Create app instance
const app = createApp();

/**
 * Queue handler for async email processing
 */
async function handleQueue(
  batch: MessageBatch<EmailQueueMessage>,
  env: Env,
  _ctx: ExecutionContext
): Promise<void> {
  const providers = createProviders(env);
  const rateLimiter = createRateLimiter(env.EMAIL_KV, env);
  const templateEngine = createTemplateEngine(env.EMAIL_KV);
  const emailService = createEmailService(providers, rateLimiter, templateEngine, env);
  const suppressionService = createSuppressionService(env);
  const batchService = createBatchEmailService(emailService, suppressionService, env);
  const metricsService = getMetrics(env.EMAIL_KV);

  for (const message of batch.messages) {
    try {
      const queueMessage = message.body;

      // Handle batch processing
      if ((queueMessage as unknown as { type: string }).type === 'batch') {
        const batchId = (queueMessage as unknown as { batchId: string }).batchId;
        await batchService.processBatch(batchId);
        message.ack();
        continue;
      }

      // Convert queue message to email request
      const emailRequest = {
        to: queueMessage.to,
        from: queueMessage.from,
        subject: queueMessage.subject,
        html: queueMessage.html,
        text: queueMessage.text,
        replyTo: queueMessage.replyTo,
        cc: queueMessage.cc,
        bcc: queueMessage.bcc,
        headers: queueMessage.headers,
        attachments: queueMessage.attachments,
        templateId: queueMessage.templateId,
        templateData: queueMessage.templateData,
        priority: queueMessage.priority,
      };

      await emailService.send(emailRequest, `queue:${queueMessage.id}`, {
        skipRateLimit: true,
        skipIdempotency: true,
      });

      metricsService.incCounter(EMAIL_METRICS.EMAILS_SENT_TOTAL, { source: 'queue' });
      message.ack();
    } catch (error) {
      console.error('Queue processing error:', error);
      metricsService.incCounter(EMAIL_METRICS.EMAILS_FAILED_TOTAL, { source: 'queue' });

      // Retry logic
      const retryCount = (message.body.retryCount ?? 0) + 1;
      const maxRetries = message.body.maxRetries ?? 3;

      if (retryCount < maxRetries) {
        message.retry({
          delaySeconds: Math.pow(2, retryCount) * 60, // Exponential backoff
        });
      } else {
        // Max retries exceeded, acknowledge and log failure
        console.error(`Max retries exceeded for message ${message.body.id}`);
        message.ack();
      }
    }
  }

  // Persist metrics
  await metricsService.persist();
}

/**
 * Scheduled handler for cron jobs
 */
async function handleScheduled(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  const suppressionService = createSuppressionService(env);

  // Process scheduled emails
  const cursor = await env.EMAIL_KV.list({ prefix: 'scheduled:' });

  for (const key of cursor.keys) {
    const data = await env.EMAIL_KV.get(key.name, 'json');

    if (data !== null) {
      const { email, scheduledAt } = data as {
        email: import('./types').EmailRequest;
        scheduledAt: string;
      };

      if (new Date(scheduledAt) <= new Date()) {
        // Queue the email for sending
        await env.EMAIL_QUEUE.send({
          id: key.name.replace('scheduled:', ''),
          ...email,
        } as EmailQueueMessage);

        // Remove from scheduled
        await env.EMAIL_KV.delete(key.name);
      }
    }
  }

  // Clean up expired suppressions
  await suppressionService.cleanupExpired();
}

// Export handlers
export default {
  fetch: app.fetch,
  queue: handleQueue,
  scheduled: handleScheduled,
};

// Export app for testing
export { app, createApp, APP_VERSION };
