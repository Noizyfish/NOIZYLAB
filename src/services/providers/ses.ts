/**
 * NOIZYLAB Email System - AWS SES Provider
 * Email sending via Amazon Simple Email Service
 */

import type { EmailRequest, EmailAttachment } from '../../types';
import { ProviderError, AuthenticationError } from '../../errors';
import { generateMessageId, timeout } from '../../utils';
import { BaseEmailProvider, type SendOptions, type ProviderResponse } from './base';

/**
 * AWS Signature V4 signer (simplified for Workers)
 */
async function signRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string,
  credentials: { accessKeyId: string; secretAccessKey: string; region: string }
): Promise<Record<string, string>> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const service = 'ses';

  const canonicalUri = new URL(url).pathname;
  const canonicalQueryString = '';

  const signedHeaders = Object.keys(headers)
    .map((h) => h.toLowerCase())
    .sort()
    .join(';');

  const canonicalHeaders = Object.entries(headers)
    .map(([k, v]) => `${k.toLowerCase()}:${v.trim()}`)
    .sort()
    .join('\n') + '\n';

  const encoder = new TextEncoder();
  const payloadHash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(body)))
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${credentials.region}/${service}/aws4_request`;

  const canonicalRequestHash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest)))
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const stringToSign = [algorithm, amzDate, credentialScope, canonicalRequestHash].join('\n');

  // Calculate signature
  const getSignatureKey = async (
    key: string,
    dateStamp: string,
    regionName: string,
    serviceName: string
  ): Promise<ArrayBuffer> => {
    const kDate = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey(
        'raw',
        encoder.encode('AWS4' + key),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      ),
      encoder.encode(dateStamp)
    );
    const kRegion = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey('raw', kDate, { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign',
      ]),
      encoder.encode(regionName)
    );
    const kService = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey('raw', kRegion, { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign',
      ]),
      encoder.encode(serviceName)
    );
    return crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey('raw', kService, { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign',
      ]),
      encoder.encode('aws4_request')
    );
  };

  const signingKey = await getSignatureKey(
    credentials.secretAccessKey,
    dateStamp,
    credentials.region,
    service
  );

  const signature = Array.from(
    new Uint8Array(
      await crypto.subtle.sign(
        'HMAC',
        await crypto.subtle.importKey('raw', signingKey, { name: 'HMAC', hash: 'SHA-256' }, false, [
          'sign',
        ]),
        encoder.encode(stringToSign)
      )
    )
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const authorizationHeader = `${algorithm} Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    ...headers,
    'x-amz-date': amzDate,
    Authorization: authorizationHeader,
  };
}

/**
 * AWS SES email provider
 */
export class SESProvider extends BaseEmailProvider {
  readonly name = 'ses' as const;
  readonly supportsAttachments = true;
  readonly supportsBcc = true;
  readonly maxRecipientsPerRequest = 50;

  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly endpoint: string;

  constructor(config: {
    accessKeyId: string;
    secretAccessKey: string;
    region?: string;
  }) {
    super();
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = config.region ?? 'us-east-1';
    this.endpoint = `https://email.${this.region}.amazonaws.com`;
  }

  async send(email: EmailRequest, options?: SendOptions): Promise<ProviderResponse> {
    const messageId = generateMessageId();
    const startTime = Date.now();

    try {
      const rawMessage = this.buildRawMessage(email);
      const body = new URLSearchParams({
        Action: 'SendRawEmail',
        'RawMessage.Data': btoa(rawMessage),
        Version: '2010-12-01',
      }).toString();

      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        Host: `email.${this.region}.amazonaws.com`,
      };

      const signedHeaders = await signRequest('POST', this.endpoint, headers, body, {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
        region: this.region,
      });

      const response = await timeout(
        fetch(this.endpoint, {
          method: 'POST',
          headers: signedHeaders,
          body,
        }),
        options?.timeout ?? 30000,
        'SES request timed out'
      );

      const responseText = await response.text();

      if (!response.ok) {
        if (response.status === 403) {
          throw new AuthenticationError('Invalid AWS credentials');
        }

        throw new ProviderError(this.name, `SES API error: ${response.status}`, {
          statusCode: response.status,
          body: responseText,
        });
      }

      // Parse MessageId from XML response
      const sesMessageIdMatch = responseText.match(/<MessageId>(.+?)<\/MessageId>/);
      const sesMessageId = sesMessageIdMatch?.[1] ?? messageId;

      return {
        success: true,
        messageId: sesMessageId,
        provider: this.name,
        rawResponse: {
          status: response.status,
          latencyMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      if (error instanceof ProviderError || error instanceof AuthenticationError) {
        throw error;
      }

      throw new ProviderError(
        this.name,
        error instanceof Error ? error.message : 'Unknown SES error',
        { originalError: String(error) }
      );
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number; message?: string }> {
    const startTime = Date.now();

    try {
      const body = new URLSearchParams({
        Action: 'GetSendQuota',
        Version: '2010-12-01',
      }).toString();

      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        Host: `email.${this.region}.amazonaws.com`,
      };

      const signedHeaders = await signRequest('POST', this.endpoint, headers, body, {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
        region: this.region,
      });

      const response = await timeout(
        fetch(this.endpoint, {
          method: 'POST',
          headers: signedHeaders,
          body,
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

    if (!this.accessKeyId) {
      errors.push('AWS Access Key ID is required');
    }

    if (!this.secretAccessKey) {
      errors.push('AWS Secret Access Key is required');
    }

    if (!/^[A-Z0-9]{20}$/.test(this.accessKeyId)) {
      errors.push('Invalid AWS Access Key ID format');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private buildRawMessage(email: EmailRequest): string {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const from = email.from ?? 'noreply@example.com';
    const to = Array.isArray(email.to) ? email.to.join(', ') : email.to;

    const lines: string[] = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${email.subject}`,
      'MIME-Version: 1.0',
    ];

    if (email.replyTo) {
      lines.push(`Reply-To: ${email.replyTo}`);
    }

    if (email.cc && email.cc.length > 0) {
      lines.push(`Cc: ${email.cc.join(', ')}`);
    }

    // Add custom headers
    if (email.headers) {
      for (const [key, value] of Object.entries(email.headers)) {
        lines.push(`${key}: ${value}`);
      }
    }

    const hasAttachments = email.attachments && email.attachments.length > 0;

    if (hasAttachments) {
      lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      lines.push('');
      lines.push(`--${boundary}`);
    }

    if (email.html && email.text) {
      const altBoundary = `----=_Alt_${Date.now()}`;
      lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
      lines.push('');
      lines.push(`--${altBoundary}`);
      lines.push('Content-Type: text/plain; charset=UTF-8');
      lines.push('');
      lines.push(email.text);
      lines.push(`--${altBoundary}`);
      lines.push('Content-Type: text/html; charset=UTF-8');
      lines.push('');
      lines.push(email.html);
      lines.push(`--${altBoundary}--`);
    } else if (email.html) {
      lines.push('Content-Type: text/html; charset=UTF-8');
      lines.push('');
      lines.push(email.html);
    } else if (email.text) {
      lines.push('Content-Type: text/plain; charset=UTF-8');
      lines.push('');
      lines.push(email.text);
    }

    // Add attachments
    if (hasAttachments && email.attachments) {
      for (const attachment of email.attachments) {
        lines.push(`--${boundary}`);
        lines.push(`Content-Type: ${attachment.contentType}; name="${attachment.filename}"`);
        lines.push('Content-Transfer-Encoding: base64');
        lines.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
        lines.push('');
        lines.push(attachment.content);
      }
      lines.push(`--${boundary}--`);
    }

    return lines.join('\r\n');
  }
}

/**
 * Create SES provider from environment
 */
export function createSESProvider(env: Env): SESProvider | null {
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    return null;
  }
  return new SESProvider({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION,
  });
}
