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
  <div v-if="isWaiting" class="wait-overlay">
    <div class="wait-spinner"></div>
  </div>
  <div v-if="isRedirecting" class="redirect-overlay">
    <div class="redirect-card">
      <div class="redirect-icon">{{ redirectIcon }}</div>
      <div class="redirect-spinner"></div>
      <div class="redirect-text">{{ redirectMessage }}</div>
      <div class="redirect-sub">{{ redirectSub }}</div>
    </div>
  </div>
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
const isWaiting = ref(false);
const isRedirecting = ref(false);
const redirectIcon = ref('');
const redirectMessage = ref('');
const redirectSub = ref('');
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

const redirectLabels = {
  accueil: { icon: '🏠', msg: 'Redirection vers l\'accueil...', sub: 'Vous allez être redirigé' },
  player: { icon: '▶️', msg: 'Retour au player...', sub: 'Lecture en cours' },
  settings: { icon: '⚙️', msg: 'Ouverture des réglages...', sub: 'Configuration' },
  iptv: { icon: '📡', msg: 'Chargement IPTV...', sub: 'Connexion au serveur' },
  share: { icon: '📤', msg: 'Page de partage...', sub: 'Lien de partage' },
};

function startRedirectPolling() {
  redirectPollInterval = setInterval(async () => {
    try {
      const res = await fetch('/api/redirect-status');
      const data = await res.json();
      if (data.ok && data.redirect) {
        const info = redirectLabels[data.redirect] || { icon: '🔄', msg: 'Redirection...', sub: '' };
        redirectIcon.value = info.icon;
        redirectMessage.value = info.msg;
        redirectSub.value = info.sub;
        isRedirecting.value = true;

        await new Promise(r => setTimeout(r, 1800));

        const redirectActions = {
          accueil: () => { window.location.hash = '#/'; },
          player: () => { /* keep current */ },
          settings: () => { showSettings.value = true; },
          iptv: () => { currentMode.value = 'iptv'; loadForMode('iptv', true); },
          share: () => { showShareLink.value = true; },
        };
        if (redirectActions[data.redirect]) {
          redirectActions[data.redirect]();
        }
        await new Promise(r => setTimeout(r, 400));
        isRedirecting.value = false;
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

    if (data.siteStopped) {
      window.location.replace('https://fr.wikipedia.org/wiki/Wikip%C3%A9dia:Bot');
      return;
    }

    if (data.waitDelay > 0) {
      isWaiting.value = true;
      await new Promise(resolve => setTimeout(resolve, data.waitDelay * 1000));
      isWaiting.value = false;
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

<style scoped>
.wait-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 20, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(6px);
}

.wait-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.15);
  border-top-color: #4ecdc4;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.redirect-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 26, 33, 0.96);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  backdrop-filter: blur(12px);
  animation: fadeIn 300ms ease-out;
}

.redirect-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  animation: slideUp 400ms cubic-bezier(0.16, 1, 0.3, 1);
}

.redirect-icon {
  font-size: 4rem;
  animation: pulse 1.2s ease-in-out infinite;
}

.redirect-spinner {
  width: 56px;
  height: 56px;
  border: 4px solid rgba(0, 217, 255, 0.15);
  border-top-color: #00D8FF;
  border-right-color: #00E5FF;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  box-shadow: 0 0 30px rgba(0, 217, 255, 0.2), inset 0 0 20px rgba(0, 217, 255, 0.05);
}

.redirect-text {
  font-size: 1.2rem;
  font-weight: 700;
  color: #E0F7FA;
  text-align: center;
  letter-spacing: 0.02em;
}

.redirect-sub {
  font-size: 0.85rem;
  color: rgba(224, 247, 250, 0.5);
  text-align: center;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
