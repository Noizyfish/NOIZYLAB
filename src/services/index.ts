/**
 * NOIZYLAB Email System - Services Index
 * Export all services
 */

// Core services
export { RateLimiter, createRateLimiter, getRateLimitHeaders, type RateLimitHeaders } from './rate-limiter';
export { TemplateEngine, createTemplateEngine } from './template-engine';
export { EmailService, createEmailService, type EmailServiceConfig, type SendEmailOptions } from './email-service';

// Additional services
export { WebhookService, createWebhookService, type WebhookEvent } from './webhook-service';
export { AnalyticsService, createAnalyticsService, type AnalyticsOverview, type VolumeDataPoint, type ProviderMetrics, type DomainStats, type TemplateStats, type TimeRange } from './analytics-service';
export { SuppressionService, createSuppressionService, type SuppressionEntry, type SuppressionReason, type BulkSuppressionResult } from './suppression-service';
export { BatchEmailService, createBatchEmailService, type BatchEmailRequest, type BatchEmailResult, type BatchResponse, type BatchJobStatus } from './batch-service';
export { APIKeyService, createAPIKeyService, type APIKey, type APIKeyScope, type CreateAPIKeyInput, type APIKeyValidationResult, scopeDescriptions } from './api-key-service';
export { MetricsService, createMetricsService, getMetrics, recordAPIMetrics, EMAIL_METRICS, type MetricLabels } from './metrics-service';

// Template helpers
export { templateHelpers, registerHelper, getHelper, listHelpers, type TemplateHelper } from './template-helpers';

// Providers
export * from './providers';
