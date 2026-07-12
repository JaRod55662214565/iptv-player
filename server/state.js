import { config } from './config.js';
import { readJSON, writeJSON } from './storage.js';

export const state = {
  ADMIN_TOKEN: null,
  loginAttempts: new Map(),
  VISITS: [],
  BANS_LOOKUP: new Set(),
  WHITELIST_LOOKUP: new Set(),
  PREMIUM_LOOKUP: new Set(),
  VPN_RANGES: [],
  BLOCKED_ASN: new Set(),
  BLOCKED_ASN_META: new Map(),
  PENDING_AD_PUSH: 0,
  PENDING_AD_PUSH_IP: null,
  telegramNotifyCache: new Map(),
  channelNotifyCache: new Map(),
  ADS_DATA: null,
  FAVORITES_DATA: {},
  FUNCTIONS: { allowVpn: false, allowProxy: false, allowTor: false },
  COUNTRIES: { allowed: [], blocked: [] },
};

export function loadBans() {
  state.BANS_LOOKUP.clear();
  const bans = readJSON(config.BANS_FILE);
  if (Array.isArray(bans)) for (const b of bans) state.BANS_LOOKUP.add(b.ip);
  return bans;
}

export function saveBans(bans) {
  writeJSON(config.BANS_FILE, bans);
  loadBans();
}

function loadWhitelist() {
  state.WHITELIST_LOOKUP.clear();
  const list = readJSON(config.WHITELIST_FILE);
  if (Array.isArray(list)) for (const ip of list) state.WHITELIST_LOOKUP.add(ip);
  return list;
}

function saveWhitelist(list) {
  writeJSON(config.WHITELIST_FILE, list);
  loadWhitelist();
}

export function loadPremium() {
  state.PREMIUM_LOOKUP.clear();
  const list = readJSON(config.PREMIUM_FILE);
  if (Array.isArray(list)) for (const p of list) state.PREMIUM_LOOKUP.add(p.ip);
  return list;
}

function savePremium(list) {
  writeJSON(config.PREMIUM_FILE, list);
  loadPremium();
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function resetTodayIfNeeded() {
  const today = getTodayStr();
  if (state.ADS_DATA.todayDate !== today) {
    state.ADS_DATA.today = 0;
    state.ADS_DATA.todayDate = today;
    saveAds();
  }
}

export function saveAds() {
  writeJSON(config.ADS_FILE, state.ADS_DATA);
}

export function loadState() {
  state.VISITS = readJSON(config.VISITS_FILE);
  loadBans();
  loadWhitelist();
  loadPremium();
  loadFavorites();
  loadBlockedASN();
  loadFunctions();
  loadCountries();
  state.ADS_DATA = readJSON(config.ADS_FILE);
  if (!state.ADS_DATA || typeof state.ADS_DATA.total !== 'number') {
    state.ADS_DATA = { total: 0, today: 0, todayDate: '', impressions: [] };
  }
  state.PENDING_AD_PUSH = 0;
  state.PENDING_AD_PUSH_IP = null;
}

export function loadFavorites() {
  state.FAVORITES_DATA = readJSON(config.FAVORITES_FILE);
  if (typeof state.FAVORITES_DATA !== 'object' || Array.isArray(state.FAVORITES_DATA)) {
    state.FAVORITES_DATA = {};
  }
}

export function saveFavorites() {
  writeJSON(config.FAVORITES_FILE, state.FAVORITES_DATA);
}

export function loadBlockedASN() {
  state.BLOCKED_ASN.clear();
  state.BLOCKED_ASN_META.clear();
  const list = readJSON(config.BLOCKED_ASN_FILE);
  if (Array.isArray(list)) {
    for (const entry of list) {
      state.BLOCKED_ASN.add(entry.asn);
      if (entry.label) state.BLOCKED_ASN_META.set(entry.asn, entry.label);
    }
  }
  return list;
}

function saveBlockedASN(list) {
  writeJSON(config.BLOCKED_ASN_FILE, list);
  loadBlockedASN();
}

export function loadFunctions() {
  const data = readJSON(config.FUNCTIONS_FILE);
  state.FUNCTIONS = {
    allowVpn: !!(data && data.allowVpn),
    allowProxy: !!(data && data.allowProxy),
    allowTor: !!(data && data.allowTor),
  };
  return state.FUNCTIONS;
}

export function saveFunctions(data) {
  writeJSON(config.FUNCTIONS_FILE, data);
  state.FUNCTIONS = { ...data };
}

export function loadCountries() {
  const data = readJSON(config.COUNTRIES_FILE);
  state.COUNTRIES = {
    allowed: Array.isArray(data?.allowed) ? data.allowed : [],
    blocked: Array.isArray(data?.blocked) ? data.blocked : [],
  };
  return state.COUNTRIES;
}

export function saveCountries(data) {
  writeJSON(config.COUNTRIES_FILE, data);
  state.COUNTRIES = { allowed: [...(data.allowed || [])], blocked: [...(data.blocked || [])] };
}

export { saveWhitelist, savePremium, saveBlockedASN, resetTodayIfNeeded };
