<template>
  <Nav
    :tvs="tvs"
    :active="url"
    :mode="currentMode"
    :loading="loading"
    :currentCountry="selectedCountry"
    @switchMode="switchMode"
    @openSettings="showSettings = true"
    @openShareLink="showShareLink = true"
  />
  <Settings
    :isOpen="showSettings"
    @close="showSettings = false"
    @countryChanged="selectedCountry = $event"
  />
  <ShareLink
    :isOpen="showShareLink"
    :url="url"
    :caption="caption"
    :mode="currentMode"
    @close="showShareLink = false"
  />
  <Captcha @verified="loadAds" />
  <AdminPanel v-if="showAdmin" @close="closeAdmin" />
  <AdsContainer position="top" />
  <component :is="currentView" :value="url" :track="caption" />
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { usePlaylist } from './composables/usePlaylist';
import { getSelectedCountry } from './utils/geolocation';
import Home from './views/Index.vue';
import Nav from './components/Nav.vue';
import Settings from './components/Settings.vue';
import ShareLink from './components/ShareLink.vue';
import AdminPanel from './components/AdminPanel.vue';
import Captcha from './components/Captcha.vue';
import { initPopunder, initMonetag } from './services/monetagService.js';
import AdsContainer from './components/AdsContainer.vue';

const { tvs, loading, load } = usePlaylist();
const currentView = Home;

const url = ref('');
const caption = ref('');
const currentMode = ref('home');
const selectedCountry = ref(getSelectedCountry());
const showSettings = ref(false);
const showShareLink = ref(false);
const showAdmin = ref(window.location.pathname === '/panel');
const adsLoaded = ref(false);
const isPremium = ref(false);
let pushInterval = null;

function loadAds() {
  if (isPremium.value) {
    console.log('[Ads] Premium, pas de publicite');
    return;
  }
  if (adsLoaded.value) return;

  try {
    const lastAdTime = localStorage.getItem('webtv_last_ad_time');
    if (lastAdTime && (Date.now() - parseInt(lastAdTime, 10) < 24 * 60 * 60 * 1000)) {
      console.log('[Ads] Publicité déjà affichée au cours des dernières 24h. Ignoré.');
      return;
    }
  } catch {}

  adsLoaded.value = true;
  initMonetag();

  fetch('/api/ads/shown', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channelName: caption.value || 'Page d\'accueil',
      streamUrl: url.value || '',
    }),
  }).catch(() => {});
}

let lastPushId = 0;

// Vérifie si admin a pushé une pub via Telegram
function startAdPushPolling() {
  pushInterval = setInterval(async () => {
    try {
      const res = await fetch('/api/ads/push-status');
      const data = await res.json();
      if (data.pushAd && data.timestamp && data.timestamp > lastPushId) {
        lastPushId = data.timestamp;
        if (isPremium.value) {
          console.log('[Ads] Premium, pas de push ad');
          return;
        }
        initPopunder();
        try {
          localStorage.setItem('webtv_last_ad_time', Date.now().toString());
        } catch {}
      }
    } catch {}
  }, 15000);
}

function stopAdPushPolling() {
  if (pushInterval) {
    clearInterval(pushInterval);
    pushInterval = null;
  }
}

function selectFirst() {
  if (!url.value || currentMode.value === 'iptv') {
    const first = tvs.value.find(t => t.isTv);
    if (first) { url.value = first.url; caption.value = first.caption; }
  }
}

async function loadForMode(mode, keep = false) {
  try {
    await load(mode, selectedCountry.value, keep);
    if (!keep) selectFirst();
  } catch {
    tvs.value = [{ name: 'Erreur de chargement', isTv: false }];
  }
}

function closeAdmin() {
  showAdmin.value = false;
  if (window.location.pathname === '/panel') {
    window.history.pushState({}, '', '/');
  }
}

function switchMode(mode) {
  currentMode.value = mode;
  loadForMode(mode, true);
}

async function notifyChannel(channelName, streamUrl) {
  try {
    await fetch('/api/telegram/channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelName, streamUrl }),
    });
  } catch {}
}

function handleHash() {
  try {
    const hash = window.location.hash || '#/';
    if (hash.includes('?')) {
      const p = new URLSearchParams(hash.slice(hash.indexOf('?')));
      const newUrl = p.get('url');
      const newCaption = p.get('caption');
      const mode = p.get('mode');
      const checkout = p.get('checkout');

      if (checkout === 'success') {
        localStorage.setItem('webtv_premium_unlocked', 'true');
        p.delete('checkout');
        const newParams = p.toString();
        window.location.hash = newParams ? `#/?${newParams}` : '#/';
        window.location.reload();
        return;
      }

      if (newUrl) url.value = decodeURIComponent(newUrl);
      if (newCaption) {
        const decoded = decodeURIComponent(newCaption);
        if (decoded !== caption.value) {
          caption.value = decoded;
          notifyChannel(caption.value, url.value);
        }
      }
      if (mode && mode !== currentMode.value) {
        currentMode.value = mode;
        loadForMode(mode, true);
      }
    }
  } catch {}
}

window.addEventListener('hashchange', handleHash);

watch(selectedCountry, () => {
  if (currentMode.value === 'home') loadForMode('home');
});

onMounted(async () => {
  // Détection Stripe success immédiate au montage
  const initialHash = window.location.hash || '';
  if (initialHash.includes('checkout=success')) {
    localStorage.setItem('webtv_premium_unlocked', 'true');
    // Nettoyer le hash proprement
    const cleanHash = initialHash.replace(/([?&])checkout=[^&]*(&?)/, (_, p1, p2) => {
      return p2 ? p1 : '';
    }).replace(/\?$/, '');
    window.location.hash = cleanHash || '#/';
    window.location.reload();
    return;
  }

  handleHash();
  loadForMode(currentMode.value, !!url.value);
  startAdPushPolling();
  try {
    const res = await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        siteUrl: window.location.origin,
        channelName: caption.value || 'Page d\'accueil',
        streamUrl: url.value || '',
      }),
    });
    const data = await res.json();

    // Protection Anti-Hack : Synchro stricte avec le statut d'IP du serveur
    if (data.isPremium) {
      localStorage.setItem('webtv_premium_unlocked', 'true');
      isPremium.value = true;
      adsLoaded.value = true; // pas besoin d'ads si premium
    } else {
      localStorage.removeItem('webtv_premium_unlocked');
      isPremium.value = false;
    }

    // Bannis exclus, les autres (datacenter/proxy) ont droit à des pubs agressives
    if (data.isBanned) {
      window.location.replace('https://fr.wikipedia.org/wiki/Wikip%C3%A9dia:Bot');
    }
    if (!data.isPremium && (data.isDatacenter || data.isProxy)) {
      localStorage.removeItem('webtv_last_ad_time');
      adsLoaded.value = true;
      initPopunder(true);
      initPopunder(true);
      setTimeout(() => initPopunder(true), 5000);
      setTimeout(() => initPopunder(true), 15000);
      fetch('/api/ads/shown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelName: caption.value || 'Page d\'accueil',
          streamUrl: url.value || '',
        }),
      }).catch(() => {});
    }
  } catch {}
});

onUnmounted(() => {
  stopAdPushPolling();
});
</script>
