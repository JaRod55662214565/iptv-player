import { state, saveFavorites } from '../state.js';
import { getClientIP, safeParse, badJson } from '../lib/utils.js';

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
      if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: missing CSRF header' }));
        return true;
      }
      const parsed = safeParse(body);
      if (!parsed.ok) return badJson(res);
      state.FAVORITES_DATA[clientIP] = Array.isArray(parsed.data.items) ? parsed.data.items : [];
      saveFavorites();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return true;
    }

    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end('{"error":"Method not allowed"}');
    return true;
  }
  return false;
}
