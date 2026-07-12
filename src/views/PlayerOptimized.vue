<template>
  <div class="player-container">
    <div v-if="!playerReady && isLoading" class="skeleton-loader">
      <div class="skeleton-player"></div>
      <div class="skeleton-controls"></div>
    </div>
    
    <!-- PAYWALL OVERLAY -->
    <div v-if="stripeEnabled && premiumChecked && !isPremium && !freeAccess" class="paywall-overlay">
      <div class="paywall-card">
        <div class="paywall-icon">💎</div>
        <h2 class="paywall-title">Accès Premium Requis</h2>
        <p class="paywall-description">
          Débloquez l'accès illimité à vie à toutes les chaînes de télévision et radios en qualité HD.
        </p>
        <div class="paywall-price">
          <span class="price-value">4.99 €</span>
          <span class="price-period">paiement unique à vie</span>
        </div>
        <button class="paywall-btn" :disabled="checkoutLoading" @click="handleCheckout">
          {{ checkoutLoading ? 'Chargement...' : 'Débloquer l\'accès Premium' }}
        </button>
        <button class="paywall-free-btn" @click="freeAccess = true">
          Continuer gratuitement
        </button>
        <p class="paywall-security">🛡️ Paiement sécurisé via Stripe</p>
      </div>
    </div>

    <div class="player-wrapper">
      <video
        ref="videoRef"
        class="video-js vjs-big-play-centered vjs-default-skin"
        playsinline
        crossorigin="anonymous"
      ></video>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '../i18n/index.js';
import { usePlayer } from '../composables/usePlayer';
import { ref, toRef, onMounted } from 'vue';
import { useToast } from '../stores/toast';

const { locale } = useI18n();
const props = defineProps(['value', 'track']);
const toast = useToast();

const isPremium = ref(false);
const stripeEnabled = ref(true);
const premiumChecked = ref(false);
const checkoutLoading = ref(false);
const freeAccess = ref(false);

onMounted(async () => {
  try {
    const res = await fetch('/api/check-premium');
    const data = await res.json();
    isPremium.value = data.isPremium;
    stripeEnabled.value = data.stripeEnabled !== false;
  } catch {}
  premiumChecked.value = true;
});

async function handleCheckout() {
  checkoutLoading.value = true;
  try {
    const res = await fetch('/api/stripe/checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: window.location.origin }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      toast.show(data.error || 'Erreur lors de l\'initialisation du paiement', 'error');
    }
  } catch (err) {
    toast.show('Erreur réseau. Veuillez réessayer.', 'error');
  } finally {
    checkoutLoading.value = false;
  }
}

const {
  videoRef, playerReady, isLoading,
} = usePlayer(
  toRef(props, 'value'),
  locale,
);
</script>

<style scoped lang="less">
.player-container {
  position: relative;
  width: 100%;
  height: 100dvh;
  background: #000;
  overflow: hidden;
}

.player-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  :deep(.video-js) {
    max-width: 100%;
    max-height: 100%;
  }
}

.skeleton-loader {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #1a1a1a;
  display: flex;
  flex-direction: column;
  z-index: 10;
  animation: fadeOut 0.3s ease-out 0.5s forwards;
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; pointer-events: none; }
}

.skeleton-player {
  flex: 1;
  background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-controls {
  height: 50px;
  background: #1a1a1a;
  border-top: 1px solid #333;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 10px;

  &::before, &::after {
    content: '';
    height: 8px;
    background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s infinite;
  }

  &::before { flex: 1; border-radius: 4px; }
  &::after { width: 50px; border-radius: 4px; }
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.player-wrapper {
  will-change: transform;
}

.info-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 50;
  background: rgba(0,0,0,0.6);
  border: 1px solid rgba(255,255,255,0.2);
  color: #fff;
  font-size: 1.2rem;
  padding: 0.5rem;
  border-radius: 50%;
  cursor: pointer;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  &:hover { background: rgba(0,217,255,0.3); border-color: var(--primary-neon); }
}

.visit-info-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.visit-info-modal {
  background: linear-gradient(135deg, rgba(10,10,20,0.98), rgba(20,15,35,0.95));
  border: 1px solid var(--border-color, rgba(0,217,255,0.2));
  border-radius: 16px;
  padding: 1.5rem;
  max-width: 500px;
  width: 90%;
  color: var(--text-primary);
}

.visit-info-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1rem;
  font-size: 1.1rem;
  font-weight: 700;
  .visit-flag { font-size: 1.5rem; }
  .info-close {
    margin-left: auto;
    background: none;
    border: none;
    color: var(--text-tertiary);
    font-size: 1.5rem;
    cursor: pointer;
    &:hover { color: var(--text-primary); }
  }
}

.visit-info-body {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-size: 0.9rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--border-light);
  .info-label { color: var(--text-tertiary); min-width: 4rem; }
  code, span { color: var(--text-primary); word-break: break-all; }
  code { color: var(--primary-neon); background: rgba(0,217,255,0.1); padding: 0.1rem 0.4rem; border-radius: 4px; }
}

/* Paywall styles */
.paywall-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 150;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(12px);
}

.paywall-card {
  background: linear-gradient(135deg, rgba(15, 15, 30, 0.95), rgba(30, 20, 50, 0.9));
  border: 1px solid rgba(0, 217, 255, 0.25);
  border-radius: 20px;
  padding: 2.5rem;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 217, 255, 0.15);
  color: #fff;
  animation: scaleUp 0.3s ease-out;
}

@keyframes scaleUp {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.paywall-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.paywall-title {
  margin: 0 0 0.8rem;
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #00d9ff, #c0c0c0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.paywall-description {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
  margin: 0 0 1.5rem;
}

.paywall-price {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1.8rem;
  .price-value {
    font-size: 2.5rem;
    font-weight: 800;
    color: #00d9ff;
  }
  .price-period {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    margin-top: 0.2rem;
  }
}

.paywall-btn {
  width: 100%;
  padding: 1rem;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #00d9ff, #00b4d8);
  color: #05050f;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s;
  box-shadow: 0 4px 15px rgba(0, 217, 255, 0.3);
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 217, 255, 0.5);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.paywall-free-btn {
  width: 100%;
  padding: 0.8rem;
  margin-top: 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s;
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.4);
  }
}

.paywall-security {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  margin: 1rem 0 0.8rem;
}


</style>
