import { config } from '../config.js';
import crypto from 'node:crypto';
import dns from 'node:dns';
import { isPrivateIP, checkRateLimit, getClientIP, escapeHTML } from '../lib/utils.js';

const urlStore = new Map();
const PROXY_PREFIX = '/api/proxy/stream';
const proxyRateLimits = new Map();
const MAX_REDIRECTS = 5;
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

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

async function checkSSRF(url) {
  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
    throw new Error('Invalid protocol');
  }

  const port = url.port || (url.protocol === 'https:' ? 443 : 80);
  const allowedPorts = config.PROXY_ALLOWED_PORTS;
  if (allowedPorts !== '*') {
    const ports = allowedPorts.split(',').map(p => parseInt(p.trim(), 10));
    if (!ports.includes(port)) {
      throw new Error(`Port ${port} not allowed`);
    }
  }

  const addresses = await dns.promises.lookup(url.hostname, { all: true });
  for (const { address } of addresses) {
    if (isPrivateIP(address)) {
      throw new Error(`SSRF blocked: ${address} is a private/reserved IP`);
    }
  }
}

async function safeFetch(targetUrl, req, maxRedirects = MAX_REDIRECTS, customHeaders = null) {
  const headers = { ...FETCH_HEADERS, 'Referer': config.SITE_URL || 'https://www.google.com/' };
  if (req.headers.range) headers['Range'] = req.headers.range;
  if (customHeaders) {
    if (customHeaders['User-Agent']) headers['User-Agent'] = customHeaders['User-Agent'];
    if (customHeaders['Referer']) headers['Referer'] = customHeaders['Referer'];
  }

  let url = targetUrl;
  for (let i = 0; i <= maxRedirects; i++) {
    await checkSSRF(url);

    const resp = await fetch(url, { headers, signal: AbortSignal.timeout(30000), redirect: 'manual' });

    if (resp.status >= 300 && resp.status < 400) {
      const location = resp.headers.get('location');
      if (!location) return resp;
      await resp.arrayBuffer().catch(() => {});
      url = new URL(location, url);
      if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
        throw new Error('Invalid protocol in redirect');
      }
      continue;
    }
    return resp;
  }
  throw new Error('Too many redirects');
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'fr,fr-FR;q=0.9,en;q=0.8',
  'Connection': 'keep-alive',
};

const SEGMENT_EXTS = /\.(ts|m4s|mp4|aac)$/i;

async function fetchAndRespond(targetUrl, req, res, customHeaders = null) {
  const CORS_ORIGIN = config.SITE_URL;
  const BODY_SIZE_LIMIT = config.PROXY_BODY_SIZE_LIMIT_MB * 1024 * 1024;

  try {
    const resp = await safeFetch(targetUrl, req, MAX_REDIRECTS, customHeaders);
    if (!resp.ok) {
      const status = resp.status;
      try { resp.body?.getReader().cancel(); } catch {}
      res.writeHead(status);
      return res.end();
    }

    const finalUrl = new URL(resp.url);
    const contentType = resp.headers.get('content-type') || '';
    const isM3U8 = contentType.includes('mpegurl') || contentType.includes('m3u8') || finalUrl.pathname.match(/\.m3u8?$/i);

    if (isM3U8) {
      const text = await resp.text();
      if (text.length > BODY_SIZE_LIMIT) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Playlist too large' }));
      }
      const lines = text.split('\n');
      if (lines.length > 10000) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Playlist too many lines' }));
      }
      if (lines.length > 1 && !lines[0].trim().startsWith('#EXTM3U')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid playlist' }));
      }
      const baseUrl = finalUrl.href.substring(0, finalUrl.href.lastIndexOf('/') + 1);
      const rewritten = lines.map((line, idx, arr) => {
        const trimmed = line.trim();
        if (!trimmed) return line;
        if (trimmed.startsWith('#EXTINF:')) {
          const commaIdx = line.indexOf(',');
          if (commaIdx !== -1) {
            return line.slice(0, commaIdx + 1) + escapeHTML(line.slice(commaIdx + 1));
          }
          return line;
        }
        if (trimmed.startsWith('#')) return line;
        try {
          new URL(trimmed);
          return getProxyUrl(trimmed);
        } catch {
          return getProxyUrl(new URL(trimmed, baseUrl).href);
        }
      }).join('\n');
      res.writeHead(200, {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': CORS_ORIGIN,
        'Cache-Control': 'no-cache',
      });
      return res.end(rewritten);
    }

    const isSegment = contentType.includes('video/') || contentType.includes('application/octet-stream') || finalUrl.pathname.match(SEGMENT_EXTS);
    if (isSegment) {
      const range = resp.headers.get('content-range');
      const length = resp.headers.get('content-length');
      const headers_out = {
        'Content-Type': contentType || 'video/MP2T',
        'Access-Control-Allow-Origin': CORS_ORIGIN,
        'Cache-Control': 'public, max-age=3600',
      };
      if (range) headers_out['Content-Range'] = range;
      if (length) headers_out['Content-Length'] = length;
      res.writeHead(req.headers.range ? 206 : 200, headers_out);
      let bytes = 0;
      try {
        for await (const chunk of resp.body) {
          bytes += chunk.length;
          if (bytes > BODY_SIZE_LIMIT) {
            try { resp.body?.getReader().cancel(); } catch {}
            break;
          }
          res.write(chunk);
        }
      } catch {}
      return res.end();
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': CORS_ORIGIN,
    });
    let bytes = 0;
    try {
      for await (const chunk of resp.body) {
        bytes += chunk.length;
        if (bytes > BODY_SIZE_LIMIT) {
          try { resp.body?.getReader().cancel(); } catch {}
          break;
        }
        res.write(chunk);
      }
    } catch {}
    return res.end();
  } catch (err) {
    console.error('[Proxy] Error fetching', targetUrl ? targetUrl.href : '(unknown)', err.message);
    try { res.writeHead(err.message.startsWith('SSRF blocked') || err.message.startsWith('Port ') ? 400 : 502, { 'Content-Type': 'application/json' }); } catch {}
    try { res.end(JSON.stringify({ error: err.message || 'Proxy error' })); } catch {}
    return true;
  }
}

export async function handleProxyRoutes(pathname, req, res) {
  if (!pathname.startsWith(PROXY_PREFIX)) return false;

  const clientIP = getClientIP(req);
  if (!checkRateLimit(proxyRateLimits, clientIP, config.PROXY_RATE_LIMIT, config.PROXY_RATE_WINDOW_MS)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Too many requests. Try again later.' }));
  }

  if (pathname === PROXY_PREFIX) {
    const proxyUrl = new URL(req.url, `http://${req.headers.host}`);
    const urlParam = proxyUrl.searchParams.get('url');
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
    // Headers custom depuis le endpoint playlist (ua & ref)
    const customHeaders = {};
    const ua = proxyUrl.searchParams.get('ua');
    const ref = proxyUrl.searchParams.get('ref');
    if (ua) customHeaders['User-Agent'] = ua;
    if (ref) customHeaders['Referer'] = ref;
    return fetchAndRespond(targetUrl, req, res, Object.keys(customHeaders).length ? customHeaders : null);
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
