import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Stripe from 'stripe';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

export const config = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
  SITE_URL: process.env.SITE_URL || 'https://localhost',
  WEBHOOK_URL: process.env.WEBHOOK_URL || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || '',
  ADMIN_TOKEN_EXPIRY_MS: 24 * 60 * 60 * 1000,
  PROXY_RATE_LIMIT: parseInt(process.env.PROXY_RATE_LIMIT || '100', 10),
  PROXY_RATE_WINDOW_MS: 60000,
  PROXY_BODY_SIZE_LIMIT_MB: parseInt(process.env.PROXY_BODY_SIZE_LIMIT_MB || '50', 10),
  PROXY_ALLOWED_PORTS: process.env.PROXY_ALLOWED_PORTS || '80,443',
  TRACKING_RATE_LIMIT: parseInt(process.env.TRACKING_RATE_LIMIT || '60', 10),
  CAPTCHA_RATE_LIMIT: parseInt(process.env.CAPTCHA_RATE_LIMIT || '10', 10),
  STRIPE_RATE_LIMIT: parseInt(process.env.STRIPE_RATE_LIMIT || '5', 10),
  RATE_WINDOW_MS: 60000,
  BLOCKLIST_URL: 'https://raw.githubusercontent.com/josephrocca/is-vpn/main/vpn-or-datacenter-ipv4-ranges.txt',
  PUSH_EXPIRY_MS: 30000,
  DATA_DIR,
  BANS_FILE: path.join(DATA_DIR, 'bans.json'),
  WHITELIST_FILE: path.join(DATA_DIR, 'whitelist.json'),
  PREMIUM_FILE: path.join(DATA_DIR, 'premium.json'),
  VISITS_FILE: path.join(DATA_DIR, 'visits.json'),
  BLOCKLIST_FILE: path.join(DATA_DIR, 'vpn-datacenter.txt'),
  ADS_FILE: path.join(DATA_DIR, 'ads.json'),
  FAVORITES_FILE: path.join(DATA_DIR, 'favorites.json'),
  BLOCKED_ASN_FILE: path.join(DATA_DIR, 'blocked-asn.json'),
  PLAYLIST_USER: process.env.PLAYLIST_USER || '',
  PLAYLIST_PASSWORD: process.env.PLAYLIST_PASSWORD || '',
  PLAYLIST_CACHE_FILE: path.join(DATA_DIR, 'playlist-cache.json'),
  FUNCTIONS_FILE: path.join(DATA_DIR, 'functions.json'),
  COUNTRIES_FILE: path.join(DATA_DIR, 'countries.json'),
};

export function getStripe() {
  if (!config.STRIPE_SECRET_KEY) return null;
  return new Stripe(config.STRIPE_SECRET_KEY);
}

