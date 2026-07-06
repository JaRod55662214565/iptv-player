const STUB_REASON = 'Supabase temporairement désactivé (problèmes serveur)';

export function getSupabase() {
  return null;
}

export function isConfigured() {
  return false;
}

export async function register(_email, _password, _pseudo) {
  throw new Error(STUB_REASON);
}

export async function login(_email, _password) {
  throw new Error(STUB_REASON);
}

export async function logout() {}

export async function getSession() {
  return null;
}

export function onAuthChange(callback) {
  callback(null);
  return () => {};
}

export async function getProfile(_userId) {
  return null;
}

export async function resetPassword(_email) {
  throw new Error(STUB_REASON);
}
