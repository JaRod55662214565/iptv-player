import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import videojs from 'video.js';

export function usePlayer(sourceRef, localeRef) {
  const videoRef = ref(null);
  const playerReady = ref(false);
  const isLoading = ref(false);
  const lastSrc = ref('');
  let player = null;
  let playerInitialized = false;
  let sourceChangeTimeout;
  let retryCount = 0;
  const MAX_RETRIES = 3;

  const currentSrc = computed(() => sourceRef.value || '');

  function detectType(url) {
    const ext = url.split('?')[0].toLowerCase();
    if (ext.endsWith('.mp4')) return 'video/mp4';
    if (ext.endsWith('.webm')) return 'video/webm';
    if (ext.endsWith('.m3u8')) return 'application/x-mpegURL';
    if (ext.endsWith('.mpd')) return 'application/dash+xml';
    if (ext.endsWith('.ts')) return 'video/MP2T';
    return 'application/x-mpegURL';
  }

  function playSrc(url, force) {
    if (!player || !url) return;
    if (!force && url === lastSrc.value) return;
    if (!force) retryCount = 0;
    player.error(null);
    player.src({
      src: url,
      type: detectType(url),
      withCredentials: false,
    });
    lastSrc.value = url;
  }

  onMounted(async () => {
    await nextTick();
    if (!videoRef.value) return;

    player = videojs(videoRef.value, {
      autoplay: true,
      muted: true,
      controls: true,
      preload: 'auto',
      html5: {
        vhs: {
          overrideNative: !videojs.browser.IS_SAFARI,
          enableLowInitialPlaylist: true,
          smoothQualityChange: true,
          limitRenditionByPlayerDimensions: false,
          useBandwidthFromLocalStorage: true,
        },
        nativeAudioTracks: false,
        nativeVideoTracks: false,
      },
      liveui: true,
      responsive: true,
    });

    player.ready(() => {
      playerReady.value = true;
      isLoading.value = false;

      if (!playerInitialized) {
        playerInitialized = true;
        player.language(localeRef.value === 'fr' ? 'fr' : 'en');

        player.on('error', () => {
          isLoading.value = false;
          if (retryCount < MAX_RETRIES && lastSrc.value) {
            retryCount++;
            const url = lastSrc.value;
            setTimeout(() => {
              if (player) playSrc(url, true);
            }, retryCount * 1000);
          }
        });

        player.on('loadstart', () => { isLoading.value = true; });
        player.on('canplay', () => { isLoading.value = false; retryCount = 0; });
      }

      if (currentSrc.value && currentSrc.value !== lastSrc.value) {
        playSrc(currentSrc.value);
      }
    });

    setTimeout(() => { isLoading.value = false; }, 3000);
  });

  watch(currentSrc, (val) => {
    if (!val) return;
    clearTimeout(sourceChangeTimeout);
    sourceChangeTimeout = setTimeout(() => {
      if (!player) return;
      playSrc(val);
    }, 300);
  }, { immediate: true });

  watch(localeRef, (loc) => {
    if (player) {
      player.language(loc === 'fr' ? 'fr' : 'en');
    }
  });

  onUnmounted(() => {
    clearTimeout(sourceChangeTimeout);
    if (player) {
      try { player.dispose(); } catch {}
      player = null;
    }
  });

  return {
    videoRef, playerReady, isLoading,
  };
}
