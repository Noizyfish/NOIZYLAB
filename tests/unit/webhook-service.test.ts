/**
 * NOIZYLAB Email System - Webhook Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebhookService, createWebhookService } from '../../src/services/webhook-service';

// Mock KV store
const createMockKV = () => {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    list: vi.fn(async () => ({ keys: [], list_complete: true })),
    _store: store,
  };
};

// Mock D1 database
const createMockD1 = () => ({
  prepare: vi.fn(() => ({
    bind: vi.fn(() => ({
      run: vi.fn(async () => ({ success: true })),
      first: vi.fn(async () => null),
      all: vi.fn(async () => ({ results: [] })),
    })),
  })),
  batch: vi.fn(async () => []),
});

describe('WebhookService', () => {
  let service: WebhookService;
  let mockKV: ReturnType<typeof createMockKV>;
  let mockD1: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockKV = createMockKV();
    mockD1 = createMockD1();
    service = new WebhookService(mockKV as unknown as KVNamespace, mockD1 as unknown as D1Database);
  });

  describe('processWebhook - SendGrid', () => {
    it('should process SendGrid delivery event', async () => {
      const payload = [
        {
          event: 'delivered',
          email: 'user@example.com',
          timestamp: Date.now() / 1000,
          sg_message_id: 'msg-123',
        },
      ];

      const result = await service.processWebhook('sendgrid', payload, {}, '');

      expect(result.processed).toBe(1);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('delivered');
      expect(result.events[0].email).toBe('user@example.com');
    });

    it('should process SendGrid bounce event', async () => {
      const payload = [
        {
          event: 'bounce',
          email: 'bounced@example.com',
          timestamp: Date.now() / 1000,
          sg_message_id: 'msg-456',
          type: 'hard',
          reason: 'User unknown',
        },
      ];

      const result = await service.processWebhook('sendgrid', payload, {}, '');

      expect(result.events[0].type).toBe('bounced');
      expect(result.events[0].bounceType).toBe('hard');
    });

    it('should process SendGrid complaint event', async () => {
      const payload = [
        {
          event: 'spamreport',
          email: 'complainer@example.com',
          timestamp: Date.now() / 1000,
          sg_message_id: 'msg-789',
        },
      ];

      const result = await service.processWebhook('sendgrid', payload, {}, '');

      expect(result.events[0].type).toBe('complained');
    });

    it('should handle multiple SendGrid events', async () => {
      const payload = [
        { event: 'delivered', email: 'user1@example.com', timestamp: Date.now() / 1000 },
        { event: 'open', email: 'user2@example.com', timestamp: Date.now() / 1000 },
        { event: 'click', email: 'user3@example.com', timestamp: Date.now() / 1000 },
      ];

      const result = await service.processWebhook('sendgrid', payload, {}, '');

      expect(result.processed).toBe(3);
      expect(result.events).toHaveLength(3);
    });
  });

  describe('processWebhook - Resend', () => {
    it('should process Resend delivery event', async () => {
      const payload = {
        type: 'email.delivered',
        data: {
          email_id: 'msg-123',
          to: ['user@example.com'],
          created_at: new Date().toISOString(),
        },
      };

      const result = await service.processWebhook('resend', payload, {}, '');

      expect(result.processed).toBe(1);
      expect(result.events[0].type).toBe('delivered');
    });

    it('should process Resend bounce event', async () => {
      const payload = {
        type: 'email.bounced',
        data: {
          email_id: 'msg-456',
          to: ['bounced@example.com'],
          created_at: new Date().toISOString(),
          bounce: {
            type: 'hard',
            message: 'Mailbox does not exist',
          },
        },
      };

      const result = await service.processWebhook('resend', payload, {}, '');

      expect(result.events[0].type).toBe('bounced');
    });

    it('should process Resend complaint event', async () => {
      const payload = {
        type: 'email.complained',
        data: {
          email_id: 'msg-789',
          to: ['complainer@example.com'],
          created_at: new Date().toISOString(),
        },
      };

      const result = await service.processWebhook('resend', payload, {}, '');

      expect(result.events[0].type).toBe('complained');
    });
  });

  describe('processWebhook - Postmark', () => {
    it('should process Postmark delivery event', async () => {
      const payload = {
        RecordType: 'Delivery',
        MessageID: 'msg-123',
        Recipient: 'user@example.com',
        DeliveredAt: new Date().toISOString(),
      };

      const result = await service.processWebhook('postmark', payload, {}, '');

      expect(result.processed).toBe(1);
      expect(result.events[0].type).toBe('delivered');
      expect(result.events[0].email).toBe('user@example.com');
    });

    it('should process Postmark hard bounce', async () => {
      const payload = {
        RecordType: 'Bounce',
        MessageID: 'msg-456',
        Email: 'bounced@example.com',
        Type: 'HardBounce',
        Description: 'The email account does not exist',
        BouncedAt: new Date().toISOString(),
      };

      const result = await service.processWebhook('postmark', payload, {}, '');

      expect(result.events[0].type).toBe('bounced');
      expect(result.events[0].bounceType).toBe('hard');
    });

    it('should process Postmark soft bounce', async () => {
      const payload = {
        RecordType: 'Bounce',
        MessageID: 'msg-789',
        Email: 'softbounce@example.com',
        Type: 'SoftBounce',
        Description: 'Mailbox full',
        BouncedAt: new Date().toISOString(),
      };

      const result = await service.processWebhook('postmark', payload, {}, '');

      expect(result.events[0].bounceType).toBe('soft');
    });

    it('should process Postmark spam complaint', async () => {
      const payload = {
        RecordType: 'SpamComplaint',
        MessageID: 'msg-101',
        Email: 'complainer@example.com',
        BouncedAt: new Date().toISOString(),
      };

      const result = await service.processWebhook('postmark', payload, {}, '');

      expect(result.events[0].type).toBe('complained');
    });
  });

  describe('processWebhook - AWS SES', () => {
    it('should process SES delivery notification', async () => {
      const payload = {
        notificationType: 'Delivery',
        mail: {
          messageId: 'msg-123',
          destination: ['user@example.com'],
          timestamp: new Date().toISOString(),
        },
        delivery: {
          timestamp: new Date().toISOString(),
          recipients: ['user@example.com'],
        },
      };

      const result = await service.processWebhook('ses', payload, {}, '');

      expect(result.processed).toBe(1);
      expect(result.events[0].type).toBe('delivered');
    });

    it('should process SES bounce notification', async () => {
      const payload = {
        notificationType: 'Bounce',
        mail: {
          messageId: 'msg-456',
          destination: ['bounced@example.com'],
          timestamp: new Date().toISOString(),
        },
        bounce: {
          bounceType: 'Permanent',
          bounceSubType: 'General',
          bouncedRecipients: [{ emailAddress: 'bounced@example.com' }],
          timestamp: new Date().toISOString(),
        },
      };

      const result = await service.processWebhook('ses', payload, {}, '');

      expect(result.events[0].type).toBe('bounced');
      expect(result.events[0].bounceType).toBe('hard');
    });

    it('should process SES transient bounce as soft', async () => {
      const payload = {
        notificationType: 'Bounce',
        mail: {
          messageId: 'msg-789',
          destination: ['temp-fail@example.com'],
          timestamp: new Date().toISOString(),
        },
        bounce: {
          bounceType: 'Transient',
          bounceSubType: 'MailboxFull',
          bouncedRecipients: [{ emailAddress: 'temp-fail@example.com' }],
          timestamp: new Date().toISOString(),
        },
      };

      const result = await service.processWebhook('ses', payload, {}, '');

      expect(result.events[0].bounceType).toBe('soft');
    });

    it('should process SES complaint notification', async () => {
      const payload = {
        notificationType: 'Complaint',
        mail: {
          messageId: 'msg-101',
          destination: ['complainer@example.com'],
          timestamp: new Date().toISOString(),
        },
        complaint: {
          complainedRecipients: [{ emailAddress: 'complainer@example.com' }],
          timestamp: new Date().toISOString(),
          complaintFeedbackType: 'abuse',
        },
      };

      const result = await service.processWebhook('ses', payload, {}, '');

      expect(result.events[0].type).toBe('complained');
    });

    it('should handle SNS wrapped SES notification', async () => {
      const sesPayload = {
        notificationType: 'Delivery',
        mail: {
          messageId: 'msg-123',
          destination: ['user@example.com'],
          timestamp: new Date().toISOString(),
        },
        delivery: {
          timestamp: new Date().toISOString(),
          recipients: ['user@example.com'],
        },
      };

      const snsPayload = {
        Type: 'Notification',
        Message: JSON.stringify(sesPayload),
      };

      const result = await service.processWebhook('ses', snsPayload, {}, '');

      expect(result.processed).toBe(1);
      expect(result.events[0].type).toBe('delivered');
    });
  });

  describe('processWebhook - MailChannels', () => {
    it('should process MailChannels delivery event', async () => {
      const payload = {
        event: 'delivery',
        message_id: 'msg-123',
        recipient: 'user@example.com',
        timestamp: new Date().toISOString(),
      };

      const result = await service.processWebhook('mailchannels', payload, {}, '');

      expect(result.processed).toBe(1);
      expect(result.events[0].type).toBe('delivered');
    });

    it('should process MailChannels bounce event', async () => {
      const payload = {
        event: 'bounce',
        message_id: 'msg-456',
        recipient: 'bounced@example.com',
        bounce_type: 'hard',
        timestamp: new Date().toISOString(),
      };

      const result = await service.processWebhook('mailchannels', payload, {}, '');

      expect(result.events[0].type).toBe('bounced');
    });
  });

  describe('Unknown Provider', () => {
    it('should handle unknown provider gracefully', async () => {
      const payload = { some: 'data' };

      const result = await service.processWebhook('unknown-provider', payload, {}, '');

      expect(result.processed).toBe(0);
      expect(result.events).toHaveLength(0);
    });
  });

  describe('Event Storage', () => {
    it('should store processed events in database', async () => {
      const payload = [
        {
          event: 'delivered',
          email: 'user@example.com',
          timestamp: Date.now() / 1000,
          sg_message_id: 'msg-123',
        },
      ];

      await service.processWebhook('sendgrid', payload, {}, '');

      expect(mockD1.prepare).toHaveBeenCalled();
    });
  });

  describe('createWebhookService', () => {
    it('should create service from env', () => {
      const env = {
        EMAIL_KV: mockKV,
        EMAIL_DB: mockD1,
      } as unknown as Env;

      const createdService = createWebhookService(env);
      expect(createdService).toBeInstanceOf(WebhookService);
    });
  });
});
