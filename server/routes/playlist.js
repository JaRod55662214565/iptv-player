import { config } from '../config.js';
import crypto from 'node:crypto';
import fs from 'node:fs';

const CACHE_TTL = 3600000;
const cache = new Map();
const REFRESH_INTERVAL = 6 * 60 * 60 * 1000;

const IPTV_SOURCES = {
  all: 'https://iptv-org.github.io/iptv/index.m3u',
  radio: 'https://iptv-org.github.io/iptv/categories/music.m3u',
};

const COUNTRY_CODES = {
  fr: 'fr', gb: 'gb', de: 'de', nl: 'nl', pt: 'pt', tn: 'tn',
};

function getPlaylistUrl(params) {
  const country = params.get('country');
  const type = params.get('type');

  if (type === 'radio') return IPTV_SOURCES.radio;
  if (country && COUNTRY_CODES[country.toLowerCase()]) {
    return `https://iptv-org.github.io/iptv/countries/${COUNTRY_CODES[country.toLowerCase()]}.m3u`;
  }
  return IPTV_SOURCES.all;
}

function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function checkBasicAuth(req) {
  const user = config.PLAYLIST_USER;
  const pass = config.PLAYLIST_PASSWORD;
  if (!user && !pass) return true;

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Basic ')) return false;

  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
  const [u, p] = decoded.split(':');
  if (!u || !p) return false;

  return safeEqual(u, user) && safeEqual(p, pass);
}

function rewriteM3UContent(m3uText, baseUrl) {
  const lines = m3uText.split('\n');
  const rewritten = [];
  let pendingUA = '';
  let pendingRef = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Extraire http-user-agent et http-referrer depuis #EXTINF
    if (trimmed.startsWith('#EXTINF:')) {
      const uaMatch = trimmed.match(/http-user-agent="([^"]*)"/);
      const refMatch = trimmed.match(/http-referrer="([^"]*)"/);
      pendingUA = uaMatch ? uaMatch[1] : '';
      pendingRef = refMatch ? refMatch[1] : '';
      // Supprimer les attributs non-strippants de Smarters Pro
      let cleanLine = trimmed
        .replace(/\s*http-user-agent="[^"]*"/, '')
        .replace(/\s*http-referrer="[^"]*"/, '');
      rewritten.push(cleanLine);
      continue;
    }

    // Garder les lignes #EXTVLCOPT (VLC les utilise pour http-user-agent etc.)
    if (trimmed.startsWith('#EXTVLCOPT:')) {
      rewritten.push(line);
      continue;
    }

    // Ligne vide ou commentaire → garder tel quel
    if (!trimmed || trimmed.startsWith('#')) {
      rewritten.push(line);
      continue;
    }

    // C'est une URL de stream → réécrire vers le proxy avec headers
    let streamUrl = trimmed;
    if (!streamUrl.startsWith('http://') && !streamUrl.startsWith('https://')) {
      try {
        streamUrl = new URL(streamUrl, baseUrl).href;
      } catch {
        rewritten.push(line);
        continue;
      }
    }

    let proxyUrl = `${config.SITE_URL}/api/proxy/stream?url=${encodeURIComponent(streamUrl)}`;
    if (pendingUA) proxyUrl += `&ua=${encodeURIComponent(pendingUA)}`;
    if (pendingRef) proxyUrl += `&ref=${encodeURIComponent(pendingRef)}`;
    rewritten.push(proxyUrl);

    pendingUA = '';
    pendingRef = '';
  }

  return rewritten.join('\n');
}

function loadDiskCache() {
  try {
    if (fs.existsSync(config.PLAYLIST_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(config.PLAYLIST_CACHE_FILE, 'utf-8'));
      for (const [key, value] of Object.entries(data)) {
        cache.set(key, value);
      }
      console.log(`[Playlist] Loaded ${cache.size} cached playlists from disk`);
    }
  } catch (e) {
    console.error('[Playlist] Failed to load disk cache:', e.message);
  }
}

function saveDiskCache() {
  try {
    const obj = Object.fromEntries(cache);
    fs.writeFileSync(config.PLAYLIST_CACHE_FILE, JSON.stringify(obj));
  } catch (e) {
    console.error('[Playlist] Failed to save disk cache:', e.message);
  }
}

async function refreshSinglePlaylist(url) {
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(30000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebTV/1.0)',
        'Accept': '*/*',
      },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    let text = await resp.text();
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    text = text.replace(/\r\n/g, '\n');
    if (!text.includes('#EXTM3U')) throw new Error('Invalid M3U');
    const rewritten = rewriteM3UContent(text, url);
    cache.set(url, { data: rewritten, timestamp: Date.now() });
    console.log(`[Playlist] Refreshed: ${url} (${(rewritten.length / 1024).toFixed(0)} KB)`);
    return true;
  } catch (e) {
    console.error(`[Playlist] Refresh failed for ${url}:`, e.message);
    return false;
  }
}

async function refreshAll() {
  const urls = [IPTV_SOURCES.all, IPTV_SOURCES.radio];
  for (const cc of Object.keys(COUNTRY_CODES)) {
    urls.push(`https://iptv-org.github.io/iptv/countries/${cc}.m3u`);
  }
  console.log(`[Playlist] Refreshing ${urls.length} playlists...`);
  await Promise.allSettled(urls.map(u => refreshSinglePlaylist(u)));
  saveDiskCache();
  console.log('[Playlist] Refresh cycle complete');
}

export function startPlaylistRefresh() {
  loadDiskCache();
  refreshAll();
  setInterval(refreshAll, REFRESH_INTERVAL);
}

const AUTH_ROUTES = ['/api/playlist.m3u'];
const PUBLIC_ROUTES = ['/api/playlist-public.m3u'];

export async function handlePlaylistRoutes(pathname, req, res) {
  const isAuth = AUTH_ROUTES.includes(pathname);
  const isPublic = PUBLIC_ROUTES.includes(pathname);
  if (!isAuth && !isPublic) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return true;
  }

  if (isAuth && !checkBasicAuth(req)) {
    res.writeHead(401, {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Basic realm="Playlist"',
    });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return true;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const playlistUrl = getPlaylistUrl(url.searchParams);
  const cacheKey = playlistUrl;

  // Cache hit
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    res.writeHead(200, {
      'Content-Type': 'audio/x-mpegurl; charset=utf-8',
      'Content-Disposition': 'inline; filename=playlist.m3u',
      'Cache-Control': 'public, max-age=3600',
    });
    res.end(cached.data);
    return true;
  }

  // Fetch depuis iptv-org
  try {
    const resp = await fetch(playlistUrl, {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebTV/1.0)',
        'Accept': '*/*',
      },
    });

    if (!resp.ok) {
      console.error(`[Playlist] iptv-org returned ${resp.status} for ${playlistUrl}`);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Upstream playlist unavailable' }));
      return true;
    }

    let text = await resp.text();

    // Supprimer BOM UTF-8 si présent
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }

    // Normaliser les fins de ligne CRLF → LF
    text = text.replace(/\r\n/g, '\n');

    if (!text.includes('#EXTM3U')) {
      console.error('[Playlist] Invalid M3U response from iptv-org');
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid playlist format' }));
      return true;
    }

    const rewritten = rewriteM3UContent(text, playlistUrl);

    cache.set(cacheKey, { data: rewritten, timestamp: Date.now() });

    res.writeHead(200, {
      'Content-Type': 'audio/x-mpegurl; charset=utf-8',
      'Content-Disposition': 'inline; filename=playlist.m3u',
      'Cache-Control': 'public, max-age=3600',
    });
    res.end(rewritten);
    return true;
  } catch (err) {
    console.error('[Playlist] Error fetching iptv-org:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to fetch playlist' }));
    return true;
  }
}
