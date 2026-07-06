<template>
  <div class="admin-overlay" @click.self="$emit('close')">
    <div class="admin-modal" @click.stop>
      <div class="admin-header">
        <h2 class="admin-title">🔐 Panneau Admin</h2>
        <div class="admin-header-actions">
          <a v-if="isPanelPage" href="/" class="admin-back">← Retour</a>
          <button class="admin-close" @click="$emit('close')">&times;</button>
        </div>
      </div>

      <div v-if="!authenticated" class="admin-login">
        <!-- CAPTCHA STAGE -->
        <div v-if="!captchaPassed" class="captcha-container">
          <p class="captcha-prompt">Prouvez que vous êtes humain en résolvant ce calcul :</p>
          <div class="captcha-equation">
            {{ captchaA }} {{ captchaOp }} {{ captchaB }} = ?
          </div>
          <div class="login-row">
            <input
              v-model="captchaAnswer"
              type="number"
              placeholder="Votre réponse"
              class="captcha-input"
              @keyup.enter="verifyCaptcha"
            />
            <button @click="verifyCaptcha">Vérifier</button>
          </div>
          <p v-if="captchaError" class="error-msg">Mauvaise réponse. Réessayez.</p>
        </div>

        <!-- PASSWORD STAGE -->
        <div v-else>
          <p class="captcha-success">🟢 Captcha validé avec succès !</p>
          <p>Entrez le mot de passe administrateur :</p>
          <div class="login-row">
            <input v-model="password" type="password" placeholder="Mot de passe" @keyup.enter="handleLogin" />
            <button @click="handleLogin" :disabled="loading">{{ loading ? '...' : 'Connexion' }}</button>
          </div>
          <p v-if="loginError" class="error-msg">{{ loginError }}</p>
        </div>
      </div>

      <template v-else>
        <div class="admin-tabs">
          <button :class="{ active: tab === 'visits' }" @click="tab = 'visits'">Visites</button>
          <button :class="{ active: tab === 'bans' }" @click="tab = 'bans'">Bannis</button>
          <button :class="{ active: tab === 'premiums' }" @click="tab = 'premiums'">Premiums</button>
        </div>

        <div v-if="tab === 'visits'" class="admin-content">
          <div class="visit-stats">
            <div class="stat">Total: <strong>{{ visits.length }}</strong></div>
            <div class="stat">Datacenters: <strong>{{ datacenterCount }}</strong></div>
            <div class="stat">Premium: <strong>{{ premiumCount }}</strong></div>
            <div class="stat">Bannis: <strong>{{ bannedCount }}</strong></div>
            <button class="refresh-btn" @click="loadAll">&#x21bb;</button>
          </div>
          <div class="visit-list">
            <div v-for="v in visits" :key="v.id" class="visit-item" :class="{ banned: v.isBanned, datacenter: v.isDatacenter && !v.isBanned, premium: isIPPremium(v.ip) }">
              <div class="visit-head">
                <span class="visit-status">{{ v.isBanned ? '🚫' : isIPPremium(v.ip) ? '💎' : v.isDatacenter ? '🤖' : v.isProxy ? '⚠️' : '🟢' }}</span>
                <span class="visit-ip"><code>{{ v.ip }}</code></span>
                <span class="visit-country">{{ v.countryCode || '' }}</span>
                <span class="visit-isp">{{ v.isp }}</span>
              </div>
              <div class="visit-body">
                <span><b>App:</b> {{ v.deviceType }} — {{ v.browser }} {{ v.os }}</span>
                <span v-if="v.city"><b>Ville:</b> {{ v.city }}{{ v.region ? ', ' + v.region : '' }}</span>
              </div>
              <div v-if="v.channelName || v.streamUrl" class="visit-channel-info">
                <span>📺 <b>Chaîne :</b> {{ v.channelName || 'Page d\'accueil' }}</span>
                <span v-if="v.streamUrl" class="visit-stream-url">🔗 <code>{{ v.streamUrl }}</code></span>
              </div>
              <div class="visit-actions">
                <button v-if="!v.isBanned" class="ban-btn" @click="ban(v.ip)">Bannir</button>
                <button v-else class="unban-btn" @click="unban(v.ip)">Debannir</button>
                
                <button v-if="!isIPPremium(v.ip)" class="premium-btn" @click="makePremium(v.ip)">Premium</button>
                <button v-else class="depremium-btn" @click="removePremium(v.ip)">Retirer Premium</button>
              </div>
            </div>
            <div v-if="visits.length === 0" class="empty">Aucune visite</div>
          </div>
        </div>

        <div v-if="tab === 'bans'" class="admin-content">
          <div class="ban-row">
            <input v-model="banIPInput" type="text" placeholder="IP a bannir" @keyup.enter="handleBan(banIPInput)" />
            <button @click="handleBan(banIPInput)">Bannir</button>
          </div>
          <div class="ban-list">
            <div v-for="b in bans" :key="b.ip" class="ban-item">
              <span><code>{{ b.ip }}</code></span>
              <span v-if="b.reason" class="ban-reason">{{ b.reason }}</span>
              <span class="ban-date">{{ formatDate(b.date) }}</span>
              <button class="unban-btn" @click="unban(b.ip)">Debannir</button>
            </div>
            <div v-if="bans.length === 0" class="empty">Aucun IP banni</div>
          </div>
        </div>

        <div v-if="tab === 'premiums'" class="admin-content">
          <div class="ban-row">
            <input v-model="premiumIPInput" type="text" placeholder="IP à rendre Premium" @keyup.enter="handleMakePremium(premiumIPInput)" />
            <button @click="handleMakePremium(premiumIPInput)" class="premium-add-btn">Ajouter Premium</button>
          </div>
          <div class="ban-list">
            <div v-for="p in premiums" :key="p.ip" class="ban-item premium-item">
              <span><code>{{ p.ip }}</code></span>
              <span class="ban-date">{{ formatDate(p.date) }}</span>
              <button class="depremium-btn" @click="removePremium(p.ip)">Retirer Premium</button>
            </div>
            <div v-if="premiums.length === 0" class="empty">Aucun IP Premium</div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAdmin } from '../composables/useAdmin';

defineEmits(['close']);

const {
  authenticated, loading, loginError,
  visits, bans, premiums,
  datacenterCount, bannedCount, premiumCount,
  login, loadAll, ban, unban, makePremium, removePremium,
} = useAdmin();

const isPanelPage = window.location.pathname === '/panel';
const password = ref('');
const tab = ref('visits');
const banIPInput = ref('');
const premiumIPInput = ref('');

// Captcha State
const captchaA = ref(0);
const captchaB = ref(0);
const captchaOp = ref('+');
const captchaAnswer = ref('');
const captchaPassed = ref(false);
const captchaError = ref(false);
let captchaCorrectAnswer = 0;

function generateCaptcha() {
  const ops = ['+', '-', '×'];
  captchaOp.value = ops[Math.floor(Math.random() * ops.length)];
  switch (captchaOp.value) {
    case '+':
      captchaA.value = Math.floor(Math.random() * 50) + 1;
      captchaB.value = Math.floor(Math.random() * 50) + 1;
      captchaCorrectAnswer = captchaA.value + captchaB.value;
      break;
    case '-':
      captchaA.value = Math.floor(Math.random() * 50) + 10;
      captchaB.value = Math.floor(Math.random() * (captchaA.value - 1)) + 1;
      captchaCorrectAnswer = captchaA.value - captchaB.value;
      break;
    case '×':
      captchaA.value = Math.floor(Math.random() * 12) + 2;
      captchaB.value = Math.floor(Math.random() * 10) + 2;
      captchaCorrectAnswer = captchaA.value * captchaB.value;
      break;
  }
  captchaAnswer.value = '';
  captchaError.value = false;
}

function verifyCaptcha() {
  const num = parseInt(captchaAnswer.value, 10);
  if (num === captchaCorrectAnswer) {
    captchaPassed.value = true;
    captchaError.value = false;
  } else {
    captchaError.value = true;
    fetch('/api/captcha/failed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'admin',
        equation: `${captchaA.value} ${captchaOp.value} ${captchaB.value}`,
        input: captchaAnswer.value,
      }),
    }).catch(() => {})
    setTimeout(generateCaptcha, 600);
  }
}

// Initial captcha generation
generateCaptcha();

function handleLogin() {
  login(password.value);
}

function handleBan(ip) {
  ban(ip);
  banIPInput.value = '';
}

function handleMakePremium(ip) {
  makePremium(ip);
  premiumIPInput.value = '';
}

function isIPPremium(ip) {
  return premiums.value && premiums.value.some(p => p.ip === ip);
}

function formatDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleString(); } catch { return d; }
}
</script>

<style scoped lang="less">
.admin-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  backdrop-filter: blur(8px);
}

.admin-modal {
  background: linear-gradient(135deg, rgba(10,10,20,0.98), rgba(20,15,35,0.95));
  border: 1px solid var(--border-color, rgba(0,217,255,0.2));
  border-radius: 16px;
  width: 95%;
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,217,255,0.1);
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid var(--border-light);
}

.admin-title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
}

.admin-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.admin-back {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.85rem;
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  transition: all 0.2s;
  &:hover {
    color: var(--primary-neon);
    border-color: var(--primary-neon);
  }
}

.admin-close {
  background: rgba(0,217,255,0.1);
  border: 1px solid var(--border-color);
  color: var(--primary-neon);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 8px;
  transition: all 0.3s;
  &:hover {
    background: var(--primary-neon);
    color: var(--bg-darker);
    transform: rotate(90deg);
  }
}

.admin-login {
  padding: 2rem;
  text-align: center;
  p { color: var(--text-secondary); margin: 0 0 1rem; }
}

.captcha-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.captcha-prompt {
  font-size: 0.95rem;
  color: var(--text-secondary);
}

.captcha-equation {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-neon);
  margin: 1rem 0;
  letter-spacing: 0.05em;
}

.captcha-success {
  color: #22c55e !important;
  font-weight: bold;
  margin-bottom: 1rem;
}

.login-row {
  display: flex;
  gap: 0.8rem;
  justify-content: center;
  input {
    padding: 0.8rem;
    border: 1px solid var(--border-light);
    border-radius: 8px;
    background: rgba(0,217,255,0.05);
    color: var(--text-primary);
    font-size: 1rem;
    &:focus { outline: none; border-color: var(--primary-neon); }
  }
  button {
    padding: 0.8rem 1.5rem;
    background: var(--primary-neon);
    border: none;
    border-radius: 8px;
    color: var(--bg-darker);
    font-weight: 700;
    cursor: pointer;
    &:disabled { opacity: 0.5; }
  }
}

.error-msg {
  color: #ef4444;
  font-size: 0.85rem;
  margin-top: 0.5rem !important;
}

.admin-tabs {
  display: flex;
  gap: 0;
  padding: 0.8rem 1.5rem;
  border-bottom: 1px solid var(--border-light);
  button {
    flex: 1;
    padding: 0.6rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-tertiary);
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition: all 0.2s;
    &.active { color: var(--primary-neon); border-bottom-color: var(--primary-neon); }
    &:hover { color: var(--primary-neon); }
  }
}

.admin-content {
  padding: 1rem 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.visit-stats {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.8rem;
  background: rgba(0,217,255,0.05);
  border-radius: 8px;
  border: 1px solid var(--border-light);
  flex-wrap: wrap;
}

.stat {
  font-size: 0.85rem;
  color: var(--text-secondary);
  strong { color: var(--primary-neon); }
}

.refresh-btn {
  margin-left: auto;
  background: none;
  border: 1px solid var(--border-color);
  color: var(--primary-neon);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  transition: all 0.2s;
  &:hover { background: rgba(0,217,255,0.1); }
}

.visit-list, .ban-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.visit-item {
  padding: 0.8rem;
  background: rgba(0,217,255,0.03);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  transition: all 0.2s;
  &:hover { background: rgba(0,217,255,0.06); }
  &.banned { border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.05); }
  &.datacenter { border-color: rgba(255,165,0,0.3); }
  &.premium { border-color: rgba(0,217,255,0.4); background: rgba(0,217,255,0.03); }
}

.visit-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.visit-status { font-size: 1rem; }

.visit-ip code {
  font-size: 0.85rem;
  color: var(--primary-neon);
  background: rgba(0,217,255,0.1);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.visit-country {
  font-size: 1.1rem;
}

.visit-isp {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  flex: 1;
  text-align: right;
}

.visit-body {
  margin-top: 0.4rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.visit-channel-info {
  margin-top: 0.4rem;
  font-size: 0.8rem;
  color: var(--primary-neon);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  .visit-stream-url {
    color: var(--text-tertiary);
    word-break: break-all;
    code {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 0.1rem 0.3rem;
      border-radius: 4px;
      color: var(--text-secondary);
    }
  }
}

.visit-actions {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.5rem;
  button {
    font-size: 0.75rem;
    padding: 0.3rem 0.8rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-weight: 600;
  }
}

.ban-btn {
  background: rgba(239,68,68,0.15);
  color: #ef4444;
  &:hover { background: rgba(239,68,68,0.3); }
}

.unban-btn {
  background: rgba(34,197,94,0.15);
  color: #22c55e;
  &:hover { background: rgba(34,197,94,0.3); }
}

.premium-btn {
  background: rgba(0,217,255,0.15);
  color: #00d9ff;
  &:hover { background: rgba(0,217,255,0.3); }
}

.depremium-btn {
  background: rgba(255,165,0,0.15);
  color: #ffa500;
  &:hover { background: rgba(255,165,0,0.3); }
}

.premium-add-btn {
  padding: 0.7rem 1.2rem;
  background: #00d9ff !important;
  border: none;
  border-radius: 8px;
  color: #05050f !important;
  font-weight: 700;
  cursor: pointer;
}

.ban-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.7rem;
  background: rgba(239,68,68,0.05);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 8px;
  font-size: 0.85rem;
  code { color: var(--primary-neon); }
  .ban-reason { color: var(--text-tertiary); flex: 1; }
  .ban-date { color: var(--text-tertiary); font-size: 0.75rem; }
}

.premium-item {
  background: rgba(0,217,255,0.03) !important;
  border: 1px solid rgba(0,217,255,0.2) !important;
  .depremium-btn {
    margin-left: auto;
  }
}

.ban-row {
  display: flex;
  gap: 0.8rem;
  margin-bottom: 1rem;
  input {
    flex: 1;
    padding: 0.7rem;
    border: 1px solid var(--border-light);
    border-radius: 8px;
    background: rgba(0,217,255,0.05);
    color: var(--text-primary);
    &:focus { outline: none; border-color: var(--primary-neon); }
  }
  button {
    padding: 0.7rem 1.2rem;
    background: #ef4444;
    border: none;
    border-radius: 8px;
    color: #fff;
    font-weight: 700;
    cursor: pointer;
  }
}

.empty {
  text-align: center;
  color: var(--text-tertiary);
  padding: 2rem;
  font-style: italic;
}
</style>
