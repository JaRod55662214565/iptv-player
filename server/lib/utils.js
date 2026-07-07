import crypto from 'node:crypto';
import ipaddr from 'ipaddr.js';
import { state } from '../state.js';

export function escapeHTML(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function isPrivateIP(ip) {
  try {
    const addr = ipaddr.parse(ip);
    const blocked = ['loopback', 'private', 'linkLocal', 'carrierGradeNat', 'uniqueLocal', 'unspecified', 'reserved'];
    return blocked.includes(addr.range());
  } catch {
    return true;
  }
}

export function checkRateLimit(map, key, maxAttempts, windowMs) {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxAttempts) return false;
  entry.count++;
  return true;
}

export function ipToInt(ip) {
  try { return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0; }
  catch { return 0; }
}

export function cidrToRange(cidr) {
  try {
    const [base, bits] = cidr.split('/');
    const bitsNum = parseInt(bits, 10);
    if (!bitsNum || bitsNum < 1 || bitsNum > 32) return null;
    const mask = ~(2 ** (32 - bitsNum) - 1);
    const ipInt = ipToInt(base);
    if (!ipInt) return null;
    return { start: ipInt & mask, end: ipInt | (~mask >>> 0) };
  } catch { return null; }
}

export function isInVPNRange(ip) {
  const ipInt = ipToInt(ip);
  if (!ipInt) return false;
  for (const range of state.VPN_RANGES) {
    if (ipInt >= range.start && ipInt <= range.end) return true;
  }
  return false;
}

export function parseUA(ua) {
  const name = (ua || '').toLowerCase();
  let browser = 'Unknown', os = 'Unknown';
  if (name.includes('edg/')) browser = 'Edge';
  else if (name.includes('chrome') && !name.includes('edg')) browser = 'Chrome';
  else if (name.includes('safari') && !name.includes('chrome')) browser = 'Safari';
  else if (name.includes('firefox')) browser = 'Firefox';
  else if (name.includes('opera') || name.includes('opr')) browser = 'Opera';
  if (name.includes('windows')) os = 'Windows';
  else if (name.includes('mac os') || name.includes('macintosh')) os = 'macOS';
  else if (name.includes('linux') && !name.includes('android')) os = 'Linux';
  else if (name.includes('android')) os = 'Android';
  else if (name.includes('iphone') || name.includes('ipad')) os = 'iOS';
  return { browser, os };
}

export function detectDeviceType(ua) {
  const name = (ua || '').toLowerCase();
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/.test(name)) return 'mobile';
  if (/ipad|tablet|playbook|silk|kindle/.test(name)) return 'tablette';
  return 'desktop';
}

export function generateSessionID() {
  return crypto.randomBytes(8).toString('hex');
}

export function getClientIP(req) {
  const cfIP = req.headers['cf-connecting-ip'];
  const forwarded = req.headers['x-forwarded-for'];
  if (cfIP) return cfIP.split(',')[0].trim();
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress?.replace(/^::ffff:/, '') || 'unknown';
}

export function parseLimit(str) {
  const n = parseInt(str, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 200) : 50;
}

export function isBanned(ip) {
  return state.BANS_LOOKUP.has(ip);
}
