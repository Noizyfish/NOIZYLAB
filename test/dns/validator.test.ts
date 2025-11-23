/**
 * Tests for validator module
 */

import { describe, it, expect } from 'vitest';
import { validateZoneConfig } from '../../infra/dns/validator.js';
import type { ZoneConfig } from '../../infra/dns/types.js';

describe('validator', () => {
  describe('validateZoneConfig', () => {
    it('should validate a correct configuration', () => {
      const config: ZoneConfig = {
        zone: 'example.com',
        records: [
          { type: 'A', name: 'www', value: '192.0.2.1', ttl: 3600 },
          { type: 'MX', name: '@', priority: 10, target: 'mail.example.com.', ttl: 3600 },
        ],
      };

      const result = validateZoneConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    describe('A records', () => {
      it('should accept valid IPv4 addresses', () => {
        const config: ZoneConfig = {
          zone: 'example.com',
          records: [
            { type: 'A', name: 'www', value: '192.0.2.1' },
            { type: 'A', name: 'api', value: '10.0.0.1' },
            { type: 'A', name: 'test', value: '255.255.255.255' },
          ],
        };

        const result = validateZoneConfig(config);
        expect(result.valid).toBe(true);
      });

      it('should reject invalid IPv4 addresses', () => {
        const config: ZoneConfig = {
          zone: 'example.com',
          records: [
            { type: 'A', name: 'www', value: '256.0.0.1' },
            { type: 'A', name: 'api', value: '192.0.2' },
            { type: 'A', name: 'test', value: 'not-an-ip' },
          ],
        };

        const result = validateZoneConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('AAAA records', () => {
      it('should accept valid IPv6 addresses', () => {
        const config: ZoneConfig = {
          zone: 'example.com',
          records: [
            { type: 'AAAA', name: 'www', value: '2001:0db8::1' },
            { type: 'AAAA', name: 'api', value: '2001:db8:85a3::8a2e:370:7334' },
          ],
        };

        const result = validateZoneConfig(config);
        expect(result.valid).toBe(true);
      });

      it('should reject invalid IPv6 addresses', () => {
        const config: ZoneConfig = {
          zone: 'example.com',
          records: [{ type: 'AAAA', name: 'www', value: 'not-an-ipv6' }],
        };

        const result = validateZoneConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('CNAME records', () => {
      it('should not allow CNAME at zone apex', () => {
        const config: ZoneConfig = {
          zone: 'example.com',
          records: [{ type: 'CNAME', name: '@', target: 'example.com.' }],
        };

        const result = validateZoneConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('apex'))).toBe(true);
      });

      it('should enforce CNAME exclusivity', () => {
        const config: ZoneConfig = {
          zone: 'example.com',
          records: [
            { type: 'CNAME', name: 'www', target: 'example.com.' },
            { type: 'A', name: 'www', value: '192.0.2.1' },
          ],
        };

        const result = validateZoneConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('conflicts'))).toBe(true);
      });

      it('should reject empty CNAME target', () => {
        const config: ZoneConfig = {
          zone: 'example.com',
          records: [{ type: 'CNAME', name: 'www', target: '' }],
        };

        const result = validateZoneConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('empty'))).toBe(true);
      });

      it('should reject invalid CNAME target', () => {
        const config: ZoneConfig = {
          zone: 'example.com',
          records: [{ type: 'CNAME', name: 'www', target: 'invalid..hostname' }],
        };

        const result = validateZoneConfig(config);
        expect(result.valid).toBe(false);
      });
    });

    describe('MX records', () => {
      it('should validate MX priority range', () => {
        const validConfig: ZoneConfig = {
          zone: 'example.com',
          records: [
            { type: 'MX', name: '@', priority: 0, target: 'mail.example.com.' },
            { type: 'MX', name: '@', priority: 65535, target: 'mail2.example.com.' },
          ],
        };

        const result = validateZoneConfig(validConfig);
        expect(result.valid).toBe(true);

        const invalidConfig: ZoneConfig = {
          zone: 'example.com',
          records: [
            { type: 'MX', name: '@', priority: -1, target: 'mail.example.com.' },
            { type: 'MX', name: '@', priority: 65536, target: 'mail2.example.com.' },
          ],
        };

        const invalidResult = validateZoneConfig(invalidConfig);
        expect(invalidResult.valid).toBe(false);
        expect(invalidResult.errors.length).toBeGreaterThanOrEqual(2);
      });

      it('should reject empty MX target', () => {
        const config: ZoneConfig = {
          zone: 'example.com',
          records: [{ type: 'MX', name: '@', priority: 10, target: '' }],
        };

        const result = validateZoneConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('empty'))).toBe(true);
      });
    });

    describe('TXT records', () => {
      it('should warn about empty TXT values', () => {
        const config: ZoneConfig = {
          zone: 'example.com',
          records: [{ type: 'TXT', name: '@', value: '' }],
        };

        const result = validateZoneConfig(config);
        expect(result.warnings.length).toBeGreaterThanOrEqual(1);
        expect(result.warnings.some((w) => w.message.includes('empty'))).toBe(true);
      });

      it('should warn about TXT values longer than 255 characters', () => {
        const config: ZoneConfig = {
          zone: 'example.com',
          records: [{ type: 'TXT', name: '@', value: 'a'.repeat(256) }],
        };

        const result = validateZoneConfig(config);
        expect(result.warnings.length).toBeGreaterThanOrEqual(1);
        expect(result.warnings.some((w) => w.message.includes('255'))).toBe(true);
      });
    });

    describe('SRV records', () => {
      it('should validate SRV field ranges', () => {
        const validConfig: ZoneConfig = {
          zone: 'example.com',
          records: [
            {
              type: 'SRV',
              name: '_http._tcp',
              priority: 10,
              weight: 20,
              port: 80,
              target: 'server.example.com.',
            },
          ],
        };

        const result = validateZoneConfig(validConfig);
        expect(result.valid).toBe(true);

        const invalidConfig: ZoneConfig = {
          zone: 'example.com',
          records: [
            {
              type: 'SRV',
              name: '_http._tcp',
              priority: -1,
              weight: 70000,
              port: 80,
              target: 'server.example.com.',
            },
          ],
        };

        const invalidResult = validateZoneConfig(invalidConfig);
        expect(invalidResult.valid).toBe(false);
        expect(invalidResult.errors.length).toBeGreaterThanOrEqual(2);
      });

      it('should reject empty SRV target', () => {
        const config: ZoneConfig = {
          zone: 'example.com',
          records: [
            {
              type: 'SRV',
              name: '_http._tcp',
              priority: 10,
              weight: 20,
              port: 80,
              target: '',
            },
          ],
        };

        const result = validateZoneConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('empty'))).toBe(true);
      });
    });

    describe('NS records', () => {
      it('should validate NS records', () => {
        const validConfig: ZoneConfig = {
          zone: 'example.com',
          records: [{ type: 'NS', name: '@', target: 'ns1.example.com.' }],
        };

        const result = validateZoneConfig(validConfig);
        expect(result.valid).toBe(true);

        const invalidConfig: ZoneConfig = {
          zone: 'example.com',
          records: [{ type: 'NS', name: '@', target: '' }],
        };

        const invalidResult = validateZoneConfig(invalidConfig);
        expect(invalidResult.valid).toBe(false);
      });
    });

    describe('CAA records', () => {
      it('should validate CAA flags', () => {
        const validConfig: ZoneConfig = {
          zone: 'example.com',
          records: [
            { type: 'CAA', name: '@', flags: 0, tag: 'issue', value: 'letsencrypt.org' },
            { type: 'CAA', name: '@', flags: 128, tag: 'issuewild', value: 'ca.example.com' },
          ],
        };

        const result = validateZoneConfig(validConfig);
        expect(result.valid).toBe(true);

        const invalidConfig: ZoneConfig = {
          zone: 'example.com',
          records: [{ type: 'CAA', name: '@', flags: 64, tag: 'issue', value: 'letsencrypt.org' }],
        };

        const invalidResult = validateZoneConfig(invalidConfig);
        expect(invalidResult.valid).toBe(false);
        expect(invalidResult.errors.some((e) => e.message.includes('flags'))).toBe(true);
      });

      it('should reject empty CAA value', () => {
        const config: ZoneConfig = {
          zone: 'example.com',
          records: [{ type: 'CAA', name: '@', flags: 0, tag: 'issue', value: '' }],
        };

        const result = validateZoneConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('empty'))).toBe(true);
      });
    });

    describe('TTL validation', () => {
      it('should warn about very low TTL', () => {
        const config: ZoneConfig = {
          zone: 'example.com',
          records: [{ type: 'A', name: 'www', value: '192.0.2.1', ttl: 60 }],
        };

        const result = validateZoneConfig(config);
        expect(result.warnings.some((w) => w.message.includes('low'))).toBe(true);
      });

      it('should warn about very high TTL', () => {
        const config: ZoneConfig = {
          zone: 'example.com',
          records: [{ type: 'A', name: 'www', value: '192.0.2.1', ttl: 100000 }],
        };

        const result = validateZoneConfig(config);
        expect(result.warnings.some((w) => w.message.includes('high'))).toBe(true);
      });

      it('should error on negative TTL', () => {
        const config: ZoneConfig = {
          zone: 'example.com',
          records: [{ type: 'A', name: 'www', value: '192.0.2.1', ttl: -1 }],
        };

        const result = validateZoneConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('negative'))).toBe(true);
      });
    });
  });
});
