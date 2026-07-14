import fs from 'node:fs';
import http from 'node:http';
import { config } from './config.js';
import { loadState } from './state.js';
import { runBootValidation } from './validation.js';
import { downloadBlocklist } from './services/geo.js';
import { registerTelegramWebhook } from './services/telegram.js';
import { handleAdminRoutes } from './routes/admin.js';
import { handleTrackingRoutes } from './routes/tracking.js';
import { handleStripeRoutes } from './routes/stripe.js';
import { handlePremiumRoutes } from './routes/premium.js';
import { handleAdsRoutes } from './routes/ads.js';
import { handleFavoritesRoutes } from './routes/favorites.js';
import { handleProxyRoutes } from './routes/proxy.js';
import { handlePlaylistRoutes } from './routes/playlist.js';
import { startPlaylistRefresh } from './routes/playlist.js';

runBootValidation();

fs.mkdirSync(config.DATA_DIR, { recursive: true });
loadState();

const routes = [
  handleProxyRoutes,
  handlePlaylistRoutes,
  handleTrackingRoutes,
  handleAdminRoutes,
  handleStripeRoutes,
  handlePremiumRoutes,
  handleAdsRoutes,
  handleFavoritesRoutes,
];

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', config.SITE_URL);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self'; frame-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'");

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (!config.PANEL_ENABLED && (pathname === '/panel' || pathname === '/panel/')) {
    res.writeHead(302, { Location: 'https://en.wikipedia.org/wiki/Wikipedia:Bots' });
    res.end();
    return;
  }

  let body = '';
  let bodySize = 0;
  const MAX_BODY = 1 * 1024 * 1024; // 1MB
  const bodyOk = await new Promise(resolve => {
    let aborted = false;
    req.on('data', chunk => {
      if (aborted) return;
      bodySize += chunk.length;
      if (bodySize > MAX_BODY) {
        aborted = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        resolve(false);
        return;
      }
      body += chunk;
    });
    req.on('end', () => { if (!aborted) resolve(true); });
  });
  if (!bodyOk) return;

  try {
    for (const handler of routes) {
      if (await handler(pathname, req, res, body, url)) return;
    }
    res.writeHead(404);
    res.end('Not found');
  } catch (err) {
    console.error('[Server]', err);
    if (!res.writableEnded && !res.headersSent) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bad request' }));
    }
  }
});

await downloadBlocklist();
setInterval(downloadBlocklist, 12 * 60 * 60 * 1000);
if (config.M3U_ENABLED) startPlaylistRefresh();
await registerTelegramWebhook();

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${config.PORT} déjà utilisé. Arrête l'ancien processus ou change PORT dans .env`);
  } else {
    console.error('❌ Erreur serveur:', err.message);
  }
  process.exit(1);
});

server.listen(config.PORT, '127.0.0.1', () => {
  console.log(`📡 WebTV relay running on http://127.0.0.1:${config.PORT}`);
  console.log(`🔐 Admin: POST /api/admin/auth avec {"password":"..."}`);
});
