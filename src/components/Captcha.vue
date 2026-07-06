<template>
  <Teleport to="body">
    <div v-if="show" class="captcha-overlay">
      <div class="captcha-modal" @click.stop>
        <div class="captcha-header">
          <div class="captcha-icon">🛡️</div>
          <h2>{{ t('captcha.title') }}</h2>
        </div>
        <p class="captcha-prompt">{{ t('captcha.prompt') }}</p>
        <div class="captcha-equation">
          <span class="equation-text">{{ a }} {{ op }} {{ b }} = ?</span>
        </div>
        <form @submit.prevent="submit" class="captcha-form">
          <input
            ref="inputRef"
            v-model="answer"
            type="number"
            :placeholder="t('captcha.placeholder')"
            class="captcha-input"
            autocomplete="off"
            :disabled="loading"
          />
          <p v-if="error" class="captcha-error">{{ t('captcha.wrong') }}</p>
          <button type="submit" class="captcha-btn" :disabled="loading || !answer">
            <span v-if="loading" class="spinner"></span>
            <span v-else>{{ t('captcha.submit') }}</span>
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useI18n } from '../i18n/index.js'

const { t } = useI18n()
const STORAGE_KEY = 'webtv_captcha_done'

const emit = defineEmits(['verified'])

const show = ref(false)
const a = ref(0)
const b = ref(0)
const op = ref('+')
const answer = ref('')
const error = ref(false)
const loading = ref(false)
const inputRef = ref(null)
let correctAnswer = 0

function generate() {
  const ops = ['+', '-', '×']
  op.value = ops[Math.floor(Math.random() * ops.length)]
  switch (op.value) {
    case '+':
      a.value = Math.floor(Math.random() * 50) + 1
      b.value = Math.floor(Math.random() * 50) + 1
      correctAnswer = a.value + b.value
      break
    case '-':
      a.value = Math.floor(Math.random() * 50) + 10
      b.value = Math.floor(Math.random() * (a.value - 1)) + 1
      correctAnswer = a.value - b.value
      break
    case '×':
      a.value = Math.floor(Math.random() * 12) + 2
      b.value = Math.floor(Math.random() * 10) + 2
      correctAnswer = a.value * b.value
      break
  }
  answer.value = ''
  error.value = false
}

function submit() {
  if (loading.value) return
  const num = parseInt(answer.value, 10)
  if (num === correctAnswer) {
    loading.value = true
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
    emit('verified')
    setTimeout(() => { show.value = false }, 300)
  } else {
    error.value = true
    fetch('/api/captcha/failed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'entrée',
        equation: `${a.value} ${op.value} ${b.value}`,
        input: answer.value,
      }),
    }).catch(() => {})
    setTimeout(generate, 600)
  }
}

onMounted(async () => {
  let done = false
  try { done = !!localStorage.getItem(STORAGE_KEY) } catch {}
  if (done) return
  await new Promise(r => setTimeout(r, 800))
  generate()
  show.value = true
  await nextTick()
  inputRef.value?.focus()
})
</script>

<style scoped>
.captcha-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 5, 15, 0.92);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.captcha-modal {
  background: linear-gradient(135deg, rgba(10, 10, 20, 0.98), rgba(20, 15, 35, 0.95));
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 2rem;
  max-width: 380px;
  width: 90%;
  text-align: center;
  box-shadow: 0 0 60px rgba(0, 217, 255, 0.1);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.captcha-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.captcha-icon {
  font-size: 2.5rem;
}

.captcha-header h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary-neon), var(--accent-silver));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.captcha-prompt {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0 0 1.2rem;
  line-height: 1.4;
}

.captcha-equation {
  margin-bottom: 1.2rem;
}

.equation-text {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-neon);
  letter-spacing: 0.05em;
}

.captcha-form {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.captcha-input {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  background: rgba(0, 0, 0, 0.3);
  color: var(--text-primary);
  font-size: 1.2rem;
  text-align: center;
  outline: none;
  transition: all 0.2s;
  -moz-appearance: textfield;
}

.captcha-input::-webkit-inner-spin-button,
.captcha-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.captcha-input:focus {
  border-color: var(--primary-neon);
  box-shadow: 0 0 15px rgba(0, 217, 255, 0.15);
}

.captcha-error {
  color: #ef4444;
  font-size: 0.85rem;
  margin: 0;
  animation: shake 0.3s ease-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.captcha-btn {
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

.captcha-btn:hover:not(:disabled) {
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.4);
  transform: translateY(-1px);
}

.captcha-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
