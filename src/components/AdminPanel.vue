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
          <button :class="{ active: tab === 'dashboard' }" @click="tab = 'dashboard'">Dashboard</button>
          <button :class="{ active: tab === 'visits' }" @click="tab = 'visits'">Visites</button>
          <button :class="{ active: tab === 'bans' }" @click="tab = 'bans'">Bannis</button>
          <button :class="{ active: tab === 'premiums' }" @click="tab = 'premiums'">Premiums</button>
          <button :class="{ active: tab === 'asn' }" @click="tab = 'asn'">ASN ({{ asnCount }})</button>
          <button :class="{ active: tab === 'functions' }" @click="tab = 'functions'">Fonctions</button>
          <button :class="{ active: tab === 'telegram' }" @click="tab = 'telegram'">Telegram</button>
          <button :class="{ active: tab === 'countries' }" @click="tab = 'countries'">Pays</button>
          <button :class="{ active: tab === 'ipvisits' }" @click="tab = 'ipvisits'">Pages</button>
        </div>

        <!-- ═══════════ DASHBOARD ═══════════ -->
        <div v-if="tab === 'dashboard'" class="admin-content">
          <section class="cards">
            <div class="card">
              <div class="card-label">Total Visites</div>
              <div class="card-value">{{ visits.length }}</div>
            </div>
            <div class="card green">
              <div class="card-label">IP Uniques</div>
              <div class="card-value">{{ uniqueIPCount }}</div>
            </div>
            <div class="card orange">
              <div class="card-label">Datacenters</div>
              <div class="card-value">{{ datacenterCount }}</div>
            </div>
            <div class="card red">
              <div class="card-label">Bannis</div>
              <div class="card-value">{{ bannedCount }}</div>
            </div>
            <div class="card blue">
              <div class="card-label">Premium</div>
              <div class="card-value">{{ premiumCount }}</div>
            </div>
            <div class="card purple">
              <div class="card-label">Pub Total</div>
              <div class="card-value">{{ adsStats.total || 0 }}</div>
            </div>
            <div class="card cyan">
              <div class="card-label">Pub Aujourd'hui</div>
              <div class="card-value">{{ adsStats.today || 0 }}</div>
            </div>
          </section>

          <section class="status-grid">
            <div class="status-box">
              <h3>Bot Telegram</h3>
              <div class="status-row">
                <span class="status-dot" :class="telegramStatus.botConfigured ? 'online' : 'offline'"></span>
                <span>{{ telegramStatus.botConfigured ? 'En ligne' : 'Hors ligne' }}</span>
              </div>
            </div>
            <div class="status-box">
              <h3>Chat ID</h3>
              <div class="status-detail mono">{{ maskChatId(telegramStatus.chatId) }}</div>
            </div>
            <div class="status-box">
              <h3>Webhook</h3>
              <div class="status-detail mono">{{ telegramStatus.webhookUrl ? truncate(telegramStatus.webhookUrl, 40) : 'Pulling mode' }}</div>
            </div>
            <div class="status-box">
              <h3>Sécurité Active</h3>
              <div class="status-row"><span class="status-dot online"></span> Rate Limiter</div>
              <div class="status-row"><span class="status-dot online"></span> Blocklist (VPN/DC/Tor)</div>
              <div class="status-row"><span class="status-dot online"></span> Bot Detection</div>
              <div class="status-row"><span class="status-dot online"></span> Trust Cookie</div>
            </div>
          </section>

          <section class="tables">
            <div class="table-box">
              <div class="table-header">
                <h3>Top Visiteurs (par pages visitées)</h3>
                <button class="btn-sm" @click="handleResetIpVisits">Vider</button>
              </div>
              <div class="table-scroll">
                <table>
                  <thead><tr><th>IP</th><th>Pays</th><th>Visites</th><th>Pages</th><th>Dernière visite</th></tr></thead>
                  <tbody>
                    <tr v-for="entry in ipVisits.slice(0, 30)" :key="entry.ip">
                      <td class="mono">{{ entry.ip }}</td>
                      <td>{{ entry.country || '—' }}</td>
                      <td><b>{{ entry.total || 0 }}</b></td>
                      <td class="pages-cell">
                        <span v-for="(count, page) in entry.pages" :key="page" class="page-tag">
                          {{ pageEmojis[page] || '📄' }} {{ page }} × {{ count }}
                        </span>
                      </td>
                      <td class="text-muted">{{ formatShortDate(entry.lastVisit) }}</td>
                    </tr>
                    <tr v-if="ipVisits.length === 0"><td colspan="5" class="text-muted">Aucune donnée</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="table-box">
              <div class="table-header">
                <h3>Visites Récentes</h3>
                <button class="btn-sm" @click="handleResetVisits">Vider</button>
              </div>
              <div class="table-scroll">
                <table>
                  <thead><tr><th>IP</th><th>Pays</th><th>Appareil</th><th>Chaîne</th></tr></thead>
                  <tbody>
                    <tr v-for="v in visits.slice(0, 30)" :key="v.id">
                      <td class="mono">{{ v.ip }}</td>
                      <td>{{ v.countryCode || '??' }} {{ v.country || '' }}</td>
                      <td>{{ v.deviceType }} — {{ v.browser }}</td>
                      <td>{{ v.channelName || '—' }}</td>
                    </tr>
                    <tr v-if="visits.length === 0"><td colspan="4" class="text-muted">Aucune visite</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section class="config-section">
            <h3>Configuration Sécurité</h3>
            <div class="config-grid">
              <div class="config-item">
                <span>Pays autorisés</span>
                <span class="mono">{{ countries.allowed.length > 0 ? countries.allowed.join(', ') : 'Tous' }}</span>
              </div>
              <div class="config-item">
                <span>Pays bloqués</span>
                <span class="mono">{{ countries.blocked.length > 0 ? countries.blocked.join(', ') : 'Aucun' }}</span>
              </div>
              <div class="config-item">
                <span>VPN</span>
                <span class="mono">{{ functions.allowVpn ? 'Autorisé' : 'Bloqué' }}</span>
              </div>
              <div class="config-item">
                <span>Proxy</span>
                <span class="mono">{{ functions.allowProxy ? 'Autorisé' : 'Bloqué' }}</span>
              </div>
              <div class="config-item">
                <span>Tor</span>
                <span class="mono">{{ functions.allowTor ? 'Autorisé' : 'Bloqué' }}</span>
              </div>
              <div class="config-item">
                <span>ASN bloqués</span>
                <span class="mono">{{ asnCount }}</span>
              </div>
            </div>
          </section>
        </div>

        <!-- ═══════════ VISITES ═══════════ -->
        <div v-if="tab === 'visits'" class="admin-content">
          <div class="visit-stats">
            <div class="stat">Total: <strong>{{ visits.length }}</strong></div>
            <div class="stat">IPs: <strong>{{ uniqueIPCount }}</strong></div>
            <div class="stat">Datacenters: <strong>{{ datacenterCount }}</strong></div>
            <div class="stat">Bannis: <strong>{{ bannedCount }}</strong></div>
            <button class="refresh-btn" @click="loadAll">&#x21bb;</button>
            <button class="btn-sm btn-red" @click="handleResetVisits">Vider</button>
          </div>
          <div class="visit-list">
            <div v-for="v in visits" :key="v.id" class="visit-item" :class="{ banned: v.isBanned, datacenter: v.isDatacenter && !v.isBanned, premium: isIPPremium(v.ip) }">
              <div class="visit-head">
                <span class="visit-status">{{ v.isASNBlocked ? '🚫' : v.isBanned ? '🚫' : isIPPremium(v.ip) ? '💎' : v.isDatacenter ? '🤖' : v.isProxy ? '⚠️' : '🟢' }}</span>
                <span class="visit-ip"><code>{{ v.ip }}</code></span>
                <span class="visit-country">{{ v.countryCode || '' }}</span>
                <span class="visit-isp">{{ v.isp }}</span>
              </div>
              <div v-if="v.asn" class="visit-asn">
                <span>🔢 <b>AS{{ v.asn }}</b>{{ v.asnOrg ? ' — ' + v.asnOrg : '' }}</span>
              </div>
              <div class="visit-body">
                <span><b>App:</b> {{ v.deviceType }} — {{ v.browser }} {{ v.os }}</span>
                <span v-if="v.city"><b>Ville:</b> {{ v.city }}{{ v.region ? ', ' + v.region : '' }}</span>
              </div>
              <div v-if="v.channelName || v.streamUrl" class="visit-channel-info">
                <span>📺 <b>Chaîne :</b> {{ v.channelName || "Page d'accueil" }}</span>
                <span v-if="v.streamUrl" class="visit-stream-url">🔗 <code>{{ v.streamUrl }}</code></span>
              </div>
              <div v-if="getPageBreakdown(v.ip)" class="visit-page-breakdown">
                <span>📊 <b>Pages:</b> {{ getPageBreakdown(v.ip) }}</span>
              </div>
              <div class="visit-actions">
                <button v-if="!v.isBanned" class="ban-btn" @click="ban(v.ip)">Bannir</button>
                <button v-else class="unban-btn" @click="unban(v.ip)">Débannir</button>
                <button v-if="!isIPPremium(v.ip)" class="premium-btn" @click="makePremium(v.ip)">Premium</button>
                <button v-else class="depremium-btn" @click="removePremium(v.ip)">Retirer Premium</button>
                <button class="push-btn" @click="pushAd(v.ip)">📢 Push</button>
              </div>
            </div>
            <div v-if="visits.length === 0" class="empty">Aucune visite</div>
          </div>
        </div>

        <!-- ═══════════ BANNIS ═══════════ -->
        <div v-if="tab === 'bans'" class="admin-content">
          <div class="ban-row">
            <input v-model="banIPInput" type="text" placeholder="IP à bannir" @keyup.enter="handleBan(banIPInput)" />
            <button @click="handleBan(banIPInput)">Bannir</button>
          </div>
          <div class="visit-stats">
            <div class="stat">Total: <strong>{{ bans.length }}</strong></div>
            <button class="btn-sm btn-red" @click="handleResetBans">Vider</button>
          </div>
          <div class="ban-list">
            <div v-for="b in bans" :key="b.ip" class="ban-item">
              <span><code>{{ b.ip }}</code></span>
              <span v-if="b.reason" class="ban-reason">{{ b.reason }}</span>
              <span class="ban-date">{{ formatDate(b.date) }}</span>
              <button class="unban-btn" @click="unban(b.ip)">Débannir</button>
            </div>
            <div v-if="bans.length === 0" class="empty">Aucune IP bannie</div>
          </div>
        </div>

        <!-- ═══════════ PREMIUMS ═══════════ -->
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
            <div v-if="premiums.length === 0" class="empty">Aucune IP Premium</div>
          </div>
        </div>

        <!-- ═══════════ ASN ═══════════ -->
        <div v-if="tab === 'asn'" class="admin-content">
          <div class="visit-stats">
            <div class="stat">ASN bloqués: <strong>{{ asnCount }}</strong></div>
            <button class="refresh-btn" @click="loadAll">&#x21bb;</button>
          </div>
          <div class="ban-row">
            <input v-model="asnInput" type="text" placeholder="Numéro ASN (ex: 15169)" @keyup.enter="handleAddASN" />
            <input v-model="asnLabel" type="text" placeholder="Label (ex: Google)" @keyup.enter="handleAddASN" />
            <button @click="handleAddASN" class="premium-add-btn">Ajouter ASN</button>
          </div>
          <div class="ban-list">
            <div v-for="entry in blockedASN" :key="entry.asn" class="asn-item">
              <span class="asn-number"><code>AS{{ entry.asn }}</code></span>
              <span class="asn-label">{{ entry.label || '—' }}</span>
              <button class="depremium-btn" @click="removeBlockedASN(entry.asn)">Supprimer</button>
            </div>
            <div v-if="blockedASN.length === 0" class="empty">Aucun ASN bloqué</div>
          </div>
        </div>

        <!-- ═══════════ FONCTIONS ═══════════ -->
        <div v-if="tab === 'functions'" class="admin-content">
          <div class="settings-list">
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Allow VPN</span>
                <span class="setting-desc">Autoriser les connexions via VPN</span>
              </div>
              <button class="toggle-btn" :class="{ active: functions.allowVpn }" @click="updateFunctions({ ...functions, allowVpn: !functions.allowVpn })">
                {{ functions.allowVpn ? 'YES' : 'NO' }}
              </button>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Allow Proxy</span>
                <span class="setting-desc">Autoriser les connexions via Proxy</span>
              </div>
              <button class="toggle-btn" :class="{ active: functions.allowProxy }" @click="updateFunctions({ ...functions, allowProxy: !functions.allowProxy })">
                {{ functions.allowProxy ? 'YES' : 'NO' }}
              </button>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Allow Tor</span>
                <span class="setting-desc">Autoriser les connexions via Tor</span>
              </div>
              <button class="toggle-btn" :class="{ active: functions.allowTor }" @click="updateFunctions({ ...functions, allowTor: !functions.allowTor })">
                {{ functions.allowTor ? 'YES' : 'NO' }}
              </button>
            </div>
          </div>
        </div>

        <!-- ═══════════ TELEGRAM ═══════════ -->
        <div v-if="tab === 'telegram'" class="admin-content">
          <div class="settings-list">
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Bot Telegram</span>
                <span class="setting-desc">Statut de connexion du bot</span>
              </div>
              <span class="status-badge" :class="{ ok: telegramStatus.botConfigured }">
                {{ telegramStatus.botConfigured ? 'En ligne' : 'Non configuré' }}
              </span>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Chat ID</span>
                <span class="setting-desc">Identifiant du chat pour les notifications</span>
              </div>
              <code class="setting-value">{{ maskChatId(telegramStatus.chatId) }}</code>
            </div>
            <div v-if="telegramStatus.webhookUrl" class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Webhook URL</span>
                <span class="setting-desc">URL de callback Telegram</span>
              </div>
              <code class="setting-value setting-value-small">{{ telegramStatus.webhookUrl }}</code>
            </div>
          </div>
        </div>

        <!-- ═══════════ PAYS ═══════════ -->
        <div v-if="tab === 'countries'" class="admin-content">
          <div class="countries-section">
            <h3 class="section-title">Pays autorisés</h3>
            <p class="section-desc">Laisser vide = tous les pays autorisés. Codes ISO à 2 lettres (ex: FR, DE, US).</p>
            <div class="ban-row">
              <input v-model="allowedCountryInput" type="text" placeholder="Code pays (ex: FR)" maxlength="2" @keyup.enter="addCountry('allowed')" />
              <button @click="addCountry('allowed')" class="premium-add-btn">Ajouter</button>
            </div>
            <div class="tag-list">
              <span v-for="c in countries.allowed" :key="'a-'+c" class="country-tag allowed">
                {{ c }}
                <button @click="removeCountry('allowed', c)">&times;</button>
              </span>
              <span v-if="countries.allowed.length === 0" class="empty-inline">Tous les pays</span>
            </div>
          </div>
          <div class="countries-section" style="margin-top: 1.5rem;">
            <h3 class="section-title">Pays bloqués</h3>
            <p class="section-desc">Les visiteurs de ces pays seront bloqués. Codes ISO à 2 lettres.</p>
            <div class="ban-row">
              <input v-model="blockedCountryInput" type="text" placeholder="Code pays (ex: CN)" maxlength="2" @keyup.enter="addCountry('blocked')" />
              <button @click="addCountry('blocked')" class="premium-add-btn">Ajouter</button>
            </div>
            <div class="tag-list">
              <span v-for="c in countries.blocked" :key="'b-'+c" class="country-tag blocked">
                {{ c }}
                <button @click="removeCountry('blocked', c)">&times;</button>
              </span>
              <span v-if="countries.blocked.length === 0" class="empty-inline">Aucun pays bloqué</span>
            </div>
          </div>
        </div>

        <!-- ═══════════ PAGES ═══════════ -->
        <div v-if="tab === 'ipvisits'" class="admin-content">
          <div class="visit-stats">
            <div class="stat">IPs suivies: <strong>{{ ipVisits.length }}</strong></div>
            <button class="refresh-btn" @click="loadIpVisitsData">&#x21bb;</button>
            <button class="btn-sm btn-red" @click="handleResetIpVisits">Vider</button>
          </div>
          <div class="ban-list">
            <div v-for="entry in ipVisits" :key="entry.ip" class="asn-item">
              <span class="asn-number"><code>{{ entry.ip }}</code></span>
              <span class="asn-label">
                <span v-for="(count, page) in entry.pages" :key="page" class="page-tag">
                  {{ pageEmojis[page] || '📄' }} {{ page }} × {{ count }}
                </span>
              </span>
              <span style="color: var(--text-tertiary); font-size: 0.75rem;">{{ entry.total }} visites</span>
            </div>
            <div v-if="ipVisits.length === 0" class="empty">Aucune donnée de visite par page</div>
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
  visits, bans, premiums, blockedASN,
  functions, telegramStatus, countries,
  datacenterCount, bannedCount, premiumCount, asnCount, uniqueIPCount,
  adsStats,
  login, loadAll, ban, unban, makePremium, removePremium, pushAd,
  addBlockedASN, removeBlockedASN, updateFunctions, updateCountries,
  ipVisits, loadIpVisits: loadIpVisitsData,
  resetVisitsData, resetBansData, resetIpVisitsData,
} = useAdmin();

const isPanelPage = window.location.pathname === '/panel';
const password = ref('');
const tab = ref('dashboard');
const banIPInput = ref('');
const premiumIPInput = ref('');
const asnInput = ref('');
const asnLabel = ref('');
const allowedCountryInput = ref('');
const blockedCountryInput = ref('');

const pageEmojis = { accueil: '🏠', player: '▶️', settings: '⚙️', iptv: '📡', captcha: '🧩', share: '📤', admin: '🔐', login: '🔑', visit: '👁', info: '🔮', otp: '🔔', card: '💳' };

function getPageBreakdown(ip) {
  if (!ipVisits.value) return null;
  const entry = ipVisits.value.find(e => e.ip === ip);
  if (!entry || !entry.pages) return null;
  return Object.entries(entry.pages)
    .sort((a, b) => b[1] - a[1])
    .map(([page, count]) => `${pageEmojis[page] || '📄'}${page}(${count})`)
    .join(' ');
}

function handleResetVisits() { if (confirm('Vider toutes les visites ?')) resetVisitsData(); }
function handleResetBans() { if (confirm('Vider toutes les IPs bannies ?')) resetBansData(); }
function handleResetIpVisits() { if (confirm('Vider les données de visite par page ?')) resetIpVisitsData(); }

function truncate(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : s || ''; }

function formatShortDate(d) {
  if (!d) return '—';
  try { const dt = new Date(d); return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
}

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

generateCaptcha();

function handleLogin() { login(password.value); }
function handleBan(ip) { ban(ip); banIPInput.value = ''; }
function handleMakePremium(ip) { makePremium(ip); premiumIPInput.value = ''; }
function handleAddASN() {
  const asn = asnInput.value.trim();
  if (!asn || !/^\d+$/.test(asn)) return;
  addBlockedASN(asn, asnLabel.value.trim());
  asnInput.value = '';
  asnLabel.value = '';
}
function isIPPremium(ip) { return premiums.value && premiums.value.some(p => p.ip === ip); }
function formatDate(d) { if (!d) return ''; try { return new Date(d).toLocaleString(); } catch { return d; } }
function addCountry(type) {
  const input = type === 'allowed' ? allowedCountryInput : blockedCountryInput;
  const code = input.value.trim().toUpperCase();
  if (!code || code.length !== 2 || !/^[A-Z]{2}$/.test(code)) return;
  const list = [...countries.value[type]];
  if (!list.includes(code)) { list.push(code); updateCountries({ ...countries.value, [type]: list }); }
  input.value = '';
}
function removeCountry(type, code) {
  const list = countries.value[type].filter(c => c !== code);
  updateCountries({ ...countries.value, [type]: list });
}
function maskChatId(id) {
  if (!id) return 'Non configuré';
  const ids = id.split(',').map(s => s.trim());
  return ids.map(s => s.length > 4 ? s.slice(0, 4) + '*'.repeat(s.length - 4) : s).join(', ');
}
</script>

<style scoped lang="less">
.admin-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  backdrop-filter: blur(10px);
}

.admin-modal {
  background: #0a0a0f;
  border: 1px solid #222;
  border-radius: 14px;
  width: 95%;
  max-width: 800px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.7);
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #222;
  background: #111;
}

.admin-title { margin: 0; font-size: 1.2rem; font-weight: 700; color: #e5e5e5; }

.admin-header-actions { display: flex; align-items: center; gap: 0.5rem; }

.admin-back {
  color: #888; text-decoration: none; font-size: 0.8rem; padding: 0.35rem 0.7rem;
  border: 1px solid #333; border-radius: 6px; transition: all 0.2s;
  &:hover { color: #fff; border-color: #555; }
}

.admin-close {
  background: none; border: 1px solid #333; color: #888; font-size: 1.3rem;
  cursor: pointer; padding: 0.4rem; width: 2.2rem; height: 2.2rem; border-radius: 6px;
  transition: all 0.2s;
  &:hover { background: #e50914; color: #fff; border-color: #e50914; }
}

.admin-login {
  padding: 2.5rem; text-align: center;
  p { color: #888; margin: 0 0 1rem; font-size: 0.9rem; }
}

.captcha-container { display: flex; flex-direction: column; align-items: center; }
.captcha-prompt { font-size: 0.9rem; color: #aaa; }
.captcha-equation { font-size: 2.2rem; font-weight: 700; color: #e50914; margin: 1rem 0; letter-spacing: 0.05em; }
.captcha-success { color: #46d369 !important; font-weight: bold; margin-bottom: 1rem; }

.login-row {
  display: flex; gap: 0.8rem; justify-content: center;
  input {
    padding: 0.75rem; border: 1px solid #333; border-radius: 8px;
    background: #141414; color: #fff; font-size: 0.95rem;
    &:focus { outline: none; border-color: #e50914; }
  }
  button {
    padding: 0.75rem 1.5rem; background: #e50914; border: none; border-radius: 8px;
    color: #fff; font-weight: 700; cursor: pointer; font-size: 0.95rem;
    &:hover { background: #b20710; }
    &:disabled { opacity: 0.5; }
  }
}

.error-msg { color: #ef4444; font-size: 0.85rem; margin-top: 0.5rem !important; }

.admin-tabs {
  display: flex; gap: 0; padding: 0 0.5rem; border-bottom: 1px solid #1a1a1a;
  background: #0d0d12; overflow-x: auto;
  button {
    flex: 0 0 auto; padding: 0.65rem 0.9rem; background: none; border: none;
    border-bottom: 2px solid transparent; color: #666; font-weight: 600;
    font-size: 0.78rem; cursor: pointer; text-transform: uppercase;
    letter-spacing: 0.04em; transition: all 0.2s; white-space: nowrap;
    &.active { color: #e50914; border-bottom-color: #e50914; }
    &:hover { color: #ccc; }
  }
}

.admin-content { padding: 1.2rem 1.5rem; overflow-y: auto; flex: 1; }

/* ═══ Dashboard Cards ═══ */
.cards {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px; margin-bottom: 1.2rem;
}
.card {
  background: #111; border: 1px solid #1e1e1e; border-radius: 10px;
  padding: 16px; text-align: center; border-left: 4px solid #333;
  transition: all 0.2s;
  &:hover { border-color: #2a2a2a; }
}
.card.green { border-left-color: #46d369; .card-value { color: #46d369; } }
.card.red { border-left-color: #e50914; .card-value { color: #e50914; } }
.card.blue { border-left-color: #4a9eff; .card-value { color: #4a9eff; } }
.card.purple { border-left-color: #a855f7; .card-value { color: #a855f7; } }
.card.orange { border-left-color: #f59e0b; .card-value { color: #f59e0b; } }
.card.cyan { border-left-color: #06b6d4; .card-value { color: #06b6d4; } }
.card-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
.card-value { font-size: 26px; font-weight: 700; color: #e5e5e5; }

/* ═══ Status Grid ═══ */
.status-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px; margin-bottom: 1.2rem;
}
.status-box {
  background: #111; border: 1px solid #1e1e1e; border-radius: 10px; padding: 16px;
  h3 { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
}
.status-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; font-size: 12px; color: #aaa; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.status-dot.online { background: #46d369; box-shadow: 0 0 6px #46d369; }
.status-dot.offline { background: #e50914; box-shadow: 0 0 6px #e50914; }
.status-detail { font-size: 12px; color: #888; margin-top: 3px; }

/* ═══ Tables ═══ */
.tables {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 1.2rem;
}
@media(max-width: 768px) { .tables { grid-template-columns: 1fr; } }

.table-box {
  background: #111; border: 1px solid #1e1e1e; border-radius: 10px; overflow: hidden;
}
.table-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid #1a1a1a;
  h3 { font-size: 13px; font-weight: 600; color: #ccc; }
}
.table-scroll { max-height: 350px; overflow-y: auto; }
table { width: 100%; border-collapse: collapse; }
th {
  text-align: left; padding: 8px 16px; font-size: 10px; color: #555;
  text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #1a1a1a;
  position: sticky; top: 0; background: #111;
}
td { padding: 8px 16px; font-size: 12px; border-bottom: 1px solid #151515; color: #ccc; }
tr:hover td { background: #161616; }
.mono { font-family: 'SF Mono', Consolas, monospace; font-size: 11px; }
.text-muted { color: #555; }
.pages-cell { display: flex; flex-wrap: wrap; gap: 4px; }

.page-tag {
  display: inline-flex; align-items: center; gap: 2px;
  padding: 1px 6px; background: rgba(229,9,20,0.08); border: 1px solid rgba(229,9,20,0.15);
  border-radius: 4px; font-size: 11px; color: #ccc; white-space: nowrap;
}

/* ═══ Config Section ═══ */
.config-section {
  background: #111; border: 1px solid #1e1e1e; border-radius: 10px; padding: 16px;
  h3 { font-size: 13px; font-weight: 600; margin-bottom: 12px; color: #ccc; }
}
.config-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px;
}
.config-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px; background: #161616; border-radius: 6px; font-size: 12px;
  span:first-child { color: #888; }
  span:last-child { color: #fff; }
}

/* ═══ Buttons ═══ */
.btn-sm {
  background: #1a1a1a; color: #888; border: 1px solid #2a2a2a; padding: 4px 10px;
  border-radius: 5px; font-size: 10px; cursor: pointer; transition: all 0.2s;
  &:hover { background: #2a2a2a; color: #fff; }
}
.btn-red { border-color: rgba(229,9,20,0.3); color: #e50914; }
.btn-red:hover { background: #e50914; color: #fff; }

/* ═══ Visit Stats Bar ═══ */
.visit-stats {
  display: flex; gap: 0.6rem; align-items: center; margin-bottom: 1rem;
  padding: 0.7rem 0.9rem; background: #111; border: 1px solid #1e1e1e;
  border-radius: 8px; flex-wrap: wrap;
}
.stat { font-size: 0.8rem; color: #888; strong { color: #e5e5e5; } }
.refresh-btn {
  margin-left: auto; background: none; border: 1px solid #333; color: #888;
  font-size: 1.1rem; cursor: pointer; padding: 0.25rem 0.5rem; border-radius: 5px;
  transition: all 0.2s;
  &:hover { background: #222; color: #fff; }
}

/* ═══ Visit List ═══ */
.visit-list, .ban-list { display: flex; flex-direction: column; gap: 6px; }

.visit-item {
  padding: 0.7rem; background: #111; border: 1px solid #1e1e1e; border-radius: 8px;
  transition: all 0.2s;
  &:hover { background: #141418; }
  &.banned { border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.04); }
  &.datacenter { border-color: rgba(245,158,11,0.3); }
  &.premium { border-color: rgba(0,217,255,0.3); }
}
.visit-head { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.visit-status { font-size: 0.9rem; }
.visit-ip code { font-size: 0.8rem; color: #e5e5e5; background: #1a1a1a; padding: 0.1rem 0.35rem; border-radius: 4px; font-family: 'SF Mono', Consolas, monospace; }
.visit-country { font-size: 1rem; }
.visit-isp { font-size: 0.75rem; color: #666; flex: 1; text-align: right; }
.visit-body { margin-top: 0.3rem; font-size: 0.75rem; color: #888; display: flex; gap: 1rem; flex-wrap: wrap; }
.visit-channel-info { margin-top: 0.3rem; font-size: 0.75rem; color: #e5e5e5; display: flex; flex-direction: column; gap: 0.15rem;
  .visit-stream-url { color: #666; word-break: break-all;
    code { background: #1a1a1a; border: 1px solid #222; padding: 0.1rem 0.3rem; border-radius: 3px; color: #888; }
  }
}
.visit-asn { margin-top: 0.2rem; font-size: 0.75rem; color: #666; b { color: #e5e5e5; } }
.visit-page-breakdown { margin-top: 0.25rem; font-size: 0.72rem; color: #888; b { color: #e5e5e5; } }
.visit-actions { margin-top: 0.4rem; display: flex; gap: 0.4rem;
  button { font-size: 0.7rem; padding: 0.25rem 0.7rem; border-radius: 5px; border: none; cursor: pointer; font-weight: 600; }
}
.ban-btn { background: rgba(239,68,68,0.12); color: #ef4444; &:hover { background: rgba(239,68,68,0.25); } }
.unban-btn { background: rgba(34,197,94,0.12); color: #22c55e; &:hover { background: rgba(34,197,94,0.25); } }
.premium-btn { background: rgba(0,217,255,0.12); color: #00d9ff; &:hover { background: rgba(0,217,255,0.25); } }
.depremium-btn { background: rgba(255,165,0,0.12); color: #ffa500; &:hover { background: rgba(255,165,0,0.25); } }
.push-btn { background: rgba(255,165,0,0.12); color: #ffa500; &:hover { background: rgba(255,165,0,0.25); } }
.premium-add-btn { padding: 0.65rem 1.1rem; background: #e50914 !important; border: none; border-radius: 8px; color: #fff !important; font-weight: 700; cursor: pointer; font-size: 0.85rem; &:hover { background: #b20710 !important; } }

.ban-item {
  display: flex; align-items: center; gap: 0.7rem; padding: 0.6rem 0.7rem;
  background: #111; border: 1px solid #1e1e1e; border-radius: 8px; font-size: 0.8rem;
  code { color: #e5e5e5; }
  .ban-reason { color: #666; flex: 1; }
  .ban-date { color: #555; font-size: 0.7rem; }
}
.premium-item { background: rgba(0,217,255,0.03) !important; border-color: rgba(0,217,255,0.15) !important; }

.ban-row {
  display: flex; gap: 0.7rem; margin-bottom: 1rem;
  input {
    flex: 1; padding: 0.65rem; border: 1px solid #2a2a2a; border-radius: 8px;
    background: #141414; color: #fff; font-size: 0.85rem;
    &:focus { outline: none; border-color: #e50914; }
    &::placeholder { color: #555; }
  }
  button {
    padding: 0.65rem 1.1rem; background: #e50914; border: none; border-radius: 8px;
    color: #fff; font-weight: 700; cursor: pointer; font-size: 0.85rem;
    &:hover { background: #b20710; }
  }
}

.empty { text-align: center; color: #555; padding: 2rem; font-style: italic; font-size: 0.85rem; }

.asn-item {
  display: flex; align-items: center; gap: 0.7rem; padding: 0.6rem 0.7rem;
  background: #111; border: 1px solid #1e1e1e; border-radius: 8px; font-size: 0.8rem;
  code { color: #e5e5e5; font-weight: 700; background: #1a1a1a; padding: 0.1rem 0.4rem; border-radius: 4px; }
  .asn-number { min-width: 90px; }
  .asn-label { flex: 1; color: #888; display: flex; flex-wrap: wrap; gap: 4px; }
  .depremium-btn { margin-left: auto; }
}

.settings-list { display: flex; flex-direction: column; gap: 6px; }
.setting-item {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding: 0.8rem 1rem; background: #111; border: 1px solid #1e1e1e; border-radius: 8px;
}
.setting-info { display: flex; flex-direction: column; gap: 0.1rem; }
.setting-label { font-weight: 700; font-size: 0.85rem; color: #e5e5e5; }
.setting-desc { font-size: 0.7rem; color: #555; }
.setting-value { font-size: 0.75rem; color: #e5e5e5; background: #1a1a1a; padding: 0.25rem 0.5rem; border-radius: 4px; word-break: break-all; font-family: 'SF Mono', Consolas, monospace; }
.setting-value-small { font-size: 0.65rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.toggle-btn {
  padding: 0.4rem 1.1rem; border: 1px solid rgba(239,68,68,0.3); border-radius: 20px;
  background: rgba(239,68,68,0.08); color: #ef4444; font-weight: 700; font-size: 0.75rem;
  cursor: pointer; transition: all 0.2s; min-width: 55px;
  &.active { border-color: rgba(34,197,94,0.3); background: rgba(34,197,94,0.08); color: #22c55e; }
  &:hover { opacity: 0.8; }
}

.status-badge {
  padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600;
  background: rgba(239,68,68,0.08); color: #ef4444; border: 1px solid rgba(239,68,68,0.2);
  &.ok { background: rgba(34,197,94,0.08); color: #22c55e; border-color: rgba(34,197,94,0.2); }
}

.countries-section {
  .section-title { margin: 0 0 0.3rem; font-size: 0.9rem; font-weight: 700; color: #e5e5e5; }
  .section-desc { margin: 0 0 0.7rem; font-size: 0.7rem; color: #555; }
}
.tag-list { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.country-tag {
  display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.25rem 0.5rem;
  border-radius: 5px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em;
  &.allowed { background: rgba(34,197,94,0.1); color: #22c55e; border: 1px solid rgba(34,197,94,0.2); }
  &.blocked { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
  button { background: none; border: none; color: inherit; cursor: pointer; font-size: 0.9rem; line-height: 1; opacity: 0.6; padding: 0; &:hover { opacity: 1; } }
}
.empty-inline { font-size: 0.75rem; color: #555; font-style: italic; }
</style>
