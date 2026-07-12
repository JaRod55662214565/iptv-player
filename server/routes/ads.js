import { state, saveAds, resetTodayIfNeeded } from '../state.js';
import { config } from '../config.js';
import { sendTelegram } from '../services/telegram.js';
import { escapeHTML, getClientIP, safeParse, badJson } from '../lib/utils.js';

export async function handleAdsRoutes(pathname, req, res, body, url) {
  if (!pathname.startsWith('/api/ads')) return false;

  if (pathname === '/api/ads/shown') {
    if (req.method !== 'POST') { res.writeHead(405); return res.end('Method not allowed'); }
    const parsed = safeParse(body);
    const adsData = parsed.ok ? parsed.data : {};
    resetTodayIfNeeded();
    const clientIP = getClientIP(req);
    state.ADS_DATA.total++;
    state.ADS_DATA.today++;
    const entry = {
      ip: clientIP,
      channelName: adsData.channelName || '',
      streamUrl: adsData.streamUrl || '',
      timestamp: new Date().toISOString(),
    };
    state.ADS_DATA.impressions.unshift(entry);
    if (state.ADS_DATA.impressions.length > 500) state.ADS_DATA.impressions.length = 500;
    saveAds();
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayVisits = state.VISITS.filter(v => v.timestamp && v.timestamp.startsWith(todayStr)).length;
    const uniqueToday = new Set(state.VISITS.filter(v => v.timestamp && v.timestamp.startsWith(todayStr)).map(v => v.ip)).size;
    const msg = [
      `📢 <b>PUBLICITÉ DIFFUSÉE</b>`,
      `📍 <b>IP:</b> <code>${escapeHTML(clientIP)}</code>`,
      adsData.channelName ? `📺 <b>Chaîne:</b> ${escapeHTML(adsData.channelName)}` : null,
      adsData.streamUrl ? `🔗 <b>Flux:</b> <code>${escapeHTML(adsData.streamUrl)}</code>` : null,
      `📊 <b>Total:</b> ${state.ADS_DATA.total} | <b>Aujourd'hui:</b> ${state.ADS_DATA.today}`,
      `👥 <b>Visites aujourd'hui:</b> ${todayVisits} (${uniqueToday} uniques)`,
    ].filter(Boolean).join('\n');
    await sendTelegram(msg, clientIP);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, total: state.ADS_DATA.total, today: state.ADS_DATA.today }));
    return true;
  }

  if (pathname === '/api/ads/trigger-push') {
    if (req.method !== 'POST') { res.writeHead(405); return res.end('Method not allowed'); }
    const parsed = safeParse(body);
    const pushData = parsed.ok ? parsed.data : {};
    state.PENDING_AD_PUSH = Date.now();
    state.PENDING_AD_PUSH_IP = pushData.targetIP || null;
    const label = state.PENDING_AD_PUSH_IP ? `IP: <code>${escapeHTML(state.PENDING_AD_PUSH_IP)}</code>` : 'tous les visiteurs actifs';
    console.log(`[Ads] Push ad declenche: ${state.PENDING_AD_PUSH_IP || 'global'}`);
    await sendTelegram(`📢 <b>PUB PUSHÉE</b>\nCible: ${label}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, pushedAt: state.PENDING_AD_PUSH, targetIP: state.PENDING_AD_PUSH_IP }));
    return true;
  }

  if (pathname === '/api/ads/push-status') {
    const status = state.PENDING_AD_PUSH;
    const now = Date.now();
    const active = status && (now - status < config.PUSH_EXPIRY_MS);
    if (status && !active) { state.PENDING_AD_PUSH = 0; state.PENDING_AD_PUSH_IP = null; }
    const clientIP = getClientIP(req);
    // Les premiums ne recoivent jamais de push ad, meme en global
    if (state.PREMIUM_LOOKUP.has(clientIP)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ pushAd: false, timestamp: 0 }));
      return true;
    }
    const isTargeted = state.PENDING_AD_PUSH_IP !== null;
    const matchesTarget = !isTargeted || state.PENDING_AD_PUSH_IP === clientIP;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ pushAd: active && matchesTarget, timestamp: status }));
    return true;
  }

  return false;
}
