import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config before importing state
vi.mock('../server/config.js', () => ({
  config: {
    ADMIN_PASSWORD: 'test-password-12345',
    BOT_TOKEN: 'test-token',
    CHAT_ID: '12345',
    SITE_URL: 'https://test.com',
    PANEL_ENABLED: true,
    M3U_ENABLED: true,
    VLC_ENABLED: true,
    DATA_DIR: '/tmp/test-data',
    BANS_FILE: '/tmp/test-data/bans.json',
    WHITELIST_FILE: '/tmp/test-data/whitelist.json',
    PREMIUM_FILE: '/tmp/test-data/premium.json',
    VISITS_FILE: '/tmp/test-data/visits.json',
    BLOCKLIST_FILE: '/tmp/test-data/vpn.txt',
    ADS_FILE: '/tmp/test-data/ads.json',
    FAVORITES_FILE: '/tmp/test-data/favorites.json',
    BLOCKED_ASN_FILE: '/tmp/test-data/blocked-asn.json',
    PLAYLIST_USER: '',
    PLAYLIST_PASSWORD: '',
    PLAYLIST_CACHE_FILE: '/tmp/test-data/playlist-cache.json',
    FUNCTIONS_FILE: '/tmp/test-data/functions.json',
    COUNTRIES_FILE: '/tmp/test-data/countries.json',
    IP_VISITS_FILE: '/tmp/test-data/ip-visits.json',
    ATTACKS_LOG: '/tmp/test-data/attacks.log',
    IP_BANS_FILE: '/tmp/test-data/ip-bans.json',
    STRIPE_ENABLED: false,
    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
    TELEGRAM_WEBHOOK_SECRET: '',
    PORT: 3001,
    WEBHOOK_URL: '',
    PROXY_RATE_LIMIT: 100,
    PROXY_RATE_WINDOW_MS: 60000,
    PROXY_BODY_SIZE_LIMIT_MB: 50,
    PROXY_ALLOWED_PORTS: '80,443',
    TRACKING_RATE_LIMIT: 60,
    CAPTCHA_RATE_LIMIT: 10,
    STRIPE_RATE_LIMIT: 5,
    RATE_WINDOW_MS: 60000,
    BLOCKLIST_URL: '',
    PUSH_EXPIRY_MS: 30000,
    ADMIN_TOKEN_EXPIRY_MS: 86400000,
  },
}));

vi.mock('../server/storage.js', () => ({
  readJSON: () => ({}),
  writeJSON: () => {},
}));

import { signCallback, verifyCallback, trackPageVisit, canNotify, state } from '../server/state.js';

describe('signCallback / verifyCallback', () => {
  it('signs and verifies a callback', () => {
    const sig = signCallback('ban', '1.2.3.4');
    expect(sig).toHaveLength(32);
    expect(verifyCallback('ban', '1.2.3.4', sig)).toBe(true);
  });
  it('rejects wrong signature', () => {
    expect(verifyCallback('ban', '1.2.3.4', '00000000000000000000000000000000')).toBe(false);
  });
  it('rejects wrong IP', () => {
    const sig = signCallback('ban', '1.2.3.4');
    expect(verifyCallback('ban', '5.6.7.8', sig)).toBe(false);
  });
  it('rejects wrong action', () => {
    const sig = signCallback('ban', '1.2.3.4');
    expect(verifyCallback('unban', '1.2.3.4', sig)).toBe(false);
  });
  it('rejects too-short signature', () => {
    expect(verifyCallback('ban', '1.2.3.4', 'abc')).toBe(false);
  });
});

describe('trackPageVisit', () => {
  beforeEach(() => {
    state.IP_VISITS = {};
  });

  it('creates new entry for unknown IP', () => {
    trackPageVisit('1.2.3.4', '/login');
    expect(state.IP_VISITS['1.2.3.4']).toBeDefined();
    expect(state.IP_VISITS['1.2.3.4'].pages['/login']).toBe(1);
    expect(state.IP_VISITS['1.2.3.4'].total).toBe(1);
    expect(state.IP_VISITS['1.2.3.4'].lastPage).toBe('/login');
  });
  it('increments page count', () => {
    trackPageVisit('1.2.3.4', '/login');
    trackPageVisit('1.2.3.4', '/login');
    trackPageVisit('1.2.3.4', '/visit');
    expect(state.IP_VISITS['1.2.3.4'].pages['/login']).toBe(2);
    expect(state.IP_VISITS['1.2.3.4'].pages['/visit']).toBe(1);
    expect(state.IP_VISITS['1.2.3.4'].total).toBe(3);
  });
  it('ignores empty ip or page', () => {
    trackPageVisit('', '/login');
    trackPageVisit('1.2.3.4', '');
    expect(Object.keys(state.IP_VISITS)).toHaveLength(0);
  });
});

describe('canNotify', () => {
  beforeEach(() => {
    state.NOTIF_THROTTLE = { count: 0, windowStart: Date.now() };
  });

  it('allows first 5 notifications in window', () => {
    for (let i = 0; i < 5; i++) expect(canNotify()).toBe(true);
  });
  it('blocks 6th notification', () => {
    for (let i = 0; i < 5; i++) canNotify();
    expect(canNotify()).toBe(false);
  });
  it('resets after 30s window', () => {
    state.NOTIF_THROTTLE.windowStart = Date.now() - 31000;
    state.NOTIF_THROTTLE.count = 5;
    expect(canNotify()).toBe(true);
    expect(state.NOTIF_THROTTLE.count).toBe(0);
  });
});
