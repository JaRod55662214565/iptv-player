const BASE = '/api/admin';

let token = null;

export function setToken(t) {
  token = t;
}

async function request(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const resp = await fetch(`${BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return resp.json();
}

export function login(password) {
  return request('/auth', 'POST', { password });
}

export function fetchVisits(limit = 100) {
  return request(`/visits?limit=${limit}`);
}

export function fetchBans() {
  return request('/bans');
}

export function banIP(ip, reason = '') {
  return request('/ban', 'POST', { ip, reason });
}

export function unbanIP(ip) {
  return request('/unban', 'POST', { ip });
}

export function fetchPremiums() {
  return request('/premiums');
}

export function makePremium(ip) {
  return request('/make-premium', 'POST', { ip });
}

export function removePremium(ip) {
  return request('/remove-premium', 'POST', { ip });
}

export async function triggerPushAd(ip) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const resp = await fetch('/api/ads/trigger-push', {
    method: 'POST',
    headers,
    body: JSON.stringify({ targetIP: ip || null }),
  });
  return resp.json();
}

export function fetchBlockedASN() {
  return request('/blocked-asn');
}

export function addBlockedASN(asn, label = '') {
  return request('/add-blocked-asn', 'POST', { asn, label });
}

export function removeBlockedASN(asn) {
  return request('/remove-blocked-asn', 'POST', { asn });
}

export function fetchFunctions() {
  return request('/functions');
}

export function updateFunctions(functions) {
  return request('/functions', 'POST', functions);
}

export function fetchTelegramStatus() {
  return request('/telegram-status');
}

export function fetchCountries() {
  return request('/countries');
}

export function updateCountries(countries) {
  return request('/countries', 'POST', countries);
}

export function fetchIpVisits(limit = 50) {
  return request(`/ip-visits?limit=${limit}`);
}
