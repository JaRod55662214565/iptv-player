import { state, saveAds, resetTodayIfNeeded } from '../state.js';
import { config } from '../config.js';
import { sendTelegram } from '../services/telegram.js';
import { escapeHTML, getClientIP } from '../lib/utils.js';

export async function handleAdsRoutes(pathname, req, res, body, url) {
  if (!pathname.startsWith('/api/ads')) return false;

  if (pathname === '/api/ads/shown') {
    if (req.method !== 'POST') { res.writeHead(405); return res.end('Method not allowed'); }
    const adsData = JSON.parse(body || '{}');
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
    const msg = [
      `📢 <b>PUBLICITÉ DIFFUSÉE</b>`,
      `📍 <b>IP:</b> <code>${escapeHTML(clientIP)}</code>`,
      adsData.channelName ? `📺 <b>Chaîne:</b> ${escapeHTML(adsData.channelName)}` : null,
      adsData.streamUrl ? `🔗 <b>Flux:</b> <code>${escapeHTML(adsData.streamUrl)}</code>` : null,
      `📊 <b>Total:</b> ${state.ADS_DATA.total} | <b>Aujourd'hui:</b> ${state.ADS_DATA.today}`,
    ].filter(Boolean).join('\n');
    await sendTelegram(msg, clientIP);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, total: state.ADS_DATA.total, today: state.ADS_DATA.today }));
    return true;
  }

  if (pathname === '/api/ads/trigger-push') {
    if (req.method !== 'POST') { res.writeHead(405); return res.end('Method not allowed'); }
    state.PENDING_AD_PUSH = Date.now();
    console.log('[Ads] Push ad declenche manuellement');
    await sendTelegram(`📢 <b>PUB PUSHÉE</b>\nUne publicité popunder a été envoyée à tous les visiteurs actifs.`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, pushedAt: state.PENDING_AD_PUSH }));
    return true;
  }

  if (pathname === '/api/ads/push-status') {
    const status = state.PENDING_AD_PUSH;
    const now = Date.now();
    const active = status && (now - status < config.PUSH_EXPIRY_MS);
    if (status && !active) state.PENDING_AD_PUSH = 0;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ pushAd: active, timestamp: status }));
    return true;
  }

  return false;
}
