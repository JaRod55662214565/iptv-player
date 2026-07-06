const STUB_REASON = 'Supabase temporairement desactive (problemes serveur)';

export function isConfigured() {
  return false;
}

export async function register(_email, _password, _pseudo) {
  throw new Error(STUB_REASON);
}

export async function login(_email, _password) {
  throw new Error(STUB_REASON);
}
