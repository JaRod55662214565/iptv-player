/**
 * Tracking Service
 * - Detecte IP et ISP
 * - Envoie alertes Telegram si VPN/Proxy/Datacenter
 * - Bloque les bots automatiquement
 */

/**
 * Recupere les infos IP via ip-api.com
 * Retourne: { ip, isp, country, city, lat, lon, proxy, hosting, org }
 */
export async function fetchIpInfo() {
  try {
    const timeout = parseInt(import.meta.env.VITE_IP_API_TIMEOUT || '5000')
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch(`https://ip-api.com/json/?fields=status,query,isp,org,as,country,regionName,city,lat,lon,mobile,proxy,hosting`, {
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
 * Recupere les infos IP sauvegardees
 */
export function getStoredIpInfo() {
  try {
    const stored = sessionStorage.getItem('ipInfo')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}
