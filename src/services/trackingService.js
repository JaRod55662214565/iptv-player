/**
 * 📊 Tracking Service
 * - Détecte IP et ISP
 * - Envoie alertes Telegram si VPN/Proxy/Datacenter
 * - Bloque les bots automatiquement
 */

const API_IP = 'https://ip-api.com/json/'
const ANTI_BOT_ENABLED = import.meta.env.VITE_ANTI_BOT_ENABLED === 'true'
const BLOCK_VPN = import.meta.env.VITE_BLOCK_VPN === 'true'
const BLOCK_DATACENTER = import.meta.env.VITE_BLOCK_DATACENTER === 'true'

/**
 * Récupère les infos IP via ip-api.com
 * Retourne: { ip, isp, country, city, lat, lon, proxy, hosting, org }
 */
export async function fetchIpInfo() {
  try {
    const timeout = parseInt(import.meta.env.VITE_IP_API_TIMEOUT || '5000')
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch(`${API_IP}?fields=status,query,isp,org,as,country,regionName,city,lat,lon,mobile,proxy,hosting`, {
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const data = await response.json()
    
    if (data.status !== 'success') {
      console.warn('[Tracking] IP lookup failed:', data.message)
      return null
    }
    
    return {
      ip: data.query,
      isp: data.isp || 'Unknown',
      org: data.org || 'Unknown',
      country: data.country || 'Unknown',
      city: data.regionName || data.city || 'Unknown',
      lat: data.lat,
      lon: data.lon,
      isProxy: data.proxy === true,
      isHosting: data.hosting === true,
      isMobile: data.mobile === true,
      as: data.as || 'Unknown'
    }
  } catch (error) {
    console.warn('[Tracking] Error fetching IP info:', error.message)
    return null
  }
}

/**
 * Vérifie si l'IP doit être bloquée (VPN/Proxy/Datacenter)
 */
export async function checkBlocked() {
  if (!ANTI_BOT_ENABLED) return false
  
  try {
    const ipInfo = await fetchIpInfo()
    if (!ipInfo) return false
    
    const isBlocked = 
      (BLOCK_VPN && ipInfo.isProxy) ||
      (BLOCK_DATACENTER && ipInfo.isHosting)
    
    if (isBlocked) {
      // Ne pas envoyer Telegram ici, c'est fait dans App.vue
      console.warn('[Tracking] IP bloquée:', ipInfo.ip, ipInfo.isp)
    }
    
    return isBlocked
  } catch (error) {
    console.warn('[Tracking] Error checking IP:', error.message)
    return false
  }
}

/**
 * Envoie une notification Telegram
 * Supporte: visite normale, accès bloqué, erreurs
 */
export async function initTracking() {
  if (import.meta.env.VITE_TRACKING_ENABLED !== 'true') {
    console.log('[Tracking] Disabled')
    return
  }
  
  try {
    const ipInfo = await fetchIpInfo()
    
    if (!ipInfo) {
      console.warn('[Tracking] Could not fetch IP info')
      return
    }
    
    console.log('[Tracking] IP Info:', ipInfo)
    
    // Sauvegarde en sessionStorage (pas de partage entre onglets)
    sessionStorage.setItem('ipInfo', JSON.stringify(ipInfo))
    
    // Vérifier le blocage
    const isBlocked = ANTI_BOT_ENABLED && (
      (BLOCK_VPN && ipInfo.isProxy) ||
      (BLOCK_DATACENTER && ipInfo.isHosting)
    )
    
    sessionStorage.setItem('isBlocked', isBlocked ? 'true' : 'false')
    
    return { ipInfo, isBlocked }
  } catch (error) {
    console.warn('[Tracking] Initialization error:', error.message)
    return null
  }
}

/**
 * Récupère les infos IP sauvegardées
 */
export function getStoredIpInfo() {
  try {
    const stored = sessionStorage.getItem('ipInfo')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

/**
 * Récupère le statut de blocage sauvegardé
 */
export function getBlockedStatus() {
  return sessionStorage.getItem('isBlocked') === 'true'
}
