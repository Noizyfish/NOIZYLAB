/**
 * NOIZYLAB Email System - Template Helpers
 * Advanced template helpers for formatting, conditionals, and utilities
 */

/**
 * Template helper function type
 */
export type TemplateHelper = (value: unknown, ...args: unknown[]) => string;

/**
 * Collection of built-in template helpers
 */
export const templateHelpers: Record<string, TemplateHelper> = {
  // =========================================================================
  // String Helpers
  // =========================================================================

  /**
   * Convert to uppercase
   * Usage: {{uppercase name}}
   */
  uppercase: (value) => String(value ?? '').toUpperCase(),

  /**
   * Convert to lowercase
   * Usage: {{lowercase name}}
   */
  lowercase: (value) => String(value ?? '').toLowerCase(),

  /**
   * Capitalize first letter
   * Usage: {{capitalize name}}
   */
  capitalize: (value) => {
    const str = String(value ?? '');
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  /**
   * Title case (capitalize each word)
   * Usage: {{titlecase name}}
   */
  titlecase: (value) => {
    return String(value ?? '')
      .toLowerCase()
      .replace(/(?:^|\s)\S/g, (char) => char.toUpperCase());
  },

  /**
   * Truncate string
   * Usage: {{truncate description 100}}
   */
  truncate: (value, length = 100, suffix = '...') => {
    const str = String(value ?? '');
    const len = Number(length);
    const sfx = String(suffix);
    if (str.length <= len) return str;
    return str.slice(0, len - sfx.length) + sfx;
  },

  /**
   * Replace text
   * Usage: {{replace text "old" "new"}}
   */
  replace: (value, search, replacement) => {
    return String(value ?? '').replace(new RegExp(String(search), 'g'), String(replacement ?? ''));
  },

  /**
   * Trim whitespace
   * Usage: {{trim value}}
   */
  trim: (value) => String(value ?? '').trim(),

  /**
   * Pad string
   * Usage: {{padStart value 5 "0"}}
   */
  padStart: (value, length, char = ' ') => {
    return String(value ?? '').padStart(Number(length), String(char));
  },

  padEnd: (value, length, char = ' ') => {
    return String(value ?? '').padEnd(Number(length), String(char));
  },

  // =========================================================================
  // Number Helpers
  // =========================================================================

  /**
   * Format number with thousand separators
   * Usage: {{formatNumber amount}}
   */
  formatNumber: (value, locale = 'en-US') => {
    const num = Number(value);
    if (isNaN(num)) return String(value);
    return num.toLocaleString(String(locale));
  },

  /**
   * Format currency
   * Usage: {{formatCurrency amount "USD"}}
   */
  formatCurrency: (value, currency = 'USD', locale = 'en-US') => {
    const num = Number(value);
    if (isNaN(num)) return String(value);
    return num.toLocaleString(String(locale), {
      style: 'currency',
      currency: String(currency),
    });
  },

  /**
   * Format percentage
   * Usage: {{formatPercent 0.25}}
   */
  formatPercent: (value, decimals = 0) => {
    const num = Number(value);
    if (isNaN(num)) return String(value);
    return (num * 100).toFixed(Number(decimals)) + '%';
  },

  /**
   * Round number
   * Usage: {{round value 2}}
   */
  round: (value, decimals = 0) => {
    const num = Number(value);
    if (isNaN(num)) return String(value);
    return num.toFixed(Number(decimals));
  },

  /**
   * Format bytes to human readable
   * Usage: {{formatBytes 1024}}
   */
  formatBytes: (value, decimals = 2) => {
    const bytes = Number(value);
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = Number(decimals);
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  // =========================================================================
  // Date/Time Helpers
  // =========================================================================

  /**
   * Format date
   * Usage: {{formatDate date "YYYY-MM-DD"}}
   */
  formatDate: (value, format = 'YYYY-MM-DD') => {
    const date = new Date(String(value));
    if (isNaN(date.getTime())) return String(value);

    const formatStr = String(format);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return formatStr
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  },

  /**
   * Format to relative time
   * Usage: {{timeAgo date}}
   */
  timeAgo: (value) => {
    const date = new Date(String(value));
    if (isNaN(date.getTime())) return String(value);

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  },

  /**
   * Get current date/time
   * Usage: {{now}}
   */
  now: () => new Date().toISOString(),

  /**
   * Get current year
   * Usage: {{year}}
   */
  year: () => String(new Date().getFullYear()),

  // =========================================================================
  // Array/Object Helpers
  // =========================================================================

  /**
   * Get array length
   * Usage: {{length items}}
   */
  length: (value) => {
    if (Array.isArray(value)) return String(value.length);
    if (typeof value === 'string') return String(value.length);
    if (typeof value === 'object' && value !== null) {
      return String(Object.keys(value).length);
    }
    return '0';
  },

  /**
   * Get first element
   * Usage: {{first items}}
   */
  first: (value) => {
    if (Array.isArray(value)) return String(value[0] ?? '');
    return String(value);
  },

  /**
   * Get last element
   * Usage: {{last items}}
   */
  last: (value) => {
    if (Array.isArray(value)) return String(value[value.length - 1] ?? '');
    return String(value);
  },

  /**
   * Join array
   * Usage: {{join items ", "}}
   */
  join: (value, separator = ', ') => {
    if (Array.isArray(value)) {
      return value.map(String).join(String(separator));
    }
    return String(value);
  },

  /**
   * Sort array
   * Usage: {{sort items}}
   */
  sort: (value) => {
    if (Array.isArray(value)) {
      return [...value].sort().map(String).join(', ');
    }
    return String(value);
  },

  /**
   * Reverse array/string
   * Usage: {{reverse items}}
   */
  reverse: (value) => {
    if (Array.isArray(value)) {
      return [...value].reverse().map(String).join(', ');
    }
    return String(value).split('').reverse().join('');
  },

  // =========================================================================
  // Comparison Helpers
  // =========================================================================

  /**
   * Check equality
   * Usage: {{#if (eq a b)}}...{{/if}}
   */
  eq: (a, b) => String(a === b),

  /**
   * Check inequality
   * Usage: {{#if (ne a b)}}...{{/if}}
   */
  ne: (a, b) => String(a !== b),

  /**
   * Less than
   * Usage: {{#if (lt a b)}}...{{/if}}
   */
  lt: (a, b) => String(Number(a) < Number(b)),

  /**
   * Less than or equal
   * Usage: {{#if (lte a b)}}...{{/if}}
   */
  lte: (a, b) => String(Number(a) <= Number(b)),

  /**
   * Greater than
   * Usage: {{#if (gt a b)}}...{{/if}}
   */
  gt: (a, b) => String(Number(a) > Number(b)),

  /**
   * Greater than or equal
   * Usage: {{#if (gte a b)}}...{{/if}}
   */
  gte: (a, b) => String(Number(a) >= Number(b)),

  /**
   * Check if value is in array
   * Usage: {{#if (includes items "value")}}...{{/if}}
   */
  includes: (arr, value) => {
    if (Array.isArray(arr)) {
      return String(arr.includes(value));
    }
    return String(String(arr).includes(String(value)));
  },

  // =========================================================================
  // Conditional Helpers
  // =========================================================================

  /**
   * Ternary operator
   * Usage: {{ternary condition "yes" "no"}}
   */
  ternary: (condition, ifTrue, ifFalse) => {
    return condition ? String(ifTrue) : String(ifFalse ?? '');
  },

  /**
   * Default value
   * Usage: {{default value "fallback"}}
   */
  default: (value, defaultValue) => {
    if (value === null || value === undefined || value === '') {
      return String(defaultValue ?? '');
    }
    return String(value);
  },

  /**
   * Coalesce (first non-null value)
   * Usage: {{coalesce a b c}}
   */
  coalesce: (...values) => {
    for (const value of values) {
      if (value !== null && value !== undefined && value !== '') {
        return String(value);
      }
    }
    return '';
  },

  // =========================================================================
  // URL/Link Helpers
  // =========================================================================

  /**
   * URL encode
   * Usage: {{urlencode value}}
   */
  urlencode: (value) => encodeURIComponent(String(value ?? '')),

  /**
   * URL decode
   * Usage: {{urldecode value}}
   */
  urldecode: (value) => decodeURIComponent(String(value ?? '')),

  /**
   * Build query string
   * Usage: {{querystring params}}
   */
  querystring: (value) => {
    if (typeof value !== 'object' || value === null) return '';
    return new URLSearchParams(value as Record<string, string>).toString();
  },

  /**
   * Create mailto link
   * Usage: {{mailto email "Subject"}}
   */
  mailto: (email, subject) => {
    let href = `mailto:${encodeURIComponent(String(email))}`;
    if (subject) {
      href += `?subject=${encodeURIComponent(String(subject))}`;
    }
    return href;
  },

  // =========================================================================
  // HTML Helpers
  // =========================================================================

  /**
   * Escape HTML
   * Usage: {{escapeHtml content}}
   */
  escapeHtml: (value) => {
    const str = String(value ?? '');
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
    };
    return str.replace(/[&<>"']/g, (char) => htmlEscapes[char] ?? char);
  },

  /**
   * Strip HTML tags
   * Usage: {{stripHtml content}}
   */
  stripHtml: (value) => {
    return String(value ?? '').replace(/<[^>]*>/g, '');
  },

  /**
   * Convert newlines to <br>
   * Usage: {{nl2br content}}
   */
  nl2br: (value) => {
    return String(value ?? '').replace(/\n/g, '<br>');
  },

  /**
   * Safe HTML (mark as trusted)
   * Usage: {{{safeHtml content}}}
   */
  safeHtml: (value) => String(value ?? ''),

  // =========================================================================
  // Math Helpers
  // =========================================================================

  /**
   * Add numbers
   * Usage: {{add a b}}
   */
  add: (a, b) => String(Number(a) + Number(b)),

  /**
   * Subtract numbers
   * Usage: {{subtract a b}}
   */
  subtract: (a, b) => String(Number(a) - Number(b)),

  /**
   * Multiply numbers
   * Usage: {{multiply a b}}
   */
  multiply: (a, b) => String(Number(a) * Number(b)),

  /**
   * Divide numbers
   * Usage: {{divide a b}}
   */
  divide: (a, b) => {
    const divisor = Number(b);
    if (divisor === 0) return 'NaN';
    return String(Number(a) / divisor);
  },

  /**
   * Modulo
   * Usage: {{mod a b}}
   */
  mod: (a, b) => String(Number(a) % Number(b)),

  /**
   * Absolute value
   * Usage: {{abs value}}
   */
  abs: (value) => String(Math.abs(Number(value))),

  /**
   * Minimum value
   * Usage: {{min a b c}}
   */
  min: (...values) => String(Math.min(...values.map(Number))),

  /**
   * Maximum value
   * Usage: {{max a b c}}
   */
  max: (...values) => String(Math.max(...values.map(Number))),

  // =========================================================================
  // JSON Helpers
  // =========================================================================

  /**
   * JSON stringify
   * Usage: {{json data}}
   */
  json: (value, spaces = 0) => {
    try {
      return JSON.stringify(value, null, Number(spaces));
    } catch {
      return String(value);
    }
  },

  /**
   * Pretty print JSON
   * Usage: {{prettyJson data}}
   */
  prettyJson: (value) => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  },
};

/**
 * Register a custom helper
 */
export function registerHelper(name: string, fn: TemplateHelper): void {
  templateHelpers[name] = fn;
}

/**
 * Get a helper by name
 */
export function getHelper(name: string): TemplateHelper | undefined {
  return templateHelpers[name];
}

/**
 * List all available helpers
 */
export function listHelpers(): string[] {
  return Object.keys(templateHelpers);
}
