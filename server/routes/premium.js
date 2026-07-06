import { state } from '../state.js';
import { getClientIP } from '../lib/utils.js';

export async function handlePremiumRoutes(pathname, req, res) {
  if (pathname === '/api/check-premium') {
    if (req.method !== 'GET') { res.writeHead(405); return res.end('Method not allowed'); }
    const clientIP = getClientIP(req);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ isPremium: state.PREMIUM_LOOKUP.has(clientIP) }));
    return true;
  }
  return false;
}
