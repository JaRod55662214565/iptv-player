/**
 * Custom Analytics Service
 * Sends tracking events to your personal tracking domain: 1tr4ck.dpdns.org
 * 
 * Features:
 * - Event tracking (page views, clicks, etc.)
 * - User session tracking
 * - Error reporting
 * - Performance metrics
 * - Configurable via environment variables
 */

const TRACKING_DOMAIN = import.meta.env.VITE_TRACKING_DOMAIN || '1tr4ck.dpdns.org'
const TRACKING_ENABLED = import.meta.env.VITE_CUSTOM_TRACKING_ENABLED === 'true'
const SESSION_ID = generateSessionId()

/**
 * Generate unique session ID
 */
function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Initialize analytics tracking
 */
export async function initAnalytics() {
  if (!TRACKING_ENABLED) {
    console.log('[Analytics] Disabled via VITE_CUSTOM_TRACKING_ENABLED')
    return
  }

  try {
    await trackEvent('session_start', {
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    })
    console.log('[Analytics] Initialized successfully')
  } catch (error) {
    console.error('[Analytics] Initialization failed:', error)
  }
}

/**
 * Track custom events
 * @param {string} eventName - Event name (e.g., 'page_view', 'login', 'ad_impression')
 * @param {object} eventData - Event data to send
 */
export async function trackEvent(eventName, eventData = {}) {
  if (!TRACKING_ENABLED) return

  try {
    const payload = {
      event: eventName,
      sessionId: SESSION_ID,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      data: eventData
    }

    const response = await fetch(`https://${TRACKING_DOMAIN}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': SESSION_ID
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      console.warn(`[Analytics] Event '${eventName}' failed:`, response.status)
    }
  } catch (error) {
    console.warn(`[Analytics] Error tracking '${eventName}':`, error.message)
  }
}

/**
 * Track page view
 */
export function trackPageView(pageName, metadata = {}) {
  trackEvent('page_view', {
    page: pageName,
    ...metadata
  })
}

/**
 * Track user action (click, scroll, etc.)
 */
export function trackUserAction(actionType, actionData = {}) {
  trackEvent('user_action', {
    type: actionType,
    ...actionData
  })
}

/**
 * Track authentication event
 */
export function trackAuth(authType, success = true, metadata = {}) {
  trackEvent('auth_event', {
    type: authType,
    success,
    ...metadata
  })
}

/**
 * Track ad impression
 */
export function trackAdImpression(adNetwork, adData = {}) {
  trackEvent('ad_impression', {
    network: adNetwork,
    ...adData
  })
}

/**
 * Track error
 */
export function trackError(errorMessage, errorData = {}) {
  trackEvent('error', {
    message: errorMessage,
    ...errorData
  })
}

/**
 * Track feature usage
 */
export function trackFeature(featureName, featureData = {}) {
  trackEvent('feature_usage', {
    feature: featureName,
    ...featureData
  })
}

/**
 * Get session ID
 */
export function getSessionId() {
  return SESSION_ID
}

/**
 * Get tracking domain
 */
export function getTrackingDomain() {
  return TRACKING_DOMAIN
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled() {
  return TRACKING_ENABLED
}

export default {
  initAnalytics,
  trackEvent,
  trackPageView,
  trackUserAction,
  trackAuth,
  trackAdImpression,
  trackError,
  trackFeature,
  getSessionId,
  getTrackingDomain,
  isAnalyticsEnabled
}
