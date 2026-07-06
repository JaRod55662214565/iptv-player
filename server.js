import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import Stripe from 'stripe';


const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3001;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SITE_URL = process.env.SITE_URL || 'https://localhost';
const WEBHOOK_URL = process.env.WEBHOOK_URL || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  console.error('CRITICAL ERROR: ADMIN_PASSWORD environment variable is not defined!');
  process.exit(1);
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');


const DATA_DIR = path.join(__dirname, 'data');
const BANS_FILE = path.join(DATA_DIR, 'bans.json');
const WHITELIST_FILE = path.join(DATA_DIR, 'whitelist.json');
const PREMIUM_FILE = path.join(DATA_DIR, 'premium.json');
const VISITS_FILE = path.join(DATA_DIR, 'visits.json');
const BLOCKLIST_FILE = path.join(DATA_DIR, 'vpn-datacenter.txt');
const BLOCKLIST_URL = 'https://raw.githubusercontent.com/josephrocca/is-vpn/main/vpn-or-datacenter-ipv4-ranges.txt';
const ADS_FILE = path.join(DATA_DIR, 'ads.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

let writeLock = Promise.resolve();

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}
function writeJSON(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
  catch (e) { console.error('[FS] Erreur ecriture', file, e.message); }
}

async function serializeWrite(fn) {
  writeLock = writeLock.then(fn, fn);
  return writeLock;
}

const VISITS = readJSON(VISITS_FILE);
const BANS_LOOKUP = new Set();
const WHITELIST_LOOKUP = new Set();
const PREMIUM_LOOKUP = new Set();
const telegramNotifyCache = new Map();
const channelNotifyCache = new Map();
let VPN_RANGES = [];
let PENDING_AD_PUSH = 0; // timestamp du push ad, 0 = aucun

function loadBans() {
  BANS_LOOKUP.clear();
  const bans = readJSON(BANS_FILE);
  for (const b of bans) BANS_LOOKUP.add(b.ip);
  return bans;
}
function saveBans(bans) {
  writeJSON(BANS_FILE, bans);
  loadBans();
}
loadBans();

function loadWhitelist() {
  WHITELIST_LOOKUP.clear();
  const list = readJSON(WHITELIST_FILE);
  for (const ip of list) WHITELIST_LOOKUP.add(ip);
  return list;
}
function saveWhitelist(list) {
  writeJSON(WHITELIST_FILE, list);
  loadWhitelist();
}
loadWhitelist();


function loadPremium() {
  PREMIUM_LOOKUP.clear();
  const list = readJSON(PREMIUM_FILE);
  for (const p of list) PREMIUM_LOOKUP.add(p.ip);
  return list;
}
function savePremium(list) {
  writeJSON(PREMIUM_FILE, list);
  loadPremium();
}
loadPremium();

let ADS_DATA = readJSON(ADS_FILE);
if (!ADS_DATA || typeof ADS_DATA.total !== 'number') {
  ADS_DATA = { total: 0, today: 0, todayDate: '', impressions: [] };
}
function saveAds() {
  writeJSON(ADS_FILE, ADS_DATA);
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}
function resetTodayIfNeeded() {
  const today = getTodayStr();
  if (ADS_DATA.todayDate !== today) {
    ADS_DATA.today = 0;
    ADS_DATA.todayDate = today;
    saveAds();
  }
}

function ipToInt(ip) {
  try { return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0; }
  catch { return 0; }
}
function cidrToRange(cidr) {
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
function isInVPNRange(ip) {
  const ipInt = ipToInt(ip);
  if (!ipInt) return false;
  for (const range of VPN_RANGES) {
    if (ipInt >= range.start && ipInt <= range.end) return true;
  }
  return false;
}
function isBanned(ip) {
  return BANS_LOOKUP.has(ip);
}

async function registerTelegramWebhook() {
  if (!BOT_TOKEN || !WEBHOOK_URL) {
    console.log('[Telegram] Webhook registration skipped (WEBHOOK_URL not set)');
    return;
  }
  const webhookUrl = `${WEBHOOK_URL}/api/telegram-webhook`;
  try {
    const resp = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await resp.json();
    if (data.ok) {
      console.log('[Telegram] Webhook registered:', webhookUrl);
    } else {
      console.error('[Telegram] Webhook registration failed:', data);
    }
  } catch (e) {
    console.error('[Telegram] Webhook registration error:', e.message);
  }

  // Enregistrer les commandes du bot
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'ip', description: 'Interroger une IP (ex: /ip 1.2.3.4)' },
        ],
      }),
    });
    console.log('[Telegram] Bot commands registered');
  } catch (e) {
    console.error('[Telegram] Bot commands registration error:', e.message);
  }
}

async function downloadBlocklist() {
  try {
    const resp = await fetch(BLOCKLIST_URL, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    fs.writeFileSync(BLOCKLIST_FILE, text);
    VPN_RANGES = text.trim().split('\n')
      .filter(l => l && !l.startsWith('#'))
      .map(cidrToRange)
      .filter(Boolean);
    console.log(`[VPN] Blocklist chargee: ${VPN_RANGES.length} plages CIDR`);
  } catch (e) {
    console.error('[VPN] Echec telechargement blocklist:', e.message);
    if (fs.existsSync(BLOCKLIST_FILE)) {
      const text = fs.readFileSync(BLOCKLIST_FILE, 'utf8');
      VPN_RANGES = text.trim().split('\n')
        .filter(l => l && !l.startsWith('#'))
        .map(cidrToRange)
        .filter(Boolean);
      console.log(`[VPN] Blocklist depuis cache: ${VPN_RANGES.length} plages`);
    }
  }
}

function escapeHTML(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function countryFlag(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '';
  try {
    const points = [...countryCode.toUpperCase()].map(c => {
      const code = c.charCodeAt(0);
      if (code < 65 || code > 90) throw new Error();
      return 0x1F1E6 + code - 65;
    });
    return String.fromCodePoint(...points);
  } catch { return ''; }
}

async function lookupIP(ip) {
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return { ip, country: 'Local', isp: 'Localhost', isProxy: false, isHosting: false, isMobile: false };
  }
  try {
    const resp = await fetch(`http://ip-api.com/json/${ip}?fields=status,query,isp,org,country,countryCode,city,regionName,proxy,hosting,mobile`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return { ip, country: 'Unknown', isp: 'Unknown' };
    const data = await resp.json();
    if (data.status !== 'success') return { ip, country: 'Unknown', isp: 'Unknown' };
    return {
      ip: data.query,
      country: escapeHTML(data.country || 'Unknown'),
      countryCode: data.countryCode || '',
      city: escapeHTML(data.city || ''),
      region: escapeHTML(data.regionName || ''),
      isp: escapeHTML(data.isp || data.org || 'Unknown'),
      isProxy: !!data.proxy,
      isHosting: !!data.hosting,
      isMobile: !!data.mobile,
    };
  } catch {
    return { ip, country: 'Unknown', isp: 'Unknown' };
  }
}

function parseUA(ua) {
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

function detectDeviceType(ua) {
  const name = (ua || '').toLowerCase();
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/.test(name)) return 'mobile';
  if (/ipad|tablet|playbook|silk|kindle/.test(name)) return 'tablette';
  return 'desktop';
}

async function sendTelegram(text, ip) {
  if (!BOT_TOKEN || !CHAT_ID) return;
  try {
    const reply_markup = {
      inline_keyboard: [[], []]
    };
    const row1 = [];
    if (ip) {
      row1.push({ text: '🔓 Debloquer', callback_data: `unban_${ip}` });
      row1.push({ text: '💎 Premium', callback_data: `premium_${ip}` });
    }
    row1.push({ text: '🔐 Panel', url: `${SITE_URL}/panel` });
    reply_markup.inline_keyboard[0] = row1;

    const row2 = [{ text: '📢 Push Ad', callback_data: 'push_ad' }];
    reply_markup.inline_keyboard[1] = row2;

    const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup,
      }),
    });
    if (!resp.ok) console.error('[Telegram] Erreur:', await resp.text());
    else console.log('[Telegram] Notification envoyee');
  } catch (e) {
    console.error('[Telegram] Erreur:', e.message);
  }
}

function generateSessionID() {
  return crypto.randomBytes(8).toString('hex');
}

function getClientIP(req) {
  const cfIP = req.headers['cf-connecting-ip'];
  const forwarded = req.headers['x-forwarded-for'];
  if (cfIP) return cfIP.split(',')[0].trim();
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress?.replace(/^::ffff:/, '') || 'unknown';
}

async function handleVisit(req, body) {
  const clientIP = getClientIP(req);
  const ua = req.headers['user-agent'] || '';
  const referrer = escapeHTML(req.headers['referer'] || 'Direct');
  const { browser, os } = parseUA(ua);
  const deviceType = detectDeviceType(ua);
  const isTouch = req.headers['sec-ch-ua-mobile'] === '?1' || false;

  const ipInfo = await lookupIP(clientIP);
  const isWhitelisted = WHITELIST_LOOKUP.has(clientIP);
  const isDatacenter = !isWhitelisted && (ipInfo.isHosting || isInVPNRange(clientIP));
  const isBannedIP = !isWhitelisted && isBanned(clientIP);

  const session = {
    id: generateSessionID(),
    ip: clientIP,
    browser, os, deviceType, isTouch,
    referrer,
    isp: ipInfo.isp,
    country: ipInfo.country,
    countryCode: ipInfo.countryCode,
    city: ipInfo.city,
    region: ipInfo.region,
    isProxy: !isWhitelisted && ipInfo.isProxy,
    isDatacenter,
    isBanned: isBannedIP,
    siteUrl: body.siteUrl || SITE_URL,
    channelName: body.channelName || '',
    streamUrl: body.streamUrl || '',
    timestamp: new Date().toISOString(),
  };


  const existingSession = VISITS.find(v => v.ip === clientIP);

  await serializeWrite(() => {
    VISITS.unshift(session);
    if (VISITS.length > 200) VISITS.length = 200;
    writeJSON(VISITS_FILE, VISITS);
  });

  const statusIcon = session.isBanned ? '🚫' : session.isDatacenter ? '🤖' : session.isProxy ? '⚠️' : '✅';
  const statusLabel = session.isBanned ? 'Banned' : session.isDatacenter ? 'Bot/DC' : session.isProxy ? 'Proxy' : 'Human visitor';

  const clientHeader = existingSession 
    ? `🆔 Client Already Exists\n  ↳ <code>${escapeHTML(existingSession.id)}</code>`
    : `🆔 New Client\n  ↳ <code>${escapeHTML(session.id)}</code>`;

  const msg = [
    clientHeader,
    `${statusIcon} <b>Status:</b> ${escapeHTML(statusLabel)}`,
    `📍 <b>IP:</b> <code>${escapeHTML(session.ip)}</code>`,
    `🌍 <b>Country:</b> ${session.countryCode || ''}`,
    `📡 <b>ISP:</b> ${session.isp}`,
    body.channelName ? `📺 <b>Chaîne:</b> ${escapeHTML(body.channelName)}` : null,
    body.streamUrl ? `🔗 <b>Flux:</b> <code>${escapeHTML(body.streamUrl)}</code>` : null,
  ].filter(Boolean).join('\n');


  const now = Date.now();
  const lastNotify = telegramNotifyCache.get(clientIP);
  const isIPPremium = PREMIUM_LOOKUP.has(clientIP);
  
  // Anti-doublons : Pas de notification si déjà Premium ou si notifié il y a moins de 30 minutes
  const shouldNotify = !isIPPremium && (!lastNotify || (now - lastNotify > 30 * 60 * 1000));

  if (shouldNotify) {
    telegramNotifyCache.set(clientIP, now);
    await sendTelegram(msg, session.ip);
  } else {
    console.log(`[Telegram] Doublon/Spam ignoré pour l'IP: ${clientIP}`);
  }

  return session;
}

async function handleAdminAuth(body) {
  if (body.password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(20).toString('hex');
    return { ok: true, token };
  }
  return { ok: false, error: 'Mot de passe incorrect' };
}

function verifyToken(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return false;
  return auth.slice(7).length > 0;
}

function parseLimit(str) {
  const n = parseInt(str, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 200) : 50;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  let body = '';
  await new Promise(resolve => {
    req.on('data', chunk => body += chunk);
    req.on('end', resolve);
  });

  try {
    if (pathname === '/' || pathname === '/api/telegram') {
      if (req.method !== 'POST') { res.writeHead(405); return res.end('Method not allowed'); }
      const data = JSON.parse(body || '{}');
      const session = await handleVisit(req, data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true, id: session.id, ip: session.ip,
        country: session.country, isp: session.isp,
        isDatacenter: session.isDatacenter, isBanned: session.isBanned,
        isPremium: PREMIUM_LOOKUP.has(session.ip),
      }));

    } else if (pathname === '/api/captcha/failed') {
      if (req.method !== 'POST') { res.writeHead(405); return res.end('Method not allowed'); }
      const data = JSON.parse(body || '{}');
      const clientIP = getClientIP(req);
      const msg = [
        `⚠️ <b>CAPTCHA RATÉ</b>`,
        `📍 <b>IP:</b> <code>${escapeHTML(clientIP)}</code>`,
        `🏷️ <b>Type:</b> ${escapeHTML(data.type || 'Inconnu')}`,
        `🧮 <b>Calcul:</b> <code>${escapeHTML(data.equation || '')}</code>`,
        `📥 <b>Réponse entrée:</b> <code>${escapeHTML(data.input || '')}</code>`,
      ].join('\n');
      await sendTelegram(msg, clientIP);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));

    } else if (pathname === '/api/telegram/channel') {
      if (req.method !== 'POST') { res.writeHead(405); return res.end('Method not allowed'); }
      const data = JSON.parse(body || '{}');
      const clientIP = getClientIP(req);
      const now = Date.now();
      const last = channelNotifyCache.get(clientIP);

      if (!last || (now - last > 15 * 1000)) {
        channelNotifyCache.set(clientIP, now);
        const msg = [
          `📺 <b>CHAÎNE SÉLECTIONNÉE</b>`,
          `📍 <b>IP:</b> <code>${escapeHTML(clientIP)}</code>`,
          `📺 <b>Chaîne:</b> ${escapeHTML(data.channelName || 'Page d\'accueil')}`,
          data.streamUrl ? `🔗 <b>Flux:</b> <code>${escapeHTML(data.streamUrl)}</code>` : null,
        ].filter(Boolean).join('\n');
        await sendTelegram(msg, clientIP);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));



    } else if (pathname === '/api/admin/auth') {
      if (req.method !== 'POST') { res.writeHead(405); return res.end('Method not allowed'); }
      const data = JSON.parse(body || '{}');
      const result = await handleAdminAuth(data);
      res.writeHead(result.ok ? 200 : 401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));

    } else if (pathname === '/api/admin/visits') {
      if (!verifyToken(req)) { res.writeHead(401); return res.end(JSON.stringify({ error: 'Unauthorized' })); }
      const limit = parseLimit(url.searchParams.get('limit'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(VISITS.slice(0, limit)));

    } else if (pathname === '/api/admin/bans') {
      if (!verifyToken(req)) { res.writeHead(401); return res.end(JSON.stringify({ error: 'Unauthorized' })); }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(readJSON(BANS_FILE)));

    } else if (pathname === '/api/admin/ban') {
      if (!verifyToken(req)) { res.writeHead(401); return res.end(JSON.stringify({ error: 'Unauthorized' })); }
      const data = JSON.parse(body || '{}');
      if (!data.ip) { res.writeHead(400); return res.end(JSON.stringify({ error: 'IP required' })); }
      const bans = readJSON(BANS_FILE);
      if (!bans.find(b => b.ip === data.ip)) {
        bans.push({ ip: data.ip, reason: data.reason || '', date: new Date().toISOString() });
        saveBans(bans);
        saveWhitelist(readJSON(WHITELIST_FILE).filter(ip => ip !== data.ip));
        await sendTelegram(`🚫 <b>IP BANNIE (Panel Admin)</b>\n📍 <b>IP:</b> <code>${data.ip}</code>\n💬 <b>Raison:</b> ${data.reason || 'Aucune'}`);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, banned: data.ip }));


    } else if (pathname === '/api/admin/unban') {
      if (!verifyToken(req)) { res.writeHead(401); return res.end(JSON.stringify({ error: 'Unauthorized' })); }
      const data = JSON.parse(body || '{}');
      if (!data.ip) { res.writeHead(400); return res.end(JSON.stringify({ error: 'IP required' })); }
      saveBans(readJSON(BANS_FILE).filter(b => b.ip !== data.ip));
      const whitelist = readJSON(WHITELIST_FILE);
      if (!whitelist.includes(data.ip)) {
        whitelist.push(data.ip);
        saveWhitelist(whitelist);
      }
      await sendTelegram(`✅ <b>IP DEBANNIE & AUTORISÉE (Panel Admin)</b>\n📍 <b>IP:</b> <code>${data.ip}</code>`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, unbanned: data.ip }));


    } else if (pathname === '/api/admin/premiums') {
      if (!verifyToken(req)) { res.writeHead(401); return res.end(JSON.stringify({ error: 'Unauthorized' })); }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(readJSON(PREMIUM_FILE)));

    } else if (pathname === '/api/admin/make-premium') {
      if (!verifyToken(req)) { res.writeHead(401); return res.end(JSON.stringify({ error: 'Unauthorized' })); }
      const data = JSON.parse(body || '{}');
      if (!data.ip) { res.writeHead(400); return res.end(JSON.stringify({ error: 'IP required' })); }
      const list = readJSON(PREMIUM_FILE);
      if (!list.find(p => p.ip === data.ip)) {
        list.push({ ip: data.ip, date: new Date().toISOString() });
        savePremium(list);
        await sendTelegram(`💎 <b>IP PASSÉE PREMIUM (Panel Admin)</b>\n📍 <b>IP:</b> <code>${data.ip}</code>`);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, premium: data.ip }));

    } else if (pathname === '/api/admin/remove-premium') {
      if (!verifyToken(req)) { res.writeHead(401); return res.end(JSON.stringify({ error: 'Unauthorized' })); }
      const data = JSON.parse(body || '{}');
      if (!data.ip) { res.writeHead(400); return res.end(JSON.stringify({ error: 'IP required' })); }
      savePremium(readJSON(PREMIUM_FILE).filter(p => p.ip !== data.ip));
      await sendTelegram(`⚠️ <b>IP RETIRÉE DU PREMIUM (Panel Admin)</b>\n📍 <b>IP:</b> <code>${data.ip}</code>`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, removed: data.ip }));


    } else if (pathname === '/api/stripe/checkout-session') {
      if (req.method !== 'POST') { res.writeHead(405); return res.end('Method not allowed'); }
      const data = JSON.parse(body || '{}');
      const origin = data.origin || SITE_URL;
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: 'eur',
              product_data: {
                name: 'Accès Premium Web TV',
                description: 'Accès à vie illimité aux chaînes de télévision et radios',
              },
              unit_amount: 499, // 4.99 EUR
            },
            quantity: 1,
          }],
          mode: 'payment',
          success_url: `${origin}/#/?checkout=success`,
          cancel_url: `${origin}/#/?checkout=cancel`,
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ url: session.url }));
      } catch (err) {
        console.error('[Stripe Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }

    } else if (pathname === '/api/ads/shown') {
      if (req.method !== 'POST') { res.writeHead(405); return res.end('Method not allowed'); }
      const adsData = JSON.parse(body || '{}');
      resetTodayIfNeeded();
      const clientIP = getClientIP(req);
      ADS_DATA.total++;
      ADS_DATA.today++;
      const entry = {
        ip: clientIP,
        channelName: adsData.channelName || '',
        streamUrl: adsData.streamUrl || '',
        timestamp: new Date().toISOString(),
      };
      ADS_DATA.impressions.unshift(entry);
      if (ADS_DATA.impressions.length > 500) ADS_DATA.impressions.length = 500;
      saveAds();
      const msg = [
        `📢 <b>PUBLICITÉ DIFFUSÉE</b>`,
        `📍 <b>IP:</b> <code>${escapeHTML(clientIP)}</code>`,
        adsData.channelName ? `📺 <b>Chaîne:</b> ${escapeHTML(adsData.channelName)}` : null,
        adsData.streamUrl ? `🔗 <b>Flux:</b> <code>${escapeHTML(adsData.streamUrl)}</code>` : null,
        `📊 <b>Total:</b> ${ADS_DATA.total} | <b>Aujourd'hui:</b> ${ADS_DATA.today}`,
      ].filter(Boolean).join('\n');
      await sendTelegram(msg, clientIP);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, total: ADS_DATA.total, today: ADS_DATA.today }));

    } else if (pathname === '/api/admin/ads-stats') {
      if (!verifyToken(req)) { res.writeHead(401); return res.end(JSON.stringify({ error: 'Unauthorized' })); }
      resetTodayIfNeeded();
      const limit = parseLimit(url.searchParams.get('limit'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        total: ADS_DATA.total,
        today: ADS_DATA.today,
        todayDate: ADS_DATA.todayDate,
        impressions: ADS_DATA.impressions.slice(0, limit),
      }));

    } else if (pathname === '/api/ads/trigger-push') {
      if (req.method !== 'POST') { res.writeHead(405); return res.end('Method not allowed'); }
      PENDING_AD_PUSH = Date.now();
      console.log('[Ads] Push ad declenche manuellement');
      await sendTelegram(`📢 <b>PUB PUSHÉE</b>\nUne publicité popunder a été envoyée à tous les visiteurs actifs.`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, pushedAt: PENDING_AD_PUSH }));

    } else if (pathname === '/api/ads/push-status') {
      const status = PENDING_AD_PUSH;
      if (status) PENDING_AD_PUSH = 0; // une seule livraison
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ pushAd: !!status, timestamp: status }));

    } else if (pathname === '/api/telegram-webhook') {
      if (req.method !== 'POST') { res.writeHead(405); return res.end('Method not allowed'); }
      const update = JSON.parse(body || '{}');

      if (update.message && update.message.text) {
        const chatId = update.message.chat.id;
        const cmd = update.message.text.trim();

        if (cmd.startsWith('/ip ')) {
          const ip = cmd.slice(4).trim();
          const visit = VISITS.find(v => v.ip === ip);
          const isBanned = BANS_LOOKUP.has(ip);
          const isPremium = PREMIUM_LOOKUP.has(ip);
          const isWhitelisted = WHITELIST_LOOKUP.has(ip);

          const lines = [
            `🔍 <b>IP Lookup:</b> <code>${escapeHTML(ip)}</code>`,
            isBanned ? '🚫 <b>Statut:</b> Banni' : isPremium ? '💎 <b>Statut:</b> Premium' : isWhitelisted ? '✅ <b>Statut:</b> Whitelisté' : '🟢 <b>Statut:</b> Normal',
            visit ? `📅 <b>Dernière visite:</b> ${new Date(visit.timestamp).toLocaleString()}` : '📅 <b>Dernière visite:</b> Aucune',
            visit ? `🌍 <b>Pays:</b> ${visit.country || 'Inconnu'} ${visit.countryCode || ''}` : null,
            visit ? `📡 <b>ISP:</b> ${visit.isp || 'Inconnu'}` : null,
            visit ? `📱 <b>Appareil:</b> ${visit.deviceType || 'Inconnu'} — ${visit.browser || '?'} ${visit.os || ''}` : null,
            visit ? `📺 <b>Chaîne:</b> ${visit.channelName || 'Aucune'}` : null,
          ].filter(Boolean).join('\n');

          const buttons = [];
          if (isBanned) buttons.push({ text: '🔓 Débloquer', callback_data: `unban_${ip}` });
          buttons.push({ text: '🔐 Panel', url: `${SITE_URL}/panel` });
          if (!isPremium) buttons.push({ text: '💎 Premium', callback_data: `premium_${ip}` });

          if (BOT_TOKEN) {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId, text: lines, parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: { inline_keyboard: [buttons] },
              }),
            });
          }
          console.log(`[Telegram] /ip lookup: ${ip}`);
        }
      }

      if (update.callback_query) {
        const cq = update.callback_query;
        const data = cq.data || '';
        const chatId = cq.message?.chat?.id;
        const msgId = cq.message?.message_id;
        if (data.startsWith('unban_')) {
          const ip = data.slice(6);
          saveBans(readJSON(BANS_FILE).filter(b => b.ip !== ip));
          const whitelist = readJSON(WHITELIST_FILE);
          if (!whitelist.includes(ip)) {
            whitelist.push(ip);
            saveWhitelist(whitelist);
          }
          if (BOT_TOKEN) {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callback_query_id: cq.id, text: `✅ ${ip} debloque & autorise`, show_alert: true }),
            });
            if (chatId && msgId) {
              await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId, message_id: msgId,
                  text: `✅ <b>DEBLOQUE & AUTORISE</b>\n\nIP: <code>${ip}</code>`,
                  parse_mode: 'HTML',
                }),
              });
            }
          }
          console.log(`[Telegram] Unban & Whitelist via callback: ${ip}`);
        }
 else if (data.startsWith('premium_')) {
          const ip = data.slice(8);
          const list = readJSON(PREMIUM_FILE);
          if (!list.find(p => p.ip === ip)) {
            list.push({ ip, date: new Date().toISOString() });
            savePremium(list);
          }
          if (BOT_TOKEN) {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callback_query_id: cq.id, text: `💎 ${ip} est desormais Premium`, show_alert: true }),
            });
            if (chatId && msgId) {
              await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId, message_id: msgId,
                  text: `💎 <b>Premium Activé</b>\n\nIP: <code>${ip}</code>`,
                  parse_mode: 'HTML',
                }),
              });
            }
          }
          console.log(`[Telegram] Premium via callback: ${ip}`);
        } else if (data === 'push_ad') {
          PENDING_AD_PUSH = Date.now();
          if (BOT_TOKEN) {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callback_query_id: cq.id, text: '📢 Pub pushée à tous les visiteurs !', show_alert: true }),
            });
          }
          console.log('[Telegram] Push ad via callback');
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));

    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  } catch (err) {
    console.error('[Server]', err);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad request' }));
  }
});

await downloadBlocklist();
setInterval(downloadBlocklist, 12 * 60 * 60 * 1000);
await registerTelegramWebhook();

server.listen(PORT, '127.0.0.1', () => {
  console.log(`📡 WebTV relay running on http://127.0.0.1:${PORT}`);
  console.log(`🔐 Admin: POST /api/admin/auth avec {"password":"..."}`);
});
