/**
 * NOIZYLAB Email System - Batch Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BatchEmailService,
  createBatchEmailService,
  type BatchEmailRequest,
} from '../../src/services/batch-service';
import { EmailService } from '../../src/services/email-service';
import { SuppressionService } from '../../src/services/suppression-service';

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

// Mock Queue
const createMockQueue = () => ({
  send: vi.fn(async () => {}),
});

// Mock Email Service
const createMockEmailService = () => ({
  send: vi.fn(async () => ({
    response: {
      success: true,
      messageId: 'msg-' + Math.random().toString(36).substr(2, 9),
      status: 'sent' as const,
    },
    rateLimit: { remaining: 100, reset: Date.now() + 3600000 },
  })),
});

// Mock Suppression Service
const createMockSuppressionService = () => ({
  filterSuppressed: vi.fn(async (emails: string[]) => ({
    allowed: emails,
    suppressed: [] as Array<{ email: string; reason: string }>,
  })),
  isEmailSuppressed: vi.fn(async () => ({ suppressed: false })),
});

describe('BatchEmailService', () => {
  let service: BatchEmailService;
  let mockKV: ReturnType<typeof createMockKV>;
  let mockQueue: ReturnType<typeof createMockQueue>;
  let mockEmailService: ReturnType<typeof createMockEmailService>;
  let mockSuppressionService: ReturnType<typeof createMockSuppressionService>;

  beforeEach(() => {
    mockKV = createMockKV();
    mockQueue = createMockQueue();
    mockEmailService = createMockEmailService();
    mockSuppressionService = createMockSuppressionService();
    service = new BatchEmailService(
      mockEmailService as unknown as EmailService,
      mockSuppressionService as unknown as SuppressionService,
      mockKV as unknown as KVNamespace,
      mockQueue as unknown as Queue
    );
  });

  describe('sendBatch', () => {
    it('should send batch of emails successfully', async () => {
      const request: BatchEmailRequest = {
        emails: [
          {
            to: 'user1@example.com',
            from: 'sender@example.com',
            subject: 'Test 1',
            text: 'Hello 1',
          },
          {
            to: 'user2@example.com',
            from: 'sender@example.com',
            subject: 'Test 2',
            text: 'Hello 2',
          },
          {
            to: 'user3@example.com',
            from: 'sender@example.com',
            subject: 'Test 3',
            text: 'Hello 3',
          },
        ],
      };

      const result = await service.sendBatch(request, 'client-123');

      expect(result.totalRequested).toBe(3);
      expect(result.totalSent).toBe(3);
      expect(result.totalFailed).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(result.results.every((r) => r.success)).toBe(true);
      expect(mockEmailService.send).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures', async () => {
      mockEmailService.send
        .mockResolvedValueOnce({
          response: { success: true, messageId: 'msg-1', status: 'sent' },
          rateLimit: { remaining: 100, reset: Date.now() + 3600000 },
        })
        .mockRejectedValueOnce(new Error('Provider error'))
        .mockResolvedValueOnce({
          response: { success: true, messageId: 'msg-3', status: 'sent' },
          rateLimit: { remaining: 98, reset: Date.now() + 3600000 },
        });

      const request: BatchEmailRequest = {
        emails: [
          { to: 'user1@example.com', from: 'sender@example.com', subject: 'Test 1', text: 'Hi' },
          { to: 'user2@example.com', from: 'sender@example.com', subject: 'Test 2', text: 'Hi' },
          { to: 'user3@example.com', from: 'sender@example.com', subject: 'Test 3', text: 'Hi' },
        ],
      };

      const result = await service.sendBatch(request, 'client-123');

      expect(result.totalRequested).toBe(3);
      expect(result.totalSent).toBe(2);
      expect(result.totalFailed).toBe(1);
    });

    it('should stop on error when stopOnError is true', async () => {
      mockEmailService.send
        .mockResolvedValueOnce({
          response: { success: true, messageId: 'msg-1', status: 'sent' },
          rateLimit: { remaining: 100, reset: Date.now() + 3600000 },
        })
        .mockRejectedValueOnce(new Error('Critical error'));

      const request: BatchEmailRequest = {
        emails: [
          { to: 'user1@example.com', from: 'sender@example.com', subject: 'Test 1', text: 'Hi' },
          { to: 'user2@example.com', from: 'sender@example.com', subject: 'Test 2', text: 'Hi' },
          { to: 'user3@example.com', from: 'sender@example.com', subject: 'Test 3', text: 'Hi' },
        ],
        options: { stopOnError: true },
      };

      await expect(service.sendBatch(request, 'client-123')).rejects.toThrow('Critical error');
    });

    it('should skip suppressed recipients', async () => {
      mockSuppressionService.filterSuppressed.mockResolvedValueOnce({
        allowed: [],
        suppressed: [{ email: 'suppressed@example.com', reason: 'bounce' }],
      });

      const request: BatchEmailRequest = {
        emails: [
          {
            to: 'suppressed@example.com',
            from: 'sender@example.com',
            subject: 'Test',
            text: 'Hi',
          },
        ],
        options: { skipSuppressed: true },
      };

      const result = await service.sendBatch(request, 'client-123');

      expect(result.totalSkipped).toBe(1);
      expect(result.totalSent).toBe(0);
      expect(mockEmailService.send).not.toHaveBeenCalled();
    });

    it('should respect maxConcurrent option', async () => {
      const request: BatchEmailRequest = {
        emails: Array.from({ length: 10 }, (_, i) => ({
          to: `user${i}@example.com`,
          from: 'sender@example.com',
          subject: `Test ${i}`,
          text: 'Hi',
        })),
        options: { maxConcurrent: 2 },
      };

      await service.sendBatch(request, 'client-123');

      // All emails should be sent
      expect(mockEmailService.send).toHaveBeenCalledTimes(10);
    });

    it('should validate batch size limit', async () => {
      const request: BatchEmailRequest = {
        emails: Array.from({ length: 1001 }, (_, i) => ({
          to: `user${i}@example.com`,
          from: 'sender@example.com',
          subject: 'Test',
          text: 'Hi',
        })),
      };

      await expect(service.sendBatch(request, 'client-123')).rejects.toThrow(
        'Batch size exceeds maximum'
      );
    });

    it('should reject empty batch', async () => {
      const request: BatchEmailRequest = {
        emails: [],
      };

      await expect(service.sendBatch(request, 'client-123')).rejects.toThrow(
        'Batch must contain at least one email'
      );
    });

    it('should include timing information', async () => {
      const request: BatchEmailRequest = {
        emails: [
          { to: 'user@example.com', from: 'sender@example.com', subject: 'Test', text: 'Hi' },
        ],
      };

      const result = await service.sendBatch(request, 'client-123');

      expect(result.timestamp).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.batchId).toBeDefined();
    });
  });

  describe('queueBatch', () => {
    it('should queue batch for async processing', async () => {
      const request: BatchEmailRequest = {
        emails: [
          { to: 'user1@example.com', from: 'sender@example.com', subject: 'Test', text: 'Hi' },
          { to: 'user2@example.com', from: 'sender@example.com', subject: 'Test', text: 'Hi' },
        ],
      };

      const result = await service.queueBatch(request, 'client-123');

      expect(result.batchId).toBeDefined();
      expect(result.status).toBe('queued');
      expect(mockQueue.send).toHaveBeenCalledWith({
        type: 'batch',
        batchId: result.batchId,
      });
    });

    it('should store batch metadata in KV', async () => {
      const request: BatchEmailRequest = {
        emails: [
          { to: 'user@example.com', from: 'sender@example.com', subject: 'Test', text: 'Hi' },
        ],
      };

      const result = await service.queueBatch(request, 'client-123');

      expect(mockKV.put).toHaveBeenCalledWith(
        expect.stringContaining(`batch:${result.batchId}:status`),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should throw if queue not configured', async () => {
      const serviceWithoutQueue = new BatchEmailService(
        mockEmailService as unknown as EmailService,
        mockSuppressionService as unknown as SuppressionService,
        mockKV as unknown as KVNamespace,
        undefined
      );

      const request: BatchEmailRequest = {
        emails: [
          { to: 'user@example.com', from: 'sender@example.com', subject: 'Test', text: 'Hi' },
        ],
      };

      await expect(serviceWithoutQueue.queueBatch(request, 'client-123')).rejects.toThrow(
        'Queue not configured'
      );
    });
  });

  describe('getBatchStatus', () => {
    it('should return batch status', async () => {
      const request: BatchEmailRequest = {
        emails: [
          { to: 'user@example.com', from: 'sender@example.com', subject: 'Test', text: 'Hi' },
        ],
      };

      const { batchId } = await service.queueBatch(request, 'client-123');
      const status = await service.getBatchStatus(batchId);

      expect(status).not.toBeNull();
      expect(status?.batchId).toBe(batchId);
      expect(status?.status).toBe('pending');
      expect(status?.progress.total).toBe(1);
    });

    it('should return null for non-existent batch', async () => {
      const status = await service.getBatchStatus('non-existent-batch');
      expect(status).toBeNull();
    });
  });

  describe('processBatch', () => {
    it('should process queued batch', async () => {
      // Setup batch in KV
      const batchId = 'test-batch-123';
      const emails = [
        { to: 'user1@example.com', from: 'sender@example.com', subject: 'Test 1', text: 'Hi' },
        { to: 'user2@example.com', from: 'sender@example.com', subject: 'Test 2', text: 'Hi' },
      ];

      mockKV._store.set(`batch:${batchId}:emails`, JSON.stringify(emails));
      mockKV._store.set(`batch:${batchId}:options`, JSON.stringify({ clientId: 'client-123' }));
      mockKV._store.set(
        `batch:${batchId}:status`,
        JSON.stringify({
          batchId,
          status: 'pending',
          progress: { total: 2, processed: 0, succeeded: 0, failed: 0 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      );

      await service.processBatch(batchId);

      expect(mockEmailService.send).toHaveBeenCalledTimes(2);

      // Check status was updated
      const statusJson = mockKV._store.get(`batch:${batchId}:status`);
      const status = JSON.parse(statusJson!);
      expect(status.status).toBe('completed');
    });

    it('should throw for non-existent batch', async () => {
      await expect(service.processBatch('non-existent')).rejects.toThrow('not found');
    });
  });

  describe('getBatchResults', () => {
    it('should return batch results after processing', async () => {
      const batchId = 'results-batch-123';

      // Setup and process batch
      mockKV._store.set(
        `batch:${batchId}:emails`,
        JSON.stringify([
          { to: 'user@example.com', from: 'sender@example.com', subject: 'Test', text: 'Hi' },
        ])
      );
      mockKV._store.set(`batch:${batchId}:options`, JSON.stringify({ clientId: 'client-123' }));
      mockKV._store.set(
        `batch:${batchId}:status`,
        JSON.stringify({
          batchId,
          status: 'pending',
          progress: { total: 1, processed: 0, succeeded: 0, failed: 0 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      );

      await service.processBatch(batchId);

      const results = await service.getBatchResults(batchId);

      expect(results).not.toBeNull();
      expect(results).toHaveLength(1);
      expect(results![0].success).toBe(true);
    });

    it('should return null for batch without results', async () => {
      const results = await service.getBatchResults('no-results-batch');
      expect(results).toBeNull();
    });
  });

  describe('cancelBatch', () => {
    it('should cancel pending batch', async () => {
      const request: BatchEmailRequest = {
        emails: [
          { to: 'user@example.com', from: 'sender@example.com', subject: 'Test', text: 'Hi' },
        ],
      };

      const { batchId } = await service.queueBatch(request, 'client-123');
      const cancelled = await service.cancelBatch(batchId);

      expect(cancelled).toBe(true);

      const status = await service.getBatchStatus(batchId);
      expect(status?.status).toBe('failed');
    });

    it('should not cancel processing batch', async () => {
      const batchId = 'processing-batch';
      mockKV._store.set(
        `batch:${batchId}:status`,
        JSON.stringify({
          batchId,
          status: 'processing',
          progress: { total: 10, processed: 5, succeeded: 5, failed: 0 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      );

      const cancelled = await service.cancelBatch(batchId);

      expect(cancelled).toBe(false);
    });

    it('should return false for non-existent batch', async () => {
      const cancelled = await service.cancelBatch('non-existent');
      expect(cancelled).toBe(false);
    });
  });

  describe('createBatchEmailService', () => {
    it('should create service from env', () => {
      const env = {
        EMAIL_KV: mockKV,
        EMAIL_QUEUE: mockQueue,
      } as unknown as Env;

      const createdService = createBatchEmailService(
        mockEmailService as unknown as EmailService,
        mockSuppressionService as unknown as SuppressionService,
        env
      );

      expect(createdService).toBeInstanceOf(BatchEmailService);
    });
  });
});
