import crypto from 'node:crypto';
import { config } from '../config.js';
import { state, saveBans, saveWhitelist, savePremium } from '../state.js';
import { readJSON } from '../storage.js';
import { sendTelegram } from '../services/telegram.js';
import { escapeHTML, getClientIP, parseLimit, checkRateLimit } from '../lib/utils.js';

const adminGlobalLimits = new Map();

function isValidIP(ip) {
  if (!ip || typeof ip !== 'string') return false;
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^[0-9a-fA-F:]{2,39}$/;
  if (ipv4.test(ip)) {
    const parts = ip.split('.').map(Number);
    return parts.every(p => p >= 0 && p <= 255);
  }
  return ipv6.test(ip);
}

function handleAdminAuth(body, ip) {
  if (!body.password || typeof body.password !== 'string' || body.password.length < 1) {
    console.log(`[Admin] Echec connexion depuis ${ip} (mot de passe vide ou invalide)`);
    return { ok: false, error: 'Mot de passe incorrect' };
  }
  const pwd = (body.password || '').padEnd(64).slice(0, 64);
  const expected = (config.ADMIN_PASSWORD || '').padEnd(64).slice(0, 64);
  const a = Buffer.from(pwd);
  const b = Buffer.from(expected);
  const timingSafe = crypto.timingSafeEqual(a, b);
  const exact = (body.password || '') === (config.ADMIN_PASSWORD || '');
  if (timingSafe && exact) {
    const now = Date.now();
    const token = crypto.randomBytes(20).toString('hex');
    state.ADMIN_TOKEN = { token, iat: now, exp: now + config.ADMIN_TOKEN_EXPIRY_MS };
    console.log(`[Admin] Connexion reussie depuis ${ip}`);
    return { ok: true, token };
  }
  console.log(`[Admin] Echec connexion depuis ${ip}`);
  return { ok: false, error: 'Mot de passe incorrect' };
}

function verifyToken(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return false;
  const raw = auth.slice(7);
  if (!state.ADMIN_TOKEN || state.ADMIN_TOKEN.token !== raw) return false;
  if (Date.now() > state.ADMIN_TOKEN.exp) {
    state.ADMIN_TOKEN = null;
    return false;
  }
  return true;
}

function unauth(res) {
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Unauthorized' }));
}

export async function handleAdminRoutes(pathname, req, res, body, url) {
  if (!pathname.startsWith('/api/admin')) return false;

  // Rate limiting global sur tous les endpoints admin (30 req/60s par IP)
  const clientIPGlobal = getClientIP(req);
  if (pathname !== '/api/admin/auth') {
    if (!checkRateLimit(adminGlobalLimits, 'global_' + clientIPGlobal, 30, 60000)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Trop de requetes. Reessayez dans 60s.' }));
    }
  }

  if (pathname === '/api/admin/auth') {
    if (req.method !== 'POST') { res.writeHead(405); return res.end('Method not allowed'); }
    const clientIP = getClientIP(req);
    if (!checkRateLimit(state.loginAttempts, clientIP, 5, 60000)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Trop de tentatives. Reessayez dans 60s.' }));
    }
    const data = JSON.parse(body || '{}');
    const result = handleAdminAuth(data, clientIP);
    res.writeHead(result.ok ? 200 : 401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return true;
  }

  if (pathname === '/api/admin/logout') {
    if (req.method !== 'POST') { res.writeHead(405); return res.end('Method not allowed'); }
    if (!verifyToken(req)) return unauth(res);
    state.ADMIN_TOKEN = null;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return true;
  }

  if (pathname === '/api/admin/visits') {
    if (!verifyToken(req)) return unauth(res);
    const limit = parseLimit(url.searchParams.get('limit'));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(state.VISITS.slice(0, limit)));
    return true;
  }

  if (pathname === '/api/admin/bans') {
    if (!verifyToken(req)) return unauth(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(readJSON(config.BANS_FILE)));
    return true;
  }

  if (pathname === '/api/admin/ban') {
    if (!verifyToken(req)) return unauth(res);
    const data = JSON.parse(body || '{}');
    if (!data.ip || !isValidIP(data.ip)) { res.writeHead(400); return res.end(JSON.stringify({ error: 'IP invalide ou manquante' })); }
    const bans = readJSON(config.BANS_FILE);
    if (!bans.find(b => b.ip === data.ip)) {
      bans.push({ ip: data.ip, reason: data.reason || '', date: new Date().toISOString() });
      saveBans(bans);
      saveWhitelist(readJSON(config.WHITELIST_FILE).filter(ip => ip !== data.ip));
      await sendTelegram(`🚫 <b>IP BANNIE (Panel Admin)</b>\n📍 <b>IP:</b> <code>${escapeHTML(data.ip)}</code>\n💬 <b>Raison:</b> ${escapeHTML(data.reason || 'Aucune')}`);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, banned: data.ip }));
    return true;
  }

  if (pathname === '/api/admin/unban') {
    if (!verifyToken(req)) return unauth(res);
    const data = JSON.parse(body || '{}');
    if (!data.ip || !isValidIP(data.ip)) { res.writeHead(400); return res.end(JSON.stringify({ error: 'IP invalide ou manquante' })); }
    saveBans(readJSON(config.BANS_FILE).filter(b => b.ip !== data.ip));
    const whitelist = readJSON(config.WHITELIST_FILE);
    if (!whitelist.includes(data.ip)) {
      whitelist.push(data.ip);
      saveWhitelist(whitelist);
    }
    await sendTelegram(`✅ <b>IP DEBANNIE &amp; AUTORISÉE (Panel Admin)</b>\n📍 <b>IP:</b> <code>${escapeHTML(data.ip)}</code>`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, unbanned: data.ip }));
    return true;
  }

  if (pathname === '/api/admin/premiums') {
    if (!verifyToken(req)) return unauth(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(readJSON(config.PREMIUM_FILE)));
    return true;
  }

  if (pathname === '/api/admin/make-premium') {
    if (!verifyToken(req)) return unauth(res);
    const data = JSON.parse(body || '{}');
    if (!data.ip || !isValidIP(data.ip)) { res.writeHead(400); return res.end(JSON.stringify({ error: 'IP invalide ou manquante' })); }
    const list = readJSON(config.PREMIUM_FILE);
    if (!list.find(p => p.ip === data.ip)) {
      list.push({ ip: data.ip, date: new Date().toISOString() });
      savePremium(list);
      await sendTelegram(`💎 <b>IP PASSÉE PREMIUM (Panel Admin)</b>\n📍 <b>IP:</b> <code>${escapeHTML(data.ip)}</code>`);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, premium: data.ip }));
    return true;
  }

  if (pathname === '/api/admin/remove-premium') {
    if (!verifyToken(req)) return unauth(res);
    const data = JSON.parse(body || '{}');
    if (!data.ip || !isValidIP(data.ip)) { res.writeHead(400); return res.end(JSON.stringify({ error: 'IP invalide ou manquante' })); }
    savePremium(readJSON(config.PREMIUM_FILE).filter(p => p.ip !== data.ip));
    await sendTelegram(`⚠️ <b>IP RETIRÉE DU PREMIUM (Panel Admin)</b>\n📍 <b>IP:</b> <code>${escapeHTML(data.ip)}</code>`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, removed: data.ip }));
    return true;
  }

  if (pathname === '/api/admin/whitelist') {
    if (!verifyToken(req)) return unauth(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(readJSON(config.WHITELIST_FILE)));
    return true;
  }

  if (pathname === '/api/admin/remove-whitelist') {
    if (!verifyToken(req)) return unauth(res);
    const data = JSON.parse(body || '{}');
    if (!data.ip) { res.writeHead(400); return res.end(JSON.stringify({ error: 'IP required' })); }
    saveWhitelist(readJSON(config.WHITELIST_FILE).filter(ip => ip !== data.ip));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, removed: data.ip }));
    return true;
  }

  if (pathname === '/api/admin/kill-sessions') {
    if (!verifyToken(req)) return unauth(res);
    state.ADMIN_TOKEN = null;
    state.loginAttempts.clear();
    adminGlobalLimits.clear();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, message: 'Toutes les sessions ont été tuées.' }));
    return true;
  }

  if (pathname === '/api/admin/security-status') {
    if (!verifyToken(req)) return unauth(res);
    const attempts = [];
    for (const [ip, entry] of state.loginAttempts) {
      attempts.push({ ip, count: entry.count, resetAt: new Date(entry.resetAt).toISOString() });
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      activeSession: !!state.ADMIN_TOKEN,
      loginAttempts: attempts,
      whitelistCount: state.WHITELIST_LOOKUP.size,
      banCount: state.BANS_LOOKUP.size,
      premiumCount: state.PREMIUM_LOOKUP.size,
    }));
    return true;
  }

  if (pathname === '/api/admin/ads-stats') {
    if (!verifyToken(req)) return unauth(res);
    const limit = parseLimit(url.searchParams.get('limit'));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      total: state.ADS_DATA.total,
      today: state.ADS_DATA.today,
      todayDate: state.ADS_DATA.todayDate,
      impressions: state.ADS_DATA.impressions.slice(0, limit),
    }));
    return true;
  }

  return false;
}
