import { describe, it, expect } from 'vitest';
import {
  escapeHTML,
  isPrivateIP,
  checkRateLimit,
  ipToInt,
  cidrToRange,
  parseUA,
  parseUADetailed,
  detectDeviceType,
  parseLimit,
  safeParse,
  generateSessionID,
} from '../server/lib/utils.js';

describe('escapeHTML', () => {
  it('escapes HTML entities', () => {
    expect(escapeHTML('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });
  it('returns empty for non-string', () => {
    expect(escapeHTML(null)).toBe('');
    expect(escapeHTML(123)).toBe('');
    expect(escapeHTML(undefined)).toBe('');
  });
  it('leaves safe strings unchanged', () => {
    expect(escapeHTML('hello world')).toBe('hello world');
  });
  it('escapes ampersand', () => {
    expect(escapeHTML('a&b')).toBe('a&amp;b');
  });
});

describe('isPrivateIP', () => {
  it('returns true for loopback', () => {
    expect(isPrivateIP('127.0.0.1')).toBe(true);
    expect(isPrivateIP('::1')).toBe(true);
  });
  it('returns true for private ranges', () => {
    expect(isPrivateIP('10.0.0.1')).toBe(true);
    expect(isPrivateIP('192.168.1.1')).toBe(true);
    expect(isPrivateIP('172.16.0.1')).toBe(true);
  });
  it('returns false for public IPs', () => {
    expect(isPrivateIP('8.8.8.8')).toBe(false);
    expect(isPrivateIP('1.1.1.1')).toBe(false);
  });
  it('returns true for invalid input', () => {
    expect(isPrivateIP('not-an-ip')).toBe(true);
    expect(isPrivateIP('')).toBe(true);
  });
});

describe('checkRateLimit', () => {
  it('allows requests within limit', () => {
    const map = new Map();
    expect(checkRateLimit(map, 'key', 3, 60000)).toBe(true);
    expect(checkRateLimit(map, 'key', 3, 60000)).toBe(true);
    expect(checkRateLimit(map, 'key', 3, 60000)).toBe(true);
  });
  it('blocks requests exceeding limit', () => {
    const map = new Map();
    checkRateLimit(map, 'key', 2, 60000);
    checkRateLimit(map, 'key', 2, 60000);
    expect(checkRateLimit(map, 'key', 2, 60000)).toBe(false);
  });
  it('resets after window expires', () => {
    const map = new Map();
    checkRateLimit(map, 'key', 1, 1);
    expect(checkRateLimit(map, 'key', 1, 1)).toBe(false);
    // wait for window to expire
    const start = Date.now();
    while (Date.now() - start < 5) {}
    expect(checkRateLimit(map, 'key', 1, 1)).toBe(true);
  });
  it('tracks different keys independently', () => {
    const map = new Map();
    checkRateLimit(map, 'a', 1, 60000);
    expect(checkRateLimit(map, 'a', 1, 60000)).toBe(false);
    expect(checkRateLimit(map, 'b', 1, 60000)).toBe(true);
  });
});

describe('ipToInt', () => {
  it('converts IP to integer', () => {
    expect(ipToInt('0.0.0.0')).toBe(0);
    expect(ipToInt('255.255.255.255')).toBe(4294967295);
    expect(ipToInt('192.168.1.1')).toBe(3232235777);
  });
  it('returns 0 for invalid input', () => {
    expect(ipToInt('invalid')).toBe(0);
    expect(ipToInt('')).toBe(0);
  });
});

describe('cidrToRange', () => {
  it('converts /24 CIDR', () => {
    const r = cidrToRange('192.168.1.0/24');
    expect(r).not.toBeNull();
    expect(r.start >>> 0).toBe(3232235776);
    expect(r.end >>> 0).toBe(3232236031);
  });
  it('returns null for invalid CIDR', () => {
    expect(cidrToRange('invalid')).toBeNull();
    expect(cidrToRange('192.168.1.0/33')).toBeNull();
    expect(cidrToRange('192.168.1.0/0')).toBeNull();
  });
});

describe('parseUA', () => {
  it('detects Chrome on Windows', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const r = parseUA(ua);
    expect(r.browser).toBe('Chrome');
    expect(r.os).toBe('Windows');
  });
  it('detects Safari on macOS', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
    const r = parseUA(ua);
    expect(r.browser).toBe('Safari');
    expect(r.os).toBe('macOS');
  });
  it('detects Firefox on Linux', () => {
    const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0';
    const r = parseUA(ua);
    expect(r.browser).toBe('Firefox');
    expect(r.os).toBe('Linux');
  });
  it('detects Edge', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
    const r = parseUA(ua);
    expect(r.browser).toBe('Edge');
  });
  it('detects Android', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
    const r = parseUA(ua);
    expect(r.os).toBe('Android');
  });
  it('detects iOS', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    const r = parseUA(ua);
    expect(r.os).toBe('iOS');
  });
  it('returns Unknown for empty input', () => {
    const r = parseUA('');
    expect(r.browser).toBe('Unknown');
    expect(r.os).toBe('Unknown');
  });
});

describe('parseUADetailed', () => {
  it('parses Chrome UA with versions', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.130 Safari/537.36';
    const r = parseUADetailed(ua, {});
    expect(r.browser).toBe('Chrome');
    expect(r.browserVersion).toBe('120.0.6099.130');
    expect(r.engine).toBe('WebKit');
    expect(r.platform).toBe('Windows');
    expect(r.isMobile).toBe(false);
  });
  it('parses Firefox UA', () => {
    const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0';
    const r = parseUADetailed(ua, {});
    expect(r.browser).toBe('Firefox');
    expect(r.engine).toBe('Gecko');
    expect(r.platform).toBe('Linux');
  });
  it('parses mobile UA', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    const r = parseUADetailed(ua, {});
    expect(r.isMobile).toBe(true);
    expect(r.platform).toBe('iOS');
  });
  it('parses Accept-Language header', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
    const headers = { 'accept-language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7' };
    const r = parseUADetailed(ua, headers);
    expect(r.languages).toEqual(['fr-fr', 'fr', 'en-us', 'en']);
  });
  it('limits languages to 5', () => {
    const headers = { 'accept-language': 'a,b,c,d,e,f,g' };
    const r = parseUADetailed('', headers);
    expect(r.languages).toHaveLength(5);
  });
  it('handles empty input', () => {
    const r = parseUADetailed('', {});
    expect(r.browser).toBe('Unknown');
    expect(r.platform).toBe('Unknown');
    expect(r.isMobile).toBe(false);
    expect(r.languages).toEqual([]);
  });
});

describe('detectDeviceType', () => {
  it('detects mobile', () => {
    expect(detectDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe('mobile');
    expect(detectDeviceType('Mozilla/5.0 (Linux; Android 14)')).toBe('mobile');
  });
  it('detects tablet', () => {
    expect(detectDeviceType('Mozilla/5.0 (iPad; CPU OS 17_0)')).toBe('tablette');
  });
  it('detects desktop', () => {
    expect(detectDeviceType('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
  });
  it('defaults to desktop for empty', () => {
    expect(detectDeviceType('')).toBe('desktop');
  });
});

describe('parseLimit', () => {
  it('parses valid number', () => {
    expect(parseLimit('10')).toBe(10);
  });
  it('caps at 200', () => {
    expect(parseLimit('500')).toBe(200);
  });
  it('returns 50 for invalid', () => {
    expect(parseLimit('abc')).toBe(50);
    expect(parseLimit('')).toBe(50);
    expect(parseLimit('0')).toBe(50);
    expect(parseLimit('-1')).toBe(50);
  });
});

describe('safeParse', () => {
  it('parses valid JSON', () => {
    const r = safeParse('{"a":1}');
    expect(r.ok).toBe(true);
    expect(r.data).toEqual({ a: 1 });
  });
  it('handles empty string', () => {
    const r = safeParse('');
    expect(r.ok).toBe(true);
    expect(r.data).toEqual({});
  });
  it('handles null/undefined', () => {
    const r = safeParse(null);
    expect(r.ok).toBe(true);
  });
  it('returns error for invalid JSON', () => {
    const r = safeParse('{invalid}');
    expect(r.ok).toBe(false);
    expect(r.data).toBeNull();
  });
});

describe('generateSessionID', () => {
  it('returns 16-char hex string', () => {
    const id = generateSessionID();
    expect(id).toHaveLength(16);
    expect(/^[0-9a-f]+$/.test(id)).toBe(true);
  });
  it('generates unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) ids.add(generateSessionID());
    expect(ids.size).toBe(100);
  });
});
