/**
 * NOIZYLAB Email System - Postmark Provider
 * Email sending via Postmark API
 */

import type { EmailRequest, EmailAttachment } from '../../types';
import { ProviderError, AuthenticationError } from '../../errors';
import { generateMessageId, timeout } from '../../utils';
import { BaseEmailProvider, type SendOptions, type ProviderResponse } from './base';

/**
 * Postmark API endpoint
 */
const POSTMARK_API = 'https://api.postmarkapp.com/email';
const POSTMARK_BATCH_API = 'https://api.postmarkapp.com/email/batch';

/**
 * Postmark attachment format
 */
interface PostmarkAttachment {
  Name: string;
  Content: string;
  ContentType: string;
  ContentID?: string;
}

/**
 * Postmark request body
 */
interface PostmarkRequest {
  From: string;
  To: string;
  Subject: string;
  HtmlBody?: string;
  TextBody?: string;
  Cc?: string;
  Bcc?: string;
  ReplyTo?: string;
  Headers?: Array<{ Name: string; Value: string }>;
  Attachments?: PostmarkAttachment[];
  Tag?: string;
  TrackOpens?: boolean;
  TrackLinks?: 'None' | 'HtmlAndText' | 'HtmlOnly' | 'TextOnly';
  MessageStream?: string;
}

/**
 * Postmark API response
 */
interface PostmarkResponse {
  To: string;
  SubmittedAt: string;
  MessageID: string;
  ErrorCode: number;
  Message: string;
}

/**
 * Postmark email provider
 */
export class PostmarkProvider extends BaseEmailProvider {
  readonly name = 'postmark' as const;
  readonly supportsAttachments = true;
  readonly supportsBcc = true;
  readonly maxRecipientsPerRequest = 50;

  private readonly serverToken: string;
  private readonly messageStream: string;
  private readonly trackOpens: boolean;
  private readonly trackLinks: 'None' | 'HtmlAndText' | 'HtmlOnly' | 'TextOnly';

  constructor(
    serverToken: string,
    options: {
      messageStream?: string;
      trackOpens?: boolean;
      trackLinks?: 'None' | 'HtmlAndText' | 'HtmlOnly' | 'TextOnly';
    } = {}
  ) {
    super();
    this.serverToken = serverToken;
    this.messageStream = options.messageStream ?? 'outbound';
    this.trackOpens = options.trackOpens ?? true;
    this.trackLinks = options.trackLinks ?? 'HtmlAndText';
  }

  async send(email: EmailRequest, options?: SendOptions): Promise<ProviderResponse> {
    const startTime = Date.now();

    try {
      const request = this.buildRequest(email);

      const response = await timeout(
        fetch(POSTMARK_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Postmark-Server-Token': this.serverToken,
          },
          body: JSON.stringify(request),
        }),
        options?.timeout ?? 30000,
        'Postmark request timed out'
      );

      const data = (await response.json()) as PostmarkResponse;

      if (!response.ok || data.ErrorCode !== 0) {
        if (response.status === 401 || response.status === 403) {
          throw new AuthenticationError('Invalid Postmark server token');
        }

        throw new ProviderError(
          this.name,
          data.Message ?? `Postmark API error: ${response.status}`,
          {
            statusCode: response.status,
            errorCode: data.ErrorCode,
          }
        );
      }

      return {
        success: true,
        messageId: data.MessageID,
        provider: this.name,
        rawResponse: {
          messageId: data.MessageID,
          submittedAt: data.SubmittedAt,
          latencyMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      if (error instanceof ProviderError || error instanceof AuthenticationError) {
        throw error;
      }

      throw new ProviderError(
        this.name,
        error instanceof Error ? error.message : 'Unknown Postmark error',
        { originalError: String(error) }
      );
    }
  }

  /**
   * Send batch of emails
   */
  async sendBatch(
    emails: EmailRequest[],
    options?: SendOptions
  ): Promise<Array<ProviderResponse & { index: number }>> {
    const startTime = Date.now();

    try {
      const requests = emails.map((email) => this.buildRequest(email));

      const response = await timeout(
        fetch(POSTMARK_BATCH_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Postmark-Server-Token': this.serverToken,
          },
          body: JSON.stringify(requests),
        }),
        options?.timeout ?? 60000,
        'Postmark batch request timed out'
      );

      const results = (await response.json()) as PostmarkResponse[];

      return results.map((result, index) => ({
        index,
        success: result.ErrorCode === 0,
        messageId: result.MessageID,
        provider: this.name,
        rawResponse: {
          messageId: result.MessageID,
          submittedAt: result.SubmittedAt,
          errorCode: result.ErrorCode,
          message: result.Message,
        },
        error:
          result.ErrorCode !== 0
            ? {
                code: String(result.ErrorCode),
                message: result.Message,
              }
            : undefined,
      }));
    } catch (error) {
      throw new ProviderError(
        this.name,
        error instanceof Error ? error.message : 'Unknown Postmark batch error',
        { originalError: String(error) }
      );
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number; message?: string }> {
    const startTime = Date.now();

    try {
      const response = await timeout(
        fetch('https://api.postmarkapp.com/server', {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'X-Postmark-Server-Token': this.serverToken,
          },
        }),
        5000,
        'Health check timed out'
      );

      return {
        healthy: response.ok,
        latencyMs: Date.now() - startTime,
        message: response.ok ? undefined : `API returned ${response.status}`,
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.serverToken) {
      errors.push('Postmark server token is required');
    } else if (this.serverToken.length < 30) {
      errors.push('Invalid Postmark server token format');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private buildRequest(email: EmailRequest): PostmarkRequest {
    const from = email.from ?? 'noreply@example.com';
    const to = Array.isArray(email.to) ? email.to.join(', ') : email.to;

    const request: PostmarkRequest = {
      From: from,
      To: to,
      Subject: email.subject,
      MessageStream: this.messageStream,
      TrackOpens: this.trackOpens,
      TrackLinks: this.trackLinks,
    };

    if (email.html) {
      request.HtmlBody = email.html;
    }

    if (email.text) {
      request.TextBody = email.text;
    }

    if (email.cc && email.cc.length > 0) {
      request.Cc = email.cc.join(', ');
    }

    if (email.bcc && email.bcc.length > 0) {
      request.Bcc = email.bcc.join(', ');
    }

    if (email.replyTo) {
      request.ReplyTo = email.replyTo;
    }

    if (email.headers && Object.keys(email.headers).length > 0) {
      request.Headers = Object.entries(email.headers).map(([name, value]) => ({
        Name: name,
        Value: value,
      }));
    }

    if (email.attachments && email.attachments.length > 0) {
      request.Attachments = email.attachments.map((att) => ({
        Name: att.filename,
        Content: att.content,
        ContentType: att.contentType,
      }));
    }

    if (email.tags && email.tags.length > 0) {
      request.Tag = email.tags[0]; // Postmark only supports one tag
    }

    return request;
  }
}

/**
 * Create Postmark provider from environment
 */
export function createPostmarkProvider(
  env: Env,
  options?: {
    messageStream?: string;
    trackOpens?: boolean;
    trackLinks?: 'None' | 'HtmlAndText' | 'HtmlOnly' | 'TextOnly';
  }
): PostmarkProvider | null {
  if (!env.POSTMARK_SERVER_TOKEN) {
    return null;
  }
  return new PostmarkProvider(env.POSTMARK_SERVER_TOKEN, options);
}
