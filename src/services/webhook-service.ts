/**
 * NOIZYLAB Email System - Webhook Service
 * Handles incoming webhooks from email providers for delivery status updates
 */

import type { WebhookEventType, WebhookPayload, EmailStatus } from '../types';
import { ValidationError, AuthenticationError, InternalError } from '../errors';
import { generateRequestId, now, sha256 } from '../utils';

/**
 * Webhook event from providers
 */
export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  messageId: string;
  recipient: string;
  timestamp: string;
  provider: string;
  rawPayload: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Provider-specific webhook parser
 */
export interface WebhookParser {
  parseEvent(payload: unknown, headers: Record<string, string>): WebhookEvent[];
  verifySignature(payload: string, signature: string, secret: string): boolean;
}

/**
 * Resend webhook parser
 */
export class ResendWebhookParser implements WebhookParser {
  parseEvent(payload: unknown, _headers: Record<string, string>): WebhookEvent[] {
    const data = payload as {
      type: string;
      created_at: string;
      data: {
        email_id: string;
        to: string[];
        from: string;
        subject: string;
      };
    };

    const eventTypeMap: Record<string, WebhookEventType> = {
      'email.sent': 'email.sent',
      'email.delivered': 'email.delivered',
      'email.delivery_delayed': 'email.delivered',
      'email.bounced': 'email.bounced',
      'email.complained': 'email.complained',
    };

    const eventType = eventTypeMap[data.type];
    if (eventType === undefined) {
      return [];
    }

    return data.data.to.map((recipient) => ({
      id: generateRequestId(),
      type: eventType,
      messageId: data.data.email_id,
      recipient,
      timestamp: data.created_at,
      provider: 'resend',
      rawPayload: payload,
    }));
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    // Resend uses svix for webhooks
    // In production, use svix library for proper verification
    return signature.length > 0 && secret.length > 0;
  }
}

/**
 * SendGrid webhook parser
 */
export class SendGridWebhookParser implements WebhookParser {
  parseEvent(payload: unknown, _headers: Record<string, string>): WebhookEvent[] {
    const events = (Array.isArray(payload) ? payload : [payload]) as Array<{
      event: string;
      sg_message_id: string;
      email: string;
      timestamp: number;
      reason?: string;
      bounce_classification?: string;
    }>;

    const eventTypeMap: Record<string, WebhookEventType> = {
      processed: 'email.sent',
      delivered: 'email.delivered',
      bounce: 'email.bounced',
      dropped: 'email.failed',
      spamreport: 'email.complained',
    };

    return events
      .filter((e) => eventTypeMap[e.event] !== undefined)
      .map((e) => ({
        id: generateRequestId(),
        type: eventTypeMap[e.event]!,
        messageId: e.sg_message_id.split('.')[0] ?? e.sg_message_id,
        recipient: e.email,
        timestamp: new Date(e.timestamp * 1000).toISOString(),
        provider: 'sendgrid',
        rawPayload: e,
        metadata: {
          reason: e.reason,
          bounceClassification: e.bounce_classification,
        },
      }));
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    // SendGrid signed event webhook verification
    // In production, implement proper ECDSA verification
    return signature.length > 0 && secret.length > 0;
  }
}

/**
 * MailChannels webhook parser
 */
export class MailChannelsWebhookParser implements WebhookParser {
  parseEvent(payload: unknown, _headers: Record<string, string>): WebhookEvent[] {
    const data = payload as {
      event_type: string;
      message_id: string;
      recipient: string;
      timestamp: string;
      details?: Record<string, unknown>;
    };

    const eventTypeMap: Record<string, WebhookEventType> = {
      sent: 'email.sent',
      delivered: 'email.delivered',
      bounced: 'email.bounced',
      failed: 'email.failed',
      complained: 'email.complained',
    };

    const eventType = eventTypeMap[data.event_type];
    if (eventType === undefined) {
      return [];
    }

    return [
      {
        id: generateRequestId(),
        type: eventType,
        messageId: data.message_id,
        recipient: data.recipient,
        timestamp: data.timestamp,
        provider: 'mailchannels',
        rawPayload: payload,
        metadata: data.details,
      },
    ];
  }

  verifySignature(_payload: string, _signature: string, _secret: string): boolean {
    // MailChannels webhook verification
    return true;
  }
}

/**
 * Webhook service for processing incoming events
 */
export class WebhookService {
  private readonly db: D1Database;
  private readonly kv: KVNamespace;
  private readonly parsers: Map<string, WebhookParser>;
  private readonly secrets: Map<string, string>;

  constructor(
    db: D1Database,
    kv: KVNamespace,
    secrets: { resend?: string; sendgrid?: string; mailchannels?: string } = {}
  ) {
    this.db = db;
    this.kv = kv;
    this.parsers = new Map([
      ['resend', new ResendWebhookParser()],
      ['sendgrid', new SendGridWebhookParser()],
      ['mailchannels', new MailChannelsWebhookParser()],
    ]);
    this.secrets = new Map(Object.entries(secrets).filter(([_, v]) => v !== undefined) as [string, string][]);
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(
    provider: string,
    payload: unknown,
    headers: Record<string, string>,
    rawBody: string
  ): Promise<{ processed: number; events: WebhookEvent[] }> {
    const parser = this.parsers.get(provider);
    if (parser === undefined) {
      throw new ValidationError(`Unknown webhook provider: ${provider}`);
    }

    // Verify signature if secret is configured
    const secret = this.secrets.get(provider);
    const signature = headers['x-webhook-signature'] ?? headers['x-sendgrid-signature'] ?? '';

    if (secret !== undefined && signature !== '') {
      const isValid = parser.verifySignature(rawBody, signature, secret);
      if (!isValid) {
        throw new AuthenticationError('Invalid webhook signature');
      }
    }

    // Parse events
    const events = parser.parseEvent(payload, headers);

    // Process each event
    for (const event of events) {
      await this.processEvent(event);
    }

    return { processed: events.length, events };
  }

  /**
   * Process a single webhook event
   */
  private async processEvent(event: WebhookEvent): Promise<void> {
    const timestamp = now();

    // Check for duplicate event (idempotency)
    const eventKey = `webhook:${event.provider}:${event.messageId}:${event.type}`;
    const existing = await this.kv.get(eventKey);
    if (existing !== null) {
      return; // Already processed
    }

    // Store event in database
    await this.db
      .prepare(
        `INSERT INTO webhook_events (id, message_id, event_type, provider, payload, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        event.id,
        event.messageId,
        event.type,
        event.provider,
        JSON.stringify(event.rawPayload),
        timestamp
      )
      .run();

    // Update email status
    const statusMap: Record<WebhookEventType, EmailStatus> = {
      'email.sent': 'sent',
      'email.delivered': 'delivered',
      'email.bounced': 'bounced',
      'email.complained': 'bounced',
      'email.failed': 'failed',
    };

    const newStatus = statusMap[event.type];
    const statusField =
      event.type === 'email.delivered'
        ? 'delivered_at'
        : event.type === 'email.bounced' || event.type === 'email.complained'
          ? 'bounced_at'
          : null;

    let updateQuery = 'UPDATE email_logs SET status = ?, updated_at = ?';
    const params: unknown[] = [newStatus, timestamp];

    if (statusField !== null) {
      updateQuery += `, ${statusField} = ?`;
      params.push(timestamp);
    }

    updateQuery += ' WHERE message_id = ?';
    params.push(event.messageId);

    await this.db.prepare(updateQuery).bind(...params).run();

    // Handle bounce/complaint - add to suppression list
    if (event.type === 'email.bounced' || event.type === 'email.complained') {
      await this.addToSuppressionList(
        event.recipient,
        event.type === 'email.bounced' ? 'bounce' : 'complaint',
        event.messageId
      );
    }

    // Mark event as processed (for idempotency)
    await this.kv.put(eventKey, 'processed', { expirationTtl: 86400 * 7 }); // 7 days
  }

  /**
   * Add email to suppression list
   */
  private async addToSuppressionList(
    email: string,
    reason: 'bounce' | 'complaint',
    sourceMessageId: string
  ): Promise<void> {
    const timestamp = now();

    try {
      await this.db
        .prepare(
          `INSERT OR IGNORE INTO suppression_list (id, email, reason, source_message_id, created_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(generateRequestId(), email.toLowerCase(), reason, sourceMessageId, timestamp)
        .run();
    } catch {
      // Ignore duplicate entries
    }
  }

  /**
   * Get webhook events for a message
   */
  async getEventsForMessage(messageId: string): Promise<WebhookEvent[]> {
    const result = await this.db
      .prepare('SELECT * FROM webhook_events WHERE message_id = ? ORDER BY created_at ASC')
      .bind(messageId)
      .all();

    return (result.results ?? []).map((row) => ({
      id: String(row['id']),
      type: String(row['event_type']) as WebhookEventType,
      messageId: String(row['message_id']),
      recipient: '',
      timestamp: String(row['created_at']),
      provider: String(row['provider']),
      rawPayload: JSON.parse(String(row['payload'])),
    }));
  }
}

/**
 * Create webhook service from environment
 */
export function createWebhookService(env: Env): WebhookService {
  return new WebhookService(env.EMAIL_DB, env.EMAIL_KV, {
    resend: env.RESEND_WEBHOOK_SECRET,
    sendgrid: env.SENDGRID_WEBHOOK_SECRET,
  });
}
