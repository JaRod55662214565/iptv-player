/**
 * Monetag Service
 * Gere les publicites et la monetisation
 */

const MONETAG_ENABLED = import.meta.env.VITE_MONETAG_ENABLED === 'true'
const MONETAG_SITE_ID = import.meta.env.VITE_MONETAG_SITE_ID
const POPUNDER_SRC = import.meta.env.VITE_POPUNDER_SRC
const POPUNDER_ZONE = import.meta.env.VITE_POPUNDER_ZONE

/**
 * Initialise Monetag
 */
export function initMonetag() {
  if (!MONETAG_ENABLED || !MONETAG_SITE_ID) {
    console.log('[Monetag] Disabled or not configured')
    return false
  }
  
  try {
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://ads.monetag.com/show.js'
    script.dataset.siteId = MONETAG_SITE_ID
    
    script.onload = () => {
      if (window.monetagAds) {
        window.monetagAds.refresh()
        console.log('[Monetag] Initialized')
      }
    }
    
    script.onerror = () => {
      console.warn('[Monetag] Failed to load script')
    }
    
    document.head.appendChild(script)
    return true
  } catch (error) {
    console.warn('[Monetag] Initialization error:', error.message)
    return false
  }
}

let popunderInjected = false

/**
 * Charge le script popunder (ex: Larafly/Monetag direct)
 */
export function initPopunder() {
  if (!POPUNDER_SRC || !POPUNDER_ZONE) {
    console.log('[Popunder] Disabled or not configured')
    return false
  }
  if (popunderInjected) {
    console.log('[Popunder] Deja injecte, ignore')
    return true
  }

  try {
    const script = document.createElement('script')
    script.src = POPUNDER_SRC
    script.setAttribute('data-zone', POPUNDER_ZONE)
    script.async = true
    script.setAttribute('data-cfasync', 'false')
    document.head.appendChild(script)
    popunderInjected = true
    console.log('[Popunder] Script charge:', POPUNDER_SRC, 'zone:', POPUNDER_ZONE)
    return true
  } catch (error) {
    console.warn('[Popunder] Error:', error.message)
    return false
  }
}

// Reinitialiser pour les tests (permet de reinjecter)
export function resetPopunder() {
  popunderInjected = false
}

/**
 * Rafraichit les annonces
 */
export function refreshMonetag() {
  if (!MONETAG_ENABLED) return
  
  try {
    if (window.monetagAds && typeof window.monetagAds.refresh === 'function') {
      window.monetagAds.refresh()
      console.log('[Monetag] Ads refreshed')
    }
  } catch (error) {
    console.warn('[Monetag] Refresh error:', error.message)
  }
}

/**
 * Affiche une annonce a une position specifique
 */
export function showAd(position = 'top') {
  const enabled = MONETAG_ENABLED && !!MONETAG_SITE_ID
  if (!enabled) return
  const el = document.getElementById(`monetag-ad-${position}`)
  if (el) {
    el.style.display = 'block'
    console.log('[Monetag] Ad shown at position:', position)
  }
  refreshMonetag()
}
