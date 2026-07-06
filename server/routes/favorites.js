import { state, saveFavorites } from '../state.js';
import { getClientIP } from '../lib/utils.js';

export async function handleFavoritesRoutes(pathname, req, res, body) {
  if (pathname === '/api/favorites') {
    const clientIP = getClientIP(req);

    if (req.method === 'GET') {
      const items = state.FAVORITES_DATA[clientIP] || [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ items }));
      return true;
    }

    if (req.method === 'POST') {
      // Anti-CSRF: verifier header X-Requested-With
      if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: missing CSRF header' }));
        return true;
      }
      try {
        const data = JSON.parse(body || '{}');
        state.FAVORITES_DATA[clientIP] = Array.isArray(data.items) ? data.items : [];
        saveFavorites();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
      return true;
    }

    res.writeHead(405);
    res.end('Method not allowed');
    return true;
  }
  return false;
}
