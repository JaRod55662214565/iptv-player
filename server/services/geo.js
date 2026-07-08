import fs from 'node:fs';
import { config } from '../config.js';
import { state } from '../state.js';
import { cidrToRange, escapeHTML } from '../lib/utils.js';

function loadRanges(text) {
  return text.trim().split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(cidrToRange)
    .filter(Boolean);
}

export async function downloadBlocklist() {
  try {
    const resp = await fetch(config.BLOCKLIST_URL, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    const ranges = loadRanges(text);
    if (ranges.length < 100) throw new Error(`Blocklist trop petite: ${ranges.length} plages`);
    fs.writeFileSync(config.BLOCKLIST_FILE, text);
    state.VPN_RANGES = ranges;
    console.log(`[VPN] Blocklist chargee: ${state.VPN_RANGES.length} plages CIDR`);
  } catch (e) {
    console.error('[VPN] Echec telechargement blocklist:', e.message);
    if (fs.existsSync(config.BLOCKLIST_FILE)) {
      const stat = fs.statSync(config.BLOCKLIST_FILE);
      const ageMs = Date.now() - stat.mtimeMs;
      const ageDays = ageMs / (24 * 60 * 60 * 1000);
      if (ageDays > 7) {
        console.warn(`[VPN] ATTENTION: Cache blocklist age de ${ageDays.toFixed(1)} jours (> 7 jours)`);
      }
      const text = fs.readFileSync(config.BLOCKLIST_FILE, 'utf8');
      state.VPN_RANGES = loadRanges(text);
      console.log(`[VPN] Blocklist depuis cache: ${state.VPN_RANGES.length} plages`);
    }
  }
}

export async function lookupIP(ip) {
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return { ip, country: 'Local', countryCode: 'LO', isp: 'Localhost', isProxy: false, isHosting: false, isMobile: false };
  }
  try {
    const resp = await fetch(`http://ip-api.com/json/${ip}?fields=status,query,isp,org,country,countryCode,city,regionName,proxy,hosting,mobile`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return { ip, country: 'Unknown', isp: 'Unknown' };
    const data = await resp.json();
    if (data.status !== 'success') return { ip, country: 'Unknown', isp: 'Unknown' };
    return {
      ip: data.query,
      country: escapeHTML(data.country || 'Unknown'),
      countryCode: data.countryCode || '',
      city: escapeHTML(data.city || ''),
      region: escapeHTML(data.regionName || ''),
      isp: escapeHTML(data.isp || data.org || 'Unknown'),
      isProxy: !!data.proxy,
      isHosting: !!data.hosting,
      isMobile: !!data.mobile,
    };
  } catch {
    return { ip, country: 'Unknown', isp: 'Unknown' };
  }
}

