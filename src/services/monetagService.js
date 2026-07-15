/**
 * Monetag MultiTag Service
 * Charge un seul script qui gere les 4 formats :
 * - OnClick (Popunder)
 * - Push Notifications
 * - In-Page Push
 * - Vignette Banner
 */

const MONETAG_ENABLED = import.meta.env.VITE_MONETAG_ENABLED === 'true'
const POPUNDER_SRC = import.meta.env.VITE_POPUNDER_SRC
const POPUNDER_ZONE = import.meta.env.VITE_POPUNDER_ZONE

let multiTagInjected = false

/**
 * Charge le MultiTag Monetag (unique script pour les 4 formats)
 */
export function initMonetag() {
  if (!MONETAG_ENABLED) {
    console.log('[Monetag] Disabled')
    return false
  }
  if (!POPUNDER_SRC || !POPUNDER_ZONE) {
    console.log('[Monetag] Not configured (missing POPUNDER_SRC or POPUNDER_ZONE)')
    return false
  }
  if (multiTagInjected) {
    console.log('[Monetag] MultiTag already injected, skip')
    return true
  }

  try {
    const script = document.createElement('script')
    script.src = POPUNDER_SRC
    script.setAttribute('data-zone', POPUNDER_ZONE)
    script.async = true
    script.setAttribute('data-cfasync', 'false')

    script.onload = () => {
      console.log('[Monetag] MultiTag loaded — zone:', POPUNDER_ZONE)
    }
    script.onerror = () => {
      console.warn('[Monetag] MultiTag failed to load')
    }

    document.head.appendChild(script)
    multiTagInjected = true
    return true
  } catch (error) {
    console.warn('[Monetag] Error:', error.message)
    return false
  }
}

/**
 * Re-injecte le MultiTag (force mode pour datacenter/proxy)
 */
export function initPopunder(force = false) {
  if (!force && multiTagInjected) {
    console.log('[Monetag] Already injected, skip')
    return true
  }
  multiTagInjected = false
  return initMonetag()
}

/**
 * Rafraichit les annonces (re-injecte le script)
 */
export function refreshMonetag() {
  if (!MONETAG_ENABLED) return
  multiTagInjected = false
  initMonetag()
}

/**
 * Affiche une annonce a une position specifique
 */
export function showAd(position = 'top') {
  if (!MONETAG_ENABLED) return
  const el = document.getElementById(`monetag-ad-${position}`)
  if (el) {
    el.style.display = 'block'
    console.log('[Monetag] Ad shown at position:', position)
  }
}
