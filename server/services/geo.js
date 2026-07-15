import fs from 'node:fs';
import { config } from '../config.js';
import { state } from '../state.js';
import { cidrToRange, escapeHTML } from '../lib/utils.js';

const PROVIDER_TIMEOUT = 3000;

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

function safeString(val) {
  return escapeHTML(String(val || ''));
}

const PROVIDERS = [
  {
    name: 'ipinfo.io',
    url: (ip) => `https://ipinfo.io/${ip}/json`,
    parse: (data) => {
      if (!data || !data.ip) return null;
      let asn = null;
      let asnOrg = '';
      if (data.asn && typeof data.asn === 'object') {
        asn = String(data.asn.id || '').replace('AS', '');
        asnOrg = safeString(data.asn.name || '');
      } else if (data.org) {
        const parts = data.org.split(' ');
        const maybeASN = parts[0] || '';
        if (maybeASN.startsWith('AS')) {
          asn = maybeASN.replace('AS', '');
          asnOrg = safeString(parts.slice(1).join(' '));
        }
      }
      let isp = data.org || data.company?.name || '';
      if (isp && isp.startsWith('AS')) {
        isp = isp.replace(/^AS\d+\s*/, '');
      }
      return {
        ip: data.ip,
        country: safeString(data.country || ''),
        countryCode: data.country || '',
        city: safeString(data.city || ''),
        region: safeString(data.region || ''),
        isp: safeString(isp),
        asn,
        asnOrg,
        isProxy: false,
        isHosting: data.hosting || data.privacy?.hosting || false,
        isMobile: false,
      };
    },
  },
  {
    name: 'ip-api.com',
    url: (ip) => `http://ip-api.com/json/${ip}?fields=status,query,isp,org,as,country,countryCode,city,regionName,proxy,hosting,mobile`,
    parse: (data) => {
      if (!data || data.status !== 'success') return null;
      let asn = null;
      let asnOrg = '';
      if (data.as) {
        const parts = data.as.split(' ');
        const maybeASN = parts[0] || '';
        if (maybeASN.startsWith('AS')) {
          asn = maybeASN.replace('AS', '');
          asnOrg = safeString(parts.slice(1).join(' '));
        }
      }
      return {
        ip: data.query,
        country: safeString(data.country || ''),
        countryCode: data.countryCode || '',
        city: safeString(data.city || ''),
        region: safeString(data.regionName || ''),
        isp: safeString(data.isp || data.org || ''),
        asn,
        asnOrg,
        isProxy: !!data.proxy,
        isHosting: !!data.hosting,
        isMobile: !!data.mobile,
      };
    },
  },
  {
    name: 'ipapi.is',
    url: (ip) => `https://api.ipapi.is/?q=${ip}`,
    parse: (data) => {
      if (!data || !data.ip) return null;
      return {
        ip: data.ip,
        country: safeString(data.location?.country || ''),
        countryCode: data.location?.country_code || '',
        city: safeString(data.location?.city || ''),
        region: safeString(data.location?.state || ''),
        isp: safeString(data.isp || data.org || ''),
        asn: data.asn?.asn ? String(data.asn.asn).replace('AS', '') : null,
        asnOrg: safeString(data.asn?.org || ''),
        isProxy: !!data.is_proxy,
        isHosting: !!data.is_datacenter,
        isMobile: !!data.is_mobile,
      };
    },
  },
];

export async function lookupIP(ip) {
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return { ip, country: 'Local', countryCode: 'LO', isp: 'Localhost', asn: null, asnOrg: '', isProxy: false, isHosting: false, isMobile: false };
  }

  for (const provider of PROVIDERS) {
    try {
      const resp = await fetch(provider.url(ip), { signal: AbortSignal.timeout(PROVIDER_TIMEOUT) });
      if (!resp.ok) {
        console.warn(`[Geo] ${provider.name} HTTP ${resp.status} pour ${ip}`);
        continue;
      }
      const data = await resp.json();
      const result = provider.parse(data);
      if (result) {
        // Fallback: si ISP vide mais asnOrg présent, utiliser asnOrg
        if (!result.isp && result.asnOrg) {
          result.isp = result.asnOrg;
        }
        console.log(`[Geo] ${provider.name} → ${ip} ASN:${result.asn || 'N/A'} ISP:${result.isp || 'N/A'} ${result.countryCode}`);
        return result;
      }
      console.warn(`[Geo] ${provider.name} retour invalide pour ${ip}`);
    } catch (e) {
      console.warn(`[Geo] ${provider.name} erreur pour ${ip}: ${e.message}`);
    }
  }

  return { ip, country: 'Unknown', countryCode: '', isp: 'Unknown', asn: null, asnOrg: '', isProxy: false, isHosting: false, isMobile: false };
}
