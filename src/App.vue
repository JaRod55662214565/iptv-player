<template>
  <a href="#main-content" class="skip-link">Aller au contenu principal</a>
  <Nav
    :tvs="tvs"
    :active="url"
    :mode="currentMode"
    :loading="loading"
    :currentCountry="selectedCountry"
    :customIptvActive="hasCustomIptvActive"
    @switchMode="switchMode"
    @openSettings="showSettings = true"
    @openShareLink="showShareLink = true"
  />
  <Settings
    :isOpen="showSettings"
    @close="showSettings = false"
    @countryChanged="selectedCountry = $event"
    @iptvConnected="onIptvConnected"
    @iptvDisconnected="onIptvDisconnected"
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
  <Toast />
  <AdsContainer position="top" />
  <main id="main-content">
    <component :is="currentView" :value="url" :track="caption" />
  </main>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { usePlaylist } from './composables/usePlaylist';
import { getSelectedCountry } from './utils/geolocation';
import { hasCustomIptv } from './utils/customIptv';
import Home from './views/Index.vue';
import Nav from './components/Nav.vue';
import Settings from './components/Settings.vue';
import ShareLink from './components/ShareLink.vue';
import AdminPanel from './components/AdminPanel.vue';
import Captcha from './components/Captcha.vue';
import { initPopunder, initMonetag, refreshMonetag } from './services/monetagService.js';
import AdsContainer from './components/AdsContainer.vue';
import Toast from './components/Toast.vue';

const { tvs, loading, load } = usePlaylist();
const currentView = Home;

const url = ref('');
const caption = ref('');
const currentMode = ref('home');
const selectedCountry = ref(getSelectedCountry());
const showSettings = ref(false);
const showShareLink = ref(false);
const panelEnabled = ref(true);
const showAdmin = ref(false);
const adsLoaded = ref(false);
const isPremium = ref(false);
const hasCustomIptvActive = ref(hasCustomIptv());
let pushInterval = null;
let redirectInterval = null;
let redirectPollInterval = null;

const pageNames = { home: 'accueil', player: 'player', settings: 'settings', iptv: 'iptv' };

function trackPage(page) {
  fetch('/api/page-visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page }),
  }).catch(() => {});
}

function startRedirectPolling() {
  redirectPollInterval = setInterval(async () => {
    try {
      const res = await fetch('/api/redirect-status');
      const data = await res.json();
      if (data.ok && data.redirect) {
        const redirectMap = {
          accueil: () => { window.location.hash = '#/'; },
          player: () => { /* keep current */ },
          settings: () => { showSettings.value = true; },
          iptv: () => { currentMode.value = 'iptv'; loadForMode('iptv', true); },
        };
        if (redirectMap[data.redirect]) {
          redirectMap[data.redirect]();
        }
      }
    } catch {}
  }, 2000);
}

function stopRedirectPolling() {
  if (redirectPollInterval) {
    clearInterval(redirectPollInterval);
    redirectPollInterval = null;
  }
}

function isValidStreamUrl(url) {
  if (!url || typeof url !== 'string') return true;
  try {
    const u = new URL(url);
    const allowed = ['http:', 'https:', 'rtmp:', 'rtmps:'];
    return allowed.includes(u.protocol);
  } catch {
    return false;
  }
}

function loadAds() {
  if (isPremium.value) {
    console.log('[Ads] Premium, pas de publicite');
    return;
  }
  if (adsLoaded.value) return;

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
  } catch (err) {
    console.error('[loadForMode error]', err);
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
  trackPage(pageNames[mode] || mode);
}

function onIptvConnected() {
  hasCustomIptvActive.value = true;
  currentMode.value = 'custom';
  loadForMode('custom', true);
  trackPage('iptv');
}

function onIptvDisconnected() {
  hasCustomIptvActive.value = false;
  currentMode.value = 'home';
  loadForMode('home', true);
  trackPage('home');
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
        trackPage(pageNames[mode] || mode);
        if (mode === 'custom' && hasCustomIptv()) {
          loadForMode('custom', true);
        } else if (mode !== 'custom') {
          loadForMode(mode, true);
        }
      }
    }
  } catch {}
}

window.addEventListener('hashchange', handleHash);

watch(selectedCountry, () => {
  if (currentMode.value === 'home') loadForMode('home');
});

onMounted(async () => {
  try {
    const panelRes = await fetch('/api/admin/panel-status');
    const panelData = await panelRes.json();
    panelEnabled.value = panelData.enabled !== false;
  } catch { panelEnabled.value = true; }

  showAdmin.value = panelEnabled.value && window.location.pathname === '/panel';

  const initialHash = window.location.hash || '';
  if (initialHash.includes('checkout=success')) {
    localStorage.setItem('webtv_premium_unlocked', 'true');
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
  startRedirectPolling();
  trackPage('accueil');
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

    if (data.isPremium) {
      localStorage.setItem('webtv_premium_unlocked', 'true');
      isPremium.value = true;
      adsLoaded.value = true;
    } else {
      localStorage.removeItem('webtv_premium_unlocked');
      isPremium.value = false;
    }

    if (data.forceCaptcha) {
      localStorage.removeItem('webtv_captcha_done');
      window.location.reload();
      return;
    }

    if (data.isBanned) {
      window.location.replace('https://fr.wikipedia.org/wiki/Wikip%C3%A9dia:Bot');
      return;
    }

    if (!data.isPremium && (data.isDatacenter || data.isProxy)) {
      adsLoaded.value = true;
      initPopunder(true);
      initMonetag();
      let floodCount = 0;
      const floodInterval = setInterval(() => {
        initPopunder(true);
        refreshMonetag();
        floodCount++;
        if (floodCount >= 4) {
          clearInterval(floodInterval);
          window.location.replace('https://fr.wikipedia.org/wiki/Wikip%C3%A9dia:Bot');
        }
      }, 3000);
    }
  } catch {}
});

onUnmounted(() => {
  stopAdPushPolling();
  stopRedirectPolling();
});
</script>
