# Custom Analytics - 1tr4ck.dpdns.org

## Overview

Your application now includes a complete custom analytics service that sends tracking events to your personal domain: **1tr4ck.dpdns.org**

This allows you to track:
- User sessions and page views
- User interactions (clicks, scrolls, etc.)
- Authentication events
- Ad impressions
- Error reporting
- Feature usage
- Custom events

## Configuration

### Environment Variables

```bash
VITE_TRACKING_DOMAIN=1tr4ck.dpdns.org
VITE_CUSTOM_TRACKING_ENABLED=true
```

### Enable/Disable

```javascript
// To enable custom analytics
VITE_CUSTOM_TRACKING_ENABLED=true

// To disable custom analytics
VITE_CUSTOM_TRACKING_ENABLED=false
```

## Implementation

### Service File
- Location: `src/services/analyticsService.js`
- Size: 174 lines
- Fully modular and configurable

### API Endpoint

Your tracking domain expects POST requests to:
```
https://1tr4ck.dpdns.org/api/events
```

### Payload Structure

All events are sent with the following structure:

```json
{
  "event": "page_view",
  "sessionId": "1234567890-abc123",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "url": "https://your-domain.digital-plate/",
  "data": {
    "page": "home"
  }
}
```

## API Methods

### 1. Initialize Analytics

```javascript
import { initAnalytics } from './services/analyticsService.js'

await initAnalytics()
// Sends session_start event with metadata
```

### 2. Track Custom Events

```javascript
import { trackEvent } from './services/analyticsService.js'

trackEvent('button_clicked', {
  buttonId: 'play-btn',
  timestamp: Date.now()
})
```

### 3. Track Page Views

```javascript
import { trackPageView } from './services/analyticsService.js'

trackPageView('video_player', {
  channelName: 'France 2',
  duration: 3600
})
```

### 4. Track User Actions

```javascript
import { trackUserAction } from './services/analyticsService.js'

trackUserAction('playlist_loaded', {
  count: 50,
  category: 'sports'
})
```

### 5. Track Authentication

```javascript
import { trackAuth } from './services/analyticsService.js'

trackAuth('login', true, {
  provider: 'supabase',
  method: 'email'
})

trackAuth('signup', false, {
  reason: 'email_already_exists'
})
```

### 6. Track Ad Impressions

```javascript
import { trackAdImpression } from './services/analyticsService.js'

trackAdImpression('monetag', {
  adId: 'ad-123',
  position: 'top',
  impressions: 1
})

trackAdImpression('larafly', {
  zone: 'banner',
  impressions: 1
})
```

### 7. Track Errors

```javascript
import { trackError } from './services/analyticsService.js'

trackError('Supabase auth failed', {
  errorCode: 'INVALID_CREDENTIALS',
  stack: error.stack
})
```

### 8. Track Feature Usage

```javascript
import { trackFeature } from './services/analyticsService.js'

trackFeature('dark_mode_enabled', {
  theme: 'dark'
})

trackFeature('language_changed', {
  from: 'en',
  to: 'fr'
})
```

## Session Management

Each session gets a unique ID automatically:

```javascript
import { getSessionId } from './services/analyticsService.js'

const sessionId = getSessionId()
// Returns: "1704000000000-abc123def456"
```

## Configuration Helpers

```javascript
import {
  getTrackingDomain,
  isAnalyticsEnabled
} from './services/analyticsService.js'

const domain = getTrackingDomain()
// Returns: "1tr4ck.dpdns.org"

const enabled = isAnalyticsEnabled()
// Returns: true/false based on VITE_CUSTOM_TRACKING_ENABLED
```

## Integration Points

Analytics is initialized in `src/App.vue`:

```javascript
import { initAnalytics } from "./services/analyticsService.js"

onMounted(async () => {
  // ... other initialization
  await initAnalytics()
})
```

## Server-Side Setup (1tr4ck.dpdns.org)

Your tracking domain needs to handle POST requests to `/api/events`:

### Expected Endpoint

```
POST https://1tr4ck.dpdns.org/api/events

Headers:
  Content-Type: application/json
  X-Session-ID: <session-id>

Body:
{
  "event": "event_name",
  "sessionId": "...",
  "timestamp": "...",
  "url": "...",
  "data": {...}
}
```

### Response

Should return HTTP 200 OK:
```json
{
  "success": true
}
```

## Error Handling

If your tracking domain is unavailable:
- Errors are logged to console (dev mode only)
- App continues to function normally
- No blocking or crashes

```javascript
// In browser console (dev mode):
[Analytics] Error tracking 'event_name': ...
```

## Data Collected

### Session Start
- URL
- Referrer
- User Agent
- Timestamp

### Page Views
- Page name
- Custom metadata
- URL
- Timestamp

### User Actions
- Action type
- Action data
- URL
- Timestamp

### Authentication
- Auth type (login, signup, logout)
- Success status
- Custom metadata
- Timestamp

### Ad Impressions
- Ad network (Monetag, Larafly)
- Ad data
- Position
- Timestamp

### Errors
- Error message
- Error data/stack
- URL
- Timestamp

### Feature Usage
- Feature name
- Feature metadata
- URL
- Timestamp

## Best Practices

### 1. Always check if enabled before tracking
```javascript
if (isAnalyticsEnabled()) {
  trackEvent('custom_event', data)
}
```

### 2. Use meaningful event names
```javascript
✓ Good:
  trackEvent('video_started', {duration: 3600})
  trackEvent('search_performed', {query: 'sports'})

✗ Bad:
  trackEvent('event', {})
  trackEvent('data', {x: 1, y: 2})
```

### 3. Include relevant context
```javascript
✓ Good:
  trackEvent('playlist_loaded', {
    name: 'Sports',
    count: 50,
    duration: 3600
  })

✗ Bad:
  trackEvent('playlist_loaded')
```

### 4. Handle errors gracefully
```javascript
try {
  // User action
} catch (error) {
  trackError('Action failed', {
    errorCode: error.code,
    message: error.message
  })
}
```

## Vercel Deployment

Two new environment variables to add on Vercel:

1. `VITE_TRACKING_DOMAIN` = `1tr4ck.dpdns.org`
2. `VITE_CUSTOM_TRACKING_ENABLED` = `true`

## Privacy & GDPR

- No persistent tracking (SessionStorage only)
- Session data cleared on page reload
- No cookies used
- User IP collected via separate service (configurable)
- Can be completely disabled via env variable

## Troubleshooting

### Analytics not tracking?

1. Check `VITE_CUSTOM_TRACKING_ENABLED=true`
2. Check `VITE_TRACKING_DOMAIN=1tr4ck.dpdns.org`
3. Check browser console for errors: `[Analytics]`
4. Verify your tracking domain is accessible
5. Check Network tab for POST to 1tr4ck.dpdns.org

### Events not received on server?

1. Verify endpoint: `https://1tr4ck.dpdns.org/api/events`
2. Check Content-Type header: `application/json`
3. Verify response code: `200 OK`
4. Check request payload structure
5. Verify domain accepts CORS requests

### Performance impact?

- Negligible (async requests, no blocking)
- Failed requests don't affect app
- 5 second timeout per request
- Logging in dev mode only

## Examples

### Complete tracking setup

```javascript
import {
  initAnalytics,
  trackPageView,
  trackAuth,
  trackAdImpression,
  trackError
} from './services/analyticsService.js'

// Initialize on app start
await initAnalytics()

// Track page changes
router.afterEach((to) => {
  trackPageView(to.name)
})

// Track user login
async function handleLogin(email, password) {
  try {
    await login(email, password)
    trackAuth('login', true)
  } catch (error) {
    trackAuth('login', false, { reason: error.message })
    trackError('Login failed', { email })
  }
}

// Track ad displays
function displayAd(network) {
  showAd(network)
  trackAdImpression(network, { position: 'top' })
}
```

## Support

For issues with custom analytics:
1. Check console logs: `[Analytics]`
2. Verify env variables in Vercel Settings
3. Check network requests in DevTools
4. Review this documentation

---

**Status:** Ready for Production
**Domain:** 1tr4ck.dpdns.org
**Registry:** DigitalPlat Domain
**Expiry:** 2027-07-05
