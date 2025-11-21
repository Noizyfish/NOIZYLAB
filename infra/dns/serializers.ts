/**
 * DNS configuration serialization utilities
 * @module serializers
 */

import type { ZoneConfig, DnsRecord, ProviderHint } from './types.js';
import {
  isARecord,
  isAAAARecord,
  isCNAMERecord,
  isMXRecord,
  isTXTRecord,
  isNSRecord,
  isSRVRecord,
  isCAARecord,
} from './types.js';

export function toZoneFile(config: ZoneConfig): string {
  const lines: string[] = [];
  const serial = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  
  lines.push(';; Zone file for ' + config.zone);
  lines.push(';; Generated: ' + new Date().toISOString());
  lines.push('');
  lines.push('$ORIGIN ' + config.zone + '.');
  lines.push('$TTL ' + (config.defaultTtl || 3600));
  lines.push('');
  lines.push('@ IN SOA ns1.' + config.zone + '. admin.' + config.zone + '. (');
  lines.push('    ' + serial + ' ; serial');
  lines.push('    7200       ; refresh (2 hours)');
  lines.push('    3600       ; retry (1 hour)');
  lines.push('    1209600    ; expire (2 weeks)');
  lines.push('    86400      ; minimum (1 day)');
  lines.push(')');
  lines.push('');

  for (const record of config.records) {
    const recordLines = recordToZoneFileLines(record, config.defaultTtl || 3600);
    lines.push(...recordLines);
  }

  return lines.join('\n') + '\n';
}

function recordToZoneFileLines(record: DnsRecord, defaultTtl: number): string[] {
  const ttl = record.ttl ?? defaultTtl;
  const name = record.name === '@' ? '@' : record.name;
  const comment = record.comment ? ' ; ' + record.comment : '';

  if (isARecord(record)) {
    return [name.padEnd(20) + ' ' + ttl.toString().padEnd(8) + ' IN A     ' + record.value + comment];
  } else if (isAAAARecord(record)) {
    return [name.padEnd(20) + ' ' + ttl.toString().padEnd(8) + ' IN AAAA  ' + record.value + comment];
  } else if (isCNAMERecord(record)) {
    return [name.padEnd(20) + ' ' + ttl.toString().padEnd(8) + ' IN CNAME ' + record.target + comment];
  } else if (isMXRecord(record)) {
    return [name.padEnd(20) + ' ' + ttl.toString().padEnd(8) + ' IN MX    ' + record.priority + ' ' + record.target + comment];
  } else if (isTXTRecord(record)) {
    return [name.padEnd(20) + ' ' + ttl.toString().padEnd(8) + ' IN TXT   "' + record.value + '"' + comment];
  } else if (isNSRecord(record)) {
    return [name.padEnd(20) + ' ' + ttl.toString().padEnd(8) + ' IN NS    ' + record.target + comment];
  } else if (isSRVRecord(record)) {
    const srv = record.priority + ' ' + record.weight + ' ' + record.port + ' ' + record.target;
    return [name.padEnd(20) + ' ' + ttl.toString().padEnd(8) + ' IN SRV   ' + srv + comment];
  } else if (isCAARecord(record)) {
    const caa = record.flags + ' ' + record.tag + ' "' + record.value + '"';
    return [name.padEnd(20) + ' ' + ttl.toString().padEnd(8) + ' IN CAA   ' + caa + comment];
  }

  return [];
}

export function toHumanReadable(config: ZoneConfig): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('+----------------------------------------------------------------+');
  lines.push('|  DNS Configuration: ' + config.zone.padEnd(43) + '|');
  lines.push('+----------------------------------------------------------------+');
  lines.push('|  Default TTL: ' + (config.defaultTtl || 3600).toString().padEnd(48) + '|');
  lines.push('|  Records: ' + config.records.length.toString().padEnd(52) + '|');
  if (config.providerHint) {
    lines.push('|  Provider: ' + config.providerHint.padEnd(51) + '|');
  }
  lines.push('+----------------------------------------------------------------+');
  lines.push('');
  lines.push('+----------+-----------------+-----+----------------------------------------+');
  lines.push('| Type     | Name            | TTL | Value                                  |');
  lines.push('+----------+-----------------+-----+----------------------------------------+');

  for (const record of config.records) {
    const type = record.type.padEnd(8);
    const name = record.name.substring(0, 15).padEnd(15);
    const ttl = (record.ttl || config.defaultTtl || 3600).toString().padEnd(4);
    const value = formatRecordValue(record).substring(0, 38).padEnd(38);
    lines.push('| ' + type + ' | ' + name + ' | ' + ttl + ' | ' + value + ' |');
  }

  lines.push('+----------+-----------------+-----+----------------------------------------+');
  return lines.join('\n');
}

function formatRecordValue(record: DnsRecord): string {
  if (isARecord(record) || isAAAARecord(record) || isTXTRecord(record)) {
    return record.value;
  } else if (isCNAMERecord(record) || isNSRecord(record)) {
    return record.target;
  } else if (isMXRecord(record)) {
    return record.priority + ' ' + record.target;
  } else if (isSRVRecord(record)) {
    return record.priority + ' ' + record.weight + ' ' + record.port + ' ' + record.target;
  } else if (isCAARecord(record)) {
    return record.flags + ' ' + record.tag + ' ' + record.value;
  }
  return '';
}

interface CloudflareRecord {
  type: string;
  name: string;
  content: string;
  ttl: number;
  priority?: number;
}

interface GoDaddyRecord {
  type: string;
  name: string;
  data: string;
  ttl: number;
  priority?: number;
  weight?: number;
  port?: number;
}

export function toProviderPayload(
  config: ZoneConfig,
  provider: ProviderHint
): CloudflareRecord[] | GoDaddyRecord[] | DnsRecord[] {
  if (provider === 'cloudflare') {
    return toCloudflarePayload(config);
  } else if (provider === 'godaddy') {
    return toGoDaddyPayload(config);
  } else {
    return config.records;
  }
}

function toCloudflarePayload(config: ZoneConfig): CloudflareRecord[] {
  return config.records.map((record) => {
    const fullName = record.name === '@' ? config.zone : record.name + '.' + config.zone;
    const base = {
      type: record.type,
      name: fullName,
      ttl: record.ttl || config.defaultTtl || 3600,
    };

    if (isARecord(record) || isAAAARecord(record) || isTXTRecord(record)) {
      return { ...base, content: record.value };
    } else if (isCNAMERecord(record) || isNSRecord(record)) {
      return { ...base, content: record.target };
    } else if (isMXRecord(record)) {
      return { ...base, content: record.target, priority: record.priority };
    } else if (isSRVRecord(record)) {
      return { ...base, content: record.priority + ' ' + record.weight + ' ' + record.port + ' ' + record.target };
    } else if (isCAARecord(record)) {
      return { ...base, content: record.flags + ' ' + record.tag + ' ' + record.value };
    }

    return { ...base, content: '' };
  });
}

function toGoDaddyPayload(config: ZoneConfig): GoDaddyRecord[] {
  return config.records.map((record) => {
    const base = {
      type: record.type,
      name: record.name === '@' ? '@' : record.name,
      ttl: record.ttl || config.defaultTtl || 3600,
    };

    if (isARecord(record) || isAAAARecord(record) || isTXTRecord(record)) {
      return { ...base, data: record.value };
    } else if (isCNAMERecord(record) || isNSRecord(record)) {
      return { ...base, data: record.target };
    } else if (isMXRecord(record)) {
      return { ...base, data: record.target, priority: record.priority };
    } else if (isSRVRecord(record)) {
      return {
        ...base,
        data: record.target,
        priority: record.priority,
        weight: record.weight,
        port: record.port,
      };
    } else if (isCAARecord(record)) {
      return { ...base, data: record.flags + ' ' + record.tag + ' ' + record.value };
    }

    return { ...base, data: '' };
  });
}
