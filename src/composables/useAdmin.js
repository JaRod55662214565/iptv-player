import { ref, computed } from 'vue';
import * as adminApi from '../api/admin';

export function useAdmin() {
  const authenticated = ref(false);
  const loading = ref(false);
  const loginError = ref('');
  const visits = ref([]);
  const bans = ref([]);
  const premiums = ref([]);

  const datacenterCount = computed(() => visits.value.filter(v => v.isDatacenter).length);
  const bannedCount = computed(() => visits.value.filter(v => v.isBanned).length);
  const premiumCount = computed(() => premiums.value.length);

  async function login(password) {
    loading.value = true;
    loginError.value = '';
    try {
      const result = await adminApi.login(password);
      if (result.ok) {
        adminApi.setToken(result.token);
        authenticated.value = true;
        await loadAll();
      } else {
        loginError.value = result.error || 'Mot de passe incorrect';
      }
    } catch {
      loginError.value = 'Erreur de connexion';
    }
    loading.value = false;
  }

  async function loadVisits() {
    const data = await adminApi.fetchVisits(100);
    if (Array.isArray(data)) visits.value = data;
  }

  async function loadBans() {
    const data = await adminApi.fetchBans();
    if (Array.isArray(data)) bans.value = data;
  }

  async function loadPremiums() {
    const data = await adminApi.fetchPremiums();
    if (Array.isArray(data)) premiums.value = data;
  }

  async function loadAll() {
    await Promise.all([loadVisits(), loadBans(), loadPremiums()]);
  }

  async function ban(ip) {
    if (!ip) return;
    await adminApi.banIP(ip, 'Banni depuis le panel admin');
    await loadAll();
  }

  async function unban(ip) {
    await adminApi.unbanIP(ip);
    await loadAll();
  }

  async function makePremium(ip) {
    if (!ip) return;
    await adminApi.makePremium(ip);
    await loadAll();
  }

  async function removePremium(ip) {
    await adminApi.removePremium(ip);
    await loadAll();
  }

  async function pushAd(ip) {
    await adminApi.triggerPushAd(ip);
  }

  return {
    authenticated, loading, loginError,
    visits, bans, premiums,
    datacenterCount, bannedCount, premiumCount,
    login, loadAll, loadVisits, loadBans, loadPremiums, ban, unban,
    makePremium, removePremium, pushAd,
  };
}
