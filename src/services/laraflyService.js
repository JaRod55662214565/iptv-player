/**
 * Larafly Service
 * Manages Larafly ad network initialization and lifecycle
 */

const LARAFLY_DOMAIN = import.meta.env.VITE_LARAFLY_DOMAIN || '3nbf4.com';
const LARAFLY_ZONE_ID = import.meta.env.VITE_LARAFLY_ZONE_ID || 11244621;
const LARAFLY_ENABLED = import.meta.env.VITE_LARAFLY_ENABLED === 'true';

/**
 * Initializes Larafly ad network
 * Sets up service worker and ad injection
 */
export async function initLarafly() {
  if (!LARAFLY_ENABLED) {
    console.log('[Larafly] Disabled by configuration');
    return { success: false, reason: 'disabled' };
  }

  try {
    // Register service worker for Larafly
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register(
          '/sw.js',
          { scope: '/' }
        );
        console.log('[Larafly] Service worker registered:', registration);
      } catch (error) {
        console.warn('[Larafly] Service worker registration failed:', error);
        // Continue anyway - SW is optional
      }
    }

    // Load Larafly script
    return await loadLaraflyScript();
  } catch (error) {
    console.error('[Larafly] Initialization error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Dynamically load Larafly script
 */
function loadLaraflyScript() {
  return new Promise((resolve, reject) => {
    try {
      const script = document.createElement('script');
      script.src = `https://${LARAFLY_DOMAIN}/act/files/ad.min.js`;
      script.type = 'text/javascript';
      script.async = true;
      
      // Set configuration on window
      window.larafly_config = {
        domain: LARAFLY_DOMAIN,
        zoneId: LARAFLY_ZONE_ID
      };

      script.onload = () => {
        console.log('[Larafly] Script loaded successfully');
        // Initialize Larafly if it exposes initialization
        if (window.lary && typeof window.lary.init === 'function') {
          try {
            window.lary.init({
              zoneId: LARAFLY_ZONE_ID
            });
            console.log('[Larafly] Initialized');
            resolve({ success: true });
          } catch (error) {
            console.warn('[Larafly] Init error:', error);
            resolve({ success: true, warning: 'init failed but script loaded' });
          }
        } else {
          resolve({ success: true });
        }
      };

      script.onerror = () => {
        console.error('[Larafly] Script load error');
        reject(new Error('Failed to load Larafly script'));
      };

      document.head.appendChild(script);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Trigger ad refresh
 */
export function refreshLaraflyAds() {
  try {
    if (window.lary && typeof window.lary.refresh === 'function') {
      window.lary.refresh();
      console.log('[Larafly] Ads refreshed');
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Larafly] Refresh error:', error);
    return false;
  }
}

/**
 * Check if Larafly is loaded
 */
export function isLaraflyLoaded() {
  return LARAFLY_ENABLED && window.lary !== undefined;
}

/**
 * Get Larafly configuration
 */
export function getLaraflyConfig() {
  return {
    domain: LARAFLY_DOMAIN,
    zoneId: LARAFLY_ZONE_ID,
    enabled: LARAFLY_ENABLED,
    loaded: isLaraflyLoaded()
  };
}

/**
 * Unload Larafly (cleanup)
 */
export async function unloadLarafly() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    // Remove Larafly script
    const scripts = document.querySelectorAll('script[src*="3nbf4.com"]');
    scripts.forEach(script => script.remove());
    console.log('[Larafly] Unloaded');
  } catch (error) {
    console.error('[Larafly] Unload error:', error);
  }
}
