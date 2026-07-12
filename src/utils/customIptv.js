const STORAGE_KEY = 'webtv-custom-iptv';

/**
 * Construit l'URL M3U au format Xtream Codes API
 * Format: http://server:port/get.php?username=xxx&password=xxx&type=m3u_plus
 */
export function buildM3UUrl(server, username, password) {
  let base = server.trim().replace(/\/+$/, '');
  if (!base.startsWith('http://') && !base.startsWith('https://')) {
    base = 'http://' + base;
  }
  const params = new URLSearchParams({
    username: username.trim(),
    password: password.trim(),
    type: 'm3u_plus',
  });
  return `${base}/get.php?${params.toString()}`;
}

/**
 * Récupère les identifiants IPTV custom depuis le localStorage
 */
export function getCustomIptv() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.server && data.username && data.password) return data;
    return null;
  } catch {
    return null;
  }
}

/**
 * Sauvegarde les identifiants IPTV custom
 */
export function setCustomIptv(server, username, password) {
  const data = { server: server.trim(), username: username.trim(), password: password.trim() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

/**
 * Supprime les identifiants IPTV custom
 */
export function clearCustomIptv() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Vérifie si des identifiants custom sont configurés
 */
export function hasCustomIptv() {
  return getCustomIptv() !== null;
}
