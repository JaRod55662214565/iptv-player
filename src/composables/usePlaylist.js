import { ref } from 'vue';
import { fetchPlaylist, filterRadios } from '../api/playlist';
import { IPTV_URL, IPTV_URL_BACKUP, RADIO_URL, RADIO_URL_BACKUP } from '../api/playlist';
import { getPlaylistUrl } from '../utils/geolocation';
import { getCustomIptv, buildM3UUrl } from '../utils/customIptv';

const CACHE_TTL = 3600000;
const cache = {};

function getCached(key) {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    delete cache[key];
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  cache[key] = { data, timestamp: Date.now() };
}

// ── Coupe du Monde 2026 : chaînes prioritaires ──
const WC_KEYWORDS = ['FIFA+ French'];

const PINNED_CHANNELS = [
  {
    name: 'Generations TV (576p)',
    url: 'https://event.vedge.infomaniak.com/livecast/ik:generation-tv/manifest.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'GenerationsTV.fr@SD', 'tvg-logo': 'https://i.imgur.com/NgBrDMe.png', 'group-title': 'Undefined' }
  },
  {
    name: 'MTV CLASSICS',
    url: 'https://jmp2.uk/plu-5f92b56a367e170007cd43f4.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'MTVCLASSICS.de@FR', 'tvg-logo': 'https://images.pluto.tv/channels/5f92b56a367e170007cd43f4/colorLogoPNG.png', 'group-title': 'Entertainment' }
  },
  {
    name: 'One Piece',
    url: 'https://jmp2.uk/plu-6380c94947c72b0007ee9a13.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'OnePiece.fr', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/misc/vod/one-piece-vod.png', 'group-title': 'Animation' }
  },
  {
    name: 'M6',
    url: 'http://99.27.51.147:8080/M6/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'M6.fr@HD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/m6-fr.png', 'group-title': 'Entertainment' }
  },
  {
    name: 'Trace LATINA',
    url: 'https://channels.trace.plus/Traceprod/LATINA_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceLatina.fr', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/trace-latina-fr.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace CARIBBEAN',
    url: 'https://channels.trace.plus/Traceprod/CARIBBEAN_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceCaribbean.fr', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/trace-caribbean-fr.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace AFRICA FR',
    url: 'https://channels.trace.plus/Traceprod/AFRICA_FR_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceAfricaFr.fr', 'tvg-logo': 'https://www.acces.tv/wp-content/uploads/2024/11/logo-trace-africa.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace URBAN FR',
    url: 'https://channels.trace.plus/Traceprod/URBAN_FR_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceUrbanFr.fr', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/trace-urban-fr.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace VANILLA',
    url: 'https://channels.trace.plus/Traceprod/VANILLA_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceVanilla.fr', 'tvg-logo': 'https://www.planetecsat.com/wp-content/uploads/2023/04/Entete-TRACE-Vanilla.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace TERANGA',
    url: 'https://channels.trace.plus/Traceprod/TERANGA_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceTeranga.fr', 'tvg-logo': 'https://web.archive.org/web/2025/https://www.lyngsat.com/logo/tv/tt/trace-teranga-fr.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace SPORT STARS',
    url: 'https://channels.trace.plus/Traceprod/TRACE_SPORT_STARS_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceSportStars.fr', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/trace-sport-stars-fr.png', 'group-title': 'Sport' }
  },
  {
    name: 'Trace NAIJA',
    url: 'https://channels.trace.plus/Traceprod/NAIJA_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceNaija.fr', 'tvg-logo': 'https://web.archive.org/web/2025/https://www.lyngsat.com/logo/tv/tt/trace-naija-fr.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace MZIKI',
    url: 'https://channels.trace.plus/Traceprod/MZIKI_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceMziki.fr', 'tvg-logo': 'https://web.archive.org/web/2025/https://www.lyngsat.com/logo/tv/tt/trace-mziki-fr.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace BRAZUCA',
    url: 'https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01131-tracetv-tracebrazuca-samsungbr/playlist.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceBrazuca.br', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/brazil/trace-brasil-br.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace TOCA',
    url: 'https://channels.trace.plus/Traceprod/TOCA_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceToca.br', 'tvg-logo': 'https://web.archive.org/web/2025/https://www.lyngsat.com/logo/tv/tt/trace-toca-fr.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace GOSPEL',
    url: 'https://channels.trace.plus/Traceprod/GOSPEL_FR_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceGospel.fr', 'tvg-logo': 'https://www.acces.tv/wp-content/uploads/2024/11/logo-trace-gospel.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace NGOMA',
    url: 'https://channels.trace.plus/Traceprod/AFRICA_EN_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceNgoma.za', 'tvg-logo': 'https://03mcdecdnimagerepository.blob.core.windows.net/epguideimage/channel/8GT.png', 'group-title': 'Musique' }
  }
];

function promoteWorldCup(channels) {
  const pinnedNames = new Set(PINNED_CHANNELS.map(p => p.name.toLowerCase()));
  const pinned = [];
  const rest = [];
  for (const ch of channels) {
    if (pinnedNames.has((ch.name || '').toLowerCase())) continue;
    const idx = WC_KEYWORDS.findIndex(kw =>
      ch.name && ch.name.toLowerCase().includes(kw.toLowerCase())
    );
    if (idx >= 0 && !pinned[idx]) {
      pinned[idx] = ch;
    } else {
      rest.push(ch);
    }
  }
  return [...pinned.filter(Boolean), ...PINNED_CHANNELS, ...rest];
}
// ────────────────────────────────────────────────

export function usePlaylist() {
  const tvs = ref([]);
  const loading = ref(false);

  function getUrls(mode, country) {
    if (mode === 'custom') {
      const creds = getCustomIptv();
      if (creds) return [buildM3UUrl(creds.server, creds.username, creds.password)];
      return [];
    }
    if (mode === 'iptv') return [IPTV_URL, IPTV_URL_BACKUP];
    if (mode === 'radio') return [RADIO_URL, RADIO_URL_BACKUP];
    return [getPlaylistUrl(country, 'home')];
  }

  async function load(mode, country = '', preserveSelection = false) {
    const urls = getUrls(mode, country);
    if (!urls.length) {
      tvs.value = [];
      return tvs.value;
    }
    const primary = urls[0];

    const cached = getCached(primary);
    if (cached) {
      const result = mode === 'radio' ? filterRadios(cached) : cached;
      tvs.value = mode !== 'radio' ? promoteWorldCup(result) : result;
      return tvs.value;
    }

    loading.value = true;
    let lastError;

    for (const url of urls) {
      try {
        const parsed = await fetchPlaylist(url);
        const result = mode === 'radio' ? filterRadios(parsed) : parsed;
        setCached(primary, parsed);
        tvs.value = mode !== 'radio' ? promoteWorldCup(result) : result;
        if (mode === 'home') {
          try { localStorage.setItem('tvlistUrl', url); } catch (e) { console.warn('[Cache] Failed to save tvlistUrl', e); }
        }
        loading.value = false;
        return tvs.value;
      } catch (e) {
        lastError = e;
      }
    }

    tvs.value = [];
    loading.value = false;
    throw lastError || new Error('Failed to load playlist');
  }

  return { tvs, loading, load };
}
