const BASE = '/api/admin';

let token = null;

export function setToken(t) {
  token = t;
}

export function getToken() {
  return token;
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
