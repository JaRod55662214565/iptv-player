<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <img class="auth-logo" src="../assets/logo.svg" alt="Web TV" />
        <h1>{{ t('appTitle') }}</h1>
        <p class="auth-subtitle">{{ t('registerSubtitle') }}</p>
      </div>

      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="field">
          <label for="pseudo">{{ t('pseudo') }}</label>
          <input
            id="pseudo"
            v-model="pseudo"
            type="text"
            autocomplete="username"
            :placeholder="t('pseudoPlaceholder')"
            required
            minlength="2"
          />
        </div>

        <div class="field">
          <label for="email">{{ t('email') }}</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            :placeholder="t('emailPlaceholder')"
            required
          />
        </div>

        <div class="field">
          <label for="password">{{ t('password') }}</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="new-password"
            :placeholder="t('passwordPlaceholder')"
            required
            minlength="6"
          />
        </div>

        <div class="field">
          <label for="confirm">{{ t('confirmPassword') }}</label>
          <input
            id="confirm"
            v-model="confirm"
            type="password"
            autocomplete="new-password"
            :placeholder="t('confirmPlaceholder')"
            required
          />
        </div>

        <p v-if="error" class="auth-error">{{ error }}</p>
        <p v-if="success" class="auth-success">{{ success }}</p>

        <button type="submit" class="auth-btn" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          <span v-else>{{ t('register') }}</span>
        </button>
      </form>

      <p class="auth-switch">
        {{ t('alreadyAccount') }}
        <a href="#/login">{{ t('loginLink') }}</a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from '../i18n/index.js'
import { register, isConfigured } from '../services/authService.js'

const { t } = useI18n()

const pseudo = ref('')
const email = ref('')
const password = ref('')
const confirm = ref('')
const error = ref('')
const success = ref('')
const loading = ref(false)

function handleRegister() {
  error.value = ''
  success.value = ''

  if (password.value !== confirm.value) {
    error.value = t('passwordsDontMatch')
    return
  }

  if (password.value.length < 6) {
    error.value = t('passwordTooShort')
    return
  }

  if (pseudo.value.length < 2) {
    error.value = t('pseudoTooShort')
    return
  }

  loading.value = true

  register(email.value, password.value, pseudo.value)
    .then((data) => {
      if (data?.user?.identities?.length === 0) {
        error.value = t('emailAlreadyUsed')
      } else {
        success.value = t('registerSuccess')
      }
    })
    .catch((e) => {
      const msg = e.message || ''
      if (msg.includes('already registered') || msg.includes('already exists')) {
        error.value = t('emailAlreadyUsed')
      } else if (msg.includes('rate limit') || msg.includes('over_email')) {
        error.value = t('rateLimit')
      } else if (msg.includes('Supabase non configuré')) {
        error.value = t('authNotConfigured')
      } else if (msg.includes('42P01') || msg.includes('relation') || msg.includes('profiles')) {
        error.value = t('profileTableMissing')
      } else {
        error.value = msg.length > 80 ? t('registerError') : msg
      }
    })
    .finally(() => {
      loading.value = false
    })
}
</script>

<style scoped>
.auth-page {
  width: 100%;
  height: 100vh;
  height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg-darker) 0%, var(--bg-dark) 100%);
}

.auth-card {
  background: rgba(10, 10, 20, 0.95);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 2.5rem 2rem;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 0 40px rgba(0, 217, 255, 0.08);
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-logo {
  width: 3rem;
  height: 3rem;
  margin-bottom: 0.8rem;
  filter: drop-shadow(0 0 6px var(--primary-neon));
}

.auth-header h1 {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 0.3rem;
  background: linear-gradient(135deg, var(--primary-neon), var(--accent-silver));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.auth-subtitle {
  color: var(--text-tertiary);
  font-size: 0.85rem;
  margin: 0;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.field input {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  background: rgba(0, 0, 0, 0.3);
  color: var(--text-primary);
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s;
}

.field input:focus {
  border-color: var(--primary-neon);
  box-shadow: 0 0 12px rgba(0, 217, 255, 0.15);
}

.field input::placeholder {
  color: var(--text-tertiary);
}

.auth-error {
  color: #ef4444;
  font-size: 0.85rem;
  margin: 0;
  text-align: center;
}

.auth-success {
  color: #22c55e;
  font-size: 0.85rem;
  margin: 0;
  text-align: center;
}

.auth-btn {
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--primary-neon), #00b4d8);
  color: var(--bg-darker);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 2.8rem;
}

.auth-btn:hover:not(:disabled) {
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.4);
  transform: translateY(-1px);
}

.auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-switch {
  text-align: center;
  margin: 1.5rem 0 0;
  font-size: 0.85rem;
  color: var(--text-tertiary);
}

.auth-switch a {
  color: var(--primary-neon);
  text-decoration: none;
  font-weight: 600;
}

.auth-switch a:hover {
  text-decoration: underline;
}

.spinner {
  width: 1.2rem;
  height: 1.2rem;
  border: 2px solid var(--bg-darker);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
