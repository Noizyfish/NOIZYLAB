/**
 * NOIZYLAB Email System - Providers Index
 * Export all email providers
 */

export { BaseEmailProvider, type SendOptions, type ProviderResponse } from './base';
export { MailChannelsProvider, createMailChannelsProvider } from './mailchannels';
export { ResendProvider, createResendProvider } from './resend';
export { SendGridProvider, createSendGridProvider } from './sendgrid';
export { SESProvider, createSESProvider } from './ses';
export { PostmarkProvider, createPostmarkProvider } from './postmark';
export { MockProvider, createMockProvider, type MockSentEmail, type MockProviderConfig } from './mock';

import type { EmailProvider } from '../../types';
import { BaseEmailProvider } from './base';
import { createMailChannelsProvider } from './mailchannels';
import { createResendProvider } from './resend';
import { createSendGridProvider } from './sendgrid';
import { createSESProvider } from './ses';
import { createPostmarkProvider } from './postmark';

/**
 * Extended provider type to include new providers
 */
export type ExtendedEmailProvider = EmailProvider | 'ses' | 'postmark';

/**
 * Provider registry type
 */
export type ProviderRegistry = {
  [K in ExtendedEmailProvider]?: BaseEmailProvider;
};

/**
 * Provider configuration
 */
export interface ProviderConfig {
  priority: ExtendedEmailProvider[];
  fallbackEnabled: boolean;
}

/**
 * Create all available providers from environment
 */
export function createProviders(env: Env): ProviderRegistry {
  const providers: ProviderRegistry = {};

  // MailChannels is always available (free for Workers)
  providers.mailchannels = createMailChannelsProvider(env);

  // Resend (if API key provided)
  const resend = createResendProvider(env);
  if (resend !== null) {
    providers.resend = resend;
  }

  // SendGrid (if API key provided)
  const sendgrid = createSendGridProvider(env);
  if (sendgrid !== null) {
    providers.sendgrid = sendgrid;
  }

  // AWS SES (if credentials provided)
  const ses = createSESProvider(env);
  if (ses !== null) {
    providers.ses = ses;
  }

  // Postmark (if server token provided)
  const postmark = createPostmarkProvider(env);
  if (postmark !== null) {
    providers.postmark = postmark;
  }

  return providers;
}

/**
 * Get default provider based on availability and priority
 */
export function getDefaultProvider(
  providers: ProviderRegistry,
  priority?: ExtendedEmailProvider[]
): BaseEmailProvider {
  // Default priority order
  const defaultPriority: ExtendedEmailProvider[] = [
    'resend',
    'postmark',
    'sendgrid',
    'ses',
    'mailchannels',
  ];

  const orderedProviders = priority ?? defaultPriority;

  for (const providerName of orderedProviders) {
    const provider = providers[providerName];
    if (provider !== undefined) {
      return provider;
    }
  }

  throw new Error('No email provider available');
}

/**
 * Get provider by name
 */
export function getProvider(
  providers: ProviderRegistry,
  name: ExtendedEmailProvider
): BaseEmailProvider | undefined {
  return providers[name];
}

/**
 * Get all healthy providers
 */
export async function getHealthyProviders(
  providers: ProviderRegistry
): Promise<ExtendedEmailProvider[]> {
  const healthChecks = await Promise.all(
    Object.entries(providers).map(async ([name, provider]) => {
      if (provider === undefined) return null;
      const health = await provider.healthCheck();
      return health.healthy ? (name as ExtendedEmailProvider) : null;
    })
  );

  return healthChecks.filter((name): name is ExtendedEmailProvider => name !== null);
}

/**
 * Send with fallback to other providers
 */
export async function sendWithFallback(
  providers: ProviderRegistry,
  email: import('../../types').EmailRequest,
  priority?: ExtendedEmailProvider[]
): Promise<{ provider: ExtendedEmailProvider; response: import('./base').ProviderResponse }> {
  const defaultPriority: ExtendedEmailProvider[] = [
    'resend',
    'postmark',
    'sendgrid',
    'ses',
    'mailchannels',
  ];

  const orderedProviders = priority ?? defaultPriority;
  const errors: Array<{ provider: string; error: Error }> = [];

  for (const providerName of orderedProviders) {
    const provider = providers[providerName];
    if (provider === undefined) continue;

    try {
      const response = await provider.send(email);
      return { provider: providerName, response };
    } catch (error) {
      errors.push({
        provider: providerName,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  throw new Error(
    `All providers failed: ${errors.map((e) => `${e.provider}: ${e.error.message}`).join(', ')}`
  );
}

/**
 * List available providers
 */
export function listAvailableProviders(providers: ProviderRegistry): ExtendedEmailProvider[] {
  return Object.entries(providers)
    .filter(([_, provider]) => provider !== undefined)
    .map(([name]) => name as ExtendedEmailProvider);
}

/**
 * Get provider capabilities
 */
export function getProviderCapabilities(providers: ProviderRegistry): Record<
  string,
  {
    name: string;
    supportsAttachments: boolean;
    supportsBcc: boolean;
    maxRecipients: number;
  }
> {
  const capabilities: Record<
    string,
    {
      name: string;
      supportsAttachments: boolean;
      supportsBcc: boolean;
      maxRecipients: number;
    }
  > = {};

  for (const [name, provider] of Object.entries(providers)) {
    if (provider !== undefined) {
      capabilities[name] = {
        name: provider.name,
        supportsAttachments: provider.supportsAttachments,
        supportsBcc: provider.supportsBcc,
        maxRecipients: provider.maxRecipientsPerRequest,
      };
    }
  }

  return capabilities;
}
