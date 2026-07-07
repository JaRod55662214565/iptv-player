import { config } from '../config.js';
import crypto from 'node:crypto';

const urlStore = new Map();
const PROXY_PREFIX = '/api/proxy/stream';

function storeUrl(url) {
  const id = crypto.randomBytes(4).toString('hex');
  urlStore.set(id, url);
  setTimeout(() => urlStore.delete(id), 30 * 60 * 1000);
  return id;
}

function getProxyUrl(url) {
  const id = storeUrl(url);
  return `${PROXY_PREFIX}/${id}`;
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'fr,fr-FR;q=0.9,en;q=0.8',
  'Connection': 'keep-alive',
};

const SEGMENT_EXTS = /\.(ts|m4s|mp4|aac)$/i;

async function fetchAndRespond(targetUrl, req, res) {
  const headers = { ...FETCH_HEADERS, 'Referer': config.SITE_URL || 'https://www.google.com/' };
  if (req.headers.range) headers['Range'] = req.headers.range;

  try {
    const resp = await fetch(targetUrl, { headers, signal: AbortSignal.timeout(30000) });
    if (!resp.ok) {
      res.writeHead(resp.status);
      return res.end();
    }

    const contentType = resp.headers.get('content-type') || '';
    const isM3U8 = contentType.includes('mpegurl') || contentType.includes('m3u8') || targetUrl.pathname.match(/\.m3u8?$/i);

    if (isM3U8) {
      const text = await resp.text();
      const baseUrl = targetUrl.href.substring(0, targetUrl.href.lastIndexOf('/') + 1);
      const rewritten = text.split('\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;
        try {
          new URL(trimmed);
          return getProxyUrl(trimmed);
        } catch {
          return getProxyUrl(new URL(trimmed, baseUrl).href);
        }
      }).join('\n');
      res.writeHead(200, {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      });
      return res.end(rewritten);
    }

    const isSegment = contentType.includes('video/') || contentType.includes('application/octet-stream') || targetUrl.pathname.match(SEGMENT_EXTS);
    if (isSegment) {
      const range = resp.headers.get('content-range');
      const length = resp.headers.get('content-length');
      const headers_out = {
        'Content-Type': contentType || 'video/MP2T',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      };
      if (range) headers_out['Content-Range'] = range;
      if (length) headers_out['Content-Length'] = length;
      res.writeHead(req.headers.range ? 206 : 200, headers_out);
      for await (const chunk of resp.body) res.write(chunk);
      return res.end();
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    });
    for await (const chunk of resp.body) res.write(chunk);
    return res.end();
  } catch (err) {
    console.error('[Proxy] Error fetching', targetUrl.href, err.message);
    try { res.writeHead(502, { 'Content-Type': 'application/json' }); } catch {}
    try { res.end(JSON.stringify({ error: 'Proxy error' })); } catch {}
    return true;
  }
}

export async function handleProxyRoutes(pathname, req, res) {
  if (!pathname.startsWith(PROXY_PREFIX)) return false;

  if (pathname === PROXY_PREFIX) {
    const urlParam = new URL(req.url, `http://${req.headers.host}`).searchParams.get('url');
    if (!urlParam) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Missing url parameter' }));
    }
    let targetUrl;
    try {
      targetUrl = new URL(urlParam);
      if (!['http:', 'https:'].includes(targetUrl.protocol)) throw new Error('Invalid protocol');
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid url' }));
    }
    return fetchAndRespond(targetUrl, req, res);
  }

  const id = pathname.slice(PROXY_PREFIX.length + 1);
  const stored = urlStore.get(id);
  if (!stored) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Expired or invalid id' }));
  }
  let targetUrl;
  try {
    targetUrl = new URL(stored);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Invalid stored url' }));
  }
  return fetchAndRespond(targetUrl, req, res);
}
