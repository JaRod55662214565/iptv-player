import { ref } from 'vue';
import { fetchPlaylist, filterRadios } from '../api/playlist';
import { IPTV_URL, IPTV_URL_BACKUP, RADIO_URL, RADIO_URL_BACKUP } from '../api/playlist';
import { getPlaylistUrl } from '../utils/geolocation';

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

export function usePlaylist() {
  const tvs = ref([]);
  const loading = ref(false);

  function getUrls(mode, country) {
    if (mode === 'iptv') return [IPTV_URL, IPTV_URL_BACKUP];
    if (mode === 'radio') return [RADIO_URL, RADIO_URL_BACKUP];
    return [getPlaylistUrl(country, 'home')];
  }

  async function load(mode, country = '', preserveSelection = false) {
    const urls = getUrls(mode, country);
    const primary = urls[0];

    const cached = getCached(primary);
    if (cached) {
      tvs.value = mode === 'radio' ? filterRadios(cached) : cached;
      return cached;
    }

    loading.value = true;
    let lastError;

    for (const url of urls) {
      try {
        const parsed = await fetchPlaylist(url);
        const result = mode === 'radio' ? filterRadios(parsed) : parsed;
        setCached(primary, parsed);
        tvs.value = result;
        if (mode === 'home') {
          try { localStorage.setItem('tvlistUrl', url); } catch (e) { console.warn('[Cache] Failed to save tvlistUrl', e); }
        }
        loading.value = false;
        return result;
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
