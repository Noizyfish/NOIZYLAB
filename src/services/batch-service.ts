/**
 * NOIZYLAB Email System - Batch Email Service
 * Handles bulk email sending operations
 */

import type { EmailRequest, EmailResponse, EmailStatus } from '../types';
import { ValidationError, InternalError } from '../errors';
import { generateMessageId, generateRequestId, now, normalizeEmailList } from '../utils';
import { EmailService } from './email-service';
import { SuppressionService } from './suppression-service';

/**
 * Batch email request
 */
export interface BatchEmailRequest {
  emails: EmailRequest[];
  options?: {
    skipSuppressed?: boolean;
    stopOnError?: boolean;
    maxConcurrent?: number;
    delayBetweenMs?: number;
  };
}

/**
 * Individual batch result
 */
export interface BatchEmailResult {
  index: number;
  email: string;
  success: boolean;
  messageId?: string;
  status?: EmailStatus;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Batch operation response
 */
export interface BatchResponse {
  batchId: string;
  totalRequested: number;
  totalSent: number;
  totalFailed: number;
  totalSkipped: number;
  results: BatchEmailResult[];
  timestamp: string;
  durationMs: number;
}

/**
 * Batch job status
 */
export interface BatchJobStatus {
  batchId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

/**
 * Batch email service
 */
export class BatchEmailService {
  private readonly emailService: EmailService;
  private readonly suppressionService: SuppressionService;
  private readonly kv: KVNamespace;
  private readonly queue?: Queue;
  private readonly maxBatchSize = 1000;
  private readonly defaultConcurrency = 10;

  constructor(
    emailService: EmailService,
    suppressionService: SuppressionService,
    kv: KVNamespace,
    queue?: Queue
  ) {
    this.emailService = emailService;
    this.suppressionService = suppressionService;
    this.kv = kv;
    this.queue = queue;
  }

  /**
   * Send batch of emails synchronously
   */
  async sendBatch(
    request: BatchEmailRequest,
    clientId: string
  ): Promise<BatchResponse> {
    const startTime = Date.now();
    const batchId = generateRequestId();
    const { emails, options = {} } = request;

    // Validate batch size
    if (emails.length > this.maxBatchSize) {
      throw new ValidationError(`Batch size exceeds maximum of ${this.maxBatchSize} emails`);
    }

    if (emails.length === 0) {
      throw new ValidationError('Batch must contain at least one email');
    }

    const {
      skipSuppressed = true,
      stopOnError = false,
      maxConcurrent = this.defaultConcurrency,
      delayBetweenMs = 0,
    } = options;

    const results: BatchEmailResult[] = [];
    let totalSent = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    // Process emails in chunks
    for (let i = 0; i < emails.length; i += maxConcurrent) {
      const chunk = emails.slice(i, i + maxConcurrent);
      const chunkPromises = chunk.map(async (email, chunkIndex) => {
        const globalIndex = i + chunkIndex;
        const recipient = Array.isArray(email.to) ? email.to[0] ?? '' : email.to;

        try {
          // Check suppression
          if (skipSuppressed) {
            const recipients = normalizeEmailList(email.to);
            const { suppressed } = await this.suppressionService.filterSuppressed(recipients);

            if (suppressed.length === recipients.length) {
              totalSkipped++;
              return {
                index: globalIndex,
                email: recipient,
                success: false,
                error: {
                  code: 'RECIPIENT_SUPPRESSED',
                  message: `All recipients suppressed: ${suppressed.map((s) => s.reason).join(', ')}`,
                },
              };
            }
          }

          // Send email
          const { response } = await this.emailService.send(email, clientId, {
            skipRateLimit: true, // Batch has its own rate limiting
          });

          totalSent++;
          return {
            index: globalIndex,
            email: recipient,
            success: true,
            messageId: response.messageId,
            status: response.status,
          };
        } catch (error) {
          totalFailed++;
          const result: BatchEmailResult = {
            index: globalIndex,
            email: recipient,
            success: false,
            error: {
              code: error instanceof Error ? error.constructor.name : 'UNKNOWN_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          };

          if (stopOnError) {
            throw error;
          }

          return result;
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);

      // Add delay between chunks if specified
      if (delayBetweenMs > 0 && i + maxConcurrent < emails.length) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenMs));
      }
    }

    return {
      batchId,
      totalRequested: emails.length,
      totalSent,
      totalFailed,
      totalSkipped,
      results,
      timestamp: now(),
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Queue batch for async processing
   */
  async queueBatch(
    request: BatchEmailRequest,
    clientId: string
  ): Promise<{ batchId: string; status: string }> {
    if (this.queue === undefined) {
      throw new InternalError('Queue not configured for async batch processing');
    }

    const batchId = generateRequestId();
    const { emails, options = {} } = request;

    // Validate batch size
    if (emails.length > this.maxBatchSize) {
      throw new ValidationError(`Batch size exceeds maximum of ${this.maxBatchSize} emails`);
    }

    // Store batch metadata
    const jobStatus: BatchJobStatus = {
      batchId,
      status: 'pending',
      progress: {
        total: emails.length,
        processed: 0,
        succeeded: 0,
        failed: 0,
      },
      createdAt: now(),
      updatedAt: now(),
    };

    await this.kv.put(`batch:${batchId}:status`, JSON.stringify(jobStatus), {
      expirationTtl: 86400 * 7, // 7 days
    });

    // Store emails for processing
    await this.kv.put(`batch:${batchId}:emails`, JSON.stringify(emails), {
      expirationTtl: 86400, // 1 day
    });

    await this.kv.put(`batch:${batchId}:options`, JSON.stringify({ ...options, clientId }), {
      expirationTtl: 86400,
    });

    // Queue for processing
    await this.queue.send({
      type: 'batch',
      batchId,
    });

    return {
      batchId,
      status: 'queued',
    };
  }

  /**
   * Process queued batch (called by queue consumer)
   */
  async processBatch(batchId: string): Promise<void> {
    const emailsJson = await this.kv.get(`batch:${batchId}:emails`);
    const optionsJson = await this.kv.get(`batch:${batchId}:options`);

    if (emailsJson === null || optionsJson === null) {
      throw new InternalError(`Batch ${batchId} not found`);
    }

    const emails = JSON.parse(emailsJson) as EmailRequest[];
    const options = JSON.parse(optionsJson) as {
      clientId: string;
      skipSuppressed?: boolean;
      stopOnError?: boolean;
    };

    // Update status to processing
    await this.updateBatchStatus(batchId, { status: 'processing' });

    const results: BatchEmailResult[] = [];

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      if (email === undefined) continue;

      const recipient = Array.isArray(email.to) ? email.to[0] ?? '' : email.to;

      try {
        // Check suppression
        if (options.skipSuppressed !== false) {
          const recipients = normalizeEmailList(email.to);
          const { suppressed, allowed } = await this.suppressionService.filterSuppressed(recipients);

          if (allowed.length === 0) {
            results.push({
              index: i,
              email: recipient,
              success: false,
              error: {
                code: 'RECIPIENT_SUPPRESSED',
                message: 'All recipients suppressed',
              },
            });
            await this.updateBatchProgress(batchId, { failed: 1 });
            continue;
          }
        }

        // Send email
        const { response } = await this.emailService.send(email, options.clientId, {
          skipRateLimit: true,
        });

        results.push({
          index: i,
          email: recipient,
          success: true,
          messageId: response.messageId,
          status: response.status,
        });

        await this.updateBatchProgress(batchId, { succeeded: 1 });
      } catch (error) {
        results.push({
          index: i,
          email: recipient,
          success: false,
          error: {
            code: error instanceof Error ? error.constructor.name : 'UNKNOWN_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        await this.updateBatchProgress(batchId, { failed: 1 });

        if (options.stopOnError) {
          break;
        }
      }
    }

    // Store results
    await this.kv.put(`batch:${batchId}:results`, JSON.stringify(results), {
      expirationTtl: 86400 * 7,
    });

    // Update status to completed
    await this.updateBatchStatus(batchId, {
      status: 'completed',
      completedAt: now(),
    });
  }

  /**
   * Get batch job status
   */
  async getBatchStatus(batchId: string): Promise<BatchJobStatus | null> {
    const statusJson = await this.kv.get(`batch:${batchId}:status`);
    if (statusJson === null) {
      return null;
    }
    return JSON.parse(statusJson) as BatchJobStatus;
  }

  /**
   * Get batch results
   */
  async getBatchResults(batchId: string): Promise<BatchEmailResult[] | null> {
    const resultsJson = await this.kv.get(`batch:${batchId}:results`);
    if (resultsJson === null) {
      return null;
    }
    return JSON.parse(resultsJson) as BatchEmailResult[];
  }

  /**
   * Cancel a pending batch
   */
  async cancelBatch(batchId: string): Promise<boolean> {
    const status = await this.getBatchStatus(batchId);
    if (status === null || status.status !== 'pending') {
      return false;
    }

    await this.updateBatchStatus(batchId, { status: 'failed' });
    await this.kv.delete(`batch:${batchId}:emails`);
    await this.kv.delete(`batch:${batchId}:options`);

    return true;
  }

  private async updateBatchStatus(
    batchId: string,
    updates: Partial<BatchJobStatus>
  ): Promise<void> {
    const status = await this.getBatchStatus(batchId);
    if (status === null) {
      return;
    }

    const updatedStatus: BatchJobStatus = {
      ...status,
      ...updates,
      updatedAt: now(),
    };

    await this.kv.put(`batch:${batchId}:status`, JSON.stringify(updatedStatus), {
      expirationTtl: 86400 * 7,
    });
  }

  private async updateBatchProgress(
    batchId: string,
    increment: { succeeded?: number; failed?: number }
  ): Promise<void> {
    const status = await this.getBatchStatus(batchId);
    if (status === null) {
      return;
    }

    const updatedStatus: BatchJobStatus = {
      ...status,
      progress: {
        ...status.progress,
        processed: status.progress.processed + 1,
        succeeded: status.progress.succeeded + (increment.succeeded ?? 0),
        failed: status.progress.failed + (increment.failed ?? 0),
      },
      updatedAt: now(),
    };

    await this.kv.put(`batch:${batchId}:status`, JSON.stringify(updatedStatus), {
      expirationTtl: 86400 * 7,
    });
  }
}

/**
 * Create batch email service
 */
export function createBatchEmailService(
  emailService: EmailService,
  suppressionService: SuppressionService,
  env: Env
): BatchEmailService {
  return new BatchEmailService(
    emailService,
    suppressionService,
    env.EMAIL_KV,
    env.EMAIL_QUEUE
  );
}
