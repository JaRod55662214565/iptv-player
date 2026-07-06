<template>
  <div class="settings-overlay" v-if="isOpen" @click.self="closeSettings">
    <div class="settings-modal">
      <div class="settings-header">
        <h2 class="settings-title">{{ t('settings') }}</h2>
        <button class="settings-close" @click="closeSettings" aria-label="Close settings">
          &times;
        </button>
      </div>

      <div class="settings-content">
        <div class="settings-section">
          <label class="settings-label">{{ t('selectCountry') }}</label>
          <div class="country-grid">
            <button
              v-for="(country, code) in countries"
              :key="code"
              class="country-btn"
              :class="{ 'country-btn-active': selectedCountry === code }"
              @click="selectCountry(code)"
            >
              <img
                class="country-flag"
                :src="getFlagUrl(code)"
                :alt="country.name"
                @error="(e) => e.target.style.display = 'none'"
              />
              <span class="country-code">{{ code }}</span>
              <span class="country-name">{{ country.name }}</span>
            </button>
          </div>
        </div>

        <div class="settings-section">
          <label class="settings-label">{{ t('language') }}</label>
          <div class="language-options">
            <button
              class="lang-option"
              :class="{ 'lang-option-active': locale === 'en' }"
              @click="changeLanguage('en')"
            >
              English
            </button>
            <button
              class="lang-option"
              :class="{ 'lang-option-active': locale === 'fr' }"
              @click="changeLanguage('fr')"
            >
              Français
            </button>
          </div>
        </div>

        <div class="info-section">
          <p class="settings-info">{{ t('settingsInfo') }}</p>
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
import {
  getSelectedCountry,
  setSelectedCountry,
  getSupportedCountries,
  getFlagUrl,
} from "../utils/geolocation.js";

const { t, locale, setLocale } = useI18n();

const props = defineProps(["isOpen"]);
const emit = defineEmits(["close", "countryChanged"]);

const countries = computed(() => getSupportedCountries());
const selectedCountry = ref(getSelectedCountry());

function selectCountry(code) {
  if (setSelectedCountry(code)) {
    selectedCountry.value = code;
    emit("countryChanged", code);
  }
}

function changeLanguage(lang) {
  setLocale(lang);
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
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
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
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 300;
  
  &:hover {
    background: var(--primary-neon);
    color: var(--bg-darker);
    transform: scale(1.1) rotate(90deg);
  }
  
  &:active {
    transform: scale(0.95) rotate(90deg);
  }
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
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
    transition: left 0.5s;
  }

  &:hover {
    background: rgba(0, 217, 255, 0.15);
    border-color: var(--primary-neon);
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 217, 255, 0.15);
    
    &::before {
      left: 100%;
    }
  }

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
  display: flex;
  gap: 1rem;
}

.lang-option {
  flex: 1;
  padding: 1rem;
  background: rgba(0, 217, 255, 0.05);
  border: 2px solid var(--border-light);
  border-radius: 10px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: rgba(0, 217, 255, 0.1);
    border-color: var(--primary-neon);
    transform: translateY(-2px);
  }

  &.lang-option-active {
    background: linear-gradient(135deg, rgba(0, 217, 255, 0.3) 0%, rgba(0, 168, 204, 0.2) 100%);
    border-color: var(--primary-neon);
    color: var(--primary-neon);
    box-shadow: 0 0 15px rgba(0, 217, 255, 0.25);
  }
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
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.02em;
  box-shadow: 0 8px 20px rgba(0, 217, 255, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 30px rgba(0, 217, 255, 0.4);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 4px 12px rgba(0, 217, 255, 0.25);
  }
}
</style>
