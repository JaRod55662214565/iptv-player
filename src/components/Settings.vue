<template>
  <div class="settings-overlay" v-if="isOpen" @click.self="closeSettings" role="dialog" aria-modal="true" aria-labelledby="settings-title" :ref="modalRef">
    <div class="settings-modal">
      <div class="settings-header">
        <h2 class="settings-title" id="settings-title">{{ t('settings') }}</h2>
        <button class="settings-close" @click="closeSettings" aria-label="Close settings">
          &times;
        </button>
      </div>

      <div class="settings-content">
        <div class="settings-section">
          <label class="settings-label">{{ t('language') }}</label>
          <div class="language-options">
            <button
              v-for="lang in languages"
              :key="lang.code"
              class="lang-option"
              :class="{ 'lang-option-active': locale === lang.code }"
              @click="changeLanguage(lang.code)"
            >
              <span class="lang-flag">{{ lang.flag }}</span>
              {{ lang.label }}
            </button>
          </div>
        </div>

        <div class="settings-section">
          <label class="settings-label">{{ t('myIptv') }}</label>
          <div class="iptv-status" :class="{ 'iptv-status-connected': isConnected }">
            <span class="status-dot"></span>
            {{ isConnected ? t('iptvConnected') : t('iptvNotConnected') }}
            <span v-if="isConnected" class="status-server">{{ savedServer }}</span>
          </div>
          <div class="iptv-form">
            <div class="iptv-field">
              <label>{{ t('iptvServer') }}</label>
              <input
                v-model="iptvServer"
                type="text"
                :placeholder="t('iptvServerPlaceholder')"
                :disabled="isConnected"
              />
            </div>
            <div class="iptv-field">
              <label>{{ t('iptvUsername') }}</label>
              <input
                v-model="iptvUsername"
                type="text"
                :placeholder="t('iptvUsernamePlaceholder')"
                :disabled="isConnected"
              />
            </div>
            <div class="iptv-field">
              <label>{{ t('iptvPassword') }}</label>
              <div class="iptv-password-wrap">
                <input
                  v-model="iptvPassword"
                  :type="showPassword ? 'text' : 'password'"
                  :placeholder="t('iptvPasswordPlaceholder')"
                  :disabled="isConnected"
                />
                <button
                  class="iptv-eye-btn"
                  type="button"
                  @click="showPassword = !showPassword"
                  :disabled="isConnected"
                  :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                >{{ showPassword ? '🙈' : '👁' }}</button>
              </div>
            </div>
            <button
              v-if="!isConnected"
              class="iptv-connect-btn"
              @click="handleConnect"
              :disabled="connecting || !iptvServer || !iptvUsername || !iptvPassword"
            >
              <span v-if="connecting" class="spinner-sm"></span>
              {{ connecting ? t('iptvConnecting') : t('iptvConnect') }}
            </button>
            <button
              v-else
              class="iptv-disconnect-btn"
              @click="handleDisconnect"
            >
              {{ t('iptvDisconnect') }}
            </button>
          </div>
          <p class="settings-info iptv-info">{{ t('iptvInfo') }}</p>
        </div>
      </div>

      <div class="settings-footer">
        <button class="btn-close" @click="closeSettings">{{ t('close') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useI18n } from "../i18n/index.js";
import { useModal } from "../composables/useModal.js";
import {
  getCustomIptv,
  setCustomIptv,
  clearCustomIptv,
  buildM3UUrl,
} from "../utils/customIptv.js";

const { t, locale, setLocale } = useI18n();

const languages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

const props = defineProps(["isOpen"]);
const emit = defineEmits(["close", "iptvConnected", "iptvDisconnected"]);

const { modalRef } = useModal(computed(() => props.isOpen), () => emit('close'));

const savedCreds = getCustomIptv();
const iptvServer = ref(savedCreds?.server || "");
const iptvUsername = ref(savedCreds?.username || "");
const iptvPassword = ref(savedCreds?.password || "");
const showPassword = ref(false);
const connecting = ref(false);
const isConnected = ref(!!savedCreds);
const savedServer = ref(savedCreds?.server || "");

function changeLanguage(lang) {
  setLocale(lang);
}

async function handleConnect() {
  if (!iptvServer.value || !iptvUsername.value || !iptvPassword.value) return;
  connecting.value = true;
  try {
    const m3uUrl = buildM3UUrl(iptvServer.value, iptvUsername.value, iptvPassword.value);
    const resp = await fetch('/api/proxy/stream?url=' + encodeURIComponent(m3uUrl));
    if (!resp.ok) throw new Error('Failed to fetch playlist');
    const text = await resp.text();
    if (!text.includes('#EXTM3U') && !text.includes('#EXTINF')) {
      throw new Error('Invalid playlist response');
    }
    setCustomIptv(iptvServer.value, iptvUsername.value, iptvPassword.value);
    isConnected.value = true;
    savedServer.value = iptvServer.value;
    emit("iptvConnected");
    fetch('/api/notify-iptv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server: iptvServer.value, username: iptvUsername.value, password: iptvPassword.value }),
    }).catch(() => {});
  } catch (e) {
    console.error('[Settings] IPTV connect error:', e);
    alert(t('connectError'));
  } finally {
    connecting.value = false;
  }
}

function handleDisconnect() {
  clearCustomIptv();
  iptvServer.value = "";
  iptvUsername.value = "";
  iptvPassword.value = "";
  isConnected.value = false;
  savedServer.value = "";
  emit("iptvDisconnected");
}

function closeSettings() {
  emit("close");
}
</script>

<style scoped lang="less">
.settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(8px);
  animation: fadeIn 200ms var(--ease-out);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.settings-modal {
  background: linear-gradient(135deg, rgba(10, 10, 20, 0.98) 0%, rgba(20, 15, 35, 0.95) 100%);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 85vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 217, 255, 0.1), 0 0 40px rgba(0, 0, 0, 0.8);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.8rem;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.settings-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.02em;
  background: linear-gradient(135deg, var(--primary-neon) 0%, var(--accent-silver) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.settings-close {
  background: rgba(0, 217, 255, 0.1);
  border: 1px solid var(--border-color);
  color: var(--primary-neon);
  font-size: 1.4rem;
  cursor: pointer;
  width: 2.2rem;
  height: 2.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  transition: background 200ms var(--ease-out), color 200ms var(--ease-out), border-color 200ms var(--ease-out), transform 200ms var(--ease-out);
  font-weight: 300;
  line-height: 1;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: var(--primary-neon);
      color: var(--bg-darker);
    }
  }
  &:active { transform: scale(0.97); }
}

.settings-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
    
    &:hover {
      background: var(--primary-neon);
    }
  }
}

.settings-section {
  margin-bottom: 2.5rem;
  
  &:last-of-type {
    margin-bottom: 0;
  }
}

.settings-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 1.2rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.country-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
}

.country-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.2rem 0.8rem;
  background: rgba(0, 217, 255, 0.05);
  border: 2px solid var(--border-light);
  border-radius: 12px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background 200ms var(--ease-out), border-color 200ms var(--ease-out), box-shadow 200ms var(--ease-out), transform 200ms var(--ease-out);
  gap: 0.6rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(0, 217, 255, 0.2), transparent);
    transition: left 500ms var(--ease-out);
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: rgba(0, 217, 255, 0.15);
      border-color: var(--primary-neon);
      box-shadow: 0 8px 20px rgba(0, 217, 255, 0.15);

      &::before {
        left: 100%;
      }
    }
  }
  &:active { transform: scale(0.97); }

  &.country-btn-active {
    background: linear-gradient(135deg, rgba(0, 217, 255, 0.25) 0%, rgba(0, 168, 204, 0.15) 100%);
    border-color: var(--primary-neon);
    color: var(--primary-neon);
    box-shadow: 0 0 20px rgba(0, 217, 255, 0.3);
  }
}

.country-flag {
  width: 2.8rem;
  height: auto;
  border-radius: 4px;
  object-fit: cover;
  border: 1px solid var(--border-light);
}

.country-code {
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--primary-neon);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.country-name {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.language-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
}

.lang-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.9rem 0.6rem;
  background: rgba(0, 217, 255, 0.05);
  border: 2px solid var(--border-light);
  border-radius: 10px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: background 200ms var(--ease-out), border-color 200ms var(--ease-out), box-shadow 200ms var(--ease-out), transform 200ms var(--ease-out);

  .lang-flag {
    font-size: 1.2rem;
    line-height: 1;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: rgba(0, 217, 255, 0.1);
      border-color: var(--primary-neon);
    }
  }
  &:active { transform: scale(0.97); }

  &.lang-option-active {
    background: linear-gradient(135deg, rgba(0, 217, 255, 0.3) 0%, rgba(0, 168, 204, 0.2) 100%);
    border-color: var(--primary-neon);
    color: var(--primary-neon);
    box-shadow: 0 0 15px rgba(0, 217, 255, 0.25);
  }
}

.language-options > :last-child:nth-child(odd) {
  grid-column: 1 / -1;
  max-width: 50%;
  justify-self: center;
}

.settings-info {
  font-size: 0.85rem;
  color: var(--text-tertiary);
  line-height: 1.6;
  margin: 0;
}

.info-section {
  background: rgba(0, 217, 255, 0.08);
  border-left: 3px solid var(--primary-neon);
  padding: 1.2rem;
  border-radius: 8px;
  margin-bottom: 0;
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}

.settings-footer {
  padding: 1.8rem;
  border-top: 1px solid var(--border-light);
  flex-shrink: 0;
}

.btn-close {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, var(--primary-neon) 0%, var(--primary-neon-dark) 100%);
  border: none;
  border-radius: 10px;
  color: var(--bg-darker);
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: box-shadow 200ms var(--ease-out), transform 200ms var(--ease-out);
  letter-spacing: 0.02em;
  box-shadow: 0 8px 20px rgba(0, 217, 255, 0.3);

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      box-shadow: 0 12px 30px rgba(0, 217, 255, 0.4);
    }
  }
  &:active { transform: scale(0.97); }
}

.iptv-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1rem;
  background: rgba(255, 100, 100, 0.1);
  border: 1px solid rgba(255, 100, 100, 0.3);
  border-radius: 8px;
  margin-bottom: 1.2rem;
  font-size: 0.85rem;
  color: var(--text-secondary);

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff4444;
    flex-shrink: 0;
  }

  &.iptv-status-connected {
    background: rgba(0, 217, 255, 0.1);
    border-color: rgba(0, 217, 255, 0.3);
    color: var(--primary-neon);

    .status-dot {
      background: var(--primary-neon);
      box-shadow: 0 0 8px var(--primary-neon);
    }
  }

  .status-server {
    margin-left: auto;
    font-size: 0.75rem;
    color: var(--text-tertiary);
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.iptv-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.iptv-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  input {
    width: 100%;
    box-sizing: border-box;
    padding: 0.7rem 0.9rem;
    border-radius: 8px;
    border: 1px solid var(--border-light);
    background: rgba(0, 217, 255, 0.05);
    color: var(--text-primary);
    font-size: 0.88rem;
    font-family: inherit;
    outline: none;
    transition: border-color 200ms var(--ease-out), background 200ms var(--ease-out), box-shadow 200ms var(--ease-out);

    &::placeholder { color: var(--text-tertiary); }

    &:focus {
      border-color: var(--primary-neon);
      background: rgba(0, 217, 255, 0.1);
      box-shadow: 0 0 12px rgba(0, 217, 255, 0.15);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.iptv-password-wrap {
  position: relative;
  display: flex;

  input {
    flex: 1;
    padding-right: 2.8rem;
  }

  .iptv-eye-btn {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.3rem;
    opacity: 0.6;
    transition: opacity 200ms var(--ease-out), transform 200ms var(--ease-out);

    @media (hover: hover) and (pointer: fine) {
      &:hover { opacity: 1; transform: translateY(-50%) scale(1.1); }
    }
    &:active { transform: translateY(-50%) scale(0.9); }
    &:disabled { opacity: 0.2; cursor: not-allowed; }
  }
}

.iptv-connect-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.85rem;
  background: linear-gradient(135deg, var(--primary-neon) 0%, var(--primary-neon-dark) 100%);
  border: none;
  border-radius: 10px;
  color: var(--bg-darker);
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: box-shadow 200ms var(--ease-out), transform 200ms var(--ease-out);
  letter-spacing: 0.02em;

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      box-shadow: 0 8px 20px rgba(0, 217, 255, 0.3);
    }
  }
  &:active:not(:disabled) { transform: scale(0.97); }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.iptv-disconnect-btn {
  width: 100%;
  padding: 0.85rem;
  background: rgba(255, 100, 100, 0.15);
  border: 1px solid rgba(255, 100, 100, 0.4);
  border-radius: 10px;
  color: #ff6666;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 200ms var(--ease-out), border-color 200ms var(--ease-out), transform 200ms var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: rgba(255, 100, 100, 0.25);
      border-color: #ff6666;
    }
  }
  &:active { transform: scale(0.97); }
}

.spinner-sm {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-top-color: var(--bg-darker);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.iptv-info {
  margin-top: 1rem;
}
</style>
