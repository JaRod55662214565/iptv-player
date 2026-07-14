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
  else if (name.includes('iphone') || name.includes('ipad') || name.includes('ipod')) os = 'iOS';
  else if (name.includes('mac os') || name.includes('macintosh')) os = 'macOS';
  else if (name.includes('linux') && !name.includes('android')) os = 'Linux';
  else if (name.includes('android')) os = 'Android';
  return { browser, os };
}

export function parseUADetailed(ua, headers) {
  const name = (ua || '').toLowerCase();
  let browser = 'Unknown', browserVersion = '';
  let engine = 'Unknown', engineVersion = '';
  let platform = 'Unknown', platformVersion = '';

  const edgeM = ua?.match(/Edg\/([\d.]+)/);
  const operaM = ua?.match(/(?:OPR|Opera)\/([\d.]+)/);
  const chromeM = ua?.match(/Chrome\/([\d.]+)/);
  const firefoxM = ua?.match(/Firefox\/([\d.]+)/);
  const safariM = ua?.match(/Version\/([\d.]+).*Safari/);
  if (edgeM) { browser = 'Edge'; browserVersion = edgeM[1]; }
  else if (operaM) { browser = 'Opera'; browserVersion = operaM[1]; }
  else if (chromeM) { browser = 'Chrome'; browserVersion = chromeM[1]; }
  else if (firefoxM) { browser = 'Firefox'; browserVersion = firefoxM[1]; }
  else if (safariM) { browser = 'Safari'; browserVersion = safariM[1]; }

  const webkitM = ua?.match(/AppleWebKit\/([\d.]+)/);
  const geckoM = ua?.match(/Gecko\/[\d\/]+ Firefox/);
  if (webkitM) { engine = 'WebKit'; engineVersion = webkitM[1]; }
  else if (geckoM) { engine = 'Gecko'; engineVersion = ''; }

  const winM = ua?.match(/Windows NT ([\d.]+)/);
  const macM = ua?.match(/Mac OS X ([\d._]+)/);
  const androidM = ua?.match(/Android ([\d.]+)/);
  const iosM = ua?.match(/OS ([\d_]+) like Mac OS X/);
  if (winM) {
    const v = winM[1];
    const map = { '10.0': '10', '6.3': '8.1', '6.2': '8', '6.1': '7', '6.0': 'Vista' };
    platform = 'Windows'; platformVersion = map[v] || v;
  } else if (macM) { platform = 'macOS'; platformVersion = macM[1].replace(/_/g, '.'); }
  else if (androidM) { platform = 'Android'; platformVersion = androidM[1]; }
  else if (iosM) { platform = 'iOS'; platformVersion = iosM[1].replace(/_/g, '.'); }
  else if (name.includes('linux')) { platform = 'Linux'; platformVersion = ''; }

  const isMobile = /mobile|android|iphone|ipod/i.test(name);

  const acceptLang = headers?.['accept-language'] || '';
  const languages = acceptLang.split(',')
    .map(l => l.split(';')[0].trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 5);

  return { browser, browserVersion, engine, engineVersion, platform, platformVersion, isMobile, languages };
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

export function isBlockedASN(asn) {
  if (!asn) return false;
  return state.BLOCKED_ASN.has(String(asn));
}

export function safeParse(body) {
  try { return { ok: true, data: JSON.parse(body || '{}') }; }
  catch { return { ok: false, data: null }; }
}

export function badJson(res) {
  res.writeHead(400, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'JSON invalide' }));
}
