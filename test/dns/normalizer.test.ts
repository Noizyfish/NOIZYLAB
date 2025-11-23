/**
 * Tests for normalizer module
 */

import { describe, it, expect } from 'vitest';
import { normalizeZoneConfig } from '../../infra/dns/normalizer.js';
import type { ZoneConfig } from '../../infra/dns/types.js';

describe('normalizer', () => {
  describe('normalizeZoneConfig', () => {
    it('should apply default TTL to records without explicit TTL', () => {
      const config: ZoneConfig = {
        zone: 'example.com',
        defaultTtl: 7200,
        records: [
          { type: 'A', name: 'www', value: '192.0.2.1' },
          { type: 'A', name: 'api', value: '192.0.2.2', ttl: 3600 },
        ],
      };

      const normalized = normalizeZoneConfig(config);

      // Records are sorted, so api comes before www
      const www = normalized.records.find(r => r.name === 'www');
      const api = normalized.records.find(r => r.name === 'api');
      expect(www?.ttl).toBe(7200);
      expect(api?.ttl).toBe(3600);
    });

    it('should use default TTL of 3600 if not specified', () => {
      const config: ZoneConfig = {
        zone: 'example.com',
        records: [{ type: 'A', name: 'www', value: '192.0.2.1' }],
      };

      const normalized = normalizeZoneConfig(config);

      expect(normalized.defaultTtl).toBe(3600);
      expect(normalized.records[0].ttl).toBe(3600);
    });

    it('should convert empty name to "@"', () => {
      const config: ZoneConfig = {
        zone: 'example.com',
        records: [{ type: 'A', name: '', value: '192.0.2.1' }],
      };

      const normalized = normalizeZoneConfig(config);

      expect(normalized.records[0].name).toBe('@');
    });

    it('should convert zone name to "@"', () => {
      const config: ZoneConfig = {
        zone: 'example.com',
        records: [{ type: 'A', name: 'example.com', value: '192.0.2.1' }],
      };

      const normalized = normalizeZoneConfig(config);

      expect(normalized.records[0].name).toBe('@');
    });

    it('should add trailing dots to FQDNs', () => {
      const config: ZoneConfig = {
        zone: 'example.com',
        records: [
          { type: 'CNAME', name: 'www', target: 'example.com' },
          { type: 'MX', name: '@', priority: 10, target: 'mail.example.com' },
        ],
      };

      const normalized = normalizeZoneConfig(config);

      expect(normalized.records[0].type === 'CNAME' && normalized.records[0].target).toBe(
        'example.com.'
      );
      expect(normalized.records[1].type === 'MX' && normalized.records[1].target).toBe(
        'mail.example.com.'
      );
    });

    it('should lowercase hostnames', () => {
      const config: ZoneConfig = {
        zone: 'EXAMPLE.COM',
        records: [
          { type: 'A', name: 'WWW', value: '192.0.2.1' },
          { type: 'CNAME', name: 'API', target: 'Example.COM' },
        ],
      };

      const normalized = normalizeZoneConfig(config);

      expect(normalized.zone).toBe('example.com');
      expect(normalized.records[0].name).toBe('www');
      expect(normalized.records[1].name).toBe('api');
      expect(normalized.records[1].type === 'CNAME' && normalized.records[1].target).toBe(
        'example.com.'
      );
    });

    it('should remove duplicate records', () => {
      const config: ZoneConfig = {
        zone: 'example.com',
        records: [
          { type: 'A', name: 'www', value: '192.0.2.1' },
          { type: 'A', name: 'www', value: '192.0.2.1' },
          { type: 'A', name: 'api', value: '192.0.2.2' },
        ],
      };

      const normalized = normalizeZoneConfig(config);

      expect(normalized.records.length).toBe(2);
      // Records are sorted alphabetically, so api comes before www
      expect(normalized.records[0].name).toBe('api');
      expect(normalized.records[1].name).toBe('www');
    });

    it('should sort records by type then name', () => {
      const config: ZoneConfig = {
        zone: 'example.com',
        records: [
          { type: 'TXT', name: 'www', value: 'test' },
          { type: 'A', name: 'api', value: '192.0.2.2' },
          { type: 'A', name: 'www', value: '192.0.2.1' },
          { type: 'CNAME', name: 'mail', target: 'example.com' },
        ],
      };

      const normalized = normalizeZoneConfig(config);

      expect(normalized.records[0].type).toBe('A');
      expect(normalized.records[0].name).toBe('api');
      expect(normalized.records[1].type).toBe('A');
      expect(normalized.records[1].name).toBe('www');
      expect(normalized.records[2].type).toBe('CNAME');
      expect(normalized.records[3].type).toBe('TXT');
    });

    it('should sort MX records by priority', () => {
      const config: ZoneConfig = {
        zone: 'example.com',
        records: [
          { type: 'MX', name: '@', priority: 10, target: 'mail2.example.com' },
          { type: 'MX', name: '@', priority: 5, target: 'mail1.example.com' },
        ],
      };

      const normalized = normalizeZoneConfig(config);

      expect(normalized.records[0].type === 'MX' && normalized.records[0].priority).toBe(5);
      expect(normalized.records[1].type === 'MX' && normalized.records[1].priority).toBe(10);
    });

    it('should trim whitespace from all string fields', () => {
      const config: ZoneConfig = {
        zone: '  example.com  ',
        records: [
          { type: 'A', name: '  www  ', value: '  192.0.2.1  ' },
          { type: 'TXT', name: '  @  ', value: '  test value  ' },
        ],
      };

      const normalized = normalizeZoneConfig(config);

      expect(normalized.zone).toBe('example.com');
      expect(normalized.records[0].name).toBe('www');
      expect(normalized.records[0].type === 'A' && normalized.records[0].value).toBe('192.0.2.1');
      expect(normalized.records[1].name).toBe('@');
      expect(normalized.records[1].type === 'TXT' && normalized.records[1].value).toBe(
        'test value'
      );
    });

    it('should respect custom normalizer options', () => {
      const config: ZoneConfig = {
        zone: 'example.com',
        records: [
          { type: 'A', name: 'www', value: '192.0.2.1' },
          { type: 'CNAME', name: 'api', target: 'example.com' },
        ],
      };

      const normalized = normalizeZoneConfig(config, {
        ensureTrailingDots: false,
        lowercaseHostnames: false,
        removeDuplicates: false,
        sortRecords: false,
      });

      // When ensureTrailingDots is false, no trailing dot should be added
      const cname = normalized.records.find(r => r.type === 'CNAME');
      expect(cname && cname.target).toBe('example.com');
    });
  });
});
