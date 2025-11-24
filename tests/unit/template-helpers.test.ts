/**
 * NOIZYLAB Email System - Template Helpers Tests
 */

import { describe, it, expect } from 'vitest';
import {
  templateHelpers,
  registerHelper,
  getHelper,
  listHelpers,
} from '../../src/services/template-helpers';

describe('Template Helpers', () => {
  describe('String Helpers', () => {
    it('should convert to uppercase', () => {
      expect(templateHelpers.uppercase('hello')).toBe('HELLO');
      expect(templateHelpers.uppercase('')).toBe('');
    });

    it('should convert to lowercase', () => {
      expect(templateHelpers.lowercase('HELLO')).toBe('hello');
    });

    it('should capitalize first letter', () => {
      expect(templateHelpers.capitalize('hello world')).toBe('Hello world');
      expect(templateHelpers.capitalize('')).toBe('');
    });

    it('should capitalize all words', () => {
      expect(templateHelpers.capitalizeWords('hello world')).toBe('Hello World');
    });

    it('should truncate strings', () => {
      expect(templateHelpers.truncate('hello world', 5)).toBe('hello...');
      expect(templateHelpers.truncate('hi', 5)).toBe('hi');
      expect(templateHelpers.truncate('hello world', 5, '!')).toBe('hello!');
    });

    it('should pad strings', () => {
      expect(templateHelpers.padStart('5', 3, '0')).toBe('005');
      expect(templateHelpers.padEnd('5', 3, '0')).toBe('500');
    });

    it('should trim strings', () => {
      expect(templateHelpers.trim('  hello  ')).toBe('hello');
    });

    it('should replace substrings', () => {
      expect(templateHelpers.replace('hello world', 'world', 'there')).toBe('hello there');
    });

    it('should split strings', () => {
      expect(templateHelpers.split('a,b,c', ',')).toEqual(['a', 'b', 'c']);
    });

    it('should join arrays', () => {
      expect(templateHelpers.join(['a', 'b', 'c'], ', ')).toBe('a, b, c');
    });

    it('should get substring', () => {
      expect(templateHelpers.substring('hello', 0, 3)).toBe('hel');
    });

    it('should get string length', () => {
      expect(templateHelpers.length('hello')).toBe(5);
      expect(templateHelpers.length([1, 2, 3])).toBe(3);
    });

    it('should repeat strings', () => {
      expect(templateHelpers.repeat('ab', 3)).toBe('ababab');
    });
  });

  describe('Number Helpers', () => {
    it('should format numbers', () => {
      expect(templateHelpers.formatNumber(1234567.89)).toBe('1,234,567.89');
      expect(templateHelpers.formatNumber(1234.5, 0)).toBe('1,235');
    });

    it('should format currency', () => {
      expect(templateHelpers.formatCurrency(1234.5, 'USD')).toContain('1,234.50');
    });

    it('should format percentages', () => {
      expect(templateHelpers.formatPercent(0.1234, 1)).toBe('12.3%');
    });

    it('should round numbers', () => {
      expect(templateHelpers.round(1.567, 2)).toBe(1.57);
      expect(templateHelpers.floor(1.9)).toBe(1);
      expect(templateHelpers.ceil(1.1)).toBe(2);
    });

    it('should find min and max', () => {
      expect(templateHelpers.min(1, 2, 3)).toBe(1);
      expect(templateHelpers.max(1, 2, 3)).toBe(3);
    });

    it('should calculate absolute value', () => {
      expect(templateHelpers.abs(-5)).toBe(5);
    });

    it('should do math operations', () => {
      expect(templateHelpers.add(2, 3)).toBe(5);
      expect(templateHelpers.subtract(5, 3)).toBe(2);
      expect(templateHelpers.multiply(2, 3)).toBe(6);
      expect(templateHelpers.divide(6, 2)).toBe(3);
      expect(templateHelpers.modulo(7, 3)).toBe(1);
    });
  });

  describe('Date Helpers', () => {
    it('should format dates', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = templateHelpers.formatDate(date, 'en-US');
      expect(formatted).toContain('2024');
    });

    it('should format time', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = templateHelpers.formatTime(date, 'en-US');
      expect(typeof formatted).toBe('string');
    });

    it('should format datetime', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = templateHelpers.formatDateTime(date, 'en-US');
      expect(formatted).toContain('2024');
    });

    it('should calculate time ago', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      expect(templateHelpers.timeAgo(fiveMinutesAgo)).toBe('5 minutes ago');

      const yesterday = new Date(now.getTime() - 25 * 60 * 60 * 1000);
      expect(templateHelpers.timeAgo(yesterday)).toBe('1 day ago');
    });

    it('should get current year', () => {
      expect(templateHelpers.year()).toBe(new Date().getFullYear());
    });
  });

  describe('Comparison Helpers', () => {
    it('should check equality', () => {
      expect(templateHelpers.eq(1, 1)).toBe(true);
      expect(templateHelpers.eq(1, 2)).toBe(false);
    });

    it('should check inequality', () => {
      expect(templateHelpers.ne(1, 2)).toBe(true);
      expect(templateHelpers.ne(1, 1)).toBe(false);
    });

    it('should compare values', () => {
      expect(templateHelpers.lt(1, 2)).toBe(true);
      expect(templateHelpers.lte(2, 2)).toBe(true);
      expect(templateHelpers.gt(2, 1)).toBe(true);
      expect(templateHelpers.gte(2, 2)).toBe(true);
    });

    it('should handle logical operations', () => {
      expect(templateHelpers.and(true, true)).toBe(true);
      expect(templateHelpers.and(true, false)).toBe(false);
      expect(templateHelpers.or(true, false)).toBe(true);
      expect(templateHelpers.not(false)).toBe(true);
    });

    it('should handle ternary', () => {
      expect(templateHelpers.ternary(true, 'yes', 'no')).toBe('yes');
      expect(templateHelpers.ternary(false, 'yes', 'no')).toBe('no');
    });

    it('should handle default values', () => {
      expect(templateHelpers.default(null, 'fallback')).toBe('fallback');
      expect(templateHelpers.default(undefined, 'fallback')).toBe('fallback');
      expect(templateHelpers.default('value', 'fallback')).toBe('value');
    });
  });

  describe('Array Helpers', () => {
    it('should get first element', () => {
      expect(templateHelpers.first([1, 2, 3])).toBe(1);
      expect(templateHelpers.first([])).toBeUndefined();
    });

    it('should get last element', () => {
      expect(templateHelpers.last([1, 2, 3])).toBe(3);
    });

    it('should get element at index', () => {
      expect(templateHelpers.nth([1, 2, 3], 1)).toBe(2);
    });

    it('should slice arrays', () => {
      expect(templateHelpers.slice([1, 2, 3, 4], 1, 3)).toEqual([2, 3]);
    });

    it('should reverse arrays', () => {
      expect(templateHelpers.reverse([1, 2, 3])).toEqual([3, 2, 1]);
    });

    it('should sort arrays', () => {
      expect(templateHelpers.sort([3, 1, 2])).toEqual([1, 2, 3]);
    });

    it('should check array includes', () => {
      expect(templateHelpers.includes([1, 2, 3], 2)).toBe(true);
      expect(templateHelpers.includes([1, 2, 3], 4)).toBe(false);
    });

    it('should create range', () => {
      expect(templateHelpers.range(1, 4)).toEqual([1, 2, 3]);
    });
  });

  describe('Object Helpers', () => {
    it('should get object keys', () => {
      expect(templateHelpers.keys({ a: 1, b: 2 })).toEqual(['a', 'b']);
    });

    it('should get object values', () => {
      expect(templateHelpers.values({ a: 1, b: 2 })).toEqual([1, 2]);
    });

    it('should get nested property', () => {
      const obj = { a: { b: { c: 'value' } } };
      expect(templateHelpers.get(obj, 'a.b.c')).toBe('value');
      expect(templateHelpers.get(obj, 'a.x.y', 'default')).toBe('default');
    });

    it('should convert to JSON', () => {
      expect(templateHelpers.json({ a: 1 })).toBe('{"a":1}');
      expect(templateHelpers.json({ a: 1 }, true)).toContain('\n');
    });
  });

  describe('URL Helpers', () => {
    it('should encode URL components', () => {
      expect(templateHelpers.encodeUri('hello world')).toBe('hello%20world');
      expect(templateHelpers.encodeUriComponent('a=b&c=d')).toBe('a%3Db%26c%3Dd');
    });

    it('should decode URL components', () => {
      expect(templateHelpers.decodeUri('hello%20world')).toBe('hello world');
    });
  });

  describe('HTML Helpers', () => {
    it('should escape HTML', () => {
      expect(templateHelpers.escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should strip tags', () => {
      expect(templateHelpers.stripTags('<p>Hello <b>World</b></p>')).toBe('Hello World');
    });

    it('should convert newlines to br', () => {
      expect(templateHelpers.nl2br('hello\nworld')).toBe('hello<br>world');
    });
  });

  describe('Helper Registration', () => {
    it('should register new helpers', () => {
      const myHelper = (value: string) => value.toUpperCase();
      registerHelper('myHelper', myHelper);
      expect(getHelper('myHelper')).toBe(myHelper);
    });

    it('should return undefined for unknown helpers', () => {
      expect(getHelper('unknownHelper')).toBeUndefined();
    });

    it('should list all helpers', () => {
      const helpers = listHelpers();
      expect(helpers).toContain('uppercase');
      expect(helpers).toContain('formatNumber');
      expect(helpers).toContain('escapeHtml');
    });
  });
});
