/**
 * NOIZYLAB Email System - Extended Providers Tests (SES & Postmark)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SESProvider } from '../../src/services/providers/ses';
import { PostmarkProvider } from '../../src/services/providers/postmark';
import type { EmailRequest } from '../../src/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SESProvider', () => {
  let provider: SESProvider;
  const mockConfig = {
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    region: 'us-east-1',
  };

  beforeEach(() => {
    mockFetch.mockReset();
    provider = new SESProvider(mockConfig);
  });

  describe('constructor', () => {
    it('should create provider with config', () => {
      expect(provider.name).toBe('ses');
      expect(provider.isConfigured()).toBe(true);
    });

    it('should report not configured without credentials', () => {
      const unconfiguredProvider = new SESProvider({
        accessKeyId: '',
        secretAccessKey: '',
        region: '',
      });
      expect(unconfiguredProvider.isConfigured()).toBe(false);
    });
  });

  describe('send', () => {
    const baseEmail: EmailRequest = {
      to: 'recipient@example.com',
      from: 'sender@example.com',
      subject: 'Test Subject',
      html: '<p>Hello World</p>',
    };

    it('should send email successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => `
          <SendEmailResponse>
            <SendEmailResult>
              <MessageId>0102018a12345678-abcd-1234-5678-example</MessageId>
            </SendEmailResult>
          </SendEmailResponse>
        `,
      });

      const result = await provider.send(baseEmail);

      expect(result.success).toBe(true);
      expect(result.messageId).toContain('0102018a12345678');
      expect(result.provider).toBe('ses');
    });

    it('should handle send with text content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => `
          <SendEmailResponse>
            <SendEmailResult>
              <MessageId>msg-text-123</MessageId>
            </SendEmailResult>
          </SendEmailResponse>
        `,
      });

      const textEmail: EmailRequest = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        subject: 'Test',
        text: 'Plain text content',
      };

      const result = await provider.send(textEmail);

      expect(result.success).toBe(true);
    });

    it('should handle multiple recipients', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => `
          <SendEmailResponse>
            <SendEmailResult>
              <MessageId>msg-multi-123</MessageId>
            </SendEmailResult>
          </SendEmailResponse>
        `,
      });

      const multiEmail: EmailRequest = {
        to: ['user1@example.com', 'user2@example.com'],
        from: 'sender@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      };

      const result = await provider.send(multiEmail);

      expect(result.success).toBe(true);
    });

    it('should handle CC and BCC', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => `
          <SendEmailResponse>
            <SendEmailResult>
              <MessageId>msg-cc-123</MessageId>
            </SendEmailResult>
          </SendEmailResponse>
        `,
      });

      const emailWithCc: EmailRequest = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
      };

      const result = await provider.send(emailWithCc);

      expect(result.success).toBe(true);
    });

    it('should handle reply-to', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => `
          <SendEmailResponse>
            <SendEmailResult>
              <MessageId>msg-reply-123</MessageId>
            </SendEmailResult>
          </SendEmailResponse>
        `,
      });

      const emailWithReplyTo: EmailRequest = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
        replyTo: 'reply@example.com',
      };

      const result = await provider.send(emailWithReplyTo);

      expect(result.success).toBe(true);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => `
          <ErrorResponse>
            <Error>
              <Type>Sender</Type>
              <Code>InvalidParameterValue</Code>
              <Message>Invalid email address</Message>
            </Error>
          </ErrorResponse>
        `,
      });

      await expect(provider.send(baseEmail)).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(provider.send(baseEmail)).rejects.toThrow('Network error');
    });

    it('should sign requests with AWS Signature V4', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => `
          <SendEmailResponse>
            <SendEmailResult>
              <MessageId>msg-signed-123</MessageId>
            </SendEmailResult>
          </SendEmailResponse>
        `,
      });

      await provider.send(baseEmail);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('email.us-east-1.amazonaws.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('AWS4-HMAC-SHA256'),
          }),
        })
      );
    });
  });
});

describe('PostmarkProvider', () => {
  let provider: PostmarkProvider;
  const mockConfig = {
    serverToken: 'postmark-server-token-12345',
  };

  beforeEach(() => {
    mockFetch.mockReset();
    provider = new PostmarkProvider(mockConfig);
  });

  describe('constructor', () => {
    it('should create provider with config', () => {
      expect(provider.name).toBe('postmark');
      expect(provider.isConfigured()).toBe(true);
    });

    it('should report not configured without token', () => {
      const unconfiguredProvider = new PostmarkProvider({ serverToken: '' });
      expect(unconfiguredProvider.isConfigured()).toBe(false);
    });
  });

  describe('send', () => {
    const baseEmail: EmailRequest = {
      to: 'recipient@example.com',
      from: 'sender@example.com',
      subject: 'Test Subject',
      html: '<p>Hello World</p>',
    };

    it('should send email successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          To: 'recipient@example.com',
          SubmittedAt: new Date().toISOString(),
          MessageID: 'postmark-msg-12345',
          ErrorCode: 0,
          Message: 'OK',
        }),
      });

      const result = await provider.send(baseEmail);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('postmark-msg-12345');
      expect(result.provider).toBe('postmark');
    });

    it('should handle text content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          MessageID: 'postmark-text-123',
          ErrorCode: 0,
          Message: 'OK',
        }),
      });

      const textEmail: EmailRequest = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        subject: 'Test',
        text: 'Plain text content',
      };

      const result = await provider.send(textEmail);

      expect(result.success).toBe(true);
    });

    it('should handle multiple recipients', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          MessageID: 'postmark-multi-123',
          ErrorCode: 0,
          Message: 'OK',
        }),
      });

      const multiEmail: EmailRequest = {
        to: ['user1@example.com', 'user2@example.com'],
        from: 'sender@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      };

      const result = await provider.send(multiEmail);

      expect(result.success).toBe(true);
    });

    it('should handle CC and BCC', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          MessageID: 'postmark-cc-123',
          ErrorCode: 0,
          Message: 'OK',
        }),
      });

      const emailWithCc: EmailRequest = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
      };

      const result = await provider.send(emailWithCc);

      expect(result.success).toBe(true);

      // Verify CC and BCC were included in request
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Cc'),
        })
      );
    });

    it('should handle reply-to', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          MessageID: 'postmark-reply-123',
          ErrorCode: 0,
          Message: 'OK',
        }),
      });

      const emailWithReplyTo: EmailRequest = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
        replyTo: 'reply@example.com',
      };

      const result = await provider.send(emailWithReplyTo);

      expect(result.success).toBe(true);
    });

    it('should handle attachments', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          MessageID: 'postmark-attach-123',
          ErrorCode: 0,
          Message: 'OK',
        }),
      });

      const emailWithAttachment: EmailRequest = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
        attachments: [
          {
            filename: 'test.txt',
            content: 'SGVsbG8gV29ybGQ=', // Base64
            contentType: 'text/plain',
          },
        ],
      };

      const result = await provider.send(emailWithAttachment);

      expect(result.success).toBe(true);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          ErrorCode: 300,
          Message: 'Invalid email address',
        }),
      });

      await expect(provider.send(baseEmail)).rejects.toThrow();
    });

    it('should handle inactive recipient', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          ErrorCode: 406,
          Message: 'Inactive recipient',
        }),
      });

      await expect(provider.send(baseEmail)).rejects.toThrow();
    });

    it('should use correct API endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          MessageID: 'msg-123',
          ErrorCode: 0,
          Message: 'OK',
        }),
      });

      await provider.send(baseEmail);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.postmarkapp.com/email',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Postmark-Server-Token': mockConfig.serverToken,
          }),
        })
      );
    });
  });

  describe('sendBatch', () => {
    it('should send batch of emails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          { MessageID: 'batch-1', ErrorCode: 0, Message: 'OK' },
          { MessageID: 'batch-2', ErrorCode: 0, Message: 'OK' },
          { MessageID: 'batch-3', ErrorCode: 0, Message: 'OK' },
        ],
      });

      const emails: EmailRequest[] = [
        { to: 'user1@example.com', from: 'sender@example.com', subject: 'Test 1', text: 'Hi 1' },
        { to: 'user2@example.com', from: 'sender@example.com', subject: 'Test 2', text: 'Hi 2' },
        { to: 'user3@example.com', from: 'sender@example.com', subject: 'Test 3', text: 'Hi 3' },
      ];

      const results = await provider.sendBatch(emails);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should handle partial batch failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          { MessageID: 'batch-1', ErrorCode: 0, Message: 'OK' },
          { MessageID: null, ErrorCode: 406, Message: 'Inactive recipient' },
          { MessageID: 'batch-3', ErrorCode: 0, Message: 'OK' },
        ],
      });

      const emails: EmailRequest[] = [
        { to: 'user1@example.com', from: 'sender@example.com', subject: 'Test 1', text: 'Hi 1' },
        { to: 'inactive@example.com', from: 'sender@example.com', subject: 'Test 2', text: 'Hi 2' },
        { to: 'user3@example.com', from: 'sender@example.com', subject: 'Test 3', text: 'Hi 3' },
      ];

      const results = await provider.sendBatch(emails);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });

    it('should use batch API endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ MessageID: 'batch-1', ErrorCode: 0, Message: 'OK' }],
      });

      const emails: EmailRequest[] = [
        { to: 'user@example.com', from: 'sender@example.com', subject: 'Test', text: 'Hi' },
      ];

      await provider.sendBatch(emails);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.postmarkapp.com/email/batch',
        expect.any(Object)
      );
    });
  });

  describe('templates', () => {
    it('should send with Postmark template', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          MessageID: 'template-msg-123',
          ErrorCode: 0,
          Message: 'OK',
        }),
      });

      const templateEmail: EmailRequest = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        subject: 'Template Email',
        html: '<p>Fallback content</p>',
        metadata: {
          postmarkTemplateId: 12345,
          postmarkTemplateModel: {
            name: 'John',
            product: 'Widget',
          },
        },
      };

      const result = await provider.send(templateEmail);

      expect(result.success).toBe(true);
    });
  });
});
