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

runBootValidation();

fs.mkdirSync(config.DATA_DIR, { recursive: true });
loadState();

const routes = [
  handleTrackingRoutes,
  handleAdminRoutes,
  handleStripeRoutes,
  handlePremiumRoutes,
  handleAdsRoutes,
];

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', config.SITE_URL);
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
    for (const handler of routes) {
      if (await handler(pathname, req, res, body, url)) return;
    }
    res.writeHead(404);
    res.end('Not found');
  } catch (err) {
    console.error('[Server]', err);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad request' }));
  }
});

await downloadBlocklist();
setInterval(downloadBlocklist, 12 * 60 * 60 * 1000);
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
